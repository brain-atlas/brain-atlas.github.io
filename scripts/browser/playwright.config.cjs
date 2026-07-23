const path = require('path');

const browserName = process.env.BROWSER ?? 'firefox';
const launchOptions = {};
if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
  launchOptions.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
}
module.exports = {
  testDir: __dirname,
  testMatch: /(anatomy|animation|explore|fibre|hardening|home|performance).*\.spec\.cjs/,
  timeout: 60_000,
  workers: 1,
  use: {
    browserName,
    headless: process.env.HEADED !== '1',
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: Number(process.env.DEVICE_SCALE_FACTOR ?? 1),
    launchOptions,
  },
  outputDir: path.join(process.env.TMPDIR ?? '/tmp', 'brain-atlas-explore-test-results'),
};
