"""Private endpoint readout contract; run in the checked asset environment."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

import nibabel as nib
import numpy as np

MODULE = Path(__file__).with_name('evaluate.py')
spec = importlib.util.spec_from_file_location('endpoint_evaluation', MODULE) if MODULE.exists() else None
evaluation = importlib.util.module_from_spec(spec) if spec else None
if spec:
    spec.loader.exec_module(evaluation)


class EvaluationTests(unittest.TestCase):
    def setUp(self):
        self.assertIsNotNone(evaluation, 'private endpoint evaluator is not implemented')

    def test_sampling_and_alternatives(self):
        points = np.array([[0, 0, 0], [.5, 0, 0], [1.5, 0, 0], [-.51, 0, 0], [1e100, 0, 0]])
        indices, inside = evaluation.voxels(points, np.eye(4), (3, 2, 2))
        self.assertEqual(indices[:, 0].tolist(), [0, 0, 2, 0, 0])
        self.assertEqual(inside.tolist(), [True, True, True, False, False])
        with self.assertRaises(ValueError):
            evaluation.voxels(np.array([[np.nan, 0, 0]]), np.eye(4), (3, 2, 2))
        baseline = np.array([[.5, .5, .9], [0, 0, .4], [0, 0, 0], [0, 0, 0]], dtype=np.float32)
        maximum = baseline.copy()
        maximum[2, 0] = .1
        minimum = np.zeros_like(baseline)
        records = evaluation.endpoint_records(baseline, minimum, maximum, np.array([True, True, True, False]), [False, False, True])
        self.assertEqual([r['support'] for r in records], ['named', 'gap-only', 'zero', 'outside-grid'])
        self.assertEqual(records[0]['mapLeaders'], [0, 1])
        self.assertEqual(records[1]['mapLeaders'], [])
        self.assertEqual(records[2]['candidates'], [[0, 0.0, 0.0, float(np.float32(.1))]])
        for r in records:
            self.assertIsNone(r['primary'])
            self.assertEqual(r['domain'], 'unresolved')
            self.assertEqual(r['status'], 'unresolved')
        pairs = evaluation.fibre_categories(records)
        self.assertEqual(pairs, evaluation.fibre_categories([records[1], records[0], records[3], records[2]]))
        self.assertEqual(sum(pairs.values()), 2)

    def test_run_rejects_public_before_generation(self):
        self.assertTrue(callable(getattr(evaluation, 'run', None)), 'private runner missing')
        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            public = root / 'public'
            public.mkdir()
            with self.assertRaises(evaluation.ContractError):
                evaluation.run(root, root, public, root / 'uv')
            self.assertEqual(list(public.iterdir()), [])

    def test_all_probe_sampling(self):
        self.assertTrue(callable(getattr(evaluation, 'sample_maps', None)), 'probe sampler missing')
        header = {'shape': [3, 3, 3], 'sform': np.eye(4).tolist()}
        a = np.zeros((3, 3, 3), dtype=np.float32)
        a[0, 0, 0] = .5
        b = a.copy()
        gap = np.ones_like(a)
        points = np.array([[0, 0, 0], [.5, 0, 0], [-.5, 0, 0], [99, 0, 0]])
        baseline, low, high, inside, probes = evaluation.sample_maps(points, header, [False, False, True], iter([a, b, gap]))
        self.assertEqual(baseline[0].tolist(), [.5, .5, 1.])
        self.assertEqual(high[0].tolist(), [.5, .5, 1.])
        self.assertEqual(low[0].tolist(), [.5, .5, 1.])
        self.assertEqual(low[1].tolist(), [0., 0., 1.])
        self.assertEqual(low[2].tolist(), [0., 0., 0.])
        self.assertEqual(inside.tolist(), [True, True, True, False])
        self.assertEqual(len(probes), 27)
        self.assertEqual(probes[13]['leaderChanges'], 0)
        self.assertGreater(sum(p['leaderChanges'] for p in probes), 0)
        self.assertGreater(sum(p['supportChanges'] for p in probes), 0)
        self.assertEqual(probes[13]['outsideGrid'], 1)

    def test_packed_leaders_match_dense_oracle(self):
        rng = np.random.default_rng(14)
        volumes = rng.integers(0, 4, (314, 3, 3, 3)).astype(np.float32) / 4
        gaps = np.zeros(314, dtype=bool)
        gaps[[0, 63, 128, 313]] = True
        points = np.array([[.5, 1, 1], [1.5, 1, 1], [-.5, 0, 0], [3, 3, 3]])
        header = {'shape': [3, 3, 3], 'sform': np.eye(4).tolist()}
        base, low, high, inside, probes = evaluation.sample_maps(points, header, gaps, iter(volumes))
        dense = []
        leader_sets, supports, out = [], [], []
        for offset in evaluation.OFFSETS:
            rows, sets, categories, outside = [], [], [], 0
            for point in points:
                index = tuple(round(float(a + b)) for a, b in zip(point, offset))
                valid = all(0 <= i < 3 for i in index)
                row = volumes[(slice(None), *index)] if valid else np.zeros(314)
                rows.append(row)
                peak = max(row[~gaps])
                sets.append({j for j in range(314) if not gaps[j] and row[j] == peak and peak > 0})
                categories.append('outside' if not valid else 'named' if peak > 0 else 'gap' if max(row) > 0 else 'zero')
                outside += not valid
            dense.append(rows)
            leader_sets.append(sets)
            supports.append(categories)
            out.append(outside)
        dense = np.asarray(dense)
        np.testing.assert_array_equal(base, dense[13])
        np.testing.assert_array_equal(low, dense.min(axis=0))
        np.testing.assert_array_equal(high, dense.max(axis=0))
        for k, probe in enumerate(probes):
            self.assertEqual(probe['leaderChanges'], sum(a != b for a, b in zip(leader_sets[k], leader_sets[13])))
            self.assertEqual(probe['supportChanges'], sum(a != b for a, b in zip(supports[k], supports[13])))
            self.assertEqual(probe['outsideGrid'], out[k])

    def test_pinned_sources_and_geometry(self):  # Tests INV-3 and private count/order contract
        self.assertTrue(callable(getattr(evaluation, 'load_sources', None)), 'source loader missing')
        repo = Path(__file__).resolve().parents[3]
        source_root = Path('/private/tmp/brain-atlas-yum.14.1-julich-probability-177023')
        inventory, paths, maps = evaluation.load_sources(repo, source_root)
        self.assertEqual(len(paths), 318)
        self.assertEqual(len(maps), 314)
        self.assertEqual(sum(m['gapMap'] for m in maps), 12)
        header = inventory['sharedNiftiHeaders'][0]
        affine = np.asarray(header['sform'])
        # Real deep-area, cortical-area and GapMap support; independent voxel oracle.
        for j in (0, 2, 135):
            data = evaluation.load_map(paths[maps[j]['file']], header)
            index = np.array(np.unravel_index(np.argmax(data), data.shape))
            centre = affine[:3, :3] @ index + affine[:3, 3]
            fixture_points = np.array([centre, centre + [.49, 0, 0], centre + [.5, 0, 0], [-1e4, 0, 0]])
            values, _low, _high, valid, _probes = evaluation.sample_maps(fixture_points, header, [maps[j]['gapMap']], iter([data]))
            self.assertEqual(float(values[0, 0]), float(data[tuple(index)]))
            self.assertEqual(values[1, 0], values[0, 0])
            next_index = index.copy()
            next_index[0] = index[0] + (index[0] % 2)
            self.assertEqual(float(values[2, 0]), float(data[tuple(next_index)]))
            self.assertGreater(float(values[0, 0]), 0)
            self.assertFalse(valid[3])
            self.assertEqual(float(values[3, 0]), 0)
        points, fibres, legacy = evaluation.load_geometry(repo)
        self.assertEqual(points.shape, (35760, 3))
        self.assertEqual(len(fibres), 17880)
        self.assertEqual(sum(f['source'] == 'association' for f in fibres), 2880)
        self.assertEqual(fibres[0]['index'], 0)
        self.assertEqual(fibres[2880]['index'], 0)
        self.assertEqual(fibres[-1]['index'], 14999)
        self.assertEqual(legacy['counts']['endpoints'], len(points))
        with tempfile.TemporaryDirectory() as root:
            with self.assertRaises(evaluation.ContractError):
                evaluation.load_sources(repo, Path(root))

    def test_header_value_and_output_guards(self):  # Tests INV-3/5, FAIL-1/2/4
        with tempfile.TemporaryDirectory() as root:
            root = Path(root)
            affine = np.eye(4)
            header = {'shape': [2, 2, 2], 'qform': affine.tolist(), 'sform': affine.tolist(), 'qformCode': 1, 'sformCode': 1, 'xyztUnits': ['unknown', 'unknown'], 'dtype': 'float32'}
            path = root / 'map.nii'
            def save(values, code=1):
                image = nib.Nifti1Image(values, affine)
                image.set_qform(affine, 1)
                image.set_sform(affine, code)
                nib.save(image, path)
            save(np.full((2, 2, 2), .25, dtype=np.float32))
            self.assertEqual(float(evaluation.load_map(path, header)[0, 0, 0]), .25)
            for value in [-.01, 1.01, np.nan, np.inf]:
                save(np.full((2, 2, 2), value, dtype=np.float32))
                with self.assertRaises(evaluation.ContractError):
                    evaluation.load_map(path, header)
            image = nib.Nifti1Image(np.full((2, 2, 2), .25, dtype=np.float32), affine)
            image.set_qform(affine, 1)
            image.set_sform(affine, 1)
            image.header.set_slope_inter(1.1, 0)
            nib.save(image, path)
            with self.assertRaises(evaluation.ContractError):
                evaluation.load_map(path, header)
            save(np.zeros((2, 2, 2), dtype=np.float32), 4)
            with self.assertRaises(evaluation.ContractError):
                evaluation.load_map(path, header)
            public = root / 'public'
            public.mkdir()
            with self.assertRaises(evaluation.ContractError):
                evaluation.safe_output(public, root)
            link = root / 'link'
            link.symlink_to(public, target_is_directory=True)
            with self.assertRaises(evaluation.ContractError):
                evaluation.safe_output(link, root)
            nested = public / 'nested'
            nested.mkdir()
            with self.assertRaises(evaluation.ContractError):
                evaluation.safe_output(link / 'nested', root)
            inputs = root / 'inputs'
            inputs.mkdir()
            with self.assertRaises(evaluation.ContractError):
                evaluation.resolve_inputs(inputs, [{'id': 'missing', 'filename': 'missing.nii', 'bytes': 1, 'sha256': '0' * 64}])


if __name__ == '__main__':
    unittest.main()
