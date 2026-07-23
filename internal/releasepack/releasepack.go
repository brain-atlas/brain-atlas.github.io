package releasepack

import (
	"archive/tar"
	"archive/zip"
	"bufio"
	"compress/gzip"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"time"
)

const projectName = "brain-atlas"

var (
	safeLabelPattern = regexp.MustCompile(`^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$`)
	commitPattern    = regexp.MustCompile(`^[0-9a-f]{40}$`)
	requiredNotices  = []string{"CITATION.cff", "DATA_LICENSES.md", "LICENSE", "THIRD_PARTY_NOTICES.md"}
	supportedTargets = []Target{
		{GOOS: "linux", GOARCH: "amd64"},
		{GOOS: "linux", GOARCH: "arm64"},
		{GOOS: "darwin", GOARCH: "amd64"},
		{GOOS: "darwin", GOARCH: "arm64"},
		{GOOS: "windows", GOARCH: "amd64"},
		{GOOS: "windows", GOARCH: "arm64"},
	}
)

type Target struct {
	GOOS   string `json:"goos"`
	GOARCH string `json:"goarch"`
}

func Targets() []Target {
	return append([]Target(nil), supportedTargets...)
}

func (target Target) BinaryName() string {
	if target.GOOS == "windows" {
		return projectName + ".exe"
	}
	return projectName
}

func (target Target) ArchiveExtension() string {
	if target.GOOS == "windows" {
		return ".zip"
	}
	return ".tar.gz"
}

func (target Target) archiveName(label string) string {
	return fmt.Sprintf("%s-%s-%s-%s%s", projectName, label, target.GOOS, target.GOARCH, target.ArchiveExtension())
}

func (target Target) supported() bool {
	for _, supported := range supportedTargets {
		if target == supported {
			return true
		}
	}
	return false
}

func RequiredNoticeNames() []string {
	return append([]string(nil), requiredNotices...)
}

func ValidateLabel(label string) error {
	if !safeLabelPattern.MatchString(label) {
		return fmt.Errorf("unsafe release label %q", label)
	}
	return nil
}

type ArchiveRequest struct {
	Target      Target
	Label       string
	BinaryPath  string
	NoticePaths map[string]string
	ModTime     time.Time
	OutputDir   string
}

type Artifact struct {
	Name   string `json:"name"`
	Path   string `json:"-"`
	Target Target `json:"target"`
	SHA256 string `json:"sha256"`
	Size   int64  `json:"size"`
}

type archiveFile struct {
	name string
	path string
	mode os.FileMode
	size int64
}

func WriteArchive(request ArchiveRequest) (Artifact, error) {
	if !request.Target.supported() {
		return Artifact{}, fmt.Errorf("unsupported release target %s/%s", request.Target.GOOS, request.Target.GOARCH)
	}
	if err := ValidateLabel(request.Label); err != nil {
		return Artifact{}, err
	}
	if request.ModTime.IsZero() {
		return Artifact{}, errors.New("archive modification time is required")
	}
	if request.OutputDir == "" {
		return Artifact{}, errors.New("archive output directory is required")
	}

	files, err := archiveFiles(request)
	if err != nil {
		return Artifact{}, err
	}
	if err := os.MkdirAll(request.OutputDir, 0o755); err != nil {
		return Artifact{}, fmt.Errorf("create archive output: %w", err)
	}
	name := request.Target.archiveName(request.Label)
	path := filepath.Join(request.OutputDir, name)
	if request.Target.GOOS == "windows" {
		err = writeZIP(path, files, request.ModTime.UTC())
	} else {
		err = writeTarGz(path, files, request.ModTime.UTC())
	}
	if err != nil {
		return Artifact{}, err
	}
	digest, size, err := fileDigest(path)
	if err != nil {
		return Artifact{}, err
	}
	return Artifact{Name: name, Path: path, Target: request.Target, SHA256: digest, Size: size}, nil
}

func archiveFiles(request ArchiveRequest) ([]archiveFile, error) {
	binaryInfo, err := regularFile(request.BinaryPath)
	if err != nil {
		return nil, fmt.Errorf("open release binary: %w", err)
	}
	files := []archiveFile{{
		name: request.Target.BinaryName(),
		path: request.BinaryPath,
		mode: 0o755,
		size: binaryInfo.Size(),
	}}
	for _, name := range requiredNotices {
		path, ok := request.NoticePaths[name]
		if !ok || path == "" {
			return nil, fmt.Errorf("required release notice %s is missing", name)
		}
		info, err := regularFile(path)
		if err != nil {
			return nil, fmt.Errorf("open release notice %s: %w", name, err)
		}
		files = append(files, archiveFile{name: name, path: path, mode: 0o644, size: info.Size()})
	}
	sort.Slice(files, func(i, j int) bool { return files[i].name < files[j].name })
	return files, nil
}

