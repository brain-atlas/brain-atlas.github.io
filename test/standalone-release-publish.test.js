import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, symlink, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  ghCreateDraftArguments,
  ghUploadArguments,
  loadBundle,
  parseArguments,
  publishNightly,
  publishStable,
} from '../scripts/publish-standalone-release.mjs';

const SHA = '1234567890abcdef1234567890abcdef12345678';
const OLD_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

test('parseArguments derives explicit dry-run publication inputs without accepting unsafe refs', () => {
  assert.deepEqual(parseArguments([
    '--channel', 'nightly', '--assets', 'release', '--repo', 'brain-atlas/brain-atlas.github.io',
    '--sha', SHA, '--dry-run',
  ], {}), {
    channel: 'nightly', assetsDir: 'release', repo: 'brain-atlas/brain-atlas.github.io',
    sha: SHA, tag: 'nightly', dryRun: true,
  });
  assert.deepEqual(parseArguments([
    '--channel', 'stable', '--assets', 'release', '--repo', 'brain-atlas/brain-atlas.github.io',
    '--sha', SHA, '--tag', 'v1.2.3-rc.1', '--dry-run',
  ], {}), {
    channel: 'stable', assetsDir: 'release', repo: 'brain-atlas/brain-atlas.github.io',
    sha: SHA, tag: 'v1.2.3-rc.1', dryRun: true,
  });
  assert.throws(() => parseArguments([
    '--channel', 'stable', '--assets', 'release', '--repo', 'brain-atlas/brain-atlas.github.io',
    '--sha', SHA, '--tag', 'version/latest',
  ], {}), /semantic version tag/);
});

test('gh publication arguments preserve draft safety, tag verification, and no-clobber upload', () => {
  const assets = [{ path: '/release/one.zip' }, { path: '/release/two.tar.gz' }];
  const stable = ghCreateDraftArguments({
    repo: 'brain-atlas/brain-atlas.github.io', tag: 'v1.2.3', sha: SHA,
    title: 'Brain Atlas v1.2.3', notesPath: '/tmp/notes', prerelease: false,
    latest: true, generateNotes: true, verifyTag: true, assets,
  });
  assert.ok(stable.includes('--draft'));
  assert.ok(stable.includes('--verify-tag'));
  assert.ok(stable.includes('--generate-notes'));
  assert.ok(stable.includes('--latest=true'));

  const nightly = ghCreateDraftArguments({
    repo: 'brain-atlas/brain-atlas.github.io', tag: 'nightly', sha: SHA,
    title: 'Nightly', notesPath: '/tmp/notes', prerelease: true,
    latest: false, generateNotes: false, verifyTag: false, assets,
  });
  assert.ok(nightly.includes('--prerelease'));
  assert.ok(nightly.includes('--latest=false'));
  assert.equal(nightly.includes('--verify-tag'), false);

  const upload = ghUploadArguments('brain-atlas/brain-atlas.github.io', 'nightly', assets);
  assert.equal(upload.includes('--clobber'), false);
  assert.deepEqual(upload.slice(0, 3), ['release', 'upload', 'nightly']);
});

test('loadBundle verifies checksums and returns every upload asset', async () => {
  const directory = await localBundleDirectory('nightly-1234567890ab', SHA);
  const loaded = await loadBundle(directory);

  assert.equal(loaded.label, 'nightly-1234567890ab');
  assert.equal(loaded.commit, SHA);
  assert.equal(loaded.assets.length, 8);
  assert.equal(loaded.assets.every(({ digest }) => /^[0-9a-f]{64}$/.test(digest)), true);

  const archive = loaded.assets.find(({ name }) => name.endsWith('linux-amd64.tar.gz'));
  await writeFile(archive.path, 'tampered');
  await assert.rejects(() => loadBundle(directory), /checksum mismatch/);
});

test('loadBundle rejects symlinked upload assets even when bytes match', async () => {
  const label = 'nightly-1234567890ab';
  const directory = await localBundleDirectory(label, SHA);
  const name = `brain-atlas-${label}-linux-amd64.tar.gz`;
  const path = join(directory, name);
  const body = await readFile(path);
  const external = join(await mkdtemp(join(tmpdir(), 'brain-atlas-external-')), name);
  await writeFile(external, body);
  await unlink(path);
  await symlink(external, path);

  await assert.rejects(() => loadBundle(directory), /regular files/);
});

