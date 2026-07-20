import { execFileSync } from 'node:child_process';

const untrackedPublicFiles = execFileSync(
  'git',
  ['ls-files', '--others', '--exclude-standard', 'public'],
  { encoding: 'utf8' },
).trim();

if (untrackedPublicFiles) {
  console.error('Refusing to publish untracked files from public/:');
  console.error(untrackedPublicFiles);
  console.error('\nMove, license and commit, or remove these files before publishing.');
  process.exit(1);
}

console.log('Publication check passed: public/ contains no untracked files.');
