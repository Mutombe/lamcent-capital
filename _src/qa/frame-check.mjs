// Photo framing QA. Run with the browser-automation runner against the local server:
//   node <browser-automation>/browser.mjs http://127.0.0.1:5173/ --script _src/qa/frame-check.mjs
// For every page it checks, at 1280 and 390 wide (and every hero at six screen sizes):
//   - each data-focus subject is fully inside its frame and not under any overlay
//   - no photo is stretched (object-fit cover/contain, or exact aspect)
//   - every image has loaded
//   - no text sits on a photo unless it belongs to a designed overlay component
const PAGES = ['index.html', 'about.html', 'investment-focus.html', 'portfolio.html', 'insights.html', 'contact.html'];
const BODY_SIZES = [[1280, 800], [390, 844]];
const HERO_SIZES = [[1920, 1080], [1440, 900], [1366, 768], [1024, 768], [390, 844], [375, 667]];

// Runs in the page. Recomputes framing from the applied object-position, independently of main.js.
function inspect(heroOnly) {
  const SCOPE = '.hero__card, .bento__photo, .slide, .pcard, .split__media, .post__media, .feature-post__media, .compare, .mosaic-gallery__tile, .sector__media, .article__media, .plate, .connect';
  const OBST = '.funds-card, .slide__tag, .post__chip, .pcard__body > *, .glass-stat, .hero h1, .hero__sub, .hero__actions, .crumbs, .scroll-cue, .compare__label, figcaption, .plate__stamp, [data-obstacle]';
  const HEAD = '.site-header .brand, .site-header .nav-pill, .site-header .header-cta, .site-header .menu-toggle';
  const ALLOWED_TEXT = '.hero__inner, .pcard__body, .connect, .slide__tag, .post__chip, .funds-card, .glass-stat, .compare__label, figcaption, .plate__stamp, .site-header, .preloader, .drawer, .compare__line';
  const pos = (el) => { let x = 0, y = 0; while (el) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; } return { x, y }; };
  const ov = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  const out = { framing: [], stretched: [], broken: [], textOnPhoto: [] };
  const name = (img) => img.getAttribute('src').split('/').pop();
  const imgs = [...document.querySelectorAll('main img')].filter((i) => !heroOnly || i.closest('.hero'));

  imgs.forEach((img) => {
    if (!img.offsetWidth) return; // filtered out or hidden at this size
    if (!img.complete || !img.naturalWidth) { out.broken.push(name(img)); return; }
    const W = img.offsetWidth, H = img.offsetHeight, nw = img.naturalWidth, nh = img.naturalHeight;
    const fit = getComputedStyle(img).objectFit;
    if (!['cover', 'contain'].includes(fit) && Math.abs(W / H - nw / nh) > 0.01 * (nw / nh)) out.stretched.push(`${name(img)} ${fit} ${W}x${H}`);

    const f = (img.dataset.focus || '').trim();
    if (!f) return;
    const [l, t, r, b] = f.split(/\s+/).map((v) => v / 100);
    const scope = img.closest(SCOPE) || img.parentElement;
    const sp = pos(scope), ip = pos(img);
    const s = fit === 'contain' ? Math.min(W / nw, H / nh) : Math.max(W / nw, H / nh);
    const rw = nw * s, rh = nh * s;
    const [px, py] = getComputedStyle(img).objectPosition.split(' ');
    const conv = (v, free) => v.endsWith('%') ? parseFloat(v) / 100 * free : parseFloat(v);
    const offX = conv(px, W - rw), offY = conv(py, H - rh);
    const ix = ip.x - sp.x, iy = ip.y - sp.y;
    const V = [Math.max(ix, 0), Math.max(iy, 0), Math.min(ix + W, scope.offsetWidth), Math.min(iy + H, scope.offsetHeight)];
    const S = [ix + offX + l * rw, iy + offY + t * rh, ix + offX + r * rw, iy + offY + b * rh];
    const area = (S[2] - S[0]) * (S[3] - S[1]);
    const outside = 1 - ov(S, V) / area;
    const obs = [...scope.querySelectorAll(OBST)].filter((o) => o.offsetWidth).map((o) => {
      const p = pos(o); return { o, r: [p.x - sp.x, p.y - sp.y, p.x - sp.x + o.offsetWidth, p.y - sp.y + o.offsetHeight] };
    });
    if (scope.matches('.hero__card')) {
      const sr = scope.getBoundingClientRect();
      document.querySelectorAll(HEAD).forEach((o) => {
        if (!o.offsetWidth) return;
        const q = o.getBoundingClientRect();
        obs.push({ o, r: [q.left - sr.left, q.top - sr.top, q.right - sr.left, q.bottom - sr.top] });
      });
    }
    let covered = 0; const by = [];
    obs.forEach(({ o, r: rr }) => { const a = ov(S, rr); if (a > 0) { covered += a; by.push(o.className || o.tagName); } });
    covered /= area;
    if (outside > 0.002 || covered > 0.002) out.framing.push(`${name(img)} in .${scope.className.split(' ')[0]}: outside ${(outside * 100).toFixed(1)}% covered ${(covered * 100).toFixed(1)}%${by.length ? ' by ' + by.join(', ') : ''}`);
  });

  // text on photos: any element with its own text whose box meets a photo's visible area
  const photos = imgs.filter((i) => i.offsetWidth && /\.(webp|jpe?g)$/.test(i.getAttribute('src')) && !i.classList.contains('icon') && getComputedStyle(i).objectFit !== 'contain').map((i) => {
    const a = i.getBoundingClientRect(), c = (i.closest(SCOPE) || i.parentElement).getBoundingClientRect();
    return { i, r: [Math.max(a.left, c.left), Math.max(a.top, c.top), Math.min(a.right, c.right), Math.min(a.bottom, c.bottom)] };
  });
  const walker = document.createTreeWalker(document.querySelector('main'), NodeFilter.SHOW_TEXT);
  const seen = new Set();
  while (walker.nextNode()) {
    const n = walker.currentNode, el = n.parentElement;
    if (!n.textContent.trim() || seen.has(el) || el.closest(ALLOWED_TEXT) || !el.offsetWidth) continue;
    seen.add(el);
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || +cs.opacity === 0) continue;
    const range = document.createRange(); range.selectNodeContents(el);
    const q = range.getBoundingClientRect(), rr = [q.left, q.top, q.right, q.bottom];
    // clip to any ancestor that hides overflow (collapsed accordions, masks)
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const st = getComputedStyle(a);
      if (st.overflow !== 'visible' || st.overflowY !== 'visible') {
        const c = a.getBoundingClientRect();
        rr[0] = Math.max(rr[0], c.left); rr[1] = Math.max(rr[1], c.top); rr[2] = Math.min(rr[2], c.right); rr[3] = Math.min(rr[3], c.bottom);
      }
    }
    photos.forEach(({ i, r }) => {
      if (i.closest('a, article, figure, div') && el.contains(i)) return;
      if (ov(rr, r) > 4) out.textOnPhoto.push(`"${n.textContent.trim().slice(0, 40)}" over ${name(i)}`);
    });
  }
  return out;
}

