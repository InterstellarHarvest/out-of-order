#!/usr/bin/env node
// Story-v2 rules validation (docs/72 S1/S2, docs/74). No browser needed:
//   node game/qa/validate_story.js
// 1. Reception compatibility: Rules.fromV1 + begin/step/view against the v1 API, state by state,
//    over every reachable reception state; and the route suite's own checks on the v2 engine.
// 2. The neutral fixture (qa/fixtures/engine_fixture.js): validation, event order, conditional
//    effects, kinds, Focus return, chapters, history windows, transcript roles, purity.
// 3. Mutants: invalid stories the validator must reject.
// 4-7. S2: checks, saves, the presentation contract, check mutants.
// 8. S2.1 (docs/80): whole-playthrough NOTES, risk markers in the view, independent endings
//    (qa/fixtures/endings_fixture.js).
// Writes qa/story_results.json.
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const Rules = require('../js/rules.js');
const reception = require('../content/reception.js');
const FIXTURE = require('./fixtures/engine_fixture.js');
const ENDINGS = require('./fixtures/endings_fixture.js');
const { lines } = require('./v1_on_v2.js');

const charset = Object.keys(JSON.parse(fs.readFileSync(path.join(ROOT, 'art/ui/sprites/fonts/locked_pixel_font_atlas.json'))).mapping);
const results = [];
function check(group, name, ok, detail) {
  results.push({ group, name, ok: !!ok, detail });
  if (!ok) console.log('FAIL', group, '-', name, detail === undefined ? '' : JSON.stringify(detail).slice(0, 600));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const fixture = () => Rules.clone(FIXTURE);
const throws = (fn, re) => { try { fn(); return false; } catch (e) { return re ? re.test(e.message) : true; } };
const text = (entries) => entries.map((e) => e.runs.map((r) => r.text).join(' '));

// Play a fixture script: each step is a choice id, or 'verb:item'. Returns every intermediate.
function play(story, script, opts) {
  let r = Rules.begin(story, opts);
  const trail = [r];
  script.forEach((st) => {
    const m = /^(inspect|read|show|use):(.+)$/.exec(st);
    r = Rules.step(story, r.state, m ? { item: m[2], verb: m[1] } : st === 'context' ? { context: true } : { choice: st });
    trail.push(r);
  });
  return { state: r.state, events: r.events, trail };
}
const cards = (story, s) => Rules.view(story, s).cards.map((c) => c.id);
// The first seed (1, 2, ...) under which a script's check comes out as wanted.
function seedFor(story, script, check, ok) {
  for (let i = 1; i < 1000; i++) {
    const r = play(story, script, { seed: String(i) });
    if (r.state.checks[check] && r.state.checks[check].ok === ok) return String(i);
  }
  throw new Error('no seed gives ' + check + ' ' + ok);
}

// ================================================================================================
// 1. Reception compatibility (EF-N1)
// ================================================================================================
{
  const G = 'reception';
  const before = JSON.stringify(reception);
  const story = Rules.fromV1(reception);
  check(G, 'fromV1 leaves the v1 content untouched', JSON.stringify(reception) === before);
  check(G, 'fromV1 gives a one-chapter, no-save, production v2 story of dialogue nodes with the receptionist',
    story.schema === 'cyoa-story-v2' && story.save === false && story.profile === 'production' && Object.keys(story.chapters).length === 1
    && Object.values(story.chapters.reception.nodes).every((n) => n.mode === 'dialogue' && n.speaker === 'receptionist')
    && story.cast.receptionist.name === reception.speaker);
  const kinds = Object.values(story.chapters.reception.nodes).flatMap((n) => n.choices.map((c) => [c.id, c.kind]));
  check(G, 'every v1 choice is kind spoken (BEGIN AGAIN is system): nothing is reclassified by its wording before S9',
    kinds.every(([id, k]) => k === (id === 'restart' ? 'system' : 'spoken')), kinds.filter(([id, k]) => k !== 'spoken'));
  const allText = (o) => JSON.stringify(o).match(/"[A-Z][^"]*[A-Z.?!:)\]]"/g).sort();
  check(G, 'fromV1 keeps every authored string exactly, brackets included', same(allText(reception.nodes), allText(story.chapters.reception.nodes)));

  const v1 = Rules.validate(reception, charset);
  const v2 = Rules.validateStory(story, charset);
  check(G, 'the v2 validator passes the reception', v2.ok, v2.errors);
  check(G, 'the v2 walk finds exactly the v1 route: same nodes, choices, reachable states, endings and ending states',
    ['nodes', 'choices', 'reachableStates', 'endings', 'endingStates'].every((k) => v1.stats[k] === v2.stats[k]), { v1: v1.stats, v2: v2.stats });

  // The art ids fromV1 registers are the files stage.js draws today.
  const stage = fs.readFileSync(path.join(ROOT, 'game/js/stage.js'), 'utf8');
  const stagePaths = ['scene', 'portraitBackground', 'portraitNpc'].map((k) => new RegExp(k + ":\\s*\\{[^}]*path:\\s*'([^']+)'").exec(stage)[1]);
  const p = story.assets.portraits.receptionist;
  check(G, 'fromV1 registers exactly the art stage.js draws (scene, portrait background, receptionist)',
    same(stagePaths, [story.assets.scenes['conference_hall/reception'], p.backgrounds[p.background], p.poses[p.pose]]), stagePaths);

  // Lock-step walk: every reachable v1 state next to its v2 twin, every move compared.
  const key = (s) => JSON.stringify([s.node, s.flags, s.inventory.slice().sort(), Object.keys(s.items).sort().map((k) => [k, s.items[k].slice().sort()])]);
  const diffs = [];
  let compared = 0, moves = 0;
  function compareState(s1, s2, where) {
    const v = Rules.view(story, s2);
    const c1 = Rules.choices(reception, s1).map((c) => [c.id, c.text]);
    const c2 = v.cards.map((c) => [c.id, c.text]);
    const own = (k) => same(s1[k], s2[k]);
    const items1 = s1.inventory.map((id) => { const a = Rules.itemActions(reception, s1, id); return [id, !!a.read, !!a.show, !!a.use, Rules.description(reception, s1, id)]; });
    const items2 = v.items.map((i) => [i.id, i.read, i.show, i.use, Rules.description(story, s2, i.id)]);
    const ctx1 = Rules.contextAction(reception, s1);
    const problems = [];
    if (!same(c1, c2)) problems.push('cards');
    if (!['node', 'flags', 'inventory', 'items', 'objective'].every(own)) problems.push('state');
    if (!same(items1, items2)) problems.push('items');
    if (!same(Rules.files(reception, s1), v.files)) problems.push('files');
    if (!same([ctx1 && ctx1.label, Rules.contextSpent(reception, s1)], [v.context && v.context.label, v.context && v.context.spent])) problems.push('context');
    if (v.mode !== 'dialogue' || v.scene !== 'conference_hall/reception' || !v.portrait || v.portrait.background !== 'reception' || v.portrait.pose !== 'idle') problems.push('presentation');
    if (problems.length) diffs.push({ where, problems });
    compared++;
  }
  function compareMove(t1, s1, r2, s2, where) {
    const l1 = t1.transcript.slice(s1.transcript.length);
    const l2 = lines(r2.state.transcript.slice(s2.transcript.length));
    moves++;
    if (!same(l1, l2)) diffs.push({ where, problems: ['lines'], l1, l2 });
    if (r2.state.presentFrom !== s2.transcript.length) diffs.push({ where, problems: ['presentFrom'] });
  }
  const s1 = Rules.start(reception);
  const b2 = Rules.begin(story);
  check(G, 'the opening line is the same', same(s1.transcript, lines(b2.state.transcript)));
  const seenKeys = { [key(s1)]: true };
  const queue = [[s1, b2.state]];
  while (queue.length) {
    const [a, b] = queue.shift();
    compareState(a, b, a.node);
    const next = [];
    Rules.choices(reception, a).forEach((c) => {
      const t1 = Rules.clone(a);
      const r1 = Rules.choose(reception, t1, c.id);
      const r2 = Rules.step(story, b, { choice: c.id });
      if (r1.restart) {
        moves++;
        if (!(r2.events[0].t === 'restart' && same(lines(r2.state.transcript), Rules.start(reception).transcript))) diffs.push({ where: a.node + ':' + c.id, problems: ['restart'] });
        return;
      }
      Rules.enter(reception, t1, r1.to);
      compareMove(t1, a, r2, b, a.node + ':' + c.id);
      next.push([t1, r2.state]);
    });
    a.inventory.forEach((id) => {
      const acts = Rules.itemActions(reception, a, id);
      const t1 = Rules.clone(a);
      Rules.inspect(reception, t1, id);
      next.push([t1, Rules.step(story, b, { item: id, verb: 'inspect' }).state]);
      if (acts.read) {
        const t = Rules.clone(a);
        Rules.itemAction(reception, t, id, 'read');
        const r2 = Rules.step(story, b, { item: id, verb: 'read' });
        compareMove(t, a, r2, b, a.node + ':read:' + id);
        next.push([t, r2.state]);
      }
      ['show', 'use'].forEach((kind) => {
        if (!acts[kind]) return;
        const t = Rules.clone(a);
        const r1 = Rules.itemAction(reception, t, id, kind);
        Rules.enter(reception, t, r1.to);
        const r2 = Rules.step(story, b, { item: id, verb: kind });
        compareMove(t, a, r2, b, a.node + ':' + kind + ':' + id);
        next.push([t, r2.state]);
      });
    });
    // The context action, wherever it is offered (never part of the route).
    if (Rules.contextAction(reception, a) && !Rules.contextSpent(reception, a)) {
      const t = Rules.clone(a);
      Rules.takeContextAction(reception, t);
      compareMove(t, a, Rules.step(story, b, { context: true }), b, a.node + ':context');
    }
    next.forEach(([x, y]) => { const k = key(x); if (!seenKeys[k]) { seenKeys[k] = true; queue.push([x, y]); } });
  }
  check(G, 'lock-step over every reachable reception state: v2 offers the same cards, item verbs, descriptions, FILES, context action, objective and state as v1',
    diffs.length === 0 && compared === v1.stats.reachableStates, { compared, diffs: diffs.slice(0, 3) });
  check(G, 'lock-step over every move (choices, READ, SHOW, USE, OBSERVE, restart): v2 writes exactly the v1 lines, in order, with presentFrom at the step start',
    diffs.length === 0 && moves > compared, { moves });

  // The route suite itself, unchanged, on the v2 engine.
  let routeV2;
  try {
    execFileSync(process.execPath, [path.join(__dirname, 'validate_route.js'), '--v2'], { encoding: 'utf8' });
  } catch (e) { /* the results file says what failed */ }
  try { routeV2 = JSON.parse(fs.readFileSync(path.join(__dirname, 'route_results_v2.json'), 'utf8')); } catch (e) { routeV2 = null; }
  const routeV1 = JSON.parse(fs.readFileSync(path.join(__dirname, 'route_results.json'), 'utf8'));
  check(G, 'validate_route.js --v2: all of the route suite\'s checks pass on the v2 engine, with the v1 stats',
    routeV2 && routeV2.passed === routeV2.total && routeV2.total === routeV1.total && routeV2.stats.reachableStates === routeV1.stats.reachableStates,
    routeV2 && { passed: routeV2.passed, total: routeV2.total, failed: routeV2.checks.filter((c) => !c.ok).map((c) => c.name) });

  const ctxStory = Rules.fromV1(reception);
  const o = play(ctxStory, ['ask-politely', 'context']);
  check(G, 'OBSERVE through step(): one thought entry, nothing else changes, and a second take is refused',
    o.state.transcript.slice(-1)[0].src === 'thought' && o.state.transcript.slice(-1)[0].runs[0].role === 'thought'
    && same(Rules.view(ctxStory, o.state).cards, Rules.view(ctxStory, o.trail[1].state).cards)
    && throws(() => Rules.step(ctxStory, o.state, { context: true }), /already taken/));
}

