#!/usr/bin/env node
// Browser acceptance of the imported Biology Park (Chapter 2), Chromium + Firefox:
//   NODE_PATH=<playwright> node game/qa/run_ch02_routes_qa.js
// Saves come from real Prologue -> House playthroughs on fixed seeds (game/qa/ch02_routes.js), so
// every roll in the browser is the real roll. Plays through the production UI:
//   - the five surviving House exits: their CONTINUE card into Chapter 2, the route-dependent Bureau
//     arrival, then a full Chapter 2 route to its ending (state compared with the rules walk);
//   - item sacrifices, fatal endings, the silent versus the talking Courtesy Conductor;
//   - the Scene Pickup Inspector at all three supply sources: environmental INSPECT opens the
//     565x451 inspector with no Focus A cards ever on screen, READ LABEL, USE ANTIDOTE, close by X
//     and by Escape (exactly one injector + the item slip), reload inside and after the kit (no
//     duplicate, no re-collection), and USE from the ordinary inventory inspector.
// Writes qa/ch02_route_results_browser.json and screenshots in qa/ch02_route_screenshots/.
'use strict';
const fs = require('fs');
const http = require('http');
const path = require('path');
const { createRequire } = require('module');
const R = require('./ch02_routes.js');
const Rules = R.Rules;
const story = require('../content/story.generated.js').story;
let pw;
try { pw = createRequire(__filename)('playwright'); } catch (_) { console.error('Playwright required; set NODE_PATH to its installation directory'); process.exit(2); }
const ROOT = path.resolve(__dirname, '../..');
const OUT = path.join(__dirname, 'ch02_route_screenshots');
fs.mkdirSync(OUT, { recursive: true });
const SAVE_KEY = 'cyoa-save:' + story.id;
const results = [];
function check(browser, scenario, name, ok, detail) {
  results.push({ browser, scenario, name, ok: !!ok });
  if (!ok) console.error('FAIL [' + browser + ' / ' + scenario + '] ' + name, JSON.stringify(detail === undefined ? '' : detail).slice(0, 700));
}
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const route = (name) => R.ROUTES.concat(R.KIT_ROUTES).find((r) => r.name === name);
const save = (s) => Rules.serialize(story, s, { presented: s.transcript.length });

// Scenarios ------------------------------------------------------------------------------------------
// Full routes from the House exit (the CONTINUE card is taken in the browser).
const FULL = [
  { route: 'review_tower_trace_courier_carry', handoff: true },
  { route: 'reserve_spur_silent_station', handoff: true, robot: false },
  { route: 'reserve_spur_robot_concourse', handoff: true, robot: true },
  { route: 'tram_brake_forest_thorn_infected_appeal_pass', handoff: true },
  { route: 'equipment_interlock_registered', handoff: true },
  { route: 'stapler_jam_fail_sorter_escape', sacrificed: 'red_stapler' },
  { route: 'stapler_jam_fail_sorter_fatal', sacrificed: 'red_stapler' },
  { route: 'hopper_fatal' },
  { route: 'director_badge_tower_cease_maintenance', gained: 'acting_director_badge' },
  { route: 'staple_loop_fail_late_tower_contaminated_archive' },
  { route: 'clicker_jam', sacrificed: 'timing_clicker' }
].map((x) => Object.assign(x, { r: route(x.route), f: R.findSeed(story, route(x.route)) }));
// Antidote kits: saves stand at the exit with the closed kit (infected), then the UI does the rest.
const KITS = [
  { route: 'kit_public_take_spore_cured', close: 'x', read: true },
  { route: 'kit_maintenance_take_thorn_not_cured', close: 'escape', read: false },
  { route: 'kit_customs_take_spore_not_cured', close: 'escape', read: true },
  { route: 'kit_public_direct_spore_not_cured', direct: true },
  { route: 'kit_maintenance_direct_spore_cured', direct: true },
  { route: 'kit_customs_read_spore_cured', direct: true, read: true }
].map((x) => {
  const r = route(x.route), f = R.findSeed(story, r), k = R.KIT[r.kit];
  const i = r.steps.indexOf(k.open);
  return Object.assign(x, { r, f, k, pre: R.stepAll(story, f.entry, r.steps.slice(0, i)) });
});
[...FULL, ...KITS].forEach((x) => { if (!x.f) throw new Error('no seed for ' + x.route); });

