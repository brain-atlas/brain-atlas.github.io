# AI policy source-verification registry

Companion to [the recommendation and matrices](AI_DISCLOSURE_POLICY_SURVEY.md).
**Checked: 2026-10-15 UTC. Work item: `brain-atlas-yum.11`.**

Every linked policy below was read from its original publisher/journal surface,
not accepted from a search snippet or secondary policy tracker. `Fetch` means
readable primary text returned by `agnt web-fetch`; `browser` means primary page
DOM read after normal browser navigation/challenge resolution. A successful HTTP
status alone was not treated as verification. Sources are mutable: these are
observations on the check date, not promises about later policy.

**Dates:** “not stated” means no policy-effective/update date found in the
inspected text, not that the policy is undated everywhere. An umbrella page's
update date is not the adoption date of every journal. Publication model dates,
footers, URL filenames and examples of model-use dates are not effective dates.

Short quotations below are exact wording (typographic whitespace normalized).
Interpretations and limitations are separate. This registry is not a license to
redistribute full policy pages, source figures or third-party data. Local source
captures, peer leads, corrected browser proof and a hash manifest are retained
under `.pi/research/2026-10-15-ai-policies/`; that private evidence directory is
not required to read the public recommendation.

## Nature Portfolio and Springer Nature

### N1 — Nature Portfolio, Artificial Intelligence

- **URL:** <https://www.nature.com/nature-portfolio/editorial-policies/ai>
- **Verified:** fetch, primary policy body despite a cookie-related final URL.
- **Scope:** Nature Portfolio editorial AI framework; authors, reviewers, editors.
- **Effective/update date:** not stated.
- **Wording:** “Accountability for scholarly content, evaluation, and editorial
  decisions cannot be delegated to AI systems.” Amber uses are “Permitted with
  human oversight, verification, and transparency through disclosure.” Red
  examples include “Assigning authorship or accountability to AI systems or
  tools” and “Creating photorealistic images (deepfakes)”.
- **Interpretation:** distinguishes assistive versus evaluative versus opaque
  use. Reviewers may use support but must not upload to unsecured/public tools
  or delegate judgement. No universal software/data DOI rule in this AI page.

### N2 — Springer Nature, AI Use in Manuscript Preparation

- **URL:** <https://www.springernature.com/gp/policies/editorial-policies/ai-manuscript-preparation>
- **Verified:** fetch.
- **Scope:** publisher manuscript-preparation policy, including visual content;
  not evidence of journal-specific editorial approval.
- **Effective/update date:** not stated.
- **Wording:** “any AI-assisted processing, analysis or code generation has been
  subject to appropriate human review and validation”; examples include “figures
  generated using code that has been reviewed and verified by the author.”
  “Specific disclosure should be provided within the caption or legend of the
  visual content.”
- **Interpretation:** permits conditional visuals with verifiable data, source
  material, methods, computational outputs or author-developed content; opaque
  visuals without these are forbidden. Requires manuscript AI Declaration for
  AI visual content with system, purpose and extent. Both green and amber writing
  rows direct authors to describe use and confirm accountability. This supports
  a distinction between verified rendering code and ungrounded generated imagery.

### N3 — Springer Nature, AI guidance for researchers, editors, reviewers

- **URL:** <https://group.springernature.com/gp/group/ai/ai-guidance-for-researchers-editors-reviewers>
- **Verified:** fetch, including author FAQ and reviewer guidance.
- **Scope:** publisher guidance; contains differing language within the page.
- **Effective/update date:** not stated.
- **Wording:** “The use of an AI tool for ‘AI assisted copy editing’ purposes does
  not need to be declared.” [Quotation marks normalized from double curly quotes
  in source.] Elsewhere: “The use of an LLM (or other AI-tool) for ‘AI assisted
  copy editing’ should be declared in line with our AI guidance.” [Same quote-mark
  normalization.] Image answer begins “Generally no.” Disclosure principles
  specify “including tool versions, usage dates, prompts, and the extent of AI
  contribution within manuscripts.”
