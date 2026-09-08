"""Private source-bound ANTs conversion and retained-field validation; no acquisition."""
from pathlib import Path
import sys
import os
from itertools import product
import json
import importlib.util
import shutil

import ants
import nibabel as nib
import numpy as np
from scipy.ndimage import map_coordinates, label, find_objects, binary_fill_holes

REPO = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(REPO))
from tools.assets.common import (require_empty_output_root, resolve_inputs,
                                 sha256_file, compute_environment_identity)


def check_output(path):
    path = Path(path).absolute()
    if any(p.is_symlink() for p in (path, *path.parents)):
        raise ValueError('symlink output path')
    return require_empty_output_root(path, REPO)


def read_ras(path):
    """Read scalar NIfTI without from_numpy's implicit float64->float32 cast."""
    path = Path(path).absolute()
    if any(p.is_symlink() for p in (path, *path.parents)):
        raise ValueError('symlink image path')
    source = nib.load(path)
    data = np.asarray(source.dataobj, dtype=np.float64)
    if data.ndim != 3 or not np.isfinite(data).all():
        raise ValueError('expected finite scalar 3D image')
    image = ants.image_read(str(path), pixeltype='double', reorient=False)
    basis = np.diag([-1., -1., 1.])
    affine = source.affine
    if not (np.allclose(image.origin, basis @ affine[:3,3], atol=1e-6, rtol=0)
            and np.allclose(np.asarray(image.direction) @ np.diag(image.spacing),
                            basis @ affine[:3,:3], atol=1e-6, rtol=0)
            and np.array_equal(image.numpy(), data)):
        raise ValueError('ANTs/NIfTI basis or scalar precision mismatch')
    return image


def read_field(path):
    """Use ITK's vector semantics, not assumptions about NIfTI stored components."""
    path = Path(path).absolute()
    if any(p.is_symlink() for p in (path, *path.parents)):
        raise ValueError('symlink field path')
    image = ants.image_read(str(path), pixeltype='double', reorient=False)
    if image.dimension != 3 or image.components != 3:
        raise ValueError('expected 3D three-component displacement')
    basis = np.diag([-1., -1., 1.])
    affine = np.eye(4)
    affine[:3,:3] = basis @ np.asarray(image.direction) @ np.diag(image.spacing)
    affine[:3,3] = basis @ image.origin
    field = np.asarray(image.numpy(), dtype=np.float64) @ basis
    return validate_field(field, affine)


def register(fixed, moving, prefix):
    """Exact approved wrapper invocation; caller owns preflight and empty output.

    Seed zero is ANTs' no-fixed-sampling-seed sentinel. CC uses dense sampling;
    reproducibility must be established by two exact replays, not seed wording.
    """
    if os.environ.get('ITK_GLOBAL_DEFAULT_NUMBER_OF_THREADS') != '1':
        raise ValueError('one ITK thread required before imports')
    if fixed.pixeltype != 'double' or moving.pixeltype != 'double':
        raise ValueError('double input images required')
    ants.config.set_ants_deterministic(on=False, seed_value=0)
    return ants.registration(fixed=fixed, moving=moving, type_of_transform='SyNOnly',
                             initial_transform='Identity', outprefix=str(prefix),
                             syn_metric='CC', syn_sampling=4, grad_step=.2,
                             flow_sigma=3, total_sigma=0, reg_iterations=(50,50,30),
                             singleprecision=False, use_legacy_histogram_matching=False,
                             write_composite_transform=False, verbose=True)


def resample_labels(fixed, moving, transforms, invert):
    """One nearest-neighbor categorical pullback plus independent source support."""
    values = moving.numpy()
    if (not np.isfinite(values).all() or np.any(values != np.rint(values))
            or np.any((values < 0) | (values > 102))):
        raise ValueError('invalid original CerebrA IDs')
    if not transforms or len(transforms) != len(invert) or any(type(flag) is not bool for flag in invert):
        raise ValueError('explicit transform and inversion lists required')
    options = dict(fixed=fixed, transformlist=transforms, whichtoinvert=invert,
                   interpolator='nearestNeighbor', defaultvalue=0, singleprecision=False)
    labels = ants.apply_transforms(moving=moving, **options).numpy()
    support_image = moving.new_image_like(np.ones(values.shape, dtype=np.float32))
    support = ants.apply_transforms(moving=support_image, **options).numpy()
    if not np.isin(labels, np.unique(values)).all() or not np.isin(support, [0,1]).all():
        raise ValueError('resampling invented labels or nonbinary support')
    return labels.astype(np.uint8), support.astype(np.uint8)


