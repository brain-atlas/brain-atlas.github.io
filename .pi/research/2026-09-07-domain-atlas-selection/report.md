# Domain-atlas selection — private CerebrA evaluation

Work: `brain-atlas-yum.14.6`. Date: 2026-09-07.
Status: **Implemented private diagnostic; full Bead acceptance remains partial.**
User-supplied archive is pinned and evaluated. This supersedes the earlier acquisition
blocker, not the anatomical-validation gate. Runtime/assets remain unchanged.
Numerical policy: [frozen design-plan](../../plans/brain-atlas-yum.14.6-domain-atlas-design-plan.md).
Independent [review](review.md): numerical PASS, full acceptance NOT MET.

## Results and decision

Retain CerebrA as **independent source-labelled corroboration**, not an anatomical
domain classifier. Reject automatic primary labels, SWM curation or runtime adoption
from this experiment. No validated whole-brain domain authority is selected.

All **15,000 contours / 120,000 stored samples / 30,000 geometric endpoints** balance:

| Source-label comparison | Samples | Endpoints |
|---|---:|---:|
| Supported | 49,163 | 16,464 |
| Conflicting | 16,513 | 3,991 |
| Unresolved | 54,324 | 9,545 |

These are semantic comparisons between two queried atlases, **not anatomical accuracy
scores or certified tissue assignments**. Every anatomical domain stays unresolved
and every anatomical primary null. No domain-only outcome is fabricated.

- Of **26,195 source255 samples**, CerebrA names 16,641 cerebellar GM, 6,201
  cerebellar WM and 2,358 grouped vermis: **25,200 compatible source-label hits**.
  Remaining source255 samples include 46 brainstem (cannot isolate midbrain),
  608 composite ventral-diencephalon/basal-forebrain, 44 third/fourth-ventricle,
  two named-deep-gray, 17 chiasm and 278 background hits. Do not interpret all
  source255 as pure cerebellum or erase the exceptions.
- Source5 has **1,118 brainstem-support hits of 1,506 samples**, 148 conflicts and
  240 unresolved comparisons. Neither atlas supplies precise brainstem subdivisions.
- **53,370 samples hit CerebrA background**. In particular, 40,486 of 56,609 carpet
  cerebral-WM samples do so; CerebrA has no comprehensive cerebral-WM class.
  Another 14,803 carpet-WM samples hit cortical labels. This exposes large
  tissue/parcellation-boundary disagreement, not a measured error rate for either map.
- CerebrA third/fourth-ventricle labels hit **89 samples across 46 contours**,
  beyond carpet's lateral-ventricle ontology; anatomical membership remains unverified.
- The retained source255-any **3,447** and broader-union-any **4,253** contour
  populations reproduce exactly. Target complements, strata and pair partitions balance.
- All 27 coherent grid offsets retain 47,910–51,704 supported, 15,328–16,766
  conflicting and 52,184–56,380 unresolved sample comparisons. At most 18,800
  comparison samples / 9,167 contours change. These ranges are sensitivity, not
  confidence intervals. Alternate rounding changes 1,262 carpet labels, 2,458
  candidate labels and 2,575 comparison states across 2,267 contours.

### Source pins and reproducibility

Original user archive `10.12751_g-node.be5e62.zip`: **192,053,219 bytes**,
SHA-256 `bc32fdb58cc3993f4bbbbb5d4bbc007378fa97fa574d309a83b2b75cdc976389`.
All 18 entries passed path/type/size/CRC checks before private extraction; expanded
size **192,050,619 bytes**. No source script executed. The checked
[source manifest](source-manifest.json) inventories every acquired file, including
LICENSE and source metadata; local receipt retains acquisition approval and DOI URL.
User attests download source; no independent provider archive checksum was available.

CerebrA.nii: 34,120,436 bytes, SHA-256
`c83e8038b21ff85c5efaa4082eb1a4560f4bae392bc6f9b1fc0a7888e4fce1d3`.
Native float32 values are exact integers 0..102; identity scaling; 193×229×193;
selected sform code 1 with unit RAS axes/origin [-96,-132,-78]; qform unset/code 0;
spatial/time unit codes unknown. CSV supplies 51 RH IDs and LH=RH+51. This is
not Jülich's +1000 convention. Source metadata explicitly says symmetric2009c.

