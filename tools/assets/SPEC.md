# Offline anatomical asset pipelines

## Purpose

`tools/assets/` reproducibly prepares and regenerates the cortical shell, Jülich region meshes, named association tracts, and volumetric per-contour endpoint classifications shipped by Brain Atlas. For optic radiation and superficial white matter, it exactly prepares inputs and reproduces current JSON from registered recovered TrackVis intermediates; it does not claim deterministic upstream DSI retracking. Endpoint classification consumes those exact checked display contours plus the original categorical Jülich MPM and changes no geometry. Runtime coordinate semantics remain unchanged.

This subsystem is offline-only. It never downloads implicitly, launches DSI Studio, writes into `public/`, adds a runtime transform, or treats streamline order as biological polarity. Exact source identities, parameters, licenses/terms, rights determinations, intermediates, outputs, and limitations live in `manifest.json`.

## Core mechanism

1. A lightweight standard-library boundary validates the manifest and checked outputs.
2. Heavy builders run only in a hash-locked CPython 3.13.1 environment.
3. Every external input is selected by manifest ID and canonical filename, then byte-counted and SHA-256 checked before parsing.
4. Builders write into explicit new empty output directories.
5. Outputs are compared by frozen byte, tree, decoded-geometry, payload, and structural contracts.
6. Endpoint classification maps the two stored geometric ends of each checked association/SWM contour to the nearest local nonzero volumetric MPM label in common RAS world millimetres, retaining known, ambiguous, and unknown outcomes without inferring polarity.
7. Optic-radiation and SWM tracking are exceptional human-run DSI replays. Agent code only prepares inputs, prints a hash-checking shell script, and validates returned artifacts.

**Key files**

- `manifest.schema.json` — machine-readable manifest shape.
- `manifest.json` — source/parameter/tool/output/rights authority.
- `requirements.in` / `requirements.lock` — direct pins and hash-complete resolution.
- `cli.py` — argument parsing and command dispatch.
- `common.py` — hashes, safety checks, serializers, environment preflight, and shared numerical primitives.
- `cortex.py`, `regions.py`, `association.py`, `endpoints.py`, `optic_radiation.py`, `swm.py` — asset-specific offline algorithms.
- `test/asset-pipeline.test.js` — independent contract and integration checks.

## Public interface

Invoke from the repository root:

```bash
uv run --python 3.13.1 --offline \
  --with-requirements tools/assets/requirements.lock \
  python -m tools.assets <command> ...
```

| Command | Contract |
|---|---|
| `check-manifest` | Validate schema/semantics/references/rights and the lock identity without network access. |
| `verify-current --repo <path>` | Verify exact current files, region tree, metadata, geometry payloads, and runtime mirror disclosure without regeneration. |
| `build cortex` | Generate the cortical GLB from the exact TemplateFlow brain mask. |
| `build regions` | Generate 90 OBJ files and `regions.json` from the exact Jülich MPM. |
| `build association` | Generate `tracts.json` from the complete exact HCP-1065 archive. |
| `build endpoints` | Generate `fibre_endpoints.json` from the exact categorical Jülich MPM plus hash-frozen checked association/SWM/catalog/preset inputs. The command requires explicit `--inputs`, `--repo`, and new empty `--output`; it never writes into `public/`. |
| `prepare optic-radiation` | Generate exact V1/LGN binary NIfTIs. |
| `dsi-command optic-radiation` | Print, but never execute, the exact OR replay wrapper. |
| `postprocess optic-radiation` | Produce current left-only OR JSON from a verified TrackVis intermediate. |
| `prepare swm` | Generate the exact SWM seed NIfTI. |
| `dsi-command swm` | Print, but never execute, the exact SWM replay wrapper. |
| `postprocess swm` | Produce current SWM JSON from verified parents/intermediate. |
| `verify-replay <asset>` | Apply frozen TrackVis headers, hashes, metrics, output checks, and closeout class. |

