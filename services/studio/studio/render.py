"""Procedural product renders.

Draws studio-style jewellery shots (dark velvet "hero" + clean ivory "catalogue")
so the store and the video pipeline have consistent imagery before real
photography or supplier images arrive. Every draw_* function paints onto a
transparent RGBA layer, which lets the video pipeline animate pieces
individually (layering demos, unboxing reveals).
"""
from __future__ import annotations

import math
import random
import zlib
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SS = 2  # supersampling factor for anti-aliasing

METALS = {
    # dark, mid, light, specular
    "gold": ((92, 64, 18), (196, 150, 58), (247, 222, 150), (255, 248, 225)),
    "silver": ((86, 90, 98), (176, 182, 190), (232, 236, 242), (255, 255, 255)),
    "rose": ((110, 58, 48), (204, 134, 112), (246, 200, 180), (255, 240, 232)),
}
STONES = {
    "clear": ((150, 170, 200), (235, 242, 255), (255, 255, 255)),
    "ruby": ((90, 4, 16), (200, 16, 46), (255, 120, 140)),
    "pearl": ((196, 186, 172), (246, 240, 230), (255, 255, 255)),
    "none": None,
}


def _lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


def radial_bg(w: int, h: int, inner, outer, cx=0.5, cy=0.42, radius=0.85) -> Image.Image:
    y, x = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((x / w - cx) * (w / h)) ** 2 + (y / h - cy) ** 2) / radius
    d = np.clip(d, 0, 1)[..., None] ** 1.4
    inner = np.array(inner, np.float32)
    outer = np.array(outer, np.float32)
    img = inner * (1 - d) + outer * d
    # subtle velvet grain
    rng = np.random.default_rng(7)
    img += rng.normal(0, 2.2, img.shape).astype(np.float32)
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


_sprites: dict = {}


