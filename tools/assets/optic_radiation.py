"""Optic-radiation preparation and post-processing."""

from __future__ import annotations

from dataclasses import dataclass
import gzip
import json
import tempfile
from pathlib import Path

import nibabel as nib
from nibabel.streamlines.trk import get_affine_trackvis_to_rasmm
import numpy as np

from .common import ContractError, resample_contour
from .cortex import load_nifti_with_matching_forms


def write_binary_nifti(data: np.ndarray, affine: np.ndarray, output_path: Path) -> None:
    output_path = Path(output_path)
    if output_path.exists():
        raise ContractError(f"derived NIfTI already exists: {output_path.name}")
    binary = np.asarray(data, dtype=np.dtype("<u1"))
    image = nib.Nifti1Image(binary, np.asarray(affine, dtype=np.float64))
    image.header.set_sform(affine, code=4)
    image.header.set_qform(affine, code=4)
    nib.save(image, output_path)


def _finite_threshold(parent: np.ndarray, fraction: float, label: str) -> np.ndarray:
    values = np.asarray(parent, dtype=np.float64)
    if not np.all(np.isfinite(values)):
        raise ContractError(f"{label} parent contains non-finite values")
    maximum = float(np.max(values))
    if maximum <= 0.0:
        raise ContractError(f"{label} parent has no positive maximum")
    return values >= fraction * maximum


@dataclass(frozen=True)
class LoadedTrackvis:
    streamlines: list[np.ndarray]
    header: dict
    effective_affine: np.ndarray
    compressed: bool


EXPECTED_EFFECTIVE_AFFINE = np.array([
    [-1.0, 0.0, 0.0, 80.0],
    [0.0, -1.0, 0.0, 82.0],
    [0.0, 0.0, 1.0, -72.5],
    [0.0, 0.0, 0.0, 1.0],
], dtype=np.float64)


def _validate_registered_trackvis_header(header: dict, effective_affine: np.ndarray) -> None:
    expected_arrays = {
        "dimensions": np.array([160, 200, 160], dtype=np.int16),
        "voxel_sizes": np.array([1.0, 1.0, 1.0], dtype=np.float32),
        "origin": np.array([0.0, 0.0, 0.0], dtype=np.float32),
        "voxel_to_rasmm": np.array([
            [-1.0, 0.0, 0.0, 79.5],
            [0.0, -1.0, 0.0, 81.5],
            [0.0, 0.0, 1.0, -72.0],
            [0.0, 0.0, 0.0, 1.0],
        ], dtype=np.float32),
        "image_orientation_patient": np.array([1.0, 0.0, 0.0, 0.0, 1.0, 0.0], dtype=np.float32),
    }
    for field, expected in expected_arrays.items():
        if not np.array_equal(np.asarray(header[field], dtype=expected.dtype), expected):
            raise ContractError(f"TrackVis {field} differs from the registered header")
    expected_scalars = {
        "voxel_order": b"LPS",
        "invert_x": b"",
        "invert_y": b"",
        "invert_z": b"",
        "swap_xy": b"",
        "swap_yz": b"",
        "swap_zx": b"",
        "version": 2,
        "hdr_size": 1000,
        "nb_scalars_per_point": 0,
        "nb_properties_per_streamline": 0,
    }
    for field, expected in expected_scalars.items():
        actual = header[field].item() if isinstance(header[field], np.generic) else header[field]
        if actual != expected:
            raise ContractError(f"TrackVis {field} differs from the registered header")
    if header["endianness"] != "<" or not np.array_equal(effective_affine, EXPECTED_EFFECTIVE_AFFINE):
        raise ContractError("TrackVis byte order or effective RAS+ affine differs from the registered header")


