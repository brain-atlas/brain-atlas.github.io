import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeSceneSnapshot } from '../src/lesson/index.js';
import { createLessonSceneController } from '../src/ui/lesson-scene-controller.js';
import { MINIMAL_SCENE, TEST_CATALOG } from '../test-fixtures/lesson-context.js';

const scene = (id, camera, playback = { playing: true, speed: 70, settled: false }) => ({
  id,
  title: id,
  snapshot: normalizeSceneSnapshot({ ...MINIMAL_SCENE, id, camera, playback }, TEST_CATALOG),
});
const scenes = [
  scene('one', {
    position: [0, 0, 10],
    target: [0, 0, 0],
    transition: { kind: 'ease', durationMs: 900 },
  }),
  scene('two', 'lateral'),
];

function fakeAdapter() {
  const applied = [];
  return {
    applied,
    adapter: {
      apply(snapshot) { applied.push(snapshot); return snapshot; },
      capture() { return applied.at(-1); },
    },
  };
}

test('controller waits for renderer readiness, then applies exactly one complete scene', () => {
  const fake = fakeAdapter();
  const controller = createLessonSceneController({ scenes, adapter: fake.adapter });

  assert.equal(controller.state.status, 'loading');
  assert.equal(fake.applied.length, 0);
  controller.setReady();
  assert.equal(controller.state.status, 'ready');
  assert.equal(fake.applied.length, 1);
  assert.deepEqual(fake.applied[0], scenes[0].snapshot);
  assert.equal(Object.isFrozen(controller.state), true);
});

test('an entry scene is ready before numbered navigation and can be restored', () => {
  const fake = fakeAdapter();
  const entryScene = scene('overview', 'home');
  const controller = createLessonSceneController({ scenes, entryScene, adapter: fake.adapter });

  assert.equal(controller.state.activeIndex, -1);
  assert.equal(controller.activeScene.id, 'overview');
  controller.setReady();
  assert.deepEqual(fake.applied[0], entryScene.snapshot);

  controller.activate(0, { reason: 'scroll-forward' });
  assert.deepEqual(fake.applied[1], scenes[0].snapshot);
  controller.activate(-1, { reason: 'scroll-backward' });
  assert.deepEqual(fake.applied[2], entryScene.snapshot);
});

test('initial index synchronizes navigation that advanced before renderer readiness', () => {
  const fake = fakeAdapter();
  const controller = createLessonSceneController({
    scenes,
    entryScene: scene('overview', 'home'),
    initialIndex: 1,
    adapter: fake.adapter,
  });

  assert.equal(controller.state.activeIndex, 1);
  assert.equal(controller.state.activeSceneId, 'two');
  controller.setReady();
  assert.deepEqual(fake.applied, [scenes[1].snapshot]);
});

test('activation and re-entry are deterministic without restarting an unchanged scene', () => {
  const fake = fakeAdapter();
  const controller = createLessonSceneController({ scenes, adapter: fake.adapter });
  controller.setReady();
  controller.activate(1, { reason: 'scroll-forward' });
  const afterActivation = controller.state;
  controller.activate(1, { reason: 'scroll-forward' });
  controller.activate(0, { reason: 'explicit-previous' });
  controller.activate(1, { reason: 'explicit-next' });

  assert.equal(fake.applied.length, 4);
  assert.equal(afterActivation.activeIndex, 1);
  assert.equal(afterActivation.activationCount, 2);
  assert.deepEqual(fake.applied[1], fake.applied[3]);
  assert.equal(controller.state.lastReason, 'explicit-next');
});

test('reduced motion replaces camera animation and activity with a settled scene', () => {
  const fake = fakeAdapter();
  const controller = createLessonSceneController({
    scenes,
    adapter: fake.adapter,
    reducedMotion: true,
  });
  controller.setReady();
  const applied = fake.applied[0];

  assert.deepEqual(applied.camera.transition, { kind: 'instant', durationMs: 0 });
  assert.deepEqual(applied.playback, { playing: false, speed: 70, settled: true });
  assert.equal(controller.state.reducedMotion, true);
  assert.equal(controller.restart(), controller.state);
  assert.equal(fake.applied.length, 1);
});

test('restart resets then reapplies authored activity, while skip settles in place', () => {
  const fake = fakeAdapter();
  const controller = createLessonSceneController({ scenes, adapter: fake.adapter });
  controller.setReady();
  controller.restart();

  assert.equal(fake.applied.length, 3);
  assert.deepEqual(fake.applied[1].playback, { playing: false, speed: 70, settled: true });
  assert.deepEqual(fake.applied[2].playback, scenes[0].snapshot.playback);
  assert.equal(controller.state.replayCount, 1);
  assert.equal(controller.state.lastReason, 'restart');

  controller.skip();
  assert.equal(fake.applied.length, 4);
  assert.deepEqual(fake.applied[3].playback, { playing: false, speed: 70, settled: true });
  assert.deepEqual(fake.applied[3].camera.transition, { kind: 'instant', durationMs: 0 });
  assert.equal(controller.state.manualSettled, true);
  assert.equal(controller.state.lastReason, 'skip');
});

test('adapter failures become explicit controller error state and remain observable', () => {
  const controller = createLessonSceneController({
    scenes,
    adapter: { apply() { throw new Error('renderer unavailable'); }, capture() {} },
  });

  assert.throws(() => controller.setReady(), /renderer unavailable/);
  assert.equal(controller.state.status, 'error');
  assert.equal(controller.state.error, 'renderer unavailable');
});
