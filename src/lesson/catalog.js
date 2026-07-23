import { createDiagnostic, throwContractDiagnostics } from './diagnostics.js';
import { deepFreeze } from './scene-state.js';
import {
  validateEntityCatalog,
  validateFidelityCatalog,
  validateFibreFilterPresetCatalog,
} from './schemas.js';

const EMPTY_FIBRE_FILTER_PRESETS = Object.freeze({
  schemaVersion: 1,
  specialSelectors: Object.freeze([
    Object.freeze({
      id: 'endpoint.unknown',
      label: 'Unknown endpoint',
      description: 'Endpoint without a supported region assignment.',
    }),
    Object.freeze({
      id: 'endpoint.ambiguous',
      label: 'Ambiguous endpoint',
      description: 'Endpoint with an ambiguous region assignment.',
    }),
  ]),
  presets: Object.freeze([]),
});

function duplicateDiagnostics(records, scope) {
  const diagnostics = [];
  const seen = new Set();
  const roots = { entity: 'entities', fidelity: 'records', inspectable: 'inspectables' };
  records.forEach((record, index) => {
    if (seen.has(record.id)) {
      diagnostics.push(createDiagnostic(
        `catalog.semantic.duplicate-${scope}`,
        `duplicate ${scope} ID: ${record.id}`,
        { path: `/${roots[scope]}/${index}/id` },
      ));
    }
    seen.add(record.id);
  });
  return diagnostics;
}

