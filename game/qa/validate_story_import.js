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
const CHAPTER1 = 'chapters/chapter-01.draft.json';
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
  check(g, 'story/ (prologue-00 + chapter-01 drafts) builds as a preview with no errors', b.ok, b.report.errors);
  check(g, 'three chapters: 29 Prologue, 36 House and 99 Biology Park nodes, with no unfinished draft-stop nodes', b.ok
    && b.report.stats.chapters === 3 && b.report.stats.nodes === 164 && Object.keys(b.story.chapters['prologue-00'].nodes).length === 29
    && Object.keys(b.story.chapters['chapter-01'].nodes).length === 36 && Object.keys(b.story.chapters['chapter-02'].nodes).length === 99
    && b.report.draftStops.length === 0, b.ok && [b.report.stats, b.report.draftStops]);
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
    && b.meta.storySchema === 'cyoa-story-v2' && b.meta.sources.length === 7 && b.meta.sources.every((s) => /^[0-9a-f]{64}$/.test(s.sha256) && /^[0-9a-f]{40}$/.test(s.gitBlob)));
  check(g, 'storyboard box positions (storyboard-layout.json) are never read', b.ok && !b.meta.sources.some((s) => /layout/.test(s.path)));
  // docs/92 adds the 28 bound Chapter 1 House images (the 29th, the default chair, is unbound).
  const houseArt = (a) => /house_of_tomorrow|portraits\/house\/|family_portrait_photo/.test(a.path);
  check(g, 'every art file is recorded with its artwork status and sha256 (28 generated Prologue drafts + 28 generated House images, 5 reused approved)', b.ok
    && b.meta.art.filter((a) => a.status === 'generated' && !houseArt(a)).length === 28 && b.meta.art.filter((a) => a.status === 'generated' && houseArt(a)).length === 28
    && b.meta.art.filter((a) => a.status === 'reused').length === 5 && b.meta.art.every((a) => a.sha256));
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
  bad('an unfinished node (DRAFT STOP) is an error in an approved build', CHAPTER1, (j) => { j.nodes.house_arrival.choices = []; }, /has no choices and is not an ending/, 'approved');
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

