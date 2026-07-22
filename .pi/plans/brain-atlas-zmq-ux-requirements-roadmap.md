# Spatial Lessons UX Requirements and Roadmap

**Issue:** `brain-atlas-zmq` — Define UX goals and interaction roadmap
**Status:** Approved product roadmap and companion UX/UI baseline
**Design approval:** `brain-atlas-7b8` — approved 2026-07-20
**Delivery amendment:** `brain-atlas-8y7` — approved 2026-07-21
**Date:** 2026-07-20; materially amended 2026-07-21
**Branch:** `main`

**Goal:** Evolve the current visual-pathway viewer into a static, agent-authorable spatial-lesson system for neuroscience without weakening anatomical accuracy, free exploration, mobile capability, or the one-transform architecture.

**Architecture:** One Three.js renderer supports two first-class presentation modes: Lesson and Explore. A Markdown-first lesson document is parsed, sanitized, validated, and normalized into domain-neutral lesson, visual, entity, and scene objects. A scene controller applies deterministic, serializable snapshots through a narrow renderer adapter; vertical scroll selects scenes with hysteresis, while camera and biological/illustrative animations run independently.

**Acceptance Criteria:**
- [x] A learner can paste or import a valid lesson and complete it without an account or backend.
- [x] The retina→chiasm→LGN→optic-radiation→V1 reference lesson works through vertical scrolling and explicit scene controls on desktop and mobile.
- [x] Every lesson can enter a prepared free-exploration state and return to the exact lesson scene.
- [ ] Atlas entities can expose an unobtrusive highlight/short-label preview and explicit cited details through capability-equivalent pointer, keyboard, and touch interactions.
- [x] A lesson remains readable as ordinary Markdown while explicit, typed scene directives provide deterministic machine behavior.
- [x] Wide and compact UI structures, component states, focus behavior, and failure recovery are approved before runtime implementation.
- [x] Lesson scenes preserve the one-MNI-transform and honesty-of-representation invariants.
- [x] Reduced-motion and no-WebGL users receive useful settled/readable alternatives.
- [x] The static publication workflow remains viable; no planned requirement depends on WebAssembly or a service.

**Planned Verification Commands:**
```bash
npm test
npm run build:publish
npm run preview
```

Browser verification must additionally cover console errors, pointer/keyboard/touch paths, reduced motion, responsive layouts, scene re-entry, failed external images, and a no-WebGL/readable-content fallback.

---

## 1. Product definition

`brain-atlas` is a **static interactive spatial-lesson system for neuroscience**, with the visual pathway as its first validated curriculum. It is not permanently scoped to vision, but expansion must occur through stable entity, scene, and renderer contracts rather than speculative generality.

### Primary user

A curious learner or student. The initial concrete user is the project owner preparing for PhD applications and studying vision neuroscience and perception through an agent-assisted Obsidian notebook.

### Core jobs

1. Ask an external agent to author an interactive lesson in a human-readable format.
2. Paste or import that lesson locally and receive clear validation before playback.
3. Read an explanation while anatomical scenes make its spatial relationships concrete.
4. Temporarily leave the narrative to inspect the prepared anatomy freely.
5. Return to the lesson without losing its authored state.
6. In general atlas exploration, discover concise labels and opt into cited descriptions and supported structural relationships.

### Learning outcomes

After a successful lesson, the learner should be able to:

- explain the mechanism and trace it spatially through the anatomy in their own words; and
- identify named structures and relationships by inspecting a prepared scene.

### Non-goals for the first release

- quizzes or assessment scoring;
- learner-created annotations or notebook round-tripping;
- direct Obsidian synchronization;
- accounts, server persistence, or public URLs for pasted lessons;
- arbitrary lesson JavaScript, HTML, CSS, shaders, or renderer plugins;
- continuous scroll-scrubbed camera or biological animation;
- a general-purpose page builder;
- direct authenticated GitHub pull-request creation;
- runtime tractography, meshing, atlas registration, or subject-data processing.

### MVP delivery and scale-out strategy

