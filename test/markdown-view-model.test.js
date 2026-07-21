import assert from 'node:assert/strict';
import test from 'node:test';

import { markdownToViewModel } from '../src/ui/markdown-view-model.js';

test('validated Markdown becomes a frozen semantic plain-data tree', () => {
  const model = markdownToViewModel(`# Relay\n\nThe **LGN** relays *retinal* input.\n\n- First\n- Second\n\n\`V1\``);

  assert.equal(model.type, 'root');
  assert.deepEqual(model.children.map(({ type }) => type), [
    'heading', 'paragraph', 'list', 'paragraph',
  ]);
  assert.deepEqual(model.children[0], {
    type: 'heading',
    depth: 1,
    children: [{ type: 'text', value: 'Relay' }],
  });
  assert.equal(model.children[1].children[1].type, 'strong');
  assert.equal(model.children[1].children[3].type, 'emphasis');
  assert.equal(model.children[2].ordered, false);
  assert.equal(model.children[3].children[0].type, 'inlineCode');
  assert.equal(Object.isFrozen(model), true);
  assert.equal(Object.isFrozen(model.children[1].children), true);
  assert.doesNotThrow(() => JSON.stringify(model));
});

test('safe inline and reference links resolve without emitting HTML strings', () => {
  const model = markdownToViewModel(`Read [Jülich](https://doi.org/10.1126/science.abb4588) and [methods][m].\n\n[m]: https://example.org/method`);
  const paragraph = model.children[0];
  const links = paragraph.children.filter(({ type }) => type === 'link');

  assert.deepEqual(links.map(({ url }) => url), [
    'https://doi.org/10.1126/science.abb4588',
    'https://example.org/method',
  ]);
  assert.equal(JSON.stringify(model).includes('<a'), false);
});

test('code remains inert and raw HTML or unsafe URLs are rejected defensively', () => {
  const code = markdownToViewModel('```js\nalert("inert")\n```');
  assert.deepEqual(code.children[0], {
    type: 'code', lang: 'js', value: 'alert("inert")',
  });

  assert.throws(() => markdownToViewModel('<script>alert(1)</script>'), /raw HTML/i);
  assert.throws(() => markdownToViewModel('[run](javascript:alert(1))'), /unsafe URL/i);
  assert.throws(() => markdownToViewModel('[secret](https://user:pass@example.org/)'), /unsafe URL/i);
});

test('blockquote, ordered list, line break, and thematic break retain semantics', () => {
  const model = markdownToViewModel('> A note  \n> continues\n\n1. One\n2. Two\n\n---');
  assert.deepEqual(model.children.map(({ type }) => type), [
    'blockquote', 'list', 'thematicBreak',
  ]);
  assert.equal(model.children[0].children[0].children[1].type, 'break');
  assert.equal(model.children[1].ordered, true);
  assert.equal(model.children[1].start, 1);
});
