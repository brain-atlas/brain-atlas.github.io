# DSI Replay Nondeterminism Correction Plan

- **Status:** Approved — repository owner/change-control decision `brain-atlas-3ct` authorizes Alternative A and implementation
- **Issue:** `brain-atlas-yum.6.1` — Resolve DSI tracking replay nondeterminism
- **Design:** `.pi/plans/brain-atlas-yum.6-reproducible-asset-pipelines-plan.md`
- **Date:** 2026-07-22
- **Branch:** `chore/reproducible-asset-pipelines`

**Goal:** Resolve the legacy DSI replay gate honestly—without changing public geometry, promoting any observed replay class, or pretending the surviving multithreaded tracker is deterministic.

**Architecture:** Keep deterministic source preparation and post-processing separate from the externally executed DSI tracking boundary. Current OR and SWM web assets remain exactly reproducible only from their hash-registered recovered TrackVis intermediates; the upstream tracking commands, inputs, executable identity, and observed non-repeatability remain provenance evidence rather than a false exact-regeneration claim. Harden future wrappers and replay evidence, then either close `brain-atlas-yum.6` through an explicitly approved legacy exception or leave it blocked for a separately scoped deterministic-regeneration program.

## Established evidence

- The canonical user-run OR replay used the registered executable, FIB, masks, and recovered six-thread argv; it produced 216 raw/215 retained rather than 223/220 and remains frozen class 4.
- One clean six-thread repeat with the same scientific inputs and effective seed produced a different decoded multiset and 234 raw/233 retained. This establishes non-repeatability of the end-to-end six-thread DSI execution; the varying internal stage is not isolated.
- Two additional attempted bias-disable diagnostics are rejected observations, not compliant repeats: the Jul 9 binary reported the option unused/unrecognized and still ran bias correction.
- Two one-thread observations were byte-identical but produced 254 raw/252 retained. This pair neither proves general repeatability nor reproduces the current public shape.
- The SWM replay remains frozen class 3: valid 200,000-tract structure and 15,000-fibre post-processing shape, but different decoded and public-output hashes.
- The closest inspected public source is merely a nearby Jul 9 commit with unknown temporal/build relationship to the executable. Its schedule-sensitive floating reduction is an unverified possible mechanism, not an identified cause.
- Public fibre coordinates, current metadata, one runtime transform, and all scientific activity semantics are unchanged.

Compact evidence is under `.pi/research/2026-07-22-dsi-replay-determinism/`. Full evidence is preserved under `/tmp/brain-atlas-yum6-dsi-replay/` and `/tmp/brain-atlas-yum6-dsi-diagnostic/` and copied to the owner-only archive `~/.local/share/brain-atlas/replay-evidence/brain-atlas-yum.6-2026-07-22/`. Its 49-entry, 780,598,830-byte manifest has SHA-256 `b059c722b90cd2ae68d4540f220bfe78c12c4d1611f251264a529ae815005ed5`; source-to-copy and retrieval rehashes passed. Originals remain in place.

## Decision alternatives

### A. Approved narrow legacy-evidence exception

The repository owner, acting as this project's designated change-control authority, records a versioned Beads decision scoped to the exact legacy artefacts and evidence hashes listed below. Preserve every observed class and the prohibition on replacement, but amend the parent plan so this demonstrated tool-level non-repeatability does not indefinitely block the checked-in deterministic stages or endpoint-filtering work.

- Scope identities: recovered OR TrackVis `60799f23977e938411ffc127083d5220e503c4a112b28f4ea14d46d3c01041d0`; recovered SWM gzip/plain TrackVis `0fd9cab05b61982191b372d77e83842aa51bef939fdcb17857188d90e278a631` / `4c79821a3295a66ba07f4f70c1a27191818715f42edcc30dfc632c36a81a4a3f`; current OR/SWM public files `1ca89796c621963388f635bd31ab0bd9a28eec7917de6c12ef8b68d469da4144` / `81529a410c9053731416124e346dce21e85d96c85fb8b3bad151735a4b1f81fb`; current geometry payloads `b89152176bd9a96796a02e449a4a34151572512def61014d04833336b6695b6e` / `9dfc14d565c8f7ccb4c57ba0d2eee1bd9dca0549e3c7d07f70d6fe47f07f4331`.
- The decision records approver role, date, rationale, accepted risk, closeout-only scope, unchanged classes, no-replacement consequence, and non-precedent status. Any different asset/evidence hash needs a new decision.
- OR stays class 4 and SWM stays class 3; neither is promoted, treated as exact, or authorized to replace public data.
- The current OR/SWM assets are described as byte-reproducible from hash-registered recovered TrackVis intermediates, not fully regenerable from the upstream DSI invocation.
- The historical DSI commands remain exact provenance records. They are not marketed as deterministic generators.
- `brain-atlas-yum.6` may close after evidence hardening, synchronized limitation documentation, final verification, and review.
- Approved follow-up `brain-atlas-yum.13` owns source/build-bound deterministic retracking and any future candidate-asset replacement. It requires separate scientific, geometry, disclosure, and replacement approval and does not block endpoint classification of the current assets unless the publication owner later chooses to make it a gate.

