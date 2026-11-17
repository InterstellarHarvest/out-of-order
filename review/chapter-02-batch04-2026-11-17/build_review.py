"""Deterministic native exports from genuine built-in image_gen sources.
Python3 + Pillow only. All writes stay inside this new review folder.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
import json, hashlib, math, sys, PIL

ROOT=Path(__file__).resolve().parent
REPO=ROOT.parent.parent
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def pixels(im): return list(im.get_flattened_data())
def save(im,p):
    target=ROOT/p;target.parent.mkdir(parents=True,exist_ok=True);im.save(target)
def preview(im,stem):
    save(im,f'previews/{stem}-native.png')
    expected=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST)
    save(expected,f'previews/{stem}-4x.png')
    actual=Image.open(ROOT/f'previews/{stem}-4x.png')
    assert actual.size==(im.width*4,im.height*4) and actual.mode==im.mode
    assert actual.tobytes()==expected.tobytes()  # all 4x4 blocks match the native pixel
def compare(images,labels,stem):
    widths=[im.width for im in images];height=max(im.height for im in images)
    board=Image.new('RGB',(sum(widths)+8*(len(images)+1),height+30),(22,42,48));d=ImageDraw.Draw(board);x=8
    for im,label in zip(images,labels):
        d.text((x,4),label,fill=(246,241,222));board.paste(im,(x,22));x+=im.width+8
    preview(board,stem)

records=json.loads((ROOT/'generation-records.json').read_text());assert set(records['assets'])==set('ABCDEF')
palette_source=ROOT.parent/'chapter-02-batch01-2026-11-15/palette.json'
palette=json.loads(palette_source.read_text());colors=[tuple(c) for c in palette['rgb']];allowed=set(colors)
pal=Image.new('P',(1,1));pal.putpalette([v for c in colors for v in c]*4)
(ROOT/'palette.json').write_text(json.dumps({'source':'../chapter-02-batch01-2026-11-15/palette.json','sourceSha256':sha(palette_source),'method':'Exact existing owner-selected 64-paint palette; no retraining or dithering','rgb':palette['rgb']},indent=2)+'\n')
assets=[];outputs={};history=[]
for key,r in records['assets'].items():
    source=ROOT/r['source'];raw=Image.open(source);dim=(564,278) if key in 'DE' else (314,206)
    original=Path(r['originalToolPath'])
    if original.exists():assert sha(source)==sha(original),'Raw tool source copy changed: '+key
    source_alpha=raw.convert('RGBA').getchannel('A')
    assert (source_alpha.getextrema()==(0,255)) if key=='E' else (source_alpha.getextrema()==(255,255))
    native=raw.convert('RGBA').resize(dim,Image.Resampling.NEAREST)
    out=native.convert('RGB').quantize(palette=pal,dither=Image.Dither.NONE).convert('RGB')
    if key=='E':
        out=out.convert('RGBA');out.putalpha(native.getchannel('A'))
        out.putdata([(*c[:3],c[3]) if c[3] else (0,0,0,0) for c in pixels(out)])
        assert out.getchannel('A').tobytes()==native.getchannel('A').tobytes()
    initial=out.copy()
    if key=='E':
        # Established Batch1 foreground export contract: sample source alpha with
        # NEAREST, then threshold128. Preserve the original soft alpha in source
        # and the normalization-v01 archive; no generated character repainting.
        out.putalpha(native.getchannel('A').point(lambda a:255 if a>=128 else 0))
        out.putdata([(*c[:3],c[3]) if c[3] else (0,0,0,0) for c in pixels(out)])
        assert set(pixels(out.getchannel('A')))=={0,255}
    quantized=out.copy();stem=Path(r['source']).stem.removesuffix('-v01');path=f'candidates/{stem}.png'
    old=ROOT/'processing-history/normalization-v01'/path
    if not old.exists():save(initial,str(old.relative_to(ROOT)))
    assert Image.open(old).tobytes()==initial.tobytes()
    history.append({'id':key,'candidatePath':str(old.relative_to(ROOT)),'sha256':sha(old)})
    local=None
    if key in 'ABF':
        boxes={'A':[(13,95,38,111)],'B':[(151,32,180,37),(151,40,180,45),(151,48,180,53)],'F':[(258,68,285,80),(258,81,295,95)]}[key]
        mask=Image.new('L',dim,0);md=ImageDraw.Draw(mask);paint=out.copy();d=ImageDraw.Draw(paint)
        for box in boxes:md.rectangle(box,fill=255);d.rectangle(box,fill=(219,203,176) if key!='F' else (244,227,198))
        ink=(41,78,77)
        if key=='A':
            for x,y,w in [(15,98,22),(16,102,20),(18,106,16)]:d.line((x,y,x+w-1,y),fill=ink)
        if key=='B':
            for y,w in [(34,23),(42,25),(50,20)]:d.line((153,y,153+w-1,y),fill=ink)
        if key=='F':
            for x,y,w in [(260,70,23),(260,74,19),(260,85,22),(260,89,20),(260,93,17)]:d.line((x,y,x+w-1,y),fill=ink)
            d.line((259,80,284,80),fill=ink)
        out.paste(paint,(0,0),mask)
        changed=Image.new('L',dim,0);changed.putdata([255 if a!=b else 0 for a,b in zip(pixels(quantized),pixels(out))])
        outside=sum(v>0 and m==0 for v,m in zip(pixels(changed),pixels(mask)));assert outside==0
        save(mask,f'masks/{key}-signage-allowed.png');save(changed,f'masks/{key}-signage-changed.png')
        compare([quantized,out],[key+' BEFORE NOTICE POLISH',key+' FINAL NOTICE POLISH'],key+'-signage-before-after')
        local={'regions':[list(b) for b in boxes],'changedPixels':sum(v>0 for v in pixels(changed)),'outsideAllowedChanges':outside,'method':'Only native microlettering interiors replaced by deliberate administrative bars; pictograms and route dots retained'}
    rgba=out.convert('RGBA');visible=[c[:3] for c in pixels(rgba) if c[3]>0];assert set(visible)<=allowed
    assert out.size==dim and out.mode==('RGBA' if key=='E' else 'RGB')
    if key=='E':assert out.getchannel('A').getextrema()==(0,255)
    save(out,path);preview(out,stem);outputs[key]=out
    errors=[sum((a-b)**2 for a,b in zip(s[:3],c[:3])) for s,c in zip(pixels(native),pixels(quantized.convert('RGBA'))) if c[3]>0]
    isolated=0;arr=pixels(rgba);w,h=dim
    for y in range(h):
        for x in range(w):
            c=arr[y*w+x]
            if not c[3]:continue
            near=[arr[ny*w+nx] for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)] if 0<=nx<w and 0<=ny<h]
            if not any(n[3]>0 and n[:3]==c[:3] for n in near):isolated+=1
    alpha=rgba.getchannel('A');av=pixels(alpha)
    assets.append({'id':key,'registryKey':r['key'],'status':'generated','selected':False,'candidatePath':path,'assetPath':None,'dimensions':list(dim),'mode':out.mode,'sha256':sha(ROOT/path),'source':r['source'],'sourceSha256':sha(source),'sourceSize':list(raw.size),'sourceMode':raw.mode,'sourceOpacityVerified':key!='E','sourceAlphaNormalizedByEstablishedThreshold128':key=='E','normalization':'Full-canvas NEAREST; exact existing64-paint palette without dithering; original alpha sampled with NEAREST then threshold128 for E; recorded local notice edits A/B/F','aspectRatioCorrectionPercent':round(abs((raw.width/raw.height)/(w/h)-1)*100,6),'visibleColors':len(set(visible)),'rgbQuantizationRmse':round(math.sqrt(sum(errors)/len(errors)/3),3),'isolatedFourNeighborPixels':isolated,'isolatedFractionOfVisiblePixels':round(isolated/len(visible),6),'alpha':{'extrema':list(alpha.getextrema()),'transparentPixels':av.count(0),'opaquePixels':av.count(255),'partialPixels':sum(0<a<255 for a in av),'visibleBoundingBox':list(alpha.getbbox())},'paletteMembershipVerified':True,'exact4xVerified':True,'independentlyAuthored':key=='D','localNativeEdit':local,'references':[{'path':p,'sha256':sha(ROOT/p),'role':role} for p,role in zip(r['references'],r['referenceRoles'])]})

(ROOT/'processing-history/normalization-v01/manifest.json').write_text(json.dumps({'method':'Original normalized native exports before local sign polish and E alpha threshold','assets':history},indent=2)+'\n')
bg=outputs['D'].convert('RGBA');fg=outputs['E'];composite=Image.alpha_composite(bg,fg).convert('RGB');preview(composite,'portrait-composite')
for label,color in [('dark',(22,42,48)),('light',(244,227,198))]:
    canvas=Image.new('RGBA',fg.size,(*color,255));canvas.alpha_composite(fg);preview(canvas.convert('RGB'),'portrait-alpha-'+label)
check=Image.new('RGBA',fg.size);d=ImageDraw.Draw(check)
for y in range(0,278,8):
    for x in range(0,564,8):d.rectangle((x,y,x+7,y+7),fill=((125,135,128,255) if (x//8+y//8)%2 else (80,95,89,255)))
check.alpha_composite(fg);preview(check.convert('RGB'),'portrait-alpha-checker')
preview(fg.getchannel('A').convert('RGB'),'portrait-alpha-mask')
board=Image.new('RGB',(652,482),(22,42,48));d=ImageDraw.Draw(board)
for i,k in enumerate('ABCF'):
    x=8+(i%2)*322;y=6+(i//2)*236;d.text((x,y),k+' / '+records['assets'][k]['key'].split('/')[-1].upper(),fill=(246,241,222));board.paste(outputs[k],(x,y+20))
preview(board,'four-scenes')
ref=lambda name:Image.open(ROOT/'references'/name).convert('RGB')
compare([ref('batch2-C-tour-tram.png'),ref('batch2-F-overgrown-tram.png'),outputs['B']],['APPROVED TOUR TRAM','APPROVED ROOTED TOUR TRAM','NEW RESERVE TRAM'],'transit-material-continuity')
compare([outputs['A'],outputs['B'],outputs['C']],['RESERVE SIDING / INACTIVE','RESERVE CAB / INACTIVE','CONCOURSE / ACTIVATED'],'reserve-state-continuity')
compare([outputs['C'],composite],['CRASH SCENE / 314x206','INDEPENDENT CONVERSATION / 564x278'],'crash-portrait-continuity')
compare([outputs['D'],composite],['OPAQUE BACKGROUND ONLY','BACKGROUND + TRANSPARENT CONDUCTOR'],'portrait-layer-comparison')
compare([ref('batch1-B-groundskeeper.png'),composite],['APPROVED GROUNDSKEEPER','NEW COURTESY CONDUCTOR / DISTINCT CHARACTER'],'character-distinction')
compare([ref('batch1-D-service-entry.png'),outputs['F']],['APPROVED SERVICE MATERIALS','NEW UNDERGROUND STATION'],'service-station-continuity')
swatch=Image.new('RGB',(512,128));d=ImageDraw.Draw(swatch)
for i,c in enumerate(colors):d.rectangle(((i%16)*32,(i//16)*32,(i%16+1)*32-1,(i//16+1)*32-1),fill=c)
save(swatch,'previews/palette.png')
baseline=json.loads((ROOT/'baseline-hashes.json').read_text());bad=[p for p,h in baseline.items() if not(REPO/p).exists() or sha(REPO/p)!=h];assert not bad,bad
refs=json.loads((ROOT/'references/manifest.json').read_text())
for name,r in refs.items():
    assert sha(ROOT/'references'/name)==r['sha256'],name
    if name.endswith('-4x.png'):
        a=ref(name.replace('-4x.png','.png'));b=ref(name);assert a.resize((a.width*4,a.height*4),Image.Resampling.NEAREST).tobytes()==b.tobytes()
qa={'passed':True,'candidateCount':6,'sceneCount':4,'opaquePortraitBackgroundCount':1,'transparentPortraitForegroundCount':1,'sourceGenerationCount':len(list((ROOT/'generation-source').glob('*.png'))),'alphaProcessing':'E: source alpha NEAREST to native, threshold128, hidden RGB zero; original soft alpha preserved in source and history','sharedPaletteColors':64,'dithering':'none','croppingOrPadding':'none','layerTranslationOrScalingBeyondCanvasNormalization':'none','portraitComposite':'D/E at identical native origin, no transform','originalTrackedFilesPreserved':len(baseline),'preservationFailures':bad,'approvedReferenceHashesVerified':len(refs),'allCandidatesUnselected':True,'allProductionPathsNull':True,'densityNote':'Descriptive singleton metrics do not establish visual approval. Fine foliage, paper holes and thin machinery edges can remain dense.','environment':{'python':sys.version,'pillow':PIL.__version__},'assets':assets}
(ROOT/'qa.json').write_text(json.dumps(qa,indent=2)+'\n')
(ROOT/'manifest.json').write_text(json.dumps({'canonicalSourceCommit':records['canonicalSource'],'artworkBaseline':records['artworkBaseline'],'branch':'agent/ch02-art-batch04-reserve-transit','status':'generated','assets':assets},indent=2)+'\n')
inputs=[p for folder in ['generation-source','prompts','sources','references'] for p in (ROOT/folder).rglob('*') if p.is_file()]
(ROOT/'SOURCE_SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in sorted(inputs)))
(ROOT/'PNG_SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in sorted(ROOT.rglob('*.png'))))
print(json.dumps({'passed':True,'preservedFiles':len(baseline),'approvedReferences':len(refs),'assets':[{k:a[k] for k in ['id','dimensions','mode','sha256','visibleColors','alpha','localNativeEdit']} for a in assets]},indent=2))
