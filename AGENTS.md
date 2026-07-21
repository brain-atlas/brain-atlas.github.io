# Repository instructions

`brain-atlas` is an interactive 3D WebGL/Three.js viewer of the human **visual
system**, rendered as animated flow inside a real translucent cortical surface.
Everything posterior to the optic chiasm is real atlas/template data interpreted
in one runtime MNI/ICBM RAS-millimetre frame; only the anterior
eye→chiasm→LGN segment is schematic. `src/main.js` is essentially the whole app.

## The two rules that matter most

### 1. One coordinate frame, one runtime transform
The cortical surface and region shells are authored in
**MNI152NLin2009cAsym RAS millimetres**. Fibre assets are also loaded as MNI/ICBM
RAS millimetres, but their upstream HCP sources identify ICBM 2009a or generic
ICBM152; the exact release/conversion history is an open provenance gate
(`brain-atlas-yum.5`). Every layer is parented to one `mniGroup` whose matrix
(`sceneFromMni`) is the ONLY runtime transform: a proper −90° rotation about the
R axis (determinant +1, so left/right and chirality are preserved), uniform mm
scale, and recentering translation.

- Do not add a second runtime transform, per-dataset fitting, or marker-based
  alignment. If the provenance audit finds a mismatch, convert or regenerate the
  asset offline, record the derivation, and keep the single runtime transform.
- Jülich MPM right label = left label + 1000. Render real bilateral region meshes;
  do not introduce new mirroring. The optic-radiation dataset remains the one
  documented legacy exception until real right-side streamlines replace it.

### 2. Honesty of representation — never imply structure the data lacks
This is the project's defining constraint.

- **Direction.** Draw directed travel only when biology or an explicitly
  disclosed activity model supplies direction. Retina→LGN→V1 is biologically
  directed. Named long association tracts use modeled stochastic code events:
  source→endpoint probability comes from cited evidence where defensible and
  otherwise from a labelled 50/50 assumption. Never use streamline array order
  as measured polarity. Superficial WM/U-fibres remain a static tangent grain
  with zero-mean along-contour vibration and no net travel.
- **Fibre orientation is undirected.** Never average fibre direction vectors
  (average structure tensors if you must combine them).
- **Amplitude/frequency channels** must map to real structure (e.g. vibration
  amplitude ∝ local fibre length) or be clearly illustrative — never presented as
  measured firing rate or axonal transmission.
- **Label real vs schematic** in the legend. Approximate elements are acceptable
  only when labelled and the overall anatomy reads correctly.

## Data provenance
- Surface/region space: MNI152NLin2009cAsym (TemplateFlow), 1 mm grid.
- Fibre source-space identity/conversion: unresolved audit `brain-atlas-yum.5`;
  do not strengthen the claim beyond the asset metadata and traceability record.
- Regions: Jülich-Brain v3.0.3 Maximum Probability Map (winner-take-all).
- Optic radiation / association tracts / superficial WM: HCP-1065 population
  template, tracked with DSI Studio on the ICBM152-2009a FIB.
- Parse structured/binary data (NIfTI, `.trk` streamlines, JSON, OBJ/GLB) with
  established parsers (nibabel, the three.js loaders) — never ad-hoc byte or text
  matching. DSI Studio writes **gzipped** `.trk` under a plain `.trk` name; detect
  the `1f 8b` magic and gunzip.

## Documentation and traceability lifecycle

Keep future intent, current behavior, work status, and scientific evidence in
their proper artifacts:

| Artifact | Authority |
|---|---|
| Beads | Work status, dependencies, decisions, approvals, blockers, and closeout evidence. |
| `.pi/plans/` | Beads-backed future design and execution guidance with explicit draft/approval status. A plan is not evidence that behavior has shipped. |
| `README.md` and user docs | Current public capabilities, controls, setup, and limitations. |
| `docs/ARCHITECTURE.md` and subsystem `SPEC.md` files | Current implemented structure, interfaces, invariants, and failure modes. Label future opportunities as future work. |
| `docs/FUTURE_FEATURES.md` | Researched ideas that are not committed work. Move actionable work into Beads. |
| `AGENTS.md` | Durable contributor rules, scientific invariants, and repository workflow. Do not use it as a backlog. |
| Public traceability records and `DATA_LICENSES.md` | Scientific claims, geometry and behavior provenance, derivations, assumptions, uncertainty, citations, and data terms. |
| `CITATION.cff` | The software citation for the released viewer. |
| `THIRD_PARTY_NOTICES.md` | Notices for shipped third-party software and models. |

Repository invariants in `AGENTS.md` remain operative until deliberately changed.
A Bead or approved plan may propose a future exception, but it does not override
these instructions or make public/current documentation true. If implementation
would conflict with an invariant, stop: record the decision and approval in
Beads, reconcile `AGENTS.md` and the relevant architecture, provenance, and user
documentation, then implement through a separate accepted Bead.

Review documentation impact whenever behavior or evidence changes:

| Change | Review and update |
|---|---|
| User-visible behavior, controls, accessibility, or limitations | `README.md` or user documentation; keep screenshots and examples truthful. |
| Runtime architecture, state ownership, interfaces, or technical invariants | `docs/ARCHITECTURE.md` and the nearest `SPEC.md`; update `AGENTS.md` when the contributor rule itself changes. |
| Scientific representation, label, teaching claim, activity model, or disclosed limitation | Public traceability records and entity/model metadata; update public copy and `AGENTS.md` when its honesty rules change. |
| Dataset, asset, atlas/template version, generator, transform, mirroring, derivation, or data license | `DATA_LICENSES.md`, traceability records, source/generator metadata, and the `README.md` source summary. |
| Shipped dependency, model, or license | Lockfiles and `THIRD_PARTY_NOTICES.md`; revisit security documentation when the trust boundary changes. |
| Release title, version, authorship, repository URL, or public URL | `CITATION.cff` and matching public documentation. |
| Security, hosting, CSP, or publication workflow | `docs/SECURITY_REVIEW.md`, deployment documentation, and verification commands. |

