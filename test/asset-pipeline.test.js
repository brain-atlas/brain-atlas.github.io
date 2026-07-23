import assert from 'node:assert/strict';
import Ajv2020 from 'ajv/dist/2020.js';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

function loadJson(relativePath) {
  return JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
}

function runPython(source) {
  return spawnSync(
    'python3',
    ['-c', source],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' },
  );
}

function runUvPython(source) {
  return spawnSync(
    'uv',
    [
      'run', '--python', '3.13.1', '--offline',
      '--with-requirements', 'tools/assets/requirements.lock',
      'python', '-c', source,
    ],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' },
  );
}

function runAssetCli(...args) {
  return spawnSync(
    'python3',
    ['-m', 'tools.assets', ...args],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' },
  );
}

function walkStrings(value, visit) {
  if (typeof value === 'string') {
    visit(value);
  } else if (Array.isArray(value)) {
    value.forEach((entry) => walkStrings(entry, visit));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => walkStrings(entry, visit));
  }
}

const REQUIRED_PHASE_ONE_FILES = [
  '../tools/assets/SPEC.md',
  '../tools/assets/requirements.in',
  '../tools/assets/requirements.lock',
  '../tools/assets/manifest.schema.json',
  '../tools/assets/manifest.json',
  '../tools/assets/__init__.py',
  '../tools/assets/__main__.py',
  '../tools/assets/cli.py',
  '../tools/assets/common.py',
  '../tools/assets/endpoints.py',
];

test('phase-one asset pipeline contract is checked in as one focused package', () => { // Tests INV-1
  for (const relativePath of REQUIRED_PHASE_ONE_FILES) {
    assert.equal(
      fs.existsSync(new URL(relativePath, import.meta.url)),
      true,
      `missing ${relativePath}`,
    );
  }
});

