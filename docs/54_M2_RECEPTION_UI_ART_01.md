# M2 reception UI art batch 01 — owner review

Branch: `agent/m2-reception-ui-art-01`, based on `7085a9f`. This is an art replacement for the item notice and inspector X only. No reception content, interaction timing, shell geometry, or item overlay was changed.

## Source and reference

- Canonical shell: `art/ui/shell/layout-final.png`; inspector frame: `art/ui/shell/item-overlay.png`.
- Existing runtime placement and typography: `game/js/stage.js`, `game/qa/screenshots/05b_item_received.png`, and `game/qa/screenshots/06_inspector_before_read.png` at the baseline commit.
- Built-in image generation supplied two local material studies: a horizontal receipt frame and an UP/DOWN X study. Their direct outputs were rejected as production sprites because their geometry and pixel grid did not fit the exact runtime slots. The final PNGs were authored at a 2× pixel grid, with the generated studies used only for palette and hardware direction. The studies remain local under Codex generated images and are not committed.

## Generated modular PNGs

| Asset | Dimensions | Role |
|---|---:|---|
| `art/ui/sprites/reception/item_received_slip.png` | 560×116 | Reusable stamped slip and empty icon well, transparent exterior. |
| `art/ui/sprites/reception/inspector_x_up.png` | 44×44 | Raised enamel/steel close control, transparent exterior. |
| `art/ui/sprites/reception/inspector_x_down.png` | 44×44 | Same chassis with the cap and X recessed by two stage pixels. |

The notice remains at `(56, 738)` in the 1920×1080 stage. Code still renders the 96×96 item slot icon, `ITEM RECEIVED` heading, separator rule, and dynamic item name. Its 3.6 second lifetime, click dismissal, queue, and nonblocking position are unchanged. The inspector X uses the existing press state and 44×44 hit area; there is no hover sprite.

The canonical shell, approved sprite package, item slot art, and `art/ui/shell/item-overlay.png` are preserved byte for byte. No PSD, source image, or other master is in Git.

### Owner pixel edit

The owner edited `review/m2-reception-ui-art-01/item_slip_magenta.png`. Its 280 changed pixels refine the corner hardware and registration marks. Those RGB pixels were transferred into the production slip, while the proof's magenta exterior was kept transparent in the sprite. The alpha remains binary and the 560×116 footprint is unchanged. No new magenta marks were present inside the former opaque area; the edited proof's magenta mask matched the existing transparent silhouette.

## Owner gate

Review the isolated slip on checkerboard, black, and magenta; the exact 1920×1080 runtime assembly; both X states; and the X on the real item overlay in `review/m2-reception-ui-art-01/`. The new art and its integration need owner approval before merge. Reception scene, portrait, key inspect art, NOTES/FILES, tooltip, inventory cue, and choice focus remain outside this batch.
