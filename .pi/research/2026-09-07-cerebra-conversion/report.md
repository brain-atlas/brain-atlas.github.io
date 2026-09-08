# Private CerebrA conversion — implementation evidence

Bead `brain-atlas-yum.14.10`; approved design in
`../../plans/brain-atlas-yum.14.9-cerebra-conversion-design-plan.md`.
Status: **technical candidate rejected by frozen numerical gates; work paused**.
Registration completed, preserved fields were validated without refitting, and
failure witnesses independently confirmed. No replay equality or technical
acceptance is claimed. Anatomical accuracy remains unvalidated; no domain assignment
or public adoption. Current result details are in the final section below.

## Environment and rights gate

`brain-atlas-g8gj` supersedes browser-only acquisition after host cache evictions.
See `uv-acquisition.lock`, `uv-environment.json`, and the amended plan. All 29 exact
versions and 8,517 RECORD file hashes passed. Private root:
`~/.local/share/brain-atlas/cerebra-conversion-yum14-10-2026-09-07/`.
The earlier `environment-preview.md` and `acquisition-progress.json` are historical
previews/progress, superseded by this section and `uv-environment.json` for current
installation status. Expanded uv cache is retained instead of all wheel containers.

Read-only peer reviewed all 33 copied notices completely (392,063 bytes), verified
their hashes and installed counterparts, and read 14 additional installed notices.
Initial gaps were full MPL2/LGPL2.1 texts and native component correspondence, not
identified prohibitions. Followup read canonical terms and version-bound build
sources; no concrete incompatible private-execution term remained. Parent fetched
nine key sources, retained texts/hashes in private `notices/supplemental/sources.json`,
and verified grants/build revisions. Primary records:

- MPL2: https://www.mozilla.org/en-US/MPL/2.0/ (§2.1 use grant; §3.4 preserve notices).
- LGPL2.1: https://www.gnu.org/licenses/old-licenses/lgpl-2.1.html (§0 running unrestricted).
- ANTsPy: https://raw.githubusercontent.com/ANTsX/ANTsPy/v0.6.3/LICENSE (Apache2).
- ANTs build: https://raw.githubusercontent.com/ANTsX/ANTsPy/v0.6.3/scripts/configure_ANTs.sh
  pins `b53aad349e6767de8e1d99a392f05a82b1bf2373`; its COPYING.txt supplies Apache2.
- ITK build: https://raw.githubusercontent.com/ANTsX/ANTsPy/v0.6.3/scripts/configure_ITK.sh
  pins 5.4.5, `f51594ad88194a72cdc06a314dafff709fcdc2e9`; LICENSE and
  Documentation/docs/licenses.md reviewed at that revision.
- libpng: https://raw.githubusercontent.com/pnggroup/libpng/v1.6.55/LICENSE
  grants use for any purpose. Peer tied version to installed dylib and wheel build.

Peer results: `runtime:delegated-results/c4a08d7f-43b7-432f-b271-0dbeee084af0/child-0.json`
and `runtime:delegated-results/709953bc-bf28-41df-b640-92a565dc2d76/child-0.json`.
No legal certification, exhaustive static-link audit, reproducible wheel-build
attestation, patent clearance, redistribution clearance, or dataset-rights closure
is claimed. Preserve licenses; no package modification or redistribution.

After those checks, isolated `uv run --no-project --offline --python <root>/venv/bin/python`
verified every active installed dependency constraint and imported ants, nibabel,
numpy, scipy and pandas successfully: 0.6.3 / 5.3.2 / 2.3.5 / 1.15.3 / 3.0.5.
One thread set before imports (ITK, OpenBLAS, OMP); bytecode disabled and Matplotlib
cache kept under approved private cache. First import built that font cache.
Redundant `--no-sync` caused a harmless uv warning; omit it in subsequent invocations.

Public runtime, geometry, shipped dependencies, lessons and licenses unchanged.
Existing unrelated `flake.lock`, right-OR research and three source ZIP files preserved.
`tools/assets/swm_domains.py` only moves two mesh-loader imports into their existing
functions so pure comparison reuse works without installing mesh packages. No loader
validation or numerical rule changed; `tools/assets/SPEC.md` records that boundary.
No current user-facing documentation change is needed.

## Synthetic implementation and review

`convert.py` delegates registration and nearest-neighbor resampling to ANTs. Custom
code binds inputs/environment and performs independent numerical checks, not custom
registration. `test_convert.py` has 12 passing tests: double input preservation,
RAS/LPS origins/directions/vectors, anisotropic/nonidentity grids, image/point
pullback and noncommuting order, categorical/support boundaries, unclamped world
Jacobian, inverse failures/empty support, label loss, adjacent-voxel swap rejection,
explicit inversion flags, comparator import isolation and output/method guards.
`test_review.py` has two passing tests for frozen review selection and exact decoded
array/grid comparison. Red logs precede implementation; green logs live in private
`receipts/`. Native extraction reuses seven passing existing parser tests.

