import assert from 'node:assert/strict';
import test from 'node:test';

async function loadImpulseModule() {
  try {
    return await import('../src/activity/association-impulses.js');
  } catch (error) {
    assert.fail(`association impulse module is unavailable: ${error.message}`);
  }
}

test('seeded random sequences are reproducible', async () => {
  const { createSeededRandom, DEFAULT_ASSOCIATION_SEED } = await loadImpulseModule();
  const first = createSeededRandom(DEFAULT_ASSOCIATION_SEED);
  const second = createSeededRandom(DEFAULT_ASSOCIATION_SEED);

  assert.deepEqual(
    Array.from({ length: 8 }, () => first()),
    Array.from({ length: 8 }, () => second()),
  );
});

test('refractory recovery inhibits close events and keeps hazard under its envelope', async () => {
  const { channelEnvelope, eventHazard, refractoryRecovery } = await loadImpulseModule();
  const channel = { base: 0.5, amplitude: 0.5, frequency: 0.25, phase: 0, lastAccepted: 0 };
  const options = { refractory: 0.05, recoveryTau: 0.2 };

  assert.equal(refractoryRecovery(0.049, options), 0);
  assert.equal(refractoryRecovery(0.05, options), 0);
  assert.ok(Math.abs(refractoryRecovery(0.25, options) - (1 - Math.exp(-1))) < 1e-12);
  assert.equal(eventHazard(channel, 0.049, options), 0);
  assert.ok(eventHazard(channel, 1, options) <= channelEnvelope(channel));
});

test('direction sampling obeys zero, one, and symmetric probabilities', async () => {
  const { sampleAToB } = await loadImpulseModule();
  const draws = [0, 0.49, 0.5, 0.99, 0.25];
  const random = () => draws.shift();

  assert.equal(sampleAToB(random, 0), false);
  assert.equal(sampleAToB(random, 1), true);
  assert.equal(sampleAToB(random, 0.5), false);
  assert.equal(sampleAToB(random, 0.5), false);
  assert.equal(sampleAToB(random, 0.5), true);
});

test('canonical travel uses only contour endpoints and survives reversed non-monotonic contours', async () => {
  const { canonicalContourParameter, rawStartIsEndpointA } = await loadImpulseModule();
  const classifier = { coordinate: 'y', select: 'minimum' };
  const contour = [[0, -10, 0], [0, -44, 0], [0, 12, 0]];
  const reversed = contour.toReversed();

  assert.equal(rawStartIsEndpointA(contour, classifier), true);
  assert.equal(rawStartIsEndpointA(reversed, classifier), false);
  assert.equal(canonicalContourParameter(contour, classifier, true, 0.25), 0.25);
  assert.equal(canonicalContourParameter(reversed, classifier, true, 0.25), 0.75);
});

test('endpoint coordinate ties use a reversal-invariant fixed-coordinate fallback', async () => {
  const { rawStartIsEndpointA } = await loadImpulseModule();
  const classifier = { coordinate: 'y', select: 'minimum' };
  const contour = [[3, 5, -2], [0, -20, 0], [-4, 5, 2]];

  assert.equal(rawStartIsEndpointA(contour, classifier), true);
  assert.equal(rawStartIsEndpointA(contour.toReversed(), classifier), false);
});

test('logical event sequences ignore input order and frame partitioning', async () => {
  const { ASSOCIATION_HEMISPHERE_ORDER, ASSOCIATION_TRACT_ORDER, createAssociationImpulseEngine } = await loadImpulseModule();
  const groups = ASSOCIATION_TRACT_ORDER.flatMap((tractId) =>
    ASSOCIATION_HEMISPHERE_ORDER.map((hemi) => ({ groupId: `${tractId}:${hemi}`, tractId, hemi, probabilityAToB: 0.5 })),
  );
  const whole = createAssociationImpulseEngine({ groups: groups.toReversed() });
  const partitioned = createAssociationImpulseEngine({ groups });

  const wholeEvents = whole.advanceTo(12);
  const partitionedEvents = [
    ...partitioned.advanceTo(0.25),
    ...partitioned.advanceTo(3),
    ...partitioned.advanceTo(7.75),
    ...partitioned.advanceTo(12),
  ];

  assert.deepEqual(partitioned.channels.map(({ groupId }) => groupId), whole.channels.map(({ groupId }) => groupId));
  assert.deepEqual(partitionedEvents, wholeEvents);
});

