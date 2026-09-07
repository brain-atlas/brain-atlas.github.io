# Domain atlas compatibility design-plan

- Bead: `brain-atlas-yum.14.6`; branch: current checkout.
- Date: 2026-09-07. **Status: implemented private diagnostic under implementation request and `brain-atlas-5ezq`; numerical rules below were frozen before SWM scoring. Full Bead remains partial. Not anatomical or runtime adoption.**
- Evidence: [source review](../research/2026-09-07-domain-atlas-selection/report.md).
- Acquisition: user supplied original DOI ZIP under `brain-atlas-gcoh`; all 18 entries passed safety/CRC checks. Receipt at `~/.local/share/brain-atlas/domain-atlas-selection-yum14-6-2026-09-07/acquisition.json`.

## Outcome and boundary

Test whether CerebrA adds useful independent source evidence for the disputed
carpet compartments. No warp, new runtime interface, classifier adoption, public
asset/manifest replacement, source redistribution or dependency installation.
Source review plus numerical comparison may reject adoption; it must not manufacture
anatomical validity to close the Bead. Remaining acceptance is reviewed explicitly.

CerebrA is symmetric 2009c; carpet/T1 are asymmetric 2009c; fibres remain 2009a.
Equal affines do not establish anatomical correspondence. CerebrA's selected sform
is code 1, qform unset (code 0), units unknown, float32 exact integers 0..102,
identity scaling, 193x229x193 at [-96,-132,-78] with unit axis scales.
Preserve these facts, do not rewrite headers. MINC2 native T1 requires absent h5py;
no ad-hoc binary parser or dependency installation. Any overlays use explicitly
labelled **asymmetric** reference T1 and are not native-template validation.

## Frozen `cerebra-carpet-comparison-v1`

- Reuse `tools/assets/swm_domains.py` input checks, displayed-point loading, voxel
  sampling and frozen strata; use `common.py` hash/environment/empty-output guards.
  All source files hash-check before parsing. Private source inventory records all
  18 acquired files plus source/terms; original scripts remain data, never execute.
- Parse CSV with stdlib csv, two header rows, 51 unique RH IDs 1..51, LH=RH+51;
  retain exact names and both IDs. Do not use Jülich's different +1000 convention.
- Candidate groups: cortex; brainstem; lateral/inferior-lateral ventricles;
  third/fourth ventricles; cerebellar GM; cerebellar WM; grouped vermis;
  named deep gray (thalamus, caudate, putamen, pallidum, hippocampus, amygdala,
  accumbens); composite ventral diencephalon/basal forebrain; optic chiasm;
  background; outside-grid. Composite and chiasm labels cannot settle tissue domains.
- Count all 15,000 contours, 120,000 stored samples, 30,000 geometric endpoints.
  Baseline nearest-even; no nearest-nonzero or majority-based anatomical assignment.
- Source-label comparison states: `supported` for cortical↔cortex,
  deep-gray↔named-deep-gray, lateral-ventricle↔lateral/inferior-lateral,
  source5↔brainstem, source255↔cerebellar GM/WM/vermis. `unresolved` for either
  background/outside-grid, candidate composite/chiasm, or source255↔brainstem
  (brainstem label cannot isolate midbrain). Other positive label pairs are
  `conflicting`. These are semantic source-label comparisons, **not anatomical
  supported/conflicting assignments** or measured accuracy.
- Every actual anatomical domain remains unresolved and anatomical primary null.
  Do not produce domain-only outcomes without validated domain authority.
- Summaries: points/endpoints, any-point contours (overlapping), unordered endpoint
  state pairs, all-eight-same/mixed; candidate groups; carpet-by-candidate and
  carpet-by-comparison cross-tabs; frozen hemisphere/length/legacy-quality strata;
  existing source255-any and broader-union-any target populations and complements.
