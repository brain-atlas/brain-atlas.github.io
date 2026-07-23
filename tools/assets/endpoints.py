"""Offline volumetric endpoint classification for displayed fibre contours."""

from __future__ import annotations

from dataclasses import dataclass
import json
from pathlib import Path
from typing import Any, Mapping

import numpy as np
from scipy.spatial import cKDTree

from .common import ContractError, sha256_file
from .cortex import load_nifti_with_matching_forms


@dataclass(frozen=True)
class LabelIndex:
    """Nearest-neighbour index over nonzero atlas voxel centres in world RAS mm."""

    labels: np.ndarray
    affine: np.ndarray
    inverse_affine: np.ndarray
    voxel_indices: np.ndarray
    voxel_labels: np.ndarray
    world_centres: np.ndarray
    tree: cKDTree


def build_label_index(labels: np.ndarray, affine: np.ndarray) -> LabelIndex:
    """Validate a categorical 3-D volume and index all nonzero voxel centres."""

    values = np.asarray(labels)
    transform = np.asarray(affine, dtype=np.float64)
    if values.ndim != 3 or any(size <= 0 for size in values.shape):
        raise ValueError("endpoint atlas labels must be a nonempty 3-D array")
    if not np.issubdtype(values.dtype, np.integer):
        if not np.all(np.isfinite(values)) or not np.all(values == np.rint(values)):
            raise ValueError("endpoint atlas labels must contain finite integers")
        values = values.astype(np.int64)
    if transform.shape != (4, 4) or not np.all(np.isfinite(transform)):
        raise ValueError("endpoint atlas affine must be a finite 4x4 matrix")
    if not np.allclose(transform[3], np.asarray([0.0, 0.0, 0.0, 1.0])):
        raise ValueError("endpoint atlas affine must be homogeneous")
    if abs(float(np.linalg.det(transform[:3, :3]))) <= np.finfo(np.float64).eps:
        raise ValueError("endpoint atlas affine must be invertible")

    voxel_indices = np.argwhere(values != 0).astype(np.int32, copy=False)
    if len(voxel_indices) == 0:
        raise ValueError("endpoint atlas contains no nonzero labels")
    homogeneous = np.column_stack((voxel_indices.astype(np.float64), np.ones(len(voxel_indices))))
    world_centres = (homogeneous @ transform.T)[:, :3]
    voxel_labels = values[tuple(voxel_indices.T)].astype(np.int64, copy=False)
    return LabelIndex(
        labels=values,
        affine=transform,
        inverse_affine=np.linalg.inv(transform),
        voxel_indices=voxel_indices,
        voxel_labels=voxel_labels,
        world_centres=world_centres,
        tree=cKDTree(world_centres),
    )


def _direct_label(point: np.ndarray, index: LabelIndex) -> int:
    voxel = np.rint(np.append(point, 1.0) @ index.inverse_affine.T).astype(np.int64)[:3]
    if np.any(voxel < 0) or np.any(voxel >= np.asarray(index.labels.shape)):
        return 0
    return int(index.labels[tuple(voxel)])


def _distance_hundredths(distance: float) -> int:
    return int(round(float(distance) * 100.0))


