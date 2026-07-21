# Association-tract inhibited impulse model

- **Status:** Implemented
- **Date:** 2026-07-21
- **Owner Bead:** `brain-atlas-yum.2`
- **Policy decisions:** `brain-atlas-m9k`, `brain-atlas-sh7`, `brain-atlas-cs0`
- **Interim correction:** `brain-atlas-zmq.2`
- **Implementation:** `brain-atlas-zmq.16`

## 1. Intended claim

Every named long association tract displays stochastic **code-like impulses**.
The impulses illustrate population communication over real tractography contours;
they are not recorded spikes, measured firing rates, axons, action-potential speeds,
or evidence that a displayed streamline has measured polarity.

For each accepted event, direction is sampled from a tract/hemisphere probability
`p(A→B)`. The best defensible cited estimate should be used when one exists. The
current evidence review found qualitative reciprocity or connectivity but no
transportable quantitative source→endpoint proportion for any of the eight displayed
human bundles. Version 1 therefore uses an explicit symmetric `p = 0.5` assumption
for every tract and hemisphere. This is an evidence-absent modeling prior, not data.

This 50/50 rule applies only to the eight named association tracts. The optic
radiation is a distinct, biologically directed LGN→V1 geniculocalcarine projection;
its displayed flow remains one-way. The schematic anterior retina→LGN pathway also
remains directed. Superficial U-fibres/SWM are outside this model and retain
zero-mean vibration.

## 2. Evidence method and result

### Inclusion

- human anatomical dissection, diffusion/tractography, stimulation, and review
  literature for the displayed tract identity and broad endpoint classes;
- non-human tracer evidence only for qualitative reciprocity or uncertainty, not as
  a numerical human direction ratio;
- methods sources that state what diffusion MRI can and cannot infer.

### Exclusion

- streamline point order, streamline count, endpoint count, or tract volume as a
  proxy for afferent/efferent direction;
- functional/effective-connectivity direction as a direct estimate of structural
  axon-count direction;
- a fixed polarity assigned to one displayed tractography streamline;
- invented tract-specific firing rates or conduction speeds.

### Core direction finding

Jbabdi and Johansen-Berg state that tractography cannot discriminate afferents from
efferents and cannot determine connection polarity because axonal polarity does not
affect water diffusion. They also note that most macaque cortico-cortical connections
are reciprocal and that a voxel-scale bundle may contain axons in both directions.
This means bidirectional population simulation is compatible with current evidence,
but it neither proves symmetry nor supplies a quantitative human ratio.

