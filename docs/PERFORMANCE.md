# Runtime performance

**Last measured:** 2026-10-16 (browser-mode comparison); Jülich catalog: 2026-09-06; historical baseline: 2026-07-23

**Tracking:** `brain-atlas-zmq.9`; re-profiled for `brain-atlas-zmq.31`; render policy hardened by `brain-atlas-zmq.19`
**Profile:** `scripts/browser/performance.spec.cjs`

## Loading policy

The WebGL gate keeps Three.js and anatomical assets out of no-WebGL sessions. After the gate succeeds, `src/main.js` starts the assets that both Atlas Home and the reference lesson need immediately:

- cortical GLB;
- optic-radiation JSON;
- the unchanged 21 kB legacy region manifest plus the 137 kB complete Jülich catalog;
- the checked 1.4 kB geometry-free association metadata projection used by readiness and the Viewer panel;
- the compact endpoint-classification tuples used by association and SWM queries; and
- the renderer bundle.

The lesson shell also loads the small authored endpoint-filter preset catalog with the entity and fidelity catalogs before the WebGL gate. The 476 kB uncompressed endpoint tuple artifact loads only after that gate; association readiness waits for its validated runtime index, and lazy SWM loading reuses the same index. Neither file contains atlas voxels or adds a runtime transform.

The first canonical visibility snapshot starts independently packaged optional geometry:

- each bilateral region OBJ pair loads when its stable region ID first becomes visible; successful hemispheres stay retained and failed hemispheres can retry;
- the 2.8 MB SWM JSON loads once, when `layer.swm` first becomes visible; and
- the unchanged 2.4 MB `tracts.json`, association activity metadata, and endpoint-backed event pools load once when any named association tract first becomes visible.

`public/data/tracts_metadata.json` is the exact geometry-free projection of `space`, `source`, and each tract's `id`, `name`, `stream`, `color`, and point count. `src/tract-metadata.js` owns projection and runtime matching, `scripts/project-tract-metadata.mjs` deterministically prints the projection, and `test/tract-metadata.test.js` rejects source, space, or record drift from `tracts.json` before geometry can bind. Placeholder tract groups retain canonical visibility, hemisphere, selection, and inspection state while geometry is absent, so late children inherit the current material factors rather than creating another state path.

Atlas Home's authored default shows the established 45 regions, every tract, and SWM. The other 112 Jülich regions start hidden and load only after explicit activation, not catalog discovery. A direct `?lesson=retina-to-v1` entry needs cortex, optic radiation, LGN, V1, V2, V3v, V3d, and SWM because the topic overview displays the shared-early endpoint subset, but it does not request association geometry until the first downstream scene shows ILF/IFOF. Later scenes request only their additional regions through the same canonical visibility binding. This policy changes request timing only; it adds no renderer, filter path, coordinate transform, geometry change, or scientific claim. Packaging region text meshes into one indexed binary GLB remains future work.

## Runtime render policy

Active playback, authored camera/visibility transitions, OrbitControls damping/input, and auto-rotate continue to request frames. A visible paused or settled view instead draws only after an explicit invalidation from controls, canonical/UI state, inspection, resize, or asynchronous asset completion. When the document is hidden or the stage becomes fully offscreen, the renderer cancels its pending frame and all anterior, optic-radiation, association-impulse, and SWM model clocks stop without changing requested playback. Returning visibility zeros the first model delta, shifts any in-progress transition clock by its suspended duration, and resumes only requested non-settled playback; reduced motion and explicit Pause remain authoritative.

The policy intentionally has no keyboard/pointer/touch/scroll inactivity timeout. Passive lesson reading and assistive-technology use cannot be distinguished reliably from abandonment, and the current fixed/sticky lesson stage normally remains observable while reading. `test/viewer-power.test.js` freezes this decision. `scripts/browser/power-rendering.spec.cjs` verifies hidden and simulated fully-offscreen states, explicit Pause, reduced motion, accessible status, model clocks, and render counts. These checks establish scheduler behavior, not physical-device battery savings.

## Reconciliation checks (2026-09-06)

`brain-atlas-s4q` removes repeated work without changing datasets or activity models:

- opacity-only frames and unrelated Atlas edits no longer recalculate endpoint membership
  or rewrite static fibre geometry; changed query/global hemispheres calculate once, and
  late geometry reuses the retained result;
