# Retina-to-V1 Scrollytelling Vertical Slice Implementation Plan

**Issue:** `brain-atlas-zmq.5` — Build the retina-to-V1 scrollytelling vertical slice

**Design:** `.pi/plans/brain-atlas-zmq-ux-requirements-roadmap.md`, `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md`, `.pi/plans/brain-atlas-yum.3-model-fidelity-disclosure.md`

**Contract:** `src/lesson/SPEC.md`

**Date:** 2026-07-21

**Status:** Implemented by `brain-atlas-zmq.5`; signed commit and closeout evidence are recorded in Beads.

**Branch:** `feat/retina-v1-lesson`

**Goal:** Present one checked-in retina-to-V1 lesson through the normalized v1 lesson contract, a semantic reading rail, one sticky shared atlas, deterministic scene activation, and capability-equivalent explicit navigation on wide and compact layouts.

**Architecture:** `src/bootstrap.js` becomes the page entry point: it loads the project-authored catalogs and checked-in Obsidian-style lesson, creates the semantic lesson presentation, detects WebGL, and imports the existing `src/main.js` renderer only when available. Pure UI models own Markdown-to-safe-view conversion, fidelity aggregation, and scene hysteresis; DOM presentation code owns semantic elements, focus, scrolling, and disclosure. `src/main.js` remains the single Three.js renderer and may retain its existing legacy viewer-control DOM listeners, but the new lesson presentation communicates with it only through one `createRendererAdapter` integration backed by explicit viewer bindings and a camera-transition clock. Lesson prose and scene-navigation DOM events never enter renderer state, and no new coordinate transform is added.

**Design direction:** Extend the existing dark imaging-console identity as an **editorial scientific instrument**: editorial typography and readable line length for the lesson; data-and-analysis restraint for the stage; cool dark foundations, teal as the one interaction accent, anatomical colors only for represented structures, borders and surface shifts rather than floating glass-card stacks, an 8 px technical radius, and motion only for state explanation or disclosed biological/display models.

**Acceptance Criteria:**
- [x] A checked-in Obsidian-style retina-to-V1 Markdown lesson parses through the same strict v1 catalog path intended for later imports; no second lesson format or vision-specific parser branch is added.
- [x] The reference lesson has an introduction, an unnumbered topic entry view filtered to the relevant pathway, and four discrete instructional scenes for nasal-fibre crossing, LGN relay, optic radiation, and V1 arrival; it explicitly states that uncrossed temporal-retinal paths are omitted from the schematic and does not present the anterior drawing as a complete hemifield projection.
- [x] Wide layout keeps semantic prose and one sticky shared atlas visible together; compact layout stacks a usable stage and prose without horizontal scrolling, fixed-panel overlap, or trapped page scrolling.
- [x] Scrolling activates one scene only after threshold plus hysteresis; incidental reverse motion in the dwell zone does not change scenes or restart activity. Previous and Next target the same scene anchors.
- [x] Re-entry applies the complete authored snapshot. The controller retains pure Restart/Skip variants, but the reference shell does not expose Restart without an authored replay timeline; Skip appears on the stage only during an active transition and settles it rather than accelerating time.
- [x] Camera transition and activity clocks remain independent. Reduced motion applies the settled camera immediately, keeps automatic activity/auto-rotation off, and preserves prose, controls, status, and disclosure.
- [x] During eased scene changes, source and destination filters remain eligible as a union while changed entities cross-fade through the first half; at halfway only destination filters remain. Interrupted forward/back transitions start from current rendered opacity.
- [x] The renderer adapter maps stable catalog IDs to the current layer/region/tract bindings; visibility, global/per-entity hemispheres, cutaway, tissue opacity, playback, selection/emphasis state, active visual/layout, and control policy have explicit binding paths and deterministic capture.
- [x] `guided`, `look`, and `explore` policies are communicated and applied without simulating current panel clicks. Canvas gestures do not prevent ordinary lesson scrolling.
- [x] One persistent **Model & sources** control derives separate geometry and activity statuses from each scene's curated fidelity records; detailed methods, assumptions, uncertainty, material limitations, sources, and licenses preserve scene state and restore focus when closed.
- [x] Loading and no-WebGL paths retain lesson identity, scene prose/summaries, explicit navigation, fidelity status/details, and a settled-stage explanation. The existing Three.js viewer is not imported when WebGL2 is unavailable.
- [x] The existing directed anterior/optic-radiation activity, bidirectional association impulses, SWM vibration, one-MNI-transform rule, and publication/security behavior do not regress.
- [x] Focus, active-scene announcements, explicit navigation focus movement, 200% zoom, touch targets, wide/compact/reduced-motion/no-WebGL behavior, screenshots, tests, build, clean console, documentation, and independent review pass.

