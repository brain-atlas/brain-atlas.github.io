# Standalone Binary Release CI Design and Implementation Plan

**Issue:** `brain-atlas-is9` — Automate standalone binary CI and tagged releases
**Decision:** `brain-atlas-3mw` — one mutable nightly prerelease plus immutable `v*` releases
**Design approval:** `brain-atlas-gwa` — approved recommended single-builder design
**Status:** Implemented; PR integration and GitHub-run verification pending
**Date:** 2026-07-23
**Branch:** `feature/is9-go-release-ci`

**Goal:** Make the hosted GitHub Pages viewer and downloadable standalone executables the two primary user paths, while continuously verifying six platform binaries and safely publishing one rolling nightly channel plus deliberate immutable stable releases.

**Architecture:** A read-only Ubuntu build job stages the production standalone Vite artifact once, runs the locked Node dependency audit plus publication/Go/security checks, and uses standard-library Go tooling to cross-build and deterministically package Linux, macOS, and Windows binaries for amd64 and arm64. Every successful build uploads a short-lived Actions artifact. Separate write-scoped jobs consume that exact artifact: `main` updates one rolling `nightly` prerelease through commit-scoped assets and digest verification, while a pushed `v*` tag creates a stable release once and treats any later mismatch as an error.

## Acceptance Criteria

- [x] A clean checkout supports the documented Go verification path without relying on ignored output from an earlier standalone build.
- [ ] Pull requests, `main` pushes, `v*` tag pushes, and manual dispatches run locked Node install/audit and publication checks, standalone production staging, CGO-free Go tests, race/vet checks, six cross-builds, archive validation, and a Linux moved-binary smoke test. The complete Node suite remains a required local Nix gate under `brain-atlas-ek3`. *(Workflow and local equivalents verified; successful GitHub event pending.)*
- [ ] Successful builds upload one clearly named Actions artifact containing six deterministic archives, sorted SHA-256 checksums, and exact commit/toolchain provenance, retained for 14 days. *(Workflow contract verified; GitHub upload pending integration.)*
- [x] Linux and macOS archives use `.tar.gz`; Windows archives use `.zip`; each contains one runnable executable plus `LICENSE`, `DATA_LICENSES.md`, `THIRD_PARTY_NOTICES.md`, and `CITATION.cff` without requiring adjacent runtime files.
- [x] Build jobs have only `contents: read`; publication jobs alone receive `contents: write`; every reusable Action is GitHub-owned and pinned to a full commit SHA; checkout credentials are not persisted.
- [ ] A successful current-`main` run refreshes exactly one non-latest prerelease named/tagged `nightly`; assets identify their source commit, remote SHA-256 digests are checked, stale runs cannot promote, and cleanup deletes only superseded nightly assets after the new set is usable. *(State machine/dry runs verified; real nightly pending approved integration.)*
- [x] Nightly publication never uses `gh release upload --clobber`; an interrupted upload cannot remove the prior working asset set, and any simultaneously visible sets remain commit-labeled.
- [ ] A pushed `v*` tag must resolve to the workflow commit before publishing. First publication uses GitHub CLI's draft/upload/publish flow; a retry succeeds without mutation only if the tag, release metadata, asset names, sizes, and remote digests match. *(State machine/dry runs verified; no remote test tag was authorized.)*
- [x] Stable release logic never moves/deletes a version tag, never deletes/overwrites a published stable asset, and fails on any existing-release mismatch.
- [x] The ordinary Pages build and deployment remain unchanged and free of standalone lifecycle/debug code.
- [x] README begins with two user choices—open `https://brain-atlas.github.io/` or download a standalone binary—then distinguishes stable/nightly channels, platforms, launch behavior, and unsigned warnings. Source setup/build/test guidance moves under a distinct Development section.
- [x] macOS launch guidance states that the binary is unsigned, requires checksum verification first, prefers Apple's one-time **Privacy & Security → Open Anyway** override, and offers narrowly scoped `xattr -d com.apple.quarantine /path/to/brain-atlas` only as an advanced fallback. It never recommends disabling Gatekeeper, `sudo`, or recursive quarantine removal.
- [x] Architecture, security, release-process, contributor, and subsystem documentation match landed behavior; scientific/data/lesson/CITATION impact is either updated or recorded as none.
- [x] No remote tag, release, push, or repository-setting mutation occurs during implementation without a separate explicit approval.

