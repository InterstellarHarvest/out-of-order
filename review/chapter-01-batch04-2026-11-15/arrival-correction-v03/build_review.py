#!/usr/bin/env python3
"""Arrival-only scene correction; remaining five candidates are read-only."""
from pathlib import Path
import copy, hashlib, html, importlib.util, json, subprocess, sys
from PIL import Image
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent
PARENT=HERE.parent
ROOT=HERE.parents[2]
BASE='fec1ac968fde4244c43a079d7fdac1433d296922'
spec=importlib.util.spec_from_file_location('batch4_review',PARENT/'build_review.py')
base=importlib.util.module_from_spec(spec);spec.loader.exec_module(base)

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    source=HERE/'generation-source/arrival-v03.png';candidate=HERE/'arrival-v03.png'
    transform=base.helpers.export(source,candidate,(314,206))
    im=Image.open(candidate);assert im.mode=='RGB' and im.size==(314,206)
    preview=HERE/'arrival-v03-4x.png';im.resize((1256,824),Image.Resampling.NEAREST).save(preview)
    assert Image.open(preview).tobytes()==im.resize((1256,824),Image.Resampling.NEAREST).tobytes()
    old=json.loads((PARENT/'manifest.json').read_text());assets=copy.deepcopy(old['assets'])
    for a in assets:
        if a['id']=='A':a.update(candidatePath='arrival-v03.png',preview4xPath='arrival-v03-4x.png',sourcePath='generation-source/arrival-v03.png',sourceSHA256=sha(source),sha256=sha(candidate),previewSHA256=sha(preview),uniqueColors=len(set(im.getdata())),**transform)
        else:
            for key in ['candidatePath','preview4xPath','sourcePath']:a[key]='../'+a[key]
            assert sha(HERE/a['candidatePath'])==a['sha256']
            assert sha(HERE/a['preview4xPath'])==a['previewSHA256']
    byid={a['id']:a for a in assets}
    base.helpers.sheet(HERE/'before-after.png',[('Before / named double-door entrance',PARENT/'candidates/arrival-v02.png'),('Corrected / ambiguous single door',candidate)],2,(334,246))
    foyer=PARENT.parent/base.EXISTING['foyer'][1]
    base.helpers.sheet(HERE/'arrival-foyer-route.png',[('Arrival / new corridor-side cue',candidate),('Foyer / unchanged earlier view',foyer)],2,(334,246))
    contact=copy.deepcopy(old['contactSheet']);entries=[]
    titles={a['registryTarget']:a['title'] for a in old['assets']}
    for r in contact:
        if r['scene']=='house_of_tomorrow/arrival':r.update(path=str(candidate.relative_to(ROOT)),sha256=sha(candidate))
        path=ROOT/r['path'];assert sha(path)==r['sha256']
        label=titles.get(r['scene'],r['scene'].split('/')[-1].replace('_',' '))
        entries.append((label+(' / corrected' if r['scene'].endswith('/arrival') else ' / unchanged'),path))
    assert len(contact)==len({r['scene'] for r in contact})==14
    base.helpers.sheet(HERE/'chapter-01-fourteen-scene-contact.png',entries,4,(334,246))
    preserved=0
    for entry in subprocess.check_output(['git','ls-tree','-rz',BASE],cwd=ROOT).split(b'\0'):
        if not entry:continue
        meta,raw=entry.split(b'\t',1);path=raw.decode()
        if path.lower().endswith('.png') or path.startswith(('story/','game/','tools/story-import/')):
            data=(ROOT/path).read_bytes();actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
            assert actual==meta.split()[2].decode(),path
            preserved+=path.lower().endswith('.png')
    record={'scope':'Review only; one changed scene, not runtime schema','branch':'agent/ch01-art-batch04-20261115','baseline':BASE,'tool':'built-in image_gen.imagegen','status':'generated','ownerApproved':False,'changedAssets':['A'],'unchangedAssets':['B','C','D','E','F'],'assets':assets,'contactSheet':contact,'previousPNGsPreserved':preserved,'confirmedCorrections':['one ordinary solid single door','no entrance title or title-over-door panel','no scenic door windows or outdoor-looking vista','ambiguous blue/cream facilities pictogram retained'],'continuity':'Arrival-to-foyer route retained; previous literal double-door match is superseded for this approach candidate. Foyer/public-exit images and narrative unchanged.'}
    (HERE/'manifest.json').write_text(json.dumps(record,indent=2)+'\n')
    def figure(a):
        return '<figure><figcaption>'+html.escape(a['id']+' · '+a['title'])+'</figcaption><img src="'+a['candidatePath']+'" width="314" height="206" alt="'+html.escape(a['title'])+'"><details><summary>Exact4×1256×824</summary><img src="'+a['preview4xPath']+'" width="1256" height="824" alt="'+html.escape(a['title'])+' exact4×"></details></figure>'
    body='<h1>Batch4 · arrival correction</h1><p>One ordinary solid single door; no title/marquee above the door; no scenic door windows or outdoor vista. The ambiguous nearby pictogram can be mistaken for facilities guidance. Clean indoor Exposition architecture and a restrained warm threshold remain.</p><p>Arrival is the ONLY revised environment. The other five candidates and all prior versions are unchanged. New arrival remains generated, pending review.</p><p><a href="arrival-v03.png">Corrected native candidate</a> · <a href="before-after.png">Before/after PNG</a> · <a href="README.md">Short note / continuity</a> · <a href="prompt.json">Built-in imagegen prompt</a> · <a href="manifest.json">Current selection / hashes</a> · <a href="../index.html">Earlier package</a></p><img src="before-after.png" width="668" height="246" alt="Arrival before and after">'+figure(byid['A'])+'<details><summary>Foyer-route comparison — existing foyer art unchanged</summary><img src="arrival-foyer-route.png" width="668" height="246" alt="New arrival and unchanged foyer"></details><h2>Other five Batch4 environments · unchanged</h2>'+''.join(figure(byid[x]) for x in 'BCDEF')+'<h2>Current fourteen-scene sheet</h2><img src="chapter-01-fourteen-scene-contact.png" width="1336" height="984" alt="Current fourteen-scene contact sheet"><p>No story JSON, gameplay, engine, production assets or public deployment changes. The earlier named-exhibit/double-door arrival brief is superseded by this owner correction; exact door-to-foyer staging and the existing title reference in prose are recorded for separate continuity review, not silently solved by inventing another room or off-camera sign.</p>'
    css='body{margin:28px;background:#172223;color:#f1e9d8;font:16px/1.55 system-ui}a{color:#94ded4}h1,h2{color:#fae2b9}p{max-width:1050px}img{display:block;image-rendering:pixelated;max-width:none}figure{margin:24px 0}figcaption{font-weight:bold;margin-bottom:10px}details{padding:12px;border:1px solid #65807c;margin:16px 0;overflow:auto}summary{cursor:pointer}'
    (HERE/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private arrival correction</title><style>'+css+'</style><body>'+body+'</body></html>')
    print(json.dumps({'revisedScene':'arrival only','native':[314,206],'mode':'RGB','otherFiveHashesUnchanged':True,'previousPNGsPreserved':preserved,'gallery':str(HERE/'index.html')}))

if __name__=='__main__':main()
