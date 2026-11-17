#!/usr/bin/env node
// RETRY / CHECKPOINT rules, snapshots, attempt-scoped dice and saves (docs/96; owner rulings on
// PR #11, 2026-11-16). Node only, real story, real routes (game/qa/ch02_routes.js). Exit 1 on failure.
//
//   points      trackPoints records genuine states: the chapter-entry state exactly as entered,
//               the state immediately before the latest decision; restart clears them
//   restore     restoreFrom gives the point's state exactly, in a NEW attempt (live + 1, never the
//               point's), keeps earlier checks, drops the retry point on a checkpoint
//   dice        ordinary rolls are unchanged; a re-attempted check rolls in its attempt namespace:
//               independent of the original (distribution over 600 seeds), reproducible for the
//               same attempt, never a reused namespace after repeated restores
//   chapters    a Chapter 2 checkpoint keeps every House check, item, flag and NOTES entry as
//               inherited; only Chapter 2 checks roll again
//   saves       points are saved beside the state in one envelope; validated on load; invalid
//               points are dropped (never the save); forged attempt rolls are refused; old saves,
//               ordinary saves and gate-off saves are byte-for-byte as before; content migration
'use strict';
const fs = require('fs');
const path = require('path');
const Rules = require('../js/rules.js');
const gen = require('../content/story.generated.js');
const story = gen.story;
const R = require('./ch02_routes.js');

const results = [];
function check(group, name, ok, detail) {
  results.push({ group, name, ok: !!ok });
  if (!ok) console.error('FAIL [' + group + '] ' + name + (detail === undefined ? '' : ' ' + JSON.stringify(detail).slice(0, 600)));
}
const J = (v) => JSON.stringify(v);
const same = (a, b) => J(a) === J(b);
const strip = (s) => { const c = JSON.parse(J(s)); delete c.attempt; return c; };

const T = require('./tracked_routes.js');
const tracked = (item, seed) => T.tracked(story, item, seed);
const { CHAIR, STAPLER_CHAIR } = T;

// 1. Points are genuine --------------------------------------------------------------------------
{
  const g = 'points';
  const t = tracked(null, 1);
  const entry = t.log[t.log.length - 1];
  check(g, 'chapter entry: checkpoint is exactly the state on entering Chapter 1 (Prologue inventory, flags, NOTES), its arrival text not yet presented',
    t.state.chapter === 'chapter-01' && t.points.checkpoint.chapter === 'chapter-01' && t.points.checkpoint.state === entry.after
    && t.points.checkpoint.cursor.presented === entry.after.presentFrom && entry.after.presentFrom < entry.after.transcript.length);
  t.steps(CHAIR);
  const pre = t.state;
  t.step('accept_permanent_rest');
  const cause = Rules.endCause(story, t.state);
  check(g, 'voluntary death: the retry point is the very state before accept_permanent_rest, fully presented, and names that decision',
    t.points.retry.state === pre && t.points.retry.at === 'chapter-01:chair_locked' && same(t.points.retry.input, { choice: 'accept_permanent_rest' })
    && t.points.retry.cursor.presented === pre.transcript.length);
  check(g, 'both points usable for the voluntary death; checkpoint still the Chapter 1 entry', Rules.canRestore(story, t.state, t.points, 'retry', cause)
    && Rules.canRestore(story, t.state, t.points, 'checkpoint', cause) && t.points.checkpoint.state.node === 'house_arrival');
  const it = tracked(null, 1).steps(CHAIR.slice(0, 3));
  const before = it.points.retry;
  it.step({ item: 'expo_examiner_badge', verb: 'inspect' });
  check(g, 'inspecting an item is not a decision: the retry point does not move', it.points.retry === before);
  const r = Rules.step(story, t.state, { choice: 'restart_chair_death' });
  const after = Rules.trackPoints(story, t.points, t.state, { choice: 'restart_chair_death' }, r);
  check(g, 'BEGIN AGAIN (restart): a new playthrough starts with only its own start as checkpoint, no retry', after.retry === null && after.checkpoint.chapter === 'prologue-00'
    && after.checkpoint.state === r.state && r.state.attempt === undefined);
  const wrong = tracked(null, 1).steps(CHAIR);
  wrong.step({ item: 'expo_examiner_badge', verb: 'inspect' });
  check(g, 'canRestore refuses a retry point that is not the cause\'s decision (no point after a non-fatal state)', !Rules.canRestore(story, wrong.state, wrong.points, 'retry', Rules.endCause(story, wrong.state)));
}

