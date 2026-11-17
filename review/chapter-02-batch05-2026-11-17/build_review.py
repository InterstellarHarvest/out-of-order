"""Batch5 deterministic native exports from preserved genuine image_gen outputs.
Python3 + Pillow. No scene synthesis or writes outside this review folder.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import json, hashlib, math, sys, PIL

ROOT=Path(__file__).resolve().parent;REPO=ROOT.parent.parent
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def px(im):return list(im.get_flattened_data())
def save(im,p):
    dest=ROOT/p;dest.parent.mkdir(parents=True,exist_ok=True);im.save(dest)
def preview(im,stem):
    save(im,f'previews/{stem}-native.png')
    expected=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST)
    save(expected,f'previews/{stem}-4x.png');actual=Image.open(ROOT/f'previews/{stem}-4x.png')
    assert actual.size==expected.size and actual.mode==expected.mode and actual.tobytes()==expected.tobytes()
def compare(images,labels,stem):
    board=Image.new('RGB',(sum(im.width for im in images)+8*(len(images)+1),max(im.height for im in images)+30),(22,42,48));d=ImageDraw.Draw(board);x=8
    for im,label in zip(images,labels):d.text((x,4),label,fill=(246,241,222));board.paste(im,(x,22));x+=im.width+8
    preview(board,stem)

records=json.loads((ROOT/'generation-records.json').read_text());assert set(records['assets'])==set('ABCDE')
palette_source=ROOT.parent/'chapter-02-batch01-2026-11-15/palette.json';palette=json.loads(palette_source.read_text());colors=[tuple(c) for c in palette['rgb']];allowed=set(colors)
pal=Image.new('P',(1,1));pal.putpalette([v for c in colors for v in c]*4)
(ROOT/'palette.json').write_text(json.dumps({'source':'../chapter-02-batch01-2026-11-15/palette.json','sourceSha256':sha(palette_source),'method':'Exact existing owner-selected64-paint palette; no retraining or dithering','rgb':palette['rgb']},indent=2)+'\n')
assets=[];outputs={}
for key,r in records['assets'].items():
    source=ROOT/r['source'];raw=Image.open(source);original=Path(r['originalToolPath'])
    if original.exists():assert sha(source)==sha(original),'Raw generation copy changed:'+key
    assert raw.convert('RGBA').getchannel('A').getextrema()==(255,255)
    native=raw.convert('RGB').resize((314,206),Image.Resampling.NEAREST)
    out=native.quantize(palette=pal,dither=Image.Dither.NONE).convert('RGB')
    assert set(px(out))<=allowed and out.mode=='RGB' and out.size==(314,206)
    stem=Path(r['source']).stem.removesuffix('-v01');path=f'candidates/{stem}.png';save(out,path);preview(out,stem);outputs[key]=out
    assert Image.open(ROOT/f'previews/{stem}-native.png').tobytes()==out.tobytes()
    error=[sum((a-b)**2 for a,b in zip(s,c)) for s,c in zip(px(native),px(out))]
    arr=px(out);isolated=0
    for y in range(206):
        for x in range(314):
            c=arr[y*314+x];near=[arr[ny*314+nx] for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)] if 0<=nx<314 and 0<=ny<206]
            if c not in near:isolated+=1
    assets.append({'id':key,'registryKey':r['key'],'status':'generated','selected':False,'candidatePath':path,'assetPath':None,'dimensions':[314,206],'mode':'RGB','sha256':sha(ROOT/path),'source':r['source'],'sourceSha256':sha(source),'sourceSize':list(raw.size),'sourceMode':raw.mode,'sourceOpacityVerified':True,'normalization':'Full-canvas NEAREST to314x206; exact existing64-paint palette, no dithering, no crop/pad; no local repainting','aspectRatioCorrectionPercent':round(abs((raw.width/raw.height)/(314/206)-1)*100,6),'visibleColors':len(set(arr)),'rgbQuantizationRmse':round(math.sqrt(sum(error)/len(error)/3),3),'isolatedFourNeighborPixels':isolated,'isolatedFraction':round(isolated/(314*206),6),'paletteMembershipVerified':True,'exact4xVerified':True,'references':[{'path':p,'sha256':sha(ROOT/p),'role':role} for p,role in zip(r['references'],r['referenceRoles'])]})

board=Image.new('RGB',(974,474),(22,42,48));d=ImageDraw.Draw(board)
for i,(k,im) in enumerate(outputs.items()):
    x=8+(i%3)*322;y=6+(i//3)*236;d.text((x,y),k+' / '+records['assets'][k]['key'].split('/')[-1].upper(),fill=(246,241,222));board.paste(im,(x,y+20))
preview(board,'five-scenes')
def ref(name):return Image.open(ROOT/'references'/name).convert('RGB')
compare([ref('batch3-G-waste-chute.png'),outputs['A'],outputs['C']],['APPROVED WASTE CHUTE','NEW LOWER IRRIGATION','NEW MAINTENANCE EXIT'],'service-route-continuity')
compare([ref('batch4-F-abandoned-station.png'),outputs['A']],['APPROVED UNDERGROUND STATION','NEW IRRIGATION PASSAGE'],'underground-material-continuity')
compare([outputs['B'],outputs['C'],outputs['D']],['CLOSED PUBLIC WALL BOX','CLOSED INDUSTRIAL LOCKER','CLOSED CUSTOMS DISPENSER'],'closed-treatment-containers')
compare([ref('batch2-A-control-tower.png'),outputs['B'],outputs['E']],['APPROVED CONTROL TOWER','NEW PUBLIC-SIDE EXIT','NEW PUBLIC CONCOURSE'],'public-route-continuity')
compare([ref('batch3-A-authorization-archive.png'),outputs['D']],['APPROVED ADMINISTRATIVE MACHINERY','NEW AGRICULTURAL CUSTOMS'],'customs-material-continuity')
compare([ref('batch4-C-concourse-crash.png'),outputs['E']],['APPROVED CONCOURSE / CRASH LOCATION','NEW QUIET INTACT CONCOURSE BAY'],'concourse-architecture-continuity')
swatch=Image.new('RGB',(512,128));d=ImageDraw.Draw(swatch)
for i,c in enumerate(colors):d.rectangle(((i%16)*32,(i//16)*32,(i%16+1)*32-1,(i//16+1)*32-1),fill=c)
save(swatch,'previews/palette.png')
baseline=json.loads((ROOT/'baseline-hashes.json').read_text());bad=[p for p,h in baseline.items() if not(REPO/p).exists() or sha(REPO/p)!=h];assert not bad,bad
refs=json.loads((ROOT/'references/manifest.json').read_text())
for name,r in refs.items():
    assert sha(ROOT/'references'/name)==r['sha256'],name
    if name.endswith('-4x.png'):
        a=Image.open(ROOT/'references'/name.replace('-4x.png','.png'));b=Image.open(ROOT/'references'/name)
        assert a.mode==b.mode and a.resize((a.width*4,a.height*4),Image.Resampling.NEAREST).tobytes()==b.tobytes(),name
qa={'passed':True,'candidateCount':5,'sceneCount':5,'nativeDimensions':[314,206],'nativeMode':'RGB','scenePreviewDimensions':[1256,824],'sourceGenerationCount':len(list((ROOT/'generation-source').glob('*.png'))),'sharedPaletteColors':64,'dithering':'none','croppingOrPadding':'none','localPixelRepainting':'none: generated signage already uses nonletter bars/pictograms','originalTrackedFilesPreserved':len(baseline),'preservationFailures':bad,'approvedReferenceHashesVerified':len(refs),'allCandidatesUnselected':True,'allProductionPathsNull':True,'densityNote':'Singleton/RMSE metrics are descriptive, not creative approval. Native readability requires visual assessment.','environment':{'python':sys.version,'pillow':PIL.__version__},'assets':assets}
(ROOT/'qa.json').write_text(json.dumps(qa,indent=2)+'\n')
(ROOT/'manifest.json').write_text(json.dumps({'canonicalSourceCommit':records['canonicalSource'],'artworkBaseline':records['artworkBaseline'],'branch':'agent/ch02-art-batch05-irrigation-exits','status':'generated','assets':assets},indent=2)+'\n')
(ROOT/'processing-history/normalization-v01.json').write_text(json.dumps({'method':'Direct whole-canvas NEAREST sampling and existing fixed palette; no subsequent edits or discarded generation variants','assets':[{'source':a['source'],'sourceSha256':a['sourceSha256'],'candidate':a['candidatePath'],'sha256':a['sha256']} for a in assets]},indent=2)+'\n')
hash_doc='# Five generated Batch5 candidates\n\nPaths relative to this review folder. Generated, unselected; production assetPath:null.\n\n| ID | Registry key | Native candidate path | Dimensions / mode | SHA-256 |\n|---|---|---|---|---|\n'
for a in assets:hash_doc+='| '+a['id']+' | `'+a['registryKey']+'` | `'+a['candidatePath']+'` | 314×206 RGB | `'+a['sha256']+'` |\n'
(ROOT/'CANDIDATE_HASHES.md').write_text(hash_doc)
inputs=[p for folder in ['generation-source','prompts','sources','references'] for p in (ROOT/folder).rglob('*') if p.is_file()]
(ROOT/'SOURCE_SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in sorted(inputs)))
(ROOT/'PNG_SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in sorted(ROOT.rglob('*.png'))))
print(json.dumps({'passed':True,'preservedFiles':len(baseline),'approvedReferences':len(refs),'assets':[{k:a[k] for k in ['id','sha256','visibleColors','rgbQuantizationRmse','isolatedFraction']} for a in assets]},indent=2))
