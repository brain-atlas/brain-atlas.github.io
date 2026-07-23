package releasepack

import (
	"archive/tar"
	"archive/zip"
	"bytes"
	"compress/gzip"
	"encoding/json"
	"io"
	"os"
	"path/filepath"
	"reflect"
	"sort"
	"strings"
	"testing"
	"time"
)

func TestTargetsCoverSupportedMatrix(t *testing.T) {
	got := Targets()
	want := []Target{
		{GOOS: "linux", GOARCH: "amd64"},
		{GOOS: "linux", GOARCH: "arm64"},
		{GOOS: "darwin", GOARCH: "amd64"},
		{GOOS: "darwin", GOARCH: "arm64"},
		{GOOS: "windows", GOARCH: "amd64"},
		{GOOS: "windows", GOARCH: "arm64"},
	}
	if !reflect.DeepEqual(got, want) {
		t.Fatalf("Targets() = %#v, want %#v", got, want)
	}
	if got[0].BinaryName() != "brain-atlas" || got[4].BinaryName() != "brain-atlas.exe" {
		t.Fatalf("unexpected binary names: %q %q", got[0].BinaryName(), got[4].BinaryName())
	}
	if got[0].ArchiveExtension() != ".tar.gz" || got[4].ArchiveExtension() != ".zip" {
		t.Fatalf("unexpected archive extensions: %q %q", got[0].ArchiveExtension(), got[4].ArchiveExtension())
	}
}

func TestValidateLabelRejectsUnsafeAssetNames(t *testing.T) {
	for _, label := range []string{"ci-local", "nightly-d9b11e8", "v1.2.3", "v2.0.0-rc.1"} {
		if err := ValidateLabel(label); err != nil {
			t.Errorf("ValidateLabel(%q): %v", label, err)
		}
	}
	for _, label := range []string{"", "../nightly", "nightly/current", "has space", strings.Repeat("a", 65)} {
		if err := ValidateLabel(label); err == nil {
			t.Errorf("ValidateLabel(%q) accepted unsafe label", label)
		}
	}
}

func TestWriteArchiveIsDeterministicAndContainsRequiredFiles(t *testing.T) {
	fixture := archiveFixture(t)
	for _, target := range []Target{{GOOS: "linux", GOARCH: "amd64"}, {GOOS: "windows", GOARCH: "amd64"}} {
		t.Run(target.GOOS, func(t *testing.T) {
			firstDir := t.TempDir()
			secondDir := t.TempDir()
			request := ArchiveRequest{
				Target:      target,
				Label:       "ci-local",
				BinaryPath:  fixture.binary,
				NoticePaths: fixture.notices,
				ModTime:     time.Unix(1_700_000_000, 0).UTC(),
				OutputDir:   firstDir,
			}
			first, err := WriteArchive(request)
			if err != nil {
				t.Fatalf("WriteArchive(first): %v", err)
			}
			request.OutputDir = secondDir
			second, err := WriteArchive(request)
			if err != nil {
				t.Fatalf("WriteArchive(second): %v", err)
			}
			firstBytes, err := os.ReadFile(first.Path)
			if err != nil {
				t.Fatal(err)
			}
			secondBytes, err := os.ReadFile(second.Path)
			if err != nil {
				t.Fatal(err)
			}
			if !bytes.Equal(firstBytes, secondBytes) || first.SHA256 != second.SHA256 {
				t.Fatal("same archive inputs did not produce identical bytes and digest")
			}

			entries := readArchiveEntries(t, first.Path)
			wantNames := append([]string{target.BinaryName()}, RequiredNoticeNames()...)
			sort.Strings(wantNames)
			gotNames := make([]string, 0, len(entries))
			for name := range entries {
				gotNames = append(gotNames, name)
			}
			sort.Strings(gotNames)
			if !reflect.DeepEqual(gotNames, wantNames) {
				t.Fatalf("archive entries = %v, want %v", gotNames, wantNames)
			}
			if entries[target.BinaryName()].mode != 0o755 {
				t.Fatalf("binary mode = %#o, want 0755", entries[target.BinaryName()].mode)
			}
			if entries["LICENSE"].mode != 0o644 {
				t.Fatalf("LICENSE mode = %#o, want 0644", entries["LICENSE"].mode)
			}
		})
	}
}

