# Association-tract direction: stimulation and naming evidence

Research record for `brain-atlas-yum.9`; primary records checked **2026-10-15**.
This is an evidence assessment, not an approved replacement activity model.

## Recommendation

**Retain the bilateral 50/50 `probabilityAToB` fallback** for all eight displayed
association bundles. None of the reviewed studies estimates the probability that one of this
viewer's accepted illustrative code events travels from its geometric endpoint A
to B. Equal sampling is an explicit absence-of-evidence display assumption, **not**
evidence of equal biological traffic, equal axon populations, or resting-state
symmetry. Do not label the default animation “measured resting connectivity.”

Human intracranial evidence does support reciprocal communication, asymmetric
evoked responses, state-dependent network interactions, and task-stage-dependent
statistical direction. These findings support **condition-labelled research and
teaching hypotheses**, not a single numerical direction prior for a whole bundle.
The strongest candidates are auditory naming involving left arcuate pathways and
picture naming involving bilateral occipitotemporal/ILF pathways. Neither warrants
changing the current model without a separate approved model/version and
implementation Bead.

Current behavior remains specified by
[`SCIENTIFIC_TRACEABILITY.md`](SCIENTIFIC_TRACEABILITY.md#direction-and-impulse-policy)
and `public/data/tract_activity.json`. This review adds no tract endpoint
relationships, geometry, runtime transforms, activity parameters, or lesson claims.

## Scope and method

Question: can human CCEP/CCSR or related naming evidence justify condition-specific
effective-direction probabilities for ILF, IFOF, SLF I–III, VOF, arcuate, and MdLF?

This is a targeted evidence assessment, **not a systematic review or meta-analysis**.
Searches used `agnt web-search`, followed by primary-record retrieval with
`agnt web-fetch` and browser reads when HTTP challenges blocked text retrieval.
Search angles included Sonoda language CCSR, the reported 125-patient naming study,
posterior-visual feedforward asymmetry, foundational reciprocal language CCEP, and
sleep/wake modulation. Exact-title, author, cohort, and DOI checks separated
conference/preprint leads from final publications. Representative discovery queries:

- `Sonoda cortico cortical spectral responses effective connectivity asymmetry language`
- `"Six-dimensional dynamic tractography atlas"`
- `naming white matter auditory visual 125 patients`
- `Kochi Kanno naming 2026 brain`
- `human cortico cortical evoked potentials bidirectional asymmetry Matsumoto 2004 language`
- `"The neural tides of sleep and consciousness"`

Included: human primary intracranial studies with identifiable cohorts, conditions,
methods, and relevant directional or task-network results. Abstract-only evidence
is labelled. Excluded from numerical-prior inference: search snippets, news,
animal-to-human ratio extrapolation, streamline order/counts, and response
significance or symptom probability treated as traffic probability. “Unsupported”
below means unsupported by this reviewed corpus, not that no relevant study exists.
No raw patient data, analysis code, supplements, or videos were downloaded or
reanalyzed; numerical findings below are reported results, not independent replication.

## Verified source inventory

Links point to content actually read, not merely successful HTTP responses.

| ID | Primary record and DOI | Access and role |
|---|---|---|
| S1 | Sonoda M, Silverstein BH, Jeong JW, et al. **Six-dimensional dynamic tractography atlas of language connectivity in the developing brain.** *Brain* 2021;144(11):3340–3354. DOI `10.1093/brain/awab225`. [Final article](https://pmc.ncbi.nlm.nih.gov/articles/PMC8677551/). | Full text; main language CCSR source. Final Table 1, not the preprint's table numbering, governs this extraction. |
| S2 | Sugiura A, Silverstein BH, Jeong JW, et al. **Four-dimensional map of direct effective connectivity from posterior visual areas.** *NeuroImage* 2020;210:116548. DOI `10.1016/j.neuroimage.2020.116548`. [Accepted manuscript](https://pmc.ncbi.nlm.nih.gov/articles/PMC7054169/). | Full text; regional visual evoked-response asymmetry. |
| S3 | Kochi R, Kanno A, Uda H, et al. **Whole-Brain Dynamic Causal Tractography Atlas of Auditory and Visual Speech Networks Derived From Intracranial Neurophysiologic Data.** *Neurology* 2026;106(2), January 27. DOI `10.1212/WNL.0000000000214448`. [Final full text](https://www.ovid.com/jnls/neurology/fulltext/10.1212/wnl.0000000000214448~whole-brain-dynamic-causal-tractography-atlas-of-auditory). | **125-patient lead verified.** Coactivation plus stimulation mapping, not a CCEP/CCSR direction-ratio study. |
| S4 | Kochi R, Kanno A, Uda H, et al. **Whole-brain millisecond-scale effective connectivity of auditory and visual naming.** *NeuroImage* 2026;340:122236; online September 14. DOI `10.1016/j.neuroimage.2026.122236`. [Accepted manuscript](https://pmc.ncbi.nlm.nih.gov/articles/PMC13659335/). | Full text; **127 patients**, transfer entropy (TE), distinct from S3. Final terminology is accelerating/decelerating, not the preprint's excitatory/inhibitory. |
| S5 | Usami K, Korzeniewska A, Matsumoto R, et al. **The neural tides of sleep and consciousness revealed by single-pulse electrical brain stimulation.** *Sleep* 2019;42(6):zsz050. DOI `10.1093/sleep/zsz050`. [Full text](https://pmc.ncbi.nlm.nih.gov/articles/PMC6559171/). | Direct state comparison; later stimulation-induced high-gamma network interactions, not named-bundle polarity. |
| S6 | Matsumoto R, Nair DR, LaPresto E, et al. **Functional connectivity in the human language system: a cortico-cortical evoked potential study.** *Brain* 2004;127:2316–2330. DOI `10.1093/brain/awh246`. [PubMed record](https://pubmed.ncbi.nlm.nih.gov/15269116/). | Metadata and abstract verified; full text not obtained. Qualitative reciprocity only; no numerical latency or pulse-intensity claim extracted. |

The [2025 AES abstract 3.084](https://aesnet.org/abstractslisting/naming-is-shaped-by-early-facilitative-and-late-compensatory-neural-interactions-an-intracranial-study-of-125-patients)
corroborates the 125-patient lead but is not counted as an independent replication.
The [127-patient preprint record](https://pmc.ncbi.nlm.nih.gov/articles/PMC12667859/)
is likewise not independent evidence; S4's published text supersedes it for this
assessment. Do not combine these cohorts as independent samples without a
patient-level overlap audit.

## What each measurement means

| Measurement | What it can support | What it does not supply |
|---|---|---|
| CCEP | Time-domain, phase-locked response after stimulating one cortical site and recording another. | Axon counts, natural event rates, a unique tract route, or proof that the same route is used during a task. |
| CCSR | Spectral response after stimulation; includes phase-locked and non-phase-locked components. Band, latency, baseline, and state define the measure (S1/S2/S5). | An interchangeable quantity across studies, or a measured proportion of forward versus reverse axons. |
| Task high-gamma coactivation | Simultaneous task-associated engagement of regions with an atlas streamline between them (S3). | Direction: the S3 pairwise intensity is symmetric under exchanging the two regions. |
| TE / event-related causality (ERC) | Directed statistical dependence under a specified analysis and condition (S4/S5). | Direct observation of travel along a particular fibre, exclusion of every common/indirect cause, or a normalized event-direction probability. |
| Electrical stimulation symptom mapping | Functional relevance of stimulated sites to elicited symptoms during specified testing. | Proof that each inferred white-matter edge is causal, or probability of ordinary traffic along that edge. |
| Diffusion streamline / endpoint assignment | Estimated trajectory / method-specific spatial proximity. | Polarity, synaptic terminations, axonal population ratios, or functional direction. |
| Viewer accepted code event | Seeded illustrative event whose direction is sampled from authored metadata. | A spike, a measured firing rate, or a calibrated unit of CCSR amplitude, TE, or symptom probability. |

These distinctions are essential even when a paper calls its visualization
“dynamic causal tractography.” Early response timing can strengthen a direct-path
interpretation; it does not uniquely identify a named tract or eliminate all
indirect, recurrent, or stimulation-recruitment mechanisms.

## Evidence extraction

### S1 — language stages and sleep-acquired CCSR

- **Cohort/coverage:** 37 children and young adults with focal epilepsy, ages 5–20;
  3,401 non-epileptic sites. Clinical subdural coverage; 27 had individual DWI.
- **Sites and condition:** 488 temporal sites (STG, MTG, ITG; 314 adjacent pairs)
  and 1,581 extratemporal sites (885 pairs). Biphasic 5 mA, 0.3 ms pulses at 1 Hz
  for 40 s **during sleep**. Naming and CCSR sessions were less than 48 h apart.
  Recording sites within 1.5 cm of stimulation were excluded.
- **Readouts:** auditory-naming high-gamma 70–110 Hz classified sites into speech
  production, sentence hearing, and response preparation. Early CCSR: 20–60 Hz,
  10–50 ms; late CCSR: 2–20 Hz, 50–300 ms. Strength was the significant local
  time-frequency peak amplitude change relative to prestimulus baseline.
- **Results:** response-preparation extratemporal sites had approximately twice
  stronger effective connectivity from temporal sites serving the same stage than
  from temporal sites serving listening or overt response. This is a comparison
  of functional site classes, **not** an A→B/B→A ratio. Table 1 assigns roughly
  two-thirds of temporal→extratemporal pathways to AF, versus up to half of
  extratemporal→temporal pathways. These are tract-composition fractions with
  different direction-conditioned denominators, not AF traffic fractions.
- **Lateralization:** no detected hemisphere difference for early connectivity;
  late temporal→extratemporal connectivity had a leftward model estimate of
  18.0–32.5%. Hemisphere asymmetry is not endpoint-direction asymmetry.
- **Locations:** Methods, “Quantification of direct inter-lobar effective
  connectivity using early CCSRs”; Results, Table 1 and Fig. 6; Discussion,
  “Methodological considerations.” The authors explicitly warn that a connection
  demonstrated by CCSR need not be used during the task.
- **Inference limit:** do not turn separately acquired sleep stimulation and naming
  engagement into a measured task-versus-rest change in evoked direction.

### S2 — posterior visual evoked-response asymmetry

- **Cohort/coverage:** 22 focal-epilepsy patients, ages 10–19. Clinically placed
  subdural electrodes; pathological/artifactual sites excluded.
- **Sites and condition:** medial-occipital (lingual/cuneus), lateral-occipital,
  and fusiform stimulation; responses within posterior regions and at a separately
  stimulation-defined frontal eye field (FEF). Forty biphasic pulses, 5 mA,
  0.3 ms, 1 Hz, during a **postoperative rest period**. This is not a visual-task
  stimulation experiment or a spontaneous resting-state recording. Sites within
  1 cm of stimulation were excluded.
- **Readout/latency:** 30–40 Hz CCSR in 10–50 ms, relative to a −150 to −100 ms
  baseline. Mean lateral-occipital→FEF peak latency: 26.17 ± 12.86 ms.
- **Result:** feedforward lower→higher visual-region direction had mixed-model
  coefficient **0.197** (95% CI 0.117–0.278; t=4.810; p<0.001). The paper describes
  this as 19.7% larger CCSR. The dependent variable is baseline-relative spectral
  amplitude change; this coefficient is **not** 19.7 percentage points of traffic
  probability, nor evidence for a 60/40 prior. No such conversion is justified.
- **Locations:** Methods §§2.1, 2.4, 2.6; Table 2; Results §§3.1–3.3; Discussion
  §§4.1–4.3. Proposed pathways to FEF include SLF II/III and a fronto-occipital
  pathway, but the study does not isolate the viewer's individual bundles.
- **Inference limit:** hierarchy-level, pooled regional evoked asymmetry cannot be
  assigned wholesale to ILF, VOF, IFOF, or either SLF subdivision. FEF recording
  does not provide a matched reciprocal FEF-stimulation comparison here.

### S3 — the verified 2026, 125-patient naming study

- **Cohort/coverage:** 125 focal-epilepsy surgery patients, ages 5–49; 61 female;
  119 auditory, 108 picture, 102 both. 9,526 artifact-free nonepileptic sites.
  Group analysis used 66 cortical ROIs and 13 tract templates, not this viewer's
  Jülich shells and eight sampled bundles.
- **Tasks/readout:** up to 100 spoken questions answered with nouns; up to 60
  grayscale pictures named aloud. Auditory response time begins at question
  offset; picture response time begins at image onset. High-gamma 70–110 Hz,
  5-ms bins; coactivation requires significant simultaneous augmentation for at
  least five consecutive bins (25 ms) at two atlas-connected ROIs. Pair intensity
  is the square root of the product of their percentage amplitude changes.
- **Stimulation:** separate functional mapping with **50-Hz pulse trains** at
  adjacent electrodes while patients answered questions or named objects;
  reproducible symptoms were verified by blinded investigators. This is not the
  single-pulse CCSR protocol of S1/S2. Current, pulse width, and train duration
  are referred to earlier methods rather than specified in the retrieved main
  text; they are not inferred here.
- **Result:** rapid auditory naming accompanied left AF/perisylvian coactivation
  and right rostral MFG attenuation; rapid picture naming accompanied bilateral
  ILF/occipitotemporal coactivation. Coactivation correlated spatially with
  stimulation-induced aphasia or visual phenomena. Example peak associations:
  receptive aphasia 40 ms before auditory stimulus offset; expressive aphasia
  130 ms after offset; visual distortion 285 ms after picture onset.
- **Locations:** Methods, “Functional Coactivation and Co-Deactivation Networks,”
  “Stimulation”; Results and Figs. 1–5; Discussion.
- **Inference limit:** these are task-aligned times, not axonal conduction
  latencies. Coactivation has no preferred direction. The symptom probability is
  a stimulation outcome, not the chance of an event travelling along ILF or AF.
  Late bifrontal coactivation may be a consequence, not a cause, of delayed naming.

### S4 — separate 127-patient task-direction analysis

- **Cohort:** 127 patients, ages 5–49; 61 female; 121 auditory, 110 visual, 104
  both. 9,526 nonepileptic sites; group means across 66 ROIs, each sampled in at
  least seven patients. Direction was **not analyzed within individual patients**.
- **Estimator:** 70–110 Hz high-gamma transitions binarized in 5-ms bins;
  delayed TE over 100-ms windows, selecting the maximum at delays of 5, 10, or
  15 ms. A 5-ms sliding increment and Gaussian weighting produce the display.
  TE>0 plus a tractography-defined direct streamline establishes a reported edge.
  Accelerating/decelerating means predicted amplitude increases/decreases, not
  excitatory/inhibitory axon identity or animation speed.
- **Stimulation:** 50-Hz adjacent-contact symptom mapping during questions/object
  naming evaluates functional relevance; it does not generate the TE direction
  estimates. Not all electrodes were stimulated. Detailed pulse settings are
  delegated to earlier publications in the main text.
- **Directional examples:** left pSTG→inferior precentral flow via AF peaks at
  55 ms after auditory onset; reverse flow appears around 180 ms. Left
  lateral-occipital→posterior-fusiform flow via ILF peaks at 65 ms after picture
  onset; reverse flow peaks around 400 ms. Subsequent interactions are commonly
  bidirectional. These are task-locked estimator results, **not** CCEP peak
  latencies, event probabilities, or a constant bundle bias.
- **Results/limits:** reported symptom correlations span rho 0.54–0.81. Response-
  time associations use a sustained 50-ms significance criterion rather than a
  conventional correction across all 500 bins. The authors explicitly state that
  propagation through particular white-matter tracts was not directly measured;
  gray-matter, intermediate-region, and subcortical alternatives were not fully
  modeled. A structural mask and short estimator delays do not prove unique paths.
- **Locations:** Methods §§2.6–2.13; Results §§3.3–3.9, Figs. 2 and 6;
  Discussion §4.5. Supports named, time-dependent hypotheses for future work,
  but does not calibrate the viewer's events.

### S5 — why “rest” cannot be one universal direction state

- **Cohort/sites:** eight eligible patients of 13 recruited, ages 22–45 (Table 1).
  Seven frontal stimulation sites in six patients; five parietal sites in three;
  one patient contributed to both groups. Frontal sites included MFG, frontal
  pole, precentral/premotor and SMA; parietal sites included angular,
  supramarginal, precuneus and postcentral cortex. Recording nodes were grouped
  as frontal, parietal, and temporo-occipital, not tract-specific endpoints.
- **Conditions:** wakefulness, light sleep, slow-wave sleep, REM; 1-Hz alternating
  polarity, 0.3-ms pulses, 4–12 mA; typically 200–400 pulses per stage. Sites were
  selected partly for discrete daytime CCEPs. Equal eligible trial counts were
  used across stages within patient.
- **Readout:** 80–150 Hz CCSR increases at 100–550 ms; ERC (multivariate
  Granger-based analysis) among responding sites. Values normalized to each
  patient's maximum. This is a later network response, not early 10–50-ms CCSR.
- **Results:** frontal stimulation produced greater frontal→parietal ERC during
  slow-wave sleep than wakefulness at 245–280 ms. REM had lower within-frontal
  propagation than wakefulness at 110–140 ms. Higher within-parietal propagation
  at 435–460 ms was relative to **light sleep**, not a significant increase
  relative to wakefulness. Parietal stimulation showed no significant slow-wave
  versus wakefulness difference.
- **Locations:** Methods, Table 1, Results/Figs. 3–4, Discussion. These are
  condition contrasts in evoked network interactions; they supply neither an
  SLF-subdivision prior nor a spontaneous resting-traffic baseline.

### S6 — reciprocal CCEP does not imply equal traffic

Eight epilepsy patients, ages 13–42, received single pulses at anterior language
sites (eight patients), posterior language sites (four), or face motor sites (two),
without a task. Anterior stimulation elicited temporoparietal CCEPs in 7/8;
posterior stimulation elicited anterior CCEPs in 3/4, described as less well
defined. The abstract supports reciprocal language-network responses with possible
AF **and/or cortico-subcortico-cortical** mediation. Unequal tested samples and
response-detection fractions are not an estimate of 7:3 traffic or 50/50 anatomy.
Pulse intensity/width and numerical response latencies remain **not verified**
from this abstract-only source.

## Mapping to the viewer: hypotheses, not new endpoints

The source ROI systems are not a validated crosswalk to Jülich-Brain v3.0.3.
STG/pSTG/pMTG are not interchangeable with `region.sts2`; pars opercularis is not
identical to `region.broca` (Broca 44); FEF is not automatically `region.dlpfc`,
`region.sfg8`, or `region.pcg6`. Medial/lateral occipital and fusiform source ROIs
only broadly resemble the displayed V1/V2, LOC-a/LOC-p, and FG1–4 families.
No source-to-viewer parcel overlap analysis was performed.

A/B below are the **current geometric orientation labels**, not validated cortical
terminations. For seven bundles A is the minimum-y raw endpoint; VOF A is the
maximum-z endpoint. L/R probabilities remain 0.5/0.5 in every row.

| Bundle | Current A → B description | Relevant evidence and current-entity boundary | Recommendation |
|---|---|---|---|
| `tract.ilf` | Posterior occipital/occipitotemporal → anterior temporal | S3 supports bilateral picture-naming coactivation; S4 reports task-stage occipital↔posterior-fusiform TE. Posterior fusiform is not the metadata's anterior-temporal endpoint. Current inspector proximity is to `region.gap-tp` and `region.sts2`, not a certified LOC↔FG pair. | Retain 50/50 both sides. Candidate future picture-naming hypothesis requires endpoint/sub-bundle validation. |
| `tract.ifof` | Posterior occipital/temporal/parietal → prefrontal | S3/S4 include IFOF engagement, not a constant reciprocal ratio. Inspector proximity to `region.fp1`, `region.gap-fi`, `region.v1`, `region.v2` does not validate the papers' ROI pairs or a FEF path. | Retain 50/50 both sides. No qualifying default or task probability. |
| `tract.slf1` | Posterior superior parietal → dorsal/medial frontal | S5's frontal/parietal state effects do not isolate SLF I. Proximity to `region.presma`, `region.spl5m`, `region.gap-fi`, `region.gap-fo` supplies no physiological direction. | Retain 50/50 both sides; do not paint sleep ERC onto this bundle. |
| `tract.slf2` | Posterior parietal → dorsolateral frontal | S2 proposes SLF II/III among possible FEF routes; S3/S4's SLF findings do not resolve viewer subdivisions. Qualified proximity is to `region.pfm`, `region.gap-fi`, `region.gap-fii`, **not** DLPFC. | Retain 50/50 both sides; no FEF→parietal or reverse prior inferred. |
| `tract.slf3` | Posterior inferior parietal/opercular → inferior frontal/opercular | Same unresolved SLF evidence; current `region.pf`, `region.op6`, `region.broca` links are proximity only. AF language findings cannot be reassigned to SLF III because Broca 44 appears nearby. | Retain 50/50 both sides. |
| `tract.vof` | Dorsal occipital/visual → ventral occipitotemporal/visual | S2's visual hierarchy is not a dorsal↔ventral VOF experiment. Current proximity to `region.loa`, `region.lop`, `region.v3a`, `region.v3d` does not identify a reciprocal VOF route. | Retain 50/50 both sides; no qualifying VOF-specific prior in corpus. |
| `tract.af` | Posterior temporal → frontal | S1/S6 support reciprocal effective responses; S3 supports left auditory-naming coactivation; S4 supplies left time-dependent directional hypotheses. Inspector links only `region.broca` and `region.gap-fi`; no certified pSTG/pMTG endpoint pair. | Retain 50/50 both sides. Left auditory-naming stages merit future study, not a fixed 2/3 forward prior or right-side extrapolation. |
| `tract.mdlf` | Posterior parietal/occipital → superior/anterior temporal | S3 mentions middle longitudinal engagement around auditory stimulus offset, without reciprocal probability. Current inspector proximity only to `region.spl7a` is insufficient to map temporal partners. | Retain 50/50 both sides; no qualifying MdLF-specific prior in corpus. |

Mapping sources: `public/data/tract_activity.json`, `public/data/entities.json`, and
[`TRACT_REGION_MAPPING.md`](TRACT_REGION_MAPPING.md). The inspector's conservative
bilateral proximity screen and the separate runtime categorical endpoint filter
are neither synaptic maps nor direction estimators. The HCP-1065 2009a fibres and
2009c Jülich shells retain their documented common-RAS, mixed-release distinction;
this research introduces no warp, fitting, or new runtime transform. Failure of a
proximity screen is not evidence that an anatomical connection is absent.

## Why no numerical prior follows

1. **Wrong denominator:** S1's fraction of identified pathways belonging to AF,
   conditional on direction, is not the fraction of AF events in that direction.
2. **Wrong unit:** S2's response-amplitude coefficient, S4's TE, and S5's normalized
   ERC are not event counts. Normalizing two strengths to sum to one would create
   a new display mapping, not recover a measured biological probability.
3. **No direction in the statistic:** S3's simultaneous coactivation intensity is
   unchanged when its endpoints are exchanged.
4. **Wrong state:** sleep-acquired SPES, postoperative rest with stimulation, and
   active naming are not interchangeable with natural awake rest. A prestimulus
   baseline used for spectral normalization is not a baseline traffic prior.
5. **Wrong spatial support:** regional effects, template trajectories, clinical
   electrodes, and sampled viewer contours do not identify the same population.
6. **Time dependence:** S4's early forward and later reciprocal stages contradict
   treating task identity alone as a constant whole-bundle direction parameter.

## Evidence limits and future gate

All cohorts are clinical epilepsy samples with nonrandom electrode placement.
Excluding seizure-onset, lesion, and interictal-spike sites does not remove remote
network effects, medication effects, developmental variation, or referral bias.
Language-dominance exclusions and left-handedness/epileptogenicity effects limit
lateralization claims. Coverage, electrode orientation, stimulation current,
reference montage, distance, response threshold, and baseline affect measured
responses. Group atlases can combine sites not simultaneously sampled in one
person; cross-study cohort overlap remains unaudited. A significant difference is
not a population-wide ratio; a nonsignificant difference is not proof of symmetry.

**Default/resting:** no defensible calibrated default direction state emerges from
this corpus. Keep the honest illustrative fallback rather than adding a “resting”
label to stimulation-derived values.

**Named conditions:** a future lesson could distinguish “auditory naming—early
sensory processing,” “auditory naming—response preparation,” and “picture naming—
early visual processing versus later reciprocal interaction.” S3 supports network
engagement; S4 supports estimated direction and stage; S1/S2 support evoked
communication. These are different claims and must remain separately disclosed.
No numerical task prior, new activity episode, or lesson is approved here.

Before any implementation:

- Specify the estimand: evoked-response asymmetry, task-conditioned statistical
  interaction, or explicitly illustrative event weighting—not axon proportions.
- Retrieve and version source data/code and supplements; audit cohort overlap,
  data-use/license terms, estimator choices, uncertainty, nulls, and sensitivity.
  Reproduce the relevant direction-by-time/condition result rather than reading
  arrow weights off a figure. Prefer within-patient reciprocal comparisons with
  matched stimulation/coverage for an evoked model.
- Validate hemisphere, cortical ROI, tract subdivision, and contour mapping
  offline. Keep unmapped or unsupported bundles at the explicit fallback. Do not
  infer missing endpoints or add a second runtime transform.
- If converting measured strength to display-event probability, publish the exact
  conversion and its arbitrary/calibrated status. A normalized TE weight remains
  a model choice unless validated against the chosen event estimand.
- Obtain separate approved model/version and implementation Bead; reconcile any
  affected invariant first. Change metadata, provenance, disclosure, tests, and
  browser validation together. Preserve seed/reproducibility, complete snapshot
  ownership, accessibility, and zero-mean short-range-contour activity.

**Confidence:** high that the cited 125-patient lead is real and that the reviewed
metrics do not directly estimate current event probabilities; moderate for
transporting qualitative task-stage patterns beyond their source cohorts; no
claim of exhaustive literature coverage or readiness for a physiological model.

## Documentation and reuse boundary

This record supplements, rather than replaces, current model traceability. No
existing plan is superseded. README, architecture, lesson validation, data
licenses, software notices, and runtime metadata remain unchanged because no
capability, geometry, teaching sequence, shipped dependency, dataset, or model
parameter changed. Only bibliographic metadata, brief attributed terms, and an
original synthesis are published here; source figures, full texts, videos, code,
and datasets are not redistributed. Citation/access alone grants no asset or
model-data reuse permission; verify terms before any later import.
