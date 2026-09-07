# SWM source-compartment audit and curation recommendation

Work `brain-atlas-yum.14.3`, approval `brain-atlas-n401`, 2026-09-07.
This completes source-labelled accounting and a reviewed curation recommendation,
not anatomical certification or permission to replace the asset.

## Decision

**Retain current public geometry and legacy filters. Preserve the new source-named
partitions privately; use them to target independent corroboration.** Do not ship
these classifications, delete fibres, or call the complement “verified cerebral
SWM.” The audit supports a broad-sampling concern; it does not quantify true
anatomical error. [AS-01–AS-05](anatomical-suitability.md) remain operative.

The exact pilot values reproduce without changing the preregistered rules:
**3,391 contours** have a source255 endpoint, **3,447 contours** have any source255
sample, and **4,253 contours** have any sample in source255, source5, subcortical
gray or lateral-ventricle compartments. These are contour counts, not endpoint
sample counts. Source255 contains **6,472 endpoint samples**.

## Population and partitions

All **15,000 contours**, **120,000 stored samples** and **30,000 geometric endpoint
samples** are accounted for. The original eight-point order is retained. No
geometric fitting, interpolation along segments or 2009a→2009c warp occurred.
“All points” means the eight stored samples only.

| Source compartment | Point samples | Endpoint samples | Any-point contours (overlapping) |
|---|---:|---:|---:|
| Background | 210 | 100 | 149 |
| Cerebral white matter (1/2) | 56,609 | 8,826 | 10,918 |
| Lateral ventricle (3/4) | 61 | 29 | 38 |
| Brain-stem source5 | 1,506 | 432 | 406 |
| Subcortical gray incl. hippocampus/amygdala | 2,070 | 637 | 760 |
| Cortical source labels (not tissue ribbon) | 33,349 | 13,504 | 10,048 |
| Cerebellum and Midbrain source255 | 26,195 | 6,472 | 3,447 |
| Outside-grid | 0 | 0 | 0 |
| Unresolved source outcome | 0 | 0 | 0 |

Zero unresolved *source* outcomes does not imply resolved anatomy. In particular,
background is not outside-brain evidence and source255 cannot be split into
cerebellum/midbrain. Every endpoint pair, strict-majority/no-majority and
all-eight-same/mixed partition independently sums to 15,000. There are **1,615**
no-majority contours and **10,204** mixed contours. **3,039** have all eight samples
in source255. The complete pair/majority/all-same tables are retained in the report.

Frozen cross-tabs cover hemisphere, shipped length, 20 mm RAS-centre cells and
legacy quality; every stratum includes the same source counts and target states.
Hemisphere exactly matches the legacy artifact: **7,220 L / 7,780 R**; source255
any-point counts are **1,724 L / 1,723 R**. Length-bin populations are **1,916**
[8,15), **2,597** [15,25), **4,875** [25,40), **5,612** [40,55] mm.
Legacy quality remains **3,576 known / 7,479 unknown / 3,945 ambiguous**. Source255
any-point encounters are **0 / 3,359 / 88** in those respective classes.

## Sensitivity and source-compartment interior evidence

| Target | No baseline hit | Stable-interior hit | Probe-stable hit only | Boundary-sensitive hit only |
|---|---:|---:|---:|---:|
| Source255 | 11,553 | 3,399 | 21 | 27 |
| Broader union | 10,747 | 3,841 | 151 | 261 |

A stable hit has at least one baseline target point that remains inside the target
for every reachable closed ±0.05 mm rounding-cell outcome and all 27 ±0.5-voxel
probes. “Interior” additionally requires that baseline voxel centre to be at least
2 mm from an outside-target voxel centre. The broad target is pooled before EDT.
These are descriptive grid properties—not anatomical confidence or a measured
registration-error bound. A contour can have a stable target hit and other
sensitive samples. Boundary-sensitive-only means no individually stable target
sample; it does not assert that every coherent offset removes the contour's hit.

- Closed ±0.05 mm rounding cells: **2,186 domain-sensitive samples** across
  **1,946 contours**. All reachable cells are enumerated, not just corners.
- Alternate `floor(v+0.5)` rounding: **1,262 source-label sample changes** in
  **1,174 contours**; after pooling, **1,095 domain changes** in **1,027 contours**.
- Full 27 offset probes include baseline: **0–9,890** source-label sample changes,
  **0–8,566** domain sample changes and **0–5,574** affected contours per probe.
- Any-point contour ranges across coherent probes: source255 **3,433–3,459**;
  broader union **4,172–4,422**. These ranges are not confidence intervals.

The large stable-interior source255 population and bilateral distribution argue
against dismissing the entire finding as decimal rounding or a few isolated
boundary voxels. They do **not** prove every source255 assignment is anatomically
correct. Fine exclusions and the combined label remain unresolved.

## Representative encounter inspection

The report deterministically chooses the lowest contour index in each target
state. Parent inspected seven three-plane panels one at a time, using the pinned
T1 and carpet. Each panel marks only the selected stored point projected into its
nearest integer slice and states the signed slice offset; it does not project an
entire path onto a slice. Fixed display window/alpha match the initial probe.

