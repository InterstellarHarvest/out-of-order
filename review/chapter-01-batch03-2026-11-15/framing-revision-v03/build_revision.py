#!/usr/bin/env python3
"""Review-only exports; uses the original package's normalization helpers."""
from pathlib import Path
import copy, hashlib, html, importlib.util, json, subprocess, sys
from PIL import Image

sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent
PARENT=HERE.parent
ROOT=HERE.parents[2]
BASE='f42daa9a3b3b9a2631b8b80d88640e944d28848e'
BRANCH='agent/ch01-art-batch03-20261115'
spec=importlib.util.spec_from_file_location('batch3_review_helpers',PARENT/'build_review.py')
helpers=importlib.util.module_from_spec(spec)
spec.loader.exec_module(helpers)

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    for name in ['candidates','previews']:(HERE/name).mkdir(exist_ok=True)
    old=json.loads((PARENT/'manifest.json').read_text())
    assets=copy.deepcopy(old['assets'])
    replacements={'E':('album-page-03-v04',(564,278)),'F':('photo-slot-v03',(96,96)),'G':('photo-inspector-v04',(565,451))}
    for a in assets:
        if a['id'] in replacements:
            name,size=replacements[a['id']]
            src=HERE/'generation-source'/(name+'.png')
            dst=HERE/'candidates'/(name+'.png')
            transform=helpers.export(src,dst,size,icon=a['id']=='F')
            im=Image.open(dst)
            assert im.size==size and im.mode==('RGBA' if a['id']=='F' else 'RGB')
            if a['id']=='F':
                assert set(im.getchannel('A').getdata())=={0,255}
                assert im.getchannel('A').getbbox()[0]>=4
                assert all(p[:3]==(0,0,0) for p in im.getdata() if not p[3])
            a.update(candidatePath='candidates/'+name+'.png',sourcePath='generation-source/'+name+'.png',sourceSHA256=sha(src),sha256=sha(dst),dimensions=list(size),mode=im.mode,paletteColors=len(set(im.getdata())),**transform)
        else:
            a['candidatePath']='../'+a['candidatePath'];a['sourcePath']='../'+a['sourcePath']
            assert sha(HERE/a['candidatePath'])==a['sha256']
        a.update(status='generated',ownerApproved=False,assetPath=None)
    byid={a['id']:a for a in assets}
    candidate=lambda x:HERE/byid[x]['candidatePath']
    for letter in 'EFG':
        before=next(a for a in old['assets'] if a['id']==letter)
        tile=(585,491) if letter=='G' else (584,318) if letter=='E' else (116,136)
        helpers.sheet(HERE/'previews'/('before-after-'+letter+'.png'),[('Before / preserved',PARENT/before['candidatePath']),('After / generated',candidate(letter))],2,tile)
    helpers.sheet(HERE/'previews/album-chronology.png',[(byid[x]['title'],candidate(x)) for x in 'CDE'])
    helpers.sheet(HERE/'previews/photo-slot-inspection.png',[('Slot96x96 / real alpha',candidate('F')),('Inspection565x451 / cropped seated adult',candidate('G'))],2,(585,491))
    preserved=[]
    for item in subprocess.check_output(['git','ls-tree','-rz',BASE],cwd=ROOT).split(b'\0'):
        if not item:continue
        meta,raw=item.split(b'\t',1);p=raw.decode()
        if p.lower().endswith('.png') or p.startswith(('story/','game/','tools/story-import/')):
            data=(ROOT/p).read_bytes();blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
            assert blob==meta.split()[2].decode(),'Previous file modified: '+p
            preserved.append({'path':p,'sha256':hashlib.sha256(data).hexdigest()})
    sources=[{'path':str(p.relative_to(HERE)),'sha256':sha(p),'dimensions':list(Image.open(p).size),'mode':Image.open(p).mode} for p in sorted((HERE/'generation-source').glob('*.png'))]
    manifest={'scope':'Private review only; not a runtime schema','branch':BRANCH,'baseline':BASE,'tool':'built-in image_gen.imagegen','status':'generated','ownerApproved':False,'visualPageOrder':['C','D','E'],'assets':assets,'generationSources':sources,'supersededSources':['generation-source/photo-inspector-v03.png','generation-source/album-page-03-v02.png','generation-source/album-page-03-v03.png'],'ownerOverride':'Partial adult lower torso/lap/thighs/knees may be visible; head and face outside print. Album retains original wide scale with lateral misframing only.'}
    (HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    count=sum(x['path'].lower().endswith('.png') for x in preserved)
    qa={'technicalChecks':'passed','creativeApproval':'pending','currentAssetCount':len(assets),'revisedAssets':['E','F','G'],'unchangedSelectedAssets':['A','B','C','D'],'baseline':BASE,'baselineFilesVerified':len(preserved),'baselinePNGsVerified':count,'allEarlierPNGsByteIdentical':True,'assets':assets,'sources':sources,'preserved':preserved,'browserAutomation':'not run'}
    (HERE/'technical-qa.json').write_text(json.dumps(qa,indent=2)+'\n')
    (HERE/'TECHNICAL_QA.md').write_text('# Framing revision QA\n\nSeven current records remain generated, pending owner creative approval. Only E/F/G are new images. E564×278 RGB; F96×96 RGBA with real binary alpha and transparent margins; G565×451 RGB. A/B/C/D match their prior SHA256 hashes. All'+str(count)+' previously tracked PNGs, and all tracked story/game/importer files, match baseline '+BASE+' byte-for-byte. Every earlier version is retained.\n\nBuilt-in imagegen produced larger source canvases. Exports use the original package’s documented exact-aspect NEAREST normalization and nonspatial RGB radius12 substitution. Icon export also thresholds alpha128, retains the connected paper silhouette, crops transparent padding, fits within88×88 on96×96, and zeros RGB beneath alpha0. No source renders were overwritten. Exact transforms and hashes are in manifest.json.\n\nVisual checks: three whole empty chairs plus partial fourth; normal adult sits on visible fourth seat with lap/thigh/legs connected and shoes facing viewer; head/face outside frame. Album last two frames retain the other album photographs’ wide field and small chair scale while clipping the fourth chair laterally. No visitor is added to historical frames; dwindling bones and clean final absence persist. Upper skeletal photographs retain their prior content. E is a full-page generated edit; no claim of masked per-pixel preservation in the new page. No taking camera is inside any photograph.\n\nNative comparisons, updated album chronology and slot/inspection sheets are provided. A4×/House contact sheet are reused unchanged. Static link/dimension checks are recorded in gallery-verification.json. Browser automation was not run.\n')
    def figure(letter):
        a=byid[letter];w,h=a['dimensions']
        return '<figure><figcaption>'+html.escape(letter+' · '+a['title'])+'</figcaption><img class="'+('alpha' if letter=='F' else '')+'" src="'+a['candidatePath']+'" width="'+str(w)+'" height="'+str(h)+'" alt="'+html.escape(a['title'])+'"><p>'+str(w)+'×'+str(h)+' · '+a['mode']+' · generated / approval pending</p></figure>'
    body='<h1>Chapter1 Batch3 · framing revision</h1><p>All seven current candidates remain generated, pending owner approval. Three new versions: album page3, photo slot and photo inspection. Four other selected images are unchanged.</p><p>Private branch <code>'+BRANCH+'</code> · previous verified head <code>'+BASE+'</code>. Final pushed SHA is reported in the owner handoff.</p><p><a href="RULING_AND_STORY_NOTES.md">Owner corrections and separate proposed prose diff</a> · <a href="prompts.json">Exact built-in imagegen prompts</a> · <a href="manifest.json">Selected assets and hashes</a> · <a href="TECHNICAL_QA.md">QA</a> · <a href="../index.html">Previous package</a></p>'
    body+='<h2>Current print · seated adult at camera edge</h2><p>Three whole empty chairs, a larger portion of fourth chair, and a properly scaled seated visitor. Lower torso, lap, thighs and knees may appear under the owner’s revised direction. Both shoes face the camera. Head and face stay outside frame.</p><div class="row">'+figure('F')+figure('G')+'</div><details open><summary>Inspection before / after · native</summary><img src="previews/before-after-G.png" width="1170" height="491" alt="Inspection before and after"></details><details><summary>Slot before / after · native</summary><img src="previews/before-after-F.png" width="232" height="136" alt="Transparent icon before and after"></details>'
    body+='<h2>Album sequence · original wide photographic look</h2><p>The final two photographs have sideways misalignment at the original wide camera distance and chair scale. They do not adopt the inventory print’s closer view. Historical absence stays separate from the current visitor.</p>'+''.join(figure(x) for x in 'CDE')+'<details open><summary>Page3 before / after · native</summary><img src="previews/before-after-E.png" width="1168" height="318" alt="Wide album page3 before and after"></details><p><a href="previews/album-chronology.png">Updated chronological sheet</a> · <a href="previews/photo-slot-inspection.png">Updated slot/inspection sheet</a></p>'
    body+='<h2>Gallery / conversation · preserved</h2><div class="row">'+figure('A')+figure('B')+'</div><details><summary>Preserved gallery4× · exact nearest-neighbor</summary><img src="../previews/gallery-4x.png" width="1256" height="824" alt="Unchanged gallery at exact4×"></details><details><summary>Preserved House contact sheet</summary><img src="../previews/house-contact-sheet.png" width="1002" height="738" alt="Established House continuity"></details>'
    body+='<h2>Preserved intermediate versions</h2><p>The too-small-leg inspectorv03 and rejected zoomed albumv02 remain in generation-source, alongside all selected source renders. Previous native assets are unchanged in the parent package.</p><p><a href="technical-qa.json">Machine-readable QA</a> · <a href="README.md">Revision notes</a> · <a href="../PMO_HANDOFF.md">Prior PMO compatibility proposal</a></p><p>No story JSON, gameplay, engine, production art or public Art Lab changes.</p>'
    css='body{margin:28px;background:#172223;color:#f1e9d8;font:16px/1.55 system-ui}h1,h2{color:#fae2b9}a{color:#94ded4}h2{margin-top:36px}p{max-width:1050px}code{overflow-wrap:anywhere}.row{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start}figure{margin:12px 0 24px}figcaption{font-weight:bold;margin-bottom:10px}img{display:block;image-rendering:pixelated;max-width:none}details{border:1px solid #65807c;padding:12px;overflow:auto;margin:12px 0}summary{cursor:pointer}.alpha{background:conic-gradient(#89928b 25%,#677574 0 50%,#89928b 0 75%,#677574 0);background-size:16px 16px}'
    (HERE/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private framing revision</title><style>'+css+'</style><body>'+body+'</body></html>')
    print(json.dumps({'currentCandidates':7,'newImages':3,'priorPNGsPreserved':count,'newSourceRenders':len(sources),'gallery':str(HERE/'index.html')}))

if __name__=='__main__':main()
