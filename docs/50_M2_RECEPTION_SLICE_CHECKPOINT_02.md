# CYOA M2 — Reception Slice, Checkpoint 02

**Date:** 2026-11-05
**Branch:** `agent/m2-reception-slice` (not merged). Built on `c87461b` (PMO ruling, `docs/49`).
**Authority:** `docs/49_M2_CHECKPOINT_01_PMO_RULING.md` §5. Scope kept to its list; no new location or system.
**Status:** Ready for owner playtest. Firefox QA still owed before any merge.

## 1. Changes

### Maintenance commit (isolated): stray pixels on six choice cards (docs/49 §2.7)

Only pixels with alpha > 0 in rows 0–1 were cleared; rows 2 and below are byte-identical. The same pixel runs
recur across different cards (e.g. columns 354–367 on both `1line_a` and `2line_a`), consistent with text bleed
from the source sheet. Unlike the 2026-11-02 pair, these runs sit directly on the card's outline row with no
transparent gap; they are not part of the outline, which is a full-width row beneath them.

| Sprite | Before (sha256) | After (sha256) | Pixels |
|---|---|---|---|
| `choice_1line_a` | `b7055d622440459f86d398c2df896cf235a700896f02cf417dede64d0ea03a32` | `5736d1ac0417ea723846bbb021044e0ba3e3389b1d9d3a27b7425697379e76f6` | 72 |
| `choice_1line_b` | `efeac4cc0995b3451d75ae9a0f8868a762d73e17aa540a4d613bf72665ed1daa` | `5ca0fff158e52867c2141bed92db806747a103073f3cae2eccb95fcdb43234e6` | 268 |
| `choice_2line_a` | `bdb8fa8174cd4a10b7887d0fbb2fbff04039d2ea53e8d51fed3d5402bae1ac19` | `04c016bafa1628a45f3dea688e6628bc0418df453ba0cb03a53f9293fd3fe7fe` | 44 |
| `choice_2line_b` | `e28807c219b7050e6ca3e51aa3b7f30b60e75d2d1b34ef67acac8ee23c71a86a` | `78201b4d27723e70aae5974fce65e3ae6e5290640e55a253dd9d10169a07c6a4` | 4 |
| `choice_3line_b` | `c1b738f93d86215a5f630c4abc882d15c1f0c523dd5210061bc40985d967d7ec` | `1655afe8625e44d4db9e85d5f9c0fa5135ccb0fb4b9f2972d2dedb076a49e070` | 112 |
| `choice_4line_a` | `dceed817b68f6743e1f6c3adeb142f23e1d6a70b33ef8f2eadbf3e72d79eabe1` | `af2cc48d35c71931350803a8c7af9c96d9a9553a7d36772a84a68a1dd2fbd4db` | 88 |
| atlas | `bf636c757c30fa33b45f8ae370374d0349fb615a0d64a23cde873099b64a7013` | `1c5990ba16a88c4986709187628d7ba81460c985bcd0b290c83cdca540bd8d2e` | the same 588 |

Updated with it: manifest JSON and JS (each card's `correction` entry holds its before-hash and pixel count),
the lab's defaults, QA fixture, generated bundles and previous-atlas import list (placements saved against
`bf636c75` still import), lab README, and both QA suites. `design/` is unchanged: like the 2026-11-02
correction, it keeps the source-ZIP hashes. The lab gains a check for scattered stray pixels above a card's outline.

### Slice revisions

| Ruling | Done |
|---|---|
| §2.1 disabled actions | An action that belongs in the slot but is unavailable keeps its glyph in an unlit treatment (desaturated, darkened; composited once from the approved file, no CSS filter), does not press, and its tooltip says why: `SHOW - NOT AVAILABLE HERE`, `READ - NOTHING TO READ`, `INSPECT - NO ITEMS` / `- SELECT AN ITEM`. Hover still changes nothing. No slot in the slice is ever blank. |
| §2.2 keyboard focus | The approved brass tab (`choice_marker_tab.png`) slides out from under the focused card's left frame, using the lab's marker geometry and travel. Only focus reached by keyboard shows it; mouse hover and focus that follows a click or tap do not. Card size, text position and wrapping are unchanged. |
| §2.3 NOTES/FILES | Unchanged: over the scene aperture. |
| §2.4 INSPECT | Clicking or focusing an inventory item selects it (UI state only). INSPECT opens the selected item, or the only item held; with nothing held, or several held and none selected, it is inactive. Clicking an item still opens it at once. |
| §2.5 name | `FACILITIES KEY` kept. |
| §2.6 casing | Not changed. |
| §2.8 copy | Two lines rewritten; the contradiction and her indifference stay. |

Copy changes (`game/content/reception.js`):

- `tag_question` — was: *…THEN YOU HAVE UNTIL 4:52 TO GET USED TO IT. KEYS COME BACK, EXAMINER. THEY ALWAYS COME BACK.*
  Now: *LET ME SEE. [SHE DOES NOT LOOK.] RETURNED AT 4:52, SIGNED BY THE EXAMINER. YES, THAT ALL APPEARS TO BE IN ORDER. A KEY THAT HAS BEEN RETURNED HAS, BY DEFINITION, BEEN ISSUED. I DO NOT SEE THE DIFFICULTY.*
- `door`, when the tag was raised — was: *…AND EXAMINER? SEE YOU AT 4:52.*
  Now: *…AND PLEASE RETURN THE KEY WHEN YOU ARE DONE, EXAMINER. ACCORDING TO THE RECORD YOU ALREADY HAVE, SO THERE SHOULD BE NO DELAY.*

The closing line still differs depending on whether the tag was raised.

## 2. QA

| Suite | Result |
|---|---|
| Route validation (`node game/qa/validate_route.js`) | **38/38** (adds: no line predicts or explains 4:52; the contradiction is still on the tag and in her reply). 449 reachable states. |
| Game browser QA (`game/qa/run_qa.js`), Chromium | **137/137** (15 static + 122 browser). New: card cleanup pixel-checked against the originals; brass tab on keyboard focus only; no tab on hover or after a click; tab changes no geometry; inactive glyphs, tooltips, no press; INSPECT on the selected item with nine items. |
| Lab QA (`tools/layout-lab/qa/run_qa.js`), Chromium | **983/983** (was 981; adds the scattered-pixel check and the import check for the previous atlas). |
| Fault injection on the new behaviour | 4/4 caught: tab on any focus, tab on hover, INSPECT on the leftmost slot, inactive button pressing. |
| Firefox | **Not run.** The environment still cannot download Playwright's Firefox (`cdn.playwright.dev` denied). Required before merge. |
| Sprite package QA | Not on `main` (it lives in the archive tags); its hash and pixel checks are covered by the game and lab static checks above. |

## 3. Placeholders still in use

Reception scene; receptionist portrait; FACILITIES KEY inspect art; inspector right-column overlay; inspector X
button UP/DOWN; tooltip box; one reusable NOTES/FILES panel treatment (docs/49 §2.3); and now the unlit
(inactive) glyph treatment.

## 4. For owner review

1. **Playtest** the slice: `game/index.html`.
2. **Inactive glyph treatment:** desaturated and darkened. Is that the look, or should it be drawn art?
3. **Selected item cue:** INSPECT acts on the selected item, but the selection is not yet shown in the inventory.
   With one item this never matters; before more items arrive, the selected slot needs a physical cue (art).
4. **Brass tab size:** at the lab's marker geometry the tab is small (12px showing); judge it at 1:1.
5. **The two rewritten lines** (above).
6. **Controller:** there is no gamepad input yet; the focus model (and the tab) is what a controller would drive.
