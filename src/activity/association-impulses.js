const TAU = Math.PI * 2;

export const DEFAULT_ASSOCIATION_SEED = 1096043603;
export const ASSOCIATION_TRACT_ORDER = Object.freeze(['ilf', 'ifof', 'slf1', 'slf2', 'slf3', 'vof', 'af', 'mdlf']);
export const ASSOCIATION_HEMISPHERE_ORDER = Object.freeze(['L', 'R']);
export const DEFAULT_ASSOCIATION_MODEL = Object.freeze({
  channelsPerGroup: 12,
  minBase: 0.24,
  maxBase: 0.64,
  minAmplitude: 0.15,
  maxAmplitude: 0.55,
  minFrequency: 0.08,
  maxFrequency: 0.35,
  refractory: 0.05,
  recoveryTau: 0.2,
  minSpeed: 0.3,
  maxSpeed: 0.48,
});

export function associationModelFromManifest(manifest) {
  const model = manifest.model;
  return {
    channelsPerGroup: model.channelsPerGroup,
    minBase: model.baseEventsPerModelSecond[0],
    maxBase: model.baseEventsPerModelSecond[1],
    minAmplitude: model.privateModulationAmplitude[0],
    maxAmplitude: model.privateModulationAmplitude[1],
    minFrequency: model.privateModulationCyclesPerModelSecond[0],
    maxFrequency: model.privateModulationCyclesPerModelSecond[1],
    refractory: model.refractoryModelSeconds,
    recoveryTau: model.recoveryTauModelSeconds,
    minSpeed: model.contourUnitsPerModelSecond[0],
    maxSpeed: model.contourUnitsPerModelSecond[1],
  };
}

export function associationGroupsFromManifest(manifest) {
  const byId = new Map(manifest.tracts.map((tract) => [tract.id, tract]));
  return ASSOCIATION_TRACT_ORDER.flatMap((tractId) => {
    const tract = byId.get(tractId);
    if (!tract) throw new Error(`missing association activity metadata for ${tractId}`);
    return ASSOCIATION_HEMISPHERE_ORDER.map((hemi) => ({
      groupId: `${tractId}:${hemi}`,
      tractId,
      hemi,
      probabilityAToB: tract.probabilityAToB[hemi],
    }));
  });
}

export function channelEnvelope(channel) {
  return channel.base * (1 + channel.amplitude);
}

export function privateRate(channel, time) {
  return channel.base * (1 + channel.amplitude * Math.sin(TAU * channel.frequency * time + channel.phase));
}

export function refractoryRecovery(elapsed, { refractory = 0.05, recoveryTau = 0.2 } = {}) {
  if (elapsed <= refractory) return 0;
  return 1 - Math.exp(-(elapsed - refractory) / recoveryTau);
}

export function eventHazard(channel, time, options) {
  return privateRate(channel, time) * refractoryRecovery(time - channel.lastAccepted, options);
}

export function sampleAToB(random, probabilityAToB) {
  return random() < probabilityAToB;
}

const COORDINATE_INDEX = { x: 0, y: 1, z: 2 };
const TIE_COORDINATES = { y: ['z', 'x'], z: ['y', 'x'], x: ['y', 'z'] };

function coordinate(point, axis) {
  return Array.isArray(point) ? point[COORDINATE_INDEX[axis]] : point[axis];
}

export function rawStartIsEndpointA(contour, classifier, epsilon = 1e-6) {
  const start = contour[0];
  const end = contour[contour.length - 1];
  const primaryDifference = coordinate(start, classifier.coordinate) - coordinate(end, classifier.coordinate);
  if (Math.abs(primaryDifference) > epsilon) {
    return classifier.select === 'maximum' ? primaryDifference > 0 : primaryDifference < 0;
  }
  for (const axis of TIE_COORDINATES[classifier.coordinate]) {
    const difference = coordinate(start, axis) - coordinate(end, axis);
    if (Math.abs(difference) > epsilon) return difference < 0;
  }
  return true;
}

export function canonicalContourParameter(contour, classifier, aToB, progress) {
  const unitProgress = Math.max(0, Math.min(1, progress));
  return rawStartIsEndpointA(contour, classifier) === aToB ? unitProgress : 1 - unitProgress;
}

