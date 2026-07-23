# Pre-publication security review

**Date:** 2026-07-20; local-import boundary updated 2026-07-21; standalone
loopback-server boundary added 2026-07-22; binary release pipeline added
2026-07-23

**Scope:** Static viewer, optional standalone workstation executable, local
lesson-import boundary, declared supplementary images, tracked/deployed assets,
npm and Go build chains, GitHub Actions Pages deployment, standalone artifact
and release publication, and repository/organization controls.

**Tracking:** Beads `brain-atlas-7zf`, `brain-atlas-qjh`, `brain-atlas-is9`; release-channel decision `brain-atlas-3mw`

## System boundary and trust model

The public production deployment has no server application, accounts, cookies,
or personal-data collection. Local paste and file controls parse lesson source
only in the browser; they do not submit or upload it. GitHub Actions converts the
reviewed Git tree into a static `dist/` artifact; GitHub Pages serves it; an
untrusted browser parses the HTML, JavaScript, JSON, OBJ, and GLB files.

The optional workstation executable adds an ephemeral local server, not a public
backend. It embeds the reviewed static artifact, binds an OS-assigned loopback
port, and uses one process-random HttpOnly session cookie solely to authenticate
a held page-lifecycle request. It stores no application or personal data.

A second Actions workflow turns that reviewed embed into six unsigned platform
archives. Its read-only build job hands one checksum/provenance-validated
artifact to separate write-scoped publication jobs. Successful `main` builds may
advance one mutable nightly prerelease; deliberate `v*` tags may create stable
releases that the workflow never mutates after publication.

```text
maintainer -> Git/GitHub -> Actions build -> Pages artifact -> visitor browser
                         npm registry ----^                  ^  ^
                         GitHub actions ---------------------|  |
local Markdown file/paste -> strict in-browser parser ----------|
declared HTTPS image host <--- explicit lesson activation ------|

reviewed Git tree -> standalone Vite build -> CGO-free Go embed -> local executable
                         |                         |                   |          ^
                         v                         v                   v          |
               six normalized archives -> checksums/provenance -> GitHub release
                                                                    |
                                                                    v
                                                      loopback static files + authenticated
                                                            page-lifecycle stream
```

Trust boundaries exist at maintainer authentication, GitHub repository writes,
npm package retrieval, reusable GitHub Actions, the Pages deployment artifact,
standalone binary build/distribution, the Actions artifact handoff, write-scoped
nightly/stable publication, the workstation loopback listener, browser parsing
of published and user-supplied lesson data, and the optional HTTPS image
hosts disclosed by an imported lesson.

## Security losses and hazardous states

| ID | Loss to prevent | Hazardous state |
|---|---|---|
| L-1 | Visitors execute unauthorized code | An unreviewed or tampered artifact is deployed |
| L-2 | Private or unlicensed material becomes public | The artifact contains secrets, ignored experiments, or unintended assets |
| L-3 | Viewer availability is materially degraded | Malformed or unbounded data exhausts browser resources |
| L-4 | Scientific or attribution integrity is lost | Code, anatomy, provenance, or notices are altered without review |
| L-5 | Local source or browsing context is disclosed unexpectedly | A staged lesson uploads data or contacts an image host before explicit activation, or sends a referrer |
| L-6 | A local launcher is exposed or controlled beyond its intended page lifetime | The standalone server binds a non-loopback interface, accepts an unauthenticated lifecycle request, serves unreviewed adjacent files, or leaves an orphan process |
| L-7 | Users receive a binary that does not match its reviewed source/channel | A stale run advances nightly, a partial/mixed asset set is exposed without commit labels, a checksum/provenance mismatch is ignored, or a stable tag/release is overwritten |

The primary adversaries are opportunistic web attackers, malicious local
software or pages probing loopback, a compromised maintainer account, and a
compromised npm package or reusable Action. The main unsafe control actions are
deploying from an unauthorized ref, building code that does not match the
lockfile, granting build steps a deployment token, publishing more than the
reviewed artifact, promoting a stale/partial release, mutating a stable release,
or relaxing the standalone loopback/authentication boundary.

## Controls verified

- Browser-visible author content is projected through an allowlisted view model and
  inserted with `createElement`/`textContent`; author HTML, unsafe URL schemes,
  undeclared images, scripts, styles, and frames are rejected.
- Local source is bounded to 512 KiB and validated all-or-nothing through the same
  strict parser/presentation path as checked-in content. Editing invalidates a valid
  preview; only explicit **Open lesson** activation can replace the in-memory session.
  History stores only a versioned mode, checked ID, or opaque tab-local key. The
  `?lesson=local` marker contains no source and cannot recover it after reload; recovery
  removes the marker and returns to Atlas. There is no upload, backend, storage,
  messaging, or credential handling.
- Anatomy/model requests remain same-origin and use established JSON, OBJ, and GLB
  parsers. Imported supplementary media may request only declared credential-free
  HTTPS image/source URLs after activation. Images use semantic DOM rather than
  WebGL textures, `referrerpolicy="no-referrer"`, lazy loading, complete attribution,
  and accessible failure/retry handling; there is no arbitrary `fetch`, `eval`,
  dynamic script insertion, or third-party runtime code.
