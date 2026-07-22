# Scenario: Compose an instructional 3D scene

## Prompt

Revise the Brain Atlas reference lesson cameras so each 3D scene is visually strong and makes its teaching target easy to follow. The cortical shell, selected regions, named tracts, superficial white matter, pathway activity, and bilateral structures may all be visible. Explain how you will choose camera target, angle, zoom, emphasis, and motion for the title/whole-brain overview, an LGN relay scene, a V1 arrival scene, and a ventral-stream scene.

## Observed weak baseline

The pre-change workflow encouraged signaling and deliberate composition but did not provide a camera-composition method. In the reference lesson this produced repeated failures:

- uniform camera-distance scaling framed the cortical shell rather than the taught anatomy;
- world-space bounding-box targets still rendered relevant geometry off-center in screen space;
- cortex and broad SWM occupied the frame while highlighted regions and tracts remained small;
- exact profile/posterior views stacked bilateral geometry or buried tract endpoints in region shells;
- a hyper-close LGN crop lost source/destination context and made ongoing activity look frozen;
- V1-only emphasis dimmed optic-radiation geometry, endpoint caps, and tracers even while playback continued;
- relevant tract endpoints clipped at the top while a large lower area remained empty; and
- a single aspect-ratio contact sheet failed to reveal awkward framing in the actual lesson shell.

## Expected with skill

The agent defines teaching versus context geometry, frames projected relevant bounds rather than the cortex, chooses a narrative visual path using thirds/negative space, preserves source and destination when motion teaches direction, uses an oblique angle to separate depth, verifies selection does not dim the teaching signal, and reviews real wide/compact lesson-shell captures. It cites the checked-in early-vision lesson as a reference implementation without treating its provisional broad SWM layer as final publication quality.

## Assertions

- Separates teaching geometry from context geometry before choosing a camera.
- Excludes cortex and broad SWM from fit calculations unless they are the teaching target.
- Treats the complete cortical surface as teaching geometry in the title/whole-brain overview and centers it deliberately.
- Uses projected screen composition, safe margins, and intentional thirds placement rather than world-center targeting alone.
- Keeps source, path, and destination visible when animation teaches directed travel.
- Checks emphasis/material state as well as playback state when motion looks absent.
- Does not invent accumulation, thinning, segmented timing, rate changes, or other activity behavior to improve the shot.
- Prefers a slight oblique rotation before hiding a symmetric duplicate.
- Verifies wide, compact, reduced-motion, and actual lesson-shell framing.
- References `src/lessons/retina-to-v1.md` as an example and identifies broad SWM as Draft/provisional.
