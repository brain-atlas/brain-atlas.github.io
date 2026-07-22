// Visual-pathway landmarks, authored in MNI152NLin2009cAsym RAS millimetres.
//   +x = right, +y = anterior, +z = superior   (standard MNI/RAS)
// The 2009c landmarks and decoded HCP-1065 2009a fibre world points share the
// runtime RAS-mm frame; src/main.js applies ONE proper transform to that frame.
// The posterior pathway (LGN -> V1) is real FIB-derived optic-radiation streamline
// data; only the anterior segment below (retina -> chiasm -> LGN) is schematic.

// Region centroids (Julich-Brain, measured from the meshes) + illustrative
// anterior landmarks (eyes, chiasm, optic-nerve midpoints).
const LE = [-30, 62, -30], RE = [30, 62, -30];        // orbits (anterior, inferior)
const CHI = [0, 2, -12];                               // optic chiasm (midline, suprasellar)
const LGNL = [-23.7, -24.3, -8.5], LGNR = [23.7, -24.3, -8.5];
const V1L = [-11, -82, 3], V1R = [11, -82, 3];
const midL = [-18, 32, -20], midR = [18, 32, -20];     // optic-nerve control points

// Schematic anterior pathway: each eye's nasal (crossing) fibres to the
// CONTRALATERAL LGN. The decussation at the chiasm is the real topology; the
// curvature is illustrative. There is intentionally no posterior schematic here
// — the real streamlines carry the signal from the LGN back to V1.
export const ANT_PATHS = [
  { color: '#b678ea', cp: [RE, midR, CHI, LGNL] },
  { color: '#ff5d54', cp: [LE, midL, CHI, LGNR] },
];

export const LANDMARKS = [
  { p: LE, t: 'Left eye' }, { p: RE, t: 'Right eye' }, { p: CHI, t: 'Optic chiasm' },
  { p: LGNL, t: 'LGN (L)' }, { p: LGNR, t: 'LGN (R)' },
  { p: V1L, t: 'V1 (L)' }, { p: V1R, t: 'V1 (R)' },
  // tract labels, pinned to fixed points on the left optic radiation
  { p: [-30, -60, 5], t: 'Optic radiation', tract: true },
  { p: [-32, -38, -12], t: "Meyer's loop", tract: true },
];

// Only the schematic anterior landmarks get marker spheres; the LGN and V1 now
// have real region shells, so their dots are removed.
export const SPHERES = [
  { p: LE, r: 5.5 }, { p: RE, r: 5.5 }, { p: CHI, r: 4 },
];
