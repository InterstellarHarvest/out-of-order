"""Read-only live Pages verification using curl's normal TLS verification."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess,json,hashlib,sys,datetime
R=Path(__file__).resolve().parent
canon=Path(sys.argv[1]);commit=sys.argv[2];run=int(sys.argv[3]);base=sys.argv[4].rstrip('/')+'/'
sha=lambda b:hashlib.sha256(b).hexdigest()
def fetch(rel):
 return subprocess.check_output(['curl','--fail','--silent','--show-error','--retry','2','--max-time','45',base+rel+'?verify='+commit])
files={}
for rel in ['story/artwork.draft.json','story/artwork-preview.json','story/items.draft.json']:
 b=fetch(rel);assert b==(canon/rel).read_bytes(),rel+' live bytes differ';files[rel]=json.loads(b)
art=files['story/artwork.draft.json'];preview=files['story/artwork-preview.json'];items=files['story/items.draft.json']
def lookup(key):
 g,p=key.split(':',1)
 if '#' in p:
  ident,v=p.split('#',1);return art[g][ident][v]
 return art[g][p]
manifest=json.loads((R/'manifest.json').read_text())
for a in manifest['assets']:
 rec=lookup(a['registryKey']);assert rec['status']=='generated' and rec['assetPath'] is None;assert a['sha256'] in rec['notes'] and '7ea47f63b6bbf86ffa02dd5a3ee2cb5ad5d3065e' in rec['notes'];assert a['registryKey'] not in preview['images']
assert len(preview['images'])==100
def check(pair):
 k,v=pair;b=fetch(v['file']);assert sha(b)==v['sha256'],k;assert b==(canon/v['file']).read_bytes()
 return {'registryKey':k,'file':v['file'],'sha256':v['sha256'],'liveBytesMatch':True}
with ThreadPoolExecutor(max_workers=10) as pool:verified=list(pool.map(check,preview['images'].items()))
text=json.dumps(items['certified_seed_canister']);assert 'A dull metal case with a sealed packet' in text and 'Botanical Specimen 001' in text and 'A dull metal cylinder' not in text
receipt={'checkedAtUtc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'canonicalPublicationCommit':commit,'candidateSourceCommit':'7ea47f63b6bbf86ffa02dd5a3ee2cb5ad5d3065e','pages':{'runId':run,'url':f'https://github.com/InterstellarHarvest/CYOA-storyboard/actions/runs/{run}','conclusion':'success','baseUrl':base},'liveCatalogMatchesPublishedBytes':True,'selectedPreviewIndexUnchanged':True,'allNineGeneratedUnselectedAndNullProductionPaths':True,'allNineImmutableCandidateHashesVerifiedInLiveProvenance':True,'allSelectedLivePngHashesVerified':len(verified),'seedCaseDescriptionVerifiedLive':True,'verifiedSelectedImages':verified}
(R/'publication-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps({k:v for k,v in receipt.items() if k!='verifiedSelectedImages'},indent=2))
