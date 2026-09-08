"""Small fixture for review selection and readable sheet generation."""
import importlib.util
from pathlib import Path
import tempfile
import unittest
import json

import nibabel as nib
import numpy as np
from PIL import Image

HERE=Path(__file__).resolve().parent


class ReviewTests(unittest.TestCase):
    def test_frozen_selection_and_new_output(self):
        p=HERE/'review_candidate.py'
        self.assertTrue(p.exists(),'review rendering not implemented')
        spec=importlib.util.spec_from_file_location('review_candidate',p)
        module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp).resolve(); candidate=root/'candidate'; candidate.mkdir()
            values=np.arange(125,dtype=np.float64).reshape(5,5,5)+1
            labels=np.zeros((5,5,5),np.uint8); labels[2,2,2]=1
            affine=np.eye(4); affine[:3,3]=-2
            for name,array in [('fixed',values),('moving',values),('original',labels),('labels',labels),('support',np.ones_like(labels))]:
                nib.save(nib.Nifti1Image(array,affine),candidate/(name+'.nii.gz'))
            selection={'fixed_ras_slices':{'x':[0],'y':[0],'z':[0]},'extrema':'first'}
            method={'roles':{k:str(candidate/(v+'.nii.gz')) for k,v in [('fixed','fixed'),('moving','moving'),('labels','original')]},'review_selection':selection}
            (candidate/'method.json').write_text(json.dumps(method))
            (candidate/'report.json').write_text(json.dumps({'displacement':[{'max_index':[2,2,2]},{'max_index':[2,2,2]}]}))
            output=root/'review'; output.mkdir()
            receipt=module.write_review(candidate,output)
            self.assertEqual(len(receipt['slices']),3)
            self.assertEqual(len(receipt['files']),1)
            with Image.open(output/receipt['files'][0]): pass
            with self.assertRaises(ValueError): module.write_review(candidate,output)

    def test_decoded_comparison_rejects_changed_values_or_grid(self):
        p=HERE/'review_candidate.py'
        spec=importlib.util.spec_from_file_location('review_candidate',p)
        module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
        self.assertTrue(hasattr(module,'compare_decoded'),'decoded comparator not implemented')
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp).resolve(); a=root/'a.nii'; b=root/'b.nii'
            data=np.zeros((3,3,3),np.float64)
            nib.save(nib.Nifti1Image(data,np.eye(4)),a); nib.save(nib.Nifti1Image(data,np.eye(4)),b)
            self.assertTrue(module.compare_decoded(a,b))
            data[1,1,1]=1; nib.save(nib.Nifti1Image(data,np.eye(4)),b)
            self.assertFalse(module.compare_decoded(a,b))
            data[:]=0; affine=np.eye(4); affine[0,3]=1
            nib.save(nib.Nifti1Image(data,affine),b)
            self.assertFalse(module.compare_decoded(a,b))


if __name__=='__main__': unittest.main()
