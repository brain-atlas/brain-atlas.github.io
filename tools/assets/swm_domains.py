"""Offline source-compartment screening, not anatomical ground truth or curation."""
from collections import Counter
from itertools import product
import json
from pathlib import Path

import numpy as np
from scipy.ndimage import distance_transform_edt

from .common import ContractError, sha256_file, require_empty_output_root
from .cortex import load_nifti_with_matching_forms
from .endpoints import _require_repository_inputs

AFFINE = np.array([[1., 0, 0, -96], [0, 1., 0, -132], [0, 0, 1., -78], [0, 0, 0, 1.]])
DOMAINS = (
    'background', 'cerebral_white_matter', 'lateral_ventricle',
    'brain_stem_source_label5', 'subcortical_gray_including_hippocampus_amygdala',
    'cortical_source_labels', 'cerebellum_and_midbrain_source_label255',
    'outside-grid', 'unresolved',
)
LABELS = ([0], [1, 2], [3, 4], [5], [34,35,36,37,39,40,41,45,46,47,48,49,50,51], list(range(101,197)), [255], [-1], [])
BROAD = [2, 3, 4, 6]


def domain_ids(labels):
    values = np.asarray(labels)
    result = np.full(values.shape, -1, dtype=np.int16)
    for i, members in enumerate(LABELS):
        result[np.isin(values, members)] = i
    if np.any(result < 0):
        raise ContractError('unknown carpet source label')
    return result


def load_carpet(path):
    image, affine = load_nifti_with_matching_forms(path)
    if image.shape != (193,229,193) or not np.array_equal(affine, AFFINE):
        raise ContractError('carpet grid differs from pinned source')
    if image.header.get_xyzt_units()[0] != 'mm' or int(image.header['qform_code']) != 4:
        raise ContractError('carpet units or forms differ from pinned source')
    values = np.asarray(image.dataobj)
    if values.dtype.kind not in 'iu':
        raise ContractError('carpet must be categorical integers')
    domain_ids(values)
    return values


def sample_voxels(volume, voxels, rule='nearest-even'):
    points = np.asarray(voxels, dtype=np.float64)
    if points.ndim != 2 or points.shape[1] != 3 or not np.isfinite(points).all():
        raise ContractError('sample coordinates must be finite (n,3)')
    if np.ndim(volume) != 3 or not all(volume.shape):
        raise ContractError('sample volume must be nonempty 3D')
    if rule not in ('nearest-even', 'positive-tie'):
        raise ContractError('unknown categorical rounding rule')
    rounded = np.rint(points) if rule == 'nearest-even' else np.floor(points + 0.5)
    inside = np.all((rounded >= 0) & (rounded < np.array(volume.shape)), axis=1)
    out = np.full(len(points), -1, dtype=np.int16)
    index = rounded[inside].astype(np.int64)
    out[inside] = volume[tuple(index.T)]
    return out


def rounding_options(volume, voxels):
    # Checked display points and the pinned integer-translation grid are decimal tenths.
    # Integer twentieths express the closed +/-0.05mm bounds without tie drift.
    v = np.asarray(voxels, dtype=np.float64)
    if v.ndim != 2 or v.shape[1] != 3 or not np.isfinite(v).all() or not np.allclose(v*10, np.rint(v*10), atol=1e-9, rtol=0):
        raise ContractError('rounding-cell input must be finite displayed tenths')
    twentieths = np.rint(v*20)
    lo = np.rint((twentieths-1)/20).astype(np.int64)
    hi = np.rint((twentieths+1)/20).astype(np.int64)
    if np.any((hi-lo < 0) | (hi-lo > 1)):
        raise ContractError('unexpected rounding-cell width')
    masks = np.zeros(len(v), np.uint16)
    # Enumerate every reachable integer cell (not only world-box corners).
    for delta in product((0,1), repeat=3):
        cells = lo + delta
        valid = np.all(cells <= hi, axis=1)
        ids = domain_ids(sample_voxels(volume, cells[valid]))
        masks[valid] |= np.left_shift(1, ids).astype(np.uint16)
    return masks


