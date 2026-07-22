# Atlas Home and Lesson Entry Shell Implementation Plan

**Issue:** `brain-atlas-zmq.24` — Build atlas home and lesson entry shell
**Design:** Approved decisions `brain-atlas-7da` and `brain-atlas-56i`; `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md`
**Date:** 2026-07-22
**Branch:** `feat/atlas-home-shell`
**Status:** Implemented

**Goal:** Make the full exploratory atlas the product Home, launch checked and local lessons from one responsive drawer, and let learners switch between preserved Atlas and Lesson contexts without creating another renderer, canvas, runtime, or persistence layer.

**Architecture:** A deliberately narrow renderer-independent `src/ui/workspace-session.js` boundary owns only frozen checked-entry view data, route/history validation, and capture/validation of the two complete canonical snapshots used at workspace boundaries. It is not a router, store, lifecycle machine, or holder of lesson candidates. `src/bootstrap.js` owns one explicit workspace record, an in-memory candidate registry, the concrete transition transaction/epoch, native lesson drawer, History API effects, DOM reparenting, page/focus restoration, and rollback. One current wrapper returned by `src/main.js#createLessonRendererAdapter` owns the singleton renderer at a time; replacing a lesson runtime catalog retires that wrapper and its controller before creating the next wrapper over the same renderer. The existing `src/ui/explore-session.js` helpers remain the canonical atlas-state/command bridge, while the existing stage, viewer controls, Model & sources panel, canvas, and WebGL context move between the persistent Atlas workspace and scrolling Lesson workspace.

**Approved product model:**
- Atlas is Home. `/` opens the complete full-control atlas directly, not a marketing page and not a modal over a hidden lesson.
- A responsive **Lessons** drawer lists the checked Draft retina-to-V1 lesson and launches the existing staged local Markdown import. Future reviewed static-library records use the same entry-record renderer.
- Atlas and Lesson are separately resumable. Opening a lesson preserves the actual atlas camera plus canonical filters/controls. **Back to atlas** restores that workspace and exposes **Return to lesson · <title> · <position>**. Return restores the lesson source, active scene, exact reading-surface position, selected visual, rendered camera, canonical filters/playback request, and focus.
- “Exact” excludes transient stochastic particles and partial visibility-transition opacity. An in-flight camera transition resolves into an instant snapshot at the current rendered pose; canonical destination visibility and requested playback remain authoritative.
- Stage **Explore this scene** uses the same Atlas workspace as a temporary scene-derived branch. It does not overwrite the persistent global-atlas snapshot; Return restores the lesson and discards the temporary branch.
- **Back to atlas** restores the learner’s persistent general-atlas state. This remains distinct from scene-derived inspection.
- The checked lesson has a static-safe `?lesson=retina-to-v1` route. Atlas is the route with no `lesson` parameter. Local lesson and scene-inspection history entries are session-only and fall back to Atlas with an accessible notice after reload; no source enters a URL or storage.
- No-WebGL Home remains a purposeful semantic atlas-orientation/source surface. It disables only spatial controls while retaining the Lessons drawer, checked lesson, local import, prose, declared images, navigation, and Model & sources.

## Executable ownership and transition contract

### Sources of truth

| Owner | Value | Contract |
|---|---|---|
| Base catalog | `catalog` | Immutable entities/fidelity/camera presets loaded once. |
| Checked entries | `checkedCandidatesById` | Immutable validated candidates keyed by stable checked ID. The drawer projects these; the route never contains source. |
| Session candidates | `localCandidatesByKey` | Bootstrap-only in-memory map containing at most one current validated local candidate. Checked candidates remain in `checkedCandidatesById`. Neither map enters history, URL, storage, or the pure workspace module. |
| Inspection branches | `inspectionBranchesByKey` | Bootstrap-only bounded map containing at most one session branch `{ lessonKey, snapshot, lessonToken }`. An inspect history key resolves here; replacing the resumable lesson clears it. It never enters URL/storage or the pure module. |
| Workspace | `workspace = { phase, mode, epoch, atlas, lesson }` | Sole mutable top-level owner in bootstrap. `phase` is `booting`, `switching`, `atlas`, `lesson`, or `fallback`; visible action handlers require a stable phase. |
| Persistent Atlas | `workspace.atlas.persistentSnapshot` | Complete canonical global-atlas snapshot. Updated only from actual camera plus canonical controls before leaving global Atlas or after a global Atlas command. A scene inspection uses a separate `activeSnapshot` and cannot assign this value. |
| Lesson resume | `workspace.lesson = { key, sourceKind, candidate, token }` | The one resumable lesson. `token` is frozen stable state only; the candidate reference remains bootstrap-local. Replaced only after another candidate has validated and its activation transaction commits. |
| Renderer runtime | `rendererRuntime = { wrapper, runtimeCatalog, generation }` | Exactly one current wrapper over the singleton `src/main.js` renderer and the only owner of renderer generation. Every replacement unregisters Explore commands, calls `endExplore`, increments `rendererRuntime.generation`, drops the old controller reference, then creates the next wrapper. Callback closures no-op unless both captured `rendererRuntime.generation` and workspace epoch still match. |
| Lesson controller | `controller` | Zero or one controller bound to the current wrapper/candidate. It owns authored navigation/reduced-motion semantics. It never controls Atlas. |
| History | versioned small plain record | Navigation intent only; never a snapshot, lesson source, candidate, presentation, or DOM reference. |

