# Standalone Local Server

## Purpose

`internal/standalone` delivers the reviewed static Brain Atlas build from one
platform-specific executable. It serves only loopback clients, opens the default
browser when requested, and exits after the last authenticated Atlas page has
remained disconnected through a reload-safe grace period.

This package is a delivery boundary, not an application backend. It stores no
lesson, anatomy, account, or personal data and must not alter the renderer,
lesson contract, scientific assets, or coordinate system.

## Core Mechanism

The standalone build flag injects `src/standalone/lifecycle.js` while Vite stays
in production mode; the ordinary Pages build omits it. `internal/site` embeds the standalone Vite output. `Run`
creates a random session secret, builds the static/lifecycle handler, listens on
an approved loopback address, prints and optionally opens the actual URL, and
waits for an OS cancellation, HTTP failure, or lifecycle expiry.

The root response places the secret in an `HttpOnly; SameSite=Strict` session
cookie. The browser module opens a same-origin held GET to
`/_brain-atlas/lifecycle`. An authenticated request joins the lifecycle tracker
until its request context closes. The first join arms automatic shutdown; the
last leave starts the grace timer; a reconnect invalidates that timer. Closing
the resulting tracker channel starts normal `http.Server.Shutdown`.

**Key files:**

- `app.go` — loopback validation, listener/server ownership, random secret, and
  graceful shutdown selection.
- `handler.go` — static-file policy, security headers, lifecycle authentication,
  and held-response boundary.
- `lifecycle.go` — concurrency-safe client counting and generation-guarded grace
  timer.
- `browser.go` / `browser_*.go` — shell-free GOOS-specific URL handoff.
- `../site/embed.go` — checked Vite-asset embedding boundary.
- `../../src/standalone/lifecycle.js` — standalone-only held-request client.
- `../../scripts/build-standalone.mjs` — publication guard, standalone Vite
  build, and `CGO_ENABLED=0` Go build.

## Public Interface

| Export/API | Used by | Contract |
|---|---|---|
| `Run(ctx, RunConfig)` | `cmd/brain-atlas` and tests | Serve the injected `fs.FS` on loopback until cancellation, server failure, or enabled lifecycle expiry. Browser-open failure is reported but nonfatal. |
| `NewHandler(HandlerConfig)` | `Run` and handler tests | Require `index.html`, a lifecycle registry, and a nonempty process secret; return one GET/HEAD static plus authenticated lifecycle handler. |
| `NewLifecycle(grace)` | `Run` | Return an initially unarmed, concurrency-safe last-client tracker with a one-shot `Done` channel. |
| `(*Lifecycle).Join()` | lifecycle handler | Arm/increment the tracker and return an idempotent leave closure. |
| `(*Lifecycle).Done()` | `Run` | Close once after an armed zero-client grace period survives without reconnect. |
| `OpenBrowser(url)` | `cmd/brain-atlas` | Hand the URL to the platform default handler without a shell and reap the short-lived helper. |

`RunConfig.Site`, output, browser opener, and timing fields are injected so tests
can exercise real HTTP behavior without launching a browser or reading generated
assets.

## Invariants

| ID | Invariant | Enforcement | Why it matters |
|---|---|---|---|
| INV-1 | The default and every accepted `-addr` value are loopback-only; wildcard, LAN, empty-host, and public DNS addresses fail before listen. | `validateLoopbackAddress` + tests | The executable is a workstation launcher, not a network service. |
| INV-2 | The executable serves one reviewed Vite publication artifact from `embed.FS`; it never reads runtime assets from the working directory. | `internal/site`, build script, moved-binary smoke test | One-file distribution must not hide adjacent-file or Node dependencies. |
| INV-3 | Lifecycle registration requires the process-random strict HttpOnly cookie. There is no CORS grant or explicit shutdown endpoint. | handler + tests | An unrelated page must not control local process lifetime. |
| INV-4 | Shutdown remains unarmed until the first valid page joins. The last leave starts one grace timer; any reconnect invalidates stale callbacks; each leave counts once. | generation-guarded tracker + race tests | Browser-launch failure remains recoverable, reloads survive, and multiple tabs behave predictably. |
| INV-5 | An authenticated lifecycle response flushes and remains open until request-context cancellation. The server has no global write timeout. | handler and `http.Server` configuration | The connection represents page lifetime and must not expire as an ordinary response. |
| INV-6 | Browser handoff is optional and nonfatal. GOOS launchers use argument arrays, not a shell, and helper exit never determines server lifetime. | `browser_*.go`, `Run`, tests | Default browsers are often existing processes; helper lifetime is not tab lifetime. |
| INV-7 | The Go implementation uses the standard library and release builds force `CGO_ENABLED=0`. | `go.mod`, build script, cross-build verification | The binary should run without C runtimes or redistributed shared libraries. |
| INV-8 | Static delivery allows only GET/HEAD, returns 404 for unknown or hidden paths (including the embed placeholder), preserves required data/model MIME types, and sends `Cache-Control: no-cache` for every embedded file. | handler + tests | A fixed local port must not reuse stale code or data from an older executable, even if two build profiles emit the same chunk name. |
| INV-9 | Ordinary Vite/Pages output contains no standalone lifecycle module or endpoint marker. Standalone output uses `standalone-assets/`, distinct from ordinary `assets/`. | production-mode conditional Vite plugin + Node/build tests | Pages must remain static, and fixed-port upgrades must escape any older standalone chunk cached under the former asset namespace. |
| INV-10 | SIGINT/SIGTERM, lifecycle expiry, and server failure converge on one bounded graceful-shutdown path. | `Run` | Open streams must close without orphaning the listener. |

