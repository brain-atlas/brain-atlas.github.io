import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const bootstrapSource = readFileSync(new URL('../src/bootstrap.js', import.meta.url), 'utf8');

test('the WebGL2 capability probe does not deliberately trigger context loss', () => {
  assert.match(bootstrapSource, /getContext\('webgl2'\)/);
  assert.equal(/WEBGL_lose_context|\.loseContext\(\)/.test(bootstrapSource), false);
});
