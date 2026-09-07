# CerebrA offline template conversion — decision brief

- Bead: `brain-atlas-yum.14.9`.
- Status: **Draft; not an accepted registration method or execution approval.**
- Direction selected by human: `brain-atlas-bs4u`, 2026-09-07.
- Prerequisite evidence: `59d4a26`, `afaa36c`, and
  [CerebrA evaluation/native review](../research/2026-09-07-domain-atlas-selection/report.md).
- Purpose: design validated offline conversion **before** anatomical-domain
  assignment. This is not authorization to adopt coarse common-RAS assignments.

## Fixed scope

Move the **atlas**, not the fibres. Fit an offline intensity-based mapping from
native symmetric2009c T1 to the pinned asymmetric2009c T1. Resample discrete
CerebrA labels into the target reference grid only after the method is accepted.
Do not apply a warp to fibre JSON or add any runtime transform/fitting path.
Do not use tract encounters or anatomical markers to fit the transformation.
Independent landmarks may validate a result, never steer it after inspection.

CerebrA coverage remains incomplete after conversion. Registration cannot create
cerebral WM, full CSF, fine brainstem or cerebellar-nucleus labels, settle source
rights, or turn atlas labels into biological endpoints/individual anatomy.

## Input authority

Full candidate inventory:
`.pi/research/2026-09-07-domain-atlas-selection/source-manifest.json`.
Private root:
`~/.local/share/brain-atlas/domain-atlas-selection-yum14-6-2026-09-07/`.

| Role | Exact source | SHA-256 |
|---|---|---|
| Moving T1 | `inputs/mni_icbm152_t1_tal_nlin_sym_09c.mnc` | `04cd0dac790801d0cc580a5ef5ed9f2b36a744e548866d8a2f9251b8e6e2e071` |
| Moving labels | `inputs/CerebrA.nii` | `c83e8038b21ff85c5efaa4082eb1a4560f4bae392bc6f9b1fc0a7888e4fce1d3` |
| Label identity | `inputs/CerebrA_LabelDetails.csv` | `1f27188447421c37f35d0cb3c7adebd072ecbe745f52ae23066f3a98337d8c4c` |
| Fixed T1 | Retained TemplateFlow `tpl-MNI152NLin2009cAsym_res-01_T1w.nii.gz` | `1f27aabea9f7183dc0c69dafa71e1787b921ca778d655d9c1bf302b273d5627a` |

Native MINC2 is Z,Y,X storage. Canonical voxel-axis transpose was independently
verified without resampling. All canonical source/target grids are 193×229×193,
unit-axis RAS with origin [-96,-132,-78]. Equal grids do not establish equal anatomy.
The source label qform is unset, sform=1, units unknown; preserve source metadata
and documented numeric-mm assumption. Target T1 has matching code-4 forms and mm.

## Method design required before execution

1. **Select/pin implementation.** Evaluate an established intensity-registration
   implementation and primary methods; exact version, binary/container digest,
   dependencies/terms, platform, numerical settings and deterministic controls are
   unresolved. Do not install or execute a registration package under parser approval.
2. **Freeze masks and objective.** Select independently justified fitting masks,
   normalization and objective. Do not optimize SWM agreement counts or reuse
   validation labels as optimization targets. State how missing coverage and background
   differ from anatomy. Document any smoothing/multiresolution schedule.
3. **State transform direction precisely.** Define moving→fixed physical coordinates
   separately from fixed-grid→moving-image sampling. Verify transform composition,
   inverse direction and file conventions with asymmetric synthetic coordinate and
   label fixtures before real fitting. Never infer direction from filenames.
4. **Freeze resampling.** Categorical labels use an explicitly selected categorical
   interpolator with outside-support background, no continuous label averaging or
   invented probabilities. Preserve original label IDs and an explicit resampling
   provenance record. Target grid is exact; no automatic geometry replacement.
5. **Define deformation gates.** Finite fields and valid domain/support are required.
   Test forward/inverse consistency and orientation/Jacobian behavior. Any fold,
   reflection or invalid field fails evaluation rather than being silently repaired.
   Grid-boundary treatment, inverse-consistency tolerance and permissible deformation
   bounds remain to be justified and frozen before fitting. No invented threshold.
6. **Independent anatomical validation.** Select expert-reviewed target-domain masks
   and/or withheld anatomical landmarks whose construction does not depend on the
   fitted atlas. Validate cerebellum/brainstem interfaces, deep structures, ventricular
   boundaries and cortex/WM separately. Record population, template, annotation
   independence and uncertainty. Native/asymmetric T1 photometry alone is insufficient.
7. **Predeclare acceptance.** Define the independent sample/holdout split and
   per-domain support/rejection rules, baseline comparisons and justified thresholds
   before scoring. Use unchanged common-RAS baseline as a comparator, not ground
   truth. Missing validation coverage remains unresolved, not a pass or forced label.
8. **Reproducibility and rights.** Require two new-empty-root replays and exact
   source/tool/parameter/field/label receipts. Decide byte equality or preapproved
   numerical reproducibility before runs. Verify derivative-use rights and all notices
   independently; the dataset CC0 declaration does not resolve every upstream claim.

## Output and review boundary

Proposed outputs: source-to-target and sampling-transform records, private target-grid
label derivative, validation report, exclusions/uncertainty map and reproduction
receipt. **All are future intent.** None currently exists or is authorized for public
use. Keep original input/diagnostic evidence untouched. Rollback means keep using
current shipped assets, not deleting private evidence or reverting Git history.

Before execution, the owner accepts the complete source-bound method and a **separate
implementation Bead** is created with exact dependency/acquisition authority. Make
`brain-atlas-yum.14.6` depend on that implementation as well as this design. Only after
accepted conversion/validation may `.6` decide anatomical-domain authority and `.5`
propose primary/alternative assignment. Runtime adoption remains separately gated.

## Explicit unresolved design requirements

No registration implementation/version chosen; no extra fitting/validation input
acquired; no independent target anatomical ground truth selected; no tolerances or
accuracy thresholds frozen; no conversion run or successful validation claimed.
This brief records the chosen direction and input boundary, not design completion.
