# Standalone Go Server Design and Implementation Plan

**Issue:** `brain-atlas-qjh` — Ship standalone localhost Go binary
**Status:** Implemented
**Approval:** User requested implementation, Bead creation, plan documentation, and isolated-worktree execution on 2026-07-22; scope and design are recorded in `brain-atlas-qjh`.
**Date:** 2026-07-22
**Branch:** `feature/qjh-standalone-go-server`
**Design:** Combined in this document

**Goal:** Distribute Brain Atlas as one platform-specific executable that embeds the reviewed Vite artifact, opens the default browser on loopback, and exits shortly after the last Brain Atlas tab disconnects.

**Architecture:** The normal GitHub Pages build remains a static Vite publication with no launcher lifecycle code. An explicit standalone build flag keeps Vite in production mode while injecting one same-origin lifecycle module and writing the reviewed artifact to a Go-embeddable staging directory. A pure-Go executable (`CGO_ENABLED=0`) serves that embedded filesystem on a loopback-only dynamically allocated port, launches the default browser, authenticates lifecycle streams with a process-random strict session cookie, and gracefully shuts down after the last authenticated page connection has remained absent for a reload-safe grace period.

## Acceptance Criteria

- [x] A checked-in command builds a host-platform executable with `CGO_ENABLED=0`, all reviewed Vite output embedded, and no runtime Node or adjacent-file requirement.
- [x] The executable defaults to an automatically allocated loopback port, prints its URL, attempts to open the default browser, and supports `-no-open`.
- [x] Auto-shutdown arms only after the first authenticated Brain Atlas page connects; the last disconnect starts a grace period, a reconnect cancels it, multiple tabs are counted, and `-stay-open` disables it.
- [x] Lifecycle authentication uses a process-random `HttpOnly; SameSite=Strict` cookie; the lifecycle endpoint has no CORS permission and exposes no general shutdown API.
- [x] The normal Pages build contains no standalone lifecycle entry or endpoint marker.
- [x] Static requests preserve required MIME behavior; unknown paths return 404, unsupported methods return 405, and root/index responses prevent stale caching.
- [x] Existing Node tests and publication checks remain passing; focused Go/JavaScript tests and a moved-binary smoke test pass.
- [x] README, architecture, security, and contributor instructions document only behavior that has landed.
- [x] No scientific geometry, activity, provenance, citation, data-license, or third-party dependency behavior changes.

## Verification Commands

```bash
npm ci --ignore-scripts
npm test
npm run build:publish
npm run build:standalone
CGO_ENABLED=0 go test ./...

test -x build/brain-atlas || test -x build/brain-atlas.exe
! rg -l "_brain-atlas/lifecycle|standalone-lifecycle" dist
rg -l "_brain-atlas/lifecycle" internal/site/dist/assets internal/site/dist/index.html

TMPDIR=$(mktemp -d)
cp build/brain-atlas* "$TMPDIR/"
(
  cd "$TMPDIR"
  ./brain-atlas -no-open -stay-open -addr 127.0.0.1:0 >server.log 2>&1 &
  pid=$!
  trap 'kill "$pid" 2>/dev/null || true' EXIT
  for i in 1 2 3 4 5; do
    url=$(awk '/Brain Atlas is running at/{print $NF; exit}' server.log)
    [ -n "$url" ] && break
    sleep 1
  done
  curl --fail --silent --show-error "$url" >/dev/null
)
```

The final implementation may use a small checked-in smoke helper instead of the portable shell fragment if process control differs on Windows; it must retain equivalent evidence.

---

## Chosen Design

### Build separation

- Keep `npm run build:publish` and `dist/` unchanged for GitHub Pages.
- Keep Vite in production mode and make `vite.config.js` standalone-aware through the build wrapper's `BRAIN_ATLAS_STANDALONE=1` flag. Only that production build enables a small `transformIndexHtml` plugin that injects `src/standalone/lifecycle.js` as a Vite-managed module entry and writes chunks under `standalone-assets/`.
- Write standalone web output to `internal/site/dist/`, where `internal/site/embed.go` uses `//go:embed all:dist`.
- Keep generated staging files ignored except a tracked placeholder so clean Go package inspection remains possible. The supported build script restores the placeholder after Vite clears the directory and refuses to produce a release executable unless embedded `index.html` exists.
- Use a Node orchestration script so setting `CGO_ENABLED=0`, choosing `.exe` on Windows, and invoking Go are cross-platform. Do not rely on POSIX-only environment-prefix syntax in the npm command.

