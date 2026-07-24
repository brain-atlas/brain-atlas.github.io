# Architecture

`brain-atlas` is a static Three.js application. Vite bundles the UI and renderer;
large anatomical datasets stay in `public/` and load at runtime. GitHub Pages
serves the ordinary static artifact. An optional CGO-free Go executable embeds a
standalone-mode copy of the same reviewed artifact and serves it only on the
workstation loopback interface. A separate least-privilege Actions workflow
cross-builds, verifies, and packages that executable for the supported desktop
platforms; it publishes one mutable nightly channel and immutable-by-policy
versioned releases.

## Standalone delivery boundary

`npm run build:standalone` runs the existing publication guard, enables a
conditional Vite HTML plugin, writes the complete artifact under
`internal/site/dist/`, and compiles `cmd/brain-atlas` with `CGO_ENABLED=0`. The
plugin adds only `src/standalone/lifecycle.js` and writes generated chunks under
`standalone-assets/`; ordinary production/Pages output keeps `assets/` and
contains neither that module nor its endpoint marker. `internal/site/embed.go`
requires embedded `index.html`, so a supported binary never falls back to files
beside the executable.

`internal/standalone` owns the local process boundary. It validates a
loopback-only address, listens on an OS-assigned port by default, prints the
actual URL, and optionally hands that URL to the platform default browser without
a shell. Browser-launch failure leaves the printed URL usable. The HTTP handler
serves GET/HEAD static files with explicit model/data MIME types, requires
revalidation for every embedded response so fixed ports cannot retain an older
executable's code, adds response security headers, and returns 404 instead of
inventing an SPA fallback.

The root response sets a process-random `HttpOnly; SameSite=Strict` session
cookie. The standalone browser module uses that cookie on one held same-origin
GET to `/_brain-atlas/lifecycle`. An authenticated stream joins a
concurrency-safe page count until request cancellation. Automatic shutdown arms
only after the first valid page, waits ten seconds after the last page leaves,
and cancels stale timers when a page reconnects; `-stay-open` disables this
trigger. SIGINT/SIGTERM and lifecycle expiry cancel active request contexts and
converge on bounded `http.Server.Shutdown`. The server has no global write
timeout because the held response represents page lifetime. This boundary stores
no lesson, anatomy, account, or personal data and exposes no general API or
explicit shutdown endpoint. See [`internal/standalone/SPEC.md`](../internal/standalone/SPEC.md).

## Standalone release boundary

`.github/workflows/standalone-binaries.yml` is independent of the Pages
deployment workflow. Its read-only Ubuntu build job runs for pull requests,
`main`, semantic-version tags, and manual dispatches. It stages one production
standalone Vite tree, audits locked Node dependencies, verifies ordinary/standalone
bundle separation, runs Go/release checks, and calls `cmd/package-standalone` to
cross-build Linux, macOS, and Windows for amd64 and arm64 with `CGO_ENABLED=0`.
The build job receives no release credential. It does not run the Node suite:
seven scientific asset-regeneration tests require the recorded Darwin arm64/Nix
byte-exact environment, so decision `brain-atlas-ek3` retains the complete
`npm test` suite as a required local gate rather than selecting a partial Ubuntu
subset.

`internal/releasepack` owns the deterministic distribution contract. It writes
normalized tar/gzip or ZIP archives containing one executable plus the required
license, data-license, notice, and citation files. It records the exact source
commit/timestamp, clean/dirty state, and Node/npm/Go versions, writes sorted
SHA-256 checksums, and
rejects missing, duplicate, unexpected, or mismatched targets/files. Generated
site, binary, and release directories remain ignored; a tracked
`internal/site/dist/.gitkeep` lets a clean checkout compile Go tests without
weakening `internal/site.FS()`'s requirement for a real staged `index.html` at
runtime. See [`internal/releasepack/SPEC.md`](../internal/releasepack/SPEC.md).

The build job reproduces the complete bundle, compares checksums, smoke-tests the
extracted Linux amd64 executable, and uploads the exact release directory as a
14-day Actions artifact. Separate jobs download that immutable handoff and alone
receive `contents: write`:

- a serialized current-`main` job uses GitHub CLI's draft-aware release lookup
  rather than the published-only REST lookup, uploads commit-scoped assets
  without clobber, checks GitHub's server-reported SHA-256 digests, rechecks
  `main`, publishes or advances the `nightly` prerelease, then deletes only the
  previous managed nightly names;
