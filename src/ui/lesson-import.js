import { parseLesson } from '../lesson/index.js';
import { createLessonPresentation } from './lesson-presentation.js';

export const MAX_LESSON_SOURCE_BYTES = 512 * 1024;

function freezeDeep(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freezeDeep(child);
  return Object.freeze(value);
}

function cloneCatalogValue(value) {
  if (Array.isArray(value)) return value.map(cloneCatalogValue);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, cloneCatalogValue(nested)]));
  }
  return value;
}

export function createLessonRuntimeCatalog(catalog, lesson) {
  if (!catalog || typeof catalog !== 'object') throw new TypeError('catalog must be an object');
  if (!lesson || !Array.isArray(lesson.visuals)) throw new TypeError('lesson visuals must be an array');
  return freezeDeep({
    ...cloneCatalogValue(catalog),
    visualIds: [...new Set([
      ...(catalog.visualIds ?? []),
      ...lesson.visuals.map(({ id }) => id),
    ])].sort((a, b) => a.localeCompare(b)),
  });
}

function failure(code, message, location = {}) {
  return freezeDeep({
    ok: false,
    diagnostics: [{
      code,
      message,
      line: location.line ?? 1,
      column: location.column ?? 1,
      path: location.path ?? '',
    }],
  });
}

function freezeFailure(diagnostics) {
  return freezeDeep({ ok: false, diagnostics: structuredClone(diagnostics) });
}

export function validateLessonImport(source, catalog) {
  if (typeof source !== 'string') throw new TypeError('lesson source must be a string');
  if (source.trim() === '') {
    return failure(
      'import.source.empty',
      'Paste lesson Markdown or choose a local Markdown file.',
    );
  }
  if (
    source.length > MAX_LESSON_SOURCE_BYTES
    || new TextEncoder().encode(source).byteLength > MAX_LESSON_SOURCE_BYTES
  ) {
    return failure(
      'import.source.too-large',
      'Lesson source exceeds the 512 KiB local import limit.',
    );
  }

  const parsed = parseLesson(source, catalog);
  if (!parsed.ok) return freezeFailure(parsed.diagnostics);

  let presentation;
  try {
    presentation = createLessonPresentation(parsed.value);
  } catch (error) {
    return failure(
      'import.presentation.invalid',
      `Lesson cannot be presented: ${error.message}`,
      { path: '/entryScene' },
    );
  }

  const presentedScenes = [presentation.entryScene, ...presentation.scenes].filter(Boolean);
  const missingFidelity = presentedScenes.find(({ fidelityIds }) => fidelityIds.length === 0);
  if (missingFidelity) {
    return failure(
      'import.presentation.invalid',
      `Scene "${missingFidelity.id}" must reference at least one curated fidelity record.`,
      { ...missingFidelity.source, path: '/fidelity' },
    );
  }

  const externalHosts = [...new Set(parsed.value.visuals.map(({ src }) => new URL(src).hostname))]
    .sort((a, b) => a.localeCompare(b));
  return freezeDeep({
    ok: true,
    value: {
      lesson: parsed.value,
      presentation,
      summary: {
        title: parsed.value.title,
        status: parsed.value.status,
        statusLabel: presentation.statusLabel,
        sceneCount: presentation.scenes.length,
        imageCount: parsed.value.visuals.length,
        externalHosts,
      },
    },
  });
}
