const TAU = Math.PI * 2;

export function structuralVibrationAmplitude(localMeanLength, ownLength) {
  return Math.max(0.08, Math.min(0.45, 0.5 * localMeanLength / ownLength));
}

export function createSwmVibration({
  ownLength,
  localMeanLength,
  random = Math.random,
  endpointMargin = 0.03,
}) {
  const amplitude = structuralVibrationAmplitude(localMeanLength, ownLength);
  const minimumHome = endpointMargin + amplitude;
  const maximumHome = 1 - endpointMargin - amplitude;
  return {
    home: minimumHome + random() * (maximumHome - minimumHome),
    amplitude,
    frequency: 0.35 + random() * 0.7,
    phase: random() * TAU,
  };
}

export function vibrationContourParameter(dot, time, { settled = false } = {}) {
  if (settled) return dot.home;
  return dot.home + dot.amplitude * Math.sin(TAU * dot.frequency * time + dot.phase);
}
