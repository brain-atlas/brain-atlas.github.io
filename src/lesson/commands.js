import { createDiagnostic, throwContractDiagnostics } from './diagnostics.js';
import {
  normalizeCanonicalSnapshot,
  normalizeSceneSnapshot,
} from './scene-state.js';
import { validateSceneCommand } from './schemas.js';

function directiveFromSnapshot(snapshot) {
  return {
    id: 'command',
    visual: snapshot.visual.id,
    camera: structuredClone(snapshot.camera),
    show: [...snapshot.visibility.entities],
    hemispheres: structuredClone(snapshot.hemispheres),
    cutaway: snapshot.cutaway.position,
    tissueOpacity: snapshot.material.tissueOpacity,
    playback: structuredClone(snapshot.playback),
    selection: structuredClone(snapshot.selection),
    controls: { mode: snapshot.controlPolicy.mode },
    layout: snapshot.visual.layout,
  };
}

export function applySceneCommand(snapshot, command, catalog) {
  throwContractDiagnostics('scene command is invalid', validateSceneCommand(command));
  if ('entity' in command && !catalog.entityIds.includes(command.entity)) {
    throwContractDiagnostics('scene command contains an unknown entity', [
      createDiagnostic(
        'scene.semantic.unknown-entity',
        `unknown entity ID: ${command.entity}`,
        { path: '/entity' },
      ),
    ]);
  }
  if (command.type === 'scene.replace') {
    return normalizeCanonicalSnapshot(command.snapshot, catalog);
  }

  const next = directiveFromSnapshot(snapshot);
  switch (command.type) {
    case 'camera.set':
      next.camera = structuredClone(command.camera);
      break;
    case 'visibility.set': {
      const visible = new Set(next.show);
      if (command.visible) visible.add(command.entity);
      else visible.delete(command.entity);
      next.show = [...visible];
      break;
    }
    case 'hemispheres.set-global':
      next.hemispheres.global = { L: command.L, R: command.R };
      break;
    case 'hemispheres.set-entity':
      next.hemispheres.entities[command.entity] = { L: command.L, R: command.R };
      break;
    case 'cutaway.set':
      next.cutaway = command.position;
      break;
    case 'material.set':
      next.tissueOpacity = command.tissueOpacity;
      break;
    case 'playback.set':
      next.playback = {
        playing: command.playing,
        speed: command.speed,
        settled: command.settled,
      };
      break;
    case 'selection.set':
      next.selection = {
        selected: command.selected,
        emphasized: [...command.emphasized],
        strength: command.strength,
      };
      break;
    case 'visual.set':
      next.visual = command.visual;
      next.layout = command.layout;
      break;
    case 'controls.set':
      next.controls.mode = command.mode;
      break;
  }
  return normalizeSceneSnapshot(next, catalog);
}