- **Interpretation / conflict:** Introduction/Acknowledgements in one passage,
  Methods/equivalent in another; copyediting disclosure advice also conflicts.
  Image discussion covers animation, diagrams and 2D/3D representations, but
  excludes text/numerical items such as tables, flowcharts and simple graphs
  without images. This does **not** resolve N2's broader conditional visual
  allowance. Record both; ask the journal, not a model, to resolve applicability.
  Secure/institutional reviewer tools may permit limited manuscript use only
  after checking tool policies, institutional guidance and confidentiality.

## Science / AAAS

### S1 — Science Journals: Editorial Policies

- **URL:** <https://www.science.org/content/page/science-journals-editorial-policies>
- **Verified:** browser DOM; direct fetch returned 403. AI paragraph and data/code
  sections read. Screenshot of AI paragraph retained.
- **Scope:** page explicitly applies to all Science journals; journal-specific
  author instructions remain additional. Not a policy for every AAAS activity
  or every Science Partner Journal.
- **Effective/update date:** not stated in inspected HTML.
- **Wording:** “nor may sources cited in Science journal content be authored or
  coauthored by AI tools.” “AI-generated images and other multimedia are not
  permitted in the Science journals without explicit permission from the
  editors.” Reviewers “may not enter any part of the manuscript into an LLM or
  other AI tool”.
- **Interpretation:** authorship prohibited; research/writing/presentation use
  disclosed in cover letter and Methods or Acknowledgments. Human responsibility,
  source checks, bias and plagiarism safeguards required. Reviewer's own writing
  may be revised only with disclosure and a system that neither saves inputs nor
  trains on them. Multimedia exceptions are case-by-case, including AI/ML research.
- **Code/data:** permanent public code archive expected for applicable custom
  computational methods, including a fixed archive of GitHub code. Code/data
  citations use DOIs, journal citations or other persistent identifiers; deposited
  code/data with DOIs enter reference list and availability statement. This is
  not a universal requirement to mint a software DOI merely because AI was used.
- **Unverified companion:** HTML links an AI-usage PDF whose link target was
  observed, but browser viewing exposed no readable content. No file was saved
  or downloaded; its use-case-specific rules/exceptions are **not verified**.
  Re-open the linked “AI usage guidelines” from S1 before submission. The matrix
  deliberately does not infer grammar exemptions or detailed code rules from
  an older version, search snippet, or filename.

## Elsevier and Cell Press

### E1 — Elsevier, Generative AI policies for journals

- **URL:** <https://www.elsevier.com/about/policies-and-standards/generative-ai-policies-for-journals>
- **Verified:** fetch, policy and author/image/reviewer FAQs.
- **Scope:** Elsevier journals umbrella; exact journal instructions still matter.
- **Update date:** **June 2026**, explicitly stated; exact day not stated.
- **Wording:** “If authors write or edit code using AI tools as part of their
  research, they should declare this in detail in the Methods section”.
  “General-purpose generative AI tools must not be used to create graphical
  abstracts.” “Even if an AI tool is described as ‘private,’ uploading a manuscript
  still means sharing confidential and unpublished research with a third-party
  system.” [Quote marks around private normalized from double curly quotes.]
- **Interpretation:** no AI authorship; human-led manuscript support permitted,
  including literature summaries and organization, with disclosure. Basic
  grammar/spelling/punctuation and basic reference-manager functions exempt;
  accessibility-only specialist assistive technology exempt. Generative reference
  selection/collation/generation/editing disclosed and sources independently
  checked. Research design, code and analysis go in reproducible Methods.
- **Visual categories:** explanatory images permitted with caption/declaration;
  data visualizations permitted if source-derived/reproducible, reported in
  Methods; no fabricated/altered primary research images. Formal AI imaging
  research is distinguished from falsifying evidential images. General-purpose
  generative graphical abstracts forbidden; dedicated scientific illustration
  tools directed. Covers require prior editor/publisher permission.
- **Disclosure:** separate section before references, tool/service and purpose,
  human review and responsibility. Retain a separate record of tools/models,
  use and review; logs/prompts/outputs are examples, not a command to publish all
  private transcripts. Editors may request records. AI-code presentation-only
  formatting is also declared, unlike basic prose grammar checks.
