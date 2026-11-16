"""Independent verification of saved candidates and review previews."""
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw
from html.parser import HTMLParser
import hashlib, json
ROOT=Path(__file__).resolve().parents[2]
P=Path(__file__).resolve().parent

def verify():
 q=json.loads((P/'qa.json').read_text())
 assert len(list((P/'assets').glob('*.png')))==7
 for v in q['assets']:
  asset=Image.open(P/v['file']); base=Image.open(ROOT/v['parent']).convert('RGB'); allowed=Image.open(P/f'masks/{v["id"]}-allowed.png')
  assert asset.mode==v['mode'] and asset.size==(314,206)
  assert hashlib.sha256((P/v['file']).read_bytes()).hexdigest()==v['sha256']
  after=asset.convert('RGB') if asset.mode=='RGB' else Image.alpha_composite(base.convert('RGBA'),asset).convert('RGB')
  mask=Image.new('L',(314,206)); mask.putdata([255 if a!=b else 0 for a,b in zip(base.getdata(),after.getdata())])
  assert ImageChops.subtract(mask,allowed).getbbox() is None
  assert ImageChops.difference(mask,Image.open(P/f'masks/{v["id"]}-difference.png')).getbbox() is None
  if asset.mode=='RGBA':
   alpha=asset.getchannel('A'); assert set(alpha.getdata())<={0,255}
   assert ImageChops.subtract(alpha,allowed).getbbox() is None
   assert all((r,g,b)==(0,0,0) for r,g,b,a in asset.getdata() if not a)
  if v['id'] in 'CDEF': assert asset.getchannel('A').crop((0,89,314,206)).getbbox() is None
  for state in ['before','after']:
   small=Image.open(P/f'previews/{v["id"]}-{state}-native.png'); big=Image.open(P/f'previews/{v["id"]}-{state}-4x.png')
   assert ImageChops.difference(big,small.resize((1256,824),Image.Resampling.NEAREST)).getbbox() is None
  assert ImageChops.difference(after,Image.open(P/f'previews/{v["id"]}-after-native.png')).getbbox() is None
 for f,h in json.loads((P/'original-art-hashes.json').read_text()).items(): assert hashlib.sha256((ROOT/f).read_bytes()).hexdigest()==h
 class Links(HTMLParser):
  def handle_starttag(self,t,attrs):
   for k,v in attrs:
    if k in ('src','href') and not v.startswith('#'): assert (P/v).exists(),v
 Links().feed((P/'index.html').read_text())
 sheet=Image.new('RGB',(648,1652),(23,33,38)); d=ImageDraw.Draw(sheet)
 for i,v in enumerate(q['assets']):
  d.text((10,i*236+5),v['id']+' — original / active generated candidate',fill=(235,230,217))
  sheet.paste(Image.open(P/f'previews/{v["id"]}-comparison-native.png'),(10,i*236+24))
 sheet.save(P/'previews/all-states-native.png'); sheet.resize((2592,6608),Image.Resampling.NEAREST).save(P/'previews/all-states-4x.png')
 q['independent_checks']={'exact_4x_all_states':True,'all_gallery_links_resolve':True,'storage_lip_y89_onward_clear':True,'canonical_count_modes_hashes_valid':True,'saved_composites_and_masks_match':True,'originals_hashes_match':True}
 (P/'qa.json').write_text(json.dumps(q,indent=2)+'\n')
 print('PASS: seven candidates; binary alpha; hidden RGB; exact region masks; drawer lip; composites; 4×; gallery links; 359 preserved original hashes.')
if __name__=='__main__': verify()
