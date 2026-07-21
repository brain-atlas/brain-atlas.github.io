export function createFrameDeltaReader(timer, { maxDelta = 0.05 } = {}) {
  let primed = false;
  return (timestamp) => {
    timer.update(timestamp);
    if (!primed) {
      primed = true;
      return 0;
    }
    return Math.max(0, Math.min(maxDelta, timer.getDelta()));
  };
}
