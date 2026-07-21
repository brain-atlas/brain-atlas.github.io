---
name: use-the-atlas
description: How an agent drives and inspects the running brain-atlas viewer — start it, toggle layers, frame the camera, screenshot, and read what each layer honestly represents.
---

# Using the brain-atlas viewer

For an agent (or person) operating the running viewer — to verify a change, capture a view, or answer "what am I looking at". `src/bootstrap.js` presents one semantic lesson around the single `src/main.js` Three.js scene; there is no backend.

## Start it
```bash
npm run dev                         # Vite → http://localhost:5180 (port set in vite.config.js)
# or, for stable / HMR-free inspection:
npm run build && npm run preview    # → http://localhost:5180
```
It is a heavy WebGL page — prefer the static preview when inspecting; HMR reloads
can churn the GPU context.

## The development-only debug hook
In development mode, `src/main.js` exposes `window.__view = { camera, controls, scene, THREE }`. `src/bootstrap.js` also exposes `window.__lesson`, containing the frozen lesson/catalog and getters for navigation/controller state. Use them to frame, freeze, navigate, and introspect from browser automation or the console. Their `import.meta.env.DEV` guards remove both hooks from production builds.

## Driving it with the Playwright MCP
- `browser_navigate` to the URL, then `browser_console_messages(level:"error")` to
  confirm a clean load (a `favicon.ico` 404 is harmless).
- Freeze rotation before shooting: `window.__view.controls.autoRotate = false`.
- `browser_take_screenshot` — the MCP writes only inside its allowed roots (the
  session's working directory / its `.playwright-mcp/`), which may be a *different*
  repo than brain-atlas. Treat those images as throwaway; don't leave them in an
  unrelated project.
- The checked-in reference lesson is intentionally marked `[DRAFT]` until `brain-atlas-zmq.25` completes. In the rendered development path, verify `window.__lesson?.lesson?.status === 'draft'`; in every path, verify visible `#lesson-status`, a `.lesson-meta .lesson-status` badge, and `[DRAFT]` in `document.title`. The DOM checks must remain true under `?no-webgl=1`, where the renderer debug object is intentionally absent. Draft is curriculum lifecycle state, not geometry/activity fidelity.
- Poll for `window.__lesson?.controllerState?.status === 'ready'` before inspecting the lesson. The layer panel is built only after `regions.json` loads and remains collapsed under **Viewer controls**; lesson policies normally disable it. After changing a draw range, wait two `requestAnimationFrame`s before reading it back.
- At page entry, `window.__lesson.navigation.activeIndex === -1`: the unnumbered topic view shows only the pathway relevant to the lesson. `#page-scroll` is the sole lesson scroller; `window.scrollX` and `window.scrollY` must remain zero. Scroll it into the four `.lesson-scene` sections or click the fixed-position `#scene-previous` / `#scene-next` actions; Previous from scene 1 restores the entry view. The global brand link returns `#page-scroll.scrollTop` to zero. In non-Explore policies, canvas `touch-action: pan-y` and disabled touch pan/zoom keep vertical swipes on this surface while mouse/trackpad drag may orbit in `look`. `#scene-skip` appears on the stage only during an active transition; the reference lesson intentionally exposes no ineffective Restart action.
- `#model-sources-trigger` opens the sole scene-specific geometry/activity status, provenance, limitation, and source surface; there is no duplicate canvas badge, stage status row, or global progress strip. `#fidelity-close` restores trigger focus and the exact `#page-scroll` position.
- To check display aspect, compare `window.__view.camera.aspect` with `document.querySelector('#stage canvas').getBoundingClientRect().width / height`. They should match to floating-point precision; the MNI group (`matrixAutoUpdate === false`) must retain equal basis lengths and positive determinant.
- Force the readable renderer-free path with `?no-webgl=1`; verify that no `main`/Three.js resource loads.

## Layers and how to toggle them
The retained panel lives in `#layers` inside `#viewer-console`. It is disabled while a lesson scene's canonical policy owns the display; do not bypass that state by synthesizing panel events. For direct free-viewer diagnostics, the three legacy control surfaces are:
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
Lesson: `#scene-previous`, `#scene-next`, transition-only `#scene-skip`, `#model-sources-trigger`, and `#fidelity-close`.

Retained viewer panel: `#play` play/pause activity · `#speed` activity speed · `#clip` cutaway (near-hemisphere clip plane) · `#tissue` surface opacity · `[data-view]` camera presets (`lateral` / `top` / `post` / `ant`) · `#spin` auto-rotate · `#reset` home view.

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
