"""Private Jülich population-map readout. Not an anatomical assignment method."""
from collections import Counter
import itertools
import json
from pathlib import Path
import sys
import xml.etree.ElementTree as ET

import nibabel as nib
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[3]))
from tools.assets.common import (ContractError, require_empty_output_root, resolve_inputs,
                                 sha256_file, validate_manifest, verify_environment)
from tools.assets.endpoints import _require_repository_inputs, _require_fibre

RESEARCH = '.pi/research/2026-09-06-siibra-accounting/'
PINS = {
    'probability-manifest.json': '64219980ad7eeaaddd5b5a07d500a8aaf955b67fa794b1fe1a6b8dac50b1d299',
    'source-inventory.json': 'c79f33221684a37c585f2166fd929caea641af2140ef4743cd2d15e9995180bd',
}
METHOD = 'endpoint-pmap-readout-v1'
OFFSETS = list(itertools.product((-.5, 0., .5), repeat=3))


def pinned_inventory(repo, name):
    path = Path(repo) / RESEARCH / name
    if path.is_symlink() or not path.is_file() or sha256_file(path) != PINS[name]:
        raise ContractError(f'research inventory drift: {name}')
    return json.loads(path.read_text())


def load_sources(repo, root):
    inventory = pinned_inventory(repo, 'probability-manifest.json')
    entries = inventory['volumes'] + inventory['auxiliaryFiles']
    paths = resolve_inputs(root, [{**r, 'id': r['file'], 'filename': r['file']} for r in entries])
    xml_record = next(r for r in inventory['auxiliaryFiles'] if r['role'] == 'licensedMpmXmlTerminology')
    xml = ET.parse(paths[xml_record['file']]).getroot()
    structures = xml.find('Structures')
    if xml.tag != 'JulichBrainAtlas' or xml.get('version') != '3.0' or structures is None:
        raise ContractError('licensed XML identity drift')
    names = {(r.text or '').strip(): r for r in structures.findall('Structure')}
    if len(names) != 157:
        raise ContractError('licensed XML area count drift')
    differences = {r['configurationArea']: r['xmlStructure'] for r in inventory['labelMapCorrespondence']['licensedMpmXml']['explicitNameDifferences']}
    maps = []
    for i, volume in enumerate(inventory['volumes']):
        pair = inventory['labelMapCorrespondence']['pairs'][i % 157]
        hemisphere = 'L' if i < 157 else 'R'
        side = 'left' if hemisphere == 'L' else 'right'
        name = differences.get(pair['area'], pair['area'])
        if (volume['volume'] != i or pair[side + 'Volume'] != i
                or volume['label'] != pair['area'] + ' - ' + side + ' hemisphere' or name not in names):
            raise ContractError('statistical map/XML correspondence drift')
        structure = names[name]
        left, right = int(structure.get('leftgrayvalue')), int(structure.get('rightgrayvalue'))
        if right != left + 1000:
            raise ContractError('licensed XML bilateral label drift')
        maps.append({'volume': i, 'sourceName': name, 'sourceId': structure.get('id'),
                     'label': left if hemisphere == 'L' else right,
                     'hemisphere': hemisphere, 'gapMap': name.endswith(' (GapMap)'),
                     'file': volume['file'], 'sha256': volume['sha256'], 'url': volume['url']})
    if len(maps) != 314 or sum(m['gapMap'] for m in maps) != 12:
        raise ContractError('statistical map inventory count drift')
    return inventory, paths, maps


