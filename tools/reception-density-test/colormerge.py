"""Non-spatial perceptual colour merge for the reception density test (docs/55 section 14).

COLOUR MAPPING ONLY. The function never looks at where a pixel is: it builds a table from each
distinct RGB colour of the image to a representative colour, then substitutes every pixel through
that table. Pixel positions, image size and alpha are untouched, so the geometry is exactly the
input's.

Algorithm (deterministic):
  1. Count every distinct visible RGB colour.
  2. Visit the colours from most to least frequent (ties: ascending RGB).
  3. A colour joins the nearest existing representative whose CIEDE2000 distance is <= THRESHOLD;
     otherwise it becomes a representative itself. Candidates are found through a CIELAB grid
     (cells of THRESHOLD units, the 27 surrounding cells searched), a prefilter only.
  4. Representatives are always colours that already exist in the image (the most frequent member
     of their neighbourhood), never averages, so no new colour is invented; and every pixel moves by
     at most THRESHOLD (CIEDE2000) from its original colour.
Small, distinct accents (amber lamps, cream lights, skin, plant greens, dark outlines) survive
because they are further than THRESHOLD from any more frequent colour.
"""
import math

THRESHOLD = 2.0  # CIEDE2000; set from the sweep recorded in docs/55 section 14


def srgb_to_lab(rgb):
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(float(v)) for v in rgb)
    x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047
    y = (0.2126729 * r + 0.7151522 * g + 0.0721750 * b)
    z = (0.0193339 * r + 0.1191920 * g + 0.9503041 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 216 / 24389 else (24389 / 27 * t + 16) / 116
    fx, fy, fz = f(x), f(y), f(z)
    return (116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz))


def ciede2000(lab1, lab2):
    L1, a1, b1 = lab1
    L2, a2, b2 = lab2
    C1, C2 = math.hypot(a1, b1), math.hypot(a2, b2)
    Cb7 = ((C1 + C2) / 2) ** 7
    G = 0.5 * (1 - math.sqrt(Cb7 / (Cb7 + 25 ** 7)))
    a1p, a2p = (1 + G) * a1, (1 + G) * a2
    C1p, C2p = math.hypot(a1p, b1), math.hypot(a2p, b2)
    h1p = math.degrees(math.atan2(b1, a1p)) % 360 if C1p else 0.0
    h2p = math.degrees(math.atan2(b2, a2p)) % 360 if C2p else 0.0
    dLp, dCp = L2 - L1, C2p - C1p
    if C1p * C2p == 0:
        dhp = 0.0
    elif abs(h2p - h1p) <= 180:
        dhp = h2p - h1p
    else:
        dhp = h2p - h1p - 360 if h2p > h1p else h2p - h1p + 360
    dHp = 2 * math.sqrt(C1p * C2p) * math.sin(math.radians(dhp / 2))
    Lbp, Cbp = (L1 + L2) / 2, (C1p + C2p) / 2
    if C1p * C2p == 0:
        hbp = h1p + h2p
    elif abs(h1p - h2p) <= 180:
        hbp = (h1p + h2p) / 2
    else:
        hbp = (h1p + h2p + 360) / 2 if h1p + h2p < 360 else (h1p + h2p - 360) / 2
    T = (1 - 0.17 * math.cos(math.radians(hbp - 30)) + 0.24 * math.cos(math.radians(2 * hbp))
         + 0.32 * math.cos(math.radians(3 * hbp + 6)) - 0.20 * math.cos(math.radians(4 * hbp - 63)))
    dtheta = 30 * math.exp(-(((hbp - 275) / 25) ** 2))
    Rc = 2 * math.sqrt(Cbp ** 7 / (Cbp ** 7 + 25 ** 7))
    Sl = 1 + 0.015 * (Lbp - 50) ** 2 / math.sqrt(20 + (Lbp - 50) ** 2)
    Sc, Sh = 1 + 0.045 * Cbp, 1 + 0.015 * Cbp * T
    Rt = -math.sin(math.radians(2 * dtheta)) * Rc
    return math.sqrt((dLp / Sl) ** 2 + (dCp / Sc) ** 2 + (dHp / Sh) ** 2 + Rt * (dCp / Sc) * (dHp / Sh))


def build_map(counts, threshold=THRESHOLD):
    """counts: {rgb: pixel count}. Returns ({rgb: representative rgb}, stats)."""
    order = sorted(counts, key=lambda c: (-counts[c], c))
    labs = {c: srgb_to_lab(c) for c in order}
    cell = lambda lab: tuple(int(math.floor(v / threshold)) for v in lab)
    grid, mapping, worst = {}, {}, 0.0
    for c in order:
        lab = labs[c]
        cx, cy, cz = cell(lab)
        best, best_d = None, None
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    for r in grid.get((cx + dx, cy + dy, cz + dz), ()):
                        d = ciede2000(lab, labs[r])
                        if d <= threshold and (best_d is None or d < best_d):
                            best, best_d = r, d
        if best is None:
            mapping[c] = c
            grid.setdefault((cx, cy, cz), []).append(c)
        else:
            mapping[c] = best
            worst = max(worst, best_d)
    reps = sum(1 for c in mapping if mapping[c] == c)
    return mapping, {'input_colors': len(order), 'representatives': reps, 'max_ciede2000': round(worst, 3)}


def apply_map(img, mapping):
    """Per-pixel substitution through the table; the only operation on the image."""
    out = img.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            p = px[x, y]
            q = mapping.get(p[:3], p[:3])
            px[x, y] = q if len(p) == 3 else q + (p[3],)
    return out
