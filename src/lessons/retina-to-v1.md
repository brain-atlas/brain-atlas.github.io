---
title: "Early Vision: Retina to the Cortical Streams"
schema: 1
entryScene: orientation
summary: Explain how early visual signals are transformed from retinal circuits through V1 into interacting ventral and dorsal cortical streams.
---

# Early Vision: Retina to the Cortical Streams

Early vision is not a camera feeding a complete picture into the brain. At each
stage, neural circuits select, reorganize, and transform information. The pathway's
anatomy makes one central organizing principle visible: after the optic chiasm,
signals are grouped by **visual hemifield**, not by eye.

> **Predict before you begin:** A patient loses the left half of visual space in
> both eyes. Is the damaged site more likely to be before or after the optic
> chiasm, and on which side of the brain? Commit to an answer and return to it
> in scene 4.

By the end of eight scenes, you should be able to:

1. trace either visual hemifield through both retinas to the opposite LGN and V1;
2. distinguish what the retina, LGN, optic radiation, and V1 contribute;
3. predict characteristic visual-field loss from lesions at different pathway levels;
4. summarize the downstream biases of the ventral and dorsal streams without treating
   them as isolated pathways; and
5. distinguish biological claims from schematic anatomy and illustrative activity.

The core processing sequence in this lesson is **retina → optic nerve → optic
chiasm → optic tract → LGN → optic radiation → V1 → V2/V3**. The final cortical
scenes briefly preview downstream ventral and dorsal processing. Keep your own left
and right separate from the patient's left and right, and remember that a retinal
image is reversed across both horizontal and vertical axes.

```atlas-scene
id: orientation
title: Organize the early visual system
visual: atlas
camera:
  position: [147, 53, -137]
  target: [0, 0, 0]
  transition: { kind: ease, durationMs: 900 }
show:
  - layer.cortex
  - pathway.anterior
  - pathway.optic-radiation
  - region.lgn
  - region.v1
fidelity:
  - fidelity.cortex
  - fidelity.julich-regions
  - fidelity.anterior-pathway
  - fidelity.optic-radiation
cutaway: 24
tissueOpacity: 0.14
playback:
  playing: true
  speed: 70
  settled: false
selection:
  selected: null
  emphasized: [pathway.anterior, pathway.optic-radiation, region.lgn, region.v1]
  strength: 0.5
controls:
  mode: look
layout: dominant
```

## Organization of the early visual system

Signals from the two eyes travel through paired optic nerves and meet at the optic
chiasm. After partial crossing, each optic tract carries the opposite visual hemifield
from both eyes to the LGN on the same side of the brain. The optic radiation then
continues from each LGN to V1 in that hemisphere, around the calcarine sulcus. Along
this route, the system preserves an orderly map of visual space while transforming how
the information is encoded.

```atlas-scene
id: nasal-crossing
title: The retina recodes light; the chiasm regroups space
visual: atlas
camera:
  position: [0, -19, -160]
  target: [0, -30, -37]
  transition: { kind: ease, durationMs: 900 }
show: [pathway.anterior, region.lgn]
fidelity: [fidelity.anterior-pathway, fidelity.julich-regions]
cutaway: 0
tissueOpacity: 0.08
playback:
  playing: true
  speed: 60
  settled: false
selection:
  selected: pathway.anterior
  emphasized: [pathway.anterior, region.lgn]
  strength: 0.8
controls:
  mode: guided
layout: dominant
```

## The retina recodes light; the chiasm regroups space

Before any signal reaches the chiasm, the retina has already begun to compute. Rods and
cones convert light into graded electrical signals. Bipolar, horizontal, and amacrine
cells compare signals across space and time; retinal ganglion cells then send action
potentials through the optic nerve. The output is not a pixel-for-pixel copy of the
image but a set of parallel neural descriptions.

Many retinal ganglion cells have a **center-surround receptive field**: light in a
central region and light in the surrounding ring drive the cell in opposite directions.
For an ON-center cell, light in the center increases activity while light in the
surround suppresses it; an OFF-center cell shows the reverse pattern. Uniform light
activates both regions and partly cancels, whereas an edge or local contrast can drive
one region more strongly than the other. Other ganglion-cell types carry different
combinations of spatial, temporal, color, and motion-related information.

---

Partial crossing at the optic chiasm then reorganizes those parallel signals:

- The **left visual hemifield** falls on the nasal (medial) retina of the left eye and
  the temporal (lateral) retina of the right eye. The nasal fibres cross; the temporal
  fibres do not. Both components therefore enter the **right optic tract**.
- The **right visual hemifield** reaches the nasal retina of the right eye and the
  temporal retina of the left eye, then converges in the **left optic tract**.

This yields a useful mapping: each optic nerve represents one eye, whereas each optic
tract represents the opposite visual hemifield from both eyes.

> **Check your model:** Covering one eye removes input from one optic nerve. Damage to
> one optic tract instead removes the same visual hemifield from both eyes. Why?

> **Scene limitations and boundaries:** In the current schematic, only the
> nasal-retinal paths are drawn. The uncrossed temporal-retinal pathways are
> biologically present but omitted, so this is **not a complete depiction** of either
> eye's projection or both hemifields. Moving dots show direction along the represented
> path; their spacing and speed are illustrative.

```atlas-scene
id: lgn-relay
title: The LGN preserves maps while regulating transmission
visual: atlas
camera:
  position: [-51, 17, -46]
  target: [-18, -8, 32]
  transition: { kind: ease, durationMs: 900 }
show: [layer.cortex, pathway.anterior, pathway.optic-radiation, region.lgn, region.v1]
fidelity:
  - fidelity.cortex
  - fidelity.julich-regions
  - fidelity.anterior-pathway
  - fidelity.optic-radiation
cutaway: 42
tissueOpacity: 0.11
playback:
  playing: true
  speed: 70
  settled: false
selection:
  selected: region.lgn
  emphasized: [region.lgn, region.v1, pathway.anterior, pathway.optic-radiation]
  strength: 0.9
controls:
  mode: look
layout: detail
```

## The LGN preserves maps while regulating transmission

Each lateral geniculate nucleus (LGN) represents the **contralateral visual
hemifield** using input from both eyes. Retinotopic order is preserved: neighboring
locations in visual space remain systematically related within the LGN. Input from
the two eyes is kept largely separate across the six principal layers rather than
blended into one undifferentiated signal.

Three parallel channel families also remain distinguishable as they pass through the
LGN:

- **Magnocellular (M)** pathways are especially sensitive to rapid luminance changes
  and low contrast. They favor temporal resolution over fine spatial detail.
- **Parvocellular (P)** pathways preserve finer spatial detail and carry important
  red-green opponent signals. They respond well to more sustained patterns.
- **Koniocellular (K)** neurons occupy thinner zones between the principal layers.
  They are a varied group: some carry short-wavelength, blue-yellow opponent signals,
  but the K pathway is not one uniform color channel.

These channels interact, and none maps by itself onto a complete percept such as
“motion,” “form,” or “color.” Instead, they preserve complementary descriptions that
cortex can compare and recombine.

Although the LGN acts as a *relay*, it is not a passive junction. Local inhibition,
brainstem state signals, and feedback from visual cortex shape retinal drive. The LGN
can therefore regulate which retinal signals are transmitted and when while preserving
the spatial organization needed by cortex.

> **Retrieval check:** Without rereading scene 1, explain how one LGN can receive
> input from both eyes while representing only one visual hemifield.

> **Scene limitations and boundaries:** This view keeps incoming schematic pathway
> context, the population-atlas LGN source, the optic-radiation trajectory, and the V1
> destination in frame. It does not resolve LGN layers, parallel channels, synapses, or
> measured firing. The anterior segment is schematic, the right optic radiation is
> mirrored from the left, and all displayed timing is illustrative.

```atlas-scene
id: optic-radiation
title: The optic radiation carries a topographic map
visual: atlas
camera:
  position: [112, 2, -3]
  target: [3, -8, 49]
  transition: { kind: ease, durationMs: 900 }
show: [layer.cortex, pathway.optic-radiation, region.lgn, region.v1]
fidelity: [fidelity.julich-regions, fidelity.optic-radiation]
hemispheres:
  global: { L: true, R: false }
cutaway: 50
tissueOpacity: 0.12
playback:
  playing: true
  speed: 72
  settled: false
selection:
  selected: pathway.optic-radiation
  emphasized: [pathway.optic-radiation, region.lgn, region.v1]
  strength: 0.75
controls:
  mode: look
layout: dominant
```

## The optic radiation carries a topographic map

