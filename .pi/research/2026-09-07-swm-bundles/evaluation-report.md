# Private HCP bundle-overlap evaluation

Work: `brain-atlas-yum.14.4`, 2026-09-07. Approved offline evaluation implemented; **no atlas, threshold or runtime adoption**. This report supersedes the acquisition/scoring blockers in [research-checkpoint.md](research-checkpoint.md). Frozen method: [design plan](../../plans/brain-atlas-yum.14.4-bundle-evaluation-design-plan.md); implemented contract: `tools/assets/SPEC.md` INV-16 / FAIL-14.

## Source decision

Use HCP v1.1 only for private population-map comparison. Retain ARCHI-100 rejection until its 78/79-subject and template/delivery conflicts are resolved. Candidate population, construction, generalizability, nomenclature and terms comparison remains in the checkpoint. Configuration revision `177023a506eceff008a012bb0a98d7bca0d1bbd5` was inspected in yum.14.1; its hierarchy is not copied or adopted. Flat HCP identities come from licensed source labels, not inferred bilateral names or Jülich offsets. Prior rights evidence: [rights report](../2026-09-06-siibra-accounting/rights-report.md).

Version-bound primary record: [HCP v1.1](https://search.kg.ebrains.eu/api/groups/public/documents/609c0598-bf02-4b65-8d7d-3a40f0c2f543), DOI [10.25493/MK9H-ZE1](https://doi.org/10.25493/MK9H-ZE1), CC BY-NC 4.0. Version 1.0 UUID `6a7e07ad-303c-4b1d-b444-ded9ee782225` is not the delivered map version. The 76-subject cohort is not project HCP-1065. Primary methods: [Avila et al., 2019](https://doi.org/10.1007/978-3-030-05831-9_25); full subscription chapter was not independently inspected. Retained dataset descriptor identifies DISCO+DARTEL and a 2009c asymmetric CSF mask for masked products. It does not establish the exact unmasked template/build, continuous-map denominator, or resolve WU-Minn methods versus MGH-USC acknowledgement. These remain explicit gaps, not inferred from grid agreement.

User supplied 678 approved files after browser acquisition failed: 100,829,632 bytes. Two receipts bring the complete private inventory to 680 files / 101,301,105 bytes. `tools/assets/swm-bundle-sources.json` pins every URL, size and SHA-256; main manifest pins that inventory. All files rehashed in resumed session. Both MPMs and all 673 maps parsed successfully: 193×229×193, unit-axis RAS affine origin [-96,-132,-78], matching qform/sform code 4, unknown spatial/time units. All 673 continuous files have float64 storage, slope 1/intercept 0; two categorical MPMs have int16 storage, slope 1/intercept 1154. Nibabel applies scaling before label checks. Numerical common-RAS-mm comparison is an assumption; no units repair, template equivalence or warp. [verification.json](verification.json) records independent header groups and hashes.

## Baseline results

All counts concern **eight stored samples**, not full contours or length coverage. A provisional primary requires ≥5/8 samples with one categorical label, all-eight cerebral source compartments and matching legacy hemisphere. Raw map values remain native, with probability null. Alternatives preserve all categorical labels and positive continuous candidates; 87,291 candidate rows across 15,000 records. Source strata are not validated anatomy.

| Stratum | N | Masked coverage ≥4 | Unmasked coverage ≥4 | Masked primary | Unmasked primary |
|---|---:|---:|---:|---:|---:|
| All-cerebral-source | 10,738 | 10,215 | 10,290 | 4,591 | 4,792 |
| All-broad-noncerebral-deep-source | 3,402 | 4 | 7 | 0 | 0 |
| Mixed-other-source | 860 | 539 | 587 | 0 | 0 |
| Total | 15,000 | 10,758 | 10,884 | 4,591 | 4,792 |

Historical masked pilot reproduced exactly: 10,215/10,738 cerebral-source coverage ≥4, 4/3,402 broad noncerebral/deep-source coverage ≥4, and 7,379/15,000 dominant-label support ≥4. The latter is not the preregistered ≥5 primary rule. Excluded-stratum overlap is false-fit evidence to investigate, **not a false-positive rate** without ground truth. Zero primary in excluded groups is enforced eligibility, not demonstrated specificity.

| Dimension / stratum | N | Masked primary | Unmasked primary |
|---|---:|---:|---:|
| Hemisphere L | 7,220 | 2,130 | 2,232 |
| Hemisphere R | 7,780 | 2,461 | 2,560 |
| Legacy known | 3,576 | 1,620 | 1,698 |
| Legacy ambiguous | 3,945 | 1,585 | 1,646 |
| Legacy unknown | 7,479 | 1,386 | 1,448 |
| Shipped length [8,15) mm | 1,916 | 1,141 | 1,164 |
| Shipped length [15,25) mm | 2,597 | 1,105 | 1,139 |
| Shipped length [25,40) mm | 4,875 | 1,287 | 1,371 |
| Shipped length [40,55] mm | 5,612 | 1,058 | 1,118 |
| Evaluation split | 11,981 | 3,688 | 3,855 |
| Holdout split | 3,019 | 903 | 937 |

Each dimension partitions 15,000; each reason table balances its denominator. Full coverage, partial-coverage, opposite-hemisphere and reason tables remain in private summary. Masked reasons: provisional 4,591, insufficient support 5,955, no support 192, source-ineligible 4,262. Unmasked: provisional 4,792, insufficient 5,769, no support 173, hemisphere conflict 4, source-ineligible 4,262. Partial support: 3,778 masked / 1,995 unmasked; any opposite-hemisphere samples: 42 / 51; outside-grid contours: zero. Larger unmasked counts do not establish better accuracy.

Across 27 coherent ±0.5-voxel categorical probes, masked primary counts range 4,141–4,792; unmasked 4,431–5,004. Up to 1,833 masked / 1,768 unmasked primary identities or null states change from baseline. Alternate floor(v+0.5) yields 4,609 / 4,809 primaries and changes 2,384 / 2,195 label samples. These are sensitivity diagnostics, not measured registration uncertainty. Continuous-map perturbation was not evaluated. No threshold was tuned after observing holdout or pilot counts.

## Six-panel holdout review

Parent individually inspected all six preselected sheets after crash recovery, using 1040×360 JPEG viewing copies of retained 2080×720 PNGs. Original PNGs unchanged. Each sheet shows three orthogonal T1 slices at each of eight nearest voxel centres: cyan any masked MPM support, orange unmasked-only support, white centre cross. Crop orientation/centre/bounds self-test passes. T1 and panel-script/summary hashes are bound by `panel-receipt.json` and copied into verification.json; original PNG hashes retained there too. T1 is a comparison backdrop, not proof of exact HCP registration lineage.

| Index / preselected cell | Visible support and record comparison | Assessment |
|---|---|---|
| 9551 / broad-noncerebral-deep L | Eight 0/0 centres below cerebral overlay, around posterior-fossa structures | No gross support contradiction; source-ineligible |
| 1970 / broad-noncerebral-deep R | Eight 0/0 centres along inferior posterior tissue, below overlay | No gross support contradiction; source-ineligible |
| 2984 / cerebral L | Seven supported centres; labels 1328×2, 1290×4, 1179×1, then zero | Coverage is not identity: no ≥5 label, primary withheld |
| 2788 / cerebral R | Eight supported superior/posterior centres, all 2293 in both maps | Consistent with provisional overlap, not validated bundle identity |
| 11756 / mixed-other L | Four masked versus eight unmasked centres; several labels, lower/medial temporal support boundary | Visible masking effect; source-ineligible despite overlap |
| 5206 / mixed-other R | First centre 2148/2148, remaining seven 0/0, medial/deep progression | Sparse overlap retained; source-ineligible |

Outcome: gross support/slice mechanism review complete; no observed contradiction with sampled records. **Not expert anatomical validation, bundle-identity review, full-curve inspection, or accuracy estimate.** The mask overlay does not distinguish individual bundle colours. Sample selection was hash-based before scoring; no substitutions. Generated summary remains `manualReviewStatus: pending` because a deterministic generator cannot approve manual review; this separate dated record supplies that evidence without overwriting outputs.

## Reproducibility and verification

Private root: `~/.local/share/brain-atlas/swm-bundle-audit/`.

- Inputs: `brain-atlas-yum.14.4-hcp-v1.1-2026-09-07/`.
- Equivalent outputs: `brain-atlas-yum.14.4-evaluation-{b,c,d}-2026-09-07/`. D was run fresh after recovery; complete B=C=D bytes compared. A is an earlier evaluator version, retained but not the reproducibility pair.
- Panels: `brain-atlas-yum.14.4-holdout-2026-09-07/`.
- Records: 12,519,601 bytes; SHA-256 `46528ddd3c4001398c2945ab59e76c211be872c9727e5d2094b712ebe050f575`.
- Summary: 140,820 bytes; SHA-256 `f62b72497433e4aa694a615b73df47d025b29e48549d67901e2809edd79bf91d`.
- Evaluator: `a40ae130263beb69a177a5127ccb65420607cc77fa98ec4b7bc8af0e6036350d`; shared module hashes also embedded in output.

Repeat with a **new, explicitly created empty directory**, never an existing output:

```bash
uv run --python 3.13.1 --offline \
  --with-requirements tools/assets/requirements.lock \
  python -m tools.assets audit swm-bundles \
  --inputs "$HOME/.local/share/brain-atlas/swm-bundle-audit/brain-atlas-yum.14.4-hcp-v1.1-2026-09-07" \
  --masked-mpm /private/tmp/brain-atlas-yum14-sources/hcp-short-bundles-labelled.nii \
  --domain-records "$HOME/.local/share/brain-atlas/swm-domain-audit/brain-atlas-yum.14.3-source-2026-09-07/audit-a/swm-domain-records.json" \
  --repo . --output "$NEW_EMPTY_OUTPUT" \
  --accept-local-screening-terms --uv /run/current-system/sw/bin/uv --json
```

First recovery rerun correctly rejected an uncreated output directory before parsing; explicitly creating new D resolved the invocation error. Source pins remain portable; absolute local evidence paths here are instructions, not implicit resolver fallbacks.

Independent read-only code/scientific review returned no findings: `runtime:delegated-results/fa73edac-c9c9-45d8-b53f-3551017fb4e2/child-0.json`. Reviewer checked guards, numerical method, real-record consistency, holdout selection, B/C equality and module hashes; no raw-source rehash, full rerun or panel inspection was claimed by reviewer. Parent separately performed those checks. Retained review: [review.json](review.json).

Focused regression passed 21/21 after correcting stale pipeline list/count expectations; bundle-specific boundary tests subsequently expanded and passed 2/2. Tests now exercise actual loader unknown/fractional labels, NaN/negative/>100 values, conflicting forms, unit drift, rounding/outside bounds, unsafe outputs and missing terms acknowledgement. No evaluator implementation changed during recovery; no retroactive test-first claim for pre-crash code. Full final candidate checks and commit identity are recorded in Beads.

## Impact and next decision

Private evaluator is implemented, but atlas adoption remains deferred. Preserve public short-range contour names, geometry, schemas, filters and zero-mean activity. No dependencies added; no source maps, labels or generated classifications shipped. Current offline SPEC and manifest changed; public README, runtime architecture, core traceability/DATA_LICENSES, lessons, notices, security, release and citation metadata need no change because their behavior/assets/claims are unchanged. This is not release readiness; runtime/browser checks and heavy unrelated generators/DSI replays are outside this approved private scope.

Future adoption requires separately approved evidence/rights and runtime design: resolve template/probability/cohort gaps, validate anatomical fit independently, set compact payload/query budgets, and assess continuous/path sampling and sensitivity. Related work remains yum.14.5 (probabilistic alternatives), yum.14.6 (noncerebral atlas selection), yum.14.7 (retained-index lineage), yum.13 (source-bound retracking). No public replacement, push, deployment, DSI execution or source redistribution occurred.