def classify_points(
    points: np.ndarray,
    index: LabelIndex,
    label_to_entity: Mapping[int, str],
    *,
    max_distance_mm: float,
    ambiguity_margin_mm: float,
) -> list[dict[str, object]]:
    """Classify world-space points without forcing unsupported labels into entities."""

    world_points = np.asarray(points, dtype=np.float64)
    if world_points.ndim != 2 or world_points.shape[1] != 3:
        raise ValueError("endpoint points must have shape (n, 3)")
    if not np.all(np.isfinite(world_points)):
        raise ValueError("endpoint points must be finite")
    if not np.isfinite(max_distance_mm) or max_distance_mm < 0:
        raise ValueError("maximum endpoint distance must be finite and nonnegative")
    if not np.isfinite(ambiguity_margin_mm) or ambiguity_margin_mm < 0:
        raise ValueError("endpoint ambiguity margin must be finite and nonnegative")

    nearest_distances, nearest_indices = index.tree.query(world_points, k=1, workers=1)
    nearby = index.tree.query_ball_point(
        world_points,
        r=max_distance_mm + ambiguity_margin_mm,
        workers=1,
        return_sorted=True,
    )
    records: list[dict[str, object]] = []
    for point, nearest_distance, nearest_index, local_indices in zip(
        world_points, nearest_distances, nearest_indices, nearby, strict=True
    ):
        distance_hundredths = _distance_hundredths(float(nearest_distance))
        if float(nearest_distance) > max_distance_mm:
            records.append({
                "status": "unknown-outside-support",
                "entity": None,
                "candidates": [],
                "distanceHundredths": distance_hundredths,
            })
            continue

        minimum_by_label: dict[int, float] = {}
        for local_index in local_indices:
            label = int(index.voxel_labels[local_index])
            distance = float(np.linalg.norm(index.world_centres[local_index] - point))
            if distance < minimum_by_label.get(label, np.inf):
                minimum_by_label[label] = distance
        ordered = sorted(minimum_by_label.items(), key=lambda item: (item[1], item[0]))
        nearest_label, assigned_distance = ordered[0]
        ambiguous = len(ordered) > 1 and ordered[1][1] - assigned_distance <= ambiguity_margin_mm
        if ambiguous:
            candidates = [
                label_to_entity[label]
                for label, _distance in ordered
                if _distance - assigned_distance <= ambiguity_margin_mm and label in label_to_entity
            ]
            records.append({
                "status": "ambiguous",
                "entity": None,
                "candidates": sorted(set(candidates)),
                "distanceHundredths": _distance_hundredths(assigned_distance),
            })
            continue

        entity = label_to_entity.get(nearest_label)
        if entity is None:
            records.append({
                "status": "unknown-unsupported-label",
                "entity": None,
                "candidates": [],
                "distanceHundredths": _distance_hundredths(assigned_distance),
            })
            continue

        direct = _direct_label(point, index) == nearest_label
        records.append({
            "status": "known-direct" if direct else "known-nearest",
            "entity": entity,
            "candidates": [],
            "distanceHundredths": _distance_hundredths(assigned_distance),
        })
    return records


STATUS_DEFINITIONS = (
    {
        "id": "unknown-outside-support",
        "class": "unknown",
        "method": "nearest-nonzero-mpm-voxel-centre",
        "confidence": "none",
    },
    {
        "id": "unknown-unsupported-label",
        "class": "unknown",
        "method": "nearest-nonzero-mpm-voxel-centre",
        "confidence": "none",
    },
    {
        "id": "known-direct",
        "class": "known",
        "method": "nearest-grid-sample-plus-local-label-screen",
        "confidence": "qualified",
    },
    {
        "id": "known-nearest",
        "class": "known",
        "method": "nearest-nonzero-mpm-voxel-centre",
        "confidence": "low",
    },
    {
        "id": "ambiguous",
        "class": "ambiguous",
        "method": "distinct-label-distance-margin",
        "confidence": "none",
    },
)


def _load_json(path: Path) -> dict[str, Any]:
    if path.is_symlink() or not path.is_file():
        raise ContractError(f"endpoint repository input is not a regular file: {path}")
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ContractError(f"endpoint repository input is not a JSON object: {path}")
    return value


def _require_repository_inputs(repo: Path, expected_inputs: list[dict[str, Any]]) -> None:
    for record in expected_inputs:
        relative = Path(record["path"])
        if relative.is_absolute() or ".." in relative.parts:
            raise ContractError(f"unsafe endpoint repository input path: {relative}")
        path = repo / relative
        if path.is_symlink() or not path.is_file():
            raise ContractError(f"missing endpoint repository input: {relative}")
        if path.stat().st_size != int(record["bytes"]) or sha256_file(path) != record["sha256"]:
            raise ContractError(f"endpoint repository input differs from manifest: {relative}")


def _require_fibre(fibre: Any, points_per_fibre: int, label: str) -> np.ndarray:
    points = np.asarray(fibre, dtype=np.float64)
    if points.shape != (points_per_fibre, 3) or not np.all(np.isfinite(points)):
        raise ContractError(f"invalid endpoint fibre shape or coordinates: {label}")
    return points


