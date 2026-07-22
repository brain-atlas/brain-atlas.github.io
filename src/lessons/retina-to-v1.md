---
title: "Early vision: from retina to cortical streams"
schema: 1
status: draft
entryScene: orientation
summary: Explain how early visual signals are transformed from retinal circuits through V1 into interacting ventral and dorsal cortical streams.
---

# Early vision: from retina to cortical streams

Early vision is not a camera feeding a picture into the brain. At each stage, neural
circuits select, reorganize, and transform information. The pathway's anatomy makes one
of its central organizing principles visible: after the optic chiasm, signals are
grouped by **visual hemifield**, not by eye.

> **Predict before you begin:** A patient loses the left half of visual space in both
> eyes. Is the damaged site more likely to be before or after the optic chiasm, and on
> which side of the brain? Commit to an answer and return to it in scene 4.

By the end of eight scenes, you should be able to:

1. trace either visual hemifield through both retinas to the opposite LGN and V1;
2. distinguish what the retina, LGN, optic radiation, and V1 contribute;
3. predict characteristic visual-field loss from lesions at different pathway levels;
4. explain the different computational biases of the ventral and dorsal streams; and
5. explain why the two-stream framework describes interacting networks rather than two
   isolated one-way pipelines, while separating biological claims from modeled display.

The core sequence begins **retina → optic nerve → optic chiasm → optic tract → LGN →
optic radiation → V1**, then expands through recurrent extrastriate networks toward
ventral occipitotemporal and dorsal occipitoparietal cortex. Keep your own left and
right separate from the patient's left and right, and remember that a retinal image is
reversed across both horizontal and vertical axes.

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

## Organize the early visual system

Begin with the whole system: paired eyes and optic nerves converge at the chiasm;
post-chiasmal projections reach the paired LGN in the thalamus; optic radiations fan
posteriorly toward V1 around the calcarine sulcus. The pathway carries an orderly map
of visual space while changing how the information is encoded.

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

One foundational description is the **center-surround receptive field**. ON-center and
OFF-center pathways respond differently to local increments and decrements in light.
Because center and surround oppose one another, a ganglion cell emphasizes local
contrast more than uniform illumination. Other ganglion-cell types carry different
combinations of spatial, temporal, color, and motion-related information.

Partial crossing at the optic chiasm then reorganizes those parallel signals:

- The **left visual hemifield** falls on the nasal retina of the left eye and temporal
  retina of the right eye. The nasal fibres cross; the temporal fibres do not. Both
  components therefore enter the **right optic tract**.
- The **right visual hemifield** reaches the nasal retina of the right eye and temporal
  retina of the left eye, then converges in the **left optic tract**.

This yields a useful rule: each optic nerve represents one eye, whereas each optic
tract represents the opposite visual hemifield from both eyes.

> **Check your model:** Covering one eye removes input from one optic nerve. Damage to
> one optic tract instead removes the same visual hemifield from both eyes. Explain why
> before continuing.

> **Model boundary:** In the current schematic, only the nasal-retinal paths are drawn.
> The uncrossed temporal-retinal pathways are biologically present but
> omitted, so this is **not a complete depiction** of either eye's projection or both
> hemifields. Moving dots show direction along the represented teaching path; their
> spacing and speed are illustrative.

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

Each lateral geniculate nucleus (LGN) represents the **contralateral visual hemifield**
using input from both eyes. Retinotopic order is preserved: neighboring locations in
visual space remain systematically related within the LGN. Inputs from the two eyes do
not simply blend. In primates, the six principal layers keep eye-of-origin and major
signal classes substantially segregated, with koniocellular zones between them.

The familiar magnocellular, parvocellular, and koniocellular streams emphasize
different—but interacting—features:

- magnocellular pathways are especially sensitive to rapid luminance changes and low
  contrast;
- parvocellular pathways support fine spatial detail and red-green opponent signals;
- koniocellular pathways are heterogeneous and include blue-yellow opponent signals.

Calling the LGN a *relay* should not imply a passive cable junction. Retinal drive is
shaped by local inhibition, brainstem state signals, and extensive feedback from visual
cortex. These influences can regulate which signals are transmitted and when, while
the LGN preserves the spatial organization needed by cortex.

> **Retrieval check:** Without rereading scene 1, explain how one LGN can receive input
> from both eyes while representing only one visual hemifield.

> **Model boundary:** This view keeps the population-atlas LGN source, optic-radiation
> trajectory, and V1 destination in frame while retaining schematic incoming context.
> It does not resolve LGN layers, parallel channels, synapses, or measured firing. The
> anterior segment is schematic, optic-radiation geometry is population tractography
> with a mirrored right side, and all displayed timing is illustrative.

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
cutaway: 58
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
the route and at the cortical destination.

Its broad clinical organization turns visual-field loss into a localization tool.
Fibres representing the **upper visual field** arise from inferior retina and sweep
anteriorly through the temporal lobe in Meyer's loop before reaching the lower bank of
the calcarine sulcus. Fibres representing the **lower visual field** take a more
superior parietal course to the upper bank.