`workspace-session.js` exposes a fixed small API, to be finalized by red tests before integration:

- `createCheckedLessonEntry({ id, candidate, summary })`
- `parseWorkspaceLocation({ search, historyState, checkedIds, availableSessionKeys })`
- `workspaceUrl({ currentUrl, checkedLessonId? })`
- `createHistoryIntent({ mode, checkedLessonId?, sessionKey?, serial })`
- `captureAtlasSnapshot(snapshot, renderedCamera, catalog)`
- `createLessonResumeToken(input, catalog)`
- `createSceneInspectionSnapshot(snapshot, renderedCamera, catalog)`

The module returns frozen plain data and imports no DOM/Three.js. Candidate references, transition effects, focus targets, and mutable maps stay in bootstrap.

### Transition matrix and commit rule

| From | Intent | Target | Snapshot/token effect |
|---|---|---|---|
| Boot | `/` | Global Atlas | Apply versioned default; no lesson controller. |
| Boot | known checked query | Lesson | Render checked candidate before renderer readiness; attach current scene when ready. |
| Global Atlas | Start checked/local | Lesson | Capture persistent Atlas; create fresh lesson entry; commit new resumable lesson only after target apply succeeds. |
| Global Atlas | Resume | Lesson | Capture persistent Atlas; replay existing lesson token. |
| Lesson | Back to atlas | Global Atlas | Capture lesson token; restore persistent Atlas; expose Return. |
| Lesson | Explore this scene | Scene Atlas | Capture lesson token; derive temporary scene snapshot; leave persistent Atlas untouched. |
| Global/Scene Atlas | Return to lesson | Lesson | Capture global Atlas if applicable; replay lesson token; discard scene snapshot if applicable. |
| Any stable mode | `popstate` | Parsed target | Use the same transaction with history writes suppressed. Missing session state normalizes to Atlas. |
| Any switch failure | rollback | Prior stable mode | Recreate prior wrapper if it was replaced, reapply prior complete snapshot, restore DOM/locks/focus; if rollback also fails, enter readable fallback. After a failed `popstate` target rolls back, replace the browser’s now-current entry with the prior committed URL/history intent and announce recovery so UI and address bar cannot disagree. |

Every switch is synchronous after any file read/validation and uses one transaction:

1. increment `workspace.epoch`, set `phase='switching'`, close transient surfaces in defined order, acquire lock owner `workspace-switch`, cancel scroll/focus/RAF work, and capture a full rollback record;
2. prepare target candidate/catalog/DOM and, if needed, replace the current wrapper; no top-level mode, history entry, or resumable candidate is committed yet;
3. apply the target complete snapshot and synchronize panel/fidelity/playback while content is inert/hidden;
4. commit `mode`, candidate/token, DOM visibility/landmarks, and optional history exactly once;
5. release only `workspace-switch`, restore scroll then focus under an epoch-guarded two-frame settlement, and announce the destination.

A callback or promise continuation captures both `epoch` and renderer `generation`; it must return without effects if either differs. Renderer readiness always consults the current committed/desired workspace rather than a startup-captured lesson. File reading completes before local validation/activation enters a transaction. Live reduced-motion changes during `switching` update a pending preference flag only; target commit applies the latest preference atomically.

### Renderer/controller replacement and lesson replay

The singleton renderer module and WebGL context load at most once. A wrapper may be recreated because imported lessons extend the validated visual catalog, but only one wrapper is current:

1. retire current commands with `setExploreCommandHandler(null)` and `endExplore()`;
2. increment `rendererGeneration` and clear `controller`;
3. call the existing factory with the target runtime catalog and a generation/epoch-guarded transition callback;
4. use the returned wrapper for all subsequent applies/captures until another candidate replacement.

No wrapper owns a RAF loop or WebGL resource, so retirement does not dispose the singleton renderer. If implementation finds another retained listener/resource, add a narrow idempotent wrapper `retire()` in `src/main.js` and test it; do not build a lifecycle framework.

Resume requires one small, test-driven controller extension: `controller.restore(snapshot, { reason: 'workspace-resume' })`. It stores one validated complete resume snapshot as the current transient base for the active index, applies its reduced-motion-effective form, and marks state `resumed: true`. `activate`, Start, and Restart clear that override and return to authored data. Skip/reduced-motion derive from the resume base while it is current, so a live preference change does not snap camera/filters back to the authored pose. The adapter remains the validator; the controller does not gain catalog knowledge.

The replay order is normative:

1. assign candidate/presentation/navigation and render semantic lesson content while the target is inert;
2. restore `selectedVisualId` from the token and move the one shared surfaces to Lesson homes;
3. ensure the wrapper uses the candidate runtime catalog and create the controller at the saved index;
4. call `setReady()` while hidden, then `restore(token.snapshot)` so the exact token is the final renderer apply;
5. update cards, fidelity, labels, controls, and selected DOM visual without invoking another controller activation;
6. reveal Lesson, restore exact `#page-scroll.scrollTop` in two guarded animation frames with scene-scroll activation suppressed, then focus **Back to atlas** (or the mode heading for `popstate`).

Starting a lesson follows the same order but omits `restore`, applies its entry snapshot, and scrolls to zero. Leaving Lesson captures `rendererAdapter.capture()` with the actual rendered camera substituted and instant transition; canonical destination visibility wins over partial cross-fade opacity, and transient particles are excluded.