def _validate_presets(presets: dict[str, Any], region_entity_ids: set[str]) -> list[dict[str, Any]]:
    if presets.get("schemaVersion") != 1:
        raise ContractError("fibre filter preset schemaVersion must be 1")
    special_records = presets.get("specialSelectors")
    if not isinstance(special_records, list):
        raise ContractError("fibre filter presets require specialSelectors")
    special_ids = [record.get("id") for record in special_records if isinstance(record, dict)]
    if special_ids != ["endpoint.unknown", "endpoint.ambiguous"]:
        raise ContractError("fibre filter special selectors differ from the versioned contract")
    allowed = region_entity_ids | set(special_ids)
    preset_records = presets.get("presets")
    if not isinstance(preset_records, list) or len(preset_records) != 4:
        raise ContractError("fibre filter catalog must contain four presets")
    expected_ids = [
        "fibre-filter.extrastriate",
        "fibre-filter.ventral",
        "fibre-filter.dorsal",
        "fibre-filter.integrated-stream",
    ]
    if [record.get("id") for record in preset_records if isinstance(record, dict)] != expected_ids:
        raise ContractError("fibre filter preset IDs or order differ from the versioned contract")
    for record in preset_records:
        if record.get("hemispherePolicy") != "inherit-scene":
            raise ContractError(f"unsupported preset hemisphere policy: {record.get('id')}")
        query = record.get("query")
        if not isinstance(query, dict) or set(query) != {"mode", "setA", "setB"}:
            raise ContractError(f"invalid preset query shape: {record.get('id')}")
        mode = query["mode"]
        set_a = query["setA"]
        set_b = query["setB"]
        if not isinstance(set_a, list) or not isinstance(set_b, list):
            raise ContractError(f"preset selectors must be arrays: {record.get('id')}")
        if len(set_a) != len(set(set_a)) or len(set_b) != len(set(set_b)):
            raise ContractError(f"preset selectors must be unique: {record.get('id')}")
        unknown = (set(set_a) | set(set_b)) - allowed
        if unknown:
            raise ContractError(f"preset contains unknown selectors: {sorted(unknown)}")
        if mode in {"touches-any", "connects-within"} and (not set_a or set_b):
            raise ContractError(f"{mode} preset requires setA only: {record.get('id')}")
        if mode == "connects-between" and (not set_a or not set_b):
            raise ContractError(f"connects-between preset requires both sets: {record.get('id')}")
        if mode not in {"touches-any", "connects-within", "connects-between"}:
            raise ContractError(f"unsupported checked preset mode: {mode}")
    return preset_records


def _endpoint_matches(record: dict[str, object], selectors: set[str]) -> bool:
    status = str(record["status"])
    if status == "ambiguous":
        return "endpoint.ambiguous" in selectors
    if status.startswith("unknown-"):
        return "endpoint.unknown" in selectors
    return record["entity"] in selectors


def _fibre_matches(pair: list[dict[str, object]], query: dict[str, Any]) -> bool:
    a, b = pair
    set_a = set(query["setA"])
    set_b = set(query["setB"])
    mode = query["mode"]
    if mode == "touches-any":
        return _endpoint_matches(a, set_a) or _endpoint_matches(b, set_a)
    if mode == "connects-within":
        return _endpoint_matches(a, set_a) and _endpoint_matches(b, set_a)
    if mode == "connects-between":
        return (
            _endpoint_matches(a, set_a) and _endpoint_matches(b, set_b)
        ) or (
            _endpoint_matches(a, set_b) and _endpoint_matches(b, set_a)
        )
    raise ContractError(f"unsupported generated preset mode: {mode}")


def _quality_class(pair: list[dict[str, object]]) -> str:
    statuses = [str(endpoint["status"]) for endpoint in pair]
    if "ambiguous" in statuses:
        return "ambiguous"
    if any(status.startswith("unknown-") for status in statuses):
        return "unknown"
    return "known"


def _quality_counts(pairs: list[list[dict[str, object]]]) -> dict[str, int]:
    result = {"known": 0, "unknown": 0, "ambiguous": 0}
    for pair in pairs:
        result[_quality_class(pair)] += 1
    return result


def _compact_records(
    association_records: list[dict[str, Any]],
    swm_pairs: list[list[dict[str, object]]],
    entity_ids: list[str],
) -> tuple[list[list[int]], list[dict[str, Any]], dict[str, Any]]:
    status_index = {record["id"]: index for index, record in enumerate(STATUS_DEFINITIONS)}
    entity_index = {entity_id: index + 1 for index, entity_id in enumerate(entity_ids)}
    candidate_table: list[list[int]] = [[]]
    candidate_indices: dict[tuple[int, ...], int] = {(): 0}

    def compact(record: dict[str, object]) -> list[int]:
        candidates = tuple(sorted(entity_index[value] for value in record["candidates"]))
        if candidates not in candidate_indices:
            candidate_indices[candidates] = len(candidate_table)
            candidate_table.append(list(candidates))
        entity = record["entity"]
        return [
            status_index[str(record["status"])],
            0 if entity is None else entity_index[str(entity)],
            candidate_indices[candidates],
            int(record["distanceHundredths"]),
        ]

    compact_association = []
    for tract in association_records:
        compact_association.append({
            "id": tract["id"],
            "L": [[compact(pair[0]), compact(pair[1])] for pair in tract["L"]],
            "R": [[compact(pair[0]), compact(pair[1])] for pair in tract["R"]],
        })
    compact_swm = [[compact(pair[0]), compact(pair[1])] for pair in swm_pairs]
    return candidate_table, compact_association, {"endpoints": compact_swm}


