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
  assert.equal(result.value.title, 'Early Vision: Retina to the Cortical Streams');
  assert.equal(result.value.status, null);
  assert.equal(result.value.entrySceneId, 'orientation');
  assert.deepEqual(result.value.scenes.map(({ id }) => id), [
    'orientation', 'nasal-crossing', 'lgn-relay', 'optic-radiation', 'v1-arrival',
    'extrastriate-branching', 'ventral-stream', 'dorsal-stream', 'conclusion',
  ]);
  const presentation = createLessonPresentation(result.value);
  assert.equal(presentation.entryScene.id, 'orientation');
  assert.deepEqual(presentation.scenes.map(({ id }) => id), [
    'nasal-crossing', 'lgn-relay', 'optic-radiation', 'v1-arrival',
    'extrastriate-branching', 'ventral-stream', 'dorsal-stream', 'conclusion',
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
    'layer.cortex', 'layer.labels', 'layer.swm', 'pathway.anterior', 'pathway.optic-radiation',
    'tract.ilf', 'tract.ifof', 'tract.slf1', 'tract.slf2', 'tract.slf3', 'tract.vof',
    'region.lgn', 'region.v1', 'region.v2', 'region.v3v', 'region.v3d', 'region.v4v',
    'region.loa', 'region.lop', 'region.fg1', 'region.fg2', 'region.fg3', 'region.fg4',
    'region.v3a', 'region.v6', 'region.mt',
    'region.hip1', 'region.hip2', 'region.hip3', 'region.hip4', 'region.hip5',
    'region.hip6', 'region.hip7', 'region.hip8',
    'region.spl7a', 'region.spl7p', 'region.spl5l', 'region.spl5m',
  ]);
  for (const scene of result.value.scenes) {
    assert.equal(scene.snapshot.visibility.entities.every((id) => allowed.has(id)), true);
    assert.equal(scene.snapshot.visibility.entities.includes('layer.labels'), false);
  }
  for (const scene of result.value.scenes.slice(0, 5)) {
    assert.equal(scene.snapshot.visibility.entities.some((id) => id.startsWith('tract.')), false);
    assert.equal(scene.snapshot.visibility.entities.includes('layer.swm'), false);
  }
  assert.deepEqual(result.value.scenes[0].snapshot.visibility.entities, [
    'layer.cortex', 'pathway.anterior', 'pathway.optic-radiation', 'region.lgn', 'region.v1',
  ]);
  assert.deepEqual(result.value.scenes[3].snapshot.visibility.entities, [
    'layer.cortex', 'pathway.optic-radiation', 'region.lgn', 'region.v1',
  ]);
});

test('crossing scene marks its future retina-to-chiasm split and discloses omitted temporal pathways', async () => {
  const { result } = await loadReferenceLesson();
  const crossing = result.value.scenes[1].proseMarkdown;
  const crossingModel = markdownToViewModel(crossing);

  assert.equal(crossingModel.children.filter(({ type }) => type === 'thematicBreak').length, 1);
  assert.match(crossing, /only the\s+(?:>\s*)?nasal-retinal paths are drawn/i);
  assert.match(crossing, /uncrossed temporal-retinal pathways.+omitted/is);
  assert.match(crossing, /not a complete\s+depiction/i);
  assert.doesNotMatch(crossing, /all (?:retinal )?fibres cross/i);
  assert.deepEqual(result.value.scenes[1].fidelityIds, [
    'fidelity.anterior-pathway', 'fidelity.julich-regions',
  ]);
});

test('posterior scenes use the approved left-only midline cut and disclose mirrored source geometry', async () => {
  const { result } = await loadReferenceLesson();
  const posterior = result.value.scenes.slice(3, 5).map(({ proseMarkdown }) => proseMarkdown).join('\n');

  for (const scene of result.value.scenes.slice(3, 5)) {
    assert.deepEqual(scene.snapshot.hemispheres.global, { L: true, R: false });
    assert.equal(scene.snapshot.cutaway.position, 50);
  }
  assert.match(posterior, /right side is mirrored/i);
  assert.match(posterior, /timing.+illustrative/is);
  assert.match(posterior, /not recorded\s+(?:>\s*)?spikes|not measured physiology/i);
  for (const scene of result.value.scenes.slice(3, 5)) {
    assert.deepEqual(scene.fidelityIds, [
      'fidelity.julich-regions', 'fidelity.optic-radiation',
    ]);
    assert.equal(scene.snapshot.playback.playing, true);
    assert.equal(scene.snapshot.playback.settled, false);
  }
  const arrival = result.value.scenes[4];
  assert.equal(arrival.snapshot.visibility.entities.includes('region.lgn'), true);
  assert.equal(arrival.snapshot.selection.emphasized.includes('pathway.optic-radiation'), true);
  assert.equal(arrival.snapshot.selection.emphasized.includes('region.lgn'), true);
});

