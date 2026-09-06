# Source-bound hierarchical fibre accounting

- **Bead:** `brain-atlas-yum.14.1`; parent `brain-atlas-yum.14`.
- **Status:** **Draft — research checkpoint, not implementation approval.**
- **Date:** 2026-09-06.
- **Approval:** None. Every child implementation needs a separately accepted design.
- **Evidence:** [source inventory](../research/2026-09-06-siibra-accounting/source-inventory.json) and [configuration URL checks](../research/2026-09-06-siibra-accounting/config-url-verification.json).
- **Authority:** Beads owns live status and blockers. `tools/assets/SPEC.md` continues to describe the implemented pipeline. This draft changes neither current classification nor project invariants.

## Decision proposed

Use siibra as an offline acquisition, terminology, map, and reference-method source. Do not install it in the browser, add it to the existing generator environment, or make its assignment API the project's classifier. Preserve explicit hash-checked inputs and compact generated data behind the existing one-renderer boundary.

Account for anatomical domain before selecting a named regional primary. Keep two unordered endpoint records per displayed contour and a deterministic fibre summary. A primary is a visualization choice supported by disclosed evidence, not a biological termination, connectivity measurement, or polarity.

This checkpoint does **not** satisfy all acceptance criteria. Configuration reuse terms, some candidate dataset terms, complete probability-map hashes, and executed exact/uncertain-point probes remain outstanding. No runtime/data replacement is authorized.

## Verified source boundary