| Contour / point | RAS mm | Source evidence and observed limit |
|---|---|---|
| 11 / 0 | [47.8,-63.3,-38.0] | Source255 interior hit; marked point falls within gross right cerebellar anatomy in all three views. This supports a non-cerebral sampling concern, not a cerebellar subregion or tissue claim. |
| 149 / 2 | [-5.4,-5.1,-5.0] | Source255/deep-gray boundary near central inferior anatomy; grid options include both. Do not describe this source255 encounter as demonstrated cerebellum. |
| 1154 / 1 | [3.9,-17.0,-17.6] | Probe-stable source255 point near the source5/255 interface; no ≥2 mm interior target point. Exact brainstem subdivision remains unverified. |
| 3 / 0 | [-14.7,-38.7,2.0] | Broad-target interior hit in pooled subcortical-gray source39. Image agreement does not establish a named tissue boundary. |
| 47 / 5 | [-29.9,-9.1,-18.5] | Source40 probe-stable-only broad-target encounter in medial/inferior temporal anatomy; pooled source labels include hippocampus/amygdala, not only basal ganglia. |
| 99 / 7 | [-18.2,21.2,6.0] | Source35/WM boundary-sensitive encounter, visibly near green/cyan boundary. No single hard anatomical membership inferred. |
| 0 / 0 | [60.1,10.6,-5.1] | No broad-target hit, peripheral cortical source116. Complement membership does not establish a tissue ribbon or superficial-WM identity. |

Panels remain local in `encounters/` under the evidence root below. These selected
examples illustrate mechanisms, not an unbiased accuracy sample. No expert
anatomical certification is claimed.

## Alternatives and separately tracked work

| Option | Recommendation and consequences | Owner |
|---|---|---|
| Retain geometry; partition privately | Selected. Preserves legacy filter/preset counts and GPU behavior; keeps source limits explicit. Not a new runtime classification. | This audit |
| Cerebral-only derived subset | Not justified from this map alone; would change geometry/filters/lesson populations and could discard valid contours at coarse boundaries. Independent domain evidence first; any replacement needs a new approved implementation. | `brain-atlas-yum.14.6` corroboration; replacement not authorized |
| Rename public layer | Review neutral “short-range tractography contours” and calibrated Model & sources/lesson wording; no silent ID/schema change. Public evidence limitations are documented now, runtime names unchanged. | **`brain-atlas-yum.14.8`** |
| Source retracking | Do not retrack merely to erase this audit. Establish source-bound deterministic generation and independently supported retention first. DSI remains human-run. | Existing **`brain-atlas-yum.13`** |
| Exact recovered-index comparison | Registered recovered TRKs found; pinned GM parent not found in searched local cache/evidence/temp roots. No approximate geometry join. This optional unrounded comparison does not replace displayed-point accounting. | **`brain-atlas-yum.14.7`** |

Independent corroboration of AS-01–AS-05 is explicitly recorded in existing
**`brain-atlas-yum.14.6`** rather than duplicated. All deferred work is outside this
completed displayed-contour accounting scope. Unresolved provenance remains
accepted only under bounded local-audit approval, not cleared for shipping.

## Reproduction, retention and review

Normative numerical rules: `tools/assets/SPEC.md`, INV-15/FAIL-13. Sources and four
public compatibility baselines are frozen in `tools/assets/manifest.json`, pipeline
`swm-domains`. The command verifies the byte-exact environment and all input hashes
before parsing. Reports remain outside `public/`; their extra ~6.5 MB has no GPU or
browser payload cost.

```bash
ROOT="$HOME/.local/share/brain-atlas/swm-domain-audit/brain-atlas-yum.14.3-source-2026-09-07"
# audit-inputs contains only the exact canonical carpet file; NOTICE.txt is in ROOT.
mkdir "$ROOT/audit-new"
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python -m tools.assets audit swm-domains --inputs "$ROOT/audit-inputs" \
  --repo . --output "$ROOT/audit-new" --accept-local-screening-terms
node --test test/swm-domain-assets.test.js
```

`audit-a/` and `audit-b/` contain identical complete output bytes:

| File | Bytes | SHA-256 |
|---|---:|---|
| `swm-domain-records.json` | 6095841 | `a62344ee2e840a26e66358bd905520fcda86fec2c623596a7a919ca46aac47ab` |
| `swm-domain-summary.json` | 406257 | `7878a2660c721970249deee80d3ec014bacd72d593b225f2263e674312e39d00` |

Records preserve every original contour index, eight source labels/domain IDs,
endpoint labels, per-point rounding/grid option masks, frozen strata and target
states. Summary includes all partitions/cross-tabs, every probe, source/method/code
and environment identity, rights and scientific limitations. No raw source volume
or private derived classification is committed or shipped.

Parent independently recounted records with standard-library counters, checked all
stratum denominators and baseline inclusion in option masks, and compared full
bytes. Four focused tests cover ties/negative bounds, finite inputs, unknown labels,
reachable cells, all 27 probes, reversal/strict-majority ties, strata, source hash,
forms/output guards and CLI/legacy quality. RED was observed before implementation;
GREEN after. An independent repository review found no serious issue, independently
checked exact-fraction rounding bounds, all probes, partitions and interior math,
and recommended retain/private-partition rather than automatic exclusion.
Review retention: `runtime:delegated-results/fc29a782-bf64-4dbd-9825-a18cf90d9755/child-0.json`.

Final suite/commit/closeout evidence belongs in the Bead. This report does not claim
release readiness, clinical validity or completion of deferred Beads.
