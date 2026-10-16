const { test, expect } = require('@playwright/test');
const { BASE_URL, monitor } = require('./helpers.cjs');
async function ready(page, width = 1440) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(BASE_URL);
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  for (const id of ['viewer-console', 'viewer-full-controls']) {
    if (await page.locator(`#${id}`).getAttribute('open') === null) await page.locator(`#${id} > summary`).click();
  }
  await page.locator('#layers input[data-id="labels"]').check();
}
async function measure(page) {
  return page.locator('.lbl3d').evaluateAll(nodes => {
    const stage = document.getElementById('stage').getBoundingClientRect();
    const boxes = nodes.filter(n => getComputedStyle(n).display !== 'none' && getComputedStyle(n).visibility !== 'hidden')
      .map(n => ({ id: n.dataset.labelId, ...n.getBoundingClientRect().toJSON() }));
    const overlaps = [];
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) overlaps.push([a.id, b.id]);
    }
    return { boxes, overlaps, inside: boxes.every(b => b.left >= stage.left && b.right <= stage.right && b.top >= stage.top && b.bottom <= stage.bottom) };
  });
}
for (const width of [1440, 390]) {
  test(`INV-71 labels separate through camera presets and zoom at ${width}px`, async ({ page }) => {
    const errors = monitor(page);
    await ready(page, width);
    for (const view of ['post', 'ant', 'lateral', 'top']) {
      await page.locator(`[data-view="${view}"]`).click();
      await expect.poll(async () => (await measure(page)).overlaps).toEqual([]);
      await expect.poll(async () => (await measure(page)).boxes.length).toBeGreaterThan(3);
      expect((await measure(page)).inside).toBe(true);
    }
    await page.locator('[data-explore-camera="zoom-in"]').click();
    await expect.poll(async () => (await measure(page)).overlaps).toEqual([]);
    await expect.poll(async () => page.locator('.label-leaders line').evaluateAll(lines => lines.filter(l => getComputedStyle(l).display !== 'none').length)).toBeGreaterThan(3);
    expect(await page.locator('#anatomical-label-text li:not([hidden])').count()).toBe(9);
    expect(await page.locator('canvas').count()).toBe(1);
    await page.locator('#stage').screenshot({ path: test.info().outputPath(`labels-${width}.png`) });
    expect(errors).toEqual([]);
  });
}
test('FAIL-64 labels follow owner/hemisphere visibility and retain accessible equivalents', async ({ page }) => {
  await ready(page);
  await page.locator('#layers input[data-id="or"]').uncheck();
  await page.locator('#layers input[data-id="anterior"]').uncheck();
  await page.locator('input[data-hemisphere="L"]').uncheck();
  await expect.poll(async () => (await measure(page)).boxes.length).toBe(2);
  expect((await measure(page)).boxes.map(b => b.id).sort()).toEqual(['lgn-right', 'v1-right']);
  expect(await page.locator('#anatomical-label-text li:not([hidden])').allTextContents()).toEqual(['LGN (R)', 'V1 (R)']);
  const row = page.locator('[data-entity-id="region.lgn"]');
  await row.locator('xpath=ancestor::div[contains(@class,"lyr-grpwrap")]').locator('.caret').click();
  await row.locator('.pill').last().click();
  await expect.poll(async () => (await measure(page)).boxes.map(b => b.id)).toEqual(['v1-right']);
});

