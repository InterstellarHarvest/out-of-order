# 96: Rest Assured death controls: RETRY and CHECKPOINT (review-gated)

Branch `agent/rest-assured-death-retry-checkpoint` in worktree
`_worktrees/CYOA-rest-assured-death-controls`.

- **Started from:** PR #11's head, `agent/rest-assured-death-visual-proof` at `57cd9a2`.
- **Authority:** the owner rulings on PR #11 of 2026-11-16:
  - the button ruling (labels, positions and destinations locked);
  - the fresh-dice ruling (RETRY and CHECKPOINT give fresh, independent rolls).

  These supersede the open options in docs/95.

**Status: implemented behind the existing review gate (`?deathproof`) only.**
- Off by default. Gate-off play, saves and dice are unchanged, byte for byte in format and exactly in
  semantics.
- The authored BEGIN AGAIN still restarts the whole playthrough.
- No main menu was built. No other death was opted in.
- Nothing was merged, promoted or deployed.

## 1. Behaviour

| Control | What it does |
|---|---|
| **RETRY** (left) | Restores the genuine state **immediately before the fatal decision**: inventory, flags, item marks, resolved checks, NOTES and the presentation cursor, exactly as they stood. It does not move the node over the post-death state. Checks attempted from here roll **fresh**. |
| **CHECKPOINT** (centre) | Restores the genuine **chapter-entry state**: the House arrival, with the Prologue's inventory, flags, NOTES and resolved checks as they were on entry. Everything chapter-local is rolled back, and the arrival narration is presented again. Replayed chapter checks roll **fresh**; checks from earlier chapters keep their results. |
| **EXIT** (right) | Locked to the future main menu, which does not exist. It is drawn **visibly unavailable**: muted ink `#7d9189`, `aria-disabled`. Activating it only shows `EXIT LEADS TO THE MAIN MENU, WHICH DOES NOT EXIST YET`. There is no fake quit, no URL change, no restart and no save deletion. |

**Availability.** A control is offered only when its point fits the ending (`Rules.canRestore`):
- RETRY's point must be the very decision that caused this death, at the node it came from;
- CHECKPOINT's point must be the current chapter's entry.

Otherwise the label is muted and activating it explains why, for example
`CHECKPOINT UNAVAILABLE - NO CHAPTER-ENTRY SNAPSHOT` (an older save).

**Unchanged:**
- Only the voluntary Rest Assured cause opens the presentation. The failed stapler and failed
  unarmed checks keep the ordinary ending.
- The visual composition, art, geometry, title and copy are as accepted on PR #11.
- The control labels are now the owner's: RETRY / CHECKPOINT / EXIT.

## 2. Design (all in `game/js/rules.js`, pure, shared by the game and the Node tests)

### 2.1 Restore points (`trackPoints`, `canRestore`, `restoreFrom`)

`points = { checkpoint: { chapter, state, cursor }, retry: { at, input, state, cursor } }`, where each
`state` is a complete rules state.

**How they are recorded.** `trackPoints(story, points, before, input, result)` runs after every
committed step:
- entering a chapter records `checkpoint = the state as entered`, with its arrival text not yet
  presented;
- a decision (a choice, or SHOW / USE; not inspect, READ or the context action) records
  `retry = the state just before it`, fully presented;
- a restart (BEGIN AGAIN) clears both.

Rules states are immutable, so a point *is* the state the game held. It is never reconstructed.

**How they are restored.** `restoreFrom(story, live, points, kind)` returns the point's state,
exactly, with `attempt = live.attempt + 1`.
- A CHECKPOINT drops the retry point, because it belongs to the abandoned course of play.
- A RETRY keeps the checkpoint.

**In the game (`story-flow.js`).**
- Tracking happens only when the gate is on.
- The restore is one atomic swap of the state and points, saved immediately.
- It is then presented the way a load is: the chapter preloaded, the view rebuilt, and the point's
  unpresented text typed. For a checkpoint that is the arrival narration; for a retry there is
  nothing to type.
- The end-presentation module maps each control to one of the fixed actions `retry` and
  `checkpoint`, or to none.

### 2.2 Attempt-scoped dice

**Ordinary rolls are unchanged:** `1 + FNV-1a(seed + ':' + checkId) mod sides`, with no `attempt`
anywhere.

**After a RETRY or CHECKPOINT** the state carries `attempt = k` (1, 2, …), and every check resolved
from then on rolls:

```
1 + fmix32(FNV-1a(seed + ':attempt' + k + ':' + checkId)) mod sides
```

The resolved check records `attempt: k`, so `restore()` can re-derive and verify it.

**Why the finalizer.** Measured during development: FNV-1a alone leaves the low bit a plain XOR of
the input characters' low bits. With 6 sides the new roll's parity was locked to the old one's: the
same face came up 182 of 498 times (36%, against the expected 1/6). murmur3's `fmix32` finalizer
mixes every bit. Ordinary rolls do not use it.