The releasable MVP is the complete `.4-.9` learning journey: stable lesson/entity/scene contracts, the retina→V1 reference lesson, local paste/import and validation, prepared free exploration, cited entity inspection, and integrated mobile/accessibility/performance hardening. Foundation modules and the first scrolling slice are implementation increments, not a substitute for a functional product.

Build each increment as a thin, usable vertical slice while preserving only the seams needed for near-term expansion:

- new tutorials should primarily add validated content and scene data, not new orchestration code;
- new brain regions should primarily add entity metadata and renderer bindings, not lesson-specific branches;
- lesson, scene, entity, and visual contracts remain domain-neutral while renderer adapters own Three.js details;
- one normalized runtime path serves checked-in lessons, local imports, and the future reviewed library; and
- before declaring a contract stable, exercise it with the retina→V1 lesson plus at least one small second tutorial/entity fixture from another brain region.

Avoid both extremes: do not hard-code the MVP around vision, and do not delay a working MVP for a speculative framework, plugin system, or abstraction without a concrete second use.

## 2. Information architecture

### Lesson mode

Long-form prose is the navigation backbone. The active scene controls one shared visual stage. The atlas is the first visual in an ordered visual rail; declared supplementary images may temporarily become dominant. Every lesson may expose an explicit Explore action.

### Explore mode

The current layer controls remain available as an expert/learner exploration surface, but descriptions are progressively disclosed:

1. pointer hover or keyboard focus: visual highlight plus short label only;
2. touch: first tap selects/highlights and reveals the same label;
3. explicit click, Enter, or touch activation: open a nonmodal details inspector;
4. later: search/catalog uses the same stable entity registry.

### Future Library mode

Reviewed repository lessons may become browsable static content after the local lesson contract and responsive experience stabilize. Library entries must use the same parser and normalized runtime path as pasted lessons.

## 3. Lesson interaction contract

### Scene activation

- One named, keyboard-focusable lesson surface below the fixed topbar owns vertical scrolling; the browser root remains fixed and horizontal travel is forbidden.
- Surface-relative vertical scroll chooses a discrete semantic scene.
- Activation uses stable thresholds, hysteresis, and an insensitive dwell zone.
- Incidental wheel/touch movement inside the active zone does not scrub or restart playback.
- Previous and Next move to vertical scene anchors.
- Restart and Skip operate on the active scene or its named checkpoints.
- Literal horizontal page scrolling is not part of the initial model.

### Scene state

Each scene declares a complete snapshot, not an imperative script:

- active visual and explicit `dominant` or `compact` layout;
- camera position, target, and optional allowlisted transition;
- visible entities and global/per-entity hemisphere state;
- clipping, cortical opacity, and allowlisted emphasis/dimming parameters;
- directed-pathway playback state and speed where biologically valid;
- selected entity and label state;
- camera, filter, and playback permissions;
- optional independently timed animation/checkpoints;
- deterministic re-entry behavior.

The application must not infer layout from prose length. Re-entering a scene restores its authored snapshot. Manual exploration is temporary unless a later explicit authoring feature captures it.

### Control policies

Scenes choose from a small policy vocabulary rather than individual DOM controls:

- `guided`: direct camera/filter manipulation locked;
- `look`: orbit permitted while instructional filtering/emphasis remains locked;
- `explore`: declared orbit/pan/zoom/filter controls available in the pop-out.

The UI must communicate the active policy before the learner attempts a disabled gesture.

### Motion

- Camera transitions and visual activity use their own clocks after scene activation.
- Reduced motion applies the settled state immediately and disables auto-rotation/automatic flow.
- Scroll never represents measured biological time.
- Skip applies the declared settled scene state rather than accelerating animation unpredictably.

## 4. Authoring contract

### Decision: Markdown prose with explicit scene directives

Decision `brain-atlas-1m0` records the user's v1 wording: **Obsidian-style YAML
frontmatter for metadata and domain-specific Markdown for content**. The fenced
`atlas-scene` directive is that explicit domain-specific Markdown extension.

