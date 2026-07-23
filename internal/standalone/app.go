package standalone

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"net"
	"net/http"
	"net/url"
	"time"
)

const defaultShutdownTimeout = 5 * time.Second

type RunConfig struct {
	Address         string
	Site            fs.FS
	Output          io.Writer
	ShutdownGrace   time.Duration
	ShutdownTimeout time.Duration
	StayOpen        bool
	OpenBrowser     func(string) error
}

func Run(ctx context.Context, config RunConfig) error {
	if err := validateLoopbackAddress(config.Address); err != nil {
		return err
	}
	if config.Output == nil {
		config.Output = io.Discard
	}
	if config.ShutdownTimeout <= 0 {
		config.ShutdownTimeout = defaultShutdownTimeout
	}

	sessionToken, err := newSessionToken()
	if err != nil {
		return fmt.Errorf("create session token: %w", err)
	}
	lifecycle := NewLifecycle(config.ShutdownGrace)
	handler, err := NewHandler(HandlerConfig{
		Site:         config.Site,
		Lifecycle:    lifecycle,
		SessionToken: sessionToken,
	})
	if err != nil {
		return err
	}

	listener, err := net.Listen("tcp", config.Address)
	if err != nil {
		return fmt.Errorf("listen on %s: %w", config.Address, err)
	}

	requestContext, cancelRequests := context.WithCancel(context.Background())
	defer cancelRequests()
	server := &http.Server{
		Handler:           handler,
		ReadHeaderTimeout: 5 * time.Second,
		IdleTimeout:       2 * time.Minute,
		BaseContext: func(net.Listener) context.Context {
			return requestContext
		},
	}
	serveErrors := make(chan error, 1)
	go func() {
		serveErrors <- server.Serve(listener)
	}()

	rootURL := (&url.URL{Scheme: "http", Host: listener.Addr().String(), Path: "/"}).String()
	_, _ = fmt.Fprintf(config.Output, "Brain Atlas is running at %s\n", rootURL)
	if config.OpenBrowser != nil {
		if err := config.OpenBrowser(rootURL); err != nil {
			_, _ = fmt.Fprintf(config.Output, "Could not open the default browser: %v\nOpen %s manually.\n", err, rootURL)
		}
	}

	lifecycleDone := lifecycle.Done()
	if config.StayOpen {
		lifecycleDone = nil
	}

	var runErr error
	select {
	case <-ctx.Done():
	case <-lifecycleDone:
	case err := <-serveErrors:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			runErr = fmt.Errorf("serve Brain Atlas: %w", err)
		}
	}

	cancelRequests()
	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), config.ShutdownTimeout)
	defer cancelShutdown()
	if err := server.Shutdown(shutdownCtx); err != nil && runErr == nil {
		runErr = fmt.Errorf("shut down Brain Atlas: %w", err)
	}
	return runErr
}

func validateLoopbackAddress(address string) error {
	host, port, err := net.SplitHostPort(address)
	if err != nil || host == "" || port == "" {
		return fmt.Errorf("address %q must include a loopback host and port", address)
	}
	ip := net.ParseIP(host)
	if ip == nil || !ip.IsLoopback() {
		return fmt.Errorf("address %q is not loopback-only", address)
	}
	return nil
}

func newSessionToken() (string, error) {
	value := make([]byte, 32)
	if _, err := rand.Read(value); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(value), nil
}
