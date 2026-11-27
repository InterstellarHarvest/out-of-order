#!/usr/bin/env node
// DEVELOPMENT / REVIEW ONLY (game issue #27). Not part of the game and never loaded by it.
//
// Builds tools/review/review-starts.generated.js: genuine saves at chapter boundaries, for reviewing the
// Chapter 3 -> 4 hand-off, Chapter 4 and the Form 27B-6 transitions without replaying the whole game.
// Every save is a real playthrough made by the real rules from Rules.begin, with real dice (the QA route
// catalogue, game/qa/ch03_routes.js, finds fixed seeds whose rolls take each route): no invented
// inventory, flags or rolls. Each save stands on a chapter's last node, its CONTINUE not yet taken, so
// pressing CONTINUE in the game crosses the boundary exactly as play does.
//
//   node tools/review/build-review-starts.js        (after tools/story-import/import.js)
// Then serve the repository root (python3 -m http.server) and open /tools/review/index.html.
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const C = require(path.join(ROOT, 'game/qa/ch03_routes.js'));
const Rules = C.Rules;
const { story } = require(path.join(ROOT, 'game/content/story.generated.js'));

// Record every committed step, per playthrough seed, so a route's chapter boundaries can be found.
const realStep = Rules.step;
let log = {};
Rules.step = function (st, state, input) {
  const r = realStep(st, state, input);
  if (r.events.some((e) => e.t === 'chapter')) (log[state.seed] = log[state.seed] || []).push({ before: state, input, events: r.events });
  return r;
};

