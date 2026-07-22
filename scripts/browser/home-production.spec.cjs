const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const BASE_URL = process.env.BRAIN_ATLAS_URL ?? 'http://127.0.0.1:5199/';
const source = fs.readFileSync(path.join(__dirname, '../../test/fixtures/lessons/visual-field-crossing.md'), 'utf8');

test.skip(process.env.PRODUCTION_PREVIEW !== '1', 'production preview only');

async function open(page, route = '', states = ['ready']) {
  await page.goto(new URL(route, BASE_URL).href);
  await page.waitForFunction(expected => expected.includes(document.getElementById('app')?.dataset.state), states);
}

test('production Atlas and checked Lesson share one canvas without debug hooks', async ({ page }) => { // Tests INV-28
  const errors = [];
  page.on('pageerror', error => errors.push(String(error)));
  await open(page);
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  expect(await page.locator('canvas').count()).toBe(1);
  expect(await page.evaluate(() => ({ view: '__view' in window, lesson: '__lesson' in window })))
    .toEqual({ view: false, lesson: false });

  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  expect(new URL(page.url()).searchParams.get('lesson')).toBe('retina-to-v1');
  await expect(page.locator('#lesson-title')).toBeVisible();
  await page.locator('#back-to-atlas').click();
  await expect(page.locator('#return-to-lesson')).toBeVisible();
  await expect(page.locator('#return-to-lesson')).toHaveText('Return to lesson');
  await page.locator('#return-to-lesson').click();
  await expect(page.locator('#lesson-title')).toBeVisible();
  await page.locator('#back-to-atlas').click();
  await page.locator('#exit-lesson').click();
  await expect(page.locator('#lesson-session-actions')).toBeHidden();
  await page.locator('#lessons-trigger').click();
  await expect(page.locator('[data-start-lesson="retina-to-v1"]')).toHaveText('Start lesson');
  expect(await page.locator('canvas').count()).toBe(1);
  expect(errors).toEqual([]);
});

test('production local source remains memory-only and reload recovers to Atlas', async ({ page }) => { // Tests INV-29
  await open(page);
  await page.locator('#lesson-import-trigger').click();
  await page.locator('#lesson-import-source').fill(source);
  await page.locator('#lesson-import-validate').click();
  await expect(page.locator('#lesson-import-open')).toBeEnabled();
  await page.locator('#lesson-import-open').click();
  await expect(page.locator('#app-status')).toHaveText('Local lesson · not saved');
  expect(new URL(page.url()).searchParams.get('lesson')).toBe('local');
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })))
    .toEqual({ local: 0, session: 0 });

  await page.reload();
  await page.waitForFunction(() => document.getElementById('app')?.dataset.state === 'ready');
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  await expect(page.locator('#announcer')).toContainText('not retained');
  expect(new URL(page.url()).searchParams.has('lesson')).toBe(false);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length })))
    .toEqual({ local: 0, session: 0 });
});

test('production no-WebGL Atlas keeps checked lessons without loading a canvas', async ({ page }) => { // Tests INV-31
  const resources = [];
  page.on('request', request => resources.push(request.url()));
  await open(page, '?no-webgl=1', ['fallback']);
  await expect(page.locator('#atlas-workspace')).toBeVisible();
  expect(await page.locator('canvas').count()).toBe(0);
  await page.locator('#anatomy-browser > summary').click();
  await page.locator('#anatomy-options [data-inspectable-id="landmark.optic-chiasm"]').click();
  await expect(page.locator('#anatomy-inspector')).toContainText('Mason & Erskine 2001');
  await page.locator('#anatomy-inspector-close').click();
  await page.locator('#lessons-trigger').click();
  await page.locator('[data-start-lesson="retina-to-v1"]').click();
  await expect(page.locator('#lesson-title')).toBeVisible();
  expect(resources.some(url => /three-[^/]+\.js/i.test(url))).toBe(false);
});