A lesson is one ordinary `.md` document, not a YAML document wrapped in Markdown:

- YAML frontmatter contains only document-wide metadata and reusable visual declarations.
- Normal Markdown contains the learner-facing title, headings, prose, lists, links, and image references.
- A fenced `atlas-scene` block contains a typed YAML scene snapshot. It starts a semantic scene; rendered content after it belongs to that scene until the next scene block.
- Body content before the first scene is the lesson introduction.
- Headings and lists retain ordinary document meaning. The runtime does not infer camera, anatomy, layout, or playback behavior from prose structure.

This hybrid is deliberate. YAML-only would make long-form lessons awkward to read and edit in Obsidian. Inferring runtime behavior from headings or list shapes would create hidden, brittle semantics. Explicit inert fences keep the source readable while giving agents, validators, and reviewers an unambiguous contract. The outer four-backtick fence below exists only so this roadmap can display a literal lesson file containing its own three-backtick scene block.

Literal `lesson.md` example:

````text
---
title: How visual fields cross
schema: 1
status: draft
visuals:
  - id: retinotopy-diagram
    type: image
    src: https://example.org/retinotopy.png
    alt: Diagram showing nasal and temporal retinal fields
    caption: Visual-field projection before the chiasm
    credit: Example Author
    source: https://example.org/source
---

# How visual fields cross

This lesson follows retinal fibres from the eyes to V1.

```atlas-scene
id: chiasm
visual: atlas
camera: lateral
show: [anterior, lgn]
controls:
  mode: look
layout: dominant
```

## Crossing at the chiasm

Nasal retinal fibres cross at the optic chiasm…
````

### Validation and trust boundaries

- Use established YAML, Markdown, schema, and sanitization libraries.
- Reject unknown schema versions, entity IDs, actions, and URL schemes.
- Never evaluate lesson text as JavaScript or inject untrusted raw HTML.
- Report line/field diagnostics without partially mutating the active scene.
- Normalize all input into immutable plain data before it reaches the renderer.
- Require alt text, caption, credit, and source for salient supplementary visuals.
- Keep anatomical claims and data provenance in the project-curated entity registry, not duplicated freely in every lesson.

### Lesson lifecycle status

Decision `brain-atlas-1w8` permits the first complete MVP to include unfinished
curriculum only when it is visibly and structurally marked Draft. In v1, optional
frontmatter `status` accepts only the literal `draft`; the parser preserves it as
immutable metadata and every lesson identity surface renders `[DRAFT]`. Omission makes
no lifecycle claim. A local/imported lesson cannot self-assert `reviewed` or `published`
until a separately approved trusted publication model exists. Draft describes
curriculum review state and must never be merged with geometry/activity fidelity.
Removing it from the retina-to-V1 lesson requires explicit approval through
`brain-atlas-zmq.25`.

### Model-fidelity disclosure

Scientific traceability must be easy to find without competing with the spatial lesson:

- Keep a quiet, persistent **Model & sources** affordance beside the active visual rather than burying it in settings or documentation.
- Inside that disclosure, show separate concise statuses for geometry and behavior, for example **Data-derived geometry · Modeled activity**. Do not duplicate them in a canvas badge, persistent stage row, or global progress/status strip; a single badge cannot honestly describe mixed representations.
- When a representation category first matters in a lesson, show a short contextual model note; do not repeat warnings in every scene.
- One click/tap or keyboard activation opens the method, citations, assumptions, uncertainty, limitations, and material known gaps while preserving scene context.
- Distinguish intentional design decisions from known gaps. Flag an open gap only when it could materially alter interpretation, confidence, or intended use, or when higher-fidelity work is planned.
- Apply the same disclosure taxonomy to desktop, touch, reduced-motion, and no-WebGL presentations.

Beads epic `brain-atlas-yum` owns the cross-project scientific-fidelity and traceability audit. The approved disclosure design in `.pi/plans/brain-atlas-yum.3-model-fidelity-disclosure.md` is a dependency of the lesson/entity contract so provenance is part of the data model rather than late UI copy.

