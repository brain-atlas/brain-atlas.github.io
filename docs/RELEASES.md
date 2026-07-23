# Standalone binary releases

Brain Atlas has two release channels for the optional localhost executable. The
hosted viewer at <https://brain-atlas.github.io/> remains the simplest user path.

## Channels

| Channel | URL | Source | Mutability |
|---|---|---|---|
| Stable | <https://github.com/brain-atlas/brain-atlas.github.io/releases> | Deliberate semantic-version tag such as `v0.1.0` | Version tag, metadata, and assets are never changed by the workflow after publication. |
| Nightly | <https://github.com/brain-atlas/brain-atlas.github.io/releases/tag/nightly> | Latest successful `main` build | One prerelease moves forward; every asset name and provenance record identifies its source commit. |
| Actions artifact | The triggering workflow run | Pull request, `main`, `v*`, or manual dispatch | Retained for 14 days; not a GitHub Release. |

Nightly is never marked **Latest**. A failed or stale build cannot promote it.
Versioned releases remain the stable history.

## Supported downloads

Each bundle contains six platform archives:

- `brain-atlas-<label>-linux-amd64.tar.gz`
- `brain-atlas-<label>-linux-arm64.tar.gz`
- `brain-atlas-<label>-darwin-amd64.tar.gz`
- `brain-atlas-<label>-darwin-arm64.tar.gz`
- `brain-atlas-<label>-windows-amd64.zip`
- `brain-atlas-<label>-windows-arm64.zip`

Unix archives contain `brain-atlas`; Windows archives contain
`brain-atlas.exe`. Every archive also contains `LICENSE`, `DATA_LICENSES.md`,
`THIRD_PARTY_NOTICES.md`, and `CITATION.cff`. Those documents accompany the
distribution but are not runtime dependencies.

The release also contains:

- `brain-atlas-<label>-SHA256SUMS` — sorted hashes for all six archives and the
  provenance record;
- `brain-atlas-<label>-PROVENANCE.json` — source commit, timestamp, clean/dirty
  source state, Node/npm/Go versions, target matrix, archive sizes, and hashes.

The executable embeds the reviewed production site and needs no adjacent files.
It remains a loopback web launcher, not a native WebView, installer, or LAN
server.

## Build workflow

[`.github/workflows/standalone-binaries.yml`](../.github/workflows/standalone-binaries.yml)
runs for pull requests, `main` pushes, `v*` tag pushes, and manual dispatches.

The read-only build job:

1. checks out full tag history without persisted credentials;
2. installs locked Node 22 dependencies and the Go version selected by `go.mod`;
3. audits the locked Node dependencies;
4. verifies that the ordinary Pages artifact has no standalone lifecycle or
   development hooks;
5. stages one standalone production Vite tree;
6. runs CGO-free Go tests, the host race detector, and `go vet`;
7. requires a clean tracked/untracked source state, then cross-builds Linux,
   macOS, and Windows for amd64 and arm64;
8. writes normalized archives, provenance, and checksums twice and requires
   identical results;
9. runs the extracted Linux amd64 binary from a temporary directory and checks
   representative HTML, data, model, 404, and 405 responses; and
10. uploads the exact `release/` directory as one 14-day Actions artifact.

Only GitHub-owned Actions are used, and each is pinned to a full commit SHA. The
build job receives only `contents: read`.

The Ubuntu release job does not run `npm test`. Seven tests exercise scientific
asset regeneration against the recorded Darwin arm64/Nix environment, including
byte-exact uv, Python, package-tree, and fixture checks that Ubuntu cannot
satisfy. Decision `brain-atlas-ek3` keeps the complete 200-test `npm test` suite
as a required local gate instead of running a partial Node suite in this
workflow. The release job still runs the locked dependency audit, publication
and build isolation checks, Go tests/race/vet, deterministic package validation,
and the extracted Linux smoke test.

## Nightly publication

A separate serialized job receives `contents: write` only after a successful
`main` build. [`scripts/publish-standalone-release.mjs`](../scripts/publish-standalone-release.mjs)
performs the publication state machine with shell-free `gh` argument arrays.

