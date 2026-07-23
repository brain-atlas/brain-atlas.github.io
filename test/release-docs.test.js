import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('README leads with hosted and binary user paths before development setup', () => {
  const readme = read('README.md');
  const use = readme.indexOf('## Use Brain Atlas');
  const hosted = readme.indexOf('https://brain-atlas.github.io/');
  const nightly = readme.indexOf('/releases/tag/nightly');
  const development = readme.indexOf('## Development');
  const devCommand = readme.indexOf('npm run dev');

  assert.ok(use > 0);
  assert.ok(hosted > use && nightly > hosted);
  assert.ok(development > nightly);
  assert.ok(devCommand > development, 'developer command appeared in the primary user path');
  assert.match(readme, /Linux[\s\S]*macOS[\s\S]*Windows/);
});

test('macOS unsigned guidance is checksum-first and narrowly scoped', () => {
  const readme = read('README.md');
  const checksum = readme.indexOf('shasum -a 256');
  const openAnyway = readme.indexOf('Open Anyway');
  const quarantine = readme.indexOf('xattr -d com.apple.quarantine');

  assert.ok(checksum > 0 && openAnyway > checksum && quarantine > openAnyway);
  for (const forbidden of ['spctl --master-disable', 'xattr -r', 'xattr -cr', 'sudo xattr']) {
    assert.equal(readme.includes(forbidden), false);
  }
  assert.match(readme, /Do not use `sudo`, disable Gatekeeper, or recursively clear quarantine/);
});

test('release, architecture, security, and subsystem docs describe both channels and verification', () => {
  const releases = read('docs/RELEASES.md');
  const architecture = read('docs/ARCHITECTURE.md');
  const security = read('docs/SECURITY_REVIEW.md');
  const spec = read('internal/releasepack/SPEC.md');
  const manifest = read('docs/specs/MANIFEST.md');

  for (const phrase of ['## Channels', '## Nightly publication', '## Stable publication', 'SHA256SUMS', '## Unsigned binaries']) {
    assert.ok(releases.includes(phrase), `release documentation missing ${phrase}`);
  }
  assert.match(architecture, /## Standalone release boundary/);
  assert.match(releases, /draft-aware `gh release view`/);
  assert.match(architecture, /published-only REST lookup/);
  assert.match(security, /draft-aware release discovery/);
  assert.match(security, /L-7[\s\S]*server-reported[\s\S]*Stable/);
  assert.match(spec, /## Invariants[\s\S]*INV-8/);
  assert.match(manifest, /internal\/releasepack\/SPEC\.md/);
});
