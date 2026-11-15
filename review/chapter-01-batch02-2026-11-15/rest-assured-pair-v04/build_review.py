"""Export the owner-directed default/in-use pair from the same original composition."""
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
original = Image.open(original_path).convert('RGB')
original_colors = sorted(set(original.getdata()))
palette = Image.new('P', (1, 1))
palette.putpalette([v for c in original_colors+[original_colors[-1]]*(256-len(original_colors)) for v in c])

back = [(193,0),(286,0),(309,14),(313,43),(294,86),(278,112),(263,129),
        (218,128),(160,128),(159,120),(168,102),(177,88),(184,77),(187,48)]
foot = [(92,138),(178,138),(183,153),(173,179),(148,202),(126,205),
        (72,205),(43,198),(42,177),(53,158),(70,145)]
far_arm = [(67,111),(106,92),(110,84),(129,84),(144,91),(148,95),(173,94),
           (174,108),(150,114),(142,121),(107,135),(78,133),(66,124)]
near_arm = [(174,119),(184,108),(190,103),(191,96),(199,91),(215,92),(224,97),
            (230,101),(260,100),(272,104),(272,119),(241,125),(231,130),
            (223,136),(211,146),(199,148),(190,146),(177,137)]
base = [(166,182),(222,180),(237,185),(247,199),(242,204),(174,205),(144,203),(148,194)]
seam = (68,116,82,132)
intercom = (153,0,189,43)
seat = [(96,128),(169,126),(180,133),(180,144),(102,144),(94,138)]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def aqua(c):
    return c[1] > c[0]+10 and c[2] > c[0]+5


assets = []
for state, source_name in [('default','unused-v04b.png'),('in-use','active-v04c.png')]:
    source_path = HERE/'generation-source'/source_name
    source = Image.open(source_path).convert('RGB')
    w,h = source.size
    r = 314/206
    box = ((w-h*r)/2,0,(w+h*r)/2,h) if w/h > r else (0,(h-w/r)/2,w,(h+w/r)/2)
    normalized = source.resize((314,206),Image.Resampling.NEAREST,box=box)
    fitted = normalized.quantize(palette=palette,dither=Image.Dither.NONE).convert('RGB')
    mask = Image.new('L',(314,206),0)
    d = ImageDraw.Draw(mask)
    d.polygon(back,fill=255)
    d.polygon(foot,fill=255)
    # Fixed seat and visible base retain their original size and original pixels.
    d.polygon(seat,fill=0)
    bm = Image.new('L',(314,206),0)
    ImageDraw.Draw(bm).polygon(base,fill=255)
    for y in range(177,206):
        for x in range(140,253):
            if bm.getpixel((x,y)) and not aqua(original.getpixel((x,y))) and not aqua(fitted.getpixel((x,y))):
                mask.putpixel((x,y),0)
    if state == 'default':
        # Remove original cuffs and their locking links; leave normal pivot discs.
        mask.paste(255,(91,84,153,136))
        mask.paste(255,(185,89,244,138))
        dd = ImageDraw.Draw(mask)
        dd.ellipse((92,118,107,134),fill=0)
        dd.ellipse((191,127,211,146),fill=0)
        mask.paste(255,(222,137,232,148))  # Chair indicator off; wall indicator unchanged.
    else:
        # Exact original restraints, armrests and links: no new or resized assembly.
        ImageDraw.Draw(mask).polygon(far_arm,fill=0)
        ImageDraw.Draw(mask).polygon(near_arm,fill=0)
    ImageDraw.Draw(mask).polygon(seat,fill=0)
    mask.paste(0,(233,137,250,148))  # Printed infinity mark stays unchanged.
    mask.paste(0,intercom)
    mask.paste(0,seam)  # Same original picked tuft in BOTH states.
    image = original.copy()
    image.paste(fitted,(0,0),mask)
    path = OUT/('chair-'+state+'-v04.png')
    image.save(path)
    image.resize((1256,824),Image.Resampling.NEAREST).save(PREV/(state+'-4x.png'))
    mask.save(PREV/(state+'-edit-mask.png'))
    colors = Counter(image.getdata())
    outside = sum(a!=b for a,b,m in zip(original.getdata(),image.getdata(),mask.getdata()) if not m)
    assert outside == 0
    assets.append({'state':state,'status':'generated','ownerApproved':False,'assetPath':None,
                   'candidatePath':'candidates/'+path.name,'dimensions':[314,206],'mode':'RGB','sha256':sha(path),
                   'sourcePath':'generation-source/'+source_name,'sourceDimensions':list(source.size),'sourceSha256':sha(source_path),
                   'normalization':{'sourceBox':list(box),'geometry':'NEAREST exact-aspect normalization; local part/pose export only',
                                    'colorPolicy':'non-spatial match to actual original colors, no dithering or new palette-count target',
                                    'editMaskPath':'previews/'+state+'-edit-mask.png'},
                   'changedPixelsOutsideMask':outside,'visibleColorCount':len(colors),
                   'dominantPalette':[{'hex':'#%02x%02x%02x'%c,'pixels':n} for c,n in colors.most_common(12)]})

