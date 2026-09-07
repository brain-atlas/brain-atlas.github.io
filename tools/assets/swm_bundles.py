"""Private population-map overlap; never anatomical identity or calibrated probability."""
from collections import Counter
from itertools import product
import hashlib
import json
from pathlib import Path
import stat

import numpy as np

from .common import ContractError, require_empty_output_root, resolve_inputs, sha256_file
from .cortex import load_nifti_with_matching_forms
from .endpoints import _require_repository_inputs
from .swm_domains import AFFINE, BROAD, DOMAINS, load_displayed, sample_voxels, strata


def parse_labels(paths):
    labels = {}
    for side, start, count, prefix in [('left',1001,365,'lh_'), ('right',2001,308,'rh_')]:
        side_labels = []
        for line in Path(paths[side]).read_text(encoding='utf-8').splitlines():
            number, separator, name = line.strip().partition(': ')
            if not separator or not number.isdecimal() or not name.endswith('_short.bundles,'):
                raise ContractError('invalid source label row')
            label = int(number)
            name = name.removesuffix('_short.bundles,')
            if label in labels or not name.startswith(prefix) or '/' in name or '\\' in name:
                raise ContractError('duplicate label or invalid source name/hemisphere')
            labels[label] = {'name':name, 'hemisphere':side[0].upper(), 'filename':name+'.nii.gz'}
            side_labels.append(label)
        if sorted(side_labels) != list(range(start,start+count)):
            raise ContractError('source label range/count differs')
    if len({row['filename'] for row in labels.values()}) != 673:
        raise ContractError('duplicate source filename')
    return labels


def load_bundle_volume(path, labels=None):
    image, affine = load_nifti_with_matching_forms(path)
    if image.shape != (193,229,193) or not np.array_equal(affine,AFFINE):
        raise ContractError('bundle grid differs from pinned numerical grid')
    if int(image.header['qform_code']) != 4 or image.header.get_xyzt_units() != ('unknown','unknown'):
        raise ContractError('bundle forms/units differ; do not repair unknown units')
    values = np.asarray(image.dataobj, dtype=np.float64)
    if not np.isfinite(values).all() or np.any(values < 0):
        raise ContractError('bundle values must be finite and nonnegative')
    if labels is None:
        if np.any(values > 100):
            raise ContractError('native map values exceed frozen 0–100 delivery range')
    elif not np.isin(values, [0,*labels]).all():
        raise ContractError('MPM contains unknown or noninteger source labels')
    return values


def categorical_evidence(samples, hemisphere, eligible, hemispheres):
    values = list(samples)
    if len(values) != 8 or any(v not in (-1,0) and v not in hemispheres for v in values):
        raise ContractError('categorical evidence requires eight known labels')
    counts = Counter(int(v) for v in values if v > 0)
    winner = next((label for label,n in counts.items() if n >= 5), None)
    reason = ('source-ineligible' if not eligible else 'no-support' if not counts else
              'insufficient-support' if winner is None else
              'hemisphere-conflict' if hemispheres[winner] != hemisphere else 'provisional-overlap')
    return {'primary':winner if reason == 'provisional-overlap' else None, 'reason':reason,
            'counts':[[k,counts[k]] for k in sorted(counts)], 'coveredSamples':sum(counts.values()),
            'outsideSamples':values.count(-1), 'oppositeHemisphereSamples':sum(n for k,n in counts.items() if hemispheres[k] != hemisphere)}


def continuous_evidence(samples):
    values = np.asarray(samples,dtype=np.float64)
    if values.ndim != 2 or values.shape[1] != 8 or not np.isfinite(values).all() or np.any((values < 0)|(values > 100)):
        raise ContractError('continuous evidence requires finite (n,8) native 0–100 values')
    # Canonical summation order makes this undirected evidence reversal-invariant.
    return {'positiveSamples':(values > 0).sum(axis=1), 'mean':np.sort(values,axis=1).sum(axis=1,dtype=np.float64)/8,
            'maximum':values.max(axis=1)}


