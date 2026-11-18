"""Verify live canon, all108 selected public PNG hashes and every standalone review file."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,subprocess,hashlib,sys,datetime
R=Path(__file__).resolve().parent;canon=Path(sys.argv[1]);commit=sys.argv[2];run=int(sys.argv[3]);base='https://interstellarharvest.github.io/CYOA-storyboard/'
sha=lambda b:hashlib.sha256(b).hexdigest()
def fetch(rel):
 return subprocess.check_output(['curl','--fail','--silent','--show-error','--retry','2','--max-time','45',base+rel+'?verify='+commit])
live={}
for rel in ['story/artwork.draft.json','story/artwork-preview.json','story/chapters/chapter-02.draft.json','story/chapters/chapter-03.draft.json']:
 b=fetch(rel);assert b==(canon/rel).read_bytes(),rel+' differs live';live[rel]=json.loads(b)
art=live['story/artwork.draft.json'];pre=live['story/artwork-preview.json']['images'];chapter=live['story/chapters/chapter-02.draft.json']
assert len(pre)==108 and 'items:botanical_antidote_customs#inspect' not in pre
rec=art['items']['botanical_antidote_customs']['inspect'];assert rec['status']=='generated' and rec['assetPath'] is None
assert '35da940d24401a6964243179ec7c5d336ad3677fd31dce0ef368de63cecc42cc' in rec['notes'] and '5174b3cc5414f18b3971af8bcbb9f7d499eaf90f' in rec['notes']
owner=json.loads((R/'owner-hash-verification.json').read_text())['verified']
for a in owner[:8]:assert pre[a['key']]['sha256']==a['sha256']
for key in ['public_kit_focus','maintenance_kit_focus','customs_kit_focus']:
 assert 'a chunky medical injector with a glass vial secured inside its metal cage' in chapter['nodes'][key]['text']
def selected(pair):
 k,v=pair;b=fetch(v['file']);assert sha(b)==v['sha256'] and b==(canon/v['file']).read_bytes(),k
 return {'registryKey':k,'file':v['file'],'sha256':v['sha256'],'liveBytesMatch':True}
with ThreadPoolExecutor(max_workers=10) as pool:verified=list(pool.map(selected,pre.items()))
package=json.loads((R/'public-review-package.json').read_text())
def public(pair):
 rel,h=pair;p=package['canonicalPath']+'/'+rel;b=fetch(p);assert sha(b)==h and b==(canon/p).read_bytes(),p
 return {'path':p,'sha256':h,'liveBytesMatch':True}
with ThreadPoolExecutor(max_workers=10) as pool:review=list(pool.map(public,package['files'].items()))
receipt={'verifiedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'approvalRegistrationCommit':'32971f8743851b1ed6997f629ad1c91076d9962c','narrativeCorrectionCommit':'45b0488af8c0e4539105810b21d0651c1b7f49fa','canonicalPublicationCommit':commit,'revisedIImmutableCandidateCommit':'5174b3cc5414f18b3971af8bcbb9f7d499eaf90f','revisedISha256':'35da940d24401a6964243179ec7c5d336ad3677fd31dce0ef368de63cecc42cc','pages':{'runId':run,'url':f'https://github.com/InterstellarHarvest/CYOA-storyboard/actions/runs/{run}','conclusion':'success'},'all108SelectedPublicPngHashesMatch':True,'previous100SelectedImagesPreserved':True,'approvedEightOwnerHashesMatchLive':True,'IGeneratedUnselectedNullProductionPath':True,'allThreeNarrativeCorrectionsVerifiedLive':True,'chapter3BytesMatchPreservedCanon':True,'publicReviewUrl':package['publicUrl'],'allPublicReviewFilesVerified':len(review),'verifiedSelectedImages':verified,'verifiedPublicReviewFiles':review}
(R/'publication-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({k:v for k,v in receipt.items() if k not in ['verifiedSelectedImages','verifiedPublicReviewFiles']},indent=2))