- **Review:** no manuscript upload, even private systems. Reviewers “should only
  use private AI tools to assist in the review process”. For permitted supportive
  language, structure or background search, verify no retention beyond service
  necessity, reuse, sharing or model training; paid/enterprise status alone is
  not sufficient. Confidentiality, human judgement and disclosure to authors
  still apply; basic spelling/grammar checks exempt from disclosure. No general
  AI-specific DOI-deposit rule found in this page.

### C1 — Neuron, Journal policies

- **URL:** <https://www.cell.com/neuron/information-for-authors/journal-policies>
- **Verified:** browser DOM; direct fetch blocked.
- **Scope:** exact Neuron author-policy page, with Cell Press rules and direct
  links to E1. Not an assumption that every Cell Press journal is identical.
- **Effective/update date:** not stated.
- **Wording:** declaration “should be placed in a new section after the
  ‘declaration of interests’ section.” [Quote marks normalized from double curly
  quotes.] “General-purpose generative AI image tools may not be used in creation
  of graphical abstracts.” “Does not permit use of generative AI or AI-assisted
  tools in the production of cover art.”
- **Interpretation:** agents/deep research explicitly permitted for literature
  synthesis and preparation under E1 limitations and human oversight. Research
  uses in Methods/STAR Methods **and** declaration, model/tool/version/developer
  where applicable. Explanatory figures: legend plus declaration; data
  visualizations: reproducible Methods plus declaration. Research/data-image
  alteration prohibited, explicitly including brightness/contrast/color.
  Cover exception only when AI is integral to reported research and editor
  grants exception: narrower than E1 generic cover permission.
- **Citation/deposit:** ordinary data/code availability and source attribution
  remain distinct; no AI-triggered software DOI mandate identified in AI clauses.

### E2 — NeuroImage, Guide for authors

- **URL:** <https://www.sciencedirect.com/journal/neuroimage/publish/guide-for-authors>
- **Verified:** browser DOM; fetch returned 403.
- **Scope:** exact NeuroImage, not NeuroImage: Clinical or other companion titles.
- **Effective/update date:** not stated.
- **Wording:** “Authors must declare the use of generative AI tools in the
  manuscript preparation process upon submission of the paper.” “AI tools may
  be used to support the creation of explanatory images (such as flow charts,
  conceptual diagrams, or schematic illustrations).”
- **Interpretation:** explicitly links E1 and aligns with its before-reference
  declaration, basic-tool/accessibility exceptions, image distinctions and
  supportive-but-confidential review rules. Cannot use primary-image alteration
  as a shortcut to anatomical accuracy. Not a manuscript acceptance guarantee.

## Society for Neuroscience

### J1 — Journal of Neuroscience, Information for Authors

- **URL:** <https://www.jneurosci.org/content/information-authors>
- **Verified:** browser DOM after local challenge cleared; fetch returned 403.
- **Scope:** exact JNeurosci author instructions; separate SfN ethics linked.
- **Update date:** **September 2026**, shown at page top; exact day not stated.
- **Wording:** “Additionally, authors may use artificial intelligence (AI) tools
  or technology for language editing.” “Both language-editing services and AI
  used in the preparation of a manuscript must be disclosed in the Acknowledgments
  at the time of submission.”
- **Interpretation:** editing permitted with disclosure, not a broad express
  permission for autonomous drafting, analysis, code generation or figures.
  No AI-author prohibition specifically found in inspected J1/J2; do not replace
  that evidence gap with a consensus claim. Project baseline still excludes AI
  authors. Ordinary code policy recommends repositories; custom code central to
  conclusions requires Materials and Methods “Code Accessibility” statement and
  reference citation, available at acceptance/publication.

### J2 — SfN Ethics Policy

- **URL:** <https://www.sfn.org/about/professional-conduct/sfn-ethics-policy>
- **Verified:** fetch; linked directly from J1.
- **Scope:** SfN scientific activities/publications, including JNeurosci/eNeuro.
- **Effective/update date:** not stated in inspected policy text.
- **Wording:** “Pre-published material is confidential. Reviewers and editors
  must avoid breach of confidentiality or using confidential information to
  advance their own or someone else's research or financial interests.”
- **Interpretation:** confidentiality and investigator accuracy/authorship duties
  apply. No AI-specific reviewer-tool allowance found. Use general confidentiality
  protection, not an invented ban or permission concerning a named model.

## eLife

### L1 — The eLife Model, author guide

