#!/usr/bin/env python3
"""Reproduce fibre provenance checks without launching DSI Studio.

Large third-party and recovered intermediates are supplied explicitly and are never
copied into the repository. Run with the uv package versions recorded by the audit:

  uv run --with nibabel==5.4.2 --with numpy==2.5.1 --with scipy==1.18.0 \
    python .pi/research/2026-07-22-tract-space-provenance/verify.py ...
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import tempfile
import zipfile
from pathlib import Path

import nibabel as nib
import numpy as np
import scipy
from nibabel.processing import resample_from_to
from nibabel.streamlines.trk import get_affine_trackvis_to_rasmm
from scipy.io import loadmat
from scipy.ndimage import binary_dilation
from scipy.spatial import cKDTree

EXPECTED = {
    "tracts_original": "3e6dc53d97367435fa806435970cd78cc17f81ec51c4ace40f71b3ea5e98abef",
    "or_original": "3516ddc59881ab1303b0da4e795a94dd47940181cbdf2d6e1e59e999577004c6",
    "swm_original": "e367886be8905e4036a9159cb1c6b6b9b32f5a78fde7b4e926cd6876792e8372",
    "tracts_current": "568d8848a6dfe4cb859d9c7ec8e572a90cf0d71d0b7c741c4a1e1e2e4471b213",
    "or_current": "1ca89796c621963388f635bd31ab0bd9a28eec7917de6c12ef8b68d469da4144",
    "swm_current": "81529a410c9053731416124e346dce21e85d96c85fb8b3bad151735a4b1f81fb",
    "tracts_payload": "e2c1486875de14e39f4b1a047db9841e4253b334fecf80c1ef55c255df940c70",
    "or_payload": "b89152176bd9a96796a02e449a4a34151572512def61014d04833336b6695b6e",
    "swm_payload": "9dfc14d565c8f7ccb4c57ba0d2eee1bd9dca0549e3c7d07f70d6fe47f07f4331",
    "fib_gzip": "3e74089f3e423405ce37a4de08e0e291355ba89463fe39c683cd1c0099a43df7",
    "tract_archive": "344aad4394f18b8926ed5e1bda911ad56e328c6cf75faa45e1302512ad779c67",
    "hcp_reference_t1": "7d60a9605d76da983d0c491ed691fc11a8e212ddb12fbbae119bdb393a01249d",
    "mni09a_asym_t1": "27e8d475116372b118372d9a2b3fdeaa3e658858731767e16a6ed0cae437363a",
    "mni09a_sym_t1": "6fe69845e234c9e4ca54564f13a5ad214746970a5a1a0eedb4a23d9af59ba8a5",
    "mni09c_asym_t1": "67fe8b2e8fed7fa318d293e79a31416f5b31d70f0330312f58125fcd3dde43a1",
    "or_intermediate": "60799f23977e938411ffc127083d5220e503c4a112b28f4ea14d46d3c01041d0",
    "swm_intermediate": "4c79821a3295a66ba07f4f70c1a27191818715f42edcc30dfc632c36a81a4a3f",
    "lgn_parent": "50e64d27c70cd4242a9e3042eee1e28abf437dbe7cccbd08f1946ded72ef9a2a",
    "v1_parent": "950344acd8428aeacaabc300cfbf48ddcadf843c179dabc6c6a7777f69110a16",
    "lgn_mask": "b40368a68f5dd060ff0e62c5eabbd85bcda1b88fddaf1e40b2074e281a3982ac",
    "v1_mask": "029100d76aaf6421c0949aecd378a102f8befc96f23b0b9817935619e62b7ba6",
    "gm": "662b18e83dddc554b19c621d9750af3454b54d4e103df03633eacced3884805a",
    "wm": "b2f80e29f5a1ef55325215d1716ef611f5b1a3cd97b4a49ef4e9564e9564e945",
    "swm_seed": "6589abdcecef64fb7b32e79f6ffe199b0a16fb011a10eb7f14d77c49548fce12",
}

TRACTS = [
    ("ilf", "ILF", "ventral", "#ff9d5c"),
    ("ifof", "IFOF", "ventral", "#ff7a45"),
    ("slf1", "SLF I", "dorsal", "#5ec8e0"),
    ("slf2", "SLF II", "dorsal", "#4aa8ff"),
    ("slf3", "SLF III", "dorsal", "#6e9cff"),
    ("vof", "VOF", "dorsal", "#59d0c0"),
    ("af", "Arcuate", "dorsal", "#9d8bff"),
    ("mdlf", "MdLF", "dorsal", "#3fd0b0"),
]
TRACT_MEMBER = {
    "ilf": "ILF", "ifof": "IFOF", "slf1": "SLF1", "slf2": "SLF2",
    "slf3": "SLF3", "vof": "VOF", "af": "AF", "mdlf": "MdLF",
}


def sha_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def json_bytes(value) -> bytes:
    """Match the original generators' default json.dump formatting."""
    return json.dumps(value).encode()


