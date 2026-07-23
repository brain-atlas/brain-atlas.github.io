# Lesson UX Integration Hardening Implementation Plan

**Issue:** `brain-atlas-zmq.9` — Harden lesson UX for mobile, accessibility, and performance
**Status:** Implemented on 2026-07-22; Bead closeout evidence recorded separately
**Design:** `.pi/plans/brain-atlas-zmq.15-lesson-ux-ui-spec.md` (approved by `brain-atlas-6nn`, `brain-atlas-56i`, and `brain-atlas-ai4`)
**Date:** 2026-07-22
**Branch:** `feature/brain-atlas-zmq-9-hardening`

**Goal:** Verify and harden the complete Atlas/Lesson/import/inspection product journey across input modes, compact layouts, reduced motion, fallback rendering, and representative mobile performance before the MVP gate.

**Architecture:** Preserve `src/bootstrap.js` as the shell/WebGL gate, `src/main.js` as the single renderer, the one `mniGroup` transform, and the existing canonical snapshot/adapter boundary. Add demand-driven loading only for independently packaged heavy geometry that a direct lesson does not yet need; keep metadata and monolithic assets eager where deferral would create another state authority or require an asset-pipeline redesign. Extend the external Playwright matrix with integrated accessibility/mobile/performance checks and document measured evidence plus device limitations.

**Acceptance Criteria:**
- [x] The reference lesson, checked/local import, Atlas exploration, and anatomy/Model & sources inspection retain keyboard, pointer, and touch-equivalent semantic controls in wide and compact layouts with no hover-only information.
- [x] Compact, 320×568, 390×844, short-wide, and 200%-equivalent layouts have no panel overlap, root-scroll drift, horizontal overflow, or lesson touch trapping.
- [x] Reduced motion immediately settles camera/activity behavior, disables Play truthfully, and remains stable across Atlas/Lesson/inspection transitions.
- [x] No-WebGL and renderer-failure paths keep Atlas orientation, readable lesson prose, import, navigation, anatomy details, and scientific disclosures without loading Three.js.
- [x] A direct checked-lesson entry requests only independently packaged heavy assets needed by its active view; unrelated region meshes and SWM data remain deferred until a scene/Atlas snapshot requires them.
- [x] Browser console/page errors and checked accessibility assertions are clean in Firefox and Chromium; representative mobile startup/frame evidence and deferred physical-device limitations are documented.
- [x] Current documentation describes demand loading, performance limits, accessibility/fallback behavior, and the illustrative/uncited LGN→V1 rate/rhythm/burst/time/speed disclosure without changing scientific claims.

**Verification Commands:**
```bash
npm test
npm run generate:lesson-validators && git diff --exit-code -- src/lesson/generated-validators.js
npm run build:publish
npm audit --omit=dev
npm audit
direnv exec . npm run build:standalone
direnv exec . go test ./...
NODE_PATH=/private/tmp/brain-atlas-playwright/node_modules BRAIN_ATLAS_URL=http://127.0.0.1:5209/ BROWSER=firefox /private/tmp/brain-atlas-playwright/node_modules/.bin/playwright test --config=scripts/browser/playwright.config.cjs
NODE_PATH=/private/tmp/brain-atlas-playwright/node_modules BRAIN_ATLAS_URL=http://127.0.0.1:5209/ BROWSER=chromium PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" /private/tmp/brain-atlas-playwright/node_modules/.bin/playwright test --config=scripts/browser/playwright.config.cjs
NODE_PATH=/private/tmp/brain-atlas-playwright/node_modules BRAIN_ATLAS_URL=http://127.0.0.1:5210/ BROWSER=chromium PERFORMANCE_PROFILE=1 DEVICE_SCALE_FACTOR=3 PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" /private/tmp/brain-atlas-playwright/node_modules/.bin/playwright test --config=scripts/browser/playwright.config.cjs scripts/browser/performance.spec.cjs
git diff --check
```

---

### Task 1: Demand-load independent lesson assets [Independent]

**Context:** `src/main.js` currently starts every region OBJ and the 2.8 MB SWM JSON before the canonical snapshot identifies what a direct lesson route needs. The region manifest and tract data still establish panel/renderer readiness; deferring the monolithic tract JSON would require a separate metadata asset and is outside this hardening pass.

