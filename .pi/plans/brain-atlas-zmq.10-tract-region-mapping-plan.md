# Tract–Region Relationship Mapping Implementation Plan

**Issue:** `brain-atlas-zmq.10` — Research and map tract-region relationships for exploration

**Design:** Approved in `brain-atlas-rgu` on 2026-07-22

**Status:** Implemented and verified locally on 2026-07-22

**Date:** 2026-07-22

**Branch:** `feature/zmq-10-tract-region-mapping`

**Goal:** Replace implied directed tract endpoints with reproducible, explicitly low-confidence undirected endpoint-proximity records that the existing anatomy inspector can distinguish from literature-curated and schematic relationships.

**Architecture:** A pinned offline Python script parses the checked association JSON and Jülich OBJ shells with `json` and `trimesh`, computes exact endpoint-to-triangle surface distances in source RAS millimetres, and emits a checked evidence artifact. The strict entity catalog embeds only relationships that pass the approved bilateral robustness screen; `createLessonCatalog` derives reciprocal inspector projections for undirected records. The existing inspector, single renderer, `mniGroup`, scene snapshots, filters, and activity engines remain the only runtime paths.

**Acceptance Criteria:**
- [x] Five region labels no longer contain tract arrows or imply direction.
- [x] The evidence artifact records input hashes, mixed template provenance, exact method and thresholds, all per-tract/per-region counts, accepted, threshold-sensitive, and rejected outcomes.
- [x] A tract–region relationship is projected only when at least 18 of 180 sampled streamlines in each hemisphere have either endpoint nearest to that hemisphere's region shell within both 3 mm and 5 mm.
- [x] Streamline endpoint order is ignored; every association relationship is undirected, dataset-derived, qualified, and low-confidence.
- [x] Accepted relationships appear from both tract and region inspector details without duplicate authored records.
- [x] Existing early-pathway relationships identify literature-curated or schematic evidence and carry method, sources, status, confidence, and direction metadata.
- [x] All eight association bundles, all qualifying region shells, and superficial white matter are inspectable when visible.
- [x] Superficial white matter has no named region relationship and discloses that no endpoint classification supports one.
- [x] IFOF–OFC remains recorded as threshold-sensitive but is not projected; SLF II–DLPFC remains rejected.
- [x] No geometry, coordinates, activity behavior, camera, filter, runtime transform, browser dependency, or second renderer/adapter changes.
- [x] Public/current docs, lesson disclosure/validation, fidelity, architecture, subsystem specs, and provenance agree with the shipped behavior.

**Verification Commands:**
```bash
uv run tools/map_tract_regions.py --check
node --test test/tract-region-mapping.test.js test/catalog.test.js test/anatomy-inspector.test.js test/generated-validators.test.js test/reference-lesson.test.js
cp src/lesson/generated-validators.js /tmp/generated-validators.before.js
npm run generate:lesson-validators
cmp -s /tmp/generated-validators.before.js src/lesson/generated-validators.js
npm test
npm run build:publish
git diff --check
```

---

## Approved scientific boundary

The generated records describe the checked display only. They are not population probabilities, connection strengths, synaptic terminations, functional pathways, individual anatomy, or evidence of afferent/efferent polarity. Counts come from the displayed deterministic sample of 180 atlas streamlines per tract and hemisphere. The fibre and shell assets retain their documented 2009a/2009c mixed-release RAS-world provenance without an offline warp. Exact nearest-surface assignment uses the decimated displayed region shells, and the bilateral 3/5 mm plus 18-streamline screen is a project curation rule rather than a statistical confidence interval.

Literature supports the general tractography and anatomy context but cannot upgrade a custom Jülich endpoint-proximity observation into a measured connection. The inspector must label the source class explicitly:

- `literature-curated` for established early visual anatomy;
- `displayed-dataset` for the custom association endpoint-proximity screen; and
- `schematic-teaching` for drawn anterior-pathway relationships.

## Task 1: Freeze the mapping contract [Independent]

**Files:**
- Create: `test/tract-region-mapping.test.js`
- Create: `tools/map_tract_regions.py`
- Create: `public/data/tract_region_mapping.json`

**Steps:**
1. Add a failing existence/shape test for the missing generated artifact.
2. Run the focused test and confirm RED because the artifact is absent.
3. Add a PEP 723 script with exact Python package versions for NumPy, trimesh, and rtree; no application dependency changes.
4. Parse `public/data/tracts.json`, `public/data/regions.json`, and all referenced OBJ files with established parsers.
5. Hash every input and validate expected tract, hemisphere, streamline, point, region, mesh, coordinate, and finite-distance shape before mapping.
6. For each endpoint, choose the nearest same-hemisphere displayed region triangle. Count a streamline once per region if either unordered endpoint is nearest and within each screen radius.
7. Emit deterministic JSON with method/provenance, all 3 mm and 5 mm counts, median matched distances, robust relationships, threshold-sensitive records, reviewed legacy hypotheses, and the SWM exclusion.
8. Support `--check` to regenerate in memory and fail on byte drift without rewriting.
9. Run RED→GREEN focused checks and `git diff --check`.

