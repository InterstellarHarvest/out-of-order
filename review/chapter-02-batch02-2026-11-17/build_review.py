"""Deterministic Batch2 exports from preserved built-in image_gen sources.
Python3 + Pillow. Run from any directory. Never writes outside this review folder.
"""
from pathlib import Path
from PIL import Image, ImageDraw
from collections import Counter
import hashlib,json,math

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parent.parent
BASE=ROOT.parent/'chapter-02-batch01-2026-11-15'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def px(im):return list(im.get_flattened_data())
def save(im,p):
    target=ROOT/p;target.parent.mkdir(parents=True,exist_ok=True);im.save(target)
def preview(im,stem):
    save(im,f'previews/{stem}-native.png')
    large=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST)
    save(large,f'previews/{stem}-4x.png')
    for y in range(im.height):
        row=[im.getpixel((x,y)) for x in range(im.width) for _ in range(4)]
        for dy in range(4):assert px(large.crop((0,y*4+dy,large.width,y*4+dy+1)))==row
def compare(images,labels,stem):
    board=Image.new('RGB',(len(images)*322+8,232),(22,42,48));d=ImageDraw.Draw(board)
    for i,(im,label) in enumerate(zip(images,labels)):
        d.text((8+i*322,4),label,fill=(246,241,222));board.paste(im,(8+i*322,22))
    preview(board,stem)

records=json.loads((ROOT/'generation-records.json').read_text())
assert set(records['assets'])==set('ABCDEFG'),'seven actual generated inputs required'
palette=json.loads((BASE/'palette.json').read_text())
colors=[tuple(c) for c in palette['rgb']];color_set=set(colors)
pal=Image.new('P',(1,1));pal.putpalette([v for c in colors for v in c]*4)
(ROOT/'palette.json').write_text(json.dumps({'method':'Exact existing selected Batch1 64-paint palette; no retraining, no dithering','source':'../chapter-02-batch01-2026-11-15/palette.json','sourceSha256':sha(BASE/'palette.json'),'rgb':palette['rgb']},indent=2)+'\n')
assets=[];outputs={}
for key,record in records['assets'].items():
    raw_path=ROOT/record['source'];raw=Image.open(raw_path)
    assert raw.convert('RGBA').getchannel('A').getextrema()==(255,255),(key,'source opacity')
    native=raw.convert('RGB').resize((314,206),Image.Resampling.NEAREST)
    out=native.quantize(palette=pal,dither=Image.Dither.NONE).convert('RGB')
    quantized=out.copy();signage=None
    if key=='B':
        # Local type polish: retain the respirator, stripe, plate and lower bars;
        # replace only malformed microlettering with deliberate administrative bars.
        box=(54,149,86,166);draw=ImageDraw.Draw(out)
        draw.rectangle((54,149,85,165),fill=(219,203,176))
        for x,y,w in [(56,151,27),(56,157,23),(56,163,19)]:draw.rectangle((x,y,x+w-1,y+1),fill=(41,78,77))
        mask=Image.new('L',out.size,0);md=ImageDraw.Draw(mask);md.rectangle((54,149,85,165),fill=255)
        diff=Image.new('L',out.size,0);diff.putdata([255 if a!=b else 0 for a,b in zip(px(quantized),px(out))])
        outside=sum(v and not a for v,a in zip(px(diff),px(mask)));assert outside==0
        save(mask,'masks/B-notice-allowed.png');save(diff,'masks/B-notice-changed.png')
        signage={'allowedBox':list(box),'changedPixels':sum(v>0 for v in px(diff)),'outsideAllowedChanges':outside,'method':'native opaque paint and three2px administrative bars; existing palette only'}
    stem=key+'-'+record['key'].split('/')[-1].replace('_','-')
    path=f'candidates/{stem}.png'
    assert set(px(out))<=color_set
    save(out,path);preview(out,stem);outputs[key]=out
    distances=[sum((a-b)**2 for a,b in zip(c,d)) for c,d in zip(px(native),px(quantized))]
    isolated=0;same=0;edges=0
    for y in range(206):
        for x in range(314):
            c=out.getpixel((x,y));near=[out.getpixel((nx,ny)) for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)] if 0<=nx<314 and 0<=ny<206]
            if c not in near:isolated+=1
            for nx,ny in [(x+1,y),(x,y+1)]:
                if nx<314 and ny<206:edges+=1;same+=c==out.getpixel((nx,ny))
    assets.append({'id':key,'registryKey':'scenes:'+record['key'],'status':'generated','selected':False,
                   'candidatePath':path,'assetPath':None,'dimensions':[314,206],'mode':'RGB','sha256':sha(ROOT/path),
                   'source':record['source'],'sourceSha256':sha(raw_path),'sourceSize':list(raw.size),'sourceMode':raw.mode,
                   'normalization':'whole-canvas NEAREST to314x206, no crop or padding; existing64-color palette, no dithering; B has recorded local notice polish',
                   'localSignageEdit':signage,
                   'aspectRatioCorrectionPercent':round(abs((raw.width/raw.height)/(314/206)-1)*100,6),
                   'visibleColors':len(set(px(out))),'paletteMembershipVerified':True,'opaqueVerified':True,
                   'rgbQuantizationRmse':round(math.sqrt(sum(distances)/len(distances)/3),3),
                   'rgbQuantizationDistanceP95':round(math.sqrt(sorted(distances)[int(len(distances)*.95)]),3),
                   'isolatedFourNeighborPixels':isolated,'isolatedFraction':round(isolated/(314*206),6),
                   'equalNeighborEdgeFraction':round(same/edges,6),'exact4xVerified':True,
                   'references':[{'path':p,'sha256':sha(ROOT/p),'role':role} for p,role in zip(record['references'],record['referenceRoles'])]})