## Verification Commands

```bash
npm ci --ignore-scripts
npm audit --audit-level=high
npm test
npm run build:publish
npm run build:standalone:site
CGO_ENABLED=0 go test ./...
go test -race ./internal/standalone
go vet ./...
npm run build:release -- --label ci-local
npm run verify:release
node scripts/publish-standalone-release.mjs --channel nightly --dry-run --assets release
node scripts/publish-standalone-release.mjs --channel stable --tag v0.0.0-test --dry-run --assets release
git diff --check
```

Operational verification additionally extracts and runs the Linux amd64 archive from an empty directory, requests `/`, `/data/entities.json`, and `/models/brain_mni.glb`, checks hidden-path 404 and unsupported-method 405 behavior, and confirms the embedded production bundle lacks `window.__view`/`window.__lesson`.

---

## Context and Verified Constraints

- Current workflow: `.github/workflows/deploy-pages.yml` builds only the ordinary static Pages artifact. It uses GitHub-owned full-SHA-pinned Actions, top-level `permissions: {}`, read-only build permissions, and isolated Pages deployment permissions.
- Repository Actions policy permits GitHub-owned Actions only, requires no third-party Action, and defaults workflow tokens to read-only.
- There are currently no repository tags or GitHub Releases.
- `scripts/build-standalone.mjs` couples production staging and one host/selected-target Go build. Release CI needs a supported stage-only entry so the identical embedded tree is reused across all targets.
- `go:embed all:dist` currently fails at compile time in a fresh worktree because `.gitignore` does not successfully unignore a tracked `internal/site/dist/.gitkeep`. Build-first verification passes, but direct documented Go testing does not. Preserve `internal/site.FS()`'s runtime rejection of staging that lacks `index.html`.
- Runtime invariants remain owned by `internal/standalone/SPEC.md`; release tooling must not weaken loopback binding, lifecycle authentication, no-cache static serving, ordinary/standalone bundle separation, or CGO-free distribution.
- GitHub Releases are tag-backed. GitHub's release asset API reports `digest: sha256:…`, allowing server-side verification after upload.
- `gh release create <tag> <assets…>` creates a draft, uploads assets, then publishes. `gh release upload --clobber` deletes the old asset before replacement and is therefore forbidden for nightly safety.
- Repository-wide immutable-release enforcement is not selected because it would also prevent the intentionally mutable published nightly channel. Stable immutability is enforced by workflow policy and mismatch failure.

Primary references verified 2026-07-23:

- GitHub Actions workflow syntax and permissions: <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions>
- Workflow artifact storage/retention: <https://docs.github.com/en/actions/tutorials/store-and-share-data>
- Release asset API and SHA-256 digest field: <https://docs.github.com/en/rest/releases/assets#get-a-release-asset>
- Tag-backed release model: <https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases>
- Apple's unknown-developer warning and one-time override: <https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/mac>
- Local GitHub CLI help: `gh release create --help`, `gh release upload --help`, `gh release edit --help`

## Options Considered

### Option A — Native OS/architecture matrix

Build on Linux, macOS, and Windows runners per target.

- **Pros:** Each OS can execute its native artifact; packaging uses native tools.
- **Cons:** Rebuilds the same 25 MiB site repeatedly, costs more, produces platform-dependent archive metadata, and adds no runtime dependency confidence because the server is pure standard-library Go with `CGO_ENABLED=0`.

### Option B — Single Ubuntu cross-builder (approved)

Stage once and use Go cross-compilation plus standard-library deterministic archive writers.

- **Pros:** One reviewed embed tree, one packaging implementation, faster/cheaper CI, reproducible metadata, easy complete-bundle checksums, and exact consistency across targets.
- **Cons:** macOS/Windows binaries are cross-compiled rather than executed in CI. Compile-time GOOS coverage and browser-command unit tests remain required; native smoke jobs can be a future evidence-driven addition.

### Option C — Shell-only workflow packaging/publication

Use inline `tar`, `zip`, `sha256sum`, and `gh` commands.

- **Pros:** Few source files.
- **Cons:** Difficult deterministic cross-platform behavior, brittle quoting/state handling, weak unit-testability, and a larger high-privilege shell surface.

