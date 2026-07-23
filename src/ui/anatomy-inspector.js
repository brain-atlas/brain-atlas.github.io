import { deepFreeze } from '../lesson/scene-state.js';

const INPUTS = new Set(['pointer', 'focus', 'keyboard', 'touch']);
const RELATIONSHIP_LABELS = Object.freeze({
  direction: Object.freeze({
    directed: 'Directed',
    undirected: 'Undirected',
    unknown: 'Unknown direction',
  }),
  evidence: Object.freeze({
    'literature-curated': 'Literature curated',
    'displayed-dataset': 'Displayed dataset',
    'schematic-teaching': 'Schematic teaching',
  }),
  method: Object.freeze({
    'literature-review': 'Literature review',
    'displayed-endpoint-proximity': 'Displayed endpoint proximity',
    'schematic-teaching': 'Schematic teaching',
  }),
  status: Object.freeze({
    supported: 'Supported',
    qualified: 'Qualified',
    illustrative: 'Illustrative',
  }),
  confidence: Object.freeze({
    high: 'High confidence',
    moderate: 'Moderate confidence',
    low: 'Low confidence',
    'not-applicable': 'Confidence not applicable',
  }),
});

function selectionState({
  previewedId = null,
  previewInput = null,
  detailsId = null,
  sticky = false,
} = {}) {
  return Object.freeze({ previewedId, previewInput, detailsId, sticky });
}

function requireCatalog(catalog) {
  if (!catalog?.entitiesById || !catalog?.inspectablesById || !Array.isArray(catalog.inspectableIds)) {
    throw new TypeError('anatomy inspector requires a complete inspectable catalog');
  }
}

function ownerHasVisibleHemisphere(snapshot, entity) {
  if (entity.hemisphereMode === 'none') return true;
  const global = snapshot.hemispheres?.global;
  if (typeof global?.L !== 'boolean' || typeof global?.R !== 'boolean') {
    throw new TypeError('anatomy inspector requires complete global hemisphere state');
  }
  if (entity.hemisphereMode === 'global') return global.L || global.R;
  const local = snapshot.hemispheres?.entities?.[entity.id] ?? { L: true, R: true };
  return (global.L && local.L) || (global.R && local.R);
}

export function availableInspectableIds(snapshot, catalog) {
  requireCatalog(catalog);
  if (!Array.isArray(snapshot?.visibility?.entities)) {
    throw new TypeError('anatomy inspector requires complete visibility state');
  }
  const visible = new Set(snapshot.visibility.entities);
  return catalog.inspectableIds.filter((id) => {
    const inspectable = catalog.inspectablesById[id];
    const owner = catalog.entitiesById[inspectable.entity];
    if (!owner) throw new RangeError(`unknown inspectable owner entity: ${inspectable.entity}`);
    return visible.has(owner.id) && ownerHasVisibleHemisphere(snapshot, owner);
  });
}

export function createAnatomyDetailViewModel(id, catalog) {
  requireCatalog(catalog);
  const inspectable = catalog.inspectablesById[id];
  if (!inspectable) throw new RangeError(`unknown inspectable: ${id}`);
  const owner = catalog.entitiesById[inspectable.entity];
  if (!owner) throw new RangeError(`unknown inspectable owner entity: ${inspectable.entity}`);
  const fidelity = catalog.fidelityById?.[inspectable.fidelity];
  if (!fidelity) throw new RangeError(`unknown inspectable fidelity record: ${inspectable.fidelity}`);

  const relationships = inspectable.relationships.map((relationship) => {
    const target = catalog.inspectablesById[relationship.target];
    if (!target) throw new RangeError(`unknown inspectable relationship target: ${relationship.target}`);
    return {
      ...structuredClone(relationship),
      targetLabel: target.label,
      labels: {
        direction: RELATIONSHIP_LABELS.direction[relationship.direction],
        evidence: RELATIONSHIP_LABELS.evidence[relationship.evidence],
        method: RELATIONSHIP_LABELS.method[relationship.method],
        status: RELATIONSHIP_LABELS.status[relationship.status],
        confidence: RELATIONSHIP_LABELS.confidence[relationship.confidence],
      },
    };
  });

  return deepFreeze({
    id: inspectable.id,
    entity: owner.id,
    label: inspectable.label,
    shortLabel: inspectable.shortLabel,
    description: inspectable.description,
    relationships,
    geometry: structuredClone(fidelity.geometry),
    activity: structuredClone(fidelity.activity),
    limitations: structuredClone(fidelity.limitations.filter(({ material }) => material)),
    anatomySources: structuredClone(inspectable.sources),
    dataSources: structuredClone(fidelity.sources),
    licenses: structuredClone(fidelity.licenses),
    reviewed: fidelity.reviewed,
  });
}