def resample(streamline, count: int):
    points = np.asarray(streamline, dtype=float)
    distance = np.r_[0, np.cumsum(np.linalg.norm(np.diff(points, axis=0), axis=1))]
    if distance[-1] == 0:
        return np.repeat(points[:1], count, axis=0)
    target = np.linspace(0, distance[-1], count)
    return np.column_stack([
        np.interp(target, distance, points[:, axis]) for axis in range(3)
    ])


def load_trk_bytes(raw: bytes):
    with tempfile.NamedTemporaryFile(suffix=".trk") as handle:
        handle.write(raw)
        handle.flush()
        return [np.asarray(item, dtype=float) for item in nib.streamlines.load(handle.name).streamlines]


def reproduce_association(archive_path: Path):
    rng = np.random.default_rng(0)
    output = []
    with zipfile.ZipFile(archive_path) as archive:
        for tract_id, label, stream, color in TRACTS:
            fibres = {}
            for hemi in ("L", "R"):
                member = f"association/{TRACT_MEMBER[tract_id]}_{hemi}.trk.gz"
                streamlines = load_trk_bytes(gzip.decompress(archive.read(member)))
                selected = rng.permutation(len(streamlines))[: min(180, len(streamlines))]
                polylines = []
                for index in selected:
                    points = resample(streamlines[index], 40)
                    if points[0][1] > points[-1][1]:
                        points = points[::-1]
                    polylines.append([
                        [round(float(value), 1) for value in point] for point in points
                    ])
                fibres[hemi] = polylines
            output.append({
                "id": tract_id, "name": label, "stream": stream, "color": color,
                "np": 40, "L": fibres["L"], "R": fibres["R"],
            })
    original = {
        "space": "MNI152NLin2009cAsym",
        "source": "HCP-1065 atlas association tracts (Yeh 2022)",
        "tracts": output,
    }
    return output, sha_bytes(json_bytes(original))


def reproduce_or(intermediate_path: Path):
    streamlines = nib.streamlines.load(str(intermediate_path)).streamlines
    fibres = [
        [[round(float(value), 2) for value in point] for point in resample(item, 64)]
        for item in streamlines
    ]
    original = {
        "n": len(fibres), "np": 64, "fibres": fibres,
        "source": "HCP1065 ICBM152_adult FIB (Yeh 2022); DSI Studio tracking seed=Julich hOc1(V1) end=Julich CGL(LGN); arc-length resampled to 64 pts",
    }
    v1_centroid = np.array([-12.3, -92.7, 1.1])

    def v1_endpoint(fibre):
        first, last = np.asarray(fibre[0]), np.asarray(fibre[-1])
        return last if last[1] < first[1] else first

    retained = [
        fibre for fibre in fibres
        if np.linalg.norm(v1_endpoint(fibre) - v1_centroid) <= 18.0
    ]
    removed = len(fibres) - len(retained)
    original["fibres"] = retained
    original["n"] = len(retained)
    original["source"] += (
        f" ; pruned {removed} aberrant V1-terminations (>18mm from V1 centroid)"
    )
    return retained, removed, sha_bytes(json_bytes(original))


def nifti_mask_points(path: Path):
    image = nib.load(str(path))
    indices = np.argwhere(np.asanyarray(image.dataobj) > 0)
    return image, nib.affines.apply_affine(image.affine, indices)


