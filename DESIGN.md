---
name: Brain Atlas
description: A precise, immersive, evidence-led interface for exploring and learning the human visual system.
colors:
  anatomical-night: "#081019"
  deep-night: "#050a10"
  panel-night: "#071019"
  select-night: "#091622"
  soft-surface: "rgba(17, 31, 47, 0.78)"
  stage-surface: "rgba(6, 14, 23, 0.82)"
  cortical-white: "#edf4fb"
  quiet-blue: "#9db0c4"
  dim-blue: "#6f8296"
  neural-cyan: "#43dccb"
  neural-cyan-soft: "rgba(67, 220, 203, 0.13)"
  signal-amber: "#ffb060"
  activity-violet: "#c45cff"
  caution-coral: "#ff8b83"
  structural-line: "rgba(148, 181, 215, 0.17)"
  structural-line-strong: "rgba(148, 181, 215, 0.34)"
  control-surface: "rgba(19, 34, 50, 0.78)"
  control-surface-hover: "rgba(25, 46, 63, 0.92)"
typography:
  display:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(2.5rem, 5vw, 5.3rem)"
    fontWeight: 700
    lineHeight: 0.96
    letterSpacing: "-0.055em"
  headline:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "clamp(1.7rem, 3vw, 2.65rem)"
    fontWeight: 700
    lineHeight: 1.08
    letterSpacing: "-0.035em"
  title:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1.2rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  body-small:
    fontFamily: "ui-sans-serif, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
    fontSize: "0.78rem"
    fontWeight: 400
    lineHeight: 1.55
  field:
    fontFamily: "ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
    fontSize: "0.76rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
    fontSize: "0.68rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "0.1em"
  micro-label:
    fontFamily: "ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
    fontSize: "0.61rem"
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: "0.15em"
  status-chip:
    fontFamily: "ui-monospace, 'SFMono-Regular', Consolas, 'Liberation Mono', monospace"
    fontSize: "0.57rem"
    fontWeight: 400
    lineHeight: 1.4
rounded:
  label: "2px"
  field: "3px"
  control: "4px"
  card: "6px"
  dialog: "8px"
  sheet: "16px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "28px"
components:
  button-default:
    backgroundColor: "{colors.control-surface}"
    textColor: "{colors.quiet-blue}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "44px"
  button-default-hover:
    backgroundColor: "{colors.control-surface-hover}"
    textColor: "{colors.cortical-white}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "44px"
  button-accent:
    backgroundColor: "{colors.neural-cyan}"
    textColor: "{colors.deep-night}"
    rounded: "{rounded.control}"
    padding: "8px 12px"
    height: "44px"
  card-lesson:
    backgroundColor: "{colors.soft-surface}"
    textColor: "{colors.cortical-white}"
    rounded: "{rounded.card}"
    padding: "16px"
  field-dark:
    backgroundColor: "{colors.deep-night}"
    textColor: "{colors.cortical-white}"
    rounded: "{rounded.control}"
    padding: "12px"
  chip-status:
    textColor: "{colors.quiet-blue}"
    rounded: "{rounded.pill}"
    padding: "4px 7px"
  nav-brand:
    textColor: "{colors.cortical-white}"
    height: "44px"
  panel-stage:
    backgroundColor: "{colors.stage-surface}"
    textColor: "{colors.cortical-white}"
    padding: "12px 16px"
---

# Design System: Brain Atlas

## Overview

**Creative North Star: "The Luminous Anatomy Lab"**

Brain Atlas is a precise, immersive, evidence-led workspace. Anatomical structure remains the primary visual artifact; the interface surrounds it with dark, quiet instrumentation and clear editorial guidance. Luminous signals indicate state and meaning rather than supplying decoration.

The system balances two modes without changing identity: a focused scientific console for operating the atlas and a spacious reading surface for guided lessons. Layered glass, fine borders, and structural shadows establish depth while restrained typography and compact controls preserve attention for anatomy and evidence. It explicitly rejects both the generic bright SaaS dashboard and decorative neon science-fiction spectacle.

**Key Characteristics:**
- Anatomical Night surfaces frame the rendered model without competing with it.
- Neural Cyan marks focus, selection, and primary action with disciplined rarity.
- Editorial lesson typography pairs with compact monospace instrumentation.
- Controls look compact but retain at least 44 by 44 CSS-pixel interaction targets.
- Scientific and rendering colors remain owned by data and renderer metadata, not the interface theme.

## Colors

The palette pairs near-black blue surfaces with cool pale text and a small set of luminous, semantic signals.

### Primary
- **Neural Cyan** (`neural-cyan`): Marks keyboard focus, active states, primary actions, links, and selected controls. Its brightness makes it a scarce signal, not a field color.
- **Neural Cyan Veil** (`neural-cyan-soft`): Adds a low-intensity selected or emphasized surface behind text and controls.

