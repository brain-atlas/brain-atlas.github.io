# Spatial Lessons UX and UI Specification

**Issue:** `brain-atlas-zmq.15` — Approve lesson UX, responsive UI, and behavior scenarios

**Parent:** `brain-atlas-zmq` — Define UX goals and interaction roadmap

**Date:** 2026-07-21

**Status:** Approved implementation-facing UX/UI baseline

**Approval:** `brain-atlas-6nn`; Atlas/Home amendment `brain-atlas-56i`; lesson-derived handoff/Exit amendment `brain-atlas-ai4`

**Fidelity disclosure:** `.pi/plans/brain-atlas-yum.3-model-fidelity-disclosure.md`

## 1. Purpose

This specification translates the product requirements in `.pi/plans/brain-atlas-zmq-ux-requirements-roadmap.md` into an implementation-facing experience contract. It defines what learners see, how the interface responds, and how wide, compact, keyboard, pointer, touch, reduced-motion, and no-WebGL paths remain capability-equivalent.

It does not define final pixel values, a component framework, renderer internals, or anatomical content. Those remain implementation and content concerns within the roadmap's invariants.

## 2. Experience and visual direction

The interface should feel like an **editorial scientific instrument**: editorial enough for sustained reading, technical enough to support precise spatial inspection, and restrained enough that interface chrome does not compete with anatomy.

- Long-form prose and the active anatomical relationship are the primary hierarchy.
- The visual stage uses the project's dark, cool foundation; reading surfaces prioritize text contrast and comfortable line length.
- Teal remains the primary interaction accent. Anatomical colors communicate represented structures or signals, not decoration.
- Borders and surface shifts establish depth; avoid a stack of floating glass panels over lesson prose.
- Motion explains state changes or biological models. It is never required to understand the settled scene.
- Scientific status remains quiet but always reachable through **Model & sources**.

## 3. Core journeys

### 3.1 Complete the reference lesson

1. Open the app in the full exploratory Atlas and use **Lessons** to inspect available guided paths.
2. Start or resume a lesson, then read a scene while the shared stage shows its authored spatial state.
3. Move by vertical reading or explicit Previous/Next controls.
4. Restart or skip only the active scene's optional animation; neither action changes the lesson position.
5. Reach the lesson end with the option to revisit scenes or enter Explore.

### 3.2 Inspect without losing place

1. Activate an entity by pointer, keyboard, or touch.
2. Receive the same highlight and short label regardless of input modality.
3. Explicitly open cited details without replacing the lesson or moving the scene anchor.
4. Close details and return focus to the activating control/entity.

### 3.3 Explore and return

1. Activate **Explore this scene**.
2. Enter the top-level Atlas in a temporary scene-derived state with full controls.
3. Change the camera, filters, or playback without mutating the authored lesson snapshot.
4. Activate **Return to lesson**.
5. Restore the exact authored scene and return focus to **Explore this scene**.

### 3.4 Import an agent-authored lesson

1. Paste Markdown or choose a local `.md` file.
2. Validate before replacing the active lesson.
3. On success, show a lesson summary and explicit **Open lesson** action.
4. On failure, preserve the current lesson and report actionable line/field errors.
5. Permit correction or replacement without losing the source text.

## 4. Interface anatomy

| Surface | Requirement |
|---|---|
| App header | Identifies Atlas or Lesson, exposes Lessons/import, and provides reciprocal **Back to atlas** / **Return to lesson** navigation without dominating either surface. |
| Lesson prose | Uses semantic headings and scene sections. The active scene is clear without fading inactive prose below readable contrast. |
| Visual stage | Hosts the single shared WebGL canvas or its settled fallback. It exposes a concise scene title and never traps page scrolling. |
| Visual selector | Shows the atlas first and declared supplementary visuals in authored order. Selection is explicit and keyboard/touch operable. |
| Scene navigation | Provides Previous, Next, Restart scene, and Skip animation only when those actions apply. Disabled actions state why. |
| Control-policy cue | Communicates `guided`, `look`, or `explore` before a learner attempts a disallowed manipulation. |
| Model & sources | Implements the approved progressive-disclosure contract in `.pi/plans/brain-atlas-yum.3-model-fidelity-disclosure.md`: separate geometry/activity statuses plus one-step methods, assumptions, uncertainty, material limitations, sources, and licenses without losing scene context. |
| Entity preview | Provides highlight plus short label on hover/focus or first touch selection. It contains no citation-length content. |
| Details inspector | Is nonmodal on wide layouts and a focus-managed sheet on compact layouts. It preserves the active scene. |
| Import/validation | Separates editing, validation results, and the action that replaces the active lesson. |
| Fallback content | Retains prose, scene summaries, supplementary-image alternatives, captions, sources, and navigation when WebGL is unavailable. |

