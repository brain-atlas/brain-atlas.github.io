import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeSceneSnapshot } from '../src/lesson/scene-state.js';

const moduleUnderTest = await import('../src/ui/explore-session.js').catch(() => ({}));
const {
  applyExploreCommands,
  createAtlasExploreSnapshot,
  createExplorePanelModel,
  createSceneExploreSnapshot,
  exploreFidelityIds,
} = moduleUnderTest;

const CATALOG = {
  entityIds: [
    'layer.cortex',
    'layer.labels',
    'pathway.anterior',
    'region.dlpfc',
    'region.lgn',
  ],
  visualIds: ['atlas'],
  fidelityIds: ['fidelity.anterior', 'fidelity.cortex', 'fidelity.regions'],
  cameraPresets: {
    home: { position: [210, 75, -195], target: [0, 0, 0] },
    lateral: { position: [300, 15, 0], target: [0, 0, 0] },
  },
  entitiesById: {
    'layer.cortex': {
      id: 'layer.cortex', hemisphereMode: 'none', fidelity: 'fidelity.cortex',
      renderer: { kind: 'layer', id: 'brain' },
    },
    'layer.labels': {
      id: 'layer.labels', hemisphereMode: 'none', fidelity: 'fidelity.cortex',
      renderer: { kind: 'layer', id: 'labels' },
    },
    'pathway.anterior': {
      id: 'pathway.anterior', hemisphereMode: 'none', fidelity: 'fidelity.anterior',
      renderer: { kind: 'layer', id: 'anterior' },
    },
    'region.dlpfc': {
      id: 'region.dlpfc', hemisphereMode: 'bilateral', fidelity: 'fidelity.regions',
      renderer: { kind: 'region', id: 'dlpfc' },
    },
    'region.lgn': {
      id: 'region.lgn', hemisphereMode: 'bilateral', fidelity: 'fidelity.regions',
      renderer: { kind: 'region', id: 'lgn' },
    },
  },
};

function authoredSnapshot() {
  return normalizeSceneSnapshot({
    id: 'relay',
    visual: 'atlas',
    camera: {
      position: [100, 30, -90],
      target: [0, -5, 20],
      transition: { kind: 'ease', durationMs: 900 },
    },
    show: ['pathway.anterior', 'region.lgn'],
    hemispheres: { entities: { 'region.lgn': { L: true, R: false } } },
    cutaway: 22,
    tissueOpacity: 0.31,
    playback: { playing: false, speed: 55, settled: true },
    selection: { selected: 'region.lgn', emphasized: ['region.lgn'], strength: 0.8 },
    controls: { mode: 'guided' },
    layout: 'detail',
  }, CATALOG);
}

const renderedCamera = Object.freeze({ position: [88, 12, -77], target: [2, -3, 18] });

test('scene Explore preserves effective state but uses the rendered camera and full controls', () => { // Tests INV-20
  assert.equal(typeof createSceneExploreSnapshot, 'function');
  const authored = authoredSnapshot();
  const before = JSON.stringify(authored);
  const result = createSceneExploreSnapshot(authored, renderedCamera, CATALOG);

  assert.deepEqual(result.camera, {
    position: renderedCamera.position,
    target: renderedCamera.target,
    transition: { kind: 'instant', durationMs: 0 },
  });
  assert.deepEqual(result.visibility, authored.visibility);
  assert.deepEqual(result.hemispheres, authored.hemispheres);
  assert.deepEqual(result.cutaway, authored.cutaway);
  assert.deepEqual(result.material, authored.material);
  assert.deepEqual(result.playback, authored.playback);
  assert.deepEqual(result.selection, authored.selection);
  assert.deepEqual(result.visual, { id: 'atlas', layout: 'dominant' });
  assert.deepEqual(result.controlPolicy, { mode: 'explore' });
  assert.equal(JSON.stringify(authored), before);
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.camera.position), true);
});

