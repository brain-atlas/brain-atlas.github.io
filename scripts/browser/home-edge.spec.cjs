const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';

function monitor(page) {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
}

async function open(page, {
  path = '',
  viewport = { width: 390, height: 844 },
  states = ['ready'],
} = {}) {
  await page.setViewportSize(viewport);
  await page.goto(new URL(path, BASE_URL).href);
  await page.waitForFunction(expected => expected.includes(document.getElementById('app')?.dataset.state), states);
}

test('compact Atlas and lesson drawer preserve focus, touch targets, and contained layout', async ({ page }) => { // Tests INV-30
  const errors = monitor(page);
  await open(page);
  const shell = await page.evaluate(() => ({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    rootScroll: [scrollX, scrollY],
    topbar: document.querySelector('.topbar').getBoundingClientRect().toJSON(),
    stage: document.getElementById('stage').getBoundingClientRect().toJSON(),
    cameraDistance: window.__view.camera.position.distanceTo(window.__view.controls.target),
  }));
  expect(shell.scrollWidth).toBe(shell.viewport);
  expect(shell.rootScroll).toEqual([0, 0]);
  expect(shell.stage.height).toBeGreaterThan(240);
  expect(shell.cameraDistance).toBeGreaterThan(380);

  await page.locator('#lessons-trigger').click();
  await expect(page.locator('#lesson-drawer')).toBeVisible();
  const drawer = await page.locator('#lesson-drawer').boundingBox();
  expect(drawer.width).toBeLessThanOrEqual(390);
  expect(drawer.y + drawer.height).toBeLessThanOrEqual(845);
  const targets = await page.locator('#lesson-drawer button').evaluateAll(buttons => buttons
    .filter(button => button.getClientRects().length)
    .map(button => button.getBoundingClientRect().height));
  expect(targets.every(height => height >= 44)).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.locator('#lessons-trigger')).toBeFocused();
  expect(errors).toEqual([]);
});

test('compact lesson session controls are restrained, accessible, and contained', async ({ page }) => { // Tests INV-30, INV-34
  const errors = monitor(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await open(page, { viewport });
    await page.locator('#lessons-trigger').click();
    await page.locator('[data-start-lesson="retina-to-v1"]').click();
    await page.locator('#back-to-atlas').click();

    const returning = page.locator('#return-to-lesson');
    const exiting = page.locator('#exit-lesson');
    await expect(returning).toHaveText('Return to lesson');
    await expect(returning).toHaveAccessibleName(/^Return to Early vision.*Topic overview$/i);
    await expect(exiting).toHaveText('Exit lesson');
    const controls = await page.locator('#lesson-session-actions').evaluate(element => {
      const returnButton = document.getElementById('return-to-lesson');
      const exitButton = document.getElementById('exit-lesson');
      return {
        hidden: element.hidden,
        returnHeight: returnButton.getBoundingClientRect().height,
        exitHeight: exitButton.getBoundingClientRect().height,
        returnBackground: getComputedStyle(returnButton).backgroundColor,
        importVisible: document.getElementById('lesson-import-trigger').getClientRects().length > 0,
        brandTitleClipped: document.getElementById('lesson-brand-title').getClientRects().length > 0
          && document.getElementById('lesson-brand-title').scrollWidth > document.getElementById('lesson-brand-title').clientWidth,
        kickerWrapped: document.querySelector('.brand-kicker').getClientRects().length > 0
          && document.querySelector('.brand-kicker').getBoundingClientRect().height > 18,
        headerOverlap: Math.max(0,
          (document.getElementById('lesson-brand-title').getClientRects().length > 0
            ? document.getElementById('lesson-brand-title')
            : document.querySelector('.brand-kicker')).getBoundingClientRect().right
              - element.getBoundingClientRect().left),
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      };
    });
    expect(controls.hidden).toBe(false);
    expect(controls.returnHeight).toBeGreaterThanOrEqual(44);
    expect(controls.exitHeight).toBeGreaterThanOrEqual(44);
    expect(controls.returnBackground).not.toBe('rgb(67, 220, 203)');
    expect(controls.importVisible).toBe(false);
    expect(controls.brandTitleClipped).toBe(false);
    expect(controls.kickerWrapped).toBe(false);
    expect(controls.headerOverlap).toBe(0);
    expect(controls.overflow).toBe(0);
  }
  expect(errors).toEqual([]);
});

