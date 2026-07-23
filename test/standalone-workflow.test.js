import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { parse } from 'yaml';

const WORKFLOW_PATH = new URL('../.github/workflows/standalone-binaries.yml', import.meta.url);
const ACTIONS = {
  checkout: 'actions/checkout@9c091bb21b7c1c1d1991bb908d89e4e9dddfe3e0',
  setupNode: 'actions/setup-node@820762786026740c76f36085b0efc47a31fe5020',
  setupGo: 'actions/setup-go@b7ad1dad31e06c5925ef5d2fc7ad053ef454303e',
  upload: 'actions/upload-artifact@043fb46d1a93c77aae656e7c1c64a875d1fc6a0a',
  download: 'actions/download-artifact@3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c',
};

function workflow() {
  return parse(readFileSync(WORKFLOW_PATH, 'utf8'));
}

function step(job, name) {
  const found = job.steps.find((candidate) => candidate.name === name);
  assert.ok(found, `missing workflow step ${name}`);
  return found;
}

test('generated Python cache cannot make the release clean-tree gate fail', () => {
  const ignore = readFileSync(new URL('../.gitignore', import.meta.url), 'utf8');
  assert.match(ignore, /^__pycache__\/$/m);
  assert.match(ignore, /^\*\.pyc$/m);
});

test('standalone workflow builds PR, main, version-tag, and manual events without pull_request_target', () => {
  const value = workflow();

  assert.deepEqual(value.on.push.branches, ['main']);
  assert.deepEqual(value.on.push.tags, ['v*']);
  assert.ok(Object.hasOwn(value.on, 'pull_request'));
  assert.ok(Object.hasOwn(value.on, 'workflow_dispatch'));
  assert.equal(Object.hasOwn(value.on, 'pull_request_target'), false);
  assert.deepEqual(value.permissions, {});
});

test('build job is read-only, pinned, credential-free, and retains the exact release bundle for 14 days', () => {
  const value = workflow();
  const build = value.jobs.build;

  assert.deepEqual(build.permissions, { contents: 'read' });
  assert.equal(build['runs-on'], 'ubuntu-latest');
  assert.ok(build['timeout-minutes'] <= 30);
  const checkout = step(build, 'Check out source');
  assert.equal(checkout.uses, ACTIONS.checkout);
  assert.equal(checkout.with['persist-credentials'], false);
  assert.equal(checkout.with['fetch-depth'], 0);
  assert.equal(step(build, 'Set up Node.js').uses, ACTIONS.setupNode);
  const setupGo = step(build, 'Set up Go');
  assert.equal(setupGo.uses, ACTIONS.setupGo);
  assert.equal(setupGo.with['go-version-file'], 'go.mod');
  assert.equal(setupGo.with.cache, false, 'module has no go.sum or external dependencies to cache');

  const upload = step(build, 'Upload standalone bundle');
  assert.equal(upload.uses, ACTIONS.upload);
  assert.equal(upload.with.path, 'release');
  assert.equal(upload.with['retention-days'], 14);
  assert.match(upload.with.name, /github\.sha/);

  const combinedRuns = build.steps.filter(({ run }) => run).map(({ run }) => run).join('\n');
  for (const command of [
    'npm ci --ignore-scripts', 'npm audit --audit-level=high', 'npm run build:publish',
    'npm run build:standalone:site', 'CGO_ENABLED=0 go test ./...',
    'go test -race ./internal/standalone', 'go vet ./...', 'go run ./cmd/package-standalone',
  ]) assert.match(combinedRuns, new RegExp(command.replaceAll('.', '\\.').replaceAll('*', '\\*')));
  assert.match(combinedRuns, /git status --porcelain/);
  assert.match(combinedRuns, /cmp .*SHA256SUMS/);
  assert.match(combinedRuns, /data\/entities\.json/);
  assert.match(combinedRuns, /models\/brain_mni\.glb/);
  assert.equal(JSON.stringify(build).includes('GH_TOKEN'), false);
});

test('Ubuntu release CI leaves the Darwin-byte-exact Node suite to the documented local gate', () => {
  const build = workflow().jobs.build;
  const combinedRuns = build.steps.filter(({ run }) => run).map(({ run }) => run).join('\n');
  const releases = readFileSync(new URL('../docs/RELEASES.md', import.meta.url), 'utf8');
  const security = readFileSync(new URL('../docs/SECURITY_REVIEW.md', import.meta.url), 'utf8');

  assert.equal(build.steps.some(({ name }) => name === 'Run Node tests'), false);
  assert.equal(combinedRuns.includes('npm test'), false);
  assert.match(releases, /does not run `npm test`/);
  assert.match(releases, /recorded Darwin arm64\/Nix environment/);
  assert.match(security, /release job does not rerun `npm test`/);
});

test('nightly and stable jobs alone receive write permission and consume the build artifact', () => {
  const value = workflow();
  const nightly = value.jobs['publish-nightly'];
  const stable = value.jobs['publish-stable'];

  for (const job of [nightly, stable]) {
    assert.equal(job.needs, 'build');
    assert.deepEqual(job.permissions, { contents: 'write' });
    assert.equal(step(job, 'Check out publication code').uses, ACTIONS.checkout);
    assert.equal(step(job, 'Check out publication code').with['persist-credentials'], false);
    assert.equal(step(job, 'Download standalone bundle').uses, ACTIONS.download);
    assert.equal(step(job, 'Download standalone bundle').with.path, 'release');
    const publish = job.steps.find(({ run }) => run?.includes('publish-standalone-release.mjs'));
    assert.ok(publish);
    assert.equal(publish.env.GH_TOKEN, '${{ github.token }}');
  }

  assert.match(nightly.if, /github\.event_name == 'push'/);
  assert.match(nightly.if, /refs\/heads\/main/);
  assert.equal(nightly.concurrency.group, 'standalone-nightly');
  assert.equal(nightly.concurrency['cancel-in-progress'], false);
  assert.match(stable.if, /startsWith\(github\.ref, 'refs\/tags\/v'\)/);
  assert.match(stable.concurrency.group, /github\.ref/);
  assert.equal(stable.concurrency['cancel-in-progress'], false);
});

test('every reusable action is GitHub-owned and pinned while workflow avoids destructive release shortcuts', () => {
  const source = readFileSync(WORKFLOW_PATH, 'utf8');
  const value = workflow();
  const uses = Object.values(value.jobs).flatMap((job) => job.steps).flatMap((candidate) => candidate.uses ?? []);

  assert.ok(uses.length >= 9);
  for (const action of uses) {
    assert.match(action, /^actions\/[A-Za-z0-9_.-]+@[0-9a-f]{40}$/);
  }
  assert.equal(source.includes('--clobber'), false);
  assert.equal(source.includes('pull_request_target'), false);
  assert.equal(source.includes('sudo '), false);
  assert.equal(source.includes('git push'), false);
  assert.doesNotMatch(source, /\brg\b/, 'GitHub Ubuntu runners do not guarantee ripgrep');
  assert.match(source, /grep -l '_brain-atlas\/lifecycle'/);
});