### Secondary
- **Activity Violet** (`activity-violet`): Distinguishes activity-model status from geometry and interface selection.
- **Signal Amber** (`signal-amber`): Marks lesson lifecycle and cautionary status without implying failure.
- **Caution Coral** (`caution-coral`): Identifies destructive confirmation, invalid input, and recovery states.

### Neutral
- **Anatomical Night** (`anatomical-night`): The principal workspace field around the atlas.
- **Deep Night** (`deep-night`): The deepest page, code, and input surface.
- **Panel Night** (`panel-night`): Opaque drawers, dialogs, and source panels.
- **Select Night** (`select-night`): Native select controls and focused data-entry surfaces.
- **Soft Surface** (`soft-surface`): Translucent cards and quiet grouped content.
- **Stage Surface** (`stage-surface`): Translucent framing around the lesson viewport.
- **Cortical White** (`cortical-white`): Primary text and high-emphasis labels.
- **Quiet Blue** (`quiet-blue`): Supporting prose, controls, captions, and secondary navigation.
- **Dim Blue** (`dim-blue`): Metadata and low-emphasis context; reserve it for nonessential or sufficiently large text.
- **Structural Lines** (`structural-line`, `structural-line-strong`): Delineate panels and groups without creating heavy card chrome.
- **Control Surfaces** (`control-surface`, `control-surface-hover`): Give interactive controls a restrained tactile response.

**The Signal, Not Spectacle Rule.** Use Neural Cyan to communicate focus, selection, or action. Do not spread it across large decorative areas.

**The Scientific Color Sovereignty Rule.** Interface tokens never recolor anatomical regions, tract identities, activity channels, or other scientific encodings owned by renderer data.

## Typography

- **Display Font:** System UI sans serif, with platform-native fallbacks
- **Body Font:** System UI sans serif, with platform-native fallbacks
- **Label/Mono Font:** System UI monospace, with SFMono, Consolas, and Liberation Mono fallbacks

**Character:** The sans-serif voice is editorial, direct, and highly readable. Monospace labels create the cadence of scientific instrumentation without turning lesson prose into a terminal interface.

### Hierarchy
- **Display** (bold, fluid 2.5–5.3rem, 0.96 line height): Lesson openings and the strongest narrative orientation.
- **Headline** (bold, fluid 1.7–2.65rem, 1.08 line height): Scene titles and major conceptual transitions.
- **Title** (semibold, 1.2rem, 1.2 line height): Drawer, dialog, and panel headings.
- **Body** (regular, 1rem, 1.75 line height): Lesson prose; reading columns stay near 640–720px rather than spanning the viewport.
- **Small Body** (regular, 0.78rem, 1.55 line height): Supporting card copy and compact panel explanation.
- **Field** (regular monospace, 0.76rem, 1.55 line height): Structured lesson source and data-entry content.
- **Label** (semibold monospace, 0.68rem, 0.1em tracking): Eyebrows, status, metadata, control groups, and scientific context.
- **Micro Label** (regular monospace, 0.61rem, 0.15em tracking): Stage kickers and highly compact orientation text.
- **Status Chip** (regular monospace, 0.57rem): Fidelity and state chips that accompany a nearby full-text heading.

**The Two-Voice Rule.** Use sans serif for explanation and interaction. Use monospace for status, metadata, measurement, and compact orientation labels.

**The Readability Before Atmosphere Rule.** Never dim inactive lesson prose; express active scene state through rails, borders, and numbered markers.

## Layout

The system uses one responsive spatial model. Wide lesson views place a reading column beside a sticky atlas stage inside a centered container capped near 1480px. Atlas Home gives the renderer the flexible field and assigns a 320–380px control rail. At 980px and below, both experiences become single-column; the stage moves above lesson prose, and Viewer controls stack below or collapse. At 700px and below, navigation becomes compact, lesson transport docks to the safe-area-aware bottom edge, drawers become bottom sheets, and side inspectors become full-width sheets.

Spacing follows an observed 4, 8, 12, 16, 20, and 28px rhythm, with larger fluid gaps reserved for the lesson-stage composition. Reading scenes use viewport-relative vertical space to create deliberate pacing. The named `page-scroll` surface owns lesson scrolling; root document overflow remains contained.

**The One Stage Rule.** Reparent and resize the existing stage across modes; never recreate the canvas, renderer, visual system, or control model.

**The Effective Target Rule.** Every standalone interaction provides at least a 44 by 44 CSS-pixel target. Inline scientific citations remain ordinary inline links so prose rhythm is not distorted.

## Elevation & Depth

Depth is layered glass with structural shadows. Most resting surfaces rely on tonal separation, one-pixel cool borders, and controlled transparency. Blur belongs to fixed chrome and elevated overlays. Strong directional shadows appear only when a drawer, dialog, sheet, inspector, popover, or sticky stage must read above adjacent content.

