#!/usr/bin/env python3
"""Two scene candidates and continuity comparisons; no production writes."""
from pathlib import Path
import hashlib, html, importlib.util, json, subprocess, sys
from PIL import Image
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent
PARENT=HERE.parent
ROOT=HERE.parents[2]
BASE='f867fee7b0f104dae0978d98311b95d2759e8f92'
spec=importlib.util.spec_from_file_location('scene_helpers',PARENT.parent/'chapter-01-batch03-2026-11-15/build_review.py')
helpers=importlib.util.module_from_spec(spec);spec.loader.exec_module(helpers)
ARRIVAL=PARENT/'arrival-correction-v03/arrival-v03.png'
ARRIVAL_SHA='7029c0e66b06a784447313a0e06e831ad4f5c48260ed809da195d3810b57dcde'
SPECS=[('foyer','Foyer — closed single door','foyer-single-door-v03',PARENT.parent/'chapter-01-speaker-revision-2026-11-15/candidates/foyer-v04.png'),('public_exit','Public exit — open single door','public-exit-single-door-v01',PARENT/'candidates/public-exit-v01.png')]

def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()

def frame_edges(path):
    im=Image.open(path).convert('RGB')
    count={x:sum(max(im.getpixel((x,y)))-min(im.getpixel((x,y)))<22 and im.getpixel((x,y))[0]<215 for y in range(45,153)) for x in range(70,153)}
    left=[x for x in range(70,102) if count[x]>=70]
    right=[x for x in range(140,153) if count[x]>=70]
    return [min(left),max(right)]

