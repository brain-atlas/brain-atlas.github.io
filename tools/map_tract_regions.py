#!/usr/bin/env -S uv run --script
# /// script
# requires-python = ">=3.13,<3.14"
# dependencies = [
#   "numpy==2.5.1",
#   "rtree==1.4.1",
#   "scipy==1.18.0",
#   "trimesh==4.12.2",
# ]
# ///
"""Generate the checked tract-to-region endpoint-proximity evidence artifact.

This tool intentionally analyzes only the web assets that the viewer ships. It does
not regenerate tractography, infer streamline polarity, or transform either dataset.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import warnings
from importlib.metadata import version
from pathlib import Path
from typing import Any

import numpy as np
import trimesh

TOOL_VERSION = 1
TRACT_IDS = ("ilf", "ifof", "slf1", "slf2", "slf3", "vof", "af", "mdlf")
HEMISPHERES = ("L", "R")
SCREEN_RADII_MM = (3, 5)
MIN_STREAMLINES_PER_HEMISPHERE = 18
EXPECTED_STREAMLINES_PER_HEMISPHERE = 180
EXPECTED_POINTS_PER_STREAMLINE = 40
REVIEWED_HYPOTHESES = (
    ("ilf", "sts2", "STS2 (ILF→)"),
    ("ifof", "ofc", "OFC (IFOF→)"),
    ("slf1", "presma", "preSMA (SLF I→)"),
    ("slf2", "dlpfc", "DLPFC (SLF II→)"),
    ("slf3", "broca", "Broca 44 (SLF III→)"),
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_file_set(paths: list[Path], root: Path) -> str:
    """Hash sorted relative paths and bytes so names and content are both frozen."""
    digest = hashlib.sha256()
    for path in sorted(paths, key=lambda item: item.relative_to(root).as_posix()):
        relative = path.relative_to(root).as_posix().encode("utf-8")
        digest.update(relative)
        digest.update(b"\0")
        with path.open("rb") as handle:
            for chunk in iter(lambda: handle.read(1024 * 1024), b""):
                digest.update(chunk)
        digest.update(b"\0")
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"expected a JSON object: {path}")
    return value


def require_finite_points(points: Any, expected_shape: tuple[int, ...], label: str) -> np.ndarray:
    array = np.asarray(points, dtype=np.float64)
    if array.shape != expected_shape:
        raise ValueError(f"{label} has shape {array.shape}; expected {expected_shape}")
    if not np.isfinite(array).all():
        raise ValueError(f"{label} contains non-finite coordinates")
    return array


def load_region_meshes(
    repo: Path,
    regions: list[dict[str, Any]],
) -> tuple[dict[tuple[str, str], trimesh.Trimesh], list[Path]]:
    meshes: dict[tuple[str, str], trimesh.Trimesh] = {}
    paths: list[Path] = []
    for region in regions:
        region_id = region["id"]
        for hemisphere in HEMISPHERES:
            relative = region["meshes"][hemisphere]["file"]
            path = repo / "public" / relative
            mesh = trimesh.load(path, force="mesh", process=False)
            if not isinstance(mesh, trimesh.Trimesh):
                raise ValueError(f"OBJ parser did not return one mesh: {path}")
            if mesh.vertices.ndim != 2 or mesh.vertices.shape[1] != 3 or len(mesh.faces) == 0:
                raise ValueError(f"invalid triangle mesh: {path}")
            if not np.isfinite(mesh.vertices).all():
                raise ValueError(f"mesh contains non-finite vertices: {path}")
            meshes[(region_id, hemisphere)] = mesh
            paths.append(path)
    return meshes, paths


def assignment_record(
    region_id: str,
    nearest_region: np.ndarray,
    nearest_distance: np.ndarray,
    region_index: int,
) -> dict[str, Any]:
    record: dict[str, Any] = {"regionId": region_id}
    for radius in SCREEN_RADII_MM:
        endpoint_matches = (nearest_region == region_index) & (nearest_distance <= radius)
        streamline_matches = endpoint_matches.any(axis=1)
        distances = nearest_distance[endpoint_matches]
        record[f"within{radius}mm"] = int(streamline_matches.sum())
        record[f"medianMatchedDistance{radius}mm"] = (
            round(float(np.median(distances)), 3) if len(distances) else None
        )
    return record


def map_hemisphere(
    fibres: Any,
    region_ids: list[str],
    meshes: dict[tuple[str, str], trimesh.Trimesh],
    hemisphere: str,
    tract_id: str,
) -> dict[str, Any]:
    points = require_finite_points(
        fibres,
        (
            EXPECTED_STREAMLINES_PER_HEMISPHERE,
            EXPECTED_POINTS_PER_STREAMLINE,
            3,
        ),
        f"{tract_id}:{hemisphere}",
    )
    endpoints = points[:, (0, -1), :]
    flat_endpoints = endpoints.reshape(-1, 3)
    columns: list[np.ndarray] = []
    for region_id in region_ids:
        with warnings.catch_warnings():
            # Some shipped decimated shells contain degenerate triangles. Trimesh's
            # exact proximity query still returns finite nearest-surface distances;
            # validate those values rather than mutating the checked geometry.
            warnings.filterwarnings("ignore", category=RuntimeWarning, module="trimesh")
            distances = meshes[(region_id, hemisphere)].nearest.on_surface(flat_endpoints)[1]
        distances = np.asarray(distances, dtype=np.float64)
        if distances.shape != (len(flat_endpoints),) or not np.isfinite(distances).all():
            raise ValueError(f"invalid proximity result for {tract_id}:{hemisphere}:{region_id}")
        if (distances < 0).any():
            raise ValueError(f"negative proximity distance for {tract_id}:{hemisphere}:{region_id}")
        columns.append(distances)
    distance_matrix = np.column_stack(columns)
    nearest_region = np.argmin(distance_matrix, axis=1).reshape(-1, 2)
    nearest_distance = np.min(distance_matrix, axis=1).reshape(-1, 2)
    return {
        "streamlines": len(points),
        "assignments": [
            assignment_record(region_id, nearest_region, nearest_distance, index)
            for index, region_id in enumerate(region_ids)
        ],
    }


def assignment_by_region(hemisphere: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {record["regionId"]: record for record in hemisphere["assignments"]}


def relation_status(
    tract: dict[str, Any],
    region_id: str,
) -> str:
    if region_id in tract["robustRegionIds"]:
        return "qualified-robust"
    if region_id in tract["thresholdSensitiveRegionIds"]:
        return "threshold-sensitive"
    return "rejected"


def stable_region_entity_id(region_id: str) -> str:
    return f"region.{region_id.replace('_', '-')}"


def build_artifact(repo: Path) -> dict[str, Any]:
    tracts_path = repo / "public/data/tracts.json"
    regions_path = repo / "public/data/regions.json"
    tracts_manifest = load_json(tracts_path)
    regions_manifest = load_json(regions_path)
    tracts = tracts_manifest.get("tracts")
    regions = regions_manifest.get("regions")
    if not isinstance(tracts, list) or [tract.get("id") for tract in tracts] != list(TRACT_IDS):
        raise ValueError("tract manifest IDs/order do not match the approved mapping contract")
    if not isinstance(regions, list) or len(regions) != 45:
        raise ValueError("region manifest must contain the 45 displayed regions")
    region_ids = [region.get("id") for region in regions]
    if any(not isinstance(region_id, str) or not region_id for region_id in region_ids):
        raise ValueError("region manifest contains an invalid ID")
    if len(set(region_ids)) != len(region_ids):
        raise ValueError("region manifest contains duplicate IDs")

    meshes, mesh_paths = load_region_meshes(repo, regions)
    if len(mesh_paths) != 90:
        raise ValueError("expected 90 bilateral region meshes")

    tract_records: list[dict[str, Any]] = []
    relationships: list[dict[str, Any]] = []
    for tract in tracts:
        tract_id = tract["id"]
        hemispheres = {
            hemisphere: map_hemisphere(
                tract.get(hemisphere), region_ids, meshes, hemisphere, tract_id,
            )
            for hemisphere in HEMISPHERES
        }
        by_hemisphere = {
            hemisphere: assignment_by_region(hemispheres[hemisphere])
            for hemisphere in HEMISPHERES
        }
        qualified_at_radius = {
            radius: {
                region_id
                for region_id in region_ids
                if all(
                    by_hemisphere[hemisphere][region_id][f"within{radius}mm"]
                    >= MIN_STREAMLINES_PER_HEMISPHERE
                    for hemisphere in HEMISPHERES
                )
            }
            for radius in SCREEN_RADII_MM
        }
        robust = sorted(set.intersection(*qualified_at_radius.values()))
        threshold_sensitive = sorted(qualified_at_radius[5] - qualified_at_radius[3])
        tract_record = {
            "id": tract_id,
            "name": tract["name"],
            "hemispheres": hemispheres,
            "robustRegionIds": robust,
            "thresholdSensitiveRegionIds": threshold_sensitive,
        }
        tract_records.append(tract_record)
        for region_id in robust:
            relationships.append({
                "id": f"relationship.{tract_id}-{region_id.replace('_', '-')}",
                "source": f"tract.{tract_id}",
                "target": stable_region_entity_id(region_id),
                "direction": "undirected",
                "evidence": "displayed-dataset",
                "method": "displayed-endpoint-proximity",
                "status": "qualified",
                "confidence": "low",
                "hemispheres": {
                    hemisphere: {
                        "within3mm": by_hemisphere[hemisphere][region_id]["within3mm"],
                        "within5mm": by_hemisphere[hemisphere][region_id]["within5mm"],
                    }
                    for hemisphere in HEMISPHERES
                },
            })

    tracts_by_id = {tract["id"]: tract for tract in tract_records}
    reviewed_hypotheses = []
    for tract_id, region_id, former_label in REVIEWED_HYPOTHESES:
        tract = tracts_by_id[tract_id]
        by_hemisphere = {
            hemisphere: assignment_by_region(tract["hemispheres"][hemisphere])
            for hemisphere in HEMISPHERES
        }
        reviewed_hypotheses.append({
            "tractId": tract_id,
            "regionId": region_id,
            "formerLabel": former_label,
            "status": relation_status(tract, region_id),
            "hemispheres": {
                hemisphere: {
                    "within3mm": by_hemisphere[hemisphere][region_id]["within3mm"],
                    "within5mm": by_hemisphere[hemisphere][region_id]["within5mm"],
                }
                for hemisphere in HEMISPHERES
            },
        })

    return {
        "schemaVersion": 1,
        "generatedBy": {
            "tool": "tools/map_tract_regions.py",
            "version": TOOL_VERSION,
        },
        "environment": {
            "python": ">=3.13,<3.14",
            "packages": {
                "numpy": version("numpy"),
                "rtree": version("rtree"),
                "scipy": version("scipy"),
                "trimesh": version("trimesh"),
            },
        },
        "inputs": {
            "tracts": {
                "path": "public/data/tracts.json",
                "sha256": sha256_file(tracts_path),
            },
            "regions": {
                "path": "public/data/regions.json",
                "sha256": sha256_file(regions_path),
            },
            "regionMeshes": {
                "path": "public/data/regions/*.obj",
                "count": len(mesh_paths),
                "sha256": sha256_file_set(mesh_paths, repo),
                "hashMethod": "SHA-256 over sorted repo-relative UTF-8 path, NUL, bytes, NUL",
            },
        },
        "coordinateFrames": {
            "fibres": tracts_manifest["space"],
            "regions": {
                "template": regions_manifest["space"],
                "coordinateConvention": "RAS+",
                "units": "mm",
            },
            "templateConversion": "none; common RAS+ world only",
        },
        "method": {
            "endpointOrder": "ignored; first and last points form an unordered pair",
            "distance": "exact nearest point on each shipped decimated region triangle surface",
            "candidateAssignment": "nearest same-hemisphere displayed region shell",
            "screenRadiiMm": list(SCREEN_RADII_MM),
            "minimumStreamlinesPerHemisphere": MIN_STREAMLINES_PER_HEMISPHERE,
            "streamlinesPerHemisphere": EXPECTED_STREAMLINES_PER_HEMISPHERE,
            "qualification": "at least 18 sampled streamlines in L and R at both 3 mm and 5 mm",
            "counting": "a streamline counts once for a region when either unordered endpoint matches",
            "direction": "undirected",
        },
        "tracts": tract_records,
        "relationships": relationships,
        "reviewedHypotheses": reviewed_hypotheses,
        "exclusions": [{
            "entity": "layer.swm",
            "status": "not-mapped",
            "reason": (
                "The broad superficial-white-matter sample has no approved named-region endpoint "
                "classification; proximity must not be presented as named U-fibre connectivity."
            ),
        }],
        "limitations": [
            "Counts describe the deterministic 180-streamline display sample per tract and hemisphere; they are not population probabilities.",
            "Endpoint proximity is not a synaptic termination, connection strength, tract abundance, or functional relationship.",
            "The nearest-surface screen uses the shipped decimated Jülich shells and only the 45 displayed candidate regions.",
            "Association fibres are ICBM-2009a RAS+ millimetres and region shells are MNI152NLin2009cAsym RAS+ millimetres; no template warp was applied.",
            "Tractography can contain false positives, false negatives, termination bias, and gyral bias; low confidence is mandatory.",
            "The 3 mm, 5 mm, and 18-of-180 thresholds are project curation rules, not inferential statistics.",
        ],
    }


def artifact_bytes(artifact: dict[str, Any]) -> bytes:
    return (json.dumps(artifact, ensure_ascii=True, indent=2) + "\n").encode("utf-8")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=Path(__file__).resolve().parents[1])
    parser.add_argument("--output", type=Path, default=Path("public/data/tract_region_mapping.json"))
    parser.add_argument("--check", action="store_true", help="fail if checked output differs")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(sys.argv[1:] if argv is None else argv)
    repo = args.repo.resolve()
    output = args.output if args.output.is_absolute() else repo / args.output
    generated = artifact_bytes(build_artifact(repo))
    if args.check:
        if not output.exists():
            print(f"missing mapping artifact: {output}", file=sys.stderr)
            return 1
        if output.read_bytes() != generated:
            print(f"mapping artifact drift: {output}", file=sys.stderr)
            return 1
        print(json.dumps({"status": "ok", "output": output.relative_to(repo).as_posix()}))
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(generated)
    print(json.dumps({"status": "written", "output": output.relative_to(repo).as_posix()}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