### Nightly replacement alternatives

- **Delete/recreate nightly:** rejected because failure creates a download gap and can destroy the previous working channel.
- **Overwrite fixed asset names with `--clobber`:** rejected because GitHub CLI deletes before upload.
- **Commit-scoped assets then canonical switch (approved):** upload unique names, verify remote digests, re-check current main, move/update canonical nightly, then delete only prior assets. A partial failure leaves the previous set and labels any candidate bytes by commit.

## Approved Design Details

### Build and package flow

1. Check out with full tag history and no persisted credentials.
2. Install Node 22 from the lockfile and Go from `go.mod` using full-SHA-pinned official Actions.
3. Run `npm ci --ignore-scripts`, audit, and ordinary publication build/isolation checks. Under `brain-atlas-ek3`, do not run a partial Node suite on Ubuntu; require the complete 200-test suite locally in the recorded Darwin arm64/Nix environment.
4. Run the publication guard and standalone production Vite staging once.
5. Run CGO-free Go tests, host race tests, and vet after the tracked placeholder guarantees clean compilation.
6. Derive a safe label:
   - PR/manual: `ci-<short SHA>`
   - main push: `nightly-<short SHA>`
   - stable tag: exact validated `v*` tag
7. Cross-build with `CGO_ENABLED=0`, `-trimpath`, and stripped linker flags for:
   - `linux/amd64`, `linux/arm64`
   - `darwin/amd64`, `darwin/arm64`
   - `windows/amd64`, `windows/arm64`
8. Package normalized archive paths, modes, ownership, and source-commit timestamp using Go's `archive/tar`, `compress/gzip`, and `archive/zip` standard packages.
9. Write sorted checksums and deterministic provenance fields. Run-specific URLs may live in an external provenance file but must not make platform archives nondeterministic.
10. Validate all expected targets/files and repeat one packaging operation to prove byte stability.
11. Extract/run Linux amd64 in a temporary empty directory and smoke the embedded server.
12. Upload `release/` as one immutable Actions artifact retained 14 days.

### Nightly publication flow

The nightly job runs only for a successful `push` to `refs/heads/main`, under a single `standalone-nightly` concurrency group and `contents: write` permission.

1. Download the exact build artifact from the same workflow run.
2. Validate local checksums/provenance and require every asset name to contain the short source SHA.
3. Query the repository's current `main`; exit successfully as stale without publication unless it equals `GITHUB_SHA`.
4. If nightly does not exist, create it as a draft prerelease with `--latest=false`, upload all assets, verify remote size/digest values, re-check current main, then publish it.
5. If nightly exists, upload only the new commit-scoped names without clobbering. Existing same-name assets are permitted only when their size/digest already match (idempotent retry); mismatches fail.
6. Verify every new remote asset digest and re-check current main immediately before promotion.
7. Force-move only `refs/tags/nightly` to the approved commit, update release title/body/provenance, retain prerelease and non-latest flags, and verify the resulting release/tag state.
8. Delete only assets whose names match the project's nightly prefix but not the promoted source SHA. Never delete stable or unknown assets.
9. A failure before promotion leaves the old nightly canonical and any candidate assets visibly commit-scoped. A failure after tag movement leaves a complete validated new set available; retry repairs metadata/cleanup idempotently.

### Stable publication flow

The stable job runs only for successful `refs/tags/v*` push builds with `contents: write`.

1. Resolve the remote tag to a commit (including annotated tags) and require exact `GITHUB_SHA` equality.
2. Validate local asset names/checksums/provenance against the exact tag and commit.
3. If no release exists, use `gh release create <tag> <assets…> --verify-tag --generate-notes --latest` so GitHub CLI drafts, uploads, and then publishes.
4. If a release exists, require non-draft/non-prerelease metadata, the same immutable tag commit, and an exact remote name/size/SHA-256 match for every expected asset. If all match, return success without writes; otherwise fail.
5. Never use edit, delete, clobber, or tag-move operations for `v*`.

### Action pins selected

Use only GitHub-owned Actions allowed by repository policy:

- `actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0` (`v7.0.0`)
- `actions/setup-node@820762786026740c76f36085b0efc47a31fe5020` (`v7.0.0`)
- `actions/setup-go@b7ad1dad31e06c5925ef5d2fc7ad053ef454303e` (`v7.0.0`)
- `actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (`v7.0.1`)
- `actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` (`v8.0.1`)

Re-verify these upstream tag bindings before implementation and record any necessary version change.

## Files and Boundaries

### Build/package implementation

- Modify `.gitignore` and add `internal/site/dist/.gitkeep` so clean `go:embed` compilation works while generated staging stays ignored.
- Modify `scripts/build-standalone.mjs` to expose/test a stage-only path without changing host binary behavior.
- Modify `package.json` to add explicit staging, release build, and release verification scripts.
- Create `internal/releasepack/releasepack.go` and tests for target inventory, safe labels, normalized archives, checksums, provenance, and validation.
- Create `internal/releasepack/SPEC.md` and register it in `docs/specs/MANIFEST.md`.
- Create `cmd/package-standalone/main.go` and tests as the thin release-build CLI/orchestrator.
- Extend `test/standalone-build.test.js` for stage-only CLI behavior and environment preservation.

### Publication implementation

- Create `scripts/publish-standalone-release.mjs` with shell-free `gh` invocation, pure policy/state helpers, dry-run output, remote digest verification, stale-main guards, nightly promotion/cleanup, and stable no-mutation checks.
- Create `test/standalone-release-publish.test.js` for first/retry/stale/failure plans with an injected fake GitHub command runner.
- Create `.github/workflows/standalone-binaries.yml` with read-only build and isolated nightly/stable publication jobs.
- Create `test/standalone-workflow.test.js`; parse YAML with the existing `yaml` package rather than regex and assert triggers, permissions, conditions, action pins, retention, and no pull-request publication credentials.

### Documentation

- Restructure `README.md` around `## Use Brain Atlas` and `## Development` while preserving scientific disclosures and controls.
- Create `docs/RELEASES.md` for supported assets, nightly/stable semantics, maintainer release steps, retry/failure behavior, checksums/provenance, and unsigned limitations.
- Update `docs/ARCHITECTURE.md` with the release build/publication data flow.
- Update `docs/SECURITY_REVIEW.md` with release-token boundaries, mutable-nightly risk/controls, stable immutability policy, artifact retention, action pins, checksums, and unsigned residual risk.
- Update `internal/standalone/SPEC.md` build/testing failure mode for the tracked placeholder and stage-only release path.
- Update `AGENTS.md` verification/release contributor guidance if implementation adds durable commands or release invariants.
- Review `THIRD_PARTY_NOTICES.md`; expect no change because tooling remains Node/Go standard library plus GitHub-owned Actions.
- Record no scientific impact for `DATA_LICENSES.md`, `docs/SCIENTIFIC_TRACEABILITY.md`, `docs/TRACT_SPACE_PROVENANCE.md`, lesson validation files, and `CITATION.cff` unless release naming/version metadata changes.

## Task Sequence

### Task 1: Clean-checkout embed and stage-only build [Independent]

**Tests first:**

- Add a Node test requiring a checked placeholder and a stage-only argument/API that does not invoke Go build.
- Confirm direct clean `CGO_ENABLED=0 go test ./...` fails before the fixture correction (already observed and recorded in `brain-atlas-is9`).

**Implementation:**

- Correct ignore traversal, add the placeholder, and split staging from host build while retaining `npm run build:standalone` behavior.

**Focused verification:**

```bash
node --test test/standalone-build.test.js test/build-config.test.js
CGO_ENABLED=0 go test ./...
npm run build:standalone:site
npm run build:standalone
```

### Task 2: Deterministic release packager [Depends on Task 1]

**Tests first:**

- Target matrix and extension/executable rules.
- Safe label/commit/timestamp validation.
- Tar/zip normalized contents and modes.
- Same input produces byte-identical archives.
- Sorted checksums and complete provenance.
- Missing/extra target, notice, or checksum fails validation.

**Implementation:**

- Add `internal/releasepack` and thin `cmd/package-standalone` CLI.
- Cross-build all six targets from one staging tree and package the required notices.

**Focused verification:**

```bash
go test ./internal/releasepack ./cmd/package-standalone
npm run build:release -- --label ci-local
npm run verify:release
```