const starts = [];
const save = (state) => Rules.serialize(story, state, { presented: state.transcript.length });
function boundaryStates(seed) {
  return (log[seed] || []).filter((x) => x.events.some((e) => e.t === 'chapter')).map((x) => x.before);
}
// One route per Chapter 3 ending, preferring routes whose carried items matter in Chapter 4.
const PICK = [
  ['presenter_release', 'presenter_help_end', 'holds the Temporary Staff Pass'],
  ['presenter_begin', 'backstage_exit', 'holds the Temporary Staff Pass'],
  ['key_stapler', 'backstage_exit', 'Facilities Key shown; Red Stapler used in Chapter 3'],
  ['leap_fail', 'locomotion_fail', ''],
  ['pull', 'paper_problem_end', ''],
  ['honest', 'attendant_honest_end', ''],
  ['dash_fail', 'door_dash_fail', ''],
  ['back', 'door_reverse_end', '']
];
let earlier = null;
for (const [name, end, note] of PICK) {
  const route = C.ROUTES.find((r) => r.name === name);
  if (!route || route.end !== end) throw new Error('no Chapter 3 route ' + name + ' to ' + end);
  log = {};
  const f = C.findSeed(story, route);
  if (!f) throw new Error('no seed takes route ' + name);
  const items = f.end.inventory.map((id) => story.items[id].name).join(', ');
  starts.push({ id: 'ch3-' + end + (name.indexOf('presenter') === 0 ? '-pass' : ''), group: 'Chapter 3 ending -> Chapter 4', label: 'CH3 ENDING ' + end.toUpperCase().replace(/_/g, ' '),
    note: [note, 'carries: ' + (items || 'nothing')].filter(Boolean).join(' · '), seed: f.seed, node: f.end.chapter + ':' + f.end.node, save: save(f.end) });
  if (!earlier) {
    // The same playthrough's earlier boundaries: the last node of the Prologue, Chapter 1 and Chapter 2.
    earlier = boundaryStates(String(f.seed)).filter((s) => s.chapter !== 'chapter-03').map((s) => ({
      id: s.chapter + '-end', group: 'Earlier chapter boundaries', label: s.chapter.toUpperCase() + ' LAST NODE (' + s.node + ')',
      note: 'same playthrough as CH3 ENDING ' + end.toUpperCase().replace(/_/g, ' '), seed: f.seed, node: s.chapter + ':' + s.node, save: save(s) }));
  }
}
// Chapter 4 moments: a real path (choices and SHOW / USE, found by breadth-first search with the real rules)
// from a real Chapter 3 ending through its CONTINUE, stopping on the target node. For a fatal ending the save
// stands on the decision before it, from a playthrough seed whose real roll makes that decision fatal.
Rules.step = realStep;
// Breadth-first search over real steps; returns the list of inputs to the first state where `stop(state)` holds.
function search(start, stop) {
  // The transcript never decides a rule: the search walks states without it (the path is replayed on the real state).
  const seen = new Set(), q = [{ s: Object.assign({}, start, { transcript: [], presentFrom: 0 }), path: [] }];
  const keyOf = (s) => s.node + "|" + s.inventory.slice().sort().join(",");
  while (q.length) {
    const { s, path: p } = q.shift();
    const hit = stop(s);
    if (hit) return { path: p, hit };
    const v = Rules.view(story, s);
    if (v.end || s.chapter !== 'chapter-04') continue;
    const inputs = v.cards.map((c) => ({ choice: c.id })).concat(...v.items.map((it) => ['show', 'use'].filter((vb) => it[vb]).map((vb) => ({ item: it.id, verb: vb }))));
    for (const input of inputs) {
      let t;
      try { t = Rules.step(story, s, input).state; } catch (e) { continue; }
      t.transcript = []; t.presentFrom = 0;
      const k = keyOf(t);
      if (!seen.has(k)) { seen.add(k); q.push({ s: t, path: p.concat([input]) }); }
    }
  }
  return null;
}
// The decision at a state whose check can lead to `target` (a choice or SHOW / USE entry with pass/fail there).
function deadlyInput(s, target) {
  const n = story.chapters[s.chapter].nodes[s.node], v = Rules.view(story, s);
  for (const c of v.cards) { const e = n.choices.find((x) => x.id === c.id); if (e && e.check && [e.pass, e.fail].some((o) => o && o.to === target)) return { choice: c.id }; }
  for (const it of v.items) for (const vb of ['show', 'use']) { const e = it[vb] && n[vb] && n[vb][it.id]; if (e && e.check && [e.pass, e.fail].some((o) => o && o.to === target)) return { item: it.id, verb: vb }; }
  return null;
}
const CH4 = [
  ['ch4-bridal-door', 'hotel_bridal_door_focus', false, 'bridal privacy panel Focus A with the INSPECT action'],
  ['ch4-bixby', 'hotel_commodore_bixby', false, 'NEW-18 threshold: wheel mounted, then the water beat'],
  ['ch4-lot61', 'hotel_lot61_pod_auction', false, 'Lot 61 demonstration (pod states)'],
  ['ch4-restroom-burst', 'hotel_restroom_plumber', false, 'restroom burst beat (B2-18 states)'],
  ['ch4-fatal-stall', 'fatal_stall_final_occupancy', true, 'FINAL OCCUPANCY'],
  ['ch4-fatal-boiler', 'fatal_boiler_pressed_and_steamed', true, 'PRESSED AND STEAMED'],
  ['ch4-fatal-lot61', 'fatal_lot61_folded', true, 'FOLDED FOR CONVENIENCE'],
  ['ch4-fatal-gown', 'fatal_bridal_made_to_measure', true, 'MADE TO MEASURE']
];
const ch4Starts = [];
// Source playthroughs: the Chapter 3 routes above; each route's first few seeds, entered into Chapter 4.
const seedCache = {};
function seedsOf(name) {
  if (seedCache[name]) return seedCache[name];
  const route = C.ROUTES.find((r) => r.name === name), entry = C.ENTRIES[route.entry], out = [];
  for (let seed = 1; seed <= 6000 && out.length < 16; seed++) {
    const c2 = C.chapter2End(story, entry, seed);
    if (!c2) continue;
    let end;
    try { end = C.R.stepAll(story, C.enterChapter3(story, c2.end), route.steps); } catch (e) { continue; }
    if (end.node !== route.end) continue;
    out.push({ seed, end: route.end, entry: Rules.step(story, end, { choice: Rules.view(story, end).cards[0].id }).state });
  }
  return (seedCache[name] = out);
}
for (const [id, target, fatal, note] of CH4) {
  let found = null;
  for (const [name] of PICK) {
    const seeds = seedsOf(name);
    if (!seeds.length) continue;
    const r = search(seeds[0].entry, fatal ? (s) => deadlyInput(s, target) : (s) => s.node === target);
    if (!r) continue;
    for (const cand of fatal ? seeds : [seeds[0]]) {
      let s = cand.entry;
      try { r.path.forEach((inp) => { s = Rules.step(story, s, inp).state; }); } catch (e) { continue; }
      // A moment's save stands on the decision before it, so the arrival (and its timed art) is seen live.
      if (!fatal) {
        let prev = cand.entry;
        r.path.slice(0, -1).forEach((inp) => { prev = Rules.step(story, prev, inp).state; });
        if (s.node === target) found = { seed: cand.seed, from: cand.end, state: prev, input: r.path[r.path.length - 1] };
        break;
      }
      const inp = deadlyInput(s, target);
      if (inp && Rules.step(story, s, inp).state.node === target) { found = { seed: cand.seed, from: cand.end, state: s, input: inp }; break; }
    }
    if (found) break;
  }
  if (!found) throw new Error('no review playthrough reaches ' + target);
  ch4Starts.push({ id, group: 'Chapter 4 moments (real playthroughs)', label: 'CH4 ' + (fatal ? 'FATAL ' + note : target.toUpperCase().replace(/_/g, ' ')),
    note: 'stands on ' + found.state.node + '; ' + (found.input.choice || found.input.verb + ' ' + found.input.item).toUpperCase() + (fatal ? ' is fatal on this playthrough' : ' leads to ' + target + ' (' + note + ')') + ' · via CH3 ' + found.from.toUpperCase().replace(/_/g, ' '),
    next: found.input,
    seed: found.seed, node: found.state.chapter + ':' + found.state.node, save: save(found.state) });
}
starts.push(...ch4Starts);
const out = '// GENERATED by tools/review/build-review-starts.js for content ' + story.version + '. DEVELOPMENT / REVIEW ONLY.\n'
  + 'window.REVIEW_STARTS = ' + JSON.stringify({ story: story.id, version: story.version, starts: earlier.concat(starts) }, null, 1) + ';\n';
fs.writeFileSync(path.join(__dirname, 'review-starts.generated.js'), out);
console.log('review starts: ' + earlier.concat(starts).map((s) => s.id).join(', '));
