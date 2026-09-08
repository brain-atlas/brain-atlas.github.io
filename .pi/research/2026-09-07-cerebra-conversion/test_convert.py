"""Synthetic contracts only; never fits or opens real anatomical inputs."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

import ants
import nibabel as nib
import numpy as np
import pandas as pd

HERE = Path(__file__).resolve().parent


class ConversionTests(unittest.TestCase):
    def setUp(self):
        path = HERE / 'convert.py'
        self.assertTrue(path.exists(), 'private conversion primitives not implemented')
        spec = importlib.util.spec_from_file_location('convert', path)
        self.c = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(self.c)

    def test_ras_lps_double_read(self):
        # Nonidentity proper rotation, anisotropic spacing and negative coordinates.
        affine = np.array([[0,-2,0,-12],[3,0,0,-18],[0,0,4,-8],[0,0,0,1.]])
        values = np.arange(125,dtype=np.float64).reshape(5,5,5) + 2**-35
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp).resolve()/'image.nii'
            nib.save(nib.Nifti1Image(values,affine),path)
            image = self.c.read_ras(path)
            self.assertEqual(image.pixeltype,'double')
            np.testing.assert_array_equal(image.numpy(),values)
            np.testing.assert_allclose(image.origin,[12,18,-8])
            np.testing.assert_allclose(image.spacing,[3,2,4])
            np.testing.assert_allclose(image.direction,np.diag([-1,-1,1])@affine[:3,:3]/[3,2,4])
            values[0,0,0]=np.nan; nib.save(nib.Nifti1Image(values,affine),path)
            with self.assertRaises(ValueError): self.c.read_ras(path)

    def test_categorical_support_and_image_point_directions(self):
        affine=np.eye(4); affine[:3,3]=[-4,-4,-4]
        labels=np.zeros((9,9,9),np.float64); labels[2,4,4]=1; labels[6,4,4]=52
        with tempfile.TemporaryDirectory() as tmp:
            tmp=Path(tmp).resolve(); path=tmp/'labels.nii'; nib.save(nib.Nifti1Image(labels,affine),path)
            image=self.c.read_ras(path)
            # LPS translation -2 is a target->source RAS translation +2.
            tx=ants.create_ants_transform(transform_type='AffineTransform',precision='double',dimension=3,translation=(-2,0,0))
            filename=str(tmp/'translation.mat'); ants.write_transform(tx,filename)
            output,support=self.c.resample_labels(image,image,[filename],[False])
            self.assertEqual(output[0,4,4],1); self.assertEqual(output[4,4,4],52)
            self.assertEqual(int(support[-2:].sum()),0)
            self.assertEqual(int(support[:-2].sum()),7*9*9)
            self.assertEqual(output[1,4,4],0); self.assertEqual(support[1,4,4],1)
            identity,full=self.c.resample_labels(image,image,[filename],[True])
            self.assertEqual(identity[4,4,4],1); self.assertEqual(identity[8,4,4],52)
            self.assertEqual(int(full[:2].sum()),0)
            # Exact-representable fixture only: ANTs' point wrapper itself is float32.
            points=pd.DataFrame({'x':[2.,-2.],'y':[0.,0.],'z':[0.,0.]})
            moved=ants.apply_transforms_to_points(3,points,[filename],whichtoinvert=[True])
            np.testing.assert_array_equal(moved['x'],[4,0])
            restored=ants.apply_transforms_to_points(3,moved,[filename],whichtoinvert=[False])
            np.testing.assert_array_equal(restored,points)
            wrong=ants.apply_transforms_to_points(3,points,[filename],whichtoinvert=[False])
            self.assertFalse(np.array_equal(wrong,moved))
            bad=image.clone(); bad[0,0,0]=103
            with self.assertRaises(ValueError): self.c.resample_labels(image,bad,[filename],[False])
            for flags in ([None],[1],['yes']):
                with self.assertRaises(ValueError): self.c.resample_labels(image,image,[filename],flags)

    def test_noncommuting_transform_list(self):
        with tempfile.TemporaryDirectory() as tmp:
            files=[]
            for name,matrix,translation in [('shift',np.eye(3),(1,0,0)),('scale',np.diag([2.,1,1]),(0,0,0))]:
                t=ants.create_ants_transform(transform_type='AffineTransform',precision='double',dimension=3,matrix=matrix,translation=translation)
                p=str(Path(tmp)/(name+'.mat')); ants.write_transform(t,p); files.append(p)
            points=pd.DataFrame({'x':[1.,-2.],'y':[0.,0.],'z':[0.,0.]})
            actual=ants.apply_transforms_to_points(3,points,files,whichtoinvert=[False,False])
            np.testing.assert_array_equal(actual['x'],[4,-2])  # scale(shift(x))
            reverse=ants.apply_transforms_to_points(3,points,files[::-1],whichtoinvert=[False,False])
            np.testing.assert_array_equal(reverse['x'],[3,-3])
            restored=ants.apply_transforms_to_points(3,actual,files[::-1],whichtoinvert=[True,True])
            np.testing.assert_array_equal(restored,points)
            affine=np.eye(4); affine[:3,3]=[-4,-4,-4]
            labels=np.zeros((9,9,9),np.float64); labels[0,4,4]=52
            path=Path(tmp).resolve()/'labels.nii'; nib.save(nib.Nifti1Image(labels,affine),path)
            image=self.c.read_ras(path)
            warped,_=self.c.resample_labels(image,image,files,[False,False])
            self.assertEqual(warped[3,4,4],52)  # target RAS -1 -> LPS1 ->4 -> source RAS-4
            wrong,_=self.c.resample_labels(image,image,files[::-1],[False,False])
            self.assertNotEqual(wrong[3,4,4],52)

    def test_unclamped_world_jacobian_and_folds(self):
        affine=np.array([[0,-2,0,-7],[3,0,0,-9],[0,0,4,-11],[0,0,0,1.]])
        world=nib.affines.apply_affine(affine,np.indices((5,6,7)).transpose(1,2,3,0))
        stretch=np.diag([1.25,.8,1.5])
        field=world@(stretch-np.eye(3)).T
        det=self.c.jacobian(field,affine)
        self.assertEqual(det.shape,(3,4,5))
        np.testing.assert_allclose(det,1.5,atol=1e-12)
        fold=np.zeros_like(world); fold[...,0]=-2*world[...,0]
        np.testing.assert_allclose(self.c.jacobian(fold,affine),-1,atol=1e-12)
        fold[0,0,0,0]=np.nan
        with self.assertRaises(ValueError): self.c.jacobian(fold,affine)

    def test_roundtrip_support_and_wrong_inverse(self):
        affine=np.diag([2.,3,4,1]); affine[:3,3]=[-10,-20,-30]
        forward=np.zeros((6,7,8,3)); forward[...,0]=2
        inverse=-forward
        result=self.c.roundtrip(forward,inverse,affine)
        self.assertEqual(result['evaluated'],5*7*8)
        self.assertEqual(result['excluded'],7*8)
        self.assertEqual(result['max_mm'],0)
        wrong=self.c.roundtrip(forward,forward,affine)
        self.assertEqual(wrong['max_mm'],4)
        self.assertFalse(wrong['within_budget'])
        forward[...,0]=1000
        with self.assertRaises(ValueError): self.c.roundtrip(forward,inverse,affine)

    def test_technical_gate_rejects_fold_inverse_and_label_loss(self):
        self.assertTrue(hasattr(self.c,'technical_report'), 'technical report not implemented')
        labels=np.zeros((5,5,5),np.uint8); labels[2,2,2]=1; labels[3,2,2]=52
        field=np.zeros(labels.shape+(3,)); affine=np.eye(4)
        good=self.c.technical_report(labels,labels,np.ones_like(labels),field,field,affine)
        self.assertTrue(good['numerical_pass'])
        self.assertEqual(good['anatomical_status'],'unvalidated')
        lost=labels.copy(); lost[lost==52]=0
        bad=self.c.technical_report(labels,lost,np.ones_like(labels),field,field,affine)
        self.assertFalse(bad['numerical_pass']); self.assertEqual(bad['lost_labels'],[52])
        wrong=field.copy(); wrong[...,0]=1
        self.assertFalse(self.c.technical_report(labels,labels,np.ones_like(labels),wrong,wrong,affine)['numerical_pass'])
        fold=field.copy(); fold[...,0]=-2*np.indices(labels.shape)[0]
        self.assertFalse(self.c.technical_report(labels,labels,np.ones_like(labels),fold,field,affine)['numerical_pass'])
        with self.assertRaises(ValueError): self.c.technical_report(labels,labels[:-1],np.ones_like(labels),field,field,affine)

    def test_identity_affine_inventory_is_not_fitted_alignment(self):
        self.assertTrue(hasattr(self.c,'deformation_pair'),'identity inventory guard not implemented')
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp).resolve(); matrix=str(root/'identity.mat')
            tx=ants.create_ants_transform(transform_type='AffineTransform',precision='double',dimension=3)
            ants.write_transform(tx,matrix)
            fwd=str(root/'forward.nii.gz'); inv=str(root/'inverse.nii.gz')
            result={'fwdtransforms':[fwd,matrix],'invtransforms':[matrix,inv]}
            self.assertEqual(self.c.deformation_pair(result),([fwd],[inv]))
            self.assertEqual(self.c.deformation_pair({'fwdtransforms':[fwd],'invtransforms':[inv]}),([fwd],[inv]))
            parameters=np.r_[np.eye(3).ravel(),[1e-12,0,0]]
            tx.set_parameters(parameters); ants.write_transform(tx,matrix)
            with self.assertRaises(ValueError): self.c.deformation_pair(result)
            with self.assertRaises(ValueError): self.c.deformation_pair({'fwdtransforms':[fwd,matrix],'invtransforms':[inv,matrix]})

    def test_recovery_requires_pinned_method_and_preserves_sources(self):
        self.assertTrue(hasattr(self.c,'recover_registration'),'retained recovery not implemented')
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp).resolve(); source=root/'source'; source.mkdir(); output=root/'out'; output.mkdir()
            old={'arguments':['unchanged'],'roles':{'fixed':'fixed'},'technical_policy':{'budget':.5},'environment_identity':{}}
            p=source/'method.json'; p.write_text(__import__('json').dumps(old))
            files=[source/name for name in ('warp.nii.gz','identity.mat','inverse.nii.gz')]
            for i,f in enumerate(files): f.write_bytes(bytes([i]))
            method=dict(old,recovery={'method':str(p),'fwdtransforms':[str(files[0]),str(files[1])],'invtransforms':[str(files[1]),str(files[2])]})
            with self.assertRaises(ValueError): self.c.recover_registration(method,set(),output)
            self.assertEqual(list(output.iterdir()),[])
            changed=dict(method,arguments=['different'])
            verified={str(f) for f in [p,*files]}
            with self.assertRaises(ValueError): self.c.recover_registration(changed,verified,output)
            self.assertEqual(list(output.iterdir()),[])
            result=self.c.recover_registration(method,verified,output)
            self.assertEqual(result['fwdtransforms'],[str(output/files[0].name),str(output/files[1].name)])
            for i,f in enumerate(files): self.assertEqual(f.read_bytes(),bytes([i])); self.assertEqual((output/f.name).read_bytes(),bytes([i]))
            with self.assertRaises(ValueError): self.c.recover_registration(method,verified,output)

    def test_source_comparison_does_not_require_mesh_packages(self):
        path=HERE.parent/'2026-09-07-domain-atlas-selection/evaluate.py'
        spec=importlib.util.spec_from_file_location('source_comparison',path)
        module=importlib.util.module_from_spec(spec)
        try:
            spec.loader.exec_module(module)
        except ModuleNotFoundError as error:
            self.fail('pure atlas comparator imports unrelated mesh package: '+str(error))
        self.assertEqual(module.compare(np.array([101,3,255]),np.array([1,41,46])).tolist(),[0,0,0])

    def test_candidate_refuses_unpinned_method(self):
        self.assertTrue(hasattr(self.c,'run_candidate'), 'candidate runner not implemented')
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp).resolve(); output=root/'out'; output.mkdir()
            method=root/'method.json'; method.write_text('{}')
            with self.assertRaises(ValueError): self.c.run_candidate(method,'0'*64,output)
            self.assertEqual(list(output.iterdir()),[])
            (output/'keep').write_text('preserve')
            with self.assertRaises(ValueError): self.c.run_candidate(method,'0'*64,output)
            self.assertEqual((output/'keep').read_text(),'preserve')

    def test_adjacent_swap_cannot_pass_jacobian_gate(self):
        field=np.zeros((6,5,5,3)); field[...,0]=np.where(np.indices((6,5,5))[0]%2==0,1.,-1.)
        labels=np.zeros((6,5,5),np.uint8); labels[2,2,2]=1
        np.testing.assert_array_equal(self.c.jacobian(field,np.eye(4)),1)
        self.assertEqual(self.c.roundtrip(field,field,np.eye(4))['max_mm'],0)
        report=self.c.technical_report(labels,labels,np.ones_like(labels),field,field,np.eye(4))
        self.assertFalse(report['numerical_pass'],'central stencil must not certify adjacent-voxel swaps')

    def test_lps_field_decoding_matches_image_pullback(self):
        self.assertTrue(hasattr(self.c,'read_field'), 'field decoder not implemented')
        with tempfile.TemporaryDirectory() as tmp:
            tmp=Path(tmp).resolve()
            # ITK direction columns and vectors both expressed in LPS.
            values=np.zeros((7,7,7,3),np.float32); values[...,0]=-2
            image=ants.from_numpy(values,origin=(3,3,-3),spacing=(1,1,1),
                                  direction=np.diag([-1.,-1.,1.]),has_components=True)
            path=tmp/'field.nii.gz'; ants.image_write(image,str(path))
            field,affine=self.c.read_field(path)
            np.testing.assert_array_equal(field[...,0],2)
            np.testing.assert_array_equal(field[...,1:],0)
            expected=np.eye(4); expected[:3,3]=[-3,-3,-3]
            np.testing.assert_array_equal(affine,expected)
            labels=np.zeros((7,7,7),np.float64); labels[4,3,3]=52
            p=tmp/'labels.nii'; nib.save(nib.Nifti1Image(labels,affine),p)
            scalar=self.c.read_ras(p)
            warped,support=self.c.resample_labels(scalar,scalar,[str(path)],[False])
            self.assertEqual(warped[2,3,3],52)
            self.assertEqual(int(support[-2:].sum()),0)

    def test_exact_registration_arguments_without_fitting(self):
        self.assertTrue(hasattr(self.c,'register'), 'registration invocation not implemented')
        import importlib
        import re
        from unittest.mock import patch
        module=importlib.import_module('ants.registration.registration')
        image=ants.from_numpy(np.zeros((5,5,5),np.float32)).clone('double')
        captured=[]
        class Captured(Exception): pass
        def capture(args):
            captured.extend(args)
            raise Captured()
        with patch.object(module,'get_lib_fn',return_value=capture):
            with self.assertRaises(Captured): self.c.register(image,image,'PREFIX')
        normalized=[re.sub(r'(?<=[,\[])0x[0-9a-fA-F]+(?=[,\]])','PTR',str(s)) for s in captured]
        self.assertEqual(normalized,[
            '--dimensionality','3','-r','Identity','--metric','CC[PTR,PTR,1,4]',
            '--transform','SyN[0.200000,3.000000,0.000000]',
            '--convergence','[50x50x30,1e-7,8]','--smoothing-sigmas','2x1x0',
            '--shrink-factors','4x2x1','-u','0','-z','1',
            '--output','[PREFIX,PTR,PTR]','-x','[NA,NA]','--random-seed','0',
            '--float','0','--write-composite-transform','0','-v','1'])

    def test_output_guard_preserves_existing_and_rejects_ancestor_symlink(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp).resolve(); out=root/'out'; out.mkdir()
            self.assertEqual(self.c.check_output(out),out)
            (out/'keep').write_text('unchanged')
            with self.assertRaises(ValueError): self.c.check_output(out)
            alias=root/'alias'; alias.symlink_to(root,target_is_directory=True)
            empty=root/'empty'; empty.mkdir()
            with self.assertRaises(ValueError): self.c.check_output(alias/'empty')
            self.assertEqual((out/'keep').read_text(),'unchanged')
            with self.assertRaises(ValueError): self.c.check_output(self.c.REPO/'public')


if __name__=='__main__':
    unittest.main()
