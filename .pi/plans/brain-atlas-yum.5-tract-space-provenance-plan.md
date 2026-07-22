# Tract-Space Provenance Correction Plan

**Issue:** `brain-atlas-yum.5` — Verify tractography template-space provenance
**Status:** Implemented
**Approval basis:** accepted P0 Bead plus the user's 2026-07-22 direction to continue the recorded MVP critical path without pausing except for genuine decisions or external-source actions
**Date:** 2026-07-22
**Branch:** `fix/tract-space-provenance`

**Goal:** Replace ambiguous or incorrect fibre-space claims with verified per-asset ICBM 2009a RAS-millimetre lineage while preserving the one runtime transform and every checked-in fibre coordinate.

**Architecture:** The cortical and Jülich assets remain MNI152NLin2009cAsym. Association tracts are verified ICBM 2009a Nonlinear Asymmetric. OR/SWM use one exact nonlinear ICBM152 2009a FIB; a release-companion T1 indicates the asymmetric variant, but no direct FIB build binding survives. Nibabel decodes source TrackVis voxel-mm vertices into RAS+ world millimetres and project resampling retains that frame. Official MNI records describe 2009a and 2009c as the same anatomy with different sampling. Therefore the correction changes metadata, evidence, disclosures, and tests—not geometry and not `sceneFromMni`.

**Review amendment:** Independent scientific review required the FIB variant to remain qualified, corrected TrackVis decoding language and the final OR command/masks, distinguished complete association regeneration from OR/SWM post-processing reproduction, neutralized the V1-centroid filter label, and added exact parent-mask lineage plus a pinned research verifier. These evidence corrections do not change runtime scope or geometry.

## Recovered evidence baseline

- `tracts.json`: recovered `extract_tracts.py` reproduces the checked-in file byte-for-byte from the stable HCP-1065 population-averaged TrackVis release. Source page and release identify ICBM 2009a Nonlinear Asymmetric. Nibabel's effective TrackVis decode applies voxel size, half-voxel offset, orientation, and voxel-to-RAS metadata before project sampling.
- `or_fibres.json`: post-processing the recovered 223-streamline `or_retrack_L.trk` reproduces the former JSON byte-for-byte after 64-point arc-length resampling, two-decimal rounding, and the project's >18 mm V1-centroid rule. Recovered evidence gives the exact final DSI command and thresholded Jülich source/mask hashes; the tracking run itself was not replayed.
- `swm_fibres.json`: recovered `filter_bake_swm.py`, `swm_fibres3_plain.trk`, exact TemplateFlow GM/WM parents, and derived seed reproduce the former JSON byte-for-byte from the recovered intermediate. The upstream 200,000-streamline command is recovered; the DSI run itself was not replayed.
- The recovered 8,181,706-byte FIB is byte-identical to the stable GitHub release asset `hcp1065/ICBM152_adult.1mm.fz`. Its source page states that HCP-1065 registration is based on nonlinear ICBM152 2009a.
- Official 2009a and 2009c asymmetric T1 volumes use 1 mm RAS+ world coordinates with different shapes/origins. Identity-world resampling gives T1 correlation about 0.997 and brain-support Dice about 0.975, corroborating the primary-source statement that sampling—not stereotaxic anatomy—differs.

## Scope

### In scope

1. Add one explicit metadata shape to all three fibre JSON assets:
   - exact source record and per-asset template-variant evidence limit;
   - decoded RAS+ world convention;
   - millimetre units; and
   - no 2009a→2009c template warp while acknowledging resampling/rounding.