Source: [Tractography: Where Do We Go from Here?](https://doi.org/10.1089/brain.2011.0033),
especially its “Polarity of connections” discussion.

### Targeted human microscopy/axon-count search

Human tissue has been examined microscopically, but the available methods do not
provide the desired bundle-specific A→B versus B→A percentages:

- Electron microscopy can count axons in a perpendicular tract cross-section. A
  2022 human study calibrated whole-cortex diffusion connectivity with histological
  corpus-callosum axon density, then **estimated** interareal axon counts. It did not
  classify association axons by soma→terminal direction; ipsilateral bundles also
  admit axons along their length rather than forming the callosum's closed cross-
  hemisphere set. Source: [Rosen & Halgren 2022](https://doi.org/10.1371/journal.pbio.3001575).
- Human 3D polarized-light imaging reconstructs high-resolution myelinated-fibre
  orientation fields, but an orientation axis does not identify soma/terminal
  polarity or count A→B versus B→A axons. Source:
  [Axer et al. 2011](https://doi.org/10.3389/fninf.2011.00034).
- Fixed-human DiI tracing can reach single axons, but the dye diffuses both
  anterogradely and retrogradely at once. A 2024 scoping review found only 61 human
  studies, a maximum reported trace of 70 mm, and describes bidirectional labeling,
  long incubations, short reach, and possible off-target labeling as limitations.
  This can map connectivity but does not produce an afferent/efferent percentage for
  the displayed long bundles. Source:
  [Skandalakis et al. 2024](https://doi.org/10.3390/biom14050536).

Invasive direction-selective anterograde/retrograde tracers provide the strongest
polarity evidence in experimental animals, especially non-human primates, but the
search found no equivalent human microscopic count for ILF, IFOF, SLF I–III, VOF,
arcuate, or MdLF. Animal findings may establish qualitative reciprocity; they are not
silently converted into numerical human ratios.

### Per-tract evidence table

`A` and `B` are canonical endpoint names for model metadata, not measured direction.

| Tract | Endpoint A | Endpoint B | Direction evidence | v1 `p(A→B)` L/R | Sources |
|---|---|---|---|---|---|
| ILF | posterior occipital/occipitotemporal | anterior temporal | Review explicitly calls the ILF multilayered and bidirectional; no quantitative human directional proportion. | 0.50 / 0.50 | [Herbet et al. 2018](https://doi.org/10.3389/fnana.2018.00077) |
| IFOF | posterior occipital/temporal/parietal | prefrontal | Long-range connectivity is supported, but anatomy/monosynaptic interpretation remains contentious; no quantitative direction ratio. | 0.50 / 0.50 | [Giampiccolo et al. 2025](https://doi.org/10.1093/brain/awaf055) |
| SLF I | posterior superior parietal | dorsal/medial frontal | Frontoparietal connection; human subdivision/termination anatomy remains debated and tractography cannot supply polarity. | 0.50 / 0.50 | [Martino et al. 2022](https://doi.org/10.3389/fneur.2022.794618); [Jbabdi & Johansen-Berg 2011](https://doi.org/10.1089/brain.2011.0033) |
| SLF II | posterior parietal | dorsolateral frontal | Frontoparietal connection without a defensible quantitative human direction ratio. | 0.50 / 0.50 | Same SLF and polarity sources above. |
| SLF III | posterior inferior parietal/opercular | inferior frontal/opercular | Frontoparietal/perisylvian connection without a defensible quantitative human direction ratio. | 0.50 / 0.50 | Same SLF and polarity sources above. |
| VOF | dorsal occipital/visual | ventral occipitotemporal/visual | Connects dorsal and ventral visual cortex and supports communication; no quantitative direction ratio. | 0.50 / 0.50 | [Yeatman et al. 2014](https://doi.org/10.1073/pnas.1418503111) |
| Arcuate | posterior temporal | frontal | Frontotemporal dorsal association system; structural descriptions and functional interpretations are non-univocal; no quantitative direction ratio. | 0.50 / 0.50 | [Vavassori et al. 2023](https://doi.org/10.1002/brb3.3107) |
| MdLF | posterior parietal/occipital | superior/anterior temporal | Multiple proposed subcomponents and disputed terminations; no quantitative direction ratio. | 0.50 / 0.50 | [Latini et al. 2021](https://doi.org/10.3389/fnana.2020.610324) |

**Confidence:** high that diffusion tractography cannot provide polarity; moderate
that mixed-direction population communication is a reasonable illustrative model for
all eight bundles; high that this review found no qualifying human direction ratio.
The symmetric 50/50 value is policy-compliant fallback metadata, not a conclusion
that anatomical symmetry has been measured. A future evidence update may change the
probabilities without changing the event engine.

## 3. Geometry/activity separation

Store activity provenance in a small versioned manifest such as
`public/data/tract_activity.json`; do not encode polarity by reversing or rewriting
`tracts.json`.

Each tract record contains:

```json
{
  "id": "ilf",
  "endpointA": {
    "label": "posterior occipital/occipitotemporal",
    "classifier": { "coordinate": "y", "select": "minimum" }
  },
  "endpointB": { "label": "anterior temporal" },
  "probabilityAtoB": { "L": 0.5, "R": 0.5 },
  "evidenceStatus": "qualitative-bidirectional-no-quantitative-ratio",
  "assumption": "symmetric-50-50",
  "sources": ["https://doi.org/10.3389/fnana.2018.00077"]
}
```

Only ILF currently uses the `qualitative-bidirectional-no-quantitative-ratio`
evidence status. IFOF, SLF I–III, VOF, arcuate, and MdLF use
`no-qualifying-human-direction-ratio`; connectivity alone is not mislabeled as
evidence of equal reciprocal projections.

Canonical endpoint classifiers are explicit **geometric orientation heuristics**;
they provide stable display labels without claiming measured cortical terminations
or axonal polarity:

- ILF, IFOF, SLF I–III, arcuate, and MdLF: endpoint A is the more posterior
  endpoint (`minimum y`); endpoint B is more anterior.
- VOF: endpoint A is the more dorsal endpoint (`maximum z`); endpoint B is more
  ventral.

The checked-in sample is consistently ordered this way, but IFOF/MdLF termination
anatomy remains disputed and tractography does not establish precise synaptic
endpoints. Apply the classifier only to the two raw contour endpoints, never to
interior vertices. If the primary endpoint coordinates differ by no more than
`1e-6` mm, break the tie lexicographically over the remaining fixed coordinates
(`z`, then `x` for a `y` classifier; `y`, then `x` for a `z` classifier). This
fallback is deterministic geometry, not anatomical evidence. The renderer must apply
the heuristic to each contour rather than trusting array order. For an event with
progress `u ∈ [0,1]`, map to the raw contour parameter using both the classifier and
the sampled direction. Reversing a source contour must not reverse the modeled
anatomical direction.

Direction is sampled **per accepted code event**, not permanently per streamline.
This represents mixed projection populations without pretending one tractography
curve is one axon. Over many events, the expected A→B fraction is `p`; no short time
window is forced to contain an exact split.

## 4. Inhibited stochastic event process

### Model unit

One **virtual code channel** is a display process, not a neuron. Every
tract/hemisphere has twelve independent logical channels regardless of visibility. An accepted channel event selects
one of that tract/hemisphere's real contours uniformly and launches one impulse in a
Bernoulli-sampled direction.

Equal channel counts per tract/hemisphere prevent atlas sampling density or JSON
array length from becoming an unsupported activity-rate claim. They also guarantee
that all 16 tract/hemisphere groups participate over time.

### Version 1 parameters

The process shares the existing code-like visual grammar without using biological
time units or making tract-specific physiology claims. One model second equals one
wall second at activity speed 70; the speed control scales the model clock.

| Parameter | Value | Meaning/status |
|---|---:|---|
| schema version | 1 | Manifest/engine compatibility. |
| default PRNG seed | 1096043603 (`0x41544c53`) | Reproducible display sequence. |
| PRNG | Mulberry32 | Small deterministic non-cryptographic generator. |
| channels per tract/hemisphere | 12 | Equal illustrative display density. |
| per-channel base | seeded uniform 0.24–0.64 events/model s | Illustrative, not measured. |
| private modulation amplitude `aᵢ` | seeded uniform 0.15–0.55 | Illustrative variability. |
| private modulation frequency `fᵢ` | seeded uniform 0.08–0.35 cycles/model s | Illustrative; no global synchrony. |
| private phase `φᵢ` | seeded uniform 0–2π | Independent channel phase. |
| absolute refractory interval `r₀` | 0.05 model s | Per-channel display self-inhibition, not physiology. |
| recovery time constant `τ` | 0.20 model s | Per-channel recovery from display self-inhibition, not physiology. |
| contour speed | seeded uniform 0.30–0.48 contour units/model s | Legibility, not conduction speed. |
| active rendered cap | 520 | GPU/performance bound. |
| direction | Bernoulli `p(A→B)` per accepted event | v1 metadata is 0.5 for every group. |

For channel `i`, define

`privateRateᵢ(t) = baseᵢ × (1 + aᵢ sin(2π fᵢ t + φᵢ))`

and, for elapsed time `d` since that channel's last accepted event,

`recovery(d) = 0` when `d < r₀`, otherwise
`1 − exp(−(d − r₀) / τ)`.

The exact accepted hazard is

`λᵢ(t) = privateRateᵢ(t) × recovery(t − lastᵢ)`.

Generate non-homogeneous candidates by superposition and thinning following
[Ogata 1981](https://doi.org/10.1109/TIT.1981.1056305). Each channel envelope is
`Mᵢ = baseᵢ × (1 + aᵢ)`; sample the next absolute candidate time from an
exponential interval with rate `ΣMᵢ`, choose a channel with weight `Mᵢ`, and accept
with probability `λᵢ(t)/Mᵢ`. Version 1 has no forced burst queue: every displayed
event passes the same refractory/recovery gate. Do **not** add a common cross-tract
oscillation because synchronized bundle-wide waves would be an unsupported network
claim.

Initialization uses canonical tract order `ilf`, `ifof`, `slf1`, `slf2`, `slf3`,
`vof`, `af` (displayed as Arcuate), `mdlf`; within each tract it uses hemisphere order `L`, `R`, then
channel index 0–11. Panel order and object-key order are ignored. Each channel consumes
initialization values in fixed order: base, amplitude, frequency, phase.

Every accepted logical event consumes, in fixed order, random values for direction,
contour selection, and contour speed. It emits the plain record
`{ time, groupId, channelIndex, aToB, contourUnit, speed }`; `channelIndex` exists
for refractory/distribution verification and carries no neuronal identity claim. This happens even when the group is
hidden or the rendered pool is full, so UI state cannot perturb future model
sequences.

### Visibility, cap, pause, and reduced motion

- Generate all channels independently of panel ordering and visibility.
- A hidden tract or hemisphere advances its logical channel state but its events are
  not rendered; hidden density is never transferred to another group.
- When 520 impulses are already active, drop the newest rendered event; never evict
  an active event. Logical model state and random consumption remain unchanged.
- Pause freezes model time and every active impulse in place.
- Reduced motion forces the association model inactive: its model clock is frozen,
  active impulses are hidden, and the Play control cannot override that preference.
- Changing activity speed scales model time and contour progress together; the UI
  does not expose a biological-rate label.

### Reproducibility

Mulberry32 is hidden behind an injected `random()` interface. The runtime default
seed is stored in the manifest; tests may inject another seed or deterministic
sequence. Engine state includes absolute model time, the next candidate time, PRNG
state, channel parameters, and last-accepted times. `advanceTo(targetTime)` processes
all candidates at or before the absolute target, preserving the next candidate for a
later call. Therefore equal target times produce the same logical events regardless
of frame partitioning. A model reset restores the manifest seed and time zero.

## 5. Runtime architecture

Create a renderer-independent activity module with plain data only:

- seeded random source and canonical initialization order;
- channel initialization;
- exponential intervals and weighted channel selection;
- private rate and refractory recovery;
- absolute-time candidate generation;
- per-event direction, contour-unit, and speed sampling;
- endpoint-only canonical contour-parameter mapping; and
- balanced channel allocation.

The engine has no visibility or GPU-pool state. `advanceTo(targetTime)` returns the
logical event records accepted since the previous target. The renderer adapter in
`src/main.js` then:

1. discards records whose tract/hemisphere is hidden;
2. discards the newest record when the 520-slot pool is full;
3. resolves `contourUnit` to a contour uniformly within that group;
4. stores an active record with its absolute `time`, `speed`, sampled direction, and
   contour reference;
5. derives progress as `(currentModelTime − event.time) × speed`; and
6. expires the record once progress exceeds 1.

Because event random values are already present, visibility and cap decisions consume
no RNG state. For the same seed, visibility timeline, and final target time, rendered
pool contents and positions are frame-partition invariant as well as the logical
event sequence. Unit-test the adapter with plain contour arrays; Three.js remains
responsible only for geometry, visibility lookup, colours, draw ranges, and buffer
uploads.

Keep optic-radiation flow functionally unchanged in this implementation; a later
simplification may share the pure event engine only after behavior equivalence is
tested.

## 6. Required tests

### Pure model

- seeded runs are reproducible;
- candidate sequences are invariant to frame partitioning;
- refractory recovery is zero before 0.05 model s and bounded thereafter;
- the exact hazard never exceeds its channel envelope;
- direction sampling obeys `p=0`, `p=1`, and the deterministic `p=0.5` sequence;
- reversing a non-monotonic source contour does not reverse canonical A→B/B→A
  travel, and interior extrema are never treated as endpoints;
- primary-coordinate ties use the specified reversal-invariant fallback;
- twelve channels are allocated to every tract/hemisphere in canonical order;
- every one of the 16 groups emits during a sufficiently long seeded run;
- hidden groups consume the same logical event/random sequence without rendering;
- pause and reduced-motion time do not advance;
- for the same visibility timeline, logical and rendered states are invariant to
  frame partitioning;
- the active-pool cap drops newest events without eviction or RNG drift;
- expiration removes records only after absolute-time progress exceeds 1.

### Browser/visual

- all eight tract colours visibly carry moving impulses in both hemispheres;
- with the default seed, automated instrumentation confirms at least one accepted
  event in each direction for every enabled group during model seconds 0–12; visual
  review checks the appearance without treating a random short window as proof;
- no arrowheads or permanent per-streamline polarity appear;
- global and per-tract L/R controls update rendered impulses correctly;
- play/pause freezes and resumes positions;
- SWM retains vibration and never receives traveling impulses;
- anterior and optic-radiation directed behavior is unchanged;
- the console is error-free and the publication build passes.

## 7. Disclosure text

Concise UI copy:

> **Association impulses — modeled.** Dots are stochastic code-like events on real
> population tractography contours. Direction is not measured by diffusion MRI;
> current bundles use an explicit 50/50 direction assumption because no defensible
> quantitative ratio is available. Rates, per-channel refractory self-inhibition and
> recovery, and speed are display algorithms—not measured neuronal physiology.

The runtime provides a keyboard-accessible “Association model & sources” disclosure
beside the legend. It identifies geometry as HCP-1065 data; identifies direction,
event timing, refractory self-inhibition/recovery, and speed as modeled or
illustrative; states uncertainty; and links the tract-specific evidence sources and
method above. The concise legend remains visible when the detailed disclosure is
closed.

## 8. Implementation record

`brain-atlas-zmq.16` implemented the specification through
`src/activity/association-impulses.js`, `public/data/tract_activity.json`, and a
thin Three.js adapter in `src/main.js`. The existing geometry key `af` is retained
for the displayed Arcuate tract, and logical records include `channelIndex` for
refractory/distribution verification. Neither detail changes the approved model.
Current behavior, scientific limitations, citations, licenses, and user guidance
are synchronized in `README.md`, `docs/ARCHITECTURE.md`,
`docs/SCIENTIFIC_TRACEABILITY.md`, `DATA_LICENSES.md`, and `skills/user.md`.
