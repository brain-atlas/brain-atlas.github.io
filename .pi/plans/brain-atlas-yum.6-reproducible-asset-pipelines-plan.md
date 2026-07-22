# Reproducible anatomical asset pipelines

> **Status:** Approved
> **Bead:** `brain-atlas-yum.6`
> **Design approval:** `brain-atlas-yw7`
> **DSI legacy closeout exception:** Approved by repository owner/change-control authority under `brain-atlas-3ct`; exact scope and implementation are in `.pi/plans/brain-atlas-yum.6.1-dsi-nondeterminism-correction-plan.md`
> **Implementation freshness gate:** Cleared 2026-07-22 after integrating `feature/zmq-8-anatomy-selection-inspector`; local `main` and this branch are both at `127e7331c75643997168d0bee86b37b670fabea8`
> **Owner:** Brain Atlas maintainers
> **Created:** 2026-07-22
> **Last amended:** 2026-07-22

## Decision and purpose

Check in source-verified offline pipelines for every anatomical asset class shipped by Brain Atlas. Preparation, extraction, meshing, and post-processing are deterministic from hash-fixed inputs; OR/SWM tracking remains a human-run, artifact-specific DSI replay whose exactness must be classified from evidence rather than assumed:

1. the cortical shell;
2. Jülich region meshes and `regions.json`;
3. named association-tract streamlines;
4. optic-radiation tracking inputs, user-run DSI command, pruning, and resampling; and
5. superficial-white-matter tracking inputs, user-run DSI command, endpoint/length filtering, deterministic sampling, and local-length metadata.

Approval `brain-atlas-yw7` selects focused asset modules behind one small Python CLI, one machine-readable source/parameter/output manifest, explicit external inputs, hash-before-parse, safe temporary outputs, exact validation against current checked assets, and manual replay of both DSI tracking runs before closeout. The agent must never launch DSI Studio.

This plan implements the corrected provenance established by `brain-atlas-yum.5`. It does not authorize changing any shipped coordinate, geometry, scientific model, runtime transform, or activity behavior.

Approval `brain-atlas-3ct` adds one non-precedential closeout exception for the exact legacy OR/SWM intermediate, public-file, geometry, and evidence hashes recorded in `.pi/plans/brain-atlas-yum.6.1-dsi-nondeterminism-correction-plan.md`. OR remains class 4 and SWM remains class 3; neither result is promoted or authorized for replacement. Current OR/SWM JSON is byte-reproducible from the registered recovered TrackVis intermediates, while upstream DSI tracking with the surviving executable is explicitly not claimed to be deterministic or fully regenerable. This exception may permit parent closeout only after the correction plan's evidence hardening, durable retention, documentation, follow-up, verification, review, and signed-local-commit gates pass.

## Current verified baseline

Read-only recovery before this plan established:

- The cortical-shell procedure reproduced `public/models/brain_mni.glb` byte-for-byte from the exact TemplateFlow MNI152NLin2009cAsym brain mask using Gaussian sigma 1.2, marching cubes at 0.5, 80,000-face simplification, normal repair, and GLB export.
- The direct, hashed Jülich-Brain v3.0.3 labelled MPM reproduced `public/data/regions.json` and all 90 checked OBJ meshes byte-for-byte. The direct public MPM can replace the moving `siibra` retrieval API as the generator input without changing output.
- The stable HCP-1065 population-averaged tract archive reproduced the pre-metadata-correction association asset byte-for-byte; corrected current metadata preserves the frozen geometry payload.
- Recovered OR and SWM tracked intermediates reproduce current post-processed fibre geometry byte-for-byte.
- OR masks derived from the exact Jülich parents and the SWM seed derived from the exact TemplateFlow parents reproduce their recovered files byte-for-byte.
- The surviving DSI executable has SHA-256 `1e7aaf6be7ebebd0a69fa428eb9b670400642885137ae1d5710a1c1e3303cf56`, but no exact build-to-source binding. User-run replay is complete: OR is frozen class 4 (216 raw/215 retained versus recovered 223/220), and SWM is frozen class 3 (valid 200,000 raw and 15,000 post-processed shape with different decoded/output hashes). One clean OR repeat produced 234/233 with a different decoded multiset, establishing non-repeatability of the clean end-to-end six-thread execution without isolating the varying internal stage. Rejected bias-disable attempts and exploratory one-thread observations are not class promotions or replacement evidence.

Normative input/reference identities (the manifest must copy these values, not rediscover them from filenames):

| ID / canonical filename | Bytes | SHA-256 | Stable source or acquisition evidence |
|---|---:|---|---|
| `tpl-MNI152NLin2009cAsym_res-01_desc-brain_mask.nii.gz` | 159,538 | `e40bb1816736504d4c25abc243c1c8503df1d308f64c048318aa4b829e09a7ae` | `https://templateflow.s3.amazonaws.com/tpl-MNI152NLin2009cAsym/tpl-MNI152NLin2009cAsym_res-01_desc-brain_mask.nii.gz` |
| Jülich v3.0.3 labelled MPM | 335,280 | `3af71c8d467db42d8561115164e0f365b942dfaa3568740ce62846fa3a201aff` | EBRAINS payload `https://data-proxy.ebrains.eu/api/v1/public/buckets/d-d69b70e2-3002-4eaf-9c61-9c56f019bbc8/maximum_probability_maps_MPMs_157areas/JulichBrainAtlas_3.0_areas_MPM_b_N10_nlin2ICBM152asym2009c_public_11035603b4744231e17e87fd8ebcaf1a.nii.gz` |
| `hcp1065_avg_tracts_trk.zip` | 587,869,457 | `344aad4394f18b8926ed5e1bda911ad56e328c6cf75faa45e1302512ad779c67` | `https://github.com/data-others/atlas/releases/download/hcp1065/hcp1065_avg_tracts_trk.zip` |
| `ICBM152_adult.1mm.fz` | 8,181,706 | `3e74089f3e423405ce37a4de08e0e291355ba89463fe39c683cd1c0099a43df7` | `https://github.com/data-others/atlas/releases/download/hcp1065/ICBM152_adult.1mm.fz` |
| `v1_hOc1_L.nii.gz` | 295,803 | `950344acd8428aeacaabc300cfbf48ddcadf843c179dabc6c6a7777f69110a16` | exact Canlab-distributed Jülich v3.0.3 hOc1 parent registered by `brain-atlas-yum.5` |
| `lgn_CGL_L.nii.gz` | 59,864 | `50e64d27c70cd4242a9e3042eee1e28abf437dbe7cccbd08f1946ded72ef9a2a` | exact Canlab-distributed Jülich v3.0.3 CGL parent registered by `brain-atlas-yum.5` |
| `tpl-MNI152NLin2009cAsym_res-01_label-WM_probseg.nii.gz` | 6,911,720 | `b2f80e29f5a1ef55325215d1716ef611f5b1a3cd97b4a49ef4e9564e9564e945` | exact TemplateFlow S3 parent |
| `tpl-MNI152NLin2009cAsym_res-01_label-GM_probseg.nii.gz` | 7,566,494 | `662b18e83dddc554b19c621d9750af3454b54d4e103df03633eacced3884805a` | exact TemplateFlow S3 parent |
| derived `v1_L_mni.nii.gz` | 43,153 | `029100d76aaf6421c0949aecd378a102f8befc96f23b0b9817935619e62b7ba6` | exact recovered mask; regenerated from registered hOc1 parent |
| derived `lgn_L_mni.nii.gz` | 37,975 | `b40368a68f5dd060ff0e62c5eabbd85bcda1b88fddaf1e40b2074e281a3982ac` | exact recovered mask; regenerated from registered CGL parent |
| derived `swm_shell_mni.nii.gz` | 299,004 | `6589abdcecef64fb7b32e79f6ffe199b0a16fb011a10eb7f14d77c49548fce12` | exact recovered seed; regenerated from registered WM/GM parents |
| recovered `or_retrack_L.trk` | 505,868 | `60799f23977e938411ffc127083d5220e503c4a112b28f4ea14d46d3c01041d0` | recovered transcript/log hash and `brain-atlas-yum.5` registry; not redistributed |
| recovered `swm_fibres3.trk` gzip | 232,887,173 | `0fd9cab05b61982191b372d77e83842aa51bef939fdcb17857188d90e278a631` | recovered transcript/log hash and `brain-atlas-yum.5` registry; not redistributed |
| recovered `swm_fibres3_plain.trk` | 271,717,032 | `4c79821a3295a66ba07f4f70c1a27191818715f42edcc30dfc632c36a81a4a3f` | exact decompression of registered gzip intermediate |
| DSI executable | 8,762,312 | `1e7aaf6be7ebebd0a69fa428eb9b670400642885137ae1d5710a1c1e3303cf56` | surviving arm64 Mach-O used by recovered session; version unknown; not redistributed |
| uv 0.9.30 executable | 49,354,272 | `63a2114be36011a3e5a43d75a3f95d7126d1709ed17bde86727a06ad3cbb48a0` | current Nix-managed `/run/current-system/sw/bin/uv`; verified-environment identity only |
| uv CPython 3.13.1 base executable | 49,968 | `513a2743ee8807003d3e2cc463c010f0b6615b2fb575300ce34a9a41439b095c` | uv-managed macOS arm64 CPython 3.13.1; full runtime-tree hash is created and approved in Phase 1 before any builder runs |

