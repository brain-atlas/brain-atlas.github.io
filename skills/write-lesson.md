---
name: write-lesson
description: Design, author, validate, and retrospect on an evidence-based multimedia neuroscience lesson in the Brain Atlas.
---

# Write an Effective Brain Atlas Lesson

Use this workflow when creating or substantially revising a lesson. A successful
lesson changes what the learner can explain, predict, or do. Visual polish supports
that outcome; it is not the outcome.

## Non-negotiable principles

1. **Teach the subject, not the interface.** Do not narrate controls, transitions,
   renderer behavior, or platform features unless the learner must take an action that
   the interface cannot make self-evident. Keep technical implementation details out
   of curriculum prose.
2. **Learning goals determine media.** Use only the platform capabilities that make a
   target relationship, change, comparison, or causal process easier to understand.
   More animation, detail, or viewport coverage is not inherently better.
3. **One scene, one main inferential job.** A scene may contain supporting detail, but
   the learner should be able to state what the scene helped them understand.
4. **Make the learner think.** Use prediction, retrieval, self-explanation, comparison,
   and transfer. Watching and rereading are not sufficient learning activities.
5. **Manage complexity through sequencing.** Pretrain essential names and locations,
   segment the explanation, and reveal detail when it becomes relevant. Do not solve
   cognitive overload by making the science vague.
6. **Make beauty serve attention.** Composition, color, motion, and scale should signal
   the current teaching target. Beautiful stills and animation can make an idea
   memorable when they clarify rather than decorate. Use the available viewport
   purposefully, balancing rich visual context with distractor removal; intentional
   whitespace is not wasted space. Remove interesting but irrelevant details.
7. **Preserve scientific and representational honesty.** Distinguish biological claims,
   atlas-derived anatomy, schematic geometry, and illustrative activity. Never ask a
   visual to support an inference it cannot support.

## 1. Inspect the project before authoring

Read the applicable `AGENTS.md`, `src/lesson/SPEC.md`, `src/ui/SPEC.md`, scientific
traceability records, entity and fidelity catalogs, and the current reference tests.
Inspect the rendered lesson and learn the platform's full capabilities before choosing
how to teach. Use those capabilities deliberately rather than defaulting to the easiest
scene. Do not infer capabilities from desired prose or bypass a structured contract with
text parsing.

Identify separately:

- what the current visual can demonstrate;
- what it can provide only as orientation or context;
- what must be explained in prose;
- what it cannot responsibly claim; and
- what a learner must already know.

## 2. Define the learning contract

Write down the intended audience, prerequisites, estimated scope, and three to five
observable objectives. Prefer verbs such as *trace*, *distinguish*, *explain*,
*predict*, *compare*, *localize*, and *evaluate* over *know* or *understand*.

Design at least one transfer task before writing the lesson. It should require the
learner to use the central model in a new case, not repeat a sentence. The final lesson
must give enough evidence to determine whether each objective was met.

Upper-division or postgraduate depth comes from mechanistic reasoning, uncertainty,
and transfer—not from terminology density.

## 3. Build the lesson spine

Use the smallest sequence that supports the objectives:

1. **Orient and diagnose:** Pose a consequential question or case and elicit an initial
   prediction. State prerequisites and objectives succinctly.
2. **Pretrain:** Introduce only the components and distinctions needed to follow the
   mechanism.
3. **Explain the mechanism:** Move through learner-paced causal or spatial segments.
4. **Integrate:** Relate the parts as a system and contrast commonly confused ideas.
5. **Transfer:** Apply the model to a new case, lesion, observation, or experimental
   result.
6. **Retrieve and synthesize:** Ask the learner to reconstruct the model before showing
   a concise synthesis.

Historical context, biographies, current research, and real-life relevance are useful
when they explain how we know, motivate the problem, or support transfer. They are not
mandatory decorations. Put optional enrichment after the core explanation.

## 4. Author each scene deliberately

Before writing a scene, complete this brief:

