import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';

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

// Static single-page app. `base: './'` keeps built asset paths relative so the
// dist/ folder can be served from any local webhost (python -m http.server, etc.).
export default defineConfig({
  base: './',
  plugins: [publicationFiles()],
  server: { port: 5180, open: false, host: true },
  build: {
    target: 'es2022',
    outDir: 'dist',
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
});
