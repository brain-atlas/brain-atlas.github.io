import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { CSS2DRenderer, CSS2DObject } from 'three/addons/renderers/CSS2DRenderer.js';
import { ANT_PATHS, LANDMARKS, SPHERES } from './pathways.js';
import {
  advanceAssociationTime,
  associationGroupsFromManifest,
  associationModelFromManifest,
  canonicalContourDistance,
  createAssociationImpulseEngine,
  updateAssociationEventPool,
} from './activity/association-impulses.js';
import {
  DIRECTED_TRAVEL_SPEED_MNI_MM_PER_DISPLAY_SECOND,
  contourTransitDuration,
  createContourDistanceProfile,
  distanceAfterDisplayTime,
  sampleContourDistance,
} from './activity/physical-contour-travel.js';
import { createSwmVibration, vibrationContourParameter } from './activity/swm-vibration.js';
import { createFrameDeltaReader } from './activity/frame-time.js';
import {
  ALL_FIBRE_FILTER,
  createFibreEndpointIndex,
  filterFibreEndpoints,
  formatFibreFilterSummary,
  writeFilteredEndpointPositions,
  writeFilteredLineSegments,
} from './fibre-endpoint-filter.js';
import { createRendererAdapter } from './lesson/index.js';
import { createCameraTransition, sampleCameraTransition } from './ui/camera-transition.js';
import { createVisibilityTransition, sampleVisibilityTransition } from './ui/visibility-transition.js';
import {
  anatomyPointerNdc,
  anatomyTapIntent,
  nearestAnatomyHit,
} from './ui/anatomy-inspector.js';

// ---------------------------------------------------------------------------
const stage = document.getElementById('stage');
const rendererReducedMotionQuery = matchMedia('(prefers-reduced-motion: reduce)');
let reduce = rendererReducedMotionQuery.matches;
rendererReducedMotionQuery.addEventListener('change', ({ matches }) => {
  reduce = matches;
  if (matches) controls.autoRotate = false;
  applyLessonPlaybackRequest();
});

const viewerReadyParts = new Set();
let resolveViewerReady, rejectViewerReady;
export const viewerReady = new Promise((resolve, reject) => {
  resolveViewerReady = resolve;
  rejectViewerReady = reject;
});
function markViewerReady(part) {
  viewerReadyParts.add(part);
  if (viewerReadyParts.has('regions') && viewerReadyParts.has('tracts')) resolveViewerReady();
}
function failViewerReady(error) {
  rejectViewerReady(error instanceof Error ? error : new Error(String(error)));
}

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
renderer.setClearColor(0x000000, 0);
renderer.localClippingEnabled = true;
stage.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.className = 'label-layer';
stage.appendChild(labelRenderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 1, 5000);
const HOME = new THREE.Vector3(210, 75, -195);   // right / above / anterior 3-quarter
camera.position.copy(HOME);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.set(0, 0, 0);
controls.autoRotate = !reduce;
controls.autoRotateSpeed = 0.55;
controls.minDistance = 30;
controls.maxDistance = 900;
controls.screenSpacePanning = true;   // pan moves in the screen plane (right-drag / two-finger)
if (import.meta.env.DEV) window.__view = { camera, controls, scene, THREE };

scene.add(new THREE.AmbientLight(0x8ea4c8, 0.85));
const key = new THREE.DirectionalLight(0xffffff, 1.1); key.position.set(1, 1.2, 1.4); scene.add(key);
const fill = new THREE.DirectionalLight(0x88aaff, 0.5); fill.position.set(-1.2, -0.4, -1); scene.add(fill);

// ---------------------------------------------------------------------------
// MNI/ICBM RAS -> scene transform. This is the ONLY runtime coordinate transform.
// Cortical and region assets are MNI152NLin2009cAsym. Association tracts are
// verified ICBM-2009a Nonlinear Asymmetric; OR/SWM use the exact nonlinear
// ICBM152-2009a HCP FIB, with its asymmetric variant indicated but not directly
// build-bound. Decoded RAS+ world frames survive resampling; no 2009a->2009c
// template warp exists. See docs/TRACT_SPACE_PROVENANCE.md.
// The scene frame is RIGHT-HANDED:
//   +x = right,  +y = up (MNI superior),  +z = posterior (MNI -anterior).
// The proper -90 deg R-axis rotation (determinant +1) preserves left/right and
// chirality. Never fit a dataset here: any correction belongs in the documented
// offline pipeline so every layer continues to share this one runtime transform.
const MNI_CENTER = new THREE.Vector3(0, -17.5, 5);   // MNI bbox centre of the brain shell
const MNI_SCALE = 1.0;                                // scene units are millimetres
const sceneFromMni = new THREE.Matrix4()
  .makeScale(MNI_SCALE, MNI_SCALE, MNI_SCALE)
  .multiply(new THREE.Matrix4().makeRotationX(-Math.PI / 2))
  .multiply(new THREE.Matrix4().makeTranslation(-MNI_CENTER.x, -MNI_CENTER.y, -MNI_CENTER.z));
const mniGroup = new THREE.Group();
mniGroup.matrixAutoUpdate = false;
mniGroup.matrix.copy(sceneFromMni);
mniGroup.matrixWorldNeedsUpdate = true;
scene.add(mniGroup);

// ---------------------------------------------------------------------------
// Brain surface — MNI152 template shell (marching cubes on the brain mask).
const clipPlane = new THREE.Plane(new THREE.Vector3(-1, 0, 0), 80);
const brainMat = new THREE.MeshStandardMaterial({
  color: 0x9fb4d6, transparent: true, opacity: 0.16, roughness: 0.6, metalness: 0.02,
  side: THREE.DoubleSide, depthWrite: false, clippingPlanes: [clipPlane], flatShading: false,
});
const brainGroup = new THREE.Group(); mniGroup.add(brainGroup);
function loadBrain() {
  new GLTFLoader().load('/models/brain_mni.glb', (g) => {
    g.scene.traverse((n) => {
      if (n.isMesh) {
        if (!n.geometry.attributes.normal) n.geometry.computeVertexNormals();
        n.material = brainMat;
      }
    });
    brainGroup.add(g.scene);
    reapplyLessonMaterialFactors(brainGroup);
  }, undefined, (e) => console.warn('brain load failed:', e));
}

// ---------------------------------------------------------------------------
// Shared point sprite
function sprite() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.3, 'rgba(255,255,255,0.85)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
const SPR = sprite();

// ---------------------------------------------------------------------------
// Schematic anterior pathway (eye -> chiasm -> LGN): glowing tubes + flow dots.
const NP = 26;
const flows = [];
const anteriorGroup = new THREE.Group(); mniGroup.add(anteriorGroup);   // schematic eye->LGN + its markers
for (const path of ANT_PATHS) {
  const col = new THREE.Color(path.color);
  const curve = new THREE.CatmullRomCurve3(path.cp.map((v) => new THREE.Vector3(...v)), false, 'centripetal');
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 90, 1.0, 8, false),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.5 }));
  anteriorGroup.add(tube);
  const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 2.4, 8, false),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false }));
  anteriorGroup.add(glow);

  const pos = new Float32Array(NP * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  const points = new THREE.Points(geo, new THREE.PointsMaterial({
    color: col, size: 1.25, map: SPR, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true }));
  anteriorGroup.add(points);
  const profile = createContourDistanceProfile(curve.getSpacedPoints(128));
  flows.push({ profile, geo, pos, points });
}

// Landmark spheres (eyes/chiasm) + CSS2D labels
const sphereGeo = new THREE.SphereGeometry(1, 20, 20);
const sphereMat = new THREE.MeshBasicMaterial({ color: 0xe8f0fb });
const landmarkMarkersById = {};
for (const s of SPHERES) {
  const material = sphereMat.clone();
  material.userData.inspectionBaseColor = material.color.getHex();
  const m = new THREE.Mesh(sphereGeo, material);
  m.userData = { landmarkId: s.id };
  m.position.set(...s.p); m.scale.setScalar(s.r); anteriorGroup.add(m);
  landmarkMarkersById[s.id] = m;
}
const labelGroup = new THREE.Group(); mniGroup.add(labelGroup);
for (const lb of LANDMARKS) {
  const div = document.createElement('div'); div.className = 'lbl3d'; div.textContent = lb.t;
  if (lb.tract) { div.style.color = '#ffc27a'; div.style.borderColor = 'rgba(255,176,74,.5)'; }
  const o = new CSS2DObject(div); o.position.set(...lb.p); labelGroup.add(o);
}

