# Lesson, Entity, and Scene Contracts Implementation Plan

**Issue:** `brain-atlas-zmq.4` — Define domain-neutral lesson, entity, and scene contracts

**Design:** `.pi/plans/brain-atlas-zmq-ux-requirements-roadmap.md`, `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md`, `.pi/plans/brain-atlas-yum.3-model-fidelity-disclosure.md`

**Date:** 2026-07-21

**Branch:** `feat/lesson-contracts`

**Status:** Implemented by `brain-atlas-zmq.4`

**Authoring decision:** `brain-atlas-1m0` — Obsidian-style YAML frontmatter for
metadata plus explicit domain-specific Markdown content using `atlas-scene` fences

**Goal:** Parse explicit Markdown/YAML lessons into immutable, versioned, renderer-independent lesson and scene data with stable entity/fidelity references, complete deterministic snapshots, actionable diagnostics, and one tested renderer-adapter boundary.

**Architecture:** A small `src/lesson/` subsystem uses established Markdown, YAML, and JSON-schema libraries. Parsing, schema validation, semantic catalog validation, snapshot normalization, and pure command reduction remain independent of Three.js and the DOM. Checked-in project-authored entity/fidelity catalogs bind stable domain IDs to current renderer IDs without placing renderer objects in lesson data. A renderer-adapter port is tested with plain bindings now and wired to the shared Three.js scene by the vertical-slice Bead.

**Implementation record:** `src/lesson/` now owns strict v1 schemas and diagnostics,
Obsidian-style Markdown/YAML parsing, immutable canonical state, pure commands,
stable catalog validation, and the renderer port. `public/data/entities.json` and
`public/data/fidelity.json` bind the current viewer without inventing relationships.
Two domain-distinct fixtures exercise the contracts. The current Three.js viewer is
not wired to lessons under this Bead. The subsystem contract is `src/lesson/SPEC.md`.

**Acceptance Criteria:**
- [x] Ordinary Markdown with YAML frontmatter and explicit `atlas-scene` YAML fences parses into a schema-v1 normalized lesson; headings and lists never imply runtime behavior.
- [x] The normalized object is immutable, plain, JSON-serializable data with introduction prose and ordered scene prose preserved as Markdown source.
- [x] Every scene normalizes to a complete snapshot covering camera/target/transition, visibility, global and per-entity hemispheres, cutaway, tissue opacity, playback, selection/emphasis, active visual/layout, and control policy.
- [x] Stable entity, visual, camera-preset, and fidelity IDs resolve through a versioned catalog; a second non-chiasm tutorial fixture proves contracts are not vision-pathway hard-coded.
- [x] Unknown schema versions, IDs, commands/actions, and keys; `javascript:`, `data:`, `vbscript:`, or non-HTTPS remote media URLs; raw HTML/script/event-handler constructs; duplicate scene IDs; and malformed YAML fail with line/field diagnostics and no partial lesson. Ordinary code fences remain inert prose and are never executed.
- [x] An allowlisted command reducer produces new state without mutating the prior state; snapshots round-trip deterministically through JSON.
- [x] One renderer-adapter interface applies every snapshot axis through explicit bindings and contains no DOM-event simulation, Three.js object serialization, coordinate transform, plugin system, or speculative service layer.
- [x] Current one-transform and scientific-representation invariants remain unchanged; no lesson UI, scroll controller, import surface, or external-image rendering is added under this Bead.
- [x] Runtime parser dependencies and notices are minimal and documented; tests, publication build, production-hook check, docs, and independent review pass.

**Verification Commands:**

```bash
npm test
npm run build:publish
if rg -n '__view' dist/assets/*.js; then exit 1; fi
git diff --check
```

---

## Authoring and normalization decisions

- Obsidian-style YAML frontmatter contains document metadata and declared visuals only.
- `atlas-scene` code fences contain typed YAML scene directives. A fence starts a
  scene; ordinary Markdown after it belongs to that scene until the next scene fence.
