# GitHub Pages Publication Implementation Plan

**Issue:** brain-atlas-cgt — Prepare and publish GitHub Pages repository
**Design:** Conversation decisions recorded in Beads brain-atlas-ga7, brain-atlas-9hv
**Date:** 2026-07-20
**Branch:** main

**Goal:** Publish the viewer at `https://brain-atlas.github.io/` from a clean AGPL-3.0-only root commit while preserving private development history and passing a security gate.

**Architecture:** Keep the Vite source tree unchanged. A least-privilege GitHub Actions workflow builds the clean tracked checkout with `npm run build:publish`, uploads `dist/` as the Pages artifact, and deploys it to the organization site. The public repository will be `brain-atlas/brain-atlas.github.io`; the private pre-publication history will be retained only in a verified local Git bundle.

**Acceptance Criteria:**
- [ ] Security review brain-atlas-7zf is closed with critical/high findings remediated.
- [ ] Organization and repository settings follow least privilege.
- [ ] The official AGPL v3 text and `AGPL-3.0-only` metadata cover original project code/documentation; third-party/data licenses remain separate.
- [ ] The Pages workflow builds and deploys only `dist/` with minimal token permissions.
- [ ] A local private-history bundle passes `git bundle verify` before history changes.
- [ ] Public `main` contains one clean root commit and no prior MIT history.
- [ ] Final visibility change, push, and Pages enablement have explicit approval.
- [ ] `https://brain-atlas.github.io/` and primary static assets return HTTP 200.

**Verification Commands:**
```bash
npm audit --omit=dev
npm run build:publish
git diff --check
git bundle verify <private-bundle-path>
git rev-list --max-parents=0 main
gh repo view brain-atlas/brain-atlas.github.io --json visibility,url,homepageUrl
gh run list --repo brain-atlas/brain-atlas.github.io --workflow deploy-pages.yml
curl -fsS https://brain-atlas.github.io/
```

---

### Task 1: Security gate [Independent]

**Context:** Threat-model the static browser app, local build, npm dependencies, future Actions workflow, deployed artifact, and GitHub organization/repository controls.

**Files:**
- Create: `docs/SECURITY.md` if the review finds durable operational guidance is useful
- Inspect: `src/`, `index.html`, `public/`, `package*.json`, `vite.config.js`, `.gitignore`

**Steps:**
1. Map assets, trust boundaries, external inputs, control paths, and attacker goals.
2. Run secret, dependency, source, and built-artifact scans.
3. Review browser DOM insertion/fetch/loading/resource-exhaustion paths.
4. Review Actions workflow design for least privilege and supply-chain pinning.
5. Remediate verified critical/high findings and record residual risks.

**Focused verification:**
```bash
npm audit --omit=dev
npm run build:publish
find dist -type f | sort
```

### Task 2: Create private empty repository [Depends on: Task 1 review start; approval required]

**Context:** Reserve the organization Pages repository without pushing private history or making content public.

**External action:**
```bash
gh repo create brain-atlas/brain-atlas.github.io --private --description "Interactive 3D viewer of the human visual system" --homepage https://brain-atlas.github.io/
```

**Expected result:** Empty private repository exists; no local remote is added and no commits are pushed yet.

### Task 3: Prepare Pages workflow [Depends on: Task 1]

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Modify: package/configuration only if validation requires it

**Steps:**
1. Build on pushes to `main` and manual dispatch.
2. Use `actions/checkout`, Node setup, Pages configuration, artifact upload, and Pages deployment.
3. Grant `contents: read`, `pages: write`, and `id-token: write` only where required.
4. Run `npm ci` and `npm run build:publish`; upload only `dist/`.
5. Validate YAML/action references and run the local publication build.

### Task 4: Complete AGPL conversion [Depends on: Task 1]

**Files:**
- Replace: `LICENSE`
- Modify: `package.json`, `CITATION.cff`, `README.md`, `DATA_LICENSES.md`, `THIRD_PARTY_NOTICES.md`

**Steps:**
1. Install the official GNU AGPL v3 license text.
2. Use SPDX identifier `AGPL-3.0-only` for original project code/documentation.
3. Add repository and homepage metadata.
4. Preserve Three.js MIT text and all anatomical-data terms without implying relicensing.
5. Validate CFF, publication build, and built notices.

### Task 5: Preserve private history [Depends on: Tasks 3–4]

**Context:** Save the full pre-publication repository history outside the public tree before rewriting.

**Steps:**
1. Create a timestamped bundle in an ignored local archive directory outside the repository.
2. Include all refs needed to recover the private development history.
3. Run `git bundle verify` and clone the bundle into a temporary directory as a recovery test.
4. Record the absolute bundle path and checksum in the Bead, not in the public repository.

### Task 6: Create clean AGPL root [Depends on: Task 5; destructive approval required]

**Steps:**
1. Confirm clean working tree and verified bundle.
2. Create an orphan branch from the final reviewed tree.
3. Commit all tracked files once as the initial public AGPL release.
4. Replace local `main`; confirm exactly one root and no MIT project-license references.
5. Do not delete the verified private bundle.

### Task 7: Publish and verify [Depends on: Task 6; external approval required]

**Steps:**
1. Make the empty repository public and configure Pages source as GitHub Actions.
2. Add the organization repository as `origin` and push only clean `main`.
3. Observe the workflow and deployment environment.
4. Smoke-test the root viewer, JavaScript/CSS chunks, notices, models, and primary JSON data.
5. Review repository Actions/Pages/security settings and close Beads with evidence.

## Execution Handoff

Plan saved to: `.pi/plans/2026-07-20-github-pages-publication-plan.md`

Recommended next skill: `stamp-stpa-sec` for the security gate; `verification-before-completion` before publication claims.
