const { test, expect } = require('@playwright/test');

const { BASE_URL } = require('./helpers.cjs');

async function ready(page, path = '') {
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(new URL(path, BASE_URL).href);
  await page.waitForFunction(() => document.getElementById('app').dataset.state === 'ready');
  await page.waitForFunction(() => window.__view?.fibreFilter?.summary && window.__view?.swm?.dots.length);
  return errors;
}

async function frames(page, count = 2) {
  await page.evaluate(count => new Promise(resolve => {
    function next() { if (--count === 0) resolve(); else requestAnimationFrame(next); }
    requestAnimationFrame(next);
  }), count);
}

// Tests UI INV-46: opacity and unrelated controls cannot rewrite endpoint geometry.
test('filter geometry changes once for new inputs, not during fades or unrelated edits', async ({ page }) => {
  const errors = await ready(page);
  await page.waitForFunction(() => window.__view.fibreFilter.selectedAssociationContours === 2880);
  await page.evaluate(() => {
    window.grain = window.__view.swm.points.parent.children.find(object => object.isLineSegments);
    window.grainVersion = window.grain.geometry.attributes.position.version;
    const tissue = document.getElementById('tissue');
    tissue.value = '35';
    tissue.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(await page.evaluate(() => window.grain.geometry.attributes.position.version - window.grainVersion)).toBe(0);
  await page.evaluate(() => { window.grainVersion = window.grain.geometry.attributes.position.version; });
  await page.locator('#fibre-filter-preset').selectOption('fibre-filter.dorsal');
  expect(await page.evaluate(() => window.grain.geometry.attributes.position.version - window.grainVersion)).toBe(1);
  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson]').click();
  await page.evaluate(() => { window.grainVersion = window.grain.geometry.attributes.position.version; });
  await frames(page, 8);
  expect(await page.evaluate(() => window.grain.geometry.attributes.position.version - window.grainVersion)).toBe(0);
  expect(errors).toEqual([]);
});

// Tests UI INV-21/33: state synchronization is not an activity restart.
test('playing controls and panel projection preserve model clocks and actual camera', async ({ page }) => {
  const errors = await ready(page);
  await page.waitForFunction(() => window.__view.association?.modelTime > 0.1 && window.__view.activity.opticRadiation.modelTime > 0);
  const result = await page.evaluate(() => {
    const clocks = () => [window.__view.activity.anterior.distanceMm, window.__view.activity.opticRadiation.modelTime,
      window.__view.association.modelTime, window.__view.swm.modelTime];
    window.__view.camera.position.set(120, 70, -160);
    window.__view.controls.target.set(3, 4, 5);
    window.__view.controls.update();
    const camera = window.__view.camera.position.toArray();
    const before = clocks();
    for (const [id, value] of [['tissue', '35'], ['clip', '20'], ['speed', '55']]) {
      const control = document.getElementById(id);
      control.value = value;
      control.dispatchEvent(new Event('input', { bubbles: true }));
    }
    return { before, after: clocks(), camera, afterCamera: window.__view.camera.position.toArray() };
  });
  expect(result.after).toEqual(result.before);
  result.afterCamera.forEach((value, index) => expect(value).toBeCloseTo(result.camera[index], 8));
  expect(errors).toEqual([]);
});

// Tests UI INV-22/27/32: Return retains the lesson tree and adopts current motion preference.
test('Return and history resume keep lesson nodes and restore one stable session', async ({ page }) => {
  const errors = await ready(page, '?lesson=retina-to-v1');
  await page.waitForFunction(() => !window.__view.lesson.cameraTransitioning);
  await page.evaluate(() => {
    window.lessonNode = document.querySelector('#lesson-scenes > section');
    window.lessonNode.dataset.retained = 'yes';
    window.lessonState = window.__lesson.controllerState;
    window.lessonBindings = window.__view.lesson;
  });
  await page.locator('#back-to-atlas').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#return-to-lesson').click();
  await expect(page.locator('#back-to-atlas')).toBeFocused();
  expect(await page.evaluate(() => ({
    sameNode: window.lessonNode === document.querySelector('#lesson-scenes > section'),
    sameBindings: window.lessonBindings === window.__view.lesson,
    activations: window.__lesson.controllerState.activationCount,
    beforeActivations: window.lessonState.activationCount,
    reduced: window.__lesson.controllerState.reducedMotion,
  }))).toEqual({ sameNode: true, sameBindings: true, activations: 1, beforeActivations: 1, reduced: true });
  await page.goBack();
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  await page.goForward();
  await expect(page.locator('#atlas-workspace')).toBeHidden();
  expect(await page.evaluate(() => window.lessonNode === document.querySelector('#lesson-scenes > section'))).toBe(true);
  expect(errors).toEqual([]);
});

// Tests UI INV-24/47/48: unchanged sources retain native disclosure state.
test('unrelated Atlas edits retain disclosure nodes, while visibility refreshes subjects', async ({ page }) => {
  const errors = await ready(page);
  await page.evaluate(() => {
    window.record = document.querySelector('.fidelity-record');
    window.record.open = true;
    const speed = document.getElementById('speed');
    speed.value = '50';
    speed.dispatchEvent(new Event('input', { bubbles: true }));
  });
  expect(await page.evaluate(() => ({ same: window.record === document.querySelector('.fidelity-record'), open: window.record.open })))
    .toEqual({ same: true, open: true });
  await page.locator('#viewer-full-controls > summary').click();
  await page.locator('#layers input[data-id="anterior"]').uncheck();
  expect(await page.evaluate(() => window.record.isConnected)).toBe(false);
  expect(errors).toEqual([]);
});

// Tests UI INV-38/40/51: idle pointer bursts do not multiply picking or leak past leave.
test('hover raycasts coalesce and cancel without delaying activation', async ({ page }) => {
  const errors = await ready(page);
  const result = await page.evaluate(async () => {
    const canvas = document.querySelector('#stage canvas');
    const rect = canvas.getBoundingClientRect();
    const prototype = window.__view.THREE.Raycaster.prototype;
    const original = prototype.intersectObject;
    let calls = 0;
    prototype.intersectObject = function (...args) { calls++; return original.apply(this, args); };
    const move = () => canvas.dispatchEvent(new PointerEvent('pointermove', {
      pointerType: 'mouse', clientX: rect.x + rect.width / 2, clientY: rect.y + rect.height / 2,
    }));
    const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
    try {
      for (let i = 0; i < 20; i++) move();
      const immediate = calls;
      await frame();
      const batch = calls;
      calls = 0;
      move();
      await frame();
      const single = calls;
      calls = 0;
      move();
      canvas.dispatchEvent(new PointerEvent('pointerleave', { pointerType: 'mouse' }));
      await frame();
      return { immediate, batch, single, cancelled: calls };
    } finally { prototype.intersectObject = original; }
  });
  expect(result.immediate).toBe(0);
  expect(result.single).toBeGreaterThan(0);
  expect(result.batch).toBe(result.single);
  expect(result.cancelled).toBe(0);
  expect(errors).toEqual([]);
});


// Tests UI INV-6/11: Skip settles the same destination, not just its camera.
test('Skip immediately commits destination opacity during an unchanged visibility fade', async ({ page }) => {
  const errors = await ready(page, '?lesson=retina-to-v1');
  await page.waitForFunction(() => !window.__view.lesson.cameraTransitioning);
  const result = await page.evaluate(() => {
    document.getElementById('scene-next').click();
    const wasFading = window.__view.lesson.visibilityTransitioning;
    document.getElementById('scene-skip').click();
    const ids = window.__lesson.presentation.scenes[window.__lesson.navigation.activeIndex].snapshot.visibility.entities;
    return {
      wasFading,
      fading: window.__view.lesson.visibilityTransitioning,
      opacities: Object.fromEntries(window.__lesson.catalog.entityIds.map(id => [id, window.__view.lesson.visibilityOpacities[id] ?? 0])),
      expected: Object.fromEntries(window.__lesson.catalog.entityIds.map(id => [id, ids.includes(id) ? 1 : 0])),
    };
  });
  expect(result.wasFading).toBe(true);
  expect(result.fading).toBe(false);
  expect(result.opacities).toEqual(result.expected);
  expect(errors).toEqual([]);
});

// Tests UI INV-45/56: delayed geometry consumes current masks and group factors.
test('late tract children inherit current selection and endpoint masks', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  let requested;
  const requestSeen = new Promise(resolve => { requested = resolve; });
  await page.route('**/data/tracts.json', async route => {
    requested();
    await gate;
    await route.continue();
  });
  const errors = await ready(page, '?lesson=retina-to-v1');
  try {
    await page.evaluate(() => {
      const index = window.__lesson.presentation.scenes.findIndex(scene => scene.snapshot.selection.emphasized.includes('tract.ilf'));
      if (index < 0) throw new Error('missing tract-emphasis scene');
      while (window.__lesson.navigation.activeIndex < index) document.getElementById('scene-next').click();
      document.getElementById('scene-skip').click();
    });
    await requestSeen;
    await page.waitForFunction(() => !window.__view.lesson.visibilityTransitioning);
  } finally { release(); }
  await page.waitForFunction(() => window.__view.association && window.__view.fibreFilter.selectedAssociationContours > 0);
  expect(await page.evaluate(() => window.__view.fibreFilter.eligibleAssociationContours))
    .toBe(await page.evaluate(() => window.__view.fibreFilter.selectedAssociationContours));
  const factors = await page.evaluate(() => {
    const result = [];
    window.__view.scene.traverse(object => {
      if (object.userData.tractId !== 'ilf' || !object.material) return;
      result.push({
        expected: object.parent.userData.lessonSelectionFactor,
        actual: object.material.userData.lessonSelectionFactor,
        visibility: object.material.userData.lessonVisibilityFactor,
        expectedVisibility: object.parent.userData.lessonVisibilityFactor,
      });
    });
    return result;
  });
  expect(factors.length).toBe(4);
  for (const value of factors) {
    expect(value.expected).toBeGreaterThan(1);
    expect(value.actual).toBe(value.expected);
    expect(value.visibility).toBe(value.expectedVisibility);
  }
  expect(errors).toEqual([]);
});


