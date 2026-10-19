/* The entrance to the rules: Avaka fibres grow up out of the ground, part where a hand passes, and lean
   toward the door you are about to open. Choosing a door draws a cord out of it before the next page. */
(function () {
  const root = document.documentElement, cv = document.getElementById('field');
  if (!cv) return;
  const g = cv.getContext('2d');
  const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seen = !!root.dataset.seen;
  try { localStorage.setItem('avaka_rules_seen', '1'); } catch (e) { /* private mode */ }

  const TONES = { dark: ['#efe6cf', '#d9cba6', '#d2a45c', '#b9b196', '#8fae6a'], light: ['#3a2c14', '#6a4c22', '#8a6a34', '#4c5b4e', '#3f6a3d'] };
  const LIT = { dark: '#b6e268', light: '#2f6a33' };
  const SEG = 14;
  let W = 0, H = 0, strands = [], start = performance.now();
  const ptr = { x: -9999, y: -9999, vx: 0, on: false };
  const lean = { x: -9999, k: 0, target: 0 };       // the door being looked at

  function build() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr; g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gap = W < 700 ? 12 : 9;
    strands = [];
    for (let x = -gap; x < W + gap; x += gap) {
      // taller toward the edges, so the middle stays a clearing for the words
      const edge = Math.min(1, Math.abs(x - W / 2) / Math.max(1, W / 2));   // a tab opened in the background can start at zero width
      strands.push({ x: x + (Math.random() - 0.5) * gap, len: (0.28 + edge * 0.5 + Math.random() * 0.22), phase: Math.random() * 6.28,
        speed: 0.45 + Math.random() * 0.5, tone: (Math.random() * 5) | 0, w: 0.6 + Math.random() * 1, alpha: 0.18 + Math.random() * 0.32,
        push: 0, delay: Math.random() * 0.9 + edge * 0.4, z: Math.random() < 0.15 ? 1.6 : Math.random() < 0.5 ? 0.6 : 1 });
    }
  }

  const ease = u => 1 - Math.pow(1 - u, 3);
  function frame(now) {
    const t = now / 1000, age = (now - start) / 1000, theme = root.dataset.theme === 'light' ? 'light' : 'dark';
    lean.k += (lean.target - lean.k) * 0.06;
    g.clearRect(0, 0, W, H);
    for (const s of strands) {
      const grow = still || seen ? 1 : ease(Math.max(0, Math.min(1, (age - s.delay) / 2.2)));
      if (grow <= 0) continue;
      const dx = s.x - ptr.x, near = ptr.on ? Math.exp(-(dx * dx) / (2 * 90 * 90)) : 0;
      s.push += ((near * (dx >= 0 ? 1 : -1) * 64 + near * ptr.vx * 0.8) - s.push) * 0.09;
      const toward = (lean.x - s.x) * 0.22 * lean.k * Math.exp(-((s.x - lean.x) ** 2) / (2 * 260 * 260));
      const L = s.len * H * grow;
      g.beginPath();
      let lx = 0, ly = 0;
      for (let k = 0; k <= SEG; k++) {
        const u = k / SEG, y = H - u * L;
        const reach = Math.exp(-((y - ptr.y) ** 2) / (2 * 200 * 200));
        const off = Math.sin(t * s.speed + s.phase + u * 2.2) * 10 * u + s.push * reach * u + toward * u * u;
        const px = s.x + off * s.z;
        if (k === 0) { g.moveTo(px, y); lx = px; ly = y; } else { g.quadraticCurveTo(lx, ly, (lx + px) / 2, (ly + y) / 2); lx = px; ly = y; }
      }
      g.lineTo(lx, ly);
      const lit = Math.max(near, lean.k * Math.exp(-((s.x - lean.x) ** 2) / (2 * 120 * 120)));
      const col = lit > 0.3 ? LIT[theme] : TONES[theme][s.tone];
      const fade = g.createLinearGradient(0, H, 0, H - L);
      fade.addColorStop(0, col); fade.addColorStop(0.75, col); fade.addColorStop(1, col + '00');
      g.strokeStyle = fade; g.lineCap = 'round';
      g.globalAlpha = Math.min(1, (s.alpha + (theme === 'light' ? 0.12 : 0)) * s.z + lit * 0.6);
      g.lineWidth = (s.w + lit * 0.8) * s.z;
      g.stroke();
    }
    g.globalAlpha = 1;
    ptr.vx *= 0.9;
    if (!still) requestAnimationFrame(safeFrame);
  }
  const safeFrame = now => { try { frame(now); } catch (e) { build(); requestAnimationFrame(safeFrame); } };

  build();
  addEventListener('resize', build);
  addEventListener('pointermove', e => { const v = e.clientX - ptr.x; ptr.vx = Math.abs(v) < 400 ? v : 0; ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true; });
  document.addEventListener('mouseleave', () => { ptr.on = false; });
  addEventListener('pointerup', e => { if (e.pointerType !== 'mouse') ptr.on = false; });
  requestAnimationFrame(safeFrame);
  if (still) safeFrame(performance.now());

  // ── the name sways with the hand, like fibre in the wind; now and then a light runs through it ──
  const letters = [...document.querySelectorAll('.cover-title .sw')];
  if (!still && letters.length) {
    const cur = letters.map(() => ({ x: 0, y: 0, r: 0 }));
    (function sway() {
      letters.forEach((el, i) => {
        const r = el.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        const dx = ptr.on ? ptr.x - cx : 0, dy = ptr.on ? ptr.y - cy : 0, d = Math.hypot(dx, dy);
        const pull = ptr.on ? Math.exp(-(d * d) / (2 * 260 * 260)) : 0;
        const tx = -dx / (d || 1) * 10 * pull, rot = Math.max(-1, Math.min(1, dx / 300)) * -6 * pull, ty = -Math.abs(dy) / (d || 1) * 4 * pull;
        const c = cur[i]; c.x += (tx - c.x) * 0.12; c.y += (ty - c.y) * 0.12; c.r += (rot - c.r) * 0.12;
        el.style.setProperty('--tx', `${c.x.toFixed(2)}px`); el.style.setProperty('--ty', `${c.y.toFixed(2)}px`); el.style.setProperty('--rot', `${c.r.toFixed(2)}deg`);
      });
      requestAnimationFrame(sway);
    })();
    const shine = () => letters.forEach((el, i) => setTimeout(() => { const ch = el.parentElement; ch.classList.remove('shine'); void ch.offsetWidth; ch.classList.add('shine'); }, i * 110));
    setTimeout(() => { shine(); setInterval(shine, 7000); }, seen ? 1200 : 3200);
  }

  // ── the question weighs one path, then the other ──
  const q = document.getElementById('cover-q');
  if (q && !still) {
    let side = 'a';
    setTimeout(() => { q.classList.add('weigh', 'a'); setInterval(() => { q.classList.remove(side); side = side === 'a' ? 'b' : 'a'; q.classList.add(side); }, 2600); }, seen ? 800 : 2600);
  }

  // ── the introduction comes in a word at a time ──
  if (!still) document.querySelectorAll('.cover-lede').forEach(p => {
    const text = p.textContent, words = [];
    // punctuation rides with the word before it, so a line never starts with 。or ，
    if (window.Intl && Intl.Segmenter) for (const s of new Intl.Segmenter(p.lang, { granularity: 'word' }).segment(text)) {
      if (!s.isWordLike && words.length && !/^\s+$/.test(s.segment) && !/^\s+$/.test(words[words.length - 1])) words[words.length - 1] += s.segment; else words.push(s.segment);
    }
    else words.push(...text.split(/(\s+)/));
    p.setAttribute('aria-label', text);
    p.textContent = '';
    let i = 0;
    words.forEach(w => { if (/^\s+$/.test(w)) { p.appendChild(document.createTextNode(w)); return; } const s = document.createElement('span'); s.className = 'w'; s.style.setProperty('--i', i++); s.textContent = w; s.setAttribute('aria-hidden', 'true'); p.appendChild(s); });
    p.classList.add('split');
  });

  // ── the doors ──
  const pull = document.getElementById('pull-path');
  document.querySelectorAll('.door').forEach(d => {
    const look = () => { const r = d.getBoundingClientRect(); lean.x = r.left + r.width / 2; lean.target = 1; };
    d.addEventListener('pointerenter', look); d.addEventListener('focus', look);
    d.addEventListener('pointerleave', () => { lean.target = 0; }); d.addEventListener('blur', () => { lean.target = 0; });
    d.addEventListener('click', e => {
      if (still || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
      e.preventDefault();
      // a cord comes out of the door and runs off the edge of the screen, then the next page opens
      const r = d.getBoundingClientRect(), x0 = r.left + r.width / 2, y0 = r.top + r.height / 2;
      const right = x0 < W / 2 ? -40 : W + 40, mid = (x0 + right) / 2;
      pull.setAttribute('d', `M${x0} ${y0} C ${mid} ${y0 - 90}, ${mid} ${y0 + 90}, ${right} ${y0 - 20}`);
      const len = pull.getTotalLength();
      pull.style.strokeDasharray = len; pull.style.strokeDashoffset = len;
      pull.getBoundingClientRect();
      pull.style.transition = 'stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)';
      pull.style.strokeDashoffset = 0;
      document.body.classList.add('leaving');
      setTimeout(() => { location.href = d.href; }, 620);
    });
  });
  // coming back with the browser's back button: show the page again, not the half-left state
  addEventListener('pageshow', e => { if (e.persisted) { document.body.classList.remove('leaving'); pull.setAttribute('d', ''); } });
})();