test('manifest inventories every source, pipeline, output, coordinate contract, and rights decision', () => { // Tests INV-2
  const schema = loadJson('../tools/assets/manifest.schema.json');
  const manifest = loadJson('../tools/assets/manifest.json');

  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.deepEqual(schema.required, [
    'schemaVersion', 'environment', 'coordinateFrames', 'sources', 'intermediates',
    'tools', 'pipelines', 'outputs', 'rights', 'limitations',
  ]);
  assert.equal(manifest.schemaVersion, 1);

  const expectedSources = new Set([
    'templateflow-brain-mask', 'julich-mpm', 'julich-v1-left', 'julich-lgn-left',
    'templateflow-gm', 'templateflow-wm', 'hcp1065-tract-archive', 'hcp1065-fib',
  ]);
  assert.deepEqual(new Set(manifest.sources.map(({ id }) => id)), expectedSources);
  for (const source of manifest.sources) {
    for (const key of [
      'id', 'filename', 'url', 'bytes', 'sha256', 'dataset', 'version',
      'terms', 'verifiedOn', 'acceptanceRequired', 'redistribution', 'coordinateFrame',
    ]) {
      assert.ok(Object.hasOwn(source, key), `${source.id}.${key}`);
    }
    assert.match(source.url, /^https:\/\//, `${source.id}.url`);
    assert.match(source.sha256, /^[0-9a-f]{64}$/, `${source.id}.sha256`);
    assert.ok(Number.isSafeInteger(source.bytes) && source.bytes > 0, `${source.id}.bytes`);
  }

  assert.deepEqual(
    manifest.intermediates.map(({ id }) => id),
    [
      'or-v1-mask', 'or-lgn-mask', 'swm-seed', 'or-recovered-trk',
      'swm-recovered-trk-gzip', 'swm-recovered-trk-plain',
    ],
  );
  for (const intermediate of manifest.intermediates) {
    assert.match(intermediate.sha256, /^[0-9a-f]{64}$/, `${intermediate.id}.sha256`);
    assert.ok(intermediate.acquisitionEvidence, `${intermediate.id}.acquisitionEvidence`);
    assert.equal(intermediate.redistribution, 'not redistributed', intermediate.id);
  }

  assert.deepEqual(
    manifest.pipelines.map(({ id }) => id),
    ['cortex', 'regions', 'association', 'endpoints', 'optic-radiation', 'swm'],
  );
  const endpointPipeline = manifest.pipelines.find(({ id }) => id === 'endpoints');
  assert.deepEqual(endpointPipeline.sourceIds, ['julich-mpm']);
  assert.equal(endpointPipeline.parameters.maxDistanceMm, 2);
  assert.equal(endpointPipeline.parameters.ambiguityMarginMm, 0.5);
  assert.equal(endpointPipeline.parameters.endpointSemantics, 'unordered-geometry-not-polarity');
  assert.deepEqual(
    manifest.outputs.map(({ id }) => id),
    ['cortical-shell', 'region-manifest', 'region-mesh-tree', 'association-tracts', 'optic-radiation', 'swm', 'fibre-endpoints'],
  );
  for (const output of manifest.outputs) {
    assert.match(output.sha256, /^[0-9a-f]{64}$/, `${output.id}.sha256`);
    assert.equal(output.autoReplacePublicAsset, false, output.id);
  }

  assert.equal(manifest.coordinateFrames.anatomy.template, 'MNI152NLin2009cAsym');
  assert.equal(manifest.coordinateFrames.association.template, 'ICBM 2009a Nonlinear Asymmetric');
  assert.equal(manifest.coordinateFrames.orSwm.template, 'ICBM152 nonlinear 2009a');
  assert.equal(manifest.coordinateFrames.orSwm.templateWarp, 'none');
  assert.equal(manifest.coordinateFrames.runtime.transformCount, 1);
  assert.equal(manifest.limitations.opticRadiation.rightGeometry, 'runtime x -> -x mirror of left geometry');
  assert.deepEqual(manifest.limitations.dsiReplayEvidence, {
    opticRadiation: {
      class: '4 materially-different',
      canonicalReplay: '216 raw / 215 retained',
      cleanRepeat: '234 raw / 233 retained',
      recoveredReference: '223 raw / 220 retained',
    },
    swm: {
      class: '3 metric-only',
      replay: '200000 raw / 15000 sampled with different decoded geometry and output bytes',
    },
    exactSourceBuildBinding: 'unresolved',
    varyingInternalStage: 'unresolved',
    currentJsonBoundary: 'byte-exact only from registered recovered TrackVis intermediates through deterministic post-processing',
    replacementAuthorized: false,
    legacyCloseoutDecision: 'brain-atlas-3ct',
    deterministicRetrackingOwner: 'brain-atlas-yum.13',
  });
  assert.equal(
    manifest.tools.find(({ id }) => id === 'dsi-studio').replayStatus,
    'manual legacy replays complete: OR class 4, SWM class 3; no replacement authorized',
  );

  const rightsByOutput = new Map(manifest.rights.map((record) => [record.outputId, record]));
  for (const output of manifest.outputs) {
    const rights = rightsByOutput.get(output.id);
    assert.ok(rights, `rights missing for ${output.id}`);
    assert.equal(rights.blocking, false, `${output.id}.blocking`);
    assert.equal(rights.reviewedOn, '2026-07-22', `${output.id}.reviewedOn`);
    assert.ok(rights.obligations.length > 0, `${output.id}.obligations`);
  }

  walkStrings(manifest, (value) => {
    assert.equal(value.includes('/private/'), false, value);
    assert.equal(value.includes('scratchpad'), false, value);
    assert.equal(value.includes('claude-'), false, value);
    assert.equal(value.includes('X-Amz-'), false, value);
  });
});

test('lightweight CLI validates the manifest and exact checked outputs without network access', () => { // Tests INV-3
  const manifestResult = runAssetCli('check-manifest', '--json');
  assert.equal(manifestResult.status, 0, manifestResult.stderr);
  assert.deepEqual(JSON.parse(manifestResult.stdout), {
    command: 'check-manifest',
    manifest: 'tools/assets/manifest.json',
    schemaVersion: 1,
    sources: 8,
    intermediates: 6,
    pipelines: 6,
    outputs: 7,
    rights: 7,
    status: 'ok',
  });

  const currentResult = runAssetCli('verify-current', '--repo', '.', '--json');
  assert.equal(currentResult.status, 0, currentResult.stderr);
  const current = JSON.parse(currentResult.stdout);
  assert.equal(current.command, 'verify-current');
  assert.equal(current.status, 'ok');
  assert.deepEqual(current.verifiedOutputs, [
    'cortical-shell', 'region-manifest', 'region-mesh-tree',
    'association-tracts', 'optic-radiation', 'swm', 'fibre-endpoints',
  ]);
  assert.deepEqual(current.structures, {
    association: { fibres: 2880, groups: 16, pointsPerFibre: 40, tracts: 8 },
    corticalShell: { container: 'glTF', version: 2 },
    fibreEndpoints: { associationFibres: 2880, endpoints: 35760, presets: 4, swmFibres: 15000 },
    opticRadiation: { fibres: 220, pointsPerFibre: 64, runtimeMirroredRight: true },
    regions: { meshes: 90, regions: 45 },
    swm: { fibres: 15000, lengths: 15000, localLengths: 15000, pointsPerFibre: 8 },
  });

  const unknownResult = runAssetCli('not-a-command');
  assert.equal(unknownResult.status, 2);
});

test('hash-complete environment lock freezes every direct and transitive package', () => { // Tests INV-6
  const lock = fs.readFileSync(new URL('../tools/assets/requirements.lock', import.meta.url), 'utf8');
  const blocks = [...`${lock}\n__END__`.matchAll(
    /^([a-z0-9-]+)==([^\s\\]+)([\s\S]*?)(?=^[a-z0-9-]+==|^__END__)/gm,
  )];
  assert.deepEqual(
    blocks.map(([, name, version]) => `${name}==${version}`),
    [
      'fast-simplification==0.1.13', 'imageio==2.37.4', 'lazy-loader==0.5',
      'networkx==3.6.1', 'nibabel==5.4.2', 'numpy==2.5.1', 'packaging==26.2',
      'pillow==12.3.0', 'scikit-image==0.26.0', 'scipy==1.18.0',
      'tifffile==2026.7.14', 'trimesh==4.12.2',
    ],
  );
  for (const [, name, , body] of blocks) {
    assert.match(body, /--hash=sha256:[0-9a-f]{64}/, `${name} has no artifact hash`);
  }
  assert.doesNotMatch(lock, /https?:\/\/|--editable|--find-links/);
});

test('byte-exact environment preflight matches the complete recorded runtime and package trees', () => { // Tests INV-6; Tests FAIL-3
  const manifest = loadJson('../tools/assets/manifest.json');
  assert.match(manifest.environment.python.runtimeTreeSha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(
    Object.keys(manifest.environment.distributionTreeSha256).sort(),
    [
      'fast-simplification', 'imageio', 'lazy-loader', 'networkx', 'nibabel',
      'numpy', 'packaging', 'pillow', 'scikit-image', 'scipy', 'tifffile', 'trimesh',
    ],
  );
  for (const digest of Object.values(manifest.environment.distributionTreeSha256)) {
    assert.match(digest, /^[0-9a-f]{64}$/);
  }

  const result = spawnSync(
    'uv',
    [
      'run', '--python', '3.13.1', '--offline',
      '--with-requirements', 'tools/assets/requirements.lock',
      'python', '-m', 'tools.assets', 'environment-preflight',
      '--uv', '/run/current-system/sw/bin/uv', '--json',
    ],
    { cwd: new URL('..', import.meta.url), encoding: 'utf8' },
  );
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.command, 'environment-preflight');
  assert.equal(report.mode, 'byte-exact');
  assert.equal(report.packages, 12);
  assert.equal(report.status, 'ok');
});

test('environment-tree framing freezes files and symlinks while rejecting escapes', () => { // Tests INV-6; Tests FAIL-3
  const result = runPython(`
import json
from tools.assets.common import environment_contract_fixtures
print(json.dumps(environment_contract_fixtures(), sort_keys=True))
`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    combined: 'f9d9ce33dc0793ee962f549955ccc8036416da5245e85c5a0d1fb312cf003022',
    directorySymlinkVisited: false,
    empty: '2705bec07b46f87e2e8d28ba568b234d24fa7f98a54f2bf661b33b71a3cb4ea4',
    escapeRejected: true,
    file: '2146eeaa41b193808888cddb5964c1941d71b48b1298670de09e17a2ac877306',
    symlink: '43290baf9f031e1495d692cfc32d301572dac3099b00f4d58460189c7d0ad319',
  });
});

