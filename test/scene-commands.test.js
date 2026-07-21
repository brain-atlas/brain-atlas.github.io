import assert from 'node:assert/strict';
import test from 'node:test';

import { applySceneCommand } from '../src/lesson/commands.js';
import { normalizeSceneSnapshot } from '../src/lesson/scene-state.js';
import { MINIMAL_SCENE, TEST_CATALOG } from '../test-fixtures/lesson-context.js';

const BASE = normalizeSceneSnapshot(MINIMAL_SCENE, TEST_CATALOG);

test('allowlisted commands update every scene-state axis without mutating prior state', () => {
  const cases = [
    [{ type: 'camera.set', camera: 'home' }, (s) => assert.deepEqual(s.camera.position, [200, 120, 300])],
    [{ type: 'visibility.set', entity: 'region.lgn', visible: false }, (s) => assert.deepEqual(s.visibility.entities, ['pathway.anterior'])],
    [{ type: 'hemispheres.set-global', L: false, R: true }, (s) => assert.deepEqual(s.hemispheres.global, { L: false, R: true })],
    [{ type: 'hemispheres.set-entity', entity: 'region.lgn', L: true, R: false }, (s) => assert.deepEqual(s.hemispheres.entities['region.lgn'], { L: true, R: false })],
    [{ type: 'cutaway.set', position: 75 }, (s) => assert.equal(s.cutaway.position, 75)],
    [{ type: 'material.set', tissueOpacity: 0.4 }, (s) => assert.equal(s.material.tissueOpacity, 0.4)],
    [{ type: 'playback.set', playing: false, speed: 100, settled: true }, (s) => assert.deepEqual(s.playback, { playing: false, speed: 100, settled: true })],
    [{ type: 'selection.set', selected: 'region.lgn', emphasized: ['region.lgn'], strength: 0.7 }, (s) => assert.deepEqual(s.selection, { selected: 'region.lgn', emphasized: ['region.lgn'], strength: 0.7 })],
    [{ type: 'visual.set', visual: 'retinotopy-diagram', layout: 'detail' }, (s) => assert.deepEqual(s.visual, { id: 'retinotopy-diagram', layout: 'detail' })],
    [{ type: 'controls.set', mode: 'guided' }, (s) => assert.deepEqual(s.controlPolicy, { mode: 'guided' })],
  ];

  const original = JSON.stringify(BASE);
  for (const [command, verify] of cases) {
    const next = applySceneCommand(BASE, command, TEST_CATALOG);
    assert.notEqual(next, BASE);
    assert.equal(Object.isFrozen(next), true);
    verify(next);
    assert.equal(JSON.stringify(BASE), original);
  }
});

test('scene.replace atomically accepts a complete canonical snapshot', () => {
  const replacement = applySceneCommand(BASE, {
    type: 'scene.replace',
    snapshot: {
      ...BASE,
      cutaway: { position: 30 },
      playback: { playing: false, speed: 70, settled: true },
    },
  }, TEST_CATALOG);

  assert.equal(replacement.cutaway.position, 30);
  assert.deepEqual(replacement.playback, { playing: false, speed: 70, settled: true });
  assert.equal(JSON.stringify(BASE), JSON.stringify(normalizeSceneSnapshot(MINIMAL_SCENE, TEST_CATALOG)));
});

test('unknown commands and unknown payload keys fail before state changes', () => {
  const cases = [
    { type: 'javascript.run', source: 'alert(1)' },
    { type: 'cutaway.set', position: 20, execute: 'code' },
    { type: 'visibility.set', entity: 'region.unknown', visible: true },
    { type: 'visibility.set', entity: 'region.unknown', visible: false },
    { type: 'visibility.set', entity: 'region.lgn', visible: 'yes' },
  ];

  for (const command of cases) {
    const before = JSON.stringify(BASE);
    assert.throws(
      () => applySceneCommand(BASE, command, TEST_CATALOG),
      (error) => Array.isArray(error.diagnostics) && error.diagnostics.length > 0,
    );
    assert.equal(JSON.stringify(BASE), before);
  }
});
