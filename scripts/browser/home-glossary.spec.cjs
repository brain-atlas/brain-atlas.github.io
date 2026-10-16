const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { BASE_URL, monitor } = require('./helpers.cjs');
const fixture = fs.readFileSync(path.join(__dirname, '../../test/fixtures/lessons/visual-field-crossing.md'), 'utf8');
const definition = '<img src=x onerror=alert(1)> A local relay definition. [run](javascript:alert(1))';
const glossary = { use: ['lgn'], terms: [{ id: 'lgn', term: 'LGN', definition, aliases: ['lateral geniculate nucleus'] }] };
const source = fixture.replace('schema: 1', `schema: 1\nglossary: ${JSON.stringify(glossary)}`)
  .replace('Headings and lists remain ordinary prose', 'LGN and LGN. Headings and lists remain ordinary prose');

async function openLocal(page, sourceText = source) {
  await page.goto(new URL('?no-webgl=1', BASE_URL).href);
  await page.locator('#lesson-import-trigger').click();
  await page.locator('#lesson-import-source').fill(sourceText);
  await page.locator('#lesson-import-validate').click();
  await expect(page.locator('#lesson-import-open')).toBeEnabled();
  await page.locator('#lesson-import-open').click();
  await expect(page.locator('#lesson-reader')).toBeVisible();
  await expect(page.locator('#back-to-atlas')).toBeFocused();
}

for (const width of [390, 1440]) {
  test(`glossary hover focus keyboard copy and inert content at ${width}px`, async ({ page }) => { // UI INV-72, FAIL-65
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const errors = monitor(page);
    const external = [];
    page.on('request', request => { if (new URL(request.url()).origin !== new URL(BASE_URL).origin) external.push(request.url()); });
    await openLocal(page);
    const term = page.locator('.glossary-term');
    await expect(term).toHaveCount(1);
    await expect(term).toHaveText('LGN');
    await expect(term).toHaveAccessibleName('LGN');
    await expect(term).toHaveAccessibleDescription(definition);
    await expect(page.locator('#lesson-reader h1 .glossary-term, #lesson-reader a .glossary-term, #lesson-reader code .glossary-term')).toHaveCount(0);
    const tooltip = page.getByRole('tooltip');
    await term.focus();
    if (width === 390) {
      const geometry = await term.evaluate(el => ({ top: el.getBoundingClientRect().top, bottom: el.getBoundingClientRect().bottom, stageBottom: document.querySelector('.stage-shell').getBoundingClientRect().bottom, navTop: document.querySelector('.scene-transport').getBoundingClientRect().top }));
      expect(geometry.top).toBeGreaterThanOrEqual(geometry.stageBottom);
      expect(geometry.bottom).toBeLessThanOrEqual(geometry.navTop);
    }
    expect(await term.evaluate(el => getComputedStyle(el).minHeight)).toBe('0px');
    await page.keyboard.press('Escape');
    await term.evaluate(el => el.blur());
    await term.hover();
    await expect(tooltip).toHaveText(definition);
    await tooltip.hover();
    await expect(tooltip).toBeVisible();
    await page.mouse.move(width - 4, 4);
    await expect(tooltip).toHaveCount(0);
    await term.focus();
    await expect(tooltip).toBeVisible();
    await expect(term).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Escape');
    await expect(tooltip).toHaveCount(0);
    await expect(term).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(tooltip).toBeVisible();
    await page.mouse.move(width - 4, 4);
    await expect(tooltip).toBeVisible();
    const box = await tooltip.boundingBox();
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.y + box.height).toBeLessThanOrEqual(844);
    await expect(tooltip.locator('img,a,script')).toHaveCount(0);
    await tooltip.click();
    await expect(tooltip).toBeVisible();
    await term.focus();
    expect(await page.locator('#lesson-reader').evaluate(el => {
      const range = document.createRange(); range.selectNodeContents(el);
      const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
      const selected = selection.toString(); selection.removeAllRanges(); return selected;
    })).not.toContain(definition);
    await page.keyboard.press('Tab');
    await expect(tooltip).toHaveCount(0);
    await term.click();
    await expect(tooltip).toBeVisible();
    await page.locator('#lesson-title').click();
    await expect(tooltip).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('canvas').count()).toBe(0);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
  });
}

