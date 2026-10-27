"""Assemble the static site.

Each page in _src/pages/*.html starts with a meta comment:
    <!--meta page="home" title="..." description="..."-->
followed by the page's <main> content. This script wraps it with the shared
<head>, SVG sprite, header and footer, and writes the finished page to the
project root. Run:  python _src/build.py
"""
import pathlib
import re
import struct

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "_src"
PARTIALS = {p.stem: p.read_text(encoding="utf-8") for p in (SRC / "partials").glob("*.html")}
META = re.compile(r'<!--meta\s+(.*?)-->', re.S)
ATTR = re.compile(r'(\w+)="(.*?)"', re.S)

# Subject box per photo: left, top, right, bottom as % of the image. The
# framing engine in main.js keeps this box fully visible and clear of overlays;
# the build also writes its centre as a no-JS object-position fallback.
# None means the whole frame is texture and any crop is fine.
FOCUS = {
    "advisory-meeting": (28, 18, 56, 37),
    "agri-seedling": (44, 15, 70, 50),
    "agri-rows": (34, 40, 78, 55),
    "mining-pit": (40, 40, 86, 55),
    "agri-tractor": (46, 45, 58, 56),
    "agro-processing": (26, 12, 37, 30),
    "boardroom": (35, 30, 70, 50),
    "construction-aerial": None,
    "crystal-trust-learners": (44, 28, 62, 55),
    "engineer-lab": (60, 22, 74, 45),
    "engineering-automation": (78, 30, 95, 60),
    "engraving-family-table": (20, 28, 75, 60),
    "engraving-household": (20, 29, 80, 70),
    "executive-portrait": (45, 9, 56, 25),
    "family-home": (30, 8, 68, 28),
    "harare-aloe-view": (44, 25, 62, 38),
    "harare-cbd-dusk": (38, 46, 66, 56),
    "harare-kopje": (40, 46, 72, 58),
    "harare-panorama": (30, 45, 75, 60),
    "hero-harare-skyline": (40, 40, 82, 57),
    "leisure-estate": (48, 4, 96, 30),
    "logistics-depot-night": None,
    "manufacturing-robotics": (22, 27, 37, 45),
    "market-trader": (25, 30, 42, 50),
    "mining-conveyor": (30, 40, 80, 80),
    "mining-plant": (22, 22, 88, 60),
    "pioneer-handover": (25, 10, 75, 35),
    "savanna-sunset": (28, 30, 75, 60),
    "sme-entrepreneur": (58, 8, 72, 28),
    "student-classroom": (38, 20, 60, 45),
    "student-writing": (40, 22, 60, 48),
    "warehouse-stock": None,
}
# Cache-busting stamp for the stylesheet and script, from their contents.
import hashlib
VER = hashlib.sha1((ROOT / "assets/css/style.css").read_bytes() + (ROOT / "assets/js/main.js").read_bytes()).hexdigest()[:8]

# Paste the channel URL here; every YouTube icon stays hidden while it is empty.
YOUTUBE_URL = ""
YT = re.compile(r'\s*<a\b[^>]*data-youtube[^>]*>.*?</a>', re.S)

IMG = re.compile(r'<img\b[^>]*?src="assets/img/([\w-]+)\.(webp|png)"[^>]*>')


def image_size(path: pathlib.Path):
    """Pixel size read from the file header (WebP or PNG)."""
    b = path.read_bytes()[:40]
    if b[:4] == b"\x89PNG":
        return struct.unpack(">II", b[16:24])
    kind = b[12:16]
    if kind == b"VP8X":
        return 1 + int.from_bytes(b[24:27], "little"), 1 + int.from_bytes(b[27:30], "little")
    if kind == b"VP8L":
        v = int.from_bytes(b[21:25], "little")
        return 1 + (v & 0x3FFF), 1 + ((v >> 14) & 0x3FFF)
    w, h = struct.unpack("<HH", b[26:30])
    return w & 0x3FFF, h & 0x3FFF


def set_attr(tag: str, name: str, value: str) -> str:
    pat = re.compile(r'\s%s="[^"]*"' % name)
    if pat.search(tag):
        return pat.sub(f' {name}="{value}"', tag, count=1)
    return tag[:-1] + f' {name}="{value}">'


def stamp(m: re.Match) -> str:
    tag, name, ext = m.group(0), m.group(1), m.group(2)
    w, h = image_size(ROOT / "assets/img" / f"{name}.{ext}")
    tag = set_attr(set_attr(tag, "width", str(w)), "height", str(h))
    if ext != "webp" or 'data-focus=' in tag or 'class="icon"' in tag or 'object-fit:contain' in tag:
        return tag
    box = FOCUS[name]
    if box is None:
        return tag
    l, t, r, b = box
    tag = set_attr(tag, "data-focus", f"{l} {t} {r} {b}")
    fallback = f"object-position:{(l + r) / 2:g}% {(t + b) / 2:g}%"
    style = re.search(r'\sstyle="([^"]*)"', tag)
    rest = re.sub(r'object-position:[^;"]*;?', "", style.group(1)).strip("; ") if style else ""
    return set_attr(tag, "style", fallback + (";" + rest if rest else ""))


HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{description}">
<meta name="theme-color" content="#061634">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Lamcent Capital">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:image" content="assets/img/hero-harare-skyline.webp">
<link rel="icon" type="image/png" href="assets/img/favicon.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Geist:wght@300..700&family=Geist+Mono:wght@400;500&family=Caveat:wght@500;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="assets/css/style.css?v={ver}">
<script>document.documentElement.classList.add('js')</script>
</head>
<body id="top" data-page="{page}">
"""

TAIL = """
<script src="assets/js/main.js?v={ver}" defer></script>
</body>
</html>
"""


def build(path: pathlib.Path) -> None:
    raw = path.read_text(encoding="utf-8")
    m = META.search(raw)
    meta = dict(ATTR.findall(m.group(1)))
    content = raw[m.end():].strip()
    page = meta["page"]

    header = re.sub(r"\{\{cur:(\w+)\}\}", lambda x: ' aria-current="page"' if x.group(1) == page else "", PARTIALS["header"])
    footer = PARTIALS["footer"].replace("{{page}}", page)

    html = (
        HEAD.format(title=meta["title"], description=meta["description"], page=page, ver=VER)
        + PARTIALS["sprite"]
        + header
        + '\n<main id="main">\n'
        + content
        + "\n</main>\n"
        + footer
        + TAIL.replace("{ver}", VER)
    )
    html = IMG.sub(stamp, html)
    html = html.replace("{{youtube}}", YOUTUBE_URL) if YOUTUBE_URL else YT.sub("", html)
    out = ROOT / path.name
    out.write_text(html, encoding="utf-8")
    print("built", out.name)


if __name__ == "__main__":
    for p in sorted((SRC / "pages").glob("*.html")):
        build(p)