- a `v*` tag job requires the remote tag to resolve to the bundle commit, stages
  a complete draft, and publishes once. Existing published stable releases are
  read/verified only; any metadata or digest mismatch fails.

`scripts/publish-standalone-release.mjs` implements both state machines with
shell-free `gh` argument arrays. Repository-wide immutable-release enforcement
is intentionally not enabled because it would also freeze the approved mutable
nightly prerelease. Stable immutability is enforced by workflow behavior and
maintainer policy. See [`docs/RELEASES.md`](RELEASES.md).

## Runtime shape

`src/style.css` owns the dark interface theme through semantic `:root` tokens for text, panels, overlays, controls, accent/danger states, backdrops, shadows, and fallback gradients. Interface rules consume those tokens rather than embedding color literals; scientific and renderer data colors remain owned by their catalogs and `src/main.js` bindings, outside the UI theme boundary.

`src/bootstrap.js` is the page entry point. It loads the entity, fidelity, and small fibre-filter-preset catalogs plus the checked lesson, then opens the full Atlas workspace as Home. A responsive Lessons drawer launches the checked reference lesson or the bounded local Markdown import path. Bootstrap owns one guarded Atlas/Lesson workspace record, in-memory candidate/session maps, static-safe History API intent, DOM reparenting, focus/scroll restoration, explicit lesson closeout, transactional fallback, and transient anatomy-inspector presentation state. The persistent global Atlas, temporary lesson-derived Atlas branch, and one resumable lesson token all use complete canonical snapshots; source text, candidates, snapshots, inspector state, and DOM objects never enter URLs or history. The existing stage, viewer panel, Model & sources surface, canvas, and WebGL context move between Atlas and Lesson rather than being copied; one external anatomy detail panel serves both workspaces. Browser-root scrolling remains disabled. In Lesson mode, one named focusable `#page-scroll` below the fixed topbar owns vertical scrolling, native scrollbar behavior, scene coordinates, explicit destinations, focus settlement, and compact-disclosure restoration. `src/ui/scroll-surface.js` supplies pure coordinate and keyboard-intent helpers. No-WebGL Atlas retains orientation, sources, Lessons, local import, and semantic anatomy inspection without downloading Three.js; no-WebGL Lesson retains prose, navigation, summaries, declared images, fidelity records, and cited anatomy details.

`src/main.js` owns the scene, loaders, renderer integration, retained layer panel, endpoint-filter controls, raycasting, and concrete bindings for the single lesson renderer adapter. Its wrapper adds ports for actual camera capture, canonical command dispatch, stable catalog-to-renderer panel projection, reset pose, semantic camera actions, and plain stable-ID anatomy intents/highlights; the generic canonical adapter remains the only binding path. Once catalog bindings are available, the layer-panel topology remains mounted: canonical projections synchronize stable entity, hemisphere, leaf, and parent controls in place, while semantic subgroup disclosures retain their DOM-owned expansion, focus, and scroll state. Every region/tract row exposes entity-specific L/R names plus a semantic combined-hemisphere toggle; label-backed checkboxes, row toggles, ranges, selects, and camera actions expose at least 44×44 CSS-pixel effective targets. The shared shell applies the same floor to panel-close controls and the local lesson file picker. The lesson rail and scene number mark active position without fading readable prose. Canonical visibility also starts independently packaged optional assets: each region's bilateral OBJ pair, the SWM JSON, and the full association geometry/activity payload load at most once when first requested. A checked geometry-free association metadata projection supplies readiness and panel topology; retained placeholder tract groups preserve visibility, hemisphere, selection, and inspection factors until their unchanged geometry children arrive. Late geometry inherits current endpoint filters and playback state through the same loader/adapter path. Raycasting uses the renderer canvas's exact CSS rectangle and existing world matrices under `mniGroup`. Its transient inspection material factor composes with authored selection and visibility factors but never enters or overwrites the canonical snapshot. Window resize and a stage `ResizeObserver` derive camera aspect from the stage's fractional `getBoundingClientRect()` dimensions. The renderer wrapper also forces this resize synchronously after every workspace reparent and before applying the next snapshot, so no frame can use the previous workspace's projection. On narrow global-Atlas stages, entry/reset uniformly increases camera distance from the same target so the complete brain stays in frame; it never rescales anatomy. The drawing buffer may round to pixels, but CSS display, responsive atlas/image split changes, and projection stay matched without axis stretch. `src/pathways.js` contains only schematic anterior-pathway coordinates. `src/activity/physical-contour-travel.js` validates plain contours, precomputes cumulative MNI arc length, and samples positions by physical distance without importing Three.js. `src/activity/association-impulses.js` owns the renderer-independent seeded event engine, inhibition math, canonical endpoint mapping, and plain-data pool adapter. `src/activity/swm-vibration.js` owns bounded home/amplitude sampling and analytic zero-mean contour motion. `src/fibre-endpoint-filter.js` validates and indexes compact endpoint tuples, executes strict unordered queries with hemisphere masks, formats count/quality summaries, and writes stable filtered line/cap buffers without importing Three.js or the DOM. `src/activity/frame-time.js` adapts `THREE.Timer` to the render loop's first-frame-zero and 50 ms clamp contract. `src/ui/viewer-power.js` derives the renderer-independent observability/playback policy. `src/main.js` cancels scheduled frames and freezes model clocks while the document is hidden or the stage is fully offscreen, shifts in-progress transition clocks across suspension, and zeros the first resumed model delta without mutating requested playback. Visible paused/settled views draw only after resize, controls, state, inspection, or asset invalidation; active playback, authored transitions, damping/input, and auto-rotate retain continuous frames. The policy intentionally has no interaction-idle timeout because passive reading and assistive technology do not produce reliable activity signals. Three.js objects and the one MNI transform stay in `main.js`; renderer-independent presentation, navigation, fidelity, workspace tokens, Atlas snapshots, orbit-camera math, and power policy live under `src/ui/`.

