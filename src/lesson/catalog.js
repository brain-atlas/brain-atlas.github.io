import { createDiagnostic, throwContractDiagnostics } from './diagnostics.js';
import { deepFreeze } from './scene-state.js';
import { validateEntityCatalog, validateFidelityCatalog } from './schemas.js';

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

function semanticDiagnostics(entityManifest, fidelityManifest) {
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
    });
  });
  return diagnostics;
}

function sortedObject(entries) {
  return Object.fromEntries([...entries].sort(([a], [b]) => a.localeCompare(b)));
}

export function createLessonCatalog(entityManifest, fidelityManifest) {
  throwContractDiagnostics('entity catalog schema is invalid', validateEntityCatalog(entityManifest));
  throwContractDiagnostics('fidelity catalog schema is invalid', validateFidelityCatalog(fidelityManifest));
  throwContractDiagnostics(
    'lesson catalog references are invalid',
    semanticDiagnostics(entityManifest, fidelityManifest),
  );

  const entities = [...entityManifest.entities]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((entity) => structuredClone(entity));
  const fidelityRecords = [...fidelityManifest.records]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((record) => structuredClone(record));
  const entitiesById = sortedObject(entities.map((entity) => [entity.id, entity]));
  const inspectables = [...entityManifest.inspectables]
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((inspectable) => ({
      ...structuredClone(inspectable),
      fidelity: entitiesById[inspectable.entity].fidelity,
    }));

  return deepFreeze({
    schemaVersion: entityManifest.schemaVersion,
    entityIds: entities.map(({ id }) => id),
    inspectableIds: inspectables.map(({ id }) => id),
    fidelityIds: fidelityRecords.map(({ id }) => id),
    visualIds: ['atlas'],
    cameraPresets: sortedObject(
      Object.entries(entityManifest.cameraPresets)
        .map(([id, camera]) => [id, structuredClone(camera)]),
    ),
    entitiesById,
    inspectablesById: sortedObject(inspectables.map((inspectable) => [inspectable.id, inspectable])),
    fidelityById: sortedObject(fidelityRecords.map((record) => [record.id, record])),
  });
}
