#!/usr/bin/env node
// CI artifact policy check (docs/100). Run by the content job; Node only, no dependencies.
//
// Fails when .github/workflows/qa.yml and the browser suites drift apart:
//   - every upload-artifact step sets retention-days (7 for results, 1 for screenshots);
//   - qa-browsers-summary uploads exactly the artifact index plus every JSON results file a browser
//     suite writes, on every run (if: always());
//   - qa-browsers-screenshots uploads exactly the PNGs of every folder a browser suite writes
//     screenshots to, and only on a failed run or a manual visual-review run, never on cancel;
//   - no artifact uploads a whole folder (only named files or *.png globs);
//   - the manual visual_review input exists (boolean, default false);
//   - tools/ci/qa-artifact-index.js lists the same files.
// A suite added to the browser job that writes a new screenshot folder or results file therefore
// fails here until its output is uploaded and indexed.
'use strict';
const fs = require('fs');
const path = require('path');
const IDX = require('./qa-artifact-index.js');

const ROOT = path.resolve(__dirname, '..', '..');
const WF = '.github/workflows/qa.yml';
const text = fs.readFileSync(path.join(ROOT, WF), 'utf8');
const lines = text.split('\n');
const results = [];
function check(name, ok, detail) { results.push({ name, ok: !!ok, detail: ok ? undefined : detail }); }
const same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());

// --- Split the workflow into jobs and steps (indentation-based; qa.yml uses 2-space YAML). -------
function jobs() {
  const out = {}; let inJobs = false, cur = null;
  for (const l of lines) {
    if (/^jobs:\s*$/.test(l)) { inJobs = true; continue; }
    if (!inJobs) continue;
    const m = /^  ([A-Za-z0-9_-]+):\s*$/.exec(l);
    if (m) { cur = out[m[1]] = []; continue; }
    if (cur) cur.push(l);
  }
  return out;
}
function steps(jobLines) {
  const out = []; let cur = null;
  for (const l of jobLines) {
    if (/^      - /.test(l)) { cur = []; out.push(cur); }
    if (cur && (/^      /.test(l) || l.trim() === '')) cur.push(l);
  }
  return out.map(block => {
    const body = block.join('\n');
    const get = key => { const m = new RegExp('^\\s{6,8}(?:- )?' + key + ':\\s*(.*)$', 'm').exec(body); return m ? m[1].trim() : null; };
    const pathBlock = /^\s+path: \|\n((?:\s{12}\S.*\n?)+)/m.exec(body);
    return {
      name: get('name'), if: get('if'), uses: get('uses'), run: get('run'),
      runBlock: (/^\s+run: \|\n((?:\s{10}.*\n?)+)/m.exec(body) || [])[1] || '',
      artifact: (/^\s+name: (\S+)\s*$/m.exec(body.split('\n').filter(x => /^\s{10}name:/.test(x)).join('\n')) || [])[1] || null,
      retention: (/^\s+retention-days: (\d+)/m.exec(body) || [])[1] || null,
      paths: pathBlock ? pathBlock[1].split('\n').map(s => s.trim()).filter(Boolean) : null,
      body
    };
  });
}
const J = jobs();
check('workflow has the content and browsers jobs', J.content && J.browsers, Object.keys(J));
const content = steps(J.content || []), browsers = steps(J.browsers || []);
const uploads = [...content, ...browsers].filter(s => s.uses && s.uses.startsWith('actions/upload-artifact@'));

// --- Retention and folder uploads on every artifact. ----------------------------------------------
for (const u of uploads) {
  check(`${u.artifact}: retention-days is set`, u.retention != null, u.name);
  for (const p of u.paths || []) {
    const abs = path.join(ROOT, p);
    check(`${u.artifact}: uploads files, not a whole folder (${p})`, !p.endsWith('/') && !(fs.existsSync(abs) && fs.statSync(abs).isDirectory()), p);
  }
}
const byName = Object.fromEntries(uploads.map(u => [u.artifact, u]));
check('artifacts are exactly qa-content, qa-browsers-summary, qa-browsers-screenshots',
  same(Object.keys(byName), ['qa-content', 'qa-browsers-summary', 'qa-browsers-screenshots']), Object.keys(byName));
