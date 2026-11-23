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
function variant(from, rel, fn, mode) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cyoa-story-qa-'));
  fs.cpSync(from, dir, { recursive: true });
  if (rel) {
    const f = path.join(dir, rel);
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    fn(j);
    fs.writeFileSync(f, JSON.stringify(j, null, 2));
  }
  const b = build({ from: dir, mode: mode || 'preview' });
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

// Focus A with a description longer than one page.
const LONG_FOCUS = ['A small steel panel with one loose screw. The paint around it has been touched up so often that it has a rim.',
  'Something blue is wedged behind it, folded once, the fold worn soft. A sticker on the panel says THIS PANEL IS NOT A DOOR.',
  'Another sticker below it says THIS STICKER IS NOT A REASON TO OPEN THE PANEL. Both stickers are signed by the same clerk.',
  'The screw turns a little in your fingers, then a little more, then stops, as if it has an opinion about the matter.',
  'The blue edge moves when the screw does. Whatever it is, it was put there on purpose and then forgotten on purpose.'].join('\n\n');
const FIX_FOCUS_LONG = variant(FIXTURE, 'chapters/fx-one.json', (j) => { j.nodes.panel.text = LONG_FOCUS; });
// The same fixture as an approved build of approved chapters: no draft stamp.
const FIX_APPROVED = variant(FIXTURE, 'storyboard-manifest.json', (j) => { j.chapters.forEach((c) => { c.status = 'approved'; }); }, 'approved');
const TO_YARD = ['examine_panel', 'take_card', 'stop_examining', 'leave_hall'];

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
  const stamp = await page.evaluate(() => {
    const n = document.getElementById('draftStamp');
    const kids = Array.from(document.getElementById('stage').children);
    return n && { text: n.dataset.text, shown: n.style.display !== 'none', draft: document.body.dataset.draft, title: document.title,
      underOverlay: kids.indexOf(n) < kids.indexOf(document.getElementById('overlay')), box: [n.offsetLeft, n.offsetTop, n.offsetWidth, n.offsetHeight] };
  });
  check(b, 'draft identification: the default game is stamped DRAFT PLAYABLE PREVIEW, not approved canon, with its chapter and build', stamp && stamp.shown && stamp.draft === 'true'
    && /^DRAFT PLAYABLE PREVIEW - NOT APPROVED CANON\nPROLOGUE-00: PROLOGUE - THE LAST GOOD DAY \[DRAFT\] - BUILD D88CA197$/.test(stamp.text.replace(BASE.meta.contentHash.slice(0, 8).toUpperCase(), 'D88CA197')), stamp);
  check(b, 'draft identification: the window title says draft too', stamp && /DRAFT playable preview: Prologue — The Last Good Day/.test(stamp.title) && /not approved canon/.test(stamp.title), stamp && stamp.title);
  check(b, 'draft stamp: inside the scene window, under NOTES/FILES and the rest of the UI', stamp && stamp.underOverlay && stamp.box[0] >= 40 && stamp.box[1] >= 45
    && stamp.box[0] + stamp.box[2] <= 1275 && stamp.box[1] + stamp.box[3] <= 400, stamp);

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
  check(b, 'HAND-OFF: the Prologue\'s last node keeps its narration and now offers one CONTINUE card into Chapter 1 (no dead end)', s.node === 'prologue-00:reception_hallway'
    && /You follow it\.$/.test(s.narration) && s.cards.length === 1 && s.cards[0].id === 'continue_to_chapter_01' && s.cards[0].kind === 'continue', s.cards);
  await shot(page, '10_handoff_prologue.png');
  const before = await page.evaluate(() => JSON.parse(JSON.stringify((({ flags, inventory, items, checks, objective, seed, transcript }) => ({ flags, inventory, items, checks, objective, seed, transcript }))(window.CYOA_GAME.state))));
  await take(page, 'continue_to_chapter_01');
  s = await info(page);
  const after = await page.evaluate(() => JSON.parse(JSON.stringify(window.CYOA_GAME.state)));
  const same = (k) => JSON.stringify(after[k]) === JSON.stringify(before[k]);
  // docs/92: the arrival now shows its selected production art (a decoded image at 4x, not the
  // labelled DEV PLACEHOLDER canvas); PR #7: the approach is an unmarked single ivory door.
  check(b, 'HAND-OFF: the game enters House of Tomorrow authored arrival with its production arrival art', s.node === 'chapter-01:house_arrival'
    && s.scene === 'house_of_tomorrow/arrival' && s.sceneArt === 'scene:house_of_tomorrow/arrival'
    && await page.evaluate(() => { const c = document.getElementById('sceneArt'); return c.tagName === 'IMG' && c.complete && c.naturalWidth === 314 && c.naturalHeight === 206 && c.width === 1256 && /house_of_tomorrow\/arrival\.png/.test(c.getAttribute('src') || c.src); })
    && /ivory door/.test(s.narration) && s.cards.some((c) => c.id === 'enter_show_home'), s);
  check(b, 'HAND-OFF: inventory, flags, item marks, resolved checks and seed are unchanged; House sets its own objective',
    ['flags', 'inventory', 'items', 'checks', 'seed'].every(same)
    && after.objective === 'FIND A FUNCTIONING BATHROOM.' && before.inventory.length >= 3,
    ['flags', 'inventory', 'items', 'checks', 'seed'].filter((k) => !same(k)).concat(after.objective));
  check(b, 'HAND-OFF: NOTES history continues (every Prologue entry kept, the Chapter 1 entry appended)', after.transcript.length > before.transcript.length
    && JSON.stringify(after.transcript.slice(0, before.transcript.length)) === JSON.stringify(before.transcript) && after.transcript[after.transcript.length - 1].chapter === 'chapter-01');
  const stamp1 = await page.evaluate(() => document.getElementById('draftStamp').dataset.text);
  check(b, 'HAND-OFF: the existing draft stamp now names Chapter 1 as a draft', /\nCHAPTER-01: CHAPTER 1 - HOUSE OF TOMORROW \[DRAFT\] - BUILD /.test(stamp1), stamp1);
  await shot(page, '10b_handoff_chapter_01.png');
  // The autosave spans chapters: a reload resumes in Chapter 1 with the Prologue's state.
  await page.close();
  let errors2;
  ({ page, errors: errors2 } = await open(context, url));
  await settle(page, false);
  s = await info(page);
  const reloaded = await page.evaluate(() => JSON.parse(JSON.stringify(window.CYOA_GAME.state)));
  check(b, 'HAND-OFF: a reload restores the one autosave in Chapter 1 with the Prologue\'s inventory, flags and NOTES (no separate Chapter 1 save)', s.save === 'restored'
    && s.node === 'chapter-01:house_arrival' && JSON.stringify(reloaded.inventory) === JSON.stringify(before.inventory) && JSON.stringify(reloaded.flags) === JSON.stringify(before.flags)
    && reloaded.transcript.length === after.transcript.length
    && await page.evaluate(() => Object.keys(localStorage).filter((k) => /^cyoa-save:/.test(k)).join()) === 'cyoa-save:the-acceptable-error', s);
  errors = errors.concat(errors2);
  // Real authored Chapter 1, following the path without a retained plant: dinner, portrait,
  // fake bathroom and the showroom-reset escape. This exercises the shared game shell.
  for (const choice of [
    'enter_show_home', 'hear_house_greeting', 'permit_housekeeping', 'ask_for_bathroom_after_storage',
    'refuse_everything', 'ask_to_leave_house', 'no_plant_first_foyer', 'go_to_mandatory_dinner',
    'interrupt_family_dinner', 'after_dinner_no_plant', 'attend_photo_session',
    'continue_to_bathroom', 'use_bathroom_at_last', 'accept_completed_demonstration',
    'leave_during_reset'
  ]) await take(page, choice);
  s = await info(page);
  check(b, 'Chapter 1 playthrough reaches a distinct showroom-reset exit with photo inventory and one CONTINUE into Chapter 2',
    s.node === 'chapter-01:exit_showroom_reset' && s.cards.length === 1
    && s.cards[0].id === 'continue_to_chapter_02_exit_showroom_reset' && s.cards[0].kind === 'continue'
    && s.inv.includes('family_portrait_photo')
    && (await page.evaluate(() => window.CYOA_GAME.state.flags.house_exit_route)) === 'showroom_reset', s);
  await shot(page, '10_chapter_01_showroom_exit.png');
  await take(page, 'continue_to_chapter_02_exit_showroom_reset');
  s = await info(page);
  check(b, 'HAND-OFF 2: the showroom exit enters the Chapter 2 Bureau with its own arrival narration and the photo still held',
    /^chapter-02:bureau_/.test(s.node) && s.inv.includes('family_portrait_photo')
    && /declared your bathroom needs fulfilled/.test(await page.evaluate(() => window.CYOA_GAME.state.transcript.slice(-4).map((e) => e.runs.map((r) => r.text).join(' ')).join(' '))), s);
  // A dice-free Chapter 2 route to a real ending: review, tower trace, courier, carry the canister out.
  for (const choice of ['inspect_closed_conveniences', 'see_groundskeeper', 'react_to_gardener', 'examine_landscape_performance',
    'request_zero_compliance_review', 'enter_from_performance_review', 'head_to_tower', 'inspect_tower_approvals', 'trace_original_requests',
    'follow_trace_to_flower', 'read_flower_district_decree', 'accept_seed_courier', 'carry_seeds_to_customs', 'carry_sealed_seeds_out', 'leave_cargo_checkpoint'
  ]) await take(page, choice);
  s = await info(page);
  // Since Chapter 3 integration (docs/104) a living Chapter 2 ending continues into Chapter 3.
  check(b, 'Chapter 2 ending: Agricultural Customs with the sealed canister, public concourse entry group, CONTINUE into Chapter 3 only',
    s.node === 'chapter-02:end_customs' && s.inv.includes('certified_seed_canister') && s.cards.length === 1 && s.cards[0].id === 'continue_to_chapter_03_end_customs'
    && (await page.evaluate(() => window.CYOA_GAME.state.flags.chapter3_entry_group)) === 'public_concourse', s);
  await shot(page, '10c_chapter_02_customs_ending.png');
  await take(page, s.cards[0].id);
  s = await info(page);
  check(b, 'HAND-OFF 3: the customs ending enters the Chapter 3 Pavilion with the public-concourse arrival and the canister still held',
    s.node === 'chapter-03:pavilion_arrival' && s.inv.includes('certified_seed_canister')
    && /emerge from Biology Park into the main Exposition concourse/.test(await page.evaluate(() => window.CYOA_GAME.state.transcript.slice(-4).map((e) => e.runs.map((r) => r.text).join(' ')).join(' '))), s);
  // A dice-free Chapter 3 route to a surviving ending: the zero-second visit.
  for (const choice of ['approach_real_restroom', 'approach_pavilion_attendant', 'ask_attendant_for_restroom', 'try_unapproved_restroom_entry',
    'respond_to_open_door', 'back_into_restroom_exit']) await take(page, choice);
  // The ending passage is longer than the panel: its presentation CONTINUE comes first (Narrative B paging),
  // then the ending's own card.
  await settle(page, true);
  s = await info(page);
  check(b, 'Chapter 3 surviving ending (NEW FACILITY RECORD): BEGIN AGAIN only, no death popup', s.node === 'chapter-03:door_reverse_end' && s.cards.length === 1 && s.cards[0].kind === 'system'
    && !(await page.evaluate(() => document.body.dataset.endPresentation)), s);
  await shot(page, '10d_chapter_03_surviving_ending.png');
  await take(page, s.cards[0].id);
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

  // 7b. Focus A in depth: paging, a second visit, reload ---------------------------------------------------
  ({ page, errors } = await open(context, url + '?nosave&seed=qa', FIX_FOCUS_LONG));
  await take(page, 'examine_panel');
  await settle(page, false);
  let pg = await page.evaluate(() => { const d = document.getElementById('focusDescription').dataset; return { page: +d.page, pages: +d.pages, cards: window.CYOA_GAME.ui.cards.map((c) => c.id) }; });
  check(b, 'Focus A paging: a description longer than the panel opens on page 1 of several, with a presentation CONTINUE', pg.pages > 1 && pg.page === 0 && pg.cards.join() === '__continue', pg);
  await settle(page, true);
  pg = await page.evaluate(() => { const d = document.getElementById('focusDescription').dataset; return { page: +d.page, pages: +d.pages, cards: window.CYOA_GAME.ui.cards.map((c) => c.id), taken: window.CYOA_GAME.state.taken.length }; });
  check(b, 'Focus A paging: CONTINUE pages on (never a rules step), then the node\'s own choices', pg.page === pg.pages - 1 && pg.cards.join() === 'take_card,stop_examining' && pg.taken === 1, pg);
  await shot(page, '12_focus_a_paged.png');
  errorsAll = errorsAll.concat(errors);
  await page.close();

  ({ page, errors } = await open(context, url + '?new&seed=qa', FIX));
  for (const c of ['examine_panel', 'take_card', 'stop_examining', 'examine_panel']) await take(page, c);
  s = await info(page);
  check(b, 'Focus A revisit: a new visit starts a fresh description and offers only what is left', s.mode === 'focus' && /A small steel panel/.test(s.focusText)
    && !/You work the card free/.test(s.focusText) && s.cards.map((c) => c.id).join() === 'stop_examining', s);
  await page.goto(url + '?seed=qa');
  await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 30000 });
  await settle(page, false);
  s = await info(page);
  check(b, 'Focus A reload: the save restores the close-up, the description and the choices', s.save === 'restored' && s.mode === 'focus'
    && s.layers.indexOf('focusArt=focus:fixture/hall/panel') !== -1 && /A small steel panel/.test(s.focusText) && s.cards.map((c) => c.id).join() === 'stop_examining', s);
  errorsAll = errorsAll.concat(errors);
  await page.close();

  // 7c. Dice checks (hidden in v0: no die, odds or roll on screen; the outcome is narrated) ---------------
  // fx_fence is d6 need 4; seed s6 rolls 1 (fail), s9 rolls 4 (pass).
  ({ page, errors } = await open(context, url + '?new&seed=s6', FIX));
  for (const c of TO_YARD) await take(page, c);
  s = await info(page);
  const ckCard = s.cards.filter((c) => c.id === 'climb_fence')[0];
  const ckView = await page.evaluate(() => window.CYOA_GAME.flow.view().cards.filter((c) => c.id === 'climb_fence')[0]);
  check(b, 'check: the risky card shows only its authored text (no die, odds, target or roll anywhere on the page)', ckCard && ckCard.text === 'CLIMB THE FENCE INSTEAD.'
    && ckView.hasCheck === true && await page.evaluate(() => !/\bd6\b|\broll\b|\bodds\b|%/i.test(document.getElementById('stage').innerText + document.title)), [ckCard, ckView]);
  await take(page, 'climb_fence');
  s = await info(page);
  const ck1 = await page.evaluate(() => window.CYOA_GAME.state.checks.fx_fence);
  check(b, 'check fail: stays, narrates the fail result, the card is gone and the other way on remains', s.node === 'fx-two:yard' && /land back in the yard\.$/.test(s.narration)
    && s.cards.map((c) => c.id).join() === 'cross_yard' && ck1 && ck1.ok === false && ck1.roll === 1, [s, ck1]);
  await page.goto(url + '?seed=s6');
  await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 30000 });
  await settle(page, false);
  s = await info(page);
  const ck2 = await page.evaluate(() => window.CYOA_GAME.state.checks.fx_fence);
  check(b, 'check reload: the save keeps the outcome; nothing re-rolls', s.save === 'restored' && JSON.stringify(ck2) === JSON.stringify(ck1) && s.cards.map((c) => c.id).join() === 'cross_yard', [s, ck2]);
  errorsAll = errorsAll.concat(errors);
  await page.close();
  ({ page, errors } = await open(context, url + '?nosave&seed=s9', FIX));
  for (const c of TO_YARD) await take(page, c);
  await take(page, 'climb_fence');
  s = await info(page);
  check(b, 'check pass: follows the pass outcome to its node and narrates it', s.node === 'fx-two:gate' && /drop down on the far side\./.test(s.narration)
    && await page.evaluate(() => window.CYOA_GAME.state.checks.fx_fence.ok === true), s);
  await shot(page, '13_check_pass.png');
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
  check(b, 'the reception regression page carries no draft stamp and keeps its title', await page.evaluate(() => !document.getElementById('draftStamp')
    && document.title === 'Out of Order'));
  errorsAll = errorsAll.concat(errors);
  await page.close();
  ({ page, errors } = await open(context, url + '?nosave&seed=qa', FIX_APPROVED));
  await settle(page, false);
  check(b, 'an approved build of approved chapters shows no draft stamp (the stamp follows the storyboard, not code)', await page.evaluate(() => document.body.dataset.draft === 'false'
    && (!document.getElementById('draftStamp') || document.getElementById('draftStamp').style.display === 'none') && !/DRAFT/.test(document.title)));
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
  for (const name of (process.env.QA_BROWSERS || process.env.BROWSERS || 'chromium,firefox').split(',')) {
    try { await suite(name, base); } catch (e) { check(name, 'suite ran to the end', false, String(e.stack || e).slice(0, 800)); }
  }
  server.close();
  const passed = results.filter((r) => r.ok).length;
  fs.writeFileSync(path.join(__dirname, 'story_qa_results.json'), JSON.stringify({ suite: 'story-browser', passed, total: results.length, content: BASE.meta.contentHash, results }, null, 2) + '\n');
  console.log('story browser QA ' + passed + '/' + results.length + (passed === results.length ? ' passed' : ' FAILED'));
  process.exitCode = passed === results.length ? 0 : 1;
})();