LGN relay-cell axons travel through the retrolenticular internal capsule and fan out as
the optic radiation toward V1. The projection is topographic rather than randomly
wired: relative positions in the visual field remain systematically organized along
the route and at the destination.

Because upper- and lower-field fibres take different routes, the pattern of visual-field
loss can help localize a lesion. Fibres representing the **upper visual field** arise
from inferior retina and sweep anteriorly through the temporal lobe in Meyer's loop
before reaching the lower bank of the calcarine sulcus. Fibres representing the
**lower visual field** arise from superior retina and take a more direct parietal route
to the upper bank. This scene shows the left pathway for clarity, but the organization
occurs on both sides.

> **Predict, then check:** What would selective damage to the right temporal-lobe optic
> radiation in Meyer's loop most likely remove? It would most likely produce a **left
> superior quadrantanopia** in both eyes: loss of the upper-left quarter of visual space.
> A larger right post-chiasmal lesion could remove the entire left hemifield.

This organization is not perfectly geometric in individual patients. Fibre trajectories
vary, and lesions can cross pathway boundaries, so field defects may be incomplete or
less congruent than this idealized model predicts.

> **Scene boundaries and limitations:** The displayed streamlines show the gross
> LGN-to-V1 projection, not separate retinotopic lanes or a patient-specific Meyer's
> loop. This scene shows only the left contours derived from population HCP-1065
> tractography; elsewhere in the atlas, the right side is mirrored from the left and is
> hidden here. Bright events move in the biologically supported LGN-to-V1 direction, but
> their rates, bursts, speed, and **timing are illustrative**---they are **not recorded
> spikes** or measured physiology.

```atlas-scene
id: v1-arrival
title: V1 builds a cortical map of local visual structure
visual: atlas
camera:
  position: [95, 55, 95]
  target: [0, -5, 45]
  transition: { kind: ease, durationMs: 900 }
show: [layer.cortex, pathway.optic-radiation, region.lgn, region.v1]
fidelity: [fidelity.julich-regions, fidelity.optic-radiation]
hemispheres:
  global: { L: true, R: false }
cutaway: 50
tissueOpacity: 0.16
playback:
  playing: true
  speed: 70
  settled: false
selection:
  selected: region.v1
  emphasized: [pathway.optic-radiation, region.lgn, region.v1]
  strength: 0.95
controls:
  mode: look
layout: detail
```

## V1 builds a cortical map of local visual structure

The optic radiation terminates mainly in the input layers of primary visual cortex
(V1), which lies largely along the calcarine sulcus. Each V1 represents the opposite
visual hemifield. This map is strongly **retinotopic**: neighboring points in visual
space map to neighboring cortical locations.

Retinotopy does not mean that every part of the field receives equal cortical space.
Central vision occupies disproportionately large territory because many more neurons
process the region around the point of gaze. This unequal scaling is called
**cortical magnification**.

V1 also changes what the activity represents. Its neurons compare local inputs and
become selective for features such as edge orientation, spatial scale, position,
motion direction, and signals from the two eyes. Feedforward input, local circuitry,
and feedback all shape these responses. As with the LGN, V1 is neither a passive
screen nor the endpoint of perception. It continues to structure and refine signals
for a larger recurrent network.

Animal physiology established many of these cellular principles. Hubel and Wiesel
showed that neurons in cat V1 respond selectively to oriented contours. Human lesion
studies and functional MRI connect that foundational work to the retinotopic
organization of human V1.

> **Checkpoint:** Without looking back, reconstruct the pathway to V1. At each step,
> name what is preserved and what changes: retinal encoding → hemifield regrouping →
> thalamic organization and regulation → topographic white-matter projection →
> cortical mapping and local feature selectivity.

Return to the opening prediction. Loss of the **left visual hemifield in both eyes** is
a left homonymous hemianopia. It localizes **after the chiasm on the right** because
the right optic tract, LGN, optic radiation, and V1 each represent the left side of
visual space from both eyes. The same model distinguishes four common lesion patterns:

1. one optic nerve → monocular visual loss in that eye;
2. central optic chiasm → preferential loss of both temporal visual fields;
3. one post-chiasmal pathway → contralateral homonymous visual-field loss;
4. temporal-lobe optic radiation → contralateral superior quadrantanopia.

> **Scene boundaries and limitations:** The V1 shells are population-atlas boundaries,
> not an individual's cortex or a map of eccentricity, polar angle, layers, columns, or
> cell responses. Event timing remains illustrative rather than measured physiology.

