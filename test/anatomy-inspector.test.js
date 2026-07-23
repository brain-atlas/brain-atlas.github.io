import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createLessonCatalog } from '../src/lesson/catalog.js';
import {
  anatomyPointerNdc,
  anatomyTapIntent,
  applyAnatomySelectionIntent,
  availableInspectableIds,
  createAnatomyDetailViewModel,
  createAnatomySelectionState,
  nearestAnatomyHit,
} from '../src/ui/anatomy-inspector.js';

const json = async (relative) => JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'));
const catalog = Promise.all([
  json('../public/data/entities.json'),
  json('../public/data/fidelity.json'),
]).then(([entities, fidelity]) => createLessonCatalog(entities, fidelity));

function snapshot({ visible, global = { L: true, R: true }, entities = {} }) {
  return {
    visibility: { entities: visible },
    hemispheres: { global, entities },
  };
}

test('inspectable availability follows owner visibility and effective hemispheres', async () => { // Tests INV-36
  const currentCatalog = await catalog;
  const visible = snapshot({
    visible: ['pathway.anterior', 'pathway.optic-radiation', 'region.lgn', 'region.v1'],
    entities: { 'region.lgn': { L: true, R: false }, 'region.v1': { L: false, R: false } },
  });

  assert.deepEqual(availableInspectableIds(visible, currentCatalog), [
    'landmark.eye-left',
    'landmark.eye-right',
    'landmark.optic-chiasm',
    'pathway.optic-radiation',
    'region.lgn',
  ]);
  assert.deepEqual(availableInspectableIds(snapshot({
    visible: ['pathway.optic-radiation', 'region.lgn'],
    global: { L: false, R: false },
  }), currentCatalog), []);
});

test('anatomy details separate explanation from displayed fidelity and citations', async () => { // Tests INV-37
  const currentCatalog = await catalog;
  const model = createAnatomyDetailViewModel('pathway.optic-radiation', currentCatalog);

  assert.equal(model.id, 'pathway.optic-radiation');
  assert.equal(model.entity, 'pathway.optic-radiation');
  assert.match(model.description, /thalamocortical projection/i);
  assert.deepEqual(model.geometry.statuses, ['data-derived', 'derived', 'mirrored']);
  assert.deepEqual(model.activity.statuses, ['modeled', 'illustrative']);
  assert.equal(model.relationships[0].targetLabel, 'Primary visual cortex (V1)');
  assert.equal(model.relationships[0].direction, 'directed');
  assert.ok(model.limitations.every(({ material }) => material));
  assert.ok(model.anatomySources.some(({ url }) => url.includes('10.1148/rg.230081')));
  assert.ok(model.dataSources.some(({ label }) => /HCP-1065/i.test(label)));
  assert.ok(model.licenses.length > 0);
  assert.equal(Object.isFrozen(model), true);
  assert.equal(Object.isFrozen(model.relationships[0]), true);
});

test('relationship details expose readable source class, method, status, confidence, and sources', async () => { // Tests INV-37
  const currentCatalog = await catalog;
  const model = createAnatomyDetailViewModel('tract.ilf', currentCatalog);
  const relationship = model.relationships.find(({ target }) => target === 'region.sts2');

  assert.deepEqual(relationship.labels, {
    direction: 'Undirected',
    evidence: 'Displayed dataset',
    method: 'Displayed endpoint proximity',
    status: 'Qualified',
    confidence: 'Low confidence',
  });
  assert.ok(relationship.sources.some(({ url }) => url.includes('PMC7615246')));
  assert.match(relationship.summary, /not a measured termination or connection strength/i);
  assert.equal(Object.isFrozen(relationship.labels), true);
  assert.equal(Object.isFrozen(relationship.sources), true);
});

test('unknown inspector records fail instead of receiving reassuring defaults', async () => { // Tests FAIL-35
  const currentCatalog = await catalog;
  assert.throws(
    () => createAnatomyDetailViewModel('region.missing', currentCatalog),
    /unknown inspectable/i,
  );
  assert.throws(
    () => availableInspectableIds(snapshot({ visible: ['region.lgn'] }), {
      ...currentCatalog,
      inspectablesById: {
        ...currentCatalog.inspectablesById,
        'region.lgn': { ...currentCatalog.inspectablesById['region.lgn'], entity: 'region.missing' },
      },
    }),
    /unknown inspectable owner/i,
  );
});

