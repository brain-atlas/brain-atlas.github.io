import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function python(source) {
  assert.equal(existsSync(new URL('../tools/assets/swm_domains.py', import.meta.url)), true, 'missing SWM domain audit');
  const result = spawnSync('uv', ['run', '--python', '3.13.1', '--offline', '--with-requirements', 'tools/assets/requirements.lock', 'python', '-c', source], {
    cwd: new URL('../', import.meta.url), encoding: 'utf8', env: { ...process.env, PYTHONPATH: '.' },
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

test('domain sampling freezes ties, negative bounds, invalid input and complete rounding cells', () => { // Tests INV-15, FAIL-13
  python(String.raw`
import numpy as np
from tools.assets.swm_domains import sample_voxels, domain_ids, rounding_options, probe_grid
v = np.zeros((4, 3, 3), dtype=np.uint16)
v[0] = 1; v[1] = 255; v[2] = 5; v[3] = 101
p = np.array([[-.5,1,1],[.5,1,1],[1.5,1,1],[2.5,1,1],[-.6,1,1],[10,1,1]])
assert sample_voxels(v,p).tolist() == [1,1,5,5,-1,-1]
assert sample_voxels(v,p,'positive-tie').tolist() == [1,255,5,101,-1,-1]
assert domain_ids(np.array([0,1,2,3,4,5,34,51,101,196,255,-1])).tolist() == [0,1,1,2,2,3,4,4,5,5,6,7]
for invalid in [np.array([[np.nan,0,0]]), np.array([[np.inf,0,0]]), np.array([1,2,3])]:
    try: sample_voxels(v, invalid)
    except ValueError: pass
    else: raise AssertionError('invalid point accepted')
try: domain_ids(np.array([99]))
except ValueError: pass
else: raise AssertionError('unknown label accepted')
masks = rounding_options(v, np.array([[.5,1,1],[1.,1,1],[-.5,1,1]]))
assert masks.tolist() == [(1<<1)|(1<<6), 1<<6, (1<<7)|(1<<1)]
grid, variants = probe_grid(v,np.array([[1.,1,1]]))
assert len(variants) == 27
assert grid.tolist() == [(1<<1)|(1<<6)|(1<<3)]
# Interior cells are enumerated, not merely eight corners: the centre is label255.
assert (grid[0] & (1<<6)) != 0
`);
});

test('domain summaries partition every contour, preserve reversal and freeze strata', () => { // Tests INV-15
  python(String.raw`
import numpy as np
from tools.assets.swm_domains import summarize, strata, target_partition
ids=np.array([[1]*8,[6]*5+[1]*3,[1]*4+[6]*4,[6,1,1,1,1,1,1,6]])
a=summarize(ids)
assert a['contours']==4 and sum(a['points'].values())==32 and sum(a['endpoints'].values())==8
assert sum(a['endpointPairs'].values())==sum(a['majority'].values())==sum(a['allSameOrMixed'].values())==4
assert a['majority']['no-majority']==1 and a['allSameOrMixed']['mixed']==3
assert a['anyPoint']['cerebellum_and_midbrain_source_label255']==3
assert a==summarize(ids[:,::-1])
points=np.zeros((4,8,3)); points[0,:,0]=-1; points[2,:,0]=20
s=strata(points,np.array([8.,15.,40.,55.]),['known','ambiguous','unknown','known'])
assert s['hemisphere']==['L','R','R','R']
assert s['shippedLengthMm']==['[8,15)','[15,25)','[40,55]','[40,55]']
assert s['centre20mmCell'][0]=='-1,0,0'
bits=np.left_shift(1,ids).astype(np.uint16)
grid=bits.copy(); grid[2,:] |= 1<<0
interior=ids==6
r=target_partition(ids,bits,grid,interior,[6])
assert r['counts']=={'no-baseline-hit':1,'stable-interior-hit':2,'probe-stable-hit-only':0,'boundary-sensitive-hit-only':1}
assert sum(r['counts'].values())==4
`);
});

test('audit CLI exposes explicit local terms and loads pinned legacy strata', () => { // Tests INV-15
  const result = spawnSync('python3', ['-m', 'tools.assets', 'audit', 'swm-domains', '--help'], { cwd: new URL('../', import.meta.url), encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /--accept-local-screening-terms/);
  python(String.raw`
import json
from pathlib import Path
from collections import Counter
from tools.assets.swm_domains import load_displayed
m=json.loads(Path('tools/assets/manifest.json').read_text())
p=next(p for p in m['pipelines'] if p['id']=='swm-domains')['parameters']
points,lengths,quality=load_displayed(Path('.'),p)
assert points.shape==(15000,8,3) and lengths.shape==(15000,)
assert Counter(quality)=={'known':3576,'unknown':7479,'ambiguous':3945}
`);
});

test('domain input forms, source hashes and isolated outputs fail closed', () => { // Tests FAIL-13, INV-3/5
  python(String.raw`
from pathlib import Path
import tempfile
import nibabel as nib
import numpy as np
from tools.assets.swm_domains import load_carpet
from tools.assets.common import resolve_inputs, require_empty_output_root
with tempfile.TemporaryDirectory() as td:
    root=Path(td); p=root/'carpet.nii.gz'
    aff=np.eye(4); data=np.zeros((193,229,193),np.uint16)
    im=nib.Nifti1Image(data,aff); im.set_qform(aff,4); im.set_sform(aff,4); im.header.set_xyzt_units('mm'); nib.save(im,p)
    try: load_carpet(p)
    except ValueError: pass
    else: raise AssertionError('wrong pinned affine accepted')
    try: resolve_inputs(root,[{'id':'carpet','filename':p.name,'bytes':p.stat().st_size,'sha256':'0'*64}])
    except ValueError: pass
    else: raise AssertionError('changed hash accepted')
    pub=root/'public'; pub.mkdir()
    for out in [root,pub]:
        try: require_empty_output_root(out,root)
        except ValueError: pass
        else: raise AssertionError('unsafe output accepted')
    link=root/'linked'; link.symlink_to(pub,target_is_directory=True)
    try: require_empty_output_root(link,root)
    except ValueError: pass
    else: raise AssertionError('symlink output accepted')
`);
});