### 4.1 Scientific disclosure contract

- Keep one quiet, persistent **Model & sources** control beside the active visual or
  fallback; do not bury it in settings.
- Show geometry and activity as separate text statuses. Mixed representations may
  combine **Data-derived**, **Derived**, **Mirrored**, **Modeled**, **Schematic**,
  **Illustrative**, and **Display-only** terms, but never collapse them into one trust
  score or badge.
- Lesson scenes reference curated fidelity records. They may add one short contextual
  note when a representation first matters, but they do not redefine provenance,
  assumptions, or citations.
- The detailed wide panel or compact focus-managed sheet preserves scene, camera,
  filters, playback, and lesson position; closing restores focus to its invoker.
- Apply the approved materiality rule before showing known limitations. Internal work
  IDs and harmless engineering details remain out of learner-facing copy.
- Unknown records and incompatible versions fail import validation. Reduced-motion and
  no-WebGL paths expose the same statuses, limitations, and sources.

The taxonomy, record semantics, state table, materiality test, copy order, and
behavior scenarios are normative by reference to the fidelity-disclosure plan.

## 5. Responsive layout contract

These are structural requirements, not fixed breakpoints. The layout should respond to available space and zoom rather than infer capability from a device name.

### Wide layout

```text
┌──────────────────── app / lesson context ─────────────────────┐
│ lesson prose + scene anchors │ visual rail │ sticky stage      │
│                              │             │ scene status      │
│ active scene copy            │             │ model & sources   │
│ Previous / Next              │             │ scene controls    │
└───────────────────────────────────────────────────────────────┘
```

- Prose and stage remain visible together at normal reading zoom.
- The stage is sticky within the lesson region, not fixed over the document.
- A side inspector may share the visual column only when it leaves the stage and text usable.
- Text line length remains suitable for sustained reading; spare width belongs to the visual, not longer lines.

### Compact layout

```text
┌──────── app / lesson context ────────┐
│ visual stage or settled fallback     │
│ compact visual selector              │
│ scene status · Model & sources       │
├──────────────────────────────────────┤
│ active scene prose                   │
│ Previous · Restart/Skip · Next       │
└──────────────────────────────────────┘
```

- The stage may be compact-sticky only while enough viewport remains for readable prose and browser controls; otherwise it participates in normal flow.
- Atlas is the full-screen product Home. Every lesson-origin Atlas action uses that same surface from the actual lesson view, with compact **Return to lesson** and **Exit lesson** actions. On the narrowest header, general lesson-entry actions yield until Return/Exit so active-session controls never overlap.
- Entity details use a bottom sheet or full-screen inspector with focus containment and restoration.
- No horizontal page scrolling, scroll trapping, overlapping fixed panels, or canvas gesture capture while the learner scrolls the lesson.

## 6. Interaction and state requirements

### Scene activation

- One scene is active at a time.
- A scene activates only after its anchor crosses the declared threshold and hysteresis condition.
- Small reverse scrolls inside the dwell zone do not change scenes or restart motion.
- Previous and Next move to the same anchors used by scrolling.
- Re-entry reapplies the full authored snapshot before optional scene motion resumes.

### Visual and animation state

- Changing the supplementary visual does not change the semantic scene unless the author declared a different scene.
- Restart returns the active animation to its authored initial state.
- Skip applies its authored settled state; it does not increase speed.
- Play/pause affects modeled activity, not camera transition completion or page navigation.
- Reduced motion applies settled camera and activity states immediately.

### Input parity

- Hover and keyboard focus expose the same preview.
- First touch selects and previews; explicit activation opens details.
- Canvas interaction starts only from a deliberate gesture when the policy allows it.
- Every nonspatial action has a semantic DOM control and visible focus treatment.
- Closing a pop-out, sheet, or inspector returns focus to its invoker.

## 7. Required interface states

| State | Required presentation and recovery |
|---|---|
| Initial/loading | Readable lesson identity and progress indication; no empty black stage presented as finished content. |
| Ready | Active scene, navigation position, control policy, and model status are perceivable. |
| Transitioning | Controls remain predictable; repeated navigation resolves to one deterministic target. |
| Paused | The pause state is labelled; scene navigation and inspection remain available. |
| Reduced motion | Settled camera/activity state appears without an intermediate animation. |
| Atlas / lesson-derived view | Atlas identity plus compact Return/Exit are persistent and unambiguous while a resumable lesson exists. Return is exact; Exit resets default Home. |
| Validation error | Source text and current lesson are preserved; errors identify line/field and correction. |
| External image failure | Reserved layout remains stable; alt text, caption, credit, and source link remain usable. |
| WebGL unavailable | Prose, scene summaries, media alternatives, sources, and lesson navigation remain usable. |
| Unsupported lesson version | No partial activation; explain the supported versions and how to recover. |
| Fidelity record unavailable | State that status is unavailable; never substitute a reassuring default. Preserve lesson prose and scene context while exposing recovery or diagnostics. |

