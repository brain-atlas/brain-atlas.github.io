---
name: use-the-atlas
description: How an agent drives and inspects the running brain-atlas viewer — start it, toggle layers, frame the camera, screenshot, and read what each layer honestly represents.
---

# Using the brain-atlas viewer

For an agent (or person) operating the running viewer—to verify a change, capture a view, or answer “what am I looking at.” `src/bootstrap.js` opens the full Atlas workspace and launches semantic lessons around the single `src/main.js` Three.js scene; there is no backend.

## Start it
```bash
npm run dev                         # Vite → http://localhost:5180 (port set in vite.config.js)
# or, for stable / HMR-free inspection:
npm run build && npm run preview    # → http://localhost:5180
```
It is a heavy WebGL page — prefer the static preview when inspecting; HMR reloads
can churn the GPU context.

## The development-only debug hook
In development mode, `src/main.js` exposes `window.__view` with camera, controls, scene, Three.js, named activity diagnostics, and `inspector` pick/highlight diagnostics. `src/bootstrap.js` also exposes `window.__lesson`, containing the frozen lesson/catalog and getters for navigation/controller state. Use them to frame, freeze, navigate, and introspect from browser automation or the console. Their `import.meta.env.DEV` guards remove both hooks from production builds.

## Driving it with the Playwright MCP
- `browser_navigate` to the URL, then `browser_console_messages(level:"error")` to
  confirm a clean load (a `favicon.ico` 404 is harmless).
