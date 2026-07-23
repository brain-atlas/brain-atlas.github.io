import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const toolUrl = new URL('../tools/map_tract_regions.py', import.meta.url);
const mappingUrl = new URL('../public/data/tract_region_mapping.json', import.meta.url);
const entitiesUrl = new URL('../public/data/entities.json', import.meta.url);
const regionsUrl = new URL('../public/data/regions.json', import.meta.url);
const fidelityUrl = new URL('../public/data/fidelity.json', import.meta.url);
const loadJson = (url) => JSON.parse(readFileSync(url, 'utf8'));
const loadMapping = () => loadJson(mappingUrl);
const regionEntityId = (regionId) => `region.${regionId.replaceAll('_', '-')}`;

const ROBUST = {
  ilf: ['gap_tp', 'sts2'],
  ifof: ['fp1', 'gap_fi', 'v1', 'v2'],
  slf1: ['gap_fi', 'gap_fo', 'presma', 'spl5m'],
  slf2: ['gap_fi', 'gap_fii', 'pfm'],
  slf3: ['broca', 'op6', 'pf'],
  vof: ['loa', 'lop', 'v3a', 'v3d'],
  af: ['broca', 'gap_fi'],
  mdlf: ['spl7a'],
};

const THRESHOLD_SENSITIVE = {
  ilf: ['v1'],
  ifof: ['ofc'],
  slf1: [],
  slf2: [],
  slf3: ['gap_fii'],
  vof: [],
  af: ['gap_tp'],
  mdlf: ['op6'],
};

test('offline tract-region mapping tool and checked evidence artifact exist', () => {
  assert.equal(existsSync(toolUrl), true, 'missing tools/map_tract_regions.py');
  assert.equal(existsSync(mappingUrl), true, 'missing public/data/tract_region_mapping.json');
});

test('mapping artifact freezes inputs, coordinate limits, and the conservative method', () => {
  const mapping = loadMapping();
  assert.equal(mapping.schemaVersion, 1, 'mapping schema is missing');
  assert.ok(mapping.generatedBy && mapping.inputs && mapping.coordinateFrames && mapping.method);
  assert.deepEqual(mapping.generatedBy, {
    tool: 'tools/map_tract_regions.py',
    version: 1,
  });
  for (const input of [mapping.inputs.tracts, mapping.inputs.regions, mapping.inputs.regionMeshes]) {
    assert.match(input.sha256, /^[0-9a-f]{64}$/);
  }
  assert.equal(mapping.inputs.regionMeshes.count, 90);
  assert.equal(mapping.coordinateFrames.fibres.template, 'ICBM 2009a Nonlinear Asymmetric');
  assert.equal(mapping.coordinateFrames.regions.template, 'MNI152NLin2009cAsym');
  assert.equal(mapping.coordinateFrames.templateConversion, 'none; common RAS+ world only');
  assert.deepEqual(mapping.method.screenRadiiMm, [3, 5]);
  assert.equal(mapping.method.minimumStreamlinesPerHemisphere, 18);
  assert.equal(mapping.method.streamlinesPerHemisphere, 180);
  assert.equal(mapping.method.endpointOrder, 'ignored; first and last points form an unordered pair');
  assert.match(mapping.method.distance, /nearest point.*triangle surface/i);
  assert.match(mapping.limitations.join(' '), /not.*connection strength|connection strength.*not/i);
});

test('mapping artifact records every displayed region and only robust bilateral relationships', () => {
  const mapping = loadMapping();
  assert.ok(Array.isArray(mapping.tracts), 'mapping tracts are missing');
  assert.ok(Array.isArray(mapping.relationships), 'mapping relationships are missing');
  assert.equal(mapping.tracts.length, 8);
  assert.equal(mapping.relationships.length, 23);
  const relationships = new Set(mapping.relationships.map(({ source, target }) => `${source}:${target}`));

  for (const tract of mapping.tracts) {
    assert.deepEqual(tract.robustRegionIds, ROBUST[tract.id]);
    assert.deepEqual(tract.thresholdSensitiveRegionIds, THRESHOLD_SENSITIVE[tract.id]);
    for (const hemi of ['L', 'R']) {
      assert.equal(tract.hemispheres[hemi].streamlines, 180);
      assert.equal(tract.hemispheres[hemi].assignments.length, 45);
      assert.ok(tract.hemispheres[hemi].assignments.every(({ within3mm, within5mm }) => (
        Number.isInteger(within3mm) && Number.isInteger(within5mm)
        && within3mm >= 0 && within5mm >= within3mm && within5mm <= 180
      )));
    }
    for (const regionId of ROBUST[tract.id]) {
      assert.equal(relationships.has(`tract.${tract.id}:${regionEntityId(regionId)}`), true);
    }
    for (const regionId of THRESHOLD_SENSITIVE[tract.id]) {
      assert.equal(relationships.has(`tract.${tract.id}:${regionEntityId(regionId)}`), false);
    }
  }

  for (const relationship of mapping.relationships) {
    assert.equal(relationship.direction, 'undirected');
    assert.equal(relationship.evidence, 'displayed-dataset');
    assert.equal(relationship.status, 'qualified');
    assert.equal(relationship.confidence, 'low');
    for (const hemi of ['L', 'R']) {
      assert.ok(relationship.hemispheres[hemi].within3mm >= 18);
      assert.ok(relationship.hemispheres[hemi].within5mm >= 18);
    }
  }
});