images = [Image.open(HERE/a['candidatePath']).convert('RGB') for a in assets]
for scale,suffix in [(1,'native'),(4,'4x')]:
    w,h = 314*scale,206*scale
    sheet = Image.new('RGB',(2*w+24,h+50),'#f5f1e4')
    d = ImageDraw.Draw(sheet)
    d.text((4,5),'Same chair / default and in-use / '+suffix,fill='#393832')
    for x,im,label in [(0,images[0],'Default / light off / no restraints'),(w+24,images[1],'In use / original restraints / reclined')]:
        d.text((x+4,22),label,fill='#393832')
        sheet.paste(im.resize((w,h),Image.Resampling.NEAREST),(x,40))
    sheet.save(PREV/('default-in-use-'+suffix+'.png'))

manifest = {'title':'Owner-directed Rest Assured state pair v04','branch':'agent/ch01-art-batch02-20261115',
            'baselineCommit':'ef63bdbcfab0dfaa9d09800f4443cb5c944f8427','status':'generated','candidateCount':2,
            'originalNativePath':'../candidates/chair-candidate-v01.png','originalNativeSha256':sha(original_path),
            'ownerSelectedSourcePath':'../generation-source/chair-v01.png','ownerSelectedSourceSha256':sha(PARENT/'generation-source/chair-v01.png'),
            'assets':assets,'promptPath':'prompts.json','method':'built-in image_gen.imagegen',
            'protectedPickedTuft':list(seam),'protectedWallIntercom':list(intercom),
            'backEditEnvelope':back,'footEditEnvelope':foot,'protectedOriginalInUseArmrests':[far_arm,near_arm],
            'ownerSteering':'Keep approved reclined pose; default more upright with footrest a little lower and chair lamp off. Original picked tuft in both.',
            'productionIntegration':False,'storyOrEngineModified':False,'greeneryProposalApplied':False}
(HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

page = '''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rest Assured — owner-directed state pair</title><style>*{box-sizing:border-box}body{margin:0;background:#f5f1e4;color:#393832;font:16px/1.5 system-ui,sans-serif}main{max-width:1400px;margin:auto;padding:28px}section,.banner{padding:20px;background:#fffaf0;border:1px solid #d7c6a8;margin:24px 0}.banner{border-left:6px solid #d78b6f}.compare{display:flex;flex-wrap:wrap;gap:24px}.scroll{overflow:auto;padding:12px 0}figure{margin:0}figcaption{font-size:13px}img{display:block;max-width:none;image-rendering:pixelated;image-rendering:crisp-edges}a{color:#27565e}summary{cursor:pointer;font-weight:600}</style><main><h1>Rest Assured · one chair, two states</h1><p class="banner"><strong>Two generated review candidates, using the owner's selected base image.</strong><br>Default: no restraint assemblies, chair lamp off, back more upright and footrest lower. In use: the original restraints restored, back visibly reclined and footrest lifted. The original picked tuft is present in both.</p><p><a href="README.md">Revision notes</a> · <a href="prompts.json">Exact built-in imagegen prompts</a> · <a href="manifest.json">Dimensions, palettes and hashes</a> · <a href="QA.md">Verification</a></p><section><h2>Native314×206 comparison</h2><div class="compare"><figure><img src="candidates/chair-default-v04.png" width="314" height="206" alt="Default state with picked tuft, no cuffs and lamp off"><figcaption>Default · no restraints · light off</figcaption></figure><figure><img src="candidates/chair-in-use-v04.png" width="314" height="206" alt="In-use state, original restraints, reclined back, raised footrest and same tuft"><figcaption>In use · original restraints · relaxed pose</figcaption></figure></div><p><a href="candidates/chair-default-v04.png" download>Default PNG</a> · <a href="candidates/chair-in-use-v04.png" download>In-use PNG</a> · <a href="previews/default-in-use-native.png">Native comparison sheet</a></p></section><section><h2>Exact4× nearest-neighbor</h2><details><summary>Default1256×824</summary><div class="scroll"><img src="previews/default-4x.png" width="1256" height="824" alt="Default at exact4x"></div></details><details><summary>In use1256×824</summary><div class="scroll"><img src="previews/in-use-4x.png" width="1256" height="824" alt="In use at exact4x"></div></details><p><a href="previews/default-in-use-4x.png">Side-by-side4× comparison</a></p></section><section><h2>Shared source and preservation</h2><p>The original restraints and picked tuft are retained from the owner's selected chair. Seat, armrests, fixed hardware and room use original pixels wherever not explicitly edited. The approved wall intercom remains exact; only the chair's default-state indicator switches off. No component scaling is applied in export and no new furniture/mechanisms are added.</p><div class="scroll"><img src="../candidates/chair-candidate-v01.png" width="314" height="206" alt="Original owner-selected chair image"></div><p><a href="../index.html">Previous Batch2 gallery and originals</a> · <a href="../GREENERY_CLARIFICATION_PROPOSED.md">Unapplied greenery proposal</a></p></section></main></html>'''
(HERE/'index.html').write_text(page)
print(json.dumps([{'state':a['state'],'colors':a['visibleColorCount'],'outsideChanged':a['changedPixelsOutsideMask']} for a in assets]))