**Verification Commands:**

```bash
npm test
npm run build:publish
if rg -n '__view' dist/assets/*.js; then exit 1; fi
if rg -n "eval\\(|new Function|innerHTML|from ['\"]three|import\\(['\"]three" src/ui src/bootstrap.js --glob '*.js'; then exit 1; fi
git diff --check
```

Browser verification must cover the unnumbered entry view, all four numbered scenes, wide scrolling and buttons, dwell-zone hysteresis, deterministic re-entry, controller restart semantics plus transition-only Skip UI, keyboard focus, compact touch/overflow, reduced motion, forced no-WebGL fallback, current activity non-regression, disclosure focus restoration, screenshots, and console errors.

---

## Experience and content decisions

- The initial page opens directly in Lesson mode with the title, purpose, and an unnumbered authored topic view that filters the atlas to the complete relevant pathway. Scrolling into the first instructional section begins scene 1, so the redundant planned Start/Continue button and former meta “start with the pathway” scene were removed from numbered progress after user review. Optional frontmatter `entryScene` preserves this domain-neutral distinction. Explore mode and import remain owned by `brain-atlas-zmq.7` and `.6`.
- The atlas is the only visual in this checked-in lesson. The stage identifies itself directly; a redundant one-item selector was not rendered.
- Scene prose remains normal Markdown rendered through an allowlisted plain-data view model and DOM `textContent`/element creation. No raw HTML or Markdown `innerHTML` path is introduced.
- Scene activation updates a polite live region but does not move focus during ordinary scroll. Previous/Next scroll to the same semantic section and focus its heading only after explicit navigation.
- The initial Restart control was removed after user review because no reference scene defines a replay timeline and the action had no legible spatial effect. Skip transition is stage-local and exists only while a camera transition is active. Play/pause changes modeled activity, not camera completion or page position.
- The existing dense layer console remains reachable as a collapsed **Viewer controls** disclosure for continuity, but authored scenes use renderer bindings directly. Policy cues explain when manual manipulation is unavailable.
- The current association-only disclosure is replaced by scene-driven fidelity content. No scientific prose or citations are duplicated into lesson directives.
- Decision `brain-atlas-jes` hides legacy fixed-anchor labels in all lesson scenes because they overlap and obscure active anatomy; free-viewer labels remain, and responsive placement is tracked by `brain-atlas-zmq.20`.
- The reference lesson does not add the missing uncrossed temporal-retinal geometry under this Bead. It labels the current nasal-only anterior representation as partial and schematic, per `docs/SCIENTIFIC_TRACEABILITY.md` and the Bead comment.

## Scene outline

| Scene | Teaching purpose | Primary visible entities | Fidelity emphasis |
|---|---|---|---|
| Topic entry view (unnumbered) | Establish only the relevant pathway and its cortical context before instruction; filter unrelated atlas layers | cortex, anterior pathway, optic radiation, LGN, V1 | cortex + schematic anterior + atlas regions/tractography |
| Nasal crossing | Show the represented nasal fibres crossing to contralateral LGN; disclose omitted temporal fibres | anterior pathway, LGN | anterior-pathway material limitation |
| LGN relay | Isolate bilateral LGN as the thalamic relay without claiming recorded physiology | cortex, anterior pathway, LGN | Jülich geometry + illustrative activity |
| Optic radiation | Follow real left geometry and mirrored right geometry from LGN toward V1 | cortex, optic radiation, LGN, V1 | data-derived/derived/mirrored geometry + modeled timing |
| V1 arrival | View the posterior landing in bilateral V1 and summarize what the display supports | cortex, optic radiation, V1 | Jülich regions + optic-radiation limits |

Every scene has a complete snapshot. Omitted association/SWM entities are hidden rather than implicitly inherited.

## Runtime state boundaries

- **Authored state:** normalized frozen snapshot from `parseLesson`.
- **Active lesson state:** active scene index/ID, activation reason, restart generation, and skip state; plain and renderer-independent.
- **Renderer target state:** canonical snapshot last accepted by `createRendererAdapter`.
- **Transient render state:** camera interpolation progress, first-half source/destination visibility union and per-entity opacity, activity event pools, OrbitControls damping, and loaded Three.js objects; never serialized into a lesson.
- **DOM state:** scroll positions, focus, open disclosure, loading/fallback copy; never written back into authored state.

Scene re-entry always begins from authored state. Restart/skip derive short-lived canonical variants through existing pure commands; they never mutate the lesson object.