### History, locks, and fallback

History state is exactly `{ schemaVersion: 1, mode: 'atlas'|'lesson'|'inspect', checkedLessonId?: string, sessionKey?: string, serial: number }`. A local key resolves only through `localCandidatesByKey`; an inspect key resolves only through `inspectionBranchesByKey`. Rules:

- `/` is stable Atlas. `?lesson=<known-checked-id>` is a stable checked Lesson. Routing modifies only `lesson` and preserves allowed flags such as `no-webgl`.
- Local Lesson uses the nonsecret `?lesson=local` marker plus an opaque in-memory `sessionKey`; scene inspection uses `/` plus its session key. Neither URL contains source. On reload/history restoration without a key, replace the entry with Atlas and announce that session-only content was not retained. The explicit local marker is required because Firefox/Chromium reload can begin before prior-document in-memory state exists, while the marker preserves truthful recovery copy.
- A known checked query wins only for `mode='lesson'` or absent compatible state. An explicit session-only `mode` requires its key; a missing key falls back to Atlas rather than silently opening the checked query.
- Explicit successful switches push exactly once after commit. `popstate` never pushes. Boot normalization, missing-session recovery, and rollback from a failed popstate target replace the now-current entry with the committed destination. Same mode/key requests are no-ops. Return actions push their destination rather than assuming browser-stack shape.
- Before any `popstate` transition, disclosure → drawer → import close in that order without restoring disappearing trigger focus. Escape closes only the topmost transient surface and never changes workspace/history.

Locks use named owners in the existing `pageLockOwners`: `disclosure`, `drawer`, `import`, and `workspace-switch`. Acquisition/release is idempotent and each path releases only its owner. Drawer and import never overlap: the drawer closes and releases/restores semantics before import opens on the next frame. Atlas itself does not lock hidden Lesson scroll; it makes `#page-scroll` hidden and inert. Focus after an explicit switch moves to the destination reciprocal action (**Return to lesson** or **Back to atlas**); history restoration focuses the destination mode heading. Focus runs only after scroll restoration and uses `preventScroll`.

With no WebGL or renderer-import failure, the same mode/history/candidate state machine runs without a wrapper/controller. Atlas shows global semantic orientation, source disclosure, Lessons, import, and project links with renderer controls/scene inspection absent. Lesson shows prose, images, scene summaries/navigation, lifecycle, and Model & sources. Tokens retain source/index/scroll/selected visual and use the authored/effective canonical snapshot when no actual camera is available. Back/Return/history still restore semantic state. There is no automatic renderer retry; reload is the recovery path. A later adapter failure keeps the committed route if readable target content exists, removes renderer actions, and enters this same capability fallback after transactional DOM/lock cleanup.

**Visual direction:** Preserve the approved “editorial scientific instrument” language: cool dark imaging surface, borders and restrained surface shifts rather than decorative cards or marketing gradients, anatomy as the dominant composition, concise technical labels, and teal reserved for primary actions. The full atlas fills the available viewport. The lesson drawer is subordinate navigation: a right-side sheet on wide layouts and a focus-managed near-full-width/bottom sheet on compact layouts, with 44 px targets and no horizontal overflow.

**Non-goals:**
- No backend, account, localStorage/sessionStorage, saved views, progress persistence, analytics, service worker, or lesson source in URLs/history.
- No reviewed library implementation, content database, search, sorting, recommendation engine, or contribution workflow (`brain-atlas-zmq.11`, `.13`, `.18`).
- No second renderer/canvas/context, second scene adapter, new filter model, plugin registry, UI framework, router package, or global state library.
- No entity inspector, hit testing, responsive labels, endpoint filtering, lesson-content approval, or scientific model/data/provenance change (`brain-atlas-zmq.8`, `.20`, `.21`, `.25`, `brain-atlas-yum.5`).
- No invented animation behavior and no persistence of individual impulse/SWM particle phase.
- No push, PR, deployment, or remote mutation before the separate publication gate.

