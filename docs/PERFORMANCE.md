# Runtime performance

**Last measured:** 2026-07-23

**Tracking:** `brain-atlas-zmq.9`; re-profiled for `brain-atlas-zmq.31`; render policy hardened by `brain-atlas-zmq.19`
**Profile:** `scripts/browser/performance.spec.cjs`

## Loading policy

The WebGL gate keeps Three.js and anatomical assets out of no-WebGL sessions. After the gate succeeds, `src/main.js` starts the assets that both Atlas Home and the reference lesson need immediately:

- cortical GLB;
- optic-radiation JSON;
- the 21 kB region manifest;
- the checked 1.4 kB geometry-free association metadata projection used by readiness and the Viewer panel;
- the compact endpoint-classification tuples used by association and SWM queries; and
- the renderer bundle.

The lesson shell also loads the small authored endpoint-filter preset catalog with the entity and fidelity catalogs before the WebGL gate. The 476 kB uncompressed endpoint tuple artifact loads only after that gate; association readiness waits for its validated runtime index, and lazy SWM loading reuses the same index. Neither file contains atlas voxels or adds a runtime transform.

The first canonical visibility snapshot starts independently packaged optional geometry:

- each bilateral region OBJ pair loads once, when its stable region ID first becomes visible;
- the 2.8 MB SWM JSON loads once, when `layer.swm` first becomes visible; and
- the unchanged 2.4 MB `tracts.json`, association activity metadata, and endpoint-backed event pools load once when any named association tract first becomes visible.

`public/data/tracts_metadata.json` is the exact geometry-free projection of `space`, `source`, and each tract's `id`, `name`, `stream`, `color`, and point count. `src/tract-metadata.js` owns projection and runtime matching, `scripts/project-tract-metadata.mjs` deterministically prints the projection, and `test/tract-metadata.test.js` rejects source, space, or record drift from `tracts.json` before geometry can bind. Placeholder tract groups retain canonical visibility, hemisphere, selection, and inspection state while geometry is absent, so late children inherit the current material factors rather than creating another state path.

Atlas Home's authored default shows every region, tract, and SWM, so it still requests the complete set immediately after the first canonical snapshot. A direct `?lesson=retina-to-v1` entry needs cortex, optic radiation, LGN, V1, V2, V3v, V3d, and SWM because the topic overview displays the shared-early endpoint subset, but it does not request association geometry until the first downstream scene shows ILF/IFOF. Later scenes request only their additional regions through the same canonical visibility binding. This policy changes request timing only; it adds no renderer, filter path, coordinate transform, geometry change, or scientific claim. Packaging region text meshes into one indexed binary GLB remains future work.

## Runtime render policy

Active playback, authored camera/visibility transitions, OrbitControls damping/input, and auto-rotate continue to request frames. A visible paused or settled view instead draws only after an explicit invalidation from controls, canonical/UI state, inspection, resize, or asynchronous asset completion. When the document is hidden or the stage becomes fully offscreen, the renderer cancels its pending frame and all anterior, optic-radiation, association-impulse, and SWM model clocks stop without changing requested playback. Returning visibility zeros the first model delta, shifts any in-progress transition clock by its suspended duration, and resumes only requested non-settled playback; reduced motion and explicit Pause remain authoritative.

The policy intentionally has no keyboard/pointer/touch/scroll inactivity timeout. Passive lesson reading and assistive-technology use cannot be distinguished reliably from abandonment, and the current fixed/sticky lesson stage normally remains observable while reading. `test/viewer-power.test.js` freezes this decision. `scripts/browser/power-rendering.spec.cjs` verifies hidden and simulated fully-offscreen states, explicit Pause, reduced motion, accessible status, model clocks, and render counts. These checks establish scheduler behavior, not physical-device battery savings.

## Mobile-emulation evidence

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

## Deferred device limits

No physical iPhone, iPad, or Android device was available for this pass. Before publication expands beyond the current MVP gate, test at least one current iOS Safari device and one mid-range Android Chromium device for:

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
