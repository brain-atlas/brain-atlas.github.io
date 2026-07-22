# Shared Explore Surface Implementation Plan

**Issue:** `brain-atlas-zmq.7` — Add scene-controlled free-exploration pop-out
**Design:** Approved decisions `brain-atlas-zmq.7.1`, `brain-atlas-79w`, and `brain-atlas-717`; `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md` §§3.3, 4, 5, and 7
**Date:** 2026-07-22
**Branch:** `feat/shared-explore-surface`
**Status:** Implemented

**Goal:** Provide one accessible full-viewport atlas exploration surface that starts either from the active lesson view or the complete default atlas and returns to the exact authored lesson state without creating another renderer, canvas, context, transform, or filter system.

**Architecture:** A small renderer-independent `src/ui/explore-session.js` boundary derives a temporary canonical working snapshot from either the active effective lesson state plus the currently rendered camera or a versioned complete-atlas default. Existing allowlisted scene commands update that temporary snapshot; the one lesson renderer adapter applies every change. `src/bootstrap.js` owns an explicit `closed → opening → active → closing` lifecycle token, a native modal dialog, independent Explore scroll/focus-lock ownership, layout-preserving reparenting of the existing stage/viewer controls/Model & sources panel, navigation-frame cancellation, transactional rollback, and authored state/scroll/focus restoration. `src/main.js` adds only a wrapper around the existing adapter for current camera capture, explicit catalog renderer-ID mapping, panel registry projection/command dispatch, semantic keyboard camera actions, and reset-pose ownership; the renderer-independent adapter contract remains unchanged.

**Why the synchronization layer is necessary:** The legacy viewer panel currently mutates Three.js state directly while lesson visibility, hemisphere, selection, and material factors are composed through a canonical adapter. Simply enabling that panel in a full-screen shell would show stale controls, leave hidden entities at zero opacity, and let the first filter change snap the camera back to a requested rather than rendered pose. During Explore, the existing panel therefore becomes a projection/editor of the temporary canonical snapshot. This is a scoped correction at an existing boundary, not a plugin system, second renderer adapter, or speculative state framework.

**Approved interaction decisions:**
- Header **Explore atlas** opens the complete default atlas. Stage **Explore this scene** starts from the active effective filters/playback/selection and the exact currently rendered camera, including an interrupted transition or permitted Lesson-mode orbit.
- Explicit stage-local Explore grants full orbit, zoom, pan, filter, cutaway, tissue, playback, view-preset, and semantic keyboard camera controls on every scene. Authored `guided`/`look` remains authoritative only in Lesson mode.
- Both entry points use one native full-viewport dialog and the existing stage/canvas/context. **Return to lesson** stays persistent; Escape has identical semantics.
- Return does not save Explore changes. It force-reapplies the immutable authored scene through the current controller, restores the exact `#page-scroll` position, and returns focus to the invoking Explore action.
- The global default is versioned project state: `home` camera, every base-catalog entity except `layer.labels`, bilateral hemispheres, no cutaway, tissue opacity `0.16`, activity requested at speed `70`, no selection/emphasis, atlas visual, and full Explore controls. Auto-rotate starts off. Reduced motion settles requested activity without changing the canonical default.
- **Model & sources** remains available inside Explore and follows visible entities, unioned with current scene fidelity records for stage-local entry. Inside the outer modal it is a nonmodal panel/sheet owned by the same focus scope—not a nested `aria-modal` that inerts the Explore dialog. The first Escape closes an open disclosure; a subsequent Escape returns to the lesson. It never becomes a duplicate badge or status row.
- Auto-rotate is not part of canonical scene state or the approved control list. It stays off and is hidden/disabled inside Explore rather than becoming an undocumented ephemeral axis.
- No-WebGL and renderer-failure paths hide renderer-only Explore actions and retain the existing readable lesson/disclosure path.

**Rejected approaches:**
1. **CSS-only fixed stage with background content still active:** smallest DOM delta, but weak focus/inert semantics and fragile compact behavior.
2. **Native dialog plus direct legacy mutations:** accessible shell, but stale panel state, zero-opacity/material-factor leakage, and camera snapping violate exact working-state behavior.
3. **Second Explore renderer/filter UI:** duplicates the project’s core state and WebGL path and is prohibited.

