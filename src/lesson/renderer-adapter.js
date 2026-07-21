import { createDiagnostic, throwContractDiagnostics } from './diagnostics.js';
import {
  normalizeCanonicalSnapshot,
  serializeSceneSnapshot,
} from './scene-state.js';

export const RENDERER_BINDING_ORDER = Object.freeze([
  'setCamera',
  'setVisibility',
  'setHemispheres',
  'setCutaway',
  'setMaterial',
  'setPlayback',
  'setSelection',
  'setVisual',
  'setControlPolicy',
]);

export function createRendererAdapter(bindings, catalog) {
  const required = [...RENDERER_BINDING_ORDER, 'capture'];
  const diagnostics = required
    .filter((name) => typeof bindings?.[name] !== 'function')
    .map((name) => createDiagnostic(
      'renderer.adapter.missing-binding',
      `renderer adapter requires binding: ${name}`,
      { path: `/${name}` },
    ));
  throwContractDiagnostics('renderer adapter bindings are incomplete', diagnostics);

  function capture() {
    return normalizeCanonicalSnapshot(bindings.capture(), catalog);
  }

  function apply(snapshot) {
    const next = normalizeCanonicalSnapshot(snapshot, catalog);
    bindings.setCamera(next.camera);
    bindings.setVisibility(next.visibility);
    bindings.setHemispheres(next.hemispheres);
    bindings.setCutaway(next.cutaway);
    bindings.setMaterial(next.material);
    bindings.setPlayback(next.playback);
    bindings.setSelection(next.selection);
    bindings.setVisual(next.visual);
    bindings.setControlPolicy(next.controlPolicy);

    const captured = capture();
    if (serializeSceneSnapshot(captured) !== serializeSceneSnapshot(next)) {
      throwContractDiagnostics('renderer did not apply the complete scene snapshot', [
        createDiagnostic(
          'renderer.adapter.capture-mismatch',
          'captured renderer state differs from the requested snapshot',
        ),
      ]);
    }
    return captured;
  }

  return Object.freeze({ apply, capture });
}