### External images

The current CSP permits only self/data/blob images (`index.html:5`). Supporting linked lesson images requires an intentional HTTPS image policy. Use DOM images rather than WebGL textures unless a future scene genuinely requires texture manipulation; this avoids unnecessary CORS coupling.

Requirements:

- HTTPS-only remote sources;
- `referrerpolicy="no-referrer"` and lazy loading;
- reserved dimensions/aspect ratio to prevent layout shifts;
- visible caption, credit, and source link;
- accessible fallback to the source link when embedding fails;
- no remote scripts, styles, iframes, or arbitrary fetch actions.

## 5. Runtime boundaries

### Stable boundaries worth extracting

The existing all-in-one runtime remains reasonable, but the lesson subsystem introduces independent interfaces that justify modules:

- lesson parsing, sanitization, and validation;
- normalized scene state and pure transition logic;
- scroll/scene controller;
- renderer adapter that applies scene state;
- entity metadata/selection;
- lesson presentation shell.

Do not introduce a UI framework, global state library, service layer, or plugin system merely to reduce `src/main.js` line count.

### Scene state gap

Current `sceneState.visible` is only a partial substrate (`src/main.js:540-559`):

- a `Set` requires normalization before JSON serialization;
- camera/target, hemispheres, per-entity sides, clipping, opacity, flow, speed, selection, visual layout, and control policy live elsewhere;
- applying scene state directly through current UI event handlers would create drift.

The foundation task must define one complete plain-data snapshot and a renderer adapter before scroll orchestration is added.

### Entity registry

Use stable domain-neutral IDs with renderer-specific bindings. Curated records should distinguish:

- displayed dataset fact and provenance;
- general anatomical description supported by literature;
- schematic, mirrored, simulated, or illustrative status;
- structural relationship directionality (`directed`, `undirected`, or unknown);
- relationship derivation (dataset endpoint mapping versus literature-curated claim);
- confidence/status and citations.

Current region/tract manifests provide IDs and geometry metadata but do not establish defensible region-to-region endpoint relationships. Those require separate offline mapping/research work.

## 6. Responsive and accessibility requirements

Capability parity does not mean identical layouts or gestures.

### Desktop

- prose beside a sticky visual stage;
- narrow ordered visual rail;
- hover/focus highlight plus short label;
- side inspector where space permits;
- drag/orbit only when the scene policy allows it.

### Mobile/touch

- stacked or compact sticky visual stage;
- horizontal/compact visual selector rather than a narrow desktop rail;
- first tap selects/highlights; explicit activation opens details;
- bottom-sheet inspector and full-screen exploration;
- no scroll trapping or accidental WebGL wheel/touch capture.

### Baseline

- semantic headings, landmarks, buttons, labels, and status/error announcements;
- visible focus, logical focus order, and full keyboard scene navigation;
- focus trapping/restoration and Escape behavior for pop-outs;
- no essential hover-only information;
- reduced-motion settled scenes;
- prose and alt/caption/source content remain usable when WebGL is unavailable;
- touch targets and text remain readable without overlapping fixed panels.

The current mobile rules only reposition fixed overlays (`src/style.css:115-120`), and several current sliders/generated tree controls lack robust accessible names or keyboard semantics (`index.html:43-45`, `src/main.js:570-599`). Treat those as foundation gaps, not acceptable lesson behavior.

## 7. UX and UI specification strategy

Product requirements, interface design, and verification need different forms of documentation:

1. **This roadmap** owns user outcomes, system boundaries, representation invariants, and sequencing.
2. **The companion UX/UI specification** at `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md` owns end-to-end journeys, wide/compact layout anatomy, interface surfaces and states, focus/input behavior, visual direction, and failure recovery.
3. **Annotated wireframes and state matrices** judge hierarchy, responsive composition, control discoverability, and visual states. These concerns should not be forced into prose scenarios.
4. **Selective BDD-style scenarios** specify deterministic, user-observable behavior such as scene hysteresis, non-destructive validation, Explore/Return restoration, reduced motion, input parity, and failed-media recovery.
5. **Automated and visual checks** implement those requirements at the appropriate layer: pure tests for parsing/state, browser tests for interaction/focus, and screenshot plus human review for spatial legibility and polish.

