# Software AI disclosure package

- **Owner:** `brain-atlas-yum.11.2`.
- **Status:** Approved future-use software disclosure package; not release clearance.
- **Approval:** `brain-atlas-bw1c`, 2026-10-15; supersedes draft-basis-only approval `brain-atlas-0zcz` for this package's status and completion scope, not publication.
- **Date:** 2026-10-15.
- **Branch:** `fix/issue-5-visual-audit`.
- **Candidate:** `17a6a2360139da15450dc4d1586731e73fda22e0`.
- **Scope decision:** user approved bounded software-only inventory, exact companion text, source-limited human attribution, local commit and scoped closeout. Deposit platform, manuscript target and final figures are not selected. No publication, upload, DOI minting or changes to existing public disclosure artifacts authorized.

## Evidence boundary

Recovery used only `brain-atlas-yum.11`, `brain-atlas-yum.11.2`, their referenced artifacts and linked source documents. No prior transcripts or unrelated private research were recovered. This is a bounded documentary inventory, not a complete historical AI-use audit or independent scientific validation. Statements below distinguish project records from checks performed in this session.

Candidate metadata in `CITATION.cff` lists version `0.1.0`, software title “Brain Atlas: Visual Pathway in 3D”, and Steve Hay as sole human author. This does not establish a published release or a DOI. Do not infer release date from this package's date. Do not add AI authors or infer CRediT roles from commits or model output.

## Source-bound inventory

| Work / affected artifacts | Tool, model, version, dates | Evidence and limits |
|---|---|---|
| Software implementation and test creation | Generative AI coding assistants; historical providers/models/versions and per-task dates **unknown in inspected evidence** | Candidate `README.md`, “AI-assisted development”, reports these uses. No task-by-task attribution or complete human review ledger recovered. Existing maintainer-responsibility statement is not independently recertified here. |
| Documentation and research organization | Historical tools/models/versions and per-task dates **unknown in inspected evidence** | Same README disclosure. Does not prove every document or citation was checked by a human. |
| Internal code review | Historical tools/models/versions and per-task dates **unknown in inspected evidence** | Same README disclosure. Internal AI-assisted review is not independent scientific peer review. |
| AI-policy survey and source registry | Research assistant model/version **unknown**; recorded survey date 2026-10-15 | `docs/AI_DISCLOSURE_POLICY_SURVEY.md`, `docs/AI_POLICY_SOURCE_REGISTRY.md`; prior Bead binds research to commit `f645083833f71d5f050398d3ebdda77cdf8a19e0`. Prior record reports 21 primary captures and 54 checked quotations; not freshly re-fetched or rechecked here. |
| Policy-document review | Recorded routing target `openai-codex/gpt-6-astra`; immutable model build/version **unknown**; review date attributed to prior closeout, 2026-10-15 | Private `review-findings.json` and `review-resolution.json` under `.pi/research/2026-10-15-ai-policies/` record one minor Elsevier condition omission and parent inspection/correction. Routing target is not proof of provider build identity. Parent verification is agent verification, not documented human scientific validation. |
| Asset derivation and visual/activity models | AI contribution by individual generator, asset, or model **unknown in inspected evidence** | Candidate `README.md` and `docs/SCIENTIFIC_TRACEABILITY.md` document atlas sources, derivations and representation limits. These records do not identify who or which AI authored each step. Do not infer AI generation of anatomical source data from AI assistance with code. |
| Final figures, screenshots, animation, pixel editing | No release figure selected; capture settings, final hash, editing history and any generative-pixel use **unknown** | Renderer documentation is not provenance for an unspecified final image. No claim that all historical images are free of generative editing. |

Unknown means missing within this recovery boundary, not proof that records never existed. New records require explicit scope expansion; do not reconstruct history from memory or today's model selector.

## Exact approved software disclosure

Keep the current README AI-assisted-development section unchanged. Approved companion text for a future release note or bundled disclosure; not inserted into current release artifacts:

