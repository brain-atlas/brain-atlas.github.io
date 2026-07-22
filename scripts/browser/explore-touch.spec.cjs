const { test, expect } = require('@playwright/test');

const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';

async function gesture(client, from, to) {
  await client.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ ...from, radiusX: 4, radiusY: 4, force: 1, id: 1 }],
  });
  for (let step = 1; step <= 6; step += 1) {
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [{
        x: from.x + (to.x - from.x) * step / 6,
        y: from.y + (to.y - from.y) * step / 6,
        radiusX: 4,
        radiusY: 4,
        force: 1,
        id: 1,
      }],
    });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

test('touch scrolls the lesson and controls the camera only in Explore', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'CDP touch injection is Chromium-only');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await page.waitForFunction(() => document.querySelector('#app')?.dataset.state === 'ready');
  await page.waitForTimeout(1100);
  const client = await context.newCDPSession(page);

  const box = await page.locator('#stage canvas').boundingBox();
  const cameraBeforeLessonTouch = await page.evaluate(() => window.__view.camera.position.toArray());
  await gesture(client,
    { x: box.x + box.width / 2, y: box.y + box.height * 0.75 },
    { x: box.x + box.width / 2, y: box.y + box.height * 0.25 });
  await page.waitForTimeout(150);
  expect(await page.evaluate(() => ({
    scroll: document.querySelector('#page-scroll').scrollTop,
    camera: window.__view.camera.position.toArray(),
    root: [scrollX, scrollY],
  }))).toEqual({
    scroll: expect.any(Number),
    camera: cameraBeforeLessonTouch,
    root: [0, 0],
  });
  expect(await page.locator('#page-scroll').evaluate(element => element.scrollTop)).toBeGreaterThan(50);

  await page.locator('#explore-scene-trigger').click();
  const exploreBox = await page.locator('#stage canvas').boundingBox();
  const cameraBeforeExploreTouch = await page.evaluate(() => window.__view.camera.position.toArray());
  const savedScroll = await page.locator('#page-scroll').evaluate(element => element.scrollTop);
  await gesture(client,
    { x: exploreBox.x + exploreBox.width * 0.35, y: exploreBox.y + exploreBox.height * 0.5 },
    { x: exploreBox.x + exploreBox.width * 0.65, y: exploreBox.y + exploreBox.height * 0.5 });
  await page.waitForTimeout(150);
  const explore = await page.evaluate(() => ({
    scroll: document.querySelector('#page-scroll').scrollTop,
    camera: window.__view.camera.position.toArray(),
    root: [scrollX, scrollY],
    touch: getComputedStyle(document.querySelector('#stage canvas')).touchAction,
  }));
  expect(explore.scroll).toBe(savedScroll);
  expect(explore.camera).not.toEqual(cameraBeforeExploreTouch);
  expect(explore.root).toEqual([0, 0]);
  expect(explore.touch).toBe('none');
});