test('touch toggles pinned definition and lesson switch clears it', async ({ browser }) => { // UI INV-72
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await openLocal(page);
  const term = page.locator('.glossary-term');
  await term.focus();
  await page.keyboard.press('Escape');
  await term.evaluate(el => el.blur());
  await term.tap();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await term.tap();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await term.tap();
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.locator('#back-to-atlas').tap();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await context.close();
});

test('unknown global reference rejects without changing active lesson', async ({ page }) => { // lesson FAIL-14
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openLocal(page);
  await page.locator('#lesson-import-trigger').click();
  await page.locator('#lesson-import-source').fill(source.replace('"use":["lgn"]', '"use":["missing"]'));
  await page.locator('#lesson-import-validate').click();
  await expect(page.locator('#lesson-import-open')).toBeDisabled();
  await expect(page.locator('#lesson-import-result')).toContainText('unknown global glossary ID');
});


test('maximum definition stays readable at zoom-equivalent size and scrolls by keyboard', async ({ page }) => { // UI INV-72
  await page.setViewportSize({ width: 320, height: 568 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const longDefinition = ('A bounded explanation with several words. '.repeat(20)).slice(0, 600);
  await openLocal(page, source.replace(definition, longDefinition));
  const term = page.locator('.glossary-term');
  await term.focus();
  const tooltip = page.getByRole('tooltip');
  await expect(tooltip).toBeVisible();
  const geometry = await term.evaluate(el => {
    const popup = document.getElementById(el.getAttribute('aria-describedby'));
    return { term: el.getBoundingClientRect().toJSON(), popup: popup.getBoundingClientRect().toJSON(), nav: document.querySelector('.scene-transport').getBoundingClientRect().toJSON() };
  });
  expect(geometry.popup.x).toBeGreaterThanOrEqual(0);
  expect(geometry.popup.right).toBeLessThanOrEqual(320);
  expect(geometry.popup.bottom).toBeLessThanOrEqual(geometry.nav.top);
  expect(geometry.popup.bottom <= geometry.term.top || geometry.popup.top >= geometry.term.bottom).toBe(true);
  await page.keyboard.press('End');
  expect(await tooltip.evaluate(el => el.scrollTop)).toBeGreaterThan(0);
  await page.keyboard.press('Home');
  expect(await tooltip.evaluate(el => el.scrollTop)).toBe(0);
  await page.keyboard.press('Escape');
  await expect(tooltip).toHaveCount(0);
  await expect(term).toBeFocused();
});

test('checked lesson annotates opted-in terms once and survives Atlas Return', async ({ page }) => { // UI INV-72
  await page.setViewportSize({ width: 1440, height: 1000 });
  const errors = monitor(page);
  await page.goto(new URL('?lesson=retina-to-v1', BASE_URL).href);
  await expect(page.locator('#stage canvas')).toHaveCount(1);
  await expect(page.locator('.glossary-term')).toHaveCount(3);
  expect(await page.locator('.glossary-term').allTextContents()).toEqual(['LGN', 'V1', 'optic radiation']);
  const term = page.locator('.glossary-term').first();
  await term.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('tooltip')).toBeVisible();
  await page.locator('#back-to-atlas').click();
  await expect(page.getByRole('tooltip')).toHaveCount(0);
  await page.locator('#return-to-lesson').click();
  await expect(page.locator('#back-to-atlas')).toBeFocused();
  await expect(page.locator('.glossary-term')).toHaveCount(3);
  await expect(page.locator('[role=tooltip]')).toHaveCount(3);
  await expect(page.locator('canvas')).toHaveCount(1);
  await term.focus();
  await expect(page.getByRole('tooltip')).toBeVisible();
  expect(errors).toEqual([]);
});
