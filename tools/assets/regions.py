"""Deterministic Jülich region mesh generation."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import fast_simplification
import numpy as np
from scipy.ndimage import gaussian_filter
from skimage import measure

from .common import ContractError
from .cortex import load_nifti_with_matching_forms


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
