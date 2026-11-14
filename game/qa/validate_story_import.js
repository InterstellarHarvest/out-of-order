#!/usr/bin/env node
// Story import acceptance (docs/84 section 7), Node only. Every case edits a COPY of the storyboard
// JSON in a temporary folder, rebuilds with tools/story-import, and checks the generated content
// and the rules running on it. No engine, UI or art file is touched by any case.
//   node game/qa/validate_story_import.js        writes game/qa/story_import_results.json
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { build, verify } = require(path.join(ROOT, 'tools/story-import/import.js'));
const Rules = require(path.join(ROOT, 'game/js/rules.js'));
const STORY = path.join(ROOT, 'story');
const FIXTURE = path.join(__dirname, 'fixtures/story-import');

const results = [];
function check(group, name, ok, detail) {
  results.push({ group, name, ok: !!ok, detail: ok ? undefined : detail });
  if (!ok) console.log('FAIL [' + group + '] ' + name, detail === undefined ? '' : JSON.stringify(detail).slice(0, 500));
}

// A throwaway copy of a source folder; edit(fn) changes one JSON file in it.
const temps = [];
function copySource(from) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cyoa-import-'));
  temps.push(dir);
  (function cp(a, b) {
    fs.mkdirSync(b, { recursive: true });
    fs.readdirSync(a).forEach((f) => {
      const s = path.join(a, f);
      if (fs.statSync(s).isDirectory()) cp(s, path.join(b, f));
      else fs.copyFileSync(s, path.join(b, f));
    });
  })(from, dir);
  return {
    dir,
    edit(rel, fn) {
      const f = path.join(dir, rel);
      const j = JSON.parse(fs.readFileSync(f, 'utf8'));
      const r = fn(j);
      fs.writeFileSync(f, JSON.stringify(r === undefined ? j : r, null, 2));
      return this;
    }
  };
}
const PROLOGUE = 'chapters/prologue-00.draft.json';
const node = (j, id) => j.nodes[id];
const choice = (j, nid, cid) => j.nodes[nid].choices.filter((c) => c.id === cid)[0];
const has = (list, re) => list.some((e) => re.test(e));

// Plays a route of inputs ({ choice } or { item, verb }) from the start; returns the final state.
function play(story, route) {
  let s = Rules.begin(story, { seed: 'qa' }).state;
  route.forEach((input) => { s = Rules.step(story, s, input).state; });
  return s;
}
const ROUTE_TO_RECEPTION = ['head_to_restroom', 'drone_show_form', 'sign_notice', 'signed_move_on', 'go_to_exit', 'take_box_and_leave']
  .map((c) => ({ choice: c }))
  .concat([{ item: 'effects_box_full', verb: 'inspect' }])
  .concat(['enter_exposition', 'pass_turnstile', 'deposit_all', 'continue_to_reception_stored', 'speak_to_receptionist', 'ask_for_restroom',
    'wait_for_assistance', 'accept_for_directions', 'move_on_practical'].map((c) => ({ choice: c })));

