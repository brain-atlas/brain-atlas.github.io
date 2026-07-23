# Draft Specification: Behavior-Driven White-Matter Activity Visualization

**Issue:** `brain-atlas-zmq.22` — Design behavior-driven white-matter activity episodes  
**Status:** **Draft — not approved and does not authorize implementation**  
**Version:** 0.1  
**Origin:** User-provided conceptual design, relocated from the repository root on 2026-07-21  
**Dependencies:** `brain-atlas-yum.9`, `brain-atlas-yum.10`, `brain-atlas-zmq.21`  
**Purpose:** Define a scientifically constrained system for animating activity and effective directionality through human white-matter pathways as part of behavioral and narrative sequences.

> **Evidence gate:** Numerical values, literature claims, candidate pathway mappings,
> and behavioral interpretations in this draft are hypotheses or leads until the owning
> Bead verifies them at primary sources and classifies their scope. This document does
> not override `AGENTS.md`, `docs/SCIENTIFIC_TRACEABILITY.md`, the disclosed resting
> association-tract 50/50 fallback, or the requirement for separate approval before a
> runtime model changes.

---

## 1. Objective

The visualization shall depict plausible large-scale neural communication associated with recognizable behavioral states and events, including:

* awake rest;
* natural scene viewing;
* visual search and object recognition;
* attention and imagery;
* language perception and production;
* voluntary movement;
* sleep onset;
* NREM sleep;
* REM sleep;
* transitions between these states.

The system shall translate each behavior into a sequence of intermediate neural processes and then into tract-level activity primitives.

The principal processing hierarchy shall be:

[
\text{Behavior}
\rightarrow
\text{Behavioral phase}
\rightarrow
\text{Network motif}
\rightarrow
\text{Directed regional interaction}
\rightarrow
\text{Tract activity primitive}
\rightarrow
\text{Rendered event}
]

The visualization is not intended to reconstruct individual axons or claim that a specific percentage of fibers is active in either direction.

---

## 2. Scientific interpretation

### 2.1 What the visualization represents

A rendered tract event represents an inferred change in communication between two or more neural populations whose anatomical connection is plausibly carried by that tract.

It may encode:

* transient propagation;
* effective directional influence;
* event density;
* temporal coordination;
* burst probability;
* propagation delay;
* frequency-specific coupling;
* recurrent communication;
* confidence in the inference.

It shall not be labeled simply as “neural activity” without specifying which of these meanings is intended.

### 2.2 What it does not represent

The visualization shall not imply:

* direct observation of individual axonal spikes;
* a measured anatomical percentage of fibers pointing in each direction;
* uniform activation of an entire named tract;
* equivalence between fMRI BOLD amplitude and axonal firing rate;
* that functional connectivity is necessarily direct or causal;
* that negative functional connectivity means inhibitory impulses moving through a tract;
* that a behavioral state has one deterministic neural sequence.

### 2.3 Empirical constraints

Human cortico-cortical evoked-potential data provide the strongest available basis for directed propagation, connection probability, and approximate transmission delay. The F-TRACT delay atlas was derived from 780 epilepsy patients and more than 770,000 evoked responses. Its modeled interregional axonal delays had a median of approximately 10.2 ms in older subjects, with only 16% exceeding 20 ms. These values may anchor propagation timing but shall not be interpreted as normative measurements from healthy individuals at rest.

Human EEG, MEG, intracranial EEG, and stimulation data shall be used to constrain temporal ordering and oscillatory structure. fMRI may constrain regional and network participation over longer timescales but shall not directly determine particle density or millisecond propagation.

---

## 3. System architecture

The system shall contain six layers.

