# Lesson-Derived Atlas Handoff and Exit Implementation Plan

**Issue:** `brain-atlas-zmq.28` — Refine lesson-derived Atlas handoff and exit
**Design:** Approval `brain-atlas-ai4` recorded on `brain-atlas-zmq.28`
**Date:** 2026-07-22
**Branch:** `fix/lesson-atlas-handoff`
**Status:** Implemented
**Approval:** `brain-atlas-ai4`; UX and state/history plan reviews passed on 2026-07-22

**Goal:** Make every active-Lesson → Atlas handoff preserve the actual lesson camera and complete canonical filters, replace the dominant Return banner with a compact session control, and add a deliberate Exit lesson path that ends resume state and resets the complete default Atlas.

**Architecture:** Keep `src/bootstrap.js` as the sole Atlas/Lesson workspace and history owner. Reuse the existing temporary scene-derived canonical branch for every lesson-origin Atlas transition rather than introducing another snapshot type, renderer adapter, or canvas. Add a small bootstrap-owned lesson-session closeout path that clears the resume/session maps, promotes the existing Atlas shell to Home, and applies `createAtlasExploreSnapshot(catalog)` through the existing renderer; the pure lesson, renderer, scientific, and persistence contracts do not change.

**Approved interaction model:**

- `Back to atlas`, the brand/home link, stage `Explore this scene`, and browser restoration from an active Lesson all enter one lesson-derived Atlas branch. The branch starts from the actual rendered camera and the complete current canonical lesson snapshot, with full Atlas controls.
- The stage and global triggers remain equivalent entry points for discoverability; they do not create different state semantics.
- Atlas shows one compact session group with visible labels **Return to lesson** and **Exit lesson**. The Return control retains lesson title/position in its accessible name and tooltip, not in its visible label. Neither action is a persistent solid accent block.
- Return remains exact: source, scene, lesson scroll, selected visual, actual camera/target, canonical filters, requested playback, and reciprocal focus are restored from the immutable token.
- Exit clears the resumable lesson/session and inspection branches, removes both session controls, replaces the current History intent with Atlas, and applies the project-authored complete default Atlas with responsive camera fit. Checked lessons remain startable from Lessons without resume. Local lessons require a focused confirmation because exit removes the only in-app session/candidate.
- Checked confirmation is unnecessary; **Exit lesson** is already an explicit high-intent action. Local copy is: “Exit local lesson? This lesson and your place are not saved.” Actions are **Keep lesson** and **Exit lesson**.
- Focus moves to Return on lesson-derived Atlas entry, back to `#back-to-atlas` on Return, and to `#atlas-heading` (or the focusable fallback stage if rendering is unavailable) after Exit. Cancel/Escape from local confirmation returns to Exit.
- Reduced motion changes only transition settlement. No-WebGL and renderer-import failure retain the same Return/Exit/session semantics without exposing renderer controls.

**Scope constraints:**

- No scientific geometry, activity, camera-authoring, dataset, fidelity, or provenance changes.
- No new renderer path, adapter abstraction, canvas/context, snapshot schema, persistence, storage, backend, or lesson syntax.
- No push, PR, deployment, or publication. `brain-atlas-zmq.26` remains blocked until this Bead closes and its other dependencies clear.
- Preserve the unrelated untracked `.pi/plans/brain-atlas-zmq.22-behavior-driven-white-matter-activity-concept.md`.

**Acceptance Criteria:**

