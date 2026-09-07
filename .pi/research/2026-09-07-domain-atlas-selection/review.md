# Independent diagnostic review

Invocation `7177c226-ce45-43da-ac75-52276808f9ca`, child 0; numerical/acceptance review. Parent owns image inspection.

## Verdict

**Bounded numerical review: PASS. Full Bead acceptance: NOT MET — partial diagnostic only.** No serious numerical or safety defect confirmed.

### Acceptance blocker
`.pi/research/2026-09-07-domain-atlas-selection/evaluate.py:240–247`: native symmetric T1 remains unparsed (`h5py` absent); comparison uses asymmetric reference without validated correspondence. All 15,000 records correctly retain unresolved anatomy/null primary. Treating source-label agreement as validated domain authority—or closing full acceptance—would exceed evidence. Plan lines 77–78 explicitly preserve this gate. No validated primary/domain-only assignment established.

### Numerical evidence
- Locked `test_evaluate.py`: **6/6 passed**.
- Hashes matched: 18 acquired files, two references, four repository inputs, source inventory, six code files. Locked environment verified.
- CerebrA header confirmed: 193×229×193, float32 integer labels 0–102, qform 0/sform 1, unknown units, identity scaling. CSV: 51 RH identities, LH=RH+51.
- Independent scalar nibabel inverse-affine sampling: 20 fixed representatives +128 deterministic extras, **147 unique points; zero mismatches**.
- All 27 offsets and alternate rounding checked on **48 contours/384 points**; scalar labels, comparison partitions and retained group masks matched.
- Full records balanced: **15,000 contours /120,000 points /30,000 endpoints**. Strata, cross-tabs, target complements and representative selection matched.

| Source-label state | Points | Endpoints |
|---|---:|---:|
| Supported | 49,163 | 16,464 |
| Conflicting | 16,513 | 3,991 |
| Unresolved | 54,324 | 9,545 |

Source255-hit: **3,447** contours; broader-union-hit: **4,253**.

No images inspected; parent owns visual acceptance. No regeneration/byte-repeat claim. Initial serialization check differed only because decoded JSON converts integer label keys to strings; producer-key reconstruction matched exact bytes. Prior failed invocation not counted.

## Native supplement review

Invocation `24332ce2-e99c-407c-8d86-728eb3925ec4`, child 0. This resolves the earlier missing-native-parser blocker, not full anatomical acceptance.

**No findings** in native supplement since `59d4a26`.

- Wheel, installed environment, source/script pins verified. Native-a/b byte-identical; original evaluator unchanged.
- Full-volume canonicalization equals exact axis transpose; world coordinates preserved. No warp.
- Independent photometry matches: 1,169,666 label-support voxels; Pearson `0.796701293`, mean absolute normalized difference `0.077213184`.
- Five read-only tests pass, including new native test. Two file-writing tests skipped; panels not reinspected.

Native parser blocker resolved. Full `.6` acceptance remains open: symmetric/asymmetric correspondence, coverage, rights, anatomical assignments unresolved. Correlation does **not** establish spatial validity. No writes.
