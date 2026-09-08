# CerebrA offline conversion — approved technical-candidate design

- Design Bead: `brain-atlas-yum.14.9`.
- Implementation Bead: `brain-atlas-yum.14.10`; blocks `brain-atlas-yum.14.6`.
- Status: **Approved scope; implementation produced a numerically rejected private candidate. Execution paused.** See `.pi/research/2026-09-07-cerebra-conversion/report.md`; this design is not evidence of technical or anatomical acceptance.
- Authority: `brain-atlas-2x3m`, 2026-09-07; original direction `brain-atlas-bs4u`.
- Branch: `main`; task-owned local commits only, no push.
- Evidence: `59d4a26`, `afaa36c`, and
  [native/source review](../research/2026-09-07-domain-atlas-selection/report.md).

## Material amendment and limits

This replaces this file's original **draft**, which required unavailable expert
anatomical review and did not select a registration implementation. The owner says
qualified review is beyond available resources. Approval `2x3m` permits a private,
reproducible **technically checked conversion candidate**, not certified anatomy.
Automated geometry checks and descriptive atlas corroboration replace that work's
expert-validation deliverable; they do not supply equivalent scientific evidence.

`yum.14.6` remains open for anatomical-domain authority. Every anatomical domain
remains explicitly unvalidated. Missing validation coverage is not a pass. Neither
T1 similarity, repeatability nor agreement with carpet is anatomical accuracy.
No anatomical error threshold is invented. No paid review or further validation
asset acquisition is required by this technical-candidate implementation.

Move the atlas, not the fibres. Keep source labels, original input metadata and
unwarped 2009a fibre JSON intact. No public asset replacement, domain assignment,
runtime change, second transform, redistribution, push or deployment. CerebrA still
lacks comprehensive cerebral WM/full CSF/fine brainstem and cerebellar nuclei.
Conversion cannot cure those ontology gaps or establish biological endpoints.

## Pinned inputs

Inventory: `.pi/research/2026-09-07-domain-atlas-selection/source-manifest.json`.
Private source root:
`~/.local/share/brain-atlas/domain-atlas-selection-yum14-6-2026-09-07/inputs/`.
Reference root:
`~/.local/share/brain-atlas/swm-domain-audit/brain-atlas-yum.14.3-source-2026-09-07/inputs/`.

| Role | Filename | SHA-256 |
|---|---|---|
| Moving T1 | `mni_icbm152_t1_tal_nlin_sym_09c.mnc` | `04cd0dac790801d0cc580a5ef5ed9f2b36a744e548866d8a2f9251b8e6e2e071` |
| Moving labels | `CerebrA.nii` | `c83e8038b21ff85c5efaa4082eb1a4560f4bae392bc6f9b1fc0a7888e4fce1d3` |
| Label identity | `CerebrA_LabelDetails.csv` | `1f27188447421c37f35d0cb3c7adebd072ecbe745f52ae23066f3a98337d8c4c` |
| Fixed T1 | `tpl-MNI152NLin2009cAsym_res-01_T1w.nii.gz` | `1f27aabea9f7183dc0c69dafa71e1787b921ca778d655d9c1bf302b273d5627a` |

Native MINC2 is Z,Y,X storage. Existing nibabel/h5py canonical conversion is an
exact voxel-axis transpose, not interpolation. Canonical source/target grids are
193×229×193, unit RAS axes, origin [-96,-132,-78]. Equal grids are not equal anatomy.
Source labels: qform unset, sform=1, units unknown; retain documented numeric-mm
assumption. Target T1: matching code-4 forms and mm. Hash before parsing; stop on
form, size, source identity or label-table drift. CerebrA IDs are 0..102, 51 RH
labels and LH=RH+51, not Jülich's +1000 convention.

## Established method and isolated environment

**Acquisition amendment — `brain-atlas-g8gj`, 2026-09-07:** The owner requested
`uv` after browser artifact quota evicted downloaded wheels. This supersedes the
browser-only acquisition, pre-install bundled-notice review, and all-compressed-
wheel retention requirements below. The exact 29-wheel inventory is unchanged
(`.pi/research/2026-09-07-cerebra-conversion/wheel-inventory.json`, SHA-256
`5c5b4740bbb590e54676016bfb9efc1978a5744668d6648afaa76af00ca04c0a`).
Use `uv pip install` with exact URLs/local wheels, required hashes, no index,
no dependency discovery, binary-only/no-build, no configuration discovery, and
existing CPython 3.13.1. Reuse four retained verified wheels; fetch only the 25
missing wheels (63,012,486 bytes). New `venv/` and private `cache/` stay under the
approved private root; preserve existing `wheels/` and receipts. Retain expanded
uv cache and installed-tree hashes instead of requiring original wheel containers.
Review installed metadata and bundled notices **before any package import or
scientific execution**; unknown/incompatible terms still block use. No base
lock/environment, public asset, scientific method, or 2-GiB private-size ceiling
change. The original ordering below is historical where this amendment differs.

