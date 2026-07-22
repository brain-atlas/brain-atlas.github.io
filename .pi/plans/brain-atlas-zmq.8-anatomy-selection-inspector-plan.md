# Anatomy Selection and Cited Inspector Implementation Plan

**Issue:** `brain-atlas-zmq.8` — Add anatomy selection and cited inspector foundation

**Design:** Approved design recorded on `brain-atlas-zmq.8`

**Status:** Implemented

**Approval:** Human approval recorded in the owning Bead on 2026-07-22

**Date:** 2026-07-22

**Branch:** `feature/zmq-8-anatomy-selection-inspector`

**Goal:** Let learners discover and inspect a small, cited set of visible visual-system structures by pointer, keyboard, or touch without creating a label cloud, changing the scene, or weakening scientific disclosure.

**Architecture:** Extend `public/data/entities.json` as the one stable domain catalog with strict inspectable records. `src/ui/anatomy-inspector.js` will validate/project renderer-independent availability, detail, interaction, and tap-intent models. `src/main.js` will add raycasting and a transient inspection material factor on existing objects under `mniGroup`; authored/canonical scene selection remains unchanged and continues through the existing renderer adapter. `src/bootstrap.js` will own the DOM list, short-label preview, responsive inspector, focus restoration, and workspace lifecycle.

**Acceptance Criteria:**
- [x] `region.lgn`, `region.v1`, and `pathway.optic-radiation` are inspectable under their existing stable IDs.
- [x] `landmark.eye-left`, `landmark.eye-right`, and `landmark.optic-chiasm` are stable selection-only IDs owned by the schematic `pathway.anterior` scene entity.
- [x] Mouse hover and DOM focus show the same visual highlight and short label; mouse click or equivalent semantic activation opens details.
- [x] A first raw-canvas touch selects/previews; a second activation of that selection opens details without treating orbit/scroll drags as taps.
- [x] A semantic **Inspect anatomy** list exposes every currently available seeded entity even when WebGL is unavailable.
- [x] Wide details are nonmodal. At compact width they become a focus-contained sheet, lock the background lesson surface, support Escape/Close, and restore the invoking control.
- [x] Details visibly separate established anatomical explanation from what the viewer displays, representation/activity status, material limitations, and citations.
- [x] The inspector adds no association-tract endpoint claims or unsupported region relationships.
- [x] Selection creates no second renderer, transform, scene state, filter path, camera change, or geometry fitting/mutation.
- [x] Atlas/Lesson switching, Back/Return/Exit, import, reduced motion, and no-WebGL paths remain intact.

**Verification Commands:**
```bash
node --test test/catalog.test.js test/anatomy-inspector.test.js test/renderer-adapter.test.js
npm test
npm run build:publish
```

Browser verification additionally follows `scripts/browser/README.md` and runs the new inspector scenario in Firefox and Chromium against a clean static preview, plus the existing workspace regression matrix affected by the shared stage and focus lifecycle.

## Implementation closeout

Implemented on 2026-07-22 with no material deviation from the approved design. The anatomy chooser now collapses while details are open and reopens before restoring a hidden list invoker; this is nonmaterial focus/visual polish within the approved responsive interaction contract.

Current behavior and interfaces are documented in `README.md`, `docs/ARCHITECTURE.md`, `src/lesson/SPEC.md`, `src/ui/SPEC.md`, `docs/SCIENTIFIC_TRACEABILITY.md`, and `skills/user.md`. The implementation reuses the already verified anatomy source set and owner fidelity records. It adds no dataset, package, license, shipped model, transform, association-tract relationship, or third-party notice impact.

Fresh closeout evidence: 139 Node tests passed; `npm run build:publish` passed; the complete development browser matrix passed in Chromium and Firefox; the anatomy scenarios passed in both engines in development and production preview (the intentional production/debug and Firefox/real-touch cases skipped); production home tests passed in both engines; visual checks at 1440×900 and 390×844 found no console errors, root scrolling, horizontal overflow, or production debug hooks. Independent review `20260722-131002-zmq8` found no confirmed or unresolved defects.

---

## Approved interaction and visual decisions

