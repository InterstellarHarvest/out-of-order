#!/usr/bin/env node
// Presentation capabilities C1 / C2 in the game (storyboard docs/137; Nate approved 2026-11-24), Chromium + Firefox.
// Plays the shared fixture (fixtures/presentation_capabilities.js) built by tools/story-import and served in
// place of game/content/story.generated.js; no engine, UI or art file is touched by the suite.
//   C1  a text-led scene keeps the previous scene image: same scene art, never faded, also after a reload.
//   C2  a voice-led dialogue is on Narrative B: no portrait aperture, B shows NAME: "line", the spoken
//       echo follows on B, and the next portrait dialogue returns to the dialogue box with its portrait.
//   NODE_PATH="$(npm root -g)" node game/qa/run_presentation_qa.js      screenshots: game/qa/presentation_screenshots/
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const http = require('http');
const { createRequire } = require('module');
const ROOT = path.resolve(__dirname, '../..');
const { build } = require(path.join(ROOT, 'tools/story-import/import.js'));
const { fixture, writeFolder } = require('./fixtures/presentation_capabilities.js');
let playwright;
try { playwright = createRequire(__filename)('playwright'); } catch (e) {
  console.log('Playwright is not installed here: run with NODE_PATH="$(npm root -g)"');
  process.exit(2);
}
const SHOTS = path.join(__dirname, 'presentation_screenshots');
fs.mkdirSync(SHOTS, { recursive: true });

const results = [];
function check(browser, name, ok, detail) {
  results.push({ browser, name, ok: !!ok });
  if (!ok) console.log('FAIL [' + browser + '] ' + name, detail === undefined ? '' : JSON.stringify(detail).slice(0, 500));
}

const dir = writeFolder(fs.mkdtempSync(path.join(os.tmpdir(), 'cyoa-capabilities-')), fixture());
const BUILD = build({ from: dir });
fs.rmSync(dir, { recursive: true, force: true });
if (!BUILD.ok) { console.log('fixture does not build: ' + BUILD.report.errors.join(' | ')); process.exit(1); }

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

async function settle(page) {
  for (let k = 0; k < 12; k++) {
    await page.waitForFunction(() => {
      const p = document.body.dataset.phase;
      if (p === 'typing') window.CYOA_GAME.flow.skip();
      return p === 'choosing';
    }, null, { timeout: 20000, polling: 50 });
    const cont = await page.evaluate(() => { const c = window.CYOA_GAME.ui.cards; return c.length === 1 && c[0].id === '__continue'; });
    if (!cont) return;
    await page.evaluate(() => window.CYOA_GAME.flow.choose(0));
  }
}
async function take(page, id) {
  await settle(page);
  const i = await page.evaluate((x) => window.CYOA_GAME.ui.cards.findIndex((c) => c.id === x), id);
  if (i < 0) throw new Error('no card ' + id);
  await page.evaluate((n) => window.CYOA_GAME.flow.choose(n), i);
  await settle(page);
}
// What is on screen: scene art key + its lowest opacity since the last call, mode, portrait, B paragraphs, speech.
const look = (page) => page.evaluate(() => {
  const G = window.CYOA_GAME, sc = document.getElementById('scene'), pr = document.getElementById('portrait');
  const min = window.__sceneMin; window.__sceneMin = 1;
  return {
    sceneArt: sc.dataset.art, sceneMinOpacity: min, scene: document.body.dataset.scene, node: document.body.dataset.node,
    mode: document.body.dataset.mode, portraitShown: pr.style.display !== 'none' && pr.dataset.mode !== 'none',
    b: G.surfaces.info().b.paras.slice(), speechVisible: document.getElementById('speechText').style.visibility !== 'hidden',
    speechLines: (G.ui.speech && G.ui.speech.lines || []).map((l) => l.text)
  };
});

