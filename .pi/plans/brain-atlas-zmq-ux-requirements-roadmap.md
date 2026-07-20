# Spatial Lessons UX Requirements and Roadmap

**Issue:** `brain-atlas-zmq` — Define UX goals and interaction roadmap
**Design approval:** `brain-atlas-7b8` — approved 2026-07-20
**Date:** 2026-07-20
**Branch:** `main`

**Goal:** Evolve the current visual-pathway viewer into a static, agent-authorable spatial-lesson system for neuroscience without weakening anatomical accuracy, free exploration, mobile capability, or the one-transform architecture.

**Architecture:** One Three.js renderer supports two first-class presentation modes: Lesson and Explore. A Markdown-first lesson document is parsed, sanitized, validated, and normalized into domain-neutral lesson, visual, entity, and scene objects. A scene controller applies deterministic, serializable snapshots through a narrow renderer adapter; vertical scroll selects scenes with hysteresis, while camera and biological/illustrative animations run independently.

**Acceptance Criteria:**
- [ ] A learner can paste or import a valid lesson and complete it without an account or backend.
- [ ] The retina→chiasm→LGN→optic-radiation→V1 reference lesson works through vertical scrolling and explicit scene controls on desktop and mobile.
- [ ] Every lesson can enter a prepared free-exploration state and return to the exact lesson scene.
- [ ] Atlas entities can expose an unobtrusive highlight/short-label preview and explicit cited details through capability-equivalent pointer, keyboard, and touch interactions.
- [ ] Lesson scenes preserve the one-MNI-transform and honesty-of-representation invariants.
- [ ] Reduced-motion and no-WebGL users receive useful settled/readable alternatives.
- [ ] The static publication workflow remains viable; no planned requirement depends on WebAssembly or a service.

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

- Vertical scroll chooses a discrete semantic scene.
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

Use Markdown prose with YAML frontmatter and fenced `atlas-scene` directives. Markdown keeps lessons readable in Obsidian and reviewable in pull requests; fenced directives remain discoverable and machine-validatable.

Example:

````markdown
---
title: How visual fields cross
schema: 1
visuals:
  - id: retinotopy-diagram
    type: image
    src: https://example.org/retinotopy.png
    alt: Diagram showing nasal and temporal retinal fields
    caption: Visual-field projection before the chiasm
    credit: Example Author
    source: https://example.org/source
---

```atlas-scene
id: chiasm
visual: atlas
camera: lateral
show: [anterior, lgn]
controls:
  mode: look
layout: dominant
```

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

### Model-fidelity disclosure

Scientific traceability must be easy to find without competing with the spatial lesson:

- Keep a quiet, persistent **Model & sources** affordance beside the active visual rather than burying it in settings or documentation.
- Show separate concise statuses for geometry and behavior, for example **Data-derived geometry · Modeled activity**. A single badge cannot honestly describe mixed representations.
- When a representation category first matters in a lesson, show a short contextual model note; do not repeat warnings in every scene.
- One click/tap or keyboard activation opens the method, citations, assumptions, uncertainty, limitations, and material known gaps while preserving scene context.
- Distinguish intentional design decisions from known gaps. Flag an open gap only when it could materially alter interpretation, confidence, or intended use, or when higher-fidelity work is planned.
- Apply the same disclosure taxonomy to desktop, touch, reduced-motion, and no-WebGL presentations.

Beads epic `brain-atlas-yum` owns the cross-project scientific-fidelity and traceability audit. Its disclosure design (`brain-atlas-yum.3`) is a dependency of the lesson/entity contract so provenance is part of the data model rather than late UI copy.

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

## 7. Static hosting and WebAssembly decision

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

## 8. Idea triage

| Category | Ideas |
|---|---|
| Good and relatively easy | Declarative scene snapshots; Back/Next/Restart/Skip; first retina→V1 lesson; reduced-motion settled states; actionable paste validation. |
| Good and moderate | Responsive scrolling stage; visual rail; remote image policy; deterministic camera transitions; contextual control policies; free-explore pop-out. |
| Good and hard | 3D selection/inspector; mobile gesture polish; cited entity content; tract-to-region endpoint mapping. |
| Later | Static reviewed lesson library; entity search/catalog; canonical lesson export; optional backend-free GitHub contribution handoff. |
| Avoid | Continuous scroll-scrubbing; literal horizontal page scrolling; arbitrary executable lesson code; automatic layout guessing; hover-only facts; direct Obsidian sync or GitHub OAuth in MVP; runtime tractography/meshing. |

## 9. Current correctness finding

`src/main.js:389-411` advances association-tract points monotonically from streamline parameter 0→1. Individual axons conduct directionally, but these HCP/DSI tractography streamlines are unoriented geometric inferences: point order does not encode soma-to-terminal polarity or net bundle flow. Visible travel along array order therefore conflicts with `AGENTS.md:31-35`.

