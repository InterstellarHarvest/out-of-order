"""Export an imagegen chair-geometry edit; protect the original room and intercom."""
from pathlib import Path
from collections import Counter
from PIL import Image, ImageDraw, ImageChops
import hashlib
import json

HERE = Path(__file__).resolve().parent
PARENT = HERE.parent
OUT = HERE/'candidates'
PREV = HERE/'previews'
OUT.mkdir(exist_ok=True)
PREV.mkdir(exist_ok=True)
original_path = PARENT/'candidates/chair-candidate-v01.png'
initial_path = PARENT/'candidates/lounge-candidate-v01.png'
source_path = HERE/'generation-source/chair-v03b.png'
original = Image.open(original_path).convert('RGB')
source = Image.open(source_path).convert('RGB')
w, h = source.size
r = 314/206
box = ((w-h*r)/2, 0, (w+h*r)/2, h) if w/h > r else (0, (h-w/r)/2, w, (h+w/r)/2)
normalized = source.resize((314, 206), Image.Resampling.NEAREST, box=box)

# Reuse original colors, without a new palette-count target or spatial filtering.
colors = sorted(set(original.getdata()))
palette = Image.new('P', (1, 1))
padded = colors + [colors[-1]]*(256-len(colors))
palette.putpalette([channel for rgb in padded for channel in rgb])
fitted = normalized.quantize(palette=palette, dither=Image.Dither.NONE).convert('RGB')

# Includes original/new chair silhouettes and the small areas revealed by reclining.
# Architecture and room elsewhere remain the exact original pixels.
polygon = [(202,0),(282,0),(293,22),(289,88),(276,109),(274,164),(247,184),
           (253,205),(119,205),(43,194),(42,176),(60,151),(85,137),(64,132),
           (64,112),(85,99),(109,84),(158,82),(179,67),(187,42)]
protected = [(153,0,189,43)]  # Approved intercom remains exact; seam is part of the local chair edit.
mask = Image.new('L', (314, 206), 0)
draw = ImageDraw.Draw(mask)
draw.polygon(polygon, fill=255)
for b in protected:
    mask.paste(0, b)
after = original.copy()
after.paste(fitted, (0, 0), mask)
output = OUT/'chair-candidate-v03.png'
after.save(output)
after.resize((1256, 824), Image.Resampling.NEAREST).save(PREV/'chair-v03-4x.png')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compare(a, b, labels, filename, scale=1):
    a = a.resize((314*scale, 206*scale), Image.Resampling.NEAREST)
    b = b.resize((314*scale, 206*scale), Image.Resampling.NEAREST)
    sheet = Image.new('RGB', (a.width+b.width+24, a.height+50), '#f5f1e4')
    d = ImageDraw.Draw(sheet)
    d.text((4, 5), 'Rest Assured / native' if scale == 1 else 'Rest Assured / exact4x NEAREST', fill='#393832')
    d.text((4, 22), labels[0], fill='#393832')
    d.text((a.width+28, 22), labels[1], fill='#393832')
    sheet.paste(a, (0, 40))
    sheet.paste(b, (a.width+24, 40))
    sheet.save(PREV/filename)


initial = Image.open(initial_path).convert('RGB')
for scale, suffix in [(1, 'native'), (4, '4x')]:
    compare(original, after, ('Original activated v01', 'Revised activated v03 / generated'), 'before-after-'+suffix+'.png', scale)
    compare(initial, after, ('Initial lounge', 'Activated v03 / generated'), 'initial-activated-'+suffix+'.png', scale)

changed_outside = sum(a != b for a, b, m in zip(original.getdata(), after.getdata(), mask.getdata()) if not m)
assert changed_outside == 0
counts = Counter(after.getdata())
manifest = {'title': 'Rest Assured v03 — armrest-mounted wrist closures and activated pose',
            'baselineCommit': '38f0a8fadba941ef5eae3424437baffb67dc5909', 'branch': 'agent/ch01-art-batch02-20261115',
            'scene': 'house_of_tomorrow/chair', 'candidateCount': 1, 'status': 'generated', 'ownerApproved': False,
            'assetPath': None, 'candidatePath': 'candidates/chair-candidate-v03.png', 'dimensions': [314,206], 'mode': 'RGB',
            'sha256': sha(output), 'originalPath': '../candidates/chair-candidate-v01.png', 'originalSha256': sha(original_path),
            'initialPath': '../candidates/lounge-candidate-v01.png', 'initialSha256': sha(initial_path),
            'sourcePath': 'generation-source/chair-v03b.png', 'sourceSha256': sha(source_path), 'sourceDimensions': list(source.size),
            'promptPath': 'prompt.json', 'method': 'built-in image_gen.imagegen; original v01 used as positive design reference',
            'normalization': {'sourceBox': list(box), 'geometry': 'NEAREST to314x206; copy chair silhouette/pose edit mask only',
                              'colorPolicy': 'non-spatial match to actual original scene palette, no dithering or new palette-count target',
                              'editPolygon': [list(v) for v in polygon], 'protectedOriginalRegions': [list(b) for b in protected]},
            'changedPixelsOutsideMask': changed_outside, 'changedPixels': sum(a != b for a,b in zip(original.getdata(),after.getdata())),
            'visibleColorCount': len(counts), 'dominantPalette': [{'hex': '#%02x%02x%02x' % c, 'pixels': n} for c,n in counts.most_common(16)],
            'reviewDecision': 'v02 upright rings rejected; return to original chair and place low closures across forward wrist-rest areas.',
            'recline': 'Slightly farther reclined backrest and raised integrated legrest; same room camera.',
            'productionIntegration': False, 'storyModified': False, 'greeneryProposalApplied': False}
