# Pre-publication security review

**Date:** 2026-07-20; local-import boundary updated 2026-07-21; standalone
loopback-server boundary added 2026-07-22

**Scope:** Static viewer, optional standalone workstation executable, local
lesson-import boundary, declared supplementary images, tracked/deployed assets,
npm and Go build chains, GitHub Actions Pages deployment, and
repository/organization controls.

**Tracking:** Beads `brain-atlas-7zf`, `brain-atlas-qjh`

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

```text
maintainer -> Git/GitHub -> Actions build -> Pages artifact -> visitor browser
                         npm registry ----^                  ^  ^
                         GitHub actions ---------------------|  |
local Markdown file/paste -> strict in-browser parser ----------|
declared HTTPS image host <--- explicit lesson activation ------|

reviewed Git tree -> standalone Vite build -> CGO-free Go embed -> local executable
                                                                    |          ^
                                                                    v          |
                                                      loopback static files + authenticated
                                                            page-lifecycle stream
```

Trust boundaries exist at maintainer authentication, GitHub repository writes,
npm package retrieval, reusable GitHub Actions, the Pages deployment artifact,
standalone binary build/distribution, the workstation loopback listener, browser
parsing of published and user-supplied lesson data, and the optional HTTPS image
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

The primary adversaries are opportunistic web attackers, malicious local
software or pages probing loopback, a compromised maintainer account, and a
compromised npm package or reusable Action. The main unsafe control actions are
deploying from an unauthorized ref, building code that does not match the
lockfile, granting build steps a deployment token, publishing more than the
reviewed artifact, or relaxing the standalone loopback/authentication boundary.

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
- Tracer and superficial-fibre GPU buffers have explicit upper bounds.
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
- The workflow triggers only on `main` or manual dispatch, does not deploy pull
  requests, uploads only `dist/`, and uses the protected `github-pages`
  environment.
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
  Users must obtain them from a trusted project release or build from source;
  platform warnings and release checksums/signing remain future distribution
  work.
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
  on low-resource devices. This is an availability/performance limitation, not
  a server compromise path.
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
# Move the executable to an empty directory, start with -no-open -stay-open,
# and request /, /data/entities.json, and /models/brain_mni.glb.
```

The expected result is a clean audit and both builds, no matches or files from
the two Pages-artifact searches, passing Go tests, and successful moved-binary
root/data/model requests. Browser verification must also cover reload during the
grace period, two open Atlas pages, and final-page shutdown.