def reproduce_swm(intermediate_path: Path, gm_path: Path):
    gm_image = nib.load(str(gm_path))
    gm = np.asanyarray(gm_image.dataobj)
    cortical = binary_dilation(gm > 0.40, iterations=1)
    inverse = np.linalg.inv(gm_image.affine)
    shape = cortical.shape

    def is_cortical(point):
        voxel = inverse @ np.r_[point, 1.0]
        i, j, k = (int(round(voxel[0])), int(round(voxel[1])), int(round(voxel[2])))
        return (
            0 <= i < shape[0] and 0 <= j < shape[1] and 0 <= k < shape[2]
            and bool(cortical[i, j, k])
        )

    all_cortical_lengths = []
    points = []
    lengths = []
    centroids = []
    for streamline in nib.streamlines.load(str(intermediate_path)).streamlines:
        streamline = np.asarray(streamline, dtype=float)
        length = np.linalg.norm(np.diff(streamline, axis=0), axis=1).sum()
        if not (is_cortical(streamline[0]) and is_cortical(streamline[-1])):
            continue
        all_cortical_lengths.append(length)
        if not 8.0 <= length <= 55.0:
            continue
        sampled = resample(streamline, 8)
        points.append(sampled)
        lengths.append(length)
        centroids.append(sampled.mean(axis=0))

    lengths = np.asarray(lengths)
    centroids = np.asarray(centroids)
    tree = cKDTree(centroids)
    selected = np.random.default_rng(0).permutation(len(points))[:15000]
    local_lengths = []
    for index in selected:
        neighbours = tree.query_ball_point(centroids[index], 7.0)
        local_lengths.append(lengths[neighbours].mean() if neighbours else lengths[index])

    fibres = [
        [[round(float(value), 1) for value in point] for point in points[index]]
        for index in selected
    ]
    original = {
        "n": len(selected), "np": 8, "space": "ICBM152/MNI152",
        "source": "HCP-1065 FIB, superficial-WM short fibres (80mm re-track, both endpoints in cortical ribbon)",
        "len": [round(float(lengths[index]), 1) for index in selected],
        "lloc": [round(float(value), 1) for value in local_lengths],
        "fibres": fibres,
    }
    selected_unrounded = np.asarray([points[index] for index in selected])
    return original, selected_unrounded, len(all_cortical_lengths), len(points), sha_bytes(json_bytes(original))


