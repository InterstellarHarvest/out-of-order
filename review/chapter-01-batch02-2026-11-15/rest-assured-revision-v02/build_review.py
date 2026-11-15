"""Export imagegen cuff/seam edits only; preserve every other original scene pixel."""
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
before_path = PARENT/'candidates/chair-candidate-v01.png'
source_path = HERE/'generation-source/chair-v02.png'
before = Image.open(before_path).convert('RGB')
source = Image.open(source_path).convert('RGB')
w, h = source.size
ratio = 314/206
box = ((w-h*ratio)/2, 0, (w+h*ratio)/2, h) if w/h > ratio else (0, (h-w/ratio)/2, w, (h+w/ratio)/2)
normalized = source.resize((314, 206), Image.Resampling.NEAREST, box=box)
regions = [(106, 86, 147, 126), (188, 91, 239, 136), (69, 115, 81, 129)]
palette = sorted(set(before.getdata()))
after = before.copy()
for region in regions:
    patch = normalized.crop(region)
    mapping = {c: min(palette, key=lambda p: sum((a-b)**2 for a, b in zip(c, p))) for c in set(patch.getdata())}
    fitted = Image.new('RGB', patch.size)
    fitted.putdata([mapping[c] for c in patch.getdata()])
    after.paste(fitted, region[:2])
output = OUT/'chair-candidate-v02.png'
after.save(output)
after.resize((1256, 824), Image.Resampling.NEAREST).save(PREV/'chair-v02-4x.png')
restored = after.copy()
for region in regions:
    restored.paste(before.crop(region), region[:2])
assert ImageChops.difference(restored, before).getbbox() is None


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def compare(a, b, filename, scale):
    a = a.resize((314*scale, 206*scale), Image.Resampling.NEAREST)
    b = b.resize((314*scale, 206*scale), Image.Resampling.NEAREST)
    sheet = Image.new('RGB', (a.width+b.width+24, a.height+50), '#f5f1e4')
    draw = ImageDraw.Draw(sheet)
    draw.text((4, 4), 'Rest Assured / native' if scale == 1 else 'Rest Assured / exact4x NEAREST', fill='#393832')
    draw.text((4, 22), 'Before v01', fill='#393832')
    draw.text((a.width+28, 22), 'After v02 / generated', fill='#393832')
    sheet.paste(a, (0, 40))
    sheet.paste(b, (a.width+24, 40))
    sheet.save(PREV/filename)


compare(before, after, 'chair-before-after-native.png', 1)
compare(before, after, 'chair-before-after-4x.png', 4)
colors = Counter(after.getdata())
manifest = {'title': 'Rest Assured localized cuff/seam revision v02', 'baselineCommit': '7d76a2616cf66d89aa59f8ac5acfa26b94d37675',
            'branch': 'agent/ch01-art-batch02-20261115', 'scene': 'house_of_tomorrow/chair', 'status': 'generated',
            'ownerApproved': False, 'assetPath': None, 'candidatePath': 'candidates/chair-candidate-v02.png',
            'dimensions': [314, 206], 'mode': 'RGB', 'sha256': sha(output),
            'beforePath': '../candidates/chair-candidate-v01.png', 'beforeSha256': sha(before_path),
            'sourcePath': 'generation-source/chair-v02.png', 'sourceSha256': sha(source_path), 'sourceDimensions': list(source.size),
            'promptPath': 'prompt.json', 'method': 'built-in image_gen.imagegen; localized export onto original native scene',
            'normalization': {'sourceBox': list(box), 'geometry': 'NEAREST to314x206, copy only documented generated edit regions',
                              'regions': [list(r) for r in regions], 'colorCleanup': 'non-spatial nearest match to existing original scene colors within regions; no scene-wide recoloring'},
            'changedPixelsOutsideRegions': 0, 'changedPixels': sum(a != b for a, b in zip(before.getdata(), after.getdata())),
            'visibleColorCount': len(colors), 'dominantPalette': [{'hex': '#%02x%02x%02x' % c, 'pixels': n} for c, n in colors.most_common(16)],
            'storyDirectorReview': {'lounge': 'composition accepted', 'bedroom': 'accepted', 'passage': 'accepted', 'chair-v02': 'replacement generated; owner approval pending'},
            'reclineDecision': 'Retain reviewed angle; closure silhouette, padded lining and latch seams strengthen the state distinction locally.',
            'productionIntegration': False, 'greeneryProposalApplied': False}
