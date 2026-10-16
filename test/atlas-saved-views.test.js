import assert from 'node:assert/strict';
import test from 'node:test';
import { TEST_CATALOG } from '../test-fixtures/lesson-context.js';
import { createAtlasExploreSnapshot } from '../src/ui/explore-session.js';

const { changeSavedViews, readSavedViews, writeSavedViews, SAVED_VIEWS_KEY } = await import('../src/ui/atlas-saved-views.js').catch(() => ({}));
const snapshot = createAtlasExploreSnapshot(TEST_CATALOG);
const storageKey = 'brain-atlas.saved-views';
function memoryStorage(text = null) {
  const data = new Map(text === null ? [] : [[storageKey, text]]);
  return { data, getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value), removeItem: key => data.delete(key) };
}
function change(views, action) { return changeSavedViews(views, action, TEST_CATALOG); }

test('named views capture immutable snapshots, rename without changing state, and delete only selected view', () => { // Tests INV-73
  assert.equal(typeof changeSavedViews, 'function');
  const first = change([], { type: 'save', name: '  Back  ', snapshot });
  assert.equal(first[0].name, 'Back');
  assert.deepEqual(first[0].snapshot, snapshot);
  assert.ok(Object.isFrozen(first) && Object.isFrozen(first[0].snapshot.camera));
  const other = { ...snapshot, cutaway: { position: 42 } };
  const two = change(first, { type: 'save', name: 'Top', snapshot: other });
  const renamed = change(two, { type: 'rename', name: 'Back', nextName: 'Side' });
  assert.equal(two[0].name, 'Back');
  assert.deepEqual(renamed[0].snapshot, snapshot);
  assert.deepEqual(change(renamed, { type: 'delete', name: 'Side' }), [two[1]]);
  assert.deepEqual(change(renamed, { type: 'rename', name: 'Side', nextName: 'side' })[0].name, 'side');
});

test('names are bounded plain text with explicit empty and normalized duplicate rejection', () => { // Tests FAIL-66
  assert.equal(typeof changeSavedViews, 'function');
  const views = change([], { type: 'save', name: 'Café', snapshot });
  for (const name of ['', ' \n ', 'x'.repeat(81), 'bad\u0000name', 'bad\nname']) {
    assert.throws(() => change(views, { type: 'save', name, snapshot }), /name/i);
  }
  for (const name of [' CAFÉ ', 'Cafe\u0301']) {
    assert.throws(() => change(views, { type: 'save', name, snapshot }), /already exists/i);
  }
  const two = change(views, { type: 'save', name: '<img onerror=alert(1)>', snapshot });
  assert.equal(two[1].name, '<img onerror=alert(1)>');
  assert.throws(() => change(two, { type: 'rename', name: two[1].name, nextName: 'CAFÉ' }), /already exists/i);
  for (const type of ['rename', 'delete']) assert.throws(() => change(views, { type, name: 'missing', nextName: 'X' }), /not found/i);
  assert.throws(() => change(views, { type: 'replace', name: 'Café', snapshot }), /unknown/i);
  assert.equal(change([], { type: 'save', name: 'x'.repeat(80), snapshot })[0].name.length, 80);
});

test('collection limit rejects new saves but still permits rename and deletion', () => { // Tests FAIL-66
  assert.equal(typeof changeSavedViews, 'function');
  let views = [];
  for (let n = 0; n < 20; n++) views = change(views, { type: 'save', name: `View ${n}`, snapshot });
  assert.throws(() => change(views, { type: 'save', name: 'Overflow', snapshot }), /20/);
  assert.equal(change(views, { type: 'rename', name: 'View 0', nextName: 'First' }).length, 20);
  assert.equal(change(views, { type: 'delete', name: 'View 0' }).length, 19);
});

