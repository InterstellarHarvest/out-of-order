"""Rebuild seven review assets; never writes outside this Batch 5 review directory."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
import json, hashlib, subprocess
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
SIZE=(314,206)
P={
 'gallery':'review/chapter-01-batch03-2026-11-15/wide-speaker-position-v05/gallery-v05.png',
 'foyer':'review/chapter-01-batch04-2026-11-15/door-continuity-v01/candidates/foyer-single-door-v03.png',
 'storage':'review/chapter-01-batch04-2026-11-15/candidates/storage-v02.png',
 'utility':'review/chapter-01-batch04-2026-11-15/candidates/utility-exit-v01.png'}
NAMES=['A-album-removed','B-plant-adoption','C-stored-plant','D-stored-stapler','E-stored-band-ball','F-stored-clicker','G-returns-display']
def digest(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def diff(a,b):
 a=a.convert('RGB'); b=b.convert('RGB')
 m=Image.new('L',SIZE); m.putdata([255 if x!=y else 0 for x,y in zip(a.getdata(),b.getdata())]); return m

def sprite(name,size):
 src=Image.open(next((OUT/'sources').glob(name+'-*-render.png'))).convert('RGBA')
 # Reject generated subpixel fringe/glow; retain the actual opaque object silhouette.
 alpha=src.getchannel('A').point(lambda a:255 if a>=240 else 0)
 src.putalpha(alpha); src=src.crop(alpha.getbbox()).resize(size,Image.Resampling.NEAREST)
 a=src.getchannel('A')
 rgb=src.convert('RGB').quantize(colors=24,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB')
 rgb.putalpha(a)
 # Normalize transparent RGB to zero. No filtering/interpolation or soft alpha.
 rgb.putdata([(r,g,b,255) if a else (0,0,0,0) for r,g,b,a in rgb.getdata()])
 return rgb

def build():
 bases={k:Image.open(ROOT/v).convert('RGB') for k,v in P.items()}
 originals={p:digest(ROOT/p) for p in subprocess.check_output(['git','ls-tree','-r','--name-only','a4a5c012ef32cd08e78c05914e742f9049a58f74'],cwd=ROOT,text=True).splitlines() if p.lower().endswith('.png')}
 # Album footprint includes book and its small cast shadow, excludes printer/cabinet front edge.
 allowed=Image.new('L',SIZE); ImageDraw.Draw(allowed).polygon([(254,96),(265,89),(303,89),(306,92),(307,104),(301,108),(290,110),(272,110),(253,107)],fill=255)
 album=bases['gallery'].copy()
 for y in range(89,111):
  for x in range(253,308):
   if not allowed.getpixel((x,y)): continue
   # Revealed wall samples come from the same x above book. Counter uses intact left surface.
   back_edge=101+(x-254)//12
   if y<back_edge: color=bases['gallery'].getpixel((x,86 if y<96 else 87))
   else:
    # Continue the broad ivory countertop plane; donor samples left of the album at matching height.
    color=bases['gallery'].getpixel((250,105 if y-back_edge<3 else 108))
   album.putpixel((x,y),color)
 album.save(OUT/'assets'/f'{NAMES[0]}.png')
 allowed.save(OUT/'masks/A-allowed.png')
 data=[dict(id='A',name=NAMES[0],parent='gallery',image=album,allowed=allowed)]
 specs=[('B','foyer',(32,64),(173,112)),('C','storage',(23,28),(145,56)),('D','storage',(24,15),(145,69)),('E','storage',(13,14),(150,70)),('F','storage',(14,21),(150,63))]
 for i,(id,parent,size,pos) in enumerate(specs,1):
  im=Image.new('RGBA',SIZE,(0,0,0,0)); obj=sprite(id,size)
  if id in ['D','E','F']:
   # Hard-edged contact shadow on the pad, below and a little right of the object.
   sd=ImageDraw.Draw(im); sd.rectangle((pos[0]+3,pos[1]+size[1]-2,pos[0]+size[0]+2,pos[1]+size[1]),fill=(72,120,117,255))
  im.paste(obj,pos,obj.getchannel('A'))
  # Bottommost object pixels never cross y=88; original drawer front lip at y=89 stays untouched.
  if parent=='storage': assert pos[1]+size[1]<=89
  am=Image.new('L',SIZE); ImageDraw.Draw(am).rectangle((pos[0],pos[1],pos[0]+size[0]+2,pos[1]+size[1]),fill=255)
  im.save(OUT/'assets'/f'{NAMES[i]}.png'); am.save(OUT/'masks'/f'{id}-allowed.png')
  data.append(dict(id=id,name=NAMES[i],parent=parent,image=im,allowed=am))
 # A small custom 4x7 mechanical block alphabet: exact word, no generative pseudo-text.
 font={'R':['1110','1001','1001','1110','1010','1001','1001'], 'E':['1111','1000','1000','1110','1000','1000','1111'], 'T':['1111','0110','0110','0110','0110','0110','0110'], 'U':['1001','1001','1001','1001','1001','1001','0110'], 'N':['1001','1101','1101','1011','1011','1001','1001'], 'S':['0111','1000','1000','0110','0001','0001','1110']}
 target=bases['utility'].copy(); d=ImageDraw.Draw(target)
 # Screen interior only; neutral dash has x240..257,y90..91. Preserve screen frame.
 d.rectangle((240,90,257,91),fill=bases['utility'].getpixel((239,90)))
 for i,c in enumerate('RETURNS'):
  for yy,row in enumerate(font[c]):
   for xx,v in enumerate(row):
    if v=='1': target.putpixel((232+i*5+xx,88+yy),(66,71,76))
 actual=diff(bases['utility'],target)
 overlay=Image.new('RGBA',SIZE,(0,0,0,0)); overlay.paste(target,(0,0),actual)
 am=Image.new('L',SIZE); ImageDraw.Draw(am).rectangle((229,84,270,99),fill=255)
 overlay.save(OUT/'assets'/f'{NAMES[6]}.png'); am.save(OUT/'masks/G-allowed.png')
 data.append(dict(id='G',name=NAMES[6],parent='utility',image=overlay,allowed=am))
 rows=[]
 for v in data:
  im=v['image']; base=bases[v['parent']]; am=v['allowed']
  comp=im if v['id']=='A' else Image.alpha_composite(base.convert('RGBA'),im).convert('RGB')
  dm=diff(base,comp); outside=ImageChops.subtract(dm,am)
  assert outside.getbbox() is None
  if im.mode=='RGBA':
   alpha=im.getchannel('A'); assert set(alpha.getdata())<={0,255}
   assert ImageChops.subtract(alpha,am).getbbox() is None
   assert all((r,g,b)==(0,0,0) for r,g,b,a in im.getdata() if a==0)
  assert im.size==SIZE
  dm.save(OUT/'masks'/f"{v['id']}-difference.png")
  base.save(OUT/'previews'/f"{v['id']}-before-native.png")
  comp.save(OUT/'previews'/f"{v['id']}-after-native.png")
  for label,img in [('before',base),('after',comp)]: img.resize((1256,824),Image.Resampling.NEAREST).save(OUT/'previews'/f"{v['id']}-{label}-4x.png")
  pair=Image.new('RGB',(628,206)); pair.paste(base); pair.paste(comp,(314,0)); pair.save(OUT/'previews'/f"{v['id']}-comparison-native.png")
  pair.resize((2512,824),Image.Resampling.NEAREST).save(OUT/'previews'/f"{v['id']}-comparison-4x.png")
  rows.append(dict(id=v['id'],file='assets/'+v['name']+'.png',status='generated',parent=P[v['parent']],size=list(im.size),mode=im.mode,sha256=digest(OUT/'assets'/f"{v['name']}.png"),allowed_bbox=am.getbbox(),actual_change_bbox=dm.getbbox(),changed_pixels=sum(x==255 for x in dm.getdata()),outside_changes=0,binary_alpha=True if im.mode=='RGBA' else None,hidden_rgb_zero=True if im.mode=='RGBA' else None))
 # All approved earlier PNGs remain byte-identical.
 assert all(digest(ROOT/p)==h for p,h in originals.items())
 (OUT/'original-art-hashes.json').write_text(json.dumps(originals,indent=2)+'\n')
 refs=list(P.values())+[f'art/items/{n}_{kind}.png' for n in ['small_desk_plant','red_swangline_stapler','rubber_band_ball','applause_timing_clicker'] for kind in ['slot','inspect']]
 pages=['review/chapter-01-batch03-2026-11-15/candidates/album-page-01-v02.png','review/chapter-01-batch03-2026-11-15/candidates/album-page-02-v01.png','review/chapter-01-batch03-2026-11-15/framing-revision-v03/candidates/album-page-03-v04.png']
 refs+=pages
 (OUT/'reference-hashes.json').write_text(json.dumps({p:digest(ROOT/p) for p in refs},indent=2)+'\n')
 for i,p in enumerate(pages,1):
  page=Image.open(ROOT/p).convert('RGB'); panel=Image.new('RGB',(898,298),(31,40,42)); panel.paste(album,(10,46)); panel.paste(page,(334,10)); panel.save(OUT/'previews'/f'album-focus-page-{i}.png')
 report=dict(baseline='a4a5c012ef32cd08e78c05914e742f9049a58f74',canonical_count=len(rows),original_png_count=len(originals),original_pngs_unchanged=True,assets=rows,generated_source_hashes={str(p.relative_to(OUT)):digest(p) for p in (OUT/'sources').glob('*.png')})
 (OUT/'qa.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(report,indent=2))
if __name__=='__main__': build()