def validate_field(field, affine):
    field = np.asarray(field, dtype=np.float64)
    affine = np.asarray(affine, dtype=np.float64)
    if (field.ndim != 4 or field.shape[-1] != 3 or min(field.shape[:3]) < 3
            or not np.isfinite(field).all() or affine.shape != (4,4)
            or not np.isfinite(affine).all()
            or not np.array_equal(affine[3], [0,0,0,1])
            or abs(np.linalg.det(affine[:3,:3])) < 1e-12):
        raise ValueError('invalid finite world displacement field/grid')
    return field, affine


def jacobian(field, affine):
    """Unclamped determinant of identity+d(displacement_RAS)/d(world_RAS).

    Central two-neighbor differences; one-voxel boundary excluded, not certified.
    """
    field, affine = validate_field(field, affine)
    columns = []
    for axis in range(3):
        plus = [slice(1,-1)]*3; minus = list(plus)
        plus[axis] = slice(2,None); minus[axis] = slice(None,-2)
        columns.append((field[tuple(plus)]-field[tuple(minus)])/2)
    gradient = np.stack(columns, axis=-1) @ np.linalg.inv(affine[:3,:3])
    return np.linalg.det(gradient + np.eye(3))


def roundtrip(forward, inverse, affine):
    """Same-grid RAS fields; linear inverse interpolation only inside its grid.

    Full-grid population; slabs bound coordinate temporaries. Call again with
    swapped fields to test the other direction. Exclusions are counted explicitly.
    """
    forward, affine = validate_field(forward, affine)
    inverse, _ = validate_field(inverse, affine)
    if forward.shape != inverse.shape:
        raise ValueError('roundtrip requires identical grid shapes')
    shape = forward.shape[:3]; invlinear = np.linalg.inv(affine[:3,:3])
    errors = []
    for x in range(shape[0]):
        indices = np.indices((1,shape[1],shape[2]), dtype=np.float64).reshape(3,-1).T
        indices[:,0] = x
        displacement = forward[x].reshape(-1,3)
        mapped = indices + displacement @ invlinear.T
        valid = ((mapped >= 0) & (mapped <= np.array(shape)-1)).all(axis=1)
        coordinates = mapped[valid].T
        sampled = np.column_stack([map_coordinates(inverse[...,k], coordinates,
                                   order=1, mode='constant', cval=np.nan,
                                   prefilter=False) for k in range(3)])
        error = np.linalg.norm(displacement[valid]+sampled,axis=1)
        if not np.isfinite(error).all():
            raise ValueError('nonfinite roundtrip')
        errors.append(error)
    errors = np.concatenate(errors)
    if not len(errors):
        raise ValueError('empty bidirectional interpolation support')
    maximum = float(errors.max())
    return dict(evaluated=len(errors), excluded=int(np.prod(shape))-len(errors),
                max_mm=maximum, quantiles_mm=np.quantile(errors,[0,.5,.95,.99,1]).tolist(),
                within_budget=maximum <= .5)