contact=Image.new('RGB',(974,700),(22,42,48));d=ImageDraw.Draw(contact)
for i,(k,im) in enumerate(outputs.items()):
    x=8+(i%3)*322;y=6+(i//3)*232
    d.text((x,y),k+' / '+records['assets'][k]['key'].split('/')[-1].upper(),fill=(246,241,222));contact.paste(im,(x,y+18))
preview(contact,'seven-scenes')
selected={k:Image.open(ROOT/'references'/name).convert('RGB') for k,name in {'A':'A-conveniences-bureau.png','C':'C-formal-entrance.png','D':'D-service-entry.png','E':'E-jungle-junction.png'}.items()}
compare([selected['A'],outputs['A'],selected['E']],['SELECTED BUREAU / STYLE','NEW CONTROL TOWER','SELECTED JUNCTION / WORLD'],'tower-continuity')
compare([selected['E'],outputs['B'],outputs['D']],['SELECTED JUNCTION','NEW SPORE GARDEN','NEW DAMAGED WALKWAY'],'garden-walkway-continuity')
compare([selected['E'],outputs['C'],outputs['F']],['SELECTED JUNCTION / TRAM','NEW TOUR TRAM','NEW OVERGROWN TRAM'],'tram-continuity')
compare([selected['E'],outputs['E'],outputs['G']],['SELECTED JUNCTION','NEW MOVING FOREST','NEW SENSOR GALLERY'],'forest-sensor-continuity')
compare([selected['D'],outputs['G']],['SELECTED SERVICE ENTRY','NEW SENSOR GALLERY'],'service-sensor-continuity')
compare([outputs['C'],outputs['F']],['TOUR TRAM / FIRST BOARDING','OVERGROWN / AUTHORED LATER STATE'],'tram-before-after')
rejected=json.loads((ROOT/'rejected/style-study-v01/manifest.json').read_text())
rejected_board=Image.new('RGB',(974,468),(22,42,48));d=ImageDraw.Draw(rejected_board)
for i,(k,record) in enumerate(rejected['records'].items()):
    raw=Image.open(ROOT/record['source']).convert('RGB');im=raw.resize((314,206),Image.Resampling.NEAREST).quantize(palette=pal,dither=Image.Dither.NONE).convert('RGB')
    x=8+(i%3)*322;y=6+(i//3)*232;d.text((x,y),k+' / REJECTED STYLE STUDY',fill=(246,241,222));rejected_board.paste(im,(x,y+18))
preview(rejected_board,'rejected-style-studies')
palette_view=Image.new('RGB',(512,128));d=ImageDraw.Draw(palette_view)
for i,c in enumerate(colors):d.rectangle(((i%16)*32,(i//16)*32,(i%16+1)*32-1,(i//16+1)*32-1),fill=c)
save(palette_view,'previews/palette.png')

baseline=json.loads((ROOT/'baseline-hashes.json').read_text())
violations=[p for p,h in baseline.items() if not(REPO/p).exists() or sha(REPO/p)!=h]
assert not violations,violations
refs=json.loads((ROOT/'references/manifest.json').read_text())
for r in refs.values():assert sha(ROOT/r['referencePath'])==r['sha256']
display={}
for file,original in [('A-conveniences-bureau-selected-4x.png','A-conveniences-bureau.png'),('E-jungle-junction-selected-4x.png','E-jungle-junction.png'),('D-service-entry-selected-4x.png','D-service-entry.png')]:
    im=Image.open(ROOT/'references'/original);big=Image.open(ROOT/'references'/file)
    assert px(im.resize((1256,824),Image.Resampling.NEAREST))==px(big)
    display[file]={'source':original,'transform':'exact4x NEAREST','sha256':sha(ROOT/'references'/file)}
(ROOT/'references/display-reference-manifest.json').write_text(json.dumps(display,indent=2)+'\n')
qa={'passed':True,'candidateCount':7,'dimensions':[314,206],'mode':'RGB','scenePreviewDimensions':[1256,824],
    'sharedPalette':'Exact selected Batch1 64-paint palette','noDithering':True,'noCroppingOrPadding':True,
    'allSourcesOpaque':True,'originalFilesPreserved':len(baseline),'preservationViolations':violations,
    'allSevenSelectedBatch1HashesVerified':True,'styleFeedback':'Owner accepted corrected rendering style after tower calibration; first five graphic studies rejected. New candidates remain unselected.',
    'densityNote':'Four-neighbor singleton and equal-edge fractions are descriptive. Fine glazing, foliage, grating and intentional spores contribute small pixels. Visual inspection remains separate from technical success.',
    'assets':assets}
(ROOT/'qa.json').write_text(json.dumps(qa,indent=2)+'\n')
(ROOT/'manifest.json').write_text(json.dumps({'canonicalSourceCommit':records['canonicalSource'],'artworkBaseline':records['artworkBaseline'],'branch':'agent/ch02-art-batch02-biopark-routes','status':'generated','assets':assets},indent=2)+'\n')
inputs=[p for folder in ['generation-source','prompts','sources','references'] for p in (ROOT/folder).rglob('*') if p.is_file()]
(ROOT/'SOURCE_SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in sorted(inputs)))
(ROOT/'PNG_SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in sorted(ROOT.rglob('*.png'))))
print(json.dumps({'passed':True,'preservedFiles':len(baseline),'assets':[{k:a[k] for k in ['id','visibleColors','rgbQuantizationRmse','isolatedFraction']} for a in assets]},indent=2))
