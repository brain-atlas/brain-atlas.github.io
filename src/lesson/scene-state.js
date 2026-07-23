import { createDiagnostic, throwContractDiagnostics } from './diagnostics.js';
import { validateSceneDirective } from './schemas.js';

export const SCENE_SNAPSHOT_VERSION = 2;

const DEFAULT_TRANSITION = Object.freeze({ kind: 'instant', durationMs: 0 });

export function deepFreeze(value) {
  if (value === null || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

function clone(value) {
  return structuredClone(value);
}

function sortedUnique(values = []) {
  return [...new Set(values)].sort();
}

function catalogHas(catalog, collection, id) {
  return catalog[collection]?.includes(id) ?? false;
}

function normalizedFibreFilterState(value, catalog) {
  if (value === undefined) return {
    preset: null,
    mode: 'all',
    setA: [],
    setB: [],
  };
  if (typeof value === 'string') {
    const preset = catalog.fibreFilterPresetsById?.[value];
    return preset ? {
      preset: value,
      mode: preset.query.mode,
      setA: [...preset.query.setA],
      setB: [...preset.query.setB],
    } : null;
  }
  return {
    preset: value.preset,
    mode: value.mode,
    setA: sortedUnique(value.setA),
    setB: sortedUnique(value.setB),
  };
}

function semanticDiagnostics(scene, catalog) {
  const diagnostics = [];
  const unknownEntity = (id, path) => {
    if (!catalogHas(catalog, 'entityIds', id)) {
      diagnostics.push(createDiagnostic(
        'scene.semantic.unknown-entity',
        `unknown entity ID: ${id}`,
        { path },
      ));
    }
  };

  scene.show.forEach((id, index) => unknownEntity(id, `/show/${index}`));
  for (const id of Object.keys(scene.hemispheres?.entities ?? {})) {
    const path = `/hemispheres/entities/${id}`;
    unknownEntity(id, path);
    const entity = catalog.entitiesById?.[id];
    if (entity && entity.hemisphereMode !== 'bilateral') {
      diagnostics.push(createDiagnostic(
        'scene.semantic.unsupported-hemisphere-filter',
        `entity does not support independent hemisphere filtering: ${id}`,
        { path },
      ));
    }
  }
  if (scene.selection?.selected) unknownEntity(scene.selection.selected, '/selection/selected');
  scene.selection?.emphasized?.forEach((id, index) => unknownEntity(id, `/selection/emphasized/${index}`));

  const fibreFilter = scene.fibreFilter;
  const presetId = typeof fibreFilter === 'string' ? fibreFilter : fibreFilter?.preset;
  if (presetId && !catalogHas(catalog, 'fibreFilterPresetIds', presetId)) {
    diagnostics.push(createDiagnostic(
      'scene.semantic.unknown-fibre-filter-preset',
      `unknown fibre filter preset: ${presetId}`,
      { path: '/fibreFilter' },
    ));
  }
  if (fibreFilter && typeof fibreFilter === 'object') {
    for (const setName of ['setA', 'setB']) {
      fibreFilter[setName].forEach((selector, index) => {
        if (!catalogHas(catalog, 'fibreFilterSelectorIds', selector)) {
          diagnostics.push(createDiagnostic(
            'scene.semantic.unknown-fibre-filter-selector',
            `unknown fibre filter selector: ${selector}`,
            { path: `/fibreFilter/${setName}/${index}` },
          ));
        }
      });
    }
    const invalidSets = fibreFilter.mode === 'all'
      ? fibreFilter.setA.length || fibreFilter.setB.length
      : fibreFilter.mode === 'touches-any' || fibreFilter.mode === 'connects-within'
        ? !fibreFilter.setA.length || fibreFilter.setB.length
        : !fibreFilter.setA.length || !fibreFilter.setB.length;
    if (invalidSets) {
      diagnostics.push(createDiagnostic(
        'scene.semantic.invalid-fibre-filter-query',
        `invalid selector sets for fibre filter mode: ${fibreFilter.mode}`,
        { path: '/fibreFilter' },
      ));
    }
    if (presetId && catalog.fibreFilterPresetsById?.[presetId]) {
      const normalized = normalizedFibreFilterState(fibreFilter, catalog);
      const preset = normalizedFibreFilterState(presetId, catalog);
      if (JSON.stringify(normalized) !== JSON.stringify(preset)) {
        diagnostics.push(createDiagnostic(
          'scene.semantic.fibre-filter-preset-mismatch',
          `fibre filter state differs from preset: ${presetId}`,
          { path: '/fibreFilter' },
        ));
      }
    }
  }

  if (!catalogHas(catalog, 'visualIds', scene.visual)) {
    diagnostics.push(createDiagnostic(
      'scene.semantic.unknown-visual',
      `unknown visual ID: ${scene.visual}`,
      { path: '/visual' },
    ));
  }
  if (typeof scene.camera === 'string' && !catalog.cameraPresets?.[scene.camera]) {
    diagnostics.push(createDiagnostic(
      'scene.semantic.unknown-camera',
      `unknown camera preset: ${scene.camera}`,
      { path: '/camera' },
    ));
  }
  return diagnostics;
}

function normalizeCamera(camera, catalog) {
  const source = typeof camera === 'string' ? catalog.cameraPresets[camera] : camera;
  return {
    position: [...source.position],
    target: [...source.target],
    transition: {
      ...DEFAULT_TRANSITION,
      ...(source.transition ?? {}),
    },
  };
}

function normalizeEntityHemispheres(entities = {}) {
  return Object.fromEntries(
    Object.entries(entities)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([id, state]) => [id, { L: state.L, R: state.R }]),
  );
}

export function normalizeSceneSnapshot(scene, catalog) {
  const schemaDiagnostics = validateSceneDirective(scene);
  throwContractDiagnostics('scene directive is invalid', schemaDiagnostics);
  throwContractDiagnostics('scene directive contains unknown references', semanticDiagnostics(scene, catalog));

  const snapshot = {
    schemaVersion: SCENE_SNAPSHOT_VERSION,
    camera: normalizeCamera(scene.camera, catalog),
    visibility: {
      entities: sortedUnique(scene.show),
    },
    hemispheres: {
      global: {
        L: scene.hemispheres?.global?.L ?? true,
        R: scene.hemispheres?.global?.R ?? true,
      },
      entities: normalizeEntityHemispheres(scene.hemispheres?.entities),
    },
    fibreFilter: normalizedFibreFilterState(scene.fibreFilter, catalog),
    cutaway: { position: scene.cutaway ?? 0 },
    material: { tissueOpacity: scene.tissueOpacity ?? 0.16 },
    playback: {
      playing: scene.playback?.playing ?? true,
      speed: scene.playback?.speed ?? 70,
      settled: scene.playback?.settled ?? false,
    },
    selection: {
      selected: scene.selection?.selected ?? null,
      emphasized: sortedUnique(scene.selection?.emphasized),
      strength: scene.selection?.strength ?? 1,
    },
    visual: {
      id: scene.visual,
      layout: scene.layout,
    },
    controlPolicy: {
      mode: scene.controls.mode,
    },
  };
  return deepFreeze(snapshot);
}

const CANONICAL_KEYS = [
  'schemaVersion', 'camera', 'visibility', 'hemispheres', 'fibreFilter', 'cutaway', 'material',
  'playback', 'selection', 'visual', 'controlPolicy',
];

function exactKeys(value, expected) {
  return value && typeof value === 'object' && !Array.isArray(value) &&
    Object.keys(value).sort().join('\0') === [...expected].sort().join('\0');
}

export function normalizeCanonicalSnapshot(snapshot, catalog) {
  const validShape = exactKeys(snapshot, CANONICAL_KEYS) &&
    snapshot.schemaVersion === SCENE_SNAPSHOT_VERSION &&
    exactKeys(snapshot.camera, ['position', 'target', 'transition']) &&
    exactKeys(snapshot.camera.transition, ['kind', 'durationMs']) &&
    exactKeys(snapshot.visibility, ['entities']) &&
    exactKeys(snapshot.hemispheres, ['global', 'entities']) &&
    exactKeys(snapshot.hemispheres.global, ['L', 'R']) &&
    exactKeys(snapshot.fibreFilter, ['preset', 'mode', 'setA', 'setB']) &&
    exactKeys(snapshot.cutaway, ['position']) &&
    exactKeys(snapshot.material, ['tissueOpacity']) &&
    exactKeys(snapshot.playback, ['playing', 'speed', 'settled']) &&
    exactKeys(snapshot.selection, ['selected', 'emphasized', 'strength']) &&
    exactKeys(snapshot.visual, ['id', 'layout']) &&
    exactKeys(snapshot.controlPolicy, ['mode']);

  throwContractDiagnostics('canonical scene snapshot is invalid', validShape ? [] : [
    createDiagnostic(
      'scene.snapshot.invalid-shape',
      'snapshot must contain exactly the canonical scene-state fields',
    ),
  ]);

  return normalizeSceneSnapshot({
    id: 'snapshot',
    visual: snapshot.visual.id,
    camera: clone(snapshot.camera),
    show: clone(snapshot.visibility.entities),
    hemispheres: clone(snapshot.hemispheres),
    fibreFilter: clone(snapshot.fibreFilter),
    cutaway: snapshot.cutaway.position,
    tissueOpacity: snapshot.material.tissueOpacity,
    playback: clone(snapshot.playback),
    selection: clone(snapshot.selection),
    controls: { mode: snapshot.controlPolicy.mode },
    layout: snapshot.visual.layout,
  }, catalog);
}

export function serializeSceneSnapshot(snapshot) {
  return JSON.stringify(snapshot);
}
