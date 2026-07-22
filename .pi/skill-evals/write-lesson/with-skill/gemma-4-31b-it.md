To revise the reference lesson cameras, I will shift from "bounding-box centering" to "instructional photography." The goal is to treat the 3D viewport as a composed image where the camera serves the inferential job, not the geometry's center of mass.

### Core Composition Strategy
For every scene, I will first define the **Teaching Geometry** (the structures and paths the learner must inspect) and the **Context Geometry** (the cortical shell, SWM cloud, or landmarks used only for orientation).

**Framing Rule:** I will calculate fit-bounds based solely on the Teaching Geometry. The cortical shell and broad SWM cloud will be allowed to crop naturally at the edges of the frame unless they are the primary teaching target. This prevents the "small target in a big shell" problem.

---

### Scene-by-Scene Composition Plan

#### 1. Title / Whole-Brain Overview
*   **Learning Job:** Orient the learner to the global pathway from eye to cortex.
*   **Teaching Geometry:** Complete cortical surface + Retina $\rightarrow$ LGN $\rightarrow$ V1 pathway.
*   **Composition:**
    *   **Target/Angle:** Center the complete cortical surface. Use a standard RAS orientation that preserves the visual "sentence" of the primary pathway.
    *   **Zoom:** Fit the entire shell with 10% breathing room.
    *   **Visual Narrative:** The eye-to-V1 path should act as the primary diagonal axis of the composition.
    *   **Verification:** Ensure the pathway is legible across both wide and compact aspect ratios without clipping the eyes or the occipital pole.

#### 2. LGN Relay Scene
*   **Learning Job:** Trace the transition from the LGN to the optic radiations.
*   **Teaching Geometry:** LGN, the optic radiation tracts, and V1 (destination).
*   **Composition:**
    *   **Target/Angle:** Slight oblique rotation. Avoid a direct profile view to prevent the LGN from being "buried" inside the translucent cortical shell.
    *   **Zoom:** Fit the "visual sentence" (Source: LGN $\rightarrow$ Path: Radiation $\rightarrow$ Destination: V1).
    *   **Visual Narrative:** Place the LGN near a thirds intersection; let the radiating fibers lead the eye toward V1.
    *   **Motion/Emphasis:** Verify that the selection of the optic radiation does not dim the active tracers. Ensure the crop is wide enough that motion does not look "frozen" due to a lack of visible start/end points.
    *   **Honesty Check:** Maintain the implemented Poisson-thinning model; no artificial "relay pauses" or "accumulation" at the LGN.

#### 3. V1 Arrival Scene
*   **Learning Job:** Localize the terminus of the optic radiations within the primary visual cortex.
*   **Teaching Geometry:** Optic radiation endpoint caps and the V1 region shell.
*   **Composition:**
    *   **Target/Angle:** Oblique angle to separate the endpoint caps from the V1 surface in depth, preventing "stacking" where the shell hides the arrival point.
    *   **Zoom:** Tight focus on V1. Frame the region such that the highest point of the arrival geometry is 8–12% below the top screen edge to prevent clipping.
    *   **Visual Narrative:** The focus is the *impact*—the transition from fiber to region.
    *   **Motion/Emphasis:** Ensure endpoint caps and arriving tracers have high contrast against the V1 material.

#### 4. Ventral-Stream Scene
*   **Learning Job:** Distinguish the spatial trajectory of the "What" pathway (V1 $\rightarrow$ V2 $\rightarrow$ V4 $\rightarrow$ IT).
*   **Teaching Geometry:** The specific sequence of highlighted regions and the named tracts connecting them.
*   **Context Geometry:** The cortical shell and the SWM cloud (noted as **Draft/Provisional**).
*   **Composition:**
    *   **Target/Angle:** Oblique rotation to separate the ventral flow from the medial wall and separate overlapping tract bundles.
    *   **Zoom:** Fit the *bounding box of the highlighted regions*, not the whole brain. The cortex will crop naturally.
    *   **Visual Narrative:** Create a clear directional flow from posterior (V1) to anterior (IT).
    *   **Motion/Emphasis:** Use a stable, settled shot. Any auto-rotation will be a secondary, reduced-motion alternative to the primary authored view.

---

### Verification & Validation Workflow

To prevent the regressions noted in the baseline, I will apply the following checks before closing the task:

1.  **Projected Bounds Review:** I will not trust world-space coordinates. I will capture the scene in the **actual lesson shell** (Wide and Compact) to verify that the teaching geometry is centered in *screen space*.
2.  **Selection Audit:** I will explicitly check that `selection` or `emphasis` states do not accidentally dim the `playback` signal (tracers/events).
3.  **The "Visual Sentence" Test:** For every animated scene, I will verify that the source, the path, and the destination are all in the frame simultaneously.
4.  **SWM Boundary:** I will ensure that the broad SWM layer is treated as a background texture and does not interfere with the framing or contrast of the primary teaching tracts.
5.  **Reduced Motion:** I will author a settled, non-rotating version of every shot to ensure comprehension does not depend on catching a transient animation.