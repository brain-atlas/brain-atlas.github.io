const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';

function monitor(page) {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
}

async function ready(page, viewport = { width: 1440, height: 900 }) {
  await page.setViewportSize(viewport);
  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
}

test('scene Explore preserves rendered camera, commands do not snap it, and Return restores lesson', async ({ page }) => {
  const errors = monitor(page);
  await ready(page);
  await page.locator('#scene-next').click();
  await page.locator('#scene-skip').click();
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.__view.camera.position.set(121, 33, -99);
    window.__view.controls.target.set(4, -6, 17);
    window.__view.controls.update();
  });
  const before = await page.evaluate(() => ({
    scene: window.__lesson.controllerState.activeSceneId,
    snapshot: window.__lesson.controllerState.activeIndex,
    scroll: document.getElementById('page-scroll').scrollTop,
    canvas: document.querySelector('canvas'),
  }));
  await page.locator('#explore-scene-trigger').click();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  await expect(page.locator('#atlas-workspace')).toHaveAccessibleName('Explore the human visual system');
  await expect(page.locator('#return-to-lesson')).toBeFocused();
  expect(await page.evaluate(() => ({
    kind: window.__lesson.exploreState.kind,
    camera: {
      ...window.__lesson.exploreState.snapshot.camera,
      position: window.__lesson.exploreState.snapshot.camera.position.map(value => Math.round(value * 1000) / 1000),
      target: window.__lesson.exploreState.snapshot.camera.target.map(value => Math.round(value * 1000) / 1000),
    },
    policy: window.__lesson.exploreState.snapshot.controlPolicy.mode,
    touch: document.querySelector('#stage canvas').style.touchAction,
    fieldset: document.getElementById('viewer-controls-fieldset').disabled,
  }))).toEqual({
    kind: 'scene',
    camera: { position: [121, 33, -99], target: [4, -6, 17], transition: { kind: 'instant', durationMs: 0 } },
    policy: 'explore',
    touch: 'none',
    fieldset: false,
  });

  const authoredExplore = await page.evaluate(() => window.__lesson.exploreState.snapshot);
  const pathwayToggle = page.locator('#layers input[data-id="anterior"]');
  await expect(pathwayToggle).toBeChecked();
  await pathwayToggle.uncheck();
  expect(await page.evaluate(() => window.__lesson.exploreState.snapshot.visibility.entities.includes('pathway.anterior'))).toBe(false);

  await page.evaluate(() => {
    window.__view.camera.position.set(80, 40, -70);
    window.__view.controls.target.set(3, 2, 1);
    window.__view.controls.update();
  });
  await page.locator('#tissue').evaluate(element => {
    element.value = '42';
    element.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(await page.evaluate(() => ({
    position: window.__view.camera.position.toArray().map(value => Math.round(value * 1000) / 1000),
    target: window.__view.controls.target.toArray().map(value => Math.round(value * 1000) / 1000),
    tissue: window.__lesson.exploreState.snapshot.material.tissueOpacity,
  }))).toEqual({ position: [80, 40, -70], target: [3, 2, 1], tissue: 0.42 });

  await page.locator('#model-sources-trigger').click();
  await expect(page.locator('#fidelity-panel')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('#fidelity-panel')).toBeHidden();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  await page.locator('#return-to-lesson').click();
  await expect(page.locator('#atlas-workspace')).toBeHidden();
  await expect(page.locator('#back-to-atlas')).toBeFocused();
  expect(await page.evaluate(() => ({
    scene: window.__lesson.controllerState.activeSceneId,
    index: window.__lesson.controllerState.activeIndex,
    explore: window.__lesson.exploreState,
    scroll: document.getElementById('page-scroll').scrollTop,
    canvases: document.querySelectorAll('canvas').length,
    fieldset: document.getElementById('viewer-controls-fieldset').disabled,
    touch: document.querySelector('#stage canvas').style.touchAction,
    pathwayChecked: document.querySelector('#layers input[data-id="anterior"]').checked,
    tissue: Number(document.getElementById('tissue').value) / 100,
  }))).toEqual({
    scene: before.scene,
    index: before.snapshot,
    explore: null,
    scroll: before.scroll,
    canvases: 1,
    fieldset: true,
    touch: 'pan-y',
    pathwayChecked: authoredExplore.visibility.entities.includes('pathway.anterior'),
    tissue: authoredExplore.material.tissueOpacity,
  });
  await page.locator('#explore-scene-trigger').click();
  expect(await page.evaluate(() => ({
    pathway: window.__lesson.exploreState.snapshot.visibility.entities.includes('pathway.anterior'),
    tissue: window.__lesson.exploreState.snapshot.material.tissueOpacity,
  }))).toEqual({
    pathway: authoredExplore.visibility.entities.includes('pathway.anterior'),
    tissue: authoredExplore.material.tissueOpacity,
  });
  await page.locator('#return-to-lesson').click();
  expect(errors).toEqual([]);
});

