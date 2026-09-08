# Data relationships and the useful product boundary

Work: `brain-atlas-yum.15`. Date: **2026-09-08 UTC**.
Status: evidence map plus recommended next slice; **not an implemented image viewer,
connectome, fMRI/DWI importer or approved new registration**.
See [source register](source-register.md) for exact inventory/recovery references.
Current scientific claims remain in [traceability](../../../docs/SCIENTIFIC_TRACEABILITY.md),
[tract provenance](../../../docs/TRACT_SPACE_PROVENANCE.md) and
[relationship methods](../../../docs/TRACT_REGION_MAPPING.md).

## Goal

Let someone select a relevant visual-system structure or tract, understand the
evidence for its relationships, inspect the supporting anatomy at an appropriate
scale, and relate a physical location to each image's voxel coordinates. Build
that useful path before pursuing general imaging support or more atlas acquisitions.

## Scientific kinds, not file extensions

| Kind | Existing example | What it can contribute / cannot establish |
|---|---|---|
| Population reference anatomy | ICBM T1/T2/PD and tissue maps | Spatial context; not the anatomy of one particular user/subject |
| Anatomical delineation | Jülich MPM, CerebrA, carpet | Source-defined regions; different definitions and missing coverage must survive comparison |
| Population spatial evidence | Jülich continuous maps, HCP short-bundle maps | Distribution/overlap evidence; not interchangeable or automatically normalized endpoint probabilities |
| Diffusion-derived tracking field | HCP-1065 FIB | Tracking inputs; not raw diffusion acquisitions, a scalar MRI, or a measured connectome |
| Reconstructed trajectory | TrackVis streamlines | Geometric paths; not measured axons, polarity or connection strengths |
| Display derivative | Simplified meshes and resampled JSON | Interactive presentation; not full source resolution or independent anatomical evidence |
| Authored teaching model | Anterior pathways and activity rules | Explicit explanatory model; not a measurement to compare statistically with imaging |

The same NIfTI extension can hold an intensity, label, mask, population map or
vector field. DWI is an acquisition/data family; DTI is a fitted tensor model,
not a synonym for all diffusion imaging or for our FIB/tractograms.

## Population and reference-space relationships

- **ICBM152:** population structural reference, with release and symmetric/asymmetric
  distinctions. We retain published products, not a complete donor-level rebuild.
- **Jülich:** histological donor delineations brought into reference space and
  aggregated; retained v3.0.3 descriptor describes ten-brain maps. It is not the
  same observation set as diffusion tractography. Individual transformation fields
  are not established as project inputs. See [map evidence](../2026-09-07-endpoint-probabilities/report.md).
- **HCP-1065:** diffusion-derived population products. The FIB, reference tractogram
  and subject-coverage products have different roles; an exact FIB-to-reference-ZIP
  build chain is not supplied by merely sharing a release label.
- **HCP short-bundle v1.1:** separate 76-subject product. Descriptor names
  DISCO+DARTEL and a 2009c asymmetric CSF mask for masked output, but does not bind
  the full unmasked template derivation. Cohort overlap with other HCP products is
  not established here. See [evaluation](../2026-09-07-swm-bundles/evaluation-report.md).
- **CerebrA:** Mindboggle/DKT-derived labels registered and manually edited on a
  symmetric ICBM template; not independent raw delineations on our asymmetric
  target. Native format equivalence does not settle inter-template correspondence.
  See [construction and limits](../2026-09-07-domain-atlas-selection/report.md).

Different source names do not prove disjoint brains; a shared name does not prove
identical subjects. Registration estimates anatomical correspondence, not biological
identity. Population aggregation generally cannot recover each contributing brain.

## Concrete lineage map

Arrows below name operations, not necessarily reversible mappings. Upstream
published construction is described in source records; it is not claimed replayable.

```text
ICBM/TemplateFlow 2009c asymmetric brain mask
  -- smooth, extract surface, simplify --> cortical GLB

Jülich donor delineations -- published normalization/aggregation --> atlas products
  ├─ categorical MPM -- smooth, mesh, simplify, round --> region OBJ shells
  ├─ continuous maps --> competing region/GapMap evidence
  └─ exact legacy V1/LGN maps -- threshold --> OR masks

HCP-1065 published reference tractogram
  -- select, resample, round --> association JSON

HCP-1065 FIB + OR masks -- historical DSI tracking --> recovered left OR TRK
  -- prune, resample, round --> left OR JSON
  -- runtime reflection --> synthetic right display (not independent right anatomy)

HCP-1065 FIB + GM/WM-derived whole-volume seed
  -- historical DSI tracking --> recovered short-range TRK
  -- endpoint/length filter, select, resample, round --> short-range JSON

Displayed association/short-range endpoints + categorical Jülich MPM
  -- project proximity rules --> known / ambiguous / unknown endpoint records
  != measured structural connectivity matrix

CerebrA symmetric labels/T1 -- rejected candidate registration --> private diagnostics
  != accepted asymmetric anatomical labels
```

Spatial comparisons between 2009a fibres and 2009c maps currently use decoded
common RAS millimetres without a template warp. The 2009a/2009c grids differ;
source records describe common anatomy with sampling/processing differences.
Symmetric versus asymmetric anatomy is a separate issue even when grids match.
The FIB's exact asymmetric build binding remains a specific evidence gap.

## The mappings we must keep distinct