def build_endpoint_artifact(
    mpm_path: Path,
    repo: Path,
    output_path: Path,
    *,
    source_record: dict[str, Any],
    region_definitions: list[dict[str, Any]],
    parameters: dict[str, Any],
) -> dict[str, Any]:
    """Build the compact checked endpoint artifact into a new output path."""

    repo = Path(repo).resolve()
    output_path = Path(output_path)
    if output_path.exists() or output_path.name != "fibre_endpoints.json":
        raise ContractError("endpoint output must be a new fibre_endpoints.json path")
    _require_repository_inputs(repo, parameters["repositoryInputs"])

    tracts_path = repo / "public/data/tracts.json"
    swm_path = repo / "public/data/swm_fibres.json"
    regions_path = repo / "public/data/regions.json"
    entities_path = repo / "public/data/entities.json"
    presets_path = repo / "public/data/fibre_filter_presets.json"
    tracts = _load_json(tracts_path)
    swm = _load_json(swm_path)
    regions = _load_json(regions_path)
    entities = _load_json(entities_path)
    presets = _load_json(presets_path)

    region_entities = {
        entity["renderer"]["id"]: entity["id"]
        for entity in entities.get("entities", [])
        if entity.get("renderer", {}).get("kind") == "region"
    }
    region_ids = [record.get("id") for record in regions.get("regions", [])]
    if len(region_ids) != 45 or set(region_ids) != set(region_entities):
        raise ContractError("endpoint region/entity catalog does not contain the same 45 regions")
    entity_ids = sorted(region_entities.values())
    preset_records = _validate_presets(presets, set(entity_ids))

    label_to_entity: dict[int, str] = {}
    for definition in region_definitions:
        renderer_id = definition["id"]
        if renderer_id not in region_entities:
            raise ContractError(f"endpoint region definition has no entity: {renderer_id}")
        for field in ("leftLabel", "rightLabel"):
            label = int(definition[field])
            if label in label_to_entity:
                raise ContractError(f"duplicate endpoint atlas label: {label}")
            label_to_entity[label] = region_entities[renderer_id]
    if len(label_to_entity) != 90:
        raise ContractError("endpoint classifier requires 90 bilateral atlas labels")

    image, affine = load_nifti_with_matching_forms(Path(mpm_path))
    _qform, qform_code = image.get_qform(coded=True)
    _sform, sform_code = image.get_sform(coded=True)
    labels = np.asarray(image.dataobj)
    if not np.issubdtype(labels.dtype, np.integer):
        raise ContractError("endpoint Jülich MPM must contain integer labels")
    label_index = build_label_index(labels, affine)
    missing_labels = set(label_to_entity) - set(map(int, np.unique(label_index.voxel_labels)))
    if missing_labels:
        raise ContractError(f"endpoint Jülich MPM is missing project labels: {sorted(missing_labels)}")

    point_count = []
    pair_targets: list[list[dict[str, object]]] = []
    association_records: list[dict[str, Any]] = []
    tract_records = tracts.get("tracts")
    if not isinstance(tract_records, list) or len(tract_records) != 8:
        raise ContractError("endpoint association input must contain eight tracts")
    for tract in tract_records:
        output_tract = {"id": tract.get("id"), "L": [], "R": []}
        for hemisphere in ("L", "R"):
            fibres = tract.get(hemisphere)
            if not isinstance(fibres, list) or len(fibres) != 180:
                raise ContractError(f"endpoint tract group must contain 180 fibres: {tract.get('id')}:{hemisphere}")
            for fibre_index, fibre in enumerate(fibres):
                points = _require_fibre(fibre, 40, f"{tract.get('id')}:{hemisphere}:{fibre_index}")
                point_count.extend((points[0], points[-1]))
                pair: list[dict[str, object]] = []
                output_tract[hemisphere].append(pair)
                pair_targets.append(pair)
        association_records.append(output_tract)

    swm_fibres = swm.get("fibres")
    if swm.get("n") != 15000 or swm.get("np") != 8 or not isinstance(swm_fibres, list) or len(swm_fibres) != 15000:
        raise ContractError("endpoint SWM input must contain 15,000 eight-point fibres")
    swm_pairs: list[list[dict[str, object]]] = []
    hemispheres: list[str] = []
    for fibre_index, fibre in enumerate(swm_fibres):
        points = _require_fibre(fibre, 8, f"swm:{fibre_index}")
        point_count.extend((points[0], points[-1]))
        pair = []
        swm_pairs.append(pair)
        pair_targets.append(pair)
        hemispheres.append("R" if float(np.mean(points[:, 0], dtype=np.float64)) >= 0 else "L")

    classified = classify_points(
        np.asarray(point_count, dtype=np.float64),
        label_index,
        label_to_entity,
        max_distance_mm=float(parameters["maxDistanceMm"]),
        ambiguity_margin_mm=float(parameters["ambiguityMarginMm"]),
    )
    if len(classified) != len(pair_targets) * 2:
        raise ContractError("endpoint classification count drift")
    for pair_index, pair in enumerate(pair_targets):
        pair.extend(classified[pair_index * 2:pair_index * 2 + 2])

    all_association_pairs = [
        pair
        for tract in association_records
        for hemisphere in ("L", "R")
        for pair in tract[hemisphere]
    ]
    all_pairs = all_association_pairs + swm_pairs
    preset_summaries = []
    for preset in preset_records:
        included = {"association": 0, "swm": 0, "total": 0, "L": 0, "R": 0}
        included_pairs: list[list[EndpointAssignment]] = []
        for tract in association_records:
            for hemisphere in ("L", "R"):
                for pair in tract[hemisphere]:
                    if _fibre_matches(pair, preset["query"]):
                        included_pairs.append(pair)
                        included["association"] += 1
                        included["total"] += 1
                        included[hemisphere] += 1
        for pair, hemisphere in zip(swm_pairs, hemispheres, strict=True):
            if _fibre_matches(pair, preset["query"]):
                included_pairs.append(pair)
                included["swm"] += 1
                included["total"] += 1
                included[hemisphere] += 1
        preset_summaries.append({
            "id": preset["id"],
            "included": included,
            "includedQuality": _quality_counts(included_pairs),
            "populationQuality": _quality_counts(all_pairs),
        })

    candidate_table, compact_association, compact_swm = _compact_records(
        association_records, swm_pairs, entity_ids
    )
    compact_swm["hemispheres"] = "".join(hemispheres)
    payload = {
        "schemaVersion": 1,
        "space": {
            "atlas": "MNI152NLin2009cAsym RAS millimetres",
            "atlasGrid": {
                "shape": [int(value) for value in labels.shape],
                "affine": affine.tolist(),
                "qformCode": int(qform_code),
                "sformCode": int(sform_code),
            },
            "association": tracts.get("space"),
            "swm": swm.get("space"),
            "relationship": "common RAS world coordinates; no 2009a-to-2009c template warp or voxel-grid equivalence",
        },
        "method": {
            "atlas": "Jülich-Brain v3.0.3 categorical maximum-probability map",
            "assignment": "nearest nonzero MPM voxel centre in RAS world millimetres",
            "maxDistanceMm": float(parameters["maxDistanceMm"]),
            "ambiguityMarginMm": float(parameters["ambiguityMarginMm"]),
            "distanceUnit": "hundredths-of-a-millimetre",
            "probability": "unavailable-categorical-mpm",
            "endpointSemantics": "unordered-geometry-not-polarity",
            "coordinatePrecisionLimit": "classification uses displayed resampled endpoints rounded to 0.1 mm",
        },
        "inputs": [
            {
                "id": "julich-mpm",
                "path": source_record["filename"],
                "bytes": int(source_record["bytes"]),
                "sha256": source_record["sha256"],
            },
            *[
                {
                    "id": Path(record["path"]).stem,
                    "path": record["path"],
                    "bytes": int(record["bytes"]),
                    "sha256": record["sha256"],
                }
                for record in parameters["repositoryInputs"]
            ],
        ],
        "statuses": list(STATUS_DEFINITIONS),
        "entities": [None, *entity_ids],
        "candidateSets": candidate_table,
        "counts": {
            "associationFibres": len(all_association_pairs),
            "swmFibres": len(swm_pairs),
            "endpoints": len(classified),
            "fibreQuality": _quality_counts(all_pairs),
        },
        "presets": preset_summaries,
        "association": compact_association,
        "swm": compact_swm,
    }
    serialized = json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(",", ":"))
    output_path.write_text(serialized, encoding="utf-8", newline="\n")
    return {
        "associationFibres": len(all_association_pairs),
        "swmFibres": len(swm_pairs),
        "endpoints": len(classified),
        "knownFibres": payload["counts"]["fibreQuality"]["known"],
        "unknownFibres": payload["counts"]["fibreQuality"]["unknown"],
        "ambiguousFibres": payload["counts"]["fibreQuality"]["ambiguous"],
    }
