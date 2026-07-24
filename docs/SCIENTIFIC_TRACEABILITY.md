# Scientific traceability inventory

Status: current-state core-model inventory initiated by `brain-atlas-yum.1` and
updated after the fibre-space audit `brain-atlas-yum.5` and physical-distance
activity correction `brain-atlas-yum.10` (2026-07-22). This document
separates anatomical geometry from the viewer's activity and display models.
Lesson-specific teaching claims, citations, and curriculum review live under
[`docs/lessons/`](lessons/); the current reference record is
[`retina-to-v1-validation.md`](lessons/retina-to-v1-validation.md).
`DATA_LICENSES.md` remains the authority for redistribution terms and full source
citations. `public/data/fidelity.json` is the concise runtime/lesson disclosure
projection of this core inventory; update both atomically, and treat this document as
the core representation authority if they conflict.

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
| Cortical surface | **Data-derived/derived.** Marching-cubes shell of the 1 mm MNI152NLin2009cAsym brain mask from TemplateFlow; converted to glTF and decimated. | One bilateral shell; no runtime mirroring. | Translucent tissue context, not a cortical parcellation or subject anatomy. | The checked `tools/assets` builder binds the exact mask, Gaussian sigma 1.2, level-0.5 marching cubes, 80,000-face simplification, normal repair, pinned environment, and GLB writer and reproduces the current file byte-for-byte. The shell remains a population template, not subject anatomy. | `public/models/brain_mni.glb`; `tools/assets/cortex.py`; `tools/assets/manifest.json`; `src/main.js` `loadBrain`; `DATA_LICENSES.md` |
| Jülich region shells, including LGN and V1 | **Data-derived/derived.** Forty-five selected region pairs from Jülich-Brain v3.0.3 maximum-probability map (winner-take-all), meshed and simplified. | Real L/R labels and meshes; all 45 manifest entries contain both hemispheres. Jülich right-label = left-label + 1000 is an offline extraction rule. | Shell boundaries locate atlas regions; fresnel styling emphasizes silhouettes. | The checked manifest separates the teaching catalog and visual metadata from extraction. The pinned builder consumes the exact direct MPM and reproduces `regions.json` plus all 90 OBJ meshes byte-for-byte. Maximum-probability surfaces still suppress probabilistic uncertainty; parent/stream grouping and colors remain viewer metadata. | `public/data/regions.json`; `public/data/regions/*.obj`; `tools/assets/regions.py`; `tools/assets/manifest.json`; Jülich source in `DATA_LICENSES.md` |
| Anterior retina/eye → chiasm → LGN segment | **Schematic.** Hand-authored MNI-like landmark/control points and Catmull-Rom tubes. Eyes and chiasm are illustrative positions; LGN labels use atlas-centroid-like coordinates. | Two manually authored crossing paths, one from each eye's nasal retina to contralateral LGN. | Teaches nasal-fibre decussation and provides directed display flow. | Curvature, thickness, positions, speed, and dot spacing are illustrative. The current geometry omits uncrossed temporal-retinal paths, so it is not a complete depiction of both hemifield projections. The checked-in early-vision lesson discloses this omission wherever the crossing is taught. | `src/pathways.js`; `src/main.js` `ANT_PATHS` setup and `updateAnteriorFlow`; `src/lessons/retina-to-v1.md`; `public/data/fidelity.json` |
| Optic radiation | **Data-derived/derived.** 220 left streamlines tracked with DSI Studio on the exact HCP-1065 1 mm nonlinear ICBM152-2009a FIB using thresholded 2009c Jülich hOc1/V1 and CGL/LGN masks with identical qform/sform code 4 matrices; resampled to 64 source points, then smoothed to 129 display points. | **Mirrored exception:** the runtime reflects left x-coordinates to construct the right side. | Static amber density plus directed LGN→V1 code-like tracers. Streamlines are population tractography, not measured axons. | The release-companion T1 indicates the FIB's asymmetric variant, but no retained FIB build record binds it directly. Checked preparation reproduces both masks, and checked post-processing reproduces current JSON byte-for-byte from the recovered 223-fibre TrackVis intermediate. Manual DSI replay remained class 4 (`216→215`); a clean repeat produced `234→233`, so the current `223→220` asset was not recreated and no replay output may replace it. All 220 current fibres have the higher-y endpoint nearest LGN; maximum voxel-center distance is 0.991 mm to LGN and 1.357 mm to V1. Right anatomy remains synthetic. | `public/data/or_fibres.json`; `tools/assets/optic_radiation.py`; `tools/assets/manifest.json`; `src/main.js` `loadFibres`; `DATA_LICENSES.md`; `docs/TRACT_SPACE_PROVENANCE.md` |
| Named long association tracts | **Data-derived/derived.** Eight HCP-1065 population-averaged ICBM-2009a atlas bundles: ILF, IFOF, SLF I–III, VOF, arcuate, and MdLF. Each hemisphere contains 180 sampled fibres with 40 RAS-mm points. | Real bilateral atlas streamlines; no runtime mirroring. | Static coloured bundle density plus seeded inhibited code-like impulses in both modeled population directions. The inspector exposes a conservative subset of undirected, low-confidence endpoint-proximity links. One categorical endpoint query coherently filters lines, endpoint caps, and eligible impulse contours. | The checked pinned generator reproduces current geometry byte-for-byte. Its posterior-first reversal is a storage convention, not axonal polarity. Every event samples an explicit evidence-absent 50/50 A→B/B→A assumption. The separate inspector screen requires at least 18/180 streamlines in each hemisphere at both 3 mm and 5 mm. Runtime filtering chooses the nearest nonzero Jülich MPM label; it is known only when its centre lies within 2 mm and the label has a project region entity. A second label within a 0.5 mm distance margin makes it ambiguous; unsupported winning labels, background, and distant endpoints remain unknown. Both methods ignore endpoint order and establish no termination, connection, strength, probability, function, or direction. | `public/data/tracts.json`; `public/data/tracts_metadata.json`; `src/tract-metadata.js`; `scripts/project-tract-metadata.mjs`; `test/tract-metadata.test.js`; `public/data/fibre_endpoints.json`; `public/data/tract_region_mapping.json`; `tools/map_tract_regions.py`; `tools/assets/association.py`; `tools/assets/endpoints.py`; `tools/assets/manifest.json`; `public/data/tract_activity.json`; `src/fibre-endpoint-filter.js`; `src/activity/association-impulses.js`; `src/main.js` `loadTractMetadata`/`loadTracts`/`updateTractImpulses`; `docs/TRACT_REGION_MAPPING.md`; `docs/TRACT_SPACE_PROVENANCE.md` |
| Superficial white matter / short U-fibres | **Data-derived/derived.** 15,000 short fibres re-tracked from the exact HCP-1065 1 mm nonlinear ICBM152-2009a FIB using a 2009c seed derived from exact TemplateFlow GM/WM maps with identical qform/sform code 4 matrices; unrounded endpoints were filtered through a dilated cortical ribbon and contours were sampled to eight RAS-mm points. | Real bilateral tracking; assigned L/R by the sign of mean MNI x; no mirroring. | Static tangent grain plus analytically zero-mean along-contour vibration. One categorical endpoint query coherently filters grain and vibrating dots. The inspector exposes the layer with no relationship records. | The release-companion T1 indicates the FIB's asymmetric variant without a retained direct build binding. Checked preparation and recovered-intermediate post-processing reproduce the current JSON; manual DSI replay produced the required shape but different geometry and remains class 3. Every stored endpoint has a known, ambiguous, or unknown categorical assignment against the Jülich MPM. This mixed-2009a/2009c common-RAS comparison uses no template warp or voxel-grid equivalence and does not establish firing rate, histological U-fibre identity, biological terminations, region-to-region connections, polarity, or individual-axon bidirectionality. | `public/data/swm_fibres.json`; `public/data/fibre_endpoints.json`; `tools/assets/swm.py`; `tools/assets/endpoints.py`; `tools/assets/manifest.json`; `src/fibre-endpoint-filter.js`; `src/activity/swm-vibration.js`; `src/main.js` `loadSwm`/`updateSwm`; `docs/TRACT_REGION_MAPPING.md`; `docs/TRACT_SPACE_PROVENANCE.md`; decision `brain-atlas-cs0` |

