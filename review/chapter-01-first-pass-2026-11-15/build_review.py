"""Reproduce review exports from preserved imagegen sources. Requires Pillow only."""
from pathlib import Path
from collections import Counter, deque, defaultdict
from itertools import product
import hashlib
import html
import json
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = HERE / 'candidates'
PREVIEW = HERE / 'previews'
OUT.mkdir(exist_ok=True)
PREVIEW.mkdir(exist_ok=True)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def near_color_merge(image, radius=12):
    """Merge near-identical RGB values, without moving or averaging any pixels.

    Representatives are actual source colors, selected by descending frequency.
    No palette-count target, spatial filter, dithering or neighborhood averaging.
    """
    rgba = image.mode == 'RGBA'
    pixels = list(image.getdata())
    counts = Counter(tuple(p[:3]) for p in pixels if not rgba or p[3])
    buckets = defaultdict(list)
    mapping = {}
    for color, count in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
        key = tuple(c // radius for c in color)
        best, dist = None, radius * radius + 1
        for offset in product((-1, 0, 1), repeat=3):
            for candidate in buckets[tuple(key[i] + offset[i] for i in range(3))]:
                d = sum((a-b)**2 for a, b in zip(color, candidate))
                if d < dist:
                    best, dist = candidate, d
        if best is None:
            best = color
            buckets[key].append(color)
        mapping[color] = best
    result = Image.new(image.mode, image.size)
    result.putdata([(mapping[tuple(p[:3])] + (p[3],)) if p[3] else (0, 0, 0, 0)
                    for p in pixels] if rgba else [mapping[p] for p in pixels])
    return result, len(counts), len(set(mapping.values()))


def aspect_box(image, size):
    w, h = image.size
    ratio = size[0] / size[1]
    if w/h > ratio:
        used = h * ratio
        return ((w-used)/2, 0, (w+used)/2, h)
    used = w / ratio
    return (0, (h-used)/2, w, (h+used)/2)


def largest_alpha_component(image):
    """Discard isolated generator alpha flecks; preserve the connected speaker."""
    w, h = image.size
    available = bytearray(1 if a >= 128 else 0 for a in image.getchannel('A').tobytes())
    best = []
    for start in range(w*h):
        if not available[start]:
            continue
        available[start] = 0
        queue, component = deque([start]), []
        while queue:
            i = queue.popleft()
            component.append(i)
            x, y = i % w, i // w
            for j in ((i-1 if x else -1), (i+1 if x+1 < w else -1),
                      (i-w if y else -1), (i+w if y+1 < h else -1)):
                if j >= 0 and available[j]:
                    available[j] = 0
                    queue.append(j)
        if len(component) > len(best):
            best = component
    mask = bytearray(w*h)
    for i in best:
        mask[i] = 255
    cleaned = image.copy()
    cleaned.putalpha(Image.frombytes('L', (w, h), bytes(mask)))
    return cleaned


records = [
    ('A', 'Foyer', 'scenes.house_of_tomorrow/foyer', 'A-foyer-speaker-v03.png', 'foyer.png', (314, 206)),
    ('B', 'Dining room', 'scenes.house_of_tomorrow/dining', 'B-dining-speaker-v03.png', 'dining.png', (314, 206)),
    ('C', 'Bathroom', 'scenes.house_of_tomorrow/bathroom', 'C-bathroom-v02.png', 'bathroom.png', (314, 206)),
    ('D', 'Foyer portrait background', 'scenes.house_of_tomorrow/foyer.portraitBackground', 'D-foyer-background-v03.png', 'foyer-portrait-background.png', (564, 278)),
    ('E', 'House speaker foreground', 'portraits.house:idle', 'E-house-speaker-v03.png', 'house-speaker.png', (564, 278)),
]
assets = []
for code, title, registry, source_name, filename, size in records:
    source = HERE / 'generation-source' / source_name
    image = Image.open(source)
    source_size = image.size
    if code == 'E':
        image = largest_alpha_component(image.convert('RGBA'))
        crop = image.getbbox()
        unit = image.crop(crop)
        # Direct premultiplied-alpha reduction of original speaker pixels.
        fit = min(196/unit.width, 164/unit.height)
        fitted_size = (round(unit.width*fit), round(unit.height*fit))
        unit = unit.convert('RGBa').resize(fitted_size, Image.Resampling.LANCZOS).convert('RGBA')
        unit = largest_alpha_component(unit)
        image = Image.new('RGBA', size, (0, 0, 0, 0))
        position = (330-unit.width//2, 23)
        image.paste(unit, position)
        transform = {'method': 'largest connected alpha component; original component crop; premultiplied-alpha LANCZOS direct reduction; hard alpha 0/255; zero RGB outside sprite',
                     'sourceComponentBox': list(crop), 'unitSize': list(unit.size), 'unitPosition': list(position)}
    else:
        image = image.convert('RGB')
        box = aspect_box(image, size)
        method = Image.Resampling.NEAREST if code in 'ABC' else Image.Resampling.LANCZOS
        image = image.resize(size, method, box=box)
        transform = {'method': 'exact-aspect centered crop; '+('NEAREST scene reduction' if code in 'ABC' else 'LANCZOS reduction of independently generated portrait background'), 'sourceBox': list(box)}
    cleanup_radius = 12 if code in 'DE' else 24
    image, before, after = near_color_merge(image, radius=cleanup_radius)
    transform['colorCleanup'] = {'method': 'non-spatial merge to existing frequent RGB colors; no fixed color-count target', 'rgbRadius': cleanup_radius, 'colorsBefore': before, 'colorsAfter': after}
    output = OUT / filename
    image.save(output)
    colors = Counter(tuple(p[:3]) for p in image.getdata() if image.mode != 'RGBA' or p[3])
    palette = [{'hex': '#%02x%02x%02x' % rgb, 'pixels': n} for rgb, n in colors.most_common(16)]
    asset = {'id': code, 'title': title, 'registryRecord': registry, 'status': 'generated', 'ownerApproved': False,
             'assetPath': None, 'candidatePath': 'candidates/'+filename, 'dimensions': list(size), 'mode': image.mode,
             'sha256': sha(output), 'sourcePath': 'generation-source/'+source_name, 'sourceDimensions': list(source_size),
             'sourceSha256': sha(source), 'normalization': transform, 'visibleColorCount': len(colors), 'dominantPalette': palette}
    if code in 'ABC':
        image.resize((1256, 824), Image.Resampling.NEAREST).save(PREVIEW / (filename.removesuffix('.png')+'-4x.png'))
    if code == 'E':
        asset['alphaValues'] = sorted(set(image.getchannel('A').getdata()))
        asset['spriteBounds'] = list(image.getbbox())
    assets.append(asset)

bg = Image.open(OUT / 'foyer-portrait-background.png').convert('RGBA')
fg = Image.open(OUT / 'house-speaker.png')
Image.alpha_composite(bg, fg).convert('RGB').save(PREVIEW / 'foyer-portrait-composite.png')

# These are derived review sheets, never additional registry assets.
sheet = Image.new('RGB', (1002, 254), '#f5f1e4')
draw = ImageDraw.Draw(sheet)
for i, asset in enumerate(assets[:3]):
    x = 14+i*332
    draw.text((x, 10), asset['title']+' / 314x206 / generated', fill='#413b34')
    sheet.paste(Image.open(HERE / asset['candidatePath']), (x, 32))
sheet.save(PREVIEW / 'three-scene-contact-sheet.png')

manifest = {'title': 'House of Tomorrow — first batch', 'sourceBranch': 'agent/ch01-playable-import-20261115',
            'sourceCommit': '84be05f21ad7f1d39c6841a603487cdc8c7a9bd4', 'artBranch': 'agent/ch01-art-first-pass-20261115',
            'method': 'built-in image_gen.imagegen; exact prompts in prompts.json; exports reproduced by build_review.py',
            'ownerDirection': 'Distinct inviting 1960s exposition future home; no reception color/design matching. Domestic loudspeakers, no ventilation louvers.',
            'status': 'generated', 'productionIntegration': False, 'candidateCount': 5, 'assets': assets,
            'deferredRegistryRecordCount': 15, 'derivedPreviewsAreNotAdditionalCandidates': True}
(HERE / 'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')

cards = []
for asset in assets:
    code, title, path = asset['id'], html.escape(asset['title']), asset['candidatePath']
    swatches = ''.join('<span class="swatch" style="background:'+c['hex']+'" title="'+c['hex']+'"></span>' for c in asset['dominantPalette'])
    native = '<div class="checker" style="width:564px;height:278px"><img width="564" height="278" src="'+path+'" alt="'+title+' transparent foreground"></div>' if code == 'E' else '<img src="'+path+'" alt="'+title+' native-size candidate" width="'+str(asset['dimensions'][0])+'" height="'+str(asset['dimensions'][1])+'">'
    enlarged = '<details><summary>View exact 4× nearest-neighbor (1256×824)</summary><div class="scroll"><img class="pixels" src="'+path+'" width="1256" height="824" alt="'+title+' at exact four times native size"></div></details>' if code in 'ABC' else ''
    cards.append('<article id="'+code+'"><h2>'+code+' · '+title+'</h2><p class="meta">'+str(asset['dimensions'][0])+' × '+str(asset['dimensions'][1])+' · '+asset['mode']+' · <strong>generated — owner review pending</strong> · '+str(asset['visibleColorCount'])+' visible RGB colors</p><div class="scroll">'+native+'</div><p class="palette">'+swatches+'</p><p><a href="'+path+'" download>Download candidate PNG</a> · <a href="'+asset['sourcePath']+'">Preserved generation source</a></p>'+enlarged+'</article>')
comparison = ''.join('<figure><img class="pixels" width="314" height="206" src="'+a['candidatePath']+'" alt="'+html.escape(a['title'])+'"><figcaption>'+html.escape(a['title'])+' · native 314×206</figcaption></figure>' for a in assets[:3])
superseded = ''.join('<li><a href="'+str(f.relative_to(HERE))+'">'+html.escape(f.stem)+'</a></li>' for f in sorted((HERE/'generation-source').rglob('*.png')) if f.name not in {a['sourcePath'].split('/')[-1] for a in assets})
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>House of Tomorrow — private art review</title>
<style>*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:#f5f1e4;color:#393832;font:16px/1.5 system-ui,sans-serif}main{max-width:1440px;margin:auto;padding:28px}h1{font-size:30px;line-height:1.2}h2{font-size:22px}a{color:#27565e}nav{display:flex;gap:16px;flex-wrap:wrap}article,section{background:#fffaf0;border:1px solid #d7c6a8;border-radius:6px;padding:20px;margin:24px 0}.banner{border-left:6px solid #d78b6f;padding:12px 18px;background:#fff2d5}.meta{color:#655c4e;font-size:14px}.scroll{overflow:auto;padding:10px 0}img{display:block;max-width:none;image-rendering:pixelated;image-rendering:crisp-edges}.compare{display:flex;gap:20px;flex-wrap:wrap}figure{margin:0}figcaption{font-size:13px;padding-top:8px}.swatch{display:inline-block;width:26px;height:24px;border:1px solid #998d7b}.palette{display:flex;gap:3px;flex-wrap:wrap}.checker{background-color:#ddd;background-image:linear-gradient(45deg,#bbb 25%,transparent 25%),linear-gradient(-45deg,#bbb 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#bbb 75%),linear-gradient(-45deg,transparent 75%,#bbb 75%);background-size:20px 20px;background-position:0 0,0 10px,10px -10px,-10px 0}.stack{position:relative;width:564px;height:278px}.stack img{position:absolute;inset:0}summary{cursor:pointer;font-weight:600;margin:12px 0}label{display:inline-block;margin-right:18px}code{font-size:13px}footer{margin:28px 0;font-size:14px}</style>
<main><h1>House of Tomorrow</h1><p>Chapter 1 · first-batch private artwork review · 15 November 2026</p>
<p class="banner"><strong>Five generated candidates. Owner visual approval pending.</strong><br>Warm, desirable 1960s future domestic living. Machine behavior supplies the unease. This House deliberately differs from reception in color and design.</p>
<nav><a href="#consistency">Room consistency</a><a href="#A">Foyer</a><a href="#B">Dining</a><a href="#C">Bathroom</a><a href="#D">Portrait wall</a><a href="#E">Speaker</a><a href="#composite">Composite</a></nav>
<p><a href="ART_DIRECTION.md">All 20 asset plans</a> · <a href="CONFLICTS.md">Story/art requirements report</a> · <a href="prompts.json">Exact generation prompts</a> · <a href="manifest.json">Dimensions, palettes, provenance and hashes</a> · <a href="QA.md">Checks and limits</a></p>
<section id="consistency"><h2>Three-room consistency</h2><p>All three scenes are displayed below at their native 314×206. Check ivory finishes, blond cabinetry, aqua molded furniture, thin aluminum trim and clear domestic purpose. Four settings; three family chairs remain empty. No people appear in the scenes.</p><div class="compare">'''+comparison+'''</div><p><a href="previews/three-scene-contact-sheet.png">Download contact sheet</a></p></section>
'''+''.join(cards)+'''
<section id="composite"><h2>Layered foyer speaker portrait · 564×278</h2><p>Independent close-up wall composition plus transparent speaker sprite. Toggle layers to inspect the separation. The checkerboard is gallery CSS, not painted into the sprite.</p><p><label><input id="show-bg" type="checkbox" checked> Background</label><label><input id="show-fg" type="checkbox" checked> Speaker foreground</label></p><div class="scroll"><div class="stack checker"><img id="portrait-bg" src="candidates/foyer-portrait-background.png" width="564" height="278" alt="Independent foyer wall background"><img id="portrait-fg" src="candidates/house-speaker.png" width="564" height="278" alt="Separate transparent House speaker"></div></div><p><a href="previews/foyer-portrait-composite.png">Download flattened comparison preview</a> — review preview only, not a replacement for the two source layers.</p><div class="compare"><figure><img src="candidates/foyer.png" width="314" height="206" alt="Foyer main scene"><figcaption>Scene density · 314×206</figcaption></figure><figure><img src="previews/foyer-portrait-composite.png" width="564" height="278" alt="Composited speaker close-up"><figcaption>Independent portrait density · 564×278</figcaption></figure></div></section>
<section><h2>Preserved earlier versions</h2><details><summary>Superseded generation sources — not current candidates</summary><p>The reception-like first direction and vent-like speakers were superseded by owner direction. Originals remain available for comparison.</p><ul>'''+superseded+'''</ul></details></section>
<footer>Review-only package. Production registry assetPath values, story text, gameplay, public storyboard and approved reception remain unchanged. Fifteen remaining asset records are planned and not generated. Native scene exports use NEAREST geometry from deliberately pixel-like imagegen sources; portraits were independently generated. Full transformations and measured palettes are recorded in manifest.json. No outside services, fonts or analytics.</footer></main>
<script>for(const [control,layer] of [['show-bg','portrait-bg'],['show-fg','portrait-fg']]){document.getElementById(control).addEventListener('change',e=>{document.getElementById(layer).hidden=!e.target.checked;});}</script></html>'''
(HERE/'index.html').write_text(page)
for a in assets:
    print(a['id'], a['candidatePath'], a['dimensions'], a['mode'], a['visibleColorCount'], 'colors', a.get('spriteBounds', ''))
