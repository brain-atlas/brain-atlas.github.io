import assert from 'node:assert/strict';
import test from 'node:test';

import { createFrameDeltaReader } from '../src/activity/frame-time.js';

test('frame delta reader primes Timer on the first frame and updates before reading', () => {
  const calls = [];
  const deltas = [0.02];
  const timer = {
    update(timestamp) { calls.push(['update', timestamp]); },
    getDelta() { calls.push(['getDelta']); return deltas.shift(); },
  };
  const readDelta = createFrameDeltaReader(timer);

  assert.equal(readDelta(100), 0);
  assert.equal(readDelta(120), 0.02);
  assert.deepEqual(calls, [
    ['update', 100],
    ['update', 120],
    ['getDelta'],
  ]);
});

test('frame delta reader preserves the existing 50 ms clamp', () => {
  const timer = {
    update() {},
    getDelta() { return 0.4; },
  };
  const readDelta = createFrameDeltaReader(timer);

  readDelta(0);
  assert.equal(readDelta(400), 0.05);
});

test('frame delta reader never advances animation backward', () => {
  const timer = {
    update() {},
    getDelta() { return -0.001; },
  };
  const readDelta = createFrameDeltaReader(timer);

  readDelta(10);
  assert.equal(readDelta(9), 0);
});