- state synchronization preserves playing model clocks instead of implicitly restarting
  them; authored scene activation/Restart remains explicit;
- same-lesson resume retains lesson DOM/controller/adapter, while unchanged Atlas source
  disclosures retain their nodes and native expanded state; and
- mouse hover bursts coalesce to one pick per frame, with cancellation and immediate tap
  activation.

`scripts/browser/explore-reconciliation.spec.cjs` checks buffer versions, clock continuity,
DOM identity, delayed geometry, immediate Skip, image/no-WebGL resume, and raycast calls.
These are deterministic avoided-work checks, not timing or physical-device measurements.
The historical loading/frame measurements below have not been remeasured for this change.

## Complete Jülich catalog measurements (2026-09-06)

`brain-atlas-yum.14.2` retains separate OBJ pairs. The catalog costs 136,981 bytes
(13,477 gzip-9); 90 unchanged default meshes cost 11,648,359 bytes. The additional
224 meshes cost 17,549,664 bytes, for 314 files / 29,198,023 bytes total. One measured
Medial Accumbens pair costs 23,709 bytes. Search alone requests no optional mesh.

`scripts/browser/julich-performance.cjs` samples default, one pair, then all optional
regions enabled through the existing controls. Chromium 152.0.7977.64 on this Mac
uses 390×844 touch/mobile emulation, DPR 3 (renderer capped at 2), CPU 4×, 10/5 Mbit/s,
and 80 ms latency. These are one-run observations, not device budgets or medians.

| Measure | Default | + one pair | All 157 regions visible/retained |
|---|---:|---:|---:|
| Region requests | 90 | 92 | 314 |
| Region bytes (preview, uncompressed) | 11,648,359 | 11,672,068 | 29,198,023 |
| Draw calls per sampled frame (dev) | 142 | 144 | 366 |
| Submitted triangles per frame (dev) | 636,534 | 637,662 | 1,364,254 |
| Renderer geometries (dev) | 139 | 141 | 363 |
| Geometry attribute/index bytes (dev) | 42,672,360 | 42,753,576 | 95,068,200 |
| JS heap bytes (production) | 96,025,007 | 109,262,333 | 195,171,126 |
| Two-second rAF p95 interval (production) | 16.8 ms | 16.7 ms | 16.7 ms |
| Cumulative region-transfer completion (production) | 11.990 s | 14.141 s | 30.035 s |

Production shell readiness was 1.201 s. Cumulative times include intervening
2-second samples and command work; subtracting them is **not** pure pair latency.
All three states had zero page/console errors and no horizontal overflow.
Geometry metrics use the existing development scene's `onAfterRender` callback to
read `renderer.info`; production exposes no diagnostics. Attribute/index bytes are
CPU buffer sizes approximating geometry upload storage, **not total GPU allocation**:
they exclude driver overhead, render targets, textures, and duplicate driver storage.
Submitted triangles include multipass drawing and differ from unique mesh triangles.
The rAF sample measures scheduling, not GPU frame completion. Heap readings depend
on GC. This is mobile emulation on desktop hardware, not physical-phone evidence.

**Shipping decision:** ship the complete set as optional independent pairs, retain
the 90-request default, and provide no optional bulk-enable control. Successful
geometry remains resident until reload, including after hiding it: sequential
exploration can reach the measured worst case. The 95 MB geometry-buffer estimate
and 366 draw calls are not certified for phone GPUs. Physical-device memory/context
loss and sustained frame pacing remain unverified; use a few regions at once and
reload to reclaim retained geometry. No bundled-format gain is claimed.

Replay with an external `playwright-core` installation (no app dependency added):

```bash
NODE_PATH=/path/to/external/node_modules \\
PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chromium \\
BRAIN_ATLAS_URL=http://localhost:5180/ node scripts/browser/julich-performance.cjs
# Repeat against the development server for renderer metrics.
# Guided-lesson failure/retry regression:
NODE_PATH=/path/to/external/node_modules \\
PLAYWRIGHT_EXECUTABLE_PATH=/path/to/chromium \\
BRAIN_ATLAS_URL=http://localhost:5180/ node scripts/browser/region-recovery.cjs
```

## Historical mobile-emulation evidence (2026-07-23)

The checked profile runs the static production preview in system Chromium with:

- 390×844 CSS pixels;
- device scale factor 3, capped by the renderer at 2;
- touch/mobile browser context;
- 4× CPU throttling; and
- 10 Mbit/s download, 5 Mbit/s upload, and 80 ms latency.

The host was an Apple M3 Max with 128 GiB RAM running Chromium 150.0.7871.46. Three fresh post-lesson-filter runs used separate browser contexts. Values below show the median and range where the runs varied.

| Measure | Direct checked lesson | Complete Atlas Home |
|---|---:|---:|
| App ready | 1.052 s (1.049–1.064) | 1.076 s (1.070–1.095) |
| Requested assets settled | 4.682 s (4.677–4.703) | 13.177 s (13.163–13.198) |
| Encoded anatomical/catalog bytes | 3,732,455 | 14,778,767 |
| Resource requests | 24 | 106 |
| JS heap after settling | 76.5 MiB (47.6–76.7) | 113.2 MiB (107.8–132.6) |
| Long tasks | 5 (4–5) | 6 |
| Longest task | 213 ms (213–214) | 232 ms (222–235) |
| 2 s frame sample, p95 interval | 9.3 ms (9.2–9.3) | 9.3 ms (9.2–9.3) |
| Canvas pixel ratio | 2 | 2 |

Demand loading reduced the direct lesson's initial encoded anatomical/catalog transfer by **74.7%** relative to complete Atlas Home. The direct entry still pays for the active shared-early SWM and V2/V3 shells, but deferring the compressed association payload removes 654 kB of initial transfer and, more importantly on this profile, its main-thread geometry construction. App-ready time fell from the prior 2.562 s direct/2.619 s Atlas measurement to about 1.05/1.08 s because readiness now needs only the checked tract metadata projection; complete Atlas geometry continues loading after the semantic shell is ready. The Atlas settled transfer is intentionally unchanged apart from the 1.4 kB projection because its authored default shows every tract.

The frame sample shows that this host kept scheduling active animation under the stated throttle after assets settled. It does **not** measure a phone GPU, battery use, thermal throttling, mobile Safari, or a cellular radio. Long tasks above 300 ms remain visible during initial parsing. Atlas Home also retains the full 14.7 MB encoded anatomical/catalog payload; its authored active/auto-rotate states still render continuously until paused, settled, hidden, or offscreen.

## Headed versus headless comparison (2026-10-16)

`brain-atlas-2h9x` compared the managed browser's visible, headless, and offscreen
headed modes. **Use headless for routine automated checks; retain targeted visible
browser checks.** This is evidence of comparable behavior in one automation
profile, not certification of its GPU backend or physical-device performance.
No application code, dependencies, browser configuration files, or system settings
changed. The existing Playwright config already defaults to headless; `HEADED=1`
selects headed execution. These measurements used the Pi browser tool, not that
external Playwright runner.

### Controlled environment and method

- Source: `2062d64f544d05121a7113a618c3d46fc462f218`, unchanged during sampling.
- Host: MacBook Pro Mac15,9, Apple M3 Max, 16 CPU / 40 GPU cores, 128 GB;
  macOS 27.0.1 build 26A434, Darwin 27.0.0 arm64; built-in 3456×2234 display.
- Browser: managed BetterChromium **153.0.8010.36**, same executable and persistent
  profile across restarts. Page UA reported Chrome/153.0.0.0.
- Common observed launch flags: `--use-gl=angle --use-angle=gl`,
  `--fingerprint=57550 --fingerprint-locale=en-US --fingerprint-platform=macos`.
  Headless added `--headless`; offscreen added `--window-size=1512,982` and
  `--window-position=32000,32000`. No backend flags were changed for this work.
- Same development server: `node node_modules/vite/bin/vite.js --host 127.0.0.1
  --port 5213 --strictPort`, Node 24.19.0, npm 11.17.0. Development was necessary
  for existing `window.__view` diagnostics; no source edits or HMR reloads occurred
  during measurement. These are not production-build timing measurements.
- Atlas Home at `/`, viewport 1440×1000 CSS pixels, DPR 1, canvas 1059×842;
  default bilateral layers, no labels, activity playing, stationary default camera
  `[210,75,-195]` (floating-point rounding omitted). No added CPU/network throttle.