func regularFile(path string) (os.FileInfo, error) {
	info, err := os.Lstat(path)
	if err != nil {
		return nil, err
	}
	if info.Mode()&os.ModeSymlink != 0 {
		return nil, fmt.Errorf("%s is a symbolic link, not a release input", path)
	}
	if !info.Mode().IsRegular() {
		return nil, fmt.Errorf("%s is not a regular file", path)
	}
	return info, nil
}

func writeTarGz(path string, files []archiveFile, modTime time.Time) (returnErr error) {
	return atomicOutput(path, func(output io.Writer) error {
		gzipWriter, err := gzip.NewWriterLevel(output, gzip.BestCompression)
		if err != nil {
			return err
		}
		gzipWriter.Header.ModTime = modTime
		gzipWriter.Header.OS = 255
		tarWriter := tar.NewWriter(gzipWriter)
		for _, file := range files {
			header := &tar.Header{
				Name:     file.name,
				Mode:     int64(file.mode.Perm()),
				Size:     file.size,
				ModTime:  modTime,
				Typeflag: tar.TypeReg,
				Format:   tar.FormatUSTAR,
			}
			if err := tarWriter.WriteHeader(header); err != nil {
				return closeWithError(err, tarWriter, gzipWriter)
			}
			if err := copyFile(tarWriter, file.path); err != nil {
				return closeWithError(err, tarWriter, gzipWriter)
			}
		}
		if err := tarWriter.Close(); err != nil {
			return closeWithError(err, gzipWriter)
		}
		return gzipWriter.Close()
	})
}

func writeZIP(path string, files []archiveFile, modTime time.Time) error {
	return atomicOutput(path, func(output io.Writer) error {
		writer := zip.NewWriter(output)
		for _, file := range files {
			header := &zip.FileHeader{Name: file.name, Method: zip.Deflate}
			header.SetMode(file.mode)
			header.SetModTime(modTime)
			entry, err := writer.CreateHeader(header)
			if err != nil {
				return closeWithError(err, writer)
			}
			if err := copyFile(entry, file.path); err != nil {
				return closeWithError(err, writer)
			}
		}
		return writer.Close()
	})
}

func copyFile(destination io.Writer, path string) error {
	source, err := os.Open(path)
	if err != nil {
		return err
	}
	defer source.Close()
	_, err = io.Copy(destination, source)
	return err
}

type closer interface {
	Close() error
}

func closeWithError(original error, closers ...closer) error {
	for _, item := range closers {
		_ = item.Close()
	}
	return original
}

func atomicOutput(path string, write func(io.Writer) error) (returnErr error) {
	directory := filepath.Dir(path)
	if err := os.MkdirAll(directory, 0o755); err != nil {
		return err
	}
	temporary, err := os.CreateTemp(directory, ".release-tmp-*")
	if err != nil {
		return err
	}
	temporaryPath := temporary.Name()
	defer func() {
		_ = temporary.Close()
		if returnErr != nil {
			_ = os.Remove(temporaryPath)
		}
	}()
	if err := write(temporary); err != nil {
		return err
	}
	if err := temporary.Sync(); err != nil {
		return err
	}
	if err := temporary.Close(); err != nil {
		return err
	}
	if err := os.Chmod(temporaryPath, 0o644); err != nil {
		return err
	}
	return os.Rename(temporaryPath, path)
}

func fileDigest(path string) (string, int64, error) {
	file, err := os.Open(path)
	if err != nil {
		return "", 0, err
	}
	defer file.Close()
	hash := sha256.New()
	size, err := io.Copy(hash, file)
	if err != nil {
		return "", 0, err
	}
	return hex.EncodeToString(hash.Sum(nil)), size, nil
}

type Provenance struct {
	SchemaVersion   int              `json:"schemaVersion"`
	Project         string           `json:"project"`
	Label           string           `json:"label"`
	Commit          string           `json:"commit"`
	SourceDateEpoch int64            `json:"sourceDateEpoch"`
	SourceDirty     bool             `json:"sourceDirty"`
	GoVersion       string           `json:"goVersion"`
	NodeVersion     string           `json:"nodeVersion"`
	NPMVersion      string           `json:"npmVersion"`
	Artifacts       []ArtifactRecord `json:"artifacts"`
}

