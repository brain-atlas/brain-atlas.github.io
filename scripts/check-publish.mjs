import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync, readdirSync, realpathSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PRIVATE_PATH = /(?:^|\/)(?:data-local|\.pi|\.beads|\.workbench)(?:\/|$)|(?:^|\/)(?:10\.12751_g-node\.be5e62|hcp1065_avg_tracts_trk|mni_icbm152_nlin_asym_09a_nifti)\.zip$/i;

export function isPrivateSource(path) {
  path = path.replace(/[\\/]+$/, '');
  const normalized = path.replaceAll('\\', '/');
  if (PRIVATE_PATH.test(normalized)) return true;
  return existsSync(path) && PRIVATE_PATH.test(realpathSync(path).replaceAll('\\', '/'));
}

export function checkPublicFiles(root = process.cwd()) {
  const publicDir = join(root, 'public');
  const untracked = execFileSync('git', ['ls-files', '--others', '-z', '--', 'public'], {
    cwd: root, encoding: 'utf8',
  }).split('\0').filter(Boolean);
  if (untracked.length) {
    throw new Error(`Refusing to publish untracked (including ignored) files from public/:\n${untracked.join('\n')}`);
  }
  function inspect(path) {
    if (lstatSync(path).isSymbolicLink()) throw new Error(`Refusing to publish symlink: ${path}`);
    if (isPrivateSource(path)) throw new Error(`Refusing to publish private source: ${path}`);
    if (lstatSync(path).isDirectory()) {
      for (const name of readdirSync(path)) inspect(join(path, name));
    }
  }
  if (existsSync(publicDir)) inspect(publicDir);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    checkPublicFiles();
    console.log('Publication check passed: public/ contains only tracked, non-private files and no symlinks.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
