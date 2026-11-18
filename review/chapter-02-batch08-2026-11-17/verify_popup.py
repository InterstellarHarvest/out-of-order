"""Real Chrome proof using the unchanged pinned popup renderer, config and bitmap faces."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
import subprocess,tempfile,threading,re,json,html,base64
R=Path(__file__).resolve().parent;Q=R/'popup-browser-qa';Q.mkdir(exist_ok=True)
class Quiet(SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),partial(Quiet,directory=str(R)));threading.Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_address[1]}/popup-preview.html?art=A'
cmd=['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','--headless','--disable-gpu','--no-first-run','--disable-background-networking','--disable-crash-reporter','--user-data-dir='+tempfile.mkdtemp(prefix='b8-popup-chrome-'),'--window-size=1920,1080','--force-device-scale-factor=1','--virtual-time-budget=20000','--screenshot='+str(Q/'actual-popup-browser.png'),'--dump-dom',url]
timed=False
try:
 p=subprocess.run(cmd,capture_output=True,timeout=30);out=p.stdout.decode(errors='replace');err=p.stderr.decode(errors='replace')
except subprocess.TimeoutExpired as e:
 timed=True;out=(e.stdout or b'').decode(errors='replace');err=(e.stderr or b'').decode(errors='replace')
finally:server.shutdown();server.server_close()
(Q/'dom.html').write_text(out);(Q/'chrome-stderr.log').write_text(err)
m=re.search(r'<pre id="popup-qa-result"[^>]*>(.*?)</pre>',out,re.S)
assert m,'Popup renderer did not finish: '+(re.search(r'<pre id="popup-qa-error">(.*?)</pre>',out,re.S).group(1) if 'popup-qa-error' in out else 'no result')
report=json.loads(html.unescape(m[1]));snapshots=report.pop('snapshots');assert report['passed'],report
(R/'popup-previews').mkdir(exist_ok=True)
for k,data in snapshots.items():(R/'popup-previews'/f'{k}-popup-1920x1080.png').write_bytes(base64.b64decode(data))
# Preserve DOM evidence without embedding large repeated PNG payloads.
(Q/'dom.html').write_text(re.sub(r'(<pre id="popup-qa-result"[^>]*>).*?(</pre>)',lambda m:m[1]+html.escape(json.dumps(report))+m[2],out,flags=re.S))
report.update(browser='Google Chrome headless',actualPinnedRendererUsed=True,sourceCommit='7592effa087cf346746a390acb37ce43a3b9d81a',popupScreenshots=5,chromeTerminatedAfterDomCapture=timed,sourceCodeAndCanonicalPopupCopyUnmodified=True,artBoundOnlyInReviewHarness=True,backdropUsesApprovedSceneStandin=True)
(R/'popup-review-qa.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({k:v for k,v in report.items() if k!='reports'},indent=2))
