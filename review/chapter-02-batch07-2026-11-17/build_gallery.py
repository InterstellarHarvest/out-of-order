"""Offline Chapter2 Batch7 review: native/exact4x, groups, alpha and sources."""
from pathlib import Path
from html import escape
import json
R=Path(__file__).resolve().parent
assets=json.loads((R/'manifest.json').read_text())['assets']
records=json.loads((R/'generation-records.json').read_text())['assets']
locations=['Public Exit','Maintenance Exit','Agricultural Customs']
def fig(stem,title,alpha=False):
 return f'<figure><div class="scroll{" alpha" if alpha else ""}"><img class="pixel scaled" data-stem="{stem}" src="previews/{stem}-native.png" alt="{escape(title)}"></div><figcaption>{escape(title)}</figcaption></figure>'
cards=[]
for i,a in enumerate(assets):
 k=a['id'];stem=Path(a['candidatePath']).stem;variant=['open Focus A','inventory slot','item inspector'][i%3];title=locations[i//3]+' — '+variant;w,h=a['dimensions']
 cards.append(f'<article class="asset" id="asset-{k}" data-width="{w}" data-height="{h}"><header><div class="eyebrow">{k} / {a["mode"]} {w}×{h} / generated, unselected</div><h3>{title}</h3><code>{a["registryKey"]}</code></header>'+fig(stem,title,a['mode']=='RGBA')+f'<div class="asset-links"><a href="{a["candidatePath"]}">Native PNG</a><a href="previews/{stem}-4x.png">Exact4× PNG</a><a href="{a["source"]}">Detailed generation source</a><a href="{records[k]["prompt"]}">Exact prompt</a></div></article>')
html='''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Biology Park · Batch7 · Treatment kits</title><link rel="stylesheet" href="gallery.css"></head><body><header><div class="eyebrow">The Acceptable Error / Chapter2 / Batch7 / November17,2026</div><h1>Treatment kits<br>and antidotes.</h1><p class="status">Nine generated candidates · Art Director review pending</p><p>Batch6 is owner-approved and registered. All100 selected public PNG hashes match. Batch7 remains generated and unselected, with null production paths.</p><nav><a href="#items">Nine candidates</a><a href="#groups">Location comparisons</a><a href="#alpha">Transparency</a><a href="#evidence">QA and sources</a></nav></header><div class="toolbar"><div class="toolbar-inner"><div class="button-group"><span class="group-label">View</span><button data-scale="1" aria-pressed="true">Native pixels</button><button data-scale="4" aria-pressed="false">Exact4×</button></div><div class="button-group"><span class="group-label">Icon backdrop</span><button data-backdrop="checker" aria-pressed="true">Checker</button><button data-backdrop="dark" aria-pressed="false">Dark</button><button data-backdrop="light" aria-pressed="false">Light</button></div></div></div><main><section id="items"><h2>Nine independent assets</h2><p>Current Focus A:564×278 opaque RGB. Slot:96×96 transparent RGBA. Inspector:565×451 opaque RGB. Future565×451 Scene Pickup is separate. Detailed sources are preserved; game-native files use the existing64-color palette and exact nearest-neighbor4× previews.</p>'''
html+=''.join(cards)+'</section><section id="groups"><h2>Three locations, one medical-device family</h2>'
for stem,name in zip(['public','maintenance','customs'],locations):
 html+=fig(stem+'-group',name+' / Focus A + slot + inspector')+fig(stem+'-closed-open',name+' / approved closed scene → new open Focus A')
html+=fig('injector-family-inspectors','Shared injector construction across three inspectors')+fig('injector-family-slots','Shared injector construction across three slots')
html+='</section><section id="alpha"><h2>Transparency inspection</h2><p>True generated alpha, threshold128 and nearest-neighbor fit. Final alpha is binary0/255 with transparent margins and hidden RGB zero. Glass remains opaque stylized artwork within the transparent object silhouette.</p>'
for k in 'BEH':html+=fig(k+'-alpha-inspection',k+' / checker, dark, light')+fig(k+'-alpha-mask',k+' / binary alpha mask')
html+='</section><section id="evidence"><h2>Evidence and handoff</h2><div class="docs">'
docs={'README.md':'Review handoff','BATCH6_APPROVAL.md':'Batch6 approval and100 hashes','FOCUS_A_DIMENSION_CONTRACT.md':'Resolved native dimensions','PMO_HANDOFF.md':'Seed description correction','CANDIDATE_HASHES.md':'Nine paths and SHA-256 hashes','ARTWORK_CONTINUITY_REVIEW.md':'Visual findings and owner feedback','STORY_CONTINUITY.md':'Narrative boundaries','VISUAL_DIRECTION.md':'Established Chapter2 style','qa.json':'Pixel, palette and alpha QA','gallery-verification.json':'Browser QA','manifest.json':'Nine-candidate manifest','generation-records.json':'Originals and exact prompts','SOURCE_SHA256SUMS.txt':'Source checksums','PNG_SHA256SUMS.txt':'PNG checksums','STORYBOARD_SYNC.md':'Generated-status publication','REMAINING_QUEUE.md':'Five remaining death-screen records','build_review.py':'Reproducible normalization'}
for p,t in docs.items():html+=f'<a class="doc" href="{p}"><strong>{t}</strong><span>{p}</span></a>'
html+='''</div><p>Every generation and rejected variation remains preserved. Technical QA does not constitute owner approval. No gameplay integration. Batch8 has not started.</p></section></main><footer>Nine generated candidates · Art Director review pending</footer><script>
'use strict';
function setScale(s){document.querySelectorAll('[data-scale]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.scale)===s)));document.querySelectorAll('.scaled').forEach(i=>i.src='previews/'+i.dataset.stem+(s===4?'-4x.png':'-native.png'));}
document.querySelectorAll('[data-scale]').forEach(b=>b.addEventListener('click',()=>setScale(Number(b.dataset.scale))));
document.querySelectorAll('[data-backdrop]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('.alpha').forEach(x=>{x.classList.remove('dark','light');if(b.dataset.backdrop!=='checker')x.classList.add(b.dataset.backdrop)});document.querySelectorAll('[data-backdrop]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))}));
</script></body></html>'''
(R/'index.html').write_text(html)
print('Nine cards, three location groups, three closed/open comparisons, family comparisons, alpha and provenance links.')
