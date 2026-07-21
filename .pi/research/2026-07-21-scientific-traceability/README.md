# Scientific traceability source audit

Date: 2026-07-21
Bead: `brain-atlas-yum.1`
Public synthesis: `docs/SCIENTIFIC_TRACEABILITY.md`

## Method

- Inspected structured runtime JSON metadata and parsed the cortical GLB with
  Three.js rather than matching binary text.
- Compared current source, documentation, and checked-in data.
- Used `agnt web-search` to discover records and `agnt web-fetch` to verify each
  cited URL before relying on it.
- Used Crossref publisher-deposited records when a DOI publisher page rejected
  automated retrieval.
- Marked undocumented local generation/conversion steps unknown instead of
  inferring them from filenames or visual alignment.

## Verified source registry

`sources.tsv` records the verified URLs and retrieval status for TemplateFlow,
MNI152NLin2009cAsym, Jülich-Brain, HCP-1065, Yeh 2022, DSI Studio, HCP methods and
terms, and the MNI 2009a/2009c release distinction. Raw fetched page content is
not redistributed in the repository; the registry and public synthesis preserve
the verified identities and conclusions needed for follow-up.

The EBRAINS and JuSER pages were client-rendered and returned little extractable
body text. Their URLs resolved successfully; dataset and license identity were
also verified through search-result metadata and the Jülich paper's Crossref
record. This audit supports record identity, not undocumented local processing.
