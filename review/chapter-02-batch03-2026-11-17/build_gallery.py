"""Offline Batch3 gallery; reuse the established Batch2 interface and scale controls."""
from pathlib import Path
import json
from html import escape

ROOT = Path(__file__).resolve().parent
manifest = json.loads((ROOT / 'manifest.json').read_text())
descriptions = {
    'A': 'An orderly archive in the tower office: early signatures, later approval stamps, Specimen 001 records and automatic paper equipment.',
    'B': 'A greenhouse-spanning natural bloom, physiological sensors, thick cables, administrative printers and the district seal. No humanlike face.',
    'C': 'The connected translator rack: perforated tape, approval reader and output printer in their normal processing state. Roots still conceal the later service door.',
    'D': 'Opposing padded mechanical arms, a shallow planting bed on a lift, a separate disposal hatch and service grille.',
    'E': 'A roller sorting conveyor leading to a compactor, with a high inspection hatch beside it.',
    'F': 'The Groundskeeper hopper tips soil into a prepared pit beside an accessible irrigation trench; packing arms remain poised.',
    'G': 'A sloping disposal trough opens into a low irrigation service passage with utility pipes, a gauge and limited roots.'
}
comparisons = [
    ('tower-archive-continuity', 'Approved Control Tower → new Authorization Archive'),
    ('sensor-flower-translator-continuity', 'Approved Sensor Gallery → new Central Flower → new Translator Machine'),
    ('groundskeeper-machinery-continuity', 'Approved Groundskeeper → new Planting Machine → new Planting Hopper'),
    ('distinct-machinery-functions', 'Shallow planting bed → sorting conveyor → bulk soil hopper'),
    ('planter-chute-service-continuity', 'Planter disposal hatch → waste chute → approved service materials'),
    ('translator-state-correction', 'Superseded early door reveal → current root cover before cable recoil')
]
def figure(stem, title, klass=''):
    return f'<figure class="{klass}"><div class="scroll"><img class="pixel scaled" data-stem="{stem}" src="previews/{stem}-native.png" alt="{escape(title)}"></div><figcaption>{escape(title)}</figcaption></figure>'
cards = []
for a in manifest['assets']:
    k = a['id']; stem = Path(a['candidatePath']).stem
    title = a['registryKey'].split('/')[-1].replace('_', ' ').title()
    prompt = f'prompts/{k}-v01.txt' if k != 'C' else 'prompts/C-v02-door-concealment.txt'
    extra = ' · <a href="prompts/C-v01.txt">Initial C prompt</a>' if k == 'C' else ''
    cards.append(f'''<article class="asset" id="asset-{k}"><header><div class="eyebrow">{k} / RGB 314×206 / generated, unselected</div><h3>{title}</h3><div class="id"><code>{a['registryKey']}</code></div><p>{descriptions[k]}</p></header>{figure(stem, title)}<div class="asset-links"><a href="{a['candidatePath']}">Native game candidate</a><a href="previews/{stem}-4x.png">Exact 4× preview</a><a href="{a['source']}">Detailed original source</a><a href="{prompt}">Exact prompt</a>{extra}</div></article>''')
