// Publish unselected Batch7 provenance only after its immutable candidate commit exists.
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import cp from 'node:child_process';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
const ROOT=path.dirname(fileURLToPath(import.meta.url)),canon=process.argv[2],source=process.argv[3];
assert(canon&&/^[a-f0-9]{40}$/.test(source||''),'canonical checkout and pinned candidate SHA required');
const {artRecords,statusOf}=await import(pathToFileURL(path.join(canon,'tools/sync/lib.mjs')));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const catalogFile=path.join(canon,'story/artwork.draft.json'),before=JSON.parse(fs.readFileSync(catalogFile)),after=structuredClone(before);
const manifest=JSON.parse(fs.readFileSync(path.join(ROOT,'manifest.json'))),targets=JSON.parse(fs.readFileSync(path.join(ROOT,'target-source-records.json')));
const sourceCommit=cp.execFileSync('git',['rev-parse',source],{cwd:path.resolve(ROOT,'../..'),encoding:'utf8'}).trim();assert.equal(sourceCommit,source);
const baseline={};for(const rel of cp.execFileSync('git',['ls-files','-z'],{cwd:canon,encoding:'utf8'}).split('\0').filter(Boolean))baseline[rel]=sha(fs.readFileSync(path.join(canon,rel)));
fs.writeFileSync(path.join(ROOT,'sources/canonical-publication-baseline-hashes.json'),JSON.stringify(baseline,null,2)+'\n');
const entries=new Map(artRecords(after).map(e=>[e.key,e]));
for(const a of manifest.assets){
 const e=entries.get(a.registryKey);assert(e);assert.deepEqual(e.record,targets[a.id].record);assert.equal(statusOf(e),'not-started');assert.equal(e.record.assetPath,null);assert.equal(a.selected,false);assert.equal(sha(fs.readFileSync(path.join(ROOT,a.candidatePath))),a.sha256);
 const repoPath='review/'+path.basename(ROOT)+'/'+a.candidatePath;
 assert.equal(sha(cp.execFileSync('git',['show',source+':'+repoPath],{cwd:path.resolve(ROOT,'../..')})),a.sha256);
 e.record.status='generated';
 const note='CANDIDATE GENERATED 2026-11-17: Source InterstellarHarvest/CYOA@agent/ch02-art-batch07-treatment-kits; commit '+source+'; path '+repoPath+'; SHA-256 '+a.sha256+'. Revised upright original medical hypo after owner silhouette feedback. Native '+a.dimensions.join('x')+' '+a.mode+'; existing64-color palette, no dithering; detailed genuine source and exact4x review preserved. Generated and unselected; Art Director approval pending; production assetPath remains null. Current Focus A564x278 is separate from future ScenePickup565x451.';
 e.record.notes=(e.record.notes?e.record.notes+'\n':'')+note;
}
const chapter2=artRecords(after).filter(e=>(e.id||'').startsWith('biology_park/')||(e.id||'').startsWith('botanical_antidote_'));
const remaining=chapter2.filter(e=>statusOf(e)==='not-started').map(e=>({key:e.key,record:e.record}));
const expected=['classified_as_compost','new_arrival','personal_growth','reclassified','site_improvement'].map(x=>'deathScreens:biology_park/'+x).sort();assert.deepEqual(remaining.map(e=>e.key).sort(),expected);
assert.deepEqual(after.deathScreens,before.deathScreens);
const previews=JSON.parse(fs.readFileSync(path.join(canon,'story/artwork-preview.json')));assert.equal(Object.keys(previews.images).length,100);
for(const a of manifest.assets)assert(!previews.images[a.registryKey]);
fs.writeFileSync(catalogFile,JSON.stringify(after,null,2).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'))+'\n');
fs.writeFileSync(path.join(ROOT,'remaining-queue.current.json'),JSON.stringify({chapter2NotStarted:remaining,batch7Generated:manifest.assets.map(a=>a.registryKey),batch8Started:false},null,2)+'\n');
fs.mkdirSync(path.join(ROOT,'sources/publication'),{recursive:true});fs.copyFileSync(catalogFile,path.join(ROOT,'sources/publication/artwork.draft.json'));
const changed=[];for(const[p,h]of Object.entries(baseline))if(sha(fs.readFileSync(path.join(canon,p)))!==h)changed.push(p);
assert.deepEqual(changed,['story/artwork.draft.json']);
const receipt={candidateSourceCommit:source,canonicalPublicationBaseline:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:canon,encoding:'utf8'}).trim(),changedCanonicalFiles:changed,allOtherTrackedCanonicalFilesPreserved:Object.keys(baseline).length-1,selectedPreviewEntriesPreserved:100,allCandidateProductionPathsNull:true,allCandidatesUnselected:true,allDeathScreenRecordsUnchanged:true,allChapterAndItemDescriptionBytesPreserved:true,allExistingFocusDimensionsPreserved:true,remainingChapter2NotStarted:remaining.map(e=>e.key),noGameplayIntegration:true};
fs.writeFileSync(path.join(ROOT,'canonical-publication-scope.json'),JSON.stringify(receipt,null,2)+'\n');console.log(JSON.stringify(receipt,null,2));