(HERE/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')

page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rest Assured v03 — activated-state review</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f1e4;color:#393832;font:16px/1.5 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:28px}section,.banner{background:#fffaf0;border:1px solid #d7c6a8;padding:20px;margin:24px 0}.banner{border-left:6px solid #d78b6f}.compare{display:flex;flex-wrap:wrap;gap:24px}.scroll{overflow:auto;padding:12px 0}figure{margin:0}figcaption{font-size:13px}a{color:#27565e}img{display:block;max-width:none;image-rendering:pixelated;image-rendering:crisp-edges}summary{cursor:pointer;font-weight:600}</style><main><h1>Rest Assured · activated state v03</h1><p class="banner"><strong>Generated replacement. Owner visual approval pending.</strong><br>Based on the original v01 chair. The rejected upright rings are replaced by low padded closures across the forward wrist-rest areas. A slightly reclined back and raised legrest reinforce activation.</p><p><a href="../index.html">Original Batch2 gallery</a> · <a href="prompt.json">Built-in imagegen prompts</a> · <a href="manifest.json">Dimensions, palette and hashes</a> · <a href="QA.md">Verification and decisions</a></p>
<section><h2>Inviting initial chair and activated state · native</h2><div class="compare"><figure><img src="../candidates/lounge-candidate-v01.png" width="314" height="206" alt="Unchanged initial lounge"><figcaption>Initial lounge · unchanged</figcaption></figure><figure><img src="candidates/chair-candidate-v03.png" width="314" height="206" alt="Activated chair with forward padded wrist closures"><figcaption>Activated v03 · generated candidate</figcaption></figure></div><p>The closures seat onto armrest cradles where wrists rest, with short visible latch/linkage joins. Their channels run along the armrests. No upright freestanding rings, anatomy or torture-machine additions.</p><p><a href="previews/initial-activated-native.png">Native comparison</a> · <a href="previews/initial-activated-4x.png">Exact4× comparison</a></p></section>
<section><h2>Original chair geometry and revised activation</h2><div class="compare"><figure><img src="../candidates/chair-candidate-v01.png" width="314" height="206" alt="Original v01 activated chair"><figcaption>Original activated v01 · preserved</figcaption></figure><figure><img src="candidates/chair-candidate-v03.png" width="314" height="206" alt="Revised activated v03"><figcaption>Revised v03</figcaption></figure></div><p><a href="candidates/chair-candidate-v03.png" download>Native314×206 PNG</a> · <a href="previews/chair-v03-4x.png" download>1256×824 NEAREST PNG</a> · <a href="previews/before-after-native.png">Native before/after</a> · <a href="previews/before-after-4x.png">4× before/after</a> · <a href="generation-source/chair-v03b.png">Generation source</a></p><details><summary>View revised chair at exact4×</summary><div class="scroll"><img src="previews/chair-v03-4x.png" width="1256" height="824" alt="Revised activated chair at exact4x"></div></details><details><summary>View initial/activated at exact4×</summary><div class="scroll"><img src="previews/initial-activated-4x.png" width="2536" height="874" alt="Initial and activated exact4x comparison"></div></details></section>
<section><h2>Preservation</h2><p>The original chair's colors and picked seam location remain. The approved intercom is restored pixel-for-pixel. Every pixel outside the chair edit mask remains original; the small background areas revealed by the changed chair pose are included in that mask. No room redesign, plant redraw, story or gameplay changes.</p><p><a href="../rest-assured-revision-v02/index.html">Rejected v02 retained for comparison</a> · <a href="generation-source/chair-v03a.png">Earlier v03 source before recess cleanup</a> · <a href="../GREENERY_CLARIFICATION_PROPOSED.md">Unapplied greenery clarification</a></p></section></main></html>'''
(HERE/'index.html').write_text(page)
print(json.dumps({'dimensions': after.size, 'colors': len(counts), 'changed': manifest['changedPixels'], 'outsideChanged': changed_outside}))