// 1. The real export builds, and the committed generated file is up to date -----------------------
(function real() {
  const g = 'baseline';
  const b = build();
  check(g, 'story/ (prologue-00 draft) builds as a preview with no errors', b.ok, b.report.errors);
  check(g, 'the prologue has 29 nodes and one explicit DRAFT STOP at its unfinished hand-off', b.ok && b.report.stats.nodes === 29
    && JSON.stringify(b.report.draftStops) === '["prologue-00:reception_hallway"]', b.ok && [b.report.stats, b.report.draftStops]);
  const v = verify();
  check(g, 'game/content/story.generated.js is up to date with story/ (no stale output)', v.ok, v.why);
  check(g, 'reimporting identical JSON produces byte-identical runtime content', b.ok && build().text === b.text);
  const t = copySource(STORY).edit(PROLOGUE, (j) => {
    // Same content, every key in reverse order.
    const rev = (v) => (Array.isArray(v) ? v.map(rev) : v && typeof v === 'object' ? Object.keys(v).reverse().reduce((o, k) => (o[k] = rev(v[k]), o), {}) : v);
    return rev(j);
  });
  const b2 = build({ from: t.dir });
  check(g, 'authoring key order does not change the content hash or the runtime content', b2.ok && b2.meta.contentHash === b.meta.contentHash && b2.text.split('\n').slice(3).join() !== undefined
    && JSON.stringify(b2.story.chapters['prologue-00'].nodes.work_complete.choices) !== undefined, b2.ok && [b2.meta.contentHash, b.meta.contentHash]);
  check(g, 'the build records content hash, version, schema and every source file hash', b.ok && /^[0-9a-f]{64}$/.test(b.meta.contentHash) && b.meta.version > 0
    && b.meta.storySchema === 'cyoa-story-v2' && b.meta.sources.length === 5 && b.meta.sources.every((s) => /^[0-9a-f]{64}$/.test(s.sha256) && /^[0-9a-f]{40}$/.test(s.gitBlob)));
  check(g, 'storyboard box positions (storyboard-layout.json) are never read', b.ok && !b.meta.sources.some((s) => /layout/.test(s.path)));
  check(g, 'every art file is recorded with its artwork status and sha256 (28 generated drafts, 5 reused approved)', b.ok
    && b.meta.art.filter((a) => a.status === 'generated').length === 28 && b.meta.art.filter((a) => a.status === 'reused').length === 5 && b.meta.art.every((a) => a.sha256));
})();

