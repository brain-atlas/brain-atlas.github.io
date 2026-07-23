import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const repoUrl = new URL('../', import.meta.url);
const endpointModuleUrl = new URL('../tools/assets/endpoints.py', import.meta.url);
const presetUrl = new URL('../public/data/fibre_filter_presets.json', import.meta.url);
const endpointArtifactUrl = new URL('../public/data/fibre_endpoints.json', import.meta.url);

function runLockedPython(source) {
  return spawnSync('uv', [
    'run', '--python', '3.13.1', '--offline',
    '--with-requirements', 'tools/assets/requirements.lock',
    'python', '-c', source,
  ], {
    cwd: repoUrl,
    encoding: 'utf8',
    env: { ...process.env, PYTHONPATH: '.' },
  });
}

test('endpoint classifier distinguishes direct, nearest, ambiguous, unsupported, and outside assignments', () => { // Tests INV-13; Tests FAIL-11
  const result = runLockedPython(String.raw`
import json
import numpy as np
from tools.assets.endpoints import build_label_index, classify_points

labels = np.zeros((6, 6, 6), dtype=np.int16)
labels[1, 1, 1] = 8
labels[3, 1, 1] = 7
labels[5, 5, 5] = 99
index = build_label_index(labels, np.eye(4, dtype=np.float64))
records = classify_points(
    np.asarray([
        [1.0, 1.0, 1.0],
        [1.0, 1.0, 2.2],
        [2.0, 1.0, 1.0],
        [5.0, 5.0, 5.0],
        [20.0, 20.0, 20.0],
    ], dtype=np.float64),
    index,
    {8: 'region.v1', 7: 'region.v2'},
    max_distance_mm=2.0,
    ambiguity_margin_mm=0.5,
)
print(json.dumps(records, sort_keys=True))
`);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), [
    { candidates: [], distanceHundredths: 0, entity: 'region.v1', status: 'known-direct' },
    { candidates: [], distanceHundredths: 120, entity: 'region.v1', status: 'known-nearest' },
    { candidates: ['region.v1', 'region.v2'], distanceHundredths: 100, entity: null, status: 'ambiguous' },
    { candidates: [], distanceHundredths: 0, entity: null, status: 'unknown-unsupported-label' },
    { candidates: [], distanceHundredths: 2598, entity: null, status: 'unknown-outside-support' },
  ]);
});

test('checked endpoint pipeline, preset catalog, and generated artifact exist', () => { // Tests INV-13
  assert.equal(existsSync(endpointModuleUrl), true, 'missing tools/assets/endpoints.py');
  assert.equal(existsSync(presetUrl), true, 'missing public/data/fibre_filter_presets.json');
  assert.equal(existsSync(endpointArtifactUrl), true, 'missing public/data/fibre_endpoints.json');

  const presets = JSON.parse(readFileSync(presetUrl, 'utf8'));
  assert.equal(presets.schemaVersion, 1);
  assert.deepEqual(presets.specialSelectors.map(({ id }) => id), [
    'endpoint.unknown',
    'endpoint.ambiguous',
  ]);
  assert.deepEqual(presets.presets.map(({ id, query, hemispherePolicy }) => ({
    id,
    mode: query.mode,
    hemispherePolicy,
  })), [
    { id: 'fibre-filter.extrastriate', mode: 'touches-any', hemispherePolicy: 'inherit-scene' },
    { id: 'fibre-filter.ventral', mode: 'touches-any', hemispherePolicy: 'inherit-scene' },
    { id: 'fibre-filter.dorsal', mode: 'touches-any', hemispherePolicy: 'inherit-scene' },
    { id: 'fibre-filter.integrated-stream', mode: 'connects-between', hemispherePolicy: 'inherit-scene' },
  ]);

  const endpoints = JSON.parse(readFileSync(endpointArtifactUrl, 'utf8'));
  assert.equal(endpoints.schemaVersion, 1);
  assert.equal(endpoints.method.maxDistanceMm, 2);
  assert.equal(endpoints.method.ambiguityMarginMm, 0.5);
  assert.equal(endpoints.method.probability, 'unavailable-categorical-mpm');
  assert.equal(endpoints.method.endpointSemantics, 'unordered-geometry-not-polarity');
  assert.deepEqual(endpoints.space.atlasGrid, {
    shape: [193, 229, 193],
    affine: [
      [1, 0, 0, -96],
      [0, 1, 0, -132],
      [0, 0, 1, -78],
      [0, 0, 0, 1],
    ],
    qformCode: 1,
    sformCode: 1,
  });
  assert.equal(endpoints.counts.associationFibres, 2880);
  assert.equal(endpoints.counts.swmFibres, 15000);
  assert.equal(endpoints.counts.endpoints, 35760);
  assert.deepEqual(endpoints.counts.fibreQuality, {
    known: 4916,
    unknown: 8213,
    ambiguous: 4751,
  });
  assert.equal(endpoints.association.length, 8);
  assert.equal(endpoints.swm.endpoints.length, 15000);
  assert.equal(endpoints.swm.hemispheres.length, 15000);
  assert.deepEqual(endpoints.presets, [
    {
      id: 'fibre-filter.extrastriate',
      included: { association: 683, swm: 1001, total: 1684, L: 775, R: 909 },
      includedQuality: { known: 1162, unknown: 148, ambiguous: 374 },
      populationQuality: { known: 4916, unknown: 8213, ambiguous: 4751 },
    },
    {
      id: 'fibre-filter.ventral',
      included: { association: 693, swm: 1137, total: 1830, L: 892, R: 938 },
      includedQuality: { known: 1266, unknown: 150, ambiguous: 414 },
      populationQuality: { known: 4916, unknown: 8213, ambiguous: 4751 },
    },
    {
      id: 'fibre-filter.dorsal',
      included: { association: 1178, swm: 2002, total: 3180, L: 1499, R: 1681 },
      includedQuality: { known: 1986, unknown: 514, ambiguous: 680 },
      populationQuality: { known: 4916, unknown: 8213, ambiguous: 4751 },
    },
    {
      id: 'fibre-filter.integrated-stream',
      included: { association: 168, swm: 159, total: 327, L: 123, R: 204 },
      includedQuality: { known: 327, unknown: 0, ambiguous: 0 },
      populationQuality: { known: 4916, unknown: 8213, ambiguous: 4751 },
    },
  ]);

  const help = spawnSync('uv', [
    'run', '--python', '3.13.1', '--offline',
    '--with-requirements', 'tools/assets/requirements.lock',
    'python', '-m', 'tools.assets', 'build', '--help',
  ], { cwd: repoUrl, encoding: 'utf8' });
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /\bendpoints\b/);
});
