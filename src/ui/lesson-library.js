import { validateLessonImport } from './lesson-import.js';
import { createCheckedLessonEntry } from './workspace-session.js';

function exactFields(value, fields, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== [...fields].sort().join(',')) {
    throw new Error(`${label}: invalid fields; expected ${fields.join(', ')}`);
  }
}

function text(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

// Repository metadata is not a lesson-authored review or publication claim.
export function createLessonLibrary(records, sources, catalog) {
  if (!Array.isArray(records) || !records.length) throw new Error('lesson library must be non-empty');
  const ids = new Set();
  const library = records.map((record) => {
    exactFields(record, ['id', 'license', 'review', 'media'], 'lesson library');
    const { id, license, review, media } = record;
    if (typeof id !== 'string' || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(id) || id === 'local') {
      throw new Error(`invalid library lesson ID: ${id}`);
    }
    if (ids.has(id)) throw new Error(`duplicate library lesson ID: ${id}`);
    ids.add(id);
    if (license !== 'AGPL-3.0-only') throw new Error(`${id}: prose license must be AGPL-3.0-only; other terms need a publication design change`);
    if (typeof review !== 'string' || !/^docs\/lessons\/[a-z0-9-]+-validation\.md$/.test(review)) {
      throw new Error(`${id}: invalid review record path`);
    }
    const file = `${id}.md`;
    if (!Object.hasOwn(sources, file)) throw new Error(`${file}: missing source`);
    const result = validateLessonImport(sources[file], catalog);
    if (!result.ok) {
      throw new Error(result.diagnostics.map((d) => `${file}:${d.line}:${d.column} ${d.code} ${d.path}: ${d.message}`).join('\n'));
    }
    const candidate = result.value;
    if (!text(candidate.lesson.summary)) throw new Error(`${file}: library lesson requires a summary`);
    if (!Array.isArray(media)) throw new Error(`${id}: media license records must be an array`);
    const visualIds = candidate.lesson.visuals.map(({ id: visualId }) => visualId);
    const licensed = new Set();
    for (const item of media) {
      exactFields(item, ['id', 'license'], `${id} media`);
      if (!visualIds.includes(item.id) || licensed.has(item.id) || !text(item.license)) {
        throw new Error(`${id}: invalid or duplicate media license record`);
      }
      licensed.add(item.id);
    }
    if (licensed.size !== visualIds.length) throw new Error(`${id}: every declared image needs a media license record`);
    return Object.freeze({
      id, license, review,
      media: Object.freeze(media.map((item) => Object.freeze({ ...item }))),
      candidate,
      entry: createCheckedLessonEntry({ id, candidate, summary: candidate.lesson.summary }),
    });
  });
  for (const file of Object.keys(sources)) {
    if (!library.some(({ id }) => file === `${id}.md`)) throw new Error(`${file}: unregistered lesson source`);
  }
  return Object.freeze(library);
}
