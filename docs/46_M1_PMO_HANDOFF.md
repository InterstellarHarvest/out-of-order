# CYOA M1 — Handoff to the PMO (2026-11-05)

**Repository:** `InterstellarHarvest/out-of-order`. `main` = `a30fc5a`, the only branch.
**Status:** M1 interface direction is set, and its assets are organised on `main`. Nothing here authorises building the game; that is the first decision below.

## 1. What M1 produced

- **Layout lab** (`tools/layout-lab/`, open `index.html` locally). The full M1 screen is assembled from the approved sprites, with live tuning of every position and these behaviours:
  - inventory scrolling with weight;
  - choice cards with the "send" turn flow;
  - typewriter dialogue with player and NPC lines in separate faces;
  - JSON export and import.

  Its defaults are the owner's current layout; `docs/45` §2 lists everything it does. QA passes 1908/1908 in Chromium and Firefox.
- **Art on `main`:**
  - `art/ui/`: the canonical shell, the approved 29-sprite package, the choice-marker tab (unused), and three fonts: Jersey 15 1× (dialogue), Tiny5 3× (objective) and Press Start 2P 2× (labels and tooltips). The choice cards keep the locked font.
  - `art/actions/`: 22 action sprites, 96×96, chosen by the owner, with `actions.json` recording their sources.
  - `art/items/bathroom_pass_slot.png`.
- **Decisions:** all in `docs/45_M1_OWNER_DIRECTION_INTERACTION_AND_DIALOGUE_FLOW.md`.

## 2. Owner decisions to carry forward

- **Interaction is physical.** Hover never adds a border, outline or glow, and choice cards are dialogue lines, not buttons (`docs/45` §1).
- **Dialogue turn flow** (`docs/45` §4):
  1. The NPC's line types out.
  2. The choices slide in.
  3. The chosen card is sent.
  4. The player's line appears at once.
  5. A beat.
  6. The NPC's reply types out.

  All of the recommended extras are confirmed: click to skip, input ignored while cards move, keyboard focus, single-action endings, scroll-back, and a transcript in NOTES or FILES.
- **Three utility buttons:** INSPECT, NOTES and FILES. They show glyphs. They switch to context actions (READ, USE, SHOW and others) when the situation calls for it.
- **Action art direction:** gritty 1940s retro-futurist bureaucracy, the film *Brazil* without copying it. It is painterly pixel art that matches the painted shell. The owner rejected flat minimal glyphs, steampunk brass, and clean 1960s pastel.
- **Tooltips:** they name each action. Only the font is decided (Press Start 2P 2×); the rest is deferred (`docs/45` §6).
- **Item inspector** (`docs/45` §7):
  - The portrait window grows down to the dialogue box's bottom edge.
  - The item's text goes in the choices box.
  - The three buttons stay, changed or disabled by context.
  - A close button marked X sits at the portrait window's top-right.
  - The art is a full-size transparent PNG of the new right column, to be made when inventory items are.
- **Repository rules** (`docs/45` §8):
  - Masters stay local and never go into git: PSDs, font files, `source/` and `originals/`.
  - Items get two sprites, `<item>_slot.png` (96×96) and `<item>_inspect.png`.
  - Scenes go in `art/scenes/<location>/<scene>/`.
  - Earlier work is kept only in the `archive/*` tags.

## 3. Open questions at handoff

1. What is M2: more location design, a playable reception slice, or engine/runtime selection first?
2. When should the owner's still-adjustable lab geometry replace the older geometry contract?
3. When should inspector, tooltip, item, portrait and scene art be produced?
4. Reconcile stale hover wording in older M1 docs with `docs/45`.

## 4. Resolution after handoff

On 2026-11-05 the owner authorized the PMO recommendation to proceed with **M2 — Reception Vertical Slice**. See `docs/47_M2_RECEPTION_VERTICAL_SLICE_CHARTER.md`.

The geometry remains lab-authoritative but not contract-locked until the owner explicitly freezes it. Hover contradictions are reconciled by supersession notes in docs 26 and 31.
