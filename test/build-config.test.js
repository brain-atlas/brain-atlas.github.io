import assert from 'node:assert/strict';
import test from 'node:test';

import config from '../vite.config.js';

test('Vite uses native Rolldown grouping for the cacheable Three.js chunk', () => {
  assert.equal(config.build.rollupOptions, undefined);
  const groups = config.build.rolldownOptions.output.codeSplitting.groups;
  const three = groups.find(({ name }) => name === 'three');

  assert.ok(three);
  assert.equal(three.test.test('/project/node_modules/three/src/Three.js'), true);
  assert.equal(three.test.test('/project/node_modules/other/index.js'), false);
  assert.equal(config.build.chunkSizeWarningLimit, 650);
});