- Tracer and superficial-fibre GPU buffers have explicit upper bounds. Canonical
  visibility starts each bilateral region mesh pair and the SWM dataset at most once,
  so a direct lesson does not parse unrelated independently packaged geometry.
- A restrictive meta Content Security Policy limits scripts and connections to
  the same origin, permits HTTPS only in `img-src`, and disables objects, base-URL
  changes, and form submission.
- `window.__view` is guarded by `import.meta.env.DEV`; verification ensures the
  production bundle does not contain the debug interface.
- `npm audit` reports zero known vulnerabilities. The lockfile resolves packages
  only from `https://registry.npmjs.org/` and records integrity hashes.
- The Pages build uses `npm ci --ignore-scripts`, audits dependencies, and runs
  the repository's publication guard.
- Reusable Actions are pinned to full commit SHAs. The build job has only
  `contents: read`; only the dependent deployment job receives `pages: write`
  and `id-token: write`.
- The Pages workflow triggers only on `main` or manual dispatch, does not deploy
  pull requests, uploads only `dist/`, and uses the protected `github-pages`
  environment.
- The standalone workflow builds on pull requests, `main`, `v*` tags, and manual
  dispatch, but its build job has only `contents: read`. It installs locked Node
  dependencies, uses the Go version contract from `go.mod`, runs audit/Node/Go/
  race/vet checks, verifies ordinary/standalone production separation, repeats
  deterministic six-target packaging, requires a clean source state (also
  recorded in provenance), smoke-tests the extracted static Linux executable,
  and retains the exact artifact for 14 days.
- Only ref-gated dependent publication jobs receive `contents: write` and the
  job-scoped GitHub token. Pull requests and manual dispatches cannot publish.
  Every reusable Action is GitHub-owned and pinned to a full SHA; checkout never
  persists credentials.
- Release archives use `CGO_ENABLED=0` and standard-library normalized writers.
  Each archive contains the executable and reviewed notice files; exact
  provenance records commit, timestamp, clean/dirty source state, toolchains,
  targets, sizes, and digests; sorted SHA-256 checksums cover all six archives.
- Nightly uploads commit-scoped names without `--clobber`, verifies GitHub's
  server-reported size/digest, rechecks current `main` before promotion, and
  re-reads tag/release/main state before cleanup, and cleans only complete
  managed-nightly names after the new set is usable. Stable publication verifies
  the pre-existing version tag, validates a complete draft, and re-resolves the
  tag after publication. Published releases are read-only; any retry or final
  state mismatch fails visibly.
- Dependabot monitors npm and GitHub Actions dependencies; CODEOWNERS identifies
  the maintainer for review.
- The repository permits only GitHub-owned reusable Actions, requires full
  commit-SHA pinning, defaults workflow tokens to read-only, disables unused
  Projects, and enables vulnerability alerts and automated security fixes.
- Secret-pattern scans found no credentials in tracked files or the private
  development history. The production build emits no source maps or symlinks.
- `scripts/check-publish.mjs` rejects untracked files under `public/`; local
  experimental assets live in ignored `.workbench/` and are absent from `dist/`.
- The standalone build runs the same publication guard, adds lifecycle code only
  under its explicit build flag while retaining Vite production mode, embeds the
  complete output with `go:embed`, and
  forces `CGO_ENABLED=0`. The ordinary Pages artifact contains no lifecycle
  module or endpoint marker. The Go module has no third-party modules; the
  executable's Go runtime/standard-library license is reproduced in
  `THIRD_PARTY_NOTICES.md`.
- The executable accepts only explicit loopback hosts and defaults to
  `127.0.0.1:0`; wildcard, LAN, empty-host, and public DNS addresses fail before
  listen. Static delivery allows GET/HEAD only, exposes no directory outside the
  embedded artifact, requires revalidation for every response to prevent stale
  fixed-port code, and adds CSP (including `frame-ancestors 'none'`), no-sniff,
  no-referrer, and frame-denial response headers.
- The root response sets a process-random `HttpOnly; SameSite=Strict` session
  cookie. Only a same-origin request with that value can join the held lifecycle
  stream. There is no CORS grant or explicit shutdown API. Auto-shutdown remains
  unarmed until a valid page connects; multiple pages are counted, reconnects
  cancel stale grace timers, and OS cancellation closes active request contexts.
- Browser launch uses fixed GOOS commands with argument arrays rather than a
  shell. Launch failure is nonfatal and helper-process exit never determines
  server lifetime.

## Residual risks and operational requirements

- GitHub account and organization security remain the highest-value controls.
  Require two-factor authentication for organization members before adding
  collaborators, use least-privilege roles, and review repository access.
- GitHub Pages does not provide project-controlled response headers. The meta CSP
  provides useful browser enforcement but cannot set every header directive,
  including `frame-ancestors`. The standalone server adds those headers locally;
  this does not change the Pages limitation.
