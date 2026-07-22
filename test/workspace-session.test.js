import assert from 'node:assert/strict';
import test from 'node:test';

import { normalizeSceneSnapshot } from '../src/lesson/scene-state.js';

const moduleUnderTest = await import('../src/ui/workspace-session.js').catch(() => ({}));
const {
  captureAtlasSnapshot,
  createCheckedLessonEntry,
  createHistoryIntent,
  createLessonResumeToken,
  createSceneInspectionSnapshot,
  parseWorkspaceLocation,
  workspaceUrl,
} = moduleUnderTest;

const CATALOG = {
  entityIds: ['layer.cortex', 'layer.labels', 'pathway.anterior', 'region.lgn'],
  visualIds: ['atlas', 'diagram.one'],
  fidelityIds: ['fidelity.anterior', 'fidelity.cortex', 'fidelity.regions'],
  cameraPresets: {
    home: { position: [210, 75, -195], target: [0, 0, 0] },
  },
  entitiesById: {
    'layer.cortex': {
      id: 'layer.cortex', hemisphereMode: 'none', fidelity: 'fidelity.cortex',
      renderer: { kind: 'layer', id: 'brain' },
    },
    'layer.labels': {
      id: 'layer.labels', hemisphereMode: 'none', fidelity: 'fidelity.cortex',
      renderer: { kind: 'layer', id: 'labels' },
    },
    'pathway.anterior': {
      id: 'pathway.anterior', hemisphereMode: 'none', fidelity: 'fidelity.anterior',
      renderer: { kind: 'layer', id: 'anterior' },
    },
    'region.lgn': {
      id: 'region.lgn', hemisphereMode: 'bilateral', fidelity: 'fidelity.regions',
      renderer: { kind: 'region', id: 'lgn' },
    },
  },
};

function lessonSnapshot() {
  return normalizeSceneSnapshot({
    id: 'relay',
    visual: 'diagram.one',
    camera: {
      position: [100, 30, -90],
      target: [0, -5, 20],
      transition: { kind: 'ease', durationMs: 900 },
    },
    show: ['pathway.anterior', 'region.lgn'],
    hemispheres: { entities: { 'region.lgn': { L: true, R: false } } },
    cutaway: 22,
    tissueOpacity: 0.31,
    playback: { playing: true, speed: 55, settled: false },
    selection: { selected: 'region.lgn', emphasized: ['region.lgn'], strength: 0.8 },
    controls: { mode: 'look' },
    layout: 'split',
  }, CATALOG);
}

const RENDERED_CAMERA = Object.freeze({
  position: [88, 12, -77],
  target: [2, -3, 18],
});

test('workspace routes default to Atlas and checked lessons use static-safe query URLs', () => { // Tests INV-25
  assert.equal(typeof parseWorkspaceLocation, 'function');
  assert.equal(typeof workspaceUrl, 'function');

  assert.deepEqual(parseWorkspaceLocation({
    search: '', historyState: null, checkedIds: ['retina-to-v1'], availableSessionKeys: [],
  }), { mode: 'atlas', recovery: null });
  assert.deepEqual(parseWorkspaceLocation({
    search: '?no-webgl=1&lesson=retina-to-v1',
    historyState: null,
    checkedIds: ['retina-to-v1'],
    availableSessionKeys: [],
  }), {
    mode: 'lesson', sourceKind: 'reference', checkedLessonId: 'retina-to-v1', recovery: null,
  });
  assert.equal(
    workspaceUrl({
      currentUrl: 'https://atlas.example/app/?no-webgl=1&lesson=old',
      checkedLessonId: 'retina-to-v1',
    }),
    '/app/?no-webgl=1&lesson=retina-to-v1',
  );
  assert.equal(
    workspaceUrl({
      currentUrl: 'https://atlas.example/app/?lesson=retina-to-v1&no-webgl=1',
    }),
    '/app/?no-webgl=1',
  );
});

test('session-only local and inspect history requires an available opaque key', () => { // Tests FAIL-26
  const local = createHistoryIntent({ mode: 'lesson', sessionKey: 'local-7', serial: 4 });
  const inspect = createHistoryIntent({ mode: 'inspect', sessionKey: 'inspect-8', serial: 5 });

  assert.deepEqual(parseWorkspaceLocation({
    search: '', historyState: local, checkedIds: ['retina-to-v1'], availableSessionKeys: ['local-7'],
  }), { mode: 'lesson', sourceKind: 'local', sessionKey: 'local-7', recovery: null });
  assert.deepEqual(parseWorkspaceLocation({
    search: '', historyState: inspect, checkedIds: ['retina-to-v1'], availableSessionKeys: ['inspect-8'],
  }), { mode: 'inspect', sessionKey: 'inspect-8', recovery: null });
  assert.deepEqual(parseWorkspaceLocation({
    search: '?lesson=retina-to-v1',
    historyState: inspect,
    checkedIds: ['retina-to-v1'],
    availableSessionKeys: [],
  }), { mode: 'atlas', recovery: 'session-unavailable' });
  assert.deepEqual(parseWorkspaceLocation({
    search: '?lesson=local', historyState: null, checkedIds: ['retina-to-v1'], availableSessionKeys: [],
  }), { mode: 'atlas', recovery: 'session-unavailable' });
  assert.deepEqual(parseWorkspaceLocation({
    search: '?lesson=unknown', historyState: null, checkedIds: ['retina-to-v1'], availableSessionKeys: [],
  }), { mode: 'atlas', recovery: 'unknown-lesson' });
  assert.equal(JSON.stringify(local).includes('source'), false);
  assert.equal(Object.isFrozen(local), true);
});

