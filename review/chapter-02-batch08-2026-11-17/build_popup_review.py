"""Review-only harness around the unchanged pinned game popup renderer/config/fonts."""
from pathlib import Path
import json,shutil,hashlib
R=Path(__file__).resolve().parent;src=R/'sources/popup-ui'
(R/'popup-ui').mkdir(exist_ok=True)
files={'game/js/end-presentation.js':'popup-ui/end-presentation.js','game/js/pixeltext.js':'popup-ui/pixeltext.js','game/content/end-presentations.review.js':'popup-ui/layout-config.js','game/game.css':'popup-ui/game.css','lab_data.original.js':'popup-ui/lab_data.js'}
hashes={}
for a,b in files.items():
 shutil.copy2(src/a,R/b);hashes[b]=hashlib.sha256((R/b).read_bytes()).hexdigest();assert (R/b).read_bytes()==(src/a).read_bytes()
shutil.copytree(src/'art',R/'art',dirs_exist_ok=True)
targets=json.loads((R/'target-source-records.json').read_text());manifest=json.loads((R/'manifest.json').read_text());data=[];backgrounds={'A':'sorting_conveyor','B':'planting_hopper','C':'planting_machine','D':'planting_machine','E':'translator_machine'}
for a in manifest['assets']:
 k=a['id'];fatal=next(iter(targets[k]['fatalNodes'].values()));p=fatal['deathPopup'];node=next(iter(targets[k]['fatalNodes']))
 data.append({'letter':k,'id':'chapter-02:'+node,'when':{'end':'chapter-02:'+node},'title':p['title'],'subtitle':p['subtitle'],'body':[p['description']],'popupStatus':p['status'],'artStatus':'generated','readyForGameplay':False,'art':{'path':a['candidatePath'],'size':[314,206],'scale':2},'background':'references/'+backgrounds[k]+'.png','candidateSha256':a['sha256']})
(R/'popup-ui/review-data.js').write_text('window.BATCH8_REVIEW_DATA='+json.dumps(data,ensure_ascii=True)+';\nwindow.CYOA_DEATH_PRESENTATIONS={entries:window.BATCH8_REVIEW_DATA,storyboard:{revision:"69abc4d9859dda46f220f0da51b75fdf73be3f95"}};\nwindow.M1_SPRITE_SHEET={sprites:{}};window.CYOA_ROOT="./";\n')
html='''<!doctype html><html><head><meta charset="utf-8"><title>Batch8 · existing A1 popup composition proof</title><link rel="stylesheet" href="popup-ui/game.css"></head><body><div id="stageFrame" style="width:1920px;height:1080px"><div id="stage"></div></div><script src="popup-ui/lab_data.js"></script><script src="popup-ui/review-data.js"></script><script src="popup-ui/pixeltext.js"></script><script src="popup-ui/layout-config.js"></script><script src="popup-ui/end-presentation.js"></script><script src="popup-ui/review-harness.js"></script></body></html>'''
(R/'popup-preview.html').write_text(html)
(R/'popup-ui-provenance.json').write_text(json.dumps({'sourceRepository':'InterstellarHarvest/CYOA','sourceBranch':'agent/death-popups-ordinary-play-20261117','sourceCommit':'7592effa087cf346746a390acb37ce43a3b9d81a','originalRendererConfigurationBitmapFontsAndGameCssUnmodified':True,'copiedSourceHashes':hashes,'reviewOnlyUnselectedCandidateArtBinding':True,'registrySelectionChanged':False,'gameplayLogicChanged':False,'controls':'Existing RETRY / CHECKPOINT / EXIT; no saved game points available in review harness','backdrop':'Approved related scene as a frozen reference stand-in, using existing renderer10px blocks and0.35 multiplier; not a simulated game-state capture','publicDelivery':'Static captured composition PNGs only; engine-source harness retained in private art review.'},indent=2)+'\n')
print('Existing pinned renderer/config/fonts copied byte-exact. Candidate bindings are review-only.')
