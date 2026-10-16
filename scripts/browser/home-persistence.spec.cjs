const { test, expect } = require('@playwright/test');
const { BASE_URL, monitor } = require('./helpers.cjs');
const KEY = 'brain-atlas.atlas-state';

async function ready(page, path = '') {
  await page.goto(new URL(path, BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
}
async function fullControls(page) {
  for (const id of ['viewer-console', 'viewer-full-controls']) {
    const details = page.locator(`#${id}`);
    if (await details.getAttribute('open') === null) await details.locator(':scope > summary').click();
  }
}
async function changeRange(page, id, value) {
  await page.locator(`#${id}`).evaluate((input, value) => {
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
async function stored(page) {
  return page.evaluate(key => JSON.parse(localStorage.getItem(key)), KEY);
}
function roundedCameraSnapshot(snapshot) {
  return { ...snapshot, camera: { ...snapshot.camera,
    position: snapshot.camera.position.map(value => +value.toFixed(5)),
    target: snapshot.camera.target.map(value => +value.toFixed(5)),
  } };
}
async function actualCamera(page) {
  return page.evaluate(() => ({
    position: window.__view.camera.position.toArray().map(value => +value.toFixed(5)),
    target: window.__view.controls.target.toArray().map(value => +value.toFixed(5)),
  }));
}

for (const width of [1440, 390]) {
  test(`last global Atlas restores filters and actual camera without repeated fit at ${width}px`, async ({ page }) => { // Tests INV-70
    const errors = monitor(page);
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    await fullControls(page);
    await changeRange(page, 'clip', 27);
    await changeRange(page, 'tissue', 43);
    await changeRange(page, 'speed', 91);
    await page.locator('#fibre-filter-preset').selectOption('fibre-filter.dorsal');
    await page.locator('#hemisphere-controls .hemi-chip input').first().uncheck();
    const lgnRow = page.locator('[data-entity-id="region.lgn"]');
    await lgnRow.locator('xpath=ancestor::div[contains(@class,"lyr-grpwrap")]').locator('.caret').click();
    await lgnRow.locator('.pill').first().click();
    await page.locator('#layers input[data-id="anterior"]').uncheck();
    await page.locator('#play').click();
    await page.locator('[data-view="post"]').click();
    await page.locator('[data-explore-camera="pan-left"]').click();
    await page.locator('[data-explore-camera="zoom-in"]').click();
    const camera = await actualCamera(page);
    await expect.poll(async () => (await stored(page))?.snapshot.camera.target.map(v => +v.toFixed(5))).toEqual(camera.target);
    const before = (await stored(page)).snapshot;
    expect(before.cutaway.position).toBe(27);
    expect(before.material.tissueOpacity).toBe(0.43);
    expect(before.playback.speed).toBe(91);
    expect(before.fibreFilter.preset).toBe('fibre-filter.dorsal');
    expect(before.hemispheres.global).toEqual({ L: false, R: true });
    expect(before.hemispheres.entities['region.lgn']).toEqual({ L: false, R: true });
    expect(before.visibility.entities).not.toContain('pathway.anterior');
    for (let i = 0; i < 2; i++) {
      await page.reload();
      await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
      expect(await actualCamera(page)).toEqual(camera);
      expect(await page.evaluate(() => window.__lesson.exploreState.snapshot)).toEqual(before);
      expect(await page.locator('canvas').count()).toBe(1);
    }
    expect(errors).toEqual([]);
  });
}

test('camera-only changes flush on page hide; temporary lesson views never overwrite global state', async ({ page }) => { // Tests INV-70
  const errors = monitor(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  await fullControls(page);
  await changeRange(page, 'clip', 29);
  await expect.poll(async () => (await stored(page))?.snapshot.cutaway.position).toBe(29);
  await page.locator('[data-view="ant"]').click();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const global = await stored(page);
  expect(global.snapshot.cutaway.position).toBe(29);
  expect(global.snapshot.camera.position.map(Math.round)).toEqual([0, 30, -350]);
  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await page.locator('#back-to-atlas').click();
  await fullControls(page);
  await changeRange(page, 'clip', 61);
  await expect(page.locator('#reset-atlas')).toBeHidden();
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  expect(await stored(page)).toEqual(global);
  await page.reload();
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  expect(await page.evaluate(() => window.__lesson.exploreState.snapshot.cutaway.position)).toBe(29);
  expect(errors).toEqual([]);
});

test('Reset Atlas is keyboard accessible, distinct from camera reset, and survives reload and Exit', async ({ page }) => { // Tests INV-70
  const errors = monitor(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready(page);
  const defaults = roundedCameraSnapshot(await page.evaluate(() => window.__lesson.exploreState.snapshot));
  await fullControls(page);
  await changeRange(page, 'clip', 36);
  await page.locator('#reset').click();
  expect(await page.evaluate(() => window.__lesson.exploreState.snapshot.cutaway.position)).toBe(36);
  await page.getByRole('button', { name: 'Reset Atlas', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect.poll(async () => (await stored(page))?.snapshot.cutaway.position).toBe(0);
  await page.reload();
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  expect(roundedCameraSnapshot(await page.evaluate(() => window.__lesson.exploreState.snapshot))).toEqual(defaults);
  await fullControls(page);
  await changeRange(page, 'clip', 47);
  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await page.locator('#back-to-atlas').click();
  await page.locator('#exit-lesson').click();
  await page.reload();
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  expect(roundedCameraSnapshot(await page.evaluate(() => window.__lesson.exploreState.snapshot))).toEqual(defaults);
  expect(errors).toEqual([]);
});

for (const failure of ['malformed', 'denied', 'quota']) {
  test(`${failure} storage keeps viewer usable and reports persistence limit`, async ({ page }) => { // Tests FAIL-63
    const errors = monitor(page);
    await page.addInitScript(({ key, failure }) => {
      if (failure === 'malformed') localStorage.setItem(key, '{');
      if (failure === 'denied') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } });
      if (failure === 'quota') Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); };
    }, { key: KEY, failure });
    await ready(page);
    await fullControls(page);
    if (failure === 'malformed') await expect(page.locator('#atlas-storage-note')).toContainText('could not be restored');
    await changeRange(page, 'clip', 52);
    expect(await page.evaluate(() => window.__lesson.exploreState.snapshot.cutaway.position)).toBe(52);
    if (failure !== 'malformed') await expect(page.locator('#atlas-storage-note')).toContainText('cannot save');
    await page.locator('#reset-atlas').click();
    expect(await page.evaluate(() => window.__lesson.exploreState.snapshot.cutaway.position)).toBe(0);
    expect(errors).toEqual([]);
  });
}

test('stored Atlas cannot override a checked lesson route or current reduced-motion policy', async ({ page }) => { // Tests INV-70
  const errors = monitor(page);
  await ready(page);
  await fullControls(page);
  await changeRange(page, 'clip', 33);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  const before = await stored(page);
  await ready(page, '?lesson=retina-to-v1');
  expect(await page.evaluate(() => window.__lesson.workspaceState.mode)).toBe('lesson');
  expect(await stored(page)).toEqual(before);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await ready(page);
  await fullControls(page);
  await expect(page.locator('#play')).toBeDisabled();
  expect(await page.evaluate(() => window.__lesson.exploreState.snapshot.cutaway.position)).toBe(33);
  expect(await page.evaluate(() => window.__view.activity.state.settled)).toBe(true);
  expect(errors).toEqual([]);
});
