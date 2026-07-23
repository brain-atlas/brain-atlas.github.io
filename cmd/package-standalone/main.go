package main

import (
	"errors"
	"flag"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/brain-atlas/brain-atlas.github.io/internal/releasepack"
)

type options struct {
	label           string
	commit          string
	sourceDateEpoch int64
	output          string
	verifyOnly      bool
}

func parseOptions(arguments []string, errorOutput io.Writer) (options, error) {
	var parsed options
	flags := flag.NewFlagSet("package-standalone", flag.ContinueOnError)
	flags.SetOutput(errorOutput)
	flags.StringVar(&parsed.label, "label", "", "safe label included in every release asset name")
	flags.StringVar(&parsed.commit, "commit", "", "40-character source commit (defaults to HEAD)")
	flags.Int64Var(&parsed.sourceDateEpoch, "source-date-epoch", 0, "normalized archive timestamp (defaults to source commit time)")
	flags.StringVar(&parsed.output, "output", "release", "repository-relative release output directory")
	flags.BoolVar(&parsed.verifyOnly, "verify-only", false, "validate an existing release bundle without building")
	if err := flags.Parse(arguments); err != nil {
		return options{}, err
	}
	if flags.NArg() != 0 {
		return options{}, fmt.Errorf("unexpected positional arguments: %s", strings.Join(flags.Args(), " "))
	}
	if err := releasepack.ValidateLabel(parsed.label); err != nil {
		return options{}, err
	}
	if strings.TrimSpace(parsed.output) == "" {
		return options{}, errors.New("release output directory is required")
	}
	if parsed.sourceDateEpoch < 0 {
		return options{}, errors.New("source date epoch cannot be negative")
	}
	return parsed, nil
}

func main() {
	parsed, err := parseOptions(os.Args[1:], os.Stderr)
	if err == nil {
		err = run(parsed)
	}
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(1)
	}
}

func run(parsed options) error {
	root, err := os.Getwd()
	if err != nil {
		return fmt.Errorf("resolve repository root: %w", err)
	}
	outputDir, err := safeOutputDirectory(root, parsed.output)
	if err != nil {
		return err
	}
	if parsed.verifyOnly {
		if err := releasepack.ValidateBundle(outputDir, parsed.label); err != nil {
			return err
		}
		fmt.Printf("Verified standalone release bundle: %s\n", outputDir)
		return nil
	}
	if _, err := os.Stat(filepath.Join(root, "internal", "site", "dist", "index.html")); err != nil {
		return errors.New("standalone site staging is missing index.html; run npm run build:standalone:site")
	}

	commit := parsed.commit
	if commit == "" {
		commit, err = commandOutput(root, "git", "rev-parse", "HEAD")
		if err != nil {
			return err
		}
	}
	epoch := parsed.sourceDateEpoch
	if epoch == 0 {
		value, commandErr := commandOutput(root, "git", "show", "-s", "--format=%ct", commit)
		if commandErr != nil {
			return commandErr
		}
		epoch, err = strconv.ParseInt(value, 10, 64)
		if err != nil || epoch <= 0 {
			return fmt.Errorf("invalid source commit timestamp %q", value)
		}
	}
	goVersion, err := commandOutput(root, "go", "env", "GOVERSION")
	if err != nil {
		return err
	}
	nodeVersion, err := commandOutput(root, "node", "--version")
	if err != nil {
		return err
	}
	npmVersion, err := commandOutput(root, "npm", "--version")
	if err != nil {
		return err
	}
	status, err := commandOutput(root, "git", "status", "--porcelain", "--untracked-files=normal")
	if err != nil {
		return err
	}

	buildDir, err := safeOutputDirectory(root, filepath.Join("build", "release-binaries"))
	if err != nil {
		return err
	}
	for _, path := range []string{outputDir, buildDir} {
		if err := os.RemoveAll(path); err != nil {
			return fmt.Errorf("clean %s: %w", path, err)
		}
		if err := os.MkdirAll(path, 0o755); err != nil {
			return fmt.Errorf("create %s: %w", path, err)
		}
	}

	notices := make(map[string]string)
	for _, name := range releasepack.RequiredNoticeNames() {
		notices[name] = filepath.Join(root, name)
	}
	modTime := time.Unix(epoch, 0).UTC()
	artifacts := make([]releasepack.Artifact, 0, len(releasepack.Targets()))
	for _, target := range releasepack.Targets() {
		targetDir := filepath.Join(buildDir, target.GOOS+"-"+target.GOARCH)
		if err := os.MkdirAll(targetDir, 0o755); err != nil {
			return err
		}
		binaryPath := filepath.Join(targetDir, target.BinaryName())
		arguments, environment := goBuildSpec(target, binaryPath, os.Environ())
		command := exec.Command("go", arguments...)
		command.Dir = root
		command.Env = environment
		command.Stdout = os.Stdout
		command.Stderr = os.Stderr
		if err := command.Run(); err != nil {
			return fmt.Errorf("build %s/%s: %w", target.GOOS, target.GOARCH, err)
		}
		artifact, err := releasepack.WriteArchive(releasepack.ArchiveRequest{
			Target: target, Label: parsed.label, BinaryPath: binaryPath, NoticePaths: notices,
			ModTime: modTime, OutputDir: outputDir,
		})
		if err != nil {
			return fmt.Errorf("package %s/%s: %w", target.GOOS, target.GOARCH, err)
		}
		artifacts = append(artifacts, artifact)
	}

	_, err = releasepack.WriteMetadata(outputDir, releasepack.Provenance{
		SchemaVersion: 1, Project: "brain-atlas", Label: parsed.label, Commit: commit,
		SourceDateEpoch: epoch, SourceDirty: sourceDirty(status),
		GoVersion: goVersion, NodeVersion: nodeVersion, NPMVersion: npmVersion,
	}, artifacts)
	if err != nil {
		return err
	}
	if err := releasepack.ValidateBundle(outputDir, parsed.label); err != nil {
		return err
	}
	fmt.Printf("Standalone release bundle: %s\n", outputDir)
	return nil
}

