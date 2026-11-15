#!/usr/bin/env python3
"""Six review-only scene exports; never writes runtime/story/production paths."""
from pathlib import Path
import hashlib, html, importlib.util, json, subprocess, sys
from PIL import Image
sys.dont_write_bytecode=True
HERE=Path(__file__).resolve().parent
ROOT=HERE.parent.parent
BASE='8607ed729c1af2258ae178e2fdf68ce7a6bc8d0a'
BRANCH='agent/ch01-art-batch04-20261115'
spec=importlib.util.spec_from_file_location('pixel_review_helpers',HERE.parent/'chapter-01-batch03-2026-11-15/build_review.py')
helpers=importlib.util.module_from_spec(spec);spec.loader.exec_module(helpers)
SPECS=[('A','House arrival','arrival','arrival-v02'),('B','Housekeeping storage','storage','storage-v02'),('C','Maintenance breach','maintenance','maintenance-v01'),('D','Equipment-service exit','utility_exit','utility-exit-v01'),('E','Low service-hatch exit','service_hatch','service-hatch-v01'),('F','Public exit','public_exit','public-exit-v01')]
EXISTING={
 'foyer':('Foyer','chapter-01-speaker-revision-2026-11-15/candidates/foyer-v04.png'),
 'lounge':('Lounge','chapter-01-batch02-2026-11-15/candidates/lounge-candidate-v01.png'),
 'dining':('Dining','chapter-01-speaker-revision-2026-11-15/candidates/dining-v04.png'),
 'chair':('Rest Assured in-usev04','chapter-01-batch02-2026-11-15/rest-assured-pair-v04/candidates/chair-in-use-v04.png'),
 'bedroom':('Martin bedroom','chapter-01-batch02-2026-11-15/candidates/bedroom-candidate-v01.png'),
 'passage':('Wardrobe crawlspace','chapter-01-batch02-2026-11-15/candidates/passage-candidate-v01.png'),
 'portrait_gallery':('Gallery widev05','chapter-01-batch03-2026-11-15/wide-speaker-position-v05/gallery-v05.png'),
 'bathroom':('Bathroom','chapter-01-first-pass-2026-11-15/candidates/bathroom.png'),
}

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()

