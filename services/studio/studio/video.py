"""Lumière — our own short-form video engine (9:16, 1080×1920, 30 fps).

Every frame is drawn in code and streamed straight into ffmpeg; the soundtrack
is synthesised in audio.py and synced to on-screen events. Three formats:

  glint      macro push-in, a light beam sweeps across, stones flare on cue
  layering   pieces drop in one at a time and build the full stack
  unboxing   the signature red box shakes, the lid lifts, light spills out,
             the piece rises and catches the light

Text stays inside the phone-safe zone so TikTok / Reels / Shorts buttons never
cover a price or a call-to-action.
"""
from __future__ import annotations

import math
import random
import subprocess
import tempfile
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Callable

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

from . import audio
from .render import (METALS, SS, catenary, chain, draw_ring, gem, piece_layer, radial_bg,
                     sparkle_sprite, spec_for)

W, H, FPS = 1080, 1920, 30
FONTS = Path(__file__).resolve().parent.parent / "assets" / "fonts"
GOLD = (232, 200, 120)
IVORY = (247, 243, 234)
ROSSO = (200, 16, 46)
# Phone-safe zone: platform UI covers the top bar, the right-hand action rail
# and the caption block at the bottom.
SAFE_TOP, SAFE_BOTTOM, SAFE_LEFT, SAFE_RIGHT = 210, 1480, 80, 170
BRAND = "JEWELLARIESS"


# ---------- easing ----------
def clamp(x, a=0.0, b=1.0):
    return max(a, min(b, x))


def prog(t, start, dur):
    return clamp((t - start) / dur)


def ease_io(x):
    return x * x * (3 - 2 * x)


def ease_out(x):
    return 1 - (1 - x) ** 3


def ease_back(x, s=1.6):
    x -= 1
    return x * x * ((s + 1) * x + s) + 1


def with_alpha(im: Image.Image, a: float) -> Image.Image:
    if a >= 1:
        return im
    im = im.copy()
    im.putalpha(im.split()[3].point(lambda v: int(v * a)))
    return im


# ---------- type ----------
_font_cache: dict = {}


def font(kind: str, size: int, weight: int = 500) -> ImageFont.FreeTypeFont:
    key = (kind, size, weight)
    if key not in _font_cache:
        file = {"serif": "CormorantGaramond.ttf", "italic": "CormorantGaramond-Italic.ttf", "sans": "Inter.ttf"}[kind]
        f = ImageFont.truetype(str(FONTS / file), size)
        try:
            vals = []
            for ax in f.get_variation_axes():
                name = ax.get("name", b"")
                name = name.decode() if isinstance(name, bytes) else str(name)
                if "eight" in name:
                    vals.append(weight)
                elif "ptical" in name:
                    vals.append(min(max(size / 2, ax["minimum"]), ax["maximum"]))
                else:
                    vals.append(ax["default"])
            f.set_variation_by_axes(vals)
        except Exception:
            pass
        _font_cache[key] = f
    return _font_cache[key]