| Layer                     | Responsibility                                       | Output                                   |
| ------------------------- | ---------------------------------------------------- | ---------------------------------------- |
| 1. Anatomical substrate   | Defines regions, tract geometry and candidate routes | Undirected anatomical paths              |
| 2. Directed channel       | Defines source–target regional interactions          | Directed edges routed through tracts     |
| 3. Activity primitive     | Describes elementary temporal activity               | Volleys, bursts, gain changes, waves     |
| 4. Network motif          | Combines edges into a functional operation           | Feedforward sweep, feedback loop, replay |
| 5. Behavioral episode     | Organizes motifs around observable behavior          | Ordered and overlapping phases           |
| 6. Narrative presentation | Controls time compression, camera and explanation    | Viewer-facing animation                  |

Each higher layer shall be decomposable into the layer below it.

---

## 4. Anatomical substrate layer

### 4.1 Regional representation

The system shall use a cortical and subcortical parcellation that is sufficiently detailed to distinguish the major endpoints of each tract.

Candidate structures include:

* early and extrastriate visual cortex;
* ventral temporal visual regions;
* superior and middle temporal cortex;
* inferior parietal cortex;
* superior parietal cortex;
* inferior frontal cortex;
* dorsolateral prefrontal cortex;
* medial prefrontal cortex;
* posterior cingulate and precuneus;
* primary and premotor cortex;
* thalamic nuclei;
* hippocampus and parahippocampal cortex;
* amygdala;
* basal ganglia;
* cerebellum.

A named tract shall not be treated as one indivisible edge. It shall contain multiple channels defined by endpoint pairs.

### 4.2 Initial tract inventory

The initial system should include:

* inferior longitudinal fasciculus, or ILF;
* inferior fronto-occipital fasciculus, or IFOF;
* vertical occipital fasciculus, or VOF;
* superior longitudinal fasciculus I–III;
* arcuate fasciculus;
* middle longitudinal fasciculus, or MdLF;
* uncinate fasciculus;
* cingulum;
* fornix;
* frontal aslant tract;
* optic radiations;
* thalamocortical radiations;
* corpus callosum;
* corticospinal and corticobulbar tracts;
* cerebellar peduncles.

The additional pathways are necessary because sleep, memory, sensory input and action cannot be represented adequately using association fascicles alone.

---

## 5. Directed-channel layer

A directed channel shall represent communication from source region (i) to target region (j), optionally routed through tract (T):

[
C_{ij}^{T}.
]

Each channel shall store:

* source region;
* target region;
* candidate tract or tract segment;
* anatomical confidence;
* effective-connectivity confidence;
* baseline gain;
* current gain;
* conduction-delay distribution;
* propagation dispersion;
* active frequency components;
* behavioral conditions that modulate the channel.

Reciprocal interactions shall be represented as two independent channels:

[
C_{ij}^{T} \neq C_{ji}^{T}.
]

The two directions may differ in gain, latency, synchrony and supporting evidence.

---

## 6. Activity primitives

### 6.1 Background traffic

Represents ongoing irregular communication in the absence of a discrete event.

**Rendering:**

* low-density bidirectional motion;
* irregular timing;
* local clustering;
* slowly changing gain;
* limited synchronization.

Background traffic shall never be rendered as complete silence.

### 6.2 Evoked volley

Represents a transient population response following an external or internal event.

Examples include:

* image onset;
* sound onset;
* eye fixation;
* recognition;
* movement initiation;
* memory reactivation.

**Rendering:**

* compact propagating packet;
* defined source and target;
* finite duration;
* increasing dispersion with distance;
* optional weaker secondary volleys.

### 6.3 Directional-gain modulation

Represents a temporary imbalance in effective influence.

[
G_{ij}(t) > G_{ji}(t)
]

does not imply that more physical axons point from (i) to (j). It indicates that communication in that direction is currently more effective.

**Rendering:**

* directional particle density;
* opacity;
* stream width;
* event probability.

Direction shall not be encoded solely by color.

### 6.4 Recurrent exchange

Represents repeated or simultaneous communication in both directions.

**Rendering:**