| Mapping | Retain | Reversibility / current relevance |
|---|---|---|
| Compression/container conversion | Original bytes, decoded-value checks, scaling/header metadata | Payload can be lossless; recompression need not reproduce original container bytes |
| Voxel basis/unit change | Shape, affine, axis conventions, centre/corner convention, units | Nonsingular affine is invertible on continuous coordinates; integer lookup adds rounding |
| Brain-to-template or template-to-template registration | Exact endpoints, transform files/order/direction, domain and validation | Estimated anatomical correspondence; not guaranteed invertibility or accurate anatomy |
| Intensity processing | Scaling, normalization, interpolation, clipping | Not a geometric warp; quantization/clipping can lose information |
| Label crosswalk | Namespaced IDs, meanings, partial/merged mappings | One-to-one recoding can be reversible; merging labels is not |
| Aggregation/thresholding/MPM selection | Contributors, support, method, competing values when available | Many-to-one; cannot recover individual observations or losing probabilities |
| Geometry derivation | Parent IDs/indices, selection, sampling, smoothing, precision | Usually lossy; reopen parent rather than invert display geometry |
| Comparison | Metric, sample population, support, reference identities | Establishes a relationship/observation, not a parent-child derivation or anatomical truth |

“Onto” alone does not imply invertibility: many-to-one mappings can be onto.
Even an invertible continuous spatial transform does not make sampled image
resampling lossless, or map every point into a finite target field of view.

## Voxel/world foundation for future image inspection

For image `I`, keep its native affine `A_I`: voxel-centre coordinates to native
world coordinates. Keep template/subject identity separate from that matrix.
For a separately validated mapping `phi_I` from native world to atlas world:

```text
image voxel i -- A_I --> native world x -- phi_I --> atlas world
atlas point x -- inverse(phi_I) --> native world -- inverse(A_I) --> image voxel
```

If the image already shares the verified reference world, `phi_I` is identity.
If correspondence is unknown, report it as unknown; native-space inspection may
still be useful, but atlas labels must not be asserted there. Do not compose maps
just because their coordinates or template names look similar.

Show image identity, physical millimetres, continuous voxel coordinate, chosen
integer voxel/index convention, sampled value/unit and support status. Preserve
outside-grid, source background and anatomical unknown as different states.
Conflicting qform/sform, absent units, vector bases and TrackVis half-voxel semantics
need explicit handling, not silent header repair. A numerical float64 calculation
does not recover source precision already lost to quantization.

No new runtime anatomical transform is authorized: `sceneFromMni` remains the one
proper renderer transform. Future subject-image overlays require a separately
approved offline correspondence design, not an ad hoc runtime fit. Image zoom is
magnification, not new anatomical resolution; display interpolation and native voxel
size should remain visible to the user.

## Product slice: evidence-backed selection plus reference slices

**Recommended next feature, not implemented here:** pick LGN, V1 or one tract;
show existing qualified relationship evidence and synchronized orthogonal T1/T2
views at a physical location, with crosshair, zoom, source identity, native voxel
coordinates/value, and map support. Start with retained reference imaging and a
bounded memory budget. Keep the existing renderer and canonical selection path;
do not introduce a second anatomy scene or a universal importer.

Keep three connectivity concepts visibly separate:

- **Geometric/tractography evidence:** present today as qualified undirected
  proximity/filter records; does not establish synapses or strength.
- **Functional connectivity:** future time-series/statistical evidence with its
  own preprocessing, cohort, parcellation and method. Not available by animating
  streamlines or assigning probabilities to their endpoints.
- **Effective/directional connectivity:** model- or literature-supported claims;
  never inferred from stored point order or ordinary functional association.

### Future input checklist — only when a concrete workflow needs it

| Input | Minimum additional context to preserve and validate |
|---|---|
| fMRI time series | Spatial grid, time axis/TR/units, native reference, preprocessing/confounds, motion/correspondence information; task events when relevant. Statistical maps additionally need contrast/statistic/threshold semantics. |
| DWI | Image plus gradient b-values/b-vectors, their coordinate convention, b0 reference, acquisition/correction metadata and transforms; image volumes alone are insufficient for reconstruction. |
| DTI/scalar diffusion derivatives | Model and fitting provenance; tensor component basis/reorientation for tensors, metric/value semantics for scalar maps. Do not rotate tensors/gradients as if they were scalar intensities. |
| Tractogram/connectivity matrix | Reference geometry and source identities; for matrices, node/parcellation IDs, edge definition/units, weights, construction method and cohort. |
| Any subject image | De-identified example, usable terms, native anatomy/reference, and validated mapping if atlas correspondence is claimed. “NIfTI” is not a privacy guarantee. |

These are requirements to check against a chosen dataset, not a claim of implemented
BIDS/DICOM support, available individual scans or new clinical capability. We do not
need every donor MRI, a new connectome inference pipeline or another atlas search
before the reference-image slice is useful.

## Priority and stopping rule

1. Secure the exact direct-source dependency closure and recover five missing pins;
   enforce private-storage serving/publication exclusions before copying.
2. Prove one relevant image/selection/voxel workflow using retained references.
3. Add one licensed fMRI or diffusion example only when it tests a specific question.
4. Revisit registration only for a named correspondence gap with prospective criteria.

Classify disagreements before fitting: bytes/scaling, coordinate interpretation,
grid/support, display loss, missing ontology, cohort/definition differences,
registration uncertainty, or unresolved. Missing source bytes, missing transformations,
missing anatomical coverage and missing validation require different remedies.
The failed CerebrA candidate stays rejected; it does not block explaining existing
source-labelled disagreements or inspecting native imaging.
