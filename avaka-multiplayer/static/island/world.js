// The island itself: Lanyu's coastline, a height field over it, the round-island road,
// and the flat pads that villages and places sit on. Heights are exaggerated three times.
// Coastline and peak positions: © OpenStreetMap contributors (ODbL), simplified; not survey data.
import { SimplexNoise } from 'three/addons/SimplexNoise.js';

// Lanyu coastline (lon, lat) from the OpenStreetMap island outline, simplified to about 35 m.
const COAST_LONLAT = [
  [121.4995, 22.0807], [121.5026, 22.0778], [121.5034, 22.0777], [121.5042, 22.0758], [121.5052, 22.0754], [121.5069, 22.0733],
  [121.5082, 22.0729], [121.5110, 22.0659], [121.5107, 22.0645], [121.5090, 22.0630], [121.5094, 22.0608], [121.5082, 22.0591],
  [121.5089, 22.0589], [121.5086, 22.0575], [121.5074, 22.0577], [121.5077, 22.0597], [121.5071, 22.0579], [121.5085, 22.0572],
  [121.5083, 22.0567], [121.5093, 22.0565], [121.5084, 22.0564], [121.5078, 22.0554], [121.5093, 22.0550], [121.5098, 22.0529],
  [121.5110, 22.0516], [121.5107, 22.0500], [121.5089, 22.0481], [121.5089, 22.0460], [121.5100, 22.0459], [121.5102, 22.0469],
  [121.5111, 22.0470], [121.5111, 22.0475], [121.5119, 22.0469], [121.5132, 22.0471], [121.5132, 22.0466], [121.5143, 22.0472],
  [121.5162, 22.0464], [121.5167, 22.0458], [121.5162, 22.0450], [121.5206, 22.0402], [121.5202, 22.0394], [121.5230, 22.0396],
  [121.5235, 22.0384], [121.5241, 22.0387], [121.5256, 22.0376], [121.5261, 22.0367], [121.5257, 22.0365], [121.5259, 22.0356],
  [121.5270, 22.0353], [121.5270, 22.0335], [121.5315, 22.0296], [121.5338, 22.0264], [121.5359, 22.0255], [121.5358, 22.0250],
  [121.5374, 22.0243], [121.5392, 22.0243], [121.5415, 22.0249], [121.5422, 22.0258], [121.5431, 22.0254], [121.5443, 22.0256],
  [121.5446, 22.0264], [121.5486, 22.0262], [121.5515, 22.0249], [121.5532, 22.0248], [121.5534, 22.0236], [121.5547, 22.0237],
  [121.5544, 22.0234], [121.5548, 22.0228], [121.5559, 22.0222], [121.5563, 22.0231], [121.5575, 22.0230], [121.5580, 22.0214],
  [121.5624, 22.0177], [121.5628, 22.0158], [121.5655, 22.0145], [121.5664, 22.0117], [121.5696, 22.0087], [121.5705, 22.0030],
  [121.5716, 22.0039], [121.5724, 22.0033], [121.5732, 22.0038], [121.5761, 22.0033], [121.5772, 22.0041], [121.5801, 22.0044],
  [121.5805, 22.0051], [121.5821, 22.0045], [121.5820, 22.0040], [121.5808, 22.0041], [121.5843, 22.0016], [121.5866, 22.0010],
  [121.5907, 22.0018], [121.5934, 22.0033], [121.5945, 22.0057], [121.5948, 22.0083], [121.5968, 22.0139], [121.6006, 22.0177],
  [121.6000, 22.0183], [121.6004, 22.0205], [121.5990, 22.0221], [121.5996, 22.0228], [121.5988, 22.0225], [121.5971, 22.0248],
  [121.5953, 22.0250], [121.5899, 22.0285], [121.5810, 22.0315], [121.5750, 22.0351], [121.5691, 22.0398], [121.5677, 22.0398],
  [121.5680, 22.0408], [121.5671, 22.0405], [121.5667, 22.0410], [121.5677, 22.0423], [121.5675, 22.0434], [121.5665, 22.0453],
  [121.5663, 22.0449], [121.5646, 22.0494], [121.5638, 22.0498], [121.5634, 22.0531], [121.5638, 22.0550], [121.5653, 22.0561],
  [121.5655, 22.0576], [121.5663, 22.0583], [121.5688, 22.0589], [121.5698, 22.0584], [121.5695, 22.0594], [121.5707, 22.0604],
  [121.5718, 22.0602], [121.5738, 22.0610], [121.5761, 22.0603], [121.5738, 22.0620], [121.5741, 22.0626], [121.5727, 22.0628],
  [121.5733, 22.0634], [121.5716, 22.0640], [121.5687, 22.0672], [121.5695, 22.0685], [121.5683, 22.0704], [121.5678, 22.0751],
  [121.5697, 22.0772], [121.5707, 22.0813], [121.5679, 22.0849], [121.5678, 22.0867], [121.5644, 22.0830], [121.5601, 22.0807],
  [121.5598, 22.0801], [121.5579, 22.0820], [121.5571, 22.0836], [121.5534, 22.0831], [121.5497, 22.0835], [121.5434, 22.0830],
  [121.5405, 22.0823], [121.5409, 22.0819], [121.5401, 22.0816], [121.5324, 22.0812], [121.5316, 22.0807], [121.5311, 22.0796],
  [121.5313, 22.0790], [121.5305, 22.0786], [121.5294, 22.0796], [121.5304, 22.0796], [121.5294, 22.0802], [121.5290, 22.0815],
  [121.5265, 22.0825], [121.5188, 22.0808], [121.5175, 22.0812], [121.5126, 22.0808], [121.5070, 22.0843], [121.5054, 22.0860],
  [121.5011, 22.0841], [121.5000, 22.0828]
];
const LON0 = 121.55, LAT0 = 22.044, UNITS_PER_KM = 2, KM_X = 103.2, KM_Z = 110.6;
export function lonLatToXZ(lon, lat) {
  return [(lon - LON0) * KM_X * UNITS_PER_KM, -(lat - LAT0) * KM_Z * UNITS_PER_KM];
}
export function xzToLonLat(x, z) {
  return [LON0 + x / (KM_X * UNITS_PER_KM), LAT0 - z / (KM_Z * UNITS_PER_KM)];
}

