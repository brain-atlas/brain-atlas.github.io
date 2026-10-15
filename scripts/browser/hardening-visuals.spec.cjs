const { test, expect } = require('@playwright/test');
const fs = require('node:fs');
const path = require('node:path');
const { BASE_URL, monitor } = require('./helpers.cjs');

const fixture = fs.readFileSync(path.join(__dirname, '../../test/fixtures/lessons/visual-field-crossing.md'), 'utf8');
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');

async function openFixture(page, source = fixture, noWebgl = false) {
  await page.goto(new URL(noWebgl ? '?no-webgl=1' : '', BASE_URL).href);
  await expect(page.locator('#app')).toHaveAttribute('data-state', noWebgl ? 'fallback' : 'ready');
  await page.locator('#lesson-import-trigger').click();
  await page.locator('#lesson-import-source').fill(source);
  await page.locator('#lesson-import-validate').click();
  await expect(page.locator('#lesson-import-result')).toContainText('example.org');
  await expect(page.locator('#supplementary-image')).toHaveCount(0);
  await page.locator('#lesson-import-open').click();
  await expect(page.locator('#lesson-title')).toHaveText('How visual fields cross');
}

for (const noWebgl of [false, true]) {
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    test(`image failure explanation and Retry fit ${viewport.width}×${viewport.height} frame; noWebgl=${noWebgl}`, async ({ page }) => { // UI INV-19, INV-58; FAIL-19, FAIL-51
      const errors = monitor(page);
      await page.setViewportSize(viewport);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      let attempts = 0;
      await page.route('https://example.org/retinotopy.png', route => route.fulfill({
        status: 200, contentType: 'image/png', body: ++attempts === 1 ? Buffer.alloc(0) : png,
      }));
      await openFixture(page, fixture.replace('visual: atlas', 'visual: retinotopy-diagram'), noWebgl);
      await expect(page.locator('#supplementary-image-failure')).toBeVisible();
      const frame = await page.locator('#supplementary-image-frame').boundingBox();
      const failure = await page.locator('#supplementary-image-failure').boundingBox();
      expect(failure.y).toBeGreaterThanOrEqual(frame.y);
      expect(failure.y + failure.height).toBeLessThanOrEqual(frame.y + frame.height);
      await page.locator('#supplementary-image-failure').focus();
      await expect(page.locator('#supplementary-image-failure')).toBeFocused();
      await page.keyboard.press('End');
      await page.keyboard.press('Tab');
      await expect(page.locator('#supplementary-image-retry')).toBeFocused();
      // Native End scrolling can continue after Tab, even with reduced motion.
      await expect(async () => {
        const frame = await page.locator('#supplementary-image-frame').boundingBox();
        const retry = await page.locator('#supplementary-image-retry').boundingBox();
        expect(retry.y).toBeGreaterThanOrEqual(frame.y);
        expect(retry.y + retry.height).toBeLessThanOrEqual(frame.y + frame.height);
        expect(await page.locator('#supplementary-image-retry').evaluate(button => {
          const rect = button.getBoundingClientRect();
          return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === button;
        })).toBe(true);
      }).toPass({ timeout: 5000 });
      await page.keyboard.press('Enter');
      await expect(page.locator('#supplementary-visual')).toHaveAttribute('data-state', 'loaded');
      expect(attempts).toBe(2);
      expect(errors).toEqual([]);
    });
  }
}