Why recommended: additional one-thread trials cannot regenerate the current assets and would test a different pipeline. Tuning tract counts or post-processing after observing results would weaken the predeclared contract. A truthful legacy boundary is more rigorous than manufacturing nominal exactness and avoids speculative replacement work in the MVP pipeline task.

### B. Keep `brain-atlas-yum.6` blocked for full upstream regeneration

Do not amend the closeout rule. Start a separately approved investigation that binds source/build identity, constructs or acquires a deterministic tracker, and generates candidate OR/SWM assets for full scientific and visual comparison. The current public assets remain unchanged and endpoint filtering/publication remain blocked meanwhile.

### C. Run more one-thread trials before deciding

Preregister a process-level repeatability rule first. For example, excluding a per-run mismatch probability of at least 5% at one-sided 95% confidence after zero mismatches requires 59 independent clean trials (`ceil(log(0.05)/log(0.95))`). This would only characterize the exact one-thread environment; it would not reproduce the current 220-fibre asset or justify replacement. Therefore it is not recommended as a prerequisite to the governance decision.

## Acceptance criteria for approved Alternative A

- [x] A versioned decision Bead identifies the repository owner as change-control approver and records the exact recovered-intermediate, public-file, geometry, and evidence-manifest hashes; it explicitly accepts OR class 4 and SWM class 3 as unchanged legacy outcomes, authorizes no replacement, grants only the named parent-closeout exception, and is marked non-precedential.
- [x] The invalid bias-disable observations are excluded from compliant replay counts and labelled rejected diagnostics.
- [x] No text attributes variation to a particular internal DSI stage or calls the nearby source commit an exact build match.
- [x] Future replay logs fail closed on unused/unrecognized options.
- [x] Future wrappers and evidence capture UTC start, UTC end, exit status, exact argv, canonical working directory, executable path/hash, explicit-versus-effective seed status, effective thread count and relevant thread environment, execution-time input hashes, script/wrapper version and hash, complete-log hash, output hashes, OS/architecture/runtime dependencies, and verifier commit.
- [x] Existing v1 evidence remains immutable and is labelled as lacking wrapper-captured start/end/status; it is not silently rewritten as v2 evidence.
- [x] Full replay evidence is copied—not moved or deleted—to approved `~/.local/share/brain-atlas/replay-evidence/brain-atlas-yum.6-2026-07-22/`, outside Git with owner-only permissions, a complete size/hash manifest, named custodian, retention policy, and retrieval check; raw third-party outputs/logs are not committed.
- [x] `tools/assets/SPEC.md`, manifest/schema, the parent plan, provenance/traceability documents, data-license records, and relevant public source summaries state the exact reproducibility boundary consistently.
- [x] Current `public/` assets match their pre-change complete-file and geometry hashes.
- [x] Before parent closure, a separate approved follow-up Bead has an owner, scope, acceptance criteria for source/build-bound deterministic OR/SWM characterization, explicit current-asset preservation and replacement gates, and durable links to this decision/evidence. Its completion does not block this named exception.
- [x] Focused tests, full Node tests, pipeline verification, builds/audits, scientific review, implementation review, and signed local commit checks pass with no pipeline push or publication.

## Verification commands

```bash
node --test --test-name-pattern='asset pipeline|replay classification' test/asset-pipeline.test.js
npm test
npm run generate:lesson-validators
npm test
npm run build:publish
npm audit --omit=dev
npm audit
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock python -m tools.assets check-manifest --json
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock python -m tools.assets verify-current --json
python3 -m json.tool .pi/research/2026-07-22-dsi-replay-determinism/diagnostic-summary.json >/dev/null
git diff --check
git status --short
```

Validator generation and `npm test` must run sequentially, never concurrently.

---

### Task 1: Record the approved exception

**Context:** Amend governance without changing any observed evidence class or public data.

