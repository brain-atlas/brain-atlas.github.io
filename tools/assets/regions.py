"""Deterministic Jülich region mesh generation."""

from __future__ import annotations

import json
from pathlib import Path
import re
from typing import Any
import xml.etree.ElementTree as ET

import fast_simplification
import numpy as np
from scipy.ndimage import gaussian_filter
from skimage import measure

from .common import ContractError
from .cortex import load_nifti_with_matching_forms


def _catalog_slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def build_julich_catalog(
    xml_path: Path,
    hierarchy_path: Path,
    featured_regions: list[dict[str, Any]],
    unresolved_atlas_ids: dict[str, str],
    *,
    expected_regions: int = 157,
) -> list[dict[str, Any]]:
    """Build source-bound region records from licensed Jülich terminology."""

    root = ET.parse(Path(xml_path)).getroot()
    structures = root.find("Structures")
    if root.tag != "JulichBrainAtlas" or root.get("version") != "3.0" or structures is None:
        raise ContractError("Jülich XML identity differs from v3.0")
    xml_records = list(structures.findall("Structure"))
    if int(structures.get("numStructures", "-1")) != expected_regions or len(xml_records) != expected_regions:
        raise ContractError(f"Jülich XML must contain {expected_regions} structures")

    hierarchy = json.loads(Path(hierarchy_path).read_text(encoding="utf-8"))
    properties = hierarchy.get("properties", {})
    if properties.get("version") != "3.0" or not isinstance(properties.get("regions"), list):
        raise ContractError("Jülich hierarchy identity differs from v3.0")
    hierarchy_leaves: dict[str, list[tuple[str, list[str]]]] = {}

    def visit(node: dict[str, Any], parents: list[str]) -> None:
        if not isinstance(node, dict) or not isinstance(node.get("name"), str) or not isinstance(node.get("children"), list):
            raise ContractError("Jülich hierarchy node has an invalid shape")
        if node["children"]:
            for child in node["children"]:
                visit(child, [*parents, node["name"]])
            return
        atlas_id = node.get("arealabel")
        if not isinstance(atlas_id, str) or not atlas_id:
            raise ContractError(f"Jülich hierarchy leaf has no arealabel: {node['name']}")
        hierarchy_leaves.setdefault(node["name"], []).append((atlas_id, parents))

    for region in properties["regions"]:
        visit(region, [])

    featured_by_label = {int(record["leftLabel"]): record for record in featured_regions}
    if len(featured_by_label) != len(featured_regions):
        raise ContractError("featured Jülich labels must be unique")
    records = []
    seen_ids: set[str] = set()
    seen_labels: set[int] = set()
    for structure in xml_records:
        source_name = (structure.text or "").strip()
        try:
            left_label = int(structure.attrib["leftgrayvalue"])
            right_label = int(structure.attrib["rightgrayvalue"])
            xml_id = structure.attrib["id"]
        except (KeyError, ValueError) as error:
            raise ContractError("Jülich XML structure identity is invalid") from error
        if not source_name or left_label in seen_labels or right_label != left_label + 1000:
            raise ContractError(f"invalid Jülich bilateral structure: {source_name or left_label}")
        seen_labels.add(left_label)

        leaves = hierarchy_leaves.get(source_name, [])
        atlas_ids = {atlas_id for atlas_id, _path in leaves}
        if len(atlas_ids) > 1:
            raise ContractError(f"Jülich hierarchy disagrees on arealabel: {source_name}")
        hierarchy_paths = [path for _atlas_id, path in leaves]
        if leaves:
            atlas_id = next(iter(atlas_ids))
            hierarchy_status = "mapped"
        else:
            atlas_id = unresolved_atlas_ids.get(str(left_label))
            hierarchy_status = "unresolved"
            if not atlas_id:
                raise ContractError(f"unresolved Jülich hierarchy region has no atlas ID: {source_name}")

        featured = featured_by_label.get(left_label)
        renderer_id = featured["id"] if featured else f"julich-{left_label:03d}"
        if renderer_id in seen_ids:
            raise ContractError(f"duplicate Jülich renderer ID: {renderer_id}")
        seen_ids.add(renderer_id)
        rgb = re.fullmatch(r"rgb\((\d+),(\d+),(\d+)\)", structure.attrib.get("color", ""))
        if not rgb or any(int(value) > 255 for value in rgb.groups()):
            raise ContractError(f"invalid Jülich XML color: {source_name}")
        source_color = "#" + "".join(f"{int(value):02x}" for value in rgb.groups())
        gap_map = source_name.endswith(" (GapMap)")
        root_category = hierarchy_paths[0][0] if hierarchy_paths and hierarchy_paths[0] else "unresolved hierarchy"
        records.append({
            "id": renderer_id,
            "entityId": f"region.{renderer_id.replace('_', '-')}",
            "name": featured["name"] if featured else source_name,
            "atlasId": featured["area"] if featured else atlas_id,
            "sourceName": source_name,
            "sourceId": xml_id,
            "leftLabel": left_label,
            "rightLabel": right_label,
            "catalogStatus": "lesson-current" if featured else "atlas-available",
            "gapMap": gap_map,
            "hierarchyStatus": hierarchy_status,
            "hierarchyPaths": hierarchy_paths,
            "stream": featured["stream"] if featured else f"atlas-{_catalog_slug(root_category)}",
            "parent": featured["parent"] if featured else (hierarchy_paths[0][-1] if hierarchy_paths and hierarchy_paths[0] else "Unresolved hierarchy"),
            "color": featured["color"] if featured else source_color,
            "opacity": featured["opacity"] if featured else (0.07 if gap_map else 0.10),
        })
    return records


