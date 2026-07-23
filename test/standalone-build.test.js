import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

async function loadBuildModule() {
  let buildModule;
  try {
    buildModule = await import('../scripts/build-standalone.mjs');
  } catch {
    buildModule = null;
  }
  assert.equal(typeof buildModule?.targetBinaryName, 'function');
  assert.equal(typeof buildModule?.goBuildEnvironment, 'function');
  assert.equal(typeof buildModule?.buildPlan, 'function');
  return buildModule;
}

test('standalone build names host and cross-compiled binaries by target OS', async () => {
  const { targetBinaryName } = await loadBuildModule();

  assert.equal(targetBinaryName('darwin'), 'brain-atlas');
  assert.equal(targetBinaryName('linux'), 'brain-atlas');
  assert.equal(targetBinaryName('windows'), 'brain-atlas.exe');
});

test('standalone build always disables cgo without discarding target settings', async () => {
  const { goBuildEnvironment } = await loadBuildModule();
  const environment = goBuildEnvironment({ GOOS: 'linux', GOARCH: 'arm64', CGO_ENABLED: '1' });

  assert.equal(environment.GOOS, 'linux');
  assert.equal(environment.GOARCH, 'arm64');
  assert.equal(environment.CGO_ENABLED, '0');
});

test('clean source checkout includes an embed staging placeholder', () => {
  assert.equal(existsSync(new URL('../internal/site/dist/.gitkeep', import.meta.url)), true);
});

test('standalone build supports staging the production site without compiling a host binary', async () => {
  const { buildPlan } = await loadBuildModule();

  assert.deepEqual(buildPlan([]), { buildBinary: true });
  assert.deepEqual(buildPlan(['--site-only']), { buildBinary: false });
  assert.throws(() => buildPlan(['--unknown']), /unknown standalone build option/);
});

test('release build stages once before invoking the deterministic Go packager', async () => {
  const releaseModule = await import('../scripts/build-standalone-release.mjs');
  assert.equal(typeof releaseModule.releaseBuildCommands, 'function');
  assert.deepEqual(releaseModule.releaseBuildCommands(['-label', 'ci-local']), [
    { command: process.execPath, arguments: ['scripts/build-standalone.mjs', '--site-only'] },
    { command: 'go', arguments: ['run', './cmd/package-standalone', '-label', 'ci-local'] },
  ]);

  const packageJSON = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));
  assert.equal(packageJSON.scripts['build:release'], 'node scripts/build-standalone-release.mjs');
  assert.equal(packageJSON.scripts['verify:release'], 'go run ./cmd/package-standalone -verify-only');
});
