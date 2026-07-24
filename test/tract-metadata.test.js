import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { assertTractMetadataMatches, projectTractMetadata } from '../src/tract-metadata.js';

const loadJson = async (path) => JSON.parse(await readFile(new URL(path, import.meta.url), 'utf8'));

test('checked tract metadata is the exact geometry-free projection of the association asset', async () => { // Tests INV-56
  const source = await loadJson('../public/data/tracts.json');
  const checked = await loadJson('../public/data/tracts_metadata.json');

  assert.deepEqual(checked, projectTractMetadata(source));
  assert.equal(JSON.stringify(checked).includes('"L"'), false);
  assert.equal(JSON.stringify(checked).includes('"R"'), false);
});

test('runtime metadata matching rejects source or space drift before geometry binding', async () => { // Tests FAIL-49
  const source = await loadJson('../public/data/tracts.json');
  const checked = await loadJson('../public/data/tracts_metadata.json');

  assert.throws(
    () => assertTractMetadataMatches({ ...source, source: 'different source' }, checked),
    /source differs/,
  );
  assert.throws(
    () => assertTractMetadataMatches({ ...source, space: { ...source.space, units: 'voxels' } }, checked),
    /space differs/,
  );
});
