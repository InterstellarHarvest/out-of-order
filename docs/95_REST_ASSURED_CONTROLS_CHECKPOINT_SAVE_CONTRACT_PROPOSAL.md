# 95: Proposed death-screen controls, checkpoint and save contract

> **Superseded in part (2026-11-16).** The owner rulings on PR #11 locked:
> - the labels RETRY / CHECKPOINT / EXIT;
> - RETRY = the state before the fatal decision;
> - CHECKPOINT = the chapter-entry state;
> - fresh, independent dice for re-attempted checks;
> - EXIT = the future main menu, shown unavailable for now.
>
> These are implemented, review-gated, in docs/96. The sections below are kept as the record of the
> proposal.

**Status: PROPOSAL ONLY. NOT APPROVED, AND NOT IMPLEMENTED.**

This document answers the death brief, docs/93 sections 5 and 6, recorded on branch
`agent/design-deaths-transitions-ch01-art-audit-20261115` at `8301daa`. It needs an owner ruling.

What is in place today:
- The review proof (docs/94) draws the three approved control footprints, labelled as
  provisional previews. Activating them performs **no** game action.
- The authored ending keeps its one working `BEGIN AGAIN` card, which restarts the playthrough.

Nothing in this document is active. Wherever a choice is needed, the options are listed; a
recommendation is given but not decided.

## 1. What exists today (facts the proposal builds on)

**The rules engine.**
- Rolls are deterministic: `1 + FNV-1a(seed + ':' + checkId) mod sides`.
- The seed is fixed per playthrough. A fresh random seed is drawn only at a new game.
- A resolved check is stored in `state.checks` and is never rolled again. A deliberate retry has to
  be a **new check id**.
- So a "retry" that keeps the seed and replays the same check gives the same result.

**Saves.**
- There is one autosave per story, `cyoa-save:<story>`. It is written after every committed rules
  step: the whole state plus a presentation cursor.
- There are no checkpoints and no save slots.
- A content change migrates the save, or refuses it and keeps it as `:refused`.

**The current ending.**
- `exit_chair_fatal` is an `end` node. Its only card is the system choice `restart_chair_death`
  (`restart: true`).
- Taking that card starts a fresh playthrough: Prologue start, a new seed, an empty inventory and a
  new NOTES. It is autosaved like any other step.

**Cause.**
- `Rules.endCause(state)` (docs/94) reports the arriving choice, and its check id and outcome when
  it had one.
- Three causes share the one ending node:
  - voluntary (`accept_permanent_rest`, no check);
  - failed stapler check;
  - failed unarmed check.

## 2. Decisions the owner needs to make

### 2.1 Labels (the positions are already approved)

| Slot | A1 placeholder | Function, if adopted (proposed) |
|---|---|---|
| 1 (left) | RETRY | Return to the decision before the death (section 2.2). |
| 2 (centre) | BEGIN AGAIN | New playthrough: today's authored restart (section 2.4). |
| 3 (right) | EXIT | Leave the run without restarting (section 2.5). |

**Owner decides:** the final words, or whether any slot is hidden or replaced for a given cause.

### 2.2 RETRY: target and eligibility