```atlas-scene
id: extrastriate-branching
title: Extrastriate cortex expands the computation
visual: atlas
camera:
  position: [100, 37, 146]
  target: [9, -3, 58]
  transition: { kind: ease, durationMs: 900 }
show:
  - layer.cortex
  - region.v1
  - region.v2
  - region.v3v
  - region.v3d
  - region.v4v
  - region.v3a
  - region.v6
  - region.mt
  - layer.swm
  - tract.vof
fidelity:
  - fidelity.cortex
  - fidelity.julich-regions
  - fidelity.association-tracts
  - fidelity.superficial-white-matter
cutaway: 42
tissueOpacity: 0.13
playback:
  playing: true
  speed: 70
  settled: false
selection:
  selected: region.v2
  emphasized: [region.v1, region.v2, region.v3v, region.v3d, region.v4v, region.v3a, region.v6, region.mt, tract.vof]
  strength: 0.78
controls:
  mode: look
layout: dominant
```

## Extrastriate cortex expands the computation

Visual signals do not move through one fixed sequence of cortical areas. Multiple
feedforward routes carry signals into extrastriate cortex, while lateral and feedback
connections return information to earlier areas. The result is a distributed recurrent
network rather than a simple processing chain.

Many extrastriate areas preserve a map of visual space while combining information over
larger portions of the field. Their specializations form overlapping, graded biases
rather than a clean fork. V2 and parts of V3 contribute to multiple routes. Ventral
regions become increasingly useful for analyzing form and surface properties, while
areas such as V3A, V6, and MT/V5 contribute to motion, depth, and spatial processing in
dorsal networks.

> **Self-explanation:** Why would a visual system preserve retinotopic position while
> also building neurons that combine information across progressively larger portions
> of the scene? Relate your answer to both localization and object structure.

> **Scene boundaries and limitations:** The shells show population-atlas locations.
> The VOF and broad superficial-white-matter grain add bundle-scale context, but they do
> not establish exact endpoints among these shells, processing order, or functional
> response. The tract and superficial-fibre shapes come from tractography; their motion
> does not. Bright VOF events use a seeded display model with a disclosed 50/50 direction
> assumption. The U-fibre texture is not endpoint-filtered, so displayed fibres may not
> connect the regions in this scene. Its vibration is analytically zero-mean: amplitude
> varies with a local-to-own fibre-length ratio, while frequency and phase are display
> choices. Neither animation is measured neural activity.

```atlas-scene
id: ventral-stream
title: The ventral stream builds object quality and identity
visual: atlas
camera:
  position: [205, -31, 118]
  target: [0, 11, 2]
  transition: { kind: ease, durationMs: 900 }
show:
  - layer.cortex
  - region.v1
  - region.v2
  - region.v3v
  - region.v4v
  - region.loa
  - region.lop
  - region.fg1
  - region.fg2
  - region.fg3
  - region.fg4
  - layer.swm
  - tract.ilf
  - tract.ifof
  - tract.vof
fidelity:
  - fidelity.cortex
  - fidelity.julich-regions
  - fidelity.association-tracts
  - fidelity.superficial-white-matter
hemispheres:
  global: { L: true, R: false }
cutaway: 50
tissueOpacity: 0.14
playback:
  playing: true
  speed: 70
  settled: false
selection:
  selected: region.v4v
  emphasized: [region.v3v, region.v4v, region.loa, region.lop, region.fg1, region.fg2, region.fg3, region.fg4, tract.ilf, tract.ifof, tract.vof]
  strength: 0.86
controls:
  mode: look
layout: detail
```

## Preview: the ventral stream

The ventral stream extends from occipital visual cortex toward lateral occipital and
ventral temporal cortex. Across this network, processing increasingly supports stable
descriptions of **object quality**---shape, surface, color, and category---even when an
object changes position, size, viewpoint, or illumination. “What” is useful shorthand,
but **vision for perception** better captures the stream's role in identifying and
describing what is seen.