**The resulting guarantees:**
- **Fresh:** a re-attempted check rolls in a namespace no earlier attempt used.
- **Independent:** measured over 498 retried failed unarmed checks, the same face came up 81 times
  (expected 83), and the faces are uniform (χ² = 4.82, 5 degrees of freedom).
- **May repeat:** a fresh attempt can land on the same face. That is not a defect.
- **Reproducible:** an attempt's rolls depend only on seed, attempt and check id. A save and reload
  inside an attempt reproduces every roll and never grants a new one, since `attempt` is saved and
  unchanged.
- **Monotonic:** a restore always sets `live.attempt + 1`, never the point's own value. Restoring an
  older snapshot therefore cannot reuse a namespace; six alternating restores give 1..6.
- **Earlier chapters untouched:**
  - a restore keeps every check result the point already holds;
  - the seed is never changed;
  - a Chapter 2 checkpoint keeps every House check exactly (tested at the rules level).

**Scope note.** Once a playthrough has used RETRY or CHECKPOINT, every check resolved later in it,
including ones never attempted before, rolls in the current attempt's namespace. Those checks had
no earlier roll in this playthrough, so nothing observable changes. Ordinary playthroughs never
enter a namespace.

### 2.3 Saves and compatibility

The `cyoa-save-v1` envelope gains one optional field:
`{ schema, story, version, state, cursor, points? }`. The state gains one optional field,
`attempt` (absent means 0). A check record may carry `attempt`.

| Save | Result |
|---|---|
| Saved with the gate off (before or after this change) | Byte-identical format: no `points`, no `attempt`. Loads as before. |
| Old save (no points) loaded with the gate on | Loads unchanged. RETRY becomes available from the next decision (the fatal one). CHECKPOINT shows unavailable until a chapter is entered with the gate on. |
| Tracked save loaded with the gate off | Loads (state with `attempt` and `attempt` rolls verified). Points are ignored, and the next save is written ordinary. |
| Content revision changed | `migrate()` migrates both points like the live state, and drops any it cannot keep. |
| Invalid point (another seed, a later attempt, a checkpoint not at a chapter start, malformed) | Dropped: its control becomes unavailable. **Never fatal to the save.** |
| Forged rolls | Refused, as before: a roll that does not match its seed and namespace; a check claiming an attempt the state has not reached; an explicit `attempt: 0`. |

**Sizes.** A tracked save holds up to three states: live, checkpoint and retry. Measured at the
voluntary death on the stapler route: 64,202 bytes against 24,165 for the ordinary save (2.66×),
well within localStorage.

The rules walk (`validateStory`) never sees `attempt` or points. The generated story is unchanged
(content `407d8ec78f1c`) and so is the state count (165,527).

## 3. Dependencies and open items

1. **Main menu (EXIT).** It needs its own work order. That should cover CONTINUE / resume from the
   autosave, and save-retention policy when leaving to the menu.
2. **Activation in ordinary play** still waits for the owner's gate. The final narrative text is
   also still provisional.
3. **Reload at a death** shows the presentation again, once per page and per attempt. This was
   noted on PR #11 and is still an owner decision.
4. **Other deaths** have no presentation and no RETRY / CHECKPOINT. They need their own art, copy
   and applicability decision. The rules mechanism is generic: `canRestore` and `restoreFrom` work
   for any ending, and an entry would only need data.

## 4. QA

### 4.1 New suites

**`game/qa/validate_death_controls.js` (Node): 39/39**

| Group | What is checked |
|---|---|
| Points are genuine | The checkpoint is the very entry state, and the retry point is the very pre-decision state. An inspect does not move it. A restart clears the points. A non-cause point is refused. |
| Exact restores | RETRY and CHECKPOINT restore exactly, with the fatal step's transcript, decision and items gone. Attempts run 1, 2, 3 across restores. A checkpoint drops the retry point. Missing or foreign points are refused. |
| Ordinary dice unchanged | Rolls equal the original formula across 200 seeds, with no attempt anywhere. |
| Fresh dice | Over 498 retried failed checks: uniform (χ² 4.82) and independent (same face 81, expected 83). The same face can occur. |
| Reproducible dice | A reload inside an attempt gives the same roll and the same attempt. Six alternating restores give attempts 1..6, never reused. |
| Chapters | A Chapter 2 checkpoint keeps every House check, item, flag and NOTES entry. Replayed Chapter 2 checks roll in the new attempt. |
| Saves | One envelope holds everything. A tracked save round-trips; an untracked save has the old format byte for byte; an old save loads. Invalid points are dropped while the save is kept. Forged, stripped and out-of-range attempts are refused. Migration carries the points. |
| Engine | Content and validator unchanged. Only `restoreFrom` writes `state.attempt`. |