export function createSeededRandom(seed = DEFAULT_ASSOCIATION_SEED) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function between(random, minimum, maximum) {
  return minimum + random() * (maximum - minimum);
}

function exponentialInterval(random, rate) {
  return -Math.log(Math.max(Number.MIN_VALUE, random())) / rate;
}

function canonicalGroupRank(group) {
  const tractRank = ASSOCIATION_TRACT_ORDER.indexOf(group.tractId);
  const hemiRank = ASSOCIATION_HEMISPHERE_ORDER.indexOf(group.hemi);
  return tractRank * ASSOCIATION_HEMISPHERE_ORDER.length + hemiRank;
}

function chooseWeightedChannel(channels, totalEnvelope, random) {
  let threshold = random() * totalEnvelope;
  for (const channel of channels) {
    threshold -= channel.envelope;
    if (threshold <= 0) return channel;
  }
  return channels[channels.length - 1];
}

export function advanceAssociationTime(time, dt, { playing, speed = 1, reducedMotion = false }) {
  if (!playing || reducedMotion) return time;
  return time + Math.max(0, dt) * Math.max(0, speed);
}

function expireEvents(active, time) {
  return active.filter((event) => (time - event.time) * event.speed <= 1);
}

export function updateAssociationEventPool(active, events, currentTime, {
  maxActive = 520,
  contoursByGroup,
  isVisible = () => true,
}) {
  let nextActive = [...active];
  let hidden = 0;
  let dropped = 0;
  for (const event of events) {
    nextActive = expireEvents(nextActive, event.time);
    if (!isVisible(event.groupId)) {
      hidden++;
      continue;
    }
    if (nextActive.length >= maxActive) {
      dropped++;
      continue;
    }
    const contours = contoursByGroup[event.groupId];
    const contourIndex = Math.min(contours.length - 1, Math.floor(event.contourUnit * contours.length));
    nextActive.push({ ...event, contour: contours[contourIndex] });
  }
  return { active: expireEvents(nextActive, currentTime), hidden, dropped };
}

export function createAssociationImpulseEngine({
  groups,
  seed = DEFAULT_ASSOCIATION_SEED,
  random = createSeededRandom(seed),
  model = DEFAULT_ASSOCIATION_MODEL,
} = {}) {
  const orderedGroups = [...groups].sort((a, b) => canonicalGroupRank(a) - canonicalGroupRank(b));
  const channels = [];
  for (const group of orderedGroups) {
    for (let channelIndex = 0; channelIndex < model.channelsPerGroup; channelIndex++) {
      const channel = {
        ...group,
        channelIndex,
        base: between(random, model.minBase, model.maxBase),
        amplitude: between(random, model.minAmplitude, model.maxAmplitude),
        frequency: between(random, model.minFrequency, model.maxFrequency),
        phase: random() * TAU,
        lastAccepted: -Infinity,
      };
      channel.envelope = channelEnvelope(channel);
      channels.push(channel);
    }
  }

  const totalEnvelope = channels.reduce((sum, channel) => sum + channel.envelope, 0);
  let currentTime = 0;
  let nextCandidateTime = exponentialInterval(random, totalEnvelope);

  return {
    channels,
    get time() { return currentTime; },
    advanceTo(targetTime) {
      if (targetTime < currentTime) throw new RangeError('association impulse time cannot move backward');
      const events = [];
      while (nextCandidateTime <= targetTime) {
        const channel = chooseWeightedChannel(channels, totalEnvelope, random);
        const acceptance = eventHazard(channel, nextCandidateTime, model) / channel.envelope;
        if (random() < acceptance) {
          channel.lastAccepted = nextCandidateTime;
          events.push({
            time: nextCandidateTime,
            groupId: channel.groupId,
            channelIndex: channel.channelIndex,
            aToB: sampleAToB(random, channel.probabilityAToB),
            contourUnit: random(),
            speed: between(random, model.minSpeed, model.maxSpeed),
          });
        }
        nextCandidateTime += exponentialInterval(random, totalEnvelope);
      }
      currentTime = targetTime;
      return events;
    },
  };
}
