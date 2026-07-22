"""Shared deterministic asset-pipeline primitives."""

from __future__ import annotations

import hashlib
import importlib.metadata
import json
import math
import os
import platform
import plistlib
import re
import stat
import struct
import sys
import tempfile
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

PACKAGE_ROOT = Path(__file__).parent
DEFAULT_MANIFEST = PACKAGE_ROOT / "manifest.json"
DEFAULT_SCHEMA = PACKAGE_ROOT / "manifest.schema.json"
SHA256_RE = re.compile(r"^[0-9a-f]{64}$")
FORBIDDEN_MANIFEST_FRAGMENTS = ("/private/", "scratchpad", "claude-", "X-Amz-")


class ContractError(ValueError):
    """Raised when an offline asset contract is invalid."""


def load_json(path: Path) -> Any:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def tree_records_sha256(entries: list[tuple[str, bytes]]) -> str:
    digest = hashlib.sha256()
    for relative_path, payload in sorted(entries, key=lambda entry: entry[0].encode("utf-8")):
        path_bytes = relative_path.encode("utf-8")
        digest.update(struct.pack(">I", len(path_bytes)))
        digest.update(path_bytes)
        digest.update(struct.pack(">Q", len(payload)))
        digest.update(payload)
    return digest.hexdigest()


def tree_sha256(root: Path) -> tuple[str, int, int]:
    if root.is_symlink() or not root.is_dir():
        raise ContractError(f"tree output is not a nonsymlink directory: {root}")
    files = sorted(
        (path for path in root.rglob("*") if path.is_file()),
        key=lambda path: path.relative_to(root).as_posix().encode("utf-8"),
    )
    entries: list[tuple[str, bytes]] = []
    total_bytes = 0
    for path in files:
        if path.is_symlink():
            raise ContractError(f"tree output contains a symlink: {path}")
        payload = path.read_bytes()
        entries.append((path.relative_to(root).as_posix(), payload))
        total_bytes += len(payload)
    return tree_records_sha256(entries), len(files), total_bytes


def _encode_streamline(points: list[list[float]]) -> bytes:
    encoded = bytearray(struct.pack(">Q", len(points)))
    for point in points:
        if len(point) != 3:
            raise ContractError("TrackVis fixture points must have three coordinates")
        for coordinate in point:
            value = float(coordinate)
            if not math.isfinite(value):
                raise ContractError("TrackVis equality cannot encode non-finite coordinates")
            encoded.extend(struct.pack("<d", value))
    return bytes(encoded)


def trackvis_order_sha256(streamlines: list[list[list[float]]]) -> str:
    digest = hashlib.sha256(b"brain-atlas/trk-order/v1\0")
    digest.update(struct.pack(">Q", len(streamlines)))
    for streamline in streamlines:
        digest.update(_encode_streamline(streamline))
    return digest.hexdigest()


def trackvis_multiset_sha256(streamlines: list[list[list[float]]]) -> str:
    item_digests = []
    for streamline in streamlines:
        forward = _encode_streamline(streamline)
        reverse = _encode_streamline(list(reversed(streamline)))
        item_digests.append(hashlib.sha256(min(forward, reverse)).digest())
    digest = hashlib.sha256(b"brain-atlas/trk-multiset/v1\0")
    digest.update(struct.pack(">Q", len(streamlines)))
    for item_digest in sorted(item_digests):
        digest.update(item_digest)
    return digest.hexdigest()


def contract_fixture_hashes() -> dict[str, Any]:
    one = [[1.5, -2.0, 0.0], [3.0, 4.25, -0.0]]
    other = [[-1.0, 0.0, 2.0], [0.5, 8.0, -3.0]]
    trackvis = {
        "empty": [],
        "one": [one],
        "reversed": [list(reversed(one))],
        "two": [one, other],
        "twoReordered": [other, one],
        "duplicate": [one, one],
    }
    tree_entries = {
        "empty": [],
        "one": [("a.txt", b"hello")],
        "nested": [("x/y.bin", bytes((0, 255)))],
        "changed": [("a.txt", b"hellO")],
        "extra": [("a.txt", b"hello"), ("b", b"!")],
        "missing": [],
    }
    return {
        "trackvis": {
            name: {
                "order": trackvis_order_sha256(streamlines),
                "multiset": trackvis_multiset_sha256(streamlines),
            }
            for name, streamlines in trackvis.items()
        },
        "trees": {
            name: tree_records_sha256(entries)
            for name, entries in tree_entries.items()
        },
    }


