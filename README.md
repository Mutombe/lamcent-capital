# Lamcent Capital: website

A static site with no framework and no install step. Open `index.html`, or serve the folder:

```
python -m http.server 5173
```

Then visit http://127.0.0.1:5173.

## Structure

| Path | What it is |
|---|---|
| `index.html`, `about.html`, `investment-focus.html`, `portfolio.html`, `insights.html`, `contact.html` | Built pages. Don't edit these directly. |
| `_src/pages/*.html` | Page content: edit here |
| `_src/partials/` | Shared header, footer and SVG sprite (3D shapes, card art, icons) |
| `_src/build.py` | Stamps the partials into each page: `python _src/build.py` |
| `assets/css/style.css` | All styles. Brand tokens are at the top. |
| `assets/js/main.js` | All motion and interaction |
| `assets/img/` | Optimised photos (`.webp`), logos and dotted maps (`map-*.svg`) |

## Before launch

- **Stock photos.** Most `istockphoto-*` images are watermarked comps. Licence them and replace the matching `.webp` in `assets/img/` with the same filename. The unwatermarked photos are the hero skyline, Pioneer handover, advisory meeting, Crystal Trust, leisure estate, seedling, mining conveyor, engineering and SME images.
- **Leadership.** Portraits are monogram cards. Add real headshots by placing an `<img>` inside each `.member__portrait`. Titles for Diana Tarupuwa and Ronald Tirivamwe weren't on the old site, so they read "Executive Team".
- **Figures.** All figures come from lamcentcapital.com. "US$62M+" is the sum of the disclosed commitments: US$47M hotel, US$8M North West High and US$7.5M Pioneer. Confirm before publishing.
- **Forms.** The contact and newsletter forms open a pre-filled email to lameck@lamcentcapital.com, because there's no backend. Connect them to Formspree, Netlify Forms or a CRM when ready.
- **Insights articles.** The three perspective pieces are new copy written from the firm's own published positions. Have them reviewed.
