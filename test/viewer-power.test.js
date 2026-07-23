import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveViewerPowerState,
  latestStageIntersection,
  needsContinuousViewerFrames,
  rectIntersectsViewport,
} from '../src/ui/viewer-power.js';

function input(overrides = {}) {
  return {
    documentVisible: true,
    stageVisible: true,
    requestedPlaying: true,
    settled: false,
    reducedMotion: false,
    ...overrides,
  };
}

test('hidden documents and fully offscreen stages suspend without changing playback intent', () => { // Tests INV-51
  const hidden = deriveViewerPowerState(input({ documentVisible: false }));
  assert.equal(hidden.suspended, true);
  assert.equal(hidden.reason, 'document-hidden');
  assert.equal(hidden.requestedPlaying, true);
  assert.equal(hidden.resumeEligible, true);
  assert.equal(hidden.activityActive, false);

  const offscreen = deriveViewerPowerState(input({ stageVisible: false }));
  assert.equal(offscreen.suspended, true);
  assert.equal(offscreen.reason, 'stage-offscreen');
  assert.equal(offscreen.requestedPlaying, true);
  assert.equal(offscreen.resumeEligible, true);
  assert.equal(offscreen.activityActive, false);
});

test('returning visibility resumes only requested non-settled playback', () => { // Tests INV-51
  assert.equal(deriveViewerPowerState(input()).activityActive, true);
  assert.equal(deriveViewerPowerState(input({ requestedPlaying: false })).activityActive, false);
  assert.equal(deriveViewerPowerState(input({ settled: true })).activityActive, false);
  assert.equal(deriveViewerPowerState(input({ reducedMotion: true })).activityActive, false);
  assert.equal(deriveViewerPowerState(input({ reducedMotion: true })).resumeEligible, false);
});

test('continuous frames require an observable source of visual change', () => { // Tests INV-51
  const playing = deriveViewerPowerState(input());
  const paused = deriveViewerPowerState(input({ requestedPlaying: false }));
  const hidden = deriveViewerPowerState(input({ documentVisible: false }));

  assert.equal(needsContinuousViewerFrames({ powerState: playing }), true);
  assert.equal(needsContinuousViewerFrames({ powerState: paused }), false);
  assert.equal(needsContinuousViewerFrames({ powerState: paused, cameraTransitioning: true }), true);
  assert.equal(needsContinuousViewerFrames({ powerState: paused, visibilityTransitioning: true }), true);
  assert.equal(needsContinuousViewerFrames({ powerState: paused, autoRotate: true }), true);
  assert.equal(needsContinuousViewerFrames({ powerState: paused, controlsChanged: true }), true);
  assert.equal(needsContinuousViewerFrames({ powerState: hidden, cameraTransitioning: true, autoRotate: true }), false);
});

test('initial and queued stage geometry use current viewport observability', () => { // Tests INV-51
  const viewport = { width: 390, height: 844 };
  assert.equal(rectIntersectsViewport({ left: 0, right: 390, top: 100, bottom: 500, width: 390, height: 400 }, viewport), true);
  assert.equal(rectIntersectsViewport({ left: 0, right: 390, top: 900, bottom: 1300, width: 390, height: 400 }, viewport), false);
  assert.equal(rectIntersectsViewport({ left: 0, right: 0, top: 0, bottom: 0, width: 0, height: 0 }, viewport), false);

  const stage = {};
  const other = {};
  assert.equal(latestStageIntersection([
    { target: stage, isIntersecting: false },
    { target: other, isIntersecting: false },
    { target: stage, isIntersecting: true },
  ], stage), true);
});

test('power policy rejects interaction-idle inputs rather than classifying passive reading', () => { // Tests INV-51
  assert.throws(
    () => deriveViewerPowerState({ ...input(), idleMilliseconds: 300_000 }),
    /unknown viewer power input: idleMilliseconds/,
  );
});
