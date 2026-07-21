# Lesson Presentation Models

## Purpose

`src/ui/` contains renderer-independent presentation and interaction models used by
`src/bootstrap.js` to turn a validated lesson into a responsive reading experience.
It owns semantic Markdown view data, scene-navigation hysteresis, fidelity aggregation,
scene-controller state, and camera-transition math. It does not own the DOM, Three.js,
scientific catalogs, authored lesson state, or anatomical coordinates.

## Core Mechanism

1. `parseLesson` and `createLessonCatalog` establish trusted frozen input under
   `src/lesson/SPEC.md`.
2. `markdownToViewModel` converts validated Markdown into an allowlisted frozen plain
   tree. `src/bootstrap.js` creates elements and inserts text; author content never
   becomes an HTML string.
3. `createLessonPresentation` separates an optional authored entry scene from numbered
   instructional scenes. `createSceneNavigationState`, `updateSceneFromScroll`, and
   `moveScene` use index `-1` only for that pre-scroll entry view, then apply directional
   hysteresis and bounded explicit movement across numbered scenes.
4. `createLessonSceneController` waits for renderer readiness, initializes from the
   current navigation index if reading advanced during renderer loading, applies complete
   authored entry/scene snapshots through one adapter, and derives transient
   reduced-motion/Restart/Skip variants without mutating the lesson.
5. `createFidelityViewModel` resolves only curated fidelity records and keeps geometry
   and activity statuses separate.
6. `createCameraTransition` samples either a linear pose or an orbit path with a quintic smootherstep spline, giving velocity and acceleration zero endpoints. Lesson camera bindings use the orbit path so the current camera offset rotates around the interpolated target; interrupted forward/back motion begins at the current pose.
7. `createVisibilityTransition` keeps the source/destination filter union logically eligible during the first half of a scene transition while cross-fading changed entities; at halfway, only the destination set remains. Interruption begins from current rendered opacity.

**Key files:**

- `lesson-presentation.js` — entry-view and numbered-scene projection.
- `scene-navigation.js` — pure entry restoration, directional hysteresis, and Previous/Next state.
- `lesson-scene-controller.js` — entry/scene readiness, activation, Restart/Skip, reduced motion.
- `camera-transition.js` — deterministic easing and pivot-preserving orbit sampling.
- `visibility-transition.js` — deterministic filter-union and opacity cross-fade sampling.
- `markdown-view-model.js` — allowlisted semantic Markdown plain data.
- `fidelity-view-model.js` — scene fidelity status/detail projection.
- `src/bootstrap.js` — DOM consumer, WebGL gate, focus, scrolling, responsive disclosure.
- `src/main.js#createLessonRendererAdapter` — the only concrete Three.js consumer.

## Public Interface

| Export | Used by | Contract |
|---|---|---|
| `createLessonPresentation(lesson)` | bootstrap/tests | Separates a validated optional entry scene from at least one numbered instructional scene. |
| `createSceneNavigationState(count, initial?)` | bootstrap/tests | Frozen state with one bounded numbered index, or `-1` only when initialized with an entry view. |
| `updateSceneFromScroll(state, metrics)` | bootstrap/tests | Applies forward/back thresholds and hysteresis; records scroll direction without restarting unchanged scenes. |
| `moveScene(state, delta)` | bootstrap/tests | Accepts only `-1`/`1`; clamps at lesson bounds and returns the same object at a boundary. |
| `createLessonSceneController(options)` | bootstrap/tests | Applies complete snapshots only after readiness; exposes frozen state and explicit activate/restart/skip/motion-preference methods. |
| `createCameraTransition(options)` | main/tests | Copies/freeze poses and timing; supports `linear` or `orbit` paths. |
| `sampleCameraTransition(transition, time)` | main/tests | Returns deterministic position, target, progress, and completion with no scheduler or renderer dependency. |
| `createVisibilityTransition(options)` | main/tests | Freezes current entity opacities, destination IDs, and timing for a first-half cross-fade. |
| `sampleVisibilityTransition(transition, time)` | main/tests | Returns destination/union eligibility and per-entity opacity; completion occurs at transition halfway. |
| `markdownToViewModel(source)` | bootstrap/tests | Frozen allowlisted plain tree; rejects raw HTML and unsafe URLs defensively. |
| `createFidelityViewModel(input, catalog)` | bootstrap/tests | Frozen scene records with separate ordered geometry/activity statuses; unknown records fail. |

## Invariants