// ================================================================================================
// 2. The fixture
// ================================================================================================
{
  const G = 'fixture';
  const story = fixture();
  const report = Rules.validateStory(story, charset);
  check(G, 'EF-N2: the fixture validates (no dead end; every node, choice, variant, file entry reachable; an ending from every state)', report.ok, report.errors);
  check(G, 'EF-N2: the walk explores both chapters and many states', report.stats && report.stats.chapters === 2 && report.stats.reachableStates > 100, report.stats);

  // Begin: chapter, scene, mode, objective, then the passage.
  const b = Rules.begin(story);
  check(G, 'begin: events are chapter, scene, mode, objective, text, in that order',
    same(b.events.map((e) => e.t), ['chapter', 'scene', 'mode', 'objective', 'text']) && b.events[2].to === 'narrative', b.events.map((e) => e.t));
  check(G, 'begin: the three-paragraph B passage is three narration paragraphs on the narrative surface',
    b.events[4].surface === 'narrative' && b.events[4].paras.length === 3 && b.events[4].paras.every((p) => p.length === 1 && p[0].role === 'narration'));
  check(G, 'begin: state is v2 at the start node, nothing yet presented', b.state.v === 2 && b.state.chapter === 'fx_one' && b.state.node === 'wake'
    && b.state.presentFrom === 0 && b.state.steps === 1 && b.state.transcript.length === 3);

  // Purity and atomicity.
  const snap = JSON.stringify(b.state);
  const r = Rules.step(story, b.state, { choice: 'open-drawer' });
  check(G, 'step() never modifies the state it is given (the caller swaps in the new one)', JSON.stringify(b.state) === snap && r.state !== b.state);
  check(G, 'a refused step throws and changes nothing',
    throws(() => Rules.step(story, b.state, { choice: 'lean' }), /not available/) && JSON.stringify(b.state) === snap);
  check(G, 'presentation-only CONTINUE is not a rules step: step({ continue }) is refused',
    throws(() => Rules.step(story, b.state, { continue: true }), /presentation only/) && JSON.stringify(b.state) === snap);
  check(G, 'unknown inputs are refused', throws(() => Rules.step(story, b.state, { choice: 'open-drawer', extra: 1 }), /Unknown step input/)
    && throws(() => Rules.step(story, b.state, { item: 'fx_card', verb: 'read' }), /Not holding/));

  // A once stay choice with conditional effects.
  check(G, 'open-drawer: an items event (gained the card), then the result as narration; the card is once and gone',
    same(r.events.map((e) => e.t), ['items', 'text']) && same(r.events[0].gained, ['fx_card']) && r.events[1].paras[0][0].role === 'narration'
    && r.state.node === 'wake' && !cards(story, r.state).includes('open-drawer') && r.state.presentFrom === 3);
  check(G, 'a stay does not repeat the node\'s arrival text', text(r.state.transcript).filter((t) => /SMALL GREY ROOM/.test(t)).length === 1);
  check(G, 'conditional effect: the drawer does not change the objective when the code was not asked', r.state.objective === 'LEAVE THE TEST ROOM.');
  const asked = play(story, ['go-counter', 'ask-code', 'thanks', 'open-drawer']);
  check(G, 'conditional effect: after asking, the drawer also changes the objective (objective event after the items event)',
    asked.state.objective === 'THE CODE STARTS WITH A FOUR. TRY THE KEYPAD.' && same(asked.events.map((e) => e.t), ['items', 'objective', 'text']));
  const askedAfter = play(story, ['open-drawer', 'go-counter', 'ask-code']);
  check(G, 'conditional effect, other order: asking while holding the card changes the objective',
    askedAfter.state.objective === 'THE CODE STARTS WITH A FOUR. TRY THE KEYPAD.' && askedAfter.events.some((e) => e.t === 'objective'));

  // EF-N4 (second half): each conditional effect sees the ones before it.
  const mini = Rules.clone(story);
  mini.chapters.fx_one.nodes.wake.choices[1].effects = [{ set: { askedCode: true } }, { if: { flag: 'askedCode' }, give: ['fx_card'] }];
  const m = Rules.step(mini, Rules.begin(mini).state, { choice: 'open-drawer' });
  check(G, 'EF-N4: a conditional effect sees the effects listed before it in the same step', m.state.inventory.includes('fx_card') && m.state.flags.askedCode);

  // Dialogue: spoken and action echoes, direction, motion data.
  const d = play(story, ['go-counter', 'lean']);
  const enterCounter = d.trail[1];
  check(G, 'entering a dialogue: a mode event, then the line; a desc run is a direction, the plain string is the speaker\'s speech',
    same(enterCounter.events.map((e) => e.t), ['mode', 'text']) && same(enterCounter.events[1].paras[0].map((x) => [x.role, x.who]), [['direction', null], ['speech', 'attendant']]));
  check(G, 'an action choice in dialogue: echoed as an action by you (not speech), then its result as a direction',
    same(d.events.map((e) => e.t), ['echo', 'text']) && d.events[0].role === 'action' && d.events[0].paras[0][0].role === 'action'
    && d.events[1].paras[0][0].role === 'direction' && d.state.node === 'counter' && !cards(story, d.state).includes('lean'));
  const sp = play(story, ['go-counter', 'ask-code']);
  check(G, 'a spoken choice in dialogue: echoed as speech by you, unquoted, then the move and the reply',
    sp.events[0].t === 'echo' && sp.events[0].role === 'speech' && sp.events[0].paras[0][0].who === 'you' && sp.events[0].paras[0][0].text === 'HM. WHAT IS THE CODE?'
    && sp.state.node === 'counter_code');
  check(G, 'view cards carry their kind for presentation (spoken / action / continue / system)',
    same(Rules.view(story, enterCounter.state).cards.map((c) => c.kind), ['spoken', 'action', 'action']));

  // Narrative B: spoken choices are not echoed; their result narrates them.
  const passAsked = ['go-counter', 'ask-code', 'thanks', 'examine-keypad', 'try-code'];
  const callOut = play(story, passAsked.concat(['call-out']), { seed: seedFor(story, passAsked, 'fx_door', true) });
  check(G, 'a spoken choice in B is not echoed: its result narrates it, with the speech as a run by you',
    same(callOut.events.map((e) => e.t), ['text']) && same(callOut.events[0].paras[0].map((x) => [x.role, x.who]), [['narration', null], ['speech', 'you'], ['narration', null]]));

  // Focus A and its return (EF-N9).
  const k = play(story, ['open-drawer', 'examine-keypad']);
  check(G, 'B -> A: a mode event, the focus description on the focus surface; returnTo is the opener',
    same(k.events.map((e) => e.t), ['mode', 'text']) && k.events[1].surface === 'focus' && k.state.returnTo === 'wake'
    && Rules.view(story, k.state).focus === 'fixture/room_a/keypad' && Rules.view(story, k.state).portrait === null);
  const back = Rules.step(story, k.state, { choice: 'stop' });
  check(G, 'EF-N9: back lands on the opener without its arrival effects or text; the result is appended to B',
    back.state.node === 'wake' && back.state.returnTo === null && same(back.events.map((e) => e.t), ['mode', 'text'])
    && back.events[1].surface === 'narrative' && text(back.state.transcript).filter((t) => /SMALL GREY ROOM/.test(t)).length === 1
    && back.state.objective === k.state.objective);
  check(G, 'EF-N9: the opener\'s spent once choice stays gone after the return', !cards(story, back.state).includes('open-drawer'));
  const v = Rules.view(story, back.state);
  check(G, 'history: on return, the B window is the whole B log so far plus the result; the focus text is not in it',
    same(v.history.narrative.map((i) => back.state.transcript[i].src), ['text', 'text', 'text', 'result', 'result'])
    && v.history.narrative.every((i) => back.state.transcript[i].mode === 'narrative'));
  check(G, 'history: the focus window is the current visit only', same(Rules.view(story, k.state).history.focus, [k.state.transcript.length - 1]) && same(v.history.focus, []));
  check(G, 'back is not offered without an opener', throws(() => Rules.step(story, b.state, { choice: 'stop' })));
  const viaDialogue = play(story, ['go-counter', 'ask-code', 'thanks']);
  check(G, 'dialogue -> dialogue keeps the opener; back from the second returns to B',
    viaDialogue.trail[2].state.returnTo === 'wake' && viaDialogue.state.node === 'wake' && viaDialogue.state.returnTo === null);

  // Chapters, scenes, USE in B, SHOW in B, end and restart.
  const route = ['open-drawer', 'read:fx_card', 'examine-keypad', 'try-code', 'crawl', 'use:fx_card', 'go-up'];
  const full = play(story, route, { seed: seedFor(story, route.slice(0, 4), 'fx_door', false) });
  const crawl = full.trail[5];
  check(G, 'a scene change: scene event (no mode event: B to B), the objective, then the passage',
    same(crawl.events.map((e) => e.t), ['scene', 'objective', 'text']) && crawl.events[0].id === 'fixture/room_b');
  const guess = full.trail[4];
  check(G, 'a focus outcome that leaves: check event, mode event, the result on the destination (B) surface, then the arrival',
    same(guess.events.map((e) => e.t), ['check', 'mode', 'text', 'text']) && guess.events[2].surface === 'narrative' && guess.state.returnTo === null);
  const use = full.trail[6];
  check(G, 'USE in B: no echo, the item leaves (items event), the result narrates, then the arrival variant reflects the use',
    same(use.events.map((e) => e.t), ['items', 'text', 'text']) && same(use.events[0].lost, ['fx_card'])
    && /DOORS OPEN AT ONCE/.test(use.events[2].paras[0][0].text) && (use.state.items.fx_card || []).includes('used'));
  check(G, 'SHOW is unavailable in B (no one to show it to)',
    Rules.view(story, crawl.state).items[0].show === false && throws(() => Rules.step(story, crawl.state, { item: 'fx_card', verb: 'show' })));
  const up = full.trail[7];
  check(G, 'a chapter transition: chapter event, scene event, objective, passage; the opener is cleared',
    same(up.events.map((e) => e.t), ['chapter', 'scene', 'objective', 'text']) && up.events[0].title === 'FIXTURE TWO'
    && up.state.chapter === 'fx_two' && up.state.returnTo === null);
  check(G, 'history (S2.1, owner lock [76]): NOTES is the whole playthrough, chapter one included; B in chapter two starts again',
    same(Rules.view(story, up.state).history.notes, up.state.transcript.map((e, i) => i))
    && same(Rules.view(story, up.state).history.narrative, [up.state.transcript.length - 1]));
  check(G, 'EF-N10: the chapter-two arrival differs by the check outcome and by whether the attendant was asked',
    new Set([
      up.events[3].paras[0][0].text,
      play(story, passAsked.concat(['call-lift', 'go-up']), { seed: seedFor(story, passAsked, 'fx_door', true) }).events[3].paras[0][0].text,
      ((sc) => play(story, sc.concat(['call-lift', 'go-up']), { seed: seedFor(story, sc, 'fx_door', true) }))(['open-drawer', 'read:fx_card', 'examine-keypad', 'try-code']).events[3].paras[0][0].text
    ]).size === 3);
  const fin = Rules.step(story, up.state, { choice: 'finish' });
  check(G, 'a continue choice is a real, committed step with the default CONTINUE card; reaching an end emits end',
    Rules.view(story, up.state).cards[0].text === 'CONTINUE' && Rules.view(story, up.state).cards[0].kind === 'continue'
    && fin.events.slice(-1)[0].t === 'end' && fin.state.taken.slice(-1)[0].c === 'finish' && !fin.events.some((e) => e.t === 'echo'));
  const again = Rules.step(story, fin.state, { choice: 'restart' });
  check(G, 'BEGIN AGAIN (system): a restart event, then a fresh playthrough from the start',
    again.events[0].t === 'restart' && again.state.node === 'wake' && again.state.inventory.length === 0 && again.state.transcript.length === 3 && again.state.taken.length === 0);

  // EF-N11: transcript roles.
  const everyone = [full, callOut, d, sp, asked, viaDialogue].flatMap((p) => p.state.transcript);
  const runs = everyone.flatMap((e) => e.runs.map((x) => Object.assign({ src: e.src, mode: e.mode }, x)));
  check(G, 'EF-N11: an action is never stored as speech; echoes are unquoted; B and A results are narration; dialogue results are direction',
    runs.filter((x) => x.src === 'echo').every((x) => !/"/.test(x.text) && (x.role === 'speech' || x.role === 'action'))
    && !runs.some((x) => x.src === 'echo' && x.text === 'LEAN ON THE COUNTER.' && x.role !== 'action')
    && runs.filter((x) => x.src === 'result' && x.mode !== 'dialogue').every((x) => x.role === 'narration' || (x.role === 'speech' && x.who === 'you'))
    && runs.filter((x) => x.src === 'result' && x.mode === 'dialogue').every((x) => x.role === 'direction'));
  check(G, 'every transcript entry records its step, source, surface, chapter, scene and node',
    everyone.every((e) => e.n >= 1 && ['text', 'echo', 'result', 'thought'].includes(e.src) && Rules.MODES.includes(e.mode) && e.chapter && e.scene && e.node && Array.isArray(e.runs)));
  check(G, 'the decision log records every committed choice and item action, in order',
    same(full.state.taken.map((t) => t.c || t.verb + ':' + t.item), ['open-drawer', 'examine-keypad', 'try-code', 'crawl', 'use:fx_card', 'go-up']));
  check(G, 'paras(): \\n splits paragraphs; roles come from the context, never from the words',
    same(Rules.paras('[SIGH.] OK.\nNEXT.', { role: 'speech', who: 'you', speaker: 'you' }), [[{ role: 'speech', who: 'you', text: '[SIGH.] OK.' }], [{ role: 'speech', who: 'you', text: 'NEXT.' }]]));
}

// ================================================================================================
// 3. Mutants: each must be rejected (EF-N3)
// ================================================================================================
{
  const G = 'mutants';
  function mutant(name, edit, story) {
    const copy = Rules.clone(story || FIXTURE);
    edit(copy);
    const r = Rules.validateStory(copy, charset);
    check(G, 'rejects: ' + name, !r.ok, r.errors && r.errors.slice(0, 2));
  }
  const N = (c, ch, id) => c.chapters[ch].nodes[id];
  mutant('a choice with no kind', (c) => { delete N(c, 'fx_one', 'wake').choices[0].kind; });
  mutant('an unknown kind', (c) => { N(c, 'fx_one', 'wake').choices[0].kind = 'shout'; });
  mutant('quotes authored in card text', (c) => { N(c, 'fx_two', 'arrive').choices[0].text = '"ONWARD."'; });
  mutant('brackets authored in card text', (c) => { N(c, 'fx_one', 'counter').choices[1].text = '[LEAN ON THE COUNTER.]'; });
  mutant('back in a narrative node', (c) => { N(c, 'fx_one', 'side_hatch').choices.push({ id: 'b', kind: 'action', text: 'GO BACK', back: true }); });
  mutant('a back choice reachable with no opener (the chapter starts in the dialogue)', (c) => { c.chapters.fx_one.start = 'counter'; });
  mutant('a focus node without a focus id', (c) => { delete N(c, 'fx_one', 'keypad').focus; });
  mutant('a dialogue node without a speaker', (c) => { delete N(c, 'fx_one', 'counter').speaker; });
  mutant('a dialogue node whose speaker is not in the cast', (c) => { N(c, 'fx_one', 'counter').speaker = 'janitor'; });
  mutant('an unknown run key', (c) => { N(c, 'fx_one', 'counter').text[0] = { gesture: 'SHE WAVES.' }; });
  mutant('a run with two role keys', (c) => { N(c, 'fx_one', 'counter').text[0] = { desc: 'SHE WAVES.', say: 'HELLO.' }; });
  mutant('a think run before the thought contract', (c) => { N(c, 'fx_one', 'wake').choices[1].result = ['YOU OPEN IT.', { think: 'ODD.' }]; });
  mutant('a say run naming an unknown speaker', (c) => { N(c, 'fx_one', 'corridor').choices[1].result = [{ say: 'HELLO?', who: 'ghost' }]; });
  mutant('a stay choice that changes nothing', (c) => { delete N(c, 'fx_one', 'counter').choices[1].once; });
  mutant('a choice leading to a missing chapter', (c) => { N(c, 'fx_one', 'lift').choices[0].chapter = 'fx_three'; });
  mutant('a choice leading to a node in another chapter (to is within the chapter)', (c) => { N(c, 'fx_one', 'lift').choices[0] = { id: 'go-up', kind: 'action', text: 'UP', to: 'arrive' }; });
  mutant('two destinations on one choice', (c) => { N(c, 'fx_one', 'lift').choices[0].to = 'wake'; });
  mutant('SHOW in a B node', (c) => { N(c, 'fx_one', 'corridor').show = { fx_card: { result: 'YOU HOLD IT UP.', to: 'lift' } }; });
  mutant('say on a choice in a B node (it would never be echoed)', (c) => { N(c, 'fx_one', 'wake').choices[0].say = 'I LOOK.'; });
  mutant('USE in a dialogue node without the line it echoes', (c) => { N(c, 'fx_one', 'counter').use = { fx_card: { to: 'counter_code' } }; });
  mutant('a conditional last variant', (c) => { N(c, 'fx_one', 'lift').text[1].if = { flag: 'askedCode' }; });
  mutant('a text mixing runs and variants', (c) => { N(c, 'fx_one', 'lift').text.push('ALSO THIS.'); });
  mutant('an unregistered scene id', (c) => { N(c, 'fx_one', 'corridor').scene = 'fixture/room_z'; });
  mutant('an unregistered focus id', (c) => { N(c, 'fx_one', 'keypad').focus = 'fixture/room_a/lamp'; });
  mutant('a registered asset nobody uses', (c) => { c.assets.focus['fixture/room_a/desk'] = null; });
  mutant('null art in a production story', (c) => { c.profile = 'production'; });
  mutant('an unknown condition in a conditional effect', (c) => { N(c, 'fx_one', 'wake').choices[1].effects[1].if = { flagged: 'askedCode' }; });
  mutant('a conditional effect setting an undeclared flag', (c) => { N(c, 'fx_one', 'counter').choices[0].effects[0].set = { askedCdoe: true }; });
  mutant('an objective the fonts cannot draw', (c) => { N(c, 'fx_one', 'corridor').objective = 'TAKE THE LIFT ↑'; });
  mutant('restart outside an end node', (c) => { N(c, 'fx_one', 'lift').choices.push({ id: 'r', kind: 'system', text: 'AGAIN.', restart: true }); });
  mutant('restart on a non-system choice', (c) => { N(c, 'fx_two', 'end').choices[0].kind = 'action'; });
  mutant('a start node in focus mode', (c) => { c.chapters.fx_one.start = 'keypad'; });
  mutant('a context action on a B node', (c) => { N(c, 'fx_one', 'wake').contextAction = { id: 'x', label: 'LOOK', glyph: 'watch', text: 'HM.' }; });
  mutant('an unknown node field', (c) => { N(c, 'fx_one', 'wake').npc = 'HELLO.'; });
  mutant('a node nobody can reach', (c) => { c.chapters.fx_two.nodes.orphan = { mode: 'narrative', text: 'NOBODY.', choices: [{ id: 'x', kind: 'continue', to: 'end' }] }; });
  mutant('a dead end (a node whose only card can be unavailable)', (c) => { N(c, 'fx_one', 'side_hatch').choices[0].if = { flag: 'usedCard' }; });
  mutant('a result variant nobody can see', (c) => { N(c, 'fx_one', 'keypad').choices[1].result = [{ if: { flag: 'usedCard' }, text: 'NEVER.' }, { text: 'YOU STEP BACK.' }]; });
  mutant('no ending', (c) => { delete N(c, 'fx_two', 'end').end; N(c, 'fx_two', 'end').choices[0] = { id: 'loop', kind: 'continue', to: 'end' }; });
  mutant('the v1 restart-outside-an-ending mutant, through fromV1',
    (c) => { c.nodes.ruling.choices[0] = { id: 'sigh', text: 'X.', restart: true }; Object.assign(c, Rules.fromV1(c)); delete c.nodes; delete c.location; delete c.speaker; },
    reception);
}

// ================================================================================================
// 4. Checks (S2): grammar, seeded rolls, item and knowledge modifiers, outcomes, no re-roll
// ================================================================================================
{
  const G = 'checks';
  const story = fixture();
  const preps = {
    none: ['examine-keypad', 'try-code'],
    card: ['open-drawer', 'read:fx_card', 'examine-keypad', 'try-code'],
    asked: ['go-counter', 'ask-code', 'thanks', 'examine-keypad', 'try-code'],
    both: ['open-drawer', 'read:fx_card', 'go-counter', 'ask-code', 'thanks', 'examine-keypad', 'try-code']
  };
  const SEEDS = 200;
  const m = {};
  Object.keys(preps).forEach((k) => {
    let ok = 0;
    const seen = new Set();
    let ev = null;
    for (let i = 1; i <= SEEDS; i++) {
      ev = play(story, preps[k], { seed: String(i) }).events.find((e) => e.t === 'check');
      ok += ev.ok ? 1 : 0;
      seen.add(ev.ok);
    }
    m[k] = { rate: ok / SEEDS, chance: ev.chance, bonus: ev.bonus, both: seen.size === 2 };
  });
  check(G, 'd6 need 4, a raw 1 always fails: exact odds 3/6 with no preparation, 4/6 with the card read or the attendant asked, 5/6 with both',
    m.none.chance === 3 / 6 && m.card.chance === 4 / 6 && m.asked.chance === 4 / 6 && m.both.chance === 5 / 6
    && m.none.bonus === 0 && m.card.bonus === 1 && m.asked.bonus === 1 && m.both.bonus === 2, m);
  check(G, 'EF-N5: across seeds 1-200 both outcomes occur with and without the item, for every preparation', Object.values(m).every((x) => x.both), m);
  check(G, 'EF-N5: the item raises the measured success rate (card over none, both over asked), and each rate is near its odds',
    m.card.rate > m.none.rate && m.both.rate > m.asked.rate && Object.values(m).every((x) => Math.abs(x.rate - x.chance) < 0.1), m);
  const a = play(story, preps.both, { seed: 'k3v9q2' });
  const b = play(story, preps.both, { seed: 'k3v9q2' });
  check(G, 'EF-N5: the same seed gives the same roll, outcome, state and transcript', same(a.state, b.state) && same(a.trail.map((t) => t.events), b.trail.map((t) => t.events)));
  const reordered = play(story, ['go-counter', 'ask-code', 'thanks', 'open-drawer', 'read:fx_card', 'examine-keypad', 'try-code'], { seed: 'k3v9q2' });
  check(G, 'the roll does not depend on the order of play (same seed, preparation in another order)',
    reordered.state.checks.fx_door.roll === a.state.checks.fx_door.roll && reordered.state.checks.fx_door.roll === Rules.roll('k3v9q2', 'fx_door', 6));
  const ev = a.events[0];
  check(G, 'the check event carries id, sides, roll, bonus, need, ok and the exact chance, and comes first in its step',
    ev.t === 'check' && same(Object.keys(ev), ['t', 'id', 'sides', 'roll', 'bonus', 'need', 'ok', 'chance']) && ev.id === 'fx_door' && ev.need === 4);
  const kv = Rules.view(story, play(story, ['examine-keypad']).state);
  check(G, 'hidden by default: the card shows no odds, die or check data (the view\'s card is only id, kind, text and the S2.1 hasCheck marker)',
    same(Object.keys(kv.cards[0]), ['id', 'kind', 'text', 'hasCheck']) && kv.cards[0].text === 'TRY A CODE' && kv.cards[0].hasCheck === true);
  const pass = play(story, preps.none, { seed: seedFor(story, preps.none, 'fx_door', true) });
  const fail = play(story, preps.none, { seed: seedFor(story, preps.none, 'fx_door', false) });
  check(G, 'each outcome has its own explicit consequence: pass narrates and leads to the corridor, fail to the side hatch',
    pass.state.node === 'corridor' && /LAMP TURNS GREEN/.test(pass.events.find((e) => e.t === 'text').paras[0][0].text)
    && fail.state.node === 'side_hatch' && /LAMP STAYS RED/.test(fail.events.find((e) => e.t === 'text').paras[0][0].text));
  check(G, 'passed / failed / untried and the callbacks that read them: FILES, the corridor and chapter two',
    Rules.holds({ untried: 'fx_door' }, play(story, []).state) && Rules.holds({ passed: 'fx_door' }, pass.state) && !Rules.holds({ failed: 'fx_door' }, pass.state)
    && Rules.holds({ failed: 'fx_door' }, fail.state) && !Rules.holds({ untried: 'fx_door' }, fail.state)
    && Rules.view(story, pass.state).files.includes('DOOR: OPENED BY CODE.') && Rules.view(story, fail.state).files.includes('DOOR: ALARM RAISED. NO DISCREPANCY NOTED.'));
  check(G, 'the decision log records the check and its outcome', same(pass.state.taken.slice(-1)[0], { n: pass.state.steps, at: 'fx_one:keypad', c: 'try-code', check: 'fx_door', ok: true }));

  // EF-N4 (first half): an attempt that uses up the item still gets its bonus.
  const spend = fixture();
  const tc = spend.chapters.fx_one.nodes.keypad.choices[0];
  tc.check.mods = [{ if: { has: 'fx_card' }, add: 1 }];
  tc.effects = { take: ['fx_card'] };
  const sp = play(spend, ['open-drawer', 'examine-keypad', 'try-code'], { seed: '7' });
  check(G, 'EF-N4: the bonus is computed before the effects of the same step (the card is taken and still counts)',
    sp.events[0].t === 'check' && sp.events[0].bonus === 1 && !sp.state.inventory.includes('fx_card') && sp.events[1].t === 'items' && same(sp.events[1].lost, ['fx_card']));

  // EF-N6: no re-roll. A check that stays (no destination), so its card could be offered again.
  const stay = fixture();
  const st = stay.chapters.fx_one.nodes.keypad.choices[0];
  st.pass = { result: 'GREEN.' };
  st.fail = { result: 'RED.' };
  const once = play(stay, ['examine-keypad', 'try-code'], { seed: '11' });
  const resolved = JSON.stringify(once.state.checks);
  const restored = Rules.restore(stay, Rules.serialize(stay, once.state)).state;
  check(G, 'EF-N6: after resolution the checked card is gone, and step() refuses it', !cards(stay, once.state).includes('try-code')
    && throws(() => Rules.step(stay, once.state, { choice: 'try-code' }), /not available/));
  check(G, 'EF-N6: still gone after serialize/restore, with checks[id] unchanged',
    !cards(stay, restored).includes('try-code') && JSON.stringify(restored.checks) === resolved && throws(() => Rules.step(stay, restored, { choice: 'try-code' })));
  const back = play(stay, ['examine-keypad', 'try-code', 'stop', 'examine-keypad'], { seed: '11' });
  check(G, 'EF-N6: leaving and revisiting the node does not offer the check again', !cards(stay, back.state).includes('try-code') && JSON.stringify(back.state.checks) === resolved);
  const won = play(story, preps.none, { seed: seedFor(story, preps.none, 'fx_door', true) });
  let last = won.state;
  ['call-lift', 'go-up', 'finish'].forEach((c) => { last = Rules.step(story, last, { choice: c }).state; });
  const x = Rules.step(story, last, { choice: 'restart' });
  const y = Rules.step(story, last, { choice: 'restart' });
  check(G, 'a new playthrough (BEGIN AGAIN) gets a new seed derived from the old one: deterministic, not the same seed, no checks resolved',
    x.state.seed !== last.seed && x.state.seed === y.state.seed && same(x.state.checks, {}));

  // d100 (docs/57 model B) is the same grammar: base 45%, +20 points, a 95% ceiling.
  const d100 = fixture();
  const dc = d100.chapters.fx_one.nodes.keypad.choices[0].check;
  Object.assign(dc, { sides: 100, need: 56, fumble: 5, mods: [{ if: { item: ['fx_card', 'read'] }, add: 20 }] });
  const dv = Rules.validateStory(d100, charset);
  let okBase = 0, okCard = 0;
  const N = 2000;
  for (let i = 1; i <= N; i++) {
    okBase += play(d100, preps.none, { seed: 'd' + i }).state.checks.fx_door.ok ? 1 : 0;
    okCard += play(d100, preps.card, { seed: 'd' + i }).state.checks.fx_door.ok ? 1 : 0;
  }
  check(G, 'd100 is supported: the fixture validates as a d100 check; exact odds 45% and 65%; measured rates within 4 points over 2000 seeds',
    dv.ok && Rules.chance(dc, 0) === 0.45 && Rules.chance(dc, 20) === 0.65 && Math.abs(okBase / N - 0.45) < 0.04 && Math.abs(okCard / N - 0.65) < 0.04,
    { errors: dv.errors, base: okBase / N, card: okCard / N });
  check(G, 'd100 fumble 5 is a 95% ceiling however large the bonus', Rules.chance(dc, 500) === 0.95);
  const faces = new Array(7).fill(0);
  for (let i = 1; i <= 6000; i++) faces[Rules.roll(String(i), 'fx_door', 6)]++;
  check(G, 'rolls are spread evenly: each d6 face within 10% of 1000 over seeds 1-6000', faces.slice(1).every((f) => Math.abs(f - 1000) < 100), faces.slice(1));
}

// ================================================================================================
// 5. Saves (S2): versioned serialization, restore, identical outcomes across the boundary
// ================================================================================================
{
  const G = 'saves';
  const story = fixture();
  const scripts = [
    ['open-drawer', 'read:fx_card', 'go-counter', 'lean', 'ask-code', 'thanks', 'examine-keypad', 'try-code'],
    ['examine-keypad', 'stop', 'open-drawer', 'inspect:fx_card', 'examine-keypad', 'try-code'],
    ['go-counter', 'ask-code', 'thanks', 'examine-keypad', 'try-code']
  ];
  // Finish whichever way the check went, through chapter two to the end and BEGIN AGAIN.
  const tails = { corridor: ['call-out', 'use:fx_card', 'go-up', 'finish', 'restart', 'open-drawer'], side_hatch: ['crawl', 'call-lift', 'go-up', 'finish', 'restart', 'open-drawer'] };
  function full(script, seed) {
    const head = play(story, script, { seed });
    const tail = tails[head.state.node].map((x) => (x === 'use:fx_card' && !head.state.inventory.includes('fx_card') ? 'call-lift' : x));
    return script.concat(tail);
  }
  function run(script, seed, interrupt) {
    let r = Rules.begin(story, { seed });
    const evs = [r.events];
    script.forEach((st, i) => {
      let s = r.state;
      if (interrupt) {
        const saved = Rules.serialize(story, s, { savedAt: 'T' + i });
        const back = Rules.restore(story, saved);
        if (!back.ok) throw new Error('restore refused: ' + back.reason);
        s = back.state;
      }
      const mm = /^(inspect|read|show|use):(.+)$/.exec(st);
      r = Rules.step(story, s, mm ? { item: mm[2], verb: mm[1] } : { choice: st });
      evs.push(r.events);
    });
    return { state: r.state, evs };
  }
  let trips = 0, runs = 0, roundTrip = true, identical = true;
  for (let seed = 1; seed <= 30; seed++) {
    scripts.forEach((sc) => {
      const script = full(sc, String(seed));
      const plain = run(script, String(seed), false);
      const cut = run(script, String(seed), true);
      runs++;
      if (!same(plain, cut)) identical = false;
      // Round trip every intermediate state.
      let r = Rules.begin(story, { seed: String(seed) });
      script.forEach((st) => {
        const mm = /^(inspect|read|show|use):(.+)$/.exec(st);
        r = Rules.step(story, r.state, mm ? { item: mm[2], verb: mm[1] } : { choice: st });
        const back = Rules.restore(story, Rules.serialize(story, r.state));
        trips++;
        if (!back.ok || !same(back.state, r.state)) roundTrip = false;
      });
    });
  }
  check(G, 'EF-N7: restore(serialize(s)) deep-equals s for every state along 90 complete playthroughs (both check outcomes, a restart)', roundTrip && trips > 500, { trips });
  check(G, 'EF-N7: a playthrough saved and restored before every step ends in the same state, with the same events at every step, as one never interrupted',
    identical, { runs });

  // Random walks over everything the view offers, interrupted at random points.
  function rng(seed) { let t = seed >>> 0; return () => { t += 0x6d2b79f5; let x = Math.imul(t ^ (t >>> 15), 1 | t); x ^= x + Math.imul(x ^ (x >>> 7), 61 | x); return ((x ^ (x >>> 14)) >>> 0) / 4294967296; }; }
  let walksSame = true, walkSteps = 0;
  for (let w = 1; w <= 60; w++) {
    const pick = rng(w);
    const seed = 'w' + w;
    let a = Rules.begin(story, { seed }).state;
    let b = a;
    for (let i = 0; i < 40; i++) {
      const v = Rules.view(story, a);
      const inputs = v.cards.map((c) => ({ choice: c.id }));
      v.items.forEach((it) => {
        inputs.push({ item: it.id, verb: 'inspect' });
        if (it.read) inputs.push({ item: it.id, verb: 'read' });
        if (it.use) inputs.push({ item: it.id, verb: 'use' });
      });
      const input = inputs[Math.floor(pick() * inputs.length)];
      const ra = Rules.step(story, a, input);
      if (pick() < 0.5) b = Rules.restore(story, Rules.serialize(story, b)).state;
      const rb = Rules.step(story, b, input);
      if (!same(ra, rb)) walksSame = false;
      a = ra.state;
      b = rb.state;
      walkSteps++;
    }
  }
  check(G, 'EF-N7: 60 random 40-step walks, restored at random points, never diverge from their uninterrupted twins (state and events)', walksSame, { walkSteps });

  const mid = play(story, ['open-drawer', 'go-counter', 'lean'], { seed: '3' }).state;
  const r = Rules.restore(story, Rules.serialize(story, mid)).state;
  check(G, 'EF-N7: after a restore the inventory has no duplicates and once choices stay spent',
    same(r.inventory, ['fx_card']) && !cards(story, r).includes('lean') && (() => { const w = Rules.step(story, r, { choice: 'leave' }).state; return !cards(story, w).includes('open-drawer'); })());
  const env = JSON.parse(Rules.serialize(story, mid, { savedAt: '2026-11-08T00:00:00Z' }));
  check(G, 'the save is a versioned envelope: schema cyoa-save-v1, story id, story version, savedAt only when the caller gives it, the state',
    env.schema === 'cyoa-save-v1' && env.story === 'engine-fixture' && env.version === 1 && env.savedAt === '2026-11-08T00:00:00Z' && same(env.state, mid)
    && !('savedAt' in JSON.parse(Rules.serialize(story, mid))));
  check(G, 'the rules read no clock and no random source (only the caller\'s seed)',
    !/Date\.|Math\.random|crypto\.|performance\./.test(fs.readFileSync(path.join(ROOT, 'game/js/rules.js'), 'utf8')));
  const rec = Rules.fromV1(reception);
  const recState = play(rec, ['ask-politely', 'practical', 'ask-key', 'read:wc_key']).state;
  check(G, 'the reception (via fromV1) round-trips too, and stays save: false (it still starts fresh on reload until S9)',
    rec.save === false && same(Rules.restore(rec, Rules.serialize(rec, recState)).state, recState));

  // EF-N8: refused, never thrown.
  const good = play(story, ['open-drawer', 'examine-keypad', 'try-code'], { seed: '4' }).state;
  const edit = (fn) => { const s = Rules.clone(good); fn(s); return Rules.serialize(story, s); };
  const v2story = Object.assign(fixture(), { version: 2 });
  const otherStory = Object.assign(fixture(), { id: 'other-story' });
  const bad = {
    'a save from another version': Rules.serialize(story, good).replace('"version":1', '"version":2'),
    'this save under a newer story version': [v2story, Rules.serialize(story, good)],
    'a save from another story': [otherStory, Rules.serialize(story, good)],
    'an unknown node': edit((s) => { s.node = 'roof'; }),
    'an unknown chapter': edit((s) => { s.chapter = 'fx_nine'; }),
    'an undeclared flag': edit((s) => { s.flags.cheated = true; }),
    'a declared flag missing': edit((s) => { delete s.flags.usedCard; }),
    'an unknown item': edit((s) => { s.inventory.push('gold_bar'); }),
    'a duplicated item': edit((s) => { s.inventory = ['fx_card', 'fx_card']; }),
    'an unknown item mark': edit((s) => { s.items.fx_card = ['eaten']; }),
    'a changed roll': edit((s) => { s.checks.fx_door.roll = s.checks.fx_door.roll % 6 + 1; }),
    'a flipped outcome': edit((s) => { s.checks.fx_door.ok = !s.checks.fx_door.ok; }),
    'a check this story does not have': edit((s) => { s.checks.fx_vault = { roll: 1, bonus: 0, ok: false }; }),
    'an extra state field': edit((s) => { s.gold = 5; }),
    'a missing state field': edit((s) => { delete s.seed; }),
    'presentFrom beyond the transcript': edit((s) => { s.presentFrom = 999; }),
    'a returnTo that is not a narrative opener': edit((s) => { s.node = 'keypad'; s.returnTo = 'counter'; }),
    'a transcript entry with an unknown role': edit((s) => { s.transcript[0].runs[0].role = 'shout'; }),
    'a state version other than 2': edit((s) => { s.v = 1; }),
    'a wrong envelope schema': Rules.serialize(story, good).replace('cyoa-save-v1', 'cyoa-save-v0'),
    'malformed JSON': '{"schema":"cyoa-save-v1",',
    'an empty string': '',
    'null': null
  };
  const outcomes = Object.keys(bad).map((k) => {
    const [st, saved] = Array.isArray(bad[k]) ? bad[k] : [story, bad[k]];
    let res;
    try { res = Rules.restore(st, saved); } catch (e) { res = { threw: e.message }; }
    return [k, res];
  });
  check(G, 'EF-N8: every corrupt, foreign or outdated save is refused with a reason, without a throw (' + outcomes.length + ' cases)',
    outcomes.every(([, res]) => res.ok === false && typeof res.reason === 'string' && res.reason.length > 0),
    outcomes.filter(([, res]) => res.ok !== false).map(([k, res]) => [k, res]));
  check(G, 'a good save restores (positive control)', Rules.restore(story, Rules.serialize(story, good)).ok);
}

// ================================================================================================
// 6. Presentation contract (docs/73 C3): commit once, present from a safe point, never replay effects
// ================================================================================================
{
  const G = 'presentation';
  const story = fixture();
  const b = Rules.begin(story, { seed: '1' });
  // A reload at every paragraph of the opening passage.
  let ok = true;
  for (let p = 0; p <= 3; p++) {
    const back = Rules.restore(story, Rules.serialize(story, b.state, { presented: p }));
    const res = Rules.resume(story, back.state, back.cursor);
    const replay = res.events.flatMap((e) => e.paras);
    const shownBefore = b.state.transcript.slice(0, p).map((e) => e.runs);
    if (!(back.ok && res.from === p && same(shownBefore.concat(replay), b.events[4].paras) && res.events.every((e) => e.t === 'text') && same(back.state, b.state))) ok = false;
  }
  check(G, 'a reload part-way through a passage replays exactly the paragraphs not yet presented: none twice, none skipped, state untouched', ok);
  const mid = play(story, ['examine-keypad', 'try-code'], { seed: seedFor(story, ['examine-keypad', 'try-code'], 'fx_door', true) });
  const saved = Rules.serialize(story, mid.state);
  const r1 = Rules.restore(story, saved);
  const res1 = Rules.resume(story, r1.state, r1.cursor);
  const r2 = Rules.restore(story, Rules.serialize(story, r1.state, r1.cursor));
  const res2 = Rules.resume(story, r2.state, r2.cursor);
  check(G, 'after a committed check, the resume replays only its text: no check event, no item slip, no objective event, and the roll is unchanged',
    res1.events.every((e) => e.t === 'text') && same(res1.events.map((e) => e.paras), mid.events.filter((e) => e.t === 'text').map((e) => e.paras))
    && same(r1.state.checks, mid.state.checks));
  check(G, 'restoring and resuming twice gives the same replay and never grows the transcript, the decision log or the step count',
    same(res1, res2) && r2.state.transcript.length === mid.state.transcript.length && r2.state.taken.length === mid.state.taken.length && r2.state.steps === mid.state.steps);
  const lean = play(story, ['go-counter', 'lean']);
  const rl = Rules.resume(story, lean.state, null);
  check(G, 'in dialogue, the resume replays the echo then the direction, as the step presented them',
    same(rl.events, lean.events.filter((e) => e.t === 'echo' || e.t === 'text')));
  const leave = play(story, ['go-counter', 'leave']);
  const rv = Rules.resume(story, leave.state, null);
  check(G, 'a step that moved surfaces (dialogue echo, then the B result): the resume types the B part; the echo stays in the history, not lost',
    same(rv.elsewhere, [leave.state.presentFrom]) && leave.state.transcript[rv.elsewhere[0]].src === 'echo'
    && same(rv.events.flatMap((e) => e.paras), leave.state.transcript.slice(rv.from).map((e) => e.runs))
    && Rules.view(story, leave.state).history.notes.includes(rv.elsewhere[0]));
  const clamp = Rules.restore(story, Rules.serialize(story, b.state, { presented: 99 }));
  const before = play(story, ['open-drawer']);
  const low = Rules.restore(story, Rules.serialize(story, before.state, { presented: 0 }));
  check(G, 'the cursor is clamped: never past the transcript, never back before the latest step (earlier steps were presented before it was taken)',
    clamp.cursor.presented === 3 && Rules.resume(story, clamp.state, clamp.cursor).events.length === 0 && low.cursor.presented === before.state.presentFrom);
  // A renderer pacing B with presentation-only CONTINUE: it moves its own cursor and never calls step().
  const paced = Rules.clone(b.state);
  for (let p = 0; p <= 3; p++) Rules.resume(story, paced, { presented: p });
  check(G, 'presentation-only CONTINUE never re-runs a committed decision: pacing reads the state and changes nothing, and step({ continue }) is refused',
    same(paced, b.state) && throws(() => Rules.step(story, paced, { continue: true }), /presentation only/));
  const fin = play(story, ['go-counter', 'ask-code', 'thanks', 'examine-keypad', 'try-code'], { seed: seedFor(story, ['go-counter', 'ask-code', 'thanks', 'examine-keypad', 'try-code'], 'fx_door', true) });
  let s = fin.state;
  ['call-lift', 'go-up', 'finish'].forEach((c) => { s = Rules.step(story, s, { choice: c }).state; });
  const rs = Rules.restore(story, Rules.serialize(story, s, { presented: s.presentFrom }));
  check(G, 'an authored continue choice is a committed decision: after a reload it is in the log once and not offered again',
    rs.state.taken.filter((t) => t.c === 'finish').length === 1 && !cards(story, rs.state).includes('finish'));
}

// ================================================================================================
// 7. S2 mutants: invalid checks the validator must reject
// ================================================================================================
{
  const G = 'mutants';
  function mutant(name, edit) {
    const copy = fixture();
    edit(copy);
    const r = Rules.validateStory(copy, charset);
    check(G, 'rejects: ' + name, !r.ok, r.errors && r.errors.slice(0, 2));
  }
  const K = (c) => c.chapters.fx_one.nodes.keypad.choices[0];
  const extra = (id) => ({ id: 'risk', kind: 'action', text: 'TRY YOUR LUCK', check: { id, sides: 6, need: 4 }, pass: { result: 'YES.' }, fail: { result: 'NO.' } });
  mutant('a check id used twice in one chapter', (c) => { c.chapters.fx_one.nodes.corridor.choices.push(extra('fx_door')); });
  mutant('a check id reused in another chapter', (c) => { c.chapters.fx_two.nodes.arrive.choices.push(extra('fx_door')); });
  mutant('a check id shared by a choice and a USE entry', (c) => { c.chapters.fx_one.nodes.corridor.use.fx_card = { check: { id: 'fx_door', sides: 6, need: 4 }, pass: { to: 'lift' }, fail: { to: 'lift' } }; });
  mutant('mods that can reach 100% without certain', (c) => { Object.assign(K(c).check, { fumble: 0, mods: [{ if: { item: ['fx_card', 'read'] }, add: 1 }, { if: { flag: 'askedCode' }, add: 2 }] }); });
  mutant('a base chance of 0%', (c) => { K(c).check.need = 9; });
  mutant('sides other than 6 or 100', (c) => { K(c).check.sides = 20; });
  mutant('a fumble as large as the die', (c) => { K(c).check.fumble = 6; });
  mutant('a mod that adds 0', (c) => { K(c).check.mods[0].add = 0; });
  mutant('an unknown condition in a mod', (c) => { K(c).check.mods[0].if = { carrying: 'fx_card' }; });
  mutant('an unknown check field', (c) => { K(c).check.dc = 4; });
  mutant('a destination on a checked choice (it belongs in pass/fail)', (c) => { K(c).to = 'corridor'; });
  mutant('a result on a checked choice (it belongs in pass/fail)', (c) => { K(c).result = 'YOU TRY.'; });
  mutant('a checked choice without a fail outcome', (c) => { delete K(c).fail; });
  mutant('pass and fail without a check', (c) => { c.chapters.fx_one.nodes.wake.choices[0].pass = { to: 'keypad' }; });
  mutant('an outcome with two destinations', (c) => { K(c).fail.back = true; });
  mutant('an outcome going back from a narrative node', (c) => { c.chapters.fx_one.nodes.side_hatch.choices.push(Object.assign(extra('fx_hatch'), { fail: { back: true } })); });
  mutant('passed naming a check the story does not have', (c) => { c.files[2].if = { passed: 'fx_vault' }; });
  mutant('a check whose fail can never happen (certain, and only offered when the bonus makes it certain)',
    (c) => { Object.assign(K(c), { if: { flag: 'askedCode' } }); Object.assign(K(c).check, { fumble: 0, certain: true, mods: [{ if: { flag: 'askedCode' }, add: 3 }] }); });
  const twoFaults = fixture();
  Object.assign(K(twoFaults).check, { fumble: 0, mods: [{ add: 3 }] });
  twoFaults.chapters.fx_one.nodes.wake.npc = 'X';
  const tf = Rules.validateStory(twoFaults, charset);
  check(G, 'the odds guards still run when an unrelated error is also present (both are reported)',
    tf.errors.some((e) => /unknown field npc/.test(e)) && tf.errors.some((e) => /can make it certain/.test(e)), tf.errors);
  const certain = fixture();
  Object.assign(K(certain).check, { fumble: 0, certain: true, mods: [{ if: { item: ['fx_card', 'read'] }, add: 1 }, { if: { flag: 'askedCode' }, add: 2 }] });
  const cv = Rules.validateStory(certain, charset);
  check(G, 'accepts (positive control): the same 100%-capable mods when the check is marked certain', cv.ok, cv.errors);
}

// ================================================================================================
// 8. S2.1 owner alignment (docs/80): whole-playthrough NOTES [76], risk markers [74], independent
//    endings [78]
// ================================================================================================
{
  const G = 'notes';
  const story = fixture();
  const route = ['open-drawer', 'read:fx_card', 'examine-keypad', 'try-code', 'crawl', 'use:fx_card', 'go-up', 'finish'];
  const seed = seedFor(story, route.slice(0, 4), 'fx_door', false);
  const p = play(story, route, { seed });
  const all = (s) => s.transcript.map((e, i) => i);
  const notesAt = (s) => Rules.view(story, s).history.notes;
  check(G, 'NOTES is the whole transcript at every step of a two-chapter playthrough (focus, B, scene change, chapter change, ending)',
    p.trail.every((r) => same(notesAt(r.state), all(r.state))));
  const up = p.trail[7].state;
  const ch1 = up.transcript.filter((e) => e.chapter === 'fx_one').length;
  check(G, 'in chapter two, NOTES still indexes every chapter-one paragraph (the opening room, the keypad, the crawl)',
    ch1 > 5 && notesAt(up).filter((i) => up.transcript[i].chapter === 'fx_one').length === ch1
    && text(notesAt(up).map((i) => up.transcript[i])).some((x) => /SMALL GREY ROOM/.test(x)) && text(notesAt(up).map((i) => up.transcript[i])).some((x) => /TWELVE KEYS/.test(x)), { ch1 });
  const v = Rules.view(story, up);
  check(G, 'the local windows are unchanged: B and dialogue read the current scene only (chapter two), Focus A is empty outside a visit',
    v.history.narrative.every((i) => up.transcript[i].chapter === 'fx_two') && v.history.narrative.length === 1 && same(v.history.dialogue, []) && same(v.history.focus, []));
  const crawl = p.trail[5].state;
  const cv = Rules.view(story, crawl).history;
  check(G, 'a scene change inside a chapter resets B (room_b only) but not NOTES',
    cv.narrative.every((i) => crawl.transcript[i].scene === 'fixture/room_b') && same(cv.notes, all(crawl)) && cv.notes.length > cv.narrative.length);
  const key = p.trail[3].state;
  check(G, 'inside a Focus A visit: focus is the visit, NOTES is everything so far',
    same(Rules.view(story, key).history.focus, [key.transcript.length - 1]) && same(notesAt(key), all(key)));
  // Across a save/restore boundary.
  const end = p.state;
  const back = Rules.restore(story, Rules.serialize(story, end));
  check(G, 'after serialize/restore at the ending, NOTES is identical and still holds chapter one',
    back.ok && same(Rules.view(story, back.state).history, Rules.view(story, end).history) && notesAt(back.state).some((i) => back.state.transcript[i].chapter === 'fx_one'));
  const lift = p.trail[6].state;
  const r1 = Rules.restore(story, Rules.serialize(story, lift));
  const cont = Rules.step(story, r1.state, { choice: 'go-up' });
  check(G, 'saved in chapter one, restored, then into chapter two: the same NOTES (and state) as a playthrough never interrupted',
    r1.ok && same(cont.state, up) && same(notesAt(cont.state), notesAt(up)));
  const again = Rules.step(story, end, { choice: 'restart' }).state;
  check(G, 'BEGIN AGAIN starts a new playthrough, so a new NOTES (only the new opening)', same(notesAt(again), [0, 1, 2]) && again.transcript.every((e) => e.chapter === 'fx_one'));
  // Three chapters (the endings fixture), saved and restored on the far side of the fork.
  const es = Rules.clone(ENDINGS);
  const ep = play(es, ['approach', 'wait', 'follow-clerk', 'look-shelf', 'open-file']);
  const er = Rules.restore(es, Rules.serialize(es, ep.state));
  const en = Rules.view(es, er.state).history.notes;
  check(G, 'three chapters: at the archive ending, after a restore, NOTES holds the hall, the desk dialogue and the archive in order',
    er.ok && same(en, all(er.state)) && same([...new Set(en.map((i) => er.state.transcript[i].chapter))], ['ie_shared', 'ie_archive'])
    && en.some((i) => er.state.transcript[i].mode === 'dialogue'));
  // The reception is one chapter: whole playthrough = the old chapter window, so nothing it shows changes.
  const rs = Rules.fromV1(reception);
  let ok = true, steps = 0;
  for (let w = 1; w <= 20; w++) {
    let s = Rules.begin(rs).state;
    for (let i = 0; i < 30; i++) {
      const cs = Rules.view(rs, s).cards.filter((c) => c.id !== 'restart');
      if (!cs.length) break;
      s = Rules.step(rs, s, { choice: cs[(w * 7 + i * 3) % cs.length].id }).state;
      steps++;
      const h = Rules.view(rs, s).history;
      if (!same(h.notes, all(s)) || !same(h.dialogue, all(s))) ok = false;
    }
  }
  check(G, 'reception (one chapter, one scene, all dialogue): NOTES and the dialogue window both stay the whole transcript, as before', ok, { steps });
}
{
  const G = 'risk';
  const story = fixture();
  const es = Rules.clone(ENDINGS);
  const cardsOf = (st, s) => Rules.view(st, s).cards.map((c) => [c.id, c.kind, c.hasCheck]);
  check(G, 'a checked action is marked; an unchecked action beside it is not (the keypad)',
    same(cardsOf(story, play(story, ['examine-keypad']).state), [['try-code', 'action', true], ['stop', 'action', false]]));
  const desk = play(es, ['approach']).state;
  check(G, 'a checked spoken line (a bluff) is marked; an unchecked spoken line and an unchecked action are not (the desk)',
    same(cardsOf(es, desk), [['bluff', 'spoken', true], ['ask', 'spoken', false], ['wait', 'action', false]]));
  check(G, 'unchecked spoken and action cards elsewhere are never marked (wake, counter)',
    cardsOf(story, Rules.begin(story).state).every((c) => c[2] === false) && cardsOf(story, play(story, ['go-counter']).state).every((c) => c[2] === false));
  const it = (st, s) => Rules.view(st, s).items[0];
  check(G, 'a checked SHOW: show stays the availability boolean, showHasCheck marks the risk; USE is unavailable and unmarked',
    same(it(es, desk), { id: 'ie_pass', read: false, show: true, use: false, showHasCheck: true, useHasCheck: false }));
  const inc = play(es, ['approach', 'wait']).state;
  check(G, 'a checked USE: use available and useHasCheck; SHOW unavailable in B and unmarked; the plain departures are unmarked',
    same(it(es, inc), { id: 'ie_pass', read: false, show: false, use: true, showHasCheck: false, useHasCheck: true })
    && cardsOf(es, inc).every((c) => c[2] === false));
  const corridor = play(story, ['open-drawer', 'examine-keypad', 'try-code'], { seed: seedFor(story, ['open-drawer', 'examine-keypad', 'try-code'], 'fx_door', true) }).state;
  check(G, 'an unchecked USE is available and unmarked (the blue card in the corridor)',
    same(it(story, corridor), { id: 'fx_card', read: true, show: false, use: true, showHasCheck: false, useHasCheck: false }));
  // Derived only from the authored check: not from kind, not from wording.
  const kindSwap = fixture();
  kindSwap.chapters.fx_one.nodes.keypad.choices[0].kind = 'spoken';
  kindSwap.chapters.fx_one.nodes.keypad.choices[0].text = 'SAY THE CODE ALOUD';
  const plain = Rules.clone(ENDINGS);
  const b = plain.chapters.ie_shared.nodes.desk.choices[0];
  delete b.check; delete b.pass; delete b.fail; b.to = 'incident';
  check(G, 'the marker follows the check, not kind or words: the keypad as a spoken line is still marked; the same bluff words without a check are not',
    Rules.view(kindSwap, play(kindSwap, ['examine-keypad']).state).cards[0].hasCheck === true
    && Rules.view(plain, play(plain, ['approach']).state).cards[0].hasCheck === false && Rules.view(plain, play(plain, ['approach']).state).cards[0].text === 'I AM EXPECTED UPSTAIRS.');
  const certain = fixture();
  Object.assign(certain.chapters.fx_one.nodes.keypad.choices[0].check, { fumble: 0, certain: true, mods: [{ if: { item: ['fx_card', 'read'] }, add: 1 }, { if: { flag: 'askedCode' }, add: 2 }] });
  const sure = play(certain, ['open-drawer', 'read:fx_card', 'go-counter', 'ask-code', 'thanks', 'examine-keypad']).state;
  check(G, 'a check the player has made certain (100%, marked certain) keeps its marker: the marker never changes with the odds',
    Rules.step(certain, sure, { choice: 'try-code' }).events[0].chance === 1 && Rules.view(certain, sure).cards[0].hasCheck === true);
  // Nothing else about the check reaches the view, before or after the roll.
  const secret = /"(need|sides|fumble|mods|cap|certain|roll|rolls|bonus|chance|seed|checks|check|ok|pass|fail)"|fx_door|ie_bluff|ie_show|ie_gate/;
  let views = 0, leak = null, shape = true;
  [[story, ['open-drawer', 'read:fx_card', 'go-counter', 'ask-code', 'thanks', 'examine-keypad', 'try-code']], [es, ['approach', 'show:ie_pass', 'use:ie_pass']], [es, ['approach', 'bluff']]].forEach(([st, sc]) => {
    for (let sd = 1; sd <= 12; sd++) {
      play(st, sc, { seed: 'r' + sd }).trail.forEach((r) => {
        const vw = Rules.view(st, r.state);
        views++;
        const j = JSON.stringify(vw);
        if (secret.test(j) && !leak) leak = j.match(secret)[0];
        if (!vw.cards.every((c) => same(Object.keys(c), ['id', 'kind', 'text', 'hasCheck']))) shape = false;
        if (!vw.items.every((x) => same(Object.keys(x), ['id', 'read', 'show', 'use', 'showHasCheck', 'useHasCheck']))) shape = false;
      });
    }
  });
  check(G, 'no die, target, odds, modifiers, bonus, seed, roll, outcome or check id appears anywhere in the view (both fixtures, both outcomes)', !leak && shape && views > 100, { views, leak });
  // The reception has no checks: nothing is ever marked.
  const rs = Rules.fromV1(reception);
  const v1 = Rules.validateStory(rs, charset);
  let marked = 0;
  for (let w = 1; w <= 20; w++) {
    let s = Rules.begin(rs).state;
    for (let i = 0; i < 30; i++) {
      const vw = Rules.view(rs, s);
      marked += vw.cards.filter((c) => c.hasCheck).length + vw.items.filter((x) => x.showHasCheck || x.useHasCheck).length;
      const cs = vw.cards.filter((c) => c.id !== 'restart');
      if (!cs.length) break;
      s = Rules.step(rs, s, { choice: cs[(w * 5 + i) % cs.length].id }).state;
    }
  }
  check(G, 'the reception (no checks) never marks a card or an item action', v1.ok && v1.stats.checks === 0 && marked === 0, { marked });
}
{
  const G = 'endings';
  const story = Rules.clone(ENDINGS);
  const v = Rules.validateStory(story, charset);
  check(G, 'the validator accepts the independent-endings fixture: every node, choice, SHOW/USE, check outcome and text reachable, an ending reachable from every state',
    v.ok && v.stats.chapters === 3 && v.stats.endings === 2 && v.stats.endingsReached === 2 && v.stats.checks === 3, { errors: v.errors, stats: v.stats });

  // The position graph (chapter:node), over many seeds so every check goes both ways.
  function graph(st) {
    const edges = {};
    const outcomes = new Set();
    for (let sd = 1; sd <= 40; sd++) {
      const queue = [Rules.begin(st, { seed: 's' + sd }).state];
      while (queue.length) {
        const s = queue.shift();
        const vw = Rules.view(st, s);
        const inputs = vw.cards.filter((c) => c.id !== 'restart').map((c) => ({ choice: c.id }));
        vw.items.forEach((x) => { if (x.show) inputs.push({ item: x.id, verb: 'show' }); if (x.use) inputs.push({ item: x.id, verb: 'use' }); });
        inputs.forEach((inp) => {
          const t = Rules.step(st, s, inp).state;
          Object.keys(t.checks).forEach((k) => outcomes.add(k + ':' + t.checks[k].ok));
          (edges[s.chapter + ':' + s.node] = edges[s.chapter + ':' + s.node] || new Set()).add(t.chapter + ':' + t.node);
          queue.push(t);
        });
      }
    }
    return { edges, outcomes };
  }
  function reach(edges, from) {
    const seen = new Set([from]);
    const q = [from];
    while (q.length) (edges[q.shift()] || new Set()).forEach((n) => { if (!seen.has(n)) { seen.add(n); q.push(n); } });
    return seen;
  }
  const ends = (st) => Object.keys(st.chapters).flatMap((c) => Object.keys(st.chapters[c].nodes).filter((n) => st.chapters[c].nodes[n].end).map((n) => c + ':' + n));
  // Independent: the two paths share no position, never return to the shared chapter, and each
  // reaches exactly one ending of its own.
  function independent(st) {
    const g = graph(st);
    const a = reach(g.edges, 'ie_archive:stacks');
    const b = reach(g.edges, 'ie_street:pavement');
    const e = ends(st);
    const shared = [...a].filter((x) => b.has(x));
    const back = [...a, ...b].filter((x) => x.startsWith('ie_shared:'));
    const ea = e.filter((x) => a.has(x));
    const eb = e.filter((x) => b.has(x));
    return { ok: !shared.length && !back.length && ea.length === 1 && eb.length === 1 && ea[0] !== eb[0], shared, back, ea, eb, g };
  }
  const ind = independent(story);
  check(G, 'every check goes both ways in the exploration (the bluff, the checked SHOW, the checked USE)',
    ['ie_bluff', 'ie_show', 'ie_gate'].every((k) => ind.g.outcomes.has(k + ':true') && ind.g.outcomes.has(k + ':false')), [...ind.g.outcomes]);
  check(G, 'one shared incident leads to both paths: the incident reaches the archive and the street, and every route out of the hall passes through it',
    ['ie_archive:stacks', 'ie_street:pavement'].every((x) => ind.g.edges['ie_shared:incident'].has(x))
    && Object.keys(ind.g.edges).filter((k) => k.startsWith('ie_shared:') && k !== 'ie_shared:incident').every((k) => [...ind.g.edges[k]].every((t) => t.startsWith('ie_shared:'))));
  check(G, 'the two paths never reconverge, never return to the hall, and each reaches its own ending',
    ind.ok && same(ind.ea, ['ie_archive:archive_end']) && same(ind.eb, ['ie_street:street_end']), { shared: ind.shared, back: ind.back, ea: ind.ea, eb: ind.eb });
  // Each ending is an ordinary authored end: an end event, view.end, BEGIN AGAIN only. No fatal,
  // no retry, nothing restored.
  const pa = play(story, ['approach', 'wait', 'follow-clerk', 'open-file']);
  const pb = play(story, ['approach', 'wait', 'take-exit', 'walk-home']);
  const endOk = (r) => r.events.slice(-1)[0].t === 'end' && Rules.view(story, r.state).end === true
    && same(Rules.view(story, r.state).cards, [{ id: 'restart', kind: 'system', text: 'BEGIN AGAIN.', hasCheck: false }]);
  check(G, 'both endings are ordinary authored ends: an end event, view.end, and only BEGIN AGAIN offered',
    endOk(pa) && endOk(pb) && pa.state.chapter === 'ie_archive' && pb.state.chapter === 'ie_street');
  const gate = (ok) => play(story, ['approach', 'wait', 'use:ie_pass'], { seed: seedFor(story, ['approach', 'wait', 'use:ie_pass'], 'ie_gate', ok) });
  check(G, 'a check outcome can itself be the permanent departure: the gate passes into the archive, fails into the street (and keeps the pass)',
    gate(true).state.chapter === 'ie_archive' && gate(false).state.chapter === 'ie_street' && !gate(false).state.inventory.includes('ie_pass'));
  // Negative controls: the detector and the validator are not vacuous.
  const rejoin = Rules.clone(ENDINGS);
  rejoin.chapters.ie_street.nodes.pavement.choices.push({ id: 'sneak-back', kind: 'action', text: 'SNEAK BACK IN TO THE ARCHIVE', chapter: 'ie_archive' });
  const rv = Rules.validateStory(rejoin, charset);
  check(G, 'negative control: a street path that rejoins the archive is still a valid (braided) story, but is reported as reconverging',
    rv.ok && !independent(rejoin).ok && independent(rejoin).shared.includes('ie_archive:archive_end'), rv.errors);
  const loop = Rules.clone(ENDINGS);
  loop.chapters.ie_street.nodes.pavement.choices[0].to = 'pavement';
  const lv = Rules.validateStory(loop, charset);
  check(G, 'rejects: a path that can never reach an ending (the street walks in circles)',
    !lv.ok && lv.errors.some((e) => /cannot reach an ending/.test(e)) && lv.errors.some((e) => /unreachable node: ie_street:street_end/.test(e)), lv.errors.slice(0, 3));
  const fatal = Rules.clone(ENDINGS);
  fatal.chapters.ie_street.nodes.street_end.fatal = true;
  const fv = Rules.validateStory(fatal, charset);
  check(G, 'rejects: a fatal marker (fatal / retry is a later contract, owner lock [75]; an authored ending is only end: true)',
    !fv.ok && fv.errors.some((e) => /unknown field fatal/.test(e)), fv.errors.slice(0, 2));
  const noEnd = Rules.clone(ENDINGS);
  delete noEnd.chapters.ie_street.nodes.street_end.end;
  const nv = Rules.validateStory(noEnd, charset);
  check(G, 'rejects: a terminal node not marked end (BEGIN AGAIN is only allowed on an authored ending)',
    !nv.ok && nv.errors.some((e) => /restart is only allowed on an end node/.test(e)), nv.errors.slice(0, 2));
}

// ================================================================================================
const groups = {};
results.forEach((r) => { const g = (groups[r.group] = groups[r.group] || { total: 0, passed: 0 }); g.total++; if (r.ok) g.passed++; });
const passed = results.filter((r) => r.ok).length;
const out = { schema: 'cyoa-engine-story-validation-v1', total: results.length, passed, failed: results.length - passed, groups, checks: results };
fs.writeFileSync(path.join(__dirname, 'story_results.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`story validation ${passed}/${results.length} passed`, JSON.stringify(groups));
process.exit(passed === results.length ? 0 : 1);