// 2. RETRY and CHECKPOINT restore genuinely -------------------------------------------------------
{
  const g = 'restore';
  const t = tracked(null, 1).steps(CHAIR);
  const pre = t.state;
  t.step('accept_permanent_rest');
  const dead = t.state;
  t.restore('retry');
  check(g, 'RETRY: exactly the pre-decision state (inventory, flags, item marks, checks, NOTES, steps, presentFrom), now attempt 1', same(strip(t.state), pre) && t.state.attempt === 1
    && t.state.node === 'chair_locked' && t.cursor.presented === pre.transcript.length);
  check(g, 'RETRY: the fatal step is gone: no extra transcript, decision or item; no phantom inventory', t.state.transcript.length === pre.transcript.length && t.state.taken.length === pre.taken.length
    && same(t.state.inventory, pre.inventory) && dead.transcript.length > pre.transcript.length);
  check(g, 'RETRY keeps the checkpoint; the retry point stays the same decision', t.points.checkpoint && t.points.checkpoint.state.node === 'house_arrival' && t.points.retry.at === 'chapter-01:chair_locked');
  t.step('accept_permanent_rest');
  check(g, 'dying again after RETRY: same ending, attempt carried, a new retry point from the attempt-1 state', t.state.node === 'exit_chair_fatal' && t.state.attempt === 1 && t.points.retry.state.attempt === 1);
  t.restore('retry');
  check(g, 'a second RETRY: attempt 2 (live + 1), never the point\'s own attempt', t.state.attempt === 2);
  t.step('accept_permanent_rest');
  const cp = t.points.checkpoint.state;
  t.restore('checkpoint');
  check(g, 'CHECKPOINT: exactly the Chapter 1 entry state (Prologue items, flags, NOTES), attempt 3, arrival narration replayed', same(strip(t.state), cp) && t.state.attempt === 3
    && t.state.node === 'house_arrival' && t.cursor.presented === cp.presentFrom);
  check(g, 'CHECKPOINT drops the retry point (it belonged to the abandoned course of play)', t.points.retry === null && t.points.checkpoint.state === cp);
  const r = Rules.restoreFrom(story, t.state, { checkpoint: null, retry: null }, 'retry');
  check(g, 'no point: refused, nothing changed', !r.ok);
  const other = tracked(null, 2).steps(CHAIR);
  const x = Rules.restoreFrom(story, other.state, t.points, 'checkpoint');
  check(g, 'a point of another playthrough (seed) is refused', !x.ok && /another playthrough/.test(x.reason));
}

