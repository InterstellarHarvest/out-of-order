# Form 27B-6 — Register of Progress (printer handoff)

**Status:** owner-selected presentation direction, preserved for future integration; **NOT connected to gameplay, NOT merged to main**. The parent [chapter transition draft PR](https://github.com/InterstellarHarvest/out-of-order/pull/21) stays open as a review-only archive, like the separate main-menu intake branch.

## Live reference and source

- Private live prototype: https://out-of-order-transitions-nate.cosmic-jelly-5330.chatgpt.site/print
- Canonical Site-source checkpoint: `2d76a578b5063a4d5bbdd85600a3116e576a075c` (published version 10, 2026-11-21).
- This folder mirrors the current prototype's `print.html`, `print.css`, `print.js`, the RGBA paper and printer PNGs, and its approved main-menu painting used **only as review background**.
- Serve the repository root via an ordinary local static server, then open `/tools/chapter-transitions-lab/print/print.html`. Or use the live private Site. No build tools or dependencies are required.
- `print-check.mjs` tests self-containment and user-selected timing/alignment. Run `node tools/chapter-transitions-lab/print/print-check.mjs`.

## Approved visual behavior

- Palette: light taupe textured pixel-art paper; procedural/form styling labeled **FORM 27B-6 / REGISTER OF PROGRESS**; boxed rows preprinted in the sheet image.
- Slot/printer slides up first and sits at the bottom of a 16:9 scene; the artwork's bottom edge remains below the frame. **Thick lip on bottom** is the default; paper extends under that lip, aligned at `paperY = -5` px with `feedDepth = 5` px (relative to 1024-wide preview).
- Feed up just enough to reach the current incoming chapter. Only encountered chapter entries are typed using a hand-authored, pixel-sharp 5×7 bitmap face scaled by nearest neighbor. **Do not preview future rows**, and do not show an empty trailing box below the active chapter.
- On a non-new-game transition, a heavy, uneven, multi-pass scribble obscures the outgoing row, followed by a distinct hold, then paper scrolls to center the incoming box and types its number and title.
- Default backdrop: old scene art blurs/dims, cross-dissolves behind the form. Black/magenta remain QA edge-check alternatives; blur-to-black is an optional alternate. The next scene in the Site is **schematic**, not canonical art.
- Default exit: paper reverse-feeds into the printer while the printer/slot sinks more slowly, **both fading with the same opacity envelope**, revealing the next scene. Still dissolve and upward eject are optional review variants, not the selected behavior.

## Locked tuning defaults

| Phase | Seconds |
|---|---:|
| Initial delay | 0.18 |
| Slot rise | 0.70 |
| Initial paper feed | 0.70 |
| Outgoing-row scribble | 0.60 |
| **Pause after scribble** | **0.75** |
| Scroll to next box | 1.20 |
| New chapter typing | 1.20 |
| Reading hold | 2.85 |
| Reverse feed, drop and fade | 1.50 |
| **Total (Prologue → Chapter 1 example)** | **9.68** |

These are **tunable demo values**, not a hardcoded engine timing contract. Menu → Prologue skips outgoing-row scribble, its post-scribble pause, and box advance; it is consequently shorter. Tuning links use the version-2 nine-duration URL schema; version-1 links remain supported by the preview.

## Source files and hashes

| File | Purpose | SHA-256 (PNG only) |
|---|---|---|
| `print.html`, `print.css`, `print.js` | Self-contained DOM/canvas animation and tuning UI | — |
| `art/print/form-27b6-blank-v01.png` | RGBA 1024×1536 pixel-art paper with empty ruled boxes | `3c1c2df469ed101a3aff838c927801b59a2a6eb6b79dfb6c066f5c0e777cb052` |
| `art/print/printer-slot-v01.png` | RGBA 2172×724 metallic slot, can flip thick lip | `7ee5584200759d72d9219193bb892597ed2ca3844e04af15f5a27babcb884229` |
| `menu/entrance-plaza-locked.png` | Unmodified approved v06 main-menu painting for background QA | `22083a038ed87ab9eb0155fba6648cec67699936402dc8b4b399b8aa5b48623d` |

The menu painting is a **review copy**, not a second production asset. Preserve the canonical main-menu art at `review/out-of-order-menu-intake`; do not copy these review files blindly into gameplay.

## Later engine integration (not part of this branch)

1. Insert a presentation-only handoff **after** the final result/CONTINUE at chapter end, without issuing another `Rules.step`; the existing flow's `transition(first)` is an investigation starting point, not a committed hook decision.
2. For menu → Prologue, start only after NEW GAME and save-confirmation callbacks complete. Do not change save semantics or show the outgoing-row scribble on a new game.
3. Feed titles and chapter numbers from canonical game metadata, tracking **encountered chapters only**, never from the preview's hardcoded examples. If routes skip scenes or end independently, print only actual chapter arrivals. Chapter 3+ canonical availability must be checked at integration time.
4. Scope visual animation to the existing 1920×1080 game stage and its scaling, with a single idempotent completion/skip callback; preload the incoming scene. Keep the accepted scene, dialogue, choice, inventory, item, notes, dice and save state intact.
5. Include reduced-motion, Skip, immediate save restore, fatal-end exclusion, and RETRY/CHECKPOINT regression QA. The scroll behavior for a completed full-length sheet (and optional taped-on DLC extension) is a **future design question**, not implemented by this lab.
6. Keep the parent PR draft and unmerged until an explicit engine integration request. Its earlier A/B/C studies are useful history but are not the selected visual direction.

The archived demo was verified in its Site checkout with `node --check dist/print.js` and all three Site checks (`print-check`, `form-check`, `lab-check`) passing before this intake.
