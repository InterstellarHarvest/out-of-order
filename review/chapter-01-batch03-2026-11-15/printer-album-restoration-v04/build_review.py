#!/usr/bin/env python3
"""Printer/album review exports only; previous images are never overwritten."""
from pathlib import Path
import copy, hashlib, html, importlib.util, json, os, subprocess, sys
from PIL import Image
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent
PARENT=HERE.parent
PREVIOUS=PARENT/'framing-revision-v03'
ROOT=HERE.parents[2]
BASE='0408259318c529e96312fc1b4b4b206fec9ad42c'
BRANCH='agent/ch01-art-batch03-20261115'
spec=importlib.util.spec_from_file_location('gallery_helpers',PARENT/'build_review.py')
helpers=importlib.util.module_from_spec(spec);spec.loader.exec_module(helpers)

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    for name in ['candidates','previews']:(HERE/name).mkdir(exist_ok=True)
    old=json.loads((PREVIOUS/'manifest.json').read_text());assets=copy.deepcopy(old['assets'])
    for a in assets:
        if a['id'] in ['A','B']:
            name='gallery-v04' if a['id']=='A' else 'gallery-conversation-v03'
            src=HERE/'generation-source'/(name+'.png');dst=HERE/'candidates'/(name+'.png')
            if a['id']=='A':
                transform=helpers.export(src,dst,tuple(a['dimensions']))
            else:
                source=Image.open(src).convert('RGB');box=(170,0,1650,1480*278/564)
                out=source.resize((564,278),Image.Resampling.NEAREST,box=box)
                helpers.merge_near_colors(out,12).save(dst)
                transform={'sourceSize':list(source.size),'cropBox':box,'normalization':'Independent portrait source; same v05-scale crop shifted40sourcepixels upward to retain raised bezel; NEAREST564x278; nonspatial existing-color radius12 substitution'}
            im=Image.open(dst);assert im.mode=='RGB' and list(im.size)==a['dimensions']
            a.update(sourcePath=str(src.relative_to(HERE)),candidatePath=str(dst.relative_to(HERE)),sha256=sha(dst),sourceSHA256=sha(src),paletteColors=len(set(im.getdata())),**transform)
        else:
            for key in ['candidatePath','sourcePath']:a[key]=os.path.relpath(PREVIOUS/a[key],HERE)
            assert sha(HERE/a['candidatePath'])==a['sha256']
        a.update(status='generated',ownerApproved=False,assetPath=None)
    byid={a['id']:a for a in assets};candidate=lambda k:HERE/byid[k]['candidatePath']
    for letter in ['A','B']:
        before=next(a for a in old['assets'] if a['id']==letter)
        tile=(334,246) if letter=='A' else (584,318)
        helpers.sheet(HERE/'previews'/('before-after-'+letter+'.png'),[('Before / approved base preserved',PREVIOUS/before['candidatePath']),('After / restored printer and album',candidate(letter))],2,tile)
    Image.open(candidate('A')).resize((1256,824),Image.Resampling.NEAREST).save(HERE/'previews/gallery-4x.png')
    assert Image.open(HERE/'previews/gallery-4x.png').tobytes()==Image.open(candidate('A')).resize((1256,824),Image.Resampling.NEAREST).tobytes()
    helpers.sheet(HERE/'previews/gallery-conversation-spatial.png',[('A / gallery314x206',candidate('A')),('B / complete close-up564x278',candidate('B'))],2,(584,318))
    contact=[('Foyer','chapter-01-speaker-revision-2026-11-15/candidates/foyer-v04.png'),('Dining','chapter-01-speaker-revision-2026-11-15/candidates/dining-v04.png'),('Bathroom','chapter-01-first-pass-2026-11-15/candidates/bathroom.png'),('Lounge','chapter-01-batch02-2026-11-15/candidates/lounge-candidate-v01.png'),('Bedroom','chapter-01-batch02-2026-11-15/candidates/bedroom-candidate-v01.png'),('Passage','chapter-01-batch02-2026-11-15/candidates/passage-candidate-v01.png'),('Chair defaultv04','chapter-01-batch02-2026-11-15/rest-assured-pair-v04/candidates/chair-default-v04.png'),('Chair in-usev04','chapter-01-batch02-2026-11-15/rest-assured-pair-v04/candidates/chair-in-use-v04.png')]
    helpers.sheet(HERE/'previews/house-contact-sheet.png',[(label+' / preserved',PARENT.parent/path) for label,path in contact]+[('Gallery / props restored',candidate('A'))],3,(334,246))
    preserved=[]
    for entry in subprocess.check_output(['git','ls-tree','-rz',BASE],cwd=ROOT).split(b'\0'):
        if not entry:continue
        meta,raw=entry.split(b'\t',1);path=raw.decode()
        if path.lower().endswith('.png') or path.startswith(('story/','game/','tools/story-import/')):
            data=(ROOT/path).read_bytes();actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
            assert actual==meta.split()[2].decode(),path
            preserved.append({'path':path,'sha256':hashlib.sha256(data).hexdigest()})
    sources=[{'path':str(p.relative_to(HERE)),'sha256':sha(p),'dimensions':list(Image.open(p).size),'mode':Image.open(p).mode} for p in sorted((HERE/'generation-source').glob('*.png'))]
    manifest={'scope':'Private review only; not runtime catalog schema','baseline':BASE,'branch':BRANCH,'tool':'built-in image_gen.imagegen','status':'generated','ownerApproved':False,'visualPageOrder':['C','D','E'],'assets':assets,'generationSources':sources,'ownerDirection':'Restore printer and oversized closed album; raise same intercom away from album in main and complete portrait; maintain chair/camera/room design.','supersededSources':['generation-source/gallery-v03.png','generation-source/gallery-conversation-v02.png']}
    (HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    count=sum(x['path'].lower().endswith('.png') for x in preserved)
    qa={'technicalChecks':'passed','creativeApproval':'pending','currentAssets':7,'revisedAssets':['A','B'],'unchangedSelectedAssets':['C','D','E','F','G'],'baseline':BASE,'baselineFilesVerified':len(preserved),'baselinePNGsPreserved':count,'allEarlierPNGsUnchanged':True,'assets':assets,'generationSources':sources,'preserved':preserved,'browserAutomation':'not run'}
    (HERE/'technical-qa.json').write_text(json.dumps(qa,indent=2)+'\n')
    def figure(letter):
        a=byid[letter];w,h=a['dimensions']
        return '<figure><figcaption>'+html.escape(letter+' · '+a['title'])+'</figcaption><img class="'+('alpha' if letter=='F' else '')+'" src="'+a['candidatePath']+'" width="'+str(w)+'" height="'+str(h)+'" alt="'+html.escape(a['title'])+'"><p>'+str(w)+'×'+str(h)+' · '+a['mode']+' · generated / approval pending</p></figure>'
    body='<h1>Gallery · printer and album restored</h1><p>Current seven-candidate Chapter1 Batch3 review. Only A/B are new. The owner-approved chair row, short ceiling camera/hatch, room and intercom model are retained; a cream photograph printer and oversized closed coral album return to the counter. The wall intercom is raised to leave clear wall above the album in both views.</p><p>Private branch <code>'+BRANCH+'</code> · baseline <code>'+BASE+'</code>. Final remote-verified commit SHA is reported in the owner handoff.</p><p><a href="README.md">Restoration notes</a> · <a href="prompts.json">Built-in imagegen prompts</a> · <a href="manifest.json">Current selected assets/hashes</a> · <a href="technical-qa.json">QA</a> · <a href="../framing-revision-v03/index.html">Previous review snapshot</a></p>'
    body+='<h2>Restored gallery and matching conversation view</h2><div class="row">'+figure('A')+figure('B')+'</div><details open><summary>Gallery before / after · native</summary><img src="previews/before-after-A.png" width="668" height="246" alt="Gallery props restored comparison"></details><details><summary>Conversation before / after · native</summary><img src="previews/before-after-B.png" width="1168" height="318" alt="Matching close-up counter context"></details><details><summary>Gallery4× · exact nearest-neighbor</summary><img src="previews/gallery-4x.png" width="1256" height="824" alt="Restored gallery exact4×"></details><p><a href="previews/gallery-conversation-spatial.png">Download native scene/portrait comparison</a></p>'
    body+='<h2>Historical album · unchanged</h2><p>Same simple pixel figures and wide photographic look. Final two frames keep their sideways misalignment. No taking camera appears inside photographs; the album stays closed in the main room to preserve these discoveries.</p>'+''.join(figure(x) for x in 'CDE')+'<p><a href="../framing-revision-v03/previews/album-chronology.png">Unchanged chronological sheet</a></p>'
    body+='<h2>Current print · unchanged</h2><p>Three whole empty chairs and a cropped seated adult at the fourth; shoes face the camera, head/face outside print.</p><div class="row">'+figure('F')+figure('G')+'</div><h2>House continuity</h2><img src="previews/house-contact-sheet.png" width="1002" height="738" alt="House continuity with restored gallery"><p>Earlier artwork versions, all other House rooms, the approved intercom and previous framing corrections are preserved. No story JSON, gameplay, engine, production art or public Art Lab changes.</p>'
    css='body{margin:28px;background:#172223;color:#f1e9d8;font:16px/1.55 system-ui}h1,h2{color:#fae2b9}h2{margin-top:36px}p{max-width:1050px}a{color:#94ded4}code{overflow-wrap:anywhere}img{display:block;image-rendering:pixelated;max-width:none}figure{margin:12px 0 24px}figcaption{font-weight:bold;margin-bottom:10px}.row{display:flex;flex-wrap:wrap;gap:28px;align-items:flex-start}details{overflow:auto;padding:12px;border:1px solid #65807c;margin:12px 0}summary{cursor:pointer}.alpha{background:conic-gradient(#89928b 25%,#677574 0 50%,#89928b 0 75%,#677574 0);background-size:16px 16px}'
    (HERE/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private printer and album restoration</title><style>'+css+'</style><body>'+body+'</body></html>')
    print(json.dumps({'selectedAssets':7,'newImages':2,'previousPNGsPreserved':count,'gallery':str(HERE/'index.html')}))

if __name__=='__main__':main()