export default async function run(page) {
  const origin = new URL(page.url()).origin;
  const report = {};
  const visit = async (file, w, h, heroOnly) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto(`${origin}/${file}`, { waitUntil: 'load' });
    await page.evaluate(() => { try { sessionStorage.setItem('lc-intro', '1'); } catch (e) {} });
    await page.evaluate(() => document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager'; }));
    if (!heroOnly) {
      // walk the page so reveals, lazy images and counters settle
      const total = await page.evaluate(() => document.documentElement.scrollHeight);
      for (let y = 0; y < total; y += Math.round(h * 0.7)) { await page.evaluate((yy) => window.scrollTo(0, yy), y); await page.waitForTimeout(120); }
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    await page.waitForFunction(() => [...document.images].every((i) => i.complete), null, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1600);
    const r = await page.evaluate(inspect, heroOnly);
    const bad = Object.fromEntries(Object.entries(r).filter(([, v]) => v.length));
    if (Object.keys(bad).length) report[`${file} @${w}x${h}${heroOnly ? ' hero' : ''}`] = bad;
  };
  for (const file of PAGES) {
    for (const [w, h] of BODY_SIZES) await visit(file, w, h, false);
    for (const [w, h] of HERO_SIZES) await visit(file, w, h, true);
  }
  return Object.keys(report).length ? report : 'PASS: every subject framed and uncovered, nothing stretched, all images loaded, no stray text on photos';
}
