"""Real offline Chrome DOM/control/image QA plus local link checks."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote,urlparse
import subprocess,json,re,tempfile,hashlib
R=Path(__file__).resolve().parent
class Links(HTMLParser):
 def __init__(self):super().__init__();self.paths=[]
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ('href','src') and v and not v.startswith(('#','http','data:')):self.paths.append(unquote(v.split('#')[0]))
parser=Links();parser.feed((R/'index.html').read_text())
missing=[p for p in parser.paths if not (R/p).is_file()]
# Publication and browser receipt links resolve in final documentation stage.
allowed={'STORYBOARD_SYNC.md','gallery-verification.json'}
assert not set(missing)-allowed,missing
Q=R/'browser-qa';Q.mkdir(exist_ok=True)
script="""<script>
setTimeout(async()=>{
const wait=()=>new Promise(resolve=>{const check=()=>{if([...document.images].every(i=>i.complete))resolve();else setTimeout(check,100)};check()});
document.body.dataset.qaStage='started';
const report={};
await wait();document.body.dataset.qaStage='native';report.cardCount=document.querySelectorAll('.asset').length;
report.nativeImages=[...document.querySelectorAll('.asset img')].map(i=>({src:i.getAttribute('src'),w:i.naturalWidth,h:i.naturalHeight,loaded:i.complete&&i.naturalWidth>0,pixelated:getComputedStyle(i).imageRendering}));
document.querySelector('[data-scale="4"]').click();await wait();
report.fourXImages=[...document.querySelectorAll('.asset img')].map(i=>({src:i.getAttribute('src'),w:i.naturalWidth,h:i.naturalHeight,loaded:i.complete&&i.naturalWidth>0}));
report.fourXControlWorks=[...document.querySelectorAll('.scaled')].every(i=>i.getAttribute('src').endsWith('-4x.png'));
document.querySelector('[data-backdrop="dark"]').click();report.darkControlWorks=[...document.querySelectorAll('.alpha')].every(i=>i.classList.contains('dark'));
document.querySelector('[data-backdrop="light"]').click();report.lightControlWorks=[...document.querySelectorAll('.alpha')].every(i=>i.classList.contains('light')&&!i.classList.contains('dark'));
document.querySelector('[data-backdrop="checker"]').click();report.checkerControlWorks=[...document.querySelectorAll('.alpha')].every(i=>!i.classList.contains('light')&&!i.classList.contains('dark'));
document.querySelector('[data-scale="1"]').click();await wait();
report.brokenImages=[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src);
report.documentOverflow=document.documentElement.scrollWidth>innerWidth;
report.comparisonCount=document.querySelectorAll('#groups figure').length;
report.passed=report.cardCount===9&&report.comparisonCount===8&&!report.brokenImages.length&&report.fourXControlWorks&&report.darkControlWorks&&report.lightControlWorks&&report.checkerControlWorks&&report.nativeImages.every((i,n)=>i.loaded&&['pixelated','crisp-edges'].includes(i.pixelated)&&i.w===[564,96,565][n%3]&&i.h===[278,96,451][n%3])&&report.fourXImages.every((i,n)=>i.loaded&&i.w===[2256,384,2260][n%3]&&i.h===[1112,384,1804][n%3]);
const out=document.createElement('pre');out.id='qa-result';out.textContent=JSON.stringify(report);document.body.append(out);
},500);
</script>"""
page=(R/'index.html').read_text().replace('<head>','<head><base href="'+R.as_uri()+'/">')+script
(Q/'test.html').write_text(page)
cmd=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--headless','--disable-gpu','--no-first-run','--disable-background-networking','--disable-crash-reporter','--user-data-dir='+tempfile.mkdtemp(prefix='b7-chrome-'),'--window-size=1440,1100','--force-device-scale-factor=1','--allow-file-access-from-files','--virtual-time-budget=15000','--screenshot='+str(Q/'native-desktop.png'),'--dump-dom',(Q/'test.html').as_uri()]
timed=False
try:
 r=subprocess.run(cmd,capture_output=True,timeout=25);out=r.stdout.decode(errors='replace');stderr=r.stderr.decode(errors='replace')
except subprocess.TimeoutExpired as e:
 timed=True;out=(e.stdout or b'').decode(errors='replace');stderr=(e.stderr or b'').decode(errors='replace')
(Q/'dom.html').write_text(out);(Q/'chrome-stderr.log').write_text(stderr)
m=re.search(r'<pre id="qa-result">(.*?)</pre>',out,re.S);assert m,'Chrome produced no QA result'
report=json.loads(m[1].replace('&amp;','&').replace('&lt;','<').replace('&gt;','>'))
assert report['passed'],report
report.update(browser='Google Chrome headless',realBrowser=True,localLinksChecked=len(parser.paths),missingLinksAtRun=missing,chromeExitedAfterDomCapture=not timed,screenshotExists=(Q/'native-desktop.png').exists(),note='Chrome may require timeout termination after producing complete successful DOM. Pixel assertions come from actual decoded image dimensions and exercised gallery controls.')
(R/'gallery-verification.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:report[k] for k in ['passed','cardCount','comparisonCount','fourXControlWorks','darkControlWorks','lightControlWorks','checkerControlWorks','screenshotExists']}))
