# Endpoint-Region Fibre Filtering Implementation Plan

**Issue:** `brain-atlas-zmq.21` — Filter fibres by endpoint region sets
**Status:** **Implemented and verified on the isolated feature branch; not merged**
**Approval:** `brain-atlas-mwd`, 2026-07-22
**Date:** 2026-07-22
**Branch:** `feature/zmq-21-endpoint-region-filtering`

**Goal:** Classify every displayed association/SWM contour's two unordered geometric endpoints against the verified volumetric Jülich MPM, then filter geometry and eligible display activity coherently through one accessible canonical query path.

**Architecture:** A new checked `tools/assets` builder consumes the manifest-pinned Jülich-Brain v3.0.3 MPM plus exact current fibre/catalog inputs and emits one compact versioned endpoint artifact. A renderer-independent JavaScript query module evaluates unordered endpoint sets and exposes bitsets/summaries. The lesson snapshot gains one strict endpoint-filter axis and the existing single renderer adapter applies it to preallocated line/cap geometry, SWM dots, and association contour eligibility; event rates, coordinates, and the one `mniGroup` transform do not change.

## Approved decisions

- Classify against the original volumetric winner-take-all MPM, never simplified display meshes.
- Keep stored endpoint A/B as geometry-array ends only. They are not biological source/destination and are independent of the modeled event direction in `tract_activity.json`.
- Evaluate atlas labels in common RAS-mm world coordinates without claiming voxel-grid equivalence or applying a 2009a→2009c warp.
- Freeze a conservative local assignment rule before visual tuning:
  - nearest nonzero MPM voxel centre must be within **2.0 mm**;
  - a second distinct label within **0.5 mm** of the nearest distance is ambiguous;
  - only the 45 versioned project region entities can become endpoint entity IDs;
  - background/out-of-range, unsupported atlas labels, and mixed supported/unsupported boundary cases remain explicit unknown/ambiguous statuses;
  - no probability is available from the categorical MPM, so the artifact says so rather than fabricating one.
- Use compact tables plus fixed-position endpoint tuples containing status, entity/candidate indices, and distance in hundredths of a millimetre. Status-table metadata supplies method and confidence vocabulary without repeating strings per endpoint.
- Query modes are `all`, `touches-any`, `connects-within`, and unordered `connects-between`. Region selectors may explicitly include `endpoint.unknown` and `endpoint.ambiguous`; ambiguous endpoints never silently match a candidate region.
- Existing canonical global/per-entity hemisphere policy is ANDed with endpoint queries. No second hemisphere state is added.
- A small dedicated `fibre_filter_presets.json` is the strict authored preset catalog; the generated endpoint artifact binds its hash and records computed counts without duplicating preset definitions. The current extrastriate, ventral, and dorsal lesson scenes receive audited presets. A fourth integrated-stream preset is counted, exposed in Atlas controls, and validated for future authored use; this Bead does not add a new curriculum scene.
- Geometry rebuilds occur only when endpoint query state changes. Activity event generation and rates remain unchanged; filtering changes eligible contours, not firing/event density.
- The exact MPM may be downloaded only to a temporary explicit source root from the already manifest-pinned HTTPS URL, then size/hash verified before parsing. It is not added to Git.

## Non-goals

- No fibre-coordinate, tractography, region-mesh, transform, camera, or existing activity-model changes.
- No claim of synaptic termination, connection strength, axonal polarity, individual anatomy, or physiological firing rate.
- No new integrated-stream lesson scene or behavior-driven activity episode.
- No DSI Studio invocation, backend, WebAssembly, second renderer, second filter path, push, merge, deployment, or publication.

## Acceptance criteria

