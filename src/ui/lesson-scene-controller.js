function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function settledSnapshot(snapshot, { instantCamera = false } = {}) {
  return freezeDeep({
    ...snapshot,
    camera: instantCamera
      ? { ...snapshot.camera, transition: { kind: 'instant', durationMs: 0 } }
      : snapshot.camera,
    playback: { ...snapshot.playback, playing: false, settled: true },
  });
}

function validateScenes(scenes) {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    throw new TypeError('lesson scene controller requires at least one scene');
  }
  for (const scene of scenes) {
    if (!scene?.id || !scene.snapshot) throw new TypeError('every lesson scene requires an id and snapshot');
  }
}

export function createLessonSceneController({
  scenes,
  adapter,
  reducedMotion = false,
  onChange = () => {},
}) {
  validateScenes(scenes);
  if (typeof adapter?.apply !== 'function') throw new TypeError('lesson scene controller requires a renderer adapter');

  let state = freezeDeep({
    status: 'loading',
    activeIndex: 0,
    activeSceneId: scenes[0].id,
    activationCount: 1,
    replayCount: 0,
    lastReason: 'initial',
    reducedMotion: Boolean(reducedMotion),
    manualSettled: false,
    error: null,
  });

  function setState(patch) {
    state = freezeDeep({ ...state, ...patch });
    onChange(state);
    return state;
  }

  function effectiveSnapshot() {
    const snapshot = scenes[state.activeIndex].snapshot;
    if (state.reducedMotion) return settledSnapshot(snapshot, { instantCamera: true });
    if (state.manualSettled) return settledSnapshot(snapshot);
    return snapshot;
  }

  function applyCurrent() {
    try {
      return adapter.apply(effectiveSnapshot());
    } catch (error) {
      setState({ status: 'error', error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  }

  const controller = {
    get state() { return state; },
    get activeScene() { return scenes[state.activeIndex]; },
    setReady() {
      if (state.status === 'ready') return state;
      setState({ status: 'ready', error: null });
      applyCurrent();
      return state;
    },
    activate(index, { reason = 'navigation', force = false } = {}) {
      if (!Number.isInteger(index) || index < 0 || index >= scenes.length) {
        throw new RangeError('lesson scene index is out of bounds');
      }
      if (index === state.activeIndex && !force) return state;
      setState({
        activeIndex: index,
        activeSceneId: scenes[index].id,
        activationCount: state.activationCount + 1,
        lastReason: reason,
        manualSettled: false,
        error: null,
      });
      if (state.status === 'ready') applyCurrent();
      return state;
    },
    restart() {
      if (state.reducedMotion || state.status !== 'ready') return state;
      adapter.apply(settledSnapshot(scenes[state.activeIndex].snapshot));
      setState({
        replayCount: state.replayCount + 1,
        lastReason: 'restart',
        manualSettled: false,
      });
      applyCurrent();
      return state;
    },
    skip() {
      if (state.status !== 'ready' || state.manualSettled) return state;
      setState({ lastReason: 'skip', manualSettled: true });
      applyCurrent();
      return state;
    },
    setReducedMotion(value) {
      const next = Boolean(value);
      if (next === state.reducedMotion) return state;
      setState({ reducedMotion: next, lastReason: 'motion-preference' });
      if (state.status === 'ready') applyCurrent();
      return state;
    },
  };

  return Object.freeze(controller);
}
