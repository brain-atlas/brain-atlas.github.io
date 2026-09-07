"""Run with the locked asset environment; no network or downloaded code execution."""
import importlib.util
import io
from pathlib import Path
import tempfile
import unittest

import nibabel as nib
import numpy as np

HERE = Path(__file__).resolve().parent


class ComparisonTests(unittest.TestCase):
    def setUp(self):
        path = HERE / 'evaluate.py'
        self.assertTrue(path.exists(), 'private CerebrA evaluator not implemented')
        spec = importlib.util.spec_from_file_location('cerebra_evaluate', path)
        self.e = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.e)

    def test_csv_identity_and_composite_boundaries(self):
        rows = ['Mindboggle ID,Label Name,CerebrA ID,,Notes,Dice Kappa',
                ',,RH Labels,LH Labels,,']
        rows += [f'0,{name},{i},{i+51},,0' for i, name in sorted(self.e.RIGHT_NAMES.items())]
        text = '\n'.join(rows)
        labels = self.e.parse_labels(io.StringIO(text))
        self.assertEqual(len(labels), 102)
        self.assertEqual(labels[90], 'Cerebellum White Matter')
        self.assertEqual(self.e.group_ids(np.array([26,77,25,76])).tolist(), [9]*4)
        for bad in (text.replace(',39,90,', ',39,91,'), text+'\n'+rows[-1],
                    text.replace('Brainstem', 'Cortex')):
            with self.assertRaises(ValueError):
                self.e.parse_labels(io.StringIO(bad))

    def test_comparison_is_not_anatomical_assignment(self):
        # Cortex, deep, lateral ventricle, stem, cb, unresolved midbrain union,
        # absent, chiasm, composite, contradictory cortex vs cb, third vs lateral.
        carpet = np.array([101,39,3,5,255,255,0,255,39,101,3,1])
        cerebra = np.array([30,40,41,11,46,11,30,17,26,46,29,0])
        self.assertEqual(self.e.compare(carpet,cerebra).tolist(),
                         [0,0,0,0,0,2,2,2,2,1,1,2])
        with self.assertRaises(ValueError): self.e.group_ids(np.array([103]))
        with self.assertRaises(ValueError): self.e.group_ids(np.array([1.5]))

    def test_native_header_contract(self):  # Tests INV-3/7; source-specific unset qform.
        image = nib.Nifti1Image(np.zeros((193,229,193),np.float32), self.e.AFFINE)
        image.set_qform(None,code=0); image.set_sform(self.e.AFFINE,code=1)
        self.assertEqual(self.e.check_image(image).shape, image.shape)
        image.header.set_xyzt_units('mm')
        with self.assertRaises(ValueError): self.e.check_image(image)
        image.header.set_xyzt_units('unknown'); image.set_qform(self.e.AFFINE,code=1)
        with self.assertRaises(ValueError): self.e.check_image(image)
        image.set_qform(None,code=0); image.header.set_slope_inter(2,0)
        with self.assertRaises(ValueError): self.e.check_image(image)
        image.header.set_slope_inter(1,0); image.dataobj[0,0,0]=np.nan
        with self.assertRaises(ValueError): self.e.check_image(image)
        image.dataobj[0,0,0]=1.5
        with self.assertRaises(ValueError): self.e.check_image(image)

    def test_lookup_and_balanced_reversal(self):
        volume = np.arange(8,dtype=np.int16).reshape(2,2,2)
        points = np.array([[.5,0,0],[1.5,0,0],[-.5,0,0],[-.6,0,0]])
        self.assertEqual(self.e.sample_voxels(volume,points).tolist(),[0,-1,0,-1])
        with self.assertRaises(ValueError):
            self.e.sample_voxels(volume,np.array([[np.nan,0,0]]))
        cp = np.array([[101]*8,[255]*8,[1]*8])
        cb = np.array([[30]*8,[46]*4+[30]*4,[0]*8])
        a = self.e.summarize(cp,cb)
        self.assertEqual(a,self.e.summarize(cp[:,::-1],cb[:,::-1]))
        self.assertEqual(sum(a['comparison']['points'].values()),24)
        self.assertEqual(sum(a['comparison']['endpoints'].values()),6)
        self.assertEqual(sum(a['comparison']['endpointPairs'].values()),3)
        self.assertEqual(a['comparison']['allSameOrMixed'],{'mixed':1,'supported':1,'unresolved':1})
        self.assertEqual(a['anatomicalAssignment'],{'unresolvedPoints':24,'unresolvedEndpoints':6,'primary':None})
        self.assertEqual(self.e.summarize(cp[:0],cb[:0])['contours'],0)

    def test_panels_preserve_slice_orientation(self):
        from PIL import Image
        self.assertTrue(hasattr(self.e,'write_panels'), 'comparison panels not implemented')
        data=np.arange(27).reshape(3,3,3)
        self.assertEqual(self.e.anatomy.slice_pixels(data,2,1).tolist(),[[7,16,25],[4,13,22],[1,10,19]])
        with tempfile.TemporaryDirectory() as tmp:
            out=Path(tmp).resolve()
            rep=[{'index':0,'point':0,'rasMm':[-95,-131,-77],
                  'carpetLabel':101,'cerebraLabel':30,'comparison':'supported'}]
            result=self.e.write_panels(data+1,np.full(data.shape,101),np.full(data.shape,30),rep,out)
            self.assertEqual(result['files'],['encounter-00000-0.png'])
            with Image.open(out/result['files'][0]) as image:
                self.assertEqual(image.size,(960,980))

    def test_native_permutation_and_photometric_limits(self):
        path=HERE/'native_probe.py'
        self.assertTrue(path.exists(), 'native template probe not implemented')
        spec=importlib.util.spec_from_file_location('native_probe',path)
        native=importlib.util.module_from_spec(spec); spec.loader.exec_module(native)
        values=np.arange(60,dtype=np.float32).reshape(3,4,5)
        affine=np.eye(4)[:,[2,1,0,3]]
        image=nib.Nifti1Image(values,affine)
        got=native.canonical_data(image,(5,4,3),np.eye(4))
        np.testing.assert_array_equal(got,values.transpose(2,1,0))
        np.testing.assert_array_equal(nib.affines.apply_affine(affine,[1,2,3]),[3,2,1])
        with self.assertRaises(ValueError):native.canonical_data(image,(3,4,5),np.eye(4))
        image.dataobj[0,0,0]=np.inf
        with self.assertRaises(ValueError):native.canonical_data(image,(5,4,3),np.eye(4))
        a=np.arange(27,dtype=float).reshape(3,3,3)
        stats,x,y=native.photometry(a,2*a+7,np.ones(a.shape,dtype=bool))
        np.testing.assert_allclose(x,y,atol=1e-15)
        self.assertAlmostEqual(stats['pearson'],1)
        self.assertEqual(stats['maskVoxels'],27)
        self.assertAlmostEqual(stats['meanAbsoluteNormalizedDifference'],0)
        with self.assertRaises(ValueError):native.photometry(a,a,np.zeros(a.shape,dtype=bool))
        with self.assertRaises(ValueError):native.photometry(a,np.ones_like(a),np.ones(a.shape,dtype=bool))

    def test_input_and_output_guards(self):  # Tests INV-3/5 and FAIL-1/2 by reuse.
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp).resolve(); inp=root/'inputs'; inp.mkdir(); p=inp/'x'; p.write_bytes(b'x')
            pins=[{'id':'x','filename':'x','bytes':1,'sha256':self.e.sha256_file(p)}]
            self.assertEqual(self.e.resolve_inputs(inp,pins)['x'],p)
            p.write_bytes(b'y')
            with self.assertRaises(ValueError): self.e.resolve_inputs(inp,pins)
            out=root/'out'; out.mkdir(); self.e.check_output(out)
            (out/'existing').write_text('preserve')
            with self.assertRaises(ValueError): self.e.check_output(out)
            alias=root/'alias'; alias.symlink_to(out,target_is_directory=True)
            with self.assertRaises(ValueError): self.e.check_output(alias)
            with self.assertRaises(ValueError): self.e.check_output(self.e.REPO/'public')


if __name__ == '__main__':
    unittest.main()
