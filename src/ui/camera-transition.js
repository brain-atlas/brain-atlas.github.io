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
}) {
  if (!Number.isFinite(startTime) || !Number.isFinite(durationMs) || durationMs < 0) {
    throw new TypeError('camera transition timing must be finite and non-negative');
  }
  return Object.freeze({
    from: cameraPose(from, 'from'),
    to: cameraPose(to, 'to'),
    startTime,
    durationMs: reducedMotion ? 0 : durationMs,
  });
}

function interpolate(from, to, progress) {
  return from.map((value, index) => value + (to[index] - value) * progress);
}

export function sampleCameraTransition(transition, time) {
  const linear = transition.durationMs === 0
    ? 1
    : Math.max(0, Math.min(1, (time - transition.startTime) / transition.durationMs));
  const eased = linear * linear * (3 - 2 * linear);
  return {
    position: interpolate(transition.from.position, transition.to.position, eased),
    target: interpolate(transition.from.target, transition.to.target, eased),
    progress: linear,
    done: linear >= 1,
  };
}
