/* Avaka rules: language, day/night, and the rope that ties a knot for each chapter you have read. */
(function () {
  const root = document.documentElement;
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* private mode */ } } };

  // ── language: shared key with the game's links (?lang=en) ──
  const lang = document.getElementById('t-lang');
  if (lang) lang.addEventListener('click', () => {
    const en = root.dataset.lang !== 'en';
    root.dataset.lang = en ? 'en' : 'zh';
    root.lang = en ? 'en' : 'zh-Hant';
    store.set('avaka_lang', root.dataset.lang);
    const u = new URL(location.href); u.searchParams.delete('lang'); history.replaceState(null, '', u);
    dispatchEvent(new Event('avaka:lang'));
  });

  // ── day and night: the same setting as the game's lobby ──
  const theme = document.getElementById('t-theme');
  if (theme) theme.addEventListener('click', () => {
    const light = root.dataset.theme !== 'light';
    if (light) root.dataset.theme = 'light'; else delete root.dataset.theme;
    store.set('avaka_lobby_theme', light ? 'light' : 'dark');
  });

  // ── words to read aloud: one tap puts them up large, for the projector ──
  const stage = document.getElementById('stage');
  if (stage && stage.showModal) {
    const body = document.getElementById('stage-body');
    const icon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
    document.querySelectorAll('.script').forEach(q => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'big'; b.innerHTML = icon;
      b.setAttribute('aria-label', root.dataset.lang === 'en' ? 'Show large for reading aloud' : '放大朗讀');
      b.addEventListener('click', () => { body.replaceChildren(q.cloneNode(true)); stage.showModal(); });
      q.appendChild(b);
    });
    document.getElementById('stage-close').addEventListener('click', () => stage.close());
    stage.addEventListener('click', e => { if (e.target === stage) stage.close(); });
  }

  // ── as chapters come into view: the rope beside each heading is twisted out, the six knots tie in turn ──
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && 'IntersectionObserver' in window) {
    root.classList.add('fx');
    // marks what is in view, and anything already scrolled past (as after jumping to #ending)
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting || e.boundingClientRect.top < 0) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -12% 0px' });
    document.querySelectorAll('.chapter > header, .knots, .plan').forEach(el => io.observe(el));
  }

  // ── the six steps: the plate shows the step being read ──
  const plate = document.querySelector('.plate');
  if (plate && 'IntersectionObserver' in window) {
    const steps = [...document.querySelectorAll('.stage-step')], pls = [...plate.querySelectorAll('.pl')];
    const capN = plate.querySelector('.cap-n'), capT = [...plate.querySelectorAll('.cap-t')];
    const show = i => {
      steps.forEach((li, k) => li.classList.toggle('now', k === i));
      pls.forEach((g, k) => g.classList.toggle('on', k === i));
      const h = steps[i].querySelector('h3');
      capN.textContent = h.querySelector('.sn').textContent;
      capT.forEach(c => { const src = h.querySelector(`[lang=${c.lang}]`); if (src) c.textContent = src.textContent; });
    };
    const seen = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) show(steps.indexOf(e.target)); }), { rootMargin: '-40% 0px -50% 0px' });
    steps.forEach(li => seen.observe(li));
    show(0);
  }

  // ── a light that follows the hand across the one-page sheet and the doors ──
  document.querySelectorAll('.sheet, .door').forEach(el => {
    el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); el.style.setProperty('--mx', `${e.clientX - r.left}px`); el.style.setProperty('--my', `${e.clientY - r.top}px`); el.classList.add('lit'); });
    el.addEventListener('pointerleave', () => el.classList.remove('lit'));
  });

  // ── chapter titles: split into characters (words in English) so they can rise in one by one ──
  if (root.classList.contains('fx')) document.querySelectorAll('.chapter > header h2 > span[lang]').forEach(sp => {
    const parts = sp.lang === 'en' ? sp.textContent.split(/(\s+)/) : [...sp.textContent];
    sp.setAttribute('aria-label', sp.textContent);
    sp.innerHTML = '';
    let d = 0;
    parts.forEach(t => { if (/^\s+$/.test(t)) { sp.appendChild(document.createTextNode(t)); return; } const c = document.createElement('span'); c.className = 'c'; c.style.setProperty('--d', d++); c.textContent = t; c.setAttribute('aria-hidden', 'true'); sp.appendChild(c); });
  });

  // ── the five endings: the one looked at, focused or tapped opens ──
  const ends = document.getElementById('endings');
  if (ends) {
    const lis = [...ends.children];
    const open = li => lis.forEach(x => x.classList.toggle('open', x === li));
    lis.forEach(li => { li.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') open(li); }); li.addEventListener('focus', () => open(li)); li.addEventListener('click', () => open(li)); });
  }

  // ── a few fibres stand at the edges of the reading pages, swaying slowly, nearer ones moving more with the scroll ──
  if (!document.body.classList.contains('cover')) {
    const cv = document.createElement('canvas'); cv.id = 'edge'; cv.setAttribute('aria-hidden', 'true');
    document.body.prepend(cv);
    const g = cv.getContext('2d'), still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const TONE = { dark: ['#efe6cf', '#d2a45c', '#b9b196', '#8fae6a'], light: ['#3a2c14', '#8a6a34', '#4c5b4e', '#3f6a3d'] };
    let W = 0, H = 0, fib = [];
    const build = () => {
      const dpr = Math.min(devicePixelRatio || 1, 2); W = innerWidth; H = innerHeight;
      cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
      const band = Math.max(36, Math.min(150, (W - 1060) / 2 + 60)), gap = W < 700 ? 22 : 13;
      fib = [];
      for (let x = -6; x < band; x += gap * (0.7 + Math.random() * 0.6)) [x, W - x].forEach(px => fib.push({ x: px + (Math.random() - 0.5) * 8, len: 0.18 + Math.random() * 0.34 * (1 - x / band * 0.6),
        z: 0.4 + Math.random() * 0.9, ph: Math.random() * 6.28, sp: 0.3 + Math.random() * 0.4, tone: (Math.random() * 4) | 0, a: 0.1 + Math.random() * 0.16 }));
    };
    const draw = now => {
      const t = now / 1000, theme = root.dataset.theme === 'light' ? 'light' : 'dark', sc = scrollY;
      g.clearRect(0, 0, W, H);
      for (const f of fib) {
        const L = f.len * H * (1 + Math.sin(sc / 1400 + f.ph) * 0.06 * f.z), base = H + 4;   // nearer fibres stretch and lean a little more as the page scrolls
        g.beginPath();
        let lx = f.x, ly = base;
        g.moveTo(lx, ly);
        for (let k = 1; k <= 10; k++) {
          const u = k / 10, y = base - u * L, x = f.x + Math.sin(t * f.sp + f.ph + u * 2) * 7 * u * f.z + Math.sin(sc / 500 + f.ph) * 6 * u * u * f.z;
          g.quadraticCurveTo(lx, ly, (lx + x) / 2, (ly + y) / 2); lx = x; ly = y;
        }
        const col = TONE[theme][f.tone], grad = g.createLinearGradient(0, base, 0, base - L);
        grad.addColorStop(0, col); grad.addColorStop(0.7, col); grad.addColorStop(1, col + '00');
        g.strokeStyle = grad; g.globalAlpha = f.a * (theme === 'light' ? 1.4 : 1); g.lineWidth = 0.8 + f.z * 0.9; g.lineCap = 'round'; g.stroke();
      }
      g.globalAlpha = 1;
      if (!still && !document.hidden) requestAnimationFrame(draw);
    };
    build(); addEventListener('resize', build);
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !still) requestAnimationFrame(draw); });
    requestAnimationFrame(draw);
  }

  // ── the rope ──
  const rope = document.getElementById('rope');
  if (!rope) return;
  const items = [...rope.querySelectorAll('li')];
  const chapters = items.map(li => document.querySelector(li.querySelector('a').getAttribute('href')));
  let current = -1, tied = -1;
  function place() {
    // the made length of rope runs from the first knot to the knot you are reading
    const first = items[0].getBoundingClientRect(), at = items[Math.max(0, current)].getBoundingClientRect();
    rope.style.setProperty('--made', current < 0 ? '0px' : `${at.left - first.left}px`);
  }
  function update() {
    const line = innerHeight * 0.35;
    let now = -1;
    chapters.forEach((c, i) => { if (c && c.getBoundingClientRect().top <= line) now = i; });
    if (now === current) return;
    current = now;
    items.forEach((li, i) => {
      li.classList.toggle('now', i === now);
      li.classList.toggle('tied', i < now);
      if (i === now) li.querySelector('a').setAttribute('aria-current', 'location'); else li.querySelector('a').removeAttribute('aria-current');
    });
    // a knot is tied the first time you reach a chapter past the last one tied
    if (now > tied) {
      for (let i = tied + 1; i <= now; i++) { const li = items[i]; li.classList.remove('just'); void li.offsetWidth; li.classList.add('just'); setTimeout(() => li.classList.remove('just'), 900); }
      tied = now;
    }
    place();
  }
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; update(); }); } }, { passive: true });
  addEventListener('resize', place);
  addEventListener('avaka:lang', place);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(place);
  update();

  // smooth jumps, unless the reader asked for less motion
  const still = matchMedia('(prefers-reduced-motion: reduce)');
  rope.addEventListener('click', e => {
    const a = e.target.closest('a'); if (!a) return;
    const t = document.querySelector(a.getAttribute('href')); if (!t) return;
    e.preventDefault();
    t.scrollIntoView({ behavior: still.matches ? 'auto' : 'smooth', block: 'start' });
    history.replaceState(null, '', a.getAttribute('href'));
  });
})();