// ---------------------------------------------------------------------------
// Region shells — Julich-Brain MPM (winner-take-all), loaded from a manifest.
// Real bilateral meshes (own L/R labels) so no mirroring; each region is one
// group tagged with tree metadata (id, name, parent) for later visibility logic.
const regionGroup = new THREE.Group(); mniGroup.add(regionGroup);
const regionsById = {};
const regionMetadataById = {};
const regionMeshLoads = new Set();
const orLines = {}, orCaps = {};
const hemiState = { L: true, R: true };     // global master L/R filter (ANDs with per-item)
const regionHemi = {};                      // id -> {L,R} per-region hemisphere visibility
const tractsById = {}, tractHemi = {};      // association tracts + their L/R visibility
let lessonVisibilityActive = false;
let lessonRendererVisibility = new Set();
function lessonAllows(kind, id) {
  return !lessonVisibilityActive || lessonRendererVisibility.has(`${kind}:${id}`);
}
function applyRegionMesh(id) {
  const grp = regionsById[id], rh = regionHemi[id] || { L: true, R: true };
  if (grp) {
    grp.visible = lessonAllows('region', id);
    grp.traverse((n) => { if (n.isMesh && n.userData && n.userData.hemi) n.visible = hemiState[n.userData.hemi] && rh[n.userData.hemi]; });
  }
}
function applyTractMesh(id) {
  const t = tractsById[id], th = tractHemi[id] || { L: true, R: true };
  if (t) for (const h of ['L', 'R']) {
    const vis = lessonAllows('tract', id) && hemiState[h] && th[h];
    if (t.lines[h]) t.lines[h].visible = vis;
    if (t.caps && t.caps[h]) t.caps[h].visible = vis;
  }
}
function applyHemi() {
  recalculateFibreFilter();
  for (const id in regionsById) applyRegionMesh(id);
  for (const id in tractsById) applyTractMesh(id);
  for (const h of ['L', 'R']) {
    const orVisible = lessonAllows('layer', 'or') && hemiState[h];
    const swmVisible = lessonAllows('layer', 'swm') && hemiState[h];
    if (orLines[h]) orLines[h].visible = orVisible;
    if (orCaps[h]) orCaps[h].visible = orVisible;
    if (swmLines[h]) swmLines[h].visible = swmVisible;
  }
}
// Region material: fresnel rim-fade. The interior is nearly transparent and the
// silhouette (where the surface turns away from the camera) glows, so overlapping
// shells read as clean outlines instead of blending into filled mush.
function makeRegionMaterial(hex, opacity) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(hex) }, uOpacity: { value: opacity } },
    vertexShader: 'varying vec3 vN; varying vec3 vV;\n' +
      'void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vV = normalize(-mv.xyz); vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uOpacity; varying vec3 vN; varying vec3 vV;\n' +
      'void main(){ float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2); gl_FragColor = vec4(uColor, uOpacity * (0.14 + 1.9 * fres)); }',
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
}
function loadRegionMeshes(reg) {
  if (regionMeshLoads.has(reg.id)) return;
  regionMeshLoads.add(reg.id);
  const group = regionsById[reg.id];
  const mat = makeRegionMaterial(reg.color, reg.opacity);
  for (const hemi of Object.keys(reg.meshes)) {
    new OBJLoader().load('/' + reg.meshes[hemi].file, (obj) => {
      let geom = null; obj.traverse((n) => { if (n.isMesh && !geom) geom = n.geometry; });
      if (!geom) return;
      if (!geom.attributes.normal) geom.computeVertexNormals();
      const mesh = new THREE.Mesh(geom, mat); mesh.frustumCulled = false; mesh.userData = { hemi };
      mesh.visible = hemiState[hemi] && (regionHemi[reg.id] ? regionHemi[reg.id][hemi] : true);
      group.add(mesh);
      reapplyLessonMaterialFactors(group);
      applyRegionMesh(reg.id);
    }, undefined, (e) => console.warn('region mesh failed:', reg.meshes[hemi].file, e));
  }
}
function loadRegions() {
  fetch('/data/regions.json').then((r) => r.json()).then(({ regions }) => {
    for (const reg of regions) {
      const group = new THREE.Group(); group.userData = { id: reg.id, name: reg.name, parent: reg.parent };
      regionGroup.add(group);
      regionsById[reg.id] = group;
      regionMetadataById[reg.id] = reg;
    }
    _regions = regions; buildPanel(regions, tractsMeta);
    markViewerReady('regions');
  }).catch((e) => { console.warn('regions manifest failed:', e); failViewerReady(e); });
}

// ---------------------------------------------------------------------------
// Real optic-radiation streamlines (HCP-1065, sampled) + tracer flow.
// Faint fibres show real density; bright tracers are fired down random fibres,
// LGN -> V1, recycling. Everything is in MNI mm under mniGroup.
const fibreGroup = new THREE.Group(); mniGroup.add(fibreGroup);
let FIB = null;
const opticRadiationProfiles = new WeakMap();

const MAXTR = 600;   // pool cap; firing model targets ~500 concurrent (see BIO_PER_WALL)
const trGeo = new THREE.BufferGeometry();
trGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXTR * 3), 3).setUsage(THREE.DynamicDrawUsage));
trGeo.setDrawRange(0, 0);
const opticRadiationPoints = new THREE.Points(trGeo, new THREE.PointsMaterial({
  color: 0xfff0d8, size: 1.3, map: SPR, transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending, sizeAttenuation: true }));
fibreGroup.add(opticRadiationPoints);
const tracers = [];
function writeFibrePoint(poly, t, target, offset) {
  const np = poly.length, x = Math.max(0, Math.min(1, t)) * (np - 1);
  const i = Math.min(np - 2, Math.floor(x)), f = x - i, a = poly[i], b = poly[i + 1];
  target[offset] = a.x + (b.x - a.x) * f;
  target[offset + 1] = a.y + (b.y - a.y) * f;
  target[offset + 2] = a.z + (b.z - a.z) * f;
}

// --- LGN->V1 firing model -------------------------------------------------
// Per-fibre inhomogeneous Poisson process generated by SUPERPOSITION + THINNING
// (Ogata): one global candidate stream at Sum(max_rate), a fibre chosen weighted
// by its max_rate, each candidate accepted with probability hazard/max_rate where
// hazard = instantaneous_rate * refractory_recovery. Each accepted spike launches
// one tracer down that fibre. Biological time is dilated (BIO_PER_WALL) so real
// spike rates map to a legible number of comets; what you see is the firing
// STRUCTURE — shared waves, per-fibre heterogeneity, refractory gaps, and rare
// burst volleys — not literal spike counts.
const BIO_PER_WALL = 0.04;                       // biological seconds per wall second (~500 concurrent tracers)
const ABS_REFRAC = 0.002, RECOVER_TAU = 0.008;   // seconds (biological)
let fiberStates = null, totalMaxRate = 0, cumMaxRate = null;
let simT = 0, nextCandT = 0;
const burstQueue = [];                           // {t, f} scheduled burst spikes

function initFiring() {
  simT = 0;
  burstQueue.length = 0;
  tracers.length = 0;
  fiberStates = [];
  const sides = [FIB.L, FIB.R];
  for (let s = 0; s < 2; s++) for (let i = 0; i < sides[s].length; i++) {
    const base = 6 + Math.random() * 10;                 // 6–16 Hz tonic
    fiberStates.push({ side: s, idx: i, base, max: base * 4,
      amp: 0.15 + Math.random() * 0.4, freq: 0.2 + Math.random() * 1.8,
      phase: Math.random() * Math.PI * 2, last: -Infinity });
  }
  cumMaxRate = new Float64Array(fiberStates.length);
  let c = 0; for (let k = 0; k < fiberStates.length; k++) { c += fiberStates[k].max; cumMaxRate[k] = c; }
  totalMaxRate = c;
  nextCandT = expInterval(totalMaxRate);
}
function expInterval(rate) { let u = Math.random(); if (u < 1e-12) u = 1e-12; return -Math.log(u) / rate; }
function pickFiber() {                            // weighted by max_rate (binary search)
  const r = Math.random() * totalMaxRate; let lo = 0, hi = cumMaxRate.length - 1;
  while (lo < hi) { const m = (lo + hi) >> 1; if (cumMaxRate[m] < r) lo = m + 1; else hi = m; }
  return lo;
}
function sharedDrive(t) {                         // slow population rhythm (LFP-like)
  const v = 1 + 0.20 * Math.sin(2 * Math.PI * 2.3 * t) + 0.10 * Math.sin(2 * Math.PI * 7.1 * t);
  return Math.min(2.5, Math.max(0.1, v));
}
function fiberRate(f, t) {
  const priv = Math.min(2.0, Math.max(0.2, 1 + f.amp * Math.sin(2 * Math.PI * f.freq * t + f.phase)));
  return Math.min(f.max, Math.max(0, f.base * sharedDrive(t) * priv));
}
function refractoryRecovery(since) {
  if (since < ABS_REFRAC) return 0;
  return 1 - Math.exp(-(since - ABS_REFRAC) / RECOVER_TAU);
}
function launchTracer(f) {
  const h = f.side === 0 ? 'L' : 'R';
  if (!hemiState[h] || tracers.length >= MAXTR) return;
  const poly = (f.side === 0 ? FIB.L : FIB.R)[f.idx];
  tracers.push({
    profile: opticRadiationProfiles.get(poly),
    distanceMm: 0,
    speedMmPerDisplaySecond: DIRECTED_TRAVEL_SPEED_MNI_MM_PER_DISPLAY_SECOND,
    hemi: h,
  });
}
function maybeScheduleBurst(f, t) {               // bursts follow relative silence
  if (Math.random() >= 0.04) return;
  const extra = 1 + Math.floor(Math.random() * 3);
  let tt = t;
  for (let n = 0; n < extra; n++) { tt += 0.0025 + Math.random() * 0.0015; burstQueue.push({ t: tt, f }); }
}
function generateFiring(dtWall) {
  if (!fiberStates) return;
  const target = simT + dtWall * BIO_PER_WALL * (st.speed / 70);
  for (;;) {
    let bi = -1, bt = Infinity;
    for (let k = 0; k < burstQueue.length; k++) if (burstQueue[k].t < bt) { bt = burstQueue[k].t; bi = k; }
    if (bi >= 0 && bt < nextCandT && bt < target) {          // scheduled burst spike
      const b = burstQueue.splice(bi, 1)[0]; b.f.last = b.t; launchTracer(b.f); continue;
    }
    if (nextCandT >= target) break;                          // next tonic candidate
    const t = nextCandT; nextCandT += expInterval(totalMaxRate);
    const f = fiberStates[pickFiber()];
    const since = t - f.last;
    if (since < ABS_REFRAC) continue;
    if (Math.random() >= (fiberRate(f, t) * refractoryRecovery(since)) / f.max) continue;
    f.last = t; launchTracer(f);
    if (since > 0.050) maybeScheduleBurst(f, t);
  }
  simT = target;
}