**Focused verification:**
```bash
node --test test/tract-region-mapping.test.js
uv run tools/map_tract_regions.py --check
```

## Task 2: Enrich and reciprocate relationship records [Depends on: Task 1]

**Files:**
- Modify: `src/lesson/schema-definitions.js`
- Modify: `src/lesson/catalog.js`
- Regenerate: `src/lesson/generated-validators.js`
- Modify: `test/catalog.test.js`
- Modify: `src/lesson/SPEC.md`

**Steps:**
1. Add failing catalog tests requiring `method`, `sources`, `status`, `confidence`, and the revised evidence vocabulary on every relationship.
2. Add failing tests that one authored undirected tract→region record appears once in both detail owners, while directed records do not gain an inferred reverse direction.
3. Add negative tests for missing sources, invalid vocabulary, duplicate undirected pairs, explicit reverse duplicates, and unresolved targets.
4. Observe focused RED failures against the current strict schema/catalog.
5. Extend the strict schema and semantic diagnostics.
6. During catalog construction, clone authored relationships, derive one reversed projection only for undirected records, and deep-freeze the deterministic result.
7. Regenerate standalone validators and run focused GREEN checks.

**Focused verification:**
```bash
npm run generate:lesson-validators
node --test test/catalog.test.js test/generated-validators.test.js
```

## Task 3: Publish the conservative catalog projection [Depends on: Tasks 1–2]

**Files:**
- Modify: `public/data/entities.json`
- Modify: `public/data/regions.json`
- Modify: `public/data/fidelity.json`
- Modify: `test/tract-region-mapping.test.js`
- Modify: `test/catalog.test.js`

**Steps:**
1. Add failing assertions for the exact accepted relationship set, five plain labels, all eight tract inspectables, qualifying region inspectables, and SWM with no relationship.
2. Confirm RED against current data.
3. Remove arrow suffixes from STS2, OFC, preSMA, DLPFC, and Broca 44 in both manifests.
4. Add inspectables for all eight association bundles, every robust qualifying region, and `layer.swm`.
5. Embed exactly one authored tract→region record per robust artifact relationship with undirected/data-derived/qualified/low-confidence metadata and verified source links.
6. Upgrade existing early-pathway records to the complete relationship contract.
7. Add material association/SWM fidelity limitations for endpoint-proximity and no-classification boundaries.
8. Make the Node test prove that runtime data cannot drift from the generated artifact.

**Focused verification:**
```bash
node --test test/tract-region-mapping.test.js test/catalog.test.js
```

## Task 4: Project provenance in inspector details [Depends on: Tasks 2–3]

**Files:**
- Modify: `src/ui/anatomy-inspector.js`
- Modify: `src/bootstrap.js`
- Modify: `src/style.css`
- Modify: `test/anatomy-inspector.test.js`
- Modify: `scripts/browser/anatomy-inspector.spec.cjs`
- Modify: `src/ui/SPEC.md`

**Steps:**
1. Add failing pure-model tests for frozen relationship metadata, reciprocal target labels, and relationship-specific source links.
2. Add/update browser expectations for the visibility-filtered expanded inspector and readable dataset/literature/schematic method/status/confidence text.
3. Observe focused RED failures.
4. Project the already validated fields without interpretation or fallback.
5. Render relationship source links with the existing safe DOM helper; keep camera, snapshot, highlight, picker, and focus lifecycle unchanged.
6. Update UI invariants/failure modes and run focused GREEN checks.

**Focused verification:**
```bash
node --test test/anatomy-inspector.test.js test/catalog.test.js
npm run build
```

## Task 5: Reconcile lesson and public scientific documentation [Depends on: Tasks 1–4]