def _strict_utf8(value: str, label: str) -> bytes:
    raw = os.fsencode(value)
    try:
        raw.decode("utf-8", "strict")
    except UnicodeDecodeError as error:
        raise ContractError(f"{label} is not strict UTF-8") from error
    return raw


def _require_lexical_containment(root: Path, candidate: Path, label: str) -> None:
    root_text = os.path.abspath(os.fspath(root))
    candidate_text = os.path.abspath(os.fspath(candidate))
    try:
        contained = os.path.commonpath((root_text, candidate_text)) == root_text
    except ValueError as error:
        raise ContractError(f"{label} escapes its declared root") from error
    if not contained:
        raise ContractError(f"{label} escapes its declared root")


def environment_tree_sha256(root: Path, declared_paths: list[str] | None = None) -> tuple[str, list[str]]:
    root = Path(os.path.abspath(os.fspath(root)))
    if root.is_symlink() or not root.is_dir():
        raise ContractError(f"environment root is not a nonsymlink directory: {root}")

    lexical_paths: list[Path] = []
    if declared_paths is None:
        for directory, directory_names, file_names in os.walk(root, followlinks=False):
            directory_path = Path(directory)
            kept_directories = []
            for name in directory_names:
                path = directory_path / name
                if name == "__pycache__":
                    continue
                if path.is_symlink():
                    lexical_paths.append(path)
                else:
                    kept_directories.append(name)
            directory_names[:] = kept_directories
            lexical_paths.extend(
                directory_path / name
                for name in file_names
                if not name.endswith(".pyc")
            )
    else:
        for relative in declared_paths:
            relative_path = Path(relative)
            if relative_path.is_absolute() or ".." in relative_path.parts:
                raise ContractError(f"declared environment path escapes root: {relative}")
            path = root / relative_path
            _require_lexical_containment(root, path, f"declared environment path {relative}")
            lexical_paths.append(path)

    entries: list[tuple[bytes, bytes, bytes]] = []
    seen: set[bytes] = set()
    for path in lexical_paths:
        relative_text = path.relative_to(root).as_posix()
        if relative_text.endswith(".pyc") or "__pycache__" in Path(relative_text).parts:
            continue
        relative_bytes = _strict_utf8(relative_text, "environment relative path")
        if relative_bytes in seen:
            raise ContractError(f"duplicate environment path: {relative_text}")
        seen.add(relative_bytes)
        try:
            mode = path.lstat().st_mode
        except FileNotFoundError as error:
            raise ContractError(f"environment entry is missing: {relative_text}") from error
        if stat.S_ISDIR(mode):
            continue
        if stat.S_ISREG(mode):
            entries.append((relative_bytes, b"F", path.read_bytes()))
        elif stat.S_ISLNK(mode):
            target = os.readlink(path)
            target_bytes = _strict_utf8(target, f"symlink target for {relative_text}")
            target_path = Path(target) if os.path.isabs(target) else path.parent / target
            _require_lexical_containment(root, Path(os.path.normpath(target_path)), f"symlink {relative_text}")
            entries.append((relative_bytes, b"L", target_bytes))
        else:
            raise ContractError(f"unsupported environment entry: {relative_text}")

    digest = hashlib.sha256(b"brain-atlas/environment-tree/v1\0")
    recorded: list[str] = []
    for relative_bytes, kind, payload in sorted(entries, key=lambda entry: entry[0]):
        digest.update(kind)
        digest.update(struct.pack(">I", len(relative_bytes)))
        digest.update(relative_bytes)
        digest.update(struct.pack(">Q" if kind == b"F" else ">I", len(payload)))
        digest.update(payload)
        recorded.append(relative_bytes.decode("utf-8"))
    return digest.hexdigest(), recorded