## Tasks

### Task 1: Define pure lesson-presentation models [Independent]

**Context:** Implement deterministic behavior before DOM or Three.js wiring. Keep `src/lesson/` unchanged except where an actual contract defect is proven; presentation belongs under `src/ui/`.

**Files:**
- Create: `src/ui/scene-navigation.js`
- Create: `src/ui/markdown-view-model.js`
- Create: `src/ui/fidelity-view-model.js`
- Create: `test/scene-navigation.test.js`
- Create: `test/markdown-view-model.test.js`
- Create: `test/fidelity-view-model.test.js`

**Steps:**
1. Write failing scene-navigation tests for one active scene, forward/back threshold hysteresis, large scroll jumps, dwell-zone stability, explicit Previous/Next bounds, activation reasons, and no restart on unchanged activation.
2. Implement the smallest plain-state navigator. Feed it viewport-relative scene-anchor positions; do not access `window`, observers, or elements in the model.
3. Write failing Markdown view-model tests for semantic headings, paragraphs, emphasis, lists, code, safe links, reference links, line breaks, inert unsupported nodes, and no executable/raw-HTML output. Convert validated Markdown into a frozen allowlisted plain tree; never serialize author content to an HTML string or use an `innerHTML` insertion path. Task 4 may create trusted DOM elements with `document.createElement` and assign author text only through `textContent`/attributes.
4. Write failing fidelity view-model tests for ordered scene records, separate deduplicated geometry/activity statuses, explicit Activity: None, assumptions/uncertainty/material-limitations, source/license links, and unknown-record failure.
5. Implement immutable view models using the existing remark parser and catalog records.

**Focused verification:**

```bash
node --test test/scene-navigation.test.js test/markdown-view-model.test.js test/fidelity-view-model.test.js
```

**Expected result:** Scroll decisions, prose structures, and disclosure content are deterministic plain data with no DOM, Three.js, or executable output.

### Task 2: Add and validate the reference lesson [Depends on: Task 1]

**Context:** Exercise the shipped parser/catalog path with real curriculum content before rendering it. The lesson is project-authored but must satisfy the same strict trust boundary as later imports.

**Files:**
- Create: `src/lessons/retina-to-v1.md`
- Create: `test/reference-lesson.test.js`
- Test: `public/data/entities.json`
- Test: `public/data/fidelity.json`
- Read/verify: `docs/SCIENTIFIC_TRACEABILITY.md`

**Steps:**
1. Write a failing reference-lesson test requiring the entry-view ID plus four instructional scene IDs/order, complete normalized snapshots, atlas-only visual, expected stable entities, curated fidelity IDs, material anterior omission disclosure, optic-radiation mirrored/illustrative disclosure, and a nonempty settled summary for no-WebGL use.
2. Author the smallest scientifically honest lesson using Obsidian-style frontmatter and `atlas-scene` directives. Keep citations/provenance in fidelity records; use prose only for teaching and one first-use contextual limitation note.
3. Parse the file from disk against current catalogs in Node and deep-freeze the normalized result.
4. Verify no scene references association-tract endpoint relationships or characterizes illustrative timing as measured physiology.

**Focused verification:**

```bash
node --test test/reference-lesson.test.js test/catalog.test.js test/lesson-parser.test.js
```

**Expected result:** One curriculum file with an unnumbered entry view plus four instructional scenes parses through the v1 contract and exposes the known anterior/optic-radiation limits without scientific overclaim.

### Task 3: Implement tested viewer bindings and camera transitions [Depends on: Tasks 1-2]

**Context:** Wire complete canonical state to the existing shared renderer without DOM-event simulation. Preserve `mniGroup` and `sceneFromMni` exactly. A camera transition is transient render state; canonical capture remains the accepted target snapshot.

**Files:**
- Create: `src/viewer/camera-transition.js`
- Create: `src/viewer/lesson-bindings.js`
- Create: `test/camera-transition.test.js`
- Create: `test/lesson-bindings.test.js`
- Modify: `src/main.js`
- Test: `src/lesson/renderer-adapter.js`