func TestValidateBundleRejectsDuplicateProvenanceTargets(t *testing.T) {
	fixture := archiveFixture(t)
	output := t.TempDir()
	artifacts := make([]Artifact, 0, len(Targets()))
	for _, target := range Targets() {
		artifact, err := WriteArchive(ArchiveRequest{
			Target: target, Label: "ci-local", BinaryPath: fixture.binary,
			NoticePaths: fixture.notices, ModTime: time.Unix(1_700_000_000, 0).UTC(), OutputDir: output,
		})
		if err != nil {
			t.Fatal(err)
		}
		artifacts = append(artifacts, artifact)
	}
	metadata, err := WriteMetadata(output, Provenance{
		SchemaVersion: 1, Project: "brain-atlas", Label: "ci-local", Commit: strings.Repeat("d", 40),
		SourceDateEpoch: 1_700_000_000, GoVersion: "go1.26.4", NodeVersion: "v22.0.0", NPMVersion: "10.0.0",
	}, artifacts)
	if err != nil {
		t.Fatal(err)
	}
	body, err := os.ReadFile(metadata.ProvenancePath)
	if err != nil {
		t.Fatal(err)
	}
	var provenance Provenance
	if err := json.Unmarshal(body, &provenance); err != nil {
		t.Fatal(err)
	}
	provenance.Artifacts[1] = provenance.Artifacts[0]
	body, err = json.MarshalIndent(provenance, "", "  ")
	if err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(metadata.ProvenancePath, append(body, '\n'), 0o644); err != nil {
		t.Fatal(err)
	}
	paths := make([]string, 0, len(artifacts)+1)
	for _, artifact := range artifacts {
		paths = append(paths, artifact.Path)
	}
	paths = append(paths, metadata.ProvenancePath)
	if err := writeChecksums(metadata.ChecksumsPath, paths); err != nil {
		t.Fatal(err)
	}
	if err := ValidateBundle(output, "ci-local"); err == nil || !strings.Contains(err.Error(), "duplicate") {
		t.Fatalf("duplicate provenance validation error = %v", err)
	}
}

func TestWriteArchiveRejectsSymlinkedInput(t *testing.T) {
	fixture := archiveFixture(t)
	link := filepath.Join(t.TempDir(), "binary-link")
	if err := os.Symlink(fixture.binary, link); err != nil {
		t.Fatal(err)
	}
	_, err := WriteArchive(ArchiveRequest{
		Target: Target{GOOS: "linux", GOARCH: "amd64"}, Label: "ci-local", BinaryPath: link,
		NoticePaths: fixture.notices, ModTime: time.Unix(1_700_000_000, 0).UTC(), OutputDir: t.TempDir(),
	})
	if err == nil || !strings.Contains(err.Error(), "symbolic link") {
		t.Fatalf("symlinked input error = %v", err)
	}
}

func TestWriteArchiveRejectsMissingNotice(t *testing.T) {
	fixture := archiveFixture(t)
	delete(fixture.notices, "CITATION.cff")
	_, err := WriteArchive(ArchiveRequest{
		Target:      Target{GOOS: "linux", GOARCH: "amd64"},
		Label:       "ci-local",
		BinaryPath:  fixture.binary,
		NoticePaths: fixture.notices,
		ModTime:     time.Unix(1_700_000_000, 0).UTC(),
		OutputDir:   t.TempDir(),
	})
	if err == nil || !strings.Contains(err.Error(), "CITATION.cff") {
		t.Fatalf("missing notice error = %v", err)
	}
}

