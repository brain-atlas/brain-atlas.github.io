import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import { checkLessons } from './scripts/check-lessons.mjs';
import { checkPublicFiles, isPrivateSource } from './scripts/check-publish.mjs';

const privateSourceProtection = () => {
  let config;
  return {
    name: 'private-source-protection',
    enforce: 'pre',
    configResolved(resolved) { config = resolved; },
    buildStart() {
      if (config.command === 'build') checkPublicFiles(config.root);
    },
    load(id) {
      if (isPrivateSource(id.split(/[?#]/, 1)[0])) this.error(`Refusing to load private source: ${id}`);
    },
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        for (const name of output.originalFileNames ?? []) {
          if (isPrivateSource(resolve(config.root, name))) this.error(`Refusing to emit private source: ${name}`);
        }
      }
    },
    configureServer(server) {
      // Public files bypass Vite's fs.deny; check both roots before any Vite middleware.
      server.middlewares.use((req, res, next) => {
        let pathname;
        try {
          pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        } catch {
          res.statusCode = 400;
          return res.end('Invalid path');
        }
        const paths = pathname.startsWith('/@fs/')
          ? [pathname.slice(5)]
          : [resolve(config.root, `.${pathname}`), resolve(config.publicDir, `.${pathname}`)];
        if (paths.some(isPrivateSource)) {
          res.statusCode = 403;
          return res.end('Private source access denied');
        }
        next();
      });
    },
  };
};

const lessonLibrary = () => ({
  name: 'lesson-library',
  buildStart() {
    const { files } = checkLessons();
    for (const file of files) this.addWatchFile(file);
  },
  handleHotUpdate({ file }) {
    if (/\/(src\/lessons\/|docs\/lessons\/|public\/data\/)/.test(file)) checkLessons();
  },
});

const PUBLICATION_FILES = ['LICENSE', 'DATA_LICENSES.md', 'THIRD_PARTY_NOTICES.md', 'CITATION.cff'];
const publicationFiles = () => ({
  name: 'publication-files',
  apply: 'build',
  buildStart() {
    for (const fileName of PUBLICATION_FILES) {
      this.emitFile({ type: 'asset', fileName, source: readFileSync(fileName) });
    }
  },
});

const standaloneLifecycle = () => ({
  name: 'standalone-lifecycle',
  transformIndexHtml: {
    order: 'pre',
    handler() {
      return [{
        tag: 'script',
        attrs: { type: 'module', src: '/src/standalone/lifecycle.js' },
        injectTo: 'head-prepend',
      }];
    },
  },
});

// Static single-page app. `base: './'` keeps built asset paths relative so the
// dist/ folder can be served from any local webhost (python -m http.server, etc.).
export default defineConfig(() => {
  const standalone = process.env.BRAIN_ATLAS_STANDALONE === '1';

  return {
    base: './',
    plugins: [privateSourceProtection(), lessonLibrary(), publicationFiles(), ...(standalone ? [standaloneLifecycle()] : [])],
    server: { port: 5180, open: false, host: '127.0.0.1' },
    build: {
      target: 'es2022',
      outDir: standalone ? 'internal/site/dist' : 'dist',
      assetsDir: standalone ? 'standalone-assets' : 'assets',
      assetsInlineLimit: 0,
      // Three.js and its addons form a deliberate ~646 kB (~163 kB gzip) cacheable chunk.
      // Keep warning on unexpected chunks that grow beyond that known dependency.
      chunkSizeWarningLimit: 650,
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              {
                name: 'three',
                test: /[\\/]node_modules[\\/]three[\\/]/,
              },
            ],
          },
        },
      },
    },
  };
});
