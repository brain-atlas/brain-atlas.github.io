# Future features (researched, not yet built)

This file is the canonical home for researched ideas that are not yet committed
work. Create a Bead when an idea becomes actionable; store any approved execution
plan in `.pi/plans/<bead-id>-<topic>.md`. Keep `README.md` focused on current
capabilities and public status.

The first two directions include feasibility verdicts and sources. They are
**parallel sub-projects**, not small additions.

---

## 1. Flattened-cortex view mode (pycortex / Gallant-lab style)

Add an alternate "unfolded/flat" view of cortex, like the 2D flatmaps used for fMRI
visualization, with a morph between the 3D surface and the flat layout.

**Verdict: feasible and worthwhile — but as a *separate surface-based scene*, not a
morph of our current volumetric region meshes.**

- **How the flattening works:** pycortex orchestrates FreeSurfer — reconstruct the
  cortical surface, inflate it (spring energy preserving inter-vertex distances),
  cut it (medial-wall + relaxation incisions along the calcarine etc.), then flatten
  with `mris_flatten` (metric-distortion minimization / spring relaxation, *not*
  conformal). Each vertex gets a 2D coord sharing the surface's vertex indexing, so
  any per-vertex value renders identically on folded / inflated / flat.
- **You don't have to hand-cut:** pycortex/FreeSurfer ship **pre-flattened
  `fsaverage` surfaces**. The inflated↔flat morph is a one-uniform GPU morph-target,
  and pycortex's own viewer is Three.js — so the mechanic is proven and low-effort.
- **The real blocker (surface vs volume):** our regions are *volumetric* Jülich
  isosurfaces with no vertex correspondence to a cortical surface — there is nothing
  to morph them *to*. The fix is how pycortex puts volume data on surfaces: **offline,
  ribbon-sample the Jülich MNI volume onto a standard surface's vertices → a
  per-vertex region-label attribute**, which colours and morphs the flatmap correctly.
- **Honest limits:** cortex-only (subcortical nuclei, LGN, and *all* tracts cannot
  appear on a flatmap); areal distortion is large and non-uniform (needs a "not to
  scale" note / distortion overlay).
- **Recommended shape:** a parallel scene using fsLR-32k or fsaverage surfaces with
  three precomputed position sets (folded / inflated / flat) + per-vertex atlas
  labels from ribbon sampling; blend inflated↔flat with a shader uniform. ~a few
  days for the cortical part; the real work is the offline atlas→surface resampling
  and the distortion legend.

Sources: pycortex (Gao, Huth, Lescroart, Gallant 2015, *Front. Neuroinformatics*,
<https://www.ncbi.nlm.nih.gov/pmc/articles/PMC4586273/>); pycortex segmentation/
flattening guide (<https://gallantlab.org/pycortex/segmentation_guide.html>);
Fischl, Sereno, Dale 1999 (inflation/flatten energy,
<https://www.nmr.mgh.harvard.edu/~fischl/reprints/recon2.pdf>); Ju et al. 2005
(flattening-method comparison, <https://surfer.nmr.mgh.harvard.edu/ftp/articles/ju_l_28p869_2005.pdf>).

---

## 2. Drive the viewer from real fMRI (region activity + tract "transmission")

Map a whole-brain fMRI into our space and use it to drive region activity and tract
flow.

**Verdict: region *glow* from fMRI is honest and easy; per-region "firing rate" and
directed per-tract "transmission rate" are NOT recoverable from fMRI — only as
clearly-labelled approximations.**

- **Routine & real:** normalize any whole-brain fMRI to MNI152 (fMRIPrep) →
  parcel-average into Jülich regions → per-region time series → map to **region
  brightness** as *"relative BOLD activity"* (indirect, ~seconds resolution).
- **BOLD → firing rate: no.** BOLD is slow (~5 s HRF) and reflects synaptic input
  (LFP), not spiking (Logothetis 2008). Deconvolution gives a low-pass proxy, never
  Hz. Do not label it "firing rate."
- **Directed per-tract transmission: the weakest link.** fMRI directionality is
  known-unreliable (Smith et al. 2011 — lag methods "perform very poorly"). Best
  honest move: a **lagged cross-correlation of the two endpoint regions, gated on a
  real structural tract existing** — a *stylized functional-coupling* animation, not
  measured axonal flow.
- **Cleaner path to genuine firing + directed transmission:** run a **connectome-
  based whole-brain simulation** — **The Virtual Brain** or **neurolib** — on the
  HCP-1065 connectome. It produces biophysically-grounded regional rates and *real
  directed* inter-region transmission with conduction delays by construction; can be
  fit loosely to a subject's fMRI and converted to BOLD to validate. Simulated, not
  measured — but this is the principled version of our current synthetic spike model.
- **UI honesty rule:** region glow = BOLD-derived activity (indirect); any tract flow
  driven this way = stylized coupling heuristic, *not* measured transmission or
  direction. Never imply sub-second dynamics.

Sources: fMRIPrep (<https://fmriprep.org/en/stable/outputs.html>); Logothetis 2008,
*Nature* (<https://www.nature.com/articles/nature06976>); Smith et al. 2011,
*NeuroImage* network-modelling (<https://pubmed.ncbi.nlm.nih.gov/20817103/>);
Buxton hemodynamic model (<https://fmri.ucsd.edu/tliu/pdf/buxton04_model.pdf>);
The Virtual Brain (<https://www.thevirtualbrain.org/>); neurolib
(<https://github.com/neurolib-dev/neurolib>).

---

## Candidate backlog

These ideas need focused research and a Bead before implementation:

- Replace the schematic anterior pathway with licensed optic-nerve, chiasm,
  optic-tract, and eye meshes. Keep any approximation clearly labelled.
- Add a schematic six-lamina LGN inset. Standard-space data does not resolve the
  laminae, so the view must remain explicitly demonstrative.
- Add retinotopic eye inputs and labels that track visual-field information before
  and after the chiasm.
- Map structural tracts to endpoint areas for bidirectional browsing. Do not add
  directional animation to undirected association bundles.
- Add a lesion tool that clips a tract and explains the expected visual-field
  deficit.

Performance and design opportunities found during the 2026 architecture review
are recorded in [`ARCHITECTURE.md`](ARCHITECTURE.md#high-value-future-opportunities).
