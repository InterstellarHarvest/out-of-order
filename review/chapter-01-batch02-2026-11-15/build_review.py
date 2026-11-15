"""Reproduce Batch2 review exports from preserved imagegen sources. Pillow required."""
from pathlib import Path
from collections import Counter, defaultdict
from itertools import product
from PIL import Image, ImageDraw
import hashlib
import html
import json

HERE = Path(__file__).resolve().parent
OUT = HERE/'candidates'
PREV = HERE/'previews'
OUT.mkdir(exist_ok=True)
PREV.mkdir(exist_ok=True)
BASE = '0de7cd8c15994c8e5652feff815d7d87a70d4d75'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def aspect_box(im):
    w, h = im.size
    ratio = 314/206
    if w/h > ratio:
        used = h*ratio
        return ((w-used)/2, 0, (w+used)/2, h)
    used = w/ratio
    return (0, (h-used)/2, w, (h+used)/2)


def merge_colors(im, radius=18):
    # Non-spatial cleanup; representatives are actual frequent image colors.
    # No palette-count target or hardware cap, no averaging or dithering.
    counts = Counter(im.getdata())
    buckets, mapping = defaultdict(list), {}
    for color, count in sorted(counts.items(), key=lambda x: (-x[1], x[0])):
        key = tuple(c//radius for c in color)
        best, dist = None, radius*radius+1
        for offset in product((-1, 0, 1), repeat=3):
            for candidate in buckets[tuple(key[i]+offset[i] for i in range(3))]:
                d = sum((a-b)**2 for a, b in zip(color, candidate))
                if d < dist:
                    best, dist = candidate, d
        if best is None:
            best = color
            buckets[key].append(color)
        mapping[color] = best
    result = Image.new('RGB', im.size)
    result.putdata([mapping[c] for c in im.getdata()])
    return result, len(counts)


assets = []
titles = {'lounge': 'House lounge', 'chair': 'Rest Assured (locked)', 'bedroom': "Martin's bedroom", 'passage': 'Wardrobe crawl passage'}
versions = {'lounge': 'v01', 'chair': 'v01', 'bedroom': 'v01', 'passage': 'v02'}
for index, room in enumerate(('lounge', 'chair', 'bedroom', 'passage')):
    source = HERE/'generation-source'/(room+'-'+versions[room]+'.png')
    raw = Image.open(source).convert('RGB')
    box = aspect_box(raw)
    native = raw.resize((314, 206), Image.Resampling.NEAREST, box=box)
    image, before_colors = merge_colors(native)
    path = OUT/(room+'-candidate-v01.png')
    image.save(path)
    four = PREV/(room+'-4x.png')
    image.resize((1256, 824), Image.Resampling.NEAREST).save(four)
    colors = Counter(image.getdata())
    assets.append({'id': chr(65+index), 'scene': 'house_of_tomorrow/'+room, 'title': titles[room],
                   'kind': 'scene', 'status': 'generated', 'ownerApproved': False, 'assetPath': None,
                   'candidatePath': 'candidates/'+path.name, 'nativePreviewPath': 'candidates/'+path.name,
                   'fourTimesPreviewPath': 'previews/'+four.name, 'dimensions': [314, 206], 'mode': 'RGB',
                   'sha256': sha(path), 'sourcePath': 'generation-source/'+source.name,
                   'sourceSha256': sha(source), 'sourceDimensions': list(raw.size),
                   'promptKey': room if room != 'passage' else 'passage-low-void-revision',
                   'normalization': {'sourceBox': list(box), 'geometry': 'exact-aspect crop and NEAREST to314x206',
                                     'colorCleanup': 'non-spatial merge to existing frequent RGB values within Euclidean radius18; no fixed palette-count target',
                                     'colorsBeforeCleanup': before_colors},
                   'visibleColorCount': len(colors),
                   'dominantPalette': [{'hex': '#%02x%02x%02x' % c, 'pixels': n} for c, n in colors.most_common(16)]})

references = []
for title, rel in [('Approved foyer v04', '../chapter-01-speaker-revision-2026-11-15/candidates/foyer-v04.png'),
                   ('Approved dining v04', '../chapter-01-speaker-revision-2026-11-15/candidates/dining-v04.png'),
                   ('Bathroom design reference', '../chapter-01-first-pass-2026-11-15/candidates/bathroom.png'),
                   ('Approved complete intercom portrait v05', '../chapter-01-speaker-revision-2026-11-15/candidates/foyer-conversation-v05.png')]:
    references.append({'title': title, 'path': rel, 'sha256': sha(HERE/rel),
                       'approval': 'owner-approved creative reference; production integration not authorized'})


def pair(a, b, title, filename):
    sheet = Image.new('RGB', (652, 256), '#f5f1e4')
    d = ImageDraw.Draw(sheet)
    d.text((4, 4), title, fill='#393832')
    for x, asset in [(0, a), (338, b)]:
        d.text((x+4, 20), asset['title'], fill='#393832')
        sheet.paste(Image.open(HERE/asset['candidatePath']), (x, 40))
    sheet.save(PREV/filename)


pair(assets[0], assets[1], 'Same Rest Assured chair / initial and locked', 'lounge-chair-comparison.png')
pair(assets[2], assets[3], 'Wardrobe concealment / low service opening behind it', 'bedroom-passage-comparison.png')

sheet = Image.new('RGB', (1336, 500), '#f5f1e4')
d = ImageDraw.Draw(sheet)
entries = [(r['title'], HERE/r['path'], 'Batch1 / creative reference') for r in references[:3]]
entries += [(a['title'], HERE/a['candidatePath'], 'Batch2 / generated candidate') for a in assets]
for i, (title, path, status) in enumerate(entries):
    x, y = (i % 4)*334+10, (i//4)*250+8
    d.text((x, y), title, fill='#393832')
    d.text((x, y+15), status, fill='#655c4e')
    sheet.paste(Image.open(path).convert('RGB'), (x, y+34))
d.text((1012, 278), 'Batch1 creative references approved.', fill='#393832')
d.text((1012, 296), 'Batch2: owner visual review pending.', fill='#393832')
d.text((1012, 320), 'All world scenes native314x206.', fill='#655c4e')
sheet.save(PREV/'house-continuity-contact-sheet.png')

manifest = {'title': 'Chapter1 Batch2 — Rest Assured, bedroom and passage', 'date': '2026-11-15',
            'branch': 'agent/ch01-art-batch02-20261115', 'baselineCommit': BASE,
            'candidateCount': 4, 'status': 'generated', 'productionIntegration': False,
            'registryModified': False, 'method': 'built-in image_gen.imagegen; exact prompts and reference paths in prompts.json',
            'assets': assets, 'approvedCreativeReferences': references,
            'supersededSource': {'path': 'generation-source/passage-v01.png', 'reason': 'Read as a standing-height corridor; corrected to low crawl-void scale in v02.'},
            'derivedPreviewsAreNotAdditionalCandidates': True}
(HERE/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')

notes = {
 'A': 'Inviting segmented aqua recliner, integrated ivory mechanism, tiny near-arm stuffing tuft. Sofa, coral cushion and aqua foyer doorway repeat established domestic cues. Restraints concealed.',
 'B': 'Same chair with closed padded wrist cuffs over empty positions, locked linked arms, matching torn seam and an infinity status symbol. No occupant, wall breach or aftermath.',
 'C': 'Made child bed, one aligned toy boat, closed blond wardrobe, paper arrow map under bed and low improvised scratches. The passage is not exposed in this baseline.',
 'D': 'Wardrobe displaced sideways; bedroom bed/window remains visible at left. Low service opening, solid wall above, practical wiring/studs, worn dusty crawl track and squat closed hatch.'}
cards = []
for a in assets:
    colors = ''.join('<span class="swatch" title="'+c['hex']+'" style="background:'+c['hex']+'"></span>' for c in a['dominantPalette'])
    cards.append('<section id="'+a['id']+'"><h2>'+a['id']+' · '+html.escape(a['title'])+'</h2><p>314 ×206 · RGB opaque · '+str(a['visibleColorCount'])+' colors · <strong>generated — owner approval pending</strong></p><p>'+notes[a['id']]+'</p><div class="scroll"><img src="'+a['candidatePath']+'" width="314" height="206" alt="'+html.escape(a['title'])+' native scene"></div><p class="palette">'+colors+'</p><p><a href="'+a['candidatePath']+'" download>Native PNG</a> · <a href="'+a['fourTimesPreviewPath']+'" download>Exact4× PNG</a> · <a href="'+a['sourcePath']+'">Generation source</a></p><details><summary>View exact4× nearest-neighbor (1256×824)</summary><div class="scroll"><img src="'+a['fourTimesPreviewPath']+'" width="1256" height="824" alt="'+html.escape(a['title'])+' at exact4x"></div></details><p class="hash">SHA256 '+a['sha256']+'</p></section>')

page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>House of Tomorrow Batch2 — private owner review</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f1e4;color:#393832;font:16px/1.5 system-ui,sans-serif}main{max-width:1440px;margin:auto;padding:28px}h1{font-size:30px}h2{font-size:22px}a{color:#27565e}.banner,section{background:#fffaf0;padding:20px;border:1px solid #d7c6a8;margin:24px 0}.banner{border-left:6px solid #d78b6f}.scroll{overflow:auto;padding:10px 0}img{display:block;max-width:none;image-rendering:pixelated;image-rendering:crisp-edges}.compare{display:flex;flex-wrap:wrap;gap:24px}figure{margin:0}figcaption,.hash{font-size:12px}.hash{overflow-wrap:anywhere}.palette{display:flex;gap:3px;flex-wrap:wrap}.swatch{display:inline-block;width:25px;height:24px;border:1px solid #998d7b}summary{cursor:pointer;font-weight:600}nav{display:flex;gap:20px;flex-wrap:wrap}</style><main><h1>House of Tomorrow · Batch2</h1><p>Rest Assured, Martin's bedroom and hidden passage · 15 November 2026</p><p class="banner"><strong>Four generated scene candidates. Owner creative review pending.</strong><br>Based on owner-approved creative references at 0de7cd8. Approval of those references does not authorize production integration of this batch.</p><nav><a href="#A">Lounge</a><a href="#B">Locked chair</a><a href="#C">Bedroom</a><a href="#D">Passage</a><a href="#pairs">Pair continuity</a><a href="#baseline">House contact sheet</a></nav><p><a href="CONTINUITY.md">Physical relationships and art plan</a> · <a href="STORY_ART_REPORT.md">Story/art inconsistencies</a> · <a href="QA.md">Technical and visual QA</a> · <a href="prompts.json">Exact imagegen prompts</a> · <a href="manifest.json">Dimensions, palettes and hashes</a></p>
'''+''.join(cards)+'''
<section id="pairs"><h2>Object and architectural continuity</h2><p>The initial and activated chair share padded back/headrest, aqua seat/legrest, ivory side shell/base, circular pivots and near-arm seam. The bedroom's right-wall wardrobe hides the opening exposed in the passage view; the repeated low scratch/plinth and aqua bed tie the views together.</p><div class="scroll"><img src="previews/lounge-chair-comparison.png" width="652" height="256" alt="Lounge and locked chair continuity"></div><p><a href="previews/lounge-chair-comparison.png">Download chair comparison</a></p><div class="scroll"><img src="previews/bedroom-passage-comparison.png" width="652" height="256" alt="Bedroom wardrobe and low passage continuity"></div><p><a href="previews/bedroom-passage-comparison.png">Download wardrobe/passage comparison</a></p></section>
<section id="baseline"><h2>Established House and new scenes</h2><div class="scroll"><img src="previews/house-continuity-contact-sheet.png" width="1336" height="500" alt="Seven native scenes comparing approved first-batch House references and four new candidates"></div><p><a href="previews/house-continuity-contact-sheet.png">Download contact sheet</a></p><p>The approved complete opaque intercom portrait below remains a creative reference. No portrait or approved scene was redrawn for Batch2.</p><div class="scroll"><img src="../chapter-01-speaker-revision-2026-11-15/candidates/foyer-conversation-v05.png" width="564" height="278" alt="Unchanged approved complete intercom portrait"></div></section>
<section><h2>Sources and review boundary</h2><p>Every new scene has a native PNG, exact4× preview, preserved generation source and exact prompt. <a href="generation-source/passage-v01.png">The superseded tall passage source</a> is retained for comparison; only the low crawl-void version is a current candidate.</p><p>All production assetPath values remain null. Story, dice/inventory, engine and opaque-portrait implementation are untouched. No merge, public deployment, Chapter2 art or next Chapter1 batch. Open this gallery locally; there are no external services or analytics.</p></section></main></html>'''
(HERE/'index.html').write_text(page)
print(json.dumps([{'scene': a['scene'], 'colors': a['visibleColorCount'], 'size': a['dimensions']} for a in assets]))
