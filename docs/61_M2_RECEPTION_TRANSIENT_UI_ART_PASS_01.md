# CYOA M2 — Reception Transient UI Art Pass 01

**Date:** 2026-11-07  
**Branch:** `agent/m2-reception-transient-ui-art-01`, created by PMO from `07ac3dbc13ba5a69c95e658db5403cb06c94fc54`, the accepted NOTES/FILES checkpoint.  
**Status:** the last two player-facing placeholders of the M2 reception slice are replaced: the utility-button tooltip box and the item-received slip. Not merged.

## A. Tooltip

### Final treatment (`game/game.css`, `.tooltip`)

The box is plain CSS, not a bitmap, so it sizes to its text (docs/45 §6: the tooltip box is not pixel art). It is hard-edged only:

| Part | Value |
|---|---|
| Body | dark desaturated teal `#22363b` |
| Outer outline | 1 px `#0b1416` |
| Edge | 2 px warm metal/cream `#b3a886` |
| Inner line | 1 px steel `#4d6b68` |
| Depth | a heavier 2 px dark bottom edge |
| Corners | 2 px chamfers (`clip-path` polygon) |

- The bands are layered inset `box-shadow`s with zero blur, so there is no outside shadow.
- There is no glow, blur, gradient, filter, transition, rivet, brass or arrow. The box stays clearly subordinate to the buttons.

### Behaviour preserved (`game/js/stage.js` unchanged for the tooltip)

- The tooltip is a separate element.
- **Text:** the baked **Labels** face (Press Start 2P 2×) in light ink, through the pixel-text canvas, with no browser text. It shows the enabled action's label, or the action + reason when disabled (for example `INSPECT - NO ITEMS`, `SHOW - NOT AVAILABLE HERE`). The blank third inspector button shows no tooltip.
- **Showing and hiding:** it shows on hover and on keyboard focus, with no delay, and hides when the pointer leaves or focus is lost.
- **Placement is unchanged:** the box is the text + 20 wide and the line height + 14 tall, centred 4 px above its button and clamped to the stage.
- **The buttons never change on hover.** The no-hover rule and its pixel and style QA stand.

## B. Item-received slip

### Asset

| | |
|---|---|
| Production path | `art/ui/overlays/item_received_slip.png` |
| Size | **560 × 116** RGBA, hard alpha {0, 255}, no RGB under alpha 0 |
| SHA-256 | `993ecdb6fb11e27b41c0eec07221a3421398458fa1a06d82aae22e8eb423797c` |
| Display | 1:1 on `NOTICE_RECT = [56, 738, 560, 116]` (unchanged) |

- **Source:** drawn by the owner at native size, the local review file `art/ui/sprites/reception/item_received_slip_candidate.png`. It is committed **byte for byte**, with no normalization.
- **Contents:** a frame, a left compartment for the 96 × 96 item sprite, a dark divider, and two quiet cream text bands. There is no text and no item art.

### Runtime structure (`game/js/stage.js`)

```
#itemNotice   (div, NOTICE_RECT, role=status, aria-live=polite; above the shell)
├── img#itemNoticeBackground   the preloaded slip, 560x116 at (0, 0), 1:1, pixelated, no transform/filter/opacity
└── canvas#itemNoticeContent   560x116, transparent: draws ONLY the item's slot art and the two text lines
```

**Regions** (slip coordinates, measured from the art):

| Content | Where |
|---|---|
| Item slot art (96 × 96, 1:1) | (14, 9), centred in the item compartment x 8–115, y 7–105 |
| `ITEM RECEIVED`, Labels face, dark ink | x 134, ink centred on y 28 (the upper band, y 8–48) |
| Item name, Choices face, dark ink | x 134, ink centred on y 77 (the lower band, y 50–103) |

- Each text line is centred on its band by measuring the rendered ink rows, so any item name and either face lands correctly.
- **The wording is unchanged and nothing is baked in:** the slip stays generic for future items, with no `wc_key` or FACILITIES KEY logic.
- **Removed:** the provisional drawing (the dark ink fill, parchment rectangle, stepped corners, divider, rule, and the `NOTICE_INK` / `NOTICE_PAPER` / `NOTICE_RULE` constants).
- **Behaviour unchanged:**
  - it appears on grant and shows for 3.6 s;
  - a click dismisses it early, and further grants queue;
  - READ / SHOW / USE / INSPECT never re-announce;
  - restart clears it, and `role=status` / `aria-live=polite` stay.

### Preload (`game/js/main.js`)

`G.NOTICE_ART.slip` joins the existing `G.loadImages` boot list, so `ready` means the slip is decoded.

## C. QA

