# M1 Correction 33 — Font lock + true physical button press
**Date:** 2026-10-31  
**Status:** OWNER CORRECTION. Supersedes recent prototype deviations. Does not reopen frame/layout.

## Font lock
The runtime/code text must match the **font appearance shown in the owner-supplied screenshot `image(4).png`**, specifically the thin, readable condensed institutional pixel face used in the choice-card mockup:
- narrow, tall-ish glyphs;
- open counters and clear word spacing;
- lighter stroke weight than the rejected later bold/blocky versions;
- crisp chunky pixel rendering, but **not heavy or novelty-looking**;
- no anti-aliasing or subpixel smoothing at final display.

The recent generated asset sheets that changed this to a heavier/bolder font are **rejected**. Future typography must preserve the screenshot's direction and metrics as closely as practical.

## Button press — physical depth only
For inventory arrows and utility buttons:
- **DO NOT change hue, fill color, saturation, or material palette between idle and pressed.**
- Pressed state is the **same button/material** moved from raised to recessed/flat.
- The **whole button body** changes depth, not merely the icon or inner face.
- Idle: top/left highlights + bottom/right shadow establish raised relief.
- Pressed: those depth cues invert/compress so the entire button appears pushed down into the housing; top/left become darker/inset, bottom/right lose the raised cast shadow or receive the opposite rim highlight.
- The button may translate down/inward by a few pixels, but geometry/hue stays stable.
- The icon/label follows the button body's depth shift and does not recolor.
- Hover state remains omitted for now.
- Disabled is separate and may desaturate/dim, but that is not the pressed treatment.

## Inventory arrow geometry
Inventory arrows remain narrow, rivet-free, and use beveled corners that mirror the arrow-facing side. Left/right are separate assets because bevel/shadow direction is not a simple mirror in final authored art.

## Immediate art task
Produce a focused button study showing:
1. inventory arrow idle vs pressed;
2. utility button idle vs pressed;
using identical colors/materials between states and only 3D shading/position differences.

Do not regenerate the full UI or change any locked geometry while solving this.


## OWNER ART LOCK — 2026-10-31
The subsequent component sheet is approved. The font correction and true full-body press treatment are no longer open exploration: use the exact approved component language and hashes in [doc 34](34_M1_DYNAMIC_COMPONENT_ART_LOCK.md). No hover sprites. UP and DOWN/PRESSED retain the same palette; depth comes from the entire bevel/shadow construction.
