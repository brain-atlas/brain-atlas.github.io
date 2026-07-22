# Scientific traceability inventory

Status: current-state inventory initiated by `brain-atlas-yum.1` and updated after
the fibre-space audit `brain-atlas-yum.5` (2026-07-22). This document separates
anatomical geometry from the viewer's activity and display models.
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

## Coordinate contract and verified mixed-template lineage

All runtime geometry is interpreted as RAS millimetres and parented to `mniGroup`.
`sceneFromMni` in `src/main.js` applies the only runtime transform: uniform scale 1,
a proper -90° rotation about the R axis, and a translation by the cortical-shell
bounding-box centre. This preserves handedness and does not fit datasets to markers.

The cortical shell and Jülich manifest are MNI152NLin2009cAsym. Association tracts
are verified ICBM 2009a Nonlinear Asymmetric. OR/SWM use the exact HCP-1065 FIB
whose direct source record identifies nonlinear ICBM152 2009a; a release-companion
T1 indicates the asymmetric variant, but no retained FIB build record binds that
variant directly. Nibabel decodes TrackVis voxel-mm vertices through voxel size,
half-voxel offset, orientation, and voxel-to-RAS metadata into RAS+ world
millimetres. Resampling and rounding retain that frame but not every original sample
point. No offline 2009a→2009c template warp occurred, and the fibres must not be
described as authored on the 2009c voxel grid. The MNI source describes 2009a and
2009c as the same anatomy with different sampling. Official NIfTI affines,
identity-world comparison, source/output correspondence, ROI distances, ribbon
filtering, and hemisphere checks support the overlay without another transform.
Full hashes, effective affine semantics, recovered commands, numeric methods, and
residual unknowns are in
[`TRACT_SPACE_PROVENANCE.md`](TRACT_SPACE_PROVENANCE.md).

Parsing `brain_mni.glb` with Three.js found identity scene/mesh transforms and a
geometry bounding box of approximately `[-72.50,-108.49,-72.50]` to
`[72.43,73.50,82.48]` mm; its rounded centre matches `MNI_CENTER`. All 1,440 left
and 1,440 right association fibres remain on their declared hemisphere by mean x;
SWM contains 7,220 left and 7,780 right fibres under the same rule.

## Anatomical layer matrix

