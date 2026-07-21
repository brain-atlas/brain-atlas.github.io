import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { parseLesson } from '../src/lesson/index.js';
import { TEST_CATALOG } from '../test-fixtures/lesson-context.js';

const fixture = (name) => readFile(new URL(`./fixtures/lessons/${name}`, import.meta.url), 'utf8');

function minimalSource(sceneOverrides = '') {
  return `---
title: Test lesson
schema: 1
---

# Introduction

Ordinary prose.

\`\`\`atlas-scene
id: test-scene
visual: atlas
camera: home
show: [region.lgn]
controls:
  mode: guided
layout: dominant
${sceneOverrides}\`\`\`

## Scene prose

Content remains Markdown.
`;
}

test('reference Markdown parses into an immutable ordered lesson with complete snapshots', async () => {
  const result = parseLesson(await fixture('visual-field-crossing.md'), TEST_CATALOG);

  assert.equal(result.ok, true);
  assert.equal(result.value.schemaVersion, 1);
  assert.equal(result.value.id, null);
  assert.equal(result.value.title, 'How visual fields cross');
  assert.equal(result.value.visuals[0].id, 'retinotopy-diagram');
  assert.match(result.value.introductionMarkdown, /Headings and lists remain ordinary prose/);
  assert.equal(result.value.scenes.length, 2);
  assert.deepEqual(result.value.scenes.map(({ id }) => id), ['chiasm', 'relay']);
  assert.equal(result.value.scenes[0].source.line, 22);
  assert.deepEqual(result.value.scenes[0].fidelityIds, [
    'fidelity.anterior-pathway',
    'fidelity.julich-regions',
  ]);
  assert.match(result.value.scenes[0].proseMarkdown, /^## Crossing at the chiasm/);
  assert.doesNotMatch(result.value.scenes[0].proseMarkdown, /atlas-scene/);
  assert.equal(result.value.scenes[1].snapshot.playback.playing, false);
  assert.equal(result.value.scenes[1].snapshot.visual.id, 'retinotopy-diagram');
  assert.equal(Object.isFrozen(result.value), true);
  assert.deepEqual(JSON.parse(JSON.stringify(result.value)), result.value);
});

test('a second entity fixture parses without vision-specific rules and keeps inert code prose', async () => {
  const result = parseLesson(await fixture('frontoparietal-orientation.md'), TEST_CATALOG);

  assert.equal(result.ok, true);
  assert.equal(result.value.id, 'frontoparietal-orientation');
  assert.deepEqual(result.value.scenes[0].snapshot.visibility.entities, [
    'region.dlpfc', 'region.spl7a', 'tract.slf1',
  ]);
  assert.deepEqual(result.value.scenes[0].snapshot.hemispheres.entities['tract.slf1'], {
    L: true,
    R: false,
  });
  assert.match(result.value.scenes[0].proseMarkdown, /```js/);
  assert.match(result.value.scenes[0].proseMarkdown, /console\.log/);
});

test('declared reference-style images retain their required source and alt text', async () => {
  const source = (await fixture('visual-field-crossing.md')).replace(
    'The declared image is learner-facing content with complete alternative metadata.',
    '![Diagram showing nasal and temporal retinal fields][retinotopy]\n\n[retinotopy]: https://example.org/retinotopy.png\n\nThe declared image is learner-facing content with complete alternative metadata.',
  );
  const result = parseLesson(source, TEST_CATALOG);
  assert.equal(result.ok, true);
  assert.match(result.value.scenes[1].proseMarkdown, /!\[Diagram showing nasal and temporal retinal fields\]\[retinotopy\]/);
});

test('multiple declared alt texts may safely share one HTTPS visual source', () => {
  const source = minimalSource()
    .replace(
      'schema: 1',
      'schema: 1\nvisuals:\n  - { id: shared-first, type: image, alt: First view, caption: First, credit: Author, src: https://example.org/shared.png, source: https://example.org/source }\n  - { id: shared-second, type: image, alt: Second view, caption: Second, credit: Author, src: https://example.org/shared.png, source: https://example.org/source }',
    )
    .replace('Ordinary prose.', '![First view](https://example.org/shared.png)');
  const result = parseLesson(source, TEST_CATALOG);
  assert.equal(result.ok, true);
});

test('ordinary headings and lists do not create scenes without explicit directives', () => {
  const source = `---\ntitle: Prose only\nschema: 1\n---\n\n# Heading\n\n- one\n- two\n`;
  const result = parseLesson(source, TEST_CATALOG);

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics[0].code, 'lesson.scene.missing');
});

test('unsafe Markdown and undeclared images are rejected without a partial lesson', () => {
  const cases = [
    [minimalSource().replace('Ordinary prose.', '<script>alert(1)</script>'), 'markdown.raw-html'],
    [minimalSource().replace('Ordinary prose.', '[run](javascript:alert(1))'), 'markdown.unsafe-url'],
    [minimalSource().replace('Ordinary prose.', '[data](data:text/html,unsafe)'), 'markdown.unsafe-url'],
    [minimalSource().replace('Ordinary prose.', '[credentials](https://user:secret@example.org/)'), 'markdown.unsafe-url'],
    [minimalSource().replace('Ordinary prose.', '[run][unsafe]\n\n[unsafe]: javascript:alert(1)'), 'markdown.unsafe-url'],
    [minimalSource().replace('Ordinary prose.', '![unknown](https://example.org/x.png)'), 'markdown.undeclared-image'],
    [minimalSource().replace('Ordinary prose.', '![unknown][asset]\n\n[asset]: https://example.org/x.png'), 'markdown.undeclared-image'],
  ];

  for (const [source, code] of cases) {
    const result = parseLesson(source, TEST_CATALOG);
    assert.equal(result.ok, false);
    assert.equal('value' in result, false);
    assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === code), true);
  }
});

