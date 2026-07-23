# Fibre template-space provenance

Status: current public traceability record for `brain-atlas-yum.5` and the
checked `brain-atlas-yum.6` pipeline evidence (2026-07-22). This record covers the
coordinate lineage and reproducibility boundary of the three runtime fibre assets. See
[`SCIENTIFIC_TRACEABILITY.md`](SCIENTIFIC_TRACEABILITY.md) for the full anatomy and
activity inventory and [`DATA_LICENSES.md`](../DATA_LICENSES.md) for redistribution
terms.

## Conclusion

The fibre assets were **not** authored on the MNI152NLin2009cAsym voxel grid:

- `public/data/tracts.json` comes from the HCP-1065 population-averaged
  tractography atlas in **ICBM 2009a Nonlinear Asymmetric** space.
- `public/data/or_fibres.json` and `public/data/swm_fibres.json` were tracked on
  one exact official HCP-1065 1 mm FIB. Its source record identifies nonlinear
  **ICBM152 2009a**. A release-companion T1 indicates the asymmetric variant, but
  no retained FIB build record binds that variant directly; the metadata keeps
  this limit explicit.
- Nibabel decoded source TrackVis voxel-mm vertices into **RAS+ world
  millimetres**. Project resampling and rounding changed contour samples while
  retaining that coordinate frame. No 2009a→2009c template warp was applied.

The cortical surface and Jülich regions remain MNI152NLin2009cAsym. This is a
mixed-template-release overlay in one continuous RAS-millimetre stereotaxic frame,
not a claim that every asset shares one voxel grid. The MNI distributor says that
2009a and 2009c describe the same anatomy with different sampling. Official NIfTI
world axes, source/output correspondence, identity-world comparison, endpoint and
ribbon checks, and browser transform checks support the overlay without fitting or
another runtime transform.

Every anatomical layer still receives only `sceneFromMni` in `src/main.js`: uniform
millimetre scale, proper -90° R-axis rotation, and one recentering translation.
Its determinant remains +1. No per-dataset fit, marker alignment, nonuniform scale,
or second runtime transform was introduced.

## Source statements and remaining template limit

