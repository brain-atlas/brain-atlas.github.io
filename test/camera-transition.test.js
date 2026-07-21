import assert from 'node:assert/strict';
import test from 'node:test';

import { createCameraTransition, sampleCameraTransition } from '../src/ui/camera-transition.js';

const from = { position: [0, 0, 10], target: [0, 0, 0] };
const to = { position: [10, 20, 30], target: [2, 4, 6] };

test('camera transition samples deterministic smooth endpoints on the shared frame clock', () => {
  const transition = createCameraTransition({ from, to, startTime: 1000, durationMs: 800 });
  assert.deepEqual(sampleCameraTransition(transition, 999), { ...from, progress: 0, done: false });
  assert.deepEqual(sampleCameraTransition(transition, 1400), {
    position: [5, 10, 20], target: [1, 2, 3], progress: 0.5, done: false,
  });
  assert.deepEqual(sampleCameraTransition(transition, 1800), { ...to, progress: 1, done: true });
  assert.equal(Object.isFrozen(transition), true);
});

test('instant and reduced-motion transitions settle without scheduling another loop', () => {
  for (const options of [
    { from, to, startTime: 10, durationMs: 0 },
    { from, to, startTime: 10, durationMs: 800, reducedMotion: true },
  ]) {
    const transition = createCameraTransition(options);
    assert.deepEqual(sampleCameraTransition(transition, 10), { ...to, progress: 1, done: true });
  }
});

test('transition input is copied so caller mutation cannot alter camera motion', () => {
  const mutableTo = structuredClone(to);
  const transition = createCameraTransition({ from, to: mutableTo, startTime: 0, durationMs: 100 });
  mutableTo.position[0] = 999;
  assert.equal(sampleCameraTransition(transition, 100).position[0], 10);
  assert.equal(Object.isFrozen(transition.to.position), true);
});