All commands fail closed with a nonzero status. JSON reports contain no raw third-party data.

## Invariants

| ID | Invariant | Enforcement |
|---|---|---|
| INV-1 | The subsystem is one focused package with a schema, manifest, lock, spec, CLI, common primitives, and asset modules. | Structural test. |
| INV-2 | `manifest.json` inventories every source, derived/recovered intermediate, tool, pipeline, output, coordinate frame, rights decision, obligation, and known limitation. Unknown/incompatible rights block closeout. | Schema, semantic validation, review. |
| INV-3 | External inputs are explicit, nonsymlink files with expected canonical names, sizes, and SHA-256 values. Hashing happens before structured parsing. No implicit fetch or recovered absolute path exists. | Shared input resolver and tests. |
| INV-4 | Equality uses the frozen algorithms below. Metrics never become equality. | Literal independent fixtures and current-asset oracles. |
| INV-5 | Builders accept only explicit new empty nonsymlink output roots, reject unexpected files, and never target or copy into `public/`. | Shared output guard and failure tests. |
| INV-6 | Byte-exact mode requires the recorded Darwin arm64 platform, uv/CPython identities, lock hash, complete runtime tree hash, and every direct/transitive distribution version/tree hash. A mismatch aborts before scientific input parsing. | Environment preflight and fixtures. |
| INV-7 | Anatomy is MNI152NLin2009cAsym RAS mm; association is ICBM 2009a Nonlinear Asymmetric RAS+ mm; OR/SWM is decoded nonlinear ICBM152 2009a RAS+ mm with variant uncertainty. No 2009a→2009c warp or voxel-grid equivalence is claimed. | Manifest, format checks, docs review. |
| INV-8 | DSI Studio is never launched by agent code or tests. `dsi-command` only emits a canonical hash-checking wrapper with exact argv; the user runs it outside the agent shell. | Static import/call test and command fixtures. |
| INV-9 | Writers follow the frozen output-specific contracts below. Whole-file hashes are final. | Writer fixtures and exact current outputs. |
| INV-10 | Generated outputs never replace checked assets automatically. Any divergence follows the frozen replay classes and Beads gates. | CLI design and review. |
| INV-11 | The numerical algorithms and equality predicates are fixed before manual replay and may not be relaxed after observing output. | This spec, review, Git/Beads history. |
| INV-12 | Runtime remains one proper transform. OR JSON contains 220 left fibres; `src/main.js` supplies the disclosed right `x → -x` mirror without changing fibre/point order. | Current-output/runtime structural tests. |
| INV-13 | Endpoint classification uses the original Jülich v3.0.3 categorical MPM, exact checked displayed fibre order, and one frozen 2.0 mm nearest-nonzero/0.5 mm distinct-label ambiguity rule in RAS world millimetres. It emits only stable project region IDs or explicit ambiguous/unknown status; stored endpoint A/B is unordered geometry, probability is unavailable, and no streamline polarity, termination, connection strength, shared voxel grid, or template warp is inferred. | Synthetic classifier tests, exact generation, artifact/current-output validation, preset-count drift tests, and scientific review. |

## Equality contracts

### Byte and tree equality

- **Byte equality:** lowercase SHA-256 of exact file bytes.
- **Region-tree hash:** process files in ascending UTF-8 POSIX-relative-path byte order. For each file hash `uint32_be(path_length)`, path bytes, `uint64_be(file_length)`, then file bytes. Missing, extra, duplicate, or symlink entries fail.
- Empty-tree literal: `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855`.

### Current JSON geometry payloads

Match the existing UTF-8 SHA-256 of JavaScript `JSON.stringify` over these ordered values:

- association: `tracts`;
- OR: `{n,np,fibres}`;
- SWM: `{n,np,len,lloc,fibres}`.

Metadata is excluded only from these geometry hashes and remains covered by whole-file bytes.

