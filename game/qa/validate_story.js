#!/usr/bin/env node
// Story-v2 rules validation (docs/72 S1/S2, docs/74). No browser needed:
//   node game/qa/validate_story.js
// 1. Reception compatibility: Rules.fromV1 + begin/step/view against the v1 API, state by state,
//    over every reachable reception state; and the route suite's own checks on the v2 engine.
// 2. The neutral fixture (qa/fixtures/engine_fixture.js): validation, event order, conditional
//    effects, kinds, Focus return, chapters, history windows, transcript roles, purity.
// 3. Mutants: invalid stories the validator must reject.
// Writes qa/story_results.json.
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const Rules = require('../js/rules.js');
const reception = require('../content/reception.js');
const FIXTURE = require('./fixtures/engine_fixture.js');
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
  const callOut = play(story, ['go-counter', 'ask-code', 'thanks', 'examine-keypad', 'enter-code', 'call-out']);
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
  const route = ['open-drawer', 'read:fx_card', 'examine-keypad', 'guess-code', 'crawl', 'use:fx_card', 'go-up'];
  const full = play(story, route);
  const crawl = full.trail[5];
  check(G, 'a scene change: scene event (no mode event: B to B), the objective, then the passage',
    same(crawl.events.map((e) => e.t), ['scene', 'objective', 'text']) && crawl.events[0].id === 'fixture/room_b');
  const guess = full.trail[4];
  check(G, 'a focus outcome that leaves: mode event, the result on the destination (B) surface, then the arrival',
    same(guess.events.map((e) => e.t), ['mode', 'text', 'text']) && guess.events[1].surface === 'narrative' && guess.state.returnTo === null);
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
  check(G, 'history: NOTES is the current chapter only', same(Rules.view(story, up.state).history.notes, [up.state.transcript.length - 1]));
  check(G, 'EF-N10: the chapter-two arrival differs by what happened in chapter one',
    new Set([
      up.events[3].paras[0][0].text,
      play(story, ['go-counter', 'ask-code', 'thanks', 'open-drawer', 'read:fx_card', 'examine-keypad', 'enter-code', 'call-lift', 'go-up']).events[3].paras[0][0].text,
      play(story, ['go-counter', 'ask-code', 'thanks', 'examine-keypad', 'enter-code', 'call-lift', 'go-up']).events[3].paras[0][0].text
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
    same(full.state.taken.map((t) => t.c || t.verb + ':' + t.item), ['open-drawer', 'examine-keypad', 'guess-code', 'crawl', 'use:fx_card', 'go-up']));
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
  mutant('a result variant nobody can see', (c) => { N(c, 'fx_one', 'keypad').choices[2].result = [{ if: { flag: 'usedCard' }, text: 'NEVER.' }, { text: 'YOU STEP BACK.' }]; });
  mutant('no ending', (c) => { delete N(c, 'fx_two', 'end').end; N(c, 'fx_two', 'end').choices[0] = { id: 'loop', kind: 'continue', to: 'end' }; });
  mutant('the v1 restart-outside-an-ending mutant, through fromV1',
    (c) => { c.nodes.ruling.choices[0] = { id: 'sigh', text: 'X.', restart: true }; Object.assign(c, Rules.fromV1(c)); delete c.nodes; delete c.location; delete c.speaker; },
    reception);
}

// ================================================================================================
const groups = {};
results.forEach((r) => { const g = (groups[r.group] = groups[r.group] || { total: 0, passed: 0 }); g.total++; if (r.ok) g.passed++; });
const passed = results.filter((r) => r.ok).length;
const out = { schema: 'cyoa-engine-story-validation-v1', total: results.length, passed, failed: results.length - passed, groups, checks: results };
fs.writeFileSync(path.join(__dirname, 'story_results.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`story validation ${passed}/${results.length} passed`, JSON.stringify(groups));
process.exit(passed === results.length ? 0 : 1);
