import assert from 'node:assert/strict';
import test from 'node:test';

import { TEST_CATALOG } from '../test-fixtures/lesson-context.js';
import { normalizeCanonicalSnapshot } from '../src/lesson/scene-state.js';

const importModule = await import('../src/ui/lesson-import.js').catch(() => ({}));
const {
  createLessonRuntimeCatalog,
  validateLessonImport,
  MAX_LESSON_SOURCE_BYTES,
} = importModule;

function importedSource() {
  return `---
title: Imported visual lesson
schema: 1
status: draft
entryScene: overview
visuals:
  - id: diagram.one
    type: image
    src: https://cdn.example.org/one.png
    alt: First visual field diagram
    caption: First diagram
    credit: Example author
    source: https://source.example.org/one
  - id: diagram.two
    type: image
    src: https://cdn.example.org/two.png
    alt: Second visual field diagram
    caption: Second diagram
    credit: Example author
    source: https://source.example.org/two
---

# Imported visual lesson

Local introduction.

\`\`\`atlas-scene
id: overview
visual: atlas
camera: home
show: [region.lgn]
fidelity: [fidelity.julich-regions]
controls: { mode: guided }
layout: dominant
\`\`\`

## Overview

Entry view.

\`\`\`atlas-scene
id: compare
visual: diagram.one
camera: home
show: [region.lgn]
fidelity: [fidelity.julich-regions]
controls: { mode: guided }
layout: split
\`\`\`

## Compare

Visual comparison.
`;
}

test('lesson import exposes a bounded pure validation contract', () => { // Tests INV-17
  assert.equal(typeof validateLessonImport, 'function');
  assert.equal(MAX_LESSON_SOURCE_BYTES, 512 * 1024);
});

test('valid local source produces a frozen preview without changing its text', () => { // Tests INV-17
  const source = importedSource();
  const result = validateLessonImport(source, TEST_CATALOG);

  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal(result.value.lesson.title, 'Imported visual lesson');
  assert.equal(result.value.presentation.entryScene.id, 'overview');
  assert.deepEqual(result.value.summary, {
    title: 'Imported visual lesson',
    status: 'draft',
    statusLabel: '[DRAFT]',
    sceneCount: 1,
    imageCount: 2,
    externalHosts: ['cdn.example.org'],
  });
  assert.equal(source, importedSource());
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.value), true);
  assert.equal(Object.isFrozen(result.value.summary.externalHosts), true);
});

test('runtime catalog extends visual IDs without mutating or freezing the base catalog', () => { // Tests INV-17
  const result = validateLessonImport(importedSource(), TEST_CATALOG);
  assert.equal(result.ok, true);
  assert.equal(typeof createLessonRuntimeCatalog, 'function');
  const mutableCatalog = {
    ...TEST_CATALOG,
    visualIds: [...TEST_CATALOG.visualIds],
    consumerMetadata: { untouched: true },
  };
  const runtimeCatalog = createLessonRuntimeCatalog(mutableCatalog, result.value.lesson);
  const imageScene = result.value.presentation.scenes[0];

  assert.deepEqual(runtimeCatalog.visualIds, [
    'atlas', 'diagram.one', 'diagram.two', 'retinotopy-diagram',
  ]);
  assert.deepEqual(mutableCatalog.visualIds, ['atlas', 'retinotopy-diagram']);
  assert.equal(Object.isFrozen(mutableCatalog.visualIds), false);
  assert.equal(Object.isFrozen(mutableCatalog.consumerMetadata), false);
  assert.equal(Object.isFrozen(runtimeCatalog), true);
  assert.equal(Object.isFrozen(runtimeCatalog.visualIds), true);
  assert.doesNotThrow(() => normalizeCanonicalSnapshot(imageScene.snapshot, runtimeCatalog));
  assert.throws(
    () => normalizeCanonicalSnapshot(imageScene.snapshot, TEST_CATALOG),
    (error) => error.diagnostics?.some(({ message }) => message === 'unknown visual ID: diagram.one'),
  );
});

test('empty and oversized sources fail before parsing with actionable diagnostics', () => { // Tests FAIL-16
  const empty = validateLessonImport('  \n', TEST_CATALOG);
  assert.deepEqual(empty, {
    ok: false,
    diagnostics: [{
      code: 'import.source.empty',
      message: 'Paste lesson Markdown or choose a local Markdown file.',
      line: 1,
      column: 1,
      path: '',
    }],
  });
  assert.equal(Object.isFrozen(empty), true);

  const oversized = validateLessonImport('x'.repeat(MAX_LESSON_SOURCE_BYTES + 1), TEST_CATALOG);
  assert.equal(oversized.ok, false);
  assert.equal(oversized.diagnostics[0].code, 'import.source.too-large');
  assert.match(oversized.diagnostics[0].message, /512 KiB/);

  const oversizedUnicode = validateLessonImport('🙂'.repeat(140_000), TEST_CATALOG);
  assert.equal(oversizedUnicode.diagnostics[0].code, 'import.source.too-large');
});

test('parser diagnostics pass through without exposing partial lesson data', () => { // Tests FAIL-16
  const result = validateLessonImport(
    importedSource().replace('show: [region.lgn]', 'show: [region.unknown]'),
    TEST_CATALOG,
  );

  assert.equal(result.ok, false);
  assert.equal('value' in result, false);
  const diagnostic = result.diagnostics.find(({ code }) => code === 'scene.semantic.unknown-entity');
  assert.ok(diagnostic.line > 1);
  assert.equal(diagnostic.path, '/show/0');
  assert.equal(Object.isFrozen(result.diagnostics), true);
});

test('a lesson without scene fidelity records fails presentation validation', () => { // Tests FAIL-17
  const source = importedSource().replaceAll('fidelity: [fidelity.julich-regions]\n', '');
  const result = validateLessonImport(source, TEST_CATALOG);

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, 'import.presentation.invalid');
  assert.match(result.diagnostics[0].message, /fidelity record/i);
  assert.ok(result.diagnostics[0].line > 1);
});

test('a lesson with only its entry scene fails presentation validation', () => { // Tests FAIL-17
  const source = importedSource().slice(0, importedSource().indexOf('```atlas-scene\nid: compare'));
  const result = validateLessonImport(source, TEST_CATALOG);

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, 'import.presentation.invalid');
  assert.match(result.diagnostics[0].message, /instructional scene/i);
  assert.equal('value' in result, false);
});