// Named peaks (OpenStreetMap): lon, lat, elevation in metres, spread in units
const PEAKS = [
  [121.53455, 22.05303, 548, 1.9], // 紅頭山
  [121.53307, 22.06581, 495, 1.5], // 殺蛇山
  [121.58571, 22.01032, 483, 1.7], // 大森山
  [121.55672, 22.07389, 464, 1.6], // 尖禿山
  [121.54286, 22.05975, 439, 1.5], // 青蛇山
];
const EXAGGERATION = 3;

export function mulberry(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

function chaikin(pts, rounds) {
  let p = pts;
  for (let r = 0; r < rounds; r++) {
    const out = [];
    for (let i = 0; i < p.length; i++) {
      const a = p[i], b = p[(i + 1) % p.length];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25], [a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    p = out;
  }
  return p;
}

export function createIslandShape() {
  const coast = chaikin(COAST_LONLAT.map(([lo, la]) => lonLatToXZ(lo, la)), 1);
  const noise = new SimplexNoise({ random: mulberry(11) });
  const peaks = PEAKS.map(([lo, la, ele, s]) => { const [x, z] = lonLatToXZ(lo, la); return { x, z, h: (ele / 1000) * UNITS_PER_KM * EXAGGERATION, s }; });
  const pads = [], dips = [];

  function exactDist(x, z) {
    let best = Infinity, inside = false;
    for (let i = 0, j = coast.length - 1; i < coast.length; j = i++) {
      const [ax, az] = coast[j], [bx, bz] = coast[i];
      if ((bz > z) !== (az > z) && x < ((ax - bx) * (z - bz)) / (az - bz) + bx) inside = !inside;
      const dx = bx - ax, dz = bz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      const ex = ax + dx * t - x, ez = az + dz * t - z;
      const d = ex * ex + ez * ez;
      if (d < best) best = d;
    }
    return inside ? Math.sqrt(best) : -Math.sqrt(best);
  }
  // the exact distance is costly with a detailed coastline, so it is baked once into a grid and read back smoothly
  const G = { x0: -16, z0: -15, step: 0.08, nx: 0, nz: 0, data: null };
  G.nx = Math.ceil(32 / G.step) + 1; G.nz = Math.ceil(30 / G.step) + 1;
  G.data = new Float32Array(G.nx * G.nz);
  for (let j = 0; j < G.nz; j++) for (let i = 0; i < G.nx; i++) G.data[j * G.nx + i] = exactDist(G.x0 + i * G.step, G.z0 + j * G.step);
  function polyDist(x, z) {
    const fx = (x - G.x0) / G.step, fz = (z - G.z0) / G.step;
    if (fx < 0 || fz < 0 || fx >= G.nx - 1 || fz >= G.nz - 1) return exactDist(x, z);
    const i = Math.floor(fx), j = Math.floor(fz), u = fx - i, v = fz - j, k = j * G.nx + i, D = G.data;
    return (D[k] * (1 - u) + D[k + 1] * u) * (1 - v) + (D[k + G.nx] * (1 - u) + D[k + G.nx + 1] * u) * v;
  }
  // signed distance to the shore (positive on land), with a little extra raggedness at small scale
  function shore(x, z) {
    return polyDist(x, z) + noise.noise(x * 0.9, z * 0.9) * 0.07 + noise.noise(x * 2.6, z * 2.6) * 0.03;
  }
  function rawHeight(x, z) {
    const d = shore(x, z);
    if (d < 0) {
      // a shallow reef flat close in, then the drop-off
      const reef = 0.04 + d * 0.28 + noise.noise(x * 1.7, z * 1.7) * 0.025;
      return Math.max(-3.4, d > -0.7 ? reef : reef + (d + 0.7) * 1.1);
    }
    const coastal = 0.06 + 0.16 * smooth(0, 1.1, d) + noise.noise(x * 0.8, z * 0.8) * 0.03;
    const m = smooth(0.75, 2.4, d);
    let mount = 0.9 * smooth(1.2, 4.5, d);
    for (const p of peaks) mount += p.h * Math.exp(-((x - p.x) ** 2 + (z - p.z) ** 2) / (2 * p.s * p.s)) * 0.75;
    // ridged noise for valleys and spurs that run down to the sea
    let ridge = 0, amp = 1, f = 0.22;
    for (let o = 0; o < 5; o++) { ridge += (1 - Math.abs(noise.noise(x * f + 7, z * f - 3))) * amp; amp *= 0.5; f *= 2.05; }
    mount += (ridge - 1.0) * 0.85 * smooth(1.0, 3.0, d);
    return coastal + m * Math.max(0, mount);
  }
  function height(x, z) {
    let y = rawHeight(x, z);
    for (const p of pads) {
      const w = 1 - smooth(p.r * 0.55, p.r, Math.hypot(x - p.x, z - p.z));
      if (w > 0) y = y + (p.y - y) * w;
    }
    for (const dip of dips) y -= dip(x, z);
    return y;
  }
  function inland(x, z) {
    const e = 0.06, gx = polyDist(x + e, z) - polyDist(x - e, z), gz = polyDist(x, z + e) - polyDist(x, z - e);
    const l = Math.hypot(gx, gz) || 1;
    return [gx / l, gz / l];
  }
  // walk from a lon/lat along the inland direction until the point sits at the wanted distance from shore
  function spotAt(lon, lat, wantDist) {
    let [x, z] = lonLatToXZ(lon, lat);
    if (wantDist != null)
      for (let i = 0; i < 40; i++) {
        const d = polyDist(x, z), [nx, nz] = inland(x, z), step = (wantDist - d) * 0.6;
        if (Math.abs(step) < 0.002) break;
        x += nx * step; z += nz * step;
      }
    const [nx, nz] = inland(x, z);
    return { x, z, seaward: Math.atan2(-nx, -nz) };
  }
  function addPad(x, z, r, lift = 0) {
    pads.push({ x, z, r, y: rawHeight(x, z) + lift });
  }
  function roadLoop(offset) {
    const pts = chaikin(COAST_LONLAT.filter((_, i) => i % 2 === 0).map(([lo, la]) => lonLatToXZ(lo, la)), 2);
    return pts.map(([x, z]) => {
      let px = x, pz = z;
      for (let i = 0; i < 14; i++) {
        const d = polyDist(px, pz), [nx, nz] = inland(px, pz);
        px += nx * (offset - d) * 0.7; pz += nz * (offset - d) * 0.7;
      }
      return [px, pz];
    });
  }
  return { coast, shore, height, rawHeight, spotAt, addPad, pads, dips, roadLoop, inland, noise, polyDist, peaks };
}

// Terrain mesh: flat-shaded, one colour per triangle so the facets read clearly
export function buildTerrain(THREE, shape, { seg, tint }) {
  const W = 40, D = 37, CX = 0, CZ = 0;
  const g = new THREE.PlaneGeometry(W, D, seg, Math.round(seg * D / W));
  g.rotateX(-Math.PI / 2);
  g.translate(CX, 0, CZ);
  const pos = g.attributes.position;
  for (let i = 0; i < pos.count; i++) pos.setY(i, shape.height(pos.getX(i), pos.getZ(i)));
  shape.grid = { x0: CX - W / 2, z0: CZ - D / 2, sx: W / seg, sz: D / Math.round(seg * D / W) };
  const geo = g.toNonIndexed();
  const p = geo.attributes.position, n = p.count;
  const col = new Float32Array(n * 3);
  const C = (h) => new THREE.Color(h);
  // one soft palette for the whole island (see island.css for the matching interface tokens)
  const SAND = C(0xf0e4c2), PEBBLE = C(0xd8cebb), SAND_WET = C(0xdacda2), REEF = C(0x9fd8c8), REEF2 = C(0x8acbbb), DEEP = C(0x5aa7bf),
    GRASS = C(0xa3c47a), GRASS2 = C(0xb2cd86), FOREST = C(0x7aab62), FOREST2 = C(0x689a56), HIGH = C(0x86ad6c), ROCK = C(0xa69d8c), CLIFF = C(0x958d81);
  const rnd = mulberry(5), c = new THREE.Color();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), cc = new THREE.Vector3(), nrm = new THREE.Vector3(), e1 = new THREE.Vector3();
  for (let t = 0; t < n; t += 3) {
    a.fromBufferAttribute(p, t); b.fromBufferAttribute(p, t + 1); cc.fromBufferAttribute(p, t + 2);
    nrm.subVectors(cc, b).cross(e1.subVectors(a, b)).normalize();
    const y = (a.y + b.y + cc.y) / 3, x = (a.x + b.x + cc.x) / 3, z = (a.z + b.z + cc.z) / 3;
    const d = shape.shore(x, z), ny = Math.abs(nrm.y), j = (rnd() - 0.5) * 0.06;
    if (y < 0.012) {
      if (y > -0.2) c.copy(SAND_WET).lerp(REEF, smooth(0.0, -0.2, y));
      else c.copy(REEF).lerp(REEF2, rnd() * 0.6).lerp(DEEP, smooth(-0.3, -2.0, y));
    } else if (d < 0.45 && y < 0.28) {
      c.copy(shape.noise.noise(x * 1.3, z * 1.3) > 0.25 ? PEBBLE : SAND);
      if (ny < 0.85) c.lerp(CLIFF, 0.75); // black volcanic rock where the shore is steep
    } else if (y < 0.36) {
      c.copy(GRASS).lerp(GRASS2, rnd());
    } else {
      c.copy(FOREST).lerp(FOREST2, smooth(0.6, 3.0, y) * 0.8 + rnd() * 0.25);
      if (y > 2.8) c.lerp(HIGH, 0.5);
      if (ny < 0.5) c.lerp(ROCK, smooth(0.5, 0.3, ny) * 0.55);
    }
    if (tint) tint(x, z, y, c);
    c.offsetHSL(0, 0, j);
    for (let k = 0; k < 3; k++) { col[(t + k) * 3] = c.r; col[(t + k) * 3 + 1] = c.g; col[(t + k) * 3 + 2] = c.b; }
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.92, metalness: 0 }));
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}

