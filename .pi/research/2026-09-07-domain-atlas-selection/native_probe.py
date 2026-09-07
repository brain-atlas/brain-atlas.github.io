"""Private native MINC2 inspection; axis permutation only, never registration."""
import argparse
import copy
import json
from pathlib import Path
import shutil

import nibabel as nib
import numpy as np
from PIL import Image, ImageDraw

import evaluate as e
from tools.assets.common import compute_environment_identity

WHEEL_SHA='ef9603a501a04fcd0ba28dd8f0995303d26a77a980a1f9474b3417543d4c6174'
TREE_SHA='69ca6dc35e165dd9a8eecf252bb7262ef4beaebfda6cc9cd44ce8c8d53faaad8'
SUMMARY_SHA='ec0145691e7d8720c5039c05f09425d0fe61244ca3f127c41f0fe9036807ea3e'
FIXED={(11,0),(149,2),(1154,1),(3,0),(47,5),(99,7),(0,0)}


def canonical_data(image,shape,affine):
    oriented=nib.as_closest_canonical(image)
    if oriented.shape!=shape or not np.array_equal(oriented.affine,affine):
        raise ValueError('native canonical grid differs; registration not permitted')
    data=np.asarray(oriented.dataobj,dtype=np.float64)
    if not np.isfinite(data).all():
        raise ValueError('nonfinite native image')
    return data


def photometry(native,reference,mask):
    if native.shape!=reference.shape or mask.shape!=native.shape or mask.dtype!=bool or not mask.any():
        raise ValueError('photometry requires matching volumes and nonempty support mask')
    normalized=[]; windows=[]
    for data in (native,reference):
        if not np.isfinite(data).all(): raise ValueError('nonfinite T1')
        low,high=np.percentile(data[mask],[1,99])
        if not high>low: raise ValueError('empty intensity window')
        windows.append([float(low),float(high)])
        normalized.append(np.clip((data-low)/(high-low),0,1))
    a,b=normalized; delta=np.abs(a[mask]-b[mask])
    return {'maskVoxels':int(mask.sum()),'windows':windows,
            'pearson':float(np.corrcoef(a[mask],b[mask])[0,1]),
            'meanAbsoluteNormalizedDifference':float(delta.mean()),
            'medianAbsoluteNormalizedDifference':float(np.median(delta)),
            'p95AbsoluteNormalizedDifference':float(np.percentile(delta,95)),
            'meaning':'photometry on positive CerebrA label support; not anatomical accuracy or registration error'},a,b


def panels(native,reference,labels,reps,output):
    colors=np.array([(0,0,0),(255,215,45),(255,75,55),(60,90,255),(120,90,255),
                     (240,60,240),(170,100,220),(240,160,90),(60,240,100),(170,170,170),(255,255,255),(0,0,0)],np.uint8)
    files=[]
    for rep in reps:
        sheet=Image.new('RGB',(1000,900),'#151515'); draw=ImageDraw.Draw(sheet)
        point=np.array(rep['rasMm']); voxel=point-e.AFFINE[:3,3]
        draw.text((10,8),f"Native inspection: contour {rep['index']}/point {rep['point']} RAS mm {rep['rasMm']}",fill='white')
        draw.text((10,28),'Columns: symmetric native | symmetric+CerebrA | asymmetric reference | asymmetric+CerebrA',fill='white')
        draw.text((10,48),'Same unwarped labels; no registration. Native voxel-axis permutation only. Photometry is NOT anatomical accuracy.',fill='white')
        draw.text((10,68),'Yellow cortex; red stem; blue ventricles; magenta cerebellar GM; purple WM; orange vermis; green deep; gray composite.',fill='white')
        for axis,orientation in enumerate(('sagittal P->A,S up','coronal L->R,S up','axial L->R,A up')):
            index=int(np.rint(voxel[axis])); top=112+axis*258
            draw.text((10,top),f'{orientation}; {"xyz"[axis]}={index+e.AFFINE[axis,3]:g}mm; point minus slice {voxel[axis]-index:+.2f}mm',fill='white')
            lab=e.anatomy.slice_pixels(labels,axis,index); ids=e.group_ids(lab); images=[]
            for volume in (native,reference):
                gray=np.rint(e.anatomy.slice_pixels(volume,axis,index)*255).astype(np.uint8)
                rgb=np.repeat(gray[...,None],3,axis=2); overlay=rgb.copy(); mask=lab>0
                overlay[mask]=np.rint(.55*rgb[mask]+.45*colors[ids[mask]]).astype(np.uint8)
                images.extend((rgb,overlay))
            retained=[i for i in range(3) if i!=axis]
            for col,pixels in enumerate(images):
                x=10+col*248; y=top+20; sheet.paste(Image.fromarray(pixels),(x,y))
                u=x+voxel[retained[0]]; v=y+pixels.shape[0]-1-voxel[retained[1]]
                draw.line((u-3,v,u+3,v),fill='white');draw.line((u,v-3,u,v+3),fill='white')
        name=f"native-{rep['index']:05d}-{rep['point']}.png";sheet.save(output/name);files.append(name)
    return files


