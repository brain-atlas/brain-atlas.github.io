const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';
const fixture = fs.readFileSync(path.join(__dirname, '../../test/fixtures/lessons/frontoparietal-orientation.md'), 'utf8');

// Inject a second inert fixture into the ordinary Vite module, never public content
// or a production test hook. Activation, drawer and history run unchanged.
async function secondLesson(page, sourceFixture = fixture, media = []) {
  await page.route('**/src/bootstrap.js*', async route => {
    const response = await route.fetch();
    const source = await response.text();
    const injection = `
globalThis.failLibraryExplore = () => failExplore(new Error('Injected library Explore failure'));
if (typeof libraryRecords !== 'undefined') libraryRecords.push({id:'frontoparietal-orientation',license:'AGPL-3.0-only',review:'docs/lessons/retina-to-v1-validation.md',media:${JSON.stringify(media)}});
if (typeof lessonSources !== 'undefined') lessonSources['frontoparietal-orientation.md'] = ${JSON.stringify(sourceFixture)};
if (typeof lessonSourceUrls !== 'undefined') lessonSourceUrls['./lessons/frontoparietal-orientation.md'] = '/fixture.md';
`;
    expect(source).toContain('const byId =');
    await route.fulfill({ response, body: source.replace('const byId =', `${injection}\nconst byId =`) });
  });
}

test('image-bearing library routes disclose hosts before explicit opening', async ({ page }) => {
  const imageFixture = fs.readFileSync(path.join(__dirname, '../../test/fixtures/lessons/visual-field-crossing.md'), 'utf8')
    .replace('This lesson follows', '![Diagram showing nasal and temporal retinal fields](https://example.org/retinotopy.png)\n\nThis lesson follows');
  await secondLesson(page, imageFixture, [{ id: 'retinotopy-diagram', license: 'Fixture only; not licensed for publication' }]);
  const images = [];
  await page.route('https://example.org/**', async route => { images.push(route.request().url()); await route.abort(); });
  await page.goto(new URL('?no-webgl=1&lesson=frontoparietal-orientation', BASE_URL).href);
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'fallback');
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  expect(images).toEqual([]);
  expect(new URL(page.url()).searchParams.has('lesson')).toBe(false);
  await page.locator('#lessons-trigger').click();
  await expect(page.locator('[data-lesson-id="frontoparietal-orientation"]')).toContainText('Opening permits image requests to example.org');
  await page.locator('[data-start-lesson="frontoparietal-orientation"]').click();
  await expect(page.locator('#lesson-title')).toHaveText('How visual fields cross');
  await expect.poll(() => images.length).toBeGreaterThan(0);
});

test('Explore failure restores the lesson image in readable fallback', async ({ page }) => {
  const imageFixture = fs.readFileSync(path.join(__dirname, '../../test/fixtures/lessons/visual-field-crossing.md'), 'utf8');
  await secondLesson(page, imageFixture, [{ id: 'retinotopy-diagram', license: 'Fixture only; not licensed for publication' }]);
  await page.route('https://example.org/**', route => route.abort());
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(BASE_URL);
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'ready');
  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="frontoparietal-orientation"]').click();
  await page.locator('#scene-next').click();
  await expect(page.locator('#visual-surface')).toHaveAttribute('data-visual', 'retinotopy-diagram');
  await page.locator('#explore-scene-trigger').click();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  await page.evaluate(() => window.failLibraryExplore());
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'fallback');
  await expect(page.locator('#page-scroll')).toBeVisible();
  await expect(page.locator('#visual-surface')).toHaveAttribute('data-visual', 'retinotopy-diagram');
  await expect(page.locator('#supplementary-image')).toHaveAttribute('alt', 'Diagram showing nasal and temporal retinal fields');
});

for (const noWebgl of [false, true]) {
  test(`library selects distinct candidates and restores routes/resume; noWebgl=${noWebgl}`, async ({ page }) => { // UI INV-25, INV-29, INV-65
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await secondLesson(page);
    await page.setViewportSize(noWebgl ? { width: 390, height: 844 } : { width: 1200, height: 800 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(new URL(noWebgl ? '?no-webgl=1' : '', BASE_URL).href);
    await expect(page.locator('#app')).toHaveAttribute('data-state', noWebgl ? 'fallback' : 'ready');
    await page.locator('#lessons-trigger').click();
    await expect(page.locator('.lesson-entry-card')).toHaveCount(2);
    const first = page.locator('[data-lesson-id="retina-to-v1"]');
    await expect(first).toContainText('AGPL-3.0-only');
    await expect(first.getByRole('link', { name: 'Review & citations' })).toBeVisible();
    for (const link of await first.locator('.lesson-entry-links a').all()) {
      const bounds = await link.boundingBox();
      expect(bounds.height).toBeGreaterThanOrEqual(44);
      expect(bounds.width).toBeGreaterThanOrEqual(44);
    }
    await page.locator('[data-start-lesson="frontoparietal-orientation"]').click();
    await expect(page.locator('#lesson-title')).toHaveText('Compare a second entity set');
    expect(new URL(page.url()).searchParams.get('lesson')).toBe('frontoparietal-orientation');
    await page.evaluate(() => { window.retainedLibraryTitle = document.getElementById('lesson-title'); });
    await page.locator('#back-to-atlas').click();
    await page.locator('#lessons-trigger').click();
    await expect(page.locator('[data-start-lesson="frontoparietal-orientation"]')).toHaveText('Resume lesson');
    await page.locator('[data-start-lesson="frontoparietal-orientation"]').click();
    expect(await page.evaluate(() => window.retainedLibraryTitle === document.getElementById('lesson-title'))).toBe(true);
    await page.locator('#back-to-atlas').click();
    await page.locator('#lessons-trigger').click();
    await page.locator('[data-start-lesson="retina-to-v1"]').click();
    await expect(page.locator('#lesson-title')).toHaveText('Early Vision: Retina to the Cortical Streams');
    await page.goBack();
    await page.goBack();
    await expect(page.locator('#lesson-title')).toHaveText('Compare a second entity set');
    await page.reload();
    await expect(page.locator('#app')).toHaveAttribute('data-state', noWebgl ? 'fallback' : 'ready');
    await expect(page.locator('#lesson-title')).toHaveText('Compare a second entity set');
    await expect(page.locator('canvas')).toHaveCount(noWebgl ? 0 : 1);
    if (noWebgl) expect(await page.evaluate(() => performance.getEntriesByType('resource').some(({ name }) => /\/src\/main.js|\/three/.test(name)))).toBe(false);
    expect(errors).toEqual([]);
  });
}
