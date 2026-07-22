import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
}

const COMMON_SPACE = Object.freeze({
  coordinateConvention: 'RAS+',
  units: 'mm',
  templateConversion: 'none; decoded source RAS+ frame retained through resampling',
});

const EXPECTED_SPACES = new Map([
  ['../public/data/tracts.json', {
    template: 'ICBM 2009a Nonlinear Asymmetric',
    templateVariantEvidence: 'direct source record',
    ...COMMON_SPACE,
  }],
  ...['../public/data/or_fibres.json', '../public/data/swm_fibres.json'].map((path) => [path, {
    template: 'ICBM152 nonlinear 2009a',
    templateVariantEvidence: 'asymmetric indicated by release-companion T1; exact FIB build binding unavailable',
    ...COMMON_SPACE,
  }]),
]);

test('every fibre asset declares its verified source world-coordinate contract and limits', () => {
  for (const [path, expected] of EXPECTED_SPACES) {
    const data = loadJson(path);
    assert.deepEqual(data.space, expected, path);
  }
});

test('provenance metadata correction preserves every fibre coordinate and length value', () => {
  const tracts = loadJson('../public/data/tracts.json');
  const opticRadiation = loadJson('../public/data/or_fibres.json');
  const superficialWhiteMatter = loadJson('../public/data/swm_fibres.json');

  assert.equal(
    digest(tracts.tracts),
    'e2c1486875de14e39f4b1a047db9841e4253b334fecf80c1ef55c255df940c70',
  );
  assert.equal(
    digest({ n: opticRadiation.n, np: opticRadiation.np, fibres: opticRadiation.fibres }),
    'b89152176bd9a96796a02e449a4a34151572512def61014d04833336b6695b6e',
  );
  assert.equal(
    digest({
      n: superficialWhiteMatter.n,
      np: superficialWhiteMatter.np,
      len: superficialWhiteMatter.len,
      lloc: superficialWhiteMatter.lloc,
      fibres: superficialWhiteMatter.fibres,
    }),
    '9dfc14d565c8f7ccb4c57ba0d2eee1bd9dca0549e3c7d07f70d6fe47f07f4331',
  );
});
