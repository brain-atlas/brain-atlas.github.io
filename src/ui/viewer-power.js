const INPUT_KEYS = new Set([
  'documentVisible',
  'stageVisible',
  'requestedPlaying',
  'settled',
  'reducedMotion',
]);

function requireBoolean(value, name) {
  if (typeof value !== 'boolean') throw new TypeError(`${name} must be boolean`);
  return value;
}

export function deriveViewerPowerState(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('viewer power input must be a plain object');
  }
  for (const key of Object.keys(input)) {
    if (!INPUT_KEYS.has(key)) throw new TypeError(`unknown viewer power input: ${key}`);
  }
  const documentVisible = requireBoolean(input.documentVisible, 'documentVisible');
  const stageVisible = requireBoolean(input.stageVisible, 'stageVisible');
  const requestedPlaying = requireBoolean(input.requestedPlaying, 'requestedPlaying');
  const settled = requireBoolean(input.settled, 'settled');
  const reducedMotion = requireBoolean(input.reducedMotion, 'reducedMotion');
  const suspended = !documentVisible || !stageVisible;
  const reason = !documentVisible ? 'document-hidden' : (!stageVisible ? 'stage-offscreen' : null);
  const resumeEligible = requestedPlaying && !settled && !reducedMotion;

  return Object.freeze({
    documentVisible,
    stageVisible,
    requestedPlaying,
    settled,
    reducedMotion,
    suspended,
    reason,
    resumeEligible,
    activityActive: !suspended && resumeEligible,
  });
}

export function rectIntersectsViewport(rect, viewport) {
  if (!rect || !viewport || !Number.isFinite(viewport.width) || !Number.isFinite(viewport.height)) {
    throw new TypeError('rect and viewport dimensions must be finite');
  }
  return rect.width > 0
    && rect.height > 0
    && rect.right > 0
    && rect.bottom > 0
    && rect.left < viewport.width
    && rect.top < viewport.height;
}

export function latestStageIntersection(entries, stage) {
  if (!Array.isArray(entries)) throw new TypeError('intersection entries must be an array');
  const matching = entries.filter(({ target }) => target === stage);
  if (!matching.length) throw new RangeError('intersection entries do not include the stage');
  return Boolean(matching[matching.length - 1].isIntersecting);
}

export function needsContinuousViewerFrames({
  powerState,
  cameraTransitioning = false,
  visibilityTransitioning = false,
  autoRotate = false,
  controlsChanged = false,
}) {
  if (!powerState || typeof powerState.suspended !== 'boolean') {
    throw new TypeError('powerState must be derived viewer power state');
  }
  if (powerState.suspended) return false;
  return powerState.activityActive
    || cameraTransitioning
    || visibilityTransitioning
    || autoRotate
    || controlsChanged;
}
