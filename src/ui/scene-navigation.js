function freezeState(state) {
  return Object.freeze(state);
}

function assertSceneCount(sceneCount) {
  if (!Number.isInteger(sceneCount) || sceneCount < 1) {
    throw new TypeError('sceneCount must be a positive integer');
  }
}

export function createSceneNavigationState(sceneCount, initialIndex = 0) {
  assertSceneCount(sceneCount);
  if (!Number.isInteger(initialIndex) || initialIndex < 0 || initialIndex >= sceneCount) {
    throw new RangeError('initial scene index is out of bounds');
  }
  return freezeState({
    sceneCount,
    activeIndex: initialIndex,
    activationCount: 1,
    lastReason: 'initial',
    lastScrollY: null,
  });
}

function activate(state, activeIndex, lastReason, lastScrollY = state.lastScrollY) {
  if (activeIndex === state.activeIndex) {
    if (lastScrollY === state.lastScrollY) return state;
    return freezeState({ ...state, lastScrollY });
  }
  return freezeState({
    ...state,
    activeIndex,
    activationCount: state.activationCount + 1,
    lastReason,
    lastScrollY,
  });
}

export function moveScene(state, delta) {
  if (!Number.isInteger(delta) || Math.abs(delta) !== 1) {
    throw new TypeError('scene movement must be -1 or 1');
  }
  const target = Math.max(0, Math.min(state.sceneCount - 1, state.activeIndex + delta));
  return activate(state, target, delta > 0 ? 'explicit-next' : 'explicit-previous');
}

export function updateSceneFromScroll(state, {
  anchorTops,
  viewportHeight,
  scrollY,
  forwardThreshold = 0.55,
  backwardThreshold = 0.65,
}) {
  if (!Array.isArray(anchorTops) || anchorTops.length !== state.sceneCount) {
    throw new TypeError('anchorTops must contain one number per scene');
  }
  if (!(viewportHeight > 0) || !Number.isFinite(scrollY)) {
    throw new TypeError('viewportHeight and scrollY must be finite');
  }

  const direction = state.lastScrollY === null
    ? (scrollY > 0 ? 1 : 0)
    : Math.sign(scrollY - state.lastScrollY);
  let target = state.activeIndex;

  if (direction > 0) {
    const boundary = viewportHeight * forwardThreshold;
    while (target + 1 < state.sceneCount && anchorTops[target + 1] <= boundary) target++;
  } else if (direction < 0) {
    const boundary = viewportHeight * backwardThreshold;
    while (target > 0 && anchorTops[target] >= boundary) target--;
  }

  return activate(
    state,
    target,
    direction < 0 ? 'scroll-backward' : 'scroll-forward',
    scrollY,
  );
}