Private root: `~/.local/share/brain-atlas/domain-atlas-selection-yum14-6-2026-09-07/`.
`evaluation-a/` and `evaluation-b/` contain **22 byte-identical files**, including
all 20 encounter PNGs. Exact JSON pins:

| File | Bytes | SHA-256 |
|---|---:|---|
| records.json | 3,580,607 | `f9e750e0c0a4a012ed744c3cce996ebcdb941ab8bad0c9a7219a34d6fa17f126` |
| summary.json | 161,232 | `ec0145691e7d8720c5039c05f09425d0fe61244ca3f127c41f0fe9036807ea3e` |

Both runs verify the locked environment, all 18 candidate files, two reference
files and four public compatibility inputs before scientific parsing. Reused-code
hashes and source metadata accompany results. The evaluator has no network path.

### Visual review, 2026-09-07

Parent inspected all 20 panels individually. They consistently disclose asymmetric
T1 versus symmetric CerebrA, native symmetric T1 absent, no warp, source labels,
orientation and signed slice offset. Images show no gross axis reversal/displacement
in these selected views; this is not quantitative correspondence validation.

| Encounter(s) | Observed interpretation and limit |
|---|---|
| 11/0 | Both maps cover gross right cerebellar anatomy; CerebrA divides GM/WM/vermis elsewhere on these slices. Supports broad sampling concern, not verified tissue membership. |
| 149/2, 1154/1 | Central inferior source255 overlaps respectively CerebrA thalamus and composite ventral diencephalon. Do not call these demonstrated cerebellum; boundary/ontology disagreement remains. |
| 3/0, 47/5, 425/6 | Deep/medial-temporal boundaries differ: background, inferior lateral ventricle and hippocampal candidate labels respectively. T1 intensity alone cannot choose the correct atlas. |
| 0/0, 0/1, 0/3, 0/4 | Peripheral and cortical/WM examples exhibit absent candidate coverage, agreement and cortical-versus-WM mismatch along one contour. Background does not establish tissue absence. |
| 5/3, 99/7, 74/1, 586/1 | Selected deep-gray, brainstem and lateral-ventricle agreements are visibly plausible, not representative accuracy samples. |
| 57/0, 92/0, 151/0 | Cerebellar/brainstem edge examples show candidate WM or missing coverage against coarse carpet. No automatic exclusion follows. |
| 257/1 | Internal carpet background encounters candidate optic-chiasm label; absence of carpet coverage is not outside-brain proof. |
| 486/0, 3543/7 | Lateral-ventricle edges show absent candidate or named-deep-gray lookup. Preserve disagreement; no error fraction inferred. |

No native symmetric T1 review: nibabel requires unavailable `h5py` for supplied
MINC2. No new dependency was installed. Native parsing and a reviewed spatial-
correspondence assessment are the next gate; additional sources remain necessary
for cerebral WM/full CSF and fine cerebellar/brainstem anatomy. Anatomical uncertainty
must not be conflated with the historical construction or source-rights questions.

### Verification

Six focused tests pass, covering source CSV identities, native header/scaling,
comparison semantics, bounds/ties, reversal/counts, safety guards and panel orientation.
RED observed for missing evaluator (five assertion failures), then for missing panels
(one assertion failure). A temporary-path fixture initially hit macOS `/var` symlink;
resolved fixture root, preserving production symlink rejection. Closed test image
handle to remove ResourceWarning. Independent review rehashed inputs, confirmed
147 scalar real-point lookups and all probes/alternate rounding on 384 samples,
and recounted all records/strata/target populations. No serious code defect found.

First review worker failed with descriptor warnings; it is not review evidence.
Read-only doctor showed no failing checks and an unrelated generic prerequisite
warning. Sequential fresh reviewer completed; its exact result is retained in
[review.md](review.md). No harness configuration was changed.

Reproduce with a **new empty** output directory; never reuse evidence roots:

```bash
ROOT="$HOME/.local/share/brain-atlas/domain-atlas-selection-yum14-6-2026-09-07"
REF="$HOME/.local/share/brain-atlas/swm-domain-audit/brain-atlas-yum.14.3-source-2026-09-07/inputs"
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python .pi/research/2026-09-07-domain-atlas-selection/test_evaluate.py
mkdir "$ROOT/evaluation-new"
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python .pi/research/2026-09-07-domain-atlas-selection/evaluate.py \
  --inputs "$ROOT/inputs" --reference "$REF" --output "$ROOT/evaluation-new"
```

Final full-suite/build/asset/diff verification and commit evidence belong in Beads.
No browser/runtime/release-readiness claim. No numerical-policy deviation or threshold
tuning; source-header inspection preceded policy, real SWM scoring followed it.

## Source-selection rationale

The DOI-bound **CerebrA** archive was selected for private source/header/compatibility
inspection. It offers independently constructed labels relevant to the disputed
carpet compartments. Do not adopt its labels merely because their world coordinates
can be queried. The source is **MNI-ICBM2009c symmetric**, whereas the project surface
and carpet reference are **2009c asymmetric**, and fibres retain **2009a** coordinates.
A direct common-RAS comparison could supply diagnostic encounters, not validated
anatomical assignments. A new offline registration requires a separately reviewed,
source-bound design; no runtime warp, new mirroring or per-dataset fit is authorized.

The published CerebrA dataset declares **CC0 1.0**. Its article describes upstream
Mindboggle/Neuromorphometrics labels; record this lineage rather than assuming the
CC0 declaration establishes every upstream right. Private inspection is proposed;
public source/derivative redistribution remains outside scope.

## Primary-source coverage matrix

All linked external records below were independently fetched by the parent with
`agnt web-fetch`, returned HTTP 200, and their relevant content was inspected.
Search used `agnt web-search`; peer leads were verified rather than adopted as proof.
Mutable web records are research references, **not byte-pinned generation inputs**.

| Candidate | Population/construction and version | Space/resolution/semantics | Domain coverage and gaps | Terms and disposition |
|---|---|---|---|---|
| CerebrA, DOI publication 2020-04-07; no semantic release stated | Mindboggle-derived OASIS-30 template/joint-fusion labels nonlinearly registered to ICBM target; neurologist manually corrected right labels, then flipped and inspected left; 51 bilateral labels. Target template derives from 152 adults. | Symmetric MNI-ICBM2009c, 1 mm. Edited discrete anatomical labels; article's use of “probabilistic atlas” does not turn the final label IDs into probabilities. Headers/ranges verified above; unit codes unknown, qform unset, sform code 1. | Cortex, brainstem, cerebellar GM/WM, grouped vermis, selected deep gray, lateral/inferior-lateral/third/fourth ventricles. Label table has no comprehensive cerebral-WM class; no full CSF/outside-brain authority or detailed brainstem/cerebellar-nucleus ontology. | Dataset CC0 1.0; retain upstream lineage. **Shortlist for compatibility experiment**, not adopted classifier. Symmetric/asymmetric difference unresolved. [Paper][c-paper], [dataset][c-data], [labels][c-labels]. |
| Diedrichsen anatomical lobules 2009 plus nuclei 2011 | Manual lobular annotation of 20 healthy young adults (10 male/10 female, mean 23.7 years); nuclei from separate 23-person 7T cohort. | Collection offers MNI152NLin6AsymC, MNI152NLin2009cSymC and SUIT. Lobular acquisition 1 mm; distributed headers/resolution uninspected. Population-overlap probabilities and MPM products. | 28 lobular compartments and six bilateral nucleus labels (dentate, interposed, fastigial). Interposed combines emboliform/globose. Not whole-brain domains, tissue ribbon, WM or CSF authority. | Atlas collection states default CC BY-ND (version unspecified); original atlas page offers CC BY-NC 3.0 toolbox terms. Exact asset grant needs clarification before derived redistribution. **Hold fine cerebellar adoption**; no matching 2009cAsym form established. [Atlas][d-atlas], [collection/terms][d-collection], [space definitions][d-spaces]. |
| Neuromorphometrics MICCAI 2012 collection | 30 manually labelled OASIS MRIs, 25 unique subjects and five repeat scans. | Native subject collection, not a supplied MNI2009cAsym domain map; exact voxel grids not inspected. Discrete anatomical labeling. | General segmentation protocol is a candidate ontology; native scans do not provide project-coordinate domain evidence without a new derivation. | CC BY-NC, version unspecified; original labelings under academic subscription. Acquisition through contact form. **Do not select as ready-made runtime/offline lookup atlas.** [Provider][n-data]. |
| Brainnetome viewer/atlas v1.0 | Connectional-architecture parcellation, anatomical/functional connectivity and MPM/PM products. Population not independently revalidated at this checkpoint. | Official 246-label products at 1/2/3 mm; exact MNI template release/forms not established. PM describes sample frequency, not endpoint confidence. | Cortical/subcortical regional parcellation is not comprehensive tissue/domain accounting. Also lists a 274 combined product; its construction was not reviewed and no completeness claim is made. | Official data agreement limits free use to noncommercial institutional purposes with attribution/share-alike. **Not selected for domain authority.** [Provider/terms][b-data]. |
| ICBM 2009c asymmetric tissue maps | ICBM152 average-template construction; N3 1.11; target template and tissue probability products. | 1 mm asymmetric 2009c; actual candidate bytes/headers not reacquired here. Provider explicitly distinguishes sampling/preprocessing from 2009a. | Potential independent tissue-support channel for GM/WM/CSF questions; tissue identity alone does not distinguish cerebrum/cerebellum/brainstem or certify superficial WM. | Provider grants use/copy/modify/distribute with retained copyright notice and disclaimer. **Potential complement, not complete domain atlas.** [Provider/methods/terms][icbm]. |