- **URL:** <https://elife-rp.msubmit.net/html/elife-rp_author_instructions.html>
- **Verified:** fetch. Publisher's legacy submission instructions link to this
  current-model author guide for new research/review submissions; legacy guide
  itself is not used as current research-submission authority.
- **Scope:** current-model Reviewed Preprints and Version of Record process;
  scientific-correspondence/legacy-submission exceptions not surveyed.
- **Effective/update date:** not stated. Model's January 31, 2023 start is not an
  AI-policy effective date.
- **Wording:** AI tools “cannot be listed as or serve as co-authors of a paper,
  and their use must be clearly described in the Materials and Methods section.”
  For striking images: “we cannot include images generated using artificial
  intelligence.”
- **Interpretation:** broad research-tool allowance with human accountability for
  output, data, analyses and representation. No grammar exemption stated. The
  striking-image prohibition is category-specific, tied to licensing for this
  promotional use; general figure permission is not inferred. General image
  acquisition/presentation and data/code sharing rules remain. AI-specific peer
  reviewer instructions were not verified through this author guide.
- **DOIs:** article/preprint/version/review DOI descriptions are **not** a rule
  requiring every software release to receive a DOI.

## Wiley / Human Brain Mapping

### W1 — Human Brain Mapping, Author Guidelines

- **URL:** <https://onlinelibrary.wiley.com/page/journal/10970193/homepage/forauthors.html>
- **Verified:** browser DOM; fetch returned 403.
- **Scope:** exact HBM author instructions; links Wiley Publication Ethics
  Guidelines (authorservices alias resolves to W2).
- **Effective/update date:** not stated.
- **Wording:** “This journal expects data sharing.” Author guidance directs
  readers to “Wiley's Publication Ethics Guidelines” [apostrophe normalized].
- **Interpretation:** no separate AI author clause found here. W2/W3 are verified
  publisher guidance, not a claimed HBM-specific exception. A future submission
  must check this page again and any editorial instructions.

### W2 — Wiley, Best Practice Guidelines on Research Integrity and Publishing Ethics

- **URL:** <https://authors.wiley.com/ethics-guidelines/index.html>
- **Verified:** fetch; HBM-linked `authorservices.wiley.com` alias also fetched.
- **Scope:** Wiley journals umbrella, authors/editors/reviewers.
- **Update date:** **July 2026**, explicitly stated; exact day not stated.
- **Wording:** “Authors may only use AI Technology as an additional tool in their
  writing process, not a replacement for their own expertise and judgement.”
  AI tools “must not be listed as one on an article” (author). “All research
  published in Wiley journals must include a Data Availability Statement”.
- **Interpretation:** substantial editing/development/translation disclosed;
  spelling/grammar/general editing exempt. Authors responsible for references,
  rights and accuracy. Editors determine appropriateness. Review-language
  assistance disclosed to handling editor; review responsibility cannot be
  delegated. Provider must not acquire underlying-content rights including
  training rights (limited service-delivery access excepted). Ordinary data
  definition includes software, algorithms and code; not an AI-triggered DOI rule.

### W3 — Wiley, AI guidelines for researchers

- **URL:** <https://www.wiley.com/en-us/publishing/article/ai-guidelines>
- **Verified:** fetch, author FAQs and research/visual disclosure guidance.
- **Scope:** detailed publisher guidance linked from W2.
- **Effective/update date:** not stated. Guideline-development and example-use
  dates do not establish an effective date.
- **Wording:** “Wiley requires disclosure when AI is used in your research
  methodology, including study design and data collection, literature review,
  code development, and data analysis.” “AI-edited photographs are not permitted
  in Wiley journals.” “Manuscripts under review are confidential and must not
  be uploaded to AI Technologies, whether in full or in part.”
- **Interpretation:** substantive scripts, software, pipelines, modeling,
  screening/selection and manuscript synthesis need disclosure. Routine syntax
  debugging, code style, library suggestions and limited reading/search aids
  have explicit exemptions. Methods/visuals require tool/version/date/role/human
  review (and relevant privacy safeguards); acknowledgment metadata recommended.
  Data visualizations/conceptual illustrations permitted with disclosure;
  generating/modifying evidential imagery prohibited, photograph **analysis**
  distinguished. Supplementary prompts/settings/code may be requested.

