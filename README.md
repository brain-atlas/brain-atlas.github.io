# brain-atlas

Interactive 3D viewer of the human **visual pathway** (retina → optic chiasm →
LGN → optic radiations → V1), rendered as animated, field-quadrant-coded flow
**inside a real translucent cortical surface**. WebGL (Three.js), so it stays
smooth with tens of thousands of vertices — unlike the Canvas-2D prototype it
replaces.

**Everything posterior to the chiasm uses real atlas/template data in one runtime
MNI/ICBM RAS-millimetre frame.** The cortical surface and LGN/V1 shells identify
MNI152NLin2009cAsym; upstream HCP fibre sources identify ICBM 2009a or generic
ICBM152, and their exact release/conversion provenance is under audit. The app
performs no per-dataset fitting and applies one runtime transform. Only the
anterior eye → chiasm → LGN segment is schematic. See “What's real vs
schematic” and the scientific traceability inventory below.

## Run it

The dev environment is a Nix flake wired through direnv (matching the sibling
project). From this directory:

```bash
direnv allow      # loads the flake: Node 22 + git, then runs `npm install`
npm run dev       # Vite dev server → http://localhost:5180
```

Without direnv:

```bash
nix develop       # or just have Node 22 on PATH
npm install
npm run dev
```

Run the focused renderer-independent tests, then build a static bundle for any
local webhost (`base: './'` keeps paths relative):

```bash
npm test
npm run build             # → dist/ for local development
npm run build:publish     # refuse untracked public/ assets, then build
npm run preview           # serve dist/ on :5180
# or: python -m http.server -d dist 8000
```

### Viewing stability

This is a heavy WebGL page. Vite's **HMR full-reloads** can churn the GPU context
and occasionally crash a browser tab — especially across repeated dev-server
restarts. For stable viewing use the **static preview** (no HMR):

```bash
npm run build && npm run preview   # → http://localhost:5180
```

Use `npm run dev` only while editing. If a tab misbehaves after a restart,
hard-reload it (or reopen) once the server is back up. The optic-radiation mesh is
decimated specifically to keep GPU memory low.

For GitHub Pages or any public deployment, build from a clean checkout with
`npm run build:publish`. Vite copies every file under `public/`; the publication
check prevents untracked experiments with unknown provenance from entering the
published `dist/` directory.

## Coordinate handling

There is exactly one runtime coordinate transform in the app. The cortical and
region assets are MNI152NLin2009cAsym RAS millimetres; fibre assets are consumed
as MNI/ICBM RAS millimetres while their exact 2009a/2009c derivation is audited
under `brain-atlas-yum.5`. `src/main.js` parents every layer to one `mniGroup`
whose matrix maps that runtime frame into the scene:

- scene `+x` = right, `+y` = up (MNI superior), `+z` = posterior (MNI −anterior);
- that is a proper −90° rotation about the R axis (determinant +1), so left/right
  **and** chirality are preserved (Meyer's loop hooks the anatomical way);
- uniform scale (`MNI_SCALE`, 1 = millimetres) and a recentring translation
  (`MNI_CENTER`).

No dataset receives runtime fitting. If the provenance audit identifies a source-
space mismatch, the asset must be converted or regenerated offline rather than
adding another scene transform. The cortical surface and Jülich regions do share
the declared 2009c grid; their checked-in generation pipeline is tracked by
`brain-atlas-yum.6`.

## Layout

```
flake.nix            Nix devShell (Node 22 + git); blocks bare `nix develop`
.envrc / .envrc.d/   direnv: `use flake`, then npm install on entry
index.html           app shell + control/legend overlay
src/main.js          Three.js scene, data loading, activity integration, and controls
src/activity/        renderer-independent seeded impulse and vibration math
src/pathways.js      schematic anterior-pathway control points
src/style.css        dark "imaging console" UI
test/                 focused Node tests for extracted pure behavior
public/models/       licensed runtime GLB assets, including brain_mni.glb
.workbench/           ignored, non-deployed local asset experiments
```

## Controls

Drag to orbit, scroll to zoom. Play/Pause activity + speed; **Cutaway** (a real mesh
clipping plane that slices the near hemisphere); **Tissue** opacity; Side / Top /
Back / Front presets; Auto-rotate, Labels, Reset. With reduced-motion preference,
traveling activity and auto-rotation start paused and the activity button remains
disabled.

## What's real vs schematic

Approximate/schematic elements are fine **as long as they're labelled and the
overall anatomy reads correctly**:

- **Real data (all MNI152, co-registered):** the cortical surface (template
  shell); the amber **optic radiation** (HCP-1065 streamlines, re-tracked so they
  terminate at the LGN — the density you see is real fibre density); and the
  **LGN** and **V1** region shells (Jülich-Brain).
- **Modeled activity on data-derived geometry:** all eight named association
  bundles carry seeded, inhibited code-like impulses in both directions.
  Diffusion MRI does not measure polarity, so direction is sampled per accepted
  event from an explicit 50/50 assumption for each tract and hemisphere. Rates,
  inhibition/refractory timing, and speed are illustrative display algorithms,
  not measured spikes or physiology. The in-view **Association model & sources**
  disclosure links the tract evidence. “Inhibition” means per-channel refractory
  self-inhibition and recovery, not inhibition between anatomical tracts.
- **Schematic (labelled in the legend):** the anterior pathway (eye → chiasm →
  LGN) and its flow dots, the eye markers, and the LGN→V1 tracer *timing* — a
  physiologically patterned but illustrative firing model (superposition +
  thinning, with refractoriness and bursts), not recorded spikes. Biological
  time is dilated so the pattern is legible on screen.
- **Undirected activity:** superficial-WM/U-fibre dots follow bounded sinusoids
  around fixed homes on real bilateral contours. Amplitude derives from local
  fibre-length structure, random phase prevents coherent travel, and no endpoint
  clipping biases the contour-parameter mean or assigns a travel direction.
- **Mirrored:** the right optic radiation is a sagittal mirror of the left until
  independently generated right-side streamlines replace it. Region,
  association-tract, and superficial-WM geometry are real bilateral data.

## Citing the viewer

Use [`CITATION.cff`](CITATION.cff) to cite the software, including the release or
commit used. Academic work that uses the anatomical content should also cite the
relevant source datasets and methods listed in [`DATA_LICENSES.md`](DATA_LICENSES.md).
Citing this viewer does not replace the required dataset citations or the WU-Minn
HCP acknowledgment.

## Data sources and licensing

This viewer is intended for **noncommercial** research, education, and personal
use. Its Jülich-Brain-derived region surfaces are licensed under
[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/), which
does not permit commercial use.

Principal sources:

- Cortical surface (`public/models/brain_mni.glb`): marching-cubes shell of the
  **MNI152NLin2009cAsym** 1 mm brain mask, distributed through
  [TemplateFlow](https://www.templateflow.org/) and decimated for the web.
- Optic radiation (`public/data/or_fibres.json`): re-tracked with **DSI Studio**
  on the **HCP-1065 population template**, seeding from Jülich-Brain V1 and
  terminating in LGN, then pruned and resampled.
- Association tracts (`public/data/tracts.json`): selected and resampled from
  the **HCP-1065 Population-Averaged Tractography Atlas** (Yeh 2022).
- Region shells (`public/data/regions/*.obj`): adapted from the
  **Jülich-Brain v3.0.3** maximum probability map by extracting regions and
  converting volumetric labels to simplified surface meshes.
- Rendering: [three.js](https://threejs.org/) (MIT).

See [`DATA_LICENSES.md`](DATA_LICENSES.md) for source links, citations, license
terms, modification disclosures, and the required WU-Minn HCP acknowledgment.
See [`docs/SCIENTIFIC_TRACEABILITY.md`](docs/SCIENTIFIC_TRACEABILITY.md) for the
layer-by-layer separation of anatomical data, derivation, modeled activity,
display choices, assumptions, and known fidelity gaps.
See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for software and model
notices.

Copyright © 2026 Steve Hay. Original project code and documentation are
licensed under the [GNU Affero General Public License v3.0](LICENSE)
(`AGPL-3.0-only`). Modified
versions made available over a network must offer their corresponding source as
required by the AGPL. This license does not relicense third-party software, data,
or models, which remain under their respective terms.

## Project status

The viewer currently renders the MNI cortical shell, real bilateral Jülich region
meshes, optic-radiation streamlines, association tracts, and superficial
white-matter fibres. The biologically directed visual pathway retains one-way
travel; every named long association tract uses disclosed stochastic 50/50
population impulses; superficial U-fibres retain direction-neutral vibration.

See [`docs/FUTURE_FEATURES.md`](docs/FUTURE_FEATURES.md) for researched future
directions and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the current
design and architectural review. Actionable work belongs in Beads; approved
implementation plans belong in [`.pi/plans/`](.pi/plans/).
