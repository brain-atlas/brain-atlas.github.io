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

async function directLesson(page, viewport) {
  await ready(page, new URL('?lesson=retina-to-v1', BASE_URL).href, viewport);
}

test('one renderer survives repeated scene-inspection cycles and resizes to the shared stage', async ({ page }) => {
  const errors = monitor(page);
  await directLesson(page);
  await page.evaluate(() => {
    document.querySelector('canvas').dataset.identity = 'original';
    window.__aspectAtWorkspaceMove = [];
    new MutationObserver(() => {
      const stage = document.getElementById('stage');
      const rect = stage.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        window.__aspectAtWorkspaceMove.push(Math.abs(window.__view.camera.aspect - rect.width / rect.height));
      }
    }).observe(document.getElementById('app'), { childList: true, subtree: true });
  });
  for (let cycle = 0; cycle < 3; cycle += 1) {
    await page.locator('#explore-scene-trigger').click();
    await expect(page.locator('#atlas-workspace')).toBeVisible();
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
    expect(Math.max(...await page.evaluate(() => window.__aspectAtWorkspaceMove))).toBeLessThan(1e-6);
    expect(geometry.canvas).toEqual(geometry.stage);
    expect(geometry.identity).toBe('original');
    expect(geometry.count).toBe(1);
    await page.locator('#return-to-lesson').click();
    await expect(page.locator('#atlas-workspace')).toBeHidden();
  }
  expect(errors).toEqual([]);
});

test('responsive Atlas keeps exact stage aspect and usable controls', async ({ page }) => {
  const errors = monitor(page);
  for (const viewport of [{ width: 390, height: 844 }, { width: 800, height: 450 }, { width: 320, height: 568 }]) {
    await ready(page, BASE_URL, viewport);
    const result = await page.evaluate(() => {
      const rect = document.getElementById('stage').getBoundingClientRect();
      const lessons = document.getElementById('lessons-trigger').getBoundingClientRect();
      const model = document.getElementById('model-sources-trigger').getBoundingClientRect();
      return {
        aspectError: Math.abs(window.__view.camera.aspect - rect.width / rect.height),
        stage: [rect.width, rect.height],
        overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
        lessonsTarget: [lessons.width, lessons.height],
        modelTarget: [model.width, model.height],
        root: [scrollX, scrollY],
      };
    });
    expect(result.aspectError).toBeLessThan(1e-6);
    expect(result.stage[0]).toBeGreaterThan(0);
    expect(result.stage[1]).toBeGreaterThan(0);
    expect(result.overflow).toBe(0);
    expect(result.lessonsTarget[1]).toBeGreaterThanOrEqual(44);
    expect(result.modelTarget[1]).toBeGreaterThanOrEqual(44);
    expect(result.root).toEqual([0, 0]);
    await page.locator('#viewer-console > summary').click();
    await expect(page.locator('[data-explore-camera="zoom-in"]')).toBeVisible();
  }
  expect(errors).toEqual([]);
});

test('every viewer axis edits canonical Atlas state without snapping the camera', async ({ page }) => {
  const errors = monitor(page);
  await ready(page);
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
  expect(await page.evaluate(() => window.__view.camera.position.distanceTo(window.__view.controls.target))).toBeLessThan(beforeZoom);
  const beforePan = await page.evaluate(() => window.__view.controls.target.toArray());
  await page.locator('[data-explore-camera="pan-left"]').click();
  expect(await page.evaluate(() => window.__view.controls.target.toArray())).not.toEqual(beforePan);
  await page.locator('#reset').click();
  expect(await page.evaluate(() => ({
    position: window.__view.camera.position.toArray().map(value => Math.round(value)),
    target: window.__view.controls.target.toArray().map(value => Math.round(value)),
  }))).toEqual({ position: [210, 75, -195], target: [0, 0, 0] });
  expect(errors).toEqual([]);
});

