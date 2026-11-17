"""Batch3 deterministic native exports from preserved genuine image_gen sources.
Python3+Pillow. No source generation, no writes outside this new review folder.
"""
from pathlib import Path
from PIL import Image,ImageDraw
import json,hashlib,math

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parent.parent
PALETTE_SOURCE=ROOT.parent/'chapter-02-batch01-2026-11-15/palette.json'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def px(im):return list(im.get_flattened_data())
def save(im,p):
    target=ROOT/p;target.parent.mkdir(parents=True,exist_ok=True);im.save(target)
def preview(im,stem):
    save(im,f'previews/{stem}-native.png')
    big=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST);save(big,f'previews/{stem}-4x.png')
    for y in range(im.height):
        row=[im.getpixel((x,y)) for x in range(im.width) for _ in range(4)]
        for dy in range(4):assert px(big.crop((0,y*4+dy,big.width,y*4+dy+1)))==row
def compare(images,labels,stem):
    board=Image.new('RGB',(len(images)*322+8,232),(22,42,48));d=ImageDraw.Draw(board)
    for i,(im,label) in enumerate(zip(images,labels)):
        d.text((8+i*322,4),label,fill=(246,241,222));board.paste(im,(8+i*322,22))
    preview(board,stem)

records=json.loads((ROOT/'generation-records.json').read_text());assert set(records['assets'])==set('ABCDEFG')
palette=json.loads(PALETTE_SOURCE.read_text());colors=[tuple(c) for c in palette['rgb']];allowed=set(colors)
pal=Image.new('P',(1,1));pal.putpalette([v for c in colors for v in c]*4)
(ROOT/'palette.json').write_text(json.dumps({'method':'Exact shared owner-selected Batch1/2 64-paint palette; no retraining, no dithering','source':'../chapter-02-batch01-2026-11-15/palette.json','sourceSha256':sha(PALETTE_SOURCE),'rgb':palette['rgb']},indent=2)+'\n')
assets=[];outputs={}
for key,record in records['assets'].items():
    source=ROOT/record['source'];raw=Image.open(source)
    assert raw.convert('RGBA').getchannel('A').getextrema()==(255,255)
    native=raw.convert('RGB').resize((314,206),Image.Resampling.NEAREST)
    out=native.quantize(palette=pal,dither=Image.Dither.NONE).convert('RGB')
    quantized=out.copy();local_edit=None
    if key in ['D','E']:
        regions=([(53,35),(104,44),(104,61),(53,53)],[(36,97),(79,97),(79,115),(36,115)]) if key=='D' else ([(67,30),(120,38),(120,56),(67,48)],)
        mask=Image.new('L',out.size,0);md=ImageDraw.Draw(mask);paint=out.copy();draw=ImageDraw.Draw(paint)
        for region in regions:
            md.polygon(region,fill=255);draw.polygon(region,fill=(219,203,176))
        ink=(41,78,77)
        if key=='D':
            for a,b,w in [((57,39),(99,46),2),((60,45),(96,51),2),((64,51),(92,55),1)]:draw.line((a,b),fill=ink,width=w)
            draw.rectangle((36,97,79,115),fill=(244,227,198))
            for x,y,w in [(39,99,25),(39,103,21),(39,107,27),(39,111,18)]:draw.line((x,y,x+w-1,y),fill=ink)
            draw.rectangle((72,103,76,107),outline=(170,50,35))
        else:
            for a,b,w in [((72,35),(115,42),2),((77,41),(110,46),2),((82,47),(105,51),1)]:draw.line((a,b),fill=ink,width=w)
        out.paste(paint,(0,0),mask)
        diff=Image.new('L',out.size,0);diff.putdata([255 if a!=b else 0 for a,b in zip(px(quantized),px(out))])
        outside=sum(v>0 and a==0 for v,a in zip(px(diff),px(mask)));assert outside==0
        save(mask,f'masks/{key}-signage-allowed.png');save(diff,f'masks/{key}-signage-changed.png')
        compare([quantized,out],[key+' BEFORE TYPE POLISH',key+' AFTER LOCAL SIGNAGE POLISH'],key+'-signage-before-after')
        local_edit={'regions':[list(map(list,region)) for region in regions],'method':'Replace unreadable generated microlettering with native opaque administrative bars; preserve sign pictograms and all outside pixels','changedPixels':sum(v>0 for v in px(diff)),'outsideAllowedChanges':outside}
    stem=key+'-'+record['key'].split('/')[-1].replace('_','-');path=f'candidates/{stem}.png'
    assert set(px(out))<=allowed
    save(out,path);preview(out,stem);outputs[key]=out
    distances=[sum((a-b)**2 for a,b in zip(c,d)) for c,d in zip(px(native),px(quantized))]
    isolated=0;same=0;edges=0
    for y in range(206):
        for x in range(314):
            c=out.getpixel((x,y));near=[out.getpixel((nx,ny)) for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)] if 0<=nx<314 and 0<=ny<206]
            if c not in near:isolated+=1
            for nx,ny in [(x+1,y),(x,y+1)]:
                if nx<314 and ny<206:edges+=1;same+=c==out.getpixel((nx,ny))
    assets.append({'id':key,'registryKey':'scenes:'+record['key'],'status':'generated','selected':False,'candidatePath':path,'assetPath':None,'dimensions':[314,206],'mode':'RGB','sha256':sha(ROOT/path),'source':record['source'],'sourceSha256':sha(source),'sourceSize':list(raw.size),'sourceMode':raw.mode,'normalization':'Full-canvas NEAREST to314x206, no cropping/padding; existing64-paint palette, no dithering; D/E have recorded local signage polish','localNativeEdit':local_edit,'aspectRatioCorrectionPercent':round(abs((raw.width/raw.height)/(314/206)-1)*100,6),'visibleColors':len(set(px(out))),'rgbQuantizationRmse':round(math.sqrt(sum(distances)/len(distances)/3),3),'isolatedFourNeighborPixels':isolated,'isolatedFraction':round(isolated/(314*206),6),'equalNeighborEdgeFraction':round(same/edges,6),'sourceOpacityVerified':True,'paletteMembershipVerified':True,'exact4xVerified':True,'references':[{'path':p,'sha256':sha(ROOT/p),'role':role} for p,role in zip(record['references'],record['referenceRoles'])]})