* overlapping counterpropagating packets;
* a strong initial direction followed by delayed counterflow;
* repeated cycles with diminishing or state-dependent amplitude.

### 6.5 Burst

Represents a short interval with a high probability of coordinated events.

**Rendering:**

* clustered packets;
* abrupt onset;
* finite envelope;
* variable within-burst cadence.

### 6.6 Synchronization or coherence

Represents improved temporal alignment among communicating populations.

**Rendering:**

* more regular pulse spacing;
* phase alignment across related channels;
* coherent modulation of multiple tract segments;
* increased endpoint coordination.

It shall not automatically increase the number of particles.

### 6.7 Oscillatory routing

Represents communication organized around a frequency band.

For hierarchical visual processing, faster gamma-range interactions may be used as a feedforward-associated visual convention, while slower alpha/beta modulation may be used for feedback-associated interaction. This convention shall be restricted to networks where frequency-specific directional evidence exists and shall not be generalized automatically to every tract.

### 6.8 Traveling cortical wave

Represents a wave of excitability or reduced excitability moving over the cortical surface.

The cortical wave shall modulate tract traffic as it reaches connected regions but shall not itself be rendered as a packet moving inside one white-matter tract.

### 6.9 Endpoint facilitation or suppression

Represents the effect of incoming activity on a target population.

**Rendering:**

* endpoint illumination;
* gain change;
* altered local pulse generation;
* reduced or increased responsiveness.

Suppression shall not be rendered as a “negative action potential” traveling backward.

### 6.10 Replay sequence

Represents temporally compressed reactivation of a previously encoded regional sequence.

**Rendering:**

* a recognizable sequence of channels;
* faster timing than the original behavior;
* optional forward or reverse ordering;
* nesting within a sleep or rest event.

Replay shall be labeled as inferential unless derived from a specific recording dataset.

---

## 7. Network motifs

Activity primitives shall be assembled into reusable network motifs.

### 7.1 Feedforward sweep

A rapid progression from lower-level sensory regions toward higher-order regions.

Typical structure:

1. sensory afferent volley;
2. early cortical response;
3. divergence into parallel processing streams;
4. arrival at higher-order association regions.

### 7.2 Feedback sweep

A progression from higher-order association or control regions toward lower-level regions.

Typical functions include:

* prediction;
* attention;
* contextual modulation;
* imagery;
* error correction.

### 7.3 Recurrent interpretation loop

A feedforward sweep followed by repeated feedback and lateral exchange.

This shall be the default motif for object recognition and complex scene interpretation rather than a single one-way cascade. Human studies of scene processing support early posterior activity followed by later frontal and recurrent contributions; one EEG study found informative occipital responses from approximately 80 ms and later frontal contributions beginning around 200 ms.

### 7.4 Orienting loop

Combines:

* sensory-change detection;
* salience-network recruitment;
* eye or head movement planning;
* motor execution;
* renewed sensory sampling.

### 7.5 Evidence-accumulation loop

Combines repeated sensory input with frontoparietal integration until a decision threshold is reached.

### 7.6 Sensorimotor loop

Combines:

* sensory state estimate;
* parietal transformation;
* premotor preparation;
* motor command;
* ascending sensory feedback;
* corrective command.

### 7.7 Hippocampal–cortical replay motif

Combines:

* cortical slow activity;
* thalamocortical spindle activity;
* hippocampal ripple activity;
* bidirectional prefrontal–hippocampal interaction;
* subsequent cortical propagation.

Human intracranial recordings support temporally precise, bidirectional prefrontal–hippocampal interactions during NREM sleep, coordinated with slow oscillations, spindles and hippocampal ripples.

---

## 8. Behavioral episode layer

### 8.1 Behavioral episode definition

A behavioral episode shall describe an externally recognizable state or event.

Each episode shall include:

```text
BehaviorEpisode
    id
    label
    nominal_duration
    arousal_state
    sensory_context
    motor_context
    task_context
    latent_modulators
    ordered_phases
    transition_rules
    stochastic_variants
    evidence_confidence
```

### 8.2 Observable and latent inputs

Observable inputs may include:

* eyes open or closed;
* scene appearance;
* fixation location;
* saccade onset;
* sound onset;
* speech onset;
* hand movement;
* body movement;
* sleep stage;
* external stimulation.

Latent modulators may include:

* attention;
* expectation;
* familiarity;
* emotional salience;
* task demand;
* memory demand;
* fatigue;
* arousal;
* uncertainty.

Latent variables shall affect probabilities and gains rather than produce a single guaranteed sequence.

### 8.3 Behavioral decomposition

Each episode shall contain phases:

```text
Behavioral phase
    nominal onset
    duration range
    observable trigger
    active network motifs
    regional participants
    tract channels
    activity primitives
    transition probability
    confidence
```

Phases may overlap. A later cognitive phase does not require an earlier sensory phase to stop.

---

## 9. Initial behavioral presets

## 9.1 Awake rest, eyes open

### Narrative description

The subject is awake, not performing an explicit task, and visually samples the environment without a defined goal.

### Expected organization

* irregular bidirectional background traffic;
* transient coactivation of resting-state networks;
* occasional large-scale propagating patterns;
* spontaneous transitions among default-mode, attention, salience, sensory and motor configurations;
* small sensory volleys associated with fixation changes and environmental events;
* no stable global direction.

Resting activity should be modeled as recurring transient events embedded in continuous background dynamics rather than as a stationary low-amplitude version of task activity. Human resting EEG and MEG studies report recurring fast coactivation patterns and whole-brain propagating activity, while fMRI captures slower coordinated fluctuations.

### Default primitives

* background traffic;
* low-amplitude traveling waves;
* transient coactivation bursts;
* short recurrent exchanges;
* fixation-triggered sensory volleys;
* slow gain drift.

### Tract emphasis

No tract shall remain continuously dominant. Activity may intermittently involve:

* cingulum;
* corpus callosum;
* SLF;
* IFOF;
* ILF;
* thalamocortical pathways.

## 9.2 Awake rest, eyes closed

Relative to eyes-open rest:

* externally triggered visual volleys shall be reduced;
* intrinsic posterior activity may persist;
* default-mode and internally oriented motifs may become more visually prominent;
* eye movements shall no longer trigger full scene-processing sequences;
* spontaneous sensory imagery may occasionally recruit ventral visual pathways.

This shall remain a dynamic state rather than a darkened or inactive brain.

---

## 9.3 Looking at a new scene

### Narrative description

A new visual scene appears and the subject forms an initial global interpretation.

### Nominal phase sequence

#### Phase A: Visual ingress

**Nominal interval:** 0–80 ms after scene onset.

**Motifs:**

* sensory afferent volley;
* thalamocortical relay;
* early posterior cortical activation.

**Primary pathways:**

* optic tract;
* optic radiations;
* early interhemispheric visual connections.

Long association tracts should not yet dominate the animation.

#### Phase B: Initial feedforward scene sweep

**Nominal interval:** approximately 60–150 ms.

**Motifs:**

* feedforward sweep;
* parallel dorsal and ventral divergence;
* early scene-gist extraction.

**Candidate pathways:**

* VOF;
* posterior ILF;
* posterior dorsal-stream connections;
* local occipital white matter.

This phase shall appear predominantly posterior-to-anterior or lower-to-higher, but weak counterflow may remain present.

#### Phase C: Segmentation and initial recognition

**Nominal interval:** approximately 120–300 ms.

**Motifs:**

* recurrent interpretation loop;
* ventral object and scene processing;
* dorsal spatial organization;
* feedback into earlier visual cortex.

**Candidate pathways:**

* ILF;
* VOF;
* posterior SLF;
* IFOF-associated channels.

