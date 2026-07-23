import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { lstatSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const STABLE_TAG_PATTERN = /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/;
const MANAGED_NIGHTLY_ASSET_PATTERN = /^brain-atlas-nightly-[0-9a-f]{12}-(?:(?:darwin|linux)-(?:amd64|arm64)\.tar\.gz|windows-(?:amd64|arm64)\.zip|PROVENANCE\.json|SHA256SUMS)$/;
const TARGETS = [
  ['darwin', 'amd64', 'tar.gz'], ['darwin', 'arm64', 'tar.gz'],
  ['linux', 'amd64', 'tar.gz'], ['linux', 'arm64', 'tar.gz'],
  ['windows', 'amd64', 'zip'], ['windows', 'arm64', 'zip'],
];

export function parseArguments(arguments_, environment = process.env) {
  const values = new Map();
  let dryRun = false;
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    if (argument === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (!['--channel', '--assets', '--repo', '--sha', '--tag'].includes(argument)) {
      throw new Error(`unknown release publication option: ${argument}`);
    }
    const value = arguments_[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`${argument} requires a value`);
    values.set(argument.slice(2), value);
    index += 1;
  }

  const channel = values.get('channel');
  const assetsDir = values.get('assets') ?? 'release';
  const repo = values.get('repo') ?? environment.GITHUB_REPOSITORY;
  const sha = values.get('sha') ?? environment.GITHUB_SHA;
  let tag = values.get('tag');
  if (!['nightly', 'stable'].includes(channel)) throw new Error('channel must be nightly or stable');
  if (!REPOSITORY_PATTERN.test(repo ?? '')) throw new Error(`invalid GitHub repository ${JSON.stringify(repo)}`);
  if (!SHA_PATTERN.test(sha ?? '')) throw new Error(`invalid source commit ${JSON.stringify(sha)}`);
  if (channel === 'nightly') {
    if (tag && tag !== 'nightly') throw new Error('nightly publication tag must be nightly');
    tag = 'nightly';
  } else {
    tag ??= environment.GITHUB_REF_NAME;
    if (!STABLE_TAG_PATTERN.test(tag ?? '')) {
      throw new Error(`stable publication requires a semantic version tag, got ${JSON.stringify(tag)}`);
    }
  }
  return { channel, assetsDir, repo, sha, tag, dryRun };
}

export async function loadBundle(directory) {
  const absolute = resolve(directory);
  const names = readdirSync(absolute).sort();
  const provenanceNames = names.filter((name) => name.endsWith('-PROVENANCE.json'));
  const checksumNames = names.filter((name) => name.endsWith('-SHA256SUMS'));
  if (provenanceNames.length !== 1 || checksumNames.length !== 1) {
    throw new Error('release bundle must contain exactly one provenance and one checksum file');
  }
  const provenance = JSON.parse(readFileSync(join(absolute, provenanceNames[0]), 'utf8'));
  if (provenance.schemaVersion !== 1 || provenance.project !== 'brain-atlas') {
    throw new Error('unsupported release provenance');
  }
  const { label, commit } = provenance;
  if (!LABEL_PATTERN.test(label ?? '') || !SHA_PATTERN.test(commit ?? '') || typeof provenance.sourceDirty !== 'boolean') {
    throw new Error('release provenance has an unsafe label, invalid commit, or missing source state');
  }
  const expectedTargets = new Map(TARGETS.map(([goos, arch, extension]) => [
    `brain-atlas-${label}-${goos}-${arch}.${extension}`, { goos, goarch: arch },
  ]));
  const expectedNames = [...expectedTargets.keys()].sort();
  const expectedProvenance = `brain-atlas-${label}-PROVENANCE.json`;
  const expectedChecksums = `brain-atlas-${label}-SHA256SUMS`;
  const expectedAll = [...expectedNames, expectedProvenance, expectedChecksums].sort();
  if (names.length !== expectedAll.length || names.some((name, index) => name !== expectedAll[index])) {
    throw new Error(`release bundle inventory does not match label ${label}`);
  }
  for (const name of names) {
    if (!lstatSync(join(absolute, name)).isFile()) {
      throw new Error('release bundle entries must be regular files');
    }
  }

  const checksums = parseChecksums(readFileSync(join(absolute, expectedChecksums), 'utf8'));
  const expectedChecksummed = [...expectedNames, expectedProvenance].sort();
  if (checksums.size !== expectedChecksummed.length || expectedChecksummed.some((name) => !checksums.has(name))) {
    throw new Error('release checksum inventory is incomplete');
  }
  for (const [name, want] of checksums) {
    const got = fileDigest(join(absolute, name));
    if (got !== want) throw new Error(`checksum mismatch for ${name}`);
  }
  validateProvenanceArtifacts(provenance, expectedNames, expectedTargets, checksums, absolute);

  const assets = names.map((name) => {
    const path = join(absolute, name);
    return { name, path, size: statSync(path).size, digest: fileDigest(path) };
  });
  return { label, commit, provenance, assets };
}

function parseChecksums(body) {
  const checksums = new Map();
  for (const line of body.trim().split('\n')) {
    const match = line.match(/^([0-9a-f]{64})  ([A-Za-z0-9][A-Za-z0-9._-]*)$/);
    if (!match || checksums.has(match[2])) throw new Error(`invalid checksum line ${JSON.stringify(line)}`);
    checksums.set(match[2], match[1]);
  }
  return checksums;
}

function validateProvenanceArtifacts(provenance, expectedNames, expectedTargets, checksums, directory) {
  if (!Array.isArray(provenance.artifacts) || provenance.artifacts.length !== TARGETS.length) {
    throw new Error('release provenance target inventory is incomplete');
  }
  const records = [...provenance.artifacts].sort((left, right) => left.name.localeCompare(right.name));
  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    if (record.name !== expectedNames[index] || record.sha256 !== checksums.get(record.name)) {
      throw new Error(`release provenance mismatch for ${record.name}`);
    }
    const target = expectedTargets.get(record.name);
    if (record.goos !== target.goos || record.goarch !== target.goarch) {
      throw new Error(`release provenance target mismatch for ${record.name}`);
    }
    if (statSync(join(directory, record.name)).size !== record.size) {
      throw new Error(`release provenance size mismatch for ${record.name}`);
    }
  }
}