def main():
    for name in ['candidates','previews','comparisons']:(HERE/name).mkdir(exist_ok=True)
    assert sha(ARRIVAL)==ARRIVAL_SHA
    records=[]
    for scene,title,name,before in SPECS:
        src=HERE/'generation-source'/(name+'.png');dst=HERE/'candidates'/(name+'.png')
        transform=helpers.export(src,dst,(314,206))
        im=Image.open(dst);assert im.size==(314,206) and im.mode=='RGB'
        preview=HERE/'previews'/(name+'-4x.png');im.resize((1256,824),Image.Resampling.NEAREST).save(preview)
        assert Image.open(preview).tobytes()==im.resize((1256,824),Image.Resampling.NEAREST).tobytes()
        helpers.sheet(HERE/'comparisons'/(scene+'-before-after.png'),[('Before / preserved',before),('Corrected / single door',dst)],2,(334,246))
        records.append({'registryTarget':'house_of_tomorrow/'+scene,'title':title,'status':'generated','ownerApproved':False,'assetPath':None,'candidatePath':str(dst.relative_to(HERE)),'preview4xPath':str(preview.relative_to(HERE)),'sourcePath':str(src.relative_to(HERE)),'sourceSHA256':sha(src),'beforePath':str(before.relative_to(ROOT)),'beforeSHA256':sha(before),'dimensions':[314,206],'mode':'RGB','uniqueColors':len(set(im.getdata())),'sha256':sha(dst),'previewSHA256':sha(preview),**transform})
    entries=[('ARRIVAL / canonical outside',ARRIVAL),('FOYER / corrected inside closed',HERE/records[0]['candidatePath']),('PUBLIC EXIT / same door open',HERE/records[1]['candidatePath'])]
    native=HERE/'comparisons/arrival-foyer-public-exit-native.png';helpers.sheet(native,entries,3,(334,246))
    compare=Image.open(native);four=compare.resize((compare.width*4,compare.height*4),Image.Resampling.NEAREST)
    four.save(HERE/'comparisons/arrival-foyer-public-exit-4x.png')
    assert four.size==(4008,984)
    assert four.tobytes()==compare.resize((4008,984),Image.Resampling.NEAREST).tobytes()
    protected=[]
    for entry in subprocess.check_output(['git','ls-tree','-rz',BASE],cwd=ROOT).split(b'\0'):
        if not entry:continue
        meta,raw=entry.split(b'\t',1);p=raw.decode()
        if p.lower().endswith('.png') or p.startswith(('story/','game/','tools/story-import/')):
            data=(ROOT/p).read_bytes();blob=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
            assert blob==meta.split()[2].decode(),'Earlier file changed: '+p
            protected.append(p)
    assert sha(ARRIVAL)==ARRIVAL_SHA
    edges={r['registryTarget']:frame_edges(HERE/r['candidatePath']) for r in records}
    assert all(abs(a-b)<=1 for a,b in zip(*edges.values())),edges
    sources=[{'path':str(p.relative_to(HERE)),'sha256':sha(p),'dimensions':list(Image.open(p).size),'mode':Image.open(p).mode,'selected':p.stem in {Path(r['sourcePath']).stem for r in records}} for p in sorted((HERE/'generation-source').glob('*.png'))]
    count=sum(p.lower().endswith('.png') for p in protected)
    manifest={'scope':'Review metadata only; two corrected scenes, not runtime schema','baseline':BASE,'branch':'agent/ch01-art-batch04-20261115','tool':'built-in image_gen.imagegen','status':'generated','ownerApproved':False,'assets':records,'canonicalArrival':{'path':str(ARRIVAL.relative_to(ROOT)),'sha256':ARRIVAL_SHA,'changed':False},'generationSources':sources,'comparisonNative':{'path':str(native.relative_to(HERE)),'dimensions':[1002,246],'eachSceneDimensions':[314,206],'sha256':sha(native)},'comparison4x':{'path':'comparisons/arrival-foyer-public-exit-4x.png','dimensions':[4008,984],'eachSceneDimensions':[1256,824],'method':'entire native comparison exactly4x NEAREST','sha256':sha(HERE/'comparisons/arrival-foyer-public-exit-4x.png')},'doorConvention':{'outsideArrival':'hinges viewer-right, lever viewer-left','insideClosed':'hinges viewer-left, lever viewer-right','insideOpen':'same inside-left hinge jamb; one leaf opens outward into corridor','wallInfill':'former left part of double opening filled flush; right jamb/scanner retained','additionalRoomOrDoor':False},'baselinePNGsPreserved':count,'baselineFilesVerified':len(protected),'separateServiceExitsChanged':False,'storyEngineProductionChanged':False}
    manifest['nativeFrameEdgeCheck']={'leftRightEdgesInclusive':edges,'tolerancePixels':1,'method':'Long neutral-gray frame strips within fixed entrance region; visually checked alongside comparison'}
    (HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    (HERE/'QA.md').write_text('# Door continuity QA\n\nExactly two generated scene candidates, both RGB314×206 with exact4×1256×824 previews. Native three-view comparison is1002×246 with three314×206 panels; its4× file is an exact whole-sheet NEAREST replication at4008×984, with each scene1256×824. No geometry averaging or arbitrary palette cap: source normalization uses exact-aspect NEAREST plus nonspatial radius18 substitution to nearby existing colors. All original larger source renders and exact prompts are retained.\n\nVerified '+str(count)+' prior PNGs and all tracked story/game/importer files byte-for-byte against '+BASE+'. Canonical arrival hash is unchanged and separately asserted. All original foyer/public-exit images and service exits are preserved; no production asset path or story binding changed.\n\nVisual checks: one solid ivory leaf per view, no entrance glazing/title, ordinary lever/three hinges, reverse exterior/interior handedness, same inside jamb and opening width across closed/open images, outward swing into institution corridor, matching frosted/gray outside panels, scanner and surrounding domestic composition preserved, natural wall infill with no added vestibule/door, pictogram on approach side only, no new plant/protagonist and no service-exit changes. Detail checks are reviewed alongside the three-view comparisons. New full-scene renders are generated edits; no claim is made of masked pixel-identical preservation in newly rendered areas. Earlier files remain byte-identical.\n\nNative PNG modes/dimensions, selected hashes and static gallery links are recorded in gallery-verification.json. Browser automation was not run. Replacements remain generated pending owner approval.\n')
    body='<h1>One House entrance · door continuity correction</h1><p>Canonical arrival unchanged; two corrected scenes only. One solid ivory leaf, no entrance glazing or exhibit title. Exterior hinges are on viewer-right; inside hinges are on viewer-left, with the lever on the free edge. The single leaf opens outward into the same institutional corridor.</p><p><a href="README.md">Correction notes</a> · <a href="prompts.json">Built-in imagegen prompts</a> · <a href="manifest.json">Hashes / door convention</a> · <a href="QA.md">QA</a></p><h2>Three views · native</h2><img src="comparisons/arrival-foyer-public-exit-native.png" width="1002" height="246" alt="Canonical arrival, closed foyer, open public exit"><details><summary>Exact4× comparison · each scene1256×824</summary><img src="comparisons/arrival-foyer-public-exit-4x.png" width="4008" height="984" alt="Three-view comparison exactly4x nearest-neighbor"></details>'
    for r in records:
        scene=r['registryTarget'].split('/')[-1]
        body+='<h2>'+html.escape(r['title'])+'</h2><p>Generated candidate ·314×206 RGB · approval pending</p><img src="'+r['candidatePath']+'" width="314" height="206" alt="'+html.escape(r['title'])+'"><details><summary>Exact4×1256×824</summary><img src="'+r['preview4xPath']+'" width="1256" height="824" alt="'+html.escape(r['title'])+' at4x"></details><details><summary>Before / after at native scale</summary><img src="comparisons/'+scene+'-before-after.png" width="668" height="246" alt="'+html.escape(r['title'])+' before after"></details>'
    body+='<p>The former left side of the wide double opening is now flush ivory wall/skirting. Right jamb and scanner stay in place; no vestibule or second doorway. Existing decorative plants remain scenery, not a donated resident. Both public-exit outcomes use this open-door image. No story, engine, production integration or separate service-exit change.</p><p>Private branch <code>agent/ch01-art-batch04-20261115</code> · verified baseline <code>'+BASE+'</code>. Final remote-verified commit is reported in the owner handoff.</p>'
    css='body{margin:28px;background:#172223;color:#f1e9d8;font:16px/1.55 system-ui}a{color:#94ded4}h1,h2{color:#fae2b9}h2{margin-top:36px}p{max-width:1100px}code{overflow-wrap:anywhere}img{display:block;image-rendering:pixelated;max-width:none}details{overflow:auto;border:1px solid #65807c;padding:12px;margin:16px 0}summary{cursor:pointer}'
    (HERE/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>House door continuity review</title><style>'+css+'</style><body>'+body+'</body></html>')
    print(json.dumps({'correctedSceneCount':2,'canonicalArrivalUnchanged':True,'baselinePNGsPreserved':count,'nativeComparison':[1002,246],'comparison4x':[4008,984],'gallery':str(HERE/'index.html')}))

if __name__=='__main__':main()
