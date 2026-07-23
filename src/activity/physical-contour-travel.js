export const DIRECTED_TRAVEL_SPEED_MNI_MM_PER_DISPLAY_SECOND = 40;

function pointCoordinates(point) {
  return Array.isArray(point)
    ? point
    : [point?.x, point?.y, point?.z];
}

function requirePositiveFiniteSpeed(speedMmPerDisplaySecond) {
  if (!Number.isFinite(speedMmPerDisplaySecond) || speedMmPerDisplaySecond <= 0) {
    throw new RangeError('physical contour travel requires a positive finite speed');
  }
}

export function createContourDistanceProfile(points) {
  if (!Array.isArray(points) || points.length < 2) {
    throw new TypeError('a physical contour requires at least two points');
  }
  const copiedPoints = points.map((point) => {
    const coordinates = pointCoordinates(point).slice(0, 3);
    if (coordinates.length !== 3 || coordinates.some((value) => !Number.isFinite(value))) {
      throw new TypeError('physical contour coordinates must contain three finite values');
    }
    return coordinates;
  });
  const cumulativeMm = new Float64Array(copiedPoints.length);
  for (let index = 1; index < copiedPoints.length; index++) {
    const previous = copiedPoints[index - 1];
    const current = copiedPoints[index];
    cumulativeMm[index] = cumulativeMm[index - 1] + Math.hypot(
      current[0] - previous[0],
      current[1] - previous[1],
      current[2] - previous[2],
    );
  }
  const lengthMm = cumulativeMm[cumulativeMm.length - 1];
  if (!(lengthMm > 0)) throw new RangeError('a physical contour requires positive arc length');
  return Object.freeze({
    points: Object.freeze(copiedPoints.map((point) => Object.freeze(point))),
    cumulativeMm,
    lengthMm,
  });
}

export function distanceAfterDisplayTime(
  elapsedDisplaySeconds,
  speedMmPerDisplaySecond = DIRECTED_TRAVEL_SPEED_MNI_MM_PER_DISPLAY_SECOND,
) {
  requirePositiveFiniteSpeed(speedMmPerDisplaySecond);
  if (!Number.isFinite(elapsedDisplaySeconds)) throw new RangeError('display time must be finite');
  return Math.max(0, elapsedDisplaySeconds) * speedMmPerDisplaySecond;
}

export function contourTransitDuration(
  profile,
  speedMmPerDisplaySecond = DIRECTED_TRAVEL_SPEED_MNI_MM_PER_DISPLAY_SECOND,
) {
  requirePositiveFiniteSpeed(speedMmPerDisplaySecond);
  return profile.lengthMm / speedMmPerDisplaySecond;
}

export function sampleContourDistance(profile, distanceMm, {
  reverse = false,
  wrap = false,
  target = [0, 0, 0],
  offset = 0,
} = {}) {
  if (!Number.isFinite(distanceMm)) throw new RangeError('physical contour sampling requires a finite distance');
  const boundedDistance = wrap
    ? ((distanceMm % profile.lengthMm) + profile.lengthMm) % profile.lengthMm
    : Math.max(0, Math.min(profile.lengthMm, distanceMm));
  const distance = reverse ? profile.lengthMm - boundedDistance : boundedDistance;
  let low = 1;
  let high = profile.cumulativeMm.length - 1;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (profile.cumulativeMm[middle] < distance) low = middle + 1;
    else high = middle;
  }
  const segmentEnd = low;
  const segmentStart = segmentEnd - 1;
  const startDistance = profile.cumulativeMm[segmentStart];
  const segmentLength = profile.cumulativeMm[segmentEnd] - startDistance;
  const fraction = segmentLength > 0 ? (distance - startDistance) / segmentLength : 0;
  const start = profile.points[segmentStart];
  const end = profile.points[segmentEnd];
  target[offset] = start[0] + (end[0] - start[0]) * fraction;
  target[offset + 1] = start[1] + (end[1] - start[1]) * fraction;
  target[offset + 2] = start[2] + (end[2] - start[2]) * fraction;
  return target;
}