def _write_obj(path: Path, vertices: np.ndarray, faces: np.ndarray) -> None:
    with path.open("w", encoding="utf-8", newline="\n") as handle:
        for x, y, z in vertices:
            handle.write(f"v {x:.1f} {y:.1f} {z:.1f}\n")
        for a, b, c in faces:
            handle.write(f"f {int(a) + 1} {int(b) + 1} {int(c) + 1}\n")


def _mesh_label(data: np.ndarray, affine: np.ndarray, label: int, max_faces: int) -> tuple[np.ndarray, np.ndarray]:
    mask = np.asarray(data == label, dtype=np.float32)
    if not np.any(mask):
        raise ContractError(f"Jülich label is absent: {label}")
    padded = np.pad(mask, pad_width=2, mode="constant", constant_values=0)
    smoothed = gaussian_filter(
        padded,
        sigma=0.6,
        order=0,
        output=None,
        mode="reflect",
        cval=0.0,
        truncate=4.0,
        radius=None,
        axes=None,
    )
    vertices, faces, _, _ = measure.marching_cubes(
        smoothed,
        level=0.5,
        spacing=(1, 1, 1),
        gradient_direction="descent",
        step_size=1,
        allow_degenerate=True,
        method="lewiner",
        mask=None,
    )
    unpadded = np.asarray(vertices - np.float32(2), dtype=np.float64)
    homogeneous = np.column_stack((unpadded, np.ones(len(unpadded), dtype=np.float64)))
    world_vertices = (affine @ homogeneous.T).T[:, :3]
    output_faces = np.asarray(faces, dtype=np.int32)
    if len(output_faces) > max_faces:
        target_reduction = 1.0 - max_faces / len(output_faces)
        world_vertices, output_faces = fast_simplification.simplify(
            np.asarray(world_vertices, dtype=np.float32),
            output_faces,
            target_reduction=target_reduction,
            agg=7.0,
            verbose=False,
            return_collapses=False,
            lossless=False,
        )
    return np.asarray(world_vertices), np.asarray(output_faces)


def build_regions_from_image(
    input_path: Path,
    output_root: Path,
    catalog: list[dict[str, Any]],
    streams: dict[str, dict[str, Any]],
    *,
    max_faces: int = 6_000,
) -> dict[str, object]:
    output_root = Path(output_root)
    if output_root.is_symlink() or not output_root.is_dir() or any(output_root.iterdir()):
        raise ContractError("region output must be an empty nonsymlink directory")
    image, affine = load_nifti_with_matching_forms(Path(input_path))
    data = np.asarray(image.dataobj)
    if not np.issubdtype(data.dtype, np.integer):
        raise ContractError("Jülich MPM must contain integer labels")

    records = []
    mesh_count = 0
    for region in catalog:
        meshes = {}
        for hemisphere, label_field in (("L", "leftLabel"), ("R", "rightLabel")):
            label = int(region[label_field])
            vertices, faces = _mesh_label(data, affine, label, max_faces)
            filename = f"{region['id']}_{hemisphere}.obj"
            _write_obj(output_root / filename, vertices, faces)
            meshes[hemisphere] = {
                "file": f"data/regions/{filename}",
                "verts": int(len(vertices)),
                "centroid": [round(float(value), 1) for value in np.mean(vertices, axis=0, dtype=np.float64)],
            }
            mesh_count += 1
        records.append({
            "id": region["id"],
            "name": region["name"],
            "area": region["area"],
            "stream": region["stream"],
            "parent": region["parent"],
            "color": region["color"],
            "opacity": region["opacity"],
            "meshes": meshes,
        })

    payload = {
        "space": "MNI152NLin2009cAsym",
        "source": "Julich-Brain v3.0.3 MPM (winner-take-all)",
        "streams": streams,
        "regions": records,
    }
    serialized = json.dumps(payload, ensure_ascii=True, allow_nan=False, indent=1)
    (output_root / "regions.json").write_text(serialized, encoding="utf-8", newline="\n")
    return {"regions": len(records), "meshes": mesh_count}