- [x] Every active-Lesson → Atlas transition starts from the actual rendered lesson camera/target and complete canonical lesson filters without a global/default Atlas snap.
- [x] Global `Back to atlas` and stage `Explore this scene` share one lesson-derived temporary branch; modifications remain temporary and exact Return restores the lesson token.
- [x] The persistent global Atlas snapshot is not silently substituted during an active lesson handoff and is not mutated by temporary lesson-derived Atlas commands.
- [x] Atlas session chrome shows compact visible **Return to lesson** and **Exit lesson** controls with at least 44 px targets, restrained borders-first styling, full accessible names, no title-driven width, no horizontal overflow, and stable wide/compact/short-wide layout.
- [x] Checked **Exit lesson** directly clears resume state, removes session controls, resets every canonical axis to the authored complete Atlas default, updates the panel, uses responsive camera fit, replaces the current Atlas history intent, and focuses the Atlas destination.
- [x] Local **Exit lesson** first opens an accessible focused confirmation; Keep/Escape preserves the token and returns focus, while confirmed Exit clears the local candidate/session and stale inspection keys before the same default-Atlas reset.
- [x] After Exit, the Lessons drawer offers Start (not Resume/Start over) for the checked lesson; stale local history normalizes to Atlas with the established not-retained disclosure; a checked URL can deliberately start a fresh lesson.
- [x] Browser Back/Forward before Exit preserves the retained lesson-derived branch and exact lesson Return; history carries only existing small intents/opaque keys, never snapshots or source.
- [x] Reduced-motion, no-WebGL, renderer-import failure, keyboard, touch, compact, and 200%-equivalent/short-wide paths retain deterministic focus and session semantics with one canvas at most.
- [x] Current architecture, UI specification, user/browser guidance, approved UX plan, roadmap, and implementation plan reflect the landed handoff/Exit behavior; scientific traceability, data licenses, notices, and citation files either remain unchanged with a recorded no-impact rationale or are updated if scope changes.
- [x] Full Node, validator, publication/build, audit, production-static, Firefox, Chromium, visual, simplification, and independent review checks pass before a signed local commit and Bead closeout.

**Verification Commands:**

```bash
node --test test/workspace-session.test.js test/lesson-scene-controller.test.js test/explore-session.test.js
npm test
npm run generate:lesson-validators && git diff --exit-code -- src/lesson/generated/
npm run build:publish
npm run build
npm audit
npm audit --omit=dev
git diff --check
```

Browser commands run from the existing external harness after starting a clean server with `npm run dev -- --host 127.0.0.1 --port 5199`:

```bash
cd /private/tmp/brain-atlas-firefox-tests
NODE_PATH="$PWD/node_modules" BRAIN_ATLAS_URL=http://127.0.0.1:5199/ BROWSER=firefox HEADED=1 \
  npx playwright test \
  --config=/Users/hays/Projects/brain-atlas/scripts/browser/playwright.config.cjs \
  /Users/hays/Projects/brain-atlas/scripts/browser/home-workspace.spec.cjs \
  /Users/hays/Projects/brain-atlas/scripts/browser/home-edge.spec.cjs \
  /Users/hays/Projects/brain-atlas/scripts/browser/explore-lifecycle.spec.cjs \
  /Users/hays/Projects/brain-atlas/scripts/browser/explore-edge.spec.cjs

NODE_PATH="$PWD/node_modules" BRAIN_ATLAS_URL=http://127.0.0.1:5199/ BROWSER=chromium HEADED=1 \
PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" \
  npx playwright test \
  --config=/Users/hays/Projects/brain-atlas/scripts/browser/playwright.config.cjs \
  /Users/hays/Projects/brain-atlas/scripts/browser/home-workspace.spec.cjs \
  /Users/hays/Projects/brain-atlas/scripts/browser/home-edge.spec.cjs \
  /Users/hays/Projects/brain-atlas/scripts/browser/explore-lifecycle.spec.cjs \
  /Users/hays/Projects/brain-atlas/scripts/browser/explore-edge.spec.cjs
```

Production preview uses `npm run preview -- --host 127.0.0.1 --port 5199` and:

```bash
cd /private/tmp/brain-atlas-firefox-tests
NODE_PATH="$PWD/node_modules" BRAIN_ATLAS_URL=http://127.0.0.1:5199/ BROWSER=firefox PRODUCTION_PREVIEW=1 \
  npx playwright test \
  --config=/Users/hays/Projects/brain-atlas/scripts/browser/playwright.config.cjs \
  /Users/hays/Projects/brain-atlas/scripts/browser/home-production.spec.cjs

NODE_PATH="$PWD/node_modules" BRAIN_ATLAS_URL=http://127.0.0.1:5199/ BROWSER=chromium PRODUCTION_PREVIEW=1 \
PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" \
  npx playwright test \
  --config=/Users/hays/Projects/brain-atlas/scripts/browser/playwright.config.cjs \
  /Users/hays/Projects/brain-atlas/scripts/browser/home-production.spec.cjs
```

