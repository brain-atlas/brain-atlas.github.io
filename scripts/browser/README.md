# Browser verification

The checked-in Explore tests exercise the development-only `window.__lesson` and
`window.__view` inspection ports. They intentionally use an external Playwright
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

Set `HEADED=1` for visual review. The matrix covers scene and global entry,
actual-camera preservation, every canonical viewer axis, semantic and pointer
camera controls, exact Return/Escape, nested Model & sources Escape precedence,
repeated one-canvas cycles, reparented renderer aspect, 320 px compact and
short-wide layouts, live reduced motion, imported lessons, no-WebGL, and
renderer-import failure. The Chromium run also injects real touch input to verify
lesson scrolling versus Explore camera capture.
