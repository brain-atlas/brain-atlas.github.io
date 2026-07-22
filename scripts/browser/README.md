# Browser verification

The checked-in Atlas, Lesson, and workspace tests exercise the development-only
`window.__lesson` and `window.__view` inspection ports. They intentionally use an external Playwright
harness rather than adding a second browser-test dependency to the application.

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

Set `HEADED=1` for visual review. `animation-continuity.spec.cjs` audits every playing
entry/instructional view after camera settlement in wide and compact layouts, including
model clocks, draw ranges/checksums, in-frame motion, V1-proximal optic events and caps,
selected association groups, and distinct Skip/Pause/Play/reduced-motion semantics.
The broader matrix covers Atlas-as-Home, the responsive Lessons drawer, checked and
local activation, direct/static routes, Back/Forward and
reload recovery, persistent global state, temporary scene inspection, actual-camera
preservation, every canonical viewer axis, semantic and pointer camera controls,
exact Atlas/Lesson Return, repeated one-canvas cycles, stage aspect, compact and
short-wide layouts, live reduced motion, no-WebGL, and renderer-import failure. The
Chromium run also injects real touch input to verify Lesson scrolling versus Atlas
camera capture.
