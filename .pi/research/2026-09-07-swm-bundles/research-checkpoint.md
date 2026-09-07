# Short-range contour bundle evidence: research checkpoint

- Work: `brain-atlas-yum.14.4`, 2026-09-07.
- Status: **Historical acquisition checkpoint, superseded by [completed private evaluation](evaluation-report.md).** The initial failure and source verification below are retained as history, not current blockers.
- Human scope: offline research plus tested private evaluation approved in fresh session and recorded in owning Bead. Runtime/adoption deferred.
- Download approval: `brain-atlas-etqs` (approved). Initial browser attempt failed; user later supplied the complete approved source set. All 680 inputs including receipts were independently verified; see [verification record](verification.json).
- Execution guidance: [design-plan](../../plans/brain-atlas-yum.14.4-bundle-evaluation-design-plan.md).

## Recovery and boundaries

Recovered only `bd show brain-atlas-yum.14.8`, `bd show brain-atlas-yum.14.4`, and referenced artifacts. No previous transcript or additional Bead recovery. Existing naming design remains implemented; public short-range contours remain frozen, not certified superficial white matter or U-fibres. Existing source-compartment audit describes source labels, not anatomical ground truth. No classifier may rename its complement “validated cerebral.”

Tracked checkout was clean on `main`. Unrelated untracked right-OR research and two source ZIPs remain untouched. No runtime, public data, manifests, dependencies, or generator code changed at this initial checkpoint. Later evaluator/manifest/SPEC changes are documented in the evaluation report.

## Fresh primary-source verification

Parent ran `agnt web-search` then `agnt web-fetch`; search returned irrelevant results, so verification used primary URLs from retained inventory and peer leads. URLs below returned HTTP 200 with claim-matching content on 2026-09-07.

