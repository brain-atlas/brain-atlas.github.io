# Lesson Contract Subsystem

## Purpose

`src/lesson/` turns inert Markdown/YAML lessons and project-authored catalogs into
versioned, immutable, renderer-independent data. It defines the stable seam between
lesson authorship, future lesson UI/state orchestration, and the single shared
Three.js renderer.

This subsystem does **not** render Markdown, own scrolling, import files, fetch remote
images, instantiate Three.js objects, or change anatomical coordinates. Those concerns
belong to later UI and renderer bindings.

## Core mechanism

1. `parseLesson(source, catalog)` parses a positioned Markdown AST.
2. Exactly one leading Obsidian-style YAML frontmatter block supplies document
   metadata and visuals.
3. Top-level `atlas-scene` fences are the domain-specific Markdown extension and
   supply typed YAML scene directives. Prose before the
   first fence is introduction content; prose after each fence belongs to that scene.
4. Ajv schemas validate syntax and trust-boundary shape. YAML and Markdown positions
   become plain diagnostics.
5. Catalog checks resolve stable entity, fidelity, visual, and camera IDs.
6. Scene directives normalize into complete frozen snapshots.
7. Pure commands return new snapshots. The renderer adapter applies a complete
   snapshot through explicit bindings and verifies captured state.

**Key files:**

- `schemas.js` — strict v1 Ajv schemas and validators.
- `diagnostics.js` — plain diagnostics and `LessonContractError`.
- `parse-lesson.js` — Markdown/YAML parsing, safety checks, source slicing, semantics.
- `catalog.js` — stable entity/fidelity/camera catalog validation and lookup data.
- `scene-state.js` — complete snapshot normalization, freezing, serialization.
- `commands.js` — allowlisted pure scene-state transitions.
- `renderer-adapter.js` — single renderer port; no Three.js dependency.
- `index.js` — supported consumer entry point.
- `public/data/entities.json` — stable domain IDs to current renderer bindings.
- `public/data/fidelity.json` — curated geometry/activity disclosure records.

## Public interface

Import consumer APIs from `src/lesson/index.js`.

| Export | Contract |
|---|---|
| `createLessonCatalog(entityManifest, fidelityManifest)` | Validates strict catalogs and returns frozen sorted IDs, presets, and record lookups. |
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

The scene ID, title, fidelity record IDs, prose, and source location belong to the
normalized scene wrapper, not renderer state.

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

## Decision framework

| Situation | Action | Spec item |
|---|---|---|
| Add a lesson field | Decide whether it is document metadata, scene wrapper data, or renderer snapshot state; update strict schema, normalizer, fixtures, and diagnostics together. | INV-3, INV-10 |
| Add a renderer control | Add one canonical axis/field and one explicit adapter binding path; never invoke DOM controls. | INV-3, INV-7 |
| Add an entity | Add a stable prefixed ID and renderer binding; reference an existing reviewed fidelity record or add one from traceability evidence. | INV-4, INV-8 |
| Add a scientific claim | Update traceability/citations first, then curated fidelity metadata atomically. | INV-8 |
| Add Markdown presentation | Keep source inert here; implement rendering/sanitization in the UI Bead without weakening parser rejection. | INV-1, INV-6 |
| Change schema version | Add an explicit migration/compatibility decision and tests; do not broaden v1 silently. | INV-10 |
| Need temporary exploration | Apply pure commands to a cloned state and restore the authored complete snapshot on return. | INV-2, INV-3 |

## Testing

Run all contract tests with:

```bash
node --test test/lesson-schema.test.js test/scene-state.test.js \
  test/scene-commands.test.js test/lesson-parser.test.js \
  test/catalog.test.js test/renderer-adapter.test.js
```

| Spec item | Primary verification |
|---|---|
| INV-1, INV-6, INV-9 | `test/lesson-parser.test.js` |
| INV-2, INV-3, FAIL-6 | `test/scene-state.test.js` |
| INV-4, INV-8, FAIL-5 | `test/catalog.test.js` and scientific review |
| INV-5, INV-10 | schema, parser, command, and adapter negative tests |
| INV-7, FAIL-7, FAIL-8 | `test/renderer-adapter.test.js` plus structural `rg` check |

Full repository verification remains `npm test && npm run build:publish`.

## Dependencies

| Dependency | Role |
|---|---|
| `unified`, `remark-parse`, `remark-frontmatter` | Positioned Markdown/frontmatter AST parsing |
| `yaml` | Structured YAML parsing and field locations |
| `ajv` | Strict JSON-schema validation |
| `docs/SCIENTIFIC_TRACEABILITY.md` | Current scientific claim/limitation authority |
| `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md` | Approved interaction/state behavior |
| `.pi/plans/brain-atlas-yum.3-model-fidelity-disclosure.md` | Approved status taxonomy and materiality rule |

## Non-goals

- No Markdown-to-HTML rendering or author-supplied HTML.
- No scroll/hysteresis controller or lesson presentation shell.
- No local import/paste UI or external image fetch.
- No free-explore pop-out, selection renderer, or inspector.
- No runtime fitting, anatomy generation, additional coordinate transform, plugin
  system, UI framework, backend, or WebAssembly.
