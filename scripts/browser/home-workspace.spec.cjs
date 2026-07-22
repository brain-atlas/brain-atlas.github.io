const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';

function monitor(page) {
  const errors = [];
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('pageerror', error => errors.push(String(error)));
  return errors;
}

async function ready(page, viewport = { width: 1440, height: 900 }, path = '') {
  await page.setViewportSize(viewport);
  await page.goto(new URL(path, BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
}

test('Atlas is the default top-level workspace and reuses the single viewer surface', async ({ page }) => { // Tests INV-25
  const errors = monitor(page);
  await ready(page);

  await expect(page.locator('#atlas-workspace')).toBeVisible();
  await expect(page.locator('#page-scroll')).toBeHidden();
  await expect(page.locator('#atlas-heading')).toHaveText('Explore the human visual system');
  await expect(page.locator('#stage')).toBeVisible();
  await expect(page.locator('#viewer-console')).toBeVisible();
  await expect(page.locator('#explore-dialog')).toHaveCount(0);
  expect(await page.locator('canvas').count()).toBe(1);
  expect(await page.evaluate(() => ({
    workspaceMode: window.__lesson.workspaceState.mode,
    stageInAtlas: document.getElementById('atlas-workspace').contains(document.querySelector('.stage-shell')),
    rootScroll: [window.scrollX, window.scrollY],
  }))).toEqual({ workspaceMode: 'atlas', stageInAtlas: true, rootScroll: [0, 0] });
  expect(errors).toEqual([]);
});

test('checked lesson routes and browser history restore Atlas and Lesson', async ({ page }) => { // Tests INV-29
  const errors = monitor(page);
  await ready(page, { width: 1200, height: 800 }, '?lesson=retina-to-v1');

  await expect(page.locator('#page-scroll')).toBeVisible();
  await expect(page.locator('#atlas-workspace')).toBeHidden();
  await expect(page.locator('#back-to-atlas')).toBeVisible();
  expect(new URL(page.url()).searchParams.get('lesson')).toBe('retina-to-v1');

  await page.locator('#back-to-atlas').click();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  expect(new URL(page.url()).searchParams.has('lesson')).toBe(false);

  await page.goBack();
  await expect(page.locator('#page-scroll')).toBeVisible();
  await expect(page.locator('#lesson-title')).toBeFocused();
  expect(new URL(page.url()).searchParams.get('lesson')).toBe('retina-to-v1');
  expect(await page.evaluate(() => window.__lesson.workspaceState.mode)).toBe('lesson');

  await page.goForward();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  await expect(page.locator('#return-to-lesson')).toBeFocused();
  expect(await page.locator('canvas').count()).toBe(1);
  expect(errors).toEqual([]);
});

test('browser Back from Lesson preserves the rendered lesson view in Atlas', async ({ page }) => { // Tests INV-29, INV-34
  const errors = monitor(page);
  await ready(page);
  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  if (await page.locator('#scene-skip').isVisible()) await page.locator('#scene-skip').click();
  await page.evaluate(() => {
    window.__view.camera.position.set(109, 27, -87);
    window.__view.controls.target.set(6, -4, 18);
    window.__view.controls.update();
  });
  await page.goBack();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  expect(await page.evaluate(() => ({
    kind: window.__lesson.exploreState.kind,
    position: window.__lesson.exploreState.snapshot.camera.position.map(value => Math.round(value * 1000) / 1000),
    target: window.__lesson.exploreState.snapshot.camera.target.map(value => Math.round(value * 1000) / 1000),
  }))).toEqual({ kind: 'scene', position: [109, 27, -87], target: [6, -4, 18] });
  await expect(page.locator('#return-to-lesson')).toBeFocused();
  expect(errors).toEqual([]);
});

test('scene inspection uses a temporary Atlas branch and preserves the global Atlas workspace', async ({ page }) => { // Tests INV-28
  const errors = monitor(page);
  await ready(page);
  await page.locator('#clip').evaluate(input => {
    input.value = '27';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(await page.evaluate(() => window.__lesson.workspaceState.persistentAtlasSnapshot.cutaway.position)).toBe(27);

  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await page.locator('#scene-next').click();
  await page.locator('#scene-skip').click();
  await page.waitForTimeout(800);
  const lessonPose = await page.evaluate(() => ({
    index: window.__lesson.navigation.activeIndex,
    camera: window.__view.camera.position.toArray(),
    target: window.__view.controls.target.toArray(),
  }));

  await page.locator('#explore-scene-trigger').click();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  expect(await page.evaluate(() => window.__lesson.workspaceState.atlasKind)).toBe('scene');
  expect(await page.evaluate(() => window.__lesson.exploreState.snapshot.cutaway.position)).not.toBe(27);
  await page.locator('#tissue').evaluate(input => {
    input.value = '48';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.goBack();
  await expect(page.locator('#page-scroll')).toBeVisible();
  await page.goForward();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  expect(await page.evaluate(() => window.__lesson.workspaceState.atlasKind)).toBe('scene');
  await page.locator('#return-to-lesson').click();
  const returnedPose = await page.evaluate(() => ({
    index: window.__lesson.navigation.activeIndex,
    camera: window.__view.camera.position.toArray(),
    target: window.__view.controls.target.toArray(),
  }));
  expect(returnedPose.index).toBe(lessonPose.index);
  expect(returnedPose.camera.map(value => Math.round(value * 1000) / 1000))
    .toEqual(lessonPose.camera.map(value => Math.round(value * 1000) / 1000));
  expect(returnedPose.target.map(value => Math.round(value * 1000) / 1000))
    .toEqual(lessonPose.target.map(value => Math.round(value * 1000) / 1000));

  await page.locator('#back-to-atlas').click();
  expect(await page.evaluate(() => ({
    kind: window.__lesson.workspaceState.atlasKind,
    temporaryCutaway: window.__lesson.exploreState.snapshot.cutaway.position,
    persistentCutaway: window.__lesson.workspaceState.persistentAtlasSnapshot.cutaway.position,
  }))).toEqual({ kind: 'scene', temporaryCutaway: 0, persistentCutaway: 27 });
  expect(errors).toEqual([]);
});

test('checked Exit lesson clears resume state and resets the complete default Atlas', async ({ page }) => { // Tests INV-34, FAIL-32
  const errors = monitor(page);
  await ready(page);
  const defaultSnapshot = await page.evaluate(() => window.__lesson.exploreState.snapshot);
  await page.locator('#clip').evaluate(input => {
    input.value = '27';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await page.locator('#scene-next').click();
  await page.locator('#scene-skip').click();
  await page.locator('#back-to-atlas').click();
  await page.locator('#exit-lesson').click();

  await expect(page.locator('#lesson-session-actions')).toBeHidden();
  await expect(page.locator('#atlas-heading')).toBeFocused();
  expect(await page.evaluate(() => ({
    mode: window.__lesson.workspaceState.mode,
    kind: window.__lesson.workspaceState.atlasKind,
    token: window.__lesson.workspaceState.lessonToken,
    snapshot: window.__lesson.exploreState.snapshot,
    historyMode: history.state.mode,
    canvases: document.querySelectorAll('canvas').length,
  }))).toEqual({
    mode: 'atlas',
    kind: 'global',
    token: null,
    snapshot: defaultSnapshot,
    historyMode: 'atlas',
    canvases: 1,
  });
  await page.locator('#lessons-trigger').click();
  await expect(page.locator('[data-start-lesson="retina-to-v1"]')).toHaveText('Start lesson');
  await expect(page.locator('[data-restart-lesson="retina-to-v1"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('local lessons open from the drawer, remain resumable, and disappear on reload', async ({ page }) => { // Tests INV-29
  const errors = monitor(page);
  const source = fs.readFileSync(path.join(__dirname, '../../test/fixtures/lessons/visual-field-crossing.md'), 'utf8');
  await ready(page);

  await page.locator('#lessons-trigger').click();
  await page.locator('#lesson-drawer-open-local').click();
  await expect(page.locator('#lesson-import-dialog')).toBeVisible();
  await page.locator('#lesson-import-source').fill(source);
  await page.locator('#lesson-import-validate').click();
  await expect(page.locator('#lesson-import-open')).toBeEnabled();
  await page.locator('#lesson-import-open').click();
  await expect(page.locator('#page-scroll')).toBeVisible();
  expect(await page.evaluate(() => window.__lesson.sourceKind)).toBe('local');
  expect(new URL(page.url()).searchParams.get('lesson')).toBe('local');

  await page.goBack();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  await page.goForward();
  await expect(page.locator('#page-scroll')).toBeVisible();
  expect(await page.evaluate(() => window.__lesson.sourceKind)).toBe('local');

  await page.locator('#back-to-atlas').click();
  await expect(page.locator('#return-to-lesson')).toHaveText('Return to lesson');
  await expect(page.locator('#return-to-lesson')).toHaveAccessibleName(/^Return to How visual fields cross.*Scene 1$/i);
  await page.locator('#return-to-lesson').click();
  expect(await page.evaluate(() => window.__lesson.sourceKind)).toBe('local');
  const localHistory = await page.evaluate(() => history.state);
  expect(localHistory.mode).toBe('lesson');
  expect(localHistory.sessionKey).toMatch(/^local:/);

  await page.reload();
  await page.waitForFunction(() => ['ready', 'fallback'].includes(document.getElementById('app')?.dataset.state));
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  expect(await page.evaluate(() => history.state.mode)).toBe('atlas');
  await expect(page.locator('#announcer')).toContainText('not retained');
  expect(await page.evaluate(() => window.__lesson.workspaceState.mode)).toBe('atlas');
  expect(await page.locator('canvas').count()).toBe(1);
  expect(errors).toEqual([]);
});

test('local Exit requires confirmation and stale local history recovers to Atlas', async ({ page }) => { // Tests INV-34, FAIL-32
  const errors = monitor(page);
  const source = fs.readFileSync(path.join(__dirname, '../../test/fixtures/lessons/visual-field-crossing.md'), 'utf8');
  await ready(page);
  await page.locator('#lessons-trigger').click();
  await page.locator('#lesson-drawer-open-local').click();
  await page.locator('#lesson-import-source').fill(source);
  await page.locator('#lesson-import-validate').click();
  await page.locator('#lesson-import-open').click();
  await page.locator('#back-to-atlas').click();

  await page.locator('#exit-lesson').click();
  const dialog = page.locator('#lesson-exit-dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAccessibleName('Exit local lesson?');
  await expect(dialog).toContainText('This lesson and your place are not saved.');
  await expect(page.locator('#lesson-exit-keep')).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.locator('#exit-lesson')).toBeFocused();
  expect(await page.evaluate(() => Boolean(window.__lesson.workspaceState.lessonToken))).toBe(true);

  await page.locator('#exit-lesson').click();
  await page.locator('#lesson-exit-keep').click();
  await expect(page.locator('#exit-lesson')).toBeFocused();
  expect(await page.evaluate(() => Boolean(window.__lesson.workspaceState.lessonToken))).toBe(true);

  await page.locator('#exit-lesson').click();
  await page.goBack();
  await expect(dialog).toBeHidden();
  await expect(page.locator('#page-scroll')).toBeVisible();
  await page.goForward();
  await expect(page.locator('#return-to-lesson')).toBeFocused();

  await page.locator('#exit-lesson').click();
  await page.locator('#lesson-exit-confirm').click();
  await expect(page.locator('#lesson-session-actions')).toBeHidden();
  expect(await page.evaluate(() => window.__lesson.workspaceState.lessonToken)).toBeNull();
  await page.goBack();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  await expect(page.locator('#announcer')).toContainText('not retained');
  expect(new URL(page.url()).searchParams.has('lesson')).toBe(false);
  expect(await page.locator('canvas').count()).toBe(1);
  expect(errors).toEqual([]);
});

test('the lesson drawer starts and exactly resumes the checked lesson from Atlas', async ({ page }) => { // Tests INV-27
  const errors = monitor(page);
  await ready(page);

  await page.locator('#lessons-trigger').click();
  await expect(page.locator('#lesson-drawer')).toBeVisible();
  await expect(page.locator('[data-lesson-id="retina-to-v1"]')).toContainText('Early Vision: Retina to the Cortical Streams');
  await expect(page.locator('[data-lesson-id="retina-to-v1"]')).not.toContainText('[DRAFT]');
  await page.locator('[data-start-lesson="retina-to-v1"]').click();

  await expect(page.locator('#lesson-drawer')).toBeHidden();
  await expect(page.locator('#page-scroll')).toBeVisible();
  await expect(page.locator('#atlas-workspace')).toBeHidden();
  await expect(page.locator('#back-to-atlas')).toBeVisible();
  await expect(page.locator('#lesson-title')).toHaveText('Early Vision: Retina to the Cortical Streams');
  await expect(page.locator('#lesson-status')).toBeHidden();
  expect(await page.locator('canvas').count()).toBe(1);

  await page.locator('#scene-next').click();
  await page.locator('#scene-skip').click();
  await page.waitForTimeout(800);
  await page.evaluate(() => {
    window.__view.camera.position.set(91, 24, -83);
    window.__view.controls.target.set(3, -4, 21);
    window.__view.controls.update();
  });
  const lessonBefore = await page.evaluate(() => ({
    index: window.__lesson.navigation.activeIndex,
    scroll: document.getElementById('page-scroll').scrollTop,
    camera: window.__view.camera.position.toArray(),
    target: window.__view.controls.target.toArray(),
  }));

  await page.locator('#back-to-atlas').click();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  await expect(page.locator('#return-to-lesson')).toHaveText('Return to lesson');
  await expect(page.locator('#return-to-lesson')).toHaveAccessibleName(/^Return to Early vision.*Scene 1$/i);
  expect(await page.evaluate(() => window.__lesson.workspaceState.mode)).toBe('atlas');

  await page.locator('#return-to-lesson').click();
  await expect(page.locator('#page-scroll')).toBeVisible();
  await expect(page.locator('#back-to-atlas')).toBeFocused();
  const lessonAfter = await page.evaluate(() => ({
    index: window.__lesson.navigation.activeIndex,
    scroll: document.getElementById('page-scroll').scrollTop,
    camera: window.__view.camera.position.toArray(),
    target: window.__view.controls.target.toArray(),
    tokenScroll: window.__lesson.workspaceState.lessonToken?.scrollTop,
  }));
  expect(lessonAfter.index).toBe(lessonBefore.index);
  expect(Math.abs(lessonAfter.scroll - lessonAfter.tokenScroll)).toBeLessThan(1);
  expect(lessonAfter.camera.map(value => Math.round(value * 1000) / 1000))
    .toEqual(lessonBefore.camera.map(value => Math.round(value * 1000) / 1000));
  expect(lessonAfter.target.map(value => Math.round(value * 1000) / 1000))
    .toEqual(lessonBefore.target.map(value => Math.round(value * 1000) / 1000));
  expect(await page.locator('canvas').count()).toBe(1);
  expect(errors).toEqual([]);
});
