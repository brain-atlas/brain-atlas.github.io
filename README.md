# brain-atlas

Interactive 3D viewer of the human **visual pathway** (retina → optic chiasm →
LGN → optic radiations → V1), rendered as animated, field-quadrant-coded flow
**inside a real translucent cortical surface**. WebGL (Three.js), so it stays
smooth with tens of thousands of vertices — unlike the Canvas-2D prototype it
replaces.

## Use Brain Atlas

### Open the hosted viewer

**[Open Brain Atlas in your browser](https://brain-atlas.github.io/)** — no
installation, account, or download is required. The hosted GitHub Pages app is
the simplest and recommended way to use the atlas.

### Download a standalone binary

The standalone download contains the same reviewed atlas and opens it from one
local executable. It needs neither Node nor files beside the executable at
runtime.

- **Stable versions:** [Brain Atlas releases](https://github.com/brain-atlas/brain-atlas.github.io/releases)
- **Latest successful `main` build:** [mutable nightly prerelease](https://github.com/brain-atlas/brain-atlas.github.io/releases/tag/nightly)

Nightly is a preview channel: its tag and assets move after a newer `main` build
passes. Stable `v*` releases are versioned and are not replaced. Each release
provides these unsigned archives:

| Platform | Intel/AMD 64-bit | ARM 64-bit |
|---|---|---|
| Linux | `linux-amd64.tar.gz` | `linux-arm64.tar.gz` |
| macOS | `darwin-amd64.tar.gz` | `darwin-arm64.tar.gz` |
| Windows | `windows-amd64.zip` | `windows-arm64.zip` |

Download the archive, its commit-matched `SHA256SUMS`, and `PROVENANCE.json` from
the same release. Compare the archive's SHA-256 before extracting it. On macOS,
for example:

```bash
shasum -a 256 brain-atlas-<label>-darwin-arm64.tar.gz
# Compare with the matching line in brain-atlas-<label>-SHA256SUMS.
tar -xzf brain-atlas-<label>-darwin-arm64.tar.gz
./brain-atlas
```

On Linux, use `sha256sum` and extract the `.tar.gz`; on Windows, use
`Get-FileHash -Algorithm SHA256`, extract the `.zip`, and run
`brain-atlas.exe`. The archives also carry the project license, data-license
record, third-party notices, and citation file for inspection; they are not
runtime dependencies.

At runtime the executable:

- listens on an OS-assigned `127.0.0.1` port and rejects non-loopback `-addr`
  values;
- prints the URL and asks the operating system to open the default browser;
- exits ten seconds after the last authenticated Brain Atlas page disconnects,
  while allowing reloads or another tab to reconnect; and
- still accepts Ctrl+C or SIGTERM for immediate graceful shutdown.

Use `-no-open` to copy the printed URL yourself, `-stay-open` to run until
interrupted, or `-shutdown-grace 30s` to change the reconnect window. If browser
launch fails, the server remains available at the printed URL and does not arm
automatic shutdown until a page connects. This is a local web launcher, not a
native WebView or LAN server. Imported lessons may still contact the
supplementary HTTPS image hosts shown in their activation preview.

#### Opening the unsigned binary on macOS

The project does not yet sign or notarize macOS binaries. After verifying the
archive checksum, try to open `brain-atlas` once. If macOS blocks it, follow
Apple's one-time [Privacy & Security **Open Anyway**
procedure](https://support.apple.com/guide/mac-help/open-a-mac-app-from-an-unknown-developer-mh40616/mac).

If that control is unavailable and you trust the verified release, an advanced
command-line fallback removes quarantine from this executable only:

```bash
xattr -d com.apple.quarantine /path/to/brain-atlas
```

Do not use `sudo`, disable Gatekeeper, or recursively clear quarantine from
Downloads or another directory. Windows may likewise show a SmartScreen warning
because its binaries are unsigned. See [`docs/RELEASES.md`](docs/RELEASES.md)
for channel, checksum, provenance, and maintainer details.

## Scientific scope

**Everything posterior to the chiasm uses real atlas/template data in one runtime
MNI/ICBM RAS-millimetre frame.** The cortical surface and LGN/V1 shells are
MNI152NLin2009cAsym. Association tracts are verified ICBM 2009a Nonlinear
Asymmetric. The optic-radiation and SWM source is the exact HCP-1065 nonlinear
ICBM152 2009a FIB; its asymmetric variant is indicated by the release-companion
T1, but a direct FIB build binding was not retained. Fibre JSON keeps the decoded
source RAS+ world frame through resampling rather than claiming authorship on the
2009c voxel grid. The official releases describe the same anatomy with different
sampling. The app performs no per-dataset
fitting and applies one runtime transform. Only the anterior eye → chiasm → LGN
segment is schematic. The cited anatomy inspector separates literature-curated,
schematic, and displayed-dataset relationships. Association links are only
undirected, low-confidence endpoint proximity for the checked display sample—not
terminations, strengths, functions, or input/output direction. A separate categorical
endpoint filter can subset association and superficial fibres by displayed Jülich labels;
it makes no connectivity or polarity claim. See “What's real vs schematic” and the
scientific traceability inventory below.

### Loading and mobile limits

No-WebGL sessions load neither Three.js nor anatomical geometry. After the WebGL gate,
Atlas Home requests the complete authored dataset. A direct checked lesson loads only
the region meshes in its active view and defers SWM until a later scene requests it;
each deferred asset loads at most once through the canonical visibility path.
`tracts.json` remains eager because it combines association geometry with panel metadata.

A throttled 390×844 Chromium production profile reduced the direct lesson's initial
encoded anatomical/catalog transfer by 82.5% relative to Atlas Home. This desktop-hosted
emulation does not prove physical-phone GPU, battery, thermal, or mobile-Safari behavior.
See [`docs/PERFORMANCE.md`](docs/PERFORMANCE.md) for the method, measurements, replay
command, and deferred device matrix.

## Coordinate handling

There is exactly one runtime coordinate transform in the app. The cortical and
region assets are MNI152NLin2009cAsym RAS millimetres. Association tracts are
verified ICBM-2009a Nonlinear Asymmetric; OR/SWM use the exact nonlinear ICBM152
2009a HCP FIB with the variant limitation above. All fibre assets remain in their
decoded source RAS+ world frame through resampling, with no 2009a→2009c template
warp. `src/main.js` parents every layer to one `mniGroup` whose matrix maps that
shared stereotaxic world frame into the scene:

- scene `+x` = right, `+y` = up (MNI superior), `+z` = posterior (MNI −anterior);
- that is a proper −90° rotation about the R axis (determinant +1), so left/right
  **and** chirality are preserved (Meyer's loop hooks the anatomical way);
- uniform scale (`MNI_SCALE`, 1 = millimetres) and a recentring translation
  (`MNI_CENTER`).

The renderer derives camera aspect from the stage's exact CSS rectangle rather than
integer client dimensions, so fractional and zoomed layouts do not stretch one screen
axis. The WebGL drawing buffer may round to whole pixels, but projection remains matched
to the displayed box.

No dataset receives runtime fitting. The source releases use different voxel grids,
so the project never copies 2009a voxel indices into 2009c. Established parsers decode TrackVis voxel-mm vertices through voxel size,
half-voxel offset, orientation, and voxel-to-RAS metadata into RAS+ world
millimetres; adding a second
scene transform would be incorrect. The cortical surface and Jülich regions share the declared 2009c grid. Checked
offline pipelines under [`tools/assets/`](tools/assets/) reproduce the cortical,
region, and association assets from exact upstream sources and reproduce current OR
and SWM JSON from registered recovered TrackVis intermediates. Manual OR/SWM DSI
replays diverged and are retained as evidence, not replacement candidates. Detailed
fibre hashes, affines, derivations, replay classes, and numeric checks are in
[`docs/TRACT_SPACE_PROVENANCE.md`](docs/TRACT_SPACE_PROVENANCE.md). The separate
[`docs/TRACT_REGION_MAPPING.md`](docs/TRACT_REGION_MAPPING.md) record documents the
offline nearest-surface screen, input hashes, qualified/sensitive/rejected outcomes,
and interpretation limits without adding a runtime transform.

## Layout

```
flake.nix            Nix devShell (Node 22 + Go + git); blocks bare `nix develop`
.envrc / .envrc.d/   direnv: `use flake`, then npm install on entry
index.html           semantic Atlas/Lesson shell, drawer, shared stage, and viewer controls
cmd/brain-atlas/     standalone executable flags and process lifecycle
cmd/package-standalone/ six-target release build orchestrator
internal/site/       standalone Vite embed boundary
internal/standalone/ loopback HTTP, browser handoff, and tab-lifecycle shutdown
internal/releasepack/ deterministic archives, checksums, provenance, and validation
src/standalone/      standalone-only browser lifecycle client
src/bootstrap.js     workspace/history, lesson/import, navigation, disclosure, and fallback
src/main.js          lazy Three.js scene, data loading, activity, adapter, and panel bridge
src/activity/        renderer-independent physical travel, seeded impulse, vibration, and timing math
src/lesson/          versioned lesson parsing, catalogs, scene state, and adapter port
src/lessons/         checked-in Obsidian-style lesson content
src/ui/              renderer-independent presentation, workspace, scroll, and camera models
src/pathways.js      schematic anterior-pathway control points
src/style.css        responsive editorial scientific-instrument UI
test/                 focused Node tests for extracted pure behavior
scripts/browser/      replayable Firefox/Chromium UX, accessibility, and performance checks
.github/workflows/standalone-binaries.yml  artifact/nightly/stable release gates
tools/assets/         offline hash-bound anatomical generators, replay printer, and verifier
public/models/       licensed runtime GLB assets, including brain_mni.glb
public/data/entities.json / fidelity.json   stable scene/inspectable IDs and disclosure records
.workbench/           ignored, non-deployed local asset experiments
```

## Lesson contract foundation

The checked-in foundation parses Obsidian-style Markdown: one leading YAML
frontmatter block for metadata plus explicit inert `atlas-scene` YAML fences as
the domain-specific Markdown extension:

````markdown
---
title: How visual fields cross
schema: 1
status: draft
---

# How visual fields cross

```atlas-scene
id: chiasm
title: Crossing at the chiasm
visual: atlas
camera: lateral
show: [pathway.anterior, region.lgn]
fidelity: [fidelity.anterior-pathway, fidelity.julich-regions]
controls: { mode: look }
layout: dominant
```
````

Headings, lists, and other code fences remain ordinary prose; they never imply
camera or renderer behavior. Strict Markdown/YAML/schema validation rejects raw
HTML, unsafe URLs, unknown IDs/actions/versions, and malformed fields with
line/column diagnostics. V1 optionally accepts only `status: draft`; the parsed
lifecycle marker is separate from scientific representation status and cannot be used
to claim that imported content is reviewed or published. Valid scenes normalize to
complete immutable JSON state. Stable bindings live in `public/data/entities.json`;
geometry and activity status
remain separate in `public/data/fidelity.json`. See
[`src/lesson/SPEC.md`](src/lesson/SPEC.md) for the contract.

The app opens in the complete exploratory Atlas, not inside a lesson. The retained Viewer
controls provide orbit, zoom, pan, hemispheres, layers, cutaway, tissue, and activity over
the one canonical global-atlas snapshot. **Lessons** opens a responsive drawer with the
checked reference lesson and local Markdown entry. Starting a lesson preserves the actual Atlas
camera and filters. From a lesson, **Back to atlas**, the brand link, browser Back, and
**Explore this scene** all open Atlas from the lesson’s current rendered camera and complete
filters. Compact **Return to lesson** and **Exit lesson** actions distinguish temporary
inspection from closing the session. Return restores source, scene, selected visual,
rendered camera, canonical filters/playback request, exact `#page-scroll` position, and
focus. Exit removes the resume state and resets the complete default Atlas; an unsaved local
lesson asks for confirmation first. On the narrowest session header, lesson-entry actions
hide until Return or Exit so the two active-session choices remain readable and do not
overlap. Individual stochastic particles are not serialized. A compact Atlas moves the
camera uniformly away from the same target to keep the complete brain framed; anatomy,
canvas scale, and the MNI transform remain uniform.

The shipped **Early Vision: Retina to the Cortical Streams** reference lesson lives at
`src/lessons/retina-to-v1.md`. Its scientific evidence, section-level curriculum review,
and representation dependencies are recorded separately in
[`docs/lessons/retina-to-v1-validation.md`](docs/lessons/retina-to-v1-validation.md).
The optional Draft marker was removed after explicit human review; under v1, absence of
`status` makes no machine-readable reviewed or published claim. `src/bootstrap.js` parses
the lesson through the same contract used for local content. An unnumbered topic entry
adds V2, V3v, V3d, and the 794 superficial contours that touch the shared early-region
set before scrolling activates eight instructional scenes. The conclusion exactly
reprises that opening snapshot and lesion prediction. The LGN scene uses an authored
oblique view that keeps schematic incoming context, the optic radiation, V1, and 22
superficial contours with at least one unordered geometric endpoint assigned to LGN in
frame. The optic-radiation, V1, ventral, and dorsal
scenes use a centered half-shell cortical cut and hide right-hemisphere objects to reduce
duplicate visual load; directed LGN→V1 motion remains visible on the independently
derived left contours.

V1 and the three cortical-stream scenes add endpoint-filtered SWM and every named tract
group with a nonzero match under each scene's endpoint and hemisphere policy. The
shared-early query selects 445 association and 794 superficial contours bilaterally;
the left-only V1, ventral, and dorsal views select 138/259, 381/511, and 559/940
association/superficial contours. The filter tests unordered geometric endpoint
membership against displayed Jülich labels; it does not prove termination or connection
among highlighted regions. Long-tract impulses still use the disclosed 50/50 direction
assumption, and SWM keeps zero-mean vibration.
Fixed-position Previous/Next actions traverse the same sequence and can return to that
entry view. One
3D stage is shared throughout. The browser root remains fixed; the named, keyboard-
focusable `#page-scroll` region is the sole vertical lesson surface and retains the
native scrollbar. Wide layouts pair the reading rail with a pinned stage, compact
layouts use a shorter pinned stage plus a bottom transport bar, and 601–950 px-tall
wide layouts reduce canvas height to preserve the complete model box and a 20 px lower
gutter. Very short viewports retain the normal-flow fallback.
Changed source/destination filters remain eligible while their anatomy cross-fades
during the first half of a quintic-eased transition. The scene header owns scene
identity and progress. The persistent **Model & sources** control opens the sole
geometry/activity status and provenance surface; the canvas and stage do not duplicate
those records. **Inspect anatomy** exposes a small DOM-backed list for LGN, V1, optic
radiation, the two schematic eye markers, and the optic chiasm. Hover or keyboard focus
shows the same transient highlight and short label; mouse click, Enter, or the revealed
label opens cited details. A first raw-canvas touch previews and a second activation opens.
Wide details are nonmodal; compact details use a focus-contained bottom sheet. Both close
without changing camera, filters, playback, lesson position, or canonical scene selection.
Close restores focus and the exact lesson-surface position.

Within a lesson, every Atlas entry uses the same top-level surface and temporary
lesson-derived branch with the active filters and exact rendered camera. It grants full
controls without overwriting the persistent global Atlas. **Return to lesson** restores
the stable token and discards temporary edits. **Exit lesson** clears that token and resets
Atlas Home to the authored complete default. No second renderer, canvas, WebGL context,
filter path, or coordinate transform is created.

The checked lesson has a static-safe `?lesson=retina-to-v1` route. Atlas uses the base URL.
Browser Back/Forward uses the same workspace transition path as visible controls. Local
source stays memory-only; `?lesson=local` marks only a session that cannot survive reload.
Reload removes that marker, returns to Atlas, and announces that local content was not
retained.

Three.js is dynamically imported only after a WebGL2 probe. If WebGL is unavailable or
renderer initialization fails, Atlas orientation, sources, Lessons, local import, and the
semantic cited anatomy inspector remain usable. Checked or local lessons retain prose,
navigation, fidelity records, and supplementary images without downloading the renderer;
only canvas raycasting and visual highlighting are unavailable.

**Open lesson** in the header accepts a local `.md` file or pasted source up to 512 KiB.
Validation is non-destructive and uses the same strict contract as the checked-in lesson;
the preview reports title, Draft state, scene/image counts, and external image hosts before
**Open lesson** is enabled. Explicit opening replaces the current lesson in memory through
the same controller and renderer adapter. It does not upload, save, or persist the source,
and reload returns to Atlas without restoring local source. Declared HTTPS supplementary images begin
loading only after opening. They remain semantic DOM figures—not WebGL textures—with alt
text, caption, credit, source link, no-referrer loading, and an accessible retry state.
V1 accepts credential-free HTTPS image sources only; packaged repository-relative lesson
images are not yet part of the contract. Scripts, styles, frames, raw HTML, unsafe URL
schemes, arbitrary fetches, and undeclared images remain forbidden.

## Controls

Use **Lessons** to start/resume the checked reference lesson or open the local workflow. Use
**Open lesson** directly to stage local Markdown by paste or `.md` file, correct positioned
validation errors without losing the active lesson, review the preview/privacy summary,
and explicitly activate it. Scroll or use Previous/Next to activate a scene. The reference lesson omits Restart
because its scenes do not yet define replay timelines; **Skip transition** appears on the
stage only while camera motion is active, jumps to the authored destination camera, and
settles activity without accelerating model time.
Pointer drag rotates only when the scene control policy permits it. In normal Lesson
mode, touch swipes scroll `#page-scroll` without rotating the camera. Atlas Home and the
lesson-derived Atlas view grant full orbit, wheel/pinch zoom, right-drag/two-finger pan,
and canonical viewer-filter editing. Use **Inspect anatomy** for an equivalent named keyboard/screen-reader path to each
currently visible reviewed canvas target; focus previews, and activation opens the same
cited detail view. Relationship details show direction, source class, method, status,
confidence, and sources. Association records always say **Undirected · Displayed dataset ·
Qualified · Low confidence**; endpoint filtering creates no new relationship records.
Reduced-motion preference makes authored camera changes
instant, settles activity, disables Play, and removes the Skip action. The renderer also
suspends draws and model clocks while the tab is hidden or the 3D stage is fully
offscreen, preserving explicit Play/Pause intent; visible paused or settled views redraw
only when controls, state, layout, or assets change.

The **Viewer controls** dock contains Play/Pause, activity speed, **Cutaway**,
**Tissue**, Side/Top/Back/Front, hemisphere/layer filters, endpoint-filter presets and
custom all/touches/within/between queries, Auto-rotate, and Reset. Closing the dock on a
wide screen returns its space to the atlas while leaving a keyboard-accessible reopen
control; compact screens keep the bounded stacked panel. Viewer actions, filters,
ranges, and label-backed checkboxes expose at least 44×44 CSS-pixel effective targets.
Structure disclosures, focus, and scroll remain stable while L/R filters change. Every structure row names its L/R
controls in context and provides a keyboard-operable combined-hemisphere toggle.
Selecting no visualizations is a
valid, labelled state, and any layer can be re-enabled without reloading. Counts and
known/unknown/ambiguous assignment quality update in an accessible status summary.
Lesson mode keeps the fieldset disabled so panel clicks cannot bypass authored state.
Atlas projects its active canonical snapshot into the same panel; filter and display
changes use the same renderer adapter, and keyboard-operable Zoom/Pan actions supplement
pointer and touch camera input. Auto-rotate stays off and hidden in Atlas.
Legacy fixed-anchor 3D labels are hidden in the reference lesson pending the responsive
placement work in `brain-atlas-zmq.20`; the free viewer label layer remains available in
Atlas.

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
  event from an explicit 50/50 assumption for each tract and hemisphere. Each event
  traverses cumulative MNI arc length at 40 mm per display second when the activity
  speed control is 70, so shorter contours finish sooner. This common speed, playback
  scaling, event rate, and refractory timing are illustrative display algorithms—not
  measured spikes, tract-specific physiology, or universal axonal conduction velocity.
  Separately, a qualified inspector link means
  at least 18/180 sampled streamlines in each hemisphere had an unordered endpoint
  nearest to that displayed region shell within both 3 mm and 5 mm. It remains a
  low-confidence proximity observation—not a termination, connection strength,
  function, or direction. “Inhibition” means per-channel refractory self-inhibition
  and recovery, not inhibition between anatomical tracts.
- **Schematic (labelled in the legend):** the anterior pathway (eye → chiasm →
  LGN), its flow dots, and the eye markers. Anterior and LGN→V1 dots share the same
  cumulative-distance travel contract as long-tract impulses: 40 MNI mm per display
  second at activity speed 70. LGN→V1 event timing remains a physiologically patterned
  but illustrative firing model (superposition + thinning, with refractoriness and
  bursts), not recorded spikes. Biological time is dilated for legibility; the common
  travel speed is not a measured or universal conduction velocity.
- **Undirected activity:** superficial-WM/U-fibre dots follow bounded sinusoids
  around fixed homes on real bilateral contours. Amplitude derives from local
  fibre-length structure, random phase prevents coherent travel, and no endpoint
  clipping biases the contour-parameter mean or assigns a travel direction.
- **Geometric endpoint classes:** `fibre_endpoints.json` assigns both stored ends of
  every association and SWM contour to a supported Jülich MPM label, an explicit
  ambiguous class, or an explicit unknown class. The classifier chooses the nearest
  nonzero MPM label. If its centre is within 2 mm and the label has a project region
  entity, the endpoint is known; a second label within a 0.5 mm distance margin makes
  it ambiguous. The 2009a fibres and 2009c labels share
  RAS millimetres but no template warp or voxel-grid equivalence. Filters preserve
  unordered geometry and cannot establish polarity, termination, connectivity,
  strength, function, probability, or individual anatomy.
- **Mirrored:** the right optic radiation is a sagittal mirror of the left until
  independently generated right-side streamlines replace it. Region,
  association-tract, and superficial-WM geometry are real bilateral data.

## Development

The development environment is a Nix flake wired through direnv. From a source
checkout:

```bash
direnv allow      # loads Node 22 + Go + git, then installs npm packages
npm run dev       # Vite development server → http://localhost:5180
```

Without direnv:

```bash
nix develop       # or have Node 22 and Go 1.23+ on PATH
npm ci --ignore-scripts
npm run dev
```

Run the renderer-independent and standalone tests, then build the ordinary
static publication:

```bash
npm test
CGO_ENABLED=0 go test ./...
go test -race ./internal/standalone
npm run build             # → dist/ for local development
npm run build:publish     # publication guard, then ordinary production build
npm run preview           # serve dist/ on :5180
```

Vite's HMR full reloads can churn the GPU context on this heavy WebGL page. For
stable viewing, use the HMR-free preview:

```bash
npm run build && npm run preview
```

Use `npm run dev` only while editing. If a tab misbehaves after a restart,
hard-reload or reopen it once the server is back. The optic-radiation mesh is
decimated specifically to reduce GPU memory pressure.

For GitHub Pages or another public deployment, build from a clean checkout with
`npm run build:publish`. Vite copies every file under `public/`; the publication
guard prevents untracked experiments with unknown provenance from entering
`dist/`.

### Build standalone binaries from source

Build one host executable containing the reviewed production page, anatomical
assets, licenses, and notices:

```bash
npm run build:standalone
./build/brain-atlas           # Windows: .\\build\\brain-atlas.exe
```

The build forces `CGO_ENABLED=0`; Node and Go are build-time requirements only.
To reproduce all six release archives, checksums, and provenance:

```bash
npm run build:release -- --label ci-local
npm run verify:release -- --label ci-local
```

The release workflow and maintainer procedure are documented in
[`docs/RELEASES.md`](docs/RELEASES.md). Do not manually move `nightly`, publish a
`v*` tag, or alter an existing stable release without the repository's approval
and verification gates.

## AI-assisted development

Generative AI coding assistants supported software implementation, test creation,
documentation, research organization, and code review. Their suggestions were
human-directed and treated as drafts. The human maintainer made the scientific
and product decisions, reviewed and tested changes, verified cited sources, and
remains responsible for the software and its claims. AI systems are not credited
as authors.

No generative AI model runs in the deployed viewer, and the viewer does not send
lesson content, imported Markdown, anatomy data, or other user content to an AI
service.

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
- Optic radiation (`public/data/or_fibres.json`): left streamlines re-tracked with
  **DSI Studio** on the official **HCP-1065 1 mm nonlinear ICBM152-2009a FIB**,
  using 2009c Jülich V1/LGN masks with matched qform/sform world matrices, then
  resampled; three streamlines were removed by the project's >18 mm V1-centroid
  rule.
- Association tracts (`public/data/tracts.json`): selected and resampled from the
  **HCP-1065 Population-Averaged Tractography Atlas** (Yeh 2022), in ICBM 2009a
  Nonlinear Asymmetric RAS+ world millimetres. `tools/map_tract_regions.py` compares
  their unordered display endpoints with the shipped Jülich shell triangles offline;
  `public/data/tract_region_mapping.json` freezes the descriptive result.
- Superficial white matter (`public/data/swm_fibres.json`): short bilateral
  contours re-tracked on the same HCP-1065 FIB from a 2009c TemplateFlow-derived
  superficial-WM seed with matched qform/sform world matrices, filtered by
  cortical-ribbon endpoints, deterministically sampled, and resampled.
- Region shells (`public/data/regions/*.obj`): adapted from the
  **Jülich-Brain v3.0.3** maximum probability map by extracting regions and
  converting volumetric labels to simplified surface meshes.
- Fibre endpoint classes (`public/data/fibre_endpoints.json`): deterministically
  generated from the same exact Jülich MPM plus the checked association/SWM order and
  preset catalog. The source NIfTI is hash-verified during offline generation and is
  not redistributed. `public/data/fibre_filter_presets.json` defines four strict
  unordered geometric queries; three are used by the reference lesson.
- Rendering: [three.js](https://threejs.org/) (MIT).

The checked offline tooling never downloads sources implicitly or overwrites
`public/`. Cortex, region, and association outputs regenerate byte-for-byte from
hash-registered upstream files. OR and SWM preparation and post-processing are also
byte-exact, but the surviving DSI Studio execution is not replay-deterministic for
the registered legacy runs: OR remained class 4 (`216→215`, with a clean repeat of
`234→233`, versus recovered `223→220`), and SWM remained class 3 despite producing
the required `200,000→15,000` shape. Current OR/SWM assets therefore remain tied to
their exact recovered TrackVis intermediates. No replay output replaced public data.

See [`DATA_LICENSES.md`](DATA_LICENSES.md) for source links, citations, license
terms, modification disclosures, and the required WU-Minn HCP acknowledgment.
See [`docs/SCIENTIFIC_TRACEABILITY.md`](docs/SCIENTIFIC_TRACEABILITY.md) for the
layer-by-layer separation of anatomical data, derivation, modeled activity,
display choices, assumptions, and known fidelity gaps, and
[`docs/TRACT_SPACE_PROVENANCE.md`](docs/TRACT_SPACE_PROVENANCE.md) for fibre source
hashes, affines, recovered processing, and numeric co-registration checks.
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
Atlas and lesson scenes can filter association/SWM lines, endpoints, and eligible
activity through one categorical unordered-endpoint query without adding a transform.

See [`docs/FUTURE_FEATURES.md`](docs/FUTURE_FEATURES.md) for researched future
directions and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the current
design and architectural review. Actionable work belongs in Beads; approved
implementation plans belong in [`.pi/plans/`](.pi/plans/).