- Continue the current editorial scientific-instrument / restrained utility direction: dark cool surfaces, borders and surface shifts, one teal interaction accent, 4 px spacing rhythm, no new visual system.
- Keep the canvas free of persistent labels. A single short-label control appears only for the current preview/selection.
- Put the equivalent DOM-backed names/actions in one quiet **Inspect anatomy** disclosure within the shared atlas surface. It moves with the existing stage between Atlas and Lesson.
- Do not move the camera when previewing or opening details.
- Treat raw-canvas touch as ambiguous: first tap previews; explicit activation (the revealed label or a second tap on the same entity) opens details. A clearly labelled DOM button is already explicit activation.
- Preserve the authored/canonical `snapshot.selection` axis. Inspection highlight is a transient multiplicative display factor composed with existing visibility and authored-selection material factors, then removed cleanly.
- Keep the inspector outside authored Markdown. Imported lessons cannot provide inspector HTML, claims, IDs, URLs, or behavior.

## Curated data boundary

Add a strict top-level `inspectables` array to `public/data/entities.json`. Each record contains:

- stable inspectable `id`;
- owning canonical scene `entity` ID, which controls availability;
- full and short labels;
- renderer binding (`layer`, `region`, `tract`, or selection-only `landmark`);
- concise established-anatomy description;
- zero or more explicitly supported relationships with target ID, direction, evidence basis, and summary; and
- verified HTTPS anatomy citations.

The owning entity supplies the fidelity ID; inspectable records cannot override it. Relationship `target` must resolve to another inspectable ID and must not equal the source record. Allowed directions are exactly `directed`, `undirected`, and `unknown`; allowed evidence bases are exactly `established-anatomy`, `displayed-dataset`, and `schematic-teaching`.

The detail view composes, rather than copies:

1. anatomy description and supported relationships from the inspectable record;
2. geometry/activity statuses and summaries from `public/data/fidelity.json`;
3. material limitations from that fidelity record;
4. anatomy citations from the inspectable record; and
5. dataset/method sources and licenses from the fidelity record.

Catalog validation must reject duplicate inspectable IDs/bindings, missing owners or relationship targets, self-target relationships, renderer drift for records that reuse a canonical entity ID, unsupported directions/evidence values, and non-HTTPS sources. `createLessonCatalog` derives each frozen inspectable's `fidelity` exclusively from `entitiesById[ownerEntity].fidelity`.

### Seed scope

| Stable ID | Owner | Renderer target | Evidence boundary |
|---|---|---|---|
| `region.lgn` | itself | Jülich region `lgn` | Paired thalamic visual relay; orderly mapping and regulated transmission. Display remains a population-atlas shell. |
| `region.v1` | itself | Jülich region `v1` | Primary visual cortex and retinotopy; do not imply that the shell is an individual functional map. |
| `pathway.optic-radiation` | itself | existing OR layer `or` | Established directed LGN→V1 projection; shown geometry remains population tractography with a mirrored right side and illustrative events. |
| `landmark.eye-left` | `pathway.anterior` | marker `eye-left` | Schematic anchor for the drawn left-eye nasal-retinal path, not measured orbit/retina geometry. |
| `landmark.eye-right` | `pathway.anterior` | marker `eye-right` | Schematic anchor for the drawn right-eye nasal-retinal path, not measured orbit/retina geometry. |
| `landmark.optic-chiasm` | `pathway.anterior` | marker `optic-chiasm` | Schematic midline anchor for nasal-fibre crossing; uncrossed temporal-retinal paths remain explicitly omitted. |

Use only source records already verified and scoped in `docs/SCIENTIFIC_TRACEABILITY.md`: Jülich-Brain, Mason & Erskine 2001, Sherman & Koch 1986, Maciag et al. 2024, Hubel & Wiesel 1962, and Benson et al. 2012. Do not add association-tract relationships; `brain-atlas-zmq.10` owns that evidence work.

## State and control flow

```text
entities.json + fidelity.json
       │
       ├─ createLessonCatalog ── canonical scene entities/snapshots
       │             └────────── strict inspectablesById projection
       │
       ├─ anatomy-inspector pure model
       │    ├─ available IDs from canonical visibility
       │    ├─ anatomy + fidelity detail view model
       │    └─ hover/focus/touch/activation reducer
       │
       ├─ bootstrap DOM
       │    ├─ Inspect anatomy buttons
       │    ├─ short-label preview
       │    ├─ wide panel / compact sheet
       │    └─ focus/workspace lifecycle
       │
       └─ existing main.js renderer
            ├─ raycast existing children of mniGroup
            ├─ emit stable IDs only
            └─ transient material highlight composed with canonical factors
```

