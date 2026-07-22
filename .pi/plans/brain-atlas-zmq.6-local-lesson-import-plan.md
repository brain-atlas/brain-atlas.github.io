# Local Lesson Import Implementation Plan

**Issue:** `brain-atlas-zmq.6` — Add local Markdown lesson paste/import and validation
**Design:** Approved decision `brain-atlas-wup`; `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md` §3.4 and §7
**Date:** 2026-07-21
**Branch:** `feat/local-lesson-import`
**Status:** Implemented

**Goal:** Let a learner validate and open an untrusted local Markdown lesson without a backend, account, persistence, unsafe execution, or destructive failure.

**Architecture:** A pure `src/ui/lesson-import.js` boundary composes the existing strict `parseLesson` contract with presentation validation and a frozen preview summary. `src/bootstrap.js` keeps one catalog, parser, scene controller, renderer adapter, and DOM shell while replacing only complete validated lesson sessions after an explicit **Open lesson** action. A focused native dialog owns paste/file input and diagnostics; supplementary HTTPS images render as semantic DOM content beside the existing single atlas stage and never become WebGL textures. Imported source remains memory-only and reload restores the checked-in reference lesson.

**Approved UX/security decisions:**
- Header **Open lesson** launches a staged modal rather than a permanent editor or premature Home route.
- Editing and file selection invalidate any prior preview; **Validate lesson** cannot change the active lesson.
- A valid preview names the lesson, Draft state, scene/image counts, and every external image host before **Open lesson** is enabled.
- Opening a validated lesson is the explicit consent point for any HTTPS image request. Images use lazy loading, `referrerpolicy="no-referrer"`, reserved layout, caption, credit, source link, and an accessible failure state.
- The atlas is the first visual selector item. A scene selects its authored visual on activation; learners may switch visuals without changing semantic scene state. Wide `split` presentation may show atlas and image together; compact presentation uses one selected visual at a time.
- CSP permits HTTPS images only. Remote scripts, styles, frames, forms, credentials, arbitrary fetches, and raw HTML remain forbidden.
- The dialog follows the current editorial scientific-instrument style: restrained borders/surface shifts, one teal action accent, monospace diagnostics, no decorative motion.

**Acceptance Criteria:**
- [x] Pasted or selected local Markdown validates entirely in the browser with the existing v1 catalog/parser and no network service.
- [x] Empty, oversized, malformed, malicious, unknown-ID, unsupported-version, and presentation-invalid input returns frozen actionable diagnostics and no partial lesson.
- [x] Validation never mutates the active lesson, current scene, camera, filters, playback, disclosure, or source text.
- [x] A valid preview reports title, lifecycle status, instructional-scene count, supplementary-image count, and sorted external hosts; source edits invalidate the preview.
- [x] **Open lesson** is the only action that replaces the active session; replacement reuses the existing parser/controller/renderer-adapter lifecycle and starts at the imported entry scene or scene 1.
- [x] File input accepts local Markdown, enforces the same size limit before parsing, preserves the selected text for correction, and never uploads or persists it.
- [x] Imported lifecycle metadata remains `draft` or absent; imported content cannot claim reviewed/published status.
- [x] Atlas and declared visuals are keyboard/touch selectable without changing the active semantic scene.
- [x] Supplementary images use complete declared metadata, HTTPS-only URLs, no referrer, lazy decode/load, stable reserved space, caption/credit/source, and accessible failure recovery.
- [x] External hosts are disclosed before activation and no remote image request occurs during validation alone.
- [x] Wide, compact, 200%-equivalent, reduced-motion, no-WebGL, renderer-failure, image-failure, keyboard, and touch paths remain usable without horizontal overflow or focus loss.
- [x] CSP remains self-only for scripts/connections and permits only HTTPS external images; production bundles contain no runtime code generation or development hooks.
- [x] Current documentation describes local-only import, trust/privacy boundaries, supplementary visuals, and the shared runtime; no scientific data/provenance/license claim changes.

**Verification Commands:**
```bash
node --test test/lesson-import.test.js test/lesson-parser.test.js \
  test/markdown-view-model.test.js test/lesson-presentation.test.js \
  test/lesson-scene-controller.test.js
npm test
npm run generate:lesson-validators && git diff --exit-code -- src/lesson/generated-validators.js
npm run build:publish
npm audit --omit=dev
npm audit
git diff --check
```

---

### Task 1: Define pure import validation [Independent]

**Context:** Keep source limits, parser composition, presentation viability, preview metadata, and external-host disclosure deterministic and DOM-free. The existing lesson parser remains the authority for YAML/Markdown safety and source-positioned diagnostics.

**Files:**
- Create: `src/ui/lesson-import.js`
- Create: `test/lesson-import.test.js`
- Modify: `src/ui/SPEC.md`

