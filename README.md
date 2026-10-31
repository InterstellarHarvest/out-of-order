# CYOA — preproduction archive

**Working game title:** *The Acceptable Error* (provisional)  
**Repository name:** `CYOA` (temporary)  
**Phase:** Creative exploration / preproduction notes only  
**Status:** No game code, game assets, engine selection, or implementation authorization.

This repository preserves ideas and decisions for a possible retro-futuristic, branching pulp adventure. It is deliberately a **notebook, not a locked game-design bible**. Rejected and superseded ideas are kept because they may become useful later.

## Current direction

An ordinary person, inadvertently granted inappropriate authority through coincidence or bureaucratic nonsense, is drawn into an alternate retro-futuristic world where strangeness is commonplace. The tone begins absurd and funny, turns disturbing, and remains unpredictable. Humanity's remarkable technology works, but civilization may have misunderstood *what it actually does*. **The Exchange**—a system believed to transport objects but perhaps exchanging them with equivalents—is the leading story hypothesis, not established canon.

The intended visual language is bright, chunky, true low-resolution pixel art inspired by the richer 16- to early-32-bit era, shown at integer scale. A King's Quest VI-style composed scene and separately framed, more detailed NPC speaking portraits are an important UI reference. The playable protagonist's on-screen representation is **undecided**.

The inspiration from *Choose Your Own Adventure: House of Danger* concerns consequential choices, occasional chance, and useful acquired objects—not a deck-building, combat-card, or roguelike card-game interface.
## CURRENT APPROVED M1 LAYOUT / UI — START HERE
**[M1 Canonical UI Design Contract (owner-locked 2026-10-30)](docs/17_M1_CANONICAL_UI_DESIGN_CONTRACT.md)** is the sole governing source for mockups and visual review. The [portrait-border and inventory-arrow precision note](docs/19_M1_PORTRAIT_AND_ARROW_PRECISION.md) clarifies two repeatedly missed proportions. Older interface documents are historical notes and MUST NOT override this contract.

16:9 · upper 70% scene / 30% rail · 7 unnumbered inventory slots with separate one-slot arrow controls · right-rail scroll indicator **without arrow buttons** strictly below portrait/above utilities · portrait fills entire rail width · distinct objective housing · decorative right end-cap · no decorative frame text · nothing enters scene or portrait apertures · medium-thickness, slightly absurd 1960s-future hardware.

**Current amendment:** [M1 Layout Decision 20 — speech width, choice scrollbar, compact inventory and footer utilities](docs/20_M1_LAYOUT_FOOTER_AND_DIALOGUE_REVISION.md). **Latest mockup mode:** [Frame-only review and inventory-sized footer](docs/21_M1_FRAME_ONLY_REVIEW.md), included in canonical contract v1.2. The next mockups show NO game imagery or narrative text.

**Frame-art status:** Three owner-accepted starting templates (not final visual lock); see [M1 Frame Art Starting Templates and Round 2](docs/22_M1_FRAME_ART_STARTING_TEMPLATES.md).

**Latest art correction:** The multi-colored, random hardware treatment was rejected; [return to older favored manufactured frame styles](docs/23_M1_RETURN_TO_OLDER_FRAME_STYLES.md), keeping the current frame-only geometry. 

**Current visual direction (owner-selected):** [A / Civic Enamel as master frame, B / Institutional Hardware speech-box style only](docs/24_M1_A_BASE_B_DIALOGUE_SELECTION.md). Art direction selection, not final frame source-art lock.

**Authoritative owner frame candidate:** [M1 Final Frame Candidate + Dialogue Choice Proposal](docs/25_M1_OWNER_FINAL_FRAME_AND_DIALOGUE_CHOICES.md) — exact uploaded PNG identity recorded by dimensions and SHA-256; future frame work must preserve it.

**Production-prep UI spec:** [M1 UI Assetization and Runtime Interaction Prep](docs/26_M1_UI_ASSETIZATION_AND_RUNTIME_PREP.md) — reusable sprites, choice sizing, both scrollbar behaviors, typewriter dialogue, pressed states, and inventory animation.

**Canonical measurement source:** [1920×1080 RGBA source identity and preservation rule](docs/27_M1_CANONICAL_1920_SOURCE.md).

**Measurement map:** [M1 UI Measurement Sheet v1](docs/28_M1_UI_MEASUREMENT_SHEET_V1.md) + [machine-readable regions](design/ui_regions_v1.json).

**Asset extraction/geometry checkpoint:** [M1 Asset Extraction and Geometry v1](docs/29_M1_ASSET_EXTRACTION_AND_GEOMETRY_V1.md).

**Runtime validation:** [M1 Runtime Lab Validation + Sprite Contract v1](docs/30_M1_RUNTIME_LAB_VALIDATION.md).

**Component art brief:** [M1 Component Art Brief and Slice Rules v1](docs/31_M1_COMPONENT_ART_BRIEF.md).

**Pending typography review:** [M1 Typography + Choice Card Study 01](docs/32_M1_TYPOGRAPHY_CHOICE_STUDY_01.md).

**Latest production UI delta:** [Pixel text, stained choice variants, speech overflow gutter, and spaced seven-slot inventory](docs/31_M1_PRODUCTION_UI_DELTA_PIXEL_TEXT_STAINED_CHOICES.md).

## Project documents
- [Creative brief](docs/00_CREATIVE_BRIEF.md) · [World and story](docs/01_WORLD_AND_STORY.md) · [Visual explorations](docs/02_VISUAL_UI_EXPLORATION.md) · [Interaction brainstorming](docs/03_INTERACTION_NOTES.md)
- [Idea archive](docs/04_IDEA_ARCHIVE.md) · [Decision register](docs/05_DECISIONS_AND_OPEN_QUESTIONS.md) · [Living roadmap](docs/06_LIVING_ROADMAP.md)
- [M1 Canonical UI Design Contract](docs/17_M1_CANONICAL_UI_DESIGN_CONTRACT.md)
- [M1 historical exploration and review documents](docs/) (07–16, retained, superseded on conflicts).

[Visual QA of post-lock mockups (not yet approved)](docs/18_M1_VISUAL_QA_AFTER_LOCK.md)

## Working rules
- Owner-selected design decisions take precedence over assistant speculation; the canonical UI contract is currently LOCKED.
- Preserve rejected/superseded ideas in history, but never resurface their instructions as active requirements.
- Do not begin game implementation without authorization; static visual design studies and design-only HTML labs may support reviews.
- References to existing media are inspirations, not materials for copying.
- Keep milestone plan flexible and the story premise provisional.

Design checkpoint: October 30, 2026.