function semanticDiagnostics(entityManifest, fidelityManifest, fibreFilterManifest) {
  const diagnostics = [
    ...duplicateDiagnostics(entityManifest.entities, 'entity'),
    ...duplicateDiagnostics(entityManifest.inspectables, 'inspectable'),
    ...duplicateDiagnostics(fidelityManifest.records, 'fidelity'),
  ];
  const fidelityIds = new Set(fidelityManifest.records.map(({ id }) => id));
  const entityById = new Map(entityManifest.entities.map((entity) => [entity.id, entity]));
  const inspectableIds = new Set(entityManifest.inspectables.map(({ id }) => id));
  const rendererBindings = new Set();
  const inspectableBindings = new Set();
  const undirectedPairs = new Set();
  const regionEntityIds = new Set(
    entityManifest.entities.filter(({ type }) => type === 'region').map(({ id }) => id),
  );
  const expectedSpecialSelectors = ['endpoint.unknown', 'endpoint.ambiguous'];
  const specialSelectorIds = fibreFilterManifest.specialSelectors.map(({ id }) => id);
  if (specialSelectorIds.join('\0') !== expectedSpecialSelectors.join('\0')) {
    diagnostics.push(createDiagnostic(
      'catalog.semantic.fibre-filter-special-selectors',
      'fibre endpoint special selectors must be endpoint.unknown then endpoint.ambiguous',
      { path: '/specialSelectors' },
    ));
  }
  const allowedFibreSelectors = new Set([...regionEntityIds, ...expectedSpecialSelectors]);
  const presetIds = new Set();
  fibreFilterManifest.presets.forEach((preset, presetIndex) => {
    const presetPath = `/presets/${presetIndex}`;
    if (presetIds.has(preset.id)) {
      diagnostics.push(createDiagnostic(
        'catalog.semantic.duplicate-fibre-filter-preset',
        `duplicate fibre filter preset ID: ${preset.id}`,
        { path: `${presetPath}/id` },
      ));
    }
    presetIds.add(preset.id);
    for (const setName of ['setA', 'setB']) {
      preset.query[setName].forEach((selector, selectorIndex) => {
        if (!allowedFibreSelectors.has(selector)) {
          diagnostics.push(createDiagnostic(
            'catalog.semantic.unknown-fibre-filter-selector',
            `unknown fibre filter selector: ${selector}`,
            { path: `${presetPath}/query/${setName}/${selectorIndex}` },
          ));
        }
      });
    }
    const { mode, setA, setB } = preset.query;
    const invalidSets = mode === 'all' ? setA.length || setB.length
      : mode === 'touches-any' || mode === 'connects-within' ? !setA.length || setB.length
        : !setA.length || !setB.length;
    if (invalidSets) {
      diagnostics.push(createDiagnostic(
        'catalog.semantic.invalid-fibre-filter-query',
        `fibre filter preset ${preset.id} has invalid selector sets for ${mode}`,
        { path: `${presetPath}/query` },
      ));
    }
  });

  entityManifest.entities.forEach((entity, index) => {
    if (!fidelityIds.has(entity.fidelity)) {
      diagnostics.push(createDiagnostic(
        'catalog.semantic.unknown-fidelity',
        `unknown fidelity ID: ${entity.fidelity}`,
        { path: `/entities/${index}/fidelity` },
      ));
    }
    const expectedKind = ['region', 'tract'].includes(entity.type) ? entity.type : 'layer';
    if (entity.renderer.kind !== expectedKind) {
      diagnostics.push(createDiagnostic(
        'catalog.semantic.renderer-kind',
        `${entity.type} entities require renderer kind ${expectedKind}`,
        { path: `/entities/${index}/renderer/kind` },
      ));
    }
    const binding = `${entity.renderer.kind}:${entity.renderer.id}`;
    if (rendererBindings.has(binding)) {
      diagnostics.push(createDiagnostic(
        'catalog.semantic.duplicate-renderer-binding',
        `duplicate renderer binding: ${binding}`,
        { path: `/entities/${index}/renderer` },
      ));
    }
    rendererBindings.add(binding);
  });

  entityManifest.inspectables.forEach((inspectable, index) => {
    const owner = entityById.get(inspectable.entity);
    if (!owner) {
      diagnostics.push(createDiagnostic(
        'catalog.semantic.unknown-inspectable-owner',
        `unknown inspectable owner entity: ${inspectable.entity}`,
        { path: `/inspectables/${index}/entity` },
      ));
    }
    if (inspectable.id === inspectable.entity && owner && (
      inspectable.renderer.kind !== owner.renderer.kind || inspectable.renderer.id !== owner.renderer.id
    )) {
      diagnostics.push(createDiagnostic(
        'catalog.semantic.inspectable-renderer-drift',
        `inspectable ${inspectable.id} must reuse its entity renderer binding`,
        { path: `/inspectables/${index}/renderer` },
      ));
    }
    if (inspectable.id !== inspectable.entity && inspectable.renderer.kind !== 'landmark') {
      diagnostics.push(createDiagnostic(
        'catalog.semantic.inspectable-child-kind',
        `selection-only inspectable ${inspectable.id} requires renderer kind landmark`,
        { path: `/inspectables/${index}/renderer/kind` },
      ));
    }
    const binding = `${inspectable.renderer.kind}:${inspectable.renderer.id}`;
    if (inspectableBindings.has(binding)) {
      diagnostics.push(createDiagnostic(
        'catalog.semantic.duplicate-inspectable-binding',
        `duplicate inspectable renderer binding: ${binding}`,
        { path: `/inspectables/${index}/renderer` },
      ));
    }
    inspectableBindings.add(binding);
    const localTargets = new Set();
    inspectable.relationships.forEach((relationship, relationshipIndex) => {
      const path = `/inspectables/${index}/relationships/${relationshipIndex}/target`;
      if (relationship.target === inspectable.id) {
        diagnostics.push(createDiagnostic(
          'catalog.semantic.inspectable-self-relationship',
          `inspectable relationship cannot target itself: ${inspectable.id}`,
          { path },
        ));
      } else if (!inspectableIds.has(relationship.target)) {
        diagnostics.push(createDiagnostic(
          'catalog.semantic.unknown-inspectable-target',
          `unknown inspectable relationship target: ${relationship.target}`,
          { path },
        ));
      }
      if (localTargets.has(relationship.target)) {
        diagnostics.push(createDiagnostic(
          'catalog.semantic.duplicate-inspectable-relationship',
          `duplicate inspectable relationship: ${inspectable.id} -> ${relationship.target}`,
          { path },
        ));
      }
      localTargets.add(relationship.target);
      if (relationship.direction === 'undirected' && inspectableIds.has(relationship.target)) {
        const pair = [inspectable.id, relationship.target].sort().join('\u0000');
        if (undirectedPairs.has(pair)) {
          diagnostics.push(createDiagnostic(
            'catalog.semantic.duplicate-undirected-relationship',
            `undirected relationship must be authored once: ${inspectable.id} / ${relationship.target}`,
            { path },
          ));
        }
        undirectedPairs.add(pair);
      }
    });
  });
  return diagnostics;
}

