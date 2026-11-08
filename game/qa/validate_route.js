#!/usr/bin/env node
// Route/state validation for the reception slice. No browser needed:
//   node game/qa/validate_route.js
// 1. rules.validate() walks every reachable state: no dead ends, no missing targets, no unreachable
//    node/choice/variant, an ending reachable from everywhere, and only drawable characters.
// 2. Scripted playthroughs pin the consequences the slice exists to prove.
'use strict';

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const content = require('../content/reception.js');
const Rules = require('../js/rules.js');

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  if (!ok) console.log('FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
}

// Every face the game draws with covers the locked font's characters (lab QA pins that), so the
// locked font's map is the drawable set.
const glyphs = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/ui/sprites/fonts/locked_pixel_font_atlas.json')));
const charset = Object.keys(glyphs.mapping);

const report = Rules.validate(content, charset);
check('route validation: every reachable state has an intentional continuation', report.ok, report.errors);
check('route validation explored more than one state', report.stats && report.stats.reachableStates > 10, report.stats);

// The validator itself must catch the faults it claims to. Each mutant must fail.
function mutant(name, edit) {
  const copy = Rules.clone(content);
  edit(copy);
  const r = Rules.validate(copy, charset);
  check('validator rejects: ' + name, !r.ok, r.errors && r.errors.slice(0, 2));
}
mutant('a choice leading to a missing node', (c) => { c.nodes.dispute.choices[0].to = 'nowhere'; });
mutant('a node with no choices', (c) => { c.nodes.ruling.choices = []; });
mutant('a node nobody can reach', (c) => { c.nodes.orphan = { npc: 'HELLO.', choices: [{ id: 'x', text: 'BYE.', to: 'opening' }] }; });
mutant('a choice whose condition can never hold', (c) => { c.nodes.issue.choices[1].if = { flag: 'protested' }; });
mutant('a node whose only choice is conditional and can fail', (c) => { c.nodes.door.choices[0].if = { flag: 'tagQuestioned' }; });
mutant('a loop with no way out', (c) => { c.nodes.door.choices[0].to = 'door'; });
mutant('a typo in a flag name', (c) => { c.nodes.ruling.effects.set = { disputFiled: true }; });
mutant('a character the fonts cannot draw', (c) => { c.nodes.opening.npc = 'GOOD MORNING — WELCOME.'; });
mutant('an NPC line whose last variant is conditional', (c) => { c.nodes.facilities.npc[2].if = { flag: 'blunt' }; });
mutant('restart outside an ending', (c) => { c.nodes.ruling.choices[0] = { id: 'sigh', text: 'X.', restart: true }; });
mutant('no ending at all', (c) => { delete c.nodes.ending.end; });
mutant('a context action with no observation text', (c) => { delete c.contextAction.text; });
mutant('a context action with an unknown field', (c) => { c.contextAction.setFlag = 'blunt'; });
mutant('a once context action without its spent reason', (c) => { delete c.contextAction.spentWhy; });
mutant('a context action text the fonts cannot draw', (c) => { c.contextAction.text = 'I WATCHED HER — CLOSELY.'; });

// Scripted playthroughs ------------------------------------------------------------------
function play(steps) {
  const s = Rules.start(content);
  const heard = { [s.node]: s.transcript[s.transcript.length - 1].text };
  steps.forEach((step) => {
    let r;
    if (step.startsWith('read:')) { Rules.itemAction(content, s, step.slice(5), 'read'); return; }
    if (step.startsWith('show:') || step.startsWith('use:')) {
      const [kind, id] = step.split(':');
      r = Rules.itemAction(content, s, id, kind);
    } else r = Rules.choose(content, s, step);
    if (r.restart) return;
    heard[r.to] = Rules.enter(content, s, r.to);
  });
  return { s, heard };
}
const ids = (s) => Rules.choices(content, s).map((c) => c.id);

const opening = Rules.start(content);
check('opening offers the bathroom request', ids(opening).includes('ask-politely'), ids(opening));
const decision = play(['ask-politely']);
check('the misassignment offers correct / cooperate / practical', ['correct', 'cooperate', 'practical'].every((id) => ids(decision.s).includes(id)), ids(decision.s));
check('the misassignment converts the request into an appointment', /EXAMINER/.test(decision.heard.misassign));
check('a blunt request changes her reply', play(['ask-bluntly']).heard.misassign !== decision.heard.misassign);

const corrected = play(['ask-politely', 'correct', 'rule', 'sigh', 'ask-key', 'confirm-unread', 'onward-blind']);
const cooperated = play(['ask-politely', 'cooperate', 'standard-issue', 'confirm-unread', 'onward-blind']);
const practical = play(['ask-politely', 'practical', 'ask-key', 'confirm-unread', 'onward-blind']);
const sendOffs = [corrected, cooperated, practical].map((p) => p.heard.send_off);
check('the send-off line differs for each opening decision', new Set(sendOffs).size === 3, sendOffs);
check('a filed dispute is remembered at the send-off', /DISPUTE/.test(corrected.heard.send_off));

const issued = play(['ask-politely', 'practical', 'ask-key']);
check('the key is issued into the inventory', issued.s.inventory.join() === 'wc_key');
check('before reading the tag: only the blind confirmation', ids(issued.s).join() === 'confirm-unread', ids(issued.s));
check('before reading the tag: SHOW is disabled', !Rules.itemActions(content, issued.s, 'wc_key').show);
check('the tag description is withheld until READ', !/4:52/.test(Rules.description(content, issued.s, 'wc_key')));
Rules.itemAction(content, issued.s, 'wc_key', 'read');
check('READ reveals the tag', /4:52/.test(Rules.description(content, issued.s, 'wc_key')));
check('after reading the tag: the tag question appears', ids(issued.s).includes('question-tag') && !ids(issued.s).includes('confirm-unread'), ids(issued.s));
check('after reading the tag: SHOW is enabled here', !!Rules.itemActions(content, issued.s, 'wc_key').show);
check('USE is not available at the desk yet', !Rules.itemActions(content, issued.s, 'wc_key').use);

