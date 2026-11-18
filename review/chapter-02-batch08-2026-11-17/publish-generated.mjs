import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';import crypto from 'node:crypto';import assert from 'node:assert/strict';import {fileURLToPath,pathToFileURL} from 'node:url';
const R=path.dirname(fileURLToPath(import.meta.url)),repo=path.resolve(R,'../..'),canon=process.argv[2],source=process.argv[3];assert(canon&&/^[a-f0-9]{40}$/.test(source||''));
const {artRecords,statusOf}=await import(pathToFileURL(path.join(canon,'tools/sync/lib.mjs')));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(fs.readFileSync(p)),write=(p,o)=>fs.writeFileSync(p,JSON.stringify(o,null,2).replace(/[\u007f-\uffff]/g,c=>'\\u'+c.charCodeAt(0).toString(16).padStart(4,'0'))+'\n');
const targets=read(path.join(R,'target-source-records.json')),manifest=read(path.join(R,'manifest.json')),file=path.join(canon,'story/artwork.draft.json'),before=read(file),after=structuredClone(before),chap=read(path.join(canon,'story/chapters/chapter-02.draft.json')),entries=new Map(artRecords(after).map(e=>[e.key,e]));
const baseline={};for(const p of cp.execFileSync('git',['ls-files','-z'],{cwd:canon,encoding:'utf8'}).split('\0').filter(Boolean))baseline[p]=sha(fs.readFileSync(path.join(canon,p)));
write(path.join(R,'sources/canonical-publication-baseline-hashes.json'),baseline);
const selected=read(path.join(canon,'story/artwork-preview.json'));assert.equal(Object.keys(selected.images).length,109);
for(const a of manifest.assets){
 const e=entries.get(a.registryKey),t=targets[a.id];assert.deepEqual(e.record,t.record);assert.equal(statusOf(e),'not-started');assert.equal(e.record.assetPath,null);assert.equal(a.selected,false);assert(!selected.images[a.registryKey]);
 for(const[id,node]of Object.entries(t.fatalNodes))assert.deepEqual(chap.nodes[id],node,'Concurrent fatal text changed: '+id);
 const rel='review/'+path.basename(R)+'/'+a.candidatePath;assert.equal(sha(cp.execFileSync('git',['show',source+':'+rel],{cwd:repo})),a.sha256);
 e.record.status='generated';e.record.notes=(e.record.notes?e.record.notes+'\n':'')+'CANDIDATE GENERATED 2026-11-17: Source InterstellarHarvest/CYOA@agent/ch02-art-batch08-death-aftermaths; commit '+source+'; path '+rel+'; SHA-256 '+a.sha256+'. Independent genuine aftermath illustration, native314x206 opaque RGB, existing64-color palette without dithering; popup exact2x628x412 and optional4x1256x824. Detailed original, exact prompt, approved-scene comparisons and existing-UI composition proofs preserved. Generated/unselected pending owner review; production assetPath:null; no gameplay integration. Popup title, subtitle, narrative, controls and frozen backdrop remain separate.';
}
write(file,after);
const exportFile=path.join(canon,'story/death-presentations.export.json'),oldExport=read(exportFile);cp.execFileSync('node',['tools/storyboard/export-death-presentations.mjs'],{cwd:canon});
const nextExport=read(exportFile),expected=structuredClone(oldExport),targetIds=new Set(manifest.assets.map(a=>a.registryKey.split(':')[1]));
for(const e of expected.entries)if(targetIds.has(e.artwork.id))e.artwork.status='generated';
assert.deepEqual(nextExport,expected,'Derived export must change only five artwork statuses');
const referenced=new Set();function scan(v){if(typeof v==='string')referenced.add(v);else if(Array.isArray(v))v.forEach(scan);else if(v&&typeof v==='object')Object.values(v).forEach(scan);}scan(chap);
const chapter2=artRecords(after).filter(e=>e.id.startsWith('biology_park/')||referenced.has(e.id)),remaining=chapter2.filter(e=>statusOf(e)==='not-started');assert.equal(remaining.length,0,remaining.map(e=>e.key).join(','));
const changed=Object.entries(baseline).filter(([p,h])=>sha(fs.readFileSync(path.join(canon,p)))!==h).map(([p])=>p).sort();assert.deepEqual(changed,['story/artwork.draft.json','story/death-presentations.export.json']);
write(path.join(R,'remaining-queue.current.json'),{chapter2ArtworkRecordsChecked:chapter2.length,chapter2NotStarted:[],generatedAwaitingReview:manifest.assets.map(a=>a.registryKey),selectedImageCount:109,noGameplayIntegration:true});
fs.mkdirSync(path.join(R,'sources/publication'),{recursive:true});for(const f of ['artwork.draft.json','death-presentations.export.json'])fs.copyFileSync(path.join(canon,'story',f),path.join(R,'sources/publication',f));
const receipt={candidateSourceCommit:source,canonicalPublicationBaseline:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:canon,encoding:'utf8'}).trim(),generationSourceCommit:manifest.canonicalSourceCommit,changedExistingCanonicalFiles:changed,otherExistingCanonicalFilesPreserved:Object.keys(baseline).length-changed.length,all109SelectedEntriesAndPngsPreserved:true,allFiveGeneratedUnselectedNullProductionPaths:true,derivedExportOnlyFiveArtStatusChanges:true,allPopupCopyControlsAndNarrativeBytesPreserved:true,chapter2NotStartedCount:0,chapter3NotAuditedOrModified:true};
write(path.join(R,'canonical-publication-scope.json'),receipt);console.log(JSON.stringify(receipt,null,2));
