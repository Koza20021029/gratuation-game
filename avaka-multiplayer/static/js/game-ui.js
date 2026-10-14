/* Avaka in-game screen (new look).
 *
 * Like the lobby, it lives in its own shadow root on top of the original screen. It only re-presents
 * the room state the game already has, and sends every action through the game's own sendAction() and
 * buttons, so rules, prompts, sounds and reconnecting are untouched. Open the page with ?ui=old to get
 * the original screen back.
 *
 * AvakaGameUI.can(state, myId, action) mirrors the server's own checks so each button can say whether
 * it will work and, if not, why. The server remains the judge; this is only the explanation. */
(function () {
  if (new URLSearchParams(location.search).get('ui') === 'old') return;
  if (!document.documentElement.attachShadow || typeof socket === 'undefined') return;

  const FOREST = '山林', SHORE = '灘頭工作室', SHOP = '商店';
  const STEPS = ['chop', 'rub', 'strip', 'dry', 'twine', 'caulk'];

  // ───────── the rules, as far as a button needs to know them ─────────
  // Returns { ok, cost, why } where `why` is a key into TEXT (plus an optional number `n`).
  function can(state, myId, a) {
    const me = state.players[myId], month = state.month;
    const no = (why, n) => ({ ok: false, cost: a.cost || 0, why, n });
    if (!me) return no('notIn');
    const others = Object.values(state.players).filter(p => p.id !== myId);
    const afterFinish = ['move', 'give', 'teach', 'tell', 'help', 'plant', 'assist', 'translate', 'patrol', 'tribe'];
    if (me.finished && !(afterFinish.includes(a.type) || (a.type === 'craft' && a.step === 'chop'))) return no('finished');
    const pay = cost => me.ap >= cost ? { ok: true, cost } : { ok: false, cost, why: 'ap', n: cost };

    if (a.type === 'move') {
      if (me.location === a.target) return no('here');
      if (month === 2 && a.target === FOREST) return no('closed');
      return pay(me.role === 'youth' ? 0 : 1);
    }
    if (a.type === 'craft') {
      let cost = month === 3 ? 2 : 3;
      const helped = (me.assist_month || 0) === month;
      const eased = c => (helped && c >= 1) ? Math.max(1, c - 2) : c;
      const i = STEPS.indexOf(a.step), inForest = i < 3;
      if (me.location !== (inForest ? FOREST : SHORE)) return no(inForest ? 'goForest' : 'goShore');
      if (a.step === 'chop') {
        if (month === 2) return no('closed');
        return pay(eased((state.forest === undefined ? 3 : state.forest) <= 1 ? cost + 1 : cost));
      }
      if (me.progress > i) return no('doneStep');
      if (me.progress < i) return no('earlier');
      const sprint = month === 12 && (a.step === 'twine' || a.step === 'caulk');
      if ((me.last_step_month || 0) >= month && !sprint) return no('wait');
      if (a.step === 'caulk' && month === 10) return no('taboo');
      if (a.step === 'twine' && me.kp < 3) return no('kp', 3);
      if (a.step === 'caulk' && me.kp < 8) return no('kp', 8);
      if (me.materials < 1) return no('mat', 1);
      if (a.step === 'twine' && month === 12) cost = 0;
      if (a.step === 'caulk' && me.role === 'elder') cost = 0;
      return pay(eased(cost));
    }
    if (a.type === 'buy') {
      if (me.location !== SHOP) return no('goShop');
      if (month === 9) return no('feast');
      if (month === 10) return no('taboo');
      if (me.progress < 3) return no('three');
      if (me.materials < 2) return no('mat', 2);
      if ((me.last_step_month || 0) >= month) return no('wait');
      if (a.item === 'machine' && me.kp < 5) return no('kp', 5);
      return pay(3);
    }
    if (a.type === 'plant') {
      if (me.location !== FOREST) return no('goForest');
      if (month === 2) return no('closed');
      if ((me.plant_month || 0) === month) return no('once');
      return pay(1);
    }
    if (a.type === 'patrol') {
      if (me.location !== FOREST) return no('goForest');
      if (month === 2) return no('closed');
      if ((me.patrol_month || 0) === month) return no('once');
      return pay(1);
    }
    if (a.type === 'tribe') {
      if (!me.finished) return no('ownFirst');
      if (me.location !== SHORE) return no('goShore');
      if ((state.tribe_boat || 0) >= (state.tribe_boat_goal || 3)) return no('boatDone');
      return pay(1);
    }
    if (a.type === 'ask') {
      if (me.role === 'elder') return no('role');
      if (a.target === 'middle') {
        if (me.role !== 'youth') return no('role');
        const mentors = others.filter(p => p.role === 'middle');
        if (!mentors.length) return no('noMiddle');
        if (me.kp >= Math.max.apply(null, mentors.map(p => p.kp))) return no('outgrown');
        return pay(month === 4 ? 2 : 1);
      }
      return pay((me.role === 'youth' ? 3 : 2) + (month === 4 ? 1 : 0));
    }
    if (a.type === 'teach') {
      if (me.role !== 'elder') return no('role');
      if (!state.players[a.target_id]) return no('noTarget');
      return pay(2);
    }
    if (a.type === 'tell') {
      if (me.role !== 'elder') return no('role');
      if ((me.tell_month || 0) === month) return no('once');
      if (!others.some(p => p.role !== 'elder' && p.location === me.location)) return no('noListener');
      return pay(2);
    }
    if (a.type === 'help') {
      if (me.role === 'elder') return no('role');
      if ((me.help_month || 0) === month && !me.finished) return no('once');     // with your own boat done you can keep helping
      const elders = others.filter(p => p.role === 'elder' && p.location === me.location && !p.finished);
      if (!elders.length) return no('noElder');
      if (Math.min.apply(null, elders.map(p => p.ap)) >= elders.reduce((m, p) => p.ap <= m.ap ? p : m).max_ap) return no('elderFull');
      return pay(1);
    }
    if (a.type === 'translate') {
      if (me.kp < 2) return no('kp', 2);
      return pay(2);
    }
    if (a.type === 'give') {
      const t = state.players[a.target_id];
      if (!t) return no('noTarget');
      if (t.location !== me.location) return no('apart');
      if (me.materials < 1) return no('mat', 1);
      return pay(0);
    }
    if (a.type === 'assist') {
      const t = state.players[a.target_id];
      if (!t || t.id === myId) return no('noTarget');
      if (t.location !== me.location) return no('apart');
      if (t.finished) return no('theyDone');
      if ((t.assist_month || 0) === month) return no('helped');
      return pay(1);
    }
    return no('notIn');
  }
  window.AvakaGameUI = { can };

  // ───────── words ─────────
  const TEXT = {
    zh: {
      month: n => `第 ${n} 個月`, monthUnit: '個月', lore: '這個月的夜曆', kb: '知識庫', quit: '退出', lang: 'EN', music: '背景音樂', theme: '白天／夜晚', sfx: '音效',
      mission: '本月小組任務', missionDone: '已達成，全員 +1 分', forest: '森林', role: { elder: '耆老', youth: '青年', middle: '中生代' },
      steps: ['砍伐剝皮', '摩擦軟化', '劃痕撕絲', '曝曬乾燥', '理線捻繩', '填縫完工'], stepWhere: ['山林', '山林', '山林', '灘頭', '灘頭', '灘頭'],
      ap: 'AP', kp: 'KP', apName: '體力 AP', kpName: '技術 KP', mat: '材料', score: '得分', scoreWhy: '分數從哪裡來', badges: '徽章',
      ready: '準備進入下個月', unready: '取消準備', readyCount: (a, b) => `${a}/${b} 人已準備`,
      finished: { traditional: '傳統 Avaka 完工', hybrid: '機器加工完工', industrial: '工業樹脂完工' }, finishedNote: '船完工了。你還可以為部落的船出力、幫耆老趕工、巡山、補種、送材料。',
      mates: '同伴', you: '你', readyTag: '已準備', doneTag: '已完工', give: '送 1 份材料', assist: '搭把手', helped: '這個月已有人幫他', free: '0 AP',
      place: { [FOREST]: ['山林', '前三道工序在這裡做'], [SHORE]: ['灘頭工作室', '後三道工序在這裡做'], [SHOP]: ['商店', '機器加工，或用工業樹脂完工'] },
      here: '你在這裡', nobody: '沒有人在這裡', move: '走到這裡', plant: '補種 Avaka', plantSub: '算作照顧林地；下次砍伐多 1 份材料', chopSub: n => `得到 ${n} 份材料，可以重複做`,
      needs: (kp, mat) => [kp ? `KP ${kp}` : '', mat ? `${mat} 份材料` : ''].filter(Boolean).join('、'), needLabel: '需要',
      machine: '機器加工完工', machineSub: '+12 分，船仍可拆修', resin: '工業樹脂完工', resinSub: '+5 分，船無法拆修',
      social: '和人有關的事', askElder: '向耆老請益', askElderSub: kp => `得到 ${kp} KP，雙方各 +1 分`, askMiddle: '向中生代請益', askMiddleSub: '得到 2 KP，雙方各 +1 分',
      help: '幫忙長者', helpSub: s => `耆老回復 2 AP，你 +${s} 分`, helpMore: '耆老回復 2 AP；這個月的分數已經拿過', patrol: '巡山', patrolSub: '看過每一區的 Avaka；算作照顧林地，你 +1 分', tribe: '為部落的船出力', tribeSub: (a, b) => `全組一起造的船 ${a}/${b}；年底全員加分`, tribeBoat: '部落的船', tribeNote: '完工的人可以到灘頭出力', tribeDone: '完成了，年底全員 +3 分', tell: '講述', tellSub: kp => `身邊的人各得 ${kp} KP，你 +1 分`, teach: '遠程指導', teachSub: '對方得 1 KP，你 +1 分', translate: '科學轉譯', translateSub: '用掉 2 KP；成功 +4 分、+2 材料', translateDone: '用掉 2 KP；成功得 2 份材料，可以送人（完工後不加分）',
      nextStep: '下一步', log: '部落記事', chat: '聊天', chatEmpty: '還沒有人說話。', chatPh: '跟同組的人說…', send: '送出', film: '蘭嶼影像',
      why: {
        ap: n => `體力不夠，要 ${n} AP`, kp: n => `技術還不夠，要 KP ${n}`, mat: n => `材料不夠，要 ${n} 份`, here: '你已經在這裡', closed: '2 月封山，不能上山', goForest: '要先走到山林', goShore: '要先走到灘頭工作室', goShop: '要先走到商店',
        doneStep: '這道已經做完了', earlier: '要先做完前一道', wait: '剛做完一道，要等下個月', taboo: '10 月不能完工', feast: '9 月商店不能完工', three: '要先做完山林的三道工序', once: '這個月做過了',
        finished: '船已經完工', role: '你的角色不能做', noMiddle: '房間裡沒有中生代', outgrown: '你懂的已經不比中生代少，去問耆老', noTarget: '沒有對象', noListener: '身邊沒有人在聽', noElder: '要和還在造船的耆老在同一個地方',
        elderFull: '耆老現在體力是滿的', ownFirst: '要等你自己的船完工', boatDone: '部落的船已經完成', apart: '不在同一個地方', theyDone: '他的船已經完工', helped: '這個月已經有人幫他了', notIn: ''
      }
    },
    en: {
      month: n => `Month ${n}`, monthUnit: 'month', lore: 'This month in the calendar', kb: 'Knowledge', quit: 'Leave', lang: '中文', music: 'Music', theme: 'Day / night', sfx: 'Sound',
      mission: 'Group mission', missionDone: 'done, +1 for everyone', forest: 'Forest', role: { elder: 'Elder', youth: 'Youth', middle: 'Middle' },
      steps: ['Chop', 'Rub', 'Strip', 'Dry', 'Twist', 'Caulk'], stepWhere: ['Forest', 'Forest', 'Forest', 'Shore', 'Shore', 'Shore'],
      ap: 'AP', kp: 'KP', apName: 'Stamina AP', kpName: 'Skill KP', mat: 'Material', score: 'Score', scoreWhy: 'Where the points came from', badges: 'Badges',
      ready: 'Ready for next month', unready: 'Not ready yet', readyCount: (a, b) => `${a}/${b} ready`,
      finished: { traditional: 'Finished: traditional Avaka', hybrid: 'Finished: machine-processed', industrial: 'Finished: industrial resin' }, finishedNote: 'Your boat is done. You can work on the community boat, keep helping the Elder, walk the hill, replant and give.',
      mates: 'Teammates', you: 'you', readyTag: 'ready', doneTag: 'finished', give: 'Give 1 material', assist: 'Lend a hand', helped: 'Already helped this month', free: '0 AP',
      place: { [FOREST]: ['Forest', 'The first three steps are done here'], [SHORE]: ['Shore workshop', 'The last three steps are done here'], [SHOP]: ['Store', 'Machine processing, or finishing with resin'] },
      here: 'You are here', nobody: 'Nobody here', move: 'Walk here', plant: 'Replant Avaka', plantSub: 'Counts as tending the plots; next chop +1 material', chopSub: n => `Yields ${n} material${n > 1 ? 's' : ''}; repeatable`,
      needs: (kp, mat) => [kp ? `KP ${kp}` : '', mat ? `${mat} material${mat > 1 ? 's' : ''}` : ''].filter(Boolean).join(', '), needLabel: 'Needs',
      machine: 'Finish by machine', machineSub: '+12 points; the boat can still be repaired', resin: 'Finish with resin', resinSub: '+5 points; the boat cannot be repaired',
      social: 'With other people', askElder: 'Ask the Elder', askElderSub: kp => `+${kp} KP; +1 point each`, askMiddle: 'Ask the Middle Gen.', askMiddleSub: '+2 KP; +1 point each',
      help: 'Help the Elder', helpSub: s => `Elder recovers 2 AP; you +${s}`, helpMore: 'Elder recovers 2 AP; this month\'s point is already yours', patrol: 'Walk the hill', patrolSub: 'Check every Avaka plot; counts as tending, you +1', tribe: 'Work on the community boat', tribeSub: (a, b) => `The boat everyone builds ${a}/${b}; points for all at year end`, tribeBoat: 'Community boat', tribeNote: 'those who have finished can work on it at the Shore', tribeDone: 'finished: +3 for everyone at year end', tell: 'Tell stories', tellSub: kp => `+${kp} KP for those nearby; you +1`, teach: 'Guide from afar', teachSub: 'They gain 1 KP; you +1', translate: 'Scientific translation', translateSub: 'Uses 2 KP; success +4 points, +2 materials', translateDone: 'Uses 2 KP; success gives 2 materials to pass on (no points once finished)',
      nextStep: 'Next', log: 'Record', chat: 'Chat', chatEmpty: 'Nobody has said anything yet.', chatPh: 'Say something to your group…', send: 'Send', film: 'Lanyu on film',
      why: {
        ap: n => `Not enough stamina (${n} AP needed)`, kp: n => `Not enough skill (KP ${n} needed)`, mat: n => `Not enough material (${n} needed)`, here: 'You are already here', closed: 'The forest is closed in Month 2', goForest: 'Walk to the Forest first', goShore: 'Walk to the Shore workshop first', goShop: 'Walk to the Store first',
        doneStep: 'Already done', earlier: 'Finish the step before it first', wait: 'A step was just done; wait for next month', taboo: 'No boat may be finished in Month 10', feast: 'The Store cannot finish boats in Month 9', three: 'Do the three forest steps first', once: 'Already done this month',
        finished: 'Your boat is finished', role: 'Not for your role', noMiddle: 'No Middle Generation player in the room', outgrown: 'You know as much as they do; ask the Elder', noTarget: 'Nobody to choose', noListener: 'Nobody nearby to listen', noElder: 'Be in the same place as an Elder who is still building',
        elderFull: 'The Elder is at full Stamina', ownFirst: 'Finish your own boat first', boatDone: 'The community boat is finished', apart: 'Not in the same place', theyDone: 'Their boat is finished', helped: 'Someone already helped them this month', notIn: ''
      }
    }
  };
  const lang = () => (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'zh';
  const T = () => TEXT[lang()];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const noPicto = s => String(s).replace(/[\p{Extended_Pictographic}️‍]+\s*/gu, '');
  const reason = r => { const w = T().why[r.why]; return typeof w === 'function' ? w(r.n) : (w || ''); };

  // ───────── the surface ─────────
  const host = document.createElement('div');
  host.id = 'game2'; host.hidden = true;
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<link rel="stylesheet" href="css/game-ui.css?v=20261014_7"><div class="g" id="g"></div>';     // fixed markup, no user input
  document.body.appendChild(host);
  const $ = id => root.getElementById(id);
  const old = id => document.getElementById(id);
  const ICON = {
    music: '<svg class="on" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg><svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/><path d="M3 3l18 18"/></svg>',
    theme: '<svg class="on" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg><svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/></svg>'
  };
  ICON.sfx = '<svg class="on" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M15.5 9a4.2 4.2 0 010 6M18 6.5a7.8 7.8 0 010 11"/></svg><svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/></svg>';
  // a small line drawing for each place: abacá on the hill, a tatala drawn up on the shore, the store with its drum of resin
  const ART = {
    [FOREST]: '<svg class="art" viewBox="0 0 120 60" aria-hidden="true"><path d="M2 50Q30 24 58 40T118 32"/><path d="M2 55H118"/><path d="M40 55V31"/><path d="M40 34C32 20 22 17 15 23 24 23 32 27 40 35M40 32C46 16 58 12 65 18 56 19 48 25 40 33M40 31C38 18 40 9 44 4 46 13 44 23 40 31"/><path d="M90 55V40"/><path d="M90 42C85 33 78 31 73 35 79 35 85 38 90 43M90 41C94 31 102 28 107 32 101 33 95 37 90 42M90 40C89 32 90 26 93 22 94 28 93 35 90 40"/></svg>',
    [SHORE]: '<svg class="art" viewBox="0 0 120 60" aria-hidden="true"><path d="M27 12C30 27 34 38 44 44Q60 49 76 44C86 38 90 27 93 12 88 25 82 33 74 36Q60 39 46 36C38 33 32 25 27 12Z"/><circle cx="41" cy="33" r="2.6"/><circle cx="79" cy="33" r="2.6"/><path d="M52 41.5h16"/><path d="M2 54q7-4 14 0t14 0 14 0 14 0 14 0 14 0 14 0 14 0"/><path d="M96 20q5-3 10 0t10 0"/></svg>',
    [SHOP]: '<svg class="art" viewBox="0 0 120 60" aria-hidden="true"><path d="M2 55H118"/><path d="M22 55V27H98V55"/><path d="M17 27L26 13H94L103 27Z"/><path d="M38 13L34 27M52 13L50 27M68 13L70 27M82 13L86 27"/><path d="M50 55V37H66V55"/><rect x="30" y="35" width="13" height="10"/><path d="M76 40v13a6 2.2 0 0012 0V40"/><ellipse cx="82" cy="40" rx="6" ry="2.2"/><path d="M76 46.5a6 2.2 0 0012 0"/></svg>'
  };
  const store = { get: k => { try { return localStorage.getItem('avaka_lobby_' + k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem('avaka_lobby_' + k, v); } catch (e) { /* private mode */ } } };

  let state = null, fx = { at: 0 }, tab = 'log', unread = false, chatLines = [], lastLogCount = 0, teachTarget = '';

  // one action row: title, cost, what it gives or needs, and the reason when it cannot be done
  function act(a, title, sub, opts) {
    const r = can(state, socket.id, a), o = opts || {};
    // a cost is only worth showing when the action can be done, or when the cost itself is what stops it
    const cost = (r.ok || r.why === 'ap') ? (r.cost === 0 ? T().free : `${r.cost} ${T().ap}`) : '';
    const line = r.ok ? sub : reason(r);
    return `<button type="button" class="act${o.next && r.ok ? ' next' : ''}" data-act="${esc(JSON.stringify(a))}" aria-disabled="${!r.ok}">
      <span class="t">${esc(title)}${o.small ? `<small>${esc(o.small)}</small>` : ''}</span><span class="cost">${esc(cost)}</span>
      ${line ? `<span class="sub">${esc(line)}</span>` : ''}</button>`;
  }

  // what changed between two states, so the screen can show it happening and not just the result
  function changes(a, b) {
    const x = a && a.players && a.players[socket.id], y = b && b.players && b.players[socket.id];
    if (!x || !y || a.room_code !== b.room_code || !a.started) return { at: 0 };
    return { at: Date.now(), month: b.month !== a.month ? a.month : 0, tied: y.progress > x.progress ? y.progress - 1 : -1, from: x.progress,
      ap: x.ap, kp: y.kp !== x.kp, mat: y.materials !== x.materials, score: y.score !== x.score, up: y.score > x.score, moved: y.location !== x.location };
  }

  function render() {
    if (!state || !state.players[socket.id]) return;
    const live = Date.now() - fx.at < 900, bump = k => (live && fx[k] ? ' class="bump"' : '');
    const t = T(), me = state.players[socket.id], month = state.month, L = lang();
    const players = Object.values(state.players), others = players.filter(p => p.id !== me.id);
    const rule = (typeof GAME_RULES !== 'undefined' && GAME_RULES[month - 1]) || { name: '', desc_zh: '', desc_en: '' };

    // mission and forest: what the whole group is doing this month
    let mission = '';
    if (state.mission && typeof MISSION_TEXT !== 'undefined') {
      const mt = MISSION_TEXT[L] || MISSION_TEXT.zh, m = state.mission;
      const desc = mt[m.id] ? mt[m.id](m.target) : m.desc;
      mission = `<span>${esc(t.mission)}：<b>${esc(desc)}</b> ${m.done ? `<span class="ok">${esc(t.missionDone)}</span>` : `<span>${m.progress}/${m.target}</span>`}</span>`;
    }
    const tb = state.tribe_boat || 0, tg = state.tribe_boat_goal || 3;
    const boat = `<span>${esc(t.tribeBoat)} <b>${tb}/${tg}</b> <span class="${tb >= tg ? 'ok' : ''}">${esc(tb >= tg ? t.tribeDone : t.tribeNote)}</span></span>`;
    const fv = typeof state.forest === 'number' ? state.forest : 3;
    let forest = '';
    if (typeof FOREST_TEXT !== 'undefined') {
      const ft = FOREST_TEXT[L] || FOREST_TEXT.zh, lv = forestLevel(fv);
      const note = month === 2 ? ft.closed : (state.forest_tended ? ft.tended : ft.untended);
      forest = `<span>${esc(t.forest)} <span class="trees">${'●'.repeat(fv)}<i>${'●'.repeat(5 - fv)}</i></span> <b>${esc(ft.levels[lv])}</b> <span class="${state.forest_tended || month === 2 ? '' : 'bad'}">${esc(note)}${lv === 'aged' ? '｜' + esc(ft.agedNote) : ''}</span></span>`;
    }

    // my rope
    const nextIdx = me.finished ? -1 : me.progress;
    const rope = t.steps.map((s, i) => `<li class="${i < me.progress ? 'done' : ''}${i === nextIdx ? ' next' : ''}${live && fx.tied === i ? ' tied' : ''}">${esc(s)}<small>${esc(t.stepWhere[i])}</small></li>`).join('');
    const was = live ? fx.ap : me.ap;      // pips that were just spent drain one by one; pips just won fill one by one
    const pips = Array.from({ length: me.max_ap }, (_, i) => i < me.ap
      ? `<i class="on${i >= was ? ' gain' : ''}"${i >= was ? ` style="animation-delay:${(i - was) * 70}ms"` : ''}></i>`
      : `<i${i < was ? ` class="spent" style="animation-delay:${(was - 1 - i) * 70}ms"` : ''}></i>`).join('');
    const ropeTo = Math.min(me.progress, 5) / 6 * 100, ropeFrom = live && fx.tied >= 0 ? Math.min(fx.from, 5) / 6 * 100 : ropeTo;
    const readyN = players.filter(p => p.ready).length;
    const badges = (me.badges || []).length;
    const why = typeof summarizeScoreBreakdown === 'function' ? noPicto(summarizeScoreBreakdown(me.score_breakdown)) : '';
    const fin = me.finished ? `<span class="done-note"><b>${esc(t.finished[me.path_choice] || t.finished.traditional)}</b>　${esc(t.finishedNote)}</span>` : '';

    const top = `
      <div class="top">
        <section class="panel month">
          <div class="num${live && fx.month ? ' flip' : ''}"><span class="digits">${live && fx.month ? `<i class="was">${fx.month}</i>` : ''}<i class="now">${month}</i></span><small>${esc(t.monthUnit)}</small></div>
          <h2>${esc(rule.name)} <button type="button" class="link" data-old="open-lore-btn">${esc(t.lore)}</button></h2>
          <p class="effect">${esc(L === 'en' ? rule.desc_en : rule.desc_zh)}</p>
        </section>
        <nav class="panel bar">
          <button type="button" class="tool" data-old="open-kb-btn">${esc(t.kb)}</button>
          <button type="button" class="tool" data-old="lang-btn">${esc(t.lang)}</button>
          <button type="button" class="tool icon" id="t-sfx" aria-pressed="${sfxOn}" aria-label="${esc(t.sfx)}" title="${esc(t.sfx)}">${ICON.sfx}</button>
          <button type="button" class="tool icon" id="t-music" aria-pressed="${musicOn}" aria-label="${esc(t.music)}" title="${esc(t.music)}">${ICON.music}</button>
          <button type="button" class="tool icon" id="t-theme" aria-pressed="${host.dataset.theme === 'light'}" aria-label="${esc(t.theme)}" title="${esc(t.theme)}">${ICON.theme}</button>
          <button type="button" class="tool quit" data-old="leave-game-btn">${esc(t.quit)}</button>
        </nav>
      </div>
      <section class="panel me">
        <div class="who"><b>${esc(me.name)}</b><span>${esc(t.role[me.role])}</span></div>
        <ol class="rope${ropeFrom !== ropeTo ? ' grow' : ''}" style="--to:${ropeTo}%;--from:${ropeFrom}%">${rope}</ol>
        <div class="stats">
          <div class="stat"><span class="label">${esc(t.apName)}</span><b${bump('apDiff')}>${me.ap}<small>/${me.max_ap}</small></b><div class="pips">${pips}</div></div>
          <div class="stat"><span class="label">${esc(t.kpName)}</span><b${bump('kp')}>${me.kp}</b></div>
          <div class="stat"><span class="label">${esc(t.mat)}</span><b${bump('mat')}>${me.materials}</b></div>
          <details class="stat score"><summary><span class="label">${esc(t.score)}${badges ? ` · ${esc(t.badges)} ${badges}` : ''}</span><b${bump('score')}>${me.score}</b></summary><div class="why"><b>${esc(t.scoreWhy)}</b><br>${esc(why)}</div></details>
        </div>
        <button type="button" class="go${me.ready ? ' waiting' : ''}" data-old="next-month-btn">${esc(me.ready ? t.unready : t.ready)}<small>${esc(t.readyCount(readyN, players.length))}</small></button>
        <div class="strip">${mission}${forest}${boat}${fin}</div>
      </section>`;

    // teammates
    const mates = others.map(p => {
      const g = can(state, me.id, { type: 'give', target_id: p.id }), h = can(state, me.id, { type: 'assist', target_id: p.id });
      const near = p.location === me.location;
      return `<li class="mate">
        <div class="row"><span><b>${esc(p.name)}</b> <span class="role">${esc(t.role[p.role])}</span></span><span class="where">${esc(t.place[p.location] ? t.place[p.location][0] : p.location)}</span></div>
        <div class="nums"><span>${esc(t.ap)} <b>${p.ap}</b></span><span>${esc(t.kp)} <b>${p.kp}</b></span><span>${esc(t.mat)} <b>${p.materials}</b></span><span>${esc(t.score)} <b>${p.score}</b></span></div>
        <div class="knots" aria-label="${p.progress}/6">${STEPS.map((_, i) => `<i class="${i < p.progress ? 'on' : ''}"></i>`).join('')}</div>
        ${(p.ready || p.finished || (p.assist_month || 0) === month) ? `<div class="tags">${p.finished ? `<span class="tag fin">${esc(t.doneTag)}</span>` : ''}${p.ready ? `<span class="tag ready">${esc(t.readyTag)}</span>` : ''}${(p.assist_month || 0) === month ? `<span class="tag">${esc(t.helped)}</span>` : ''}</div>` : ''}
        ${near ? `<div class="acts">
          <button type="button" class="mini" data-act="${esc(JSON.stringify({ type: 'give', target_id: p.id }))}" aria-disabled="${!g.ok}">${esc(t.give)}${g.ok ? '' : `<small>${esc(reason(g))}</small>`}</button>
          <button type="button" class="mini" data-act="${esc(JSON.stringify({ type: 'assist', target_id: p.id }))}" aria-disabled="${!h.ok}">${esc(t.assist)}<small>${esc(h.ok ? `1 ${t.ap}` : reason(h))}</small></button></div>` : ''}
      </li>`;
    }).join('');

    // the three places
    const chopN = (month === 1 || month === 7 ? 2 : 1) + ((me.plant_bonus_from || 0) > 0 && me.plant_bonus_from <= month ? 1 : 0);
    const stepRow = (step, kp, mat) => act({ type: 'craft', step }, t.steps[STEPS.indexOf(step)],
      step === 'chop' ? t.chopSub(chopN) : `${t.needLabel} ${t.needs(kp, mat)}`, { next: STEPS.indexOf(step) === nextIdx });
    const placeActs = {
      [FOREST]: act({ type: 'plant' }, t.plant, t.plantSub) + act({ type: 'patrol' }, t.patrol, t.patrolSub) + stepRow('chop') + stepRow('rub', 0, 1) + stepRow('strip', 0, 1),
      [SHORE]: stepRow('dry', 0, 1) + stepRow('twine', 3, 1) + stepRow('caulk', 8, 1) + act({ type: 'tribe' }, t.tribe, t.tribeSub(tb, tg)),
      [SHOP]: act({ type: 'buy', item: 'machine' }, t.machine, `${t.needLabel} ${t.needs(5, 2)}；${t.machineSub}`) + act({ type: 'buy', item: 'resin' }, t.resin, `${t.needLabel} ${t.needs(0, 2)}；${t.resinSub}`)
    };
    const places = [FOREST, SHORE, SHOP].map(loc => {
      const here = players.filter(p => p.location === loc);
      const mine = me.location === loc;
      return `<section class="panel place${mine ? ' here' : ''}${mine && live && fx.moved ? ' arrived' : ''}">
        <header>${ART[loc]}<h2>${esc(t.place[loc][0])}${mine ? `<span class="you">${esc(t.here)}</span>` : ''}</h2><p class="desc">${esc(t.place[loc][1])}</p>
          <div class="people">${here.length ? here.map(p => `<span class="tag${p.id === me.id ? ' me' : ''}">${esc(p.name)}</span>`).join('') : `<span class="none">${esc(t.nobody)}</span>`}</div></header>
        <div class="acts-list">${mine ? '' : act({ type: 'move', target: loc }, t.move, '')}${placeActs[loc]}</div>
      </section>`;
    }).join('');

    // things done with other people
    let social = '';
    if (me.role !== 'elder') {
      const gain = 3 + ((me.gift_month || 0) === month ? 1 : 0);
      social += act({ type: 'ask', target: 'elder' }, t.askElder, t.askElderSub(gain));
      if (me.role === 'youth' && others.some(p => p.role === 'middle')) social += act({ type: 'ask', target: 'middle' }, t.askMiddle, t.askMiddleSub);
      if (others.some(p => p.role === 'elder')) social += act({ type: 'help' }, t.help, (me.help_month || 0) === month ? t.helpMore : t.helpSub(month === 6 ? 2 : 1));
    } else {
      social += act({ type: 'tell' }, t.tell, t.tellSub(month === 2 || month === 10 ? 2 : 1));
      const learners = others.filter(p => p.role !== 'elder');
      if (learners.length) {
        if (!learners.some(p => p.id === teachTarget)) teachTarget = learners[0].id;
        social += `<div class="teach"><select id="teach-who" aria-label="${esc(t.teach)}">${learners.map(p => `<option value="${esc(p.id)}"${p.id === teachTarget ? ' selected' : ''}>${esc(p.name)}（${esc(t.role[p.role])}）</option>`).join('')}</select>${act({ type: 'teach', target_id: teachTarget }, t.teach, t.teachSub)}</div>`;
      }
    }
    social += act({ type: 'translate' }, t.translate, me.finished ? t.translateDone : t.translateSub);

    // the record
    const logs = (state.logs || []).slice().reverse();
    const fresh = Math.max(0, (state.logs || []).length - lastLogCount);
    const logHtml = logs.map((l, i) => {
      const cls = /^🎯/.test(l) ? 'mission' : /^🏅/.test(l) ? 'honour' : /^(🌳|🍂|🌱|🥾)/.test(l) ? 'forest' : /^(📜|📝|✨)/.test(l) ? 'event' : /^(🙌|🤝|🎁|💪|🗣|🛶)/.test(l) ? 'people' : /^(⚠|🌧)/.test(l) ? 'warn' : /^(⚡|⏳)/.test(l) ? 'system' : '';
      const text = noPicto(typeof translateLog === 'function' ? translateLog(l) : l);
      return `<li class="${cls}${i < fresh && lastLogCount ? ' fresh' : ''}">${esc(text)}</li>`;
    }).join('');
    lastLogCount = (state.logs || []).length;

    // keep what the person is in the middle of: the chat they are typing, where they have scrolled to
    const typing = $('chat-in') ? $('chat-in').value : '', hadFocus = root.activeElement && root.activeElement.id === 'chat-in';
    const scrolled = host.scrollTop, sel = hadFocus ? $('chat-in').selectionStart : 0;
    $('g').innerHTML = top + `
      <div class="work">
        <aside class="panel col"><h3>${esc(t.mates)}</h3><ul>${mates || `<li class="mate"><span class="role">${esc(t.nobody)}</span></li>`}</ul></aside>
        <div>
          <div class="places">${places}</div>
          <section class="panel col social"><h3>${esc(t.social)}</h3><div class="acts-list">${social}</div></section>
        </div>
        <aside class="side">
          <div class="panel film"><video id="film" muted playsinline preload="metadata" aria-label="${esc(t.film)}"></video></div>
          <div class="panel feed">
            <div class="tabs" role="tablist">
              <button type="button" class="tab" role="tab" data-tab="log" aria-selected="${tab === 'log'}">${esc(t.log)}</button>
              <button type="button" class="tab" role="tab" data-tab="chat" aria-selected="${tab === 'chat'}">${esc(t.chat)}${unread ? '<span class="dot"></span>' : ''}</button>
            </div>
            <ul class="pane log" ${tab === 'log' ? '' : 'hidden'}>${logHtml}</ul>
            <div class="pane chat" ${tab === 'chat' ? '' : 'hidden'}>
              ${chatLines.length ? `<ul id="chat-list">${chatLines.map(c => `<li><b>${esc(c.name)}</b>${esc(c.msg)}</li>`).join('')}</ul>` : `<p class="empty">${esc(t.chatEmpty)}</p>`}
              <form class="say" id="say"><input id="chat-in" type="text" autocomplete="off" maxlength="200" placeholder="${esc(t.chatPh)}" aria-label="${esc(t.chat)}"><button type="submit">${esc(t.send)}</button></form>
            </div>
          </div>
        </aside>
      </div>`;
    host.scrollTop = scrolled;
    if ($('chat-in')) { $('chat-in').value = typing; if (hadFocus) { $('chat-in').focus(); try { $('chat-in').setSelectionRange(sel, sel); } catch (e) { /* not a text field any more */ } } }
    const list = $('chat-list'); if (list) list.scrollTop = list.scrollHeight;
    mountFilm();
  }

  // ───────── the film keeps playing across redraws ─────────
  const filmEl = document.createElement('video');
  const CLIPS = ['assets/lanyu_1.mp4', 'assets/lanyu_2.mp4']; let clip = 0;
  filmEl.muted = true; filmEl.playsInline = true; filmEl.preload = 'metadata';
  filmEl.addEventListener('ended', () => { clip = (clip + 1) % CLIPS.length; filmEl.src = CLIPS[clip]; filmEl.play().catch(() => {}); });
  function mountFilm() {
    const slot = $('film');
    if (!slot) return;
    filmEl.setAttribute('aria-label', slot.getAttribute('aria-label'));
    slot.replaceWith(filmEl);
    if (!filmEl.src) filmEl.src = CLIPS[clip];
    if (visible && filmEl.paused) filmEl.play().catch(() => {});
  }

  // ───────── doing things ─────────
  root.addEventListener('click', e => {
    const el = e.target.closest ? e.target.closest('[data-act],[data-old],[data-tab],#t-music,#t-theme,#t-sfx') : null;
    if (!el) return;
    if (el.dataset.tab) { tab = el.dataset.tab; if (tab === 'chat') unread = false; render(); return; }
    if (el.id === 't-sfx') { sfxOn = !sfxOn; store.set('gsfx', sfxOn ? '1' : '0'); sfx('tap'); render(); return; }
    if (el.id === 't-music') { setMusic(!musicOn); render(); return; }
    if (el.id === 't-theme') { const light = host.dataset.theme !== 'light'; host.dataset.theme = light ? 'light' : 'dark'; store.set('theme', light ? 'light' : 'dark'); render(); return; }
    if (el.dataset.old) { const b = old(el.dataset.old); if (b) b.click(); if (el.dataset.old === 'lang-btn') setTimeout(render, 30); return; }
    if (el.getAttribute('aria-disabled') === 'true') { sfx('no'); el.classList.remove('nudge'); void el.offsetWidth; el.classList.add('nudge'); return; }   // the reason is already written on it
    const a = JSON.parse(el.dataset.act);
    sfx('tap');
    el.classList.add('busy');
    if (a.type === 'buy' && typeof openShopConfirm === 'function') { openShopConfirm(a.item); el.classList.remove('busy'); return; }   // the two generations speak first
    if (a.type === 'craft') sendAction({ type: 'craft', step: a.step });
    else if (a.type === 'move') sendAction({ type: 'move', target: a.target });
    else if (a.type === 'ask') sendAction({ type: 'ask', target: a.target });
    else sendAction(a);
    setTimeout(() => el.classList.remove('busy'), 600);
  });
  root.addEventListener('change', e => { if (e.target.id === 'teach-who') { teachTarget = e.target.value; render(); } });
  root.addEventListener('submit', e => {
    e.preventDefault();
    const inp = $('chat-in'), msg = inp.value.trim();
    if (!msg) return;
    socket.emit('chat_message', { msg }); inp.value = '';
  });
  socket.on('chat_broadcast', d => { chatLines.push({ name: d.name, msg: d.msg }); if (chatLines.length > 80) chatLines.shift(); if (tab !== 'chat') unread = true; if (visible) render(); });

  // ───────── music for the working year ─────────
  // The lobby keeps the game's own track. In play there is a second, quieter piece, played here from a
  // score: four chords going round, a soft pad holding each one, a steady plucked figure over it and a
  // short tune that comes back every eight bars. It is scheduled against the audio clock, so it keeps
  // time even when the page is busy. To use a recording instead, set `fileTrack` to an Audio element.
  let musicOn = false, ac = null, master = null, schedTimer = null, nextBar = 0, barNo = 0, fileTrack = null, lobbyWasPlaying = false;
  const BPM = 66, BEAT = 60 / BPM, BAR = BEAT * 4;
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);
  // D minor: Dm, B flat, F, C. Each entry: the pad's notes, then the plucked figure (eight quavers).
  const CHORDS = [
    { pad: [50, 57, 62, 65], arp: [62, 69, 74, 69, 77, 74, 69, 74] },
    { pad: [46, 53, 58, 62], arp: [58, 65, 70, 65, 74, 70, 65, 70] },
    { pad: [53, 60, 65, 69], arp: [65, 72, 77, 72, 81, 77, 72, 77] },
    { pad: [48, 55, 60, 64], arp: [60, 67, 72, 67, 76, 72, 67, 72] }
  ];
  // the tune: [bar, beat, note, length in beats], over eight bars; the second half answers the first
  const TUNE = [[0, 0, 81, 2], [0, 2, 79, 1], [0, 3, 77, 1], [1, 0, 74, 3], [2, 0, 77, 1.5], [2, 1.5, 79, 0.5], [2, 2, 81, 2], [3, 0, 79, 3],
                [4, 0, 81, 2], [4, 2, 84, 1], [4, 3, 81, 1], [5, 0, 77, 3], [6, 0, 79, 1.5], [6, 1.5, 77, 0.5], [6, 2, 76, 2], [7, 0, 74, 4]];
  function voice(type, note, at, len, peak, attack, cutoff) {
    const o = ac.createOscillator(), g = ac.createGain(), lp = ac.createBiquadFilter();
    o.type = type; o.frequency.value = hz(note); lp.type = 'lowpass'; lp.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(peak, at + attack); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(lp); lp.connect(g); g.connect(master); o.start(at); o.stop(at + len + 0.05);
  }
  function scoreBar(at, n) {
    const ch = CHORDS[n % 4], phrase = n % 8;
    ch.pad.forEach(note => voice('sine', note, at, BAR * 1.15, 0.16, BAR * 0.35, 900));                 // pad, overlapping into the next bar
    voice('sine', ch.pad[0] - 12, at, BAR, 0.2, 0.08, 300);                                               // bass
    ch.arp.forEach((note, k) => voice('triangle', note, at + k * BEAT / 2, BEAT * 1.6, k % 4 === 0 ? 0.15 : 0.1, 0.012, 1800));
    if (n >= 4) TUNE.filter(x => x[0] === phrase).forEach(x => voice('triangle', x[2], at + x[1] * BEAT, x[3] * BEAT * 1.1, 0.2, 0.03, 2400));   // the tune enters after one round
  }
  function audio() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = 0; master.connect(ac.destination);
      bus = ac.createGain(); bus.gain.value = 0.5; bus.connect(ac.destination);
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  // small sounds for what the hand does: the same plucked voice as the lobby, in the key of the music
  let sfxOn = store.get('gsfx') !== '0', bus = null;
  const SFX = {
    tap: [[74, 0, 0.16, 0.16]], no: [[45, 0, 0.14, 0.2, 'sine']], ready: [[69, 0, 0.2, 0.15], [74, 0.09, 0.3, 0.15]],
    knot: [[62, 0, 0.25, 0.2], [69, 0.1, 0.25, 0.2], [74, 0.2, 0.5, 0.22]], gain: [[81, 0, 0.18, 0.13], [86, 0.08, 0.35, 0.13]],
    month: [[50, 0, 1.6, 0.22, 'sine'], [57, 0.02, 1.6, 0.16, 'sine'], [74, 0.25, 0.9, 0.1]], fin: [[62, 0, 0.3, 0.2], [65, 0.12, 0.3, 0.2], [69, 0.24, 0.3, 0.2], [74, 0.36, 0.9, 0.24]]
  };
  function sfx(kind) {
    if (!sfxOn || !visible || !SFX[kind]) return;
    try {
      audio(); const at = ac.currentTime + 0.01;
      SFX[kind].forEach(([note, t, len, vol, type]) => {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = type || 'triangle'; o.frequency.value = hz(note);
        g.gain.setValueAtTime(0.0001, at + t); g.gain.linearRampToValueAtTime(vol, at + t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + t + len);
        o.connect(g); g.connect(bus); o.start(at + t); o.stop(at + t + len + 0.05);
      });
    } catch (e) { /* no audio on this device */ }
  }
  // the original click sound is a sharp zap; while this screen is up, its callers get the pluck instead
  if (typeof window.playActionSound === 'function') {
    const zap = window.playActionSound;
    window.playActionSound = function () { if (visible) sfx('tap'); else zap.apply(this, arguments); };
  }
  function schedule() {
    if (!musicOn || !ac) return;
    while (nextBar < ac.currentTime + 1.2) { scoreBar(nextBar, barNo++); nextBar += BAR; }
    schedTimer = setTimeout(schedule, 400);
  }
  function startSynth() {
    audio();
    master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(master.gain.value, ac.currentTime);
    master.gain.linearRampToValueAtTime(0.22, ac.currentTime + 2);
    clearTimeout(schedTimer);
    if (nextBar < ac.currentTime) nextBar = ac.currentTime + 0.1;   // pick the piece up where it was, on the bar
    schedule();
  }
  function stopSynth() {
    clearTimeout(schedTimer);
    if (ac && master) { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setValueAtTime(master.gain.value, ac.currentTime); master.gain.linearRampToValueAtTime(0, ac.currentTime + 0.8); }
  }
  function setMusic(on) {
    musicOn = on;
    if (fileTrack) { if (on) fileTrack.play().catch(() => {}); else fileTrack.pause(); }
    else if (on) startSynth(); else stopSynth();
  }

  // ───────── pop-ups and the year-end screen: drop the pictographs the old look used as icons ─────────
  const POPUPS = '.modal-overlay, #quiz-modal, #event-choice-modal, #minigame-modal, #toast-container';
  const PICTO = /[\p{Extended_Pictographic}️‍⚜✦]+[  ]?/gu;
  function plain(el) {
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const hits = [];
    for (let n = walk.nextNode(); n; n = walk.nextNode()) { PICTO.lastIndex = 0; if (PICTO.test(n.nodeValue)) hits.push(n); }   // a /g pattern remembers where it stopped
    PICTO.lastIndex = 0;
    hits.forEach(n => { n.nodeValue = n.nodeValue.replace(PICTO, ''); });
  }
  function tidy(node) {
    if (!node || node.nodeType !== 1) return;
    const over = !document.getElementById('game') && document.getElementById('app');           // the results have replaced the game
    if (node.matches(POPUPS) || node.closest(POPUPS)) plain(node.closest(POPUPS) || node);
    else if (over && over.contains(node)) plain(over);
    else node.querySelectorAll && node.querySelectorAll(POPUPS).forEach(plain);
  }
  new MutationObserver(list => {
    const seen = new Set();
    list.forEach(m => { const t = m.type === 'characterData' ? m.target.parentElement : m.target; if (t && !seen.has(t)) { seen.add(t); tidy(t); } m.addedNodes && m.addedNodes.forEach(tidy); });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
  document.querySelectorAll(POPUPS).forEach(plain);

  // ───────── show whenever the original game screen would ─────────
  let visible = false;
  function follow() {
    const g = old('game');
    const now = !!(g && g.classList.contains('active') && state && state.started && state.players[socket.id]);
    if (now === visible) { if (now) render(); return; }
    visible = now; host.hidden = !now;
    document.body.classList.toggle('game2-on', now);
    const bgm = old('bgm');
    if (now) {
      host.dataset.theme = store.get('theme') === 'light' ? 'light' : 'dark';
      const oldFilm = old('title-video'); if (oldFilm) oldFilm.pause();   // the original screen's film is hidden now; no need to keep streaming it
      lobbyWasPlaying = !!bgm && !bgm.paused;
      if (bgm) bgm.pause();                                         // hand over from the lobby's track
      setMusic(lobbyWasPlaying);
      render();
    } else {
      setMusic(false); filmEl.pause();
      if (lobbyWasPlaying && bgm && old('lobby') && old('lobby').classList.contains('active')) bgm.play().catch(() => {});
    }
  }
  socket.on('state_update', s => {
    fx = changes(state, s);
    if (fx.at) {
      const y = s.players[socket.id];
      fx.apDiff = y.ap !== fx.ap;
      sfx(y.finished && !state.players[socket.id].finished ? 'fin' : fx.month ? 'month' : fx.tied >= 0 ? 'knot' : fx.up ? 'gain' : '');
    }
    state = s; follow();
  });
  if (typeof window.applyLanguage === 'function') {
    const inner = window.applyLanguage;
    window.applyLanguage = function () { const r = inner.apply(this, arguments); if (visible) render(); return r; };
  }
  const watch = () => { const g = old('game'); if (g) new MutationObserver(follow).observe(g, { attributes: true, attributeFilter: ['class'] }); };
  watch();
  socket.on('rejoin_failed', () => { state = null; follow(); });
})();