test('shared I/O rejects mutated inputs, symlinks, unexpected files, and unsafe output roots', () => { // Tests INV-3; Tests INV-5; Tests FAIL-1; Tests FAIL-2
  const result = runPython(`
import hashlib, json, os, tempfile
from pathlib import Path
from tools.assets.common import ContractError, require_empty_output_root, resolve_inputs

with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    inputs = root / 'inputs'
    inputs.mkdir()
    payload = b'verified source'
    source = {
        'id': 'fixture', 'filename': 'source.bin', 'bytes': len(payload),
        'sha256': hashlib.sha256(payload).hexdigest(),
    }
    (inputs / 'source.bin').write_bytes(payload)
    resolved = resolve_inputs(inputs, [source])
    pass_hash = resolved['fixture'].read_bytes() == payload

    (inputs / 'source.bin').write_bytes(b'mutated source')
    try:
        resolve_inputs(inputs, [source])
    except ContractError:
        mutation_rejected = True
    else:
        mutation_rejected = False

    (inputs / 'source.bin').unlink()
    target = root / 'target.bin'
    target.write_bytes(payload)
    os.symlink(target, inputs / 'source.bin')
    try:
        resolve_inputs(inputs, [source])
    except ContractError:
        symlink_rejected = True
    else:
        symlink_rejected = False

    (inputs / 'source.bin').unlink()
    (inputs / 'source.bin').write_bytes(payload)
    (inputs / 'unexpected.bin').write_bytes(b'x')
    try:
        resolve_inputs(inputs, [source])
    except ContractError:
        unexpected_rejected = True
    else:
        unexpected_rejected = False

    output = root / 'output'
    output.mkdir()
    empty_accepted = require_empty_output_root(output, repo_root=root) == output
    (output / 'existing').write_bytes(b'x')
    try:
        require_empty_output_root(output, repo_root=root)
    except ContractError:
        nonempty_rejected = True
    else:
        nonempty_rejected = False

    public = root / 'public'
    public.mkdir()
    try:
        require_empty_output_root(public, repo_root=root)
    except ContractError:
        public_rejected = True
    else:
        public_rejected = False

print(json.dumps({
    'emptyAccepted': empty_accepted,
    'mutationRejected': mutation_rejected,
    'nonemptyRejected': nonempty_rejected,
    'passHash': pass_hash,
    'publicRejected': public_rejected,
    'symlinkRejected': symlink_rejected,
    'unexpectedRejected': unexpected_rejected,
}, sort_keys=True))
`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    emptyAccepted: true,
    mutationRejected: true,
    nonemptyRejected: true,
    passHash: true,
    publicRejected: true,
    symlinkRejected: true,
    unexpectedRejected: true,
  });
});

test('builder CLI exposes explicit input and empty-output roots for each asset', () => { // Tests INV-1; Tests INV-5
  for (const asset of ['cortex', 'regions', 'association', 'endpoints']) {
    const result = runAssetCli('build', asset, '--help');
    assert.equal(result.status, 0, `${asset}: ${result.stderr}`);
    assert.match(result.stdout, /--inputs INPUTS/);
    assert.match(result.stdout, /--output OUTPUT/);
    if (asset === 'endpoints') assert.match(result.stdout, /--repo REPO/);
  }
});