Existing Jülich, carpet, HCP and VEP evidence remains governed by
[the source/rights review](../2026-09-06-siibra-accounting/rights-report.md),
[the SWM audit](../2026-09-07-swm-domains/audit-results.md) and
[endpoint evaluation](../2026-09-07-endpoint-probabilities/report.md).
Jülich named/GapMap support cannot independently establish anatomical domains;
carpet and HCP overlap are not anatomical validation; VEP adoption rights remain
unresolved. Functional cerebellar parcellations are not substitutes for anatomy.

## Targeted corroboration, not a new exhaustive search

Reuse all 15,000 contours / 120,000 stored samples / 30,000 geometric endpoints
and stable source indices from the retained SWM audit. Its 3,447 source255-hit
contours and 4,253 broader-union-hit contours define relevant populations, not
known anatomical truth. The seven already selected encounter panels provide
fixed examples; do not select only agreeable cases after seeing the new map.

| Register item | What new evidence could address | What remains unresolved now |
|---|---|---|
| AS-01 cortical coverage vs ribbon | Same-template tissue probability support plus independent anatomical boundaries | No tissue threshold or boundary error rate established. |
| AS-02 combined label255/source5 | CerebrA brainstem, cerebellar GM/WM and vermis comparison | 25,200 compatible source255 samples; exceptions and correspondence remain unresolved. |
| AS-03 internal background/non-lateral CSF | CerebrA third/fourth/inferior-lateral ventricles plus tissue support | Ventricular absence still does not exclude all CSF or prove outside-brain. |
| AS-04 geometric interior vs confidence | Preserve distinction in every comparison | Agreement cannot convert grid stability into anatomical certainty. |
| AS-05 independent corroboration | Independently constructed labels, inspected in native and project-reference views | Template correspondence and actual sampled disagreements unmeasured. |

## Provisional fusion boundary — not implemented assignment policy

1. Record source-native evidence independently; do not replace carpet/Jülich outputs.
2. Only a spatially validated, domain-compatible source may supply an anatomical
   domain. Otherwise keep domain unresolved, even if a queried map has a leader.
3. Coarse domains gate finer region labels; fine labels do not retroactively prove
   domain validity. Tissue evidence and named regions remain separate channels.
4. No voting or probability normalization across incompatible sources; retain
   disagreements, support absence, background and outside-grid separately.
5. `domain-only` requires a validated domain. Otherwise use `unresolved`; no nearest
   fallback, connectivity/termination/polarity claim or functional-to-anatomical substitution.