def main():
    for name in ['candidates','previews','comparisons']:(HERE/name).mkdir(exist_ok=True)
    records=[]
    for letter,title,scene,source in SPECS:
        src=HERE/'generation-source'/(source+'.png');dst=HERE/'candidates'/(source+'.png')
        transform=helpers.export(src,dst,(314,206))
        im=Image.open(dst);assert im.size==(314,206) and im.mode=='RGB'
        preview=HERE/'previews'/(source+'-4x.png')
        im.resize((1256,824),Image.Resampling.NEAREST).save(preview)
        assert Image.open(preview).tobytes()==im.resize((1256,824),Image.Resampling.NEAREST).tobytes()
        records.append({'id':letter,'title':title,'registryTarget':'house_of_tomorrow/'+scene,'kind':'scene','status':'generated','ownerApproved':False,'assetPath':None,'candidatePath':str(dst.relative_to(HERE)),'preview4xPath':str(preview.relative_to(HERE)),'dimensions':[314,206],'mode':'RGB','uniqueColors':len(set(im.getdata())),'sha256':sha(dst),'previewSHA256':sha(preview),'sourcePath':str(src.relative_to(HERE)),'sourceSHA256':sha(src),**transform})
    byid={r['id']:r for r in records};candidate=lambda x:HERE/byid[x]['candidatePath']
    existing=lambda k:HERE.parent/EXISTING[k][1]
    comparisons={
      'arrival-foyer':[('Arrival / new',candidate('A')),('Foyer / preserved',existing('foyer'))],
      'storage-foyer':[('Storage / new',candidate('B')),('Foyer / preserved',existing('foyer'))],
      'maintenance-rest-assured':[('Chair in-usev04 / preserved',existing('chair')),('Maintenance / new',candidate('C'))],
      'wardrobe-passage-hatch':[('Wardrobe passage / preserved',existing('passage')),('Hatch outside / new',candidate('E'))],
      'public-versus-service-exits':[('Public double doorway',candidate('F')),('Equipment service door',candidate('D')),('Ordinary corridor low hatch',candidate('E'))],
      'maintenance-equipment-door':[('Heavy door inside / C',candidate('C')),('Heavy door outside / D',candidate('D'))],
    }
    for name,entries in comparisons.items():helpers.sheet(HERE/'comparisons'/(name+'.png'),entries,len(entries),(334,246))
    new_by_scene={r['registryTarget'].split('/')[-1]:r for r in records}
    order=['arrival','foyer','storage','lounge','dining','chair','maintenance','utility_exit','bedroom','passage','service_hatch','portrait_gallery','bathroom','public_exit']
    registry=json.loads((ROOT/'story/artwork.draft.json').read_text())
    assert len(order)==len(set(order))==14
    assert set('house_of_tomorrow/'+x for x in order)=={x for x in registry['scenes'] if x.startswith('house_of_tomorrow/')}
    contact=[];contact_records=[]
    for scene in order:
        if scene in new_by_scene:
            r=new_by_scene[scene];path=HERE/r['candidatePath'];label=r['title']+' / new'
        else:
            label,rel=EXISTING[scene];label+=' / preserved';path=HERE.parent/rel
        im=Image.open(path);assert im.size==(314,206)
        contact.append((label,path));contact_records.append({'scene':'house_of_tomorrow/'+scene,'path':str(path.relative_to(ROOT)),'sha256':sha(path),'new':scene in new_by_scene})
    helpers.sheet(HERE/'previews/chapter-01-fourteen-scene-contact.png',contact,4,(334,246))
    preserved=[]
    for entry in subprocess.check_output(['git','ls-tree','-rz',BASE],cwd=ROOT).split(b'\0'):
        if not entry:continue
        meta,raw=entry.split(b'\t',1);path=raw.decode()
        if path.lower().endswith('.png') or path.startswith(('story/','game/','tools/story-import/')):
            data=(ROOT/path).read_bytes();actual=hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
            assert actual==meta.split()[2].decode(),'Existing file modified: '+path
            preserved.append({'path':path,'sha256':hashlib.sha256(data).hexdigest()})
    reception=ROOT/'art/scenes/conference_hall/reception/reception_scene.png'
    portrait=HERE.parent/'chapter-01-batch03-2026-11-15/printer-album-restoration-v04/candidates/gallery-conversation-v03.png'
    assert sha(reception)=='fb010301d2df0c06d0cedaff6e35e60661e18764c9e5d9ed755ad78b0ac5fd53'
    assert sha(portrait)=='a365560b66e6d4bbb1f865214768a20dfb6bed2a870bd62ab31ce2c5b9f66f4d'
    sources=[{'path':str(p.relative_to(HERE)),'sha256':sha(p),'dimensions':list(Image.open(p).size),'mode':Image.open(p).mode,'selected':p.stem in {x[3] for x in SPECS}} for p in sorted((HERE/'generation-source').glob('*.png'))]
    manifest={'scope':'Private review metadata only; not runtime schema','baseline':BASE,'branch':BRANCH,'tool':'built-in image_gen.imagegen','status':'generated','ownerApproved':False,'assetCount':6,'assets':records,'generationSources':sources,'contactSheet':contact_records,'stateVariants':'Proposal only in STATE_VARIANTS.md; no extra scene/state art generated'}
    (HERE/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    count=sum(x['path'].lower().endswith('.png') for x in preserved)
    qa={'technicalChecks':'passed','creativeApproval':'pending','assetCount':6,'allScenesRGB314x206':True,'allSix4xPreviewsExactNearest1256x824':True,'distinctContactSheetScenes':14,'baselineFilesVerified':len(preserved),'baselinePNGsPreserved':count,'receptionSHA256':sha(reception),'approvedGalleryPortraitSHA256':sha(portrait),'assets':records,'generationSources':sources,'preserved':preserved,'browserAutomation':'not run'}
    (HERE/'technical-qa.json').write_text(json.dumps(qa,indent=2)+'\n')
    rows='\n'.join('| '+r['id']+' | '+r['title']+' | 314×206 | RGB | '+str(r['uniqueColors'])+' |' for r in records)
    (HERE/'TECHNICAL_QA.md').write_text('# Batch4 technical QA\n\nSix generated candidates, creative approval pending.\n\n| ID | Asset | Size | Mode | Unique colors |\n|---|---|---|---|---|\n'+rows+'\n\nSix native dimensions/modes asserted. All4× previews are exactly1256×824 and match NEAREST pixel replication. Full contact sheet contains exactly14 distinct registry scene IDs, with eight prior environments and six new candidates; the extra chair default is not counted as another scene. All'+str(count)+' previously tracked PNGs and tracked story/game/importer files match the verified baseline byte-for-byte. Approved reception and gallery conversation hashes are separately asserted. Source/export/preview hashes, crops, color normalization and reference provenance are recorded in manifest.json, prompts.json and technical-qa.json.\n\nBuilt-in imagegen emits larger deliberately pixel-like source canvases; these original renders are preserved. Final scene geometry uses exact-aspect crop and NEAREST only, followed by nonspatial frequency-first substitution to nearby existing RGB colors (radius18). No averaging, dithering or fixed palette-count target is used. This is a documented normalization workflow, not a claim that imagegen emitted314×206 directly.\n\nVisual checks cover door/window/handle/scanner identity, empty padded drawer and approved intercom, accepted chair model and mechanical damage, maintenance monitor/release/clamp, reverse heavy-door face, neutral sorting screen, low hatch proportions/handedness, public threshold/open leaves, no people/player/items baked into baseline, native title legibility and route separation. State art is proposed only, not implemented. Browser automation was not run; static-gallery validation is recorded separately in gallery-verification.json. No gameplay tests are needed for this review-only folder.\n')
    body='<h1>Chapter1 · Batch4 final six environments</h1><p>Six generated candidates awaiting owner visual review. Private branch <code>'+BRANCH+'</code>, verified baseline <code>'+BASE+'</code>. Final pushed commit is reported in the owner handoff.</p><p><a href="CONTINUITY_AND_STORY_REPORT.md">Story / route continuity</a> · <a href="STATE_VARIANTS.md">Unapplied state proposals</a> · <a href="TECHNICAL_QA.md">QA</a> · <a href="prompts.json">Exact prompts / references</a> · <a href="manifest.json">Assets / hashes</a> · <a href="README.md">Delivery notes</a></p>'
    for r in records:
        body+='<section><h2>'+html.escape(r['id']+' · '+r['title'])+'</h2><p><code>'+r['registryTarget']+'</code> · 314×206 RGB · generated / approval pending</p><img src="'+r['candidatePath']+'" width="314" height="206" alt="'+html.escape(r['title'])+'"><details><summary>Exact4× nearest-neighbor1256×824</summary><img src="'+r['preview4xPath']+'" width="1256" height="824" alt="'+html.escape(r['title'])+' exact4×"></details></section>'
    body+='<h2>Continuity comparisons · all native</h2>'
    for name,entries in comparisons.items():body+='<figure><figcaption>'+html.escape(name.replace('-',' '))+'</figcaption><img src="comparisons/'+name+'.png" width="'+str(len(entries)*334)+'" height="246" alt="'+html.escape(name)+'"></figure>'
    body+='<h2>Full Chapter1 ·14 distinct scenes</h2><img src="previews/chapter-01-fourteen-scene-contact.png" width="1336" height="984" alt="All fourteen Chapter1 environments"><p>Eight preserved environments plus six new scenes. Latest gallery widev05 and accepted Rest Assured in-usev04 are the selected reference states. No earlier artwork, story/engine/registry paths, production assets, public site or Chapter2 content changed.</p>'
    css='body{margin:28px;background:#172223;color:#f1e9d8;font:16px/1.55 system-ui}a{color:#94ded4}h1,h2{color:#fae2b9}section,h2{margin-top:36px}p{max-width:1100px}code{overflow-wrap:anywhere}img{display:block;image-rendering:pixelated;max-width:none}details{overflow:auto;border:1px solid #65807c;padding:12px;margin:15px 0}summary{cursor:pointer}figure{margin:24px 0}figcaption{margin-bottom:10px;font-weight:bold}'
    (HERE/'index.html').write_text('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Private Chapter1 Batch4 review</title><style>'+css+'</style><body>'+body+'</body></html>')
    print(json.dumps({'generatedAssets':6,'contactSceneCount':14,'earlierPNGsPreserved':count,'sourceRenders':len(sources),'gallery':str(HERE/'index.html')}))

if __name__=='__main__':main()
