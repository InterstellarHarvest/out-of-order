from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from html.parser import HTMLParser
import threading,subprocess,tempfile,re,json,html
R=Path(__file__).resolve().parent;Q=R/'browser-qa';Q.mkdir(exist_ok=True)
class Links(HTMLParser):
 def __init__(self):super().__init__();self.paths=[]
 def handle_starttag(self,tag,attrs):
  for k,v in attrs:
   if k in ['href','src'] and v and not v.startswith(('#','http','data:')):self.paths.append(v)
links=Links();links.feed((R/'index.html').read_text());missing=[p for p in links.paths if not(R/p).is_file()];assert not set(missing)-{'gallery-verification.json'},missing
script="""<script>setTimeout(async()=>{
const wait=()=>new Promise(resolve=>{const check=()=>{if([...document.images].every(i=>i.complete))resolve();else setTimeout(check,100)};check()});
const report={};await wait();report.cardCount=document.querySelectorAll('.asset').length;
const dims=()=>[...document.querySelectorAll('.asset img')].map(i=>({w:i.naturalWidth,h:i.naturalHeight,loaded:i.complete&&i.naturalWidth>0,rendering:getComputedStyle(i).imageRendering}));
report.native=dims();
document.querySelector('[data-scale="2"]').click();await wait();report.popup2x=dims();
document.querySelector('[data-scale="4"]').click();await wait();report.inspection4x=dims();
report.fourXControlWorks=[...document.querySelectorAll('.scaled')].every(i=>i.src.endsWith('-4x.png'));
report.comparisonCount=document.querySelectorAll('#groups figure').length;
report.popupCompositions=[...document.querySelectorAll('.popup-image')].map(i=>({w:i.naturalWidth,h:i.naturalHeight,loaded:i.complete&&i.naturalWidth>0}));
document.querySelector('[data-scale="1"]').click();await wait();report.brokenImages=[...document.images].filter(i=>!i.complete||!i.naturalWidth).map(i=>i.src);report.documentOverflow=document.documentElement.scrollWidth>innerWidth;
report.passed=report.cardCount===5&&report.comparisonCount===7&&report.popupCompositions.length===5&&report.popupCompositions.every(i=>i.loaded&&i.w===1920&&i.h===1080)&&!report.brokenImages.length&&!report.documentOverflow&&report.fourXControlWorks&&report.native.every(i=>i.loaded&&i.w===314&&i.h===206&&['pixelated','crisp-edges'].includes(i.rendering))&&report.popup2x.every(i=>i.loaded&&i.w===628&&i.h===412)&&report.inspection4x.every(i=>i.loaded&&i.w===1256&&i.h===824);
const o=document.createElement('pre');o.id='gallery-qa-result';o.textContent=JSON.stringify(report);document.body.append(o);
},500);</script>"""
(Q/'test.html').write_text((R/'index.html').read_text().replace('<head>','<head><base href="../">')+script)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_address[1]}/browser-qa/test.html'
cmd=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--headless','--disable-gpu','--no-first-run','--disable-background-networking','--disable-crash-reporter','--user-data-dir='+tempfile.mkdtemp(prefix='b8-gallery-chrome-'),'--window-size=1440,1100','--force-device-scale-factor=1','--virtual-time-budget=20000','--screenshot='+str(Q/'native-desktop.png'),'--dump-dom',url]
timed=False
try:
 p=subprocess.run(cmd,capture_output=True,timeout=30);out=p.stdout.decode(errors='replace');err=p.stderr.decode(errors='replace')
except subprocess.TimeoutExpired as e:
 timed=True;out=(e.stdout or b'').decode(errors='replace');err=(e.stderr or b'').decode(errors='replace')
finally:server.shutdown();server.server_close()
(Q/'dom.html').write_text(out);(Q/'chrome-stderr.log').write_text(err)
m=re.search(r'<pre id="gallery-qa-result">(.*?)</pre>',out,re.S);assert m,'No browser result'
report=json.loads(html.unescape(m[1]));assert report['passed'],report
report.update(browser='Google Chrome headless',localLinkCount=len(links.paths),initialMissingLinks=missing,chromeTerminatedAfterSuccessfulDomCapture=timed,screenshotExists=(Q/'native-desktop.png').exists())
(R/'gallery-verification.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['passed','cardCount','comparisonCount','fourXControlWorks','brokenImages','documentOverflow','screenshotExists']}))