// 3. Dice: ordinary unchanged; re-attempts fresh, independent and reproducible ----------------
{
  const g = 'dice';
  // Ordinary rolls are the pre-existing formula, bit for bit.
  const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
  let ordinary = 0, ordinaryOk = 0;
  for (let seed = 1; seed <= 200; seed++) {
    const s = R.stepAll(story, R.prologue(story, null, seed), CHAIR);
    const a = Rules.step(story, s, { choice: 'physical_chair_breakout' }).state;
    ordinary++;
    if (a.checks.house_chair_unarmed.roll === 1 + (fnv(s.seed + ':house_chair_unarmed') % 6) && a.checks.house_chair_unarmed.attempt === undefined && a.attempt === undefined) ordinaryOk++;
  }
  check(g, 'ordinary (no-retry) play: every roll is the original seed + check id formula; no attempt anywhere (200 seeds)', ordinary === ordinaryOk, { ordinary, ordinaryOk });
  // Re-attempt after RETRY: unarmed check that failed, retried.
  const pairs = [];
  for (let seed = 1; seed <= 600; seed++) {
    const t = tracked(null, seed).steps(CHAIR);
    t.step('physical_chair_breakout');
    const first = t.state.checks.house_chair_unarmed;
    if (t.state.node !== 'exit_chair_fatal') { pairs.push({ seed, r0: first.roll, r1: null }); continue; }
    t.restore('retry');
    const hadIt = t.state.checks.house_chair_unarmed !== undefined;
    t.step('physical_chair_breakout');
    const second = t.state.checks.house_chair_unarmed;
    pairs.push({ seed, r0: first.roll, r1: second.roll, a: second.attempt, hadIt });
  }
  const retried = pairs.filter((p) => p.r1 !== null);
  check(g, 'RETRY of a failed check: the retried state no longer holds that check; it resolves again in attempt 1', retried.length > 400 && retried.every((p) => !p.hadIt && p.a === 1), retried.slice(0, 3));
  const faces = [0, 0, 0, 0, 0, 0, 0];
  retried.forEach((p) => faces[p.r1]++);
  const n = retried.length;
  const sameFace = retried.filter((p) => p.r1 === p.r0).length;
  const chi = faces.slice(1).reduce((a, f) => a + Math.pow(f - n / 6, 2) / (n / 6), 0);
  check(g, 'fresh rolls are uniform over d6 (chi-square ' + chi.toFixed(2) + ' < 20.5, p > 0.001; n=' + n + ')', chi < 20.5, faces);
  check(g, 'fresh rolls are independent of the failed roll: same face ' + sameFace + '/' + n + ' (expected 1/6 = ' + (n / 6).toFixed(0) + '; may legitimately repeat)', Math.abs(sameFace - n / 6) < 4 * Math.sqrt(n * (1 / 6) * (5 / 6)), { sameFace, n });
  check(g, 'a fresh attempt CAN repeat the same face (fresh is not "guaranteed different")', sameFace > 0);
  // Reproducible within an attempt: a save/reload does not reroll and does not give a new attempt.
  const t = tracked(null, 7).steps(CHAIR);
  t.step('physical_chair_breakout');
  if (t.state.node === 'exit_chair_fatal') {
    t.restore('retry');
    const env = Rules.serialize(story, t.state, { presented: t.state.transcript.length, points: t.points });
    const back = Rules.migrate(story, env);
    const a = Rules.step(story, t.state, { choice: 'physical_chair_breakout' }).state.checks.house_chair_unarmed;
    const b = Rules.step(story, back.state, { choice: 'physical_chair_breakout' }).state.checks.house_chair_unarmed;
    check(g, 'reload inside an attempt reproduces the same roll and keeps the same attempt (no free reroll)', back.ok && back.state.attempt === t.state.attempt && same(a, b));
  } else check(g, 'seed 7 fails the unarmed check (fixture)', false);
  // Repeated cycles never reuse a namespace.
  const c = tracked(null, 11).steps(CHAIR);
  const seen = new Set();
  let reuse = false;
  for (let k = 0; k < 6; k++) {
    c.step('accept_permanent_rest');
    c.restore(k % 2 ? 'checkpoint' : 'retry');
    if (k % 2) c.steps(CHAIR.slice(CHAIR.indexOf('enter_show_home')));
    if (seen.has(c.state.attempt)) reuse = true;
    seen.add(c.state.attempt);
  }
  check(g, 'six alternating RETRY / CHECKPOINT cycles: attempts 1..6, strictly increasing, never reused', !reuse && [...seen].join() === '1,2,3,4,5,6', [...seen]);
}