**Files:**
- Create: `scripts/browser/hardening.spec.cjs`
- Modify: `scripts/browser/playwright.config.cjs`
- Modify: `src/main.js`

**Steps:**
1. Add a browser test that opens `?lesson=retina-to-v1`, records same-origin asset requests, and expects the entry view to request cortex/OR/LGN/V1 assets but not SWM or unrelated region meshes.
2. Run the focused test against the current implementation and confirm it fails because eager requests are observed.
3. Change region loading to create manifest-backed placeholder groups and load each bilateral OBJ pair once when canonical visibility first requires its stable entity.
4. Change SWM loading to start once when canonical visibility first requires `layer.swm`; preserve late material/hemisphere/playback application through the existing group state.
5. Keep brain, optic-radiation, region metadata, and monolithic tract data eager; record why this is the practical boundary.
6. Verify that a later cortical scene requests SWM/required region meshes and that Atlas Home still loads the complete default without a second renderer/filter path.

**Focused verification:**
```bash
NODE_PATH=/private/tmp/brain-atlas-playwright/node_modules BRAIN_ATLAS_URL=http://127.0.0.1:5209/ BROWSER=chromium PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" /private/tmp/brain-atlas-playwright/node_modules/.bin/playwright test --config=scripts/browser/playwright.config.cjs scripts/browser/hardening.spec.cjs
node --test test/renderer-adapter.test.js test/reference-lesson.test.js test/explore-session.test.js
```

**Expected result:** Direct lesson entry omits SWM and unrelated region geometry requests; later canonical visibility triggers each deferred asset at most once and existing renderer behavior remains intact.

---

### Task 2: Complete integrated accessibility and mobile checks [Depends on: Task 1]

**Context:** Existing browser specs cover the subsystem journeys separately. `.9` must verify the integrated sequence and the browser accessibility tree/control surface without adding a second app or a permanent browser-test dependency.

**Files:**
- Modify: `scripts/browser/hardening.spec.cjs`
- Modify only if a reproduced defect requires it: `index.html`, `src/bootstrap.js`, `src/style.css`, `src/main.js`

**Steps:**
1. Add failing checks for any reproduced gap in accessible names, focus order/restoration, live status/error announcements, modal focus containment, 44 px targets, root/horizontal overflow, and keyboard-only traversal across drawer → lesson → inspector/disclosure → Atlas → Return.
2. Add compact pointer/touch checks confirming semantic actions match canvas previews/details and one-finger Lesson stage input scrolls `#page-scroll` without changing camera state.
3. Exercise reduced motion at startup and live across Lesson/Atlas/inspection; assert settled state, truthful disabled Play text, no auto-rotate, and exact Return.
4. Exercise no-WebGL and renderer failure through checked/local lesson reading, import diagnostics, anatomy details, and Model & sources.
5. Implement only minimal corrections backed by observed red tests; preserve the current workspace, modal-lock, renderer, and coordinate ownership rules.
6. Run the focused spec in Firefox and Chromium with console/page-error monitoring.

**Focused verification:**
```bash
NODE_PATH=/private/tmp/brain-atlas-playwright/node_modules BRAIN_ATLAS_URL=http://127.0.0.1:5209/ BROWSER=firefox /private/tmp/brain-atlas-playwright/node_modules/.bin/playwright test --config=scripts/browser/playwright.config.cjs scripts/browser/hardening.spec.cjs
NODE_PATH=/private/tmp/brain-atlas-playwright/node_modules BRAIN_ATLAS_URL=http://127.0.0.1:5209/ BROWSER=chromium PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" /private/tmp/brain-atlas-playwright/node_modules/.bin/playwright test --config=scripts/browser/playwright.config.cjs scripts/browser/hardening.spec.cjs
```

**Expected result:** One replayable spec proves integrated keyboard/pointer/touch, focus/status, compact, reduced-motion, and fallback behavior with no console/page errors.

---

### Task 3: Profile representative mobile startup and animation [Depends on: Task 1]

