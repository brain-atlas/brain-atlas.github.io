import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function releaseBuildCommands(arguments_) {
  return [
    { command: process.execPath, arguments: ['scripts/build-standalone.mjs', '--site-only'] },
    { command: 'go', arguments: ['run', './cmd/package-standalone', ...arguments_] },
  ];
}

function buildRelease(arguments_) {
  for (const step of releaseBuildCommands(arguments_)) {
    execFileSync(step.command, step.arguments, {
      cwd: ROOT,
      env: process.env,
      stdio: 'inherit',
    });
  }
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  try {
    buildRelease(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
