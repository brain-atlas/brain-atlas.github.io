import { normalizeCanonicalSnapshot } from '../lesson/index.js';

export const ATLAS_STORAGE_KEY = 'brain-atlas.atlas-state';
const MAX_RECORD_LENGTH = 128 * 1024;

export function validateAtlasSnapshot(value, catalog) {
  const snapshot = normalizeCanonicalSnapshot(value, catalog);
  const { camera, visual, controlPolicy } = snapshot;
  const distance = Math.hypot(...camera.position.map((value, index) => value - camera.target[index]));
  if (visual.id !== 'atlas' || visual.layout !== 'dominant' || controlPolicy.mode !== 'explore'
    || camera.transition.kind !== 'instant' || camera.transition.durationMs !== 0
    || [...camera.position, ...camera.target].some((value) => !Number.isFinite(value) || Math.abs(value) > 1e6)
    || distance < 1 || distance > 1e6) {
    throw new TypeError('Stored state must be a bounded, instant global Atlas view');
  }
  return snapshot;
}

export function readAtlasState(getStorage, catalog) {
  try {
    const storage = getStorage();
    const text = storage.getItem(ATLAS_STORAGE_KEY);
    if (text === null) return { status: 'empty', snapshot: null };
    try {
      if (typeof text !== 'string' || text.length > MAX_RECORD_LENGTH) throw new TypeError('Atlas record too large');
      const record = JSON.parse(text);
      if (!record || Array.isArray(record) || record.schemaVersion !== 1
        || Object.keys(record).sort().join(',') !== 'schemaVersion,snapshot') {
        throw new TypeError('Unsupported Atlas storage record');
      }
      return { status: 'restored', snapshot: validateAtlasSnapshot(record.snapshot, catalog) };
    } catch {
      storage.removeItem(ATLAS_STORAGE_KEY);
      return { status: 'discarded', snapshot: null };
    }
  } catch {
    return { status: 'unavailable', snapshot: null };
  }
}

export function writeAtlasState(getStorage, snapshot, catalog) {
  let text;
  try {
    text = JSON.stringify({ schemaVersion: 1, snapshot: validateAtlasSnapshot(snapshot, catalog) });
    if (text.length > MAX_RECORD_LENGTH) return 'invalid';
  } catch {
    return 'invalid';
  }
  try {
    getStorage().setItem(ATLAS_STORAGE_KEY, text);
    return 'saved';
  } catch {
    return 'unavailable';
  }
}
