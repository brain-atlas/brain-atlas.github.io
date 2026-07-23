# Runtime performance

**Last measured:** 2026-07-23

**Tracking:** `brain-atlas-zmq.9`; re-profiled for `brain-atlas-zmq.31`; render policy hardened by `brain-atlas-zmq.19`
**Profile:** `scripts/browser/performance.spec.cjs`

## Loading policy

The WebGL gate keeps Three.js and anatomical assets out of no-WebGL sessions. After the gate succeeds, `src/main.js` starts the assets that both Atlas Home and the reference lesson need immediately:

- cortical GLB;
- optic-radiation JSON;
- the 21 kB region manifest;
- association-tract geometry and activity metadata;
- the compact endpoint-classification tuples used by association and SWM queries; and
- the renderer bundle.

The lesson shell also loads the small authored endpoint-filter preset catalog with the entity and fidelity catalogs before the WebGL gate. The 476 kB uncompressed endpoint tuple artifact loads only after that gate; association readiness waits for its validated runtime index, and lazy SWM loading reuses the same index. Neither file contains atlas voxels or adds a runtime transform.

The first canonical visibility snapshot starts independently packaged optional geometry:

- each bilateral region OBJ pair loads once, when its stable region ID first becomes visible; and
- the 2.8 MB SWM JSON loads once, when `layer.swm` first becomes visible.

Atlas Home's authored default shows every region and SWM, so it still requests the complete set. A direct `?lesson=retina-to-v1` entry now needs cortex, optic radiation, LGN, V1, V2, V3v, V3d, and SWM because the topic overview displays the shared-early endpoint subset. Later scenes request only their additional regions through the same canonical visibility binding. This policy changes request timing only; it adds no renderer, filter path, coordinate transform, or scientific claim.

The 2.4 MB `tracts.json` file contains both panel metadata and all association geometry. It remains eager because safe deferral would require a new generated metadata asset and an asset-pipeline change. Packaging region text meshes into one indexed binary GLB also remains future work.

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
| App ready | 2.562 s (2.559–2.578) | 2.619 s (2.618–2.631) |
| Requested assets settled | 5.287 s (5.206–5.287) | 13.129 s (13.125–13.133) |
| Encoded anatomical/catalog bytes | 4,386,491 | 14,778,300 |
| Resource requests | 25 | 105 |
| JS heap after settling | 96.5 MiB (87.3–98.7) | 157.5 MiB (139.7–162.9) |
| Long tasks | 6 | 6 |
| Longest task | 312 ms (309–323) | 376 ms (373–384) |
| 2 s frame sample, p95 interval | 9.2 ms (9.2–9.3) | 9.3 ms (9.2–16.7) |
| Canvas pixel ratio | 2 | 2 |

Demand loading reduced the direct lesson's initial encoded anatomical/catalog transfer by **70.3%** relative to complete Atlas Home. The direct entry now pays for the active shared-early SWM and V2/V3 shells, so it transfers 1.72 MB more than the earlier V1-only entry measurement. App-ready time remains close to Atlas Home because the shared renderer, cortex, optic radiation, monolithic tract data, and compact endpoint index load eagerly after the WebGL gate. The larger Atlas transfer and parsing work continues after the app exposes its semantic shell.

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
