const LOBBY_HTML = `
<canvas id="fibres" aria-hidden="true"></canvas>
<div class="atmo" aria-hidden="true"></div>
<div class="grain" aria-hidden="true"></div>

<div id="ghost" aria-hidden="true"></div>
<p id="ghost-says" aria-live="polite"></p>

<div class="tools" role="group" aria-label="聲音與畫面">
  <button type="button" id="t-music" aria-pressed="false" aria-label="背景音樂" title="背景音樂">
    <svg class="on" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></svg>
    <svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/><path d="M3 3l18 18"/></svg>
  </button>
  <button type="button" id="t-sfx" aria-pressed="false" aria-label="音效" title="音效">
    <svg class="on" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 010 7M19 6a8.5 8.5 0 010 12"/></svg>
    <svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M17 9l5 6M22 9l-5 6"/></svg>
  </button>
  <button type="button" id="t-theme" aria-pressed="false" aria-label="白天模式" title="白天／夜晚">
    <svg class="on" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M19.1 4.9l-1.8 1.8M6.7 17.3l-1.8 1.8"/></svg>
    <svg class="off" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z"/></svg>
  </button>
</div>

<div class="page">
  <section class="hero">
    <div>
      <h1 id="title" aria-label="Avaka">Avaka</h1>
      <svg class="thread" viewBox="0 0 336 14" preserveAspectRatio="none" aria-hidden="true"><path d="M2 8C40 2 62 13 100 7s66-6 104 0 70 6 130-2"/><path d="M2 7C38 13 64 2 100 8s64 5 104-1 72-5 130 3"/></svg>
      <p class="binomial">Musa textilis，馬尼拉麻</p>
      <p class="title-tc">島嶼的維度</p>
      <p class="lede">一株植物，六道工序，一條能讓船出海的繩。這一年，你要親手把它做出來。</p>
      <p class="hint">
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path d="M4 3v16M9 3c0 6 4 6 4 12v4M18 3v16"/></svg>
        <span><span id="hint-text">用手撥撥看這些纖維；按住拖一圈，可以把它們捻成繩</span><button type="button" class="show-me" id="show-me">看示範</button></span>
      </p>
    </div>

    <div class="mid">
      <button type="button" class="grow" id="grow" aria-expanded="false" aria-controls="plant-note" aria-label="這株馬尼拉麻是什麼">
        <svg id="abaca" viewBox="-80 10 460 450" aria-hidden="true"></svg>
      </button>
      <p class="plant-note" id="plant-note"><b>Avaka</b>（馬尼拉麻，<i>Musa textilis</i>）是芭蕉科的植物，長得像香蕉樹，高約 2.5 到 8 公尺。它叫「麻」，用的其實是葉鞘的纖維，強韌又耐海水。原產菲律賓，蘭嶼是它自然分布的北界之一。</p>
    </div>

    <div>
      <ol class="steps" id="steps">
        <li><button type="button" data-mode="cut" aria-pressed="false"><span class="n">1</span>砍伐剝皮</button></li>
        <li><button type="button" data-mode="rub" aria-pressed="false"><span class="n">2</span>摩擦軟化</button></li>
        <li><button type="button" data-mode="strip" aria-pressed="false"><span class="n">3</span>劃痕撕絲</button></li>
        <li><button type="button" data-mode="dry" aria-pressed="false"><span class="n">4</span>曝曬乾燥</button></li>
        <li><button type="button" data-mode="twist" aria-pressed="false"><span class="n">5</span>理線捻繩</button></li>
        <li><button type="button" data-mode="caulk" aria-pressed="false"><span class="n">6</span>填縫完工</button></li>
      </ol>
      <p class="step-says" id="step-says" aria-live="polite">把游標移到任何一道工序上，看纖維怎麼變。</p>
    </div>
  </section>

  <section class="enter">
   <div class="join" id="join">
    <h2>你是誰，要去哪一間工作室</h2>

    <label class="field" for="p-name">你的名字</label>
    <input type="text" id="p-name" placeholder="例如：小明" autocomplete="off">

    <fieldset>
      <legend>你的角色</legend>
      <div class="roles">
        <label class="role"><input type="radio" name="role" value="elder">
          <!-- a hank of finished rope, bound at the waist: everything already made, kept ready to hand on -->
          <svg viewBox="0 0 120 76" aria-hidden="true">
            <path class="draw" d="M60 30C44 10 20 14 20 30s24 20 40 8c16-12 40-8 40 8s-24 20-40 0"/>
            <path d="M60 30C46 16 28 19 28 30s18 14 32 8M60 46c14 14 32 11 32 0s-18-14-32-8"/>
            <path class="bind" d="M54 31l12 0M53 35.5l14 0M53 40l14 0M54 44.5l12 0"/>
            <path d="M66 31c8-8 16-12 26-14M54 45c-8 8-16 12-26 15"/>
          </svg>
          <span class="knot" aria-hidden="true"></span><span class="name">資深工匠</span><span class="aka">耆老</span>
          <span class="does">什麼都會，體力有限。把話傳下去的人。</span>
          <span class="stats"><span>體力<b>6</b></span><span>技術<b>10</b></span></span></label>
        <label class="role"><input type="radio" name="role" value="youth">
          <!-- a young sucker: one leaf opening, the next still rolled tight -->
          <svg viewBox="0 0 120 76" aria-hidden="true">
            <path class="draw" d="M56 72c0-16 1-28 4-40M64 72c0-16-1-28-4-40"/>
            <path class="fillable" d="M60 34C50 28 38 14 36 4c14 3 24 14 24 30z"/>
            <path d="M60 34C54 26 44 14 36 4"/>
            <path class="fillable" d="M60 36c1-12 6-24 16-30 2 12-4 24-16 30z"/>
            <path d="M60 36c4-10 9-20 16-30"/>
            <path d="M44 72h32"/>
          </svg>
          <span class="knot" aria-hidden="true"></span><span class="name">文化復振青年</span><span class="aka">青年</span>
          <span class="does">走得快、體力好，但一切要從開口問開始。</span>
          <span class="stats"><span>體力<b>8</b></span><span>技術<b>0</b></span></span></label>
        <label class="role"><input type="radio" name="role" value="middle">
          <!-- two loose strands, one from each side, wound into a single cord between them -->
          <svg viewBox="0 0 120 76" aria-hidden="true">
            <path class="draw" d="M4 16c14 2 24 10 32 22 6 9 10 9 16 0s10-9 16 0 10 9 16 0c8-12 18-20 32-22"/>
            <path d="M4 60c14-2 24-10 32-22 6-9 10-9 16 0s10 9 16 0 10-9 16 0c8 12 18 20 32 22"/>
            <path class="bind" d="M40 30v16M80 30v16"/>
          </svg>
          <span class="knot" aria-hidden="true"></span><span class="name">中生代</span><span class="aka">中生代工匠</span>
          <span class="does">小時候看過老人家怎麼做，學得快，也傳得快。</span>
          <span class="stats"><span>體力<b>7</b></span><span>技術<b>5</b></span></span></label>
      </div>
    </fieldset>

    <div class="room">
      <input type="text" id="room" maxlength="4" placeholder="房間代碼（4 碼）" aria-label="房間代碼">
      <button class="btn primary magnetic" type="button" id="b-join">加入房間</button>
    </div>
    <button class="btn secondary" type="button" id="b-create">自己開一間新的</button>
    <p class="form-msg" id="form-msg" role="alert"></p>
    <div class="foot">
      <a href="#" id="rules-link">先看遊戲規則與流程</a>
      <span class="lang"><button type="button" data-lang="zh" aria-pressed="true">中文</button> · <button type="button" data-lang="en" aria-pressed="false">EN</button></span>
    </div>
   </div>

   <div class="waiting" id="waiting" hidden>
    <h2>等大家到齊</h2>
    <div class="code-row"><span class="code" id="w-code">K7QM</span><button type="button" class="copy" id="b-copy">複製</button></div>
    <p class="sub">把這四個字告訴同組的人。每個人是一股纖維，到齊了才捻得成繩。</p>
    <canvas id="rope" aria-hidden="true"></canvas>
    <ul class="members" id="members"></ul>
    <p class="together" id="together" aria-live="polite"></p>
    <button class="btn primary" type="button" id="b-start">開始這一年</button>
    <button class="back" type="button" id="b-back">回到上一步</button>
   </div>
  </section>
</div>
`;

