# Architecture

`brain-atlas` is a static Three.js application. Vite bundles the UI and renderer; large anatomical datasets stay in `public/` and load at runtime.

## Runtime shape

`src/bootstrap.js` is the page entry point. It loads the entity/fidelity catalogs and checked lesson, then opens the full Atlas workspace as Home. A responsive Lessons drawer launches the checked reference lesson or the bounded local Markdown import path. Bootstrap owns one guarded Atlas/Lesson workspace record, in-memory candidate/session maps, static-safe History API intent, DOM reparenting, focus/scroll restoration, explicit lesson closeout, transactional fallback, and transient anatomy-inspector presentation state. The persistent global Atlas, temporary lesson-derived Atlas branch, and one resumable lesson token all use complete canonical snapshots; source text, candidates, snapshots, inspector state, and DOM objects never enter URLs or history. The existing stage, viewer panel, Model & sources surface, canvas, and WebGL context move between Atlas and Lesson rather than being copied; one external anatomy detail panel serves both workspaces. Browser-root scrolling remains disabled. In Lesson mode, one named focusable `#page-scroll` below the fixed topbar owns vertical scrolling, native scrollbar behavior, scene coordinates, explicit destinations, focus settlement, and compact-disclosure restoration. `src/ui/scroll-surface.js` supplies pure coordinate and keyboard-intent helpers. No-WebGL Atlas retains orientation, sources, Lessons, local import, and semantic anatomy inspection without downloading Three.js; no-WebGL Lesson retains prose, navigation, summaries, declared images, fidelity records, and cited anatomy details.

`src/main.js` owns the scene, loaders, renderer integration, retained layer panel, raycasting, and concrete bindings for the single lesson renderer adapter. Its wrapper adds ports for actual camera capture, canonical command dispatch, stable catalog-to-renderer panel projection, reset pose, semantic camera actions, and plain stable-ID anatomy intents/highlights; the generic canonical adapter remains unchanged. Raycasting uses the renderer canvas's exact CSS rectangle and existing world matrices under `mniGroup`. Its transient inspection material factor composes with authored selection and visibility factors but never enters or overwrites the canonical snapshot. Window resize and a stage `ResizeObserver` derive camera aspect from the stage's fractional `getBoundingClientRect()` dimensions. The renderer wrapper also forces this resize synchronously after every workspace reparent and before applying the next snapshot, so no frame can use the previous workspace's projection. On narrow global-Atlas stages, entry/reset uniformly increases camera distance from the same target so the complete brain stays in frame; it never rescales anatomy. The drawing buffer may round to pixels, but CSS display, responsive atlas/image split changes, and projection stay matched without axis stretch. `src/pathways.js` contains only schematic anterior-pathway coordinates. `src/activity/association-impulses.js` owns the renderer-independent seeded event engine, inhibition math, canonical endpoint mapping, and plain-data pool adapter. `src/activity/swm-vibration.js` owns bounded home/amplitude sampling and analytic zero-mean contour motion. `src/activity/frame-time.js` adapts `THREE.Timer` to the render loop's first-frame-zero and 50 ms clamp contract. Three.js objects and the one MNI transform stay in `main.js`; renderer-independent presentation, navigation, fidelity, workspace tokens, Atlas snapshots, and orbit-camera math live under `src/ui/`.

Every anatomical layer is a child of `mniGroup`:

1. `brainGroup`
2. `anteriorGroup`
3. `labelGroup`
4. `regionGroup`
5. `fibreGroup`
6. `tractGroup`
7. `swmGroup`

`sceneFromMni`, assigned to `mniGroup`, is the only runtime coordinate transform. Cortical and region assets are MNI152NLin2009cAsym. Association tracts are verified ICBM 2009a Nonlinear Asymmetric; OR/SWM use the exact nonlinear ICBM152 2009a HCP FIB, with its asymmetric variant indicated by the release-companion T1 but not directly bound by a retained FIB build record. Nibabel decodes TrackVis voxel-mm vertices through voxel size, half-voxel offset, orientation, and voxel-to-RAS metadata into RAS+ world millimetres. Resampling retains that frame; no offline 2009a→2009c template warp exists. Do not add dataset-specific runtime transforms or fitting: any future geometric correction belongs in the offline asset pipeline. `TRACT_SPACE_PROVENANCE.md` records source hashes, effective affine semantics, recovered processing, correspondence, numeric methods, and residual unknowns.

`sceneState.visible` stores leaf-layer visibility. `hemiState` combines with per-region and per-tract hemisphere state. The render loop updates three distinct activity models:

- directed anterior and optic-radiation flow;
- seeded inhibited association-tract impulses, with direction sampled per event
  from explicit bilateral 50/50 metadata; and
- zero-mean superficial-white-matter vibration.

`public/data/tract_activity.json` separates association model provenance from
`tracts.json` geometry. `createAssociationImpulseEngine().advanceTo()` produces
plain logical events on an absolute model clock; `updateAssociationEventPool`
handles deterministic visibility, cap, contour selection, and expiration before
`updateTractImpulses` uploads positions and colours. Endpoint-only geometric
heuristics orient A/B labels independently of source array order. Equal channel
counts keep JSON sampling density from becoming an activity-rate claim.
Superficial-white-matter vibration remains separate. Each dot's structural
amplitude is sampled with a home interval that keeps the complete sinusoid inside
contour margins, so `updateSwm` needs no asymmetric endpoint clipping; reduced
motion settles each dot at its fixed home.

## Lesson contract foundation

`src/lesson/` is a renderer-independent ESM subsystem governed by
[`src/lesson/SPEC.md`](../src/lesson/SPEC.md). It parses Obsidian-style Markdown:
one leading YAML frontmatter block for metadata and top-level `atlas-scene` YAML
fences as the domain-specific content extension,
then validates catalog references and normalizes every scene to a complete frozen
plain-data snapshot. Headings, lists, and ordinary code fences carry no runtime
semantics. Raw HTML, unsafe URLs, unknown IDs/actions/versions, and malformed fields
produce positioned diagnostics and no partial lesson.

`public/data/entities.json` maps stable prefixed domain IDs to current layer/region/
tract renderer IDs and camera presets. Its strict `inspectables` projection adds six
starter records: LGN, V1, optic radiation, left/right eye markers, and optic chiasm.
Selection-only landmark IDs inherit availability and fidelity from `pathway.anterior`
but do not enter canonical scene `entityIds` or visibility snapshots. Curated anatomy
copy and HTTPS citations live with those stable records; relationship targets are strict
and currently limited to the established early visual pathway. `public/data/fidelity.json`
supplies separate geometry/activity disclosure records reconciled with
`SCIENTIFIC_TRACEABILITY.md`; association-tract endpoint relationships remain absent.
Pure commands create new snapshots without mutation. `createRendererAdapter` defines the only snapshot-to-renderer port and requires explicit bindings for every state axis. `src/main.js#createLessonRendererAdapter` maps stable catalog records to layer/region/tract visibility, hemispheres, clipping, tissue, playback, emphasis, camera, visual, and control-policy state without simulating panel events.

`src/ui/anatomy-inspector.js` derives visible inspectable IDs from canonical owner
visibility and effective hemispheres, composes frozen cited detail models from
inspectable plus fidelity records, reduces hover/focus/touch/activation state,
distinguishes taps from drags, and normalizes exact-canvas pointer coordinates. It
imports neither DOM nor Three.js. Bootstrap renders equivalent semantic buttons and the
short label, owns wide/compact panel and focus behavior, and retains the same details
without WebGL. Compact details inert the background and use their own page-lock owner;
wide details remain nonmodal. Canvas and DOM input feed the same reducer.

`src/ui/explore-session.js` derives complete immutable Atlas snapshots. Atlas Home starts from the project-authored complete-atlas default and retains its working state until a deliberate lesson Exit resets it. Every active-Lesson → Atlas transition preserves effective lesson state, substitutes the actual rendered camera, and opens the same temporary branch; the persistent global snapshot stays untouched. Before every noncamera panel command, the branch merges the latest rendered camera, applies an allowlisted command batch, and sends one complete snapshot through the same adapter. The panel is a projection of this state, not a second filter system. `src/ui/workspace-session.js` validates small query/history intents, checked drawer records, persistent Atlas capture, lesson resume tokens, and lesson-derived branch capture without importing the DOM or Three.js. Bootstrap’s Exit transaction clears the token and session-only keys, converts the already-reparented surface to Home ownership, and applies `createAtlasExploreSnapshot` once with responsive camera fit. Auto-rotate remains excluded; Atlas grants full orbit/zoom/pan and semantic camera controls.