**Files:**
- Create: `docs/TRACT_REGION_MAPPING.md`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/SCIENTIFIC_TRACEABILITY.md`
- Modify: `docs/TRACT_SPACE_PROVENANCE.md`
- Modify: `docs/lessons/retina-to-v1-validation.md`
- Modify: `src/lessons/retina-to-v1.md`
- Finalize: `src/lesson/SPEC.md`
- Finalize: `src/ui/SPEC.md`
- Modify: this plan at closeout
- Review/no expected change: `AGENTS.md`, `DATA_LICENSES.md`, `THIRD_PARTY_NOTICES.md`, `CITATION.cff`, `docs/SECURITY_REVIEW.md`

**Steps:**
1. Document source hashes, exact numeric method, accepted/sensitive/rejected outcomes, citations, assumptions, and known limitations in the mapping record.
2. Replace the pending/unverified endpoint text in current docs with the qualified shipped behavior.
3. Keep the reference lesson's stream claims functional/literature-based while explaining that only a subset of displayed bundle endpoints pass a low-confidence shell-proximity screen and broad SWM remains unclassified.
4. Update lesson validation because its displayed-representation limitation changed; do not turn the endpoint artifact into evidence for functional direction.
5. Record no-impact rationales for licenses, notices, citation identity, security boundary, dependencies, and contributor invariants unless review finds otherwise.
6. Verify every new URL and relative link.

**Focused verification:**
```bash
rg -n "endpoint proximity|literature-curated|displayed dataset|superficial white matter|tract-region" README.md docs src/lesson/SPEC.md src/ui/SPEC.md src/lessons/retina-to-v1.md
node --test test/reference-lesson.test.js test/tract-region-mapping.test.js
```

## Task 6: Full verification, review, and closeout [Depends on: Tasks 1–5]

**Steps:**
1. Run mapping drift, focused, full Node, publication, generated-validator, and static checks with fresh output.
2. Run the anatomy inspector browser scenario and affected production/no-WebGL checks in Chromium and Firefox against clean servers; verify no console errors, one canvas, production debug-hook removal, wide/compact details, and usable scrolling with the expanded visible list.
3. Capture at least one wide and one compact screenshot showing an association relationship's explicit source class/status/confidence without obscuring the scene.
4. Request independent scientific/provenance and implementation/schema review; verify every concrete finding against files/tests.
5. Fix only substantiated findings with a new RED→GREEN cycle and rerun affected checks.
6. Compare implementation with `brain-atlas-rgu`; obtain renewed approval for any material deviation.
7. Mark this plan Implemented, record verification/docs/no-impact evidence in `brain-atlas-zmq.10`, create a verified signed local commit, and close the Bead only when every criterion passes.
8. Do not merge, push, deploy, publish, remove the target worktree, delete branches, or modify the active yum.6 worktree without a separate explicit instruction.

## File conflicts and sequencing

| File | Tasks | Resolution |
|---|---|---|
| `public/data/entities.json` | 2–5 | Schema/catalog first, data projection second, documentation after tests pass. |
| `test/tract-region-mapping.test.js` | 1, 3 | Artifact contract first; add catalog drift assertions after catalog data lands. |
| `src/lesson/SPEC.md` | 2, 5 | Add contract anchors with implementation, then reconcile final behavior. |
| `src/ui/SPEC.md` | 4, 5 | Add model/UI anchors, then finalize documentation impact. |
| `src/lessons/retina-to-v1.md` and its validation record | 5 | Change teaching disclosure and validation atomically after representation data lands. |

The originally active `chore/reproducible-asset-pipelines` worktree was not read from, edited, copied, or merged. That work later landed independently on `main`; after this worktree fast-forwarded, the approved label changes were reconciled with its checked-output manifest under decision `brain-atlas-vat`. The standalone mapping script still owns only its endpoint-proximity artifact.

## Risks and controls

| Risk | Control |
|---|---|
| Nearest surfaces are mistaken for biological terminations | Call every result low-confidence endpoint proximity; report exact method/counts; never say innervation, connection strength, or function. |
| Mixed 2009a/2009c releases are described as one grid | Record common RAS world and no warp; do not claim voxel equivalence. |
| Streamline array order implies polarity | Treat endpoints as an unordered pair; all association records are undirected and reciprocal. |
| Arbitrary threshold looks statistical | Publish both 3/5 mm screens and the 18/180 bilateral curation rule; state it is not a confidence interval or population probability. |
| Decimated surfaces bias assignment | Use exact point-to-triangle distance on the shipped shells; retain low confidence and input hashes. |
| Catalog relation drifts from evidence | Node regression compares every dataset-derived association link with the generated artifact; Python `--check` catches byte drift. |
| Expanded picking/list hurts interaction | Availability still follows visible owners; browser-check pointer, list scrolling, compact focus, and console/performance symptoms. |
| Relationship metadata upgrades representation fidelity | Keep owner fidelity authoritative and display source class/method/status/confidence separately. |

## Closeout record

Implementation matches approval `brain-atlas-rgu`. Two integration details were added without changing the scientific design: exact trimesh surface queries required an explicit SciPy pin, and the independently landed reproducible-asset pipeline required the five label changes to update `tools/assets/manifest.json` under decision `brain-atlas-vat`.

Fresh local evidence: 166/166 Node tests pass; mapping drift, asset manifest, exact current-asset, generated-validator drift, and production builds pass; the targeted anatomy-inspector scenario passes 4/4 in Chromium and 3/3 applicable checks in Firefox (the raw touch path is intentionally Chromium-only); wide and compact screenshots were reviewed; no console errors were observed. Independent Gemma and DeepSeek discovery produced one Important mixed-release allegation and no other findings; a fresh GPT-family verifier refuted that allegation against the source and identity-world evidence. No confirmed or unresolved review findings remain.

Documentation impact was completed in the README, architecture, scientific traceability, tract-space provenance, mapping record, lesson validation, lesson/UI specs, fidelity records, and lesson disclosure. `DATA_LICENSES.md` and `THIRD_PARTY_NOTICES.md` need no change because no new data or shipped dependency was added; `CITATION.cff` needs no change because release identity is unchanged; `docs/SECURITY_REVIEW.md` needs no change because the script is offline-only and the browser trust boundary is unchanged; `AGENTS.md` needs no change because the one-transform and honesty invariants remain intact.
