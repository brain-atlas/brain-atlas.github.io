import assert from 'node:assert/strict';
import test from 'node:test';

import { createContourDistanceProfile } from '../src/activity/physical-contour-travel.js';

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

test('canonical physical distance preserves endpoint direction when contour storage reverses', async () => {
  const { canonicalContourDistance } = await loadImpulseModule();
  const { sampleContourDistance } = await import('../src/activity/physical-contour-travel.js');
  const classifier = { coordinate: 'y', select: 'minimum' };
  const points = [[0, -10, 0], [0, -44, 0], [0, 12, 0]];
  const forward = createContourDistanceProfile(points);
  const reversed = createContourDistanceProfile(points.toReversed());

  const forwardPosition = sampleContourDistance(
    forward,
    canonicalContourDistance(forward, classifier, true, 20),
  );
  const reversedPosition = sampleContourDistance(
    reversed,
    canonicalContourDistance(reversed, classifier, true, 20),
  );

  assert.deepEqual(forwardPosition, [0, -30, 0]);
  assert.deepEqual(reversedPosition, forwardPosition);
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

test('fixed physical speed preserves the seeded random-call order', async () => {
  const {
    ASSOCIATION_HEMISPHERE_ORDER,
    ASSOCIATION_TRACT_ORDER,
    createAssociationImpulseEngine,
    DEFAULT_ASSOCIATION_MODEL,
  } = await loadImpulseModule();
  const groups = ASSOCIATION_TRACT_ORDER.flatMap((tractId) =>
    ASSOCIATION_HEMISPHERE_ORDER.map((hemi) => ({ groupId: `${tractId}:${hemi}`, tractId, hemi, probabilityAToB: 0.5 })),
  );
  const fixed = createAssociationImpulseEngine({ groups });
  const ranged = createAssociationImpulseEngine({
    groups,
    model: {
      ...DEFAULT_ASSOCIATION_MODEL,
      minSpeedMmPerDisplaySecond: 30,
      maxSpeedMmPerDisplaySecond: 50,
    },
  });
  const withoutSpeed = ({ speedMmPerDisplaySecond: _speed, ...event }) => event;

  assert.deepEqual(
    fixed.advanceTo(12).map(withoutSpeed),
    ranged.advanceTo(12).map(withoutSpeed),
  );
});

test('association model time freezes while paused or reduced motion is active', async () => {
  const { advanceAssociationTime } = await loadImpulseModule();

  assert.equal(advanceAssociationTime(2, 0.5, { playing: true, speed: 1.5 }), 2.75);
  assert.equal(advanceAssociationTime(2, 0.5, { playing: false, speed: 1.5 }), 2);
  assert.equal(advanceAssociationTime(2, 0.5, { playing: true, speed: 1.5, reducedMotion: true }), 2);
});

test('physical-distance pool expiry gives short contours lower latency at equal velocity', async () => {
  const { updateAssociationEventPool } = await loadImpulseModule();
  const contoursByGroup = {
    short: [createContourDistanceProfile([[0, 0, 0], [10, 0, 0]])],
    long: [createContourDistanceProfile([[0, 0, 0], [20, 0, 0]])],
  };
  const events = [
    { time: 0, groupId: 'short', aToB: true, contourUnit: 0.25, speedMmPerDisplaySecond: 10 },
    { time: 0, groupId: 'long', aToB: true, contourUnit: 0.75, speedMmPerDisplaySecond: 10 },
  ];
  const options = { maxActive: 2, contoursByGroup };

  const started = updateAssociationEventPool([], events, 0.5, options);
  const afterShortTransit = updateAssociationEventPool(started.active, [], 1.01, options);
  const afterLongTransit = updateAssociationEventPool(afterShortTransit.active, [], 2.01, options);

  assert.equal(started.active.length, 2);
  assert.deepEqual(afterShortTransit.active.map(({ groupId }) => groupId), ['long']);
  assert.equal(afterLongTransit.active.length, 0);
});

test('render pool drops hidden and over-cap events without frame-partition drift', async () => {
  const { updateAssociationEventPool } = await loadImpulseModule();
  const contoursByGroup = {
    'ilf:L': [createContourDistanceProfile([[0, -10, 0], [0, 10, 0]])],
    'ilf:R': [createContourDistanceProfile([[1, -10, 0], [1, 10, 0]])],
  };
  const events = [
    { time: 0, groupId: 'ilf:L', aToB: true, contourUnit: 0.25, speedMmPerDisplaySecond: 20 },
    { time: 0.1, groupId: 'ilf:R', aToB: false, contourUnit: 0.75, speedMmPerDisplaySecond: 20 },
    { time: 0.2, groupId: 'ilf:L', aToB: false, contourUnit: 0.5, speedMmPerDisplaySecond: 20 },
    { time: 1.01, groupId: 'ilf:L', aToB: false, contourUnit: 0.5, speedMmPerDisplaySecond: 20 },
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
    assert.equal(event.speedMmPerDisplaySecond, 40);
    assert.equal('speed' in event, false);
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