| Layer | Geometry and source | Bilateral derivation | Runtime representation and teaching claim | Assumptions, uncertainty, and limitations | Evidence |
|---|---|---|---|---|---|
| Cortical surface | **Data-derived/derived.** Marching-cubes shell of the 1 mm MNI152NLin2009cAsym brain mask from TemplateFlow; converted to glTF and decimated. | One bilateral shell; no runtime mirroring. | Translucent tissue context, not a cortical parcellation or subject anatomy. | Generator, exact mask filename/version, marching-cubes settings, conversion, and decimation settings are not checked in. Surface is a population template. | `public/models/brain_mni.glb`; `src/main.js` `loadBrain`; `README.md`; `DATA_LICENSES.md` |
| Jülich region shells, including LGN and V1 | **Data-derived/derived.** Forty-five selected region pairs from Jülich-Brain v3.0.3 maximum-probability map (winner-take-all), meshed and simplified. | Real L/R labels and meshes; all 45 manifest entries contain both hemispheres. Jülich right-label = left-label + 1000 is an offline extraction rule. | Shell boundaries locate atlas regions; fresnel styling emphasizes silhouettes. | Maximum-probability surfaces suppress the underlying probabilistic uncertainty and are population-atlas boundaries, not individual functional borders. Extraction/meshing scripts and label audit are not checked in. Parent/stream grouping and colors are viewer metadata. | `public/data/regions.json`; `public/data/regions/*.obj`; `src/main.js` `loadRegions`; Jülich source in `DATA_LICENSES.md` |
| Anterior retina/eye → chiasm → LGN segment | **Schematic.** Hand-authored MNI-like landmark/control points and Catmull-Rom tubes. Eyes and chiasm are illustrative positions; LGN labels use atlas-centroid-like coordinates. | Two manually authored crossing paths, one from each eye's nasal retina to contralateral LGN. | Teaches nasal-fibre decussation and provides directed display flow. | Curvature, thickness, positions, speed, and dot spacing are illustrative. The current geometry omits uncrossed temporal-retinal paths, so it is not a complete depiction of both hemifield projections. The checked-in early-vision lesson discloses this omission wherever the crossing is taught. | `src/pathways.js`; `src/main.js` `ANT_PATHS` setup and `updateAnteriorFlow`; `src/lessons/retina-to-v1.md`; `public/data/fidelity.json` |
| Optic radiation | **Data-derived/derived.** 220 left streamlines tracked with DSI Studio on the exact HCP-1065 1 mm nonlinear ICBM152-2009a FIB using thresholded 2009c Jülich hOc1/V1 and CGL/LGN masks with identical qform/sform code 4 matrices; resampled to 64 source points, then smoothed to 129 display points. | **Mirrored exception:** the runtime reflects left x-coordinates to construct the right side. | Static amber density plus directed LGN→V1 code-like tracers. Streamlines are population tractography, not measured axons. | The release-companion T1 indicates the FIB's asymmetric variant, but no retained FIB build record binds it directly. Exact FIB and ROI hashes, the final command, 223-fibre intermediate, 220-fibre post-processing, and RAS-mm output correspondence are recovered; the DSI run itself was not replayed. All 220 fibres have the higher-y endpoint nearest LGN; maximum voxel-center distance is 0.991 mm to the binary LGN mask and 1.357 mm to V1. Three streamlines were removed by the project's >18 mm V1-centroid rule. Complete checked-in pipeline/tool manifests remain pending `brain-atlas-yum.6`, and right anatomy remains synthetic. | `public/data/or_fibres.json`; `src/main.js` `loadFibres`; `DATA_LICENSES.md`; `docs/TRACT_SPACE_PROVENANCE.md` |
| Named long association tracts | **Data-derived/derived.** Eight HCP-1065 population-averaged ICBM-2009a atlas bundles: ILF, IFOF, SLF I–III, VOF, arcuate, and MdLF. Each hemisphere contains 180 sampled fibres with 40 RAS-mm points. | Real bilateral atlas streamlines; no runtime mirroring. | Static coloured bundle density plus seeded inhibited code-like impulses in both modeled population directions. | The recovered generator reproduces the original geometry byte-for-byte from the stable release and proves the former 2009c label was unsupported metadata. Tractography contour order is not axonal polarity. Every event samples an explicit evidence-absent 50/50 A→B/B→A assumption; endpoint A/B uses an endpoint-only geometric heuristic, not measured terminations. Region names containing tract arrows remain hypotheses pending `brain-atlas-zmq.10`; checked-in complete generators remain pending `brain-atlas-yum.6`. | `public/data/tracts.json`; `public/data/tract_activity.json`; `src/activity/association-impulses.js`; `src/main.js` `loadTracts`/`updateTractImpulses`; `docs/TRACT_SPACE_PROVENANCE.md`; `.pi/plans/brain-atlas-yum.2-association-impulse-model.md` |
| Superficial white matter / short U-fibres | **Data-derived/derived.** 15,000 short fibres re-tracked from the exact HCP-1065 1 mm nonlinear ICBM152-2009a FIB using a 2009c seed derived from exact TemplateFlow GM/WM maps with identical qform/sform code 4 matrices; unrounded endpoints were filtered through a dilated cortical ribbon and contours were sampled to eight RAS-mm points. | Real bilateral tracking; assigned L/R by the sign of mean MNI x; no mirroring. | Static tangent grain plus analytically zero-mean along-contour vibration. This remains the approved U-fibre representation. | The release-companion T1 indicates the FIB's asymmetric variant without a retained direct build binding. The 200,000-fibre command, source/intermediate hashes, shell and ribbon rules, deterministic sample, resampling, original arc-length `len`, and 7 mm-neighbour mean `lloc` calculation are recovered; post-processing reproduces the file byte-for-byte, but the DSI run itself was not replayed. Complete checked-in generators/tool manifests remain pending `brain-atlas-yum.6`. Vibration is illustrative and does not claim firing rate, histological U-fibre identity, named-region endpoints, or individual-axon bidirectionality. | `public/data/swm_fibres.json`; `src/activity/swm-vibration.js`; `src/main.js` `loadSwm`/`updateSwm`; `docs/TRACT_SPACE_PROVENANCE.md`; decision `brain-atlas-cs0` |

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
| Labels and stream groupings | Mixed: source labels + viewer interpretation | Jülich area names/parents, tract names, schematic landmark labels, and viewer-authored ventral/dorsal/target groups. | Supports navigation and visual-system teaching. | Group membership, arrows in region labels, and colour families can imply functional/tract relationships beyond the underlying mesh labels; pending mappings must be disclosed as hypotheses until reviewed. Fixed-anchor CSS2D labels can collide or cover active anatomy as the camera changes, so decision `brain-atlas-jes` hides them in the reference lesson until responsive placement `brain-atlas-zmq.20` lands; the free-viewer toggle remains. |

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

