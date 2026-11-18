#!/usr/bin/env node
// Historical GitHub Actions artifact cleanup for InterstellarHarvest/CYOA (docs/100 section 5).
//
// DRY RUN BY DEFAULT. It deletes nothing unless --apply is given, and the owner authorises each class
// (and, for OWNER rows, each artifact) explicitly. It never deletes workflow runs or logs.
//
// Input: an inventory TSV (default: the current one, docs/100_ci_artifact_inventory_20261117_r2.tsv;
// the first inventory, ..._20261117.tsv, records the SAFE class pruned on 2026-11-17). Only rows of the
// requested class are considered, and every row is re-checked LIVE before it is touched:
//   - the artifact still exists, with the same name and size as in the inventory;
//   - its commit is not the CURRENT head of PR #16 (the latest verified implementation);
//   - a CANDIDATE row at an open PR head is deleted only while that commit is still contained in the
//     current PR #16 head (so PR #16's green run still covers its code);
//   - a row at the head of main is deleted only if a NEWER artifact of the same name exists for the
//     same commit (an earlier re-run attempt);
//   - KEEP rows can never be deleted.
// Rows that fail a check are skipped and reported, never deleted.
//
// Usage (needs the GitHub CLI, logged in with repo scope):
//   node tools/ci/prune-artifacts.js --class CANDIDATE                 # dry run
//   node tools/ci/prune-artifacts.js --class CANDIDATE --apply         # after owner authorisation
//   node tools/ci/prune-artifacts.js --class OWNER --ids 1,2,3 [--apply]
//   --inventory <tsv>   another inventory (e.g. the first one, for --class SAFE)
'use strict';
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const REPO = 'InterstellarHarvest/CYOA';
const PR16_BRANCH = 'agent/death-popups-ordinary-play-20261117';
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : null; };
const INVENTORY = path.resolve(opt('--inventory') || path.join(__dirname, '..', '..', 'docs', '100_ci_artifact_inventory_20261117_r2.tsv'));
const cls = opt('--class');
const apply = args.includes('--apply');
const only = opt('--ids') ? new Set(opt('--ids').split(',').map(s => s.trim())) : null;
if (!['SAFE', 'CANDIDATE', 'OWNER'].includes(cls)) { console.error('usage: --class CANDIDATE|OWNER|SAFE [--ids a,b,c] [--inventory tsv] [--apply]   (KEEP is never deleted)'); process.exit(2); }
if (cls === 'OWNER' && !only) { console.error('--class OWNER needs an explicit --ids list chosen by the owner'); process.exit(2); }

const gh = (...a) => execFileSync('gh', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const lines = fs.readFileSync(INVENTORY, 'utf8').trim().split('\n');
const cols = lines[0].split('\t');
const rows = lines.slice(1).map(l => Object.fromEntries(l.split('\t').map((v, i) => [cols[i], v])))
  .filter(r => r.class === cls && (!only || only.has(r.artifact_id)));
if (only) for (const id of only) if (!rows.some(r => r.artifact_id === id)) console.log(`skip ${id}: not a ${cls} row of ${path.basename(INVENTORY)}`);

const openHeads = new Map(JSON.parse(gh('pr', 'list', '-R', REPO, '--state', 'open', '--limit', '200', '--json', 'number,headRefOid'))
  .map(p => [p.headRefOid, p.number]));
const mainHead = gh('api', `repos/${REPO}/commits/main`, '--jq', '.sha').trim();
const pr16Head = gh('api', `repos/${REPO}/commits/${PR16_BRANCH}`, '--jq', '.sha').trim();
const inPr16 = sha => { // sha is an ancestor of (or equal to) the current PR #16 head
  const st = gh('api', `repos/${REPO}/compare/${sha}...${pr16Head}`, '--jq', '.status').trim();
  return st === 'ahead' || st === 'identical';
};
const newerSameCommit = live => JSON.parse(gh('api', `repos/${REPO}/actions/artifacts?name=${encodeURIComponent(live.name)}&per_page=100`)).artifacts
  .some(a => a.id !== live.id && !a.expired && a.workflow_run && a.workflow_run.head_sha === live.workflow_run.head_sha && a.created_at > live.created_at);

let n = 0, bytes = 0;
for (const r of rows) {
  let live;
  try { live = JSON.parse(gh('api', `repos/${REPO}/actions/artifacts/${r.artifact_id}`)); }
  catch (_) { console.log(`skip ${r.artifact_id} ${r.name}: no longer exists`); continue; }
  const why = [];
  const sha = (live.workflow_run && live.workflow_run.head_sha) || '';
  if (live.name !== r.name) why.push(`name is now ${live.name}`);
  if (Math.abs(live.size_in_bytes / 1e6 - Number(r.MB)) > 0.1) why.push(`size is now ${(live.size_in_bytes / 1e6).toFixed(1)} MB`);
  if (live.expired) why.push('already expired');
  if (sha === pr16Head) why.push('commit is the current head of PR #16');
  if (sha === mainHead && !newerSameCommit(live)) why.push('latest artifact of the head of main');
  if (cls === 'SAFE' && openHeads.has(sha)) why.push(`commit is now the head of open PR #${openHeads.get(sha)}`);
  if (cls === 'CANDIDATE' && openHeads.has(sha) && openHeads.get(sha) !== 17 && !inPr16(sha)) why.push(`PR #${openHeads.get(sha)} head is no longer contained in PR #16`);
  if (why.length) { console.log(`skip ${r.artifact_id} ${r.name}: ${why.join('; ')}`); continue; }
  console.log(`${apply ? 'DELETE' : 'would delete'} ${r.artifact_id} ${r.name} ${r.MB} MB ${r.pr || ''} ${r.branch} ${r.sha}`);
  if (apply) gh('api', '-X', 'DELETE', `repos/${REPO}/actions/artifacts/${r.artifact_id}`);
  n++; bytes += live.size_in_bytes;
}
console.log(`${apply ? 'deleted' : 'dry run: would delete'} ${n} artifact(s), ${(bytes / 1e6).toFixed(1)} MB${apply ? '' : '  (add --apply to delete, after owner authorisation)'}`);
