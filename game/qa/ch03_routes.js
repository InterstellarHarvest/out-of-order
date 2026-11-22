// Chapter 3 (The People's Pavilion, approved reboot) route catalogue, shared by the engine suite
// (validate_ch03.js) and the browser suite (run_ch03_qa.js). docs/104.
//
// Every route is a real playthrough: a real Prologue, a real House of Tomorrow exit, a real Chapter 2
// route to one of its five living endings (game/qa/ch02_routes.js), that ending's CONTINUE card into
// Chapter 3, then the Chapter 3 cards. No invented inventory, flags or dice: findSeed() searches fixed
// seeds for one whose real rolls give exactly the outcomes a route names (Chapter 2's and Chapter 3's).
'use strict';
const R = require('./ch02_routes.js');
const Rules = R.Rules;
const ch2 = (name) => { const r = R.ROUTES.find((x) => x.name === name); if (!r) throw new Error('no Chapter 2 route ' + name); return r; };

// Chapter 3 entries: real Chapter 2 routes, chosen for their entry group and the inherited items they
// actually carry into Chapter 3 (measured on the real routes, docs/104 section 6).
const ENTRIES = {
  public: { route: ch2('tram_siding_walk_tracks'), group: 'public_concourse', end: 'end_public' },
  customs: { route: ch2('review_tower_trace_courier_carry'), group: 'public_concourse', end: 'end_customs' },
  robot: { route: ch2('reserve_spur_robot_concourse'), group: 'public_concourse', exit: 'tram_robot_crash', end: 'end_concourse_robot' },
  maintenance: { route: ch2('cables_pass_root_door_maintenance'), group: 'service_infrastructure', end: 'end_maintenance' },
  underground: { route: ch2('reserve_spur_silent_station'), group: 'underground_transit', end: 'end_underground_station' },
  photo: { route: ch2('director_refers_dispute_then_appeal'), group: 'public_concourse', end: 'end_public' },
  stapler: { route: ch2('staple_loop_pass_tower_bypass'), group: 'public_concourse', end: 'end_public' },
  stapler_spent: { route: ch2('stapler_form_interlock_consumes_stapler'), group: 'public_concourse', end: 'end_public' },
  // The House's retained applause clicker, carried through a Chapter 2 route that never spends it.
  clicker: { route: Object.assign({}, ch2('tram_siding_walk_tracks'), { name: 'clicker_kept_tram_siding', house: 'clicker_martin' }), group: 'public_concourse', end: 'end_public' },
  clicker_spent: { route: ch2('clicker_jam'), group: 'public_concourse', end: 'end_public' }
};
// The arrival narration each entry produces (pavilion_arrival's first matching variant).
const ARRIVAL = { tram_robot_crash: /wrecked Courtesy Conductor/, public_concourse: /emerge from Biology Park into the main Exposition concourse/,
  service_infrastructure: /narrow maintenance staircase/, underground_transit: /forgotten station into a tiled passage/ };

// Chapter 3 cards.
const OPEN = ['approach_real_restroom', 'approach_pavilion_attendant', 'ask_attendant_for_restroom'];
const KEY = [{ item: 'wc_key', verb: 'show' }];
const A = (k) => [k ? 'demand_human_verification_after_key' : 'demand_human_verification', 'listen_to_presenter'];
const B = (k) => [k ? 'demand_record_of_original_after_key' : 'demand_record_of_original', 'review_record_with_attendant', 'tell_attendant_record_is_not_person'];
const C = (k) => [k ? 'try_unapproved_restroom_entry_after_key' : 'try_unapproved_restroom_entry', 'respond_to_open_door'];
const BRANCHES = {
  urgency: { via: A, steps: ['announce_urgent_need', 'let_exhibit_continue', 'say_you_need_it_too', 'leave_urgency_stage'], end: 'backstage_exit' },
  leap_pass: { via: A, steps: ['step_off_stage', 'leap_from_locomotion_stage', 'exit_locmotion_backstage'], checks: { ch3_locomotion_leap: true }, end: 'backstage_exit' },
  leap_fail: { via: A, steps: ['step_off_stage', 'leap_from_locomotion_stage'], checks: { ch3_locomotion_leap: false }, end: 'locomotion_fail' },
  presenter_begin: { via: A, steps: ['challenge_presenter_identity', 'start_presenter_demonstration', 'depart_surprise_stage'], end: 'backstage_exit' },
  presenter_release: { via: A, steps: ['challenge_presenter_identity', 'free_real_presenter'], end: 'presenter_help_end' },
  photo: { via: A, steps: [{ item: 'family_portrait_photo', verb: 'show' }, 'ask_whether_photo_proves_identity', 'escort_photo_backstage'], end: 'backstage_exit', needs: 'family_portrait_photo' },
  scan: { via: B, steps: ['scan_original_record', 'challenge_paper_privilege', 'escort_paper_to_backstage'], end: 'backstage_exit' },
  pull: { via: B, steps: ['pull_original_record'], end: 'paper_problem_end' },
  honest: { via: B, steps: ['ask_attendant_personal_belief', 'ask_why_attendant_ignores_evidence'], end: 'attendant_honest_end' },
  stapler: { via: B, steps: [{ item: 'red_stapler', verb: 'use' }, 'leave_printer_via_maintenance'], end: 'backstage_exit', needs: 'red_stapler', takes: ['red_stapler'] },
  dash_pass: { via: C, steps: ['dash_through_restroom_exit', 'follow_exit_assistance_backstage'], checks: { ch3_restroom_dash: true }, end: 'backstage_exit' },
  dash_fail: { via: C, steps: ['dash_through_restroom_exit'], checks: { ch3_restroom_dash: false }, end: 'door_dash_fail' },
  hold: { via: C, steps: ['ask_visitor_to_hold_door', 'leave_courtesy_demonstration'], end: 'backstage_exit' },
  back: { via: C, steps: ['back_into_restroom_exit'], end: 'door_reverse_end' }
};
// Entry per branch: spread over every entry group (arrival variants), with the item routes on the
// entries that really carry the item.
const ENTRY_OF = { urgency: 'public', leap_pass: 'maintenance', leap_fail: 'underground', presenter_begin: 'robot', presenter_release: 'customs', photo: 'photo',
  scan: 'maintenance', pull: 'customs', honest: 'underground', stapler: 'stapler', dash_pass: 'robot', dash_fail: 'public', hold: 'underground', back: 'maintenance' };
