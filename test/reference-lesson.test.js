import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createLessonCatalog, parseLesson } from '../src/lesson/index.js';
import { markdownToViewModel } from '../src/ui/markdown-view-model.js';

const rootFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const json = async (path) => JSON.parse(await rootFile(path));

async function loadReferenceLesson() {
  const [source, entities, fidelity] = await Promise.all([
    rootFile('src/lessons/retina-to-v1.md'),
    json('public/data/entities.json'),
    json('public/data/fidelity.json'),
  ]);
  const catalog = createLessonCatalog(entities, fidelity);
  return { source, catalog, result: parseLesson(source, catalog) };
}

test('reference lesson parses through the v1 contract into five complete scenes', async () => {
  const { result } = await loadReferenceLesson();
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal(result.value.title, 'From retina to V1');
  assert.deepEqual(result.value.scenes.map(({ id }) => id), [
    'orientation', 'nasal-crossing', 'lgn-relay', 'optic-radiation', 'v1-arrival',
  ]);

  const snapshotKeys = [
    'camera', 'controlPolicy', 'cutaway', 'hemispheres', 'material', 'playback',
    'schemaVersion', 'selection', 'visibility', 'visual',
  ];
  for (const scene of result.value.scenes) {
    assert.deepEqual(Object.keys(scene.snapshot).sort(), snapshotKeys);
    assert.equal(scene.snapshot.visual.id, 'atlas');
    assert.equal(scene.fidelityIds.length > 0, true);
    assert.doesNotThrow(() => markdownToViewModel(scene.proseMarkdown));
  }
  assert.equal(Object.isFrozen(result.value), true);
});

test('reference lesson uses only visual-system entities and never inherits omitted layers', async () => {
  const { result } = await loadReferenceLesson();
  const allowed = new Set([
    'layer.cortex', 'layer.labels', 'pathway.anterior', 'pathway.optic-radiation',
    'region.lgn', 'region.v1',
  ]);
  for (const scene of result.value.scenes) {
    assert.equal(scene.snapshot.visibility.entities.every((id) => allowed.has(id)), true);
    assert.equal(scene.snapshot.visibility.entities.some((id) => id.startsWith('tract.')), false);
    assert.equal(scene.snapshot.visibility.entities.includes('layer.swm'), false);
  }
  assert.deepEqual(result.value.scenes[3].snapshot.visibility.entities, [
    'layer.cortex', 'layer.labels', 'pathway.optic-radiation', 'region.lgn', 'region.v1',
  ]);
});

test('crossing scene explicitly discloses the omitted uncrossed temporal pathway', async () => {
  const { result } = await loadReferenceLesson();
  const crossing = result.value.scenes[1].proseMarkdown;

  assert.match(crossing, /only the nasal-retinal paths are drawn/i);
  assert.match(crossing, /uncrossed temporal-retinal pathways.+omitted/is);
  assert.match(crossing, /not a complete\s+depiction/i);
  assert.doesNotMatch(crossing, /all (?:retinal )?fibres cross/i);
  assert.deepEqual(result.value.scenes[1].fidelityIds, [
    'fidelity.anterior-pathway', 'fidelity.julich-regions',
  ]);
});

test('posterior scenes disclose mirrored geometry and illustrative event timing', async () => {
  const { result } = await loadReferenceLesson();
  const posterior = result.value.scenes.slice(3).map(({ proseMarkdown }) => proseMarkdown).join('\n');

  assert.match(posterior, /right side is mirrored/i);
  assert.match(posterior, /timing.+illustrative/is);
  assert.match(posterior, /not recorded spikes|not measured physiology/i);
  for (const scene of result.value.scenes.slice(3)) {
    assert.deepEqual(scene.fidelityIds, [
      'fidelity.julich-regions', 'fidelity.optic-radiation',
    ]);
  }
});

test('reference content keeps prose educational while curated records own sources', async () => {
  const { source, result } = await loadReferenceLesson();
  assert.doesNotMatch(source, /brain-atlas-[a-z0-9.]+/i);
  assert.doesNotMatch(source, /https?:\/\//i);
  assert.doesNotMatch(source, /association tract|streamline array order/i);
  assert.match(result.value.introductionMarkdown, /five scenes/i);
  assert.equal(result.value.scenes.every(({ title }) => typeof title === 'string' && title.length > 0), true);
});
