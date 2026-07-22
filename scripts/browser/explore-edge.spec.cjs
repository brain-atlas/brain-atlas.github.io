const { test, expect } = require('@playwright/test');
const path = require('path');
const project = path.resolve(__dirname, '../..');
const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';

function monitor(page) {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
}

async function ready(page, url = BASE_URL, viewport = { width: 1440, height: 900 }) {
  await page.setViewportSize(viewport);
  await page.goto(url);
  await page.waitForFunction(() => ['ready', 'fallback'].includes(document.getElementById('app')?.dataset.state));
}

test('one renderer survives repeated Explore cycles and resizes to the reparented stage', async ({ page }) => {
  const errors = monitor(page);
  await ready(page);
  await page.evaluate(() => { document.querySelector('canvas').dataset.identity = 'original'; });
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await page.locator('#explore-scene-trigger').click();
    await expect(page.locator('#explore-dialog')).toBeVisible();
    await page.waitForTimeout(50);
    const geometry = await page.evaluate(() => {
      const rect = document.getElementById('stage').getBoundingClientRect();
      const canvasRect = document.querySelector('canvas').getBoundingClientRect();
      return {
        aspect: window.__view.camera.aspect,
        expected: rect.width / rect.height,
        canvas: [canvasRect.width, canvasRect.height],
        stage: [rect.width, rect.height],
        identity: document.querySelector('canvas').dataset.identity,
        count: document.querySelectorAll('canvas').length,
      };
    });
    expect(Math.abs(geometry.aspect - geometry.expected)).toBeLessThan(1e-6);
    expect(geometry.canvas).toEqual(geometry.stage);
    expect(geometry.identity).toBe('original');
    expect(geometry.count).toBe(1);
    await page.locator('#explore-return').click();
    await expect(page.locator('#explore-dialog')).toBeHidden();
  }
  expect(errors).toEqual([]);
});

test('responsive Explore keeps exact stage aspect and usable controls at compact and short-wide sizes', async ({ page }) => {
  const errors = monitor(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 800, height: 450 }, { width: 320, height: 568 }]) {
    await ready(page, BASE_URL, viewport);
    await page.locator('#explore-atlas-trigger').click();
    await page.waitForTimeout(80);
    const result = await page.evaluate(() => {
      const rect = document.getElementById('stage').getBoundingClientRect();
      const returns = document.getElementById('explore-return').getBoundingClientRect();
      const model = document.getElementById('model-sources-trigger').getBoundingClientRect();
      return {
        aspectError: Math.abs(window.__view.camera.aspect - rect.width / rect.height),
        stage: [rect.width, rect.height],
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        returnTarget: [returns.width, returns.height],
        modelTarget: [model.width, model.height],
        root: [scrollX, scrollY],
      };
    });
    expect(result.aspectError).toBeLessThan(1e-6);
    expect(result.stage[0]).toBeGreaterThan(0);
    expect(result.stage[1]).toBeGreaterThan(0);
    expect(result.overflow).toBe(0);
    expect(result.returnTarget[1]).toBeGreaterThanOrEqual(44);
    expect(result.modelTarget[1]).toBeGreaterThanOrEqual(44);
    expect(result.root).toEqual([0, 0]);
    await page.locator('#viewer-console > summary').click();
    await expect(page.locator('[data-explore-camera="zoom-in"]')).toBeVisible();
    await page.locator('#explore-return').click();
  }
  expect(errors).toEqual([]);
});