The [Nature Methods article](https://www.nature.com/articles/s41592-026-03159-x), *Siibra: a software tool suite for realizing a Multilevel Human Brain Atlas from complex data resources*, DOI `10.1038/s41592-026-03159-x`, was retrieved from the publisher. It distinguishes atlas terminology from spatial annotations, labelled from statistical maps, and foundational configuration from dynamic live queries. Brain Atlas can adopt those distinctions without adopting cloud execution. The full paper/methods review remains `brain-atlas-yum.12`; this task does not close it.

### Software/configuration pin

Proposed reference release: **siibra `1.0.1a20`**, Git commit `44549ae595533054135a4d62d567069353027b34`; configuration commit **`177023a506eceff008a012bb0a98d7bca0d1bbd5`**. Prefer this matched release over the previously reviewed post-release `cb6888d8ad3b6f24ae60c15a4bf3aa3434290492`. A second research pass inspected alpha.21; it is not selected. Parent verification retrieved all 13 selected configuration files from alpha.20's exact revision and matched their hashes; no mixed-revision inventory is used.

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| siibra 1.0.1a20 source distribution | 606,983 | `1926610c0b829a9a1caf25290ce747bacfe290f89f92c37417e45bb9b57e0a81` |
| siibra release Git archive | 1,366,921 | `37551a8f200c67446707886cf40a5fa54145d2fdba58f55e2e48ef49b90f80fd` |
| configuration revision ZIP | 1,548,128 | `f41e45cd2306b645342e7937319bb1302a9d895d57f55cf1c67ffc0bc00a7c90` |

Exact retrieval URLs, per-file IDs, bytes, and hashes are in the source inventory. Software is Apache-2.0. No repository-wide configuration license was found; software licensing must not be extended to configuration content. Do not redistribute the configuration archive or promote a derived hierarchy until the applicable rights are established. Public accessibility is not reuse permission.

### Atlas and candidate inventory

| Source | Identity and evidence | Proposed disposition |
|---|---|---|
| Jülich-Brain v3.0.3 | Parcellation `minds/core/parcellationatlas/v1.0.0/94c1125b-b87e-45e4-901c-00daee7f2579-300`; DatasetVersion `d69b70e2-3002-4eaf-9c61-9c56f019bbc8`. Hierarchy has 598 nodes/350 leaves. MPM uses the 157-area set, represented bilaterally; the finer 175-area statistical set has no corresponding MPM. | Retain current 157-area MPM identity. Propose 157-area statistical evidence and explicit hierarchy mapping; never equate all hierarchy leaves with MPM labels. Finer maps remain separately versioned, not a silent substitute. |
| HCP superficial bundles | Parcellation `juelich/iav/atlas/v1.0.0/79cbeaa4ee96d5d3dfe2876e9f74b3dc3d3ffb84304fb9b965b1776563a1069c`; 673 bundle maps. Hierarchy/map-level DatasetVersion is `6a7e07ad-303c-4b1d-b444-ded9ee782225`, while delivered volume metadata/bucket names `609c0598-bf02-4b65-8d7d-3a40f0c2f543`. | Candidate only. Dataset license PDF identifies CC BY-NC 4.0. Resolve version correspondence and source cohort/registration before use. Do not call it the project's HCP-1065 tractography source. |
| ARCHI superficial bundles | Parcellation `juelich/iav/atlas/v1.0.0/6`; DatasetVersion `f58e4425-6614-4ad9-ac26-5e946b1296cb`; 100 maps. | Reject assignment use pending terms and source reconciliation. Peer descriptor review found 79 subjects and `MNI152_T1_2mm`; config says 78 subjects and 2009c, while retrieved MPM is 1 mm. Preserve conflict rather than infer a resampling derivation. |
| VEP whole-brain map | Config identity `https://doi.org/10.1016/j.jneumeth.2020.108983/mni152`; configured provider uses moving `develop`. Research found a commit-bound object at `7d3f12c7e7fa0a8f28fc5e948f850b7755834172`. | Reject for now: dataset terms unresolved and grid differs. A commit pin fixes mutability, not anatomical validation or licensing. |
| Existing TemplateFlow GM/WM | Exact inputs already bound by `tools/assets/manifest.json`. | Tissue evidence only. GM/WM does not distinguish cerebrum, cerebellum, brainstem, or deep nuclei. It cannot serve as a complete domain atlas. |

The inventory binds retrieved Jülich MPM (335,280 bytes, `3af71c8d467db42d8561115164e0f365b942dfaa3568740ce62846fa3a201aff`), HCP MPM, ARCHI MPM, VEP volume, and Jülich/HCP license PDFs. Parent independently checked retained bytes; dataset interpretation and PDF readings came from the research peer. All 314 Jülich statistical volumes and candidate bundle probability sets have **not** been individually pinned. Configuration hashes do not substitute for volume hashes.

No whole-brain anatomical-domain map is selected yet. `brain-atlas-yum.14.3` owns domain validation; `.6` owns deeper/cerebellar atlas selection. The earlier carpet-segmentation pilot is not source-bound evidence and is not adopted by this record.

## Coordinate contract

- Association contours retain verified ICBM 2009a Nonlinear Asymmetric RAS+ millimetres. SWM retains nonlinear ICBM152 2009a RAS+ millimetres with the existing asymmetric-variant evidence limitation.
- Jülich maps retain MNI152NLin2009cAsym coordinates. The retrieved Jülich/HCP/ARCHI MPMs were reported as `193×229×193`, 1 mm, origin `[-96,-132,-78]`; this does not prove common anatomical registration or source history.
- A numerical lookup at the same RAS-mm coordinates is a **mixed-release common-world comparison**, not a 2009a→2009c registration or shared voxel index.
- Record map affine, dimensions, units, qform/sform codes and matrices independently from fibre lineage. Resolve any form conflict before sampling.
- No `Point.warp`, automatic cross-space assignment, per-dataset fit, relabeling of source space, or second runtime transform. Any future offline conversion requires its own source-bound design and approval.

## siibra methods: adopt concepts, reject hidden behavior

The reference implementation is the selected release's `siibra/locations/point.py`, `pointcloud.py`, `volumes/parcellationmap.py`, `sparsemap.py`, `configuration/`, and `retrieval/cache.py`.

| Mechanism | Observed behavior | Proposed rule |
|---|---|---|
| Hierarchy | Nested region children and versioned parcellation IDs; not every node has a map. | Preserve ancestor relations and explicit map-index correspondence. Never persist fuzzy name search results as identity. |
| Sparse maps | Cache, remote precomputed sparse index, then potentially every source volume. | Adopt sparse nonzero storage only if useful. Reject cache/precomputed index as source authority; any index must bind all inputs and algorithm hashes. |
| Exact points | `_assign_points` computes `(inverse_affine × point + 0.5).astype(int)` and includes map values strictly above threshold. | Reference behavior only; project rounding and negative/out-of-bounds behavior need explicit tests. |
| Uncertain points | `sigma_vox < 3` follows voxel readout. At `>= 3`, it creates a Gaussian query volume and requests volume assignment. | Do not claim subvoxel or 2 mm uncertainty is integrated on a 1 mm grid. Freeze a separately tested project method before adoption. |
| Assignment metrics | Exact readout and Gaussian/volume assignment return different evidence. | Separate map probability/value, overlap, correlation, containedness, and distance. None is generic confidence or connection strength. |
| Warp | Assignment calls point-cloud warp. `Point.warp` uses a remote backend and constructs the returned Point without `sigma_mm`; source explicitly notes missing sigma preservation. | Reject cross-space API path. Do not execute it, even to obtain an apparently convenient label. |
| Cache | Default 2 GiB cache may evict old entries; keys derive from requests rather than this project's source manifest. | Disposable acquisition acceleration only, never durable evidence. No reliance on warm-cache success. |
| Local configuration | Local directory/ZIP supported; repository ZIP has a wrapper directory. Local config still contains remote data URLs. | If used in a research environment, strip exactly one verified wrapper level into a new root and configure before import. Local config alone is not an offline guarantee. |

These are **source-reviewed observations**, not executed API tests. Required executable probes remain a closeout blocker:

1. Pin a separate research environment without changing `tools/assets/requirements.lock`.
2. Use a local synthetic map, local explicit space, and fail-closed network access. No actual warp call.
3. Compare exact points, subvoxel offsets, sigma `0`, `0.1`, `2`, `2.999`, `3`, and `3.001` mm on a 1 mm grid. Cover constant and mixed-sigma point clouds.
4. Assert which branch runs and which metrics exist; cover ties, zeros, threshold equality, negative voxel coordinates, and out-of-bounds positions. Do not mistake a branch mock for full assignment validation.
5. Assert space mismatch is rejected by the proposed project boundary before upstream assignment. Source inspection proves missing sigma forwarding; it does not validate any real warp or propagated uncertainty.
6. Retain source/environment hashes, runnable probe, exact output, and interpretation. A network/cache/config failure is not an assignment result.

## Proposed logical schema: `brain-atlas/fibre-accounting/v1`

This is a new artifact contract, **not** a reinterpretation of `fibre_endpoints.json` schema 1. The child implementation must supply strict machine validation and freeze any numerical thresholds before classifying real data.

| Record | Required fields and meaning |
|---|---|
| Header | `schemaVersion: 1`, contract ID, source/algorithm/config hashes, fibre payload hashes/order contract, atlas records, method records, uncertainty records, counts, and `warpApplied: false`. |
| Atlas | Stable atlas/version/config/map IDs, dataset record, source bytes/hash, grid/affine/units, terms decision, and explicit scope/coverage. |
| Entity | Stable project ID, atlas region ID or explicit atlas-version-bound hierarchy path, hemisphere, parent IDs, map correspondence, and availability. Unmapped ancestors remain legitimate terminology, not fabricated meshes. |
| Endpoint | `domain`, `status`, nullable `primary`, `alternatives`, `evidence`, `method`, `uncertainty`; identity comes from source dataset/group/fibre index and stored end A/B. Do not duplicate geometry. |
| Domain | `cerebrum`, `cerebellum`, `brainstem`, `deep-structure`, `outside`, or `unresolved`, with source evidence. Domain vocabulary/overlap policy must be validated by `.3`; a tissue value alone cannot assert a domain. |
| Status | `assigned`, `ambiguous`, `domain-only`, or `unresolved`. `domain-only` requires a resolved anatomical domain and no defensible named-region primary. |
| Candidate | Entity and map references, evidence reference, and role. One candidate may be chosen as display primary without erasing alternatives or ambiguity. |
| Evidence | Separately nullable `mapValue`, `probability`, `overlap`, `distanceMm`; include support/normalization/units and method. Null means unavailable, never zero. MPM must have `probability: null`. Probability is atlas frequency/evidence, not probability of biological connection. |
| Uncertainty | Input localization sigma/covariance or explicit unknown, input basis, treatment method, template-release mismatch, rounding/resampling limits, coverage limits, and reason codes. Do not invent a measured sigma from the existing 2 mm search radius. |
| Fibre | Exactly two endpoint references plus derived quality/category and separate optional contour-level superficial-bundle evidence. A/B remains storage geometry. |

Compact serialization should intern repeated atlas/entity/method/uncertainty/evidence tables and use documented fixed-position tuples. Keep full provenance offline; browser projection carries enough references for honest disclosure. Reject unknown versions/keys, nonfinite numbers, invalid probabilities, dangling indices, duplicate IDs, malformed pairs, and count mismatches. Do not quantize ranking evidence before choosing a primary; record the precision rule separately.

### Deterministic precedence

1. Validate all required inputs and coordinate metadata before producing any records. Corrupt/missing required inputs fail the run; they are not `unresolved` anatomical outcomes.
2. Domain evidence gates candidate eligibility. Conflicting validated domains produce `unresolved` with competing evidence, not a convenient regional fallback. An absent domain atlas remains explicitly unresolved.
3. Consider only approved domain-compatible atlas candidates. A primary may be selected only under the domain-specific method's predeclared support/threshold policy. No nearest-region assignment outside a bounded rule.
4. Within a single comparable probability-map set, rank by unrounded supported probability, then stable entity ID for deterministic ordering. A scientific tie remains `ambiguous`; lexical order is only a display choice, not stronger evidence. Do not compare unrelated atlas scores as if calibrated.
5. Categorical direct/local-nearest evidence is a separately identified fallback, never fabricated probability. Preserve alternatives and explain why a candidate was selected or withheld.
6. If domain is resolved but no defensible region exists, emit `domain-only`; otherwise `unresolved`. Bundle membership is contour evidence, not endpoint anatomy and cannot manufacture a primary.
7. Fibre quality precedence: either endpoint `unresolved` → `unresolved`; else either `ambiguous` → `ambiguous`; else either `domain-only` → `domain-only`; otherwise `assigned`. Domain-pair category is sorted by stable domain ID, independent of A/B order. This proposed precedence differs from legacy quality and must not alter it implicitly.
8. Balance exactly 17,880 fibres and 35,760 endpoints, including 2,880 association and 15,000 SWM contours. Group, hemisphere, domain, status, and preset summaries must reconcile. Reversing a contour must not change derived quality or unordered queries.

## Offline regeneration and drift gates

A future builder belongs under `tools/assets/` only after approval. Reuse its explicit nonsymlink input and new/empty output-root guards. No implicit download, remote sparse index, live query, adjacent cache lookup, or writing/copying into `public/`.

Acquisition is separate and explicit: retrieve approved files/terms, byte-count and SHA-256 them, bind configuration paths and complete map sets, then build offline. Frozen source selection must not follow newest release, branch, fuzzy atlas name, or latest dataset version. Parse structured files through established JSON/NIfTI parsers. Record map support, units and normalization rather than inferring probability from filenames.

Regeneration must compare input identities, grid/form values, hierarchy/map correspondence, method/environment identity, fibre order, two-endpoint counts, deterministic table ordering, output bytes, and preset audits. A source change, expanded vocabulary, or different parameter is a new accepted version, not automatic refresh. Preserve output and diagnostic evidence on drift; never relax thresholds after looking at counts.

The child design must set an explicit browser byte/decoded-memory budget against the current endpoint artifact and benchmark full-population queries. Store no volume or dense probability tensor in the browser; avoid a second renderer/filter engine. No performance claim is made by this draft.

## Migration and compatibility

Current `src/fibre-endpoint-filter.js` rejects artifact versions other than 1, decodes four-integer tuples, and recognizes only region IDs plus `endpoint.unknown`/`endpoint.ambiguous`. Non-known tuples cannot assert an entity. Current fibre quality uses **ambiguous before unknown before known**; ambiguous candidates never implicitly match region selectors.

1. Preserve current `fibre_endpoints.json`, preset catalog, lesson snapshots, selectors, and counts byte-for-byte while generating the new artifact offline alongside them. Baseline hashes are in the source inventory.
2. Keep a frozen legacy projection or continue loading the old artifact. It must reproduce current known/unknown/ambiguous tuples and all existing preset results exactly. Do not derive old behavior from a new highest-probability primary.
3. New domain/ancestor/alternative selectors require explicit versioned query semantics, catalog validation, canonical snapshot migration, and separately approved renderer/UI changes. No silent reinterpretation of `touches-any`, `connects-within`, or symmetric `connects-between`.
4. `.2` expands the Jülich vocabulary/visualization; `.3` validates domains and SWM curation; `.4` evaluates superficial bundles; `.5` integrates probabilities/primary alternatives; `.6` selects cerebellar/deep atlases. Preserve prerequisites recorded in Beads.
5. Before replacement: compare old/new counts and reasons, keep scientific disclosures aligned, verify source terms/attribution, strict import/query compatibility, keyboard/accessibility, one-canvas geometry/activity coherence, and measured browser memory/rebuild cost. Maintain rollback through the old checked artifact and compatible runtime revision.

## Remaining closeout gates

- [x] Claimed Bead; current contracts inspected; no runtime/data changes.
- [x] Publisher article verified; selected software/config pins recorded.
- [x] Thirteen revision-bound config URLs independently fetched with matching bytes/hashes.
- [x] Candidate MPM/software/license-file bytes independently hashed; source and dataset IDs recorded.
- [x] Draft logical schema, deterministic precedence, offline boundary, and legacy migration documented.
- [ ] Resolve applicable configuration reuse terms and candidate terms, or document a source-verified alternative that avoids reuse. Do not ask an owner to waive absent third-party rights.
- [ ] Complete exact map-file inventory for every adopted probability set; record sizes, hashes, terms and explicit scope exclusions.
- [ ] Execute and retain exact/uncertain-point probes in a pinned isolated environment.
- [ ] Independently reconcile HCP/ARCHI dataset/version/space evidence or formally retain rejection with downstream blockers.
- [ ] Review the completed decision record; add the approved future contract to `tools/assets/SPEC.md` without describing it as implemented.

No change to README capabilities, runtime architecture, geometry, scientific display, lesson claims, release identity, shipped dependencies, notices, or licenses is made. Therefore current public documents and `tools/assets/manifest.json` remain unchanged. When a child lands behavior, its public architecture, provenance, terms, metadata, and lesson-impact review must land together.