The renderer never receives prose, sources, or inspector HTML. Bootstrap never receives Three.js objects or coordinates. The inspectable ID is the only cross-boundary selection identity.

## Task 1: Extend and validate the stable catalog [Independent]

**Context:** `src/lesson/SPEC.md` INV-2/4/8/10 require strict frozen project catalogs and resolved stable IDs. Extend the existing catalog rather than introducing a parallel search/selection registry.

**Files:**
- Modify: `public/data/entities.json`
- Modify: `src/lesson/schema-definitions.js`
- Regenerate: `src/lesson/generated-validators.js`
- Modify: `src/lesson/catalog.js`
- Modify: `test/catalog.test.js`
- Modify: `test-fixtures/lesson-context.js`
- Modify: `src/pathways.js`

**Steps:**
1. Add failing catalog tests for the six exact IDs, frozen `inspectableIds`/`inspectablesById`, owner/fidelity projection, selection-only landmark bindings, relationship resolution, and strict negative cases.
2. Run the focused test and confirm it fails because inspectables are absent.
3. Add the strict inspectable schema and semantic diagnostics. Keep canonical `entityIds` unchanged so lesson visibility snapshots do not gain child landmarks.
4. Add the six curated records and stable IDs on `SPHERES`; do not alter landmark coordinates.
5. Regenerate standalone validators with `npm run generate:lesson-validators`.
6. Run catalog/generated-validator/reference-lesson tests.

**Focused verification:**
```bash
node --test test/catalog.test.js test/generated-validators.test.js test/reference-lesson.test.js
```

**Expected result:** Six inspectables resolve through one frozen catalog; malformed or unsupported records fail before bootstrap or renderer use; lesson snapshot entity IDs and reference content remain unchanged.

## Task 2: Add pure inspector models and modality state [Depends on: Task 1]

**Context:** Keep availability, detail composition, and staged input behavior renderer/DOM-independent under `src/ui/`, consistent with `src/ui/SPEC.md` INV-1.

**Files:**
- Create: `src/ui/anatomy-inspector.js`
- Create: `test/anatomy-inspector.test.js`
- Modify: `src/ui/SPEC.md`

**Steps:**
1. Add failing tests for:
   - visibility-owner filtering and deterministic ordering;
   - detail composition from inspectable + fidelity records;
   - explicit separation of anatomy, geometry, activity, limitations, citations, and licenses;
   - unknown/unavailable records failing instead of receiving defaults;
   - mouse hover versus touch intent, DOM focus preview, explicit activation, first-touch preview, second-touch activation, close/clear behavior;
   - clearing a preview when its owner becomes hidden; and
   - tap-versus-drag threshold decisions.
2. Confirm each RED failure is caused by the missing model/API.
3. Implement minimal deeply frozen plain-data functions with no DOM/Three.js imports.
4. Add new `src/ui/SPEC.md` public-interface, invariant, failure-mode, and test mappings.
5. Run the focused test after each behavior slice.

**Focused verification:**
```bash
node --test test/anatomy-inspector.test.js test/fidelity-view-model.test.js
```

**Expected result:** Input parity and detail content are deterministic, frozen, and testable without a browser or GPU.

## Task 3: Add single-renderer picking and transient highlight [Depends on: Tasks 1–2]

**Context:** `src/main.js` owns all Three.js objects and the one `mniGroup` transform. Raycast only existing selectable roots. Do not convert pointer coordinates into MNI coordinates or add another adapter/filter system.

**Files:**
- Modify: `src/main.js`
- Modify: `test/renderer-adapter.test.js` only if the exported wrapper contract needs a renderer-independent expectation
- Modify: `skills/user.md` for development diagnostics

**Steps:**
1. Use the pure tap/drag helper from Task 2 and test it before renderer event wiring.
2. Tag the three existing schematic marker meshes with their stable landmark renderer IDs and give them independent materials; do not move or reshape them.
3. Build raycast roots from `catalog.inspectablesById`: region groups, `fibreGroup`, and landmark marker meshes. Use the renderer canvas bounding rectangle for NDC and Three.js world matrices already inherited from `mniGroup`.
4. Raycast only currently rendered roots. Use modest line/point thresholds and nearest-hit selection across the six roots.
5. Emit plain `{ id, input }` intents through one wrapper callback. Ignore drag/orbit/scroll gestures and do not prevent OrbitControls or lesson scrolling.
6. Add an `inspection` material factor composed with existing authored-selection and visibility factors. Highlight only the chosen record; clear the previous factor before applying the next. Landmark color change must be accompanied by the textual preview.
7. Expose development-only pick/highlight diagnostics under `window.__view.inspector`; production builds must remove them with the existing `import.meta.env.DEV` guard.