A direct post-build string replacement is rejected: it would serve HTML different from the Vite-tested artifact and make CSP, hashing, and verification more fragile. A second standalone HTML shell is also rejected because it would duplicate the application document.

### Browser-page lifecycle

`src/standalone/lifecycle.js` exists only in standalone output. It opens a credentialed, no-store request to `/_brain-atlas/lifecycle` and consumes the response body so the request remains active until page teardown or server shutdown. It reconnects after transient failures while the page is active. Normal browser context destruction closes the connection; a brief server-side grace period absorbs reload and history-navigation gaps.

The Go process generates a cryptographically random secret at startup. A root or index response sets it as a session cookie with `HttpOnly`, `SameSite=Strict`, and `Path=/`. The lifecycle handler validates the cookie before registering the connection, flushes response headers/body, and blocks on request-context cancellation. No JavaScript-readable token and no explicit shutdown endpoint are introduced.

The lifecycle tracker owns these invariants:

1. Zero clients before the first valid connection never triggers automatic shutdown, preserving a usable fallback when browser launch fails.
2. The first valid connection arms lifecycle shutdown.
3. Each authenticated stream increments active-client count exactly once and decrements exactly once.
4. The transition to zero starts one grace timer.
5. A reconnect before expiry cancels that timer.
6. Timer expiry publishes one shutdown signal.
7. `-stay-open` bypasses tracker-triggered shutdown while retaining Ctrl+C/SIGTERM handling.

The shutdown contract is “last Brain Atlas page,” not “default browser process.” Platform URL launchers usually hand off to an existing browser and exit immediately, so monitoring their process would be incorrect.

### HTTP and process boundary

- Default address: `127.0.0.1:0`; print the actual URL after listening.
- Optional `-addr` supports an explicit loopback address/port. Reject non-loopback addresses unless a future separately approved change adds LAN serving.
- Allow only `GET` and `HEAD` for static files and lifecycle setup.
- Return 404 for unknown paths; current routing uses query parameters and needs no catch-all SPA fallback.
- Use explicit MIME coverage where platform registries vary, especially `.glb`, `.obj`, `.cff`, and `.md`.
- Use `ReadHeaderTimeout`; do not apply a global `WriteTimeout` that would kill lifecycle streams.
- Revalidate every embedded file. Final browser verification showed that two standalone build profiles could emit the same chunk name with different debug-hook content; fixed-port users must not retain stale code under an immutable cache entry.
- Set same-origin/security headers consistently with the existing meta CSP without weakening imported HTTPS-image behavior.
- Handle SIGINT/SIGTERM and lifecycle expiry through one graceful shutdown path.

### Browser launching

Use small GOOS-specific standard-library implementations:

- macOS: `open <url>`
- Windows: `rundll32 url.dll,FileProtocolHandler <url>`
- Linux: `xdg-open <url>`

Reap launcher helper processes where needed. Browser-launch failure is non-fatal: print the URL and continue serving. Signing, notarization, installer generation, and a native tray/WebView are out of scope.

## Files and Boundaries

Expected files; exact package splits may be simplified while preserving tests and responsibilities.

- Create `go.mod` — Go module with no third-party dependencies.
- Create `cmd/brain-atlas/main.go` — flags, listen/start, browser launch, signal and graceful-shutdown orchestration.
- Create `internal/site/embed.go` and `internal/site/dist/.gitkeep` — embedded Vite filesystem and build-presence validation.
- Create `internal/standalone/lifecycle.go` — concurrency-safe active-client/grace tracker.
- Create `internal/standalone/handler.go` — static and lifecycle HTTP boundary.
- Create `internal/standalone/browser_*.go` — GOOS-specific default-browser commands.
- Create corresponding `*_test.go` files — lifecycle, HTTP, configuration, and orchestration tests.
- Create `src/standalone/lifecycle.js` and `test/standalone-lifecycle.test.js` — browser-side held-request/retry behavior.
- Create `scripts/build-standalone.mjs` — publication guard, standalone Vite build, placeholder restoration, and `CGO_ENABLED=0` Go build.
- Modify `vite.config.js` and `test/build-config.test.js` — conditional standalone HTML entry and output separation.
- Modify `package.json` — supported standalone build command.
- Modify `.gitignore` — generated embed staging and binary output.
- Modify `flake.nix` — make Go available in the supported development shell; no lock-source change expected.
- Modify `README.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY_REVIEW.md`, and `AGENTS.md` — current behavior, trust boundary, limitations, and verification.
- Review `THIRD_PARTY_NOTICES.md`, `DATA_LICENSES.md`, and `CITATION.cff`. The standalone executable includes compiled Go runtime and standard-library material, so reproduce the canonical Go license in `THIRD_PARTY_NOTICES.md`; data licenses and citation metadata retain a recorded no-impact rationale.

