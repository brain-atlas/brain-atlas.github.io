package main

import (
	"context"
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/brain-atlas/brain-atlas.github.io/internal/site"
	"github.com/brain-atlas/brain-atlas.github.io/internal/standalone"
)

type options struct {
	address       string
	openBrowser   bool
	stayOpen      bool
	shutdownGrace time.Duration
}

func parseOptions(args []string, stderr io.Writer) (options, error) {
	flags := flag.NewFlagSet("brain-atlas", flag.ContinueOnError)
	flags.SetOutput(stderr)

	var parsed options
	var noOpen bool
	flags.StringVar(&parsed.address, "addr", "127.0.0.1:0", "loopback address and port to listen on")
	flags.BoolVar(&noOpen, "no-open", false, "print the URL without opening the default browser")
	flags.BoolVar(&parsed.stayOpen, "stay-open", false, "run until interrupted instead of stopping after the last Atlas tab closes")
	flags.DurationVar(&parsed.shutdownGrace, "shutdown-grace", 10*time.Second, "time to wait for a tab to reconnect before stopping")

	if err := flags.Parse(args); err != nil {
		return options{}, err
	}
	if flags.NArg() != 0 {
		return options{}, fmt.Errorf("unexpected arguments: %v", flags.Args())
	}
	if parsed.shutdownGrace < 0 {
		return options{}, errors.New("shutdown grace cannot be negative")
	}
	parsed.openBrowser = !noOpen
	return parsed, nil
}

func run(args []string, stdout, stderr io.Writer) int {
	parsed, err := parseOptions(args, stderr)
	if err != nil {
		return 2
	}

	embeddedSite, err := site.FS()
	if err != nil {
		_, _ = fmt.Fprintln(stderr, err)
		return 1
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	var openBrowser func(string) error
	if parsed.openBrowser {
		openBrowser = standalone.OpenBrowser
	}
	err = standalone.Run(ctx, standalone.RunConfig{
		Address:       parsed.address,
		Site:          embeddedSite,
		Output:        stdout,
		ShutdownGrace: parsed.shutdownGrace,
		StayOpen:      parsed.stayOpen,
		OpenBrowser:   openBrowser,
	})
	if err != nil {
		_, _ = fmt.Fprintln(stderr, err)
		return 1
	}
	return 0
}

func main() {
	os.Exit(run(os.Args[1:], os.Stdout, os.Stderr))
}
