# Pre-publication security review

**Date:** 2026-07-20

**Scope:** Static viewer, tracked/deployed assets, npm supply chain, GitHub Actions
Pages deployment, and repository/organization controls.

**Tracking:** Bead `brain-atlas-7zf`

## System boundary and trust model

The production system has no server application, accounts, forms, cookies, or
personal-data collection. GitHub Actions converts the reviewed Git tree into a
static `dist/` artifact; GitHub Pages serves it; an untrusted browser parses the
HTML, JavaScript, JSON, OBJ, and GLB files.

```text
maintainer -> Git/GitHub -> Actions build -> Pages artifact -> visitor browser
                         npm registry ----^                  ^
                         GitHub actions ---------------------|
```

Trust boundaries exist at maintainer authentication, GitHub repository writes,
npm package retrieval, reusable GitHub Actions, the Pages deployment artifact,
and browser parsing of the published data.

## Security losses and hazardous states

| ID | Loss to prevent | Hazardous state |
|---|---|---|
| L-1 | Visitors execute unauthorized code | An unreviewed or tampered artifact is deployed |
| L-2 | Private or unlicensed material becomes public | The artifact contains secrets, ignored experiments, or unintended assets |
| L-3 | Viewer availability is materially degraded | Malformed or unbounded data exhausts browser resources |
| L-4 | Scientific or attribution integrity is lost | Code, anatomy, provenance, or notices are altered without review |

The primary adversaries are opportunistic web attackers, a compromised maintainer
account, and a compromised npm package or reusable Action. The main unsafe
control actions are deploying from an unauthorized ref, building code that does
not match the lockfile, granting build steps a deployment token, and publishing
more than the reviewed `dist/` directory.

## Controls verified

- Browser-visible labels derived from JSON use `textContent`; the only
  `innerHTML` assignment clears a container with a constant empty string.
- Runtime requests are same-origin and use established JSON, OBJ, and GLB
  parsers; there is no `eval`, dynamic script insertion, third-party runtime
  script, storage, messaging, or credential handling.
- Tracer and superficial-fibre GPU buffers have explicit upper bounds.
- A restrictive meta Content Security Policy limits scripts and connections to
  the same origin and disables objects, base-URL changes, and form submission.
- `window.__view` is guarded by `import.meta.env.DEV`; verification ensures the
  production bundle does not contain the debug interface.
- `npm audit` reports zero known vulnerabilities. The lockfile resolves packages
  only from `https://registry.npmjs.org/` and records integrity hashes.
- The Pages build uses `npm ci --ignore-scripts`, audits dependencies, and runs
  the repository's publication guard.
- Reusable Actions are pinned to full commit SHAs. The build job has only
  `contents: read`; only the dependent deployment job receives `pages: write`
  and `id-token: write`.
- The workflow triggers only on `main` or manual dispatch, does not deploy pull
  requests, uploads only `dist/`, and uses the protected `github-pages`
  environment.
- Dependabot monitors npm and GitHub Actions dependencies; CODEOWNERS identifies
  the maintainer for review.
- The repository permits only GitHub-owned reusable Actions, requires full
  commit-SHA pinning, defaults workflow tokens to read-only, disables unused
  Projects, and enables vulnerability alerts and automated security fixes.
- Secret-pattern scans found no credentials in tracked files or the private
  development history. The production build emits no source maps or symlinks.
- `scripts/check-publish.mjs` rejects untracked files under `public/`; local
  experimental assets live in ignored `.workbench/` and are absent from `dist/`.

## Residual risks and operational requirements

- GitHub account and organization security remain the highest-value controls.
  Require two-factor authentication for organization members before adding
  collaborators, use least-privilege roles, and review repository access.
- GitHub Pages does not provide project-controlled response headers. The meta CSP
  provides useful browser enforcement but cannot set every header directive,
  including `frame-ancestors`.
- The browser necessarily receives the complete public anatomical datasets.
  They provide no confidentiality boundary and must remain suitable for public
  redistribution.
- Large but bounded public data files can cause slow loading or memory pressure
  on low-resource devices. This is an availability/performance limitation, not
  a server compromise path.
- Dependency major versions are intentionally not upgraded during this review.
  Zero known vulnerabilities were reported; Dependabot and future focused
  compatibility testing remain required.
- A compromised maintainer or GitHub organization owner could authorize a
  malicious deployment. The organization does not currently require two-factor
  authentication; require it before adding collaborators. Before publication,
  enable Pages from GitHub Actions and private vulnerability reporting, then
  protect `main` against deletion and force pushes after the clean-root push.

## Verification

```bash
npm audit
npm ci --ignore-scripts
npm run build:publish
# Confirm no production debug hook, source maps, symlinks, or unintended files.
rg '__view' dist/assets/*.js
find dist -type f -name '*.map' -o -type l
```

The expected result is a clean audit and build, with both final searches producing
no matches.
