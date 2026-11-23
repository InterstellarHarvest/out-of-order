#!/usr/bin/env node
// Chapter 2 (Biology Park) engine acceptance on the imported story (Prologue to Chapter 3). No browser:
//   node game/qa/validate_ch02_routes.js
// Every route is a real Prologue -> House of Tomorrow -> Biology Park playthrough on a fixed seed
// whose real rolls give the outcomes the route names (game/qa/ch02_routes.js). Checks the House
// hand-off, every route's ending, flags and inventory, item gating both ways, the separate trams
// and the Courtesy Conductor, the antidote lifecycle (direct, read, take-on-close, inventory use,
// save/restore, no duplicates), the authored odds (pinned, not rebalanced) and coverage of every
// Chapter 2 node and both outcomes of every Chapter 2 check. Writes qa/ch02_route_results.json.
'use strict';
const fs = require('fs');
const path = require('path');
const R = require('./ch02_routes.js');
const Rules = R.Rules;
const story = require('../content/story.generated.js').story;
const CH2 = story.chapters['chapter-02'];
const results = [];
function check(group, name, ok, detail) {
  results.push({ group, name, ok: !!ok, detail: ok ? undefined : detail });
  if (!ok) console.log('FAIL', group, '-', name, detail === undefined ? '' : JSON.stringify(detail).slice(0, 700));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const cards = (s) => Rules.view(story, s).cards.map((c) => c.id);
const textOf = (s, from) => s.transcript.slice(from || 0).map((e) => e.runs.map((r) => r.text).join(' ')).join('\n');

// Steps a route recording every node, inventory and check outcome along the way.
function trace(start, steps) {
  const nodes = [start.chapter + ':' + start.node];
  const invs = [start.inventory.slice()];
  let s = start;
  for (const st of steps) {
    s = R.stepAll(story, s, [st]);
    nodes.push(s.chapter + ':' + s.node);
    invs.push(s.inventory.slice());
  }
  return { end: s, nodes, invs };
}
const visited = new Set();
const outcomes = new Set();
const noteOutcomes = (s) => Object.keys(s.checks).forEach((k) => { if (k.startsWith('ch2_')) outcomes.add(k + ':' + (s.checks[k].ok ? 'pass' : 'fail')); });

// 1. The House hand-off ----------------------------------------------------------------------------
{
  const g = 'handoff';
  ['plant', 'martin', 'showroom', 'clean', 'registered'].forEach((key) => {
    let exit = null;
    for (let seed = 1; seed <= 400 && !exit; seed++) exit = R.houseExit(story, key, seed);
    const h = R.HOUSE[key];
    const c = Rules.view(story, exit).cards;
    check(g, key + ': ' + h.exit + ' offers exactly one CONTINUE into chapter-02', c.length === 1 && c[0].kind === 'continue'
      && story.chapters['chapter-01'].nodes[h.exit].choices[0].chapter === 'chapter-02', c);
    const entry = R.enterChapter2(story, exit);
    check(g, key + ': arrives at chapter-02:bureau_arrival with inventory, flags, checks, marks and seed unchanged',
      entry.chapter === 'chapter-02' && entry.node === 'bureau_arrival' && same(entry.inventory, exit.inventory) && same(entry.flags, exit.flags)
      && same(entry.checks, exit.checks) && same(entry.items, exit.items) && entry.seed === exit.seed, { node: entry.node });
    check(g, key + ': Prologue and House NOTES carried (transcript prefix intact)', entry.transcript.length > exit.transcript.length
      && same(entry.transcript.slice(0, exit.transcript.length), exit.transcript));
    const want = key === 'registered' ? R.ARRIVAL.registered : R.ARRIVAL[h.route];
    const arrival = textOf(entry, exit.transcript.length);
    const others = Object.entries(R.ARRIVAL).filter(([k, re]) => re !== want).map(([k, re]) => re);
    check(g, key + ': route-dependent Bureau narration (' + want + ')', want.test(arrival) && !others.some((re) => re.test(arrival)), arrival.slice(0, 300));
    check(g, key + ': objective is the Chapter 2 bathroom objective', entry.objective === 'FIND AN OPERATING BATHROOM.', entry.objective);
  });
  let fatal = null;
  for (let seed = 1; seed <= 400 && !fatal; seed++) fatal = R.houseExit(story, 'chair_fatal', seed);
  const fc = Rules.view(story, fatal).cards;
  check(g, 'exit_chair_fatal stays fatal: an end node with only BEGIN AGAIN, no chapter-02 transition',
    story.chapters['chapter-01'].nodes.exit_chair_fatal.end === true && fc.length === 1 && fc[0].kind === 'system'
    && !story.chapters['chapter-01'].nodes.exit_chair_fatal.choices.some((c) => c.chapter), fc);
  const restarted = Rules.step(story, fatal, { choice: fc[0].id }).state;
  check(g, 'BEGIN AGAIN from the chair death starts a fresh Prologue (no carried items or flags)',
    restarted.chapter === 'prologue-00' && !restarted.inventory.includes('expo_examiner_badge') && !restarted.flags.house_exit_route);
}

// 2. Every route ---------------------------------------------------------------------------------
const found = {};
{
  const g = 'routes';
  R.ROUTES.concat(R.KIT_ROUTES).forEach((route) => {
    const f = R.findSeed(story, route, 4000);
    found[route.name] = f;
    if (!f) return check(g, route.name + ': a fixed seed plays it end to end', false);
    const t = trace(f.entry, route.steps);
    t.nodes.forEach((n) => visited.add(n));
    noteOutcomes(t.end);
    const s = t.end;
    const node = CH2.nodes[route.end];
    const e = route.e || {};
    const problems = [];
    if (s.node !== route.end) problems.push('ended at ' + s.node);
    if (route.fatal) {
      if (!node.end || !node.choices.every((c) => c.restart) || s.flags.chapter3_entry_group) problems.push('fatal ending is not terminal or set an entry group');
    } else {
      // Since Chapter 3 integration (docs/104) a living ending hands off: one CONTINUE into chapter-03.
      if (node.end || node.choices.length !== 1 || node.choices[0].kind !== 'continue' || node.choices[0].chapter !== 'chapter-03') problems.push('living ending does not continue into Chapter 3');
      if (s.flags.chapter3_entry_group !== e.group) problems.push('entry group ' + s.flags.chapter3_entry_group + ' != ' + e.group);
      if (e.exit && s.flags.ch2_exit_route !== e.exit) problems.push('exit route ' + s.flags.ch2_exit_route + ' != ' + e.exit);
    }
    (e.has || []).forEach((i) => { if (!s.inventory.includes(i)) problems.push('missing ' + i); });
    (e.lacks || []).forEach((i) => { if (s.inventory.includes(i)) problems.push('still holds ' + i); });
    Object.entries(e.flags || {}).forEach(([k, v]) => { if (s.flags[k] !== v) problems.push(k + '=' + s.flags[k] + ' != ' + v); });
    (e.notFlags || []).forEach((k) => { if (s.flags[k]) problems.push(k + ' is set'); });
    (route.notSeen || []).forEach((n) => { if (t.nodes.includes('chapter-02:' + n)) problems.push('visited ' + n); });
    Object.entries(route.text || {}).forEach(([n, re]) => { if (!re.test(textOf(s, f.entry.transcript.length))) problems.push('missing text at ' + n); });
    if (new Set(s.inventory).size !== s.inventory.length) problems.push('duplicate inventory');
    if (!same(s.transcript.slice(0, f.entry.transcript.length), f.entry.transcript)) problems.push('NOTES history lost');
    if (s.flags.house_exit_route !== f.exit.flags.house_exit_route || s.flags.termination_status !== f.exit.flags.termination_status) problems.push('inherited flags changed');
    // A sacrificed item never comes back later in the route.
    ['red_stapler', 'timing_clicker', 'rubber_band_ball', 'certified_seed_canister'].forEach((i) => {
      const at = t.invs.findIndex((inv, k) => k > 0 && t.invs[k - 1].includes(i) && !inv.includes(i));
      if (at !== -1 && t.invs.slice(at).some((inv) => inv.includes(i))) problems.push(i + ' restored after loss');
    });
    check(g, route.name + ' (seed ' + f.seed + ')', !problems.length, problems);
  });
}

// 3. Item gating: each conditional card is offered exactly when its real item/flag is held -------
{
  const g = 'gating';
  const at = (name, upto) => { const f = found[name]; return f && R.stepAll(story, f.entry, R.ROUTES.find((r) => r.name === name).steps.slice(0, upto)); };
  const strip = (s, item) => Object.assign(Rules.clone(s), { inventory: s.inventory.filter((x) => x !== item) });
  const add = (s, item) => Object.assign(Rules.clone(s), { inventory: s.inventory.concat([item]) });
  // Gardener: stapler jam needs the real red stapler.
  const gStapler = at('stapler_jam_pass', R.BUREAU.length);
  const gPlain = at('review_tower_trace_courier_carry', R.BUREAU.length);
  check(g, 'groundskeeper: stapler jam offered with the held red stapler, absent without', gStapler.node === 'gardener_choices'
    && cards(gStapler).includes('sacrifice_stapler_to_feeder') && !cards(gPlain).includes('sacrifice_stapler_to_feeder')
    && !cards(strip(gStapler, 'red_stapler')).includes('sacrifice_stapler_to_feeder'), [cards(gStapler), cards(gPlain)]);
  check(g, 'groundskeeper: Examiner inspection and hopper need no item', ['examine_landscape_performance', 'hide_in_supply_hopper'].every((c) => cards(gPlain).includes(c)));
  // Tower countermand needs the PHYSICAL Acting Director credential.
  const archive = at('director_badge_tower_cease_maintenance', R.BUREAU.length + R.G.director.length + 2);
  check(g, 'tower: countermand offered with the physical credential; removing the card (same flags) removes it; trace always offered',
    archive.node === 'tower_archive' && cards(archive).includes('issue_director_countermand') && !cards(strip(archive, 'acting_director_badge')).includes('issue_director_countermand')
    && cards(strip(archive, 'acting_director_badge')).includes('trace_original_requests'), cards(archive));
  check(g, 'tower: no flag stands in for the credential (promotion sets no flag)', !Object.keys(archive.flags).some((k) => /director/.test(k) && archive.flags[k]), archive.flags);
  // Appeal docket.
  const docketOf = (name) => { const r = R.ROUTES.find((x) => x.name === name); const i = r.steps.indexOf('contest_habitat_order'); return at(name, i + 1); };
  const dReg = docketOf('stapler_jam_fail_sorter_escape');
  const dDir = docketOf('director_refers_dispute_then_appeal');
  const dPlain = docketOf('walkway_fail_forest_fall_markers');
  check(g, 'appeal: House equipment claim only with equipment_registered', cards(dReg).includes('appeal_prior_house_equipment') && !cards(dPlain).includes('appeal_prior_house_equipment'));
  check(g, 'appeal: Director authority only with the physical credential; Examiner inspection only with the badge and without the credential',
    cards(dDir).includes('appeal_director_authority') && !cards(dDir).includes('appeal_examiner_inspection')
    && cards(dPlain).includes('appeal_examiner_inspection') && !cards(dPlain).includes('appeal_director_authority')
    && !cards(strip(dPlain, 'expo_examiner_badge')).includes('appeal_examiner_inspection'), [cards(dDir), cards(dPlain)]);
  check(g, 'appeal: biological evidence is open to everyone', [dReg, dDir, dPlain, strip(dPlain, 'expo_examiner_badge')].every((s) => cards(s).includes('appeal_biological_evidence')));
  // Planting interlocks.
  const plantOf = (name) => { const r = R.ROUTES.find((x) => x.name === name); const i = r.steps.indexOf('appeal_biological_evidence'); return at(name, i + 1); };
  const pStapler = plantOf('stapler_form_interlock_consumes_stapler');
  const pPlain = plantOf('uninfected_breakout_fail_chute_fatal');
  const pDir = plantOf('director_override_interlock');
  check(g, 'planting: physical breakout always offered', [pStapler, pPlain, pDir].every((s) => s.node === 'planting_active' && cards(s).includes('break_planting_restraints')));
  check(g, 'planting: equipment interlock iff equipment_registered; Examiner interlock iff badge and not registered',
    cards(pStapler).includes('invoke_existing_equipment_interlock') && !cards(pStapler).includes('present_examiner_interlock')
    && cards(pPlain).includes('present_examiner_interlock') && !cards(pPlain).includes('invoke_existing_equipment_interlock')
    && !cards(strip(pPlain, 'expo_examiner_badge')).includes('present_examiner_interlock'), [cards(pStapler), cards(pPlain)]);
  check(g, 'planting: stapler form iff held red stapler; Director override iff physical credential',
    cards(pStapler).includes('file_stapled_equipment_form') && !cards(pPlain).includes('file_stapled_equipment_form')
    && cards(pDir).includes('invoke_director_emergency_override') && !cards(pPlain).includes('invoke_director_emergency_override')
    && !cards(strip(pDir, 'acting_director_badge')).includes('invoke_director_emergency_override'), [cards(pStapler), cards(pDir)]);
  // Translator.
  const trOf = (name) => { const r = R.ROUTES.find((x) => x.name === name); return at(name, r.steps.indexOf('interfere_with_translator') + 1); };
  const tStapler = trOf('staple_loop_pass_tower_bypass');
  const tClicker = trOf('clicker_jam');
  const tBall = trOf('rubber_ball_jam');
  const tPlain = trOf('cables_pass_root_door_maintenance');
  check(g, 'translator: staple loop / clicker / rubber-band ball each offered only with that real held item',
    cards(tStapler).includes('staple_punch_tape_loop') && cards(tClicker).includes('jam_feed_with_clicker') && cards(tBall).includes('jam_feed_with_rubber_ball')
    && !['staple_punch_tape_loop', 'jam_feed_with_clicker', 'jam_feed_with_rubber_ball'].some((c) => cards(tPlain).includes(c))
    && !cards(tStapler).includes('jam_feed_with_clicker') && !cards(tClicker).includes('staple_punch_tape_loop'), [cards(tStapler), cards(tClicker), cards(tBall), cards(tPlain)]);
  check(g, 'translator: cables and tape reroute need no item', ['disconnect_biofeedback_cables', 'reroute_approval_punch_tape'].every((c) => cards(tPlain).includes(c)));
  // The retained-item flag alone never conjures the item.
  const flagged = Rules.clone(tPlain);
  flagged.flags.retained_item = 'red_stapler';
  check(g, 'a retained_item flag without the item offers no stapler card anywhere', !cards(flagged).includes('staple_punch_tape_loop')
    && !cards(strip(add(gStapler, 'timing_clicker'), 'red_stapler')).includes('sacrifice_stapler_to_feeder'));
  // Sacrificed stapler: both jam outcomes remove it once; the form interlock removes it; the loop keeps it.
  ['stapler_jam_pass', 'stapler_jam_fail_sorter_escape', 'stapler_jam_fail_sorter_fatal', 'stapler_form_interlock_consumes_stapler'].forEach((n) => {
    const f = found[n];
    check(g, n + ': red stapler held on entry and gone at the end', f && f.entry.inventory.includes('red_stapler') && !f.end.inventory.includes('red_stapler'));
  });
  check(g, 'staple loop keeps the stapler (not consumed)', found.staple_loop_pass_tower_bypass.end.inventory.includes('red_stapler')
    && found.staple_loop_fail_late_tower_contaminated_archive.end.inventory.includes('red_stapler'));
  // Courier canister: acquired only on accepting the assignment.
  const fl = at('review_tower_trace_courier_carry', R.ROUTES[0].steps.indexOf('accept_seed_courier'));
  check(g, 'seed canister is absent before the courier assignment and held after it', !fl.inventory.includes('certified_seed_canister')
    && R.stepAll(story, fl, ['accept_seed_courier']).inventory.includes('certified_seed_canister'));
}

// 4. Trams and the Courtesy Conductor ----------------------------------------------------------------
{
  const g = 'tram';
  const n = CH2.nodes;
  check(g, 'the rooted tour tram and the reserve car are different scenes and nodes', n.tour_rooted.scene === 'biology_park/overgrown_tram'
    && n.reserve_tram.scene === 'biology_park/reserve_tram' && !JSON.stringify(n.tour_rooted).includes('reserve_tram"'));
  check(g, 'the conductor speaks only in robot_concourse_crash (the only courtesy_conductor dialogue node)',
    Object.entries(n).filter(([, x]) => x.speaker === 'courtesy_conductor').map(([id]) => id).join() === 'robot_concourse_crash');
  const spur = n.reserve_tram.choices.find((c) => c.id === 'activate_emergency_spur');
  check(g, 'the conductor wakes only on a successful emergency-spur roll', spur.check && spur.pass.to === 'robot_concourse_crash' && spur.fail.to === 'silent_tram_descent'
    && n.reserve_tram.choices.filter((c) => c.id !== 'activate_emergency_spur').every((c) => !JSON.stringify(c).includes('robot_concourse_crash')));
  const ok = found.reserve_spur_robot_concourse, quiet = found.reserve_spur_silent_station;
  const tOk = trace(ok.entry, R.ROUTES.find((r) => r.name === 'reserve_spur_robot_concourse').steps);
  const tQuiet = trace(quiet.entry, R.ROUTES.find((r) => r.name === 'reserve_spur_silent_station').steps);
  check(g, 'pass: robot dialogue, concourse crash, liability, no station', tOk.nodes.includes('chapter-02:robot_concourse_crash') && !tOk.nodes.includes('chapter-02:station_ticket')
    && /What a wonderful day for an emergency/.test(textOf(ok.end, ok.entry.transcript.length)));
  check(g, 'fail: silent, inert robot, underground station, certification, no liability, no robot speech', !tQuiet.nodes.includes('chapter-02:robot_concourse_crash')
    && tQuiet.nodes.includes('chapter-02:station_ticket') && !/wonderful day/.test(textOf(quiet.end, quiet.entry.transcript.length))
    && /No voice answers/.test(textOf(quiet.end, quiet.entry.transcript.length)));
  ['tram_roof_pass_reserve_power_pass_courier_destroy', 'tram_rescue_reserve_power_fail_maintenance', 'tram_siding_walk_tracks'].forEach((name) => {
    const f = found[name];
    const t = trace(f.entry, R.ROUTES.find((r) => r.name === name).steps);
    check(g, name + ': the robot never activates', !t.nodes.includes('chapter-02:robot_concourse_crash') && !f.end.flags.courtesy_driver_activated && !f.end.flags.tram_crash_liability);
  });
  check(g, 'improvised tram exits offer no antidote supply', ['end_concourse_robot', 'end_underground_station'].every((id) => !JSON.stringify(n[id]).includes('antidote'))
    && !tOk.nodes.some((x) => /kit|exit_staging|customs_exit/.test(x)) && !tQuiet.nodes.some((x) => /kit|exit_staging|customs_exit/.test(x)));
}

// 5. Antidotes: odds pinned, lifecycle, no duplicates, save/restore ------------------------------------
{
  const g = 'antidote';
  const n = CH2.nodes;
  const mods = [{ if: { flag: 'spore_infected', notFlag: 'thorn_infected' }, add: -1 }, { if: { flag: 'thorn_infected' }, add: -2 }];
  const NEED = { public: 3, maintenance: 4, customs: 3 };
  Object.entries(R.KIT).forEach(([src, k]) => {
    const checks = [n[k.focus].choices.find((c) => c.id === k.direct).check, n[k.readFocus].choices.find((c) => c.id === k.afterRead).check, n[k.at].use[k.item].check];
    check(g, src + ': authored odds unchanged (need ' + NEED[src] + ', spore -1, thorn -2) for direct, read and inventory use',
      checks.every((c) => c.sides === 6 && c.need === NEED[src] && same(c.mods, mods)), checks);
    check(g, src + ': the only inventory use entry for its injector is at its own exit, keyed to its own item id',
      Object.entries(n).filter(([, x]) => x.use && Object.keys(x.use).some((i) => /antidote/.test(i))).every(([id, x]) => id !== k.at || Object.keys(x.use).join() === k.item));
    check(g, src + ': READ shows the expiry (' + k.expiry + ')', new RegExp('EXPIRATION: ' + k.expiry).test(n[k.readFocus].text));
    check(g, src + ': both kit focus nodes are scene pickups wired to their real cards', n[k.focus].scenePickup && n[k.focus].scenePickup.item === k.item
      && n[k.focus].scenePickup.useChoice === k.direct && n[k.focus].scenePickup.readChoice === k.read && n[k.focus].scenePickup.closeChoice === k.close
      && n[k.readFocus].scenePickup.readChoice === null && n[k.readFocus].scenePickup.useChoice === k.afterRead && n[k.readFocus].scenePickup.closeChoice === k.closeRead);
  });
  // Chance by infection, from the rules themselves.
  const chance = (src, flags) => Rules.chance(n[R.KIT[src].at].use[R.KIT[src].item].check, (n[R.KIT[src].at].use[R.KIT[src].item].check.mods || [])
    .reduce((a, m) => a + (Rules.holds(m.if, { flags, inventory: [], items: {}, checks: {} }) ? m.add : 0), 0));
  check(g, 'chance table: public/customs 4/6 healthy, 3/6 spore, 2/6 thorn or both; maintenance 3/6, 2/6, 1/6',
    ['public', 'customs'].every((s) => same([chance(s, {}), chance(s, { spore_infected: true }), chance(s, { thorn_infected: true }), chance(s, { spore_infected: true, thorn_infected: true })], [4 / 6, 3 / 6, 2 / 6, 2 / 6]))
    && same([chance('maintenance', {}), chance('maintenance', { spore_infected: true }), chance('maintenance', { thorn_infected: true })], [3 / 6, 2 / 6, 1 / 6]));
  R.KIT_ROUTES.forEach((route) => {
    const f = found[route.name];
    if (!f) return;
    const k = R.KIT[route.kit];
    const t = trace(f.entry, route.steps);
    const iOpen = route.steps.indexOf(k.open);
    const kitStates = t.invs.slice(iOpen + 1, route.lifecycle === 'take' ? iOpen + 2 : iOpen + 1 + (route.lifecycle === 'read' ? 3 : 2));
    const problems = [];
    if (route.lifecycle !== 'take' && t.invs.some((inv) => inv.includes(k.item))) problems.push('injector entered inventory without a pickup');
    if (route.lifecycle === 'take') {
      const afterClose = t.invs[iOpen + 2];
      if (afterClose.filter((x) => x === k.item).length !== 1) problems.push('close did not give exactly one injector');
      if (t.nodes[iOpen + 2] !== 'chapter-02:' + k.at) problems.push('close did not return to the exit');
      if (t.invs[iOpen + 3].includes(k.item)) problems.push('inventory use did not consume the dose');
    }
    const pre = R.stepAll(story, f.entry, route.steps.slice(0, iOpen));
    const infectedBefore = route.infection === 'thorn' ? pre.flags.thorn_infected : pre.flags.spore_infected;
    if (!infectedBefore) problems.push('not infected before treatment');
    const after = R.stepAll(story, f.entry, route.steps.slice(0, route.steps.length - 1));
    const still = !!(after.flags.spore_infected || after.flags.thorn_infected);
    if (route.cure && still) problems.push('success did not clear both infections');
    if (!route.cure && !still) problems.push('failure cured');
    if (cards(after).includes(k.open)) problems.push('kit can be opened again');
    if (route.lifecycle === 'read' && !/EXPIRATION/.test(textOf(after, pre.transcript.length))) problems.push('label text not shown');
    check(g, route.name + ' (seed ' + f.seed + ')', !problems.length && kitStates.length >= 0, problems);
  });
  // Save / restore at every pickup stage: no duplicate, no re-collection.
  const r = R.KIT_ROUTES.find((x) => x.kit === 'public' && x.lifecycle === 'take' && x.infection === 'spore' && x.cure);
  const f = found[r.name];
  const k = R.KIT.public;
  const iOpen = r.steps.indexOf(k.open);
  const atFocus = R.stepAll(story, f.entry, r.steps.slice(0, iOpen + 1));
  const back1 = Rules.restore(story, Rules.serialize(story, atFocus));
  check(g, 'save/restore inside the open kit: same node, no injector, kit still open-able only by its own cards', back1.state.node === k.focus
    && same(back1.state.inventory, atFocus.inventory) && !back1.state.inventory.includes(k.item) && cards(back1.state).join() === cards(atFocus).join());
  const afterTake = R.stepAll(story, atFocus, [k.close]);
  const back2 = Rules.restore(story, Rules.serialize(story, afterTake)).state;
  check(g, 'save/restore after taking: exactly one injector, the kit cannot be reopened', back2.inventory.filter((x) => x === k.item).length === 1
    && !cards(back2).includes(k.open) && back2.flags.public_kit_handled === true);
  const used = Rules.step(story, back2, { item: k.item, verb: 'use' }).state;
  const back3 = Rules.restore(story, Rules.serialize(story, used)).state;
  check(g, 'save/restore after inventory use: the dose stays consumed, the check stays resolved', !back3.inventory.includes(k.item)
    && back3.checks[k.useCheck] && back3.checks[k.useCheck].ok === used.checks[k.useCheck].ok && !Rules.view(story, back3).items.some((i) => i.id === k.item));
  const readHeld = Rules.step(story, back2, { item: k.item, verb: 'read' }).state;
  check(g, 'a held injector can be inspected and read through the ordinary inventory (its expiry text then shows)',
    /EXPIRED 1977/.test(Rules.describe ? Rules.describe(story, readHeld, k.item) : JSON.stringify(story.items[k.item].description)) && (readHeld.items[k.item] || []).includes('read'));
  // Healthy player: using a dose changes no infection and creates none.
  const healthy = found.walkway_pass_forest_overhead_biology_appeal_spore_free;
  const atPublic = R.stepAll(story, healthy.entry, R.ROUTES.find((x) => x.name === 'walkway_pass_forest_overhead_biology_appeal_spore_free').steps.slice(0, -1));
  const dosed = R.stepAll(story, atPublic, [k.open, k.direct]);
  check(g, 'a healthy player using a dose is not infected by it', atPublic.node === k.at && !dosed.flags.spore_infected && !dosed.flags.thorn_infected && dosed.node === k.at, dosed.flags);
}

// 6. Coverage ------------------------------------------------------------------------------------
{
  const g = 'coverage';
  const all = Object.keys(CH2.nodes).map((id) => 'chapter-02:' + id);
  const missing = all.filter((id) => !visited.has(id));
  check(g, 'every one of the ' + all.length + ' Chapter 2 nodes is reached by some route', !missing.length, missing);
  const ids = new Set();
  Object.values(CH2.nodes).forEach((nd) => {
    (nd.choices || []).forEach((c) => { if (c.check) ids.add(c.check.id); });
    Object.values(nd.use || {}).forEach((e) => { if (e.check) ids.add(e.check.id); });
  });
  const lacking = [];
  ids.forEach((id) => ['pass', 'fail'].forEach((w) => { if (!outcomes.has(id + ':' + w)) lacking.push(id + ':' + w); }));
  check(g, 'both outcomes of all ' + ids.size + ' Chapter 2 checks are played', !lacking.length, lacking);
  const groups = new Set(Object.values(found).filter(Boolean).map((f) => f.end.flags.chapter3_entry_group).filter(Boolean));
  check(g, 'all three Chapter 3 entry groups are reached', same([...groups].sort(), ['public_concourse', 'service_infrastructure', 'underground_transit']), [...groups]);
}

const groups = {};
results.forEach((r) => { const x = (groups[r.group] = groups[r.group] || { total: 0, passed: 0 }); x.total++; if (r.ok) x.passed++; });
const passed = results.filter((r) => r.ok).length;
const seeds = Object.fromEntries(Object.entries(found).map(([k, v]) => [k, v && v.seed]));
fs.writeFileSync(path.join(__dirname, 'ch02_route_results.json'), JSON.stringify({ schema: 'cyoa-ch02-route-validation-v1', total: results.length, passed,
  failed: results.length - passed, groups, nodesVisited: visited.size, outcomesPlayed: outcomes.size, seeds, checks: results }, null, 2) + '\n');
console.log('Chapter 2 route validation ' + passed + '/' + results.length + ' passed', JSON.stringify(groups), 'nodes ' + [...visited].filter((x) => x.startsWith('chapter-02:')).length, 'outcomes ' + outcomes.size);
process.exit(passed === results.length ? 0 : 1);
