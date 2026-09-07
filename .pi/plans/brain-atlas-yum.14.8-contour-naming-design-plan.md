# Short-range contour presentation

- Bead: `brain-atlas-yum.14.8`
- Status: **Implemented**; human presentation approval `brain-atlas-iof0`, 2026-09-07.
  Closeout and final verification authority: owning Bead.
- Date: 2026-09-07
- Branch: existing `main`; no branch, remote, or deployment operations authorized.

## Design and inventory

Use **Short-range tractography contours**, compact **Short-range contours**.
Retaining “Superficial” with caveats was rejected: the headline still implies an
unvalidated anatomical identity. Historical SWM names remain in stable IDs,
filenames, source records, and explicit historical descriptions only.

| Surface | Existing claim | Change |
|---|---|---|
| `public/data/entities.json` entity and inspectable | Superficial white matter / Superficial WM | Neutral full/compact labels; describe broad sample and non-certification |
| `public/data/fidelity.json` | Real short contours, cortical ribbon | Whole-volume historical GM/WM selection; material source-screening limits; retain activity/template/replay limits |
| `src/main.js` | Superficial fibres; grain just under cortex | Compact label and accurate comments, no renderer logic changes |
| `src/fibre-endpoint-filter.js` | Match counts called superficial | Short-range contours in existing accessible summary |
| `src/lessons/retina-to-v1.md` | Superficial contours/dots | Neutral prose and explicit selection-versus-validation boundary; scene fences unchanged |
| `README.md`, `DATA_LICENSES.md`, `docs/SCIENTIFIC_TRACEABILITY.md`, `docs/TRACT_SPACE_PROVENANCE.md`, `docs/TRACT_REGION_MAPPING.md`, `docs/lessons/retina-to-v1-validation.md` | Current/historical SWM terminology mixed | Update current representation and retain historical derivation and evidence limits |
| `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/SECURITY_REVIEW.md`, `skills/user.md`, nearest SPEC | Current contributor/operator terminology | Align naming without weakening single-transform, undirected activity, or frozen-asset rules |
| Existing catalog, reference-lesson, endpoint-summary and browser tests | Old wording | Neutral labels, material disclosure, stable IDs and unchanged scene/query/geometry behavior |

Disclosure: broad sample of short bilateral tractography contours. Historical
selection used whole-volume GM/WM maps without a cerebral-only exclusion; it does
not certify superficial white matter or U-fibre identity. Coarse source-map
screening is not anatomical validation. Endpoint labels indicate geometric
proximity, not biological connections. Source: existing verified
`docs/TRACT_SPACE_PROVENANCE.md#swm-source-compartment-screening` and linked audit.
Do not promote source255 to independently validated cerebellar or midbrain anatomy.
Do not add new external scientific claims or change source/license records.

## Boundary and compatibility

No geometry, renderer/data IDs, schemas, presets, filters, camera, activity,
transforms, dependencies, or redistributed source maps change. Preserve existing
canonical parser/presentation/renderer path. No new abstraction or alias layer.

Pre-existing provenance issue: endpoint manifest pins `entities.json` to 74,121
bytes / `56c32db37cdae116e8e0947008a4f938aca3d0d9cffa8bbc96c7eba4b5be1480`;
pre-edit HEAD has 75,271 bytes / `ad78554a8a3b82d6b73dd0dabdf405289e43f8c1ec0e2c304ecf9642bcf4dec9`
(last catalog change `6744c89`). Preserve those historical generator pins and frozen
endpoint artifact; do not falsely claim regeneration from current catalog bytes.
Public provenance docs must distinguish runtime copy from historical pinned input.

## Execution and verification

1. Add focused neutral-label/material-disclosure regression in existing mapping
   tests; update expected summary/lesson wording; observe RED before runtime edits.
2. Reconcile contributor/core/lesson evidence wording first, then catalog, renderer
   label, summary, and lesson prose together. Preserve source citations and license terms.
3. Run focused tests, `npm test`, `npm run build:publish`, `git diff --check`.
   Compare parsed scene snapshots against HEAD; verify geometry/filter/activity
   files byte-unchanged and entity/catalog changes limited to presentation.
4. Browser-check wide/compact Atlas controls, anatomy inspection, Model & sources,
   lesson prose and no-WebGL accessibility; capture screenshots, inspect console
   errors and overflow. Run existing endpoint browser checks where harness available.
5. Independent diff review; record docs/citation/license/security no-impact limits,
   evidence and deviations in Bead; local task-owned commit then direct closeout.

Unrelated untracked right-OR research and two input ZIP archives remain untouched.
Existing historical plans/evidence are not rewritten; this design supersedes their
current-public naming only, not their methods, approval history, or scientific claims.

## Implementation reconciliation

No material scope deviation. Browser inspection found entry-scene prose is not
rendered; the opening disclosure therefore lives in the visible introduction, with
a regression assertion on `introductionMarkdown`. Closing-scene disclosure remains.
No parser/renderer change was needed. Independent review found one missed current
architecture label, corrected before closeout. All nine parsed snapshots match HEAD;
geometry, endpoint/preset/activity assets and historical manifest pins are byte-stable.

Browser proof covers wide controls/inspector, compact modal wrapping, shared fidelity,
visible lesson introduction, no-WebGL (zero renderer resources/canvases), production
hook removal, keyboard expansion/focus restoration, and development 794→2002→794
filter/Return behavior. The standalone external Playwright suite was not run: its
expected temporary harness was absent. Host-browser checks and pure tests supply
this presentation change's verification, not a full release/device matrix.

Current docs and lesson validation are updated together. No new external citation,
license term, source-map redistribution, geometry derivation, dependency/notice,
software citation identity, security mechanism or release/deployment behavior changes.
Existing primary-source references and private screening evidence remain authoritative.
See the Bead for exact commands, proof paths, review artifact, and final gate results.