Scene segmentation and object recognition in complex backgrounds depend substantially on recurrent processing rather than a purely feedforward pass.

#### Phase D: Context, attention and semantic interpretation

**Nominal interval:** approximately 200–600 ms.

**Motifs:**

* frontoparietal attention;
* semantic retrieval;
* contextual prediction;
* top-down feedback;
* memory matching.

**Candidate pathways:**

* IFOF;
* SLF;
* ILF;
* MdLF;
* uncinate;
* cingulum;
* arcuate, when verbal labeling occurs.

#### Phase E: Continued viewing

After the initial interpretation, the scene shall be processed as a sequence of fixation-centered episodes rather than one continuous global sweep.

Each fixation may generate:

1. a local sensory refresh;
2. posterior feedforward propagation;
3. object- or region-specific recognition;
4. context-sensitive recurrent exchange;
5. saccade selection;
6. suppression or modulation around the subsequent eye movement.

Neural processing of the presaccadic image may continue during the saccade, so the animation shall permit overlap between one fixation’s recurrent activity and the next fixation’s sensory volley.

---

## 9.4 Searching a scene for an object

This episode extends scene viewing with repeated evidence-accumulation and orienting loops.

### Sequence

1. establish target template;
2. apply frontal and parietal top-down bias;
3. sample a fixation;
4. propagate visual evidence;
5. compare evidence with target representation;
6. accept or reject the current region;
7. select another saccade;
8. repeat until recognition;
9. recruit decision or motor response.

### Tract tendencies

* frontal-to-parietal SLF gain increases during top-down search;
* posterior-to-frontal SLF and IFOF traffic increases when relevant evidence is encountered;
* VOF and ILF support visual feature and object interactions;
* recurrent counterflow remains present throughout.

The system shall not assign one fixed direction to “attention.” Top-down bias and bottom-up evidence may be active simultaneously.

---

## 9.5 Recognizing a familiar object or face

### Sequence

1. posterior sensory volley;
2. ventral visual propagation through ILF-associated channels;
3. recurrent ventral temporal processing;
4. anterior temporal and memory-network recruitment;
5. optional emotional, semantic and naming responses;
6. feedback to visual cortex.

### Optional branches

* familiar person: uncinate, cingulum and limbic interactions;
* object naming: temporal–frontal language interaction through arcuate, MdLF and related pathways;
* uncertain recognition: increased frontoparietal recurrent exchange;
* visual imagery: stronger anterior-to-posterior feedback.

---

## 9.6 Voluntary reach toward a visible object

### Sequence

1. object localization;
2. dorsal visual and parietal transformation;
3. premotor preparation;
4. motor-cortex recruitment;
5. corticospinal command;
6. proprioceptive and tactile feedback;
7. corrective parietal–frontal exchange.

### Rendering rule

Descending corticospinal propagation may be shown with a stronger anatomical directional prior than the association tracts. Ascending sensory feedback shall be rendered through its own pathways rather than as reverse traffic within the corticospinal tract.

---

## 9.7 Sleep onset and N1

“Sleeping” shall not be represented as a single state. Sleep onset shall be a transition from wake dynamics into increasingly state-specific patterns.

### N1 behavior

* reduced responsiveness to external events;
* unstable transitions between wake-like and sleep-like patterns;
* less persistent task-oriented frontoparietal communication;
* emerging slow and theta-range organization;
* occasional sensory responses and arousals.

The transition shall be gradual and stochastic.

---

## 9.8 N2 sleep

### Dominant motifs

* thalamocortical spindle bursts;
* K-complex and slow-wave events;
* unstable large-scale network synchronization;
* intermittent hippocampal–cortical communication;
* reduced behavioral responsiveness.

Large-scale network activity does not simply disappear in N2. One human fMRI study found that transient network activity peaked in N2 even while mutual dependencies and effective integration deteriorated with increasing sleep depth.

### Rendering