docs = [
    ('README.md', 'Batch 3 handoff', 'Source pins, file contract and reproducible exports'),
    ('BATCH2_APPROVAL.md', 'Batch 2 final approval', 'Seven exact hashes registered and published'),
    ('ARTWORK_CONTINUITY_REVIEW.md', 'Visual review', 'Observed continuity and native-size limitations'),
    ('STORY_CONTINUITY.md', 'Story constraints', 'First occurrences and separate later outcomes'),
    ('VISUAL_DIRECTION.md', 'Visual direction', 'Approved style references and mechanical identity'),
    ('qa.json', 'Pixel QA', 'Dimensions, opacity, palette, exact 4× and preservation'),
    ('manifest.json', 'Candidate manifest', 'Seven generated, unselected scene mappings and hashes'),
    ('generation-records.json', 'Generation provenance', 'Original prompts, reference roles and source versions'),
    ('SOURCE_SHA256SUMS.txt', 'Source hashes', 'Raw renders, prompts, references and canonical snapshots'),
    ('REMAINING_QUEUE.md', 'Remaining Chapter 2 queue', '29 records, including nested and item variants'),
    ('build_review.py', 'Reproducible pixel processing', 'Deterministic normalization and local sign masks'),
    ('STORYBOARD_SYNC.md', 'Publication receipt', 'Generated statuses and Pages verification')
]
doc_html = ''.join(f'<a class="doc" href="{p}"><strong>{title}</strong><span>{description}</span></a>' for p,title,description in docs)
html = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>Biology Park · Batch 3 · Review</title><link rel="stylesheet" href="gallery.css"></head><body>
<header><div class="eyebrow">The Acceptable Error / Chapter 2 / Batch 3 / November 17, 2026</div><h1>Biology Park<br><span style="color:#b9c9b1">Administrative and botanical machinery.</span></h1><p><span class="status">Seven generated candidates · selection pending</span></p><p class="muted">Batch 2 has final owner approval and is registered in the public selected-art system. These seven new Batch 3 images remain generated and unselected. All previously approved pixels are preserved.</p><nav aria-label="Review sections"><a href="#scenes">Seven scenes</a><a href="#continuity">Continuity comparisons</a><a href="#evidence">QA and sources</a><a href="#history">Preserved versions and sign masks</a></nav></header>
<div class="toolbar"><div class="toolbar-inner"><div class="button-group" role="group" aria-label="Preview scale"><span class="group-label">View</span><button type="button" data-scale="1" aria-pressed="true">Native 314×206</button><button type="button" data-scale="4" aria-pressed="false">Exact 4×</button></div><span class="muted" style="font-size:12px">Nearest-neighbor PNGs · full-size images scroll · no fractional scaling</span></div></div><main>
<section id="scenes"><div class="eyebrow">A–G / Actual generated artwork</div><h2>Seven machinery environments</h2><p class="note">Detailed sources are retained at 1548×1016. Each native candidate is opaque RGB 314×206 using the established 64-color palette. The 1256×824 files are exact 4× review previews. Gameplay PMO should use the native candidate and nearest-neighbor rendering with smoothing disabled.</p>'''
html += figure('seven-scenes', 'Authorization Archive · Central Flower · Translator Machine · Planting Machine · Sorting Conveyor · Planting Hopper · Waste Chute')
html += ''.join(cards)
html += '''</section><section id="continuity"><div class="eyebrow">Same Exposition / shared engineering</div><h2>Compare against the approved artwork</h2><p>Approved Batch 1 and Batch 2 references are exact copied PNGs, checked against their recorded hashes. New machinery scenes retain distinct narrative functions. The final comparison documents a correction confined to an unselected Batch 3 generation.</p>'''
html += ''.join(figure(s,t,'comparison') for s,t in comparisons)
html += '''</section><section id="evidence"><div class="eyebrow">Evidence / provenance / handoff</div><h2>Review notes and technical checks</h2><figure><div class="scroll"><img class="pixel" src="previews/palette.png" alt="Existing approved 64-color palette"></div><figcaption>Existing palette, no dithering. Fine foliage and grating remain visually dense in places; pixel checks do not establish creative approval.</figcaption></figure><div class="docs">'''
html += doc_html
html += '''</div></section><section id="history"><div class="eyebrow">Preserved sources / localized polish</div><h2>Complete version history</h2><details><summary>Translator door-state correction</summary><p>The initial generation exposed a service door before the cable-recoil event. A built-in image edit covers that background door with roots and vines. Both raw generations and prompts are preserved. The unfinished lower duct remains visible.</p><p><a href="generation-source/C-translator-machine-v01.png">Superseded original</a> · <a href="generation-source/C-translator-machine-v02.png">Current original</a> · <a href="prompts/C-v02-door-concealment.txt">Targeted edit prompt</a></p></details><details><summary>Planting Machine and Sorting Conveyor native signage polish</summary><p>Unreadable generated microlettering is replaced by deliberate administrative bars and a small status stamp, with sign pictograms preserved. The change masks prove zero modifications outside the recorded notice regions.</p>'''
for k in ['D','E']:
    html += figure(k+'-signage-before-after', k+' native notice cleanup: preserved pre-polish export → final candidate')
    html += f'<p><a href="masks/{k}-signage-allowed.png">{k} allowed region</a> · <a href="masks/{k}-signage-changed.png">{k} changed pixels</a></p>'
html += '''<p><a href="processing-history/normalization-v01/manifest.json">Preserved pre-polish candidate manifest</a></p></details></section></main><footer>Seven new generated candidates · no game integration, gameplay or authored story changes · Batch 2 final approval preserved.</footer>
<script>'use strict';function setScale(scale){document.querySelectorAll('[data-scale]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.scale)===scale)));document.querySelectorAll('.scaled').forEach(img=>{img.removeAttribute('width');img.removeAttribute('height');img.src='previews/'+img.dataset.stem+(scale===4?'-4x.png':'-native.png');});}document.querySelectorAll('[data-scale]').forEach(b=>b.addEventListener('click',()=>setScale(Number(b.dataset.scale))));</script></body></html>'''
(ROOT / 'index.html').write_text(html)
print('Batch3 offline gallery built using established Batch2 controls.')