test('cortex and region builders honor forms, affine coordinates, bilateral labels, and output order', () => { // Tests INV-7; Tests INV-9; Tests FAIL-4
  const result = runUvPython(`
import json, tempfile
from pathlib import Path
import nibabel as nib
import numpy as np
from tools.assets.common import ContractError
from tools.assets.cortex import build_cortex_from_image
from tools.assets.regions import build_regions_from_image

with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    affine = np.eye(4, dtype=np.float64)
    affine[:3, 3] = [-4.0, -5.0, -6.0]

    cortex_data = np.zeros((12, 12, 12), dtype=np.uint8)
    cortex_data[3:9, 3:9, 3:9] = 1
    cortex_image = nib.Nifti1Image(cortex_data, affine)
    cortex_image.header.set_sform(affine, code=4)
    cortex_image.header.set_qform(affine, code=4)
    cortex_input = root / 'cortex.nii.gz'
    nib.save(cortex_image, cortex_input)
    cortex_output = root / 'brain.glb'
    cortex_report = build_cortex_from_image(cortex_input, cortex_output, target_faces=80000)

    conflicting = nib.Nifti1Image(cortex_data, affine)
    conflicting.header.set_sform(affine, code=4)
    changed = affine.copy()
    changed[0, 3] += 1
    conflicting.header.set_qform(changed, code=4)
    conflicting_path = root / 'conflicting.nii.gz'
    nib.save(conflicting, conflicting_path)
    try:
        build_cortex_from_image(conflicting_path, root / 'bad.glb', target_faces=80000)
    except ContractError:
        conflict_rejected = True
    else:
        conflict_rejected = False

    region_data = np.zeros((14, 14, 14), dtype=np.int16)
    region_data[2:7, 3:9, 4:10] = 1
    region_data[8:13, 3:9, 4:10] = 1001
    region_image = nib.Nifti1Image(region_data, affine)
    region_image.header.set_sform(affine, code=1)
    region_image.header.set_qform(affine, code=1)
    region_input = root / 'regions.nii.gz'
    nib.save(region_image, region_input)
    region_output = root / 'regions-output'
    region_output.mkdir()
    catalog = [{
        'id': 'fixture', 'name': 'Fixture →', 'area': 'Area', 'stream': 'early',
        'parent': 'fixture parent', 'color': '#abcdef', 'opacity': 0.15,
        'leftLabel': 1, 'rightLabel': 1001,
    }]
    region_report = build_regions_from_image(
        region_input, region_output, catalog, {'early': {'hue': 172}}, max_faces=6000,
    )
    region_manifest = json.loads((region_output / 'regions.json').read_text())

    print(json.dumps({
    'conflictRejected': conflict_rejected,
    'cortexContainer': cortex_output.read_bytes()[:4].decode('ascii'),
    'cortexFaces': cortex_report['faces'],
    'regionFiles': sorted(path.name for path in region_output.iterdir()),
    'regionIds': [record['id'] for record in region_manifest['regions']],
    'regionMeshes': sorted(region_manifest['regions'][0]['meshes']),
    'regionReportMeshes': region_report['meshes'],
    'regionsEscapeUnicode': b'\\\\u2192' in (region_output / 'regions.json').read_bytes(),
    'regionsTrailingNewline': (region_output / 'regions.json').read_bytes().endswith(b'\\n'),
}, sort_keys=True))
`);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.conflictRejected, true);
  assert.equal(report.cortexContainer, 'glTF');
  assert.ok(report.cortexFaces > 0);
  assert.deepEqual(report.regionFiles, ['fixture_L.obj', 'fixture_R.obj', 'regions.json']);
  assert.deepEqual(report.regionIds, ['fixture']);
  assert.deepEqual(report.regionMeshes, ['L', 'R']);
  assert.equal(report.regionReportMeshes, 2);
  assert.equal(report.regionsEscapeUnicode, true);
  assert.equal(report.regionsTrailingNewline, false);
});

test('association builder uses standard archive/TRK parsing, one seeded RNG, resampling, and non-biological storage order', () => { // Tests INV-3; Tests INV-4; Tests INV-7; Tests FAIL-10
  const result = runUvPython(`
import gzip, json, tempfile, zipfile
from pathlib import Path
import nibabel as nib
import numpy as np
from tools.assets.association import build_association_from_archive

with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    tractogram_path = root / 'source.trk'
    streamlines = [
        np.array([[0., 9., 0.], [0., 5., 0.], [0., 1., 0.]], dtype=np.float32),
        np.array([[1., 1., 0.], [1., 5., 0.], [1., 9., 0.]], dtype=np.float32),
        np.array([[2., 4., 0.], [2., 4., 0.]], dtype=np.float32),
    ]
    tractogram = nib.streamlines.Tractogram(streamlines, affine_to_rasmm=np.eye(4))
    nib.streamlines.save(tractogram, tractogram_path)
    compressed = gzip.compress(tractogram_path.read_bytes(), mtime=0)
    archive = root / 'source.zip'
    with zipfile.ZipFile(archive, 'w') as handle:
        handle.writestr('association/FIX_L.trk.gz', compressed)
        handle.writestr('association/FIX_R.trk.gz', compressed)

    catalog = [{
        'id': 'fixture', 'name': 'Fixture', 'stream': 'test', 'color': '#abcdef',
        'archiveMembers': {
            'L': 'association/FIX_L.trk.gz',
            'R': 'association/FIX_R.trk.gz',
        },
    }]
    first = root / 'first.json'
    second = root / 'second.json'
    report = build_association_from_archive(
        archive, first, catalog, fibres_per_group=3, points_per_fibre=4, seed=0,
    )
    build_association_from_archive(
        archive, second, catalog, fibres_per_group=3, points_per_fibre=4, seed=0,
    )
    payload = json.loads(first.read_text())
    fibres = payload['tracts'][0]['L'] + payload['tracts'][0]['R']

    print(json.dumps({
    'deterministicBytes': first.read_bytes() == second.read_bytes(),
    'fibres': report['fibres'],
    'groups': report['groups'],
    'keys': list(payload['tracts'][0]),
    'points': sorted({len(fibre) for fibre in fibres}),
    'posteriorFirst': all(fibre[0][1] <= fibre[-1][1] for fibre in fibres),
    'trailingNewline': first.read_bytes().endswith(b'\\n'),
    'zeroRepeats': any(len({tuple(point) for point in fibre}) == 1 for fibre in fibres),
}, sort_keys=True))
`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    deterministicBytes: true,
    fibres: 6,
    groups: 2,
    keys: ['id', 'name', 'stream', 'color', 'np', 'L', 'R'],
    points: [4],
    posteriorFirst: true,
    trailingNewline: false,
    zeroRepeats: true,
  });
});