| Option | Behaviour | Notes |
|---|---|---|
| A. Retry the decision (recommended) | Restore the state **before the fatal choice** (`chair_locked`, as it was when the player stood there). | Uses the log that already exists, so no new save format. Only the step that led to the ending is undone. |
| B. Chapter checkpoint | Restore the state at **chapter entry** (here, `house_arrival` with the Prologue's results). | Needs a checkpoint snapshot written when a chapter starts: one more storage key. Loses all Chapter 1 progress. |
| C. No retry | Slot 1 hidden or disabled for this death. | Simplest. Leaves only BEGIN AGAIN or EXIT. |

**Eligibility (proposed for A):** offer RETRY only when the arriving step came from a node that is
not itself an ending, and the cause has an authored retry policy. For the voluntary death this is
`chair_locked`.

**Owner decides:** A, B or C, overall and per cause.

### 2.3 Seed and dice policy on RETRY

| Option | Effect on the two checked causes | Notes |
|---|---|---|
| 1. Keep seed, keep the resolved check | Retrying a failed stapler or unarmed check offers no new roll: the card is gone, because the check has resolved. | This is how the engine already works. The voluntary choice has no check, so it is unaffected. |
| 2. Keep seed, forget the failed check (recommended if retry should give a second chance) | Restoring the pre-choice state also removes that check's result. The **same seed** then gives the **same roll**, so the player fails again. | Honest but frustrating; it is only useful if something else changes (another item, another choice). |
| 3. Re-roll | Derive a new roll for the retried check (for example `seed + ':retry:' + n`), recording the retry count in state. | Needs a rules change (a retry counter, or a new check-id convention) and a save-schema change. Breaks "the roll depends only on seed and check id". |

**Owner decides:** whether a retry may change a dice outcome. If yes, choose 3, which needs its own
engine work order.

### 2.4 BEGIN AGAIN

**Proposed:** exactly the current authored `restart: true` behaviour:
- a fresh playthrough from the story start;
- a new random seed;
- empty inventory and flags;
- a new NOTES;
- the autosave overwritten by the new game's first step.

No other save or slot is touched.

**Owner decides:** whether BEGIN AGAIN restarts **the whole story** (as today) or **the current
chapter**. A chapter restart needs the checkpoint in 2.2 B.

### 2.5 EXIT

| Option | Behaviour |
|---|---|
| A. Title / menu (recommended once a title screen exists) | Leave to a title screen. The autosave stays on the death state, so CONTINUE would show the ending again. |
| B. Close to the ending | Same as the review proof's Escape: dismiss the overlay and leave the authored ending card on screen. |
| C. Hide | No EXIT until a title screen exists. |

There is no title or menu screen in the game today. Until there is one, EXIT has no meaningful
target.

### 2.6 Autosave behaviour around a death

**Proposed:**
- Reaching the ending autosaves it, as today.
- Opening or closing the death screen never writes.
- RETRY (2.2 A) writes the restored pre-choice state as a normal step, so a reload resumes at
  `chair_locked`.
- BEGIN AGAIN writes the new game.
- No death clears or deletes any save on its own.

**Open question:** should a reload while standing at a death show the death screen again, or the
plain ending? The review proof shows it again, once per page.

### 2.7 Per-cause presentation

`end-presentations` entries are already keyed by cause. For the two unillustrated causes the
proposal is:
- keep the ordinary authored ending (today's behaviour) until their own art and copy are approved;
- then add entries with their own control policy. For example, a failed check might offer RETRY
  only under 2.3 option 3.

### 2.8 Activation in ordinary play

The gate (`?deathproof`) stays the only way to see the death screen until all of the following are
true:
- the owner approves the labels;
- the owner approves 2.2–2.6;
- the chosen mechanics are implemented and tested;
- PMO signs off.

Then the data entry's status changes, and the gate is replaced by the approved activation.

## 3. Implementation sketch for the recommended set (for estimation only)

- **RETRY (2.2 A + 2.3 option 1 or 2):**
  - a new rules input `{ retry: true }` at an ending with an eligible cause;
  - it rebuilds the pre-choice state by replaying the log, or from a one-step snapshot kept in the
    state;
  - it commits as one step with an event, and is autosaved.

  It needs validator coverage (every ending's retry target reachable and alive) and save-migration
  rules.
- **BEGIN AGAIN:** dispatch the existing `restart` choice; no engine change.
- **EXIT:** blocked on a title screen (separate work order).
- **Controls:** keep the drawing (docs/94) separate from the meaning. Each slot names an action id
  from an approved list, so a label can never be wired to an unrelated behaviour.

None of this is built. This document asks for a ruling only.
