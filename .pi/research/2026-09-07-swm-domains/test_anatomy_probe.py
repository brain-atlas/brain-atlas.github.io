"""Focused checks for the private anatomical-suitability probe, not a new asset builder."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

import nibabel as nib
import numpy as np


HERE = Path(__file__).parent


def probe():
    path = HERE / 'anatomy_probe.py'
    assert path.is_file(), 'anatomical suitability probe not implemented'
    spec = importlib.util.spec_from_file_location('anatomy_probe', path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class AnatomyProbeTests(unittest.TestCase):
    def test_slice_axes_preserve_ras_orientation(self):
        p = probe()
        data = np.arange(3 * 4 * 5).reshape(3, 4, 5)
        for axis in range(3):
            plane = p.slice_pixels(data, axis, 1)
            expected = np.flipud(np.take(data, 1, axis=axis).T)
            np.testing.assert_array_equal(plane, expected)
        self.assertEqual(p.slice_pixels(data, 2, 1)[-1, 0], data[0, 0, 1])
        self.assertEqual(p.slice_pixels(data, 0, 1)[0, -1], data[1, -1, -1])

    def test_header_and_labels_fail_closed(self):  # Tests asset INV-3/7, FAIL-4
        p = probe()
        affine = np.diag([1., 1., 1., 1.])
        data = np.ones((3, 4, 5), dtype=np.uint16)
        im = nib.Nifti1Image(data, affine)
        im.header.set_xyzt_units('mm')
        im.set_qform(affine, 4)
        im.set_sform(affine, 4)
        p.check_volume(im, (3, 4, 5), affine, {0, 1})
        im.set_qform(affine, 0)
        with self.assertRaises(ValueError):
            p.check_volume(im, (3, 4, 5), affine, {0, 1})
        shifted = affine.copy(); shifted[0, 3] = 1
        im.set_qform(shifted, 4)
        with self.assertRaises(ValueError):
            p.check_volume(im, (3, 4, 5), affine, {0, 1})
        im.set_qform(affine, 4)
        with self.assertRaises(ValueError):
            p.check_volume(im, (3, 4, 5), affine, {0, 2})
        im.header.set_xyzt_units('unknown')
        with self.assertRaises(ValueError):
            p.check_volume(im, (3, 4, 5), affine, {0, 1})
        bad = nib.Nifti1Image(np.full((3, 4, 5), np.nan), affine)
        bad.header.set_xyzt_units('mm'); bad.set_qform(affine, 4); bad.set_sform(affine, 4)
        with self.assertRaises(ValueError):
            p.check_volume(bad, (3, 4, 5), affine)

    def test_component_diagnostics_and_voxel_bounds(self):
        p = probe()
        mask = np.zeros((7, 7, 7), bool)
        mask[1:4, 1:4, 1:4] = True
        mask[5, 5, 5] = True
        affine = np.eye(4); affine[:3, 3] = [-10, -20, -30]
        r = p.compartment_metrics(mask, affine)
        self.assertEqual(r['voxels'], 28)
        self.assertEqual(r['componentCount6'], 2)
        self.assertEqual([c['voxels'] for c in r['largestComponents']], [27, 1])
        self.assertEqual(r['boundsVoxelCentresRasMm'], [[-9., -19., -29.], [-5., -15., -25.]])
        self.assertEqual(r.get('maxDistanceToOutsideCompartmentVoxelCentreMm'), 2.)
        self.assertEqual(r.get('centresAtLeast2mmFromOutsideCompartment'), 1)
        self.assertEqual(p.compartment_metrics(np.zeros_like(mask), affine)['voxels'], 0)

    def test_input_hash_and_output_guards(self):  # Tests asset INV-3/5
        p = probe()
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            inputs = root / 'inputs'; inputs.mkdir()
            (inputs / 'data').write_bytes(b'x')
            with self.assertRaises(ValueError):
                p.resolve_inputs(inputs, [{'id': 'x', 'filename': 'data', 'bytes': 1, 'sha256': '0' * 64}])
            public = root / 'public'; public.mkdir()
            with self.assertRaises(ValueError):
                p.require_empty_output_root(public, root)
            out = root / 'out'; out.mkdir(); (out / 'existing').write_text('keep')
            with self.assertRaises(ValueError):
                p.require_empty_output_root(out, root)
            self.assertEqual((out / 'existing').read_text(), 'keep')


if __name__ == '__main__':
    unittest.main()
