# CYOA — Engine v0 S1 + S2: Story-v2 Rules, Checks and Saves

**Date:** 2026-11-08
**Status:** S1/S2 **passed PMO architecture review** (docs/80 on `docs/story-gameplay-study-v01`). S2.1 owner-decision alignment added 2026-11-09 (section 7), for PMO review. **Not merged** into M2 or main. S3 (renderer integration) has not started.
**Branch:** `agent/engine-v0-rules`, from `origin/agent/m2-reception-polish-lab` at `e66e7bf` (its remote head on 2026-11-08).
**Authority:** [72 — General Adventure Engine Foundation](https://github.com/InterstellarHarvest/CYOA/blob/agent/engine-foundation-design/docs/72_GENERAL_ADVENTURE_ENGINE_FOUNDATION_V01.md) (`53205b6`), gated by 73 — Engine Foundation PMO Review and S1/S2 Gate (`docs/story-gameplay-study-v01`). This branch's 74 is free on both doc lines.

## 1. What changed

| Path | Change |
|---|---|
| `game/js/rules.js` | **Added** the story-v2 half: schema, `fromV1`, `begin`/`step`/`view`, checks, saves, `validateStory`. The v1 half above it, which the game and the polish lab still run on, is **byte-identical** to `e66e7bf`; only the export list grew. |
| `game/qa/validate_story.js` | **New** Node suite: reception compatibility, the fixture, checks, saves, the presentation contract and 59 mutant checks. Writes `story_results.json`. |
| `game/qa/validate_route.js` | Gained `--v2`: the same 49 checks against the v2 engine, written to `route_results_v2.json`. Without the flag it behaves and writes exactly as before. |
| `game/qa/v1_on_v2.js` | **New**, QA only: the v1 API re-implemented over `fromV1` + `begin`/`step`/`view`, so the route suite can run unchanged on v2. |
| `game/qa/fixtures/engine_fixture.js` | **New**, QA only: docs/72's neutral fixture. Engine test content, not canon, never loaded by the game. |
| `game/qa/fixtures/endings_fixture.js` | **New in S2.1**, QA only: one shared incident, two independent chapters, two authored endings, plus the risk-marker cases (section 7). Not canon. |

**Untouched:** `stage.js`, `flow.js`, `main.js`, `pixeltext.js`, `tuning.js`, `placeholders.js`, `content/reception.js`, all art, UI assets, the polish lab and every other worktree. No browser storage, autosave or seed UI is wired.

## 2. API (final for S1 + S2)

Everything is exposed on `Rules` (`window.CYOA_RULES` in the browser, `require('game/js/rules.js')` in Node).

### 2.1 Functions

| Function | Returns | Notes |
|---|---|---|
| `fromV1(content, opts?)` | a `cyoa-story-v2` story | Reception as one chapter `reception` with scene `conference_hall/reception`, cast `receptionist`, `save: false` and `compat: 'v1'`. Every choice and SHOW/USE entry is `kind: 'spoken'`, except BEGIN AGAIN, which is `system`. Strings are kept exactly, brackets included. |
| `begin(story, { seed? })` | `{ state, events }` | A fresh playthrough. `seed` defaults to `'0'`; production must pass a fresh random one (S8). |
| `step(story, state, input)` | `{ state, events }` | One committed action. **Pure:** `state` is never modified. Throws on an unavailable or unknown input, and nothing is committed. |
| `view(story, state)` | the read model (2.4) | Pure. |
| `validateStory(story, charset?)` | `{ ok, errors, stats }` | Shape first, then a walk of every reachable state (section 3). |
| `serialize(story, state, { savedAt?, presented? })` | JSON text | The save envelope (2.6). The rules read no clock: `savedAt` is whatever the caller passes. |
| `restore(story, saved)` | `{ ok: true, state, cursor }` or `{ ok: false, reason }` | Never throws, and never half-migrates. |
| `resume(story, state, cursor?)` | `{ from, elsewhere, events }` | What to re-present after a restore (2.7). |
| `describe(story, state, itemId)` | text | The item description variant for this state. |
| `holds(cond, state)` | boolean | v1 conditions plus `passed`, `failed` and `untried`. |
| `paras(text, ctx)` | paragraphs | Normalises TEXT into `[[{ role, who, text }]]`. |
| `roll(seed, checkId, sides)`, `chance(check, bonus)` | number | The roll and the exact odds. |
| Constants | | `STORY_SCHEMA`, `STATE_VERSION` (2), `SAVE_SCHEMA` (`cyoa-save-v1`), `MODES`, `KINDS`, `HISTORY` |

**Inputs to `step`:**
- `{ choice: id }`
- `{ item: id, verb: 'inspect' | 'read' | 'show' | 'use' }`
- `{ context: true }`

Anything else throws. `{ continue: true }` gets its own message, because presentation-only CONTINUE is never a rules step.

### 2.2 Schema

The schema is docs/72 section 2, with these additions and clarifications:

- **CHOICE** = `{ id, kind, text, say?, if?, effects?, once?, result?, check?, pass?, fail?, to? | back? | chapter? | restart? }`.
  - With a `check`, the destination and the result live only in `pass` and `fail`, and both outcomes are required.
  - `OUTCOME` = `{ result?, effects?, to? | back? | chapter? }`.
- **ENTRY** (SHOW/USE) = a CHOICE without `id` and `text`, and without `restart`.
  - `kind` defaults to `spoken` for SHOW and `action` for USE.
  - In a dialogue node an ENTRY needs `say`, the line echoed in the dialogue box. In B or A, `say` is rejected, because it would never be shown.
- **CHECK** = `{ id, sides: 6 | 100, need, fumble?, mods?: [{ if?, add }], cap?, certain? }`.
  - Success: `raw > fumble` and `raw + clamp(Σadd, ±cap) >= need`.
  - `raw = 1 + FNV-1a32(seed + ':' + id) mod sides`.
- **TEXT**:
  - A list is treated as **variants** only when every element is an object with a `text` key; otherwise it is **runs**.
  - Mixing the two forms is rejected.
  - Run `who` is only for `say`. It defaults to the dialogue speaker in a dialogue context, and to `you` elsewhere.

### 2.3 State (`v: 2`, everything a save holds)

| Field | Meaning |
|---|---|
| `v`, `story` | State version (2) and story id. |
| `chapter`, `node`, `returnTo` | Position. `returnTo` is the narrative node that opened the current Focus or dialogue excursion, or `null`. |
| `flags`, `inventory`, `items` | As v1. |
| `objective` | The plaque text. |
| `transcript` | **One entry per paragraph shown**: `{ n, src: text \| echo \| result \| thought, mode, chapter, scene, node, runs: [{ role, who, text }] }`. `n` is the step that produced it. |
| `presentFrom` | The first transcript entry the latest step produced. |
| `steps` | The number of committed steps. |
| `taken` | Decision log: `{ n, at, c }` for choices, `{ n, at, item, verb }` for SHOW/USE, plus `check` and `ok` when a check was resolved. `once` reads it. |
| `contextDone` | As v1. |
| `checks` | `{ id: { roll, bonus, ok } }`. A resolved check is never rolled again. |
| `seed` | The playthrough's seed. Rolls derive from it. |

### 2.4 View

```js
{ story, chapter, title, node, mode, scene, speaker, portrait: { cast, id, background, pose } | null, focus, returnTo, end,
  cards: [{ id, kind, text, hasCheck }],  // hasCheck: a hidden roll decides it (S2.1); no other check data
  items: [{ id, read, show, use, showHasCheck, useHasCheck }],   // SHOW is false outside dialogue
  context: { id, label, glyph, spent, spentWhy } | null,   // dialogue mode only
  objective, files: [text],
  history: { dialogue: [i], narrative: [i], focus: [i], notes: [i] } }   // transcript indices, per HISTORY
```

`HISTORY` (one constant):
- the dialogue and B windows reset when the scene changes (docs/72 section 3.6);
- the A window is the current visit;
- **NOTES is the whole playthrough** (owner lock [76], S2.1): every chapter, scene and surface, in order. BEGIN AGAIN starts a new playthrough, so a new NOTES.

`hasCheck`, `showHasCheck` and `useHasCheck` (owner lock [74], S2.1) say only that the outcome depends on a hidden roll. They come from the authored `check` alone, never from `kind` or wording, and they are false when the action is unavailable. They stay true when bonuses make a check certain, because a marker that disappeared at 100% would leak the odds. The view carries no die, target, odds, modifier, bonus, seed, roll, outcome or check id. (The step's `check` event does carry them, for logs and QA; the renderer shows no roll or odds by default.)

### 2.5 Events, in commit order

**`begin`:** `chapter`, `scene`, `mode`, then the arrival.

**Choice or SHOW/USE `step`:**
1. `check`
2. `items` and `objective` from the choice's and outcome's effects
3. `echo` (dialogue mode, `spoken` or `action` only)
4. `chapter`, `scene` and `mode` (whichever changed)
5. `text` for the result, on the destination surface
6. The arrival, if any: `items` and `objective` from the node's effects, then `text`, then `end`

**BEGIN AGAIN:** `restart`, then the `begin` events of a new playthrough. Its seed is derived from the old one.

**Others:**
- READ: only `items` and `objective`.
- Inspect: nothing.
- Context action: one `text` holding a thought.

The `items` and `objective` events are emitted **where their effects happen**. So a gift on arrival announces with the arrival, as v1's item slip does today.

```js
{ t: 'chapter', id, title }   { t: 'scene', id }   { t: 'mode', from, to }
{ t: 'check', id, sides, roll, bonus, need, ok, chance }
{ t: 'items', gained, lost }  { t: 'objective', text }
{ t: 'echo', role: 'speech' | 'action', who: 'you', paras }   { t: 'text', surface, paras }
{ t: 'end' }   { t: 'restart' }
```

### 2.6 Saves

The envelope is `{ schema: 'cyoa-save-v1', story, version, savedAt?, state, cursor?: { presented } }`.

`restore` refuses a save with a reason if any of these hold:
- a different schema, story or story version;
- a state version other than 2;
- a missing or extra state field;
- an unknown chapter or node, or a `returnTo` that is not a narrative opener of the current excursion;
- flags that are not exactly the declared ones;
- an unknown or repeated inventory item, or an unknown mark;
- a malformed transcript or decision log, or `presentFrom` outside the transcript;
- an unknown check id;
- a resolved check whose roll is not the one its seed gives, or whose outcome does not follow from its roll and bonus.

### 2.7 Presentation contract (docs/73 C3)

1. **One commit per action.** `step` returns the whole next state before anything animates, and the caller swaps it in. The flow saves only after a commit: never on a presentation-only CONTINUE, a scroll or an overlay.
2. **Text is stored once.** Every paragraph is stored once, in order, tagged with its step. Restoring never adds to the transcript, the log or the step count.
3. **The safe point.** The cursor `{ presented }` is presentation data. It is saved beside the state, never inside it.
   - The safe point is `max(presentFrom, presented)`, clamped to the transcript.
   - It is measured in whole paragraphs: a paragraph that was part-typed types again from its start.
4. **What `resume` replays.** It returns `text` and `echo` events for the entries from the safe point that are on the **surface now showing**.
   - Earlier unpresented entries from another surface are listed in `elsewhere`. An example is the echo in the dialogue box before a step moved to B. They remain in the history and NOTES.
   - `resume` never replays effects, checks, item slips or objective changes. The restored state already holds them, and an item slip that was cut off by the reload is not re-announced.
5. **Choices wait.** Cards come after the replayed events, exactly as they come after a step's events. Browser proof of this is S8 (EF-B9).

### 2.8 Fatal outcomes (docs/73 C1)

No fatal outcome, retry or checkpoint exists.
- A save is the state **after** its step, so it is never a pre-fatal checkpoint.
- The owner has since chosen retry from the last protected safe checkpoint for fatal ends ([75]). That is a separate, later save-and-retry contract, and not in S1/S2/S2.1.
- An **authored ending** is a node marked `end: true`, nothing more. There is no `fatal` field: the validator rejects one as unknown.

## 3. Validation

`validateStory` checks the authored shape, then walks every reachable state.

**Shape:**
- **Story structure:** unknown keys; kinds; destinations, at most one per choice; `to` within the chapter; `back` only in focus or dialogue.
- **Text:** run keys, exactly one role per run; `think` runs reserved for the thought contract; `who`; variant lists with an unconditional last variant; quotes or brackets authored in card text (unless `compat: 'v1'`); every character in the font charset.
- **Behaviour:**
  - a stay must have `once`, a check or effects;
  - `say` only where it is echoed;
  - SHOW only in dialogue nodes, and the context action only in dialogue nodes;
  - a dialogue node needs a cast speaker; a focus node needs a registered focus id;
  - chapter start nodes are narrative or dialogue;
  - `restart` only as a system choice on an end node.
- **Assets:** registered ids; registered assets that are never used; null art only in the `fixture` profile; no `source/`, `originals/` or `review/` paths in production. File existence and PNG sizes are S3's `validate_assets.js`.
- **Checks:**
  - **check ids unique across the whole story**: every chapter, choice and SHOW/USE entry (C2);
  - sides 6 or 100; a valid `need`, `fumble` and `cap`; no mod that adds 0;
  - a base chance of 0% is rejected;
  - **mods that could reach 100%** are rejected unless the check is `certain`. This guard is conservative: it adds every positive mod together, even mods whose conditions cannot hold at once;
  - `pass` and `fail` are required with a check and forbidden without one;
  - `passed`, `failed` and `untried` must name a known check.

**Walk:**
- The state key is v1's, plus the chapter, `returnTo`, spent `once` entries and each check's outcome (not its roll).
- **Both outcomes of every check** are explored wherever each is possible.
- It fails on:
  - a dead end, or a state from which no authored ending (an `end: true` node) is reachable. Since S2.1, reaching an end node is what counts as finishing; it no longer depends on the state offering BEGIN AGAIN. For the reception and the engine fixture the two give identical results and stats;
  - an unreachable node or never-available choice or entry;
  - a variant never shown: text, result, objective, description or FILES entry;
  - a check outcome that never happens;
  - an item never held;
  - a `back` choice reachable with no opener.

## 4. QA results

| Suite | Result | Notes |
|---|---|---|
| `node game/qa/validate_route.js` (v1, unchanged) | **49/49** | Stats unchanged: 15 nodes, 23 choices, 449 states, 1 ending, 96 ending states. `route_results.json` is byte-identical. |
| `node game/qa/validate_route.js --v2` | **49/49** | The same 49 checks, including the 15 v1 mutants, run on `fromV1` + `begin`/`step`/`view`, with the same stats. **EF-N1.** |
| `node game/qa/validate_story.js` | **146/146** (S2); **176/176** after S2.1 | Six groups (below), plus three S2.1 groups (section 7). |
| Game browser QA `run_qa.js` | **519/520**, the same as the untouched base | See 4.1. |
| Polish-lab browser QA | **141/141** | See 4.1. |

The `validate_story.js` groups:

- **Reception, 12 checks.**
  - A lock-step comparison of **all 449 reachable reception states** with v1. Cards, item verbs, descriptions, FILES, the context action, objective and state are identical.
  - Over **every move from them** (choices, READ, SHOW, USE, OBSERVE, restart), the lines written are identical and `presentFrom` sits at the step start.
  - `fromV1` registers exactly the art paths `stage.js` draws.
- **Fixture, 40 checks.** EF-N2, N4, N9, N10 and N11.
  - Event order for begin, stays, dialogue echoes, B results, B→A→B, dialogue→dialogue→B, scene, focus-outcome and chapter changes.
  - Conditional effects in both orders, USE in B, SHOW refused in B, continue and system kinds, restart.
  - Purity and atomicity, history windows, and the decision log.
- **Checks, 18 checks.** EF-N4, N5 and N6.
  - Exact odds of 3/6, 4/6, 4/6 and 5/6. Both outcomes occur for every preparation over seeds 1–200, and the item raises the measured rate.
  - The same seed gives the same result, independent of the order of play.
  - The bonus is computed before effects that take the item, with no re-roll after a resolve, a restore or a revisit.
  - d100: 45% and 65%, measured within 4 points over 2000 seeds, with a 95% ceiling. The d6 faces are even over 6000 seeds.
- **Saves, 9 checks.** EF-N7 and N8.
  - Round trips of 1,110 intermediate states.
  - **90 complete playthroughs saved and restored before every step, identical in state and events** to uninterrupted runs.
  - 60 random 40-step walks, restored at random points, with no divergence.
  - 23 corrupt, foreign or outdated saves, each refused with a reason and no throw.
  - The rules read no clock or random source.
- **Presentation, 8 checks.** The docs/73 C3 contract.
  - A reload at every paragraph replays exactly the rest.
  - A resume after a check replays text only, and repeated restores are idempotent.
  - In dialogue, the echo is replayed before the direction; on a cross-surface step, the echo goes to `elsewhere`.
  - The cursor is clamped.
  - Pacing changes nothing, and an authored continue is committed once.
- **Mutants, 59 checks.**
  - 39 S1 shape and route mutants and 18 S2 check mutants.
  - One check that the odds guards still fire next to an unrelated error.
  - A positive control: a `certain` check with the same mods is accepted.
  - **Each mutant was inspected and is rejected for its intended reason.**

### 4.1 Browser regression

The game loads `rules.js`, so the full browser suites were run on this branch. For comparison, they were also run on a throwaway detached checkout of the untouched base `e66e7bf`, on the same machine and in the same session.

| Suite | Untouched `e66e7bf` | This branch (S2, final) |
|---|---|---|
| Game QA (static + Chromium + Firefox) | 519/520 | 519/520 (first S2 run); 518/520 (final run) |
| Polish-lab QA | 141/141 | 141/141 |

**The only failing check, on both base and branch:**
- It is "early dismiss during fade-in" (the item-slip fade, docs/62 §12), a wall-clock timing measurement.
- On the base it failed in Firefox. On the branch it failed in Firefox in both runs, and in Chromium in one run only.
- It was already recorded as machine timing on earlier commits (`eb4911d`).
- The rules cannot affect it: the game still runs the v1 functions, which are byte-identical.

**Screenshots:**
- 23 of the 30 screenshots are byte-identical between the base run and the branch run.
- In the other 7, every differing pixel lies in a timing-dependent region:
  - the typing position: `00f`, `01`, `09`;
  - the dialogue thumb at x1899: `10`;
  - cards in motion: `00h`, and `02_send_in_flight`;
  - the item-slip fade: `05b`.
- The base's own rerun differs from its committed screenshots in the same kinds of captures (9 files).
- The regenerated browser outputs are therefore **not committed**. `game/qa/qa_results.json` and the screenshots stay at their `e66e7bf` versions.

**First run discarded:** an earlier base run, under a load average of about 40 from another session's browsers, aborted at 154/176 on typing-timing checks. It was discarded, and every number above comes from runs under normal load.

**Boot smoke** after S1: `game/index.html` reaches `ready=true` with no console errors in Chromium and Firefox. `CYOA_RULES.step` is present, and the reception opens as before.

## 5. Architecture adjustments required by the code

1. **`step` returns `{ state, events }` and never mutates.** docs/72 sketched a mutating `step → events`. Returning a new state is what makes "commits once, or not at all" true by construction: a refused step throws before anything is committed, and the caller swaps the new state in.
2. **The v1 API is not rewritten as wrappers over `step` yet.** The game, the polish lab and `stage.js` read v1's state shape (`transcript` as `{ who, text }`). Rewriting the API now would change shipped behaviour inside a rules-only step.
   - Instead the v1 half stays byte-identical, and equivalence is proved twice: by the full lock-step comparison, and by the route suite running on v2 through a QA-only adapter.
   - The flow moves to events at S4.
3. **`holds()` instead of extending v1's `test()`.** It keeps the v1 half byte-identical.
4. **Transcript entries are paragraphs with their step number.** docs/72 sketched per-run entries.
   - Paragraph granularity is the resume safe point, and `n` groups a step's entries for replay.
   - `steps` was added to the state.
5. **The presentation cursor sits outside the state** (`cursor.presented` in the envelope), so presentation never changes story state. `resume` replays only the surface now showing (`elsewhere`, 2.7).
6. **`items` and `objective` events are emitted at each effect point**, not once per step, to keep v1's item-slip timing (choice-time versus arrival-time gifts).
7. **The rules hold no clock and no random source.**
   - The caller supplies the seed (the default is `'0'`).
   - BEGIN AGAIN derives the next seed (`FNV(seed + ':restart')`).
   - `savedAt` is whatever the caller passes.
8. **`restore` validates every field**, including that each resolved roll matches its seed. docs/72 listed version, node, flags and items.
9. **The validator covers more than docs/72 listed.**
   - From the list above, these are additions: `say` where it is never echoed, USE in dialogue without `say`, a context action off dialogue, a back with no opener, unused registered assets, `think` reserved, `who`, an item never held, and check-outcome coverage.
   - File and PNG checks stay in S3.
10. **`fromV1` registers reception's art paths in `rules.js`.** This duplicates `G.RECEPTION_ART`, and a QA check fails if the two differ. S3 makes the story the only copy.
11. **The fixture lives in `game/qa/fixtures/` (QA-only), not `game/content/fixture/` (S7).**
    - One fixture fix: `lift` now sets `scene: 'fixture/room_b'`. docs/72's draft fell back to room A, so the engine emitted a scene change back to room A between the corridor and its own lift.
    - The walker counts 602 fixture states, where docs/72's throwaway walker counted 342. This key includes item marks (as v1's does) and spent `once` choices.

## 6. Not done here, and next

(Written at the S1/S2 checkpoint. For the S2.1 state of the open decisions, see section 7.4.)

**Not done:** browser saves and storage, `?seed`, `?new`, `?nosave`, asset files, renderer, flow, inks, surfaces, Narrative B and Focus A on screen, the fixture page, and any reception migration. These are S3–S9.

**Before S3:**
- PMO review of this checkpoint.
- M2 PMO coordination, because S3+ touches `stage.js`, `main.js` and `flow.js`.
- Rebase onto the M2 line after Round 2 lands. S1/S2 touch only `rules.js` and QA, which Round 2 does not change.

**Owner decisions still open (none blocks S3):**
- O1: dice and visibility. The fixture uses hidden d6 as a testing default.
- O2: save cadence and the fatal or retry policy (see 2.8).
- O3: history windows (the `HISTORY` constant).
- O4: the B overlay.
- O5: a chapter title beat.

## 7. S2.1: owner-decision alignment (2026-11-09)

docs/80 (`docs/story-gameplay-study-v01`) accepted S1/S2 and asked for three narrow deltas before S3. Only `rules.js` (v2 half), `validate_story.js`, the new endings fixture and this document changed; the v1 half of `rules.js` is still byte-identical to `e66e7bf`.

### 7.1 What changed in the rules

| Owner lock | Change |
|---|---|
| [76] NOTES = entire playthrough | `HISTORY.notes` is now `'all'`, a new anchor at transcript index 0. Dialogue/B scene windows and the Focus A visit window are unchanged. No schema or save change: the full transcript was already saved. |
| [74] Risk marker | `view().cards[]` gained `hasCheck`; `view().items[]` gained `showHasCheck` and `useHasCheck`, beside the unchanged `show` / `use` availability booleans. See 2.4. |
| [78] Independent endings | The validator's "an ending is reachable from every state" proof now starts from states on an `end: true` node rather than states offering BEGIN AGAIN. `stats.endingsReached` (distinct end nodes reached) is new. Reception and the engine fixture give the same results and stats as before. |

### 7.2 The endings fixture

`game/qa/fixtures/endings_fixture.js`: hall → desk (a dialogue) → **the incident** (a fire bell), from which `follow-clerk` departs into chapter `ie_archive` and `take-exit` into chapter `ie_street`. A checked USE of the pass at the incident is itself a departure: pass → archive, fail → street. Each chapter has its own `end: true` node, and nothing leads back. The desk carries the risk cases: a checked spoken bluff, an unchecked spoken line, an unchecked action and a checked SHOW. Hidden d6 throughout. It validates with 3 chapters, 7 nodes, 266 reachable states, 2 endings (both reached) and 3 checks.

### 7.3 QA

| Suite | Result |
|---|---|
| `validate_route.js` (v1) | **49/49**; `route_results.json` unchanged |
| `validate_route.js --v2` | **49/49**; stats as before plus `endingsReached: 1` |
| `validate_story.js` | **176/176**: the 146 before (one assertion updated for each of NOTES and the card shape) plus 30 new |
| Game browser QA | **520/520** (the timing-flaky "early dismiss during fade-in" passed on this run; it is still timing debt, see 4.1) |
| Polish-lab browser QA | **140/141** on the first run, then **141/141** on two reruns. The one failure was Firefox reporting `art/ui/shell/layout-final.png` as "corrupt or truncated"; that file is byte-identical to the base and the lab never reads the v2 half. Treated as a decode flake, not a regression. |

The regenerated browser results and screenshots were not committed (as in 4.1).

New `validate_story.js` groups:
- **notes, 10 checks.** NOTES is the whole transcript at every step of a two-chapter run, including chapter one's room and keypad text after the chapter change. B resets per scene (inside a chapter and at a chapter change) and Focus A stays per visit. After a restore at the ending, and from a save made in chapter one then continued into chapter two, NOTES and state are identical to an uninterrupted run. BEGIN AGAIN starts a new NOTES. On the three-chapter endings fixture, NOTES after a restore holds hall, desk and archive in order. In the reception (one chapter, one scene), NOTES and the dialogue window are the whole transcript, as before.
- **risk, 10 checks.** Checked action marked and unchecked action not (keypad). Checked spoken bluff marked; unchecked spoken and action not (desk). Checked SHOW and checked USE marked through `showHasCheck` / `useHasCheck`, with the availability booleans unchanged. An unchecked USE is unmarked. The marker follows the check, not kind or words: the keypad as a spoken line stays marked, and the bluff's words without a check are unmarked. A check made certain keeps its marker. Over 100+ views on both fixtures and both outcomes, no check data appears anywhere in the view. The reception never marks anything.
- **endings, 10 checks.** The validator accepts the fixture. Every check goes both ways. The incident reaches both paths, and every route out of the hall passes through it. The two paths share no node, never return to the hall, and each reaches its own ending. Both endings are ordinary ends (an `end` event, `view.end`, only BEGIN AGAIN). A check outcome can be the departure. Negative controls: a street path that rejoins the archive still validates (braiding is legal) but the independence check reports it; a path that circles forever is rejected ("cannot reach an ending"); a `fatal` field is rejected; a terminal node not marked `end` is rejected.

Mutation check: setting NOTES back to `'chapter'` fails 5 checks; dropping `hasCheck` fails 5; dropping `useHasCheck` fails 1.

### 7.4 Decisions now locked, and still not done

- [76] NOTES: done here.
- [74] Risk marker: rules data done here. The pixel icon, its placement and any narrative foreshadowing are renderer and content work (UI lab review), not rules.
- [78] Independent endings: proven here. A non-restart terminal UI, if wanted later, needs its own contract.
- [75] Fatal → retry from the last protected checkpoint: a later save-and-retry contract. Not started.
- [77] Chapter-boundary dossier: renderer/flow. Not started.
- D6 is the owner-preferred die. d100 stays supported.
- S3 remains on hold until M2 Round 2 lands and the M2 PMO coordinates.
