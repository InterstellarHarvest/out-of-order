"""Rebuild exact pixel candidates and review artifacts from immutable imagegen PNGs.
Requires Python 3 + Pillow. Run from any directory. No generation/API calls.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from collections import Counter
import hashlib, json, math, subprocess

ROOT = Path(__file__).resolve().parent
REPO = ROOT.parent.parent
ASSETS = [
    ('A', 'conveniences-bureau', 'biology_park/conveniences_bureau'),
    ('B', 'groundskeeper', 'biology_park/groundskeeper'),
    ('C', 'formal-entrance', 'biology_park/formal_entrance'),
    ('D', 'service-entry', 'biology_park/service_entry'),
    ('E', 'jungle-junction', 'biology_park/jungle_junction'),
    ('F', 'groundskeeper-background', 'biology_park/groundskeeper:portrait-background'),
    ('G', 'groundskeeper-foreground', 'groundskeeper:idle'),
]
def digest(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def pixels(im): return list(im.get_flattened_data())
def save(im, relative):
    p = ROOT / relative
    p.parent.mkdir(parents=True, exist_ok=True)
    im.save(p)
def preview(im, stem):
    save(im, f'previews/{stem}-native.png')
    enlarged = im.resize((im.width * 4, im.height * 4), Image.Resampling.NEAREST)
    save(enlarged, f'previews/{stem}-4x.png')
    # Every 4x4 block must reproduce its logical pixel, including alpha.
    for y in range(im.height):
        row = [im.getpixel((x,y)) for x in range(im.width) for _ in range(4)]
        for dy in range(4):
            assert pixels(enlarged.crop((0,y*4+dy,enlarged.width,y*4+dy+1))) == row

native, alpha, sources = {}, {}, {}
training = []
for key, name, registry in ASSETS:
    source = ROOT / f'generation-source/{key}-v01.png'
    raw = Image.open(source)
    sources[key] = {'path': str(source.relative_to(ROOT)), 'size': list(raw.size),
                    'mode': raw.mode, 'sha256': digest(source)}
    size = (314,206) if key <= 'E' else (564,278)
    im = raw.convert('RGBA').resize(size, Image.Resampling.NEAREST)
    if key == 'G':
        original_alpha = im.getchannel('A')
        # Keep generated silhouette; snap fractional coverage for crisp pixel edges.
        alpha[key] = original_alpha.point(lambda a: 255 if a >= 128 else 0)
        sources[key]['native_original_alpha_histogram'] = dict(sorted(Counter(pixels(original_alpha)).items()))
    else:
        assert im.getchannel('A').getextrema() == (255,255)
    native[key] = im.convert('RGB')
    rgb = pixels(native[key])
    training.extend([c for c,a in zip(rgb,pixels(alpha[key])) if a] if key in alpha else rgb)

# One shared 64-paint palette ensures paired layers use identical material colors.
# Quantization is nonspatial and uses NO dithering; no geometry is repainted.
train = Image.new('RGB',(len(training),1)); train.putdata(training)
learned = train.quantize(colors=48, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
# Reserve scarce signal/soil/leaf/light paints, which area-weighted training suppresses.
anchors = ['aa3223','d84d31','ed6348','6a3f25','53372b','866448','242827','1b3e2f',
           '32644a','528438','7b9b38','b2c34a','a9d3d9','d0edf0','fff4d5','f8efb8']
palette = learned.getpalette()[:144] + [int(c[i:i+2],16) for c in anchors for i in (0,2,4)]
palette_image = Image.new('P',(1,1))
palette_image.putpalette(palette * 4)
(ROOT/'palette.json').write_text(json.dumps({'method':'48 joint median-cut paints + 16 reserved signal/soil/leaf/light paints, no dithering','reserved_hex':anchors,'rgb':[palette[i:i+3] for i in range(0,192,3)]},indent=2)+'\n')
outputs, rows = {}, []
for key,name,registry in ASSETS:
    orig = native[key]
    out = orig.quantize(palette=palette_image,dither=Image.Dither.NONE).convert('RGB')
    if key == 'G':
        out = out.convert('RGBA'); out.putalpha(alpha[key])
        out.putdata([c if c[3] else (0,0,0,0) for c in pixels(out)])
    stem = f'{key}-{name}'
    path = f'candidates/{stem}.png'
    save(out,path); preview(out,stem); outputs[key]=out
    px = pixels(out); valid = [(i,c) for i,c in enumerate(px) if key!='G' or c[3]]
    errors = [sum((pixels_orig-cval)**2 for pixels_orig,cval in zip(orig.getpixel((i%out.width,i//out.width)),c[:3])) for i,c in valid]
    same = 0; edges = 0; singleton = 0
    for y in range(out.height):
        for x in range(out.width):
            c=out.getpixel((x,y))
            if key=='G' and c[3]==0: continue
            near=[]
            for nx,ny in [(x-1,y),(x+1,y),(x,y-1),(x,y+1)]:
                if 0<=nx<out.width and 0<=ny<out.height: near.append(out.getpixel((nx,ny)))
            if near and c not in near: singleton+=1
            for nx,ny in [(x+1,y),(x,y+1)]:
                if nx<out.width and ny<out.height:
                    edges+=1; same+= c==out.getpixel((nx,ny))
    row={'id':key,'registryId':registry,'status':'generated','candidatePath':path,'assetPath':None,
         'dimensions':list(out.size),'mode':out.mode,'sha256':digest(ROOT/path),
         'visible_colors':len(set(c[:3] for i,c in valid)),
         'quantization_rgb_rmse':round(math.sqrt(sum(errors)/len(errors)/3),3),
         'quantization_rgb_distance_p95':round(math.sqrt(sorted(errors)[int(len(errors)*.95)]),3),
         'isolated_four_neighbor_pixels':singleton,'isolated_fraction':round(singleton/len(valid),6),
         'equal_neighbor_edge_fraction':round(same/edges,6),'exact_4x_verified':True}
    if key=='G':
        h=out.getchannel('A').histogram()
        assert h[0]>0 and h[255]>0 and sum(h[1:255])==0
        assert all(c[:3]==(0,0,0) for c in px if c[3]==0)
        row.update(alpha_values=[0,255],transparent_pixels=h[0],opaque_pixels=h[255],
                   opaque_bounds=list(out.getchannel('A').getbbox()),hidden_rgb_zero=True)
    rows.append(row)

composite=Image.alpha_composite(outputs['F'].convert('RGBA'),outputs['G']).convert('RGB')
preview(composite,'groundskeeper-composite')
checker=Image.new('RGB',(564,278)); d=ImageDraw.Draw(checker)
for y in range(0,278,8):
    for x in range(0,564,8):d.rectangle((x,y,x+7,y+7),fill=('#536165' if (x//8+y//8)%2 else '#b2bdb8'))
checker.paste(outputs['G'],(0,0),outputs['G']);preview(checker,'groundskeeper-alpha-checker')
compare=Image.new('RGB',(900,310),'#16292c'); d=ImageDraw.Draw(compare)
d.text((8,8),'B / MAIN SCENE 314 x 206',fill='#f1ead4'); compare.paste(outputs['B'],(8,30))
d.text((330,8),'F + G / TIGHT CONVERSATION 564 x 278',fill='#f1ead4');compare.paste(composite,(330,30))
preview(compare,'scene-portrait-comparison')
sheet=Image.new('RGB',(972,470),'#16292c'); d=ImageDraw.Draw(sheet)
for i,(key,name,_) in enumerate(ASSETS[:5]):
    x=8+(i%3)*322;y=8+(i//3)*232
    d.text((x,y),f'{key} / {name.upper()}',fill='#f1ead4');sheet.paste(outputs[key],(x,y+18))
preview(sheet,'five-scenes')
swatches=Image.new('RGB',(512,256));d=ImageDraw.Draw(swatches)
for i in range(64):d.rectangle(((i%16)*32,(i//16)*64,(i%16+1)*32-1,(i//16+1)*64-1),fill=tuple(palette[i*3:i*3+3]))
save(swatches,'previews/palette.png')
# An illustrated direction sheet; the seven candidate assets remain separate.
direction=Image.new('RGB',(1720,1030),'#16292c'); d=ImageDraw.Draw(direction)
def font(size):
    for path in ['/System/Library/Fonts/Helvetica.ttc','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if Path(path).exists(): return ImageFont.truetype(path,size)
    return ImageFont.load_default(size=size)
def label(x,y,text,size=20,color='#eee7d2'):d.text((x,y),text,font=font(size),fill=color)
label(24,20,'THE ACCEPTABLE ERROR  /  BIOLOGY PARK',32)
label(24,64,'Chapter 2 visual foundation | Generated candidates | 15 November 2026',20,'#bacba8')
for i,(key,name,_) in enumerate(ASSETS[:5]):
    x=24+i*336
    label(x,112,key+' / '+name.replace('-',' ').upper(),14)
    direction.paste(outputs[key],(x,140))
for i,lines in enumerate([
    ['MODULAR PUBLIC OFFICE','Sealed WC leaves; early roots.'],
    ['POLITE INDUSTRIAL INVASION','Same office; local frame damage.'],
    ['FORMAL CREDENTIAL ROUTE','Turnstile + card reader.'],
    ['IMPROVISED SERVICE ROUTE','Low hatch + pipes + grating.'],
    ['THREE-WAY GEOGRAPHIC ANCHOR','Tower left / paths center / tram right.']]):
    for j,line in enumerate(lines):label(24+i*336,360+j*25,line,14,'#bacba8' if j else '#eee7d2')
label(24,436,'RECURRING MACHINE / INDEPENDENT CONVERSATION LAYERS',22)
direction.paste(composite,(24,480))
label(24,778,'Inspection slit + speaker grille / seed feeder / sage soil hopper / teal hoses',16)
label(630,478,'LOCK FOR FUTURE BATCHES',22)
for j,line in enumerate([
    '1960s exhibition machinery, institutional glazing and cool steel.',
    'Biological growth advances through working government systems.',
    'One manufactured sun above the enormous enclosed junction.',
    'Machine silhouette is nonhumanoid; no paired eyes or face.',
    'Portrait: same office-side direction, independently authored closer view.',
    'Native scenes 314 x 206; present at exact nearest-neighbor 4x.',
    'Portrait layers 564 x 278; background opaque, foreground transparent.',
    'No story/engine integration; review candidates pending acceptance.']):
    label(630,520+j*31,line,18,'#c9d2c3')
label(24,848,'SHARED 64-PAINT PALETTE / NO DITHERING',22)
for i in range(64):
    x=24+i*26
    d.rectangle((x,890,x+25,939),fill=tuple(palette[i*3:i*3+3]))
label(24,964,'48 learned material paints + 16 reserved signal/soil/leaf/light paints. See palette.json, qa.json and VISUAL_DIRECTION.md.',18,'#bacba8')
save(direction,'previews/chapter-02-visual-direction.png')
preserved=json.loads((ROOT/'baseline-hashes.json').read_text())
violations=[p for p,h in preserved.items() if not (REPO/p).exists() or digest(REPO/p)!=h]
assert not violations, violations
qa={'checks_passed':True,'candidate_count':7,'opaque_scene_count':5,'opaque_portrait_background_count':1,
    'transparent_portrait_foreground_count':1,'shared_palette_colors':64,'resampling':'nearest-neighbor',
    'palette_dithering':'none','alpha_processing':'native NEAREST, threshold at 128; hidden RGB zero',
    'density_note':'Measured four-neighbor singleton pixels and equal-neighbor edges are descriptive, not a perceptual quality guarantee. Lettering and fern tips contribute legitimate singleton pixels.',
    'preservation':{'baseline_files_checked':len(preserved),'violations':violations},'assets':rows}
(ROOT/'qa.json').write_text(json.dumps(qa,indent=2)+'\n')
(ROOT/'manifest.json').write_text(json.dumps({'status':'generated','not_integrated':True,'assets':rows,'sources':sources},indent=2)+'\n')
inputs=[p for folder in ['generation-source','sources','prompts'] for p in (ROOT/folder).glob('*') if p.is_file()]
(ROOT/'SOURCE_SHA256SUMS.txt').write_text(''.join(f'{digest(p)}  {p.relative_to(ROOT)}\n' for p in sorted(inputs)))
print(json.dumps({'passed':True,'baseline_preserved':len(preserved),'assets':[{k:r[k] for k in ['id','dimensions','mode','visible_colors','quantization_rgb_rmse','isolated_fraction']} for r in rows]},indent=2))