```atlas-scene
id: dorsal-stream
title: The dorsal stream transforms vision for space and action
visual: atlas
camera:
  position: [184, 80, -94]
  target: [2, 9, -2]
  transition: { kind: ease, durationMs: 900 }
show:
  - layer.cortex
  - region.v1
  - region.v2
  - region.v3d
  - region.v3a
  - region.v6
  - region.mt
  - region.hip1
  - region.hip2
  - region.hip3
  - region.hip4
  - region.hip5
  - region.hip6
  - region.hip7
  - region.hip8
  - region.spl7a
  - region.spl7p
  - region.spl5l
  - region.spl5m
  - layer.swm
  - tract.slf1
  - tract.slf2
  - tract.slf3
  - tract.vof
fidelity:
  - fidelity.cortex
  - fidelity.julich-regions
  - fidelity.association-tracts
  - fidelity.superficial-white-matter
hemispheres:
  global: { L: true, R: false }
cutaway: 50
tissueOpacity: 0.13
playback:
  playing: true
  speed: 70
  settled: false
selection:
  selected: region.mt
  emphasized: [region.v3d, region.v3a, region.v6, region.mt, region.hip1, region.hip2, region.hip3, region.hip4, region.hip5, region.hip6, region.hip7, region.hip8, region.spl7a, region.spl7p, region.spl5l, region.spl5m, tract.slf1, tract.slf2, tract.slf3, tract.vof]
  strength: 0.84
controls:
  mode: look
layout: detail
```

## Preview: the dorsal stream

The dorsal stream extends from occipital visual cortex toward posterior parietal
cortex. Different parts of the network contribute different information. MT/V5 is
strongly involved in motion and binocular-disparity processing. V3A and V6 contribute
to motion, depth, and wide-field spatial analysis. Intraparietal and superior parietal
regions help convert visual information into forms useful for attention, eye movements,
reaching, and grasping.

“Where” captures spatial analysis, but **vision for action** describes the larger
problem. Reaching for an object requires the brain to continually relate the target to
the eyes, head, body, and moving hand. Dorsal processing therefore links vision to
time-sensitive sensorimotor control rather than merely reporting an address.

```atlas-scene
id: conclusion
title: Follow the hemifield from retina to cortex
visual: atlas
camera:
  position: [147, 53, -137]
  target: [0, 0, 0]
  transition: { kind: ease, durationMs: 900 }
show:
  - layer.cortex
  - pathway.anterior
  - pathway.optic-radiation
  - region.lgn
  - region.v1
fidelity:
  - fidelity.cortex
  - fidelity.julich-regions
  - fidelity.anterior-pathway
  - fidelity.optic-radiation
cutaway: 24
tissueOpacity: 0.14
playback:
  playing: true
  speed: 70
  settled: false
selection:
  selected: null
  emphasized: [pathway.anterior, pathway.optic-radiation, region.lgn, region.v1]
  strength: 0.7
controls:
  mode: look
layout: dominant
```

## Conclusion: Follow the Hemifield

Return to the opening prediction. Loss of the **left visual hemifield in both eyes** is
a left homonymous hemianopia. The lesion is therefore **after the chiasm on the right**,
somewhere along the right optic tract, LGN, optic radiation, or V1. Those structures
all represent the left side of visual space using input from both eyes.

The route explains why:

- The **retina** converts light into parallel neural descriptions and emphasizes local
  contrast rather than sending a complete picture.
- The **optic chiasm** regroups those signals by visual hemifield: nasal fibres cross,
  whereas temporal fibres remain on the same side.
- The **LGN** preserves retinotopy, keeps major eye and channel signals organized, and
  regulates transmission rather than acting as a passive junction.
- The **optic radiation** carries that topographic organization toward V1. Its temporal
  and parietal routes help relate visual-field defects to lesion location.
- **V1** preserves a cortical map of the opposite visual hemifield while expanding
  central vision and building selectivity for local visual structure.

**V2 and parts of V3** continue early cortical processing and contribute to multiple
downstream routes; the system does not split into two isolated pathways immediately
after V1. Beyond these shared stages, recurrent extrastriate networks combine information
over larger portions of the field. The ventral and dorsal stream scenes are a brief
preview of later biases toward vision for perception and vision for action. These
interacting networks extend the transformations of early vision rather than replacing
them.

> **Final retrieval:** Trace the right visual hemifield from both retinas to V1 without
> looking back. At each stage, name one feature that is preserved and one transformation
> that occurs.

> **Scene limitations and boundaries:** This closing view reprises the mixed-fidelity
> whole pathway. The cortical and region meshes are population-atlas anatomy; the left
> optic radiation is population tractography and the displayed right side is mirrored;
> the anterior eye-to-LGN segment is schematic. All moving-event timing remains
> illustrative rather than measured physiology.
