package standalone

import (
	"bytes"
	"context"
	"errors"
	"io"
	"net"
	"net/http"
	"net/http/cookiejar"
	"net/url"
	"strings"
	"testing"
	"time"
)

func TestValidateLoopbackAddress(t *testing.T) {
	for _, address := range []string{"127.0.0.1:0", "[::1]:5180"} {
		if err := validateLoopbackAddress(address); err != nil {
			t.Errorf("validateLoopbackAddress(%q): %v", address, err)
		}
	}
	for _, address := range []string{"0.0.0.0:5180", "[::]:5180", "192.168.1.2:5180", "localhost:0", "example.com:5180", ":5180", "invalid"} {
		if err := validateLoopbackAddress(address); err == nil {
			t.Errorf("validateLoopbackAddress(%q) succeeded, want error", address)
		}
	}
}

func TestRunPrintsLoopbackURLAndInvokesBrowser(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	var output bytes.Buffer
	var openedURL string

	err := Run(ctx, RunConfig{
		Address:       "127.0.0.1:0",
		Site:          testSite(),
		Output:        &output,
		ShutdownGrace: 10 * time.Millisecond,
		OpenBrowser: func(rawURL string) error {
			openedURL = rawURL
			cancel()
			return nil
		},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}

	parsed, err := url.Parse(openedURL)
	if err != nil {
		t.Fatalf("parse opened URL: %v", err)
	}
	host, _, err := net.SplitHostPort(parsed.Host)
	if err != nil {
		t.Fatalf("opened URL host: %v", err)
	}
	if !net.ParseIP(host).IsLoopback() {
		t.Fatalf("opened non-loopback URL %q", openedURL)
	}
	if !strings.Contains(output.String(), "Brain Atlas is running at "+openedURL) {
		t.Fatalf("output %q does not report opened URL %q", output.String(), openedURL)
	}
}

func TestRunTreatsBrowserLaunchFailureAsNonFatal(t *testing.T) {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	var output bytes.Buffer

	err := Run(ctx, RunConfig{
		Address:       "127.0.0.1:0",
		Site:          testSite(),
		Output:        &output,
		ShutdownGrace: 10 * time.Millisecond,
		OpenBrowser: func(string) error {
			cancel()
			return errors.New("browser unavailable")
		},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if !strings.Contains(output.String(), "browser unavailable") {
		t.Fatalf("output %q does not report browser failure", output.String())
	}
}

func TestRunContextCancellationClosesActiveLifecycleStream(t *testing.T) {
	ctx, cancelRun := context.WithCancel(context.Background())
	defer cancelRun()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	client := &http.Client{Jar: jar}
	var lifecycleResponse *http.Response

	err = Run(ctx, RunConfig{
		Address:         "127.0.0.1:0",
		Site:            testSite(),
		Output:          io.Discard,
		ShutdownGrace:   time.Second,
		ShutdownTimeout: 100 * time.Millisecond,
		StayOpen:        true,
		OpenBrowser: func(rootURL string) error {
			rootResponse, err := client.Get(rootURL)
			if err != nil {
				return err
			}
			rootResponse.Body.Close()

			request, err := http.NewRequest(http.MethodGet, strings.TrimSuffix(rootURL, "/")+lifecyclePath, nil)
			if err != nil {
				return err
			}
			lifecycleResponse, err = client.Do(request)
			if err != nil {
				return err
			}
			cancelRun()
			return nil
		},
	})
	if lifecycleResponse != nil {
		lifecycleResponse.Body.Close()
	}
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
}

func TestRunShutsDownAfterLastAuthenticatedPageDisconnects(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	jar, err := cookiejar.New(nil)
	if err != nil {
		t.Fatal(err)
	}
	client := &http.Client{Jar: jar}

	err = Run(ctx, RunConfig{
		Address:       "127.0.0.1:0",
		Site:          testSite(),
		Output:        io.Discard,
		ShutdownGrace: 10 * time.Millisecond,
		OpenBrowser: func(rootURL string) error {
			rootResponse, err := client.Get(rootURL)
			if err != nil {
				return err
			}
			rootResponse.Body.Close()

			requestCtx, stopRequest := context.WithCancel(context.Background())
			defer stopRequest()
			request, err := http.NewRequestWithContext(requestCtx, http.MethodGet, rootURL[0:len(rootURL)-1]+lifecyclePath, nil)
			if err != nil {
				return err
			}
			response, err := client.Do(request)
			if err != nil {
				return err
			}
			stopRequest()
			response.Body.Close()
			return nil
		},
	})
	if err != nil {
		t.Fatalf("Run: %v", err)
	}
	if ctx.Err() != nil {
		t.Fatal("Run waited for context timeout instead of lifecycle shutdown")
	}
}

func TestNewSessionTokenUsesIndependentRandomValues(t *testing.T) {
	first, err := newSessionToken()
	if err != nil {
		t.Fatal(err)
	}
	second, err := newSessionToken()
	if err != nil {
		t.Fatal(err)
	}
	if len(first) < 32 || len(second) < 32 {
		t.Fatalf("session token lengths %d and %d are too short", len(first), len(second))
	}
	if first == second {
		t.Fatal("independent session tokens are equal")
	}
}