## Oxford University Press

### O1 — Policy on AI Use & Disclosure for OUP Journals Authors

- **URL:** <https://academic.oup.com/pages/for-authors/journals/preparing-and-submitting-your-manuscript/ai-principles-for-oxford-journals/policy-on-ai-use-and-disclosure-for-oxford-journals-authors>
- **Verified:** browser DOM; fetch blocked.
- **Scope:** all content types in OUP journals; journal-specific variations take
  precedence, expressly stated. Not the separate OUP books policy.
- **Update date:** **13 July 2026**, explicitly stated.
- **Wording:** “Generating or refining code using AI” and “Generating illustrative
  or explanatory images, such as graphical abstracts, using AI” are listed as
  typically permitted with disclosure. “authors should follow the journal's
  specific guidance” [apostrophe normalized].
- **Interpretation:** grammar/clarity and reference formatting exempt; substantial
  rewriting, translation, data handling/analysis/visualization and code typically
  permitted with disclosure. False primary data/results and creation/alteration
  of primary factual/scientific/technical images prohibited. Cover letter and
  Acknowledgements, plus methods where integral; initial submission and revisions.
  Required name/version/use/human direction/review; dates and affected sections
  strongly recommended. No AI-specific software DOI rule found.

### O2 — AI Principles for OUP Journals

- **URL:** <https://academic.oup.com/pages/for-authors/journals/preparing-and-submitting-your-manuscript/ai-principles-for-oxford-journals>
- **Verified:** browser DOM, linked from O1.
- **Scope:** publishing participants including authors, reviewers and editors;
  principles, not full operational reviewer guidance.
- **Effective/update date:** not stated.
- **Wording:** “Gen AI Tools are not eligible to be listed as authors”. “All
  individuals remain fully accountable for the accuracy, integrity, and
  originality of their works, including any AI-created content these works may
  contain.”
- **Interpretation:** privacy, tool-retention/training policies, bias, human
  accountability and disclosure required. Operational AI review exceptions not
  established by these principles; obtain role-specific guidance.

### O3 — Cerebral Cortex, Author guidelines

- **URL:** <https://academic.oup.com/cercor/pages/author-guidelines>
- **Verified:** browser DOM.
- **Scope:** exact Cerebral Cortex instructions.
- **Effective/update date:** not stated.
- **Wording:** “The use of AI (for example, to help generate content or images,
  write code, process data, or for translation) should be disclosed both in
  cover letters to editors and in the Methods or Acknowledgements section of
  manuscripts.”
- **Interpretation:** AI authors disallowed; broad disclosure includes code/data.
  Does not itself declare every listed use permitted regardless of O1's image
  restrictions. Placement differs from O1's Acknowledgements-plus-integral-methods
  formulation; fuller package avoids silent under-disclosure.

### O4 — Brain, General Instructions

- **URL:** <https://academic.oup.com/brain/pages/General_Instructions>
- **Verified:** browser DOM. An initial proof attempt redirected to journal home;
  that frame was replaced with a verified paragraph at this exact URL.
- **Scope:** exact Brain instructions, not Cerebral Cortex or Brain Communications.
- **Effective/update date:** not stated.
- **Wording:** “The use of LLM tools must be documented in the Methods,
  Acknowledgments, or another appropriate section of the paper.”
- **Interpretation:** no AI authors, human review/full responsibility. Broad LLM
  documentation rule and flexible placement need reconciling with O1's generic
  grammar exemption and cover-letter/Acknowledgements requirements. Do not assume
  a custom placement waives other duties or expands allowed image categories.

## PLOS

### P1 — Ethical Publishing Practice, AI Tools and Technologies

- **URL:** <https://journals.plos.org/plosone/s/ethical-publishing-practice>
- **Verified:** fetch including AI FAQ.
- **Scope:** PLOS ONE-hosted umbrella page explicitly applies to all PLOS journals
  unless otherwise noted; exact target journal supplement not surveyed.
- **Effective/update date:** not stated.
- **Wording:** “AI tools cannot be listed as authors.” Disclosure includes
  “a description of how the user evaluated the validity of the tool's outputs”
  [apostrophe normalized]. AI “should not be used by reviewers or editors to
  summarize or evaluate submission content.”
