package main

import (
	"io"
	"testing"
	"time"
)

func TestParseOptionsDefaultsToQuickLocalLaunch(t *testing.T) {
	options, err := parseOptions(nil, io.Discard)
	if err != nil {
		t.Fatalf("parseOptions: %v", err)
	}
	if options.address != "127.0.0.1:0" {
		t.Fatalf("address %q, want dynamic IPv4 loopback", options.address)
	}
	if !options.openBrowser {
		t.Fatal("default options do not open browser")
	}
	if options.stayOpen {
		t.Fatal("default options stay open")
	}
	if options.shutdownGrace != 10*time.Second {
		t.Fatalf("shutdown grace %s, want 10s", options.shutdownGrace)
	}
}

func TestParseOptionsSupportsLifecycleOverrides(t *testing.T) {
	options, err := parseOptions([]string{
		"-addr", "[::1]:5180",
		"-no-open",
		"-stay-open",
		"-shutdown-grace", "30s",
	}, io.Discard)
	if err != nil {
		t.Fatalf("parseOptions: %v", err)
	}
	if options.address != "[::1]:5180" || options.openBrowser || !options.stayOpen || options.shutdownGrace != 30*time.Second {
		t.Fatalf("unexpected options: %+v", options)
	}
}

func TestParseOptionsRejectsNegativeGrace(t *testing.T) {
	if _, err := parseOptions([]string{"-shutdown-grace", "-1s"}, io.Discard); err == nil {
		t.Fatal("parseOptions accepted negative shutdown grace")
	}
}