**Acceptance Criteria:**
- [x] Opening `/` presents the complete exploratory atlas as the primary full-viewport workspace; no hidden lesson is treated as Home and no modal is required to reach the atlas.
- [x] Exactly one existing stage, canvas, renderer, WebGL context, viewer-control panel, and Model & sources panel serve Atlas, scene inspection, checked lessons, and local lessons across repeated switches.
- [x] Atlas starts from the versioned complete-atlas snapshot, exposes full orbit/zoom/pan/filter/playback controls, keeps auto-rotate excluded/off, and retains exact rendered camera plus canonical working state while a lesson is open.
- [x] A keyboard/touch-operable **Lessons** drawer lists the checked retina-to-V1 lesson with title, Draft lifecycle, scene count, purpose, and explicit Start/Resume/Start-over actions; it launches the existing local import dialog without duplicating validation.
- [x] Future static lesson records can populate the same drawer from a frozen checked-source entry list without changing workspace navigation or activation code.
- [x] Checked and local lessons activate through the existing parser, presentation, runtime-catalog, controller, adapter, and renderer lifecycle; repeated switching/import never reloads Three.js or creates another canvas.
- [x] **Back to atlas** captures a stable lesson resume token and restores the prior persistent atlas state. Atlas visibly exposes **Return to lesson** with the lesson title and entry/scene position.
- [x] **Return to lesson** restores the same source, active scene, `#page-scroll.scrollTop`, selected visual, rendered camera/target, canonical state, requested playback policy, and a predictable focus target. Reduced motion settles playback/camera without changing requested canonical state.
- [x] **Explore this scene** enters a temporary scene-derived Atlas branch from the current rendered pose, provides the same full controls, returns exactly to the lesson, and leaves the persistent global-atlas snapshot unchanged.
- [x] Explicit Start begins the checked lesson at its entry view; Resume uses the retained token. Explicitly opening another validated lesson replaces the single resumable lesson session without persisting either source or progress.
- [x] `/` and `?lesson=retina-to-v1` load directly on static hosting. Push/Back/Forward restore Atlas, checked Lesson, in-memory local Lesson, and scene-inspection intent through the same lifecycle without duplicate entries, stale focus, root scroll, or browser hash scrolling.
- [x] Reloading or directly opening an unavailable session-only local/inspection history state returns to Atlas, removes the unrecoverable route state, and announces that local content was not retained; no source is recovered from storage.
- [x] Wide, compact, 320×568, 390×844, 800×450/200%-equivalent, keyboard, pointer, touch, reduced-motion, no-WebGL, renderer-import-failure, repeated-switch, and production-static paths retain readable controls, correct aspect, zero horizontal overflow, and deterministic focus/scroll behavior.
- [x] Normal Lesson one-finger canvas gestures still scroll `#page-scroll`; Atlas and scene-inspection gestures control the camera without scrolling the hidden lesson or root.
- [x] Model & sources follows Atlas visible entities and current Lesson records; Draft remains lesson lifecycle, not geometry/activity fidelity. Shared legal/citation links remain reachable in both workspaces.
- [x] Existing local-image CSP/privacy behavior, lesson schema, scientific assets/models/claims, single MNI transform, dependencies, licenses, citations, and publication gate remain unchanged unless implementation evidence proves otherwise.
- [x] README, architecture, contributor/UI invariants, user guidance, UX roadmap, plan status, Bead evidence, checked-in browser tests, and review disposition describe only landed behavior.

**Verification Commands:**
```bash
node --test test/workspace-session.test.js test/explore-session.test.js \
  test/lesson-import.test.js test/lesson-scene-controller.test.js \
  test/scene-navigation.test.js test/scroll-surface.test.js
npm test
npm run generate:lesson-validators && git diff --exit-code -- src/lesson/generated-validators.js
npm run build:publish
npm audit --omit=dev
npm audit
git diff --check

# Headed browser verification (reuse the checked-in harness; no new dependency)
HEADED=1 BROWSER=firefox npx playwright test --config=scripts/browser/playwright.config.cjs \
  scripts/browser/home-workspace.spec.cjs scripts/browser/home-edge.spec.cjs
HEADED=1 BROWSER=chromium PLAYWRIGHT_EXECUTABLE_PATH="$(command -v chromium || command -v chromium-browser)" \
  npx playwright test --config=scripts/browser/playwright.config.cjs \
  scripts/browser/home-workspace.spec.cjs scripts/browser/home-edge.spec.cjs \
  scripts/browser/explore-touch.spec.cjs
```

---

### Task 1: Define the pure workspace/session boundary [Independent]

**Context:** Top-level routing and resume semantics must be deterministic without DOM or Three.js. Implement exactly the small API and plain-data boundaries in **Executable ownership and transition contract**. Reuse complete canonical snapshots and current Explore helpers; do not introduce another scene-state shape. The pure module must not carry lesson candidate references or become a transition-effect store.

**Files:**
- Create: `src/ui/workspace-session.js`
- Create: `test/workspace-session.test.js`
- Modify later in Task 6: `src/ui/SPEC.md`

**Steps:**
1. Add failing tests for the default Atlas route, checked lesson query routes that preserve unrelated safe query parameters such as `no-webgl`, invalid/unknown route fallback, session-only local/scene-inspection intent, immutable checked lesson-entry projection, and Start versus Resume intent.
2. Add failing tests for creating/capturing a persistent Atlas session from `createAtlasExploreSnapshot`, synchronizing actual camera before leaving Atlas, and preserving canonical viewer axes without mutation.
3. Add failing tests for a lesson resume token containing stable lesson key/source kind, active index, exact surface scroll, selected visual ID, instant actual camera, complete canonical snapshot, and semantic focus target. Validate finite scroll/camera values, catalog references, index bounds, source-kind/key combinations, and deep immutability.
4. Add failing tests proving a scene-inspection branch derives from the current lesson state but does not mutate or replace the persistent global Atlas session.
5. Implement only `createCheckedLessonEntry`, `parseWorkspaceLocation`, `workspaceUrl`, `createHistoryIntent`, `captureAtlasSnapshot`, `createLessonResumeToken`, and `createSceneInspectionSnapshot` using existing canonical normalization and `applyExploreCommands` camera synchronization.
6. Keep candidate references, transition effects, transient particle/clock state, and local source text out of all public values. Store only the versioned intent fields and opaque session key in `history.state`; bootstrap retains candidates in memory.
7. Add structural tests that `src/ui/workspace-session.js` imports no bootstrap/DOM/Three.js and document why it is not a general router/store.

**Focused verification:**
```bash
node --test test/workspace-session.test.js test/explore-session.test.js \
  test/scene-state.test.js test/scene-commands.test.js
```

**Expected result:** Atlas/Lesson/inspection transitions, checked routes, and resumable semantic state are frozen, validated, catalog-aware plain data with no DOM/Three.js/persistence dependency.