> This disclosure concerns Brain Atlas at commit `17a6a2360139da15450dc4d1586731e73fda22e0`. The project records generative AI assistance with implementation, test creation, documentation, research organization, and internal code review. The existing README describes human direction and maintainer responsibility. This bounded evidence review does not independently certify every historical review or source check. Historical tool/model/version and task-date records are incomplete; missing details remain unknown. AI tools are not authors, and AI-assisted code review is not independent scientific validation.
>
> The documented viewer combines atlas-derived anatomy, an explicitly schematic anterior pathway, a mirrored right optic-radiation exception, and illustrative activity and display models. Data-derived rendering is distinct from generative pixel synthesis. No final figure is covered by this inventory; its capture and editing provenance must be recorded separately. Source attribution, derivation limits, and data terms remain in `DATA_LICENSES.md`, `docs/SCIENTIFIC_TRACEABILITY.md`, and `docs/TRACT_SPACE_PROVENANCE.md`. In particular, current optic-radiation and short-range-contour outputs depend on recovered intermediates, not fully reproduced upstream tracking.
>
> This software disclosure is not journal clearance, rights clearance, independent scientific review, or authorization to publish or deposit the software.

No README duplication, release-note insertion, `CITATION.cff` alteration, new contributor attribution, or deposit metadata is proposed for immediate application. If a later companion document is adopted, link it once from the existing README rather than replacing or repeating the existing section. Rebind the disclosure if the software candidate changes.

## Figure provenance before any figure claim

For each selected figure retain source/asset hashes and licenses, generator/code commit, actual scene/camera/filter/activity state, seed and time where applicable, capture tool/version/date, output hash, and all subsequent edits. Document schematic geometry, mirrored anatomy, and illustrative activity. Deterministic code alone does not establish pixel-identical reproducibility across hardware, browser versions, timing, or unseeded state. Record whether generative pixel tools were used and where; do not presume “none”. No caption can be finalized without the actual figure.

## Human approval and remaining gates

Approval covers this bounded package and its explicit gaps, not certification that missing checks occurred. Approved human-role statement: Steve Hay is the software author recorded in candidate CITATION.cff. The existing README reports human direction and maintainer responsibility. This package adds no CRediT roles and does not attest that every historical output received human review or scientific validation. Do not add a signed attestation on a human's behalf.

No deposit platform or manuscript journal/category has been selected. Consequently no platform policy, metadata schema, journal-specific permission, or editor exception is verified for this candidate. The policy survey remains dated background, not current clearance. Before an actual release/deposit/submission, revalidate applicable primary policies and licenses and obtain separate approval. For relevant manuscript targets, unresolved Science usage-guide access and Springer Nature policy conflicts still require resolution; software-only scope does not waive these future gates.

Publish only a sanitized necessary inventory and reproducibility evidence after approval. Keep secrets, restricted data, confidential reviews, copyrighted full policy captures, hidden instructions and raw transcripts out of public artifacts. No publication of private review records is proposed.

## Verification and documentation impact

This session checked candidate identity, tracked-tree cleanliness before drafting, existing README disclosure, citation fields, scientific inventory sections, and the two prior review JSON records. No runtime tests, builds, asset regeneration, image verification, fresh policy fetch, license revalidation or metadata-schema validation was performed. Those checks are not implied by package approval.

Only this package is new. Runtime, scientific claims, assets, licenses, existing public documentation, citation metadata and release mechanisms remain unchanged. No architecture/spec/notices updates are needed. Human approval `brain-atlas-bw1c` narrows Bead acceptance to this approved software disclosure package: explicit unknowns are acceptable, and unselected platform/manuscript/figure checks remain future pre-publication gates rather than completion blockers. The original broader scope is retained in Beads history; it is not claimed fulfilled. Local verification and commit evidence belong in the owning Bead. Closing this package does not clear a release or submission.
