# Lesson Contract Subsystem

## Purpose

`src/lesson/` turns inert Markdown/YAML lessons and project-authored catalogs into
versioned, immutable, renderer-independent data. It defines the stable seam between lesson authorship, the `src/bootstrap.js`/`src/ui/` presentation layer, and the single shared Three.js renderer.

This subsystem does **not** render Markdown, own scrolling, import files, fetch remote images, instantiate Three.js objects, or change anatomical coordinates. The checked-in and locally imported lesson presentations implement those concerns outside this subsystem: `src/ui/lesson-import.js` composes this parser for bounded validation, while `src/bootstrap.js` owns activation and declared-image DOM presentation.

## Core mechanism

1. `parseLesson(source, catalog)` parses a positioned Markdown AST.
2. Exactly one leading Obsidian-style YAML frontmatter block supplies document
   metadata and visuals. Optional `entryScene` references one authored complete scene
   for a presentation-layer pre-scroll view. Optional `status: draft` is explicit
   authorial lifecycle metadata; v1 accepts no other status claim. Neither field alters
   renderer state shape.
3. Top-level `atlas-scene` fences are the domain-specific Markdown extension and
   supply typed YAML scene directives. Prose before the
   first fence is introduction content; prose after each fence belongs to that scene.
4. Ajv schemas validate syntax and trust-boundary shape. Validators compile during development into checked-in CSP-safe standalone functions; the browser performs no runtime code generation. YAML and Markdown positions become plain diagnostics.
5. Catalog checks resolve stable entity, inspectable, fidelity, visual, and camera IDs. Selection-only landmark records inherit a canonical owner entity and fidelity record without entering scene visibility IDs.
6. Scene directives normalize into complete frozen snapshots.
7. Pure commands return new snapshots. The renderer adapter applies a complete
   snapshot through explicit bindings and verifies captured state.

**Key files:**

- `schema-definitions.js` — strict v1 JSON-schema definitions.
- `generated-validators.js` — checked-in CSP-safe standalone Ajv output; regenerate with `npm run generate:lesson-validators`.
- `schemas.js` — diagnostics-oriented wrappers around the standalone validators.
- `https-formats.js` — shared credential-free HTTPS format check.
- `diagnostics.js` — plain diagnostics and `LessonContractError`.
- `parse-lesson.js` — Markdown/YAML parsing, safety checks, source slicing, semantics.
- `catalog.js` — stable entity/inspectable/fidelity/camera catalog validation and lookup data.
- `scene-state.js` — complete snapshot normalization, freezing, serialization.
- `commands.js` — allowlisted pure scene-state transitions.
- `renderer-adapter.js` — single renderer port; no Three.js dependency.
- `index.js` — supported consumer entry point.
- `public/data/entities.json` — stable scene and inspectable domain IDs to current renderer bindings plus curated anatomy citations.
- `public/data/fidelity.json` — curated geometry/activity disclosure records.

## Public interface

Import consumer APIs from `src/lesson/index.js`.

| Export | Contract |
|---|---|
| `createLessonCatalog(entityManifest, fidelityManifest)` | Validates strict catalogs and returns frozen sorted entity/inspectable/fidelity IDs, presets, and record lookups. Inspectables derive fidelity only from their resolved owner entity. |
| `parseLesson(source, catalog)` | Returns `{ ok: true, value }` or `{ ok: false, diagnostics }`; never returns partial lesson data. |
| `normalizeSceneSnapshot(directive, catalog)` | Expands an author directive to the complete canonical v1 state. Throws `LessonContractError` on invalid shape/reference. |
| `normalizeCanonicalSnapshot(snapshot, catalog)` | Revalidates exact canonical keys and semantics, then returns a new frozen snapshot. |
| `serializeSceneSnapshot(snapshot)` | Produces deterministic JSON for canonical state. |
| `applySceneCommand(snapshot, command, catalog)` | Validates an allowlisted command and returns new frozen state without mutating the prior snapshot. |
| `createRendererAdapter(bindings, catalog)` | Requires all snapshot-axis bindings and returns `{ apply, capture }`; validates before invoking renderer bindings. |

A diagnostic is always plain data:

```text
{ code, message, line, column, path }
```

## Canonical snapshot

A v1 snapshot contains exactly these top-level fields:

- `schemaVersion`
- `camera` — position, target, and allowlisted transition
- `visibility` — complete visible stable-entity list; omitted catalog entities are hidden
- `hemispheres` — global L/R state and bilateral per-entity overrides
- `cutaway` — 0–100 position corresponding to the current clip control
- `material` — tissue opacity 0–1
- `playback` — playing, speed, and settled state
- `selection` — selected entity, emphasized entities, and strength
- `visual` — declared visual and layout
- `controlPolicy` — guided, look, or explore

Inspectable child IDs such as `landmark.optic-chiasm` are catalog/UI identities, not
canonical visibility entities, so they never appear in `visibility.entities`, hemisphere
overrides, or authored `selection`. The scene ID, title, fidelity record IDs, prose, and
source location belong to the normalized scene wrapper, not renderer state. Parsed lesson metadata exposes
`entrySceneId` as either a validated authored scene ID or `null` and `status` as either
`draft` or `null`. Draft is an authorial review lifecycle marker, not evidence about
geometry or activity fidelity. Deciding whether to number an entry scene or display a
lifecycle badge belongs to the presentation layer.

