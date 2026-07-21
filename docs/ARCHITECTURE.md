# Architecture

`brain-atlas` is a static Three.js application. Vite bundles the UI and renderer; large anatomical datasets stay in `public/` and load at runtime.

## Runtime shape

`src/main.js` owns the scene, loaders, renderer integration, and layer panel. `src/pathways.js` contains only schematic anterior-pathway coordinates. `src/activity/association-impulses.js` owns the renderer-independent seeded event engine, inhibition math, canonical endpoint mapping, and plain-data pool adapter. `src/activity/swm-vibration.js` owns bounded home/amplitude sampling and analytic zero-mean contour motion. `src/activity/frame-time.js` adapts `THREE.Timer` to the render loop's first-frame-zero and 50 ms clamp contract. The Three.js adapters stay in `main.js`. Keep tightly shared scene concerns in `main.js`; extract modules only when they have an independent interface or testable lifecycle.

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

## Data loading and build

The app loads the cortical GLB, JSON fibre datasets, association-activity metadata, a region manifest, and region OBJ meshes in parallel. Offline tools must produce web-sized, co-registered assets; runtime fitting and heavy data processing do not belong in the viewer. `SCIENTIFIC_TRACEABILITY.md` records each asset's geometry and model provenance, including unresolved source-space and generator gaps.

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
3. **Add an idle render mode.** When flow and auto-rotation are both off, render only after controls, resize, or UI changes. This removes continuous CPU/GPU work while the scene is stationary. Account for OrbitControls damping and asynchronous asset loads before suspending frames.
4. **Split runtime modules only along stable boundaries.** Good candidates are asset loading, activity models, and panel construction. Pass explicit state rather than introducing global registries or a framework.

### Findings not adopted

- A runtime asset manifest would not simplify loading: manifests already exist where metadata is needed, and independent top-level fetches correctly run in parallel.
- Event delegation would save little for the small, infrequently rebuilt panel and would make its state transitions less explicit.
- Splitting the existing Three.js vendor group further would add requests without reducing total dependency bytes; do so only after measured loading evidence.
