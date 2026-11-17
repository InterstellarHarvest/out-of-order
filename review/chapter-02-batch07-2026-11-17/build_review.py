"""Batch7 deterministic exports from nine independent genuine image_gen renders.
Python3+Pillow. Writes only inside this new review folder.
"""
from pathlib import Path
from PIL import Image,ImageDraw
from collections import deque,Counter
import json,hashlib,math,sys,PIL

ROOT=Path(__file__).resolve().parent;REPO=ROOT.parent.parent
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def px(im):return list(im.get_flattened_data())
def save(im,p):
    target=ROOT/p;target.parent.mkdir(parents=True,exist_ok=True);im.save(target)
def preview(im,stem):
    save(im,f'previews/{stem}-native.png');big=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST);save(big,f'previews/{stem}-4x.png')
    actual=Image.open(ROOT/f'previews/{stem}-4x.png');assert actual.mode==im.mode and actual.size==big.size and actual.tobytes()==big.tobytes()
def largest_component(mask):
    w,h=mask.size;buf=bytearray(mask.tobytes());best=[];count=0;total=sum(v>0 for v in buf)
    for start,v in enumerate(buf):
        if not v:continue
        count+=1;buf[start]=0;queue=deque([start]);component=[]
        while queue:
            i=queue.popleft();component.append(i);x=i%w;y=i//w
            for j in ([i-1] if x else [])+([i+1] if x+1<w else [])+([i-w] if y else [])+([i+w] if y+1<h else []):
                if buf[j]:buf[j]=0;queue.append(j)
        if len(component)>len(best):best=component
    clean=bytearray(w*h)
    for i in best:clean[i]=255
    return Image.frombytes('L',(w,h),bytes(clean)),{'sourceComponents':count,'keptPixels':len(best),'removedDetachedPixels':total-len(best)}
