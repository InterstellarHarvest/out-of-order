# CYOA M2 — Reception Inspector Art Pass 01

**Date:** 2026-11-07  
**Branch:** `agent/m2-reception-inspector-art-02`, created by PMO.  
**Baseline:** `6abfc266004d489bfaf555a5a289d5072c23ae96`, the finalized portrait baseline (docs/59): accepted tight background, active `receptionist_idle.png`, and the unloaded alternate NPC designs `idle2`/`idle3`. Route was 38/38 and game QA 351/351 there.  
**Status:** two placeholders replaced: the FACILITIES KEY inspect art and the inspector X (up/down). Not merged.

## 1. Replay of the earlier local work

This pass was first built as **local-only** commit `a828905` on the older checkpoint `8e0064d`. It was paused before the portrait-background revision and never pushed. The remote `agent/m2-reception-inspector-art-01` is unchanged at `8e0064d` and stays as stale evidence.

It was replayed here with `git cherry-pick -n a828905`, after classifying every file in `8e0064d..a828905`:

| Path | Kind | Decision |
|---|---|---|
| `art/items/bathroom_pass_inspect.png`, `art/ui/sprites/inspect_close_up.png`, `art/ui/sprites/inspect_close_down.png` | inspector art | carried, **exact bytes** |
| `game/content/reception.js`, `game/js/main.js`, `game/js/stage.js`, `game/js/placeholders.js` | inspector-only code | carried; `6abfc26` never changed these files, so they applied cleanly |
| `game/qa/run_qa.js`, inspector check hunks | inspector QA | carried |
| `game/qa/run_qa.js`, `PRODUCTION_ART` allowlist hunk | conflict | **resolved by hand** (below) |

**Not carried:** `a828905`'s side of the allowlist pinned the *old* background (`2f23075f…`) and the *old* receptionist (`66c4f32a…`). Those lines were dropped. The resolution keeps `6abfc26`'s block verbatim and appends only the three inspector entries:

- tight background `16fe3a96…`;
- `receptionist_idle` `761a45d4…`;
- the alternate NPC designs `idle2` `38488a22…` and `idle3` `95ead2a6…`, with their "not frames, expressions or poses" wording.

`a828905` contained no portrait art, docs or QA outputs, so nothing else needed excluding.

`a828905` is still in the local `_worktrees/CYOA-m2-reception-inspector-art-01` and has not been deleted.

## 2. Production assets

| Asset | Path | Size | SHA-256 |
|---|---|---|---|
| FACILITIES KEY inspect art | `art/items/bathroom_pass_inspect.png` | 565 × 451 RGB, opaque | `9c8527a3fd85cfeddc01ce4a85b74b04cb54063ffc30100be19497e73e7fa722` |
| Inspector X, up | `art/ui/sprites/inspect_close_up.png` | 44 × 44 RGBA, alpha {0, 255} | `8247d4b6b23aac803debb405c3549054ea066d54e7561117499f0deb917dc530` |
| Inspector X, down | `art/ui/sprites/inspect_close_down.png` | 44 × 44 RGBA, alpha {0, 255} | `576b4fbc5f50f5d6fcb57065dd350dcf7d81fd4442831cb2509a76f5008c41ba` |

### FACILITIES KEY inspect art

