import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createRegionCatalogGroups } from '../src/ui/region-catalog.js';

const manifest = JSON.parse(await readFile(new URL('../public/data/julich_regions.json', import.meta.url), 'utf8'));

const streamLabels = {
  subcortical: 'Subcortical',
  early: 'Early / shared',
  ventral: 'Ventral — “what”',
  dorsal: 'Dorsal — “where / how”',
  temporal: 'Temporal targets',
  parietal: 'Inferior parietal',
  frontal: 'Frontal targets',
  gap: 'Unparcellated (GapMap)',
};

test('region catalog groups current and optional Jülich records without changing availability', () => {
  const groups = createRegionCatalogGroups(manifest.regions, streamLabels);
  const current = groups.filter(({ kind }) => kind === 'lesson-current').flatMap(({ regions }) => regions);
  const available = groups.filter(({ kind }) => kind === 'atlas-available').flatMap(({ regions }) => regions);

  assert.equal(current.length, 45);
  assert.equal(available.length, 112);
  assert.deepEqual(groups.filter(({ kind }) => kind === 'lesson-current').map(({ label }) => label), Object.values(streamLabels));
  assert.deepEqual(new Set(available.map(({ catalogStatus }) => catalogStatus)), new Set(['atlas-available']));
  assert.deepEqual(
    groups.filter(({ kind }) => kind === 'atlas-available').map(({ label }) => label),
    ['Diencephalon', 'Metencephalon', 'Telencephalon', 'Unresolved hierarchy'],
  );
  assert.equal(Object.isFrozen(groups), true);
});

test('region catalog search covers source name, atlas ID, and licensed hierarchy paths', () => {
  assert.deepEqual(
    createRegionCatalogGroups(manifest.regions, streamLabels, 'Medial Accumbens')
      .flatMap(({ regions }) => regions).map(({ entityId }) => entityId),
    ['region.julich-138'],
  );
  assert.ok(
    createRegionCatalogGroups(manifest.regions, streamLabels, 'amygdala')
      .flatMap(({ regions }) => regions).some(({ entityId }) => entityId === 'region.julich-065'),
  );
  assert.ok(
    createRegionCatalogGroups(manifest.regions, streamLabels, 'hOc1')
      .flatMap(({ regions }) => regions).some(({ entityId }) => entityId === 'region.v1'),
  );
});