function fileDigest(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

export async function publishNightly(bundle, client) {
  assertPublishableBundle(bundle);
  const expectedLabel = `nightly-${bundle.commit.slice(0, 12)}`;
  if (bundle.label !== expectedLabel) throw new Error(`nightly bundle label must be ${expectedLabel}`);
  if (await client.currentMain() !== bundle.commit) return { status: 'stale' };

  let release = await client.getRelease('nightly');
  const title = `Brain Atlas nightly ${bundle.commit.slice(0, 12)}`;
  const body = nightlyNotes(bundle);
  if (!release) {
    await client.createDraft({
      tag: 'nightly', sha: bundle.commit, title, body, prerelease: true, latest: false,
      generateNotes: false, verifyTag: false, assets: bundle.assets,
    });
    release = await client.getRelease('nightly');
    verifyRemoteAssets(release, bundle.assets, { exact: true });
    if (await client.currentMain() !== bundle.commit) return { status: 'stale' };
    await client.publish({ tag: 'nightly', sha: bundle.commit, title, body, prerelease: true, latest: false });
    await verifyNightlyPromotion(client, bundle);
    return { status: 'published' };
  }
  if (release.tag !== 'nightly' || !release.prerelease) {
    throw new Error('existing nightly release is not the expected prerelease channel');
  }

  const remoteByName = new Map(release.assets.map((asset) => [asset.name, asset]));
  const missing = [];
  for (const asset of bundle.assets) {
    const remote = remoteByName.get(asset.name);
    if (!remote) missing.push(asset);
    else verifyRemoteAsset(remote, asset);
  }
  if (missing.length > 0) await client.upload('nightly', missing);
  release = await client.getRelease('nightly');
  verifyRemoteAssets(release, bundle.assets, { exact: false });
  if (await client.currentMain() !== bundle.commit) return { status: 'stale' };

  const tagCommit = await client.resolveTag('nightly');
  const localNames = new Set(bundle.assets.map(({ name }) => name));
  const obsolete = release.assets.filter(({ name }) => MANAGED_NIGHTLY_ASSET_PATTERN.test(name) && !localNames.has(name));
  const canonical = !release.draft && tagCommit === bundle.commit && release.targetCommitish === bundle.commit && obsolete.length === 0;
  if (canonical) return { status: 'unchanged' };

  if (release.draft) {
    if (tagCommit !== null && tagCommit !== bundle.commit) {
      throw new Error('existing nightly draft conflicts with a different nightly tag');
    }
    await client.publish({ tag: 'nightly', sha: bundle.commit, title, body, prerelease: true, latest: false });
  } else {
    if (tagCommit !== bundle.commit) await client.moveTag('nightly', bundle.commit);
    await client.edit({ tag: 'nightly', sha: bundle.commit, title, body, prerelease: true, latest: false });
  }
  await verifyNightlyPromotion(client, bundle);
  for (const asset of obsolete) await client.deleteAsset(asset.id);
  return { status: 'updated' };
}

export async function publishStable(bundle, tag, client) {
  assertPublishableBundle(bundle);
  if (!STABLE_TAG_PATTERN.test(tag)) throw new Error(`stable publication requires a semantic version tag, got ${tag}`);
  if (bundle.label !== tag) throw new Error(`stable bundle label ${bundle.label} does not match tag ${tag}`);
  const tagCommit = await client.resolveTag(tag);
  if (tagCommit !== bundle.commit) throw new Error(`stable tag ${tag} does not resolve to bundle commit ${bundle.commit}`);

  let release = await client.getRelease(tag);
  const title = `Brain Atlas ${tag}`;
  const body = stableNotes(bundle, tag);
  if (!release) {
    await client.createDraft({
      tag, sha: bundle.commit, title, body, prerelease: false, latest: true,
      generateNotes: true, verifyTag: true, assets: bundle.assets,
    });
    release = await client.getRelease(tag);
    verifyStableRelease(release, bundle, tag, { allowDraft: true });
    if (await client.resolveTag(tag) !== bundle.commit) throw new Error(`stable tag ${tag} changed during publication`);
    await client.publish({ tag, sha: bundle.commit, title, body, prerelease: false, latest: true });
    await verifyPublishedStable(client, bundle, tag);
    return { status: 'published' };
  }
  verifyStableMetadata(release, tag, { allowDraft: true });
  if (release.draft) {
    const missing = missingRemoteAssets(release, bundle.assets);
    if (missing.length > 0) await client.upload(tag, missing);
    release = await client.getRelease(tag);
    verifyStableRelease(release, bundle, tag, { allowDraft: true });
    if (await client.resolveTag(tag) !== bundle.commit) throw new Error(`stable tag ${tag} changed during publication`);
    await client.publish({ tag, sha: bundle.commit, title, body, prerelease: false, latest: true });
    await verifyPublishedStable(client, bundle, tag);
    return { status: 'published' };
  }
  verifyStableRelease(release, bundle, tag, { allowDraft: false });
  return { status: 'unchanged' };
}

async function verifyNightlyPromotion(client, bundle) {
  if (await client.resolveTag('nightly') !== bundle.commit) {
    throw new Error('nightly tag changed during promotion');
  }
  if (await client.currentMain() !== bundle.commit) {
    throw new Error('main advanced during nightly promotion; a newer run must repair the channel');
  }
  const release = await client.getRelease('nightly');
  if (!release || release.draft || !release.prerelease) {
    throw new Error('nightly release state changed during promotion');
  }
  verifyRemoteAssets(release, bundle.assets, { exact: false });
}

async function verifyPublishedStable(client, bundle, tag) {
  if (await client.resolveTag(tag) !== bundle.commit) {
    throw new Error(`stable tag ${tag} changed after publication`);
  }
  const release = await client.getRelease(tag);
  verifyStableRelease(release, bundle, tag, { allowDraft: false });
}

function assertPublishableBundle(bundle) {
  if (bundle.provenance?.sourceDirty !== false) {
    throw new Error('release publication refuses a bundle built from a dirty source tree');
  }
}

function verifyStableRelease(release, bundle, tag, { allowDraft }) {
  verifyStableMetadata(release, tag, { allowDraft });
  verifyRemoteAssets(release, bundle.assets, { exact: true });
}

function verifyStableMetadata(release, tag, { allowDraft }) {
  if (release.tag !== tag || release.name !== `Brain Atlas ${tag}` || release.prerelease || (!allowDraft && release.draft)) {
    throw new Error(`existing stable release ${tag} has incompatible metadata`);
  }
}

function missingRemoteAssets(release, localAssets) {
  const remoteByName = new Map();
  for (const asset of release.assets) {
    if (remoteByName.has(asset.name)) throw new Error(`duplicate remote release asset ${asset.name}`);
    remoteByName.set(asset.name, asset);
  }
  const missing = [];
  for (const local of localAssets) {
    const remote = remoteByName.get(local.name);
    if (!remote) missing.push(local);
    else verifyRemoteAsset(remote, local);
  }
  return missing;
}

function verifyRemoteAssets(release, localAssets, { exact }) {
  if (!release) throw new Error('release was not found after publication action');
  const remoteByName = new Map();
  for (const asset of release.assets) {
    if (remoteByName.has(asset.name)) throw new Error(`duplicate remote release asset ${asset.name}`);
    remoteByName.set(asset.name, asset);
  }
  for (const local of localAssets) {
    const remote = remoteByName.get(local.name);
    if (!remote) throw new Error(`remote release asset ${local.name} is missing`);
    verifyRemoteAsset(remote, local);
  }
  if (exact && release.assets.length !== localAssets.length) {
    throw new Error('remote release contains unexpected assets');
  }
}

function verifyRemoteAsset(remote, local) {
  if (remote.size !== local.size) throw new Error(`size mismatch for release asset ${local.name}`);
  if (remote.digest !== `sha256:${local.digest}`) throw new Error(`digest mismatch for release asset ${local.name}`);
}

function nightlyNotes(bundle) {
  return [
    '## Mutable nightly build', '',
    '**This prerelease moves whenever a newer `main` build passes. It is not a stable release.**', '',
    `Source commit: \`${bundle.commit}\``, '',
    'Verify downloads with the commit-matched `SHA256SUMS` asset before running them.',
    'The binaries are currently unsigned and may trigger platform security warnings.', '',
  ].join('\n');
}

function stableNotes(bundle, tag) {
  return [
    `Verified standalone binaries for ${tag}.`, '',
    `Source commit: \`${bundle.commit}\``, '',
    'Verify downloads with `SHA256SUMS` before running them.',
    'The binaries are currently unsigned and may trigger platform security warnings.', '',
  ].join('\n');
}

export function ghCreateDraftArguments({
  repo, tag, sha, title, notesPath, prerelease, latest, generateNotes, verifyTag, assets,
}) {
  const arguments_ = [
    'release', 'create', tag, ...assets.map(({ path }) => path), '--repo', repo,
    '--draft', '--target', sha, '--title', title, '--notes-file', notesPath, `--latest=${latest}`,
  ];
  if (prerelease) arguments_.push('--prerelease');
  if (generateNotes) arguments_.push('--generate-notes');
  if (verifyTag) arguments_.push('--verify-tag');
  return arguments_;
}

export function ghUploadArguments(repo, tag, assets) {
  return ['release', 'upload', tag, ...assets.map(({ path }) => path), '--repo', repo];
}

export function ghViewReleaseArguments(repo, tag) {
  return [
    'release', 'view', tag, '--repo', repo, '--json',
    'databaseId,tagName,isDraft,isPrerelease,targetCommitish,name,assets',
  ];
}

export function normalizeGhRelease(release) {
  if (!Number.isSafeInteger(release?.databaseId) || release.databaseId <= 0
      || typeof release.tagName !== 'string'
      || typeof release.isDraft !== 'boolean'
      || typeof release.isPrerelease !== 'boolean'
      || typeof release.targetCommitish !== 'string'
      || typeof release.name !== 'string'
      || !Array.isArray(release.assets)) {
    throw new Error('invalid GitHub CLI release response');
  }
  return {
    id: release.databaseId,
    tag: release.tagName,
    draft: release.isDraft,
    prerelease: release.isPrerelease,
    latest: false,
    targetCommitish: release.targetCommitish,
    name: release.name,
    assets: release.assets.map((asset) => ({
      id: releaseAssetDatabaseID(asset.apiUrl),
      name: asset.name,
      size: asset.size,
      digest: asset.digest,
    })),
  };
}

function releaseAssetDatabaseID(apiUrl) {
  const match = typeof apiUrl === 'string'
    ? apiUrl.match(/^https:\/\/api\.github\.com\/repos\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/releases\/assets\/([1-9]\d*)$/)
    : null;
  const id = match ? Number(match[1]) : Number.NaN;
  if (!Number.isSafeInteger(id)) throw new Error('release asset API URL does not contain a numeric database ID');
  return id;
}

class GhClient {
  constructor(repo) {
    this.repo = repo;
  }

  async currentMain() {
    return this.#json(['api', `repos/${this.repo}/commits/main`, '--jq', '.sha']).trim();
  }

  async getRelease(tag) {
    const result = this.#spawn(ghViewReleaseArguments(this.repo, tag), { allow404: true });
    return result === null ? null : normalizeGhRelease(JSON.parse(result));
  }

  async resolveTag(tag) {
    let object;
    const reference = this.#spawn(['api', `repos/${this.repo}/git/ref/tags/${tag}`], { allow404: true });
    if (reference === null) return null;
    object = JSON.parse(reference).object;
    for (let depth = 0; depth < 5 && object.type === 'tag'; depth += 1) {
      object = JSON.parse(this.#json(['api', `repos/${this.repo}/git/tags/${object.sha}`])).object;
    }
    if (object.type !== 'commit') throw new Error(`tag ${tag} does not resolve to a commit`);
    return object.sha;
  }

  async createDraft({ tag, sha, title, body, prerelease, latest, generateNotes, verifyTag, assets }) {
    this.#withNotes(body, (notesPath) => {
      this.#run(ghCreateDraftArguments({
        repo: this.repo, tag, sha, title, notesPath, prerelease, latest, generateNotes, verifyTag, assets,
      }));
    });
  }

  async upload(tag, assets) {
    this.#run(ghUploadArguments(this.repo, tag, assets));
  }

  async moveTag(tag, sha) {
    this.#run(['api', '--method', 'PATCH', `repos/${this.repo}/git/refs/tags/${tag}`, '-f', `sha=${sha}`, '-F', 'force=true']);
  }

  async edit({ tag, sha, title, body, prerelease, latest }) {
    this.#editRelease({ tag, sha, title, body, prerelease, latest, publish: false });
  }

  async publish({ tag, sha, title, body, prerelease, latest }) {
    this.#editRelease({ tag, sha, title, body, prerelease, latest, publish: true });
  }

  async deleteAsset(id) {
    this.#run(['api', '--method', 'DELETE', `repos/${this.repo}/releases/assets/${id}`]);
  }

  #editRelease({ tag, sha, title, body, prerelease, latest, publish }) {
    this.#withNotes(body, (notesPath) => {
      const arguments_ = [
        'release', 'edit', tag, '--repo', this.repo, '--target', sha, '--title', title,
        '--notes-file', notesPath, `--latest=${latest}`,
      ];
      if (publish) arguments_.push('--draft=false');
      if (prerelease) arguments_.push('--prerelease');
      this.#run(arguments_);
    });
  }

  #withNotes(body, operation) {
    const directory = mkdtempSync(join(tmpdir(), 'brain-atlas-release-notes-'));
    const path = join(directory, 'notes.md');
    try {
      writeFileSync(path, body, { mode: 0o600 });
      operation(path);
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  }

  #json(arguments_) {
    return this.#spawn(arguments_);
  }

  #run(arguments_) {
    this.#spawn(arguments_);
  }

  #spawn(arguments_, { allow404 = false } = {}) {
    const result = spawnSync('gh', arguments_, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (result.status === 0) return result.stdout;
    if (allow404 && /HTTP 404|Not Found/i.test(result.stderr)) return null;
    throw new Error(`gh ${arguments_.slice(0, 2).join(' ')} failed: ${result.stderr.trim() || `exit ${result.status}`}`);
  }
}