- The [HCP-1065 fibre-template record](https://brain.labsolver.org/hcp_template.html)
  identifies nonlinear ICBM152 2009a registration and the 1 mm FIB.
- The exact recovered FIB is byte-identical to release asset
  [`hcp1065/ICBM152_adult.1mm.fz`](https://github.com/data-others/atlas/releases/download/hcp1065/ICBM152_adult.1mm.fz).
- The release tag's companion `ICBM152_adult.T1W.nii.gz` is a quantized linear
  copy of the official 2009a asymmetric T1 under the numeric method below. This
  strongly indicates the FIB variant, but it is not a direct build record linking
  that T1 to the FIB hash. OR/SWM therefore declare `ICBM152 nonlinear 2009a` and
  preserve this evidence limit rather than upgrading it to certain asymmetric
  provenance.
- The [HCP-1065 tractography-atlas record](https://brain.labsolver.org/hcp_trk_atlas.html)
  directly identifies the association source as ICBM 2009a Nonlinear Asymmetric.
- The [MNI ICBM152 nonlinear 2009 record](http://www.bic.mni.mcgill.ca/ServicesAtlases/ICBM152NLin2009)
  calls 2009a and 2009c separate releases of the same anatomy with different
  sampling and slightly different tissue probabilities due to N3 versions.

## Coordinate decoding and grids

### TrackVis decoding

TrackVis streamline vertices are stored in **voxel-mm** coordinates referenced to
voxel corners. `voxel_order` describes the reference image's voxel orientation; it
is not itself a streamline RAS/LPS coordinate label. With nibabel 5.4.2,
`get_affine_trackvis_to_rasmm` performs, in order:

1. division by header voxel sizes (voxel-mm → voxel);
2. a -0.5-voxel center/corner offset;
3. an orientation correction when `voxel_order` differs from the orientation
   implied by `voxel_to_rasmm`; and
4. the header `voxel_to_rasmm` transform.

The loaded tractograms used by the recovered processing therefore expose RAS+ world
millimetres. The recovered generator package versions are not known. The checked
`tools/assets` pipeline freezes nibabel 5.4.2, NumPy 2.5.1, SciPy 1.18.0, and the
asset-specific writers; it reproduces current outputs exactly under its registered
environment and inputs.

### Verified grids and header matrices

| Artifact | Shape / voxel size | Header world metadata |
|---|---|---|
| Official ICBM 2009a asymmetric T1 NIfTI | 197×233×189 / 1 mm | RAS+, diag(1,1,1), origin `[-98,-134,-72]` |
| Official ICBM 2009c asymmetric T1 NIfTI | 193×229×193 / 1 mm | RAS+, diag(1,1,1), origin `[-96,-132,-78]` |
| HCP-1065 population-averaged source TRKs | 157×189×136 / 1 mm; `voxel_order=LPS` | `voxel_to_rasmm=[[-1,0,0,78],[0,-1,0,76],[0,0,1,-50],[0,0,0,1]]` |
| Exact `ICBM152_adult.1mm.fz` FIB | 160×200×160 / 1 mm | row-vector `trans=[[-1,0,0,0],[0,-1,0,0],[0,0,1,0],[79.5,81.5,-72,1]]` |
| Recovered OR/SWM output TRKs | 160×200×160 / 1 mm; `voxel_order=LPS` | `voxel_to_rasmm=[[-1,0,0,79.5],[0,-1,0,81.5],[0,0,1,-72],[0,0,0,1]]` |
| Final OR masks and SWM seed/ribbon inputs | 193×229×193 / 1 mm | qform code 4 = sform code 4 = diag(1,1,1), origin `[-96,-132,-78]`; no conflict |

The official FIB is 8,181,706 bytes compressed and has SHA-256
`3e74089f3e423405ce37a4de08e0e291355ba89463fe39c683cd1c0099a43df7`.
Its decompressed MATLAB-v4 payload has SHA-256
`6dfd8f10a14db0b7274638c934eaa2e08c77e794b6237f07b3cd25ed7753870a`.
The actual header reports a 1 mm grid. An embedded historical report says QSDR
output was 0.5 mm isotropic, while the current source page calls this the 1 mm FIB;
the discrepancy is retained. The distributed header and recovered output TRKs are
the coordinate evidence used here.

## Numeric methods

The checked research script
`.pi/research/2026-07-22-tract-space-provenance/verify.py` pins nibabel 5.4.2,
NumPy 2.5.1, and SciPy 1.18.0 and records the original provenance audit. It requires
explicit paths to non-redistributed sources and never launches DSI Studio. It fails
unless all 15 consumed external/recovered artifacts and all three complete current
JSON assets match registered SHA-256 values. It also enforces exact binary mask/seed
derivations, form codes, nonconflicting matrices, and parent-to-derived grids.

The normative generator contract is now [`tools/assets/SPEC.md`](../tools/assets/SPEC.md).
Its schema-validated manifest, pinned Python 3.13.1 environment, hash-before-parse
inputs, safe empty output roots, frozen numerical/writer contracts, printer-only DSI
boundary, and exact output checks cover cortex, regions, association tracts, optic
radiation, and SWM. It never downloads implicitly, writes into `public/`, or treats
contour order as biological direction.

### FIB companion-T1 comparison

- Exact members: tagged `ICBM152_adult.T1W.nii.gz`, official
  `mni_icbm152_t1_tal_nlin_asym_09a.nii`, and the corresponding symmetric 09a T1.
- All comparisons use voxels where both images are greater than zero.
- The tagged and official images already have the same shape and affine; no spatial
  resampling or spatial fit is applied.
- A centered ordinary-least-squares intensity model `tagged = slope × official +
  intercept` supplies residual RMSE and maximum absolute residual.

Asymmetric comparison: correlation `0.9999915`, residual RMSE `0.2887`, maximum
absolute residual `0.5011`. Symmetric control: correlation `0.9929894`, residual
RMSE `8.2668`. This supports, but does not replace the missing direct FIB build
binding.

### 2009a-to-2009c identity-world comparison

The official asymmetric 2009a T1 is resampled into the official asymmetric 2009c
shape/affine with `nibabel.processing.resample_from_to`, linear interpolation
(`order=1`), and constant-zero outside the source. Correlation `0.9970073` uses
voxels where both images are nonzero. Brain-support Dice `0.9746288` uses the
identity-resampled and target arrays thresholded at intensity `>1`. This is
corroborating alignment evidence, not a conversion applied to project fibres.

### Mask distances

OR endpoint distances are Euclidean distances from final 0.01 mm endpoint samples
to binary-mask **voxel centers**, using `scipy.spatial.cKDTree`. Endpoint assignment
minimizes the sum of LGN- and V1-mask distances across the two alternatives. SWM
uses the same world-coordinate cKDTree method from each actual 0.1 mm rounded
endpoint to the undilated `GM>0.40` voxel-center set; source filtering separately
tests unrounded endpoints in `binary_dilation(GM>0.40, iterations=1)`.

## Asset lineage

### Named association tracts — `tracts.json`

**Upstream.** Stable source archive:
[`hcp1065_avg_tracts_trk.zip`](https://github.com/data-others/atlas/releases/download/hcp1065/hcp1065_avg_tracts_trk.zip)
(SHA-256 `344aad4394f18b8926ed5e1bda911ad56e328c6cf75faa45e1302512ad779c67`,
587,869,457 bytes). The selected bilateral bundles are ILF, IFOF, SLF I–III,
VOF, arcuate, and MdLF.

**Checked derivation.** `tools/assets/association.py` parses each gzipped TRK with
nibabel, uses one NumPy RNG seed 0 across the manifest's tract/hemisphere order,
samples 180 fibres per group, resamples by cumulative arc length to 40 points,
rounds to 0.1 mm, and reverses storage order when needed so lower y comes first.
That last step preserves an old animation/storage convention, not biological
polarity; current activity ignores contour order.

A fresh pinned run against the upstream archive reproduced the complete former file
byte-for-byte: SHA-256
`3e6dc53d97367435fa806435970cd78cc17f81ec51c4ace40f71b3ea5e98abef`.
This proves that its former `MNI152NLin2009cAsym` string was unsupported generator
metadata, not evidence of conversion. The frozen parsed `tracts` payload hash is
`e2c1486875de14e39f4b1a047db9841e4253b334fecf80c1ef55c255df940c70`.

The output has 2,880 fibres (180 × 8 × 2), each with 40 points; bounds are
`[-66.7,-103.6,-44.0]` to `[70.1,75.3,79.8]` mm. All 1,440 left fibres have
negative mean x and all 1,440 right fibres have positive mean x. These checks do
not prove cortical endpoints, tract names, or functional relationships.

### Left optic radiation — `or_fibres.json`

**Source masks.** The exact Jülich-Brain v3.0.3 left probability maps were the
Canlab-distributed hOc1/V1 file (SHA-256
`950344acd8428aeacaabc300cfbf48ddcadf843c179dabc6c6a7777f69110a16`)
and CGL/LGN file (SHA-256
`50e64d27c70cd4242a9e3042eee1e28abf437dbe7cccbd08f1946ded72ef9a2a`).
The final V1 mask used values `>=0.25 × source maximum` (15,613 voxels); the final
LGN mask used `>=0.10 × source maximum` (1,224 voxels). Both source maps have equal
qform/sform code 1 matrices. The binary outputs exactly match the thresholded
parent arrays, explicitly set the same affine as equal qform/sform code 4 matrices,
and have no form conflict.

**Recovered final command.** This command generated 223 streamlines from 300,006
seeds:

```text
dsi_studio --action=trk \
  --source=ICBM152_adult.1mm.fz \
  --seed=v1_L_mni.nii.gz --end=lgn_L_mni.nii.gz \
  --seed_count=300000 --turning_angle=65 --step_size=0.5 --smoothing=0.2 \
  --min_length=40 --max_length=170 --thread_count=6 \
  --output=or_retrack_L.trk
```

An immediately preceding trial on the same FIB and 193×229×193 mask grid reported
that DSI Studio found the dimensions different, assumed MNI space, and applied each
NIfTI header srow matrix. The final command's filtered log retained mask placement
and tract/seed counts rather than that full loader trace. The final masks have equal
qform/sform code 4 matrices, and final endpoint checks agree with those world
coordinates. This supports header-world alignment but does not replace a replayable
DSI versioned run.

**Recovered post-processing.** The 223-streamline decompressed TRK has SHA-256
`60799f23977e938411ffc127083d5220e503c4a112b28f4ea14d46d3c01041d0`.
Project code resampled contours by cumulative arc length to 64 points, rounded to
0.01 mm, and removed three streamlines under its rule `distance(V1-side endpoint,
[-12.3,-92.7,1.1]) > 18 mm`. This centroid rule is a project filter, not proof
that those streamlines were anatomically aberrant or outside V1. Post-processing the recovered intermediate reproduced the former JSON byte-for-byte:
SHA-256 `3516ddc59881ab1303b0da4e795a94dd47940181cbdf2d6e1e59e999577004c6`;
the current metadata-corrected file is SHA-256
`1ca89796c621963388f635bd31ab0bd9a28eec7917de6c12ef8b68d469da4144`.
The frozen parsed geometry hash is
`b89152176bd9a96796a02e449a4a34151572512def61014d04833336b6695b6e`.

**Manual replay boundary.** The registered six-thread replay used the exact surviving
executable, FIB, and prepared masks but generated 216 raw fibres; fixed
post-processing retained 215, so the result is class 4 `materially-different`. One
clean repeat generated 234/233 with a different decoded multiset. The two accepted
contemporary runs establish end-to-end non-repeatability without identifying the
varying internal stage. Neither recreates the recovered 223/220 asset, and neither
may replace it. Decision `brain-atlas-3ct` accepts this exact legacy boundary only
for pipeline closeout; source/build-bound deterministic retracking belongs to
`brain-atlas-yum.13`.

For all 220 final contours, the higher-y endpoint is the LGN side selected by
nearest-mask assignment. LGN voxel-center distance: median 0.488 mm, 95th percentile
0.794 mm, maximum 0.991 mm. V1 distance: median 0.550 mm, 95th percentile 0.841 mm,
maximum 1.357 mm. Every selected assignment beats swapping; the minimum total
margin is 71.71 mm. This validates the current file-specific runtime orientation
heuristic without making streamline order a biological-direction measurement.

Only left geometry was retained. Runtime sagittal mirroring still synthesizes the
right optic radiation; `brain-atlas-yum.7` owns replacement.

### Superficial white matter — `swm_fibres.json`

**Seed and ribbon parents.** The exact TemplateFlow 2009c GM probability map has
SHA-256 `662b18e83dddc554b19c621d9750af3454b54d4e103df03633eacced3884805a`;
the exact WM map has SHA-256
`b2f80e29f5a1ef55325215d1716ef611f5b1a3cd97b4a49ef4e9564e9564e945`.
The seed was `WM>0.5 AND binary_dilation(GM>0.5, iterations=4)`, yielding 534,090
voxels. Its SHA-256 is
`6589abdcecef64fb7b32e79f6ffe199b0a16fb011a10eb7f14d77c49548fce12`.
The GM/WM parents and seed all have equal qform/sform code 4 matrices on the same
grid. The final seed array exactly matches the stated Boolean derivation.

**Recovered command.** The user ran:

```text
dsi_studio --action=trk \
  --source=ICBM152_adult.1mm.fz \
  --seed=swm_shell_mni.nii.gz \
  --tract_count=200000 --min_length=8 --max_length=80 \
  --turning_angle=50 --step_size=0.5 --thread_count=8 \
  --output=swm_fibres3.trk
```

DSI Studio wrote gzip data under the `.trk` name. The project detected `1f 8b` and
decompressed before nibabel parsing. The recovered compressed and decompressed
intermediate hashes are recorded in the artifact registry. The DSI run was not
replayed and its exact user-facing version string was not retained.

**Recovered post-processing.** The verified filter:

1. built `binary_dilation(GM>0.40, iterations=1)`;
2. retained streamlines whose two unrounded endpoints fell in that band;
3. retained original arc lengths from 8 through 55 mm;
4. found 25,563 eligible short fibres;
5. used NumPy RNG seed 0 to sample 15,000;
6. resampled each contour to eight points and rounded to 0.1 mm;
7. stored `len` as original streamline arc length; and
8. stored `lloc` as mean original length among eligible fibres whose resampled
   centroids lay within 7 mm.

Running this post-processing against the recovered 200,000-streamline intermediate
reproduced the former JSON byte-for-byte: SHA-256
`e367886be8905e4036a9159cb1c6b6b9b32f5a78fde7b4e926cd6876792e8372`;
the current metadata-corrected file is SHA-256
`81529a410c9053731416124e346dce21e85d96c85fb8b3bad151735a4b1f81fb`.
The frozen parsed geometry/length hash is
`9dfc14d565c8f7ccb4c57ba0d2eee1bd9dca0549e3c7d07f70d6fe47f07f4331`.

**Manual replay boundary.** The registered eight-thread replay generated 200,000
tracts. Fixed post-processing produced the required 15,000-fibre shape, but decoded
geometry and output bytes differed from the recovered reference; the result remains
class 3 `metric-only`. Decision `brain-atlas-3ct` authorizes no class promotion or
replacement. Current SWM JSON remains tied to the exact recovered TrackVis
intermediate through deterministic post-processing.

Final bounds are `[-64.8,-101.9,-68.8]` to `[65.9,69.8,79.4]` mm. Mean-x
assignment gives 7,220 left and 7,780 right fibres. `len` spans 8.0–55.0 mm
(mean 33.12); `lloc` spans 8.0–54.5 mm (mean 33.61). Every selected unrounded
endpoint passed the dilated-ribbon test. Rounding displacement is at most 0.0854 mm.
World-coordinate distance from each actual rounded endpoint to the undilated
`GM>0.40` voxel-center set has median 0.600 mm, 95th percentile 1.315 mm, and
maximum 1.631 mm. This ribbon criterion does not establish histological U-fibre
identity or named cortical endpoints.

### Categorical endpoint assignment — `fibre_endpoints.json`

The checked endpoint builder consumes the exact 335,280-byte Jülich-Brain v3.0.3
MPM (`SHA-256 3af71c8d467db42d8561115164e0f365b942dfaa3568740ce62846fa3a201aff`)
and the hash-frozen association/SWM arrays, region/entity catalogs, and preset
catalog. The source MPM has shape `193×229×193`, qform/sform code 1, and affine:

```text
[ 1  0  0  -96 ]
[ 0  1  0 -132 ]
[ 0  0  1  -78 ]
[ 0  0  0    1 ]
```

For each stored first/last contour point, the builder queries nonzero MPM voxel
centres in RAS millimetres. A supported winning label is known when the endpoint
hits it directly or its nearest nonzero centre lies within 2 mm. A second distinct
label within 0.5 mm of the winning distance makes the endpoint ambiguous.
Unsupported winning labels, background, and distances beyond 2 mm remain unknown.
No supported label is substituted for a nearer unsupported label. The categorical
MPM supplies no probability.

The artifact preserves source order for 35,760 endpoints: 14,397 are known-direct,
401 known-nearest, 8,673 unknown-unsupported-label, 7,025 unknown-outside-support,
and 5,264 ambiguous. At fibre level, where either ambiguous endpoint dominates and
otherwise either unknown endpoint dominates, 4,916 fibres are known, 8,213 unknown,
and 4,751 ambiguous. It records each preset's included geometry and quality counts.
`tools/assets/SPEC.md` defines the exact algorithm and compact tuple contract.

This assignment compares 2009a fibre coordinates with 2009c labels in common RAS
millimetres. It applies no template warp, runtime transform, grid-index copy, or
marker fit. Stored endpoint A/B remains an unordered geometric pair. The labels and
queries do not prove terminations, connections, strengths, probabilities, functions,
directions, or individual anatomy.

## Why no template conversion or regeneration was applied

A 2009a-to-2009c voxel-index copy would be wrong because the arrays have different
origins and extents. That did not occur. Nibabel decoded source TrackVis metadata
into RAS+ world millimetres; DSI evidence and exact output checks place the derived
contours in the same world convention. The official releases describe the same
anatomy under different sampling, the world axes align, and independent numeric
checks agree. Uncertainty about the FIB's symmetric/asymmetric build binding remains
metadata uncertainty; it is not evidence for an undocumented corrective warp.

Applying another runtime transform or fitting fibres to markers would discard the
recovered lineage and violate the one-transform invariant. Regenerating contours on
a 2009c voxel lattice would add interpolation choices without evidence of an
anatomical warp to correct. The honest statement is: **decoded 2009a fibre-frame
RAS+ coordinates overlaid with 2009c surfaces in the shared RAS-millimetre world
frame, with the FIB variant evidence limit disclosed**. The offline nearest-shell
screen and categorical MPM assignment in `TRACT_REGION_MAPPING.md` use that common
world without changing it; neither a distance nor a label is evidence that the two
releases share a voxel grid.

## Remaining limitations and work owners

- The checked pipelines reproduce cortex, regions, association tracts, OR/SWM
  preparation, and current OR/SWM JSON from recovered intermediates. Manual DSI
  replays did not recreate the OR/SWM intermediates: OR remains class 4 and SWM
  class 3. The exact source/build binding and varying internal stage remain
  unresolved. `brain-atlas-yum.13` owns deterministic retracking; any candidate
  replacement requires separate approval.
- The surviving executable hash is
  `1e7aaf6be7ebebd0a69fa428eb9b670400642885137ae1d5710a1c1e3303cf56`.
  Its emitted Hou/Jul 9 2026 identity does not bind it to exact source, and the
  direct FIB-to-companion-T1 build binding remains unavailable.
- Right optic-radiation mirroring remains a material limitation owned by
  `brain-atlas-yum.7`.
- Association and SWM endpoint-region meaning remains limited by tractography,
  categorical MPM uncertainty, unsupported labels, the selected display samples, and
  mixed-release common-world comparison. `TRACT_REGION_MAPPING.md` separates the
  low-confidence bilateral inspector screen from the implemented per-fibre categorical
  filtering method.
- Tractography does not establish biological polarity. Association direction remains
  the separately disclosed 50/50 modeled fallback.

Compact source, artifact, transcript-extract, validation-method, and result records
live in `.pi/research/2026-07-22-tract-space-provenance/`; large third-party sources
and the 68 MB local transcript are not redistributed.