- Wait for `fibreFilter.eligibleAssociationContours > 0`, `__view.swm`, and 90
  loaded region meshes under the existing MNI group's region child. Each mode
  used the same page-evaluation probe: preserve/restore `scene.onAfterRender`,
  capture `renderer.info`, then collect three consecutive rAF blocks, each ending
  when its timestamp span reaches at least 2000 ms. Discard the first timestamp;
  sort intervals for median and nearest-rank p95. Check increasing render count,
  optic-radiation time and changed anterior position-buffer values, unchanged
  camera, `!gl.isContextLost()`, and `gl.getError() === gl.NO_ERROR`.
- Through the enabled `Fibre preset` combobox, select dorsal → ventral → all,
  three rounds as warmup followed by three measured rounds. Read back selected
  value, canonical query/counts and `fibreFilter.lastRebuildMs` after each change.
  This timer covers query plus CPU geometry rebuild, **not GPU upload/completion
  or end-to-end input latency**.
- Capture and inspect each mode's actual Atlas screenshot and browser console.
  Screenshots were not synchronized to an identical stochastic activity phase;
  visual comparison is qualitative, not a pixel-equality assertion.

### Results

All modes provided WebGL 2. The visible context reported antialias/depth and alpha
on, `preserveDrawingBuffer` off; attributes were not separately sampled in the
other modes. The last sampled render in each mode submitted 142 draw calls,
636,534 triangles and 273,640 lines, with 139 geometries and two textures.
Point counts varied with activity (22,278 / 22,129 / 22,278 respectively), not
static geometry loss. Each mode rendered 24 additional frames across the three
blocks, advanced anterior travel by 48 mm and optic model time by 0.048, and kept
the camera fixed. Those model increments reflect the existing frame-delta clamp
and model scaling; they do not mean animation kept pace with elapsed wall time.
All modes reported the document/stage visible, playback active, and no suspension.
No WebGL error/context loss or console error was observed. All emitted the same
OpenGL warning, `GPU stall due to ReadPixels`, during screenshot-enabled testing.

Each comma-separated timing cell retains all three observations, rounded to 0.1 ms:

| Measure | Visible | Headless | Offscreen headed |
|---|---|---|---|
| rAF median interval (ms) | 308.4, 308.3, 300.0 | 300.0, 300.0, 300.0 | 300.0, 300.0, 300.0 |
| rAF p95 interval (ms) | 408.2, 400.0, 391.7 | 399.9, 416.7, 400.0 | 308.4, 408.4, 400.0 |
| Block elapsed time (ms) | 2233.3, 2224.9, 2191.7 | 2216.6, 2216.6, 2199.9 | 2108.4, 2200.0, 2200.0 |
| Dorsal rebuild (ms) | 5.1, 4.8, 5.0 | 5.0, 5.2, 4.8 | 5.1, 5.2, 4.9 |
| Ventral rebuild (ms) | 3.6, 3.4, 3.5 | 3.5, 3.6, 3.5 | 3.6, 3.5, 3.6 |
| All-fibre rebuild (ms) | 12.1, 11.7, 11.8 | 11.3, 11.9, 11.4 | 11.6, 11.6, 12.0 |

Every rAF block contained only seven intervals: its p95 is consequently its
maximum, not a robust tail estimate. The roughly 3 fps scheduling rate is poor in
**all** modes. Short sequential samples, unequal time since page load, shared host
load, persistent caches, and screenshot instrumentation preclude a statistical
speed ranking or diagnosis of that slowdown. No historical timing is a matched
control for this browser/profile. No headless-specific regression was observed;
no application regression or hardware-acceleration claim follows from this result.

All nine measured filter changes per mode produced the same canonical queries
and counts: dorsal 1,178 association + 2,002 short-range = 3,180; ventral
693 + 1,137 = 1,830; all 2,880 + 15,000 = 17,880. Screenshots showed the same
framing, cortex, region/tract overlays and schematic anterior pathway. Model
clocks and changing position buffers established continuing activity, not smooth
presentation or exhaustive lesson-scene visibility.

### Backend, offscreen, and remaining checks