- [x] A deterministic offline command classifies all 2,880 association and 15,000 SWM contours from exact checked inputs and reproduces the checked endpoint artifact byte-for-byte in a new empty output root.
- [x] Every endpoint has a compact known/ambiguous/unknown record with method, distance, confidence/status, source hashes, categorical-probability limitation, and mixed-template provenance.
- [x] Pure tests cover all four query modes, unordered A/B reversal, explicit unknown/ambiguous selectors, empty results, malformed artifacts/queries, and hemisphere filtering.
- [x] Static tract lines/caps, SWM lines/dots, and association activity contour sampling use the same selected fibre masks; event rates do not depend on selected fibre count.
- [x] The 15,000-fibre query plus line-segment rebuild remains interactive under a conservative measured threshold in Node and headed browsers, with timing available in development diagnostics.
- [x] Viewer controls expose keyboard/screen-reader-operable preset, mode, set-A, and set-B selection plus an `aria-live` count/hemisphere/status summary and an undirected-geometry limitation.
- [x] Canonical lesson/Atlas snapshots, commands, Explore/resume state, and the single renderer adapter carry the complete endpoint-filter axis without prose inference or synthetic DOM events.
- [x] Extrastriate, ventral, and dorsal reference scenes no longer show the broad all-15,000 SWM sample; their presets and the integrated-stream preset freeze included/unknown/ambiguous counts and hemisphere policy.
- [x] Public copy, architecture/specs, scientific traceability, tract-space/mapping provenance, fidelity metadata, lesson disclosure, lesson validation, data licenses, asset metadata, and performance documentation agree with the implemented boundary.
- [x] Focused/full Node tests, artifact drift, exact-current asset checks, generated-validator drift, build/publication checks, Chromium/Firefox browser checks, static checks, and independent review pass.

## Closeout evidence

- Fresh generation from the manifest-pinned Jülich-Brain v3.0.3 MPM reproduced `public/data/fibre_endpoints.json` byte-for-byte at SHA-256 `b1c358023ab239dbf574f9de68cf5d1e018e08bb6d827b62779297b6642caa26`; manifest, current-output, and tract-region checks pass.
- The current lesson presets use `touches-any` for extrastriate, ventral, and dorsal because measured `connects-within` populations were too sparse to retain the intended named-tract context. The future-only integrated-stream preset remains unordered `connects-between`. Counts, quality classes, and this deviation are frozen in tests and public disclosures.
- The apparent mobile performance regression was test-harness drift: the feature Playwright config forced ANGLE SwiftShader. A failing-then-passing regression test now prevents software rendering from being forced; the final hardware-backed production profile records 9.2 ms p95 for both direct Lesson and Atlas Home.
- Final verification on `origin/main` `f06094e`: 218 Node tests; Chromium/Firefox focused endpoint tests; broad Chromium 41 passed/4 skipped and Firefox 39 passed/6 skipped before the release-only rebase; production browser 3 passed; ordinary, publication, and standalone builds; CGO-disabled Go tests; validator byte equality; audit; and `git diff --check` all pass.
- Cold review produced three candidate findings; source/spec/browser verification refuted all three. Dedicated asset-review calls timed out without usable findings and are recorded as unavailable rather than counted as a pass.
- No commit, push, merge, deployment, publication, branch deletion, or worktree removal was performed.

## Verification commands

```bash
# Offline artifact and current assets
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python -m tools.assets build endpoints --inputs "$ENDPOINT_INPUTS" --repo "$PWD" --output "$ENDPOINT_OUTPUT"
cmp "$ENDPOINT_OUTPUT/fibre_endpoints.json" public/data/fibre_endpoints.json
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python -m tools.assets check-manifest
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python -m tools.assets verify-current --repo "$PWD"

# Focused and full application checks
node --test test/fibre-endpoint-assets.test.js test/fibre-endpoint-filter.test.js \
  test/scene-state.test.js test/scene-commands.test.js test/renderer-adapter.test.js \
  test/explore-session.test.js test/reference-lesson.test.js
npm run generate:lesson-validators
git diff --exit-code -- src/lesson/generated-validators.js
npm test
npm run build:publish
npm run build:standalone
CGO_ENABLED=0 go test ./...
npm audit --omit=dev
npm audit
git diff --check
```

---

### Task 1: Freeze and generate endpoint classification [Independent]

**Context:** Follow `tools/assets/SPEC.md`: explicit hash-checked inputs, pinned CPython environment, a new empty output root, no implicit download, no writing into `public/`, and no runtime transform. The categorical MPM supports label/distance status but not probability.

**Files:**
- Create: `tools/assets/endpoints.py`
- Create: `test/fibre-endpoint-assets.test.js`
- Create: `public/data/fibre_filter_presets.json`
- Create after verified temporary generation: `public/data/fibre_endpoints.json`
- Modify: `tools/assets/cli.py`
- Modify: `tools/assets/manifest.json`
- Modify: `tools/assets/manifest.schema.json`
- Modify: `tools/assets/SPEC.md`
- Modify: `test/asset-pipeline.test.js`

