import assert from 'node:assert/strict';
import test from 'node:test';

import { parseLesson } from '../src/lesson/index.js';
import { markdownToViewModel } from '../src/ui/markdown-view-model.js';
import { validateLessonImport } from '../src/ui/lesson-import.js';
import { TEST_CATALOG } from '../test-fixtures/lesson-context.js';

const entry = (id, term, definition = `Definition of ${term}`, aliases = []) => ({ id, term, definition, aliases });
function source(glossary) {
  return `---\ntitle: Glossary test\nschema: 1\nglossary: ${JSON.stringify(glossary)}\n---\n\nLGN and relays.\n\n\`\`\`atlas-scene\nid: first\nvisual: atlas\ncamera: home\nshow: [region.lgn]\nfidelity: [fidelity.julich-regions]\ncontrols: {mode: guided}\nlayout: dominant\n\`\`\`\n\n## Heading\n\nMore prose.`;
}
function terms(node) {
  return [ ...(node.type === 'glossaryTerm' ? [node] : []), ...(node.children ?? []).flatMap(terms) ];
}
function text(node) {
  return node.value ?? (node.children ?? []).map(text).join('');
}

test('lesson INV-17: selected globals resolve; local override stays lesson-local and frozen', () => {
  const result = parseLesson(source({ use: ['lgn'], terms: [entry('lgn', 'Relay', 'Local meaning'), entry('local', 'Circuit')] }), TEST_CATALOG);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal(result.value.glossary.find(({ id }) => id === 'lgn').definition, 'Local meaning');
  assert.equal(result.value.glossary.length, 2);
  assert.equal(Object.isFrozen(result.value.glossary[0]), true);
  const global = parseLesson(source({ use: ['lgn'] }), TEST_CATALOG);
  assert.equal(global.ok, true);
  assert.notEqual(global.value.glossary[0].definition, 'Local meaning');
  assert.deepEqual(parseLesson(source({}), TEST_CATALOG).value.glossary, []);
  assert.equal(validateLessonImport(source({ use: ['lgn'] }), TEST_CATALOG).ok, true);
});

test('lesson FAIL-14: bad definitions, references, collisions and bounds reject without partial data', () => {
  const cases = [
    { use: ['missing'] }, { use: ['lgn', 'lgn'] }, { terms: [entry('same', 'One'), entry('same', 'Two')] },
    { terms: [entry('a', 'Relay'), entry('b', 'relay')] },
    { use: ['lgn'], terms: [entry('other', 'LGN')] },
    { terms: [entry('a', 'Relay', ' ')] }, { terms: [entry('a', ' ')] },
    { terms: [{ id: 'a', term: 'Relay' }] }, { terms: [entry('a', 'x'.repeat(81))] },
    { terms: [entry('a', 'Relay', 'x'.repeat(601))] },
    { terms: [entry('a', 'Relay', 'ok', Array.from({ length: 9 }, (_, i) => `word${i}`))] },
    { terms: [entry('a', 'Relay', 'ok', ['RELAY'])] },
    { terms: Array.from({ length: 65 }, (_, i) => entry(`t${i}`, `word${i}`)) },
    { use: ['lgn'], terms: Array.from({ length: 64 }, (_, i) => entry(`t${i}`, `word${i}`)) },
    { terms: [entry('a', 'Relay\nnext')] }, { terms: [entry('a', 'Relay', '\u0000')] },
    { extra: true }, null, [],
  ];
  for (const glossary of cases) {
    const result = validateLessonImport(source(glossary), TEST_CATALOG);
    assert.equal(result.ok, false, JSON.stringify(glossary));
    assert.equal(result.value, undefined);
    assert.ok(result.diagnostics.some(({ path }) => path.startsWith('/glossary')), JSON.stringify(result.diagnostics));
  }
});

test('lesson INV-17: limits accept bounded input and Unicode case collisions reject', () => {
  const local = Array.from({ length: 64 }, (_, index) => entry(`t${index}`, `term${index}`, 'x'.repeat(600)));
  assert.equal(validateLessonImport(source({ terms: local }), TEST_CATALOG).ok, true);
  assert.equal(validateLessonImport(source({ terms: [entry('a', 'K'), entry('b', 'K')] }), TEST_CATALOG).ok, false);
  const absent = source({}).replace('glossary: {}\n', '');
  assert.deepEqual(parseLesson(absent, TEST_CATALOG).value.glossary, []);
  assert.deepEqual(terms(markdownToViewModel('No matching spelling here', { glossary: [entry('absent', 'absent')] })), []);
});

test('lesson INV-17: hostile-looking definitions remain inert plain data and source unchanged', () => {
  const definition = '<img src=x onerror=alert(1)> [run](javascript:alert(1))';
  const raw = source({ terms: [entry('local', 'relays', definition)] });
  const result = validateLessonImport(raw, TEST_CATALOG);
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal(result.value.source, raw);
  assert.equal(result.value.lesson.glossary[0].definition, definition);
});

test('UI INV-72: first eligible text only, shared across fragments; prose text stays exact', () => {
  const glossary = [entry('lgn', 'LGN', 'A relay'), entry('tract', 'tract', 'A bundle', ['tracts'])];
  const seen = new Set();
  const markdown = '# LGN\n\n[LGN](https://example.org) `LGN` ![LGN](https://example.org/x.png)\n\n**lgn** and LGN, subtract, tractography, tracts and tract.\n\n```txt\nLGN\n```';
  const model = markdownToViewModel(markdown, { glossary, seen });
  assert.deepEqual(terms(model).map(({ id, value }) => [id, value]), [['lgn', 'lgn'], ['tract', 'tracts']]);
  assert.equal(text(model), text(markdownToViewModel(markdown)));
  assert.deepEqual(terms(markdownToViewModel('LGN tract', { glossary, seen })), []);
  assert.equal(Object.isFrozen(terms(model)[0]), true);
  assert.deepEqual(model, markdownToViewModel(markdown, { glossary }));
});

test('UI INV-72: inline formatting cannot create word boundaries or consume first eligible match', () => {
  for (const prefix of ['axon**s**', 'pre**axon**', '**axon**\u0301', '[pre](https://example.org)**axon**', '`pre`axon']) {
    const model = markdownToViewModel(`${prefix} then axon`, { glossary: [entry('axon', 'axon')] });
    assert.equal(terms(model).length, 1);
    assert.equal(model.children[0].children.at(-1).type, 'glossaryTerm', prefix);
  }
});

test('UI INV-72: longest overlap, literal punctuation, Unicode boundaries and explicit plurals', () => {
  const glossary = [entry('field', 'field'), entry('visual-field', 'visual field'), entry('relay', 'relay'), entry('punctuation', 'C++'), entry('word', 'axon')];
  const model = markdownToViewModel('Visual field; field. Relays then RELAY. C++! éaxon axoné _axon axon\u0301 axon. visual **field**.', { glossary });
  assert.deepEqual(terms(model).map(({ id, value }) => [id, value]), [
    ['visual-field', 'Visual field'], ['field', 'field'], ['relay', 'RELAY'], ['punctuation', 'C++'], ['word', 'axon'],
  ]);
  assert.deepEqual(terms(markdownToViewModel('visual **field**', { glossary: [entry('vf', 'visual field')] })), []);
});
