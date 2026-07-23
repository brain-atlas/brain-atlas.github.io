import {
  applySceneCommand,
  normalizeCanonicalSnapshot,
  normalizeSceneSnapshot,
} from '../lesson/index.js';

const INSTANT_TRANSITION = Object.freeze({ kind: 'instant', durationMs: 0 });

function canonicalCamera(renderedCamera) {
  return {
    position: [...renderedCamera.position],
    target: [...renderedCamera.target],
    transition: { ...INSTANT_TRANSITION },
  };
}

function validateRenderedCamera(renderedCamera, catalog) {
  const probe = normalizeSceneSnapshot({
    id: 'explore-camera',
    visual: 'atlas',
    camera: canonicalCamera(renderedCamera),
    show: [],
    controls: { mode: 'explore' },
    layout: 'dominant',
  }, catalog);
  return probe.camera;
}

export function createSceneExploreSnapshot(snapshot, renderedCamera, catalog) {
  const source = normalizeCanonicalSnapshot(snapshot, catalog);
  const camera = validateRenderedCamera(renderedCamera, catalog);
  return normalizeCanonicalSnapshot({
    ...source,
    camera,
    visual: { id: 'atlas', layout: 'dominant' },
    controlPolicy: { mode: 'explore' },
  }, catalog);
}

export function createAtlasExploreSnapshot(catalog) {
  return normalizeSceneSnapshot({
    id: 'explore-atlas',
    visual: 'atlas',
    camera: 'home',
    show: catalog.entityIds.filter((id) => id !== 'layer.labels'),
    controls: { mode: 'explore' },
    layout: 'dominant',
  }, catalog);
}

export function applyExploreCommands(snapshot, commands, renderedCamera, catalog) {
  if (!Array.isArray(commands)) throw new TypeError('Explore commands must be an array');
  let next = applySceneCommand(snapshot, {
    type: 'camera.set',
    camera: canonicalCamera(renderedCamera),
  }, catalog);
  for (const command of commands) next = applySceneCommand(next, command, catalog);
  return next;
}

export function createExplorePanelModel(snapshot, catalog) {
  const source = normalizeCanonicalSnapshot(snapshot, catalog);
  const visible = new Set(source.visibility.entities);
  const entities = Object.fromEntries(catalog.entityIds.map((id) => {
    const entity = catalog.entitiesById[id];
    const isVisible = visible.has(id);
    const hemispheres = source.hemispheres.entities[id] ?? { L: true, R: true };
    return [id, {
      visible: isVisible,
      L: isVisible && hemispheres.L,
      R: isVisible && hemispheres.R,
      hemisphereMode: entity.hemisphereMode,
      renderer: structuredClone(entity.renderer),
    }];
  }));
  return Object.freeze({
    globalHemispheres: source.hemispheres.global,
    entities: Object.freeze(Object.fromEntries(
      Object.entries(entities).map(([id, value]) => [id, Object.freeze(value)]),
    )),
    cutaway: source.cutaway,
    material: source.material,
    playback: source.playback,
    fibreFilter: source.fibreFilter,
    fibreFilterPresets: Object.freeze(catalog.fibreFilterPresetIds.map(
      (id) => catalog.fibreFilterPresetsById[id],
    )),
    fibreFilterSelectors: Object.freeze(catalog.fibreFilterSelectorIds.map(
      (id) => catalog.fibreFilterSelectorsById[id],
    )),
  });
}

export function exploreFidelityIds(snapshot, catalog, included = []) {
  const source = normalizeCanonicalSnapshot(snapshot, catalog);
  const ids = new Set(included);
  for (const id of source.visibility.entities) {
    const fidelity = catalog.entitiesById[id]?.fidelity;
    if (fidelity) ids.add(fidelity);
  }
  for (const id of ids) {
    if (!catalog.fidelityIds.includes(id)) throw new RangeError(`unknown fidelity record: ${id}`);
  }
  return Object.freeze([...ids].sort((a, b) => a.localeCompare(b)));
}