### Decoded TrackVis order hash

Hash ASCII `brain-atlas/trk-order/v1\0`, `uint64_be(streamline_count)`, then each streamline as `uint64_be(point_count)` followed by contiguous point/xyz little-endian IEEE-754 float64 bytes. Reject non-finite values.

Empty literal: `509e3f33ab13ebce2dcc4ed882238af0411452e1718a69f9c41c36c369fbccc6`.

### Decoded TrackVis orientation/order-invariant multiset

Encode each contour in both point orders as above, choose the lexicographically smaller full encoding, and SHA-256 it. Sort raw 32-byte item digests while retaining duplicates. Hash ASCII `brain-atlas/trk-multiset/v1\0`, `uint64_be(streamline_count)`, then sorted digests. This removes storage order and contour reversal only; it does not confer biological direction.

Empty literal: `4f81276d937f5915a080bb4c6b6f433b46400a9ffcf447a6ce0da5d1f95c5e9f`.

`common.contract_fixture_hashes()` supplies the complete independently frozen empty, one, reversed, reordered, and duplicate vectors used by `test/asset-pipeline.test.js`.

### Replay classes

1. `byte-exact`: container and decoded order hash match.
2. `decoded-exact-order-drift`: container/order differs but decoded multiset matches.
3. `metric-only`: exact decoded geometry differs; counts/bounds/endpoints/lengths remain diagnostics only.
4. `materially-different`: parse/non-finite/effective-affine failure, or fixed post-processing cannot produce OR `220×64×3` or SWM `15000×8×3` plus matching length arrays.

Only class 1 with exact current post-processing can ordinarily close without another decision. Class 2/3 requires a Beads-backed decision, and class 4 ordinarily blocks closeout. Exact-scope decision `brain-atlas-3ct` is the sole non-precedential exception: it preserves the observed OR class 4 and SWM class 3 results, permits this legacy pipeline task to close after all evidence and documentation gates pass, and authorizes no class promotion or public-asset replacement. Any other artifact or evidence hash requires a new decision.

## Environment-tree framing

Hash ASCII `brain-atlas/environment-tree/v1\0`, then lexical entries below the declared root in ascending UTF-8 POSIX path-byte order.

- Use `lstat`; never resolve before classifying.
- `os.walk(..., followlinks=False)` never descends directory symlinks.
- Reject paths or link targets that do not decode as strict UTF-8 or escape the root lexically/through link-target normalization.
- Regular file: `F`, `uint32_be(path_length)`, path, `uint64_be(file_length)`, bytes.
- Symlink: `L`, framed path, `uint32_be(target_length)`, exact UTF-8 `readlink` bytes.
- Directories are implicit; devices/sockets fail.
- Ignore only `__pycache__` directories and `.pyc` files.
- uv 0.9.30 exposes `--with-requirements` packages from a content-addressed archive outside its ephemeral `sys.prefix`, while declared console scripts may be `../../../bin/...` from `locate_file('')`. Package trees therefore use only `importlib.metadata.Distribution.files`, compute a lexical installation root with `os.path.commonpath` over `locate_file('')` and all located declared entries, enforce containment without resolving symlinks, and frame paths relative to that root without embedding machine paths.

Literal fixtures cover empty, regular file, file symlink, directory symlink, non-UTF-8, and escape rejection.

## Writer contracts