test('association model time freezes while paused or reduced motion is active', async () => {
  const { advanceAssociationTime } = await loadImpulseModule();

  assert.equal(advanceAssociationTime(2, 0.5, { playing: true, speed: 1.5 }), 2.75);
  assert.equal(advanceAssociationTime(2, 0.5, { playing: false, speed: 1.5 }), 2);
  assert.equal(advanceAssociationTime(2, 0.5, { playing: true, speed: 1.5, reducedMotion: true }), 2);
});

test('render pool drops hidden and over-cap events without frame-partition drift', async () => {
  const { updateAssociationEventPool } = await loadImpulseModule();
  const contoursByGroup = {
    'ilf:L': [[[0, -10, 0], [0, 10, 0]]],
    'ilf:R': [[[1, -10, 0], [1, 10, 0]]],
  };
  const events = [
    { time: 0, groupId: 'ilf:L', aToB: true, contourUnit: 0.25, speed: 1 },
    { time: 0.1, groupId: 'ilf:R', aToB: false, contourUnit: 0.75, speed: 1 },
    { time: 0.2, groupId: 'ilf:L', aToB: false, contourUnit: 0.5, speed: 1 },
    { time: 1.01, groupId: 'ilf:L', aToB: false, contourUnit: 0.5, speed: 1 },
  ];
  const options = {
    maxActive: 1,
    contoursByGroup,
    isVisible: (groupId) => groupId !== 'ilf:R',
  };

  const whole = updateAssociationEventPool([], events, 2, options);
  const first = updateAssociationEventPool([], events.slice(0, 3), 0.5, options);
  const partitioned = updateAssociationEventPool(first.active, events.slice(3), 2, options);

  assert.equal(first.hidden, 1);
  assert.equal(first.dropped, 1);
  assert.deepEqual(partitioned.active, whole.active);
  assert.equal(whole.active.length, 1);
  assert.equal(whole.active[0].time, 1.01);
});

test('default seeded run covers both directions in every group and enforces channel refractory time', async () => {
  const { ASSOCIATION_HEMISPHERE_ORDER, ASSOCIATION_TRACT_ORDER, createAssociationImpulseEngine } = await loadImpulseModule();
  const groups = ASSOCIATION_TRACT_ORDER.flatMap((tractId) =>
    ASSOCIATION_HEMISPHERE_ORDER.map((hemi) => ({ groupId: `${tractId}:${hemi}`, tractId, hemi, probabilityAToB: 0.5 })),
  );
  const engine = createAssociationImpulseEngine({ groups });
  const events = engine.advanceTo(12);
  const directionSets = new Map(groups.map(({ groupId }) => [groupId, new Set()]));
  const previousByChannel = new Map();

  for (const event of events) {
    assert.equal(Number.isInteger(event.channelIndex), true);
    directionSets.get(event.groupId).add(event.aToB);
    const channelKey = `${event.groupId}:${event.channelIndex}`;
    if (previousByChannel.has(channelKey)) {
      assert.ok(event.time - previousByChannel.get(channelKey) > 0.05);
    }
    previousByChannel.set(channelKey, event.time);
  }

  assert.ok([...directionSets.values()].every((directions) => directions.size === 2));
  for (const { groupId } of groups) {
    assert.equal(engine.channels.filter((channel) => channel.groupId === groupId).length, 12);
  }
});