```text
Learning job:
Learner action:
Visual change that supports the job:
Essential prose:
Likely misconception:
Feedback or check:
Representation limits that affect inference:
```

Then apply these rules:

- Change the camera, visibility, cutaway, emphasis, or motion only when the change
  carries instructional meaning.
- Place explanatory words close in time and conceptual location to the visual event
  they explain. Avoid split attention between unrelated regions of the screen.
- Signal the relevant structure with a restrained combination of framing, emphasis,
  contrast, and motion. Do not encode an essential distinction by color alone.
- Use animation for change, direction, timing, or causality. Prefer a stable view when
  the learner needs to inspect structure or compare locations.
- Keep narration and displayed text complementary rather than needlessly duplicative.
  Preserve displayed technical terms and full text alternatives where accessibility or
  precision requires them.
- Make learner pacing available for dense or transient explanations. Never make
  comprehension depend on catching one unrecoverable animation.
- State a model boundary at the point where a plausible but unsupported inference
  could arise. Do not repeat implementation disclaimers that add no new protection.

## 5. Create active learning and feedback

Across the lesson, include all four forms when the scope permits:

- **Prediction:** commit to an answer before the explanation or animation;
- **Retrieval:** reconstruct a prior step without rereading it;
- **Self-explanation:** explain why the observed organization follows from the model;
- **Transfer:** solve a novel case or predict the consequence of a change or lesion.

Provide concise corrective feedback. Explain why an answer follows from the mechanism
and, where useful, why the tempting alternative fails. Use cumulative checks so later
scenes retrieve earlier ideas rather than treating every scene as isolated.

If the platform cannot hide feedback or collect a response, write a clear pause prompt
followed by the answer. Record the limitation in the retrospective; do not pretend the
interaction occurred.

## 6. Control cognitive load without thinning the science

- Segment a long mechanism into meaningful learner-paced steps.
- Pretrain indispensable component names, locations, and representational conventions.
- Prefer progressive disclosure to an all-at-once overview.
- Remove decorative motion, anecdotes, labels, and facts that do not support an
  objective. Interesting but irrelevant material can impair organization and transfer.
- Avoid simultaneous prose, labels, and animation competing for the same visual
  channel. Let the learner inspect a stable state after a transition.
- Reuse a consistent visual and verbal mapping for the same entity or distinction.
- End sections with a compact causal statement, not a second full summary.

## 7. Verify science, sources, and fidelity

Maintain a claim-and-evidence inventory while researching. Prefer primary research,
systematic reviews, authoritative atlases, and stable public sources. Check that each
source supports the exact claim being made and that species, method, and population
limits are explicit.

Keep citations and provenance in the repository-approved location. Do not duplicate
technical source lists into lesson prose when curated fidelity or traceability records
own them. Offer public further-study resources only when the lesson contract permits
them and they add learning value.

For every scene, ask:

- Is the claim anatomical, physiological, functional, clinical, or historical?
- Is the visual data-derived, derived, mirrored, schematic, illustrative, or unknown?
- Does direction mean biological projection, tractography order, or display motion?
- Does the scene preserve relevant variability and uncertainty?
- What could a reasonable learner wrongly infer from this view?

Update scientific traceability and curated fidelity records atomically when a visual
claim or limitation changes.

## 8. Design for access and learner control

Meet the project accessibility contract and WCAG 2.2. In particular:

- provide equivalent text for meaningful non-text content;
- provide captions and a transcript for narration, and audio description or an
  equivalent text account when visual action carries meaning;
- preserve meaningful reading and focus order;
- make all actions keyboard-operable with visible focus;
- do not rely on color, position, sound, or motion alone;
- respect reduced-motion preferences and provide pause, replay, or stable alternatives;
- check contrast, reflow, zoom, touch targets, and narrow screens; and
- write prompts that do not require vision to infer an unlabeled spatial relationship.

## 9. Review and validate

Review the lesson in four separate passes:

1. **Scientific:** claims, terminology, causal logic, omissions, sources, and uncertainty.
2. **Pedagogical:** objective alignment, prerequisite load, segmentation, active checks,
   feedback, misconceptions, synthesis, and transfer.
3. **Presentation:** scene-to-prose alignment, signaling, stable inspection time,
   composition, motion, responsive behavior, and accessibility.
4. **Copy:** direct language, consistent terms, correct grammar, and removal of platform
   narration or repeated caveats.

Run the focused contract/content tests, full repository tests, publication build, and
the required browser matrix. Inspect every scene rather than treating a successful
parser or screenshot as evidence of learning quality. Keep draft status until the
project's explicit human review gate is satisfied.

## 10. Conduct the post-authoring retrospective

Run this retrospective after validation and before calling the lesson finished.

### Separate content defects from platform constraints

First record what should be fixed in the lesson itself. Do not request a feature to
compensate for weak objectives, excessive prose, poor sequencing, unsupported claims,
or avoidable scene design.

For each genuine platform constraint, capture:

- lesson and scene;
- learning objective and learner action affected;
- observed constraint, not just a proposed widget;
- current workaround;
- pedagogical or accessibility cost of the workaround;
- desired learner-visible outcome;
- a minimal acceptance example;
- relevant fidelity, accessibility, security, and performance constraints; and
- expected impact and how often the need will recur.

Rank candidates by learning impact, recurrence across lessons, lack of a safe workaround,
and implementation risk. Cosmetic preference alone is not a teaching requirement.

### Compare with GitHub before writing remotely

Search the repository's open and closed GitHub issues by the underlying learner need,
synonyms, and proposed capability. Read the full issue and discussion; title matching
alone is not deduplication.

- If an open issue already covers the need, add a comment only when the retrospective
  contributes new evidence: the concrete lesson, pedagogical cost, workaround, edge
  case, or acceptance criterion. Do not post a bare endorsement.
- If a closed issue covers it, determine whether the feature shipped, was declined, or
  became obsolete. Use the shipped feature, respect the recorded decision, or file a
  new issue only when materially new evidence changes the problem.
- If no issue covers a high-value need, create one framed around the learner problem.
  Include the retrospective evidence, smallest useful outcome, non-goals, and relevant
  accessibility and scientific-fidelity constraints. Link related issues.
- If no candidate clears that bar, record **No feature request warranted**. A
  retrospective is not required to produce backlog work.

Remote issue creation and comments change shared project state. Confirm that the
current task authorizes those writes; otherwise prepare issue/comment drafts and ask
for approval. After authorized writes, record the issue URLs in the lesson-review Bead
or closeout notes.

## Evidence base for this workflow

- Mayer & Chandler, learner-paced segmentation and part-before-whole sequencing
  ([2001](https://doi.org/10.1037/0022-0663.93.2.390)).
- Spanjers et al., segmentation and temporal cueing in animations
  ([2012](https://doi.org/10.1016/j.compedu.2011.12.024)).
- Schneider et al., signaling in multimedia learning: a meta-analysis
  ([2018](https://doi.org/10.1016/j.edurev.2017.11.001)).
- Ginns, spatial and temporal contiguity: a meta-analysis
  ([2006](https://doi.org/10.1016/j.learninstruc.2006.10.001)).
- Harp & Mayer, the cost of interesting but irrelevant “seductive details”
  ([1998](https://doi.org/10.1037/0022-0663.90.3.414)).
- Roediger & Karpicke, retrieval practice and delayed retention
  ([2006](https://doi.org/10.1111/j.1467-9280.2006.01693.x)).
- Chi et al., prompted self-explanation
  ([1994](https://doi.org/10.1207/s15516709cog1803_3)).
- Freeman et al., active learning in undergraduate STEM
  ([2014](https://doi.org/10.1073/pnas.1319030111)).
- W3C, [Web Content Accessibility Guidelines 2.2](https://www.w3.org/TR/WCAG22/).