function updateTracers(dt) {
  if (!FIB) return;
  const playbackRate = st.speed / 70, arr = trGeo.attributes.position.array;
  if (st.flow) {
    generateFiring(dt);
    for (const tracer of tracers) {
      tracer.distanceMm += distanceAfterDisplayTime(
        dt * playbackRate,
        tracer.speedMmPerDisplaySecond,
      );
    }
    for (let i = tracers.length - 1; i >= 0; i--) {
      if (tracers[i].distanceMm > tracers[i].profile.lengthMm) tracers.splice(i, 1);
    }
  }
  let k = 0;
  for (const tracer of tracers) {
    if (!hemiState[tracer.hemi]) continue;
    sampleContourDistance(tracer.profile, tracer.distanceMm, { target: arr, offset: k * 3 }); k++;
  }
  trGeo.setDrawRange(0, k);
  trGeo.attributes.position.needsUpdate = true;
}
function loadFibres() {
  fetch('/data/or_fibres.json').then((r) => r.json()).then((data) => {
    FIB = { L: [], R: [] };
    const SPLINE_N = 128;   // smooth each streamline (centripetal Catmull-Rom, no overshoot)
    const linePos = { L: [], R: [] }, capPos = { L: [], R: [] };
    for (const f of data.fibres) {
      // orient every streamline LGN-end first (higher MNI-y = more anterior)
      const pts = (f[0][1] >= f[f.length - 1][1]) ? f : f.slice().reverse();
      const raw = pts.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      const L = new THREE.CatmullRomCurve3(raw, false, 'centripetal').getSpacedPoints(SPLINE_N);
      const R = L.map((v) => new THREE.Vector3(-v.x, v.y, v.z));
      opticRadiationProfiles.set(L, createContourDistanceProfile(L));
      opticRadiationProfiles.set(R, createContourDistanceProfile(R));
      FIB.L.push(L); FIB.R.push(R);
      for (const [h, poly] of [['L', L], ['R', R]]) {
        for (let i = 0; i < poly.length - 1; i++) linePos[h].push(poly[i].x, poly[i].y, poly[i].z, poly[i + 1].x, poly[i + 1].y, poly[i + 1].z);
        const lgn = poly[0], v1 = poly[poly.length - 1];   // both ends styled identically
        capPos[h].push(lgn.x, lgn.y, lgn.z, v1.x, v1.y, v1.z);
      }
    }
    // One line-set + termini per hemisphere so the L/R filter can toggle each side.
    // Termini: fibre colour (0xffb060) at +20% brightness, translucent, ~fibre-thin.
    const lineMat = new THREE.LineBasicMaterial({ color: 0xffb060, transparent: true, opacity: 0.07, blending: THREE.AdditiveBlending, depthWrite: false });
    const capMat = new THREE.PointsMaterial({ color: 0xffd373, size: 2.5, sizeAttenuation: false, map: SPR, transparent: true, opacity: 0.5, depthWrite: false });
    for (const h of ['L', 'R']) {
      const lg = new THREE.BufferGeometry(); lg.setAttribute('position', new THREE.Float32BufferAttribute(linePos[h], 3));
      const lines = new THREE.LineSegments(lg, lineMat); lines.visible = hemiState[h]; fibreGroup.add(lines); orLines[h] = lines;
      const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(capPos[h], 3));
      const caps = new THREE.Points(cg, capMat); caps.visible = hemiState[h]; fibreGroup.add(caps); orCaps[h] = caps;
    }
    initFiring();          // build per-fibre firing states now that FIB is populated
    reapplyLessonMaterialFactors(fibreGroup);
  }).catch((e) => console.warn('fibres load failed:', e));
}

// ---------------------------------------------------------------------------
// Visual-stream association tracts (HCP-1065): real population contours plus
// modeled stochastic code-like impulses. Diffusion MRI supplies no polarity, so
// direction is sampled per event from disclosed metadata, never array order.
const tractGroup = new THREE.Group(); mniGroup.add(tractGroup);
let tractsMeta = null, tractActivityMeta = null, _regions = null;
const fibreEndpointIndexPromise = fetch('/data/fibre_endpoints.json')
  .then((response) => {
    if (!response.ok) throw new Error(`fibre endpoint data request failed (${response.status})`);
    return response.json();
  })
  .then(createFibreEndpointIndex);
let fibreEndpointIndex = null;
let requestedFibreFilter = ALL_FIBRE_FILTER;
let fibreFilterResult = null;
let fibreFilterLastRebuildMs = null;
const tractFilterMasksByGroup = {};
function hexRGB(hex) { const n = parseInt(hex.replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
function loadTracts() {
  Promise.all([
    fetch('/data/tracts.json').then((r) => r.json()),
    fetch('/data/tract_activity.json').then((r) => r.json()),
    fibreEndpointIndexPromise,
  ]).then(([{ tracts }, activity, endpointIndex]) => {
    fibreEndpointIndex = endpointIndex;
    tractsMeta = tracts;
    tractActivityMeta = activity;
    for (const tr of tracts) {
      tractHemi[tr.id] = tractHemi[tr.id] || { L: true, R: true };
      const mat = new THREE.LineBasicMaterial({ color: tr.color, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false });
      const rgb = hexRGB(tr.color);
      const capMat = new THREE.PointsMaterial({ color: new THREE.Color(Math.min(1, rgb[0] * 1.3), Math.min(1, rgb[1] * 1.3), Math.min(1, rgb[2] * 1.3)),
        size: 2.2, sizeAttenuation: false, map: SPR, transparent: true, opacity: 0.6, depthWrite: false });
      const entry = { lines: {}, caps: {}, profiles: { L: [], R: [] }, L: [], R: [], rgb };
      for (const h of ['L', 'R']) {
        const linePos = [], capPos = [];
        for (const f of tr[h]) {
          const poly = f.map((p) => new THREE.Vector3(p[0], p[1], p[2])); entry[h].push(poly);
          entry.profiles[h].push(createContourDistanceProfile(poly));
          for (let i = 0; i < poly.length - 1; i++) linePos.push(poly[i].x, poly[i].y, poly[i].z, poly[i + 1].x, poly[i + 1].y, poly[i + 1].z);
          const a = poly[0], b = poly[poly.length - 1]; capPos.push(a.x, a.y, a.z, b.x, b.y, b.z);   // both fibre ends
        }
        const vis = hemiState[h] && tractHemi[tr.id][h];
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3).setUsage(THREE.DynamicDrawUsage));
        const lines = new THREE.LineSegments(g, mat); lines.userData = { tractId: tr.id, hemi: h }; lines.visible = vis;
        tractGroup.add(lines); entry.lines[h] = lines;
        const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(capPos, 3).setUsage(THREE.DynamicDrawUsage));
        const caps = new THREE.Points(cg, capMat); caps.userData = { tractId: tr.id, hemi: h }; caps.visible = vis;
        tractGroup.add(caps); entry.caps[h] = caps;
      }
      tractsById[tr.id] = entry;
    }
    initTractImpulses(activity);
    recalculateFibreFilter();
    if (_regions) buildPanel(_regions, tractsMeta);   // rebuild the panel with the tracts section
    markViewerReady('tracts');
  }).catch((e) => { console.warn('tract load failed:', e); failViewerReady(e); });
}

const MAX_TRACT_IMPULSES = 520;
const tractImpulseGeo = new THREE.BufferGeometry();
tractImpulseGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_TRACT_IMPULSES * 3), 3).setUsage(THREE.DynamicDrawUsage));
tractImpulseGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAX_TRACT_IMPULSES * 3), 3).setUsage(THREE.DynamicDrawUsage));
tractImpulseGeo.setDrawRange(0, 0);
const tractImpulsePoints = new THREE.Points(tractImpulseGeo, new THREE.PointsMaterial({ size: 2.0, map: SPR, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
tractImpulsePoints.name = 'association-impulses';
tractImpulsePoints.userData = { activity: 'modeled-association-impulses' };
tractGroup.add(tractImpulsePoints);
const tractActivityById = {};
const tractContoursByGroup = {};
const tractImpulseStats = {};
let tractImpulseEngine = null;
let tractImpulseTime = 0;
let activeTractImpulses = [];
function initTractImpulses(activity) {
  for (const key of Object.keys(tractActivityById)) delete tractActivityById[key];
  for (const key of Object.keys(tractContoursByGroup)) delete tractContoursByGroup[key];
  for (const key of Object.keys(tractImpulseStats)) delete tractImpulseStats[key];
  for (const tract of activity.tracts) {
    tractActivityById[tract.id] = tract;
    for (const hemi of ['L', 'R']) {
      const groupId = `${tract.id}:${hemi}`;
      tractContoursByGroup[groupId] = tractsById[tract.id].profiles[hemi];
      tractImpulseStats[groupId] = { aToB: 0, bToA: 0 };
    }
  }
  tractImpulseEngine = createAssociationImpulseEngine({
    groups: associationGroupsFromManifest(activity),
    seed: activity.model.seed,
    model: associationModelFromManifest(activity),
  });
  tractImpulseTime = 0;
  activeTractImpulses = [];
  if (import.meta.env.DEV) {
    window.__view.association = {
      points: tractImpulsePoints,
      get modelTime() { return tractImpulseTime; },
      get activeCount() { return activeTractImpulses.length; },
      get eligibleRenderedGroups() {
        return Object.keys(tractContoursByGroup)
          .filter((groupId) => {
            const [id, hemi] = groupId.split(':');
            return tractsById[id].lines[hemi].visible && tractContoursByGroup[groupId].length > 0;
          })
          .sort();
      },
      get renderedGroups() {
        return activeTractImpulses
          .map((event) => event.groupId)
          .filter((groupId) => {
            const [id, hemi] = groupId.split(':');
            return tractsById[id].lines[hemi].visible && tractContoursByGroup[groupId].length > 0;
          });
      },
      get physicalTravel() {
        const lengths = Object.values(tractContoursByGroup)
          .flatMap((profiles) => profiles.map((profile) => profile.lengthMm));
        const shortestLengthMm = Math.min(...lengths);
        const longestLengthMm = Math.max(...lengths);
        return Object.freeze({
          unit: 'MNI mm per display second',
          speedMmPerDisplaySecond: DIRECTED_TRAVEL_SPEED_MNI_MM_PER_DISPLAY_SECOND,
          profileCount: lengths.length,
          shortestLengthMm,
          longestLengthMm,
          shortestTransitDisplaySeconds: contourTransitDuration({ lengthMm: shortestLengthMm }),
          longestTransitDisplaySeconds: contourTransitDuration({ lengthMm: longestLengthMm }),
        });
      },
      get activeTravel() {
        return activeTractImpulses.map((event) => Object.freeze({
          groupId: event.groupId,
          lengthMm: event.contourProfile.lengthMm,
          distanceMm: distanceAfterDisplayTime(
            tractImpulseTime - event.time,
            event.speedMmPerDisplaySecond,
          ),
          speedMmPerDisplaySecond: event.speedMmPerDisplaySecond,
        }));
      },
      get stats() { return structuredClone(tractImpulseStats); },
    };
  }
}
function updateTractImpulses(dt) {
  if (!tractImpulseEngine) { tractImpulseGeo.setDrawRange(0, 0); return; }
  const nextTime = advanceAssociationTime(tractImpulseTime, dt, {
    playing: st.flow,
    speed: st.speed / 70,
    reducedMotion: reduce,
  });
  const logicalEvents = nextTime > tractImpulseTime ? tractImpulseEngine.advanceTo(nextTime) : [];
  tractImpulseTime = nextTime;
  for (const event of logicalEvents) {
    const counts = tractImpulseStats[event.groupId];
    counts[event.aToB ? 'aToB' : 'bToA']++;
  }
  const pool = updateAssociationEventPool(activeTractImpulses, logicalEvents, tractImpulseTime, {
    maxActive: tractActivityMeta.model.maxActiveRenderedImpulses,
    contoursByGroup: tractContoursByGroup,
    isVisible: (groupId) => {
      const [id, hemi] = groupId.split(':');
      return tractsById[id].lines[hemi].visible && tractContoursByGroup[groupId].length > 0;
    },
  });
  activeTractImpulses = reduce ? [] : pool.active;

  const arr = tractImpulseGeo.attributes.position.array;
  const col = tractImpulseGeo.attributes.color.array;
  let k = 0;
  for (const event of activeTractImpulses) {
    const [id, hemi] = event.groupId.split(':');
    if (!tractsById[id].lines[hemi].visible || !event.contourProfile) continue;
    const distanceMm = distanceAfterDisplayTime(
      tractImpulseTime - event.time,
      event.speedMmPerDisplaySecond,
    );
    const rawDistanceMm = canonicalContourDistance(
      event.contourProfile,
      tractActivityById[id].endpointA.classifier,
      event.aToB,
      distanceMm,
    );
    sampleContourDistance(event.contourProfile, rawDistanceMm, { target: arr, offset: k * 3 });
    const rgb = tractsById[id].rgb;
    const opacity = lessonEntityOpacities[`tract.${id}`] ?? 1;
    col[k * 3] = rgb[0] * opacity; col[k * 3 + 1] = rgb[1] * opacity; col[k * 3 + 2] = rgb[2] * opacity; k++;
  }
  tractImpulseGeo.setDrawRange(0, k);
  tractImpulseGeo.attributes.position.needsUpdate = true;
  tractImpulseGeo.attributes.color.needsUpdate = true;
}


// ---------------------------------------------------------------------------
// Superficial white-matter (SWM) contour texture — the "grain" just under cortex.
// Short fibres tracked in the superficial-WM shell (HCP-1065 FIB). Their
// ORIENTATION is real but UNDIRECTED, so we render it honestly as a STATIC
// tangent grain — one faint line per fibre, no motion. Activity is shown only as
// dots that VIBRATE ALONG each contour: a zero-mean sinusoid with a random
// per-dot phase, so there is no net travel and therefore NO implied flow
// direction. Each dot's swing is a fixed fraction of ITS OWN fibre's arc length,
// so longer fibres vibrate wider — a vibrating-string reading of the real length
// field (structure), not a claim about how active any region is. Fibres are
// assigned to a hemisphere by the sign of their mean x (real bilateral tracking,
// no mirroring).
const swmGroup = new THREE.Group(); mniGroup.add(swmGroup);
const SWM = { L: [], R: [] };
const swmSourceIndices = { L: [], R: [] };
const swmFilterMasks = { L: new Uint8Array(0), R: new Uint8Array(0) };
const swmLines = { L: null, R: null };
const swmDots = []; let swmT = 0;
let swmLoadStarted = false;
const MAXSWM = 15000;
const swmGeo = new THREE.BufferGeometry();
swmGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXSWM * 3), 3).setUsage(THREE.DynamicDrawUsage));
swmGeo.setDrawRange(0, 0);
const swmPoints = new THREE.Points(swmGeo, new THREE.PointsMaterial({
  color: 0xc8bdf0, size: 0.85, map: SPR, transparent: true, opacity: 0.7,
  depthWrite: false, blending: THREE.AdditiveBlending, sizeAttenuation: true }));
