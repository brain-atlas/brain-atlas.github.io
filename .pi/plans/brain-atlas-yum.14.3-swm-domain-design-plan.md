# SWM anatomical-domain audit design-plan

- **Work:** `brain-atlas-yum.14.3`.
- **Status:** **Approved scope; source gate unresolved. Not implemented.**
- **Approval:** `brain-atlas-m195`, 2026-09-07.
- **Date:** 2026-09-07.
- **Branch:** current `main`; optional approved branch creation was not used. No merge or integration authority.
- **Evidence:** [source-gate record](../research/2026-09-07-swm-domains/source-gate.md).
- **Source decision:** `brain-atlas-5czc` chose targeted provenance research before implementation, not a diagnostic-only downgrade. Follow-up recovered a historical candidate generator and provider-declared target hash, but no exact generation binding; source gate remains unresolved.
- **Prerequisite:** [source-bound fibre-accounting research](brain-atlas-yum.14.1-siibra-fibre-accounting.md). This child does not supersede its wider accounting proposal or current `tools/assets/SPEC.md`.

## Goal and boundary

Audit the existing 15,000 SWM contours against a suitable pinned domain segmentation; distinguish source retention criteria from later anatomical lookup and recommend curation without replacing geometry. The original acceptance criteria remain in Beads.

Reuse the offline asset pipeline's explicit hash-checked nonsymlink inputs, new empty output roots, locked NumPy/nibabel environment and deterministic serializers. Add no runtime mechanism, dependency, transform, implicit download or DSI execution. Preserve public geometry, endpoint artifact, presets, selectors and lesson behavior byte-for-byte.

## Alternatives and approved choice

1. **Source-gated audit implementation (approved):** verify TemplateFlow carpet source identity, label semantics, derivation and rights; stop if inadequate. Then implement reproducible offline accounting and review curation consequences.
2. Research/design only: lower implementation scope but no completed classification.
3. Source retracking or cerebral-only replacement: separate design and approval; excluded here.

The source gate found verified source label definitions and published repository terms but unresolved construction/upstream rights provenance. A source-named descriptive diagnostic with those gaps would be a narrower deliverable, not automatic satisfaction of the anatomical curation acceptance criteria. Resolve that distinction before implementation.

## Planned implementation sequence

### 1. Resolve source suitability

Verify primary source records and retain exact version, bytes, hashes, terms, label-to-category mapping and derivation limitations. Inspect NIfTI dimensions, unit codes, affine and both forms. Resolve conflicts before sampling. Do not infer provenance from filenames or cortical label names. Pin any approved source in `tools/assets/manifest.json`; do not silently choose another atlas.

### 2. Add the smallest offline audit

After the source gate passes, add an audit module under `tools/assets/`, thin CLI dispatch in `tools/assets/cli.py`, manifest/schema changes only as required, and focused tests. Exact command spelling remains to be chosen; no nonexistent command is claimed here.

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

Independently review retain-and-partition, cerebral-only subset, rename and retracking consequences. Geometry replacement remains excluded regardless of recommendation. Current endpoint tuples, presets and public geometry hashes must remain unchanged.

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
