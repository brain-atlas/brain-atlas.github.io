# AI assistance: publication-policy survey

**Checked:** 2026-10-15 (UTC). **Work item:** `brain-atlas-yum.11`.
**Status:** research recommendation, not an adopted release policy, submission
clearance, or authorization to mint a DOI. Follow-up: `brain-atlas-yum.11.2`
requires separate human approval before changing current disclosure artifacts.

## Recommendation

Keep human-only authorship. Disclose substantive AI assistance by task, affected
artifact, tool/model/version and date, together with how outputs were checked
and who accepts responsibility. Preserve source data, executable derivations,
code versions and meaningful review evidence. Cite original scientific sources
and the released software, not chatbot answers as scientific authority.

For maximum practical venue compatibility, prefer figures rendered reproducibly
from documented data and human-approved schematics over prompt-generated pixels.
Do not fabricate anatomy, measurements, citations or validation. Do not send
confidential manuscripts received for journal review to external AI services.
Disclosure does not make a prohibited use permissible.

There is **no universal disclosure sentence that guarantees acceptance**. The
sources below permit substantial assistance under human accountability, but
figure categories, review workflows and disclosure locations differ. Recheck
both publisher and exact journal/article-category rules **immediately before
any DOI release or submission**, and again after material revisions.

[Source registry](AI_POLICY_SOURCE_REGISTRY.md) contains verified primary URLs,
short exact quotations, dates, scope and unresolved questions. Policy codes
below refer to that registry. This is a targeted survey, not legal advice or a
systematic review of every submission category.

## How to read the matrices

- **P — Permitted:** expressly allowed, subject to ordinary integrity duties.
- **R — Restricted:** allowed only under stated conditions or an exception.
- **X — Prohibited:** expressly forbidden for the specified use.
- **D — Required disclosure:** a disclosure duty, not permission by itself.
- **A — Ambiguous:** conflicting wording or uncertain applicability.
- **N — Not addressed:** no specific rule found in the inspected text; not permission.

`R/D` means conditional use with disclosure. Absence of a specialized AI rule
does not remove ordinary ethics, image-integrity, data or code obligations.

### Creating research and manuscripts

| Venue / evidence scope | AI as author | Generated / substantially revised prose | Language-only editing | Code assistance | Data / analysis | Literature review assistance |
|---|---|---|---|---|---|---|
| Nature Portfolio + Springer Nature [N1–N3] | X | R/D: author-led reasoning | P; disclosure wording A across pages | R/D: reviewed and validated generation, particularly visual pipelines | R/D: no delegated conclusions or fabricated evidence | R/D: verify original sources; no replacement of scholarly judgement |
| Science journals / AAAS [S1] | X; also X for AI-authored sources cited | R/D | R/D under broad HTML rule; usage-guide exceptions not verified | R/D under research-use rule; code-specific AI details unverified | R/D under research-use rule | R/D under research/writing rule; task-specific limits unverified |
| Neuron / Cell Press [C1, E1] | X | R/D | P for basic checks; substantive use D | R/D; Methods/STAR Methods plus declaration for research use | R/D; reproducible methods | R/D; agents/deep research explicitly included, human oversight required |
| JNeurosci / SfN [J1–J2] | N specifically; human accountability required | A beyond language editing; manuscript-preparation use D | P/D, including language editing | N for AI; ordinary code accessibility/citation rules apply | N for AI; accuracy/integrity duties apply | N for AI workflow |
| eLife [L1] | X | R/D | D under broad AI-use rule; no language-only exception stated | D under broad research-tools rule; code-specific AI distinction N | R/D; accountable for analyses and representation | D under broad AI-use rule; screening/synthesis-specific limits N |
| NeuroImage / Elsevier [E1–E2] | X | R/D | P for basic checks; substantive use D | R/D; research code in Methods; presentation formatting in declaration | R/D; research methods distinguished from manuscript preparation | R/D; source verification, disclosure of generative reference assistance |
| Human Brain Mapping / Wiley [W1–W3] | X | R/D | P, routine polishing generally exempt | R/D for scripts/software/pipelines; routine debugging/style suggestions exempt in guidance | R/D for substantive analysis; routine transformations/cleaning exempt in guidance | R/D for agentic search, screening, manuscript synthesis; limited search/reading support exempt |
| Cerebral Cortex / OUP [O1–O3] | X | R/D | Publisher P for clarity; journal broad disclosure language warrants conservative disclosure | R/D, explicitly named | R/D, explicitly named | R/D for manuscript content; specialized screening rule N |
| Brain / OUP [O1–O2, O4] | X | R/D | Publisher P for clarity; journal requires documenting LLM use broadly | R/D under OUP, Brain broad LLM disclosure | R/D under OUP | R/D for manuscript content; specialized screening rule N |
| PLOS umbrella [P1] | X | R/D; authors' own work and ideas | P; clarity/grammar exempt, translation disclosure recommended | D explicitly, including software development | R/D; no fabricated/misrepresented primary data | R/D under research support; specialized workflow N |
| Frontiers umbrella [F1] | X | R/D | R/D for generative editing; no narrow grammar exemption stated | N in AI subsection | N in AI subsection; general methods/reporting rules still apply | R/D for generated/edited prose; research screening/extraction A |

