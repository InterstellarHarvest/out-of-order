#!/usr/bin/env node
// Compares a QA results file with its recorded known failures (docs/84 section 7).
//   node game/qa/check_known_failures.js <results.json> <known_failures.json>
// Passes only when the failures are exactly a subset of the known list (same browser, same check
// name, never more often). A known failure that now passes is reported, not an error. A results
// file older than this run (or missing) is an error, so a crashed suite can never pass on stale output.
'use strict';
const fs = require('fs');
const [resultsPath, knownPath] = process.argv.slice(2);
if (!resultsPath || !knownPath) { console.error('usage: check_known_failures.js <results.json> <known_failures.json>'); process.exit(2); }
if (!fs.existsSync(resultsPath)) { console.error('RESULT: FAIL  no results at ' + resultsPath + ' (the suite did not finish)'); process.exit(1); }
const since = Number(process.env.QA_SINCE || 0);
if (since && fs.statSync(resultsPath).mtimeMs < since) { console.error('RESULT: FAIL  ' + resultsPath + ' was not written by this run'); process.exit(1); }
const r = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));
const known = JSON.parse(fs.readFileSync(knownPath, 'utf8')).failures;
const list = r.failures || (r.results || r.checks || []).filter((c) => !c.ok);
const key = (f) => f.browser + ' | ' + f.name;
const seen = {};
list.forEach((f) => { seen[key(f)] = (seen[key(f)] || 0) + 1; });
const allowed = {};
known.forEach((f) => { allowed[key(f)] = f.count; });
const unexpected = Object.keys(seen).filter((k) => seen[k] > (allowed[k] || 0)).map((k) => k + ' (x' + seen[k] + ', known x' + (allowed[k] || 0) + ')');
const fixed = Object.keys(allowed).filter((k) => (seen[k] || 0) < allowed[k]).map((k) => k + ' (x' + (seen[k] || 0) + ' of ' + allowed[k] + ')');
console.log((r.passed !== undefined ? r.passed + '/' + r.total + ' passed; ' : '') + list.length + ' failing, ' + known.reduce((n, f) => n + f.count, 0) + ' known');
if (fixed.length) console.log('known failures now passing (shrink the list): ' + fixed.join('; '));
if (unexpected.length) { console.log('RESULT: FAIL  new failures: ' + unexpected.join('; ')); process.exit(1); }
console.log('RESULT: PASS  only known failures');