def load_geometry(repo):
    repo = Path(repo)
    baseline = pinned_inventory(repo, 'source-inventory.json')['currentCompatibilityBaseline']
    _require_repository_inputs(repo, baseline)
    tracts = json.loads((repo / 'public/data/tracts.json').read_text())
    swm = json.loads((repo / 'public/data/swm_fibres.json').read_text())
    legacy = json.loads((repo / 'public/data/fibre_endpoints.json').read_text())
    points, fibres = [], []
    def add(fibre, np_, source, group, hemisphere, i, pair):
        values = _require_fibre(fibre, np_, f'{source}:{group}:{i}')
        points.extend((values[0], values[-1]))
        classes = [legacy['statuses'][e[0]]['class'] for e in pair]
        quality = 'ambiguous' if 'ambiguous' in classes else 'unknown' if 'unknown' in classes else 'known'
        fibres.append({'source': source, 'group': group, 'hemisphere': hemisphere, 'index': i,
                       'endpoints': [len(points) - 2, len(points) - 1], 'legacyQuality': quality})
    for tract, old in zip(tracts['tracts'], legacy['association'], strict=True):
        if tract['id'] != old['id']:
            raise ContractError('legacy association order drift')
        for hemisphere in ('L', 'R'):
            if len(tract[hemisphere]) != 180:
                raise ContractError('association fibre count drift')
            for i, (fibre, pair) in enumerate(zip(tract[hemisphere], old[hemisphere], strict=True)):
                add(fibre, 40, 'association', tract['id'], hemisphere, i, pair)
    for i, (fibre, pair) in enumerate(zip(swm['fibres'], legacy['swm']['endpoints'], strict=True)):
        hemisphere = 'R' if np.mean(np.asarray(fibre)[:, 0], dtype=np.float64) >= 0 else 'L'
        if hemisphere != legacy['swm']['hemispheres'][i]:
            raise ContractError('legacy SWM hemisphere drift')
        add(fibre, 8, 'swm', 'swm', hemisphere, i, pair)
    if len(points) != 35760 or len(fibres) != 17880:
        raise ContractError('endpoint/fibre population drift')
    return np.asarray(points, dtype=np.float64), fibres, legacy


def safe_output(path, repo):
    # Check physical parents too; a symlink parent must not bypass public/ guard.
    path, repo = Path(path).absolute(), Path(repo).resolve()
    if path.resolve() != path:
        raise ContractError('output path must have no symlink components')
    return require_empty_output_root(path, repo)


def voxels(points, inverse, shape):
    points = np.asarray(points, dtype=np.float64)
    if points.ndim != 2 or points.shape[1] != 3 or not np.isfinite(points).all():
        raise ValueError('endpoint points must be finite (n,3)')
    rounded = np.rint(points @ inverse[:3, :3].T + inverse[:3, 3])
    inside = np.all((rounded >= 0) & (rounded < np.asarray(shape)), axis=1)
    indices = np.zeros(points.shape, dtype=np.int64)
    indices[inside] = rounded[inside].astype(np.int64)
    return indices, inside


def load_map(path, header):
    image = nib.load(path)
    qform, qcode = image.get_qform(coded=True)
    sform, scode = image.get_sform(coded=True)
    if (list(image.shape) != header['shape'] or str(image.get_data_dtype()) != header['dtype']
            or int(qcode) != header['qformCode'] or int(scode) != header['sformCode']
            or not np.array_equal(qform, header['qform']) or not np.array_equal(sform, header['sform'])
            or list(image.header.get_xyzt_units()) != header['xyztUnits']
            or image.dataobj.slope != 1 or image.dataobj.inter != 0):
        raise ContractError(f'probability map header drift: {path.name}')
    data = np.asarray(image.dataobj)
    if not np.isfinite(data).all() or np.any(data < 0) or np.any(data > 1):
        raise ContractError(f'probability map values outside finite [0,1]: {path.name}')
    return data


