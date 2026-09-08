# CerebrA isolated environment — acquisition preview

Bead: `brain-atlas-yum.14.10`. Status: metadata inventory verified; no wheels acquired, environment installed, or conversion executed.

## Exact inventory

`wheel-inventory.json` contains all 29 wheel filenames, source URLs, byte counts, SHA-256 digests, declared dependencies and PyPI license metadata.

- Inventory SHA-256: `5c5b4740bbb590e54676016bfb9efc1978a5744668d6648afaa76af00ca04c0a`.
- `requirements.lock` SHA-256: `a5c480544cf69370805d6c6224ecaf530b1dbf7f952db7fa88103dc4d85223cf`.
- Total compressed acquisition: **95,521,611 bytes (91.1 MiB)**, below approved 30-distribution/500-MiB bounds.
- Existing interpreter: `/Users/hays/.local/share/uv/python/cpython-3.13.1-macos-aarch64-none/bin/python3.13`; invoke through `uv`. Host macOS 26.5.1, arm64.
- Root requirements: ANTsPy 0.6.3; nibabel 5.3.2 for established NIfTI parsing; statsmodels restricted to 0.14 series to stay under the approved package cap. Unconstrained statsmodels 0.15 expanded closure beyond 30 packages. No fitting result informed this choice.
- Pins: antspyx 0.6.3, certifi 2026.7.22, charset-normalizer 3.5.1, cloudpickle 3.1.2, contourpy 1.3.3, cycler 0.12.1, fonttools 4.64.0, idna 3.19, joblib 1.6.0, kiwisolver 1.5.1, matplotlib 3.11.1, narwhals 2.25.0, nibabel 5.3.2, numpy 2.3.5, packaging 26.3, pandas 3.0.5, patsy 1.0.3, pillow 12.3.0, pyparsing 3.3.2, python-dateutil 2.9.0.post0, pyyaml 6.0.3, requests 2.34.2, scikit-learn 1.9.0, scipy 1.15.3, six 1.17.0, statsmodels 0.14.6, threadpoolctl 3.6.0, urllib3 2.7.0, webcolors 25.10.0.

## Proposed effects and stop conditions

Create a new private root:
`/Users/hays/.local/share/brain-atlas/cerebra-conversion-yum14-10-2026-09-07/`.

Subdirectories: `wheels/` (approved acquisition), `notices/` (retained licenses), `venv/` (isolated uv environment), `cache/` (bounded installation cache), `receipts/` (identities and verification). Do not reuse an existing nonempty target or delete failed evidence.

Acquire only manifest URLs through the approval-gated download surface. Verify each wheel's bytes and SHA-256 before archive inspection. Read bundled notices and validate actual wheel metadata/dependency closure against inventory before installation. PyPI license fields are retained but are NOT a completed bundled-license review. Unknown or incompatible private-use terms, missing notices, metadata drift, unsupported wheel, source-build fallback, or hash/size drift blocks installation. This approval does not waive those checks.

After those gates, use `uv` with existing Python, offline/no-index, only-binary and require-hashes options to install only retained wheels into `venv/`. No new Python download, global install, source build, base lockfile change or implicit replay network. Record installed distribution-tree hashes and import/dependency smoke checks. Native MINC extraction remains in its separately approved parser environment.

Installation permits third-party native code execution in this private research environment; hash pinning establishes identity, not a security audit. Compressed size is not installed size. Stop if unpacked environment/cache/notices would exceed 2 GiB; do not enlarge limits silently.

Rollback is non-use of this environment; current public assets and runtime remain unchanged. Preserve evidence rather than delete it. No push, deployment, redistribution or anatomical adoption is authorized.

## Verification at preparation checkpoint

Metadata acquired using `agnt web-fetch` from versioned PyPI JSON records, retained in `pypi-metadata/`. Selection/validation used installed packaging parsers under `uv run --no-project --offline --python 3.13.1`; no package install. All 29 selected files independently cross-checked against each release's file table, platform tags, declared active dependency constraints, totals and license-field presence. Lock and inventory hashes above verified.

Initial metadata enumeration rejected invalid historical version `0.3.2d`; exclusion check then passed. Latest dependency closure exceeded package cap and was not acquired. Revised bounded closure converged in five passes. `agnt doctor --json`: no failures; generic missing verification-prerequisite warning, no configuration repair attempted.

Wheel contents, bundled notices, actual imports, scientific conversion and numerical acceptance remain unverified. Public documentation has no current-behavior impact. Existing unrelated `flake.lock`, prior research directory and three root ZIP files remain untouched.
