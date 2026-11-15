#!/usr/bin/env python3
"""Review-only normalized exports. No runtime/catalog writes. Requires Pillow."""
from collections import Counter, defaultdict
from pathlib import Path
import hashlib
import html
import json
import subprocess
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
BASE = 'ae7ae2bfe7821f87ebc5dca686829592b7c27f49'
BRANCH = 'agent/ch01-art-batch03-20261115'
SPECS = [
    ('A', 'Gallery', 'gallery-v02', 'gallery-candidate-v02', (314,206), 'scene', 'house_of_tomorrow/portrait_gallery'),
    ('B', 'Gallery conversation', 'gallery-conversation-v01', 'gallery-conversation-v01', (564,278), 'complete-conversation', 'house / gallery'),
    ('C', 'Album 1 — ordinary years', 'album-page-01-v02', 'album-page-01-v02', (564,278), 'focus-page', 'house_of_tomorrow/portrait_gallery/album'),
    ('D', 'Album 2 — fear and exhaustion', 'album-page-02-v01', 'album-page-02-v01', (564,278), 'focus-page', 'house_of_tomorrow/portrait_gallery/album'),
    ('E', 'Album 3 — remains and absence', 'album-page-03-v01', 'album-page-03-v01', (564,278), 'focus-page', 'house_of_tomorrow/portrait_gallery/album'),
    ('F', 'Current photograph — slot', 'photo-slot-v02', 'photo-slot-v02', (96,96), 'item-slot', 'family_portrait_photo'),
    ('G', 'Current photograph — inspection', 'photo-inspector-v02', 'photo-inspector-v02', (565,451), 'item-inspect', 'family_portrait_photo'),
]

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def merge_near_colors(im, radius):
    """Frequency-first existing-color substitution; no spatial filter/dithering."""
    pixels = list(im.getdata())
    counts = Counter(pixels)
    buckets = defaultdict(list)
    lut = {}
    r2 = radius*radius
    for color, _ in counts.most_common():
        cell = tuple(c//radius for c in color)
        best, dist = None, r2+1
        for x in range(cell[0]-1, cell[0]+2):
            for y in range(cell[1]-1, cell[1]+2):
                for z in range(cell[2]-1, cell[2]+2):
                    for candidate in buckets.get((x,y,z), ()):
                        d = sum((a-b)**2 for a,b in zip(color,candidate))
                        if d < dist:
                            best, dist = candidate, d
        if dist <= r2:
            lut[color] = best
        else:
            lut[color] = color
            buckets[cell].append(color)
    out = Image.new('RGB', im.size)
    out.putdata([lut[p] for p in pixels])
    return out

def aspect_box(im, size):
    w,h = im.size
    ratio = size[0]/size[1]
    if w/h > ratio:
        width = h*ratio
        return ((w-width)/2,0,(w+width)/2,h)
    height = w/ratio
    return (0,(h-height)/2,w,(h+height)/2)

def export(source, target, size, icon=False, conversation=False):
    im = Image.open(source)
    source_size = im.size
    if icon:
        im = im.convert('RGBA')
        # Alpha export cleanup: retain the paper's connected silhouette, exclude
        # isolated generator mask flecks, then crop transparent padding only.
        mask = bytearray(im.getchannel('A').point(lambda a: 255 if a>=128 else 0).tobytes())
        w,h = im.size
        largest = []
        for start in range(len(mask)):
            if not mask[start]: continue
            mask[start]=0
            stack=[start]
            group=[]
            while stack:
                index=stack.pop();group.append(index)
                x=index%w
                for other in (index-w,index+w,index-1 if x else -1,index+1 if x<w-1 else -1):
                    if 0<=other<len(mask) and mask[other]:
                        mask[other]=0;stack.append(other)
            if len(group)>len(largest): largest=group
        cleaned=bytearray(w*h)
        for index in largest: cleaned[index]=255
        alpha=Image.frombytes('L',(w,h),bytes(cleaned))
        im.putalpha(alpha)
        im=im.crop(alpha.getbbox())
        im.thumbnail((88,88), Image.Resampling.NEAREST)
        out = Image.new('RGBA', size, (0,0,0,0))
        out.alpha_composite(im, ((size[0]-im.width)//2,(size[1]-im.height)//2))
        alpha = out.getchannel('A').point(lambda a: 255 if a>=128 else 0)
        rgb = merge_near_colors(out.convert('RGB'),12)
        out = rgb.convert('RGBA')
        out.putalpha(alpha)
        out.putdata([p if p[3] else (0,0,0,0) for p in out.getdata()])
        method = 'Alpha threshold128 and largest connected paper mask; crop alpha padding; NEAREST fit within88x88; center on96x96; zero RGB beneath alpha0; RGB radius12 substitution'
        box = None
    else:
        im = im.convert('RGB')
        # Tighter framing of the independently generated gallery portrait:
        # the intercom reads at v05 conversation scale, with camera cropped left.
        box = (170,40,1650,40+1480*278/564) if conversation else aspect_box(im,size)
        out = im.resize(size,Image.Resampling.NEAREST,box=box)
        out = merge_near_colors(out,18 if size==(314,206) else 12)
        method = 'Exact-aspect crop + NEAREST; nonspatial existing-color radius'+str(18 if size==(314,206) else 12)+' substitution; no fixed palette count'
    out.save(target)
    return {'sourceSize': list(source_size), 'cropBox': box, 'normalization': method}

def font():
    for p in ['/System/Library/Fonts/Supplemental/Arial.ttf','/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf']:
        if Path(p).exists(): return ImageFont.truetype(p,14)
    return ImageFont.load_default()

def sheet(path, entries, columns=1, tile=(584,318)):
    canvas = Image.new('RGB',(columns*tile[0], ((len(entries)+columns-1)//columns)*tile[1]),'#202c2d')
    draw = ImageDraw.Draw(canvas)
    for i,(label,source) in enumerate(entries):
        x = (i%columns)*tile[0]+10
        y = (i//columns)*tile[1]+10
        draw.text((x,y),label,font=font(),fill='#ffebc9')
        im = Image.open(source).convert('RGBA')
        # Sheets retain native candidate pixels; transparent slot is composited only for review.
        canvas.paste(im,(x,y+25),im)
    canvas.save(path)

def preserve_baseline():
    records = []
    for entry in subprocess.check_output(['git','ls-tree','-rz',BASE],cwd=ROOT).split(b'\0'):
        if not entry: continue
        meta, rawpath = entry.split(b'\t',1)
        path = rawpath.decode()
        if path.lower().endswith('.png') or path.startswith(('story/','game/','tools/story-import/')):
            data = (ROOT/path).read_bytes()
            actual = hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
            expected = meta.split()[2].decode()
            assert actual == expected, 'Baseline changed: '+path
            records.append({'path':path,'baselineBlob':expected,'sha256':hashlib.sha256(data).hexdigest()})
    return records

def main():
    for folder in ['candidates','previews','comparison']:
        (HERE/folder).mkdir(exist_ok=True)
    records = []
    for letter,title,source,name,size,kind,key in SPECS:
        src = HERE/'generation-source'/(source+'.png')
        dst = HERE/'candidates'/(name+'.png')
        transforms = export(src,dst,size,icon=letter=='F',conversation=letter=='B')
        im = Image.open(dst)
        assert im.size == size
        assert im.mode == ('RGBA' if letter=='F' else 'RGB')
        if letter=='F':
            values = set(im.getchannel('A').getdata())
            assert values == {0,255}
            assert im.getpixel((0,0)) == (0,0,0,0)
            assert im.getchannel('A').getbbox()[0]>=4
            assert all(p[:3]==(0,0,0) for p in im.getdata() if p[3]==0)
        records.append(dict(id=letter,title=title,kind=kind,registryTarget=key,status='generated',ownerApproved=False,assetPath=None,candidatePath=str(dst.relative_to(HERE)),dimensions=list(size),mode=im.mode,paletteColors=len(set(im.getdata())),sourcePath=str(src.relative_to(HERE)),sourceSHA256=digest(src),sha256=digest(dst),**transforms))
    byid={r['id']:r for r in records}
    candidate=lambda letter: HERE/byid[letter]['candidatePath']
    im=Image.open(candidate('A'))
    four=im.resize((1256,824),Image.Resampling.NEAREST)
    four.save(HERE/'previews/gallery-4x.png')
    assert four.tobytes()==im.resize((1256,824),Image.Resampling.NEAREST).tobytes()
    sheet(HERE/'previews/gallery-conversation-spatial.png', [('A / gallery314x206',candidate('A')),('B / complete close-up564x278',candidate('B'))],2,(584,318))
    sheet(HERE/'previews/album-chronology.png',[(byid[x]['title'],candidate(x)) for x in 'CDE'])
    sheet(HERE/'previews/photo-slot-inspection.png', [('F / true-alpha96x96',candidate('F')),('G / current print565x451',candidate('G'))],2,(585,491))
    old=[('gallery-v01','gallery-first-pass',(314,206)),('album-page-01-v01','album-first-pass',(564,278)),('photo-inspector-v01','photo-first-pass',(565,451))]
    for src,name,size in old:
        export(HERE/'generation-source'/(src+'.png'),HERE/'comparison'/(name+'.png'),size)
    contact = [
        ('Foyer / preserved','chapter-01-speaker-revision-2026-11-15/candidates/foyer-v04.png'),
        ('Dining / preserved','chapter-01-speaker-revision-2026-11-15/candidates/dining-v04.png'),
        ('Bathroom / preserved','chapter-01-first-pass-2026-11-15/candidates/bathroom.png'),
        ('Lounge / preserved','chapter-01-batch02-2026-11-15/candidates/lounge-candidate-v01.png'),
        ('Bedroom / preserved','chapter-01-batch02-2026-11-15/candidates/bedroom-candidate-v01.png'),
        ('Passage / preserved','chapter-01-batch02-2026-11-15/candidates/passage-candidate-v01.png'),
        ('Rest Assured defaultv04 / preserved','chapter-01-batch02-2026-11-15/rest-assured-pair-v04/candidates/chair-default-v04.png'),
        ('Rest Assured in-usev04 / preserved','chapter-01-batch02-2026-11-15/rest-assured-pair-v04/candidates/chair-in-use-v04.png'),
    ]
    sheet(HERE/'previews/house-contact-sheet.png',[(label,HERE.parent/path) for label,path in contact]+[('Gallery / new generated candidate',candidate('A'))],3,(334,246))
    preserved=preserve_baseline()
    sources=[{'path':str(p.relative_to(HERE)),'sha256':digest(p),'size':list(Image.open(p).size),'mode':Image.open(p).mode} for p in sorted((HERE/'generation-source').glob('*.png'))]
    manifest={'scope':'Private review metadata only; NOT runtime catalog schema','branch':BRANCH,'baseline':BASE,'status':'generated','ownerApproved':False,'tool':'built-in image_gen.imagegen','visualPageOrder':['C','D','E'],'assets':records,'generationSources':sources}
    (HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    qa={'technicalChecks':'passed','creativeApproval':'pending','assetCount':len(records),'dimensionsModesHashes':records,'baselineRecordsVerified':len(preserved),'baselinePNGsVerified':sum(r['path'].lower().endswith('.png') for r in preserved),'allBaselineBytesPreserved':True,'fourTimesPreview':'exact NEAREST1256x824','browserAutomation':'not run; local static HTTP and pixel checks are separate','preserved':preserved}
    (HERE/'technical-qa.json').write_text(json.dumps(qa,indent=2)+'\n')
    rows='\n'.join('| '+r['id']+' | '+r['title']+' | '+'×'.join(map(str,r['dimensions']))+' | '+r['mode']+' | '+str(r['paletteColors'])+' |' for r in records)
    (HERE/'TECHNICAL_QA.md').write_text('# Technical QA\n\nSeven generated candidates; creative approval pending.\n\n| ID | Asset | Dimensions | Mode | Unique colors |\n|---|---|---|---|---|\n'+rows+'\n\nAll dimensions and PNG modes asserted from final files. F has real binary alpha, transparent margins and zero RGB under transparent pixels. A4× is exactly1256×824 NEAREST. All source/final SHA256 hashes and exact crop/normalization records are in technical-qa.json and manifest.json. Larger built-in source canvases are preserved; these are normalized exports, not a claim that the generator emitted native canvases. All geometry sampling is NEAREST, with nonspatial frequency-first substitution to nearby existing colors (scene radius18, others12), no spatial blur/dithering or arbitrary fixed palette count. B is cropped from its independent generated portrait source to match v05 close camera scale; it is not an enlarged world crop.\n\nVerified '+str(len(preserved))+' baseline files byte-for-byte against '+BASE+', including '+str(qa['baselinePNGsVerified'])+' existing PNGs and all tracked story/game/importer files. No baseline image or code changed. No gameplay tests needed for this review-only package. Browser automation was not run. Static HTTP/link validation is recorded in delivery-verification.json when completed.\n\nVisual inspection covers chair count and row, ceiling hatch/crooked camera, intercom mounting/model, family aging and simple pixel faces, eleven historical prints, camera absence in all photographs, final empty chairs, partial fourth chair and feet-only identity crop. This is a production check, not owner approval.\n')
    def figure(letter, caption=None):
        r=byid[letter];w,h=r['dimensions']
        return '<figure><figcaption>'+html.escape(caption or letter+' · '+r['title'])+'</figcaption><img class="native '+('alpha' if letter=='F' else '')+'" src="'+r['candidatePath']+'" width="'+str(w)+'" height="'+str(h)+'" alt="'+html.escape(r['title'])+'"><p>'+str(w)+'×'+str(h)+' · '+r['mode']+' · generated / approval pending</p></figure>'
    body='<h1>House of Tomorrow · Family portrait gallery</h1><p>Chapter1 Batch3 · all seven candidates generated, pending owner approval.</p><p>Private branch <code>'+BRANCH+'</code>. Baseline <code>'+BASE+'</code>. <a href="DELIVERY.md">Commit and push verification</a>.</p><nav><a href="#gallery">Gallery</a> · <a href="#album">Album</a> · <a href="#photo">Current print</a> · <a href="#house">House continuity</a> · <a href="#reports">Reports</a></nav>'
    body+='<h2 id="gallery">Gallery and complete conversation view</h2><p>Four chairs in one row; camera lowers through ceiling hatch. Clear cabinet surface. No people or historical revelations in these views.</p><div class="row">'+figure('A')+figure('B')+'</div><details><summary>Gallery4× · nearest-neighbor1256×824</summary><img src="previews/gallery-4x.png" width="1256" height="824" alt="Gallery at exact4×"></details><p><a href="previews/gallery-conversation-spatial.png">Download native spatial comparison</a>. B keeps the same wall installation: camera to the left, flush intercom above the blond cabinet, tighter portrait framing.</p>'
    body+='<h2 id="album">Historical album · reading order1→2→3</h2><p>Read each page left-to-right, top-to-bottom. Simplified pixel figures; same family, seating, paper and binding. No taking camera appears inside any photograph. Historical people/remains occur only within the mounted prints.</p>'+''.join(figure(x) for x in 'CDE')+'<p><a href="previews/album-chronology.png">Download chronological contact sheet</a>. Three visual pages need reviewed PMO support; no runtime changes are included.</p>'
    body+='<h2 id="photo">Current misframed print</h2><p>Three whole empty chairs plus roughly one quarter of the fourth at the right edge. Only the seated occupant’s shoes and lower legs are visible; no upper body or face. This print is distinct from the historical album.</p><div class="row">'+figure('F')+figure('G')+'</div><p><a href="previews/photo-slot-inspection.png">Download native slot/inspection comparison</a>. Checkerboard is review-page CSS, not pixels in F.</p>'
    body+='<h2 id="house">Established House continuity</h2><img src="previews/house-contact-sheet.png" width="1002" height="738" alt="Nine House scenes, existing assets unchanged"><p>Eight preserved House scenes beside the new gallery. Rest Assuredv04 pair, bathroom and all other baseline images unchanged.</p>'
    body+='<h2>Preserved first passes</h2><details><summary>Compare superseded staging, album detail and print framing</summary><p>Superseded only; original generation sources are preserved too.</p><img src="comparison/gallery-first-pass.png" width="314" height="206" alt="First gallery pass"><img src="comparison/album-first-pass.png" width="564" height="278" alt="First detailed album pass"><img src="comparison/photo-first-pass.png" width="565" height="451" alt="First three-chair-only print"></details>'
    body+='<h2 id="reports">Review records</h2><ul>'+''.join('<li><a href="'+name+'">'+name+'</a></li>' for name in ['ART_DIRECTION.md','STORY_ART_REPORT.md','PMO_HANDOFF.md','TECHNICAL_QA.md','technical-qa.json','manifest.json','prompts.json','DELIVERY.md'])+'</ul><p>No story, registry, engine, production or public Art Lab changes. No Chapter2 work.</p>'
    css='body{margin:28px;background:#172223;color:#f1e9d8;font:16px/1.55 system-ui}h1,h2{color:#fae2b9}h2{margin-top:40px}a{color:#94ded4}code{overflow-wrap:anywhere}figure{margin:12px 0 24px}figcaption{font-weight:650;margin:0 0 10px}figure p{margin:6px 0;color:#c5d6d2}img{image-rendering:pixelated;display:block;max-width:none}.row{display:flex;gap:30px;align-items:flex-start;flex-wrap:wrap}details{overflow:auto;border:1px solid #65807c;padding:12px}summary{cursor:pointer}.alpha{background-color:#677574;background-image:conic-gradient(#89928b 25%,transparent 0 50%,#89928b 0 75%,transparent 0);background-size:16px 16px}nav{margin:20px 0}p{max-width:1050px}'
    (HERE/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private Chapter1 Batch3 review</title><style>'+css+'</style><body>'+body+'</body></html>')
    print(json.dumps({'assets':len(records),'baselineFiles':len(preserved),'baselinePNGs':qa['baselinePNGsVerified'],'gallery':str(HERE/'index.html')}))

if __name__=='__main__':
    main()