const qc = byName['qa-content'], qs = byName['qa-browsers-summary'], qp = byName['qa-browsers-screenshots'];
check('qa-content: every run, 7 days', qc && qc.if === 'always()' && qc.retention === '7', qc && [qc.if, qc.retention]);
check('qa-browsers-summary: every run, 7 days', qs && qs.if === 'always()' && qs.retention === '7', qs && [qs.if, qs.retention]);
const SHOT_IF = "${{ !cancelled() && (failure() || (github.event_name == 'workflow_dispatch' && inputs.visual_review)) }}";
check('qa-browsers-screenshots: only failed runs or manual visual review, never on cancel, 1 day',
  qp && qp.if === SHOT_IF && qp.retention === '1', qp && [qp.if, qp.retention]);
check('screenshots are the last step of the browsers job (they see every suite\'s outcome)', browsers.length && browsers[browsers.length - 1] === qp);

// --- The manual visual-review input. --------------------------------------------------------------
check('workflow_dispatch has a boolean visual_review input, default false',
  /workflow_dispatch:\n    inputs:\n      visual_review:\n(?:        .*\n)*?        type: boolean\n        default: false\n/.test(text));
const idxStep = browsers.find(s => s.run === 'node tools/ci/qa-artifact-index.js');
check('artifact index runs on every run before the uploads, with job status and visual_review',
  idxStep && idxStep.if === 'always()' && browsers.indexOf(idxStep) < browsers.indexOf(qs) &&
  /JOB_STATUS: \$\{\{ job\.status \}\}/.test(idxStep.body) &&
  /VISUAL_REVIEW: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.visual_review \}\}/.test(idxStep.body));

// --- What the browser suites actually write (read from each suite's source). ---------------------
const scripts = new Set();
for (const s of browsers) for (const cmd of [s.run || '', s.runBlock]) for (const m of cmd.matchAll(/node ([\w./-]+\.js)/g)) scripts.add(m[1]);
scripts.delete('tools/ci/qa-artifact-index.js');
scripts.delete('game/qa/check_known_failures.js'); // reads results, writes nothing
const writtenShots = new Set(), writtenResults = new Set();
for (const rel of scripts) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8'), dir = path.dirname(rel);
  for (const m of src.matchAll(/path\.join\(__dirname,\s*'([\w-]*screenshots)'\)/g)) writtenShots.add(dir + '/' + m[1]);
  for (const m of src.matchAll(/'([\w-]*results[\w-]*\.json)'/g)) writtenResults.add(dir + '/' + m[1]);
}
// validate_assets.js names its output by mode; in the browser job it is asset_results.json.
check('found the browser suites in the workflow', scripts.size >= 9, [...scripts]);
check('index RESULTS = every results file a browser suite writes', same(IDX.RESULTS, writtenResults),
  { missing: [...writtenResults].filter(x => !IDX.RESULTS.includes(x)), extra: IDX.RESULTS.filter(x => !writtenResults.has(x)) });
check('index SCREENSHOTS = every screenshot folder a browser suite writes', same(IDX.SCREENSHOTS, writtenShots),
  { missing: [...writtenShots].filter(x => !IDX.SCREENSHOTS.includes(x)), extra: IDX.SCREENSHOTS.filter(x => !writtenShots.has(x)) });
check('qa-browsers-summary uploads the index plus exactly those results', qs && same(qs.paths, [IDX.OUT, ...IDX.RESULTS]), qs && qs.paths);
check('qa-browsers-screenshots uploads exactly the PNGs of those folders', qp && same(qp.paths, IDX.SCREENSHOTS.map(d => d + '/*.png')), qp && qp.paths);

const failed = results.filter(r => !r.ok);
for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : '  ' + JSON.stringify(r.detail)));
console.log(`CI artifact policy ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
