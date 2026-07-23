export const LESSON_SCHEMA_VERSION = 1;

const stableId = {
  type: 'string',
  minLength: 1,
  pattern: '^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$',
};

const nonEmptyText = { type: 'string', minLength: 1 };
const httpsUrl = { type: 'string', format: 'https-url' };
const hemisphereFilter = {
  type: 'object',
  additionalProperties: false,
  required: ['L', 'R'],
  properties: {
    L: { type: 'boolean' },
    R: { type: 'boolean' },
  },
};

const fibreFilterMode = { enum: ['all', 'touches-any', 'connects-within', 'connects-between'] };
const fibreFilterSelectors = {
  type: 'array',
  uniqueItems: true,
  items: stableId,
};
const fibreFilterQueryProperties = {
  mode: fibreFilterMode,
  setA: fibreFilterSelectors,
  setB: fibreFilterSelectors,
};
const fibreFilterQuerySchema = {
  type: 'object',
  additionalProperties: false,
  required: ['mode', 'setA', 'setB'],
  properties: fibreFilterQueryProperties,
};
const fibreFilterStateSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['preset', 'mode', 'setA', 'setB'],
  properties: {
    preset: { anyOf: [stableId, { type: 'null' }] },
    ...fibreFilterQueryProperties,
  },
};

const visualSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'src', 'alt', 'caption', 'credit', 'source'],
  properties: {
    id: stableId,
    type: { const: 'image' },
    src: httpsUrl,
    alt: nonEmptyText,
    caption: nonEmptyText,
    credit: nonEmptyText,
    source: httpsUrl,
    aspectRatio: { type: 'number', exclusiveMinimum: 0 },
  },
};

export const lessonMetadataSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['title', 'schema'],
  properties: {
    id: stableId,
    title: nonEmptyText,
    summary: nonEmptyText,
    entryScene: stableId,
    status: { const: 'draft' },
    schema: { const: LESSON_SCHEMA_VERSION },
    visuals: {
      type: 'array',
      items: visualSchema,
    },
  },
};

const cameraSchema = {
  oneOf: [
    stableId,
    {
      type: 'object',
      additionalProperties: false,
      required: ['position', 'target'],
      properties: {
        position: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: { type: 'number' },
        },
        target: {
          type: 'array',
          minItems: 3,
          maxItems: 3,
          items: { type: 'number' },
        },
        transition: {
          type: 'object',
          additionalProperties: false,
          required: ['kind'],
          properties: {
            kind: { enum: ['instant', 'ease'] },
            durationMs: { type: 'integer', minimum: 0, maximum: 30000 },
          },
        },
      },
    },
  ],
};

const cameraPresetSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['position', 'target'],
  properties: {
    position: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'number' } },
    target: { type: 'array', minItems: 3, maxItems: 3, items: { type: 'number' } },
  },
};

const inspectableRendererSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['kind', 'id'],
  properties: {
    kind: { enum: ['layer', 'region', 'tract', 'landmark'] },
    id: nonEmptyText,
  },
};

const inspectableSourceSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'url'],
  properties: {
    label: nonEmptyText,
    url: httpsUrl,
  },
};

const inspectableRelationshipSchema = {
  type: 'object',
  additionalProperties: false,
  required: [
    'target', 'direction', 'evidence', 'method', 'status', 'confidence',
    'summary', 'sources',
  ],
  properties: {
    target: stableId,
    direction: { enum: ['directed', 'undirected', 'unknown'] },
    evidence: { enum: ['literature-curated', 'displayed-dataset', 'schematic-teaching'] },
    method: { enum: ['literature-review', 'displayed-endpoint-proximity', 'schematic-teaching'] },
    status: { enum: ['supported', 'qualified', 'illustrative'] },
    confidence: { enum: ['high', 'moderate', 'low', 'not-applicable'] },
    summary: nonEmptyText,
    sources: {
      type: 'array',
      minItems: 1,
      items: inspectableSourceSchema,
    },
  },
};

export const entityCatalogSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'cameraPresets', 'inspectables', 'entities'],
  properties: {
    schemaVersion: { const: LESSON_SCHEMA_VERSION },
    cameraPresets: {
      type: 'object',
      minProperties: 1,
      additionalProperties: cameraPresetSchema,
    },
    inspectables: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id', 'entity', 'label', 'shortLabel', 'renderer', 'description',
          'relationships', 'sources',
        ],
        properties: {
          id: stableId,
          entity: stableId,
          label: nonEmptyText,
          shortLabel: nonEmptyText,
          renderer: inspectableRendererSchema,
          description: nonEmptyText,
          relationships: {
            type: 'array',
            items: inspectableRelationshipSchema,
          },
          sources: {
            type: 'array',
            minItems: 1,
            items: inspectableSourceSchema,
          },
        },
      },
    },
    entities: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'type', 'label', 'renderer', 'hemisphereMode', 'fidelity'],
        properties: {
          id: stableId,
          type: { enum: ['layer', 'pathway', 'region', 'tract'] },
          label: nonEmptyText,
          renderer: {
            type: 'object',
            additionalProperties: false,
            required: ['kind', 'id'],
            properties: {
              kind: { enum: ['layer', 'region', 'tract'] },
              id: nonEmptyText,
            },
          },
          hemisphereMode: { enum: ['none', 'global', 'bilateral'] },
          fidelity: stableId,
        },
      },
    },
  },
};