function sortedObject(entries) {
  return Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b)));
}

export function createLessonCatalog(
  entityManifest,
  fidelityManifest,
  fibreFilterManifest = EMPTY_FIBRE_FILTER_PRESETS,
) {
  throwContractDiagnostics('entity catalog schema is invalid', validateEntityCatalog(entityManifest));
  throwContractDiagnostics('fidelity catalog schema is invalid', validateFidelityCatalog(fidelityManifest));
  throwContractDiagnostics(
    'fibre filter preset catalog schema is invalid',
    validateFibreFilterPresetCatalog(fibreFilterManifest),
  );
  throwContractDiagnostics(
    'lesson catalog references are invalid',
    semanticDiagnostics(entityManifest, fidelityManifest, fibreFilterManifest),
  );

  const entities = [...entityManifest.entities]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((entity) => structuredClone(entity));
  const fidelityRecords = [...fidelityManifest.records]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((record) => structuredClone(record));
  const entitiesById = sortedObject(entities.map((entity) => [entity.id, entity]));
  const fibreFilterPresets = [...fibreFilterManifest.presets]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((preset) => ({
      ...structuredClone(preset),
      query: {
        ...structuredClone(preset.query),
        setA: [...preset.query.setA].sort((a, b) => a.localeCompare(b)),
        setB: [...preset.query.setB].sort((a, b) => a.localeCompare(b)),
      },
    }));
  const fibreFilterSelectors = [
    ...fibreFilterManifest.specialSelectors.map((selector) => structuredClone(selector)),
    ...entities.filter(({ type }) => type === 'region').map(({ id, label }) => ({
      id,
      label,
      description: `Displayed atlas region: ${label}.`,
    })),
  ].sort((a, b) => a.id.localeCompare(b.id));
  const mutableInspectables = [...entityManifest.inspectables]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((inspectable) => ({
      ...structuredClone(inspectable),
      fidelity: entitiesById[inspectable.entity].fidelity,
    }));
  const mutableById = Object.fromEntries(
    mutableInspectables.map((inspectable) => [inspectable.id, inspectable]),
  );
  for (const inspectable of entityManifest.inspectables) {
    for (const relationship of inspectable.relationships) {
      if (relationship.direction !== 'undirected') continue;
      mutableById[relationship.target].relationships.push({
        ...structuredClone(relationship),
        target: inspectable.id,
      });
    }
  }
  const inspectables = mutableInspectables.map((inspectable) => ({
    ...inspectable,
    relationships: [...inspectable.relationships].sort((a, b) => (
      a.target.localeCompare(b.target)
      || a.evidence.localeCompare(b.evidence)
      || a.method.localeCompare(b.method)
    )),
  }));

  return deepFreeze({
    schemaVersion: entityManifest.schemaVersion,
    entityIds: entities.map(({ id }) => id),
    inspectableIds: inspectables.map(({ id }) => id),
    fidelityIds: fidelityRecords.map(({ id }) => id),
    fibreFilterPresetIds: fibreFilterPresets.map(({ id }) => id),
    fibreFilterSelectorIds: fibreFilterSelectors.map(({ id }) => id),
    visualIds: ['atlas'],
    cameraPresets: sortedObject(
      Object.entries(entityManifest.cameraPresets)
        .map(([id, camera]) => [id, structuredClone(camera)]),
    ),
    entitiesById,
    fibreFilterPresetsById: sortedObject(
      fibreFilterPresets.map((preset) => [preset.id, preset]),
    ),
    fibreFilterSelectorsById: sortedObject(
      fibreFilterSelectors.map((selector) => [selector.id, selector]),
    ),
    inspectablesById: sortedObject(inspectables.map((inspectable) => [inspectable.id, inspectable])),
    fidelityById: sortedObject(fidelityRecords.map((record) => [record.id, record])),
  });
}
