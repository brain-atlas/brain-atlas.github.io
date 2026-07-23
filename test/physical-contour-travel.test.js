import assert from 'node:assert/strict';
import test from 'node:test';

async function loadTravelModule() {
  try {
    return await import('../src/activity/physical-contour-travel.js');
  } catch (error) {
    assert.fail(`physical contour travel module is unavailable: ${error.message}`);
  }
}

test('distance sampling follows cumulative arc length across uneven segments', async () => {
  const { createContourDistanceProfile, sampleContourDistance } = await loadTravelModule();
  const profile = createContourDistanceProfile([
    [0, 0, 0],
    [3, 0, 0],
    [3, 4, 0],
  ]);

  assert.equal(profile.lengthMm, 7);
  assert.deepEqual(sampleContourDistance(profile, 1.5), [1.5, 0, 0]);
  assert.deepEqual(sampleContourDistance(profile, 5), [3, 2, 0]);
});

test('equal physical velocity gives shorter contours lower transit latency', async () => {
  const {
    contourTransitDuration,
    createContourDistanceProfile,
    distanceAfterDisplayTime,
  } = await loadTravelModule();
  const shortProfile = createContourDistanceProfile([[0, 0, 0], [10, 0, 0]]);
  const longProfile = createContourDistanceProfile([[0, 0, 0], [25, 0, 0]]);
  const speedMmPerDisplaySecond = 5;

  assert.equal(distanceAfterDisplayTime(1.5, speedMmPerDisplaySecond), 7.5);
  assert.equal(contourTransitDuration(shortProfile, speedMmPerDisplaySecond), 2);
  assert.equal(contourTransitDuration(longProfile, speedMmPerDisplaySecond), 5);
});

test('distance sampling clamps, wraps, and reverses without changing the contour', async () => {
  const { createContourDistanceProfile, sampleContourDistance } = await loadTravelModule();
  const points = [{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 2, y: 3, z: 0 }];
  const profile = createContourDistanceProfile(points);

  assert.deepEqual(sampleContourDistance(profile, -1), [0, 0, 0]);
  assert.deepEqual(sampleContourDistance(profile, 8), [2, 3, 0]);
  assert.deepEqual(sampleContourDistance(profile, 6, { wrap: true }), [1, 0, 0]);
  assert.deepEqual(sampleContourDistance(profile, 1, { reverse: true }), [2, 2, 0]);
  assert.deepEqual(points, [{ x: 0, y: 0, z: 0 }, { x: 2, y: 0, z: 0 }, { x: 2, y: 3, z: 0 }]);
});

test('the shared directed-travel default is 40 MNI mm per display second', async () => {
  const {
    DIRECTED_TRAVEL_SPEED_MNI_MM_PER_DISPLAY_SECOND,
    contourTransitDuration,
    createContourDistanceProfile,
    distanceAfterDisplayTime,
  } = await loadTravelModule();
  const profile = createContourDistanceProfile([[0, 0, 0], [10, 0, 0]]);

  assert.equal(DIRECTED_TRAVEL_SPEED_MNI_MM_PER_DISPLAY_SECOND, 40);
  assert.equal(distanceAfterDisplayTime(0.5), 20);
  assert.equal(contourTransitDuration(profile), 0.25);
});

test('invalid contours and physical travel values fail explicitly', async () => {
  const {
    contourTransitDuration,
    createContourDistanceProfile,
    distanceAfterDisplayTime,
    sampleContourDistance,
  } = await loadTravelModule();
  const profile = createContourDistanceProfile([[0, 0, 0], [1, 0, 0]]);

  assert.throws(() => createContourDistanceProfile([[0, 0, 0]]), /at least two/i);
  assert.throws(() => createContourDistanceProfile([[0, 0, 0], [Number.NaN, 0, 0]]), /finite/i);
  assert.throws(() => createContourDistanceProfile([[1, 2, 3], [1, 2, 3]]), /positive arc length/i);
  assert.throws(() => distanceAfterDisplayTime(1, 0), /positive finite speed/i);
  assert.throws(() => contourTransitDuration(profile, -1), /positive finite speed/i);
  assert.throws(() => sampleContourDistance(profile, Number.NaN), /finite distance/i);
});

test('distance sampling can write directly into a renderer-owned buffer', async () => {
  const { createContourDistanceProfile, sampleContourDistance } = await loadTravelModule();
  const profile = createContourDistanceProfile([[0, 0, 0], [4, 0, 0]]);
  const target = new Float32Array(6);

  const returned = sampleContourDistance(profile, 3, { target, offset: 3 });

  assert.equal(returned, target);
  assert.deepEqual([...target], [0, 0, 0, 3, 0, 0]);
});
