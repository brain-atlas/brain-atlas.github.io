# Viewer reconciliation implementation plan

**Issue:** brain-atlas-s4q — Reconcile viewer effects and retain lesson UI state
**Status:** Approved for implementation by user's explicit request, recorded in brain-atlas-s4q on 2026-09-06.
**Design:** Astra architecture review in owning Bead/session; bounded design below.
**Date:** 2026-09-06
**Branch:** main

## Goal and boundary

Implement all five reviewed improvements without another renderer, transform, filter system, dependency, or persistent snapshot axis. Complete canonical validation/capture stays authoritative. Scientific models/assets, import trust boundaries, no-WebGL, history, focus/scroll, reduced motion and image activation semantics remain intact. Existing unrelated package-lock.json diff must remain unchanged (diff SHA256 68439f78985aa794e6f006356f5e52ddfda76418f79fe6f14d94744d2a74e6b4).

## Ordered work

1. **Filter invalidation** (`src/main.js`, browser regression): separate opacity/hemisphere visibility application from query calculation. Compare final query/global hemisphere inputs; only changed inputs rescan. Newly loaded tract/SWM geometry consumes existing masks without rescanning unchanged queries. Preserve activity masks and source ordering.
2. **Snapshot reconciliation and replay** (`src/main.js`, `src/ui/lesson-scene-controller.js`, adapter/controller tests): complete snapshots still pass the same adapter. Concrete binding effects skip unchanged inputs where safe; actual camera remains independently restored. Explicit scene activation/Restart is distinct from ordinary synchronization; unrelated edits and speed/Pause/Play preserve clocks. Panel projection becomes DOM-only and event handlers derive canonical state rather than relying on visibility-projected maps.
3. **Retained resume** (`src/bootstrap.js`, controller and browser tests): same-candidate Return/drawer Resume/history reuse retained lesson DOM/controller/adapter; restore token once with current motion preference. Replacement/Start over still fully activate. Preserve image lifecycle, focus, epoch, failure and no-WebGL paths.
4. **Fidelity retention** (`src/bootstrap.js`, browser tests): key Atlas disclosure by actual catalog/entity/fidelity/context inputs, skip unchanged content, independently reconcile inspector availability. Lesson projection invalidates Atlas key. Preserve native details state for unrelated edits; refresh empty state and changed subjects.
5. **Hover coalescing** (`src/main.js`, browser tests): retain latest coordinates with at most one pending frame; activation remains immediate; cancel pending hover on leave, down/cancel, catalog/handler change and visibility suspension. Do not create continuous idle frames.

All tasks touching main/bootstrap run serially. Prefer local functions and existing diagnostics; no framework, general cache, or size-only extraction. Tests precede each production change and must fail for missing behavior, then pass.

## Acceptance and verification

- No filter rescans/buffer rewrites on opacity-only frames or unrelated edits; one calculation for changed query/global hemispheres; lazy arrivals receive masks.
- Unrelated controls do not reset playing activity; explicit activation/Restart/Skip and reduced motion retain intended semantics.
- Same lesson resume preserves scene-node/controller/adapter identities, exact token state, scroll/focus and image/no-WebGL behavior; applies resume once.
- Unrelated edits retain disclosure nodes/open state; changed visibility refreshes record subjects.
- Pointer bursts pick once per frame; cancellation prevents stale preview; immediate clicks/taps still work.
- Existing suites and clean-console visual smoke pass; speedup not quantified without new timing evidence.

Commands (external existing Playwright harness; no app dependency added):

```bash
node --test test/renderer-adapter.test.js test/lesson-scene-controller.test.js test/fibre-endpoint-filter.test.js test/visibility-transition.test.js test/workspace-session.test.js test/explore-session.test.js
NODE_PATH=/Users/hays/Projects/vegan-fats/node_modules BRAIN_ATLAS_URL=http://127.0.0.1:5180/ BROWSER=chromium PLAYWRIGHT_EXECUTABLE_PATH=/Applications/Chromium.app/Contents/MacOS/Chromium /Users/hays/Projects/vegan-fats/node_modules/.bin/playwright test --config=scripts/browser/playwright.config.cjs
npm test
npm run build:publish
```

Run focused new regression and relevant existing browser suites first, then broad verification and production-hook checks. Browser proof via persistent browser tool after implementation. Read-only Astra final review; resolve concrete findings before commit.

## Documentation and closeout

Update docs/ARCHITECTURE.md, docs/PERFORMANCE.md, src/ui/SPEC.md, and any changed renderer interface contract. README only for observable control/resume behavior. No new scientific claims, asset derivations, licenses, dependencies or notices; record no-impact rationale in Bead. Mark plan Implemented only after verification. Stage/commit task-owned files only; do not push. Standard direct-closeout may block on unrelated lockfile edit: preserve it and report/request handling rather than stash, discard, or commit it without authority.