### Figures and journal peer review

| Venue | Images, figures and animation | Peer-review confidentiality / assistance |
|---|---|---|
| Nature / Springer Nature [N1–N3] | N2: R/D for visuals from verifiable source material, including reviewed code; X for opaque visuals without verifiable inputs. N3 still says generative images “Generally no”; **A between pages**, seek editorial confirmation. Photorealistic deepfakes X. | R/D for support, no delegated critique/judgement. X uploading manuscripts to public/unsecured tools. N3 permits limited use with secure/institutional tools only after policy/privacy checks. |
| Science [S1] | X without explicit editor permission for AI-generated images/multimedia; case-by-case exceptions, including work about AI/ML. Classification of a screenshot rendered by AI-assisted code needs confirmation, not assumed equivalence to generated pixels. | X entering any manuscript part into AI. R/D for revising reviewer's own writing only if system neither saves inputs nor uses them for training. |
| Neuron [C1] | R/D explanatory images and source-derived reproducible visualizations. X AI creation/alteration of research/data images, including brightness/contrast/color changes. X general-purpose generative graphical abstracts. Cover art X except narrow research-integral editorial exception. | Elsevier [E1] rules: X manuscript upload, including private tools; R/D supportive language/structure or background search without confidential content, using only verified private tools, not delegated assessment. |
| JNeurosci [J1–J2] | N for generative figures specifically; image-integrity duties apply. Do not infer permission. | R: pre-published material confidential. AI-specific reviewer permissions N in inspected sources. |
| eLife [L1] | X AI-generated **striking/promotional images**. Other figure generation N specifically; broad AI disclosure and image-integrity rules apply. Do not extend the striking-image ban to every figure or infer general permission. | AI-specific reviewer rule N in inspected author guide; separate reviewer guidance not verified. Public preprints/reviews do not license disclosure of confidential review communications. |
| NeuroImage [E1–E2] | R/D explanatory images; R/D reproducible data visualizations. X invented/altered primary research images; formal AI research methods treated separately. X general-purpose generative graphical abstracts; covers require prior editor/publisher permission. | Same Elsevier restrictions, including verified private tools only; journal explicitly links umbrella and permits limited supportive assistance. |
| HBM / Wiley [W1–W3] | R/D data visualizations/conceptual illustrations. X AI-edited photographs and AI generation/modification/enhancement of factual/evidential images; R/D photograph analysis as a research method. | X uploading manuscripts, whole or part. R for review-language assistance; D to handling editor. Human reviewer retains assessment. |
| Cerebral Cortex and Brain / OUP [O1–O4] | Publisher R/D for illustrative/explanatory images, including graphical abstracts; X creation/alteration of primary factual/scientific/technical images. Exact classification of this project's atlas screenshots A. | O2 requires confidentiality/data protection; operational AI reviewer allowances N in inspected sources. Check role-specific guidance, not author permission. |
| PLOS [P1] | R/D illustrative or result-summary figures; no misrepresentation, invalid content, rights/privacy violations; figure-legend disclosure required. | X AI summarization/evaluation of submissions and confidential uploads (including summaries/comments revealing content). R/D general guidance, published background information or editing nonconfidential own comments. |
| Frontiers [F1] | R/D verified written/visual output; accuracy and plagiarism checks, general image-integrity rules. | X external manuscript uploads. R for approved internal secure assistance, not editorial decisions. External AI use requires advance editorial discussion/approval and disclosure; not an upload exception. |

These are journal peer-review rules, **not a claim that AI-assisted review of
one's own public source code is forbidden**. Conversely, internal project code
review is not independent scientific peer review and must not be advertised as
such.

## Submission locations, metadata and citation

