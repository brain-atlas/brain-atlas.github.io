# Responsive anatomical labels — design and execution

- **Bead / approval:** `brain-atlas-zmq.20`; user approved bounded solver in current session, recorded in Bead.
- **Status:** Implemented (final closeout evidence owned by Bead)
- **Date:** 2026-10-16
- **Branch:** main (current checkout explicitly approved)

## Goal and evidence

Keep the nine existing labels readable and associated with visible anatomy during orbit, zoom and resize. Wide baseline overlaps Meyer's loop/LGN(L); compact posterior view overlaps multiple labels. Owner/hemisphere filters currently leave stale annotations. Exact screenshots and audit limitations live in Bead notes.

## Chosen boundary

Retain nine authored anchors under existing `mniGroup` and existing Labels toggle. Add explicit stable owner/hemisphere bindings, not a new catalog or inferred text matching. Pure screen-space solver under `src/ui/`; projection, depth checks and existing CSS2D/SVG presentation in `src/main.js`. No new anatomical transform, canonical axis, schema, persistence, dependency or asset. Reference lesson/default label visibility stays unchanged. Existing dark technical label style remains; leaders are annotation strokes, not anatomical connections or activity direction.

Priorities: selected or transiently highlighted owner, emphasized owner, remaining labels; stable IDs break ties. Bounded candidate offsets minimize normalized overlap with already placed labels, projected anatomy/pathway bounds, viewport overflow and leader length; previous candidate receives hysteresis. Reject collisions/edge overflow if no candidate is usable, dropping lower-priority labels first. Nonfinite, offscreen, behind-camera, near/far-clipped and hidden-owner anchors are ineligible. Only effectively opaque geometry occludes: translucent cortical/region shells intentionally remain see-through. Ignore own geometry for occlusion. Preserve semantic text equivalents independent of crowding; no live announcements on orbit.

Update expensive placement/occlusion only when camera, viewport, owner eligibility, selection, opacity/geometry or label measurements change, at most 20Hz with one trailing invalidation. Cheap anchor/leader projection follows rendered frames. No relation to activity-event count. Cache static geometry bounds. Record measured browser timing rather than claiming a universal hardware budget.

## Alternatives rejected

- Fixed nudges: cannot handle projection changes and filters.
- Label every atlas entity: unrelated inventory/teaching work; not needed for nine-label regression.
- Treat transparent cortex as opaque: would suppress internal teaching landmarks.

## Ordered implementation and checks

1. Add `test/label-layout.test.js` first: deterministic collision-free bounded assignment, priority, hysteresis, occupancy cost, clipping/invalid input, crowded fallback, leader endpoints. Run `node --test test/label-layout.test.js` red then green. Add pure `src/ui/label-layout.js`.
2. Bind existing `src/pathways.js` labels to owners; integrate projection/visibility/opaque occlusion, cached occupancy, leaders and scheduling in `src/main.js`; small `src/style.css` additions. Write browser regression first in `scripts/browser/home-labels.spec.cjs` using existing harness. No CSS2D competing transform or renderer adapter.
3. Verify wide/compact camera rotation/zoom, hiding owners/hemispheres, behind-camera and opaque occlusion, selected priority, stable idle/activity-only layout counts, 20Hz cap, accessible text and label-toggle persistence. Recheck lesson defaults, reduced motion, one canvas and transform.
4. Update README, architecture, UI SPEC and browser/operator guide for landed behavior and limitations. No new scientific/source/data-license claim; anchor geometry stays unchanged.
5. Run `npm test`, `npm run build:publish`, focused and existing workspace/persistence/reconciliation/power browser suites. Capture wide/compact screenshots, review diff, commit only task files, record evidence and deviations in Bead, then direct-closeout and handoff.

## Acceptance

Deterministic bounded solver; visible labels follow actual owner/hemisphere/frustum/depth; stable readable leader association; no settled/activity-only repeated layout; no persistence/schema/default drift; browser evidence for responsive behavior and measured overhead. Dense or tiny views may omit labels; semantic alternatives remain available. Projected bounds are conservative occupancy, not pixel-perfect GPU occlusion.

## Implementation comparison

Approved scope retained; no material deviation or replaced design. Solver uses 32 candidates, hard collision/edge constraints and documented occupancy/length/clamp/hysteresis cost. Schematic anterior markers intentionally retain the existing hemisphere-independent owner visibility; the two OR anchors remain left-only. Review found missing late-cortex invalidation and transient between-solve collisions; both were reproduced by failing Chromium tests then repaired with geometry revisions and fixed screen rectangles between solves. Fresh independent review verified both fixes. Seven pure tests and nine focused browser tests pass; final full-suite/build and visual evidence are recorded in `brain-atlas-zmq.20` rather than duplicated here. Current README/architecture/UI SPEC/traceability and operator/browser docs replace the old pending-placement wording. No new geometry, scientific citation, asset license, dependency, security or persistent-format change.
