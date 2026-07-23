const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';
const HAS_DEV_HOOKS = process.env.PRODUCTION_PREVIEW !== '1';

function monitor(page) {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
}

async function ready(page, viewport = { width: 1440, height: 900 }, path = '') {
  await page.setViewportSize(viewport);
  await page.goto(new URL(path, BASE_URL).href);
  await page.waitForFunction(() => ['ready', 'fallback'].includes(document.getElementById('app')?.dataset.state));
}

async function openInspectableList(page) {
  const disclosure = page.locator('#anatomy-browser');
  if (!await disclosure.evaluate(element => element.open)) {
    await disclosure.locator(':scope > summary').click();
  }
}

test('DOM focus previews anatomy and wide explicit activation opens cited nonmodal details', async ({ page }) => { // Tests INV-41
  const errors = monitor(page);
  await ready(page);
  const snapshot = HAS_DEV_HOOKS
    ? await page.evaluate(() => window.__lesson.exploreState.snapshot)
    : null;
  await openInspectableList(page);
  await expect(page.locator('#anatomy-options button')).toHaveCount(33);

  const lgn = page.locator('#anatomy-options [data-inspectable-id="region.lgn"]');
  await lgn.focus();
  await expect(page.locator('#anatomy-preview')).toBeVisible();
  await expect(page.locator('#anatomy-preview')).toHaveText('LGN');
  if (HAS_DEV_HOOKS) {
    expect(await page.evaluate(() => window.__view.inspector.highlightedId)).toBe('region.lgn');
  }

  await lgn.click();
  expect(await page.locator('#anatomy-browser').getAttribute('open')).toBeNull();
  await expect(page.locator('#anatomy-inspector')).toBeVisible();
  await expect(page.locator('#anatomy-inspector-title')).toHaveText('Lateral geniculate nucleus (LGN)');
  await expect(page.locator('#anatomy-inspector')).not.toHaveAttribute('role', 'dialog');
  await expect(page.locator('#anatomy-inspector')).toContainText('Anatomy');
  await expect(page.locator('#anatomy-inspector')).toContainText('Shown here');
  await expect(page.locator('#anatomy-inspector')).toContainText('Literature curated');
  await expect(page.locator('.anatomy-inspector-anatomy-sources a[href^="https://doi.org/"]')).toHaveCount(1);
  if (HAS_DEV_HOOKS) {
    expect(await page.evaluate(() => window.__lesson.exploreState.snapshot)).toEqual(snapshot);
  }

  await page.locator('#anatomy-inspector-close').click();
  await expect(lgn).toBeFocused();

  await openInspectableList(page);
  const ilf = page.locator('#anatomy-options [data-inspectable-id="tract.ilf"]');
  await ilf.click();
  await expect(page.locator('#anatomy-inspector-context')).toHaveText('Association bundle');
  await expect(page.locator('#anatomy-inspector')).toContainText('Displayed dataset');
  await expect(page.locator('#anatomy-inspector')).toContainText('Displayed endpoint proximity');
  await expect(page.locator('#anatomy-inspector')).toContainText('Qualified');
  await expect(page.locator('#anatomy-inspector')).toContainText('Low confidence');
  await expect(page.locator('#anatomy-inspector')).toContainText('STS2');
  await expect(page.locator('#anatomy-inspector a[href*="PMC7615246"]').first()).toBeVisible();
  await page.locator('#anatomy-inspector-close').click();
  await expect(ilf).toBeFocused();

  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await expect(page.locator('#anatomy-inspector')).toBeHidden();
  await expect(page.locator('#anatomy-preview')).toBeHidden();
  if (HAS_DEV_HOOKS) {
    expect(await page.evaluate(() => window.__view.inspector.highlightedId)).toBe(null);
  }
  expect(errors).toEqual([]);
});

