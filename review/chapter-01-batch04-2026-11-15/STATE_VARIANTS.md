# State-dependent art proposals — not implemented

Exactly six baseline scenes are generated. No additional item, display, wristband, plant or animation candidate is produced. This document is a review proposal for Gameplay PMO, not supported runtime JSON or an engine patch.

## B — actual stored item

The baseline drawer has an empty padded center and retracted mechanism at rear. Future scene-density overlays may depict the actual stored item in the same drawer perspective. They must be independently authored as tiny world objects, not mechanically reduced96×96 inventory icons or invented new possessions.

| Actual state | Proposed visible overlay | Reset/removal |
|---|---|---|
| `house_stored_item == timing_clicker` | One period clicker, no extra personal articles. | Remove when the real retrieval effect gives it back and sets the stored tag false. |
| `house_stored_item == rubber_band_ball` | One rubber-band ball. | Same rule. |
| `house_stored_item == red_stapler` | One red stapler. | Same rule; never consume it merely for illustration. |
| `house_stored_item == desk_plant` | One actual desk plant in its pot. | Same rule; do not show it if held elsewhere, donated or never retained. |
| No valid stored item / `house_storage_recovered` | No item. | Use empty baseline. |

Working scene anchor is near the center of the padded tray; final native bounds are recorded below after visual QA. Item base should sit on pad, with correct occlusion of rear mechanism if necessary. A plant can extend upward from its footprint without becoming a new decorative room plant. The exact state is already recorded by story effects; no new flags, acquisitions or rule changes are proposed.

Long prose classifications such as LIVING DECORATION—TEMPORARILY STORED and MISCELLANEOUS DOMESTIC MATERIAL are not baked into the baseline. Do not fake tiny labels or invent an off-camera written card. If literal readable labels are later needed, request a separately approved close inspection or a legible shorter visual treatment, with any prose correction shown separately for review.

## D — neutral versus RETURNS destination

The sorting-machine display is a front-facing neutral panel with a dash. Keep that baseline for clean escape. A later small, independently authored display patch may replace only the display interior with clear block capitals `RETURNS` when `equipment_registered` is true. Seven characters must be readable at314×206 before4× display; no surrounding fake microtype.

Do not select the patch merely from `house_exit_route == mechanical`, because BOTH clean and registered routes use that value. Do not depict a wrist/body or automatically grant a wristband inventory item. The story already supplies the administrative wristband event on failed release. The external door remains closed in both corridor baselines, so no extra exit-door variant is needed.

The patch rectangle is identified from the selected native image below. These coordinates are review annotations, not new runtime schema or implemented layer support. PMO must choose the smallest approved renderer/catalog change if variants are adopted.

## C and F

C shows the release lever and idle registration mechanism before either release outcome. It contains no permanently held stapler. No roll-result animation or cuff state is generated.

F is the common OPEN public doorway for both named-plant and showroom-reset success. It adds no donated plant, resident pedestal, watering light or permanent RESET notice. Route-specific narration and existing flags remain authoritative. No additional plant overlay is needed for this public-exit baseline; any later foyer adoption art is a separate request.

## Native review annotations

Coordinates below refer to native314×206 scene pixels, origin top-left; they are approximate visual review annotations, to confirm during any later integration:

- B padded center: suggested footprint anchor `(158,80)`. Clear padded foreground polygon approximately `(88,69) → (227,69) → (237,87) → (80,87)`. Stowed mechanism occupies the rear strip above it. Object height may rise above the footprint; use scene-consistent scale and occlusion, not a fixed rectangular inventory slot. No overlay art is produced.
- D destination panel: interior approximately `[228,83,271,100)` (43×17pixels). Future RETURNS glyphs can use high-contrast4×7 block capitals plus1pixel spacing, centered with margins. Replace only panel interior; preserve frame/machinery. Neutral dash returns for clean state. No display patch is generated.

If the current runtime only accepts one scene path, PMO may instead choose an approved alternate complete scene image later. No layer/schema support is assumed or implemented in this package.
