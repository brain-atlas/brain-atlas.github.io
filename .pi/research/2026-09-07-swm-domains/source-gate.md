# SWM domain source gate

- Work: `brain-atlas-yum.14.3`.
- Approval: `brain-atlas-m195` permits source-gated offline auditing, not public replacement.
- Date: 2026-09-07.
- Initial research checkpoint result (historical): **Exact construction provenance unresolved; no classification or implementation performed at that checkpoint.**
- **Current empirical checkpoint:** [Anatomical suitability and specific limitations](anatomical-suitability.md). Pinned carpet/T1 bytes and matching forms verified; three-plane overlays and compartment diagnostics reproduced. Conditionally suitable for private source-named coarse screening, not precise tissue membership or automatic fibre rejection. The subsequent [full displayed-SWM audit](audit-results.md) now supplies all-point accounting, sensitivity and reviewed retain/private-partition recommendation. Source labels remain screening evidence, not certified anatomy.
- **Subsequent scope amendment:** `brain-atlas-n401` accepts disclosed construction gaps for a bounded coarse-screening audit, conditional on byte/header, anatomical-overlay and sensitivity checks. It supersedes the implementation stop below, not the recorded evidence gaps. See the approved [amended design-plan](../../plans/brain-atlas-yum.14.3-swm-domain-design-plan.md).
- Recovery: only `bd show brain-atlas-yum.14.2`, `bd show brain-atlas-yum.14.3`, their referenced artifacts and current relevant source. No prior transcript or unrelated Beads recovered.

## Independently verified primary records

Parent ran one `agnt web-search` query for TemplateFlow carpet segmentation, then `agnt web-fetch` on each URL below. All four returned HTTP 200 and the expected text on 2026-09-07. The repository revision is `15d7c02160f79f5218d2545b4febebeecc11531d`. These checks verify published metadata, not NIfTI bytes or anatomical accuracy.