- Markdown before the first scene is the introduction. Runtime semantics are never
  inferred from heading levels, list shape, prose length, or link text.
- Author directives may use declared camera presets and concise fields, but
  normalization always emits a complete canonical snapshot with explicit defaults.
- No raw HTML is accepted. Later external images are renderer-created safe DOM `<img>`
  elements from validated metadata, not author-supplied HTML. Markdown rendering and
  DOM sanitization belong to later UI work; this task preserves validated Markdown
  source and AST positions.
- Imported-content activation remains later work. This task returns success/data or a
  complete diagnostic list and never mutates application state.

## Canonical scene snapshot

The exact schema is test-owned, but the normalized shape covers these axes:

```text
camera: position, target, transition kind/duration
visibility: complete ordered visible entity IDs
hemispheres: global L/R plus per-entity L/R overrides
cutaway: normalized 0..100 position (maps to the current clip slider/plane)
material: tissue opacity 0..1 (maps to current `brainMat.opacity`)
playback: playing, speed, restart/settled policy
selection: selected entity or null, ordered emphasized IDs and strength
visual: declared visual ID and allowlisted layout
authoring: guided/look/explore control policy
```

Defaults are centralized, versioned, cloned, and frozen. No `Set`, function, class
instance, DOM node, or Three.js object may appear in a snapshot.

## Allowlisted state commands

Commands are plain user-intent data for later controls, not executable lesson code.
The initial allowlist covers full snapshot replacement and explicit changes to camera,
visibility, hemisphere filters, cutaway, tissue opacity, playback, selection/emphasis,
visual/layout, and control policy. Unknown commands and unknown payload keys fail
validation. Applying a command returns a new frozen snapshot and leaves prior state
unchanged.

## Dependencies

Add the smallest established runtime set needed by this contract:

- `unified` + `remark-parse` + `remark-frontmatter` for positioned Markdown/frontmatter ASTs;
- `yaml` for structured YAML parsing and field locations; and
- `ajv` for strict JSON-schema validation.

The repository is already ESM (`package.json` has `"type": "module"`), matching
these packages. After installation, run a Node ESM import smoke check before writing
contract code. Verify direct and shipped transitive license records from package
metadata/source licenses before updating `THIRD_PARTY_NOTICES.md`.

Do not add a UI framework, Markdown-to-HTML renderer, sanitizer, Gherkin runner, state
library, plugin system, or WebAssembly dependency under this task.

## Tasks

### Task 1: Install parsers and define strict schemas [Independent]

