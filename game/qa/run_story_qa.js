#!/usr/bin/env node
// Browser QA for imported stories (docs/84 section 7), Chromium and Firefox.
//   NODE_PATH="$(npm root -g)" node game/qa/run_story_qa.js
// The game page is the real game/index.html. Where a case needs different content (a rewritten
// line, the two-chapter fixture, a later content revision), the build is made in Node from an
// edited COPY of the storyboard JSON (tools/story-import) and served in place of
// game/content/story.generated.js; no engine, UI or art file changes. Writes
// game/qa/story_qa_results.json and game/qa/story_screenshots/.
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { createRequire } = require('module');
const ROOT = path.resolve(__dirname, '../..');
const { build } = require(path.join(ROOT, 'tools/story-import/import.js'));
const Rules = require(path.join(ROOT, 'game/js/rules.js'));
let playwright;
try { playwright = createRequire(__filename)('playwright'); } catch (e) {
  console.log('Playwright is not installed here: run with NODE_PATH="$(npm root -g)"');
  process.exit(2);
}
const SHOTS = path.join(__dirname, 'story_screenshots');
fs.mkdirSync(SHOTS, { recursive: true });
const FIXTURE = path.join(__dirname, 'fixtures/story-import');
const ACTION_INK = [142, 44, 31];

const results = [];
function check(browser, name, ok, detail) {
  results.push({ browser, name, ok: !!ok, detail: ok ? undefined : detail });
  if (!ok) console.log('FAIL [' + browser + '] ' + name, detail === undefined ? '' : JSON.stringify(detail).slice(0, 500));
}

// Content variants, built from edited copies of story/ --------------------------------------------
function variant(from, rel, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cyoa-story-qa-'));
  fs.cpSync(from, dir, { recursive: true });
  if (rel) {
    const f = path.join(dir, rel);
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    fn(j);
    fs.writeFileSync(f, JSON.stringify(j, null, 2));
  }
  const b = build({ from: dir });
  fs.rmSync(dir, { recursive: true, force: true });
  if (!b.ok) throw new Error('variant does not build: ' + b.report.errors.join(' | '));
  return b;
}
const PROLOGUE = 'chapters/prologue-00.draft.json';
const NEW_LINE = 'Good morning! This line was rewritten in the storyboard JSON.';
const BASE = build();
const REWRITE = variant(path.join(ROOT, 'story'), PROLOGUE, (j) => { j.nodes.drone_intercepts.text[1] = NEW_LINE; });
const FIX = variant(FIXTURE);
const LONG = ['You are in a grey hall. The ceiling is low and the light is the colour of weak tea. A panel is set into the wall.',
  'The floor has been polished so often that it reflects the light fittings, the panel and the counter, all slightly bent.',
  'A clerk sits behind the counter, sorting cards into a long wooden tray. Every card goes into the tray at the front.',
  'Somewhere above the ceiling, a fan turns over and stops, turns over and stops, as if it is reconsidering.',
  'A door on the far side leads out to the yard. Its handle has been taped over with a strip of paper that says nothing.',
  'You stand where you are for a moment and count the cards the clerk files. There are a great many of them.'].join('\n\n');
const FIX_LONG = variant(FIXTURE, 'chapters/fx-one.json', (j) => { j.nodes.hall.text = LONG; });
const FIX_TEXT = variant(FIXTURE, 'chapters/fx-one.json', (j) => { j.nodes.hall.text = 'The hall has been rewritten since this game was saved.'; });
const FIX_GONE = variant(FIXTURE, 'chapters/fx-one.json', (j) => {
  delete j.nodes.panel;
  j.nodes.hall.choices = j.nodes.hall.choices.filter((c) => c.id !== 'examine_panel');
  j.nodes.hall.choices.push({ id: 'find_card', kind: 'action', text: 'LOOK UNDER THE COUNTER.', once: true, effects: [{ give: ['fx_card'] }, { set: { card_found: true } }] });
});

