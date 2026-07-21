import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createVisibilityTransition,
  sampleVisibilityTransition,
} from '../src/ui/visibility-transition.js';

test('source and destination filters remain selected as a union until halfway', () => {
  const transition = createVisibilityTransition({
    fromOpacities: { shared: 1, outgoing: 1 },
    toIds: ['incoming', 'shared'],
    startTime: 0,
    durationMs: 1000,
  });

  assert.deepEqual(sampleVisibilityTransition(transition, 0).visibleIds, ['incoming', 'outgoing', 'shared']);
  assert.deepEqual(sampleVisibilityTransition(transition, 499).visibleIds, ['incoming', 'outgoing', 'shared']);
  assert.deepEqual(sampleVisibilityTransition(transition, 500).visibleIds, ['incoming', 'shared']);
});

test('incoming and outgoing elements cross-fade completely during the first half', () => {
  const transition = createVisibilityTransition({
    fromOpacities: { shared: 1, outgoing: 1 },
    toIds: ['incoming', 'shared'],
    startTime: 0,
    durationMs: 1000,
  });
  const quarter = sampleVisibilityTransition(transition, 250);
  const halfway = sampleVisibilityTransition(transition, 500);

  assert.deepEqual(quarter.opacities, { incoming: 0.5, outgoing: 0.5, shared: 1 });
  assert.deepEqual(halfway.opacities, { incoming: 1, outgoing: 0, shared: 1 });
  assert.equal(halfway.done, true);
  assert.equal(Object.isFrozen(quarter.opacities), true);
});

test('interrupted forward or backward fades initialize from current rendered opacity', () => {
  const forward = createVisibilityTransition({
    fromOpacities: { a: 1 },
    toIds: ['b'],
    startTime: 0,
    durationMs: 1000,
  });
  const current = sampleVisibilityTransition(forward, 250);
  const reversed = createVisibilityTransition({
    fromOpacities: current.opacities,
    toIds: ['a'],
    startTime: 250,
    durationMs: 1000,
  });

  assert.deepEqual(sampleVisibilityTransition(reversed, 250).opacities, current.opacities);
  assert.deepEqual(sampleVisibilityTransition(reversed, 750).opacities, { a: 1, b: 0 });
});

test('instant transitions expose only the destination without an intermediate union', () => {
  const transition = createVisibilityTransition({
    fromOpacities: { a: 1 },
    toIds: ['b'],
    startTime: 10,
    durationMs: 0,
  });
  assert.deepEqual(sampleVisibilityTransition(transition, 10), {
    visibleIds: ['b'],
    opacities: { a: 0, b: 1 },
    progress: 1,
    done: true,
  });
});
