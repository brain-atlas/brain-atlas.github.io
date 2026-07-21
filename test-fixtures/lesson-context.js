export const TEST_CATALOG = {
  entityIds: ['pathway.anterior', 'region.lgn', 'tract.ilf'],
  visualIds: ['atlas', 'retinotopy-diagram'],
  cameraPresets: {
    home: { position: [200, 120, 300], target: [0, 0, 0] },
    lateral: { position: [300, 15, 0], target: [0, 0, 0] },
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