---

### Task 2: Convert Explore into the persistent Atlas workspace [Depends on: Task 1]

**Context:** The current global Explore path reparents the stage into a native modal over the lesson. Atlas-as-Home must instead be a real top-level workspace shown at startup. Preserve the existing renderer bridge, canonical viewer commands, camera-first synchronization, controls, fidelity aggregation, and single-context guarantees. Scene inspection may reuse the same workspace but is a temporary branch with a lesson return token.

**Files:**
- Modify: `index.html`
- Modify: `src/bootstrap.js`
- Modify: `src/style.css`
- Modify only if a narrow bridge gap is proven: `src/main.js`
- Test: `test/workspace-session.test.js`

**Steps:**
1. Add a browser test that fails because the current app initially shows Lesson and requires modal **Explore atlas**.
2. Add a semantic `#atlas-workspace` below the shared topbar, a stable `#atlas-mount`, Atlas mode identity, persistent lesson-return action, and layout homes/placeholders for the one `.stage-shell`, `#viewer-console`, `#fidelity-panel`, and shared citation links. Keep `#page-scroll` as the sole Lesson scroll region.
3. Replace `exploreState`’s modal-centric lifecycle with the exact `workspace` record, transition matrix, epoch/generation commit rule, rollback record, and named-lock protocol above. Keep only stable `atlas`/`lesson` modes; `atlasKind` selects persistent global or temporary scene state.
4. On default startup, parse/prepare the checked lesson but do not activate its controller. Render semantic Atlas shell first; after WebGL readiness, consult the latest route/workspace epoch, create one adapter, apply `createAtlasExploreSnapshot`, begin Explore camera controls, register generation-guarded canonical command dispatch, sync the retained viewer panel, and render visible-entity fidelity.
5. Move/reparent the existing surfaces into Atlas without cloning. Preserve one canvas and observe the actual stage rectangle after every move. Keep global Atlas auto-rotate hidden/off and retain the current full-control gesture policy.
6. Before leaving Atlas, synchronize actual rendered camera into the persistent Atlas snapshot and unregister Atlas commands safely. Restore this snapshot rather than the default on subsequent **Back to atlas**.
7. For scene inspection, derive a temporary snapshot from the current lesson state and actual camera; do not overwrite the persistent Atlas snapshot. Route command edits to the temporary snapshot and discard it on Return.
8. Rework Explore failure handling around the specified prepare/apply/commit transaction. If a wrapper was replaced before failure, recreate the rollback runtime catalog/wrapper, reapply the rollback snapshot, then restore DOM/mode/locks/focus; if rollback fails, enter capability fallback. No route/session commit occurs before apply succeeds.
9. Keep renderer module import single-shot. Retire/recreate only the lightweight current wrapper when a different lesson runtime catalog requires it, using the specified renderer generation contract; repeated Atlas/Lesson switching for the same candidate reuses that wrapper and controller.

**Focused verification:**
```bash
node --test test/workspace-session.test.js test/explore-session.test.js \
  test/renderer-adapter.test.js test/camera-transition.test.js \
  test/visibility-transition.test.js
npm run build
```

**Expected result:** The default product surface is one complete working atlas with current Explore capabilities and no duplicate renderer or hidden active lesson.

---

### Task 3: Add the Lessons drawer and unified activation [Depends on: Task 2]

**Context:** Lesson entry must be deliberate and must reuse the strict checked/local parser path. The drawer is navigation, not a second authoring/runtime system. It must expose lifecycle Draft separately from fidelity and remain extensible to later static library records without implementing the library.

**Files:**
- Modify: `index.html`
- Modify: `src/bootstrap.js`
- Modify: `src/style.css`
- Modify: `src/ui/workspace-session.js`
- Test: `test/workspace-session.test.js`
- Reuse unchanged unless a regression requires a fix: `src/ui/lesson-import.js`

**Steps:**
1. Add failing pure/browser tests for one frozen checked-entry record and an absent **Lessons** drawer.
2. Add a **Lessons** action to Atlas and one native drawer dialog. Use a right-side modal sheet on wide layouts and compact near-full-width/bottom sheet; provide visible mode/title, Close, and at least 44 px controls. Focus the heading/first action on open, contain focus natively, and restore the trigger on Close.
3. Render the checked lesson card with validated title, Draft label, instructional-scene count, concise authored purpose, and explicit Start or Resume action. Render from a small frozen checked-source list so `.11` can add records without changing activation/navigation. Do not build search/filter/category APIs.
4. Add **Open local lesson** in the drawer and shared topbar where appropriate. It closes the drawer, opens the existing import dialog, and retains all bounded validation, preview, host disclosure, file, error, focus, and no-request-before-Open behavior.
5. Refactor `activatePreparedLesson` into one activation path used by checked Start, checked route, checked Resume, and local explicit Open. Start initializes entry; Resume restores a saved token without reparsing or resetting. Local Open replaces the single resumable lesson only after successful validation.
6. Entering Lesson follows the normative replay protocol above. Add red controller tests, then implement the narrow `restore(snapshot, { reason })` transient-base method so reduced-motion changes and Skip cannot snap a resumed rendered pose back to authored state; Start/Restart/navigation clear the override.
7. Add a shared Lesson topbar **Back to atlas** action. Leaving Lesson creates the specified complete token from current adapter state plus actual camera, active index, exact surface scroll, selected visual, requested playback, source key/kind, and reciprocal focus. Canonical destination visibility replaces partial cross-fade opacity; camera transition becomes instant at current pose.
8. In Atlas, show **Return to lesson · <title> · Topic overview/Scene N** whenever a resumable token exists. Return reuses the in-memory candidate and executes presentation → wrapper/controller → final `restore` apply → UI visual/fidelity → two-frame scroll → focus in that order, with scene-scroll activation suppressed until settlement.
9. Define explicit replacement semantics in copy: Start begins from the entry view; Resume preserves position; opening a different validated lesson replaces the single resumable lesson. Do not add a persistence promise or fake progress percentage.