- All 27 coherent offsets in {-0.5,0,+0.5} mm applied to BOTH maps; compare against
  baseline, report source-label and comparison-state changes. Also alternate
  floor(v+0.5) rounding. Probes are not registration uncertainty/confidence bounds.
- Retain original contour index, both source label sequences, comparison states and
  all-probe candidate-group possibilities; groups are not probabilities. No tuning.
- Fixed encounter panels: prior contour/point pairs 11/0,149/2,1154/1,3/0,47/5,
  99/7,0/0. Add smallest original contour/point index for each observed comparison
  state within each carpet compartment, de-duplicated. Native 1-pixel/voxel slices;
  nearest-even slice choice, signed slice offsets, anatomical orientations disclosed.
  Asymmetric T1 alone, carpet overlay and CerebrA overlay use same slice/window.
- Serialize finite sorted compact JSON + newline. Inventory method and reused-code
  hashes plus locked environment. Repeat into new empty roots and compare all bytes.

## Implementation and verification

Private files under `.pi/research/2026-09-07-domain-atlas-selection/`:
`source-manifest.json`, `evaluate.py`, `test_evaluate.py`, `report.md`.
No new production CLI or dependency. Test first: CSV identities, header/scaling
rejection, source-label comparison incl. composite/source255 limits, finite/bounds/
tie sampling, complete count balance/reversal, drift and unsafe-output rejection.

Run locked Python focused tests and evaluator twice; independently check inputs,
real sample oracles, output accounting and inspect generated panels. Run `npm test`,
`npm run build`, checked asset `check-manifest` and `verify-current`, diff checks.
Peer review must assess scientific wording and full Bead acceptance, not merely
code correctness. Preserve any unmet native-template/rights/anatomical gates;
no successful closeout until acceptance is met or separately narrowed by owner.

## Native-template supplement — approval `brain-atlas-g7fk`

The initial diagnostic is frozen at commit `59d4a26`; its parser limitation below
is historical, not current after this supplement. Approved h5py 3.14.0 macOS arm64
CPython3.13 wheel: 2,807,335 bytes, SHA-256
`ef9603a501a04fcd0ba28dd8f0995303d26a77a980a1f9474b3417543d4c6174`.
Browser acquisition succeeded. Retain wheel and bundled terms privately; offline uv
adds only h5py/HDF5 to the exact base package set. Production lock remains unchanged.
Installed h5py distribution tree `69ca6dc35e165dd9a8eecf252bb7262ef4beaebfda6cc9cd44ce8c8d53faaad8`.

Before native comparison scoring: add a small `native_probe.py` and focused tests.
Hash-check all candidate/reference inputs and the prior summary; verify base
environment plus h5py tree. nibabel loads native MINC2, whose voxel axes are Z,Y,X;
`as_closest_canonical` reorders axes into the existing RAS grid without interpolation,
registration, reflection of anatomy or new point transform. Require exact affine,
shape and finite data after reordering. Test permutation/world-coordinate preservation
and reject grid/nonfinite drift.

Frozen native comparison: positive CerebrA labels define a **label-support mask**,
not whole brain/tissue truth. On this same mask, independently normalize each T1 by
its 1st/99th percentiles, clipping to [0,1]. Report voxel count, both windows,
Pearson correlation and mean/median/95th-percentile absolute normalized intensity
difference. These are photometric descriptors, not anatomical alignment error,
accuracy, uncertainty radius or pass/fail thresholds. No tuning or warp.

Render the seven original fixed encounters (11/0,149/2,1154/1,3/0,47/5,99/7,0/0):
native symmetric T1/overlay and asymmetric reference T1/overlay, same unshifted
CerebrA labels, native one-pixel/voxel slices, signed offsets and orientation captions.
Inspect each individually. Do not overwrite original evaluation outputs. Two native
runs must be byte-identical. Record native parsing as resolved but keep any geometric,
coverage, rights or anatomical-domain adoption gaps open; reading MINC2 is not validation
of all anatomy.