func TestMetadataAndBundleValidation(t *testing.T) {
	fixture := archiveFixture(t)
	output := t.TempDir()
	artifacts := make([]Artifact, 0, len(Targets()))
	for _, target := range Targets() {
		artifact, err := WriteArchive(ArchiveRequest{
			Target:      target,
			Label:       "nightly-d9b11e8",
			BinaryPath:  fixture.binary,
			NoticePaths: fixture.notices,
			ModTime:     time.Unix(1_700_000_000, 0).UTC(),
			OutputDir:   output,
		})
		if err != nil {
			t.Fatalf("WriteArchive(%s/%s): %v", target.GOOS, target.GOARCH, err)
		}
		artifacts = append(artifacts, artifact)
	}
	metadata, err := WriteMetadata(output, Provenance{
		SchemaVersion:   1,
		Project:         "brain-atlas",
		Label:           "nightly-d9b11e8",
		Commit:          strings.Repeat("d", 40),
		SourceDateEpoch: 1_700_000_000,
		GoVersion:       "go1.26.4",
		NodeVersion:     "v22.0.0",
		NPMVersion:      "10.0.0",
	}, artifacts)
	if err != nil {
		t.Fatalf("WriteMetadata: %v", err)
	}
	if err := ValidateBundle(output, "nightly-d9b11e8"); err != nil {
		t.Fatalf("ValidateBundle: %v", err)
	}

	checksumBody, err := os.ReadFile(metadata.ChecksumsPath)
	if err != nil {
		t.Fatal(err)
	}
	lines := strings.Split(strings.TrimSpace(string(checksumBody)), "\n")
	if !sort.StringsAreSorted(lines) {
		t.Fatalf("checksum lines are not sorted: %v", lines)
	}
	if len(lines) != 7 {
		t.Fatalf("checksum line count = %d, want six archives plus provenance", len(lines))
	}

	body, err := os.ReadFile(metadata.ProvenancePath)
	if err != nil {
		t.Fatal(err)
	}
	var decoded Provenance
	if err := json.Unmarshal(body, &decoded); err != nil {
		t.Fatalf("decode provenance: %v", err)
	}
	if decoded.Commit != strings.Repeat("d", 40) || len(decoded.Artifacts) != 6 {
		t.Fatalf("unexpected provenance: %+v", decoded)
	}

	if err := os.WriteFile(artifacts[0].Path, []byte("tampered"), 0o644); err != nil {
		t.Fatal(err)
	}
	if err := ValidateBundle(output, "nightly-d9b11e8"); err == nil || !strings.Contains(err.Error(), "checksum") {
		t.Fatalf("tampered bundle validation error = %v", err)
	}
}

type fixturePaths struct {
	binary  string
	notices map[string]string
}

func archiveFixture(t *testing.T) fixturePaths {
	t.Helper()
	dir := t.TempDir()
	binary := filepath.Join(dir, "binary")
	if err := os.WriteFile(binary, []byte("executable"), 0o755); err != nil {
		t.Fatal(err)
	}
	notices := make(map[string]string)
	for _, name := range []string{"LICENSE", "DATA_LICENSES.md", "THIRD_PARTY_NOTICES.md", "CITATION.cff"} {
		path := filepath.Join(dir, name)
		if err := os.WriteFile(path, []byte(name+"\n"), 0o644); err != nil {
			t.Fatal(err)
		}
		notices[name] = path
	}
	return fixturePaths{binary: binary, notices: notices}
}

type archiveEntry struct {
	body []byte
	mode os.FileMode
}

func readArchiveEntries(t *testing.T, path string) map[string]archiveEntry {
	t.Helper()
	entries := make(map[string]archiveEntry)
	if strings.HasSuffix(path, ".zip") {
		reader, err := zip.OpenReader(path)
		if err != nil {
			t.Fatal(err)
		}
		defer reader.Close()
		for _, file := range reader.File {
			handle, err := file.Open()
			if err != nil {
				t.Fatal(err)
			}
			body, err := io.ReadAll(handle)
			handle.Close()
			if err != nil {
				t.Fatal(err)
			}
			entries[file.Name] = archiveEntry{body: body, mode: file.Mode().Perm()}
		}
		return entries
	}

	file, err := os.Open(path)
	if err != nil {
		t.Fatal(err)
	}
	defer file.Close()
	gzipReader, err := gzip.NewReader(file)
	if err != nil {
		t.Fatal(err)
	}
	defer gzipReader.Close()
	tarReader := tar.NewReader(gzipReader)
	for {
		header, err := tarReader.Next()
		if err == io.EOF {
			break
		}
		if err != nil {
			t.Fatal(err)
		}
		body, err := io.ReadAll(tarReader)
		if err != nil {
			t.Fatal(err)
		}
		entries[header.Name] = archiveEntry{body: body, mode: os.FileMode(header.Mode).Perm()}
	}
	return entries
}
