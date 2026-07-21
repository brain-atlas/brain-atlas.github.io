import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSceneNavigationState,
  moveScene,
  updateSceneFromScroll,
} from '../src/ui/scene-navigation.js';

test('scene navigation starts with exactly one active scene', () => {
  const state = createSceneNavigationState(5);
  assert.deepEqual(state, {
    sceneCount: 5,
    activeIndex: 0,
    activationCount: 1,
    lastReason: 'initial',
    lastScrollY: null,
  });
  assert.equal(Object.isFrozen(state), true);
});

test('forward scroll activates only after the next anchor crosses its threshold', () => {
  const initial = updateSceneFromScroll(createSceneNavigationState(5), {
    anchorTops: [-200, 620, 1400, 2200, 3000],
    viewportHeight: 1000,
    scrollY: 100,
  });
  const dwell = updateSceneFromScroll(initial, {
    anchorTops: [-260, 560, 1340, 2140, 2940],
    viewportHeight: 1000,
    scrollY: 160,
  });
  const crossed = updateSceneFromScroll(dwell, {
    anchorTops: [-280, 540, 1320, 2120, 2920],
    viewportHeight: 1000,
    scrollY: 180,
  });

  assert.equal(dwell.activeIndex, 0);
  assert.equal(dwell.activationCount, 1);
  assert.equal(crossed.activeIndex, 1);
  assert.equal(crossed.activationCount, 2);
  assert.equal(crossed.lastReason, 'scroll-forward');
});

test('small reverse motion inside the hysteresis zone does not reactivate a prior scene', () => {
  const active = updateSceneFromScroll(createSceneNavigationState(5), {
    anchorTops: [-500, 500, 1500, 2500, 3500],
    viewportHeight: 1000,
    scrollY: 500,
  });
  const smallReverse = updateSceneFromScroll(active, {
    anchorTops: [-460, 540, 1540, 2540, 3540],
    viewportHeight: 1000,
    scrollY: 460,
  });
  const crossedBack = updateSceneFromScroll(smallReverse, {
    anchorTops: [-340, 660, 1660, 2660, 3660],
    viewportHeight: 1000,
    scrollY: 340,
  });

  assert.equal(active.activeIndex, 1);
  assert.equal(smallReverse.activeIndex, 1);
  assert.equal(smallReverse.activationCount, active.activationCount);
  assert.equal(crossedBack.activeIndex, 0);
  assert.equal(crossedBack.lastReason, 'scroll-backward');
});

test('large scroll jumps and explicit controls clamp deterministically', () => {
  const jumped = updateSceneFromScroll(createSceneNavigationState(5), {
    anchorTops: [-2500, -1700, -900, 100, 900],
    viewportHeight: 1000,
    scrollY: 2500,
  });
  assert.equal(jumped.activeIndex, 3);

  const next = moveScene(jumped, 1);
  const boundedNext = moveScene(next, 1);
  const previous = moveScene(boundedNext, -1);
  assert.equal(next.activeIndex, 4);
  assert.equal(next.lastReason, 'explicit-next');
  assert.equal(boundedNext, next);
  assert.equal(previous.activeIndex, 3);
  assert.equal(previous.lastReason, 'explicit-previous');
});

test('unchanged scroll updates direction memory without restarting the active scene', () => {
  const initial = updateSceneFromScroll(createSceneNavigationState(2), {
    anchorTops: [0, 800], viewportHeight: 1000, scrollY: 0,
  });
  const unchanged = updateSceneFromScroll(initial, {
    anchorTops: [-20, 780], viewportHeight: 1000, scrollY: 20,
  });

  assert.notEqual(unchanged, initial);
  assert.equal(unchanged.activeIndex, initial.activeIndex);
  assert.equal(unchanged.activationCount, initial.activationCount);
  assert.equal(unchanged.lastReason, initial.lastReason);
  assert.equal(unchanged.lastScrollY, 20);
});