**Acceptance Criteria:**
- [x] Header **Explore atlas** and stage **Explore this scene** appear only after renderer readiness; fallback paths expose no unusable renderer actions.
- [x] Both actions open one native full-viewport dialog containing the existing stage/canvas, viewer controls, and accessible Model & sources surface; one canvas/context remains throughout repeated entry/return.
- [x] Stage-local entry preserves the exact rendered camera/target at invocation, even during an authored transition or after Lesson-mode `look` orbiting, while retaining the active effective filters, hemispheres, cutaway, tissue, playback, and emphasis.
- [x] Global entry always applies the versioned complete-atlas default independently of the current checked-in or imported lesson.
- [x] Explicit Explore grants full controls on every authored policy without changing the lesson snapshot or weakening normal Lesson-mode guided/look behavior.
- [x] The existing viewer panel accurately projects the Explore working snapshot; entity, hemisphere, layer, playback, speed, cutaway, and tissue changes update the temporary canonical snapshot through allowlisted commands and the same adapter.
- [x] A pointer-or-keyboard camera change survives the next filter/material/playback command without snapping because the actual rendered camera is synchronized first.
- [x] Keyboard-operable Zoom in/out and Pan left/right/up/down actions accompany pointer/touch OrbitControls; Reset returns to the entry pose; all new actions expose at least 44 px targets.
- [x] One-finger touch remains lesson scrolling outside Explore and becomes camera interaction only after explicit Explore entry; page/root scrolling is locked while the dialog is active.
- [x] Native focus containment, persistent Return, Escape, and explicit Return restore the invoking action, exact lesson-surface scroll position, active scene identity, and authored snapshot; Explore and compact-disclosure locks cannot release one another.
- [x] Reduced-motion entry/changes keep camera changes instant, activity settled, Play disabled, auto-rotate off, and Return deterministic.
- [x] Imported lessons use the same local/global Explore lifecycle and runtime catalog without reloading Three.js; instant Explore entry resolves any active camera/visibility transition to the imported Explore destination so prior lesson entities cannot leak into the Explore surface.
- [x] Model & sources remains truthful as filters change and uses only curated records; lifecycle Draft remains separate from geometry/activity fidelity.
- [x] Wide, compact, 200%-equivalent, short-viewport, keyboard, touch, repeated-open, resize, no-WebGL, renderer/adapter-failure, and production-static paths have no horizontal overflow, focus loss, stale modal/scroll state, canvas stretch, or console errors.
- [x] Pending scroll animation frames, explicit navigation, page-key bridging, import activation, and authored reduced-motion presentation updates cannot mutate the lesson or renderer while Explore owns the surface.
- [x] Lesson schema, anatomy, datasets, one MNI transform, activity models, scientific claims, and import security policy remain unchanged.
- [x] README, architecture, contributor invariants, UI SPEC, user guidance, roadmap, and this plan describe only landed behavior; security/data/license/citation/no-third-party-impact rationale is recorded.

**Verification Commands:**
```bash
node --test test/explore-session.test.js test/lesson-scene-controller.test.js \
  test/renderer-adapter.test.js test/scene-state.test.js test/scene-commands.test.js
npm test
npm run generate:lesson-validators && git diff --exit-code -- src/lesson/generated-validators.js
npm run build:publish
npm audit --omit=dev
npm audit
git diff --check
```

---

### Task 1: Define the pure Explore snapshot boundary [Independent]

**Context:** Keep entry derivation, versioned global defaults, command updates, camera synchronization, immutability, and renderer-panel projection testable without DOM or Three.js. Reuse `normalizeSceneSnapshot`, `normalizeCanonicalSnapshot`, and `applySceneCommand`; do not create a second scene-state shape.

**Files:**
- Create: `src/ui/explore-session.js`
- Create: `test/explore-session.test.js`
- Modify later in Task 5: `src/ui/SPEC.md`

**Steps:**
1. Add red tests for scene-local derivation from a rendered camera, complete-atlas default derivation, nonmutation/deep freezing, reduced-motion-neutral requested playback, batch allowlisted commands, camera synchronization before noncamera commands, visible-entity fidelity derivation, and unknown-command/reference rejection.
2. Run the focused test and confirm expected failures because the module/API does not exist.
3. Implement minimal APIs such as `createSceneExploreSnapshot`, `createAtlasExploreSnapshot`, `applyExploreCommands`, and `exploreFidelityIds` using existing canonical validators/commands.
4. Verify that stage-local derivation forces `visual: atlas`, instant rendered camera, and `controlPolicy: explore` while preserving every other effective axis.
5. Run focused scene-state/command regressions.

**Focused verification:**
```bash
node --test test/explore-session.test.js test/scene-state.test.js test/scene-commands.test.js
```

**Expected result:** Explore working state is complete, immutable, catalog-validated canonical data; no DOM, renderer object, Set, function, or second transform enters it.

---

### Task 2: Add the renderer camera/panel bridge [Depends on: Task 1]