// 4. Earlier chapters stay as inherited (a Chapter 2 checkpoint) ----------------------------------------
{
  const g = 'chapters';
  // House: unarmed escape (pass) and the release check, then into Chapter 2, then a Chapter 2 route
  // that resolves its own checks; CHECKPOINT back to the Chapter 2 entry.
  let done = null;
  for (let seed = 1; seed <= 400 && !done; seed++) {
    const t = tracked(null, seed);
    try { t.steps(R.HOUSE.clean.path); } catch (e) { if (e.missing) continue; throw e; }
    if (t.state.node !== 'exit_service_clean') continue;
    t.step(Rules.view(story, t.state).cards[0].id);
    if (t.state.chapter !== 'chapter-02') continue;
    const entry = t.state;
    const route = R.ROUTES.find((r) => r.house === 'clean' && r.steps.length > 3);
    try { t.steps(route.steps); } catch (e) { if (e.missing) continue; throw e; }
    const ch2Checks = Object.keys(t.state.checks).filter((k) => !entry.checks[k]);
    if (!ch2Checks.length) continue;
    done = { t, entry, ch2Checks, before: JSON.parse(J(t.state.checks)) };
  }
  if (!done) { check(g, 'a House clean exit into a Chapter 2 route resolving its own checks', false); }
  else {
    const { t, entry, ch2Checks, before } = done;
    const houseChecks = Object.keys(entry.checks);
    check(g, 'the Chapter 2 checkpoint is the entry state, holding the House checks as resolved', t.points.checkpoint.chapter === 'chapter-02' && t.points.checkpoint.state === entry && houseChecks.length >= 2);
    t.restore('checkpoint');
    check(g, 'CHECKPOINT in Chapter 2: every House check, item, flag and NOTES entry exactly as inherited; Chapter 2 checks gone',
      houseChecks.every((k) => same(t.state.checks[k], before[k]) && t.state.checks[k].attempt === undefined) && ch2Checks.every((k) => !t.state.checks[k])
      && same(t.state.inventory, entry.inventory) && same(t.state.flags, entry.flags) && same(t.state.transcript, entry.transcript));
    const route = R.ROUTES.find((r) => r.house === 'clean' && r.steps.length > 3);
    let replay = true;
    try { t.steps(route.steps.slice(0, route.steps.length)); } catch (e) { replay = !e.missing ? (() => { throw e; })() : false; }
    const again = Object.keys(t.state.checks).filter((k) => !houseChecks.includes(k));
    check(g, 'replayed Chapter 2 checks resolve in the new attempt namespace; House checks still untouched',
      again.length > 0 && again.every((k) => t.state.checks[k].attempt === t.state.attempt) && houseChecks.every((k) => same(t.state.checks[k], before[k])), { replay, again });
  }
}