const fidelityStatuses = [
  'data-derived', 'derived', 'mirrored', 'modeled', 'schematic',
  'illustrative', 'display-only', 'none',
];
const statusSection = {
  type: 'object',
  additionalProperties: false,
  required: ['statuses', 'summary'],
  properties: {
    statuses: {
      type: 'array',
      minItems: 1,
      uniqueItems: true,
      items: { enum: fidelityStatuses },
    },
    summary: nonEmptyText,
  },
};
const sourceRecord = {
  type: 'object',
  additionalProperties: false,
  required: ['label', 'url'],
  properties: {
    label: nonEmptyText,
    url: httpsUrl,
  },
};

export const fibreFilterPresetCatalogSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'specialSelectors', 'presets'],
  properties: {
    schemaVersion: { const: LESSON_SCHEMA_VERSION },
    specialSelectors: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label', 'description'],
        properties: {
          id: stableId,
          label: nonEmptyText,
          description: nonEmptyText,
        },
      },
    },
    presets: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label', 'description', 'hemispherePolicy', 'query'],
        properties: {
          id: stableId,
          label: nonEmptyText,
          description: nonEmptyText,
          hemispherePolicy: { const: 'inherit-scene' },
          query: fibreFilterQuerySchema,
        },
      },
    },
  },
};

export const fidelityCatalogSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['schemaVersion', 'records'],
  properties: {
    schemaVersion: { const: LESSON_SCHEMA_VERSION },
    records: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'id', 'geometry', 'activity', 'supports', 'assumptions', 'uncertainties',
          'limitations', 'sources', 'licenses', 'reviewed',
        ],
        properties: {
          id: stableId,
          geometry: statusSection,
          activity: {
            ...statusSection,
            required: ['statuses', 'summary', 'direction'],
            properties: {
              ...statusSection.properties,
              direction: { enum: ['directed', 'undirected', 'modeled', 'none', 'unknown'] },
            },
          },
          supports: { type: 'array', items: nonEmptyText },
          assumptions: { type: 'array', items: nonEmptyText },
          uncertainties: { type: 'array', items: nonEmptyText },
          limitations: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['summary', 'material'],
              properties: {
                summary: nonEmptyText,
                material: { type: 'boolean' },
              },
            },
          },
          sources: { type: 'array', items: sourceRecord },
          licenses: { type: 'array', items: sourceRecord },
          reviewed: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        },
      },
    },
  },
};

export const sceneDirectiveSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'visual', 'camera', 'show', 'controls', 'layout'],
  properties: {
    id: stableId,
    title: nonEmptyText,
    visual: stableId,
    camera: cameraSchema,
    show: {
      type: 'array',
      uniqueItems: true,
      items: stableId,
    },
    fidelity: {
      type: 'array',
      uniqueItems: true,
      items: stableId,
    },
    hemispheres: {
      type: 'object',
      additionalProperties: false,
      properties: {
        global: hemisphereFilter,
        entities: {
          type: 'object',
          additionalProperties: hemisphereFilter,
        },
      },
    },
    fibreFilter: {
      oneOf: [stableId, fibreFilterStateSchema],
    },
    cutaway: { type: 'number', minimum: 0, maximum: 100 },
    tissueOpacity: { type: 'number', minimum: 0, maximum: 1 },
    playback: {
      type: 'object',
      additionalProperties: false,
      properties: {
        playing: { type: 'boolean' },
        speed: { type: 'number', minimum: 15, maximum: 160 },
        settled: { type: 'boolean' },
      },
    },
    selection: {
      type: 'object',
      additionalProperties: false,
      properties: {
        selected: { anyOf: [stableId, { type: 'null' }] },
        emphasized: {
          type: 'array',
          uniqueItems: true,
          items: stableId,
        },
        strength: { type: 'number', minimum: 0, maximum: 1 },
      },
    },
    controls: {
      type: 'object',
      additionalProperties: false,
      required: ['mode'],
      properties: {
        mode: { enum: ['guided', 'look', 'explore'] },
      },
    },
    layout: { enum: ['dominant', 'split', 'detail'] },
  },
};

const commandProperties = {
  'scene.replace': { snapshot: { type: 'object' } },
  'camera.set': { camera: cameraSchema },
  'visibility.set': { entity: stableId, visible: { type: 'boolean' } },
  'hemispheres.set-global': { L: { type: 'boolean' }, R: { type: 'boolean' } },
  'hemispheres.set-entity': { entity: stableId, L: { type: 'boolean' }, R: { type: 'boolean' } },
  'fibre-filter.set': fibreFilterStateSchema.properties,
  'cutaway.set': { position: { type: 'number', minimum: 0, maximum: 100 } },
  'material.set': { tissueOpacity: { type: 'number', minimum: 0, maximum: 1 } },
  'playback.set': {
    playing: { type: 'boolean' },
    speed: { type: 'number', minimum: 15, maximum: 160 },
    settled: { type: 'boolean' },
  },
  'selection.set': {
    selected: { anyOf: [stableId, { type: 'null' }] },
    emphasized: { type: 'array', uniqueItems: true, items: stableId },
    strength: { type: 'number', minimum: 0, maximum: 1 },
  },
  'visual.set': { visual: stableId, layout: { enum: ['dominant', 'split', 'detail'] } },
  'controls.set': { mode: { enum: ['guided', 'look', 'explore'] } },
};

export const commandSchemas = Object.fromEntries(
  Object.entries(commandProperties).map(([type, properties]) => [type, {
    type: 'object',
    additionalProperties: false,
    required: ['type', ...Object.keys(properties)],
    properties: {
      type: { const: type },
      ...properties,
    },
  }]),
);