**Context:** Evidence must distinguish measured desktop-hosted emulation from unverified physical mobile GPUs. Use Chromium with compact viewport, DPR 3, 4× CPU throttling, and bounded network emulation; collect resource, readiness, long-task, heap, and animation-frame data without presenting emulator output as physical-device proof.

**Files:**
- Create: `scripts/browser/performance.spec.cjs`
- Modify: `scripts/browser/playwright.config.cjs`
- Create: `docs/PERFORMANCE.md`

**Steps:**
1. Add a Chromium-only Playwright profile that installs pre-navigation long-task capture, applies 4× CPU and representative mobile network throttling, and waits for requested assets to settle.
2. Record Atlas Home and direct checked-lesson readiness, encoded resource bytes by asset class, long tasks, JS heap where available, renderer pixel dimensions, and a settled two-second `requestAnimationFrame` interval sample.
3. Assert only stable safety budgets: successful readiness, no request/console failure, bounded canvas pixel ratio, and no catastrophic frame starvation. Keep volatile timing values as evidence, not brittle CI promises.
4. Run the profile repeatedly enough to report a median/range and capture exact browser/host/emulation details.
5. Document the direct-lesson transfer reduction, full-Atlas cost, monolithic tract limitation, continuous-render cost, and lack of physical iOS Safari/Android thermal/GPU evidence.

**Focused verification:**
```bash
NODE_PATH=/private/tmp/brain-atlas-playwright/node_modules BRAIN_ATLAS_URL=http://127.0.0.1:5210/ BROWSER=chromium PERFORMANCE_PROFILE=1 DEVICE_SCALE_FACTOR=3 PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" /private/tmp/brain-atlas-playwright/node_modules/.bin/playwright test --config=scripts/browser/playwright.config.cjs scripts/browser/performance.spec.cjs --repeat-each=3
```

**Expected result:** Replayable measurements and a clearly bounded evidence statement exist; no claim exceeds the emulated hardware/browser data.

---

### Task 4: Synchronize docs, review, and closeout [Depends on: Tasks 1–3]

**Context:** Demand loading changes renderer startup behavior; the hardening pass also closes documented UX/performance evidence gaps. It does not change lesson schema, anatomy, transforms, activity models, citations, licenses, dependencies, or release metadata unless implementation proves otherwise.

