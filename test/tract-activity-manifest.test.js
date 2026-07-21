import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ASSOCIATION_TRACT_ORDER,
  associationGroupsFromManifest,
  associationModelFromManifest,
  DEFAULT_ASSOCIATION_MODEL,
  DEFAULT_ASSOCIATION_SEED,
} from '../src/activity/association-impulses.js';

async function loadJson(relativePath) {
  try {
    return JSON.parse(await readFile(new URL(relativePath, import.meta.url), 'utf8'));
  } catch (error) {
    assert.fail(`${relativePath} is unavailable: ${error.message}`);
  }
}

const loadManifest = () => loadJson('../public/data/tract_activity.json');

test('activity manifest records the approved seeded model', async () => {
  const manifest = await loadManifest();

  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.model.seed, DEFAULT_ASSOCIATION_SEED);
  assert.equal(manifest.model.channelsPerGroup, DEFAULT_ASSOCIATION_MODEL.channelsPerGroup);
  assert.equal(manifest.model.refractoryModelSeconds, DEFAULT_ASSOCIATION_MODEL.refractory);
  assert.equal(manifest.model.recoveryTauModelSeconds, DEFAULT_ASSOCIATION_MODEL.recoveryTau);
  assert.equal(manifest.directionSamplingUnit, 'accepted-code-event');
});

test('every named association tract has bilateral 50/50 fallback metadata and sources', async () => {
  const manifest = await loadManifest();

  assert.deepEqual(manifest.tracts.map(({ id }) => id), ASSOCIATION_TRACT_ORDER);
  for (const tract of manifest.tracts) {
    assert.deepEqual(tract.probabilityAToB, { L: 0.5, R: 0.5 });
    assert.equal(tract.assumption, 'symmetric-50-50');
    assert.ok(tract.sources.length > 0);
    assert.ok(tract.sources.every((source) => source.startsWith('https://doi.org/')));
    assert.ok(['minimum', 'maximum'].includes(tract.endpointA.classifier.select));
  }

  assert.equal(manifest.tracts[0].evidenceStatus, 'qualitative-bidirectional-no-quantitative-ratio');
  assert.ok(manifest.tracts.slice(1).every(({ evidenceStatus }) => evidenceStatus === 'no-qualifying-human-direction-ratio'));
});

test('activity metadata IDs exactly match the geometry manifest', async () => {
  const [activity, geometry] = await Promise.all([
    loadManifest(),
    loadJson('../public/data/tracts.json'),
  ]);

  assert.deepEqual(
    activity.tracts.map(({ id }) => id),
    geometry.tracts.map(({ id }) => id),
  );
});

test('manifest converts to canonical engine groups and parameters', async () => {
  const manifest = await loadManifest();
  const groups = associationGroupsFromManifest(manifest);
  const model = associationModelFromManifest(manifest);

  assert.equal(groups.length, 16);
  assert.deepEqual(groups.slice(0, 3), [
    { groupId: 'ilf:L', tractId: 'ilf', hemi: 'L', probabilityAToB: 0.5 },
    { groupId: 'ilf:R', tractId: 'ilf', hemi: 'R', probabilityAToB: 0.5 },
    { groupId: 'ifof:L', tractId: 'ifof', hemi: 'L', probabilityAToB: 0.5 },
  ]);
  assert.deepEqual(model, DEFAULT_ASSOCIATION_MODEL);
});
