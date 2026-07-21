function vector3(value, name) {
  if (!Array.isArray(value) || value.length !== 3 || value.some((part) => !Number.isFinite(part))) {
    throw new TypeError(`${name} must contain three finite numbers`);
  }
  return Object.freeze([...value]);
}

function cameraPose(value, name) {
  return Object.freeze({
    position: vector3(value?.position, `${name}.position`),
    target: vector3(value?.target, `${name}.target`),
  });
}

export function createCameraTransition({
  from,
  to,
  startTime,
  durationMs,
  reducedMotion = false,
  path = 'linear',
}) {
  if (!Number.isFinite(startTime) || !Number.isFinite(durationMs) || durationMs < 0) {
    throw new TypeError('camera transition timing must be finite and non-negative');
  }
  if (!['linear', 'orbit'].includes(path)) throw new TypeError('camera transition path must be linear or orbit');
  return Object.freeze({
    from: cameraPose(from, 'from'),
    to: cameraPose(to, 'to'),
    startTime,
    durationMs: reducedMotion ? 0 : durationMs,
    path,
  });
}

function interpolate(from, to, progress) {
  return from.map((value, index) => value + (to[index] - value) * progress);
}

export function easeCameraProgress(progress) {
  const t = Math.max(0, Math.min(1, progress));
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function subtract(a, b) {
  return a.map((value, index) => value - b[index]);
}

function addScaled(origin, direction, scale) {
  return origin.map((value, index) => value + direction[index] * scale);
}

function normalize(vector) {
  const length = Math.hypot(...vector);
  if (length === 0) throw new RangeError('camera position and target must differ');
  return vector.map((value) => value / length);
}

function sphericalDirection(from, to, progress) {
  const dot = Math.max(-1, Math.min(1, from.reduce((sum, value, index) => sum + value * to[index], 0)));
  if (dot > 0.9995) return normalize(interpolate(from, to, progress));
  if (dot < -0.9995) {
    const reference = Math.abs(from[0]) < 0.8 ? [1, 0, 0] : [0, 1, 0];
    const orthogonal = normalize([
      from[1] * reference[2] - from[2] * reference[1],
      from[2] * reference[0] - from[0] * reference[2],
      from[0] * reference[1] - from[1] * reference[0],
    ]);
    return from.map((value, index) =>
      value * Math.cos(Math.PI * progress) + orthogonal[index] * Math.sin(Math.PI * progress));
  }
  const angle = Math.acos(dot);
  const denominator = Math.sin(angle);
  const fromWeight = Math.sin((1 - progress) * angle) / denominator;
  const toWeight = Math.sin(progress * angle) / denominator;
  return from.map((value, index) => value * fromWeight + to[index] * toWeight);
}

function orbitPosition(transition, target, progress) {
  if (progress === 0) return [...transition.from.position];
  if (progress === 1) return [...transition.to.position];
  const fromOffset = subtract(transition.from.position, transition.from.target);
  const toOffset = subtract(transition.to.position, transition.to.target);
  const fromRadius = Math.hypot(...fromOffset);
  const toRadius = Math.hypot(...toOffset);
  const direction = sphericalDirection(normalize(fromOffset), normalize(toOffset), progress);
  const radius = fromRadius + (toRadius - fromRadius) * progress;
  return addScaled(target, direction, radius);
}

export function sampleCameraTransition(transition, time) {
  const linear = transition.durationMs === 0
    ? 1
    : Math.max(0, Math.min(1, (time - transition.startTime) / transition.durationMs));
  const eased = easeCameraProgress(linear);
  const target = interpolate(transition.from.target, transition.to.target, eased);
  return {
    position: transition.path === 'orbit'
      ? orbitPosition(transition, target, eased)
      : interpolate(transition.from.position, transition.to.position, eased),
    target,
    progress: linear,
    done: linear >= 1,
  };
}
