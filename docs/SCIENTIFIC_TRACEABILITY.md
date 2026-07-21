# Scientific traceability inventory

Status: current-state audit for `brain-atlas-yum.1` (2026-07-21). This document
separates anatomical geometry from the viewer's activity and display models.
`DATA_LICENSES.md` remains the authority for redistribution terms and full source
citations. `public/data/fidelity.json` is the concise runtime/lesson disclosure
projection of this inventory; update both atomically, and treat this document as the
current-state authority if they conflict.

## Classification vocabulary

- **Data-derived:** extracted or tracked from an identified atlas/template.
- **Derived:** calculated from data-derived geometry or metadata.
- **Mirrored:** copied across the midsagittal plane rather than independently tracked.
- **Schematic:** manually authored to teach established topology, not measured geometry.
- **Illustrative model:** generated behavior or styling; not measured physiology.
- **Display-only:** camera, clipping, opacity, lighting, or shader behavior that changes
  presentation without changing anatomical coordinates.
- **Unknown:** the repository does not contain enough evidence to make the claim.

## Coordinate contract and unresolved template identity

All runtime geometry is interpreted as RAS millimetres and parented to `mniGroup`.
`sceneFromMni` in `src/main.js` applies the only runtime transform: uniform scale 1,
a proper -90° rotation about the R axis, and a translation by the cortical-shell
bounding-box centre. This preserves handedness and does not fit datasets to markers.

The cortical shell and Jülich manifest identify
`MNI152NLin2009cAsym`. The HCP-1065 source pages identify the tractography atlas as
ICBM 2009a Nonlinear Asymmetric and the fibre template more generally as ICBM152.
The MNI source describes 2009a and 2009c as the same anatomy with different sampling.
The checked-in tract generators or an explicit 2009a→2009c derivation record are not
available, so the stronger claim that every fibre asset was *authored in the 2009c
grid* is **not yet traceable**. The optic-radiation endpoints visibly and numerically
match the selected LGN/V1 shells, but that is validation evidence, not a replacement
for source-space metadata. Parsing `brain_mni.glb` with Three.js found identity
scene/mesh transforms and a geometry bounding box of approximately
`[-72.50,-108.49,-72.50]` to `[72.43,73.50,82.48]` mm; its rounded centre matches
`MNI_CENTER`. All association fibres also remain on their declared hemisphere by
mean x, and SWM contains 7,220 left and 7,780 right fibres under the same rule.

## Anatomical layer matrix