---

### Task 1: Lock the behavioral regression tests [Independent]

**Context:** Existing browser tests still codify the superseded behavior that `Back to atlas` restores the complete persistent/global Atlas. Replace that assertion before runtime code. Use the existing development-only camera, workspace, controller, and canonical snapshot diagnostics; do not add production debug surfaces.

**Files:**
- Modify: `scripts/browser/explore-lifecycle.spec.cjs`
- Modify: `scripts/browser/home-workspace.spec.cjs`
- Modify: `scripts/browser/home-edge.spec.cjs`
- Modify: `scripts/browser/home-production.spec.cjs`

**Steps:**
1. Change the compact `Back to atlas` test to set a distinctive actual rendered lesson camera/target and canonical filter values, click Back, and require `atlasKind === 'scene'`, full Explore controls, exact camera/target, and exact current lesson visibility/material/playback/selection state.
2. Require `Back to atlas`, brand activation, and browser Back from an active lesson to share the lesson-derived path. Preserve one canvas and zero root/horizontal scroll.
3. Retain the separate scene-inspection test but change its final Back assertion: it must derive from the current returned lesson, not substitute the saved persistent global cutaway. Confirm temporary Atlas changes do not mutate `persistentAtlasSnapshot`.
4. Add a checked Exit scenario: Return/Exit controls and accessible names, direct exit, complete default entities/camera/material/playback/control policy, hidden session actions, checked drawer Start-only state, Atlas destination focus, history replacement, and one canvas.
5. Add a local Exit scenario: confirmation accessible name/copy, Escape and Keep preserve session/focus, confirm removes session UI/candidate recovery, resets Atlas, and stale local navigation recovers honestly.
6. Extend compact/short-wide/no-WebGL/renderer-failure checks for 44 px session targets, no overflow, focus behavior, and semantic Exit reset.
7. Update production smoke to assert short session labels, absent debug hooks/storage, and Exit behavior.
8. Run the focused matrix and confirm the new assertions fail against the old behavior for the intended reasons before implementation.

**Focused verification:**

```bash
# Run the four checked browser files with the Firefox command in the header.
```

**Expected result before implementation:** Back/brand/browser-derived state, compact Return copy/style, Exit controls, confirmation, and reset assertions fail; unrelated one-canvas/fallback tests continue to pass.

### Task 2: Add semantic session and confirmation chrome [Depends on: Task 1]

**Context:** Add only the controls approved by `brain-atlas-ai4`. The visible Return label must not include lesson title/scene. Native dialog semantics provide focus containment and Escape for local-loss confirmation; bootstrap still owns the resulting state transition.

**Files:**
- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `src/bootstrap.js`

**Steps:**
1. Group `#return-to-lesson` and new `#exit-lesson` inside a hidden `.lesson-session-actions` region in the topbar. Keep visible labels fixed and put dynamic lesson/position context in `aria-label` and `title`.
2. Add a small native `#lesson-exit-dialog` with title, dynamic local-loss text, **Keep lesson**, and **Exit lesson**. Do not reuse or nest the import/drawer dialogs.
3. Bind open/cancel/close/confirm semantics so Escape/Keep restore `#exit-lesson`; only confirmed local exit mutates state.
4. Replace the current filled `.return-to-lesson` visual override with a shared restrained session style: transparent/soft surface, quiet border, teal focus/hover, no persistent solid accent. Keep Return slightly stronger than Exit without using danger-fill or warning theatrics.
5. Keep 44 px targets. At narrow widths, reduce gaps/padding and, only if required below 350 px, show the compact Brain Atlas wordmark rather than truncating action text. Never introduce horizontal scrolling or an icon-only action.
6. Add no new dependency or asset.

**Focused verification:**

```bash
npm run build
git diff --check
# Run compact/short-wide browser cases from Task 1.
```

**Expected result:** Semantic controls/dialog render with stable short labels, accessible dynamic context, restrained styling, and contained layouts; behavioral Exit assertions remain red until Task 3.

### Task 3: Unify lesson-derived handoff [Depends on: Task 2]