- `node game/qa/validate_route.js`: **38/38**. The route graph, states and endings are unchanged.
- `game/qa/run_qa.js`, Chromium 147.0.7727.15 + Firefox 148.0.2: **431/431** (static 35/35, Chromium 198/198, Firefox 198/198), clean on the first full run.
- **Static checks:**
  - the slip is allowlisted by exact path and pinned hash (no wildcard); it is 560 × 116 RGBA with hard alpha and no hidden RGB;
  - none of the provisional slip drawing is left in `stage.js`;
  - the tooltip CSS is chamfered with zero-blur inset bands only: no filter, transition, gradient or image;
  - every earlier art pin is unchanged: the scene `fb010301…`, the background `16fe3a96…`, `receptionist_idle` `761a45d4…`, the alternate NPC designs `idle2` `38488a22…` / `idle3` `95ead2a6…`, the inspect art `9c8527a3…`, the X `8247d4b6…` / `576b4fbc…`, and the NOTES/FILES panel `bc9c35a8…`.
- **Slip in the browser:**
  - **Loading:** decoded before `ready`, and the served bytes match the pin.
  - **Structure:** `#itemNotice` holds exactly `IMG#itemNoticeBackground, CANVAS#itemNoticeContent`. The art is 560 × 116 natural, displayed 1:1 exactly on NOTICE_RECT, with no transform, filter, opacity or transition (on it or any ancestor) and smoothing off.
  - **Pixels:** every item- and text-free slip pixel (57,751) equals the file 1:1. The FACILITIES KEY slot art (3,140 px) sits 1:1 in the compartment. ITEM RECEIVED and the name are drawn in one dark ink (`32,48,55`).
  - **Behaviour:**
    - the existing checks pass: it appears on grant with the right name, `role` and `aria-live`; it sits clear of the dialogue, choices, inventory and buttons; a click dismisses it; the ~3.6 s auto-dismiss works; and it never re-announces;
    - new: two QA-only grants queue and show one after the other;
    - new: restart clears a showing slip and its queue.
- **Tooltip in the browser:**
  - **Content:** the INSPECT tooltip shows on hover with its enabled label, and the disabled reasons (`INSPECT - NO ITEMS`, `SHOW - NOT AVAILABLE HERE`) are unchanged. The blank inspector button shows none.
  - **Placement:** it stays inside the 1920 × 1080 stage and never covers its button.
  - **Text and box:** one light ink in the Labels face (the canvas height equals the Labels line height). The box has no filter, transition or opacity change.
  - **Showing and hiding:** it disappears when the pointer leaves; keyboard focus shows it and losing focus hides it.
  - **No hover change:** the existing pixel and style no-hover checks still pass for every control.
- **Layout lab:** not run. The lab, `design/` and the M1 surfaces are unchanged (static guard).

## D. Proofs (actual `game/index.html`, 1920 × 1080)

- `game/qa/screenshots/00l_tooltip_inspect_enabled.png`: the INSPECT tooltip, enabled. This and the next two are 920 × 380 crops showing the button row, frame and objective plate.
- `game/qa/screenshots/00m_tooltip_disabled_reason.png`: a disabled tooltip with its reason (`INSPECT - NO ITEMS`).
- `game/qa/screenshots/00n_tooltip_inspector_show_disabled.png`: the inspector's `SHOW - NOT AVAILABLE HERE` tooltip.
- `game/qa/screenshots/00j_item_received_slip.png` (= `05b_item_received.png`): the ITEM RECEIVED slip with FACILITIES KEY.
- `game/qa/screenshots/00k_after_slip_dismissed.png`: the normal game after the slip is gone.

## E. Remaining placeholders after this pass

Both are **development safety paths**, not player-facing in the current M2 slice:

1. **QA-only overflow-item slot art** (`P.slotItem`). It is drawn only for synthetic items that QA adds through `?qa`.
2. **The generic inspect-art fallback** (`P.inspectArt` → `P.panel`). It is shown only for a future item whose `inspectArt` is null; every current item has inspect art.

No player-facing reception placeholder remains.

`game/README.md` was updated narrowly: the art list now includes the inspector art, the records panel and the slip, and the placeholders line now names only the two safety paths.


## F. PMO art-complete checkpoint (2026-11-07)

**Outcome: ACCEPTED AS PLAYER-FACING ART COMPLETE.**

PMO accepts the transient-UI pass at branch head `c9156f5604e521dc61318ab277baf38b77266d8c`.

The M2 reception slice now has no player-facing development-art placeholder:
- reception scene: production art;
- layered portrait background + NPC: production art;
- FACILITIES KEY inspect art: production art;
- inspector close button: production art;
- NOTES / FILES panel: production art;
- tooltip treatment: production treatment;
- item-received slip: production art.

The two remaining placeholders are development safety paths only:
1. QA-only synthetic overflow-item slot art;
2. generic inspect-art fallback for a future item with no inspect art.

These are not M2 player-facing blockers.

**Important:** ART COMPLETE does not mean POLISH COMPLETE.

Before M2 can close or merge, the owner must review the fully art-complete slice in a dedicated visual / interaction tuning lab. That lab is the next mandatory gate.

The lab should tune production parameters around the locked shell and approved art; it must not reopen M1 shell redesign or generate new artwork.