def run(inputs,reference,summary_path,wheel,output):
    output=e.check_output(output)
    for path in (inputs,reference,summary_path,wheel):
        if any(p.is_symlink() for p in (path,*path.parents)): raise ValueError('symlink input path')
    if wheel.stat().st_size!=2807335 or e.sha256_file(wheel)!=WHEEL_SHA:raise ValueError('wheel drift')
    manifest=e.validate_manifest();e.verify_environment(Path(shutil.which('uv')),manifest)
    extended=copy.deepcopy(manifest)
    extended['environment']['directPackages'].append({'name':'h5py','version':'3.14.0'})
    environment=compute_environment_identity(Path(shutil.which('uv')),extended)
    if environment['distributionTreeSha256']['h5py']!=TREE_SHA:raise ValueError('h5py installed tree drift')
    if e.sha256_file(e.HERE/'source-manifest.json')!=e.MANIFEST_SHA or e.sha256_file(summary_path)!=SUMMARY_SHA:
        raise ValueError('source inventory or diagnostic summary drift')
    inventory=json.loads((e.HERE/'source-manifest.json').read_text())
    paths=e.resolve_inputs(inputs,inventory['files']);refs=e.resolve_inputs(reference,e.REFERENCE_SOURCES)
    candidate=e.check_image(nib.load(paths['CerebrA.nii']))
    image=nib.load(paths['mni_icbm152_t1_tal_nlin_sym_09c.mnc'])
    if not isinstance(image,nib.Minc2Image) or image.shape!=(193,229,193) or image.get_data_dtype()!=np.dtype('uint16') or not np.array_equal(image.affine,e.AFFINE[:,[2,1,0,3]]):
        raise ValueError('native MINC2 header differs')
    native=canonical_data(image,(193,229,193),e.AFFINE)
    reference_data=e.anatomy.check_volume(nib.load(refs['t1']),(193,229,193),e.AFFINE)
    stats,a,b=photometry(native,reference_data,candidate>0)
    summary=json.loads(summary_path.read_text())
    reps=[r for r in summary['representatives'] if (r['index'],r['point']) in FIXED]
    if {(r['index'],r['point']) for r in reps}!=FIXED:raise ValueError('fixed native representatives missing')
    import h5py
    result={'kind':'native-template-inspection-v1','approval':'brain-atlas-g7fk',
            'sourceInventorySha256':e.MANIFEST_SHA,'inputSummarySha256':SUMMARY_SHA,
            'wheelSha256':WHEEL_SHA,'environment':environment,'hdf5Version':h5py.version.hdf5_version,
            'scriptSha256':e.sha256_file(Path(__file__)),'diagnosticScriptSha256':e.sha256_file(e.HERE/'evaluate.py'),
            'nativeStorageDtype':'uint16','nativeAffine':image.affine.tolist(),'canonicalAffine':e.AFFINE.tolist(),
            'canonicalRange':[float(native.min()),float(native.max())],
            'photometry':stats,'figures':panels(a,b,candidate,reps,output),'representatives':reps,
            'manualReviewStatus':'pending',
            'limitations':['Axis reorder is not a template warp; symmetric/asymmetric anatomy not made equal.',
                           'Photometric similarity does not validate anatomical boundaries or registration uncertainty.',
                           'CerebrA positive label support is not whole brain, cortical ribbon or cerebral white matter.',
                           'No anatomical classifier, domain-only outcome, primary assignment, source redistribution or runtime change.']}
    (output/'native-summary.json').write_text(json.dumps(result,sort_keys=True,allow_nan=False,separators=(',',':'))+'\n')
    print(json.dumps(stats))


if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ('inputs','reference','summary','wheel','output'):p.add_argument('--'+name,type=Path,required=True)
    args=p.parse_args()
    run(args.inputs.absolute(),args.reference.absolute(),args.summary.absolute(),args.wheel.absolute(),args.output.absolute())