swmPoints.name = 'swm-vibration';
swmGroup.add(swmPoints);
if (import.meta.env.DEV) {
  window.__view.swm = {
    points: swmPoints,
    dots: swmDots,
    get modelTime() { return swmT; },
  };
}

function loadSwm() {
  if (swmLoadStarted) return;
  swmLoadStarted = true;
  Promise.all([
    fetch('/data/swm_fibres.json').then((r) => r.json()),
    fibreEndpointIndexPromise,
  ]).then(([data, endpointIndex]) => {
    fibreEndpointIndex = endpointIndex;
    const linePos = { L: [], R: [] };
    const lloc = data.lloc, lens = data.len;   // baked local-mean length + own length (mm)
    data.fibres.forEach((f, idx) => {
      const poly = f.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      let mx = 0; for (const v of poly) mx += v.x; mx /= poly.length;
      const h = mx >= 0 ? 'R' : 'L';                     // +x = MNI right hemisphere
      SWM[h].push(poly);
      swmSourceIndices[h].push(idx);
      for (let i = 0; i < poly.length - 1; i++) linePos[h].push(poly[i].x, poly[i].y, poly[i].z, poly[i + 1].x, poly[i + 1].y, poly[i + 1].z);
      // One vibrating dot per fibre. AMPLITUDE (arc fraction) is set so the dot's
      // physical swing ≈ 0.5 × the LOCAL-MEAN fibre length here — longer bundles
      // vibrate wider (structure). Home is sampled from the amplitude-safe interval,
      // and random phase prevents coherent travel without endpoint clipping.
      const Lown = (lens && lens[idx]) || 25, Ll = (lloc && lloc[idx]) || Lown;
      swmDots.push({ poly, hemi: h, sourceIndex: idx, ...createSwmVibration({
        ownLength: Lown,
        localMeanLength: Ll,
      }) });
    });
    // Static tangent grain: faint additive lines in a desaturated violet so the
    // superficial system reads as its own layer, distinct from the cool-white
    // surface and the amber/cyan directed flows. Overlap builds up where dense.
    const grainMat = new THREE.LineBasicMaterial({ color: 0x9a90c0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const h of ['L', 'R']) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(linePos[h], 3).setUsage(THREE.DynamicDrawUsage));
      const lines = new THREE.LineSegments(g, grainMat); lines.visible = hemiState[h]; swmGroup.add(lines); swmLines[h] = lines;
    }
    recalculateFibreFilter();
    reapplyLessonMaterialFactors(swmGroup);
  }).catch((e) => console.warn('swm load failed:', e));
}
function updateSwm(dt) {
  if (!swmDots.length || !swmGroup.visible) { swmGeo.setDrawRange(0, 0); return; }
  const arr = swmGeo.attributes.position.array;
  if (st.flow && !reduce && !st.settled) swmT += dt * (st.speed / 70);
  let k = 0;
  for (const d of swmDots) {
    if (!hemiState[d.hemi] || !fibreFilterResult?.swm[d.sourceIndex]) continue;
    const t = (reduce || st.settled) ? d.home : vibrationContourParameter(d, swmT);   // bounded vibration ALONG the contour
    writeFibrePoint(d.poly, t, arr, k * 3); k++;
  }
  swmGeo.setDrawRange(0, k);
  swmGeo.attributes.position.needsUpdate = true;
}

function writeFilteredGeometry(lines, caps, polylines, mask) {
  if (!lines || !caps) return;
  const lineAttribute = lines.geometry.attributes.position;
  const capAttribute = caps.geometry.attributes.position;
  const lineVertices = writeFilteredLineSegments(polylines, mask, lineAttribute.array);
  const capPoints = writeFilteredEndpointPositions(polylines, mask, capAttribute.array);
  lines.geometry.setDrawRange(0, lineVertices);
  caps.geometry.setDrawRange(0, capPoints);
  lineAttribute.needsUpdate = true;
  capAttribute.needsUpdate = true;
}

function updateFibreFilterStatus() {
  const status = document.getElementById('fibre-filter-summary');
  if (!status) return;
  status.textContent = fibreFilterResult
    ? formatFibreFilterSummary(fibreFilterResult)
    : 'Endpoint filter data are loading.';
}

function recalculateFibreFilter() {
  if (!fibreEndpointIndex) {
    updateFibreFilterStatus();
    return;
  }
  const startedAt = performance.now();
  fibreFilterResult = filterFibreEndpoints(fibreEndpointIndex, requestedFibreFilter, hemiState);
  for (const group of fibreFilterResult.association) {
    const entry = tractsById[group.id];
    if (!entry) continue;
    for (const hemi of ['L', 'R']) {
      const mask = group[hemi];
      const groupId = `${group.id}:${hemi}`;
      tractFilterMasksByGroup[groupId] = mask;
      tractContoursByGroup[groupId] = entry.profiles[hemi].filter((_, index) => mask[index]);
      writeFilteredGeometry(entry.lines[hemi], entry.caps[hemi], entry[hemi], mask);
    }
  }
  for (const hemi of ['L', 'R']) {
    const mask = new Uint8Array(SWM[hemi].length);
    for (let index = 0; index < mask.length; index++) {
      mask[index] = fibreFilterResult.swm[swmSourceIndices[hemi][index]];
    }
    swmFilterMasks[hemi] = mask;
    if (swmLines[hemi]) {
      const attribute = swmLines[hemi].geometry.attributes.position;
      const vertexCount = writeFilteredLineSegments(SWM[hemi], mask, attribute.array);
      swmLines[hemi].geometry.setDrawRange(0, vertexCount);
      attribute.needsUpdate = true;
    }
  }
  activeTractImpulses = [];
  tractImpulseGeo.setDrawRange(0, 0);
  updateFibreFilterStatus();
  syncFibreFilterControls(requestedFibreFilter);
  fibreFilterLastRebuildMs = performance.now() - startedAt;
}

// ---------------------------------------------------------------------------
// State + loop
const st = { flow: !reduce, speed: 70, anteriorDistanceMm: 0, settled: reduce };
if (import.meta.env.DEV) {
  window.__view.activity = {
    get state() {
      return Object.freeze({
        playing: st.flow && !st.settled,
        settled: st.settled,
        reducedMotion: reduce,
        speed: st.speed,
      });
    },
    anterior: {
      points: Object.freeze(flows.map(({ points }) => points)),
      get distanceMm() { return st.anteriorDistanceMm; },
      get profileLengthsMm() { return Object.freeze(flows.map(({ profile }) => profile.lengthMm)); },
    },
    opticRadiation: {
      points: opticRadiationPoints,
      get modelTime() { return simT; },
      get activeCount() { return tracers.length; },
      get endpointCaps() { return Object.freeze([orCaps.L, orCaps.R].filter(Boolean)); },
      get v1Endpoints() {
        return FIB ? Object.freeze([...FIB.L, ...FIB.R].map((poly) => poly[poly.length - 1])) : Object.freeze([]);
      },
    },
  };
}
let requestedLessonPlayback = null;
const timer = new THREE.Timer();
timer.connect(document);
const readFrameDelta = createFrameDeltaReader(timer);
let lessonCameraTransition = null;
let lessonVisibilityTransition = null;
let lessonEntityOpacities = Object.freeze({});
let updateLessonVisibility = () => {};
let lessonControlMode = 'explore';
let lessonTransitionStateChange = () => {};
let lessonTransitioning = false;
function setLessonTransitioning(value) {
  if (lessonTransitioning === value) return;
  lessonTransitioning = value;
  lessonTransitionStateChange(value);
}

