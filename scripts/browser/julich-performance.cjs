// External playwright-core; run against dev for renderer metrics, preview for timings.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');
const percentile = values => [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1];

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 80, downloadThroughput: 10 * 1024 * 1024 / 8, uploadThroughput: 5 * 1024 * 1024 / 8 });
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const started = Date.now();
    await page.goto(process.env.BRAIN_ATLAS_URL || 'http://[::1]:5181/');
    await page.waitForFunction(() => document.querySelector('#app')?.dataset.state === 'ready');
    const readyMs = Date.now() - started;
    await page.evaluate(() => {
      performance.setResourceTimingBufferSize(2000);
      if (window.__view) window.__view.scene.onAfterRender = renderer => {
        window.__julichRender = { ...renderer.info.render, ...renderer.info.memory };
      };
    });
    const sample = async (name, expected) => {
      await page.waitForFunction(count => performance.getEntriesByType('resource').filter(e => /\/regions\/.*\.obj$/.test(e.name)).length === count, expected, { timeout: 120000 });
      if (await page.evaluate(() => Boolean(window.__view))) {
        await page.waitForFunction(count => window.__view.scene.children.find(o => o.matrixAutoUpdate === false).children[3].children.reduce((n, g) => n + g.children.length, 0) === count, expected);
      }
      const settledMs = Date.now() - started;
      const result = await page.evaluate(async () => {
        const intervals = await new Promise(resolve => {
          let first, previous;
          const values = [];
          const frame = time => {
            first ??= time;
            if (previous !== undefined) values.push(time - previous);
            previous = time;
            if (time - first >= 2000) resolve(values);
            else requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        });
        const resources = performance.getEntriesByType('resource');
        let geometryAttributeBytes = null;
        if (window.__view) {
          geometryAttributeBytes = 0;
          const seen = new Set();
          window.__view.scene.traverse(o => {
            if (!o.geometry || seen.has(o.geometry)) return;
            seen.add(o.geometry);
            for (const a of Object.values(o.geometry.attributes)) geometryAttributeBytes += a.array.byteLength;
            geometryAttributeBytes += o.geometry.index?.array.byteLength || 0;
          });
        }
        return {
          render: window.__julichRender ?? null, geometryAttributeBytes,
          regionRequests: resources.filter(e => /\/regions\/.*\.obj$/.test(e.name)).length,
          regionEncodedBytes: resources.filter(e => /\/regions\/.*\.obj$/.test(e.name)).reduce((n, e) => n + e.encodedBodySize, 0),
          heapUsedBytes: performance.memory?.usedJSHeapSize ?? null,
          intervals,
          overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
        };
      });
      const { intervals, ...metrics } = result;
      assert.equal(result.regionRequests, expected);
      assert.equal(result.overflow, false);
      return { name, settledMs, ...metrics, frameCount: intervals.length, frameP95Ms: percentile(intervals) };
    };
    const samples = [await sample('default', 90)];
    await page.evaluate(() => document.querySelector('[data-region-load-id="julich-138"] .layer-entity-toggle').click());
    samples.push(await sample('one-pair', 92));
    await page.evaluate(() => {
      for (const row of document.querySelectorAll('[data-region-load-id^="julich-"]')) {
        const toggle = row.querySelector('.layer-entity-toggle');
        if (toggle.getAttribute('aria-pressed') !== 'true') toggle.click();
      }
    });
    samples.push(await sample('all-retained-visible', 314));
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ browser: browser.version(), url: page.url(), profile: '390x844, DPR3 (renderer cap2), CPU4x, 10/5Mbit, 80ms', readyMs, samples, errors }, null, 2));
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