## Failure Modes

| ID | Symptom | Cause | Fix |
|---|---|---|---|
| FAIL-1 | Executable reports that `index.html` is missing. | Go was built directly before the standalone Vite staging build. | Run `npm run build:standalone`; do not weaken the embedded-site check. |
| FAIL-2 | Browser does not open, but the process remains running. | OS URL helper is absent or rejected the request. | Use the printed URL; browser-open failure is deliberately nonfatal. |
| FAIL-3 | Reload closes the server. | Grace period removed, zeroed unintentionally, or reconnect no longer invalidates the stale timer. | Restore INV-4 and its lifecycle tests. |
| FAIL-4 | Server never exits after all Atlas pages close. | Lifecycle module omitted from standalone output, cookie rejected, stream not canceled, or `-stay-open` selected. | Check standalone marker, root cookie, lifecycle response, and command flags. |
| FAIL-5 | Lifecycle requests end after a fixed duration. | A global `WriteTimeout` was added or a proxy buffers/closes the stream. | Preserve INV-5; this process serves loopback directly and needs no proxy. |
| FAIL-6 | WebGL models or notices fail despite a 200 HTML response. | Asset tree was not fully embedded or MIME/path behavior changed. | Run publication, moved-binary root/data/model, and MIME tests. |
| FAIL-7 | Linux binary requires glibc or another shared library. | Build did not force `CGO_ENABLED=0` or gained a cgo dependency. | Use the supported build script and verify the ELF artifact is statically linked. |

## Decision Framework

| Situation | Action | Spec item |
|---|---|---|
| Need LAN or remote access | Stop and create a separate security/design decision; do not relax address validation. | INV-1 |
| Need a native tray, WebView, or browser-process monitoring | Treat it as a different desktop architecture and dependency review. | INV-6, INV-7 |
| Need another browser/server message | Extend the narrow authenticated same-origin boundary and update the security review; do not create a general API. | INV-3 |
| Need faster page reloads | Preserve whole-artifact revalidation unless measured evidence proves every standalone build profile changes asset identities correctly across executable upgrades. | INV-8 |
| Need lifecycle behavior on Pages | Do not add it to the ordinary bundle; Pages has no matching server endpoint. | INV-9 |
| Need automatic shutdown while `-no-open` is active | Keep shutdown unarmed until a valid page connects so a failed/manual launch remains usable. | INV-4 |

## Testing

| Spec item | Verification | Notes |
|---|---|---|
| INV-1, INV-6, INV-10 | `CGO_ENABLED=0 go test ./internal/standalone -run 'ValidateLoopback|Run|Browser'` | Uses injected browser and real loopback HTTP. |
| INV-3, INV-5, INV-8 | `CGO_ENABLED=0 go test ./internal/standalone -run 'Handler|LifecycleEndpoint|Static'` | `httptest` covers cookies, stream cancellation, methods, headers, MIME, and missing files. |
| INV-4 | `go test -race ./internal/standalone -run Lifecycle` | Fake timers deterministically fire stale callbacks. Race instrumentation may use the host C toolchain; release builds remain CGO-free. |
| INV-2, INV-7 | `npm run build:standalone` plus moved-binary and GOOS/GOARCH smoke builds | Operational release evidence. |
| INV-9 | `node --test test/build-config.test.js test/standalone-lifecycle.test.js test/standalone-build.test.js` and marker searches in both outputs | Verifies mode separation and browser reconnect behavior. |
| All | `npm test && CGO_ENABLED=0 go test ./...` | Full regression suites. |

## Dependencies

| Dependency | Type | Spec path |
|---|---|---|
| Vite publication build | internal | `vite.config.js`, `scripts/check-publish.mjs` |
| Embedded site | internal | `internal/site/embed.go` |
| Browser lifecycle client | internal | `src/standalone/lifecycle.js` |
| Lesson contract and renderer | internal, unchanged | `src/lesson/SPEC.md`, `src/main.js` |
| Go standard library | external | Go 1.23+ module contract; no third-party modules |
