"""Render preregistered nonexpert review slices; never modifies a candidate."""
from pathlib import Path
import importlib.util
import json

import nibabel as nib
import numpy as np
from PIL import Image, ImageDraw

from convert import check_output
from tools.assets.common import sha256_file

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('anatomy_review',HERE.parent/'2026-09-07-swm-domains/anatomy_probe.py')
anatomy=importlib.util.module_from_spec(spec); spec.loader.exec_module(anatomy)


def compare_decoded(first,second):
    """Exact scaled NIfTI arrays and physical grids, not container timestamps."""
    a,b=nib.load(first),nib.load(second)
    return (a.shape==b.shape and np.array_equal(a.affine,b.affine)
            and np.array_equal(np.asanyarray(a.dataobj),np.asanyarray(b.dataobj)))


def write_review(candidate,output):
    output=check_output(output)
    method=json.loads((candidate/'method.json').read_text())
    report=json.loads((candidate/'report.json').read_text())
    paths=[Path(method['roles']['moving']),Path(method['roles']['fixed']),Path(method['roles']['labels']),candidate/'labels.nii.gz',candidate/'support.nii.gz']
    images=[nib.load(p) for p in paths]; affine=images[1].affine
    if any(i.shape!=images[1].shape or not np.array_equal(i.affine,affine) for i in images):
        raise ValueError('review grids differ')
    native,fixed,original,moved,support=[np.asarray(i.dataobj) for i in images]
    gray=[]; windows=[]
    for volume in (native,fixed):
        low,high=np.percentile(volume[volume>0],[1,99])
        if not np.isfinite(volume).all() or high<=low: raise ValueError('invalid display window')
        gray.append(np.rint(255*np.clip((volume-low)/(high-low),0,1)).astype(np.uint8)); windows.append([float(low),float(high)])
    selected={}
    for axis,name in enumerate('xyz'):
        for world in method['review_selection']['fixed_ras_slices'][name]:
            index=int(np.rint(world-affine[axis,3]))
            selected.setdefault((axis,index),[]).append('fixed')
    for n,entry in enumerate(report['displacement']):
        for axis,index in enumerate(entry['max_index']): selected.setdefault((axis,index),[]).append(f'field{n} max')
    rows=[dict(axis=a,index=i,reasons=reasons) for (a,i),reasons in sorted(selected.items())]
    files=[]
    palette=np.array([[0,0,0]]+[[70+(i*67)%186,70+(i*103)%186,70+(i*149)%186] for i in range(1,103)],np.uint8)
    for first in range(0,len(rows),4):
        sheet=Image.new('RGB',(1000,1160),'#141414'); draw=ImageDraw.Draw(sheet)
        draw.text((10,8),'CerebrA technical candidate | NONEXPERT REVIEW | Anatomy UNVALIDATED',fill='white')
        draw.text((10,28),'Native + source labels | Target + source labels | Target + warped labels | Target + outside support (red)',fill='white')
        draw.text((10,48),'Colors identify original IDs only; not function/domain accuracy. Display windows only, not fitting normalization.',fill='white')
        for row,entry in enumerate(rows[first:first+4]):
            axis,index=entry['axis'],entry['index']; top=80+row*267
            if not 0<=index<fixed.shape[axis]: raise ValueError('selected review slice outside grid')
            coordinate=index+affine[axis,3]
            orientation=('P to A, S up','L to R, S up','L to R, A up')[axis]
            draw.text((10,top),f'{"xyz"[axis]}={coordinate:g} mm; {orientation}; '+','.join(entry['reasons']),fill='white')
            for col,(background,labels) in enumerate(((gray[0],original),(gray[1],original),(gray[1],moved),(gray[1],None))):
                pixels=np.repeat(anatomy.slice_pixels(background,axis,index)[...,None],3,axis=2)
                if labels is None:
                    mask=anatomy.slice_pixels(support,axis,index)==0; colors=np.full_like(pixels,(255,50,50))
                else:
                    ids=anatomy.slice_pixels(labels,axis,index).astype(int)
                    if not np.isin(ids,range(103)).all(): raise ValueError('invalid label ID')
                    mask=ids>0; colors=palette[ids]
                pixels[mask]=np.rint(.6*pixels[mask]+.4*colors[mask]).astype(np.uint8)
                sheet.paste(Image.fromarray(pixels),(10+col*248,top+20))
        filename=f'review-{first//4+1:02d}.png'; sheet.save(output/filename); files.append(filename)
    result=dict(status='awaiting nonexpert inspection',anatomical_status='unvalidated',slices=rows,files=files,
                display_windows=windows,script_sha256=sha256_file(Path(__file__)),
                inputs={str(p):sha256_file(p) for p in paths},candidate_report_sha256=sha256_file(candidate/'report.json'))
    (output/'review-receipt.json').write_text(json.dumps(result,indent=2,allow_nan=False)+'\n')
    return result


if __name__=='__main__':
    import argparse
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('candidate',type=Path); p.add_argument('output',type=Path)
    args=p.parse_args(); print(json.dumps(write_review(args.candidate,args.output)))