## Implementation Tasks

### Task 1: Establish toolchain and clean baseline

**Files:** `flake.nix`

1. Install worktree-local Node dependencies with the lockfile and run `npm test` before implementation.
2. Add the pinned nixpkgs Go toolchain to the development shell.
3. Verify Go is available through the project environment.

**Focused verification:**

```bash
npm ci --ignore-scripts
npm test
CI=1 nix develop --command go version
```

### Task 2: Separate standalone Vite output with tests

**Files:** `test/build-config.test.js`, `test/standalone-lifecycle.test.js`, `vite.config.js`, `src/standalone/lifecycle.js`

1. Write failing tests for ordinary-versus-standalone plugin/output selection and lifecycle held-request behavior.
2. Observe expected failures.
3. Add the conditional Vite plugin and minimal lifecycle module.
4. Run focused tests and build both modes; assert the ordinary artifact omits standalone markers.

**Focused verification:**

```bash
node --test test/build-config.test.js test/standalone-lifecycle.test.js
npm run build:publish
```

### Task 3: Implement lifecycle tracker test-first

**Files:** `internal/standalone/lifecycle_test.go`, `internal/standalone/lifecycle.go`, `go.mod`

1. Write failing deterministic tests using an injected timer/short duration for unarmed zero-client state, last-client grace, reconnect cancellation, multiple clients, and one-shot shutdown.
2. Observe expected failures.
3. Implement the smallest concurrency-safe tracker.
4. Run focused tests, including the race detector on the host platform.

**Focused verification:**

```bash
CGO_ENABLED=0 go test ./internal/standalone -run Lifecycle
go test -race ./internal/standalone -run Lifecycle
```

### Task 4: Implement authenticated HTTP boundary test-first

**Files:** `internal/standalone/handler_test.go`, `internal/standalone/handler.go`

1. Write failing `httptest` cases for root cookie issuance, authenticated/unauthenticated lifecycle streams, request cancellation, static MIME types, query-based root loading, 404, 405, and headers.
2. Observe expected failures.
3. Implement the handler against an injected `fs.FS` and lifecycle tracker.
4. Run focused tests.

**Focused verification:**

```bash
CGO_ENABLED=0 go test ./internal/standalone -run 'Handler|LifecycleEndpoint|Static'
```

### Task 5: Embed, launch, and build the executable

**Files:** `internal/site/*`, `internal/standalone/browser_*.go`, `cmd/brain-atlas/*`, `scripts/build-standalone.mjs`, `package.json`, `.gitignore`

1. Write failing tests around injected browser-launch behavior, address validation, missing embedded index, and shutdown selection.
2. Add the embedded site package, CLI orchestration, GOOS launchers, and cross-platform Node build wrapper.
3. Build with `CGO_ENABLED=0`; copy the result to an empty directory and verify it serves root without neighboring assets.
4. Cross-compile smoke builds for supported GOOS/GOARCH combinations where the installed Go toolchain permits it.

**Focused verification:**

```bash
npm run build:standalone
CGO_ENABLED=0 go test ./...
GOOS=linux GOARCH=amd64 CGO_ENABLED=0 go build ./cmd/brain-atlas
GOOS=darwin GOARCH=arm64 CGO_ENABLED=0 go build ./cmd/brain-atlas
GOOS=windows GOARCH=amd64 CGO_ENABLED=0 go build ./cmd/brain-atlas
```

### Task 6: Update current documentation and run full verification

**Files:** `README.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY_REVIEW.md`, `AGENTS.md`, this plan, and Bead `brain-atlas-qjh`