// Browser helpers --------------------------------------------------------------------------------
async function settle(page) {
  for (let i = 0; i < 60; i++) {
    await page.waitForFunction(() => {
      const p = document.body.dataset.phase;
      if (p === 'typing') window.CYOA_GAME.flow.skip();
      return p === 'choosing';
    }, null, { timeout: 30000, polling: 40 });
    const cont = await page.evaluate(() => !window.CYOA_GAME.ui.inspector && window.CYOA_GAME.ui.cards.length === 1 && window.CYOA_GAME.ui.cards[0].id === '__continue');
    if (!cont) return;
    await page.evaluate(() => window.CYOA_GAME.flow.choose(0));
  }
  throw new Error('presentation continuation never ended');
}
async function take(page, id) {
  await settle(page);
  const idx = await page.evaluate((x) => window.CYOA_GAME.ui.cards.findIndex((c) => c.id === x), id);
  if (idx < 0) throw new Error('no card ' + id + ' at ' + await page.evaluate(() => document.body.dataset.node + ' ' + window.CYOA_GAME.ui.cards.map((c) => c.id)));
  await page.evaluate((i) => window.CYOA_GAME.flow.choose(i), idx);
}
const snapshot = (page) => page.evaluate(() => JSON.parse(JSON.stringify({ s: window.CYOA_GAME.state, cards: window.CYOA_GAME.ui.cards.map((c) => c.id),
  mode: document.body.dataset.mode, node: document.body.dataset.node, log: window.CYOA_GAME.ui.noticeLog,
  pickup: window.CYOA_GAME.ui.inspector && window.CYOA_GAME.ui.inspector.scenePickup ? window.CYOA_GAME.ui.inspector.scenePickup.id : null,
  inspectorItem: window.CYOA_GAME.ui.inspector ? window.CYOA_GAME.ui.inspector.id : null })));