test('checked lesson entries project frozen drawer data without retaining candidates', () => { // Tests INV-25
  assert.equal(typeof createCheckedLessonEntry, 'function');
  const candidate = {
    summary: {
      title: 'Early vision',
      status: 'draft',
      statusLabel: '[DRAFT]',
      sceneCount: 8,
      imageCount: 0,
      externalHosts: [],
    },
    lesson: { source: 'must not leak' },
  };
  const entry = createCheckedLessonEntry({
    id: 'retina-to-v1',
    candidate,
    summary: 'Follow visual signals from the retina into ventral and dorsal cortex.',
  });

  assert.deepEqual(entry, {
    id: 'retina-to-v1',
    title: 'Early vision',
    status: 'draft',
    statusLabel: '[DRAFT]',
    sceneCount: 8,
    summary: 'Follow visual signals from the retina into ventral and dorsal cortex.',
  });
  assert.equal(Object.isFrozen(entry), true);
  assert.equal(JSON.stringify(entry).includes('must not leak'), false);
});

test('Atlas capture synchronizes the actual rendered camera without mutating canonical state', () => { // Tests INV-26
  assert.equal(typeof captureAtlasSnapshot, 'function');
  const authored = lessonSnapshot();
  const before = JSON.stringify(authored);
  const captured = captureAtlasSnapshot(authored, RENDERED_CAMERA, CATALOG);

  assert.deepEqual(captured.camera, {
    ...RENDERED_CAMERA,
    transition: { kind: 'instant', durationMs: 0 },
  });
  assert.deepEqual(captured.visibility, authored.visibility);
  assert.deepEqual(captured.playback, authored.playback);
  assert.deepEqual(captured.visual, authored.visual);
  assert.deepEqual(captured.controlPolicy, authored.controlPolicy);
  assert.equal(JSON.stringify(authored), before);
  assert.equal(Object.isFrozen(captured.camera.position), true);
});

test('lesson resume tokens preserve stable semantic state and exclude transient data', () => { // Tests INV-27
  assert.equal(typeof createLessonResumeToken, 'function');
  const token = createLessonResumeToken({
    lessonKey: 'checked:retina-to-v1',
    sourceKind: 'reference',
    activeIndex: 3,
    sceneCount: 8,
    hasEntryScene: true,
    scrollTop: 1450.25,
    selectedVisualId: 'diagram.one',
    snapshot: lessonSnapshot(),
    renderedCamera: RENDERED_CAMERA,
    focusTarget: 'back-to-atlas',
  }, CATALOG);

  assert.equal(token.lessonKey, 'checked:retina-to-v1');
  assert.equal(token.activeIndex, 3);
  assert.equal(token.scrollTop, 1450.25);
  assert.equal(token.selectedVisualId, 'diagram.one');
  assert.deepEqual(token.snapshot.camera, {
    ...RENDERED_CAMERA,
    transition: { kind: 'instant', durationMs: 0 },
  });
  assert.deepEqual(token.snapshot.playback, { playing: true, speed: 55, settled: false });
  assert.equal(token.focusTarget, 'back-to-atlas');
  assert.equal('particles' in token, false);
  assert.equal(Object.isFrozen(token), true);
  assert.equal(Object.isFrozen(token.snapshot), true);
});

test('scene inspection derives a temporary full-control branch without mutating the lesson', () => { // Tests INV-28
  assert.equal(typeof createSceneInspectionSnapshot, 'function');
  const source = lessonSnapshot();
  const before = JSON.stringify(source);
  const result = createSceneInspectionSnapshot(source, RENDERED_CAMERA, CATALOG);

  assert.deepEqual(result.camera.position, RENDERED_CAMERA.position);
  assert.deepEqual(result.visual, { id: 'atlas', layout: 'dominant' });
  assert.deepEqual(result.controlPolicy, { mode: 'explore' });
  assert.deepEqual(result.visibility, source.visibility);
  assert.equal(JSON.stringify(source), before);
});

test('workspace boundary rejects invalid routes, tokens, and history payloads', () => { // Tests FAIL-27
  assert.throws(
    () => createHistoryIntent({ mode: 'inspect', serial: 1 }),
    /session key/i,
  );
  assert.throws(
    () => createHistoryIntent({ mode: 'lesson', checkedLessonId: 'retina-to-v1', sessionKey: 'local-1', serial: 1 }),
    /either/i,
  );
  assert.throws(
    () => createLessonResumeToken({
      lessonKey: 'checked:retina-to-v1', sourceKind: 'reference', activeIndex: 9,
      sceneCount: 8, hasEntryScene: true, scrollTop: 0, selectedVisualId: 'atlas',
      snapshot: lessonSnapshot(), renderedCamera: RENDERED_CAMERA, focusTarget: 'back-to-atlas',
    }, CATALOG),
    /active index/i,
  );
  assert.throws(
    () => createLessonResumeToken({
      lessonKey: 'local:1', sourceKind: 'local', activeIndex: -1,
      sceneCount: 8, hasEntryScene: false, scrollTop: -1, selectedVisualId: 'missing',
      snapshot: lessonSnapshot(), renderedCamera: RENDERED_CAMERA, focusTarget: 'unknown',
    }, CATALOG),
    /active index|scroll|visual|focus/i,
  );
});