**Steps:**
1. Add failing tests for empty/oversized source, malformed/unsafe/unknown content passthrough, entry-only presentation rejection, valid frozen preview metadata, sorted unique hosts, and source immutability.
2. Run the focused test and confirm failure because the module/API does not exist.
3. Implement the smallest pure `validateLessonImport(source, catalog)` result contract and exported size limit.
4. Run focused tests, then parser/presentation regressions.
5. Add import invariants/failure modes and public API to `src/ui/SPEC.md`.

**Focused verification:**
```bash
node --test test/lesson-import.test.js test/lesson-parser.test.js test/lesson-presentation.test.js
```

**Expected result:** Valid source yields a deeply frozen candidate; invalid source yields diagnostics only and never invokes runtime state.

---

### Task 2: Add staged import dialog and session replacement [Depends on: Task 1]

**Context:** The dialog must preserve the current lesson until explicit activation. Bootstrap bindings are installed once; imported lessons replace complete presentation/navigation/controller state through the same renderer adapter rather than reloading the page or simulating legacy controls.

**Files:**
- Modify: `index.html`
- Modify: `src/bootstrap.js`
- Modify: `src/style.css`
- Test: browser interaction scripts under temporary verification workspace

**Steps:**
1. Add a red browser check proving no import trigger/dialog currently exists and invalid input cannot be exercised.
2. Add semantic dialog markup: labelled paste editor, local Markdown file input, privacy/storage note, validation output, **Validate lesson**, disabled **Open lesson**, and **Cancel**.
3. Refactor bootstrap into complete lesson activation helpers while retaining one fetched catalog, one renderer module/context, one adapter, and one set of listeners.
4. Invalidate stale candidates on edit/file replacement; render positioned diagnostics without `innerHTML`; retain source on every failure.
5. On valid preview, show lifecycle/scenes/images/hosts and enable **Open lesson**. Activation closes the dialog, resets the lesson surface to top, rebuilds the controller from the current adapter, applies the complete initial snapshot, and focuses the new lesson title.
6. Verify Escape/cancel/focus restoration, file read/size failure, repeated imports, reduced motion, and no-WebGL operation.

**Focused verification:**
```bash
node --test test/lesson-import.test.js test/lesson-scene-controller.test.js test/scene-navigation.test.js
```

**Expected result:** Validation is non-destructive; only a current validated candidate can replace the session.

---

### Task 3: Present declared supplementary visuals [Depends on: Task 2]

**Context:** Remote images are untrusted lesson content, not renderer textures or scientific-fidelity records. Keep the atlas stage mounted as the single WebGL surface; DOM image presentation follows the canonical scene visual ID and user selector without changing semantic scene/navigation state.

**Files:**
- Modify: `index.html`
- Modify: `src/bootstrap.js`
- Modify: `src/style.css`
- Modify: `src/main.js`
- Modify: `index.html` CSP
- Test: `test/lesson-import.test.js` where pure visual metadata applies; browser checks for request/failure/layout behavior

**Steps:**
1. Add red browser checks for absent selector, image request before Open, missing metadata presentation, and failed-image recovery.
2. Add atlas-first visual selector and a visual surface containing the existing `#stage`/fallback plus one reusable semantic figure.
3. Apply authored visual/layout on scene entry; permit explicit selector changes without changing scene index/controller state.
4. Render image alt, caption, credit, source, aspect ratio, loading/decoding/referrer attributes, pending/loaded/error states, and accessible fallback. Do not create `img.src` during validation.
5. Allow `https:` under `img-src` only; retain self-only script/connect policies and global no-referrer behavior.
6. Add `ResizeObserver`-driven renderer sizing so wide split/selector layout changes preserve exact stage aspect without synthetic resize events or model scaling.
7. Verify wide split, compact single-visual, 200%-equivalent, no-WebGL external visual, offline/image failure, and atlas return.

**Focused verification:**
```bash
node --test test/lesson-import.test.js test/renderer-adapter.test.js test/reference-lesson.test.js
```

**Expected result:** External visual behavior is accessible and privacy-disclosed, while the atlas retains one renderer/context and exact CSS aspect.

---

### Task 4: Synchronize documentation and security [Depends on: Tasks 1–3]