type ArtifactRecord struct {
	Name   string `json:"name"`
	GOOS   string `json:"goos"`
	GOARCH string `json:"goarch"`
	SHA256 string `json:"sha256"`
	Size   int64  `json:"size"`
}

type MetadataFiles struct {
	ProvenancePath string
	ChecksumsPath  string
}

func WriteMetadata(outputDir string, provenance Provenance, artifacts []Artifact) (MetadataFiles, error) {
	if err := validateProvenance(provenance, len(artifacts)); err != nil {
		return MetadataFiles{}, err
	}
	if len(artifacts) != len(supportedTargets) {
		return MetadataFiles{}, fmt.Errorf("artifact count %d, want %d", len(artifacts), len(supportedTargets))
	}

	records := make([]ArtifactRecord, 0, len(artifacts))
	seenTargets := make(map[Target]bool)
	for _, artifact := range artifacts {
		if !artifact.Target.supported() || seenTargets[artifact.Target] {
			return MetadataFiles{}, fmt.Errorf("invalid or duplicate artifact target %s/%s", artifact.Target.GOOS, artifact.Target.GOARCH)
		}
		seenTargets[artifact.Target] = true
		if artifact.Name != artifact.Target.archiveName(provenance.Label) {
			return MetadataFiles{}, fmt.Errorf("artifact name %q does not match target and label", artifact.Name)
		}
		digest, size, err := fileDigest(artifact.Path)
		if err != nil {
			return MetadataFiles{}, fmt.Errorf("digest artifact %s: %w", artifact.Name, err)
		}
		if digest != artifact.SHA256 || size != artifact.Size {
			return MetadataFiles{}, fmt.Errorf("artifact metadata does not match %s", artifact.Name)
		}
		records = append(records, ArtifactRecord{
			Name: artifact.Name, GOOS: artifact.Target.GOOS, GOARCH: artifact.Target.GOARCH,
			SHA256: artifact.SHA256, Size: artifact.Size,
		})
	}
	sort.Slice(records, func(i, j int) bool { return records[i].Name < records[j].Name })
	provenance.Artifacts = records

	provenanceName := fmt.Sprintf("%s-%s-PROVENANCE.json", projectName, provenance.Label)
	provenancePath := filepath.Join(outputDir, provenanceName)
	body, err := json.MarshalIndent(provenance, "", "  ")
	if err != nil {
		return MetadataFiles{}, err
	}
	body = append(body, '\n')
	if err := atomicOutput(provenancePath, func(output io.Writer) error {
		_, err := output.Write(body)
		return err
	}); err != nil {
		return MetadataFiles{}, fmt.Errorf("write provenance: %w", err)
	}

	checksumsName := fmt.Sprintf("%s-%s-SHA256SUMS", projectName, provenance.Label)
	checksumsPath := filepath.Join(outputDir, checksumsName)
	paths := make([]string, 0, len(artifacts)+1)
	for _, artifact := range artifacts {
		paths = append(paths, artifact.Path)
	}
	paths = append(paths, provenancePath)
	if err := writeChecksums(checksumsPath, paths); err != nil {
		return MetadataFiles{}, err
	}
	return MetadataFiles{ProvenancePath: provenancePath, ChecksumsPath: checksumsPath}, nil
}

func validateProvenance(provenance Provenance, artifactCount int) error {
	if provenance.SchemaVersion != 1 {
		return fmt.Errorf("unsupported provenance schema version %d", provenance.SchemaVersion)
	}
	if provenance.Project != projectName {
		return fmt.Errorf("provenance project %q, want %q", provenance.Project, projectName)
	}
	if err := ValidateLabel(provenance.Label); err != nil {
		return err
	}
	if !commitPattern.MatchString(provenance.Commit) {
		return fmt.Errorf("invalid provenance commit %q", provenance.Commit)
	}
	if provenance.SourceDateEpoch <= 0 {
		return errors.New("provenance source date epoch must be positive")
	}
	if strings.TrimSpace(provenance.GoVersion) == "" || strings.TrimSpace(provenance.NodeVersion) == "" || strings.TrimSpace(provenance.NPMVersion) == "" {
		return errors.New("provenance toolchain versions are required")
	}
	if artifactCount > 0 && artifactCount != len(supportedTargets) {
		return fmt.Errorf("provenance artifact count %d, want %d", artifactCount, len(supportedTargets))
	}
	return nil
}