test('loadBundle rejects provenance that mislabels an archive target', async () => {
  const label = 'nightly-1234567890ab';
  const directory = await localBundleDirectory(label, SHA);
  const provenanceName = `brain-atlas-${label}-PROVENANCE.json`;
  const provenancePath = join(directory, provenanceName);
  const provenance = JSON.parse(await readFile(provenancePath, 'utf8'));
  provenance.artifacts[0].goos = 'windows';
  const body = `${JSON.stringify(provenance, null, 2)}\n`;
  await writeFile(provenancePath, body);

  const checksumsPath = join(directory, `brain-atlas-${label}-SHA256SUMS`);
  const checksums = (await readFile(checksumsPath, 'utf8')).split('\n').map((line) => (
    line.endsWith(`  ${provenanceName}`)
      ? `${createHash('sha256').update(body).digest('hex')}  ${provenanceName}`
      : line
  )).join('\n');
  await writeFile(checksumsPath, checksums);

  await assert.rejects(() => loadBundle(directory), /provenance target mismatch/);
});

test('publication rejects a bundle built from a dirty source tree', async () => {
  const bundle = fakeBundle('nightly-1234567890ab', SHA);
  bundle.provenance.sourceDirty = true;
  const client = new FakeClient({ main: SHA });

  await assert.rejects(() => publishNightly(bundle, client), /dirty source tree/);
  assert.deepEqual(client.mutations(), []);
});

test('nightly first publication verifies a draft before making it public', async () => {
  const bundle = fakeBundle('nightly-1234567890ab', SHA);
  const client = new FakeClient({ main: SHA });

  const result = await publishNightly(bundle, client);

  assert.equal(result.status, 'published');
  assert.equal(client.release.draft, false);
  assert.equal(client.release.prerelease, true);
  assert.equal(client.release.latest, false);
  assert.equal(client.release.assets.length, 8);
  assert.deepEqual(client.mutations(), ['createDraft', 'publish']);
});

test('stale nightly build exits without any release mutation', async () => {
  const bundle = fakeBundle('nightly-1234567890ab', SHA);
  const client = new FakeClient({ main: OLD_SHA });

  const result = await publishNightly(bundle, client);

  assert.equal(result.status, 'stale');
  assert.deepEqual(client.mutations(), []);
});

test('nightly replacement uploads and verifies commit assets before promotion and scoped cleanup', async () => {
  const oldBundle = fakeBundle('nightly-aaaaaaaaaaaa', OLD_SHA);
  const release = remoteRelease('nightly', OLD_SHA, oldBundle.assets, {
    assets: [...remoteAssets(oldBundle.assets), {
      id: 998, name: 'maintainer-note.txt', size: 4, digest: `sha256:${'f'.repeat(64)}`,
    }, {
      id: 999, name: 'brain-atlas-nightly-maintainer-note.txt', size: 4, digest: `sha256:${'e'.repeat(64)}`,
    }],
  });
  const client = new FakeClient({ main: SHA, release, tags: { nightly: OLD_SHA } });
  const next = fakeBundle('nightly-1234567890ab', SHA);

  const result = await publishNightly(next, client);

  assert.equal(result.status, 'updated');
  assert.equal(client.tags.nightly, SHA);
  assert.equal(client.release.targetCommitish, SHA);
  assert.equal(client.release.assets.some(({ name }) => name === 'maintainer-note.txt'), true);
  assert.equal(client.release.assets.some(({ name }) => name === 'brain-atlas-nightly-maintainer-note.txt'), true);
  assert.equal(client.release.assets.some(({ name }) => name.includes('nightly-aaaaaaaaaaaa')), false);
  assert.equal(client.release.assets.filter(({ name }) => name.includes('nightly-1234567890ab')).length, 8);
  const mutations = client.mutations();
  assert.equal(mutations[0], 'upload');
  assert.ok(mutations.indexOf('moveTag') > mutations.indexOf('upload'));
  assert.ok(mutations.indexOf('edit') > mutations.indexOf('moveTag'));
  assert.ok(mutations.indexOf('deleteAsset') > mutations.indexOf('edit'));
});

test('nightly detects a concurrent tag move before deleting prior assets', async () => {
  const oldBundle = fakeBundle('nightly-aaaaaaaaaaaa', OLD_SHA);
  const release = remoteRelease('nightly', OLD_SHA, oldBundle.assets);
  const client = new FakeClient({ main: SHA, release, tags: { nightly: OLD_SHA }, tagAfterEdit: OLD_SHA });
  const next = fakeBundle('nightly-1234567890ab', SHA);

  await assert.rejects(() => publishNightly(next, client), /nightly tag changed during promotion/);
  assert.equal(client.release.assets.some(({ name }) => name.includes('nightly-aaaaaaaaaaaa')), true);
  assert.equal(client.mutations().includes('deleteAsset'), false);
});

