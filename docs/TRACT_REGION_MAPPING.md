# Tract–region relationship mapping

## Scope and claim

This record documents the low-confidence **endpoint-proximity** links exposed by the anatomy inspector for the eight displayed association bundles. It does not establish synaptic terminations, pairwise cortical connections, connection strength, tract abundance, population probability, function, input/output roles, or afferent/efferent direction.

The links describe only the checked web assets:

- `public/data/tracts.json`: a deterministic display sample of 180 streamlines per tract and hemisphere from the HCP-1065 population-averaged tractography atlas;
- `public/data/regions.json` and `public/data/regions/*.obj`: 45 bilateral displayed shells derived from the Jülich-Brain v3.0.3 maximum-probability map; and
- `public/data/tract_region_mapping.json`: the complete generated endpoint-proximity result consumed by regression tests, not a runtime coordinate transform; and
- `public/data/fibre_endpoints.json`: a separate categorical endpoint artifact for runtime association/SWM filtering. It does not author inspector relationships.

Association relationships are always `undirected`, `displayed-dataset`, `qualified`, and `low` confidence. Streamline array order is ignored. Literature-curated functional or directional statements remain separate from these display-derived records.

## Sources

| Source | Use | Verified record |
|---|---|---|
| Yeh 2022 HCP-1065 atlas and tract-to-region connectome | Source atlas identity, ICBM-2009a space, and context for population tract-to-region work. The project's custom Jülich screen is not the published HCP-MMP/Brodmann/Kleist matrix. | [Dataset page](https://brain.labsolver.org/hcp_trk_atlas.html); [doi:10.1038/s41467-022-32595-4](https://doi.org/10.1038/s41467-022-32595-4) |
| Jülich-Brain | Source atlas and population-atlas limitations for the displayed region shells. | [doi:10.1126/science.abb4588](https://doi.org/10.1126/science.abb4588); [v3.0.3 dataset record](https://search.kg.ebrains.eu/instances/d69b70e2-3002-4eaf-9c61-9c56f019bbc8) |
| Yeh et al. 2021 | Streamline termination and streamline-to-node assignment limits; exact assignment methods materially affect inferred connectomes. | [PMCID: PMC7615246](https://pmc.ncbi.nlm.nih.gov/articles/PMC7615246/) |
| Schilling et al. 2020 | False-positive/false-negative limits and the distinction between unconstrained connectomics and anatomically constrained bundle segmentation. | [PMCID: PMC7554161](https://pmc.ncbi.nlm.nih.gov/articles/PMC7554161/) |
| Wu et al. 2020 | Gyral termination bias and the difficulty of tracing streamlines through the superficial white matter into cortex. | [PMCID: PMC6935166](https://pmc.ncbi.nlm.nih.gov/articles/PMC6935166/) |

These papers constrain interpretation. They do not validate the project thresholds or convert a nearest-shell observation into a biological connection.

## Coordinate boundary

Association fibres retain decoded **ICBM 2009a Nonlinear Asymmetric RAS+ world millimetres**. Region shells are authored in **MNI152NLin2009cAsym RAS+ world millimetres**. No 2009a→2009c warp or per-dataset fit was applied. The offline screen uses the documented common world coordinates while preserving the mixed-release distinction. It does not claim voxel-index equivalence.

The one runtime `sceneFromMni` matrix remains unchanged. Endpoint proximity and categorical endpoint assignment are computed offline and add no transform.

## Reproducible method

Run:

```bash
uv run tools/map_tract_regions.py --check
```

To deliberately regenerate after reviewed input or method changes:

```bash
uv run tools/map_tract_regions.py
```

The PEP 723 script pins Python 3.13 plus NumPy 2.5.1, rtree 1.4.1, SciPy 1.18.0, and trimesh 4.12.2. It parses JSON normally and parses each OBJ with trimesh. It validates eight expected tract IDs, 180 streamlines per hemisphere, 40 points per streamline, 45 region records, 90 nonempty finite triangle meshes, and finite proximity results.

For each tract and hemisphere:

1. Take the first and last point of each displayed streamline as an **unordered pair**.
2. For each endpoint, calculate the exact nearest point on every same-hemisphere shipped region triangle surface.
3. Assign the endpoint to only the nearest of the 45 displayed candidate shells.
4. Count a streamline once for a region if either endpoint is assigned to that region within the screen radius.
5. Repeat independently at 3 mm and 5 mm.
6. Project a runtime relationship only when at least 18 of 180 streamlines pass in **both hemispheres at both radii**.

The 3 mm, 5 mm, and 18-of-180 rules are conservative project curation thresholds, not inferential statistics. Requiring both radii separates robust links from links that appear only under the more permissive screen. Requiring both hemispheres prevents a strongly unilateral display sample from silently becoming a bilateral named relationship. It does not prove biological symmetry.

Input hashes frozen in the current artifact:

| Input | SHA-256 |
|---|---|
| `public/data/tracts.json` | `568d8848a6dfe4cb859d9c7ec8e572a90cf0d71d0b7c741c4a1e1e2e4471b213` |
| `public/data/regions.json` | `d7aeaa5cc16d58d949485ee7447b39067113166516064f8cd32bbcfbf7f2dc0b` |
| 90-file region OBJ set, hashing sorted relative path + NUL + bytes + NUL | `a3affd0d19b12946bb6cfce0c045813cbfe68332f0388108b9f59c6b5aedc828` |

## Qualified display relationships

Counts are streamlines meeting the nearest-shell rule at 3 mm / 5 mm. Each hemisphere contains 180 displayed streamlines.

| Bundle | Region shell | L 3/5 mm | R 3/5 mm |
|---|---|---:|---:|
| `tract.ilf` | `region.gap-tp` | 89/99 | 95/137 |
| `tract.ilf` | `region.sts2` | 71/74 | 27/28 |
| `tract.ifof` | `region.fp1` | 72/81 | 32/44 |
| `tract.ifof` | `region.gap-fi` | 22/34 | 74/92 |
| `tract.ifof` | `region.v1` | 54/85 | 59/75 |
| `tract.ifof` | `region.v2` | 31/35 | 24/27 |
| `tract.slf1` | `region.gap-fi` | 93/107 | 19/19 |
| `tract.slf1` | `region.gap-fo` | 121/121 | 37/41 |
| `tract.slf1` | `region.presma` | 46/53 | 22/24 |
| `tract.slf1` | `region.spl5m` | 51/52 | 29/44 |
| `tract.slf2` | `region.gap-fi` | 91/105 | 65/87 |
| `tract.slf2` | `region.gap-fii` | 36/62 | 58/68 |
| `tract.slf2` | `region.pfm` | 26/48 | 31/32 |
| `tract.slf3` | `region.broca` | 30/38 | 44/59 |
| `tract.slf3` | `region.op6` | 83/88 | 46/56 |
| `tract.slf3` | `region.pf` | 79/97 | 37/37 |
| `tract.vof` | `region.loa` | 72/73 | 25/34 |
| `tract.vof` | `region.lop` | 47/47 | 34/40 |
| `tract.vof` | `region.v3a` | 92/92 | 60/60 |
| `tract.vof` | `region.v3d` | 46/46 | 69/69 |
| `tract.af` | `region.broca` | 83/93 | 90/91 |
| `tract.af` | `region.gap-fi` | 53/70 | 58/65 |
| `tract.mdlf` | `region.spl7a` | 70/112 | 51/108 |

`GapMap`/“unparcellated” shells remain labelled as such in the viewer. Proximity to one of those shells must not be restated as a named cytoarchitectonic endpoint.

## Review of the former arrow labels

The previous region display names embedded tract arrows. An arrow could imply both a precise endpoint and travel direction, neither of which the data supplies. All five suffixes were removed.

| Former label | 3/5 mm counts L | 3/5 mm counts R | Outcome |
|---|---:|---:|---|
| `STS2 (ILF→)` | 71/74 | 27/28 | Qualified robust proximity; inspector relation is undirected and low confidence. |
| `OFC (IFOF→)` | 17/20 | 26/26 | Threshold-sensitive: fails the 3 mm screen; no inspector relation. |
| `preSMA (SLF I→)` | 46/53 | 22/24 | Qualified robust proximity; inspector relation is undirected and low confidence. |
| `DLPFC (SLF II→)` | 1/3 | 3/3 | Rejected; no inspector relation. |
| `Broca 44 (SLF III→)` | 30/38 | 44/59 | Qualified robust proximity; inspector relation is undirected and low confidence. |

## Inspector projection

`public/data/entities.json` authors one relationship from each tract to each qualified region. Every record carries:

- `direction: undirected`;
- `evidence: displayed-dataset`;
- `method: displayed-endpoint-proximity`;
- `status: qualified`;
- `confidence: low`;
- a count-bearing summary; and
- verified dataset/method source links.

`createLessonCatalog` validates the single authored pair and derives one reciprocal inspector view for the region. It does not duplicate geometry, visibility, filters, or renderer state. A regression test compares every authored dataset-derived relationship with `public/data/tract_region_mapping.json`, so runtime claims cannot drift silently from the generated evidence.

The established eye→chiasm→LGN→V1 pathway uses separate `literature-curated` or `schematic-teaching` records. The inspector displays evidence class, method, status, confidence, and relationship-specific sources rather than presenting every link as equally measured.

## Runtime categorical endpoint filter: separate method and claim

`tools/assets/endpoints.py` classifies the stored first and last points of all 2,880 association and 15,000 SWM contours against the exact Jülich-Brain v3.0.3 categorical MPM. This is independent of the nearest-decimated-surface inspector method above.

For each endpoint, the classifier finds nonzero MPM voxel centres in RAS millimetres and chooses the nearest label. The endpoint is known only when that centre lies within 2 mm and the label has a project region entity. A second distinct label within 0.5 mm of the nearest distance makes the endpoint ambiguous. Unsupported winning labels, background, and points beyond the support boundary remain unknown. The categorical MPM provides no probability. Stored A/B order is ignored by every query.

The generated artifact freezes tuple order, source/grid/hash metadata, endpoint status, distance, candidate labels, fibre quality, and four preset audits:

| Preset | Mode | Association | SWM | Total | Known / unknown / ambiguous |
|---|---|---:|---:|---:|---:|
| Extrastriate | touches any | 683 | 1,001 | 1,684 | 1,162 / 148 / 374 |
| Ventral | touches any | 693 | 1,137 | 1,830 | 1,266 / 150 / 414 |
| Dorsal | touches any | 1,178 | 2,002 | 3,180 | 1,986 / 514 / 680 |
| Integrated ventral–dorsal | unordered between sets | 168 | 159 | 327 | 327 / 0 / 0 |

Counts precede scene layer and hemisphere visibility. `touches-any` may retain a contour whose other endpoint is unknown, ambiguous, or outside the selected set. `connects-within` requires both endpoints in one set. `connects-between` requires one endpoint in each set, independent of order. Unknown and ambiguous endpoints match only explicit special selectors. Runtime lines, caps, eligible association-event contours, SWM grain, and SWM dots share the resulting mask.

This categorical comparison overlays 2009a fibre coordinates with 2009c MPM labels in common RAS millimetres without a template warp. It does not claim voxel-grid equivalence, biological termination, pairwise connectivity, strength, probability, function, direction, or individual anatomy. It creates no inspector relationship records.

## Optic radiation and superficial white matter

The optic radiation remains a biologically directed LGN→V1 projection supported by literature and its existing tractography/fidelity record. The runtime endpoint artifact excludes it and does not reinterpret it as an undirected association bundle.

Superficial white matter remains inspectable and has no relationship records. Its categorical endpoint classes support geometric subset queries only; they do not name individual contours as U-fibres connecting displayed region pairs.

## Limitations

1. The 180-streamline groups are selected display samples, not all source streamlines and not subject-level observations.
2. The 45 displayed shells are an incomplete candidate set. “Nearest” means nearest among this set, not necessarily the true or complete anatomical label.
3. Distances use the shipped decimated surfaces. They do not test whether an endpoint is inside a source probabilistic volume or at a gray/white boundary.
4. MPM shells suppress source probability and individual variability.
5. Diffusion tractography has termination, false-positive/false-negative, and gyral biases. Passing the screen does not prove a connection; failing it does not prove absence.
6. The bilateral curation rule can hide real lateralization and can retain relations with unequal left/right counts.
7. No array order, endpoint coordinate order, or animation direction is treated as measured polarity.
8. Functional input/output claims require separate literature evidence and are not generated by either pipeline.
9. Categorical MPM assignment suppresses source probability and individual variability; known, unknown, and ambiguous are method classes, not biological confidence estimates.
10. Runtime count summaries cover the endpoint-query population after global hemisphere masking, not every separately hidden layer or tract.