Select ANTsPy **0.6.3**, CPython **3.13.1**, Darwin arm64. Verified PyPI wheel:
`antspyx-0.6.3-cp313-cp313-macosx_14_0_arm64.whl`, 16,637,911 bytes,
SHA-256 `0c9ec8fcee72d7c7fe0d820dbfc9d7f929db3306037be27f24b52e30ae1ccbc0`.

It requires NumPy<2.4 and SciPy<1.16, incompatible with the asset pipeline's pins.
Do **not** downgrade that pipeline or modify global/home-managed configuration.
Use a separate private environment; native extraction may reuse the already
approved parser environment to avoid mixing scientific stacks.

Before acquisition/install:

1. Resolve a wheel-only, hash-locked complete transitive inventory, including
   Python/platform identity, bytes, URLs, notices and dependency licenses.
   Bound: at most 30 distributions and 500 MiB total; no source builds.
2. Present exact inventory and installation effects through the required approval
   and acquisition surfaces. `2x3m` allows preparation, not unreviewed transitive
   downloads/install. No alternative shell downloader or automatic source fallback.
3. Retain approved wheels/notices and installed distribution-tree hashes in a new
   private root. Fail on missing binary, unsupported platform, terms conflict,
   size/hash drift or unavailable dependency. No implicit network during replay.

Approved method selection (freeze full emitted ANTs argv before real fitting):

- Fixed = pinned asymmetric2009c T1; moving = canonical symmetric2009c native T1.
- `SyNOnly`, explicit identity initialization; no affine/global fitting or mirroring.
- CC radius 4; `grad_step=0.2`, `flow_sigma=3`, `total_sigma=0`;
  iterations `(50,50,30)`; float64, one thread, seed 0.
- No label, fibre or validation target enters fitting. No metric mask; use T1
  images, not the incomplete positive-label mask. No histogram matching.
- Inspect pinned implementation to enumerate generated smoothing/shrink schedules,
  convergence, winsorization and all other effective defaults in a hashed receipt.
  Do not introduce extra normalization or tune settings after viewing results.
  Unexpected wrapper behavior blocks execution until reconciled with this method.

Alternatives rejected: custom registration duplicates established machinery;
coarse no-warp adoption leaves correspondence unresolved; expert validation is
unavailable. This is one fixed candidate, not a search for an agreeable result.

## Coordinate and categorical contracts

RAS world coordinates are canonical project data. ITK/ANTs uses LPS: test the
basis change `diag(-1,-1,1)` explicitly for origins, directions and vectors; do not
mistake a basis change for anatomical mirroring. Use established NIfTI/MINC and
ANTs parsers, not hand-parsed image/transform bytes.

Document independently:

- physical point map source→target and its inverse;
- fixed-grid→moving-image pullback used when resampling;
- ANTs image-list order versus point-list order and inversion flags.

Before real fitting, asymmetric synthetic coordinate images, translation and
noncommuting composition fixtures must prove these directions. Include negative
world coordinates, anisotropic/nonidentity affine, left/right label identities,
identity, boundaries/outside support, inverse composition and wrong-direction
negative tests. Never infer semantics from `fwd`/`inv` filenames.

Resample categorical labels once with `nearestNeighbor`, outside value 0, into
exact fixed grid; no continuous label averaging, invented probabilities, filling
or smoothing. Preserve original IDs. Distinguish background zero from out-of-source
support using a separately transformed support image. Keep source metadata and
numeric-mm assumption in provenance; derivative header describes its actual target.

## Technical acceptance versus anatomical evidence

Hard technical gates, frozen before fitting:

- Fields and outputs finite; dimensions/forms/physical basis match receipts.
- Forward/inverse Jacobians strictly positive. Compute unclamped determinants
  independently; do not rely on a routine that clips negatives. Record derivative
  stencil/boundary treatment; untestable boundaries remain excluded/unverified,
  never implicitly certified. Reject folds/reflections, do not smooth them away.
- In valid bidirectional interpolation support, forward/inverse round-trip error
  ≤0.5 mm. This is a predeclared **engineering half-voxel budget**, not anatomical
  registration accuracy. Report maxima, quantiles, evaluated population and all
  excluded support separately; empty support fails, exclusions cannot hide defects.
- Output IDs remain within 0..102; loss of an originally present label fails.
  Record per-label counts, component/topology changes and support loss. No silent
  cleanup or automatic acceptance of coverage/topology defects. Investigate and
  retain unresolved defects rather than relabeling them numerical noise.
- Two executions in new empty roots must match decoded fields and label arrays
  exactly. Retain container hashes separately; timestamps/paths in logs may differ.
  Any numerical drift blocks technical acceptance; do not widen tolerance afterward.

Registration magnitude, label volumes, topology changes and T1 similarity are
reported, not assigned invented anatomical pass bands. Record whole-grid and
per-label summaries, baseline no-warp comparisons and all support exclusions.
Freeze deterministic nonexpert slice review selection before fitting, including
cerebellum/brainstem, deep gray, ventricles and cortex/WM, plus extrema selected by
explicit diagnostic rules. Visual review may detect defects; it cannot certify
anatomy. No training/holdout accuracy split is claimed without independent truth.

