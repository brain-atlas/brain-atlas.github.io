---
title: How visual fields cross
schema: 1
summary: Follow a signal from the eyes to the thalamic relay.
visuals:
  - id: retinotopy-diagram
    type: image
    src: https://example.org/retinotopy.png
    alt: Diagram showing nasal and temporal retinal fields
    caption: Visual-field projection before the chiasm
    credit: Example Author
    source: https://example.org/source
---

# How visual fields cross

This lesson follows a schematic anterior pathway and atlas-derived structures.

- Headings and lists remain ordinary prose.
- Only explicit scene fences change the visual state.

```atlas-scene
id: chiasm
title: Crossing at the chiasm
visual: atlas
camera: lateral
show: [pathway.anterior, region.lgn]
controls:
  mode: look
layout: dominant
```

## Crossing at the chiasm

The anterior segment is schematic; open **Model & sources** before interpreting its geometry.

```atlas-scene
id: relay
title: Compare the relay visual
visual: retinotopy-diagram
camera: home
show: [region.lgn]
playback:
  playing: false
  settled: true
controls:
  mode: guided
layout: split
```

## Compare a supplementary visual

The declared image is learner-facing content with complete alternative metadata.