1. Validate the downloaded artifact's exact inventory, checksums, provenance,
   clean source state, source commit, and target labels.
2. Require the source commit to equal the repository's current `main`. A stale
   run exits without promotion.
3. Upload new assets under commit-scoped names. Matching names are accepted only
   when GitHub's reported size and `sha256:` digest match. The publisher never
   uses `--clobber`.
4. Re-check current `main`, then move only the `nightly` tag and update the
   prerelease title/body. Re-read the tag, release, digests, and current `main`;
   any concurrent change fails before cleanup.
5. Delete only prior assets that match the project's complete managed-nightly
   naming pattern. Unknown assets and all stable assets remain untouched.

If an upload fails, the previous set remains available. A partially uploaded
candidate remains visibly commit-labeled. If promotion succeeds but cleanup
fails, the next idempotent run removes the old managed set.

## Stable publication

A stable job runs only for a pushed tag matching the workflow's `v*` trigger.
The publisher applies a narrower semantic-version check before any write.

- The remote tag must already exist and resolve to the exact workflow/bundle
  commit.
- A new release starts as a draft. Assets upload without overwriting names, and
  GitHub's size/digest values must match before publication. After publication,
  the workflow re-resolves the tag and rechecks the complete release.
- A retry may finish a matching partial draft by uploading only missing assets.
- A retry of an already published release is read-only and succeeds only when
  its tag, title, state, asset names, sizes, and digests match exactly.
- Any mismatch fails. The workflow never edits, deletes, replaces, or retags a
  published stable release.

Repository-wide immutable-release enforcement is not enabled because it would
also freeze the intentionally mutable published nightly channel. Stable
immutability is therefore a workflow and maintainer invariant.

## Maintainer release procedure

Publishing a stable version is a consequential operation. Record the version,
approval, and release evidence in Beads before creating or pushing a tag.

1. Confirm `main` is clean, current, reviewed, and passing both Pages and
   standalone workflows.
2. Reconcile the release version in `package.json`, `CITATION.cff`, and public
   documentation. Review notices, data terms, scientific traceability, lesson
   validation, and security impact.
3. Run the local verification documented in `AGENTS.md` and this file.
4. After explicit approval, create and push one annotated semantic-version tag.
5. Watch the standalone workflow. Download its release assets and independently
   verify checksums plus a representative runtime smoke test.
6. Record the workflow URL, tag, commit, downloaded-asset verification, and any
   platform limitation in the release Bead.

Do not move a stable tag, delete/recreate a stable release, or use a manual asset
edit to work around a mismatch. Investigate and publish a new version when bytes
must change. A post-publication tag mismatch is a release-security incident: the
workflow fails visibly, and maintainers must stop distribution and investigate
account/repository writes rather than make the mismatched release look valid.

## Unsigned binaries

The project does not yet sign or notarize release binaries. Checksums detect a
corrupt or mismatched download, but they do not replace platform code signing.
Users should obtain both archive and checksum from the project's release page.

On macOS, verify the checksum first, then use Apple's documented one-time
**Privacy & Security → Open Anyway** procedure if Gatekeeper blocks the
executable. The README gives a narrowly scoped `xattr -d` fallback for the
verified executable only. Never advise users to disable Gatekeeper, use `sudo`,
or recursively remove quarantine from Downloads.

Signing, notarization, installers, auto-update, and release credentials beyond
the job-scoped GitHub token require separate security designs and approvals.

## Local verification and rehearsal

```bash
npm ci --ignore-scripts
npm test
npm run build:standalone:site
CGO_ENABLED=0 go test ./...
go test -race ./internal/standalone
go vet ./...

npm run build:release -- --label ci-local
npm run verify:release -- --label ci-local
```

The publisher supports offline dry runs. Build a bundle whose label matches the
chosen channel and source commit, then pass `--dry-run`; the script prints the
planned read/write operations and never invokes `gh`.

A manual workflow dispatch builds and retains CI artifacts but cannot publish
nightly or stable releases because both publication jobs also require their
specific push ref. No local verification command creates a tag or release.
