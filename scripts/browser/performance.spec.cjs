const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';
const DEVICE_SCALE_FACTOR = Number(process.env.DEVICE_SCALE_FACTOR ?? 3);
const CPU_THROTTLE_RATE = 4;
const DOWNLOAD_BYTES_PER_SECOND = 10 * 1024 * 1024 / 8;
const UPLOAD_BYTES_PER_SECOND = 5 * 1024 * 1024 / 8;
const NETWORK_LATENCY_MS = 80;
const PERFORMANCE_PROFILE = process.env.PERFORMANCE_PROFILE === '1';

function percentile(values, fraction) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

async function profile(browser, path) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: DEVICE_SCALE_FACTOR,
    hasTouch: true,
    isMobile: true,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const errors = [];
  const failedRequests = [];
  const activeRequests = new Set();
  let lastRequestActivity = Date.now();
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));
  page.on('request', request => {
    activeRequests.add(request);
    lastRequestActivity = Date.now();
  });
  page.on('requestfinished', request => {
    activeRequests.delete(request);
    lastRequestActivity = Date.now();
  });
  page.on('requestfailed', request => {
    activeRequests.delete(request);
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? 'unknown' });
    lastRequestActivity = Date.now();
  });
  await page.addInitScript(() => {
    window.__hardeningLongTasks = [];
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) {
            window.__hardeningLongTasks.push({ startTime: entry.startTime, duration: entry.duration });
          }
        });
        observer.observe({ type: 'longtask', buffered: true });
      } catch {
        // Long-task entries are optional evidence; unsupported browsers leave an empty list.
      }
    }
  });

  const client = await context.newCDPSession(page);
  await client.send('Network.enable');
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: NETWORK_LATENCY_MS,
    downloadThroughput: DOWNLOAD_BYTES_PER_SECOND,
    uploadThroughput: UPLOAD_BYTES_PER_SECOND,
    connectionType: 'cellular4g',
  });
  await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE_RATE });
  await client.send('Performance.enable');

  const startedAt = Date.now();
  await page.goto(new URL(path, BASE_URL).href, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready', null, { timeout: 120_000 });
  const readyMs = Date.now() - startedAt;
  while (activeRequests.size > 0 || Date.now() - lastRequestActivity < 750) {
    await page.waitForTimeout(100);
  }
  const assetsSettledMs = Date.now() - startedAt;

  const browserMetrics = await page.evaluate(async () => {
    const frameIntervals = await new Promise(resolve => {
      const values = [];
      let first = null;
      let previous = null;
      function frame(time) {
        if (first === null) first = time;
        if (previous !== null) values.push(time - previous);
        previous = time;
        if (time - first >= 2_000) resolve(values);
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    const resources = performance.getEntriesByType('resource').map(entry => ({
      path: new URL(entry.name).pathname,
      encodedBodySize: entry.encodedBodySize,
      transferSize: entry.transferSize,
      duration: entry.duration,
      initiatorType: entry.initiatorType,
    }));
    const canvas = document.querySelector('#stage canvas');
    const canvasRect = canvas?.getBoundingClientRect();
    return {
      state: document.getElementById('app')?.dataset.state,
      resources,
      longTasks: window.__hardeningLongTasks ?? [],
      frameIntervals,
      heapUsedBytes: performance.memory?.usedJSHeapSize ?? null,
      canvas: canvas && canvasRect ? {
        cssWidth: canvasRect.width,
        cssHeight: canvasRect.height,
        pixelWidth: canvas.width,
        pixelHeight: canvas.height,
        pixelRatioX: canvas.width / canvasRect.width,
        pixelRatioY: canvas.height / canvasRect.height,
      } : null,
    };
  });
  const cdpMetrics = Object.fromEntries((await client.send('Performance.getMetrics')).metrics
    .map(({ name, value }) => [name, value]));
  await context.close();

  const assetResources = browserMetrics.resources.filter(({ path: resourcePath }) => (
    resourcePath.startsWith('/data/') || resourcePath.startsWith('/models/')
  ));
  const frameIntervals = browserMetrics.frameIntervals;
  return {
    path,
    emulation: {
      viewport: '390x844',
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
      cpuThrottleRate: CPU_THROTTLE_RATE,
      downloadMbps: 10,
      uploadMbps: 5,
      latencyMs: NETWORK_LATENCY_MS,
    },
    readyMs,
    assetsSettledMs,
    resourceCount: browserMetrics.resources.length,
    encodedResourceBytes: browserMetrics.resources.reduce((sum, resource) => sum + resource.encodedBodySize, 0),
    encodedAssetBytes: assetResources.reduce((sum, resource) => sum + resource.encodedBodySize, 0),
    assetPaths: assetResources.map(({ path: resourcePath }) => resourcePath).sort(),
    longTaskCount: browserMetrics.longTasks.length,
    longestTaskMs: Math.max(0, ...browserMetrics.longTasks.map(({ duration }) => duration)),
    frameSample: {
      count: frameIntervals.length,
      medianMs: percentile(frameIntervals, 0.5),
      p95Ms: percentile(frameIntervals, 0.95),
      maxMs: Math.max(0, ...frameIntervals),
    },
    heapUsedBytes: browserMetrics.heapUsedBytes ?? cdpMetrics.JSHeapUsedSize ?? null,
    taskDurationSeconds: cdpMetrics.TaskDuration ?? null,
    canvas: browserMetrics.canvas,
    state: browserMetrics.state,
    errors,
    failedRequests,
  };
}

test('representative mobile profile keeps direct lessons lighter and animation responsive', async ({ browser, browserName }, testInfo) => { // Tests INV-45
  test.skip(browserName !== 'chromium', 'CPU/network throttling evidence uses Chromium CDP');
  test.skip(!PERFORMANCE_PROFILE, 'set PERFORMANCE_PROFILE=1 to run the throttled profile');
  test.setTimeout(240_000);

  const directLesson = await profile(browser, '?lesson=retina-to-v1');
  const atlasHome = await profile(browser, '');
  const evidence = { directLesson, atlasHome };
  console.log(`MOBILE_PERFORMANCE_PROFILE ${JSON.stringify(evidence)}`);
  await testInfo.attach('mobile-performance-profile.json', {
    body: Buffer.from(JSON.stringify(evidence, null, 2)),
    contentType: 'application/json',
  });

  for (const sample of [directLesson, atlasHome]) {
    expect(sample.state).toBe('ready');
    expect(sample.errors).toEqual([]);
    expect(sample.failedRequests).toEqual([]);
    expect(sample.canvas).not.toBeNull();
    expect(sample.canvas.pixelRatioX).toBeLessThanOrEqual(2.01);
    expect(sample.canvas.pixelRatioY).toBeLessThanOrEqual(2.01);
    expect(sample.frameSample.count).toBeGreaterThan(8);
    expect(sample.frameSample.p95Ms).toBeLessThan(250);
  }
  expect(directLesson.encodedAssetBytes).toBeLessThan(atlasHome.encodedAssetBytes);
  expect(directLesson.assetPaths.filter(path => path === '/data/swm_fibres.json')).toHaveLength(1);
  expect(directLesson.assetPaths.some(path => path.startsWith('/data/regions/fg4_'))).toBe(false);
});
