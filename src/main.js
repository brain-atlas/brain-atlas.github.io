import './style.css';
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
  canonicalContourParameter,
  createAssociationImpulseEngine,
  updateAssociationEventPool,
} from './activity/association-impulses.js';
import { createSwmVibration, vibrationContourParameter } from './activity/swm-vibration.js';

// ---------------------------------------------------------------------------
const stage = document.getElementById('stage');
const reduce = matchMedia('(prefers-reduced-motion:reduce)').matches;

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
// Cortical and region assets identify MNI152NLin2009cAsym; fibre assets are
// consumed as RAS millimetres while brain-atlas-yum.5 audits their exact
// 2009a/2009c source-space derivation. The scene frame is RIGHT-HANDED:
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
    setBadge('Cortical surface: MNI152NLin2009cAsym template shell — see README for sources');
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
  anteriorGroup.add(new THREE.Points(geo, new THREE.PointsMaterial({
    color: col, size: 1.25, map: SPR, transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: true })));
  flows.push({ curve, geo, pos });
}

// Landmark spheres (eyes/chiasm) + CSS2D labels
const sphereGeo = new THREE.SphereGeometry(1, 20, 20);
const sphereMat = new THREE.MeshBasicMaterial({ color: 0xe8f0fb });
for (const s of SPHERES) {
  const m = new THREE.Mesh(sphereGeo, sphereMat);
  m.position.set(...s.p); m.scale.setScalar(s.r); anteriorGroup.add(m);
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
const orLines = {}, orCaps = {};
const hemiState = { L: true, R: true };     // global master L/R filter (ANDs with per-item)
const regionHemi = {};                      // id -> {L,R} per-region hemisphere visibility
const tractsById = {}, tractHemi = {};      // association tracts + their L/R visibility
function applyRegionMesh(id) {
  const grp = regionsById[id], rh = regionHemi[id] || { L: true, R: true };
  if (grp) grp.traverse((n) => { if (n.isMesh && n.userData && n.userData.hemi) n.visible = hemiState[n.userData.hemi] && rh[n.userData.hemi]; });
}
function applyTractMesh(id) {
  const t = tractsById[id], th = tractHemi[id] || { L: true, R: true };
  if (t) for (const h of ['L', 'R']) { const vis = hemiState[h] && th[h]; if (t.lines[h]) t.lines[h].visible = vis; if (t.caps && t.caps[h]) t.caps[h].visible = vis; }
}
function applyHemi() {
  for (const id in regionsById) applyRegionMesh(id);
  for (const id in tractsById) applyTractMesh(id);
  for (const h of ['L', 'R']) { if (orLines[h]) orLines[h].visible = hemiState[h]; if (orCaps[h]) orCaps[h].visible = hemiState[h]; if (swmLines[h]) swmLines[h].visible = hemiState[h]; }
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
function loadRegions() {
  fetch('/data/regions.json').then((r) => r.json()).then(({ regions }) => {
    for (const reg of regions) {
      const mat = makeRegionMaterial(reg.color, reg.opacity);
      const group = new THREE.Group(); group.userData = { id: reg.id, name: reg.name, parent: reg.parent };
      for (const hemi of Object.keys(reg.meshes)) {
        new OBJLoader().load('/' + reg.meshes[hemi].file, (obj) => {
          let geom = null; obj.traverse((n) => { if (n.isMesh && !geom) geom = n.geometry; });
          if (!geom) return;
          if (!geom.attributes.normal) geom.computeVertexNormals();
          const mesh = new THREE.Mesh(geom, mat); mesh.frustumCulled = false; mesh.userData = { hemi };
          mesh.visible = hemiState[hemi] && (regionHemi[reg.id] ? regionHemi[reg.id][hemi] : true);
          group.add(mesh);
        }, undefined, (e) => console.warn('region mesh failed:', reg.meshes[hemi].file, e));
      }
      regionGroup.add(group); regionsById[reg.id] = group;
    }
    _regions = regions; buildPanel(regions, tractsMeta);
  }).catch((e) => console.warn('regions manifest failed:', e));
}

// ---------------------------------------------------------------------------
// Real optic-radiation streamlines (HCP-1065, sampled) + tracer flow.
// Faint fibres show real density; bright tracers are fired down random fibres,
// LGN -> V1, recycling. Everything is in MNI mm under mniGroup.
const fibreGroup = new THREE.Group(); mniGroup.add(fibreGroup);
let FIB = null;

const MAXTR = 600;   // pool cap; firing model targets ~500 concurrent (see BIO_PER_WALL)
const trGeo = new THREE.BufferGeometry();
trGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXTR * 3), 3).setUsage(THREE.DynamicDrawUsage));
trGeo.setDrawRange(0, 0);
fibreGroup.add(new THREE.Points(trGeo, new THREE.PointsMaterial({
  color: 0xfff0d8, size: 1.3, map: SPR, transparent: true, depthWrite: false,
  blending: THREE.AdditiveBlending, sizeAttenuation: true })));
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
  tracers.push({ poly, t: 0, speed: 0.28 + Math.random() * 0.16, hemi: h });
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
  const sp = st.speed / 70, arr = trGeo.attributes.position.array;
  if (st.flow) {
    generateFiring(dt);
    for (const tr of tracers) tr.t += dt * sp * tr.speed;
    for (let i = tracers.length - 1; i >= 0; i--) if (tracers[i].t > 1) tracers.splice(i, 1);
  }
  let k = 0;
  for (const tr of tracers) {
    if (!hemiState[tr.hemi]) continue;
    writeFibrePoint(tr.poly, tr.t, arr, k * 3); k++;
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
  }).catch((e) => console.warn('fibres load failed:', e));
}

