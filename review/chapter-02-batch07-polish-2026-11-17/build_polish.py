"""Explicitly authorized native-pixel background cleanup; no scene or device regeneration."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFilter
from collections import deque,Counter
import json,hashlib,subprocess
R=Path(__file__).resolve().parent;REPO=R.parent.parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def save(im,rel):
 p=R/rel;p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
def export(im,stem):
 save(im,'previews/'+stem+'-native.png');big=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST);save(big,'previews/'+stem+'-4x.png')
 assert Image.open(R/('previews/'+stem+'-4x.png')).tobytes()==big.tobytes()
original=R/'references/I-customs-antidote-inspect.png'
assert sha(original)=='901ea4bced05cc532e2447892f4722e0c6a90b109a650c9bf8250b5f07303d7f'
im=Image.open(original);assert im.mode=='RGB' and im.size==(565,451)
w,h=im.size;pixels=list(im.get_flattened_data())
# The two original neutral field colors, verified across all four outer borders.
background={(184,173,166),(171,167,165)}
assert all(im.getpixel((x,y)) in background for x,y in [(x,0) for x in range(w)]+[(x,h-1) for x in range(w)]+[(0,y) for y in range(h)]+[(w-1,y) for y in range(h)])
visited=bytearray(w*h);q=deque()
for i in list(range(w))+list(range((h-1)*w,h*w))+[y*w for y in range(h)]+[y*w+w-1 for y in range(h)]:
 if not visited[i]:visited[i]=255;q.append(i)
while q:
 i=q.popleft();x=i%w;y=i//w
 for j in ([i-1] if x else [])+([i+1] if x+1<w else [])+([i-w] if y else [])+([i+w] if y+1<h else []):
  if not visited[j] and pixels[j] in background:visited[j]=255;q.append(j)
exterior=Image.frombytes('L',im.size,bytes(visited))
# Protect every non-exterior pixel (including enclosed gray hardware regions),
# then expand that foreground/shadow protection by one native pixel.
protected=Image.eval(exterior,lambda v:255-v).filter(ImageFilter.MaxFilter(3))
allowed=Image.eval(protected,lambda v:255-v)
fill=(184,173,166)
out=im.copy();out.paste(fill,(0,0,w,h),allowed)
changed=Image.new('L',im.size);changed.putdata([255 if a!=b else 0 for a,b in zip(pixels,out.get_flattened_data())])
diff=list(changed.get_flattened_data());permit=list(allowed.get_flattened_data());protect=list(protected.get_flattened_data())
assert all(not d or a==255 for d,a in zip(diff,permit))
assert all(a==b for a,b,m in zip(pixels,out.get_flattened_data(),protect) if m)
assert all(a==b for a,b in zip(pixels,out.get_flattened_data()) if a not in background)
palette=json.loads((R/'palette.json').read_text());colors={tuple(c) for c in palette['rgb']}
assert set(out.get_flattened_data())<=colors and fill in colors
assert out.size==im.size and out.mode==im.mode
save(out,'candidates/I-customs-antidote-inspect-background-polish-v01.png')
for name,mask in [('exterior-background',exterior),('protected-injector-and-shadow',protected),('permitted-background-edit',allowed),('changed-pixels',changed)]:
 save(mask,'masks/'+name+'.png');export(mask.convert('RGB'),name)
export(im,'I-original');export(out,'I-revised')
overlay=im.copy();overlay.paste((180,40,55),(0,0,w,h),changed);export(overlay,'changed-overlay')
board=Image.new('RGB',(w*2+24,h+30),(22,42,48));d=ImageDraw.Draw(board);d.text((8,5),'ORIGINAL I / GENERATED, UNSELECTED',fill=(244,227,198));d.text((w+16,5),'BACKGROUND POLISH / GENERATED, UNSELECTED',fill=(244,227,198));board.paste(im,(8,22));board.paste(out,(w+16,22));export(board,'I-original-vs-revised')
board=Image.new('RGB',(w*3+32,h+30),(22,42,48));d=ImageDraw.Draw(board)
for i,(image,label) in enumerate([(Image.open(R/'references/C-public-antidote-inspect.png'),'APPROVED PUBLIC C / UNCHANGED'),(Image.open(R/'references/F-maintenance-antidote-inspect.png'),'APPROVED MAINTENANCE F / UNCHANGED'),(out,'REVISED CUSTOMS I / UNSELECTED')]):
 x=8+i*(w+8);d.text((x,5),label,fill=(244,227,198));board.paste(image,(x,22))
export(board,'inspector-background-continuity')
before=Counter(pixels);after=Counter(out.get_flattened_data());n=sum(v>0 for v in diff)
qa={'passed':True,'method':'Native RGB background color replacement through explicit border-connected two-color field mask, with foreground/shadow protection expanded by one native pixel','regeneration':False,'interpolation':'none; exact4x NEAREST previews only','originalPath':str(original.relative_to(R)),'originalSha256':sha(original),'candidatePath':'candidates/I-customs-antidote-inspect-background-polish-v01.png','sha256':sha(R/'candidates/I-customs-antidote-inspect-background-polish-v01.png'),'dimensions':[w,h],'mode':'RGB','status':'generated','selected':False,'assetPath':None,'paletteColors':64,'palettePreserved':True,'introducedColors':sorted(set(after)-set(before)),'replacementRgb':fill,'changedPixels':n,'unchangedPixels':w*h-n,'protectedPixelCount':sum(v>0 for v in protect),'permittedBackgroundPixelCount':sum(v>0 for v in permit),'changedOutsidePermittedRegion':0,'changedProtectedInjectorAndShadowPixels':0,'changedNonBackgroundColorPixels':0,'changedColorPairs':[{'from':[171,167,165],'to':fill,'count':n}],'injectorSilhouetteHardwareReservoirLabelAndShadowUnchanged':True,'allAllowedBackgroundPixelsNowOneColor':all(b==fill for b,m in zip(out.get_flattened_data(),permit) if m),'exact4xVerified':True,'sourcePixelHashes':{'protectedBefore':hashlib.sha256(bytes(v for p,m in zip(pixels,protect) if m for v in p)).hexdigest(),'protectedAfter':hashlib.sha256(bytes(v for p,m in zip(out.get_flattened_data(),protect) if m for v in p)).hexdigest()}}
assert qa['sourcePixelHashes']['protectedBefore']==qa['sourcePixelHashes']['protectedAfter']
baseline=json.loads((R/'art-repository-baseline-hashes.json').read_text());assert all(sha(REPO/p)==h for p,h in baseline.items());qa['originalTrackedArtFilesPreserved']=len(baseline)
(R/'qa.json').write_text(json.dumps(qa,indent=2)+'\n')
(R/'manifest.json').write_text(json.dumps({'registryKey':'items:botanical_antidote_customs#inspect','nativeCandidate':qa['candidatePath'],'sha256':qa['sha256'],'status':'generated','selected':False,'assetPath':None,'dimensions':[565,451],'mode':'RGB','originalSha256':qa['originalSha256'],'originalImmutableCommit':'7ea47f63b6bbf86ffa02dd5a3ee2cb5ad5d3065e','changedPixels':n,'changedOutsidePermittedRegion':0,'changedInjectorAndShadowPixels':0,'qa':'qa.json'},indent=2)+'\n')
print(json.dumps(qa,indent=2))
