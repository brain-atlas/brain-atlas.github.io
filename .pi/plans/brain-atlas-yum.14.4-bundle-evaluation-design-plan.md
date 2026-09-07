# Private short-range bundle evaluation

- Work: `brain-atlas-yum.14.4`.
- Status: **Implemented private evaluation; numerical rules below preserved. Runtime/adoption deferred.**
- Date: 2026-09-07; branch `main`.
- Authority: owning Bead records human approval of offline research plus tested private evaluation, with runtime/adoption deferred. Acquisition approved by `brain-atlas-etqs`.
- Evidence: [research checkpoint](../research/2026-09-07-swm-bundles/research-checkpoint.md).

## Goal and boundary

Evaluate source-bound HCP bundle overlap without implying anatomical identity. Preserve all public geometry, names, IDs, filters, activity and historical generator pins. No publication, source redistribution, deployment, push, DSI execution or runtime integration. ARCHI remains comparison/rejection evidence, not an adopted classifier.

Reuse `tools/assets` environment, input/output guards, displayed-contour validation, and source-audit strata. Never add siibra as a dependency or use automatic warping. Source compartment names remain source evidence, not ground-truth anatomical domains.

## Sequence

1. Acquire approved HCP v1.1 set into new private root. Browser download failed; user offered manual acquisition. A separately invoked user-run acquisition helper may enumerate only approved official bucket files, enforce total/count/name/size checks, refuse overwrites and retain SHA-256 receipt. Agent must not execute its network path or bypass download gate. Test helper on synthetic metadata without network.
2. Independently hash all files; verify licensed left/right labels against complete probability set and both MPMs. Parse NIfTIs with nibabel, record forms, affine, units, dtype/range and variants; inspect descriptor for probability definition and template lineage. Missing/conflicting evidence stays explicit.
3. Before real scoring, freeze numerical method and evaluation split in this plan/Bead. Specify all-eight-point aggregation (not full curve or length fraction), categorical rounding/bounds, alternatives/ties, primary withholding, hemisphere consistency, probability-value units and null semantics, partial coverage, and sensitivity probes. Do not infer calibrated probability from filenames or observed ranges. Reproduce historical pilot separately rather than tuning thresholds to its counts.
4. Add focused failing tests, then smallest offline implementation under `tools/assets/` with explicit source hashes, complete-set checks and empty-output guards. Test finite/bounds/forms/unknown-label rejection, contour reversal, ties, sparse support, source drift and deterministic serialization. Keep raw maps and private generated records outside Git/public.
5. Evaluate all 15,000 contours, including non-cerebral/deep source-screening strata as false-fit controls. Report denominator-balanced cross-tabs by source domain, legacy quality, shipped length and hemisphere. Preserve preselected holdout/manual visual review; do not call it validated anatomy. Run twice and compare output bytes.
6. Independent review, SPEC/research documentation reconciliation, local task-owned commit. Close only if bounded acceptance is met; otherwise retain exact evidence and blockers without success closeout.

## Frozen private numerical method: swm-bundle-screen-v1

Frozen 2026-09-07 after descriptor/three example header inspections, before any contour scoring. These are illustrative screening rules, not atlas adoption or validated classification thresholds.

