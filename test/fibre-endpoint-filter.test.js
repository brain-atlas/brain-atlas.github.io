import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import test from 'node:test';

import {
  ALL_FIBRE_FILTER,
  createFibreEndpointIndex,
  filterFibreEndpoints,
  formatFibreFilterSummary,
  normalizeFibreFilterQuery,
  writeFilteredEndpointPositions,
  writeFilteredLineSegments,
} from '../src/fibre-endpoint-filter.js';

function loadJson(path) {
  return JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
}

const STATUSES = [
  { id: 'unknown-outside-support', class: 'unknown', method: 'nearest', confidence: 'none' },
  { id: 'unknown-unsupported-label', class: 'unknown', method: 'nearest', confidence: 'none' },
  { id: 'known-direct', class: 'known', method: 'direct', confidence: 'qualified' },
  { id: 'known-nearest', class: 'known', method: 'nearest', confidence: 'low' },
  { id: 'ambiguous', class: 'ambiguous', method: 'margin', confidence: 'none' },
];

function endpoint(status, entity = 0, candidates = 0, distance = 0) {
  return [status, entity, candidates, distance];
}

function syntheticArtifact() {
  const L = [
    [endpoint(2, 1), endpoint(2, 2)],
    [endpoint(2, 2), endpoint(2, 1)],
    [endpoint(2, 1), endpoint(2, 1)],
    [endpoint(0), endpoint(2, 1)],
    [endpoint(4, 0, 1), endpoint(2, 2)],
  ];
  const R = [[endpoint(2, 2), endpoint(2, 3)]];
  const swm = [
    [endpoint(2, 1), endpoint(2, 3)],
    [endpoint(1), endpoint(2, 2)],
  ];
  return {
    schemaVersion: 1,
    statuses: STATUSES,
    entities: [null, 'region.a', 'region.b', 'region.c'],
    candidateSets: [[], [1, 2]],
    counts: {
      associationFibres: 6,
      swmFibres: 2,
      endpoints: 16,
      fibreQuality: { known: 5, unknown: 2, ambiguous: 1 },
    },
    presets: [],
    association: [{ id: 'tract', L, R }],
    swm: { endpoints: swm, hemispheres: 'LR' },
  };
}

function query(mode, setA = [], setB = []) {
  return { preset: null, mode, setA, setB };
}

test('endpoint queries are unordered and distinguish touches, within, between, unknown, and ambiguous', () => {
  const index = createFibreEndpointIndex(syntheticArtifact());

  const all = filterFibreEndpoints(index, ALL_FIBRE_FILTER, { L: true, R: true });
  assert.deepEqual(all.summary.selected, { association: 6, swm: 2, total: 8, L: 6, R: 2 });

  const touches = filterFibreEndpoints(index, query('touches-any', ['region.a']), { L: true, R: true });
  assert.deepEqual([...touches.association[0].L], [1, 1, 1, 1, 0]);
  assert.deepEqual(touches.summary.selected, { association: 4, swm: 1, total: 5, L: 5, R: 0 });

  const within = filterFibreEndpoints(index, query('connects-within', ['region.a', 'region.b']), { L: true, R: true });
  assert.deepEqual([...within.association[0].L], [1, 1, 1, 0, 0]);
  assert.equal(within.summary.selected.total, 3);

  const between = filterFibreEndpoints(index, query('connects-between', ['region.a'], ['region.b']), { L: true, R: true });
  assert.deepEqual([...between.association[0].L], [1, 1, 0, 0, 0]);
  assert.equal(between.summary.selected.total, 2, 'stored A/B reversal must not change matching');

  const unknown = filterFibreEndpoints(index, query('touches-any', ['endpoint.unknown']), { L: true, R: true });
  assert.deepEqual(unknown.summary.selectedQuality, { known: 0, unknown: 2, ambiguous: 0 });
  const ambiguous = filterFibreEndpoints(index, query('touches-any', ['endpoint.ambiguous']), { L: true, R: true });
  assert.deepEqual(ambiguous.summary.selectedQuality, { known: 0, unknown: 0, ambiguous: 1 });

  const rightOnly = filterFibreEndpoints(index, ALL_FIBRE_FILTER, { L: false, R: true });
  assert.deepEqual(rightOnly.summary.population, { association: 1, swm: 1, total: 2, L: 0, R: 2 });
  assert.deepEqual([...rightOnly.association[0].L], [0, 0, 0, 0, 0]);
  assert.deepEqual([...rightOnly.association[0].R], [1]);
});

test('query results produce an accessible count and endpoint-quality summary', () => {
  const index = createFibreEndpointIndex(syntheticArtifact());
  const result = filterFibreEndpoints(index, query('touches-any', ['region.a']), { L: true, R: true });
  assert.equal(formatFibreFilterSummary(result),
    '5 of 8 fibres match: 4 association and 1 superficial. Active hemispheres: left and right. Endpoint assignment quality among matches: 4 known, 1 unknown, and 0 ambiguous.');
});