def source_group(ids):
    if len(ids) != 8 or any(i not in range(len(DOMAINS)) for i in ids):
        raise ContractError('source grouping requires eight known domain IDs')
    return ('all-cerebral-source' if all(i in (1,5) for i in ids) else
            'all-broad-noncerebral-deep-source' if all(i in BROAD for i in ids) else 'mixed-other-source')


def holdout_key(index):
    return hashlib.sha256(f'brain-atlas/swm-bundle-holdout/v1:{index}'.encode('ascii')).hexdigest()


def _verify_file(path, pin):
    path = Path(path)
    if not stat.S_ISREG(path.lstat().st_mode) or path.is_symlink() or path.stat().st_size != pin['bytes'] or sha256_file(path) != pin['sha256']:
        raise ContractError('private input differs from pinned bytes: '+str(path))
    return path


def _summary(evidence):
    return {'contours':len(evidence), 'reasons':dict(sorted(Counter(e['reason'] for e in evidence).items())),
            'coverageAtLeast4':sum(e['coveredSamples'] >= 4 for e in evidence),
            'dominantAtLeast4':sum(any(n >= 4 for _,n in e['counts']) for e in evidence),
            'provisionalPrimary':sum(e['primary'] is not None for e in evidence),
            'partialCoverage':sum(0 < e['coveredSamples'] < 8 for e in evidence),
            'anyOppositeHemisphere':sum(e['oppositeHemisphereSamples'] > 0 for e in evidence),
            'anyOutsideGrid':sum(e['outsideSamples'] > 0 for e in evidence)}