| Layer | Geometry and source | Bilateral derivation | Runtime representation and teaching claim | Assumptions, uncertainty, and limitations | Evidence |
|---|---|---|---|---|---|
| Cortical surface | **Data-derived/derived.** Marching-cubes shell of the 1 mm MNI152NLin2009cAsym brain mask from TemplateFlow; converted to glTF and decimated. | One bilateral shell; no runtime mirroring. | Translucent tissue context, not a cortical parcellation or subject anatomy. | Generator, exact mask filename/version, marching-cubes settings, conversion, and decimation settings are not checked in. Surface is a population template. | `public/models/brain_mni.glb`; `src/main.js` `loadBrain`; `README.md`; `DATA_LICENSES.md` |
| Jülich region shells, including LGN and V1 | **Data-derived/derived.** Forty-five selected region pairs from Jülich-Brain v3.0.3 maximum-probability map (winner-take-all), meshed and simplified. | Real L/R labels and meshes; all 45 manifest entries contain both hemispheres. Jülich right-label = left-label + 1000 is an offline extraction rule. | Shell boundaries locate atlas regions; fresnel styling emphasizes silhouettes. | Maximum-probability surfaces suppress the underlying probabilistic uncertainty and are population-atlas boundaries, not individual functional borders. Extraction/meshing scripts and label audit are not checked in. Parent/stream grouping and colors are viewer metadata. | `public/data/regions.json`; `public/data/regions/*.obj`; `src/main.js` `loadRegions`; Jülich source in `DATA_LICENSES.md` |
| Anterior retina/eye → chiasm → LGN segment | **Schematic.** Hand-authored MNI-like landmark/control points and Catmull-Rom tubes. Eyes and chiasm are illustrative positions; LGN labels use atlas-centroid-like coordinates. | Two manually authored crossing paths, one from each eye's nasal retina to contralateral LGN. | Teaches nasal-fibre decussation and provides directed display flow. | Curvature, thickness, positions, speed, and dot spacing are illustrative. The current geometry omits uncrossed temporal-retinal paths, so it is not a complete depiction of both hemifield projections. | `src/pathways.js`; `src/main.js` `ANT_PATHS` setup and `updateAnteriorFlow`; `index.html` legend |
| Optic radiation | **Data-derived/derived.** 220 left streamlines tracked with DSI Studio on the HCP-1065 population template between Jülich hOc1/V1 and CGL/LGN, pruned, resampled to 64 source points, then smoothed to 129 display points. | **Mirrored exception:** the runtime reflects left x-coordinates to construct the right side. | Static amber density plus directed LGN→V1 code-like tracers. Streamlines are population tractography, not measured axons. | `or_fibres.json` has source text but no explicit `space` field. Generator/command and pruning script are absent. All 220 checked-in fibres have the higher-MNI-y endpoint nearest LGN and the other nearest V1; the runtime orientation heuristic matches that dataset, but right anatomy remains synthetic. | `public/data/or_fibres.json`; `src/main.js` `loadFibres`; `DATA_LICENSES.md` |
| Named long association tracts | **Data-derived/derived.** Eight HCP-1065 population-averaged atlas bundles: ILF, IFOF, SLF I–III, VOF, arcuate, and MdLF. Each hemisphere contains 180 sampled fibres with 40 points. | Real bilateral atlas streamlines; no runtime mirroring. | Static coloured bundle density plus seeded inhibited code-like impulses in both modeled population directions. | Tractography contour order is not axonal polarity. Every event samples an explicit evidence-absent 50/50 A→B/B→A assumption; endpoint A/B uses an endpoint-only geometric heuristic, not measured terminations. Source selection/range extraction and resampling generator are absent. `tracts.json` claims 2009c while the upstream atlas page describes ICBM 2009a; derivation is unknown. Region names containing tract arrows remain hypotheses pending `brain-atlas-zmq.10`. | `public/data/tracts.json`; `public/data/tract_activity.json`; `src/activity/association-impulses.js`; `src/main.js` `loadTracts`/`updateTractImpulses`; `.pi/plans/brain-atlas-yum.2-association-impulse-model.md` |
| Superficial white matter / short U-fibres | **Data-derived/derived.** 15,000 short fibres re-tracked from the HCP-1065 FIB with endpoints in the cortical ribbon, sampled to eight points; own and local-mean length arrays are supplied. | Real bilateral tracking; assigned L/R by the sign of mean MNI x; no mirroring. | Static tangent grain plus analytically zero-mean along-contour vibration. This remains the approved U-fibre representation. | `space` is only `ICBM152/MNI152`, not an exact template identifier. Generator, cortical-ribbon definition, tracking command, sampling method, and local-neighbourhood calculation for `lloc` are absent. Vibration is illustrative and does not claim firing rate or individual-axon bidirectionality. | `public/data/swm_fibres.json`; `src/activity/swm-vibration.js`; `src/main.js` `loadSwm`/`updateSwm`; decision `brain-atlas-cs0` |

## Activity and display model matrix

