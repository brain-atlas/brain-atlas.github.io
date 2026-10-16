# Atlas source register

Work: `brain-atlas-yum.15`. Verified: **2026-09-08 UTC**.
Status: historical 2026-09-08 inventory with 2026-10-16 protection/retention update
below; not a completed storage migration or clean-machine rebuild.
User approved a lean register and relationship map focused on a useful visual-system
atlas: connectivity evidence, relevant image inspection, and voxel/world coordinates.
See [relationship map](relationship-map.md) for meaning, mappings and product priorities.

This index reuses existing byte manifests; it does not replace their algorithms,
licenses or scientific claim records. No downloads, registration, source copying,
new dependency or runtime change occurred for this inventory.

## Recovery standard

- **Present + verified:** local size/SHA-256 matched a recorded identity in this audit.
- **Temporary:** present, but `/private/tmp` is not durable retention.
- **Unlocated:** no matching bytes in the bounded roots searched; not a whole-machine absence claim.
- **Retrieval recorded:** exact URL/version/hash is recorded, but no fresh network recovery was tested.
- **Rebuildable:** project derivation can reproduce output from pinned parents. This does not imply that the publisher's entire upstream processing is reproducible.

For new inputs retain dataset/version, scientific kind, cohort, template, native grid,
value semantics, source URL/access procedure, size/hash, terms, local path and
parent/method references. A URL alone is not a verified recovery route. Distinguish
publisher checksums from hashes we measured after acquisition.

## Existing authorities

| Reference | Authority |
|---|---|
| [Asset manifest](../../../tools/assets/manifest.json), [SPEC](../../../tools/assets/SPEC.md) | Exact source IDs, bytes, retrieval URLs, builders and public output contracts |
| [Tract provenance](../../../docs/TRACT_SPACE_PROVENANCE.md) | Source grids, derivations, recovered intermediates and correspondence limits |
| [Jülich probability inventory](../2026-09-06-siibra-accounting/probability-manifest.json) | 314 volumes plus four auxiliary files, each URL/size/hash |
| [HCP short-bundle inventory](../../../tools/assets/swm-bundle-sources.json) | 680 entries: 673 maps and supporting files/receipts |
| [CerebrA source inventory](../2026-09-07-domain-atlas-selection/source-manifest.json) | DOI archive and all 18 extracted files |
| [Candidate source/rights inventory](../2026-09-06-siibra-accounting/source-inventory.json), [rights review](../2026-09-06-siibra-accounting/rights-report.md) | Other research candidates; not adoption authority |
| [Data terms](../../../DATA_LICENSES.md) | Shipped material and local-only screening boundaries |

## Actual locations at audit time

Paths below are machine-local evidence, not implicit resolver defaults.

- **Repository:** `/Users/hays/Projects/brain-atlas`.
- **Replay archive:** `~/.local/share/brain-atlas/replay-evidence/brain-atlas-yum.6-2026-07-22/`.
- **Jülich probability:** `/private/tmp/brain-atlas-yum.14.1-julich-probability-177023/`.
- **Jülich builder inputs:** `/private/tmp/brain-atlas-yum.14.2-inputs.iEvUPW/`.
- **Earlier candidates:** `/private/tmp/brain-atlas-yum14-sources/`.
- **Carpet/T1:** `~/.local/share/brain-atlas/swm-domain-audit/brain-atlas-yum.14.3-source-2026-09-07/inputs/`.
- **HCP short bundles:** `~/.local/share/brain-atlas/swm-bundle-audit/brain-atlas-yum.14.4-hcp-v1.1-2026-09-07/`.
- **CerebrA:** `~/.local/share/brain-atlas/domain-atlas-selection-yum14-6-2026-09-07/inputs/`.
- **Rejected conversion:** `~/.local/share/brain-atlas/cerebra-conversion-yum14-10-2026-09-07/`.

## Required sources: direct dependencies and useful reference imaging

