"""Deterministic named association-tract extraction."""

from __future__ import annotations

import gzip
import json
import tempfile
import zipfile
from pathlib import Path
from typing import Any

import nibabel as nib
import numpy as np

from .common import ContractError, resample_contour

ASSOCIATION_SPACE = {
    "template": "ICBM 2009a Nonlinear Asymmetric",
    "templateVariantEvidence": "direct source record",
    "coordinateConvention": "RAS+",
    "units": "mm",
    "templateConversion": "none; decoded source RAS+ frame retained through resampling",
}
ASSOCIATION_SOURCE = (
    "HCP-1065 Population-Averaged Tractography Atlas, release hcp1065; "
    "selected and resampled bilateral association bundles"
)


def _load_gzipped_trackvis(archive: zipfile.ZipFile, member: str) -> list[np.ndarray]:
    try:
        compressed = archive.read(member)
    except KeyError as error:
        raise ContractError(f"association archive member is missing: {member}") from error
    if compressed[:2] != b"\x1f\x8b":
        raise ContractError(f"association member is not gzip data: {member}")
    try:
        trackvis = gzip.decompress(compressed)
    except gzip.BadGzipFile as error:
        raise ContractError(f"association member has invalid gzip data: {member}") from error
    with tempfile.NamedTemporaryFile(suffix=".trk") as temporary:
        temporary.write(trackvis)
        temporary.flush()
        try:
            loaded = nib.streamlines.load(temporary.name, lazy_load=False)
        except Exception as error:
            raise ContractError(f"association TrackVis parse failed: {member}") from error
        return [np.ascontiguousarray(np.asarray(points, dtype=np.float64)) for points in loaded.streamlines]


def build_association_from_archive(
    archive_path: Path,
    output_path: Path,
    catalog: list[dict[str, Any]],
    *,
    fibres_per_group: int = 180,
    points_per_fibre: int = 40,
    seed: int = 0,
) -> dict[str, int]:
    output_path = Path(output_path)
    if output_path.exists() or output_path.suffix != ".json":
        raise ContractError("association output must be a new JSON path")
    rng = np.random.default_rng(seed)
    records = []
    total_fibres = 0
    with zipfile.ZipFile(archive_path) as archive:
        for tract in catalog:
            hemispheres: dict[str, list[list[list[float]]]] = {}
            for hemisphere in ("L", "R"):
                member = tract["archiveMembers"][hemisphere]
                streamlines = _load_gzipped_trackvis(archive, member)
                if not streamlines:
                    raise ContractError(f"association group is empty: {tract['id']}/{hemisphere}")
                selected = rng.permutation(len(streamlines))[: min(fibres_per_group, len(streamlines))]
                fibres = []
                for index in selected:
                    resampled = resample_contour(streamlines[int(index)], points_per_fibre)
                    if resampled[0, 1] > resampled[-1, 1]:
                        resampled = resampled[::-1]
                    fibres.append([
                        [round(float(value), 1) for value in point]
                        for point in resampled
                    ])
                hemispheres[hemisphere] = fibres
                total_fibres += len(fibres)
            records.append({
                "id": tract["id"],
                "name": tract["name"],
                "stream": tract["stream"],
                "color": tract["color"],
                "np": points_per_fibre,
                "L": hemispheres["L"],
                "R": hemispheres["R"],
            })

    payload = {
        "space": ASSOCIATION_SPACE,
        "source": ASSOCIATION_SOURCE,
        "tracts": records,
    }
    serialized = json.dumps(
        payload,
        ensure_ascii=False,
        allow_nan=False,
        separators=(", ", ": "),
    )
    output_path.write_text(serialized, encoding="utf-8", newline="\n")
    return {"tracts": len(records), "groups": len(records) * 2, "fibres": total_fibres}
