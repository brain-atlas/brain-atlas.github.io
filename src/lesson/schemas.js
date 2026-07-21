import Ajv from 'ajv';

import { schemaErrorsToDiagnostics } from './diagnostics.js';

export const LESSON_SCHEMA_VERSION = 1;

const stableId = {
  type: 'string',
  minLength: 1,
  pattern: '^[a-z][a-z0-9]*(?:[.-][a-z0-9]+)*$',
};

const nonEmptyText = { type: 'string', minLength: 1 };
const httpsUrl = { type: 'string', pattern: '^https://' };
const hemisphereFilter = {
  type: 'object',
  additionalProperties: false,
  required: ['L', 'R'],
  properties: {
    L: { type: 'boolean' },
    R: { type: 'boolean' },
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

const ajv = new Ajv({ allErrors: true, strict: true });
const lessonMetadataValidator = ajv.compile(lessonMetadataSchema);
const sceneDirectiveValidator = ajv.compile(sceneDirectiveSchema);

function validate(validator, scope, value, location) {
  if (validator(value)) return [];
  return schemaErrorsToDiagnostics(scope, validator.errors, location);
}

export function validateLessonMetadata(value, location) {
  return validate(lessonMetadataValidator, 'lesson', value, location);
}

export function validateSceneDirective(value, location) {
  return validate(sceneDirectiveValidator, 'scene', value, location);
}