/* Avaka lobby: the new main screen.
 *
 * It lives in its own shadow root on top of the original lobby and drives that lobby's own inputs and
 * buttons, so joining, the avatar creator, reconnecting and starting all still run through the code in
 * app.js. Open the page with ?ui=old to get the original screen back. */
(function () {
  if (new URLSearchParams(location.search).get('ui') === 'old') return;
  const oldLobby = document.getElementById('lobby');
  if (!oldLobby || !document.documentElement.attachShadow) return;
  document.body.classList.add('newui');
  const host = document.createElement('div');
  host.id = 'lobby2';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = '<link rel="stylesheet" href="css/lobby.css?v=20261014_3">' + LOBBY_HTML;   // fixed markup defined below, no user input
  document.body.appendChild(host);
  const old = id => document.getElementById(id);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const $ = id => root.getElementById(id);
  const store = {
    get: k => { try { return localStorage.getItem('avaka_lobby_' + k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem('avaka_lobby_' + k, v); } catch (e) { /* private mode */ } }
  };

  // ───────── sound: made here, not downloaded ─────────
  // Off until someone turns it on, so a classroom does not start rustling all at once.
  let ac = null, sfxOn = false, lastRustle = 0, noiseBuf = null;
  function audio() {
    if (!ac) {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      noiseBuf = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ac.state === 'suspended') ac.resume();
    return ac;
  }
  // dry fibre brushing past a hand: a short band of noise, louder the faster the hand moves
  function rustle(strength) {
    if (!sfxOn) return;
    const now = performance.now();
    if (now - lastRustle < 70) return;
    lastRustle = now;
    const a = audio(), src = a.createBufferSource(), bp = a.createBiquadFilter(), gn = a.createGain();
    src.buffer = noiseBuf; src.playbackRate.value = 0.7 + Math.random() * 0.8;
    bp.type = 'bandpass'; bp.frequency.value = 2200 + Math.random() * 2600; bp.Q.value = 0.9;
    const v = Math.min(0.07, 0.008 + strength * 0.0015);
    gn.gain.setValueAtTime(0, a.currentTime);
    gn.gain.linearRampToValueAtTime(v, a.currentTime + 0.012);
    gn.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.16);
    src.connect(bp); bp.connect(gn); gn.connect(a.destination);
    src.start(0, Math.random() * 0.2, 0.18);
  }
  // a plucked string for choices
  function pluck(freq, vol) {
    if (!sfxOn) return;
    const a = audio(), o = a.createOscillator(), gn = a.createGain(), lp = a.createBiquadFilter();
    o.type = 'triangle'; o.frequency.setValueAtTime(freq, a.currentTime);
    lp.type = 'lowpass'; lp.frequency.setValueAtTime(2600, a.currentTime); lp.frequency.exponentialRampToValueAtTime(500, a.currentTime + 0.5);
    gn.gain.setValueAtTime((vol || 0.13) * 0.65, a.currentTime);
    gn.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + 0.7);
    o.connect(lp); lp.connect(gn); gn.connect(a.destination);
    o.start(); o.stop(a.currentTime + 0.72);
  }
  const NOTE = { elder: 196, middle: 261.6, youth: 392 };

  // ───────── music / sound / daylight switches ─────────
  const press = (b, on) => b.setAttribute('aria-pressed', String(on));
  // The game already has a music player (it starts at the first click, as browsers require). This button
  // works that same player, so the choice carries on into the game.
  const bgm = old('bgm'), oldMusicBtn = old('music-btn');
  const showMusic = () => press($('t-music'), !!bgm && !bgm.paused);
  if (bgm) { bgm.addEventListener('play', showMusic); bgm.addEventListener('pause', showMusic); }
  $('t-music').addEventListener('click', e => { e.stopPropagation(); if (oldMusicBtn) oldMusicBtn.click(); setTimeout(showMusic, 60); });
  showMusic();
  $('t-sfx').addEventListener('click', () => {
    sfxOn = !sfxOn; press($('t-sfx'), sfxOn); store.set('sfx', sfxOn ? '1' : '0');
    if (sfxOn) { audio(); pluck(330); }
  });
  function setTheme(light) {
    host.dataset.theme = light ? 'light' : 'dark';
    press($('t-theme'), light); store.set('theme', light ? 'light' : 'dark');
  }
  $('t-theme').addEventListener('click', () => setTheme(host.dataset.theme !== 'light'));
  setTheme(store.get('theme') === 'light');
  // sound needs a gesture before a browser allows it, so a remembered "on" is resumed at the first touch
  if (store.get('sfx') === '1') {
    addEventListener('pointerdown', function first() {
      removeEventListener('pointerdown', first);
      if (!sfxOn) { sfxOn = true; press($('t-sfx'), true); audio(); }
    });
  }

  // ───────── the field of fibres ─────────
  const cv = $('fibres'), g = cv.getContext('2d');
  let W = 0, H = 0, dpr = 1, strands = [], drawOrder = [];
  let mode = 'hang', modeT = 0, role = null, roleT = 0, lean = 0, leanTarget = 0;
  const ptr = { x: -9999, y: -9999, vx: 0, on: false };
  const clearing = { x: -9999, y: 0, rx: 1, ry: 1 };                    // the fibres stand back from the plant
  const twist = { on: false, x: 0, y: 0, power: 0 };          // press and drag: gather strands into a rope
  const SEG = 16;
  const TONES = { dark: ['#efe6cf', '#d9cba6', '#d2a45c', '#b9b196', '#8fae6a'], light: ['#3a2c14', '#6a4c22', '#8a6a34', '#4c5b4e', '#3f6a3d'] };
  const DEPTH = [{ alpha: 0.5, width: 0.6, move: 0.6 }, { alpha: 1, width: 1, move: 1 }, { alpha: 1.5, width: 2.1, move: 1.35 }];
  const LIT = { dark: '#b6e268', light: '#2f6a33' }, SHOOT = { dark: '#9fd45a', light: '#3c8040' };

  function build() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const gap = W < 700 ? 13 : 10;
    strands = [];
    for (let x = -gap; x < W + gap; x += gap) {
      const i = strands.length, grp = Math.floor(i / 7);
      strands.push({
        x: x + (Math.random() - 0.5) * gap * 0.9, len: 0.62 + Math.random() * 0.5, phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.6, tone: (Math.random() * 5) | 0, w: 0.6 + Math.random() * 0.9, push: 0,
        alpha: 0.16 + Math.random() * 0.3, pair: i % 2 ? 1 : -1, z: Math.random() < 0.12 ? 2 : Math.random() < 0.45 ? 0 : 1, gx: (grp * 7 + 3) * gap, gi: i % 7, shoot: 0.2 + Math.random() * 0.22
      });
    }
    drawOrder = strands.slice().sort((a, b) => a.z - b.z);
  }

  function frame(now) {
    const t = now / 1000, theme = host.dataset.theme === 'light' ? 'light' : 'dark';
    modeT += (1 - modeT) * 0.045;
    roleT += (1 - roleT) * 0.035;
    lean += (leanTarget - lean) * 0.06;
    twist.power += ((twist.on ? 1 : 0) - twist.power) * (twist.on ? 0.03 : 0.045);
    g.clearRect(0, 0, W, H);
    for (const s of drawOrder) {
      const dx = s.x - ptr.x;
      const near = ptr.on ? Math.exp(-(dx * dx) / (2 * 95 * 95)) : 0;
      const target = twist.on ? 0 : near * (dx >= 0 ? 1 : -1) * 70 + near * ptr.vx * 0.9;
      s.push += (target - s.push) * 0.09;
      // what the chosen role does to the whole field
      let lenK = s.len, rolePull = 0, roleTwist = 0, roleAlpha = 0, shoot = false;
      if (role === 'elder') {          // rope already made: seven strands to a cord
        rolePull = (s.gx - s.x) * 0.82 * roleT; roleTwist = (s.gi - 3) * 2.6 * roleT; roleAlpha = 0.16 * roleT;
      } else if (role === 'youth') {   // new shoots: short, green, reaching
        lenK = s.len + (s.shoot - s.len) * roleT; shoot = roleT > 0.5; roleAlpha = 0.2 * roleT;
      } else if (role === 'middle') {  // two generations wound together, pair by pair
        rolePull = s.pair * -3.2 * roleT; roleTwist = s.pair * 6.5 * roleT;
      }
      const L = lenK * H;
      const tdx = s.x - twist.x, tg = Math.exp(-(tdx * tdx) / (2 * 130 * 130)) * twist.power;
      g.beginPath();
      let lx = 0, ly = 0;
      for (let k = 0; k <= SEG; k++) {
        const u = k / SEG, y = u * L;
        let yy = y;
        const sway = Math.sin(t * s.speed + s.phase + u * 2.4) * (role === 'youth' ? 14 : 9) * u;
        const reach = Math.exp(-((y - ptr.y) ** 2) / (2 * 190 * 190));
        let off = sway + s.push * reach * (0.35 + u * 0.65) + lean * u * u;
        const cdx = s.x - clearing.x, cdy = y - clearing.y;
        off += (cdx >= 0 ? 1 : -1) * clearing.rx * 0.92 * Math.exp(-(cdx * cdx) / (2 * clearing.rx * clearing.rx * 0.42)) * Math.exp(-(cdy * cdy) / (2 * clearing.ry * clearing.ry * 0.6));
        off += rolePull * Math.min(1, u * 2.2) + roleTwist * Math.sin(u * 13 - t * 1.4 + s.gi) * Math.min(1, u * 3);
        if (tg > 0.002) {              // being twisted by hand
          const ty = Math.exp(-((y - twist.y) ** 2) / (2 * 260 * 260));
          off += -tdx * tg * 0.88 * ty + tg * ty * s.pair * Math.sin(u * 20 - t * 7) * 13;
        }
        if (mode === 'cut') off += modeT * u * u * 160 * Math.sin(s.phase);
        else if (mode === 'rub') off += modeT * Math.sin(t * 7 + u * 9) * 16 * Math.sin(u * Math.PI);
        else if (mode === 'strip') off += modeT * Math.sin(u * 26 + s.phase * 6) * 5 + modeT * s.pair * u * 7;
        else if (mode === 'dry') off = off * (1 - modeT * 0.92);
        else if (mode === 'twist') off += modeT * s.pair * Math.sin(u * 15 - t * 2.2) * 15;
        else if (mode === 'caulk') { yy = y + (H * 0.52 - y) * modeT * 0.93; off = off * (1 - modeT) + modeT * (u - 0.5) * 60; }
        const px = s.x + off * DEPTH[s.z].move;
        if (k === 0) { g.moveTo(px, yy); lx = px; ly = yy; }
        else { g.quadraticCurveTo(lx, ly, (lx + px) / 2, (ly + yy) / 2); lx = px; ly = yy; }
      }
      g.lineTo(lx, ly);
      const lit = Math.max(twist.on ? 0 : near, tg);
      const hot = mode === 'dry' || mode === 'twist' || mode === 'caulk' ? modeT * 0.25 : 0;
      const col = lit > 0.25 ? LIT[theme] : shoot ? SHOOT[theme] : TONES[theme][s.tone];
      const tip = mode === 'caulk' ? H : L;
      const fade = g.createLinearGradient(0, 0, 0, tip);     // a strand thins away to nothing at its end
      fade.addColorStop(0, col); fade.addColorStop(0.72, col); fade.addColorStop(1, col + '00');
      g.strokeStyle = fade;
      g.globalAlpha = Math.min(1, (s.alpha + (theme === 'light' ? 0.12 : 0)) * DEPTH[s.z].alpha + lit * 0.7 + hot + roleAlpha);
      g.lineWidth = (s.w + lit * 0.9 + (role === 'youth' ? roleT * 0.5 : 0)) * DEPTH[s.z].width;
      g.lineCap = 'round';
      g.stroke();
    }
    g.globalAlpha = 1;
    ptr.vx *= 0.9;
    drawRope(t, theme);
    growPlant(now);
    if (!reduce && visible) requestAnimationFrame(frame); else looping = false;
  }

  build();
  addEventListener('resize', build);
  addEventListener('pointermove', e => {
    const v = e.clientX - ptr.x;
    ptr.vx = Math.abs(v) < 400 ? v : 0; ptr.x = e.clientX; ptr.y = e.clientY; ptr.on = true;
    if (twist.on) { twist.x = e.clientX; twist.y = e.clientY; rustle(26); }
    else if (Math.abs(ptr.vx) > 3) rustle(Math.abs(ptr.vx));
  });
  document.addEventListener('mouseleave', () => { ptr.on = false; });
  cv.addEventListener('pointerdown', e => { twist.on = true; twist.x = e.clientX; twist.y = e.clientY; pluck(147, 0.08); });
  const letGo = () => { if (twist.on) { twist.on = false; pluck(220, 0.06); } };
  addEventListener('pointerup', letGo); addEventListener('pointercancel', letGo);

  // a phone held at an angle: the fibres hang toward the low side
  function onTilt(e) { if (e.gamma != null) leanTarget = Math.max(-1, Math.min(1, e.gamma / 40)) * 90; }
  if (window.DeviceOrientationEvent) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      addEventListener('pointerdown', function ask() {      // iOS only grants this from a touch
        removeEventListener('pointerdown', ask);
        DeviceOrientationEvent.requestPermission().then(r => { if (r === 'granted') addEventListener('deviceorientation', onTilt); }).catch(() => {});
      });
    } else addEventListener('deviceorientation', onTilt);
  }

  // ───────── six steps drive the fibres ─────────
  const SAYS = {
    cut: '砍伐剝皮：在開花之前砍下假莖，把葉鞘一層層剝下來。',
    rub: '摩擦軟化：把葉鞘掛在樹枝上，抓住兩端來回摩擦，讓它變軟。',
    strip: '劃痕撕絲：用小刀在葉鞘上劃開，把纖維一絲絲撕出來。',
    dry: '曝曬乾燥：掛在通風有太陽的地方曬乾，潮濕會讓它腐爛。',
    twist: '理線捻繩：把曬乾的纖維理順，兩股互相搓捻成繩。',
    caulk: '填縫完工：把纖維塞進船板之間的縫，遇水膨脹，船就不漏。'
  };
  const ORDER = ['cut', 'rub', 'strip', 'dry', 'twist', 'caulk'];
  const says = $('step-says'), stepBtns = [...root.querySelectorAll('#steps button')];
  let pinned = null, showing = false, progress = 0;
  const setMode = m => { if (mode !== m) { mode = m; modeT = 0; } says.textContent = m === 'hang' ? T('idle') : (lang === 'en' ? SAYS_EN : SAYS)[m]; };
  const mark = m => stepBtns.forEach(o => o.setAttribute('aria-pressed', String(o.dataset.mode === m)));

  // Done in order, one to six, the fibres play the whole journey from plant to rope
  function playAll() {
    showing = true; pinned = null;
    ORDER.forEach((m, i) => setTimeout(() => { setMode(m); mark(m); pluck(196 * Math.pow(1.122, i * 2), 0.1); }, i * 1700));
    setTimeout(() => {
      mark(null); mode = 'hang'; modeT = 0; spin();
      says.textContent = T('finale');
      [261.6, 329.6, 392].forEach((f, i) => setTimeout(() => pluck(f, 0.12), i * 110));
      showing = false; progress = 0;
    }, ORDER.length * 1700 + 300);
  }
  stepBtns.forEach(b => {
    const m = b.dataset.mode;
    b.addEventListener('pointerenter', () => { if (fine && !showing) setMode(m); });
    b.addEventListener('pointerleave', () => { if (fine && !showing) setMode(pinned || 'hang'); });
    b.addEventListener('focus', () => { if (!showing) setMode(m); });
    b.addEventListener('blur', () => { if (!showing) setMode(pinned || 'hang'); });
    b.addEventListener('click', () => {
      if (showing) return;
      progress = m === ORDER[progress] ? progress + 1 : (m === ORDER[0] ? 1 : 0);
      pluck(196 * Math.pow(1.122, ORDER.indexOf(m) * 2), 0.1);
      if (progress === ORDER.length) { playAll(); return; }
      pinned = pinned === m ? null : m;
      mark(pinned); setMode(pinned || (fine ? m : 'hang'));
    });
  });

  // ───────── the name is spun out of loose threads ─────────
  const title = $('title'), WORD = 'Avaka', THREADS = '│╎┆┊╱╲≀∫';
  title.textContent = '';
  const chars = [...WORD].map(c => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = c; s.setAttribute('aria-hidden', 'true'); title.appendChild(s); return s; });
  function spin() {
    if (reduce) return;
    chars.forEach((s, i) => {
      let n = 0; const total = 7 + i * 5;
      s.classList.add('live');
      const id = setInterval(() => {
        if (n++ >= total) { clearInterval(id); s.textContent = WORD[i]; s.classList.remove('live'); return; }
        s.textContent = THREADS[(Math.random() * THREADS.length) | 0];
      }, 42);
    });
  }
  setTimeout(spin, 250);
  title.addEventListener('pointerenter', spin);

  // ───────── role cards lean toward the hand; choosing one reshapes the field ─────────
  if (fine && !reduce) {
    root.querySelectorAll('.role').forEach(card => {
      card.addEventListener('pointermove', e => {
        const r = card.getBoundingClientRect(), px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
        card.classList.add('tilting');
        card.style.setProperty('--ry', ((px - 0.5) * 14).toFixed(2) + 'deg');
        card.style.setProperty('--rx', ((0.5 - py) * 12).toFixed(2) + 'deg');
        card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        card.style.setProperty('--lit', '1');
      });
      card.addEventListener('pointerleave', () => {
        card.classList.remove('tilting');
        ['--rx', '--ry'].forEach(v => card.style.setProperty(v, '0deg'));
        card.style.setProperty('--lit', '0');
      });
    });
    const panel = root.querySelector('.enter');
    addEventListener('pointermove', e => {
      panel.style.setProperty('--px', ((e.clientX / innerWidth - 0.5) * -10).toFixed(1) + 'px');
      panel.style.setProperty('--py', ((e.clientY / innerHeight - 0.5) * -8).toFixed(1) + 'px');
    });
    root.querySelectorAll('.magnetic').forEach(btn => {
      addEventListener('pointermove', e => {
        const r = btn.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        if (Math.hypot(dx, dy) < 110) { btn.classList.add('pulled'); btn.style.setProperty('--tx', (dx * 0.28).toFixed(1) + 'px'); btn.style.setProperty('--ty', (dy * 0.28).toFixed(1) + 'px'); }
        else if (btn.classList.contains('pulled')) { btn.classList.remove('pulled'); btn.style.setProperty('--tx', '0px'); btn.style.setProperty('--ty', '0px'); }
      });
    });
  }
  root.querySelectorAll('.role input').forEach(inp => inp.addEventListener('change', () => {
    role = inp.value; roleT = 0;
    strands.forEach(s => { s.push += (Math.random() - 0.5) * 120; });
    pluck(NOTE[role], 0.14);
  }));

  // ───────── the plant grows while you stay ─────────
  // An abacá: a stout pseudo-stem of overlapping leaf sheaths, long upright paddle leaves with a
  // pale midrib, a rolled new leaf at the heart, and suckers coming up beside it.
  const grow = $('grow'), note = $('plant-note'), abaca = $('abaca'), SVGNS = 'http://www.w3.org/2000/svg';
  const mk = (tag, attrs, parent) => { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); (parent || abaca).appendChild(e); return e; };
  // one leaf, drawn pointing straight up from (0,0); `bend` makes it arch over to one side
  function leafPaths(L, Wd, bend) {
    const N = 16, mid = [], left = [], right = [];
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      const x = bend * L * u * u * 0.55, y = -L * u * (1 - 0.16 * Math.abs(bend) * u);
      const tx = bend * L * u * 1.1, ty = -L * (1 - 0.32 * Math.abs(bend) * u), tl = Math.hypot(tx, ty) || 1;
      const nx = -ty / tl, ny = tx / tl;
      const w = Wd * Math.pow(Math.sin(Math.PI * Math.min(1, u * 0.985 + 0.015)), 0.46) * (1 - 0.16 * u) * (u < 0.12 ? 0.22 + u * 6.5 : 1);   // a long oblong paddle, blunt toward the tip
      mid.push([x, y]); left.push([x - nx * w, y - ny * w]); right.push([x + nx * w, y + ny * w]);
    }
    const P = pts => pts.map(p => p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' L');
    const veins = [];
    for (let i = 3; i < N - 1; i += 2) {
      veins.push('M' + P([mid[i], left[i + 1]])); veins.push('M' + P([mid[i], right[i + 1]]));
    }
    return {
      blade: 'M' + P(left) + ' L' + P(right.slice().reverse()) + 'Z',
      lit: 'M' + P(mid) + ' L' + P(right.slice().reverse()) + 'Z',
      rib: 'M' + P(mid), veins: veins.join(' ')
    };
  }
  const leaves = [];
  function addLeaf(parent, x, y, angle, L, Wd, bend, cls, start) {
    const gEl = mk('g', { class: 'leaf ' + (cls || '') }, parent), d = leafPaths(L, Wd, bend);
    mk('path', { class: 'blade', d: d.blade }, gEl); mk('path', { class: 'blade-lit', d: d.lit }, gEl);
    mk('path', { class: 'vein', d: d.veins }, gEl); mk('path', { class: 'rib', d: d.rib }, gEl);
    leaves.push({ el: gEl, x, y, angle, start });
  }
  const whole = mk('g', { class: 'whole' }), swayG = mk('g', { class: 'sway' }, whole);
  const CX = 150, CROWN = 262, BASE = 440;
  // leaves behind the stem
  [[-56, 172, 40, -0.6, 0.34], [52, 180, 42, 0.56, 0.44], [-24, 210, 40, -0.26, 0.54]]
    .forEach(a => addLeaf(swayG, CX, CROWN + 6, a[0], a[1], a[2], a[3], 'back', a[4]));
  // suckers: young shoots at the foot
  [[-52, 0.5], [46, 0.62]].forEach(([dx, st]) => {
    const sg = mk('g', {}, swayG);
    mk('path', { class: 'sheath-shade', d: `M${CX + dx - 7} ${BASE} C${CX + dx - 6} ${BASE - 40} ${CX + dx - 3} ${BASE - 70} ${CX + dx} ${BASE - 86} C${CX + dx + 3} ${BASE - 70} ${CX + dx + 6} ${BASE - 40} ${CX + dx + 7} ${BASE}Z` }, sg);
    addLeaf(sg, CX + dx, BASE - 78, dx < 0 ? -22 : 20, 78, 18, dx < 0 ? -0.32 : 0.3, '', st);
    addLeaf(sg, CX + dx, BASE - 80, dx < 0 ? 14 : -12, 64, 15, dx < 0 ? 0.2 : -0.18, '', st + 0.06);
  });
  // the pseudo-stem: sheath wrapped over sheath, which is where the fibre is
  mk('path', { class: 'sheath', d: `M${CX - 25} ${BASE} C${CX - 23} ${BASE - 70} ${CX - 17} ${BASE - 130} ${CX - 12} ${CROWN - 4} L${CX + 12} ${CROWN - 4} C${CX + 17} ${BASE - 130} ${CX + 23} ${BASE - 70} ${CX + 25} ${BASE}Z` }, swayG);
  mk('path', { class: 'sheath-shade', d: `M${CX + 4} ${BASE} C${CX + 6} ${BASE - 70} ${CX + 6} ${BASE - 130} ${CX + 4} ${CROWN - 4} L${CX + 12} ${CROWN - 4} C${CX + 17} ${BASE - 130} ${CX + 23} ${BASE - 70} ${CX + 25} ${BASE}Z` }, swayG);
  mk('path', { class: 'sheath-line', d: [
    `M${CX - 21} ${BASE - 22} C${CX - 6} ${BASE - 70} ${CX + 2} ${BASE - 120} ${CX + 6} ${CROWN + 4}`,
    `M${CX + 22} ${BASE - 40} C${CX + 8} ${BASE - 86} ${CX - 2} ${BASE - 132} ${CX - 7} ${CROWN + 2}`,
    `M${CX - 14} ${BASE} C${CX - 4} ${BASE - 46} ${CX + 12} ${BASE - 78} ${CX + 19} ${BASE - 104}`,
    `M${CX + 12} ${BASE} C${CX + 2} ${BASE - 30} ${CX - 12} ${BASE - 52} ${CX - 20} ${BASE - 70}`,
    `M${CX - 9} ${CROWN + 44} C${CX - 2} ${CROWN + 22} ${CX + 5} ${CROWN + 8} ${CX + 10} ${CROWN - 2}`
  ].join(' ') }, swayG);
  // leaves in front, then the rolled new leaf at the heart
  [[-40, 190, 44, -0.44, 0.64], [36, 198, 45, 0.4, 0.72], [10, 218, 40, 0.1, 0.8]]
    .forEach(a => addLeaf(swayG, CX, CROWN, a[0], a[1], a[2], a[3], '', a[4]));
  addLeaf(swayG, CX, CROWN - 2, 2, 128, 6.5, 0.04, '', 0.9);
  mk('path', { class: 'soil', d: `M${CX - 96} ${BASE + 3} C${CX - 40} ${BASE - 4} ${CX + 40} ${BASE - 4} ${CX + 96} ${BASE + 3}` }, whole);

  // The plant stands in whatever room is left beside the six steps, and never over them
  const heroEl = root.querySelector('.hero'), stepsBlock = $('steps').parentElement;
  const topBlock = heroEl.firstElementChild;
  function fitPlant() {
    const narrow = innerWidth <= 980;                                       // one column: the page simply scrolls
    const free = heroEl.clientWidth - stepsBlock.offsetWidth + 24 - 56;     // +24: it may lean into the gutter; -56: clear of the steps' backdrop
    const stacked = narrow || free < 190;
    // whatever height is left between the words above and the six steps below, so nothing is pushed off the window
    const pad = parseFloat(getComputedStyle(heroEl).top) || 0;
    const room = innerHeight - pad * 2 - topBlock.offsetHeight - stepsBlock.offsetHeight - 36;
    let w = stacked ? 260 : Math.min(380, free);
    if (!narrow) w = Math.min(w, stacked ? room : innerHeight * 0.5);
    heroEl.classList.toggle('stacked', stacked);
    heroEl.classList.toggle('no-plant', w < 120);
    heroEl.style.setProperty('--plant-w', Math.max(0, Math.round(w)) + 'px');
  }
  fitPlant(); addEventListener('resize', fitPlant);
  // The blocks above and below change height when the stylesheet and the fonts arrive, and with the language
  if (window.ResizeObserver) { const ro = new ResizeObserver(() => { fitPlant(); placeClearing(); }); ro.observe(topBlock); ro.observe(stepsBlock); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitPlant(); placeClearing(); });
  function placeClearing() {
    const r = grow.getBoundingClientRect();
    clearing.x = r.left + r.width / 2; clearing.y = r.top + r.height * 0.5; clearing.rx = r.width * 0.5; clearing.ry = r.height * 0.62;
  }
  placeClearing(); addEventListener('resize', placeClearing); host.addEventListener('scroll', placeClearing, { passive: true });
  [300, 900].forEach(ms => setTimeout(placeClearing, ms));
  const born = performance.now(); let boost = 0;
  const ease = v => v * v * (3 - 2 * v);
  function growPlant(now) {
    const p = reduce ? 1 : Math.min(1, (now - born) / 45000 + boost + 0.3);   // starts as a young plant, full-grown in under a minute
    const size = 0.42 + 0.58 * ease(p);
    whole.setAttribute('transform', `translate(${CX} ${BASE}) scale(${size.toFixed(3)}) translate(${-CX} ${-BASE})`);
    for (const l of leaves) {
      const k = ease(Math.max(0, Math.min(1, (p - l.start * 0.72) / 0.26)));    // each leaf unrolls upright, then leans out
      l.el.setAttribute('transform', `translate(${l.x} ${l.y}) rotate(${(l.angle * (0.25 + 0.75 * k)).toFixed(1)}) scale(${(0.12 + 0.88 * k).toFixed(3)})`);
      l.el.style.opacity = k < 0.02 ? 0 : 1;
    }
  }
  grow.addEventListener('click', () => {
    const open = !note.classList.contains('open');
    note.classList.toggle('open', open); grow.setAttribute('aria-expanded', String(open));
    boost += 0.14; pluck(294, 0.09);                            // tending it helps it along
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { note.classList.remove('open'); grow.setAttribute('aria-expanded', 'false'); } });

  // ───────── waiting room: every player a strand ─────────
  const rope = $('rope'), rg = rope.getContext('2d'), members = $('members');
  const STRAND = [['#b6e268', '#2f6a33'], ['#d2a45c', '#7a5526'], ['#efe6cf', '#3a2c14'], ['#8fae6a', '#4c5b4e'], ['#e3c98a', '#8a6a34'], ['#9fd45a', '#3c8040']];
  let here = [], joined = 0, room = null;
  function sizeRope() { const r = rope.getBoundingClientRect(); rope.width = Math.max(1, r.width * dpr); rope.height = Math.max(1, r.height * dpr); }
  function drawRope(t, theme) {
    if ($('waiting').hidden) return;
    const w = rope.width / dpr, h = rope.height / dpr, n = here.length;
    rg.setTransform(dpr, 0, 0, dpr, 0, 0); rg.clearRect(0, 0, w, h);
    joined += ((n >= 2 ? 1 : 0) - joined) * 0.03;                  // two or more are wound together
    here.forEach((m, i) => {
      m.t += (1 - m.t) * 0.04;
      const apart = (i - (n - 1) / 2) * Math.min(34, 110 / Math.max(1, n)) * (1 - joined);
      rg.beginPath();
      for (let x = 0; x <= w * m.t; x += 6) {
        const u = x / w;
        const loose = Math.sin(u * 7 + t * 1.3 + i * 2.1) * 7 * (1 - joined);
        const wound = Math.sin(u * 26 - t * 2.4 + i * (Math.PI * 2 / Math.max(1, n))) * 9 * joined;
        const y = h / 2 + apart + loose + wound;
        if (x === 0) rg.moveTo(x, y); else rg.lineTo(x, y);
      }
      rg.strokeStyle = m.tone[theme === 'light' ? 1 : 0]; rg.lineWidth = 2.6 + joined * 1.2; rg.lineCap = 'round'; rg.stroke();
    });
  }
  function showRoom(state) {
    const players = Object.values(state.players), firstTime = $('waiting').hidden;
    $('w-code').textContent = state.room_code; $('join').hidden = true; $('waiting').hidden = false;
    if (firstTime) { here = []; joined = 0; sizeRope(); }
    // keep each strand's colour and how far it has been drawn while people come and go
    const before = new Map(here.map(m => [m.id, m]));
    here = players.map((p, i) => before.get(p.id) || { id: p.id, t: 0, tone: STRAND[(before.size + i) % STRAND.length] });
    if (players.some(p => !before.has(p.id)) && !firstTime) pluck(261.6, 0.11);
    members.textContent = '';
    players.forEach((p, i) => {
      const li = document.createElement('li'), dot = document.createElement('span'), name = document.createElement('span'), aka = document.createElement('small');
      dot.className = 'dot'; dot.style.background = here[i].tone[host.dataset.theme === 'light' ? 1 : 0];
      name.textContent = p.name + (p.id === socket.id ? T('meMark') : ''); aka.textContent = T('aka_' + p.role);
      li.append(dot, name, aka); li.className = 'in'; members.appendChild(li);
    });
    $('together').textContent = T(players.length >= 2 ? 'together' : 'alone').replace('{n}', players.length);
  }
  function showJoin() { $('waiting').hidden = true; $('join').hidden = false; room = null; }
  function syncRoom(state) {
    room = state;
    if (state && !state.started && state.month <= 12 && state.players[socket.id]) showRoom(state); else showJoin();
  }
  socket.on('state_update', syncRoom);
  socket.on('rejoin_failed', showJoin);

  // ───────── the form hands over to the game's own lobby code ─────────
  const formMsg = text => { $('form-msg').textContent = text || ''; };
  function submit(kind) {
    const name = $('p-name').value.trim(), picked = root.querySelector('.role input:checked'), code = $('room').value.trim().toUpperCase();
    if (!name) { formMsg(T('needName')); $('p-name').focus(); return; }
    if (!picked) { formMsg(T('needRole')); return; }
    if (kind === 'join' && code.length !== 4) { formMsg(T('needCode')); $('room').focus(); return; }
    formMsg(''); heldError = '';
    old('player-name').value = name;
    const opt = document.querySelector('.role-option[data-role="' + picked.value + '"]');
    if (opt) opt.click();
    old('room-code').value = code;
    old(kind === 'join' ? 'join-btn' : 'create-btn').click();     // opens the avatar creator, then joins
  }
  $('b-join').addEventListener('click', () => submit('join'));
  $('b-create').addEventListener('click', () => submit('create'));
  [$('p-name'), $('room')].forEach(inp => inp.addEventListener('keydown', e => { if (e.key === 'Enter') submit($('room').value.trim() ? 'join' : 'create'); }));
  $('b-back').addEventListener('click', () => { old('leave-lobby-btn').click(); showJoin(); });
  $('b-start').addEventListener('click', () => { pluck(523, 0.1); old('start-game-btn').click(); });
  $('rules-link').addEventListener('click', e => { e.preventDefault(); old('open-rules-btn').click(); });
  // A refusal from the server (say, a room code that does not exist) usually lands while the avatar
  // creator is still up, so it is kept and shown as soon as this screen is back.
  let heldError = '';
  socket.on('error', err => { if (!err || !err.msg) return; heldError = err.msg; if (visible) { formMsg(heldError); heldError = ''; } });
  addEventListener('resize', () => { if (!$('waiting').hidden) sizeRope(); });

  // ───────── two languages ─────────
  const SAYS_EN = {
    cut: 'Chop and peel: cut the pseudo-stem before it flowers and peel the leaf sheaths off one by one.',
    rub: 'Rub soft: hang a sheath over a branch, hold both ends and work it back and forth until it softens.',
    strip: 'Score and strip: slit the sheath with a small knife and pull the fibre out thread by thread.',
    dry: 'Dry in the sun: hang it where the air moves and the sun reaches. Damp makes it rot.',
    twist: 'Comb and twist: straighten the dry fibre and twist two strands round each other into rope.',
    caulk: 'Caulk: press the fibre into the seam between the planks. It swells in water and the boat stays tight.'
  };
  const TEXT = {
    zh: {
      binomial: 'Musa textilis，馬尼拉麻', titleTc: '島嶼的維度', lede: '一株植物，六道工序，一條能讓船出海的繩。這一年，你要親手把它做出來。',
      hint: '用手撥撥看這些纖維；按住拖一圈，可以把它們捻成繩', showMe: '看示範', idle: '把游標移到任何一道工序上，看纖維怎麼變。',
      steps: ['砍伐剝皮', '摩擦軟化', '劃痕撕絲', '曝曬乾燥', '理線捻繩', '填縫完工'], finale: '一株植物，成了一條繩。這就是你接下來一年要走的路。',
      h2: '你是誰，要去哪一間工作室', nameLabel: '你的名字', namePh: '例如：小明', roleLegend: '你的角色', ap: '體力', kp: '技術',
      name_elder: '資深工匠', aka_elder: '耆老', does_elder: '什麼都會，體力有限。把話傳下去的人。',
      name_youth: '文化復振青年', aka_youth: '青年', does_youth: '走得快、體力好，但一切要從開口問開始。',
      name_middle: '中生代', aka_middle: '中生代工匠', does_middle: '小時候看過老人家怎麼做，學得快，也傳得快。',
      roomPh: '房間代碼（4 碼）', join: '加入房間', create: '自己開一間新的', rules: '先看遊戲規則與流程',
      waitH2: '等大家到齊', waitSub: '把這四個字告訴同組的人。每個人是一股纖維，到齊了才捻得成繩。', copy: '複製', copied: '已複製',
      start: '開始這一年', back: '離開這個房間',
      meMark: '（你）', alone: '你先到了。把房間代碼給同組的人。', together: '{n} 個人到了，纖維開始捻在一起。',
      needName: '請先輸入名字。', needRole: '請先選一個角色。', needCode: '房間代碼是 4 個字。',
      plant: '<b>Avaka</b>（馬尼拉麻，<i>Musa textilis</i>）是芭蕉科的植物，長得像香蕉樹，高約 2.5 到 8 公尺。它叫「麻」，用的其實是葉鞘的纖維，強韌又耐海水。原產菲律賓，蘭嶼是它自然分布的北界之一。',
      plantLabel: '這株馬尼拉麻是什麼', tMusic: '背景音樂', tSfx: '音效', tTheme: '白天／夜晚',
      demo1: '滑過去，纖維會被撥開', demo2: '按住拖曳，把它們捻成繩', demo3: '點一道工序，看纖維怎麼做'
    },
    en: {
      binomial: 'Musa textilis, Manila hemp', titleTc: 'Dimensions of the Island', lede: 'One plant, six steps, one rope that lets a boat go to sea. This year you make it with your own hands.',
      hint: 'Run your hand through the fibres; press and drag to twist them into rope', showMe: 'Show me', idle: 'Move over any step to see what the fibres do.',
      steps: ['Chop', 'Rub', 'Strip', 'Dry', 'Twist', 'Caulk'], finale: 'One plant has become one rope. That is the road ahead of you this year.',
      h2: 'Who are you, and which workshop?', nameLabel: 'Your name', namePh: 'e.g. Ming', roleLegend: 'Your role', ap: 'Stamina', kp: 'Skill',
      name_elder: 'Elder', aka_elder: 'Senior artisan', does_elder: 'Knows it all, tires fast. Passes the word on.',
      name_youth: 'Youth', aka_youth: 'Reviving the craft', does_youth: 'Fast and strong, but it all starts with asking.',
      name_middle: 'Middle', aka_middle: 'Middle generation', does_middle: 'Watched the elders as a child. Learns fast, teaches fast.',
      roomPh: 'Room code (4 characters)', join: 'Join room', create: 'Open a new room', rules: 'Read the rules first',
      waitH2: 'Waiting for everyone', waitSub: 'Give these four characters to your group. Each player is one strand; the rope is twisted when all are here.', copy: 'Copy', copied: 'Copied',
      start: 'Begin the year', back: 'Leave this room',
      meMark: ' (you)', alone: 'You are the first one here. Share the room code with your group.', together: '{n} players are here. The strands begin to twist together.',
      needName: 'Please enter your name first.', needRole: 'Please choose a role first.', needCode: 'A room code has 4 characters.',
      plant: '<b>Avaka</b> (Manila hemp, <i>Musa textilis</i>) belongs to the banana family and looks like a banana plant, 2.5 to 8 m tall. It is called hemp, but the fibre comes from its leaf sheaths: strong, and it stands up to seawater. It is native to the Philippines, and Lanyu is one of the northern limits of its natural range.',
      plantLabel: 'What is this plant', tMusic: 'Music', tSfx: 'Sound effects', tTheme: 'Day / night',
      demo1: 'Sweep across and the fibres part', demo2: 'Press and drag to twist them into rope', demo3: 'Pick a step to see the fibres do it'
    }
  };
  let lang = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'zh';
  function T(k) { return TEXT[lang][k]; }
  function applyLang() {
    const set = (sel, k) => { const e = root.querySelector(sel); if (e) e.textContent = T(k); };
    set('.binomial', 'binomial'); set('.title-tc', 'titleTc'); set('.lede', 'lede'); set('#hint-text', 'hint'); set('#show-me', 'showMe');
    set('#join h2', 'h2'); set('label[for=p-name]', 'nameLabel'); set('legend', 'roleLegend'); set('#b-join', 'join'); set('#b-create', 'create'); set('#rules-link', 'rules');
    set('#waiting h2', 'waitH2'); set('#waiting .sub', 'waitSub'); set('#b-copy', 'copy'); set('#b-start', 'start'); set('#b-back', 'back');
    $('p-name').placeholder = T('namePh'); $('room').placeholder = T('roomPh'); $('room').setAttribute('aria-label', T('roomPh'));
    stepBtns.forEach((b, i) => { b.lastChild.textContent = T('steps')[i]; });
    root.querySelectorAll('.role').forEach(card => {
      const r = card.querySelector('input').value;
      card.querySelector('.name').textContent = T('name_' + r); card.querySelector('.aka').textContent = T('aka_' + r); card.querySelector('.does').textContent = T('does_' + r);
      const st = card.querySelectorAll('.stats > span');
      st[0].firstChild.textContent = T('ap'); st[1].firstChild.textContent = T('kp');
    });
    note.innerHTML = T('plant');                                   // fixed text from the table above, never user input
    grow.setAttribute('aria-label', T('plantLabel'));
    [['t-music', 'tMusic'], ['t-sfx', 'tSfx'], ['t-theme', 'tTheme']].forEach(([id, k]) => { $(id).title = T(k); $(id).setAttribute('aria-label', T(k)); });
    root.querySelectorAll('.lang button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === lang)));
    says.textContent = mode === 'hang' ? T('idle') : (lang === 'en' ? SAYS_EN : SAYS)[mode];
    root.querySelector('.title-tc').style.letterSpacing = lang === 'en' ? '0.02em' : '';
    if (typeof fitPlant === 'function') { fitPlant(); placeClearing(); }
  }
  root.querySelectorAll('.lang button').forEach(b => b.addEventListener('click', () => {
    if (typeof currentLang !== 'undefined' && currentLang !== b.dataset.lang && old('lang-btn')) old('lang-btn').click();   // the game switches all of its own text
    lang = b.dataset.lang; applyLang(); if (room) syncRoom(room); pluck(330, 0.08);
  }));
  applyLang();

  // ───────── copy the room code ─────────
  $('b-copy').addEventListener('click', () => {
    const code = $('w-code').textContent.trim(), btn = $('b-copy');
    const done = () => { btn.textContent = T('copied'); btn.classList.add('done'); pluck(440, 0.09); setTimeout(() => { btn.textContent = T('copy'); btn.classList.remove('done'); }, 1600); };
    const oldWay = () => { const ta = document.createElement('textarea'); ta.value = code; ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { if (document.execCommand('copy')) done(); } catch (e) { /* leave it */ } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done).catch(oldWay);
    else oldWay();
  });

  // ───────── a hand that shows how ─────────
  // The first time someone arrives, a ghost pointer sweeps the fibres, twists a few, and points at the
  // steps. Any real movement takes over at once.
  const ghost = $('ghost'), ghostSays = $('ghost-says');
  let demoOn = false, demoTimers = [];
  function stopDemo() {
    if (!demoOn) return;
    demoOn = false; demoTimers.forEach(clearTimeout); demoTimers = [];
    ghost.classList.remove('on', 'down'); ghostSays.classList.remove('on');
    twist.on = false; ptr.on = false;
    if (!pinned) { mode = 'hang'; modeT = 0; mark(null); says.textContent = T('idle'); }
  }
  function runDemo() {
    if (reduce || demoOn) return;
    demoOn = true; store.set('seen', '1');
    const at = (ms, fn) => demoTimers.push(setTimeout(() => { if (demoOn) fn(); }, ms));
    const place = (x, y) => { ghost.style.transform = `translate(${x}px, ${y}px)`; };
    const say = k => { ghostSays.textContent = T(k); ghostSays.classList.add('on'); };
    const glide = (from, to, t0, dur, each) => {
      for (let i = 0; i <= 40; i++) at(t0 + dur * i / 40, () => {
        const u = i / 40, e = u * u * (3 - 2 * u), x = from[0] + (to[0] - from[0]) * e, y = from[1] + (to[1] - from[1]) * e;
        place(x, y); each(x, y);
      });
    };
    const y0 = H * 0.42, xa = W * 0.18, xb = W * 0.46;
    place(xa, y0); ghost.classList.add('on'); say('demo1');
    glide([xa, y0], [xb, y0], 300, 1500, (x, y) => { ptr.vx = 9; ptr.x = x; ptr.y = y; ptr.on = true; });
    glide([xb, y0], [xa, y0 + 30], 1900, 1400, (x, y) => { ptr.vx = -9; ptr.x = x; ptr.y = y; ptr.on = true; });
    at(3500, () => { say('demo2'); ghost.classList.add('down'); twist.on = true; ptr.on = false; });
    glide([xa, y0 + 30], [W * 0.34, y0 - 40], 3500, 2200, (x, y) => { twist.x = x; twist.y = y; });
    at(5900, () => { twist.on = false; ghost.classList.remove('down'); say('demo3'); });
    const b = stepBtns[4].getBoundingClientRect();
    glide([W * 0.34, y0 - 40], [b.left + 14, b.top + 14], 5900, 1100, () => {});
    at(7100, () => { ghost.classList.add('down'); mode = 'twist'; modeT = 0; mark('twist'); says.textContent = (lang === 'en' ? SAYS_EN : SAYS).twist; });
    at(7400, () => ghost.classList.remove('down'));
    at(9600, stopDemo);
  }
  ['pointerdown', 'wheel', 'keydown', 'touchstart'].forEach(ev => addEventListener(ev, e => { if (demoOn && (e.composedPath ? e.composedPath()[0] : e.target) !== $('show-me')) stopDemo(); }, { passive: true }));
  let realMoves = 0;
  addEventListener('pointermove', e => { if (demoOn && e.isTrusted && ++realMoves > 6) stopDemo(); });
  $('show-me').addEventListener('click', () => { stopDemo(); realMoves = 0; setTimeout(runDemo, 60); });
  if (!store.get('seen')) setTimeout(() => { if (visible && !$('join').hidden) { realMoves = 0; runDemo(); } }, 2600);

  // ───────── the avatar creator, dressed for the same world ─────────
  // Its markup and behaviour stay in app.js; here the pictographs are dropped from its labels and the
  // 3D stage is relit, each time the game rewrites or rebuilds them.
  const noPicto = s => s.replace(/^[\s\p{Extended_Pictographic}️‍]+/u, '');
  function dressAvatar() {
    document.querySelectorAll('#avatar-screen h2, #avatar-screen p, #avatar-screen .avatar-ctrl-label, #avatar-confirm-btn').forEach(el => {
      if (!el.children.length && el.textContent !== noPicto(el.textContent)) el.textContent = noPicto(el.textContent);
    });
  }
  function dressStage() {
    if (typeof THREE === 'undefined' || typeof avatarScene === 'undefined' || !avatarScene) return;
    avatarScene.background = new THREE.Color('#0c1610');
    if (avatarScene.fog) avatarScene.fog.color.set('#0c1610');
    avatarScene.children.forEach(o => {
      if (o.isPointLight) o.color.set('#d2a45c');                              // the rim light: rope gold instead of screen blue
      if (o.isMesh && o.geometry && o.geometry.type === 'CircleGeometry') o.material.color.set('#13221a');
    });
    if (typeof avatarParticles !== 'undefined' && avatarParticles) {           // drifting motes in fibre and leaf tones
      const tones = ['#efe6cf', '#d2a45c', '#b6e268', '#d9cba6', '#8fae6a'].map(c => new THREE.Color(c));
      const col = avatarParticles.geo.getAttribute('color');
      for (let i = 0; i < col.count; i++) { const c = tones[i % tones.length]; col.setXYZ(i, c.r, c.g, c.b); }
      col.needsUpdate = true;
      avatarParticles.points.material.opacity = 0.5;
    }
  }
  if (typeof window.applyLanguage === 'function') {
    const gameApplyLanguage = window.applyLanguage;
    window.applyLanguage = function () { const r = gameApplyLanguage.apply(this, arguments); dressAvatar(); return r; };
  }
  if (typeof window.initAvatar3D === 'function') {
    const gameInitAvatar = window.initAvatar3D;
    window.initAvatar3D = function () { const r = gameInitAvatar.apply(this, arguments); dressStage(); dressAvatar(); return r; };
  }
  dressAvatar();

  // ───────── follow the original lobby screen: this one shows whenever that one would ─────────
  let visible = false, looping = false;
  function follow() {
    const now = oldLobby.classList.contains('active');
    if (now === visible) return;
    visible = now; host.hidden = !now;
    document.body.classList.toggle('lobby2-on', now);
    if (now) {
      const g2 = (typeof currentLang !== 'undefined' && currentLang === 'en') ? 'en' : 'zh';
      if (g2 !== lang) { lang = g2; applyLang(); }
      build(); fitPlant(); placeClearing(); if (!$('waiting').hidden) sizeRope();
      if (heldError) { formMsg(heldError); heldError = ''; }
      if (!looping) { looping = true; requestAnimationFrame(frame); }
    } else stopDemo();
  }
  new MutationObserver(follow).observe(oldLobby, { attributes: true, attributeFilter: ['class'] });
  follow();
})();