- Freeze rotation before shooting: `window.__view.controls.autoRotate = false`.
- `browser_take_screenshot` — the MCP writes only inside its allowed roots (the
  session's working directory / its `.playwright-mcp/`), which may be a *different*
  repo than brain-atlas. Treat those images as throwaway; don't leave them in an
  unrelated project.
- The checked-in reference lesson has no lifecycle marker after explicit human review. In development, verify `window.__lesson?.lesson?.status === null`; verify `#lesson-status` is hidden and neither the drawer entry nor `document.title` contains `[DRAFT]`, including under `?no-webgl=1`. Local lessons with explicit `status: draft` must still show the textual lifecycle identity in every capability path. Draft is curriculum lifecycle state, not geometry/activity fidelity.
- Page entry is Atlas Home: `window.__lesson.workspaceState.mode === 'atlas'`, the retained Viewer controls are enabled, and one canvas lives under `#atlas-workspace`. The compact global view may increase camera distance from the same target to keep the complete brain in frame. The layer panel is built after `regions.json` loads. After changing a draw range, wait two `requestAnimationFrame`s before reading it back.
- Open **Lessons** (`#lessons-trigger`) and start or resume `retina-to-v1`; direct checked navigation is `?lesson=retina-to-v1`. Then poll for `window.__lesson?.controllerState?.status === 'ready'`. At lesson entry, `window.__lesson.navigation.activeIndex === -1`: the unnumbered topic view centers the complete brain with the lesson pathway visible. `#page-scroll` is the sole lesson scroller; root x/y remain zero. Scroll into the eight `.lesson-scene` sections or use `#scene-previous` / `#scene-next`; Previous from scene 1 restores entry. In non-Atlas policies, canvas `touch-action: pan-y` keeps vertical swipes on the lesson while mouse/trackpad drag may orbit in `look`. `#scene-skip` appears only during a transition; the reference lesson exposes no ineffective Restart action.
- `#model-sources-trigger` opens the sole geometry/activity status, provenance, limitation, and source surface; there is no duplicate canvas badge, stage status row, or global progress strip. In Lesson, `#fidelity-close` restores trigger focus and exact `#page-scroll`; in Atlas, records follow visible entities without changing workspace history.
- Open `#anatomy-browser` to reach every currently available seeded canvas target by semantic button. Focus previews the same highlight/short label as hover; activate a button or `#anatomy-preview` for cited details. In development, `window.__view.inspector.candidateIds`, `.highlightedId`, and `.pickAt(clientX, clientY)` expose stable-ID diagnostics. Compact details inert the app and trap focus; no-WebGL retains the list and details while `window.__view` is intentionally absent.
- Lesson `#back-to-atlas`, the brand link, browser Back, and stage `#explore-scene-trigger` all enter the same temporary Atlas branch from the actual lesson camera and complete canonical filters; the persistent global snapshot remains unchanged. `#return-to-lesson` restores the saved source, scene, selected visual, canonical state, rendered camera, exact lesson-surface position, and focus. `#exit-lesson` instead clears resume/session state and resets the complete default Atlas; a local lesson first opens `#lesson-exit-dialog`. `window.__lesson.exploreState` reports `{ phase, kind, snapshot }`; `window.__lesson.workspaceState` exposes development-only mode/token diagnostics. There must still be exactly one canvas.
- To check display aspect, compare `window.__view.camera.aspect` with `document.querySelector('#stage canvas').getBoundingClientRect().width / height`. They should match to floating-point precision; the MNI group (`matrixAutoUpdate === false`) must retain equal basis lengths and positive determinant.
- To distinguish stopped activity from sparse, occluded, clipped, or dimmed activity, inspect `window.__view.activity.state`, `.anterior.phase`, `.opticRadiation.modelTime`, `.opticRadiation.activeCount`, named point geometries, `window.__view.association`, and `window.__view.swm`. Run `scripts/browser/animation-continuity.spec.cjs` in Firefox and Chromium; it waits for every authored camera to settle, then checks model clocks, point checksums/draw ranges, in-frame events, optic-radiation endpoint proximity and cap visibility, selected tract groups, stable camera pose, and the distinct Skip/Pause/Play/reduced-motion semantics.
- Force the readable renderer-free path with `?no-webgl=1`; verify that no `main`/Three.js resource loads. Imported supplementary images remain available as semantic figures in this path.

## Opening a local lesson

1. Activate header **Open lesson** (`#lesson-import-trigger`). Paste source into
   `#lesson-import-source` or choose one `.md` file with `#lesson-import-file`.
2. Use **Validate lesson**. Invalid source keeps the active lesson unchanged and
   reports positioned diagnostics in `#lesson-import-result`; the 512 KiB
   bound applies before parsing. Editing source invalidates any prior preview.
3. For valid source, inspect `#lesson-import-preview`: title, Draft state,
   instructional-scene count, supplementary-image count, and external HTTPS hosts.
   Validation alone must make no remote request.
4. Activate **Open lesson** only after accepting the preview/privacy boundary.
   The lesson replaces the current session in memory through the same controller and
   renderer; it is not uploaded, saved, or persisted. The nonsecret
   `?lesson=local` marker cannot restore source: reload removes it, returns to Atlas,
   and announces the loss. `window.__lesson.lesson` updates in development mode.
5. In image scenes, `#visual-selector` always offers **3D atlas** first. Wide
   `split` scenes may show atlas and image together; compact scenes show the selected
   visual. `#supplementary-image` uses lazy/no-referrer loading and complete
   caption/credit/source metadata. Confirm `#supplementary-image-failure` announces
   an error and `#supplementary-image-retry` recovers without changing scene state.

Use a disposable imported fixture for browser checks. Do not assume a locally opened
lesson is scientifically reviewed merely because it passes the structural contract.

## Exploring the atlas

- Atlas is Home. It starts from the project default: complete base atlas except labels,
  home camera, bilateral hemispheres, no cutaway/selection, and requested activity.
- **Back to atlas** and **Explore this scene** both preserve a stable lesson token, keep
  effective lesson filters/playback, replace only the requested camera with the exact
  rendered pose, and create the same temporary Atlas branch.
- The top-level workspace reparents the existing stage, canvas, Viewer controls, Model &
  sources, and project links. Check canvas identity/count after repeated cycles; do not
  expect a second renderer or context.
- Viewer-panel edits update `window.__lesson.exploreState.snapshot` through canonical
  commands. Move the camera, then change a filter and verify the pose does not snap.
  `[data-explore-camera]` buttons provide keyboard Zoom/Pan; Reset returns to the entry
  pose. Auto-rotate remains hidden and off.
- **Return to lesson** discards lesson-derived Atlas edits and preserves global Atlas
  state. **Exit lesson** removes Return/Exit and resets the authored complete Atlas. At
  350 px and below, Lessons/Open yield to these active-session actions and reappear after
  Return or Exit. Checked lessons then offer Start, while local exit requires Keep/Exit confirmation and
  stale local history announces that it was not retained. Verify controller scene/index,
  resume snapshot, `#page-scroll.scrollTop`, reciprocal focus, touch policy, camera aspect,
  Exit focus/history, and one-canvas ownership with the checked-in
  `scripts/browser/{home,explore}-*.spec.cjs` matrix.

## Layers and how to toggle them
The retained panel lives in `#layers` inside `#viewer-console`. It is disabled while a lesson scene owns the display; do not bypass that state by synthesizing panel events. Atlas enables the same panel as a projection/editor of its active canonical snapshot. Its three control surfaces are:
- **Hemisphere** — `.hemi-chip` checkboxes (Left / Right), the global L/R master.
- **Structures / White-matter tracts** — each row has **L / R pill buttons**
  (`.pill`); click a pill to toggle that side, click the name to toggle both.
- **Pathways / Scene** — plain checkboxes carrying `dataset.id`: `or` (optic
  radiation), `swm` (superficial fibres), `anterior` (anterior pathway), `brain`
  (cortical surface), `labels`.

Enable a leaf layer:
```js
const cb = [...document.querySelectorAll('#layers input[type=checkbox]')]
  .find(c => c.dataset.id === 'swm');
if (cb && !cb.checked) cb.click();
```

Isolate ONE layer via the scene graph — `mniGroup` is the scene child with
`matrixAutoUpdate === false`; its children, in add order, are brain, anterior,
labels, regions, optic-radiation, tracts, SWM (SWM is last):
```js
let mni; window.__view.scene.traverse(o => { if (o.isGroup && o.matrixAutoUpdate === false) mni = o; });
const swm = mni.children[mni.children.length - 1];
mni.children.forEach(k => { k.visible = (k === swm); });
swm.visible = true; swm.traverse(o => { o.visible = true; });
```

## Controls (DOM ids)
Workspace: `#lessons-trigger`, `#lesson-drawer`, `#back-to-atlas`, `#return-to-lesson`, `#atlas-workspace`, and `#explore-scene-trigger`.

Lesson/import: `#lesson-import-trigger`, `#lesson-import-dialog`, `#lesson-import-source`, `#lesson-import-file`, `#lesson-import-validate`, `#lesson-import-open`, `#visual-selector`, `#scene-previous`, `#scene-next`, transition-only `#scene-skip`, `#model-sources-trigger`, and `#fidelity-close`.

Atlas camera: `[data-explore-camera]` Zoom/Pan buttons and `#reset`.

Retained viewer panel: `#play` play/pause activity · `#speed` activity speed · `#clip` cutaway (near-hemisphere clip plane) · `#tissue` surface opacity · `[data-view]` camera presets (`lateral` / `top` / `post` / `ant`) · `#spin` auto-rotate outside canonical Atlas control · `#reset` Atlas or scene-inspection entry view.

## What each layer honestly represents
Describe layers by what the data supports (this mirrors the honesty rule in
`AGENTS.md`):
- **Optic radiation** (`or`, amber) — REAL HCP-1065 streamlines; the flowing dots
  are DIRECTED (LGN→V1) because that pathway has a real direction.
- **White-matter tracts** — REAL population association-tract contours with
  MODELED stochastic code-like impulses. Each event independently samples one
  of two endpoint directions from an explicit 50/50 assumption; diffusion MRI
  does not measure polarity. Timing, inhibition, and speed are illustrative.
- **Superficial fibres** (`swm`, violet) — REAL cortico-cortical short-fibre
  ORIENTATION as a static grain; dots follow independently phased, bounded
  sinusoids around fixed contour homes with **no net direction** (none is
  measured). Swing width ∝ local fibre length.
- **Anterior pathway** (`anterior`) — SCHEMATIC eye→chiasm→LGN and its flow dots.
- **Structures** — Jülich-Brain MPM region shells (real bilateral, fresnel
  outlines).

Never describe association streamline order as biological polarity or the 50/50
model as measured anatomy. Never narrate SWM/U-fibre vibration as traveling flow.