- **compact fibre JSON:** CPython 3.13.1 `json.dumps`, UTF-8, `ensure_ascii=False`, `allow_nan=False`, insertion-order keys, separators `(', ', ': ')`, no trailing newline.
- **compact endpoint JSON:** CPython 3.13.1 `json.dumps`, UTF-8, `ensure_ascii=False`, `allow_nan=False`, insertion-order keys, separators `(',', ':')`, no trailing newline. Entity/status/candidate tables are indexed by fixed four-integer endpoint tuples; each fibre stores exactly two tuples in source array order. Every preset audit balances included association/SWM/L/R totals, included known/unknown/ambiguous fibre quality, and full-population quality.
- **`regions.json`:** UTF-8, `ensure_ascii=True` (matching the current file's `\\u2192` escapes), `allow_nan=False`, insertion order, `indent=1`, LF, no trailing newline.
- **OBJ:** array order; `v {x:.1f} {y:.1f} {z:.1f}\n`, then one-indexed `f {a} {b} {c}\n`; final newline.
- **NIfTI:** fresh little-endian `Nifti1Image(uint8_array, affine)`, no copied header/extensions; `set_sform(affine, code=4)` then `set_qform(affine, code=4)`; nibabel 5.4.2 default deterministic gzip writer.
- **GLB:** trimesh 4.12.2 `Trimesh(vertices=v2, faces=f2, process=True)`, `fix_normals()`, then one positional `mesh.export(output_path)` call where the suffix is `.glb`.

Fixtures cover non-ASCII/escaping, negative zero, integer-like floats, scientific notation, insertion order, newline policy, NIfTI header/container bytes, and a tiny GLB.

## Numerical contracts

### Shared contour resampling

Convert points to C-contiguous float64. Compute:

```python
segment_lengths = np.linalg.norm(np.diff(points, axis=0), axis=1)
d = np.concatenate((np.array([0.0], dtype=np.float64),
                    np.cumsum(segment_lengths, dtype=np.float64)))
total = d[-1]
u = np.linspace(0.0, total, point_count, dtype=np.float64)
out = np.column_stack([np.interp(u, d, points[:, k]) for k in range(3)])
```

Zero total repeats the first point. Repeated cumulative distances use pinned `np.interp` behavior.

### Cortex

Float32 C-contiguous brain mask; SciPy 1.18 `gaussian_filter(sigma=1.2, order=0, output=None, mode='reflect', cval=0.0, truncate=4.0, radius=None, axes=None)`; scikit-image 0.26 `marching_cubes(level=0.5, spacing=(1,1,1), gradient_direction='descent', step_size=1, allow_degenerate=True, method='lewiner', mask=None)`; float64 affine application; fast-simplification 0.1.13 toward 80,000 faces with `agg=7.0, verbose=False, return_collapses=False, lossless=False`; frozen GLB writer.

### Regions

Manifest label order; right label is left + 1000. Float32 equality mask, constant pad 2, Gaussian sigma 0.6, marching-cubes contract above, subtract pad, float64 affine, simplify only above 6,000 faces with the same simplifier options, then frozen OBJ/JSON writers. Produce exactly 90 meshes.

### Association

Archive/tract/hemisphere order comes from the manifest. One `np.random.default_rng(0)` spans all 16 groups. Select `rng.permutation(count)[:min(180,count)]`, resample to 40 points, reverse only when resampled first y > last y, and Python-round coordinates to one decimal. The reversal is non-biological storage history.

### Fibre endpoints

Load the exact categorical MPM with matching nonzero qform/sform and use its selected affine to transform every nonzero voxel centre into RAS world millimetres. Build one `cKDTree` over those centres. For each displayed, rounded contour endpoint, find the nearest nonzero centre and the minimum distance for every distinct label within 2.5 mm. The endpoint is outside support when the nearest centre exceeds 2.0 mm; it is ambiguous when a second distinct label is within 0.5 mm of the nearest label distance; it is unknown when the winning label has no project region entity. Otherwise it is known-direct when nearest-grid sampling gives the same label and known-nearest for the local fallback. Unsupported labels are never coerced to supported entities. Distances are rounded to integer hundredths of a millimetre; the categorical MPM supplies no probability.

Association traversal is manifest tract order, then L/R, then checked fibre order. SWM order is unchanged and hemisphere remains the sign of mean contour x, matching runtime. Preset geometry and selected/population quality counts are computed from the separately hash-frozen authored preset catalog. `touches-any` accepts either stored endpoint, `connects-within` requires both in one set, and `connects-between` is symmetric under A/B reversal. Unknown and ambiguous classes match only their explicit special selectors.

### Optic radiation

V1 is finite parent `>= 0.25 * max`; LGN is finite parent `>= 0.10 * max`; no dilation. Resample recovered/replayed TrackVis to 64 points, Python-round to two decimals, choose lower-y rounded endpoint as V1 (tie: stored first), and retain float64 `np.linalg.norm(endpoint - [-12.3,-92.7,1.1]) <= 18.0`. Preserve retained order and emit 220 left fibres.

### SWM

Seed is `(WM > 0.5) & binary_dilation(GM > 0.5, connectivity-one, iterations=4, border_value=0)`. Endpoint ribbon is one-iteration dilation of `GM > 0.40`. Map each unrounded endpoint through float64 inverse affine and CPython nearest-even `int(round(float(component)))`; reject out of bounds. Length is `np.linalg.norm(np.diff(points,axis=0),axis=1).sum(dtype=np.float64)`; retain inclusive 8–55 mm. Resample to eight points. Centre is float64 mean. Build default-configured cKDTree as fixed in the manifest, query radius 7 with one worker and sorted indices, explicitly sort indices, and float64-mean full-population neighbour lengths. Select first 15,000 of `default_rng(0).permutation(count)`. Python-round points/`len`/`lloc` to one decimal.

## DSI printer and evidence

The exact OR/SWM argv token order is stored in `manifest.json`; neither contains a random-seed flag. The recovered effective seed 0 is an observed executable default, not controlled input.

The printer accepts absolute UTF-8 paths only. Output/log are distinct nonexistent paths sharing one newly created empty nonsymlink parent. It verifies the registered binary and all inputs before printing. Its v2 Bash wrapper:

- starts `#!/bin/bash` and `set -u`;
- uses `/usr/bin/shasum -a 256 --` with explicit failure status 74;
- rejects existing output/log with status 73;
- writes one strict receipt around DSI output, including UTC start/end, child exit status, canonical working directory, OS/kernel/machine/Bash identity, five declared thread-related environment values, and the execution-time check hashes;
- redirects DSI stdout/stderr by append into the requested receipt log without a pipeline;
- captures `$?` immediately, records it, and returns it;
- returns status 64 when the completed log says an option was not used/recognized;
- rejects newline/carriage-return receipt values, is UTF-8 and LF-only, and ends in one newline.

The invocation hash remains SHA-256 of `brain-atlas/dsi-argv/v1\0`, token count, and length-framed UTF-8 tokens. Evidence schema v2 records wrapper version/hash, exact argv, executable identity, explicit versus effective seed/thread parameters, execution-time input hashes, verifier and execution environments, receipt timing/status, warnings/effective parameters, raw/decompressed/decoded/output hashes, retained external paths, verifier commit, and equality class. `replay-evidence-v1.schema.json` remains immutable for the already retained v1 records; missing v1 fields are unavailable and must never be backfilled.

The retained legacy evidence is fixed: the canonical OR replay produced 216 raw/215 retained fibres and one clean repeat produced 234/233, both against the recovered 223/220 reference, so OR remains class 4. The SWM replay produced 200,000 tracts and the required 15,000-fibre post-processing shape with different decoded geometry and output bytes, so SWM remains class 3. Rejected unused-option diagnostics do not count as compliant runs, and two byte-identical one-thread observations remain non-comparable exploratory evidence. The exact source/build and varying internal stage are unresolved.

Raw outputs/logs stay outside Git. Their owner-only durable archive is `~/.local/share/brain-atlas/replay-evidence/brain-atlas-yum.6-2026-07-22/`; its deterministic manifest is recorded in `.pi/research/2026-07-22-dsi-replay-determinism/`. Retain the archive and original files until `brain-atlas-yum.13` closes, and delete them only after separate owner approval.

## Failure modes

| ID | Symptom | Cause | Required response |
|---|---|---|---|
| FAIL-1 | Source mismatch before parse | Wrong/mutated file or unaccepted terms | Stop; obtain exact source. Never infer from filename. |
| FAIL-2 | Builder sees nonempty/symlink/public output | Unsafe target | Refuse without modifying it. |
| FAIL-3 | Environment preflight differs | Platform/runtime/package drift | Abort byte mode; structural mode cannot replace assets. |
| FAIL-4 | NIfTI forms conflict or TrackVis affine differs | Coordinate ambiguity | Stop as materially different. No fitting/second transform. |
| FAIL-5 | DSI path could execute from Python | Architecture violation | Block implementation and remove execution path. |
| FAIL-6 | Replay differs or its log reports an unused/unrecognized option | Tool/thread/container/geometry/argv drift | Reject unrecognized options before classification; otherwise preserve evidence, apply the fixed class, and request a decision where required. Class 4 blocks replacement even under the exact legacy closeout exception. |
| FAIL-7 | Rights state unknown/incompatible | Derivative terms unresolved | Block closeout and public replacement. |
| FAIL-8 | Generated checked asset differs | Algorithm/environment/source drift | Preserve current asset; diagnose with independent metrics; never auto-replace. |
| FAIL-9 | OR output contains right fibres | Pipeline/runtime boundary drift | Reject; JSON remains left-only and runtime mirror stays disclosed. |
| FAIL-10 | Streamline order described as polarity | Scientific overclaim | Correct metadata/docs; order is storage only. |
| FAIL-11 | MPM forms/hash/labels differ, a repository input drifts, a point is nonfinite, or assignment exceeds/is tied within the frozen local rule | Coordinate/provenance ambiguity | Stop before output. Preserve unknown/ambiguous status where the frozen rule applies; never fit geometry, widen thresholds after viewing, or coerce unsupported labels. |

## Testing

| Spec item | Verification |
|---|---|
| INV-1–4 | `node --test test/asset-pipeline.test.js` contract and literal hashes. |
| INV-5–6 | Temporary-root and environment-tree positive/negative fixtures. |
| INV-7, INV-12 | Manifest, NIfTI/TRK checks, current output hashes, runtime static checks, browser determinant/mirror metrics. |
| INV-13, FAIL-11 | `test/fibre-endpoint-assets.test.js`, exact `build endpoints` regeneration, current-output structure checks, query/preset integrity tests, and scientific review. |
| INV-8 | Static import/call scan plus exact command/wrapper fixtures; DSI is user-run only. |
| INV-9 | Serializer fixtures and byte-exact generator replay. |
| INV-10–11 | CLI tests, Beads evidence, and scientific review. |
| FAIL-1–10 | Named negative tests include `# Tests FAIL-N` traceability comments. |

Minimum closeout runs focused tests, all builders/post-processors in temporary directories, both manual replay validations, the `brain-atlas-yum.5` verifier, full Node/build/audit checks, and Firefox/Chromium development/production regression matrices.

## Dependencies

| Dependency | Role |
|---|---|
| nibabel 5.4.2 | NIfTI and TrackVis parsing/writing. |
| NumPy 2.5.1 | Float64/float32 numerical contracts and seeded sampling. |
| SciPy 1.18.0 | Gaussian filters, morphology, cKDTree. |
| scikit-image 0.26.0 | Lewiner marching cubes. |
| fast-simplification 0.1.13 | Deterministic mesh reduction in verified environment. |
| trimesh 4.12.2 | Cortical GLB processing/export. |
| `docs/TRACT_SPACE_PROVENANCE.md` | Corrected fibre coordinate and recovered-lineage authority. |
| `DATA_LICENSES.md` | Public source terms, notices, and acknowledgments. |
| `AGENTS.md` | One-transform, scientific-honesty, parser, and DSI handoff rules. |
