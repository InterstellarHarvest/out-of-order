"""Localized native-grid signage corrections. No generation, resize or quantization of scenes.
Run with Python 3 + Pillow. Original PNGs are read-only; all outputs stay in this revision.
"""
from pathlib import Path
from PIL import Image, ImageDraw
import hashlib, json, re

ROOT = Path(__file__).resolve().parent
BASE = ROOT.parent
REPO = BASE.parent.parent
REVIEWED = 'e9dff9cb9c06ec38cda0b29cff8141df4263fb40'
STEMS = {'A':'A-conveniences-bureau','B':'B-groundskeeper','C':'C-formal-entrance',
         'D':'D-service-entry','E':'E-jungle-junction','F':'F-groundskeeper-background',
         'G':'G-groundskeeper-foreground'}
# Boxes use half-open native coordinates: [x0,y0,x1,y1]. All are sign-face interiors.
REGIONS = {
    'A': [(101,113,132,126),(86,130,130,143)],
    'C': [(49,71,72,106),(242,71,267,106)],
    'E': [(106,103,151,116),(106,123,151,132),(106,136,151,145),(106,149,151,158)]
}
PALETTE = {tuple(c) for c in json.loads((BASE/'palette.json').read_text())['rgb']}
CREAM = (225,212,194)
BUREAU_PAPER = (219,203,176)
INK = (18,57,59)
MUTED = (121,134,129)
RED = (170,50,35)
# Explicit bitmap glyphs; no system font, font rasterization or antialiasing.
FONT4 = {
 'C':['0111','1000','1000','1000','0111'],
 'L':['1000','1000','1000','1000','1111'],
 'O':['0110','1001','1001','1001','0110'],
 'S':['0111','1000','0110','0001','1110'],
 'E':['1111','1000','1110','1000','1111'],
 'D':['1110','1001','1001','1001','1110'],
 'J':['0111','0001','0001','1001','0110'],
 'U':['1001','1001','1001','1001','0110'],
 'N':['1001','1101','1011','1001','1001'],
 'G':['0111','1000','1011','1001','0111'],
 'T':['1111','0110','0110','0110','0110'],
 'I':['1111','0110','0110','0110','1111']}
def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()
def px(im): return list(im.get_flattened_data())
def fill(draw,box,color):
    x0,y0,x1,y1=box;draw.rectangle((x0,y0,x1-1,y1-1),fill=color)
def text(draw,x,y,word,font):
    start=x
    for letter in word:
        glyph=font[letter]
        for dy,row in enumerate(glyph):
            for dx,bit in enumerate(row):
                if bit=='1':draw.point((x+dx,y+dy),fill=INK)
        x+=len(glyph[0])+1
    return [start,y,x-1,y+5]
def save(im,path):
    p=ROOT/path;p.parent.mkdir(parents=True,exist_ok=True);im.save(p)
def preview(im,stem):
    save(im,f'previews/{stem}-native.png')
    big=im.resize((im.width*4,im.height*4),Image.Resampling.NEAREST)
    save(big,f'previews/{stem}-4x.png')
    for y in range(im.height):
        expected=[im.getpixel((x,y)) for x in range(im.width) for _ in range(4)]
        for dy in range(4):assert px(big.crop((0,y*4+dy,big.width,y*4+dy+1)))==expected

before={k:Image.open(BASE/'candidates'/f'{s}.png').copy() for k,s in STEMS.items()}
after={k:im.copy() for k,im in before.items()}

# A: preserve the large Public Conveniences Bureau marquee and the notice emblem,
# border/fasteners/red divider. Only replace the two existing text fields.
d=ImageDraw.Draw(after['A'])
for box in REGIONS['A']:fill(d,box,BUREAU_PAPER)
text(d,102,118,'CLOSED',FONT4)
for x,y,w in [(90,132,29),(93,136,23),(96,140,17)]:fill(d,(x,y,x+w,y+1),MUTED)
d.rectangle((124,136,128,140),outline=RED)