**Files:**
- Modify: `.pi/plans/brain-atlas-yum.6-reproducible-asset-pipelines-plan.md`
- Modify: `.pi/plans/brain-atlas-yum.6.1-dsi-nondeterminism-correction-plan.md`
- Durable state: `brain-atlas-yum.6.1`, `brain-atlas-yum.6`, new follow-up Bead

**Steps:**
1. Record the approval and exact exception in Beads.
2. Mark this plan Approved and amend only the parent plan sections contradicted by the decision.
3. Preserve the original replay results and frozen class definitions verbatim.
4. Create and approve the separately scoped deterministic-regeneration follow-up with an owner, acceptance criteria, current-asset preservation rule, and separate replacement gate before parent closure.

**Focused verification:**
```bash
rg -n 'class 4|class 3|legacy|replace|deterministic' .pi/plans/brain-atlas-yum.6*.md
```

**Expected result:** The named exception is explicit, narrow, and cannot be read as class promotion or replacement approval.

### Task 2: Harden wrapper and evidence contracts [Depends on Task 1]

**Context:** The diagnostic binary returned status 0 after ignoring an option, and the v1 evidence schema omitted wrapper-captured start/end/status despite the parent plan requiring them.

**Files:**
- Modify: `test/asset-pipeline.test.js`
- Modify: `tools/assets/dsi.py`
- Modify: `tools/assets/replay.py`
- Modify: `tools/assets/replay-evidence.schema.json`
- Modify: `tools/assets/SPEC.md`
- Modify: `tools/assets/manifest.json`

**Steps:**
1. Add failing tests for an ignored option, explicit/effective seed distinction, start/end/status evidence, and immutable v1 compatibility.
2. Make generated v2 wrappers append machine-parseable UTC start/end and exit status to the retained log and fail on ignored/unrecognized options.
3. Parse and schema-validate executable path/hash, canonical working directory, OS/architecture/runtime dependencies, effective thread count and relevant thread environment, explicit/effective seed, execution-time input hashes, wrapper version/hash, verifier revision, and v2 receipt fields. Mark unavailable v1 fields `unavailable` rather than backfilling; retain read-only v1 compatibility without upgrading old evidence.
4. Update literal script/hash fixtures and normative contracts.
5. Run focused tests.

**Focused verification:**
```bash
node --test --test-name-pattern='DSI command printer|replay classification' test/asset-pipeline.test.js
```

**Expected result:** Future ignored options fail closed and every future replay has auditable execution boundaries.

### Task 3: Normalize compact diagnostic evidence [Depends on Task 2]

**Context:** Separate compliant clean runs from rejected diagnostic observations and avoid stage-level causal overclaim.

**Files:**
- Modify: `.pi/research/2026-07-22-dsi-replay-determinism/README.md`
- Modify: `.pi/research/2026-07-22-dsi-replay-determinism/diagnostic-summary.json`
- Modify: `.pi/research/2026-07-22-dsi-replay-determinism/sources.tsv`
- Modify or exclude before commit: accidental raw fetched-source files in the same research directory

**Steps:**
1. Include a complete run ledger with exact argv/script/input/log/output hashes and explicit/effective seed state for the recovered 223→220 reference, both clean six-thread runs (216→215 and 234→233), the SWM class-3 replay, and common inputs/binary.
2. Mark bias-disable arms rejected and exclude them from compliant counts; retain them only as rejected observations. Mark the one-thread pair non-comparable exploratory evidence.
3. State that the current OR was not recreated, downstream JSON remains byte-reproducible only from recovered intermediates, and only the clean end-to-end six-thread executions are shown non-repeatable; keep varying stage/source build unresolved and any source mechanism qualified.
4. Validate compact formats and independently recalculate representative hashes.
5. Remove accidental raw fetched-source files only after explicit cleanup approval; do not commit them.

**Focused verification:**
```bash
python3 -m json.tool .pi/research/2026-07-22-dsi-replay-determinism/diagnostic-summary.json >/dev/null
awk -F '\t' 'NF != 5 { exit 1 }' .pi/research/2026-07-22-dsi-replay-determinism/sources.tsv
```

**Expected result:** Compact evidence is internally consistent and makes no unsupported causal or repeatability claim.

### Task 4: Preserve full evidence durably [Depends on Task 1]

**Context:** `/tmp` is not a durable retention location. Raw DSI/HCP-derived files must stay out of Git and access-controlled.

**Files:**
- Create outside repository after approval: `~/.local/share/brain-atlas/replay-evidence/brain-atlas-yum.6-2026-07-22/`
- Copy: hash-bound executable/input/mask/seed identities, recovered OR/SWM TrackVis intermediates, initial OR/SWM replay outputs/logs/evidence, and approved diagnostic outputs/logs/scripts/summary
- Do not delete: `/tmp/brain-atlas-yum6-dsi-replay/`, `/tmp/brain-atlas-yum6-dsi-diagnostic/`, or recovered scratchpad sources