| Model | Classification | Implemented behavior and parameters | Supported claim | Unsupported or illustrative aspects |
|---|---|---|---|---|
| Anterior flow | Schematic + illustrative model | 26 evenly spaced dots per authored curve; contour phase advances at `0.075 × activity-speed ratio` per wall second. | Signal proceeds retina/eye → chiasm → LGN in the represented crossing pathways. | Dot count, speed, spacing, colour, tube radii, and temporal regularity are display choices, not physiology. |
| LGN→V1 event generation | Illustrative stochastic model on data-derived contours | Inhomogeneous Poisson candidates by superposition/thinning; per-fibre tonic base sampled 6–16 Hz; maximum `4 × base`; private modulation amplitude 0.15–0.55 at 0.2–2.0 Hz; shared 2.3 Hz/20% and 7.1 Hz/10% components; 2 ms absolute refractory interval; 8 ms exponential recovery; a 4% post-silence burst chance with 1–3 extra events at 2.5–4 ms intervals; biological time dilation `0.04 biological s / wall s`; tracer speed 0.28–0.44 contour units/s; pool cap 600. | Conveys stochastic impulses, per-fibre variability, shared drive, refractory gaps, and occasional bursts. | No source currently calibrates the chosen rates, rhythms, burst law, dilation, or travel speed to LGN/V1 physiology. “Physiologically patterned” means structural resemblance, not measured spike statistics. `Ogata` is named in code but not cited in public model documentation. |
| Association activity | **Implemented illustrative stochastic model on data-derived contours.** | Twelve equal virtual channels per tract/hemisphere; seeded Mulberry32 sequence; independently modulated rates 0.24–0.64 events/model s; 0.05-model-s absolute refractory interval and 0.20-model-s recovery; no common drive or forced bursts; event speed 0.30–0.48 contour units/model s; 520 active cap. Direction is sampled per accepted event from bilateral `p=0.5`; the model clock, pool, visibility, and cap semantics are deterministic and tested. | Conveys sparse inhibited code-like population events in both explicitly modeled directions across every named long tract. | Channel counts, rates, modulation, per-channel refractory self-inhibition/recovery timing, speed, and 50/50 direction are display assumptions—not recorded spikes, physiology, conduction speed, or measured axon proportions. Endpoint classifiers are geometric orientation heuristics, and a displayed contour is not an axon. |
| SWM/U-fibre vibration | Illustrative model driven partly by derived structure | One dot per fibre; amplitude `a = clamp(0.5 × local_mean_length / own_length, 0.08, 0.45)`; home sampled from the safe interval `[0.03 + a, 0.97 − a]`; frequency 0.35–1.05 cycles/model s; random phase; direct sinusoidal contour parameter with no endpoint clipping. Reduced motion places every dot at home. | Communicates local short-fibre orientation and length variation with a bounded waveform whose complete-cycle mean is exactly its fixed home. Independent phases prevent coherent travel. | Frequency, phase, scale factor, margins, and bounds are display choices. The length ratio is derived structure, not neural activity, firing rate, or conduction. |
| Region fresnel material | Display-only | Interior alpha floor `0.14 × opacity`; rim term `1.9 × (1−|N·V|)^2.2`; manifest opacity 0.07–0.24; double-sided and no depth writes. | Overlapping shells remain readable as outlines. | Opacity, hue, and rim strength encode grouping/readability, not cytoarchitectonic probability, confidence, activation, or effect size. |
| Cortical material and lighting | Display-only | Blue-grey MeshStandard material; default opacity controlled by UI (initial 16); roughness 0.6, metalness 0.02; ambient plus two directional lights. | Provides translucent anatomical context. | Brightness and translucency have no tissue-property interpretation. |
| Cutaway/clipping | Display-only | One scene-frame x plane; slider maps 0–100 to plane constant +80 to −80. | Reveals internal layers by slicing the near hemisphere. | It is a render clip, not anatomical sectioning, resection, or a change to source geometry. |
| Camera and views | Display-only | Perspective FOV 45°; distance 30–900 mm; orbit/pan/zoom; fixed Side/Top/Back/Front positions and a three-quarter home; optional auto-rotation. | Stable spatial inspection. | Perspective, framing, “front/back,” and home view are interface conventions, not acquisition orientations. |
| Labels and stream groupings | Mixed: source labels + viewer interpretation | Jülich area names/parents, tract names, schematic landmark labels, and viewer-authored ventral/dorsal/target groups. | Supports navigation and visual-system teaching. | Group membership, arrows in region labels, and colour families can imply functional/tract relationships beyond the underlying mesh labels; pending mappings must be disclosed as hypotheses until reviewed. |

## Direction and impulse policy

1. Optic-radiation and anterior-pathway events remain directed because the represented
   biological pathway establishes LGN→V1 and retina→LGN direction independently of
   contour array order.
2. Every named long association tract uses code-like impulses. Direction is a
   modeled source→endpoint population probability, not a tractography measurement.
