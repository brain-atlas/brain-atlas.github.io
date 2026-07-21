import { createDiagnostic, throwContractDiagnostics } from './diagnostics.js';
import { deepFreeze } from './scene-state.js';
import { validateEntityCatalog, validateFidelityCatalog } from './schemas.js';

function duplicateDiagnostics(records, scope) {
  const diagnostics = [];
  const seen = new Set();
  records.forEach((record, index) => {
    if (seen.has(record.id)) {
      diagnostics.push(createDiagnostic(
        `catalog.semantic.duplicate-${scope}`,
        `duplicate ${scope} ID: ${record.id}`,
        { path: `/${scope === 'entity' ? 'entities' : 'records'}/${index}/id` },
      ));
    }
    seen.add(record.id);
  });
  return diagnostics;
}

function semanticDiagnostics(entityManifest, fidelityManifest) {
  const diagnostics = [
    ...duplicateDiagnostics(entityManifest.entities, 'entity'),
    ...duplicateDiagnostics(fidelityManifest.records, 'fidelity'),
  ];
  const fidelityIds = new Set(fidelityManifest.records.map(({ id }) => id));
  const rendererBindings = new Set();

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

  return deepFreeze({
    schemaVersion: entityManifest.schemaVersion,
    entityIds: entities.map(({ id }) => id),
    fidelityIds: fidelityRecords.map(({ id }) => id),
    visualIds: ['atlas'],
    cameraPresets: sortedObject(
      Object.entries(entityManifest.cameraPresets)
        .map(([id, camera]) => [id, structuredClone(camera)]),
    ),
    entitiesById: sortedObject(entities.map((entity) => [entity.id, entity])),
    fidelityById: sortedObject(fidelityRecords.map((record) => [record.id, record])),
  });
}
