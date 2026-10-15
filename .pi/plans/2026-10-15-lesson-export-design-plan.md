# Local lesson export — approved design and implementation plan

**Bead:** brain-atlas-zmq.13
**Date:** 2026-10-15
**Branch:** fix/issue-5-visual-audit
**Status:** Implemented approved design; retained as historical guidance. Current behavior
is documented in README and `src/ui/SPEC.md`; Bead owns final verification/closeout.

## Decision

Preserve exact validated schema-v1 Markdown in the frozen import candidate. Export
it as UTF-8 `lesson.md` from the existing dialog, not by serializing runtime
snapshots. User approved this interpretation of canonical format plus manual
repository contribution instructions. No formatter, new dependency, GitHub auth,
token storage, automatic PR, upload, URL-embedded source or image download.
Download is explicit local persistence; app/session source remains memory-only.

## Scope and sequence

1. Add source-retention round-trip coverage to `test/lesson-import.test.js`, then
   retain source in `src/ui/lesson-import.js`; library callers share this candidate.
2. Add `scripts/browser/home-lesson-export.spec.cjs` covering exact download,
   disabled stale candidates, file reads/errors, keyboard/compact targets,
   no-WebGL/network boundaries and failed-download recovery. Wire the button in
   `index.html` / `src/bootstrap.js`; adjust compact footer in `src/style.css`.
3. Update README contribution instructions, `src/ui/SPEC.md`, architecture and
   security documentation. No scientific/data/license/renderer change.
4. Inspect diff, review, stage only owned files, run final checks, local commit,
   record evidence and direct-closeout. No push/deploy/PR.

## Verification

- `node --test test/lesson-import.test.js test/lesson-library.test.js`
- Existing external Playwright harness: run `home-lesson-export.spec.cjs` under
  Chromium and Firefox against static preview; inspect screenshot and console.
- `npm test && npm run build:publish`
- `git diff --check && git diff --cached --check`

File decoding and textarea line-ending normalization precede validation; byte
identity with arbitrary input-file encodings is not promised. Export preserves
validated text and all declared media metadata, not referenced remote files.
Validation does not certify scientific claims or rights. Manual contributions
require evidence/license metadata and normal review before registry/publication.
