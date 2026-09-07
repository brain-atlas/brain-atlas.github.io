# Private probabilistic endpoint evaluation

- **Bead:** `brain-atlas-yum.14.5`.
- **Status:** Implemented private research/evaluation; numerical method below was frozen before real endpoint scoring. [Results and verification](../research/2026-09-07-endpoint-probabilities/report.md). Not runtime adoption; full Bead remains partial.
- **Approval:** User selected private research plus tested evaluation in fresh session, recorded in Bead on 2026-09-07.
- **Date / branch:** 2026-09-07 / `main` (existing checkout; no branch manipulation).
- **Parent design:** [accounting draft](brain-atlas-yum.14.1-siibra-fibre-accounting.md). This specializes only private evaluation; full migration remains unapproved.

## Outcome and boundary

Retain population-map evidence for all 35,760 stored endpoints / 17,880 fibres, independently of legacy classification. Reuse existing guarded offline primitives in a private research script, rather than add another public pipeline/CLI before adoption. No public geometry, data, selectors, presets, canonical state, lessons, UI, activity, dependencies, transform or license changes. No downloads, DSI, redistribution, push or deployment.

There is no recovered validated whole-brain domain authority. Carpet source compartments and HCP bundle overlaps are not anatomical validation. Therefore every actual endpoint retains `domain: unresolved`, `status: unresolved`, `primary: null`, reason `validated-domain-unavailable`. No `domain-only` outcome is asserted. Synthetic domain gating is unnecessary because this evaluator has no domain input or assignment path. A future domain-aware classifier requires another reviewed method; this evaluator cannot satisfy that acceptance item.

## Evidence and semantics

Pinned inputs: `.pi/research/2026-09-06-siibra-accounting/probability-manifest.json` (314 maps plus four auxiliary files), and source inventory's four legacy compatibility pins. Source descriptor `aux-data-descriptor_9c56f019bbc8.pdf`, SHA-256 `4d18f32ff8c7d3016190e20b8629cb97ce8defc0164298e9e0ebfed763d0749d`, independently rehashed and parsed with `pdftotext` in this session. Primary URL fetched by research peer: https://data-proxy.ebrains.eu/api/v1/public/buckets/d-d69b70e2-3002-4eaf-9c61-9c56f019bbc8/data-descriptor_9c56f019bbc8.pdf .

Descriptor says maps rely on ten brains, use 3 mm FWHM smoothing and global normalization to correct interpolation artifacts, and encode 0–100% spatial overlap as values 0.0–1.0. These are processed atlas population evidence, not individual endpoint membership, termination, connectivity, direction or one-region/one-function certainty. Exact normalization formula and cross-map sum constraint remain unspecified. Never renormalize candidates or infer literal donor counts from delivered values. GapMaps aggregate uncharted cortex; retain their raw evidence separately, never choose one as a named-area leader. Six GapMap identities per hemisphere, twelve volumes total.

Retain 2009a fibre lineage and 2009c map identity. Probability maps have unknown unit codes and matching code-1 forms; common numerical RAS-mm lookup is an explicit assumption, not units repair, registration or template equivalence. No warp. Input localization sigma/radius unknown; map smoothing is not endpoint uncertainty.

## Frozen `endpoint-pmap-readout-v1`

1. Verify all hashes before scientific parsing; complete explicit nonsymlink input directory, exact 314+4 inventory. Validate manifest pin itself, licensed XML correspondence, all map shapes/forms/storage/finite `[0,1]` values. Missing maps, extra files, unsupported source identities, corrupt forms or unsafe output roots fail the run, not become anatomical outcomes.
2. Preserve checked association tract order, L/R then fibre index; SWM index order; exactly first/last stored points. No resampling. Preserve source hemisphere and legacy endpoint tuples in independent projection. A/B is unordered geometry.
3. Baseline lookup: inverse source affine, nearest-even rounding, bounds before integer conversion, out-of-grid distinguished from zero support. Exact grid readout only; no nearest-nonzero, interpolation, distance search or Gaussian integration.
4. Retain every map with positive baseline or sensitivity-probe evidence, in stable volume-index order, with baseline native value and probe min/max. Values remain unrounded float32 evidence promoted exactly to JSON numbers; no quantization or cross-map normalization. `distanceMm` and spatial-overlap score remain null: native population overlap is not query-volume overlap.
5. Diagnostic `mapLeaders` are all non-GapMap candidates tied at largest strictly positive baseline value. Exact numerical equality is a tie; stable ordering never breaks it. Positive support (`>0`) is inclusion, not an anatomical minimum-support threshold. Even a unique leader is not an assigned primary. Gap-only, named support, zero support and outside-grid are explicit diagnostic support categories.
6. Sensitivity: all 27 coherent offsets in `{-0.5,0,+0.5}` mm cubed, including baseline. Retain per-candidate min/max, and per-probe counts of support/leader-set changes and outside-grid endpoints. Offsets are grid sensitivity, not measured registration uncertainty. The displayed-coordinate rounding limit (0.1 mm precision, nominal ±0.05 mm) is disclosed but not claimed exhaustively evaluated by these probes.
7. Summaries balance endpoints and fibres, source group/hemisphere, legacy quality, support categories, candidate multiplicity, ties, hemisphere disagreements, and probe change counts. Derived unordered fibre support-pair categories must be reversal invariant. Anatomical status remains unresolved even if evidence exists. Report byte size, elapsed time and peak memory as private evaluation measurements, not browser performance.
8. Legacy projection is a byte-for-byte independent copy of checked `fibre_endpoints.json` into private output, with unchanged preset hash. Do not derive it from probability leaders. Existing filter tests verify preset and ambiguity precedence compatibility.
9. Deterministic outputs: sorted compact finite JSON plus newline; exact output bytes match two fresh runs. Timing/memory remain separate receipts, not deterministic payload. Header binds input inventories, all source references, method/script/shared-module/environment identities, uncertainties and limitations. No raw volumes or full dense matrix in output.

## Files and execution

- Create `.pi/research/2026-09-07-endpoint-probabilities/evaluate.py` and `test_evaluate.py`.
- Write source/results/verification report beside them; no new public command or production spec claim.
- Test-first numerical sampling, ties, GapMaps, unknown domains, corruption/bounds, reversal and output safety; test full pinned-source fixtures during evaluation.
- Run two fresh private output roots; compare all deterministic bytes; independently review sampler/source semantics and results before task-owned commit.
- Full `npm test`, `npm run build`, `check-manifest`, `verify-current`, focused Python tests and diff checks. Browser release checks deferred because runtime unchanged.

Commands (repo root):

```bash
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python .pi/research/2026-09-07-endpoint-probabilities/test_evaluate.py
# Explicit input/output/uv paths required; create a NEW empty private output root first.
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python .pi/research/2026-09-07-endpoint-probabilities/evaluate.py \
  --inputs /private/tmp/brain-atlas-yum.14.1-julich-probability-177023 \
  --repo . --output "$NEW_EMPTY_OUTPUT" --uv /run/current-system/sw/bin/uv
```

## Remaining acceptance and documentation

No adopted classifier, validated-domain primary, domain-only cases, browser payload budget, schema/query/state migration, accessible UI, published derivative-rights decision or Chromium/Firefox adoption checks is delivered by this private phase. Keep Bead open/partial unless user separately approves splitting that remaining work; do not close full acceptance as success by calling evaluation adoption. Public docs, core traceability/licenses, lessons and notices have no changed shipped claims. This plan and research report own private method/evidence; Beads owns live status.
