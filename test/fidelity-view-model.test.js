import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createLessonCatalog } from '../src/lesson/index.js';
import { createFidelityViewModel } from '../src/ui/fidelity-view-model.js';

const json = async (path) => JSON.parse(await readFile(new URL(`../${path}`, import.meta.url), 'utf8'));
const catalogPromise = Promise.all([
  json('public/data/entities.json'),
  json('public/data/fidelity.json'),
]).then(([entities, fidelity]) => createLessonCatalog(entities, fidelity));

test('scene fidelity keeps geometry and activity statuses separate', async () => {
  const catalog = await catalogPromise;
  const model = createFidelityViewModel({
    fidelityIds: ['fidelity.anterior-pathway', 'fidelity.julich-regions'],
    entityIds: ['pathway.anterior', 'region.lgn'],
  }, catalog);

  assert.deepEqual(model.geometryStatuses, ['Data-derived', 'Derived', 'Schematic']);
  assert.deepEqual(model.activityStatuses, ['Modeled', 'Illustrative']);
  assert.deepEqual(model.records.map(({ id }) => id), [
    'fidelity.anterior-pathway',
    'fidelity.julich-regions',
  ]);
  assert.deepEqual(model.records[0].subjects, ['Anterior eye to LGN pathway']);
  assert.deepEqual(model.records[1].subjects, ['LGN']);
  assert.equal(Object.isFrozen(model), true);
});

test('a geometry-only scene states Activity: None explicitly', async () => {
  const catalog = await catalogPromise;
  const model = createFidelityViewModel({
    fidelityIds: ['fidelity.julich-regions'],
    entityIds: ['region.lgn', 'region.v1'],
  }, catalog);

  assert.deepEqual(model.activityStatuses, ['None']);
  assert.deepEqual(model.records[0].subjects, ['LGN', 'V1']);
});

test('detailed records expose assumptions, uncertainty, material limits, sources, and licenses', async () => {
  const catalog = await catalogPromise;
  const model = createFidelityViewModel({
    fidelityIds: ['fidelity.optic-radiation'],
    entityIds: ['pathway.optic-radiation'],
  }, catalog);
  const record = model.records[0];

  assert.ok(record.assumptions.length > 0);
  assert.ok(record.uncertainties.length > 0);
  assert.ok(record.limitations.length > 0);
  assert.equal(record.limitations.every(({ material }) => material === true), true);
  assert.ok(record.sources.every(({ url }) => url.startsWith('https://')));
  assert.ok(record.licenses.every(({ url }) => url.startsWith('https://')));
  assert.doesNotThrow(() => structuredClone(model));
});

test('unknown fidelity records fail instead of receiving a reassuring default', async () => {
  const catalog = await catalogPromise;
  assert.throws(
    () => createFidelityViewModel({
      fidelityIds: ['fidelity.unknown'],
      entityIds: [],
    }, catalog),
    /unknown fidelity record/i,
  );
});