function resize() {
  const { width, height } = stage.getBoundingClientRect();
  if (!(width > 0 && height > 0)) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
}
window.addEventListener('resize', resize);
new ResizeObserver(resize).observe(stage);
resize();

function updateAnteriorFlow() {
  for (const flow of flows) {
    for (let i = 0; i < NP; i++) {
      const distanceMm = (i / NP) * flow.profile.lengthMm + st.anteriorDistanceMm;
      sampleContourDistance(flow.profile, distanceMm, {
        wrap: true,
        target: flow.pos,
        offset: i * 3,
      });
    }
    flow.geo.attributes.position.needsUpdate = true;
  }
}
function animate(timestamp) {
  const dt = readFrameDelta(timestamp);
  let cameraTransitioning = false;
  updateLessonVisibility(timestamp);
  if (lessonCameraTransition) {
    const pose = sampleCameraTransition(lessonCameraTransition, timestamp);
    camera.position.fromArray(pose.position);
    controls.target.fromArray(pose.target);
    camera.lookAt(controls.target);
    cameraTransitioning = !pose.done;
    if (pose.done) {
      lessonCameraTransition = null;
      controls.enabled = lessonControlMode !== 'guided';
      setLessonTransitioning(false);
    }
  }
  if (st.flow) {
    st.anteriorDistanceMm += distanceAfterDisplayTime(dt * (st.speed / 70));
    updateAnteriorFlow();
  }
  updateTracers(dt);
  updateTractImpulses(dt);
  updateSwm(dt);
  if (!cameraTransitioning) controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// ---------------------------------------------------------------------------
// UI
const $ = (id) => document.getElementById(id);
const setFill = (el) => el.style.setProperty('--fill', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
let exploreCommandHandler = null;
let explorePanelModel = null;
let exploreResetCamera = null;
let rendererEntityIds = new Map();
let fibreFilterControlCatalog = null;
let fibreFilterControlsConfigured = false;
function selectedOptionValues(select) {
  return [...select.selectedOptions].map(({ value }) => value);
}
function firstRegionOption(select, exclude = new Set()) {
  return [...select.options].find(({ value }) => value.startsWith('region.') && !exclude.has(value)) ?? null;
}
function syncFibreFilterControls(query) {
  if (!fibreFilterControlCatalog) return;
  const preset = $('fibre-filter-preset');
  const mode = $('fibre-filter-mode');
  const setA = $('fibre-filter-set-a');
  const setB = $('fibre-filter-set-b');
  preset.value = query.preset ?? (query.mode === 'all' ? 'all' : 'custom');
  mode.value = query.mode;
  const selectedA = new Set(query.setA);
  const selectedB = new Set(query.setB);
  for (const option of setA.options) option.selected = selectedA.has(option.value);
  for (const option of setB.options) option.selected = selectedB.has(option.value);
  const needsSets = query.mode !== 'all';
  $('fibre-filter-set-a-wrap').hidden = !needsSets;
  $('fibre-filter-set-b-wrap').hidden = query.mode !== 'connects-between';
  $('fibre-filter-selection-help').hidden = !needsSets;
}
function dispatchCustomFibreFilter() {
  const mode = $('fibre-filter-mode').value;
  const setA = mode === 'all' ? [] : selectedOptionValues($('fibre-filter-set-a'));
  const setB = mode === 'connects-between' ? selectedOptionValues($('fibre-filter-set-b')) : [];
  if (mode !== 'all' && setA.length === 0) {
    $('fibre-filter-summary').textContent = 'Select at least one endpoint region in set A.';
    return;
  }
  if (mode === 'connects-between' && setB.length === 0) {
    $('fibre-filter-summary').textContent = 'Select at least one endpoint region in set B.';
    return;
  }
  $('fibre-filter-preset').value = mode === 'all' ? 'all' : 'custom';
  dispatchExploreCommands([{ type: 'fibre-filter.set', preset: null, mode, setA, setB }]);
}
function configureFibreFilterControls(catalog) {
  fibreFilterControlCatalog = catalog;
  const preset = $('fibre-filter-preset');
  preset.replaceChildren(
    new Option('All classified fibres', 'all'),
    ...catalog.fibreFilterPresetIds.map((id) => new Option(catalog.fibreFilterPresetsById[id].label, id)),
    new Option('Custom query', 'custom'),
  );
  const selectors = catalog.fibreFilterSelectorIds
    .map((id) => catalog.fibreFilterSelectorsById[id])
    .sort((a, b) => {
      const aSpecial = a.id.startsWith('endpoint.');
      const bSpecial = b.id.startsWith('endpoint.');
      return aSpecial === bSpecial ? a.label.localeCompare(b.label) : (aSpecial ? 1 : -1);
    });
  for (const id of ['fibre-filter-set-a', 'fibre-filter-set-b']) {
    $(id).replaceChildren(...selectors.map((selector) => new Option(selector.label, selector.id)));
  }
  if (fibreFilterControlsConfigured) return;
  fibreFilterControlsConfigured = true;
  preset.addEventListener('change', () => {
    if (preset.value === 'custom') return;
    if (preset.value === 'all') {
      dispatchExploreCommands([{ type: 'fibre-filter.set', ...ALL_FIBRE_FILTER }]);
      return;
    }
    const authored = fibreFilterControlCatalog.fibreFilterPresetsById[preset.value];
    dispatchExploreCommands([{
      type: 'fibre-filter.set',
      preset: authored.id,
      mode: authored.query.mode,
      setA: authored.query.setA,
      setB: authored.query.setB,
    }]);
  });
  $('fibre-filter-mode').addEventListener('change', () => {
    const mode = $('fibre-filter-mode').value;
    if (mode !== 'all' && selectedOptionValues($('fibre-filter-set-a')).length === 0) {
      const option = firstRegionOption($('fibre-filter-set-a'));
      if (option) option.selected = true;
    }
    if (mode === 'connects-between' && selectedOptionValues($('fibre-filter-set-b')).length === 0) {
      const option = firstRegionOption($('fibre-filter-set-b'), new Set(selectedOptionValues($('fibre-filter-set-a'))));
      if (option) option.selected = true;
    }
    $('fibre-filter-set-a-wrap').hidden = mode === 'all';
    $('fibre-filter-set-b-wrap').hidden = mode !== 'connects-between';
    $('fibre-filter-selection-help').hidden = mode === 'all';
    dispatchCustomFibreFilter();
  });
  $('fibre-filter-set-a').addEventListener('change', dispatchCustomFibreFilter);
  $('fibre-filter-set-b').addEventListener('change', dispatchCustomFibreFilter);
}
function dispatchExploreCommands(commands) {
  if (!exploreCommandHandler) return false;
  exploreCommandHandler(commands);
  return true;
}
function entityIdForRenderer(kind, id) {
  return rendererEntityIds.get(`${kind}:${id}`) ?? null;
}

const anatomyRaycaster = new THREE.Raycaster();
anatomyRaycaster.params.Line.threshold = 5;
anatomyRaycaster.params.Points.threshold = 6;
let anatomyCatalog = null;
let anatomyIntentHandler = null;
let highlightedInspectableId = null;
let hoveredInspectableId = null;
let anatomyPointerStart = null;

function inspectableRendererObjects(inspectable) {
  if (inspectable.renderer.kind === 'landmark') {
    return [landmarkMarkersById[inspectable.renderer.id]].filter(Boolean);
  }
  const owner = anatomyCatalog?.entitiesById?.[inspectable.entity];
  return owner ? lessonRendererObjects(owner) : [];
}

function objectIsRendered(object) {
  for (let current = object; current; current = current.parent) {
    if (!current.visible) return false;
    if (current === scene) break;
  }
  const materials = Array.isArray(object.material) ? object.material : [object.material];
  if (!materials.filter(Boolean).length) return true;
  return materials.filter(Boolean).some((material) => {
    if (material.uniforms?.uOpacity) return material.uniforms.uOpacity.value > 0.01;
    return material.opacity === undefined || material.opacity > 0.01;
  });
}

function pickAnatomy(clientX, clientY) {
  if (!anatomyCatalog) return null;
  const rect = renderer.domElement.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) return null;
  const ndc = anatomyPointerNdc({ clientX, clientY, rect });
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld();
  anatomyRaycaster.setFromCamera(ndc, camera);
  const hits = [];
  for (const id of anatomyCatalog.inspectableIds) {
    const inspectable = anatomyCatalog.inspectablesById[id];
    let nearest = Infinity;
    for (const root of inspectableRendererObjects(inspectable)) {
      if (!objectIsRendered(root)) continue;
      const intersection = anatomyRaycaster.intersectObject(root, true)
        .find(({ object }) => objectIsRendered(object));
      if (intersection) nearest = Math.min(nearest, intersection.distance);
    }
    if (Number.isFinite(nearest)) hits.push({ id, distance: nearest });
  }
  return nearestAnatomyHit(hits);
}

function emitAnatomyIntent(intent) {
  if (anatomyIntentHandler) anatomyIntentHandler(Object.freeze({ ...intent }));
}

function updateAnatomyHover(clientX, clientY) {
  const id = pickAnatomy(clientX, clientY)?.id ?? null;
  renderer.domElement.style.cursor = id ? 'pointer' : '';
  if (id === hoveredInspectableId) return;
  if (hoveredInspectableId) emitAnatomyIntent({ type: 'clear', input: 'pointer' });
  hoveredInspectableId = id;
  if (id) emitAnatomyIntent({ type: 'preview', id, input: 'pointer' });
}

renderer.domElement.addEventListener('pointermove', (event) => {
  if (event.pointerType === 'mouse' && event.buttons === 0) {
    updateAnatomyHover(event.clientX, event.clientY);
  }
});
renderer.domElement.addEventListener('pointerleave', (event) => {
  if (event.pointerType !== 'mouse') return;
  renderer.domElement.style.cursor = '';
  hoveredInspectableId = null;
  emitAnatomyIntent({ type: 'clear', input: 'pointer' });
});
renderer.domElement.addEventListener('pointerdown', (event) => {
  if (!event.isPrimary || event.button !== 0) return;
  anatomyPointerStart = {
    pointerId: event.pointerId,
    x: event.clientX,
    y: event.clientY,
  };
});
renderer.domElement.addEventListener('pointercancel', () => {
  anatomyPointerStart = null;
});
renderer.domElement.addEventListener('pointerup', (event) => {
  const start = anatomyPointerStart;
  anatomyPointerStart = null;
  if (!start || start.pointerId !== event.pointerId || !event.isPrimary || event.button !== 0) return;
  if (!anatomyTapIntent({
    startX: start.x,
    startY: start.y,
    endX: event.clientX,
    endY: event.clientY,
  })) return;
  const hit = pickAnatomy(event.clientX, event.clientY);
  if (!hit) {
    emitAnatomyIntent({ type: 'reset' });
    return;
  }
  if (event.pointerType === 'touch') {
    emitAnatomyIntent({ type: 'touch', id: hit.id });
  } else {
    emitAnatomyIntent({ type: 'activate', id: hit.id, input: 'pointer' });
  }
});

function setInspectableHighlight(id) {
  if (id !== null && !anatomyCatalog?.inspectablesById?.[id]) {
    throw new RangeError(`unknown inspectable highlight: ${id}`);
  }
  if (highlightedInspectableId === id) return;
  const apply = (inspectableId, active) => {
    if (!inspectableId) return;
    const inspectable = anatomyCatalog.inspectablesById[inspectableId];
    for (const object of inspectableRendererObjects(inspectable)) {
      setLessonMaterialFactor(object, 'inspection', active ? 3.2 : 1);
      if (inspectable.renderer.kind === 'landmark') {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        for (const material of materials.filter(Boolean)) {
          material.color?.setHex(active ? 0x43dccb : material.userData.inspectionBaseColor);
        }
      }
    }
  };
  apply(highlightedInspectableId, false);
  highlightedInspectableId = id;
  apply(highlightedInspectableId, true);
}

function configureAnatomyInspector(catalog) {
  setInspectableHighlight(null);
  anatomyCatalog = catalog;
  anatomyIntentHandler = null;
  hoveredInspectableId = null;
  renderer.domElement.style.cursor = '';
  if (import.meta.env.DEV) {
    window.__view.inspector = {
      get candidateIds() { return Object.freeze([...anatomyCatalog.inspectableIds]); },
      get highlightedId() { return highlightedInspectableId; },
      pickAt(clientX, clientY) { return pickAnatomy(clientX, clientY); },
    };
  }
}

$('play').addEventListener('click', () => {
  if (reduce) return;
  if (explorePanelModel) {
    const playback = explorePanelModel.playback;
    dispatchExploreCommands([{
      type: 'playback.set',
      playing: !playback.playing || playback.settled,
      speed: playback.speed,
      settled: false,
    }]);
    return;
  }
  st.flow = !st.flow;
  if (st.flow) st.settled = false;
  $('play').classList.toggle('on', st.flow);
  $('playGlyph').textContent = st.flow ? '❚❚' : '▶';
  $('playTxt').textContent = st.flow ? 'Pause activity' : 'Play activity';
});
if (reduce) {
  $('play').disabled = true;
  $('play').classList.remove('on');
  $('playGlyph').textContent = '▶';
  $('playTxt').textContent = 'Activity paused — reduced motion';
}
$('speed').addEventListener('input', (event) => {
  const speed = +event.target.value;
  if (explorePanelModel) {
    dispatchExploreCommands([{
      type: 'playback.set',
      playing: explorePanelModel.playback.playing,
      speed,
      settled: explorePanelModel.playback.settled,
    }]);
    return;
  }
  st.speed = speed; $('speedV').textContent = st.speed; setFill(event.target);
});
$('clip').addEventListener('input', (event) => {
  if (explorePanelModel) {
    dispatchExploreCommands([{ type: 'cutaway.set', position: +event.target.value }]);
    return;
  }
  clipPlane.constant = 80 - (event.target.value / 100) * 160; $('clipV').textContent = event.target.value + '%'; setFill(event.target);
});
$('tissue').addEventListener('input', (event) => {
  if (explorePanelModel) {
    dispatchExploreCommands([{ type: 'material.set', tissueOpacity: +event.target.value / 100 }]);
    return;
  }
  brainMat.opacity = event.target.value / 100; $('tissueV').textContent = event.target.value; setFill(event.target);
});
$('spin').addEventListener('click', () => {
  if (exploreCommandHandler) return;
  controls.autoRotate = !controls.autoRotate; $('spin').classList.toggle('on', controls.autoRotate);
});

// ---- Scene-state + layer toggle panel (built once the region manifest loads) --
// sceneState.visible is the serializable source of truth (the substrate for
// presets/walkthroughs later). Regions are grouped by their tree parent so a
// parent checkbox toggles its whole subtree.
const sceneState = { visible: new Set() };
const layerObjs = {};
function setLayer(id, on) { const o = layerObjs[id]; if (o) o.visible = on; if (on) sceneState.visible.add(id); else sceneState.visible.delete(id); }
function syncStreamParent(cb, syncers, hemiMap) {
  let allOn = true, allOff = true;
  for (const s of syncers) { const rh = hemiMap[s.id]; if (!(rh.L && rh.R)) allOn = false; if (rh.L || rh.R) allOff = false; }
  cb.checked = allOn; cb.indeterminate = !allOn && !allOff;
}
const STREAM_ORDER = [['subcortical', 'Subcortical'], ['early', 'Early / shared'], ['ventral', 'Ventral — “what”'], ['dorsal', 'Dorsal — “where / how”'],
  ['temporal', 'Temporal targets'], ['parietal', 'Inferior parietal'], ['frontal', 'Frontal targets'], ['gap', 'Unparcellated (GapMap)']];
const DEFAULT_OFF = ['labels'];   // layers that start hidden
let panelInitialized = false;
function buildPanel(regions, tracts, { initialize = !panelInitialized } = {}) {
  Object.assign(layerObjs, { brain: brainGroup, or: fibreGroup, anterior: anteriorGroup, labels: labelGroup, swm: swmGroup });
  for (const reg of regions) layerObjs[reg.id] = regionsById[reg.id];
  if (initialize) {
    sceneState.visible.clear();
    Object.keys(layerObjs).forEach((id) => sceneState.visible.add(id));
    for (const id of DEFAULT_OFF) { sceneState.visible.delete(id); if (layerObjs[id]) layerObjs[id].visible = false; }
    panelInitialized = true;
  }
  const root = $('layers'); if (!root) return; root.innerHTML = '';
  const sec = (title) => { const h = document.createElement('div'); h.className = 'lyr-sec'; h.textContent = title; root.appendChild(h); };
  const leafRow = (id, label, o = {}) => {
    const row = document.createElement('label'); row.className = 'lyr' + (o.child ? ' lyr-child' : '');
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = sceneState.visible.has(id); cb.dataset.id = id;
    const sw = document.createElement('span'); sw.className = 'swatch'; if (o.color) { sw.style.background = o.color; sw.style.color = o.color; } else sw.style.visibility = 'hidden';
    const t = document.createElement('span'); t.className = 'lyr-t' + (o.dim ? ' dim' : ''); t.textContent = label;
    row.append(cb, sw, t); return { row, cb };
  };
  // One collapsible stream group of L/R-pill rows — used for both regions and tracts.
  const streamBlock = (stream, label, items, hemiMap, applyFn, rendererKind) => {
    const wrap = document.createElement('div'); wrap.className = 'lyr-grpwrap collapsed';
    wrap.dataset.groupId = `${rendererKind}-${stream}`;
    const head = document.createElement('div'); head.className = 'lyr lyr-group';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.setAttribute('aria-label', `Show all ${label}`);
    const disclosure = document.createElement('button'); disclosure.type = 'button'; disclosure.className = 'lyr-disclosure';
    const kidsId = `layer-group-${rendererKind}-${stream}`;
    disclosure.setAttribute('aria-expanded', 'false'); disclosure.setAttribute('aria-controls', kidsId);
    const caret = document.createElement('span'); caret.className = 'caret'; caret.textContent = '▸'; caret.setAttribute('aria-hidden', 'true');
    const t = document.createElement('span'); t.className = 'lyr-t'; t.textContent = label;
    disclosure.append(caret, t); head.append(cb, disclosure);
    const kids = document.createElement('div'); kids.className = 'lyr-kids'; kids.id = kidsId;
    const syncers = [];
    for (const it of items) {
      hemiMap[it.id] = hemiMap[it.id] || { L: true, R: true };
      const row = document.createElement('div'); row.className = 'lyr lyr-child';
      const sw = document.createElement('span'); sw.className = 'swatch'; sw.style.background = it.color; sw.style.color = it.color;
      const nm = document.createElement('span'); nm.className = 'lyr-t'; nm.textContent = it.name;
      const pills = document.createElement('span'); pills.className = 'hemi-pills';
      const pill = {};
      const entityId = entityIdForRenderer(rendererKind, it.id);
      row.dataset.rendererId = it.id;
      if (entityId) row.dataset.entityId = entityId;
      const applyEntityState = () => {
        const state = hemiMap[it.id];
        const commands = entityId ? [
          { type: 'visibility.set', entity: entityId, visible: state.L || state.R },
          { type: 'hemispheres.set-entity', entity: entityId, L: state.L, R: state.R },
        ] : [];
        if (!dispatchExploreCommands(commands)) applyFn(it.id);
        syncStreamParent(cb, syncers, hemiMap);
      };
      for (const h of ['L', 'R']) {
        const p = document.createElement('button'); p.type = 'button'; p.className = 'pill'; p.textContent = h; p.dataset.hemisphere = h;
        p.classList.toggle('on', hemiMap[it.id][h]); p.setAttribute('aria-pressed', String(hemiMap[it.id][h]));
        p.addEventListener('click', () => { hemiMap[it.id][h] = !hemiMap[it.id][h]; p.classList.toggle('on', hemiMap[it.id][h]); p.setAttribute('aria-pressed', String(hemiMap[it.id][h])); applyEntityState(); });
        pills.append(p); pill[h] = p;
      }
      nm.addEventListener('click', () => { const on = !(hemiMap[it.id].L || hemiMap[it.id].R); hemiMap[it.id].L = hemiMap[it.id].R = on; for (const h of ['L', 'R']) { pill[h].classList.toggle('on', on); pill[h].setAttribute('aria-pressed', String(on)); } applyEntityState(); });
      row.append(sw, nm, pills); kids.appendChild(row);
      syncers.push({ id: it.id, pill });
    }
    cb.addEventListener('change', () => {
      const on = cb.checked;
      const commands = [];
      for (const s of syncers) {
        hemiMap[s.id].L = hemiMap[s.id].R = on;
        for (const h of ['L', 'R']) { s.pill[h].classList.toggle('on', on); s.pill[h].setAttribute('aria-pressed', String(on)); }
        const entityId = entityIdForRenderer(rendererKind, s.id);
        if (entityId) commands.push(
          { type: 'visibility.set', entity: entityId, visible: on },
          { type: 'hemispheres.set-entity', entity: entityId, L: on, R: on },
        );
        else applyFn(s.id);
      }
      dispatchExploreCommands(commands);
      cb.indeterminate = false;
    });
    disclosure.addEventListener('click', () => {
      const expanded = wrap.classList.contains('collapsed');
      wrap.classList.toggle('collapsed', !expanded);
      disclosure.setAttribute('aria-expanded', String(expanded));
      caret.textContent = expanded ? '▾' : '▸';
    });
    syncStreamParent(cb, syncers, hemiMap);
    wrap.append(head, kids); return wrap;
  };
  const byStreamOf = (arr) => { const m = {}; for (const x of arr) (m[x.stream] ||= []).push(x); return m; };
  const streamSection = (title, arr, hemiMap, applyFn, rendererKind) => {
    const bs = byStreamOf(arr); sec(title);
    for (const [stream, label] of STREAM_ORDER) if (bs[stream]) root.appendChild(streamBlock(stream, label, bs[stream], hemiMap, applyFn, rendererKind));
  };

  sec('Hemisphere');
  const hrow = document.createElement('div'); hrow.className = 'hemi-row';
  for (const h of ['L', 'R']) {
    const chip = document.createElement('label'); chip.className = 'hemi-chip';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = hemiState[h]; cb.dataset.hemisphere = h;
    cb.addEventListener('change', () => {
      hemiState[h] = cb.checked;
      if (explorePanelModel) {
        dispatchExploreCommands([{
          type: 'hemispheres.set-global',
          L: h === 'L' ? cb.checked : hemiState.L,
          R: h === 'R' ? cb.checked : hemiState.R,
        }]);
      } else applyHemi();
    });
    const t = document.createElement('span'); t.textContent = h === 'L' ? 'Left' : 'Right';
    chip.append(cb, t); hrow.appendChild(chip);
  }
  root.appendChild(hrow);

  streamSection('Structures', regions, regionHemi, applyRegionMesh, 'region');
  if (tracts && tracts.length) streamSection('White-matter tracts', tracts, tractHemi, applyTractMesh, 'tract');

  const leafSec = (title, leaves) => { sec(title); for (const lf of leaves) { const lr = leafRow(lf.id, lf.label, { color: lf.color, dim: lf.dim }); lr.cb.addEventListener('change', () => {
    const entityId = entityIdForRenderer('layer', lf.id);
    if (!entityId || !dispatchExploreCommands([{ type: 'visibility.set', entity: entityId, visible: lr.cb.checked }])) setLayer(lf.id, lr.cb.checked);
  }); root.appendChild(lr.row); } };
  leafSec('Pathways', [{ id: 'or', label: 'Optic radiation', color: '#ffb060' }, { id: 'swm', label: 'Superficial fibres', color: '#9a90c0', dim: true }, { id: 'anterior', label: 'Anterior pathway', dim: true }]);
  leafSec('Scene', [{ id: 'brain', label: 'Cortical surface' }, { id: 'labels', label: 'Labels' }]);
  applyHemi();
}

function syncPanelControls(model) {
  const root = $('layers');
  for (const input of root.querySelectorAll('.hemi-chip input[data-hemisphere]')) {
    input.checked = model.globalHemispheres[input.dataset.hemisphere];
  }
  for (const row of root.querySelectorAll('.lyr-child[data-entity-id]')) {
    const entity = model.entities[row.dataset.entityId];
    if (!entity) continue;
    for (const pill of row.querySelectorAll('.pill[data-hemisphere]')) {
      const on = entity[pill.dataset.hemisphere];
      pill.classList.toggle('on', on);
      pill.setAttribute('aria-pressed', String(on));
    }
  }
  for (const group of root.querySelectorAll('.lyr-grpwrap')) {
    const states = [...group.querySelectorAll('.lyr-child[data-entity-id]')]
      .map((row) => model.entities[row.dataset.entityId])
      .filter(Boolean);
    const checkbox = group.querySelector('.lyr-group > input');
    const allOn = states.length > 0 && states.every(({ L, R }) => L && R);
    const allOff = states.every(({ L, R }) => !L && !R);
    checkbox.checked = allOn;
    checkbox.indeterminate = !allOn && !allOff;
  }
  for (const input of root.querySelectorAll('label.lyr > input[data-id]')) {
    const entityId = entityIdForRenderer('layer', input.dataset.id);
    if (entityId) input.checked = model.entities[entityId].visible;
  }
}

function projectExplorePanel(model) {
  explorePanelModel = model;
  $('viewer-empty-state').hidden = Object.values(model.entities).some(({ visible }) => visible);
  Object.assign(hemiState, model.globalHemispheres);
  requestedFibreFilter = model.fibreFilter;
  syncFibreFilterControls(model.fibreFilter);
  sceneState.visible.clear();
  for (const entity of Object.values(model.entities)) {
    const { kind, id } = entity.renderer;
    if (kind === 'layer') {
      setLayer(id, entity.visible);
    } else if (kind === 'region') {
      regionHemi[id] = { L: entity.L, R: entity.R };
    } else if (kind === 'tract') {
      tractHemi[id] = { L: entity.L, R: entity.R };
    }
  }
  $('clip').value = model.cutaway.position;
  $('clipV').textContent = `${model.cutaway.position}%`;
  setFill($('clip'));
  $('tissue').value = Math.round(model.material.tissueOpacity * 100);
  $('tissueV').textContent = $('tissue').value;
  setFill($('tissue'));
  requestedLessonPlayback = model.playback;
  syncPlaybackControls();
  if (_regions) {
    if (!$('layers').querySelector('[data-entity-id]')) buildPanel(_regions, tractsMeta, { initialize: false });
    syncPanelControls(model);
  } else recalculateFibreFilter();
}

function clearExplorePanel() {
  exploreCommandHandler = null;
  explorePanelModel = null;
  exploreResetCamera = null;
  $('explore-camera-controls').hidden = true;
  $('spin').hidden = false;
}

function layerGroup(id) {
  return { brain: brainGroup, or: fibreGroup, anterior: anteriorGroup, labels: labelGroup, swm: swmGroup }[id] || null;
}
function lessonRendererObjects(entity) {
  const { kind, id } = entity.renderer;
  if (kind === 'layer') return [layerGroup(id)].filter(Boolean);
  if (kind === 'region') return [regionsById[id]].filter(Boolean);
  if (kind === 'tract') {
    const tract = tractsById[id];
    return tract ? [...Object.values(tract.lines), ...Object.values(tract.caps)].filter(Boolean) : [];
  }
  return [];
}
function ensureVisibilityAssets(entityIds, catalog) {
  for (const entityId of entityIds) {
    const entity = catalog.entitiesById[entityId];
    const { kind, id } = entity.renderer;
    if (kind === 'layer' && id === 'swm') loadSwm();
    if (kind === 'region') loadRegionMeshes(regionMetadataById[id]);
  }
}
function applyLessonMaterialOpacity(material) {
  const selection = material.userData.lessonSelectionFactor ?? 1;
  const visibility = material.userData.lessonVisibilityFactor ?? 1;
  const inspection = material.userData.lessonInspectionFactor ?? 1;
  const factor = selection * visibility * inspection;
  if (material.uniforms?.uOpacity) {
    material.userData.lessonBaseUniformOpacity ??= material.uniforms.uOpacity.value;
    material.uniforms.uOpacity.value = Math.min(1, material.userData.lessonBaseUniformOpacity * factor);
  } else {
    material.userData.lessonBaseOpacity ??= material.opacity;
    material.opacity = Math.min(1, material.userData.lessonBaseOpacity * factor);
  }
}
function setLessonMaterialFactor(object, axis, factor) {
  const keys = {
    selection: 'lessonSelectionFactor',
    visibility: 'lessonVisibilityFactor',
    inspection: 'lessonInspectionFactor',
  };
  const key = keys[axis];
  if (!key) throw new RangeError(`unknown material factor axis: ${axis}`);
  object.userData[key] = factor;
  object.traverse((node) => {
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    for (const material of materials.filter(Boolean)) {
      material.userData[key] = factor;
      applyLessonMaterialOpacity(material);
    }
  });
}
function reapplyLessonMaterialFactors(object) {
  for (const [axis, key] of [
    ['selection', 'lessonSelectionFactor'],
    ['visibility', 'lessonVisibilityFactor'],
    ['inspection', 'lessonInspectionFactor'],
  ]) {
    if (object.userData[key] !== undefined) setLessonMaterialFactor(object, axis, object.userData[key]);
  }
}
function resetLessonActivity() {
  st.anteriorDistanceMm = 0;
  swmT = 0;
  if (FIB) initFiring();
  if (tractActivityMeta) initTractImpulses(tractActivityMeta);
}
function settleLessonActivity() {
  st.anteriorDistanceMm = 0;
  swmT = 0;
  tracers.length = 0;
  trGeo.setDrawRange(0, 0);
  activeTractImpulses = [];
  tractImpulseGeo.setDrawRange(0, 0);
  updateAnteriorFlow();
  updateSwm(0);
}
function applyLessonPlaybackRequest({ resume = false } = {}) {
  if (requestedLessonPlayback) {
    st.speed = requestedLessonPlayback.speed;
    st.settled = reduce || requestedLessonPlayback.settled;
    st.flow = !st.settled && requestedLessonPlayback.playing;
    if (st.settled) settleLessonActivity();
    else if (st.flow && !resume) resetLessonActivity();
  }
  syncPlaybackControls();
}
function syncPlaybackControls() {
  const playing = st.flow && !st.settled;
  $('play').disabled = reduce;
  $('play').classList.toggle('on', playing);
  $('playGlyph').textContent = playing ? '❚❚' : '▶';
  $('playTxt').textContent = reduce ? 'Activity paused — reduced motion' : (playing ? 'Pause activity' : 'Play activity');
  $('speed').value = st.speed;
  $('speedV').textContent = st.speed;
  setFill($('speed'));
}

export function createLessonRendererAdapter(catalog, { onTransitionStateChange = () => {} } = {}) {
  configureAnatomyInspector(catalog);
  configureFibreFilterControls(catalog);
  controls.autoRotate = false;
  controls.enableDamping = false;
  controls.update();
  lessonTransitionStateChange = onTransitionStateChange;
  lessonTransitionStateChange(lessonTransitioning);
  if (import.meta.env.DEV) {
    window.__view.lesson = {
      get visibilityOpacities() { return structuredClone(lessonEntityOpacities); },
      get visibilityTransitioning() { return Boolean(lessonVisibilityTransition); },
      get cameraTransitioning() { return Boolean(lessonCameraTransition); },
    };
    window.__view.fibreFilter = {
      get query() { return structuredClone(requestedFibreFilter); },
      get summary() { return fibreFilterResult ? structuredClone(fibreFilterResult.summary) : null; },
      get lastRebuildMs() { return fibreFilterLastRebuildMs; },
      get selectedAssociationContours() {
        return Object.values(tractFilterMasksByGroup)
          .reduce((sum, mask) => sum + mask.reduce((count, value) => count + value, 0), 0);
      },
      get eligibleAssociationContours() {
        return Object.values(tractContoursByGroup).reduce((sum, contours) => sum + contours.length, 0);
      },
      get selectedSwmContours() {
        return swmFilterMasks.L.reduce((sum, value) => sum + value, 0)
          + swmFilterMasks.R.reduce((sum, value) => sum + value, 0);
      },
      get renderedSwmDots() { return swmGeo.drawRange.count; },
    };
  }
  let captured = { schemaVersion: 2 };
  const remember = (axis, value) => { captured = { ...captured, [axis]: value }; };
  const entityIds = Object.keys(catalog.entitiesById);
  function applyVisibilitySample(sample) {
    lessonEntityOpacities = sample.opacities;
    lessonRendererVisibility = new Set(sample.visibleIds.map((entityId) => {
      const rendererBinding = catalog.entitiesById[entityId].renderer;
      return `${rendererBinding.kind}:${rendererBinding.id}`;
    }));
    for (const id of ['brain', 'or', 'anterior', 'labels', 'swm']) {
      const group = layerGroup(id);
      if (group) group.visible = lessonAllows('layer', id);
    }
    applyHemi();
    for (const entityId of entityIds) {
      const factor = sample.opacities[entityId] ?? 0;
      for (const object of lessonRendererObjects(catalog.entitiesById[entityId])) {
        setLessonMaterialFactor(object, 'visibility', factor);
      }
    }
  }
  updateLessonVisibility = (time) => {
    if (!lessonVisibilityTransition) return;
    const sample = sampleVisibilityTransition(lessonVisibilityTransition, time);
    applyVisibilitySample(sample);
    if (sample.done) lessonVisibilityTransition = null;
  };
  const bindings = {
    setCamera(value) {
      remember('camera', value);
      const now = performance.now();
      updateLessonVisibility(now);
      controls.autoRotate = false;
      if (value.transition.kind === 'ease' && value.transition.durationMs > 0 && !reduce) {
        lessonCameraTransition = createCameraTransition({
          from: { position: camera.position.toArray(), target: controls.target.toArray() },
          to: value,
          startTime: now,
          durationMs: value.transition.durationMs,
          path: 'orbit',
        });
        controls.enabled = false;
        setLessonTransitioning(true);
      } else {
        lessonCameraTransition = null;
        setLessonTransitioning(false);
        camera.position.fromArray(value.position);
        controls.target.fromArray(value.target);
        controls.update();
      }
    },
    setVisibility(value) {
      ensureVisibilityAssets(value.entities, catalog);
      remember('visibility', value);
      lessonVisibilityActive = true;
      const now = performance.now();
      lessonVisibilityTransition = createVisibilityTransition({
        fromOpacities: lessonEntityOpacities,
        toIds: value.entities,
        startTime: lessonCameraTransition?.startTime ?? now,
        durationMs: lessonCameraTransition?.durationMs ?? 0,
      });
      updateLessonVisibility(now);
    },
    setHemispheres(value) {
      remember('hemispheres', value);
      Object.assign(hemiState, value.global);
      for (const entity of Object.values(catalog.entitiesById)) {
        if (entity.renderer.kind === 'region') regionHemi[entity.renderer.id] = { L: true, R: true };
        if (entity.renderer.kind === 'tract') tractHemi[entity.renderer.id] = { L: true, R: true };
      }
      for (const [entityId, hemispheres] of Object.entries(value.entities)) {
        const entity = catalog.entitiesById[entityId];
        if (entity.renderer.kind === 'region') regionHemi[entity.renderer.id] = { ...hemispheres };
        if (entity.renderer.kind === 'tract') tractHemi[entity.renderer.id] = { ...hemispheres };
      }
      applyHemi();
    },
    setFibreFilter(value) {
      remember('fibreFilter', value);
      requestedFibreFilter = value;
      syncFibreFilterControls(value);
      recalculateFibreFilter();
    },
    setCutaway(value) {
      remember('cutaway', value);
      clipPlane.constant = 80 - (value.position / 100) * 160;
      $('clip').value = value.position;
      $('clipV').textContent = `${value.position}%`;
      setFill($('clip'));
    },
    setMaterial(value) {
      remember('material', value);
      brainMat.userData.lessonBaseOpacity = value.tissueOpacity;
      applyLessonMaterialOpacity(brainMat);
      $('tissue').value = Math.round(value.tissueOpacity * 100);
      $('tissueV').textContent = $('tissue').value;
      setFill($('tissue'));
    },
    setPlayback(value) {
      remember('playback', value);
      const resume = requestedLessonPlayback
        && !requestedLessonPlayback.playing
        && !requestedLessonPlayback.settled
        && value.playing
        && !value.settled
        && requestedLessonPlayback.speed === value.speed;
      requestedLessonPlayback = value;
      applyLessonPlaybackRequest({ resume });
    },
    setSelection(value) {
      remember('selection', value);
      const emphasized = new Set(value.emphasized);
      if (value.selected) emphasized.add(value.selected);
      const hasFocus = emphasized.size > 0;
      for (const entity of Object.values(catalog.entitiesById)) {
        if (entity.id === 'layer.cortex' || entity.id === 'layer.labels') continue;
        const factor = hasFocus ? (emphasized.has(entity.id) ? 1 + value.strength * 0.65 : 0.45) : 1;
        for (const object of lessonRendererObjects(entity)) setLessonMaterialFactor(object, 'selection', factor);
      }
    },
    setVisual(value) { remember('visual', value); },
    setControlPolicy(value) {
      remember('controlPolicy', value);
      lessonControlMode = value.mode;
      controls.autoRotate = false;
      controls.enabled = value.mode !== 'guided' && !lessonCameraTransition;
      controls.enableRotate = value.mode !== 'guided';
      controls.enablePan = value.mode === 'explore';
      controls.enableZoom = value.mode === 'explore';
      controls.touches.ONE = value.mode === 'explore' ? THREE.TOUCH.ROTATE : THREE.TOUCH.PAN;
      controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
      renderer.domElement.style.touchAction = value.mode === 'explore' ? 'none' : 'pan-y';
    },
    capture() { return structuredClone(captured); },
  };
  const adapter = createRendererAdapter(bindings, catalog);
  rendererEntityIds = new Map(Object.values(catalog.entitiesById).map((entity) => [
    `${entity.renderer.kind}:${entity.renderer.id}`,
    entity.id,
  ]));
  return Object.freeze({
    apply: adapter.apply,
    capture: adapter.capture,
    captureRenderedCamera() {
      return {
        position: camera.position.toArray(),
        target: controls.target.toArray(),
      };
    },
    setAnatomyIntentHandler(handler) {
      if (handler !== null && typeof handler !== 'function') {
        throw new TypeError('Anatomy intent handler must be a function or null');
      }
      anatomyIntentHandler = handler;
    },
    setInspectableHighlight,
    resizeToStage() { resize(); },
    setExploreCommandHandler(handler) {
      if (handler !== null && typeof handler !== 'function') throw new TypeError('Explore command handler must be a function or null');
      exploreCommandHandler = handler;
    },
    syncExplorePanel(model) { projectExplorePanel(model); },
    beginExploreCamera(resetCamera, { fitToStage = false } = {}) {
      const framed = structuredClone(resetCamera);
      if (fitToStage) {
        const rect = stage.getBoundingClientRect();
        const aspect = rect.height > 0 ? rect.width / rect.height : 1;
        const distanceFactor = THREE.MathUtils.clamp(0.78 / aspect, 1, 1.55);
        if (distanceFactor > 1) {
          const target = new THREE.Vector3().fromArray(framed.target);
          const offset = new THREE.Vector3().fromArray(framed.position).sub(target);
          framed.position = target.add(offset.multiplyScalar(distanceFactor)).toArray();
          camera.position.fromArray(framed.position);
          controls.target.fromArray(framed.target);
          controls.update();
        }
      }
      exploreResetCamera = framed;
      controls.autoRotate = false;
      $('spin').classList.remove('on');
      $('spin').hidden = true;
      $('explore-camera-controls').hidden = false;
    },
    endExplore() { clearExplorePanel(); },
  });
}

const VIEWS = {
  lateral: [300, 15, 0], top: [0, 350, 0.01], post: [0, 30, 350], ant: [0, 30, -350],
};
document.querySelectorAll('[data-view]').forEach((button) => button.addEventListener('click', () => {
  camera.position.set(...VIEWS[button.dataset.view]); controls.update();
}));
function applyExploreCameraAction(action) {
  if (!exploreCommandHandler) return;
  const offset = camera.position.clone().sub(controls.target);
  const distance = offset.length();
  if (action === 'zoom-in' || action === 'zoom-out') {
    const factor = action === 'zoom-in' ? 0.82 : 1.22;
    offset.setLength(THREE.MathUtils.clamp(distance * factor, controls.minDistance, controls.maxDistance));
    camera.position.copy(controls.target).add(offset);
  } else {
    camera.updateMatrixWorld();
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
    const amount = Math.max(4, distance * 0.08);
    const delta = action === 'pan-left' ? right.multiplyScalar(-amount)
      : action === 'pan-right' ? right.multiplyScalar(amount)
        : action === 'pan-up' ? up.multiplyScalar(amount)
          : up.multiplyScalar(-amount);
    camera.position.add(delta);
    controls.target.add(delta);
  }
  controls.update();
}
document.querySelectorAll('[data-explore-camera]').forEach((button) => {
  button.addEventListener('click', () => applyExploreCameraAction(button.dataset.exploreCamera));
});
$('reset').addEventListener('click', () => {
  if (exploreResetCamera) {
    camera.position.fromArray(exploreResetCamera.position);
    controls.target.fromArray(exploreResetCamera.target);
  } else {
    camera.position.copy(HOME);
    controls.target.set(0, 0, 0);
  }
  controls.update();
});

[$('speed'), $('clip'), $('tissue')].forEach(setFill);
brainMat.opacity = $('tissue').value / 100;
if (reduce) $('spin').classList.remove('on');

updateAnteriorFlow();
loadBrain();
loadFibres();
loadRegions();
loadTracts();
requestAnimationFrame(animate);
