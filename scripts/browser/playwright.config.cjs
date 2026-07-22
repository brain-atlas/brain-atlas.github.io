const path = require('path');

const launchOptions = {};
if (process.env.PLAYWRIGHT_EXECUTABLE_PATH) {
  launchOptions.executablePath = process.env.PLAYWRIGHT_EXECUTABLE_PATH;
}

module.exports = {
  testDir: __dirname,
  testMatch: /(animation|explore|home)-.*\.spec\.cjs/,
  timeout: 60_000,
  workers: 1,
  use: {
    browserName: process.env.BROWSER ?? 'firefox',
    headless: process.env.HEADED !== '1',
    viewport: { width: 390, height: 844 },
    launchOptions,
  },
  outputDir: path.join(process.env.TMPDIR ?? '/tmp', 'brain-atlas-explore-test-results'),
};
