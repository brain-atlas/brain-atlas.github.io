import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { build as viteBuild } from 'vite';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const STAGING_DIR = join(ROOT, 'internal', 'site', 'dist');
const PLACEHOLDER = join(STAGING_DIR, '.gitkeep');
const BUILD_DIR = join(ROOT, 'build');

export function targetBinaryName(goos) {
  return goos === 'windows' ? 'brain-atlas.exe' : 'brain-atlas';
}

export function goBuildEnvironment(baseEnvironment) {
  return { ...baseEnvironment, CGO_ENABLED: '0' };
}

function hostGoos(platform) {
  return platform === 'win32' ? 'windows' : platform;
}

async function buildStandalone() {
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'check-publish.mjs')], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  const previousStandalone = process.env.BRAIN_ATLAS_STANDALONE;
  process.env.BRAIN_ATLAS_STANDALONE = '1';
  try {
    await viteBuild({ mode: 'production' });
  } finally {
    if (previousStandalone === undefined) delete process.env.BRAIN_ATLAS_STANDALONE;
    else process.env.BRAIN_ATLAS_STANDALONE = previousStandalone;
    await mkdir(STAGING_DIR, { recursive: true });
    await writeFile(PLACEHOLDER, '');
  }

  await mkdir(BUILD_DIR, { recursive: true });
  const targetGoos = process.env.GOOS || hostGoos(process.platform);
  const output = join(BUILD_DIR, targetBinaryName(targetGoos));
  execFileSync('go', [
    'build',
    '-trimpath',
    '-ldflags=-s -w',
    '-o', output,
    './cmd/brain-atlas',
  ], {
    cwd: ROOT,
    env: goBuildEnvironment(process.env),
    stdio: 'inherit',
  });
  console.log(`Standalone Brain Atlas binary: ${output}`);
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  buildStandalone().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