test('unknown fidelity references fail with positioned diagnostics', () => {
  const source = minimalSource().replace(
    'show: [region.lgn]',
    'show: [region.lgn]\nfidelity: [fidelity.unknown]',
  );
  const result = parseLesson(source, TEST_CATALOG);

  assert.equal(result.ok, false);
  const diagnostic = result.diagnostics.find(({ code }) => code === 'scene.semantic.unknown-fidelity');
  assert.equal(diagnostic.path, '/fidelity/0');
  assert.equal(diagnostic.line, 15);
});

test('malformed YAML and unknown fields or IDs include line and field diagnostics', () => {
  const malformed = parseLesson(minimalSource('selection: [unterminated\n'), TEST_CATALOG);
  assert.equal(malformed.ok, false);
  assert.equal(malformed.diagnostics[0].code, 'scene.yaml.parse');
  assert.ok(malformed.diagnostics[0].line >= 18);

  const unknown = parseLesson(
    minimalSource().replace('show: [region.lgn]', 'show: [region.unknown]'),
    TEST_CATALOG,
  );
  assert.equal(unknown.ok, false);
  const diagnostic = unknown.diagnostics.find(({ code }) => code === 'scene.semantic.unknown-entity');
  assert.equal(diagnostic.path, '/show/0');
  assert.equal(diagnostic.line, 14);
  assert.equal(diagnostic.column, 8);
});

test('duplicate declared visual IDs are rejected before scene activation', () => {
  const source = minimalSource().replace(
    'schema: 1',
    `schema: 1
visuals:
  - id: duplicate
    type: image
    src: https://example.org/a.png
    alt: First
    caption: First
    credit: Author
    source: https://example.org/a
  - id: duplicate
    type: image
    src: https://example.org/b.png
    alt: Second
    caption: Second
    credit: Author
    source: https://example.org/b`,
  );
  const result = parseLesson(source, TEST_CATALOG);

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.some(({ code }) => code === 'lesson.visual.duplicate'), true);
});

test('duplicate scene IDs and nested scene directives are rejected', () => {
  const duplicate = `${minimalSource()}\n\`\`\`atlas-scene\nid: test-scene\nvisual: atlas\ncamera: home\nshow: []\ncontrols: { mode: guided }\nlayout: dominant\n\`\`\``;
  const duplicateResult = parseLesson(duplicate, TEST_CATALOG);
  assert.equal(duplicateResult.ok, false);
  assert.equal(duplicateResult.diagnostics.some(({ code }) => code === 'lesson.scene.duplicate'), true);

  const nested = minimalSource().replace(
    'Ordinary prose.',
    '> ```atlas-scene\n> id: hidden\n> ```',
  );
  const nestedResult = parseLesson(nested, TEST_CATALOG);
  assert.equal(nestedResult.ok, false);
  assert.equal(nestedResult.diagnostics.some(({ code }) => code === 'scene.directive.nested'), true);
});