Registered decoded TrackVis reference hashes under the frozen v1 algorithms:

| Intermediate | Streamlines | Order-sensitive | Orientation/order-invariant multiset |
|---|---:|---|---|
| `or_retrack_L.trk` | 223 | `5ba9f9401cfa3f255d0b961f55ab089036a33b37d6bb4a8dff8423228b256367` | `c139a2bfdba4c47025c698e2275643b68943ded2bb958662aa27f19017eb59e6` |
| `swm_fibres3_plain.trk` | 200,000 | `908676c1fd0f04ffbf79acb2474c511aa0a5c9037f04398ec4c1bc7c7852eb87` | `e3cb46a4c7badd66216a0382ef79bc9b56971b1e966627f18ac1c9eb89291a88` |

The direct package set is fixed at nibabel 5.4.2, NumPy 2.5.1, SciPy 1.18.0, scikit-image 0.26.0, fast-simplification 0.1.13, and trimesh 4.12.2. Phase 1 resolves and hash-locks the complete transitive set, freezes its lock/output/runtime-tree identities in the manifest, and requires explicit review before any builder runs.

Current output fingerprints to freeze in the manifest and tests:

| Output | SHA-256 |
|---|---|
| `public/models/brain_mni.glb` | `e8c640c72b929b877220f842a53c280f59583606450acacb0efd58f74f454bed` |
| `public/data/regions.json` | `1d7d6891e8abe33c78093ab2e99407f6f1095e57cb25951085d11f4a506d988c` |
| 90-file region OBJ tree | `c3aadb2f71f7c0b94065cf70656f34894b380c908a3008245e7d948486c97dc7` |
| `public/data/tracts.json` | `568d8848a6dfe4cb859d9c7ec8e572a90cf0d71d0b7c741c4a1e1e2e4471b213` |
| `public/data/or_fibres.json` | `1ca89796c621963388f635bd31ab0bd9a28eec7917de6c12ef8b68d469da4144` |
| `public/data/swm_fibres.json` | `81529a410c9053731416124e346dce21e85d96c85fb8b3bad151735a4b1f81fb` |

The existing parsed geometry hashes from `.pi/research/2026-07-22-tract-space-provenance/verification-result.json` remain the independent geometry-preservation oracle.

## Scope

### In scope

- Version-controlled Python generators and preparation/post-processing commands.
- A fully resolved, hash-locked Python environment and a documented CPython 3.13.1 invocation through uv 0.9.30. Byte-exact claims are limited to the recorded Darwin arm64 environment; structural/semantic validation remains mandatory elsewhere.
- A structured source, license, parameter, tool, intermediate, and output manifest.
- Stable source URLs and exact byte hashes; no expiring signed URLs.
- Standard parsers: nibabel for NIfTI/TrackVis, `zipfile`/`gzip` for containers, JSON parsers for manifests.
- Explicit RAS+ world-millimetre coordinate contracts and no 2009a-to-2009c template warp.
- Safe output semantics: explicit empty output directories, fail on existing output by default, atomic writes where practical, no implicit writes into `public/`.
- Exact output and semantic validation.
- A command printer and verifier for the two human-run DSI tracking steps.
- Compact, non-secret reproducibility evidence and synchronized provenance/licensing/current-architecture documentation.
- Inputs useful to downstream endpoint classification under `brain-atlas-zmq.21`, especially the exact Jülich MPM, region label map, and SWM cortical-ribbon rule.

### Out of scope

- Runtime changes, a second transform, per-dataset fitting, or coordinate conversion.
- Changing any shipped fibre point, mesh, label, color, opacity, or metadata except to correct a newly demonstrated manifest error through renewed approval.
- Checking in raw third-party NIfTI/TRK/FIB/archive inputs or recovered intermediates.
- Automatically downloading data or implicitly accepting HCP, Jülich/EBRAINS, or TemplateFlow terms.
- Launching DSI Studio from agent code, tests, or an agent shell.
- Replacing the runtime-mirrored right optic radiation with independently tracked geometry (`brain-atlas-yum.7`). The pipeline continues to emit the current 220 left fibres only; its manifest and verification explicitly record that `src/main.js` synthesizes the displayed right side with `x → -x`, preserves fibre/point order, and must label it Mirrored.
- Implementing endpoint-region filtering (`brain-atlas-zmq.21`).
- Introducing plugins, a generic workflow engine, containers, or a project-wide Python environment.

## Repository design

Create a focused offline subsystem:

```text
tools/assets/
├── SPEC.md
├── requirements.in
├── requirements.lock
├── manifest.schema.json
├── manifest.json
├── __init__.py
├── __main__.py
├── cli.py
├── common.py
├── cortex.py
├── regions.py
├── association.py
├── optic_radiation.py
└── swm.py
```

Add:

```text
test/asset-pipeline.test.js
.pi/research/2026-07-22-reproducible-asset-pipelines/
├── validation.tsv
├── dsi-replay-summary.json
└── compact replay logs
```

Do not check in raw source files, generated temporary files, complete DSI logs containing unrelated machine details, or the recovered 68 MB Claude transcript.

### CLI contract

Invoke with:

```bash
uv run --python 3.13.1 --offline \
  --with-requirements tools/assets/requirements.lock \
  python -m tools.assets <command> ...
```

Required commands:

- `check-manifest` — validate schema, internal references, hashes, paths, coordinate declarations, and required license/source fields without heavy dependencies or network access.
- `verify-current --repo <path>` — hash and structurally validate current checked outputs without regenerating them.
- `build cortex --inputs <dir> --output <empty-dir>`.
- `build regions --inputs <dir> --output <empty-dir>`.
- `build association --inputs <dir> --output <empty-dir>`.
- `prepare optic-radiation --inputs <dir> --output <empty-dir>` — derive exact LGN/V1 binary masks and verify NIfTI forms.
- `dsi-command optic-radiation --inputs <dir> --prepared <dir> --output <path> --log <path> --binary <path>` — verify the binary and input hashes, then print a shell-escaped replay script; never execute it.
- `postprocess optic-radiation --tracked <path> --output <empty-dir>`.
- `prepare swm --inputs <dir> --output <empty-dir>` — derive the exact SWM shell seed.
- `dsi-command swm --inputs <dir> --prepared <dir> --output <path> --log <path> --binary <path>` — verify and print only.
- `postprocess swm --inputs <dir> --tracked <path> --output <empty-dir>`.
- `verify-replay <asset> ...` — compare exact container/decoded/intermediate/output hashes plus scientific structural metrics.

Before any builder runs in byte-exact mode, an environment preflight must verify the uv executable version/hash, selected CPython base executable version/build/hash, OS/kernel/architecture, complete CPython base-runtime tree hash, all installed direct/transitive distribution versions, and one content-tree hash per installed distribution against the manifest. Environment preparation must use the hash-complete lock with hash enforcement; `--offline` generation then prevents resolver or network drift. A mismatch aborts byte-exact mode before reading a scientific input. Other environments may run only explicitly labelled structural/semantic mode and can never replace checked assets.

Environment trees use a frozen `brain-atlas/environment-tree/v1\0` SHA-256 framing. Walk lexical entries under CPython `sys.base_prefix` for the runtime with `os.walk(..., followlinks=False)` and enumerate `importlib.metadata.Distribution.files` for each distribution. `lstat` every entry before traversal; record a symlinked directory as a symlink and remove it from traversal. Normalize lexical relative paths to POSIX form, require `os.fsencode(value).decode('utf-8', 'strict')` to succeed for every path and link target (otherwise fail), sort UTF-8 path bytes, exclude `__pycache__` directories and `.pyc` files only, and reject lexical paths escaping the declared root. Append one record per entry: regular file = ASCII `F`, `uint32_be(path_length)`, path, `uint64_be(file_length)`, file bytes; symlink = ASCII `L`, framed lexical path, `uint32_be(target_utf8_length)`, exact UTF-8 `readlink` target bytes without substitution. Directories are implicit; sockets/devices fail. Separately normalize each symlink target relative to its lexical parent (or as an absolute target), require it to remain under the declared root, and reject it otherwise; containment does not change the recorded target bytes. uv 0.9.30 `--with-requirements` exposes hash-locked distributions from a content-addressed uv archive outside its ephemeral `sys.prefix`; some declared console scripts are lexically `../../../bin/...` from `locate_file('')`. Therefore each package tree enumerates only `Distribution.files`, computes one lexical installation root as `os.path.commonpath` of `locate_file('')` and every located declared entry, rejects any resulting path outside that root without resolving symlinks, and frames paths relative to that root without embedding the archive or ephemeral prefix. This includes declared `bin/` scripts, dist-info, package code, and native extensions; the complete hash-enforced lock separately binds installation artifacts and dependencies. The literal empty-tree, regular-file, file-symlink, directory-symlink, non-UTF-8, and path-escape fixtures must be tested. The CPython base executable is also hashed separately.

All builders:

1. resolve files by manifest ID and canonical filename;
2. reject missing, mismatched, symlinked, or unexpected source files before parsing;
3. parse structured formats through established libraries;
4. write only beneath an explicit output root;
5. reject a nonempty output root unless a narrowly scoped explicit overwrite flag is present;
6. emit a compact validation report; and
7. never copy outputs into `public/` automatically.

`dsi-command` must contain no subprocess execution path. A static test must reject imports or calls that could launch DSI from the command printer.

## Manifest contract

`tools/assets/manifest.json` is the machine-readable authority for offline regeneration. Its schema must require:

- schema version;
- exact CPython patch/build, uv version, verified OS/kernel/architecture, complete direct and transitive package versions, and artifact hashes; `requirements.lock` must be generated from `requirements.in` with hashes and used in frozen/offline mode after explicit environment preparation;
- source IDs, canonical filenames, stable URLs, exact bytes and SHA-256, dataset/version, terms/license record, access/verification date, human-acceptance requirement, redistribution policy, and coordinate frame;
- tool IDs, known version or explicit unknown, executable hash where available, and replay status;
- pipeline IDs, source/intermediate/output dependencies, parameters, seeds, coordinate semantics, and output metadata;
- expected intermediate hashes, including decoded payload hashes where container bytes may vary;
- expected checked-output byte hashes and semantic geometry hashes;
- follow-up ownership for known limitations;
- a source-to-public-output rights matrix: source terms/version/URL, derivative-distribution determination, attribution/share-alike/noncommercial or controlled-access obligations, required notices/citations, evidence reviewer, and an explicit blocking state for unknown or incompatible rights. This is traceability, not legal advice.

The manifest must include at least:

- TemplateFlow 2009c brain mask, GM, and WM parents;
- direct Jülich-Brain v3.0.3 labelled MPM and the left CGL/LGN and hOc1/V1 parents;
- HCP-1065 population-averaged tract archive;
- HCP-1065 FIB;
- recovered OR and SWM tracked-intermediate identities;
- DSI executable identity;
- OR derived-mask identities and SWM derived-seed identity;
- all five current public output identities.

