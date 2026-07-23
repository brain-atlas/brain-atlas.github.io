import assert from 'node:assert/strict';
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