def cell_jacobian_bound(field, affine):
    """Conservative interval determinant bound on each trilinear cell.

    Four edge differences bound each bilinear derivative. Outward rounding of
    differences/products/sums; dependency between entries is deliberately lost.
    A nonpositive lower bound means UNVERIFIED, not necessarily folded. Reject
    rather than tune this sufficient check. Only approved unit RAS grid supported.
    """
    field, affine = validate_field(field, affine)
    if not np.array_equal(affine[:3,:3],np.eye(3)):
        raise ValueError('cell bound requires approved unit RAS grid')
    def times(a,b):
        products = np.stack([x*y for x in a for y in b])
        return np.nextafter(products.min(axis=0),-np.inf), np.nextafter(products.max(axis=0),np.inf)
    minimum = np.inf; unverified = 0; cells = 0
    for x in range(field.shape[0]-1):
        block = field[x:x+2]; lower = []; upper = []
        for axis in range(3):
            difference = np.diff(block,axis=axis)
            edges = []
            for bits in product((0,1),repeat=2):
                slices = [slice(None)]*3
                for other,bit in zip([i for i in range(3) if i!=axis],bits):
                    slices[other] = slice(bit,bit+block.shape[other]-1)
                edges.append(difference[tuple(slices)])
            edges = np.stack(edges)
            lower.append(np.nextafter(edges.min(axis=0),-np.inf))
            upper.append(np.nextafter(edges.max(axis=0),np.inf))
        lo = np.nextafter(np.stack(lower,axis=-1)+np.eye(3),-np.inf)
        hi = np.nextafter(np.stack(upper,axis=-1)+np.eye(3),np.inf)
        bound = np.zeros(lo.shape[:-2])
        for columns,sign in (((0,1,2),1),((1,2,0),1),((2,0,1),1),
                             ((2,1,0),-1),((1,0,2),-1),((0,2,1),-1)):
            terms = [(lo[...,row,col],hi[...,row,col]) for row,col in enumerate(columns)]
            a,b = times(times(terms[0],terms[1]),terms[2])
            bound = np.nextafter(bound+(a if sign==1 else -b),-np.inf)
        if not np.isfinite(bound).all():
            raise ValueError('nonfinite cell determinant bound')
        minimum = min(minimum,float(bound.min()))
        unverified += int((bound<=0).sum()); cells += bound.size
    return dict(minimum_lower_bound=minimum, unverified_cells=unverified, cells=cells,
                meaning='Sufficient positivity bound; nonpositive lower bound is not proof of folding.')


def technical_report(original, moved, support, forward, inverse, affine):
    if (original.shape != moved.shape or original.shape != support.shape
            or forward.shape != original.shape+(3,) or inverse.shape != forward.shape
            or not np.isin(original,range(103)).all()
            or not np.isin(moved,range(103)).all() or not np.isin(support,[0,1]).all()
            or np.any(moved[support == 0] != 0)):
        raise ValueError('label/support/field grid or value mismatch')
    jacobians = []
    for field in (forward,inverse):
        det = jacobian(field,affine)
        jacobians.append(dict(minimum=float(det.min()), maximum=float(det.max()),
                              nonpositive=int((det<=0).sum()), evaluated=det.size,
                              excluded=int(np.prod(original.shape))-det.size))
    cell_bounds = [cell_jacobian_bound(field,affine) for field in (forward,inverse)]
    roundtrips = [roundtrip(forward,inverse,affine), roundtrip(inverse,forward,affine)]
    present = set(np.unique(original))-{0}; lost = sorted(present-set(np.unique(moved)))
    counts = []; topology_changes = []
    boxes = [find_objects(volume.astype(np.int16),max_label=102) for volume in (original,moved)]
    for identifier in sorted(present):
        row = dict(id=int(identifier))
        for name,volume,bounds in zip(('original','moved'),(original,moved),boxes):
            box = bounds[int(identifier)-1]
            mask = volume[box] == identifier if box is not None else np.zeros((1,1,1),bool)
            # Connectivity-one components and enclosed background voxel counts;
            # descriptive topology proxies, not Euler characteristic/genus.
            row[name] = dict(voxels=int(mask.sum()), components=int(label(mask)[1]),
                             enclosed_background_voxels=int((binary_fill_holes(mask)&~mask).sum()))
        if any(row['original'][key]!=row['moved'][key] for key in ('components','enclosed_background_voxels')):
            topology_changes.append(int(identifier))
        counts.append(row)
    numerical = (not lost and all(j['nonpositive']==0 for j in jacobians)
                 and all(c['unverified_cells']==0 for c in cell_bounds)
                 and all(r['within_budget'] for r in roundtrips))
    return dict(numerical_pass=bool(numerical), anatomical_status='unvalidated',
                technical_acceptance='pending review' if numerical else 'failed',
                jacobians=jacobians, cell_bounds=cell_bounds, roundtrips=roundtrips, lost_labels=[int(i) for i in lost],
                support_voxels=int(support.sum()), outside_support_voxels=int((support==0).sum()),
                per_label=counts, topology_changes_requiring_review=topology_changes,
                boundary_policy='Jacobian central differences exclude outer voxel; interpolation excludes mapped coordinates outside centre-grid bounds.')