The checked-in `src/lessons/retina-to-v1.md` exercises that contract through one unnumbered topic entry view and eight instructional scenes centered on retina-to-V1 processing, followed by brief ventral/dorsal previews and an early-vision conclusion that reprises the opening pathway and lesion prediction. Explicit human content review removed its optional `status: draft` metadata; absence makes no machine-readable reviewed or published claim. `src/ui/lesson-presentation.js` still projects textual `[DRAFT]` identity for any lesson that explicitly carries the validated lifecycle marker, independently of scientific geometry/activity fidelity. Optional frontmatter `entryScene` names a complete authored scene that supplies the pre-scroll viewer state but is excluded from progress numbering by the same presentation model. `src/ui/scene-navigation.js` supplies directional hysteresis, entry-view restoration, and bounded explicit movement; `lesson-scene-controller.js` initializes from the live navigation index if reading advanced during renderer loading, then applies complete snapshots and transient Restart/Skip, reduced-motion, or workspace-resume variants. `camera-transition.js` rotates the current camera offset around the interpolated target with a quintic smootherstep spline and starts interrupted forward/back transitions from the current rendered pose. Reference scenes orbit their explicit authored targets under `sceneFromMni`: the title view centers the complete brain, cortical-stream views frame projected teaching geometry rather than the cortex/SWM envelope, and the LGN-dominant view keeps incoming context plus the LGN→optic-radiation→V1 visual sentence in frame. Optic-radiation, V1, ventral, and dorsal scenes preserve their approved cameras while using global `L=true/R=false` filters plus display-only `cutaway: 50`; the scene-frame center clip hides half of the one cortical shell while hemisphere filters remove right-side regions and fibres. The orbit therefore stays centered on the taught anatomy rather than drifting along an independently interpolated quaternion. `visibility-transition.js` keeps source and destination filters eligible as a union while changed entities cross-fade during the first half, then commits the destination set; reverse or interrupted fades begin at current rendered opacity. Material selection and visibility factors compose instead of overwriting one another, including meshes that finish loading after a snapshot is applied. Camera controls are suspended during the orbit; lesson ownership disables OrbitControls damping so residual input cannot move an authored endpoint. Non-Explore control policies map touch to vertical `#page-scroll` movement without camera manipulation, while `look` retains mouse/trackpad orbit. Live reduced-motion changes reapply the latest authored playback request. The reference LGN camera uses an oblique pose away from the OrbitControls vertical-pole seam and remains compositionally distinct from the balanced optic-radiation scene. Its anterior and optic-radiation activity remain enabled after camera settlement. The V1-arrival scene keeps LGN, optic radiation, and V1 emphasized together so selection does not dim endpoint caps or active tracers. Camera-transition completion never changes the canonical playback request: normal entry and all eight playing scenes retain their expected anterior, optic-radiation, association-impulse, or SWM clocks after the camera settles; the conclusion returns to the opening anterior-plus-optic-radiation activity rather than restoring downstream integration activity. Skip intentionally applies the authored settled state, Pause freezes model time without claiming a settled scene, and reduced motion settles activity and disables Play. Development-only `window.__view.activity` names anterior and optic-radiation point sets and reports stable clock/state/endpoint diagnostics; the checked Firefox/Chromium animation-continuity test uses those diagnostics to distinguish live-but-occluded or dimmed activity from a real clock failure, and production builds remove the hook. The three cortical preview scenes currently activate selected named tracts plus the broad SWM layer through ordinary canonical visibility/playback snapshots; their prose and fidelity records mark 50/50 long-tract direction and zero-mean SWM motion as illustrative, and the unfiltered SWM display remains a pre-publication prototype pending endpoint-filter presets under `brain-atlas-zmq.21`. Lesson-specific claim evidence and curriculum review live in `docs/lessons/retina-to-v1-validation.md`; `docs/SCIENTIFIC_TRACEABILITY.md` remains the runtime model/asset authority.

`src/ui/lesson-import.js` composes the existing strict parser and presentation path for local sources up to 512 KiB. Validation returns frozen diagnostics or one frozen candidate with title, lifecycle, scene/image counts, and sorted external hosts; it cannot activate content or make requests. Source changes invalidate the candidate. Explicit **Open lesson** atomically replaces presentation/navigation/controller state in memory, derives an immutable runtime catalog that extends only the already-validated visual IDs, and reuses the existing renderer and canvas. Repeated imports do not reload Three.js. Local source remains memory-only; `?lesson=local` is only a nonsecret recovery marker, and reload normalizes to Atlas with an announcement rather than restoring source.