test('brand handoff preserves the rendered lesson camera in Atlas', async ({ page }) => { // Tests INV-34
  const errors = monitor(page);
  await ready(page);
  if (await page.locator('#scene-skip').isVisible()) await page.locator('#scene-skip').click();
  await page.evaluate(() => {
    window.__view.camera.position.set(101, 31, -82);
    window.__view.controls.target.set(4, -5, 16);
    window.__view.controls.update();
  });
  await page.locator('.brand').click();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  expect(await page.evaluate(() => ({
    kind: window.__lesson.exploreState.kind,
    camera: {
      ...window.__lesson.exploreState.snapshot.camera,
      position: window.__lesson.exploreState.snapshot.camera.position.map(value => Math.round(value * 1000) / 1000),
      target: window.__lesson.exploreState.snapshot.camera.target.map(value => Math.round(value * 1000) / 1000),
    },
  }))).toEqual({
    kind: 'scene',
    camera: {
      position: [101, 31, -82],
      target: [4, -5, 16],
      transition: { kind: 'instant', durationMs: 0 },
    },
  });
  expect(errors).toEqual([]);
});

test('Back to atlas preserves the rendered lesson view and Return restores the lesson', async ({ page }) => { // Tests INV-34
  const errors = monitor(page);
  await ready(page, { width: 390, height: 844 });
  await page.locator('#scene-next').click();
  await page.locator('#scene-skip').click();
  await page.evaluate(() => {
    window.__view.camera.position.set(117, 29, -93);
    window.__view.controls.target.set(5, -7, 19);
    window.__view.controls.update();
  });
  const lessonState = await page.evaluate(() => {
    const index = window.__lesson.navigation.activeIndex;
    const scene = index === -1
      ? window.__lesson.presentation.entryScene
      : window.__lesson.presentation.scenes[index];
    return {
      camera: window.__view.camera.position.toArray(),
      target: window.__view.controls.target.toArray(),
      visible: scene.snapshot.visibility.entities,
    };
  });
  await page.locator('#back-to-atlas').click();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  const state = await page.evaluate(() => ({
    kind: window.__lesson.exploreState.kind,
    visible: window.__lesson.exploreState.snapshot.visibility.entities,
    camera: window.__lesson.exploreState.snapshot.camera,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    root: [scrollX, scrollY],
    canvases: document.querySelectorAll('canvas').length,
  }));
  expect(state.kind).toBe('scene');
  expect(state.visible).toEqual(lessonState.visible);
  expect(state.camera).toEqual({
    position: lessonState.camera,
    target: lessonState.target,
    transition: { kind: 'instant', durationMs: 0 },
  });
  expect(state.overflow).toBe(0);
  expect(state.root).toEqual([0, 0]);
  expect(state.canvases).toBe(1);
  await page.locator('#return-to-lesson').click();
  await expect(page.locator('#atlas-workspace')).toBeHidden();
  await expect(page.locator('#back-to-atlas')).toBeFocused();
  expect(errors).toEqual([]);
});