1. Document the one-command build, platform artifacts, browser/tab shutdown semantics, overrides, loopback boundary, and lack of signing/notarization.
2. Update architecture and security claims that currently describe a purely static deployment with no server process.
3. Record no-impact rationale for scientific provenance, data licenses, citation metadata, and third-party notices.
4. Run full Node, Go, publication, standalone, and moved-binary checks.
5. Perform browser verification: load Atlas and the checked lesson, check the console, reload during grace, test two tabs, close the final tab, and confirm process exit.
6. Compare implementation with this approved plan; record deviations and evidence in the Bead before closeout.

**Focused verification:** Use the commands in the plan header plus the repository’s documented visual checks.

## Risks and Mitigations

- **Reload mistaken for closure:** use a grace timer canceled by reconnect.
- **Browser helper mistaken for browser lifetime:** never derive shutdown from helper-process exit.
- **Cross-site page holds server open:** require an unguessable strict HttpOnly session cookie and provide no CORS access.
- **Lifecycle request killed by server timeout:** omit global write timeout; retain header and shutdown timeouts.
- **Stale generated embed files:** clean the standalone staging directory through the supported script and restore only its tracked placeholder.
- **Pages behavior changes:** condition injection on the standalone build flag while retaining Vite production mode, isolate its generated asset namespace, and test the normal built output for marker absence.
- **Port collision or stale browser cache:** default to an OS-assigned loopback port, print the actual URL, and require revalidation for every embedded response so an explicit fixed port cannot retain an older executable's code.
- **Platform opener unavailable:** report the error and leave the printed local URL usable.
- **App navigation closes lifecycle:** treat leaving the Atlas as a disconnected page; the grace period permits ordinary reload/back recovery. Do not claim whole-browser-process tracking.

## Documentation and Scientific Impact

This feature changes packaging, local hosting, browser launch, caching, and the security trust boundary. It does not change anatomy, MNI/ICBM transforms, rendering, activity direction, lesson scientific claims, datasets, source versions, data licenses, or citations. `DATA_LICENSES.md`, scientific traceability records, lesson validation records, and `CITATION.cff` should remain unchanged unless implementation uncovers an unexpected release-metadata requirement. Although the design adds no third-party Go module, the executable includes compiled Go runtime and standard-library material; `THIRD_PARTY_NOTICES.md` must reproduce the canonical Go license for binary redistribution.

**Implementation discovery, 2026-07-22:** The original plan expected no notice impact because the server uses only the Go standard library. Canonical Go license verification established that binary redistribution must reproduce its notice and disclaimer. Updating `THIRD_PARTY_NOTICES.md` is a compliance correction within the approved packaging scope, not a new runtime dependency or scientific change.

## Implementation Result

Implemented on `feature/qjh-standalone-go-server` and compared with this plan on 2026-07-22. The architecture, lifecycle protocol, loopback boundary, browser handoff, build wrapper, CLI overrides, and scientific non-impact match the approved design.

Material verification-driven refinements:

1. Vite remains in `production` mode and the build wrapper selects standalone injection with `BRAIN_ATLAS_STANDALONE=1`. A custom Vite mode exposed development hooks under Vite 8; the checked production Chromium test found and prevented that release defect.
2. Standalone chunks use `standalone-assets/`, and the Go server requires revalidation for every embedded response. This replaces the provisional immutable-hashed-asset policy after a fixed-port browser reproduced stale code under the same generated chunk name.
3. Hidden embed-staging paths such as `/.gitkeep` return 404.
4. `THIRD_PARTY_NOTICES.md` now carries the verified Go binary-redistribution notice.

Fresh closeout evidence on current `origin/main` includes 173 passing Node tests; passing CGO-free Go, race, and vet checks; ordinary publication isolation; a 25 MiB moved executable serving root/data/model without adjacent files; static Linux amd64 plus macOS/Windows amd64 cross-builds; authenticated curl lifecycle tests; an actual Chromium two-tab/reload/final-close process-exit test; three passing production browser scenarios; and a reviewed 1440×900 Atlas screenshot with no console or page errors. `DATA_LICENSES.md`, scientific traceability, lesson validation, and `CITATION.cff` have no impact.

## Execution Handoff

Plan saved to: `.pi/plans/brain-atlas-qjh-standalone-go-server-design-plan.md`
Recommended execution: `test-driven-development` for Tasks 2–5, `documentation-standards` for Task 6, and `verification-before-completion` before any completion claim.