export function createAnatomySelectionState() {
  return selectionState();
}

function requireId(intent) {
  if (typeof intent.id !== 'string' || !intent.id) throw new TypeError('anatomy selection intent requires an ID');
}

function requireInput(intent) {
  if (!INPUTS.has(intent.input)) throw new TypeError(`unknown anatomy selection input: ${intent.input}`);
}

export function applyAnatomySelectionIntent(state, intent) {
  if (!state || typeof state !== 'object') throw new TypeError('anatomy selection state is required');
  if (!intent || typeof intent !== 'object') throw new TypeError('anatomy selection intent is required');
  switch (intent.type) {
    case 'preview':
      requireId(intent);
      requireInput(intent);
      if (state.detailsId) return state;
      return selectionState({ previewedId: intent.id, previewInput: intent.input });
    case 'clear':
      requireInput(intent);
      if (state.detailsId || state.sticky || state.previewInput !== intent.input) return state;
      return selectionState();
    case 'activate':
      requireId(intent);
      requireInput(intent);
      return selectionState({
        previewedId: intent.id,
        previewInput: intent.input,
        detailsId: intent.id,
        sticky: true,
      });
    case 'touch':
      requireId(intent);
      if (state.previewedId === intent.id && state.previewInput === 'touch' && state.sticky) {
        return selectionState({
          previewedId: intent.id,
          previewInput: 'touch',
          detailsId: intent.id,
          sticky: true,
        });
      }
      return selectionState({ previewedId: intent.id, previewInput: 'touch', sticky: true });
    case 'close-details':
      if (!state.detailsId) return state;
      return selectionState({
        previewedId: state.previewedId,
        previewInput: state.previewInput,
        sticky: state.sticky,
      });
    case 'availability': {
      if (!Array.isArray(intent.ids) || intent.ids.some((id) => typeof id !== 'string')) {
        throw new TypeError('anatomy availability intent requires an ID array');
      }
      return state.previewedId && !intent.ids.includes(state.previewedId) ? selectionState() : state;
    }
    case 'reset':
      return selectionState();
    default:
      throw new RangeError(`unknown anatomy selection intent: ${intent.type}`);
  }
}

export function anatomyPointerNdc({ clientX, clientY, rect }) {
  if (![clientX, clientY, rect?.left, rect?.top, rect?.width, rect?.height].every(Number.isFinite)
      || !(rect.width > 0) || !(rect.height > 0)) {
    throw new TypeError('pointer NDC requires finite coordinates and a positive rectangle');
  }
  return Object.freeze({
    x: ((clientX - rect.left) / rect.width) * 2 - 1,
    y: -((clientY - rect.top) / rect.height) * 2 + 1,
  });
}

export function nearestAnatomyHit(hits) {
  if (!Array.isArray(hits)) throw new TypeError('anatomy hits must be an array');
  if (hits.length === 0) return null;
  const valid = hits.map((hit) => {
    if (typeof hit?.id !== 'string' || !hit.id || !Number.isFinite(hit.distance) || hit.distance < 0) {
      throw new TypeError('anatomy hits require an ID and nonnegative distance');
    }
    return hit;
  });
  const nearest = [...valid].sort((a, b) => a.distance - b.distance || a.id.localeCompare(b.id))[0];
  return Object.freeze({ id: nearest.id, distance: nearest.distance });
}

export function anatomyTapIntent({
  startX,
  startY,
  endX,
  endY,
  maxDistance = 8,
}) {
  const values = [startX, startY, endX, endY, maxDistance];
  if (!values.every(Number.isFinite) || maxDistance < 0) {
    throw new TypeError('tap intent requires finite coordinates and a nonnegative threshold');
  }
  return Math.hypot(endX - startX, endY - startY) <= maxDistance;
}
