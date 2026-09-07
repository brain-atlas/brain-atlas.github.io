# Carpet anatomical suitability — initial empirical checkpoint

- Work: `brain-atlas-yum.14.3`; approval: `brain-atlas-n401`.
- Date: 2026-09-07. **Initial partial checkpoint, retained as historical evidence.** The subsequent [full source-labelled SWM audit](audit-results.md) completes displayed-point accounting/sensitivity and curation review. No public replacement; the limitations below remain operative.
- Evidence basis: independently hash-checked carpet and T1, matching NIfTI forms,
  23 fixed slices across three planes, whole-volume compartment diagnostics,
  parent image inspection and independent read-only peer review.
- **Conclusion:** conditionally suitable for private, source-named coarse
  compartment screening. Not suitable for precise tissue membership or automatic
  fibre rejection. Confidence in actual SWM assignments remains unverified until
  point/contour accounting and sensitivity checks are complete.

This record tracks suitability **for a use**, not a universal accuracy verdict.
A plausible template overlay is not expert anatomical validation or an independent
reference segmentation. It cannot clear unresolved upstream rights.

## Source identity and retained evidence

Both files are from TemplateFlow repository revision
`15d7c02160f79f5218d2545b4febebeecc11531d`.

| Input | Bytes | Independently verified SHA-256 |
|---|---:|---|
| `tpl-MNI152NLin2009cAsym_res-01_desc-carpet_dseg.nii.gz` | 451304 | `52eded597985fee7806699dfd276d32b1d53293dff04326773e4fe84864752c7` |
| `tpl-MNI152NLin2009cAsym_res-01_T1w.nii.gz` | 13685075 | `1f27aabea9f7183dc0c69dafa71e1787b921ca778d655d9c1bf302b273d5627a` |

Both are finite, `193×229×193`, with spatial units mm, 1 mm voxels, qform and
sform code 4, and exactly equal selected/qform/sform matrices:

```text
1 0 0 -96
0 1 0 -132
0 0 1 -78
0 0 0 1
```

Carpet is uint16 with the expected source label set; T1 storage is int16.
Their shared 2009c grid establishes this overlay's coordinate correspondence,
**not** correspondence of 2009a fibres, a template warp or shared fibre voxel indices.

Primary records verified through HTTP 200 content inspection:

