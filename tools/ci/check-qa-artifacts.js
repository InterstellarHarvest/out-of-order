#!/usr/bin/env node
// CI artifact policy check (docs/100). Run by the content job; Node only, no dependencies.
//
// Fails when .github/workflows/qa.yml, the browser suites and tools/ci/qa-artifact-index.js drift apart,
// or when an artifact change could hide a test failure:
//   - the job result comes only from QA steps: continue-on-error appears only on the upload steps and
//     on the informational storyboard drift report; no QA step has it; every browser QA step keeps its
//     id, script and run condition;
//   - every upload sets retention-days: 7 for JSON results, 1 for screenshots;
//   - qa-browsers-summary uploads the index plus every JSON results file a browser suite writes, on every run;
//   - qa-browsers-failure-screenshots uploads only the staged PNGs of the failed suites, only on a
//     failed run (never on cancel); qa-browsers-screenshots uploads every PNG, only on a manual
//     visual-review run (boolean input, default false);
//   - no artifact uploads a whole folder (only named files or *.png globs);
//   - each suite's screenshot folders and results files equal what its own source writes, so a new
//     suite or folder that is not uploaded and indexed fails here.
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
      name: get('name'), id: get('id'), if: get('if'), uses: get('uses'), run: get('run'),
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
  check(`${u.artifact}: continue-on-error (a refused upload never changes the job result)`, /^\s+continue-on-error: true\s*$/m.test(u.body), u.name);
  for (const p of u.paths || []) {
    const abs = path.join(ROOT, p);
    check(`${u.artifact}: uploads files, not a whole folder (${p})`, !p.endsWith('/') && !(fs.existsSync(abs) && fs.statSync(abs).isDirectory()), p);
  }
}
const byName = Object.fromEntries(uploads.map(u => [u.artifact, u]));
check('artifacts are exactly qa-content, qa-browsers-summary, qa-browsers-failure-screenshots, qa-browsers-screenshots',
  same(Object.keys(byName), ['qa-content', 'qa-browsers-summary', 'qa-browsers-failure-screenshots', 'qa-browsers-screenshots']), Object.keys(byName));
const qc = byName['qa-content'], qs = byName['qa-browsers-summary'], qf = byName['qa-browsers-failure-screenshots'], qp = byName['qa-browsers-screenshots'];
check('qa-content: every run, 7 days', qc && qc.if === 'always()' && qc.retention === '7', qc && [qc.if, qc.retention]);
check('qa-browsers-summary: every run, 7 days', qs && qs.if === 'always()' && qs.retention === '7', qs && [qs.if, qs.retention]);
const VISUAL = "github.event_name == 'workflow_dispatch' && inputs.visual_review";
check('qa-browsers-failure-screenshots: failed run only (not cancel, not visual review), 1 day',
  qf && qf.if === '${{ !cancelled() && failure() && !(' + VISUAL + ') }}' && qf.retention === '1', qf && [qf.if, qf.retention]);
check('qa-browsers-screenshots: manual visual-review run only (not cancel), 1 day',
  qp && qp.if === '${{ !cancelled() && ' + VISUAL + ' }}' && qp.retention === '1', qp && [qp.if, qp.retention]);
check('the three browser uploads are the last steps of the browsers job (they see every suite\'s outcome)',
  browsers.length >= 3 && same(browsers.slice(-3), [qs, qf, qp]));