BDD is appropriate for the stateful interaction contract, but not as the sole UX or QA method. Do not add Cucumber or a Gherkin runner merely to adopt the notation. Keep the reviewed scenarios in the UX/UI specification, then map stable behavior to ordinary unit or browser tests. Visual hierarchy, anatomical readability, responsive balance, animation quality, and performance still require annotated designs, browser screenshots, measurements, and human review.

Design gate `brain-atlas-zmq.15` must be approved before the lesson/entity contract in `brain-atlas-zmq.4`. This prevents schema and renderer work from silently inventing unresolved interface behavior.

## 8. Static hosting and WebAssembly decision

### Decision: remain static

The planned workflow needs only static assets and client-side computation:

1. accept local text/file input;
2. parse, sanitize, and validate it;
3. normalize it into lesson/scene data;
4. apply scene state to the existing Three.js renderer;
5. render Markdown and linked DOM images.

No account, database, private API key, server rendering, or content service is required.

### Decision: do not use WebAssembly

WASM does not improve DOM layout, Markdown rendering, scroll state, camera interpolation, Three.js GPU submission, or ordinary raycasting enough to justify another runtime/toolchain.

Reconsider WASM only if the project intentionally moves heavy offline neuroimaging work into the browser, such as:

- NIfTI decompression/resampling or subject-to-template transforms;
- marching cubes or mesh decimation over large uploaded volumes;
- large tract-file parsing/spatial indexing or tractography;
- computational simulations that cannot be precomputed or shader-driven.

The project currently requires these operations to remain offline. A flatmap morph, shader-based SWM vibration, lesson library, and atlas inspector do not require WASM.

## 9. Idea triage

| Category | Ideas |
|---|---|
| Good and relatively easy | Declarative scene snapshots; Back/Next/Restart/Skip; first retina→V1 lesson; reduced-motion settled states; actionable paste validation. |
| Good and moderate | Responsive scrolling stage; visual rail; remote image policy; deterministic camera transitions; contextual control policies; free-explore pop-out. |
| Good and hard | 3D selection/inspector; mobile gesture polish; cited entity content; tract-to-region endpoint mapping. |
| Later | Static reviewed lesson library; entity search/catalog; canonical lesson export; optional backend-free GitHub contribution handoff. |
| Avoid | Continuous scroll-scrubbing; literal horizontal page scrolling; arbitrary executable lesson code; automatic layout guessing; hover-only facts; direct Obsidian sync or GitHub OAuth in MVP; runtime tractography/meshing. |

## 10. Association-tract activity policy

The original review made two observations: `src/main.js:389-411` advances association-tract points monotonically from streamline parameter 0→1, and HCP/DSI streamline point order does not measure soma-to-terminal polarity. Those observations still stand. The earlier conclusion that association-tract activity must remain direction-neutral in all future designs was superseded by decisions `brain-atlas-m9k` and `brain-atlas-sh7`.

The approved policy is:

- never present streamline array order as measured biological direction;
- prefer cited source→endpoint probability estimates when defensible evidence exists;
- permit an explicitly labelled symmetric 50/50 stochastic model when direction evidence is absent;
- keep geometry provenance separate from activity-model provenance; and
- disclose methods, assumptions, uncertainty, limitations, and material gaps without making the primary lesson unusably warning-heavy.

P0 bug `brain-atlas-zmq.2` removed the unlabelled array-order travel as an interim correction. The approved specification `.pi/plans/brain-atlas-yum.2-association-impulse-model.md` and completed runtime Bead `brain-atlas-zmq.16` superseded that interim texture with seeded inhibited impulses whose direction is sampled per event from explicit bilateral 50/50 metadata. Streamline order remains non-polar; timing and direction assumptions are disclosed. The optic radiation and schematic anterior pathway remain independently justified directed cases, while superficial WM/U-fibres retain bounded zero-mean vibration.

