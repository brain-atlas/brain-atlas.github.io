import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

import { projectTractMetadata } from '../src/tract-metadata.js';

async function main([input]) {
  if (!input) throw new TypeError('usage: node scripts/project-tract-metadata.mjs <tracts.json>');
  const source = JSON.parse(await readFile(input, 'utf8'));
  process.stdout.write(`${JSON.stringify(projectTractMetadata(source), null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
