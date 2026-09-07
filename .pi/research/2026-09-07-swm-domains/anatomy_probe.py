"""Private source-suitability diagnostic; no SWM assignment or public output.

Run with the project's locked uv environment. Inputs are explicit; no network.
Diagnostic overlays remain private under approval brain-atlas-n401.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import nibabel as nib
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO))
from tools.assets.common import require_empty_output_root, resolve_inputs

SOURCES = [
    {'id': 'carpet', 'filename': 'tpl-MNI152NLin2009cAsym_res-01_desc-carpet_dseg.nii.gz',
     'bytes': 451304, 'sha256': '52eded597985fee7806699dfd276d32b1d53293dff04326773e4fe84864752c7',
     'url': 'https://osf.io/download/gwndz/'},
    {'id': 't1', 'filename': 'tpl-MNI152NLin2009cAsym_res-01_T1w.nii.gz',
     'bytes': 13685075, 'sha256': '1f27aabea9f7183dc0c69dafa71e1787b921ca778d655d9c1bf302b273d5627a',
     'url': 'https://osf.io/download/xuetv/'},
]
AFFINE = np.array([[1., 0, 0, -96], [0, 1., 0, -132], [0, 0, 1., -78], [0, 0, 0, 1.]])
GROUPS = {
    'background': ([0], (0, 0, 0)),
    'cerebral_white_matter': ([1, 2], (0, 210, 255)),
    'lateral_ventricle': ([3, 4], (60, 90, 255)),
    'brain_stem_source_label5': ([5], (255, 75, 55)),
    'subcortical_gray_including_hippocampus_amygdala': ([34, 35, 36, 37, 39, 40, 41, 45, 46, 47, 48, 49, 50, 51], (60, 240, 100)),
    'cortical_source_labels': (list(range(101, 197)), (255, 215, 45)),
    'cerebellum_and_midbrain_source_label255': ([255], (240, 60, 240)),
}


def check_volume(image, shape, affine, allowed=None):
    q, qc = image.get_qform(coded=True)
    s, sc = image.get_sform(coded=True)
    if image.shape != shape or image.header.get_xyzt_units()[0] != 'mm':
        raise ValueError('unexpected volume shape or spatial units')
    if qc != 4 or sc != 4 or not all(np.array_equal(a, affine) for a in (q, s, image.affine)):
        raise ValueError('unexpected or conflicting NIfTI forms')
    data = np.asanyarray(image.dataobj)
    if not np.isfinite(data).all():
        raise ValueError('nonfinite volume')
    if allowed is not None and not set(np.unique(data)).issubset(allowed):
        raise ValueError('unknown categorical label')
    return data


def slice_pixels(data, axis, index):
    """First retained RAS axis increases rightward; second increases upward."""
    return np.flipud(np.take(data, index, axis=axis).T)


def compartment_metrics(mask, affine):
    positions = np.argwhere(mask)
    if not len(positions):
        return {'voxels': 0}
    world = nib.affines.apply_affine(affine, positions)
    components, count = ndimage.label(mask, ndimage.generate_binary_structure(3, 1))
    sizes = np.bincount(components.ravel())[1:]
    order = sorted(range(count), key=lambda i: (-int(sizes[i]), i))[:8]
    largest = []
    for i in order:
        xyz = nib.affines.apply_affine(affine, np.argwhere(components == i + 1))
        largest.append({'voxels': int(sizes[i]), 'boundsVoxelCentresRasMm': [xyz.min(0).tolist(), xyz.max(0).tolist()]})
    # Outside this pooled compartment, including one padded layer; not source-label/surface distance.
    distance = ndimage.distance_transform_edt(np.pad(mask, 1), sampling=nib.affines.voxel_sizes(affine))[1:-1, 1:-1, 1:-1]
    return {
        'voxels': int(len(positions)),
        'boundsVoxelCentresRasMm': [world.min(0).tolist(), world.max(0).tolist()],
        'componentCount6': int(count), 'largestComponents': largest,
        'centresAtLeast2mmFromOutsideCompartment': int(np.count_nonzero(mask & (distance >= 2))),
        'maxDistanceToOutsideCompartmentVoxelCentreMm': float(distance.max()),
    }


def write_overlays(t1, labels, out):
    lo, hi = np.percentile(t1[t1 > 0], [1, 99])
    gray = np.rint(np.clip((t1.astype(float) - lo) / (hi - lo), 0, 1) * 255).astype('uint8')
    lut = np.zeros((256, 3), dtype=np.uint8)
    for values, color in GROUPS.values():
        lut[values] = color
    planes = [('sagittal', 0, [-60, -40, -20, 0, 20, 40, 60], 'P -> A; S up'),
              ('coronal', 1, [-100, -80, -60, -40, -20, 0, 20, 40, 60], 'L -> R; S up'),
              ('axial', 2, [-60, -40, -20, 0, 20, 40, 60], 'L -> R; A up')]
    for name, axis, cuts, orientation in planes:
        sheet = Image.new('RGB', (1500, 160 + 270 * ((len(cuts) + 2) // 3)), '#151515')
        draw = ImageDraw.Draw(sheet)
        draw.text((12, 8), f'{name}: T1 | carpet alpha 0.45. {orientation}. RAS mm. NO registration/warp.', fill='white')
        draw.text((12, 26), 'Private screening diagnostic, NOT anatomical ground truth. Label255 remains combined Cerebellum and Midbrain.', fill='white')
        for i, (group, (_, color)) in enumerate(GROUPS.items()):
            draw.text((12 + 740 * (i % 2), 47 + 22 * (i // 2)), group, fill=color if group != 'background' else 'white')
        for i, cut in enumerate(cuts):
            index = int(cut - AFFINE[axis, 3])
            g = slice_pixels(gray, axis, index)
            seg = slice_pixels(labels, axis, index)
            rgb = np.repeat(g[..., None], 3, axis=2)
            overlay = rgb.copy()
            overlay[seg != 0] = np.rint(0.55 * rgb[seg != 0] + 0.45 * lut[seg[seg != 0]]).astype('uint8')
            x, y = 500 * (i % 3), 160 + 270 * (i // 3)
            draw.text((x + 10, y), f'{"xyz"[axis]}={cut} mm; T1 left, overlay right', fill='white')
            for j, pixels in enumerate((rgb, overlay)):
                image = Image.fromarray(pixels)
                # Native one-pixel-per-voxel paired images; no stretch.
                sheet.paste(image, (x + 10 + j * 245, y + 24))
        sheet.save(out / f'{name}.png')
    return {'t1PositiveVoxelPercentiles': [1, 99], 'intensityWindow': [float(lo), float(hi)],
            'overlayAlpha': 0.45, 'cutsRasMm': {name: cuts for name, _, cuts, _ in planes},
            'orientation': {name: orientation for name, _, _, orientation in planes}}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inputs', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    paths = resolve_inputs(args.inputs, SOURCES)
    out = require_empty_output_root(args.output, REPO)
    images = {key: nib.load(path) for key, path in paths.items()}
    labels = check_volume(images['carpet'], (193, 229, 193), AFFINE, {v for values, _ in GROUPS.values() for v in values})
    t1 = check_volume(images['t1'], (193, 229, 193), AFFINE)
    report = {
        'kind': 'private-volume-suitability-diagnostic-v1', 'approval': 'brain-atlas-n401',
        'sources': SOURCES, 'scriptSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'lockSha256': hashlib.sha256((REPO / 'tools/assets/requirements.lock').read_bytes()).hexdigest(),
        'shape': list(labels.shape), 'affine': AFFINE.tolist(), 'qformCode': 4, 'sformCode': 4,
        'groups': {name: {'sourceLabels': values, **compartment_metrics(np.isin(labels, values), AFFINE)}
                   for name, (values, _) in GROUPS.items()},
        'limitations': ['Published screening compartments, not anatomical ground truth.',
                        'No exact historical construction binding; upstream rights remain unresolved.',
                        'Same-grid template overlay is not independent segmentation validation.',
                        'No SWM assignments, no warp and no public replacement.'],
    }
    assert sum(group['voxels'] for group in report['groups'].values()) == labels.size
    report['display'] = write_overlays(t1, labels, out)
    (out / 'diagnostics.json').write_text(json.dumps(report, indent=2, allow_nan=False) + '\n')
    print('Anatomical diagnostic written; visual interpretation remains required.')


if __name__ == '__main__':
    main()
