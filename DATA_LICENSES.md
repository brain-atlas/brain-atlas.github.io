# Data sources, licenses, and citations

The [GNU Affero General Public License v3.0](LICENSE), identified by SPDX as
`AGPL-3.0-only`, applies only to original project code and documentation. It
does **not** replace the licenses and data-use terms below. This inventory is
project documentation, not legal advice.

The hosted viewer is intended for noncommercial research, education, and
personal use. Its Jülich-Brain-derived assets are licensed for noncommercial
use only. Contact the relevant rights holders before any commercial use.
Scientific interpretation and model limitations are inventoried separately in
[`docs/SCIENTIFIC_TRACEABILITY.md`](docs/SCIENTIFIC_TRACEABILITY.md).

## License map

| Project files | Source | Terms |
|---|---|---|
| `public/models/brain_mni.glb` | MNI152NLin2009cAsym brain mask via TemplateFlow | MNI notice reproduced below |
| `public/data/regions.json`, `public/data/regions/*.obj` | Jülich-Brain Atlas v3.0.3 maximum probability map | [CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) |
| `public/data/tracts.json` | HCP-1065 population-averaged tractography atlas | [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) and WU-Minn HCP Open Access Data Use Terms |
| `public/data/tract_activity.json` | Project-authored activity assumptions and source links; no anatomical geometry | [AGPL-3.0-only](LICENSE) |
| `public/data/entities.json`, `public/data/fidelity.json` | Project-authored stable bindings and scientific-disclosure metadata; no anatomical geometry | [AGPL-3.0-only](LICENSE) |
| `public/data/or_fibres.json`, `public/data/swm_fibres.json` | HCP-1065 population template processed with DSI Studio | WU-Minn HCP Open Access Data Use Terms |
| `docs/assets/org-avatar.png`, `public/favicon.ico`, `public/favicon-32x32.png`, `public/apple-touch-icon.png` | Viewer-derived rendering of the MNI cortical surface and HCP-derived tracts | Source terms above; adapted artwork under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/) and HCP terms |

## Viewer icon and favicon artwork

The organization avatar and favicons are cropped and resized from a lateral
render made by this viewer. The render contains `brain_mni.glb`, selected fibres
from `tracts.json`, and `or_fibres.json`; region meshes and schematic anterior
elements are not shown. The project adjusted framing, contrast, and output size
for legibility but did not alter the underlying anatomical geometry.

Because the composite incorporates HCP-1065 atlas material, the icon files are
distributed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/)
and the WU-Minn HCP terms, with the MNI notice and source acknowledgments below.

## MNI152NLin2009cAsym cortical surface