> **Predict, then check:** What would selective damage to the right temporal optic
> radiation remove? It should produce a **left superior quadrantanopia** in both eyes:
> loss of the upper-left quarter of visual space. A larger right post-chiasmal lesion
> can remove the entire left hemifield.

The lesion rule is powerful but not perfectly geometric in individual patients.
Fibre trajectories vary, lesions cross pathway boundaries, and field defects can be
incomplete or incongruent.

> **Model boundary:** The displayed streamlines show the gross LGN-to-V1 projection,
> not separate retinotopic lanes or a patient-specific Meyer's loop. The left-side
> contours are derived from population HCP-1065 tractography; the displayed right side is mirrored
> rather than independently tracked. Bright events move in the
> supported LGN-to-V1 direction, but their rates, bursts, speed, and **timing are
> illustrative**—they are **not recorded spikes** or measured physiology.

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
cutaway: 38
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

The optic radiation terminates primarily in layer 4 of primary visual cortex (V1),
which lies largely along the calcarine sulcus. Each V1 represents the opposite visual
hemifield. The map is **retinotopic**, but it is not scaled like the retinal image:
central vision receives disproportionately large cortical territory, a property called
**cortical magnification**.

V1 also transforms the representation. Many neurons respond selectively to local
features such as edge orientation, spatial scale, position, motion direction, or input
from the two eyes. These selectivities arise within layered feedforward circuits and
are reshaped by local recurrence and feedback. V1 is therefore neither a passive
screen nor the place where visual perception is completed; it supplies structured
representations to a larger recurrent network of visual areas.

Classic physiology made these ideas experimentally concrete. Stephen Kuffler mapped
center-surround retinal receptive fields using spots of light. David Hubel and Torsten
Wiesel then showed how neurons in cat visual cortex respond to oriented
contours and are organized across cortex. Human lesion maps and modern functional MRI
connect that cellular work to the retinotopic organization of human V1.

> **Checkpoint:** Close your eyes or look away and reconstruct the pathway to V1. At
> each arrow, name what is preserved and what changes: retinal encoding → hemifield
> regrouping → thalamic organization and regulation → topographic white-matter
> projection → cortical mapping and feature selectivity.

Return to the opening case. Loss of the **left visual hemifield in both eyes** is a
left homonymous hemianopia. It localizes **after the chiasm on the right**—for example,
the right optic tract, LGN, optic radiation, or V1—because those structures represent
the left side of visual space from both eyes.

Use the same model to distinguish four lesion patterns:

1. one optic nerve → monocular visual loss in that eye;
2. central optic chiasm → preferential loss of both temporal visual fields;
3. one post-chiasmal pathway → contralateral homonymous visual-field loss;
4. temporal optic radiation → contralateral superior quadrantanopia.

> **Model boundary:** The V1 shells are population-atlas boundaries, not an
> individual's cortex or a map of eccentricity, polar angle, layers, columns, or cell
> responses. The right optic-radiation geometry remains mirrored, and displayed event
> timing remains illustrative rather than measured physiology.

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

V1 is an entrance to cortical vision, not its endpoint. Signals reach V2 and other
extrastriate areas through multiple feedforward routes, while extensive lateral and
feedback connections send information in the opposite direction. The result is a
distributed recurrent network, not a single assembly line.

Many early extrastriate areas retain maps of visual space while combining information
over larger regions and becoming selective for different mixtures of form, color,
depth, and motion. V2 participates in both major streams. Ventral subdivisions of V3
and V4 lie toward occipitotemporal cortex; dorsal V3, V3A, V6, and MT/V5 contribute to
occipitoparietal processing. These are graded biases and overlapping routes, not a
clean fork at one anatomical point.

> **Self-explanation:** Why would a visual system preserve retinotopic position while
> also building neurons that combine information across progressively larger portions
> of the scene? Relate your answer to both localization and object structure.

> **Model boundary:** The shells show population-atlas locations. The VOF and broad
> superficial-white-matter grain add bundle-scale context, but they do not establish
> exact endpoints among these shells, processing order, or functional response. Bright
> VOF events sample a disclosed 50/50 direction assumption; the U-fibre texture is not
> endpoint-filtered and uses zero-mean vibration. Neither animation is measured neural
> activity.

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
cutaway: 36
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

## The ventral stream builds object quality and identity

The ventral stream extends from occipital visual cortex toward lateral occipital and
ventral temporal cortex. Its computations increasingly support stable descriptions of
**object quality**—shape, surface, color, and category—despite changes in position,
size, viewpoint, or illumination. “What” is a useful shorthand, but **vision for
perception** better captures its role in identifying and describing what is seen.

This is not a rigid sequence in which one area finishes color, another finishes shape,
and a final area names the object. Ventral cortex contains overlapping, recurrent
representations. Retinotopic biases persist, lateral occipital regions respond strongly
to object form, and ventral temporal cortex contains spatially organized patterns that
support categorization at several levels. Memory, attention, context, and task goals
feed back into this network.

> **Transfer:** A person can orient the hand appropriately to post a card through a
> slot but cannot reliably report the slot's orientation. Which stream is more likely
> to be disproportionately impaired? The pattern points toward ventral perceptual
> processing, while reminding us that preserved action does not mean the streams are
> independent.

