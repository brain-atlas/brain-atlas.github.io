---
id: frontoparietal-orientation
title: Compare a second entity set
schema: 1
summary: Contract fixture for a non-chiasm scene sequence.
---

# Compare a second entity set

This fixture proves that lesson parsing does not contain visual-pathway-specific ID rules.
It does not assert that the displayed regions are measured endpoints of the tract.

```atlas-scene
id: dorsal-overview
title: Dorsal overview
visual: atlas
camera: dorsal
show: [region.spl7a, region.dlpfc, tract.slf1]
hemispheres:
  global: { L: true, R: true }
  entities:
    tract.slf1: { L: true, R: false }
selection:
  selected: null
  emphasized: [region.spl7a, tract.slf1]
  strength: 0.7
controls:
  mode: explore
layout: dominant
```

## Independent orientation

The scene uses stable region and tract IDs while keeping interpretation in ordinary prose.

```js
// This is an inert code example, never executable lesson behavior.
console.log('example');
```
