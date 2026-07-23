import assert from 'node:assert/strict';
import test from 'node:test';

import configFactory from '../vite.config.js';

function configFor(mode, { standalone = false } = {}) {
  assert.equal(typeof configFactory, 'function', 'Vite config must select output by build mode');
  const previous = process.env.BRAIN_ATLAS_STANDALONE;
  if (standalone) process.env.BRAIN_ATLAS_STANDALONE = '1';
  else delete process.env.BRAIN_ATLAS_STANDALONE;
  try {
    return configFactory({ mode, command: 'build' });
  } finally {
    if (previous === undefined) delete process.env.BRAIN_ATLAS_STANDALONE;
    else process.env.BRAIN_ATLAS_STANDALONE = previous;
  }
}

function threeGroup(config) {
  return config.build.rolldownOptions.output.codeSplitting.groups
    .find(({ name }) => name === 'three');
}

test('Vite uses native Rolldown grouping for the cacheable Three.js chunk', () => {
  const config = configFor('production');
  assert.equal(config.build.rollupOptions, undefined);
  const three = threeGroup(config);

  assert.ok(three);
  assert.equal(three.test.test('/project/node_modules/three/src/Three.js'), true);
  assert.equal(three.test.test('/project/node_modules/other/index.js'), false);
  assert.equal(config.build.chunkSizeWarningLimit, 650);
});

test('ordinary production builds omit standalone lifecycle code', () => {
  const config = configFor('production');

  assert.equal(config.build.outDir, 'dist');
  assert.equal(config.build.assetsDir, 'assets');
  assert.equal(config.define, undefined);
  assert.equal(config.plugins.some(({ name }) => name === 'standalone-lifecycle'), false);
});

test('standalone builds inject a Vite-managed lifecycle module into embed staging', () => {
  const config = configFor('production', { standalone: true });
  const lifecyclePlugin = config.plugins.find(({ name }) => name === 'standalone-lifecycle');

  assert.equal(config.build.outDir, 'internal/site/dist');
  assert.equal(config.build.assetsDir, 'standalone-assets');
  assert.equal(config.define, undefined);
  assert.ok(lifecyclePlugin);
  assert.equal(lifecyclePlugin.transformIndexHtml.order, 'pre');
  assert.deepEqual(lifecyclePlugin.transformIndexHtml.handler(), [{
    tag: 'script',
    attrs: { type: 'module', src: '/src/standalone/lifecycle.js' },
    injectTo: 'head-prepend',
  }]);
});