test('cortical preview scenes add selected white-matter context without claiming exact connectivity', async () => {
  const { result } = await loadReferenceLesson();
  const streamScenes = result.value.scenes.slice(5, 8);
  const streamProse = streamScenes.map(({ proseMarkdown }) => proseMarkdown).join('\n');
  const expectedTracts = [
    ['tract.vof'],
    ['tract.ifof', 'tract.ilf', 'tract.vof'],
    ['tract.slf1', 'tract.slf2', 'tract.slf3', 'tract.vof'],
  ];

  assert.deepEqual(streamScenes.map(({ id }) => id), [
    'extrastriate-branching', 'ventral-stream', 'dorsal-stream',
  ]);
  for (const [index, scene] of streamScenes.entries()) {
    assert.deepEqual(scene.fidelityIds, [
      'fidelity.association-tracts', 'fidelity.cortex',
      'fidelity.julich-regions', 'fidelity.superficial-white-matter',
    ]);
    assert.deepEqual(
      scene.snapshot.visibility.entities.filter((id) => id.startsWith('tract.')),
      expectedTracts[index],
    );
    assert.equal(scene.snapshot.visibility.entities.includes('layer.swm'), true);
    assert.equal(scene.snapshot.playback.playing, true);
    assert.equal(scene.snapshot.playback.settled, false);
  }
  for (const scene of streamScenes.filter(({ id }) => ['ventral-stream', 'dorsal-stream'].includes(id))) {
    assert.deepEqual(scene.snapshot.hemispheres.global, { L: true, R: false });
    assert.equal(scene.snapshot.cutaway.position, 50);
  }
  assert.match(streamProse, /50\/50/i);
  assert.match(streamProse, /zero-mean/i);
  assert.match(streamProse, /not endpoint-filtered/i);
  assert.match(streamProse, /do\s+(?:>\s*)?not establish|does\s+(?:>\s*)?not establish/i);
});

test('conclusion reprises the opening pathway and resolves the opening prediction', async () => {
  const { result } = await loadReferenceLesson();
  const opening = result.value.scenes[0];
  const conclusion = result.value.scenes[8];

  assert.equal(conclusion.id, 'conclusion');
  assert.deepEqual(conclusion.snapshot.camera, opening.snapshot.camera);
  assert.deepEqual(conclusion.snapshot.visibility, opening.snapshot.visibility);
  assert.deepEqual(conclusion.fidelityIds, opening.fidelityIds);
  assert.match(conclusion.proseMarkdown, /retina.+chiasm.+LGN.+optic radiation.+V1/is);
  assert.match(conclusion.proseMarkdown, /left homonymous hemianopia/is);
  assert.match(conclusion.proseMarkdown, /after the chiasm.+right/is);
  assert.match(conclusion.proseMarkdown, /V2.+parts of V3.+multiple\s+downstream routes/is);
  assert.match(conclusion.proseMarkdown, /ventral and dorsal.+preview/is);
  assert.match(conclusion.proseMarkdown, /final retrieval/i);
  assert.doesNotMatch(conclusion.proseMarkdown, /moving friend|handshake|familiar mug|hard fork/i);
});

test('LGN scene retains incoming context and frames the outgoing pathway through V1', async () => {
  const { result } = await loadReferenceLesson();
  const scene = result.value.scenes[2];
  assert.deepEqual(scene.snapshot.visibility.entities, [
    'layer.cortex', 'pathway.anterior', 'pathway.optic-radiation', 'region.lgn', 'region.v1',
  ]);
  assert.deepEqual(scene.fidelityIds, [
    'fidelity.anterior-pathway', 'fidelity.cortex',
    'fidelity.julich-regions', 'fidelity.optic-radiation',
  ]);
  assert.equal(scene.snapshot.playback.playing, true);
  assert.equal(scene.snapshot.playback.settled, false);
  assert.ok(scene.snapshot.camera.position[2] < 0);
  assert.match(scene.proseMarkdown, /source.+destination|destination.+source/is);
  assert.match(scene.proseMarkdown, /incoming.+context/is);
  assert.match(scene.proseMarkdown, /optic.?radiation.+V1/is);
});

test('reference content keeps prose educational while curated records own sources', async () => {
  const { source, result } = await loadReferenceLesson();
  assert.doesNotMatch(source, /brain-atlas-[a-z0-9.]+/i);
  assert.doesNotMatch(source, /https?:\/\//i);
  assert.doesNotMatch(source, /streamline array order/i);
  assert.doesNotMatch(source, /REVIEWER NOTE|TODO|FIXME/i);
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
  assert.match(instructionalProse, /interacting.+networks/i);
  assert.match(instructionalProse, /without (?:looking back|rereading).+what is preserved.+what changes/is);
  assert.doesNotMatch(instructionalProse, /Cumulative retrieval[^]*retinal parallel encoding; chiasmatic/is);
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