P0 bug `brain-atlas-zmq.2` removes that known artifact now using a direction-neutral fallback. Decisions `brain-atlas-m9k` and `brain-atlas-sh7` also establish a later modeling policy: estimate source→endpoint direction probabilities from the best cited evidence, and permit an explicitly labelled symmetric 50/50 stochastic assumption when evidence is absent. This assumption is modeled activity, not measured polarity and not evidence that one rendered streamline is one axon. `brain-atlas-yum.2` must define the inference unit, sources, probability/uncertainty model, sampling behavior, and reconciliation with the current no-unsupported-direction invariant before a separate implementation Bead adds such travel. The optic radiation and schematic anterior pathway remain valid directed exceptions because their direction is justified independently by the represented biology.

## 10. Sequenced work graph

| Order | Bead | Priority | Outcome | Dependencies |
|---:|---|---:|---|---|
| 0a | `brain-atlas-zmq.2` | P0 | Remove arbitrary array-order direction using the current direction-neutral fallback. | None |
| 0b | `brain-atlas-eoa` | P3 | Complete pending Three.js/Vite API migration before overlapping runtime work. | None |
| 0c | `brain-atlas-yum.1` | P1 | Inventory scientific claims, models, sources, assumptions, and limitations. | None |
| 1a | `brain-atlas-yum.2` | P1 | Define the evidence-informed association-direction probability model and 50/50 fallback semantics. | `yum.1`, `zmq.2` |
| 1b | `brain-atlas-yum.3` | P1 | Design unobtrusive progressive model-fidelity disclosure. | `yum.1` |
| 2 | `brain-atlas-zmq.4` | P1 | Define domain-neutral lesson/entity/scene contracts and tests. | `zmq.2`, `eoa`, `yum.3` |
| 3 | `brain-atlas-zmq.5` | P1 | Build retina→V1 scrolling vertical slice from an in-memory lesson object. | `.4` |
| 4 | `brain-atlas-zmq.6` | P1 | Add local Markdown paste/import, sanitization, validation, and linked images. | `.5` |
| 5 | `brain-atlas-zmq.7` | P1 | Add scene-controlled free-exploration pop-out. | `.6` |
| 6 | `brain-atlas-zmq.8` | P2 | Add selection and cited inspector foundation with starter entities. | `.7` |
| 7 | `brain-atlas-zmq.9` | P1 | Harden integrated mobile, accessibility, fallback, and performance behavior. | `.8` |
| 8a | `brain-atlas-zmq.10` | P2 | Research/map defensible tract-region relationships. | `.8` |
| 8b | `brain-atlas-zmq.12` | P3 | Add entity search/catalog over shared metadata. | `.8` |
| 9 | `brain-atlas-zmq.11` | P3 | Publish a reviewed static lesson library. | `.6`, `.9` |
| 10 | `brain-atlas-zmq.13` | P4 | Add canonical export and optional safe GitHub contribution handoff. | `.11` |

## 11. Task execution guidance

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

### Import and external visuals (`brain-atlas-zmq.6`)

**Likely files:**
- Extend lesson parsing/validation modules and tests.
- Modify: `index.html` CSP and import UI.
- Modify: `src/style.css` for errors and external visual states.

Treat pasted content as untrusted. Verify valid, invalid, malicious, unavailable-image, and offline cases.

### Explore and inspector (`brain-atlas-zmq.7-.8`)

Use renderer commands and stable entity IDs rather than simulating clicks on the current layer panel. Selection/highlighting must not mutate anatomical geometry or introduce another coordinate transform.

### Hardening (`brain-atlas-zmq.9`)

Do not postpone basic semantics or responsive design until this task; each preceding task must meet its own accessibility acceptance. This task is the integrated verification and performance gate before declaring the first lesson release-ready.

## 12. File conflicts and execution strategy

Most core tasks will touch `src/main.js`, `src/style.css`, and lesson modules. Execute `brain-atlas-zmq.4-.9` serially in dependency order rather than parallel worktrees. Content research (`.10`) and search design (`.12`) may proceed in parallel after the inspector contract stabilizes, provided they do not edit the same entity registry simultaneously.

Before each structural child Bead, create an issue-specific implementation plan if its final file boundaries or migration steps are not already obvious from the source at that time.

## 13. Documentation impact

- This file is the approved design/roadmap source.
- Keep `README.md` and `docs/ARCHITECTURE.md` describing current behavior until implementation lands.
- Remove endpoint-mapping from the uncommitted candidate backlog because it is now actionable Bead `brain-atlas-zmq.10`.
- Use fidelity epic `brain-atlas-yum` to create the public traceability inventory and reconcile `AGENTS.md`, architecture, provenance, and UI terminology before changing representation rules.
- Update public user/architecture docs incrementally with each shipped child Bead, especially representation, lesson syntax, static-security boundaries, and accessibility behavior.

## Execution Handoff

Plan saved to: `.pi/plans/brain-atlas-zmq-ux-requirements-roadmap.md`.

Recommended next skill for implementation: `test-driven-development` for each behavior-changing child Bead; `verification-before-completion` before closing it. No implementation is authorized by this planning artifact alone.