| ID | Invariant | Enforcement | Why it matters |
|---|---|---|---|
| INV-1 | `src/ui/` imports neither Three.js nor DOM globals and performs no coordinate transform. | structural search + tests | Presentation scales to future tutorials without duplicating the renderer or MNI transform. |
| INV-2 | Author text is plain data; raw HTML, executable URLs, and serialized HTML output are forbidden. | Markdown tests + bootstrap review | Validated lessons cannot become an injection path. |
| INV-3 | Exactly one numbered scene is active after entry; the explicit `-1` entry state activates no numbered card. Ordinary scroll never moves focus; explicit navigation scrolls and focuses the destination heading below any sticky compact stage. | presentation/navigation tests + browser checks | The topic view is not misrepresented as lesson content, while scroll and keyboard/touch controls remain equivalent and visible. |
| INV-4 | Hysteresis is directional: a next anchor must cross the forward threshold, while a current anchor must cross a separate backward threshold. | navigation tests | Minor reverse motion does not flicker or restart a scene. |
| INV-5 | Unchanged activation never reapplies/restarts a scene. Re-entry applies the complete authored snapshot. | controller tests | No hidden state leaks between scenes. |
| INV-6 | Controller Restart and Skip variants never mutate lesson data or move lesson position. The reference shell omits Restart until a scene has an authored replay timeline and exposes Skip only during an active transition; Skip applies the authored destination camera instantly and settles activity. Reduced motion does the same for every activation, and live preference changes reapply the latest authored playback state. | controller tests + reduced-motion/browser smoke | Controls remain truthful and motion behavior stays predictable when system preferences change. |
| INV-7 | Geometry and activity statuses remain separate; `None` is explicit when a scene has no activity. Unknown fidelity IDs fail. | fidelity tests | Data-derived anatomy cannot falsely validate modeled physiology. |
| INV-8 | Orbit transitions rotate around the interpolated target, use a zero-endpoint-velocity/acceleration quintic spline, and initialize from the current rendered pose in either direction. OrbitControls damping is disabled while the lesson adapter owns the camera so residual momentum cannot move an authored endpoint. | camera tests + browser frame sampling | Camera motion stays centered and starts/stops without a visible velocity jolt or post-transition drift. |
| INV-9 | The DOM shell remains usable before/without WebGL; Three.js loads only after a successful probe. | no-WebGL browser smoke | Scientific content and disclosures do not depend on GPU capability. |
| INV-10 | Compact disclosure is modal: background/skip-link content is inert, page scrolling is locked, visible focusables cycle inside, and wide↔compact breakpoint changes resynchronize semantics and focus. Wide disclosure is nonmodal. Close restores exact scroll position and trigger focus. | bootstrap review + browser checks | Progressive disclosure remains accessible without resetting spatial context or leaking keyboard/touch input. |
| INV-11 | Changed source/destination filters remain logically eligible as a union while their opacity crosses during the first half; at halfway only destination filters remain. Reverse/interrupted motion starts at current opacity. | visibility tests + browser instrumentation | New anatomy does not pop in, old anatomy does not disappear at transition start, and rapid navigation does not reset fades. |
| INV-12 | An optional entry scene supplies the pre-scroll topic view without appearing in scene count/progress; crossing the first anchor starts scene 1, and reverse scroll/Previous restores the exact entry snapshot. | presentation, navigation, controller, and browser tests | The lesson starts with content rather than a meta scene while preserving a relevant default atlas view. |
| INV-13 | Non-Explore policies set canvas touch behavior to vertical page scrolling and disable touch pan/zoom/rotation; `look` may still accept mouse/trackpad orbit. Only explicit `explore` may capture touch gestures. | renderer binding review + compact touch browser check | Swiping the visible stage never traps lesson reading or moves the camera accidentally. |

## Failure Modes

