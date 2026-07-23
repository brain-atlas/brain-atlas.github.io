const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';

function monitor(page) {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
}

async function setDocumentVisible(page, visible) {
  await page.evaluate((nextVisible) => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => !nextVisible });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => (nextVisible ? 'visible' : 'hidden') });
    document.dispatchEvent(new Event('visibilitychange'));
  }, visible);
}

async function powerSample(page) {
  return page.evaluate(() => ({
    power: window.__view.power.state,
    renderCount: window.__view.power.renderCount,
    opticTime: window.__view.activity.opticRadiation.modelTime,
    swmTime: window.__view.swm.modelTime,
  }));
}

test('hidden-document power suspension freezes clocks and resumes requested playback', async ({ page }) => { // Tests INV-51
  const errors = monitor(page);
  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  await page.waitForFunction(() => window.__view?.lesson?.cameraTransitioning === false);
  await page.waitForFunction(() => window.__view?.power?.state?.activityActive === true);

  await setDocumentVisible(page, false);
  await page.waitForFunction(() => window.__view.power.state.reason === 'document-hidden');
  await expect(page.locator('#model-status')).toContainText('Viewer paused while this tab is hidden');
  const suspended = await powerSample(page);
  await page.waitForTimeout(350);
  const stillSuspended = await powerSample(page);
  expect(stillSuspended.renderCount).toBe(suspended.renderCount);
  expect(stillSuspended.opticTime).toBe(suspended.opticTime);
  expect(stillSuspended.swmTime).toBe(suspended.swmTime);

  await setDocumentVisible(page, true);
  await page.waitForFunction(() => window.__view.power.state.activityActive === true);
  await page.waitForTimeout(150);
  const resumed = await powerSample(page);
  expect(resumed.renderCount).toBeGreaterThan(stillSuspended.renderCount);
  expect(resumed.opticTime).toBeGreaterThan(stillSuspended.opticTime);
  await expect(page.locator('#announcer')).toContainText('Viewer activity resumed');
  expect(errors).toEqual([]);
});

test('offscreen suspension freezes clocks and resumes requested lesson playback', async ({ page }) => { // Tests INV-51
  const errors = monitor(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  await page.waitForFunction(() => window.__view?.lesson?.cameraTransitioning === false);
  await page.waitForFunction(() => window.__view.power.state.activityActive === true);

  await page.locator('#stage').evaluate(element => { element.style.transform = 'translateY(200vh)'; });
  await page.waitForFunction(() => window.__view.power.state.reason === 'stage-offscreen');
  const offscreen = await powerSample(page);
  await page.waitForTimeout(250);
  const stillOffscreen = await powerSample(page);
  expect(stillOffscreen.renderCount).toBe(offscreen.renderCount);
  expect(stillOffscreen.opticTime).toBe(offscreen.opticTime);

  await page.locator('#stage').evaluate(element => { element.style.removeProperty('transform'); });
  await page.waitForFunction(() => window.__view.power.state.activityActive === true);
  await page.waitForTimeout(150);
  const resumed = await powerSample(page);
  expect(resumed.power.requestedPlaying).toBe(true);
  expect(resumed.renderCount).toBeGreaterThan(stillOffscreen.renderCount);
  expect(resumed.opticTime).toBeGreaterThan(stillOffscreen.opticTime);
  expect(errors).toEqual([]);
});

test('explicit Pause survives power suspension and leaves rendering event-driven', async ({ page }) => { // Tests INV-51
  const errors = monitor(page);
  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  if (!await page.locator('#viewer-console').getAttribute('open')) {
    await page.locator('#viewer-console > summary').click();
  }
  await page.locator('#play').click();
  await page.waitForFunction(() => window.__view.power.state.requestedPlaying === false);
  await setDocumentVisible(page, false);
  await page.waitForFunction(() => window.__view.power.state.suspended === true);
  await setDocumentVisible(page, true);
  await page.waitForFunction(() => window.__view.power.state.suspended === false);
  await page.waitForTimeout(250);
  const paused = await powerSample(page);
  await page.waitForTimeout(250);
  const settled = await powerSample(page);
  expect(settled.power.requestedPlaying).toBe(false);
  expect(settled.power.activityActive).toBe(false);
  expect(settled.opticTime).toBe(paused.opticTime);
  expect(settled.renderCount).toBe(paused.renderCount);

  await page.locator('[data-view="top"]').click();
  await page.waitForFunction((renderCount) => window.__view.power.renderCount > renderCount, settled.renderCount);
  await page.waitForTimeout(250);
  const interactionSettled = await powerSample(page);
  await page.waitForTimeout(250);
  expect((await powerSample(page)).renderCount).toBe(interactionSettled.renderCount);
  expect(errors).toEqual([]);
});

test('resume does not clear status claimed by another producer during suspension', async ({ page }) => { // Tests INV-51
  const errors = monitor(page);
  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  await setDocumentVisible(page, false);
  await page.waitForFunction(() => window.__view.power.state.suspended === true);
  await page.locator('#model-status').evaluate(element => {
    delete element.dataset.statusOwner;
    element.hidden = false;
    element.textContent = 'Independent model status';
  });
  await page.locator('#scene-next').click();
  await page.waitForFunction(() => window.__lesson?.navigation?.activeIndex === 0);
  await expect(page.locator('#model-status')).toHaveText('Independent model status');
  await setDocumentVisible(page, true);
  await page.waitForFunction(() => window.__view.power.state.suspended === false);
  await expect(page.locator('#model-status')).toHaveText('Independent model status');
  expect(errors).toEqual([]);
});

test('ordinary renderer updates do not clear status owned by another producer', async ({ page }) => { // Tests INV-51
  const errors = monitor(page);
  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  await page.locator('#model-status').evaluate(element => {
    element.hidden = false;
    element.textContent = 'Independent model status';
  });
  await page.locator('#scene-next').click();
  await page.waitForFunction(() => window.__lesson?.navigation?.activeIndex === 0);
  await expect(page.locator('#model-status')).toHaveText('Independent model status');
  expect(errors).toEqual([]);
});

test('reduced motion never becomes resume-eligible after power suspension', async ({ page }) => { // Tests INV-51
  const errors = monitor(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  const beforeSuspension = await powerSample(page);
  await setDocumentVisible(page, false);
  await page.waitForFunction(() => window.__view.power.state.suspended === true);
  await setDocumentVisible(page, true);
  await page.waitForFunction(() => window.__view.power.state.suspended === false);
  const sample = await powerSample(page);
  expect(sample.power.reducedMotion).toBe(true);
  expect(sample.power.resumeEligible).toBe(false);
  expect(sample.power.activityActive).toBe(false);
  expect(sample.opticTime).toBe(beforeSuspension.opticTime);
  expect(sample.swmTime).toBe(beforeSuspension.swmTime);
  await expect(page.locator('#play')).toBeDisabled();
  await page.waitForTimeout(250);
  const settled = await powerSample(page);
  await page.waitForTimeout(250);
  const stillSettled = await powerSample(page);
  expect(stillSettled.opticTime).toBe(settled.opticTime);
  expect(stillSettled.swmTime).toBe(settled.swmTime);
  expect(stillSettled.renderCount).toBe(settled.renderCount);
  expect(errors).toEqual([]);
});