test('hover and focus preview while explicit activation alone opens details', () => { // Tests INV-38
  const initial = createAnatomySelectionState();
  const hover = applyAnatomySelectionIntent(initial, {
    type: 'preview', id: 'region.lgn', input: 'pointer',
  });
  assert.deepEqual(hover, {
    previewedId: 'region.lgn', previewInput: 'pointer', detailsId: null, sticky: false,
  });
  const cleared = applyAnatomySelectionIntent(hover, { type: 'clear', input: 'pointer' });
  assert.deepEqual(cleared, initial);

  const focused = applyAnatomySelectionIntent(initial, {
    type: 'preview', id: 'region.v1', input: 'focus',
  });
  const opened = applyAnatomySelectionIntent(focused, {
    type: 'activate', id: 'region.v1', input: 'keyboard',
  });
  assert.deepEqual(opened, {
    previewedId: 'region.v1', previewInput: 'keyboard', detailsId: 'region.v1', sticky: true,
  });
  assert.equal(Object.isFrozen(opened), true);
});

test('touch uses first-tap preview and second-tap activation', () => { // Tests INV-39
  const initial = createAnatomySelectionState();
  const first = applyAnatomySelectionIntent(initial, {
    type: 'touch', id: 'landmark.optic-chiasm',
  });
  assert.deepEqual(first, {
    previewedId: 'landmark.optic-chiasm', previewInput: 'touch', detailsId: null, sticky: true,
  });
  const second = applyAnatomySelectionIntent(first, {
    type: 'touch', id: 'landmark.optic-chiasm',
  });
  assert.equal(second.detailsId, 'landmark.optic-chiasm');
  const changed = applyAnatomySelectionIntent(second, { type: 'close-details' });
  assert.equal(changed.detailsId, null);
  assert.equal(changed.previewedId, 'landmark.optic-chiasm');
  const another = applyAnatomySelectionIntent(changed, { type: 'touch', id: 'region.lgn' });
  assert.equal(another.detailsId, null);
  assert.equal(another.previewedId, 'region.lgn');
});

test('pointer coordinates use the exact canvas rectangle and nearest rendered hit', () => { // Tests INV-40
  assert.deepEqual(anatomyPointerNdc({
    clientX: 110,
    clientY: 70,
    rect: { left: 10, top: 20, width: 200, height: 100 },
  }), { x: 0, y: 0 });
  assert.deepEqual(anatomyPointerNdc({
    clientX: 10,
    clientY: 20,
    rect: { left: 10, top: 20, width: 200, height: 100 },
  }), { x: -1, y: 1 });
  assert.deepEqual(nearestAnatomyHit([
    { id: 'region.v1', distance: 14 },
    { id: 'region.lgn', distance: 8 },
    { id: 'pathway.optic-radiation', distance: 8 },
  ]), { id: 'pathway.optic-radiation', distance: 8 });
  assert.equal(nearestAnatomyHit([]), null);
});

test('availability changes clear hidden selections and tap intent rejects drags', () => { // Tests FAIL-36
  const selected = applyAnatomySelectionIntent(createAnatomySelectionState(), {
    type: 'activate', id: 'region.lgn', input: 'pointer',
  });
  assert.deepEqual(
    applyAnatomySelectionIntent(selected, { type: 'availability', ids: ['region.v1'] }),
    createAnatomySelectionState(),
  );
  assert.equal(anatomyTapIntent({ startX: 10, startY: 10, endX: 14, endY: 13 }), true);
  assert.equal(anatomyTapIntent({ startX: 10, startY: 10, endX: 25, endY: 10 }), false);
  assert.equal(anatomyTapIntent({ startX: 0, startY: 0, endX: 6, endY: 0, maxDistance: 5 }), false);
});