Ventral occipitotemporal damage can produce selective disturbances of color, face, or
object recognition, but symptoms depend on lesion extent and network organization.
The presence of a named atlas area never licenses a one-region/one-function diagnosis.

> **Model boundary:** The displayed V4v, lateral occipital, and fusiform shells provide
> anatomical context. The ILF, IFOF, and VOF contours do not establish that those
> shells are their exact endpoints or that impulses carry object representations.
> Long-tract events sample a disclosed 50/50 direction assumption; broad U-fibre grain
> is not endpoint-filtered and uses zero-mean vibration. Both motions are illustrative,
> not measured activity or an individual's functional localizers.

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
cutaway: 45
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

## The dorsal stream transforms vision for space and action

The dorsal stream extends from occipital visual cortex toward posterior parietal
cortex. MT/V5 is strongly involved in motion and binocular-disparity processing; V3A
and V6 contribute to motion, depth, and wide-field spatial analysis; intraparietal and
superior parietal regions transform visual information into coordinates useful for
attention, eye movements, reaching, and grasping.

“Where” captures spatial processing, but **vision for action** or “how” emphasizes a
deeper computational demand. A reach must continually relate a target to the eyes,
head, body, and moving hand. Dorsal processing therefore links perception to
time-sensitive sensorimotor transformations rather than merely reporting an object's
address.

The dorsal stream is itself a family of routes, including projections toward premotor
and prefrontal systems and toward medial temporal systems involved in navigation and
spatial memory. Those extended routes are outside the anatomy claimed by this lesson.

> **Transfer:** A person recognizes and describes a cup but reaches to the wrong place
> or misorients the hand when trying to grasp it. Which stream is more likely to be
> disproportionately impaired? That pattern is consistent with dorsal visuomotor
> dysfunction, as in optic ataxia.

> **Model boundary:** The displayed MT/V5, V3A, V6, intraparietal, and superior parietal
> shells do not show motion responses or computations. The SLF I–III and VOF contours
> do not establish exact endpoints among these shells or one exclusive function.
> Long-tract events sample a disclosed 50/50 direction assumption; broad U-fibre grain
> is not endpoint-filtered and uses zero-mean vibration. Both motions are illustrative.

```atlas-scene
id: streams-integrate
title: Perception and action depend on interacting streams
visual: atlas
camera:
  position: [198, 59, 169]
  target: [2, -8, 7]
  transition: { kind: ease, durationMs: 900 }
show:
  - layer.cortex
  - region.v1
  - region.v2
  - region.v4v
  - region.loa
  - region.fg2
  - region.mt
  - region.v6
  - region.hip1
  - region.spl7a
  - layer.swm
  - tract.ilf
  - tract.slf2
  - tract.vof
fidelity:
  - fidelity.cortex
  - fidelity.julich-regions
  - fidelity.association-tracts
  - fidelity.superficial-white-matter
cutaway: 40
tissueOpacity: 0.14
playback:
  playing: true
  speed: 70
  settled: false
selection:
  selected: null
  emphasized: [region.v1, region.v2, region.v4v, region.loa, region.fg2, region.mt, region.v6, region.hip1, region.spl7a, tract.ilf, tract.slf2, tract.vof]
  strength: 0.76
controls:
  mode: look
layout: dominant
```

## Perception and action depend on interacting streams

The two-stream framework explains important functional biases, not a complete wiring
diagram. Both streams receive mixed visual information, communicate with one another,
and participate in recurrent loops with attention, memory, and motor systems. A simple
act such as picking up a familiar mug needs ventral information about identity and
handle structure together with dorsal information about current location, pose, and
the changing relationship between hand and target.

The framework also evolved with the evidence. Monkey lesion studies motivated the
classic ventral “what” and dorsal “where” distinction. Neuropsychological dissociations
then sharpened it toward ventral vision-for-perception and dorsal vision-for-action.
Modern anatomical and functional work replaces two serial chains with interacting,
branched, recurrent networks whose specializations are real but incomplete.

> **Cumulative retrieval:** Reconstruct the whole system without rereading. For each
> stage, state its dominant contribution: retinal parallel encoding; chiasmatic
> hemifield regrouping; LGN organization and regulation; optic-radiation topography; V1
> retinotopy and local feature selectivity; ventral object-quality representations; and
> dorsal spatial and visuomotor transformations.

> **Final transfer:** You must recognize a moving friend in a crowd, locate them as you
> move, and reach out for a handshake. Identify at least one contribution from retinal
> or early cortical processing, the ventral stream, and the dorsal stream. Then explain
> why failure at one stage cannot always be localized from behavior alone.

> **Model boundary:** This view juxtaposes representative cortical territories with
> ILF, SLF II, and VOF bundle-scale context. Their simultaneous display does not
> establish exact region-to-region connections, information flow, functional
> selectivity, or independence. Long-tract events use the disclosed 50/50 direction
> assumption; broad U-fibre grain is not endpoint-filtered and uses zero-mean
> vibration. Spatial proximity and illustrative motion are not evidence of a route.