def environment_contract_fixtures() -> dict[str, Any]:
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        empty, _ = environment_tree_sha256(root)
        (root / "a").write_bytes(b"x")
        file_hash, _ = environment_tree_sha256(root)
        (root / "a").unlink()
        os.symlink("a", root / "link")
        symlink_hash, _ = environment_tree_sha256(root)
        (root / "a").write_bytes(b"x")
        combined, _ = environment_tree_sha256(root)

        (root / "inside").mkdir()
        (root / "inside" / "must-not-be-visited").write_bytes(b"hidden")
        os.symlink("inside", root / "directory-link")
        _, recorded = environment_tree_sha256(root)
        directory_symlink_visited = "directory-link/must-not-be-visited" in recorded

        os.symlink("../outside", root / "escape")
        try:
            environment_tree_sha256(root)
        except ContractError:
            escape_rejected = True
        else:
            escape_rejected = False

    return {
        "empty": empty,
        "file": file_hash,
        "symlink": symlink_hash,
        "combined": combined,
        "directorySymlinkVisited": directory_symlink_visited,
        "escapeRejected": escape_rejected,
    }


def _canonical_distribution_name(name: str) -> str:
    return re.sub(r"[-_.]+", "-", name).lower()


def _macos_product() -> tuple[str, str]:
    system_version = Path("/System/Library/CoreServices/SystemVersion.plist")
    if not system_version.is_file():
        raise ContractError("macOS SystemVersion.plist is unavailable")
    with system_version.open("rb") as handle:
        payload = plistlib.load(handle)
    return str(payload["ProductVersion"]), str(payload["ProductBuildVersion"])


def compute_environment_identity(uv_path: Path, manifest: dict[str, Any]) -> dict[str, Any]:
    uv_path = Path(os.path.abspath(os.fspath(uv_path)))
    if not uv_path.is_file():
        raise ContractError("uv executable must be an explicit file")
    product_version, product_build = _macos_product()
    base_executable = Path(getattr(sys, "_base_executable", "") or Path(sys.base_prefix) / "bin" / "python3.13")
    runtime_hash, _ = environment_tree_sha256(Path(sys.base_prefix))

    expected_packages = {
        entry["name"]: entry["version"]
        for field in ("directPackages", "transitivePackages")
        for entry in manifest["environment"][field]
    }
    installed: dict[str, importlib.metadata.Distribution] = {}
    for distribution in importlib.metadata.distributions():
        name = _canonical_distribution_name(distribution.metadata["Name"])
        if name in expected_packages:
            if name in installed:
                raise ContractError(f"duplicate installed distribution: {name}")
            installed[name] = distribution
    if set(installed) != set(expected_packages):
        missing = sorted(set(expected_packages) - set(installed))
        raise ContractError(f"environment distributions differ; missing={missing}")

    distribution_hashes: dict[str, str] = {}
    versions: dict[str, str] = {}
    for name in sorted(installed):
        distribution = installed[name]
        versions[name] = distribution.version
        if distribution.version != expected_packages[name]:
            raise ContractError(f"distribution version mismatch for {name}")
        declared = list(distribution.files or ())
        if not declared:
            raise ContractError(f"distribution has no declared files: {name}")
        located = [Path(os.path.abspath(os.path.normpath(distribution.locate_file(entry)))) for entry in declared]
        located_base = Path(os.path.abspath(os.path.normpath(distribution.locate_file(""))))
        install_root = Path(os.path.commonpath([os.fspath(located_base), *(os.fspath(path) for path in located)]))
        relative_paths = [path.relative_to(install_root).as_posix() for path in located]
        digest, _ = environment_tree_sha256(install_root, relative_paths)
        distribution_hashes[name] = digest

    return {
        "platform": {
            "os": "macOS" if platform.system() == "Darwin" else platform.system(),
            "osVersion": product_version,
            "build": product_build,
            "kernel": f"{platform.system()} {platform.release()}",
            "architecture": platform.machine(),
        },
        "uv": {
            "bytes": uv_path.stat().st_size,
            "sha256": sha256_file(uv_path),
        },
        "python": {
            "implementation": platform.python_implementation(),
            "version": platform.python_version(),
            "compiler": platform.python_compiler().strip(),
            "architecture": platform.machine(),
            "baseExecutableBytes": base_executable.stat().st_size,
            "baseExecutableSha256": sha256_file(base_executable),
            "runtimeTreeSha256": runtime_hash,
        },
        "versions": versions,
        "distributionTreeSha256": distribution_hashes,
    }