def deformation_pair(registration):
    """Discard only a parsed exact identity emitted for -r Identity/-z 1."""
    fwd,inv = registration['fwdtransforms'],registration['invtransforms']
    if len(fwd)==2 and len(inv)==2 and fwd[1]==inv[0] and Path(fwd[1]).suffix=='.mat':
        transform = ants.read_transform(fwd[1],precision='double')
        if (transform.dimension!=3 or transform.transform_type!='AffineTransform'
                or not np.array_equal(transform.parameters,np.r_[np.eye(3).ravel(),np.zeros(3)])
                or not np.isfinite(transform.fixed_parameters).all()):
            raise ValueError('nonidentity affine; no fitted alignment authorized')
        fwd,inv = fwd[:1],inv[1:]
    if len(fwd)!=1 or len(inv)!=1 or fwd[0]==inv[0]:
        raise ValueError('unexpected transform inventory')
    return fwd,inv


def recover_registration(method, verified, output):
    """Reuse exact hash-checked outputs only when fitting/policy inputs match."""
    recovery = method['recovery']
    files = set(recovery['fwdtransforms']+recovery['invtransforms'])
    if not files | {recovery['method']} <= verified:
        raise ValueError('recovery outside verified inputs')
    original = json.loads(Path(recovery['method']).read_text())
    for key in ('arguments','roles','technical_policy','environment_identity'):
        if original[key]!=method[key]:
            raise ValueError('recovery changed frozen '+key)
    targets = [output/Path(p).name for p in sorted(files)]
    if len(set(targets))!=len(targets) or any(p.exists() or p.is_symlink() for p in targets):
        raise ValueError('recovery output collision')
    for source,target in zip(sorted(files),targets):
        with open(source,'rb') as src, target.open('xb') as dst:
            shutil.copyfileobj(src,dst)
    return {key:[str(output/Path(p).name) for p in recovery[key]]
            for key in ('fwdtransforms','invtransforms')}