* mostly subdued background traffic;
* intermittent widespread bursts;
* spindle envelopes lasting substantially longer than individual axonal delays;
* thalamocortical and corticothalamic counterflow;
* temporary alignment of selected cortical regions;
* occasional memory-related replay events.

---

## 9.9 N3 or slow-wave sleep

### Dominant motifs

* alternating cortical up and down states;
* large traveling slow waves;
* reduced continuous long-range integration;
* tract traffic concentrated into periods of cortical excitability;
* nested spindle and ripple events;
* occasional hippocampal–cortical replay.

Human recordings show that sleep slow oscillations propagate as traveling cortical waves and that individual slow waves may be regional rather than globally simultaneous.

### Rendering

* slow waves moving primarily over cortex;
* widespread suppression during down-state phases;
* increased tract traffic during up-state phases;
* temporally nested bursts rather than uniform low activity;
* variable origins and directions of cortical slow waves;
* prefrontal–hippocampal–neocortical sequences for selected consolidation events.

NREM shall be rendered as an altered connectivity regime rather than merely a reduction in waking connectivity. Simultaneous EEG-fMRI measurements have found that many functional relationships change sign or increase during NREM and tend toward wake-like organization again in REM. These findings concern statistical functional connectivity, not literal reversal of axonal direction.

---

## 9.10 REM sleep

### Dominant motifs

* wake-like, desynchronized cortical activity;
* internally generated sensory-association patterns;
* limbic and memory interactions;
* rapid transitions among internally generated representations;
* suppression of ordinary motor output;
* reduced dependence on external sensory input.

### Rendering

* richer distributed association-tract traffic than in N3;
* internally initiated posterior and temporal activity;
* recurrent sensory-association loops without an external scene trigger;
* intermittent hippocampal, limbic and frontal participation;
* absent or gated corticospinal execution despite motor imagery;
* no assumption that dream content can be reconstructed from tract traffic.

The detailed tract sequence of dreaming remains insufficiently characterized. REM presets shall therefore carry lower confidence than sensory-evoked waking presets.

---

## 10. Narrative-sequence composition

A narrative shall be constructed from behavioral episodes rather than directly from tract animations.

### Example: “The subject notices and reaches for a cup”

| Narrative time | Behavioral phase        | Network motif                  | Principal tract rendering          |
| -------------: | ----------------------- | ------------------------------ | ---------------------------------- |
|          0–2 s | Awake rest              | Dynamic background             | Sparse bidirectional traffic       |
|          2.0 s | Scene appears           | Sensory ingress                | Optic radiation volley             |
|     2.08–2.2 s | Scene gist              | Feedforward sweep              | Posterior VOF and ILF              |
|     2.15–2.5 s | Segmentation            | Recurrent interpretation       | ILF and VOF counterflow            |
|      2.2–3.0 s | Cup recognition         | Ventral recognition and memory | ILF, uncinate, IFOF                |
|      3.0–4.0 s | Attention shifts        | Orienting loop                 | Frontal–parietal SLF               |
|      4.0–5.0 s | Reach planning          | Sensorimotor transformation    | SLF and premotor pathways          |
|      5.0–6.0 s | Reach execution         | Descending command             | Corticospinal volley               |
|      5.1–7.0 s | Feedback and correction | Sensorimotor recurrent loop    | Ascending sensory pathways and SLF |

The boundaries are animation anchors, not claims that all subjects or neural populations follow those exact times.

### Example: “A compressed sleep sequence”

| Narrative phase     | Dominant state      | Visual motif                                                         |
| ------------------- | ------------------- | -------------------------------------------------------------------- |
| Drowsiness          | Wake/N1 transition  | Background traffic becomes slower and less task-structured           |
| Light sleep         | N2                  | Spindles, K-complexes and intermittent thalamocortical bursts        |
| Deep sleep          | N3                  | Traveling slow waves and up-state-gated tract traffic                |
| Consolidation event | N2/N3               | Slow-wave–spindle–ripple sequence with hippocampal–cortical exchange |
| Dreaming            | REM                 | Internally generated distributed recurrent activity                  |
| Brief arousal       | REM/wake transition | Rapid return of sensory and control-network gain                     |