test('no-WebGL Atlas retains lessons, sources, import, and semantic return without Three.js', async ({ page }) => { // Tests INV-31
  const errors = monitor(page);
  const resources = [];
  page.on('request', request => resources.push(request.url()));
  await open(page, { path: '?no-webgl=1', states: ['fallback'] });

  await expect(page.locator('#atlas-workspace')).toBeVisible();
  await expect(page.locator('#stage-fallback')).toBeVisible();
  await expect(page.locator('#lessons-trigger')).toBeVisible();
  await expect(page.locator('#lesson-import-trigger')).toBeVisible();
  expect(await page.locator('canvas').count()).toBe(0);
  expect(resources.some(url => /\/src\/main\.js|three/i.test(url))).toBe(false);

  await page.locator('#lessons-trigger').click();
  await expect(page.locator('#atlas-project-links a')).toHaveCount(4);
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await expect(page.locator('#lesson-title')).toContainText('Early vision');
  await expect(page.locator('#back-to-atlas')).toBeVisible();
  await page.locator('#back-to-atlas').click();
  await expect(page.locator('#return-to-lesson')).toBeVisible();
  await page.locator('#return-to-lesson').click();
  await expect(page.locator('#lesson-title')).toBeVisible();
  await page.locator('#back-to-atlas').click();
  await page.locator('#exit-lesson').click();
  await expect(page.locator('#lesson-session-actions')).toBeHidden();
  await expect(page.locator('#stage-fallback')).toBeFocused();
  expect(await page.evaluate(() => window.__lesson.workspaceState.lessonToken)).toBeNull();
  expect(await page.locator('canvas').count()).toBe(0);
  expect(errors).toEqual([]);
});

test('renderer import failure leaves Atlas navigation and readable lessons available', async ({ page }) => { // Tests FAIL-29
  const errors = monitor(page);
  await page.route('**/src/main.js', route => route.abort());
  await open(page, { states: ['fallback'] });

  await expect(page.locator('#atlas-workspace')).toBeVisible();
  await expect(page.locator('#stage-fallback')).toContainText('remain accessible');
  await expect(page.locator('#lessons-trigger')).toBeVisible();
  await expect(page.locator('#viewer-console')).toBeHidden();
  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await expect(page.locator('#lesson-reader')).toBeVisible();
  await page.locator('#back-to-atlas').click();
  await expect(page.locator('#lesson-session-actions')).toBeVisible();
  await page.locator('#exit-lesson').click();
  await expect(page.locator('#lesson-session-actions')).toBeHidden();
  await expect(page.locator('#stage-fallback')).toBeFocused();
  expect(await page.locator('canvas').count()).toBe(0);
  expect(errors.every(error => typeof error === 'string')).toBe(true);
});

test('reduced motion settles Atlas and Lesson while preserving workspace return', async ({ page }) => { // Tests INV-32
  const errors = monitor(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await open(page);
  await expect(page.locator('#play')).toBeDisabled();
  expect(await page.evaluate(() => window.__view.controls.autoRotate)).toBe(false);

  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  expect(await page.evaluate(() => window.__lesson.controllerState.reducedMotion)).toBe(true);
  await page.locator('#back-to-atlas').click();
  await page.locator('#return-to-lesson').click();
  expect(await page.evaluate(() => window.__lesson.controllerState.reducedMotion)).toBe(true);
  await expect(page.locator('#play')).toBeDisabled();
  expect(errors).toEqual([]);
});

test('unknown and unavailable session routes normalize to Atlas with recovery guidance', async ({ page }) => { // Tests FAIL-30
  const errors = monitor(page);
  await open(page, { path: '?lesson=unknown' });
  expect(new URL(page.url()).searchParams.has('lesson')).toBe(false);
  await expect(page.locator('#announcer')).toContainText('unavailable');

  await page.goto(new URL('?lesson=local', BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  expect(new URL(page.url()).searchParams.has('lesson')).toBe(false);
  await expect(page.locator('#announcer')).toContainText('not retained');
  expect(await page.evaluate(() => window.__lesson.workspaceState.mode)).toBe('atlas');
  expect(errors).toEqual([]);
});

test('short-wide Atlas keeps the single stage and control rail inside the viewport', async ({ page }) => { // Tests INV-30
  const errors = monitor(page);
  await open(page, { viewport: { width: 800, height: 450 } });
  const geometry = await page.evaluate(() => {
    const workspace = document.getElementById('atlas-workspace').getBoundingClientRect();
    const stage = document.getElementById('stage').getBoundingClientRect();
    const controls = document.getElementById('viewer-console').getBoundingClientRect();
    return {
      workspace: workspace.toJSON(),
      stage: stage.toJSON(),
      controls: controls.toJSON(),
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      canvases: document.querySelectorAll('canvas').length,
    };
  });
  expect(geometry.overflow).toBe(0);
  expect(geometry.stage.bottom).toBeLessThanOrEqual(geometry.workspace.bottom + 1);
  expect(geometry.controls.bottom).toBeLessThanOrEqual(geometry.workspace.bottom + 1);
  expect(geometry.canvases).toBe(1);
  expect(errors).toEqual([]);
});