const shown = play(['ask-politely', 'practical', 'ask-key', 'read:wc_key', 'show:wc_key', 'onward-tag']);
check('SHOW on the key reaches the tag question', 'tag_question' in shown.heard);
check('USE is available at the door', !!Rules.itemActions(content, shown.s, 'wc_key').use);
const usedKey = play(['ask-politely', 'practical', 'ask-key', 'read:wc_key', 'show:wc_key', 'onward-tag', 'use:wc_key']);
const unread = play(['ask-politely', 'practical', 'ask-key', 'confirm-unread', 'onward-blind', 'unlock']);
check('USE on the key opens the door', 'door' in usedKey.heard);
check('the closing line changes when the tag was questioned', usedKey.heard.door !== unread.heard.door && /ACCORDING TO THE RECORD YOU ALREADY HAVE/.test(usedKey.heard.door));
// docs/49 section 2.8: the contradiction stays, but nobody explains or predicts it.
const allLines = JSON.stringify(content);
check('no line predicts or explains the 4:52 record', !/UNTIL 4:52|SEE YOU AT 4:52|ALWAYS COME BACK/.test(allLines));
check('the 4:52 contradiction is still on the tag and in the record', /RETURNED: TODAY, 4:52/.test(allLines) && /RETURNED AT 4:52/.test(shown.heard.tag_question));
check('blind confirmation gets its own reply', /NOBODY EVER READS THE TAG/.test(unread.heard.confirm_blind));

const ending = play(['ask-politely', 'practical', 'ask-key', 'confirm-unread', 'onward-blind', 'unlock', 'enter-corridor']);
check('the ending offers a single restart card', ids(ending.s).join() === 'restart', ids(ending.s));
check('the transcript records both speakers in order', ending.s.transcript[0].who === 'npc' && ending.s.transcript[1].who === 'player'
  && ending.s.transcript[1].text === 'WHERE IS THE BATHROOM, PLEASE?');

const protest = play(['ask-politely', 'cooperate', 'standard-issue', 'confirm-unread', 'onward-blind', 'protest']);
check('a protest can be made once only', !ids(Rules.clone(protest.s)).includes('protest') || protest.s.node === 'last_protest');
const back = play(['ask-politely', 'cooperate', 'standard-issue', 'confirm-unread', 'onward-blind', 'protest', 'to-door']);
check('after protesting, the door is still reachable by card and by USE', ids(back.s).join() === 'unlock-after' && !!Rules.itemActions(content, back.s, 'wc_key').use);

// Context action (docs/64): reception's OBSERVE, an optional observation that changes nothing else.
const actions = JSON.parse(fs.readFileSync(path.join(ROOT, 'art/actions/actions.json'))).actions;
const ctx = Rules.contextAction(content, Rules.start(content));
check('reception defines one context action: OBSERVE, with the existing WATCH glyph, once per encounter',
  !!ctx && ctx.label === 'OBSERVE' && ctx.glyph === 'watch' && ctx.once === true && ctx.spentWhy === 'NOTHING NEW TO NOTICE' && !!actions.watch, ctx);
let everyNode = true;
Object.keys(content.nodes).forEach((id) => { const st = Rules.start(content); st.node = id; if (Rules.contextAction(content, st) !== ctx) everyNode = false; });
check('the context action holds at every reception node (no node overrides it)', everyNode);
const obs = play(['ask-politely']);
const before = JSON.stringify([obs.s.node, obs.s.flags, obs.s.inventory, obs.s.items, obs.s.objective, ids(obs.s)]);
const said = Rules.takeContextAction(content, obs.s);
const last = obs.s.transcript[obs.s.transcript.length - 1];
check('taking it adds the observation to the transcript as a thought, not as speech', last.who === 'thought' && last.text === ctx.text && said === ctx.text, last);
check('taking it changes no node, flag, item, objective or choice', JSON.stringify([obs.s.node, obs.s.flags, obs.s.inventory, obs.s.items, obs.s.objective, ids(obs.s)]) === before);
check('a once action is spent after use and refuses a second take (no duplicate line)', Rules.contextSpent(content, obs.s) && (() => { try { Rules.takeContextAction(content, obs.s); return false; } catch (e) { return true; } })()
  && obs.s.transcript.filter((t) => t.who === 'thought').length === 1);
check('a fresh start (restart) clears it', !Rules.contextSpent(content, Rules.start(content)));
check('the observation stays out of the route state: same reachable states as without it', (() => {
  const plain = Rules.clone(content);
  delete plain.contextAction;
  const r = Rules.validate(plain, charset);
  return r.ok && r.stats.reachableStates === report.stats.reachableStates;
})());

const passed = results.filter((r) => r.ok).length;
const out = { schema: 'cyoa-m2-route-validation-v1', stats: report.stats, total: results.length, passed, failed: results.length - passed, checks: results };
fs.writeFileSync(path.join(__dirname, 'route_results.json'), JSON.stringify(out, null, 2) + '\n');
console.log(`route validation ${passed}/${results.length} passed`, JSON.stringify(report.stats));
process.exit(passed === results.length ? 0 : 1);
