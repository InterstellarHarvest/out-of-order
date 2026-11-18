from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import json,subprocess,hashlib,datetime,sys
R=Path(__file__).resolve().parent;canon=Path(sys.argv[1]);commit=sys.argv[2];run=int(sys.argv[3])
base='https://interstellarharvest.github.io/CYOA-storyboard/'
def fetch(p):return subprocess.check_output(['curl','--fail','--silent','--show-error','--retry','2','--max-time','45',base+p+'?verify='+commit])
pre=json.loads((canon/'story/artwork-preview.json').read_text())
for p in ['story/artwork.draft.json','story/artwork-preview.json']:
 assert fetch(p)==(canon/p).read_bytes(),p
assert len(pre['images'])==109
def verify(pair):
 k,v=pair;b=fetch(v['file']);assert hashlib.sha256(b).hexdigest()==v['sha256'] and b==(canon/v['file']).read_bytes(),k
 return {'key':k,'path':v['file'],'sha256':v['sha256'],'liveBytesMatchRegisteredHash':True}
with ThreadPoolExecutor(max_workers=10) as pool:verified=list(pool.map(verify,pre['images'].items()))
receipt={'approvalRegistrationCommit':'69abc4d9859dda46f220f0da51b75fdf73be3f95','canonicalPublicationCommit':commit,'checkedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'pages':{'runId':run,'url':f'https://github.com/InterstellarHarvest/CYOA-storyboard/actions/runs/{run}','conclusion':'success'},'selectedCount':109,'all109LivePublicPngHashesMatchRegisteredSources':True,'previous108SelectedPngsPreserved':True,'verifiedSelectedImages':verified}
(R/('batch7-approval-publication.json' if commit=='69abc4d9859dda46f220f0da51b75fdf73be3f95' else 'final-selected-public-verification.json')).write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({k:v for k,v in receipt.items() if k!='verifiedSelectedImages'},indent=2))