`public/models/brain_mni.glb` is a marching-cubes shell generated from the
1 mm MNI152NLin2009cAsym brain mask distributed through
[TemplateFlow](https://github.com/templateflow/tpl-MNI152NLin2009cAsym). The
project converted the mask to a surface, converted that surface to glTF, and
decimated it for browser rendering.

Citations:

- Fonov V, Evans AC, Botteron K, Almli CR, McKinstry RC, Collins DL. Unbiased
  average age-appropriate atlases for pediatric studies. *NeuroImage*.
  2011;54(1):313–327. <https://doi.org/10.1016/j.neuroimage.2010.07.033>
- Ciric R, Thompson WH, Lorenz R, et al. TemplateFlow: FAIR-sharing of
  multi-scale, multi-species brain models. *Nature Methods*.
  2022;19(12):1568–1571. <https://doi.org/10.1038/s41592-022-01681-2>

The source template carries this notice:

> Copyright (C) 1993–2004 Louis Collins, McConnell Brain Imaging Centre,
> Montreal Neurological Institute, McGill University.
>
> Permission to use, copy, modify, and distribute this software and its
> documentation for any purpose and without fee is hereby granted, provided
> that the above copyright notice appear in all copies. The authors and McGill
> University make no representations about the suitability of this software
> for any purpose. It is provided “as is” without express or implied warranty.
> The authors are not responsible for any data loss, equipment damage,
> property loss, or injury to subjects or patients resulting from the use or
> misuse of this software package.

## Jülich-Brain region surfaces

`public/data/regions.json` and `public/data/regions/*.obj` are adapted from the
**Jülich-Brain Atlas, cytoarchitectonic maps v3.0.3** maximum probability map.
The project extracted selected regions, separated hemispheres, converted
volumetric labels to marching-cubes surfaces, and simplified the meshes for web
rendering. These files are modified data, not original atlas files.

Source and citation:

- Dataset: <https://search.kg.ebrains.eu/instances/d69b70e2-3002-4eaf-9c61-9c56f019bbc8>
- Amunts K, Mohlberg H, Bludau S, Zilles K. Julich-Brain: A 3D probabilistic
  atlas of the human brain’s cytoarchitecture. *Science*.
  2020;369(6506):988–992. <https://doi.org/10.1126/science.abb4588>

The source dataset and these adapted region assets are licensed under
[Creative Commons Attribution-NonCommercial-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-nc-sa/4.0/).
Redistribution must preserve attribution, identify modifications, remain
noncommercial, and license adapted material under compatible ShareAlike terms.
No endorsement by the atlas authors or EBRAINS is implied.

## HCP-1065 tractography atlas

`public/data/tracts.json` contains selected, range-extracted, and resampled
streamlines from the **HCP-1065 Population-Averaged Tractography Atlas** release
`hcp1065`. The source and retained world coordinates are ICBM 2009a Nonlinear
Asymmetric, RAS+ millimetres; no 2009a→2009c point conversion was applied. These
files are modified data, not the original atlas distribution.

Source and citation:

- Dataset record: <https://brain.labsolver.org/hcp_trk_atlas.html>
- Exact source release: <https://github.com/data-others/atlas/releases/download/hcp1065/hcp1065_avg_tracts_trk.zip>
- Yeh F-C. Population-based tract-to-region connectome of the human brain and
  its hierarchical topology. *Nature Communications*. 2022;13:4933.
  <https://doi.org/10.1038/s41467-022-32595-4>

The atlas and these adapted tract data are licensed under
[Creative Commons Attribution-ShareAlike 4.0 International](https://creativecommons.org/licenses/by-sa/4.0/).
They also derive from WU-Minn HCP data and remain subject to the
[WU-Minn HCP Consortium Open Access Data Use Terms](https://www.humanconnectome.org/study/hcp-young-adult/document/wu-minn-hcp-consortium-open-access-data-use-terms).

`public/data/tract_activity.json` is separate project-authored metadata. It does
not add direction to the atlas data: it records the viewer's explicit 50/50
assumption, endpoint-label heuristics, illustrative event parameters, and the
scientific sources reviewed for each displayed bundle.

`public/data/entities.json` and `public/data/fidelity.json` are project-authored
lesson/disclosure metadata. Their stable renderer bindings, status terms, summaries,
and source links do not relicense or add anatomy to the referenced MNI, Jülich, or
HCP-derived assets; those assets remain governed by their source terms above.

## HCP-1065-template-derived fibres

`public/data/or_fibres.json` was generated with DSI Studio from the exact official
HCP-1065 1 mm `ICBM152_adult.1mm.fz`, whose source record identifies nonlinear
ICBM152 2009a. The release-companion T1 indicates the asymmetric variant, but a
direct FIB build binding was not retained. Tracking used thresholded
Jülich-Brain V1 and LGN ROI NIfTIs from the 2009c grid with identical qform/sform
code 4 world matrices. The project arc-length resampled each fibre and removed
three streamlines under its >18 mm V1-centroid rule. The viewer mirrors the
resulting left-hemisphere fibres at runtime to depict the right optic radiation.

`public/data/swm_fibres.json` was generated from the same FIB using a 2009c
superficial-WM seed derived from TemplateFlow GM/WM probability maps with matched
qform/sform world matrices. The project retained short streamlines with both
unrounded endpoints in a dilated cortical ribbon, deterministically sampled and
resampled contours, and stored original and local-neighbour mean length measures
used by the activity texture. These are real bilateral data and are not mirrored.
Neither FIB-derived asset underwent a 2009a→2009c template warp; its decoded
RAS+ coordinate frame was retained through resampling.

Source and methods citations:

- HCP-1065 Young Adult Fiber Templates:
  <https://brain.labsolver.org/hcp_template.html>
- Exact 1 mm FIB release:
  <https://github.com/data-others/atlas/releases/download/hcp1065/ICBM152_adult.1mm.fz>
- Exact Jülich-Brain v3.0.3 left [hOc1/V1](https://raw.githubusercontent.com/canlab/Neuroimaging_Pattern_Masks/master/Atlases_and_parcellations/2020_JulichBrain_v3.0.3/probabilistic_maps_pmaps_157areas/Area-hOc1/Area-hOc1_pmap_l_N10_nlin2ICBM152asym2009c_4.2_public_258e8c1d846f92be76922b20287344ae.nii.gz)
  and [CGL/LGN](https://raw.githubusercontent.com/canlab/Neuroimaging_Pattern_Masks/master/Atlases_and_parcellations/2020_JulichBrain_v3.0.3/probabilistic_maps_pmaps_157areas/CGL/CGL_pmap_l_N10_nlin2ICBM152asym2009c_10.0_public_5958c3f5255df1271eaa5a8672e39510.nii.gz)
  probability-map files used to derive the OR masks. Their Jülich terms remain
  CC BY-NC-SA 4.0 as stated above.
- Exact TemplateFlow 2009c [GM](https://templateflow.s3.amazonaws.com/tpl-MNI152NLin2009cAsym/tpl-MNI152NLin2009cAsym_res-01_label-GM_probseg.nii.gz)
  and [WM](https://templateflow.s3.amazonaws.com/tpl-MNI152NLin2009cAsym/tpl-MNI152NLin2009cAsym_res-01_label-WM_probseg.nii.gz)
  probability maps used to derive the SWM seed and endpoint ribbon. Their MNI
  terms are reproduced above.
- Yeh F-C. Population-based tract-to-region connectome of the human brain and
  its hierarchical topology. *Nature Communications*. 2022;13:4933.
  <https://doi.org/10.1038/s41467-022-32595-4>
- Yeh F-C, Tseng W-YI. NTU-90: A high angular resolution brain atlas
  constructed by q-space diffeomorphic reconstruction. *NeuroImage*.
  2011;58(1):91–99. <https://doi.org/10.1016/j.neuroimage.2011.06.021>
- Yeh F-C. DSI Studio: an integrated tractography platform and fiber data hub
  for accelerating brain research. *Nature Methods*. 2025;22(8):1617–1619.
  <https://doi.org/10.1038/s41592-025-02762-8>

These derived files are distributed under the
[WU-Minn HCP Consortium Open Access Data Use Terms](https://www.humanconnectome.org/study/hcp-young-adult/document/wu-minn-hcp-consortium-open-access-data-use-terms).
Recipients must:

- not attempt to identify or contact HCP subjects;
- comply with applicable institutional rules and human-subject requirements;
- redistribute original or derived HCP data only under the same terms;
- acknowledge WU-Minn HCP in public results or algorithms that benefited from
  the data; and
- cite the relevant HCP acquisition and processing publications.

Consult the linked terms for the complete conditions. Exact source hashes,
affines, recovered tracking commands, output correspondence, and numeric
co-registration checks are recorded in
[`docs/TRACT_SPACE_PROVENANCE.md`](docs/TRACT_SPACE_PROVENANCE.md).

## Required HCP acknowledgment and citations

Public presentations and distributions using HCP-derived data should include
the acknowledgment prescribed by the WU-Minn HCP Consortium:

> Data were provided [in part] by the Human Connectome Project, WU-Minn
> Consortium (Principal Investigators: David Van Essen and Kamil Ugurbil;
> 1U54MH091657) funded by the 16 NIH Institutes and Centers that support the
> NIH Blueprint for Neuroscience Research; and by the McDonnell Center for
> Systems Neuroscience at Washington University.

For this viewer’s diffusion-derived assets, the HCP’s
[citation guidance](https://www.humanconnectome.org/study/hcp-young-adult/document/hcp-citations)
supports citing the overview and relevant diffusion-method publications:

- Van Essen DC, Smith SM, Barch DM, Behrens TEJ, Yacoub E, Ugurbil K, for the
  WU-Minn HCP Consortium. The WU-Minn Human Connectome Project: An overview.
  *NeuroImage*. 2013;80:62–79.
  <https://doi.org/10.1016/j.neuroimage.2013.05.041>
- Sotiropoulos SN, Jbabdi S, Xu J, et al. Advances in diffusion MRI acquisition
  and processing in the Human Connectome Project. *NeuroImage*.
  2013;80:125–143. <https://doi.org/10.1016/j.neuroimage.2013.05.057>

No source institution or contributor endorses this project.

## How to cite this viewer

Use [`CITATION.cff`](CITATION.cff) for the software citation. Cite the exact
release or commit used so the rendered code and data can be identified. A
publication using the anatomical content should also cite the relevant source
datasets and methods above; citing this viewer does not replace those citations.
