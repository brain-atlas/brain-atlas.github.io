import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { createLessonCatalog } from '../src/lesson/index.js';
import { validateLessonImport } from '../src/ui/lesson-import.js';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const catalog = createLessonCatalog(...[
  'entities', 'fidelity', 'fibre_filter_presets',
].map((name) => JSON.parse(read(`public/data/${name}.json`))));
const source = read('src/lessons/retina-to-v1.md');
const record = (id) => ({ id, license: 'AGPL-3.0-only', review: 'docs/lessons/retina-to-v1-validation.md', media: [] });
test('filesystem check rejects malformed lessons and missing review evidence', async (t) => {
  const module = await import('../scripts/check-lessons.mjs').catch(() => ({}));
  assert.equal(typeof module.checkLessons, 'function', 'filesystem checker exists');
  const root = mkdtempSync(join(tmpdir(), 'brain-atlas-library-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const dir of ['src/lessons', 'public/data', 'docs/lessons']) mkdirSync(join(root, dir), { recursive: true });
  for (const name of ['entities', 'fidelity', 'fibre_filter_presets']) {
    writeFileSync(join(root, `public/data/${name}.json`), read(`public/data/${name}.json`));
  }
  cpSync(new URL('../LICENSE', import.meta.url), join(root, 'LICENSE'));
  writeFileSync(join(root, 'src/lessons/library.json'), JSON.stringify([record('one')]));
  writeFileSync(join(root, 'src/lessons/one.md'), source);
  const url = pathToFileURL(`${root}/`);
  assert.throws(() => module.checkLessons(url), /retina-to-v1-validation.md/);
  writeFileSync(join(root, record('one').review), 'Fixture review evidence, not a scientific approval.');
  assert.equal(module.checkLessons(url).library.length, 1);
  writeFileSync(join(root, 'src/lessons/one.md'), source.replace('schema: 1', 'schema: 99'));
  assert.throws(() => module.checkLessons(url), /one.md:\d+:\d+.*lesson.schema/);
});

const load = async () => {
  const module = await import('../src/ui/lesson-library.js').catch(() => ({}));
  assert.equal(typeof module.createLessonLibrary, 'function', 'shared library validator exists');
  return module.createLessonLibrary;
};

test('library uses import candidates and preserves distinct ordered entries (UI INV-25)', async () => {
  const create = await load();
  const second = source.replaceAll('Early Vision: Retina to the Cortical Streams', 'Second fixture lesson');
  const library = create([record('first'), record('second')], { 'first.md': source, 'second.md': second }, catalog);
  assert.deepEqual(library.map(({ id }) => id), ['first', 'second']);
  assert.deepEqual(library[0].candidate, validateLessonImport(source, catalog).value);
  assert.equal(library[1].candidate.lesson.title, 'Second fixture lesson');
  assert.equal(library[0].entry.summary, library[0].candidate.lesson.summary);
  assert.equal(Object.isFrozen(library), true);
  assert.equal(Object.isFrozen(library[0]), true);
});

test('library fails closed on invalid registry, source, or evidence metadata (UI INV-17)', async () => {
  const create = await load();
  for (const [records, sources, expected] of [
    [[], {}, /non-empty/],
    [[record('local')], { 'local.md': source }, /ID/],
    [[record('../escape')], {}, /ID/],
    [[record('one'), record('one')], { 'one.md': source }, /duplicate/],
    [[record('one')], {}, /missing source/],
    [[record('one')], { 'one.md': source, 'extra.md': source }, /unregistered/],
    [[{ ...record('one'), license: '' }], { 'one.md': source }, /license/],
    [[{ ...record('one'), review: '../secret.md' }], { 'one.md': source }, /review/],
    [[{ ...record('one'), reviewed: true }], { 'one.md': source }, /fields/],
    [[record('one')], { 'one.md': source.replace('schema: 1', 'schema: 99') }, /one.md:\d+:\d+.*lesson.schema/],
    [[record('one')], { 'one.md': source.replace(/^summary:.*\n/m, '') }, /summary/],
    [[{ ...record('one'), media: [{ id: 'absent', license: 'CC0-1.0' }] }], { 'one.md': source }, /media/],
  ]) assert.throws(() => create(records, sources, catalog), expected);
});