for (const noWebgl of [false, true]) {
  test(`local image lesson retains content across resume (no-WebGL=${noWebgl})`, async ({ page }) => { // Tests INV-19/27/31/58
    await page.setViewportSize({ width: 1100, height: 820 });
    const errors = [];
    page.on('pageerror', error => errors.push(String(error)));
    await page.route('https://example.org/retinotopy.png', route => route.fulfill({
      status: 200, contentType: 'image/png',
      body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
    }));
    await page.goto(new URL(noWebgl ? '?no-webgl=1' : '', BASE_URL).href);
    await page.waitForFunction(() => ['ready', 'fallback'].includes(document.getElementById('app').dataset.state));
    await page.locator('#lesson-import-trigger').click();
    await page.locator('#lesson-import-file').setInputFiles(require('path').resolve(__dirname, '../../test/fixtures/lessons/visual-field-crossing.md'));
    await page.locator('#lesson-import-validate').click();
    await page.locator('#lesson-import-open').click();
    await page.locator('#scene-next').click();
    await expect(page.locator('#supplementary-visual')).toHaveAttribute('data-state', 'loaded');
    await page.evaluate(() => { window.retainedCard = document.querySelector('#lesson-scenes > section'); });
    await page.locator('#back-to-atlas').click();
    await expect(page.locator('#supplementary-image')).toHaveCount(0);
    await page.locator('#return-to-lesson').click();
    await expect(page.locator('#supplementary-visual')).toHaveAttribute('data-state', 'loaded');
    await expect(page.locator('#supplementary-image')).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(await page.evaluate(() => window.retainedCard === document.querySelector('#lesson-scenes > section'))).toBe(true);
    expect(await page.locator('#stage canvas').count()).toBe(noWebgl ? 0 : 1);
    expect(errors).toEqual([]);
  });
}
