"""Superficial-white-matter preparation and post-processing."""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np
from scipy.ndimage import binary_dilation, generate_binary_structure
from scipy.spatial import cKDTree

from .common import ContractError, resample_contour
from .cortex import load_nifti_with_matching_forms
from .optic_radiation import OR_SPACE, load_trackvis, write_binary_nifti

SWM_SOURCE = (
    "HCP-1065 1 mm FIB, release hcp1065; DSI Studio 200,000-fibre superficial-WM "
    "retrack from a 2009c sform seed; 15,000 short contours with cortical-ribbon endpoints"
)


def postprocess_swm_trackvis(
    gm_path: Path,
    tracked_path: Path,
    output_path: Path,
    *,
    sample_count: int = 15_000,
    points_per_fibre: int = 8,
    seed: int = 0,
    require_registered_header: bool = True,
) -> dict[str, int]:
    output_path = Path(output_path)
    if output_path.exists():
        raise ContractError("SWM post-processing output already exists")
    gm_image, affine = load_nifti_with_matching_forms(Path(gm_path))
    gm = np.asarray(gm_image.dataobj, dtype=np.float64)
    if not np.all(np.isfinite(gm)):
        raise ContractError("SWM GM parent contains non-finite values")
    ribbon = binary_dilation(
        gm > 0.40,
        structure=generate_binary_structure(3, 1),
        iterations=1,
        border_value=0,
    )
    inverse_affine = np.asarray(np.linalg.inv(affine), dtype=np.float64)
    loaded = load_trackvis(tracked_path, require_registered_header=require_registered_header)

    endpoint_eligible: list[np.ndarray] = []
    for streamline in loaded.streamlines:
        accepted = True
        for endpoint in (streamline[0], streamline[-1]):
            voxel = inverse_affine @ np.array([*endpoint, 1.0], dtype=np.float64)
            index = tuple(int(round(float(component))) for component in voxel[:3])
            if any(component < 0 or component >= ribbon.shape[axis] for axis, component in enumerate(index)):
                accepted = False
                break
            if not ribbon[index]:
                accepted = False
                break
        if accepted:
            endpoint_eligible.append(streamline)

    retained_streamlines: list[np.ndarray] = []
    retained_lengths: list[float] = []
    for streamline in endpoint_eligible:
        segments = np.linalg.norm(np.diff(streamline, axis=0), axis=1)
        length = float(segments.sum(dtype=np.float64))
        if 8.0 <= length <= 55.0:
            retained_streamlines.append(streamline)
            retained_lengths.append(length)
    if len(retained_streamlines) < sample_count:
        raise ContractError("SWM retained population is smaller than the requested sample")

    resampled = [resample_contour(streamline, points_per_fibre) for streamline in retained_streamlines]
    centres = np.asarray([
        np.mean(points, axis=0, dtype=np.float64)
        for points in resampled
    ], dtype=np.float64)
    lengths = np.asarray(retained_lengths, dtype=np.float64)
    tree = cKDTree(
        centres,
        leafsize=16,
        compact_nodes=True,
        copy_data=False,
        balanced_tree=True,
        boxsize=None,
    )
    local_lengths = []
    for centre in centres:
        indices = tree.query_ball_point(
            centre,
            r=7.0,
            p=2.0,
            eps=0,
            workers=1,
            return_sorted=True,
        )
        indices = sorted(int(index) for index in indices)
        if not indices:
            raise ContractError("SWM neighbourhood unexpectedly contains no fibres")
        local_lengths.append(float(np.mean(lengths[np.asarray(indices, dtype=np.int64)], dtype=np.float64)))

    selected = np.random.default_rng(seed).permutation(len(retained_streamlines))[:sample_count]
    output_lengths = [round(float(lengths[int(index)]), 1) for index in selected]
    output_local_lengths = [round(float(local_lengths[int(index)]), 1) for index in selected]
    output_fibres = [
        [[round(float(value), 1) for value in point] for point in resampled[int(index)]]
        for index in selected
    ]
    payload = {
        "n": sample_count,
        "np": points_per_fibre,
        "space": OR_SPACE,
        "source": SWM_SOURCE,
        "len": output_lengths,
        "lloc": output_local_lengths,
        "fibres": output_fibres,
    }
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, allow_nan=False, separators=(", ", ": ")),
        encoding="utf-8",
        newline="\n",
    )
    return {
        "inputFibres": len(loaded.streamlines),
        "endpointEligible": len(endpoint_eligible),
        "lengthEligible": len(retained_streamlines),
        "retainedPopulation": len(retained_streamlines),
        "sampled": sample_count,
    }


def prepare_swm_seed(wm_path: Path, gm_path: Path, output_root: Path) -> dict[str, int]:
    output_root = Path(output_root)
    if output_root.is_symlink() or not output_root.is_dir() or any(output_root.iterdir()):
        raise ContractError("SWM preparation output must be an empty nonsymlink directory")
    wm_image, wm_affine = load_nifti_with_matching_forms(Path(wm_path))
    gm_image, gm_affine = load_nifti_with_matching_forms(Path(gm_path))
    if wm_image.shape != gm_image.shape or not np.array_equal(wm_affine, gm_affine):
        raise ContractError("SWM parent maps have different grids")
    wm = np.asarray(wm_image.dataobj, dtype=np.float64)
    gm = np.asarray(gm_image.dataobj, dtype=np.float64)
    if not np.all(np.isfinite(wm)) or not np.all(np.isfinite(gm)):
        raise ContractError("SWM parent map contains non-finite values")
    connectivity_one = generate_binary_structure(3, 1)
    cortical_band = binary_dilation(
        gm > 0.5,
        structure=connectivity_one,
        iterations=4,
        border_value=0,
    )
    seed = (wm > 0.5) & cortical_band
    write_binary_nifti(seed, wm_affine, output_root / "swm_shell_mni.nii.gz")
    return {"voxels": int(np.count_nonzero(seed))}
