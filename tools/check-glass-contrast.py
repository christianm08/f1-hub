#!/usr/bin/env python3
"""WCAG AA contrast check for the F1 Hub "Android next-gen" glass layer.

Reads src/design/tokens.css and verifies, for every --glass-bg-* surface in
light and dark theme:
  1. Translucent value alpha-blended over a representative backdrop
     (theme surface for page-backed surfaces; theme surface AND mid-gray
     #808080 for map/race, which float over imagery/video).
  2. Opaque @supports fallback values (same token names, backdrop-filter off).

Text colors checked: --md-sys-color-on-surface and
--md-sys-color-on-surface-variant. Requirement: contrast ratio >= 4.5 (AA,
normal text). Exits non-zero on the first failure.
"""

import re
import sys
from pathlib import Path

CSS_PATH = Path(__file__).resolve().parent.parent / "src/design/tokens.css"
AA_MIN = 4.5

# representative backdrops
BACKDROPS = {
    "page-surface": None,          # -> theme --md-sys-color-surface
    "photo-midgray": (128, 128, 128),
}
# surfaces that also float over imagery -> also tested over mid-gray
IMAGERY_SURFACES = {"map", "race"}


def parse_color(value: str):
    """Parse #rgb/#rrggbb or rgb()/rgba() -> (r, g, b, a)."""
    v = value.strip().lower()
    m = re.fullmatch(r"#([0-9a-f]{3}|[0-9a-f]{6})", v)
    if m:
        h = m.group(1)
        if len(h) == 3:
            h = "".join(c * 2 for c in h)
        return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), 1.0)
    m = re.fullmatch(
        r"rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)", v
    )
    if m:
        return (int(m.group(1)), int(m.group(2)), int(m.group(3)),
                float(m.group(4)) if m.group(4) is not None else 1.0)
    raise ValueError(f"unparsable color: {value!r}")


def tokens_of(block: str) -> dict:
    return {name: val.strip()
            for name, val in re.findall(r"--([\w-]+)\s*:\s*([^;]+);", block)}


def theme_blocks(text: str, selector: str):
    """All blocks for a selector (document order), excluding @supports content."""
    # cut the @supports fallback section out of the main parse
    m = re.search(r"@supports\s+not\s*\(\(backdrop-filter", text)
    main = text[: m.start()] if m else text
    out = []
    for mm in re.finditer(
        rf"{re.escape(selector)}\s*\{{(.*?)\}}", main, re.S
    ):
        out.append(mm.group(1))
    return out


def fallback_blocks(text: str, selector: str):
    """Theme blocks inside the @supports-not (backdrop-filter) fallback."""
    m = re.search(r"@supports\s+not\s*\(\(backdrop-filter", text)
    if not m:
        return []
    # brace-match the @supports block
    start = text.index("{", m.start())
    depth, i = 0, start
    while True:
        depth += text[i] == "{" 
        depth -= text[i] == "}"
        i += 1
        if depth == 0:
            break
    inner = text[start:i]
    return [mm.group(1) for mm in re.finditer(
        rf"{re.escape(selector)}\s*\{{(.*?)\}}", inner, re.S)]


def rel_lum(rgb) -> float:
    def lin(c):
        c /= 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b) -> float:
    l1, l2 = sorted((rel_lum(a), rel_lum(b)), reverse=True)
    return (l1 + 0.05) / (l2 + 0.05)


def blend(fg, bg):
    r, g, b, a = fg
    return tuple(round(a * f + (1 - a) * c) for f, c in zip((r, g, b), bg))


def main() -> int:
    text = CSS_PATH.read_text()

    themes = {}
    for theme in ("light", "dark"):
        merged: dict = {}
        for blk in theme_blocks(text, f'[data-theme="{theme}"]'):
            merged.update(tokens_of(blk))
        fb: dict = {}
        for blk in fallback_blocks(text, f'[data-theme="{theme}"]'):
            fb.update(tokens_of(blk))
        themes[theme] = (merged, fb)

    surfaces = ["nav", "appbar", "menu", "dialog", "panel", "map", "race"]
    failures = 0
    rows = []

    for theme, (tok, fb) in themes.items():
        surface_rgb = parse_color(tok["md-sys-color-surface"])[:3]
        texts = {
            "on-surface": parse_color(tok["md-sys-color-on-surface"])[:3],
            "on-surface-variant": parse_color(
                tok["md-sys-color-on-surface-variant"])[:3],
        }
        for s in surfaces:
            key = f"glass-bg-{s}"
            if key not in tok:
                print(f"MISSING token --{key} in [{theme}]")
                failures += 1
                continue
            glass = parse_color(tok[key])
            backdrops = {"page-surface": surface_rgb}
            if s in IMAGERY_SURFACES:
                backdrops["photo-midgray"] = BACKDROPS["photo-midgray"]
            for bname, bgrgb in backdrops.items():
                comp = blend(glass, bgrgb)
                for tname, trgb in texts.items():
                    r = contrast(trgb, comp)
                    ok = r >= AA_MIN
                    failures += not ok
                    rows.append((theme, s, f"translucent/{bname}", tname,
                                 f"{r:.2f}", "PASS" if ok else "FAIL"))
            # opaque fallback (no backdrop-filter): same token name
            if key not in fb:
                print(f"MISSING fallback --{key} in [{theme}] @supports block")
                failures += 1
                continue
            opaque = parse_color(fb[key])
            if opaque[3] != 1.0:
                print(f"NON-OPAQUE fallback --{key} in [{theme}]: {fb[key]}")
                failures += 1
            for tname, trgb in texts.items():
                r = contrast(trgb, opaque[:3])
                ok = r >= AA_MIN
                failures += not ok
                rows.append((theme, s, "fallback-opaque", tname,
                             f"{r:.2f}", "PASS" if ok else "FAIL"))

    print(f"{'theme':<6} {'surface':<7} {'case':<22} {'text':<19} {'ratio':<6} result")
    for row in rows:
        print(f"{row[0]:<6} {row[1]:<7} {row[2]:<22} {row[3]:<19} {row[4]:<6} {row[5]}")
    print(f"\n{len(rows)} checks, {failures} failures "
          f"(WCAG AA normal-text threshold {AA_MIN}:1)")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