### Task 3: Publication policy and dry-run engine [Depends on Task 2]

**Tests first:**

- Nightly first publish, matching retry, stale-main skip, new candidate promotion, digest mismatch failure, and project-prefix-only cleanup.
- Stable first publish, exact matching retry no-op, tag/commit mismatch failure, digest mismatch failure, and no stable mutation commands.
- Argument/ref/repository/asset-name validation and shell-free argument arrays.

**Implementation:**

- Add `scripts/publish-standalone-release.mjs` with injected command execution for tests and `--dry-run` plans for offline rehearsal.

**Focused verification:**

```bash
node --test test/standalone-release-publish.test.js
node scripts/publish-standalone-release.mjs --channel nightly --dry-run --assets release
node scripts/publish-standalone-release.mjs --channel stable --tag v0.0.0-test --dry-run --assets release
```

### Task 4: GitHub Actions workflow [Depends on Tasks 1–3]

**Tests first:**

- Parse the workflow with `yaml` and assert exact events, read/write job permissions, publication conditions, full-SHA official Action pins, no persisted credentials, 14-day retention, artifact handoff, and concurrency.

**Implementation:**

- Add `.github/workflows/standalone-binaries.yml` and use the tested scripts rather than embedding release mutation logic in YAML.

**Focused verification:**

```bash
node --test test/standalone-workflow.test.js
npm test
```

### Task 5: User-first README and release/security documentation [Depends on Task 4]

**Implementation:**

- Lead with hosted viewer and stable/nightly download options.
- Add checksum-first unsigned-platform instructions. On macOS, prefer Apple's documented one-time Privacy & Security override and confine any command-line dequarantine fallback to the verified executable; explicitly reject disabling Gatekeeper, `sudo`, or broad recursive `xattr` use.
- Move current `Run it`, viewing stability, source standalone build, and publication instructions under Development without losing safeguards.
- Add release process and update architecture/security/SPEC/contributor docs.

**Focused verification:**

```bash
rg -n '^## (Use Brain Atlas|Development)$|brain-atlas.github.io/releases/(latest|tag/nightly)' README.md
rg -n '^## (Purpose|Public Interface|Invariants|Failure Modes|Testing)' internal/releasepack/SPEC.md
rg -n 'internal/releasepack/SPEC.md' docs/specs/MANIFEST.md
rg -n 'nightly|v\*|SHA256|unsigned' docs/RELEASES.md docs/SECURITY_REVIEW.md docs/ARCHITECTURE.md
```

### Task 6: Full verification, review, and closeout [Depends on Tasks 1–5]

- Run all verification commands from the plan header from a clean generated-output state.
- Build twice with the same commit timestamp and compare archive digests.
- Inspect/extract all archives with established archive parsers and run the Linux amd64 moved-binary smoke test.
- Verify ordinary output isolation and standalone production hook removal.
- Run documentation validation and high-risk code review focused on workflow permissions, shell/argument safety, stale runs, nightly failure windows, stable no-mutation behavior, and archive provenance.
- Compare implementation with this approved design; record deviations or obtain renewed approval.
- Record docs/scientific/license/CITATION impact and exact evidence in `brain-atlas-is9`.
- Do not push, tag, release, merge, or alter repository settings without separate explicit approval.

## File Conflicts

| File | Tasks | Resolution |
|---|---|---|
| `package.json` | Tasks 1, 2 | Task 2 depends on Task 1 and extends the same script block. |
| `test/standalone-build.test.js` | Tasks 1, 2 | Keep stage behavior in Task 1; release packager gets Go-focused tests in Task 2. |
| `README.md` and docs | Tasks 4, 5 | Documentation follows final workflow names/behavior from Task 4. |
| `internal/standalone/SPEC.md` | Tasks 1, 5 | Make the functional failure-mode correction in Task 1; polish cross-links in Task 5. |

## Risks and Mitigations