| Source | Verified finding |
|---|---|
| [HCP v1.1 EBRAINS structured record](https://search.kg.ebrains.eu/api/groups/public/documents/609c0598-bf02-4b65-8d7d-3a40f0c2f543) | DatasetVersion `609c0598-bf02-4b65-8d7d-3a40f0c2f543`, DOI `10.25493/MK9H-ZE1`, v1.1, released 2023-07-18. Version selector links v1.0 `6a7e07ad-303c-4b1d-b444-ded9ee782225`. Cohort is **76** healthy HCP subjects: 41 female, 35 male, ages 22–36; not project HCP-1065. |
| Same HCP record | Sulcus-constrained diffeomorphic alignment includes nonlinear ICBM T1 average, then intra-/inter-subject clustering; FreeSurfer-space postregistration supplies Desikan–Killiany nomenclature. Per-bundle probabilistic maps and aggregated maximum-probability parcellation are distinct products. v1.1 adds affine spatial-coordinate transformations to NIfTI/GIFTI files. Exact template release/variant, probability denominator/scale, smoothing and tie policy are not established by this text. `fields.license_info` explicitly supplies CC BY-NC 4.0 although `meta.license` is null. |
| [Avila et al. 2019 primary methods abstract](https://doi.org/10.1007/978-3-030-05831-9_25) | *Inference of an Extended Short Fiber Bundle Atlas Using Sulcus-Based Constraints for a Diffeomorphic Inter-subject Alignment*, pp. 323–333. Abstract describes bundles **20–80 mm long**, sulcal alignment, clustering. Full chapter is subscription-only in retrieved page; numerical methods not independently verified. Length range is not voxel resolution and differs from viewer's 8–55 mm selection. |
| [HCP bucket root](https://data-proxy.ebrains.eu/api/v1/public/buckets/d-609c0598-bf02-4b65-8d7d-3a40f0c2f543?delimiter=/) | Both `short-bundles_withSulciMask.nii` and `short-bundles_withoutSulciMask.nii`, each 17,060,394 bytes; two source label tables, license PDF and descriptor PDF. Probability directory is explicitly `ProbabilisticMaps_all_bundles_withoutSulciMask/`. Do not compare masked MPM against unmasked maps without separating masking effects. |
| [Complete HCP probability listing](https://data-proxy.ebrains.eu/api/v1/public/buckets/d-609c0598-bf02-4b65-8d7d-3a40f0c2f543?prefix=ProbabilisticMaps_all_bundles_withoutSulciMask/&limit=1000) | Parent JSON parse counted **673 objects**, **83,353,015 bytes**. This is a listing count, not acquisition or NIfTI verification. Object `hash` fields are not SHA-256 pins. |
| [HCP left label file](https://data-proxy.ebrains.eu/api/v1/public/buckets/d-609c0598-bf02-4b65-8d7d-3a40f0c2f543/left-hemisphere_labels.txt) | Parent fetched prefix verifying integer/source-name syntax, e.g. `1001: lh_CAC-CAC_1_short.bundles,`. Source-owned mapping offers alternative to unlicensed configuration hierarchy. Full left/right mapping validation remains acquisition work. |
| [ARCHI EBRAINS structured record](https://search.kg.ebrains.eu/api/groups/public/documents/f58e4425-6614-4ad9-ac26-5e946b1296cb) | Parent retrieved description: **78 subjects**, cortical ROIs plus fibre-shape clustering; maximum probability described using highest number of putative fibres through voxels. Formula/denominator and resampling lineage remain unestablished. Existing inventory binds DOI `10.25493/ENJ7-ZKM`, 2018, CC BY-NC-SA 4.0. |

## Candidate comparison and gaps

| Dimension | HCP-673 | ARCHI-100 |
|---|---|---|
| Cohort | Fresh record: 76 healthy subjects aged 22–36 | Fresh description: 78; retained descriptor reports 79, unresolved |
| Construction | Sulcal diffeomorphic alignment, two-level clustering | Cortical ROI + fibre-shape hybrid |
| Space | Standard ICBM; v1.1 affine metadata added. Exact template variant unknown | Retained descriptor MNI152_T1_2mm versus configured 2009c and previously observed 1-mm delivery; chain unknown |
| Probability semantics | Separate statistical and categorical products; scale/denominator unknown | Putative-fibre passage description; scale/denominator unknown |
| Naming | Source label files exist; no Jülich bilateral-offset assumption | Source label file reported by peer; parent full mapping unverified |
| Generalizability | Young/prime healthy adult population; no individual identity or clinical validity inferred | Cohort lineage and external generalization unresolved |
| Terms | CC BY-NC 4.0 in fresh version-bound record | CC BY-NC-SA 4.0 in retained verified rights report |
| Viewer fit | Private geometric comparison only; 20–80 mm method range does not cover entire 8–55 mm viewer range | Remains rejected for adoption over provenance conflicts |

Both maps can yield population-model spatial overlap only. No observed source value is automatically a calibrated probability of contour membership, connection, termination, or direction. Unknown template variant must not be silently relabelled 2009a or 2009c.

Peer reports additionally counted HCP 365 left/308 right names and ARCHI 50/50 names, with asymmetric name pairing. These are useful leads, **not parent-verified mapping contracts**; acquisition must independently reproduce them and validate every MPM label and probability-file correspondence. Do not copy configuration-authored hierarchy while reuse rights remain unresolved.

Read-only peer artifacts:
- HCP: `runtime:delegated-results/36fd6746-2747-498c-af15-7ca7a331e8a6/child-0.json` (tool preview truncated; complete report not recovered here).
- ARCHI: `runtime:delegated-results/21e5ed0f-f9ce-4663-a22f-6d2f174304e2/child-1.json`.

## Retained inputs verified locally

Fresh `shasum -a 256` matched both referenced historical pins:

| Path | SHA-256 |
|---|---|
| `/private/tmp/brain-atlas-yum14-sources/hcp-short-bundles-labelled.nii` | `fe0f0aa6db055db0a51cee07cb9c01a69600ece032e1c805f3e5e0d0dc2abbdd` |
| `~/.local/share/brain-atlas/swm-domain-audit/brain-atlas-yum.14.3-source-2026-09-07/audit-a/swm-domain-records.json` | `a62344ee2e840a26e66358bd905520fcda86fec2c623596a7a919ca46aac47ab` |

First is the **masked** HCP MPM by exact source inventory hash, not by local filename. Second is source-compartment evidence only. No real-data scoring, pilot reproduction, holdout selection, or NIfTI header check was run in this checkpoint.

## Approved acquisition and failure

`brain-atlas-etqs` approves new private root:

`~/.local/share/brain-atlas/swm-bundle-audit/brain-atlas-yum.14.4-hcp-v1.1-2026-09-07`

Approved set: all 673 probability maps, unmasked MPM, both source label tables (12,106 and 10,235 bytes), descriptor (257,471 bytes), license (136,411 bytes), source listing/record metadata. Data files total **100,829,632 bytes**, overall bound **105 MB**. Existing retained masked MPM/domain records may be copied locally. No overwrites, public changes, redistribution, or new source family.

Approval-gated `browser_download` navigated to official bucket. Bucket checklist was visibly proven at:

`/Users/hays/.betterwright/artifacts/85b42e1702877c85/pi-evidence-1788796293482-91ff00.png`

Download attempt for unmasked MPM failed with **`Browser download timed out before completion.`** Host additionally reported **`Opening in existing browser session`**, profile already in use. Tool reported an artifact path, but fresh `ls` confirmed it did not exist:

`/Users/hays/.betterwright/artifacts/85b42e1702877c85/short-bundles_withoutSulciMask-1788796354261-58c31d.nii`

No download-success claim. Read-only `agnt doctor --json`: zero failures, one existing optional verification-prerequisite warning. No profile/process/config repair attempted, no shell download bypass, no repeated acquisition retry.

## Superseding outcome and documentation impact

The [evaluation report](evaluation-report.md) supersedes this checkpoint's acquisition, scoring and review blockers. User-run acquisition, frozen-method scoring, complete alternatives, balanced cross-tabs, deterministic B/C/D comparison and six-panel review are now evidenced there. HCP label mapping is independently validated at 365 L / 308 R; ARCHI remains unadopted. This historical checkpoint is not evidence of current work status.

No shipped behavior/evidence changed. Only the offline tooling SPEC/manifests and private research/design records changed; README, core provenance, lesson validation, DATA_LICENSES, runtime architecture, notices, security, release and citation metadata remain unchanged. Atlas/threshold adoption remains deferred; no release-readiness claim.