**Focused verification:**
```bash
node --test test/workspace-session.test.js test/lesson-import.test.js \
  test/lesson-presentation.test.js test/lesson-scene-controller.test.js \
  test/scene-navigation.test.js
```

**Expected result:** Premade and local lessons share one activation pipeline and can round-trip through Atlas without losing the learner’s stable context.

---

### Task 4: Implement static-safe history and lifecycle guards [Depends on: Task 3]

**Context:** History must mirror the workspace state machine rather than triggering synthetic clicks or hash scrolling. Query routes must work on static hosting. Local source remains memory-only, and stale session-only history cannot partly reactivate a lesson.

**Files:**
- Modify: `src/bootstrap.js`
- Modify: `src/ui/workspace-session.js`
- Test: `test/workspace-session.test.js`
- Browser test: `scripts/browser/home-workspace.spec.cjs`

**Steps:**
1. Add failing tests for direct `/`, direct checked `?lesson=retina-to-v1`, unknown checked ID, safe preservation of `?no-webgl=1`, in-memory local history, reload fallback, and deterministic Back/Forward sequences.
2. Initialize exactly `{ schemaVersion: 1, mode, checkedLessonId?, sessionKey?, serial }` after catalog/checked-source validation. Use `pushState` once after each explicit successful commit and `replaceState` only for boot normalization/unrecoverable session fallback. Do not use hashes, source text, presentation data, snapshots, candidate data, or DOM references.
3. Keep checked lesson ID in `?lesson=<id>`. Local Lesson uses `?lesson=local` plus an opaque session key; scene inspection uses `/` plus an opaque key. Enforce the precedence/no-op/missing-key rules in **History, locks, and fallback**, including Atlas fallback on reload of either session-only mode.
4. Route `popstate` through the same transaction with history writes suppressed. Close disclosure, drawer, and import deterministically; acquire `workspace-switch`; cancel pending lesson scroll/focus/animation frames; and guard every delayed callback with epoch+generation. Block scene navigation/page-key/import activation while switching.
5. Preserve approved query flags while adding/removing only `lesson`. Unknown checked IDs and missing local keys replace to Atlas and announce recovery guidance. Test repeated explicit switches for one push each and same-mode/key requests for no pushes.
6. Define direct checked-route startup before renderer readiness: render the readable lesson immediately, then attach the one renderer/controller to the current scene after readiness. Atlas direct startup applies global state only.
7. On `popstate`, close disclosure → drawer → import synchronously without destination-invalid trigger restoration, then perform the route transaction. Browser Back never depends on native dialog `cancel`; Escape remains the only native transient-surface close path without history change.
8. Expose development-only workspace/history/session getters under the existing guarded `window.__lesson` object for repeatable browser assertions; production must remove them.

**Focused verification:**
```bash
node --test test/workspace-session.test.js test/scene-navigation.test.js \
  test/scroll-surface.test.js test/lesson-scene-controller.test.js
```

**Expected result:** Address-bar, Back/Forward, visible navigation, and direct static URLs all resolve through one workspace transition path without persistence or partial activation.

---

### Task 5: Complete responsive, accessibility, fallback, and browser verification [Depends on: Task 4]

**Context:** The highest risks are canvas sizing after persistent reparenting, a drawer/fidelity/import modal conflict, compact viewport loss, touch-policy leakage, stale Atlas/Lesson state during repeated switching, and a blank no-WebGL Home. Verification must exercise actual Firefox and Chromium, not CSS/source inspection alone.

**Files:**
- Create: `scripts/browser/home-workspace.spec.cjs`
- Create: `scripts/browser/home-edge.spec.cjs`
- Modify: `scripts/browser/playwright.config.cjs` to include the new named specs without excluding current Explore checks
- Modify as focused corrections require: `index.html`, `src/bootstrap.js`, `src/main.js`, `src/style.css`