6. Freeze numerical rules, correspondence criteria and test fixtures before scoring.
   This checkpoint intentionally supplies no invented thresholds or quantitative result.

## Acquisition boundary and remaining acceptance

The DOI landing page advertises a **183 MiB ZIP**. Request one approval-gated
browser acquisition, maximum 200 MiB archive, into a new private evidence root.
Retain source/terms and SHA-256 receipt; inspect archive paths/types/expanded size
before extraction, rejecting traversal, links, overwrites and more than 1 GiB
expanded content. Do not execute supplied scripts, install dependencies, accept
new terms for the user, redistribute, warp, write public assets or deploy.
Stop on mismatched source, unexpected terms, unsafe archive or download failure.
An inability to acquire is an acquisition blocker, not evidence against anatomy.

### Acquisition attempt

Approval `brain-atlas-5ezq` authorized the bounded private acquisition above.
The first browser navigation failed before loading the DOI record:
`browserType.launchPersistentContext: Opening in existing browser session.`
The tool reported the persistent profile was in use by another Chromium instance;
its automatic observation failed the same way. **No file was downloaded.**
Read-only `agnt doctor --json` reported no failing checks and an unrelated warning
about absent generic verification prerequisites; it did not repair or diagnose the
profile owner. No process was killed, profile changed, shell download attempted or
acquisition gate bypassed.

User chose browser recovery in `brain-atlas-2cad`; subsequent DOI navigation
succeeded. The title, DOI, 183 MiB link and CC0 declaration were visible.
An initial exact-name locator missed a decorative icon in the accessible name;
an inspected locator reached the correct link. The approval-gated download then
reported event **`download-rejected`: `download size limit exceeded`** for
`10.12751_g-node.be5e62.zip`. The attempted standard Playwright `saveAs` call was
also unsupported by the guarded download handle (`download.saveAs is not a function`).
No successfully saved archive is established; an allocated artifact path is not
proof of downloaded bytes. Do not retry via another network tool or alter the limit.
Read-only doctor was rerun with the same unrelated warning and no repair.

Browser-resolved source URL:
`https://doi.gin.g-node.org/10.12751/g-node.be5e62/10.12751_g-node.be5e62.zip`.
User subsequently supplied that archive at the repository root. Its safety checks,
byte pins and numerical evaluation above supersede the download blocker. Browser
checklist proved source/terms only, not acquisition; local archive/CRC/hash evidence
establishes the later user-supplied acquisition.

Still required for full acceptance: native-template parsing/review, validated spatial
support/correspondence sufficient for anatomical-domain interpretation, remaining
coverage/rights decisions, and a domain authority/fusion decision beyond diagnostic
comparison. No h5py install, registration or anatomical adoption is currently approved.
**Do not close full `yum.14.6` as success by relabeling this diagnostic as validation.**

No public capability, geometry/activity, lesson, dependency, security/release,
license of shipped material or citation identity changes. Consequently README,
architecture/SPEC, public provenance/licenses and lesson validation need no current-
behavior edits at this checkpoint. No browser/runtime or release-readiness claim.

Peer leads: `runtime:delegated-results/ce9448bc-8dd4-4f0c-b4aa-a2ce84dfce3a/child-0.json`
and `runtime:delegated-results/7a583b5a-af50-432d-88be-a144bab6c950/child-1.json`.

[c-paper]: https://www.nature.com/articles/s41597-020-0557-9
[c-data]: https://doi.org/10.12751/g-node.be5e62
[c-labels]: https://gin.g-node.org/anamanera/CerebrA/raw/master/CerebrA_LabelDetails.csv
[d-atlas]: https://www.diedrichsenlab.org/imaging/propatlas.htm
[d-collection]: https://www.diedrichsenlab.org/imaging/atlasPackage.htm
[d-spaces]: https://raw.githubusercontent.com/DiedrichsenLab/cerebellar_atlases/master/README.md
[n-data]: https://www.neuromorphometrics.com/2012_MICCAI_Challenge_Data.html
[b-data]: https://atlas.brainnetome.org/download.html
[icbm]: https://nist.mni.mcgill.ca/icbm-152-nonlinear-atlases-2009/