Every anatomical layer is a child of `mniGroup`:

1. `brainGroup`
2. `anteriorGroup`
3. `labelGroup`
4. `regionGroup`
5. `fibreGroup`
6. `tractGroup`
7. `swmGroup`

`sceneFromMni`, assigned to `mniGroup`, is the only runtime coordinate transform. Cortical and region assets are MNI152NLin2009cAsym. Association tracts are verified ICBM 2009a Nonlinear Asymmetric; OR/SWM use the exact nonlinear ICBM152 2009a HCP FIB, with its asymmetric variant indicated by the release-companion T1 but not directly bound by a retained FIB build record. Nibabel decodes TrackVis voxel-mm vertices through voxel size, half-voxel offset, orientation, and voxel-to-RAS metadata into RAS+ world millimetres. Resampling retains that frame; no offline 2009a→2009c template warp exists. Do not add dataset-specific runtime transforms or fitting: any future geometric correction belongs in the offline asset pipeline. `TRACT_SPACE_PROVENANCE.md` records source hashes, effective affine semantics, recovered processing, correspondence, numeric methods, and residual unknowns.

`sceneState.visible` stores leaf-layer visibility. `hemiState` combines with per-region and per-tract hemisphere state. One canonical `fibreFilter` axis selects all contours, contours touching either endpoint set, contours with both endpoints in one set, or contours split between two sets. The runtime index preserves source contour order and returns one mask used to rebuild association/SWM lines and endpoint caps and to limit association-event contour pools and SWM dots. Association activity Restart/reset reinitializes the seeded engine but reapplies the retained per-group masks before any event can choose a contour. Global hemisphere state participates in the same query; per-tract visibility remains its separate canonical axis. The render loop updates three distinct activity models:

- directed anterior and optic-radiation flow;
- seeded inhibited association-tract impulses, with direction sampled per event
  from explicit bilateral 50/50 metadata; and
- zero-mean superficial-white-matter vibration.

Every directed contour uses a precomputed cumulative-distance profile. Anterior,
optic-radiation, and association dots travel at the common base rate of 40 MNI mm
per display second when the activity speed control is 70; the control scales display
time. The one proper `mniGroup` transform preserves these distances because it uses
uniform scale. Equal configured velocity therefore gives shorter contours lower
transit latency. The common rate and playback scaling are illustrative display
choices, not measured or universal axonal conduction velocity.