test('nightly digest conflict fails without clobbering or promotion', async () => {
  const bundle = fakeBundle('nightly-1234567890ab', SHA);
  const release = remoteRelease('nightly', OLD_SHA, bundle.assets);
  release.assets[0].digest = `sha256:${'0'.repeat(64)}`;
  const client = new FakeClient({ main: SHA, release, tags: { nightly: OLD_SHA } });

  await assert.rejects(() => publishNightly(bundle, client), /digest mismatch/);
  assert.deepEqual(client.mutations(), []);
  assert.equal(client.tags.nightly, OLD_SHA);
});

test('stable publication validates tag then publishes a complete draft', async () => {
  const bundle = fakeBundle('v1.2.3', SHA);
  const client = new FakeClient({ main: SHA, tags: { 'v1.2.3': SHA } });

  const result = await publishStable(bundle, 'v1.2.3', client);

  assert.equal(result.status, 'published');
  assert.equal(client.release.draft, false);
  assert.equal(client.release.prerelease, false);
  assert.equal(client.release.latest, true);
  assert.deepEqual(client.mutations(), ['createDraft', 'publish']);
});

test('stable publication detects a tag move during the final publish call', async () => {
  const bundle = fakeBundle('v1.2.3', SHA);
  const client = new FakeClient({ main: SHA, tags: { 'v1.2.3': SHA }, tagAfterPublish: OLD_SHA });

  await assert.rejects(() => publishStable(bundle, 'v1.2.3', client), /changed after publication/);
  assert.deepEqual(client.mutations(), ['createDraft', 'publish']);
});

test('stable draft retry safely completes missing assets before publication', async () => {
  const bundle = fakeBundle('v1.2.3', SHA);
  const release = remoteRelease('v1.2.3', SHA, bundle.assets.slice(0, 3), {
    draft: true, prerelease: false, latest: true, name: 'Brain Atlas v1.2.3',
  });
  const client = new FakeClient({ main: SHA, release, tags: { 'v1.2.3': SHA } });

  const result = await publishStable(bundle, 'v1.2.3', client);

  assert.equal(result.status, 'published');
  assert.equal(client.release.assets.length, 8);
  assert.deepEqual(client.mutations(), ['upload', 'publish']);
});

test('stable exact retry is a read-only no-op', async () => {
  const bundle = fakeBundle('v1.2.3', SHA);
  const release = remoteRelease('v1.2.3', SHA, bundle.assets, { prerelease: false, latest: true });
  const client = new FakeClient({ main: SHA, release, tags: { 'v1.2.3': SHA } });

  const result = await publishStable(bundle, 'v1.2.3', client);

  assert.equal(result.status, 'unchanged');
  assert.deepEqual(client.mutations(), []);
});

test('stable retry refuses tag or asset mismatch without mutation', async () => {
  const bundle = fakeBundle('v1.2.3', SHA);
  const wrongTagClient = new FakeClient({ main: SHA, tags: { 'v1.2.3': OLD_SHA } });
  await assert.rejects(() => publishStable(bundle, 'v1.2.3', wrongTagClient), /tag.*commit/);
  assert.deepEqual(wrongTagClient.mutations(), []);

  const release = remoteRelease('v1.2.3', SHA, bundle.assets, { prerelease: false, latest: true });
  release.assets[0].size += 1;
  const wrongAssetClient = new FakeClient({ main: SHA, release, tags: { 'v1.2.3': SHA } });
  await assert.rejects(() => publishStable(bundle, 'v1.2.3', wrongAssetClient), /size mismatch/);
  assert.deepEqual(wrongAssetClient.mutations(), []);

  const wrongMetadata = remoteRelease('v1.2.3', SHA, bundle.assets, {
    prerelease: false, latest: true, name: 'Unverified release title',
  });
  const wrongMetadataClient = new FakeClient({ main: SHA, release: wrongMetadata, tags: { 'v1.2.3': SHA } });
  await assert.rejects(() => publishStable(bundle, 'v1.2.3', wrongMetadataClient), /metadata/);
  assert.deepEqual(wrongMetadataClient.mutations(), []);
});

function fakeBundle(label, commit) {
  const targets = [
    ['darwin', 'amd64', 'tar.gz'], ['darwin', 'arm64', 'tar.gz'],
    ['linux', 'amd64', 'tar.gz'], ['linux', 'arm64', 'tar.gz'],
    ['windows', 'amd64', 'zip'], ['windows', 'arm64', 'zip'],
  ];
  const names = targets.map(([goos, arch, extension]) => `brain-atlas-${label}-${goos}-${arch}.${extension}`);
  names.push(`brain-atlas-${label}-PROVENANCE.json`, `brain-atlas-${label}-SHA256SUMS`);
  return {
    label,
    commit,
    provenance: { schemaVersion: 1, project: 'brain-atlas', label, commit, sourceDirty: false },
    assets: names.sort().map((name, index) => ({
      name,
      path: `/release/${name}`,
      size: index + 100,
      digest: createHash('sha256').update(name).digest('hex'),
    })),
  };
}