## Activity and display model matrix

| Model | Classification | Implemented behavior and parameters | Supported claim | Unsupported or illustrative aspects |
|---|---|---|---|---|
| Anterior flow | Schematic + illustrative model | 26 dots are evenly spaced by cumulative arc length on each authored curve. Their shared distance offset advances at 40 MNI mm per display second when activity speed is 70 and wraps at each curve's end. | Signal proceeds retina/eye → chiasm → LGN in the represented crossing pathways. | Dot count, common speed, playback scaling, spacing, colour, tube radii, and temporal regularity are display choices, not physiology. |
| LGN→V1 event generation | Illustrative stochastic model on data-derived contours | Inhomogeneous Poisson candidates by superposition/thinning; per-fibre tonic base sampled 6–16 Hz; maximum `4 × base`; private modulation amplitude 0.15–0.55 at 0.2–2.0 Hz; shared 2.3 Hz/20% and 7.1 Hz/10% components; 2 ms absolute refractory interval; 8 ms exponential recovery; a 4% post-silence burst chance with 1–3 extra events at 2.5–4 ms intervals; biological time dilation `0.04 biological s / wall s`; cumulative-distance tracer speed 40 MNI mm per display second at activity speed 70; pool cap 600. | Conveys stochastic impulses, per-fibre variability, shared drive, refractory gaps, occasional bursts, and lower transit latency on shorter contours at equal configured speed. | No source currently calibrates the chosen rates, rhythms, burst law, dilation, common travel speed, or playback scaling to LGN/V1 physiology. “Physiologically patterned” means structural resemblance, not measured spike statistics. `Ogata` is named in code but not cited in public model documentation. |
| Association activity | **Implemented illustrative stochastic model on data-derived contours.** | Twelve equal virtual channels per tract/hemisphere; seeded Mulberry32 sequence; independently modulated rates 0.24–0.64 events/model s; 0.05-model-s absolute refractory interval and 0.20-model-s recovery; no common drive or forced bursts; cumulative-distance event speed 40 MNI mm per display second at activity speed 70; 520 active cap. Each event expires after its selected contour length divided by speed. Direction is sampled per accepted event from bilateral `p=0.5`; the model clock, pool, visibility, and cap semantics are deterministic and tested. | Conveys sparse inhibited code-like population events in both explicitly modeled directions across every named long tract. Equal configured velocity makes tract length change transit latency rather than world-space speed. | Channel counts, rates, modulation, per-channel refractory self-inhibition/recovery timing, the common speed, playback scaling, and 50/50 direction are display assumptions—not recorded spikes, physiology, universal conduction velocity, or measured axon proportions. Endpoint classifiers are geometric orientation heuristics, and a displayed contour is not an axon. |
| SWM/U-fibre vibration | Illustrative model driven partly by derived structure | One dot per filter-eligible fibre; amplitude `a = clamp(0.5 × local_mean_length / own_length, 0.08, 0.45)`; home sampled from the safe interval `[0.03 + a, 0.97 − a]`; frequency 0.35–1.05 cycles/model s; random phase; direct sinusoidal contour parameter with no endpoint clipping. Reduced motion places every eligible dot at home. | Communicates local short-fibre orientation and length variation with a bounded waveform whose complete-cycle mean is exactly its fixed home. Independent phases prevent coherent travel. | Frequency, phase, scale factor, margins, and bounds are display choices. The length ratio is derived structure, not neural activity, firing rate, or conduction. Endpoint eligibility does not change amplitude, frequency, phase, or direction semantics. |
| Fibre endpoint filtering | **Data-derived categorical assignment plus project-authored query.** | Classifies 35,760 stored endpoints across 2,880 association and 15,000 SWM contours against the exact 193×229×193 Jülich-Brain v3.0.3 MPM affine. The nearest nonzero label is known only when its centre lies within 2 mm and the label has a project region entity; a second distinct label within 0.5 mm of the nearest distance is ambiguous; unsupported winning labels, background, and out-of-support points are unknown. `all`, `touches-any`, `connects-within`, and unordered `connects-between` queries combine with global L/R state. | Provides reproducible geometric subsets and accessible selected/population quality counts. Extrastriate, ventral, dorsal, and future integrated presets match 1,684, 1,830, 3,180, and 327 contours before scene visibility. Lines, caps, SWM dots, and eligible association contours use the same masks. | The categorical MPM supplies no probability and suppresses source uncertainty. Fibre coordinates are 2009a and labels are 2009c in common RAS millimetres; no warp or voxel-grid equivalence is claimed. Assignment and filtering do not establish biological termination, connectivity, strength, function, direction, population probability, or individual anatomy. Unknown and ambiguous endpoints match only explicit selectors. |
| Region fresnel material | Display-only | Interior alpha floor `0.14 × opacity`; rim term `1.9 × (1−|N·V|)^2.2`; manifest opacity 0.07–0.24; double-sided and no depth writes. | Overlapping shells remain readable as outlines. | Opacity, hue, and rim strength encode grouping/readability, not cytoarchitectonic probability, confidence, activation, or effect size. |
| Cortical material and lighting | Display-only | Blue-grey MeshStandard material; default opacity controlled by UI (initial 16); roughness 0.6, metalness 0.02; ambient plus two directional lights. | Provides translucent anatomical context. | Brightness and translucency have no tissue-property interpretation. |
| Cutaway/clipping | Display-only | One scene-frame x plane; slider maps 0–100 to plane constant +80 to −80. | Reveals internal layers by slicing the near hemisphere. | It is a render clip, not anatomical sectioning, resection, or a change to source geometry. |
| Camera and views | Display-only | Perspective FOV 45°; distance 30–900 mm; orbit/pan/zoom; fixed Side/Top/Back/Front positions and a three-quarter home; optional auto-rotation. | Stable spatial inspection. | Perspective, framing, “front/back,” and home view are interface conventions, not acquisition orientations. |
| Labels and stream groupings | Mixed: source labels + viewer interpretation | Jülich area names/parents, tract names, schematic landmark labels, and viewer-authored ventral/dorsal/target groups. | Supports navigation and visual-system teaching. | Former tract-arrow suffixes were removed from STS2, OFC, preSMA, DLPFC, and Broca 44 because they implied direction and precise endpoints. Inspector links now separate literature-curated, displayed-dataset, and schematic evidence with explicit method/status/confidence; colour families and lesson grouping still do not establish function. Fixed-anchor CSS2D labels can collide or cover active anatomy as the camera changes, so decision `brain-atlas-jes` hides them in the reference lesson until responsive placement `brain-atlas-zmq.20` lands; the free-viewer toggle remains. |

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
| [Tractography polarity limits](https://doi.org/10.1089/brain.2011.0033), [streamline assignment review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7615246/), [termination-validation review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7554161/), [gyral-bias evidence](https://pmc.ncbi.nlm.nih.gov/articles/PMC6935166/), [human DiI review](https://doi.org/10.3390/biom14050536), and tract-specific sources in `tract_activity.json` | Why streamline order cannot provide direction, why 50/50 remains an explicit fallback, and why endpoint proximity must remain a method-specific low-confidence display observation |
| [Ogata 1981](https://doi.org/10.1109/TIT.1981.1056305) | Superposition/thinning event-generation method; not validation of illustrative parameter values |
| [HCP-1065 fibre template](https://brain.labsolver.org/hcp_template.html), [exact 1 mm FIB release](https://github.com/data-others/atlas/releases/download/hcp1065/ICBM152_adult.1mm.fz), and [DSI Studio method](https://doi.org/10.1038/s41592-025-02762-8) | Population FIB source, verified release artifact, ICBM 2009a registration, and tractography tool |
| [WU-Minn HCP terms](https://www.humanconnectome.org/study/hcp-young-adult/document/wu-minn-hcp-consortium-open-access-data-use-terms) and [citation guidance](https://www.humanconnectome.org/study/hcp-young-adult/document/hcp-citations) | Redistribution, acknowledgment, and citation obligations |
| [MNI ICBM152 nonlinear 2009 releases](http://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009) and exact asymmetric 2009a/2009c NIfTI archives recorded in `TRACT_SPACE_PROVENANCE.md` | 2009a/2009c are separate releases of the same anatomy with different sampling; official RAS+ grids support identity-world validation |

A successful record fetch verifies identity and accessible terms/method text; it does
not retroactively prove undocumented local processing steps.

## Lesson validation records

Lesson teaching claims and curriculum review are intentionally separate from this core
model inventory. See
[`docs/lessons/retina-to-v1-validation.md`](lessons/retina-to-v1-validation.md) for
the checked early-vision lesson's claim evidence, species/method limits, section review,
and representation dependencies. Citations in that record support prose; representation
status continues to come from this inventory and `public/data/fidelity.json`.

## Runtime anatomy-inspector projection

`public/data/entities.json` carries a strict 33-record `inspectables` projection.
These records do not replace this inventory or `public/data/fidelity.json`: anatomy copy,
relationship evidence, and citations come from reviewed catalog records, while displayed
geometry/activity status, processing, limitations, dataset sources, licenses, and review
dates are composed at runtime from each record's canonical owner fidelity. Selection-only
landmarks inherit `fidelity.anterior-pathway` through `pathway.anterior` and do not become
canonical lesson visibility entities.

| Inspectable IDs | Evidence boundary | Displayed-representation authority |
|---|---|---|
| `region.lgn`, `region.v1`, `pathway.optic-radiation` | Literature-curated early visual anatomy; the optic-radiation geometry and mirrored-right limitation remain separate fidelity facts. | Jülich region shells and HCP-1065/DSI-derived optic-radiation contours under their owner fidelity records. |
| `landmark.eye-left`, `landmark.eye-right`, `landmark.optic-chiasm` | Literature-curated crossing anatomy plus explicitly schematic teaching geometry. | `fidelity.anterior-pathway`; marker coordinates are not evidence. |
| All eight `tract.*` records and 19 qualifying `region.*` records | One authored low-confidence, undirected displayed-endpoint-proximity record per robust tract→region pair; catalog construction derives the reciprocal region view. | `public/data/tract_region_mapping.json` and `docs/TRACT_REGION_MAPPING.md`; owner fidelity remains authoritative for geometry/activity. |
| `layer.swm` | No relationship records. Runtime endpoint classes support geometric filtering only and do not create a named-region mapping or connection claim. | `fidelity.superficial-white-matter`; `public/data/fibre_endpoints.json`. |

The inspector visibly distinguishes `literature-curated`, `displayed-dataset`, and
`schematic-teaching` source classes and shows method, status, confidence, direction, and
relationship-specific sources. A qualified endpoint-proximity link is not a functional or
directional teaching claim.

## Open gaps and owners

| Gap | Impact | Owner |
|---|---|---|
| The surviving DSI executable did not recreate the recovered OR/SWM tracking intermediates, and no exact source/build binding identifies the varying internal stage. | Cortex, regions, association, OR/SWM preparation, and OR/SWM recovered-intermediate post-processing are reproducible; full source-to-current OR/SWM retracking is not. Current assets remain frozen and no replay output may replace them. | Legacy boundary accepted only for `brain-atlas-yum.6` closeout by `brain-atlas-3ct`; deterministic retracking belongs to `brain-atlas-yum.13`. |
| Right optic radiation is mirrored. | Bilateral asymmetry and right Meyer's-loop geometry are not observed data. | `brain-atlas-yum.7`. |
| LGN→V1 stochastic parameters remain uncited and partly arbitrary. | Optic-radiation animation may look more physiologically specific than evidence supports; association parameters are now explicitly disclosed as display assumptions. | `brain-atlas-zmq.9` model/source and acceptance disclosure. |
| Uncrossed temporal-retinal pathways are absent from the anterior schematic. | The geometry remains incomplete as a full hemifield projection; the implemented reference lesson explicitly limits its claim to the drawn nasal crossing and states that uncrossed temporal-retinal paths are omitted. | Disclosure completed by `brain-atlas-zmq.5`; replacement geometry is not currently approved. |
| Atlas uncertainty and model limitations need unobtrusive UI disclosure. | Users cannot inspect confidence/provenance in context. | `brain-atlas-yum.3`. |