| Dataset / kind | Relevant product | Availability and exact recovery reference |
|---|---|---|
| TemplateFlow 2009c asymmetric brain mask; binary volume | Context shell `brain_mni.glb` | **Unlocated** in searched roots. Asset source `templateflow-brain-mask` records canonical filename, URL, size/hash. Current GLB is not an inverse source mask. |
| TemplateFlow 2009c GM/WM; tissue maps | Historical short-range seed/filter | **Unlocated**. Sources `templateflow-gm`, `templateflow-wm`. Retained derived seed does not recover continuous parents. |
| Jülich v3.0.3 MPM/XML/hierarchy; categorical anatomy and names | 314 bilateral meshes, catalogs, categorical endpoint classifications | **Present + verified, temporary.** Three exact source identities in Jülich builder inputs; alternate MPM in earlier candidates. Canonical IDs: `julich-mpm`, `julich-terminology-xml`, `julich-hierarchy`. |
| Legacy Jülich left V1/LGN continuous maps | Exact OR binary-mask preparation | **Unlocated**. Sources `julich-v1-left`, `julich-lgn-left`. Neither exact byte hash was found in the complete newer probability collection. Same atlas/version does not establish file or decoded equivalence. Binary masks survive in replay archive `inputs/or/`. |
| HCP-1065 reference tractogram; reconstructed paths | Named association geometry; research right-OR candidates | **Present + verified** repository `hcp1065_avg_tracts_trk.zip`, 587,869,457 bytes. Source `hcp1065-tract-archive`. Archive remains outside Git. |
| HCP-1065 FIB; packed diffusion-derived tracking fields | OR/short-range tracking input | **Present + verified** replay archive `inputs/hcp1065/ICBM152_adult.1mm.fz` and `replay/input/ICBM152_adult.1mm.fz`. Source `hcp1065-fib`, 8,181,706 bytes. Not raw diffusion data or a tensor-image collection. |
| Recovered OR/short-range tractograms; model-derived paths | Exact parents of shipped fibre JSON | **Present + verified** replay archive `recovered/or/or_retrack_L.trk`, `recovered/swm/swm_fibres3.trk`, `recovered/swm/swm_fibres3_plain.trk`. Asset intermediate IDs pin each. Back up these irreplaceable parents; tracking replays did not recreate them. |
| Official 2009a asymmetric T1/T2/PD, GM/WM/CSF and masks; reference imaging | Anatomical backdrop and source-space comparisons | **Present + freshly rehashed** repository `mni_icbm152_nlin_asym_09a_nifti.zip`; exact identity in [artifact registry](../2026-07-22-tract-space-provenance/artifacts.tsv). Archive members parsed in preceding inventory; main grid 197×233×189 at 1 mm, but face/eye masks differ. No image-slice viewer shipped by this work. |
| TemplateFlow 2009c asymmetric T1/carpet; reference image and coarse compartments | Target backdrop and source-compartment screening | Present in Carpet/T1 root. Carpet exact asset source `templateflow-carpet` freshly verified. T1 identity/validation in [domain report](../2026-09-07-domain-atlas-selection/report.md) and retained conversion receipt; not rehashed by the grouped source check below. |
| Project catalogs, teaching geometry and activity rules; authored/derived metadata | Existing atlas presentation and qualified relationships | Tracked `public/data`, `src/pathways.js`, `src/activity`; [scientific traceability](../../../docs/SCIENTIFIC_TRACEABILITY.md) identifies data-derived versus illustrative content. Not subject observations or measured connectivity. Historical builder catalog pins may differ from current presentation catalogs; preserve exact required revisions. |

### Audit result for the 11 asset-manifest sources

**6 exact identities located; 5 unlocated:** brain mask, GM, WM, legacy V1, legacy LGN.
Search compared size then SHA-256 across the Jülich probability/builder roots,
earlier-candidate root, replay archive, carpet source root and repository tract ZIP.
A different gzip container could hold equivalent data, but that is not established
by matching names; existing byte-bound builders still require their exact pins.

## Targeted corroboration and exploratory inputs

| Family | Scientific use / limitation | Availability |
|---|---|---|
| Jülich 314 continuous maps | Competing region/GapMap evidence; not individual endpoint probabilities | **318/318 inventory entries rehashed**, 39,693,200 bytes; temporary root. Twelve GapMaps are part of 314, not additional named areas. |
| HCP short-bundle v1.1 | Separate 76-subject population-map comparison; not the HCP-1065 tractogram | **680/680 entries rehashed**, 101,301,105 bytes. Separate masked MPM remains in earlier-candidate root; its pin is in the candidate inventory. |
| CerebrA | Edited labels/native symmetric T1; independent corroboration, incomplete cerebral-WM coverage | **18/18 extracted files rehashed**, 192,050,619 bytes; repository archive rehashed, 192,053,219 bytes. Three MINC/NIfTI scalar pairs were independently confirmed decoded-equal after axis permutation in preceding inventory. |
| Rejected CerebrA conversion | Evidence of one attempted spatial mapping, not an adopted atlas | Retained fields, labels, support, T1 and reports. `brain-atlas-yum.14.10` owns frozen rejection and uncommitted implementation/evidence under `.pi/research/2026-09-07-cerebra-conversion/`. Do not silently include that paused work in this change. |
| ARCHI/VEP/siibra configurations | Candidate comparisons / source discovery, not adopted anatomy | Some files present in earlier-candidate root; candidate inventory owns pins and gaps. No complete acquired ARCHI continuous collection or serialized sparse-map dataset established. Configuration entries are not source voxels. |
| HCP-1065 reference/probability volume archives and two HCP842 OR volumes | Prior OR cross-representation/generation comparisons | **Four recorded browser-artifact paths missing**; other copies not established. Local uncommitted `.pi/research/2026-09-06-right-optic-radiation/{volume-comparison,atlas-generation-comparison}.json` retain identities/results. Reports are not recoverable source bytes. Not direct parents of current viewer geometry. |
| Raw fMRI/DWI, subject registrations, tensor maps, measured connectivity matrices | Potential future subject/image workflows | **Not inventoried as available project inputs.** No acquisition or generic clinical-imaging importer approved here. Select one useful, licensed example only when implementing a concrete workflow. |

