const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { BASE_URL } = require('./helpers.cjs');
const source = fs.readFileSync(path.join(__dirname, '../../test/fixtures/lessons/visual-field-crossing.md'), 'utf8');

async function stage(page) {
  await page.goto(new URL('?no-webgl=1', BASE_URL).href);
  await page.locator('#lesson-import-trigger').click();
  await page.locator('#lesson-import-source').fill(source);
  await page.locator('#lesson-import-validate').click();
}

for (const width of [390, 1280]) {
  test(`validated source downloads losslessly at ${width}px without activation`, async ({ page }) => { // Tests UI INV-18
    await page.setViewportSize({ width, height: 844 });
    const errors = [];
    const external = [];
    page.on('pageerror', error => errors.push(String(error)));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('request', request => {
      if (new URL(request.url()).origin !== new URL(BASE_URL).origin) external.push(request.url());
    });
    await stage(page);
    const button = page.getByRole('button', { name: 'Download lesson', exact: true });
    await expect(button).toBeEnabled();
    const bounds = await button.boundingBox();
    expect(bounds.width).toBeGreaterThanOrEqual(44);
    expect(bounds.height).toBeGreaterThanOrEqual(44);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
    await button.focus();
    const pending = page.waitForEvent('download');
    await page.keyboard.press('Enter');
    const download = await pending;
    expect(download.suggestedFilename()).toBe('lesson.md');
    expect(fs.readFileSync(await download.path(), 'utf8')).toBe(source);
    await expect(page.locator('#lesson-import-result')).toContainText('Download requested');
    await expect(page.locator('#atlas-workspace')).toBeVisible();
    expect(await page.locator('canvas').count()).toBe(0);
    expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
    await page.screenshot({ path: test.info().outputPath(`export-${width}.png`) });
    await page.locator('#lesson-import-source').fill(source + '\nChanged.');
    await expect(button).toBeDisabled();
    await page.locator('#lesson-import-validate').click();
    await expect(button).toBeEnabled();
    await page.locator('#lesson-import-file').setInputFiles({ name: 'bad.txt', mimeType: 'text/plain', buffer: Buffer.from(source) });
    await expect(button).toBeDisabled();
    await expect(page.locator('#lesson-import-open')).toBeDisabled();
  });
}

test('download failure retains valid source and offers manual recovery', async ({ page }) => { // Tests UI INV-18
  await stage(page);
  await page.evaluate(() => { URL.createObjectURL = () => { throw new Error('test unavailable'); }; });
  await page.getByRole('button', { name: 'Download lesson', exact: true }).click();
  await expect(page.locator('#lesson-import-result')).toContainText('Copy the Markdown');
  await expect(page.locator('#lesson-import-source')).toHaveValue(source);
  await expect(page.locator('#lesson-import-open')).toBeEnabled();
});

test('pending file read invalidates prior download immediately', async ({ page }) => { // Tests UI INV-18
  await stage(page);
  await page.evaluate(() => { File.prototype.text = () => new Promise(() => {}); });
  await page.locator('#lesson-import-file').setInputFiles({ name: 'new.md', mimeType: 'text/markdown', buffer: Buffer.from(source) });
  await expect(page.getByRole('button', { name: 'Download lesson', exact: true })).toBeDisabled();
  await expect(page.locator('#lesson-import-open')).toBeDisabled();
});

test('file read failure invalidates even a revalidated candidate', async ({ page }) => { // Tests UI INV-18
  await stage(page);
  await page.evaluate(() => { File.prototype.text = () => new Promise((resolve, reject) => { window.rejectFileRead = reject; }); });
  await page.locator('#lesson-import-file').setInputFiles({ name: 'new.md', mimeType: 'text/markdown', buffer: Buffer.from(source) });
  await page.locator('#lesson-import-validate').click();
  await expect(page.locator('#lesson-import-download')).toBeEnabled();
  await page.evaluate(() => window.rejectFileRead(new Error('read failed')));
  await expect(page.locator('#lesson-import-result')).toContainText('could not be read');
  await expect(page.locator('#lesson-import-download')).toBeDisabled();
});