`public/data/tract_activity.json` separates association model provenance from
`tracts.json` geometry. `createAssociationImpulseEngine().advanceTo()` produces
plain logical events on an absolute model clock; `updateAssociationEventPool`
handles deterministic visibility, cap, physical-length-dependent expiration, and
profile selection before `updateTractImpulses` uploads positions and colours.
Endpoint-only geometric heuristics orient A/B labels independently of source array
order. Equal channel counts keep JSON sampling density from becoming an
activity-rate claim.
Superficial-white-matter vibration remains separate. Each selected dot's structural
amplitude is sampled with a home interval that keeps the complete sinusoid inside
contour margins, so `updateSwm` needs no asymmetric endpoint clipping; reduced
motion settles each dot at its fixed home. Filtering changes contour eligibility but
never event direction, rate parameters, or vibration semantics.

## Lesson contract foundation

`src/lesson/` is a renderer-independent ESM subsystem governed by
[`src/lesson/SPEC.md`](../src/lesson/SPEC.md). It parses Obsidian-style Markdown:
one leading YAML frontmatter block for metadata and top-level `atlas-scene` YAML
fences as the domain-specific content extension,
then validates catalog references and normalizes every scene to a complete frozen
plain-data snapshot. Headings, lists, and ordinary code fences carry no runtime
semantics. Raw HTML, unsafe URLs, unknown IDs/actions/versions, and malformed fields
produce positioned diagnostics and no partial lesson.

`public/data/entities.json` maps stable prefixed domain IDs to current layer/region/
tract renderer IDs and camera presets. `public/data/fibre_filter_presets.json` adds four strict authored endpoint queries over region IDs plus explicit unknown/ambiguous selectors; the large generated endpoint tuple artifact remains renderer data. Its strict 33-record `inspectables` projection
covers the early visual starters, all eight association bundles, the 19 region shells
that pass the approved bilateral endpoint-proximity screen, and superficial white matter.
Selection-only landmark IDs inherit availability and fidelity from `pathway.anterior`
but do not enter canonical scene `entityIds` or visibility snapshots. Curated anatomy
copy, relationship evidence, and HTTPS citations live with those stable records; every
relationship requires direction, evidence class, method, status, confidence, summary,
and sources. Undirected tract→region records are authored once and `createLessonCatalog`
derives the reciprocal region view after rejecting duplicate/reversed pairs. Literature-
curated, displayed-dataset, and schematic-teaching links remain visibly distinct.
`public/data/fidelity.json` supplies separate geometry/activity disclosure records
reconciled with `SCIENTIFIC_TRACEABILITY.md`; a relationship cannot upgrade owner fidelity.
Pure commands create new snapshots without mutation. Canonical snapshot schema v2 adds a complete endpoint-filter query; the inert lesson-source schema remains v1. `createRendererAdapter` defines the only snapshot-to-renderer port and requires explicit bindings for every state axis. `src/main.js#createLessonRendererAdapter` maps stable catalog records to layer/region/tract visibility, hemispheres, endpoint filtering, clipping, tissue, playback, emphasis, camera, visual, and control-policy state without simulating panel events.

`src/ui/anatomy-inspector.js` derives visible inspectable IDs from canonical owner
visibility and effective hemispheres, composes frozen cited detail models from
inspectable plus fidelity records, projects readable relationship evidence/method/status/
confidence labels and per-relationship sources, reduces hover/focus/touch/activation
state, distinguishes taps from drags, and normalizes exact-canvas pointer coordinates. It
imports neither DOM nor Three.js. Bootstrap renders equivalent semantic buttons and the
short label, owns wide/compact panel and focus behavior, and retains the same details
without WebGL. Compact details inert the background and use their own page-lock owner;
wide details remain nonmodal. Canvas and DOM input feed the same reducer. The expanded
set still follows canonical owner visibility; it adds no search state, filter, transform,
or renderer adapter.

`src/ui/explore-session.js` derives complete immutable Atlas snapshots. Atlas Home starts from the project-authored complete-atlas default and retains its working state until a deliberate lesson Exit resets it. Every active-Lesson → Atlas transition preserves effective lesson state, substitutes the actual rendered camera, and opens the same temporary branch; the persistent global snapshot stays untouched. Before every noncamera panel command, the branch merges the latest rendered camera, applies an allowlisted command batch, and sends one complete snapshot through the same adapter. The panel is a projection of this state, not a second filter system. An empty visibility list remains a valid Atlas snapshot: bootstrap renders explicit empty Viewer and Model & sources copy instead of passing it into the lesson-only nonempty fidelity-record contract. On wide screens the open panel occupies its dock; closing it removes that grid track and overlays only the semantic reopen summary, while compact screens retain the bounded stacked panel. The stage `ResizeObserver` remains the sole response to either layout. `src/ui/workspace-session.js` validates small query/history intents, checked drawer records, persistent Atlas capture, lesson resume tokens, and lesson-derived branch capture without importing the DOM or Three.js. Bootstrap’s Exit transaction clears the token and session-only keys, converts the already-reparented surface to Home ownership, and applies `createAtlasExploreSnapshot` once with responsive camera fit. Auto-rotate remains excluded; Atlas grants full orbit/zoom/pan and semantic camera controls.

