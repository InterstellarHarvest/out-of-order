"""Export imagegen edits while retaining original scene pixels outside speaker regions."""
from pathlib import Path
from collections import Counter, defaultdict
from itertools import product
import hashlib
import html
import json
from PIL import Image, ImageChops, ImageDraw

HERE = Path(__file__).resolve().parent
OLD = HERE.parent / 'chapter-01-first-pass-2026-11-15'
OUT = HERE / 'candidates'
PREV = HERE / 'previews'
OUT.mkdir(exist_ok=True)
PREV.mkdir(exist_ok=True)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def box_for(im, size):
    w, h = im.size
    ratio = size[0]/size[1]
    if w/h > ratio:
        used = h*ratio
        return ((w-used)/2, 0, (w+used)/2, h)
    used = w/ratio
    return (0, (h-used)/2, w, (h+used)/2)


def color_merge(im, radius=12):
    counts = Counter(im.getdata())
    buckets, mapping = defaultdict(list), {}
    for color, count in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
        key = tuple(c//radius for c in color)
        best, distance = None, radius*radius+1
        for offset in product((-1, 0, 1), repeat=3):
            for candidate in buckets[tuple(key[i]+offset[i] for i in range(3))]:
                d = sum((a-b)**2 for a, b in zip(color, candidate))
                if d < distance:
                    best, distance = candidate, d
        if best is None:
            best = color
            buckets[key].append(color)
        mapping[color] = best
    result = Image.new('RGB', im.size)
    result.putdata([mapping[c] for c in im.getdata()])
    return result


def existing_palette(patch, original, region):
    # Preserve the room's actual palette; no new scene-wide recoloring or palette cap.
    palette = sorted(set(original.getdata()))
    border = original.crop(region)
    warm = lambda c: c[0] > 175 and c[1] > 145 and c[0] >= c[1] >= c[2] and c[2] > 90
    edge = [border.getpixel((x,y)) for y in range(border.height) for x in range(border.width) if x in (0,border.width-1) or y in (0,border.height-1)]
    old_wall = Counter(c for c in edge if warm(c)).most_common(1)[0][0]
    new_wall = Counter(c for c in patch.getdata() if warm(c)).most_common(1)[0][0]
    shift = tuple(a-b for a,b in zip(old_wall,new_wall))
    aligned = Image.new('RGB', patch.size)
    aligned.putdata([tuple(max(0,min(255,c[i]+shift[i])) for i in range(3)) if warm(c) else c for c in patch.getdata()])
    patch = aligned
    mapping = {c: min(palette, key=lambda p: sum((a-b)**2 for a, b in zip(c, p)))
               for c in set(patch.getdata())}
    result = Image.new('RGB', patch.size)
    result.putdata([mapping[c] for c in patch.getdata()])
    return result, list(shift)


def pair(before, after, title, name):
    sheet = Image.new('RGB', (before.width+after.width+24, max(before.height, after.height)+52), '#f5f1e4')
    draw = ImageDraw.Draw(sheet)
    draw.text((4, 4), title, fill='#393832')
    draw.text((4, 20), 'Before', fill='#393832')
    draw.text((before.width+24, 20), 'After', fill='#393832')
    sheet.paste(before, (0, 40))
    sheet.paste(after, (before.width+24, 40))
    sheet.save(PREV/name)


assets = []
for room, region in [('foyer', (189, 47, 244, 95)), ('dining', (84, 44, 108, 72))]:
    before_path = OLD/'candidates'/(room+'.png')
    source_path = HERE/'generation-source'/(room+'-intercom-v05.png')
    before = Image.open(before_path).convert('RGB')
    source = Image.open(source_path).convert('RGB')
    crop_box = box_for(source, (314, 206))
    generated = source.resize((314, 206), Image.Resampling.NEAREST, box=crop_box)
    patch, wall_color_shift = existing_palette(generated.crop(region), before, region)
    after = before.copy()
    after.paste(patch, region[:2])
    output = OUT/(room+'-v04.png')
    after.save(output)
    changed = sum(a != b for a, b in zip(before.getdata(), after.getdata()))
    outside = after.copy()
    outside.paste(before.crop(region), region[:2])
    assert ImageChops.difference(outside, before).getbbox() is None
    asset = {'id': room, 'title': room.title(), 'kind': 'scene', 'status': 'generated', 'ownerApproved': False,
             'assetPath': None, 'candidatePath': 'candidates/'+output.name, 'dimensions': [314, 206], 'mode': 'RGB',
             'sha256': sha(output), 'beforePath': '../'+OLD.name+'/candidates/'+before_path.name,
             'beforeSha256': sha(before_path), 'sourcePath': 'generation-source/'+source_path.name,
             'sourceSha256': sha(source_path), 'sourceDimensions': list(source.size),
             'normalization': {'sourceBox': list(crop_box), 'geometry': 'NEAREST to 314x206; export generated speaker-area edit only',
                               'editRegion': list(region), 'colorPolicy': 'non-spatial warm wall-tone alignment to original border, then nearest match to existing scene colors inside edit region only', 'warmColorShiftRGB': wall_color_shift},
             'changedPixels': changed, 'changedPixelsOutsideEditRegion': 0,
             'speakerApproximateBounds': [207, 59, 225, 84] if room == 'foyer' else [91, 50, 103, 67]}
    assets.append(asset)
    pair(before, after, room.title()+' native 314x206', room+'-before-after.png')
    after.resize((1256, 824), Image.Resampling.NEAREST).save(PREV/(room+'-4x.png'))
    pair(before.crop(region).resize((patch.width*4, patch.height*4), Image.Resampling.NEAREST),
         patch.resize((patch.width*4, patch.height*4), Image.Resampling.NEAREST),
         room.title()+' speaker region at 4x', room+'-speaker-before-after-4x.png')

source = HERE/'generation-source/foyer-conversation-v04.png'
im = Image.open(source).convert('RGB')
crop_box = box_for(im, (564, 278))
portrait = color_merge(im.resize((564, 278), Image.Resampling.LANCZOS, box=crop_box))
output = OUT/'foyer-conversation-v04.png'
portrait.save(output)
assets.append({'id': 'foyer-conversation', 'title': 'Foyer conversation close-up', 'kind': 'portrait-complete',
               'presentation': 'complete-opaque', 'scene': 'house_of_tomorrow/foyer', 'status': 'generated',
               'ownerApproved': False, 'assetPath': None, 'candidatePath': 'candidates/'+output.name,
               'dimensions': [564, 278], 'mode': 'RGB', 'sha256': sha(output),
               'sourcePath': 'generation-source/'+source.name, 'sourceSha256': sha(source),
               'sourceDimensions': list(im.size),
               'beforePath': '../'+OLD.name+'/previews/foyer-portrait-composite.png',
               'beforeSha256': sha(OLD/'previews/foyer-portrait-composite.png'),
               'normalization': {'sourceBox': list(crop_box), 'geometry': 'LANCZOS to 564x278 from independently authored complete close-up',
                                 'colorPolicy': 'non-spatial merge to existing frequent RGB values within radius12; no fixed palette-count target'},
               'speakerApproximateBounds': [288, 58, 367, 168]})
pair(Image.open(OLD/'previews/foyer-portrait-composite.png').convert('RGB'), portrait,
     'Conversation native 564x278', 'conversation-before-after.png')
for a in assets:
    colors = Counter(Image.open(HERE/a['candidatePath']).getdata())
    a['visibleColorCount'] = len(colors)
    a['dominantPalette'] = [{'hex': '#%02x%02x%02x' % rgb, 'pixels': n} for rgb, n in colors.most_common(12)]

manifest = {'title': 'House speaker redesign and complete portrait exception', 'date': '2026-11-15',
            'branch': 'agent/ch01-art-first-pass-20261115', 'baselineCommit': '3a763b52c1d60027549542d47381f4fbba412117',
            'status': 'generated', 'candidateCount': 3, 'method': 'built-in image_gen.imagegen; exact prompts in prompts.json',
            'portraitContract': 'House-only complete opaque 564x278 scene-specific conversation image; no separate foreground/background',
            'engineIntegration': False, 'registryProposalApplied': False, 'assets': assets,
            'bathroomUnchangedSha256': sha(OLD/'candidates/bathroom.png'),
            'historicalLayeredAssets': 'Prior first-pass images retained for comparison, superseded for House speaker use.'}
(HERE/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')

sections = []
for a in assets:
    is_scene = a['kind'] == 'scene'
    w, h = a['dimensions']
    compare = a['id']+'-before-after.png' if is_scene else 'conversation-before-after.png'
    swatches = ''.join('<span class="swatch" title="'+c['hex']+'" style="background:'+c['hex']+'"></span>' for c in a['dominantPalette'])
    details = ''
    if is_scene:
        region = a['normalization']['editRegion']
        rw, rh = region[2]-region[0], region[3]-region[1]
        details = '<p>'+str(a['changedPixels'])+' edited pixels; <strong>zero changes outside the speaker region</strong>.</p><details><summary>Exact 4x nearest-neighbor room and speaker comparison</summary><div class="scroll"><img src="previews/'+a['id']+'-4x.png" width="1256" height="824" alt="'+a['title']+' exact four-times view"></div><div class="scroll"><img src="previews/'+a['id']+'-speaker-before-after-4x.png" alt="Speaker detail before and after at four times native size"></div></details>'
    sections.append('<section id="'+a['id']+'"><h2>'+html.escape(a['title'])+'</h2><p>'+str(w)+' × '+str(h)+' · opaque RGB · '+str(a['visibleColorCount'])+' colors · <strong>generated, owner approval pending</strong></p><div class="compare"><figure><img src="'+a['beforePath']+'" width="'+str(w)+'" height="'+str(h)+'" alt="Previous '+a['title']+'"><figcaption>Before · retained for comparison</figcaption></figure><figure><img src="'+a['candidatePath']+'" width="'+str(w)+'" height="'+str(h)+'" alt="Revised '+a['title']+'"><figcaption>After · current candidate</figcaption></figure></div><p class="palette">'+swatches+'</p><p><a href="'+a['candidatePath']+'" download>Download candidate</a> · <a href="previews/'+compare+'">Download before/after sheet</a> · <a href="'+a['sourcePath']+'">Preserved imagegen source</a></p>'+details+'</section>')
gallery = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>House intercom revision — private owner review</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f1e4;color:#393832;font:16px/1.5 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:28px}h1{font-size:30px}h2{font-size:22px}a{color:#27565e}.banner,section{padding:20px;background:#fffaf0;border:1px solid #d7c6a8;margin:24px 0}.banner{border-left:6px solid #d78b6f}.compare{display:flex;gap:24px;flex-wrap:wrap;overflow:auto}figure{margin:0}figcaption{font-size:13px;padding:6px 0}.scroll{overflow:auto;padding:12px 0}img{display:block;max-width:none;image-rendering:pixelated;image-rendering:crisp-edges}.palette{display:flex;gap:3px}.swatch{width:26px;height:24px;border:1px solid #998d7b}summary{cursor:pointer;font-weight:600}nav{display:flex;flex-wrap:wrap;gap:18px}code{font-size:13px}</style><main>
<h1>House of Tomorrow · integrated intercom</h1><p>Speaker redesign and complete conversation-portrait correction · 15 November 2026</p><p class="banner"><strong>Three generated candidates. Owner visual approval pending.</strong><br>Flush ivory domestic intercom, recessed pivoting faceplate, no stand or lower support. The House uses one complete opaque conversation image. Room direction and bathroom are preserved.</p>
<nav><a href="#foyer">Foyer</a><a href="#dining">Dining</a><a href="#foyer-conversation">Complete conversation image</a></nav>
<p><a href="DIRECTION.md">Owner direction and scope</a> · <a href="PMO_HANDOFF.md">Registry/runtime exception proposal</a> · <a href="artwork-registry.proposed.jsonpatch">Unapplied registry diff</a> · <a href="prompts.json">Exact imagegen prompts</a> · <a href="manifest.json">Dimensions, palettes and hashes</a> · <a href="QA.md">Verification</a></p>
'''+''.join(sections)+'''
<section><h2>Scene density and portrait density</h2><p>The same model: slim ivory bezel, rectangular dark grille, upper-corner sensor, small green lamp and recessed thumbwheel below. Wall context is included in the single portrait image; no new transparent foreground was produced.</p><div class="compare"><figure><img src="candidates/foyer-v04.png" width="314" height="206" alt="New foyer at native scene density"><figcaption>Foyer · 314×206</figcaption></figure><figure><img src="candidates/foyer-conversation-v04.png" width="564" height="278" alt="New complete close-up at portrait density"><figcaption>Complete conversation view · 564×278</figcaption></figure></div><p>Bathroom retained unchanged: <a href="../chapter-01-first-pass-2026-11-15/candidates/bathroom.png">original candidate</a>. All <a href="../chapter-01-first-pass-2026-11-15/index.html">previous first-pass assets</a> remain available.</p></section>
<footer><p>Private, offline review package. No gameplay, story JSON, approved reception or production artwork changes. No promotion or animation. Registry proposal is not an engine-ready migration and has not been applied.</p></footer></main></html>'''
(HERE/'index.html').write_text(gallery)
print(json.dumps([{'id': a['id'], 'size': a['dimensions'], 'colors': a['visibleColorCount'], 'outsideChanged': a.get('changedPixelsOutsideEditRegion')} for a in assets]))