test('reduced-motion changes during scene inspection synchronize back to Lesson', async ({ page }) => {
  const errors = monitor(page);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await directLesson(page);
  await page.locator('#explore-scene-trigger').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await expect(page.locator('#play')).toBeDisabled();
  await page.locator('#return-to-lesson').click();
  expect(await page.evaluate(() => ({
    reduced: window.__lesson.controllerState.reducedMotion,
    body: document.body.classList.contains('reduced-motion'),
    skip: document.getElementById('scene-skip').hidden,
  }))).toEqual({ reduced: true, body: true, skip: true });

  await page.locator('#explore-scene-trigger').click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await expect(page.locator('#play')).toBeEnabled();
  await page.locator('#return-to-lesson').click();
  expect(await page.evaluate(() => ({
    reduced: window.__lesson.controllerState.reducedMotion,
    body: document.body.classList.contains('reduced-motion'),
  }))).toEqual({ reduced: false, body: false });
  expect(errors).toEqual([]);
});

test('imported lesson enters and leaves scene inspection through the rebuilt renderer bridge', async ({ page }) => {
  const errors = monitor(page);
  await ready(page);
  await page.locator('#lesson-import-trigger').click();
  await page.locator('#lesson-import-file').setInputFiles(path.join(project, 'test/fixtures/lessons/visual-field-crossing.md'));
  await page.locator('#lesson-import-validate').click();
  await expect(page.locator('#lesson-import-open')).toBeEnabled();
  await page.locator('#lesson-import-open').click();
  await page.waitForFunction(() => window.__lesson?.sourceKind === 'local' && window.__lesson?.controllerState?.status === 'ready');
  await page.locator('#explore-scene-trigger').click();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  expect(await page.evaluate(() => ({
    title: window.__lesson.lesson.title,
    kind: window.__lesson.exploreState.kind,
    canvases: document.querySelectorAll('canvas').length,
    stage: document.getElementById('stage').hidden,
  }))).toEqual({ title: 'How visual fields cross', kind: 'scene', canvases: 1, stage: false });
  await page.locator('#return-to-lesson').click();
  await expect(page.locator('#app-status')).toHaveText('Local lesson · not saved');
  expect(errors).toEqual([]);
});

test('scene-inspection entry rolls back transactionally when panel synchronization fails', async ({ page }) => {
  const errors = monitor(page);
  await directLesson(page);
  const before = await page.evaluate(() => {
    document.getElementById('clip').remove();
    return {
      scroll: document.getElementById('page-scroll').scrollTop,
      stageParent: document.querySelector('.stage-shell').parentElement.className,
    };
  });
  await page.locator('#explore-scene-trigger').click();
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'fallback');
  await expect(page.locator('#atlas-workspace')).toBeHidden();
  await expect(page.locator('#stage')).toBeHidden();
  await expect(page.locator('#stage-fallback')).toBeVisible();
  await expect(page.locator('#back-to-atlas')).toBeVisible();
  expect(await page.evaluate(() => ({
    scroll: document.getElementById('page-scroll').scrollTop,
    stageParent: document.querySelector('.stage-shell').parentElement.className,
    canvases: document.querySelectorAll('canvas').length,
    explore: window.__lesson.exploreState,
  }))).toEqual({ ...before, canvases: 1, explore: null });
  expect(errors.some(error => /Explore mode failed/i.test(error))).toBe(true);
});

test('renderer-only scene inspection stays unavailable in fallback Atlas and Lesson', async ({ page }) => {
  await ready(page, `${BASE_URL}?no-webgl=1`);
  await expect(page.locator('#app')).toHaveAttribute('data-state', 'fallback');
  await expect(page.locator('#explore-scene-trigger')).toBeHidden();
  expect(await page.locator('canvas').count()).toBe(0);

  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await expect(page.locator('#explore-scene-trigger')).toBeHidden();
  await expect(page.locator('#back-to-atlas')).toBeVisible();
});