test('every viewer axis edits canonical Explore state without snapping the camera', async ({ page }) => {
  const errors = monitor(page);
  await ready(page);
  await page.locator('#explore-atlas-trigger').click();
  await page.evaluate(() => {
    window.__view.camera.position.set(130, 40, -110);
    window.__view.controls.target.set(5, -3, 12);
    window.__view.controls.update();
  });
  await page.locator('#layers .hemi-chip input').first().uncheck();
  const lgnRow = page.locator('[data-entity-id="region.lgn"]');
  await lgnRow.locator('xpath=ancestor::div[contains(@class,"lyr-grpwrap")]').locator('.caret').click();
  await lgnRow.locator('.pill').first().click();
  await page.locator('#layers input[data-id="anterior"]').uncheck();
  await page.locator('#play').click();
  for (const [selector, value] of [['#speed', '85'], ['#clip', '42'], ['#tissue', '42']]) {
    await page.locator(selector).evaluate((element, next) => {
      element.value = next;
      element.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }
  expect(await page.evaluate(() => {
    const snapshot = window.__lesson.exploreState.snapshot;
    return {
      camera: {
        position: snapshot.camera.position.map(value => Math.round(value * 100) / 100),
        target: snapshot.camera.target.map(value => Math.round(value * 100) / 100),
      },
      global: snapshot.hemispheres.global,
      lgn: snapshot.hemispheres.entities['region.lgn'],
      anterior: snapshot.visibility.entities.includes('pathway.anterior'),
      playback: snapshot.playback,
      cutaway: snapshot.cutaway,
      tissue: snapshot.material.tissueOpacity,
    };
  })).toEqual({
    camera: { position: [130, 40, -110], target: [5, -3, 12] },
    global: { L: false, R: true },
    lgn: { L: false, R: true },
    anterior: false,
    playback: { playing: false, speed: 85, settled: false },
    cutaway: { position: 42 },
    tissue: 0.42,
  });

  const beforeZoom = await page.evaluate(() => window.__view.camera.position.distanceTo(window.__view.controls.target));
  await page.locator('[data-explore-camera="zoom-in"]').click();
  const afterZoom = await page.evaluate(() => window.__view.camera.position.distanceTo(window.__view.controls.target));
  expect(afterZoom).toBeLessThan(beforeZoom);
  const beforePan = await page.evaluate(() => window.__view.controls.target.toArray());
  await page.locator('[data-explore-camera="pan-left"]').click();
  expect(await page.evaluate(() => window.__view.controls.target.toArray())).not.toEqual(beforePan);
  await page.locator('#reset').click();
  expect(await page.evaluate(() => ({
    position: window.__view.camera.position.toArray().map(value => Math.round(value)),
    target: window.__view.controls.target.toArray().map(value => Math.round(value)),
  }))).toEqual({ position: [210, 75, -195], target: [0, 0, 0] });

  const canvas = page.locator('#stage canvas');
  const box = await canvas.boundingBox();
  const cameraBeforeDrag = await page.evaluate(() => window.__view.camera.position.toArray());
  await page.mouse.move(box.x + box.width * 0.5, box.y + box.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.65, box.y + box.height * 0.55, { steps: 5 });
  await page.mouse.up();
  expect(await page.evaluate(() => window.__view.camera.position.toArray())).not.toEqual(cameraBeforeDrag);
  await page.locator('#explore-return').click();
  expect(errors).toEqual([]);
});

test('reduced-motion changes during Explore are synchronized back to the lesson controller', async ({ page }) => {
  const errors = monitor(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await ready(page);
  await page.locator('#explore-scene-trigger').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#play')).toBeDisabled();
  await page.locator('#explore-return').click();
  await page.locator('#scene-next').click();
  expect(await page.evaluate(() => ({
    index: window.__lesson.controllerState.activeIndex,
    reduced: document.body.classList.contains('reduced-motion'),
    skip: document.getElementById('scene-skip').hidden,
  }))).toEqual({ index: 0, reduced: true, skip: true });

  await page.locator('#explore-scene-trigger').click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('#play')).toBeEnabled();
  await page.locator('#explore-return').click();
  await page.locator('#scene-next').click();
  expect(await page.evaluate(() => ({
    index: window.__lesson.controllerState.activeIndex,
    reduced: document.body.classList.contains('reduced-motion'),
    skip: document.getElementById('scene-skip').hidden,
  }))).toEqual({ index: 1, reduced: false, skip: false });
  expect(errors).toEqual([]);
});

test('imported lesson can enter and leave Explore through the rebuilt renderer bridge', async ({ page }) => {
  const errors = monitor(page);
  await ready(page);
  await page.locator('#lesson-import-trigger').click();
  await page.locator('#lesson-import-file').setInputFiles(path.join(project, 'test/fixtures/lessons/visual-field-crossing.md'));
  await page.locator('#lesson-import-validate').click();
  await expect(page.locator('#lesson-import-open')).toBeEnabled();
  await page.locator('#lesson-import-open').click();
  await page.waitForFunction(() => window.__lesson?.sourceKind === 'local' && window.__lesson?.controllerState?.status === 'ready');
  await page.locator('#explore-scene-trigger').click();
  await expect(page.locator('#explore-dialog')).toBeVisible();
  expect(await page.evaluate(() => ({
    title: window.__lesson.lesson.title,
    kind: window.__lesson.exploreState.kind,
    canvases: document.querySelectorAll('canvas').length,
    stage: document.getElementById('stage').hidden,
  }))).toEqual({ title: 'How visual fields cross', kind: 'scene', canvases: 1, stage: false });
  await page.locator('#explore-return').click();
  await expect(page.locator('#app-status')).toHaveText('Local lesson · not saved');
  expect(errors).toEqual([]);
});

test('Explore entry rolls back transactionally when panel synchronization fails', async ({ page }) => {
  const errors = monitor(page);
  await ready(page);
  const before = await page.evaluate(() => {
    document.getElementById('clip').remove();
    return {
      scroll: document.getElementById('page-scroll').scrollTop,
      stageParent: document.querySelector('.stage-shell').parentElement.className,
    };
  });
  await page.locator('#explore-scene-trigger').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'fallback');
  await expect(page.locator('#explore-dialog')).toBeHidden();
  await expect(page.locator('#stage')).toBeHidden();
  await expect(page.locator('#stage-fallback')).toBeVisible();
  await expect(page.locator('#explore-atlas-trigger')).toBeHidden();
  expect(await page.evaluate(() => ({
    scroll: document.getElementById('page-scroll').scrollTop,
    stageParent: document.querySelector('.stage-shell').parentElement.className,
    canvases: document.querySelectorAll('canvas').length,
    explore: window.__lesson.exploreState,
  }))).toEqual({ ...before, canvases: 1, explore: null });
  expect(errors.some(error => /Explore mode failed/i.test(error))).toBe(true);
});

test('Explore actions stay unavailable in no-WebGL and renderer-import failure fallbacks', async ({ page }) => {
  const errors = monitor(page);
  await ready(page, `${BASE_URL}?no-webgl=1`);
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'fallback');
  await expect(page.locator('#explore-atlas-trigger')).toBeHidden();
  await expect(page.locator('#explore-scene-trigger')).toBeHidden();
  expect(await page.locator('canvas').count()).toBe(0);

  await page.route('**/src/main.js*', route => route.abort());
  await ready(page, BASE_URL);
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'fallback');
  await expect(page.locator('#explore-atlas-trigger')).toBeHidden();
  await expect(page.locator('#explore-scene-trigger')).toBeHidden();
  await expect(page.locator('#fallback-message')).toContainText('could not initialize');
});