class DryRunClient {
  constructor({ channel, sha }) {
    this.channel = channel;
    this.sha = sha;
    this.release = null;
    this.actions = [];
    this.tags = channel === 'stable' ? new Map() : new Map([['nightly', sha]]);
  }

  async currentMain() { this.actions.push({ action: 'read-current-main' }); return this.sha; }
  async getRelease() { this.actions.push({ action: 'read-release' }); return this.release; }
  async resolveTag(tag) { this.actions.push({ action: 'resolve-tag', tag }); return this.tags.get(tag) ?? this.sha; }
  async createDraft(options) {
    this.actions.push({ action: 'create-draft', tag: options.tag, assets: options.assets.map(({ name }) => name) });
    this.release = {
      id: 1, tag: options.tag, draft: true, prerelease: options.prerelease, latest: options.latest,
      targetCommitish: options.sha, name: options.title,
      assets: options.assets.map((asset, index) => ({ id: index + 1, name: asset.name, size: asset.size, digest: `sha256:${asset.digest}` })),
    };
  }
  async upload(_tag, assets) { this.actions.push({ action: 'upload', assets: assets.map(({ name }) => name) }); }
  async moveTag(tag, sha) { this.actions.push({ action: 'move-tag', tag, sha }); this.tags.set(tag, sha); }
  async edit(options) { this.actions.push({ action: 'edit-release', tag: options.tag }); }
  async publish(options) {
    this.actions.push({ action: 'publish-release', tag: options.tag });
    this.tags.set(options.tag, options.sha);
    this.release.draft = false;
  }
  async deleteAsset(id) { this.actions.push({ action: 'delete-asset', id }); }
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const bundle = await loadBundle(options.assetsDir);
  if (bundle.commit !== options.sha) throw new Error(`bundle commit ${bundle.commit} does not match requested ${options.sha}`);
  const client = options.dryRun
    ? new DryRunClient({ channel: options.channel, sha: options.sha })
    : new GhClient(options.repo);
  const result = options.channel === 'nightly'
    ? await publishNightly(bundle, client)
    : await publishStable(bundle, options.tag, client);
  console.log(JSON.stringify(options.dryRun ? { result, actions: client.actions } : result, null, 2));
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (import.meta.url === invokedPath) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