2. Keep coordinate, length, and local-length arrays byte-for-byte equivalent at the parsed-data level.
3. Add a focused Node regression that freezes geometry payload hashes and validates metadata.
4. Add a public detailed provenance record with source URLs, hashes, effective TrackVis/FIB affine semantics, exact DSI commands, recovered transformation/sampling steps, correspondence results, identity-world evidence, numeric methods, limitations, and remaining generator/right-OR work.
5. Add a pinned, path-parameterized research verifier plus compact transcript, source, artifact, and result registries without redistributing large inputs.
6. Synchronize public fidelity disclosures, source/license documentation, README, contributor/runtime coordinate comments, and scientific traceability.
7. Validate rendering and alignment without adding a transform or claiming that the fibres were authored on the 2009c voxel grid.

### Out of scope

- Checking in every cortical, Jülich, optic-radiation, association, and SWM generator/parameter manifest (`brain-atlas-yum.6`).
- Replacing the runtime-mirrored right optic radiation (`brain-atlas-yum.7`).
- Changing fibre geometry, smoothing, activity models, direction probabilities, labels, cameras, filters, or endpoint semantics.
- Publishing, pushing, deploying, or changing software dependencies.

## Acceptance criteria

- [x] `tracts.json` identifies ICBM 2009a Nonlinear Asymmetric; OR/SWM identify nonlinear ICBM152 2009a and explicitly qualify their indicated-but-unbound asymmetric variant. All three identify decoded `RAS+`, `mm`, and no template warp through resampling.
- [x] A focused test proves that only metadata changed: association coordinate payload, OR fibres, and SWM fibres/`len`/`lloc` retain frozen hashes.
- [x] The public provenance record lists stable source records, exact parent/intermediate hashes, effective affine semantics, qform/sform status, exact correspondence, what was and was not reproduced, and the verified generation/sampling history for each asset.
- [x] Numeric evidence records official 2009a/2009c world geometry, identity-world alignment, OR endpoint-to-2009c-ROI distances, SWM ribbon filtering/rounding bounds, and hemisphere/range checks.
- [x] `AGENTS.md`, `README.md`, `DATA_LICENSES.md`, `docs/SCIENTIFIC_TRACEABILITY.md`, `public/data/fidelity.json`, and `src/main.js` agree that fibre geometry is 2009a RAS+ mm sharing one runtime transform with 2009c anatomy.
- [x] Unknowns remain explicit: missing checked-in full generators, unrecorded DSI Studio version (binary hash retained where useful), mirrored right OR, and tract endpoint/function limits.
- [x] Focused/full tests, validator drift check, publication/build checks, audits, and `git diff --check` pass.
- [x] Wide and compact Firefox/Chromium checks show all fibre layers aligned, one proper transform, no new console errors, and unchanged activity/visibility behavior.
- [x] Independent scientific/provenance and implementation reviews have no unresolved material findings.
- [x] Closeout uses a verified SSH-signed local commit; no push or publication occurs.

## Tasks

### Task 1: Freeze metadata and geometry contract

**Files:**
- Create: `test/fibre-provenance.test.js`
- Modify: `public/data/tracts.json`
- Modify: `public/data/or_fibres.json`
- Modify: `public/data/swm_fibres.json`

**Steps:**
1. Add a failing test for the common explicit space metadata and frozen parsed geometry hashes.
2. Confirm failure against current ambiguous/incorrect metadata.
3. Change metadata only; do not alter coordinate or length arrays.
4. Confirm focused tests pass.

**Focused verification:**
```bash
node --test test/fibre-provenance.test.js test/catalog.test.js test/tract-activity-manifest.test.js
```

### Task 2: Record source and coordinate evidence

**Files:**
- Create: `docs/TRACT_SPACE_PROVENANCE.md`
- Create: `.pi/research/2026-07-22-tract-space-provenance/sources.tsv`
- Create: `.pi/research/2026-07-22-tract-space-provenance/artifacts.tsv`
- Create: `.pi/research/2026-07-22-tract-space-provenance/recovered-run-log.txt`
- Create: `.pi/research/2026-07-22-tract-space-provenance/verify.py`
- Create: `.pi/research/2026-07-22-tract-space-provenance/verification-result.json`

