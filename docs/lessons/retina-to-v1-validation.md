# Early Vision Lesson Validation

Status: current lesson-specific review record for `src/lessons/retina-to-v1.md`,
maintained under `brain-atlas-zmq.25`, with displayed relationship limits reconciled
under `brain-atlas-zmq.10`, endpoint filtering implemented under
`brain-atlas-zmq.21`, scene-specific filtering revised under `brain-atlas-zmq.31`,
and cumulative-distance directed activity implemented under `brain-atlas-yum.10`
(2026-07-23).

This record owns the lesson's teaching-claim evidence, section-level scientific and
pedagogical review, and curriculum-specific representation limits. It does not own
runtime geometry, transforms, activity models, dataset provenance, or data terms.
Those remain in [`../SCIENTIFIC_TRACEABILITY.md`](../SCIENTIFIC_TRACEABILITY.md),
[`../TRACT_SPACE_PROVENANCE.md`](../TRACT_SPACE_PROVENANCE.md),
[`../TRACT_REGION_MAPPING.md`](../TRACT_REGION_MAPPING.md), and
[`../../DATA_LICENSES.md`](../../DATA_LICENSES.md). A citation here supports the
teaching explanation; it does not upgrade the fidelity of a displayed shell, tract,
or animation.

## Review outcome

The human curriculum review authorized removal of the optional `status: draft`
metadata and approved the title **Early Vision: Retina to the Cortical Streams**.
Under the v1 contract, absence of `status` makes no machine-readable reviewed or
published claim. Final review of the revised prose remains the closeout gate for
`brain-atlas-zmq.25`; publication remains separately gated.

The scientific review found no blocking factual error in the lesson's intended scope.
The lesson remains valid only with its explicit boundaries: incomplete schematic
anterior geometry, mirrored right optic-radiation source geometry, population-atlas
region shells, illustrative cumulative-distance activity, only low-confidence
qualified endpoint proximity for a subset of association-bundle/displayed-shell pairs, and categorical geometric endpoint filters that make no biological connection claim.
The overview, LGN, V1, shared-early, ventral, dorsal, and closing views now use explicit
custom queries or audited presets rather than the all-fibre SWM population. Named-tract
visibility includes every tract group with a nonzero match in Scenes 4–7, subject to each
scene's hemisphere policy.

## Section and scene review

| Section | Review conclusion |
|---|---|
| Title and introduction | The shorter title states the pathway and cortical scope. The introduction frames vision as staged transformation, elicits a lesion prediction, and states five observable objectives. |
| Topic entry | The unnumbered entry adds V2, V3v, and V3d to show the shared early cortical route. It displays the 794 superficial contours whose unordered endpoints touch at least one of V1, V2, V3v, or V3d; the 445 matching association contours remain hidden in this overview. Spatial juxtaposition does not prove connectivity. |
| Retina and chiasm | Retinal parallel encoding and hemifield regrouping are both accurate but exceed one ideal scene-sized teaching job. The revised center-surround explanation states how center and surround drive ganglion-cell activity in opposite directions and why uniform illumination partly cancels. A thematic break marks the candidate future split. Expanding the retinal model or adding a dedicated visual remains future work; the nasal-only geometry omission stays explicit. Flow direction remains biological, but cumulative-distance speed and playback scaling remain illustrative. |
| LGN | Revised prose introduces M, P, and K channels separately, avoids one-channel/one-percept claims, and distinguishes regulated relay from passive transfer. The 3D shell does not resolve layers or channels. The scene adds 22 bilateral superficial contours with at least one unordered endpoint assigned to LGN; it labels them as categorical spatial context, not a measured LGN projection. |
| Optic radiation | The revised prose directly connects distinct temporal/parietal routes to visual-field localization and distinguishes inferior-retinal origin from the temporal-lobe course through Meyer's loop. Topographic organization, individual variability, mirrored-source limitations, and illustrative cumulative-distance timing remain aligned. The scene shows only the independently derived left contours with a centered half-shell cortical cutaway. |
| V1 | Revised prose separates retinotopy, cortical magnification, local feature selectivity, historical animal evidence, and clinical localization. The centered left-only view adds 259 superficial and 138 association contours touching V1; ILF and IFOF are the only nonzero matching named groups. The view supplies anatomy and geometric endpoint context, not layers, columns, cell responses, a functional retinotopy map, termination, or tract polarity. |
| Extrastriate cortex | The prose rejects a serial chain and describes graded recurrent processing. The scene uses the shared-early custom query over V1, V2, V3v, and V3d, retaining 794 superficial and 445 association contours bilaterally. ILF, IFOF, and VOF are the nonzero matching named groups. Its boundary distinguishes four claims: inspector relationships report only qualified low-confidence unordered endpoint proximity; the scene query reports categorical endpoint membership; association events use a separate 50/50 direction assumption and common illustrative 40 MNI mm/display-second base rate; and SWM amplitude depends partly on fibre-length structure while frequency/phase remain display choices. Neither proximity, categorical assignment, nor simultaneous display demonstrates terminations, connections, strengths, functions, or processing direction. |
| Ventral stream preview | The shortened prose introduces object-quality and perception biases without expanding into downstream clinical or network detail. The scene names and displays V1, V2, V3v, V4v, LOA, LOp, and FG1–FG4. A left-only cut reduces duplicate visual load; the ventral preset retains 511 superficial and 381 association contours. ILF, IFOF, and VOF are all nonzero matching left named groups. The scene does not assert a connection among shown regions. |
| Dorsal stream preview | The shortened prose introduces motion, spatial, and vision-for-action biases without expanding into downstream routes. The scene names and displays its V1/V2/V3d, V3A/V6/MT, intraparietal, and superior-parietal query areas. A left-only cut reduces duplicate visual load; the dorsal preset retains 940 superficial and 559 association contours. ILF, IFOF, SLF1–3, VOF, and MdLF are all nonzero matching left named groups. The scene does not assert a connection among shown regions. |
| Conclusion | The eighth scene exactly reprises the updated opening snapshot, including the shared early-region shells and 794 filtered superficial contours. It returns to the lesion prediction, summarizes the retina→chiasm→LGN→optic-radiation→V1 transformations, then identifies V2 and parts of V3 as shared early cortical stages that contribute to multiple downstream routes rather than a hard two-stream fork. It ends with retrieval and treats later ventral/dorsal biases only as a brief downstream preview. |