def probe_grid(volume, voxels):
    masks = np.zeros(len(voxels), np.uint16)
    variants = []
    for offset in product((-.5,0.,.5), repeat=3):
        labels = sample_voxels(volume, voxels + np.array(offset))
        masks |= np.left_shift(1, domain_ids(labels)).astype(np.uint16)
        variants.append((offset, labels))
    return masks, variants


def summarize(ids):
    ids = np.asarray(ids)
    if ids.ndim != 2 or ids.shape[1] != 8 or not np.isin(ids, range(len(DOMAINS))).all():
        raise ContractError('domain summary requires eight valid states per contour')
    n = len(ids)
    counts = np.array([(ids == i).sum(axis=1) for i in range(len(DOMAINS))]).T
    pair_counts = Counter('|'.join(sorted((DOMAINS[int(row[0])], DOMAINS[int(row[-1])]))) for row in ids)
    majority = Counter(DOMAINS[int(np.argmax(row))] if row.max() > 4 else 'no-majority' for row in counts)
    all_same = Counter(DOMAINS[int(row[0])] if np.all(row == row[0]) else 'mixed' for row in ids)
    report = {'contours': n,
              'points': {name: int(counts[:,i].sum()) for i,name in enumerate(DOMAINS)},
              'endpoints': {name: int((ids[:,[0,-1]] == i).sum()) for i,name in enumerate(DOMAINS)},
              'anyPoint': {name: int((counts[:,i] > 0).sum()) for i,name in enumerate(DOMAINS)},
              'endpointPairs': dict(sorted(pair_counts.items())),
              'majority': dict(sorted(majority.items())), 'allSameOrMixed': dict(sorted(all_same.items()))}
    assert sum(report['points'].values()) == n*8 and sum(report['endpoints'].values()) == n*2
    assert all(sum(report[k].values()) == n for k in ('endpointPairs','majority','allSameOrMixed'))
    return report


def strata(points, lengths, qualities):
    centres = points.mean(axis=1, dtype=np.float64)
    return {'hemisphere': ['L' if x < 0 else 'R' for x in centres[:,0]],
            'shippedLengthMm': ['[8,15)' if x < 15 else '[15,25)' if x < 25 else '[25,40)' if x < 40 else '[40,55]' for x in lengths],
            'centre20mmCell': [','.join(map(str, row)) for row in np.floor(centres/20).astype(int)],
            'legacyQuality': list(qualities)}


def target_partition(ids, rounding, grid, interior, targets):
    target_mask = sum(1 << i for i in targets)
    hit = np.isin(ids, targets)
    stable = hit & (((rounding | grid) & ~np.uint16(target_mask)) == 0)
    states = ['no-baseline-hit' if not h.any() else 'stable-interior-hit' if (s & d).any()
              else 'probe-stable-hit-only' if s.any() else 'boundary-sensitive-hit-only'
              for h,s,d in zip(hit, stable, interior, strict=True)]
    return {'counts': {name: states.count(name) for name in ('no-baseline-hit','stable-interior-hit','probe-stable-hit-only','boundary-sensitive-hit-only')},
            'states': states}


def load_displayed(repo, parameters):
    _require_repository_inputs(repo, parameters['repositoryInputs'])
    swm = json.loads((repo / 'public/data/swm_fibres.json').read_text())
    legacy = json.loads((repo / 'public/data/fibre_endpoints.json').read_text())
    points = np.asarray(swm['fibres'], dtype=np.float64)
    lengths = np.asarray(swm['len'], dtype=np.float64)
    if swm['n'] != 15000 or swm['np'] != 8 or points.shape != (15000,8,3) or not np.isfinite(points).all():
        raise ContractError('SWM shape or coordinates differ from contract')
    if not np.allclose(points*10, np.rint(points*10), atol=1e-9, rtol=0):
        raise ContractError('SWM coordinates are not displayed tenths')
    if lengths.shape != (15000,) or not np.isfinite(lengths).all() or np.any((lengths < 8) | (lengths > 55)):
        raise ContractError('SWM shipped lengths differ from contract')
    if legacy['schemaVersion'] != 1 or len(legacy['swm']['endpoints']) != 15000:
        raise ContractError('legacy endpoint contract differs')
    classes = [s['class'] for s in legacy['statuses']]
    quality = []
    for pair in legacy['swm']['endpoints']:
        if len(pair) != 2:
            raise ContractError('legacy contour must have two endpoints')
        pair_classes = [classes[e[0]] for e in pair]
        quality.append('ambiguous' if 'ambiguous' in pair_classes else 'unknown' if 'unknown' in pair_classes else 'known')
    hemispheres = ''.join(strata(points, lengths, quality)['hemisphere'])
    if hemispheres != legacy['swm']['hemispheres']:
        raise ContractError('displayed hemisphere differs from legacy artifact')
    return points, lengths, quality


