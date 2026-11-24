#!/usr/bin/env node
// Presentation capabilities C1 / C2 (storyboard docs/137 section 8; Nate approved 2026-11-24). Node only.
//   C1  a scene record with format 'text-led' has no image: the previous scene image stays on screen.
//   C2  a portrait record with format 'voice-only' has no image: its speaker leads dialogue on
//       Narrative B, lines labelled by name, with no portrait aperture.
// Both are presentation only. This suite proves the import, the validator and the rules on an inline
// storyboard fixture, and that gameplay is unchanged: every route played on the fixture reaches
// byte-identical rules state (flags, inventory, returnTo, taken, checks, node) as a control fixture
// in which the voice has an ordinary portrait. Exit 1 on any failure.
//   node game/qa/validate_presentation_capabilities.js
'use strict';

const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const { convert } = require(path.join(ROOT, 'tools/story-import/convert.js'));
const Rules = require(path.join(ROOT, 'game/js/rules.js'));

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok });
  if (!ok) console.log('FAIL ' + name, detail === undefined ? '' : JSON.stringify(detail).slice(0, 600));
}
const clone = (v) => JSON.parse(JSON.stringify(v));

const { fixture, control } = require('./fixtures/presentation_capabilities.js');

// 1. Import -------------------------------------------------------------------------------------------
const r = convert(fixture(), { mode: 'preview' });
check('import: converts', r.ok, r.errors);
const story = r.story;
check('import: text-led scene listed, never registered as art', JSON.stringify(story.assets.textLedScenes) === '["loc/path"]' && !('loc/path' in story.assets.scenes));
check('import: voice-only speaker is a portrait-less cast member with its display name', JSON.stringify(story.cast.door_ai) === '{"name":"DOOR AI"}' && !story.assets.portraits.door_ai);
check('import: voice-led nodes carry no pose or backdrop', ['door', 'door2'].every((n) => !('pose' in story.chapters.cap.nodes[n]) && !('backdrop' in story.chapters.cap.nodes[n])));
check('import: no DEV PLACEHOLDER is reported for the no-image decisions', !r.warnings.some((w) => /door_ai|loc\/path/.test(w)), r.warnings);
check('import: the portrait speaker is unchanged (layered, background from its scene)', story.cast.clerk.portrait === 'clerk' && 'loc/room' in story.assets.portraits.clerk.backgrounds);
const v = Rules.validateStory(story, null, { routeMarks: true });
check('validator: the fixture story is valid', v.ok !== false && !(v.errors || []).length, v.errors);

// 2. Rules: surfaces, labels-by-cast, held scene -----------------------------------------------------
let b = Rules.begin(story, { seed: 'qa' });
let s = b.state;
const step = (input) => { const x = Rules.step(story, s, input); s = x.state; return x; };
let view = Rules.view(story, s);
check('start: ordinary scene, not held', view.scene === 'loc/hall' && view.sceneHeld === undefined);
let x = step({ choice: 'go' });
view = Rules.view(story, s);
check('C1: on a text-led scene the view holds the previous scene', view.scene === 'loc/path' && view.sceneHeld === 'loc/hall' && view.mode === 'narrative', view);
check('C1: the move still announces the scene change (history windows stay per scene)', x.events.some((e) => e.t === 'scene' && e.id === 'loc/path'));
x = step({ choice: 'on' });
view = Rules.view(story, s);
check('C2: a voice-led dialogue is presented on Narrative B with no portrait', view.mode === 'narrative' && view.voiceLed === true && view.portrait === null && view.speaker === 'door_ai', view);
check('C2: its text event and transcript entries are on the narrative surface', x.events.some((e) => e.t === 'text' && e.surface === 'narrative') && s.transcript.filter((t) => t.node === 'door').every((t) => t.mode === 'narrative'));
check('C2: narration into a voice-led dialogue stays on Narrative B (no surface change; the scene change still fades)', !x.events.some((e) => e.t === 'mode') && x.events.some((e) => e.t === 'scene' && e.id === 'loc/room'));
check('C2: the voice line keeps its speaker id (labelled by name on B)', s.transcript.some((t) => t.node === 'door' && t.runs.some((u) => u.role === 'speech' && u.who === 'door_ai')));
check('C1: a real scene ends the hold', view.sceneHeld === undefined && view.scene === 'loc/room');
x = step({ choice: 'ask' });
check('C2: the spoken choice is still echoed (dialogue rule), on the narrative surface', x.events.some((e) => e.t === 'echo' && e.surface === 'narrative') && s.transcript.some((t) => t.src === 'echo' && t.mode === 'narrative'));
x = step({ choice: 'clerk' });
view = Rules.view(story, s);
check('portrait dialogue after a voice-led one returns to the dialogue box with its portrait', view.mode === 'dialogue' && view.portrait && view.portrait.cast === 'clerk' && x.events.some((e) => e.t === 'mode' && e.from === 'narrative' && e.to === 'dialogue'));
check('an incidental voice inside a portrait dialogue stays a dialogue-box line (docs/104 unchanged)', s.transcript.filter((t) => t.node === 'clerk').every((t) => t.mode === 'dialogue'));
x = step({ choice: 'leave' });
view = Rules.view(story, s);
check('C1: the ending on a text-led scene holds the room (the last scene with an image)', view.sceneHeld === 'loc/room' && view.end === true, view);
check('C1: the held scene comes from the saved transcript (a restore holds the same)', Rules.heldScene(story, JSON.parse(JSON.stringify(s))) === 'loc/room');
const resumed = Rules.resume(story, s, { presented: s.presentFrom });
check('resume: replayed text and echoes keep their surfaces', resumed.events.every((e) => e.t !== 'echo' || e.surface));

