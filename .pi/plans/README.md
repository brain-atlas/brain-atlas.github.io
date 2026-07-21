# Design and implementation plans

Store substantial Beads-backed design and implementation plans here as
`.pi/plans/<bead-id>-<topic>.md`. A plan records intended future behavior and the
reasoning needed to implement it; it does not prove that the behavior exists.

## Artifact boundaries

- **Beads:** actionable work, live status, dependencies, decisions, approvals,
  blockers, and closeout evidence.
- **`docs/FUTURE_FEATURES.md`:** researched ideas that are not committed work.
- **`.pi/plans/`:** reviewable designs and execution guidance tied to a Bead.
- **`README.md` and user docs:** current shipped capabilities and limitations.
- **`docs/ARCHITECTURE.md` and `SPEC.md`:** current implemented architecture and
  subsystem contracts.

Beads are authoritative for whether work is ready, approved, blocked, or closed.
A plan may snapshot sequencing for readability, but it must link the Beads that
own live state. Plans cannot override `AGENTS.md` invariants. Resolve conflicts
through a recorded decision and update the governing documentation before
implementation.

## Plan header

Make the plan's state and authority unambiguous near the top:

- owning Bead or epic;
- status: **Draft**, **Approved**, **Implemented**, or **Superseded**;
- approval or decision Bead and date when approved;
- creation or latest material-amendment date;
- branch when relevant; and
- replacement link when superseded.

An approval record may establish approved status, but a draft must say that it
blocks implementation. Do not describe a plan as approved without durable human
approval in Beads.

## Lifecycle

1. **Draft:** Explore requirements, alternatives, risks, and open questions.
   Drafts may change during review and authorize no implementation.
2. **Approved:** Record the decision Bead, approval date, accepted scope, and any
   unresolved dependencies. Implementation proceeds only through accepted work
   Beads.
3. **Amended:** Correct minor wording directly. For a material change to user
   behavior, architecture, scientific representation, security/trust boundary,
   data provenance, acceptance criteria, or scope, record the amendment and
   renewed approval in Beads. Preserve or summarize the superseded rationale;
   do not silently rewrite the decision.
4. **Implemented:** Compare the result with the approved plan, record material
   deviations, update current/public documentation and citations, attach
   verification evidence to the Bead, and mark the plan implemented when useful
   for future readers.
5. **Superseded:** Mark the old plan clearly and link its replacement and decision.
   Keep it when it preserves useful rationale. Delete it only when it adds no
   unique evidence and Beads retain the decision history.

## Recommended contents

Scale the document to the work, but substantial plans should cover:

- goal, users, scope, and non-goals;
- decisions, alternatives, and unresolved questions;
- affected files, interfaces, data flow, and invariants;
- dependencies and migration or rollout order;
- acceptance criteria and verification;
- accessibility, security, performance, and scientific-fidelity impact where
  relevant; and
- documentation, provenance, citation, license, and notice impact.

A future-feature idea moves into Beads when someone chooses it for execution.
Create a plan only when the work needs durable design or multi-step guidance.
Before closing the owning Bead, update affected current documentation or record a
specific no-impact rationale; do not leave the plan as the only description of
shipped behavior.
