import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LESSON_SCHEMA_VERSION,
  validateLessonMetadata,
  validateSceneDirective,
} from '../src/lesson/schemas.js';
import { createDiagnostic } from '../src/lesson/diagnostics.js';

const validMetadata = {
  title: 'How visual fields cross',
  schema: 1,
  visuals: [{
    id: 'retinotopy-diagram',
    type: 'image',
    src: 'https://example.org/retinotopy.png',
    alt: 'Nasal and temporal retinal fields',
    caption: 'Visual-field projection before the chiasm',
    credit: 'Example Author',
    source: 'https://example.org/source',
  }],
};

const validScene = {
  id: 'chiasm',
  visual: 'atlas',
  camera: 'lateral',
  show: ['pathway.anterior', 'region.lgn'],
  controls: { mode: 'look' },
  layout: 'dominant',
};

test('schema version and structured diagnostic records are stable plain data', () => {
  assert.equal(LESSON_SCHEMA_VERSION, 1);
  assert.deepEqual(
    createDiagnostic('lesson.test', 'Example message', {
      line: 4,
      column: 7,
      path: '/visuals/0/src',
    }),
    {
      code: 'lesson.test',
      message: 'Example message',
      line: 4,
      column: 7,
      path: '/visuals/0/src',
    },
  );
});

test('valid lesson metadata and explicit scene directives pass strict schemas', () => {
  assert.deepEqual(validateLessonMetadata(validMetadata), []);
  assert.deepEqual(validateSceneDirective(validScene), []);
});

test('unknown lesson schema versions and unknown fields are rejected', () => {
  const versionErrors = validateLessonMetadata({ ...validMetadata, schema: 2 });
  assert.equal(versionErrors[0].code, 'lesson.schema.const');
  assert.equal(versionErrors[0].path, '/schema');

  const fieldErrors = validateSceneDirective({ ...validScene, onEnter: 'run-code' });
  assert.equal(fieldErrors[0].code, 'scene.schema.additionalProperties');
  assert.equal(fieldErrors[0].path, '/onEnter');
});

test('supplementary visuals require complete metadata and HTTPS sources', () => {
  const diagnostics = validateLessonMetadata({
    ...validMetadata,
    visuals: [{
      id: 'unsafe',
      type: 'image',
      src: 'javascript:alert(1)',
      alt: '',
      caption: 'Unsafe image',
      credit: 'Unknown',
      source: 'http://example.org/source',
    }],
  });

  assert.deepEqual(
    diagnostics.map(({ path }) => path).sort(),
    ['/visuals/0/alt', '/visuals/0/source', '/visuals/0/src'],
  );
});

test('schema diagnostics use a supplied field locator', () => {
  const diagnostics = validateSceneDirective(
    { ...validScene, layout: 'invented' },
    {
      origin: { line: 10, column: 1 },
      locate(path) {
        return path === '/layout' ? { line: 16, column: 9 } : null;
      },
    },
  );

  assert.deepEqual(diagnostics[0], {
    code: 'scene.schema.enum',
    message: 'must be equal to one of the allowed values',
    line: 16,
    column: 9,
    path: '/layout',
  });
});