| ID | Symptom | Cause | Required response |
|---|---|---|---|
| FAIL-1 | Scene oscillates near a boundary | One threshold or position-only activation replaced directional hysteresis | Restore `updateSceneFromScroll`; add a dwell-zone regression test. |
| FAIL-2 | Activity restarts while dwelling | UI calls controller for an unchanged index | Preserve identity/count checks before `activate`. |
| FAIL-3 | Camera flips near an overhead view | Destination crosses the OrbitControls polar/azimuth seam | Use a dorsal-oblique endpoint and pivot-preserving orbit; do not patch with an arbitrary final-frame rotation. |
| FAIL-4 | Camera rotates around empty space | Position and orientation are interpolated independently | Orbit current offset around the canonical target and keep look direction on that pivot. |
| FAIL-5 | Renderer applies a partial/old scene | UI bypasses the renderer adapter or simulates legacy control events | Apply one complete canonical snapshot; surface adapter diagnostics. |
| FAIL-6 | Browser CSP reports `unsafe-eval` | Runtime imported compiling Ajv instead of standalone validators | Follow `src/lesson/SPEC.md` INV-11; do not relax CSP. |
| FAIL-7 | No-WebGL page is blank or downloads Three.js | Bootstrap imports renderer before capability detection | Keep lesson rendering before `probeWebGL2` and dynamic import afterward. |
| FAIL-8 | Compact sheet leaks focus/page scroll or loses focus across a breakpoint | Hidden `<details>` links counted as focusable, background not inert, or modal semantics applied only at open time | Trap visible focusables only, inert/lock the background, resynchronize on media-query change, and restore scroll plus `#model-sources-trigger` on close. |
| FAIL-9 | Anatomy pops at scene activation or during reverse navigation | Destination visibility applied atomically or fade restarts at opacity 0/1 | Sample current opacity, apply the source/destination union, and remove source-only filters at halfway. |
| FAIL-10 | Topic overview appears as scene 1 or disappears on reverse scroll | UI numbers every authored scene or controller lacks entry state | Project `entrySceneId` before navigation and preserve `-1` through presentation/controller boundaries. |
| FAIL-11 | Prose advances while loading but anatomy opens on another scene | Controller always initializes at entry/scene 0 after navigation already changed | Pass the validated current navigation index into controller construction before `setReady`. |
| FAIL-12 | Vertical touch scroll also rotates or traps the camera | OrbitControls retains its default touch rotation/capture in `guided` or `look` | Map non-Explore one-finger touch to disabled pan and use `touch-action: pan-y`; reserve rotation/dolly touch mappings for `explore`. |

## Decision Framework

| Situation | Action | Spec item |
|---|---|---|
| Add a tutorial | Author contract-valid Markdown/catalog references; reuse these models and bootstrap surfaces. | INV-1–INV-7 |
| Add a scene activation source | Convert it to an index/reason and call the same controller; do not add a renderer path. | INV-3, INV-5 |
| Change camera motion | Preserve target-centered current-pose initialization and add forward/back/pole tests. | INV-8, FAIL-3/4 |
| Add rendered Markdown syntax | Add a plain view-model node and safe DOM mapping together; never use `innerHTML`. | INV-2 |
| Add disclosure data | Update scientific traceability and curated fidelity records; do not place citations in directives. | INV-7 |
| Add free exploration | Use a canonical cloned snapshot and explicit return; enable legacy controls only under `explore`. | INV-5 |

## Testing

```bash
node --test test/scene-navigation.test.js test/lesson-scene-controller.test.js \
  test/camera-transition.test.js test/visibility-transition.test.js \
  test/markdown-view-model.test.js test/fidelity-view-model.test.js \
  test/lesson-presentation.test.js test/reference-lesson.test.js
```

| Spec item | Verification |
|---|---|
| INV-2 | `test/markdown-view-model.test.js` + structural `rg` |
| INV-3, INV-4, INV-12 | `test/lesson-presentation.test.js`, `test/scene-navigation.test.js` + wide/compact browser navigation |
| INV-5, INV-6 | `test/lesson-scene-controller.test.js` + Restart/Skip/reduced-motion smoke |
| INV-7 | `test/fidelity-view-model.test.js` + disclosure browser checks |
| INV-8 | `test/camera-transition.test.js`, reference camera-seam test, frame sampling |
| INV-9 | forced `?no-webgl=1` browser check and resource inventory |
| INV-11 | `test/visibility-transition.test.js` + rendered opacity/reverse browser sampling |
| INV-10 | wide/compact disclosure focus checks |
| INV-13 | compact touch gesture starts on canvas, scrolls the page, and leaves camera pose unchanged |

Full repository verification remains `npm test && npm run build:publish` plus
wide, compact, reduced-motion, no-WebGL, and production-hook browser checks.

## Dependencies

| Dependency | Type | Contract |
|---|---|---|
| `src/lesson/SPEC.md` | internal | Validated frozen lesson/catalog/snapshot inputs and one renderer port. |
| `remark-parse`, `unified` | external | Markdown AST consumed by the plain view-model converter. |
| `src/bootstrap.js` | internal consumer | Semantic DOM, focus, responsive states, WebGL gate. |
| `src/main.js` | renderer consumer | One Three.js adapter and shared animation frame. |
| `docs/SCIENTIFIC_TRACEABILITY.md` | authority | Fidelity wording, assumptions, limitations, and gap owners. |
| `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md` | design | Approved journeys, responsive behavior, and accessibility baseline. |