test('global Explore derives one complete default atlas snapshot', () => { // Tests INV-21
  assert.equal(typeof createAtlasExploreSnapshot, 'function');
  const result = createAtlasExploreSnapshot(CATALOG);

  assert.deepEqual(result.camera, {
    position: [210, 75, -195],
    target: [0, 0, 0],
    transition: { kind: 'instant', durationMs: 0 },
  });
  assert.deepEqual(result.visibility.entities, [
    'layer.cortex', 'pathway.anterior', 'region.dlpfc', 'region.lgn',
  ]);
  assert.deepEqual(result.hemispheres, { global: { L: true, R: true }, entities: {} });
  assert.deepEqual(result.cutaway, { position: 0 });
  assert.deepEqual(result.material, { tissueOpacity: 0.16 });
  assert.deepEqual(result.playback, { playing: true, speed: 70, settled: false });
  assert.deepEqual(result.selection, { selected: null, emphasized: [], strength: 1 });
  assert.deepEqual(result.visual, { id: 'atlas', layout: 'dominant' });
  assert.deepEqual(result.controlPolicy, { mode: 'explore' });
});

test('Explore commands synchronize the rendered camera before applying a batch', () => { // Tests INV-22
  assert.equal(typeof applyExploreCommands, 'function');
  const start = createSceneExploreSnapshot(authoredSnapshot(), renderedCamera, CATALOG);
  const latestCamera = { position: [40, 50, -60], target: [5, 6, 7] };
  const result = applyExploreCommands(start, [
    { type: 'visibility.set', entity: 'region.dlpfc', visible: true },
    { type: 'material.set', tissueOpacity: 0.42 },
    { type: 'playback.set', playing: true, speed: 90, settled: false },
  ], latestCamera, CATALOG);

  assert.deepEqual(result.camera, {
    ...latestCamera,
    transition: { kind: 'instant', durationMs: 0 },
  });
  assert.deepEqual(result.visibility.entities, ['pathway.anterior', 'region.dlpfc', 'region.lgn']);
  assert.deepEqual(result.material, { tissueOpacity: 0.42 });
  assert.deepEqual(result.playback, { playing: true, speed: 90, settled: false });
  assert.deepEqual(start.material, { tissueOpacity: 0.31 });
});

test('panel projection uses stable entity IDs and truthful visibility/hemisphere state', () => { // Tests INV-23
  assert.equal(typeof createExplorePanelModel, 'function');
  const snapshot = createSceneExploreSnapshot(authoredSnapshot(), renderedCamera, CATALOG);
  const model = createExplorePanelModel(snapshot, CATALOG);

  assert.deepEqual(model.globalHemispheres, { L: true, R: true });
  assert.deepEqual(model.entities['region.lgn'], {
    visible: true,
    L: true,
    R: false,
    hemisphereMode: 'bilateral',
    renderer: { kind: 'region', id: 'lgn' },
  });
  assert.deepEqual(model.entities['region.dlpfc'], {
    visible: false,
    L: false,
    R: false,
    hemisphereMode: 'bilateral',
    renderer: { kind: 'region', id: 'dlpfc' },
  });
  assert.deepEqual(model.entities['layer.cortex'], {
    visible: false,
    L: false,
    R: false,
    hemisphereMode: 'none',
    renderer: { kind: 'layer', id: 'brain' },
  });
  assert.deepEqual(model.playback, snapshot.playback);
  assert.equal(Object.isFrozen(model.entities['region.lgn']), true);
});

test('Explore fidelity is the sorted union of visible entities and current-scene records', () => { // Tests INV-24
  assert.equal(typeof exploreFidelityIds, 'function');
  const snapshot = createSceneExploreSnapshot(authoredSnapshot(), renderedCamera, CATALOG);
  assert.deepEqual(exploreFidelityIds(snapshot, CATALOG, ['fidelity.cortex']), [
    'fidelity.anterior', 'fidelity.cortex', 'fidelity.regions',
  ]);
});

test('invalid rendered cameras, commands, and fidelity references fail before state changes', () => { // Tests FAIL-21
  const start = authoredSnapshot();
  assert.throws(
    () => createSceneExploreSnapshot(start, { position: [1, 2], target: [0, 0, 0] }, CATALOG),
    /camera|invalid/i,
  );
  assert.throws(
    () => applyExploreCommands(start, [{ type: 'visibility.set', entity: 'region.unknown', visible: true }], renderedCamera, CATALOG),
    /unknown entity/i,
  );
  assert.throws(
    () => exploreFidelityIds(start, CATALOG, ['fidelity.unknown']),
    /unknown fidelity/i,
  );
});
