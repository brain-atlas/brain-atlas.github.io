"""Deterministic cortical-shell generation."""

from __future__ import annotations

from pathlib import Path

import fast_simplification
import nibabel as nib
import numpy as np
import trimesh
from scipy.ndimage import gaussian_filter
from skimage import measure

from .common import ContractError


def load_nifti_with_matching_forms(path: Path) -> tuple[nib.Nifti1Image, np.ndarray]:
    image = nib.load(path)
    qform, qcode = image.get_qform(coded=True)
    sform, scode = image.get_sform(coded=True)
    if int(qcode) == 0 or int(scode) == 0:
        raise ContractError(f"NIfTI has an unknown qform or sform: {path.name}")
    qform = np.asarray(qform, dtype=np.float64)
    sform = np.asarray(sform, dtype=np.float64)
    if int(qcode) != int(scode) or not np.array_equal(qform, sform):
        raise ContractError(f"NIfTI qform/sform conflict: {path.name}")
    affine = np.asarray(image.affine, dtype=np.float64)
    if not np.array_equal(affine, sform):
        raise ContractError(f"NIfTI selected affine differs from forms: {path.name}")
    return image, affine


def build_cortex_from_image(input_path: Path, output_path: Path, *, target_faces: int = 80_000) -> dict[str, object]:
    input_path = Path(input_path)
    output_path = Path(output_path)
    if output_path.exists() or output_path.suffix != ".glb":
        raise ContractError("cortical output must be a new .glb path")
    image, affine = load_nifti_with_matching_forms(input_path)
    data = np.ascontiguousarray(np.asarray(image.dataobj, dtype=np.float32))
    if not np.all(np.isfinite(data)):
        raise ContractError("cortical mask contains non-finite values")

    smoothed = gaussian_filter(
        data,
        sigma=1.2,
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
    homogeneous = np.column_stack((np.asarray(vertices, dtype=np.float64), np.ones(len(vertices), dtype=np.float64)))
    world_vertices = (affine @ homogeneous.T).T[:, :3]
    output_faces = np.asarray(faces, dtype=np.int32)
    if len(output_faces) > target_faces:
        target_reduction = 1.0 - target_faces / len(output_faces)
        world_vertices, output_faces = fast_simplification.simplify(
            np.asarray(world_vertices, dtype=np.float32),
            output_faces,
            target_reduction=target_reduction,
            agg=7.0,
            verbose=False,
            return_collapses=False,
            lossless=False,
        )

    mesh = trimesh.Trimesh(vertices=world_vertices, faces=output_faces, process=True)
    mesh.fix_normals()
    mesh.export(output_path)
    return {
        "vertices": int(len(mesh.vertices)),
        "faces": int(len(mesh.faces)),
        "bounds": np.asarray(mesh.bounds, dtype=np.float64).tolist(),
    }
