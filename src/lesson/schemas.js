import { createDiagnostic, schemaErrorsToDiagnostics } from './diagnostics.js';
import * as validators from './generated-validators.js';

export * from './schema-definitions.js';

const commandValidators = {
  'scene.replace': validators.commandSceneReplace,
  'camera.set': validators.commandCameraSet,
  'visibility.set': validators.commandVisibilitySet,
  'hemispheres.set-global': validators.commandHemispheresSetGlobal,
  'hemispheres.set-entity': validators.commandHemispheresSetEntity,
  'fibre-filter.set': validators.commandFibreFilterSet,
  'cutaway.set': validators.commandCutawaySet,
  'material.set': validators.commandMaterialSet,
  'playback.set': validators.commandPlaybackSet,
  'selection.set': validators.commandSelectionSet,
  'visual.set': validators.commandVisualSet,
  'controls.set': validators.commandControlsSet,
};

function validate(validator, scope, value, location) {
  if (validator(value)) return [];
  return schemaErrorsToDiagnostics(scope, validator.errors, location);
}

export function validateLessonMetadata(value, location) {
  return validate(validators.lessonMetadata, 'lesson', value, location);
}

export function validateSceneDirective(value, location) {
  return validate(validators.sceneDirective, 'scene', value, location);
}

export function validateEntityCatalog(value, location) {
  return validate(validators.entityCatalog, 'catalog.entities', value, location);
}

export function validateFidelityCatalog(value, location) {
  return validate(validators.fidelityCatalog, 'catalog.fidelity', value, location);
}

export function validateFibreFilterPresetCatalog(value, location) {
  return validate(validators.fibreFilterPresetCatalog, 'catalog.fibre-filter-presets', value, location);
}

export function validateSceneCommand(value, location) {
  const validator = commandValidators[value?.type];
  if (!validator) {
    return [createDiagnostic(
      'scene.command.unknown',
      `unknown scene command: ${value?.type ?? '(missing)'}`,
      { ...(location?.origin ?? {}), path: '/type' },
    )];
  }
  return validate(validator, 'scene.command', value, location);
}
