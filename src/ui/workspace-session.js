import {
  applyExploreCommands,
  createSceneExploreSnapshot,
} from './explore-session.js';

const HISTORY_SCHEMA_VERSION = 1;
const HISTORY_MODES = new Set(['atlas', 'lesson', 'inspect']);
const SOURCE_KINDS = new Set(['reference', 'local']);
const FOCUS_TARGETS = new Set(['back-to-atlas']);

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function nonEmptyString(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function knownIds(values, label) {
  if (!Array.isArray(values) || values.some((value) => typeof value !== 'string')) {
    throw new TypeError(`${label} must be an array of strings`);
  }
  return new Set(values);
}

function validHistoryState(value) {
  return value
    && typeof value === 'object'
    && value.schemaVersion === HISTORY_SCHEMA_VERSION
    && HISTORY_MODES.has(value.mode);
}

export function createCheckedLessonEntry({ id, candidate, summary }) {
  nonEmptyString(id, 'checked lesson ID');
  nonEmptyString(summary, 'checked lesson summary');
  const preview = candidate?.summary;
  if (!preview || typeof preview.title !== 'string' || !Number.isInteger(preview.sceneCount)) {
    throw new TypeError('checked lesson candidate requires validated summary data');
  }
  return freezeDeep({
    id,
    title: preview.title,
    status: preview.status ?? null,
    statusLabel: preview.statusLabel ?? null,
    sceneCount: preview.sceneCount,
    summary,
  });
}

export function createHistoryIntent({
  mode,
  checkedLessonId,
  sessionKey,
  serial,
}) {
  if (!HISTORY_MODES.has(mode)) throw new RangeError(`unknown workspace mode: ${mode}`);
  if (!Number.isInteger(serial) || serial < 0) {
    throw new RangeError('history serial must be a non-negative integer');
  }
  const hasChecked = checkedLessonId !== undefined;
  const hasSession = sessionKey !== undefined;
  if (mode === 'atlas' && (hasChecked || hasSession)) {
    throw new TypeError('Atlas history cannot include lesson or session keys');
  }
  if (mode === 'lesson' && hasChecked === hasSession) {
    throw new TypeError('Lesson history requires either a checked lesson ID or a session key');
  }
  if (mode === 'inspect' && !hasSession) {
    throw new TypeError('Inspect history requires a session key');
  }
  if (mode === 'inspect' && hasChecked) {
    throw new TypeError('Inspect history cannot include a checked lesson ID');
  }
  const result = { schemaVersion: HISTORY_SCHEMA_VERSION, mode };
  if (hasChecked) result.checkedLessonId = nonEmptyString(checkedLessonId, 'checked lesson ID');
  if (hasSession) result.sessionKey = nonEmptyString(sessionKey, 'session key');
  result.serial = serial;
  return Object.freeze(result);
}

export function parseWorkspaceLocation({
  search,
  historyState,
  checkedIds,
  availableSessionKeys,
}) {
  if (typeof search !== 'string') throw new TypeError('workspace search must be a string');
  const checked = knownIds(checkedIds, 'checked IDs');
  const available = knownIds(availableSessionKeys, 'available session keys');
  const params = new URLSearchParams(search);

  if (validHistoryState(historyState)) {
    if ((historyState.mode === 'inspect'
      || (historyState.mode === 'lesson' && historyState.sessionKey))
      && typeof historyState.sessionKey === 'string') {
      if (!available.has(historyState.sessionKey)) {
        return Object.freeze({ mode: 'atlas', recovery: 'session-unavailable' });
      }
      if (historyState.mode === 'inspect') {
        return Object.freeze({
          mode: 'inspect', sessionKey: historyState.sessionKey, recovery: null,
        });
      }
      return Object.freeze({
        mode: 'lesson', sourceKind: 'local', sessionKey: historyState.sessionKey, recovery: null,
      });
    }
    if (historyState.mode === 'atlas') {
      return Object.freeze({ mode: 'atlas', recovery: null });
    }
    if (historyState.mode === 'lesson' && typeof historyState.checkedLessonId === 'string') {
      if (!checked.has(historyState.checkedLessonId)) {
        return Object.freeze({ mode: 'atlas', recovery: 'unknown-lesson' });
      }
      return Object.freeze({
        mode: 'lesson',
        sourceKind: 'reference',
        checkedLessonId: historyState.checkedLessonId,
        recovery: null,
      });
    }
  }

  const lessonId = params.get('lesson');
  if (lessonId !== null) {
    if (lessonId === 'local') {
      return Object.freeze({ mode: 'atlas', recovery: 'session-unavailable' });
    }
    if (!checked.has(lessonId)) {
      return Object.freeze({ mode: 'atlas', recovery: 'unknown-lesson' });
    }
    return Object.freeze({
      mode: 'lesson', sourceKind: 'reference', checkedLessonId: lessonId, recovery: null,
    });
  }
  return Object.freeze({ mode: 'atlas', recovery: null });
}

export function workspaceUrl({ currentUrl, checkedLessonId }) {
  const url = new URL(currentUrl);
  url.searchParams.delete('lesson');
  if (checkedLessonId !== undefined) {
    url.searchParams.set('lesson', nonEmptyString(checkedLessonId, 'checked lesson ID'));
  }
  return `${url.pathname}${url.search}`;
}

export function captureAtlasSnapshot(snapshot, renderedCamera, catalog) {
  return applyExploreCommands(snapshot, [], renderedCamera, catalog);
}

export function createSceneInspectionSnapshot(snapshot, renderedCamera, catalog) {
  return createSceneExploreSnapshot(snapshot, renderedCamera, catalog);
}

export function createLessonResumeToken({
  lessonKey,
  sourceKind,
  activeIndex,
  sceneCount,
  hasEntryScene,
  scrollTop,
  selectedVisualId,
  snapshot,
  renderedCamera,
  focusTarget,
}, catalog) {
  nonEmptyString(lessonKey, 'lesson key');
  if (!SOURCE_KINDS.has(sourceKind)) throw new RangeError(`unknown lesson source kind: ${sourceKind}`);
  if (!Number.isInteger(sceneCount) || sceneCount < 1) {
    throw new RangeError('scene count must be a positive integer');
  }
  const validEntry = activeIndex === -1 && hasEntryScene === true;
  if (!Number.isInteger(activeIndex)
    || (!validEntry && (activeIndex < 0 || activeIndex >= sceneCount))) {
    throw new RangeError('lesson active index is out of bounds');
  }
  if (!Number.isFinite(scrollTop) || scrollTop < 0) {
    throw new RangeError('lesson scroll position must be a non-negative finite number');
  }
  if (!catalog?.visualIds?.includes(selectedVisualId)) {
    throw new RangeError(`unknown lesson visual: ${selectedVisualId}`);
  }
  if (!FOCUS_TARGETS.has(focusTarget)) {
    throw new RangeError(`unknown lesson focus target: ${focusTarget}`);
  }
  return freezeDeep({
    lessonKey,
    sourceKind,
    activeIndex,
    scrollTop,
    selectedVisualId,
    snapshot: captureAtlasSnapshot(snapshot, renderedCamera, catalog),
    focusTarget,
  });
}
