# M1 — Local Sprite Gallery + Pixel Placement Lab

**Date:** 2026-10-31  
**Branch:** `review/m1-ui-shell-v2`  
**Status:** TOOLING BRIEF — implementation delegated to Claude Code / local VS Code workflow.  
**Canonical shell:** `layout-final.png`, Git blob `1849c8ec192cd639dd8550de0dcdda1aa88d2e4f`.

## Why this exists

M1 sprite art is being designed in ChatGPT, stored in Git, and then tested locally. We need a small, deterministic visual toolchain so owner review does not depend on chat image previews or approximate AI-generated full-screen mockups.

Git is the source of truth for all assets used by the tools.

The owner's existing local project area is:

`/Users/MrDashiki/Experiments & Projects`

Claude Code should keep a normal local clone of `InterstellarHarvest/out-of-order` there and use normal Git worktrees for isolated implementation tasks.

Do not modify the canonical shell while building either tool.

---

## Current asset-status distinction

### Canon / reusable
- `layout-final.png` — immutable shell.
- Existing 12 player-choice sprites — 548 px wide; 80/108/136/164 px heights; A/B/C variants.
- Existing approved 96×96 inventory-slot sprite.
- Existing locked bitmap-font assets.

### Superseded control candidates
The PNGs currently in:

`review/m1-ui-shell-v2/candidate_art/`

for inventory arrows, utility buttons, and scrollbar thumb are **older candidates**. They remain useful as comparison/history but are not current owner-approved production art.

### Current latest design direction
Recorded in:

`docs/39_M1_OWNER_UI_CONTROLS_CORRECTIONS.md`

The most recent image-generated mockups that motivated those corrections are concept references only. Their revised control artwork has **not yet been authored as exact modular PNG sprites and committed to Git**.

Therefore new sprite production should create a new candidate revision, not overwrite the historical candidate set.

Recommended location:

`review/m1-ui-shell-v2/candidate_art/v2/`

Until owner approval, call it candidate art, not canon.

---

# Tool 1 — Sprite Gallery

Create a lightweight static browser page for inspecting all current UI sprites.

Suggested location:

`tools/m1-sprite-gallery/`

No framework required. Plain HTML/CSS/JS is preferred.

## Goals

- Scrollable single-page gallery.
- Load sprite inventory from a small JSON manifest rather than hard-coding every file in HTML.
- Preserve alpha exactly.
- Display sprites with `image-rendering: pixelated`.
- Never resample a sprite merely to fit a card.
- Show natural dimensions and optional integer zoom controls (1×, 2×, 3×, 4×).
- Each sprite gets its own review card/container.

## Background controls

Each sprite card should allow local background selection:

- black;
- magenta `#ff00ff`;
- checkerboard transparency pattern.

A page-level control may set all cards at once, but each card should still be individually overrideable.

Changing the review background must not alter the image itself.

## Metadata shown per sprite

At minimum:

- logical display name;
- filename/path;
- width × height;
- status: `CANON`, `CANDIDATE`, `SUPERSEDED`, or `REFERENCE`;
- family/category;
- revision;
- optional SHA/hash from manifest;
- UP/DOWN relation where applicable.

Useful filters:

- Choices
- Inventory
- Inventory arrows
- Utility/action buttons
- Scrollbar
- Font
- Canon only
- Candidates only
- Superseded

## Pair/group review

For related assets, support grouped display:

- left arrow UP / DOWN;
- right arrow UP / DOWN;
- utility 1/2/3 UP / DOWN;
- all A/B/C choice variants at each height;
- scrollbar top/middle/bottom pieces.

Do not create composite raster files just for the gallery. Compose in HTML.

## Asset manifest

Add a versioned JSON file, suggested:

`design/m1_sprite_manifest.json`

The manifest should be the authoritative list consumed by the gallery and placement lab.

Each entry should contain enough data to identify:
- id;
- path;
- status;
- category;
- revision;
- width;
- height;
- optional state/group;
- optional expected Git blob/SHA-256.

Do not silently promote CANDIDATE to CANON. Owner approval changes status explicitly in Git.

---

# Tool 2 — Canonical UI Pixel Placement Lab

Create a developer-only HTML lab that uses the exact canonical shell as the base layer and lets the owner place modular UI elements to the pixel.

Suggested location:

`tools/m1-ui-placement-lab/`

Plain HTML/CSS/JS preferred.

## Canvas / viewport contract

- Logical review surface is exactly **1920×1080**.
- Use the exact Git-tracked `layout-final.png`.
- Preserve shell alpha.
- All component positions are integer pixel values.
- All sprite rendering is nearest-neighbor / pixelated.
- Do not mutate or save into the shell PNG.

The UI may scale the whole 1920×1080 stage to fit the browser, but the model coordinates remain 1920×1080 display pixels.

## Sidebar

A simple developer sidebar should let the owner:

- select an element;
- toggle visible/hidden;
- edit X and Y numerically;
- nudge X/Y by ±1 px;
- optional ±5 px nudge;
- inspect width/height;
- choose sprite/state/variant where applicable;
- toggle UP/DOWN for buttons;
- choose six-slot vs seven-slot comparison configuration;
- edit dynamic label/sample text;
- toggle choice overflow;
- toggle NPC speech overflow;
- reset an element to manifest/default coordinates.

Dragging may be offered, but numeric integer controls are the authoritative placement method.

No subpixel transforms.

## Elements to support

At minimum:

- inventory slot sequence;
- left inventory arrow;
- right inventory arrow;
- objective-title text;
- objective-body text;
- utility button 1;
- utility button 2;
- utility button 3;
- utility labels;
- player choice cards;
- player-choice scrollbar thumb;
- NPC speech sample text;
- NPC speech overflow indicator.

Later modules can be added without changing the coordinate format.

## Placement export

The lab must expose a **Copy JSON** button.

The exported JSON should contain only reproducible placement/runtime configuration, for example:

```json
{
  "schema": "m1-ui-placement-v1",
  "shell": {
    "width": 1920,
    "height": 1080,
    "blob": "1849c8ec192cd639dd8550de0dcdda1aa88d2e4f"
  },
  "inventory": {
    "mode": "seven",
    "leftArrow": {"x": 0, "y": 0},
    "slots": {"x": 0, "y": 0, "count": 7, "pitch": 102},
    "rightArrow": {"x": 0, "y": 0}
  },
  "actions": {
    "inspect": {"x": 0, "y": 0},
    "notes": {"x": 0, "y": 0},
    "journal": {"x": 0, "y": 0}
  }
}
```

Actual values come from the lab, not this example.

Also support:
- Copy JSON to clipboard.
- Download JSON file.
- Paste/import JSON to restore a placement session.

The JSON should be stable enough that the owner can paste it directly to Claude Code and say: "apply these placements."

## Optional coordinate overlay

Useful but simple:
- crosshair or outline on selected element;
- current X/Y near selected element;
- optional shell grid every 10 px / 50 px;
- grid must be toggleable and must never alter screenshots/assets.

---

# Six vs seven inventory-slot review

The placement lab should explicitly support both accurate alternatives.

### Seven-slot baseline
- use the exact approved 96×96 slot sprite;
- 7 slots;
- 6 px gap;
- 102 px pitch;
- do not rescale the locked slot.

### Six-slot alternative
- treat as a separately identified review configuration;
- do not stretch the approved 96×96 asset arbitrarily;
- if a larger slot sprite is needed, it must be separately authored/identified;
- use exact canonical lane bounds.

Provide a one-click six/seven toggle while keeping arrows in their independently controlled positions.

Owner chooses only after seeing both mechanically assembled on the real shell.

---

# Runtime/visual state demonstrations

The lab is not the game. It is a deterministic visual placement tool.

It should nevertheless demonstrate:

- button UP/DOWN state;
- label moving with pressed face;
- choice-card +3/+3 pressed offset;
- choice-card variant/height changes;
- scrollbar full-height vs overflow thumb;
- objective title centering;
- speech/choice overflow independence.

Do not add gameplay logic.

---

# Screenshot / review support

Include a clean review mode that hides:
- developer sidebar;
- selection outlines;
- grid;
- coordinate labels.

This lets the owner take exact 1920×1080 review screenshots.

A restore/show-devtools button or keyboard shortcut can bring controls back.

---

# Git/worktree workflow for Claude Code

Claude should:

1. Locate or clone `InterstellarHarvest/out-of-order` under `/Users/MrDashiki/Experiments & Projects`.
2. Fetch all remotes.
3. Do not work directly in an unrelated dirty checkout.
4. Create a dedicated worktree/branch from the current `review/m1-ui-shell-v2` head for tooling, suggested branch:
   `agent/m1-sprite-gallery-placement-lab`.
5. Build the tools only; do not modify production gameplay code.
6. Treat `layout-final.png` as immutable and verify its Git blob before/after.
7. Consume Git-tracked sprites through the manifest.
8. Add automated smoke checks for manifest paths, duplicate IDs, integer coordinates, and canonical-shell identity.
9. Commit and push the tooling branch for PMO/owner review.
10. Do not merge without owner/PMO approval.

The tooling can later be retained as a developer utility even after M1 art is locked.

---

# Sprite production workflow going forward

1. Art chat creates/refines modular sprite candidates.
2. Exact PNG candidates are committed to a new versioned candidate directory.
3. Manifest entries mark them CANDIDATE.
4. Gallery immediately exposes them with transparent-background review controls.
5. Placement lab uses the same candidate files on the canonical shell.
6. Owner adjusts/evaluates.
7. Placement JSON is exported and may be handed to Claude.
8. When owner explicitly approves an asset revision, status is updated to CANON.
9. Historical candidates remain available as SUPERSEDED unless cleanup is explicitly authorized.

This prevents concept mockups from being confused with production sprite binaries.
