import assert from 'node:assert/strict';
import test from 'node:test';
import { TEST_CATALOG } from '../test-fixtures/lesson-context.js';
import { createAtlasExploreSnapshot } from '../src/ui/explore-session.js';
import { normalizeCanonicalSnapshot } from '../src/lesson/index.js';

const { readAtlasState, writeAtlasState, ATLAS_STORAGE_KEY } = await import('../src/ui/atlas-storage.js').catch(() => ({}));
const snapshot = createAtlasExploreSnapshot(TEST_CATALOG);
function memoryStorage(value = null) {
  const data = new Map(value === null ? [] : [['brain-atlas.atlas-state', value]]);
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    removeItem: (key) => data.delete(key),
    data,
  };
}

test('global Atlas state round trips every canonical axis in a strict versioned envelope', () => { // Tests INV-70
  assert.equal(typeof writeAtlasState, 'function');
  const storage = memoryStorage();
  const changed = normalizeCanonicalSnapshot({
    ...snapshot,
    camera: { position: [111, 42, -70], target: [4, 5, 6], transition: { kind: 'instant', durationMs: 0 } },
    visibility: { entities: ['region.lgn'] },
    hemispheres: { global: { L: false, R: true }, entities: { 'region.lgn': { L: true, R: false } } },
    fibreFilter: { preset: 'fibre-filter.test', mode: 'touches-any', setA: ['region.lgn'], setB: [] },
    cutaway: { position: 42 }, material: { tissueOpacity: 0.37 },
    playback: { playing: false, speed: 90, settled: true },
    selection: { selected: 'region.lgn', emphasized: ['region.lgn'], strength: 0.4 },
  }, TEST_CATALOG);
  assert.equal(writeAtlasState(() => storage, changed, TEST_CATALOG), 'saved');
  assert.equal(ATLAS_STORAGE_KEY, 'brain-atlas.atlas-state');
  assert.deepEqual(JSON.parse(storage.getItem(ATLAS_STORAGE_KEY)), { schemaVersion: 1, snapshot: changed });
  const result = readAtlasState(() => storage, TEST_CATALOG);
  assert.equal(result.status, 'restored');
  assert.deepEqual(result.snapshot, changed);
  assert.ok(Object.isFrozen(result.snapshot.camera));
  assert.equal(writeAtlasState(() => storage, snapshot, TEST_CATALOG), 'saved');
  assert.deepEqual(readAtlasState(() => storage, TEST_CATALOG).snapshot, snapshot);
});

test('empty storage does not manufacture or write a state', () => { // Tests INV-70
  assert.equal(typeof readAtlasState, 'function');
  const storage = memoryStorage();
  assert.deepEqual(readAtlasState(() => storage, TEST_CATALOG), { status: 'empty', snapshot: null });
  assert.equal(storage.data.size, 0);
});

test('malformed, oversized, incompatible and non-Atlas state is discarded before application', () => { // Tests FAIL-63
  assert.equal(typeof readAtlasState, 'function');
  const envelope = (overrides = {}) => JSON.stringify({ schemaVersion: 1, snapshot, ...overrides });
  const badSnapshot = (overrides) => envelope({ snapshot: { ...snapshot, ...overrides } });
  for (const value of [
    '', '{', 'null', '[]', 'x'.repeat(128 * 1024 + 1),
    envelope({ schemaVersion: 999 }), envelope({ extra: true }),
    envelope({ snapshot: null }), badSnapshot({ schemaVersion: 1 }),
    badSnapshot({ visibility: { entities: ['region.missing'] } }),
    badSnapshot({ material: { tissueOpacity: 5 } }),
    badSnapshot({ controlPolicy: { mode: 'guided' } }),
    badSnapshot({ visual: { id: 'retinotopy-diagram', layout: 'dominant' } }),
    badSnapshot({ visual: { id: 'atlas', layout: 'split' } }),
    badSnapshot({ modelTime: 3 }),
    badSnapshot({ camera: { ...snapshot.camera, transition: { kind: 'ease', durationMs: 100 } } }),
    badSnapshot({ camera: { ...snapshot.camera, position: [1e308, 0, 0] } }),
    badSnapshot({ camera: { ...snapshot.camera, position: snapshot.camera.target } }),
    badSnapshot({ fibreFilter: { ...snapshot.fibreFilter, setA: ['region.missing'] } }),
  ]) {
    const storage = memoryStorage(value);
    storage.setItem('unrelated', 'keep');
    assert.deepEqual(readAtlasState(() => storage, TEST_CATALOG), { status: 'discarded', snapshot: null }, value.slice(0, 120));
    assert.equal(storage.getItem(ATLAS_STORAGE_KEY), null);
    assert.equal(storage.getItem('unrelated'), 'keep');
  }
});

test('storage access, read, removal and quota failures never escape', () => { // Tests FAIL-63
  assert.equal(typeof readAtlasState, 'function');
  const denied = () => { throw new Error('denied'); };
  assert.deepEqual(readAtlasState(denied, TEST_CATALOG), { status: 'unavailable', snapshot: null });
  assert.equal(writeAtlasState(denied, snapshot, TEST_CATALOG), 'unavailable');
  assert.deepEqual(readAtlasState(() => ({ getItem: denied }), TEST_CATALOG), { status: 'unavailable', snapshot: null });
  assert.equal(writeAtlasState(() => ({ setItem: denied }), snapshot, TEST_CATALOG), 'unavailable');
  assert.deepEqual(readAtlasState(() => ({ getItem: () => '{', removeItem: denied }), TEST_CATALOG), { status: 'unavailable', snapshot: null });
});

test('invalid writes preserve the previous stored view', () => { // Tests FAIL-63
  assert.equal(typeof writeAtlasState, 'function');
  const storage = memoryStorage('previous');
  assert.equal(writeAtlasState(() => storage, { ...snapshot, source: 'private lesson' }, TEST_CATALOG), 'invalid');
  assert.equal(storage.getItem(ATLAS_STORAGE_KEY), 'previous');
});
