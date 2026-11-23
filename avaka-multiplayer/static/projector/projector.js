/* The classroom projector: /projector?room=K7QM
 *
 * A screen for the front of the room. It watches one game room without being a player (the server's
 * 'watch_room'), so it has no buttons that change anything. Three moments:
 *   1. before the year starts: the join QR code and the room code, large, and who has arrived;
 *   2. during the year: the island with everyone standing where they are, the month and what it changes,
 *      each person's six steps, and who helped whom this month (also drawn as cords on the island);
 *   3. after the twelfth month: the year again on the island and the rope of knowledge (js/year-end.js).
 * Nothing here is new information: it is the same room state every player already receives. */
(function () {
  const params = new URLSearchParams(location.search);
  let lang = params.get('lang') === 'en' ? 'en' : 'zh';
  let code = (params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 4);
  const app = document.getElementById('app');
  const ISLE = { '山林': 'forest', '灘頭工作室': 'beach', '商店': 'shop' };
  const TONE = { elder: '#d2a45c', youth: '#b6e268', middle: '#8cc0dc' };
  const TEXT = {
    zh: {
      title: 'Avaka 投影', enterH: '要投影哪一組？', enterP: '輸入那一組的 4 碼房間代碼。這個畫面只看不玩，不會佔掉一個玩家的位置。', go: '開始投影', codePh: '房間代碼',
      notFound: c => `找不到房間 ${c}。請確認代碼，或等那一組先開好房間。`, waking: '正在連線……伺服器久沒人來會睡著，最多要等一分鐘。', lost: '連線中斷，正在重新連上……',
      scan: '用手機相機掃描，加入這一組', orType: '或在大廳輸入房間代碼', arrived: n => `已經到了 ${n} 人`, nobody: '還沒有人進來。', startNote: '到齊後，由任何一位組員按「開始這一年」。',
      month: n => `第 ${n} 個月`, ready: (a, b) => `準備好進入下個月：${a}／${b}`, readyTag: '準備好了', doneTag: '完工', steps: '工序',
      place: { '山林': '山林', '灘頭工作室': '灘頭工作室', '商店': '商店' }, role: { elder: '耆老', youth: '文化復振青年', middle: '中生代' },
      boat: '部落之船', forest: '森林', ties: '這個月誰幫了誰', noTies: '這個月還沒有人互相請益或幫忙。', log: '剛剛發生的事',
      said: { ask: (a, b) => `${b} 向 ${a} 請益`, teach: (a, b) => `${a} 遠程指導 ${b}`, tell: (a, b) => `${a} 對 ${b} 講述`, give: (a, b) => `${a} 送材料給 ${b}`, help: (a, b) => `${a} 幫忙長者 ${b}`, assist: (a, b) => `${a} 幫 ${b} 搭把手` },
      tag: { ask: '請益', teach: '指導', tell: '講述', give: '送材料', help: '幫忙', assist: '搭把手' },
      endH: '這一年結束了', scores: '每個人的分數', points: '分', full: '全螢幕', room: '房間', other: '換一組'
    },
    en: {
      title: 'Avaka projector', enterH: 'Which group to show?', enterP: 'Type that group’s 4-character room code. This screen only watches: it does not take a player’s place.', go: 'Show it', codePh: 'Room code',
      notFound: c => `No room ${c}. Check the code, or wait until the group has opened its room.`, waking: 'Connecting… the server sleeps when nobody visits and can take up to a minute.', lost: 'Connection lost, reconnecting…',
      scan: 'Scan with a phone camera to join this group', orType: 'or type the room code in the lobby', arrived: n => `${n} here so far`, nobody: 'Nobody here yet.', startNote: 'When everyone is here, anyone in the group presses “Begin the year”.',
      month: n => `Month ${n}`, ready: (a, b) => `Ready for next month: ${a} / ${b}`, readyTag: 'ready', doneTag: 'finished', steps: 'Steps',
      place: { '山林': 'Forest', '灘頭工作室': 'Shore workshop', '商店': 'Store' }, role: { elder: 'Elder', youth: 'Youth', middle: 'Middle Gen.' },
      boat: 'Tribe boat', forest: 'Forest', ties: 'Who helped whom this month', noTies: 'Nobody has asked or helped anyone else yet this month.', log: 'Just now',
      said: { ask: (a, b) => `${b} asked ${a}`, teach: (a, b) => `${a} guided ${b} from afar`, tell: (a, b) => `${a} told ${b} stories`, give: (a, b) => `${a} gave ${b} material`, help: (a, b) => `${a} helped the Elder, ${b}`, assist: (a, b) => `${a} lent ${b} a hand` },
      tag: { ask: 'asked', teach: 'guided', tell: 'told', give: 'gave', help: 'helped', assist: 'a hand' },
      endH: 'The year is over', scores: 'Everyone’s score', points: 'pts', full: 'Full screen', room: 'Room', other: 'Another group'
    }
  };
  const T = () => TEXT[lang];
  const el = (tag, attrs, text) => { const e = document.createElement(tag); if (attrs) for (const k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; return e; };
  const noPicto = s => String(s).replace(/^[\s\p{Extended_Pictographic}\uFE0F\u200D]+/u, '');
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const canGL = (() => { try { return !!document.createElement('canvas').getContext('webgl2'); } catch (e) { return false; } })();
  const joinLink = c => location.origin + '/?room=' + encodeURIComponent(c);

  let state = null, phase = '', isle = null, isleReady = false, lastMonth = 0, endDrawn = false;
  const socket = io({ transports: ['websocket', 'polling'] });

  // ── the small bar along the top: room, language, full screen ──
  function bar() {
    const b = el('nav', { class: 'pj-bar' });
    if (code && state) b.append(el('span', { class: 'pj-room' }, `${T().room} ${code}`));
    const sp = el('span', { class: 'pj-sp' });
    const other = el('a', { href: '/projector?lang=' + lang }, T().other);
    const lg = el('button', { type: 'button' }, lang === 'en' ? '中文' : 'EN');
    lg.addEventListener('click', () => { lang = lang === 'en' ? 'zh' : 'en'; document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant'; remember(); phase = ''; endDrawn = false; draw(); tellIsle(); });
    const fs = el('button', { type: 'button' }, T().full);
    fs.addEventListener('click', () => { if (document.fullscreenElement) document.exitFullscreen(); else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); });
    b.append(sp, other, lg, fs);
    return b;
  }
  function remember() {
    const u = new URL(location.href);
    if (code) u.searchParams.set('room', code); else u.searchParams.delete('room');
    if (lang === 'en') u.searchParams.set('lang', 'en'); else u.searchParams.delete('lang');
    history.replaceState(null, '', u);
  }

  // ── no room yet: ask for the code ──
  function askCode(msg) {
    phase = 'ask'; state = null; dropIsle();
    app.className = 'pj pj-ask'; app.textContent = '';
    const f = el('form', { class: 'pj-form' });
    const inp = el('input', { type: 'text', maxlength: '4', autocomplete: 'off', placeholder: T().codePh, 'aria-label': T().codePh });
    inp.value = code;
    f.append(el('p', { class: 'yr-eyebrow' }, 'Avaka'), el('h1', null, T().enterH), el('p', { class: 'pj-lede' }, T().enterP), inp, el('button', { type: 'submit', class: 'pj-go' }, T().go));
    if (msg) f.append(el('p', { class: 'pj-msg', role: 'alert' }, msg));
    f.addEventListener('submit', e => { e.preventDefault(); const c = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); if (c.length !== 4) { inp.focus(); return; } code = c; remember(); watch(); });
    app.append(bar(), f);
    inp.focus();
  }
  function watch() {
    if (!code) return askCode();
    if (!socket.connected) { app.className = 'pj pj-ask'; app.textContent = ''; app.append(bar(), el('p', { class: 'pj-wait' }, T().waking)); return; }
    socket.emit('watch_room', { room_code: code });
  }
  socket.on('connect', watch);
  socket.on('disconnect', () => { const n = document.querySelector('.pj-net'); if (!n && phase !== 'ask') app.append(el('p', { class: 'pj-net' }, T().lost)); });
  socket.on('watch_failed', d => askCode(T().notFound((d && d.room_code) || code)));
  socket.on('state_update', s => { if (!s || s.room_code !== code) return; state = s; const n = document.querySelector('.pj-net'); if (n) n.remove(); draw(); });

  // ── which of the three moments ──
  function draw() {
    if (!state) return code ? watch() : askCode();
    const now = state.month > 12 ? 'end' : state.started ? 'live' : 'gather';
    if (now !== phase) { phase = now; build(); }
    if (phase === 'gather') fillGather();
    if (phase === 'live') fillLive();
    if (phase === 'end') fillEnd();
  }
  function build() {
    app.textContent = ''; dropIsle();
    app.className = 'pj pj-' + phase;
    app.append(bar());
    if (phase === 'gather') {
      const g = el('section', { class: 'pj-gather' });
      g.innerHTML = '<div class="pj-qr" id="pj-qr"></div><div class="pj-join"><p class="yr-eyebrow" id="pj-scan"></p><p class="pj-code" id="pj-code"></p><p class="pj-url" id="pj-url"></p><p class="pj-or" id="pj-or"></p><h2 id="pj-arrived"></h2><ul class="pj-names" id="pj-names"></ul><p class="pj-note" id="pj-start"></p></div>';   // fixed markup, filled with textContent below
      app.append(g);
    }
    if (phase === 'live') {
      const live = el('div', { class: 'pj-live' });
      const stage = el('section', { class: 'pj-stage' });
      const over = el('div', { class: 'pj-month' });
      over.append(el('p', { class: 'yr-eyebrow', id: 'pj-mn' }), el('h1', { id: 'pj-mname' }), el('p', { id: 'pj-mdesc' }));
      stage.append(over);
      if (canGL) {
        isle = el('iframe', { title: 'Avaka', tabindex: '-1', 'aria-hidden': 'true', src: `/island?embed=1&big=1&quality=medium&month=${state.month}&focus=people&lang=${lang}` });
        stage.prepend(isle);
      } else stage.classList.add('no-gl');
      const side = el('aside', { class: 'pj-side' });
      side.innerHTML = '<div class="pj-group" id="pj-group"></div><h2 id="pj-ready"></h2><ul class="pj-people" id="pj-people"></ul><h2 id="pj-tiesh"></h2><ul class="pj-ties" id="pj-ties"></ul><h2 id="pj-logh"></h2><ul class="pj-log" id="pj-log"></ul>';   // fixed markup, filled with textContent below
      live.append(stage, side);
      app.append(live);
      lastMonth = state.month;
    }
    if (phase === 'end') { endDrawn = false; app.append(el('section', { class: 'pj-end', id: 'pj-end' })); }
  }

  // ── 1. gathering ──
  function fillGather() {
    const $ = id => document.getElementById(id), t = T(), link = joinLink(code);
    $('pj-qr').innerHTML = window.AvakaQR ? AvakaQR.svg(link, { dark: '#0c1610', light: '#efe6cf', label: link }) : '';   // drawn from the link alone
    $('pj-scan').textContent = t.scan; $('pj-code').textContent = code; $('pj-url').textContent = link.replace(/^https?:\/\//, ''); $('pj-or').textContent = t.orType;
    const ps = Object.values(state.players);
    $('pj-arrived').textContent = ps.length ? t.arrived(ps.length) : t.nobody;
    const ul = $('pj-names'); ul.textContent = '';
    ps.forEach(p => { const li = el('li'); li.style.setProperty('--tone', TONE[p.role] || '#efe6cf'); li.append(el('b', null, p.name), el('span', null, t.role[p.role] || '')); ul.append(li); });
    $('pj-start').textContent = t.startNote;
  }

  // ── 2. the year in progress ──
  const tiesNow = () => (state.ties || []).filter(x => x[3] === state.month);
  function fillLive() {
    const $ = id => document.getElementById(id), t = T(), m = state.month;
    const rule = (typeof GAME_RULES !== 'undefined' && GAME_RULES[m - 1]) || { name: '', desc_zh: '', desc_en: '' };
    $('pj-mn').textContent = t.month(m); $('pj-mname').textContent = rule.name; $('pj-mdesc').textContent = lang === 'en' ? rule.desc_en : rule.desc_zh;
    const ps = Object.values(state.players);
    // the group: the shared boat and the forest
    const tb = state.tribe_boat || 0, tg = state.tribe_boat_goal || 3, fv = typeof state.forest === 'number' ? state.forest : 3;
    const grp = $('pj-group'); grp.textContent = '';
    const boat = el('p'); boat.append(el('span', null, t.boat), el('b', null, `${tb}／${tg}`));
    const forest = el('p'); const dots = el('span', { class: 'yr-dots', 'aria-label': `${fv}/5` }); for (let i = 0; i < 5; i++) dots.append(el('i', i < fv ? { class: 'on' } : null));
    forest.append(el('span', null, t.forest), dots);
    grp.append(boat, forest);
    $('pj-ready').textContent = t.ready(ps.filter(p => p.ready).length, ps.length);
    const ul = $('pj-people'); ul.textContent = '';
    ps.forEach(p => {
      const li = el('li'); li.style.setProperty('--tone', TONE[p.role] || '#efe6cf');
      const top = el('div', { class: 'pj-who' });
      top.append(el('b', null, p.name), el('span', { class: 'pj-role' }, t.role[p.role] || ''), el('span', { class: 'pj-where' }, t.place[p.location] || p.location));
      const knots = el('div', { class: 'pj-knots', 'aria-label': `${t.steps} ${p.progress || 0}/6` });
      for (let i = 0; i < 6; i++) knots.append(el('i', i < (p.progress || 0) ? { class: 'on' } : null));
      if (p.finished) knots.append(el('span', { class: 'pj-tag fin' }, t.doneTag));
      if (p.ready) knots.append(el('span', { class: 'pj-tag' }, t.readyTag));
      li.append(top, knots); ul.append(li);
    });
    const ties = tiesNow();
    $('pj-tiesh').textContent = t.ties;
    const tl = $('pj-ties'); tl.textContent = '';
    if (ties.length) ties.slice(-8).forEach(([a, b, k]) => tl.append(el('li', null, t.said[k] ? t.said[k](a, b) : `${a} → ${b}`)));
    else tl.append(el('li', { class: 'none' }, t.noTies));
    // the room's own record is written in Chinese by the server; in English only the cords and the list above are shown
    const lh = $('pj-logh'), ll = $('pj-log'); ll.textContent = '';
    lh.hidden = ll.hidden = lang === 'en';
    if (lang !== 'en') { lh.textContent = t.log; (state.logs || []).slice(-5).reverse().forEach(l => ll.append(el('li', null, noPicto(l)))); }
    const sweep = m !== lastMonth && m > lastMonth && !calm.matches;
    lastMonth = m;
    tellIsle(sweep ? { sweep: 2600 } : null);
  }
  function isleMsg() {
    if (!state) return null;
    const list = Object.values(state.players);
    const players = list.map(p => ({ name: p.name, role: p.role, loc: ISLE[p.location] || '', progress: p.progress || 0, finished: !!p.finished, me: false }));
    const who = n => list.findIndex(p => p.name === n), byPair = new Map();
    tiesNow().forEach(([a, b, k]) => { const key = a + '\u0000' + b; if (!byPair.has(key)) byPair.set(key, [who(a), who(b), []]); const l = byPair.get(key); const tg = T().tag[k] || k; if (!l[2].includes(tg)) l[2].push(tg); });
    const links = [...byPair.values()].filter(l => l[0] >= 0 && l[1] >= 0 && l[0] < 6 && l[1] < 6).map(([i, j, kinds]) => [i, j, kinds.join('・')]);
    return { avaka: 'island', month: state.month, focus: 'people', lang, players, links, paused: false };
  }
  function tellIsle(extra) { const m = isleMsg(); if (m && isle && isleReady && isle.contentWindow) isle.contentWindow.postMessage(Object.assign(m, extra || {}), location.origin); }
  addEventListener('message', e => { if (e.origin === location.origin && e.data && e.data.avaka === 'island-ready' && isle && e.source === isle.contentWindow) { isleReady = true; tellIsle(); } });
  function dropIsle() { if (isle) isle.remove(); isle = null; isleReady = false; }

  // ── 3. the year is over ──
  function fillEnd() {
    if (endDrawn) return;
    endDrawn = true;
    const box = document.getElementById('pj-end'), t = T();
    box.textContent = '';
    const head = el('header', { class: 'yr-head' });
    head.append(el('p', { class: 'yr-eyebrow' }, `${t.room} ${code}`), el('h1', null, t.endH));
    const ranked = Object.values(state.players).slice().sort((a, b) => b.score - a.score);
    const sc = el('ol', { class: 'pj-scores' });
    ranked.forEach(p => { const li = el('li'); li.style.setProperty('--tone', TONE[p.role] || '#efe6cf'); li.append(el('b', null, String(p.score)), el('span', null, p.name), el('small', null, t.role[p.role] || '')); sc.append(li); });
    const scores = el('section', { class: 'yr-sec' }); scores.append(el('h2', { class: 'yr-h' }, t.scores), sc);
    const year = el('section', { class: 'yr-sec' });
    box.append(head, scores, year);
    if (window.AvakaYear) AvakaYear.render(year, state, lang, { big: true });
  }

  document.title = T().title;
  document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
  if (!code) askCode(); else watch();
})();