**Context:** `beginExplore('scene')` already derives full-control Atlas state from the adapter’s current complete snapshot and actual rendered camera. Reuse it for every active-lesson handoff; do not alter `createSceneExploreSnapshot`, the renderer adapter, canonical schema, or activity engines.

**Files:**
- Modify: `src/bootstrap.js`
- Modify: `scripts/browser/explore-lifecycle.spec.cjs`
- Modify: `scripts/browser/home-workspace.spec.cjs`

**Steps:**
1. Route `#back-to-atlas` and the brand lesson action through the same lesson-derived path as `#explore-scene-trigger`.
2. When an Atlas history intent is restored while Lesson is active, derive from the live lesson rather than applying `persistentSnapshot`. Keep the historical URL/state static-safe and use no new history payload fields.
3. Preserve the persistent global snapshot in memory without applying or mutating it during this temporary branch.
4. Use the existing inspection/session key when an explicit lesson-derived Atlas entry must support Back/Forward. Keep snapshot/source out of history and URLs.
5. Replace Return visible text mutation with dynamic accessible-name/title mutation.
6. Keep Return transactionality, exact resume token replay, focus, stage reparent, synchronous resize, panel projection, disclosure semantics, reduced motion, and one-canvas ownership unchanged.
7. Run focused regression tests in both browsers.

**Focused verification:**

```bash
node --test test/workspace-session.test.js test/lesson-scene-controller.test.js test/explore-session.test.js
# Run explore-lifecycle.spec.cjs and home-workspace.spec.cjs in Firefox and Chromium.
```

**Expected result:** Back, brand, stage Explore, and browser lesson→Atlas restoration all begin from the current lesson camera/filters; Return remains exact; persistent global state stays untouched.

### Task 4: Implement explicit lesson exit and default reset [Depends on: Task 3]

**Context:** Exit acts only while Atlas holds a valid resumable lesson token. It converts the current reparented Atlas surface from lesson-origin inspection to ordinary Home without rebuilding the renderer or returning to the hidden lesson first.

**Files:**
- Modify: `src/bootstrap.js`
- Modify: `scripts/browser/home-workspace.spec.cjs`
- Modify: `scripts/browser/home-edge.spec.cjs`
- Modify: `scripts/browser/home-production.spec.cjs`

**Steps:**
1. Add one guarded `exitLessonSession()` transaction. Close fidelity/drawer/import/confirmation surfaces without restoring disappearing triggers; cancel pending focus/navigation callbacks and bump the workspace epoch.
2. If the active source is local, require the approved confirmation before entering the transaction. Delete the local candidate and all inspection branches. For either source, clear `workspace.lesson` token/candidate/key and re-render the drawer so checked content offers Start, not Resume/Start over.
3. Create the authored complete default with `createAtlasExploreSnapshot(catalog)`. Set the active and persistent Atlas snapshots to it, change the current Explore state to nonreturning global/Home ownership, clear lesson-origin trigger/session metadata, and keep the already-reparented single stage/canvas.
4. Synchronously resize after any visibility/reparent effects, apply the complete default once, call global `beginExploreCamera(..., { fitToStage: true })`, refresh the panel and fidelity projection, and preserve auto-rotate/reduced-motion rules.
5. Replace the current history entry with Atlas intent. Do not attempt unsupported history-stack deletion. A later deliberate checked route opens fresh; a stale local route uses existing unavailable-session recovery.
6. Hide the complete session-action group, update Atlas identity/status/hint/announcement, and focus `#atlas-heading`; if rendering is unavailable, focus the fallback stage target.
7. If any renderer application fails, preserve semantic Atlas Home/fallback and cleared session state; do not resurrect a partly ended lesson.
8. Run checked/local/history/reduced-motion/fallback browser tests in both browsers.

**Focused verification:**

```bash
# Run home-workspace.spec.cjs, home-edge.spec.cjs, and home-production.spec.cjs in Firefox and Chromium.
```

**Expected result:** Checked and confirmed-local Exit remove resume UI/state and show the complete default Atlas with truthful history/focus; cancel paths are lossless; one renderer/canvas remains.

### Task 5: Synchronize specifications and user guidance [Depends on: Task 4]

**Context:** This change deliberately revises the active-Lesson handoff portion of approval `brain-atlas-56i` and the current architecture text that says Back restores persistent Atlas. Current public/user docs must describe only landed behavior. Scientific/model documents should not change because no representation changes.