// 4. Authored Chapter 1 endings and draft channels ------------------------------------------------
(function drafts() {
  const g = 'draft-stop';
  const b = build();
  const chapter = b.story.chapters['chapter-01'];
  const surviving = ['exit_named_plant', 'exit_martin', 'exit_service_clean', 'exit_service_registered', 'exit_showroom_reset'];
  const fatal = chapter.nodes.exit_chair_fatal;
  check(g, 'Chapter 1: the fatal chair stays an end node with only BEGIN AGAIN; no development placeholder',
    b.report.draftStops.length === 0 && !chapter.nodes.dev_placeholder && fatal && fatal.end === true && fatal.choices.length === 1 && fatal.choices[0].restart === true,
    [b.report.draftStops, fatal]);
  check(g, 'Chapter 1: each of the five surviving exits hands off with one CONTINUE card into chapter-02 (no restart, no to)',
    surviving.every((id) => {
      const n = chapter.nodes[id];
      return n && !n.end && n.choices.length === 1 && n.choices[0].kind === 'continue' && n.choices[0].chapter === 'chapter-02' && !n.choices[0].restart && !n.choices[0].to;
    }), surviving.map((id) => chapter.nodes[id] && chapter.nodes[id].choices));
  check(g, 'the imported House begins with authored narration, not development-placeholder prose',
    chapter.start === 'house_arrival' && !/DEVELOPMENT PLACEHOLDER/.test(JSON.stringify(chapter.nodes.house_arrival.text)));
  const t = copySource(STORY);
  const still = build({ from: t.dir, mode: 'approved' });
  check(g, 'the approved channel refuses both creatively draft chapters', !still.ok
    && has(still.report.errors, /prologue-00 is marked "draft"/) && has(still.report.errors, /chapter-01 is marked "draft"/), still.report.errors);
  t.edit('storyboard-manifest.json', (j) => { j.chapters[0].status = 'approved'; });
  const half = build({ from: t.dir, mode: 'approved' });
  check(g, 'marking only Prologue approved cannot promote Chapter 1', !half.ok
    && has(half.report.errors, /chapter-01 is marked "draft"/) && !has(half.report.errors, /prologue-00 is marked/), half.report.errors);
  t.edit('storyboard-manifest.json', (j) => { j.chapters[1].status = 'approved'; });
  const two = build({ from: t.dir, mode: 'approved' });
  check(g, 'marking Prologue and Chapter 1 approved cannot promote Chapter 2', !two.ok
    && has(two.report.errors, /chapter-02 is marked "draft"/) && !has(two.report.errors, /chapter-01 is marked/), two.report.errors);
  t.edit('storyboard-manifest.json', (j) => { j.chapters[2].status = 'approved'; });
  const noArt = build({ from: t.dir, mode: 'approved' });
  check(g, 'unproduced House and Biology Park artwork prevents an approved build even after draft status changes',
    !noArt.ok && has(noArt.report.errors, /missing required artwork/) && !has(noArt.report.errors, /is marked "draft"/), noArt.report.errors);
  check(g, 'the build records each chapter manifest title/status and stays a preview',
    JSON.stringify(b.meta.chapters) === JSON.stringify([
      { id: 'prologue-00', title: 'Prologue — The Last Good Day', status: 'draft' },
      { id: 'chapter-01', title: 'Chapter 1 — House of Tomorrow', status: 'draft' },
      { id: 'chapter-02', title: 'Chapter 2 — Biology Park', status: 'draft' }
    ]) && b.meta.channel === 'preview', b.meta.chapters);
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

// 5b. Focus A and dice checks (the prologue draft uses neither; the fixture carries both) ----------
// The fixture's yard has a hidden d6 check (fx_fence: need 4, +1 once the blue card is read).
// Seeds (rolls depend only on seed + check id): s6 rolls 1, s4 rolls 3, s9 rolls 4.
(function focusAndChecks() {
  const g = 'focus+checks';
  const b = build({ from: FIXTURE });
  if (!b.ok) return check(g, 'fixture builds', false, b.report.errors);
  const st = b.story;
  const toYard = [{ choice: 'examine_panel' }, { choice: 'take_card' }, { choice: 'stop_examining' }, { choice: 'leave_hall' }];
  const at = (seed, route) => { let s = Rules.begin(st, { seed }).state; route.forEach((i) => { s = Rules.step(st, s, i).state; }); return s; };

  // Focus A
  let s = at('qa', [{ choice: 'examine_panel' }]);
  let v = Rules.view(st, s);
  check(g, 'Focus A: the view carries the close-up, no speaker and no portrait swap', v.mode === 'focus' && v.focus === 'fixture/hall/panel' && v.speaker === null);
  s = at('qa', [{ choice: 'examine_panel' }, { choice: 'take_card' }, { choice: 'stop_examining' }, { choice: 'examine_panel' }]);
  v = Rules.view(st, s);
  check(g, 'Focus A: a second visit offers only what is left (the once choice is spent)', v.mode === 'focus' && v.cards.map((c) => c.id).join() === 'stop_examining', v.cards);
  const tNoArt = copySource(FIXTURE).edit('artwork.json', (j) => { delete j.focus['fixture/hall/panel']; });
  const noArtPreview = build({ from: tNoArt.dir });
  const noArtApproved = build({ from: tNoArt.dir, mode: 'approved' });
  check(g, 'Focus A: missing close-up art is a placeholder in a preview and an error in an approved build', noArtPreview.ok
    && has(noArtPreview.report.warnings, /fixture\/hall\/panel/) && !noArtApproved.ok && has(noArtApproved.report.errors, /fixture\/hall\/panel/),
    [noArtPreview.report, noArtApproved.report.errors]);
  const tFocusNoId = copySource(FIXTURE).edit('chapters/fx-one.json', (j) => { delete j.nodes.panel.focus; });
  const noId = build({ from: tFocusNoId.dir });
  check(g, 'Focus A: a focus node without a close-up id is rejected with its node named', !noId.ok && has(noId.report.errors, /panel/), noId.report.errors);

  // Dice checks
  const ck = st.chapters['fx-two'].nodes.yard.choices.filter((c) => c.id === 'climb_fence')[0];
  check(g, 'checks: the authored check is imported unchanged (id, d6, need, mods, pass and fail outcomes)', ck && ck.check.id === 'fx_fence' && ck.check.sides === 6
    && ck.check.need === 4 && ck.check.mods.length === 1 && ck.pass.to === 'gate' && !!ck.fail.result);
  check(g, 'checks: the view marks the card as risky (hasCheck) and carries no die, odds or roll', (() => {
    const c = Rules.view(st, at('s6', toYard)).cards.filter((x) => x.id === 'climb_fence')[0];
    return c && c.hasCheck === true && Object.keys(c).sort().join() === 'hasCheck,id,kind,text';
  })());
  const fail = Rules.step(st, at('s6', toYard), { choice: 'climb_fence' });
  check(g, 'checks: a failing roll stays, narrates the fail result, applies its effects and records the check', fail.state.node === 'yard'
    && fail.state.flags.fence_slipped === true && fail.state.checks.fx_fence.ok === false && fail.state.checks.fx_fence.roll === 1
    && fail.events.some((e) => e.t === 'check' && !e.ok) && fail.events.some((e) => e.t === 'text' && JSON.stringify(e).indexOf('land back in the yard') !== -1));
  check(g, 'checks: a resolved check is never offered again (no re-roll); the other way on stays', Rules.view(st, fail.state).cards.map((c) => c.id).join() === 'cross_yard');
  const pass = Rules.step(st, at('s9', toYard), { choice: 'climb_fence' });
  check(g, 'checks: a passing roll follows the pass outcome to its node and narrates it', pass.state.node === 'gate' && pass.state.checks.fx_fence.ok === true
    && JSON.stringify(pass.state.transcript).indexOf('far side') !== -1);
  const unread = Rules.step(st, at('s4', toYard), { choice: 'climb_fence' });
  const read = Rules.step(st, at('s4', toYard.concat([{ item: 'fx_card', verb: 'read' }])), { choice: 'climb_fence' });
  check(g, 'checks: an item condition changes the odds, not the roll (s4 rolls 3: fails unread, passes once the card is read)', !unread.state.checks.fx_fence.ok
    && read.state.checks.fx_fence.ok && unread.state.checks.fx_fence.roll === 3 && read.state.checks.fx_fence.roll === 3 && read.state.checks.fx_fence.bonus === 1);
  const saved = Rules.serialize(st, fail.state);
  const back = Rules.migrate(st, saved);
  check(g, 'checks: a save after a check restores the same outcome', back.ok && back.state.checks.fx_fence.ok === false && back.state.node === 'yard');
  const tampered = Rules.migrate(st, saved.replace('"roll":1', '"roll":6'));
  check(g, 'checks: a save with a changed roll is refused', !tampered.ok && /roll|seed/.test(tampered.reason || ''), tampered.reason);
  const v1 = Rules.validateStory(st);
  check(g, 'checks: the walk explores both outcomes (both reach the ending or stay playable)', v1.ok && v1.stats.checks === 1 && v1.stats.endingsReached === 1, v1.errors);
  const tNoFail = copySource(FIXTURE).edit('chapters/fx-two.json', (j) => { delete j.nodes.yard.choices[0].fail; });
  const nf = build({ from: tNoFail.dir });
  check(g, 'checks: a check without a fail outcome is rejected with its chapter, node and choice', !nf.ok && has(nf.report.errors, /fx-two.*yard.*climb_fence|climb_fence/), nf.report.errors);
  const tCertain = copySource(FIXTURE).edit('chapters/fx-two.json', (j) => { j.nodes.yard.choices[0].check.mods[0].add = 3; });
  const cert = build({ from: tCertain.dir });
  check(g, 'checks: an item that would make a check certain is rejected unless the check says certain', !cert.ok && has(cert.report.errors, /certain/), cert.report.errors);
})();

// 5c. Engine and UI hold no story content -----------------------------------------------------------
// A storyboard export must never need a code change: no chapter, node, choice, item, flag, mark or
// art id of the imported story, and none of its prose, may appear in the game's code. Comments are
// ignored, and so are ids the M2 reception fixture (game/content/reception.js) also uses, since its
// unchanged v1 path keeps its own names.
(function independence() {
  const g = 'independence';
  const st = build().story;
  const reception = fs.readFileSync(path.join(ROOT, 'game/content/reception.js'), 'utf8');
  const ids = new Set();
  Object.keys(st.chapters).forEach((c) => {
    ids.add(c);
    const ch = st.chapters[c];
    Object.keys(ch.nodes).forEach((n) => { ids.add(n); (ch.nodes[n].choices || []).forEach((x) => ids.add(x.id)); });
  });
  Object.keys(st.items).forEach((i) => ids.add(i));
  Object.keys(st.initialState.flags).forEach((f) => ids.add(f));
  (st.marks || []).forEach((m) => ids.add(m));
  Object.keys(st.cast).forEach((c) => ids.add(c));
  Object.keys(st.assets || {}).forEach((kind) => Object.keys(st.assets[kind] || {}).forEach((k) => ids.add(k)));
  // Named exceptions, each with its reason (no wildcard): the reception fixture's v1->v2 adapter
  // in rules.js (V1_RECEPTION, engine-s3) names its cast 'receptionist', as the prologue's cast does.
  const SHARED_WITH_RECEPTION_ADAPTER = ['receptionist'];
  const ownIds = Array.from(ids).filter((id) => SHARED_WITH_RECEPTION_ADAPTER.indexOf(id) === -1
    && !new RegExp('[\'"]' + id.replace(/[/.:-]/g, '\\$&') + '[\'"]').test(reception));
  const prose = [];
  const addProse = (t) => (Array.isArray(t) ? t : [t]).forEach((x) => {
    const s = typeof x === 'string' ? x : x && (x.say || x.act || x.desc || x.think || x.text);
    if (typeof s === 'string') s.split(/\n+/).forEach((p) => { if (p.trim().length >= 24) prose.push(p.trim().slice(0, 24)); });
  });
  Object.keys(st.chapters).forEach((c) => Object.values(st.chapters[c].nodes).forEach((n) => {
    addProse(n.text);
    (n.choices || []).forEach((x) => { addProse(x.text); addProse(x.result); });
  }));
  const files = fs.readdirSync(path.join(ROOT, 'game/js')).map((f) => 'game/js/' + f).concat(['game/index.html', 'game/game.css']);
  const hits = [];
  files.forEach((f) => {
    const code = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"])\/\/.*$/gm, '$1').replace(/<!--[\s\S]*?-->/g, '');
    ownIds.forEach((id) => { if (new RegExp('[\'"`]' + id.replace(/[/.:-]/g, '\\$&') + '[\'"`]').test(code)) hits.push(f + ': id ' + id); });
    prose.forEach((p) => { if (code.indexOf(p) !== -1) hits.push(f + ': text "' + p + '"'); });
  });
  check(g, 'no id of the imported story (' + ownIds.length + ' ids) and none of its prose (' + prose.length + ' passages) appears in game code', ownIds.length > 50 && prose.length > 50 && hits.length === 0, hits);
  const before = fs.readdirSync(path.join(ROOT, 'game/js')).map((f) => f + ':' + fs.statSync(path.join(ROOT, 'game/js', f)).mtimeMs).join();
  const t = copySource(STORY).edit(PROLOGUE, (j) => { node(j, 'drone_intercepts').text[1] = 'An edited line.'; });
  const out = path.join(t.dir, 'generated.js');
  const r = require('child_process').spawnSync(process.execPath, [path.join(ROOT, 'tools/story-import/import.js'), '--from', t.dir, '--out', out, '--quiet'], { encoding: 'utf8' });
  const after = fs.readdirSync(path.join(ROOT, 'game/js')).map((f) => f + ':' + fs.statSync(path.join(ROOT, 'game/js', f)).mtimeMs).join();
  check(g, 'an import writes only its output file: engine and UI code are untouched', r.status === 0 && fs.existsSync(out) && before === after, [r.status, r.stdout, r.stderr]);
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

// 6b. Art status and the provisional overlay ---------------------------------------------------------
// The 28 generated prologue images are development assets: their status stays 'generated' and their
// bytes are pinned by the sha256 each build records, so neither can change without a visible diff.
(function artStatus() {
  const g = 'art-status';
  const b = build();
  const gen = b.meta.art.filter((a) => a.status === 'generated');
  // The House images (docs/92) are pinned twice: by this sha256 and by art/house_of_tomorrow.provenance.json.
  const prov = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/house_of_tomorrow.provenance.json'), 'utf8')).images.filter((r) => r.id !== 'house_of_tomorrow/chair#default_unrestrained');
  const houseOk = prov.every((r) => gen.some((a) => a.path === r.path && a.sha256 === r.sha256));
  check(g, 'the build records every story image with its artwork status and sha256 (28 generated Prologue + 28 generated House images matching their provenance, none approved)', gen.length === 56 && houseOk
    && b.meta.art.every((a) => /^[0-9a-f]{64}$/.test(a.sha256) && typeof a.status === 'string') && !b.meta.art.some((a) => a.status === 'approved'),
    b.meta.art.map((a) => a.status));
  const t = copySource(STORY).edit('artwork.draft.json', (j) => {
    const k = Object.keys(j.scenes)[0];
    j.scenes[k].status = 'approved';
  });
  const out = path.join(t.dir, 'generated.js');
  fs.writeFileSync(out, b.text);
  const v = verify({ from: t.dir, out });
  check(g, 'changing an image\'s approval status in the storyboard makes the committed build STALE (never silent)', !v.ok && /STALE/.test(v.why), v.why);
  const sandbox = { window: {} };
  require('vm').runInNewContext(fs.readFileSync(path.join(ROOT, 'art/ui/shell/narrative-overlay.manifest.js'), 'utf8'), sandbox);
  const ov = sandbox.window.CYOA_NARRATIVE_OVERLAY;
  const png = fs.readFileSync(path.join(ROOT, 'art/ui/shell', ov.image));
  const sha = require('crypto').createHash('sha256').update(png).digest('hex');
  check(g, 'the Narrative B overlay manifest matches its image (sha256 and size) and records its status (' + ov.status + ')', sha === ov.sha256
    && png.readUInt32BE(16) === ov.width && png.readUInt32BE(20) === ov.height && typeof ov.status === 'string'
    && ['x', 'y', 'width', 'lineHeight', 'safeBottom'].every((k) => typeof ov.textBox[k] === 'number'), [sha, ov]);
})();

// 6b. Prologue -> Chapter 1 hand-off: separate chapter files, and the player's whole state crosses ---
(function handoff() {
  const g = 'handoff';
  const b = build();
  if (!b.ok) return check(g, 'story/ builds', false, b.report.errors);
  const st = b.story;
  const src = (rel) => JSON.parse(fs.readFileSync(path.join(STORY, rel), 'utf8'));
  const manifest = src('storyboard-manifest.json');
  check(g, 'the manifest lists exactly Prologue, Chapter 1, Chapter 2, all draft, each in its own chapter file', JSON.stringify(manifest.chapters) === JSON.stringify([
    { id: 'prologue-00', title: 'Prologue — The Last Good Day', file: 'chapters/prologue-00.draft.json', status: 'draft' },
    { id: 'chapter-01', title: 'Chapter 1 — House of Tomorrow', file: 'chapters/chapter-01.draft.json', status: 'draft' },
    { id: 'chapter-02', title: 'Chapter 2 — Biology Park', file: 'chapters/chapter-02.draft.json', status: 'draft' }]), manifest.chapters);
  const pro = src(PROLOGUE);
  const ch1 = src(CHAPTER1);
  check(g, 'no Chapter 1 node lives in the Prologue JSON (and none of the Prologue\'s in Chapter 1)', Object.keys(ch1.nodes).every((id) => !pro.nodes[id])
    && Object.keys(ch1.nodes).length === 36 && ch1.start === 'house_arrival' && !ch1.nodes.dev_placeholder
    && Object.keys(pro.nodes).length === 29);
  const hall = st.chapters['prologue-00'].nodes.reception_hallway;
  check(g, 'reception_hallway keeps its authored narration, scene and objective (sha256 of the text pinned)', hall.scene === 'exposition/facilities_corridor'
    && hall.objective === 'FIND THE PUBLIC BATHROOM.' && !hall.end
    && require('crypto').createHash('sha256').update(hall.text).digest('hex') === '54b1047e11b1fe8a98d8f92c6495b9a4d1b9af890d7bb6b476c6ed0ee2e5ff3c'
    && /^You pass through the door and into a long, softly humming corridor\./.test(hall.text) && /You follow it\.$/.test(hall.text), hall);
  check(g, 'its dead end is now one authored continue card whose destination is chapter: "chapter-01" (no to, no restart)', JSON.stringify(hall.choices)
    === JSON.stringify([{ id: 'continue_to_chapter_01', kind: 'continue', text: 'CONTINUE', chapter: 'chapter-01' }]), hall.choices);
  const c1 = st.chapters['chapter-01'];
  // docs/92: the 14 House scenes now carry their own selected production art (generated, owner
  // approval pending), each its own file under art/scenes/house_of_tomorrow/, never Prologue art.
  check(g, 'House Chapter 1 uses its 14 independently declared scenes, each with its own House production file, not Prologue corridor art',
    c1.scene === 'house_of_tomorrow/arrival'
    && Object.keys(src('artwork.draft.json').scenes).filter((x) => x.startsWith('house_of_tomorrow/')).length === 14
    && Object.keys(st.assets.scenes).filter((x) => x.startsWith('house_of_tomorrow/')).every((x) => st.assets.scenes[x] === 'art/scenes/' + x + '.png'
      && src('artwork.draft.json').scenes[x].status === 'generated')
    && !src('artwork.draft.json').scenes['house_of_tomorrow/opening'], c1.scene);

  // Walk every distinct Prologue route to the hand-off (choices, SHOW/USE, and the item verbs that
  // can change the route), then take the hand-off from each and compare the state either side.
  const tested = {};
  (function scan(v) {
    if (Array.isArray(v)) return v.forEach(scan);
    if (!v || typeof v !== 'object') return;
    ['item', 'itemNot'].forEach((k) => { if (Array.isArray(v[k]) && typeof v[k][0] === 'string') tested[v[k][0] + ':' + v[k][1]] = true; });
    Object.keys(v).forEach((k) => scan(v[k]));
  })([st.chapters, st.items]);
  const verbsFor = (id) => ['inspect', 'read'].filter((verb) => (verb === 'inspect' ? !!st.items[id].inspect || tested[id + ':inspected'] : !!st.items[id].read && tested[id + ':read']));
  const marksKey = (s) => Object.keys(s.items).sort().map((k) => [k, s.items[k].filter((m) => tested[k + ':' + m]).sort()]).filter((e) => e[1].length);
  const keyOf = (s, v) => JSON.stringify([s.chapter, s.node, s.returnTo, s.flags, s.inventory.slice().sort(), marksKey(s), s.checks, v.cards.map((c) => c.id), v.items]);
  const first = Rules.begin(st, { seed: 'qa-handoff' }).state;
  const seen = {};
  const queue = [first];
  const atHall = [];
  let walked = 0;
  while (queue.length && walked < 50000) {
    const s = queue.shift();
    walked++;
    const v = Rules.view(st, s);
    const k = keyOf(s, v);
    if (seen[k]) continue;
    seen[k] = true;
    if (s.chapter !== 'prologue-00') continue;
    if (s.node === 'reception_hallway') { atHall.push(s); continue; }
    const inputs = v.cards.filter((c) => c.kind !== 'system').map((c) => ({ choice: c.id }));
    v.items.forEach((it) => {
      if (it.show) inputs.push({ item: it.id, verb: 'show' });
      if (it.use) inputs.push({ item: it.id, verb: 'use' });
      verbsFor(it.id).forEach((verb) => { if ((s.items[it.id] || []).indexOf(verb === 'inspect' ? 'inspected' : 'read') === -1) inputs.push({ item: it.id, verb }); });
    });
    inputs.forEach((input) => queue.push(Rules.step(st, s, input).state));
  }
  check(g, 'the walk reached the hand-off by many distinct routes (and finished)', !queue.length && atHall.length >= 20, [walked, atHall.length, queue.length]);
  const same = (a, x) => JSON.stringify(a) === JSON.stringify(x);
  const broken = [];
  const outcomes = {};
  atHall.forEach((s) => {
    const r = Rules.step(st, s, { choice: 'continue_to_chapter_01' });
    const a = r.state;
    const why = [];
    if (a.chapter !== 'chapter-01' || a.node !== 'house_arrival') why.push('arrived at ' + a.chapter + ':' + a.node);
    if (!same(a.flags, s.flags)) why.push('flags');
    if (!same(a.inventory, s.inventory)) why.push('inventory');
    if (!same(a.items, s.items)) why.push('item marks');
    if (!same(a.checks, s.checks)) why.push('resolved checks');
    if (a.seed !== s.seed) why.push('seed');
    if (a.objective !== 'FIND A FUNCTIONING BATHROOM.') why.push('authored Chapter 1 objective');
    if (!same(a.transcript.slice(0, s.transcript.length), s.transcript) || a.transcript.length <= s.transcript.length) why.push('NOTES history');
    if (!same(a.taken.slice(0, s.taken.length), s.taken) || a.taken.length !== s.taken.length + 1) why.push('taken log');
    if (r.events.some((e) => e.t === 'restart')) why.push('restart event');
    if (!r.events.some((e) => e.t === 'chapter' && e.id === 'chapter-01')) why.push('no chapter event');
    if (why.length) broken.push(why);
    outcomes[JSON.stringify([a.flags, a.inventory.slice().sort(), marksKey(a)])] = a;
  });
  check(g, 'every route preserves flags, inventory, marks, checks, seed and NOTES; Chapter 1 sets its authored objective', atHall.length && !broken.length, broken.slice(0, 5));
  const arrivals = Object.values(outcomes);
  const values = (f) => Array.from(new Set(arrivals.map((a) => JSON.stringify(a.flags[f])))).sort();
  check(g, 'different Prologue paths arrive in Chapter 1 with different outcomes (termination status, property record, retained item, inventory)', arrivals.length >= 10
    && values('termination_status').length >= 3 && values('property_record').length >= 3 && values('retained_item').length >= 2
    && new Set(arrivals.map((a) => JSON.stringify(a.inventory.slice().sort()))).size >= 4,
  { arrivals: arrivals.length, termination_status: values('termination_status'), property_record: values('property_record'), retained_item: values('retained_item') });

  // Those outcomes are usable as Chapter 1 conditions. A QA-only copy (never committed) adds
  // real forward choices at House arrival (restarting from a non-ending node is invalid).
  const probes = [];
  ['termination_status', 'property_record', 'retained_item', 'appointment_response'].forEach((f) => values(f).forEach((v) => probes.push({ if: { flagIs: [f, JSON.parse(v)] } })));
  Array.from(new Set(arrivals.reduce((l, a) => l.concat(a.inventory), []))).sort().forEach((id) => { probes.push({ if: { has: id } }); probes.push({ if: { lacks: id } }); });
  Object.keys(tested).forEach((k) => { const [id, m] = k.split(':'); probes.push({ if: { item: [id, m] } }); probes.push({ if: { itemNot: [id, m] } }); });
  // The validator refuses a card no route can ever see, so keep the probes some arrival satisfies.
  probes.splice(0, probes.length, ...probes.filter((p) => arrivals.some((a) => Rules.holds(p.if, a))));
  const t = copySource(STORY).edit(CHAPTER1, (j) => {
    j.nodes.house_arrival.choices = j.nodes.house_arrival.choices.concat(probes.map((p, i) => ({
      id: 'qa_probe_' + i, kind: 'action', text: 'QA PROBE ' + i, if: p.if, to: 'badge_registration'
    })));
  });
  const pb = build({ from: t.dir });
  const misses = [];
  if (pb.ok) {
    atHall.forEach((s) => {
      const a = Rules.step(pb.story, s, { choice: 'continue_to_chapter_01' }).state;
      const offered = Rules.view(pb.story, a).cards.map((c) => c.id);
      probes.forEach((p, i) => { if ((offered.indexOf('qa_probe_' + i) !== -1) !== Rules.holds(p.if, a)) misses.push([i, p.if]); });
    });
  }
  const distinctOffers = !pb.ok ? new Set() : new Set(atHall.map((s) => JSON.stringify(Rules.view(pb.story, Rules.step(pb.story, s, { choice: 'continue_to_chapter_01' }).state).cards.map((c) => c.id))));
  console.log('handoff walk: ' + walked + ' states walked, ' + atHall.length + ' distinct hand-off states, ' + arrivals.length + ' distinct Chapter 1 arrival outcomes, '
    + probes.length + ' condition probes, ' + distinctOffers.size + ' distinct probe sets offered; termination_status ' + values('termination_status').join('/')
    + ', property_record ' + values('property_record').join('/') + ', retained_item ' + values('retained_item').join('/'));
  check(g, 'Chapter 1 conditions see the Prologue outcome: each probe card is offered exactly when its condition holds, and routes differ', pb.ok && !misses.length && distinctOffers.size >= 10,
    pb.ok ? { misses: misses.slice(0, 5), distinctOffers: distinctOffers.size, probes: probes.length } : pb.report.errors);
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