- **Interpretation:** human work/ideas and accountability required. AI code
  development explicitly disclosed; language improvements exempt, translation
  disclosure recommended, cover-letter drafting exempt. Figure preparation
  disclosed in legend; no false primary outputs, invalid content, privacy or
  licensing violations. Methods/Acknowledgement/legends contain tool/use/validity
  evaluation; formal model-version/date schema not required in this clause.
  All reviewer/editor AI use disclosed, with narrow nonconfidential support only.

### P2 — Materials, Software and Code Sharing

- **URL:** <https://journals.plos.org/plosone/s/materials-software-and-code-sharing>
- **Verified:** fetch.
- **Scope:** PLOS umbrella; software-focused submissions have additional rules.
- **Effective/update date:** not stated.
- **Wording:** authors are encouraged to “Share their code via a repository that
  issues persistent identifiers, such as DOIs.”
- **Interpretation:** code underpinning findings expected to be available;
  central code can be a publication condition. Software manuscripts require
  appropriate archive, open-source access, documentation and test data. DOI
  encouraged, not the sole permissible identifier or an AI-specific obligation.

### P3 — Data Availability

- **URL:** <https://journals.plos.org/plosone/s/data-availability>
- **Verified:** fetch.
- **Scope:** PLOS umbrella, legal/ethical access exceptions addressed.
- **Dates:** policy implemented **March 3, 2014**; page reorganized
  **December 5, 2019**. Neither dates P1's AI rules.
- **Wording:** “authors must provide a Data Availability Statement”. “References
  to data sets (data citations) must include a persistent identifier (such as a
  DOI).”
- **Interpretation:** repository/access identifiers supplied where applicable;
  dataset citations encouraged, identifiers required when cited. DOI is one kind
  of identifier. Disclosure cannot override confidentiality or data licenses.

## Frontiers

### F1 — Editorial policies and publication ethics

- **URL:** <https://www.frontiersin.org/guidelines/policies-and-publication-ethics>
- **Verified:** fetch, AI section, review rules and general data/code provisions.
- **Scope:** Frontiers umbrella; AI subsection explicitly covers manuscript
  writing/editing. No specific Frontiers neuroscience title supplement checked.
- **Effective/update date:** not stated.
- **Wording:** “This explanation must list the name, version, model, and source
  of the generative AI technology.” “manuscript content must not be uploaded to
  external generative AI tools.” “Any use of external AI tools must be discussed
  with the editorial team in advance”.
- **Interpretation:** no AI authors; generated/edited text and visuals checked
  for accuracy and plagiarism, acknowledged in Acknowledgments and Methods if
  applicable. Prompts/outputs in supplementary files encouraged, not required
  universally. No explicit AI-code or general AI-analysis permission in this
  subsection. Statistical/methodological and study-type standards still apply.
  Secure internal review assistance permitted, not editorial decisions; external
  use needs approval and disclosure, without waiving upload prohibition.
- **Data/code:** Data Availability Statements required; statistical code sharing
  strongly encouraged and reproducibility code identified in Methods. Persistent
  identifier preferred where possible; no universal AI-triggered DOI rule found.

## Verification limits and revalidation

This registry verifies the core policy set, **not every linked supplement**.
Remaining questions include Science's linked use-case PDF; operational reviewer
instructions for eLife/JNeurosci/OUP; specific Frontiers/PLOS journal supplements;
and written editor classification of a reproducible atlas screenshot, animation,
or extensively AI-assisted software workflow. Springer Nature's conflicting
pages remain a substantive ambiguity, not an access failure.

Do not substitute older 2023 image/text bans for the checked 2026 primary text.
Do not promote “not addressed” into “allowed”. Do not infer that a README
acknowledgment satisfies journal Methods, cover-letter or figure-caption rules.
A DOI is an identifier, not peer review, endorsement or evidence of compliance.

Revalidate from the linked primary surfaces immediately before a DOI release or
submission: record access date, actual update date when given, exact journal and
article/figure/review category, changed wording, applicable exceptions and any
editor decision. Preserve prior observations as dated evidence rather than
silently replacing their historical meaning. Obtain human approval of resulting
project changes through `brain-atlas-yum.11.2` or a separately scoped Bead.