(HERE/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rest Assured v02 — owner review</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f1e4;color:#393832;font:16px/1.5 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:28px}section,.banner{background:#fffaf0;border:1px solid #d7c6a8;padding:20px;margin:24px 0}.banner{border-left:6px solid #d78b6f}a{color:#27565e}.compare{display:flex;flex-wrap:wrap;gap:24px}.scroll{overflow:auto;padding:12px 0}figure{margin:0}figcaption{font-size:13px}img{display:block;max-width:none;image-rendering:pixelated;image-rendering:crisp-edges}summary{cursor:pointer;font-weight:600}</style><main><h1>Rest Assured · clearer closed padded cuffs</h1><p class="banner"><strong>One generated replacement, pending owner approval.</strong><br>Story Director accepted the lounge composition, bedroom and passage. Those scenes remain unchanged. This localized revision clarifies the locked chair's cuffs and small picked-at seam.</p><p><a href="../index.html">Original Batch2 gallery</a> · <a href="../GREENERY_CLARIFICATION_PROPOSED.md">Proposed greenery clarification</a> · <a href="prompt.json">Exact built-in imagegen prompt</a> · <a href="manifest.json">Dimensions, palette and hashes</a> · <a href="QA.md">Verification</a></p>
<section><h2>Before and after · native314×206</h2><div class="compare"><figure><img src="../candidates/chair-candidate-v01.png" width="314" height="206" alt="Original locked chair"><figcaption>Before v01 · preserved</figcaption></figure><figure><img src="candidates/chair-candidate-v02.png" width="314" height="206" alt="Revised closed padded cuffs and small seam"><figcaption>After v02 · generated candidate</figcaption></figure></div><p>Continuous oval padded rims, empty apertures, visible closed latch seams and a short picked stitch break distinguish the activated state. The reviewed recline angle, upholstery, chair body, infinity indicator and room remain exact outside the three local edit regions.</p><p><a href="candidates/chair-candidate-v02.png" download>Download revised native PNG</a> · <a href="previews/chair-v02-4x.png" download>Download exact4× PNG</a> · <a href="previews/chair-before-after-native.png">Native comparison sheet</a> · <a href="generation-source/chair-v02.png">Preserved generation source</a></p></section>
<section><h2>Before and after · exact4× nearest-neighbor</h2><details><summary>Open1256×824 scene views</summary><p>Before v01</p><div class="scroll"><img src="../previews/chair-4x.png" width="1256" height="824" alt="Before at exact4x"></div><p>After v02</p><div class="scroll"><img src="previews/chair-v02-4x.png" width="1256" height="824" alt="After at exact4x"></div></details><details><summary>Open side-by-side4× comparison</summary><div class="scroll"><img src="previews/chair-before-after-4x.png" width="2536" height="874" alt="Before after side-by-side at exact4x"></div></details><p><a href="previews/chair-before-after-4x.png">Download4× comparison sheet</a></p></section>
<section><h2>Initial and activated chair</h2><div class="compare"><figure><img src="../candidates/lounge-candidate-v01.png" width="314" height="206" alt="Unchanged accepted lounge composition"><figcaption>Initial lounge · unchanged</figcaption></figure><figure><img src="candidates/chair-candidate-v02.png" width="314" height="206" alt="Activated chair v02"><figcaption>Activated · closed padded cuffs</figcaption></figure></div><p>No protagonist anatomy, gore or torture-device styling. Greenery and the approved House intercom are unchanged. The greenery clarification is a proposal only; no story, gameplay, production artwork or catalog changes.</p></section></main></html>'''
(HERE/'index.html').write_text(page)
print(json.dumps({'dimensions': after.size, 'colors': len(colors), 'changedPixels': manifest['changedPixels'], 'outsideChanged': 0}))