// 5. Saves ---------------------------------------------------------------------------------------------
{
  const g = 'saves';
  const t = tracked('red_stapler', 3).steps(STAPLER_CHAIR);
  t.step('accept_permanent_rest');
  const env = Rules.serialize(story, t.state, { presented: t.state.transcript.length, points: t.points });
  const parsed = JSON.parse(env);
  check(g, 'one envelope: state, cursor and points written together (one save write)', parsed.state && parsed.cursor && parsed.points && parsed.points.retry && parsed.points.checkpoint);
  const back = Rules.migrate(story, env);
  check(g, 'a tracked save restores with its points intact (state, cursor and both points equal)', back.ok && same(back.state, t.state) && same(back.points.retry.state, t.points.retry.state)
    && same(back.points.checkpoint.state, t.points.checkpoint.state) && !back.pointsDropped);
  const plain = Rules.serialize(story, t.state, { presented: t.state.transcript.length });
  check(g, 'an untracked (gate-off) save has no points and no attempt: the pre-existing format exactly', !/"points"/.test(plain) && !/"attempt"/.test(plain) && Rules.migrate(story, plain).ok);
  const ordinary = R.stepAll(story, R.prologue(story, null, 1), CHAIR);
  const oldFormat = JSON.stringify({ schema: 'cyoa-save-v1', story: story.id, version: story.version, state: ordinary, cursor: { presented: ordinary.transcript.length } });
  check(g, 'a pre-existing save (no points, no attempt) is byte-identical to today\'s ordinary serialize and loads', oldFormat === Rules.serialize(story, ordinary, { presented: ordinary.transcript.length })
    && Rules.migrate(story, oldFormat).ok && Rules.migrate(story, oldFormat).points === undefined);
  // Tampering and invalid points.
  let after = null;
  for (let seed = 1; seed < 60 && !after; seed++) {
    const t = tracked(null, seed).steps(CHAIR);
    t.step('physical_chair_breakout');
    if (t.state.node !== 'exit_chair_fatal') continue;
    t.restore('retry');
    try { t.step('physical_chair_breakout'); } catch (e) { continue; }
    after = t;
  }
  if (after) {
    const e2 = JSON.parse(Rules.serialize(story, after.state, { presented: 0, points: after.points }));
    const fnv = (str) => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h >>> 0; };
    const forged = JSON.parse(J(e2)); delete forged.state.checks.house_chair_unarmed.attempt;
    const orig = 1 + (fnv(forged.state.seed + ':house_chair_unarmed') % 6);
    const f1 = Rules.migrate(story, J(forged));
    check(g, 'a re-attempted roll stripped of its attempt (claiming the original namespace) is refused whenever the rolls differ', orig !== e2.state.checks.house_chair_unarmed.roll ? !f1.ok : f1.ok, { orig, roll: e2.state.checks.house_chair_unarmed.roll, ok: f1.ok });
    const f2 = JSON.parse(J(e2)); f2.state.checks.house_chair_unarmed.attempt = 5;
    check(g, 'a check claiming an attempt the state has not reached is refused', !Rules.migrate(story, J(f2)).ok);
    const f3 = JSON.parse(J(e2)); f3.state.checks.house_chair_unarmed.roll = (f3.state.checks.house_chair_unarmed.roll % 6) + 1;
    check(g, 'a changed roll in an attempt namespace is refused', !Rules.migrate(story, J(f3)).ok);
    const f4 = JSON.parse(J(e2)); f4.points.retry.state.seed = 'zzz';
    const r4 = Rules.migrate(story, J(f4));
    check(g, 'an invalid point (another seed) is dropped, the save itself still loads', r4.ok && r4.points.retry === null && r4.pointsDropped.some((x) => /retry/.test(x)) && r4.points.checkpoint);
    const f5 = JSON.parse(J(e2)); f5.points.checkpoint.state.attempt = 9;
    const r5 = Rules.migrate(story, J(f5));
    check(g, 'a point from a later attempt than the live state is dropped', r5.ok && r5.points.checkpoint === null);
    const f6 = JSON.parse(J(e2)); f6.points.checkpoint.state.node = 'storage_cabinet';
    check(g, 'a checkpoint that is not a chapter entry is dropped', Rules.migrate(story, J(f6)).points.checkpoint === null);
    const f7 = JSON.parse(J(e2)); f7.state.attempt = 0;
    check(g, 'attempt 0 written explicitly is refused (absent means 0)', !Rules.migrate(story, J(f7)).ok);
  } else check(g, 'a seed that fails the unarmed check and is retried (fixture)', false);
  // Content migration: a save from an earlier content revision carries its points through migrate.
  const older = JSON.parse(env);
  older.version = story.version + 1;
  delete older.state.flags.house_stored_any;
  delete older.points.checkpoint.state.flags.house_stored_any;
  delete older.points.retry.state.flags.house_stored_any;
  const m = Rules.migrate(story, J(older));
  check(g, 'content migration migrates the points too (a newly declared flag added to each)', m.ok && m.migrated && m.points.retry && m.points.checkpoint
    && m.points.checkpoint.state.flags.house_stored_any !== undefined && m.points.retry.state.flags.house_stored_any !== undefined);
}