**Context:** This change alters user-visible authoring, trust boundaries, runtime source selection, CSP, and external requests but not scientific data or activity behavior.

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/SECURITY_REVIEW.md`
- Modify: `src/lesson/SPEC.md`
- Modify: `src/ui/SPEC.md`
- Modify: `skills/user.md`
- Modify: `.pi/plans/brain-atlas-zmq-ux-requirements-roadmap.md`
- Modify: this plan

**Steps:**
1. Document paste/file workflow, size/non-persistence boundary, strict validation, source diagnostics, external-host disclosure, and supplementary-image behavior.
2. Clarify that `src/lesson/` validates imported text but does not own files/DOM/fetching; bootstrap/UI own the import lifecycle.
3. Update security boundaries for explicit HTTPS image requests and no-referrer/privacy disclosure; retain no arbitrary fetch/scripts/styles/frames.
4. Record no-impact rationale for datasets, citations, data licenses, `CITATION.cff`, and third-party notices.
5. Mark the roadmap import criterion and this plan Implemented only after final evidence.

**Focused verification:**
```bash
git diff --check
```

**Expected result:** Current behavior, architecture, security, and roadmap documents agree.

---

### Task 5: Browser verification, review, and closeout [Depends on: Tasks 1–4]

**Context:** Pure tests cannot prove file input, native dialog focus, network timing, CSP, image failure, responsive layout, or renderer reuse.

**Steps:**
1. Run fresh full tests, deterministic validator check, publication build, audits, forbidden-pattern scan, and production-hook check.
2. In Firefox and Chromium verify paste/file success, invalid/malicious retention, stale-preview invalidation, repeated import, focus/keyboard behavior, wide/compact/200%-equivalent layout, reduced motion, no-WebGL, renderer failure, and root/surface scrolling.
3. Intercept external image requests to prove validation makes none and explicit Open/selection does; verify success and failure DOM semantics with no console/CSP errors.
4. Confirm one canvas/context, one renderer import, complete initial scene state, and return to atlas after supplementary visuals.
5. Run an independent behavioral/security review and a subscription-backed boundary review; reproduce or refute every material finding.
6. Run code simplification, repeat affected verification, update plan/Bead evidence, create a signed local commit, close `.6`, and request local-only main integration without pushing.

## Implementation Record

Implemented on `feat/local-lesson-import` through the existing lesson contract and one
renderer lifecycle. The delivered flow adds bounded UTF-8 source validation, `.md`
file selection, non-destructive positioned diagnostics, a host-disclosing preview,
explicit memory-only activation, immutable lesson-scoped visual catalogs, and semantic
supplementary figures with retry. The stage now observes its actual rectangle so an
atlas/image split preserves exact projection aspect without changing the one MNI
transform.

Two focused hardenings were added while testing: every presented imported scene must
reference at least one curated fidelity record so **Model & sources** cannot fail after
activation, and the reusable stage image is reset between local sessions so stale or
in-flight media does not leak into a replacement lesson. These tighten the approved
all-or-nothing and disclosure requirements; they do not expand the runtime contract.

Verification passed the full Node suite, publication build, audits, production-hook and
unsafe-code scans, headed Firefox and Chromium import/production/responsive matrices,
image request/referrer/failure/retry checks, reduced-motion and fallback checks, renderer
reuse/aspect checks, and current reference-lesson regressions. Gemma's behavioral review
reported no findings. DeepSeek and a dedicated Gemma UI review raised six hypotheses;
a fresh subscription-backed GPT verifier plus focused tests refuted all six, leaving no
confirmed or unresolved finding. A separate manual accessibility audit found the new
visual-selector buttons still overrode the global 44 px target at 30 px, and repeated
source-input events could replace the same polite live-region message on every keystroke.
The selector was corrected to 44 px, identical dirty-state announcements were deduplicated,
and both behaviors were reverified in both engines. Kimi K2.7 Code produced empty
output twice and was excluded rather than counted as review evidence.

Documentation impact was synchronized in `README.md`, `AGENTS.md`,
`docs/ARCHITECTURE.md`, `docs/SECURITY_REVIEW.md`, both subsystem specifications, and
user/author skills. No anatomy, dataset, transform, scientific activity model,
provenance, citation, data license, software dependency, third-party notice, or release
metadata changed; therefore `DATA_LICENSES.md`, `THIRD_PARTY_NOTICES.md`, and
`CITATION.cff` require no content update. The unrelated Draft behavior-driven concept
under `brain-atlas-zmq.22` remains excluded from this implementation.

## File Conflicts

| File | Tasks | Resolution |
|---|---|---|
| `src/bootstrap.js` | 2, 3 | Task 3 depends on the session lifecycle from Task 2. |
| `index.html` / `src/style.css` | 2, 3 | Build dialog first, then visual surface; verify together. |
| `src/ui/SPEC.md` | 1, 4 | Add API/invariants in Task 1; perform final synchronization in Task 4. |

## Non-goals

- No Home route, lesson library, history semantics, or persistence (`brain-atlas-zmq.24`, `.11`, `.18`).
- No free Explore/Inspect mode (`brain-atlas-zmq.7`).
- No arbitrary entity/fidelity catalogs from imported files.
- No remote Markdown URL import, uploads, backend, accounts, OAuth, or Obsidian integration.
- No author HTML, script, style, iframe, SVG execution, WebGL textures, or second renderer.
- No scientific data/model/provenance change.

## Execution Handoff

Plan saved to: `.pi/plans/brain-atlas-zmq.6-local-lesson-import-plan.md`.
Recommended next skill: `test-driven-development`; use `verification-before-completion` before closeout.