- Inputs: all 678 acquired HCP v1.1 files plus two acquisition receipts; separately exact retained masked MPM and source-domain records. Hash-pin all inputs and existing four public compatibility baselines. Source manifest is checked into tools/assets and hash-bound by main manifest.
- Validate all 673 continuous volumes plus both MPMs: shape 193×229×193, identical code-4 qform/sform and unit-axis RAS affine with origin [-96,-132,-78], finite nonnegative decoded values. NIfTI units remain explicitly unknown, not repaired; comparison assumes numerical coordinates denote common RAS millimetres based on standard-space delivery. Exact unmasked template/build lineage remains unknown; descriptor identifies 2009c asymmetric CSF mask for masked products only. MPM values must be integer-valued source labels; continuous values must remain within observed 0–100 delivery range, without interpreting that bound as normalization proof.
- Parse official label files to exact filename correspondence; 365 L labels 1001–1365, 308 R labels 2001–2308. No mirroring/bilateral offset/name inference. Flat source nomenclature only; no configuration hierarchy redistribution.
- All eight stored samples contribute equally. Baseline nearest-even rounding after inverse affine, bounds checked before integer conversion, no nearest-nonzero fallback, no interpolated or fitted coordinates. Fractions denote sample counts/8, not curve or length coverage. Out-of-grid and background distinguished.
- For each masked/unmasked MPM, retain every nonzero label/count. A provisional `primary` is unique label on at least five samples, only when all eight source-domain IDs are in {1,5} and label hemisphere matches legacy hemisphere. Otherwise null with explicit reason (source eligibility, no support, insufficient support, hemisphere conflict). Sample-count ties remain ties, never resolved by lexical identity. No emitted primary is anatomical identity.
- Alternatives retain union of all observed categorical labels and positive continuous-map candidates; each has masked/unmasked sample counts, raw native-value sum/8, positive-sample count, maximum sample value, explicit hemisphere consistency and probability:null. Sort tables by numeric source label; do not turn uncalibrated values into likelihoods or compare scores across atlases. Zeros outside grid contribute zero; observed support and out-of-grid counts remain separate.
- Source strata: all-eight {1,5} = all-cerebral-source; all-eight {2,3,4,6} = all-broad-noncerebral-deep-source; all others mixed-other-source. These are source labels, not certified anatomy. Historical pilot counts are comparison targets, not assertions to force; document denominator differences rather than modify grouping after observation.
- Holdout: SHA-256 of ASCII `brain-atlas/swm-bundle-holdout/v1:<index>`, first eight hexadecimal digits modulo five equal zero. Freeze before scoring. Full summaries retain both evaluation/holdout split cross-tabs; no tuning on holdout. Manual review selects smallest full digest in each source-group × hemisphere holdout cell before scoring. These few examples are mechanism checks, not accuracy estimates.
- Sensitivity: all 27 coherent categorical voxel offsets in {-0.5,0,+0.5}³, plus alternate floor(v+0.5). Freeze source/legacy strata, compare support, primary and hemisphere outcomes; baseline included. No fitted registration or uncertainty confidence interval. Probability-map perturbation is not claimed.
- Report baseline 4/8 any-label coverage and 4/8 dominant-label diagnostic separately from 5/8 provisional primary. Cross-tabs by source group, hemisphere, shipped length bins and legacy quality, plus holdout split; record full denominators, partial support, unresolved reasons and false-fit evidence in excluded source groups. No false-positive rate without ground truth.
- Stable compact JSON: UTF-8, sorted keys, finite numbers, separators(',',':'), newline. Sort continuous sample values before float64 sum so contour reversal gives identical evidence; retain raw mean without ranking quantization. Compare full output bytes on two runs. Runtime payload budget irrelevant while no output ships.

## Implemented files and evidence

- `tools/assets/swm_bundles.py`, CLI `audit swm-bundles`, source submanifest and main-manifest pin: private evaluator, no network path.
- `test/swm-bundle-assets.test.js` and pipeline inventory assertions: numerical and fail-closed boundary checks.
- `tools/assets/SPEC.md` INV-16 / FAIL-14: current offline contract.
- [Evaluation report](../research/2026-09-07-swm-bundles/evaluation-report.md): results, holdout inspection, interpretation, exact rerun command and evidence hashes.
- `holdout_panels.py`: private three-plane support inspection with a runnable crop self-test.

The proposed tracked `download_hcp.py` was not retained or implemented here. User instead ran `/tmp/dl.py`; pinned acquisition receipts and independent complete-input checks are the authority. No acquisition-helper self-test claim is made. This is the only execution-guidance deviation; scoring rules were not changed or tuned.

## Verification and documentation impact

Focused tests and panel crop self-test pass. Fresh evaluation D matches retained B/C byte-for-byte; all six preselected panels inspected separately. Final full-suite and commit evidence belongs in the owning Bead. The generator's `manualReviewStatus: pending` remains unchanged; separate dated review supplies manual evidence without rewriting generated outputs.

Current offline SPEC, source/method manifests and private research evidence updated together. Public user docs, lessons, core runtime/data claims, dependencies/notices, security and release metadata intentionally unchanged: no shipped data or display behavior changes. No browser/runtime or release-readiness claim. Further atlas adoption needs a separate approved Bead, not this plan.

## Stop conditions

Incomplete source set; changed files/counts/total beyond 105 MB; unresolved conflicting forms; unsafe existing output; inability to distinguish raw map value from probability; failed deterministic/holdout requirements. Unknown template variant remains a disclosed comparison limit and cannot be silently resolved by numerical grid agreement. Browser download failure was resolved by user-run manual acquisition; all 678 source files were independently rehashed. No agent-shell network acquisition occurred.