func sourceDirty(status string) bool {
	return strings.TrimSpace(status) != ""
}

func goBuildSpec(target releasepack.Target, output string, baseEnvironment []string) ([]string, []string) {
	arguments := []string{
		"build", "-trimpath", "-ldflags=-s -w", "-o", output, "./cmd/brain-atlas",
	}
	environment := make(map[string]string)
	for _, value := range baseEnvironment {
		parts := strings.SplitN(value, "=", 2)
		if len(parts) == 2 {
			environment[parts[0]] = parts[1]
		}
	}
	environment["CGO_ENABLED"] = "0"
	environment["GOOS"] = target.GOOS
	environment["GOARCH"] = target.GOARCH
	keys := make([]string, 0, len(environment))
	for key := range environment {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	values := make([]string, 0, len(keys))
	for _, key := range keys {
		values = append(values, key+"="+environment[key])
	}
	return arguments, values
}

func safeOutputDirectory(root, candidate string) (string, error) {
	rootAbsolute, err := filepath.Abs(root)
	if err != nil {
		return "", err
	}
	candidateAbsolute := candidate
	if !filepath.IsAbs(candidateAbsolute) {
		candidateAbsolute = filepath.Join(rootAbsolute, candidateAbsolute)
	}
	candidateAbsolute, err = filepath.Abs(candidateAbsolute)
	if err != nil {
		return "", err
	}
	relative, err := filepath.Rel(rootAbsolute, candidateAbsolute)
	if err != nil {
		return "", err
	}
	if relative == "." || relative == ".." || strings.HasPrefix(relative, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("release output %q must be a child of the repository", candidate)
	}
	current := rootAbsolute
	for _, component := range strings.Split(relative, string(filepath.Separator)) {
		current = filepath.Join(current, component)
		info, statErr := os.Lstat(current)
		if statErr != nil {
			if os.IsNotExist(statErr) {
				continue
			}
			return "", statErr
		}
		if info.Mode()&os.ModeSymlink != 0 {
			return "", fmt.Errorf("release output %q contains symbolic link %s", candidate, current)
		}
	}
	return candidateAbsolute, nil
}

func commandOutput(directory, name string, arguments ...string) (string, error) {
	command := exec.Command(name, arguments...)
	command.Dir = directory
	body, err := command.Output()
	if err != nil {
		return "", fmt.Errorf("run %s: %w", name, err)
	}
	return strings.TrimSpace(string(body)), nil
}