# C: replace small pseudo-words with deliberate administrative bars and checks.
# Keep both original plaque outlines, screws, placement and outer shading untouched.
d=ImageDraw.Draw(after['C'])
for box in REGIONS['C']:fill(d,box,CREAM)
for x,y,w,h,c in [(51,72,17,2,INK),(52,76,16,2,INK),(49,82,23,1,RED),
                  (51,86,17,2,INK),(50,90,19,2,MUTED),(49,95,23,1,RED),
                  (53,99,13,2,INK),(51,103,17,2,MUTED)]:fill(d,(x,y,x+w,y+h),c)
for y,w in [(72,14),(79,12),(86,16),(93,13),(100,15)]:
    d.rectangle((243,y,245,y+2),outline=INK)
    fill(d,(249,y,249+w,y+2),INK)
    fill(d,(249,y+3,249+w-3,y+4),MUTED)

# E: clear the four sign interiors only. Two short title lines fit without
# abbreviation. Arrows + pictograms carry the routes, without cramped labels.
# Sun, structural outline, mounting hardware and all paths remain.
d=ImageDraw.Draw(after['E'])
for box in REGIONS['E']:fill(d,box,CREAM)
text(d,114,104,'JUNGLE',FONT4)
text(d,109,110,'JUNCTION',FONT4)
def arrow_left(x,y):
    d.line((x,y,x+6,y),fill=INK,width=1)
    d.line((x,y,x+2,y-2),fill=INK,width=1)
    d.line((x,y,x+2,y+2),fill=INK,width=1)
def arrow_up(x,y):
    d.line((x,y,x,y+6),fill=INK,width=1)
    d.line((x,y,x-2,y+2),fill=INK,width=1)
    d.line((x,y,x+2,y+2),fill=INK,width=1)
def arrow_right(x,y):
    d.line((x,y,x+6,y),fill=INK,width=1)
    d.line((x+6,y,x+4,y-2),fill=INK,width=1)
    d.line((x+6,y,x+4,y+2),fill=INK,width=1)
arrow_left(108,127)
# Elevated control office: glazed horizontal cab, roof, two supporting legs.
d.line((121,123,141,123),fill=INK)
d.rectangle((122,124,140,128),outline=INK)
for x in [126,131,136]:d.line((x,124,x,128),fill=INK)
for x in [125,137]:d.line((x,129,x,131),fill=INK)
arrow_up(111,137)
# Walking visitor: unambiguous head, bent arms, body and separated striding legs.
d.rectangle((128,136,129,137),fill=INK)
d.line((128,138,127,140),fill=INK)
d.line((127,140,130,141),fill=INK)
d.line((127,140,124,139),fill=INK)
d.line((127,140,126,142),fill=INK)
d.line((126,142,123,144),fill=INK)
d.line((126,142,130,144),fill=INK)
# Flower exhibit beside the walker, an explicit pedestrian botanical route cue.
d.line((140,139,140,144),fill=INK)
for point in [(140,136),(139,137),(141,137),(138,138),(142,138),(139,139),(141,139)]:
    d.point(point,fill=INK)
d.line((140,142,137,140),fill=INK)
d.line((140,143,143,141),fill=INK)
arrow_right(108,153)
# Nature tram: rounded cab corners, three separated windows, wheels and rail.
d.line((123,149,140,149),fill=INK)
d.rectangle((122,150,141,155),outline=INK)
for x in [127,132,137]:d.line((x,150,x,153),fill=INK)
d.line((122,153,141,153),fill=INK)
for x in [125,138]:d.point((x,156),fill=INK)
d.line((121,157,142,157),fill=INK)