The checked-in `src/lessons/retina-to-v1.md` exercises that contract through one unnumbered topic entry view and eight instructional scenes centered on retina-to-V1 processing, followed by brief ventral/dorsal previews and an early-vision conclusion that reprises the opening pathway and lesion prediction. Explicit human content review removed its optional `status: draft` metadata; absence makes no machine-readable reviewed or published claim. `src/ui/lesson-presentation.js` still projects textual `[DRAFT]` identity for any lesson that explicitly carries the validated lifecycle marker, independently of scientific geometry/activity fidelity. Optional frontmatter `entryScene` names a complete authored scene that supplies the pre-scroll viewer state but is excluded from progress numbering by the same presentation model. `src/ui/scene-navigation.js` supplies directional hysteresis, entry-view restoration, and bounded explicit movement; `lesson-scene-controller.js` initializes from the live navigation index if reading advanced during renderer loading, then applies complete snapshots and transient Restart/Skip, reduced-motion, or workspace-resume variants. `camera-transition.js` rotates the current camera offset around the interpolated target with a quintic smootherstep spline and starts interrupted forward/back transitions from the current rendered pose. Reference scenes orbit their explicit authored targets under `sceneFromMni`: the title view centers the complete brain with shared V1/V2/V3 regions and endpoint-filtered SWM, cortical-stream views frame projected teaching geometry rather than the cortex/SWM envelope, and the LGN-dominant view keeps incoming context plus the LGN→optic-radiation→V1 visual sentence and its small LGN-filtered SWM subset in frame. Optic-radiation, V1, ventral, and dorsal scenes preserve their approved cameras while using global `L=true/R=false` filters plus display-only `cutaway: 50`; the scene-frame center clip hides half of the one cortical shell while hemisphere filters remove right-side regions and fibres. The orbit therefore stays centered on the taught anatomy rather than drifting along an independently interpolated quaternion. `visibility-transition.js` keeps source and destination filters eligible as a union while changed entities cross-fade during the first half, then commits the destination set; reverse or interrupted fades begin at current rendered opacity. Material selection and visibility factors compose instead of overwriting one another, including meshes that finish loading after a snapshot is applied. Camera controls are suspended during the orbit; lesson ownership disables OrbitControls damping so residual input cannot move an authored endpoint. Non-Explore control policies map touch to vertical `#page-scroll` movement without camera manipulation, while `look` retains mouse/trackpad orbit. Live reduced-motion changes reapply the latest authored playback request. The reduced-motion stylesheet selectively disables smooth page travel while retaining brief non-spatial color, border, and background state feedback; renderer/controller policy remains responsible for settling continuous activity and spatial camera motion. The reference LGN camera uses an oblique pose away from the OrbitControls vertical-pole seam and remains compositionally distinct from the balanced optic-radiation scene. Its anterior, optic-radiation, and zero-mean SWM activity remain enabled after camera settlement. The V1-arrival scene keeps LGN, optic radiation, V1, endpoint-filtered SWM, ILF, and IFOF emphasized together so selection does not dim endpoint caps, active tracers, or the requested white-matter context. Camera-transition completion never changes the canonical playback request: normal entry and all eight playing scenes retain their expected anterior, optic-radiation, association-impulse, or SWM clocks after the camera settles; the conclusion returns to the opening anterior, optic-radiation, and filtered zero-mean SWM activity rather than restoring downstream association activity. Transparent schematic pathway tubes do not write depth over their centerline activity sprites. The zero-initialized optic-radiation, association-impulse, and SWM point pools update positions in place and therefore disable automatic frustum culling rather than treating their initial bounds as authoritative. Skip intentionally applies the authored settled state, Pause freezes model time without claiming a settled scene, and reduced motion settles activity and disables Play. Development-only `window.__view.activity` names anterior and optic-radiation point sets and reports stable clock/state/endpoint diagnostics; the checked Firefox/Chromium animation-continuity test combines those diagnostics with changing settled-stage screenshots so live-but-depth-occluded or incorrectly culled activity cannot masquerade as visible motion, and production builds remove the hook. The topic entry, LGN, V1, shared-early, ventral, dorsal, and closing views activate endpoint-filtered SWM through ordinary canonical visibility/playback snapshots. V1 and Scenes 5–7 also show every named tract group with a nonzero match under the scene's query and hemisphere policy. The overview, LGN, V1, and shared-early views use strict custom `touches-any` queries; ventral and dorsal retain their audited presets. The same result masks named-tract geometry/caps, eligible association contours, SWM grain, and SWM dots. Their prose and fidelity records separate categorical unordered endpoint membership, the 50/50 long-tract activity assumption, low-confidence inspector proximity, and illustrative zero-mean SWM motion. Lesson-specific claim evidence and curriculum review live in `docs/lessons/retina-to-v1-validation.md`; `docs/SCIENTIFIC_TRACEABILITY.md` remains the runtime model/asset authority.