def load_trackvis(path: Path, *, require_registered_header: bool = True) -> LoadedTrackvis:
    path = Path(path)
    payload = path.read_bytes()
    compressed = payload[:2] == b"\x1f\x8b"
    if compressed:
        try:
            payload = gzip.decompress(payload)
        except (gzip.BadGzipFile, OSError) as error:
            raise ContractError("tracked input has invalid gzip data") from error
    with tempfile.NamedTemporaryFile(suffix=".trk") as temporary:
        temporary.write(payload)
        temporary.flush()
        try:
            loaded = nib.streamlines.load(temporary.name, lazy_load=False)
        except Exception as error:
            raise ContractError("tracked input is not valid TrackVis") from error
        effective_affine = np.asarray(get_affine_trackvis_to_rasmm(loaded.header), dtype=np.float64)
        if require_registered_header:
            _validate_registered_trackvis_header(loaded.header, effective_affine)
        streamlines = [np.ascontiguousarray(np.asarray(points, dtype=np.float64)) for points in loaded.streamlines]
        if any(not np.all(np.isfinite(points)) for points in streamlines):
            raise ContractError("tracked input contains non-finite coordinates")
        return LoadedTrackvis(streamlines, dict(loaded.header), effective_affine, compressed)


OR_SPACE = {
    "template": "ICBM152 nonlinear 2009a",
    "templateVariantEvidence": "asymmetric indicated by release-companion T1; exact FIB build binding unavailable",
    "coordinateConvention": "RAS+",
    "units": "mm",
    "templateConversion": "none; decoded source RAS+ frame retained through resampling",
}
OR_SOURCE = (
    "HCP-1065 1 mm FIB, release hcp1065; DSI Studio left V1-to-LGN retracking "
    "with 2009c Jülich ROI masks; 64-point arc-length resampling; 3 streamlines "
    "removed by the project's >18 mm V1-centroid rule"
)


def postprocess_or_trackvis(
    tracked_path: Path,
    output_path: Path,
    *,
    point_count: int = 64,
    centroid: np.ndarray = np.array([-12.3, -92.7, 1.1], dtype=np.float64),
    max_distance: float = 18.0,
    require_registered_header: bool = True,
) -> dict[str, int]:
    output_path = Path(output_path)
    if output_path.exists():
        raise ContractError("OR post-processing output already exists")
    loaded = load_trackvis(tracked_path, require_registered_header=require_registered_header)
    retained = []
    for streamline in loaded.streamlines:
        resampled = resample_contour(streamline, point_count)
        rounded = [[round(float(value), 2) for value in point] for point in resampled]
        first, last = rounded[0], rounded[-1]
        v1_endpoint = first if first[1] <= last[1] else last
        distance = np.linalg.norm(
            np.asarray(v1_endpoint, dtype=np.float64) - np.asarray(centroid, dtype=np.float64)
        )
        if distance <= max_distance:
            retained.append(rounded)
    payload = {
        "n": len(retained),
        "np": point_count,
        "space": OR_SPACE,
        "fibres": retained,
        "source": OR_SOURCE,
    }
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(", ", ": ")),
        encoding="utf-8",
        newline="\n",
    )
    return {
        "inputFibres": len(loaded.streamlines),
        "retained": len(retained),
        "removed": len(loaded.streamlines) - len(retained),
    }


def prepare_or_masks(v1_path: Path, lgn_path: Path, output_root: Path) -> dict[str, int]:
    output_root = Path(output_root)
    if output_root.is_symlink() or not output_root.is_dir() or any(output_root.iterdir()):
        raise ContractError("OR preparation output must be an empty nonsymlink directory")
    v1_image, v1_affine = load_nifti_with_matching_forms(Path(v1_path))
    lgn_image, lgn_affine = load_nifti_with_matching_forms(Path(lgn_path))
    if v1_image.shape != lgn_image.shape or not np.array_equal(v1_affine, lgn_affine):
        raise ContractError("OR parent maps have different grids")
    v1_mask = _finite_threshold(np.asarray(v1_image.dataobj), 0.25, "V1")
    lgn_mask = _finite_threshold(np.asarray(lgn_image.dataobj), 0.10, "LGN")
    write_binary_nifti(v1_mask, v1_affine, output_root / "v1_L_mni.nii.gz")
    write_binary_nifti(lgn_mask, lgn_affine, output_root / "lgn_L_mni.nii.gz")
    return {"v1Voxels": int(np.count_nonzero(v1_mask)), "lgnVoxels": int(np.count_nonzero(lgn_mask))}