**Context:** The same renderer adapter remains the only canonical snapshot-to-Three.js port. Add narrow Explore methods to its returned object rather than another adapter: capture the actual camera pose; register/unregister one temporary command callback; project a working snapshot into the existing panel; own entry/reset camera pose; and expose semantic camera actions. Legacy direct handlers remain available only outside Explore and remain disabled in Lesson mode.

**Files:**
- Modify: `src/main.js`
- Modify: `index.html` for semantic camera buttons in the retained viewer panel
- Test: `test/explore-session.test.js` for panel projection data; temporary browser instrumentation for concrete Three.js behavior

**Steps:**
1. Add red browser checks proving the current panel is disabled/stale for lesson filters and no semantic zoom/pan actions exist.
2. Refactor panel construction so initial legacy defaults and later snapshot projection are separate; retain stable catalog entity IDs when dispatching Explore commands.
3. Build an explicit renderer-binding→stable-entity map from the active runtime catalog and a registered panel-control registry. Route layer/hemisphere/playback/speed/cutaway/tissue inputs to the registered Explore command callback when active; preserve current direct behavior otherwise. Respect bilateral capability and the independent global hemisphere master.
4. Return a `main.js` wrapper around the existing frozen `{ apply, capture }` renderer-independent adapter; do not change `src/lesson/renderer-adapter.js`. The wrapper adds narrowly named Explore bridge methods. `capture()` remains logical requested-state capture; a separate method returns actual `camera.position`/`controls.target`.
5. Synchronize panel checkboxes/pills/sliders/buttons from each applied working snapshot, including hidden entities and per-entity hemispheres, without bypassing visibility/selection material composition.
6. Add keyboard buttons for zoom/pan and an Explore reset pose; keep auto-rotate off at entry and under reduced motion, and hide/disable its legacy control while Explore owns the viewer.
7. Require one atomic Explore dispatcher: before every noncamera command or batch, capture the current rendered camera/target, merge it into the working snapshot, apply all allowlisted commands, then call the adapter once and reproject the panel/fidelity state.
8. Verify an in-flight camera/visibility transition is cancelled into its current rendered sample and pointer orbit/zoom/pan followed by every noncamera axis never snaps the camera.

**Focused verification:**
```bash
node --test test/explore-session.test.js test/renderer-adapter.test.js \
  test/camera-transition.test.js test/visibility-transition.test.js
```

**Expected result:** The retained panel is a truthful temporary canonical editor during Explore and no renderer/filter path is duplicated.

---

### Task 3: Build the native full-viewport lifecycle [Depends on: Tasks 1–2]

**Context:** Bootstrap owns UI lifecycle and lesson restoration. Use a native `<dialog>` and layout-preserving placeholders to move the existing `.stage-shell`, `#viewer-console`, and `#fidelity-panel` into one top-layer surface, then restore their exact DOM homes. Do not create another canvas/window or synthesize legacy click events.

**Files:**
- Modify: `index.html`
- Modify: `src/bootstrap.js`
- Modify: `src/style.css`
- Test: temporary Firefox/Chromium interaction scripts plus pure tests from Tasks 1–2

**Steps:**
1. Add red browser checks for absent global/local entry actions and absent Explore dialog.
2. Add header **Explore atlas**, stage **Explore this scene**, persistent **Return to lesson**, Explore mode identity/help text, native dialog mount, and responsive viewer-control treatment.
3. Keep entry actions hidden until renderer readiness. Close Model & sources before entry, set the Explore lifecycle token before moving nodes, cancel any pending lesson scroll animation frame and delayed focus-settlement timer/listener, stop native smooth scrolling at the current surface position, save source lesson/scene/authored snapshot/scroll/trigger, acquire an Explore-owned surface lock, create layout-preserving placeholders, move existing nodes, show the modal, and focus Return.
4. For local entry, derive from `rendererAdapter.capture()` plus actual rendered camera. For global entry, derive the versioned default from the base catalog. Apply through the same adapter, register panel commands, show atlas, and render visible-entity fidelity.
5. Refactor delayed scene-focus settlement to expose one cancellation path, then guard `onScroll`, explicit Previous/Next, brand/skip-link movement, page-key bridging, import activation, and authored presentation updates while the lifecycle token is not `closed`. Intercept native `cancel` and explicit Return through one idempotent exit function. If Model & sources is open, Escape closes only that nonmodal inner panel first.
6. On exit, unregister Explore commands/ephemera, close disclosure without releasing the Explore lock, restore DOM nodes, force-reapply the immutable active authored scene through the controller, release only the Explore-owned lock, restore exact surface scroll, and return focus to the invoker.
7. Guard live reduced-motion changes with the lifecycle token so the lesson controller and `updateActivePresentation` cannot overwrite active Explore; let the renderer settle/restore requested Explore playback and synchronize the working panel, then resume ordinary controller synchronization on return.
8. Make entry, command application, and exit transactional. On any adapter/renderer exception, unregister callbacks, close the dialog, restore all moved nodes/placeholders, release only owned locks, restore focus, and transition to the existing readable fallback. Inject adapter failures at entry, command, and Return in browser tests.
9. Opening local/global Explore uses an instant canonical snapshot, which cancels active camera/visibility transitions into the selected destination state; verify imported cross-lesson entry cannot show prior entities.