manifest=[];qa={}
for k,im in after.items():
    original=before[k]; stem=STEMS[k]
    diff=Image.new('L',im.size,0); allowed=Image.new('L',im.size,0)
    ad=ImageDraw.Draw(allowed)
    for box in REGIONS.get(k,[]):fill(ad,box,255)
    diff.putdata([255 if a!=b else 0 for a,b in zip(px(original),px(im))])
    changed=sum(v>0 for v in px(diff))
    outside=sum(v>0 and a==0 for v,a in zip(px(diff),px(allowed)))
    assert outside==0,(k,outside)
    assert im.size==original.size and im.mode==original.mode
    if k in REGIONS:
        assert changed>0
        assert set(px(im))<=PALETTE
        save(im,f'candidates/{stem}.png')
        preview(im,stem)
        preview(original,f'{k}-before')
        save(allowed,f'masks/{k}-allowed.png');save(diff,f'masks/{k}-changed.png')
        overlay=original.convert('RGB').copy()
        overlay.paste(RED,(0,0,im.width,im.height),diff)
        preview(overlay,f'{k}-changed-overlay')
        comparison=Image.new('RGB',(650,230),(22,42,48));cd=ImageDraw.Draw(comparison)
        cd.text((8,5),f'{k} BEFORE / ACCEPTED COMPOSITION',fill=(246,241,222))
        cd.text((328,5),f'{k} AFTER / SIGNAGE ONLY',fill=(246,241,222))
        comparison.paste(original,(8,20));comparison.paste(im,(328,20))
        preview(comparison,f'{k}-before-after')
        effective=f'candidates/{stem}.png'
    else:
        assert changed==0
        effective=f'../candidates/{stem}.png'
    source=BASE/'candidates'/f'{stem}.png'
    target=ROOT/effective
    manifest.append({'id':k,'effectivePath':effective,'sha256':sha(target),
                     'originalPath':f'../candidates/{stem}.png','originalSha256':sha(source),
                     'dimensions':list(im.size),'mode':im.mode,'signageRevised':k in REGIONS,
                     'compositionStatus':'accepted','productionPath':None})
    qa[k]={'changedPixels':changed,'changedBounds':diff.getbbox(),
           'allowedRegions':REGIONS.get(k,[]),'outsideAllowedChangedPixels':outside,
           'dimensionsUnchanged':True,'modeUnchanged':True,
           'paletteUnchanged':True,'exact4xVerified':True if k in REGIONS else 'unchanged original',
           'byteIdenticalOriginal':sha(source)==sha(target)}

contact=Image.new('RGB',(974,466),(22,42,48));d=ImageDraw.Draw(contact)
for i,k in enumerate('ABCDE'):
    x=8+(i%3)*322;y=6+(i//3)*232
    d.text((x,y),STEMS[k].upper(),fill=(246,241,222));contact.paste(after[k],(x,y+18))
preview(contact,'five-scenes-revised')
strip=Image.new('RGB',(650,690),(22,42,48))
for i,k in enumerate('ACE'):
    strip.paste(Image.open(ROOT/f'previews/{k}-before-after-native.png'),(0,i*230))
preview(strip,'all-before-after')
preserved=json.loads((ROOT/'preserved-file-hashes.json').read_text())
bad=[p for p,h in preserved.items() if not (REPO/p).exists() or sha(REPO/p)!=h]
assert not bad,bad
checks={'reviewedCommit':REVIEWED,'passed':True,'method':'Explicit integer-coordinate native pixel fills, bitmap glyphs and pictograms; no image generation or scene resampling',
        'allOriginalPngStoryGameFilesPreserved':True,'preservedFileCount':len(preserved),
        'preservationFailures':bad,'totalOutsideAllowedChanges':sum(v['outsideAllowedChangedPixels'] for v in qa.values()),
        'unchangedAssets':['B','D','F','G'],'revisedAssets':['A','C','E'],'assets':qa}
(ROOT/'qa.json').write_text(json.dumps(checks,indent=2)+'\n')
(ROOT/'manifest.json').write_text(json.dumps({'reviewedCommit':REVIEWED,'assets':manifest},indent=2)+'\n')
(ROOT/'regions.json').write_text(json.dumps(REGIONS,indent=2)+'\n')
gallery=ROOT/'index.html'
if gallery.exists():
    counts={k:qa[k]['changedPixels'] for k in REGIONS}
    html=re.sub(r'const pixelCounts=\{[^}]*\};', 'const pixelCounts='+json.dumps(counts)+';', gallery.read_text())
    gallery.write_text(html)
(ROOT/'SHA256SUMS.txt').write_text(''.join(f'{sha(p)}  {p.relative_to(ROOT)}\n' for p in sorted(ROOT.rglob('*.png'))))
print(json.dumps(checks,indent=2))