The page reported `ANGLE (Apple, ANGLE Metal Renderer: Apple M4 Pro, Unspecified
Version)` in **every mode**, despite the actual M3 Max host and explicit
`--use-angle=gl` launch flag. Treat this fingerprinted string (and reported limits,
including maximum texture size 8192) as page-facing metadata, **not driver proof**.
The guarded browser rejected `chrome://gpu/`, and exposes no CDP session method;
actual hardware-versus-software rasterization remains unverified. Do not use these
runs to approve GPU budgets or change ANGLE/system settings to chase timings.

The host accepted offscreen mode and rendering continued. However, page-reported
window origin was `[216,135]`, not the requested `[32000,32000]`; fingerprinting or
window-manager placement may intervene. A read-only OS frontmost-app check found
Firefox Developer Edition, but there was no paired launch-time focus trace.
An OS window-bounds probe could not run because Swift was unavailable. Therefore
**offscreen is not certified non-focus-stealing or physically off-desktop** here.
`document.hasFocus()` was true in all modes and cannot prove desktop focus.
Prefer headless when avoiding desktop windows matters.

Routine headless checks may cover DOM/accessibility semantics, canonical state,
loading/error paths, filter counts, renderer diagnostics, activity-buffer changes,
and screenshot regressions within a pinned harness. Recheck parity after browser,
GPU-driver, launch-profile, shader, or renderer changes. Before relying on a release's
GPU behavior, retain a short visible smoke test in an ordinary, non-fingerprinted
supported browser: confirm backend independently; inspect transparent layering and
moving activity in Atlas plus a filtered lesson; exercise orbit/resize, Pause/Play,
and real background/resume or occlusion. Check native keyboard focus and controls
there as well. Offscreen rendering cannot replace those visible/OS checks.

This comparison did not run Firefox/Safari parity, the full lesson/browser suite,
production frame profiling, sustained thermal/battery tests, or physical phones.
It does not supersede the device limits below. Exact local screenshot references
and verification caveats are retained in `brain-atlas-2h9x`.

## Deferred device limits

Physical-device and manual-browser validation remains unverified. The owner moved
these checks out of the automated MVP readiness scope into nonblocking follow-up
`brain-atlas-g3zb` on 2026-10-16. Closing the readiness task does not certify these
capabilities or authorize publication. The follow-up covers the ordinary visible-browser
checks above, physical assistive-technology traversal, and at least one current iOS
Safari device and one mid-range Android Chromium device for:

- cold-cache transfer and parse time;
- WebGL memory pressure and context loss;
- sustained frame pacing, battery use, and thermal throttling;
- touch and browser-toolbar viewport changes; and
- recovery after backgrounding or screen lock.

The observability-aware render policy is verified in browser emulation but still lacks physical-device battery, thermal, background-tab, screen-lock, and browser-throttling measurements. A future region-asset Bead should measure an indexed binary replacement for the many text OBJ requests. Do not infer physical energy savings or binary-asset gains from the scheduler checks.

## Replay

Build and start the static preview, then run the external Playwright harness:

```bash
npm run build:publish
npx vite preview --host 127.0.0.1 --port 5210

NODE_PATH=/private/tmp/brain-atlas-playwright/node_modules \
BRAIN_ATLAS_URL=http://127.0.0.1:5210/ \
BROWSER=chromium \
PERFORMANCE_PROFILE=1 \
DEVICE_SCALE_FACTOR=3 \
PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" \
/private/tmp/brain-atlas-playwright/node_modules/.bin/playwright test \
  --config=scripts/browser/playwright.config.cjs \
  scripts/browser/performance.spec.cjs --repeat-each=3
```

The profile records full JSON as a Playwright attachment and prints one `MOBILE_PERFORMANCE_PROFILE` line per run. Timing values are evidence, not fixed CI budgets. The representative comparison uses Chromium's default rendering backend; do not force ANGLE SwiftShader, which measures software rasterization rather than this host profile. The test enforces only successful loading, clean requests/console output, the pixel-ratio cap, direct-lesson asset deferral, and freedom from catastrophic frame starvation.

Replay the power/render policy separately against the development server so its guarded diagnostics are available:

```bash
NODE_PATH=/private/tmp/brain-atlas-playwright/node_modules \
BRAIN_ATLAS_URL=http://127.0.0.1:5210/ \
BROWSER=chromium \
PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" \
/private/tmp/brain-atlas-playwright/node_modules/.bin/playwright test \
  --config=scripts/browser/playwright.config.cjs \
  scripts/browser/power-rendering.spec.cjs
```