contact=Image.new('RGB',(974,700),(22,42,48));d=ImageDraw.Draw(contact)
for i,(k,im) in enumerate(outputs.items()):
    x=8+(i%3)*322;y=6+(i//3)*232;d.text((x,y),k+' / '+records['assets'][k]['key'].split('/')[-1].upper(),fill=(246,241,222));contact.paste(im,(x,y+18))
preview(contact,'seven-scenes')
def reference(p):return Image.open(ROOT/'references'/p).convert('RGB')
tower=reference('batch2-A-control-tower.png');sensor=reference('batch2-G-sensor-gallery.png');keeper=reference('batch1-B-groundskeeper.png');service=reference('batch1-D-service-entry.png')
compare([tower,outputs['A']],['APPROVED CONTROL TOWER','NEW AUTHORIZATION ARCHIVE'],'tower-archive-continuity')
compare([sensor,outputs['B'],outputs['C']],['APPROVED SENSOR GALLERY','NEW CENTRAL FLOWER','NEW TRANSLATOR'],'sensor-flower-translator-continuity')
compare([keeper,outputs['D'],outputs['F']],['APPROVED GROUNDSKEEPER','NEW PLANTING MACHINE','NEW BULK HOPPER'],'groundskeeper-machinery-continuity')
compare([outputs['D'],outputs['E'],outputs['F']],['SHALLOW PLANTING BED','SORTING CONVEYOR','BULK SOIL HOPPER'],'distinct-machinery-functions')
compare([outputs['D'],outputs['G'],service],['PLANTER DISPOSAL HATCH','NEW DISPOSAL CHUTE','APPROVED SERVICE MATERIALS'],'planter-chute-service-continuity')
previous=Image.open(ROOT/'generation-source/C-translator-machine-v01.png').convert('RGB').resize((314,206),Image.Resampling.NEAREST).quantize(palette=pal,dither=Image.Dither.NONE).convert('RGB')
compare([previous,outputs['C']],['SUPERSEDED: DOOR PREMATURELY VISIBLE','CURRENT: PRE-RECOIL ROOT COVER'],'translator-state-correction')
swatch=Image.new('RGB',(512,128));d=ImageDraw.Draw(swatch)
for i,c in enumerate(colors):d.rectangle(((i%16)*32,(i//16)*32,(i%16+1)*32-1,(i//16+1)*32-1),fill=c)
save(swatch,'previews/palette.png')
baseline=json.loads((ROOT/'baseline-hashes.json').read_text());bad=[p for p,h in baseline.items() if not(REPO/p).exists() or sha(REPO/p)!=h];assert not bad,bad
ref_manifest=json.loads((ROOT/'references/manifest.json').read_text())
for name,r in ref_manifest.items():
    assert sha(ROOT/'references'/name)==r['sha256'],name
    if name.endswith('-4x.png'):
        native_name=name.replace('-4x.png','.png');im=reference(native_name);big=reference(name)
        assert px(im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST))==px(big),name
qa={'passed':True,'candidateCount':7,'nativeDimensions':[314,206],'nativeMode':'RGB','scenePreviewDimensions':[1256,824],'sourceGenerationCount':len(list((ROOT/'generation-source').glob('*.png'))),'sharedPaletteColors':64,'dithering':'none','croppingOrPadding':'none','sourceAlphaHandling':'assert every pixel opaque; export RGB','originalTrackedFilesPreserved':len(baseline),'preservationFailures':bad,'approvedReferenceHashesVerified':len(ref_manifest),'densityNote':'Four-neighbor singleton and equal-edge metrics are descriptive; foliage, grating, paper holes and thin machine edges create legitimate small clusters. Visual approval is separate.','assets':assets}
(ROOT/'qa.json').write_text(json.dumps(qa,indent=2)+'\n')
(ROOT/'manifest.json').write_text(json.dumps({'canonicalSourceCommit':records['canonicalSource'],'artworkBaseline':records['artworkBaseline'],'branch':'agent/ch02-art-batch03-biopark-machinery','status':'generated','assets':assets},indent=2)+'\n')
inputs=[p for folder in ['generation-source','prompts','sources','references'] for p in (ROOT/folder).rglob('*') if p.is_file()]
(ROOT/'SOURCE_SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in sorted(inputs)))
(ROOT/'PNG_SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in sorted(ROOT.rglob('*.png'))))
print(json.dumps({'passed':True,'preservedFiles':len(baseline),'sourceRenders':qa['sourceGenerationCount'],'assets':[{k:a[k] for k in ['id','visibleColors','rgbQuantizationRmse','isolatedFraction']} for a in assets]},indent=2))