`src/ui/lesson-import.js` composes the existing strict parser and presentation path for local sources up to 512 KiB. Validation returns frozen diagnostics or one frozen candidate with title, lifecycle, scene/image counts, and sorted external hosts; it cannot activate content or make requests. Source changes invalidate the candidate. Explicit **Open lesson** atomically replaces presentation/navigation/controller state in memory, derives an immutable runtime catalog that extends only the already-validated visual IDs, and reuses the existing renderer and canvas. Repeated imports do not reload Three.js. Local source remains memory-only; `?lesson=local` is only a nonsecret recovery marker, and reload normalizes to Atlas with an announcement rather than restoring source.

`src/bootstrap.js` converts validated Markdown to an allowlisted plain view model and creates DOM nodes with `createElement`/`textContent`; it never inserts author HTML. Declared HTTPS images render as semantic DOM figures only after lesson activation, with alt text, caption, credit, source link, reserved presentation space, lazy/no-referrer loading, and an announced retry state. The atlas remains the first visual choice. Wide `split` scenes may show atlas and image together; compact scenes show one selected visual, and manual visual changes do not alter semantic scene state. Images never become WebGL textures. Geometry and activity fidelity statuses come from `public/data/fidelity.json` and appear inside the persistent **Model & sources** disclosure rather than in duplicate canvas badges, stage rows, or the global header. Scene identity/progress remains in the stage header and transport. The wide disclosure is nonmodal. The compact lesson sheet inerts background/skip-link content, locks `#page-scroll`, cycles visible focusables, and resynchronizes focus/semantics when a breakpoint changes; close restores exact surface position and trigger focus. In Atlas, the same disclosure stays within the top-level workspace and follows visible entities, unioned with the originating scene's records for stage-local inspection. The separate cited anatomy inspector composes those fidelity records with curated anatomy explanations; it does not redefine provenance or add lesson-authored claims. Its wide panel is nonmodal, its external compact sheet contains focus while the app is inert, and close restores the exact semantic invoker or a connected stage fallback. Opening either detail surface closes the other without changing workspace history, camera, filters, playback, or the resumable lesson. Lesson scenes currently hide legacy fixed-anchor 3D labels under decision `brain-atlas-jes`; responsive placement is tracked by `brain-atlas-zmq.20`.

## Data loading and build

After the WebGL gate, the renderer eagerly loads the cortical GLB, optic-radiation JSON, compact endpoint tuples, region manifest, and the 1.4 kB checked geometry-free association metadata projection. Renderer readiness resolves after region and projected tract metadata bind; a manifest or renderer failure returns the page to readable lesson fallback. The first canonical visibility snapshot then starts each required bilateral region OBJ pair, the independently packaged SWM JSON when visible, and the unchanged 2.4 MB association geometry/activity payload when any named tract becomes visible. Runtime loading verifies the geometry's identity/order/color/group/point-count fields against the checked projection before binding it. A direct checked lesson therefore starts with LGN, V1, V2, V3v, V3d, and SWM because the opening snapshot uses the shared-early endpoint query, while its tract-hidden opening scenes avoid association transfer, parsing, and geometry construction. The first tract-bearing scene loads that payload once. Atlas Home's complete default requests every region, tract, and SWM immediately. [`PERFORMANCE.md`](PERFORMANCE.md) records production-profile evidence and device limits.