test('preparation CLI exposes explicit source and empty-output roots for OR and SWM', () => { // Tests INV-1; Tests INV-5
  for (const asset of ['optic-radiation', 'swm']) {
    const result = runAssetCli('prepare', asset, '--help');
    assert.equal(result.status, 0, `${asset}: ${result.stderr}`);
    assert.match(result.stdout, /--inputs INPUTS/);
    assert.match(result.stdout, /--output OUTPUT/);
  }
});

test('OR masks and SWM seed use exact inclusive/strict thresholds, morphology, and code-4 forms', () => { // Tests INV-7; Tests INV-9; Tests FAIL-4
  const result = runUvPython(`
import json, tempfile
from pathlib import Path
import nibabel as nib
import numpy as np
from tools.assets.optic_radiation import prepare_or_masks
from tools.assets.swm import prepare_swm_seed

with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    affine = np.eye(4, dtype=np.float64)
    affine[:3, 3] = [-2.0, -3.0, -4.0]

    v1 = np.zeros((7, 7, 7), dtype=np.float32)
    v1[1, 1, 1] = 1.0
    v1[2, 2, 2] = 0.25
    lgn = np.zeros_like(v1)
    lgn[4, 4, 4] = 2.0
    lgn[5, 5, 5] = 0.2
    for name, data in [('v1.nii.gz', v1), ('lgn.nii.gz', lgn)]:
        image = nib.Nifti1Image(data, affine)
        image.header.set_sform(affine, code=1)
        image.header.set_qform(affine, code=1)
        nib.save(image, root / name)
    or_output = root / 'or-output'
    or_output.mkdir()
    or_report = prepare_or_masks(root / 'v1.nii.gz', root / 'lgn.nii.gz', or_output)
    v1_mask = nib.load(or_output / 'v1_L_mni.nii.gz')
    lgn_mask = nib.load(or_output / 'lgn_L_mni.nii.gz')

    wm = np.zeros((9, 9, 9), dtype=np.float32)
    gm = np.zeros_like(wm)
    wm[2:7, 2:7, 2:7] = 0.6
    gm[4, 4, 4] = 0.6
    for name, data in [('wm.nii.gz', wm), ('gm.nii.gz', gm)]:
        image = nib.Nifti1Image(data, affine)
        image.header.set_sform(affine, code=4)
        image.header.set_qform(affine, code=4)
        nib.save(image, root / name)
    swm_output = root / 'swm-output'
    swm_output.mkdir()
    swm_report = prepare_swm_seed(root / 'wm.nii.gz', root / 'gm.nii.gz', swm_output)
    swm_seed = nib.load(swm_output / 'swm_shell_mni.nii.gz')

    print(json.dumps({
        'lgnVoxels': int(np.asarray(lgn_mask.dataobj).sum()),
        'orReport': or_report,
        'orForms': [int(v1_mask.header['qform_code']), int(v1_mask.header['sform_code'])],
        'swmForms': [int(swm_seed.header['qform_code']), int(swm_seed.header['sform_code'])],
        'swmReport': swm_report,
        'swmVoxels': int(np.asarray(swm_seed.dataobj).sum()),
        'v1Voxels': int(np.asarray(v1_mask.dataobj).sum()),
    }, sort_keys=True))
`);
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.v1Voxels, 2);
  assert.equal(report.lgnVoxels, 2);
  assert.deepEqual(report.orForms, [4, 4]);
  assert.deepEqual(report.orReport, { lgnVoxels: 2, v1Voxels: 2 });
  assert.deepEqual(report.swmForms, [4, 4]);
  assert.equal(report.swmReport.voxels, report.swmVoxels);
  assert.ok(report.swmVoxels > 1);
});

test('post-processing CLI keeps tracked intermediates explicit and outputs isolated', () => { // Tests INV-1; Tests INV-5
  const opticRadiation = runAssetCli('postprocess', 'optic-radiation', '--help');
  assert.equal(opticRadiation.status, 0, opticRadiation.stderr);
  assert.match(opticRadiation.stdout, /--tracked TRACKED/);
  assert.match(opticRadiation.stdout, /--output OUTPUT/);

  const swm = runAssetCli('postprocess', 'swm', '--help');
  assert.equal(swm.status, 0, swm.stderr);
  assert.match(swm.stdout, /--inputs INPUTS/);
  assert.match(swm.stdout, /--tracked TRACKED/);
  assert.match(swm.stdout, /--output OUTPUT/);
});