**Steps:**
1. Add failing structural/unit tests for a missing `build endpoints` command, synthetic categorical-volume boundary cases, compact tuple/status tables, A/B reversal preservation, malformed/nonfinite/out-of-range inputs, and the absent checked artifact.
2. Run the focused test and confirm RED for the missing command/artifact.
3. Implement established-parser loading with nibabel/NumPy/SciPy from the existing lock. Validate MPM forms, integer labels, affine, source size/hash, fibre shapes/counts, finite coordinates, region label offsets, internal input hashes, and exact manifest identities before classification.
4. Implement the frozen 2.0 mm nearest-nonzero and 0.5 mm distinct-label ambiguity rule in RAS world millimetres. Do not map unsupported Jülich labels to the nearest supported entity.
5. Add one strict authored preset manifest with exact extrastriate/ventral/dorsal/integrated queries, labels, descriptions, and hemisphere policies. Emit deterministic compact endpoint JSON containing schema/method/provenance/status/entity tables, exact association/SWM endpoint tuples, aggregate counts, the preset-manifest hash plus computed per-preset counts, and explicit probability/direction limits.
6. Add manifest pipeline/output/rights entries and exact-current verification for both new public data records. The builder writes only generated endpoints to a new empty output root and rejects `public/`; the authored preset manifest is an exact hash-checked repository input.
7. Retrieve the exact 335,280-byte MPM into a temporary input root, verify SHA-256 `3af71c8d467db42d8561115164e0f365b942dfaa3568740ce62846fa3a201aff`, generate to a temporary output root, inspect scientific/count distributions, then add the verified new artifact to `public/data/` without retaining the MPM.
8. Re-run generation and compare bytes to the checked artifact.

**Focused verification:**
```bash
node --test test/fibre-endpoint-assets.test.js test/asset-pipeline.test.js
```

**Expected result:** Synthetic classifications and exact production regeneration pass; all existing fibre geometry payload hashes remain unchanged.

### Task 2: Implement pure endpoint query/index model [Depends on: Task 1]

**Context:** This module is renderer-independent. It treats each endpoint pair as unordered for matching and returns stable per-dataset masks plus auditable summaries. Hemisphere is an input policy, not inferred query direction.

**Files:**
- Create: `src/fibre-endpoint-filter.js`
- Create: `test/fibre-endpoint-filter.test.js`

**Steps:**
1. Add failing tests for artifact validation/indexing; all/touches/within/between semantics; A/B reversal; unknown/ambiguous special selectors; L/R filters; empty sets/results; summary counts; and invalid query/entity/status IDs.
2. Add a production-data integrity test proving endpoint tuple counts/order match `tracts.json` and `swm_fibres.json` exactly.
3. Add a measured performance test over all 17,880 contours, including query mask construction and SWM segment-position rebuild, with a conservative local threshold that catches accidental quadratic work without depending on one fast machine.
4. Implement the smallest immutable query/index API and preallocated segment writer needed by `src/main.js`.
5. Confirm GREEN and preserve zero-copy/linear behavior where practical.

**Focused verification:**
```bash
node --test test/fibre-endpoint-filter.test.js
```

**Expected result:** All semantics and integrity checks pass; production query/rebuild timing stays under the recorded threshold.

### Task 3: Extend the strict catalog and canonical snapshot [Depends on: Tasks 1–2]

**Context:** Read `src/lesson/SPEC.md`. Endpoint filtering must be a complete renderer state axis rather than prose, a second adapter, or a hidden lesson-only path. Snapshot schema version increments deliberately; imported lesson source remains contract v1 and defaults to `all` when no filter is authored.

**Files:**
- Modify: `src/bootstrap.js`
- Modify: `src/lesson/schema-definitions.js`
- Modify: `src/lesson/generated-validators.js` (generated)
- Modify: `src/lesson/schemas.js` if diagnostics require it
- Modify: `src/lesson/catalog.js`
- Modify: `src/lesson/scene-state.js`
- Modify: `src/lesson/commands.js`
- Modify: `src/lesson/renderer-adapter.js`
- Modify: `src/lesson/SPEC.md`
- Modify: `test/catalog.test.js`
- Modify: `test/lesson-schema.test.js`
- Modify: `test/scene-state.test.js`
- Modify: `test/scene-commands.test.js`
- Modify: `test/renderer-adapter.test.js`
- Modify: affected lesson/import/controller/workspace fixtures and tests