**Steps:**
1. Write failing camera tests for exact start/end, bounded eased interpolation, retargeting from the current rendered pose, independent wall-clock delta, instant/reduced-motion application, and completion after long frames.
2. Implement a renderer-neutral vector transition model; `src/main.js` converts arrays to existing Three.js camera/target vectors.
3. Write failing generic binding tests that map all stable entity kinds to renderer IDs; hide omitted entities; reset stale hemisphere overrides; map cutaway 0–100 to the existing clip plane; map opacity/playback/selection/visual/policy; capture the complete accepted target; and fail unsupported visuals rather than silently no-op.
4. Implement `createLessonViewerBindings(dependencies, catalog)` with injected renderer operations and no Three.js import. Keep actual Three.js object lookup and material emphasis in `src/main.js`.
5. Add a renderer-readiness promise after region and tract catalogs are bound. Export one async adapter factory from `src/main.js`; do not expose renderer objects in canonical state.
6. Apply visibility independently of the legacy panel; synchronize visible controls afterward rather than dispatching click/change events.
7. Advance camera interpolation in the existing animation loop before controls/render. Enforce `guided`, `look`, and `explore` OrbitControls capabilities and canvas touch-action cues. Disable the legacy Viewer-controls fieldset when the active lesson policy does not permit those mutations; do not leave a second uncontrolled path around canonical scene state.
8. Reset transient anterior/optic activity for scene restart/re-entry and apply a settled, nonplaying state for Skip/reduced motion without modifying association/SWM representation rules.

**Focused verification:**

```bash
node --test test/camera-transition.test.js test/lesson-bindings.test.js test/renderer-adapter.test.js
npm test
```

**Expected result:** Every canonical axis has a tested explicit binding, camera motion is independent of scroll/activity, and the current renderer keeps one coordinate transform.

### Task 4: Build the semantic lesson shell and responsive interaction [Depends on: Tasks 1-3]

**Context:** Compose the checked-in lesson, one canvas, and existing controls into the approved editorial-scientific layout. No framework, external-image support, import editor, Explore pop-out, or entity inspector is added here.

**Files:**
- Create: `src/bootstrap.js`
- Create: `src/ui/lesson-presentation.js`
- Create: `src/ui/fidelity-disclosure.js`
- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `src/main.js`
- Test: pure view-model/navigation tests from Tasks 1-3

**Steps:**
1. Replace the module entry with `src/bootstrap.js` and move the stylesheet import there so no-WebGL mode is styled without loading Three.js. Load entity/fidelity JSON and `src/lessons/retina-to-v1.md?raw`, validate them, and render loading/ready/error states. Probe WebGL2 on a temporary canvas, explicitly release the probe context, and import `src/main.js` only when supported; an import/renderer-initialization rejection transitions to the same readable fallback instead of becoming an unhandled error.
2. Build semantic landmarks, lesson introduction, scene sections/headings, active visual status, one-item visual selector, policy cue, progress, Previous/Next, conditional Restart/Skip, live announcement, fidelity control/panel, no-WebGL fallback, and collapsed Viewer controls using element creation and `textContent` only.
3. Connect a passive scroll listener/requestAnimationFrame to the pure navigator. Use semantic scene section anchors; avoid continuous camera scrubbing. Explicit Previous/Next use the same anchors and focus destination headings after scrolling settles.
4. Derive restart and settled variants with pure scene commands, apply through the single adapter, and preserve active scene/scroll position.
5. Implement disclosure open/close/Escape/focus restoration. Wide layout is nonmodal; compact layout contains focus while open and exposes an explicit Close button.
6. Restyle the page with a readable editorial rail and borders-only technical stage. Keep the stage sticky within lesson bounds, not fixed over the document. Use container/media queries for capability-preserving wide/compact composition, 4 px spacing increments, 8 px radii, visible focus, 44 px touch targets, 200% zoom resilience, and no horizontal overflow.
7. Keep canvas wheel/touch behavior policy-aware so normal lesson scrolling wins. Preserve one renderer/canvas and the current control IDs consumed only by `src/main.js`'s existing legacy viewer-control listeners. New lesson buttons never dispatch synthetic events to those controls; they call the adapter/controller boundary.
8. Add development-only plain diagnostics to `window.__view.lesson` for active scene, activation count/reason, applied snapshot, transition state, fallback state, and scene anchors; confirm production stripping.

**Focused verification:**

```bash
npm test
npm run build:publish
```

**Expected result:** The lesson renders from normalized data, scene state changes discretely by scroll or controls, and wide/compact/no-WebGL/reduced-motion paths retain equivalent learning content.

### Task 5: Verify, document, review, and close [Depends on: Tasks 1-4]

**Context:** This is the first integrated learner-facing slice and needs behavioral, responsive, scientific, and renderer regression evidence. Final aesthetic polish remains iterative, but the approved interaction hierarchy and capability parity are release requirements.

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `skills/user.md`
- Modify: `AGENTS.md` only for new durable runtime boundaries
- Modify: `.pi/plans/brain-atlas-zmq.5-retina-v1-vertical-slice-plan.md` status/implementation record
- Update: `docs/SCIENTIFIC_TRACEABILITY.md` only if learner-facing claims or record projection change