## 11. Sequenced work graph

| Order | Bead | Priority | Outcome | Dependencies |
|---:|---|---:|---|---|
| 0a | `brain-atlas-zmq.2` | P0 | Remove unlabelled array-order travel using the current direction-neutral fallback. | None |
| 0b | `brain-atlas-eoa` | P3 | Complete pending Three.js/Vite API migration before overlapping runtime work. | None |
| 0c | `brain-atlas-yum.1` | P1 | Inventory scientific claims, models, sources, assumptions, and limitations. | None |
| 1a | `brain-atlas-yum.2` | P1 | Define the evidence-informed association-direction probability model and 50/50 fallback semantics. | `yum.1`, `zmq.2` |
| 1b | `brain-atlas-yum.3` | P1 | Design unobtrusive progressive model-fidelity disclosure. | `yum.1` |
| 2 | `brain-atlas-zmq.15` | P1 | Approve lesson journeys, responsive UI anatomy, interface states, and selective BDD scenarios. | `yum.3` |
| 3 | `brain-atlas-zmq.4` | P1 | Define domain-neutral lesson/entity/scene contracts and tests. | `zmq.2`, `eoa`, `yum.3`, `.15` |
| 4 | `brain-atlas-zmq.5` | P1 | Build the retina→V1 scrolling vertical slice from a checked-in contract-valid Markdown lesson. | `.4` |
| 5 | `brain-atlas-zmq.6` | P1 | Add local Markdown paste/import, sanitization, validation, and linked images. | `.5` |
| 6 | `brain-atlas-zmq.7` | P1 | Add scene-controlled free-exploration pop-out. | `.6` |
| 7 | `brain-atlas-zmq.8` | P2 | Add selection and cited inspector foundation with starter entities. | `.7` |
| 8 | `brain-atlas-zmq.9` | P1 | Harden integrated mobile, accessibility, fallback, and performance behavior. | `.8` |
| 9a | `brain-atlas-zmq.10` | P2 | Research/map defensible tract-region relationships. | `.8` |
| 9b | `brain-atlas-zmq.12` | P3 | Add entity search/catalog over shared metadata. | `.8` |
| 10 | `brain-atlas-zmq.11` | P3 | Publish a reviewed static lesson library. | `.6`, `.9` |
| 11 | `brain-atlas-zmq.13` | P4 | Add canonical export and optional safe GitHub contribution handoff. | `.11` |

## 12. Task execution guidance

### UX/UI design gate (`brain-atlas-zmq.15`)

Review `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md` before implementation. Refine its annotated wide/compact structures, state matrix, visual direction, and behavior scenarios until they are sufficient for `.4-.9` to cite without inventing interactions. BDD remains selective requirements notation; do not add a dedicated runner unless later automation demonstrates a concrete need.

### Foundation (`brain-atlas-zmq.4`)

**Likely files:**
- Create: `src/lesson/` modules for schema, parsing, normalized state, and pure transitions.
- Create: focused tests under a project-standard test directory.
- Modify: `package.json` for a documented test command and minimal established parser/validator dependencies.
- Modify: `src/main.js` only through a narrow renderer adapter.

Use test-driven development. Keep state objects plain and renderer-independent. Do not put Three.js objects, DOM nodes, functions, or Sets in serialized lesson state.

### Vertical slice (`brain-atlas-zmq.5`)

**Likely files:**
- Create: a checked-in reference lesson object/content fixture.
- Create: scroll/scene controller and lesson presentation modules.
- Modify: `index.html`, `src/style.css`, and the renderer adapter integration in `src/main.js`.

Build desktop and mobile interaction paths together. Use one WebGL renderer; do not instantiate one brain per visual-rail entry.

### Import and external visuals (`brain-atlas-zmq.6`) — Implemented

