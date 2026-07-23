# Runtime performance

**Last measured:** 2026-07-22

**Tracking:** `brain-atlas-zmq.9`
**Profile:** `scripts/browser/performance.spec.cjs`

## Loading policy

The WebGL gate keeps Three.js and anatomical assets out of no-WebGL sessions. After the gate succeeds, `src/main.js` starts the assets that both Atlas Home and the reference lesson need immediately:

- cortical GLB;
- optic-radiation JSON;
- the 21 kB region manifest;
- association-tract geometry and activity metadata; and
- the renderer bundle.

The first canonical visibility snapshot starts independently packaged optional geometry:

- each bilateral region OBJ pair loads once, when its stable region ID first becomes visible; and
- the 2.8 MB SWM JSON loads once, when `layer.swm` first becomes visible.

Atlas Home's authored default shows every region and SWM, so it still requests the complete set. A direct `?lesson=retina-to-v1` entry initially needs only cortex, optic radiation, LGN, and V1. Later cortical scenes request their additional regions and SWM through the same canonical visibility binding. This policy changes request timing only; it adds no renderer, filter path, coordinate transform, or scientific claim.

The 2.4 MB `tracts.json` file contains both panel metadata and all association geometry. It remains eager because safe deferral would require a new generated metadata asset and an asset-pipeline change. Packaging region text meshes into one indexed binary GLB also remains future work.

## Mobile-emulation evidence

The checked profile runs the static production preview in system Chromium with:

- 390×844 CSS pixels;
- device scale factor 3, capped by the renderer at 2;
- touch/mobile browser context;
- 4× CPU throttling; and
- 10 Mbit/s download, 5 Mbit/s upload, and 80 ms latency.

The host was an Apple M3 Max with 128 GiB RAM running Chromium 150.0.7871.46. Three fresh runs used separate browser contexts. Values below show the median and range where the runs varied.

| Measure | Direct checked lesson | Complete Atlas Home |
|---|---:|---:|
| App ready | 2.273 s (2.262–2.290) | 2.289 s (2.262–2.290) |
| Requested assets settled | 3.789 s (3.782–3.807) | 13.091 s (13.051–13.099) |
| Encoded anatomical/catalog bytes | 2,565,565 | 14,679,519 |
| Resource requests | 16 | 103 |
| JS heap after settling | 67.4 MiB (66.8–67.6) | 109.9 MiB (109.6–113.5) |
| Long tasks | 5 | 5 |
| Longest task | 238–254 ms | 249–260 ms |
| 2 s frame sample, p95 interval | 9.2 ms | 9.2–9.4 ms |
| Canvas pixel ratio | 2 | 2 |

Demand loading reduced the direct lesson's initial encoded anatomical/catalog transfer by **82.5%** relative to complete Atlas Home. App-ready time stayed similar because the shared renderer, cortex, optic radiation, and monolithic tract data remain eager. The larger Atlas transfer and parsing work continued after the app exposed its semantic shell.

The frame sample shows that this host kept scheduling animation under the stated throttle after assets settled. It does **not** measure a phone GPU, battery use, thermal throttling, mobile Safari, or a cellular radio. Long tasks above 200 ms remain visible during initial parsing. Atlas Home also retains the full 14.7 MB encoded anatomical/catalog payload and continuous render loop.

## Deferred device limits

No physical iPhone, iPad, or Android device was available for this pass. Before publication expands beyond the current MVP gate, test at least one current iOS Safari device and one mid-range Android Chromium device for:

- cold-cache transfer and parse time;
- WebGL memory pressure and context loss;
- sustained frame pacing, battery use, and thermal throttling;
- touch and browser-toolbar viewport changes; and
- recovery after backgrounding or screen lock.

`brain-atlas-zmq.19` owns the separate idle/inactive render policy. A future region-asset Bead should measure an indexed binary replacement for the many text OBJ requests. Do not infer either improvement from this profile.

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

The profile records full JSON as a Playwright attachment and prints one `MOBILE_PERFORMANCE_PROFILE` line per run. Timing values are evidence, not fixed CI budgets. The test enforces only successful loading, clean requests/console output, the pixel-ratio cap, direct-lesson asset deferral, and freedom from catastrophic frame starvation.
