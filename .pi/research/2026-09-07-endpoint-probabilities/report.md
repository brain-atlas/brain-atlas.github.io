# Private endpoint population-map evaluation

**Work:** `brain-atlas-yum.14.5`, 2026-09-07. Private evaluator implemented; **no anatomical classifier or runtime adoption**. [Frozen design/method](../../plans/brain-atlas-yum.14.5-endpoint-evaluation-design-plan.md). Full Bead acceptance remains open.

## Source and interpretation

Consumed all 314 pinned Jülich v3.0.3 157-area bilateral volumes and four auxiliary files from [probability inventory](../2026-09-06-siibra-accounting/probability-manifest.json): 39,693,200 bytes total. The inventory itself and the [legacy baseline inventory](../2026-09-06-siibra-accounting/source-inventory.json) are hash-bound in `evaluate.py`. All inputs are hash-checked before map parsing. All 314 maps passed float32, 193×229×193, exact matching code-1 forms, unknown units, identity slope/intercept, and finite `[0,1]` checks. Licensed XML supplies identities; five pinned explicit name correspondences connect acquisition facts to XML. No configuration-authored hierarchy was copied.

The primary [v3.0.3 descriptor](https://data-proxy.ebrains.eu/api/v1/public/buckets/d-d69b70e2-3002-4eaf-9c61-9c56f019bbc8/data-descriptor_9c56f019bbc8.pdf) was fetched successfully by the research peer; its retained file was independently rehashed and parsed by parent. SHA-256: `4d18f32ff8c7d3016190e20b8629cb97ce8defc0164298e9e0ebfed763d0749d`. Fresh fetched PDF bytes were not independently rehashed. Descriptor pp. 3/6 states maps rely on ten brains, use 3 mm FWHM smoothing and global normalization correcting interpolation artifacts, and encode spatial overlap in `[0,1]`. Native values are **processed population spatial evidence**, not literal donor-count fractions, individual endpoint membership, termination, connectivity or direction. Exact normalization formula and cross-map sum contract remain unspecified; no normalization was added.

GapMaps aggregate uncharted cortex: six identities in each hemisphere, twelve volumes. They remain evidence, not individually delineated named areas or outside-brain indicators. Existing CC BY-NC-SA 4.0 research-input decision remains in [rights report](../2026-09-06-siibra-accounting/rights-report.md). Parent rehashed the retained license PDF this session; no new distribution-rights decision or source acquisition was made.

**No validated domain authority is available.** Every endpoint therefore retains `domain/status: unresolved`, `primary: null`. No `domain-only` result is asserted. Unique or tied non-GapMap `mapLeaders` are descriptive native-value leaders only. Carpet/source compartments and bundle overlap cannot promote them to anatomical primaries. Compatible-domain assignment, incompatible-domain fixtures and minimum anatomical support remain future classifier gates, not silently satisfied by this readout.

Sampling is nearest-even at stored first/last points, with no nearest-nonzero fallback, interpolation, warp or measured localization uncertainty. Maps remain 2009c; fibres remain 2009a. Unknown unit codes are retained; common numerical RAS-mm comparison is an assumption. Twenty-seven fixed ±0.5 mm offsets test grid sensitivity, not registration uncertainty. Display-coordinate ±0.05 mm rounding reachability is disclosed but not exhaustively evaluated here.

## Results

| Population | Endpoints | Named-map support | GapMap only | No support |
|---|---:|---:|---:|---:|
| Association | 5,760 | 5,561 | 197 | 2 |
| Short-range contours | 30,000 | 22,255 | 1,331 | 6,414 |
| Total | 35,760 | 27,816 | 1,528 | 6,416 |

All baseline/probe points remained in the map grid. Support does not validate anatomical membership. There are 27,813 unique and three tied non-GapMap leaders; **zero anatomical primaries**. Records retain 150,039 candidate rows across baseline and probe support, including probe-only candidates with baseline zero. Baseline candidate counts range 0–13; the probe union reaches 17. Of 6,416 zero-support endpoints, 310 acquire some support under at least one probe. These are descriptive changes, not corrected labels.

Unordered fibre support pairs partition 17,880: named/named 12,559; gap/named 1,359; named/zero 1,339; gap/gap 83; gap/zero 3; zero/zero 2,537. Baseline native-value sums range 0–1.9921918300437937 across all maps. This observed sum is not a normalized posterior; candidates were not renormalized. Some positive baseline map evidence disagrees with the source fibre-group hemisphere at 688 endpoints; that comparison is not an endpoint anatomical hemisphere diagnosis.

Across nonzero probes, 1,464–3,597 endpoint leader sets change and 182–471 support categories change. No probe leaves the grid. No rule was tuned from these counts. Source/hemisphere/legacy-quality/tract-group strata all partition 35,760 endpoints and 17,880 fibres. Legacy quality remains known 4,916 / ambiguous 4,751 / unknown 8,213, with ambiguous-before-unknown precedence unchanged.

## Reproduction and checks

Private root: `~/.local/share/brain-atlas/endpoint-evaluation-yum14-5-2026-09-07/`. Explicit source root remains `/private/tmp/brain-atlas-yum.14.1-julich-probability-177023`; it is never an implicit fallback in the evaluator. Tests require that retained pinned source root for their real-map fixtures; missing sources fail rather than skip.

Runs **B and C** match complete bytes. A is retained earlier code before an identity-scaling guard; its summary matches, but script identity differs. No output was overwritten.

| B=C output | Bytes | SHA-256 |
|---|---:|---|
| `records.json` | 16,853,934 | `1588eba770c2f3a30e51abb3fbf902757f03841cb88d939a8e1c4f633c2c9f86` |
| `summary.json` | 11,142 | `76f9436dcfa79f216f442c9cc52682efd4dd2605361d30d9dac48f9a55a681aa` |
| `legacy-fibre-endpoints.json` | 476,050 | `b1c358023ab239dbf574f9de68cf5d1e018e08bb6d827b62779297b6642caa26` |

Each full run performs locked environment preflight, source hashes and all-volume parsing. `/usr/bin/time -l`: B 11.52 s, 1,463,664,640-byte maximum RSS; C 12.17 s, 1,463,615,488-byte maximum RSS. These are process-invocation/private offline measurements, **not browser benchmarks**. The 16.85 MB expanded records intentionally repeat per-endpoint unresolved fields and include full evidence. No compact browser budget or readiness is claimed.

Test-first failures observed: evaluator absent; source loader absent; probe sampler absent; runner absent; nonidentity NIfTI scaling not rejected. Corresponding focused checks passed after implementation. Additional fixtures independently check real deep-area/cortical/GapMap maxima, half-voxel boundaries, out-of-grid points, finite/range/form errors, missing inputs, unsafe public/symlink outputs, exact ties, probe-only candidates, null domains/primaries, complete traversal and reversal-invariant summaries. A retained dense scalar oracle exercises all 314 packed leader bits across 27 probes. Final test/build/current-asset gate results live in Beads, avoiding an evidence-document edit after that gate.

Independent read-only review returned no findings: [review.json](review.json), runtime reference `runtime:delegated-results/ca429599-4df0-4b84-8448-5d239d826253/child-0.json`. Reviewer ran the then-five tests; eight independent 314-map/27-probe oracle fixtures; all 318 input hashes and 314 header/value checks; independent 14-endpoint ×314-map ×27-probe sampling; and full record/order/count/summary/null-primary/legacy/canonical-serialization checks. It did **not** independently resample the entire population, certify all real probe aggregates, verify environment identity, perform two full reruns, inspect runtime, or validate anatomy. Parent separately ran B/C and compared complete bytes. No expert anatomical or visual accuracy review is claimed.

## Remaining work and impact

Full Bead remains partial: validated domains, adopted primary/support/tie policy, incompatible/mixed-domain and unsupported-area assignment fixtures, domain-only outcomes, source-bound compact artifact, query/preset/canonical-state migration, accessible UI, distribution terms, browser memory/performance and Chromium/Firefox interaction checks remain unimplemented. Domain-source selection remains related to `brain-atlas-yum.14.6`; no other Bead was recovered during this session. No threshold, map or runtime replacement is approved by these results.

This private research script reuses existing `tools/assets` input/output/environment primitives but adds no production CLI or pipeline. Hence public README, architecture, offline production SPEC, core asset traceability/DATA_LICENSES, lesson validation, notices, dependency locks, security, releases and citation metadata have no changed shipped capability or claim. The new plan specializes only private evaluation; the broader accounting design remains a draft for remaining classifier/migration work. Three unrelated untracked paths were left untouched. No public asset, source redistribution, DSI, push or deployment changed.