def verify_environment(uv_path: Path, manifest: dict[str, Any]) -> dict[str, Any]:
    actual = compute_environment_identity(uv_path, manifest)
    expected = manifest["environment"]
    if actual["platform"] != expected["byteExactPlatform"]:
        raise ContractError("byte-exact platform does not match the manifest")
    for field in ("bytes", "sha256"):
        if actual["uv"][field] != expected["uv"][field]:
            raise ContractError(f"uv {field} does not match the manifest")
    for field, value in actual["python"].items():
        if value != expected["python"].get(field):
            raise ContractError(f"Python {field} does not match the manifest")
    if actual["distributionTreeSha256"] != expected["distributionTreeSha256"]:
        raise ContractError("distribution content trees do not match the manifest")
    return actual


def resolve_inputs(input_root: Path, source_records: list[dict[str, Any]]) -> dict[str, Path]:
    input_root = Path(os.path.abspath(os.fspath(input_root)))
    if input_root.is_symlink() or not input_root.is_dir():
        raise ContractError("input root must be a nonsymlink directory")
    expected_names = [record["filename"] for record in source_records]
    if len(expected_names) != len(set(expected_names)):
        raise ContractError("input records contain duplicate canonical filenames")
    for filename in expected_names:
        path = Path(filename)
        if path.is_absolute() or len(path.parts) != 1 or path.name != filename:
            raise ContractError(f"unsafe canonical input filename: {filename}")
    actual_entries = sorted(path.name for path in input_root.iterdir())
    if actual_entries != sorted(expected_names):
        raise ContractError("input root has missing or unexpected entries")

    resolved: dict[str, Path] = {}
    for record in source_records:
        path = input_root / record["filename"]
        mode = path.lstat().st_mode
        if not stat.S_ISREG(mode) or path.is_symlink():
            raise ContractError(f"input is not a regular nonsymlink file: {record['id']}")
        if path.stat().st_size != record["bytes"]:
            raise ContractError(f"input byte count mismatch: {record['id']}")
        if sha256_file(path) != record["sha256"]:
            raise ContractError(f"input SHA-256 mismatch: {record['id']}")
        resolved[record["id"]] = path
    return resolved


def require_empty_output_root(output_root: Path, repo_root: Path) -> Path:
    output_root = Path(os.path.abspath(os.fspath(output_root)))
    repo_root = Path(os.path.abspath(os.fspath(repo_root)))
    if output_root.is_symlink() or not output_root.is_dir():
        raise ContractError("output root must be an existing nonsymlink directory")
    public_root = repo_root / "public"
    try:
        under_public = os.path.commonpath((os.fspath(public_root), os.fspath(output_root))) == os.fspath(public_root)
    except ValueError:
        under_public = False
    if under_public:
        raise ContractError("offline builders cannot write beneath public/")
    if any(output_root.iterdir()):
        raise ContractError("output root must be empty")
    return output_root


def resample_contour(points: Any, point_count: int):
    import numpy as np

    coordinates = np.ascontiguousarray(np.asarray(points, dtype=np.float64))
    if coordinates.ndim != 2 or coordinates.shape[1] != 3 or len(coordinates) == 0:
        raise ContractError("a contour must contain one or more xyz points")
    if not np.all(np.isfinite(coordinates)):
        raise ContractError("a contour contains non-finite coordinates")
    segment_lengths = np.linalg.norm(np.diff(coordinates, axis=0), axis=1)
    cumulative = np.concatenate((
        np.array([0.0], dtype=np.float64),
        np.cumsum(segment_lengths, dtype=np.float64),
    ))
    total = cumulative[-1]
    if total == 0.0:
        return np.repeat(coordinates[:1], point_count, axis=0)
    samples = np.linspace(0.0, total, point_count, dtype=np.float64)
    return np.column_stack([
        np.interp(samples, cumulative, coordinates[:, coordinate])
        for coordinate in range(3)
    ])


def _walk_strings(value: Any):
    if isinstance(value, str):
        yield value
    elif isinstance(value, list):
        for entry in value:
            yield from _walk_strings(entry)
    elif isinstance(value, dict):
        for entry in value.values():
            yield from _walk_strings(entry)


def _require_unique_ids(records: list[dict[str, Any]], field: str) -> set[str]:
    values = [record.get("id") for record in records]
    if any(not isinstance(value, str) or not value for value in values):
        raise ContractError(f"{field} contains a missing or invalid id")
    if len(values) != len(set(values)):
        raise ContractError(f"{field} contains duplicate ids")
    return set(values)


