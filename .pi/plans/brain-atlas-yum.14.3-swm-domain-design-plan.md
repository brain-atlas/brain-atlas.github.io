# SWM anatomical-domain audit design-plan

- **Work:** `brain-atlas-yum.14.3`.
- **Status:** **Approved bounded screening audit; empirical suitability checks pending. Not implemented.**
- **Approval:** `brain-atlas-m195`, amended by `brain-atlas-n401` after explicit human agreement in the current conversation, 2026-09-07.
- **Date:** 2026-09-07.
- **Branch:** current `main`; optional approved branch creation was not used. No merge or integration authority.
- **Evidence:** [source-gate record](../research/2026-09-07-swm-domains/source-gate.md).
- **Source decision:** `brain-atlas-5czc` initially required targeted provenance research. Follow-up recovered a historical candidate generator and provider-declared target hash, but no exact generation binding. **`brain-atlas-n401` supersedes the complete construction-binding stop condition**, accepting the published map as a coarse screening reference subject to empirical checks and explicit uncertainty. The historical gap remains documented, not resolved.
- **Prerequisite:** [source-bound fibre-accounting research](brain-atlas-yum.14.1-siibra-fibre-accounting.md). This child does not supersede its wider accounting proposal or current `tools/assets/SPEC.md`.

## Goal and boundary

Audit the existing 15,000 SWM contours against a suitable pinned domain segmentation; distinguish source retention criteria from later anatomical lookup and recommend curation without replacing geometry. The original acceptance criteria remain in Beads.

Reuse the offline asset pipeline's explicit hash-checked nonsymlink inputs, new empty output roots, locked NumPy/nibabel environment and deterministic serializers. Add no runtime mechanism, dependency, transform, implicit download or DSI execution. Preserve public geometry, endpoint artifact, presets, selectors and lesson behavior byte-for-byte.

## Alternatives and approved choice

1. **Bounded screening audit implementation (approved, amended):** verify exact published TemplateFlow carpet bytes, headers and label semantics; inspect anatomical overlays and sensitivity before relying on results. Accept incomplete upstream construction history with explicit disclosure, not a claim of full regeneration. Then implement reproducible offline accounting and review curation consequences.
2. Research/design only: lower implementation scope but no completed classification.
3. Source retracking or cerebral-only replacement: separate design and approval; excluded here.

The human accepted small disclosed provenance gaps for this educational tool **provided confidence is supported by evidence**. For this audit, treat the published carpet labels as coarse screening compartments rather than anatomical ground truth. No measured confidence threshold is invented. Byte/header checks, multi-plane anatomical overlays, spatial coherence and sensitivity diagnostics must support the interpretation; conflicting anatomy remains unresolved or stops reliance on the affected category. Missing historical build records alone no longer block implementation.

Published repository terms support the approved local-audit scope with notice retention and disclosed upstream rights gaps; this is not a third-party rights waiver or authority to redistribute the source map or ship derived classifications. Existing one-frame, scientific-honesty, hash-checking and public-replacement invariants remain unchanged. A reviewed curation recommendation may retain limitations, but any cerebral-only replacement needs independent anatomical corroboration and separate approval.

## Planned implementation sequence

### 1. Resolve source suitability

Verify primary source records and retain exact version, bytes, hashes, terms, label-to-category mapping and derivation limitations. Explicitly acquire the selected map and template reference; independently hash them. Inspect NIfTI dimensions, unit codes, affine and both forms. Resolve coordinate conflicts before sampling. Inspect multi-plane overlays against the pinned template anatomy, especially source label 255, to assess gross correctness without calling visual agreement a validation of every voxel. Do not infer provenance from filenames or cortical label names. Pin approved local-audit inputs in the audit contract/manifest without representing unknown upstream rights as cleared for shipping. Do not silently choose another atlas.

### 2. Add the smallest offline audit

Under the amended source gate, add an audit module under `tools/assets/`, thin CLI dispatch in `tools/assets/cli.py`, manifest/schema changes only as required, and focused tests. Exact command spelling remains to be chosen; no nonexistent command is claimed here. Every output must state the screening assumption, construction/rights gaps, mixed-template comparison and absence of public replacement.

Freeze numerical rules in `tools/assets/SPEC.md` and tests before production counts:

- nearest-even categorical sampling of 120,000 stored points, including 30,000 endpoints;
- explicit background, outside-grid and unresolved outcomes; retain source-native combined labels;
- unordered endpoint pairs, any-point overlap counts, strict-majority/no-majority and all-eight-same/mixed partitions;
- hemisphere, shipped-length, spatial-distribution and legacy-quality cross-tabs, with explicit denominators;
- alternate `floor(v+0.5)` rounding, component-wise ±0.05 mm rounding-cell bounds and full 27-offset ±0.5-voxel probes;
- exact recovered-index lineage only if registered inputs are available and verify; no approximate geometry join.

Keep audit records and candidate outputs isolated. No public candidate installation or runtime loader.

### 3. Verify and review

Observe focused synthetic tests fail before implementation and pass afterward. Cover half-ties and negative indices, nonfinite input, unknown label rejection, conflicting forms, counts, ties, contour reversal, unsafe output roots and changed source hashes. Run the real audit twice into distinct empty roots and compare bytes. Reproduce the pilot counts or explain differences without changing frozen rules.

Independently review retain-and-partition, cerebral-only subset, rename and retracking consequences. Distinguish spatially coherent interior findings from boundary-sensitive outcomes; neither a reproduced count nor a plausible historical recipe proves fibre anatomy. Geometry replacement remains excluded regardless of recommendation. Current endpoint tuples, presets and public geometry hashes must remain unchanged.

Existing verification commands:

```bash
npm test
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock python -m tools.assets check-manifest
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock python -m tools.assets verify-current --repo .
git diff --check
```

The focused audit/reproduction commands must be recorded once their approved implementation interface exists. Build/browser verification is required for any later accepted user-visible behavior, not evidence supplied by this offline research checkpoint.

### 4. Documentation and closeout

Record methods, source terms, provenance, sensitivity and reviewed recommendation with implementation. Update current public limitations only for verified evidence; update `DATA_LICENSES.md` if adopting source-derived material. Do not claim the frozen sample has been replaced or reclassified in the browser. Record no-impact rationale for unaffected architecture, lessons, runtime performance, release/security, software notices and citation identity.

Only after the full acceptance criteria pass: compare implementation with this approved design, commit task-owned changes, run direct-closeout and then handoff. A source blocker or diagnostic-only result is partial work and must not close this Bead as successful.