**Focused verification:**
```bash
node --test test/anatomy-inspector.test.js test/renderer-adapter.test.js
npm run build
```

**Expected result:** Existing scene objects are pickable by stable ID and visibly highlighted without changing canonical snapshots, geometry, transforms, camera, or filters.

## Task 4: Add DOM equivalence and responsive inspector [Depends on: Tasks 1–3]

**Context:** `src/bootstrap.js` owns all DOM, focus, panel lifecycle, workspace switching, and no-WebGL behavior. Reuse the current stage and page-lock conventions without simulating canvas or panel clicks.

**Files:**
- Modify: `index.html`
- Modify: `src/bootstrap.js`
- Modify: `src/style.css`
- Create: `scripts/browser/anatomy-inspector.spec.cjs`
- Modify: `scripts/browser/playwright.config.cjs` only if required to include the new file

**Steps:**
1. Add the semantic structure:
   - one short-label button inside the atlas surface;
   - one native **Inspect anatomy** disclosure with a list of semantic buttons; and
   - one external `<aside>` inspector with labelled heading, Close action, and content region.
2. Render only inspectables whose owner is visible in the effective lesson/Atlas snapshot. Refresh after scene activation, Atlas command batches, workspace transitions, reset/Exit, and catalog replacement.
3. Send canvas intents and DOM focus/activation through the same pure reducer. Send resulting stable IDs back to the renderer highlight method when available.
4. Make the preview button the invoker for raw-canvas activation. Preserve the actual DOM invoker for list activation.
5. Render details with safe `createElement`/`textContent` and verified anchor attributes; never use `innerHTML` for curated or imported content.
6. Keep only one details surface open: opening Anatomy closes Model & sources and vice versa without changing workspace history or snapshots.
7. Wide behavior: fixed nonmodal side panel, no `aria-modal`, no background inerting, keyboard can leave the panel.
8. Compact behavior: bottom sheet with `role="dialog"`, `aria-modal="true"`, background inerting, owner-specific page lock, visible-focusable cycling, Escape/Close, exact scroll restoration, and invoker focus restoration. If a workspace transition removed the original invoker, restore focus to the still-connected short-label control or current **Inspect anatomy** summary rather than `document.body`.
9. Close/clear transient inspection before Atlas/Lesson reparenting, lesson replacement, Exit, renderer failure, or hidden-owner changes.
10. Preserve no-WebGL capability: the disclosure and cited details remain usable; only visual highlighting is unavailable.
11. Add browser scenarios for DOM focus parity, canvas hover/click, touch staging, drag rejection, wide/compact focus behavior, scene preservation, visibility filtering, no-WebGL details, and Return/Exit cleanup.

**Focused verification:**
```bash
node --test test/anatomy-inspector.test.js test/workspace-session.test.js test/explore-session.test.js
npm run build
```

**Expected result:** Pointer, keyboard, touch, screen-reader, compact, wide, and no-WebGL users can reach the same six records without losing scene or workspace context.

## Task 5: Update current documentation and scientific traceability [Depends on: Tasks 1–4]