def sparkle_sprite(size: float) -> Image.Image:
    """Four-point starburst with tapered arms and a soft core, cached per size.

    Arms are drawn as thin tapered polygons (not stroked lines) so the star
    reads as a point of light rather than a slash across the stone.
    """
    size = max(8, int(size) // 4 * 4)
    if size in _sprites:
        return _sprites[size]
    s = size * 2
    c = s / 2
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for k, ln in enumerate((1.0, 0.7, 1.0, 0.7)):
        a = -math.pi / 2 + k * math.pi / 2
        w0 = size * 0.05
        px, py = -math.sin(a) * w0, math.cos(a) * w0
        tip = (c + math.cos(a) * size * ln, c + math.sin(a) * size * ln)
        d.polygon([(c + px, c + py), tip, (c - px, c - py)], fill=(255, 251, 238, 235))
    for k in range(4):  # short diagonal glints
        a = math.pi / 4 + k * math.pi / 2
        w0 = size * 0.025
        px, py = -math.sin(a) * w0, math.cos(a) * w0
        tip = (c + math.cos(a) * size * 0.32, c + math.sin(a) * size * 0.32)
        d.polygon([(c + px, c + py), tip, (c - px, c - py)], fill=(255, 240, 205, 170))
    r = size * 0.11
    d.ellipse([c - r, c - r, c + r, c + r], fill=(255, 255, 255, 255))
    glow = im.filter(ImageFilter.GaussianBlur(max(1.5, size * 0.09)))
    halo = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    ImageDraw.Draw(halo).ellipse([c - size * 0.35, c - size * 0.35, c + size * 0.35, c + size * 0.35], fill=(255, 236, 190, 70))
    halo = halo.filter(ImageFilter.GaussianBlur(size * 0.18))
    out = Image.alpha_composite(Image.alpha_composite(halo, glow), im)
    _sprites[size] = out
    return out


def sparkle(draw_layer: Image.Image, x: float, y: float, size: float, alpha: int = 255, angle: float = 0.0):
    """Stamp a starburst at (x, y) — the 'catching the light' moment."""
    sp = sparkle_sprite(size)
    if angle:
        sp = sp.rotate(math.degrees(angle), resample=Image.BICUBIC)
    if alpha < 255:
        sp = sp.copy()
        sp.putalpha(sp.split()[3].point(lambda v: v * alpha // 255))
    draw_layer.alpha_composite(sp, (int(x - sp.width / 2), int(y - sp.height / 2)))


def _shade_ellipse(d: ImageDraw.ImageDraw, box, metal, width, light=(-0.6, -0.8)):
    dark, mid, lite, spec = METALS[metal]
    x0, y0, x1, y1 = box
    d.ellipse(box, outline=dark, width=width + 2)
    d.ellipse(box, outline=mid, width=width)
    # highlight arc facing the light
    ang = math.degrees(math.atan2(light[1], light[0]))
    d.arc(box, ang - 50, ang + 50, fill=lite, width=max(1, width // 2))
    d.arc(box, ang - 15, ang + 15, fill=spec, width=max(1, width // 3))


def gem(layer: Image.Image, cx, cy, rx, ry, stone: str, shape: str = "round", seed: int = 0):
    """Faceted stone: polygon fan with per-facet brightness + table highlight."""
    pal = STONES.get(stone)
    if not pal:
        return
    d = ImageDraw.Draw(layer)
    rnd = random.Random(seed)
    if stone == "pearl":
        for i in range(24, 0, -1):
            t = i / 24
            c = _lerp(pal[2], pal[0], t ** 1.6)
            off = (1 - t) * rx * 0.25
            d.ellipse([cx - rx * t - off, cy - ry * t - off, cx + rx * t - off, cy + ry * t - off], fill=c + (255,))
        d.ellipse([cx - rx * 0.45, cy - ry * 0.5, cx - rx * 0.1, cy - ry * 0.2], fill=(255, 255, 255, 200))
        return
    n = 16
    pts = []
    for i in range(n):
        a = -math.pi / 2 + i * 2 * math.pi / n
        r = 1.0
        if shape == "tear":
            # pointed top, round bottom
            r = 1.0 - 0.45 * max(0.0, -math.sin(a)) ** 3
            yy = math.sin(a) * (1.25 if math.sin(a) < 0 else 1.0)
            pts.append((cx + math.cos(a) * rx * r, cy + yy * ry))
            continue
        if shape == "heart":
            t = a + math.pi / 2
            hx = 16 * math.sin(t) ** 3
            hy = -(13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t))
            pts.append((cx + hx / 17 * rx, cy + hy / 17 * ry))
            continue
        pts.append((cx + math.cos(a) * rx, cy + math.sin(a) * ry))
    dark, mid, lite = pal
    d.polygon(pts, fill=dark + (255,))
    for i in range(n):
        p0, p1 = pts[i], pts[(i + 1) % n]
        t = rnd.random()
        c = _lerp(dark, lite, t ** 0.7) if i % 2 else _lerp(mid, lite, t)
        d.polygon([(cx, cy), p0, p1], fill=c + (255,))
    # table facet
    inner = [(cx + (x - cx) * 0.45, cy + (y - cy) * 0.45) for x, y in pts]
    d.polygon(inner, fill=_lerp(mid, lite, 0.55) + (255,))
    d.polygon(inner[: n // 3] + [(cx, cy)], fill=lite + (230,))
    d.line(pts + [pts[0]], fill=(255, 255, 255, 160), width=max(1, int(rx * 0.05)))


def chain(layer: Image.Image, path: list[tuple[float, float]], metal: str, style: str, link: float):
    d = ImageDraw.Draw(layer)
    # resample path to equal spacing
    seg = []
    for (x0, y0), (x1, y1) in zip(path, path[1:]):
        seg.append(math.hypot(x1 - x0, y1 - y0))
    total = sum(seg)
    step = link * (2.2 if style == "paperclip" else 1.05)
    n = int(total / step)
    pts = []
    for k in range(n + 1):
        dist, i = k * step, 0
        while i < len(seg) - 1 and dist > seg[i]:
            dist -= seg[i]
            i += 1
        t = dist / seg[i] if seg[i] else 0
        (x0, y0), (x1, y1) = path[i], path[i + 1]
        ang = math.atan2(y1 - y0, x1 - x0)
        pts.append((x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, ang))
    for k, (x, y, ang) in enumerate(pts):
        if style == "paperclip":
            L, W = link * 2.1, link * 0.85
        elif style == "figaro":
            L, W = (link * 2.0 if k % 4 == 3 else link * 1.1), link * 0.8
        elif style == "satellite" and k % 9 == 4:
            r = link * 0.9
            sh = METALS[metal]
            d.ellipse([x - r, y - r, x + r, y + r], fill=sh[1] + (255,), outline=sh[0])
            d.ellipse([x - r * 0.5, y - r * 0.7, x, y - r * 0.2], fill=sh[3] + (255,))
            continue
        else:
            L, W = link * 1.15, link * (0.75 if k % 2 else 0.45)
        # draw an oriented link as a polygonised ellipse
        ca, sa = math.cos(ang), math.sin(ang)
        poly = [(x + ca * math.cos(t) * L / 2 - sa * math.sin(t) * W / 2,
                 y + sa * math.cos(t) * L / 2 + ca * math.sin(t) * W / 2) for t in np.linspace(0, 2 * math.pi, 20)]
        dark, mid, lite, spec = METALS[metal]
        wdt = max(2, int(link * 0.28))
        d.line(poly + [poly[0]], fill=dark + (255,), width=wdt + 2)
        d.line(poly + [poly[0]], fill=mid + (255,), width=wdt)
        d.line(poly[2:7], fill=lite + (255,), width=max(1, wdt // 2))
        if k % 3 == 0:
            d.line(poly[3:5], fill=spec + (255,), width=max(1, wdt // 2))


def catenary(cx, top_y, half_w, depth, n=80, start=0.0, end=1.0):
    pts = []
    for i in range(n + 1):
        t = start + (end - start) * i / n
        x = cx - half_w + 2 * half_w * t
        u = (t - 0.5) * 2
        y = top_y + depth * (1 - u * u) ** 0.9
        pts.append((x, y))
    return pts


@dataclass
class Spec:
    kind: str  # necklace|earrings|ring|bracelet|set
    metal: str
    stone: str
    variant: str


def spec_for(p: dict) -> Spec:
    slug, cat = p["slug"], p["category"]
    variant = {
        "solene-teardrop-pendant": "tear", "milano-paperclip-chain": "paperclip",
        "riviera-tennis-necklace": "tennis", "ember-ruby-heart-necklace": "heart",
        "luna-huggie-hoops": "huggie", "aurora-crystal-drops": "drops", "petal-pearl-studs": "studs",
        "eternity-band": "eternity", "halo-solitaire-ring": "halo", "rosso-signet-ring": "signet",
        "celeste-tennis-bracelet": "tennis", "torque-cuff": "cuff", "figaro-chain-bracelet": "figaro",
    }.get(slug, "default")
    kind = {"necklaces": "necklace", "earrings": "earrings", "rings": "ring",
            "bracelets": "bracelet", "gift-sets": "set"}[cat]
    return Spec(kind, p.get("metal", "gold"), p.get("stone", "clear"), variant)


def draw_necklace(layer, W, H, sp: Spec, scale=1.0, cy=0.30, seed=0):
    cx, top = W / 2, H * cy
    hw, depth = W * 0.36 * scale, H * 0.34 * scale
    link = W * 0.012 * scale
    path = catenary(cx, top, hw, depth)
    if sp.variant == "tennis":
        d = ImageDraw.Draw(layer)
        sh = METALS[sp.metal]
        for i, (x, y) in enumerate(path[::2]):
            r = link * 1.25
            d.ellipse([x - r * 1.2, y - r * 1.2, x + r * 1.2, y + r * 1.2], fill=sh[1] + (255,), outline=sh[0] + (255,))
            gem(layer, x, y, r, r, sp.stone, seed=seed + i)
    else:
        style = {"paperclip": "paperclip", "heart": "satellite"}.get(sp.variant, "cable")
        chain(layer, path, sp.metal, style, link * (1.6 if style == "paperclip" else 1.0))
    bx, by = path[len(path) // 2]
    if sp.variant in ("tear", "heart", "default") and sp.stone != "none":
        d = ImageDraw.Draw(layer)
        sh = METALS[sp.metal]
        bail = link * 1.4
        d.ellipse([bx - bail, by - bail * 0.4, bx + bail, by + bail * 1.8], outline=sh[1] + (255,), width=int(link * 0.5))
        r = W * 0.055 * scale
        shape = "heart" if sp.variant == "heart" else "tear"
        # metal setting
        gem(layer, bx, by + bail * 1.6 + r * 1.2, r * 1.12, r * 1.22, "none")
        d.ellipse([bx - r * 1.1, by + bail * 1.6 + r * 0.05, bx + r * 1.1, by + bail * 1.6 + r * 2.45],
                  outline=sh[1] + (255,), width=int(link * 0.6)) if shape == "tear" else None
        gem(layer, bx, by + bail * 1.6 + r * 1.2, r, r * (1.0 if shape == "heart" else 1.1), sp.stone, shape, seed)
        return [(bx - r * 0.3, by + bail * 1.6 + r * 0.7, r * 2.2)]
    return [(path[20][0], path[20][1], link * 6), (path[60][0], path[60][1], link * 5)]


def draw_ring(layer, W, H, sp: Spec, cx=None, cy=None, scale=1.0, seed=0):
    cx = W / 2 if cx is None else cx
    cy = H * 0.56 if cy is None else cy
    R = W * 0.34 * scale
    sh = METALS[sp.metal]
    d = ImageDraw.Draw(layer)
    band = R * (0.16 if sp.variant == "signet" else 0.11)
    # band in perspective: back half darker, front half lit
    for i in range(int(band)):
        t = i / band
        c = _lerp(sh[0], sh[2], 0.25 + 0.75 * math.sin(t * math.pi))
        box = [cx - R + i * 0.15, cy - R * 0.38 + i * 0.6, cx + R - i * 0.15, cy + R * 0.38 + i * 0.6]
        d.ellipse(box, outline=c + (255,), width=2)
    d.arc([cx - R, cy - R * 0.38, cx + R, cy + R * 0.38], 200, 300, fill=sh[3] + (255,), width=int(band * 0.25))
    sparkles = []
    if sp.variant == "eternity":
        for i in range(19):
            a = math.pi * (0.05 + 0.9 * i / 18)
            x, y = cx + math.cos(a) * R * 0.98, cy + math.sin(a) * R * 0.38 + band * 0.5
            gem(layer, x, y, band * 0.55, band * 0.45, sp.stone, seed=seed + i)
        sparkles.append((cx + R * 0.3, cy + R * 0.35, R * 0.3))
    top_y = cy - R * 0.38
    if sp.variant in ("halo", "signet", "default"):
        if sp.variant == "signet":
            d.ellipse([cx - R * 0.42, top_y - R * 0.34, cx + R * 0.42, top_y + R * 0.18], fill=sh[1] + (255,), outline=sh[0] + (255,), width=3)
            d.ellipse([cx - R * 0.36, top_y - R * 0.3, cx + R * 0.36, top_y + R * 0.12], fill=sh[2] + (255,))
            gem(layer, cx, top_y - R * 0.09, R * 0.2, R * 0.14, sp.stone, seed=seed)
        else:
            for i in range(22):
                a = 2 * math.pi * i / 22
                gem(layer, cx + math.cos(a) * R * 0.36, top_y - R * 0.12 + math.sin(a) * R * 0.26, R * 0.05, R * 0.05, sp.stone, seed=seed + i)
            gem(layer, cx, top_y - R * 0.12, R * 0.27, R * 0.21, sp.stone, seed=seed + 99)
        sparkles.append((cx - R * 0.08, top_y - R * 0.2, R * 0.55))
    return sparkles


def draw_earrings(layer, W, H, sp: Spec, seed=0):
    sh = METALS[sp.metal]
    d = ImageDraw.Draw(layer)
    sparkles = []
    for side in (-1, 1):
        cx, cy = W / 2 + side * W * 0.2, H * 0.42
        if sp.variant == "huggie":
            R = W * 0.13
            for i in range(14):
                box = [cx - R + i, cy - R + i, cx + R - i, cy + R - i]
                d.ellipse(box, outline=_lerp(sh[0], sh[2], math.sin(i / 14 * math.pi)) + (255,), width=2)
            for i in range(11):
                a = math.pi * (0.15 + 0.7 * i / 10)
                gem(layer, cx + math.cos(a) * (R - 7), cy + math.sin(a) * (R - 7), W * 0.014, W * 0.014, sp.stone, seed=seed + i)
            sparkles.append((cx + side * R * 0.3, cy + R * 0.8, R * 0.7))
        elif sp.variant == "drops":
            d.ellipse([cx - 12, cy - H * 0.16 - 12, cx + 12, cy - H * 0.16 + 12], fill=sh[1] + (255,))
            for i, r in enumerate((W * 0.025, W * 0.035, W * 0.05)):
                yy = cy - H * 0.13 + i * H * 0.1
                d.line([(cx, yy - H * 0.07), (cx, yy)], fill=sh[1] + (255,), width=4)
                gem(layer, cx, yy + r, r, r * 1.2, sp.stone, "tear", seed + i)
            sparkles.append((cx, cy + H * 0.12, W * 0.12))
        else:  # studs
            R = W * 0.07
            d.ellipse([cx - R * 1.3, cy - R * 1.3, cx + R * 1.3, cy + R * 1.3], outline=sh[1] + (255,), width=int(R * 0.2))
            gem(layer, cx, cy, R, R, sp.stone, seed=seed)
            sparkles.append((cx - R * 0.4, cy - R * 0.4, R * 1.4))
    return sparkles


def draw_bracelet(layer, W, H, sp: Spec, seed=0):
    cx, cy = W / 2, H * 0.52
    Rx, Ry = W * 0.34, H * 0.16
    sh = METALS[sp.metal]
    d = ImageDraw.Draw(layer)
    if sp.variant == "cuff":
        th = H * 0.05
        for i in range(int(th)):
            t = i / th
            c = _lerp(sh[0], sh[3], math.sin(t * math.pi) ** 2)
            d.arc([cx - Rx, cy - Ry + i, cx + Rx, cy + Ry + i], 20, 340, fill=c + (255,), width=2)
        return [(cx - Rx * 0.5, cy + Ry * 0.8, W * 0.12)]
    path = [(cx + math.cos(a) * Rx, cy + math.sin(a) * Ry) for a in np.linspace(0.05, 2 * math.pi - 0.05, 160)]
    if sp.variant == "tennis":
        for i, (x, y) in enumerate(path[::3]):
            r = W * 0.017
            d.rounded_rectangle([x - r * 1.25, y - r * 1.25, x + r * 1.25, y + r * 1.25], radius=r * 0.4, fill=sh[1] + (255,), outline=sh[0] + (255,))
            gem(layer, x, y, r, r, sp.stone, seed=seed + i)
        return [(cx, cy + Ry, W * 0.13), (cx - Rx * 0.7, cy + Ry * 0.7, W * 0.07)]
    chain(layer, path, sp.metal, "figaro", W * 0.014)
    return [(cx + Rx * 0.5, cy + Ry * 0.85, W * 0.08)]


def draw_gift_box(layer, W, H, open_amount=1.0, color=(160, 10, 32)):
    """Signature red box seen from the front-top, lid lifted by open_amount."""
    d = ImageDraw.Draw(layer)
    bx0, bx1 = W * 0.18, W * 0.82
    by0, by1 = H * 0.5, H * 0.86
    dark = _lerp(color, (0, 0, 0), 0.45)
    d.rectangle([bx0, by0, bx1, by1], fill=color + (255,))
    d.rectangle([bx0, by0, bx1, by0 + H * 0.03], fill=dark + (255,))
    gold = METALS["gold"]
    d.rectangle([W / 2 - W * 0.025, by0, W / 2 + W * 0.025, by1], fill=gold[1] + (255,))
    # lid
    lift = open_amount * H * 0.32
    lx0, lx1 = bx0 - W * 0.02, bx1 + W * 0.02
    ly0, ly1 = by0 - H * 0.07 - lift, by0 - lift + H * 0.01
    d.rectangle([lx0, ly0, lx1, ly1], fill=_lerp(color, (255, 255, 255), 0.08) + (255,))
    d.rectangle([W / 2 - W * 0.025, ly0, W / 2 + W * 0.025, ly1], fill=gold[2] + (255,))
    # bow
    bw = W * 0.1
    d.ellipse([W / 2 - bw * 1.6, ly0 - bw * 0.7, W / 2 - bw * 0.1, ly0 + bw * 0.3], outline=gold[1] + (255,), width=int(W * 0.018))
    d.ellipse([W / 2 + bw * 0.1, ly0 - bw * 0.7, W / 2 + bw * 1.6, ly0 + bw * 0.3], outline=gold[1] + (255,), width=int(W * 0.018))
    d.ellipse([W / 2 - bw * 0.25, ly0 - bw * 0.3, W / 2 + bw * 0.25, ly0 + bw * 0.2], fill=gold[2] + (255,))
    # foil wordmark
    return (bx0, by0, bx1, by1)


def draw_piece(layer, W, H, sp: Spec, seed=0, **kw):
    if sp.kind == "necklace":
        return draw_necklace(layer, W, H, sp, seed=seed, **kw)
    if sp.kind == "ring":
        return draw_ring(layer, W, H, sp, seed=seed, **kw)
    if sp.kind == "earrings":
        return draw_earrings(layer, W, H, sp, seed=seed)
    if sp.kind == "bracelet":
        return draw_bracelet(layer, W, H, sp, seed=seed)
    return []


def piece_layer(p: dict, catalog: dict, W: int, H: int, seed=0, bake_sparkles=True) -> tuple[Image.Image, list]:
    """Render the product on transparent background at W×H (supersampled)."""
    w, h = W * SS, H * SS
    layer = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    sp = spec_for(p)
    sparkles: list = []
    if sp.kind == "set":
        by_slug = {q["slug"]: q for q in catalog["products"]}
        parts = [by_slug[s] for s in p.get("bundle", []) if s in by_slug]
        box = draw_gift_box(layer, w, h, open_amount=0.0)
        for i, part in enumerate(parts):
            ps = spec_for(part)
            sub = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            if ps.kind == "necklace":
                sp_list = draw_necklace(sub, w, h, ps, scale=0.62 - i * 0.06, cy=0.08 + i * 0.03, seed=i)
            elif ps.kind == "ring":
                sp_list = draw_ring(sub, w, h, ps, cx=w * (0.3 + 0.2 * i), cy=h * 0.4, scale=0.45, seed=i)
            elif ps.kind == "earrings":
                sub2 = Image.new("RGBA", (w, h), (0, 0, 0, 0))
                sp_list = draw_earrings(sub2, w, h, ps, seed=i)
                sub2 = sub2.resize((w // 2, h // 2), Image.LANCZOS)
                sub.alpha_composite(sub2, (w // 4, int(h * 0.12)))
                sp_list = [(x / 2 + w / 4, y / 2 + h * 0.12, s / 2) for x, y, s in sp_list]
            else:
                sp_list = draw_piece(sub, w, h, ps, seed=i)
            layer.alpha_composite(sub)
            sparkles += sp_list
    else:
        sparkles = draw_piece(layer, w, h, sp, seed=seed) or []
    # contact shadow + bloom
    alpha = layer.split()[3]
    shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    shadow.putalpha(alpha.point(lambda a: int(a * 0.55)))
    shadow = shadow.filter(ImageFilter.GaussianBlur(w * 0.012))
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.alpha_composite(shadow, (int(w * 0.006), int(h * 0.014)))
    out.alpha_composite(layer)
    if bake_sparkles:
        for x, y, s in sparkles:
            sparkle(out, x, y, s * 0.8, 230)
    out = out.resize((W, H), Image.LANCZOS)
    return out, [(x / SS, y / SS, s / SS) for x, y, s in sparkles]


def render_product(p: dict, catalog: dict, out_dir: Path, W=1200, H=1500) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    piece, _ = piece_layer(p, catalog, W, H, seed=zlib.crc32(p["slug"].encode()) % 1000)
    paths = []
    # 1) hero: black velvet with warm spotlight — luxury signal, makes metal pop
    hero = radial_bg(W, H, (44, 30, 22), (6, 6, 7))
    hero.alpha_composite(piece)
    # 2) catalogue: warm ivory — clean, marketplace-friendly (Google Shopping prefers light bg)
    cat = radial_bg(W, H, (252, 249, 242), (226, 216, 198), cy=0.4, radius=1.1)
    cat.alpha_composite(piece)
    for i, img in enumerate((hero, cat), start=1):
        path = out_dir / f"{p['slug']}-{i}.webp"
        img.convert("RGB").save(path, "WEBP", quality=84, method=6)
        paths.append(path)
    # 3) square social thumbnail
    sq = hero.crop((0, (H - W) // 2, W, (H - W) // 2 + W)).convert("RGB").resize((800, 800), Image.LANCZOS)
    path = out_dir / f"{p['slug']}-sq.jpg"
    sq.save(path, "JPEG", quality=86, optimize=True, progressive=True)
    paths.append(path)
    return paths
