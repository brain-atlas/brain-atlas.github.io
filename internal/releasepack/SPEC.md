# Standalone Release Packaging

## Purpose

`internal/releasepack` turns six CGO-free Brain Atlas executables into a small,
validated release bundle. It normalizes archive metadata, includes required
license/citation files, records exact source/toolchain provenance, and emits
SHA-256 checksums so CI publication jobs consume one complete artifact rather
than reconstructing release state.

This is build-time tooling, not part of the standalone server's runtime
boundary. It must not change the embedded Vite site, local HTTP behavior,
anatomy, lessons, or scientific metadata.

## Core Mechanism

`scripts/build-standalone-release.mjs` stages the production standalone Vite
site once, then invokes `cmd/package-standalone`. The command cross-builds
`cmd/brain-atlas` for the fixed target matrix with `CGO_ENABLED=0`, `-trimpath`,
and stripped linker flags. `releasepack` writes normalized tar/gzip or ZIP
archives, hashes them, writes deterministic provenance, writes sorted checksums,
and validates the exact output inventory.

**Key files:**

- `releasepack.go` — target contract, deterministic archive writers, checksums,
  provenance, and whole-bundle validation.
- `releasepack_test.go` — archive/parser-based determinism and failure tests.
- `../../cmd/package-standalone/main.go` — repository-confined output cleanup,
  toolchain discovery, six-target Go builds, and package orchestration.
- `../../scripts/build-standalone-release.mjs` — stage-once Node/Go handoff.
- `../../.github/workflows/standalone-binaries.yml` — eventual CI consumer.

## Public Interface

| Export/API | Used by | Contract |
|---|---|---|
| `Targets()` | package CLI, tests, validation | Return a copy of the complete ordered six-target matrix. |
| `Target.BinaryName()` / `ArchiveExtension()` | package CLI and archive writer | Select `.exe`/`.zip` only for Windows; Unix targets use `brain-atlas`/`.tar.gz`. |
| `ValidateLabel(label)` | CLI and publisher | Permit one filesystem/asset-safe component up to 64 characters; reject paths, spaces, and empty labels. |
| `WriteArchive(request)` | package CLI | Atomically write one normalized archive with the executable and all required notices, then return its size and SHA-256. |
| `WriteMetadata(output, provenance, artifacts)` | package CLI | Require one artifact per target, write sorted deterministic provenance, then checksum all archives plus provenance. |
| `ValidateBundle(output, label)` | build and publication jobs | Require exactly six archives, provenance, and checksums; reject unexpected files, malformed inventories, or byte/metadata mismatches. |
| `cmd/package-standalone` | npm/CI | Build or `-verify-only` validate one repository-confined release directory. |

## Invariants

| ID | Invariant | Enforcement | Why it matters |
|---|---|---|---|
| INV-1 | The target set is exactly Linux, macOS, and Windows for amd64 and arm64. | fixed `Targets()` plus tests | README, workflow, checksums, and releases must describe one stable support matrix. |
| INV-2 | Every executable build forces `CGO_ENABLED=0` and explicit GOOS/GOARCH while retaining the surrounding tool environment. | CLI build-spec helper plus tests/cross-build | Released binaries must not acquire hidden C/shared-library dependencies. |
| INV-3 | Identical binary/notice/label/timestamp inputs produce byte-identical archives. | normalized tar/gzip/ZIP metadata plus repeat-build tests | Checksums and retry comparisons need meaningful reproducibility. |
| INV-4 | Every archive contains only the target executable, `LICENSE`, `DATA_LICENSES.md`, `THIRD_PARTY_NOTICES.md`, and `CITATION.cff`; executable mode is 0755 and documents are 0644. | parser-based archive tests | Users receive required notices without creating runtime adjacent-file dependencies. |
| INV-5 | Asset labels are one safe path component; provenance binds the exact 40-hex commit, source timestamp, dirty state, toolchain versions, target, size, and digest. Publication accepts only clean-source bundles. | validation before writes, workflow clean gate, publisher, and bundle validation | Release names must not escape output directories or claim reviewed-commit identity for uncommitted bytes. |
| INV-6 | A valid bundle has exactly six archives, one provenance file, and one checksum file; checksums cover every file except the checksum file itself. | `ValidateBundle` | Publication must not upload stale, partial, extra, or tampered output. |
| INV-7 | Generated output cleanup is confined to child directories of the repository. | package CLI path validation | A bad flag must not recursively delete the repository root or an external path. |
| INV-8 | Packaging uses only the Go standard library and does not mutate the embedded site or runtime server. | module graph, package boundaries, review | Distribution tooling must preserve the one-binary runtime and scientific invariants. |