**Context:** Current/public docs change only after behavior lands. Inspector text projects existing reviewed evidence; it must not become a second scientific authority.

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/SCIENTIFIC_TRACEABILITY.md`
- Modify: `src/lesson/SPEC.md`
- Modify: `src/ui/SPEC.md` (initiated in Task 2, finalize here)
- Modify: `.pi/plans/brain-atlas-zmq.8-anatomy-selection-inspector-plan.md` at closeout
- Review/no expected change: `DATA_LICENSES.md`, `THIRD_PARTY_NOTICES.md`, `CITATION.cff`, `AGENTS.md`

**Steps:**
1. Document current controls, modality behavior, no-WebGL access, and starter scope in `README.md`.
2. Document catalog ownership, transient selection overlay, renderer callback boundary, focus/panel ownership, and failure behavior in architecture/specs.
3. Add the runtime anatomy-inspector projection and exact seed source scope to scientific traceability. State that fidelity remains authoritative for displayed representation and that association endpoints remain out of scope.
4. Confirm no new dataset, redistribution term, dependency, release metadata, or contributor invariant was introduced. Record the corresponding no-impact rationale on the Bead rather than editing unrelated authorities.
5. Compare implementation with this approved plan and record any material deviations before marking the plan Implemented.

**Focused verification:**
```bash
rg -n "Inspect anatomy|anatomy inspector|inspectable" README.md docs/ARCHITECTURE.md docs/SCIENTIFIC_TRACEABILITY.md src/lesson/SPEC.md src/ui/SPEC.md
```

**Expected result:** Public behavior and scientific claim ownership are current, while licenses/notices/invariants are changed only if evidence shows an impact.

## Task 6: Full verification and independent review [Depends on: Tasks 1–5]

**Files:**
- Modify only files required by verified findings.
- Store advisory review output under `.pi/peer-runs/brain-atlas-zmq.8/` if retained.

**Steps:**
1. Run focused and full automated tests with fresh output.
2. Run `npm run build:publish` and verify production debug hooks, including `window.__view.inspector`, remain absent with an explicit browser assertion.
3. Use a clean static preview for Firefox and Chromium browser checks. Cover wide, compact, keyboard-only, real touch, 200%-equivalent layout, reduced motion, no-WebGL, renderer failure, Atlas/Lesson Return/Exit, console errors, and one-canvas ownership.
4. Capture wide and compact screenshots showing a preview and opened details without hiding the anatomy or prose.
5. Request independent cold review focused on coordinate/renderer correctness, input/focus parity, scientific claim separation, schema strictness, and lifecycle regressions.
6. Verify each concrete finding against source/tests. Fix only substantiated issues using a new RED→GREEN cycle and rerun affected checks.
7. Record exact commands, outcomes, screenshots, docs/no-impact rationale, and design deviations in `brain-atlas-zmq.8` before closeout.

**Full verification:**
```bash
npm test
npm run build:publish
```

**Expected result:** All automated and browser checks pass without console errors; review has no unresolved high/medium findings; the Bead contains reproducible closeout evidence.

## File conflicts and sequencing

| File | Tasks | Resolution |
|---|---|---|
| `public/data/entities.json` | 1, 5 | Scientific/docs review follows validated catalog implementation. |
| `src/lesson/SPEC.md` | 1, 5 | Implement schema first; document final shipped interface after integration. |
| `src/ui/SPEC.md` | 2, 5 | Add test anchors with the pure module, then reconcile final browser behavior. |
| `src/bootstrap.js` / `src/main.js` | 3, 4 | Renderer callback contract lands before DOM orchestration consumes it. |
| `.pi/plans/brain-atlas-zmq.8-anatomy-selection-inspector-plan.md` | planning, 5/6 | Mark Implemented only after comparison and evidence. |

No implementation task is safe to parallelize in the same checkout because the catalog, renderer wrapper, bootstrap lifecycle, and specs are coupled. Independent peers remain read-only reviewers.

## Risks and controls

| Risk | Control |
|---|---|
| Transparent/overlapping anatomy yields surprising picks | Restrict to six roots, require rendered visibility, use nearest hit and browser checks from representative cameras. |
| Orbit or lesson scrolling opens details | Pure movement threshold, no `preventDefault`, touch staging, and real pointer/touch browser checks. |
| Preview overwrites authored emphasis | Separate transient inspection material factor composed with canonical factors; never dispatch `selection.set` for hover/focus. |
| Shared materials highlight unrelated markers/sides | Clone marker materials; intentionally highlight bilateral region/pathway records as one stable entity. |
| Panel focus or locks leak across workspaces | External inspector, named lock owner, close-before-transition rule, compact focus tests, and invoker connectivity check. |
| Inspector copy drifts from provenance | Compose status/limitations/sources from fidelity records; keep new text to anatomy explanations already scoped in traceability. |
| Seed relationships imply association endpoints | Relationship schema is strict; seed only the established retina/chiasm/LGN/V1 pathway and explicitly exclude association-tract mappings. |
| Catalog extension breaks imported lessons | Inspectables remain project-authored catalog data, not lesson syntax; canonical scene `entityIds` and snapshot schema stay unchanged. |

## Execution Handoff

Plan saved to: `.pi/plans/brain-atlas-zmq.8-anatomy-selection-inspector-plan.md`.

Proceed serially with `test-driven-development`: write and observe each focused RED before production changes. Use `verification-before-completion` before any completion claim, then `requesting-code-review` and `finishing-a-development-branch` for branch readiness. Do not push, merge, or alter the other checkout.
