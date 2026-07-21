---
title: From retina to V1
schema: 1
entryScene: orientation
summary: Follow a visual signal from the eyes through the thalamus to primary visual cortex.
---

# From retina to V1

A visual signal reaches cortex through a sequence of relays and long-range projections.
In four scenes, follow the represented path from the eyes to the optic chiasm, bilateral
LGN, optic radiation, and V1.

The 3D stage combines atlas-derived anatomy with teaching geometry and modeled display
activity. **Model & sources** keeps those categories separate wherever they matter.

```atlas-scene
id: orientation
title: Topic overview
visual: atlas
camera:
  position: [210, 75, -195]
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

## Topic overview

The entry view shows the pathway relevant to this topic: eyes and chiasm, bilateral LGN,
optic radiation, V1, and the cortical surface that contains them. Other atlas regions,
association bundles, and superficial white matter are filtered out so the topic begins
without unrelated anatomy.

The overview still mixes representation types. The anterior eye-to-LGN curves are
**schematic teaching geometry**; the LGN, V1, cortex, and optic-radiation contours are
atlas-derived or derived from atlas data; and the activity timing is modeled. Shared
placement does not make the schematic curves measured anatomy.

```atlas-scene
id: nasal-crossing
title: Nasal fibres cross at the chiasm
visual: atlas
camera:
  position: [0, 30, -350]
  target: [0, 0, 0]
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

## Nasal fibres cross at the chiasm

In the current schematic, **only the nasal-retinal paths are drawn**. Each represented
path crosses the midline at the optic chiasm before reaching the contralateral LGN.

The uncrossed temporal-retinal pathways remain ipsilateral in the biological system,
but they are omitted from this drawing. The anterior stage is therefore **not a complete
depiction** of either eye's projection or of both visual hemifields. The moving dots
show direction for the represented teaching path; their spacing and speed are
illustrative.

```atlas-scene
id: lgn-relay
title: The LGN is the thalamic relay
visual: atlas
camera:
  position: [130, 280, -180]
  target: [0, 0, 0]
  transition: { kind: ease, durationMs: 900 }
show: [layer.cortex, pathway.anterior, region.lgn]
fidelity: [fidelity.anterior-pathway, fidelity.julich-regions]
cutaway: 42
tissueOpacity: 0.11
playback:
  playing: false
  speed: 70
  settled: true
selection:
  selected: region.lgn
  emphasized: [region.lgn]
  strength: 0.9
controls:
  mode: look
layout: detail
```

## The LGN is the thalamic relay

The bilateral LGN shells mark the population-atlas location of this thalamic relay.
Each LGN represents the opposite visual hemifield through input from both eyes: crossed
nasal-retinal fibres from one eye and uncrossed temporal-retinal fibres from the other.

Only the crossed component appears in the anterior schematic. The shell outlines are
atlas maximum-probability boundaries, not an individual's functional borders, and this
settled scene does not claim to show recorded LGN firing.

```atlas-scene
id: optic-radiation
title: The optic radiation carries the signal posteriorly
visual: atlas
camera:
  position: [300, 15, 0]
  target: [0, 0, 0]
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

## The optic radiation carries the signal posteriorly

From the LGN, the represented projection travels posteriorly to V1 along optic-radiation
streamlines. The left-side contours are derived from population HCP-1065 tractography;
the displayed **right side is mirrored** from the left rather than independently
tracked.

The bright LGN-to-V1 events are a display model. Their direction follows the biological
projection, but their rates, bursts, time dilation, and travel **timing are
illustrative**—they are not recorded spikes or measured physiology.

```atlas-scene
id: v1-arrival
title: The pathway arrives in V1
visual: atlas
camera:
  position: [0, 30, 350]
  target: [0, 0, 0]
  transition: { kind: ease, durationMs: 900 }
show: [layer.cortex, pathway.optic-radiation, region.v1]
fidelity: [fidelity.julich-regions, fidelity.optic-radiation]
cutaway: 38
tissueOpacity: 0.16
playback:
  playing: false
  speed: 70
  settled: true
selection:
  selected: region.v1
  emphasized: [region.v1]
  strength: 0.95
controls:
  mode: look
layout: detail
```

## The pathway arrives in V1

The optic radiation terminates in the displayed bilateral V1 shells at the posterior
cortex. This view supports the spatial sequence **retina → LGN → V1** and the posterior
course of the projection.

It does not show an individual's cortex, measured spike timing, or a complete retinal
wiring diagram. The right optic-radiation geometry remains mirrored, and the event
timing remains illustrative rather than measured physiology.

You can revisit any scene with Previous and Next. During a camera transition, Skip
moves directly to the authored destination and settles the display.
