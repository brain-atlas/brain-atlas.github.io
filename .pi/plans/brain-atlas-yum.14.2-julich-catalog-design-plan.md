# Complete Jülich catalog and lazy regions design/implementation plan

- **Bead:** `brain-atlas-yum.14.2`
- **Status:** **Implemented** — current behavior documented in `README.md`, `docs/PERFORMANCE.md`, and subsystem specs; verification/closeout evidence in Beads.
- **Approval:** `brain-atlas-kaby`, 2026-09-06
- **Date:** 2026-09-06
- **Branch:** `main` at design time (`e34b5621dbcd27d142d03e9cefcb756a0013ce53`)

## Goal

Expose all 157 bilateral base regions from pinned Jülich-Brain v3.0.3 as stable, searchable Atlas entities and optional real meshes without increasing default geometry requests or changing current endpoint-filter results.

## Chosen design

- Parse only licensed dataset inputs: categorical MPM, official 157-structure XML, and partial terminology JSON. Do not copy configuration-authored hierarchy.
- Preserve current 45 renderer/entity IDs and display metadata. Give each additional region one deterministic source-derived renderer/entity ID. Every region records XML identity/name, atlas label, L/R MPM values, `right = left + 1000`, GapMap status, catalog status, and zero/one/multiple validated hierarchy paths.
- Preserve duplicate licensed paths. Mark six XML regions with no licensed hierarchy correspondence as unresolved; invent no edges.
- Keep legacy `public/data/regions.json` and `public/data/entities.json` byte-stable because the endpoint generator pins both inputs. Add versioned `public/data/julich_regions.json` as the complete 157-region catalog plus 314 static OBJ references, then merge its 112 additions into the canonical runtime catalog. `lesson-current` regions remain Atlas defaults and endpoint-filter selectors; `atlas-available` regions start hidden and do not enter endpoint filtering until a later accepted endpoint-accounting change.
- Reuse one `regionGroup`, `mniGroup`, OBJ loader, material, visibility command path, hemisphere policy, and renderer adapter. Additional mesh pairs load only after explicit visibility commands.
- Keep existing utility/scientific dark UI. Add native region search and source-hierarchy group disclosures; no new framework, renderer, transform, or asset format.
- Ship complete OBJ set only if measured default requests remain unchanged and optional/worst-case payload, draw-call, memory, and mobile results remain acceptable and documented.

## Non-goals

- No siibra runtime dependency, live atlas fetch, 2009a→2009c warp, per-dataset fit, mirroring, second renderer/filter state, atlas-version upgrade, probability assignment, endpoint artifact replacement, or preset-count change.
- No inferred hierarchy for missing licensed edges and no non-Jülich domain atlas.
- No deployment, push, release, tag, or merge.

## Interfaces and files

- `tools/assets/manifest.json`, `manifest.schema.json`, `common.py`, `cli.py`, `regions.py`: pin licensed terminology inputs; generate/verify complete catalog and mesh tree in new empty roots.
- `public/data/julich_regions.json`, `public/data/regions/*.obj`: checked complete catalog and 314 bilateral meshes; retain legacy `public/data/regions.json` unchanged.
- `src/lesson/catalog.js`: validate and merge the complete canonical entity vocabulary while leaving pinned `public/data/entities.json` and the filterable subset unchanged.
- `src/ui/explore-session.js`, `src/main.js`, existing styles: default-visible projection and accessible lazy region discovery/loading.
- `test/asset-pipeline.test.js`, `test/catalog.test.js`, `test/explore-session.test.js`: source/catalog/hierarchy/default/filter compatibility contracts.
- `README.md`, `DATA_LICENSES.md`, `docs/ARCHITECTURE.md`, `docs/SCIENTIFIC_TRACEABILITY.md`, `docs/PERFORMANCE.md`, `tools/assets/SPEC.md`, `src/lesson/SPEC.md`, nearest UI spec: landed behavior, provenance, limits, and measurements.

## Execution

### 1. Freeze source/catalog contract

1. Add failing asset tests for exact terminology source pins, 157 records/314 meshes, stable existing IDs, unique new IDs, bilateral label rule, six GapMaps, 151 exact hierarchy names, duplicate-path preservation, and six unresolved hierarchy records.
2. Run focused test and confirm expected failure.
3. Implement minimum ElementTree/JSON parser and extend manifest/CLI/verification contracts.
4. Run focused test green.

### 2. Freeze canonical entity/default behavior

1. Add failing catalog/explore tests: every complete region maps to one entity; status is explicit; Atlas defaults include current 45 only; endpoint selectors remain current 45 plus special selectors; additional IDs are legal in snapshots.
2. Run focused tests red.
3. Extend catalog completion and default snapshot projection using the existing strict entity schema; no schema or validator regeneration needed.
4. Keep checked legacy entity data byte-stable and run focused tests green.

### 3. Add lazy discovery UI

1. Add focused browser/source test where practical for search semantics, hidden defaults, one requested bilateral pair, L/R controls, and no bulk eager load.
2. Update existing panel only: searchable current/additional groups, source hierarchy labels, canonical visibility commands, mesh fetch on explicit enable.
3. Verify keyboard labels, focus, empty search state, and lesson-disabled controls.

### 4. Regenerate and review assets

1. Copy exact hash-verified MPM/XML/hierarchy inputs into an explicit temporary input root.
2. Run checked offline builder into a new empty output root.
3. Verify 314 OBJ files, catalog bytes/tree hash, chirality, qform/sform use, and no runtime transform.
4. Review generated records and replace checked public region outputs manually within approved scope; update manifest output hashes.
5. Confirm existing 90 mesh bytes remain identical where algorithm and metadata permit; record any explained manifest-only difference.

### 5. Measure and document

Measure checked assets and static production build on desktop/mobile emulation:

- catalog and total/per-pair transfer bytes;
- default and one-optional-pair request counts;
- loaded meshes, triangles/draw calls, renderer memory, and JS heap where available;
- initial readiness and optional-pair load time;
- search/toggle usability in Chromium and Firefox.

Update current docs, provenance, terms, architecture/specs, scientific traceability, and performance record. Mark this plan Implemented only after landed behavior matches approval; record deviations in Beads.

## Acceptance criteria

- [x] Complete pinned 157-region/314-mesh catalog uses stable IDs and exact bilateral labels.
- [x] Licensed hierarchy evidence is preserved exactly, including duplicate paths and six unresolved mappings.
- [x] GapMaps are explicit; non-Jülich/unsupported domain coverage is explicit.
- [x] Current lessons/default Atlas/filter presets preserve behavior; additional regions start hidden and load only on request.
- [x] One `mniGroup` transform and real L/R meshes preserve chirality.
- [x] Endpoint vocabulary can reference complete stable entities without changing current endpoint tuples/counts/selectors.
- [x] Static-host, accessibility, payload/GPU/request/mobile checks pass and are documented.
- [x] Public provenance, licenses, README, architecture/specs, and tests agree with shipped behavior.

## Verification commands

```bash
node --test test/asset-pipeline.test.js test/catalog.test.js test/explore-session.test.js \
  test/fibre-endpoint-assets.test.js test/fibre-endpoint-filter.test.js
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python -m tools.assets check-manifest --json
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python -m tools.assets verify-current --repo . --json
npm test
npm run build:publish
CGO_ENABLED=0 go test ./...
git diff --check
```

Browser closeout uses static preview at `http://localhost:5180`, development diagnostics from `skills/user.md`, Chromium and Firefox, desktop and mobile viewport checks, console-error review, and proof screenshots.
