# Lesson Presentation Models

## Purpose

`src/ui/` contains renderer-independent presentation and interaction models used by
`src/bootstrap.js` to turn a validated lesson into a responsive reading experience.
It owns semantic Markdown view data, scene-navigation hysteresis, fidelity aggregation,
scene-controller state, camera-transition math, pure lesson-scroll-surface math, and canonical Atlas/workspace snapshots. It does not own the DOM, Three.js,
scientific catalogs, authored lesson state, or anatomical coordinates.

## Core Mechanism

1. `parseLesson` and `createLessonCatalog` establish trusted frozen input under
   `src/lesson/SPEC.md`.
2. `markdownToViewModel` converts validated Markdown into an allowlisted frozen plain
   tree. `src/bootstrap.js` creates elements and inserts text; author content never
   becomes an HTML string.
3. `createLessonPresentation` separates an optional authored entry scene from numbered
   instructional scenes and projects explicit lifecycle `status` plus its visible label
   without parsing the title or prose. `createSceneNavigationState`, `updateSceneFromScroll`, and
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
8. Scroll-surface helpers translate viewport rectangles into the one explicit lesson surface's coordinate system and identify only those standard page-scroll keys that need bridging from the fixed shell. They do not read the DOM or schedule scrolling.
9. `validateLessonImport` bounds untrusted local source, composes the same strict parser and presentation path used by checked-in content, and returns either frozen diagnostics or a frozen candidate plus a host-disclosing preview. It never activates a lesson or reads a file. `createLessonRuntimeCatalog` immutably extends only the base visual-ID allowlist so a validated imported snapshot can pass the same renderer-adapter boundary.
10. Explore helpers derive either a scene snapshot with the actual rendered camera or the complete-atlas default, apply allowlisted command batches only after synchronizing that camera, project truthful panel state by stable entity ID, and resolve fidelity records from visible entities plus approved context records.
11. Workspace helpers project checked drawer records, validate static-safe query/history intent, synchronize persistent Atlas cameras, and create complete lesson-resume or scene-inspection tokens. Bootstrap alone owns candidate maps, History API effects, DOM moves, and transition epochs.

**Key files:**

- `lesson-presentation.js` — entry-view and numbered-scene projection.
- `scene-navigation.js` — pure entry restoration, directional hysteresis, and Previous/Next state.
- `lesson-scene-controller.js` — entry/scene readiness, activation, Restart/Skip, reduced motion.
- `camera-transition.js` — deterministic easing and pivot-preserving orbit sampling.
- `visibility-transition.js` — deterministic filter-union and opacity cross-fade sampling.
- `scroll-surface.js` — pure surface-relative coordinates and fixed-shell keyboard intent.
- `lesson-import.js` — bounded all-or-nothing local-source validation, preview metadata, and lesson-scoped renderer catalog derivation.
- `explore-session.js` — canonical scene/global Atlas snapshots, camera-first command batching, panel projection, and fidelity aggregation.
- `workspace-session.js` — checked drawer records, query/history validation, Atlas capture, lesson resume tokens, and scene-inspection capture.
- `markdown-view-model.js` — allowlisted semantic Markdown plain data.
- `fidelity-view-model.js` — scene fidelity status/detail projection.
- `src/bootstrap.js` — DOM consumer, WebGL gate, focus, scrolling, responsive disclosure.
- `src/main.js#createLessonRendererAdapter` — the only concrete Three.js consumer.

## Public Interface