## Teaching-claim evidence

The records below were verified during the original lesson review; the added LGN and
historical-stream records were fetched and checked on 2026-07-22. Species, method, and
population limits remain part of the supported scope.

| Lesson claim area | Evidence and scope |
|---|---|
| Retinal computation, center-surround organization, and parallel output | [Kuffler 1953](https://doi.org/10.1152/jn.1953.16.1.37) established concentric receptive-field organization in cat retinal ganglion cells. [Masland 2012](https://doi.org/10.1016/j.neuron.2012.10.002) reviews retinal cell-type diversity and parallel transformations; [Dacey 2000](https://doi.org/10.1146/annurev.neuro.23.1.743) reviews primate spectral pathways. These sources do not imply that every described circuit was measured in humans. |
| Partial decussation and hemifield organization | [Mason & Erskine 2001](https://doi.org/10.1152/physrev.2001.81.4.1393) reviews optic-chiasm architecture and development. It supports nasal crossing and temporal non-crossing, not the schematic curve coordinates. |
| LGN layering and parallel channels | [Nassi & Callaway 2009](https://doi.org/10.1038/nrn2619) reviews parallel pathways from primate retina through LGN and V1. [Hendry & Reid 2000](https://doi.org/10.1146/annurev.neuro.23.1.127) reviews the heterogeneous koniocellular pathway. These sources support complementary M/P/K biases, not independent channels that each produce a complete percept. |
| LGN as a regulated relay | [Sherman & Koch 1986](https://doi.org/10.1007/BF00235642) reviews state-dependent control of retinogeniculate transmission. The lesson does not assign the viewer's illustrative event parameters to LGN physiology. |
| Optic-radiation organization and clinical localization | [Maciag et al. 2024](https://doi.org/10.1148/rg.230081) reviews visual-pathway anatomy and radiologic and clinical correlations. Individual fibre course and lesion expression vary; the current tract display does not resolve Meyer's loop or functional lanes. |
| V1 receptive fields, binocular interaction, and functional architecture | [Hubel & Wiesel 1962](https://doi.org/10.1113/jphysiol.1962.sp006837) reports classic cat V1 physiology. The lesson identifies this as foundational animal work rather than direct human single-cell evidence. |
| Human V1 retinotopy and cortical magnification | [Benson et al. 2012](https://doi.org/10.1016/j.cub.2012.09.014) links human retinotopic organization to cortical surface topology and documents individual variation. The displayed V1 shells do not visualize an individual's functional retinotopic map. |
| Distributed extrastriate processing and recurrent hierarchy | [Felleman & Van Essen 1991](https://doi.org/10.1093/cercor/1.1.1-a) synthesizes anatomical connections in macaque cortex as a distributed hierarchy with reciprocal and bypass routes. It supports rejecting a simple serial assembly line; the displayed human atlas shells do not demonstrate those connections. |
| Ventral-stream object-quality and categorization framework | [Kravitz et al. 2013](https://doi.org/10.1016/j.tics.2012.10.011) reviews the ventral pathway as a recurrent occipitotemporal network for object quality with multiple outputs. [Grill-Spector & Weiner 2014](https://doi.org/10.1038/nrn3747) reviews the spatially organized functional architecture of human ventral temporal cortex. Neither source licenses one-region/one-category assignments to the displayed shells. |
| Dorsal-stream motion, spatial, and visuomotor framework | [Born & Bradley 2005](https://doi.org/10.1146/annurev.neuro.26.041002.131052) reviews motion and disparity processing in primate MT. [Kravitz et al. 2011](https://doi.org/10.1038/nrn3008) reviews the dorsal stream as multiple visuospatial pathways rather than one “where” chain. The scene groups territories but does not display route connectivity or functional responses. |
| Historical two-stream framework | [Mishkin, Ungerleider & Macko 1983](https://doi.org/10.1016/0166-2236%2883%2990190-X) presents the classic object-versus-spatial cortical-pathway framing. [Goodale & Milner 1992](https://doi.org/10.1016/0166-2236(92)90344-8) reframes the distinction around perception and action. The lesson presents both as evolving models, not absolute anatomical or behavioral divisions. |
| Parallel streams and their interaction | [Nassi & Callaway 2009](https://doi.org/10.1038/nrn2619) reviews separate but interacting dorsal and ventral streams operating on related visual information. The lesson uses this as a systems framework rather than a complete wiring diagram. |

## Representation dependencies and publication limits

- The anterior path supports nasal-fibre crossing only. Biological temporal-retinal
  fibres are present in the prose and absent from the geometry.
- Optic-radiation and V1 scenes show the independently derived left geometry. The
  atlas's mirrored right optic radiation remains documented but hidden in those views.
- `cutaway: 50` is a display-only scene-frame center clip. It is not anatomical sectioning,
  resection, or a source-geometry change.
- The checked endpoint artifact yields these exact scene populations:
  - the bilateral shared-early query used by the overview, Scene 5, and conclusion
    matches 445 association and 794 superficial contours (843 known-quality, 127
    unknown-quality, and 269 ambiguous-quality fibres); association tracts are hidden
    in the overview and conclusion;
  - the bilateral LGN query matches 0 association and 22 superficial contours (5 known,
    16 unknown, and 1 ambiguous);
  - the left-only V1 query matches 138 association and 259 superficial contours (271
    known, 60 unknown, and 66 ambiguous);
  - the left-only ventral preset matches 381 association and 511 superficial contours
    (606 known, 100 unknown, and 186 ambiguous); and
  - the left-only dorsal preset matches 559 association and 940 superficial contours
    (960 known, 246 unknown, and 293 ambiguous).
- Quality labels summarize both endpoints of each included fibre. A fibre can match
  because one endpoint is assigned to the query set while its other endpoint remains
  unknown or ambiguous. The fourth integrated between-sets preset still matches 327
  bilateral contours but is not authored into this lesson.
- The inspector's bilateral 3/5 mm nearest-surface screen remains separate from runtime
  categorical filtering. Runtime classes use the exact Jülich MPM: the nearest nonzero
  label is known only when its centre lies within 2 mm and the label has a project region
  entity; a second distinct label within a 0.5 mm distance margin is ambiguous;
  unsupported winning labels, background, and distant endpoints are unknown. Unknown and ambiguous classes are excluded from region presets
  unless selected explicitly.
- The endpoint comparison uses 2009a fibre coordinates and 2009c labels in common RAS
  millimetres without a template warp or voxel-grid equivalence. Neither method establishes
  a termination, pairwise connection, strength, direction, functional traffic,
  one-region/one-function mapping, named U-fibre, probability, or individual anatomy.
  The conclusion returns to the early retina→LGN→V1 pathway and does not show those
  downstream bundles.
- The v1 image contract accepts declared credential-free HTTPS sources but not packaged
  repository-local image paths. The committed LGN scene therefore remains prose-only;
  adding a durable local-media contract is separate platform work.

## Maintenance rule

When lesson prose changes a scientific, clinical, functional, or historical claim,
update this record and verify the exact source before merging. When the displayed
representation or its limitation changes, update both this record and the applicable
core traceability and fidelity records. Keep work status and approval evidence in the
lesson Bead rather than presenting an approved plan as shipped behavior.
