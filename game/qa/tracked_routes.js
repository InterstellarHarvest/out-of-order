// Tracked playthroughs for the death-control suites (docs/96): every step through Rules.step and
// the restore points through Rules.trackPoints, exactly as js/story-flow.js does when the review
// gate (?deathproof) is on. Real Prologue routes; no invented inventory, flags or dice.
'use strict';
const Rules = require('../js/rules.js');
const R = require('./ch02_routes.js');

const START = ['head_to_restroom', 'drone_show_form', 'sign_notice', 'signed_move_on', 'go_to_exit', 'take_box_and_leave'];
const TO_EXPO = ['enter_exposition', 'pass_turnstile'];
const AFTER_RECEPTION = ['speak_to_receptionist', 'ask_for_restroom', 'wait_for_assistance', 'accept_for_directions', 'move_on_practical', 'leave_reception', 'continue_to_chapter_01'];
const KEEP = { desk_plant: 'keep_plant', red_stapler: 'keep_stapler', timing_clicker: 'keep_clicker', rubber_band_ball: 'keep_band_ball' };
const CHAIR = R.HOUSE.chair_fatal.path.slice(0, -1); // to chair_locked, nothing kept
const STAPLER_CHAIR = R.HOUSE.stapler_clean.path.slice(0, R.HOUSE.stapler_clean.path.indexOf('enter_rest_assured') + 1); // stapler recovered

function tracked(story, item, seed) {
  const b = Rules.begin(story, { seed: String(seed) });
  const t = { state: b.state, points: Rules.trackPoints(story, null, null, null, b), log: [], cursor: null };
  t.step = (input) => {
    const inp = typeof input === 'string' ? { choice: input } : input;
    if (inp.choice && !Rules.view(story, t.state).cards.some((c) => c.id === inp.choice)) { const e = new Error('lacks ' + inp.choice + ' at ' + t.state.node); e.missing = true; throw e; }
    const before = t.state;
    const r = Rules.step(story, before, inp);
    t.points = Rules.trackPoints(story, t.points, before, inp, r);
    t.state = r.state;
    t.log.push({ inp, before, after: r.state, events: r.events });
    return t;
  };
  t.steps = (list) => { list.forEach(t.step); return t; };
  t.restore = (kind) => { const r = Rules.restoreFrom(story, t.state, t.points, kind); if (!r.ok) throw new Error(r.reason); t.state = r.state; t.points = r.points; t.cursor = r.cursor; return t; };
  // The save the gated game writes: state, cursor (fully presented) and points, in one envelope.
  t.save = (presented) => Rules.serialize(story, t.state, { presented: presented === undefined ? t.state.transcript.length : presented, points: t.points });
  t.steps(START).step({ item: 'effects_box_full', verb: 'inspect' }).steps(TO_EXPO)
    .steps(item ? ['keep_one', KEEP[item], 'continue_to_reception_kept_one'] : ['deposit_all', 'continue_to_reception_stored']).steps(AFTER_RECEPTION);
  return t;
}

module.exports = { tracked, CHAIR, STAPLER_CHAIR, START, TO_EXPO, AFTER_RECEPTION, KEEP };