- **Stale main run publishes after a newer commit:** exact main-SHA checks occur before upload planning and immediately before promotion; publication is serialized.
- **Nightly upload fails:** unique commit-scoped names and no clobber preserve prior assets; cleanup is last.
- **Metadata/tag update partially fails:** all new assets are validated before either update and remain commit-labeled; retry is idempotent and repairs canonical state.
- **Stable retry changes history:** existing stable state is read/verified only; mismatch fails without edit/delete/upload.
- **Untrusted PR gains write token:** publication jobs are event/ref-gated and job-scoped; PR build remains `contents: read` with no secrets.
- **Shell injection through tag/label:** validate labels and use `execFile`/argument arrays; stable tags must match a narrow semantic-version pattern inside the broader `v*` workflow trigger.
- **Archive differs across runs:** normalize timestamps, modes, owners, names, compression headers, ordering, and provenance inputs; test byte identity.
- **Cross-built binary fails natively:** execute Linux amd64 in CI, compile all targets, retain platform launcher unit tests, and document lack of signing/native CI runtime. Add native smoke jobs only if evidence warrants cost.
- **README becomes developer-first again:** keep user choices before scientific detail/setup and test heading/link structure.
- **Unsigned macOS guidance trains unsafe bypasses:** put checksum verification first, use Apple's one-time GUI override as the normal path, scope `xattr -d` to one verified executable only, and never disable Gatekeeper or recommend recursive quarantine removal.
- **Repository-wide immutable releases block nightly:** do not enable that setting under this two-channel decision; enforce stable immutability in workflow logic.

## Documentation and Scientific Impact

This feature changes distribution, CI, release metadata, README information architecture, and the supply-chain trust boundary. It does not change runtime anatomy, coordinate frames, rendering, activity models, lesson claims, dataset versions, source assets, or runtime data licenses. `DATA_LICENSES.md`, scientific traceability, tract provenance, and lesson validation should remain unchanged unless packaging reveals missing redistribution text. `CITATION.cff` remains unchanged unless the user deliberately selects a new software version/title/authorship/repository URL as part of a later stable release decision.

`THIRD_PARTY_NOTICES.md` already includes the Go runtime/standard-library license. No new runtime or package dependency is planned. Full-SHA-pinned GitHub-owned Actions are build infrastructure and should be documented in the security/release records rather than copied into runtime notices unless verified terms require otherwise.

## Local Implementation Result

Implemented and verified on current `origin/main` `1ebbd7e` in the isolated worktree. Verification-driven refinements beyond the initial design include clean/dirty source-state provenance with a hard publication rejection, symlink rejection for package inputs/downloaded assets/output parents, final tag/main/release re-reads after GitHub state transitions, Python-cache handling for the clean-tree gate, and disabled Go dependency caching for the standard-library-only module. Approved refresh decisions `brain-atlas-5oo` and `brain-atlas-4af` preserved upstream lesson performance documentation while retaining the user-first README.

Fresh local evidence includes 200 passing Node tests; all CGO-free Go tests; race and vet checks; zero npm vulnerabilities; actionlint on both workflows; ordinary publication isolation; two byte-identical six-target release builds with exact archives/checksums/provenance; extracted native CGO-free root/data/model/404/405 smoke checks; three passing production Chromium scenarios; offline nightly/stable publication plans; and schema-valid Gemma behavioral/boundary reviews with zero findings. PR run `29973046121` exposed that seven scientific asset-regeneration tests are intentionally byte-exact to the recorded Darwin arm64/Nix environment; decision `brain-atlas-ek3` removes Node tests from the Ubuntu release job rather than claiming a partial cross-platform suite, while preserving the complete local gate. Malformed DeepSeek candidates led to tested final-state race hardening; no confirmed or unresolved Critical/Important issue remains. Review artifacts are under `.pi/reviews/20260723-standalone-release-ci/`.

Feature-branch commit, push, PR creation, and read-only PR checks are authorized by `brain-atlas-dpx`. No merge, main push, tag, release publication, repository-setting change, signing, or notarization is authorized. The Bead must remain open through the first real GitHub artifact/nightly run; a stable tag rehearsal remains separately gated.

## Execution Handoff

Plan saved to: `.pi/plans/brain-atlas-is9-standalone-release-ci-design-plan.md`

Recommended execution: `test-driven-development` for Tasks 1–4, `documentation-standards` for Task 5, `requesting-code-review` plus `verification-before-completion` for Task 6. Implementation is explicitly requested and design-approved; proceed serially in the isolated worktree. Remote push/tag/release/merge actions remain unapproved.
