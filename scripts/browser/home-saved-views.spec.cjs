const { test, expect } = require('@playwright/test');
const { BASE_URL, monitor } = require('./helpers.cjs');
const KEY = 'brain-atlas.saved-views';
async function ready(page, path = '') {
  await page.goto(new URL(path, BASE_URL).href);
  await expect(page.locator('#app')).toHaveAttribute('data-state', path.includes('no-webgl') ? 'fallback' : 'ready');
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
async function save(page, name) {
  await page.getByLabel('View name', { exact: true }).fill(name);
  await page.getByRole('button', { name: 'Save current', exact: true }).click();
}
async function views(page) { return page.evaluate(key => JSON.parse(localStorage.getItem(key))?.views, KEY); }

for (const width of [1440, 390]) {
  test(`named view keyboard CRUD, actual camera restore, reload and reset retention at ${width}px`, async ({ page }) => { // Tests INV-73
    const errors = monitor(page);
    await page.setViewportSize({ width, height: 900 });
    await ready(page);
    await fullControls(page);
    await expect(page.getByRole('heading', { name: 'Saved views', exact: true })).toBeVisible();
    await changeRange(page, 'clip', 37);
    await changeRange(page, 'tissue', 43);
    await page.locator('[data-view="post"]').click();
    await page.locator('[data-explore-camera="pan-left"]').click();
    await page.getByLabel('View name', { exact: true }).fill('  Back view  ');
    await page.getByRole('button', { name: 'Save current', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#saved-views-status')).toContainText('Saved “Back view”');
    const saved = (await views(page))[0].snapshot;
    expect(saved.cutaway.position).toBe(37);
    expect(saved.material.tissueOpacity).toBe(0.43);
    if (await page.evaluate(() => Boolean(window.__view))) {
      expect(await page.evaluate(() => ({ position: window.__view.camera.position.toArray(), target: window.__view.controls.target.toArray() })))
        .toEqual({ position: saved.camera.position, target: saved.camera.target });
    }
    await changeRange(page, 'clip', 62);
    await save(page, 'Second');
    expect((await views(page)).length).toBe(2);
    await page.getByLabel('Saved view', { exact: true }).selectOption('Back view');
    await page.getByRole('button', { name: 'Restore', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#clip')).toHaveValue('37');
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('brain-atlas.atlas-state')).snapshot)).toEqual(saved);
    await page.getByLabel('View name', { exact: true }).fill('Renamed');
    await page.getByRole('button', { name: 'Rename', exact: true }).focus();
    await page.keyboard.press('Enter');
    expect((await views(page))[0]).toEqual({ name: 'Renamed', snapshot: saved });
    await page.getByRole('button', { name: 'Delete', exact: true }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('button', { name: 'Cancel deletion', exact: true })).toBeFocused();
    await page.keyboard.press('Escape');
    expect((await views(page)).length).toBe(2);
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toBeFocused();
    await page.getByRole('button', { name: 'Delete', exact: true }).click();
    await page.getByRole('button', { name: 'Confirm delete', exact: true }).focus();
    await page.keyboard.press('Enter');
    expect((await views(page)).map(v => v.name)).toEqual(['Second']);
    await expect(page.getByLabel('Saved view', { exact: true })).toBeFocused();
    await page.locator('#reset-atlas').click();
    expect((await views(page)).map(v => v.name)).toEqual(['Second']);
    await page.reload();
    await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
    await fullControls(page);
    await page.getByLabel('Saved view', { exact: true }).selectOption('Second');
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    await expect(page.locator('#clip')).toHaveValue('62');
    expect(await page.locator('canvas').count()).toBe(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    for (const control of await page.locator('#saved-views-controls input, #saved-views-controls select, #saved-views-controls button:visible').all()) {
      const box = await control.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }
    expect(errors).toEqual([]);
  });
}

test('empty and duplicate names are explicit, names render as text, and edits never overwrite saved snapshot', async ({ page }) => { // Tests FAIL-66
  const errors = monitor(page);
  await ready(page); await fullControls(page);
  await save(page, ' ');
  await expect(page.locator('#saved-views-status')).toContainText('view name');
  await expect(page.getByLabel('View name', { exact: true })).toBeFocused();
  expect(await views(page)).toBeUndefined();
  await save(page, '<img onerror=alert(1)>');
  expect(await page.locator('#saved-views-controls img').count()).toBe(0);
  await save(page, 'Café');
  const before = await views(page);
  await changeRange(page, 'clip', 49);
  await save(page, ' CAFE\u0301 ');
  await expect(page.locator('#saved-views-status')).toContainText('already exists');
  expect(await views(page)).toEqual(before);
  expect(errors).toEqual([]);
});

test('lessons and temporary exploration cannot mutate saved views; Exit keeps collection', async ({ page }) => { // Tests INV-73
  const errors = monitor(page);
  await ready(page); await fullControls(page); await save(page, 'Global');
  const before = await views(page);
  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await expect(page.locator('#saved-views-controls')).toBeHidden();
  await page.locator('#back-to-atlas').click();
  await fullControls(page);
  await expect(page.locator('#saved-views-controls')).toBeHidden();
  await page.locator('#saved-view-save').evaluate(button => button.click());
  expect(await views(page)).toEqual(before);
  await page.locator('#exit-lesson').click();
  await fullControls(page);
  await expect(page.locator('#saved-views-controls')).toBeVisible();
  expect(await views(page)).toEqual(before);
  expect(errors).toEqual([]);
});

for (const failure of ['denied', 'quota', 'malformed']) {
  test(`named-view ${failure} storage degrades without breaking Atlas`, async ({ page }) => { // Tests FAIL-66
    const errors = monitor(page);
    await page.addInitScript(({ key, failure }) => {
      if (failure === 'malformed') localStorage.setItem(key, '{');
      if (failure === 'denied') Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('Denied', 'SecurityError'); } });
      if (failure === 'quota') {
        const set = Storage.prototype.setItem;
        Storage.prototype.setItem = function(k, v) { if (k === key) throw new DOMException('Full', 'QuotaExceededError'); return set.call(this, k, v); };
      }
    }, { key: KEY, failure });
    await ready(page); await fullControls(page);
    if (failure === 'malformed') await expect(page.locator('#saved-views-status')).toContainText('could not be restored');
    await changeRange(page, 'clip', 31); await save(page, 'Session view');
    if (failure !== 'malformed') await expect(page.locator('#saved-views-status')).toContainText('this session only');
    await changeRange(page, 'clip', 66);
    await page.getByRole('button', { name: 'Restore', exact: true }).click();
    await expect(page.locator('#clip')).toHaveValue('31');
    if (failure !== 'malformed') await expect(page.locator('#saved-views-status')).toContainText('this session only');
    expect(errors).toEqual([]);
  });
}