**Steps:**
1. Document current Lesson mode, checked-in content path, bootstrap/no-WebGL boundary, scroll controller, one-canvas renderer adapter, control policies, responsive behavior, and deferred import/Explore/inspector work.
2. Run all tests, publication build, production debug-hook search, dependency audit, structural security/one-transform searches, local documentation links, and diff checks. Any audit finding fails the clean gate until its reachability and severity are explicitly triaged; do not ignore noisy output or imply that an unreviewed finding is harmless.
3. Run instrumented wide-browser checks for the entry view and all four instructional scenes by scrolling and controls; hysteresis/dead-zone stability; re-entry; controller Restart and transition-only Skip behavior; camera/activity independence; policy gestures; disclosure state/focus; layer visibility; one canvas; and no console errors.
4. Run compact touch/390 px and 200% zoom checks for no horizontal overflow, usable prose/stage, touch targets, scroll continuity, controls, and compact disclosure containment/restoration.
5. Run reduced-motion checks for immediate settled camera, disabled automatic activity/auto-rotation, all prose/status/disclosure, and stable navigation.
6. Force no-WebGL before renderer import and confirm no Three.js request/exception, readable scene summaries, all navigation/status/disclosure, and recovery copy.
7. Capture representative wide and compact screenshots and visually review text hierarchy, anatomical legibility, warning prominence, stage/prose balance, and state clarity.
8. Run model-diverse code/UX/scientific review. Verify serious findings against source and browser evidence; correct them before closeout.
9. Mark this plan Implemented, close `brain-atlas-zmq.5`, and create a signed focused commit only after all checks pass.

**Focused verification:**

```bash
npm test
npm run build:publish
npm audit --omit=dev
if rg -n '__view' dist/assets/*.js; then exit 1; fi
if rg -n "eval\\(|new Function|innerHTML|from ['\"]three|import\\(['\"]three" src/ui src/bootstrap.js --glob '*.js'; then exit 1; fi
git diff --check
```

**Expected result:** Automated, browser, screenshot, documentation, and independent-review evidence supports every acceptance criterion with no regression to renderer fidelity or current activity models.

## File conflicts

Tasks are serial. `src/main.js` is shared by Tasks 3-4; presentation work begins only after the adapter/readiness boundary is green. `index.html` and `src/style.css` are Task 4-owned until Task 5 documentation/verification. Pure Task 1 modules can be reviewed independently but should not be implemented in parallel with changing scene semantics.

## Explicit non-goals

- No paste/file import editor, remote-image CSP expansion, or external image fetch (`brain-atlas-zmq.6`).
- No free-exploration pop-out or authored-state return workflow (`brain-atlas-zmq.7`).
- No canvas entity hit testing, cited entity inspector, or search (`brain-atlas-zmq.8`, `.10`, `.12`).
- No replacement temporal-retinal geometry, right optic-radiation tractography, tract endpoint inference, runtime registration, or second coordinate transform.
- No UI framework, router, global state library, Cucumber runner, plugin system, service, backend, or WebAssembly.

## Execution handoff

Plan saved to: `.pi/plans/brain-atlas-zmq.5-retina-v1-vertical-slice-plan.md`.

Recommended next skill: `test-driven-development` for each behavior task; `verification-before-completion` before closing `brain-atlas-zmq.5`.

## Implementation record

Implemented on `feat/retina-v1-lesson` through `brain-atlas-zmq.5`. The shipped slice includes:

- one unnumbered, pathway-filtered topic entry view plus four instructional scenes;
- semantic safe-DOM prose, one shared responsive Three.js stage, fixed-position explicit navigation, and readable no-WebGL fallback;
- renderer-independent navigation, presentation, fidelity, camera, controller, and visibility models;
- target-centered current-pose camera orbits with quintic endpoint smoothing and first-half anatomy crossfades;
- progressive wide/compact fidelity disclosure with compact modal containment and exact focus/scroll restoration;
- reduced-motion settlement and live preference recovery without changing scientific activity semantics;
- synchronized current/public architecture, traceability, contributor, user, and subsystem documentation.

Final evidence: 96/96 Node tests; publication build; both dependency audits with zero vulnerabilities; production debug-hook/CSP structural checks; wide/compact/short/200%-equivalent/touch/reduced-motion/no-WebGL/loading/interruption browser checks; model-diverse review with final GPT-5.6 Sol PASS; code-simplification and architecture spikes; requirements audit; retrospective. The signed commit hash and clean-worktree/signature evidence are recorded in the Bead closeout.