**Steps:**
1. Record canonical source URLs and date-stamped verification status.
2. Record SHA-256 hashes without copying large or third-party source files into Git.
3. Document exact source/output correspondence and recovered command/processing history.
4. Document coordinate conventions, source affine matrices, identity-world rationale, numeric checks, and limitations.
5. Link open generator and independent-right-OR Beads rather than duplicating their scope.

### Task 3: Synchronize current/public documentation

**Files:**
- Modify: `docs/SCIENTIFIC_TRACEABILITY.md`
- Modify: `DATA_LICENSES.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `src/main.js`
- Modify: `public/data/fidelity.json`
- Review: `docs/ARCHITECTURE.md`, `THIRD_PARTY_NOTICES.md`, `CITATION.cff`, `docs/SECURITY_REVIEW.md`

**Steps:**
1. Replace unresolved 2009a/2009c text with exact mixed-release/common-world semantics.
2. Keep 2009c authorship claims only for cortical/Jülich assets.
3. Remove fibre-template uncertainty from user disclosure while preserving generator, mirroring, endpoint, and activity limitations.
4. Record a specific no-impact rationale for architecture/security/notices/citation files if no update is needed.

### Task 4: Verify, review, and close

**Steps:**
1. Run source/hash/correspondence and numeric checks sequentially.
2. Run focused and full Node tests, validator generation/drift check, builds, publication check, audits, and static checks.
3. Run replayable wide/compact Firefox and Chromium alignment/activity checks and inspect the determinant/uniform scale through development hooks.
4. Run one independent scientific/provenance review and one implementation/data-contract review; verify concrete findings.
5. Update this plan to Implemented, attach evidence to `brain-atlas-yum.5`, create and verify an SSH-signed commit, and close the Bead.

## Verification commands

```bash
node --test test/fibre-provenance.test.js test/catalog.test.js test/tract-activity-manifest.test.js
npm test
npm run generate:lesson-validators
git diff --exit-code -- src/lesson/generated/
npm run build:publish
npm run build
npm audit --omit=dev
npm audit
git diff --check
```

## Documentation and scientific impact

This is a scientific-provenance correction. Metadata, public source summaries, runtime disclosure, contributor rules, and source/license records must land atomically. No data license changes: association assets remain CC BY-SA 4.0 plus HCP terms; FIB-derived OR/SWM remain under HCP terms. No software dependency, security boundary, citation identity, activity model, or release metadata changes are intended.

## Implementation record

Implemented on `fix/tract-space-provenance` without changing a fibre coordinate,
length value, activity model, camera, filter, dependency, or runtime transform.

- The three current JSON assets carry explicit per-asset source-space contracts;
  frozen parsed payloads and complete current-file hashes enforce metadata-only
  correction.
- The public provenance record and compact research package bind all consumed
  sources/intermediates, exact OR/SWM parent derivations, NIfTI forms, recovered
  commands, effective TrackVis decoding, numeric alignment, and what was not
  replayed. The pinned verifier reproduced its checked result exactly.
- Full verification passed: 129/129 Node tests after sequential validator
  regeneration, publication/production build, both audits with zero
  vulnerabilities, static production checks, and `git diff --check`.
- Headed Firefox and Chromium passed all three animation-continuity checks plus
  wide/compact custom inspection with one canvas, 15,000 SWM dots, 16 association
  groups, 440 bilateral optic endpoints, determinant +1, uniform scale, exact
  stage aspect, no overflow/errors, and corrected expanded disclosures.
  Production preview passed 3/3 checks in each browser.
- Gemma 4 31B reported zero implementation/data-contract findings. Subscription-
  backed GPT-5.6 scientific review findings were verified and resolved; final
  re-review reported zero findings and supported closing the P0 gate.
- Documentation validation passed. No `src/ui/SPEC.md`, security, notices,
  citation, release metadata, or dependency update was required. No push, PR,
  deployment, or publication occurred.
