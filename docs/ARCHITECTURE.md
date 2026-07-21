# Architecture

`brain-atlas` is a static Three.js application. Vite bundles the UI and renderer; large anatomical datasets stay in `public/` and load at runtime.

## Runtime shape

`src/bootstrap.js` is the page entry point. It loads the checked-in lesson plus entity/fidelity catalogs, builds the semantic lesson presentation, owns scroll/explicit navigation and progressive disclosure, probes WebGL2, and dynamically imports `src/main.js` only when rendering is available. The no-WebGL path never downloads Three.js, hides renderer-only hints/controls, and retains lesson prose, scene navigation, summaries, and Model & sources records.

`src/main.js` owns the scene, loaders, renderer integration, legacy layer panel, and concrete bindings for the single lesson renderer adapter. `src/pathways.js` contains only schematic anterior-pathway coordinates. `src/activity/association-impulses.js` owns the renderer-independent seeded event engine, inhibition math, canonical endpoint mapping, and plain-data pool adapter. `src/activity/swm-vibration.js` owns bounded home/amplitude sampling and analytic zero-mean contour motion. `src/activity/frame-time.js` adapts `THREE.Timer` to the render loop's first-frame-zero and 50 ms clamp contract. Three.js objects and the one MNI transform stay in `main.js`; renderer-independent presentation, navigation, fidelity, and orbit-camera math live under `src/ui/`.

Every anatomical layer is a child of `mniGroup`:

1. `brainGroup`
2. `anteriorGroup`
3. `labelGroup`
4. `regionGroup`
5. `fibreGroup`
6. `tractGroup`
7. `swmGroup`

`sceneFromMni`, assigned to `mniGroup`, is the only runtime coordinate transform. Cortical and region assets identify MNI152NLin2009cAsym; fibre assets are interpreted as MNI/ICBM RAS millimetres while `brain-atlas-yum.5` audits their exact 2009a/2009c provenance. Do not add dataset-specific runtime transforms or fitting: correct mismatches in the offline asset pipeline.

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
tract renderer IDs and camera presets. `public/data/fidelity.json` supplies curated,
separate geometry/activity disclosure records reconciled with
`SCIENTIFIC_TRACEABILITY.md`; it does not add anatomy or tract relationships.
Pure commands create new snapshots without mutation. `createRendererAdapter` defines the only snapshot-to-renderer port and requires explicit bindings for every state axis. `src/main.js#createLessonRendererAdapter` maps stable catalog records to layer/region/tract visibility, hemispheres, clipping, tissue, playback, emphasis, camera, visual, and control-policy state without simulating panel events.

The checked-in `src/lessons/retina-to-v1.md` exercises that contract through one unnumbered topic entry view and four instructional scenes. Optional frontmatter `entryScene` names a complete authored scene that supplies the pre-scroll viewer state but is excluded from progress numbering by `src/ui/lesson-presentation.js`. `src/ui/scene-navigation.js` supplies directional hysteresis, entry-view restoration, and bounded explicit movement; `lesson-scene-controller.js` initializes from the live navigation index if reading advanced during renderer loading, then applies complete snapshots and transient Restart/Skip or reduced-motion variants. `camera-transition.js` rotates the current camera offset around the interpolated target with a quintic smootherstep spline and starts interrupted forward/back transitions from the current rendered pose. Reference scenes target the scene origin, which is the recentered cortical-bounds midpoint under `sceneFromMni`, so the orbit stays centered on the brain rather than drifting along an independently interpolated quaternion. `visibility-transition.js` keeps source and destination filters eligible as a union while changed entities cross-fade during the first half, then commits the destination set; reverse or interrupted fades begin at current rendered opacity. Material selection and visibility factors compose instead of overwriting one another, including meshes that finish loading after a snapshot is applied. Camera controls are suspended during the orbit; lesson ownership disables OrbitControls damping so residual input cannot move an authored endpoint. Non-Explore control policies map touch to vertical page scrolling without camera manipulation, while `look` retains mouse/trackpad orbit. Live reduced-motion changes reapply the latest authored playback request. The reference LGN camera uses a dorsal-oblique pose away from the OrbitControls vertical-pole seam.

`src/bootstrap.js` converts validated Markdown to an allowlisted plain view model and creates DOM nodes with `createElement`/`textContent`; it never inserts author HTML. Geometry and activity fidelity statuses come from `public/data/fidelity.json`. The wide disclosure is nonmodal. The compact sheet inerts background/skip-link content, locks page scrolling, cycles visible focusables, and resynchronizes focus/semantics when a breakpoint changes; close restores exact scroll position and trigger focus. Lesson scenes currently hide legacy fixed-anchor 3D labels under decision `brain-atlas-jes`; responsive placement is tracked by `brain-atlas-zmq.20`.

## Data loading and build

After the WebGL gate, the renderer loads the cortical GLB, JSON fibre datasets, association-activity metadata, a region manifest, and region OBJ meshes in parallel. Renderer readiness resolves after region and tract manifests bind; a manifest or renderer failure returns the page to readable lesson fallback. Offline tools must produce web-sized, co-registered assets; runtime fitting and heavy data processing do not belong in the viewer. `SCIENTIFIC_TRACEABILITY.md` records each asset's geometry and model provenance, including unresolved source-space and generator gaps.

Ajv schemas compile offline through `npm run generate:lesson-validators`; the checked-in `src/lesson/generated-validators.js` is imported at runtime. This preserves the existing CSP without `unsafe-eval`, `new Function`, or a relaxed script policy.

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
