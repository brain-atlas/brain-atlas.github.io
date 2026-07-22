# DSI replay determinism investigation

- Date: 2026-07-22
- Bead: `brain-atlas-yum.6.1`
- Controlled-run approval: `brain-atlas-47w`
- Legacy closeout exception: `brain-atlas-3ct`

## Result

The approved replays did not recreate either recovered TrackVis intermediate. The current OR and SWM JSON files remain byte-reproducible only from their exact hash-registered recovered intermediates and deterministic post-processing. No replay output may replace a public asset.

The two accepted contemporary six-thread OR executions used the same registered executable and scientific inputs. They produced different raw counts, retained counts, and decoded streamline multisets:

| Record | Evidence category | Threads | Seed | Raw | After fixed post-processing | Frozen result |
|---|---|---:|---|---:|---:|---|
| Recovered OR reference | Historical reference; not a compliant replay | 6 | Effective default 0; exact historical build unresolved | 223 | 220 | Current lineage reference |
| Initial OR replay | Accepted clean v1 replay | 6 | Effective 0; omitted from argv | 216 | 215 | Class 4, materially different |
| Exact OR repeat | Accepted clean v1 replay | 6 | Effective 0; omitted from argv | 234 | 233 | Class 4, materially different |
| One-thread A | Exploratory; non-comparable | 1 | Explicit and effective 0 | 254 | 252 | Class 4, materially different |
| One-thread B | Exploratory; non-comparable | 1 | Explicit and effective 0 | 254 | 252 | Class 4, materially different |
| Attempted bias-disable A | Rejected; unused option | 6 | Explicit and effective 0 | 205 | 204 | Excluded from compliant counts |
| Attempted bias-disable B | Rejected; unused option | 6 | Explicit and effective 0 | 211 | 211 | Excluded from compliant counts |
| SWM replay | Accepted clean v1 replay | 8 | Effective 0; omitted from argv | 200,000 | 15,000 | Class 3, metric only |

The two one-thread outputs are byte-identical. Two exploratory trials do not establish general repeatability, and their 252-fibre result does not recreate the public 220-fibre OR asset.

The attempted `--bias_field_correction=0` arms are rejected observations. The executable reported that option as unused or unrecognized and still ran bias correction. They do not count as compliant replays or bias-disabled controls. Future v2 wrappers and verification fail closed on such messages.

`diagnostic-summary.json` is the authoritative compact ledger. It records exact argv, canonical argv hashes, script/input/log/output hashes, explicit and effective seed state, decoded hashes, post-processing outcomes, missing v1 receipt fields, evidence category, and comparison eligibility. Historical records mark unavailable scripts, complete logs, and execution-time hash checks as unavailable rather than reconstructing them.

## What the evidence supports

The two accepted contemporary six-thread OR runs establish end-to-end non-repeatability for those executions. The evidence does not identify the varying internal stage. It does not prove whether FIB loading, bias correction, tracking, scheduling, output assembly, or another operation caused the difference.

The binary identifies itself as the DSI Studio Hou version compiled Jul 9 2026, but no source/build record binds it to a Git commit. Nearby public source contains schedule-sensitive multithreaded operations that could contribute to variation. This is a possible mechanism, not an identified cause or an exact-build claim.

## Frozen consequences

- OR remains class 4, `materially-different`.
- SWM remains class 3, `metric-only`.
- No tolerance promotes either result.
- No replay output may replace public data.
- Public fibre coordinates, the single runtime transform, and activity semantics remain unchanged.
- Decision `brain-atlas-3ct` grants only the exact, non-precedential legacy closeout exception.
- Follow-up `brain-atlas-yum.13` owns source/build-bound deterministic retracking and any separately approved candidate replacement.

## Retention

Raw DSI outputs, complete logs, generated scripts, and third-party inputs remain outside Git under `/tmp/brain-atlas-yum6-dsi-replay/`, `/tmp/brain-atlas-yum6-dsi-diagnostic/`, and the recovered scratchpad. Their owner-only durable copy is verified at `~/.local/share/brain-atlas/replay-evidence/brain-atlas-yum.6-2026-07-22/`.

The archive contains 49 manifested files and 780,598,830 manifested bytes. Its deterministic `MANIFEST.tsv` has SHA-256 `b059c722b90cd2ae68d4540f220bfe78c12c4d1611f251264a529ae815005ed5`. Source-to-copy comparison and a separate retrieval rehash passed for every entry. Directories use mode `0700`, files use `0600`, and extended ACL entries were removed. Steve Hay, the repository owner, is the custodian.

Keep the archive and all original files until `brain-atlas-yum.13` closes. Delete them only after separate owner approval. The archived compact files record the pre-archive state; the repository copy adds the manifest result afterward to avoid a self-referential manifest hash.