**Focused verification:**
```bash
node --test test/explore-session.test.js test/lesson-scene-controller.test.js \
  test/scene-navigation.test.js test/scroll-surface.test.js
```

**Expected result:** Explore/Return is deterministic, accessible, imported-lesson-safe, and preserves one mounted renderer/context.

---

### Task 4: Validate responsive composition and input parity [Depends on: Task 3]

**Context:** Full-viewport Explore changes the active camera gesture contract and relocates existing responsive surfaces. Verify actual browser geometry rather than relying only on CSS inspection.

**Files:**
- Modify if needed: `src/style.css`, `src/bootstrap.js`, `src/main.js`
- Test: temporary browser scripts under `/tmp/brain-atlas-firefox-tests` or a fresh temporary equivalent

**Steps:**
1. In Firefox and Chromium, verify local/global entry, current-camera handoff, canonical panel state, every panel axis, semantic zoom/pan/reset, Return and Escape, repeated entry, focus cycle, scroll lock, renderer/canvas count, and exact return serialization.
2. Verify wide sidebar, compact collapsed/bottom controls, 800×450 200%-equivalent, 320×568 short viewport, dynamic resize across the compact breakpoint, and no horizontal overflow.
3. Verify pointer orbit/wheel zoom/touch dolly-pan only in Explore; normal lesson one-finger canvas swipe still scrolls without moving the camera.
4. Verify reduced motion before entry and live preference changes, including Play truth, settled activity, no auto-rotate, and instant return.
5. Verify imported lessons, supplementary-image scenes, import-during-renderer-loading, no-WebGL, renderer-import failure, adapter failure, and production preview.
6. Capture representative wide/compact screenshots and save exact scripts/results under ignored `.pi/reviews/shared-explore/` for local replay. Perform human visual review for anatomy area, persistent Return, panel readability, and stage aspect. The checked-in reusable browser harness remains owned by `brain-atlas-zmq.9`; do not add Playwright or a second test dependency in this feature solely to formalize existing headed checks.

**Focused verification:**
```bash
npm test
npm run build:publish
```

**Expected result:** Both engines preserve usable anatomy, controls, semantics, and lesson return across the required matrix.

---

### Task 5: Synchronize specs, documentation, review, and closeout [Depends on: Tasks 1–4]

**Context:** This feature changes user-visible mode navigation, runtime ownership, input semantics, panel state flow, and failure behavior, but not scientific assets/models or the publication gate.

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `src/ui/SPEC.md`
- Modify: `skills/user.md`
- Modify: `.pi/plans/brain-atlas-zmq-ux-requirements-roadmap.md`
- Modify: this plan
- Review: `docs/SECURITY_REVIEW.md`, `DATA_LICENSES.md`, `THIRD_PARTY_NOTICES.md`, `CITATION.cff`, `src/lesson/SPEC.md`, and scientific traceability for impact

**Steps:**
1. Document two-entry semantics, explicit full-control elevation, one-dialog/one-canvas lifecycle, canonical temporary state, semantic camera controls, dynamic fidelity, and exact return.
2. Add UI subsystem invariants/failure modes for one Explore working snapshot, rendered-camera handoff, controlled panel projection, modal/focus/scroll lifecycle, and reduced/fallback behavior; mark tests with the new IDs.
3. Record no-impact rationale for lesson schema, datasets, transforms, activity/scientific claims, citations/licenses/notices, dependencies, security boundary, and release metadata unless implementation evidence proves otherwise.
4. Run code simplification, model-diverse behavioral/boundary/UI review, and fresh subscription-backed verification of every material finding.
5. Run all final commands and browser matrices; mark this plan Implemented and the roadmap criterion complete only after evidence passes.
6. Append verification/doc/review evidence to `brain-atlas-zmq.7`, create a signed local commit, close the Bead, and request approval for local-only `main` fast-forward/branch cleanup. Do not push, create a PR, deploy, delete `codex/lesson-pedagogy`, delete `/private/tmp/brain-atlas-lesson-review`, or remove the unrelated `brain-atlas-zmq.22` Draft concept.