**Steps:**
1. Add failing tests for four strict presets, stable region/special selectors, preset-query drift, complete default/custom/preset snapshots, schema-version behavior, commands, capture, and the new required adapter binding.
2. Add negative tests for unresolved/non-region selectors, malformed mode/set combinations, duplicate selectors, preset mismatch, unknown keys, and missing renderer binding.
3. Extend `createLessonCatalog` with the dedicated preset manifest, exactly four frozen endpoint-filter presets, and semantic validation against stable region/special selectors. Bootstrap fetches only this small authored catalog before the WebGL gate; the large generated endpoint tuples remain renderer data.
4. Add optional authored `fibreFilter` preset/custom shape, normalized complete `fibreFilter` state, `fibre-filter.set`, and `setFibreFilter` in deterministic adapter order. Increment the canonical snapshot version and update exact-key checks/fixtures atomically.
5. Regenerate standalone validators and confirm no runtime `eval`/`new Function` path.
6. Update the lesson subsystem spec with new invariants/failure modes and the undirected endpoint/activity-direction separation.

**Focused verification:**
```bash
npm run generate:lesson-validators
node --test test/catalog.test.js test/lesson-schema.test.js test/scene-state.test.js \
  test/scene-commands.test.js test/renderer-adapter.test.js test/generated-validators.test.js \
  test/lesson-import.test.js test/lesson-scene-controller.test.js test/workspace-session.test.js
```

**Expected result:** Every canonical state path carries a validated complete endpoint filter and existing lessons default deterministically to `all`.

### Task 4: Filter the one renderer and add accessible Atlas controls [Depends on: Tasks 2–3]

**Context:** Read `src/ui/SPEC.md` and preserve one renderer, one MNI transform, one canonical command path, and existing object ownership. Query changes rebuild preallocated line/cap buffers; frame updates only skip masked dots/events.

**Files:**
- Modify: `src/main.js`
- Modify: `src/ui/explore-session.js`
- Modify: `index.html`
- Modify: `src/style.css`
- Modify: `src/ui/SPEC.md`
- Modify: `test/explore-session.test.js`
- Create: `scripts/browser/fibre-endpoint-filter.spec.cjs`
- Modify: `scripts/browser/README.md`

**Steps:**
1. Add failing Explore-model tests for canonical endpoint-filter projection and camera-first filter commands.
2. Add a failing browser scenario for preset/custom query controls, keyboard operation, `aria-live` summaries, hemispheres, geometry/cap/dot/activity coherence, zero-result handling, actual rebuild timing, and no console errors.
3. Load the endpoint artifact through a shared checked promise and fail viewer readiness if required data is malformed/missing; semantic no-WebGL content remains available.
4. Keep source polylines stable. Preallocate line/cap buffers, apply one mask to tract lines/caps and activity contour arrays, and one mask to SWM lines/dots. Clear only now-ineligible active rendered impulses; do not restart or rescale the logical event engine.
5. Add native accessible preset/mode/set-A/set-B controls under existing Viewer controls. Dispatch only canonical commands in Atlas mode; display authored state while disabled in Lesson mode. Summaries report selected/total fibres, unknown/ambiguous counts, effective hemisphere policy, and “unordered geometric endpoints—not activity direction.”
6. Expose development-only mask counts and query/rebuild timings under `window.__view`; ensure production build removes them with the existing guard.
7. Update UI invariants/failure modes and run focused checks.

**Focused verification:**
```bash
node --test test/fibre-endpoint-filter.test.js test/explore-session.test.js test/renderer-adapter.test.js
npm run build
```

**Expected result:** All rendered white-matter representations share one filter result; the 15,000-fibre path remains interactive and controls are accessible.

### Task 5: Apply audited lesson presets and synchronize evidence [Depends on: Tasks 1–4]

**Context:** Current broad SWM display is explicitly pre-publication. Replace it only where the checked preset counts and visual/browser review support the highlighted anatomy. Keep functional lesson claims separate from geometric endpoint classification.

