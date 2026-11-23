#!/usr/bin/env node
// The primary QA gate (docs/105): every QA step of .github/workflows/qa.yml, run locally for free.
// The steps are read from qa.yml itself, so this run and CI can never drift apart.
//
//   node tools/ci/run-local-qa.js [content|chromium|full] [--out <dir>] [--restore]
//     content   the content job, including the story-import acceptance suite (~20 min)
//     chromium  + every browser suite in Chromium only
//     full      + every browser suite in Chromium and Firefox (the default; ~1 h 15 min)
//     --out     where the per-step logs and SUMMARY.txt go (default: a new folder in the OS temp dir)
//     --restore afterwards, put back the QA run output the suites write into the checkout (tracked
//               *_results*.json files and screenshots restored to HEAD; untracked run output removed);
//               only paths the artifact index (tools/ci/qa-artifact-index.js) names as QA output
//
// Playwright: set NODE_PATH to its installation, or have it installed globally (npm root -g is used).
// Exit code 1 if any step failed. Paste SUMMARY.txt into the pull request as its QA evidence.
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../..');
const args = process.argv.slice(2);
const mode = ['content', 'chromium', 'full'].find((m) => args.includes(m)) || 'full';
const outArg = args.indexOf('--out');
const OUT = outArg !== -1 ? path.resolve(args[outArg + 1]) : fs.mkdtempSync(path.join(os.tmpdir(), 'out-of-order-qa-'));
const restore = args.includes('--restore');

// QA steps of one job of qa.yml: every `run:` that is not CI plumbing (scope detection, Playwright install,
// the artifact index). Multi-line runs (the layout lab and its known-failure gate) are kept whole.
function qaSteps(job) {
  const lines = fs.readFileSync(path.join(ROOT, '.github/workflows/qa.yml'), 'utf8').split('\n');
  const start = lines.findIndex((l) => l === '  ' + job + ':');
  if (start === -1) throw new Error('qa.yml has no job ' + job);
  let end = lines.findIndex((l, i) => i > start && /^  [A-Za-z0-9_-]+:\s*$/.test(l));
  if (end === -1) end = lines.length;
  const steps = []; let cur = null;
  for (let i = start + 1; i < end; i++) {
    const l = lines[i];
    if (/^      - /.test(l)) { cur = { name: null, run: null }; steps.push(cur); }
    if (!cur) continue;
    let m;
    if ((m = /^      (?:- )?name: (.*)$/.exec(l))) cur.name = m[1];
    else if ((m = /^        run: \|\s*$/.exec(l))) { const block = []; while (i + 1 < end && /^          /.test(lines[i + 1])) block.push(lines[++i].slice(10)); cur.run = block.join('\n'); }
    else if ((m = /^        run: (.*)$/.exec(l))) cur.run = m[1];
  }
  return steps.filter((s) => s.run && !/^node tools\/ci\/(changed-scope|qa-artifact-index)\.js\b/.test(s.run) && !/npm install|playwright" install/.test(s.run));
}

const plan = qaSteps('content').map((s) => ({ job: 'content', ...s }));
if (mode !== 'content') plan.push(...qaSteps('browsers').map((s) => ({ job: 'browsers', ...s })));
let nodePath = process.env.NODE_PATH;
if (!nodePath) try { nodePath = execFileSync('npm', ['root', '-g'], { encoding: 'utf8' }).trim(); } catch (e) { nodePath = ''; }
const env = { ...process.env, NODE_PATH: nodePath, QA_BROWSERS: mode === 'chromium' ? 'chromium' : 'chromium,firefox' };

fs.mkdirSync(OUT, { recursive: true });
const summary = [];
const head = execFileSync('git', ['rev-parse', '--short=12', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { cwd: ROOT, encoding: 'utf8' }).trim();
summary.push('Local QA (' + mode + ') at ' + head + (dirty ? ' + uncommitted changes' : '') + ', ' + new Date().toISOString() + ', ' + os.platform() + ' node ' + process.version);
let failed = 0;
plan.forEach((s, i) => {
  const log = path.join(OUT, String(i + 1).padStart(2, '0') + '_' + s.job + '.log');
  const t0 = Date.now();
  const r = spawnSync('bash', ['-eo', 'pipefail', '-c', s.run], { cwd: ROOT, env, encoding: 'utf8', maxBuffer: 1 << 28 });
  fs.writeFileSync(log, (r.stdout || '') + (r.stderr || ''));
  // The drift report is informational in CI (continue-on-error) and stays so here.
  const informational = /sync\.js status$/.test(s.run);
  const ok = r.status === 0 || informational;
  if (!ok) failed++;
  const last = ((r.stdout || '') + (r.stderr || '')).trim().split('\n').filter(Boolean).pop() || '';
  const line = (ok ? 'PASS' : 'FAIL') + '  ' + s.job.padEnd(8) + ' ' + String(Math.round((Date.now() - t0) / 1000)).padStart(5) + 's  ' + s.name + '\n        ' + last.slice(0, 200);
  summary.push(line);
  console.log(line);
});
summary.push((failed ? failed + ' step(s) FAILED' : 'ALL ' + plan.length + ' steps passed') + '; logs: ' + OUT);
fs.writeFileSync(path.join(OUT, 'SUMMARY.txt'), summary.join('\n') + '\n');
console.log(summary[summary.length - 1]);

if (restore) {
  // Only what the artifact index names as QA run output, plus the content job's results files.
  const IDX = require('./qa-artifact-index.js');
  const outputs = [...IDX.RESULTS, ...IDX.SCREENSHOTS, 'game/qa/route_results.json', 'game/qa/route_results_v2.json', 'game/qa/story_results.json',
    'game/qa/story_import_results.json', 'game/qa/ch02_route_results.json', 'game/qa/ch01_art_results.json', 'game/qa/ch02_art_results.json',
    'game/qa/ch03_results.json', 'game/qa/death_controls_results.json', 'game/qa/asset_results.json'].filter((p) => fs.existsSync(path.join(ROOT, p)));
  const tracked = execFileSync('git', ['ls-files', '-m', '--', ...outputs], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  if (tracked.length) execFileSync('git', ['checkout', '--', ...tracked], { cwd: ROOT });
  execFileSync('git', ['clean', '-fdq', '--', ...outputs], { cwd: ROOT });
  console.log('restored ' + tracked.length + ' tracked output file(s) and removed untracked run output (' + outputs.length + ' QA output paths)');
}
process.exitCode = failed ? 1 : 0;
