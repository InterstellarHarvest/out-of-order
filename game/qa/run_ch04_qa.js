#!/usr/bin/env node
// Browser acceptance of Chapter 4 and the Form 27B-6 chapter transition (game issue #27, docs/107), in the real
// game, Chromium and Firefox. Every save is a real playthrough (tools/review/build-review-starts.js, built from the
// QA route catalogue with real dice): no invented inventory, flags or rolls.
//
//   printer      Chapter 3 -> 4: the printer plays once at the boundary (after the ending's CONTINUE), the five
//                encountered chapters with canonical titles, Chapter 4 on the joined second sheet, ~9.68 s; one step
//   skip         Escape and a pointer press complete it at once, exactly once; nothing is stepped or saved again
//   reload       a reload mid-printer lands in Chapter 4 with its text, no replay and no second step
//   newgame      a new game prints only the Prologue (no cross-out or advance), shorter; Enter skips
//   reduced      prefers-reduced-motion: the printer still completes; one step
//   checkpoint   CHECKPOINT after a Chapter 4 death restores the chapter entry without the printer
//   inspect      the bridal door's INSPECT opens the approved square image; X / Escape return to the same Focus A
//                node, cards, state and save
//   beats        conditional art appears when its authored words are typed: Lot 61, the water, the restroom burst
//   fatal        each of the four Chapter 4 deaths opens its popup with its approved art and RETRY
//   scale        the printer covers exactly the stage at 1920x1080 and 1280x720
//   NODE_PATH=<playwright install> node game/qa/run_ch04_qa.js
// Writes game/qa/ch04_qa_results.json and game/qa/ch04_screenshots/ (not committed).
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');
const { createRequire } = require('module');
const ROOT = path.resolve(__dirname, '../..');
let pw;
try { pw = createRequire(__filename)('playwright'); } catch (_) { console.error('Playwright required; set NODE_PATH to its installation directory'); process.exit(2); }
const OUT = path.join(__dirname, 'ch04_screenshots');
fs.mkdirSync(OUT, { recursive: true });
execFileSync(process.execPath, [path.join(ROOT, 'tools/review/build-review-starts.js')], { stdio: 'ignore' });
const box = {};
vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'tools/review/review-starts.generated.js'), 'utf8'), { window: box });
const START = Object.fromEntries(box.REVIEW_STARTS.starts.map((s) => [s.id, s]));
const results = [];
function check(browser, scenario, name, ok, detail) {
  results.push({ browser, scenario, name, ok: !!ok });
  if (!ok) console.error('FAIL [' + browser + ' / ' + scenario + '] ' + name + (detail === undefined ? '' : ' ' + JSON.stringify(detail).slice(0, 700)));
}
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(res);
});

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r));
  const BASE = 'http://127.0.0.1:' + server.address().port;
  const KEY = 'cyoa-save:' + box.REVIEW_STARTS.story;
  for (const name of ['chromium', 'firefox']) {
    const browser = await pw[name].launch();
    const errs = [];
    const page0 = async (opts) => {
      const ctx = await browser.newContext(Object.assign({ viewport: { width: 1280, height: 720 } }, opts || {}));
      const page = await ctx.newPage();
      page.on('pageerror', (e) => errs.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
      return { ctx, page };
    };
    const load = async (page, id, query) => {
      await page.goto(BASE + '/game/index.html?nosave');
      await page.evaluate(([k, v]) => { localStorage.clear(); if (v) localStorage.setItem(k, v); }, [KEY, id ? START[id].save : null]);
      await page.goto(BASE + '/game/index.html' + (query || ''));
      await page.waitForFunction(() => ['true', 'error'].includes(document.body.dataset.ready), null, { timeout: 60000 });
    };
    const choosing = (page) => page.waitForFunction(() => document.body.dataset.phase === 'choosing' && !document.getElementById('printTransition'), null, { timeout: 90000 });
    const settle = async (page) => { await choosing(page); };
    const take = (page, inp) => page.evaluate((n) => { const G = window.CYOA_GAME; if (n.choice) G.flow.choose(G.ui.cards.findIndex((c) => c.id === n.choice)); else { G.flow.toggleInspect(n.item); G.flow.utility(n.verb); } }, inp);
    const st = (page) => page.evaluate(() => ({ steps: window.CYOA_GAME.state.steps, chapter: window.CYOA_GAME.state.chapter, node: window.CYOA_GAME.state.node,
      printer: document.body.dataset.printer || null, count: +(document.body.dataset.printerCount || 0) }));
    const B = name;
    let { ctx, page } = await page0();

    // printer ------------------------------------------------------------------------------------------
    await load(page, 'ch3-presenter_help_end-pass'); await settle(page);
    const s0 = await st(page);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!document.getElementById('printTransition'), null, { timeout: 15000 });
    const t0 = Date.now();
    const cur = await page.evaluate(() => window.CYOA_GAME.chapterTransition.current());
    const pages = await page.evaluate(() => document.querySelectorAll('#printTransition .paper-page').length);
    const imgs = await page.evaluate(() => Array.from(document.querySelectorAll('#printTransition img')).map((i) => [i.getAttribute('src').replace(/^.*\/art\//, 'art/'), i.naturalWidth, i.naturalHeight]));
    const mid = await st(page);
    await page.waitForTimeout(5200);
    await page.screenshot({ path: path.join(OUT, B + '-printer-hold.png') });
    await page.waitForFunction(() => !document.getElementById('printTransition'), null, { timeout: 20000 });
    const dur = (Date.now() - t0) / 1000;
    const s1 = await st(page);
    const titles = cur.rows.map((r) => r.number + ' ' + r.title).join(' | ');
    check(B, 'printer', 'plays at the Chapter 3 -> 4 boundary after the ending CONTINUE, once, with one committed step', mid.steps === s0.steps + 1 && s1.steps === s0.steps + 1 && s1.chapter === 'chapter-04' && s1.count === 1 && s1.printer === 'done', { s0, mid, s1 });
    check(B, 'printer', 'rows: the five encountered chapters, canonical titles ([..] note stripped, comma omitted)', cur.scenario === 4
      && titles === "00 THE LAST GOOD DAY | 01 HOUSE OF TOMORROW | 02 BIOLOGY PARK - YOUR NATURE IS REQUIRED | 03 THE PEOPLE'S PAVILION - ONE EXPERIENCE PER PERSON | 04 SOMETHING OLD SOMETHING SOLD", titles);
    check(B, 'printer', 'Chapter 4 is typed on a joined second copy of the approved sheet; the approved PNGs at their native sizes', pages === 2
      && imgs.filter((i) => i[0] === 'art/ui/chapter_transition/form-27b6-blank-v01.png' && i[1] === 1024 && i[2] === 1536).length === 2
      && imgs.filter((i) => i[0] === 'art/ui/chapter_transition/printer-slot-v01.png' && i[1] === 2172 && i[2] === 724).length === 2, imgs);
    check(B, 'printer', 'the selected timing: 9.68 s plan, played in 9.6-11 s', Math.abs(cur.total - 9.68) < 0.001 && dur > 9.6 && dur < 11, { plan: cur.total, dur });
    await settle(page);

    // skip -----------------------------------------------------------------------------------------------
    for (const how of ['Escape', 'pointer']) {
      await load(page, 'ch3-door_reverse_end'); await settle(page);
      const a = await st(page);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => !!document.getElementById('printTransition'), null, { timeout: 15000 });
      await page.waitForTimeout(800);
      if (how === 'Escape') await page.keyboard.press('Escape'); else await page.mouse.click(640, 360);
      await page.waitForFunction(() => !document.getElementById('printTransition'), null, { timeout: 5000 });
      await page.keyboard.press('Escape'); // a second key after completion does nothing
      await settle(page);
      const b = await st(page);
      check(B, 'skip', how + ' completes the printer at once, exactly once, with no further step', b.printer === 'skipped' && b.count === 1 && b.steps === a.steps + 1 && b.chapter === 'chapter-04', { a, b });
    }

    // reload ---------------------------------------------------------------------------------------------
    await load(page, 'ch3-paper_problem_end'); await settle(page);
    const r0 = await st(page);
    await page.keyboard.press('Enter');
    await page.waitForFunction(() => !!document.getElementById('printTransition'), null, { timeout: 15000 });
    await page.waitForTimeout(2500);
    await page.reload();
    await page.waitForFunction(() => ['true', 'error'].includes(document.body.dataset.ready), null, { timeout: 60000 });
    const sawPrinter = await page.evaluate(() => !!document.getElementById('printTransition'));
    await settle(page);
    const r1 = await st(page);
    check(B, 'reload', 'a reload mid-printer lands in Chapter 4 with its text: no replay, no second step', !sawPrinter && r1.count === 0 && r1.chapter === 'chapter-04' && r1.steps === r0.steps + 1, { r0, r1, sawPrinter });

    // newgame --------------------------------------------------------------------------------------------
    await load(page, null, '?new');
    await page.waitForFunction(() => !!document.getElementById('printTransition'), null, { timeout: 15000 });
    const np = await page.evaluate(() => window.CYOA_GAME.chapterTransition.current());
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(OUT, B + '-newgame.png') });
    await page.keyboard.press('Enter');
    await settle(page);
    const n1 = await st(page);
    check(B, 'newgame', 'a new game prints only the Prologue, on the menu painting, without cross-out or advance (shorter); Enter skips; no step', np.scenario === 0 && np.rows.length === 1
      && np.rows[0].title === 'THE LAST GOOD DAY' && Math.abs(np.total - (9.68 - 0.6 - 0.75 - 1.2)) < 0.001 && n1.steps === 1 && n1.count === 1 && n1.chapter === 'prologue-00', { np, n1 });

    // inspect --------------------------------------------------------------------------------------------
    await load(page, 'ch4-bridal-door'); await settle(page);
    await take(page, START['ch4-bridal-door'].next); await settle(page);
    const before = await page.evaluate((k) => ({ s: JSON.stringify(window.CYOA_GAME.state), save: localStorage.getItem(k), cards: window.CYOA_GAME.ui.cards.map((c) => c.id).join(), util: window.CYOA_GAME.utilityActions()[0].action }), KEY);
    for (const close of ['Escape', 'x']) {
      await page.click('#util-0');
      await page.waitForTimeout(300);
      const open = await page.evaluate(() => ({ kind: document.getElementById('inspectArt').dataset.kind, w: document.getElementById('inspectImage').naturalWidth, h: document.getElementById('inspectImage').naturalHeight, cards: window.CYOA_GAME.ui.cards.length }));
      if (close === 'Escape') { await page.screenshot({ path: path.join(OUT, B + '-inspect.png') }); await page.keyboard.press('Escape'); } else await page.click('#inspectClose');
      await page.waitForTimeout(400);
      const after = await page.evaluate((k) => ({ s: JSON.stringify(window.CYOA_GAME.state), save: localStorage.getItem(k), cards: window.CYOA_GAME.ui.cards.map((c) => c.id).join(), open: !!window.CYOA_GAME.ui.inspector, node: document.body.dataset.node }), KEY);
      check(B, 'inspect', 'INSPECT opens the approved 565x451 square image; ' + close + ' returns to the same Focus A node, cards, state and save', before.util === 'inspect-view' && open.kind === 'inspect-view'
        && open.w === 565 && open.h === 451 && after.s === before.s && after.save === before.save && after.cards === before.cards && !after.open && after.node === 'chapter-04:hotel_bridal_door_focus', { open, same: after.s === before.s, save: after.save === before.save });
    }

    // beats ----------------------------------------------------------------------------------------------
    for (const [id, surface, want, beat] of [['ch4-lot61', 'scene', 'lot61_open', 'Two porters'], ['ch4-bixby', 'region', 'water', 'Water creeps'], ['ch4-restroom-burst', 'scene', 'restroom_active_leak', 'A violent jet']]) {
      await load(page, id); await settle(page);
      await take(page, START[id].next);
      const samples = [];
      for (let i = 0; i < 600; i++) {
        const v = await page.evaluate((sf) => {
          const G = window.CYOA_GAME;
          const art = sf === 'region' ? Array.from(document.querySelectorAll('#portrait [data-region]')).map((n) => n.dataset.art).join() : document.getElementById('scene').dataset.art;
          return { art, typed: G.surfaces.mode() ? G.surfaces.revealedNew() : G.speechRevealedNew(), phase: document.body.dataset.phase };
        }, surface);
        samples.push(v);
        if (v.phase === 'choosing') break;
        await page.waitForTimeout(50);
      }
      const shownAt = samples.findIndex((x) => x.art.indexOf(want) !== -1), beatAt = samples.findIndex((x) => x.typed.replace(/\s+/g, '').indexOf(beat.replace(/\s+/g, '')) !== -1);
      check(B, 'beats', id + ': ' + want + ' appears as "' + beat + '" is typed, never before', shownAt !== -1 && beatAt !== -1 && shownAt >= beatAt && shownAt <= beatAt + 2, { shownAt, beatAt, n: samples.length });
    }

    // fatal + checkpoint ---------------------------------------------------------------------------------
    for (const id of ['ch4-fatal-stall', 'ch4-fatal-boiler', 'ch4-fatal-lot61', 'ch4-fatal-gown']) {
      await load(page, id); await settle(page);
      await take(page, START[id].next);
      for (let i = 0; i < 60 && !(await page.evaluate(() => window.CYOA_GAME.endPresentation.isOpen())); i++) { await page.keyboard.press('Enter'); await page.waitForTimeout(250); }
      const pop = await page.evaluate(() => ({ open: window.CYOA_GAME.endPresentation.isOpen(), node: window.CYOA_GAME.state.chapter + ':' + window.CYOA_GAME.state.node, retry: window.CYOA_GAME.flow.restoreAvailable('retry'), checkpoint: window.CYOA_GAME.flow.restoreAvailable('checkpoint') }));
      await page.screenshot({ path: path.join(OUT, B + '-' + id + '.png') });
      check(B, 'fatal', id + ': its popup opens over the death with RETRY and CHECKPOINT available', pop.open && /^chapter-04:fatal_/.test(pop.node) && pop.retry && pop.checkpoint, pop);
      if (id === 'ch4-fatal-lot61') {
        const c0 = await st(page);
        await page.evaluate(() => window.CYOA_GAME.flow.restore('checkpoint'));
        await settle(page);
        const c1 = await st(page);
        check(B, 'checkpoint', 'CHECKPOINT restores the Chapter 4 entry without the printer', c1.chapter === 'chapter-04' && c1.node === 'hotel_entry_dispatch' && c1.count === c0.count && !(await page.evaluate(() => !!document.getElementById('printTransition'))), { c0, c1 });
      }
    }
    await ctx.close();

    // reduced + scale ------------------------------------------------------------------------------------
    for (const [label, opts] of [['reduced motion', { reducedMotion: 'reduce' }], ['1920x1080', { viewport: { width: 1920, height: 1080 } }]]) {
      ({ ctx, page } = await page0(opts));
      await load(page, 'chapter-02-end'); await settle(page);
      const a = await st(page);
      await page.keyboard.press('Enter');
      await page.waitForFunction(() => !!document.getElementById('printTransition'), null, { timeout: 15000 });
      const geo = await page.evaluate(() => { const o = document.getElementById('printTransition').getBoundingClientRect(), s = document.getElementById('stage').getBoundingClientRect(); return [o.left - s.left, o.top - s.top, o.width - s.width, o.height - s.height]; });
      await page.waitForTimeout(3500);
      await page.screenshot({ path: path.join(OUT, B + '-' + label.replace(/\W+/g, '-') + '.png') });
      await page.waitForFunction(() => !document.getElementById('printTransition'), null, { timeout: 20000 });
      await settle(page);
      const b = await st(page);
      check(B, label === '1920x1080' ? 'scale' : 'reduced', label + ': the Chapter 2 -> 3 printer covers exactly the stage and completes with one step', geo.every((d) => Math.abs(d) <= 1) && b.steps === a.steps + 1 && b.chapter === 'chapter-03' && b.printer === 'done', { geo, a, b });
      await ctx.close();
    }
    check(B, 'console', 'no page or console errors', errs.length === 0, errs.slice(0, 5));
    await browser.close();
  }
  server.close();
  const failed = results.filter((r) => !r.ok), by = {};
  results.forEach((r) => { by[r.scenario] = by[r.scenario] || { total: 0, passed: 0 }; by[r.scenario].total++; if (r.ok) by[r.scenario].passed++; });
  fs.writeFileSync(path.join(__dirname, 'ch04_qa_results.json'), JSON.stringify({ suite: 'ch04-browser', passed: results.length - failed.length, total: results.length, groups: by, results }, null, 1) + '\n');
  console.log('Chapter 4 + Form 27B-6 browser QA: ' + (results.length - failed.length) + '/' + results.length + (failed.length ? ' FAILED ' : ' passed ') + JSON.stringify(by));
  process.exitCode = failed.length ? 1 : 0;
})().catch((e) => { console.error(e); server.close(); process.exit(1); });
