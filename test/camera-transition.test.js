import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createCameraTransition,
  easeCameraProgress,
  sampleCameraTransition,
} from '../src/ui/camera-transition.js';

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

test('quintic spline gives camera velocity and acceleration a smooth zero endpoint', () => {
  assert.equal(easeCameraProgress(0), 0);
  assert.equal(easeCameraProgress(0.25), 0.103515625);
  assert.equal(easeCameraProgress(0.5), 0.5);
  assert.equal(easeCameraProgress(0.75), 0.896484375);
  assert.equal(easeCameraProgress(1), 1);

  const h = 1e-6;
  const startVelocity = (easeCameraProgress(h) - easeCameraProgress(0)) / h;
  const endVelocity = (easeCameraProgress(1) - easeCameraProgress(1 - h)) / h;
  const startAcceleration = (easeCameraProgress(2 * h) - 2 * easeCameraProgress(h)) / (h * h);
  const endAcceleration = (easeCameraProgress(1) - 2 * easeCameraProgress(1 - h) + easeCameraProgress(1 - 2 * h)) / (h * h);
  assert.ok(Math.abs(startVelocity) < 1e-8);
  assert.ok(Math.abs(endVelocity) < 1e-8);
  assert.ok(Math.abs(startAcceleration) < 0.001);
  assert.ok(Math.abs(endAcceleration) < 0.01);
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

test('orbit path rotates the camera offset around the interpolated target instead of drifting off-pivot', () => {
  const transition = createCameraTransition({
    from: { position: [0, 0, -10], target: [0, 0, 0] },
    to: { position: [10, 0, 0], target: [0, 0, 0] },
    startTime: 0,
    durationMs: 100,
    path: 'orbit',
  });
  const halfway = sampleCameraTransition(transition, 50);

  assert.ok(Math.abs(Math.hypot(...halfway.position) - 10) < 1e-9);
  assert.ok(Math.abs(halfway.position[0] - Math.SQRT1_2 * 10) < 1e-9);
  assert.ok(Math.abs(halfway.position[2] + Math.SQRT1_2 * 10) < 1e-9);
  assert.deepEqual(halfway.target, [0, 0, 0]);
});

test('an interrupted forward or backward orbit starts from the current rendered pose', () => {
  const first = createCameraTransition({
    from: { position: [0, 0, -10], target: [0, 0, 0] },
    to: { position: [10, 0, 0], target: [0, 0, 0] },
    startTime: 0,
    durationMs: 100,
    path: 'orbit',
  });
  const current = sampleCameraTransition(first, 38);
  const reversed = createCameraTransition({
    from: current,
    to: first.from,
    startTime: 38,
    durationMs: 100,
    path: 'orbit',
  });
  const reverseStart = sampleCameraTransition(reversed, 38);

  assert.deepEqual(reverseStart.position, current.position);
  assert.deepEqual(reverseStart.target, current.target);
});
