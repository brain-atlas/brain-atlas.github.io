# Physical-Distance Impulse Speed Implementation Plan

**Owning Bead:** `brain-atlas-yum.10` — Use physical-distance semantics for impulse speed
**Status:** Implemented in the worktree (uncommitted)
**Approval:** `brain-atlas-w12` — 2026-07-22
**Design:** Combined design and implementation plan
**Created:** 2026-07-22
**Branch:** `fix/yum-10-physical-distance-impulse-speed`
**Base:** `3158df4a265eb4e252a075a0ff7e2264cb1e97a5` (`feature/zmq-21-endpoint-region-filtering` HEAD)

**Goal:** Make directed activity traverse cumulative MNI arc length at one explicitly illustrative base velocity so contour length changes latency rather than apparent world-space speed.

**Architecture:** Add a renderer-independent activity utility that validates plain contours, precomputes cumulative segment lengths, and samples positions by travelled MNI millimetres. `src/main.js` will precompute profiles once and remain the Three.js adapter for anterior, optic-radiation, and association activity. The approved default is 40 MNI mm per display second at playback speed 70; the existing speed control scales display time. Association event generation retains its seeded random-call order, 50/50 direction, inhibition, visibility, and cap semantics while event expiry becomes contour-length-dependent.

**Non-goals:** Do not change asset coordinates, `sceneFromMni`, tract direction evidence, SWM vibration, event-rate physiology, release workflows, or fibre-filter semantics.

**Acceptance Criteria:**
- [x] Directed contour positions use cumulative physical arc length, not point index or normalized contour progress.
- [x] At equal configured velocity, a short contour completes before a long contour while both move the same MNI mm per display second.
- [x] Anterior and optic-radiation motion use the same physical-distance contract; anterior remains retina→LGN and optic radiation remains LGN→V1.
- [x] Association events retain seeded reproducibility, per-event bilateral 50/50 direction, filtering, pause/reduced-motion behavior, and the 520-event cap.
- [x] Optic-radiation activity retains its 600-tracer cap and current stochastic launch model.
- [x] Public metadata and documentation identify 40 MNI mm/display second and playback scaling as illustrative display choices, not universal biological conduction velocity.
- [x] Unit and browser checks cover actual short and long contours.

**Verification Commands:**
```bash
node --test test/physical-contour-travel.test.js test/association-impulses.test.js test/tract-activity-manifest.test.js
npm test
npm run build
NODE_PATH=/tmp/brain-atlas-playwright/node_modules BRAIN_ATLAS_URL=http://127.0.0.1:5199/ BROWSER=chromium PLAYWRIGHT_EXECUTABLE_PATH="/Applications/Chromium.app/Contents/MacOS/Chromium" /tmp/brain-atlas-playwright/node_modules/.bin/playwright test --config=scripts/browser/playwright.config.cjs scripts/browser/animation-continuity.spec.cjs
```

---

### Task 1: Define cumulative-distance contract [Independent]

**Files:**
- Create: `src/activity/physical-contour-travel.js`
- Create: `test/physical-contour-travel.test.js`

**Steps:**
1. Write focused tests for cumulative segment lengths, interpolation on uneven segments, forward/reverse travel, invalid contours, and short-versus-long transit duration.
2. Run the focused test and confirm it fails because the module is absent.
3. Implement the smallest plain-data profile/sampling API with finite-value validation and explicit clamp/wrap behavior.
4. Run the focused test to green.

**Focused verification:**
```bash
node --test test/physical-contour-travel.test.js
```

### Task 2: Convert association event travel [Depends on: Task 1]

**Files:**
- Modify: `src/activity/association-impulses.js`
- Modify: `test/association-impulses.test.js`
- Modify: `public/data/tract_activity.json`
- Modify: `test/tract-activity-manifest.test.js`

