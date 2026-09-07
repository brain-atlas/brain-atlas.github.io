"""Private common-RAS source comparison; never anatomical assignment or a warp."""
import argparse
from collections import Counter
import csv
import importlib.util
from itertools import product
import json
from pathlib import Path
import shutil
import sys

import nibabel as nib
import numpy as np

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO))
from tools.assets.common import (require_empty_output_root, resolve_inputs, sha256_file,
                                 validate_manifest, verify_environment)
from tools.assets.swm_domains import (AFFINE, BROAD, DOMAINS, domain_ids,
                                     load_carpet, load_displayed, sample_voxels, strata)

HERE = Path(__file__).resolve().parent
ANATOMY_PATH = HERE.parent/'2026-09-07-swm-domains/anatomy_probe.py'
_spec = importlib.util.spec_from_file_location('retained_anatomy_probe',ANATOMY_PATH)
anatomy = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(anatomy)
METHOD = 'cerebra-carpet-comparison-v1'
MANIFEST_SHA = 'f811f8b728beb413e0c33cd40d28160f857aaa6fcef612a2af8342dc973e1231'
RIGHT_NAMES = {1:'Rostral Middle Frontal',2:'Vermal lobules VI-VII',3:'Inferior temporal',4:'Accumbens Area',5:'Inferior Lateral Ventricle',6:'Pericalcarine',7:'Lateral Orbitofrontal',8:'Rostral Anterior Cingulate',9:'Superior Parietal',10:'Inferior Parietal',11:'Brainstem',12:'Lingual',13:'Postcentral',14:'Transverse Temporal',15:'Medial Orbitofrontal',16:'Paracentral',17:'Optic Chiasm',18:'Parahippocampal',19:'Amygdala',20:'Vermal lobules VIII-X',21:'Putamen',22:'Pars Triangularis',23:'Insula',24:'Fusiform',25:'Basal Forebrain',26:'Ventral Diencephalon',27:'Pallidum',28:'Middle Temporal',29:'Third Ventricle',30:'Caudal Anterior Cingulate',31:'Precuneus',32:'Pars Opercularis',33:'Isthmus Cingulate',34:'Lateral Occipital',35:'Precentral',36:'Entorhinal',37:'Fourth Ventricle',38:'Superior Frontal',39:'Cerebellum White Matter',40:'Thalamus',41:'Lateral Ventricle',42:'Caudal Middle Frontal',43:'Cuneus',44:'Pars Orbitalis',45:'Superior Temporal',46:'Cerebellum Gray Matter',47:'Posterior Cingulate',48:'Hippocampus',49:'Caudate',50:'Vermal lobules I-V',51:'Supramarginal'}
GROUPS = ('background','cortex','brainstem','lateral_or_inferior_lateral_ventricle',
          'third_or_fourth_ventricle','cerebellar_gray','cerebellar_white','vermis',
          'named_deep_gray','composite_ventral_diencephalon_or_basal_forebrain',
          'optic_chiasm','outside-grid')
RIGHT_GROUPS = ([],[1,3,6,7,8,9,10,12,13,14,15,16,18,22,23,24,28,30,31,32,33,34,35,36,38,42,43,44,45,47,51],
                [11],[5,41],[29,37],[46],[39],[2,20,50],[4,19,21,27,40,48,49],[25,26],[17])
STATES = ('supported','conflicting','unresolved')
REFERENCE_SOURCES = [
    {'id':'carpet','filename':'tpl-MNI152NLin2009cAsym_res-01_desc-carpet_dseg.nii.gz','bytes':451304,'sha256':'52eded597985fee7806699dfd276d32b1d53293dff04326773e4fe84864752c7'},
    {'id':'t1','filename':'tpl-MNI152NLin2009cAsym_res-01_T1w.nii.gz','bytes':13685075,'sha256':'1f27aabea9f7183dc0c69dafa71e1787b921ca778d655d9c1bf302b273d5627a'},
]


def parse_labels(stream):
    rows = list(csv.reader(stream))
    if len(rows) != 53 or rows[0][:4] != ['Mindboggle ID','Label Name','CerebrA ID',''] or rows[1][2:4] != ['RH Labels','LH Labels']:
        raise ValueError('CerebrA CSV header/count differs')
    labels = {}
    for row in rows[2:]:
        if len(row) != 6:
            raise ValueError('CerebrA CSV row width differs')
        right,left = int(row[2]),int(row[3])
        if right in labels or right not in RIGHT_NAMES or left != right+51 or row[1] != RIGHT_NAMES[right]:
            raise ValueError('CerebrA CSV identity differs')
        labels[right] = labels[left] = row[1]
    if set(labels) != set(range(1,103)):
        raise ValueError('CerebrA bilateral label coverage differs')
    return labels