Existing carpet comparisons reuse source pins and label semantics in
`.pi/research/2026-09-07-domain-atlas-selection/evaluate.py`. They are descriptive
corroboration only. Carpet is not independent manually validated target anatomy;
fit T1 and target-derived tissue evidence can share construction dependencies.
Do not optimize agreement, tune thresholds, or call atlas disagreement error rate.

## Implementation sequence and files

Implementation lives in a small private research module, not a new public CLI:
`.pi/research/2026-09-07-cerebra-conversion/`. Reuse input/output/hash guards from
`tools/assets/common.py` where compatible; do not weaken its environment preflight.
Read the existing `native_probe.py` and `test_evaluate.py` before reusing native
extraction. No edits to `tools/assets/requirements.lock`, `public/` or `src/`.

1. **Environment receipt:** resolve and approve exact wheel inventory, then install
   into private isolated environment and record verified trees and notices.
2. **Tests first:** `test_convert.py` covers coordinate/direction, categorical/support,
   input/output safety, unclamped Jacobian and deliberate fold/inverse failures.
   Observe missing implementation failure, then implement minimal `convert.py`.
3. **Frozen method:** write `method.json` and source/environment manifest after
   reviewing v0.6.3 effective options, before processing real fitting outcomes.
   Missing required fields fail closed. Record exact commands in `report.md`.
4. **Candidate runs:** execute two new-root conversions, then compare decoded arrays
   and full output inventories. Preserve failed artifacts; never overwrite originals.
5. **Review:** independent code/numerical review plus disclosed nonexpert image
   inspection. Record technical pass/fail separately from anatomical-unvalidated.
   No automatic adoption even if every numerical check passes.
6. **Closeout:** retain report, source/method/environment pins, tests and relevant
   implementation code; raw third-party/large derived files stay private. Commit
   task-owned files, document deviations and close only technical candidate work.

Test invocation after files/environment exist:
`<approved-isolated-python> .pi/research/2026-09-07-cerebra-conversion/test_convert.py`.
The actual resolved interpreter path and replay CLI are implementation receipts,
not fabricated working commands in this design. Run `npm test`, current-asset
verification and diff checks at implementation closeout. No runtime/browser or
release-readiness claim is needed for private conversion-only work.

## Rights, invalidation and rollback

CerebrA's dataset declares CC0, but the retained upstream
Mindboggle/Neuromorphometrics rights uncertainty remains. `2x3m` permits private
candidate scope only, not derivative/source redistribution. Retain source terms,
attribution and ANTs/dependency notices. Unknown/incompatible private-use terms
block the relevant acquisition or execution; public rights stay unresolved.

Any input, environment, objective, interpolation or numerical-policy change
invalidates the receipt and requires predeclared reruns; material scope changes
need renewed approval. Retain failures. Rollback means continue current shipped
assets, not deleting evidence, resetting Git, or repairing a warp silently.

Documentation impact: this plan, Beads and private implementation report only.
No current capability, scientific representation, shipped license/dependency,
lesson, security/release behavior or citation identity changes. README, public
provenance, DATA_LICENSES, architecture and lesson records need no current-behavior
edits for design-only handoff. Reassess if implementation changes those boundaries.

## Verified implementation references (2026-09-07)

All fetched directly with `agnt web-fetch`, HTTP 200; mutable documentation is
method-selection evidence, not a pinned executable or independent anatomical truth.

- [ANTsPy v0.6.3 source](https://antspy.readthedocs.io/en/v0.6.3/_modules/ants/registration/registration.html)
- [ANTs image/point application and Jacobian API](https://antspy.readthedocs.io/en/stable/registration.html)
- [ANTs reproducibility and its accuracy limits](https://github.com/ANTsX/ANTs/wiki/antsRegistration-reproducibility-issues)
- [PyPI package/wheel metadata](https://pypi.org/pypi/antspyx/json)
- [ICBM methods and terms](https://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009)

## Current execution checkpoint

`brain-atlas-yum.14.10` implemented and fitted the frozen method. Preserved B
outputs, validated without refitting under source-bound `method-v3.json`, fail the
unchanged 0.5-mm roundtrip budget (maxima 0.8517028651255683 / 0.5511378554652209 mm)
and leave 15 / 143 cells uncertified by the sufficient positivity bound. That is
not proof of folding. Replay stopped; anatomy remains unvalidated. Private report,
20-plane nonexpert sheets, source hashes and two independent failure witnesses are
retained. No tuning, threshold changes or adoption authorized; new method work
requires separate approval. Current report/Beads supersede the historical running
job instructions; do not restart old continuation scripts.

## Historical execution handoff (before implementation)

Resume `brain-atlas-yum.14.10`, not another design brainstorm. Owner wants practical
implementation with available resources. Remaining human gate is exact dependency
acquisition/install, plus any actual scope drift—not unavailable expert review.
Use test-driven development; verify before claiming conversion success. This design
closeout does not claim code, installed dependencies, a fitted field or valid anatomy.