For scientific sources, prefer canonical dataset records and primary methods.
Verify the cited record and license terms at their source before adding or
changing them; do not copy an unverified citation from a plan or model output.
Record versions, stable URLs or DOIs, licenses, transformations, generator/source
paths, assumptions, uncertainty, and known limitations. Never infer provenance
from a filename. A scientific claim needs a citation or an explicit evidence gap;
do not guess. Change data/model behavior and its provenance, citations, and
user-visible disclosure together.

Before closing a change Bead:

1. compare the implementation with its approved design and record material
   deviations or obtain renewed approval;
2. update current/public docs only for behavior that has landed;
3. update citations, licenses, traceability records, and notices affected by the
   change, or record a specific no-impact rationale in the Bead;
4. mark replaced plans or docs as superseded and link their replacement rather
   than leaving two apparently authoritative designs; and
5. record the documentation and verification evidence in the Bead.

See `.pi/plans/README.md` for the design-document lifecycle. The scientific
inventory being developed under the fidelity work owns detailed claim-level
traceability; do not duplicate that inventory in `AGENTS.md`.

## Offline data pipeline (heavy generation is NOT in the app)
Meshing and tractography run offline and emit small JSON/OBJ/GLB into
`public/data` and `public/models`.

- Run Python with `uv run --with nibabel --with numpy --with scipy python …`
  (there is no project venv carrying these).
- The **DSI Studio binary cannot be launched from an agent shell** — the harness
  blocks it. Hand the user the exact `dsi_studio --action=trk …` command and have
  them run it via `!`, then take over parsing the output.
- Author outputs in MNI mm, resample fibres to a fixed point count, round
  coordinates, and keep files web-light (decimate meshes, sample fibres). GPU
  memory is the binding constraint, not disk.

## Architecture (all in `src/main.js`)
- `mniGroup` (`matrixAutoUpdate = false`) parents every layer, in add order:
  `brainGroup`, `anteriorGroup`, `labelGroup`, `regionGroup`, `fibreGroup` (optic
  radiation), `tractGroup`, `swmGroup`.
- Visibility: `hemiState` (global L/R) ANDs with per-item L/R (`regionHemi`,
  `tractHemi`); `applyHemi()`, `applyRegionMesh`, `applyTractMesh` enforce it.
- Panel: `sceneState.visible` is the serializable source of truth. `buildPanel`
  renders the collapsible stream tree (regions + tracts, each with L/R pills) and
  leaf toggles (Pathways + Scene). Layer objects live in `layerObjs`; `DEFAULT_OFF`
  starts some hidden.
- Activity: LGN→V1 firing is a superposition+thinning inhomogeneous-Poisson model
  (`initFiring` / `generateFiring` / `updateTracers`). Named association tracts
  use the seeded inhibited event engine in `src/activity/association-impulses.js`
  plus the thin `updateTractImpulses` renderer adapter; v1 samples direction per
  accepted event from explicit bilateral 50/50 metadata in
  `public/data/tract_activity.json`. SWM keeps its separate analytically
  zero-mean vibration model in `src/activity/swm-vibration.js`; `updateSwm`
  remains the thin renderer adapter.
- Region material is a fresnel rim-fade shader (near-transparent interior, bright
  silhouette) so overlapping shells read as outlines.
- Development mode exposes `window.__view = { camera, controls, scene, THREE }`
  for scripted framing and screenshots — see `skills/user.md`. Vite removes this
  guarded hook from production builds; verify that before a public release.
- `src/pathways.js` holds the schematic anterior-pathway control points.
- `src/lesson/` holds the versioned renderer-independent lesson foundation:
  strict Markdown/YAML/Ajv parsing, stable entity/fidelity catalogs, complete
  immutable scene snapshots, pure allowlisted commands, and the single renderer
  adapter port. Read `src/lesson/SPEC.md` before changing this subsystem. It must
  not import Three.js/DOM state, infer behavior from prose, execute lesson code,
  or introduce another coordinate transform; Three.js bindings and lesson UI are
  intentionally deferred to their owning Beads.

## Run and verify
```bash
npm test                            # focused renderer-independent state/activity tests
npm run dev                         # Vite dev server → http://localhost:5180
npm run build && npm run preview    # static, HMR-free — use for stable viewing
```
The automated suite covers only extracted pure behavior; it does not replace
visual verification. Load the page, confirm the browser console is error-free,
drive the scene through the development-only `window.__view` hook and layer panel
(see `skills/user.md`), and capture a screenshot. HMR full-reloads can churn the
WebGL context, so prefer the static preview when inspecting.

## Review expectations
- Prioritise coordinate/transform correctness, honest labelling (real vs
  schematic, no implied direction), data provenance, and GPU/bundle weight over
  stylistic preferences.
- Treat simplification as part of the work: remove superseded render paths once
  their replacement is verified (e.g. the schematic U-fibre tubes were excised
  after the SWM texture replaced them).
- Preserve unrelated working-tree changes; stage only the files your change owns.
- Distinguish pre-existing issues from ones you introduce, and report what you
  actually ran.