**Steps:**
1. Check in browser tests for default Atlas identity, complete default state, drawer semantics/focus, checked Start/Resume, local import, one canvas/context, actual-camera preservation, canonical filters, exact lesson scene/scroll/visual/focus restoration, and scene inspection leaving persistent Atlas unchanged.
2. Exercise wide, 390×844, 320×568, short-wide 800×450, and 200%-equivalent layouts. Assert 44 px controls, usable anatomy area, exact renderer/stage aspect, contained drawer/panels, reachable legal/source links, root scroll `[0,0]`, and zero horizontal overflow.
3. Exercise keyboard-only drawer/import/lesson/Atlas/Return traversal, native Escape precedence, Model & sources in both modes, visible focus, and live-region announcements. Assert the named `disclosure`, `drawer`, `import`, and `workspace-switch` owners cannot release one another; `popstate` closes transient UI then focuses the destination heading after scroll settlement.
4. Exercise Chromium real touch input: Lesson canvas swipe scrolls `#page-scroll` without camera change; Atlas and scene inspection rotate/zoom without lesson/root scroll. Verify pointer orbit and semantic Zoom/Pan/Reset remain available.
5. Exercise reduced motion before startup and live changes in Atlas/Lesson/inspection. Camera settlement, requested playback, disabled Play, auto-rotate exclusion, and Return must remain truthful.
6. Exercise no-WebGL default Atlas, direct checked Lesson, local import, renderer-import failure, injected adapter failure during Atlas→Lesson and Lesson→Atlas, missing local history, external image failure/retry, and repeated lesson replacement. Assert readable recovery, no Three.js fetch/canvas where prohibited, and no stale locks/focus/state.
7. Exercise `npm run build` preview in Firefox and Chromium: direct `/`, checked query reload, session-only fallback, production debug-hook absence, CSP, one canvas, storage emptiness, and no source maps/symlinks/runtime code generation.
8. Capture representative wide/compact Atlas drawer and Lesson Return screenshots under ignored `.pi/reviews/atlas-home/`. Perform human visual review for anatomy primacy, drawer hierarchy, label clarity, and compact efficiency.

**Focused verification:**
```bash
HEADED=1 BROWSER=firefox npx playwright test --config=scripts/browser/playwright.config.cjs \
  scripts/browser/home-workspace.spec.cjs scripts/browser/home-edge.spec.cjs
HEADED=1 BROWSER=chromium PLAYWRIGHT_EXECUTABLE_PATH="$(command -v chromium || command -v chromium-browser)" \
  npx playwright test --config=scripts/browser/playwright.config.cjs \
  scripts/browser/home-workspace.spec.cjs scripts/browser/home-edge.spec.cjs \
  scripts/browser/explore-touch.spec.cjs
```

**Expected result:** Atlas-as-Home and exact Lesson resumption are usable and stable across required engines, inputs, capability paths, and static production output.

---

### Task 6: Synchronize documentation, review, and closeout [Depends on: Tasks 1–5]

**Context:** This changes the product entry point, top-level mode ownership, history, renderer surface placement, fallback identity, and public controls. It does not by design change scientific content, schemas, dependencies, or the publication gate.

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `src/ui/SPEC.md`
- Modify: `skills/user.md`
- Modify: `.pi/plans/brain-atlas-zmq-ux-requirements-roadmap.md`
- Modify: this plan
- Review for impact: `src/lesson/SPEC.md`, `docs/SECURITY_REVIEW.md`, `docs/SCIENTIFIC_TRACEABILITY.md`, `DATA_LICENSES.md`, `THIRD_PARTY_NOTICES.md`, `CITATION.cff`

**Steps:**
1. Document Atlas-as-Home, drawer entry, checked/local activation, persistent Atlas and resumable Lesson semantics, scene-inspection distinction, static-safe routes, exact-state limits, one-canvas ownership, input policy, and no-WebGL behavior.
2. Add UI invariants/failure modes for the top-level workspace machine, persistent versus temporary Atlas state, stable lesson tokens, single renderer surface, history normalization, unavailable local-session fallback, responsive drawer, and focus/scroll ownership.
3. Update current public setup/control copy and browser-testing guidance. Keep Draft lifecycle separate from fidelity and do not describe the future library as shipped.
4. Review security/CSP impact. Expected result: no new network or persistence boundary; existing external-image policy unchanged. Review scientific/data/license/citation/notices/release metadata and record a specific no-impact rationale unless implementation changes them.
5. Run a low-risk touched-file simplification pass. Do not split bootstrap into a component framework, add a generic router/store, or abstract the single checked lesson beyond the frozen entry list required by `.11`.
6. Run model-diverse behavioral, architecture/boundary, and UX/accessibility review. Verify every material finding against source and executable evidence; preserve valid zero-finding and disposition artifacts under `.pi/reviews/atlas-home/`.
7. Run all final Node, validator, build, audit, static, browser, production-preview, and diff checks. Mark this plan Implemented only after current evidence passes.
8. Append design, implementation, browser, documentation, review, and no-impact evidence to `brain-atlas-zmq.24`; create a verified SSH-signed local commit and close the Bead.
9. Request a separate Beads-backed approval for local-only `main` fast-forward and feature-branch cleanup. Do not push, create a PR, deploy, delete `codex/lesson-pedagogy`, delete `/private/tmp/brain-atlas-lesson-review`, or remove the unrelated untracked `brain-atlas-zmq.22` Draft concept.

**Focused verification:**
```bash
npm test
npm run generate:lesson-validators && git diff --exit-code -- src/lesson/generated-validators.js
npm run build:publish
npm audit --omit=dev
npm audit
git diff --check
git status --short
```

**Expected result:** Code, tests, replayable browser evidence, public/current documentation, plan state, and Bead closeout agree; no remote state changes.

## Implementation Record

Implemented on `feat/atlas-home-shell` on 2026-07-22.