// Records every frame in which a Focus A proxy card (any pickup's own read/use/close card) is on screen.
const PROXY = new Set(Object.values(R.KIT).flatMap((k) => [k.read, k.direct, k.close, k.afterRead, k.closeRead]));
async function watchProxy(page) {
  await page.evaluate((ids) => {
    window.__proxyFrames = 0;
    const set = new Set(ids);
    (function tick() {
      if (window.CYOA_GAME.ui.cards.some((c) => set.has(c.id))) window.__proxyFrames++;
      requestAnimationFrame(tick);
    })();
  }, [...PROXY]);
}
async function waitPickup(page, node) {
  await page.waitForFunction((n) => {
    const G = window.CYOA_GAME;
    if (document.body.dataset.phase === 'typing') G.flow.skip();
    if (!G.ui.inspector && G.ui.cards.length === 1 && G.ui.cards[0].id === '__continue' && document.body.dataset.phase === 'choosing') G.flow.choose(0);
    return G.state.node === n && G.ui.inspector && G.ui.inspector.scenePickup && document.body.dataset.phase === 'choosing';
  }, node, { timeout: 30000, polling: 30 });
}
async function utility(page, action) {
  const i = await page.evaluate((a) => [0, 1, 2].find((k) => document.getElementById('util-' + k).dataset.action === a), action);
  if (i === undefined) throw new Error('no utility button ' + action);
  await page.click('#util-' + i);
}
async function load(page, base, raw) {
  await page.goto(base + '/story/storyboard-manifest.json');
  await page.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE_KEY, raw]);
  await page.goto(base + '/game/index.html');
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });
}
async function reload(page, base) {
  await page.goto(base + '/game/index.html');
  await page.waitForFunction(() => document.body.dataset.ready === 'true', null, { timeout: 30000 });
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

async function full(b, page, base, x) {
  const { r, f } = x;
  await load(page, base, save(f.exit));
  await settle(page);
  let snap = await snapshot(page);
  check(b, x.route, 'save loads on the House exit ' + f.exit.node + ' with one CONTINUE card', snap.s.node === f.exit.node && same(snap.cards, Rules.view(story, f.exit).cards.map((c) => c.id)), snap.cards);
  await take(page, snap.cards[0]);
  await settle(page);
  snap = await snapshot(page);
  const arrivalText = snap.s.transcript.slice(f.exit.transcript.length).map((e) => e.runs.map((q) => q.text).join(' ')).join('\n');
  const want = f.exit.flags.equipment_registered ? R.ARRIVAL.registered : R.ARRIVAL[f.exit.flags.house_exit_route];
  check(b, x.route, 'House exit -> Chapter 2 Bureau with the route-dependent arrival (' + f.exit.flags.house_exit_route + ')',
    snap.s.chapter === 'chapter-02' && /bureau_arrival|bureau_emergency/.test(snap.s.node) && want.test(arrivalText), { node: snap.s.node, arrivalText: arrivalText.slice(0, 200) });
  check(b, x.route, 'inventory, flags, checks and NOTES carried through the transition', same(snap.s.inventory, f.exit.inventory) && same(snap.s.flags, f.exit.flags)
    && same(snap.s.checks, f.exit.checks) && same(snap.s.transcript.slice(0, f.exit.transcript.length), f.exit.transcript));
  const modes = [];
  for (const st of r.steps) {
    await settle(page);
    const m = await page.evaluate(() => [document.body.dataset.node, document.body.dataset.mode]);
    modes.push(m);
    await take(page, st);
  }
  await settle(page);
  snap = await snapshot(page);
  modes.push([snap.node, snap.mode]);
  check(b, x.route, 'production UI reaches ' + r.end, snap.s.node === r.end, snap.s.node);
  check(b, x.route, 'inventory, flags and check outcomes equal the independent rules walk', same(snap.s.inventory, f.end.inventory) && same(snap.s.flags, f.end.flags) && same(snap.s.checks, f.end.checks),
    { ui: [snap.s.inventory, snap.s.checks], rules: [f.end.inventory, f.end.checks] });
  check(b, x.route, 'NOTES from Prologue and House retained to the end', same(snap.s.transcript.slice(0, f.exit.transcript.length), f.exit.transcript));
  // Since Chapter 3 integration (docs/104) a living ending's one card is its CONTINUE into Chapter 3; a fatal
  // ending is unchanged (its one card is the system BEGIN AGAIN).
  if (story.chapters['chapter-02'].nodes[r.end].end === true) check(b, x.route, 'fatal ending shows only BEGIN AGAIN (unchanged by Chapter 3)', snap.cards.length === 1 && Rules.view(story, snap.s).cards[0].kind === 'system', snap.cards);
  else check(b, x.route, 'living ending shows only CONTINUE into Chapter 3', snap.cards.length === 1 && Rules.view(story, snap.s).cards[0].kind === 'continue'
    && story.chapters['chapter-02'].nodes[r.end].choices[0].chapter === 'chapter-03', snap.cards);
  if (x.sacrificed) check(b, x.route, x.sacrificed + ' held on entry and never back after its sacrifice', f.exit.inventory.includes(x.sacrificed) && !snap.s.inventory.includes(x.sacrificed));
  if (x.gained) check(b, x.route, 'the physical ' + x.gained + ' arrived with an item slip', snap.s.inventory.includes(x.gained) && snap.log.includes(x.gained), snap.log);
  if (x.robot !== undefined) {
    const talked = modes.some(([n, m]) => n === 'chapter-02:robot_concourse_crash' && m === 'dialogue');
    check(b, x.route, x.robot ? 'Courtesy Conductor speaks in dialogue mode after the successful roll' : 'Courtesy Conductor stays dark: no dialogue, underground station',
      x.robot ? talked && snap.s.flags.tram_crash_liability === true : !talked && !modes.some(([n]) => n === 'chapter-02:robot_concourse_crash') && snap.s.flags.tram_satisfaction_certified === true, modes.slice(-6));
  }
}

async function kit(b, page, base, x) {
  const { r, f, k, pre } = x;
  let proxyBefore = 0;
  await load(page, base, save(pre));
  await settle(page);
  let snap = await snapshot(page);
  check(b, x.route, 'stands at ' + k.at + ', infected, with the closed kit offered as an environmental INSPECT card', snap.s.node === k.at && snap.cards.includes(k.open)
    && !!(pre.flags.spore_infected || pre.flags.thorn_infected) && !snap.s.inventory.includes(k.item), snap.cards);
  await watchProxy(page);
  await take(page, k.open);
  await waitPickup(page, k.focus);
  snap = await snapshot(page);
  // docs/103: the pickup window shows the approved Focus A close-up (native 564x278, 1:1) over its 565x451 fill.
  const geo = await page.evaluate(() => { const a = document.querySelector('#inspectArt[data-kind="scene-pickup-art"]'); const c = a && a.querySelector('canvas'); const i = a && a.querySelector('img');
    return c && i && !document.querySelector('[data-kind="scene-pickup-placeholder"]') ? [c.width, c.height, i.naturalWidth, i.naturalHeight, i.width, i.height] : null; });
  check(b, x.route, 'INSPECT opens the 565x451 scene-pickup inspector over the open kit, no item granted', snap.pickup === k.focus.replace('_focus', '').replace('public_kit', 'public_antidote_box')
    || (snap.pickup && /antidote|kit|dispenser|locker|box/.test(snap.pickup)), snap.pickup);
  check(b, x.route, 'inspector art area is the 565x451 window holding the approved Focus A close-up at native 564x278 (no placeholder)', same(geo, [565, 451, 564, 278, 564, 278]), geo);
  check(b, x.route, 'opening the kit added nothing to the inventory', !snap.s.inventory.includes(k.item) && !snap.log.includes(k.item));
  const util = await page.evaluate(() => [0, 1, 2].map((i) => document.getElementById('util-' + i).dataset.action + ':' + document.getElementById('util-' + i).getAttribute('aria-disabled')));
  check(b, x.route, 'the three utility buttons are READ LABEL / USE ANTIDOTE / blank', same(util, ['pickup-read:false', 'pickup-use:false', 'none:true']), util);
  if (x.read) {
    await utility(page, 'pickup-read');
    await waitPickup(page, k.readFocus);
    snap = await snapshot(page);
    const t = snap.s.transcript.slice(-3).map((e) => e.runs.map((q) => q.text).join(' ')).join(' ');
    check(b, x.route, 'READ LABEL reveals the expiry ' + k.expiry + ' in the same inspector; READ is then spent', new RegExp('EXPIRATION: ' + k.expiry).test(t)
      && (await page.evaluate(() => document.getElementById('util-0').getAttribute('aria-disabled'))) === 'true', t.slice(0, 200));
    await page.screenshot({ path: path.join(OUT, b + '_' + x.route + '_label.png') });
  } else {
    await page.screenshot({ path: path.join(OUT, b + '_' + x.route + '_open.png') });
  }
  if (x.direct) {
    await utility(page, 'pickup-use');
    await settle(page);
    snap = await snapshot(page);
    check(b, x.route, 'USE ANTIDOTE resolves the authored check without any pickup', snap.s.node === k.at && !snap.s.inventory.includes(k.item) && !snap.log.includes(k.item)
      && !!snap.s.checks[x.read ? k.readCheck : k.directCheck], { node: snap.s.node, checks: Object.keys(snap.s.checks).filter((c) => /kit|use/.test(c)) });
  } else {
    if (x.close === 'x') await page.click('#inspectClose'); else await page.keyboard.press('Escape');
    await settle(page);
    snap = await snapshot(page);
    check(b, x.route, 'closing (' + x.close + ') returns to the exit with exactly one ' + k.item + ' and one item slip', snap.s.node === k.at
      && snap.s.inventory.filter((i) => i === k.item).length === 1 && snap.log.filter((i) => i === k.item).length === 1, { inv: snap.s.inventory, log: snap.log });
    await page.screenshot({ path: path.join(OUT, b + '_' + x.route + '_taken.png') });
    proxyBefore += await page.evaluate(() => window.__proxyFrames);
    await reload(page, base);
    await watchProxy(page);
    await settle(page);
    snap = await snapshot(page);
    check(b, x.route, 'after reload: still exactly one injector, the kit cannot be opened again', snap.s.inventory.filter((i) => i === k.item).length === 1 && !snap.cards.includes(k.open), snap.cards);
    // Ordinary inventory: inspect, then USE.
    await page.evaluate((id) => window.CYOA_GAME.flow.toggleInspect(id), k.item);
    await page.waitForFunction((id) => window.CYOA_GAME.ui.inspector && window.CYOA_GAME.ui.inspector.id === id && !window.CYOA_GAME.ui.inspector.scenePickup, k.item);
    await utility(page, 'use');
    await settle(page);
    snap = await snapshot(page);
    check(b, x.route, 'USE from the inventory inspector consumes the dose and resolves its own check', !snap.s.inventory.includes(k.item) && !!snap.s.checks[k.useCheck], snap.s.inventory);
  }
  const still = !!(snap.s.flags.spore_infected || snap.s.flags.thorn_infected);
  check(b, x.route, r.cure ? 'success clears both infection flags' : 'failure leaves the infection unchanged', r.cure ? !still : still === true, snap.s.flags);
  check(b, x.route, 'the kit is spent: no INSPECT card on return', !snap.cards.includes(k.open), snap.cards);
  await take(page, k.leave);
  await settle(page);
  snap = await snapshot(page);
  check(b, x.route, 'the whole kit route ends exactly like the rules walk', snap.s.node === r.end && same(snap.s.inventory, f.end.inventory) && same(snap.s.flags, f.end.flags) && same(snap.s.checks, f.end.checks),
    { ui: [snap.s.node, snap.s.inventory, snap.s.checks], rules: [f.end.node, f.end.inventory, f.end.checks] });
  check(b, x.route, 'no Focus A proxy card was ever drawn', proxyBefore + (await page.evaluate(() => window.__proxyFrames)) === 0);
}

// Reload while the inspector is open: it reopens over the same kit, with nothing granted.
async function reloadInside(b, page, base) {
  const x = KITS[0];
  const atFocus = R.stepAll(story, x.pre, [x.k.open]);
  await load(page, base, save(atFocus));
  await waitPickup(page, x.k.focus);
  let snap = await snapshot(page);
  check(b, 'reload_inside_kit', 'a save inside the open kit reopens the scene inspector, no injector granted', !!snap.pickup && !snap.s.inventory.includes(x.k.item));
  await reload(page, base);
  await waitPickup(page, x.k.focus);
  await page.keyboard.press('Escape');
  await settle(page);
  snap = await snapshot(page);
  check(b, 'reload_inside_kit', 'closing after the reload still gives exactly one injector', snap.s.inventory.filter((i) => i === x.k.item).length === 1 && !snap.cards.includes(x.k.open));
  await reload(page, base);
  await settle(page);
  snap = await snapshot(page);
  check(b, 'reload_inside_kit', 'a second reload neither duplicates nor removes it', snap.s.inventory.filter((i) => i === x.k.item).length === 1);
}

async function run(b, base) {
  const browser = await pw[b].launch();
  const context = await browser.newContext({ viewport: { width: 1920, height: 1080 } });
  const jobs = FULL.map((x) => [x.route, (p) => full(b, p, base, x)]).concat(KITS.map((x) => [x.route, (p) => kit(b, p, base, x)]), [['reload_inside_kit', (p) => reloadInside(b, p, base)]]);
  for (const [name, job] of jobs) {
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    try {
      await job(page);
      await page.screenshot({ path: path.join(OUT, b + '_' + name + '.png') });
    } catch (e) { check(b, name, 'scenario completed', false, e.stack || String(e)); }
    check(b, name, 'no page or console errors', !errors.length, errors);
    await page.close();
  }
  await context.close();
  await browser.close();
}

(async () => {
  const server = await serve();
  const base = 'http://127.0.0.1:' + server.address().port;
  try { for (const b of ['chromium', 'firefox']) await run(b, base); } finally { server.close(); }
  const failed = results.filter((x) => !x.ok);
  const per = {};
  results.forEach((x) => { const k = x.browser; per[k] = per[k] || { total: 0, passed: 0 }; per[k].total++; if (x.ok) per[k].passed++; });
  fs.writeFileSync(path.join(__dirname, 'ch02_route_results_browser.json'), JSON.stringify({ schema: 'cyoa-ch02-browser-v1', total: results.length,
    passed: results.length - failed.length, browsers: per, seeds: Object.fromEntries([...FULL, ...KITS].map((x) => [x.route, x.f.seed])), checks: results }, null, 2) + '\n');
  console.log('Biology Park browser route QA ' + (results.length - failed.length) + '/' + results.length + ' passed ' + JSON.stringify(per));
  if (failed.length) process.exitCode = 1;
})().catch((e) => { console.error(e.stack || String(e)); process.exitCode = 1; });