// --- Nothing can hide a test failure. -------------------------------------------------------------
const coe = [...content, ...browsers].filter(s => /^\s+continue-on-error:/m.test(s.body));
const coeAllowed = s => uploads.includes(s) || s.run === 'node tools/story-sync/sync.js status';
check('continue-on-error only on uploads and the informational drift report', coe.every(coeAllowed), coe.filter(s => !coeAllowed(s)).map(s => s.name));
const PW_IF = "(success() || failure()) && steps.pw.outcome == 'success'";
for (const suite of IDX.SUITES) {
  const st = browsers.find(s => s.id === suite.id);
  const cmd = st ? (st.run !== '|' ? st.run : st.runBlock) : '';
  check(`QA step ${suite.id}: present, runs ${suite.script}`, st && cmd.includes('node ' + suite.script), st && cmd);
  check(`QA step ${suite.id}: run condition unchanged`, st && (st.if === null || st.if === PW_IF), st && st.if);
  // The exit code of the suite is the step's result: no "|| true", "; exit 0" or similar, except the
  // layout lab, whose 8 known failures are then gated by exact name in the same step.
  const lines = cmd.split('\n').map(l => l.trim()).filter(Boolean);
  const plain = new RegExp('^node ' + suite.script.replace(/[.]/g, '\\.') + '( --[\\w-]+)*$');
  const ok = suite.id === 'layout_lab'
    ? lines.length === 3 && lines[1] === 'node ' + suite.script + ' || true' &&
      lines[2] === 'node game/qa/check_known_failures.js tools/layout-lab/qa/qa_results.json game/qa/known_failures/layout-lab.json'
    : lines.length === 1 && plain.test(lines[0]);
  check(`QA step ${suite.id}: its exit code is the step result (nothing swallows a failure)`, st && ok, lines);
}
const qaSteps = browsers.filter(s => /node (?!tools\/ci\/)[\w./-]+\.js/.test((s.run || '') + s.runBlock) && !uploads.includes(s));
check('every browser QA step is a known suite with an id', qaSteps.every(s => IDX.SUITES.some(x => x.id === s.id)), qaSteps.filter(s => !IDX.SUITES.some(x => x.id === s.id)).map(s => s.name));

// --- The manual visual-review input and the index step. -------------------------------------------
check('workflow_dispatch has a boolean visual_review input, default false',
  /workflow_dispatch:\n    inputs:\n      visual_review:\n(?:        .*\n)*?        type: boolean\n        default: false\n/.test(text));
const idxStep = browsers.find(s => s.run === 'node tools/ci/qa-artifact-index.js');
check('artifact index runs on every run before the uploads, with job status, visual_review and step outcomes',
  idxStep && idxStep.if === 'always()' && browsers.indexOf(idxStep) < browsers.indexOf(qs) &&
  !/continue-on-error/.test(idxStep.body) &&
  /JOB_STATUS: \$\{\{ job\.status \}\}/.test(idxStep.body) &&
  /VISUAL_REVIEW: \$\{\{ github\.event_name == 'workflow_dispatch' && inputs\.visual_review \}\}/.test(idxStep.body) &&
  /STEP_OUTCOMES: \$\{\{ toJSON\(steps\) \}\}/.test(idxStep.body));
const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8');
check('.gitignore covers the index and the staging folder', /^game\/qa\/ci_artifact_index_\*\.json$/m.test(ignore) && new RegExp('^' + IDX.STAGE + '/$', 'm').test(ignore));

// --- What each browser suite actually writes (read from its own source). -------------------------
for (const suite of IDX.SUITES) {
  const src = fs.readFileSync(path.join(ROOT, suite.script), 'utf8'), dir = path.dirname(suite.script);
  const shots = [...src.matchAll(/path\.join\(__dirname,\s*'([\w-]*screenshots)'\)/g)].map(m => dir + '/' + m[1]);
  const res = [...src.matchAll(/'([\w-]*results[\w-]*\.json)'/g)].map(m => dir + '/' + m[1]);
  check(`${suite.id}: screenshot folders = what ${suite.script} writes`, same(new Set(shots), suite.screenshots), { source: [...new Set(shots)], index: suite.screenshots });
  check(`${suite.id}: results files = what ${suite.script} writes`, same(new Set(res), suite.results), { source: [...new Set(res)], index: suite.results });
}
check('qa-browsers-summary uploads the index plus exactly the suites\' results', qs && same(qs.paths, [IDX.OUT, ...IDX.RESULTS]), qs && qs.paths);
check('qa-browsers-failure-screenshots uploads only the staged PNGs', qf && same(qf.paths, [IDX.STAGE + '/**/*.png']), qf && qf.paths);
check('qa-browsers-screenshots uploads exactly the PNGs of every suite folder', qp && same(qp.paths, IDX.SCREENSHOTS.map(d => d + '/*.png')), qp && qp.paths);

const failed = results.filter(r => !r.ok);
for (const r of results) console.log((r.ok ? 'PASS ' : 'FAIL ') + r.name + (r.ok ? '' : '  ' + JSON.stringify(r.detail)));
console.log(`CI artifact policy ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length ? 1 : 0);
