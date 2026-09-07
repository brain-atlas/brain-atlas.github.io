// Run with NODE_PATH pointing to an external playwright-core installation.
const assert = require('node:assert/strict');
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH });
  try {
    const page = await browser.newPage();
    let leftAttempts = 0;
    let rightAttempts = 0;
    await page.route('**/data/regions/v1_L.obj', route => {
      leftAttempts += 1;
      return leftAttempts === 1 ? route.abort() : route.continue();
    });
    page.on('request', request => { if (request.url().endsWith('/v1_R.obj')) rightAttempts += 1; });
    await page.goto(`${process.env.BRAIN_ATLAS_URL || 'http://[::1]:5181/'}?lesson=retina-to-v1`);
    await page.waitForFunction(() => document.querySelector('.region-load-retry'));
    await page.locator('#viewer-console > summary').click();
    const retry = page.locator('.region-load-retry').first();
    assert.equal(await retry.isEnabled(), true, 'guided lesson recovery must remain enabled');
    await retry.focus();
    assert.equal(await retry.evaluate(button => button === document.activeElement), true);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !document.querySelector('.region-load-retry'));
    assert.equal(leftAttempts, 2, 'retry requests only failed hemisphere');
    assert.equal(rightAttempts, 1, 'successful hemisphere stays retained');
    console.log('PASS guided lesson keyboard mesh recovery');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