Read-only review `runtime:delegated-results/6b4bec21-59f2-4b8d-af3c-1b99a4e9fa1d/child-0.json`
found central-derivative aliasing of adjacent voxel swaps and implicit `None` inversion
flags. Both were reproduced, then fixed before fitting. The added cell-wise test
bounds trilinear derivative intervals with outward rounding; nonpositive bounds
mean uncertified, not proven folded. It is deliberately sufficient/conservative,
restricted to the approved unit RAS grid, and never certifies global injectivity or
anatomical accuracy. It may reject a valid deformation rather than silently relax
after scoring. Final pre-fit review
`runtime:delegated-results/89d70733-779c-4b15-897f-a053c24013a6/child-0.json`
reported no actionable findings and independently checked 2,880 exact-rational
bound comparisons, five in-memory tests and overflow rejection.

## Historical registration execution (superseded status)

Original registration receipt: `method-v2.json`, SHA-256
`b3c85d682d00500eb5f7494f106c9218fa793040ca5f789e1600f66983c855dc`.
Original `method.json` (`653807eb62d54feacafcd0e896ae0afc50cc3de075243227187b814e1f409079`)
is **superseded**: `candidate-a` failed on a mesh-only import before fitting and
before writing scientific outputs. Its empty output root and log remain. V2
refreshes the import fix/test hashes; scientific settings and source identities
are unchanged. Both freezes were recorded in Beads before their attempted runs.

Method receipt captures full CPython/uv/distribution identities, implementation
hashes, complete source input sets, exact wrapper argv, intrinsic ANTs defaults,
engineering gates and fixed/extremal review slices. Seed zero is ANTs' no-fixed-
sampling-seed sentinel, not a fixed RNG seed; CC uses dense sampling. ANTs' intrinsic
histogram endpoint windowing remains; no extra normalization is added. Double
registration does not mean every internal scalar or the point wrapper is double.
Exact-repeat verification remains mandatory. Details and audit reference are in
the receipt; no parameter was tuned against a fitted result.

Native extraction uses the already approved h5py/parser environment and existing
`native_probe.run` source/environment preflight, then existing tested
`native_probe.canonical_data` and nibabel's float64 NIfTI writer. This is only axis
permutation, no interpolation/windowing. Original unit assumption is retained;
derivative code-4/mm header describes its actual numeric grid. Export:
`native-preparation/native-canonical-float64.nii`, SHA-256
`611243e1164d42fc83710128e7b9f3ba1fd86fedb96d40f9c386b0c0c78ec821`.
Its original-source/environment and derivative receipts are in that directory.

Execution command, with `ROOT` set to the approved private root:

```bash
ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS=1 OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 \
PYTHONDONTWRITEBYTECODE=1 MPLCONFIGDIR="$ROOT/cache/matplotlib" \
uv run --no-project --offline --python "$ROOT/venv/bin/python" python \
  .pi/research/2026-09-07-cerebra-conversion/convert.py \
  --method .pi/research/2026-09-07-cerebra-conversion/method-v2.json \
  --method-sha256 b3c85d682d00500eb5f7494f106c9218fa793040ca5f789e1600f66983c855dc \
  --output "$ROOT/candidate-b"
```

`candidate-b` launched under uv PID 44151. Private
`receipts/finish-candidates.sh` (syntax checked) waits for that specific command,
requires a completed report, renders preregistered review sheets, and stops on any
failed numerical gate. Only if B passes does it create new `candidate-c`, run the
same method, and compare decoded field/label/support arrays and grids exactly.
It never tunes, overwrites, deletes, or adopts assets. Launcher PID 45510.
Current progress: `receipts/workflow-status.txt`; logs: `candidate-b.log`,
`candidate-c.log` (only after C starts), `finish-candidates.log`.
A completed replay would have created `receipts/replay-comparison.json`.
**This continuation stopped; no replay occurred.** See current result below.
Do not infer completion from the presence of the script or planned output paths.

## Current result: frozen numerical rejection

Registration B completed in **3,251.52 seconds**. ANTs emitted an identity affine
alongside its two deformation fields; the wrapper's old one-file-only guard then
stopped before postprocessing. ANTs' established transform parser confirmed exact
identity matrix and zero translation/centre. The corrected shared guard discards
only that exact identity, rejects even `1e-12` translation, and changes no fitting
settings. Two failing regressions preceded the fix; all **14 conversion tests** pass.