## Invariants

| ID | Invariant | Enforcement | Why it matters |
|---|---|---|---|
| INV-1 | Runtime semantics come only from leading frontmatter and top-level `atlas-scene` fences, never headings, lists, prose length, or code examples. | parser structure + fixtures | Ordinary Markdown remains readable and author intent is explicit. |
| INV-2 | Lessons, catalogs, commands, diagnostics, and snapshots contain only plain JSON-compatible data and are deeply frozen before exposure. | normalizers + tests | State can be serialized, compared, and handed between UI/renderer layers safely. |
| INV-3 | Every normalized scene snapshot contains every canonical axis with explicit defaults and deterministic ordering. | `normalizeSceneSnapshot` + state tests | Re-entry and Explore/Return cannot inherit stale renderer state. |
| INV-4 | Every entity, fidelity, visual, and camera reference resolves through a versioned catalog; independent hemisphere filters require `bilateral` capability. | schema/semantic checks + catalog tests | Content cannot reach renderer internals or imply unsupported controls. |
| INV-5 | Parse/validation failures return diagnostics and no partial lesson. Invalid commands/snapshots fail before renderer bindings run. | result/error contracts + tests | Import and scene changes are non-destructive. |
| INV-6 | Raw HTML and unsafe URL schemes are rejected. Non-`atlas-scene` code fences remain inert text and are never evaluated. | Markdown walk + security tests | Agent-authored lessons cannot execute code or inject DOM. |
| INV-7 | `src/lesson/` imports no Three.js/DOM runtime and performs no coordinate transform. One adapter port applies all state axes without simulating UI events. | structural search + adapter tests | The single-transform rule and renderer separation remain intact. |
| INV-8 | Fidelity records keep geometry and activity statuses separate and reproduce only claims/limitations supported by `docs/SCIENTIFIC_TRACEABILITY.md`. | strict catalog + scientific review | “Data-derived” geometry cannot falsely validate modeled physiology or direction. |
| INV-9 | YAML/schema/semantic diagnostics preserve line, column, field path, and stable code whenever source positions exist. | line-counter/AST tests | Authors can correct lessons without guesswork. |
| INV-10 | Unknown schema versions, object keys, command types, and catalog record shapes are rejected; compatibility is never guessed. | strict Ajv schemas | Contract evolution remains explicit and reviewable. |
| INV-11 | Browser validation uses checked-in standalone functions; runtime validation never requires `eval`, `new Function`, or a relaxed CSP. | generated-validator test + browser CSP smoke | The lesson trust boundary remains compatible with static secure hosting. |
| INV-12 | Optional `entryScene` resolves to exactly one authored scene before presentation; unknown references reject the lesson rather than falling back to scene order. | strict metadata schema + parser semantic test | A topic entry view remains explicit, portable, and independent of tutorial-specific runtime code. |
| INV-13 | Optional lifecycle metadata accepts only `status: draft` in v1 and is preserved as frozen parsed data; absence means no lifecycle claim. | strict metadata schema + parser/reference tests | Draft content is visibly identifiable without title parsing, while untrusted lessons cannot self-assert a trusted reviewed/published state. |
| INV-14 | Every inspectable has a unique stable ID/binding, a resolved canonical owner, owner-derived fidelity, resolved non-self relationship targets, strict evidence/direction vocabulary, and verified-shape HTTPS citations. Child landmarks use only `landmark` renderer bindings and remain outside scene entity IDs. | catalog schema/semantics + tests | Search, canvas picking, DOM equivalence, and cited details share one honest registry without creating a second visibility system. |

## Failure modes

| ID | Symptom | Cause | Required response |
|---|---|---|---|
| FAIL-1 | `lesson.frontmatter.invalid` or YAML diagnostics | Missing/multiple/non-leading frontmatter or malformed YAML | Preserve source; show diagnostics; do not activate. |
| FAIL-2 | `scene.schema.*` | Missing field, unknown key, out-of-range value, or unknown schema shape | Correct the directive; do not add permissive fallback. |
| FAIL-3 | `scene.semantic.unknown-*` | Entity, fidelity, visual, or camera ID is absent from the catalog | Correct content or add a reviewed catalog record; never map by label. |
| FAIL-4 | `markdown.raw-html`, `markdown.unsafe-url`, or `markdown.undeclared-image` | Untrusted HTML/URL/image bypass attempt | Reject the lesson; later UI may not sanitize-and-continue silently. |
| FAIL-5 | `catalog.semantic.*` | Duplicate IDs/bindings, wrong renderer kind, or unresolved fidelity | Fix project-authored manifests before loading lessons. |
| FAIL-6 | `scene.snapshot.invalid-shape` | Consumer supplied partial, extra, stale, or non-v1 canonical state | Re-normalize from a valid directive or migrate through a reviewed version step. |
| FAIL-7 | `renderer.adapter.missing-binding` | Renderer integration omitted a canonical axis | Implement the binding; silent no-ops are forbidden. |
| FAIL-8 | `renderer.adapter.capture-mismatch` | Applied renderer state differs from requested canonical state | Treat as integration drift; do not continue scene orchestration. |
| FAIL-9 | `lesson.semantic.unknown-entry-scene` | Frontmatter `entryScene` does not match an authored scene ID | Correct the metadata or add the intended complete scene; never infer the entry view. |
| FAIL-10 | `lesson.schema.const` at `/status` | Frontmatter claims an unsupported lifecycle value such as `reviewed` or `published` | Reject the lesson; only explicit `draft` is supported until a separately approved trusted publication model exists. |
| FAIL-11 | `catalog.semantic.*inspectable*` | Inspectable owner/target is missing, a relationship targets itself, renderer binding drifts/collides, or a selection-only child is not a landmark | Fix the project-authored catalog before starting the renderer; never infer an owner, target, fidelity, or binding from a label. |