3. The evidence review found no defensible quantitative human ratio for any displayed
   bundle, so v1 labels and uses a symmetric 50/50 assumption for each hemisphere.
4. Direction is sampled per accepted event from a fixed recorded seed. Endpoint-only
   geometric heuristics orient A/B independently of contour array order; this models
   mixed projection populations without assigning a permanent polarity to a contour.
5. SWM/U-fibres retain zero-mean vibration; population reciprocity must not be
   described as literal bidirectional conduction by one axon.

## Source records verified for this audit

The following records were fetched successfully on 2026-07-21 before being relied on.
Compact verification registries live under `.pi/research/`; raw third-party page
content is not redistributed in this repository.

| Source record | Supports |
|---|---|
| [TemplateFlow method](https://doi.org/10.1038/s41592-022-01681-2) and [MNI152NLin2009cAsym archive](https://github.com/templateflow/tpl-MNI152NLin2009cAsym) | Template distribution and metadata |
| [Jülich-Brain paper](https://doi.org/10.1126/science.abb4588) and [v3.0.3 EBRAINS record](https://search.kg.ebrains.eu/instances/d69b70e2-3002-4eaf-9c61-9c56f019bbc8) | Cytoarchitectonic probability maps and dataset identity |
| [HCP-1065 tract atlas](https://brain.labsolver.org/hcp_trk_atlas.html) and [Yeh 2022](https://doi.org/10.1038/s41467-022-32595-4) | Population atlas, ICBM 2009a space, atlas license, and method |
| [Tractography polarity limits](https://doi.org/10.1089/brain.2011.0033), [human DiI review](https://doi.org/10.3390/biom14050536), and tract-specific sources in `tract_activity.json` | Why streamline order cannot provide direction, why 50/50 remains an explicit fallback, and the endpoint-anatomy evidence reviewed for each bundle |
| [Ogata 1981](https://doi.org/10.1109/TIT.1981.1056305) | Superposition/thinning event-generation method; not validation of illustrative parameter values |
| [HCP-1065 fibre template](https://brain.labsolver.org/hcp_template.html) and [DSI Studio method](https://doi.org/10.1038/s41592-025-02762-8) | Population FIB source and tractography tool |
| [WU-Minn HCP terms](https://www.humanconnectome.org/study/hcp-young-adult/document/wu-minn-hcp-consortium-open-access-data-use-terms) and [citation guidance](https://www.humanconnectome.org/study/hcp-young-adult/document/hcp-citations) | Redistribution, acknowledgment, and citation obligations |
| [MNI ICBM152 nonlinear 2009 releases](http://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009) | 2009a/2009c are separate releases of the same anatomy with different sampling |

A successful record fetch verifies identity and accessible terms/method text; it does
not retroactively prove undocumented local processing steps.

## Open gaps and owners

| Gap | Impact | Owner |
|---|---|---|
| Exact 2009a/2009c identity and any conversion for all tractography assets is undocumented. | Threatens the strongest one-space/co-registration claim. | `brain-atlas-yum.5`. |
| Offline generation commands/scripts and complete parameter manifests are not checked in. | Assets cannot be independently regenerated or audited. | `brain-atlas-yum.6`. |
| Right optic radiation is mirrored. | Bilateral asymmetry and right Meyer's-loop geometry are not observed data. | `brain-atlas-yum.7`. |
| LGN→V1 stochastic parameters remain uncited and partly arbitrary. | Optic-radiation animation may look more physiologically specific than evidence supports; association parameters are now explicitly disclosed as display assumptions. | `brain-atlas-zmq.9` model/source and acceptance disclosure. |
| Uncrossed temporal-retinal pathways are absent from the anterior schematic. | The current crossing lesson is incomplete if presented as the full hemifield projection. | `brain-atlas-zmq.5` vertical-slice content/scene acceptance. |
| Region names imply tract endpoints without reviewed mapping. | Could overstate connectivity. | `brain-atlas-zmq.10`. |
| Atlas uncertainty and model limitations need unobtrusive UI disclosure. | Users cannot inspect confidence/provenance in context. | `brain-atlas-yum.3`. |