- Standalone binaries are not signed, notarized, or installed by this project.
  Users must obtain archive, checksum, and provenance from the project release
  or build from source. Checksums detect corruption/mismatch but do not replace
  code signing or protect against a compromised release account. macOS guidance
  requires checksum verification first, prefers Apple's one-time Privacy &
  Security override, scopes any `xattr -d` fallback to the verified executable,
  and never disables Gatekeeper or recommends recursive quarantine removal.
- The nightly tag and release are intentionally mutable. Commit-scoped names,
  provenance, server-reported digests, stale-main checks, serialized promotion,
  and cleanup-last ordering limit mixed/stale publication, but consumers who
  need a permanent record must use a versioned stable release. Repository-wide
  immutable-release enforcement remains off because it would freeze nightly;
  stable immutability depends on workflow and maintainer policy. A concurrent
  privileged tag move can still create a brief mismatch between the last check
  and a GitHub state transition; final-state checks detect it but cannot make
  separate GitHub API operations atomic. Treat such a failure as an account/
  repository release-security incident, not as a normal retry to edit away.
- Loopback HTTP is intentionally unencrypted because the embedded viewer has no
  account or confidential server state. Other software running with local-user
  privileges can still probe localhost. The random strict cookie, dynamic port,
  embedded-only filesystem, absent CORS grant, and lack of privileged APIs limit
  that boundary; this is not a sandbox against a compromised workstation.
- Browser page teardown is an operational signal, not a browser-process API.
  Reloads and transient disconnects receive a grace period, and `-stay-open` or
  Ctrl+C provides an explicit fallback. A browser or OS defect could delay
  disconnect detection and leave the local process running until interrupted.
- The browser necessarily receives the complete public anatomical datasets.
  They provide no confidentiality boundary and must remain suitable for public
  redistribution.
- Large but bounded public data files can cause slow loading or memory pressure
  on low-resource devices. Direct lessons defer unrelated region meshes and SWM,
  but Atlas Home deliberately loads the complete authored default, and association
  metadata and geometry remain combined in one eager file. This is an
  availability/performance limitation, not a server compromise path. See
  [`PERFORMANCE.md`](PERFORMANCE.md) for measured emulation and unverified physical-device limits.
- Opening a lesson that declares external images reveals the learner's IP address
  and ordinary transport metadata to the listed hosts. The import preview discloses
  those hosts before activation and requests omit the page referrer, but the static
  meta CSP cannot generate a per-lesson host allowlist. Learners may decline to open
  the lesson; text, attribution, image-error fallback, and no-WebGL use remain usable.
- A declared image host controls response size and may serve a very large or slow image,
  consuming learner bandwidth or browser decode memory. The semantic `<img>` boundary
  prevents it from becoming executable lesson code, but the app intentionally does not
  prefetch through a privileged client to inspect content length. Host disclosure,
  explicit activation, browser image handling, lazy loading, and accessible failure are
  the current mitigations; untrusted lessons should use appropriately sized media.
- Dependency major versions are intentionally not upgraded during this review.
  Zero known vulnerabilities were reported; Dependabot and future focused
  compatibility testing remain required.
- The Ubuntu standalone release job does not rerun `npm test`. Seven scientific
  asset-regeneration tests require the recorded Darwin arm64/Nix byte-exact
  environment, and decision `brain-atlas-ek3` chose not to run a partial Node
  suite in release CI. Maintainers must therefore run the complete 200-test
  local Nix gate before integration; the remote release job independently keeps
  dependency audit, publication isolation, Go/race/vet, deterministic packaging,
  bundle validation, and extracted-binary smoke controls. This local-only Node
  gate is a residual process dependency, not an enforced GitHub status check.
- A compromised maintainer or GitHub organization owner could authorize a
  malicious deployment. The organization does not currently require two-factor
  authentication; require it before adding collaborators. Before publication,
  enable Pages from GitHub Actions and private vulnerability reporting, then
  protect `main` against deletion and force pushes after the clean-root push.

## Verification

```bash
npm audit
npm ci --ignore-scripts
npm run build:publish
# Confirm no production debug hook, standalone lifecycle code, source maps,
# symlinks, or unintended files.
rg '__view|_brain-atlas/lifecycle' dist/assets/*.js
find dist -type f -name '*.map' -o -type l

npm run build:standalone
CGO_ENABLED=0 go test ./...
go test -race ./internal/standalone
go vet ./...

npm run build:release -- --label ci-local
npm run verify:release -- --label ci-local
node --test test/standalone-workflow.test.js test/standalone-release-publish.test.js
# Compare a repeated build's SHA256SUMS, inspect every archive, then move the
# platform-native executable to an empty directory and request /,
# /data/entities.json, and /models/brain_mni.glb.
```

The expected result is a clean audit and both web builds, no matches or files
from the two Pages-artifact searches, passing Go/release-policy/workflow tests,
a complete reproducible six-target bundle with valid checksums/provenance, and
successful moved-binary root/data/model requests. Publication dry runs must show
no remote call; any real tag/release rehearsal requires separate approval.
Browser verification must also cover reload during the
grace period, two open Atlas pages, and final-page shutdown.