- [Carpet labels](https://raw.githubusercontent.com/templateflow/tpl-MNI152NLin2009cAsym/15d7c02160f79f5218d2545b4febebeecc11531d/tpl-MNI152NLin2009cAsym_desc-carpet_dseg.tsv).
- [Template description](https://raw.githubusercontent.com/templateflow/tpl-MNI152NLin2009cAsym/15d7c02160f79f5218d2545b4febebeecc11531d/template_description.json).
- [Published license](https://raw.githubusercontent.com/templateflow/tpl-MNI152NLin2009cAsym/15d7c02160f79f5218d2545b4febebeecc11531d/LICENSE).
- [Resolution-01 annex pointer](https://raw.githubusercontent.com/templateflow/tpl-MNI152NLin2009cAsym/15d7c02160f79f5218d2545b4febebeecc11531d/tpl-MNI152NLin2009cAsym_res-01_desc-carpet_dseg.nii.gz).

### Labels

| Values | Source names/scope |
|---|---|
| 0 | background |
| 1, 2 | Left, Right Cerebral White Matter |
| 3, 4 | Left, Right Lateral Ventricle |
| 5 | Brain-Stem |
| 34–37, 39–41; 45–51 | Bilateral thalamus, caudate, putamen, pallidum, hippocampus, amygdala, accumbens |
| 101–196 | 48 bilateral cortical name pairs |
| 255 | **Cerebellum and Midbrain** |

Do not split 255, call it cerebellum alone, or imply label 5 covers all brainstem anatomy. Background is not proof of outside-brain location. The TSV `xyz` column does not state a coordinate frame or units; it is not usable as RAS-mm landmarks. Hippocampus/amygdala must not silently inherit a narrow basal-ganglia definition of “deep gray”; any project grouping needs an explicit label list.

### Grid and byte identity

Template metadata declares 2009c asymmetric resolution-01 shape `[193,229,193]`, zooms `[1,1,1]`, origin `[-96,-132,-78]`. These declarations do not replace inspection of the selected NIfTI affine, qform/sform, unit codes or voxel values.

The annex pointer declares `MD5E-s451304--8b726a5a4b0580be17a670a7570cc2a3.nii.gz`. The volume has **not** been retrieved or independently SHA-256 hashed in this work. The annex MD5 is a retrieval cross-check, not the required project source pin.

### Rights and derivation gap

The template metadata says “See LICENSE file.” The published license grants permission to use, copy, modify and distribute “this software and its documentation” with the Louis Collins/McGill copyright notice retained; it disclaims suitability and warranties. This is explicit repository-level permission, not CC0. It is not evidence of the identity or terms of unidentified upstream segmentations.

Initial read-only research did not establish the carpet generation recipe. The follow-up below recovered a historical candidate script, but not its binding to the selected volume or exact parent versions. This is an evidence gap, **not a finding of infringement or proof that no build record exists**. Label names alone do not establish Harvard–Oxford derivation. Complete upstream data-rights tracing and anatomical boundary validity remain unresolved.

Two routed subscription peers investigated source provenance and numerical methods independently. Source peer recommended only conditional source-named descriptive use; it did not establish suitability as a complete anatomical-domain authority. Parent independently verified the four primary records above. Peer-only repository-history details are not adopted as verified findings here.

## Human decision and targeted follow-up

Decision `brain-atlas-5czc` selected **continue targeted carpet provenance research before implementation**. Diagnostic-only downgrade was offered but not selected. The approved design requires suitability/derivation/rights checks before classification and says to stop on inadequate evidence. Do not silently substitute another segmentation or weaken `tools/assets/SPEC.md` rights/provenance gates.

Two further read-only investigations traced historical niworkflows/fMRIPrep sources and TemplateFlow/OSF acquisition history. Parent independently fetched the following primary records (HTTP 200, 2026-09-07):

1. [Historical niworkflows generator](https://raw.githubusercontent.com/nipreps/niworkflows/c19d04e096d228af7447fba127aabfb4377cbbe2/niworkflows/data/templates/mni_icbm152_nlin_asym_09c/scripts/parcellation.py), revision `c19d04e096d228af7447fba127aabfb4377cbbe2`.
2. [OSF file metadata](https://api.osf.io/v2/files/5bc6475753cec40019ade131/).
3. [TemplateFlow issue 148](https://api.github.com/repos/templateflow/templateflow/issues/148) and [its empty comments array](https://api.github.com/repos/templateflow/templateflow/issues/148/comments).

### Historical candidate recipe: evidence, not established output lineage

The retrieved script explicitly loads `HarvardOxford-sub-maxprob-thr25-1mm.nii.gz` and `HarvardOxford-cortl-maxprob-thr0-1mm.nii.gz` through nibabel and canonicalizes them. It adds 100 to positive cortical labels and substitutes those values where subcortical labels are 2 or 13. It offsets labels between 2 and 50 by 30 and remaps 33→3, 44→4, 42→2 and 38→5. It writes uint16, conditionally calls `mri_convert -rl <reference> -rt nearest` when the brainmask shape exceeds the segmentation shape, then assigns 255 to a morphologically opened residual brainmask where segmentation is zero. The opening uses `iterate_structure(generate_binary_structure(3, 2), 2)`.

**Important anatomical limitation:** the candidate script makes 255 from residual brainmask, not an independently delineated cerebellum/midbrain segmentation. Its later source label is therefore not by itself a validation of that anatomical boundary. No source-bound evidence yet proves this script generated the current selected carpet bytes.

The script provides candidate parent names and algorithm operations, but not exact parent checksums/versions, invocation, reference/brainmask identities, environment, subsequent edits or the bridge to the selected volume. Historical compressed file sizes reported by the peer differ from the target; no voxel-equivalence test was performed. Do not call the source fully regenerated or infer registration from nearest-neighbour grid resampling.

### Acquisition identity recovered

OSF file ID `5bc6475753cec40019ade131`, GUID `gwndz`, reports current filename `tpl-MNI152NLin2009cAsym_res-01_desc-carpet_dseg.nii.gz`, size 451,304, version 1, creation timestamp `2018-10-16T20:17:27.589116Z`, MD5 `8b726a5a4b0580be17a670a7570cc2a3`, and SHA-256 **`52eded597985fee7806699dfd276d32b1d53293dff04326773e4fe84864752c7`**. These are **provider-declared hashes**, not locally verified volume hashes. The MD5/size match the independently fetched annex pointer. This strengthens acquisition identity, not anatomical generation provenance.

### Existing upstream evidence request

TemplateFlow issue 148, “Atlas provenance?”, asks specifically for the source of this carpet volume and its STG subdivisions. The independently fetched issue is open, with zero comments. This supports recording a concrete unresolved upstream question; it does not establish that every possible record has been exhausted.

### Blocker and resume packet

The source gate remains unresolved after targeted follow-up. Full anatomical auditing must wait for a record binding the historical candidate recipe (or another actual recipe) to the target volume and identifying parent maps/terms. No external message or issue was posted.

Suggested maintainer question, **draft only**:

> Which retained build record connects carpet SHA-256 `52eded597985fee7806699dfd276d32b1d53293dff04326773e4fe84864752c7` (451,304 bytes; OSF file `5bc6475753cec40019ade131`) to its generation script, exact parent atlas versions/checksums, reference/brainmask, invocation and any later edits? Is the niworkflows `parcellation.py` at `c19d04e096d228af7447fba127aabfb4377cbbe2` the actual generator? If so, what validates its residual-mask label 255 as “Cerebellum and Midbrain,” and which terms apply to the parent-derived map?

Resume from this record, the approved plan and decision `brain-atlas-5czc`; do not repeat broad exploration or classify under an unapproved diagnostic-only interpretation.

## Approved amendment after human review

The human reviewed the distinction between published-source identity, missing construction history, anatomical suitability and rights, then explicitly agreed: “This is an educational tool so we can document where we have small gaps in provenance as long as we have high confidence we are close to correct.” Approval `brain-atlas-n401` records the bounded interpretation:

- The missing exact historical generation binding is no longer a prerequisite for implementing the local screening audit. It remains an explicit limitation.
- Treat the pinned published map as a **coarse screening reference**, not anatomical ground truth. Do not infer that the historical candidate generator definitely produced it.
- Verify acquired bytes/headers/label values, inspect multi-plane overlays against pinned template anatomy, and assess spatial coherence and rounding/grid sensitivity before relying on findings. Confidence must follow those checks, not the educational purpose alone.
- Preserve label 255 as the source's combined “Cerebellum and Midbrain” compartment. Interpret uncertain boundaries and contradictory anatomy explicitly; do not automatically remove fibres.
- Local audit use under published repository terms does not clear unidentified upstream rights for source-map redistribution or shipping derived classifications.
- A reviewed curation recommendation with disclosed limitations is in scope. Actual replacement still requires independent anatomical corroboration and separate approval. Public geometry, endpoint artifacts, presets and runtime remain unchanged.

This amendment supersedes the earlier stop instruction and the construction-binding requirement in `brain-atlas-5czc`; it does not rewrite that earlier human decision or resolve the missing evidence. No general exception to repository scientific-honesty or data-rights rules is created.

## Frozen methodological refinements for later implementation

- Exactly 120,000 point states and 30,000 endpoint states from 15,000 eight-point contours. No dropped background/outside/unresolved samples.
- Any-point category counts overlap; report denominator 15,000 for each, not a false partition. Unordered endpoint pairs, strict-majority (at least five of eight)/no-majority, and all-eight-same/mixed form separate exclusive partitions.
- “All points” means all eight stored samples, not every location along the contour. Majority is a stored-sample statistic, not length fraction or biological membership.
- Nearest-even baseline. Alternate rounding must be explicitly `floor(v + 0.5)` (ties toward positive infinity), including negative values. Do not conflate it with decimal ties-away-from-zero rounding.
- Display rounding bound is component-wise ±0.05 mm; radial corner bound is about 0.0866 mm. Bound calculations must enumerate reachable nearest-neighbour cells, not assume corner probes prove all interior outcomes.
- Grid sensitivity uses the full 27 voxel offsets in `{-0.5,0,+0.5}³`, including zero. These are probes, not measured registration/localization uncertainty.
- Freeze legacy hemisphere from mean x of displayed rounded points, zero assigned R, and verify against existing endpoint artifact. Do not change strata during sensitivity probes.
- If recovered source comparison is performed, reconstruct exact retained indices through GM-ribbon filtering, 8–55 mm filtering and seeded sampling. Verify all displayed coordinates, lengths and order. Never nearest-match rounded geometry or use a class-3 replay as original lineage.
- Preserve 2009a fibre and 2009c map provenance separately; common-world lookup is neither a template warp nor shared voxel-index equivalence.
- Pilot values 3,391 / 3,447 / 4,253 remain unverified. Disagreement must be explained, not tuned away.

## Initial checkpoint impact (historical; superseded by linked empirical record)

No code, runtime, public data, manifests, presets, labels, licenses or scientific public claims changed. No volume download, DSI execution, production classification, tests, build, push or deployment performed. This documentation-only checkpoint needs no runtime tests; the implementation and release remain unverified. Fresh SHA-256/byte checks matched all four prerequisite compatibility baselines (SWM, association, endpoint artifact and presets); working-tree and staged diff checks passed. Unrelated untracked right-OR research and the two root ZIP archives remain untouched. This record and the linked plan preserve incomplete work in a local documentation commit; they are not audit results. No public capabilities, lesson claims, dependency/software notices, citation identity, security, hosting or release behavior changed, so their current documents need no update at this checkpoint.