def checker(im,color=None):
    canvas=Image.new('RGBA',im.size,(*color,255) if color else (125,135,128,255));d=ImageDraw.Draw(canvas)
    if color is None:
        for y in range(0,im.height,8):
            for x in range(0,im.width,8):d.rectangle((x,y,x+7,y+7),fill=((125,135,128,255) if (x//8+y//8)%2 else (80,95,89,255)))
    canvas.alpha_composite(im);return canvas.convert('RGB')
def compare(images,labels,stem):
    board=Image.new('RGB',(sum(im.width for im in images)+8*(len(images)+1),max(im.height for im in images)+30),(22,42,48));d=ImageDraw.Draw(board);x=8
    for im,label in zip(images,labels):d.text((x,4),label,fill=(246,241,222));board.paste(im,(x,22));x+=im.width+8
    preview(board,stem)

records=json.loads((ROOT/'generation-records.json').read_text());assert set(records['assets'])==set('ABCDEFGHI')
palette_source=ROOT.parent/'chapter-02-batch01-2026-11-15/palette.json';palette=json.loads(palette_source.read_text());colors=[tuple(c) for c in palette['rgb']];allowed=set(colors)
pal=Image.new('P',(1,1));pal.putpalette([v for c in colors for v in c]*4)
(ROOT/'palette.json').write_text(json.dumps({'source':'../chapter-02-batch01-2026-11-15/palette.json','sourceSha256':sha(palette_source),'method':'Exact existing industrial64-paint palette, applied without dithering to all nine treatment-kit candidates','rgb':palette['rgb']},indent=2)+'\n')
assets=[];outputs={}
for key,r in records['assets'].items():
    source=ROOT/r['source'];raw=Image.open(source);original=Path(r['originalToolPath']);slot=key in 'BEH';focus=key in 'ADG';size=(564,278) if focus else (565,451)
    if original.exists():assert sha(source)==sha(original)
    for previous in r.get('previousVersions',[]):
        old=Path(previous['originalToolPath'])
        if old.exists():assert sha(ROOT/previous['source'])==sha(old)
    rgba=raw.convert('RGBA');alpha=rgba.getchannel('A');assert alpha.getextrema()==((0,255) if slot else (255,255))
    alpha_info=None;crop=None;fitted=None;offset=None
    if slot:
        binary=alpha.point(lambda a:255 if a>=128 else 0);mask,alpha_info=largest_component(binary);save(mask,f'masks/{key}-source-binary-largest.png')
        crop=mask.getbbox();assert crop is not None;rgba.putalpha(mask);obj=rgba.crop(crop)
        scale=min(88/obj.width,88/obj.height);fitted=(max(1,round(obj.width*scale)),max(1,round(obj.height*scale)))
        obj=obj.resize(fitted,Image.Resampling.NEAREST);offset=((96-fitted[0])//2,(96-fitted[1])//2)
        native=Image.new('RGBA',(96,96),(0,0,0,0));native.paste(obj,offset);native.putalpha(native.getchannel('A').point(lambda a:255 if a>=128 else 0))
        out=native.convert('RGB').quantize(palette=pal,dither=Image.Dither.NONE).convert('RGBA');out.putalpha(native.getchannel('A'));out.putdata([c if c[3] else (0,0,0,0) for c in px(out)])
        assert set(px(out.getchannel('A')))=={0,255};box=out.getchannel('A').getbbox();assert min(box[:2])>=4 and max(box[2:])<=92
        save(out.getchannel('A'),f'masks/{key}-native-alpha.png')
        method='Source alpha threshold128; retain largest connected object; crop alpha padding; NEAREST fit within88x88; center on96x96; binary native alpha; hidden RGB zero; exact existing palette without dithering'
    else:
        native=raw.convert('RGB').resize(size,Image.Resampling.NEAREST)
        out=native.quantize(palette=pal,dither=Image.Dither.NONE).convert('RGB');method=f'Whole-canvas NEAREST to{size[0]}x{size[1]}, no crop/pad; exact existing64-paint palette without dithering; independently generated, not a scene crop or icon enlargement'
    stem=Path(r['source']).stem.rsplit('-v',1)[0];path=f'candidates/{stem}.png';save(out,path);preview(out,stem);outputs[key]=out
    assert out.size==((96,96) if slot else size) and out.mode==('RGBA' if slot else 'RGB')
    visible=[c[:3] for c in px(out.convert('RGBA')) if c[3]];assert set(visible)<=allowed
    alpha_final=out.convert('RGBA').getchannel('A');values=px(alpha_final)
    errors=[sum((a-b)**2 for a,b in zip(s[:3],c[:3])) for s,c in zip(px(native.convert('RGBA')),px(out.convert('RGBA'))) if c[3]]
    assets.append({'id':key,'registryKey':r['key'],'status':'generated','selected':False,'candidatePath':path,'assetPath':None,'dimensions':list(out.size),'mode':out.mode,'sha256':sha(ROOT/path),'source':r['source'],'sourceSha256':sha(source),'sourceSize':list(raw.size),'sourceMode':raw.mode,'independentlyGenerated':True,'normalization':method,'alphaProcessing':alpha_info,'sourceAlphaHistogram':dict(sorted(Counter(px(alpha)).items())) if slot else {'255':raw.width*raw.height},'alphaCropBox':list(crop) if crop else None,'fittedObjectSize':list(fitted) if fitted else None,'objectOffset':list(offset) if offset else None,'aspectRatioCorrectionPercent':0 if slot else round(abs((raw.width/raw.height)/(size[0]/size[1])-1)*100,6),'visibleColors':len(set(visible)),'rgbQuantizationRmse':round(math.sqrt(sum(errors)/len(errors)/3),3),'alpha':{'extrema':list(alpha_final.getextrema()),'transparentPixels':values.count(0),'opaquePixels':values.count(255),'partialPixels':sum(0<a<255 for a in values),'visibleBoundingBox':list(alpha_final.getbbox())},'hiddenRgbZeroVerified':all(c[:3]==(0,0,0) for c in px(out.convert('RGBA')) if c[3]==0),'paletteMembershipVerified':True,'exact4xVerified':True,'references':[{'path':p,'sha256':sha(ROOT/p),'role':role} for p,role in zip(r['references'],r['referenceRoles'])]})

ref=lambda name:Image.open(ROOT/'references'/name)
for focus,slot,inspector,location,scene in [('A','B','C','public','B-public-exit'),('D','E','F','maintenance','C-maintenance-exit'),('G','H','I','customs','D-agricultural-customs')]:
    compare([outputs[focus],checker(outputs[slot]),outputs[inspector]],['FOCUS564x278 / '+location.upper(),'SLOT96','INSPECTOR565x451'],location+'-group')
    compare([ref('batch5-'+scene+'.png'),outputs[focus]],['APPROVED CLOSED SCENE','NEW OPEN FOCUS'],location+'-closed-open')
compare([outputs[k] for k in 'CFI'],['PUBLIC','MAINTENANCE','CUSTOMS'],'injector-family-inspectors')
compare([checker(outputs[k]) for k in 'BEH'],['PUBLIC','MAINTENANCE','CUSTOMS'],'injector-family-slots')
for key in 'BEH':
    compare([checker(outputs[key]),checker(outputs[key],(22,42,48)),checker(outputs[key],(244,227,198))],['CHECKER','DARK','LIGHT'],key+'-alpha-inspection')
    preview(outputs[key].getchannel('A').convert('RGB'),key+'-alpha-mask')
swatch=Image.new('RGB',(512,128));d=ImageDraw.Draw(swatch)
for i,c in enumerate(colors):d.rectangle(((i%16)*32,(i//16)*32,(i%16+1)*32-1,(i//16+1)*32-1),fill=c)
save(swatch,'previews/palette.png')
baseline=json.loads((ROOT/'baseline-hashes.json').read_text());bad=[p for p,h in baseline.items() if not(REPO/p).exists() or sha(REPO/p)!=h];assert not bad,bad
refs=json.loads((ROOT/'references/manifest.json').read_text())
for name,r in refs.items():
    assert sha(ROOT/'references'/name)==r['sha256'],name
    if name.endswith('-4x.png'):
        a=ref(name.replace('-4x.png','.png'));b=ref(name);assert a.mode==b.mode and a.resize((a.width*4,a.height*4),Image.Resampling.NEAREST).tobytes()==b.tobytes()
qa={'passed':True,'candidateCount':9,'independentSourceGenerationCount':9,'sourceRenderCount':len(list((ROOT/'generation-source').glob('*.png'))),'sourceColorCleanup':'All nine-v03 sources revise rejected pistol silhouette to upright hypo; all24 renders and normalization history preserved','nativeFocusDimensions':[564,278],'focusPreviewDimensions':[2256,1112],'nativeSlotDimensions':[96,96],'nativeInspectorDimensions':[565,451],'slotPreviewDimensions':[384,384],'inspectorPreviewDimensions':[2260,1804],'slotAlpha':'binary0/255,transparent margins,hidden RGB zero','inspectorMode':'opaque RGB','sharedPaletteColors':64,'dithering':'none','manualPixelRepainting':'none','originalTrackedFilesPreserved':len(baseline),'preservationFailures':bad,'approvedReferenceHashesVerified':len(refs),'allCandidatesUnselected':True,'allProductionPathsNull':True,'ownerArtDirectionOverride':'Current Focus A564x278; future ScenePickup565x451 separate. Single shared medical-device family; three approved container identities.','environment':{'python':sys.version,'pillow':PIL.__version__},'assets':assets}
(ROOT/'qa.json').write_text(json.dumps(qa,indent=2)+'\n');(ROOT/'manifest.json').write_text(json.dumps({'canonicalSourceCommit':records['canonicalSource'],'artworkBaseline':records['artworkBaseline'],'branch':'agent/ch02-art-batch07-treatment-kits','status':'generated','assets':assets},indent=2)+'\n')
(ROOT/'processing-history').mkdir(exist_ok=True)
(ROOT/'processing-history/normalization-v03.json').write_text(json.dumps({'assets':[{'source':a['source'],'sourceSha256':a['sourceSha256'],'candidate':a['candidatePath'],'sha256':a['sha256'],'method':a['normalization'],'alphaCropBox':a['alphaCropBox'],'fittedObjectSize':a['fittedObjectSize'],'objectOffset':a['objectOffset'],'alphaProcessing':a['alphaProcessing']} for a in assets]},indent=2)+'\n')
doc='# Nine generated Batch7 candidates\n\nPaths relative to this review folder. Generated,unselected;production assetPath:null.\n\n| ID | Registry key | Native candidate path | Dimensions/mode | SHA-256 |\n|---|---|---|---|---|\n'
for a in assets:doc+='| '+a['id']+' | `'+a['registryKey']+'` | `'+a['candidatePath']+'` | '+'×'.join(map(str,a['dimensions']))+' '+a['mode']+' | `'+a['sha256']+'` |\n'
(ROOT/'CANDIDATE_HASHES.md').write_text(doc)
inputs=[p for folder in ['generation-source','prompts','sources','references'] for p in (ROOT/folder).rglob('*') if p.is_file()]
(ROOT/'SOURCE_SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in sorted(inputs)));(ROOT/'PNG_SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in sorted(ROOT.rglob('*.png'))))
print(json.dumps({'passed':True,'preservedFiles':len(baseline),'assets':[{k:a[k] for k in ['id','dimensions','mode','sha256','visibleColors','alpha','alphaProcessing']} for a in assets]},indent=2))
