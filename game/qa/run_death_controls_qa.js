#!/usr/bin/env node
// RETRY / CHECKPOINT / EXIT in the real game (docs/96; owner rulings on PR #11), Chromium and
// Firefox, 1920x1080, review gate on (?deathproof). Saves come from real tracked playthroughs
// (game/qa/tracked_routes.js: the same Rules.trackPoints the gated game runs). Every expected
// state is computed independently in Node with Rules, and compared with the game's own state, its
// autosave and the screen.
//   - RETRY: the exact pre-decision state in attempt 1, cards and scene of the chair, NOTES as
//     they stood; saved atomically; a reload restores it without a new attempt or a reroll; a
//     checked choice then rolls exactly the attempt-1 roll Rules predicts; dying again presents
//     again (once).
//   - CHECKPOINT: the exact Chapter 1 entry (Prologue inventory incl. the kept stapler once,
//     flags, NOTES), the arrival narration presented again, retry point dropped, attempt advanced;
//     replayed checks use the new attempt; reload reproduces.
//   - Shared popup, failed causes (docs/98; public docs/104): a failed stapler check and a failed
//     unarmed check open the same popup; the real cause (check id, ok:false) is kept; reload at
//     the death presents it again with the same cause; RETRY returns to the state before that
//     checked decision and the re-attempt rolls fresh (attempt 1) exactly as Rules predicts;
//     CHECKPOINT returns to the chapter entry, keeping the Prologue's state and results.
//   - EXIT: visibly unavailable (muted ink), explains the pending main menu, changes nothing.
//   - Compatibility: an old save (no points, no attempt) loads with the gate on: RETRY becomes
//     available from the fatal decision, CHECKPOINT shows unavailable; a tracked save loads with the
//     gate off and the ordinary game (BEGIN AGAIN) works, writing an ordinary save again.
// Writes game/qa/death_controls_qa_results.json and game/qa/death_controls_screenshots/.
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const { createRequire } = require('module');
const ROOT = path.resolve(__dirname, '../..');
const Rules = require('../js/rules.js');
const story = require('../content/story.generated.js').story;
const T = require('./tracked_routes.js');
let pw;
try { pw = createRequire(__filename)('playwright'); } catch (_) { console.error('Playwright required; set NODE_PATH to its installation directory'); process.exit(2); }
const OUT = path.join(__dirname, 'death_controls_screenshots');
fs.mkdirSync(OUT, { recursive: true });
const KEY = 'cyoa-save:' + story.id;
const J = (v) => JSON.stringify(v);
const strip = (s) => { const c = JSON.parse(J(s)); delete c.attempt; return c; };