const ENTRY_OF_KEY = { urgency: 'robot', leap_pass: 'public', leap_fail: 'customs', presenter_begin: 'maintenance', presenter_release: 'underground', photo: 'robot',
  scan: 'public', pull: 'underground', honest: 'robot', stapler: 'stapler', dash_pass: 'underground', dash_fail: 'maintenance', hold: 'customs', back: 'public' };

// The 28 authored route variants (14 branches, directly or through the Facilities Key callback), plus
// the inherited-clicker routes: with the clicker held its +1 is applied (and turns a raw 3 into a pass);
// a clicker spent in Chapter 2 (or never kept) adds nothing.
const ROUTES = [];
for (const key of [false, true]) {
  for (const [b, br] of Object.entries(BRANCHES)) {
    ROUTES.push({ name: (key ? 'key_' : '') + b, branch: b, key, entry: (key ? ENTRY_OF_KEY : ENTRY_OF)[b],
      steps: OPEN.concat(key ? KEY : [], br.via(key), br.steps), checks: br.checks || {}, end: br.end, needs: br.needs, takes: br.takes || [] });
  }
}
ROUTES.push({ name: 'clicker_leap_raw3_pass', branch: 'leap_pass', key: false, entry: 'clicker', steps: OPEN.concat(A(false), BRANCHES.leap_pass.steps),
  checks: { ch3_locomotion_leap: true }, rolls: { ch3_locomotion_leap: 3 }, bonus: { ch3_locomotion_leap: 1 }, end: 'backstage_exit', takes: [], clicker: true });
ROUTES.push({ name: 'clicker_leap_fail', branch: 'leap_fail', key: false, entry: 'clicker', steps: OPEN.concat(A(false), BRANCHES.leap_fail.steps),
  checks: { ch3_locomotion_leap: false }, bonus: { ch3_locomotion_leap: 1 }, end: 'locomotion_fail', takes: [], clicker: true });
ROUTES.push({ name: 'clicker_spent_leap_raw3_fails', branch: 'leap_fail', key: false, entry: 'clicker_spent', steps: OPEN.concat(A(false), BRANCHES.leap_fail.steps),
  checks: { ch3_locomotion_leap: false }, rolls: { ch3_locomotion_leap: 3 }, bonus: { ch3_locomotion_leap: 0 }, end: 'locomotion_fail', takes: [] });
ROUTES.push({ name: 'stapler_spent_record', branch: 'scan', key: false, entry: 'stapler_spent', steps: OPEN.concat(B(false), BRANCHES.scan.steps), checks: {}, end: 'backstage_exit', takes: [], noUse: 'red_stapler' });

const ENDINGS = ['backstage_exit', 'locomotion_fail', 'presenter_help_end', 'paper_problem_end', 'attendant_honest_end', 'door_dash_fail', 'door_reverse_end'];

// The Chapter 2 living ending's own CONTINUE card into Chapter 3.
function enterChapter3(story, endState) {
  const cards = Rules.view(story, endState).cards;
  if (cards.length !== 1) throw new Error('a Chapter 2 living ending should offer exactly one card, has ' + cards.map((c) => c.id));
  return Rules.step(story, endState, { choice: cards[0].id }).state;
}
// Plays the entry's Chapter 2 route from a seed: the state standing on its living ending, or null.
function chapter2End(story, entry, seed) {
  const r2 = entry.route;
  const exit = R.houseExit(story, r2.house, seed);
  if (!exit) return null;
  let end;
  try { end = R.stepAll(story, R.enterChapter2(story, exit), r2.steps); } catch (e) { if (e.missing) return null; throw e; }
  if (end.node !== r2.end) return null;
  if (Object.entries(r2.checks || {}).some(([id, ok]) => !end.checks[id] || end.checks[id].ok !== ok)) return null;
  return { exit, end };
}
// Finds a fixed seed whose real rolls take the whole route. Returns { seed, exit, ch2End, entry, end }.
function findSeed(story, route, maxSeed) {
  const entry = ENTRIES[route.entry];
  for (let seed = 1; seed <= (maxSeed || 6000); seed++) {
    const c2 = chapter2End(story, entry, seed);
    if (!c2) continue;
    const start = enterChapter3(story, c2.end);
    let end;
    try { end = R.stepAll(story, start, route.steps); } catch (e) { if (e.missing) continue; throw e; }
    if (end.node !== route.end) continue;
    if (Object.entries(route.checks || {}).some(([id, ok]) => !end.checks[id] || end.checks[id].ok !== ok)) continue;
    if (Object.entries(route.rolls || {}).some(([id, roll]) => !end.checks[id] || end.checks[id].roll !== roll)) continue;
    return { seed, exit: c2.exit, ch2End: c2.end, entry: start, end };
  }
  return null;
}

module.exports = { R, Rules, ENTRIES, ARRIVAL, OPEN, KEY, BRANCHES, ROUTES, ENDINGS, enterChapter3, chapter2End, findSeed };
