# Repository instructions

`brain-atlas` is an interactive 3D WebGL/Three.js viewer of the human **visual
system**, rendered as animated flow inside a real translucent cortical surface.
Everything posterior to the optic chiasm is real, co-registered data in one MNI152
space; only the anterior eye→chiasm→LGN segment is schematic. `src/main.js` is
essentially the whole app.

## The two rules that matter most

### 1. One coordinate space, one transform
Every dataset — cortical surface, region shells, optic-radiation and association
streamlines, superficial-WM fibres — is authored in **MNI152NLin2009cAsym RAS
millimetres**. They are all parented to a single `mniGroup` whose matrix
(`sceneFromMni`) is the ONLY coordinate transform in the app: a proper −90°
rotation about the R axis (determinant +1, so left/right **and** chirality are
preserved — Meyer's loop hooks the anatomical way), a uniform mm scale, and a
recentring translation.

- Do not add a second transform, per-dataset fitting, or marker-based alignment.
  Co-registration is free because everything shares the MNI grid.
- Jülich MPM right label = left label + 1000. Render real bilateral region meshes;
  do not introduce new mirroring. The optic-radiation dataset remains the one
  documented legacy exception until real right-side streamlines replace it.

### 2. Honesty of representation — never imply structure the data lacks
This is the project's defining constraint.

- **Direction.** Draw directed, travelling flow ONLY where biology supplies a
  direction (retina→LGN→V1: the optic radiation and the anterior pathway). For
  **undirected** bundles (superficial WM, association tracts) never imply a flow
  direction — no arrowheads, no net travel. Show orientation as a *static tangent
  grain*; show activity as *vibration ALONG the contour* (a zero-mean sinusoid
  with random per-dot phase, so there is no net displacement). See the SWM texture
  (`swmGroup` / `updateSwm` in `src/main.js`).
- **Fibre orientation is undirected.** Never average fibre direction vectors
  (average structure tensors if you must combine them).
- **Amplitude/frequency channels** must map to real structure (e.g. vibration
  amplitude ∝ local fibre length) or be clearly illustrative — never presented as
  measured firing rate or axonal transmission.
- **Label real vs schematic** in the legend. Approximate elements are acceptable
  only when labelled and the overall anatomy reads correctly.

## Data provenance
- Space: MNI152NLin2009cAsym (TemplateFlow), 1 mm grid.
- Regions: Jülich-Brain v3.0.3 Maximum Probability Map (winner-take-all).
- Optic radiation / association tracts / superficial WM: HCP-1065 population
  template, tracked with DSI Studio on the ICBM152-2009a FIB.
- Parse structured/binary data (NIfTI, `.trk` streamlines, JSON, OBJ/GLB) with
  established parsers (nibabel, the three.js loaders) — never ad-hoc byte or text
  matching. DSI Studio writes **gzipped** `.trk` under a plain `.trk` name; detect
  the `1f 8b` magic and gunzip.

## Offline data pipeline (heavy generation is NOT in the app)
Meshing and tractography run offline and emit small JSON/OBJ/GLB into
`public/data` and `public/models`.

- Run Python with `uv run --with nibabel --with numpy --with scipy python …`
  (there is no project venv carrying these).
- The **DSI Studio binary cannot be launched from an agent shell** — the harness
  blocks it. Hand the user the exact `dsi_studio --action=trk …` command and have
  them run it via `!`, then take over parsing the output.
- Author outputs in MNI mm, resample fibres to a fixed point count, round
  coordinates, and keep files web-light (decimate meshes, sample fibres). GPU
  memory is the binding constraint, not disk.

## Architecture (all in `src/main.js`)
- `mniGroup` (`matrixAutoUpdate = false`) parents every layer, in add order:
  `brainGroup`, `anteriorGroup`, `labelGroup`, `regionGroup`, `fibreGroup` (optic
  radiation), `tractGroup`, `swmGroup`.
- Visibility: `hemiState` (global L/R) ANDs with per-item L/R (`regionHemi`,
  `tractHemi`); `applyHemi()`, `applyRegionMesh`, `applyTractMesh` enforce it.
- Panel: `sceneState.visible` is the serializable source of truth. `buildPanel`
  renders the collapsible stream tree (regions + tracts, each with L/R pills) and
  leaf toggles (Pathways + Scene). Layer objects live in `layerObjs`; `DEFAULT_OFF`
  starts some hidden.
- Flow: LGN→V1 firing is a superposition+thinning inhomogeneous-Poisson model
  (`initFiring` / `generateFiring` / `updateTracers`); tract flow and SWM vibration
  are separate updaters (`updateTractTracers`, `updateSwm`).
- Region material is a fresnel rim-fade shader (near-transparent interior, bright
  silhouette) so overlapping shells read as outlines.
- Development mode exposes `window.__view = { camera, controls, scene, THREE }`
  for scripted framing and screenshots — see `skills/user.md`. Vite removes this
  guarded hook from production builds; verify that before a public release.
- `src/pathways.js` holds the schematic anterior-pathway control points.

## Run and verify
```bash
npm run dev                         # Vite dev server → http://localhost:5180
npm run build && npm run preview    # static, HMR-free — use for stable viewing
```
There is **no automated test suite**. Verify changes visually: load the page,
confirm the browser console is error-free, drive the scene via the development-only
`window.__view` hook and the layer panel (see `skills/user.md`), and screenshot. HMR full-reloads can churn
the WebGL context — prefer the static preview when inspecting.

## Review expectations
- Prioritise coordinate/transform correctness, honest labelling (real vs
  schematic, no implied direction), data provenance, and GPU/bundle weight over
  stylistic preferences.
- Treat simplification as part of the work: remove superseded render paths once
  their replacement is verified (e.g. the schematic U-fibre tubes were excised
  after the SWM texture replaced them).
- Preserve unrelated working-tree changes; stage only the files your change owns.
- Distinguish pre-existing issues from ones you introduce, and report what you
  actually ran.
