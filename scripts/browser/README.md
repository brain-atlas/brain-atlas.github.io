# Browser verification

The checked-in Atlas, Lesson, and workspace tests exercise the development-only
`window.__lesson` and `window.__view` inspection ports. They intentionally use an external Playwright
harness rather than adding browser-test dependencies to the application. The harness needs
`@playwright/test`; `hardening.spec.cjs` also needs `axe-core` for automated WCAG checks.

```bash
mkdir -p /tmp/brain-atlas-playwright && cd /tmp/brain-atlas-playwright
npm init -y
npm install @playwright/test axe-core
```

Start a clean development server:

```bash
npm run dev -- --host 127.0.0.1 --port 5199
```

From a temporary harness containing `@playwright/test`, run Firefox:

```bash
NODE_PATH="$PWD/node_modules" \
BRAIN_ATLAS_URL=http://127.0.0.1:5199/ \
BROWSER=firefox \
npx playwright test \
  --config=/absolute/path/to/brain-atlas/scripts/browser/playwright.config.cjs
```

For a system Chromium build:

```bash
NODE_PATH="$PWD/node_modules" \
BRAIN_ATLAS_URL=http://127.0.0.1:5199/ \
BROWSER=chromium \
PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" \
npx playwright test \
  --config=/absolute/path/to/brain-atlas/scripts/browser/playwright.config.cjs
```

For `npm run build && npm run preview`, set `PRODUCTION_PREVIEW=1` and run
`scripts/browser/home-production.spec.cjs`; those checks require production debug hooks
to be absent.

Set `HEADED=1` for visual review. `fibre-endpoint-filter.spec.cjs` verifies accessible
preset/custom controls, all/within/touches/unordered-between semantics, explicit
unknown/ambiguous handling, L/R inheritance, canonical Atlas projection, count summaries,
coherent association/SWM geometry/activity masks, and the development `lastRebuildMs` diagnostic against the 120 ms bound. `animation-continuity.spec.cjs` audits every playing
entry/instructional view after camera settlement in wide and compact layouts, including
model clocks, draw ranges/checksums, in-frame motion, V1-proximal optic events and caps,
selected association groups, and distinct Skip/Pause/Play/reduced-motion semantics.
The broader matrix covers Atlas-as-Home, the responsive Lessons drawer, checked and
local activation, direct/static routes, Back/Forward and
reload recovery, persistent global state, lesson-derived Atlas handoff from the actual
camera and filters, compact Return/Exit controls, checked/local closeout and default reset,
every canonical viewer axis, semantic and pointer camera controls, exact Return, repeated
one-canvas cycles, stage aspect, compact and short-wide layouts, live reduced motion,
no-WebGL, and renderer-import failure. `hardening.spec.cjs` adds settled-state axe scans,
keyboard focus/announcement traversal, 44 px camera targets, 200%-equivalent layout checks,
and canonical visibility-driven asset requests. The Chromium run also injects real touch
input to verify Lesson scrolling versus Atlas camera capture.

## Mobile performance profile

`performance.spec.cjs` is opt-in because it applies 4× CPU and mobile-network throttling
and opens fresh direct-Lesson and complete-Atlas contexts. Run it against a static preview:

```bash
NODE_PATH=/tmp/brain-atlas-playwright/node_modules \
BRAIN_ATLAS_URL=http://127.0.0.1:5180/ \
BROWSER=chromium \
PERFORMANCE_PROFILE=1 \
DEVICE_SCALE_FACTOR=3 \
PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" \
/tmp/brain-atlas-playwright/node_modules/.bin/playwright test \
  --config=/absolute/path/to/brain-atlas/scripts/browser/playwright.config.cjs \
  /absolute/path/to/brain-atlas/scripts/browser/performance.spec.cjs --repeat-each=3
```

The test prints and attaches JSON evidence. [`docs/PERFORMANCE.md`](../../docs/PERFORMANCE.md)
records the current production measurements and explains why desktop-hosted emulation does
not substitute for physical iOS and Android testing.