## Decision framework

| Situation | Action | Spec item |
|---|---|---|
| Add a lesson field | Decide whether it is document metadata, scene wrapper data, or renderer snapshot state; update strict schema, normalizer, fixtures, and diagnostics together. Lifecycle fields must not be confused with scientific fidelity. | INV-3, INV-10, INV-13 |
| Add a renderer control | Add one canonical axis/field and one explicit adapter binding path; never invoke DOM controls. | INV-3, INV-7 |
| Add an entity | Add a stable prefixed ID and renderer binding; reference an existing reviewed fidelity record or add one from traceability evidence. | INV-4, INV-8 |
| Add an inspectable | Reuse a canonical entity ID/binding or add a stable selection-only `landmark.*` child with a resolved owner. Add runtime anatomy claims/citations to core traceability, keep representation in the inherited fidelity record, and do not add unsupported tract endpoints. | INV-8, INV-14 |
| Add or revise a lesson teaching claim | Update that lesson's `docs/lessons/*-validation.md` evidence first. Update core traceability and fidelity metadata too only when the displayed representation or its limitation changes. | scientific review |
| Add or revise a runtime representation claim | Update core traceability/citations first, then curated entity/fidelity metadata atomically. | INV-8 |
| Add Markdown presentation | Keep source inert here; implement rendering/sanitization in the UI Bead without weakening parser rejection. | INV-1, INV-6 |
| Change schema version | Add an explicit migration/compatibility decision and tests; do not broaden v1 silently. | INV-10 |
| Need temporary exploration | Apply pure commands to a cloned state and restore the authored complete snapshot on return. | INV-2, INV-3 |

## Testing

Run all contract tests with:

```bash
node --test test/lesson-schema.test.js test/scene-state.test.js \
  test/scene-commands.test.js test/lesson-parser.test.js \
  test/catalog.test.js test/renderer-adapter.test.js \
  test/generated-validators.test.js
```

| Spec item | Primary verification |
|---|---|
| INV-1, INV-6, INV-9 | `test/lesson-parser.test.js` |
| INV-2, INV-3, FAIL-6 | `test/scene-state.test.js` |
| INV-4, INV-8, INV-14, FAIL-5, FAIL-11 | `test/catalog.test.js`, `test/anatomy-inspector.test.js`, and scientific review |
| INV-5, INV-10, INV-12, INV-13 | schema, parser, command, and adapter negative tests |
| INV-7, FAIL-7, FAIL-8 | `test/renderer-adapter.test.js` plus structural `rg` check |
| INV-11 | `test/generated-validators.test.js` plus CSP browser smoke |

Full repository verification remains `npm test && npm run build:publish`.

## Dependencies

| Dependency | Role |
|---|---|
| `unified`, `remark-parse`, `remark-frontmatter` | Positioned Markdown/frontmatter AST parsing |
| `yaml` | Structured YAML parsing and field locations |
| `ajv` | Development-time strict JSON-schema compilation plus small shipped runtime helpers used by generated standalone validators |
| `docs/SCIENTIFIC_TRACEABILITY.md` | Current runtime representation claim/limitation authority |
| `docs/lessons/*-validation.md` | Per-lesson teaching-claim and curriculum-review authority |
| `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md` | Approved interaction/state behavior |
| `.pi/plans/brain-atlas-yum.3-model-fidelity-disclosure.md` | Approved scientific representation-status taxonomy and materiality rule; it does not define lesson lifecycle Draft |

## Non-goals

- No Markdown-to-HTML rendering or author-supplied HTML.
- No scroll/hysteresis controller or lesson presentation shell **inside this subsystem**; those are implemented in `src/ui/` and `src/bootstrap.js`.
- No local import/paste UI or external image fetch **inside this subsystem**; bootstrap/UI consumers may activate only complete validated lessons and may request only their declared HTTPS images after explicit opening.
- No free-explore, raycasting, highlight materials, DOM selection controls, or inspector panel **inside this subsystem**; it supplies only strict stable records consumed by `src/ui/anatomy-inspector.js`, bootstrap, and the single renderer.
- No runtime fitting, anatomy generation, additional coordinate transform, plugin
  system, UI framework, backend, or WebAssembly.