func writeChecksums(path string, paths []string) error {
	lines := make([]string, 0, len(paths))
	for _, item := range paths {
		digest, _, err := fileDigest(item)
		if err != nil {
			return err
		}
		lines = append(lines, fmt.Sprintf("%s  %s", digest, filepath.Base(item)))
	}
	sort.Strings(lines)
	return atomicOutput(path, func(output io.Writer) error {
		_, err := io.WriteString(output, strings.Join(lines, "\n")+"\n")
		return err
	})
}

func ValidateBundle(outputDir, label string) error {
	if err := ValidateLabel(label); err != nil {
		return err
	}
	entries, err := os.ReadDir(outputDir)
	if err != nil {
		return fmt.Errorf("read release bundle: %w", err)
	}
	expected := make(map[string]bool)
	for _, target := range supportedTargets {
		expected[target.archiveName(label)] = true
	}
	provenanceName := fmt.Sprintf("%s-%s-PROVENANCE.json", projectName, label)
	checksumsName := fmt.Sprintf("%s-%s-SHA256SUMS", projectName, label)
	expected[provenanceName] = true
	expected[checksumsName] = true
	if len(entries) != len(expected) {
		return fmt.Errorf("release bundle file count %d, want %d", len(entries), len(expected))
	}
	for _, entry := range entries {
		if entry.IsDir() || !expected[entry.Name()] {
			return fmt.Errorf("unexpected release bundle entry %s", entry.Name())
		}
	}

	checksums, err := readChecksums(filepath.Join(outputDir, checksumsName))
	if err != nil {
		return err
	}
	if len(checksums) != len(expected)-1 {
		return fmt.Errorf("checksum entry count %d, want %d", len(checksums), len(expected)-1)
	}
	for name := range expected {
		if name == checksumsName {
			continue
		}
		want, ok := checksums[name]
		if !ok {
			return fmt.Errorf("checksum for %s is missing", name)
		}
		got, _, err := fileDigest(filepath.Join(outputDir, name))
		if err != nil {
			return err
		}
		if got != want {
			return fmt.Errorf("checksum mismatch for %s", name)
		}
	}

	body, err := os.ReadFile(filepath.Join(outputDir, provenanceName))
	if err != nil {
		return err
	}
	var provenance Provenance
	if err := json.Unmarshal(body, &provenance); err != nil {
		return fmt.Errorf("decode provenance: %w", err)
	}
	if err := validateProvenance(provenance, len(provenance.Artifacts)); err != nil {
		return err
	}
	if provenance.Label != label {
		return fmt.Errorf("provenance label %q, want %q", provenance.Label, label)
	}
	seenTargets := make(map[Target]bool)
	for _, artifact := range provenance.Artifacts {
		target := Target{GOOS: artifact.GOOS, GOARCH: artifact.GOARCH}
		if !target.supported() {
			return fmt.Errorf("unsupported provenance target %s/%s", artifact.GOOS, artifact.GOARCH)
		}
		if seenTargets[target] {
			return fmt.Errorf("duplicate provenance target %s/%s", artifact.GOOS, artifact.GOARCH)
		}
		seenTargets[target] = true
		if artifact.Name != target.archiveName(label) {
			return fmt.Errorf("provenance artifact name %q does not match target", artifact.Name)
		}
		if checksums[artifact.Name] != artifact.SHA256 {
			return fmt.Errorf("provenance digest mismatch for %s", artifact.Name)
		}
		info, err := os.Stat(filepath.Join(outputDir, artifact.Name))
		if err != nil {
			return err
		}
		if info.Size() != artifact.Size {
			return fmt.Errorf("provenance size mismatch for %s", artifact.Name)
		}
	}
	return nil
}

func readChecksums(path string) (map[string]string, error) {
	file, err := os.Open(path)
	if err != nil {
		return nil, err
	}
	defer file.Close()
	checksums := make(map[string]string)
	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := scanner.Text()
		parts := strings.SplitN(line, "  ", 2)
		if len(parts) != 2 || len(parts[0]) != sha256.Size*2 || strings.ContainsAny(parts[1], `/\\`) {
			return nil, fmt.Errorf("invalid checksum line %q", line)
		}
		if _, err := hex.DecodeString(parts[0]); err != nil {
			return nil, fmt.Errorf("invalid checksum digest for %s", parts[1])
		}
		if _, duplicate := checksums[parts[1]]; duplicate {
			return nil, fmt.Errorf("duplicate checksum for %s", parts[1])
		}
		checksums[parts[1]] = parts[0]
	}
	if err := scanner.Err(); err != nil {
		return nil, err
	}
	return checksums, nil
}