def centered_fit(source, target):
    source_centered = source - source.mean()
    target_centered = target - target.mean()
    slope = float(source_centered @ target_centered / (source_centered @ source_centered))
    intercept = float(target.mean() - slope * source.mean())
    residual = target - (slope * source + intercept)
    return {
        "correlation": float(np.corrcoef(source, target)[0, 1]),
        "slope": slope,
        "intercept": intercept,
        "residualRmse": float(np.sqrt(np.mean(residual ** 2))),
        "residualMaxAbsolute": float(np.max(np.abs(residual))),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo", type=Path, required=True)
    parser.add_argument("--scratch", type=Path, required=True)
    parser.add_argument("--tract-archive", type=Path, required=True)
    parser.add_argument("--fib", type=Path, required=True)
    parser.add_argument("--hcp-reference-t1", type=Path, required=True)
    parser.add_argument("--mni09a-asym-t1", type=Path, required=True)
    parser.add_argument("--mni09a-sym-t1", type=Path, required=True)
    parser.add_argument("--mni09c-asym-t1", type=Path, required=True)
    args = parser.parse_args()

    repo = args.repo.resolve()
    scratch = args.scratch.resolve()
    tracts = json.loads((repo / "public/data/tracts.json").read_text())
    optic = json.loads((repo / "public/data/or_fibres.json").read_text())
    swm = json.loads((repo / "public/data/swm_fibres.json").read_text())

    association_output, association_hash = reproduce_association(args.tract_archive)
    or_output, or_removed, or_hash = reproduce_or(scratch / "or_retrack_L.trk")
    swm_original, swm_unrounded, swm_cortical, swm_eligible, swm_hash = reproduce_swm(
        scratch / "swm_fibres3_plain.trk", scratch / "mni_gm.nii.gz"
    )

    source_paths = {
        "tracts_current": repo / "public/data/tracts.json",
        "or_current": repo / "public/data/or_fibres.json",
        "swm_current": repo / "public/data/swm_fibres.json",
        "fib_gzip": args.fib,
        "tract_archive": args.tract_archive,
        "hcp_reference_t1": args.hcp_reference_t1,
        "mni09a_asym_t1": args.mni09a_asym_t1,
        "mni09a_sym_t1": args.mni09a_sym_t1,
        "mni09c_asym_t1": args.mni09c_asym_t1,
        "or_intermediate": scratch / "or_retrack_L.trk",
        "swm_intermediate": scratch / "swm_fibres3_plain.trk",
        "lgn_parent": scratch / "lgn_CGL_L.nii.gz",
        "v1_parent": scratch / "v1_hOc1_L.nii.gz",
        "lgn_mask": scratch / "lgn_L_mni.nii.gz",
        "v1_mask": scratch / "v1_L_mni.nii.gz",
        "gm": scratch / "mni_gm.nii.gz",
        "wm": scratch / "mni_wm.nii.gz",
        "swm_seed": scratch / "swm_shell_mni.nii.gz",
    }
    source_hashes = {name: sha_file(path) for name, path in source_paths.items()}
    for name, actual in source_hashes.items():
        if actual != EXPECTED[name]:
            raise RuntimeError(f"{name} hash mismatch: {actual} != {EXPECTED[name]}")
    for label, actual, expected in [
        ("association original", association_hash, EXPECTED["tracts_original"]),
        ("OR original", or_hash, EXPECTED["or_original"]),
        ("SWM original", swm_hash, EXPECTED["swm_original"]),
    ]:
        if actual != expected:
            raise RuntimeError(f"{label} hash mismatch: {actual} != {expected}")

    if association_output != tracts["tracts"]:
        raise RuntimeError("association coordinate payload changed")
    if or_output != optic["fibres"]:
        raise RuntimeError("optic-radiation coordinate payload changed")
    if any(swm_original[key] != swm[key] for key in ("n", "np", "len", "lloc", "fibres")):
        raise RuntimeError("SWM geometry/length payload changed")
    # These are JavaScript JSON.stringify hashes enforced independently by the Node test.
    payload_hashes = {
        "association": EXPECTED["tracts_payload"],
        "opticRadiation": EXPECTED["or_payload"],
        "swm": EXPECTED["swm_payload"],
    }

    hcp = nib.load(str(args.hcp_reference_t1))
    asym = nib.load(str(args.mni09a_asym_t1))
    sym = nib.load(str(args.mni09a_sym_t1))
    if hcp.shape != asym.shape or not np.allclose(hcp.affine, asym.affine):
        raise RuntimeError("HCP companion T1 does not share the official asymmetric grid")
    hcp_data = hcp.get_fdata(dtype=np.float64)
    comparison = {}
    for name, image in [("asymmetric", asym), ("symmetric", sym)]:
        values = image.get_fdata(dtype=np.float64)
        mask = (hcp_data > 0) & (values > 0)
        comparison[name] = centered_fit(values[mask], hcp_data[mask])

    mni09c = nib.load(str(args.mni09c_asym_t1))
    resampled09a = resample_from_to(asym, (mni09c.shape, mni09c.affine), order=1).get_fdata(dtype=np.float32)
    data09c = mni09c.get_fdata(dtype=np.float32)
    shared = (resampled09a > 0) & (data09c > 0)
    support09a = resampled09a > 1
    support09c = data09c > 1
    support_intersection = int((support09a & support09c).sum())
    identity_world = {
        "correlation": float(np.corrcoef(resampled09a[shared], data09c[shared])[0, 1]),
        "supportThreshold": 1,
        "supportDice": float(2 * support_intersection / (support09a.sum() + support09c.sum())),
        "interpolationOrder": 1,
        "outsideMode": "constant zero",
    }

    def form_record(image):
        qform, qcode = image.get_qform(coded=True)
        sform, scode = image.get_sform(coded=True)
        return {
            "shape": list(image.shape), "qformCode": int(qcode), "sformCode": int(scode),
            "formsEqual": bool(np.allclose(qform, sform)), "qform": qform.tolist(), "sform": sform.tolist(),
        }

    def assert_form_state(label, image, expected_code):
        record = form_record(image)
        if record["qformCode"] != expected_code or record["sformCode"] != expected_code:
            raise RuntimeError(f"{label} qform/sform code mismatch")
        if not record["formsEqual"]:
            raise RuntimeError(f"{label} has conflicting qform/sform matrices")
        return record

    lgn_image, lgn_points = nifti_mask_points(scratch / "lgn_L_mni.nii.gz")
    v1_image, v1_points = nifti_mask_points(scratch / "v1_L_mni.nii.gz")
    lgn_parent_image = nib.load(str(scratch / "lgn_CGL_L.nii.gz"))
    v1_parent_image = nib.load(str(scratch / "v1_hOc1_L.nii.gz"))
    lgn_parent = np.asanyarray(lgn_parent_image.dataobj)
    v1_parent = np.asanyarray(v1_parent_image.dataobj)
    expected_lgn_mask = (lgn_parent >= 0.10 * lgn_parent.max()).astype(np.asanyarray(lgn_image.dataobj).dtype)
    expected_v1_mask = (v1_parent >= 0.25 * v1_parent.max()).astype(np.asanyarray(v1_image.dataobj).dtype)
    if not np.array_equal(np.asanyarray(lgn_image.dataobj), expected_lgn_mask):
        raise RuntimeError("final LGN mask does not exactly match the recorded parent threshold")
    if not np.array_equal(np.asanyarray(v1_image.dataobj), expected_v1_mask):
        raise RuntimeError("final V1 mask does not exactly match the recorded parent threshold")
    or_form_records = {
        "lgnParent": assert_form_state("LGN parent", lgn_parent_image, 1),
        "v1Parent": assert_form_state("V1 parent", v1_parent_image, 1),
        "lgnMask": assert_form_state("LGN mask", lgn_image, 4),
        "v1Mask": assert_form_state("V1 mask", v1_image, 4),
    }
    for parent, derived, label in [
        (lgn_parent_image, lgn_image, "LGN"), (v1_parent_image, v1_image, "V1")
    ]:
        if parent.shape != derived.shape or not np.allclose(parent.affine, derived.affine):
            raise RuntimeError(f"{label} derived mask did not retain its parent grid/affine")

    gm_image = nib.load(str(scratch / "mni_gm.nii.gz"))
    wm_image = nib.load(str(scratch / "mni_wm.nii.gz"))
    seed_image = nib.load(str(scratch / "swm_shell_mni.nii.gz"))
    gm = np.asanyarray(gm_image.dataobj)
    wm = np.asanyarray(wm_image.dataobj)
    seed = np.asanyarray(seed_image.dataobj)
    expected_seed = ((wm > 0.5) & binary_dilation(gm > 0.5, iterations=4)).astype(seed.dtype)
    if not np.array_equal(seed, expected_seed):
        raise RuntimeError("SWM seed does not exactly match recorded TemplateFlow parent derivation")
    swm_form_records = {
        "gmParent": assert_form_state("GM parent", gm_image, 4),
        "wmParent": assert_form_state("WM parent", wm_image, 4),
        "seed": assert_form_state("SWM seed", seed_image, 4),
    }
    for parent, label in [(gm_image, "GM"), (wm_image, "WM")]:
        if parent.shape != seed_image.shape or not np.allclose(parent.affine, seed_image.affine):
            raise RuntimeError(f"SWM seed did not retain its {label} parent grid/affine")

    lgn_tree, v1_tree = cKDTree(lgn_points), cKDTree(v1_points)
    or_rows = []
    higher_y_lgn = 0
    for fibre in optic["fibres"]:
        first, last = np.asarray(fibre[0]), np.asarray(fibre[-1])
        first_lgn_last_v1 = lgn_tree.query(first)[0] + v1_tree.query(last)[0]
        last_lgn_first_v1 = lgn_tree.query(last)[0] + v1_tree.query(first)[0]
        if first_lgn_last_v1 <= last_lgn_first_v1:
            lgn_endpoint, v1_endpoint = first, last
        else:
            lgn_endpoint, v1_endpoint = last, first
        higher_y_lgn += int(np.allclose(first if first[1] > last[1] else last, lgn_endpoint))
        best = min(first_lgn_last_v1, last_lgn_first_v1)
        swapped = max(first_lgn_last_v1, last_lgn_first_v1)
        or_rows.append([lgn_tree.query(lgn_endpoint)[0], v1_tree.query(v1_endpoint)[0], best, swapped])
    or_rows = np.asarray(or_rows)

    rounded_swm = np.asarray(swm["fibres"], dtype=float)
    rounding = np.linalg.norm(rounded_swm - swm_unrounded, axis=2)
    rounded_endpoints = rounded_swm[:, [0, -1], :].reshape(-1, 3)
    gm_voxel_centers = nib.affines.apply_affine(gm_image.affine, np.argwhere(gm > 0.40))
    endpoint_distance = cKDTree(gm_voxel_centers).query(rounded_endpoints)[0]

    fib_mat = loadmat(io.BytesIO(gzip.decompress(args.fib.read_bytes())))
    or_trk = nib.streamlines.load(str(scratch / "or_retrack_L.trk"))
    swm_trk = nib.streamlines.load(str(scratch / "swm_fibres3_plain.trk"))
    result = {
        "versions": {"nibabel": nib.__version__, "numpy": np.__version__, "scipy": scipy.__version__},
        "sourceHashes": source_hashes,
        "originalOutputHashes": {"association": association_hash, "opticRadiation": or_hash, "swm": swm_hash},
        "payloadHashes": payload_hashes,
        "fibHeader": {
            "dimension": fib_mat["dimension"].ravel().astype(int).tolist(),
            "voxelSize": fib_mat["voxel_size"].ravel().astype(float).tolist(),
            "rowVectorTrans": fib_mat["trans"].astype(float).tolist(),
        },
        "effectiveTrackvisToRasmm": {
            "opticRadiation": get_affine_trackvis_to_rasmm(or_trk.header).astype(float).tolist(),
            "swm": get_affine_trackvis_to_rasmm(swm_trk.header).astype(float).tolist(),
        },
        "companionT1": comparison,
        "identityWorld09aTo09c": identity_world,
        "orNiftis": or_form_records,
        "swmNiftis": swm_form_records,
        "derivedInputChecks": {
            "lgnMaskExactlyMatchesParentThresholdAndAffine": True,
            "v1MaskExactlyMatchesParentThresholdAndAffine": True,
            "swmSeedExactlyMatchesParentsAndAffine": True,
        },
        "orValidation": {
            "trackedBeforeProjectRule": len(or_output) + or_removed,
            "retained": len(or_output), "removedByCentroidRule": or_removed,
            "higherYIsLgn": higher_y_lgn,
            "lgnVoxelCenterDistance": {
                "median": float(np.median(or_rows[:, 0])), "p95": float(np.percentile(or_rows[:, 0], 95)),
                "max": float(np.max(or_rows[:, 0])),
            },
            "v1VoxelCenterDistance": {
                "median": float(np.median(or_rows[:, 1])), "p95": float(np.percentile(or_rows[:, 1], 95)),
                "max": float(np.max(or_rows[:, 1])),
            },
            "minimumAssignmentMargin": float(np.min(or_rows[:, 3] - or_rows[:, 2])),
        },
        "swmValidation": {
            "tracked": len(swm_trk.streamlines), "bothEndpointsInDilatedRibbon": swm_cortical,
            "eligible8To55mm": swm_eligible, "retained": len(swm_original["fibres"]),
            "roundingDisplacementMaxMm": float(np.max(rounding)),
            "roundedEndpointToGmVoxelCenterDistance": {
                "median": float(np.median(endpoint_distance)),
                "p95": float(np.percentile(endpoint_distance, 95)),
                "max": float(np.max(endpoint_distance)),
            },
        },
    }
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
