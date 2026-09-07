import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function python(source) {
  assert.ok(existsSync(new URL('../tools/assets/swm_bundles.py', import.meta.url)), 'missing private bundle evaluator');
  const result = spawnSync('uv', ['run', '--python', '3.13.1', '--offline', '--with-requirements', 'tools/assets/requirements.lock', 'python', '-c', source], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8', env: { ...process.env, PYTHONPATH: '.' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('bundle evidence keeps strict majority, ties, eligibility, hemispheres and native values distinct', () => { // Tests INV-16
  python(String.raw`
import numpy as np
from tools.assets.swm_bundles import categorical_evidence, continuous_evidence, source_group, holdout_key
hemi={1001:'L',2001:'R'}
a=categorical_evidence([1001]*5+[2001,0,-1], 'L', True, hemi)
assert a['primary']==1001 and a['coveredSamples']==6 and a['outsideSamples']==1
assert a['counts']==[[1001,5],[2001,1]]
assert a==categorical_evidence(list(reversed([1001]*5+[2001,0,-1])), 'L', True, hemi)
assert categorical_evidence([1001]*4+[2001]*4,'L',True,hemi)['primary'] is None
assert categorical_evidence([1001]*8,'R',True,hemi)['reason']=='hemisphere-conflict'
assert categorical_evidence([1001]*8,'L',False,hemi)['reason']=='source-ineligible'
assert categorical_evidence([0]*8,'L',True,hemi)['reason']=='no-support'
assert source_group([1,5]*4)=='all-cerebral-source'
assert source_group([2,3,4,6]*2)=='all-broad-noncerebral-deep-source'
assert source_group([0]*8)=='mixed-other-source'
v=np.array([[.1,.2,.3,100,0,0,0,0]])
b=continuous_evidence(v)
assert b['positiveSamples'].tolist()==[4] and b['maximum'].tolist()==[100.]
assert np.array_equal(b['mean'],continuous_evidence(v[:,::-1])['mean'])
assert len(holdout_key(0))==64 and holdout_key(0)==holdout_key(0)
for bad in [[1001]*7, [9999]*8, [float('nan')]*8]:
    try: categorical_evidence(bad,'L',True,hemi)
    except ValueError: pass
    else: raise AssertionError('invalid categorical data accepted')
for bad in [np.full((1,8),np.nan),np.full((1,8),-1),np.full((1,8),101),np.zeros((1,7))]:
    try: continuous_evidence(bad)
    except ValueError: pass
    else: raise AssertionError('invalid continuous data accepted')
`);
});

test('bundle labels, forms, source pins and explicit CLI fail closed', () => { // Tests INV-16, FAIL-14
  python(String.raw`
import json, tempfile
from pathlib import Path
import nibabel as nib
import numpy as np
from tools.assets.swm_bundles import parse_labels, load_bundle_volume, audit_swm_bundles
from tools.assets.swm_domains import AFFINE, sample_voxels
from tools.assets.common import resolve_inputs
with tempfile.TemporaryDirectory() as td:
    root=Path(td); paths={}
    for hemi,start,n in [('left',1001,365),('right',2001,308)]:
        path=root/(hemi+'-hemisphere_labels.txt')
        path.write_text(''.join(f'{i}: {hemi[0]}h_Test_{i}_short.bundles,\n' for i in range(start,start+n)))
        paths[hemi]=path
    labels=parse_labels(paths)
    assert len(labels)==673 and labels[1001]['hemisphere']=='L' and labels[2001]['hemisphere']=='R'
    paths['left'].write_text(paths['left'].read_text()+'1001: lh_Duplicate_short.bundles,\n')
    try: parse_labels(paths)
    except ValueError: pass
    else: raise AssertionError('duplicate label accepted')
    p=root/'bad.nii'; im=nib.Nifti1Image(np.zeros((2,2,2),np.int16),np.eye(4))
    im.set_qform(np.eye(4),4); im.set_sform(np.eye(4),4); nib.save(im,p)
    try: load_bundle_volume(p)
    except ValueError: pass
    else: raise AssertionError('wrong grid accepted')
    try: resolve_inputs(root,[{'id':'bad','filename':p.name,'bytes':p.stat().st_size,'sha256':'0'*64}])
    except ValueError: pass
    else: raise AssertionError('unsafe/incomplete source set accepted')
    # Exercise the bundle loader itself, not just the shared NIfTI helper.
    data=np.zeros((193,229,193),np.float32)
    def save(value=0, qform=AFFINE, units='unknown'):
        data[0,0,0]=value
        image=nib.Nifti1Image(data,AFFINE)
        image.set_qform(qform,4); image.set_sform(AFFINE,4)
        image.header.set_xyzt_units(units)
        nib.save(image,p)
    save(1001)
    assert load_bundle_volume(p,labels)[0,0,0]==1001
    changed=AFFINE.copy(); changed[0,3]+=1
    for value,forms,units,categorical in [(9999,AFFINE,'unknown',True),(.5,AFFINE,'unknown',True),
            (np.nan,AFFINE,'unknown',False),(-1,AFFINE,'unknown',False),(101,AFFINE,'unknown',False),
            (0,changed,'unknown',False),(0,AFFINE,'mm',False)]:
        save(value,forms,units)
        try: load_bundle_volume(p,labels if categorical else None)
        except ValueError: pass
        else: raise AssertionError('bundle value/form/unit drift accepted')
    save(100)
    assert load_bundle_volume(p)[0,0,0]==100
    sample=np.zeros((2,2,2),np.int16); sample[0,0,0]=1001; sample[1,0,0]=2001
    coords=np.array([[-.6,0,0],[.5,0,0],[1.5,0,0],[1e30,0,0]])
    assert sample_voxels(sample,coords).tolist()==[-1,1001,-1,-1]
    assert sample_voxels(sample,coords,'positive-tie').tolist()==[-1,2001,-1,-1]
    # Unsafe targets must fail before inventory or scientific parsing.
    public=root/'public'; public.mkdir()
    occupied=root/'occupied'; occupied.mkdir(); (occupied/'keep').write_text('keep')
    alias=root/'alias'; alias.symlink_to(public,target_is_directory=True)
    for output in [public,occupied,alias]:
        try: audit_swm_bundles(root,p,p,root,output,{})
        except ValueError: pass
        else: raise AssertionError('unsafe output accepted')
    assert (occupied/'keep').read_text()=='keep' and not list(public.iterdir())
`);
  const result = spawnSync('python3', ['-m', 'tools.assets', 'audit', 'swm-bundles', '--help'], { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  for (const arg of ['--domain-records', '--masked-mpm', '--accept-local-screening-terms']) assert.ok(result.stdout.includes(arg));
  const denied = spawnSync('python3', ['-m', 'tools.assets', 'audit', 'swm-bundles', '--inputs', '.', '--repo', '.', '--output', '.', '--masked-mpm', 'missing', '--domain-records', 'missing'], { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
  assert.equal(denied.status, 1);
  assert.match(denied.stderr, /requires --accept-local-screening-terms/);
});