For every mixed-template OR/SWM step, use format-specific metadata: native FIB dimensions/voxel sizes/transformation/report fields for the MATLAB-v4 FIB; NIfTI dimensions/voxel sizes/orientation plus qform/sform codes and matrices for ROI/mask files; and TrackVis header fields plus effective nibabel TrackVis-to-RAS+ affine for tracked intermediates. Mark inapplicable fields `N/A` rather than inventing NIfTI forms for the FIB. Record the recovered/replayed DSI world-alignment message. Freeze the known values: the FIB/tracked-intermediate grid is 160×200×160 at 1 mm; the ROI/mask grid is 193×229×193 at 1 mm with RAS origin `[-96, -132, -78]`; recovered OR/SWM TrackVis files decode through nibabel 5.4.2 with effective affine `[[-1,0,0,80],[0,-1,0,82],[0,0,1,-72.5],[0,0,0,1]]`; and the recovered DSI run reported that the grids differ, called the ROIs “not mni space,” and applied each ROI header `srow` while warning the assumption was “likely wrong. need to check.” The scientific description must therefore say **numeric no-warp overlay**, not anatomical coregistration: 2009c ROI/seed world coordinates are presented to the 2009a FIB through their NIfTI world matrices, no 2009a→2009c warp exists, and the one runtime transform remains unchanged.

Editorial region selection and tract selection belong in the manifest, not hard-coded destructive scripts:

- every region ID, stream, display name, color, opacity, anatomical-parent text, left Jülich label, and `right = left + 1000` rule;
- every tract ID, archive member mapping, color, RNG seed 0, 180 fibres per tract/hemisphere, 40 points, arc-length resampling, 0.1 mm rounding, and storage-order rule explicitly labelled as non-biological;
- OR thresholds and comparison operators, successful V1-seed/LGN-endpoint command parameters, endpoint/tie rules, the project’s neutral greater-than-18-mm V1-centroid exclusion rule, 64-point resampling, and 0.01 mm rounding;
- format-specific mandatory fields: FIB `dimension=[160,200,160]`, `voxel_size=[1,1,1]`, and native `trans` rows `[-1,0,0,0]`, `[0,-1,0,0]`, `[0,0,1,0]`, `[79.5,81.5,-72,1]` (with the embedded report’s conflicting 0.5 mm QSDR statement retained as a diagnostic limitation); 2009c NIfTI shape `[193,229,193]`, one-millimetre RAS affine `[[1,0,0,-96],[0,1,0,-132],[0,0,1,-78],[0,0,0,1]]`, matching qform/sform matrices and codes (Jülich parents/direct MPM code 1; TemplateFlow brain/GM/WM and derived masks/seed code 4); and recovered/replayed TrackVis fields listed below;
- SWM seed derivation, tracking parameters, voxel-index and boundary rules, ribbon filter, inclusive 8–55 mm retained lengths, RNG seed 0, 15,000 fibres, eight-point resampling, 0.1 mm rounding, `len` arc length, and `lloc` seven-millimetre-neighbour mean length over the full retained population.

## Frozen equality contracts

The implementation must define these algorithms in `SPEC.md`, code, and independent tests before any DSI replay:

- **Byte equality:** SHA-256 of the exact file bytes. Gzip/container bytes and decoded TrackVis geometry are classified separately.
- **Region-tree hash:** SHA-256 over files in sorted POSIX-relative-path order. For each file append `uint32_be(path_utf8_length)`, UTF-8 path bytes, `uint64_be(file_length)`, then file bytes. Extra, missing, or duplicate paths fail.
- **Current JSON payload geometry hashes:** preserve the existing oracle exactly—UTF-8 SHA-256 of JavaScript `JSON.stringify` over the documented ordered payload (`tracts`; `{n,np,fibres}`; or `{n,np,len,lloc,fibres}`). Metadata is excluded only from this geometry hash and remains covered by whole-file byte hashes.
- **Decoded TrackVis order-sensitive hash:** SHA-256 over ASCII domain separator `brain-atlas/trk-order/v1\0`, then `uint64_be(streamline_count)`. For each streamline append `uint64_be(point_count)` and all coordinates in point/xyz order as contiguous little-endian IEEE-754 float64 bytes without numeric rounding. Counts are unsigned; an empty collection hashes only the domain separator plus zero count.
- **Decoded TrackVis orientation/order-invariant multiset hash:** for each streamline encode `uint64_be(point_count)` plus coordinate bytes as above in both forward and reversed point order; select the lexicographically smaller encoding and SHA-256 it. Sort the resulting 32-byte digests lexicographically while retaining duplicates. SHA-256 ASCII domain separator `brain-atlas/trk-multiset/v1\0`, then `uint64_be(streamline_count)`, then the sorted raw digest bytes. This tests exact decoded geometry independent of collection order and contour reversal; it does not confer biological direction.
- **Metric similarity:** counts, bounds, endpoint distances, lengths, or toleranced coordinates. Metrics may diagnose divergence but must never be called equality.

Independent tests must freeze literal expected hashes for at least: an empty collection; one two-point streamline with finite positive, negative, and zero coordinates; the same streamline reversed; a two-streamline collection in both orders; and a duplicate-streamline multiset. Tree-hash tests likewise freeze empty, one-file, nested-path, changed-content, extra-file, and missing-file vectors.

Byte-exact writers are output-specific and must be frozen in `SPEC.md` and fixture tests:

- compact fibre JSON: UTF-8, `ensure_ascii=False`, `allow_nan=False`, insertion-order keys, separators `(', ', ': ')`, CPython 3.13.1 numeric representation after explicit rounding, and no trailing newline;
- `regions.json`: UTF-8, `ensure_ascii=True` (matching the current file's `\\u2192` escapes), `allow_nan=False`, insertion-order keys, `indent=1`, LF newlines, and no trailing newline;
- OBJ: vertices in marching-cubes/simplifier array order as `v {x:.1f} {y:.1f} {z:.1f}\n`, then one-indexed triangular faces in array order as `f {a} {b} {c}\n`, LF only and a final newline;
- derived OR/SWM NIfTI: construct a fresh little-endian `nibabel.Nifti1Image(uint8_array, affine)` with no copied header or extensions; call `header.set_sform(affine, code=4)` and then `header.set_qform(affine, code=4)` in that order; leave all other nibabel 5.4.2 fresh-header fields/default scaling untouched; save to `.nii.gz` through nibabel 5.4.2’s deterministic gzip writer at its default compression settings. Freeze exact header fields, uncompressed `.nii` bytes, gzip header/trailer bytes, and complete `.nii.gz` hashes in fixtures for both recovered masks and the SWM seed;
- GLB: the pinned simplifier/trimesh writer on the exact verified environment; whole-file hash plus independently checked mesh counts/bounds/normals.

Fixture tests must cover escaping/non-ASCII text, negative zero, integer-like floats, scientific-notation thresholds, insertion order, and newline policy. Whole-file output hashes remain the final oracle.

Closeout classes are fixed before replay:

1. `byte-exact` — container and decoded order-sensitive hashes match;
2. `decoded-exact-order-drift` — container or order-sensitive hash differs but the orientation/order-invariant multiset hash matches exactly;
3. `metric-only` — exact decoded geometry differs, while recorded counts/bounds/endpoints/length distributions remain diagnostic only and are never called equality;
4. `materially-different` — decoding/parsing fails, any decoded coordinate is non-finite, the effective TrackVis-to-RAS+ affine is not `np.array_equal` to the manifest’s float64 4×4 matrix, or the fixed post-processor cannot produce its required public shape (OR: 220×64×3; SWM: 15,000×8×3 with matching `len`/`lloc` counts). OR mask/centroid endpoint distances, path bounds, tract counts before post-processing, and SWM length distributions remain diagnostics under class 3; they do not move a replay between classes. These hard predicates are fixed before replay and covered by fixtures for malformed input, NaN/Inf, one-bit affine change, out-of-bounds endpoints, and insufficient retained contours. No numeric tolerance can promote class 3 to equality.

Preparation/post-processing must reproduce current outputs byte-for-byte from the registered recovered intermediates. A fresh DSI replay may close without a new decision only in class 1 and with exact current post-processing output. Class 2, class 3, or inability to reproduce the current post-processed output requires a Beads-backed human decision before closeout; class 4 ordinarily blocks closeout and always blocks replacement.

The sole exception is versioned decision `brain-atlas-3ct`, scoped to the exact hashes in the approved correction plan. It leaves OR at class 4 and SWM at class 3, authorizes no replacement, is non-precedential, and permits only parent closeout after every correction-plan gate passes. A different hash, asset, replay, or proposed replacement receives no benefit from this exception and requires a new decision.

## Generator semantics

### Cortex

Input: exact TemplateFlow MNI152NLin2009cAsym 1 mm brain mask.

Steps:

1. verify source hash and matching qform/sform; load data as C-contiguous NumPy float32;
2. call SciPy 1.18.0 `gaussian_filter` with `sigma=1.2, order=0, output=None, mode='reflect', cval=0.0, truncate=4.0, radius=None, axes=None`;
3. call scikit-image 0.26.0 `measure.marching_cubes` with `level=0.5, spacing=(1,1,1), gradient_direction='descent', step_size=1, allow_degenerate=True, method='lewiner', mask=None`;
4. append float64 homogeneous ones and left-multiply by the float64 NIfTI affine to obtain RAS millimetres;
5. compute `target_reduction = 1.0 - 80000 / face_count` and call fast-simplification 0.1.13 with float32 points, int32 faces, `target_reduction`, `agg=7.0, verbose=False, return_collapses=False, lossless=False`, reproducing 80,000 faces;
6. construct trimesh 4.12.2 `Trimesh(vertices=v2, faces=f2, process=True)` with no other kwargs, call `mesh.fix_normals()` with no arguments, then call exactly `mesh.export(output_path)` with one positional filesystem path ending `.glb` and no kwargs, matching the recovered procedure; freeze a literal tiny-mesh export fixture in addition to the complete output hash;
7. require exact current GLB SHA-256 on the verified environment (macOS 26.5.1 / Darwin 25.5.0 arm64, uv-managed CPython 3.13.1, uv 0.9.30, hash-locked packages) and record structural counts/bounds independently.

### Jülich regions

Input: exact direct Jülich-Brain v3.0.3 labelled MPM in ICBM152 asymmetric 2009c.

Steps:

1. verify source hash, integer label array, shape, float64 affine, and forms; select manifest-declared labels only;
2. build each equality mask as float32 and call `np.pad(mask, pad_width=2, mode='constant', constant_values=0)`;
3. call SciPy 1.18.0 `gaussian_filter` with `sigma=0.6` and the exact remaining arguments from the cortex contract;
4. call scikit-image 0.26.0 `measure.marching_cubes` with `level=0.5` and the exact remaining arguments from the cortex contract;
5. subtract float32 padding offset 2 from vertices, append float64 homogeneous ones, and apply the float64 source affine to obtain RAS millimetres;
6. only when `face_count > 6000`, call fast-simplification 0.1.13 with float32 points, int32 faces, `target_reduction = 1.0 - 6000 / face_count`, and `agg=7.0, verbose=False, return_collapses=False, lossless=False`;
7. serialize OBJ coordinates/faces and `regions.json` through the frozen writer contracts in manifest stream/region/hemisphere order;
8. produce exactly 90 bilateral OBJ files and require the exact current manifest and frozen region-tree hash.

The generator must not call the moving `siibra` API at build time and must not delete arbitrary existing directories.

### Association tracts

Input: exact stable HCP-1065 population-averaged tract archive in ICBM 2009a Nonlinear Asymmetric space.

Steps:

1. verify the full archive hash; use `zipfile` and `gzip`, never range parsing or expiring URLs;
2. iterate the exact manifest tract order `ilf, ifof, slf1, slf2, slf3, vof, af, mdlf`, with hemisphere order `L, R`, and map exact archive members before parsing TrackVis through nibabel’s effective RAS+ millimetre decoding;
3. instantiate one `np.random.default_rng(0)` before the first tract and never reset it; for each tract/hemisphere call exactly `rng.permutation(streamline_count)[:min(180, streamline_count)]`, which samples without replacement, then preserve that index order;
4. convert each selected contour to C-contiguous float64 and arc-length resample to 40 points with the frozen OR/SWM cumulative-distance/`np.linspace`/`np.interp` algorithm;
5. after resampling, if `first_y > last_y`, reverse point order so lower-y is first; an exact tie preserves stored order. This is the legacy posterior-first storage rule and has no biological-direction meaning;
6. round every coordinate with Python `round(value, 1)` and preserve tract/hemisphere/sample order;
7. emit corrected current provenance metadata in exact key and frozen JSON serialization order;
8. require exact current byte and geometry hashes.

### Optic radiation

Inputs: exact HCP-1065 FIB plus exact Jülich v3.0.3 left hOc1/V1 and CGL/LGN maps.

Preparation:

1. derive V1 with `value >= 0.25 * parent_max` and LGN with `value >= 0.10 * parent_max` from finite parent values;
2. write `uint8` binary masks with the parent shape and affine, qform/sform code 4, and identical qform/sform matrices; reject parent form conflicts or non-finite data;
3. use SciPy’s default connectivity-one binary morphology only where explicitly stated—there is no dilation in the OR masks;
4. require exact recovered mask hashes and support/affine equality.

Printed DSI command:

Freeze this exact argv token order, with absolute paths substituted and no extra random-seed flag:

```text
<binary>
--action=trk
--source=<ICBM152_adult.1mm.fz>
--seed=<v1_L_mni.nii.gz>
--end=<lgn_L_mni.nii.gz>
--seed_count=300000
--turning_angle=65
--step_size=0.5
--smoothing=0.2
--min_length=40
--max_length=170
--thread_count=6
--output=<temporary-or.trk>
```

The recovered log reported effective `random_seed=0`, but the recovered successful command did not pass a random-seed option. The required replay likewise omits one; record 0 as an observed executable default, not controlled input. `--log` selects a separate temporary stdout/stderr file in the generated wrapper.

The manifest and replay evidence must record the DSI binary filename, exact bytes and SHA-256, size, Mach-O architecture, OS/kernel, acquisition/source record if recoverable, DSI license record, exact version as `unknown` unless the user-run binary emits defensible version evidence, every explicit argv value, and all effective defaults/warnings recovered from the execution log. The executable hash identifies this surviving artifact; it is not presented as a generally reacquirable software version.

For both registered and replayed TrackVis files, these header fields are mandatory and exact: little-endian version 2, header size 1000, dimensions `[160,200,160]` int16, voxel sizes `[1,1,1]` float32, origin `[0,0,0]` float32, raw `vox_to_ras` float32 rows `[[-1,0,0,79.5],[0,-1,0,81.5],[0,0,1,-72],[0,0,0,1]]`, `voxel_order=b'LPS'`, image orientation `[1,0,0,0,1,0]`, empty invert/swap flags, zero scalars, zero properties, and nibabel 5.4.2 effective float64 affine `[[-1,0,0,80],[0,-1,0,82],[0,0,1,-72.5],[0,0,0,1]]`. Compare integer/byte fields exactly and numeric arrays with `np.array_equal` after conversion to the declared dtype. Any mismatch is class 4. `nb_streamlines` is 223 for the recovered OR reference and 200,000 for the recovered SWM reference; a fresh replay count mismatch is class 3 unless fixed post-processing cannot produce the required shape, which is class 4. Unused reserved/name/padding bytes are covered by whole-file byte hashes but diagnostic for decoded classification.

Post-processing:

1. parse the resulting TrackVis file through nibabel’s effective RAS+ world-millimetre decoding and immediately convert point arrays to C-contiguous NumPy float64;
2. compute `segment_lengths = np.linalg.norm(np.diff(points, axis=0), axis=1)` in float64; construct cumulative distance exactly as `d = np.concatenate((np.array([0.0], dtype=np.float64), np.cumsum(segment_lengths, dtype=np.float64)))` and set `total = d[-1]`; arc-length resample to 64 float64 points using `u = np.linspace(0.0, total, 64, dtype=np.float64)` and `np.column_stack([np.interp(u, d, points[:, k]) for k in range(3)])`. A zero `total` repeats its first point; otherwise repeated cumulative-distance entries are passed directly to pinned `np.interp` and covered by a fixture;
3. round every resampled coordinate with Python `round(value, 2)` before the exclusion rule;
4. identify the V1 endpoint as the lower-MNI-y rounded endpoint; an exact y tie selects the first stored endpoint, matching the recovered procedure without implying biological direction;
5. store the fixed recovered project centroid as `np.array([-12.3, -92.7, 1.1], dtype=np.float64)`; compute distance exactly as `np.linalg.norm(np.asarray(v1_endpoint, dtype=np.float64) - centroid)` under the locked NumPy build and retain distance `<= 18.0` mm, removing exactly three of 223 streamlines from the registered recovered intermediate;
6. preserve retained fibre order and emit the 220 left fibres with exact current metadata/key order;
7. require current byte/geometry hashes and document that runtime `src/main.js` mirrors each point by `x → -x` in the same fibre/point order to display the right side. The JSON generator must not materialize a second right-side dataset.

### Superficial white matter

Inputs: exact HCP-1065 FIB and exact TemplateFlow 2009c WM/GM parents.

Preparation:

1. derive `(WM > 0.5) & binary_dilation(GM > 0.5, structure=connectivity_one, iterations=4, border_value=0)` using strict `>` comparisons;
2. require finite, shape-compatible parents with matching world matrices; retain the WM affine and set matching qform/sform code 4;
3. require exact binary support, affine/form equality, and the recovered seed hash.

Printed DSI command:

Freeze this exact argv token order, with absolute paths substituted and no random-seed flag:

```text
<binary>
--action=trk
--source=<ICBM152_adult.1mm.fz>
--seed=<swm_shell_mni.nii.gz>
--tract_count=200000
--min_length=8
--max_length=80
--turning_angle=50
--step_size=0.5
--thread_count=8
--output=<temporary-swm.trk>
```

The recovered effective random seed is recorded as observed default 0, not a controlled argv option. `--log` selects a separate temporary stdout/stderr file in the generated wrapper.

Apply the same binary identity, environment, explicit/effective-parameter, warning, version-unknown, and license-evidence requirements as the OR replay.

Post-processing:

1. detect gzip magic even when the filename ends in `.trk`, classify compressed and decompressed bytes separately, parse TrackVis through nibabel’s effective RAS+ world-millimetre decoding, and immediately convert point arrays to C-contiguous NumPy float64;
2. load GM values and all affine/inverse-affine arithmetic as float64; derive the endpoint ribbon as `binary_dilation(GM > 0.40, structure=connectivity_one, iterations=1, border_value=0)`;
3. map each unrounded float64 endpoint by `inverse_affine @ [x,y,z,1.0]`, then apply `int(round(float(component)))` independently—CPython nearest-even behavior—to each voxel component; reject out-of-bounds indices and keep only contours whose two endpoints index true ribbon voxels;
4. compute `segment_lengths = np.linalg.norm(np.diff(points, axis=0), axis=1)` and `length = segment_lengths.sum(dtype=np.float64)` under the locked NumPy build; retain the inclusive range `8.0 <= length <= 55.0` mm in source order;
5. arc-length resample every retained contour to eight points with the same float64 cumulative-distance/`np.linspace`/`np.interp` algorithm as OR; define its local-position point with exactly `np.mean(resampled_points, axis=0, dtype=np.float64)`;
6. build `scipy.spatial.cKDTree(float64_centres, leafsize=16, compact_nodes=True, copy_data=False, balanced_tree=True, boxsize=None)` over the full retained population before sampling; call `query_ball_point(centre, r=7.0, p=2.0, eps=0, workers=1, return_sorted=True)`, then explicitly sort returned integer indices ascending. The result includes the selected contour itself and all centres at distance `<= 7.0`, so it cannot be empty; compute `lloc` exactly as `np.mean(retained_lengths[np.asarray(indices, dtype=np.int64)], dtype=np.float64)`;
7. obtain sample indices as the first 15,000 entries of `np.random.default_rng(0).permutation(retained_count)` and preserve that sampled order;
8. round output coordinates, `len`, and `lloc` with Python `round(value, 1)`—0.1 mm/value precision, matching the current asset;
9. emit exact current metadata/key order and require current byte/geometry/length hashes.

## DSI replay gate

Approval `brain-atlas-yw7` requires both user-run replays before closeout; both are complete and retain their frozen OR class-4 and SWM class-3 outcomes. Decision `brain-atlas-3ct` governs only the exact legacy closeout exception described above and in the correction plan.

The implementation must first generate and validate the OR masks and SWM seed. Then it must present the user with two exact commands produced by `dsi-command`. The agent must not run either command.

The commands must:

- verify the selected DSI binary hash before printing and embed execution-time shell checks for the binary and every input immediately before launch, mitigating print-to-execution drift;
- use only explicit absolute paths supplied by the user/agent;
- write into a new temporary replay directory;
- preserve complete stdout/stderr logs for focused extraction;
- never overwrite recovered inputs, checked assets, or prior evidence.

The canonical DSI invocation hash is SHA-256 over ASCII domain separator `brain-atlas/dsi-argv/v1\0`, `uint64_be(token_count)`, then for each exact argv token—including absolute binary as token 0—`uint64_be(utf8_length)` and UTF-8 token bytes in the frozen order above.

The printer requires absolute UTF-8 binary/input/output/log paths; output and log must be distinct nonexistent paths with the same existing parent. That parent must be a newly created, empty, nonsymlink directory by `lstat` when the printer runs. It emits a Bash wrapper to stdout only. The wrapper is UTF-8, LF-only, has one final newline, never launches from Python, and is frozen byte-for-byte by `test/asset-pipeline.test.js`; normative v2 rendering lives in `tools/assets/dsi.py` and `tools/assets/SPEC.md`.

Wrapper v2 preserves the binary/FIB/prepared-input check order, rejects existing output/log with status 73, and checks each exact SHA-256 with status 74. After successful checks it writes one fixed-order receipt header containing UTC start, canonical working directory, OS/kernel/machine/Bash identity, declared thread-related environment values, check count, and every execution-time check hash. DSI stdout/stderr appends after the body marker without a pipeline; `$?` is captured immediately. A fixed footer records UTC end and child status. Newline/carriage-return receipt values fail. A log reporting `not used/recognized` makes the wrapper fail with status 64 even when DSI returned zero. Exact quoting uses CPython 3.13.1 `shlex.quote`/`shlex.join`; the complete script hash is recorded.

Evidence v2 must validate against `replay-evidence.schema.json` and record wrapper version/hash, invocation hash and exact argv, executable identity, explicit-versus-effective random seed and thread count, execution-time input hashes, verifier environment/commit, execution working directory and OS/runtime/thread environment, receipt start/end/status, effective parameters/warnings, raw/compressed/decompressed TrackVis hashes, order-sensitive and orientation/order-invariant decoded hashes, full-log hash and retained external path, post-processed output hash, and one frozen equality class. `replay-evidence-v1.schema.json` remains the immutable validator for retained legacy evidence; missing v1 fields are unavailable and are never backfilled. Commit only compact, non-secret excerpts and summaries. Preserve complete logs and replay outputs outside Git until the user separately authorizes deletion.

After the user runs each command, the agent validates:

1. container and decompressed TrackVis hashes;
2. header, affine/decoding, streamline and point counts;
3. order-sensitive and order-insensitive decoded streamline hashes;
4. OR source/endpoint assignment and exclusion-rule metrics, or SWM endpoint/range metrics;
5. exact post-processed current output hash;
6. expected DSI warnings and effective parameters from the replay log.

Apply the frozen equality contracts and consequences above. Do not decide tolerance or equality after observing output. Container-only variance is distinct from decoded geometry; decoded collection-order or contour-reversal drift is class 2, not byte equality. Class 2 or 3 requires a Beads-backed human closeout decision; class 4 ordinarily blocks closeout and always blocks replacement. Exact-scope decision `brain-atlas-3ct` is the sole non-precedential closeout exception and does not change the observed class or authorize any divergence to replace public data.

## Test-driven implementation sequence

### Phase 1 — manifest and safety contract

1. Add failing `test/asset-pipeline.test.js` cases for manifest schema, current output hashes, no absolute recovered paths, stable HTTPS source URLs, source/license/checksum completeness, coordinate declarations, and DSI non-execution.
2. Add `manifest.schema.json`, `manifest.json`, `requirements.in`, hash-complete `requirements.lock`, package skeleton, and `check-manifest`/`verify-current` until tests pass.
3. Write the normative `tools/assets/SPEC.md` equality framing, serializers, numerical APIs, environment preflight, DSI evidence schema, and literal hash fixtures before any generator replay; test the fixtures independently.
4. Verify existing provenance records and current public outputs remain unchanged.

### Phase 2 — cortex and region builders

1. Add focused failing tests for affine/form rejection, unsafe output roots, manifest-order output, bilateral Jülich label handling, and exact expected outputs.
2. Implement shared safe I/O plus cortex and region modules.
3. Replay both builders from exact parents into temporary directories.
4. Compare GLB, `regions.json`, and all 90 OBJs byte-for-byte and structurally.

### Phase 3 — association builder

1. Add failing tests for stable archive member mapping, gzip detection, TrackVis decoding, seeded sampling, zero-length resampling handling, legacy storage-order disclosure, and exact output metadata.
2. Implement with `zipfile`, `gzip`, nibabel, and the shared resampler.
3. Replay from the complete official archive; require exact current byte and geometry hashes.

### Phase 4 — OR and SWM preparation/post-processing

1. Add failing tests for exact mask/seed derivation, NIfTI forms, threshold rules, gzip/plain TRK handling, geometric endpoint selection, neutral exclusion wording, SWM ribbon/length rules, deterministic sampling, `len`, and `lloc`.
2. Implement preparation and post-processing modules.
3. Replay against hashed recovered intermediates and require exact current outputs.
4. Confirm no public asset changed.

### Phase 5 — command printer and manual DSI replay

1. Add failing tests proving `dsi-command` verifies the binary/input hashes, shell-quotes paths, prints only, and has no DSI subprocess path.
2. Implement and inspect both generated commands.
3. Ask the user to run OR, then validate before asking for SWM.
4. Ask the user to run SWM, then validate.
5. Record schema-validated compact replay results and deviations; preserve full log/output hashes and external retention paths, but do not retain raw third-party output in Git or delete it without approval.

### Phase 6 — documentation, review, and closeout

1. Reconcile and review the already normative `tools/assets/SPEC.md` against the implementation; do not introduce or relax an equality rule after replay.
2. Update `README.md`, `AGENTS.md`, `docs/ARCHITECTURE.md`, `docs/TRACT_SPACE_PROVENANCE.md`, `docs/SCIENTIFIC_TRACEABILITY.md`, and `DATA_LICENSES.md` only where the new checked pipeline changes current traceability or contributor instructions.
3. Verify every source’s current original terms and derivative-distribution obligations, complete the source-to-output rights matrix, and update `DATA_LICENSES.md` atomically. Update `THIRD_PARTY_NOTICES.md` only if a shipped software/tool notice is required; pinned offline build dependencies are not browser/runtime dependencies, but their licenses must be reviewed and documented. Any unknown or incompatible right blocks closeout and requires a human decision.
4. Record a specific no-impact rationale for lesson content, runtime behavior, security boundary, `CITATION.cff`, screenshots, and public controls unless inspection shows an impact.
5. Run independent scientific/reproducibility and implementation/data-contract reviews.
6. Resolve every verified finding, perform low-risk simplification, run fresh verification, mark this plan Implemented, update Beads evidence, create a verified SSH-signed local commit, and close `brain-atlas-yum.6`.
7. Do not push, create a PR, deploy, publish, merge to local `main`, delete the branch, or delete protected temporary/review artifacts without separate approval.

## Verification matrix

Minimum fresh closeout evidence:

```bash
npm test
npm run generate:lesson-validators
npm test
npm run build:publish
npm audit
npm audit --omit=dev
git diff --check
```

Offline pipeline checks:

```bash
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python -m tools.assets check-manifest
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python -m tools.assets verify-current --repo .
```

Run all seven preparation/build/post-processing paths into temporary directories and compare exact bytes plus structural metrics. Rerun the existing `brain-atlas-yum.5` pinned provenance verifier and require identical checked results.

Browser regression after documentation/asset-integrity checks:

- Firefox and Chromium, wide and compact;
- one canvas;
- 15,000 SWM dots;
- 16 association groups;
- 440 bilateral OR endpoints;
- determinant +1 and unit-scale runtime basis;
- exact stage aspect and no horizontal overflow;
- updated Model & sources provenance text;
- animation-continuity regression;
- production-preview fallback matrix;
- zero console/page errors.

Because no public asset or runtime code is intended to change, any browser visual or metric difference is a release-blocking regression.

## Failure modes and controls

| Failure | Control |
|---|---|
| A source URL changes or serves different bytes | Stable URL plus byte count/SHA-256; fail before parse. |
| A recovered absolute path leaks into Git | Manifest/path tests reject absolute source/output paths and scratchpad identifiers. |
| A builder overwrites checked assets | Explicit empty output root; no automatic `public/` replacement. |
| A malformed NIfTI/TRK/JSON is partially consumed | Hash first, then established parser and structural validation. |
| TrackVis LPS metadata is misdescribed as stored axes | Use nibabel effective RAS+ world-millimetre decoding and preserve the `brain-atlas-yum.5` wording. |
| Fibre array order is presented as biological direction | Manifest and tests label OR geometric endpoint classification and association legacy storage order separately from biology. |
| DSI is launched from the agent | Printer-only architecture, static tests, explicit user handoff. |
| DSI replay differs because of gzip metadata or thread order | Apply the frozen equality classes; exact decoded order drift requires a new human closeout decision rather than an after-the-fact tolerance. |
| DSI replay differs geometrically | Stop, preserve classes/assets, and request a versioned decision. Only exact-scope `brain-atlas-3ct` permits closeout without replacement for the recorded legacy hashes; it is not reusable. |
| Pinned package output differs across platforms | Use CPython 3.13.1, uv 0.9.30, a complete hash lock, and the recorded Darwin arm64 environment for byte claims; record structural/semantic checks elsewhere and do not replace assets from an unverified platform. |
| Region editorial selections remain hidden in code | Put every source label and display parameter in the manifest. |
| Full third-party data or unrelated recovered transcript is committed | Compact registries/results only; raw inputs stay external. |
| Source terms do not clearly permit a public derivative | Block closeout; complete the source-to-output rights matrix and obtain a human decision rather than inferring permission from non-redistribution of raw data. |
| Right OR appears independently tracked | Keep 220 left fibres in JSON, validate runtime `x → -x` mirroring/order and Mirrored disclosure, and leave independent right geometry to `brain-atlas-yum.7`. |

## Acceptance checklist

- [x] Manifest schema and manifest cover all five asset classes, exact sources, source-to-output derivative rights, hashes, mixed-template spaces/affines, tools, explicit versus observed-default parameters, intermediates, and outputs.
- [x] No unstable signed URL, hidden hard-coded source path, or implicit network fetch remains.
- [x] Cortex builder reproduces the current GLB exactly and validates structure.
- [x] Region builder directly consumes the hashed Jülich v3.0.3 MPM and reproduces `regions.json` plus 90 OBJs exactly.
- [x] Association builder consumes the full stable archive through standard parsers and reproduces current corrected output exactly.
- [x] OR preparation and recovered-intermediate post-processing reproduce masks and current output exactly.
- [x] SWM preparation and recovered-intermediate post-processing reproduce seed and current output exactly, including `len` and `lloc`.
- [x] DSI command printer cannot launch DSI and both commands are manually replayed by the user.
- [x] DSI replay results use the frozen byte/decoded/metric equality algorithms and unchanged classes; OR class 4 and SWM class 3 are linked to exact-scope, non-precedential decision `brain-atlas-3ct`, which authorizes closeout only after the correction-plan gates and never authorizes replacement.
- [x] Current public asset coordinates and one runtime transform remain unchanged; OR JSON remains 220 left fibres and the existing mirrored runtime right side is explicitly validated/disclosed.
- [x] CPython 3.13.1/uv 0.9.30 and the complete hash-locked environment are recorded; lightweight tests, heavy replay checks, provenance verifier, full Node suite, build, audits, browser matrix, and production checks pass.
- [x] Scientific/reproducibility and implementation reviews have no unresolved verified findings.
- [x] Current documentation, licenses, traceability, and Beads evidence are synchronized.
- [x] Verified SSH-signed local pipeline commit exists; that pipeline commit is not merged, pushed, deployed, or published, and its branch/worktree remains in place.

## Approval and implementation gates

The plan is **Approved** under `brain-atlas-yw7` and amended under exact-scope legacy decision `brain-atlas-3ct`. Gemma 4 31B passed the original implementation review, the original subscription-backed GPT-5.6 scientific/reproducibility review passed, and the corrected DSI exception plan passed final GPT-5.6 review with no findings at `.pi/reviews/reproducible-asset-pipelines/dsi-nondeterminism/gpt56-correction-plan-r3.md`.

The user-requested branch-freshness gate was cleared on 2026-07-22. The agent found the clean separate worktree `feature/zmq-8-anatomy-selection-inspector` at signed commit `127e7331c75643997168d0bee86b37b670fabea8`, verified 139/139 Node tests and `npm run build:publish`, fast-forwarded local `main` from `e68830ecd190f42fac4d553607d15bd4e89ef76d` without conflicts, then fast-forwarded `chore/reproducible-asset-pipelines` to the same commit. The other worktree and branch were preserved. At that integration gate, `origin/main` remained `b5677aba3bec3f86b252e748b3b2e59296ae7df1`; protected untracked plan hashes remained unchanged.

The repository owner later approved the separate early-preview deployment under `brain-atlas-sc2`. Local and remote `main` advanced to signed lesson commit `d76878226e68fc7e7c09f585635c8838fd0de83a`. Before pipeline work resumed, this branch fast-forwarded to that commit without overlap, then moved with its uncommitted files into `~/Projects/brain-atlas-worktrees/chore/reproducible-asset-pipelines`; 34 meaningful file hashes/modes and 17/17 focused tests passed after migration. The unrelated `brain-atlas-zmq.22` Draft stayed in the primary checkout. No pipeline work was pushed, merged, deployed, or published.

Before the first test/code edit, the agent re-read the Bead, this approved plan, and the integrated repository instructions and subsystem specifications.

Material changes to source identity, coordinate semantics, output geometry, DSI replay requirements, or automatic replacement behavior require a new Beads-backed human decision.