// 3. Gameplay unchanged: every route, voice-led vs control ----------------------------------------------
const cr = convert(control(), { mode: 'preview' });
check('control: converts', cr.ok, cr.errors);
const RULE_FIELDS = ['flags', 'inventory', 'items', 'chapter', 'node', 'returnTo', 'objective', 'steps', 'taken', 'contextDone', 'checks', 'seed'];
const ruleState = (st) => JSON.stringify(RULE_FIELDS.map((k) => st[k]));
const routes = [];
(function walk(prefix) {
  const st = prefix.reduce((acc, c) => Rules.step(story, acc, { choice: c }).state, Rules.begin(story, { seed: 'qa' }).state);
  const cards = Rules.view(story, st).cards;
  if (!cards.length || Rules.view(story, st).end) return routes.push(prefix);
  if (prefix.length > 12) return routes.push(prefix);
  cards.forEach((c) => walk(prefix.concat(c.id)));
})([]);
let same = 0;
const seeds = ['qa', 'a1', 'b2', 'c3', 'd4', 'e5'];
seeds.forEach((seed) => routes.forEach((route) => {
  let a = Rules.begin(story, { seed }).state, c = Rules.begin(cr.story, { seed }).state;
  let ok = true;
  route.forEach((id) => {
    const ra = Rules.step(story, a, { choice: id }), rc = Rules.step(cr.story, c, { choice: id });
    a = ra.state; c = rc.state;
    const kinds = (evs) => JSON.stringify(evs.filter((e) => ['items', 'objective', 'check', 'end', 'chapter', 'restart'].indexOf(e.t) !== -1));
    if (ruleState(a) !== ruleState(c) || kinds(ra.events) !== kinds(rc.events)) ok = false;
    // The same words, in the same order, from the same sources: only the surface differs.
    const words = (st) => JSON.stringify(st.transcript.map((t) => [t.n, t.src, t.node, t.runs]));
    if (words(a) !== words(c)) ok = false;
  });
  if (ok) same++;
}));
check('gameplay: every route x 6 seeds reaches byte-identical rules state, events and transcript words as the control (' + routes.length + ' routes)', routes.length >= 2 && same === routes.length * seeds.length, { routes: routes.length, same });

// 4. Mutants: the validator and importer refuse every misuse ------------------------------------------
function mutate(name, fn, expect, where) {
  const f = fixture();
  fn(f);
  const m = convert(f, { mode: 'preview' });
  let errs = m.errors.slice();
  if (m.story && where === 'validator') errs = (Rules.validateStory(m.story, null, {}).errors || []);
  check('mutant refused: ' + name, errs.some((e) => expect.test(e)), errs);
}
mutate('voice-only record not approved', (f) => { f.artwork.portraits['door_ai:neutral'].status = 'not-started'; }, /voice-only record is an approved no-image decision/);
mutate('voice-only record with an image', (f) => { f.artwork.portraits['door_ai:neutral'].assetPath = 'art/x.png'; }, /voice-only record is an approved no-image decision/);
mutate('voice-only mixed with a portrait pose', (f) => { f.chapters.cap.nodes.door2.pose = 'smiling'; f.artwork.portraits['door_ai:smiling'] = { kind: 'portrait', status: 'approved', assetPath: null }; }, /voice-only speaker uses exactly one portrait record/);
mutate('text-led record with an image', (f) => { f.artwork.scenes['loc/path'].assetPath = 'art/p.png'; }, /text-led record is an approved no-image decision/);
mutate('text-led record with a background', (f) => { f.artwork.scenes['loc/path'].portraitBackground = { status: 'approved', assetPath: null }; }, /text-led record is an approved no-image decision/);
mutate('story opening on a text-led scene', (f) => { f.chapters.cap.nodes.open.scene = 'loc/path'; f.chapters.cap.scene = 'loc/path'; f.artwork.scenes['loc/hall'] = undefined; delete f.artwork.scenes['loc/hall']; }, /opening node is on a text-led scene/, 'validator');
function vmut(name, fn, expect) {
  const st = clone(story);
  fn(st);
  const errs = Rules.validateStory(st, null, {}).errors || [];
  check('mutant refused: ' + name, errs.some((e) => expect.test(e)), errs);
}
vmut('voice-led node given a pose', (st) => { st.chapters.cap.nodes.door.pose = 'neutral'; }, /pose is not available to door_ai/);
vmut('text-led scene also registered as art', (st) => { st.assets.scenes['loc/path'] = null; }, /also registered as scene art/);
vmut('text-led scene listed but unused', (st) => { st.assets.textLedScenes.push('loc/attic'); }, /listed but never used/);
vmut('text-led list malformed', (st) => { st.assets.textLedScenes = 'loc/path'; }, /must be a list of scene ids/);

const failed = results.filter((c) => !c.ok);
console.log('presentation capabilities (C1 text-led, C2 voice-led): ' + (results.length - failed.length) + '/' + results.length + ' passed');
process.exit(failed.length ? 1 : 0);
