package main

import (
	"io"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"github.com/brain-atlas/brain-atlas.github.io/internal/releasepack"
)

func TestParseOptionsRequiresSafeLabel(t *testing.T) {
	if _, err := parseOptions(nil, io.Discard); err == nil || !strings.Contains(err.Error(), "label") {
		t.Fatalf("missing label error = %v", err)
	}
	if _, err := parseOptions([]string{"-label", "../nightly"}, io.Discard); err == nil {
		t.Fatal("parseOptions accepted unsafe label")
	}
	options, err := parseOptions([]string{"-label", "ci-local"}, io.Discard)
	if err != nil {
		t.Fatalf("parseOptions: %v", err)
	}
	if options.label != "ci-local" || options.output != "release" || options.verifyOnly {
		t.Fatalf("unexpected options: %+v", options)
	}
}

func TestParseOptionsSupportsExplicitProvenanceAndVerification(t *testing.T) {
	commit := strings.Repeat("d", 40)
	options, err := parseOptions([]string{
		"-label", "nightly-d9b11e8",
		"-commit", commit,
		"-source-date-epoch", "1700000000",
		"-output", "out/release",
		"-verify-only",
	}, io.Discard)
	if err != nil {
		t.Fatalf("parseOptions: %v", err)
	}
	if options.commit != commit || options.sourceDateEpoch != 1_700_000_000 || options.output != "out/release" || !options.verifyOnly {
		t.Fatalf("unexpected options: %+v", options)
	}
}

func TestSourceDirtyRecognizesTrackedAndUntrackedChanges(t *testing.T) {
	if sourceDirty("") {
		t.Fatal("empty git status marked dirty")
	}
	for _, status := range []string{" M README.md\n", "?? new-file\n"} {
		if !sourceDirty(status) {
			t.Errorf("git status %q marked clean", status)
		}
	}
}

func TestGoBuildSpecForcesTargetAndCGOFreeBuild(t *testing.T) {
	target := releasepack.Target{GOOS: "windows", GOARCH: "arm64"}
	arguments, environment := goBuildSpec(target, "/tmp/brain-atlas.exe", []string{
		"PATH=/tools", "CGO_ENABLED=1", "GOOS=darwin", "GOARCH=amd64",
	})
	wantArguments := []string{
		"build", "-trimpath", "-ldflags=-s -w", "-o", "/tmp/brain-atlas.exe", "./cmd/brain-atlas",
	}
	if !reflect.DeepEqual(arguments, wantArguments) {
		t.Fatalf("arguments = %v, want %v", arguments, wantArguments)
	}
	wantEnvironment := map[string]string{
		"PATH": "/tools", "CGO_ENABLED": "0", "GOOS": "windows", "GOARCH": "arm64",
	}
	if !reflect.DeepEqual(environmentMap(environment), wantEnvironment) {
		t.Fatalf("environment = %v, want %v", environmentMap(environment), wantEnvironment)
	}
}

func TestSafeOutputDirectoryRejectsSymlinkedParent(t *testing.T) {
	root := t.TempDir()
	outside := t.TempDir()
	if err := os.Symlink(outside, filepath.Join(root, "out")); err != nil {
		t.Fatal(err)
	}
	if _, err := safeOutputDirectory(root, "out/release"); err == nil || !strings.Contains(err.Error(), "symbolic link") {
		t.Fatalf("symlinked output error = %v", err)
	}
}

func TestSafeOutputDirectoryStaysInsideRepository(t *testing.T) {
	root := t.TempDir()
	got, err := safeOutputDirectory(root, "out/release")
	if err != nil {
		t.Fatalf("safeOutputDirectory: %v", err)
	}
	want := filepath.Join(root, "out", "release")
	if got != want {
		t.Fatalf("output = %q, want %q", got, want)
	}
	for _, candidate := range []string{".", "..", "../outside", filepath.Join(root, "..", "outside")} {
		if _, err := safeOutputDirectory(root, candidate); err == nil {
			t.Errorf("safeOutputDirectory accepted %q", candidate)
		}
	}
}

func environmentMap(environment []string) map[string]string {
	result := make(map[string]string)
	for _, value := range environment {
		parts := strings.SplitN(value, "=", 2)
		result[parts[0]] = parts[1]
	}
	return result
}
