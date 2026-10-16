# Named Atlas views — design and implementation plan

**Bead:** brain-atlas-zmq.33
**Status:** Implemented (final candidate gate and required main integration tracked in Bead)
**Approval:** Owner approved global-Atlas-only design and named local branch in current-session ask; recorded in brain-atlas-zmq.33.
**Date:** 2026-10-16
**Branch:** feat/zmq33-named-atlas-views
**Base:** ea16f8434daee98f8bcd822df79f7dc362d34fe8

## Goal and boundary

Save, name, restore, rename and delete multiple global Atlas snapshots locally, without changing lesson-source persistence, canonical formats, renderer ownership or scientific representation.

Reuse strict Atlas snapshot validation and actual-camera capture. Store a separate exact version-1 collection under `brain-atlas.saved-views`; each entry contains only name and canonical snapshot. Bound to 20 entries, 80 UTF-16 code units per trimmed NFC name, and 1 MiB UTF-8 serialized collection (check length before parsing). Reject empty/control-character names, case-insensitive normalized duplicates, unknown fields/versions/catalog references, invalid cameras, and source/token/clock additions. Names remain plain text. No automatic overwrite, migration, network, cookies or new dependencies.

Global Atlas only: controls hidden in lessons/temporary branches, handlers independently guard workspace ownership/readiness. Named collection survives Reset Atlas/Exit; restore becomes current autosaved global state via existing adapter and panel/fidelity synchronization, without responsive camera refitting. Existing camera Reset uses restored entry pose. Reduced-motion policy still wins. No-WebGL retains existing semantic fallback and disables/hides renderer-dependent controls with explanation.

Full controls gains Saved views: labelled name input and selector, Save current, Restore, Rename, Delete, inline named confirmation and Cancel. Native controls, 44px targets, existing theme, status/error announcements and stable focus. Editing current Atlas never updates a named snapshot. Failed storage mutation remains usable in memory with explicit session-only notice; old stored bytes survive quota/denial. Same-origin tabs retain existing last-successful-collection-save behavior, no live synchronization. Origin/profile/port and site-data-clearing limits disclosed.

## Alternatives

Global-only is chosen over lesson-derived saving (would conflict with current contributor persistence invariant) and a larger library/import/export UI (unrequested). Native controls reuse project convention; no custom combobox or additional dependencies.

## Sequence and file reach

1. Add failing `test/atlas-saved-views.test.js` and `scripts/browser/home-saved-views.spec.cjs`. Unit tests exercise CRUD/immutability, all canonical axes, normalization/collisions, strict bounds/catalog, unsafe extra fields and storage exceptions. Browser checks exercise actual camera/reload, keyboard/compact, duplicate/empty names, confirmation, isolation/reset/Exit, quota/denial, no-WebGL/reduced motion and production hooks.
2. Export existing validator from `src/ui/atlas-storage.js`; implement small pure `src/ui/atlas-saved-views.js`. No existing storage-envelope migration; no lesson or renderer implementation change.
3. Bind guarded DOM orchestration in `src/bootstrap.js`, reuse global snapshot application for reset/restore. Add semantic controls in `index.html` and minimal theme-based styles in `src/style.css`. Preserve all existing caller behavior and tests.
4. Update README, `src/ui/SPEC.md` (INV-73, FAIL-66), architecture, security review and operator guidance for landed behavior. No data/license/citation/notices/lesson-validation change expected: no scientific claims, assets, dependencies or software identity changes.
5. Run focused and full units, publication build, relevant browser regressions, production compact/wide visual proof and independent routed review; fix verified issues with regression tests. Record exact outcomes/limits in Bead, mark plan Implemented, commit only task files, integrate locally into `main`, verify integrated state, then direct-closeout and handoff. Owner amendment: closure requires merging back into main; branch-only completion is insufficient. Recheck target HEAD and source SHA before integration; stop on drift, conflicts or unrelated changes. No push, branch deletion or deployment authorized.

## Verification commands

```bash
node --test test/atlas-storage.test.js test/atlas-saved-views.test.js
npm test
npm run build:publish
NODE_PATH=/private/tmp/brain-atlas-zmq26-readiness/harness/node_modules BROWSER=chromium PLAYWRIGHT_EXECUTABLE_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' BRAIN_ATLAS_URL=http://127.0.0.1:5227/ /private/tmp/brain-atlas-zmq26-readiness/harness/node_modules/.bin/playwright test --config=scripts/browser/playwright.config.cjs scripts/browser/home-saved-views.spec.cjs scripts/browser/home-persistence.spec.cjs
```

Static production preview uses port 5228; debug-dependent tests use development port 5227. Verify ports before launch and stop only task-owned servers. Browser evidence uses production preview. No physical assistive-technology certification or release-readiness claim.

## Acceptance

All Bead criteria plus explicit temporary-branch isolation, exact actual-camera capture, Reset/Exit collection survival, no blind overwrites, no source/network persistence, keyboard/focus/touch target containment, failed-write honesty, and unchanged global autosave schema.

## Implementation comparison and evidence

No material design deviation. Existing global Reset and named Restore share one application function; existing validator exported without changing its contract. Review reproduced two UI-only availability gaps (history jumps into temporary inspection and no-WebGL lesson round trips); focused regressions now pass after availability refresh/guarding and persistent fallback explanation. Independent fresh review verified 11 focused unit tests, 18 development Chromium tests and 10 production Chromium tests; no remaining important finding confirmed. Desktop/compact production screenshots were inspected and both browser-evidence checklists audited ready. Public/current docs updated; no scientific/data/license/dependency/citation changes.

Firefox verification blocked before application execution: harness expected absent Firefox 1543; installed Firefox 1509 rejected `viewport.isMobile` protocol property. Stopped retries and ran read-only doctor (no failures; Beads-health/prerequisite warnings). No environment changes. Physical assistive technology, Safari and standalone/release matrix remain unverified. Exact final verification, integration SHA and closeout belong in Bead.

## Execution handoff

Plan path: `.pi/plans/2026-10-16-named-atlas-views-design-plan.md`. Bead owns live status and evidence. No prior plan superseded; this adds the deferred named-view scope to existing last-view persistence.
