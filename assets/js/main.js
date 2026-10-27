/* Lamcent Capital : interactions & motion
   Vanilla JS, no dependencies. Everything degrades to a readable static page. */
(() => {
  const doc = document.documentElement;
  const body = document.body;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ---------- Preloader (once per session) ---------- */
  const preloader = $('.preloader');
  let seen = false;
  try { seen = sessionStorage.getItem('lc-intro') === '1'; } catch (e) { /* storage blocked */ }
  if (!preloader || seen || reduced) {
    if (preloader) preloader.remove();
    requestAnimationFrame(() => body.classList.add('is-loaded'));
  } else {
    const start = performance.now();
    const finish = () => {
      const wait = Math.max(0, 1250 - (performance.now() - start));
      setTimeout(() => {
        preloader.classList.add('is-done');
        body.classList.add('is-loaded');
        try { sessionStorage.setItem('lc-intro', '1'); } catch (e) { /* ignore */ }
        setTimeout(() => preloader.remove(), 1100);
      }, wait);
    };
    if (document.readyState === 'complete') finish(); else window.addEventListener('load', finish, { once: true });
    setTimeout(finish, 3500); // never block on a slow asset
  }

  /* ---------- Nav glider ---------- */
  const pill = $('.nav-pill');
  if (pill) {
    const glider = $('.nav-glider', pill);
    const current = $('a[aria-current="page"]', pill);
    const moveTo = (a) => {
      if (!a) { glider.style.width = '0px'; return; }
      glider.style.width = a.offsetWidth + 'px';
      glider.style.transform = `translateX(${a.offsetLeft}px)`;
    };
    const reset = () => {
      moveTo(current);
      $$('a', pill).forEach((a) => a.style.color = '');
    };
    $$('a', pill).forEach((a) => a.addEventListener('mouseenter', () => {
      moveTo(a);
      $$('a', pill).forEach((x) => x.style.color = x === a ? '#fff' : '');
    }));
    pill.addEventListener('mouseleave', reset);
    window.addEventListener('resize', reset);
    document.fonts && document.fonts.ready.then(reset);
    reset();
  }

  /* ---------- Header: becomes floating bar after the hero, hides on scroll down ---------- */
  const header = $('.site-header');
  const hero = $('.hero');
  if (header && hero) {
    let lastY = window.scrollY;
    let fixed = false;
    const onScroll = () => {
      const y = window.scrollY;
      const threshold = hero.offsetHeight * 0.55;
      if (y > threshold && !fixed) { header.classList.add('is-fixed'); fixed = true; }
      else if (y <= threshold && fixed) { header.classList.remove('is-fixed', 'is-hidden'); fixed = false; }
      if (fixed) header.classList.toggle('is-hidden', y > lastY && y - lastY > 4 && y > threshold + 200);
      if (fixed && y < lastY - 4) header.classList.remove('is-hidden');
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile drawer ---------- */
  const drawer = $('.drawer');
  if (drawer) {
    const open = () => { drawer.classList.add('is-open'); drawer.setAttribute('aria-hidden', 'false'); body.style.overflow = 'hidden'; $('.drawer [data-close]').focus(); };
    const close = () => { drawer.classList.remove('is-open'); drawer.setAttribute('aria-hidden', 'true'); body.style.overflow = ''; };
    $$('.menu-toggle').forEach((b) => b.addEventListener('click', open));
    $$('[data-close], .drawer__scrim', drawer).forEach((b) => b.addEventListener('click', close));
    $$('nav a', drawer).forEach((a) => a.addEventListener('click', close));
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  /* ---------- Split headings into masked lines (on <br>) ---------- */
  $$('[data-split]').forEach((el) => {
    const parts = el.innerHTML.split(/<br\s*\/?>/i);
    el.innerHTML = parts.map((p, i) => `<span class="line"><span style="--li:${i}">${p.trim()}</span></span>`).join('');
  });

  /* ---------- Count-up ----------
     Any short figure in the page ("US$7.5M", "150+", "5,000ha", "47") counts up whenever it
     scrolls into view, in either direction. Years, phone numbers and "01"-style indices are skipped. */
  const FIGURE = /^(US\$|~)?(\d{1,3}(?:,\d{3})+|[1-9]\d*|0)(\.\d+)?(M\+|M|B|k|\+|ha|Mt|%)?$/;
  $$('main *').forEach((el) => {
    if (el.dataset.count || el.closest('a, button, .pin, .crumbs, .bars, time, [data-nocount]')) return;
    if ([...el.children].some((c) => c.tagName !== 'SUP')) return;
    const m = el.textContent.trim().match(FIGURE);
    if (!m) return;
    const [, pre = '', int, frac = '', suf = ''] = m;
    if (!pre && !suf && /^(19|20)\d\d$/.test(int)) return; // a year
    el.dataset.count = parseFloat(int.replace(/,/g, '') + frac);
    if (frac) el.dataset.decimals = frac.length - 1;
    if (pre) el.dataset.prefix = pre;
    const sup = el.querySelector('sup');
    if (sup) el.dataset.sup = sup.textContent; else if (suf) el.dataset.suffix = suf;
  });
  const fmt = (n, dec) => n.toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec });
  const countReset = (el) => {
    if (reduced) return;
    cancelAnimationFrame(el._raf);
    el.innerHTML = (el.dataset.prefix || '') + fmt(0, parseInt(el.dataset.decimals || '0', 10)) + (el.dataset.suffix || '') + (el.dataset.sup ? `<sup>${el.dataset.sup}</sup>` : '');
  };
  const countUp = (el) => {
    const to = parseFloat(el.dataset.count);
    const dec = parseInt(el.dataset.decimals || '0', 10);
    const pre = el.dataset.prefix || '';
    const suf = el.dataset.suffix || '';
    const supEl = el.dataset.sup ? `<sup>${el.dataset.sup}</sup>` : '';
    if (reduced) { el.innerHTML = pre + fmt(to, dec) + suf + supEl; return; }
    const dur = 1800;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 4);
      el.innerHTML = pre + fmt(to * e, dec) + suf + supEl;
      if (p < 1) el._raf = requestAnimationFrame(tick);
    };
    cancelAnimationFrame(el._raf);
    el._raf = requestAnimationFrame(tick);
  };

  /* ---------- Dot maps: spotlight, selectable pins, linked routes ----------
     A cyan light, masked by the map's own dots, follows the pointer (or the selected pin).
     Pins select on hover, tap or keyboard and the matching corridor lights up. While the map
     is on screen and nobody is interacting, it tours its pins on its own. */
  function initMap(map) {
    const img = $('img', map);
    const pins = $$('.pin', map);
    const panel = map.closest('.map-panel');
    const glow = document.createElement('span');
    glow.className = 'dotmap__glow';
    glow.setAttribute('aria-hidden', 'true');
    const mask = `url("${img.getAttribute('src')}")`;
    glow.style.webkitMaskImage = mask;
    glow.style.maskImage = mask;
    img.after(glow);
    const setLight = (x, y) => { map.style.setProperty('--mx', x + '%'); map.style.setProperty('--my', y + '%'); };
    const keyOf = (pin) => `${pin.dataset.lon},${pin.dataset.lat}`;
    let active = null, idle = 0, visible = false, timer;
    const select = (pin) => {
      active = pin;
      const key = keyOf(pin);
      pins.forEach((p) => p.classList.toggle('is-active', p === pin));
      $$('svg.routes path', map).forEach((r) => r.classList.toggle('is-hot', r.dataset.to === key));
      map.classList.toggle('has-route', !!$(`svg.routes path[data-to="${key}"]`, map));
      setLight(parseFloat(pin.style.left), parseFloat(pin.style.top));
      if (panel) $$('.legend li[data-pin]', panel).forEach((li) => li.classList.toggle('is-on', li.dataset.pin === key));
    };
    const use = (pin) => { idle = Date.now(); select(pin); };
    pins.forEach((pin) => {
      pin.tabIndex = 0;
      pin.setAttribute('role', 'button');
      pin.setAttribute('aria-label', $('.pin__label', pin).textContent);
      pin.addEventListener('pointerenter', () => use(pin));
      pin.addEventListener('click', () => use(pin));
      pin.addEventListener('focus', () => use(pin));
    });
    map.addEventListener('pointermove', (e) => {
      if (e.pointerType !== 'mouse') return;
      const r = map.getBoundingClientRect();
      idle = Date.now();
      setLight((e.clientX - r.left) / r.width * 100, (e.clientY - r.top) / r.height * 100);
    });
    map.addEventListener('pointerleave', () => { if (active) select(active); });
    if (panel) $$('.legend li[data-pin]', panel).forEach((li) => {
      li.tabIndex = 0;
      const go = () => { const pin = pins.find((p) => keyOf(p) === li.dataset.pin); if (pin) use(pin); };
      li.addEventListener('pointerenter', go);
      li.addEventListener('click', go);
      li.addEventListener('focus', go);
    });
    const tour = () => {
      if (visible && Date.now() - idle > 5000) select(pins[(pins.indexOf(active) + 1) % pins.length]);
    };
    new IntersectionObserver(([en]) => {
      visible = en.isIntersecting;
      clearInterval(timer);
      if (!visible) return;
      if (!active) select(pins[0]);
      if (!reduced && pins.length > 1) timer = setInterval(tour, 2600);
    }, { threshold: 0.35 }).observe(map);
  }

  /* ---------- Map pins & routes ---------- */
  $$('.dotmap[data-bounds]').forEach((map) => {
    const [lon0, lat1, spanLon, spanLat] = map.dataset.bounds.split(',').map(Number);
    const pos = (lon, lat) => [((lon - lon0) / spanLon) * 100, ((lat1 - lat) / spanLat) * 100];
    $$('.pin', map).forEach((pin, i) => {
      const [x, y] = pos(+pin.dataset.lon, +pin.dataset.lat);
      pin.style.left = x + '%';
      pin.style.top = y + '%';
      pin.style.transitionDelay = (0.25 + i * 0.09) + 's';
    });
    const svg = $('svg.routes', map);
    if (svg && map.dataset.routes) {
      const [vw, vh] = svg.getAttribute('viewBox').split(' ').slice(2).map(Number);
      const ns = 'http://www.w3.org/2000/svg';
      map.dataset.routes.split(';').forEach((r, i) => {
        const [a, b] = r.split('>').map((s) => s.split(',').map(Number));
        const [x1, y1] = pos(a[0], a[1]).map((v, k) => v / 100 * (k ? vh : vw));
        const [x2, y2] = pos(b[0], b[1]).map((v, k) => v / 100 * (k ? vh : vw));
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        const dx = x2 - x1, dy = y2 - y1;
        const bend = 0.22;
        const cx = mx - dy * bend, cy = my + dx * bend;
        const d = `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
        const solid = document.createElementNS(ns, 'path');
        solid.setAttribute('d', d);
        solid.setAttribute('class', 'draw');
        svg.appendChild(solid);
        const len = solid.getTotalLength();
        solid.style.setProperty('--len', len);
        solid.style.transitionDelay = (0.6 + i * 0.15) + 's';
        solid.style.strokeDasharray = `${len} ${len}`;
        solid.addEventListener('transitionend', () => { solid.style.strokeDasharray = '4 5'; }, { once: true });
        solid.dataset.to = b.join(',');
        // a light that travels the corridor
        if (!reduced) {
          const dot = document.createElementNS(ns, 'circle');
          dot.setAttribute('r', Math.max(vw, vh) / 260);
          dot.setAttribute('class', 'runner');
          const anim = document.createElementNS(ns, 'animateMotion');
          anim.setAttribute('dur', (2.6 + i * 0.35) + 's');
          anim.setAttribute('repeatCount', 'indefinite');
          anim.setAttribute('path', d);
          dot.appendChild(anim);
          svg.appendChild(dot);
        }
      });
    }
    initMap(map);
  });

  /* ---------- Donut charts ---------- */
  const drawDonut = (el) => {
    const segs = $$('.seg', el);
    const r = 70;
    const C = 2 * Math.PI * r;
    const total = segs.reduce((s, c) => s + parseFloat(c.dataset.val), 0);
    let acc = 0;
    segs.forEach((c, i) => {
      const v = parseFloat(c.dataset.val) / total;
      const gap = 3;
      c.style.strokeDashoffset = -acc * C;
      c.style.transitionDelay = (i * 0.12) + 's';
      requestAnimationFrame(() => { c.style.strokeDasharray = `${Math.max(0, v * C - gap)} ${C}`; });
      acc += v;
    });
  };

  /* ---------- Interactive charts ---------- */
  // Cumulative step bars, built from data-series="Name|value|colour;..." in data-step units
  $$('.bars--steps').forEach((el) => {
    const series = el.dataset.series.split(';').map((s) => { const [name, v, c] = s.split('|'); return { name, v: +v, c }; });
    const step = parseFloat(el.dataset.step || '1');
    const total = series.reduce((a, s) => a + s.v, 0);
    const n = Math.ceil(total / step - 1e-9);
    const ends = [];
    series.reduce((a, s) => { ends.push(a + s.v); return a + s.v; }, 0);
    let bars = '';
    for (let i = 1; i <= n; i++) {
      const k = ends.findIndex((e) => (i - 0.5) * step < e);
      bars += `<i style="--h:${(Math.min(i * step, total) / total * 100).toFixed(2)}%;--c:${series[k].c};--i:${i}" data-k="${k}"></i>`;
    }
    const money = (v) => 'US$' + (Math.round(v * 10) / 10) + 'M';
    el.style.setProperty('--n', n);
    el.innerHTML = `<div class="bars__plot">${bars}<div class="bars__readout" aria-live="polite"><b></b><span></span></div></div>`
      + `<div class="bars__keys">${series.map((s, k) => `<button type="button" aria-pressed="false" data-k="${k}" style="--c:${s.c}"><i></i>${s.name}</button>`).join('')}</div>`;
    const out = $('.bars__readout', el);
    let pinned = null;
    const show = (k) => {
      el.classList.toggle('has-focus', k !== null);
      $$('.bars__plot i', el).forEach((b) => b.classList.toggle('is-on', +b.dataset.k === k));
      $$('.bars__keys button', el).forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.k === pinned)));
      const s = series[k];
      out.firstChild.textContent = s ? money(s.v) : money(total);
      out.lastChild.textContent = s ? `${s.name}, ${Math.round(s.v / total * 100)}% of the total` : 'Committed across three flagship platforms';
    };
    const pin = (k) => { pinned = pinned === k ? null : k; show(pinned); };
    show(null);
    $$('.bars__plot i', el).forEach((b) => {
      b.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(+b.dataset.k); });
      b.addEventListener('click', () => pin(+b.dataset.k));
    });
    $('.bars__plot', el).addEventListener('pointerleave', () => show(pinned));
    $$('.bars__keys button', el).forEach((b) => b.addEventListener('click', () => pin(+b.dataset.k)));
  });

  // Hover, tap or keyboard isolates one item; a second tap releases it
  const selectable = (items, host, onShow) => {
    let pinned = null;
    const show = (i) => {
      host.classList.toggle('has-focus', i !== null);
      items.forEach((it, k) => { it.classList.toggle('is-on', k === i); if (it.getAttribute('role') === 'button') it.setAttribute('aria-pressed', String(k === pinned)); });
      if (onShow) onShow(i);
    };
    const pin = (i) => { pinned = pinned === i ? null : i; show(pinned); };
    items.forEach((it, i) => {
      it.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') show(i); });
      it.addEventListener('pointerleave', () => show(pinned));
      it.addEventListener('click', () => pin(i));
      it.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pin(i); } });
    });
    return pin;
  };
  const asButton = (el) => { el.tabIndex = 0; el.setAttribute('role', 'button'); el.setAttribute('aria-pressed', 'false'); return el; };

  $$('.hbars').forEach((list) => selectable($$('.hbar', list).map(asButton), list));

  $$('.donut').forEach((d) => {
    const segs = $$('.seg', d);
    const rows = $$('.legend li', d.parentElement).map(asButton);
    const b = $('.donut__center b', d), sp = $('.donut__center span', d);
    const base = [b.textContent, sp.textContent];
    const render = (i) => {
      segs.forEach((s, k) => s.classList.toggle('is-on', k === i));
      if (i === null || !rows[i]) { b.textContent = base[0]; sp.textContent = base[1]; return; }
      const [val, pct] = rows[i].lastElementChild.textContent.split('·').map((t) => t.trim());
      b.textContent = val;
      sp.textContent = rows[i].children[1].textContent + (pct ? `, ${pct}` : '');
    };
    const pin = selectable(rows, d, render);
    segs.forEach((s, i) => {
      s.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') { d.classList.add('has-focus'); render(i); } });
      s.addEventListener('click', () => pin(i));
    });
  });

  /* ---------- Gauge ---------- */
  $$('.gauge').forEach((g) => {
    const arc = $('.arc', g);
    const len = arc.getTotalLength();
    const pct = parseFloat(g.dataset.pct || '1');
    g.style.setProperty('--len', len);
    g.style.setProperty('--off', len * (1 - pct));
  });

  /* ---------- Reveal observer ---------- */
  /* ---------- Then / now comparison slider ---------- */
  const sweepCompare = (el) => {
    const input = $('input', el);
    if (reduced || !input) return;
    const from = 88, to = 50, dur = 1600, t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      const v = from + (to - from) * e;
      el.style.setProperty('--pos', v + '%');
      input.value = v;
      if (p < 1 && !el.dataset.touched) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  $$('.compare').forEach((el) => {
    const input = $('input', el);
    input.addEventListener('input', () => {
      el.dataset.touched = '1';
      el.style.setProperty('--pos', input.value + '%');
    });
  });

  const revealSel = '[data-reveal], [data-split], [data-mask], .dotmap, .stat, .team, .gauge, .compare, .mosaic-gallery';
  const replaySel = '.bars, .hbars, .donut, [data-count]'; // these play again every time they come into view
  const onIn = (el) => {
    el.classList.add('is-in');
    if (el.matches('[data-count]')) countUp(el);
    if (el.matches('.donut')) drawDonut(el);
    if (el.matches('.compare')) sweepCompare(el);
  };
  const onOut = (el) => {
    el.classList.remove('is-in');
    if (el.matches('[data-count]')) countReset(el);
    if (el.matches('.donut')) $$('.seg', el).forEach((c) => { c.style.transitionDelay = '0s'; c.style.strokeDasharray = '0 999'; });
  };
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { onIn(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -10% 0px', threshold: 0.12 });
    $$(revealSel).forEach((el) => { if (!el.matches(replaySel)) io.observe(el); });
    const replay = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        const on = en.target.classList.contains('is-in');
        if (en.isIntersecting && !on) onIn(en.target);
        else if (!en.isIntersecting && on) onOut(en.target);
      });
    });
    $$(replaySel).forEach((el) => replay.observe(el));
  } else {
    $$(revealSel + ', ' + replaySel).forEach(onIn);
  }

  /* ---------- Approach list: sliding highlight ---------- */
  $$('.approach__list').forEach((list) => {
    const ind = $('.approach__indicator', list);
    const items = $$('.approach__item', list);
    const activate = (item) => {
      items.forEach((i) => i.classList.toggle('is-active', i === item));
      // measure after the description opens
      const place = () => {
        ind.style.opacity = '1';
        ind.style.height = item.offsetHeight + 'px';
        ind.style.transform = `translateY(${item.offsetTop}px)`;
      };
      place();
      setTimeout(place, 560);
    };
    items.forEach((item) => {
      item.addEventListener('mouseenter', () => activate(item));
      item.addEventListener('click', () => activate(item));
      item.addEventListener('focusin', () => activate(item));
    });
    const io = new IntersectionObserver((en) => {
      if (en[0].isIntersecting) { activate(items[0]); io.disconnect(); }
    }, { threshold: 0.5 });
    io.observe(list);
    window.addEventListener('resize', () => { const a = $('.approach__item.is-active', list); if (a) activate(a); });
  });

  /* ---------- Marquee: duplicate content for a seamless loop ---------- */
  $$('.marquee__track').forEach((t) => {
    t.innerHTML += t.innerHTML;
    $$('[data-dup]', t).forEach(() => {});
    Array.from(t.children).slice(t.children.length / 2).forEach((c) => c.setAttribute('aria-hidden', 'true'));
  });

  /* ---------- Photo framing: keep each subject box visible and clear of overlays ----------
     data-focus="L T R B" (% of the image) is stamped by the build. For every frame we try
     65 x 65 object-positions and keep the cheapest:
       cost = 1000 * (outside + covered) + dx^2 + dy^2
     outside/covered are the share of the subject cut off by the frame or hidden under an
     overlay; dx/dy is how far the subject centre sits from the frame centre (as a fraction).
     Layout boxes (offset*) are used throughout, so reveal and hover zooms never skew it. */
  const FRAME_SCOPE = '.hero__card, .bento__photo, .slide, .pcard, .split__media, .post__media, .feature-post__media, .compare, .mosaic-gallery__tile, .sector__media, .article__media, .plate, .connect';
  const OBSTACLES = '.hero__nav, .funds-card, .slide__tag, .post__chip, .pcard__body > *, .glass-stat, .hero h1, .hero__sub, .hero__actions, .crumbs, .scroll-cue, .compare__label, figcaption, .plate__stamp, [data-obstacle]';
  const HEADER_OBSTACLES = '.site-header .brand, .site-header .nav-pill, .site-header .header-cta, .site-header .menu-toggle';
  const offsetPos = (el) => {
    let x = 0, y = 0;
    while (el) { x += el.offsetLeft; y += el.offsetTop; el = el.offsetParent; }
    return { x, y };
  };
  let headerTop = null;
  const overlap = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
  function frame(img) {
    const box = (img.dataset.focus || '').trim().split(/\s+/).map(Number);
    if (box.length !== 4 || box.some(isNaN)) return;
    const scope = img.closest(FRAME_SCOPE) || img.parentElement;
    const W = img.offsetWidth, H = img.offsetHeight, sw = scope.offsetWidth, sh = scope.offsetHeight;
    const nw = img.naturalWidth || +img.getAttribute('width'), nh = img.naturalHeight || +img.getAttribute('height');
    if (!W || !H || !nw || !nh || !sw || !sh) return;
    const s = Math.max(W / nw, H / nh), rw = nw * s, rh = nh * s, ox = rw - W, oy = rh - H;
    const sp = offsetPos(scope), ip = offsetPos(img);
    const ix = ip.x - sp.x, iy = ip.y - sp.y;
    // visible window: the image box clipped by its frame, minus parallax travel
    const pad = img.dataset.parallax && !reduced ? parseFloat(img.dataset.parallax) * 0.35 * H : 0;
    const V = [Math.max(ix, 0), Math.max(iy, 0) + pad, Math.min(ix + W, sw), Math.min(iy + H, sh) - pad];
    const obs = $$(OBSTACLES, scope).filter((o) => o.offsetWidth && !o.contains(img)).map((o) => {
      const p = offsetPos(o);
      return [p.x - sp.x, p.y - sp.y, p.x - sp.x + o.offsetWidth, p.y - sp.y + o.offsetHeight];
    });
    if (scope.matches('.hero__card')) {
      const header = $('.site-header');
      if (header) {
        if (!header.classList.contains('is-fixed')) headerTop = offsetPos(header).y;
        const hr = header.getBoundingClientRect();
        $$(HEADER_OBSTACLES).forEach((o) => {
          if (!o.offsetWidth || getComputedStyle(o).display === 'none') return;
          const r = o.getBoundingClientRect();
          const y = r.top - hr.top + (headerTop || 0) - sp.y;
          obs.push([r.left - sp.x, y, r.left - sp.x + o.offsetWidth, y + o.offsetHeight]);
        });
      }
    }
    const [l, t, r, b] = box.map((v) => v / 100);
    const area = (r - l) * rw * (b - t) * rh;
    const vcx = (V[0] + V[2]) / 2, vcy = (V[1] + V[3]) / 2, vw = V[2] - V[0], vh = V[3] - V[1];
    const N = 64;
    let best = null;
    for (let i = 0; i <= (ox > 0.5 ? N : 0); i++) {
      const offX = ox > 0.5 ? -ox * i / N : 0;
      for (let j = 0; j <= (oy > 0.5 ? N : 0); j++) {
        const offY = oy > 0.5 ? -oy * j / N : 0;
        const S = [ix + offX + l * rw, iy + offY + t * rh, ix + offX + r * rw, iy + offY + b * rh];
        const shown = overlap(S, V);
        const outside = 1 - shown / area;
        const Sv = [Math.max(S[0], V[0]), Math.max(S[1], V[1]), Math.min(S[2], V[2]), Math.min(S[3], V[3])];
        let covered = 0;
        if (shown > 0) obs.forEach((o) => { covered += overlap(Sv, o); });
        covered = Math.min(1, covered / area);
        const dx = ((S[0] + S[2]) / 2 - vcx) / vw, dy = ((S[1] + S[3]) / 2 - vcy) / vh;
        const cost = 1000 * (outside + covered) + dx * dx + dy * dy;
        if (!best || cost < best.cost) best = { cost, offX, offY, outside, covered };
      }
    }
    img.style.objectPosition = `${best.offX.toFixed(1)}px ${best.offY.toFixed(1)}px`;
    img.dataset.framed = `${best.outside.toFixed(3)} ${best.covered.toFixed(3)}`;
  }
  const framed = $$('img[data-focus]').filter((img) => img.dataset.focus.trim());
  const frameAll = (root) => framed.forEach((img) => { if (!root || root.contains(img)) frame(img); });
  framed.forEach((img) => { if (!img.complete) img.addEventListener('load', () => frame(img), { once: true }); });
  frameAll();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => frameAll());
  window.addEventListener('load', () => { frameAll(); setTimeout(frameAll, 1100); });
  let frameTimer;
  window.addEventListener('resize', () => { clearTimeout(frameTimer); frameTimer = setTimeout(frameAll, 120); });

  /* ---------- Carousel ---------- */
  $$('.carousel').forEach((c) => {
    const vp = $('.carousel__viewport', c);
    const bar = $('.carousel__progress span', c);
    const prev = $('[data-prev]', c);
    const next = $('[data-next]', c);
    const update = () => {
      const max = vp.scrollWidth - vp.clientWidth;
      const ratio = vp.clientWidth / vp.scrollWidth;
      const p = max > 0 ? vp.scrollLeft / max : 0;
      bar.style.width = (ratio * 100) + '%';
      bar.style.transform = `translateX(${p * (1 / ratio - 1) * 100}%)`;
      if (prev) prev.disabled = vp.scrollLeft < 4;
      if (next) next.disabled = vp.scrollLeft > max - 4;
    };
    const step = (dir) => {
      const slides = $$('.slide', vp);
      const pad = parseFloat(getComputedStyle(vp).scrollPaddingLeft) || 0;
      const x = vp.scrollLeft + pad;
      let target;
      if (dir > 0) target = slides.find((s) => s.offsetLeft > x + 8);
      else target = slides.slice().reverse().find((s) => s.offsetLeft < x - 8);
      if (target) vp.scrollTo({ left: target.offsetLeft - pad, behavior: 'smooth' });
    };
    prev && prev.addEventListener('click', () => step(-1));
    next && next.addEventListener('click', () => step(1));
    vp.addEventListener('scroll', update, { passive: true });
    let settle;
    vp.addEventListener('scroll', () => { clearTimeout(settle); settle = setTimeout(() => frameAll(vp), 150); }, { passive: true });
    window.addEventListener('resize', update);
    update();

    // mouse drag (touch uses native scrolling)
    let down = false, sx = 0, sl = 0, moved = false;
    vp.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = false; sx = e.clientX; sl = vp.scrollLeft;
    });
    window.addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx;
      if (Math.abs(dx) > 4 && !moved) { moved = true; vp.classList.add('is-dragging'); }
      if (moved) vp.scrollLeft = sl - dx;
    });
    window.addEventListener('pointerup', () => {
      if (!down) return;
      down = false;
      if (moved) {
        vp.classList.remove('is-dragging');
        // let snap settle on nearest slide
        const slides = $$('.slide', vp);
        const pad = parseFloat(getComputedStyle(vp).scrollPaddingLeft) || 0;
        const x = vp.scrollLeft + pad;
        const nearest = slides.reduce((a, s) => Math.abs(s.offsetLeft - x) < Math.abs(a.offsetLeft - x) ? s : a, slides[0]);
        vp.scrollTo({ left: nearest.offsetLeft - pad, behavior: 'smooth' });
      }
    });
    vp.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    });
  });

  /* ---------- Scroll-linked effects: parallax, stacking cards, timeline ---------- */
  const parallax = $$('[data-parallax]');
  const stackCards = $$('.stack__card');
  const timeline = $('.timeline');
  let ticking = false;
  const onFrame = () => {
    ticking = false;
    const vh = window.innerHeight;
    if (!reduced) {
      parallax.forEach((el) => {
        const r = el.parentElement.getBoundingClientRect();
        if (r.bottom < -100 || r.top > vh + 100) return;
        const speed = parseFloat(el.dataset.parallax || '0.08');
        const p = (r.top + r.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(0, ${(-p * speed * 100).toFixed(2)}%, 0)`;
      });
      stackCards.forEach((card, i) => {
        const nextCard = stackCards[i + 1];
        if (!nextCard) return;
        const r = card.getBoundingClientRect();
        const n = nextCard.getBoundingClientRect();
        const dist = n.top - r.top;
        const p = Math.min(1, Math.max(0, 1 - dist / (r.height + 14)));
        card.style.transform = `scale(${1 - p * 0.05})`;
        card.style.filter = `brightness(${1 - p * 0.25})`;
      });
    }
    if (timeline) {
      const r = timeline.getBoundingClientRect();
      const p = Math.min(1, Math.max(0, (vh * 0.6 - r.top) / r.height));
      $('.timeline__progress', timeline).style.height = (p * (r.height - 16)) + 'px';
    }
  };
  const requestFrame = () => { if (!ticking) { ticking = true; requestAnimationFrame(onFrame); } };
  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame);
  onFrame();

  /* ---------- FAQ accordion ---------- */
  $$('.acc').forEach((acc) => {
    const btn = $('button', acc);
    btn.addEventListener('click', () => {
      const open = !acc.classList.contains('is-open');
      const group = acc.parentElement;
      $$('.acc', group).forEach((a) => { a.classList.remove('is-open'); $('button', a).setAttribute('aria-expanded', 'false'); });
      if (open) { acc.classList.add('is-open'); btn.setAttribute('aria-expanded', 'true'); }
    });
  });

  /* ---------- Portfolio filters ---------- */
  $$('.filters').forEach((f) => {
    const cards = $$(f.dataset.target);
    $$('button', f).forEach((b) => b.addEventListener('click', () => {
      $$('button', f).forEach((x) => { x.classList.toggle('is-active', x === b); x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      const k = b.dataset.filter;
      cards.forEach((c) => c.classList.toggle('is-hidden', k !== 'all' && !c.dataset.sector.split(' ').includes(k)));
      frameAll();
    }));
  });

  /* ---------- Forms → open a pre-filled email (no server on this static site) ---------- */
  $$('form[data-mailto]').forEach((form) => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!form.reportValidity()) return;
      const data = new FormData(form);
      const to = form.dataset.mailto;
      const subject = form.dataset.subject || 'Website enquiry';
      const lines = [];
      data.forEach((v, k) => { if (v) lines.push(`${k}: ${v}`); });
      const href = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`;
      const status = $('.form-status, .note', form.parentElement) || $('.note', form);
      if (status) status.textContent = 'Opening your email app to send this to Lamcent Capital…';
      window.location.href = href;
    });
  });

  /* ---------- Touch screens: hover effects play when a card reaches mid-screen ----------
     Every :hover rule in style.css whose subject is a card or panel is mirrored as .is-inview,
     and an observer sets that class on whichever cards sit in the middle band of the screen.
     Small controls (buttons, links, nav) are left alone; they have tap feedback already. */
  if (window.matchMedia('(hover: none)').matches && 'IntersectionObserver' in window) {
    const CARD = /^\.(service-item|slide--photo|member|post|shape-card|pcard|person|compare|mosaic-gallery__tile|feature-post|tile|sector|stack__card|address-card|map-panel__card)$/;
    const targets = new Set();
    const mirror = (rules) => [...rules].map((r) => {
      if (r.cssRules && r.conditionText !== undefined) {
        const inner = mirror(r.cssRules);
        return inner ? `@media ${r.conditionText} {${inner}}` : '';
      }
      if (!r.selectorText || !r.selectorText.includes(':hover')) return '';
      const sels = r.selectorText.split(',').map((x) => x.trim()).filter((sel) => {
        const host = sel.slice(0, sel.indexOf(':hover')).trim();
        if (!CARD.test(host)) return false;
        targets.add(host);
        return true;
      });
      return sels.length ? `${sels.map((x) => x.replace(':hover', '.is-inview')).join(', ')} {${r.style.cssText}}` : '';
    }).join('');
    let css = '';
    [...document.styleSheets].forEach((sh) => { try { css += mirror(sh.cssRules); } catch (e) { /* cross-origin sheet */ } });
    if (css) {
      const tag = document.createElement('style');
      tag.textContent = css;
      document.head.appendChild(tag);
      const band = new IntersectionObserver((entries) => {
        entries.forEach((en) => en.target.classList.toggle('is-inview', en.isIntersecting));
      }, { rootMargin: '-38% 0px -38% 0px' });
      $$([...targets].join(',')).forEach((el) => band.observe(el));
    }
    // the approach list follows the reader instead of the pointer
    $$('.approach__item').forEach((item) => new IntersectionObserver(([en]) => {
      if (en.isIntersecting) item.dispatchEvent(new Event('mouseenter'));
    }, { rootMargin: '-45% 0px -45% 0px' }).observe(item));
  }

  /* ---------- Home hero carousel: photo, headline words and glass card move together.
     Autoplays while the hero is on screen; the tabs, a swipe or the arrow keys take over. ---------- */
  const slides = $('[data-hero-slides]');
  if (slides) {
    const card = slides.closest('.hero__card');
    const imgs = $$('img', slides);
    const glows = $$('.hero__ambient img', card);
    const words = $$('.hero__swap > span', card);
    const cards = $$('.hero__cards > .glass-stat', card);
    const tabs = $$('.hero__nav button', card);
    const nav = $('.hero__nav', card);
    const DUR = 7000;
    nav.style.setProperty('--hero-dur', DUR + 'ms');
    words.forEach((w) => {
      w.innerHTML = [...w.textContent].map((c, i) => `<span class="ch" style="--i:${i}">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    });
    let cur = 0, timer = null, visible = true;
    const go = (n) => {
      n = (n + imgs.length) % imgs.length;
      if (n === cur) return;
      const prev = cur; cur = n;
      [imgs, glows, words, cards].forEach((set) => {
        set[prev].classList.remove('is-active'); set[prev].classList.add('is-leaving');
        set[n].classList.remove('is-leaving'); set[n].classList.add('is-active');
        setTimeout(() => set[prev].classList.remove('is-leaving'), 900);
      });
      words.forEach((w, i) => w.setAttribute('aria-hidden', i === n ? 'false' : 'true'));
      cards.forEach((c, i) => c.setAttribute('aria-hidden', i === n ? 'false' : 'true'));
      tabs.forEach((t, i) => t.setAttribute('aria-selected', i === n ? 'true' : 'false'));
      const num = $('[data-count]', cards[n]);
      if (num) { countReset(num); setTimeout(() => countUp(num), 300); }
      frame(imgs[n]);
      schedule();
    };
    const schedule = () => {
      clearTimeout(timer);
      // restart the progress bar on the selected tab
      const bar = $('[aria-selected="true"] i', nav);
      if (bar) { bar.style.display = 'none'; void bar.offsetWidth; bar.style.display = ''; }
      const paused = reduced || !visible || document.hidden;
      nav.classList.toggle('is-paused', paused);
      if (!paused) timer = setTimeout(() => go(cur + 1), DUR);
    };
    tabs.forEach((t, i) => t.addEventListener('click', () => go(i)));
    nav.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      go(cur + (e.key === 'ArrowRight' ? 1 : -1)); tabs[cur].focus();
    });
    let x0 = null;
    card.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    card.addEventListener('touchend', (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 50) go(cur + (dx < 0 ? 1 : -1));
    }, { passive: true });
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; schedule(); }, { threshold: 0.35 }).observe(card);
    document.addEventListener('visibilitychange', schedule);
    imgs.forEach((img) => frame(img));
  }

  /* ---------- Floating LinkedIn: shows once the hero is passed; on touch screens the label
     peeks out on first appearance, standing in for the desktop hover ---------- */
  const fab = $('.fab');
  if (fab) {
    let peeked = false;
    const showFab = () => {
      const on = window.scrollY > Math.min(480, window.innerHeight * 0.6);
      fab.classList.toggle('is-on', on);
      if (on && !peeked && matchMedia('(hover: none)').matches) {
        peeked = true; fab.classList.add('is-peek');
        setTimeout(() => fab.classList.remove('is-peek'), 3600);
      }
    };
    window.addEventListener('scroll', showFab, { passive: true });
    showFab();
  }

  /* ---------- Misc ---------- */
  $$('[data-year]').forEach((el) => el.textContent = new Date().getFullYear());
  $$('[data-to-top]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }); }));
})();