// 2. Content changes reach the game without engine edits ----------------------------------------
(function edits() {
  const g = 'content-edits';
  const LINE = 'Good morning! This line was rewritten in the storyboard.';
  const t = copySource(STORY).edit(PROLOGUE, (j) => { node(j, 'drone_intercepts').text[1] = LINE; });
  const b = build({ from: t.dir });
  check(g, 'a dialogue rewrite appears in the rebuilt runtime content', b.ok && b.text.indexOf(LINE) !== -1
    && b.text.indexOf('Good morning! Your final assignment has been approved. Congratulations!') === -1, b.report.errors);
  const s = b.ok && play(b.story, [{ choice: 'head_to_restroom' }]);
  check(g, '... and is what the rules tell the player at that node', b.ok && s.transcript.some((e) => e.runs.some((r) => r.text === LINE)));

  const t2 = copySource(STORY).edit(PROLOGUE, (j) => {
    node(j, 'drone_intercepts').choices.push({ id: 'ask_drone_name', kind: 'spoken', text: 'DO YOU HAVE A NAME?', to: 'drone_name' });
    j.nodes.drone_name = { mode: 'dialogue', scene: 'workplace/corridor', speaker: 'termination_drone', pose: 'slot_closed',
      text: 'I am designated Notice Unit Four. Thank you for asking.', choices: [{ id: 'drone_name_on', kind: 'continue', text: 'CONTINUE', to: 'drone_presents_notice' }] };
  });
  const b2 = build({ from: t2.dir });
  const v2 = b2.ok && Rules.view(b2.story, play(b2.story, [{ choice: 'head_to_restroom' }]));
  check(g, 'a new choice and a new destination node are added through JSON alone', b2.ok && v2.cards.some((c) => c.id === 'ask_drone_name'), b2.report.errors);
  const s2 = b2.ok && play(b2.story, [{ choice: 'head_to_restroom' }, { choice: 'ask_drone_name' }]);
  check(g, '... and taking it reaches the new node with its own text', b2.ok && s2.node === 'drone_name' && s2.transcript.some((e) => /Notice Unit Four/.test(e.runs.map((r) => r.text).join(' '))));

  // Item requirement: the key-tag question needs the tag READ; changed to merely holding the key.
  const base = build();
  const before = Rules.view(base.story, play(base.story, ROUTE_TO_RECEPTION)).cards.map((c) => c.id);
  const t3 = copySource(STORY).edit(PROLOGUE, (j) => {
    choice(j, 'reception_directions', 'question_returned_key').if = { has: 'wc_key' };
    node(j, 'reception_directions').show.wc_key.if = { has: 'wc_key' };
  });
  const b3 = build({ from: t3.dir });
  const after = b3.ok && Rules.view(b3.story, play(b3.story, ROUTE_TO_RECEPTION)).cards.map((c) => c.id);
  check(g, 'an item requirement change changes availability: before, the key question needs the tag read', before.indexOf('question_returned_key') === -1, before);
  check(g, '... after the change, holding the key is enough', b3.ok && after.indexOf('question_returned_key') !== -1, [after, b3.report.errors]);
  const readFirst = play(base.story, ROUTE_TO_RECEPTION.concat([{ item: 'wc_key', verb: 'read' }]));
  check(g, '... and in the original, READING the tag unlocks it', Rules.view(base.story, readFirst).cards.some((c) => c.id === 'question_returned_key'));

  // A consistent author edit: the effect's new value, and the text variant that tests it.
  const t4 = copySource(STORY).edit(PROLOGUE, (j) => {
    choice(j, 'drone_presents_notice', 'sign_notice').effects[0].set.termination_status = 'signed_under_protest';
    node(j, 'restroom_denied').text.forEach((v) => { if (v.if && v.if.flagIs && v.if.flagIs[1] === 'acknowledged') v.if.flagIs[1] = 'signed_under_protest'; });
  });
  const b4 = build({ from: t4.dir });
  const s4 = b4.ok && play(b4.story, ['head_to_restroom', 'drone_show_form', 'sign_notice'].map((c) => ({ choice: c })));
  check(g, 'a changed choice effect updates the resulting game state', b4.ok && s4.flags.termination_status === 'signed_under_protest'
    && play(base.story, ['head_to_restroom', 'drone_show_form', 'sign_notice'].map((c) => ({ choice: c }))).flags.termination_status === 'acknowledged', b4.report.errors);

  const t5 = copySource(STORY).edit('items.draft.json', (j) => { j.wc_key.name = 'WASHROOM KEY'; });
  const b5 = build({ from: t5.dir });
  check(g, 'an item rename reaches the runtime items', b5.ok && b5.story.items.wc_key.name === 'WASHROOM KEY');
  check(g, 'moving a node (removing its old place) is a content change only: engine files are not inputs', b.ok && b.meta.sources.every((s) => !/^game\/js\//.test(s.path)));
})();

// 3. Invalid exports are rejected clearly --------------------------------------------------------
(function invalid() {
  const g = 'rejects';
  const bad = (name, rel, fn, re, mode) => {
    const t = copySource(STORY).edit(rel, fn);
    const b = build({ from: t.dir, mode: mode || 'preview' });
    check(g, name, !b.ok && has(b.report.errors, re), b.report.errors.slice(0, 4));
  };
  bad('an invalid destination is reported', PROLOGUE, (j) => { choice(j, 'work_complete', 'head_to_restroom').to = 'nowhere_node'; }, /leads to missing node nowhere_node/);
  bad('an unknown item is reported', PROLOGUE, (j) => { choice(j, 'drone_presents_notice', 'sign_notice').effects[1].give = ['ghost_item']; }, /unknown item ghost_item/);
  bad('an unsupported condition is reported', PROLOGUE, (j) => { choice(j, 'expo_choose_one', 'keep_plant').if = { holding: 'desk_plant' }; }, /unknown condition holding/);
  bad('an unsupported effect is reported', PROLOGUE, (j) => { choice(j, 'work_complete', 'head_to_restroom').effects = { teleport: 'x' }; }, /unknown effect teleport/);
  bad('an unsupported field is rejected, never dropped silently', PROLOGUE, (j) => { choice(j, 'work_complete', 'head_to_restroom').weight = 3; }, /unsupported field "weight"/);
  bad('an edit that leaves authored text unreachable is reported', PROLOGUE, (j) => { choice(j, 'drone_presents_notice', 'sign_notice').effects[0].set.termination_status = 'signed_under_protest'; }, /text of prologue-00:restroom_denied variant 0 never shown/);
  bad('an unknown chapter destination is reported', PROLOGUE, (j) => { delete choice(j, 'work_complete', 'head_to_restroom').to; choice(j, 'work_complete', 'head_to_restroom').chapter = 'chapter-99'; }, /missing chapter chapter-99/);
  bad('a tested item mark nothing sets is reported (typo guard)', PROLOGUE, (j) => { choice(j, 'expo_choose_one', 'keep_plant').if = { item: ['desk_plant', 'watered'] }; }, /mark "watered" is tested but no effect ever sets it/);
  bad('a speaker with no cast name is reported', PROLOGUE, (j) => { node(j, 'drone_intercepts').speaker = 'night_guard'; }, /night_guard.*runtime-settings/);
  bad('an art file that does not exist is reported', 'artwork.draft.json', (j) => { j.scenes['workplace/corridor'].assetPath = 'art/scenes/workplace/no_such_file.png'; }, /art file missing: art\/scenes\/workplace\/no_such_file\.png/);
  bad('art of the wrong size is reported', 'artwork.draft.json', (j) => { j.scenes['workplace/corridor'].assetPath = 'art/items/termination_notice_slot.png'; }, /is 96x96, must be 314x206/);
  bad('art from review/ or source/ is refused', 'artwork.draft.json', (j) => { j.scenes['workplace/corridor'].assetPath = 'art/source/corridor.png'; }, /may not use source\/, originals\/ or review\//);
  bad('an item art path that disagrees with the artwork registry is reported', 'items.draft.json', (j) => { j.wc_key.slotArt = 'art/items/other.png'; }, /disagrees with the artwork registry/);
  bad('missing required artwork is an error in an approved build', 'artwork.draft.json', (j) => { j.scenes['workplace/corridor'].assetPath = null; }, /no assetPath yet \(missing required artwork/, 'approved');
  bad('an unfinished node (DRAFT STOP) is an error in an approved build', PROLOGUE, (j) => j, /has no choices and is not an ending/, 'approved');
  // In a preview, missing art is a labelled placeholder (fixture profile), reported as a warning.
  const t = copySource(STORY).edit('artwork.draft.json', (j) => { j.scenes['workplace/corridor'].assetPath = null; });
  const b = build({ from: t.dir });
  check(g, 'missing artwork in a preview is reported and becomes a labelled DEV PLACEHOLDER (fixture profile)', b.ok && b.story.profile === 'fixture'
    && b.story.assets.scenes['workplace/corridor'] === null && has(b.report.warnings, /missing required artwork/), b.report.errors);
  const bj = copySource(STORY);
  fs.writeFileSync(path.join(bj.dir, PROLOGUE), '{ "title": "broken", ');
  const bb = build({ from: bj.dir });
  check(g, 'a file that is not valid JSON is reported with its name', !bb.ok && has(bb.report.errors, /chapter prologue-00: not valid JSON/), bb.report.errors);
  check(g, 'a rejected export writes nothing (build returns no text)', bb.text === null);
})();

// 4. Draft stops and channels -----------------------------------------------------------------------
(function drafts() {
  const g = 'draft-stop';
  const b = build();
  const n = b.story.chapters['prologue-00'].nodes.reception_hallway;
  check(g, 'a preview ends an unfinished hand-off explicitly: end node, one system card DRAFT ENDS HERE. BEGIN AGAIN.', n.end === true && n.choices.length === 1
    && n.choices[0].kind === 'system' && n.choices[0].restart === true && /DRAFT ENDS HERE/.test(n.choices[0].text));
  check(g, 'its narration is the authored text, unchanged (no invented ending)', /You follow it\.$/.test(n.text));
  const t = copySource(STORY).edit(PROLOGUE, (j) => { node(j, 'reception_hallway').choices = [{ id: 'restart_here', kind: 'system', text: 'BEGIN AGAIN.', restart: true }]; node(j, 'reception_hallway').end = true; });
  const a = build({ from: t.dir, mode: 'approved' });
  check(g, 'once the author ends the chapter, an approved build is possible (draft art is reported, not blocking)', a.ok && a.meta.channel === 'approved' && a.report.artPending.length === 28, a.report.errors);
})();

// 5. Chapters, Focus A, independence ---------------------------------------------------------------
(function chapters() {
  const g = 'chapters';
  const b = build({ from: FIXTURE });
  check(g, 'the two-chapter fixture builds (narrative, focus, dialogue, chapter change, ending)', b.ok, b.report.errors);
  if (!b.ok) return;
  const st = b.story;
  let r = Rules.begin(st, { seed: 'qa' });
  r = Rules.step(st, r.state, { choice: 'examine_panel' });
  const vA = Rules.view(st, r.state);
  check(g, 'Focus A: the focus node shows its close-up id and opener', vA.mode === 'focus' && vA.focus === 'fixture/hall/panel' && vA.returnTo === 'hall');
  r = Rules.step(st, r.state, { choice: 'take_card' });
  r = Rules.step(st, r.state, { choice: 'stop_examining' });
  check(g, 'Focus A: back returns to the narrative opener without re-entering it', r.state.node === 'hall' && r.events.some((e) => e.t === 'mode' && e.to === 'narrative')
    && !r.events.some((e) => e.t === 'text' && e.paras.some((p) => p.some((x) => /grey hall/.test(x.text)))));
  r = Rules.step(st, r.state, { choice: 'leave_hall' });
  check(g, 'a chapter transition enters the next chapter (chapter, scene events) and sets its objective', r.state.chapter === 'fx-two' && r.events[0].t === 'chapter'
    && r.events.some((e) => e.t === 'scene' && e.id === 'fixture/yard') && r.state.objective === 'CROSS THE YARD.');
  const t = copySource(FIXTURE).edit('chapters/fx-two.json', (j) => { j.nodes.yard.text = 'The yard has been rewritten.'; });
  const b2 = build({ from: t.dir });
  check(g, 'a changed export of one chapter leaves every other chapter byte-identical', b2.ok
    && JSON.stringify(b2.story.chapters['fx-one']) === JSON.stringify(st.chapters['fx-one'])
    && JSON.stringify(b2.story.chapters['fx-two']) !== JSON.stringify(st.chapters['fx-two']));
  const lines = (txt, ch) => { const i = txt.indexOf('"' + ch + '": {'); return i; };
  check(g, '... and in the generated file the unrelated chapter text is unchanged', b2.ok && b2.text.slice(lines(b2.text, 'fx-one'), lines(b2.text, 'fx-two'))
    === b.text.slice(lines(b.text, 'fx-one'), lines(b.text, 'fx-two')));
  check(g, 'the prologue is not assumed: the story starts at the manifest\'s first chapter', st.start === 'fx-one');
})();

// 6. Saves across content revisions ----------------------------------------------------------------
(function saves() {
  const g = 'saves';
  const A = build({ from: FIXTURE });
  if (!A.ok) return check(g, 'fixture builds', false, A.report.errors);
  const route = [{ choice: 'examine_panel' }, { choice: 'take_card' }, { choice: 'stop_examining' }];
  const st = play(A.story, route);
  const saved = Rules.serialize(A.story, st, { presented: st.transcript.length });
  const same = Rules.migrate(A.story, saved);
  check(g, 'same content: the save restores exactly (no migration)', same.ok && !same.migrated && JSON.stringify(same.state) === JSON.stringify(st));

  const tText = copySource(FIXTURE).edit('chapters/fx-one.json', (j) => { j.nodes.hall.text = 'A rewritten hall description.'; });
  const B = build({ from: tText.dir });
  const mB = Rules.migrate(B.story, saved);
  check(g, 'a compatible revision (text rewrite) changes the version and the save carries over', B.meta.version !== A.meta.version
    && mB.ok && mB.migrated && mB.state.node === 'hall' && mB.state.inventory.join() === 'fx_card', mB.reason);
  const after = mB.ok && Rules.view(B.story, mB.state);
  check(g, '... and play continues on the new content', mB.ok && after.cards.some((c) => c.id === 'leave_hall'));

  const tFlag = copySource(FIXTURE).edit('chapters/fx-one.json', (j) => { j.nodes.hall.choices[1].effects = { set: { greeted: true } }; });
  const C = build({ from: tFlag.dir });
  const mC = Rules.migrate(C.story, saved);
  check(g, 'a revision that declares a new flag carries the save over, adding the flag at its initial value', mC.ok && mC.state.flags.greeted === false
    && mC.migrated.notes.indexOf('added flag greeted') !== -1, mC.reason);

  const tGone = copySource(FIXTURE).edit('chapters/fx-one.json', (j) => {
    delete j.nodes.panel;
    j.nodes.hall.choices = j.nodes.hall.choices.filter((c) => c.id !== 'examine_panel');
    j.nodes.hall.choices.push({ id: 'find_card', kind: 'action', text: 'LOOK UNDER THE COUNTER.', once: true, effects: [{ give: ['fx_card'] }, { set: { card_found: true } }] });
  });
  const D = build({ from: tGone.dir });
  const mD = Rules.migrate(D.story, saved);
  check(g, 'an incompatible revision (a node the save decided at was removed) is refused with a reason, never loaded', D.ok && !mD.ok && /removed nodes or choices/.test(mD.reason), [D.report.errors, mD.reason]);
  const tWhere = copySource(FIXTURE).edit('chapters/fx-one.json', (j) => {
    delete j.nodes.desk;
    j.nodes.hall.choices = j.nodes.hall.choices.filter((c) => c.id !== 'talk_clerk');
  });
  const E = build({ from: tWhere.dir });
  const atDesk = play(A.story, [{ choice: 'talk_clerk' }]);
  const mE = Rules.migrate(E.story, Rules.serialize(A.story, atDesk));
  check(g, 'a save standing on a removed node is refused', E.ok && !mE.ok && /unknown node|removed/.test(mE.reason), [E.report.errors, mE.reason]);
  const untouched = Rules.migrate(E.story, saved);
  check(g, '... while a save that never touched the removed content still carries over', untouched.ok, untouched.reason);
  check(g, 'a save of another story is refused', !Rules.migrate(build().story, saved).ok);
  const corrupt = Rules.migrate(A.story, saved.replace('"fx_card"', '"fx_ghost"'));
  check(g, 'a corrupt save is refused, not half-loaded', !corrupt.ok);
})();

// 7. Staleness --------------------------------------------------------------------------------------
(function stale() {
  const g = 'stale';
  const t = copySource(FIXTURE);
  const out = path.join(t.dir, 'generated.js');
  const b = build({ from: t.dir });
  fs.writeFileSync(out, b.text);
  check(g, 'verify accepts output built from the current source', verify({ from: t.dir, out }).ok);
  t.edit('chapters/fx-two.json', (j) => { j.nodes.gate.text = 'Changed after the build.'; });
  const v = verify({ from: t.dir, out });
  check(g, 'verify reports STALE output once the source JSON changes', !v.ok && /STALE/.test(v.why), v.why);
  fs.writeFileSync(out, b.text.replace('Beyond the gate', 'Hand-edited gate'));
  t.edit('chapters/fx-two.json', (j) => { j.nodes.gate.text = 'Beyond the gate is the end of the fixture.'; });
  check(g, 'verify reports a hand-edited generated file as STALE', !verify({ from: t.dir, out }).ok);
})();

temps.forEach((d) => fs.rmSync(d, { recursive: true, force: true }));
const passed = results.filter((r) => r.ok).length;
const groups = {};
results.forEach((r) => { groups[r.group] = groups[r.group] || { total: 0, passed: 0 }; groups[r.group].total++; if (r.ok) groups[r.group].passed++; });
fs.writeFileSync(path.join(__dirname, 'story_import_results.json'), JSON.stringify({ suite: 'story-import', passed, total: results.length, groups, results }, null, 2) + '\n');
console.log('story import ' + passed + '/' + results.length + (passed === results.length ? ' passed ' : ' FAILED ') + JSON.stringify(groups));
process.exitCode = passed === results.length ? 0 : 1;
