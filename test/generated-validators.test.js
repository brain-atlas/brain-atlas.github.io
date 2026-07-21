import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import * as validators from '../src/lesson/generated-validators.js';

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('checked-in lesson validators are CSP-safe standalone functions', async () => {
  const [generated, runtimeSchemas] = await Promise.all([
    source('src/lesson/generated-validators.js'),
    source('src/lesson/schemas.js'),
  ]);

  assert.equal(Object.keys(validators).length, 15);
  assert.match(generated, /CSP-safe: schemas compile during development/);
  assert.doesNotMatch(generated, /\bnew Function\b|\beval\s*\(|\brequire\s*\(/);
  assert.doesNotMatch(runtimeSchemas, /from ['"]ajv['"]|\bnew Ajv\b/);
  assert.equal(typeof validators.lessonMetadata, 'function');
  assert.equal(typeof validators.commandSceneReplace, 'function');
});
