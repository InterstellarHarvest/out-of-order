#!/usr/bin/env python3
"""Normalize the owner/PMO-selected Codex sources for the reception density test (docs/55).

Reads the raw generator output from the local-only source/reception_density/ folder and writes the
review exports at their exact logical sizes, plus a manifest of what was done:

  art/scenes/conference_hall/reception/density_test/reception_scene_314x206.png              (RGB, BOX)
  art/scenes/conference_hall/reception/density_test/reception_scene_02_box_314x206.png       (RGB, A: BOX)
  art/scenes/conference_hall/reception/density_test/reception_scene_02_nearest_314x206.png   (RGB, B: NEAREST)
  art/portraits/receptionist/density_test/reception_background_282x139.png                  (RGB, BOX)
  art/portraits/receptionist/density_test/receptionist_282x139.png                          (RGBA, BOX, alpha 0/255)
  tools/reception-density-test/density_test_manifest.json

Scene 02 A/B (docs/55 section 13, PMO direction 2026-11-07): the same raw
reception_world_scene_density_test_02_raw.png and the same crop box, reduced two ways.
  A = BOX + the 256-colour cleanup below (the method used so far).
  B = NEAREST only, no colour cleanup: crisp pixel-art sources keep their authored pixel clusters.
Steps 2 and 4 below describe the BOX path; the NEAREST path is step 1, then a NEAREST resize
(each logical pixel takes the source pixel at the centre of its footprint), and nothing else.

Algorithm (identical for every run; no randomness, no dithering, no sharpening, no noise):

  1. Crop to the destination aspect ratio, centred, with fractional source coordinates, so nothing
     is stretched. The portrait background and NPC share one crop box and stay registered.
  2. Downsample with Pillow's BOX filter (area average over each logical pixel's footprint). RGBA is
     resampled premultiplied, so transparent pixels do not darken the NPC's edges. BOX has no
     negative lobes, so it adds no ringing or halos.
  3. NPC only: alpha >= 128 becomes 255, anything lower becomes 0; fully transparent pixels get
     RGB (0, 0, 0) so no hidden colour survives under them.
  4. Colour cleanup per asset (never a shared palette): a 256-colour adaptive palette built from
     the visible pixels only with Pillow's MAXCOVERAGE box split (the median-cut family: it splits
     the box with the widest colour range rather than the most pixels), refined by 20 k-means
     passes; every visible pixel is then mapped to its nearest palette colour with dithering off.
     256 is a first cleanup target for generator noise, not a project limit.
     Plain population median cut (Quantize.MEDIANCUT) was tried first and is still measured into
     the manifest as `median_cut_trial`: it merged the small amber indicator lamps of the scene
     and the portrait background into beige/brown (worst pixel error ~117 and ~102), a visible
     loss of meaningful detail. Max coverage + k-means keeps every visible pixel within about 17
     RGB units of the downsample at the same 256 colours, so no deviation above 256 was needed.

Run from anywhere:  python3 tools/reception-density-test/normalize.py [--out DIR]
--out writes the PNGs under DIR (same relative paths) and skips the manifest; QA uses it to prove
the committed exports are reproducible from the local sources.
"""
import argparse
import hashlib
import json
import math
import os
import sys

from PIL import Image, __version__ as PIL_VERSION

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SOURCE_DIR = 'source/reception_density'
MANIFEST = 'tools/reception-density-test/density_test_manifest.json'
COLORS = 256
KMEANS = 20
ALPHA_THRESHOLD = 128

ASSETS = [
    {
        'id': 'scene',
        'source': 'reception_world_scene_v2_raw.png',
        'out': 'art/scenes/conference_hall/reception/density_test/reception_scene_314x206.png',
        'size': (314, 206),
        'mode': 'RGB',
        'display_scale': 4,
    },
    {
        'id': 'scene_02_box',
        'source': 'reception_world_scene_density_test_02_raw.png',
        'out': 'art/scenes/conference_hall/reception/density_test/reception_scene_02_box_314x206.png',
        'size': (314, 206),
        'mode': 'RGB',
        'display_scale': 4,
    },
    {
        'id': 'scene_02_nearest',
        'source': 'reception_world_scene_density_test_02_raw.png',
        'out': 'art/scenes/conference_hall/reception/density_test/reception_scene_02_nearest_314x206.png',
        'size': (314, 206),
        'mode': 'RGB',
        'display_scale': 4,
        'resample': 'NEAREST',
        'colors': None,
    },
    {
        'id': 'portrait_background',
        'source': 'reception_background_v2_raw.png',
        'out': 'art/portraits/receptionist/density_test/reception_background_282x139.png',
        'size': (282, 139),
        'mode': 'RGB',
        'display_scale': 2,
    },
    {
        'id': 'portrait_npc',
        'source': 'receptionist_portrait_v1_raw.png',
        'out': 'art/portraits/receptionist/density_test/receptionist_282x139.png',
        'size': (282, 139),
        'mode': 'RGBA',
        'display_scale': 2,
    },
]