test('OR and SWM post-processing handles plain/gzip TRK, endpoints, boundaries, sampling, len, and lloc', () => { // Tests INV-4; Tests INV-7; Tests FAIL-4
  const result = runUvPython(`
import gzip, json, tempfile
from pathlib import Path
import nibabel as nib
import numpy as np
from tools.assets.optic_radiation import load_trackvis, postprocess_or_trackvis
from tools.assets.swm import postprocess_swm_trackvis

with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    affine = np.eye(4, dtype=np.float64)
    or_streamlines = [
        np.array([[0., 4., 0.], [0., 0., 0.]], dtype=np.float32),
        np.array([[0., 0., 0.], [0., 10., 0.]], dtype=np.float32),
        np.array([[8., 0., 0.], [0., 10., 0.]], dtype=np.float32),
        np.array([[0., 0., 0.], [10., 0., 0.]], dtype=np.float32),
    ]
    or_trk = root / 'or.trk'
    nib.streamlines.save(nib.streamlines.Tractogram(or_streamlines, affine_to_rasmm=affine), or_trk)
    or_gzip = root / 'or-gzip.trk'
    or_gzip.write_bytes(gzip.compress(or_trk.read_bytes(), mtime=0))
    plain_loaded = load_trackvis(or_trk, require_registered_header=False)
    gzip_loaded = load_trackvis(or_gzip, require_registered_header=False)
    or_output = root / 'or.json'
    or_report = postprocess_or_trackvis(
        or_trk, or_output, point_count=4, centroid=np.array([0., 0., 0.]),
        max_distance=5.0, require_registered_header=False,
    )
    or_payload = json.loads(or_output.read_text())

    gm = np.zeros((30, 30, 30), dtype=np.float32)
    for point in [(2,2,2),(10,2,2),(3,3,3),(12,3,3),(1,20,1),(1,20,25)]:
        gm[point] = 1.0
    gm_image = nib.Nifti1Image(gm, affine)
    gm_image.header.set_sform(affine, code=4)
    gm_image.header.set_qform(affine, code=4)
    gm_path = root / 'gm.nii.gz'
    nib.save(gm_image, gm_path)
    swm_streamlines = [
        np.array([[2.,2.,2.],[10.,2.,2.]], dtype=np.float32),
        np.array([[3.,3.,3.],[12.,3.,3.]], dtype=np.float32),
        np.array([[1.,20.,1.],[25.,20.,1.],[1.,20.,1.],[1.,20.,25.]], dtype=np.float32),
    ]
    swm_trk = root / 'swm.trk'
    nib.streamlines.save(nib.streamlines.Tractogram(swm_streamlines, affine_to_rasmm=affine), swm_trk)
    swm_output = root / 'swm.json'
    swm_report = postprocess_swm_trackvis(
        gm_path, swm_trk, swm_output, sample_count=2, points_per_fibre=4,
        require_registered_header=False,
    )
    swm_payload = json.loads(swm_output.read_text())

    print(json.dumps({
        'gzipEqualsPlain': all(np.array_equal(a, b) for a, b in zip(plain_loaded.streamlines, gzip_loaded.streamlines)),
        'orFibres': len(or_payload['fibres']),
        'orKeys': list(or_payload),
        'orPoints': sorted({len(fibre) for fibre in or_payload['fibres']}),
        'orReport': or_report,
        'swmLengths': sorted(swm_payload['len']),
        'swmLocalLengths': sorted(swm_payload['lloc']),
        'swmPoints': sorted({len(fibre) for fibre in swm_payload['fibres']}),
        'swmReport': swm_report,
    }, sort_keys=True))
`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    gzipEqualsPlain: true,
    orFibres: 3,
    orKeys: ['n', 'np', 'space', 'fibres', 'source'],
    orPoints: [4],
    orReport: { inputFibres: 4, removed: 1, retained: 3 },
    swmLengths: [8, 9],
    swmLocalLengths: [8.5, 8.5],
    swmPoints: [4],
    swmReport: { endpointEligible: 3, inputFibres: 3, lengthEligible: 2, retainedPopulation: 2, sampled: 2 },
  });
});