| Export | Used by | Contract |
|---|---|---|
| `createLessonPresentation(lesson)` | bootstrap/tests | Separates a validated optional entry scene from at least one numbered instructional scene and exposes `status` plus `[DRAFT]` label data. |
| `createSceneNavigationState(count, initial?)` | bootstrap/tests | Frozen state with one bounded numbered index, or `-1` only when initialized with an entry view. |
| `updateSceneFromScroll(state, metrics)` | bootstrap/tests | Applies forward/back thresholds and hysteresis; records scroll direction without restarting unchanged scenes. |
| `moveScene(state, delta)` | bootstrap/tests | Accepts only `-1`/`1`; clamps at lesson bounds and returns the same object at a boundary. |
| `createLessonSceneController(options)` | bootstrap/tests | Applies complete snapshots only after readiness; exposes frozen state and explicit activate/restart/skip/motion-preference methods. |
| `createCameraTransition(options)` | main/tests | Copies/freeze poses and timing; supports `linear` or `orbit` paths. |
| `sampleCameraTransition(transition, time)` | main/tests | Returns deterministic position, target, progress, and completion with no scheduler or renderer dependency. |
| `createVisibilityTransition(options)` | main/tests | Freezes current entity opacities, destination IDs, and timing for a first-half cross-fade. |
| `sampleVisibilityTransition(transition, time)` | main/tests | Returns destination/union eligibility and per-entity opacity; completion occurs at transition halfway. |
| `relativeAnchorTops(tops, surfaceTop)` | bootstrap/tests | Converts viewport-relative scene-anchor rectangles into the explicit scroll surface's viewport coordinates. |
| `targetScrollTop(metrics)` | bootstrap/tests | Computes and clamps an explicit-navigation destination in surface scroll coordinates. |
| `pageScrollKeyAction(input)` | bootstrap/tests | Bridges standard page-scroll intent only from fixed-shell/page context; yields to native scroll contexts, controls, modifiers, and modals. |
| `validateLessonImport(source, catalog)` | bootstrap/tests | Enforces the 512 KiB source limit, runs strict lesson and presentation validation, and returns frozen diagnostics or a frozen candidate summary with external image hosts; it performs no activation, file I/O, or network request. |
| `createLessonRuntimeCatalog(catalog, lesson)` | bootstrap/tests | Returns a deeply frozen catalog view whose visual IDs are the sorted union of the base allowlist and already-validated lesson declarations; it does not mutate the shared catalog. |
| `createSceneExploreSnapshot(snapshot, camera, catalog)` | bootstrap/tests | Returns a complete frozen scene-derived working snapshot with actual rendered camera and full Explore controls. |
| `createAtlasExploreSnapshot(catalog)` | bootstrap/tests | Returns the versioned complete-atlas default: all base entities except labels, home camera, bilateral visibility, no cutaway/selection, requested activity, and full controls. |
| `applyExploreCommands(snapshot, commands, camera, catalog)` | bootstrap/tests | Synchronizes actual camera first, then applies an allowlisted command batch without mutating the input. |
| `createExplorePanelModel(snapshot, catalog)` | bootstrap/tests | Projects frozen layer/hemisphere/display/playback state keyed by stable entity ID and renderer binding. |
| `exploreFidelityIds(snapshot, catalog, included?)` | bootstrap/tests | Returns the validated sorted union of visible-entity and context fidelity records. |
| `createCheckedLessonEntry(input)` | bootstrap/tests | Projects one frozen drawer record from validated checked candidate metadata without retaining lesson source/data. |
| `parseWorkspaceLocation(input)` / `workspaceUrl(input)` / `createHistoryIntent(input)` | bootstrap/tests | Validate small static-safe Atlas/checked/local/inspection navigation intent; source and snapshots never enter URL/history. |
| `captureAtlasSnapshot(snapshot, camera, catalog)` | bootstrap/tests | Substitutes the actual rendered camera into complete canonical Atlas state without mutating it. |
| `createLessonResumeToken(input, catalog)` | bootstrap/tests | Validates and freezes the single stable in-memory lesson restoration token; excludes transient particles and source. |
| `createSceneInspectionSnapshot(snapshot, camera, catalog)` | bootstrap/tests | Creates a full-control temporary Atlas branch from effective lesson state and rendered camera. |
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
| INV-7 | Geometry and activity statuses remain separate inside **Model & sources**; `None` is explicit when a scene has no activity. Unknown fidelity IDs fail. Canvas badges, persistent stage rows, and global progress/status strips must not duplicate that disclosure. | fidelity tests + browser shell checks | Data-derived anatomy cannot falsely validate modeled physiology, and redundant chrome cannot compete with the spatial lesson. |
| INV-8 | Orbit transitions rotate around the interpolated target, use a zero-endpoint-velocity/acceleration quintic spline, and initialize from the current rendered pose in either direction. OrbitControls damping is disabled while the lesson adapter owns the camera so residual momentum cannot move an authored endpoint. | camera tests + browser frame sampling | Camera motion stays centered and starts/stops without a visible velocity jolt or post-transition drift. |
| INV-9 | The DOM shell remains usable before/without WebGL; Three.js loads only after a successful probe. | no-WebGL browser smoke | Scientific content and disclosures do not depend on GPU capability. |
| INV-10 | Compact disclosure is modal: background/skip-link content is inert, `#page-scroll` is locked, visible focusables cycle inside, and wide↔compact breakpoint changes resynchronize semantics and focus. Wide disclosure is nonmodal. Close restores exact surface position and trigger focus. | bootstrap review + browser checks | Progressive disclosure remains accessible without resetting spatial context or leaking keyboard/touch input. |
| INV-11 | Changed source/destination filters remain logically eligible as a union while their opacity crosses during the first half; at halfway only destination filters remain. Reverse/interrupted motion starts at current opacity. | visibility tests + browser instrumentation | New anatomy does not pop in, old anatomy does not disappear at transition start, and rapid navigation does not reset fades. |
| INV-12 | An optional entry scene supplies the pre-scroll topic view without appearing in scene count/progress; crossing the first anchor starts scene 1, and reverse scroll/Previous restores the exact entry snapshot. | presentation, navigation, controller, and browser tests | The lesson starts with content rather than a meta scene while preserving a relevant default atlas view. |
| INV-13 | Non-Explore policies set canvas touch behavior to vertical `#page-scroll` movement and disable touch pan/zoom/rotation; `look` may still accept mouse/trackpad orbit. Only explicit `explore` may capture touch gestures. | renderer binding review + compact touch browser check | Swiping the visible stage never traps lesson reading or moves the camera accidentally. |
| INV-14 | Explicit lesson lifecycle `draft` projects to textual `[DRAFT]` identity in the document title, global lesson header, and introduction in rendered and no-WebGL paths; it is never merged with geometry/activity fidelity. | presentation/reference tests + wide/compact/no-WebGL browser checks | Learners can distinguish unfinished curriculum from model/data limitations, and future Home/library surfaces receive stable status data. |
| INV-15 | One named, focusable below-header lesson surface owns vertical scrolling. Scene anchors, explicit destinations, focus settlement, and compact disclosure restoration use its `scrollTop` and viewport, while browser-root scroll remains zero. | scroll-surface tests + Firefox/Chromium browser checks | Root-scroll compositing cannot displace the fixed shell, and every navigation source shares one coordinate system. |
| INV-16 | Standard PageDown/PageUp/Home/End/Space intent from fixed-shell page context reaches the lesson surface, while native scroll contexts, interactive/editable controls, modifiers, and modal state retain their own keyboard behavior. | scroll-surface tests + keyboard browser checks | Replacing root scroll must not remove ordinary keyboard reading or hijack controls. |
| INV-17 | Local import validation is bounded, pure, all-or-nothing, and uses the same parser/presentation path as checked-in lessons; a preview discloses lifecycle, scene/image counts, and external image hosts without activating content or making requests. A lesson-scoped catalog extends only validated visual IDs before the same renderer adapter applies a snapshot. | import-model tests + browser network/adapter checks | Untrusted source cannot mutate the active lesson during correction, bypass canonical adapter validation, or contact a remote host before explicit opening. |
| INV-18 | Paste/file source and validated candidates remain memory-only. Source edits invalidate **Open lesson**; only explicit opening atomically replaces lesson/presentation/controller state, returns the lesson surface to its top, and never creates a second canvas. Reload returns to Atlas and announces that local content was not retained. | import tests + repeated-import/reload browser checks | Local authoring stays account-free, backend-free, nonpersistent, and recoverable without partial session state. |
| INV-19 | Declared HTTPS images are semantic DOM figures, never WebGL textures: alt, caption, credit, source, no-referrer lazy loading, reserved presentation space, accessible error/retry, and host disclosure travel together. Wide `split` may show atlas+image; compact shows one selected visual; manual selection does not mutate scene state. Stage resizing is observed and keeps camera aspect equal to the visible CSS stage. | parser/import tests + wide/compact/image-failure browser checks | Supplementary media cannot distort anatomy, leak referrers, silently fetch before consent, trap a failed state, or create a second renderer path. |
| INV-20 | Atlas owns one complete active canonical working snapshot. Scene inspection substitutes the actual rendered camera into effective lesson state; global Atlas starts from one project-authored complete default and then persists learner edits. Both use the existing adapter, renderer, canvas, context, transform, and filter path. | Explore/workspace model tests + repeated-entry browser checks | Exploration cannot fork anatomical state or GPU ownership. |
| INV-21 | Every noncamera Atlas command first synchronizes the actual camera, then applies an allowlisted batch and reprojects the retained panel by stable entity ID. Auto-rotate remains off and outside canonical state. | Explore model tests + camera/filter browser checks | A filter edit cannot snap an orbiting camera or drift from the displayed control state. |
| INV-22 | Bootstrap follows one guarded Atlas/Lesson transition path. It reparents existing surfaces, cancels pending lesson navigation/focus work, and restores stable Atlas or lesson tokens with their scroll and reciprocal focus. Scene-inspection changes never overwrite persistent global Atlas. | lifecycle review + Return/Back/repeated-cycle browser checks | Workspace switches remain deterministic and cannot corrupt lesson navigation or GPU ownership. |
| INV-23 | Atlas and scene inspection grant orbit, zoom, pan, full viewer filters, and at least 44 px semantic camera buttons; Lesson retains its authored policy and one-finger vertical scrolling. Reduced-motion changes synchronize back to the lesson controller on Return. | renderer policy review + compact/touch/reduced-motion browser checks | Permission elevation stays explicit, accessible, and scoped to Atlas. |
| INV-24 | Model & sources follows visible Atlas entities and stays independent of top-level workspace history. Imported lessons use their runtime visual catalog; no-WebGL and renderer-failure paths expose no scene-inspection action. | fidelity/model tests + imported/fallback/browser checks | Disclosure, local content, and failure paths cannot create stale-catalog or unusable-control states. |
| INV-25 | Atlas is the default top-level workspace. A frozen checked-entry list feeds the responsive Lessons drawer; all checked/local activation uses the existing validated presentation/controller/adapter path and one shared stage. | workspace tests + default/drawer browser checks | Lessons remain deliberate experiences and future static records can reuse entry navigation without a second runtime. |
| INV-26 | The persistent global Atlas snapshot synchronizes the actual rendered camera before leaving or applying commands. A scene-inspection snapshot is separate and cannot overwrite the global snapshot. | workspace/Explore tests + filter/inspection browser checks | Returning from a lesson restores the learner's Atlas state, while scene inspection remains temporary. |
| INV-27 | Exactly one resumable lesson token stores source key, scene index, surface scroll, selected visual, canonical state, rendered camera, requested playback, and reciprocal focus. Controller `restore` uses that snapshot as a transient base until Start, Restart, or navigation resumes authored ownership. | workspace/controller tests + exact-return browser checks | Atlas/Lesson switching preserves the learner's stable place without serializing transient particles or forking authored state. |
| INV-28 | Atlas, Lesson, and scene inspection reparent one stage, viewer panel, disclosure, canvas, renderer, context, and project-links navigation. Every move forces stage aspect synchronously before the next snapshot; narrow global Atlas framing changes camera distance only. | repeated-cycle/aspect/visual browser checks | Workspace composition cannot duplicate GPU state or stretch anatomy. |
| INV-29 | `/` is Atlas, `?lesson=<checked-id>` is a stable checked lesson, and `?lesson=local` is only a session marker. History stores small versioned intent with opaque session keys; missing local/inspection state normalizes to Atlas with an announcement. | workspace route tests + Back/Forward/reload browser checks | Static hosting and browser history work without source, snapshots, storage, or false recovery claims. |
| INV-30 | The modal Lessons drawer has one checked Start/Resume/Start-over surface, local-import entry, shared project links, native focus restoration, 44 px targets, and contained wide/compact layouts. | drawer/zoom/short-wide browser checks | Atlas Home remains primary while lesson discovery stays accessible and future-library-ready. |
| INV-31 | No-WebGL and renderer-import failure preserve semantic Atlas Home, Lessons, import, project links, readable lessons, images, and Model & sources; only renderer controls and scene inspection disappear. | fallback resource/browser checks | GPU failure cannot erase the product's learning and provenance paths. |
| INV-32 | Reduced motion settles active Atlas/Lesson playback and camera changes without altering requested canonical state. Atlas/Lesson Return replays the latest preference and auto-rotate stays off. | controller/reduced-motion browser checks | Motion preference remains truthful across workspace switches. |
| INV-33 | Normal camera-transition completion never changes a playing scene's requested activity. After the authored camera settles, every expected visible engine keeps advancing and remains perceptible through nonzero in-frame point motion, while V1-directed views retain visible endpoint caps and endpoint-proximal events. Skip applies the authored settled state; Pause freezes model clocks without becoming settled; Play resumes; reduced motion settles and disables Play. | `animation-continuity.spec.cjs` in wide/compact Firefox and Chromium | A technically live model cannot silently read as stopped, and learner/system motion controls remain semantically distinct. |

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
| FAIL-8 | Compact sheet leaks focus/surface scroll or loses focus across a breakpoint | Hidden `<details>` links counted as focusable, background not inert, or modal semantics applied only at open time | Trap visible focusables only, inert/lock the background, resynchronize on media-query change, and restore `#page-scroll` plus `#model-sources-trigger` on close. |
| FAIL-9 | Anatomy pops at scene activation or during reverse navigation | Destination visibility applied atomically or fade restarts at opacity 0/1 | Sample current opacity, apply the source/destination union, and remove source-only filters at halfway. |
| FAIL-10 | Topic overview appears as scene 1 or disappears on reverse scroll | UI numbers every authored scene or controller lacks entry state | Project `entrySceneId` before navigation and preserve `-1` through presentation/controller boundaries. |
| FAIL-11 | Prose advances while loading but anatomy opens on another scene | Controller always initializes at entry/scene 0 after navigation already changed | Pass the validated current navigation index into controller construction before `setReady`. |
| FAIL-12 | Vertical touch scroll also rotates or traps the camera | OrbitControls retains its default touch rotation/capture in `guided` or `look` | Map non-Explore one-finger touch to disabled pan and use `touch-action: pan-y`; reserve rotation/dolly touch mappings for `explore`. |
| FAIL-13 | Draft lesson appears final or Draft is shown as a fidelity badge | Shell ignores parsed lifecycle metadata or reuses geometry/activity status surfaces | Render presentation `statusLabel` as lesson identity text in every capability path; leave **Model & sources** unchanged. |
| FAIL-14 | The whole Firefox pane shifts sideways or the header jumps at first scroll | Browser root remains the scroll surface or surface coordinates are mixed with `window.scrollY` | Keep root scroll locked; route all lesson scroll operations through `#page-scroll` and verify root x/y stay zero. |
| FAIL-15 | Page keys do nothing or activate/scroll the wrong control | Nested surface is unfocused or the fixed-shell bridge captures native/control/modal input | Keep the region focusable and bridge only `pageScrollKeyAction` results; test both bridged and yielded cases. |
| FAIL-16 | Empty, oversized, malformed, or unsafe local source reaches runtime state | Import UI bypassed the bounded pure validator or accepted a partial parse | Return frozen positioned diagnostics, preserve source/current lesson, and keep **Open lesson** disabled. |
| FAIL-17 | A schema-valid lesson cannot produce a complete instructional presentation | The entry scene consumes the only scene, or a presented scene omits every curated fidelity record required by **Model & sources** | Return positioned `import.presentation.invalid`; do not activate, infer a numbered scene, or let disclosure rendering fail after replacement. |
| FAIL-18 | Imported image scene sends the renderer to fallback with an unknown visual | Renderer adapter validates against the base catalog instead of a lesson-scoped visual allowlist | Derive the immutable runtime catalog from the already-validated lesson before rebuilding the controller/adapter; retain canonical snapshot validation. |
| FAIL-19 | A split image crops, stretches anatomy, or leaves the camera at the old aspect | DOM visual changes stage width without renderer resize observation, or the image ignores its containing frame | Keep image media contained in the fixed visual surface and observe the actual stage rectangle; verify wide, compact, manual atlas return, and 200%-equivalent layouts. |
| FAIL-20 | A failed external image becomes a dead end or loses its description | Error handling hides the image without semantic fallback/retry metadata | Preserve alt/caption/credit/source, announce the error, and retry only after an explicit learner action. |
| FAIL-21 | Atlas/Lesson switching creates another canvas/context or duplicates filters | A workspace is reimplemented instead of reparented, or the panel mutates Three.js outside canonical commands | Move the existing stage/panel/disclosure and apply one complete snapshot through the existing adapter. |
| FAIL-22 | First filter edit snaps the Atlas camera | Working state stores a requested camera while OrbitControls changed the rendered pose | Capture and merge `camera.position`/`controls.target` before every command batch. |
| FAIL-23 | Return lands on the wrong scene, scroll position, or focus target | Pending scroll/focus callbacks survive entry, or restoration infers state from current DOM | Cancel pending work and restore the immutable lesson token through one epoch-guarded path. |
| FAIL-24 | Disclosure or drawer releases another surface's lock/focus | Modal/disclosure paths share anonymous lock state or restore a disappearing trigger | Release locks by owner; close transient surfaces before workspace changes and focus only the committed destination. |
| FAIL-25 | Imported/fallback Atlas shows stale anatomy or dead controls | Runtime catalog was replaced without rebuilding the wrapper, or renderer-only actions appear in fallback | Rebuild stable renderer mappings for the active catalog and expose scene inspection only when renderer-ready. |
| FAIL-26 | Reload implies a local lesson can be recovered | Session-only history lacks an available opaque key | Normalize `?lesson=local` to Atlas, remove the marker, and announce that source was not retained. |
| FAIL-27 | Invalid route/history/token data reaches bootstrap | Pure workspace validation is bypassed | Reject malformed mode/key/index/scroll/visual/camera data before DOM, renderer, or history effects. |
| FAIL-28 | Reduced motion, Skip, or Return snaps a resumed lesson to authored camera/filter state | Controller lacks a transient resume base | Restore one complete validated snapshot as the effective base until Start, Restart, or navigation clears it. |
| FAIL-29 | Renderer failure leaves a blank Home or inaccessible lessons | Atlas shell assumes an adapter/controller exists | Keep the workspace/history/candidate state machine active in semantic fallback; remove only renderer controls. |
| FAIL-30 | Unknown checked or stale session route leaves URL and UI inconsistent | Recovery changes one without the other | Replace the current history entry with Atlas and announce the specific recovery. |
| FAIL-31 | A playing lesson view appears frozen after its camera settles | Model clock stopped, expected layer is hidden, stochastic events are temporarily sparse, teaching geometry is clipped/occluded, or visibility/selection factors dim events and endpoint caps | Compare canonical playback, model clocks, draw ranges and position checksums, in-frame events, endpoint proximity/cap opacity, and selected renderer groups through the development diagnostics before changing an activity engine. Correct the failing layer only. |