def group_ids(labels):
    labels = np.asarray(labels)
    if not np.isin(labels,range(-1,103)).all():
        raise ValueError('unknown or noninteger CerebrA label')
    lut = np.zeros(104,dtype=np.int16)
    for group, members in enumerate(RIGHT_GROUPS):
        lut[members] = group
        lut[[i+51 for i in members]] = group
    lut[-1] = 11
    return lut[labels.astype(np.int16)]


def check_image(image):
    slope = getattr(image.dataobj,'slope',image.header.get_slope_inter()[0])
    intercept = getattr(image.dataobj,'inter',image.header.get_slope_inter()[1])
    if (image.shape != (193,229,193) or image.get_data_dtype() != np.dtype('float32')
        or int(image.header['qform_code']) != 0 or int(image.header['sform_code']) != 1
        or image.header.get_xyzt_units() != ('unknown','unknown')
        or not np.array_equal(image.affine,AFFINE) or not np.array_equal(image.get_sform(),AFFINE)
        or slope not in (None,1) or intercept not in (None,0)):
        raise ValueError('CerebrA native header/scaling differs')
    data = np.asarray(image.dataobj)
    if not np.isfinite(data).all() or not np.isin(data,range(103)).all():
        raise ValueError('CerebrA categorical values differ')
    return data.astype(np.int16)


def compare(carpet,cerebra):
    cp,cb = domain_ids(carpet),group_ids(cerebra)
    if cp.shape != cb.shape:
        raise ValueError('comparison shapes differ')
    state = np.ones(cp.shape,dtype=np.int16)
    supported = ((cp==5)&(cb==1) | (cp==4)&(cb==8) | (cp==2)&(cb==3)
                 | (cp==3)&(cb==2) | (cp==6)&np.isin(cb,[5,6,7]))
    unresolved = np.isin(cp,[0,7,8]) | np.isin(cb,[0,9,10,11]) | ((cp==6)&(cb==2))
    state[supported] = 0
    state[unresolved] = 2
    return state


def partitions(ids,names):
    n = len(ids)
    result = {'points':{name:int((ids==i).sum()) for i,name in enumerate(names)},
              'endpoints':{name:int((ids[:,[0,-1]]==i).sum()) for i,name in enumerate(names)},
              'anyPointContours':{name:int((ids==i).any(axis=1).sum()) for i,name in enumerate(names)},
              'endpointPairs':dict(sorted(Counter('|'.join(sorted([names[row[0]],names[row[-1]]])) for row in ids).items())),
              'allSameOrMixed':dict(sorted(Counter(names[row[0]] if np.all(row==row[0]) else 'mixed' for row in ids).items()))}
    assert sum(result['points'].values())==n*8 and sum(result['endpoints'].values())==n*2
    assert sum(result['endpointPairs'].values())==n and sum(result['allSameOrMixed'].values())==n
    return result


def summarize(carpet,cerebra):
    if carpet.ndim!=2 or carpet.shape[1]!=8 or carpet.shape!=cerebra.shape:
        raise ValueError('summary requires matching eight-sample contours')
    states = compare(carpet,cerebra)
    return {'contours':len(carpet),'candidate':partitions(group_ids(cerebra),GROUPS),
            'comparison':partitions(states,STATES),
            'anatomicalAssignment':{'unresolvedPoints':int(carpet.size),
                                    'unresolvedEndpoints':len(carpet)*2,'primary':None}}


def check_output(path):
    path = Path(path).absolute()
    if any(p.is_symlink() for p in (path,*path.parents)):
        raise ValueError('output path contains symlink')
    return require_empty_output_root(path,REPO)


