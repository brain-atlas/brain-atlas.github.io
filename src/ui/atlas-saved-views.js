import { validateAtlasSnapshot } from './atlas-storage.js';
import { deepFreeze } from '../lesson/scene-state.js';

export const SAVED_VIEWS_KEY = 'brain-atlas.saved-views';
const MAX_VIEWS = 20;
const MAX_RECORD_BYTES = 1024 * 1024;

function viewName(value) {
  if (typeof value !== 'string') throw new TypeError('Enter a view name.');
  const name = value.trim().normalize('NFC');
  if (!name || name.length > 80 || /[\u0000-\u001f\u007f-\u009f]/u.test(name)) {
    throw new TypeError('Use a view name of 1–80 characters without control characters.');
  }
  return name;
}

function exactFields(value, fields) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).sort().join(',') === fields;
}

function validateViews(views, catalog) {
  if (!Array.isArray(views) || views.length > MAX_VIEWS) throw new TypeError('Keep at most 20 saved views. Delete a view first.');
  const names = new Set();
  return deepFreeze(views.map(entry => {
    if (!exactFields(entry, 'name,snapshot')) throw new TypeError('Invalid saved view.');
    const name = viewName(entry.name);
    if (entry.name !== name) throw new TypeError('Invalid stored view name.');
    if (names.has(name.toLowerCase())) throw new TypeError('A view with this name already exists. Choose another name.');
    names.add(name.toLowerCase());
    return { name, snapshot: validateAtlasSnapshot(entry.snapshot, catalog) };
  }));
}

function checkSize(text) {
  if (typeof text !== 'string' || text.length > MAX_RECORD_BYTES
    || new TextEncoder().encode(text).length > MAX_RECORD_BYTES) {
    throw new TypeError('Saved views exceed the 1 MiB storage limit. Delete a view first.');
  }
}

function serializeViews(views, catalog) {
  const text = JSON.stringify({ schemaVersion: 1, views: validateViews(views, catalog) });
  checkSize(text);
  return text;
}

export function changeSavedViews(views, action, catalog) {
  const next = [...validateViews(views, catalog)];
  const name = viewName(action.name);
  if (action.type === 'save') {
    next.push({ name, snapshot: action.snapshot });
  } else if (action.type === 'rename' || action.type === 'delete') {
    const index = next.findIndex(entry => entry.name === name);
    if (index < 0) throw new TypeError('Saved view not found. Select a view.');
    if (action.type === 'delete') next.splice(index, 1);
    else next[index] = { ...next[index], name: viewName(action.nextName) };
  } else {
    throw new TypeError('Unknown saved-view action.');
  }
  const validated = validateViews(next, catalog);
  serializeViews(validated, catalog);
  return validated;
}

export function readSavedViews(getStorage, catalog) {
  try {
    const storage = getStorage();
    const text = storage.getItem(SAVED_VIEWS_KEY);
    if (text === null) return { status: 'empty', views: deepFreeze([]) };
    try {
      checkSize(text);
      const record = JSON.parse(text);
      if (!exactFields(record, 'schemaVersion,views') || record.schemaVersion !== 1) {
        throw new TypeError('Unsupported saved-view record.');
      }
      return { status: 'restored', views: validateViews(record.views, catalog) };
    } catch {
      storage.removeItem(SAVED_VIEWS_KEY);
      return { status: 'discarded', views: deepFreeze([]) };
    }
  } catch {
    return { status: 'unavailable', views: deepFreeze([]) };
  }
}

export function writeSavedViews(getStorage, views, catalog) {
  let text;
  try {
    text = serializeViews(views, catalog);
  } catch {
    return 'invalid';
  }
  try {
    getStorage().setItem(SAVED_VIEWS_KEY, text);
    return 'saved';
  } catch {
    return 'unavailable';
  }
}