// 5b. One shared popup, three distinguishable causes (docs/98; public docs/104) --------------------------
{
  const g = 'shared-cause';
  const CANON = require('../content/death-presentations.generated.js');
  const REVIEW = require('../content/end-presentations.review.js');
  const entry = CANON.entries.find((e) => e.id === 'chapter-01:exit_chair_fatal');
  check(g, 'ordinary play opts in every canonical death entry (canonical *), activation always', REVIEW.entries[0].canonical === '*' && REVIEW.activation === 'always');
  const T = require('./tracked_routes.js');
  const matches = (cause) => !!cause && Object.keys(entry.when).every((k) => cause[k] === entry.when[k]);
  const kinds = {};
  for (let seed = 1; seed <= 120 && Object.keys(kinds).length < 3; seed++) {
    for (const [item, pathTo, choice] of [[null, T.CHAIR, 'accept_permanent_rest'], ['red_stapler', T.STAPLER_CHAIR, 'stapler_breakout'], [null, T.CHAIR, 'physical_chair_breakout']]) {
      if (kinds[choice]) continue;
      const t = T.tracked(story, item, seed).steps(pathTo);
      const before = t.state;
      t.step(choice);
      if (t.state.node !== 'exit_chair_fatal') continue;
      kinds[choice] = { cause: Rules.endCause(story, t.state), t, before };
    }
  }
  check(g, 'all three causes reach exit_chair_fatal and match the ONE canonical entry (when = { end } only)', Object.keys(kinds).length === 3 && Object.values(kinds).every((k) => matches(k.cause))
    && JSON.stringify(entry.when) === JSON.stringify({ end: 'chapter-01:exit_chair_fatal' }) && !!entry.art, Object.keys(kinds));
  const c = (k) => kinds[k] && kinds[k].cause;
  check(g, 'the causes stay distinguishable: voluntary has no check; stapler / unarmed carry their check id and ok:false', c('accept_permanent_rest') && c('accept_permanent_rest').check === undefined
    && c('stapler_breakout').check === 'house_chair_stapler' && c('stapler_breakout').ok === false && c('physical_chair_breakout').check === 'house_chair_unarmed' && c('physical_chair_breakout').ok === false);
  const all = Object.values(kinds).every((k) => Rules.canRestore(story, k.t.state, k.t.points, 'retry', k.cause) && Rules.canRestore(story, k.t.state, k.t.points, 'checkpoint', k.cause));
  check(g, 'RETRY and CHECKPOINT are available for every cause (the retry point is that cause\'s own decision)', all);
  const st = kinds.stapler_breakout;
  if (st) {
    st.t.restore('retry');
    const again = Rules.step(story, st.t.state, { choice: 'stapler_breakout' }).state;
    check(g, 'RETRY after a failed stapler check: the exact pre-check state in attempt 1; the re-attempt rolls in the attempt-1 namespace', JSON.stringify((() => { const x = JSON.parse(JSON.stringify(st.t.state)); delete x.attempt; return x; })()) === JSON.stringify(st.before)
      && st.t.state.attempt === 1 && again.checks.house_chair_stapler.attempt === 1);
  }
  const ok = (() => { for (let seed = 1; seed <= 200; seed++) { const t = T.tracked(story, null, seed).steps(T.CHAIR); t.step('physical_chair_breakout'); if (t.state.node !== 'exit_chair_fatal') return { node: t.state.node, cause: Rules.endCause(story, t.state) }; } return null; })();
  check(g, 'a successful escape never reaches the shared ending (no cause, never matches)', ok && ok.node !== 'exit_chair_fatal' && !matches(ok.cause), ok);
}

// 6. The validator and the walk are unaffected ------------------------------------------------------------
{
  const g = 'engine';
  check(g, 'generated story unchanged (content 407d8ec78f1c); the validator never sees attempt or points', gen.build.contentHash.slice(0, 12) === '407d8ec78f1c');
  const src = fs.readFileSync(path.join(__dirname, '../js/rules.js'), 'utf8');
  check(g, 'step() reads attempt only for the roll namespace; nothing in step() writes it', (src.match(/\.attempt = /g) || []).length === 3 && /s\.attempt = \(state\.attempt \|\| 0\) \+ 1/.test(src));
}

const failed = results.filter((r) => !r.ok);
console.log('Death controls (points, restore, dice, chapters, saves): ' + (results.length - failed.length) + '/' + results.length + ' passed');
fs.writeFileSync(path.join(__dirname, 'death_controls_results.json'), JSON.stringify({ passed: results.length - failed.length, total: results.length, results }, null, 1) + '\n');
if (failed.length) process.exitCode = 1;
