import assert from 'node:assert/strict';
import test from 'node:test';

const surfaceModule = await import('../src/ui/scroll-surface.js').catch(() => ({}));
const {
  pageScrollKeyAction,
  relativeAnchorTops,
  targetScrollTop,
} = surfaceModule;

test('explicit scroll surface exposes its pure UI contract', () => { // Tests INV-15
  assert.equal(typeof relativeAnchorTops, 'function');
  assert.equal(typeof targetScrollTop, 'function');
  assert.equal(typeof pageScrollKeyAction, 'function');
});

test('scene anchors are measured relative to the scroll-surface viewport', () => { // Tests INV-15
  const anchors = [458, 1258, 2058];
  assert.deepEqual(relativeAnchorTops(anchors, 58), [400, 1200, 2000]);
  assert.deepEqual(anchors, [458, 1258, 2058]);
  assert.throws(() => relativeAnchorTops([100, Number.NaN], 58), /finite/);
});

test('explicit navigation computes and clamps the surface scroll destination', () => { // Tests INV-15
  assert.equal(targetScrollTop({
    scrollTop: 100,
    targetTop: 600,
    clearanceTop: 454,
    maxScrollTop: 3000,
  }), 246);
  assert.equal(targetScrollTop({
    scrollTop: 10,
    targetTop: 20,
    clearanceTop: 100,
    maxScrollTop: 3000,
  }), 0);
  assert.equal(targetScrollTop({
    scrollTop: 2900,
    targetTop: 900,
    clearanceTop: 400,
    maxScrollTop: 3000,
  }), 3000);
  assert.throws(() => targetScrollTop({
    scrollTop: 0,
    targetTop: 0,
    clearanceTop: 0,
    maxScrollTop: -1,
  }), /maxScrollTop/);
});

test('shell keyboard commands preserve standard page-scrolling intent', () => { // Tests INV-16
  const action = (overrides) => pageScrollKeyAction({
    key: '',
    code: '',
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    targetHasScrollContext: false,
    targetKind: 'page',
    blocked: false,
    ...overrides,
  });

  assert.equal(action({ key: 'PageDown' }), 'page-forward');
  assert.equal(action({ key: 'PageUp' }), 'page-backward');
  assert.equal(action({ key: 'Home' }), 'start');
  assert.equal(action({ key: 'End' }), 'end');
  assert.equal(action({ key: ' ', code: 'Space' }), 'page-forward');
  assert.equal(action({ key: ' ', code: 'Space', shiftKey: true }), 'page-backward');
});

test('keyboard bridge yields to native scroll contexts, controls, modifiers, and modals', () => { // Tests FAIL-15
  const action = (overrides) => pageScrollKeyAction({
    key: 'PageDown',
    code: '',
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    targetHasScrollContext: false,
    targetKind: 'page',
    blocked: false,
    ...overrides,
  });

  assert.equal(action({ targetHasScrollContext: true }), null);
  assert.equal(action({ targetKind: 'interactive' }), null);
  assert.equal(action({ targetKind: 'editable' }), null);
  assert.equal(action({ metaKey: true }), null);
  assert.equal(action({ ctrlKey: true }), null);
  assert.equal(action({ altKey: true }), null);
  assert.equal(action({ blocked: true }), null);
  assert.equal(action({ key: 'ArrowDown' }), null);
  assert.equal(action({ key: ' ', code: 'Space', targetKind: 'interactive' }), null);
});