| Scope | Required / directed disclosure locations and details |
|---|---|
| Nature / Springer Nature | N2: manuscript AI Declaration plus affected visual captions, system/model, purpose and extent. N3 varies between Introduction/Acknowledgements and Methods; also requests versions, dates, prompts. Preserve that evidence and obtain exact journal instructions; do not silently choose the least demanding wording. |
| Science | Cover letter **and** Methods or Acknowledgments, depending on use. HTML refers to linked usage guide for details; guide not verified here. Cite original human-authored sources; no AI-authored/coauthored cited sources. Ordinary code/data citation and archive rules remain [S1]. |
| Neuron | AI declaration **after Declaration of interests** at first submission. Research uses: reproducible Methods/STAR Methods **and** AI declaration, tool/model, version, developer/manufacturer where applicable. Explanatory figures: legend plus declaration with specific tool/version/use. |
| JNeurosci | Acknowledgments at submission for language-editing services and AI manuscript preparation. Tool/version schema N in J1. |
| eLife | Materials and Methods for AI use. Tool/version schema N in L1. |
| NeuroImage / Elsevier | AI declaration **before references**, tool/service, purpose, human review and responsibility; research code/analysis in reproducible Methods. Explanatory-image caption plus declaration; data-visualization methods reported. |
| HBM / Wiley | Acknowledgments for substantive writing; Methods for methodology/literature review; captions for visuals. Methods/visuals require tool/version, date/year, role, human direction/review, plus sensitive-data safeguards where relevant. Acknowledgment metadata is recommended, not all mandatory. |
| OUP | Cover letter **and** Acknowledgements at initial submission and updated revisions; integral methods may also need Methodology. Required: name/version, use, human direction/review; dates/affected sections strongly recommended. Cerebral Cortex says cover letter plus Methods **or** Acknowledgements; Brain permits Methods/Acknowledgments/appropriate section. Journal-specific guidance takes precedence; use fuller package until clarified. |
| PLOS | Methods, Acknowledgement or relevant legends; figure preparation specifically in legends. Tool names, affected components/use, **how validity was evaluated**. |
| Frontiers | Acknowledgments and Methods if applicable; name, version, model, source. Prompts/outputs in supplements **encouraged**, not universally required. |

Tool disclosure is not human authorship or a grant of scientific credit. Except
for specific restrictions such as Science's AI-authored-source rule, inspected
AI clauses do not establish a universal formal reference-list citation format
for AI tools. Follow tool terms and journal citation instructions; cite software
and underlying datasets/methods where used. A model output is not evidence that
a referenced paper exists or supports a claim.

## Compatibility limits for Brain Atlas

1. **No blanket code-assistance exclusion found.** PLOS, Wiley, Elsevier and OUP
   expressly discuss code; eLife has a broad tool rule. This is not blanket
   acceptance of an AI-developed application, scientific validity, or topic fit.
   JNeurosci's AI rule is narrower and Science's linked use-case guide remains
   unverified. Seek clarification for substantial agentic development there.
2. **Figure provenance determines the question.** Separate (a) source atlas
   geometry, (b) offline transformations/selection, (c) deterministic renderer
   code, (d) human-approved schematic anatomy/activity, (e) final screenshot or
   video, and (f) any generative pixel editing. AI-assisted code does not by itself
   establish that atlas data or screenshot pixels were invented by a model.
   Nor does calling an image “a screenshot” exempt it from image policy.
3. **Real incompatibilities:** unrestricted generative graphical abstracts do
   not fit Elsevier/Cell Press rules even though OUP permits disclosed illustrative
   graphical abstracts. AI promotional images do not fit eLife's striking-image
   category. Unapproved AI multimedia does not fit Science's rule. Cell Press
   cover-art exceptions are narrower than Elsevier's generic permission route.
   No amount of acknowledgment cures these restrictions.
4. **Unresolved Springer Nature conflict:** N2 allows verified-source visual
   workflows while N3 retains a general image ban and inconsistent disclosure
   advice. Do not present either as an unqualified universal Nature rule.
   Submit the exact figure method for editorial confirmation before relying on
   an exception or treating a data-derived renderer as prohibited.
5. **Review workflows cannot transfer unchanged:** secure institutional AI use
   described by Springer Nature does not authorize Elsevier manuscript uploads
   or PLOS AI evaluation. Elsevier also requires private tools even for permitted
   nonconfidential review assistance; an enterprise label alone is insufficient.
   Frontiers' internal tool permission does not authorize
   uploading to the project's coding assistants.
6. **Publication is not licensing clearance.** Dataset, code, model-output,
   third-party image and manuscript rights must be checked separately. An AI
   declaration or a software DOI does not grant missing rights or validate claims.

Current README already describes AI-assisted implementation, tests,
documentation, research organization and code review, human responsibility and
no deployed generative model. This survey leaves that disclosure unchanged and
does **not** independently certify the entire development history.