test('query and artifact validation fail closed on malformed selectors, modes, tables, and counts', () => {
  const index = createFibreEndpointIndex(syntheticArtifact());
  assert.throws(() => normalizeFibreFilterQuery(query('touches-any', []), index), /setA/i);
  assert.throws(() => normalizeFibreFilterQuery(query('connects-between', ['region.a'], []), index), /setB/i);
  assert.throws(() => normalizeFibreFilterQuery(query('not-a-mode', ['region.a']), index), /mode/i);
  assert.throws(() => normalizeFibreFilterQuery(query('touches-any', ['region.missing']), index), /selector/i);
  assert.throws(() => normalizeFibreFilterQuery({ ...query('all'), extra: true }, index), /keys|shape/i);

  const badTuple = syntheticArtifact();
  badTuple.association[0].L[0][0] = [99, 0, 0, 0];
  assert.throws(() => createFibreEndpointIndex(badTuple), /status.*range/i);
  const badCount = syntheticArtifact();
  badCount.counts.endpoints--;
  assert.throws(() => createFibreEndpointIndex(badCount), /count/i);
  const badHemisphere = syntheticArtifact();
  badHemisphere.swm.hemispheres = 'LX';
  assert.throws(() => createFibreEndpointIndex(badHemisphere), /hemisphere/i);
});

test('segment writers rebuild selected line and cap positions without changing contour order', () => {
  const polylines = [
    [[0, 0, 0], [1, 0, 0], [2, 0, 0]],
    [{ x: 10, y: 1, z: 2 }, { x: 11, y: 1, z: 2 }, { x: 12, y: 1, z: 2 }],
  ];
  const mask = Uint8Array.from([0, 1]);
  const segments = new Float32Array(12);
  const endpoints = new Float32Array(6);
  assert.equal(writeFilteredLineSegments(polylines, mask, segments), 4);
  assert.deepEqual([...segments], [10, 1, 2, 11, 1, 2, 11, 1, 2, 12, 1, 2]);
  assert.equal(writeFilteredEndpointPositions(polylines, mask, endpoints), 2);
  assert.deepEqual([...endpoints], [10, 1, 2, 12, 1, 2]);
  assert.throws(() => writeFilteredLineSegments(polylines, Uint8Array.from([1]), segments), /mask/i);
  assert.throws(() => writeFilteredEndpointPositions(polylines, mask, new Float32Array(5)), /capacity/i);
});

test('checked endpoint tuples preserve source group/order/hemisphere and reproduce preset audits', () => {
  const artifact = loadJson('../public/data/fibre_endpoints.json');
  const presets = loadJson('../public/data/fibre_filter_presets.json');
  const tracts = loadJson('../public/data/tracts.json');
  const swm = loadJson('../public/data/swm_fibres.json');
  const index = createFibreEndpointIndex(artifact);

  assert.deepEqual(index.association.map(({ id, L, R }) => ({ id, L: L.count, R: R.count })),
    tracts.tracts.map(({ id, L, R }) => ({ id, L: L.length, R: R.length })));
  assert.equal(index.swm.count, swm.fibres.length);
  assert.equal(index.swm.hemispheres, artifact.swm.hemispheres);
  const expectedHemispheres = swm.fibres.map((fibre) => (
    fibre.reduce((sum, point) => sum + point[0], 0) / fibre.length >= 0 ? 'R' : 'L'
  )).join('');
  assert.equal(index.swm.hemispheres, expectedHemispheres);

  for (const preset of presets.presets) {
    const audit = artifact.presets.find(({ id }) => id === preset.id);
    const result = filterFibreEndpoints(index, { preset: preset.id, ...preset.query }, { L: true, R: true });
    assert.deepEqual(result.summary.selected, audit.included, preset.id);
    assert.deepEqual(result.summary.selectedQuality, audit.includedQuality, preset.id);
    assert.deepEqual(result.summary.populationQuality, audit.populationQuality, preset.id);
  }
});

test('production query and 15,000-contour segment rebuild stay linear and interactive', { timeout: 2000 }, () => {
  const artifact = loadJson('../public/data/fibre_endpoints.json');
  const presets = loadJson('../public/data/fibre_filter_presets.json');
  const swm = loadJson('../public/data/swm_fibres.json');
  const index = createFibreEndpointIndex(artifact);
  const dorsal = presets.presets.find(({ id }) => id === 'fibre-filter.dorsal');
  const target = new Float32Array(swm.fibres.length * (swm.np - 1) * 2 * 3);

  const started = performance.now();
  const result = filterFibreEndpoints(index, { preset: dorsal.id, ...dorsal.query }, { L: true, R: true });
  const vertices = writeFilteredLineSegments(swm.fibres, result.swm, target);
  const elapsedMs = performance.now() - started;

  assert.equal(result.summary.selected.swm, 2002);
  assert.equal(vertices, 2002 * (swm.np - 1) * 2);
  assert.ok(elapsedMs < 120, `endpoint query + SWM rebuild took ${elapsedMs.toFixed(1)} ms`);
});