Biological time may be compressed for presentation, but event ordering within each motif shall be preserved.

---

## 11. Timing model

The system shall separate at least four timescales:

| Timescale        | Phenomena                                                   |
| ---------------- | ----------------------------------------------------------- |
| 1–30 ms          | Long-range axonal conduction and early evoked propagation   |
| 30–300 ms        | Sensory sweeps, recognition, recurrent cortical interaction |
| 0.3–10 s         | Fixation sequences, decisions, network-state transitions    |
| Seconds to hours | Behavioral episodes, sleep stages and narrative state       |

A global time-compression parameter may alter presentation duration:

[
t_{\text{display}} = f(t_{\text{biological}})
]

where (f) may be nonlinear.

Millisecond propagation shall remain visibly faster than behavioral-state transitions even under compression.

---

## 12. Tract-specific behavioral defaults

| Tract               | Behavioral associations                                               | Default rule                                                                                           |
| ------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| ILF                 | Visual recognition, object and face processing, visual memory         | Bidirectional; posterior-leading during visual input, anterior feedback during recognition and imagery |
| VOF                 | Dorsal–ventral visual integration, visual attention                   | Bidirectional; endpoint-specific rather than whole-tract activation                                    |
| IFOF                | Posterior–frontal interaction, semantic access, control               | Reciprocal; posterior-leading during incoming evidence, frontal-leading during top-down control        |
| SLF                 | Attention, spatial processing, executive and sensorimotor interaction | Reciprocal frontoparietal exchange                                                                     |
| Arcuate             | Speech perception, production and phonological processing             | Reciprocal temporal–frontal exchange                                                                   |
| MdLF                | Superior temporal–parietal and temporal–occipital interaction         | Low-confidence, endpoint-specific activity                                                             |
| Uncinate            | Anterior temporal–orbitofrontal and limbic interaction                | Memory-, familiarity- and affect-dependent                                                             |
| Cingulum            | Default-mode, memory and medial cortical interaction                  | Prominent in internally oriented and rest-related episodes                                             |
| Fornix              | Hippocampal–diencephalic memory circuitry                             | Event-driven, particularly in memory and sleep scripts                                                 |
| Optic radiations    | Visual sensory ingress                                                | Strongly directed thalamus-to-cortex sensory volley                                                    |
| Corticospinal tract | Voluntary motor output                                                | Predominantly descending execution signal                                                              |

These defaults shall remain editable and probabilistic.

---

## 13. Evidence classification

Every channel, motif and behavior mapping shall carry an evidence class.

| Class | Evidence                                                                |
| ----- | ----------------------------------------------------------------------- |
| A     | Direct human perturbational or invasive effective-connectivity evidence |
| B     | Human intracranial, EEG or MEG temporal evidence                        |
| C     | Human fMRI functional or state-related association                      |
| D     | Nonhuman-primate tracer or electrophysiological evidence                |
| E     | Anatomically constrained computational inference                        |
| F     | Illustrative modeling prior                                             |

The renderer should optionally expose evidence class through:

* tooltip;
* legend;
* opacity;
* edge texture;
* confidence overlay.

Evidence confidence shall not be encoded using the same visual variable as activity magnitude.

---

## 14. Stochastic variation

Repeated playback of the same behavior should not produce an identical animation.

Each phase may sample:

* duration;
* channel gain;
* burst timing;
* fixation target;
* number of recurrent cycles;
* network-state transition;
* propagation dispersion;
* hemisphere dominance;
* confidence-weighted route selection.

Randomness shall be temporally correlated rather than independent frame-to-frame noise.

