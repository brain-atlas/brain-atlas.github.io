function assertFinite(value, name) {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

export function relativeAnchorTops(anchorTops, surfaceTop) {
  if (!Array.isArray(anchorTops)) throw new TypeError('anchorTops must be an array');
  assertFinite(surfaceTop, 'surfaceTop');
  for (const top of anchorTops) assertFinite(top, 'anchor top');
  return anchorTops.map((top) => top - surfaceTop);
}

export function targetScrollTop({
  scrollTop,
  targetTop,
  clearanceTop,
  maxScrollTop = Number.POSITIVE_INFINITY,
}) {
  assertFinite(scrollTop, 'scrollTop');
  assertFinite(targetTop, 'targetTop');
  assertFinite(clearanceTop, 'clearanceTop');
  if (!(maxScrollTop >= 0) || Number.isNaN(maxScrollTop)) {
    throw new RangeError('maxScrollTop must be nonnegative');
  }
  return Math.min(maxScrollTop, Math.max(0, scrollTop + targetTop - clearanceTop));
}

export function pageScrollKeyAction({
  key,
  code,
  shiftKey = false,
  altKey = false,
  ctrlKey = false,
  metaKey = false,
  targetHasScrollContext = false,
  targetKind = 'page',
  blocked = false,
}) {
  if (
    blocked
    || targetHasScrollContext
    || targetKind !== 'page'
    || altKey
    || ctrlKey
    || metaKey
  ) return null;

  if (key === 'PageDown') return 'page-forward';
  if (key === 'PageUp') return 'page-backward';
  if (key === 'Home') return 'start';
  if (key === 'End') return 'end';
  if (key === ' ' || code === 'Space') return shiftKey ? 'page-backward' : 'page-forward';
  return null;
}