for (const noWebgl of [false, true]) {
  for (const layout of ['dominant', 'split']) {
    test(`declared ${layout} visual preserves meaning across wide/compact; noWebgl=${noWebgl}`, async ({ page }) => { // UI INV-19, INV-58
      const errors = monitor(page);
      const requests = [];
      const resources = [];
      page.on('request', request => resources.push(request.url()));
      await page.route('https://example.org/retinotopy.png', async route => {
        requests.push(await route.request().allHeaders());
        await route.fulfill({ status: 200, contentType: 'image/png', body: png });
      });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await openFixture(page, fixture.replace('layout: split', `layout: ${layout}`), noWebgl);
      expect(requests).toEqual([]);
      await expect(page.locator('#atlas-surface')).toBeVisible();
      await expect(page.locator('#supplementary-visual')).toBeHidden();
      await page.locator('#scene-next').focus();
      await page.keyboard.press('Enter');
      const figure = page.locator('#supplementary-visual');
      await expect(figure).toHaveAttribute('data-state', 'loaded');
      await expect(page.locator('#supplementary-image')).toHaveAttribute('alt', 'Diagram showing nasal and temporal retinal fields');
      await expect(page.locator('#supplementary-image')).toHaveAttribute('loading', 'lazy');
      await expect(page.locator('#supplementary-image')).toHaveAttribute('referrerpolicy', 'no-referrer');
      await expect(page.locator('#supplementary-caption')).toHaveText('Visual-field projection before the chiasm');
      await expect(page.locator('#supplementary-credit')).toHaveText('Example Author');
      await expect(page.locator('#supplementary-source')).toHaveAttribute('href', 'https://example.org/source');
      await expect(page.locator('#supplementary-source')).toHaveAttribute('rel', 'noopener noreferrer');
      expect(requests).toHaveLength(1);
      expect(requests[0].referer).toBeUndefined();
      if (layout === 'split') await expect(page.locator('#atlas-surface')).toBeVisible();
      else await expect(page.locator('#atlas-surface')).toBeHidden();
      const snapshot = await page.evaluate(() => window.__lesson.lesson.scenes[1].snapshot);
      const fidelity = await page.locator('#fidelity-panel').textContent();

      for (const width of [1440, 700, 390, 320]) {
        await page.setViewportSize({ width, height: 844 });
        // Re-enter explicitly after reflow; resizing can move prose across scene thresholds.
        await page.locator('#scene-previous').click();
        await page.locator('#scene-next').click();
        await expect(figure).toHaveAttribute('data-state', 'loaded');
        if (width <= 700 || layout === 'dominant') await expect(page.locator('#atlas-surface')).toBeHidden();
        const bounds = await figure.boundingBox();
        expect(bounds.x).toBeGreaterThanOrEqual(0);
        expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
        expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
        expect(await page.locator('#supplementary-image').evaluate(image => getComputedStyle(image).objectFit)).toBe('contain');
        await page.locator('[data-visual-id="atlas"]').focus();
        await page.keyboard.press('Enter');
        await expect(page.locator('#atlas-surface')).toBeVisible();
        await expect(page.locator('#supplementary-image')).toHaveCount(0);
        if (!noWebgl) {
          await expect.poll(() => page.evaluate(() => {
            const box = document.getElementById('stage').getBoundingClientRect();
            return Math.abs(window.__view.camera.aspect - box.width / box.height);
          })).toBeLessThan(0.00001);
        }
        await page.locator('[data-visual-id="retinotopy-diagram"]').focus();
        await page.keyboard.press('Space');
        await expect(figure).toHaveAttribute('data-state', 'loaded');
        await expect(page.locator('[data-visual-id="retinotopy-diagram"]')).toHaveAttribute('aria-pressed', 'true');
        expect(await page.evaluate(() => window.__lesson.lesson.scenes[1].snapshot)).toEqual(snapshot);
        expect(await page.locator('#fidelity-panel').textContent()).toBe(fidelity);
      }
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await expect(figure).toHaveAttribute('data-state', 'loaded');
      await expect(page.locator('#supplementary-caption')).toHaveText('Visual-field projection before the chiasm');
      await page.locator('#scene-previous').click();
      await expect(page.locator('#supplementary-image')).toHaveCount(0);
      if (noWebgl) {
        expect(resources.some(url => /\/src\/main\.js|\/three/.test(url))).toBe(false);
        await expect(page.locator('canvas')).toHaveCount(0);
      } else await expect(page.locator('canvas')).toHaveCount(1);
      expect(errors).toEqual([]);
    });
  }
}


test.describe('touch supplementary controls', () => {
  test.use({ hasTouch: true });

  test('tap selection and Retry preserve the declared scene', async ({ page, browserName }) => { // UI INV-19, INV-58
    test.skip(browserName !== 'chromium', 'Chromium touch-emulation audit');
    const errors = monitor(page);
    let attempts = 0;
    await page.route('https://example.org/retinotopy.png', route => route.fulfill({
      status: 200, contentType: 'image/png', body: ++attempts === 1 ? Buffer.alloc(0) : png,
    }));
    await page.setViewportSize({ width: 320, height: 568 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openFixture(page, fixture.replace('visual: atlas', 'visual: retinotopy-diagram'));
    await expect(page.locator('#supplementary-visual')).toHaveAttribute('data-state', 'error');
    await page.locator('#supplementary-image-retry').tap();
    await expect(page.locator('#supplementary-visual')).toHaveAttribute('data-state', 'loaded');
    await page.locator('[data-visual-id="atlas"]').tap();
    await expect(page.locator('#supplementary-image')).toHaveCount(0);
    await page.locator('[data-visual-id="retinotopy-diagram"]').tap();
    await expect(page.locator('#supplementary-visual')).toHaveAttribute('data-state', 'loaded');
    expect(await page.evaluate(() => window.__lesson.navigation.activeIndex)).toBe(0);
    expect(errors).toEqual([]);
  });
});