def sha256_file(path):
    with open(path, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()


def centred_aspect_box(src_w, src_h, dst_w, dst_h):
    """Largest centred box of the destination aspect inside the source, in fractional pixels."""
    target = dst_w / dst_h
    if src_w / src_h > target:  # source too wide: trim the sides
        w = src_h * target
        x0 = (src_w - w) / 2
        return (x0, 0.0, x0 + w, float(src_h))
    h = src_w / target  # source too tall: trim top and bottom
    y0 = (src_h - h) / 2
    return (0.0, y0, float(src_w), y0 + h)


def binary_alpha(img):
    r, g, b, a = img.split()
    a = a.point(lambda v: 255 if v >= ALPHA_THRESHOLD else 0)
    black = Image.new('RGB', img.size, (0, 0, 0))
    rgb = Image.composite(Image.merge('RGB', (r, g, b)), black, a)
    rgb.putalpha(a)
    return rgb


def flat(img):
    """All pixel tuples in row order (get_flattened_data on Pillow 12+, getdata before)."""
    return list(img.get_flattened_data() if hasattr(img, 'get_flattened_data') else img.getdata())


def visible_pixels(img):
    if img.mode == 'RGBA':
        return [p[:3] for p in flat(img) if p[3] == 255]
    return flat(img)


def reduce_colors(img, method=Image.Quantize.MAXCOVERAGE, kmeans=KMEANS):
    """COLORS-colour palette from the visible pixels; nearest-colour mapping; no dither."""
    pixels = visible_pixels(img)
    strip = Image.new('RGB', (len(pixels), 1))
    strip.putdata(pixels)
    palette = strip.quantize(colors=COLORS, method=method, kmeans=kmeans, dither=Image.Dither.NONE)
    rgb = img.convert('RGB') if img.mode == 'RGBA' else img
    mapped = rgb.quantize(palette=palette, dither=Image.Dither.NONE).convert('RGB')
    if img.mode == 'RGBA':
        alpha = img.getchannel('A')
        mapped = Image.composite(mapped, Image.new('RGB', img.size, (0, 0, 0)), alpha)
        mapped.putalpha(alpha)
    return mapped


def color_error(before, after):
    """Per visible pixel Euclidean RGB distance between the downsampled and colour-reduced image."""
    a, b = before.load(), after.load()
    w, h = before.size
    d = []
    for y in range(h):
        for x in range(w):
            p, q = a[x, y], b[x, y]
            if before.mode == 'RGBA' and p[3] != 255:
                continue
            d.append(math.sqrt(sum((p[i] - q[i]) ** 2 for i in range(3))))
    d.sort()
    pick = lambda f: round(d[min(len(d) - 1, int(f * len(d)))], 2)
    return {'mean': round(sum(d) / len(d), 3), 'p50': pick(0.5), 'p99': pick(0.99), 'max': round(d[-1], 2)}


def unique_rgb(img, visible_only):
    return len(set(visible_pixels(img))) if visible_only else len(set(p[:3] for p in flat(img.convert('RGBA'))))


def alpha_stats(img):
    hist = img.getchannel('A').histogram()
    values = [v for v in range(256) if hist[v]]
    return {
        'values': values if len(values) <= 8 else '%d distinct values' % len(values),
        'near_opaque_251_254': sum(hist[251:255]),
        'transparent': hist[0],
        'opaque': hist[255],
        'partial': sum(hist[1:255]),
    }


def normalize(asset, crop_boxes):
    src_path = os.path.join(ROOT, SOURCE_DIR, asset['source'])
    raw = Image.open(src_path)
    raw.load()
    dst_w, dst_h = asset['size']
    box = crop_boxes.setdefault(raw.size, centred_aspect_box(raw.size[0], raw.size[1], dst_w, dst_h))
    work = raw.convert(asset['mode'])
    resample = asset.get('resample', 'BOX')
    down = work.resize((dst_w, dst_h), getattr(Image.Resampling, resample), box=box)
    if asset['mode'] == 'RGBA':
        down = binary_alpha(down)
    cleanup = asset.get('colors', COLORS) is not None
    final = reduce_colors(down) if cleanup else down
    trial = reduce_colors(down, Image.Quantize.MEDIANCUT, 0) if cleanup else None
    info = {
        'source': {
            'file': SOURCE_DIR + '/' + asset['source'],
            'sha256': sha256_file(src_path),
            'size': list(raw.size),
            'mode': raw.mode,
            'unique_rgb': len(set(flat(raw.convert('RGB')))),
        },
        'crop_box': [round(v, 4) for v in box],
        'resample': resample,
        'downsampled_unique_rgb': unique_rgb(down, asset['mode'] == 'RGBA'),
    }
    if not cleanup:
        info['color_reduction'] = None  # deliberately none: judged before any palette step (docs/55 section 13)
    else:
        info['color_reduction'] = {
            'method': 'MAXCOVERAGE + %d k-means passes, nearest-colour mapping, no dither' % KMEANS,
            'target_colors': COLORS,
            'rgb_error': color_error(down, final),
            'median_cut_trial': {'method': 'MEDIANCUT, no k-means, no dither (rejected)',
                                 'unique_rgb': unique_rgb(trial, asset['mode'] == 'RGBA'),
                                 'rgb_error': color_error(down, trial)},
        }
    if asset['mode'] == 'RGBA':
        info['source']['alpha'] = alpha_stats(raw)
    return final, info


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', help='write PNGs under this directory instead of the repository; no manifest')
    args = ap.parse_args()
    out_root = os.path.abspath(args.out) if args.out else ROOT

    missing = [a['source'] for a in ASSETS if not os.path.exists(os.path.join(ROOT, SOURCE_DIR, a['source']))]
    if missing:
        sys.exit('missing local sources in %s: %s' % (SOURCE_DIR, ', '.join(missing)))

    crop_boxes = {}
    manifest = {
        'schema': 'cyoa-reception-density-test-v1',
        'status': 'REVIEW ONLY - not production art approval; densities not locked (docs/55)',
        'generator': 'tools/reception-density-test/normalize.py',
        'pillow': PIL_VERSION,
        'method': {
            'crop': 'centred, exact destination aspect, fractional source box; portrait background and NPC share one box',
            'resample': 'per asset: Pillow BOX (area average; RGBA premultiplied) unless the asset records NEAREST',
            'alpha': 'NPC only: alpha >= %d -> 255, else 0; transparent RGB set to 0,0,0' % ALPHA_THRESHOLD,
            'colors': 'per asset %d-colour MAXCOVERAGE palette + %d k-means passes from visible pixels, nearest mapping, Dither.NONE; none where color_reduction is null' % (COLORS, KMEANS),
        },
        'assets': {},
    }
    for asset in ASSETS:
        img, info = normalize(asset, crop_boxes)
        dest = os.path.join(out_root, asset['out'])
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        img.save(dest, format='PNG')
        w, h = asset['size']
        out = {
            'file': asset['out'],
            'sha256': sha256_file(dest),
            'logical': [w, h],
            'mode': img.mode,
            'display_scale': asset['display_scale'],
            'display': [w * asset['display_scale'], h * asset['display_scale']],
            'unique_rgb': unique_rgb(img, img.mode == 'RGBA'),
        }
        if img.mode == 'RGBA':
            out['unique_rgb_including_transparent'] = unique_rgb(img, False)
            out['alpha'] = alpha_stats(img)
        info['output'] = out
        manifest['assets'][asset['id']] = info
        print('%-20s %s %dx%d %s unique_rgb=%d sha256=%s' % (asset['id'], asset['out'], w, h, img.mode, out['unique_rgb'], out['sha256']))

    if not args.out:
        with open(os.path.join(ROOT, MANIFEST), 'w') as f:
            json.dump(manifest, f, indent=1)
            f.write('\n')
        print('manifest', MANIFEST)


if __name__ == '__main__':
    main()
