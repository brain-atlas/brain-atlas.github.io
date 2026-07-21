import assert from 'node:assert/strict';
import test from 'node:test';

import {
  normalizeSceneSnapshot,
  serializeSceneSnapshot,
} from '../src/lesson/scene-state.js';
import { MINIMAL_SCENE, TEST_CATALOG } from '../test-fixtures/lesson-context.js';

function assertDeepFrozen(value) {
  if (value === null || typeof value !== 'object') return;
  assert.equal(Object.isFrozen(value), true);
  for (const child of Object.values(value)) assertDeepFrozen(child);
}

test('minimal author scene normalizes to a complete canonical snapshot', () => {
  const snapshot = normalizeSceneSnapshot(MINIMAL_SCENE, TEST_CATALOG);

  assert.deepEqual(snapshot, {
    schemaVersion: 1,
    camera: {
      position: [300, 15, 0],
      target: [0, 0, 0],
      transition: { kind: 'instant', durationMs: 0 },
    },
    visibility: {
      entities: ['pathway.anterior', 'region.lgn'],
    },
    hemispheres: {
      global: { L: true, R: true },
      entities: {},
    },
    cutaway: { position: 0 },
    material: { tissueOpacity: 0.16 },
    playback: { playing: true, speed: 70, settled: false },
    selection: { selected: null, emphasized: [], strength: 1 },
    visual: { id: 'atlas', layout: 'dominant' },
    controlPolicy: { mode: 'look' },
  });
});

test('normalization expands explicit fields, sorts IDs, and freezes every level', () => {
  const snapshot = normalizeSceneSnapshot({
    ...MINIMAL_SCENE,
    camera: {
      position: [1, 2, 3],
      target: [4, 5, 6],
      transition: { kind: 'ease', durationMs: 900 },
    },
    show: ['tract.ilf', 'pathway.anterior'],
    hemispheres: {
      global: { L: true, R: false },
      entities: {
        'tract.ilf': { L: false, R: true },
        'pathway.anterior': { L: true, R: true },
      },
    },
    cutaway: 42,
    tissueOpacity: 0.35,
    playback: { playing: false, speed: 90, settled: true },
    selection: {
      selected: 'tract.ilf',
      emphasized: ['tract.ilf', 'pathway.anterior'],
      strength: 0.6,
    },
    visual: 'retinotopy-diagram',
    layout: 'split',
    controls: { mode: 'explore' },
  }, TEST_CATALOG);

  assert.deepEqual(snapshot.visibility.entities, ['pathway.anterior', 'tract.ilf']);
  assert.deepEqual(Object.keys(snapshot.hemispheres.entities), ['pathway.anterior', 'tract.ilf']);
  assert.deepEqual(snapshot.selection.emphasized, ['pathway.anterior', 'tract.ilf']);
  assertDeepFrozen(snapshot);
  assert.throws(() => snapshot.visibility.entities.push('region.lgn'), TypeError);
});

test('snapshots round-trip through deterministic JSON serialization', () => {
  const a = normalizeSceneSnapshot(MINIMAL_SCENE, TEST_CATALOG);
  const b = normalizeSceneSnapshot({
    ...MINIMAL_SCENE,
    show: [...MINIMAL_SCENE.show].reverse(),
  }, TEST_CATALOG);

  assert.equal(serializeSceneSnapshot(a), serializeSceneSnapshot(b));
  assert.deepEqual(JSON.parse(serializeSceneSnapshot(a)), a);
});

test('unknown entities, visuals, and camera presets fail with semantic diagnostics', () => {
  const cases = [
    [{ ...MINIMAL_SCENE, show: ['region.unknown'] }, 'scene.semantic.unknown-entity', '/show/0'],
    [{ ...MINIMAL_SCENE, visual: 'unknown-visual' }, 'scene.semantic.unknown-visual', '/visual'],
    [{ ...MINIMAL_SCENE, camera: 'unknown-camera' }, 'scene.semantic.unknown-camera', '/camera'],
    [{ ...MINIMAL_SCENE, selection: { selected: 'region.unknown' } }, 'scene.semantic.unknown-entity', '/selection/selected'],
  ];

  for (const [scene, code, path] of cases) {
    assert.throws(
      () => normalizeSceneSnapshot(scene, TEST_CATALOG),
      (error) => {
        assert.equal(error.diagnostics[0].code, code);
        assert.equal(error.diagnostics[0].path, path);
        return true;
      },
    );
  }
});
