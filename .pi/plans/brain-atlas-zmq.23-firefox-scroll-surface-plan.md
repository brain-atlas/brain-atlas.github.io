# Firefox Lesson Scroll Surface Implementation Plan

**Issue:** `brain-atlas-zmq.23` — Fix Firefox lesson scroll jitter and scrollbar behavior
**Design:** Approved decision `brain-atlas-rsz`
**Date:** 2026-07-21
**Branch:** `fix/firefox-scroll-surface`
**Status:** Implemented

**Goal:** Prevent Firefox/macOS from displacing the root-rendered pane at the first scroll by making one explicit, vertically scrollable lesson surface below the fixed header.

**Architecture:** `html` and `body` remain viewport-sized and do not scroll. A named, focusable `#page-scroll` region inside `#app` owns the lesson layout, viewer console, footer, native vertical scrollbar, and all scene-navigation scroll coordinates. The fixed topbar remains outside that surface. The 3D stage remains the same single sticky stage inside the explicit surface, but its offsets become surface-relative; renderer, lesson, scene, and fidelity contracts do not change.

**Evidence:** Headed and headless Firefox showed no ordinary DOM overflow (`scrollWidth === clientWidth`, `scrollX === 0`, invariant measured header/stage rectangles), despite the user-observed one-character visual root displacement. An untracked headed-Firefox prototype with the explicit surface kept `window.scrollX/Y === 0`, kept root dimensions equal to the viewport, ignored horizontal wheel travel, preserved fixed header/stage rectangles, and scrolled only the surface by wheel or focused PageDown. The prototype also showed that a nested scroller needs an explicit keyboard contract rather than relying on the unfocused browser root.

**Approved implementation amendments:** During visual verification the user confirmed the Firefox displacement appeared fixed and requested four scoped corrections recorded on `brain-atlas-zmq.23`: preserve a 20 px stage-to-controls gutter in 601–950 px-tall wide windows; remove redundant in-canvas provenance plus Geometry/Activity/“Scene synchronized” chrome because **Model & sources** is authoritative; remove the redundant global progress strip because scene identity already appears in the stage; and verify/correct displayed brain aspect. The aspect audit found a 0.20% half-pixel projection mismatch at a 200%-equivalent `800×450` viewport, so camera aspect now follows the exact CSS rectangle while all model/MNI scales remain uniform.

**Acceptance Criteria:**
- [x] `html`/`body` remain fixed to the visual viewport; `window.scrollX` and `window.scrollY` remain zero during wheel, touch, explicit navigation, and keyboard scrolling.
- [x] `#page-scroll` is a named, focusable region with a native vertical scrollbar, `overflow-x: hidden`, zero horizontal travel, and no custom scrollbar replacement.
- [x] The topbar remains fixed outside the scroll surface; its and the stage shell's rendered rectangles remain invariant through the first 0–20 px of surface scrolling in Firefox and Chromium.
- [x] Wide, compact, short, and 200%-equivalent layouts retain the authored header/stage positions and no horizontal overflow.
- [x] Scene hysteresis uses anchor positions relative to the surface viewport and surface `scrollTop`; the entry scene and all four instructional scenes activate as before.
- [x] Previous/Next and skip-link navigation scroll the surface, preserve compact sticky-stage clearance, focus the intended heading, and retain reduced-motion semantics.
- [x] PageDown, PageUp, Home, End, and Space remain usable when focus is inside the surface and from noninteractive shell/header context; interactive controls and modifier shortcuts are not hijacked.
- [x] One-finger compact canvas gestures scroll the surface without rotating the camera.
- [x] Compact Model & sources mode locks and restores the surface scroll position, keeps the background inert, contains focus, and remains correct when crossing the 700 px breakpoint.
- [x] No-WebGL and renderer-import-failure paths use the same surface and retain all lesson/fidelity content.
- [x] Short-wide layouts preserve the full model shell and at least a 20 px gutter before following controls/footer content.
- [x] Camera aspect equals the stage CSS aspect, projected screen-axis radii match, all sampled world scales are uniform, and the sole MNI transform retains determinant `+1`.
- [x] Geometry/activity/source detail exists in **Model & sources** without duplicate canvas badges, persistent stage rows, or global progress/status strips.
- [x] Documentation identifies `#page-scroll` as the sole lesson scroll surface and preserves the native-scrollbar accessibility decision.
- [x] No scientific data, scene snapshots, renderer state, sources, licenses, transforms, or public deployment state change.