**Files:**
- Modify: `src/lessons/retina-to-v1.md`
- Modify: `test/reference-lesson.test.js`
- Modify: `public/data/fidelity.json`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/SCIENTIFIC_TRACEABILITY.md`
- Modify: `docs/TRACT_REGION_MAPPING.md`
- Modify: `docs/TRACT_SPACE_PROVENANCE.md`
- Modify: `docs/lessons/retina-to-v1-validation.md`
- Modify: `DATA_LICENSES.md`
- Review/no expected change: `AGENTS.md`, `THIRD_PARTY_NOTICES.md`, `CITATION.cff`, `docs/SECURITY_REVIEW.md`

**Steps:**
1. Add failing reference tests requiring exact extrastriate/ventral/dorsal preset IDs, no broad-all filter in those scenes, declared integrated preset counts, inherited hemisphere policy, and honest prose.
2. Add the three authored scene presets and replace obsolete “not endpoint-filtered” copy with categorical-MPM method, unknown/ambiguous, mixed-template, and undirected limitations.
3. Inspect all four generated preset distributions. Record included/unknown/ambiguous fibre counts and confirm each current scene retains enough relevant SWM and named-tract geometry to remain legible; do not tune classifier thresholds after viewing.
4. Update current/public architecture, provenance, fidelity, lesson validation, README, and data-license/source records atomically. Verify the existing Jülich license/attribution covers the new derived label assignment; add no new source terms without source verification.
5. Record specific no-impact rationales for contributor invariants, software notices, citation identity, and security boundary unless review finds an actual impact.

**Focused verification:**
```bash
node --test test/reference-lesson.test.js test/fibre-endpoint-assets.test.js \
  test/fibre-endpoint-filter.test.js test/fidelity-view-model.test.js
rg -n "endpoint|unordered|ambiguous|unknown|Jülich" README.md docs public/data/fidelity.json src/lessons/retina-to-v1.md
```

**Expected result:** Current lesson scenes use audited subsets and all scientific/public records state exactly what the endpoint assignment can and cannot support.

### Task 6: Browser verification, independent review, and closeout [Depends on: Tasks 1–5]

**Steps:**
1. Run fresh offline regeneration/drift, focused, full Node, validator, exact-current, ordinary/publication/standalone builds, CGO-free Go tests, audit, and static checks.
2. Run the endpoint-filter browser scenario plus affected anatomy, Explore lifecycle, animation continuity, no-WebGL, compact, and production scenarios in Chromium and Firefox against clean static/dev servers.
3. Capture wide and compact screenshots for extrastriate, ventral, dorsal, custom-between, and zero-result states. Confirm one canvas/context, no horizontal overflow, readable controls/summary, relevant named bundles, and highlighted regions remain legible.
4. Record measured CPU query/rebuild times for all, smallest current preset, custom between, and zero-result filters; confirm frame activity does not scan or rebuild geometry beyond the existing selected-dot/event loops.
5. Request independent scientific/provenance and implementation/performance/accessibility review. Verify every concrete finding against primary files/tests and fix only substantiated issues with a fresh RED→GREEN cycle.
6. Compare implementation with approval `brain-atlas-mwd`; obtain renewed approval for any material deviation.
7. Mark this plan **Implemented**, add verification/docs/no-impact evidence to `brain-atlas-zmq.21`, and close the Bead only when all acceptance criteria pass.
8. Do not commit, push, merge, deploy, publish, remove the worktree, or delete the branch without separate instruction.

## File conflicts and sequencing

| File | Tasks | Resolution |
|---|---|---|
| `public/data/fibre_filter_presets.json` | 1, 3, 5 | Author and hash the preset contract before production generation; later tasks validate/use it but do not duplicate query definitions. |
| `public/data/fibre_endpoints.json` | 1, 2, 5 | Generate once from frozen rules; later tasks may inspect but not hand-edit tuples/counts. |
| `src/main.js` | 4, 6 | Implement once; Task 6 changes only confirmed defects. |
| `src/lesson/SPEC.md`, `src/ui/SPEC.md` | 3–5 | Add implemented contract with code, then reconcile final public/scientific wording. |
| `src/lessons/retina-to-v1.md` | 3, 5 | Schema support first; authored preset changes only after generated counts exist. |

## Stop conditions

Stop rather than guess if the MPM bytes/hash/forms differ, atlas labels do not match the manifest, the fixed classifier leaves a current lesson preset unusable, a second runtime transform appears necessary, exact fibre order cannot be proven, the generated artifact materially exceeds web weight expectations, browser rebuilds are not interactive, or implementation requires changing event rate/direction semantics. Record the blocker/decision in Beads before proceeding.

## Execution handoff

Plan saved to `.pi/plans/brain-atlas-zmq.21-endpoint-region-filtering-plan.md`. Execute with test-driven development and use verification-before-completion before any completion claim.
