/* A small QR code maker for the join links (byte mode, error correction level M, versions 1 to 6, so up to
 * about 100 characters: a room link is about 40). Written here rather than downloaded, so the classroom
 * page has nothing to fetch from elsewhere. Follows ISO/IEC 18004; the structure is the one in Project Nayuki's
 * reference implementation.
 *
 *   AvakaQR.svg('https://…/?room=K7QM', { dark: '#0c1610', light: '#efe6cf' })  → an <svg> string
 *   AvakaQR.matrix(text)                                                         → rows of true/false
 */
(function () {
  // level M: [error-correction codewords per block, [data codewords of each block]]
  const M = [null, [10, [16]], [16, [28]], [26, [44]], [18, [32, 32]], [24, [43, 43]], [16, [27, 27, 27, 27]]];
  const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34]];

  function gfMul(x, y) {
    let z = 0;
    for (let i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11d); z ^= ((y >>> i) & 1) * x; }
    return z & 0xff;
  }
  function rsDivisor(degree) {
    const r = new Array(degree).fill(0); r[degree - 1] = 1;
    let root = 1;
    for (let i = 0; i < degree; i++) {
      for (let j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; }
      root = gfMul(root, 2);
    }
    return r;
  }
  function rsRemainder(data, div) {
    const r = div.map(() => 0);
    for (const b of data) {
      const f = b ^ r.shift(); r.push(0);
      div.forEach((c, i) => { r[i] ^= gfMul(c, f); });
    }
    return r;
  }

  function codewords(bytes) {
    let ver = 1;
    while (ver <= 6 && M[ver][1].reduce((a, b) => a + b, 0) < bytes.length + 2) ver++;
    if (ver > 6) throw new Error('QR: text too long');
    const [ec, blocks] = M[ver], cap = blocks.reduce((a, b) => a + b, 0);
    const bits = [];
    const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >>> i) & 1); };
    put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8));
    put(0, Math.min(4, cap * 8 - bits.length));
    while (bits.length % 8) bits.push(0);
    const data = [];
    for (let i = 0; i < bits.length; i += 8) data.push(bits.slice(i, i + 8).reduce((a, b) => (a << 1) | b, 0));
    for (let pad = 0xec; data.length < cap; pad ^= 0xec ^ 0x11) data.push(pad);
    const div = rsDivisor(ec), split = [], ecs = [];
    let k = 0;
    for (const n of blocks) { const d = data.slice(k, k + n); k += n; split.push(d); ecs.push(rsRemainder(d, div)); }
    const out = [];
    for (let i = 0; i < Math.max(...blocks); i++) split.forEach(d => { if (i < d.length) out.push(d[i]); });
    for (let i = 0; i < ec; i++) ecs.forEach(e => out.push(e[i]));
    return { ver, out };
  }

  function build(ver, data, mask) {
    const size = ver * 4 + 17;
    const mod = Array.from({ length: size }, () => new Array(size).fill(false));
    const fn = Array.from({ length: size }, () => new Array(size).fill(false));
    const set = (x, y, dark) => { mod[y][x] = dark; fn[y][x] = true; };
    for (let i = 0; i < size; i++) { set(6, i, i % 2 === 0); set(i, 6, i % 2 === 0); }
    const finder = (cx, cy) => {
      for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
        const x = cx + dx, y = cy + dy, d = Math.max(Math.abs(dx), Math.abs(dy));
        if (x >= 0 && x < size && y >= 0 && y < size) set(x, y, d !== 2 && d !== 4);
      }
    };
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    const al = ALIGN[ver], last = al.length - 1;
    al.forEach((ax, i) => al.forEach((ay, j) => {
      if ((i === 0 && j === 0) || (i === 0 && j === last) || (i === last && j === 0)) return;
      for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) set(ax + dx, ay + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }));
    const format = m => {
      const d = (0 << 3) | m;      // level M is 00
      let r = d;
      for (let i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      const b = ((d << 10) | r) ^ 0x5412, bit = i => ((b >>> i) & 1) === 1;
      for (let i = 0; i <= 5; i++) set(8, i, bit(i));
      set(8, 7, bit(6)); set(8, 8, bit(7)); set(7, 8, bit(8));
      for (let i = 9; i < 15; i++) set(14 - i, 8, bit(i));
      for (let i = 0; i < 8; i++) set(size - 1 - i, 8, bit(i));
      for (let i = 8; i < 15; i++) set(8, size - 15 + i, bit(i));
      set(8, size - 8, true);
    };
    format(0);
    let i = 0;
    for (let right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (let v = 0; v < size; v++) for (let j = 0; j < 2; j++) {
        const x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - v : v;
        if (!fn[y][x] && i < data.length * 8) { mod[y][x] = ((data[i >>> 3] >>> (7 - (i & 7))) & 1) === 1; i++; }
      }
    }
    const MASK = [(x, y) => (x + y) % 2 === 0, (x, y) => y % 2 === 0, x => x % 3 === 0, (x, y) => (x + y) % 3 === 0,
      (x, y) => (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0, (x, y) => (x * y) % 2 + (x * y) % 3 === 0,
      (x, y) => ((x * y) % 2 + (x * y) % 3) % 2 === 0, (x, y) => ((x + y) % 2 + (x * y) % 3) % 2 === 0][mask];
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) if (!fn[y][x] && MASK(x, y)) mod[y][x] = !mod[y][x];
    format(mask);
    return mod;
  }

  // how hard a pattern is to scan (runs, blocks and the dark/light balance; enough to pick a good mask)
  function penalty(m) {
    const n = m.length; let p = 0, dark = 0;
    for (let a = 0; a < n; a++) for (const row of [true, false]) {
      let run = 1;
      for (let b = 1; b <= n; b++) {
        const same = b < n && (row ? m[a][b] === m[a][b - 1] : m[b][a] === m[b - 1][a]);
        if (same) run++; else { if (run >= 5) p += run - 2; run = 1; }
      }
    }
    for (let y = 0; y < n - 1; y++) for (let x = 0; x < n - 1; x++) { const c = m[y][x]; if (c === m[y][x + 1] && c === m[y + 1][x] && c === m[y + 1][x + 1]) p += 3; }
    m.forEach(r => r.forEach(c => { if (c) dark++; }));
    return p + Math.floor(Math.abs(dark * 20 - n * n * 10) / (n * n)) * 10;
  }

  function matrix(text) {
    const { ver, out } = codewords(Array.from(new TextEncoder().encode(String(text))));
    let best = null, bestP = Infinity;
    for (let mask = 0; mask < 8; mask++) { const m = build(ver, out, mask), p = penalty(m); if (p < bestP) { best = m; bestP = p; } }
    return best;
  }

  function svg(text, o) {
    const opt = o || {}, m = matrix(text), n = m.length, q = 4, s = n + q * 2;
    let d = '';
    m.forEach((row, y) => row.forEach((c, x) => { if (c) d += `M${x + q} ${y + q}h1v1h-1z`; }));
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" shape-rendering="crispEdges" role="img" aria-label="${String(opt.label || 'QR code').replace(/[<>&"]/g, '')}">` +
      `<rect width="${s}" height="${s}" fill="${opt.light || '#fff'}"/><path d="${d}" fill="${opt.dark || '#000'}"/></svg>`;
  }

  const api = { matrix, svg };
  if (typeof window !== 'undefined') window.AvakaQR = api;
  if (typeof module !== 'undefined') module.exports = api;
})();
