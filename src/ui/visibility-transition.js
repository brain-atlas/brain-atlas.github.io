function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smootherstep(value) {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function normalizedOpacities(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('fromOpacities must be a plain object');
  }
  return Object.fromEntries(Object.entries(input).map(([id, value]) => {
    if (typeof id !== 'string' || !id || !Number.isFinite(value)) {
      throw new TypeError('visibility opacities require non-empty IDs and finite values');
    }
    return [id, clamp01(value)];
  }));
}

export function createVisibilityTransition({ fromOpacities, toIds, startTime, durationMs }) {
  const from = normalizedOpacities(fromOpacities);
  if (!Array.isArray(toIds) || toIds.some((id) => typeof id !== 'string' || !id)) {
    throw new TypeError('toIds must be an array of non-empty strings');
  }
  if (!Number.isFinite(startTime) || !Number.isFinite(durationMs) || durationMs < 0) {
    throw new TypeError('visibility transition timing must be finite and duration must be non-negative');
  }
  const destination = [...new Set(toIds)].sort();
  const ids = [...new Set([...Object.keys(from), ...destination])].sort();
  return Object.freeze({
    from: Object.freeze(Object.fromEntries(ids.map((id) => [id, from[id] ?? 0]))),
    destination: Object.freeze(destination),
    ids: Object.freeze(ids),
    startTime,
    durationMs,
  });
}

export function sampleVisibilityTransition(transition, time) {
  if (!Number.isFinite(time)) throw new TypeError('sample time must be finite');
  const progress = transition.durationMs === 0
    ? 1
    : clamp01((time - transition.startTime) / transition.durationMs);
  const blend = transition.durationMs === 0 ? 1 : smootherstep(progress * 2);
  const destination = new Set(transition.destination);
  const opacities = Object.freeze(Object.fromEntries(transition.ids.map((id) => {
    const from = transition.from[id];
    const target = destination.has(id) ? 1 : 0;
    return [id, from + (target - from) * blend];
  })));
  const visibleIds = progress < 0.5
    ? transition.ids.filter((id) => transition.from[id] > 0 || destination.has(id))
    : transition.destination;
  return Object.freeze({
    visibleIds: Object.freeze([...visibleIds]),
    opacities,
    progress,
    done: progress >= 0.5,
  });
}