## Decision Framework

| Situation | Action | Spec item |
|---|---|---|
| Add a tutorial | Author contract-valid Markdown/catalog references; reuse these models and bootstrap surfaces. | INV-1–INV-7 |
| Add a scene activation source | Convert it to an index/reason and call the same controller; do not add a renderer path. | INV-3, INV-5 |
| Change camera motion | Preserve target-centered current-pose initialization and add forward/back/pole tests. | INV-8, FAIL-3/4 |
| Add rendered Markdown syntax | Add a plain view-model node and safe DOM mapping together; never use `innerHTML`. | INV-2 |
| Add disclosure data | Update scientific traceability and curated fidelity records; do not place citations in directives. | INV-7 |
| Change lifecycle status | Use validated lesson metadata and the same identity surface in Lesson/Home/library views; do not infer status from title text or fidelity records. | INV-14 |
| Add free exploration | Use the Atlas workspace and canonical working snapshot; do not create another renderer/filter surface. Keep scene inspection temporary and global Atlas explicit. | INV-20–INV-29 |

## Testing

```bash
node --test test/scene-navigation.test.js test/lesson-scene-controller.test.js \
  test/camera-transition.test.js test/visibility-transition.test.js \
  test/markdown-view-model.test.js test/fidelity-view-model.test.js \
  test/lesson-presentation.test.js test/reference-lesson.test.js \
  test/explore-session.test.js test/workspace-session.test.js
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
| INV-14 | `test/lesson-presentation.test.js`, `test/reference-lesson.test.js`, and rendered/no-WebGL Draft identity checks |
| INV-15, INV-16 | `test/scroll-surface.test.js` + Firefox/Chromium root/surface/keyboard checks |
| INV-17, INV-18, INV-19, FAIL-16–FAIL-20 | `test/lesson-import.test.js` + paste/file/network/repeated-import/image-failure/responsive browser checks |
| INV-20–INV-32, FAIL-21–FAIL-30 | `test/explore-session.test.js`, `test/workspace-session.test.js`, controller tests, and `scripts/browser/{explore,home}-*.spec.cjs` in Firefox and Chromium |
| INV-33, FAIL-31 | `scripts/browser/animation-continuity.spec.cjs` in wide/compact Firefox and Chromium plus settled stage-only visual review |

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