User approved resuming checks without refitting. Current `method-v3.json`, SHA-256
`ed7a466b10a3fa92b58dcd4dc5952b421be7814fd8490a8ede315cfffc94f63f`, binds original B
receipt and all three output hashes, retaining v2 arguments, source roles,
environment and `technical_policy` unchanged. New `--reuse-registration` copies
only preflight-verified files into new `candidate-b-validated/`; original B stays
untouched. Diagnostic warped T1 is reconstructed through explicit ANTs linear
application in both modes. This recovery is **not a second registration execution**.
Guard/recovery review:
`runtime:delegated-results/0dc4fae7-c3e3-410a-a81c-d42d24945650/child-0.json` — no findings.

| Frozen check | Result |
|---|---|
| Target→source→target maximum residual ≤0.5 mm | **FAIL: 0.8517028651255683 mm** |
| Source→target→source maximum residual ≤0.5 mm | **FAIL: 0.5511378554652209 mm** |
| Roundtrip population/exclusions | 8,530,021 / 0, each direction |
| Positive central Jacobians | Minima 0.20231315170056272 / 0.22044858682582796; no nonpositive samples |
| Sufficient interval-cell positivity | **FAIL: 15 / 143 uncertified cells**, among 8,404,992 each direction |
| Original categorical IDs | All 0–102 preserved; no lost labels |
| Source support | All 8,530,021 voxels supported |
| Topology proxies | 74 labels have component/enclosed-background changes; unresolved, no cleanup |
| Two-registration exact replay | **NOT RUN** after numerical rejection |
| Anatomical accuracy/domain adoption | **UNVALIDATED / NOT AUTHORIZED** |

Uncertified interval cells are not proven folds. Positive central samples are not
complete-cell certification. The 0.5-mm budget is an engineering test, not anatomical
accuracy; failure is not a measured anatomical error. No thresholds, evaluated
population, masks, interpolation or registration parameters were changed after
these outcomes. No replay, tuning, cleanup, or public replacement follows this failure.

Independent numerical peer reported a full-grid RegularGridInterpolator check
matching both maxima, 88 / 2 points exceeding budget, exact label/support agreement,
and positive central Jacobians. Its final text was returned with a harness
`process-error` termination flag, so worker termination is not recorded as a clean
success. Evidence:
`runtime:delegated-results/f8c2eb3a-3969-4a2d-b6a0-984dfc494a03/child-0.json`.
Parent separately used SciPy RegularGridInterpolator, without `convert.roundtrip`,
to confirm two failure witnesses exactly within `1e-12`:

- Index (2,123,171), RAS (−94,−9,93): **0.8517028651255683 mm**.
- Index (1,119,116), RAS (−95,−13,38): **0.5511378554652209 mm**.

Those parent checks independently establish budget failure, not a second exhaustive
maximum search. Receipt: private `receipts/independent-failure-witnesses.json`.

### Disclosed nonexpert image inspection

All five `review-b-validated/review-01.png` through `review-05.png` sheets were
opened and inspected, covering all 20 preregistered fixed/extremal planes. Overlays
remain within recognizable gross anatomy and show local boundary shifts, including
ventricular, cortical and cerebellar outlines; small midline label fragments remain
visible. No red outside-support region appears, consistent with full support counts.
These observations neither resolve 74 topology-proxy changes nor certify fine
boundaries, hemisphere correctness independently of the coordinate tests, or
anatomical-domain authority. Numerical rejection stands despite recognizable images.
Review images/receipt remain private; they do not change shipped data or claims.

### Recovery and outstanding work

- Authoritative failed result: private `candidate-b-validated/report.json`.
- Raw registration: private `candidate-b/` (v2); postprocessing: `candidate-b-validated/` (v3).
- Raw forward/inverse hashes: `545569ec47d2552ca6979cbf28c17d96433bff3b3681d984179bc9698c1946fa`
  / `50d8c385d33edccf0e24f0ba229ce05178897585f1f9989f4777a7ebe5ae9bbe`.
- Decoded RAS forward/inverse hashes: `1ceaf9c00aefe92a410f4a9d7a23567852bb610070cebb4904de64ac48e71490`
  / `be7fdb0fcf545a86b4437e8c360a9e0d277f56304460fd8a7ec4c161a97deaee`.
- Labels decoded hash: `092f2b2bfeca2aaaacc6922f82f386a187b8473bc187be41d8208cc8c6790be8`.
- Current task cannot close as successful conversion. Any changed method or
  acceptance policy requires separate approval and predeclared new runs; preserve
  rejected outputs as evidence. `brain-atlas-yum.14.6` remains blocked for anatomy.
- Code, tests, method/environment receipts and documentation are preserved in a
  local administrative checkpoint; its commit and fresh verification are recorded
  in Beads. Bulk `pypi-metadata/` discovery responses remain local and untracked;
  the exact selected wheel inventory and acquisition locks are included. Partial
  outcome is unchanged. No push/deployment or public asset change.
