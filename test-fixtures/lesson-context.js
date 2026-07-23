export const TEST_CATALOG = {
  entityIds: [
    'pathway.anterior',
    'region.dlpfc',
    'region.lgn',
    'region.spl7a',
    'tract.ilf',
    'tract.slf1',
  ],
  visualIds: ['atlas', 'retinotopy-diagram'],
  fidelityIds: [
    'fidelity.anterior-pathway',
    'fidelity.julich-regions',
    'fidelity.association-tracts',
  ],
  fibreFilterSelectorIds: [
    'endpoint.ambiguous',
    'endpoint.unknown',
    'region.dlpfc',
    'region.lgn',
    'region.spl7a',
  ],
  fibreFilterPresetIds: ['fibre-filter.test'],
  fibreFilterPresetsById: {
    'fibre-filter.test': {
      id: 'fibre-filter.test',
      label: 'Test preset',
      description: 'Test endpoint filter preset.',
      hemispherePolicy: 'inherit-scene',
      query: {
        mode: 'touches-any',
        setA: ['region.lgn'],
        setB: [],
      },
    },
  },
  cameraPresets: {
    dorsal: { position: [120, 260, 80], target: [0, 0, 0] },
    home: { position: [200, 120, 300], target: [0, 0, 0] },
    lateral: { position: [300, 15, 0], target: [0, 0, 0] },
  },
  entitiesById: {
    'pathway.anterior': { hemisphereMode: 'none' },
    'region.dlpfc': { hemisphereMode: 'bilateral' },
    'region.lgn': { hemisphereMode: 'bilateral' },
    'region.spl7a': { hemisphereMode: 'bilateral' },
    'tract.ilf': { hemisphereMode: 'bilateral' },
    'tract.slf1': { hemisphereMode: 'bilateral' },
  },
};

export const MINIMAL_SCENE = {
  id: 'chiasm',
  visual: 'atlas',
  camera: 'lateral',
  show: ['region.lgn', 'pathway.anterior'],
  controls: { mode: 'look' },
  layout: 'dominant',
};
