# Out of Order — development repository

**Official game title:** *Out of Order* (owner-approved 2026-11-19)  
**Repository:** `InterstellarHarvest/out-of-order` (renamed 2026-11-19)  
**Phase:** M2 — Reception vertical slice  
**Status:** Bounded game implementation is authorized for the reception slice defined in `docs/47_M2_RECEPTION_VERTICAL_SLICE_CHARTER.md`. This does not authorize full-game production or an engine rewrite.

This repository preserves ideas and decisions for a retro-futuristic, branching pulp adventure. It is deliberately a **notebook, not a locked game-design bible**. Rejected and superseded ideas are kept because they may become useful later.

The previous working title was retired on 2026-11-19. `CYOA` remains in technical schemas and internal keys for compatibility; the public [CYOA-storyboard](https://interstellarharvest.github.io/CYOA-storyboard/) repository and Pages URL retain their existing names. The approved v06 main-menu artwork is staged byte-exactly on the [menu review branch](https://github.com/InterstellarHarvest/out-of-order/tree/review/out-of-order-menu-intake/art/ui/main_menu); engine integration is deferred.\n\n## Current direction

An ordinary person, inadvertently granted inappropriate authority through coincidence or bureaucratic nonsense, is drawn into an alternate retro-futuristic world where strangeness is commonplace. The tone begins absurd and funny, turns disturbing, and remains unpredictable. Humanity's remarkable technology works, but civilization may have misunderstood *what it actually does*. **The Exchange**—a system believed to transport objects but perhaps exchanging them with equivalents—is the leading story hypothesis, not established canon.

The intended visual language is bright, chunky, true low-resolution pixel art inspired by the richer 16- to early-32-bit era, shown at integer scale. A King's Quest VI-style composed scene and separately framed, more detailed NPC speaking portraits are an important UI reference. The playable protagonist's on-screen representation is **undecided**.

**Current scene/portrait art contract:** [Scene / Portrait Pixel-Density and Color Contract](docs/54_SCENE_PORTRAIT_PIXEL_DENSITY_AND_COLOR_CONTRACT.md). **Locked densities (2026-11-07):**

- **Scene:** 314×206 logical at 4× nearest neighbour.
- **Portrait:** background and NPC on the native 564×278 canvas at 1×. The 282×139 @2× target is retired.

The contract also covers:

- separately authored world and portrait representations;
- NEAREST-only scene geometry with non-spatial colour cleanup;
- shared color language without arbitrary 256-color limits;
- controlled, noise-conscious palettes;
- layered, animation-friendly NPC portraits.

The inspiration from *Choose Your Own Adventure: House of Danger* concerns consequential choices, occasional chance, and useful acquired objects—not a deck-building, combat-card, or roguelike card-game interface.
## Repository layout

```
art/
  ui/
    shell/layout-final.png        1920x1080 canonical shell (pinned by hash)
    m1_approved_sprite_sheet.*    approved sprite package v1: atlas, manifest, JS manifest
    sprites/                      the package's sprites (choice_cards, controls, fonts, inventory)
    fonts/                        chosen baked faces, with licences/
  actions/                        final 96x96 action-button sprites, named by action; actions.json
  items/                          inventory items: <item>_slot.png (96x96) and <item>_inspect.png
  portraits/                      later
  scenes/<location>/<scene>/      later, e.g. conference_hall/reception (chapter folders may come)
tools/layout-lab/                 the placement lab; open index.html locally (see its README)
docs/  design/                    design notes, decisions, contracts
```

**Masters never go into git:** PSDs, font files and anything in a `source/` or `originals/` folder stay local (see `.gitignore`). Everything before this layout, including candidate art and the sprite package's build history, is kept in the `archive/*` tags.

## CURRENT M2 AUTHORITY — START HERE

**M2 is authorized:** [Reception Vertical Slice Charter](docs/47_M2_RECEPTION_VERTICAL_SLICE_CHARTER.md). M1's approved UI, assets and interaction rules remain the foundation; [docs/45](docs/45_M1_OWNER_DIRECTION_INTERACTION_AND_DIALOGUE_FLOW.md) governs interaction details. The old roadmap's milestone numbering is historical where it conflicts with this charter.

## APPROVED M1 LAYOUT / UI
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

**Assetized UI assembly checkpoint:** [M1 Modular Shell + Assetized UI Assembly v1](docs/32_M1_MODULAR_SHELL_AND_ASSETIZED_UI_V1.md) — static shell, dynamic sprite decomposition, v5 lab validation, and remaining visual gates.

**Latest correction:** [Font lock + true physical button press](docs/33_M1_FONT_AND_TRUE_BUTTON_PRESS_CORRECTION.md) — preserve the thin readable pixel font from the owner screenshot; pressed states change depth/shading only, never color.

**Current M1 dynamic-component lock:** [Approved pixel component art + runtime v6](docs/34_M1_DYNAMIC_COMPONENT_ART_LOCK.md). Choice frames, slot, inventory arrows, utility raised/recessed states and pixel-text look are now owner-locked; integration/QA only.

## Project documents
- [Creative brief](docs/00_CREATIVE_BRIEF.md) · [World and story](docs/01_WORLD_AND_STORY.md) · [Visual explorations](docs/02_VISUAL_UI_EXPLORATION.md) · [Interaction brainstorming](docs/03_INTERACTION_NOTES.md)
- [Idea archive](docs/04_IDEA_ARCHIVE.md) · [Decision register](docs/05_DECISIONS_AND_OPEN_QUESTIONS.md) · [Living roadmap](docs/06_LIVING_ROADMAP.md)
- [M1 Canonical UI Design Contract](docs/17_M1_CANONICAL_UI_DESIGN_CONTRACT.md)
- [M1 historical exploration and review documents](docs/) (07–16, retained, superseded on conflicts).

[Visual QA of post-lock mockups (not yet approved)](docs/18_M1_VISUAL_QA_AFTER_LOCK.md)

## Working rules
- Owner-selected design decisions take precedence over assistant speculation; the canonical UI contract is currently LOCKED.
- Preserve rejected/superseded ideas in history, but never resurface their instructions as active requirements.
- Bounded implementation of the M2 reception vertical slice is authorized by `docs/47`. Do not expand that authorization into full-game production, unrelated systems, or an engine rewrite.
- References to existing media are inspirations, not materials for copying.
- Keep milestone plan flexible and the story premise provisional.

Design checkpoint: October 30, 2026.