`src/ui/lesson-import.js` composes the existing strict parser/presentation path rather
than adding a second parser. The header modal stages bounded local paste or `.md` source,
reports non-destructive positioned diagnostics and a lifecycle/scene/image/host preview,
and activates only through explicit **Open lesson**. Source remains memory-only and
reuses one controller, renderer adapter, canvas, and catalog extended only with validated
lesson visual IDs.

Declared credential-free HTTPS images render as attributed semantic DOM figures after
activation, never as WebGL textures. Wide split, compact selection, no-WebGL, renderer
failure, image retry, no-referrer loading, responsive stage aspect, invalid/malicious
source, repeated import, and production behavior were verified in Firefox and Chromium.
See `.pi/plans/brain-atlas-zmq.6-local-lesson-import-plan.md` for implementation evidence.

### Explore (`brain-atlas-zmq.7`) — Implemented

Header **Explore atlas** opens the project-authored complete-atlas default; stage
**Explore this scene** starts from the active effective filters and exact rendered
camera. One native full-viewport dialog reparents the existing stage, canvas, Viewer
controls, and Model & sources. Its temporary complete canonical snapshot routes retained
panel edits through allowlisted commands and the one renderer adapter. Full orbit, zoom,
pan, filters, semantic camera buttons, and responsive wide/compact layouts remain
temporary. Return/Escape reapplies the immutable authored scene and restores exact lesson
scroll and invoking focus. No-WebGL and renderer failures hide Explore actions. See
`.pi/plans/brain-atlas-zmq.7-shared-explore-surface-plan.md` and
`scripts/browser/README.md` for design and replayable Firefox/Chromium checks.

### Inspector (`brain-atlas-zmq.8`)

Build selection and highlighting on the same renderer-command and stable-entity-ID
boundaries. Do not simulate clicks, mutate anatomical geometry, or introduce another
coordinate transform.

### Hardening (`brain-atlas-zmq.9`)

Do not postpone basic semantics or responsive design until this task; each preceding task must meet its own accessibility acceptance. This task is the integrated verification and performance gate before declaring the first lesson release-ready.

## 13. File conflicts and execution strategy

Complete design gate `brain-atlas-zmq.15` before runtime work. Most core tasks will then touch `src/main.js`, `src/style.css`, and lesson modules. Execute `brain-atlas-zmq.4-.9` serially in dependency order rather than parallel worktrees. Content research (`.10`) and search design (`.12`) may proceed in parallel after the inspector contract stabilizes, provided they do not edit the same entity registry simultaneously.

Before each structural child Bead, create an issue-specific implementation plan if its final file boundaries or migration steps are not already obvious from the source at that time.

## 14. Documentation impact

- This file is the approved product design/roadmap source.
- `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md` is the approved implementation-facing UX/UI and behavioral acceptance source.
- `.pi/plans/brain-atlas-yum.3-model-fidelity-disclosure.md` is the approved taxonomy, materiality, state, and interaction source for **Model & sources**.
- Keep `README.md` and `docs/ARCHITECTURE.md` describing current behavior until implementation lands.
- Remove endpoint-mapping from the uncommitted candidate backlog because it is now actionable Bead `brain-atlas-zmq.10`.
- Use fidelity epic `brain-atlas-yum` to create the public traceability inventory and reconcile `AGENTS.md`, architecture, provenance, and UI terminology before changing representation rules.
- Update public user/architecture docs incrementally with each shipped child Bead, especially representation, lesson syntax, static-security boundaries, and accessibility behavior.

## Execution Handoff

Plan saved to: `.pi/plans/brain-atlas-zmq-ux-requirements-roadmap.md`.

Roadmap execution was authorized by the user through delivery decision `brain-atlas-8y7` on 2026-07-21. Begin with unblocked P0 correction `brain-atlas-zmq.2` and preserve the documented dependency order. Design gate `brain-atlas-zmq.15` and its fidelity dependency must still be approved before `brain-atlas-zmq.4` or later lesson-contract/UI implementation. Use `test-driven-development` for each behavior-changing child Bead and `verification-before-completion` before closing it.
