import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createLessonCatalog, parseLesson } from '../src/lesson/index.js';
import { markdownToViewModel } from '../src/ui/markdown-view-model.js';
import { createLessonPresentation } from '../src/ui/lesson-presentation.js';
import { createCameraTransition, sampleCameraTransition } from '../src/ui/camera-transition.js';

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

test('reference lesson parses with an unnumbered entry view and eight complete scenes', async () => {
  const { result } = await loadReferenceLesson();
  assert.equal(result.ok, true, JSON.stringify(result.diagnostics));
  assert.equal(result.value.title, 'Early vision: from retina to cortical streams');
  assert.equal(result.value.status, 'draft');
  assert.equal(result.value.entrySceneId, 'orientation');
  assert.deepEqual(result.value.scenes.map(({ id }) => id), [
    'orientation', 'nasal-crossing', 'lgn-relay', 'optic-radiation', 'v1-arrival',
    'extrastriate-branching', 'ventral-stream', 'dorsal-stream', 'streams-integrate',
  ]);
  const presentation = createLessonPresentation(result.value);
  assert.equal(presentation.entryScene.id, 'orientation');
  assert.deepEqual(presentation.scenes.map(({ id }) => id), [
    'nasal-crossing', 'lgn-relay', 'optic-radiation', 'v1-arrival',
    'extrastriate-branching', 'ventral-stream', 'dorsal-stream', 'streams-integrate',
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
    'region.lgn', 'region.v1', 'region.v2', 'region.v3v', 'region.v3d', 'region.v4v',
    'region.loa', 'region.lop', 'region.fg1', 'region.fg2', 'region.fg3', 'region.fg4',
    'region.v3a', 'region.v6', 'region.mt',
    'region.hip1', 'region.hip2', 'region.hip3', 'region.hip4', 'region.hip5',
    'region.hip6', 'region.hip7', 'region.hip8',
    'region.spl7a', 'region.spl7p', 'region.spl5l', 'region.spl5m',
  ]);
  for (const scene of result.value.scenes) {
    assert.equal(scene.snapshot.visibility.entities.every((id) => allowed.has(id)), true);
    assert.equal(scene.snapshot.visibility.entities.some((id) => id.startsWith('tract.')), false);
    assert.equal(scene.snapshot.visibility.entities.includes('layer.swm'), false);
    assert.equal(scene.snapshot.visibility.entities.includes('layer.labels'), false);
  }
  assert.deepEqual(result.value.scenes[0].snapshot.visibility.entities, [
    'layer.cortex', 'pathway.anterior', 'pathway.optic-radiation', 'region.lgn', 'region.v1',
  ]);
  assert.deepEqual(result.value.scenes[3].snapshot.visibility.entities, [
    'layer.cortex', 'pathway.optic-radiation', 'region.lgn', 'region.v1',
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
  const posterior = result.value.scenes.slice(3, 5).map(({ proseMarkdown }) => proseMarkdown).join('\n');

  assert.match(posterior, /right side is mirrored/i);
  assert.match(posterior, /timing.+illustrative/is);
  assert.match(posterior, /not recorded spikes|not measured physiology/i);
  for (const scene of result.value.scenes.slice(3, 5)) {
    assert.deepEqual(scene.fidelityIds, [
      'fidelity.julich-regions', 'fidelity.optic-radiation',
    ]);
  }
});

test('cortical stream scenes use atlas regions without claiming tract connectivity', async () => {
  const { result } = await loadReferenceLesson();
  const streamScenes = result.value.scenes.slice(5);
  const streamProse = streamScenes.map(({ proseMarkdown }) => proseMarkdown).join('\n');

  assert.equal(streamScenes.length, 4);
  for (const scene of streamScenes) {
    assert.deepEqual(scene.fidelityIds, ['fidelity.cortex', 'fidelity.julich-regions']);
    assert.equal(scene.snapshot.visibility.entities.some((id) => id.startsWith('tract.')), false);
  }
  assert.match(streamProse, /does not demonstrate a connection/i);
  assert.match(streamProse, /does not display their connections/i);
  assert.match(streamProse, /two-stream framework.+not a complete wiring\s+diagram/is);
});

test('reference content keeps prose educational while curated records own sources', async () => {
  const { source, result } = await loadReferenceLesson();
  assert.doesNotMatch(source, /brain-atlas-[a-z0-9.]+/i);
  assert.doesNotMatch(source, /https?:\/\//i);
  assert.doesNotMatch(source, /streamline array order/i);
  assert.match(result.value.introductionMarkdown, /eight scenes/i);
  assert.equal(result.value.scenes.every(({ title }) => typeof title === 'string' && title.length > 0), true);
});

test('reference content teaches a mechanistic model with active checks and transfer', async () => {
  const { source, result } = await loadReferenceLesson();
  const instructionalProse = result.value.scenes.slice(1)
    .map(({ proseMarkdown }) => proseMarkdown)
    .join('\n');

  assert.match(result.value.introductionMarkdown, /predict before you begin/i);
  assert.match(result.value.introductionMarkdown, /should be able to/i);
  assert.match(instructionalProse, /center-surround receptive field/i);
  assert.match(instructionalProse, /parallel neural descriptions/i);
  assert.match(instructionalProse, /retinotopic/i);
  assert.match(instructionalProse, /cortical magnification/i);
  assert.match(instructionalProse, /retrieval check|cumulative retrieval/i);
  assert.match(instructionalProse, /predict, then check/i);
  assert.match(instructionalProse, /homonymous hemianopia/i);
  assert.match(instructionalProse, /vision for\s+perception/i);
  assert.match(instructionalProse, /vision for\s+action/i);
  assert.match(instructionalProse, /interacting,\s+branched, recurrent networks/i);
  assert.doesNotMatch(source, /Previous and Next|Skip moves|camera transition|viewer controls/i);
});

test('adjacent lesson cameras do not cross the OrbitControls vertical-pole seam', async () => {
  const { result } = await loadReferenceLesson();
  for (let index = 1; index < result.value.scenes.length; index++) {
    const from = result.value.scenes[index - 1].snapshot.camera;
    const to = result.value.scenes[index].snapshot.camera;
    const transition = createCameraTransition({ from, to, startTime: 0, durationMs: 900 });
    let priorAzimuth = Math.atan2(from.position[0], from.position[2]);
    for (let time = 9; time <= 900; time += 9) {
      const { position } = sampleCameraTransition(transition, time);
      const azimuth = Math.atan2(position[0], position[2]);
      const delta = Math.atan2(Math.sin(azimuth - priorAzimuth), Math.cos(azimuth - priorAzimuth));
      assert.ok(Math.abs(delta) < Math.PI / 2, `scene ${index}→${index + 1} flips at ${time} ms`);
      priorAzimuth = azimuth;
    }
  }
});
