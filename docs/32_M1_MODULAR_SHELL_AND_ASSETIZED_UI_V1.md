# M1 Modular Shell + Assetized UI Assembly v1
**Date:** 2026-10-31  
**Status:** Production-prep checkpoint. Canonical owner source remains immutable. No gameplay implementation authorization.

## What was produced
The owner-approved 1920×1080 frame was decomposed into a static-shell + dynamic-sprite architecture without redrawing the frame.

### Modular shell v3
Local/chat artifact: `CYOA_M1_ui_shell_modular_v3.png`  
SHA-256: `2f536729c1e56ae974412bd9b9743f120729093104c927fc692debd256a90932`

From the immutable canonical master, the derivative shell:
- turns the already-designated magenta scene/portrait apertures transparent;
- neutralizes ONLY the dynamic speech-panel bay, player-choice bay, inventory-slot bay, inventory arrow-button rectangles, and three utility-button rectangles;
- removes ONLY the currently baked player-choice scrollbar thumb while keeping the track itself in the shell.

Pixel audit: **0 unexpected changes outside the explicitly allowed dynamic/magenta masks.**

NPC speech is now an exact independent sprite:
- `speech_panel.png`, 609×191
- SHA-256 `fede8520c49d8a8aa87dcfaca5e9595e5748d85eee270048f6f8c0b931e8e189`
- keeps its rivets/fasteners.

## Component set
First assetization bundle contains:
- modular static shell;
- exact NPC speech panel;
- 12 player choice sprites: 1/2/3/4-line × A/B/C subtle stain variants, no rivets;
- one 96×96 inventory-slot sprite;
- capped/stretchable player-choice scrollbar thumb;
- left/right inventory button idle/hover/pressed/disabled sprite prototypes;
- generic utility-button idle/hover/pressed/disabled sprite prototypes.

Bundle: `CYOA_M1_UI_assetization_v1.zip`  
SHA-256: `810b95cd0325374f6df311f9ffe5b613cf14de445810c2aec335fc638b56cbf4`

Assembly proof: `CYOA_M1_UI_assembly_proof_v1.png`  
SHA-256: `8685304e9b7d3631c0f1b7f46d2df9342004f39662a7cac651d1c9e461ba6c1b`

The proof intentionally uses blank scene/portrait/speech/choices and demonstrates the no-overflow scrollbar state: thumb fills the entire usable track.

## Runtime lab v5
Bundle: `CYOA_M1_runtime_lab_v5.zip`  
SHA-256: `e67cef79724947c7514dad1f8e13f9a0725fd293292e6144e26619b9fbc8f052`

Validated in system Chromium using an in-memory document because local file navigation is administrator-blocked.

Passed:
- page errors: **0**;
- choice viewport: 548×348;
- choice card heights: 80 / 108 / 108 / 136 / 80 in stress sample;
- choice press transform: 3px right + 3px down; hover causes no movement;
- scrolling sample player-choice thumb: 214px;
- exactly three 2-line choices: player-choice thumb expands to full **345px** usable track;
- speech overflow indicator x = **1899**, i.e. the far-right speech-panel rivet gutter;
- speech overflow fade appears after overflow;
- inventory slots: 96×96;
- inventory visible gap: 6px;
- inventory pitch: 102px;
- one right press shifts strip exactly -102px;
- utility and inventory controls use sprite-state artwork rather than CSS-only pressed displacement;
- utility labels are code-rendered as hard-edged pixel text.

## Inventory count decision
The owner allowed dropping to six if real spacing required it. Measurement showed that **seven remain comfortably viable**:
- 7 × 96px slots + 6 × 6px gaps = 708px;
- available lane ≈714px;
- therefore six is **not needed** at present.

Seven remains current design; six is only a fallback if later final source artwork proves unusable.

## Art/implementation details still requiring visual acceptance
These are now the substantive remaining M1 visual checks, not layout questions:
1. final cleanup quality of the rivet-free A/B/C choice-sprite corners/stain balance;
2. final inventory/utility pressed-state sprite craftsmanship (current states are production-oriented prototypes);
3. exact licensed/authored font face matching the selected **condensed institutional** direction. Runtime rule itself is locked: logical-grid rasterization, hard/binary pixel edges, integer nearest-neighbor display, no smoothing/subpixel positioning.
4. final neutral-bay texture treatment in the modular shell if the current dark teal backing is judged too plain; geometry is fixed.

Everything else in the M1 layout/interaction architecture remains locked unless the owner explicitly reopens it.
