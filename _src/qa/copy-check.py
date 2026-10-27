"""Copy rules, checked mechanically against the built pages. Every count must be zero.
Run after the build:  python _src/qa/copy-check.py
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parents[2]
RULES = {
    "em/en dash": r"[—–]",
    "hollow word": r"\b(seamless(ly)?|robust|leverag(e|es|ed|ing)|elevat(e|es|ed|ing)|unlock(s|ed|ing)?|bespoke|cutting[- ]edge|comprehensive|tailored|holistic)\b",
    "not just / not only": r"\bnot (just|only)\b",
    "fragment-pair heading": r"<h[1-6][^>]*>[^<]*\.\s+[A-Z][^<]*\.\s*</h[1-6]>",
}
failed = False
for page in sorted(ROOT.glob("*.html")):
    text = page.read_text(encoding="utf-8")
    for name, pat in RULES.items():
        hits = re.findall(pat, text, flags=re.I if name != "fragment-pair heading" else 0)
        if hits:
            failed = True
            print(f"{page.name}: {len(hits)} x {name}")
print("FAIL" if failed else "PASS: 0 dashes, 0 hollow words, 0 'not just', 0 fragment-pair headings")
sys.exit(1 if failed else 0)