**Files:**
- Modify: `AGENTS.md`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `src/ui/SPEC.md`
- Modify: `skills/user.md`
- Modify: `scripts/browser/README.md`
- Modify: `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md`
- Modify: `.pi/plans/brain-atlas-zmq-ux-requirements-roadmap.md`
- Modify: `.pi/plans/brain-atlas-zmq.24-atlas-home-entry-shell-plan.md`
- Modify: `.pi/plans/brain-atlas-zmq.28-lesson-atlas-handoff-plan.md`
- Review/no impact expected: `docs/SCIENTIFIC_TRACEABILITY.md`
- Review/no impact expected: `DATA_LICENSES.md`
- Review/no impact expected: `THIRD_PARTY_NOTICES.md`
- Review/no impact expected: `CITATION.cff`

**Steps:**
1. Replace persistent-global Back claims with lesson-derived Atlas semantics; retain persistent global state as Home state outside a resumable lesson.
2. Document compact Return/Exit hierarchy, local loss confirmation, default reset, exact Return, focus/history/fallback rules, and one-canvas ownership.
3. Amend INV-20–INV-32/FAIL-21–FAIL-30 or add the smallest new invariant/failure item needed. Do not renumber existing IDs.
4. Mark `.24`’s prior persistent-global Back design as superseded by approval `brain-atlas-ai4`/`.28`, while preserving its Atlas-as-Home and workspace foundations.
5. Record explicit no-impact rationale for scientific traceability, data licenses, third-party notices, citations, and security boundaries unless implementation scope changes.
6. Mark this plan Implemented only after verification and record commands/results without presenting plans as current behavior before the code lands.

**Focused verification:**

```bash
rg -n "persistent global|Back to atlas|Return to lesson|Exit lesson|lesson-derived" \
  AGENTS.md README.md docs src skills .pi/plans --glob '*.md'
git diff --check
```

**Expected result:** Current docs and governing plans agree on the revised handoff; no stale public claim says Back resets to persistent/global Atlas.

### Task 6: Full verification, review, and closeout [Depends on: Task 5]

**Context:** This is a release-gating state/focus/history change. Verify behavior, responsive visual hierarchy, production stripping, and documentation before any completion claim.

**Files:**
- Create: `.pi/reviews/lesson-atlas-handoff/documentation-validation.md`
- Create: `.pi/reviews/lesson-atlas-handoff/<review artifacts>`
- Modify: `.pi/plans/brain-atlas-zmq.28-lesson-atlas-handoff-plan.md`
- Update: Bead `brain-atlas-zmq.28`

**Steps:**
1. Run the sequential Node/validator/build/audit/diff commands from the header. Do not regenerate validators in parallel with tests.
2. Run the focused then full applicable development browser matrix in headed Firefox and Chromium, including touch where supported. Capture wide, 390×844 compact, 800×450 short-wide/200%-equivalent, reduced-motion, no-WebGL, and renderer-failure screenshots/states.
3. Run production-preview checks in both browsers and inspect built assets for absent `__view`, `__lesson`, source maps, `new Function`, and `eval`; retain `script-src 'self'` and the configured Three.js chunk threshold.
4. Run a low-cost independent code/UX review using the user’s approved routing constraints; verify every concrete finding against source/tests/browser evidence before changing code.
5. Run a low-risk touched-file simplification pass; reject speculative abstractions and preserve the existing bootstrap workspace boundary.
6. Validate documentation and record no scientific/data/license/dependency/release-metadata impact.
7. Compare implementation to approval `brain-atlas-ai4` and this plan; record deviations or request renewed approval if material.
8. Mark this plan Implemented, append verification evidence to the Bead, create one SSH-signed local commit, verify its signature and clean owned diff, close `brain-atlas-zmq.28`, and stop before integration.
9. Request separate approval before fast-forwarding local `main`; do not push, publish, deploy, delete protected artifacts, or touch the unrelated `.22` Draft concept.

**Focused verification:**

```bash
npm test
npm run generate:lesson-validators && git diff --exit-code -- src/lesson/generated/
npm run build:publish
npm audit
npm audit --omit=dev
git diff --check
git status --short
git log -1 --show-signature --format=fuller
```