## Failure Modes

| ID | Symptom | Cause | Fix |
|---|---|---|---|
| FAIL-1 | Go compilation reports `all:dist: no matching files`. | Clean checkout lacks the tracked embed placeholder. | Restore `internal/site/dist/.gitkeep` and its `.gitignore` exceptions; do not commit generated staging. |
| FAIL-2 | Packager says `index.html` is missing. | Standalone production staging was not run. | Use `npm run build:release` or run `npm run build:standalone:site` first. |
| FAIL-3 | Archive build rejects a notice. | Required publication/license file is absent or not regular. | Restore the reviewed root notice file; do not silently omit it. |
| FAIL-4 | Repeat archives have different hashes. | Timestamp, order, ownership, mode, gzip header, ZIP metadata, binary, or toolchain input changed. | Compare provenance and normalized writer fields before accepting output. |
| FAIL-5 | Bundle validation reports unexpected/missing files. | Stale output survived, a target failed, or a file was added outside the contract. | Rebuild into the cleaned release directory; never publish a partial directory. |
| FAIL-6 | Provenance/checksum validation fails or publication rejects a dirty source tree. | File bytes/metadata changed after packaging, or the bundle includes uncommitted source. | Treat it as non-publishable; rebuild from a clean reviewed commit. |
| FAIL-7 | A requested output directory is rejected. | It resolves to the repository root or outside it. | Use the default `release/` or another repository child; do not weaken confinement. |

## Decision Framework

| Situation | Action | Spec item |
|---|---|---|
| Add another OS/architecture | Update target contract, archive tests, workflow, README, release docs, and native evidence together. | INV-1 |
| Add a file to release archives | Verify redistribution/user need, update exact-inventory tests and notices documentation, then change the writer. | INV-4, INV-6 |
| Add signing/notarization | Create a separate credential/security design; do not insert secrets into this read-only packager. | INV-8 |
| Change compression/archive tooling | Require byte-determinism and parser-based content tests; do not rely on runner-specific shell utilities. | INV-3 |
| Permit arbitrary output paths | Stop; keep destructive cleanup repository-confined. | INV-7 |
| Need run-specific provenance | Put it in the external provenance file; do not make otherwise identical platform archives vary by workflow run. | INV-3, INV-5 |

## Testing

| Spec item | Verification | Notes |
|---|---|---|
| INV-1, INV-2, INV-7 | `go test ./cmd/package-standalone` | Tests target build arguments/environment and output confinement. |
| INV-3, INV-4 | `go test ./internal/releasepack -run 'Archive|Deterministic'` | Reads tar/gzip and ZIP with standard parsers and compares bytes. |
| INV-5, INV-6 | `go test ./internal/releasepack -run 'Metadata|Bundle|Label|Provenance'` | Covers missing notices, tampering, duplicate targets, exact inventory, and sorted checksums. |
| INV-1–INV-8 | `npm run build:release -- --label ci-local && npm run verify:release -- --label ci-local` | Real stage, six cross-builds, packaging, and whole-bundle validation. |
| INV-3 | Repeat the release build at the same commit and compare `SHA256SUMS`. | Operational reproducibility evidence. |
| INV-8 | `CGO_ENABLED=0 go test ./...` and module/license review | Confirms no package/runtime dependency was added. |

## Dependencies

| Dependency | Type | Spec path |
|---|---|---|
| Standalone production staging | internal | `../standalone/SPEC.md`, `../site/embed.go`, `../../vite.config.js` |
| User executable | internal | `../../cmd/brain-atlas`, `../standalone/SPEC.md` |
| Publication/license files | internal | `../../LICENSE`, `../../DATA_LICENSES.md`, `../../THIRD_PARTY_NOTICES.md`, `../../CITATION.cff` |
| Go archive/hash/JSON packages | external standard library | Go 1.23+ module contract; no third-party module |