**`game/qa/run_death_controls_qa.js`: 68/68 (Chromium 34, Firefox 34)**

Every expected state and roll is computed independently with Rules and compared with the game's own
state, its autosave and the screen.

| Scenario | What is checked |
|---|---|
| RETRY | Exact pre-decision state in attempt 1, with the chair's cards and art. The autosave is atomic. A reload neither rerolls nor adds an attempt. The checked choice rolls the attempt-1 roll Rules predicts, and the consequence follows that roll. |
| RETRY twice | Dying again presents again. A second RETRY gives attempt 2. |
| CHECKPOINT | Exact Chapter 1 entry, with the stapler held once. The arrival narration is presented again. The retry point is dropped from the save. The replayed stapler check rolls in attempt 1, exactly as predicted. A reload is identical. |
| EXIT | Muted ink `#7d9189` and `aria-disabled`. Activating it only explains itself: no URL change, no state or save change. |
| Old save, gate on | Loads unchanged. RETRY available, CHECKPOINT unavailable and explained. RETRY works. |
| Tracked save, gate off | Loads. The ordinary ending, with only BEGIN AGAIN. The next save is written ordinary. BEGIN AGAIN does a full restart with no attempt. |
| Gate off, fresh game | No points and no attempt in saves. Restore is unavailable. |

Screenshots (20): `game/qa/death_controls_screenshots/`. They are not committed; CI keeps them in
the `qa-browsers` artifact.

**`game/qa/run_end_presentation_qa.js` (PR #11's proof suite, updated): 96/96 (Chromium 45,
Firefox 45, engine 6)**
- **Changes for live controls:**
  - saves now come from tracked playthroughs;
  - it checks the owner labels and their availability;
  - the isolation checks press the inert EXIT, never a live control;
  - A1 parity reports the control label faces separately.
- **A1 parity:** still 0 of 894,544 popup pixels differ outside the title row and the label faces.
  The label faces differ by 1,596 px: CHECKPOINT replaces the mockup's middle label, and EXIT is in
  the muted ink.
- **Backdrop and capture:** both unchanged from PR #11.

### 4.2 Regression (local, macOS)

| Suite | Result |
|---|---|
| importer `--check` / `--verify` | VALID / OK. Content `407d8ec78f1c` unchanged; 165,527 states, ~29 s, ~0.5 GB. |
| glyph ink | OK |
| `validate_route` v1 / v2 | 49/49 / 49/49 |
| `validate_story` (rules, fixtures, 59 mutants, saves) | 178/178 |
| `validate_story_import` (incl. content independence) | 92/92 |
| `validate_ch02_routes` | 157/157 |
| `validate_ch01_art` | 253/253 |
| `validate_assets` static / browser | 59/59 / 97/97 |
| storyboard smoke / browser | PASS / 24/24 |
| `run_story_qa` | 124/124 |
| `run_ch01_routes_qa` | 154/154 |
| `run_ch01_art_qa` | 164/164 |
| `run_ch02_routes_qa` | 346/346 |
| `run_end_presentation_qa` | 96/96 |
| `run_death_controls_qa` | 68/68 |
| Polish lab | 143/143 |
| Layout lab | 1916/1924: exactly the 8 known failures |
| M2 reception `run_qa` | 521/528 locally. Static 44/44, Chromium 242/242, Firefox 235/242. |

**The 7 Firefox M2 failures** are the same choice-scroll checks that also failed locally on the
untouched PR #10 head (docs/94 §5.2). That suite runs `?story=reception` on the v1 flow, which never
runs this code. CI on Linux is the arbiter; PR #11's CI passed 528/528.

## 5. Review it

```bash
cd "_worktrees/CYOA-rest-assured-death-controls" && python3 -m http.server 8000
```

Start with `http://localhost:8000/game/index.html?new&deathproof`. Play from the start with the gate
on, so a chapter-entry snapshot exists.

1. **Get to the chair.**
   1. In the Prologue, keep the stapler at intake.
   2. In the House, allow housekeeping, ask for the bathroom, and recover your belongings.
   3. Try the Rest Assured chair and sit down.
2. **RETRY.** Choose STOP STRUGGLING AND ACCEPT THE FULL TREATMENT, then press RETRY. You are back at
   the chair with everything as it was. Try the stapler: its roll is fresh.
3. **CHECKPOINT.** Die voluntarily again and press CHECKPOINT. You are back at the House arrival with
   your Prologue items, including the stapler, once. Replay the chapter: its checks roll fresh.
4. **EXIT.** It explains that the main menu does not exist yet.
5. **Reload** at any point: the same state comes back, with no new roll.
6. **Without `deathproof`:** the ordinary game, with BEGIN AGAIN.