// ---------------------------------------------------------------------------
// Visual-stream association tracts (HCP-1065): real population contours plus
// modeled stochastic code-like impulses. Diffusion MRI supplies no polarity, so
// direction is sampled per event from disclosed metadata, never array order.
const tractGroup = new THREE.Group(); mniGroup.add(tractGroup);
let tractsMeta = null, tractActivityMeta = null, _regions = null;
function hexRGB(hex) { const n = parseInt(hex.replace('#', ''), 16); return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]; }
function loadTracts() {
  Promise.all([
    fetch('/data/tracts.json').then((r) => r.json()),
    fetch('/data/tract_activity.json').then((r) => r.json()),
  ]).then(([{ tracts }, activity]) => {
    tractsMeta = tracts;
    tractActivityMeta = activity;
    for (const tr of tracts) {
      tractHemi[tr.id] = tractHemi[tr.id] || { L: true, R: true };
      const mat = new THREE.LineBasicMaterial({ color: tr.color, transparent: true, opacity: 0.06, blending: THREE.AdditiveBlending, depthWrite: false });
      const rgb = hexRGB(tr.color);
      const capMat = new THREE.PointsMaterial({ color: new THREE.Color(Math.min(1, rgb[0] * 1.3), Math.min(1, rgb[1] * 1.3), Math.min(1, rgb[2] * 1.3)),
        size: 2.2, sizeAttenuation: false, map: SPR, transparent: true, opacity: 0.6, depthWrite: false });
      const entry = { lines: {}, caps: {}, L: [], R: [], rgb };
      for (const h of ['L', 'R']) {
        const linePos = [], capPos = [];
        for (const f of tr[h]) {
          const poly = f.map((p) => new THREE.Vector3(p[0], p[1], p[2])); entry[h].push(poly);
          for (let i = 0; i < poly.length - 1; i++) linePos.push(poly[i].x, poly[i].y, poly[i].z, poly[i + 1].x, poly[i + 1].y, poly[i + 1].z);
          const a = poly[0], b = poly[poly.length - 1]; capPos.push(a.x, a.y, a.z, b.x, b.y, b.z);   // both fibre ends
        }
        const vis = hemiState[h] && tractHemi[tr.id][h];
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(linePos, 3));
        const lines = new THREE.LineSegments(g, mat); lines.userData = { tractId: tr.id, hemi: h }; lines.visible = vis;
        tractGroup.add(lines); entry.lines[h] = lines;
        const cg = new THREE.BufferGeometry(); cg.setAttribute('position', new THREE.Float32BufferAttribute(capPos, 3));
        const caps = new THREE.Points(cg, capMat); caps.userData = { tractId: tr.id, hemi: h }; caps.visible = vis;
        tractGroup.add(caps); entry.caps[h] = caps;
      }
      tractsById[tr.id] = entry;
    }
    initTractImpulses(activity);
    if (_regions) buildPanel(_regions, tractsMeta);   // rebuild the panel with the tracts section
  }).catch((e) => console.warn('tract load failed:', e));
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
      tractContoursByGroup[groupId] = tractsById[tract.id][hemi];
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
      get renderedGroups() {
        return activeTractImpulses
          .map((event) => event.groupId)
          .filter((groupId) => {
            const [id, hemi] = groupId.split(':');
            return tractsById[id].lines[hemi].visible;
          });
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
      return tractsById[id].lines[hemi].visible;
    },
  });
  activeTractImpulses = reduce ? [] : pool.active;

  const arr = tractImpulseGeo.attributes.position.array;
  const col = tractImpulseGeo.attributes.color.array;
  let k = 0;
  for (const event of activeTractImpulses) {
    const [id, hemi] = event.groupId.split(':');
    if (!tractsById[id].lines[hemi].visible) continue;
    const progress = (tractImpulseTime - event.time) * event.speed;
    const rawT = canonicalContourParameter(event.contour, tractActivityById[id].endpointA.classifier, event.aToB, progress);
    writeFibrePoint(event.contour, rawT, arr, k * 3);
    const rgb = tractsById[id].rgb;
    col[k * 3] = rgb[0]; col[k * 3 + 1] = rgb[1]; col[k * 3 + 2] = rgb[2]; k++;
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
const swmLines = { L: null, R: null };
const swmDots = []; let swmT = 0;
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
  fetch('/data/swm_fibres.json').then((r) => r.json()).then((data) => {
    const linePos = { L: [], R: [] };
    const lloc = data.lloc, lens = data.len;   // baked local-mean length + own length (mm)
    data.fibres.forEach((f, idx) => {
      const poly = f.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
      let mx = 0; for (const v of poly) mx += v.x; mx /= poly.length;
      const h = mx >= 0 ? 'R' : 'L';                     // +x = MNI right hemisphere
      SWM[h].push(poly);
      for (let i = 0; i < poly.length - 1; i++) linePos[h].push(poly[i].x, poly[i].y, poly[i].z, poly[i + 1].x, poly[i + 1].y, poly[i + 1].z);
      // One vibrating dot per fibre. AMPLITUDE (arc fraction) is set so the dot's
      // physical swing ≈ 0.5 × the LOCAL-MEAN fibre length here — longer bundles
      // vibrate wider (structure). Home is sampled from the amplitude-safe interval,
      // and random phase prevents coherent travel without endpoint clipping.
      const Lown = (lens && lens[idx]) || 25, Ll = (lloc && lloc[idx]) || Lown;
      swmDots.push({ poly, hemi: h, ...createSwmVibration({
        ownLength: Lown,
        localMeanLength: Ll,
      }) });
    });
    // Static tangent grain: faint additive lines in a desaturated violet so the
    // superficial system reads as its own layer, distinct from the cool-white
    // surface and the amber/cyan directed flows. Overlap builds up where dense.
    const grainMat = new THREE.LineBasicMaterial({ color: 0x9a90c0, transparent: true, opacity: 0.08, blending: THREE.AdditiveBlending, depthWrite: false });
    for (const h of ['L', 'R']) {
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(linePos[h], 3));
      const lines = new THREE.LineSegments(g, grainMat); lines.visible = hemiState[h]; swmGroup.add(lines); swmLines[h] = lines;
    }
  }).catch((e) => console.warn('swm load failed:', e));
}
function updateSwm(dt) {
  if (!swmDots.length || !swmGroup.visible) { swmGeo.setDrawRange(0, 0); return; }
  const arr = swmGeo.attributes.position.array;
  if (st.flow && !reduce) swmT += dt * (st.speed / 70);
  let k = 0;
  for (const d of swmDots) {
    if (!hemiState[d.hemi]) continue;
    const t = reduce ? d.home : vibrationContourParameter(d, swmT);   // bounded vibration ALONG the contour
    writeFibrePoint(d.poly, t, arr, k * 3); k++;
  }
  swmGeo.setDrawRange(0, k);
  swmGeo.attributes.position.needsUpdate = true;
}