test('no-WebGL keeps source/lesson fallback and disables named capture; reduced motion wins on restore', async ({ page }) => { // Tests INV-73
  const errors = monitor(page);
  await ready(page); await fullControls(page); await save(page, 'Moving');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.getByRole('button', { name: 'Restore', exact: true }).click();
  await expect(page.locator('#play')).toBeDisabled();
  await ready(page, '?no-webgl=1');
  await expect(page.locator('#saved-view-save')).toBeDisabled();
  await expect(page.locator('#saved-view-restore')).toBeDisabled();
  expect(await page.locator('canvas').count()).toBe(0);
  expect((await views(page)).length).toBe(1);
  expect(errors).toEqual([]);
});


test('history jumps into temporary inspection keep saved-view controls hidden', async ({ page }) => { // Tests FAIL-66
  await ready(page); await fullControls(page); await save(page, 'Global');
  const before = await views(page);
  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await page.locator('#back-to-atlas').click();
  await page.evaluate(() => history.go(-2));
  await expect.poll(() => page.evaluate(() => history.state?.mode)).toBe('atlas');
  await page.evaluate(() => history.go(2));
  await expect.poll(() => page.evaluate(() => history.state?.mode)).toBe('inspect');
  await fullControls(page);
  await expect(page.locator('#saved-views-controls')).toBeHidden();
  expect(await views(page)).toEqual(before);
});

test('no-WebGL lesson round trip cannot expose enabled named-view actions', async ({ page }) => { // Tests FAIL-66
  await ready(page, '?no-webgl=1');
  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await page.locator('#back-to-atlas').click();
  await page.locator('#exit-lesson').click();
  await expect(page.locator('#saved-views-controls')).toBeHidden();
  await expect(page.locator('#saved-view-save')).toBeDisabled();
  await expect(page.locator('#saved-view-restore')).toBeDisabled();
  await expect(page.locator('#stage-fallback')).toContainText('Saving and restoring named Atlas views requires the 3D viewer');
  expect(await page.locator('canvas').count()).toBe(0);
});