The following records were fetched successfully on 2026-07-21 and fibre-space
records were reverified or downloaded on 2026-07-22 before being relied on. Compact
verification registries live under `.pi/research/`; raw third-party page content is
not redistributed in this repository.

| Source record | Supports |
|---|---|
| [TemplateFlow method](https://doi.org/10.1038/s41592-022-01681-2) and [MNI152NLin2009cAsym archive](https://github.com/templateflow/tpl-MNI152NLin2009cAsym) | Template distribution and metadata |
| [Jülich-Brain paper](https://doi.org/10.1126/science.abb4588) and [v3.0.3 EBRAINS record](https://search.kg.ebrains.eu/instances/d69b70e2-3002-4eaf-9c61-9c56f019bbc8) | Cytoarchitectonic probability maps and dataset identity |
| [HCP-1065 tract atlas](https://brain.labsolver.org/hcp_trk_atlas.html), [exact population-averaged TrackVis release](https://github.com/data-others/atlas/releases/download/hcp1065/hcp1065_avg_tracts_trk.zip), and [Yeh 2022](https://doi.org/10.1038/s41467-022-32595-4) | Population atlas, exact association source archive, ICBM 2009a space, atlas license, and method |
| [Tractography polarity limits](https://doi.org/10.1089/brain.2011.0033), [human DiI review](https://doi.org/10.3390/biom14050536), and tract-specific sources in `tract_activity.json` | Why streamline order cannot provide direction, why 50/50 remains an explicit fallback, and the endpoint-anatomy evidence reviewed for each bundle |
| [Ogata 1981](https://doi.org/10.1109/TIT.1981.1056305) | Superposition/thinning event-generation method; not validation of illustrative parameter values |
| [HCP-1065 fibre template](https://brain.labsolver.org/hcp_template.html), [exact 1 mm FIB release](https://github.com/data-others/atlas/releases/download/hcp1065/ICBM152_adult.1mm.fz), and [DSI Studio method](https://doi.org/10.1038/s41592-025-02762-8) | Population FIB source, verified release artifact, ICBM 2009a registration, and tractography tool |
| [WU-Minn HCP terms](https://www.humanconnectome.org/study/hcp-young-adult/document/wu-minn-hcp-consortium-open-access-data-use-terms) and [citation guidance](https://www.humanconnectome.org/study/hcp-young-adult/document/hcp-citations) | Redistribution, acknowledgment, and citation obligations |
| [MNI ICBM152 nonlinear 2009 releases](http://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009) and exact asymmetric 2009a/2009c NIfTI archives recorded in `TRACT_SPACE_PROVENANCE.md` | 2009a/2009c are separate releases of the same anatomy with different sampling; official RAS+ grids support identity-world validation |

A successful record fetch verifies identity and accessible terms/method text; it does
not retroactively prove undocumented local processing steps.

## Topic-science evidence for the reference lesson

The checked-in `src/lessons/retina-to-v1.md` uses the sources below for its teaching
claims. These records support the scientific explanation; they do not upgrade the
fidelity of any displayed geometry or activity model.

| Lesson claim area | Evidence and scope |
|---|---|
| Retinal computation, center-surround organization, and parallel output | [Kuffler 1953](https://doi.org/10.1152/jn.1953.16.1.37) established concentric receptive-field organization in cat retinal ganglion cells. [Masland 2012](https://doi.org/10.1016/j.neuron.2012.10.002) reviews retinal cell-type diversity and parallel transformations; [Dacey 2000](https://doi.org/10.1146/annurev.neuro.23.1.743) reviews primate spectral pathways. Species and review scope must not be collapsed into a claim that every described circuit was measured in humans. |
| Partial decussation and hemifield organization | [Mason & Erskine 2001](https://doi.org/10.1152/physrev.2001.81.4.1393) reviews optic-chiasm architecture and development. It supports the nasal-crossing/temporal-uncrossed organization taught in prose, not the schematic curve coordinates. |
| LGN organization and regulated relay | [Sherman & Koch 1986](https://doi.org/10.1007/BF00235642) reviews state-dependent control of retinogeniculate transmission. The lesson describes relay regulation without assigning the viewer's illustrative event parameters to LGN physiology. |
| Optic-radiation organization and clinical localization | [Maciag et al. 2024](https://doi.org/10.1148/rg.230081) reviews visual-pathway anatomy and radiologic/clinical correlations. Individual fibre course and lesion expression vary; the current tract display does not resolve Meyer's loop or functional lanes. |
| V1 receptive fields, binocular interaction, and functional architecture | [Hubel & Wiesel 1962](https://doi.org/10.1113/jphysiol.1962.sp006837) reports classic cat V1 physiology. The lesson presents it as foundational animal work rather than direct human single-cell evidence. |
| Human V1 retinotopy and cortical magnification | [Benson et al. 2012](https://doi.org/10.1016/j.cub.2012.09.014) links human retinotopic organization to cortical surface topology and documents individual variation. The displayed V1 shells do not visualize an individual's functional retinotopic map. |
| Distributed extrastriate processing and recurrent hierarchy | [Felleman & Van Essen 1991](https://doi.org/10.1093/cercor/1.1.1-a) synthesizes anatomical connections in macaque cortex as a distributed hierarchy with extensive reciprocal and bypass routes. It supports rejecting a simple serial assembly line; the displayed human atlas shells still do not demonstrate those connections. |
| Draft white-matter context in cortical-stream scenes | Selected VOF, ILF/IFOF, and SLF bundle displays use the HCP-1065 geometry and generic fidelity records listed above; their presence is provisional editorial context, not evidence that highlighted Jülich shells are exact streamline endpoints or that impulses encode the lesson's functions. Long-tract events retain the disclosed evidence-absent 50/50 direction assumption. The broad all-fibre SWM layer is explicitly not endpoint-filtered and uses zero-mean illustrative vibration. `brain-atlas-zmq.10` and `.21` own defensible endpoint mapping and scene-specific pruning before publication. |
| Ventral-stream object-quality and categorization framework | [Kravitz et al. 2013](https://doi.org/10.1016/j.tics.2012.10.011) reviews the ventral pathway as a recurrent occipitotemporal network for object quality with multiple outputs. [Grill-Spector & Weiner 2014](https://doi.org/10.1038/nrn3747) reviews the spatially organized functional architecture of human ventral temporal cortex. Neither source licenses one-region/one-category assignments to the displayed Jülich shells. |
| Dorsal-stream motion, spatial, and visuomotor framework | [Born & Bradley 2005](https://doi.org/10.1146/annurev.neuro.26.041002.131052) reviews motion and disparity processing in primate MT. [Kravitz et al. 2011](https://doi.org/10.1038/nrn3008) reviews the dorsal stream as multiple visuospatial pathways rather than one “where” chain. The current scene groups territories but does not display route connectivity or functional responses. |
| Perception/action distinction and stream interaction | [Goodale & Milner 1992](https://doi.org/10.1016/0166-2236(92)90344-8) proposed a ventral perception/dorsal action distinction from neuropsychological, behavioral, and physiological evidence. The lesson treats this as a useful functional bias within interacting networks, not an absolute behavioral or anatomical dissociation. |

## Runtime anatomy-inspector projection

`public/data/entities.json` now carries a strict six-record `inspectables` projection.
These records do not replace this inventory or `public/data/fidelity.json`: anatomy copy
and topic citations come from the verified lesson evidence below, while displayed
geometry/activity status, processing, limitations, dataset sources, licenses, and review
dates are composed at runtime from each record's canonical owner fidelity. Selection-only
landmarks inherit `fidelity.anterior-pathway` through `pathway.anterior` and do not become
canonical lesson visibility entities.

| Inspectable IDs | Concise explanation evidence | Displayed-representation authority |
|---|---|---|
| `region.lgn` | Sherman & Koch 1986 supports regulated retinogeniculate transmission and the non-passive relay description. | Jülich-Brain region shell plus `fidelity.julich-regions`. |
| `region.v1` | Hubel & Wiesel 1962 supports classic receptive-field/functional-architecture claims; Benson et al. 2012 supports human V1 retinotopy and individual variation. | Jülich-Brain region shell plus `fidelity.julich-regions`; never an individual functional map. |
| `pathway.optic-radiation` | Maciag et al. 2024 supports the LGN→V1 visual-pathway anatomy and clinical localization scope. | HCP-1065/DSI-derived left contours, mirrored right side, and illustrative directed events under `fidelity.optic-radiation`. |
| `landmark.eye-left`, `landmark.eye-right`, `landmark.optic-chiasm` | Mason & Erskine 2001 supports nasal-crossing/temporal-uncrossed optic-chiasm organization, not marker coordinates. | Hand-authored marker/curve geometry and incomplete crossing-only display under `fidelity.anterior-pathway`. |

The only seeded relationships are the established or explicitly schematic early visual
pathway among these records. No named association-tract endpoint or region relationship
is added; `brain-atlas-zmq.10` remains the owner of that research and mapping.

## Open gaps and owners

| Gap | Impact | Owner |
|---|---|---|
| Offline generation commands/scripts and complete parameter manifests are not checked in. | Assets cannot be independently regenerated or audited. | `brain-atlas-yum.6`. |
| Right optic radiation is mirrored. | Bilateral asymmetry and right Meyer's-loop geometry are not observed data. | `brain-atlas-yum.7`. |
| LGN→V1 stochastic parameters remain uncited and partly arbitrary. | Optic-radiation animation may look more physiologically specific than evidence supports; association parameters are now explicitly disclosed as display assumptions. | `brain-atlas-zmq.9` model/source and acceptance disclosure. |
| Uncrossed temporal-retinal pathways are absent from the anterior schematic. | The geometry remains incomplete as a full hemifield projection; the implemented reference lesson explicitly limits its claim to the drawn nasal crossing and states that uncrossed temporal-retinal paths are omitted. | Disclosure completed by `brain-atlas-zmq.5`; replacement geometry is not currently approved. |
| Directed activity speed is normalized by contour parameter rather than physical distance. | Shorter contours can appear slower in millimetres per display second even though tract length should primarily change latency, not automatically reduce velocity; no universal biological conduction speed is claimed. | `brain-atlas-yum.10`. |
| Region names imply tract endpoints without reviewed mapping. | Could overstate connectivity. | `brain-atlas-zmq.10`. |
| Draft cortical-stream scenes show the complete broad SWM layer rather than endpoint-classified subsets. | The 15,000-fibre texture can dominate highlighted anatomy and must not be read as connections among the displayed regions. It may remain in the local Draft prototype, but cannot ship without reproducible endpoint classification, unknown/ambiguous handling, coherent geometry/activity filtering, and tuned scene presets. | `brain-atlas-zmq.21`, now a direct dependency of publication gate `brain-atlas-zmq.26`. |
| Atlas uncertainty and model limitations need unobtrusive UI disclosure. | Users cannot inspect confidence/provenance in context. | `brain-atlas-yum.3`. |