**Steps:**
1. Add failing tests for physical speed metadata, contour-length-dependent expiry, equal-velocity latency, reverse endpoint travel, pause/reduced-motion behavior, frame partitioning, cap behavior, and seeded event identity.
2. Rename contour-unit speed metadata to MNI-mm/display-second metadata with `[40, 40]`; keep one random draw per accepted event so later seeded draws retain their order.
3. Attach precomputed contour profiles when events enter the render pool and expire each event after `lengthMm / speedMmPerDisplaySecond`.
4. Run focused tests to green.

**Focused verification:**
```bash
node --test test/association-impulses.test.js test/tract-activity-manifest.test.js
```

### Task 3: Integrate all directed runtime contours [Depends on: Tasks 1–2]

**Files:**
- Modify: `src/main.js`
- Modify: `scripts/browser/animation-continuity.spec.cjs`

**Steps:**
1. Precompute cumulative profiles for sampled anterior curves, smoothed optic-radiation contours, and association contours.
2. Advance anterior wrapped distance and optic/association event distance at 40 MNI mm/display second times the existing playback ratio.
3. Keep directed orientation, model clocks, filters, reduced-motion settling, and render caps unchanged.
4. Expose actual active physical-travel diagnostics only through the existing development hook and add a browser assertion comparing short and long runtime contours at equal configured velocity.
5. Run the focused browser test against a clean development server.

**Focused verification:**
```bash
npm run dev -- --host 127.0.0.1 --port 5199
# In another shell, run the Playwright command from Verification Commands.
```

### Task 4: Update disclosure and verify [Depends on: Tasks 1–3]

**Files:**
- Modify: `public/data/fidelity.json`
- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/SCIENTIFIC_TRACEABILITY.md`
- Review: `docs/lessons/retina-to-v1-validation.md`

**Steps:**
1. Replace normalized-speed descriptions with the cumulative MNI-distance contract, common 40 mm/display-second base, playback scaling, and explicit illustrative/non-universal limitation.
2. Remove the resolved open gap from scientific traceability and record the implemented contract.
3. Confirm no lesson teaching claim or citation changed; update the lesson record only if the representation dependency needs a current-behavior correction.
4. Run the full Node suite and production build, then inspect `git diff --check` and the complete diff.
5. Record commands, documentation impact, design comparison, and any deviations in `brain-atlas-yum.10`.

**Focused verification:**
```bash
npm test
npm run build
git diff --check
git status --short
```

## File Conflicts

Tasks 2 and 3 both alter the association runtime contract and therefore run sequentially. Task 4 documents only behavior verified in Task 3.

## Implementation Comparison

The implementation matches the approved design. It uses one 40 MNI-mm/display-second base rate, cumulative profiles for anterior/optic-radiation/association contours, fixed-range seeded speed sampling, physical-length pool expiry, and the existing playback ratio, direction models, filters, and caps. No material design deviation occurred. The browser server used port 5299 instead of the planned 5199 because other worktrees already occupied the planned port.

Documentation changed with behavior: `README.md`, `docs/ARCHITECTURE.md`, `docs/SCIENTIFIC_TRACEABILITY.md`, the lesson validation record, `public/data/fidelity.json`, and association activity metadata. No asset coordinates, transforms, dependencies, licenses, notices, or citations changed.

Verification evidence:

- Focused TDD: physical-distance module absence failed first; unit suite passed after implementation.
- Browser TDD: the short/long runtime diagnostic check timed out before the hook existed and passed after integration.
- `npm test`: 226/226 passed.
- `npm run build`: passed.
- Chromium animation matrix: 4/4 passed across wide/compact activity, short/long latency, pause, play, skip, and reduced motion.
- Visual check: scene `extrastriate-branching`, 683 eligible profiles, 29.084–204.235 mm, 0 console errors; screenshot `/tmp/brain-atlas-yum10-physical-distance.png`.
- Diverse review: Gemma found no defects; DeepSeek's timing allegation was refuted by a fresh GPT-family inspection/reproducer and focused tests; no confirmed or unresolved findings.

## Execution Handoff

Plan saved to: `.pi/plans/brain-atlas-yum.10-physical-distance-impulse-speed.md`.
The implementation remains uncommitted in its worktree; no merge, push, or release action has occurred.
