# Accessible lesson glossary design-plan

**Issue:** brain-atlas-zmq.30
**Date:** 2026-10-16
**Branch:** main (owner approved)
**Status:** Implemented; final verification/closeout evidence recorded in Beads
**Baseline:** d0be2d3098b5f5326e4c97c88943f23d7de3cffc

## Goal and approval

Explain selected jargon at its first eligible prose occurrence without changing source, renderer state, reading order, or import safety. Owner approved bounded inline design in this session, including tests/docs and one task-only local commit on current main; no push/deploy. History recovery limited to `bd show brain-atlas-zmq.20`, `bd show brain-atlas-zmq.30`, and their referenced artifacts. Existing unrelated untracked files remain untouched.

## Contract

Optional explicit additive lesson-v1 metadata extension: `glossary: { use: [global-id], terms: [{ id, term, aliases?, definition }] }`. Project-authored global records use same entry shape. Local entries replace selected global records with same ID for this lesson; local-only terms are allowed. Old lessons without glossary remain unchanged. Unknown references, duplicate IDs, case-insensitive spelling collisions, blank/malformed fields, and limits reject all-or-nothing. Maximum 64 effective terms, 8 aliases per term, 80 characters per spelling, 600 per definition; existing 512 KiB import limit stays. Definitions are inert plain text, never Markdown/HTML/link interpretation or fetches.

Annotation traverses displayed introduction then numbered scenes, not the undisplayed entry-scene prose. First eligible occurrence per ID; case-insensitive Unicode word boundaries; longest match at a position wins; explicit aliases for plurals. Skip headings, links, images, code, directives, and already annotated nodes. No matching across text/format nodes. Preserve original text and exports.

Native inline buttons retain original words, dotted underline, inherited editorial typography. Accessible description plus hover/focus disclosure; click/tap pins or toggles; Escape/outside activation dismiss; transient hover/focus leaving dismisses while popup remains hoverable. Viewport-contained plain-text definition surface; no animation, no focus trap. Same path without WebGL. Document real screen-reader/device verification limits.

Small source-verified initial global vocabulary opted into by checked early-vision lesson. No global search/index, automatic annotation of all vocabulary, fuzzy matching, stemming, persistence, renderer/canonical state, new dependency, or new network mechanism.

## Files and sequence

1. **Contract/model tests first:** `test/glossary.test.js`, parser/import cases. Add `src/lesson/glossary.js`, `src/lesson/glossary.json`, metadata schema/parser normalization; regenerate `src/lesson/generated-validators.js`. Resolve/validate only inert metadata; pure annotation in `src/ui/markdown-view-model.js` or adjacent small module.
2. **Presentation tests first:** `scripts/browser/home-glossary.spec.cjs`; integrate shared per-lesson annotation context in `src/bootstrap.js`; popup DOM ownership there or small UI module; `src/style.css`, `index.html` only as needed. Preserve source and existing scene/controller paths.
3. **Content/docs:** source-check initial definitions; opt in `src/lessons/retina-to-v1.md`; update `docs/lessons/retina-to-v1-validation.md`, `skills/write-lesson.md`, README, lesson/UI SPECs, architecture and security review. Core assets/citations/licenses unaffected unless evidence review shows otherwise.
4. **Verify/review/close:** unit + generated validators + publication build; Chromium wide/compact, keyboard/hover/touch/dismissal, no-WebGL, imports/CSP, copy text, reduced motion, production hooks, bounded cost and screenshots. Independent routed read-only review; fix findings and rerun. Commit only owned files, record evidence/limits, direct-closeout, handoff.

## Verification

```bash
node --test test/glossary.test.js test/markdown-view-model.test.js test/lesson-parser.test.js test/lesson-import.test.js test/generated-validators.test.js
npm test
npm run build:publish
git diff --check
```

Browser suite uses existing external Playwright harness `/private/tmp/brain-atlas-zmq26-readiness/harness` (referenced by predecessor Bead), repository browser configuration and task-local servers; no dependency installation. Exact commands/results recorded in Bead. Browser evidence checklist proves visible outcomes; screen-reader output assertions are not physical assistive-technology certification.

## Acceptance

- Approved bounded global/local precedence and strict import bounds.
- First eligible match only, deterministic overlap/case/plural behavior, no source rewrites.
- Pointer, keyboard and touch definitions; safe dismissal/containment; no-WebGL parity.
- Readable/copyable prose, no imported HTML execution or external requests.
- Author guidance, evidence and limitations current; task-only commit and closeout.

## Implementation notes

No material scope deviation. Existing browser configuration selects `home-*` suites,
so browser tests use `home-glossary.spec.cjs`. Initial vocabulary is three verified
records: LGN, V1 and optic radiation. One pure resolver and existing Markdown/DOM
paths suffice; no new UI module, dependency or renderer interface. Review regressions
added adjacent formatted-word boundaries and pinned-popup internal selection;
compact checks added fixed-transport focus clearance and scrollable long-definition
placement without covering its focused term. Author/evidence/security/current docs
updated. No prior plan superseded; physical screen readers/devices remain unverified.

## Execution handoff

Use test-driven-development and verification-before-completion. No prior plan superseded.
