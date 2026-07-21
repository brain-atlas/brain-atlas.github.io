# Association-impulse direction evidence synthesis

Date: 2026-07-21
Bead: `brain-atlas-yum.2`
Specification: `.pi/plans/brain-atlas-yum.2-association-impulse-model.md`

## Question

Can the eight displayed human association bundles receive defensible quantitative
source→endpoint direction probabilities, and how should an inhibited stochastic
code-event model represent evidence gaps?

## Method

Searched tractography-method limitations and tract-specific human anatomy/review
literature for ILF, IFOF, SLF I–III, VOF, arcuate, and MdLF. Fetched every relied-on
PMC or Crossref record. Diffusion streamline order/count was excluded as polarity;
non-human reciprocity was accepted only as qualitative context, not a numerical
human ratio.

### Reproducible query record

Queries were run with `agnt web-search` in this recorded order:

1. tractography inability to infer afferent/efferent polarity;
2. reciprocal/bidirectional evidence across all eight association bundles;
3. ILF direction anatomy;
4. IFOF direction anatomy;
5. SLF I–III reciprocal frontoparietal anatomy;
6. VOF connectivity and tracer evidence;
7. arcuate direction anatomy;
8. MdLF reciprocal anatomy;
9. human postmortem association-tract directional axon counts;
10. human postmortem anterograde/retrograde tracing;
11. human white-matter electron microscopy and afferent/efferent identity;
12. polarized-light orientation versus axonal polarity;
13. fixed-human DiI directionality;
14. microscopic ILF direction counts;
15. microscopic SLF afferent/efferent counts; and
16. human microscopic source→target percentage counts.

Relied-on records were verified with `agnt web-fetch`; `sources.tsv` records the
URLs, verification status, and use. Raw fetched page content and search-result pages
are not redistributed in the repository. An empty search-result fetch for an SLF
probability-map page was rejected rather than treated as evidence.

## Result

- Diffusion MRI cannot discriminate afferent from efferent connections.
- ILF literature explicitly describes bidirectionality but gives no quantitative
  population direction ratio.
- The other tract sources establish broad connectivity and substantial anatomical
  uncertainty but no transferable quantitative source→endpoint ratios.
- A targeted human microscopy search found direct/estimated axon counts but no
  bundle-specific polarity percentages: electron microscopy counts cross-sections,
  3D polarized-light imaging maps orientation axes, and fixed-tissue DiI diffuses
  both anterogradely and retrogradely and has limited reach.
- Version 1 therefore uses the approved, explicitly labelled 50/50 prior for all
  eight tracts and both hemispheres.
- Direction is sampled per event so a tractography streamline is not assigned a
  fake permanent axonal polarity.

`sources.tsv` is the durable source registry; the numbered list above preserves the
search method used to identify the records.
