/* The year at the end: what the room did together, on the year-end screen.
 *
 * Two pictures, both read from the room state the server keeps for this screen only (state.year, state.ties):
 *  1. The year again, on the island: the 3D island in its embedded mode steps through the twelve months, the
 *     sky changing, everyone standing where they were when each month ended, the boats appearing as they were
 *     finished. It plays once, can be played again and paused, and is skipped where WebGL is missing or the
 *     person asked for reduced motion (they get a "play" button instead).
 *  2. The rope of knowledge: everyone in a ring, and between two people a twisted Avaka cord as thick as how
 *     often knowledge or help passed between them (asking, guiding, telling, giving material, helping, lending
 *     a hand). Next to it, how much each person gave and received, for the class to talk about.
 * Nothing here changes a score or a rule. */
(function () {
  const SVG = 'http://www.w3.org/2000/svg';
  const ISLE = { '山林': 'forest', '灘頭工作室': 'beach', '商店': 'shop' };
  const ROLE_COLOUR = { elder: '#d2a45c', youth: '#b6e268', middle: '#8cc0dc' };
  const TEXT = {
    zh: {
      title: '這一年', replay: '島上的一年', play: '播放', pause: '暫停', again: '再看一次', month: n => `第 ${n} 個月`,
      rope: '知識的繩', ropeNote: '兩個人之間的繩越粗，知識和幫忙在他們之間來回越多次（請益、指導、講述、送材料、幫忙長者、搭把手）。',
      gave: '給出', got: '收到', times: '次', nothing: '這一年沒有人和別人請益或互相幫忙，所以沒有繩。',
      ask: '請益', teach: '指導', tell: '講述', give: '送材料', help: '幫忙長者', assist: '搭把手',
      talk: '可以一起想：誰最常被問？誰沒有人問？繩最粗的兩個人，是怎麼一直有交集的？',
      role: { elder: '耆老', youth: '文化復振青年', middle: '中生代' }
    },
    en: {
      title: 'The year', replay: 'The year on the island', play: 'Play', pause: 'Pause', again: 'Watch again', month: n => `Month ${n}`,
      rope: 'The rope of knowledge', ropeNote: 'The thicker the cord between two people, the more often knowledge and help passed between them (asking, guiding, telling, giving material, helping the Elder, lending a hand).',
      gave: 'gave', got: 'received', times: '', nothing: 'Nobody asked or helped anyone else this year, so there is no rope.',
      ask: 'asked', teach: 'guided', tell: 'told', give: 'gave material', help: 'helped the Elder', assist: 'lent a hand',
      talk: 'To talk about: who was asked most? Who was never asked? How did the two with the thickest cord keep meeting?',
      role: { elder: 'Elder', youth: 'Youth', middle: 'Middle Gen.' }
    }
  };
  const el = (tag, attrs, text) => { const e = document.createElement(tag); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
  const sv = (tag, attrs) => { const e = document.createElementNS(SVG, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };
  const calm = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();

  // ── 1. the year on the island ──
  function replay(box, state, t, lang) {
    const year = (state.year || []).slice().sort((a, b) => a.month - b.month);
    if (!canGL || !year.length) return;
    const sec = el('section', { class: 'ye-block' });
    sec.append(el('h2', null, t.replay));
    const stage = el('div', { class: 'ye-isle' });
    const frame = el('iframe', { title: t.replay, tabindex: '-1', 'aria-hidden': 'true', src: `/island?embed=1&month=1&lang=${lang}` });
    const label = el('p', { class: 'ye-month', 'aria-live': 'polite' });
    const bar = el('div', { class: 'ye-bar' }), btn = el('button', { type: 'button', class: 'ye-btn' });
    for (let i = 0; i < year.length; i++) bar.append(el('i'));
    stage.append(frame, label);
    sec.append(stage, el('div', { class: 'ye-controls' }));
    sec.lastChild.append(btn, bar);
    box.append(sec);

    let at = -1, timer = 0, ready = false, playing = false;
    const STEP = 1700;
    const say = () => { btn.textContent = playing ? t.pause : at >= year.length - 1 ? t.again : t.play; };
    const show = i => {
      at = i;
      const snap = year[i], last = i === year.length - 1;
      const players = snap.players.map(p => ({ name: p.name, role: p.role, loc: ISLE[p.loc] || '', progress: p.progress, finished: p.finished, me: false }));
      if (frame.contentWindow) frame.contentWindow.postMessage({ avaka: 'island', month: snap.month, focus: last ? 'beach' : '', lang, players }, location.origin);
      label.textContent = t.month(snap.month);
      [...bar.children].forEach((d, k) => d.classList.toggle('on', k <= i));
    };
    const tick = () => {
      if (!playing) return;
      if (at >= year.length - 1) { playing = false; say(); return; }
      show(at + 1);
      timer = setTimeout(tick, STEP);
    };
    const play = () => { if (!ready) return; if (at >= year.length - 1) at = -1; playing = true; say(); clearTimeout(timer); tick(); };
    const pause = () => { playing = false; clearTimeout(timer); say(); };
    btn.addEventListener('click', () => (playing ? pause() : play()));
    addEventListener('message', e => {
      if (e.origin !== location.origin || !e.data || e.data.avaka !== 'island-ready' || e.source !== frame.contentWindow || ready) return;
      ready = true;
      show(0);
      if (calm()) say(); else { playing = true; say(); timer = setTimeout(tick, STEP); }
    });
    say();
  }

  // ── 2. the rope of knowledge ──
  // one cord: two strands twisted round each other along a gentle curve, as thick as the count
  function cord(g, x1, y1, x2, y2, n, max) {
    const w = 1.4 + 6.5 * Math.sqrt(n / max), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L, bend = L * 0.08;
    const cx = mx + nx * bend, cy = my + ny * bend;
    const at = (u, side) => {
      const a = 1 - u, x = a * a * x1 + 2 * a * u * cx + u * u * x2, y = a * a * y1 + 2 * a * u * cy + u * u * y2;
      const off = Math.sin(u * L / 7 + side * Math.PI) * w * 0.32;
      return [x + nx * off, y + ny * off];
    };
    for (const side of [0, 1]) {
      let d = '';
      for (let i = 0; i <= 60; i++) { const [x, y] = at(i / 60, side); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
      g.append(sv('path', { d, fill: 'none', stroke: side ? '#b8873f' : '#e2c48a', 'stroke-width': (w * 0.62).toFixed(2), 'stroke-linecap': 'round', opacity: '0.95' }));
    }
  }
  function rope(box, state, t) {
    const sec = el('section', { class: 'ye-block' });
    sec.append(el('h2', null, t.rope), el('p', { class: 'ye-note' }, t.ropeNote));
    box.append(sec);
    const people = Object.values(state.players).map(p => ({ name: p.name, role: p.role }));
    const ties = state.ties || [];
    if (!ties.length || people.length < 2) { sec.append(el('p', { class: 'ye-note' }, t.nothing)); return; }

    const pair = new Map(), gave = {}, got = {}, kinds = {};
    for (const [from, to, kind] of ties) {
      const key = [from, to].sort().join('\u0000');
      pair.set(key, (pair.get(key) || 0) + 1);
      gave[from] = (gave[from] || 0) + 1; got[to] = (got[to] || 0) + 1;
      (kinds[key] = kinds[key] || {})[kind] = (kinds[key][kind] || 0) + 1;
    }
    const max = Math.max(...pair.values());
    const W = 520, H = 360, R = Math.min(W, H) / 2 - 64, CX = W / 2, CY = H / 2;
    const pos = {};
    people.forEach((p, i) => { const a = -Math.PI / 2 + (i / people.length) * Math.PI * 2; pos[p.name] = [CX + Math.cos(a) * R, CY + Math.sin(a) * R, a]; });
    const svg = sv('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ye-rope', role: 'img', 'aria-label': t.rope });
    const cords = sv('g', {});
    svg.append(cords);
    for (const [key, n] of pair) {
      const [a, b] = key.split('\u0000');
      if (!pos[a] || !pos[b]) continue;
      const g = sv('g', {});
      const tip = sv('title', {}); tip.textContent = `${a} — ${b}：` + Object.entries(kinds[key]).map(([k, c]) => `${t[k] || k} ${c}`).join('、');
      g.append(tip);
      cord(g, pos[a][0], pos[a][1], pos[b][0], pos[b][1], n, max);
      cords.append(g);
    }
    for (const p of people) {
      const [x, y, a] = pos[p.name];
      svg.append(sv('circle', { cx: x, cy: y, r: 9, fill: '#0c1610', stroke: ROLE_COLOUR[p.role] || '#efe6cf', 'stroke-width': 3 }));
      const tx = x + Math.cos(a) * 22, ty = y + Math.sin(a) * 22 + 4;
      const name = sv('text', { x: tx, y: ty, 'text-anchor': Math.abs(Math.cos(a)) < 0.3 ? 'middle' : Math.cos(a) > 0 ? 'start' : 'end', class: 'ye-name' });
      name.textContent = p.name;
      svg.append(name);
    }
    const wrap = el('div', { class: 'ye-rope-wrap' });
    const list = el('ul', { class: 'ye-tally' });
    for (const p of people) {
      const li = el('li');
      li.append(el('b', null, p.name), el('span', { class: 'ye-role' }, t.role[p.role] || ''),
        el('span', null, `${t.gave} ${gave[p.name] || 0}${t.times}・${t.got} ${got[p.name] || 0}${t.times}`));
      list.append(li);
    }
    wrap.append(svg, list);
    sec.append(wrap, el('p', { class: 'ye-talk' }, t.talk));
  }

  window.AvakaYear = {
    // box: an empty element on the year-end screen
    render(box, state, lang) {
      if (!box || !state) return;
      const t = TEXT[lang === 'en' ? 'en' : 'zh'];
      box.textContent = '';
      box.append(el('h2', { class: 'ye-title' }, t.title));
      replay(box, state, t, lang === 'en' ? 'en' : 'zh');
      rope(box, state, t);
    }
  };
})();