- `src/ui/workspace-session.js` supplies the frozen checked-entry projection, static-safe route/history validation, actual-camera Atlas capture, complete lesson resume tokens, and temporary scene-inspection snapshots. `lesson-scene-controller.js#restore` keeps one transient resume base through reduced-motion/Skip and clears it on authored Start/Restart/navigation.
- `src/bootstrap.js` now opens to Atlas Home, renders the responsive Lessons drawer, keeps one persistent global Atlas plus one temporary scene branch and one resumable lesson, routes checked/local/history intent without storage, and reparents the existing stage, controls, disclosure, canvas, and project links. `?lesson=local` was added as an explicit source-free reload-recovery marker after executable browser evidence showed that `/` alone cannot reliably explain a discarded prior-document session; source remains memory-only.
- `src/main.js` keeps one renderer wrapper and adds only synchronous stage resize plus responsive global-Atlas camera-distance fitting. The deterministic MutationObserver regression caught and then eliminated a one-frame stale-aspect race; anatomy and the one MNI transform remain uniformly scaled and unchanged.
- The final Node suite passed 127/127. Validator drift, `npm run build:publish`, production and full audits, static production-hook/source-map/symlink/runtime-code-generation checks, CSP, and `git diff --check` passed. The Three.js chunk is 646,516 bytes.
- The checked-in development matrix passed 20 applicable Firefox tests plus one intentional Chromium-only touch skip and 21/21 Chromium tests. Production preview passed 3/3 in each browser. Coverage includes default Atlas, drawer focus/layout, checked/local Start/Resume/Start over, exact Return, persistent global versus temporary scene state, direct routes and Back/Forward, local reload recovery, every viewer axis, camera no-snap, synchronous aspect, 320 px/short-wide layouts, real touch, reduced motion, no-WebGL, renderer failure, imported lessons, transactional rollback, one canvas, and absence of production debug hooks.
- Wide and compact screenshots were reviewed manually. The global brain remains centered and complete; compact framing uses camera distance rather than scene/canvas scaling. Drawer hierarchy, Draft identity, project links, anatomy primacy, and 44 px targets remained clear.
- Gemma 4 31B behavioral and DeepSeek V4 Flash boundary reviews produced seven hypotheses; Kimi K2.7 Code returned empty unusable output. Fresh subscription-backed GPT-5.6 verification refuted six. It confirmed one minor synchronous aspect race, which was fixed with a red MutationObserver regression and synchronously forced resize; the post-fix GPT-5.6 review refuted it. Zero findings remain confirmed or unresolved.
- The low-risk simplification pass removed an unused initial-entry parameter and the superseded hidden in-stage Return control. The larger bootstrap state machine remains concrete rather than introducing the rejected generic router, store, UI framework, or plugin system.
- README, architecture, security review, AGENTS, UI SPEC, user/browser guidance, UX baseline/roadmap, and plan lifecycle records are synchronized. The original `.7` modal-shell plan is explicitly superseded by this top-level shell while its snapshot/renderer foundations remain historical evidence.
- This feature changes no lesson schema, dataset, anatomical geometry, coordinate transform, activity model, scientific claim, dependency, data/software license, citation, third-party notice, or release metadata. `docs/SCIENTIFIC_TRACEABILITY.md`, `DATA_LICENSES.md`, `THIRD_PARTY_NOTICES.md`, and `CITATION.cff` therefore need no content changes. `docs/SECURITY_REVIEW.md` records the source-free history marker and unchanged memory-only boundary.
- The signed commit and Bead closeout are recorded separately after this implementation record. No push, PR, or deployment is part of this work.

## File Conflicts

| File | Tasks | Resolution |
|---|---|---|
| `src/ui/workspace-session.js` | 1, 3, 4 | Build the pure contract first; add only drawer/route cases after lifecycle needs are concrete. |
| `src/bootstrap.js` | 2, 3, 4, 5 | Execute serially: workspace ownership, lesson entry, history guards, then browser-driven corrections. |
| `index.html` / `src/style.css` | 2, 3, 5 | Establish workspace homes first, add the drawer second, then make measured responsive corrections. |
| `scripts/browser/playwright.config.cjs` | 5 and existing Explore specs | Broaden matching without changing existing test behavior or requiring another dependency. |
| `src/ui/SPEC.md` | 1, 6 | Define behavior in tests first; assign final invariant/failure IDs after implementation stabilizes. |

## Review Questions

The revised plan answers the first review’s P0/P1 ownership gaps with the normative contracts above. Follow-up review must confirm:
1. The one current wrapper plus one controller transient `restore` base is sufficient; no second adapter/state authority or retained callback survives replacement.
2. Persistent global Atlas, the bounded inspect-branch map, and one lesson token each have a single assignment/rollback owner under reduced-motion, replacement, failure, and history restoration.
3. The fixed history record, precedence, no-op/push rules, and missing-session fallback are static-host safe and privacy-preserving.
4. The prepare/apply/commit protocol and epoch+generation checks prevent stale renderer readiness, focus/scroll callbacks, local activation, or motion changes from committing an obsolete target.
5. The named lock/close/focus order remains deterministic after removing the outer Explore dialog.
6. The frozen checked-entry list is minimal but lets `.11` add records without changing activation/navigation.
7. The single shared project-links navigation can be moved into the Atlas drawer footer and restored to the Lesson footer with the same placeholder mechanism, avoiding duplicated authority while remaining reachable.

## Execution Handoff

Plan saved to: `.pi/plans/brain-atlas-zmq.24-atlas-home-entry-shell-plan.md`

Recommended next skill after plan approval: `test-driven-development`; use `verification-before-completion` before any completion claim. Implementation is authorized in principle by `brain-atlas-56i` but must not begin until this plan is reviewed and any material gaps are corrected.