// A save made in Node by playing a route on a build (so a test can start deep in the story).
function saveAt(b, route) {
  let s = Rules.begin(b.story, { seed: 'qa' }).state;
  route.forEach((x) => { s = Rules.step(b.story, s, typeof x === 'string' ? { choice: x } : x).state; });
  return Rules.serialize(b.story, s, { presented: s.transcript.length });
}
const TO_DIRECTIONS = ['head_to_restroom', 'drone_show_form', 'sign_notice', 'signed_move_on', 'go_to_exit', 'take_box_and_leave',
  { item: 'effects_box_full', verb: 'inspect' }, 'enter_exposition', 'pass_turnstile', 'deposit_all', 'continue_to_reception_stored',
  'speak_to_receptionist', 'ask_for_restroom', 'wait_for_assistance', 'accept_for_directions', 'move_on_practical'];

// Server -------------------------------------------------------------------------------------------
function startServer() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
  const server = http.createServer((req, res) => {
    const file = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

// Page helpers -------------------------------------------------------------------------------------
async function open(context, url, content) {
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
  await page.unroute('**/game/content/story.generated.js').catch(() => {});
  if (content) await page.route('**/game/content/story.generated.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: content.text }));
  await page.goto(url);
  await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 30000 });
  return { page, errors };
}
// Finishes typing until the flow waits for a card (taking presentation CONTINUEs if `through`).
async function settle(page, through) {
  for (let k = 0; k < 12; k++) {
    await page.waitForFunction(() => {
      const p = document.body.dataset.phase;
      if (p === 'typing') window.CYOA_GAME.flow.skip();
      return p === 'choosing';
    }, null, { timeout: 20000, polling: 50 });
    const cont = await page.evaluate(() => { const c = window.CYOA_GAME.ui.cards; return c.length === 1 && c[0].id === '__continue'; });
    if (!through || !cont) return;
    await page.evaluate(() => window.CYOA_GAME.flow.choose(0));
  }
}
async function take(page, id) {
  await settle(page, true);
  const i = await page.evaluate((x) => window.CYOA_GAME.ui.cards.findIndex((c) => c.id === x), id);
  if (i < 0) throw new Error('no card ' + id + ' at ' + await page.evaluate(() => document.body.dataset.node));
  await page.evaluate((x) => window.CYOA_GAME.flow.choose(x), i);
  await settle(page, false);
}
const info = (page) => page.evaluate(() => {
  const G = window.CYOA_GAME;
  const d = document.body.dataset;
  const nar = document.getElementById('narration');
  const foc = document.getElementById('focusDescription');
  return {
    phase: d.phase, node: d.node, mode: d.mode, scene: d.scene, save: d.save, saveReason: d.saveReason,
    cards: G.ui.cards.map((c) => ({ id: c.id, kind: c.kind, text: c.text, first: c.wrapped[0], ink: c.ink || null })),
    inv: G.state.inventory.slice(), objective: G.state.objective,
    speech: G.ui.speech.parts.map((p) => p.who + '|' + p.text),
    narration: nar ? nar.dataset.text : null, focusText: foc ? foc.dataset.text : null,
    layers: Array.from(document.getElementById('portrait').children).filter((e) => e.style.display !== 'none').map((e) => e.id + '=' + (e.dataset.art || '')),
    portraitShown: document.getElementById('portrait').style.display !== 'none',
    overlayShown: !!(document.getElementById('narrativeLayer') && document.getElementById('narrativeLayer').style.display !== 'none'),
    speechHidden: document.getElementById('speechText').style.visibility === 'hidden',
    sceneArt: document.getElementById('sceneArt').dataset.art,
    noticeLog: G.ui.noticeLog.slice()
  };
});
// RGB triples present in a card's text canvas.
const cardInks = (page, index) => page.evaluate((i) => {
  const cv = window.CYOA_GAME.els.cards[i].text;
  const out = {};
  try {
    const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    for (let k = 0; k < d.length; k += 4) if (d[k + 3] === 255) out[d[k] + ',' + d[k + 1] + ',' + d[k + 2]] = 1;
  } catch (e) { return ['unreadable']; }
  return Object.keys(out);
}, index);

async function suite(name, base) {
  const b = name;
  const browser = await playwright[name].launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  const url = base + '/game/index.html';
  const shot = (page, f) => page.screenshot({ path: path.join(SHOTS, name + '_' + f) });
  let errorsAll = [];

  // 1. The prologue opens in Narrative B ------------------------------------------------------------
  let { page, errors } = await open(context, url + '?new&seed=qa');
  await settle(page, false);
  let s = await info(page);
  check(b, 'the game page plays the imported story by default (preview build, content hash on the body)', await page.evaluate((h) => document.body.dataset.story === 'the-acceptable-error'
    && document.body.dataset.content === h.slice(0, 12) && document.body.dataset.channel === 'preview', BASE.meta.contentHash));
  check(b, 'Narrative B: opening node in B, overlay on, dialogue box hidden, portrait aperture empty', s.mode === 'narrative' && s.overlayShown && s.speechHidden && !s.portraitShown, s);
  check(b, 'Narrative B: the narration holds the authored passage (second person, as written)', /The applause lasts exactly six seconds/.test(s.narration) && /head for the restroom\.$/.test(s.narration), s.narration);
  check(b, 'Narrative B: the scene aperture shows the node\'s scene art', s.sceneArt === 'scene:workplace/applause_station', s.sceneArt);
  check(b, 'a continue card is plain (no quotes, dark ink)', s.cards.length === 1 && s.cards[0].kind === 'continue' && s.cards[0].first === 'CONTINUE' && !s.cards[0].ink, s.cards);
  check(b, 'the objective plaque shows the node objective', s.objective === 'FIND THE BATHROOM.');
  await shot(page, '01_narrative_b.png');

  // 2. Dialogue -------------------------------------------------------------------------------------
  await take(page, 'head_to_restroom');
  await take(page, 'drone_show_form');
  s = await info(page);
  check(b, 'Dialogue: transition into the drone conversation (dialogue box on, B overlay off)', s.mode === 'dialogue' && !s.overlayShown && !s.speechHidden, s);
  check(b, 'Dialogue: the portrait shows the paired corridor background under the paper-extended pose', s.portraitShown
    && s.layers.indexOf('portraitBackground=portrait:termination_drone:background:workplace/corridor') !== -1
    && s.layers.indexOf('portraitNpc=portrait:termination_drone:pose:paper_extended') !== -1, s.layers);
  check(b, 'Dialogue: NPC speech and stage directions are in the dialogue box, unquoted', s.speech.some((x) => /^npc\|A narrow pink document appears/.test(x)) && !s.speech.some((x) => /^npc\|"/.test(x)), s.speech);
  const spoken = s.cards.find((c) => c.kind === 'spoken');
  const action = s.cards.findIndex((c) => c.kind === 'action');
  check(b, 'cards: a spoken card shows its words in quotation marks; its text (aria) has none', spoken && spoken.first[0] === '"' && spoken.text[0] !== '"', spoken);
  const inks = await cardInks(page, action);
  check(b, 'cards: an action card is drawn in the action ink', inks.indexOf(ACTION_INK.join()) !== -1 || inks[0] === 'unreadable', inks.slice(0, 6));
  await shot(page, '02_dialogue_cards.png');
  await take(page, 'sign_notice');
  s = await info(page);
  check(b, 'Dialogue: the player\'s action is echoed in the dialogue box as an action (action ink), not quoted', s.speech.some((x) => x === 'action|SIGN THE NOTICE AND TAKE YOUR COPY.'), s.speech.slice(-4));
  check(b, 'items: the notice arrives (inventory + ITEM RECEIVED slip)', s.inv.join() === 'termination_notice' && s.noticeLog.indexOf('termination_notice') !== -1, s);
  await shot(page, '03_action_echo_and_slip.png');

  // 3. NOTES / FILES ---------------------------------------------------------------------------------
  await page.evaluate(() => window.CYOA_GAME.flow.utility('notes'));
  const notes = await page.evaluate(() => document.getElementById('overlayCanvas').dataset.text);
  check(b, 'NOTES: the whole playthrough so far, narration and dialogue, NAME: / YOU: labels', /^NOTES\n/.test(notes) && /The applause lasts exactly six seconds/.test(notes)
    && /TERMINATION DRONE:/.test(notes) && /YOU:\nSIGN THE NOTICE/.test(notes), notes.slice(0, 600));
  await shot(page, '04_notes.png');
  await page.evaluate(() => window.CYOA_GAME.flow.utility('files'));
  check(b, 'FILES: opens on its own panel (no FILES entries authored yet)', await page.evaluate(() => document.getElementById('overlayCanvas').dataset.kind === 'files'
    && document.getElementById('overlayPanel').dataset.art === 'art/ui/overlays/files_panel.png'));
  await page.evaluate(() => window.CYOA_GAME.flow.utility('files'));

  // 4. Items: the box unpacks when opened; six-slot inventory -------------------------------------------
  await take(page, 'signed_move_on');
  await take(page, 'go_to_exit');
  await take(page, 'take_box_and_leave');
  await page.evaluate(() => window.CYOA_GAME.flow.toggleInspect('effects_box_full'));
  await page.waitForTimeout(200);
  s = await info(page);
  check(b, 'items: opening the sealed box unpacks it (box replaced by its contents), inspector closes', s.inv.join() === 'termination_notice,effects_box_empty,timing_clicker,desk_plant,red_stapler,rubber_band_ball'
    && !(await page.evaluate(() => !!window.CYOA_GAME.ui.inspector)), s.inv);
  check(b, 'items: each unpacked item gets its slip, in order', ['effects_box_empty', 'timing_clicker', 'desk_plant', 'red_stapler', 'rubber_band_ball'].every((x) => s.noticeLog.indexOf(x) !== -1));
  const slots = await page.evaluate(() => Array.from(document.querySelectorAll('.slot')).filter((n) => n.style.display !== 'none').map((n) => n.dataset.item));
  check(b, 'inventory: the six-slot strip shows six slots with the six items', slots.length === 6 && slots.filter(Boolean).length === 6, slots);
  await shot(page, '05_unpacked_inventory.png');
  await page.evaluate(() => window.CYOA_GAME.flow.toggleInspect('desk_plant'));
  const insp = await page.evaluate(() => ({ id: window.CYOA_GAME.ui.inspector && window.CYOA_GAME.ui.inspector.id, art: document.getElementById('inspectArt').dataset.kind, acts: window.CYOA_GAME.utilityActions().map((a) => a.action + ':' + a.enabled) }));
  check(b, 'inspector: item art, READ available, SHOW unavailable outside dialogue', insp.id === 'desk_plant' && insp.art === 'art' && insp.acts[0] === 'read:true' && insp.acts[1] === 'show:false', insp);
  await shot(page, '06_inspector.png');
  await page.evaluate(() => window.CYOA_GAME.flow.closeInspector());
  // A seventh item, for the slide only (presentation check; not story state).
  await page.evaluate(() => { const G = window.CYOA_GAME; G.state.inventory.push('wc_key'); G.renderInventory(); G.stepInventory(1); });
  const slide = await page.evaluate(() => ({ start: window.CYOA_GAME.ui.inv.start, sliding: !!window.CYOA_GAME.ui.inv.slide }));
  check(b, 'inventory: with a seventh item the strip slides by one slot (the M2 slide physics)', slide.start === 1 && slide.sliding, slide);
  await page.waitForTimeout(700);
  await page.evaluate(() => { const G = window.CYOA_GAME; G.stepInventory(-1); G.state.inventory.pop(); G.renderInventory(); });
  await take(page, 'enter_exposition');
  await take(page, 'pass_turnstile');
  s = await info(page);
  check(b, 'Narrative B: a passage that fits the panel arrives whole, then its choices', s.node === 'prologue-00:expo_property_counter'
    && s.cards.map((c) => c.id).join() === 'deposit_all,keep_one,hurry_past_intake' && /Visitors may retain one personal article/.test(s.narration), s);
  errorsAll = errorsAll.concat(errors);
  await page.close();

  // A passage longer than the panel (fixture variant): CONTINUE between paragraph groups.
  ({ page, errors } = await open(context, url + '?nosave&seed=qa', FIX_LONG));
  await settle(page, false);
  const cont = await page.evaluate(() => window.CYOA_GAME.ui.cards.map((c) => c.id).join());
  const firstGroup = (await info(page)).narration;
  check(b, 'Narrative B: a passage longer than the panel waits for a presentation CONTINUE between paragraph groups', cont === '__continue' && !/count the cards/.test(firstGroup), [cont, firstGroup]);
  await shot(page, '07_b_group_continue.png');
  await settle(page, true);
  s = await info(page);
  check(b, 'Narrative B: earlier groups stay in the scrollable narration; the node\'s choices follow the last group', /weak tea/.test(s.narration) && /count the cards/.test(s.narration)
    && s.cards.some((c) => c.id === 'examine_panel'), s);
  check(b, 'Narrative B: the presentation CONTINUE is never a rules step (no decision logged)', await page.evaluate(() => window.CYOA_GAME.state.taken.length === 0 && window.CYOA_GAME.state.steps === 1));
  errorsAll = errorsAll.concat(errors);
  await page.close();

  // 5. Saves: reload restores; the demo rewrite reaches the game ---------------------------------------
  ({ page, errors } = await open(context, url));
  await settle(page, false);
  s = await info(page);
  check(b, 'saves: a reload restores the autosave at the same node with the same inventory', s.save === 'restored' && s.node === 'prologue-00:expo_property_counter' && s.inv.length === 5, s);
  errorsAll = errorsAll.concat(errors);
  await page.close();
  ({ page, errors } = await open(context, url, REWRITE));
  await settle(page, false);
  s = await info(page);
  check(b, 'saves: after a compatible content revision the save is carried over (migrated)', s.save === 'migrated' && s.node === 'prologue-00:expo_property_counter', s);
  await page.close();
  ({ page, errors } = await open(context, url + '?new&seed=qa', REWRITE));
  await take(page, 'head_to_restroom');
  s = await info(page);
  check(b, 'DEMO: a dialogue line rewritten in the storyboard JSON appears in the game after reimport', s.speech.some((x) => x.indexOf(NEW_LINE) !== -1), s.speech);
  await shot(page, '08_demo_rewritten_line.png');
  errorsAll = errorsAll.concat(errors);
  await page.close();

  // 6. Item-based choice and the DRAFT STOP, from a save made deep in the story ------------------------
  await context.addInitScript(() => {});
  ({ page, errors } = await open(context, url + '?nosave'));
  await page.evaluate((sv) => localStorage.setItem('cyoa-save:the-acceptable-error', sv), saveAt(BASE, TO_DIRECTIONS));
  await page.close();
  ({ page, errors } = await open(context, url));
  await settle(page, false);
  s = await info(page);
  check(b, 'DEMO: at the key hand-off the tag question is not offered before the tag is read', s.node === 'prologue-00:reception_directions'
    && !s.cards.some((c) => c.id === 'question_returned_key'), s);
  await page.evaluate(() => window.CYOA_GAME.flow.toggleInspect('wc_key'));
  await page.evaluate(() => window.CYOA_GAME.flow.utility('read'));
  const showOk = await page.evaluate(() => window.CYOA_GAME.utilityActions()[1]);
  await page.evaluate(() => window.CYOA_GAME.flow.closeInspector());
  await settle(page, false);
  s = await info(page);
  check(b, 'DEMO: READING the key tag (an item condition) makes the question available, and SHOW is offered', s.cards.some((c) => c.id === 'question_returned_key') && showOk.action === 'show' && showOk.enabled, [s.cards, showOk]);
  await shot(page, '09_item_condition_choice.png');
  await take(page, 'question_returned_key');
  await take(page, 'depart_after_key');
  await settle(page, false);
  s = await info(page);
  check(b, 'DRAFT STOP: the unfinished hand-off ends with one labelled system card', s.node === 'prologue-00:reception_hallway' && s.cards.length === 1
    && s.cards[0].kind === 'system' && s.cards[0].text === 'DRAFT ENDS HERE. BEGIN AGAIN.', s.cards);
  await shot(page, '10_draft_stop.png');
  await take(page, 'draft_stop_begin_again');
  s = await info(page);
  check(b, 'BEGIN AGAIN restarts the playthrough (new NOTES, empty inventory, opening node)', s.node === 'prologue-00:work_complete' && s.inv.length === 0
    && await page.evaluate(() => window.CYOA_GAME.state.transcript.length) <= 3, s);
  errorsAll = errorsAll.concat(errors);
  await page.close();

  // 7. Focus A and a chapter transition (the neutral two-chapter fixture) --------------------------------
  ({ page, errors } = await open(context, url + '?new&seed=qa', FIX));
  await take(page, 'examine_panel');
  s = await info(page);
  check(b, 'Focus A: the close-up replaces the portrait, the description replaces the dialogue box, B overlay off', s.mode === 'focus' && s.layers.indexOf('focusArt=focus:fixture/hall/panel') !== -1
    && !s.overlayShown && s.speechHidden && /A small steel panel/.test(s.focusText), s);
  await shot(page, '11_focus_a.png');
  await take(page, 'take_card');
  s = await info(page);
  check(b, 'Focus A: a stay with a result adds to the visit\'s description', /You work the card free\./.test(s.focusText) && s.inv.join() === 'fx_card', s);
  await take(page, 'stop_examining');
  s = await info(page);
  check(b, 'Focus A -> B: back returns to the narration, which continues (earlier text kept, result appended)', s.mode === 'narrative' && /grey hall/.test(s.narration)
    && /You step back from the panel\.$/.test(s.narration) && !/steel panel/.test(s.narration), s.narration);
  await take(page, 'leave_hall');
  s = await info(page);
  check(b, 'chapter transition: the next chapter\'s scene and objective', s.node === 'fx-two:yard' && s.sceneArt === 'scene:fixture/yard' && s.objective === 'CROSS THE YARD.', s);
  errorsAll = errorsAll.concat(errors);
  await page.close();

  // 8. Incompatible revision: refused, never loaded ------------------------------------------------------
  ({ page, errors } = await open(context, url + '?nosave', FIX));
  await page.evaluate((sv) => localStorage.setItem('cyoa-save:import-fixture', sv), saveAt(FIX, ['examine_panel', 'take_card', 'stop_examining']));
  await page.close();
  ({ page, errors } = await open(context, url, FIX_TEXT));
  s = await info(page);
  check(b, 'saves: a text-only revision of the fixture carries the save over', s.save === 'migrated' && s.inv.join() === 'fx_card', s);
  await page.close();
  ({ page, errors } = await open(context, url, FIX_GONE));
  s = await info(page);
  check(b, 'saves: a revision that removed what the save refers to is refused with a reason, and the game starts fresh', s.save === 'refused' && /removed nodes or choices/.test(s.saveReason)
    && s.node === 'fx-one:hall' && s.inv.length === 0, s);
  check(b, 'saves: the refused save is kept aside, not destroyed', await page.evaluate(() => !!localStorage.getItem('cyoa-save:import-fixture:refused')));
  errorsAll = errorsAll.concat(errors.filter((e) => !/Saved game not loaded/.test(e)));
  await page.close();

  // 9. Reception regression fixture and file:// ---------------------------------------------------------
  ({ page, errors } = await open(context, url + '?story=reception'));
  await settle(page, false);
  check(b, 'the M2 reception slice is still available (?story=reception) on its own v1 flow', await page.evaluate(() => document.body.dataset.story === 'reception'
    && window.CYOA_GAME.flow !== window.CYOA_GAME.storyFlow && window.CYOA_GAME.ui.cards.length === 2));
  errorsAll = errorsAll.concat(errors);
  await page.close();
  ({ page, errors } = await open(context, 'file://' + path.join(ROOT, 'game/index.html') + '?nosave&seed=qa'));
  await take(page, 'head_to_restroom');
  await take(page, 'drone_show_form');
  await take(page, 'sign_notice');
  s = await info(page);
  check(b, 'file://: the imported story plays with no server, including the item slip', s.inv.join() === 'termination_notice' && await page.evaluate(() => document.getElementById('itemNotice').dataset.item === 'termination_notice'), s);
  errorsAll = errorsAll.concat(errors);
  await page.close();

  check(b, 'no console errors, page errors or failed requests', errorsAll.length === 0, errorsAll.slice(0, 5));
  await browser.close();
}

(async () => {
  const server = await startServer();
  const base = 'http://127.0.0.1:' + server.address().port;
  for (const name of ['chromium', 'firefox']) {
    try { await suite(name, base); } catch (e) { check(name, 'suite ran to the end', false, String(e.stack || e).slice(0, 800)); }
  }
  server.close();
  const passed = results.filter((r) => r.ok).length;
  fs.writeFileSync(path.join(__dirname, 'story_qa_results.json'), JSON.stringify({ suite: 'story-browser', passed, total: results.length, content: BASE.meta.contentHash, results }, null, 2) + '\n');
  console.log('story browser QA ' + passed + '/' + results.length + (passed === results.length ? ' passed' : ' FAILED'));
  process.exitCode = passed === results.length ? 0 : 1;
})();