def build_complete_regions_from_image(
    input_path: Path,
    output_root: Path,
    catalog: list[dict[str, Any]],
    streams: dict[str, dict[str, Any]],
    *,
    max_faces: int = 6_000,
    legacy_regions: list[dict[str, Any]] | None = None,
) -> dict[str, object]:
    """Generate all source regions while retaining the exact legacy manifest projection."""

    output_root = Path(output_root)
    if output_root.is_symlink() or not output_root.is_dir() or any(output_root.iterdir()):
        raise ContractError("region output must be an empty nonsymlink directory")
    image, affine = load_nifti_with_matching_forms(Path(input_path))
    data = np.asarray(image.dataobj)
    if not np.issubdtype(data.dtype, np.integer):
        raise ContractError("Jülich MPM must contain integer labels")

    complete_records = []
    for region in catalog:
        meshes = {}
        for hemisphere, label_field in (("L", "leftLabel"), ("R", "rightLabel")):
            vertices, faces = _mesh_label(data, affine, int(region[label_field]), max_faces)
            filename = f"{region['id']}_{hemisphere}.obj"
            _write_obj(output_root / filename, vertices, faces)
            meshes[hemisphere] = {
                "file": f"data/regions/{filename}",
                "verts": int(len(vertices)),
                "centroid": [round(float(value), 1) for value in np.mean(vertices, axis=0, dtype=np.float64)],
            }
        complete_records.append({**region, "meshes": meshes})

    complete_by_id = {record["id"]: record for record in complete_records}
    current_records = (
        [complete_by_id[region["id"]] for region in legacy_regions]
        if legacy_regions is not None
        else [record for record in complete_records if record["catalogStatus"] == "lesson-current"]
    )
    legacy_payload = {
        "space": "MNI152NLin2009cAsym",
        "source": "Julich-Brain v3.0.3 MPM (winner-take-all)",
        "streams": streams,
        "regions": [{
            "id": region["id"],
            "name": region["name"],
            "area": region["atlasId"],
            "stream": region["stream"],
            "parent": region["parent"],
            "color": region["color"],
            "opacity": region["opacity"],
            "meshes": region["meshes"],
        } for region in current_records],
    }
    complete_payload = {
        "schemaVersion": 1,
        "space": "MNI152NLin2009cAsym",
        "source": {
            "atlas": "Jülich-Brain",
            "version": "3.0.3",
            "map": "categorical maximum-probability map",
        },
        "coverage": {
            "kind": "complete-base-region-vocabulary",
            "nonJulichDomains": "unsupported",
        },
        "hierarchy": {
            "status": "partial-licensed-source",
            "mappedRegions": sum(record["hierarchyStatus"] == "mapped" for record in complete_records),
            "pathOccurrences": sum(len(record["hierarchyPaths"]) for record in complete_records),
            "unresolvedRegions": sum(record["hierarchyStatus"] == "unresolved" for record in complete_records),
        },
        "streams": streams,
        "regions": complete_records,
    }
    for filename, payload in (("regions.json", legacy_payload), ("julich_regions.json", complete_payload)):
        serialized = json.dumps(payload, ensure_ascii=True, allow_nan=False, indent=1) + "\n"
        (output_root / filename).write_text(serialized, encoding="utf-8", newline="\n")
    return {
        "regions": len(complete_records),
        "meshes": len(complete_records) * 2,
        "lessonCurrentRegions": len(current_records),
    }