test('DSI command rendering freezes invocation/script bytes and has no execution path', () => { // Tests INV-8; Tests FAIL-5
  const result = runPython(`
import json
from pathlib import Path
from tools.assets.dsi import dsi_invocation_sha256, render_dsi_wrapper
argv = ['/tmp/dsi studio', '--action=trk', '--source=/tmp/a b', "--output=/tmp/o'k"]
script = render_dsi_wrapper(
    argv,
    [('a' * 64, Path('/tmp/dsi studio')), ('b' * 64, Path('/tmp/a b'))],
    Path("/tmp/o'k"),
    Path('/tmp/log ü.txt'),
)
print(json.dumps({
    'invocation': dsi_invocation_sha256(argv),
    'scriptBytes': len(script.encode('utf-8')),
    'scriptSha256': __import__('hashlib').sha256(script.encode('utf-8')).hexdigest(),
    'receiptV2': 'BRAIN_ATLAS_REPLAY_RECEIPT_V2_START' in script and 'BRAIN_ATLAS_REPLAY_RECEIPT_V2_END' in script,
    'ignoredOptionGuard': 'not used/recognized' in script,
    'trailingNewline': script.endswith('\\n') and not script.endswith('\\n\\n'),
}, sort_keys=True))
`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    ignoredOptionGuard: true,
    invocation: '64c2dd7e38fb557853ca2a190cec096658c19b731fc22e7fb9914084eddb07d1',
    receiptV2: true,
    scriptBytes: 2701,
    scriptSha256: '38b28d6e43dffb2f00b01b36e50af7a10e981ec2330b6866666ef577e554badb',
    trailingNewline: true,
  });

  const guard = runPython(`
import hashlib, json, subprocess, tempfile
from pathlib import Path
from tools.assets.dsi import render_dsi_wrapper
with tempfile.TemporaryDirectory() as temporary:
    root = Path(temporary)
    dummy = root / 'dummy-dsi'
    dummy.write_text("#!/bin/bash\\nprintf '%s\\\\n' '--ignored is not used/recognized.'\\n")
    dummy.chmod(0o700)
    output = root / 'output.trk'
    log = root / 'replay.log'
    wrapper = root / 'wrapper.sh'
    digest = hashlib.sha256(dummy.read_bytes()).hexdigest()
    wrapper.write_text(render_dsi_wrapper([str(dummy)], [(digest, dummy)], output, log))
    completed = subprocess.run(['/bin/bash', str(wrapper)], cwd=root, capture_output=True, text=True)
    print(json.dumps({
        'exitStatus': completed.returncode,
        'receiptStart': log.read_text().startswith('BRAIN_ATLAS_REPLAY_RECEIPT_V2_START\\n'),
        'receiptEnd': 'BRAIN_ATLAS_REPLAY_RECEIPT_V2_END\\n' in log.read_text(),
    }, sort_keys=True))
`);
  assert.equal(guard.status, 0, guard.stderr);
  assert.deepEqual(JSON.parse(guard.stdout), {
    exitStatus: 64,
    receiptEnd: true,
    receiptStart: true,
  });

  for (const path of fs.readdirSync(new URL('../tools/assets', import.meta.url))) {
    if (!path.endsWith('.py')) continue;
    const source = fs.readFileSync(new URL(`../tools/assets/${path}`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\bsubprocess\b|os\.system\s*\(|Popen\s*\(/, path);
  }

  for (const asset of ['optic-radiation', 'swm']) {
    const help = runAssetCli('dsi-command', asset, '--help');
    assert.equal(help.status, 0, `${asset}: ${help.stderr}`);
    for (const option of ['--inputs', '--prepared', '--output', '--log', '--binary']) {
      assert.ok(help.stdout.includes(option), `${asset}: ${option}`);
    }
  }
});

test('replay classification and evidence schema freeze hard closeout consequences', () => { // Tests INV-8; Tests INV-11; Tests FAIL-6
  const result = runUvPython(`
import json, tempfile
from pathlib import Path
from tools.assets.replay import _explicit_parameters, _parse_execution_receipt, _parse_log, classify_replay
with tempfile.TemporaryDirectory() as temporary:
    log = Path(temporary) / 'replay.log'
    tracked = Path('/tmp/output.trk')
    log.write_text('DSI identity\\n\\x1b[0;32maction\\x1b[0m=trk\\n├──thread_count=6\\n├──random_seed=0\\n├──source=/tmp/source.fz\\n├──output=/tmp/output.trk\\n216 tracts are generated using 300006 seeds.\\n')
    parameters, warnings = _parse_log(log, tracked)
    receipt_log = Path(temporary) / 'receipt.log'
    receipt_log.write_text(
        'BRAIN_ATLAS_REPLAY_RECEIPT_V2_START\\n'
        'BRAIN_ATLAS_STARTED_UTC=2026-07-22T21:00:00Z\\n'
        'BRAIN_ATLAS_WORKING_DIRECTORY=/tmp/replay work\\n'
        'BRAIN_ATLAS_OS_VERSION=26.5.1\\n'
        'BRAIN_ATLAS_KERNEL=Darwin 25.5.0\\n'
        'BRAIN_ATLAS_MACHINE=arm64\\n'
        'BRAIN_ATLAS_BASH_VERSION=3.2.57(1)-release\\n'
        'BRAIN_ATLAS_THREAD_ENV_OMP_NUM_THREADS=<unset>\\n'
        'BRAIN_ATLAS_THREAD_ENV_OPENBLAS_NUM_THREADS=1\\n'
        'BRAIN_ATLAS_THREAD_ENV_VECLIB_MAXIMUM_THREADS=<unset>\\n'
        'BRAIN_ATLAS_THREAD_ENV_MKL_NUM_THREADS=<unset>\\n'
        'BRAIN_ATLAS_THREAD_ENV_NUMEXPR_NUM_THREADS=<unset>\\n'
        'BRAIN_ATLAS_CHECK_COUNT=2\\n'
        f'BRAIN_ATLAS_CHECK_0_SHA256={"a" * 64}\\n'
        f'BRAIN_ATLAS_CHECK_1_SHA256={"b" * 64}\\n'
        'BRAIN_ATLAS_REPLAY_RECEIPT_V2_BODY\\n'
        'DSI identity\\naction=trk\\nthread_count=6\\nrandom_seed=0\\nsource=/tmp/source.fz\\n'
        'output=/tmp/output.trk\\n216 tracts are generated using 300006 seeds.\\n\\n'
        'BRAIN_ATLAS_REPLAY_RECEIPT_V2_END\\n'
        'BRAIN_ATLAS_ENDED_UTC=2026-07-22T21:00:03Z\\n'
        'BRAIN_ATLAS_EXIT_STATUS=0\\n'
    )
    receipt = _parse_execution_receipt(receipt_log, ['a' * 64, 'b' * 64])
    receipt_parameters, receipt_warnings = _parse_log(receipt_log, tracked)
    explicit = _explicit_parameters(['/tmp/dsi', '--thread_count=6', '--output=/tmp/output.trk'])
    log.write_text('DSI identity\\n\\x1b[1;31m❗--bias_field_correction is not used/recognized. \\x1b[0m\\n')
    try:
        _parse_log(log, tracked)
        unrecognized = 'accepted'
    except Exception as error:
        unrecognized = f'{type(error).__name__}: {error}'
print(json.dumps({
    'byte': classify_replay(True, True, True, True, True),
    'decoded': classify_replay(False, False, True, True, True),
    'metric': classify_replay(False, False, False, True, True),
    'metricShape': classify_replay(False, False, False, False, True),
    'material': classify_replay(False, False, False, False, False),
    'log': parameters,
    'receipt': receipt,
    'receiptLog': receipt_parameters,
    'explicit': explicit,
    'unrecognized': unrecognized,
}, sort_keys=True))
`);
  assert.equal(result.status, 0, result.stderr);
  const schemaV1 = loadJson('../tools/assets/replay-evidence-v1.schema.json');
  const schema = loadJson('../tools/assets/replay-evidence.schema.json');
  assert.equal(schemaV1.properties.schemaVersion.const, 1);
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
  assert.equal(schema.properties.schemaVersion.const, 2);
  assert.deepEqual(schema.required, ['schemaVersion', 'asset', 'classification', 'environment', 'invocation', 'execution', 'trackvis', 'postprocess', 'retention']);
  const evidenceFixture = loadJson('../test/fixtures/asset-replay-evidence-v2.json');
  const validateEvidence = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
  assert.equal(validateEvidence(evidenceFixture), true, JSON.stringify(validateEvidence.errors));
  const internalValidation = runUvPython(`
import json
from pathlib import Path
from tools.assets.replay import _validate_evidence
evidence = json.loads(Path('test/fixtures/asset-replay-evidence-v2.json').read_text())
_validate_evidence(evidence)
print('valid')
`);
  assert.equal(internalValidation.status, 0, internalValidation.stderr);
  assert.equal(internalValidation.stdout.trim(), 'valid');
  assert.deepEqual(JSON.parse(result.stdout), {
    byte: { id: 1, name: 'byte-exact', closeout: 'allowed-without-new-decision' },
    decoded: { id: 2, name: 'decoded-exact-order-drift', closeout: 'human-decision-required' },
    explicit: {
      randomSeed: { passed: false, value: null },
      threadCount: { passed: true, value: '6' },
    },
    log: {
      emittedIdentity: 'DSI identity',
      generatedTracts: 216,
      output: '/tmp/output.trk',
      random_seed: '0',
      source: '/tmp/source.fz',
      thread_count: '6',
      usedSeeds: 300006,
    },
    material: { id: 4, name: 'materially-different', closeout: 'blocked' },
    metric: { id: 3, name: 'metric-only', closeout: 'human-decision-required' },
    receipt: {
      bashVersion: '3.2.57(1)-release',
      checkSha256: ['a'.repeat(64), 'b'.repeat(64)],
      endedUtc: '2026-07-22T21:00:03Z',
      exitStatus: 0,
      kernel: 'Darwin 25.5.0',
      machine: 'arm64',
      osVersion: '26.5.1',
      startedUtc: '2026-07-22T21:00:00Z',
      threadEnvironment: {
        MKL_NUM_THREADS: '<unset>',
        NUMEXPR_NUM_THREADS: '<unset>',
        OMP_NUM_THREADS: '<unset>',
        OPENBLAS_NUM_THREADS: '1',
        VECLIB_MAXIMUM_THREADS: '<unset>',
      },
      version: 2,
      workingDirectory: '/tmp/replay work',
    },
    receiptLog: {
      emittedIdentity: 'DSI identity',
      generatedTracts: 216,
      output: '/tmp/output.trk',
      random_seed: '0',
      source: '/tmp/source.fz',
      thread_count: '6',
      usedSeeds: 300006,
    },
    metricShape: { id: 3, name: 'metric-only', closeout: 'human-decision-required' },
    unrecognized: 'ContractError: DSI log reports an unused or unrecognized option',
  });

  for (const asset of ['optic-radiation', 'swm']) {
    const help = runAssetCli('verify-replay', asset, '--help');
    assert.equal(help.status, 0, `${asset}: ${help.stderr}`);
    for (const option of ['--inputs', '--prepared', '--tracked', '--log', '--script', '--evidence']) {
      assert.ok(help.stdout.includes(option), `${asset}: ${option}`);
    }
  }
});

test('frozen equality algorithms match independently calculated literal fixtures', () => { // Tests INV-4
  const result = runPython(`
import json
from tools.assets.common import contract_fixture_hashes
print(json.dumps(contract_fixture_hashes(), sort_keys=True))
`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    trackvis: {
      duplicate: {
        multiset: 'ffcddbf03d19b0d4f36b52a2eb135d9106853c40fd55afaed60558dbe3dab1f8',
        order: '119bda5cb26ef84af6f0e6f6d16826142d2ebf9e7f2447e849f02f65a7233895',
      },
      empty: {
        multiset: '4f81276d937f5915a080bb4c6b6f433b46400a9ffcf447a6ce0da5d1f95c5e9f',
        order: '509e3f33ab13ebce2dcc4ed882238af0411452e1718a69f9c41c36c369fbccc6',
      },
      one: {
        multiset: '017fb87ccb17b4df602ada3866f70df80cc63580d78211a918858e2d4a97c929',
        order: '30148b07d3306e64128822d23db3b44b41e78778430b5b5d5ec7d356d455f0e0',
      },
      reversed: {
        multiset: '017fb87ccb17b4df602ada3866f70df80cc63580d78211a918858e2d4a97c929',
        order: '1c3f342912b0a2c5f761d99f194ba2deff9affc866392df76a3270dff5795cc0',
      },
      two: {
        multiset: 'c1da12c441d2d67efd1bdf628eb6efa2c8dec3ef2e9dbdb824b340b30ad005df',
        order: '113bb4f7170b7fa26bb089398e9d384823cf680f7284ca52c00227f63f9720d4',
      },
      twoReordered: {
        multiset: 'c1da12c441d2d67efd1bdf628eb6efa2c8dec3ef2e9dbdb824b340b30ad005df',
        order: '9586b893ef97efda80b95008da586d098530ffd1ab0377c7e8f46848d358fd0e',
      },
    },
    trees: {
      changed: '90f1c854e22aeb0eee12c5e5e4288c913a64202331dddb3173509a41cd4da990',
      empty: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      extra: 'fd2684d22fb9338394d499c13aa0a9f69696c0d4a17f4e885a0c6d1c177dba26',
      missing: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      nested: '8bfde92cadacd32b8b4e4615a8b92cd9fb91ca6020a9ef3b7097faff6de58e96',
      one: '71d39949a39f8177ab3d728e94a283a8005f9a5c73ca0807252d2b1351793c0d',
    },
  });

  const specification = fs.readFileSync(new URL('../tools/assets/SPEC.md', import.meta.url), 'utf8');
  for (const requiredText of [
    'INV-1', 'INV-2', 'INV-3', 'INV-4', 'FAIL-1',
    'brain-atlas/trk-order/v1\\0', 'brain-atlas/trk-multiset/v1\\0',
    'compact fibre JSON', 'regions.json', 'OBJ', 'NIfTI', 'GLB',
    'DSI Studio is never launched',
  ]) {
    assert.ok(specification.includes(requiredText), requiredText);
  }
});
