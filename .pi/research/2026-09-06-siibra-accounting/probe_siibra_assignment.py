#!/usr/bin/env python3
"""Offline executable probe of siibra 1.0.1a20 point assignment behavior."""

import argparse
import ast
import hashlib
import importlib.metadata
import inspect
import json
import os
from pathlib import Path
import platform
import socket
import sys
import tempfile
import textwrap
import zipfile

EXPECTED = {
    "siibra_version": "1.0.1a20",
    "siibra_commit": "44549ae595533054135a4d62d567069353027b34",
    "source_sha256": "1926610c0b829a9a1caf25290ce747bacfe290f89f92c37417e45bb9b57e0a81",
    "config_commit": "177023a506eceff008a012bb0a98d7bca0d1bbd5",
    "config_sha256": "f41e45cd2306b645342e7937319bb1302a9d895d57f55cf1c67ffc0bc00a7c90",
}


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_value(value):
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and (value != value or abs(value) == float("inf")):
        return None
    if isinstance(value, (tuple, list)):
        return [json_value(item) for item in value]
    if isinstance(value, dict):
        return {str(key): json_value(item) for key, item in value.items()}
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    return str(value)


def assignment_record(entry):
    fields = (
        "input_structure", "centroid", "volume", "fragment", "map_value",
        "correlation", "intersection_over_union", "weighted_mean_of_first",
        "intersection_over_first", "weighted_mean_of_second", "intersection_over_second",
    )
    return {
        "class": type(entry).__name__,
        **{field: json_value(getattr(entry, field)) for field in fields if hasattr(entry, field)},
    }


def dataframe_records(frame):
    return [
        {key: json_value(value) for key, value in row.items()}
        for row in frame.to_dict(orient="records")
    ]


def write_local_configuration(root):
    (root / "spaces").mkdir(parents=True)
    (root / "parcellations").mkdir()
    (root / "spaces" / "probe-space.json").write_text(json.dumps({
        "@id": "brain-atlas/probe-space/v1",
        "@type": "siibra/space/v0.0.1",
        "name": "Brain Atlas synthetic 1 mm probe space",
        "shortName": "probe1mm",
        "species": "homo sapiens",
        "volumes": [],
    }), encoding="utf-8")
    (root / "parcellations" / "probe-parcellation.json").write_text(json.dumps({
        "@id": "brain-atlas/probe-parcellation/v1",
        "@type": "siibra/parcellation/v0.0.1",
        "name": "Brain Atlas synthetic probe parcellation",
        "shortName": "probeparc",
        "species": "homo sapiens",
        "regions": [{"name": "Probe A"}, {"name": "Probe B"}],
    }), encoding="utf-8")