- **Source:** the owner's Codex master `facilities_key_inspect_raw.png` (1404 × 1120 RGB, SHA-256 `f203dd0367a8b13c46007f666a4aaf76f215307ca21ed028d4e1834e5c2a97d9`). It is local only in `source/reception_density/`, git-ignored and untracked.
- **Normalization:** the owner fitted it to the native 565 × 451 with nearest-neighbour scaling (the owner's export, `art/items/bathroom_pass_inspect.png` in the local working folder). The committed file is that export, **byte for byte**. It was not regenerated or renormalized, and has no forced palette, dither or cleanup.
- **Contents:** the key, the worn leather fob, and a paper issue/return tag. The tag's writing is illegible scribble, so the readable tag text stays game text through READ: the 4:52 contradiction and the copy are unchanged.
- **Naming:** the historical filename `bathroom_pass_inspect.png` for the item now called FACILITIES KEY is known and kept.

### Inspector X (up / down)

- **Source:** drawn by the owner directly at 44 × 44 (local review files `art/ui/sprites/reception/inspector_x_candidate_up.png` / `_down.png`). They were committed byte for byte under the production names above.
- The down state is real pressed geometry, a three-pixel physical press drawn in the sprite, not a CSS filter.

## 3. Runtime wiring

- **Content:** `game/content/reception.js` sets `wc_key.inspectArt` to `'art/items/bathroom_pass_inspect.png'`.
- **Generic inspect art (`game/js/stage.js`):**
  - `#inspectArt` is a container exactly on the unchanged `INSPECT_RECT = [1331, 50, 565, 451]`, under `art/ui/shell/item-overlay.png`.
  - For any item whose `inspectArt` is set, it holds that item's preloaded image (`img#inspectImage`), drawn **1:1** at the container origin.
  - For an item whose `inspectArt` is null, it holds the existing labelled development placeholder (`canvas#inspectPlaceholder`, `P.inspectArt`).
  - `stage.js` names no specific item.
- **Close X:**
  - The `#inspectClose` button keeps its 44 × 44 place at (1844, 58) and its behaviour.
  - Inside it are the two preloaded sprites, `img#inspectCloseUp` and `img#inspectCloseDown`. The existing physical press state (`ui.pressed['inspect-close']`) shows DOWN, and releasing restores UP.
  - The drawn `P.closeButton` placeholder was removed, because a repository search found no remaining caller. The inspect-art fallback, `P.inspectArt`, stays.
- **Preload (`game/js/main.js`):** every item with a non-null `inspectArt`, plus both X sprites, are added to the existing `G.loadImages` boot list (`G.INSPECTOR_ART`, `G.inspectImageName`). `ready` therefore means they are decoded.
- **Unchanged:** the inspector geometry, the item overlay, READ, SHOW/USE, Escape, second-click-on-item closing, the dialogue, choices, inventory and narrative state, the route graph, the scene, and the portrait background and NPC.

## 4. Portrait baseline preserved

| File | SHA-256 | Role |
|---|---|---|
| `art/portraits/receptionist/reception_background.png` | `16fe3a96d4304efdbd820981ae8d24039b176d30e28b6c0feee8b2baa08c3c74` | accepted tight background |
| `art/portraits/receptionist/receptionist_idle.png` | `761a45d4aa3037173684b815fde75d8d7a7694d541aff6d55dbd863f7e312e2d` | active receptionist (loaded) |
| `art/portraits/receptionist/receptionist_idle2.png` | `38488a228d237650c7b2fe7a0eb2cee74f1549cef63c1767376eb899b714ee35` | alternate NPC design candidate, never loaded |
| `art/portraits/receptionist/receptionist_idle3.png` | `95ead2a6de3b28061b77775ea12cb9abf25035e76590b4ff33322abfe69e6376` | alternate NPC design candidate, never loaded |

`idle2` and `idle3` are separate NPC designs. They are not frames, expressions or poses of the active receptionist (docs/59 §8).

## 5. QA

- `node game/qa/validate_route.js`: **38/38**. The route graph, states and endings are unchanged.
- `game/qa/run_qa.js`, Chromium 147.0.7727.15 + Firefox 148.0.2: **378/378** (static 30/30, Chromium 174/174, Firefox 174/174), clean on the first full run. This starts from `6abfc26`'s 351 checks; all of them are kept, including every portrait, alternate-NPC and scene pin. The inspector checks are added on top.
- **Static checks:**
  - the three inspector files are allowlisted by exact path and pinned hash (no wildcard);
  - the inspect art is 565 × 451 opaque RGB, and `wc_key.inspectArt` points at it;
  - the X up/down sprites are 44 × 44 RGBA with hard alpha {0,255}, and they differ;
  - `P.closeButton` is retired and the `P.inspectArt` fallback stays;
  - `stage.js` names no specific item.
- **Browser checks (each browser):**
  - **Loading:** the inspect art and both X sprites are decoded before `ready`, and the served bytes match the pins.
  - **Inspect art:** the inspector shows `img#inspectImage`, not a placeholder canvas. It is 565 × 451 natural, exactly on INSPECT_RECT, 1:1, with no transform, filter, opacity or transition, smoothing off, and under the item overlay. Every inspect-art pixel the overlay and the X leave visible equals the file, 1:1.
  - **X button:**
    - the X shows its UP sprite pixel for pixel at (1844, 58), and hovering it changes nothing;
    - pressing shows the DOWN sprite pixel for pixel, with the item still open;
    - a press released off the X keeps the item open and returns it to UP;
    - a press released on the X closes the item;
    - the Enter key presses it (DOWN) and closes on release.
  - **Other closing routes:** Escape and a second click on the item still close the inspector.
  - **Fallback:** a QA-only synthetic item with no `inspectArt` still gets the labelled `canvas#inspectPlaceholder`.
  - **Story:** READ still reveals the 4:52 tag and changes the choices exactly as before.
  - **Restore:** closing the inspector restores the exact tight background + `receptionist_idle` composite, and the game never requests `idle2`/`idle3`.
- **Layout lab:** not run. This replay touches no lab, design or shared shell surface: `art/ui/sprites` gains two new files, but the M1 package and atlas are unchanged and their hashes are checked by game QA.

## 6. Proofs (actual `game/index.html`, 1920 × 1080)

- `game/qa/screenshots/00c_inspector_facilities_key_before_read.png` (also `06_inspector_before_read.png` and `00b_reception_art_inspector_open.png`): FACILITIES KEY inspector open before READ, with the large inspect art under the production item overlay and the normal X.
- `game/qa/screenshots/00d_inspector_close_up.png` / `00e_inspector_close_down.png`: focused 120 × 120 captures of the X at rest and held down.
- `game/qa/screenshots/07_inspector_after_read.png`: after READ.
- `game/qa/screenshots/08_choices_changed_by_item.png` and `00_reception_art_dialogue.png`: the right column restored to the tight background with the active receptionist.

## 7. Remaining placeholders

- The NOTES / FILES panel treatment (`P.panel`).
- The temporary tooltip box.
- The provisional code-drawn item-received slip.
- Slot art for QA-only overflow items (`P.slotItem`).
- The inspect-art fallback placeholder, which shows only for an item whose `inspectArt` is null (none in the current content).


## 8. PMO visual acceptance (2026-11-07)

**Outcome: ACCEPTED.**

PMO visually reviewed the committed FACILITIES KEY inspect art and inspector close-button UP/DOWN states.

### FACILITIES KEY inspect art — accepted

The 565×451 close-up clearly reads as the current story item:
- substantial institutional steel key;
- worn leather fob;
- paper issue/return tag tied through the ring.

The tag is visually prominent enough to justify the READ action while its writing remains abstract/illegible, so the authoritative readable 4:52 contradiction stays in game text rather than being baked into generated art.

The object scale and quiet green-gray inspection surface fit the existing inspector frame and do not compete with its text/actions.

### Inspector X — accepted

The 44×44 UP/DOWN pair fits the existing physical-control language. The pressed state is real sprite geometry rather than a filter, and the X remains readable at native scale.

### Checkpoint disposition

Branch head `c5924bb7a49bbb90d034f1377f599e87ed7a3afd` is accepted as the M2 inspector-art checkpoint.

No additional inspector-art generation is required.

The next bounded visual-art pass is the NOTES / FILES scene-overlay panel treatment. Tooltip and item-received notice remain later work.
