import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import test from 'node:test';

const configPath = new URL('../scripts/browser/playwright.config.cjs', import.meta.url).pathname;

function chromiumLaunchArgs() {
  const output = execFileSync(process.execPath, [
    '--eval',
    `const config = require(${JSON.stringify(configPath)}); process.stdout.write(JSON.stringify(config.use.launchOptions.args ?? []));`,
  ], {
    encoding: 'utf8',
    env: { ...process.env, BROWSER: 'chromium' },
  });
  return JSON.parse(output);
}

test('Chromium browser coverage does not force software rendering', () => {
  const args = chromiumLaunchArgs();
  assert.equal(args.some((argument) => argument.includes('swiftshader')), false);
});