def write_panels(t1,carpet,candidate,representatives,output):
    from PIL import Image, ImageDraw
    lo,hi=np.percentile(t1[t1>0],[1,99])
    if not hi>lo:
        raise ValueError('T1 display window is empty')
    gray=np.rint(np.clip((t1.astype(float)-lo)/(hi-lo),0,1)*255).astype(np.uint8)
    colors=np.array([(0,0,0),(255,215,45),(255,75,55),(60,90,255),(120,90,255),
                     (240,60,240),(170,100,220),(240,160,90),(60,240,100),
                     (170,170,170),(255,255,255),(0,0,0)],dtype=np.uint8)
    cpcolors=np.array([anatomy.GROUPS[name][1] for name in DOMAINS[:7]],dtype=np.uint8)
    files=[]
    for rep in representatives:
        sheet=Image.new('RGB',(960,980),'#151515'); draw=ImageDraw.Draw(sheet)
        point=np.array(rep['rasMm']); voxel=point-AFFINE[:3,3]
        draw.text((12,8),f"Contour {rep['index']} / point {rep['point']} RAS mm {rep['rasMm']}",fill='white')
        draw.text((12,27),f"Source comparison: {rep['comparison']}; carpet {rep['carpetLabel']}; CerebrA {rep['cerebraLabel']}. NOT anatomical assignment.",fill='white')
        draw.text((12,46),'ASymmetric2009c T1 | carpet overlay | SYMmetric2009c CerebrA overlay; no warp; native symmetric T1 NOT shown.',fill='white')
        for i,name in enumerate(GROUPS[:-1]):
            draw.text((12+(i%2)*475,68+(i//2)*18),name,fill=tuple(int(c) for c in colors[i]) if i else 'white')
        draw.text((12,182),'Carpet: cyan cerebral WM; magenta COMBINED cerebellum/midbrain; green deep; yellow cortical coverage.',fill='white')
        for axis,orientation in enumerate(('sagittal P->A, S up','coronal L->R, S up','axial L->R, A up')):
            index=int(np.rint(voxel[axis])); y=218+axis*250
            if not 0<=index<t1.shape[axis]:
                draw.text((12,y),f'{orientation}: slice outside grid',fill='white'); continue
            draw.text((12,y),f'{orientation}; slice {"xyz"[axis]}={index+AFFINE[axis,3]:g} mm; point minus slice={voxel[axis]-index:+.2f} mm',fill='white')
            g=anatomy.slice_pixels(gray,axis,index)
            a=anatomy.slice_pixels(carpet,axis,index); b=anatomy.slice_pixels(candidate,axis,index)
            rgb=np.repeat(g[...,None],3,axis=2)
            overlays=[rgb]
            for labels,lut,ids in ((a,cpcolors,domain_ids(a)),(b,colors,group_ids(b))):
                pixels=rgb.copy(); nonzero=labels!=0
                pixels[nonzero]=np.rint(.55*rgb[nonzero]+.45*lut[ids[nonzero]]).astype(np.uint8)
                overlays.append(pixels)
            retained=[i for i in range(3) if i!=axis]
            for col,pixels in enumerate(overlays):
                x=12+col*315; top=y+20
                sheet.paste(Image.fromarray(pixels),(x,top))
                u=x+voxel[retained[0]]; v=top+pixels.shape[0]-1-voxel[retained[1]]
                draw.line((u-3,v,u+3,v),fill='white'); draw.line((u,v-3,u,v+3),fill='white')
        filename=f"encounter-{rep['index']:05d}-{rep['point']}.png"
        sheet.save(output/filename); files.append(filename)
    return {'files':files,'reference':'asymmetric2009c T1, not native symmetric template',
            'intensityWindow':[float(lo),float(hi)],'alpha':.45,'pixelsPerVoxel':1}


def run(inputs,reference,output):
    output=check_output(output)
    manifest=validate_manifest()
    verify_environment(Path(shutil.which('uv')),manifest)
    inventory_path=HERE/'source-manifest.json'
    if sha256_file(inventory_path)!=MANIFEST_SHA:
        raise ValueError('private source inventory drift')
    inventory=json.loads(inventory_path.read_text())
    for root in (inputs,reference):
        if any(p.is_symlink() for p in (root,*root.parents)):
            raise ValueError('input path contains symlink')
    paths=resolve_inputs(inputs,inventory['files'])
    refs=resolve_inputs(reference,REFERENCE_SOURCES)
    pipeline=next(p for p in manifest['pipelines'] if p['id']=='swm-domains')
    points,lengths,quality=load_displayed(REPO,pipeline['parameters'])
    with paths['CerebrA_LabelDetails.csv'].open() as f: names=parse_labels(f)
    candidate=check_image(nib.load(paths['CerebrA.nii']))
    carpet=load_carpet(refs['carpet'])
    voxels=(points-AFFINE[:3,3]).reshape(-1,3)
    cp=sample_voxels(carpet,voxels).reshape(-1,8)
    cb=sample_voxels(candidate,voxels).reshape(-1,8)
    states=compare(cp,cb); cpid=domain_ids(cp); cbid=group_ids(cb)
    groups=strata(points,lengths,quality)
    summary=summarize(cp,cb)
    summary['strata']={dim:{value:summarize(cp[np.array(values)==value],cb[np.array(values)==value])
                            for value in sorted(set(values))}
                       for dim,values in groups.items() if dim!='centre20mmCell'}
    summary['targets']={}
    for name,ids in [('source255',[6]),('broaderUnion',BROAD)]:
        hit=np.isin(cpid,ids).any(axis=1)
        summary['targets'][name]={'hit':summarize(cp[hit],cb[hit]),'complement':summarize(cp[~hit],cb[~hit])}
    summary['crossTabs']={domain:{
        'candidatePointCounts':{name:int(((cpid==i)&(cbid==j)).sum()) for j,name in enumerate(GROUPS)},
        'comparisonPointCounts':{name:int(((cpid==i)&(states==j)).sum()) for j,name in enumerate(STATES)}}
        for i,domain in enumerate(DOMAINS)}
    options=np.zeros(cb.shape,dtype=np.uint16)
    def probe(offset,rule='nearest-even'):
        a=sample_voxels(carpet,voxels+offset,rule).reshape(-1,8)
        b=sample_voxels(candidate,voxels+offset,rule).reshape(-1,8)
        s=compare(a,b)
        return {'offsetMm':list(offset),'carpetLabelPointsChanged':int((a!=cp).sum()),
                'candidateLabelPointsChanged':int((b!=cb).sum()),
                'comparisonPointsChanged':int((s!=states).sum()),
                'comparisonContoursChanged':int((s!=states).any(axis=1).sum()),
                'summary':summarize(a,b)},b
    probes=[]
    for offset in product((-.5,0.,.5),repeat=3):
        report,labels=probe(offset); probes.append(report)
        options |= np.left_shift(1,group_ids(labels)).astype(np.uint16)
    summary['gridProbes']=probes
    summary['alternateRounding']=probe((0.,0.,0.),'positive-tie')[0]
    representatives={(11,0),(149,2),(1154,1),(3,0),(47,5),(99,7),(0,0)}
    for domain in range(len(DOMAINS)):
        for state in range(3):
            indices=np.flatnonzero(((cpid==domain)&(states==state)).ravel())
            if len(indices): representatives.add(divmod(int(indices[0]),8))
    metadata={'kind':'private-source-comparison-not-anatomical-assignment','method':METHOD,
              'approval':'brain-atlas-5ezq','sourceInventorySha256':MANIFEST_SHA,
              'referenceSources':REFERENCE_SOURCES,'repositoryInputs':pipeline['parameters']['repositoryInputs'],
              'codeSha256':{p.relative_to(REPO).as_posix():sha256_file(p) for p in
                           [Path(__file__),ANATOMY_PATH,REPO/'tools/assets/swm_domains.py',REPO/'tools/assets/common.py',REPO/'tools/assets/endpoints.py',REPO/'tools/assets/cortex.py']},
              'environment':manifest['environment'],'candidateLabels':names,'candidateGroups':list(GROUPS),
              'comparisonStates':list(STATES),'manualReviewStatus':'pending',
              'nativeHeader':{'shape':list(candidate.shape),'affine':AFFINE.tolist(),'qformCode':0,'sformCode':1,'units':'unknown','scaling':[1,0]},
              'limitations':['CerebrA symmetric2009c / carpet asymmetric2009c / fibre2009a: unvalidated common-RAS comparison, no warp.',
                             'Source-label support/conflict is not anatomical correctness, tissue certification or measured registration error.',
                             'No anatomical primary or domain-only assignment. Background, composite labels and unsupported regions remain unresolved.',
                             'No comprehensive cerebral WM, CSF/outside-brain, cerebellar nuclei or brainstem subdivision authority.',
                             'Grid probes are descriptive, not confidence intervals; all means stored samples, not full curves.',
                             'Native MINC2 T1 not parsed: h5py unavailable; no dependency installed. Overlays use asymmetric reference T1.',
                             'Private evaluation only; no source redistribution, runtime adoption, geometry/filter/activity change.']}
    records=[{'index':i,'carpetLabels':cp[i].tolist(),'cerebraLabels':cb[i].tolist(),
              'comparisonStateIds':states[i].tolist(),'probeCandidateGroupMasks':options[i].tolist(),
              'anatomicalDomain':'unresolved','anatomicalPrimary':None} for i in range(len(points))]
    summary['representatives']=[{'index':i,'point':j,'rasMm':points[i,j].tolist(),
                                'carpetLabel':int(cp[i,j]),'cerebraLabel':int(cb[i,j]),
                                'comparison':STATES[states[i,j]]} for i,j in sorted(representatives)]
    t1=anatomy.check_volume(nib.load(refs['t1']),(193,229,193),AFFINE)
    summary['display']=write_panels(t1,carpet,candidate,summary['representatives'],output)
    for name,payload in [('summary',summary),('records',{'contours':records})]:
        (output/f'{name}.json').write_text(json.dumps({**metadata,**payload},sort_keys=True,ensure_ascii=False,allow_nan=False,separators=(',',':'))+'\n')
    print(json.dumps({'contours':len(points),'comparison':summary['comparison']['points'],'representatives':len(representatives)}))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for name in ('inputs','reference','output'): parser.add_argument('--'+name,type=Path,required=True)
    args=parser.parse_args()
    run(args.inputs.absolute(),args.reference.absolute(),args.output.absolute())