def validate_manifest(manifest_path: Path = DEFAULT_MANIFEST, schema_path: Path = DEFAULT_SCHEMA) -> dict[str, Any]:
    manifest = load_json(manifest_path)
    schema = load_json(schema_path)
    required = schema.get("required")
    if not isinstance(required, list):
        raise ContractError("manifest schema has no required root fields")
    missing = [field for field in required if field not in manifest]
    if missing:
        raise ContractError(f"manifest missing fields: {', '.join(missing)}")
    if manifest.get("schemaVersion") != 1:
        raise ContractError("manifest schemaVersion must be 1")

    source_ids = _require_unique_ids(manifest["sources"], "sources")
    intermediate_ids = _require_unique_ids(manifest["intermediates"], "intermediates")
    tool_ids = _require_unique_ids(manifest["tools"], "tools")
    pipeline_ids = _require_unique_ids(manifest["pipelines"], "pipelines")
    output_ids = _require_unique_ids(manifest["outputs"], "outputs")

    for source in manifest["sources"]:
        parsed = urlsplit(source.get("url", ""))
        if parsed.scheme != "https" or not parsed.netloc or parsed.username or parsed.password:
            raise ContractError(f"source {source['id']} does not use credential-free HTTPS")
        if parsed.query or parsed.fragment:
            raise ContractError(f"source {source['id']} URL is not stable")
        if not SHA256_RE.fullmatch(source.get("sha256", "")):
            raise ContractError(f"source {source['id']} has invalid SHA-256")
        if not isinstance(source.get("bytes"), int) or source["bytes"] <= 0:
            raise ContractError(f"source {source['id']} has invalid byte count")
        for field in ("filename", "dataset", "version", "terms", "verifiedOn", "redistribution", "coordinateFrame"):
            if field not in source:
                raise ContractError(f"source {source['id']} missing {field}")
        if not isinstance(source.get("acceptanceRequired"), bool):
            raise ContractError(f"source {source['id']} missing acceptance requirement")

    for intermediate in manifest["intermediates"]:
        if not SHA256_RE.fullmatch(intermediate.get("sha256", "")):
            raise ContractError(f"intermediate {intermediate['id']} has invalid SHA-256")
        if intermediate.get("redistribution") != "not redistributed":
            raise ContractError(f"intermediate {intermediate['id']} must not be redistributed")

    known_dependencies = source_ids | intermediate_ids
    for pipeline in manifest["pipelines"]:
        unknown = (set(pipeline.get("sourceIds", [])) | set(pipeline.get("intermediateIds", []))) - known_dependencies
        if unknown:
            raise ContractError(f"pipeline {pipeline['id']} has unknown dependencies: {sorted(unknown)}")

    for output in manifest["outputs"]:
        if output.get("pipelineId") not in pipeline_ids:
            raise ContractError(f"output {output['id']} has unknown pipeline")
        path = Path(output.get("path", ""))
        if path.is_absolute() or not path.parts or path.parts[0] != "public" or ".." in path.parts:
            raise ContractError(f"output {output['id']} has unsafe path")
        if output.get("autoReplacePublicAsset") is not False:
            raise ContractError(f"output {output['id']} permits automatic replacement")
        if not SHA256_RE.fullmatch(output.get("sha256", "")):
            raise ContractError(f"output {output['id']} has invalid SHA-256")

    rights = manifest["rights"]
    rights_outputs = [record.get("outputId") for record in rights]
    if len(rights_outputs) != len(set(rights_outputs)) or set(rights_outputs) != output_ids:
        raise ContractError("rights records must bind every output exactly once")
    for record in rights:
        if set(record.get("sourceIds", [])) - source_ids:
            raise ContractError(f"rights for {record['outputId']} references an unknown source")
        if record.get("blocking") is not False:
            raise ContractError(f"rights for {record['outputId']} remain blocking")
        if not record.get("obligations") or not record.get("evidence"):
            raise ContractError(f"rights for {record['outputId']} are incomplete")

    for value in _walk_strings(manifest):
        if any(fragment in value for fragment in FORBIDDEN_MANIFEST_FRAGMENTS):
            raise ContractError(f"manifest contains a forbidden local or signed-URL fragment: {value}")

    lock = manifest["environment"]["lock"]
    lock_path = manifest_path.parents[2] / lock["path"]
    if lock_path.stat().st_size != lock["bytes"] or sha256_file(lock_path) != lock["sha256"]:
        raise ContractError("requirements.lock identity does not match the manifest")
    if not lock.get("hashEnforced") or not lock.get("offlineRequiredAfterPreparation"):
        raise ContractError("environment lock does not require hashes and offline execution")

    return manifest


