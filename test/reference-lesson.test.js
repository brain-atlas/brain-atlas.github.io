import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { createFibreEndpointIndex, filterFibreEndpoints } from '../src/fibre-endpoint-filter.js';
import { createLessonCatalog, parseLesson } from '../src/lesson/index.js';
import { markdownToViewModel } from '../src/ui/markdown-view-model.js';
import { createLessonPresentation } from '../src/ui/lesson-presentation.js';
import { createCameraTransition, sampleCameraTransition } from '../src/ui/camera-transition.js';

const rootFile = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const json = async (path) => JSON.parse(await rootFile(path));

async function loadReferenceLesson() {
  const [source, entities, fidelity, fibreFilterPresets] = await Promise.all([
    rootFile('src/lessons/retina-to-v1.md'),
    json('public/data/entities.json'),
    json('public/data/fidelity.json'),
    json('public/data/fibre_filter_presets.json'),
  ]);
  const catalog = createLessonCatalog(entities, fidelity, fibreFilterPresets);
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
    'camera', 'controlPolicy', 'cutaway', 'fibreFilter', 'hemispheres', 'material', 'playback',
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

test('reference lesson uses only visual-system entities and keeps scenes 1 and 3 unchanged', async () => {
  const { result } = await loadReferenceLesson();
  const allowed = new Set([
    'layer.cortex', 'layer.labels', 'layer.swm', 'pathway.anterior', 'pathway.optic-radiation',
    'tract.ilf', 'tract.ifof', 'tract.slf1', 'tract.slf2', 'tract.slf3', 'tract.vof', 'tract.mdlf',
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
  assert.deepEqual(result.value.scenes[1].snapshot.visibility.entities, [
    'pathway.anterior', 'region.lgn',
  ]);
  assert.deepEqual(result.value.scenes[1].snapshot.fibreFilter, {
    preset: null, mode: 'all', setA: [], setB: [],
  });
  assert.deepEqual(result.value.scenes[3].snapshot.visibility.entities, [
    'layer.cortex', 'pathway.optic-radiation', 'region.lgn', 'region.v1',
  ]);
  assert.deepEqual(result.value.scenes[3].snapshot.fibreFilter, {
    preset: null, mode: 'all', setA: [], setB: [],
  });
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
    assert.equal(scene.snapshot.playback.playing, true);
    assert.equal(scene.snapshot.playback.settled, false);
  }
  assert.match(posterior, /right side is mirrored/i);
  assert.match(posterior, /timing.+illustrative/is);
  assert.match(posterior, /not recorded\s+(?:>\s*)?spikes|not measured physiology/i);
  assert.deepEqual(result.value.scenes[3].fidelityIds, [
    'fidelity.julich-regions', 'fidelity.optic-radiation',
  ]);
  const arrival = result.value.scenes[4];
  assert.deepEqual(arrival.fidelityIds, [
    'fidelity.association-tracts', 'fidelity.cortex', 'fidelity.julich-regions',
    'fidelity.optic-radiation', 'fidelity.superficial-white-matter',
  ]);
  assert.equal(arrival.snapshot.visibility.entities.includes('region.lgn'), true);
  assert.equal(arrival.snapshot.selection.emphasized.includes('pathway.optic-radiation'), true);
  assert.equal(arrival.snapshot.selection.emphasized.includes('region.lgn'), true);
});

test('requested scenes use touches-any filtering and every nonzero matching named tract group', async () => {
  const [{ result }, endpointArtifact] = await Promise.all([
    loadReferenceLesson(),
    json('public/data/fibre_endpoints.json'),
  ]);
  const endpointIndex = createFibreEndpointIndex(endpointArtifact);
  const [overview, scene1, scene2, scene3, scene4, scene5, scene6, scene7, scene8] = result.value.scenes;
  const sharedFilter = {
    preset: null,
    mode: 'touches-any',
    setA: ['region.v1', 'region.v2', 'region.v3d', 'region.v3v'],
    setB: [],
  };
  const customFilters = new Map([
    [overview, sharedFilter],
    [scene2, { preset: null, mode: 'touches-any', setA: ['region.lgn'], setB: [] }],
    [scene4, { preset: null, mode: 'touches-any', setA: ['region.v1'], setB: [] }],
    [scene5, sharedFilter],
  ]);
  for (const [scene, expected] of customFilters) {
    assert.deepEqual(scene.snapshot.fibreFilter, expected);
    assert.equal(scene.snapshot.visibility.entities.includes('layer.swm'), true);
  }
  assert.deepEqual(scene6.snapshot.fibreFilter, {
    preset: 'fibre-filter.ventral',
    mode: 'touches-any',
    setA: ['region.fg1', 'region.fg2', 'region.fg3', 'region.fg4', 'region.loa',
      'region.lop', 'region.v1', 'region.v2', 'region.v3v', 'region.v4v'],
    setB: [],
  });
  assert.equal(scene6.snapshot.visibility.entities.includes('layer.swm'), true);
  assert.deepEqual(scene7.snapshot.fibreFilter.preset, 'fibre-filter.dorsal');
  assert.equal(scene7.snapshot.visibility.entities.includes('layer.swm'), true);

  for (const scene of [scene4, scene5, scene6, scene7]) {
    const resultForScene = filterFibreEndpoints(
      endpointIndex,
      scene.snapshot.fibreFilter,
      scene.snapshot.hemispheres.global,
    );
    const matchingTracts = resultForScene.association
      .filter(({ L, R }) => L.some(Boolean) || R.some(Boolean))
      .map(({ id }) => `tract.${id}`)
      .sort();
    assert.deepEqual(
      scene.snapshot.visibility.entities.filter((id) => id.startsWith('tract.')),
      matchingTracts,
      `${scene.id} must show every named tract group with a matching contour`,
    );
  }
  assert.deepEqual(scene1.snapshot.fibreFilter, { preset: null, mode: 'all', setA: [], setB: [] });
  assert.deepEqual(scene3.snapshot.fibreFilter, { preset: null, mode: 'all', setA: [], setB: [] });
  assert.deepEqual(scene8.snapshot, overview.snapshot);
  assert.deepEqual(scene8.fidelityIds, overview.fidelityIds);
});

test('endpoint-filtered lesson copy identifies areas without claiming exact connectivity', async () => {
  const { result } = await loadReferenceLesson();
  const filteredScenes = [result.value.scenes[0], ...result.value.scenes.slice(2, 3), ...result.value.scenes.slice(4, 9)];
  const filteredProse = filteredScenes.map(({ proseMarkdown }) => proseMarkdown).join('\n');
  const streamProse = result.value.scenes.slice(5, 8).map(({ proseMarkdown }) => proseMarkdown).join('\n');

  for (const scene of result.value.scenes.slice(5, 8)) {
    assert.deepEqual(scene.fidelityIds, [
      'fidelity.association-tracts', 'fidelity.cortex',
      'fidelity.julich-regions', 'fidelity.superficial-white-matter',
    ]);
    assert.equal(scene.snapshot.playback.playing, true);
    assert.equal(scene.snapshot.playback.settled, false);
  }
  for (const scene of result.value.scenes.slice(6, 8)) {
    assert.deepEqual(scene.snapshot.hemispheres.global, { L: true, R: false });
    assert.equal(scene.snapshot.cutaway.position, 50);
  }
  assert.match(result.value.scenes[6].proseMarkdown, /V1.+V2.+V3v.+V4v.+LOA.+LOp.+FG1.+FG4/is);
  assert.match(result.value.scenes[7].proseMarkdown, /V1.+V2.+V3d.+V3A.+V6.+MT.+intraparietal.+superior parietal/is);
  assert.match(filteredProse, /unordered geometric endpoint/i);
  assert.match(streamProse, /50\/50/i);
  assert.match(streamProse, /zero-mean/i);
  assert.match(streamProse, /qualified.*endpoint proximity|qualified endpoint-proximity/is);
  assert.match(streamProse, /Jülich.*maximum-probability|maximum-probability.*Jülich/is);
  assert.match(streamProse, /unknown.*ambiguous|ambiguous.*unknown/is);
  assert.match(streamProse, /2009a.*2009c|2009c.*2009a/is);
  assert.match(streamProse, /not.*(?:termination|connection strength)/is);
  assert.doesNotMatch(filteredProse, /fibres leaving V1|tracts leaving V1/i);
  assert.doesNotMatch(streamProse, /not endpoint-filtered|no (?:approved )?named-region\s+(?:>\s*)?endpoint classification/i);
});

test('the authored integrated-stream preset remains audited future use rather than a new lesson scene', async () => {
  const [{ result }, endpoints, presets] = await Promise.all([
    loadReferenceLesson(),
    json('public/data/fibre_endpoints.json'),
    json('public/data/fibre_filter_presets.json'),
  ]);
  const preset = presets.presets.find(({ id }) => id === 'fibre-filter.integrated-stream');
  const audit = endpoints.presets.find(({ id }) => id === preset.id);
  assert.deepEqual(preset, {
    id: 'fibre-filter.integrated-stream',
    label: 'Integrated ventral–dorsal streams',
    description: 'Contours with one geometric endpoint in the displayed ventral set and the other in the displayed dorsal set, independent of stored endpoint order.',
    hemispherePolicy: 'inherit-scene',
    query: preset.query,
  });
  assert.equal(preset.query.mode, 'connects-between');
  assert.deepEqual(audit.included, { association: 168, swm: 159, total: 327, L: 123, R: 204 });
  assert.deepEqual(audit.includedQuality, { known: 327, unknown: 0, ambiguous: 0 });
  assert.equal(result.value.scenes.some(({ snapshot }) => snapshot.fibreFilter.preset === preset.id), false);
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

test('LGN scene retains incoming context and adds endpoint-filtered superficial fibres', async () => {
  const { result } = await loadReferenceLesson();
  const scene = result.value.scenes[2];
  assert.deepEqual(scene.snapshot.visibility.entities, [
    'layer.cortex', 'layer.swm', 'pathway.anterior', 'pathway.optic-radiation', 'region.lgn', 'region.v1',
  ]);
  assert.deepEqual(scene.fidelityIds, [
    'fidelity.anterior-pathway', 'fidelity.cortex', 'fidelity.julich-regions',
    'fidelity.optic-radiation', 'fidelity.superficial-white-matter',
  ]);
  assert.deepEqual(scene.snapshot.fibreFilter, {
    preset: null, mode: 'touches-any', setA: ['region.lgn'], setB: [],
  });
  assert.equal(scene.snapshot.playback.playing, true);
  assert.equal(scene.snapshot.playback.settled, false);
  assert.ok(scene.snapshot.camera.position[2] < 0);
  assert.match(scene.proseMarkdown, /source.+destination|destination.+source/is);
  assert.match(scene.proseMarkdown, /incoming.+context/is);
  assert.match(scene.proseMarkdown, /optic.?radiation.+V1/is);
  assert.match(scene.proseMarkdown, /22 superficial.+LGN|LGN.+22 superficial/is);
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