## Proposed conservative disclosure package

This is a **superset of information**, not one universal placement or permission
rule. Adopt only after the maintainer verifies the release-specific facts.
Do not assert that every output received human review unless records support it.

| Artifact | Proposed content / boundary |
|---|---|
| README and release notes | Keep concise current disclosure. Link a release-specific AI-use inventory, scientific limitations and provenance. State what AI assisted, what was not independently validated and who is responsible. Distinguish development-time assistance from runtime behavior. |
| `CITATION.cff` and proposed Zenodo metadata | Keep human authors/creators and genuine human contributor roles. Use released software title/version/date, immutable commit and verified repository/DOI identifiers; never invent a DOI or add a tool as author. Put narrative disclosure in appropriate descriptive metadata or a bundled disclosure document, not nonstandard author fields. Validate actual metadata schemas during the follow-up; none changed here. |
| Manuscript cover letter and AI declaration | Identify tasks, tools/models/versions/providers, dates, affected sections/artifacts, extent of contribution, validation, limitations, and responsibility. Include journal-specific permission decisions. Adjust locations to exact journal requirements rather than assuming README disclosure suffices. |
| Methods / STAR Methods and supplements | Describe substantive AI code, search/screening/synthesis, analysis and figure workflows reproducibly: source versions/hashes, scripts, parameters, model settings where consequential, human checks, test/replay evidence and irreproducible steps. Separate software assistance from an AI research method. |
| Acknowledgments and contributor statement | Describe writing/research/development assistance and actual human supervision, verification and scientific decisions. Assign CRediT roles only to qualifying humans; do not imply that AI review replaces independent expert review. |
| Per-figure / generated-asset provenance | Source data/license, transformations, tool/code/model/version, seed/settings when relevant, affected portion and validation. Distinguish schematic, illustrative and measured elements. Caption AI assistance where required; preserve unaltered source/derived files and identify any pixel generation. |
| Human-responsibility statement | Named accountable human(s) confirm accurate disclosure, scientific interpretation, source verification, appropriate testing, rights review and final approval **to the extent actually performed**, with gaps made explicit. |

Suggested template, **not a statement of completed checks**:

> During preparation of [release/manuscript and immutable identifier], [humans]
> used [tool, provider, model/version, dates] for [tasks and affected artifacts].
> Outputs were evaluated through [specific review, source checks, tests and
> reproducibility checks]. [Known limits and unverified portions] remain.
> The human authors retain responsibility for the work and its claims; AI tools
> are not authors. [Figure/data provenance and disclosure-inventory references].

### Evidence to retain; evidence to publish

Retain a task-level ledger: tool/model identifiers as actually recorded, dates,
artifact/commit/hash, intended role, accepted output or patch, meaningful prompt
or configuration where needed to explain/reproduce a result, human acceptance
and test/source-check evidence. Mark missing historical versions **unknown**;
do not reconstruct them from memory or a current model selector.

For literature work, retain search terms, original source URLs/DOIs and access
dates, selection/screening decisions and claim-level verification. For code and
assets, retain source pins, generator/code version, parameters, validation and
limits. Preserve a source-to-output chain, not an unsupported “AI checked it.”

Publish the sanitized ledger and reproducibility material necessary to assess
the released work. Do not publish credentials, personal/clinical data,
confidential review material, unrelated conversation, hidden agent instructions,
or irrelevant raw prompts. Frontiers encourages full prompt/output supplements;
Springer Nature guidance requests prompts and Elsevier may request records.
Retain relevant material securely and clarify any redaction/access restrictions
with the editor; privacy protection is not permission to omit a required method.
If a required disclosure cannot lawfully be supplied, stop and resolve it rather
than inventing evidence or publishing secrets.

### DOI and submission gate

Journal AI policies govern manuscript/review workflows; they do not by themselves
specify all rules for a standalone software/data DOI deposit. S1 requires durable
code archiving/citation for applicable research; P2 encourages DOI-issuing code
repositories, not a universal DOI mandate. Data availability, reuse permissions
and version-specific citation still matter [S1, P2–P3, L1, J1, F1, W2].

Before release/submission: freeze the candidate; complete the human-approved
inventory; re-fetch dated policies; check exact journal, article/figure category
and review role; resolve ambiguous image classification and missing guidance;
validate citation/deposit metadata and licenses; have humans approve final text
and actual evidence. DOI deposit, remote publication and submission require
separate authorization. `brain-atlas-yum.11.2` owns that proposed follow-up; this
survey makes no runtime, dataset, model, attribution or release-workflow change.
