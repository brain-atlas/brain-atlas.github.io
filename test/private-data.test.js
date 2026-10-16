import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, realpath, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { build, createServer } from 'vite';
import configFactory from '../vite.config.js';

const guardScript = resolve('scripts/check-publish.mjs');
const privatePaths = ['data-local/secret.txt', '.pi/secret.txt', '.beads/secret.txt',
  '.workbench/secret.txt', '10.12751_g-node.be5e62.zip', 'hcp1065_avg_tracts_trk.zip',
  'mni_icbm152_nlin_asym_09a_nifti.zip'];
const secret = 'PRIVATE-SOURCE-SENTINEL';

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'brain-atlas-private-test-')));
  await mkdir(join(root, 'public'));
  await writeFile(join(root, 'public', 'safe.txt'), 'public asset');
  await writeFile(join(root, 'index.html'), '<script type="module" src="/main.js"></script>');
  await writeFile(join(root, 'main.js'), 'console.log("safe app");');
  for (const path of privatePaths) {
    await mkdir(join(root, path, '..'), { recursive: true });
    await writeFile(join(root, path), secret);
  }
  execFileSync('git', ['init', '-q', root]);
  execFileSync('git', ['add', 'public'], { cwd: root });
  return root;
}

function config(root) {
  const base = configFactory({ command: 'serve', mode: 'development' });
  return {
    ...base, root, configFile: false, logLevel: 'silent',
    // Isolate the real protection plugin from lesson/library publication fixtures.
    plugins: base.plugins.filter(({ name }) => name === 'private-source-protection'),
    server: { ...base.server, host: '127.0.0.1', port: 0, watch: null },
    build: { ...base.build, outDir: join(root, 'dist'), minify: false },

  };
}

test('development defaults to loopback', () => {
  assert.equal(configFactory({}).server.host, '127.0.0.1');
});

test('private files stay denied through direct, encoded, fs, query and symlink requests', async () => {
  const root = await fixture();
  await symlink(join(root, 'data-local'), join(root, 'alias'));
  await symlink(join(root, 'data-local'), join(root, 'public', 'alias'));
  await writeFile(join(root, '.env'), secret);
  const server = await createServer(config(root));
  try {
    await server.listen();
    const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
    assert.equal(await (await fetch(`${origin}/safe.txt`)).text(), 'public asset');
    for (const path of [...privatePaths, '.env', 'alias/secret.txt']) {
      for (const url of [`/${path}`, `/${path}?raw`, `/${path}?url`, `/@fs/${root}/${path}`, `/@fs/${root}/${path}/`,
        `/${path.replaceAll('.', '%2e').replaceAll('/', '%2f')}`]) {
        for (const method of ['GET', 'HEAD']) {
          const response = await fetch(origin + url, { method });
          assert.ok([403, 404].includes(response.status), `${method} ${url}: ${response.status}`);
          assert.equal((await response.text()).includes(secret), false);
        }
      }
    }
  } finally {
    await server.close();
  }
});

test('publication rejects ignored files and tracked symlinks in public', async () => {
  const root = await fixture();
  const check = () => spawnSync(process.execPath, [guardScript], { cwd: root, encoding: 'utf8' });
  assert.equal(check().status, 0);
  await writeFile(join(root, '.gitignore'), 'public/ignored.txt\n');
  await writeFile(join(root, 'public/ignored.txt'), secret);
  assert.notEqual(check().status, 0, 'ignored public file must fail');
  // A separate fixture avoids removing any retained files.
  const linkedRoot = await fixture();
  await symlink(join(linkedRoot, 'data-local/secret.txt'), join(linkedRoot, 'public/linked.txt'));
  execFileSync('git', ['add', 'public/linked.txt'], { cwd: linkedRoot });
  const linked = spawnSync(process.execPath, [guardScript], { cwd: linkedRoot, encoding: 'utf8' });
  assert.notEqual(linked.status, 0, 'tracked symlink must fail');
});

test('both build profiles exclude private files and reject private imports', async () => {
  for (const outDir of ['dist', 'internal/site/dist']) {
    const root = await fixture();
    const options = config(root);
    options.build.outDir = join(root, outDir);
    await build(options);
    assert.equal((await readFile(join(root, outDir, 'safe.txt'), 'utf8')), 'public asset');
    for (const path of privatePaths) {
      await assert.rejects(readFile(join(root, outDir, path)), { code: 'ENOENT' });
    }
    for (const path of privatePaths) {
      for (const query of ['raw', 'url', 'inline']) {
        await writeFile(join(root, 'main.js'), `import value from './${path}?${query}'; console.log(value);`);
        await assert.rejects(build(options), /private source/i, `${path}?${query}`);
      }
    }
    await writeFile(join(root, 'main.js'), 'console.log("safe");');
    await writeFile(join(root, 'index.html'), '<img src="/data-local/secret.txt"><script type="module" src="/main.js"></script>');
    await assert.rejects(build(options), /private source/i, 'HTML asset URL');
  }
});