def audit_swm_bundles(inputs_root, masked_path, domain_path, repo, output_root, manifest):
    repo = Path(repo).resolve()
    output_root = Path(output_root)
    require_empty_output_root(output_root,repo)
    require_empty_output_root(output_root.resolve(),repo)
    require_empty_output_root(output_root.resolve(),Path(__file__).resolve().parents[2])
    parameters = next(p['parameters'] for p in manifest['pipelines'] if p['id']=='swm-bundles')
    expected = {'methodVersion':'swm-bundle-screen-v1','scope':'private-population-map-screening-only',
                'shippedClassifications':False,'primaryMinimumSamples':5,'sampleCount':8,
                'holdoutHashPrefix':'brain-atlas/swm-bundle-holdout/v1:','holdoutModulo':5,'probability':None}
    if any(parameters.get(k) != v for k,v in expected.items()):
        raise ContractError('bundle method differs from frozen v1')
    pin = parameters['sourceInventory']
    _require_repository_inputs(repo,[pin])
    inventory = json.loads((repo/pin['path']).read_text())
    if inventory['schemaVersion'] != 1 or inventory['datasetVersion'] != '609c0598-bf02-4b65-8d7d-3a40f0c2f543':
        raise ContractError('unexpected bundle source inventory')
    inputs = resolve_inputs(inputs_root,inventory['inputs'])
    masked_path = _verify_file(masked_path,inventory['maskedMpm'])
    domain_path = _verify_file(domain_path,inventory['domainRecords'])
    domain_parameters = next(p['parameters'] for p in manifest['pipelines'] if p['id']=='swm-domains')
    points,lengths,qualities = load_displayed(repo,domain_parameters)
    groups = strata(points,lengths,qualities)
    domain = json.loads(domain_path.read_text())
    if domain['domains'] != list(DOMAINS) or len(domain['contours']) != len(points):
        raise ContractError('source domain vocabulary/population differs')
    for i,row in enumerate(domain['contours']):
        if row['index'] != i or row['strata'] != {k:v[i] for k,v in groups.items()}:
            raise ContractError('source-domain index/strata differ from checked contours')
    groups['sourceGroup'] = [source_group(row['domainIds']) for row in domain['contours']]
    keys = [holdout_key(i) for i in range(len(points))]
    groups['split'] = ['holdout' if int(k[:8],16)%5 == 0 else 'evaluation' for k in keys]
    manual = {}
    for i in sorted(range(len(points)),key=lambda i:keys[i]):
        if groups['split'][i]=='holdout':
            manual.setdefault(groups['sourceGroup'][i]+'|'+groups['hemisphere'][i],i)
    labels = parse_labels({side:inputs[side+'-hemisphere_labels.txt'] for side in ('left','right')})
    probability_names = {r['filename'] for r in inventory['inputs'] if r.get('source','').startswith('ProbabilisticMaps_')}
    if probability_names != {r['filename'] for r in labels.values()}:
        raise ContractError('complete probability/label correspondence differs')
    hemispheres = {k:v['hemisphere'] for k,v in labels.items()}
    eligible = [g=='all-cerebral-source' for g in groups['sourceGroup']]
    # Numeric common-world comparison only; unknown unit codes remain disclosed.
    voxels = (points-AFFINE[:3,3]).reshape(-1,3)
    nearest = np.rint(voxels)
    inside = np.all((nearest >= 0)&(nearest < (193,229,193)),axis=1)
    indices = nearest[inside].astype(np.int64)
    def classify(raw):
        return [categorical_evidence(row,groups['hemisphere'][i],eligible[i],hemispheres) for i,row in enumerate(raw)]
    baselines, raw_labels, probes, grid_info = {}, {}, {}, {}
    for variant,path in [('masked',masked_path),('unmasked',inputs['short-bundles_withoutSulciMask.nii'])]:
        volume = load_bundle_volume(path,labels)
        raw = sample_voxels(volume,voxels).reshape(-1,8)
        baseline = classify(raw)
        baselines[variant],raw_labels[variant] = baseline,raw
        grid_info[variant] = {'observedLabels':np.unique(volume).astype(int).tolist(), 'nonzeroVoxels':int(np.count_nonzero(volume))}
        variants = []
        for offset in product((-.5,0.,.5),repeat=3):
            other_raw = sample_voxels(volume,voxels+offset).reshape(-1,8)
            other = classify(other_raw)
            variants.append({'offsetVoxels':list(offset), 'summary':_summary(other),
                             'sourceLabelSamplesChanged':int((other_raw!=raw).sum()),
                             'primaryChanged':sum(a['primary']!=b['primary'] for a,b in zip(baseline,other,strict=True))})
        alternate_raw = sample_voxels(volume,voxels,'positive-tie').reshape(-1,8)
        probes[variant] = {'coherentOffsets':variants, 'alternateRounding':_summary(classify(alternate_raw)),
                          'alternateLabelSamplesChanged':int((alternate_raw!=raw).sum())}
    alternatives = [[] for _ in points]
    map_stats = []
    for label,entry in sorted(labels.items()):
        volume = load_bundle_volume(inputs[entry['filename']])
        sampled = np.zeros(len(voxels),dtype=np.float64)
        sampled[inside] = volume[tuple(indices.T)]
        evidence = continuous_evidence(sampled.reshape(-1,8))
        masked_counts = (raw_labels['masked']==label).sum(axis=1)
        unmasked_counts = (raw_labels['unmasked']==label).sum(axis=1)
        for i in np.flatnonzero((evidence['positiveSamples'] > 0)|(masked_counts > 0)|(unmasked_counts > 0)):
            alternatives[i].append([label,int(masked_counts[i]),int(unmasked_counts[i]),int(evidence['positiveSamples'][i]),
                                    float(evidence['mean'][i]),float(evidence['maximum'][i]),entry['hemisphere']==groups['hemisphere'][i]])
        map_stats.append({'label':label,'minimum':float(volume.min()),'maximum':float(volume.max()),'nonzeroVoxels':int(np.count_nonzero(volume))})
    cross_tabs = {}
    for dimension,values in groups.items():
        # Spatial-cell tables already live in source audit; retain compact four scientific strata plus split.
        if dimension=='centre20mmCell':
            continue
        cross_tabs[dimension] = {}
        for value in sorted(set(values)):
            selection = [i for i,v in enumerate(values) if v==value]
            cross_tabs[dimension][value] = {variant:_summary([rows[i] for i in selection]) for variant,rows in baselines.items()}
    limitations = [
        'Private screening, no atlas adoption, anatomical membership, termination, connectivity or direction inferred.',
        'Source compartments are not ground truth; all-cerebral-source is not certified superficial white matter.',
        'Only eight stored samples; coverage is not whole-contour or length coverage.',
        'Native map values are not calibrated contour probabilities; denominator/normalization unknown; probability is null.',
        'Unknown NIfTI unit codes preserved. Common numeric RAS-mm comparison is an explicit assumption, not grid/template equivalence.',
        'Descriptor identifies 2009c asymmetric CSF mask for masked products; exact unmasked registration template/build remains unresolved.',
        'Descriptor WU-Minn acquisition/method references and MGH-USC acknowledgement conflict; no equivalence to HCP-1065.',
        'CC BY-NC 4.0 attribution/noncommercial obligations; source-domain upstream rights limitations inherited; no redistribution approved.',
        'Five-of-eight primary is a preregistered illustrative screening threshold, not a validated identity or adopted runtime threshold.',
        'Categorical offset probes are sensitivity checks only, not measured registration uncertainty; continuous-map sensitivity not evaluated.',
        'Manual holdout examples are not an accuracy sample; expert anatomical validation remains absent.',
        'Inherited centre20mmCell is frozen storage-order-sensitive lineage metadata, excluded from scoring/cross-tabs; whole-record reversal invariance is not claimed.',
    ]
    metadata = {'schemaVersion':1,'kind':'private-swm-bundle-overlap','method':parameters,'sourceInventorySha256':pin['sha256'],
                'sourceDomainSha256':inventory['domainRecords']['sha256'],'repositoryInputs':domain_parameters['repositoryInputs'],
                'environment':manifest['environment'],'moduleSha256':sha256_file(Path(__file__)),
                'sharedModuleSha256':{name:sha256_file(Path(__file__).with_name(name)) for name in ('common.py','swm_domains.py','endpoints.py','cortex.py')},
                'grid':{'shape':[193,229,193],'affine':AFFINE.tolist(),'qformCode':4,'sformCode':4,'units':['unknown','unknown'],'warpApplied':False},
                'limitations':limitations,'probability':None,'candidateColumns':['sourceLabel','maskedSamples','unmaskedSamples','positiveNativeMapSamples','meanNativeMapValue','maximumNativeMapValue','hemisphereConsistent'],
                'bundleTable':{str(k):v for k,v in sorted(labels.items())}}
    records = [{ 'index':i,'strata':{k:v[i] for k,v in groups.items()},
                 'masked':baselines['masked'][i],'unmasked':baselines['unmasked'][i],'alternatives':alternatives[i] } for i in range(len(points))]
    summary = {**metadata,'baseline':{k:_summary(v) for k,v in baselines.items()},'crossTabs':cross_tabs,'categoricalSensitivity':probes,
               'mapInventory':map_stats,'mpmInventory':grid_info,'manualHoldoutIndices':manual,'manualReviewStatus':'pending',
               'alternativeCount':sum(map(len,alternatives)),'sourceGroupDisclaimer':'source-compartment strata, not anatomical domains'}
    payloads = {'swm-bundle-records.json':{**metadata,'contours':records},'swm-bundle-summary.json':summary}
    for filename,payload in payloads.items():
        with (output_root/filename).open('x',encoding='utf-8',newline='\n') as output:
            output.write(json.dumps(payload,sort_keys=True,separators=(',',':'),ensure_ascii=False,allow_nan=False)+'\n')
    return {'contours':len(records),'maps':len(labels),'generated':list(payloads),'baseline':summary['baseline'],'manualHoldoutIndices':manual}