Offline tools must produce web-sized, co-registered assets; runtime fitting and heavy data processing do not belong in the viewer. `tools/map_tract_regions.py` separately parses the shipped association JSON and region OBJs, writes `public/data/tract_region_mapping.json`, and checks exact artifact drift. The browser does not fetch that evidence file: regression tests bind its robust relationship set to the strict entity catalog. `SCIENTIFIC_TRACEABILITY.md` records each asset's geometry and model provenance, while `docs/lessons/*-validation.md` records lesson teaching claims and review. `TRACT_REGION_MAPPING.md` owns relationship derivation and interpretation limits; `TRACT_SPACE_PROVENANCE.md` owns fibre source space, conversion history, and replay limits.

`tools/assets/` is the offline anatomical-build boundary. Its schema-validated manifest binds source, intermediate, tool, environment, coordinate, output, rights, and limitation records. A pinned Python 3.13 environment generates cortex, region, association, and fibre-endpoint assets and prepares or post-processes OR/SWM data only in explicit empty output roots; it never downloads implicitly, writes into `public/`, or launches DSI Studio. The endpoint builder requires the manifest-pinned Jülich MPM plus hash-checked repository inputs and emits exact preset/quality audits; the raw NIfTI is not retained. The printer emits a hash-checking v2 shell wrapper for human execution, and the verifier applies frozen TrackVis equality classes. Current OR/SWM JSON remains byte-exact only from recovered intermediates because accepted legacy DSI replays produced class 4 OR and class 3 SWM results. Exact-scope decision `brain-atlas-3ct` permits pipeline closeout without promoting either class or authorizing replacement; source/build-bound deterministic retracking remains separate work.

Ajv schemas compile offline through `npm run generate:lesson-validators`; the checked-in `src/lesson/generated-validators.js` is imported at runtime. This preserves the script/connect CSP without `unsafe-eval`, `new Function`, arbitrary fetches, or third-party code. The image policy intentionally permits HTTPS sources only for validated declared lesson images; external hosts are disclosed before activation and requests use no referrer.

Vite uses native Rolldown `codeSplitting.groups` to keep Three.js and its addons in
a deliberate cacheable `three` chunk. The 650 kB warning threshold sits just above
that known dependency; it is a regression signal, not a claim that chunking reduces
total bytes or first-render cost.

## Architecture review

The current design has no unnecessary service, state-management, or component layers. Splitting `src/main.js` solely to reduce its line count would add interfaces around tightly shared state without reducing runtime complexity. Extract modules only when a subsystem gains an independent interface or testable lifecycle.

### Applied simplifications

- Removed an unused 13 MB legacy cortical model from the public asset tree.
- Removed unused JavaScript symbols.
- Reused caller-owned typed arrays for fibre interpolation instead of allocating a temporary array for every animated dot on every frame.
- Marked frequently updated GPU attributes as dynamic.
- Deferred bilateral region OBJ pairs and SWM JSON until canonical visibility first requests them.
- Replaced unconditional rendering with observability-aware suspension and event-driven paused/settled redraws while preserving requested playback.

### High-value future opportunities

These changes are worthwhile but structural; implement them through a scoped Bead and a plan in `.pi/plans/`.

1. **Move superficial-white-matter vibration into a vertex shader.** The CPU currently evaluates and uploads as many as 15,000 dot positions per frame. Per-dot phase, frequency, home position, and amplitude can become static attributes while a time uniform drives zero-mean displacement. Preserve the undirected representation exactly.
2. **Package region shells into one web-optimized GLB.** The current manifest starts many OBJ requests and parses text geometry in the browser. A single indexed, decimated binary asset could reduce requests, transfer size, parse time, and duplicated vertices while retaining real bilateral meshes and MNI coordinates.
3. **Split runtime modules only along stable boundaries.** Good candidates are asset loading, activity models, and panel construction. Pass explicit state rather than introducing global registries or a framework.

### Findings not adopted

- A runtime asset manifest would not simplify loading: manifests already exist where metadata is needed, and independent top-level fetches correctly run in parallel.
- Event delegation would save little for the small retained panel and would make its explicit stable-control bindings less clear.
- Splitting the existing Three.js vendor group further would add requests without reducing total dependency bytes; do so only after measured loading evidence.
