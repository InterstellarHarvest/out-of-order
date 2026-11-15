#!/usr/bin/env python3
"""One wide candidate and comparison; approved conversation is read-only."""
from pathlib import Path
import hashlib, importlib.util, json, subprocess, sys
from PIL import Image
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent
PARENT=HERE.parent
ROOT=HERE.parents[2]
BASE='280167eccf6ad065037e5f22a6394149ed4137d0'
PORTRAIT_SHA='a365560b66e6d4bbb1f865214768a20dfb6bed2a870bd62ab31ce2c5b9f66f4d'
SOURCE=PARENT/'printer-album-restoration-v04/generation-source/gallery-v03.png'
BEFORE=PARENT/'printer-album-restoration-v04/candidates/gallery-v04.png'
REFERENCE=PARENT/'candidates/gallery-candidate-v02.png'
PORTRAIT=PARENT/'printer-album-restoration-v04/candidates/gallery-conversation-v03.png'
spec=importlib.util.spec_from_file_location('gallery_helpers',PARENT/'build_review.py')
helpers=importlib.util.module_from_spec(spec);spec.loader.exec_module(helpers)

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def grille_box(path):
    im=Image.open(path).convert('RGB')
    points={(x,y) for x in range(270,296) for y in range(38,90) if max(im.getpixel((x,y)))<110}
    largest=[]
    while points:
        start=points.pop();stack=[start];group=[]
        while stack:
            x,y=stack.pop();group.append((x,y))
            for dx,dy in [(1,0),(-1,0),(0,1),(0,-1)]:
                other=(x+dx,y+dy)
                if other in points:points.remove(other);stack.append(other)
        if len(group)>len(largest):largest=group
    return [min(x for x,y in largest),min(y for x,y in largest),max(x for x,y in largest)+1,max(y for x,y in largest)+1]

def main():
    assert sha(PORTRAIT)==PORTRAIT_SHA
    dst=HERE/'gallery-v05.png'
    transform=helpers.export(SOURCE,dst,(314,206))
    im=Image.open(dst);assert im.size==(314,206) and im.mode=='RGB'
    boxes={'before':grille_box(BEFORE),'reference':grille_box(REFERENCE),'corrected':grille_box(dst)}
    assert all(abs(a-b)<=1 for a,b in zip(boxes['reference'],boxes['corrected'])),boxes
    helpers.sheet(HERE/'before-after.png',[('Before / gallery-v04',BEFORE),('After / original speaker position',dst)],2,(334,246))
    preserved=0
    for entry in subprocess.check_output(['git','ls-tree','-rz',BASE],cwd=ROOT).split(b'\0'):
        if not entry:continue
        meta,raw=entry.split(b'\t',1);p=raw.decode()
        if p.lower().endswith('.png'):
            data=(ROOT/p).read_bytes();actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
            assert actual==meta.split()[2].decode(),p
            preserved+=1
    assert not subprocess.check_output(['git','diff','--name-only',BASE,'--','story','game','tools/story-import'],cwd=ROOT)
    assert sha(PORTRAIT)==PORTRAIT_SHA
    record={'scope':'One corrected main-scene review candidate; not runtime schema','baseline':BASE,'branch':'agent/ch01-art-batch03-20261115','status':'generated','ownerApproved':False,'assetPath':None,'candidatePath':'gallery-v05.png','dimensions':[314,206],'mode':'RGB','sha256':sha(dst),'sourcePath':'../'+str(SOURCE.relative_to(PARENT)),'sourceSHA256':sha(SOURCE),'sourceSelection':'Reuse saved restored-props gallery-v03 source visually matching owner follow-up example; no new scene redesign','comparisonPath':'before-after.png','comparisonSHA256':sha(HERE/'before-after.png'),'speakerGrilleBounds':boxes,'previousPNGsPreserved':preserved,'approvedPortrait':{'path':'../'+str(PORTRAIT.relative_to(PARENT)),'sha256':PORTRAIT_SHA,'decision':'Owner approved exactly as-is; bytes unchanged'},'interpretation':'Apparent speaker-height difference between wide and close view is camera framing, not physical relocation',**transform}
    (HERE/'manifest.json').write_text(json.dumps(record,indent=2)+'\n')
    body='<h1>Wide gallery · original speaker placement</h1><p>One corrected314×206 main-scene candidate, with restored printer and closed album. The approved564×278 conversation image remains byte-for-byte unchanged. Treat the apparent difference as camera framing.</p><p><a href="gallery-v05.png">Corrected wide candidate</a> · <a href="before-after.png">Before / after PNG</a> · <a href="README.md">Source selection and QA</a> · <a href="manifest.json">Hashes and position check</a></p><img src="before-after.png" width="668" height="246" alt="Wide scene before and after"><details><summary>Corrected wide scene4× · nearest-neighbor presentation</summary><img src="gallery-v05.png" width="1256" height="824" alt="Corrected wide scene exact4×"></details><details><summary>Before4×</summary><img src="../printer-album-restoration-v04/candidates/gallery-v04.png" width="1256" height="824" alt="Previous wide scene exact4×"></details><p>No other artwork produced or altered. Earlier versions preserved. No story JSON, engine or production changes.</p>'
    css='body{margin:28px;background:#172223;color:#f1e9d8;font:16px/1.55 system-ui}a{color:#94ded4}p{max-width:950px}img{display:block;image-rendering:pixelated;max-width:none}details{border:1px solid #65807c;padding:12px;margin:18px 0;overflow:auto}summary{cursor:pointer}'
    (HERE/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Wide speaker placement correction</title><style>'+css+'</style><body>'+body+'</body></html>')
    print(json.dumps({'candidate':str(dst),'speakerBounds':boxes,'previousPNGsUnchanged':preserved,'approvedPortraitUnchanged':True}))

if __name__=='__main__':main()