// ---------------------------------------------------------------------------
// State + loop
const st = { flow: !reduce, speed: 70, phase: 0 };
const clock = new THREE.Clock();

function resize() {
  const w = stage.clientWidth, h = stage.clientHeight;
  camera.aspect = w / h; camera.updateProjectionMatrix();
  renderer.setSize(w, h); labelRenderer.setSize(w, h);
}
window.addEventListener('resize', resize); resize();

function updateAnteriorFlow() {
  for (const f of flows) {
    for (let i = 0; i < NP; i++) {
      const t = (i / NP + st.phase) % 1;
      const p = f.curve.getPointAt(t);
      f.pos[i * 3] = p.x; f.pos[i * 3 + 1] = p.y; f.pos[i * 3 + 2] = p.z;
    }
    f.geo.attributes.position.needsUpdate = true;
  }
}
function animate() {
  const dt = Math.min(0.05, clock.getDelta());
  if (st.flow) {
    st.phase = (st.phase + dt * (st.speed / 70) * 0.075) % 1;
    updateAnteriorFlow();
  }
  updateTracers(dt);
  updateTractImpulses(dt);
  updateSwm(dt);
  controls.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(animate);
}

// ---------------------------------------------------------------------------
// UI
const $ = (id) => document.getElementById(id);
const setFill = (el) => el.style.setProperty('--fill', ((el.value - el.min) / (el.max - el.min) * 100) + '%');
function setBadge(txt) {
  let b = document.querySelector('.badge');
  if (!b) { b = document.createElement('div'); b.className = 'badge'; document.querySelector('.overlay').appendChild(b); }
  b.textContent = txt;
}

