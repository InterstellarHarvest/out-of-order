# 99 — Death popups in ordinary play

**Owner rulings, 2026-11-17:**
- "Death popups need to appear when a death occurs."
- For deaths whose art is not selected yet (Chapter 2): show the popup, with the picture box left empty.

**Branch:** `agent/death-popups-ordinary-play-20261117`, on top of PR #15 (`76dc7dc`, docs/98).

## 1. Behaviour

| | Before (docs/98) | Now |
|---|---|---|
| Activation | Only with `?deathproof` | **Always**, in ordinary play. `?nodeathpopups` turns it off; it is kept for QA comparison with the authored ending |
| Restore tracking (RETRY / CHECKPOINT) | Only with the gate | Always: ordinary autosaves carry restore points (docs/96 format) |
| Which deaths | `chapter-01:exit_chair_fatal` only | **Every canonical death entry** (`canonical: '*'`): the Rest Assured chair (3 causes) and Chapter 2's 5 fatal endings. A death added to the storyboard gets its popup with the next pull |
| Art not selected yet | Entry skipped | The popup opens with the **picture frame and mat empty**. No placeholder and no unselected art are drawn (`data-art="pending"`). The selected image appears there as soon as the storyboard records it |
| Review banner | `REVIEW BUILD - …` above the popup | None. The notice plate is hidden, and appears only to explain an unavailable control (EXIT) |
| Copy | Canonical draft | Unchanged, and shown to players as it stands. Wording changes are made in the storyboard and arrive with the next pull |

**Escape** still closes the popup to the authored ending, whose BEGIN AGAIN restarts. It is a safety exit while EXIT waits for the main menu.

**Saves:**
- Older saves load. RETRY becomes available from the fatal decision; CHECKPOINT becomes available after the next chapter entry.
- With `?nodeathpopups`, saves are written in the ordinary format, as before.

## 2. Files

- `game/content/end-presentations.review.js`: schema `cyoa-end-presentations-v3`, with:
  - `activation: 'always'`;
  - `disableWith: 'nodeathpopups'`;
  - `canonical: '*'`;
  - `notice: null`.
- `game/js/end-presentation.js`:
  - activation;
  - the `'*'` opt-in;
  - the empty frame when art is pending;
  - the hidden notice.

  It still names no story id, art path or prose.
- `tools/story-sync/sync.js report`: handles `'*'`. A death image used in ordinary play no longer carries a `gate` tag.

## 3. Text fit (all six popups, measured)

- Every popup's text column ends at or above y=573, against the layout limit of 615. None overflows.
- Rest Assured ends at 529. CLASSIFIED AS COMPOST, the longest, ends at 573.

## 4. QA

| Suite | What it now proves |
|---|---|
| `run_end_presentation_qa` | Uses the ordinary URL (`?nodeathpopups` for the authored-ending reference). Checks that there is no banner. Every Chapter 2 fatal route ending selects exactly its own popup, and nothing else does |
| `run_death_controls_qa` | Uses the ordinary URL. **New `ch2_hopper_fatal`:** the Chapter 2 popup opens with an empty frame, RETRY and CHECKPOINT are available, and CHECKPOINT restores the exact Chapter 2 entry. **New `ordinary_tracking`:** the plain URL writes restore points. The compatibility scenarios use `?nodeathpopups` |
| `validate_death_controls` | Plus one check: every death entry is opted in, and activation is `always` |

Chapter 1 routes, Chapter 1 art, Chapter 2 routes and the story suite pass unchanged with popups on. Their checks read the game state under the popup.

## 5. Open

- **Chapter 2 art:** 43 images still need generating (23 scenes, the Courtesy Conductor portrait pair, 3 kit close-ups, 5 death vignettes, 10 item images). The 7 Batch 1 images are approved but not integrated yet. The owner has ruled: generate first, then integrate in one pass.
- **EXIT** still waits for the main menu.
- **Final popup wording** is made in the storyboard.