**Expected result:** All checks and verified review findings are resolved; the signed feature commit closes the Bead locally while publication remains blocked and no remote changes occur.

## File Conflicts

| File | Tasks | Resolution |
|---|---|---|
| `src/bootstrap.js` | 2, 3, 4 | Execute sequentially: semantic chrome, unified handoff, then Exit transaction. |
| `scripts/browser/home-workspace.spec.cjs` | 1, 3, 4 | Write all red expectations first; turn them green in behavior order. |
| `scripts/browser/home-edge.spec.cjs` | 1, 4 | Establish compact/fallback expectations before Exit implementation. |
| `scripts/browser/home-production.spec.cjs` | 1, 4 | Establish production expectations before Exit implementation. |
| `.pi/plans/brain-atlas-zmq.28-lesson-atlas-handoff-plan.md` | 5, 6 | Synchronize scope first; mark Implemented only at final closeout. |

## Execution Handoff

Plan saved to: `.pi/plans/brain-atlas-zmq.28-lesson-atlas-handoff-plan.md` (verify with `test -f` and `wc -l`).

Recommended next skills: `test-driven-development` for Tasks 1–4; `verification-before-completion` before Task 6 completion claims; `requesting-code-review` for the final cold review.

## Implementation Record — 2026-07-22

- Approval `brain-atlas-ai4` was implemented without material deviation. The only responsive refinement beyond the initial copy was the planned collision fallback: while a lesson session is active, direct Open yields at ≤700 px and Lessons also yields at ≤350 px; both reappear after Return/Exit. This preserves the approved hierarchy and all capabilities through the Lessons drawer or closeout.
- TDD red evidence reproduced the old global snap (`kind: global` instead of `scene`), long Return copy/missing Exit, absent checked closeout, absent local confirmation, stale local-history announcement, modal persistence during browser Back, and 320 px header overlap before each focused correction.
- `npm test` passed 127/127. Standalone lesson validators regenerated with no drift. `npm run build:publish` passed with no untracked public files. Both npm audits reported zero vulnerabilities, and `git diff --check` passed.
- The clean development matrix passed 28 applicable Firefox tests with four intentional skips and 29 applicable system-Chromium tests with three production-only skips. Coverage includes all lesson activity views, actual-camera Back/brand/browser handoff, persistent-snapshot isolation, every viewer axis, exact Return, deep-equal default reset, checked/local Exit, confirmation Escape/Keep/confirm, stale local history, modal Back/Forward, wide/390/320/short-wide layout, real Chromium touch, reduced motion, no-WebGL, renderer failure, exact stage aspect, and one canvas.
- Production preview passed 3/3 in Firefox and 3/3 in Chromium. Built assets contain no `__view`, `__lesson`, source maps, symlinks, `new Function`, or `eval(`; CSP retains `script-src 'self'`; the Three.js chunk is 646,516 bytes, below 650 kB.
- Visual review passed for 1440×900, 390×844, 320×568, and the compact local-loss dialog. Return is outlined rather than solid-filled, Exit is quiet but explicit, 44 px targets remain, titles/actions do not clip or overlap, and the local warning is focused and legible.
- Focused plan UX and state/history reviews passed. Final cold OpenRouter Gemma 4 31B behavioral review and DeepSeek V4 Flash boundary review returned valid zero-finding results. Kimi K2.7 returned empty invalid output and was rejected; two earlier subscription-backed GPT-5.6 plan invocations timed out without final answers and were not counted.
- Low-risk simplification removed the obsolete lesson-handoff kind branch, renamed the misleading history helper, and kept one unified `leaveLessonForAtlas` path. Focused browser verification passed afterward; no structural abstraction was added.
- Documentation validation passed in `.pi/reviews/lesson-atlas-handoff/documentation-validation.md`. No scientific representation, dataset, transform, fidelity record, dependency, license, notice, citation, security boundary, or release metadata changed.
- No push, PR, deployment, or publication occurred. The unrelated untracked `.pi/plans/brain-atlas-zmq.22-behavior-driven-white-matter-activity-concept.md` and protected local review artifacts remained untouched.
