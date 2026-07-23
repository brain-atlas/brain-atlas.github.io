import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createLessonCatalog } from '../src/lesson/catalog.js';
import { parseLesson } from '../src/lesson/index.js';

const json = async (relative) => JSON.parse(await readFile(new URL(relative, import.meta.url), 'utf8'));
const lesson = (name) => readFile(new URL(`./fixtures/lessons/${name}`, import.meta.url), 'utf8');

async function manifests() {
  return Promise.all([
    json('../public/data/entities.json'),
    json('../public/data/fidelity.json'),
    json('../public/data/regions.json'),
    json('../public/data/tracts.json'),
  ]);
}

test('current entity catalog binds every region and tract manifest ID exactly once', async () => {
  const [entities, fidelity, regions, tracts] = await manifests();
  const catalog = createLessonCatalog(entities, fidelity);
  const regionBindings = entities.entities
    .filter(({ renderer }) => renderer.kind === 'region')
    .map(({ renderer }) => renderer.id)
    .sort();
  const tractBindings = entities.entities
    .filter(({ renderer }) => renderer.kind === 'tract')
    .map(({ renderer }) => renderer.id)
    .sort();

  assert.deepEqual(regionBindings, regions.regions.map(({ id }) => id).sort());
  assert.deepEqual(tractBindings, tracts.tracts.map(({ id }) => id).sort());
  assert.equal(new Set(catalog.entityIds).size, catalog.entityIds.length);
  assert.ok(catalog.entityIds.every((id) => /^(layer|pathway|region|tract)\./.test(id)));
  assert.equal(Object.isFrozen(catalog), true);
});

test('catalog exposes the approved visual-pathway and relationship inspectables', async () => { // Tests INV-35
  const [entities, fidelity] = await manifests();
  const catalog = createLessonCatalog(entities, fidelity);

  assert.deepEqual(catalog.inspectableIds, [
    'landmark.eye-left',
    'landmark.eye-right',
    'landmark.optic-chiasm',
    'layer.swm',
    'pathway.optic-radiation',
    'region.broca',
    'region.fp1',
    'region.gap-fi',
    'region.gap-fii',
    'region.gap-fo',
    'region.gap-tp',
    'region.lgn',
    'region.loa',
    'region.lop',
    'region.op6',
    'region.pf',
    'region.pfm',
    'region.presma',
    'region.spl5m',
    'region.spl7a',
    'region.sts2',
    'region.v1',
    'region.v2',
    'region.v3a',
    'region.v3d',
    'tract.af',
    'tract.ifof',
    'tract.ilf',
    'tract.mdlf',
    'tract.slf1',
    'tract.slf2',
    'tract.slf3',
    'tract.vof',
  ]);
  for (const inspectable of Object.values(catalog.inspectablesById)) {
    assert.equal(inspectable.fidelity, catalog.entitiesById[inspectable.entity].fidelity);
    assert.ok(inspectable.shortLabel.length > 0);
    assert.ok(inspectable.description.length > 0);
    assert.ok(inspectable.sources.length > 0);
    assert.equal(Object.isFrozen(inspectable), true);
  }
  assert.deepEqual(catalog.inspectablesById['region.lgn'].renderer, { kind: 'region', id: 'lgn' });
  assert.deepEqual(catalog.inspectablesById['landmark.optic-chiasm'].renderer, {
    kind: 'landmark', id: 'optic-chiasm',
  });
  assert.equal(catalog.entityIds.includes('landmark.optic-chiasm'), false);
});

test('inspectable owner and relationship references must resolve', async () => { // Tests FAIL-33
  const [entities, fidelity] = await manifests();
  const unknownOwner = structuredClone(entities);
  unknownOwner.inspectables[0].entity = 'pathway.missing';
  assert.throws(
    () => createLessonCatalog(unknownOwner, fidelity),
    (error) => error.diagnostics.some(({ code }) => code === 'catalog.semantic.unknown-inspectable-owner'),
  );

  const unknownTarget = structuredClone(entities);
  unknownTarget.inspectables[0].relationships[0].target = 'region.missing';
  assert.throws(
    () => createLessonCatalog(unknownTarget, fidelity),
    (error) => error.diagnostics.some(({ code }) => code === 'catalog.semantic.unknown-inspectable-target'),
  );
});

test('relationship records carry explicit provenance, status, confidence, and direction', async () => { // Tests INV-14
  const [entities, fidelity] = await manifests();
  const relationships = entities.inspectables.flatMap(({ relationships: records }) => records);
  assert.ok(relationships.length > 0);
  for (const relationship of relationships) {
    assert.ok(['literature-review', 'displayed-endpoint-proximity', 'schematic-teaching'].includes(
      relationship.method,
    ));
    assert.ok(['supported', 'qualified', 'illustrative'].includes(relationship.status));
    assert.ok(['high', 'moderate', 'low', 'not-applicable'].includes(relationship.confidence));
    assert.ok(['literature-curated', 'displayed-dataset', 'schematic-teaching'].includes(
      relationship.evidence,
    ));
    assert.ok(relationship.sources.length > 0);
    assert.ok(relationship.sources.every(({ label, url }) => label && url.startsWith('https://')));
  }
  assert.doesNotThrow(() => createLessonCatalog(entities, fidelity));
});