// A flat ribbon that follows the ground, for roads and paths
// Road surface drawn once on a small canvas: dark asphalt, pale shoulders, white edge lines, a dashed yellow centre line
export function roadTexture(THREE, { centre = true, kind = 'road' } = {}) {
  if (kind !== 'road') {
    // plain strips: a concrete village lane, a dirt trail, or the runway (white edges and a dashed white centre)
    const c = document.createElement('canvas'); c.width = 64; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = { lane: '#d9d3c4', trail: '#c9b48c', runway: '#6b6c6f' }[kind]; g.fillRect(0, 0, 64, 128);
    if (kind === 'runway') { g.fillStyle = '#f2efe6'; g.fillRect(4, 0, 3, 128); g.fillRect(57, 0, 3, 128); g.fillRect(30, 0, 4, 60); }
    if (kind === 'trail') { g.fillStyle = 'rgba(120,100,70,0.25)'; for (let i = 0; i < 40; i++) g.fillRect(Math.random() * 64, Math.random() * 128, 3, 3); }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    return tex;
  }
  const c = document.createElement('canvas');
  c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#cfc6b2'; g.fillRect(0, 0, 64, 128);          // shoulder
  g.fillStyle = '#4b4c4f'; g.fillRect(7, 0, 50, 128);          // asphalt
  g.fillStyle = '#f2efe6'; g.fillRect(10, 0, 3, 128); g.fillRect(51, 0, 3, 128); // edge lines
  if (centre) { g.fillStyle = '#f0c63a'; g.fillRect(30, 0, 4, 70); }            // dashed centre line
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.ClampToEdgeWrapping; tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildRibbon(THREE, shape, points, { width = 0.2, closed = true, color = 0xffffff, samples = 700, lift = 0.035, map = null, repeat = 0.5 } = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)), closed, 'centripetal');
  const pts = curve.getSpacedPoints(samples); // samples + 1 points; for a closed curve the last equals the first
  const at = (i) => (closed ? pts[((i % samples) + samples) % samples] : pts[Math.max(0, Math.min(samples, i))]);
  // the ground is drawn as flat triangles between grid points, so a point on the road must clear all four corners around it
  const G = shape.grid;
  const ground = (x, z) => {
    if (!G) return shape.height(x, z);
    const i = Math.floor((x - G.x0) / G.sx), j = Math.floor((z - G.z0) / G.sz);
    let m = -Infinity;
    for (const [a, b] of [[0, 0], [1, 0], [0, 1], [1, 1]]) m = Math.max(m, shape.height(G.x0 + (i + a) * G.sx, G.z0 + (j + b) * G.sz));
    return m;
  };
  // 1) centre line and the height each row needs to clear the ground under all three of its points
  const rows = [];
  let run = 0;
  for (let i = 0; i <= samples; i++) {
    const p = at(i), prev = at(i - 1), next = at(i + 1);
    if (i > 0) run += Math.hypot(p.x - at(i - 1).x, p.z - at(i - 1).z);
    const dx = next.x - prev.x, dz = next.z - prev.z, l = Math.hypot(dx, dz) || 1;
    const ox = (-dz / l) * width * 0.5, oz = (dx / l) * width * 0.5;
    const need = Math.max(0.06, ...[-1, 0, 1].map((s) => ground(p.x + ox * s, p.z + oz * s)));
    rows.push({ p, ox, oz, run, need });
  }
  // 2) smooth the heights along the road without ever dropping below what a row needs:
  //    a running maximum first, then a running average of that (every average window still covers the row's own need)
  const K = 5, n = rows.length, wrap = (i) => (closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i)));
  const hmax = rows.map((_, i) => { let m = 0; for (let k = -K; k <= K; k++) m = Math.max(m, rows[wrap(i + k)].need); return m; });
  const hy = rows.map((_, i) => { let a = 0; for (let k = -K; k <= K; k++) a += hmax[wrap(i + k)]; return a / (2 * K + 1); });
  // 3) the surface (3 vertices across) plus a skirt hanging down to the ground on each side, so no gap shows under the edge
  const pos = [], uv = [], idx = [];
  rows.forEach((r, i) => {
    const y = hy[i] + lift;
    for (const s of [-1, 0, 1]) { pos.push(r.p.x + r.ox * s, y, r.p.z + r.oz * s); uv.push((s + 1) / 2, r.run / repeat); }
    for (const s of [-1, 1]) {
      const x = r.p.x + r.ox * s * 1.08, z = r.p.z + r.oz * s * 1.08;
      pos.push(x, Math.min(y - 0.01, shape.height(x, z) - 0.03), z); uv.push(s < 0 ? 0 : 1, r.run / repeat);
    }
  });
  const S = 5; // vertices per row: left, mid, right, skirt-left, skirt-right
  for (let i = 0; i < n - 1; i++) {
    const k = i * S, q = k + S;
    // counter-clockwise seen from above, so the road faces up
    idx.push(k, k + 1, q, k + 1, q + 1, q, k + 1, k + 2, q + 1, k + 2, q + 2, q + 1);
    // skirts (drawn both sides by the material)
    idx.push(k + 3, k, q + 3, k, q, q + 3, k + 2, k + 4, q + 2, k + 4, q + 4, q + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, map, roughness: 0.9, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.receiveShadow = true;
  m.userData.curve = curve;
  // road surface height at a point along the curve (0..1), for things that drive or walk on it
  m.userData.roadY = (u) => hy[Math.min(n - 1, Math.max(0, Math.round(u * (closed ? n - 1 : n - 1))))] + lift;
  return m;
}

// Shore distance baked into a small texture, so the sea shader can draw foam and fade to deep water
export function shoreTexture(THREE, shape, size = 256) {
  const box = { x: -20, z: -18.5, w: 40, d: 37 };
  const data = new Uint8Array(size * size * 4);
  for (let j = 0; j < size; j++)
    for (let i = 0; i < size; i++) {
      const x = box.x + (i + 0.5) / size * box.w, z = box.z + (j + 0.5) / size * box.d;
      const d = Math.max(-4, Math.min(4, shape.shore(x, z)));
      const v = Math.round(((d + 4) / 8) * 255), k = (j * size + i) * 4;
      data[k] = v; data[k + 1] = v; data[k + 2] = v; data[k + 3] = 255;
    }
  const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter;
  tex.needsUpdate = true;
  return { tex, box };
}