**Files:**
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/SECURITY_REVIEW.md`
- Modify: `src/ui/SPEC.md`
- Modify: `scripts/browser/README.md`
- Modify: `.pi/plans/brain-atlas-zmq-ux-requirements-roadmap.md`
- Modify: this plan
- Review for impact: `docs/SCIENTIFIC_TRACEABILITY.md`, `docs/lessons/retina-to-v1-validation.md`, `DATA_LICENSES.md`, `THIRD_PARTY_NOTICES.md`, `CITATION.cff`, `AGENTS.md`

**Steps:**
1. Document current integrated capability, asset-demand boundary, exact replay commands, measured mobile-emulation evidence, and deferred physical-device limitations.
2. Add a UI invariant/failure mode for visibility-demand asset loading without a second renderer/transform and map it to the new browser checks.
3. Confirm Model & sources exposes the existing material limitation that LGN→V1 rates, rhythms, bursts, time dilation, and speed are illustrative rather than measured; do not duplicate or strengthen the scientific claim.
4. Run documentation-impact review and record specific no-impact rationales for scientific content, datasets, transforms, schemas, dependencies, licenses, notices, citation, and release metadata.
5. Run the full Node/Go/build/audit/browser/production/static matrix and `git diff --check`.
6. Request model-diverse code/UX review, verify every concrete finding against source and executable evidence, and fix confirmed regressions test-first.
7. Compare implementation with this plan, mark material deviations, append verified evidence to `brain-atlas-zmq.9`, and close only when every acceptance criterion has fresh evidence.

**Focused verification:**
```bash
npm test
npm run generate:lesson-validators && git diff --exit-code -- src/lesson/generated-validators.js
npm run build:publish
npm audit --omit=dev
npm audit
direnv exec . npm run build:standalone
direnv exec . go test ./...
git diff --check
```

**Expected result:** Code, replayable evidence, public/current documentation, scientific no-impact review, and Bead status agree.

## Implementation record

- `src/main.js` now creates region placeholder groups from the small manifest and starts each bilateral OBJ pair only when canonical visibility first requests that region. SWM uses the same one-shot visibility trigger. Existing group factors reapply visibility, hemisphere, selection, and inspection when geometry arrives; activity uses the current playback state. Brain, optic radiation, region metadata, and combined tract metadata/geometry remain eager.
- The request regression failed first because direct lesson entry loaded SWM and all 90 region OBJ files. After the change, entry loads LGN/V1 only; scene 5 loads SWM/V2 once; Atlas Home still loads the complete default.
- Automated accessibility review found two defects: the labelled stage lacked a permitted landmark role, and Side/Top/Back/Front/Reset camera actions were only 32 px high. Red Playwright/axe checks preceded the `role="region"` and 44 px fixes.
- `hardening.spec.cjs` passes six checks in each browser: settled serious/critical axe scans across Atlas, drawer, import, Lesson, Model & sources, anatomy inspector, and no-WebGL Lesson; keyboard focus/announcements; camera target size; 320/390/short-wide/200%-equivalent containment; demand loading; and complete Atlas loading. Existing Chromium real-touch and Firefox/Chromium pointer, reduced-motion, fallback, import, inspector, history, and one-canvas checks remain green.
- The static production profile ran three fresh Chromium contexts at 390×844, DPR 3 (renderer cap 2), 4× CPU, 10/5 Mbit/s, and 80 ms latency. Direct lesson assets settled in a median 3.789 s versus 13.091 s for Atlas and transferred 2,565,565 versus 14,679,519 encoded anatomical/catalog bytes, an 82.5% reduction. `docs/PERFORMANCE.md` records heap, long-task, frame, host, replay, and physical-device limits.
- Fresh verification passed: Node 173/173; validator drift; `build:publish`; production static hook/map/symlink/runtime-code-generation checks; both npm audits; standalone build; Go tests; Firefox 37 pass/6 intentional skips; Chromium 39 pass/4 intentional skips; and production Home 3/3 in each browser. The opt-in mobile profile passed 3/3.
- Review `20260722-zmq9-hardening`: Gemma behavioral review returned zero findings. Kimi K2.7 Code returned empty unusable output twice. A fallback GPT boundary pass alleged that late SWM lines miss canonical factors; a fresh verifier refuted it with the existing completion reapply path and a delayed-response Firefox reproduction. Zero findings remain confirmed or unresolved.
- No material plan deviation occurred. Physical iOS/Android GPU, battery, thermal, and backgrounding checks remain explicitly deferred because no device was available; the evidence makes no physical-hardware claim.
- This change alters request timing, stage semantics, target size, tests, and documentation. It changes no lesson schema, dataset bytes, geometry, transform, activity model, scientific claim, citation, dependency/lockfile, data or software license, third-party notice, release metadata, persistence, or network trust boundary. `docs/SCIENTIFIC_TRACEABILITY.md`, `docs/lessons/retina-to-v1-validation.md`, `DATA_LICENSES.md`, `THIRD_PARTY_NOTICES.md`, `CITATION.cff`, and `AGENTS.md` therefore need no content changes.
- No commit, push, PR, merge, deployment, worktree cleanup, or change to the unrelated root-checkout Draft concept is part of this implementation.

## File Conflicts

| File | Tasks | Resolution |
|---|---|---|
| `scripts/browser/hardening.spec.cjs` | 1, 2 | Task 2 extends the asset-loading regression created in Task 1. |
| `scripts/browser/playwright.config.cjs` | 1, 3 | Add hardening matching first; add environment-driven DPR without changing default runs second. |
| `src/main.js` | 1, possible 2 | Task 2 changes it only for a reproduced integration defect and reruns Task 1 checks. |
| Documentation | 3, 4 | Task 3 writes measured evidence; Task 4 aligns architecture/public/spec records afterward. |

## Execution Handoff

Plan saved to: `.pi/plans/brain-atlas-zmq.9-integration-hardening-plan.md` (verified with `test -f`).
Recommended workflow: `test-driven-development` for behavior changes; `verification-before-completion` before any completion claim.