test('strict named-view envelope round trips without writing global Atlas or unrelated keys', () => { // Tests INV-73
  assert.equal(typeof writeSavedViews, 'function');
  assert.equal(SAVED_VIEWS_KEY, storageKey);
  const storage = memoryStorage();
  storage.setItem('brain-atlas.atlas-state', 'keep');
  assert.deepEqual(readSavedViews(() => storage, TEST_CATALOG), { status: 'empty', views: [] });
  const views = change([], { type: 'save', name: 'Default', snapshot });
  assert.equal(writeSavedViews(() => storage, views, TEST_CATALOG), 'saved');
  assert.deepEqual(JSON.parse(storage.getItem(storageKey)), { schemaVersion: 1, views });
  assert.deepEqual(readSavedViews(() => storage, TEST_CATALOG), { status: 'restored', views });
  assert.equal(storage.getItem('brain-atlas.atlas-state'), 'keep');
  assert.equal(writeSavedViews(() => storage, [], TEST_CATALOG), 'saved');
  assert.deepEqual(readSavedViews(() => storage, TEST_CATALOG).views, []);
});

test('untrusted envelopes, names, extra source fields, invalid snapshots and byte bounds fail closed', () => { // Tests FAIL-66
  assert.equal(typeof readSavedViews, 'function');
  const entry = { name: 'Back', snapshot };
  const envelope = views => JSON.stringify({ schemaVersion: 1, views });
  for (const text of [
    '{', 'null', '[]', JSON.stringify({ schemaVersion: 2, views: [] }),
    JSON.stringify({ schemaVersion: 1, views: [], source: 'private' }),
    envelope({}), envelope([null]), envelope([{ ...entry, source: 'private' }]),
    envelope([{ ...entry, name: ' Back ' }]), envelope([{ ...entry, name: '' }]),
    envelope([entry, { ...entry, name: 'BACK' }]), envelope(Array.from({ length: 21 }, (_, n) => ({ ...entry, name: String(n) }))),
    ...[
      { source: 'private' }, { schemaVersion: 999 }, { visibility: { entities: ['unknown'] } },
      { camera: { ...snapshot.camera, position: [1e9, 0, 0] } },
      { camera: { ...snapshot.camera, position: snapshot.camera.target } },
      { camera: { ...snapshot.camera, transition: { kind: 'ease', durationMs: 100 } } },
      { controlPolicy: { mode: 'guided' } }, { visual: { id: 'atlas', layout: 'split' } },
    ].map(overrides => envelope([{ ...entry, snapshot: { ...snapshot, ...overrides } }])),
    ' '.repeat(1024 * 1024 + 1),
    JSON.stringify({ schemaVersion: 1, views: [], extra: '界'.repeat(400000) }),
  ]) {
    const storage = memoryStorage(text);
    storage.setItem('unrelated', 'keep');
    assert.deepEqual(readSavedViews(() => storage, TEST_CATALOG), { status: 'discarded', views: [] });
    assert.equal(storage.getItem(storageKey), null);
    assert.equal(storage.getItem('unrelated'), 'keep');
  }
});

test('denial, read, remove and quota failures are contained; invalid writes preserve stored bytes', () => { // Tests FAIL-66
  assert.equal(typeof readSavedViews, 'function');
  const denied = () => { throw new Error('Denied'); };
  for (const getter of [denied, () => ({ getItem: denied }), () => ({ getItem: () => '{', removeItem: denied })]) {
    assert.deepEqual(readSavedViews(getter, TEST_CATALOG), { status: 'unavailable', views: [] });
  }
  const views = [{ name: 'View', snapshot }];
  assert.equal(writeSavedViews(denied, views, TEST_CATALOG), 'unavailable');
  assert.equal(writeSavedViews(() => ({ setItem: denied }), views, TEST_CATALOG), 'unavailable');
  const storage = memoryStorage('previous');
  assert.equal(writeSavedViews(() => storage, [{ ...views[0], source: 'private' }], TEST_CATALOG), 'invalid');
  assert.equal(storage.getItem(storageKey), 'previous');
});
