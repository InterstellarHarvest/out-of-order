"""Five independently generated opaque death vignettes; deterministic native/popup exports."""
from pathlib import Path
from PIL import Image,ImageDraw
from collections import Counter
import json,hashlib,math,sys,PIL
R=Path(__file__).resolve().parent;REPO=R.parent.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(im,rel):
 p=R/rel;p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
def previews(im,stem):
 save(im,'previews/'+stem+'-native.png')
 for scale in [2,4]:
  big=im.resize((im.width*scale,im.height*scale),Image.Resampling.NEAREST);save(big,f'previews/{stem}-{scale}x.png')
  actual=Image.open(R/f'previews/{stem}-{scale}x.png');assert actual.mode==im.mode and actual.size==big.size and actual.tobytes()==big.tobytes()
def compare(images,labels,stem):
 board=Image.new('RGB',(sum(i.width for i in images)+8*(len(images)+1),max(i.height for i in images)+30),(22,42,48));d=ImageDraw.Draw(board);x=8
 for im,label in zip(images,labels):d.text((x,4),label,fill=(244,227,198));board.paste(im,(x,22));x+=im.width+8
 previews(board,stem)
records=json.loads((R/'generation-records.json').read_text());targets=json.loads((R/'target-source-records.json').read_text());palette_path=R.parent/'chapter-02-batch01-2026-11-15/palette.json';palette=json.loads(palette_path.read_text());colors=[tuple(c) for c in palette['rgb']]
pal=Image.new('P',(1,1));pal.putpalette([v for c in colors for v in c]*4)
(R/'palette.json').write_text(json.dumps({'source':'../chapter-02-batch01-2026-11-15/palette.json','sourceSha256':sha(palette_path),'method':'Existing64-paint Chapter2 palette, no dithering','rgb':palette['rgb']},indent=2)+'\n')
assets=[];images={}
for k,a in records['assets'].items():
 source=R/a['source'];assert sha(source)==sha(Path(a['originalToolPath']))
 raw=Image.open(source);assert raw.convert('RGBA').getchannel('A').getextrema()==(255,255)
 native=raw.convert('RGB').resize((314,206),Image.Resampling.NEAREST)
 out=native.quantize(palette=pal,dither=Image.Dither.NONE).convert('RGB');assert out.size==(314,206) and out.mode=='RGB' and set(out.get_flattened_data())<=set(colors)
 stem=Path(a['source']).stem.rsplit('-v',1)[0];candidate='candidates/'+stem+'.png';save(out,candidate);previews(out,stem);images[k]=out
 error=sum(sum((x-y)**2 for x,y in zip(p,q)) for p,q in zip(native.get_flattened_data(),out.get_flattened_data()))
 assets.append({'id':k,'registryKey':a['key'],'title':targets[k]['record']['title'],'candidatePath':candidate,'sha256':sha(R/candidate),'status':'generated','selected':False,'assetPath':None,'dimensions':[314,206],'mode':'RGB','opacity':'all255','visibleColors':len(set(out.get_flattened_data())),'paletteMembershipVerified':True,'dithering':'none','sourcePath':a['source'],'sourceSha256':sha(source),'sourceSize':list(raw.size),'sourceMode':raw.mode,'independentlyGenerated':True,'nativeNormalization':'Whole canvas NEAREST to314x206, no crop or pad; inherited64-color palette without dithering','aspectRatioCorrectionPercent':round(abs((raw.width/raw.height)/(314/206)-1)*100,6),'rgbQuantizationRmse':round(math.sqrt(error/(314*206*3)),3),'popupPreview':f'previews/{stem}-2x.png','popupDimensions':[628,412],'inspectionPreview':f'previews/{stem}-4x.png','inspectionDimensions':[1256,824],'exact2xVerified':True,'exact4xVerified':True,'uiTextBakedIntoArt':False,'references':[{'path':p,'sha256':sha(R/p),'role':role} for p,role in zip(a['references'],a['referenceRoles'])]})
ref=lambda n:Image.open(R/'references'/n)
for k,scene in [('A','sorting_conveyor'),('B','planting_hopper'),('C','planting_machine'),('D','planting_machine'),('E','translator_machine')]:
 compare([ref(scene+'.png'),images[k]],['APPROVED SCENE','NEW AFTERMATH / '+k],k+'-approved-scene-comparison')
compare([images['B'],images['D']],['B / NURSERY WELCOME','D / INDUSTRIAL RECLASSIFICATION'],'B-D-distinct-aftermaths')
compare([images[k] for k in 'ABCDE'],['A / COMPOST','B / NEW ARRIVAL','C / PERSONAL GROWTH','D / RECLASSIFIED','E / SITE IMPROVEMENT'],'five-aftermaths')
baseline=json.loads((R/'baseline-hashes.json').read_text());bad=[p for p,h in baseline.items() if sha(REPO/p)!=h];assert not bad,bad
refs=json.loads((R/'references/manifest.json').read_text())
for p,v in refs.items():
 assert sha(R/'references'/p)==v['sha256']
 if p.endswith('-4x.png'):
  small=ref(p.replace('-4x.png','.png'));big=ref(p);assert small.resize((small.width*4,small.height*4),Image.Resampling.NEAREST).tobytes()==big.tobytes()
qa={'passed':True,'candidateCount':5,'independentSourceRenderCount':5,'nativeDimensions':[314,206],'nativeMode':'opaque RGB','popupScale':2,'popupDimensions':[628,412],'inspectionScale':4,'inspectionDimensions':[1256,824],'paletteColors':64,'dithering':'none','blurOrSoftInterpolation':'none','allCandidatesUnselected':True,'allProductionPathsNull':True,'originalTrackedFilesPreserved':len(baseline),'preservationFailures':bad,'approvedReferenceHashesVerified':len(refs),'uiTextControlsAndBackdropSeparate':True,'environment':{'python':sys.version,'pillow':PIL.__version__},'assets':assets}
(R/'qa.json').write_text(json.dumps(qa,indent=2)+'\n');(R/'manifest.json').write_text(json.dumps({'branch':'agent/ch02-art-batch08-death-aftermaths','canonicalSourceCommit':records['canonicalSourceCommit'],'artworkBaseline':records['artworkBaseline'],'status':'generated','assets':assets},indent=2)+'\n')
doc='# Five generated Batch8 death candidates\n\nNative314×206 opaque RGB. Generated/unselected;production assetPath:null. Popup628×412 exact2×;inspection1256×824 exact4×.\n\n| ID | Registry key | Native candidate | SHA-256 |\n|---|---|---|---|\n'
for a in assets:doc+='| '+a['id']+' | `'+a['registryKey']+'` | `'+a['candidatePath']+'` | `'+a['sha256']+'` |\n'
(R/'CANDIDATE_HASHES.md').write_text(doc)
inputs=[p for d in ['generation-source','prompts','sources','references'] for p in (R/d).rglob('*') if p.is_file()]
(R/'SOURCE_SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(R)}\n' for p in sorted(inputs)))
(R/'PNG_SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(R)}\n' for p in sorted(R.rglob('*.png'))))
print(json.dumps({'passed':True,'preservedFiles':len(baseline),'assets':[{k:a[k] for k in ['id','candidatePath','sha256','visibleColors','sourceSize','aspectRatioCorrectionPercent']} for a in assets]},indent=2))