test('catalog projects one authored undirected relationship from both inspectable owners', async () => { // Tests INV-14
  const [entities, fidelity] = await manifests();
  const reciprocal = structuredClone(entities);
  reciprocal.inspectables.find(({ id }) => id === 'region.lgn').relationships.push({
    target: 'region.v1',
    direction: 'undirected',
    evidence: 'displayed-dataset',
    method: 'displayed-endpoint-proximity',
    status: 'qualified',
    confidence: 'low',
    summary: 'Synthetic endpoint-proximity relation for reciprocal projection testing.',
    sources: [{
      label: 'HCP-1065 tract atlas',
      url: 'https://brain.labsolver.org/hcp_trk_atlas.html',
    }],
  });

  let catalog;
  assert.doesNotThrow(() => {
    catalog = createLessonCatalog(reciprocal, fidelity);
  });
  assert.equal(
    catalog.inspectablesById['region.lgn'].relationships.filter(({ target }) => target === 'region.v1').length,
    1,
  );
  assert.equal(
    catalog.inspectablesById['region.v1'].relationships.filter(({ target }) => target === 'region.lgn').length,
    1,
  );
});

test('inspectable renderer bindings and relationships cannot drift or collide', async () => { // Tests FAIL-34
  const [entities, fidelity] = await manifests();
  const rendererDrift = structuredClone(entities);
  const lgn = rendererDrift.inspectables.find(({ id }) => id === 'region.lgn');
  lgn.renderer.id = 'v1';
  assert.throws(
    () => createLessonCatalog(rendererDrift, fidelity),
    (error) => error.diagnostics.some(({ code }) => code === 'catalog.semantic.inspectable-renderer-drift'),
  );

  const duplicateBinding = structuredClone(entities);
  duplicateBinding.inspectables[1].renderer = structuredClone(duplicateBinding.inspectables[0].renderer);
  assert.throws(
    () => createLessonCatalog(duplicateBinding, fidelity),
    (error) => error.diagnostics.some(({ code }) => code === 'catalog.semantic.duplicate-inspectable-binding'),
  );

  const selfTarget = structuredClone(entities);
  selfTarget.inspectables[0].relationships[0].target = selfTarget.inspectables[0].id;
  assert.throws(
    () => createLessonCatalog(selfTarget, fidelity),
    (error) => error.diagnostics.some(({ code }) => code === 'catalog.semantic.inspectable-self-relationship'),
  );

  const reversedUndirected = structuredClone(entities);
  const ilf = reversedUndirected.inspectables.find(({ id }) => id === 'tract.ilf');
  const relation = structuredClone(ilf.relationships[0]);
  const target = reversedUndirected.inspectables.find(({ id }) => id === relation.target);
  target.relationships.push({ ...relation, target: ilf.id });
  assert.throws(
    () => createLessonCatalog(reversedUndirected, fidelity),
    (error) => error.diagnostics.some(
      ({ code }) => code === 'catalog.semantic.duplicate-undirected-relationship',
    ),
  );

  const missingSources = structuredClone(entities);
  delete missingSources.inspectables.find(({ id }) => id === 'tract.ilf').relationships[0].sources;
  assert.throws(
    () => createLessonCatalog(missingSources, fidelity),
    (error) => error.diagnostics.some(
      ({ code, path }) => code.includes('required') && path.includes('/relationships/0'),
    ),
  );
});

test('catalog records use explicit renderer and fidelity bindings with complete camera presets', async () => {
  const [entities, fidelity] = await manifests();
  const catalog = createLessonCatalog(entities, fidelity);

  assert.deepEqual(catalog.visualIds, ['atlas']);
  for (const id of ['home', 'lateral', 'dorsal', 'top', 'posterior', 'anterior']) {
    assert.equal(catalog.cameraPresets[id].position.length, 3);
    assert.equal(catalog.cameraPresets[id].target.length, 3);
  }
  for (const entity of Object.values(catalog.entitiesById)) {
    assert.ok(['layer', 'pathway', 'region', 'tract'].includes(entity.type));
    assert.ok(['none', 'global', 'bilateral'].includes(entity.hemisphereMode));
    assert.ok(catalog.fidelityById[entity.fidelity]);
    assert.ok(entity.renderer.id.length > 0);
  }
});

test('fidelity catalog separates geometry and activity status without unsupported relationships', async () => {
  const [entities, fidelity] = await manifests();
  const catalog = createLessonCatalog(entities, fidelity);
  const allowed = new Set([
    'data-derived', 'derived', 'mirrored', 'modeled', 'schematic',
    'illustrative', 'display-only', 'none',
  ]);

  for (const record of Object.values(catalog.fidelityById)) {
    assert.ok(record.geometry.statuses.every((status) => allowed.has(status)));
    assert.ok(record.activity.statuses.every((status) => allowed.has(status)));
    assert.equal('relationships' in record, false);
    assert.ok(record.limitations.every(({ material }) => material === true));
  }
});

test('both lesson fixtures parse against the current domain catalog', async () => {
  const [entities, fidelity] = await manifests();
  const catalog = createLessonCatalog(entities, fidelity);
  for (const name of ['visual-field-crossing.md', 'frontoparietal-orientation.md']) {
    const result = parseLesson(await lesson(name), catalog);
    assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  }
});

test('invalid or unresolved catalog records fail before lesson use', async () => {
  const [entities, fidelity] = await manifests();

  assert.throws(
    () => createLessonCatalog({ ...entities, unknown: true }, fidelity),
    (error) => error.diagnostics.some(({ code }) => code.includes('additionalProperties')),
  );
  assert.throws(
    () => createLessonCatalog({
      ...entities,
      entities: entities.entities.map((entity, index) => index === 0
        ? { ...entity, fidelity: 'fidelity.missing' }
        : entity),
    }, fidelity),
    (error) => error.diagnostics.some(({ code }) => code === 'catalog.semantic.unknown-fidelity'),
  );
});
