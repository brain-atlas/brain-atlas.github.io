import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createLessonCatalog } from '../src/lesson/index.js';
import { createLessonLibrary } from '../src/ui/lesson-library.js';

export function checkLessons(root = new URL('../', import.meta.url)) {
  const files = ['src/lessons/library.json', 'LICENSE', ...[
    'entities', 'fidelity', 'fibre_filter_presets',
  ].map((name) => `public/data/${name}.json`)];
  const read = (path) => readFileSync(new URL(path, root), 'utf8');
  const records = JSON.parse(read(files[0]));
  const catalog = createLessonCatalog(...files.slice(2).map((path) => JSON.parse(read(path))));
  const sources = Object.fromEntries(readdirSync(new URL('src/lessons/', root))
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const path = `src/lessons/${name}`;
      files.push(path);
      return [name, read(path)];
    }));
  const library = createLessonLibrary(records, sources, catalog);
  for (const path of new Set(['LICENSE', ...library.map(({ review }) => review)])) {
    if (!read(path).trim()) throw new Error(`${path}: empty license or review record`);
    files.push(path);
  }
  return { library, files: [...new Set(files)].map((path) => fileURLToPath(new URL(path, root))) };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const { library } = checkLessons();
    console.log(`Lesson check passed: ${library.length} registered lesson(s); schema, presentation, licensing metadata and review files checked. Scientific approval is not inferred.`);
  } catch (error) {
    console.error(`Lesson check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