$('play').addEventListener('click', () => {
  if (reduce) return;
  st.flow = !st.flow;
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
$('speed').addEventListener('input', (e) => { st.speed = +e.target.value; $('speedV').textContent = st.speed; setFill(e.target); });
$('clip').addEventListener('input', (e) => { clipPlane.constant = 80 - (e.target.value / 100) * 160; $('clipV').textContent = e.target.value + '%'; setFill(e.target); });
$('tissue').addEventListener('input', (e) => { brainMat.opacity = e.target.value / 100; $('tissueV').textContent = e.target.value; setFill(e.target); });
$('spin').addEventListener('click', () => { controls.autoRotate = !controls.autoRotate; $('spin').classList.toggle('on', controls.autoRotate); });

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
function buildPanel(regions, tracts) {
  Object.assign(layerObjs, { brain: brainGroup, or: fibreGroup, anterior: anteriorGroup, labels: labelGroup, swm: swmGroup });
  for (const reg of regions) layerObjs[reg.id] = regionsById[reg.id];
  Object.keys(layerObjs).forEach((id) => sceneState.visible.add(id));
  for (const id of DEFAULT_OFF) { sceneState.visible.delete(id); if (layerObjs[id]) layerObjs[id].visible = false; }
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
  const streamBlock = (label, items, hemiMap, applyFn) => {
    const wrap = document.createElement('div'); wrap.className = 'lyr-grpwrap collapsed';
    const head = document.createElement('div'); head.className = 'lyr lyr-group';
    const caret = document.createElement('span'); caret.className = 'caret'; caret.textContent = '▸';
    const cb = document.createElement('input'); cb.type = 'checkbox';
    const t = document.createElement('span'); t.className = 'lyr-t'; t.textContent = label;
    head.append(caret, cb, t);
    const kids = document.createElement('div'); kids.className = 'lyr-kids';
    const syncers = [];
    for (const it of items) {
      hemiMap[it.id] = hemiMap[it.id] || { L: true, R: true };
      const row = document.createElement('div'); row.className = 'lyr lyr-child';
      const sw = document.createElement('span'); sw.className = 'swatch'; sw.style.background = it.color; sw.style.color = it.color;
      const nm = document.createElement('span'); nm.className = 'lyr-t'; nm.textContent = it.name;
      const pills = document.createElement('span'); pills.className = 'hemi-pills';
      const pill = {};
      for (const h of ['L', 'R']) {
        const p = document.createElement('button'); p.type = 'button'; p.className = 'pill'; p.textContent = h;
        p.classList.toggle('on', hemiMap[it.id][h]);
        p.addEventListener('click', () => { hemiMap[it.id][h] = !hemiMap[it.id][h]; p.classList.toggle('on', hemiMap[it.id][h]); applyFn(it.id); syncStreamParent(cb, syncers, hemiMap); });
        pills.append(p); pill[h] = p;
      }
      nm.addEventListener('click', () => { const on = !(hemiMap[it.id].L || hemiMap[it.id].R); hemiMap[it.id].L = hemiMap[it.id].R = on; pill.L.classList.toggle('on', on); pill.R.classList.toggle('on', on); applyFn(it.id); syncStreamParent(cb, syncers, hemiMap); });
      row.append(sw, nm, pills); kids.appendChild(row);
      syncers.push({ id: it.id, pill });
    }
    cb.addEventListener('change', () => { const on = cb.checked; for (const s of syncers) { hemiMap[s.id].L = hemiMap[s.id].R = on; s.pill.L.classList.toggle('on', on); s.pill.R.classList.toggle('on', on); applyFn(s.id); } cb.indeterminate = false; });
    const toggle = () => { wrap.classList.toggle('collapsed'); caret.textContent = wrap.classList.contains('collapsed') ? '▸' : '▾'; };
    caret.addEventListener('click', toggle); t.addEventListener('click', toggle);
    syncStreamParent(cb, syncers, hemiMap);
    wrap.append(head, kids); return wrap;
  };
  const byStreamOf = (arr) => { const m = {}; for (const x of arr) (m[x.stream] ||= []).push(x); return m; };
  const streamSection = (title, arr, hemiMap, applyFn) => {
    const bs = byStreamOf(arr); sec(title);
    for (const [stream, label] of STREAM_ORDER) if (bs[stream]) root.appendChild(streamBlock(label, bs[stream], hemiMap, applyFn));
  };

  sec('Hemisphere');
  const hrow = document.createElement('div'); hrow.className = 'hemi-row';
  for (const h of ['L', 'R']) {
    const chip = document.createElement('label'); chip.className = 'hemi-chip';
    const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = hemiState[h];
    cb.addEventListener('change', () => { hemiState[h] = cb.checked; applyHemi(); });
    const t = document.createElement('span'); t.textContent = h === 'L' ? 'Left' : 'Right';
    chip.append(cb, t); hrow.appendChild(chip);
  }
  root.appendChild(hrow);

  streamSection('Structures', regions, regionHemi, applyRegionMesh);
  if (tracts && tracts.length) streamSection('White-matter tracts', tracts, tractHemi, applyTractMesh);

  const leafSec = (title, leaves) => { sec(title); for (const lf of leaves) { const lr = leafRow(lf.id, lf.label, { color: lf.color, dim: lf.dim }); lr.cb.addEventListener('change', () => setLayer(lf.id, lr.cb.checked)); root.appendChild(lr.row); } };
  leafSec('Pathways', [{ id: 'or', label: 'Optic radiation', color: '#ffb060' }, { id: 'swm', label: 'Superficial fibres', color: '#9a90c0', dim: true }, { id: 'anterior', label: 'Anterior pathway', dim: true }]);
  leafSec('Scene', [{ id: 'brain', label: 'Cortical surface' }, { id: 'labels', label: 'Labels' }]);
  applyHemi();
}

const VIEWS = {
  lateral: [300, 15, 0], top: [0, 350, 0.01], post: [0, 30, 350], ant: [0, 30, -350],
};
document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => {
  camera.position.set(...VIEWS[b.dataset.view]); controls.update();
}));
$('reset').addEventListener('click', () => { camera.position.copy(HOME); controls.target.set(0, 0, 0); controls.update(); });

[$('speed'), $('clip'), $('tissue')].forEach(setFill);
brainMat.opacity = $('tissue').value / 100;
if (reduce) $('spin').classList.remove('on');

updateAnteriorFlow();
loadBrain();
loadFibres();
loadRegions();
loadTracts();
loadSwm();
animate();