## Lean storage/recovery follow-through — original proposal

Use a project-local `data-local/` for raw inputs and retained evidence, outside Git
and all publication outputs; keep manifests/derivation records tracked. Preserve
originals and exact bytes when copying, and back up irreplaceable recovered data.
No new database, format framework or bulk upstream-subject download is needed.

**Security prerequisite (2026-09-08 finding, superseded by update below):** Git
ignore did not prevent serving files; Vite bound all interfaces without a dedicated
private-data deny. Explicit exclusion was required before migration. Do not serve
repository root with a generic file server. Existing root archives were not moved.

Then resolve five required missing pins through recorded URLs into a new bounded
input root, verifying size/hash before parsing. Any changed bytes must be investigated,
not accepted by changing the expected hash. Reacquisition, safe storage setup and
backup verification remain open work; **clean-machine rebuild is not yet established**.
No source rights or access restrictions are waived by this storage decision.

## 2026-10-16 protection and retention update

Work: `brain-atlas-yum.15.1`; bounded protection approval: `brain-atlas-pc3u`.
This update supersedes earlier availability claims **only for the paths rechecked**.

- Development/preview now default to loopback. Development HTTP blocks reserved
  private roots and the three source ZIP names, including encoded, query, `/@fs/`,
  trailing-slash and resolved symlink paths. Every ordinary/standalone build checks
  `public/` for untracked (including ignored), private and symlinked entries;
  private module loads and private original filenames of emitted assets fail.
  See `docs/SECURITY_REVIEW.md` for trusted-source/forced-inlining limits.
- `data-local/` is ignored and reserved but **not created or populated**. No source
  bytes were copied, acquired, moved, overwritten or deleted; rights are unchanged.
- Replay archive `MANIFEST.tsv`: **49/49 entries, 780,598,830 bytes** freshly match
  size and SHA-256. All three irreplaceable `recovered/` tractograms match both
  archive identities and registered asset-intermediate identities. Their three
  original scratchpad paths recorded in the manifest are now missing. The archive
  is retained local storage, **not verified independent backup**; another copy or
  recoverable backup on an independent destination has not been established.
- Required-source search now locates **3/11 exact source identities**: repository
  HCP tract ZIP, both archived HCP FIB copies, and retained TemplateFlow carpet.
  Search was bounded to the same Jülich builder/probability, earlier-candidate,
  replay and carpet roots plus the named repository tract ZIP, using size then
  SHA-256. All three `/private/tmp` Jülich/candidate roots listed above are absent.
  Therefore MPM/XML/hierarchy are now also **unlocated in those roots**, alongside
  the five previously missing pins. This is not a whole-machine absence claim.
- Five historical-pin acquisition remains deferred until concrete regeneration
  need; no changed hash or newer same-name file was accepted. Newly unlocated
  Jülich inputs and independent-backup verification remain explicit outstanding
  work. Full Bead acceptance and clean-machine rebuilding are **not established**.

No tracking was run. Byte checks establish retained identities, not upstream
regeneration, anatomical validity, changed licensing, or disaster recovery.

## Original 2026-09-08 verification evidence and limits

Fresh offline Python 3.13.1 stdlib checks through `uv` verified all entries of the
Jülich, short-bundle and CerebrA inventories above, plus **49 replay-archive entries /
780,598,830 bytes** against its `MANIFEST.tsv`. No network retrieval or build rerun
was substituted for that hash check. The 11-source search result is reproducible
from the bounded roots and asset manifest described above.

The preceding read-only audit also parsed official 09a NIfTI headers and native
FIB fields with nibabel/SciPy, and verified CerebrA MINC/NIfTI decoded equality.
Scientific interpretations are inherited from linked evidence records, not newly
validated donor-level registration or anatomy. Dated availability is not a promise
that temporary files will survive; live work status belongs in Beads.