### Shadow Vocabulary
- **Stage lift** (`0 28px 80px rgba(0, 0, 0, 0.28)`): Separates the sticky lesson stage from the reading field.
- **Popover lift** (`0 14px 48px rgba(0, 0, 0, 0.48)`): Raises compact transient menus close to their trigger.
- **Side-panel lift** (`-24px 0 70px rgba(0, 0, 0, 0.44)`): Separates right-edge inspectors and source panels.
- **Drawer depth** (`-28px 0 100px rgba(0, 0, 0, 0.62)`): Establishes the lesson drawer as a modal layer.
- **Dialog depth** (`0 28px 100px rgba(0, 0, 0, 0.72)`): Reserves the strongest elevation for blocking confirmation and import dialogs.
- **Mobile sheet depth** (`0 -24px 80px rgba(0, 0, 0, 0.68)`): Lifts bottom sheets from the stage on narrow screens.

**The Structural Shadow Rule.** Shadows explain overlap and modality. Never use them as ornamental glow around routine cards.

## Shapes

Brain Atlas uses crisp rectangular fields softened only enough to distinguish interaction and elevation. Labels use 2px corners, fields 3px, ordinary controls 4px, cards 6px, and dialogs 8px. The lesson drawer is square on wide screens and gives only its exposed top corners an 8px radius when it becomes a compact bottom sheet. Mobile anatomy and source-inspector sheets use 16px at their exposed top corners. Status chips and small state markers may use full pill or circular geometry. Fine borders carry more visual weight than radius.

The renderer remains visually organic; interface geometry stays disciplined so anatomical curves retain authority.

**The Restrained Radius Rule.** Increase radius with elevation and mobility, not with importance. Do not turn every container into a rounded card.

## Components

Components are precise, tactile, and restrained. Their state changes are visible, brief, and semantic; their geometry remains stable.

### Buttons
- **Shape:** Compact rectangular controls with gently curved corners (`control` radius) and at least 44px height.
- **Primary:** Neural Cyan fill with Deep Night text for decisive actions and selected states.
- **Secondary:** Translucent control surface with Quiet Blue text and a cool structural border.
- **Hover / Focus:** Hover strengthens the surface, border, and text over 150ms. Keyboard focus uses a 2px Neural Cyan outline offset by 3px.
- **Disabled:** Preserve layout, lower opacity, and use the native not-allowed cursor; never imply that reduced-motion playback can start.

### Chips
- **Style:** Small outlined pills for geometry and activity fidelity status.
- **State:** Use border color to distinguish status families; avoid filled badges that compete with primary actions.

### Cards / Containers
- **Corner Style:** Restrained 6px corners for lesson cards; large structural panels often remain square.
- **Background:** Translucent blue-black over Anatomical Night.
- **Shadow Strategy:** Flat by default; use structural shadows only for true elevation.
- **Border:** One-pixel cool line, strengthened for selectable or modal surfaces.
- **Internal Padding:** Usually 12–20px, with 16px as the card baseline.

### Inputs / Fields
- **Style:** Deep Night or Select Night field, cool structural border, 3–4px corners, and high-contrast text.
- **Focus:** The global Neural Cyan focus outline remains visible outside the field edge.
- **Error / Disabled:** Coral border and restrained dark coral surface for errors; disabled controls retain labels and context.

### Navigation
- The fixed top bar is translucent and blurred, with a compact monospace brand kicker and restrained action controls. Lesson scene navigation uses a numbered rail on wide screens and a safe-area-aware fixed transport on compact screens. Standalone brand, skip, and footer navigation links keep 44px targets.

### Atlas Stage
- The stage is the signature component: a bordered, elevated scientific viewport with a factual header, optional visual selector, one shared renderer surface, contextual model status, and adjacent source disclosure. The interface frames the anatomy; it never overlays redundant badges or decorative status chrome on the model.

### Lesson Scene Rail
- Scene markers are circular, quiet, and persistent. The active marker fills with Neural Cyan while all prose remains fully readable. State transitions affect color, border, and background for 180ms and remain available under reduced-motion preferences because they do not create spatial travel.

## Do's and Don'ts

### Do:
- **Do** let anatomy and evidence remain the brightest, most consequential content.
- **Do** use Neural Cyan only for focus, selection, links, and primary actions.
- **Do** preserve 44 by 44 CSS-pixel targets for standalone controls and navigation.
- **Do** use monospace for status and metadata while keeping explanation in the sans-serif reading voice.
- **Do** adapt side panels into bottom sheets and keep lesson transport safe-area-aware on compact screens.
- **Do** respect reduced-motion preference by stopping spatial travel while retaining useful color and border feedback.

### Don't:
- **Don't** drift toward a bright generic SaaS dashboard or a decorative neon science-fiction spectacle.
- **Don't** reuse interface tokens for anatomical, tract, activity, or fidelity colors whose meaning comes from data.
- **Don't** add another canvas, renderer, runtime coordinate transform, or competing control system.
- **Don't** cover the 3D stage with decorative badges, gradients, or persistent status chrome.
- **Don't** round every panel, lift every card, or use shadows without an overlap or modality reason.
- **Don't** dim lesson prose to show scene state or suppress all transitions under reduced motion.