## File Conflicts

| File | Tasks | Resolution |
|---|---|---|
| `src/main.js` | 2, 4 | Task 4 only applies focused fixes after the Task 2 bridge exists. |
| `index.html` / `src/style.css` | 2, 3, 4 | Add panel controls first, then dialog shell, then responsive corrections serially. |
| `src/bootstrap.js` | 3, 4 | Browser corrections depend on the complete lifecycle. |
| `src/ui/SPEC.md` | 1, 5 | Define tests first; synchronize final IDs and failure evidence after implementation. |

## Implementation Record

Implemented on `feat/shared-explore-surface` on 2026-07-22.

- `src/ui/explore-session.js` supplies the frozen scene/global working snapshots,
  actual-camera-first command batching, stable panel projection, and visible-entity
  fidelity aggregation. `src/main.js` retains one renderer adapter and adds only the
  scoped camera/panel bridge.
- `src/bootstrap.js` owns the native dialog lifecycle, node reparenting, independently
  owned page lock, navigation/focus cancellation, transactional fallback, imported and
  live-reduced-motion guards, and exact authored scene/scroll/focus restoration.
- The retained Viewer controls now edit every canonical Explore axis. Wide canvas/sidebar
  and compact canvas/drawer layouts reuse one stage and preserve exact camera aspect.
  Semantic Zoom/Pan/Reset, pointer orbit, and real Chromium touch input were verified.
- `test/explore-session.test.js` passed with the full 118/118 Node suite. Generated
  validator drift, `npm run build:publish`, production/static-hook checks, full and
  production audits, and `git diff --check` passed. The Three.js chunk remains
  646.51 kB.
- The checked-in browser matrix passed 9/9 applicable cases plus one expected
  Chromium-only touch skip in headed Firefox, and 10/10 in headed Chromium. A separate
  production-preview matrix passed 2/2 in each browser. Coverage includes every panel
  axis, camera no-snap, exact Return/Escape, repeated one-canvas cycles, native dialog
  naming/focus, 320 px and short-wide layouts, live reduced motion, imported lessons,
  actual touch policy, transactional rollback, no-WebGL, renderer import failure, and
  absence of production debug hooks.
- Gemma 4 31B behavioral and dedicated UX/UI review plus DeepSeek V4 Flash adversarial
  review produced four unique hypotheses. Fresh subscription-backed GPT-5.6 verification
  refuted all four against source, specification, and executable browser evidence; zero
  findings remain confirmed or unresolved. Kimi K2.7 Code returned no usable output.
- The low-risk simplification pass removed one redundant capture and one duplicate Explore
  cleanup call; focused tests and build passed afterward. No structural refactor was
  warranted.
- README, architecture, AGENTS, UI SPEC, user guidance, roadmap, and replayable browser
  instructions are synchronized. The feature changes no lesson schema, scientific data,
  coordinate transform, anatomy, activity model, scientific claim, import trust boundary,
  dependency, license, notice, citation, or release metadata. Therefore
  `docs/SECURITY_REVIEW.md`, `DATA_LICENSES.md`, `THIRD_PARTY_NOTICES.md`, `CITATION.cff`,
  `src/lesson/SPEC.md`, and scientific traceability require no content change.
- The signed commit and Bead closeout are recorded separately after this implementation
  record; no remote push, PR, or deployment is part of this work.

## Non-goals

- No second renderer, canvas, WebGL context, browser window, iframe, worker renderer, coordinate transform, or alternative filtering engine.
- No browser Fullscreen API permission flow; “full viewport” means one native modal surface inside the static app.
- No persistence, named views, history/URL routing, Home shell, library, or localStorage (`brain-atlas-zmq.18`, `.24`, `.11`).
- No change to the already shipped local-import activation transition itself; this feature guarantees that entering Explore from an imported lesson resolves to the imported Explore destination without prior-lesson leakage.
- No entity hit-testing, responsive 3D labels, cited entity inspector, or endpoint filtering (`brain-atlas-zmq.8`, `.20`, `.21`).
- No lesson schema field or authored per-axis Explore permissions in v1; explicit entry grants full temporary controls by `brain-atlas-79w`.
- No new animation system, Auto-rotate state axis, scientific data/model, camera fitting, anatomy, activity semantics, or provenance claim.
- No remote push, PR, or deployment before `brain-atlas-zmq.26` and the P0 provenance gate.

## Execution Handoff

Implementation and verification are complete. Record the signed commit and Bead closeout,
then request the separately gated local `main` integration; do not push or deploy.
