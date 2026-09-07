"""Private eight-sample holdout inspection; no anatomical accuracy claim or network."""
import argparse
import hashlib
import json
from pathlib import Path
import sys

import nibabel as nib
import numpy as np
from PIL import Image, ImageDraw

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0,str(REPO))
from tools.assets.common import require_empty_output_root, validate_manifest
from tools.assets.cortex import load_nifti_with_matching_forms
from tools.assets.swm_bundles import _verify_file, load_bundle_volume, parse_labels
from tools.assets.swm_domains import AFFINE, load_displayed


def crop_slice(data, axis, voxel, radius=40):
    centre=np.rint(voxel).astype(int)
    if not np.all((centre >= 0)&(centre < data.shape)):
        raise ValueError('point outside image')
    u,v=[centre[i] for i in range(3) if i != axis]
    plane=np.pad(np.take(data,centre[axis],axis=axis),radius)
    return np.flipud(plane[u:u+2*radius+1,v:v+2*radius+1].T)


def self_test():
    data=np.arange(7*8*9).reshape(7,8,9)
    for axis in range(3):
        tile=crop_slice(data,axis,[2,3,4],2)
        assert tile.shape==(5,5) and tile[2,2]==data[2,3,4]
        other=[i for i in range(3) if i != axis]
        p=[2,3,4];p[other[0]]+=1
        assert tile[2,3]==data[tuple(p)]
        p=[2,3,4];p[other[1]]+=1
        assert tile[1,2]==data[tuple(p)]
    try:crop_slice(data,0,[-2,0,0])
    except ValueError:pass
    else:raise AssertionError('outside point accepted')
    print('PASS: three-plane crop centre/orientation and bounds; no network')


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--self-test',action='store_true')
    for name in ('t1','inputs','masked-mpm','summary','output'):
        parser.add_argument('--'+name,type=Path)
    args=parser.parse_args()
    if args.self_test:
        self_test();return
    if any(getattr(args,k) is None for k in ('t1','inputs','masked_mpm','summary','output')):
        parser.error('all five input/output paths required')
    require_empty_output_root(args.output,REPO)
    require_empty_output_root(args.output.resolve(),REPO)
    t1pin={'bytes':13685075,'sha256':'1f27aabea9f7183dc0c69dafa71e1787b921ca778d655d9c1bf302b273d5627a'}
    _verify_file(args.t1,t1pin)
    inventory=json.loads((REPO/'tools/assets/swm-bundle-sources.json').read_text())
    byname={r['filename']:r for r in inventory['inputs']}
    for name in ('short-bundles_withoutSulciMask.nii','left-hemisphere_labels.txt','right-hemisphere_labels.txt'):
        _verify_file(args.inputs/name,byname[name])
    _verify_file(args.masked_mpm,inventory['maskedMpm'])
    labels=parse_labels({s:args.inputs/(s+'-hemisphere_labels.txt') for s in ('left','right')})
    masked=load_bundle_volume(args.masked_mpm,labels)
    unmasked=load_bundle_volume(args.inputs/'short-bundles_withoutSulciMask.nii',labels)
    image,affine=load_nifti_with_matching_forms(args.t1)
    if image.shape != (193,229,193) or not np.array_equal(affine,AFFINE) or image.header.get_xyzt_units()[0]!='mm':
        raise ValueError('T1 coordinate contract differs')
    t1=np.asarray(image.dataobj)
    if not np.isfinite(t1).all():raise ValueError('nonfinite T1')
    lo,hi=np.percentile(t1[t1>0],[1,99])
    gray=np.rint(np.clip((t1-lo)/(hi-lo),0,1)*255).astype(np.uint8)
    manifest=validate_manifest()
    parameters=next(p['parameters'] for p in manifest['pipelines'] if p['id']=='swm-domains')
    points,_,_=load_displayed(REPO,parameters)
    summary=json.loads(args.summary.read_text())
    expected_inventory=next(p['parameters']['sourceInventory']['sha256'] for p in manifest['pipelines'] if p['id']=='swm-bundles')
    if summary['sourceInventorySha256']!=expected_inventory:raise ValueError('summary source inventory differs')
    for group,index in summary['manualHoldoutIndices'].items():
        sheet=Image.new('RGB',(1040,360),'#151515');draw=ImageDraw.Draw(sheet)
        draw.text((8,6),f'Contour {index} | {group} | Eight stored samples, not continuous paths.',fill='white')
        draw.text((8,23),'T1; cyan = any masked MPM support; orange = unmasked-only. White cross = nearest voxel centre.',fill='white')
        draw.text((8,40),'Each triplet: sagittal (A right/S up), coronal (R right/S up), axial (R right/A up). No warp; not anatomical validation.',fill='white')
        for j,point in enumerate(points[index]):
            voxel=point-AFFINE[:3,3];centre=np.rint(voxel).astype(int)
            x=(j%4)*260;y=64+(j//4)*145
            m=int(masked[tuple(centre)]);u=int(unmasked[tuple(centre)])
            draw.text((x+4,y),f'P{j} RAS {point.tolist()}',fill='white')
            draw.text((x+4,y+15),f'MPM masked/unmasked: {m}/{u}',fill='white')
            draw.text((x+4,y+30),'slice offsets '+','.join(f'{a:.1f}' for a in voxel-centre),fill='white')
            for axis in range(3):
                tile=crop_slice(gray,axis,voxel)
                a=crop_slice(masked,axis,voxel)>0;b=crop_slice(unmasked,axis,voxel)>0
                rgb=np.repeat(tile[...,None],3,axis=2)
                for mask,color in [(b&~a,(255,140,0)),(a,(0,220,220))]:
                    rgb[mask]=np.rint(.55*rgb[mask]+.45*np.array(color)).astype(np.uint8)
                part=Image.fromarray(rgb);ink=ImageDraw.Draw(part)
                ink.line((36,40,44,40),fill='white');ink.line((40,36,40,44),fill='white')
                sheet.paste(part,(x+4+axis*85,y+48))
        sheet.resize((2080,720),Image.Resampling.NEAREST).save(args.output/f'contour-{index}.png')
    receipt={'scriptSha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),'summarySha256':hashlib.sha256(args.summary.read_bytes()).hexdigest(),
             't1':t1pin,'intensityWindow':[float(lo),float(hi)],'cropRadiusVoxels':40,'overlayAlpha':.45,'indices':summary['manualHoldoutIndices'],
             'limitations':'Gross support/slice mechanism inspection, not bundle identity, full-curve overlap or anatomical accuracy.'}
    (args.output/'panel-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print('Wrote six private holdout sheets; human/parent image inspection still required.')


if __name__=='__main__':main()
