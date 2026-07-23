import assert from 'node:assert/strict';
import test from 'node:test';

import { createRendererAdapter } from '../src/lesson/renderer-adapter.js';
import { normalizeSceneSnapshot } from '../src/lesson/scene-state.js';
import { MINIMAL_SCENE, TEST_CATALOG } from '../test-fixtures/lesson-context.js';

const SNAPSHOT = normalizeSceneSnapshot(MINIMAL_SCENE, TEST_CATALOG);
const ORDER = [
  'setCamera',
  'setVisibility',
  'setHemispheres',
  'setFibreFilter',
  'setCutaway',
  'setMaterial',
  'setPlayback',
  'setSelection',
  'setVisual',
  'setControlPolicy',
];

function fakeBindings() {
  const calls = [];
  let captured = SNAPSHOT;
  const bindings = {
    capture() { calls.push(['capture']); return captured; },
  };
  for (const name of ORDER) {
    bindings[name] = (value) => calls.push([name, value]);
  }
  bindings.setCaptured = (value) => { captured = value; };
  return { bindings, calls };
}

test('one adapter applies every canonical snapshot axis in deterministic order', () => {
  const { bindings, calls } = fakeBindings();
  const adapter = createRendererAdapter(bindings, TEST_CATALOG);
  const result = adapter.apply(SNAPSHOT);

  assert.deepEqual(calls.map(([name]) => name), [...ORDER, 'capture']);
  assert.deepEqual(calls[0][1], SNAPSHOT.camera);
  assert.deepEqual(calls[1][1], SNAPSHOT.visibility);
  assert.deepEqual(calls[2][1], SNAPSHOT.hemispheres);
  assert.deepEqual(calls[3][1], SNAPSHOT.fibreFilter);
  assert.deepEqual(calls.at(-2)[1], SNAPSHOT.controlPolicy);
  assert.deepEqual(result, SNAPSHOT);
  assert.equal(Object.isFrozen(result), true);
});

test('adapter capture returns normalized frozen plain state', () => {
  const { bindings } = fakeBindings();
  const adapter = createRendererAdapter(bindings, TEST_CATALOG);

  const captured = adapter.capture();
  assert.deepEqual(captured, SNAPSHOT);
  assert.equal(Object.isFrozen(captured), true);
  assert.deepEqual(JSON.parse(JSON.stringify(captured)), SNAPSHOT);
});

test('incomplete bindings fail when creating the adapter', () => {
  const { bindings } = fakeBindings();
  delete bindings.setFibreFilter;

  assert.throws(
    () => createRendererAdapter(bindings, TEST_CATALOG),
    (error) => {
      assert.equal(error.diagnostics[0].code, 'renderer.adapter.missing-binding');
      assert.equal(error.diagnostics[0].path, '/setFibreFilter');
      return true;
    },
  );
});

test('invalid snapshots fail before any renderer binding is invoked', () => {
  const { bindings, calls } = fakeBindings();
  const adapter = createRendererAdapter(bindings, TEST_CATALOG);
  const invalid = { ...SNAPSHOT, camera: { position: [1, 2, 3] } };

  assert.throws(
    () => adapter.apply(invalid),
    (error) => error.diagnostics[0].code === 'scene.snapshot.invalid-shape',
  );
  assert.deepEqual(calls, []);
});

test('captured state mismatch is reported instead of silently accepting renderer drift', () => {
  const { bindings, calls } = fakeBindings();
  const mismatch = normalizeSceneSnapshot({
    ...MINIMAL_SCENE,
    cutaway: 50,
  }, TEST_CATALOG);
  bindings.setCaptured(mismatch);
  const adapter = createRendererAdapter(bindings, TEST_CATALOG);

  assert.throws(
    () => adapter.apply(SNAPSHOT),
    (error) => error.diagnostics[0].code === 'renderer.adapter.capture-mismatch',
  );
  assert.deepEqual(calls.map(([name]) => name), [...ORDER, 'capture']);
});
