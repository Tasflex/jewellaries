"""Jewellariess logo generator.

Mark: a faceted gem drawn in gold line-work with a ruby-red pavilion facet and
a small four-point sparkle. Wordmark: JEWELLARIESS in Cormorant Garamond
SemiBold, converted to outlines (renders identically everywhere, no font
needed), widely tracked, with "ESS" in the brand red.

Colours are never hard-coded in the site version: the header/footer SVG uses
CSS variables (--logo-ink / --logo-gold / --logo-red) that each theme sets, so
the logo blends into dark and light mode alike.

    python -m studio.logo     # writes the files listed in main()
"""
from __future__ import annotations

import json
from pathlib import Path

from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = Path(__file__).resolve().parents[3]
FONT = Path(__file__).resolve().parent.parent / "assets" / "fonts" / "CormorantGaramond.ttf"

H = 64            # viewBox height
TEXT_X = 80       # wordmark starts after the mark
BASELINE = 43
FONT_SIZE = 33
TRACKING = 0.16   # em

# --- the mark (64×64 box) ---
GEM_OUTLINE = "M13 24 L21.5 12.5 H42.5 L51 24 L32 53 Z"
GEM_FACETS = "M13 24 H51 M21.5 12.5 L27 24 L32 12.5 L37 24 L42.5 12.5 M27 24 L32 53 L37 24"
GEM_TABLE = "M27 24 H37 L32 53 Z"          # ruby pavilion facet
GEM_GLINT = "M28.6 26.5 L31.2 26.5 L30.4 36 Z"  # small highlight on the ruby
SPARKLE = "M53 3.5 L54.3 8.7 L59.5 10 L54.3 11.3 L53 16.5 L51.7 11.3 L46.5 10 L51.7 8.7 Z"


def wordmark_paths() -> tuple[list[tuple[str, str]], float]:
    """Returns [(svg_path, part)] with part 'ink' or 'red', and the total width."""
    font = TTFont(str(FONT))
    if "fvar" in font:
        font = instancer.instantiateVariableFont(font, {"wght": 600})
    gs = font.getGlyphSet()
    cmap = font.getBestCmap()
    upm = font["head"].unitsPerEm
    s = FONT_SIZE / upm
    hmtx = font["hmtx"]
    x = TEXT_X
    out = []
    text = "JEWELLARIESS"
    for i, ch in enumerate(text):
        g = cmap[ord(ch)]
        pen = SVGPathPen(gs)
        gs[g].draw(pen)
        d = pen.getCommands()
        part = "red" if i >= len(text) - 3 else "ink"
        out.append((f'<path transform="translate({x:.2f} {BASELINE}) scale({s:.5f} {-s:.5f})" d="{d}"/>', part))
        x += hmtx[g][0] * s + (FONT_SIZE * TRACKING if i < len(text) - 1 else 0)
    return out, x


def mark_svg(classes: bool = True, gold="#d4af37", red="#c8102e", ink="#e8d3a2") -> str:
    if classes:
        # Inline styles with CSS variables: they survive being cloned through <use>,
        # and resolve against the page's current theme.
        line = "fill:none;stroke:var(--logo-gold);stroke-linejoin:round;stroke-linecap:round"
        return (
            f'<path style="{line};stroke-width:2.4" d="{GEM_OUTLINE}"/>'
            f'<path style="fill:var(--logo-red)" d="{GEM_TABLE}"/>'
            f'<path style="fill:#fff;fill-opacity:.55" d="{GEM_GLINT}"/>'
            f'<path style="{line};stroke-width:1.4" d="{GEM_FACETS}"/>'
            f'<path style="fill:var(--logo-gold)" d="{SPARKLE}"/>'
        )
    return (
        f'<path d="{GEM_OUTLINE}" fill="none" stroke="{gold}" stroke-width="2.4" stroke-linejoin="round"/>'
        f'<path d="{GEM_TABLE}" fill="{red}"/>'
        f'<path d="{GEM_GLINT}" fill="#ffffff" fill-opacity=".55"/>'
        f'<path d="{GEM_FACETS}" fill="none" stroke="{gold}" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round"/>'
        f'<path d="{SPARKLE}" fill="{gold}"/>'
    )


def standalone(width: float, words, colors: dict, media_dark: dict | None = None) -> str:
    """Self-contained SVG file. With media_dark it adapts to the viewer's colour scheme."""
    style = (
        f".g{{fill:none;stroke:{colors['gold']};stroke-width:2.4;stroke-linejoin:round;stroke-linecap:round}}"
        f".t{{stroke-width:1.4}}.r{{fill:{colors['red']}}}.w{{fill:#fff;fill-opacity:.55}}"
        f".s{{fill:{colors['gold']}}}.i{{fill:{colors['ink']}}}.e{{fill:{colors['red']}}}"
    )
    if media_dark:
        style += (
            f"@media (prefers-color-scheme:dark){{.g{{stroke:{media_dark['gold']}}}.s{{fill:{media_dark['gold']}}}"
            f".i{{fill:{media_dark['ink']}}}.e,.r{{fill:{media_dark['red']}}}}}"
        )
    ink = "".join(p for p, part in words if part == "ink")
    red = "".join(p for p, part in words if part == "red")
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width:.0f} {H}" role="img" aria-label="Jewellariess">'
        f"<style>{style}</style>"
        f'<path class="g" d="{GEM_OUTLINE}"/><path class="r" d="{GEM_TABLE}"/><path class="w" d="{GEM_GLINT}"/>'
        f'<path class="g t" d="{GEM_FACETS}"/><path class="s" d="{SPARKLE}"/>'
        f'<g class="i">{ink}</g><g class="e">{red}</g></svg>'
    )


DARK = {"gold": "#d4af37", "ink": "#e8d3a2", "red": "#e0213f"}
LIGHT = {"gold": "#9a7618", "ink": "#6f5413", "red": "#c8102e"}


def main():
    words, width = wordmark_paths()
    width = round(width + 4)
    web = ROOT / "apps" / "web"
    # 1) paths for the React <Logo/> (themed through CSS variables)
    ink = "".join(p for p, part in words if part == "ink")
    red = "".join(p for p, part in words if part == "red")
    ts = (
        "// Generated by services/studio/studio/logo.py; do not edit by hand.\n"
        f"export const LOGO_WIDTH = {width};\nexport const LOGO_HEIGHT = {H};\n"
        f"export const LOGO_MARK = {json.dumps(mark_svg())};\n"
        f"export const LOGO_INK = {json.dumps(ink)};\n"
        f"export const LOGO_RED = {json.dumps(red)};\n"
    )
    (web / "components" / "logoPaths.ts").write_text(ts, encoding="utf-8")
    # 2) standalone files
    pub = web / "public"
    (pub / "logo.svg").write_text(standalone(width, words, LIGHT, media_dark=DARK), encoding="utf-8")
    (pub / "logo-on-dark.svg").write_text(standalone(width, words, DARK), encoding="utf-8")
    (pub / "logo-on-light.svg").write_text(standalone(width, words, LIGHT), encoding="utf-8")
    # 3) favicon / app icon: the mark on an onyx tile (readable on any tab colour)
    icon = (
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0b0a0c"/>'
        f'<g transform="translate(2 2) scale(.94)">{mark_svg(classes=False, gold="#e8c46a", red="#e0213f")}</g></svg>'
    )
    (web / "app" / "icon.svg").write_text(icon, encoding="utf-8")
    print(f"logo written: {width}x{H}")


if __name__ == "__main__":
    main()