`src/bootstrap.js` converts validated Markdown to an allowlisted plain view model and creates DOM nodes with `createElement`/`textContent`; it never inserts author HTML. Declared HTTPS images render as semantic DOM figures only after lesson activation, with alt text, caption, credit, source link, reserved presentation space, lazy/no-referrer loading, and an announced retry state. The atlas remains the first visual choice. Wide `split` scenes may show atlas and image together; compact scenes show one selected visual, and manual visual changes do not alter semantic scene state. Images never become WebGL textures. Geometry and activity fidelity statuses come from `public/data/fidelity.json` and appear inside the persistent **Model & sources** disclosure rather than in duplicate canvas badges, stage rows, or the global header. Scene identity/progress remains in the stage header and transport. The wide disclosure is nonmodal. The compact lesson sheet inerts background/skip-link content, locks `#page-scroll`, cycles visible focusables, and resynchronizes focus/semantics when a breakpoint changes; close restores exact surface position and trigger focus. In Atlas, the same disclosure stays within the top-level workspace and follows visible entities, unioned with the originating scene's records for stage-local inspection. The separate cited anatomy inspector composes those fidelity records with curated anatomy explanations; it does not redefine provenance or add lesson-authored claims. Its wide panel is nonmodal, its external compact sheet contains focus while the app is inert, and close restores the exact semantic invoker or a connected stage fallback. Opening either detail surface closes the other without changing workspace history, camera, filters, playback, or the resumable lesson. Lesson scenes currently hide legacy fixed-anchor 3D labels under decision `brain-atlas-jes`; responsive placement is tracked by `brain-atlas-zmq.20`.

## Data loading and build

After the WebGL gate, the renderer loads the cortical GLB, JSON fibre datasets, association-activity metadata, a region manifest, and region OBJ meshes in parallel. Renderer readiness resolves after region and tract manifests bind; a manifest or renderer failure returns the page to readable lesson fallback. Offline tools must produce web-sized, co-registered assets; runtime fitting and heavy data processing do not belong in the viewer. `SCIENTIFIC_TRACEABILITY.md` records each asset's geometry and model provenance, while `docs/lessons/*-validation.md` records lesson teaching claims and review. `TRACT_SPACE_PROVENANCE.md` resolves fibre source space and conversion history; the remaining gap is the broader checked-in generator/tool manifest owned by `brain-atlas-yum.6`.

Ajv schemas compile offline through `npm run generate:lesson-validators`; the checked-in `src/lesson/generated-validators.js` is imported at runtime. This preserves the script/connect CSP without `unsafe-eval`, `new Function`, arbitrary fetches, or third-party code. The image policy intentionally permits HTTPS sources only for validated declared lesson images; external hosts are disclosed before activation and requests use no referrer.

Vite uses native Rolldown `codeSplitting.groups` to keep Three.js and its addons in
a deliberate cacheable `three` chunk. The 650 kB warning threshold sits just above
that known dependency; it is a regression signal, not a claim that chunking reduces
total bytes or first-render cost.

## Architecture review

The current design has no unnecessary service, state-management, or component layers. Splitting `src/main.js` solely to reduce its line count would add interfaces around tightly shared state without reducing runtime complexity. Extract modules only when a subsystem gains an independent interface or testable lifecycle.

### Applied simplifications

- Removed an unused 13 MB legacy cortical model from the public asset tree.
- Removed unused JavaScript symbols.
- Reused caller-owned typed arrays for fibre interpolation instead of allocating a temporary array for every animated dot on every frame.
- Marked frequently updated GPU attributes as dynamic.

### High-value future opportunities

These changes are worthwhile but structural; implement them through a scoped Bead and a plan in `.pi/plans/`.

1. **Move superficial-white-matter vibration into a vertex shader.** The CPU currently evaluates and uploads as many as 15,000 dot positions per frame. Per-dot phase, frequency, home position, and amplitude can become static attributes while a time uniform drives zero-mean displacement. Preserve the undirected representation exactly.
2. **Package region shells into one web-optimized GLB.** The current manifest starts many OBJ requests and parses text geometry in the browser. A single indexed, decimated binary asset could reduce requests, transfer size, parse time, and duplicated vertices while retaining real bilateral meshes and MNI coordinates.
3. **Add an idle/power-aware render mode (`brain-atlas-zmq.19`).** When activity is not being observed, stop model clocks and rendering after an approved policy distinguishes hidden/offscreen/inactive states from passive lesson reading and explicit pause. Account for OrbitControls damping, asynchronous asset loads, reduced motion, accessible resume status, and user intent before suspending frames.
4. **Split runtime modules only along stable boundaries.** Good candidates are asset loading, activity models, and panel construction. Pass explicit state rather than introducing global registries or a framework.

### Findings not adopted

- A runtime asset manifest would not simplify loading: manifests already exist where metadata is needed, and independent top-level fetches correctly run in parallel.
- Event delegation would save little for the small, infrequently rebuilt panel and would make its state transitions less explicit.
- Splitting the existing Three.js vendor group further would add requests without reducing total dependency bytes; do so only after measured loading evidence.
