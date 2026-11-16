"""Local pixel edit: move existing station forward; add rug-covered floor hatch."""
from pathlib import Path
from PIL import Image, ImageDraw, ImageChops
import json,hashlib,subprocess
HERE=Path(__file__).resolve().parent
BATCH=HERE.parent
ROOT=HERE.parents[2]
BASE='review/chapter-01-batch04-2026-11-15/door-continuity-v01/candidates/foyer-single-door-v03.png'
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def build():
 base=Image.open(ROOT/BASE).convert('RGB')
 old=Image.open(BATCH/'assets/B-plant-adoption.png').convert('RGBA')
 # Reuse the original isolated render, preserving the plant, lamp, nozzle and pedestal design.
 source=BATCH/'sources/B-plant-pedestal-render.png'
 obj=Image.open(source).convert('RGBA'); alpha=obj.getchannel('A').point(lambda a:255 if a>=240 else 0)
 obj.putalpha(alpha); obj=obj.crop(alpha.getbbox()).resize((40,80),Image.Resampling.NEAREST)
 a=obj.getchannel('A'); obj=obj.convert('RGB').quantize(colors=24,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE).convert('RGB'); obj.putalpha(a)
 obj.putdata([(r,g,b,255) if a else (0,0,0,0) for r,g,b,a in obj.getdata()])
 overlay=Image.new('RGBA',(314,206),(0,0,0,0)); d=ImageDraw.Draw(overlay)
 # A carpet-faced hinged lid and a shallow, perspective-correct floor well, wholly in the rug.
 rug=base.getpixel((180,200)); trim=(205,199,175,255); dark=(76,73,61,255)
 opening=[(175,189),(203,189),(214,199),(163,199)]
 d.polygon([(173,188),(205,188),(217,201),(160,201)],fill=trim)
 d.polygon(opening,fill=dark)
 d.line([(163,199),(214,199)],fill=(240,222,186,255),width=1)
 # Small lid leans back on its rear hinge; its top is the same coral carpet as the rug.
 d.polygon([(174,182),(202,182),(205,188),(172,188)],fill=(132,85,65,255))
 d.polygon([(175,182),(201,182),(203,186),(174,186)],fill=(*rug,255))
 d.line([(174,187),(204,187)],fill=(242,171,132,255),width=1)
 d.line([(176,189),(202,189)],fill=(216,205,178,255),width=1)
 # Station is 25% larger in both axes and its foot is now near y=193, over the rug hatch.
 overlay.paste(obj,(168,114),obj.getchannel('A'))
 overlay.save(HERE/'B-plant-adoption-v02.png')
 allowed=Image.new('L',(314,206)); ad=ImageDraw.Draw(allowed); ad.rectangle((168,114,207,193),fill=255); ad.polygon([(174,182),(202,182),(205,188),(217,201),(160,201),(172,188)],fill=255)
 # The station shadow at lower right is confined to the full sprite rectangle.
 alpha=overlay.getchannel('A'); assert ImageChops.subtract(alpha,allowed).getbbox() is None
 assert set(alpha.getdata())<={0,255}
 assert all((r,g,b)==(0,0,0) for r,g,b,a in overlay.getdata() if not a)
 comp=Image.alpha_composite(base.convert('RGBA'),overlay).convert('RGB')
 previous=Image.alpha_composite(base.convert('RGBA'),old).convert('RGB')
 mask=Image.new('L',base.size); mask.putdata([255 if x!=y else 0 for x,y in zip(base.getdata(),comp.getdata())])
 assert ImageChops.subtract(mask,allowed).getbbox() is None
 # Every floor-well corner (including trim) sits on the original coral rug.
 for xy in [(173,188),(205,188),(217,201),(160,201)]:
  r,g,b=base.getpixel(xy); assert r>g*1.3 and r>b*1.3,(xy,(r,g,b))
 allowed.save(HERE/'allowed-mask.png'); mask.save(HERE/'difference-mask.png')
 for n,im in [('original-foyer',base),('previous',previous),('revised',comp)]:
  im.save(HERE/f'{n}-native.png'); big=im.resize((1256,824),Image.Resampling.NEAREST); big.save(HERE/f'{n}-4x.png')
  assert ImageChops.difference(big,im.resize((1256,824),Image.Resampling.NEAREST)).getbbox() is None
 pair=Image.new('RGB',(628,206)); pair.paste(previous); pair.paste(comp,(314,0)); pair.save(HERE/'comparison-native.png'); pair.resize((2512,824),Image.Resampling.NEAREST).save(HERE/'comparison-4x.png')
 tracked=subprocess.check_output(['git','ls-tree','-r','--name-only','5d1db9865fba0d51de8839d22f16410fee54bae8'],cwd=ROOT,text=True).splitlines()
 pngs=[p for p in tracked if p.endswith('.png')]
 for p in pngs:
  prior=subprocess.check_output(['git','rev-parse',f'5d1db9865fba0d51de8839d22f16410fee54bae8:{p}'],cwd=ROOT,text=True).strip()
  current=subprocess.check_output(['git','hash-object',str(ROOT/p)],cwd=ROOT,text=True).strip(); assert prior==current,p
 report={'status':'generated','supersedes_for_review':'../assets/B-plant-adoption.png','source':BASE,'source_sha256':sha(ROOT/BASE),'isolated_render_sha256':sha(source),'previous_overlay_sha256':sha(BATCH/'assets/B-plant-adoption.png'),'candidate_sha256':sha(HERE/'B-plant-adoption-v02.png'),'size':[314,206],'mode':'RGBA','station_size':[40,80],'station_origin':[168,114],'previous_station_size':[32,64],'scale_increase':'25% each axis','allowed_bbox':allowed.getbbox(),'changed_pixels':sum(p==255 for p in mask.getdata()),'outside_region_changes':0,'binary_alpha':True,'hidden_rgb_zero':True,'floor_hatch_corners_on_original_rug':True,'exact_4x':True,'prior_pngs_byte_identical':len(pngs)}
 (HERE/'qa.json').write_text(json.dumps(report,indent=2)+'\n'); print(json.dumps(report,indent=2))
if __name__=='__main__': build()