test('compact anatomy details contain focus, restore the invoker, and clear hidden owners', async ({ page }) => { // Tests INV-42, FAIL-37
  const errors = monitor(page);
  await ready(page, { width: 390, height: 844 });
  await openInspectableList(page);
  const eye = page.locator('#anatomy-options [data-inspectable-id="landmark.eye-left"]');
  await eye.click();

  const inspector = page.locator('#anatomy-inspector');
  await expect(inspector).toBeVisible();
  await expect(inspector).toHaveAttribute('role', 'dialog');
  await expect(inspector).toHaveAttribute('aria-modal', 'true');
  expect(await page.locator('#app').evaluate(element => element.inert)).toBe(true);
  await expect(page.locator('#anatomy-inspector-close')).toBeFocused();
  await page.keyboard.press('Shift+Tab');
  await expect(inspector.locator('a[href]').last()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('#anatomy-inspector-close')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(eye).toBeFocused();
  expect(await page.locator('#app').evaluate(element => element.inert)).toBe(false);

  const viewer = page.locator('#viewer-console');
  if (!await viewer.getAttribute('open')) await viewer.locator(':scope > summary').click();
  const anterior = page.locator('#layers input[data-id="anterior"]');
  await anterior.uncheck();
  await expect(page.locator('#anatomy-options [data-inspectable-id^="landmark."]')).toHaveCount(0);
  await expect(page.locator('#anatomy-preview')).toBeHidden();
  if (HAS_DEV_HOOKS) {
    expect(await page.evaluate(() => window.__view.inspector.highlightedId)).toBe(null);
  }
  expect(errors).toEqual([]);
});

test('no-WebGL Atlas retains semantic anatomy names, status, limitations, and citations', async ({ page }) => { // Tests INV-43
  const errors = monitor(page);
  await ready(page, { width: 390, height: 844 }, '?no-webgl=1');
  await expect(page.locator('#stage-fallback')).toBeVisible();
  await openInspectableList(page);
  await page.locator('#anatomy-options [data-inspectable-id="landmark.optic-chiasm"]').click();
  const inspector = page.locator('#anatomy-inspector');
  await expect(inspector).toBeVisible();
  await expect(inspector).toContainText('Schematic');
  await expect(inspector).toContainText(/uncrossed temporal-retinal/i);
  await expect(inspector.locator('a[href="https://doi.org/10.1152/physrev.2001.81.4.1393"]')).toHaveCount(2);
  expect(await page.locator('canvas').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('raw canvas mouse and touch use the same preview with staged touch activation', async ({ page, context, browserName }) => { // Tests INV-44
  test.skip(!HAS_DEV_HOOKS, 'production builds intentionally omit raycast diagnostics');
  test.skip(browserName !== 'chromium', 'real touch injection is Chromium-only');
  const errors = monitor(page);
  await ready(page, { width: 1200, height: 800 });
  await page.waitForTimeout(1100);
  const hit = await page.evaluate(() => {
    const canvas = document.querySelector('#stage canvas');
    const rect = canvas.getBoundingClientRect();
    for (let y = rect.top + 20; y < rect.bottom - 20; y += 12) {
      for (let x = rect.left + 20; x < rect.right - 20; x += 12) {
        const result = window.__view.inspector.pickAt(x, y);
        if (result) return { x, y, id: result.id };
      }
    }
    return null;
  });
  expect(hit).not.toBeNull();

  await page.mouse.move(hit.x, hit.y);
  await expect(page.locator('#anatomy-preview')).toBeVisible();
  const currentHit = await page.evaluate(({ x, y }) => window.__view.inspector.pickAt(x, y), hit);
  expect(await page.evaluate(() => window.__view.inspector.highlightedId)).toBe(currentHit.id);
  await page.mouse.click(hit.x, hit.y);
  await expect(page.locator('#anatomy-inspector')).toBeVisible();
  await page.locator('#anatomy-inspector-close').click();

  await page.evaluate(() => document.getElementById('anatomy-preview').click());
  await page.locator('#anatomy-inspector-close').click();
  const empty = await page.evaluate(() => {
    const rect = document.querySelector('#stage canvas').getBoundingClientRect();
    for (let y = rect.top + 8; y < rect.bottom - 8; y += 16) {
      for (let x = rect.left + 8; x < rect.right - 8; x += 16) {
        if (!window.__view.inspector.pickAt(x, y)) return { x, y };
      }
    }
    return null;
  });
  expect(empty).not.toBeNull();
  await page.mouse.click(empty.x, empty.y);
  await expect(page.locator('#anatomy-preview')).toBeHidden();

  const client = await context.newCDPSession(page);
  const tap = async () => {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart', touchPoints: [{ x: hit.x, y: hit.y, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
    });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  await tap();
  await expect(page.locator('#anatomy-preview')).toBeVisible();
  await expect(page.locator('#anatomy-inspector')).toBeHidden();
  await tap();
  await expect(page.locator('#anatomy-inspector')).toBeVisible();
  expect(errors).toEqual([]);
});