(async () => {
  const server = await startServer();
  const url = 'http://127.0.0.1:' + server.address().port + '/game/index.html';
  for (const name of ['chromium', 'firefox']) {
    const browser = await playwright[name].launch();
    const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
    // Track the scene aperture's lowest opacity between looks (a fade would dip below 1).
    await context.addInitScript(() => {
      window.__sceneMin = 1;
      const poll = () => { const s = document.getElementById('scene'); if (s && s.style.opacity !== '') window.__sceneMin = Math.min(window.__sceneMin, Number(s.style.opacity)); requestAnimationFrame(poll); };
      requestAnimationFrame(poll);
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.route('**/game/content/story.generated.js', (route) => route.fulfill({ status: 200, contentType: 'text/javascript', body: BUILD.text }));
    await page.goto(url + '?seed=qa&new');
    await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 30000 });
    await settle(page);
    let v = await look(page);
    check(name, 'boots on the ordinary scene', v.sceneArt === 'scene:loc/hall' && v.node === 'cap:open', v);

    await take(page, 'go');
    v = await look(page);
    check(name, 'C1: the text-led scene keeps the previous scene image', v.scene === 'loc/path' && v.sceneArt === 'scene:loc/hall', v);
    check(name, 'C1: the held scene image never fades', v.sceneMinOpacity === 1, v.sceneMinOpacity);
    check(name, 'C1: its narration is on Narrative B', v.mode === 'narrative' && v.b.some((t) => /never see/.test(t)), v);
    await page.screenshot({ path: path.join(SHOTS, name + '_1_text_led.png') });

    await take(page, 'on');
    v = await look(page);
    check(name, 'C2: a voice-led dialogue is on Narrative B with no portrait aperture', v.mode === 'narrative' && !v.portraitShown && !v.speechVisible && v.sceneArt === 'scene:loc/room', v);
    check(name, 'C2: the voice line is labelled on B: DOOR AI: "State your business."', v.b.some((t) => t.indexOf('DOOR AI: "State your business."') !== -1), v.b);
    check(name, 'C2: narration on B stays unlabelled', v.b.some((t) => t.indexOf('A panel lights up.') === 0), v.b);
    await page.screenshot({ path: path.join(SHOTS, name + '_2_voice_led.png') });

    await take(page, 'ask');
    v = await look(page);
    check(name, 'C2: the spoken echo and the next voice line follow on B', v.b.some((t) => t === '"PLEASE OPEN."') && v.b.some((t) => /DOOR AI: "Request logged\."/.test(t)) && v.b.some((t) => /"THANKS\."/.test(t) && !/YOU:/.test(t)), v.b);

    await take(page, 'clerk');
    v = await look(page);
    check(name, 'portrait dialogue after it: dialogue box with the portrait again', v.mode === 'dialogue' && v.portraitShown && v.speechVisible, v);
    check(name, 'an incidental voice inside a portrait dialogue keeps its dialogue-box label (docs/104 unchanged)', v.speechLines.indexOf('DOOR AI:') !== -1 && v.speechLines.some((t) => /Next, please\./.test(t)), v.speechLines);
    await page.screenshot({ path: path.join(SHOTS, name + '_3_portrait_after.png') });

    await take(page, 'leave');
    v = await look(page);
    check(name, 'C1: the text-led ending holds the room image', v.scene === 'loc/path' && v.sceneArt === 'scene:loc/room' && v.sceneMinOpacity === 1, v);
    await page.goto(url + '?seed=qa'); // a reload without ?new: the save is restored
    await page.waitForFunction(() => document.body.dataset.ready, null, { timeout: 30000 });
    await settle(page);
    v = await look(page);
    check(name, 'C1: after a reload the saved transcript holds the same image', v.node === 'cap:exit' && v.sceneArt === 'scene:loc/room', v);
    const notes = await page.evaluate(() => window.CYOA_GAME.state.transcript.filter((t) => t.mode === 'narrative').map((t) => window.CYOA_GAME.narrationText(t.runs)));
    check(name, 'NOTES / B text keeps every voice label', notes.join(' ').split('DOOR AI: "').length - 1 === 2, notes);
    check(name, 'no page errors', !errors.length, errors);
    await browser.close();
  }
  server.close();
  const failed = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(__dirname, 'presentation_qa_results.json'), JSON.stringify({ suite: 'presentation capabilities (docs/137 C1/C2)', passed: results.length - failed.length, total: results.length, results }, null, 2) + '\n');
  console.log('presentation capabilities in the game: ' + (results.length - failed.length) + '/' + results.length + ' passed (screenshots: ' + path.relative(ROOT, SHOTS) + ')');
  process.exit(failed.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
