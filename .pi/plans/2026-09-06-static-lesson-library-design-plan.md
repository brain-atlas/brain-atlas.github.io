# Static lesson library design-plan

**Bead:** brain-atlas-zmq.11
**Status:** Implemented; final verification and closeout evidence recorded in Bead
**Date:** 2026-09-06
**Branch:** main (existing checkout; no integration or publication authorized)

## Approved scope

User approved library infrastructure around the existing Early Vision lesson only. No new curriculum, scientific-review claim, reviewed badge, schema change, renderer change, database, accounts, dependencies, push, or deployment. Review records remain evidence with their existing limits, not automatic certification. Preserve local imports, one retained lesson session, no-WebGL, static query routes, and the one renderer/transform.

## Implementation

1. Add a small repository-owned `src/lessons/library.json` registry identifying lesson IDs, prose license, review-record path, and declared-media license records. Sources remain `src/lessons/<id>.md`. Reuse `validateLessonImport` for frozen candidates, source summary, positioned diagnostics, and media metadata. Strictly reject missing/duplicate/reserved IDs, source/registry drift, missing summary and licensing/review references. New runtime helper: `src/ui/lesson-library.js`; Node filesystem checker: `scripts/check-lessons.mjs`.
2. Feed existing `src/bootstrap.js` drawer, candidate lookup, initial route, and history from the registry instead of the hardcoded single candidate. Keep the current lesson-specific Review prediction wording. Display source/license/review links and external image host disclosure without a reviewed badge. Retain existing activation and image lifecycle.
3. Invoke the same check during Vite development/build, including standalone; expose `npm run check:lessons`. Ship registered Markdown using Vite's URL asset handling alongside existing LICENSE; review/citation links open the repository record on GitHub, avoiding an incomplete copied review with broken relative evidence links. No public geometry or release-permission changes.
4. Add focused negative and multi-entry fixture tests before implementation. Cover normal and no-WebGL entry/navigation/history/resume through existing browser harness. No additional public lessons solely for testing.
5. Update README, architecture, UI SPEC, and license inventory for landed behavior. Existing lesson prose, scientific citations, geometry, and model evidence remain unchanged; record no-impact rationale in Bead.

## Verification

- `node --test test/lesson-library.test.js test/build-config.test.js test/workspace-session.test.js test/lesson-import.test.js`
- `npm run check:lessons`
- `npm test`
- `npm run build:publish`
- Existing Chromium/Firefox Home browser suites plus focused multi-entry fixtures and persistent-browser visual proof.
- `CGO_ENABLED=0 go test ./...` for shared build compatibility.
- `git diff --check`; review task diff; one task-owned local commit; `agnt work direct-closeout brain-atlas-zmq.11 --outcome success --reason ...` only after passing gates and clean tracked tree.

## Implementation reconciliation

- Reused existing drawer styling, entry projection, shared bounded validator, and candidate activation; no new curriculum or scientific claims.
- Review evidence is linked on GitHub rather than copied into static output. Source Markdown and LICENSE remain bundled; review links need internet. This is a packaging simplification, not a claim that review is complete.
- Fresh routes for image-bearing entries require explicit drawer host disclosure; initial Atlas preparation creates no images. Current shipped lesson has none. Fixture-only browser tests cover this trust boundary.
- Focused Node checks pass (21); four Chromium library regressions pass, including multi-candidate/history/reload/resume/no-WebGL and image consent.
- Cold subscription review and fresh verifier confirmed one fallback-image regression. Browser reproduction failed before narrowing image suppression to booting Atlas, then passed. Structured evidence: `.pi/reviews/zmq11-library/findings.json`; red log `/tmp/brain-atlas-zmq11-fallback-red.log`.
- External browser harness reused without installs or app dependencies: `NODE_PATH=/Users/hays/Projects/chess-teacher/node_modules:/Users/hays/Projects/vegan-fats/node_modules`, executable `/Users/hays/Projects/chess-teacher/node_modules/.bin/playwright`, config `scripts/browser/playwright.config.cjs`, `BRAIN_ATLAS_URL=http://127.0.0.1:5180/`; set `BROWSER=chromium` with `PLAYWRIGHT_EXECUTABLE_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium`, or `BROWSER=firefox`. Production uses `PRODUCTION_PREVIEW=1` and a static preview URL. Final logs and visual proof refs belong in Bead.

## Publication limit

This Bead implements and verifies local static-library support. It does not authorize first public MVP push or claim the existing review record's pending gates have closed.