def verify_current(repo: Path, manifest: dict[str, Any]) -> dict[str, Any]:
    repo = repo.resolve()
    verified: list[str] = []
    for output in manifest["outputs"]:
        path = repo / output["path"]
        if path.is_symlink():
            raise ContractError(f"checked output is a symlink: {output['path']}")
        if output["id"] == "region-mesh-tree":
            digest, count, total_bytes = tree_sha256(path)
            if count != output["fileCount"] or total_bytes != output["bytes"]:
                raise ContractError(f"tree shape mismatch for {output['id']}")
        else:
            if not path.is_file():
                raise ContractError(f"checked output is missing: {output['path']}")
            if path.stat().st_size != output["bytes"]:
                raise ContractError(f"byte count mismatch for {output['id']}")
            digest = sha256_file(path)
        if digest != output["sha256"]:
            raise ContractError(f"SHA-256 mismatch for {output['id']}")
        verified.append(output["id"])

    glb_path = repo / "public/models/brain_mni.glb"
    magic, glb_version, glb_length = struct.unpack("<4sII", glb_path.read_bytes()[:12])
    if magic != b"glTF" or glb_version != 2 or glb_length != glb_path.stat().st_size:
        raise ContractError("cortical shell is not the expected complete GLB v2 container")

    regions = load_json(repo / "public/data/regions.json")
    region_count = len(regions.get("regions", []))
    region_meshes = sum(len(region.get("meshes", {})) for region in regions.get("regions", []))
    if region_count != 45 or region_meshes != 90:
        raise ContractError("region manifest does not contain 45 bilateral regions")

    association = load_json(repo / "public/data/tracts.json")
    tract_records = association.get("tracts", [])
    association_groups = sum(1 for tract in tract_records for hemisphere in ("L", "R") if hemisphere in tract)
    association_fibres = sum(len(tract[hemisphere]) for tract in tract_records for hemisphere in ("L", "R"))
    if len(tract_records) != 8 or association_groups != 16 or association_fibres != 2880:
        raise ContractError("association output shape differs from the manifest")
    if any(len(fibre) != 40 for tract in tract_records for hemisphere in ("L", "R") for fibre in tract[hemisphere]):
        raise ContractError("association output does not use 40 points per fibre")

    optic_radiation = load_json(repo / "public/data/or_fibres.json")
    if optic_radiation.get("n") != 220 or optic_radiation.get("np") != 64:
        raise ContractError("optic-radiation output shape differs from the manifest")
    if len(optic_radiation.get("fibres", [])) != 220 or any(len(fibre) != 64 for fibre in optic_radiation["fibres"]):
        raise ContractError("optic-radiation fibres do not match n/np")
    runtime_source = (repo / "src/main.js").read_text(encoding="utf-8")
    runtime_mirror = "new THREE.Vector3(-v.x, v.y, v.z)" in runtime_source
    if not runtime_mirror:
        raise ContractError("runtime right optic-radiation mirror is missing")

    swm = load_json(repo / "public/data/swm_fibres.json")
    if swm.get("n") != 15000 or swm.get("np") != 8:
        raise ContractError("SWM output shape differs from the manifest")
    if len(swm.get("fibres", [])) != 15000 or any(len(fibre) != 8 for fibre in swm["fibres"]):
        raise ContractError("SWM fibres do not match n/np")
    if len(swm.get("len", [])) != 15000 or len(swm.get("lloc", [])) != 15000:
        raise ContractError("SWM length arrays do not match n")

    return {
        "verifiedOutputs": verified,
        "structures": {
            "association": {"fibres": 2880, "groups": 16, "pointsPerFibre": 40, "tracts": 8},
            "corticalShell": {"container": "glTF", "version": 2},
            "opticRadiation": {"fibres": 220, "pointsPerFibre": 64, "runtimeMirroredRight": True},
            "regions": {"meshes": 90, "regions": 45},
            "swm": {"fibres": 15000, "lengths": 15000, "localLengths": 15000, "pointsPerFibre": 8},
        },
    }