const results = [];
function check(browser, scenario, name, ok, detail) {
  results.push({ browser, scenario, name, ok: !!ok });
  if (!ok) console.error('FAIL [' + browser + ' / ' + scenario + '] ' + name + (detail === undefined ? '' : ' ' + J(detail).slice(0, 700)));
}
function serve() {
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.png': 'image/png' };
  const server = http.createServer((req, res) => {
    const file = path.normalize(path.join(ROOT, decodeURIComponent(req.url.split('?')[0])));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'content-type': types[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}
async function settle(page, allowOpen) {
  for (let i = 0; i < 40; i++) {
    await page.waitForFunction((open) => {
      if (open && document.body.dataset.endPresentation) return true;
      const p = document.body.dataset.phase;
      if (p === 'typing') window.CYOA_GAME.flow.skip();
      return p === 'choosing';
    }, allowOpen, { timeout: 25000, polling: 40 });
    if (allowOpen && await page.evaluate(() => !!document.body.dataset.endPresentation)) return;
    const cont = await page.evaluate(() => window.CYOA_GAME.ui.cards.length === 1 && window.CYOA_GAME.ui.cards[0].id === '__continue');
    if (!cont) return;
    await page.evaluate(() => window.CYOA_GAME.flow.choose(0));
  }
  throw new Error('presentation CONTINUE never ended');
}
async function take(page, id) {
  await settle(page);
  const i = await page.evaluate((x) => window.CYOA_GAME.ui.cards.findIndex((c) => c.id === x), id);
  if (i < 0) throw new Error('no card ' + id + ' at ' + await page.evaluate(() => document.body.dataset.node));
  await page.evaluate((k) => window.CYOA_GAME.flow.choose(k), i);
  await settle(page, true);
}
const live = (page) => page.evaluate((k) => ({ state: window.CYOA_GAME.state, save: localStorage.getItem(k), node: document.body.dataset.node, open: !!document.body.dataset.endPresentation,
  cards: window.CYOA_GAME.ui.cards.map((c) => c.id), scene: document.getElementById('sceneArt').dataset.art, log: window.CYOA_GAME.endPresentation.log(),
  controls: Array.from(document.querySelectorAll('#endPresentation button')).map((b) => b.dataset.label + ':' + b.dataset.available), saveFlag: document.body.dataset.save }), KEY);
const click = (page, i) => page.mouse.click(570 + i * 270 + 120, 669 + 31);

async function run(name, base) {
  const browser = await pw[name].launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  async function scenario(id, save, query, fn) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('requestfailed', (r) => errors.push('request failed: ' + r.url()));
    const C = (n, ok, d) => check(name, id, n, ok, d);
    try {
      await page.goto(base + '/story/storyboard-manifest.json');
      await page.evaluate(([k, raw]) => { localStorage.clear(); localStorage.setItem(k, raw); }, [KEY, save]);
      await page.goto(base + '/game/index.html' + query);
      await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });
      await settle(page, true);
      await fn(page, C);
      C('no browser or console errors, no failed requests', !errors.length, errors);
    } catch (e) { C('scenario completed', false, e.stack || String(e)); }
    await page.close();
  }
  const shot = (page, f) => page.screenshot({ path: path.join(OUT, name + '_' + f + '.png') });
  const reload = async (page) => { await page.reload(); await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 }); await settle(page, true); };

  // 1. RETRY ---------------------------------------------------------------------------------------
  {
    const t = T.tracked(story, null, 3).steps(T.CHAIR);
    const pre = t.state;
    await scenario('retry', t.save(), '?deathproof', async (page, C) => {
      await take(page, 'accept_permanent_rest');
      let L = await live(page);
      C('voluntary death opens the presentation with RETRY and CHECKPOINT available, EXIT unavailable', L.open && L.controls.join() === 'RETRY:true,CHECKPOINT:true,EXIT:false', L.controls);
      const dead = L.state;
      await shot(page, '01_death_controls');
      await click(page, 0);
      await settle(page);
      L = await live(page);
      C('RETRY: back at chair_locked with its own cards and in-use chair art, presentation closed', !L.open && L.node === 'chapter-01:chair_locked'
        && L.cards.includes('accept_permanent_rest') && L.cards.includes('physical_chair_breakout') && L.scene === 'scene:house_of_tomorrow/chair', L);
      C('RETRY: exactly the state before the fatal choice (inventory, flags, marks, checks, NOTES, steps), in attempt 1', J(strip(L.state)) === J(pre) && L.state.attempt === 1);
      C('RETRY: the fatal step is gone (no extra NOTES, decision or item)', L.state.transcript.length === pre.transcript.length && L.state.taken.length === pre.taken.length
        && dead.transcript.length > pre.transcript.length && J(L.state.inventory) === J(pre.inventory));
      const env = JSON.parse(L.save);
      C('saved atomically: the autosave is the restored state with its points (checkpoint kept, retry = this decision)', J(env.state) === J(L.state) && env.points
        && env.points.checkpoint.state.node === 'house_arrival' && env.points.retry && env.points.retry.at === 'chapter-01:chair_locked');
      await shot(page, '02_after_retry');
      await reload(page);
      L = await live(page);
      C('reload after RETRY: same state, same attempt (no new attempt, no reroll), no presentation', J(L.state) === J(env.state) && L.state.attempt === 1 && !L.open && L.saveFlag === 'restored', L.saveFlag);
      // A checked choice now rolls the attempt-1 roll, exactly as Rules predicts.
      const want = Rules.step(story, L.state, { choice: 'physical_chair_breakout' }).state;
      await take(page, 'physical_chair_breakout');
      L = await live(page);
      C('the retried attempt rolls in its own namespace, exactly as Rules predicts (attempt 1)', J(L.state.checks.house_chair_unarmed) === J(want.checks.house_chair_unarmed)
        && L.state.checks.house_chair_unarmed.attempt === 1, L.state.checks);
      // docs/98: a failed check now reaches the SAME shared popup (public docs/104), its cause kept.
      const lastOpen = L.log.filter((x) => x.t === 'open').pop();
      C('consequences follow the fresh roll (failed: the shared popup with the failed-check cause; passed: the escape, no popup)',
        want.node === 'exit_chair_fatal' ? (L.node === 'chapter-01:exit_chair_fatal' && L.open && lastOpen.cause.check === 'house_chair_unarmed' && lastOpen.cause.ok === false)
          : (L.node === 'chapter-01:' + want.node && !L.open), { node: L.node, want: want.node, open: L.open });
    });
    // Dying voluntarily again after a RETRY presents again (a new attempt is a new ending).
    await scenario('retry_twice', t.save(), '?deathproof', async (page, C) => {
      await take(page, 'accept_permanent_rest');
      await click(page, 0);
      await settle(page);
      await take(page, 'accept_permanent_rest');
      let L = await live(page);
      C('voluntary death after RETRY opens the presentation again, once', L.open && L.log.filter((x) => x.t === 'open').length === 2 && L.state.attempt === 1, L.log);
      await click(page, 0);
      await settle(page);
      L = await live(page);
      C('a second RETRY: attempt 2 (never reused), same pre-decision state', L.state.attempt === 2 && J(strip(L.state)) === J(pre));
    });
  }

  // 2. CHECKPOINT ---------------------------------------------------------------------------------------
  {
    const t = T.tracked(story, 'red_stapler', 3).steps(T.STAPLER_CHAIR);
    const entry = t.points.checkpoint.state;
    await scenario('checkpoint', t.save(), '?deathproof', async (page, C) => {
      await take(page, 'accept_permanent_rest');
      await shot(page, '03_before_checkpoint');
      await click(page, 1);
      await settle(page);
      let L = await live(page);
      C('CHECKPOINT: the House arrival, presentation closed, arrival art', !L.open && L.node === 'chapter-01:house_arrival' && L.scene === 'scene:house_of_tomorrow/arrival', L.node);
      C('CHECKPOINT: exactly the Chapter 1 entry state (Prologue inventory with the kept stapler once, flags, NOTES), in a new attempt', J(strip(L.state)) === J(entry) && L.state.attempt === 1
        && L.state.inventory.filter((x) => x === 'red_stapler').length === 1);
      const typed = await page.evaluate(() => (document.getElementById('narration') || {}).dataset ? document.getElementById('narration').dataset.text : '');
      C('CHECKPOINT: the arrival narration is presented again (nothing from the abandoned chapter remains in it)', /ivory door/.test(typed) && !/RELAXATION/.test(typed), typed.slice(0, 120));
      const env = JSON.parse(L.save);
      C('saved atomically: checkpoint kept, retry point dropped', J(env.state) === J(L.state) && env.points.checkpoint && env.points.retry === null);
      await shot(page, '04_after_checkpoint');
      // Replay to the chair: recover the stapler, try it. The chair check rolls in attempt 1.
      for (const c of T.STAPLER_CHAIR.slice(T.STAPLER_CHAIR.indexOf('enter_show_home'))) await take(page, c);
      L = await live(page);
      const want = Rules.step(story, L.state, { choice: 'stapler_breakout' }).state;
      await take(page, 'stapler_breakout');
      L = await live(page);
      C('replayed chapter check: fresh attempt-1 roll exactly as Rules predicts; stapler still held once', J(L.state.checks.house_chair_stapler) === J(want.checks.house_chair_stapler)
        && L.state.checks.house_chair_stapler.attempt === 1 && L.state.inventory.filter((x) => x === 'red_stapler').length === 1, L.state.checks);
      await reload(page);
      const R2 = await live(page);
      C('reload after the replayed check: identical state and roll (no reroll)', J(R2.state.checks) === J(L.state.checks) && R2.state.attempt === 1 && R2.node === L.node);
    });
  }

  // 2b. Failed checked causes share the popup; RETRY / CHECKPOINT keep the real cause (docs/98) -------------
  {
    const failing = (item, chairPath, choice, checkId) => {
      for (let seed = 1; seed < 400; seed++) {
        const t = T.tracked(story, item, seed).steps(chairPath);
        const r = Rules.step(story, t.state, { choice });
        if (r.state.node === 'exit_chair_fatal' && r.state.checks[checkId] && r.state.checks[checkId].ok === false) return t;
      }
      throw new Error('no failing seed for ' + checkId);
    };
    const ts = failing('red_stapler', T.STAPLER_CHAIR, 'stapler_breakout', 'house_chair_stapler');
    const pre = ts.state;
    await scenario('stapler_failed_retry', ts.save(), '?deathproof', async (page, C) => {
      await take(page, 'stapler_breakout');
      let L = await live(page);
      const cause = L.log.filter((x) => x.t === 'open')[0];
      C('failed stapler check: the shared popup opens with RETRY and CHECKPOINT available, EXIT unavailable', L.open && L.node === 'chapter-01:exit_chair_fatal' && L.controls.join() === 'RETRY:true,CHECKPOINT:true,EXIT:false', L.controls);
      C('the popup keeps the real cause: stapler_breakout, check house_chair_stapler, ok:false (not the voluntary choice)', cause && cause.cause.choice === 'stapler_breakout'
        && cause.cause.check === 'house_chair_stapler' && cause.cause.ok === false && L.state.checks.house_chair_stapler.ok === false, cause);
      await shot(page, '06_stapler_failed_popup');
      await reload(page);
      L = await live(page);
      const again = L.log.filter((x) => x.t === 'open');
      C('save/reload at the death: the same state, the shared popup once again, the same failed-check cause', L.saveFlag === 'restored' && L.open && again.length === 1
        && J(again[0].cause) === J(cause.cause) && L.state.checks.house_chair_stapler.ok === false, again);
      await click(page, 0);
      await settle(page);
      L = await live(page);
      C('RETRY: exactly the state before the failed checked decision (stapler held once, no stapler check recorded), attempt 1', !L.open && L.node === 'chapter-01:chair_locked'
        && J(strip(L.state)) === J(pre) && L.state.attempt === 1 && !L.state.checks.house_chair_stapler && L.state.inventory.filter((x) => x === 'red_stapler').length === 1, L.node);
      const want = Rules.step(story, L.state, { choice: 'stapler_breakout' }).state;
      await take(page, 'stapler_breakout');
      L = await live(page);
      C('the re-attempted stapler check rolls fresh in attempt 1, exactly as Rules predicts, and its consequence follows', J(L.state.checks.house_chair_stapler) === J(want.checks.house_chair_stapler)
        && L.state.checks.house_chair_stapler.attempt === 1 && L.node === 'chapter-01:' + want.node && L.open === (want.node === 'exit_chair_fatal'), [L.state.checks.house_chair_stapler, want.node]);
      const R2 = await (async () => { await reload(page); return live(page); })();
      C('reload after the re-attempt: identical state and roll (no reroll, no new attempt)', J(R2.state.checks) === J(L.state.checks) && R2.state.attempt === 1 && R2.node === L.node);
    });
    const tu = failing(null, T.CHAIR, 'physical_chair_breakout', 'house_chair_unarmed');
    const entry = tu.points.checkpoint.state;
    await scenario('unarmed_failed_checkpoint', tu.save(), '?deathproof', async (page, C) => {
      await take(page, 'physical_chair_breakout');
      let L = await live(page);
      const cause = L.log.filter((x) => x.t === 'open')[0];
      C('failed unarmed check: the shared popup, cause physical_chair_breakout / house_chair_unarmed / ok:false', L.open && cause && cause.cause.choice === 'physical_chair_breakout'
        && cause.cause.check === 'house_chair_unarmed' && cause.cause.ok === false && L.controls.join() === 'RETRY:true,CHECKPOINT:true,EXIT:false', cause);
      await shot(page, '07_unarmed_failed_popup');
      await click(page, 1);
      await settle(page);
      L = await live(page);
      C('CHECKPOINT: the exact Chapter 1 entry in attempt 1; the Prologue\'s inventory, flags and check results kept; the chair check gone', !L.open && L.node === 'chapter-01:house_arrival'
        && J(strip(L.state)) === J(entry) && L.state.attempt === 1 && !L.state.checks.house_chair_unarmed, L.node);
      await reload(page);
      const R2 = await live(page);
      C('reload after CHECKPOINT: identical state, no new attempt', J(R2.state) === J(L.state) && R2.state.attempt === 1);
    });
  }

  // 3. EXIT ------------------------------------------------------------------------------------------------
  {
    const t = T.tracked(story, null, 4).steps(T.CHAIR);
    await scenario('exit', t.save(), '?deathproof', async (page, C) => {
      await take(page, 'accept_permanent_rest');
      const before = await live(page);
      const ink = await page.evaluate(() => { const c = document.getElementById('endControlLabel2'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; const set = new Set(); for (let i = 0; i < d.length; i += 4) if (d[i + 3]) set.add([d[i], d[i + 1], d[i + 2]].join()); return [...set]; });
      C('EXIT is visibly unavailable: muted ink #7d9189, aria-disabled, labelled as the pending main menu', ink.length === 1 && ink[0] === '125,145,137'
        && await page.evaluate(() => document.getElementById('endControl2').getAttribute('aria-disabled') === 'true'), ink);
      await click(page, 2);
      const after = await live(page);
      const msg = await page.evaluate(() => document.getElementById('endNotice').getAttribute('aria-label'));
      C('activating EXIT only explains it (no menu, no URL change, no restart, no save change)', /MAIN MENU, WHICH DOES NOT EXIST YET/.test(msg) && after.open && J(after.state) === J(before.state)
        && after.save === before.save && page.url().endsWith('/game/index.html?deathproof'), msg);
      await shot(page, '05_exit_unavailable');
    });
  }

  // 4. Save compatibility ------------------------------------------------------------------------------
  {
    // An old save (written before this change: no points, no attempt) at the chair.
    const s = T.tracked(story, null, 5).steps(T.CHAIR).state;
    const old = Rules.serialize(story, s, { presented: s.transcript.length });
    await scenario('old_save_gate_on', old, '?deathproof', async (page, C) => {
      let L = await live(page);
      C('an old save loads unchanged with the gate on', L.saveFlag === 'restored' && J(L.state) === J(s));
      await take(page, 'accept_permanent_rest');
      L = await live(page);
      C('RETRY becomes available from the fatal decision itself; CHECKPOINT is unavailable (no chapter-entry snapshot in an old save)', L.open && L.controls.join() === 'RETRY:true,CHECKPOINT:false,EXIT:false', L.controls);
      await click(page, 1);
      const msg = await page.evaluate(() => document.getElementById('endNotice').getAttribute('aria-label'));
      C('the unavailable CHECKPOINT explains itself and changes nothing', /CHECKPOINT UNAVAILABLE - NO CHAPTER-ENTRY SNAPSHOT/.test(msg) && (await live(page)).open);
      await click(page, 0);
      await settle(page);
      L = await live(page);
      C('RETRY works from an old save: exact pre-decision state, attempt 1', J(strip(L.state)) === J(s) && L.state.attempt === 1);
    });
    const t = T.tracked(story, null, 6).steps(T.CHAIR);
    t.step('accept_permanent_rest');
    t.restore('retry');
    await scenario('tracked_save_gate_off', t.save(), '', async (page, C) => {
      let L = await live(page);
      C('a tracked save (points + attempt 1) loads with the gate off, unchanged', L.saveFlag === 'restored' && J(L.state) === J(t.state) && L.state.attempt === 1);
      await take(page, 'accept_permanent_rest');
      L = await live(page);
      const env = JSON.parse(L.save);
      C('gate off: no presentation; the authored ending with only BEGIN AGAIN; the save written as an ordinary one (no points)', !L.open && L.cards.join() === 'restart_chair_death' && env.points === undefined, L.cards);
      await take(page, 'restart_chair_death');
      L = await live(page);
      C('gate off: BEGIN AGAIN restarts the whole playthrough (Prologue, empty inventory, no attempt)', /^prologue-00:/.test(L.node) && L.state.inventory.length === 0 && L.state.attempt === undefined, L.node);
    });
  }
  // 5. Gate off from a fresh game: no tracking, ordinary saves. -------------------------------------------
  {
    const s = T.tracked(story, null, 8).steps(T.CHAIR).state;
    await scenario('gate_off_fresh', Rules.serialize(story, s, { presented: s.transcript.length }), '', async (page, C) => {
      await take(page, 'accept_permanent_rest');
      const L = await live(page);
      C('gate off: no tracking at all: the save has no points and no attempt', !/"points"/.test(L.save) && !/"attempt"/.test(L.save) && !L.open);
      const restored = await page.evaluate(() => window.CYOA_GAME.flow.restoreAvailable('retry') || window.CYOA_GAME.flow.restoreAvailable('checkpoint') || window.CYOA_GAME.flow.restore('retry'));
      C('gate off: restore is not available at all', restored === false);
    });
  }
  await context.close();
  await browser.close();
}

(async () => {
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  const browsers = (process.env.BROWSERS || 'chromium,firefox').split(',');
  try { for (const b of browsers) await run(b, base); } finally { server.close(); }
  const failed = results.filter((x) => !x.ok);
  const by = {};
  results.forEach((r) => { by[r.browser] = by[r.browser] || [0, 0]; by[r.browser][1]++; if (r.ok) by[r.browser][0]++; });
  console.log('Death controls in the browser: ' + (results.length - failed.length) + '/' + results.length + ' passed (' + Object.keys(by).map((b) => b + ' ' + by[b][0] + '/' + by[b][1]).join(', ') + ')');
  fs.writeFileSync(path.join(__dirname, 'death_controls_qa_results.json'), J({ passed: results.length - failed.length, total: results.length, results }, null, 1) + '\n');
  if (failed.length) process.exitCode = 1;
})().catch((e) => { console.error(e.stack || String(e)); process.exitCode = 1; });