**Context:** Establish versioned schema constants and diagnostic primitives before any parser or state implementation. The approved authoring contract is in the roadmap section “Markdown prose with explicit scene directives.”

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/lesson/schemas.js`
- Create: `src/lesson/diagnostics.js`
- Create: `test/lesson-schema.test.js`
- Modify: `THIRD_PARTY_NOTICES.md`

**Steps:**
1. Install the five approved parser/validator packages with npm so the lockfile records exact transitive versions; verify an ESM import smoke check and package license metadata.
2. Write failing tests for schema version, unknown-key rejection, required metadata, visual types, scene directive shape, URL schemes, and structured diagnostics.
3. Define strict Ajv schemas with `additionalProperties: false` at trust boundaries.
4. Normalize Ajv/YAML/semantic failures to `{ code, message, line, column, path }` plain records.
5. Add runtime parser packages and declared licenses to software notices.

**Focused verification:**

```bash
node --test test/lesson-schema.test.js
```

**Expected result:** Valid schema-v1 examples pass; unknown versions/keys and malformed values produce stable diagnostics.

### Task 2: Implement complete immutable scene state and commands [Depends on: Task 1]

**Context:** Replace the current partial `sceneState.visible` concept with a renderer-independent canonical snapshot. This does not yet replace current runtime state or drive the UI.

**Files:**
- Create: `src/lesson/scene-state.js`
- Create: `src/lesson/commands.js`
- Create: `test/scene-state.test.js`
- Create: `test/scene-commands.test.js`

**Steps:**
1. Write failing tests for complete defaults, preset expansion, canonical ordering, JSON round-trip, deep immutability, and absence of non-plain values.
2. Implement snapshot normalization from validated author directives and a supplied catalog.
3. Write failing tests for every allowlisted command, unknown commands/payload keys, semantic ID checks, and prior-state immutability.
4. Implement the pure command reducer with deterministic output ordering.
5. Test restart/settled playback data without running animation clocks.

**Focused verification:**

```bash
node --test test/scene-state.test.js test/scene-commands.test.js
```

**Expected result:** Snapshots are complete, frozen, serializable, deterministic, and changed only by allowlisted commands.

### Task 3: Parse Markdown/YAML with positioned diagnostics [Depends on: Tasks 1-2]

**Context:** Parse explicit inert directives while preserving ordinary learner prose. Do not infer scenes from headings or render Markdown to HTML.

**Files:**
- Create: `src/lesson/parse-lesson.js`
- Create: `src/lesson/index.js`
- Create: `test/lesson-parser.test.js`
- Create: `test/fixtures/lessons/visual-field-crossing.md`
- Create: `test/fixtures/lessons/frontoparietal-orientation.md`
- Create: `test/fixtures/lessons/invalid-*.md` only when a fixture is clearer than inline source

**Steps:**
1. Write failing tests for frontmatter, introduction slicing, ordered scene slicing, explicit scene fences, and ordinary heading/list neutrality.
2. Parse Markdown with positioned AST nodes and parse each YAML record with line counters.
3. Validate syntax, schema, then semantics; return `{ ok: true, value }` or `{ ok: false, diagnostics }` without partial values.
4. Reject raw HTML/script/event-handler constructs, dangerous or disallowed URL schemes, duplicate IDs, undeclared visuals, unknown entities/fidelity IDs/presets, and unknown command/action keys. Keep ordinary non-`atlas-scene` code fences inert and allowed.
5. Deep-freeze normalized lessons and verify JSON round-trip equality.
6. Ensure the second fixture uses a different entity mix and scene structure so the parser contains no visual-pathway-specific ID logic.

**Focused verification:**

```bash
node --test test/lesson-parser.test.js
```

**Expected result:** Both reference fixtures parse; malicious/malformed inputs fail with correct line/field diagnostics and no partial lesson.

### Task 4: Add stable current catalogs and validate cross-record integrity [Depends on: Tasks 1-3]

**Context:** Stable IDs decouple lesson content from current `layerObjs`, region objects, and Three.js groups. Catalogs describe bindings and fidelity; they do not invent tract endpoints or scientific relationships.

**Files:**
- Create: `public/data/entities.json`
- Create: `public/data/fidelity.json`
- Create: `src/lesson/catalog.js`
- Create: `test/catalog.test.js`
- Test: `public/data/regions.json`
- Test: `public/data/tracts.json`
- Test: `public/data/tract_activity.json`
- Modify: `DATA_LICENSES.md`

**Steps:**
1. Write failing tests for versioning, globally unique prefixed IDs, renderer binding shape, bilateral capability, fidelity references, and camera presets.
2. Use the audited current manifests (45 Jülich region entries and eight association tracts as of this plan) to add project-authored records for current layers/pathways with stable IDs such as `region.lgn` and `tract.ilf`; tests derive expected counts/IDs from the manifests rather than hard-coding the audit count.
3. Add shared fidelity records reconciled line-by-line with the current authority `docs/SCIENTIFIC_TRACEABILITY.md`; do not copy unsupported endpoint claims or turn open provenance gaps into reassuring defaults.
4. Validate every region/tract manifest ID has exactly one catalog binding and every fidelity reference resolves.
5. Keep catalogs plain and web-light; record them as project-authored metadata in the data-license map.

**Focused verification:**

```bash
node --test test/catalog.test.js test/lesson-parser.test.js
```

**Expected result:** Current and second-fixture entities resolve without hard-coded parser cases, and all cross-record references are valid.

### Task 5: Define and test the single renderer-adapter port [Depends on: Tasks 2 and 4]

**Context:** The next vertical slice needs one path from canonical state to the shared renderer. Define that path now without wiring scroll or simulating existing panel clicks.

**Files:**
- Create: `src/lesson/renderer-adapter.js`
- Create: `test/renderer-adapter.test.js`

**Interface:** `createRendererAdapter(bindings, catalog)` returns `{ apply(snapshot), capture() }`; the catalog validates every stable reference before renderer bindings run.
`bindings` must provide explicit `setCamera`, `setVisibility`, `setHemispheres`,
`setCutaway`, `setMaterial`, `setPlayback`, `setSelection`, `setVisual`, and
`setControlPolicy` functions plus plain `capture`. `apply` returns a frozen captured
snapshot on success or throws a contract diagnostic before invoking any binding.

**Steps:**
1. Write a failing fake-binding test proving every canonical snapshot axis is applied exactly once in deterministic order.
2. Require the interface bindings above; unsupported axes are contract errors, never silent no-ops.
3. Validate the complete snapshot and all bindings before any binding is invoked.
4. Return/capture plain state for deterministic re-entry tests; never serialize renderer objects.
5. Leave Three.js binding creation to `brain-atlas-zmq.5`, where the stage and scene controller first consume it.

**Focused verification:**

```bash
node --test test/renderer-adapter.test.js
```

**Expected result:** A complete snapshot applies through one explicit port; failure is atomic and no DOM event or renderer object enters contract state.

### Task 6: Integrate docs, security checks, and review [Depends on: Tasks 1-5]

**Context:** Contract syntax and trust boundaries are public architecture. Current runtime behavior remains unchanged until the vertical slice.

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Create: `src/lesson/SPEC.md`
- Modify: `AGENTS.md` only if new durable invariants are not already covered
- Modify: `.pi/plans/brain-atlas-zmq.4-lesson-contracts-plan.md` status/implementation record

**Steps:**
1. Document authoring syntax, stable catalogs, complete state, adapter boundary, parser dependencies, invariants, failure modes, and explicit non-goals in current docs and `src/lesson/SPEC.md`.
2. Run full tests, publication build, production-hook search, diff checks, and package audit.
3. Verify no `eval`, `Function`, `innerHTML`, script execution, raw-HTML acceptance, non-HTTPS remote media, second coordinate transform, or Three.js import exists under `src/lesson/`.
4. Run model-diverse independent review focused on schema security, deterministic state, diagnostics, scientific registry claims, and over-abstraction.
5. Close the Bead only after current docs, notices, catalogs, tests, and review agree.

**Focused verification:**

```bash
npm test
npm run build:publish
npm audit --omit=dev
if rg -n '__view' dist/assets/*.js; then exit 1; fi
if rg -n "eval\\(|new Function|innerHTML|from ['\\\"]three|import\\(['\\\"]three|new THREE\\.|mniGroup|sceneFromMni" src/lesson --glob '*.js'; then exit 1; fi
git diff --check
```

**Expected result:** All checks and review pass; current viewer behavior and the one-transform contract are unchanged.

## File conflicts

Tasks are intentionally serial because `schemas.js`, catalog semantics, parser
normalization, and the adapter all depend on the canonical snapshot shape. Tasks 3-5
may add independent tests, but they should not execute in parallel against changing
schema files.

## Execution handoff

Plan saved to: `.pi/plans/brain-atlas-zmq.4-lesson-contracts-plan.md`.

Recommended next skill: `test-driven-development` for each behavior task;
`verification-before-completion` before closing `brain-atlas-zmq.4`.