## 8. Accessibility requirements

- Semantic landmarks identify app context, lesson, active visual, scene navigation, and inspector.
- Scene changes announce the new scene title without moving focus during ordinary scrolling.
- Explicit Previous/Next navigation moves focus to the destination scene heading after scrolling settles.
- Canvas entities exposed for selection have equivalent DOM-backed names/actions; raw canvas hit targets are not the sole access path.
- Status, anatomy, and active selection never rely on color alone.
- Text and controls remain usable at 200% zoom and with increased text spacing.
- Touch targets are large enough for reliable activation and do not overlap.
- Reduced-motion, no-WebGL, failed-image, and keyboard-only paths retain the lesson's learning content.

## 9. BDD and verification decision

BDD is useful here as a **requirements notation for deterministic, user-observable behavior**, not as the sole QA method and not as a reason to add Cucumber or another runner.

Use Given/When/Then scenarios for:

- scene activation, hysteresis, re-entry, restart, and skip;
- import validation and non-destructive failure;
- Explore/Return state restoration;
- pointer, keyboard, and touch capability parity;
- reduced-motion and no-WebGL behavior;
- inspector focus management and external-image failure.

Do not use BDD to judge visual hierarchy, anatomical legibility, responsive composition, motion quality, or GPU performance. Verify those with annotated wide/compact wireframes, browser screenshots at a small device/zoom matrix, console checks, performance measurements, and human visual review.

Scenarios begin in this specification. Stable behavior should later map to ordinary unit or browser tests; scenario text and automated tests must not become duplicate sources of truth. The mixed-status, keyboard/focus, unknown-fidelity-ID, and no-WebGL disclosure scenarios in `.pi/plans/brain-atlas-yum.3-model-fidelity-disclosure.md` are part of this baseline by reference.

### Scenario: Return from free exploration

```gherkin
Given scene "chiasm" is active with its authored camera, filters, and playback state
When the learner opens Explore and changes the camera and visible layers
And the learner activates "Return to lesson"
Then the complete authored "chiasm" snapshot is restored
And focus returns to "Explore this scene"
```

### Scenario: End a lesson without ambiguous resume state

```gherkin
Given a checked lesson has a resumable token
And Atlas is showing that lesson's actual camera and filters
When the learner activates "Exit lesson"
Then Return and Exit are removed
And the checked lesson no longer offers Resume
And the authored complete default Atlas is applied
And focus moves to the Atlas destination
```

For a memory-only local lesson, insert an explicit Keep/Exit confirmation before the
state changes; Escape and Keep preserve the token and return focus to Exit.

### Scenario: Reject an invalid import without data loss

```gherkin
Given a valid lesson is active
And the import editor contains an unknown entity ID on line 18
When the learner validates the imported Markdown
Then the active lesson and scene remain unchanged
And the source text remains in the editor
And an error identifies line 18 and the unknown entity field
```

### Scenario: Reduced motion scene entry

```gherkin
Given reduced motion is enabled
When a scene with a camera transition and modeled activity becomes active
Then the settled camera state is applied immediately
And automatic activity does not begin
And all explanatory prose and controls remain available
```

### Scenario: Touch entity disclosure

```gherkin
Given an atlas entity is available in the active scene on a touch interface
When the learner taps the entity once
Then the entity is selected and its short label is shown
When the learner explicitly activates the selected entity
Then cited details open without changing the lesson scene
```

### Scenario: Failed supplementary image

```gherkin
Given the active scene declares an HTTPS supplementary image with complete alternative metadata
When the image cannot be loaded
Then the visual region keeps its reserved dimensions
And the alt text, caption, credit, and source link remain available
And the learner can switch back to the atlas
```

## 10. Approval and change control

Human approval `brain-atlas-6nn` covers this specification's wide and compact
structures and the integrated progressive fidelity-disclosure design. Approval
`brain-atlas-56i` amends the top-level shell: Atlas is Home, Lessons open from a
responsive drawer, and one resumable Lesson context uses reciprocal Atlas navigation.

- Child Beads cite the relevant journeys, surfaces, states, scenarios, and fidelity
  contract rather than inventing interaction behavior.
- Any newly discovered material interaction decision becomes a Beads-backed blocker
  or approved amendment.
- Low-fidelity visual exploration may refine composition, but it may not weaken the
  roadmap's accessibility, fidelity, security, or one-transform constraints.
- Approval authorizes contract and implementation planning; it does not freeze final
  pixel values or waive per-Bead code, test, visual-review, and documentation gates.