function remoteAssets(assets) {
  return assets.map((asset, index) => ({
    id: index + 1,
    name: asset.name,
    size: asset.size,
    digest: `sha256:${asset.digest}`,
  }));
}

function remoteRelease(tag, commit, assets, overrides = {}) {
  return {
    id: 1,
    tag,
    draft: false,
    prerelease: true,
    latest: false,
    targetCommitish: commit,
    name: tag === 'nightly' ? tag : `Brain Atlas ${tag}`,
    assets: remoteAssets(assets),
    ...overrides,
  };
}

class FakeClient {
  constructor({ main, release = null, tags = {}, tagAfterEdit = null, tagAfterPublish = null }) {
    this.main = main;
    this.release = release;
    this.tags = { ...tags };
    this.tagAfterEdit = tagAfterEdit;
    this.tagAfterPublish = tagAfterPublish;
    this.log = [];
    this.nextAssetID = 1000;
  }

  mutations() {
    return this.log.filter((entry) => ['createDraft', 'upload', 'moveTag', 'edit', 'publish', 'deleteAsset'].includes(entry));
  }

  async currentMain() {
    this.log.push('currentMain');
    return this.main;
  }

  async getRelease() {
    this.log.push('getRelease');
    return this.release ? structuredClone(this.release) : null;
  }

  async resolveTag(tag) {
    this.log.push('resolveTag');
    return this.tags[tag] ?? null;
  }

  async createDraft({ tag, sha, prerelease, latest, assets }) {
    this.log.push('createDraft');
    this.tags[tag] = sha;
    this.release = remoteRelease(tag, sha, assets, { draft: true, prerelease, latest, assets: remoteAssets(assets) });
  }

  async upload(_tag, assets) {
    this.log.push('upload');
    for (const asset of assets) {
      this.release.assets.push({
        id: this.nextAssetID++, name: asset.name, size: asset.size, digest: `sha256:${asset.digest}`,
      });
    }
  }

  async moveTag(tag, sha) {
    this.log.push('moveTag');
    this.tags[tag] = sha;
  }

  async edit({ tag, sha, prerelease, latest }) {
    this.log.push('edit');
    this.release.targetCommitish = sha;
    this.release.prerelease = prerelease;
    this.release.latest = latest;
    if (this.tagAfterEdit) this.tags[tag] = this.tagAfterEdit;
  }

  async publish({ tag, sha, prerelease, latest }) {
    this.log.push('publish');
    this.release.draft = false;
    this.release.targetCommitish = sha;
    this.release.prerelease = prerelease;
    this.release.latest = latest;
    if (this.tagAfterPublish) this.tags[tag] = this.tagAfterPublish;
  }

  async deleteAsset(id) {
    this.log.push('deleteAsset');
    this.release.assets = this.release.assets.filter((asset) => asset.id !== id);
  }
}

async function localBundleDirectory(label, commit) {
  const directory = await mkdtemp(join(tmpdir(), 'brain-atlas-release-'));
  const bundle = fakeBundle(label, commit);
  const archives = bundle.assets.filter(({ name }) => !name.endsWith('PROVENANCE.json') && !name.endsWith('SHA256SUMS'));
  for (const asset of archives) await writeFile(join(directory, asset.name), asset.name);

  const provenanceName = `brain-atlas-${label}-PROVENANCE.json`;
  const provenancePath = join(directory, provenanceName);
  const artifactRecords = [];
  for (const { name } of archives) {
    const body = await readFile(join(directory, name));
    const match = name.match(/-(darwin|linux|windows)-(amd64|arm64)\.(?:tar\.gz|zip)$/);
    artifactRecords.push({
      name, goos: match[1], goarch: match[2],
      sha256: createHash('sha256').update(body).digest('hex'), size: body.length,
    });
  }
  const provenance = {
    schemaVersion: 1, project: 'brain-atlas', label, commit, sourceDateEpoch: 1700000000,
    sourceDirty: false, goVersion: 'go1.26.4', nodeVersion: 'v22.0.0', npmVersion: '10.0.0', artifacts: artifactRecords,
  };
  await writeFile(provenancePath, `${JSON.stringify(provenance, null, 2)}\n`);

  const checksummed = [...archives.map(({ name }) => name), provenanceName].sort();
  const lines = [];
  for (const name of checksummed) {
    const body = await readFile(join(directory, name));
    lines.push(`${createHash('sha256').update(body).digest('hex')}  ${name}`);
  }
  await writeFile(join(directory, `brain-atlas-${label}-SHA256SUMS`), `${lines.join('\n')}\n`);
  return directory;
}