@lru_cache(maxsize=256)
def _text_sprite(txt: str, kind: str, size: int, weight: int, fill: tuple, tracking: int, shadow: bool) -> Image.Image:
    """Text (with soft drop shadow) rendered once onto a tight canvas."""
    f = font(kind, size, weight)
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    if tracking:
        widths = [probe.textlength(ch, font=f) + tracking for ch in txt]
        tw = sum(widths) - tracking
    else:
        tw = probe.textlength(txt, font=f)
    pad = 30
    asc, desc = f.getmetrics()
    im = Image.new("RGBA", (int(tw) + pad * 2, asc + desc + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    if tracking:
        x = pad
        for ch, wd in zip(txt, widths):
            d.text((x, pad), ch, font=f, fill=fill + (255,))
            x += wd
    else:
        d.text((pad, pad), txt, font=f, fill=fill + (255,))
    if shadow:
        sh = Image.new("RGBA", im.size, (0, 0, 0, 0))
        sh.putalpha(im.split()[3].point(lambda a: int(a * 0.75)))
        sh = sh.filter(ImageFilter.GaussianBlur(9))
        base = Image.new("RGBA", im.size, (0, 0, 0, 0))
        base.alpha_composite(sh, (0, 4))
        base.alpha_composite(im)
        im = base
    return im


def text_center(img, y, txt, kind, size, weight, fill, alpha=1.0, tracking=0, shadow=True, x=None):
    if alpha <= 0.01:
        return
    sp = with_alpha(_text_sprite(txt, kind, size, weight, tuple(fill), tracking, shadow), alpha)
    cx = W / 2 if x is None else x
    img.alpha_composite(sp, (int(cx - sp.width / 2), int(y - 30)))


def wrap(txt: str, f, max_w: int) -> list[str]:
    words, lines, cur = txt.split(), [], ""
    probe = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    for w_ in words:
        nxt = (cur + " " + w_).strip()
        if probe.textlength(nxt, font=f) > max_w and cur:
            lines.append(cur)
            cur = w_
        else:
            cur = nxt
    if cur:
        lines.append(cur)
    return lines


def hook_text(img, t, txt, start=0.25, end=3.0, y=None):
    a = prog(t, start, 0.35) * (1 - prog(t, end, 0.35))
    if a <= 0:
        return
    lines = wrap(txt, font("serif", 92, 600), W - SAFE_LEFT - SAFE_RIGHT)
    rise = (1 - ease_out(prog(t, start, 0.5))) * 30
    y0 = SAFE_TOP + 40 if y is None else y
    for i, line in enumerate(lines):
        text_center(img, y0 + i * 100 + rise, line, "serif", 92, 600, IVORY, a)


def wordmark(img, alpha=0.9):
    text_center(img, SAFE_TOP - 120, BRAND, "sans", 30, 600, GOLD, alpha, tracking=12, shadow=False)


@lru_cache(maxsize=16)
def _pill_sprite(label: str, color: tuple) -> Image.Image:
    f = font("sans", 40, 700)
    tw = ImageDraw.Draw(Image.new("RGB", (1, 1))).textlength(label, font=f)
    pw, ph, pad = int(tw + 110), 104, 40
    im = Image.new("RGBA", (pw + pad * 2, ph + pad * 2), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.rounded_rectangle([pad, pad, pad + pw, pad + ph], radius=ph / 2, fill=color + (255,))
    glow = im.filter(ImageFilter.GaussianBlur(20))
    d.text((pad + pw / 2, pad + ph / 2), label, font=f, fill=(255, 255, 255, 255), anchor="mm")
    return Image.alpha_composite(glow, im)


def pill(img, cx, cy, label, alpha=1.0, color=ROSSO):
    if alpha <= 0.01:
        return
    sp = with_alpha(_pill_sprite(label, color), alpha)
    img.alpha_composite(sp, (int(cx - sp.width / 2), int(cy - sp.height / 2)))


@lru_cache(maxsize=1)
def _bottom_shade() -> Image.Image:
    grad = np.zeros((H, W, 4), np.uint8)
    ys = np.linspace(0, 1, H)[:, None]
    grad[..., 3] = (np.clip((ys - 0.5) / 0.28, 0, 1) * 215).astype(np.uint8)
    return Image.fromarray(grad, "RGBA")


END_Y = SAFE_BOTTOM - 400  # top of the end card block


def end_card(img, t, start, p: dict, cta="SHOP NOW · LINK IN BIO", subtitle=None):
    a = ease_out(prog(t, start, 0.6))
    if a <= 0:
        return
    img.alpha_composite(with_alpha(_bottom_shade(), a))
    y0 = END_Y + (1 - a) * 40
    text_center(img, y0, p["name"], "serif", 96, 600, IVORY, a)
    py = y0 + 125
    if subtitle:
        text_center(img, py, subtitle, "italic", 52, 500, GOLD, a)
        py += 75
    # price, anchored against the struck-through compare-at price
    price, was = f"${p['price']:.0f}", f"${p['compare_at']:.0f}"
    ps = _text_sprite(price, "sans", 64, 700, IVORY, 0, True)
    ws = _text_sprite(was, "sans", 44, 400, (170, 160, 150), 0, False)
    total = ps.width + ws.width - 40
    x = W / 2 - total / 2
    img.alpha_composite(with_alpha(ps, a), (int(x), int(py - 30)))
    wx = int(x + ps.width - 40)
    img.alpha_composite(with_alpha(ws, a), (wx, int(py - 16)))
    ImageDraw.Draw(img).line([(wx + 26, py + 28), (wx + ws.width - 26, py + 28)], fill=ROSSO + (int(255 * a),), width=4)
    pill(img, W / 2, py + 165, cta, a * ease_out(prog(t, start + 0.35, 0.4)))


# ---------- light ----------
def put_sparkle(img: Image.Image, x, y, size, alpha=1.0, rot=0.0):
    if alpha <= 0.02 or size < 8:
        return
    sp = sparkle_sprite(size)
    if rot:
        sp = sp.rotate(math.degrees(rot), resample=Image.BICUBIC)
    sp = with_alpha(sp, alpha)
    img.alpha_composite(sp, (int(x - sp.width / 2), int(y - sp.height / 2)))


_ys4, _xs4 = np.mgrid[0:H:4, 0:W:4].astype(np.float32)


def _up4(k: np.ndarray) -> np.ndarray:
    return np.repeat(np.repeat(k, 4, axis=0), 4, axis=1)[:H, :W]


def beam_frame(t_norm: float, angle_deg=22, width=260, strength=0.85) -> np.ndarray:
    """A soft diagonal band of warm light; t_norm in [0,1] moves it across the frame."""
    a = math.radians(angle_deg)
    proj = _xs4 * math.cos(a) + _ys4 * math.sin(a)
    span = W * math.cos(a) + H * math.sin(a)
    centre = -width * 2 + t_norm * (span + width * 4)
    return _up4(np.exp(-((proj - centre) / width) ** 2) * strength)


def add_light(img: Image.Image, band: np.ndarray, mask: np.ndarray | None = None, ambient=0.12):
    arr = np.asarray(img.convert("RGB"), np.float32)
    k = band * ambient if mask is None else band * (ambient + mask)
    arr += k[..., None] * np.array([230, 212, 176], np.float32)
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "RGB").convert("RGBA")


def god_rays(cx, cy, t, strength) -> np.ndarray:
    ang = np.arctan2(_ys4 - cy, _xs4 - cx)
    dist = np.hypot(_xs4 - cx, _ys4 - cy)
    rays = (0.5 + 0.5 * np.sin(ang * 14 + t * 0.8)) ** 6 + 0.5 * (0.5 + 0.5 * np.sin(ang * 23 - t * 0.5)) ** 8
    up = np.clip(-(_ys4 - cy) / 300 + 0.4, 0, 1)  # spill upward out of the box
    return _up4(rays * up * np.exp(-dist / 900) * strength)


# ---------- render loop ----------
@dataclass
class Clip:
    name: str
    dur: float
    draw: Callable[[float], Image.Image]
    mix: audio.Mix
    cover_t: float
    meta: dict = field(default_factory=dict)


def encode(clip: Clip, out_dir: Path, crf=24) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    mp4 = out_dir / f"{clip.name}.mp4"
    poster = out_dir / f"{clip.name}.jpg"
    with tempfile.TemporaryDirectory() as td:
        wav = Path(td) / "a.wav"
        clip.mix.write(wav)
        cmd = ["ffmpeg", "-v", "error", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(FPS),
               "-i", "-", "-i", str(wav), "-c:v", "libx264", "-preset", "medium", "-crf", str(crf),
               "-pix_fmt", "yuv420p", "-profile:v", "high", "-c:a", "aac", "-b:a", "128k",
               "-movflags", "+faststart", "-shortest", str(mp4)]
        proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
        frames = int(clip.dur * FPS)
        cover_frame = int(clip.cover_t * FPS)
        try:
            for i in range(frames):
                fr = clip.draw(i / FPS).convert("RGB")
                if i == cover_frame:
                    fr.save(poster, "JPEG", quality=85, optimize=True, progressive=True)
                proc.stdin.write(fr.tobytes())
        finally:
            proc.stdin.close()
        if proc.wait() != 0:
            raise RuntimeError(f"ffmpeg failed for {clip.name}")
    return {"video": mp4.name, "poster": poster.name, "duration": clip.dur, **clip.meta}


def _fade(img: Image.Image, t: float, dur: float) -> Image.Image:
    a = min(prog(t, 0, 0.5), 1 - prog(t, dur - 0.45, 0.45))
    if a >= 1:
        return img
    return Image.blend(Image.new("RGBA", img.size, (0, 0, 0, 255)), img, a)


@lru_cache(maxsize=1)
def velvet() -> Image.Image:
    return radial_bg(W, H, (46, 31, 23), (5, 5, 6), cy=0.40, radius=0.9)


# ---------- format 1: glint ----------
def glint(p: dict, catalog: dict, hook: str) -> Clip:
    dur, end_at = 8.0, 5.6
    big = 1.3  # render oversize so the push-in stays sharp
    piece, sparks = piece_layer(p, catalog, int(W * big), int(W * 1.25 * big), seed=7, bake_sparkles=False)
    pw, ph = piece.size
    alpha_full = piece.split()[3]
    sweeps = [(1.1, 1.9), (3.6, 1.6)]

    def placement(t):
        z = 1.0 + 0.16 * ease_io(prog(t, 0, end_at))
        lift = ease_io(prog(t, end_at - 0.2, 0.8))  # make room for the end card
        z *= 1 - 0.30 * lift
        sw, sh = int(pw / big * z), int(ph / big * z)
        ox = (W - sw) // 2
        oy = int(330 - (z - 1) * 420 - lift * 330)
        return z, sw, sh, ox, oy

    # sparkle cues: the moment the beam reaches each sparkle point
    a = math.radians(22)
    span = W * math.cos(a) + H * math.sin(a)
    cues = []
    for (st, du) in sweeps:
        z, sw, sh, ox, oy = placement(st + du / 2)
        for (x, y, s) in sparks:
            fx, fy = ox + x / big * z, oy + y / big * z
            tn = (fx * math.cos(a) + fy * math.sin(a) + 520) / (span + 1040)
            cues.append((st + tn * du, x, y, s))
    rnd = random.Random(p["slug"])
    mix = audio.Mix(dur)
    mix.add(audio.music_bed(dur, seed=rnd.randint(0, 99)), 0)
    for (ct, x, _, _) in cues:
        mix.add(audio.ting(0.2), ct, pan=(x / pw - 0.5) * 1.2)
    mix.add(audio.whoosh(0.8, 0.12), 0.9)
    mix.add(audio.bell(523.25, 2.0, 0.14), end_at + 0.1)

    def draw(t):
        img = velvet().copy()
        z, sw, sh, ox, oy = placement(t)
        img.alpha_composite(piece.resize((sw, sh), Image.BICUBIC), (ox, oy))
        band = None
        for (st, du) in sweeps:
            if st - 0.2 <= t <= st + du + 0.2:
                b = beam_frame(prog(t, st, du))
                band = b if band is None else band + b
        if band is not None:
            mask = np.zeros((H, W), np.float32)
            m = np.asarray(alpha_full.resize((sw, sh), Image.BILINEAR), np.float32) / 255
            y0, y1, x0, x1 = max(0, oy), min(H, oy + sh), max(0, ox), min(W, ox + sw)
            mask[y0:y1, x0:x1] = m[y0 - oy:y1 - oy, x0 - ox:x1 - ox]
            img = add_light(img, band, mask * 0.55)
        for (ct, x, y, s) in cues:
            k = t - ct
            if -0.05 < k < 0.65:
                env = math.sin(clamp(k / 0.65) * math.pi)
                put_sparkle(img, ox + x / big * z, oy + y / big * z, (s / big * 1.4 + 30) * env, env, rot=k * 1.2)
        # a resting glint on the end card so the last frame still sparkles
        if t > end_at + 0.5 and sparks:
            x, y, s = sparks[0]
            env = 0.6 + 0.4 * math.sin((t - end_at) * 4)
            put_sparkle(img, ox + x / big * z, oy + y / big * z, (s / big + 20) * env, env)
        wordmark(img)
        hook_text(img, t, hook)
        end_card(img, t, end_at, p)
        return _fade(img, t, dur)

    return Clip(f"{p['slug']}-glint", dur, draw, mix, cover_t=2.0, meta={"format": "glint", "hook": hook})


# ---------- format 2: layering ----------
@lru_cache(maxsize=1)
def _skin_backdrop() -> Image.Image:
    """Stylised décolletage: warm studio wall, neck and sloping shoulders, black scoop top."""
    img = radial_bg(W, H, (222, 206, 186), (156, 134, 114), cy=0.3, radius=1.0)
    s = SS
    w, h = W * s, H * s
    skin_d, skin_m, skin_l = (104, 66, 44), (150, 100, 70), (182, 128, 92)
    neck_half = w * 0.135
    # silhouette: vertical neck that flares into sloping shoulders (trapezius curve)
    outline = []
    for x in np.linspace(-w * 0.05, w * 1.05, 220):
        dx = abs(x - w / 2)
        if dx <= neck_half:
            y = 0.0
        else:
            u = (dx - neck_half) / (w * 0.40)
            y = h * 0.20 + h * 0.12 * min(u, 1.4) ** 0.55 - h * 0.20 * math.exp(-u * 18)
        outline.append((x, y))
    body = Image.new("L", (w, h), 0)
    ImageDraw.Draw(body).polygon(outline + [(w * 1.05, h), (-w * 0.05, h)], fill=255)
    # horizontal shading: lit centre, falling off to the edges
    xs = np.linspace(-1, 1, w)[None, :]
    ys = np.linspace(0, 1, h)[:, None]
    lit = np.clip(1 - np.abs(xs) ** 1.6, 0, 1)
    neck_shadow = np.clip(1 - ys / 0.12, 0, 1) * (np.abs(xs) < 0.27)  # shadow under the jaw
    k = np.clip(lit * 0.85 - neck_shadow * 0.55, 0, 1)[..., None]
    col = np.array(skin_d, np.float32) * (1 - k) + np.array(skin_l, np.float32) * k
    # neck edge darkening
    edge = np.clip(1 - np.abs(np.abs(xs) - 0.27) / 0.04, 0, 1) * (ys < 0.24)
    col = col * (1 - edge[..., None] * 0.25)
    # subtle collarbone highlights
    for side in (-1, 1):
        cxb = 0.5 + side * 0.2
        d2 = ((np.linspace(0, 1, w)[None, :] - cxb) / 0.16) ** 2 + ((ys - 0.315) / 0.008) ** 2
        col += (np.exp(-d2) * 26)[..., None] * np.array([1, 0.8, 0.6])
    skin = Image.fromarray(np.clip(col, 0, 255).astype(np.uint8), "RGB").convert("RGBA")
    skin.putalpha(body)
    # black scoop-neck top
    top = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    td = ImageDraw.Draw(top)
    scoop = [(w * 0.5 + math.cos(a) * w * 0.36, h * 0.53 + math.sin(a) * h * 0.11) for a in np.linspace(math.pi, 0, 60)]
    td.polygon([(-w * 0.05, h * 0.33)] + [(w * 0.10, h * 0.36)] + scoop + [(w * 0.90, h * 0.36), (w * 1.05, h * 0.33),
               (w * 1.05, h), (-w * 0.05, h)], fill=(16, 14, 17, 255))
    lay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    lay.alpha_composite(skin)
    lay.alpha_composite(top)
    img.alpha_composite(lay.filter(ImageFilter.GaussianBlur(0.8 * s)).resize((W, H), Image.LANCZOS))
    return img


def _necklace_on_body(part: dict, depth: float, seed: int) -> tuple[Image.Image, list]:
    sp = spec_for(part)
    w, h = W * SS, H * SS
    lay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    cx, top = w / 2, h * 0.20
    hw = w * 0.205
    link = w * 0.0085
    path = catenary(cx, top, hw, h * depth)
    if sp.variant == "tennis":
        d = ImageDraw.Draw(lay)
        sh = METALS[sp.metal]
        for i, (x, y) in enumerate(path[::2]):
            r = link * 1.1
            d.ellipse([x - r * 1.25, y - r * 1.25, x + r * 1.25, y + r * 1.25], fill=sh[1] + (255,))
            gem(lay, x, y, r, r, sp.stone, seed=i)
        sparks = [(path[30][0], path[30][1], w * 0.05), (path[52][0], path[52][1], w * 0.04)]
    else:
        style = {"paperclip": "paperclip", "heart": "satellite"}.get(sp.variant, "cable")
        chain(lay, path, sp.metal, style, link * (1.5 if style == "paperclip" else 1.0))
        bx, by = path[len(path) // 2]
        if sp.variant in ("tear", "heart"):
            r = w * 0.03
            gem(lay, bx, by + r * 1.3, r, r * 1.15, sp.stone, "heart" if sp.variant == "heart" else "tear", seed)
            sparks = [(bx - r * 0.2, by + r, w * 0.07)]
        else:
            sparks = [(path[25][0], path[25][1], w * 0.04)]
    shadow = Image.new("RGBA", (w, h), (30, 15, 5, 0))
    shadow.putalpha(lay.split()[3].point(lambda a: int(a * 0.45)))
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    out.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(6 * SS)), (0, 8 * SS))
    out.alpha_composite(lay)
    return out.resize((W, H), Image.LANCZOS), [(x / SS, y / SS, s / SS) for x, y, s in sparks]


def layering(bundle: dict, catalog: dict, hook: str) -> Clip:
    by = {q["slug"]: q for q in catalog["products"]}
    parts = [by[s] for s in bundle.get("bundle", [])]
    is_rings = all(q["category"] == "rings" for q in parts)
    step, start = 2.0, 1.4
    final = start + step * len(parts)
    dur = final + 3.8
    mix = audio.Mix(dur)
    mix.add(audio.music_bed(dur, bpm=100, root=196, seed=5), 0)
    layers = []
    if is_rings:
        bg = velvet()
        for i, q in enumerate(parts):
            lay = Image.new("RGBA", (W * SS, H * SS), (0, 0, 0, 0))
            sp_ = draw_ring(lay, W * SS, H * SS, spec_for(q), cy=H * SS * (0.50 - i * 0.07), scale=0.62, seed=i)
            layers.append((lay.resize((W, H), Image.LANCZOS), [(x / SS, y / SS, s / SS) for x, y, s in sp_]))
        labels = [f"{i + 1:02d}  ·  {q['name']}" for i, q in enumerate(parts)]
        label_y = SAFE_TOP + 300
    else:
        bg = _skin_backdrop()
        order = {"choker": 0, "base": 1, "pendant": 2}  # shortest chain sits highest
        parts = sorted(parts, key=lambda q: order.get(q.get("layer"), 1))
        depths = [0.075, 0.11, 0.16][: len(parts)]
        for i, q in enumerate(parts):
            layers.append(_necklace_on_body(q, depths[i], i))
        lengths = ["40 cm", "42 cm", "45 cm"]
        labels = [f"Layer {i + 1}  ·  {q['name']}  ·  {lengths[i]}" for i, q in enumerate(parts)]
        label_y = 1180  # on the black top, clear of every chain
    for i in range(len(parts)):
        land = start + i * step + 0.55
        mix.add(audio.whoosh(0.5, 0.08), land - 0.5)
        mix.add(audio.thump(0.25), land)
        mix.add(audio.ting(0.16), land + 0.05, pan=(-0.4 + 0.4 * i))
    for k in range(3):
        mix.add(audio.ting(0.2), final + 0.15 + k * 0.22, pan=(k - 1) * 0.6)
    end_at = final + 0.9

    def draw(t):
        img = bg.copy()
        for i, (lay, sparks) in enumerate(layers):
            t0 = start + i * step
            if t < t0:
                continue
            dy = int((1 - ease_back(prog(t, t0, 0.55))) * -380)
            img.alpha_composite(with_alpha(lay, prog(t, t0, 0.2)), (0, dy))
            for (x, y, s) in sparks:
                env = math.sin(clamp((t - t0 - 0.55) / 0.55) * math.pi)
                put_sparkle(img, x, y + dy, (s * 1.2 + 20) * env, env)
            out_at = (t0 + step - 0.25) if i < len(layers) - 1 else (end_at - 0.3)
            la = prog(t, t0 + 0.4, 0.3) * (1 - prog(t, out_at, 0.25))
            text_center(img, label_y, labels[i], "sans", 44, 600, IVORY, la)
        if t >= final:
            img = add_light(img, beam_frame(prog(t, final, 1.4), strength=0.5), None, ambient=0.25)
            for j, (lay, sparks) in enumerate(layers):
                for (x, y, s) in sparks:
                    ct = final + 0.15 + j * 0.22
                    env = math.sin(clamp((t - ct) / 0.6) * math.pi)
                    put_sparkle(img, x, y, (s * 1.8 + 20) * env, env, rot=(t - ct))
        wordmark(img)
        hook_text(img, t, hook, end=start + 0.9, y=SAFE_TOP + 20)
        end_card(img, t, end_at, bundle, subtitle="The full look, one box")
        return _fade(img, t, dur)

    return Clip(f"{bundle['slug']}-layering", dur, draw, mix, cover_t=final + 0.6, meta={"format": "layering", "hook": hook})


# ---------- format 3: unboxing ----------
BOX = (0.22, 0.53, 0.78, 0.70)  # x0, y0, x1, y1 as fractions of the frame


@lru_cache(maxsize=1)
def _box_static() -> tuple[Image.Image, Image.Image]:
    s = SS
    w, h = W * s, H * s
    red_d, red_l = (96, 4, 18), (196, 26, 50)
    gold = METALS["gold"]
    bx0, by0, bx1, by1 = BOX[0] * w, BOX[1] * h, BOX[2] * w, BOX[3] * h
    back = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(back).polygon([(bx0, by0), (bx0 + w * 0.05, by0 - h * 0.04), (bx1 - w * 0.05, by0 - h * 0.04), (bx1, by0)],
                                 fill=(22, 4, 8, 255))
    front = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    df = ImageDraw.Draw(front)
    for i in range(40):
        t = i / 39
        c = tuple(int(red_d[k] + (red_l[k] - red_d[k]) * math.sin(0.2 + t * 2.6) ** 2) for k in range(3))
        x = bx0 + (bx1 - bx0) * t
        df.line([(x, by0), (x, by1)], fill=c + (255,), width=int((bx1 - bx0) / 38) + 2)
    df.rectangle([w / 2 - w * 0.02, by0, w / 2 + w * 0.02, by1], fill=gold[1] + (255,))
    df.line([(w / 2 - w * 0.011, by0), (w / 2 - w * 0.011, by1)], fill=gold[2] + (255,), width=3 * s)
    f = font("sans", 22 * s, 600)
    df.text((w / 2, by1 - h * 0.03), "J E W E L L A R I E S S", font=f, fill=gold[2] + (230,), anchor="mm")
    return back.resize((W, H), Image.LANCZOS), front.resize((W, H), Image.LANCZOS)


@lru_cache(maxsize=64)
def _box_lid(q: int) -> Image.Image:
    """Lid at opening step q/40 (cached: only 41 distinct frames exist)."""
    open_amt = q / 40
    s = SS
    w, h = W * s, H * s
    red, red_d = (166, 10, 34), (96, 4, 18)
    gold = METALS["gold"]
    bx0, by0, bx1 = BOX[0] * w, BOX[1] * h, BOX[2] * w
    lid = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dl = ImageDraw.Draw(lid)
    lift = ease_io(open_amt) * h * 0.26
    tilt = ease_io(open_amt) * w * 0.05
    ly1 = by0 + h * 0.012 - lift
    ly0 = ly1 - h * 0.075
    lx0, lx1 = bx0 - w * 0.02 + tilt, bx1 + w * 0.02 + tilt
    dl.polygon([(lx0, ly1), (lx0 + w * 0.045, ly0), (lx1 - w * 0.045, ly0 - tilt * 0.3), (lx1, ly1)], fill=red + (255,))
    dl.rectangle([lx0, ly1 - h * 0.018, lx1, ly1], fill=red_d + (255,))
    mid = (lx0 + lx1) / 2
    dl.polygon([(mid - w * 0.02, ly1), (mid - w * 0.01, ly0), (mid + w * 0.03, ly0), (mid + w * 0.02, ly1)], fill=gold[1] + (255,))
    bw = w * 0.09
    for side in (-1, 1):
        cx = mid + side * bw * 0.85
        box = [cx - bw * 0.85, ly0 - bw * 0.7, cx + bw * 0.85, ly0 + bw * 0.25]
        dl.ellipse(box, outline=gold[1] + (255,), width=int(w * 0.016))
        dl.arc(box, 200, 300, fill=gold[3] + (255,), width=int(w * 0.006))
    dl.ellipse([mid - bw * 0.28, ly0 - bw * 0.32, mid + bw * 0.28, ly0 + bw * 0.18], fill=gold[2] + (255,))
    return lid.resize((W, H), Image.LANCZOS)


def _gift_contents(p: dict, catalog: dict) -> tuple[Image.Image, list]:
    """Hero piece large, supporting pieces small beneath it."""
    by = {q["slug"]: q for q in catalog["products"]}
    parts = [by[s] for s in p.get("bundle", []) if s in by]
    cw, ch = 900, 1125
    lay = Image.new("RGBA", (cw, ch), (0, 0, 0, 0))
    sparks = []
    hero, rest = parts[0], parts[1:]
    # necklaces read best as the hero
    for q in parts:
        if q["category"] == "necklaces":
            hero = q
            rest = [r for r in parts if r is not q]
            break
    pc, sk = piece_layer(hero, catalog, cw, ch, seed=1, bake_sparkles=False)
    lay.alpha_composite(pc, (0, -60))
    sparks += [(x, y - 60, s) for x, y, s in sk]
    n = len(rest)
    for i, q in enumerate(rest):
        sw, sh = 420, 525
        ox = int(cw / 2 - (n * sw) / 2 + i * sw)
        oy = 560
        pc, sk = piece_layer(q, catalog, sw, sh, seed=10 + i, bake_sparkles=False)
        lay.alpha_composite(pc, (ox, oy))
        sparks += [(x + ox, y + oy, s) for x, y, s in sk]
    return lay, sparks


def unboxing(p: dict, catalog: dict, hook: str) -> Clip:
    dur, rise_at, end_at = 9.5, 2.9, 6.4
    if p["category"] == "gift-sets":
        piece, sparks = _gift_contents(p, catalog)
    else:
        piece, sparks = piece_layer(p, catalog, 900, 1125, seed=3, bake_sparkles=False)
    pw, ph = piece.size
    back, front = _box_static()
    by0 = BOX[1] * H
    mix = audio.Mix(dur)
    mix.add(audio.music_bed(dur, bpm=88, root=207.65, seed=11), 0)
    for k in range(3):
        mix.add(audio.thump(0.18), 0.9 + k * 0.18)
    mix.add(audio.whoosh(1.1, 0.22), 1.75)
    for k, (x, _, _) in enumerate(sparks[:6]):
        mix.add(audio.ting(0.22), rise_at + 1.2 + k * 0.16, pan=(x / pw - 0.5))
    mix.add(audio.bell(659.25, 2.4, 0.18), rise_at + 1.1)
    mix.add(audio.whoosh(0.7, 0.1, rising=False), end_at - 0.1)

    def draw(t):
        img = velvet().copy()
        shake = math.sin((t - 0.8) * 40) * 1.6 * (1 - prog(t, 0.8, 0.7)) if 0.8 < t < 1.5 else 0.0
        open_amt = prog(t, 1.7, 1.1)
        away = ease_io(prog(t, end_at - 0.2, 0.7))  # box slides out for the end card
        box_dy = int(away * 700)
        box_a = 1 - away

        def place(layer):
            lyr = layer.rotate(shake, center=(W / 2, H * 0.62), resample=Image.BICUBIC) if shake else layer
            img.alpha_composite(with_alpha(lyr, box_a), (0, box_dy))

        if box_a > 0:
            place(back)
        if open_amt > 0:
            img = add_light(img, god_rays(W / 2, by0 + box_dy, t, 0.75 * ease_io(open_amt) * (1 - away * 0.8)), None, ambient=1.0)
        k = ease_out(prog(t, rise_at, 1.3))
        px = py = 0
        sc = 1.0
        if k > 0:
            sc = (0.55 + 0.45 * k) * (1 - 0.15 * away)
            pc = piece.resize((int(pw * sc), int(ph * sc)), Image.BICUBIC)
            px = (W - pc.width) // 2
            py = int(by0 - pc.height * 0.2 - k * 560 + (1 - k) * 260 - away * 80)
            if k < 1:  # still inside the box: hide whatever is below the rim
                arr = np.asarray(pc).copy()
                cut = int(by0 - py)
                if 0 <= cut < arr.shape[0]:
                    arr[cut:, :, 3] = 0
                elif cut < 0:
                    arr[:, :, 3] = 0
                pc = Image.fromarray(arr, "RGBA")
            img.alpha_composite(pc, (px, py))
            for j, (x, y, s) in enumerate(sparks):
                ct = rise_at + 1.2 + j * 0.16
                env = math.sin(clamp((t - ct) / 0.7) * math.pi)
                put_sparkle(img, px + x * sc, py + y * sc, (s * 1.4 + 24) * env, env, rot=(t - ct) * 1.5)
            if t > end_at + 0.6 and sparks:
                x, y, s = sparks[0]
                env = 0.6 + 0.4 * math.sin((t - end_at) * 4)
                put_sparkle(img, px + x * sc, py + y * sc, (s + 20) * env, env)
        if box_a > 0:
            place(front)
            la = 1 - prog(t, rise_at, 0.6)
            if la > 0:
                lid = _box_lid(int(round(open_amt * 40)))
                lid = lid.rotate(shake, center=(W / 2, H * 0.62), resample=Image.BICUBIC) if shake else lid
                img.alpha_composite(with_alpha(lid, la))
        wordmark(img)
        hook_text(img, t, hook, end=2.4)
        note_a = prog(t, rise_at + 1.4, 0.4) * (1 - prog(t, end_at - 0.3, 0.3))
        text_center(img, SAFE_TOP + 60, "made to be gifted.", "italic", 84, 500, GOLD, note_a)
        end_card(img, t, end_at, p, cta="ARRIVES IN THIS BOX · SHOP")
        return _fade(img, t, dur)

    return Clip(f"{p['slug']}-unboxing", dur, draw, mix, cover_t=rise_at + 1.6, meta={"format": "unboxing", "hook": hook})