**Implementation record:** The approved surface, surface-relative navigation, fixed-shell keyboard bridge, compact disclosure lock, true Home/skip anchors, responsive short-wide gutter, exact CSS camera aspect, and simplified fidelity/status chrome were implemented together. Fresh verification passed 102/102 Node tests, publication build, deterministic validators, both audits, Firefox (19 browser checks), Chromium (2 browser checks including touch), production-hook checks, documentation links, and diff hygiene. Independent Gemma and subscription GPT reviews passed; one DeepSeek Find-in-Page hypothesis was refuted against Firefox/Chromium source behavior by a fresh GPT verifier. Commit and Bead closeout remain the subsequent recorded evidence.

**Verification Commands:**
```bash
node --test test/scroll-surface.test.js test/scene-navigation.test.js test/lesson-scene-controller.test.js
npm test
npm run build:publish
npm audit --omit=dev
npm audit
npm run generate:lesson-validators && git diff --exit-code -- src/lesson/generated-validators.js
git diff --check
```

---

### Task 1: Define surface coordinate and keyboard contracts [Independent]

**Context:** Keep scroll-coordinate math and keyboard intent renderer-independent and directly testable. Do not generalize into a plugin or multiple-scroll-container abstraction; this app has one lesson surface.

**Files:**
- Create: `src/ui/scroll-surface.js`
- Create: `test/scroll-surface.test.js`
- Modify: `src/ui/SPEC.md`

**Steps:**
1. Add failing tests for surface-relative anchor positions, explicit target-scroll calculation, clamping, PageDown/PageUp/Home/End/Space intent, Shift+Space reversal, modifier rejection, and interactive-target rejection.
2. Run the focused test and record the expected RED result.
3. Implement the smallest pure functions needed by `src/bootstrap.js`.
4. Document the one-surface invariant and keyboard boundary.

**Focused verification:**
```bash
node --test test/scroll-surface.test.js test/scene-navigation.test.js
```

**Expected result:** Pure surface math and keyboard intent pass without DOM, renderer, or browser globals.

### Task 2: Add the explicit lesson surface [Depends on: Task 1]

**Context:** Move only the existing lesson layout, viewer console, and footer into `#page-scroll`; leave the fixed topbar in `#app` and fidelity panel outside `#app`.

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`

**Steps:**
1. Add `#page-scroll` with an accessible name and keyboard focusability.
2. Lock `html`/`body`; size `#app` to the dynamic viewport; give `#page-scroll` the remaining below-header block size.
3. Preserve a native vertical scrollbar and suppress only horizontal overflow/travel.
4. Convert stage sticky offsets and compact bottom padding to the new surface coordinate system.
5. Preserve the `max-height: 600px` nonsticky stage fallback.

**Focused verification:**
```bash
npm run build
```

**Expected result:** Markup remains semantic and the production build succeeds; no renderer or lesson data changes.

### Task 3: Route navigation and modal locking [Depends on: Tasks 1–2]

**Context:** Every prior use of global `scrollY`, `scrollTo`, global `scroll`/`scrollend`, and root overflow locking must target `#page-scroll` without changing pure scene hysteresis semantics.

**Files:**
- Modify: `src/bootstrap.js`
- Test: `test/scroll-surface.test.js`

**Steps:**
1. Normalize scene-card tops against the surface top and use `scrollTop`/`clientHeight`.
2. Route explicit Previous/Next, intro/skip navigation, scroll settlement, and scene detection through the surface.
3. Bridge standard page-scroll keys only when the browser has no scrollable focused ancestor; do not intercept form controls, buttons, contenteditable targets, modified shortcuts, or modal focus.
4. Lock and restore the surface—not `html/body`—for compact disclosure; retain inert background and breakpoint transitions.
5. Keep reduced-motion instant focus/scroll behavior unchanged.

