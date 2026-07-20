---
name: use-the-atlas
description: How an agent drives and inspects the running brain-atlas viewer — start it, toggle layers, frame the camera, screenshot, and read what each layer honestly represents.
---

# Using the brain-atlas viewer

For an agent (or person) operating the running viewer — to verify a change, capture
a view, or answer "what am I looking at". The app is a single Three.js scene
(`src/main.js`); there is no backend.

## Start it
```bash
npm run dev                         # Vite → http://localhost:5180 (port set in vite.config.js)
# or, for stable / HMR-free inspection:
npm run build && npm run preview    # → http://localhost:5180
```
It is a heavy WebGL page — prefer the static preview when inspecting; HMR reloads
can churn the GPU context.

## The development-only debug hook
In development mode, `src/main.js` exposes
`window.__view = { camera, controls, scene, THREE }`. Use it to frame, freeze, and
introspect from Playwright or the console. The `import.meta.env.DEV` guard removes
it from production builds.

## Driving it with the Playwright MCP
- `browser_navigate` to the URL, then `browser_console_messages(level:"error")` to
  confirm a clean load (a `favicon.ico` 404 is harmless).
- Freeze rotation before shooting: `window.__view.controls.autoRotate = false`.
- `browser_take_screenshot` — the MCP writes only inside its allowed roots (the
  session's working directory / its `.playwright-mcp/`), which may be a *different*
  repo than brain-atlas. Treat those images as throwaway; don't leave them in an
  unrelated project.
- The panel is built only after `regions.json` loads — poll for a checkbox before
  clicking it. After changing a draw range, wait two `requestAnimationFrame`s
  before reading it back.

## Layers and how to toggle them
The panel lives in `#layers`. Three control surfaces:
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
`#play` play/pause flow · `#speed` flow speed · `#clip` cutaway (near-hemisphere
clip plane) · `#tissue` surface opacity · `[data-view]` camera presets
(`lateral` / `top` / `post` / `ant`) · `#spin` auto-rotate · `#reset` home view.

## What each layer honestly represents
Describe layers by what the data supports (this mirrors the honesty rule in
`AGENTS.md`):
- **Optic radiation** (`or`, amber) — REAL HCP-1065 streamlines; the flowing dots
  are DIRECTED (LGN→V1) because that pathway has a real direction.
- **White-matter tracts** — REAL bundles; coloured flow reads as directed stream
  activity along known pathways.
- **Superficial fibres** (`swm`, violet) — REAL cortico-cortical short-fibre
  ORIENTATION as a static grain; the dots vibrate ALONG each contour with **no net
  direction** (none is measured). Swing width ∝ local fibre length.
- **Anterior pathway** (`anterior`) — SCHEMATIC eye→chiasm→LGN and its flow dots.
- **Structures** — Jülich-Brain MPM region shells (real bilateral, fresnel
  outlines).

Never narrate the undirected layers (SWM, association tracts) as though their flow
had a direction.