def run_candidate(method_path, method_sha256, output, reuse_registration=False):
    """Frozen-method runner. All identities checked before scientific input parsing."""
    output = check_output(output)
    method_path = Path(method_path).absolute()
    if any(p.is_symlink() for p in (method_path,*method_path.parents)) or sha256_file(method_path)!=method_sha256:
        raise ValueError('method hash/path drift')
    method = json.loads(method_path.read_text())
    if method['id'] != 'cerebra-synonly-candidate-v1':
        raise ValueError('unknown frozen method')
    for path,digest in method['implementation'].items():
        if sha256_file(REPO/path)!=digest:
            raise ValueError('implementation drift: '+path)
    actual = compute_environment_identity(Path(shutil.which('uv')),method)
    if actual != method['environment_identity']:
        raise ValueError('isolated environment drift')
    verified = set()
    for record in method['input_sets']:
        root = Path(record['root'])
        if any(p.is_symlink() for p in (root,*root.parents)):
            raise ValueError('symlink input ancestor')
        verified.update(str(p) for p in resolve_inputs(root,record['files']).values())
    roles = method['roles']
    if not set(roles.values()) <= verified:
        raise ValueError('role outside verified inputs')
    comparison_path = REPO/'.pi/research/2026-09-07-domain-atlas-selection/evaluate.py'
    spec = importlib.util.spec_from_file_location('source_comparison',comparison_path)
    comparison = importlib.util.module_from_spec(spec); spec.loader.exec_module(comparison)
    original = comparison.check_image(nib.load(roles['labels']))
    with open(roles['label_table']) as stream:
        comparison.parse_labels(stream)
    fixed_nifti = nib.load(roles['fixed'])
    if (fixed_nifti.shape != (193,229,193)
            or fixed_nifti.header.get_xyzt_units()[0] != 'mm'
            or int(fixed_nifti.header['qform_code'])!=4 or int(fixed_nifti.header['sform_code'])!=4
            or not np.array_equal(fixed_nifti.get_qform(),comparison.AFFINE)
            or not np.array_equal(fixed_nifti.get_sform(),comparison.AFFINE)):
        raise ValueError('fixed grid/forms drift')
    for role in ('moving','labels','fixed','carpet'):
        img = nib.load(roles[role])
        if img.shape!=(193,229,193) or not np.array_equal(img.affine,comparison.AFFINE):
            raise ValueError('noncanonical input grid')
    fixed = read_ras(roles['fixed']); moving = read_ras(roles['moving'])
    source_labels = read_ras(roles['labels'])
    carpet = np.asarray(nib.load(roles['carpet']).dataobj)
    # Check comparison semantics before fitting, not after outcomes appear.
    baseline_comparison = np.bincount(comparison.compare(carpet,original).ravel(),minlength=3).tolist()
    (output/'method.json').write_bytes(method_path.read_bytes())
    registration = (recover_registration(method,verified,output) if reuse_registration
                    else register(fixed,moving,output/'syn-'))
    fwd,inv = deformation_pair(registration)
    pullback,affine = read_field(fwd[0]); inverse,inverse_affine = read_field(inv[0])
    if not np.array_equal(affine,comparison.AFFINE) or not np.array_equal(inverse_affine,affine):
        raise ValueError('field grids differ')
    moved,support = resample_labels(fixed,source_labels,fwd,[False])
    for name,array in (('labels',moved),('support',support)):
        image = nib.Nifti1Image(array,affine)
        image.set_qform(affine,4); image.set_sform(affine,4); image.header.set_xyzt_units('mm')
        nib.save(image,output/(name+'.nii.gz'))
    warped_moving = ants.apply_transforms(fixed=fixed,moving=moving,transformlist=fwd,
                                         whichtoinvert=[False],interpolator='linear',
                                         defaultvalue=0,singleprecision=False)
    ants.image_write(warped_moving,str(output/'warped-moving.nii.gz'))
    report = technical_report(original,moved,support,pullback,inverse,affine)
    report['method_sha256'] = method_sha256
    report['registration_reused'] = reuse_registration
    report['image_pullback'] = dict(target_to_source=Path(fwd[0]).name,source_to_target=Path(inv[0]).name,
                                   basis='RAS mm decoded from ITK LPS; no fibre transform')
    report['carpet_corroboration'] = dict(baseline=baseline_comparison,
        candidate=np.bincount(comparison.compare(carpet,moved).ravel(),minlength=3).tolist(),
        categories=list(comparison.STATES),meaning='Descriptive source agreement only; not independent anatomical truth or accuracy.')
    report['displacement'] = []
    for field,labels in ((pullback,moved),(inverse,original)):
        magnitude = np.linalg.norm(field,axis=-1)
        extreme = np.unravel_index(np.argmax(magnitude),magnitude.shape)
        report['displacement'].append(dict(quantiles_mm=np.quantile(magnitude,[0,.5,.95,.99,1]).tolist(),
            max_index=[int(i) for i in extreme],max_ras_mm=nib.affines.apply_affine(affine,extreme).tolist(),
            per_label={str(i):dict(mean_mm=float(magnitude[labels==i].mean()),max_mm=float(magnitude[labels==i].max()))
                       for i in np.unique(labels)}))
    report['manual_review'] = dict(status='pending',selection=method['review_selection'])
    report['decoded_sha256'] = {}
    import hashlib
    for name,array in (('target_to_source_ras',pullback),('source_to_target_ras',inverse),('labels',moved),('support',support)):
        report['decoded_sha256'][name] = hashlib.sha256(np.asarray(array,dtype='<f8').tobytes(order='C')).hexdigest()
    report['output_files'] = {p.name:sha256_file(p) for p in sorted(output.iterdir()) if p.is_file()}
    (output/'report.json').write_text(json.dumps(report,sort_keys=True,allow_nan=False,indent=2)+'\n')
    return report


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--method',type=Path,required=True)
    parser.add_argument('--method-sha256',required=True)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--reuse-registration',action='store_true')
    args = parser.parse_args()
    result = run_candidate(args.method,args.method_sha256,args.output,args.reuse_registration)
    print(json.dumps(dict(numerical_pass=result['numerical_pass'],technical_acceptance=result['technical_acceptance'])))