A behavioral script defines a probability distribution over plausible neural sequences, not one canonical recording.

---

## 15. Rendering requirements

1. Tract activity shall be generated from directed endpoint channels.
2. Whole-tract illumination shall occur only when many constituent channels are simultaneously recruited.
3. Opposing directions may be displayed simultaneously.
4. Particle density shall encode event density or gain, not literal axon count.
5. Pulse cadence may encode temporal coordination.
6. Cortical endpoint activity shall remain visually distinct from tract propagation.
7. Slow cortical waves shall be rendered on the cortex.
8. Conduction delay shall be represented visibly.
9. Packets shall disperse over distance.
10. State transitions shall blend rather than switch instantaneously.
11. The viewer shall be able to identify which behavior caused each rendered event.
12. The viewer shall be able to distinguish measured evidence from modeling assumptions.

---

## 16. Behavioral-script schema

A machine-readable implementation may use the following conceptual structure:

```yaml
behavior:
  id: inspect_scene
  label: Look at and interpret a scene
  arousal: awake
  sensory_context:
    vision: natural_scene
    eyes: open
  phases:
    - id: visual_ingress
      onset_ms: 0
      duration_ms: [50, 100]
      motifs:
        - sensory_afferent_volley
      confidence: high

    - id: initial_scene_sweep
      onset_ms: [60, 90]
      duration_ms: [80, 160]
      motifs:
        - feedforward_visual_sweep
      confidence: medium_high

    - id: recurrent_interpretation
      onset_ms: [120, 180]
      duration_ms: [150, 500]
      motifs:
        - ventral_recognition_loop
        - dorsal_spatial_loop
        - visual_feedback
      confidence: medium

    - id: fixation_cycle
      repeat:
        count: stochastic
      motifs:
        - sensory_refresh
        - evidence_accumulation
        - saccade_selection
      confidence: medium
```

A motif definition may then specify channels and primitives:

```yaml
motif:
  id: ventral_recognition_loop
  channels:
    - source: occipital_visual
      target: ventral_temporal
      tract: ILF
      primitives:
        - evoked_volley
        - directional_gain

    - source: ventral_temporal
      target: occipital_visual
      tract: ILF
      delay_after_primary_ms: [20, 120]
      primitives:
        - feedback_sweep
        - coherence_modulation
```

The numerical values shall be stored separately from narrative labels so they can be replaced as better datasets become available.

---

## 17. Acceptance criteria

The initial implementation shall be considered successful when:

1. A behavior can be decomposed into phases, motifs, channels and primitives.
2. Every rendered tract event can be traced back to a behavioral or internal-state cause.
3. Awake rest displays structured spontaneous dynamics rather than uniform noise.
4. Scene viewing displays an initial feedforward sweep followed by recurrent processing.
5. Fixations produce overlapping repeated processing cycles.
6. N2, N3 and REM are visually and mechanistically distinct.
7. Sleep activity is not represented as global inactivity.
8. Association tracts can show simultaneous counterflow.
9. Descending and ascending motor-system pathways remain anatomically distinct.
10. Confidence and evidence class are inspectable.
11. Narrative time can be compressed without reversing causal order.
12. The same behavioral script can produce multiple plausible realizations.

---

## 18. Open design questions

The following decisions remain unresolved:

* cortical parcellation and region granularity;
* tract segmentation and endpoint assignment;
* how diffusion-derived anatomy will be combined with F-TRACT regional edges;
* whether frequency bands receive distinct colors, pulse cadences or textures;
* how strongly to expose uncertainty to nonexpert viewers;
* how to handle disputed tract anatomy, especially IFOF and MdLF subdivisions;
* whether sleep replay should be generic or generated from a preceding waking sequence;
* how narrative annotation should distinguish observed behavior from inferred cognition;
* whether the model targets scientific exploration, education or cinematic communication.

The architecture should permit the evidence and visualization policy to be replaced independently.