**Focused verification:**
```bash
node --test test/scroll-surface.test.js test/scene-navigation.test.js test/lesson-scene-controller.test.js
```

**Expected result:** Unit contracts pass and `rg -n "\bscrollY\b|\bscrollTo\(" src/bootstrap.js` finds no accidental global scrolling.

### Task 4: Verify Firefox, Chromium, accessibility, and fallbacks [Depends on: Task 3]

**Context:** The defect is visual/browser-specific, so browser evidence is required in addition to Node tests. Temporary Playwright scripts may live under `/tmp`; do not add a browser dependency or generated test artifacts to the repository under this Bead.

**Files:**
- Modify if defects are found: `src/bootstrap.js`, `src/main.js`, `src/style.css`, `index.html`, `test/scroll-surface.test.js`

**Steps:**
1. Run headed Firefox and Chromium at 1440×1000, 980/981 breakpoints, 700/701 breakpoints, 390×844, 320×568, short landscape, and 200%-equivalent CSS widths.
2. Assert root scroll remains zero, surface horizontal scroll remains zero, surface width equals its scroll width, and header/stage rectangles do not move at the first scroll.
3. Exercise wheel, diagonal wheel, touch pan-y, focusable region, skip link, PageDown/PageUp/Home/End/Space, Previous/Next, scene hysteresis, and heading focus clearance.
4. Exercise compact disclosure open/close, wide↔compact resize, scroll restoration, reduced-motion toggling, no-WebGL, and renderer-import failure.
5. Capture screenshots for wide/compact review and confirm console errors are empty.

**Focused verification:**
```bash
npm test
npm run build:publish
```

**Expected result:** Cross-browser behavior meets every acceptance criterion with no horizontal/root movement or accessibility regression.

### Task 5: Synchronize docs, review, and close [Depends on: Task 4]

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `skills/user.md`
- Modify: `src/ui/SPEC.md`
- Modify: `.pi/plans/brain-atlas-zmq-ux-requirements-roadmap.md`
- Modify: `.pi/plans/brain-atlas-zmq.23-firefox-scroll-surface-plan.md`

**Steps:**
1. Document the explicit scroll surface, keyboard/touch behavior, native-scrollbar decision, and browser verification procedure.
2. Mark this plan Implemented only after fresh verification.
3. Run a model-diverse independent review focused on Firefox layout, keyboard/touch accessibility, modal scroll locking, navigation math, no-WebGL, and unnecessary abstraction.
4. Correct confirmed findings and rerun affected checks.
5. Commit with SSH signing, verify the signature, close `brain-atlas-zmq.23`, and request separate approval before any local-main merge or branch deletion. Do not push.

**Focused verification:**
```bash
npm test
npm run build:publish
npm audit --omit=dev
npm audit
git diff --check
```

**Expected result:** Signed local commit, closed Bead with evidence, clean owned diff, unchanged `origin/main`, and unrelated `.pi/plans/brain-atlas-zmq.22-behavior-driven-white-matter-activity-concept.md` untouched.

## File Conflicts

| File | Tasks | Resolution |
|---|---|---|
| `src/bootstrap.js` | Tasks 3–4 | Task 4 may only correct browser findings after Task 3. |
| `src/style.css` | Tasks 2, 4 | Task 4 validates and may refine the approved surface styles. |
| `src/ui/SPEC.md` | Tasks 1, 5 | Task 1 records contract changes; Task 5 synchronizes final verified behavior. |
| `test/scroll-surface.test.js` | Tasks 1, 3–4 | Later tasks extend only confirmed integration boundaries. |

## Execution Handoff

Plan saved to: `.pi/plans/brain-atlas-zmq.23-firefox-scroll-surface-plan.md` (verify with `test -f`).
Recommended next skill: `test-driven-development`; use `verification-before-completion` before claiming completion.