**Steps:**
1. Confirm the destination is outside every Git worktree, expected copy is approximately 760 MB, and the repository owner is the custodian. Set directory mode `0700`; files must not be group/world accessible.
2. Copy retained regular files without following symlinks; preserve all originals. Review DSI/HCP/Jülich/TemplateFlow terms before copying and keep controlled/non-redistributed material local.
3. Write a deterministic relative-path, byte-size, SHA-256 manifest that does not self-hash. Compare every copy against its source and perform a fresh retrieval/read/hash check after copy.
4. Record destination, manifest hash, custodian, owner-only ACL, and retention policy—retain until the deterministic-regeneration follow-up closes and deletion is separately approved—in Beads and compact evidence.
5. Do not remove temporary or recovered originals without separate approval.

**Focused verification:**
```bash
# Destination is supplied by the approved decision.
find "$DESTINATION" -type f -print0 | sort -z | xargs -0 shasum -a 256
```

**Expected result:** Full evidence survives `/tmp` cleanup without entering Git or changing source files.

### Task 5: Synchronize scientific and public documentation [Depends on Tasks 1, 3]

**Context:** Documentation must distinguish deterministic checked stages from the non-repeatable legacy DSI boundary.

**Files:**
- Modify: `README.md`
- Modify: `DATA_LICENSES.md`
- Modify: `docs/TRACT_SPACE_PROVENANCE.md`
- Modify: `docs/SCIENTIFIC_TRACEABILITY.md`
- Modify: `docs/ARCHITECTURE.md` only if pipeline architecture wording is affected
- Modify: `AGENTS.md` only if a durable contributor rule changes

**Steps:**
1. State exact current-asset and upstream-regeneration boundaries.
2. Preserve ICBM 2009a/2009c, mirroring, single-transform, and contour-order disclosures.
3. Confirm no shipped dependency/model/license change; record notice no-impact rationale.
4. Run documentation consistency searches.

**Focused verification:**
```bash
rg -n 'reproduc|DSI|intermediate|non.?determin|220|200,000' README.md DATA_LICENSES.md docs/TRACT_SPACE_PROVENANCE.md docs/SCIENTIFIC_TRACEABILITY.md tools/assets/SPEC.md
```

**Expected result:** No document claims full upstream exact regeneration for OR or SWM.

### Task 6: Verify, review, commit, and close [Depends on Tasks 2–5]

**Context:** Complete the parent task in the repository's authoritative local Beads graph and a verified signed local commit, under the user's existing no-push/publication gate. Remote integration is intentionally deferred to `brain-atlas-zmq.26`; it is not a substitute for evidence durability and does not authorize merging to `main`, branch deletion, worktree cleanup, push, deployment, or publication here.

**Files:**
- Review all task-owned files
- Preserve unrelated `.pi/plans/brain-atlas-zmq.22-behavior-driven-white-matter-activity-concept.md`

**Steps:**
1. Run all verification commands sequentially.
2. Recalculate public asset and geometry hashes; confirm no runtime asset changed.
3. Run independent scientific/reproducibility and implementation reviews.
4. Resolve findings and rerun affected checks.
5. Review source-license/derivative obligations and documentation impact.
6. Create one verified SSH-signed local commit.
7. Record evidence in Beads; close `brain-atlas-yum.6.1`, then `brain-atlas-yum.6` only if all approved exception criteria pass.
8. Leave the branch/worktree in place and do not merge or clean up.

**Focused verification:**
```bash
git diff --check
git status --short
git log -1 --show-signature --format=fuller
```

**Expected result:** Verified signed local commit, closed Beads with evidence, unchanged public geometry, and no remote/public action.

## File conflicts

| File | Tasks | Resolution |
|---|---|---|
| `.pi/plans/brain-atlas-yum.6-reproducible-asset-pipelines-plan.md` | 1, 6 | Task 6 verifies Task 1's approved amendment. |
| `tools/assets/SPEC.md` | 2, 5 | Task 5 synchronizes docs after Task 2 freezes behavior. |
| Research evidence files | 3, 4, 6 | Task 3 normalizes compact records; Task 4 records durable location; Task 6 verifies both. |

## Execution handoff

Plan saved to: `.pi/plans/brain-atlas-yum.6.1-dsi-nondeterminism-correction-plan.md`

Recommended next skill after approval: `test-driven-development`; use `verification-before-completion` before any completion claim.