def sample_maps(points, header, gaps, volumes):
    inverse = np.linalg.inv(header['sform'])
    samples = [voxels(points + offset, inverse, header['shape']) for offset in OFFSETS]
    inside = np.array([item[1] for item in samples])
    shape = (len(points), len(gaps))
    baseline, minimum, maximum = [np.zeros(shape, dtype=np.float32) for _ in range(3)]
    top = np.zeros(inside.shape, dtype=np.float32)
    # Exact leader sets, packed: avoid a 27 x endpoints x maps float tensor.
    winners = np.zeros((*inside.shape, (len(gaps) + 63) // 64), dtype=np.uint64)
    any_support = np.zeros(inside.shape, dtype=bool)
    count = 0
    for j, (gap, data) in enumerate(zip(gaps, volumes, strict=True)):
        values = np.zeros(inside.shape, dtype=np.float32)
        for k, (indices, valid) in enumerate(samples):
            values[k, valid] = data[tuple(indices[valid].T)]
        baseline[:, j] = values[13]
        minimum[:, j] = values.min(axis=0)
        maximum[:, j] = values.max(axis=0)
        any_support |= values > 0
        if not gap:
            better = values > top
            equal_positive = (values == top) & (values > 0)
            winners[better] = 0
            winners[:, :, j // 64][better | equal_positive] |= np.uint64(1) << np.uint64(j % 64)
            np.maximum(top, values, out=top)
        count += 1
    if count != len(gaps):
        raise ContractError('map sampling count drift')
    # 0 outside, 1 zero, 2 gap-only, 3 named; compare full support category.
    support = np.where(~inside, 0, np.where(top > 0, 3, np.where(any_support, 2, 1)))
    probes = [{'offsetMm': list(offset), 'outsideGrid': int((~inside[k]).sum()),
               'leaderChanges': int(np.any(winners[k] != winners[13], axis=1).sum()),
               'supportChanges': int((support[k] != support[13]).sum())}
              for k, offset in enumerate(OFFSETS)]
    return baseline, minimum, maximum, inside[13], probes


def leaders(values, gaps):
    named = values.copy()
    named[:, np.asarray(gaps, dtype=bool)] = 0
    maxima = named.max(axis=1)
    return (named == maxima[:, None]) & (maxima[:, None] > 0)


def endpoint_records(baseline, minimum, maximum, inside, gaps):
    leader_mask = leaders(baseline, gaps)
    records = []
    for i, values in enumerate(baseline):
        named = np.any(values[~np.asarray(gaps, dtype=bool)] > 0)
        support = 'outside-grid' if not inside[i] else 'named' if named else 'gap-only' if np.any(values > 0) else 'zero'
        records.append({
            'domain': 'unresolved', 'status': 'unresolved', 'primary': None,
            'reason': 'validated-domain-unavailable', 'support': support,
            'mapLeaders': np.flatnonzero(leader_mask[i]).tolist(),
            'candidates': [[int(j), float(values[j]), float(minimum[i, j]), float(maximum[i, j])]
                           for j in np.flatnonzero(maximum[i] > 0)],
        })
    return records


def fibre_categories(records):
    if len(records) % 2:
        raise ContractError('endpoint records must form complete pairs')
    return dict(Counter('|'.join(sorted((a['support'], b['support'])))
                        for a, b in zip(records[::2], records[1::2], strict=True)))


def summarize(records):
    return {
        'endpoints': len(records), 'support': dict(Counter(r['support'] for r in records)),
        'candidateMultiplicity': dict(Counter(str(len(r['candidates'])) for r in records)),
        'baselineCandidateMultiplicity': dict(Counter(str(sum(c[1] > 0 for c in r['candidates'])) for r in records)),
        'tiedLeaderEndpoints': sum(len(r['mapLeaders']) > 1 for r in records),
        'uniqueLeaderEndpoints': sum(len(r['mapLeaders']) == 1 for r in records),
        'candidateRows': sum(len(r['candidates']) for r in records),
        'fibreSupportPairs': fibre_categories(records),
    }


def run(repo, inputs, output, uv):
    repo = Path(repo).resolve()
    output = safe_output(output, repo)
    manifest = validate_manifest(repo / 'tools/assets/manifest.json')
    environment = verify_environment(Path(uv), manifest)
    inventory, paths, maps = load_sources(repo, inputs)
    points, fibres, legacy = load_geometry(repo)
    headers = inventory['sharedNiftiHeaders']
    if len(headers) != 1 or any(v['niftiHeaderRef'] != 0 for v in inventory['volumes']):
        raise ContractError('expected one explicitly pinned common map grid')
    header = headers[0]
    gaps = [m['gapMap'] for m in maps]
    baseline, low, high, inside, probes = sample_maps(
        points, header, gaps, (load_map(paths[m['file']], header) for m in maps))
    records = endpoint_records(baseline, low, high, inside, gaps)
    summary = summarize(records)
    summary.update({'fibres': len(fibres), 'anatomicalPrimaryCount': 0,
                    'domainStatusCounts': {'unresolved': len(records)},
                    'fibreStatusCounts': {'unresolved': len(fibres)},
                    'legacyQuality': dict(Counter(f['legacyQuality'] for f in fibres)),
                    'sensitivity': probes, 'strata': {}})
    if summary['legacyQuality'] != legacy['counts']['fibreQuality']:
        raise ContractError('legacy quality projection drift')
    for key in ('source', 'hemisphere', 'legacyQuality', 'group'):
        groups = {}
        for fibre in fibres:
            groups.setdefault(fibre[key], []).extend(records[i] for i in fibre['endpoints'])
        summary['strata'][key] = {name: summarize(rows) for name, rows in sorted(groups.items())}
        if sum(s['endpoints'] for s in summary['strata'][key].values()) != 35760:
            raise ContractError('stratum count drift')
    endpoint_hemispheres = [f['hemisphere'] for f in fibres for _ in range(2)]
    summary['baselineOppositeSourceHemisphereEndpoints'] = sum(
        any(value > 0 and maps[j]['hemisphere'] != hemi for j, value, _lo, _hi in record['candidates'])
        for record, hemi in zip(records, endpoint_hemispheres, strict=True))
    summary['baselineNativeValueSumRange'] = [float(baseline.sum(axis=1, dtype=np.float64).min()),
                                             float(baseline.sum(axis=1, dtype=np.float64).max())]
    metadata = {
        'schemaVersion': 1, 'contract': 'brain-atlas/private-endpoint-readout/v1',
        'method': METHOD, 'adoption': 'private-evaluation-only', 'warpApplied': False,
        'candidateColumns': ['volume', 'nativeValue', 'gridProbeMin', 'gridProbeMax'],
        'probabilitySemantics': 'processed atlas population spatial overlap, not individual certainty',
        'distanceMm': None, 'queryVolumeOverlap': None,
        'uncertainty': {'localizationSigmaMm': None, 'localizationRadiusMm': None,
                        'readout': 'nearest-even exact grid', 'gridProbeOffsetsMm': OFFSETS,
                        'displayCoordinatePrecisionMm': .1, 'roundingBoxExhaustivelyEvaluated': False,
                        'mapSmoothingFwhmMm': 3, 'registrationUncertaintyMm': None},
        'limitations': ['no validated domain authority; no anatomical primary or domain-only outcome',
                        '2009a fibres and 2009c maps: common numerical RAS-mm assumption, no warp',
                        'unknown map unit codes retained; numerical units not repaired',
                        'positive value inclusion is not anatomical minimum support',
                        'GapMaps are uncharted cortex evidence, never named-area leaders',
                        'map leaders are diagnostics; exact ties retained, no candidate normalization',
                        'A/B unordered stored geometry, not termination/connectivity/direction',
                        '27 offsets are sensitivity, not measured uncertainty or accuracy',
                        'no current UI/schema/selector/preset/state migration'],
        'sourceInventories': PINS, 'mapHeader': header, 'maps': maps,
        'datasetVersion': inventory['configuration']['datasetVersion'],
        'configurationReference': inventory['configuration'], 'terms': inventory['terms'],
        'auxiliaryFiles': inventory['auxiliaryFiles'],
        'legacyInputs': pinned_inventory(repo, 'source-inventory.json')['currentCompatibilityBaseline'],
        'scriptSha256': sha256_file(Path(__file__)),
        'sharedModuleSha256': {name: sha256_file(repo / 'tools/assets' / name) for name in ('common.py', 'endpoints.py')},
        'manifestSha256': sha256_file(repo / 'tools/assets/manifest.json'), 'environment': environment,
    }
    payload = {'metadata': metadata, 'fibres': fibres, 'endpoints': records}
    for name, value in [('records.json', payload), ('summary.json', summary)]:
        (output / name).write_text(json.dumps(value, sort_keys=True, ensure_ascii=False, allow_nan=False, separators=(',', ':')) + '\n', encoding='utf-8')
    original = repo / 'public/data/fibre_endpoints.json'
    (output / 'legacy-fibre-endpoints.json').write_bytes(original.read_bytes())
    if sha256_file(output / 'legacy-fibre-endpoints.json') != sha256_file(original):
        raise ContractError('legacy byte projection differs')
    return {p.name: {'bytes': p.stat().st_size, 'sha256': sha256_file(p)} for p in sorted(output.iterdir())}


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    for option in ('repo', 'inputs', 'output', 'uv'):
        parser.add_argument('--' + option, required=True, type=Path)
    args = parser.parse_args()
    print(json.dumps(run(args.repo, args.inputs, args.output, args.uv), sort_keys=True))