test('runtime catalog projects exactly the robust mapping set and an unmapped SWM record', () => {
  const mapping = loadMapping();
  const entities = loadJson(entitiesUrl);
  const authoredRelations = entities.inspectables.flatMap((inspectable) => (
    inspectable.relationships.map((relationship) => ({
      source: inspectable.id,
      ...relationship,
    }))
  ));
  const mappedRelations = authoredRelations.filter(({ evidence }) => evidence === 'displayed-dataset');
  assert.deepEqual(
    mappedRelations.map(({ source, target }) => `${source}:${target}`).sort(),
    mapping.relationships.map(({ source, target }) => `${source}:${target}`).sort(),
  );
  assert.ok(mappedRelations.every(({ direction, method, status, confidence, sources }) => (
    direction === 'undirected'
    && method === 'displayed-endpoint-proximity'
    && status === 'qualified'
    && confidence === 'low'
    && sources.length >= 3
  )));

  const expectedInspectableIds = new Set([
    'landmark.eye-left', 'landmark.eye-right', 'landmark.optic-chiasm',
    'pathway.optic-radiation', 'region.lgn', 'layer.swm',
    ...mapping.tracts.map(({ id }) => `tract.${id}`),
    ...mapping.relationships.map(({ target }) => target),
  ]);
  assert.deepEqual(
    new Set(entities.inspectables.map(({ id }) => id)),
    expectedInspectableIds,
  );
  const swm = entities.inspectables.find(({ id }) => id === 'layer.swm');
  assert.deepEqual(swm.relationships, []);
  assert.match(swm.description, /not mapped|no (?:approved )?named-region/i);
});

test('reviewed arrow labels are removed and fidelity preserves endpoint and SWM limits', () => {
  const entities = loadJson(entitiesUrl);
  const regions = loadJson(regionsUrl);
  const fidelity = loadJson(fidelityUrl);
  const reviewed = new Set(['sts2', 'ofc', 'presma', 'dlpfc', 'broca']);
  for (const record of regions.regions.filter(({ id }) => reviewed.has(id))) {
    assert.equal(record.name.includes('→'), false, record.id);
  }
  for (const entity of entities.entities.filter(({ renderer }) => (
    renderer.kind === 'region' && reviewed.has(renderer.id)
  ))) {
    assert.equal(entity.label.includes('→'), false, entity.id);
  }
  const association = fidelity.records.find(({ id }) => id === 'fidelity.association-tracts');
  const swm = fidelity.records.find(({ id }) => id === 'fidelity.superficial-white-matter');
  assert.match(association.limitations.map(({ summary }) => summary).join(' '), /endpoint proximity/i);
  assert.match(swm.limitations.map(({ summary }) => summary).join(' '), /named-region|endpoint classification/i);
});

test('legacy arrow-label hypotheses receive explicit robust, sensitive, or rejected outcomes', () => {
  const mapping = loadMapping();
  assert.ok(Array.isArray(mapping.reviewedHypotheses), 'reviewed hypotheses are missing');
  assert.ok(Array.isArray(mapping.exclusions), 'mapping exclusions are missing');
  assert.deepEqual(
    mapping.reviewedHypotheses.map(({ tractId, regionId, status }) => [tractId, regionId, status]),
    [
      ['ilf', 'sts2', 'qualified-robust'],
      ['ifof', 'ofc', 'threshold-sensitive'],
      ['slf1', 'presma', 'qualified-robust'],
      ['slf2', 'dlpfc', 'rejected'],
      ['slf3', 'broca', 'qualified-robust'],
    ],
  );
  assert.deepEqual(mapping.exclusions.map(({ entity, status }) => [entity, status]), [
    ['layer.swm', 'not-mapped'],
  ]);
});