- [Carpet metadata](https://api.osf.io/v2/files/5bc6475753cec40019ade131/).
- [T1 metadata](https://api.osf.io/v2/files/5bc6475053cec40018addfa2/).
- [Pinned T1 annex pointer](https://api.github.com/repos/templateflow/tpl-MNI152NLin2009cAsym/git/blobs/590132beb1f90e76d054765bba30fbce51420714):
  declared 13,685,075 bytes and MD5 `6c64ebf985fe30d93e49a4baa41b9278`
  match OSF metadata; local SHA-256 supplies the independent byte pin.
- [Published repository terms](https://raw.githubusercontent.com/templateflow/tpl-MNI152NLin2009cAsym/15d7c02160f79f5218d2545b4febebeecc11531d/LICENSE).

Local evidence root (not shipped or committed):
`~/.local/share/brain-atlas/swm-domain-audit/brain-atlas-yum.14.3-source-2026-09-07/`.
It contains canonical files in `inputs/`, copyright/terms in `NOTICE.txt`, original
header evidence, and `anatomy-a/`, `anatomy-b/`, `anatomy-c/` outputs. The owner-only
root protects all descendant files. Do not redistribute images/maps or install
classifications under this approval. See [source gate](source-gate.md) for the
historical construction and upstream-rights gaps.

## Suitability by intended use

| Intended use | Assessment | Boundary |
|---|---|---|
| Detect grossly displaced/flipped carpet relative to this T1 | Supported on inspected slices | No gross orientation/placement contradiction observed; not exhaustive validation. |
| Count encounters with published coarse compartments | Conditional | Retain source-native meanings, background/unresolved outcomes and sensitivity. Counts are descriptive, not verified tissue membership. |
| Identify precise cortical gray or superficial white matter | Unsuitable as sole authority | Coarse cortical coverage does not follow a tissue ribbon; no superficial/deep WM boundary is supplied. |
| Distinguish cerebellum from midbrain or comprehensively delineate brainstem | Unsuitable | Label 255 combines structures; label 5 is not an exhaustive brainstem ontology. |
| Classify all CSF or outside-brain samples | Unsuitable | Only lateral ventricular labels are supplied; internal background exists. |
| Validate a cerebral-only replacement or discard fibres automatically | Not supported | Needs independent anatomical corroboration, fibre-level sensitivity and separate approval. |

## Specific limitations and unsuitability register

### AS-01 — cortical compartment is not a cortical ribbon

**Observed:** yellow source labels 101–196 form broad nearly continuous coverage
on sagittal **x=0 mm**. Axial **z=40,60 mm** and coronal **y=40 mm** show coverage
across visible dark sulcal/interhemispheric clefts rather than separately tracing
the folded ribbon. Peripheral coverage is broadly cerebral; its fine boundaries
are not a tissue segmentation validated against this T1.

**Interpretation:** coarse boundary overreach is visually suggested. Dark T1
intensity alone does not prove CSF or any other tissue class. No voxel error rate
or registration error has been measured.

**Consequence:** use `cortical_source_labels`, not “confirmed cortical gray matter.”
A point assigned here cannot establish cortical termination or the original
GM-ribbon retention criterion. Do not use this map alone to reject SWM at a GM/WM
boundary. Independent tissue evidence is required for that use.

### AS-02 — label 255 is broad combined coverage, not a pure tissue mask

**Observed:** magenta overlaps gross cerebellar anatomy in sagittal **x=±20,±40**,
coronal **y=-80,-60**, and axial **z=-60,-40 mm**. At axial **z=-40**, it covers
internal architecture including a central dark-aperture region on T1. At sagittal
**x=0** and coronal **y=-20**, it adjoins red label 5 through central inferior
anatomy. Exact tissue identities of apparent inclusions remain **unverified**.

Whole-volume label 255 is one six-connected component: **210,744 voxels**, centre
bounds **[-57,-94,-67] to [55,5,13] mm**. **175,684** centres are at least 2 mm
from an outside-compartment voxel centre. Thus the compartment is not merely a
collection of tiny islands; **connectivity and interior depth do not prove its
anatomical correctness or the correctness of any fibre hit**.

**Consequence:** retain the source name **Cerebellum and Midbrain**. No split,
pure-cerebellum claim, exhaustive brainstem claim or automatic fibre exclusion.
The historical residual-brainmask recipe remains a candidate explanation, not
proven generation lineage. Independent delineation is needed for fine exclusions.

### AS-03 — background does not mean outside brain; ventricles are incomplete

**Observed:** sagittal **x=0** contains internal uncolored gaps near posterior
callosal/inferior midline anatomy. Whole-volume diagnostics find a separate
**242-voxel** background component with centre bounds **[-1,-71,-7] to
[2,-41,14] mm**, plus other small components. This is a geometric observation,
not a diagnosis of those voxels' tissue identity. Source labels 3/4 name lateral
ventricles, not all fluid spaces.

**Consequence:** keep background distinct from outside-grid and unresolved
anatomical interpretation. Absence of a lateral-ventricle label cannot establish
absence of CSF; neither a background hit nor a label-255 hit proves nonbrain tissue.

### AS-04 — interior metrics are compartment geometry, not uncertainty

The initial diagnostic used misleading `OtherLabel` wording. Review confirmed
that the mask pools source labels before calculating distances; internal source
label boundaries disappear. Corrected output fields are
`centresAtLeast2mmFromOutsideCompartment` and
`maxDistanceToOutsideCompartmentVoxelCentreMm`.

Distances are Euclidean to the nearest voxel centre **outside the pooled
compartment**, with one false padding layer beyond the volume. They are not
surface distances, distances to every different source label, registration
uncertainty, anatomical confidence or a fibre-level sensitivity result. The
2 mm threshold is a descriptive diagnostic, not a pass/fail accuracy threshold.
For background, padding also affects distances near the image limits.

### AS-05 — source agreement is not independent anatomical corroboration

**Verified limitation:** T1 and carpet share one 2009c grid. The retained fibre
source remains 2009a, with the documented OR/SWM variant evidence limit. The
current 23 slices are sparse, at 20 mm increments; neither whole-volume component
counts nor those views establish all boundaries between them.

**Consequence:** coarse source-labelled accounting may proceed under `n401`, but
actual SWM suitability must still be assessed with all stored points, boundary
sensitivity and representative fibre encounters. Do not report high-confidence
curation, an error fraction or alignment accuracy from this checkpoint.

## Reproduction and verification

The small private [probe](anatomy_probe.py) reuses existing hash/input and
empty-output guards; it introduces no production CLI, dependency, runtime
transform or public asset. Its [focused tests](test_anatomy_probe.py) cover image
axis orientation, forms/units/labels/nonfinite rejection, synthetic component
counts/bounds/distances, changed hashes and unsafe output roots.

```bash
ROOT="$HOME/.local/share/brain-atlas/swm-domain-audit/brain-atlas-yum.14.3-source-2026-09-07"
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python .pi/research/2026-09-07-swm-domains/test_anatomy_probe.py
# Choose a NEW directory; never reuse an existing evidence directory.
mkdir "$ROOT/anatomy-new"
uv run --python 3.13.1 --offline --with-requirements tools/assets/requirements.lock \
  python .pi/research/2026-09-07-swm-domains/anatomy_probe.py \
  --inputs "$ROOT/inputs" --output "$ROOT/anatomy-new"
```

Frozen views: sagittal x=-60 through 60; coronal y=-100 through 60;
axial z=-60 through 60, all at **+20 mm** increments.
Paired images use native one-pixel-per-voxel sampling; first retained RAS axis
increases rightward and second upward. Coronal/axial views are neurological,
not radiological. T1 positive-intensity 1st/99th percentiles set the display window
[56,9015]; nonbackground carpet uses alpha 0.45. Display window is not a tissue
threshold. Counts partition all **8,530,021 grid voxels**, not SWM points.

- Initial RED: four expected assertion failures for missing probe; GREEN: four tests.
- Wording correction RED: assertion `None != 2.0` for missing truthful distance key;
  GREEN: four tests. An earlier direct dictionary assertion raised `KeyError`;
  changed to an ordinary assertion before observing RED.
- Baseline `check-manifest` and `verify-current --repo .`: PASS.
- Corrected probe ran into separate new roots `anatomy-b` and `anatomy-c`:
  all four files byte-identical. Their PNGs also exactly match inspected `anatomy-a`
  PNGs; the original JSON is superseded only for wording/script identity.
- Parent inspected all three images one at a time after the interrupted parallel
  image read. Independent read-only review inspected the same images and probe;
  parent verified its distance-wording finding against source and focused tests.
- No full SWM audit, fibre sensitivity, npm/build or release verification yet.

| Corrected output | Bytes | SHA-256 |
|---|---:|---|
| `axial.png` | 450767 | `4ed5558973f485dde96fd5325e5c6a5d98c16681efb29bc631ca6125e16275eb` |
| `coronal.png` | 460039 | `3fef7e31102dee931ab45517f7cd44a9ecf6049e9d100f277bc3d889c89409ea` |
| `sagittal.png` | 430322 | `829b3ed4d7638789a902f32da3a8f7e37147de9f6c8b70f901169d4c95e6e790` |
| `diagnostics.json` | 13540 | `0f7043187c3c8928eda3481304b3c646fd0087517134a835dfe873d8b90f56f2` |

Probe SHA-256: `975283140946855860b1ff1934bd618d605745709e1a7b382d7a0f0322a8e76b`.
Lock SHA-256: `be44aec52de037588721a5600e56900a981ec32e07e7fbf63232e30ca19209d2`.
Independent review retention: `runtime:delegated-results/f504df85-9309-49ec-a761-76f1da41754a/child-0.json`.

## Remaining gates and documentation impact

The approved plan remains authoritative. This checkpoint implements its initial
empirical source diagnostic as a private research probe; the planned production
audit/CLI/manifest work is **not implemented**. Freeze all point/contour numerical
rules before production accounting, reproduce or explain the pilot counts, run
rounding/grid sensitivity, inspect representative hits, and review curation.
Replace this provisional use assessment only with linked evidence—not a silent
promotion from plausible compartment to anatomical ground truth.

Only private research code and evidence documentation change. No public dataset,
label, geometry, endpoint tuple, lesson preset, UI, performance, dependency,
security/release behavior or citation identity changes. Thus current user docs,
lesson-validation records, `DATA_LICENSES.md`, architecture/specs and software
notices need no public-capability update at this checkpoint. Published terms are
retained locally; the rights gap is not cleared for shipping. The Bead stays open.
