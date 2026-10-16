# Atlas persistence design-plan

**Issue:** brain-atlas-zmq.18
**Design:** combined here
**Date:** 2026-10-16
**Branch:** main (existing checkout; no branch/integration action requested)
**Status:** Implemented core scope; final verification/closeout tracked in brain-atlas-zmq.18
**Approval:** user choice recorded in brain-atlas-zmq.18 on 2026-10-16; named views retained in brain-atlas-zmq.33

## Goal and decision

Restore last validated global Atlas across reloads using origin-local storage. User chose core first; named-view CRUD retains its original acceptance in dependent brain-atlas-zmq.33. Existing canonical snapshot v2 and single renderer adapter remain authoritative. No lesson source, session/history tokens, temporary lesson exploration, stochastic particles, queues or model time persist. No dependency, cookie, network transmission or data-asset changes.

One small UI storage module owns a versioned envelope, bounded JSON decode and strict existing canonical validation against current catalogs. Unknown versions or invalid content are discarded, not guessed/migrated. Storage access/write failures are contained outside renderer fallback. Bootstrap owns debounced global-only saves, actual-camera capture, page-hide/hidden/navigation flush and startup restore before first renderer application. Renderer adds only camera-change notification on its existing wrapper; no frame polling. Restored cameras bypass responsive default fit to avoid compounding distance. Current reduced-motion policy remains authoritative.

Retain camera reset; add distinct keyboard-accessible Reset Atlas control using existing native button style, plus local-only/failure text. Reset and explicit Exit lesson replace last saved global state with complete authored default; temporary branches never autosave. Restore applies only to global Atlas, not checked lesson deep links. Same-origin tabs use last successful save; no live synchronization or conflict merge. Origin includes port, so standalone ephemeral ports may not share stored state.

## Work and affected paths

1. Tests first: `test/atlas-storage.test.js` for envelope, strict canonical validation, limits, stale references, round trips, denied reads/writes and reset. `scripts/browser/home-persistence.spec.cjs` for actual-camera reload, global/lesson isolation, reset/Exit, denial/quota, compact framing and motion preference. Existing test fixtures/catalogs reused.
2. Implement `src/ui/atlas-storage.js`, `src/bootstrap.js`, small notification port in `src/main.js`, and `index.html`. Preserve canonical public exports/schema and all existing controls.
3. Update `README.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY_REVIEW.md`, `src/ui/SPEC.md`, and contributor wording in `AGENTS.md` for validated restored startup. No scientific/provenance/license changes: geometry, assets and activity model unchanged.
4. Verify focused/unit/full tests, publication build, focused headless browser suite and screenshot/console. Review diff with routed peer; retain limitations. Record evidence in Bead, commit only task-owned files, direct-closeout, handoff.

## Acceptance and verification

- Complete canonical settings plus rendered camera survive reload; invalid/unsupported records never reach renderer.
- Temporary lesson branches/source/tokens never enter storage; Exit still resets Atlas.
- Reset Atlas restores default, including next reload; camera Reset remains separate.
- Blocked/quota storage does not disable viewer; visible notice does not claim successful persistence.
- No repeated narrow-screen camera fitting; motion preference respected.
- Named views excluded explicitly, not marked delivered.

```bash
node --test test/atlas-storage.test.js
npm test
npm run build:publish
# Existing external Playwright harness; no application dependency installed.
NODE_PATH=/private/tmp/brain-atlas-zmq26-readiness/harness/node_modules BRAIN_ATLAS_URL=http://127.0.0.1:5213/ BROWSER=chromium PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" /private/tmp/brain-atlas-zmq26-readiness/harness/node_modules/.bin/playwright test --config=scripts/browser/playwright.config.cjs scripts/browser/home-persistence.spec.cjs
```

Implementation follows this design; browser filename uses the existing `home-*` test discovery pattern. Storage record uses a 131,072-code-unit bound; camera coordinates are finite and bounded to ±1,000,000 scene units with distance 1–1,000,000. No previous design was superseded. Current architecture/spec/user docs own shipped behavior; Beads owns final evidence. No publication, push, deployment, scientific source change or browser configuration change authorized.