def inspect_sigma_omission(point_class):
    source = textwrap.dedent(inspect.getsource(point_class.warp))
    tree = ast.parse(source)
    constructors = [
        node for node in ast.walk(tree)
        if isinstance(node, ast.Call)
        and isinstance(node.func, ast.Attribute)
        and node.func.attr == "__class__"
    ]
    assert len(constructors) == 1
    keywords = sorted(keyword.arg for keyword in constructors[0].keywords)
    assert "sigma_mm" not in keywords
    assert "TODO this needs to maintain the sigma parameter" in source
    return {
        "method_source_sha256": hashlib.sha256(source.encode()).hexdigest(),
        "returned_constructor_keywords": keywords,
        "sigma_mm_forwarded": False,
        "executed": False,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-tarball", type=Path, required=True)
    parser.add_argument("--config-zip", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    assert sha256(args.source_tarball) == EXPECTED["source_sha256"]
    assert sha256(args.config_zip) == EXPECTED["config_sha256"]
    with zipfile.ZipFile(args.config_zip) as archive:
        roots = {name.split("/", 1)[0] for name in archive.namelist() if "/" in name}
    assert roots == {f"siibra-configurations-{EXPECTED['config_commit']}"}

    network_attempts = []
    original_connect = socket.socket.connect
    original_connect_ex = socket.socket.connect_ex
    original_create_connection = socket.create_connection

    def deny_network(*call_args, **call_kwargs):
        network_attempts.append(repr(call_args[1:] if len(call_args) > 1 else call_args))
        raise AssertionError("network access denied by probe")

    socket.socket.connect = deny_network
    socket.socket.connect_ex = deny_network
    socket.create_connection = deny_network

    with tempfile.TemporaryDirectory(prefix="brain-atlas-siibra-probe-") as work:
        work = Path(work)
        config_root = work / "configuration"
        write_local_configuration(config_root)
        os.environ["SIIBRA_USE_CONFIGURATION"] = str(config_root)
        os.environ["SIIBRA_CACHEDIR"] = str(work / "cache")

        import nibabel as nib
        import numpy as np
        import siibra
        from siibra.core.space import Space
        from siibra.locations import PointCloud, Point
        from siibra.volumes import Volume
        from siibra.volumes.parcellationmap import Map
        from siibra.volumes.providers import NiftiProvider

        assert importlib.metadata.version("siibra") == EXPECTED["siibra_version"]
        assert siibra.__version__ == "1.0.1-alpha.20"
        installed_root = Path(siibra.__file__).parent
        source_members = {}
        import tarfile
        with tarfile.open(args.source_tarball, "r:gz") as archive:
            for relative in (
                "siibra/locations/point.py",
                "siibra/locations/pointcloud.py",
                "siibra/volumes/parcellationmap.py",
            ):
                member = archive.extractfile(f"siibra-{EXPECTED['siibra_version']}/{relative}")
                source_members[relative] = hashlib.sha256(member.read()).hexdigest()
                assert source_members[relative] == sha256(installed_root.parent / relative)

        space = Space.get_instance("brain-atlas/probe-space/v1")
        shape = (25, 25, 25)
        affine = np.eye(4)
        map_a = np.zeros(shape, dtype=np.float32)
        map_b = np.zeros(shape, dtype=np.float32)
        map_a[8:17, 8:17, 8:17] = 0.2
        map_b[8:17, 8:17, 8:17] = 0.2
        map_a[12, 12, 12] = map_b[12, 12, 12] = 0.5
        map_a[13, 12, 12], map_b[13, 12, 12] = 0.75, 0.25
        map_a[0, 0, 0], map_b[0, 0, 0] = 0.4, 0.1
        nifti_paths = []
        volumes = []
        for label, data in (("a", map_a), ("b", map_b)):
            path = work / f"synthetic-map-{label}.nii.gz"
            nib.save(nib.Nifti1Image(data, affine), path)
            nifti_paths.append({"name": path.name, "sha256": sha256(path), "shape": list(shape), "affine": affine.tolist()})
            volumes.append(Volume(
                space_spec={"@id": space.id},
                providers=[NiftiProvider(str(path))],
                name=f"Synthetic statistical map {label.upper()}",
            ))
        parcmap = Map(
            identifier="siibra-map-v0.0.1_brain-atlas-probe",
            name="Brain Atlas synthetic statistical map",
            space_spec={"@id": space.id},
            parcellation_spec={"@id": "brain-atlas/probe-parcellation/v1"},
            indices={"Probe A": [{"volume": 0}], "Probe B": [{"volume": 1}]},
            volumes=volumes,
        )
        assert parcmap.maptype.name == "STATISTICAL"
        assert np.array_equal(parcmap.affine, affine)

        trace = {"Point.warp": 0, "PointCloud.warp": 0}
        point_warp_code = Point.warp.__code__
        cloud_warp_code = PointCloud.warp.__code__

        def profiler(frame, event, arg):
            if event == "call":
                if frame.f_code is point_warp_code:
                    trace["Point.warp"] += 1
                elif frame.f_code is cloud_warp_code:
                    trace["PointCloud.warp"] += 1

        def run_case(name, coordinates, sigmas, threshold=0.0):
            cloud = PointCloud(coordinates, space=space, sigma_mm=sigmas)
            sys.setprofile(profiler)
            try:
                raw = parcmap._assign(cloud, lower_threshold=threshold)
                public = parcmap.assign(cloud, lower_threshold=threshold)
            finally:
                sys.setprofile(None)
            return {
                "name": name,
                "coordinates": coordinates,
                "sigma_mm": sigmas,
                "constant_sigma": cloud.has_constant_sigma,
                "lower_threshold": threshold,
                "raw": [assignment_record(entry) for entry in raw],
                "public_columns": list(public.columns),
                "public": dataframe_records(public),
            }

        def run_error_case(name, coordinates, sigmas, expected_exception):
            cloud = PointCloud(coordinates, space=space, sigma_mm=sigmas)
            errors = {}
            for api, invoke in (
                ("raw", lambda: parcmap._assign(cloud, lower_threshold=0.0)),
                ("public", lambda: parcmap.assign(cloud, lower_threshold=0.0)),
            ):
                sys.setprofile(profiler)
                try:
                    invoke()
                except Exception as exc:
                    assert type(exc).__name__ == expected_exception
                    errors[api] = {"class": type(exc).__name__, "message": str(exc)}
                else:
                    raise AssertionError(f"{name} unexpectedly succeeded through {api} API")
                finally:
                    sys.setprofile(None)
            return {
                "name": name,
                "coordinates": coordinates,
                "sigma_mm": sigmas,
                "constant_sigma": cloud.has_constant_sigma,
                "lower_threshold": 0.0,
                "errors": errors,
            }

        cases = []
        comparison_points = [[12, 12, 12], [12.49, 12, 12], [12.5, 12, 12]]
        for sigma in (0, 0.1, 2, 2.999, 3, 3.001):
            case = run_case(f"constant-sigma-{sigma}", comparison_points, sigma)
            expected_class = "MapAssignment" if sigma < 3 else "AssignImageResult"
            assert {entry["class"] for entry in case["raw"]} == {expected_class}
            if sigma < 3:
                if cases:
                    assert case["raw"] == cases[0]["raw"]
                values = {(entry["input_structure"], entry["volume"]): entry["map_value"] for entry in case["raw"]}
                assert values == {(0, 0): 0.5, (1, 0): 0.5, (2, 0): 0.75,
                                  (0, 1): 0.5, (1, 1): 0.5, (2, 1): 0.25}
            else:
                assert all(entry["map_value"] is None and entry["correlation"] is not None
                           for entry in case["raw"])
            cases.append(case)

        cases.append(run_error_case(
            "mixed-sigma-crossing-branch-boundary",
            [[12, 12, 12]] * 6,
            [0, 0.1, 2, 2.999, 3, 3.001],
            "ValueError",
        ))
        cases.append(run_error_case(
            "mixed-sigma-exact-only",
            [[12, 12, 12]] * 2,
            [0.1, 2.999],
            "ValueError",
        ))
        mixed_uncertain = run_case(
            "mixed-sigma-uncertain-only",
            [[12, 12, 12]] * 2,
            [3, 3.001],
        )
        assert {entry["class"] for entry in mixed_uncertain["raw"]} == {"AssignImageResult"}
        cases.append(mixed_uncertain)

        exact_equal = run_case("exact-threshold-equality", [[12, 12, 12]], 0, 0.5)
        assert exact_equal["raw"] == []
        cases.append(exact_equal)
        exact_below = run_case("exact-threshold-below-equality", [[12, 12, 12]], 0, 0.499999)
        assert len(exact_below["raw"]) == 2
        cases.append(exact_below)
        zero = run_case("zero-is-excluded", [[2, 2, 2]], 0, 0.0)
        assert zero["raw"] == []
        cases.append(zero)

        rounding = run_case(
            "rounding-and-bounds",
            [[-0.51, 0, 0], [-1.5, 0, 0], [12.49, 12, 12], [12.5, 12, 12], [24.49, 24, 24], [24.5, 24, 24]],
            0,
        )
        observed_indices = {entry["input_structure"] for entry in rounding["raw"]}
        assert 0 in observed_indices and 1 not in observed_indices
        assert 2 in observed_indices and 3 in observed_indices
        assert 4 not in observed_indices and 5 not in observed_indices
        cases.append(rounding)

        uncertain_boundary = run_case("uncertain-boundary-clipping", [[0, 0, 0]], 3)
        assert {entry["class"] for entry in uncertain_boundary["raw"]} == {"AssignImageResult"}
        cases.append(uncertain_boundary)

        uncertain_base = next(case for case in cases if case["name"] == "constant-sigma-3")
        equality_value = uncertain_base["raw"][0]["intersection_over_union"]
        uncertain_equal = run_case("uncertain-iou-threshold-equality", [[12, 12, 12]], 3, equality_value)
        assert all(entry["intersection_over_union"] > equality_value for entry in uncertain_equal["raw"])
        assert not any(entry["intersection_over_union"] == equality_value for entry in uncertain_equal["raw"])
        cases.append(uncertain_equal)

        other_space = Space("brain-atlas/forbidden-other-space/v1", "Forbidden other probe space", "homo sapiens")
        mismatched = PointCloud([[12, 12, 12]], space=other_space, sigma_mm=2)
        mismatch_rejected = mismatched.space != parcmap.space
        assert mismatch_rejected

        assert trace["Point.warp"] == 0
        assert trace["PointCloud.warp"] > 0
        assert network_attempts == []
        result = {
            "schemaVersion": 1,
            "purpose": "Research-only execution of real pinned siibra assignment code; no production method adopted.",
            "pins": {**EXPECTED, "source_tarball": str(args.source_tarball), "config_zip": str(args.config_zip)},
            "runtime": {
                "python": platform.python_version(),
                "implementation": platform.python_implementation(),
                "platform": platform.platform(),
                "siibra": siibra.__version__,
                "packages": {name: importlib.metadata.version(name) for name in (
                    "siibra", "numpy", "nibabel", "scipy", "pandas", "nilearn", "scikit-image"
                )},
                "installed_source_file_sha256": source_members,
            },
            "local_configuration": {
                "synthetic": True,
                "configured_before_siibra_import": True,
                "retained_config_zip_verified_but_not_redistributed": True,
                "wrapper_root": next(iter(roots)),
            },
            "synthetic_nifti": nifti_paths,
            "map": {"type": parcmap.maptype.name, "shape": list(shape), "affine": affine.tolist(), "voxel_scaling_mm": 1.0},
            "cases": cases,
            "execution_guards": {
                "network_denied": True,
                "network_attempt_count": len(network_attempts),
                "warp_calls": trace,
                "same_space_pointcloud_warp_returns_identity": (lambda cloud: cloud.warp(space.id) is cloud)(PointCloud([[1, 1, 1]], space=space)),
                "cross_space_assignment_executed": False,
                "mismatch_detected_without_upstream_assignment": mismatch_rejected,
            },
            "point_warp_source_inspection": inspect_sigma_omission(Point),
            "limits": [
                "Synthetic two-region statistical maps only; no real atlas data or scientific classification tested.",
                "Latest compatible dependencies were resolved on probe date; source archive and executed siibra files are hash-bound.",
                "Cross-space Point.warp was source-inspected only and never executed.",
                "Public DataFrame conversion is exercised, but assertions use raw assignment dataclasses to preserve absent versus null metrics.",
            ],
        }
        args.output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")

    socket.socket.connect = original_connect
    socket.socket.connect_ex = original_connect_ex
    socket.create_connection = original_create_connection
    print(args.output)


if __name__ == "__main__":
    main()