def audit_swm_domains(carpet_path, repo, output_root, manifest):
    repo = Path(repo).resolve()
    output_root = Path(output_root)
    # Also reject public targets reached through ancestor aliases or a different --repo.
    require_empty_output_root(output_root, repo)
    require_empty_output_root(output_root.resolve(), repo)
    require_empty_output_root(output_root.resolve(), Path(__file__).resolve().parents[2])
    pipeline = next(p for p in manifest['pipelines'] if p['id'] == 'swm-domains')
    parameters = pipeline['parameters']
    expected = {'methodVersion':'swm-domain-screen-v1', 'approval':'brain-atlas-n401',
                'scope':'private-source-compartment-screening-only', 'shippedClassifications':False,
                'baseline':'nearest-even', 'alternate':'floor(v+0.5)', 'roundingCellMm':.05,
                'gridOffsetsVoxels':[-.5,0,.5], 'interiorDistanceMm':2., 'fibreCount':15000, 'pointsPerFibre':8}
    if any(parameters.get(k) != v for k,v in expected.items()):
        raise ContractError('SWM audit method parameters differ from frozen v1')
    points, lengths, qualities = load_displayed(repo, parameters)
    volume = load_carpet(carpet_path)
    # The validated affine is a unit RAS grid with integer translation, not a template warp.
    voxels = (points - AFFINE[:3,3]).reshape(-1,3)
    raw = sample_voxels(volume, voxels).reshape(-1,8)
    ids = domain_ids(raw)
    rounded = rounding_options(volume, voxels).reshape(-1,8)
    grid, variants = probe_grid(volume, voxels)
    grid = grid.reshape(-1,8)
    baseline = summarize(ids)
    groups = strata(points, lengths, qualities)
    alternate_raw = sample_voxels(volume, voxels, 'positive-tie').reshape(-1,8)
    alternate_ids = domain_ids(alternate_raw)
    def changes(other_raw):
        other_ids = domain_ids(other_raw)
        return {'sourceLabelPointsChanged':int((raw != other_raw).sum()),
                'domainPointsChanged':int((ids != other_ids).sum()),
                'sourceLabelContoursChanged':int(np.any(raw != other_raw,axis=1).sum()),
                'domainContoursChanged':int(np.any(ids != other_ids,axis=1).sum())}
    probe_reports = []
    for offset, labels in variants:
        labels = labels.reshape(-1,8)
        probe_reports.append({'offsetVoxels':list(offset), **changes(labels), 'summary':summarize(domain_ids(labels))})
    targets = {}
    voxel_domain = domain_ids(volume)
    nearest = np.rint(voxels)
    inside = np.all((nearest >= 0) & (nearest < volume.shape),axis=1)
    indices = nearest[inside].astype(int)
    for name, members in [('source255',[6]), ('broaderNonCerebralOrDeep',BROAD)]:
        mask = np.isin(voxel_domain,members)
        distance = distance_transform_edt(np.pad(mask,1))[1:-1,1:-1,1:-1]
        sampled_distance = np.zeros(len(voxels))
        sampled_distance[inside] = distance[tuple(indices.T)]
        interior = sampled_distance.reshape(-1,8) >= 2.
        part = target_partition(ids,rounded,grid,interior,members)
        # Deterministic representative: lowest original contour index per observed class.
        representatives = {state:part['states'].index(state) for state,n in part['counts'].items() if n}
        targets[name] = {**part, 'domainIds':members, 'representativeIndices':representatives,
                         'baselineAnyPoint':int(np.isin(ids,members).any(axis=1).sum()),
                         'baselineAnyEndpoint':int(np.isin(ids[:,[0,-1]],members).any(axis=1).sum()),
                         'probeAnyPointRange':[min(int(np.isin(domain_ids(l),members).reshape(-1,8).any(axis=1).sum()) for _,l in variants),
                                               max(int(np.isin(domain_ids(l),members).reshape(-1,8).any(axis=1).sum()) for _,l in variants)]}
    cross_tabs = {}
    for dimension, values in groups.items():
        array = np.array(values)
        rows = {}
        for value in sorted(set(values)):
            selected = array == value
            rows[value] = {**summarize(ids[selected]), 'legacyQuality':dict(sorted(Counter(np.array(qualities)[selected]).items())),
                           'targetStates':{name:dict(sorted(Counter(np.array(t['states'])[selected]).items())) for name,t in targets.items()}}
        assert sum(row['contours'] for row in rows.values()) == 15000
        cross_tabs[dimension] = rows
    restrictions = [
        'Source compartments are coarse screening references, not anatomical ground truth.',
        'Label255 remains combined Cerebellum and Midbrain; candidate historical residual-mask generator unbound to these bytes.',
        'Cortical labels are not a tissue ribbon; background is not proof of outside brain; lateral ventricles do not exhaust CSF.',
        '2009a fibre / 2009c map common RAS lookup; no warp, shared voxel-index claim or measured registration uncertainty.',
        'Local audit under published repository terms and brain-atlas-n401 only; upstream rights unresolved. No map redistribution, shipped classifications or public replacement.',
        'Original whole-volume unrounded GM ribbon retention differs from this rounded categorical lookup; exact recovered index comparison deferred to brain-atlas-yum.14.7.',
        'All/majority means eight stored samples, not complete continuous contour or length fraction; no biological endpoint/polarity claim.',
    ]
    source = next(s for s in manifest['sources'] if s['id']=='templateflow-carpet')
    metadata = {'schemaVersion':1,'kind':'private-swm-source-compartment-audit', 'method':parameters,
                'source':source, 'limitations':restrictions, 'domains':list(DOMAINS),
                'sourceLabelsByDomain':LABELS, 'sourceLabelOutsideGridSentinel':-1,
                'optionMaskMeaning':'bit i denotes possible domain i; per-point possibilities are not probabilities',
                'atlasGrid':{'shape':list(volume.shape),'affine':AFFINE.tolist(),'qformCode':4,'sformCode':4,'units':'mm'},
                'moduleSha256':sha256_file(Path(__file__)), 'environment':manifest['environment']}
    summary = {**metadata, 'baseline':baseline, 'legacyQuality':dict(sorted(Counter(qualities).items())),
               'alternateRounding':{**changes(alternate_raw),'summary':summarize(alternate_ids)},
               'roundingCell':{'domainPointsSensitive':int((rounded != np.left_shift(1,ids)).sum()),
                               'domainContoursSensitive':int(np.any(rounded != np.left_shift(1,ids),axis=1).sum())},
               'gridProbes':probe_reports, 'crossTabs':cross_tabs,
               'targets':{name:{k:v for k,v in t.items() if k != 'states'} for name,t in targets.items()}}
    records = []
    for i in range(15000):
        records.append({'index':i, 'sourceLabels':raw[i].tolist(),'endpointSourceLabels':raw[i,[0,-1]].tolist(),
                        'domainIds':ids[i].tolist(), 'roundingDomainMasks':rounded[i].tolist(),'gridDomainMasks':grid[i].tolist(),
                        'strata':{key:values[i] for key,values in groups.items()},
                        'targetStates':{name:t['states'][i] for name,t in targets.items()}})
    payloads = {'swm-domain-summary.json':summary, 'swm-domain-records.json':{**metadata,'contours':records}}
    for filename,payload in payloads.items():
        with (output_root / filename).open('x',encoding='utf-8',newline='\n') as output:
            output.write(json.dumps(payload,ensure_ascii=False,allow_nan=False,sort_keys=True,separators=(',',':'))+'\n')
    return {'contours':15000,'points':120000,'endpoints':30000,'generated':list(payloads),'targets':summary['targets']}