test('INV-71 depth culling respects opaque geometry but not translucent cortex', async ({ page }) => {
  await ready(page);
  await expect.poll(async () => (await measure(page)).boxes.length).toBe(9);
  await page.evaluate(() => {
    const { THREE, scene, camera, controls } = window.__view;
    const blocker = new THREE.Mesh(new THREE.SphereGeometry(120, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    blocker.name = 'label-test-occluder'; scene.add(blocker);
    camera.position.set(0, 30, -350); controls.update();
  });
  await expect.poll(async () => (await measure(page)).boxes.length).toBe(0);
  expect(await page.locator('#anatomical-label-text li:not([hidden])').count()).toBe(9);
  await page.evaluate(() => {
    const { scene, camera, controls } = window.__view;
    scene.getObjectByName('label-test-occluder').visible = false;
    camera.position.set(0, 31, -350); controls.update();
  });
  await expect.poll(async () => (await measure(page)).boxes.length).toBe(9);
  await page.evaluate(() => {
    const { camera, controls } = window.__view;
    camera.position.set(0, 0, 400); controls.target.set(0, 0, 800); controls.update();
  });
  await expect.poll(async () => (await measure(page)).boxes.length).toBe(0);
});

test('INV-71 layout is activity-independent, capped during orbit and settles when paused', async ({ page }) => {
  const errors = monitor(page);
  await ready(page);
  await expect.poll(async () => page.evaluate(() => window.__view.labels.layoutCount)).toBeGreaterThan(0);
  const idle = await page.evaluate(async () => {
    const first = window.__view.labels.layoutCount, frame = window.__view.power.frameCount;
    for (let i = 0; i < 30; i++) await new Promise(requestAnimationFrame);
    return { delta: window.__view.labels.layoutCount - first, frames: window.__view.power.frameCount - frame };
  });
  expect(idle.frames).toBeGreaterThan(10);
  expect(idle.delta).toBeLessThanOrEqual(1); // A pending late asset/resize may settle once.
  const orbit = await page.evaluate(async () => {
    const { camera, controls, labels } = window.__view;
    const first = labels.layoutCount, start = performance.now();
    const samples = [];
    for (let i = 0; i < 80; i++) {
      camera.position.set(350 * Math.cos(i / 25), 75, 350 * Math.sin(i / 25)); controls.update();
      await new Promise(requestAnimationFrame);
      samples.push(labels.lastLayoutMs);
    }
    return { count: labels.layoutCount - first, elapsed: performance.now() - start, maxMs: labels.maxLayoutMs, samples };
  });
  console.log('label-layout profile', JSON.stringify(orbit));
  expect(orbit.count).toBeLessThanOrEqual(Math.ceil(orbit.elapsed / 50) + 1);
  expect(orbit.count).toBeGreaterThan(2);
  expect(orbit.maxMs).toBeLessThan(50);
  await page.locator('#play').click();
  await expect.poll(async () => (await measure(page)).overlaps).toEqual([]);
  const settled = await page.evaluate(async () => {
    for (let i = 0; i < 10; i++) await new Promise(requestAnimationFrame);
    const first = window.__view.labels.layoutCount;
    for (let i = 0; i < 30; i++) await new Promise(requestAnimationFrame);
    return window.__view.labels.layoutCount - first;
  });
  expect(settled).toBe(0);
  expect(errors).toEqual([]);
});

test('INV-71 saved toggle survives reload while reference lesson keeps labels off', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => window.dispatchEvent(new Event('pagehide')));
  await page.reload();
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  await expect.poll(async () => (await measure(page)).boxes.length).toBeGreaterThan(3);
  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await expect.poll(async () => (await measure(page)).boxes.length).toBe(0);
  await expect(page.locator('#anatomical-label-text')).toBeHidden();
  await expect(page.locator('#stage canvas')).toHaveCount(1);
});


test('FAIL-64 late opaque cortex invalidates stationary label placement', async ({ page }) => {
  let release;
  const gate = new Promise(resolve => { release = resolve; });
  await page.route('**/models/brain_mni.glb', async route => { await gate; await route.continue(); });
  await ready(page);
  await page.locator('#tissue').evaluate(input => { input.value = '100'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#play').click();
  await expect.poll(async () => (await measure(page)).boxes.length).toBe(9);
  const before = await page.evaluate(() => window.__view.labels.layoutCount);
  release();
  await page.waitForFunction(() => window.__view.scene.children.find(o => o.isGroup && !o.matrixAutoUpdate).children[0].children.length > 0);
  await expect.poll(async () => page.evaluate(() => window.__view.labels.layoutCount)).toBeGreaterThan(before);
  await expect.poll(async () => (await measure(page)).boxes.length).toBeLessThan(9);
});

test('INV-71 retained screen boxes stay separated between throttled orbit layouts', async ({ page }) => {
  await ready(page, 390);
  await page.locator('#viewer-console > summary').click();
  const collisions = await page.evaluate(async () => {
    let collisions = 0;
    for (let i = 0; i < 90; i++) {
      const { camera, controls } = window.__view;
      camera.position.set(350 * Math.cos(i / 10), 75, 350 * Math.sin(i / 10)); controls.update();
      await new Promise(requestAnimationFrame);
      const boxes = [...document.querySelectorAll('.lbl3d')].filter(n => getComputedStyle(n).visibility === 'visible' && getComputedStyle(n).display !== 'none').map(n => n.getBoundingClientRect());
      for (let a = 0; a < boxes.length; a++) for (let b = a + 1; b < boxes.length; b++) {
        if (boxes[a].left < boxes[b].right && boxes[b].left < boxes[a].right && boxes[a].top < boxes[b].bottom && boxes[b].top < boxes[a].bottom) collisions++;
      }
    }
    return collisions;
  });
  expect(collisions).toBe(0);
});


test('INV-71 canonical selection and transient focus set stable label priority', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    window.dispatchEvent(new Event('pagehide'));
    const key = 'brain-atlas.atlas-state', record = JSON.parse(localStorage.getItem(key));
    record.snapshot.selection = { selected: 'region.v1', emphasized: ['region.lgn'], strength: 1 };
    localStorage.setItem(key, JSON.stringify(record));
  });
  await page.reload();
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  await expect.poll(async () => page.evaluate(() => window.__view.labels.placements.slice(0, 4).map(l => l.id)))
    .toEqual(['v1-left', 'v1-right', 'lgn-left', 'lgn-right']);
  await page.locator('#anatomy-browser > summary').click();
  await page.locator('#anatomy-options [data-inspectable-id="region.lgn"]').focus();
  await expect.poll(async () => page.evaluate(() => window.__view.labels.placements.slice(0, 2).map(l => l.id)))
    .toEqual(['lgn-left', 'lgn-right']);
  expect(await page.evaluate(() => window.__lesson.exploreState.snapshot.selection.selected)).toBe('region.v1');
});
