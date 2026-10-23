// What stands on the island: Avaka, trees, the plank boat, the workshop, the shop, village houses and the step scenes.
// All of it is symbolic and built from simple shapes; none of it is a measured drawing.
import { mulberry } from './world.js?v=20261023_51';
let THREE_Group, THREE_Object3D;
export function useThree(THREE) { THREE_Group = THREE.Group; THREE_Object3D = THREE.Object3D; }

// ---------- leafy plants (Avaka, palms, pandanus, tree ferns) ----------
// One leaf: long and narrow, rising from the stem and drooping at the tip, folded slightly along the midrib.
function leafGeometry(THREE) {
  const seg = 10, pos = [], idx = [];
  for (let i = 0; i <= seg; i++) {
    const t = i / seg;
    const y = 0.62 * t - 0.82 * t * t;
    const w = 0.13 * Math.pow(Math.sin(Math.PI * Math.min(1, 0.08 + t * 0.95)), 0.75) + 0.004;
    const fold = w * 0.28;
    pos.push(-w, y - fold, t, 0, y, t, w, y - fold, t);
  }
  for (let i = 0; i < seg; i++) {
    const a = i * 3, b = a + 3;
    idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

export function createLeaves(THREE, kit) {
  const leaves = [];
  const tmp = new THREE.Object3D();
  function leaf(x, y, z, yaw, pitch, L, w, color) {
    tmp.position.set(x, y, z);
    tmp.rotation.set(pitch, yaw, 0, 'YXZ');
    tmp.scale.set(L * w, L, L);
    tmp.updateMatrix();
    leaves.push({ m: tmp.matrix.clone(), c: new THREE.Color(color) });
  }
  // Avaka: a slender pseudo-stem with dried old sheaths at its foot and a crown of narrow leaves
  function avaka(x, y, z, s, rnd, young = false) {
    const h = (young ? 0.12 : 0.22) * s;
    kit.part('trunk', x, y + h / 2, z, 0.04 * s, h, 0.04 * s, rnd() < 0.5 ? 0x6f8a46 : 0x7d7a48, rnd() * 6);
    if (!young) kit.part('cone', x, y + 0.03 * s, z, 0.07 * s, 0.07 * s, 0.07 * s, 0x9a8a5a, rnd() * 6);
    const n = young ? 4 : 6 + Math.floor(rnd() * 3), base = rnd() * Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const upright = i === 0 || (i === 1 && rnd() < 0.6); // the newest leaves still stand up
      const c = new THREE.Color(upright ? 0x9fd06c : rnd() < 0.15 ? 0xc2c27a : 0x6aab58).offsetHSL(0, 0, (rnd() - 0.5) * 0.06);
      leaf(x, y + h * (upright ? 1.02 : 0.95), z, base + (i / n) * Math.PI * 2 + rnd() * 0.5,
        upright ? -0.9 - rnd() * 0.3 : -0.15 - rnd() * 0.35, (upright ? 0.17 : 0.22 + rnd() * 0.06) * s, 0.9, c);
    }
  }
  // coconut-type palm: a leaning trunk and a crown of long drooping fronds
  function palm(x, y, z, s, rnd) {
    const h = (0.55 + rnd() * 0.25) * s, lean = (rnd() - 0.5) * 0.25, yaw = rnd() * 6;
    for (let k = 0; k < 4; k++) {
      const t = (k + 0.5) / 4;
      kit.part('trunk', x + Math.sin(yaw) * lean * t * h, y + t * h, z + Math.cos(yaw) * lean * t * h, 0.035 * s, h / 4 + 0.01, 0.035 * s, 0x8a7a62, 0, Math.cos(yaw) * lean, -Math.sin(yaw) * lean);
    }
    const tx = x + Math.sin(yaw) * lean * h, tz = z + Math.cos(yaw) * lean * h;
    for (let i = 0; i < 8; i++) leaf(tx, y + h, tz, (i / 8) * Math.PI * 2 + rnd() * 0.3, 0.05 + rnd() * 0.3, (0.32 + rnd() * 0.08) * s, 0.55, rnd() < 0.2 ? 0x9eac62 : 0x67a050);
  }
  // pandanus (林投) on the shore: short leaning stems with tufts of stiff leaves, and prop roots
  function pandanus(x, y, z, s, rnd) {
    const stems = 1 + Math.floor(rnd() * 3);
    for (let k = 0; k < stems; k++) {
      const a = rnd() * 6, l = 0.07 * s, tx = x + Math.cos(a) * l, tz = z + Math.sin(a) * l, h = (0.14 + rnd() * 0.08) * s;
      kit.part('trunk', (x + tx) / 2, y + h / 2, (z + tz) / 2, 0.025 * s, h, 0.025 * s, 0x7a6a52, 0, Math.sin(a) * 0.4, -Math.cos(a) * 0.4);
      for (let i = 0; i < 9; i++) leaf(tx, y + h, tz, (i / 9) * Math.PI * 2 + rnd(), -0.5 + rnd() * 0.7, (0.12 + rnd() * 0.05) * s, 0.35, rnd() < 0.3 ? 0x86a65a : 0x6f9650);
    }
    for (let i = 0; i < 3; i++) kit.part('cyl', x + (rnd() - 0.5) * 0.06 * s, y + 0.03 * s, z + (rnd() - 0.5) * 0.06 * s, 0.008 * s, 0.07 * s, 0.008 * s, 0x8a7a5a, 0, (rnd() - 0.5) * 0.6, (rnd() - 0.5) * 0.6);
  }
  // tree fern: a thin dark trunk with a flat spray of fronds
  function treeFern(x, y, z, s, rnd) {
    const h = (0.25 + rnd() * 0.15) * s;
    kit.part('cyl', x, y + h / 2, z, 0.025 * s, h, 0.025 * s, 0x4a3b2e);
    for (let i = 0; i < 9; i++) leaf(x, y + h, z, (i / 9) * Math.PI * 2 + rnd() * 0.4, -0.1 + rnd() * 0.2, (0.18 + rnd() * 0.05) * s, 0.5, rnd() < 0.5 ? 0x78ae5c : 0x689e52);
  }
  function build(scene, uTime) {
    const mat = new THREE.MeshStandardMaterial({ side: THREE.DoubleSide, roughness: 0.75, flatShading: true });
    // leaves sway a little in the wind; the tip moves most
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uTime = uTime;
      sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float ph = instanceMatrix[3].x * 3.1 + instanceMatrix[3].z * 2.3 + instanceMatrix[0].x * 9.0;
          transformed.y += sin(uTime * 1.7 + ph) * 0.07 * position.z * position.z;
          transformed.x += sin(uTime * 1.3 + ph * 1.7) * 0.04 * position.z * position.z;
        #endif`);
    };
    const mesh = new THREE.InstancedMesh(leafGeometry(THREE), mat, leaves.length);
    leaves.forEach((l, i) => { mesh.setMatrixAt(i, l.m); mesh.setColorAt(i, l.c); });
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    return mesh;
  }
  return { avaka, palm, pandanus, treeFern, build, count: () => leaves.length };
}

// ---------- trees and rocks ----------
const GREENS = [0x6fa65c, 0x7eb468, 0x649a54, 0x8cbd72, 0x5c9050];
export function tree(kit, x, y, z, s, rnd) {
  kit.ao(x, y, z, 0.2 * s);
  const h = (0.14 + rnd() * 0.1) * s;
  kit.part('trunk', x, y + h / 2, z, 0.045 * s, h, 0.045 * s, rnd() < 0.5 ? 0x6b5440 : 0x5c4a3a, rnd() * 6);
  const lobes = 1 + Math.floor(rnd() * 3);
  for (let i = 0; i < lobes; i++) {
    const r = (0.15 + rnd() * 0.1) * s;
    kit.part('blob', x + (rnd() - 0.5) * 0.12 * s, y + h + r * 0.35 + i * 0.05 * s, z + (rnd() - 0.5) * 0.12 * s, r, r * 0.8, r, GREENS[Math.floor(rnd() * GREENS.length)], rnd() * 6);
  }
}
// a taller tree with a broad, layered crown that stands out of the canopy
export function bigTree(kit, x, y, z, s, rnd) {
  kit.ao(x, y, z, 0.38 * s);
  const h = (0.3 + rnd() * 0.12) * s;
  kit.part('trunk', x, y + h / 2, z, 0.06 * s, h, 0.06 * s, 0x5c4a3a, rnd() * 6);
  kit.part('blob', x, y + h, z, 0.42 * s, 0.2 * s, 0.42 * s, GREENS[Math.floor(rnd() * 3)], rnd() * 6);
  kit.part('blob', x + 0.05 * s, y + h + 0.1 * s, z - 0.04 * s, 0.3 * s, 0.17 * s, 0.3 * s, 0x8cbd72, rnd() * 6);
}
export function rock(kit, x, y, z, s, rnd) {
  kit.part('stone', x, y + s * 0.15, z, s * (0.8 + rnd() * 0.5), s * (0.5 + rnd() * 0.4), s * (0.8 + rnd() * 0.5), rnd() < 0.5 ? 0x9a9389 : 0x8c857b, rnd() * 6, rnd() * 0.4);
}

// ---------- the plank boat ----------
// Hull as a surface: u runs bow to stern, v runs from one gunwale under the keel to the other.
// Both ends sweep up high. The paint follows the literature in a generic way (sinan Sakayan 2012):
// red, white and black, a boat eye (mata no tatala) near each end, human figures (taotao) and a triangle border.
// It is an illustration, not any family's boat.
export function boatTexture(THREE) {
  const W = 1024, H = 512, c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d');
  const RED = '#b3342a', BLACK = '#211e1c', WHITE = '#f3efe5';
  g.fillStyle = WHITE; g.fillRect(0, 0, W, H);
  // plank joins
  g.strokeStyle = 'rgba(120,110,95,0.55)'; g.lineWidth = 2;
  for (const y of [0.24, 0.36, 0.64, 0.76]) { g.beginPath(); g.moveTo(0, y * H); g.lineTo(W, y * H); g.stroke(); }
  // one side of the hull at a time; the other side is the mirror image (v measured from the other gunwale)
  for (const side of [0, 1]) {
    const Y = (v) => (side ? 1 - v : v) * H;
    const band = (v0, v1, col) => { g.fillStyle = col; const a = Y(v0), b = Y(v1); g.fillRect(0, Math.min(a, b), W, Math.abs(b - a)); };
    band(0, 0.035, RED);
    band(0.035, 0.05, BLACK);
    // triangle border along the sheer
    const n = 34, x0 = 0.1 * W, x1 = 0.9 * W, tw = (x1 - x0) / n;
    for (let i = 0; i < n; i++) {
      g.fillStyle = i % 2 ? RED : BLACK;
      g.beginPath();
      g.moveTo(x0 + i * tw, Y(0.055)); g.lineTo(x0 + (i + 1) * tw, Y(0.055)); g.lineTo(x0 + (i + 0.5) * tw, Y(0.11)); g.closePath(); g.fill();
    }
    // boat eye near each end: concentric red, white, black rings with short rays
    for (const ex of [0.14, 0.86]) {
      const cx = ex * W, cy = Y(0.18), r = 0.062 * H;
      g.fillStyle = BLACK;
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2, a1 = a - 0.11, a2 = a + 0.11;
        g.beginPath();
        g.moveTo(cx + Math.cos(a1) * r * 1.05, cy + Math.sin(a1) * r * 0.8 * 1.05);
        g.lineTo(cx + Math.cos(a) * r * 1.45, cy + Math.sin(a) * r * 0.8 * 1.45);
        g.lineTo(cx + Math.cos(a2) * r * 1.05, cy + Math.sin(a2) * r * 0.8 * 1.05);
        g.fill();
      }
      for (const [rr, col] of [[1, RED], [0.78, WHITE], [0.6, BLACK], [0.42, WHITE], [0.26, RED]]) {
        g.fillStyle = col; g.beginPath(); g.ellipse(cx, cy, r * rr, r * rr * 0.8, 0, 0, Math.PI * 2); g.fill();
      }
    }
    // human figures between the eyes: a body, raised arms, bent legs, drawn in black with a red head
    for (const fx of [0.33, 0.5, 0.67]) {
      const cx = fx * W, top = Y(0.13), bot = Y(0.27), h = bot - top, s = Math.sign(h);
      g.strokeStyle = BLACK; g.lineWidth = 5; g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath();
      g.moveTo(cx, top + h * 0.2); g.lineTo(cx, top + h * 0.7);                    // body
      g.moveTo(cx - 22, top + h * 0.05); g.lineTo(cx - 14, top + h * 0.35); g.lineTo(cx, top + h * 0.3); // arms raised
      g.lineTo(cx + 14, top + h * 0.35); g.lineTo(cx + 22, top + h * 0.05);
      g.moveTo(cx - 18, bot); g.lineTo(cx - 12, top + h * 0.75); g.lineTo(cx, top + h * 0.7);           // legs bent
      g.lineTo(cx + 12, top + h * 0.75); g.lineTo(cx + 18, bot);
      g.stroke();
      g.fillStyle = RED; g.beginPath(); g.arc(cx, top + h * 0.1 + s * 2, 7, 0, Math.PI * 2); g.fill();
    }
    // a red wave line lower on the hull
    g.strokeStyle = RED; g.lineWidth = 4; g.beginPath();
    for (let x = 0.12 * W; x <= 0.88 * W; x += 4) { const y = Y(0.32 + Math.sin(x * 0.06) * 0.012); x === 0.12 * W ? g.moveTo(x, y) : g.lineTo(x, y); }
    g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
export function boatGeometry(THREE) {
  const nu = 40, nv = 18, pos = [], uv = [], idx = [];
  for (let i = 0; i <= nu; i++) {
    const u = -1 + (2 * i) / nu, a = Math.abs(u);
    const half = 0.2 * Math.pow(Math.max(0, 1 - a * a), 0.55) + 0.006;
    const sheer = 0.17 + 0.66 * Math.pow(a, 3.6);
    const keel = 0.12 * Math.pow(a, 2.6);
    for (let j = 0; j <= nv; j++) {
      const v = j / nv, ang = Math.PI * v;
      const depth = Math.pow(Math.sin(ang), 0.75);
      pos.push(u * (1 + 0.04 * Math.pow(a, 3)), sheer - (sheer - keel) * depth, -Math.cos(ang) * half);
      uv.push(i / nu, v);
    }
  }
  for (let i = 0; i < nu; i++)
    for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + nv + 1;
      idx.push(a, b, a + 1, a + 1, b, b + 1);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
// Every boat is a placeholder Object3D; buildBoats() draws all hulls, thwarts and prow posts as three InstancedMeshes
// and syncBoats() copies the placeholders' matrices in (once for boats on the beach, every frame for boats at sea).
const boats = [];
export function boat(THREE, scene, geo, x, y, z, rot, len) {
  const m = new THREE.Object3D();
  m.position.set(x, y, z);
  m.rotation.y = rot;
  m.scale.setScalar(len / 2);
  scene.add(m);
  boats.push(m);
  return m;
}
const PARTS = { thwart: [[-0.35, 0.15, 0, 0], [0, 0.15, 0, 0], [0.35, 0.15, 0, 0]], prow: [[-1.03, 0.9, 0, 0.25], [1.03, 0.9, 0, -0.25]] };
let boatMeshes = null;
export function buildBoats(THREE, scene, geo) {
  const hull = new THREE.InstancedMesh(geo, new THREE.MeshStandardMaterial({ map: boatTexture(THREE), side: THREE.DoubleSide, roughness: 0.65 }), boats.length);
  const thwart = new THREE.InstancedMesh(new THREE.BoxGeometry(0.03, 0.012, 0.36), new THREE.MeshStandardMaterial({ color: 0xb08a5c, roughness: 0.8 }), boats.length * 3);
  const prow = new THREE.InstancedMesh(new THREE.ConeGeometry(0.02, 0.16, 5), new THREE.MeshStandardMaterial({ color: 0x2a2623, roughness: 0.7 }), boats.length * 2);
  for (const m of [hull, thwart, prow]) { m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false; m.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(m); }
  boatMeshes = { hull, thwart, prow, local: new THREE.Matrix4(), tmp: new THREE.Matrix4(), hidden: new THREE.Matrix4().makeScale(0, 0, 0), THREE };
  syncBoats();
}
export function syncBoats() {
  if (!boatMeshes) return;
  const { hull, thwart, prow, local, tmp, hidden, THREE } = boatMeshes, e = new THREE.Euler();
  boats.forEach((b, i) => {
    b.updateMatrixWorld();
    const show = b.visible;
    hull.setMatrixAt(i, show ? b.matrixWorld : hidden);
    PARTS.thwart.forEach(([x, y, z], k) => thwart.setMatrixAt(i * 3 + k, show ? tmp.multiplyMatrices(b.matrixWorld, local.makeTranslation(x, y, z)) : hidden));
    PARTS.prow.forEach(([x, y, z, r], k) => {
      local.makeRotationFromEuler(e.set(0, 0, r)).setPosition(x, y, z);
      prow.setMatrixAt(i * 2 + k, show ? tmp.multiplyMatrices(b.matrixWorld, local) : hidden);
    });
  });
  hull.instanceMatrix.needsUpdate = thwart.instanceMatrix.needsUpdate = prow.instanceMatrix.needsUpdate = true;
}

// ---------- the three places ----------
// Beach workshop (local +z faces the sea): an open shed with a thatched roof and a low wall of round stones.
export function workshop(THREE, scene, kit, spot, groundY, rnd) {
  kit.ao(spot.x, groundY, spot.z, 0.75);
  const f = kit.frame(spot.x, groundY, spot.z, spot.seaward);
  const WOOD = 0x8a6a48, DARK = 0x5c4632, THATCH = 0xb79a62;
  for (const [x, z] of [[-0.42, -0.28], [0.42, -0.28], [-0.42, 0.22], [0.42, 0.22], [0, -0.28], [0, 0.22]]) f.part('cyl', x, 0.16, z, 0.035, 0.32, 0.035, DARK);
  f.part('gable', 0, 0.42, -0.03, 1.05, 0.22, 0.68, THATCH);
  for (let k = 1; k < 5; k++) for (const s of [-1, 1]) f.part('slab', 0, 0.31 + k * 0.044, -0.03 + s * 0.34 * (1 - k / 5), 1.07, 0.008, 0.02, 0x9a7f50);
  f.part('slab', 0, 0.3, -0.03, 1.02, 0.03, 0.66, 0x9a7f50);
  f.part('box', 0, 0.12, -0.3, 0.8, 0.24, 0.04, WOOD);
  for (let i = 0; i < 3; i++) f.part('box', -0.2 + i * 0.03, 0.025 + i * 0.022, -0.05, 0.55, 0.02, 0.07, 0xa4825a, 0.06 * i);
  f.part('cyl', 0.25, 0.05, 0.05, 0.08, 0.1, 0.08, 0x7a5a3c);
  for (let k = 0; k < 18; k++) f.part('stone', -1.3 + k * 0.15, 0.05, -0.95 + Math.sin(k) * 0.03, 0.12, 0.1, 0.11, rnd() < 0.5 ? 0xaaa398 : 0x9c958b, rnd() * 6);
  return { focus: new THREE.Vector3(spot.x, groundY + 0.2, spot.z) };
}

// Shop: a small concrete building with an awning and stacked buckets of resin outside.
export function shop(THREE, scene, kit, spot, groundY) {
  kit.ao(spot.x, groundY, spot.z, 0.5);
  const f = kit.frame(spot.x, groundY, spot.z, spot.seaward);
  f.part('box', 0, 0.17, 0, 0.62, 0.34, 0.44, 0xe9e4d8);
  f.part('slab', 0, 0.345, 0, 0.66, 0.025, 0.48, 0xc9c2b4);
  f.part('slab', 0, 0.12, 0.222, 0.12, 0.22, 0.01, 0x3b3a38);
  for (const x of [-0.2, 0.2]) f.part('slab', x, 0.17, 0.222, 0.14, 0.1, 0.01, 0x7fb3c9);
  f.part('slab', 0, 0.26, 0.29, 0.66, 0.015, 0.16, 0x2f7f98, 0, -0.3);
  f.part('slab', 0, 0.38, 0.2, 0.42, 0.08, 0.02, 0xd2a45c);
  f.part('cyl', 0.2, 0.39, -0.08, 0.12, 0.1, 0.12, 0xf2f2ee);
  for (let i = 0; i < 5; i++) f.part('cyl', -0.42 + (i % 3) * 0.075, 0.035 + Math.floor(i / 3) * 0.07, 0.3 + (i % 2) * 0.02, 0.06, 0.07, 0.06, i % 2 ? 0x3a78c4 : 0xf0efe9);
  for (let i = 0; i < 2; i++) f.part('cyl', 0.4 + i * 0.09, 0.05, 0.3, 0.08, 0.04, 0.08, 0x9fb7c8, 0, Math.PI / 2);
  return { focus: new THREE.Vector3(spot.x, groundY + 0.2, spot.z) };
}

// ---------- villages ----------
const WALLS = [0xf1ede4, 0xe6eef0, 0xf0e4d8, 0xdfe9df, 0xe8dcc8, 0xd9e4ea];
// a low concrete house with windows, a door, a roof slab and often a water tank
export function house(kit, x, y, z, rot, rnd) {
  kit.ao(x, y, z, 0.3);
  const f = kit.frame(x, y, z, rot);
  const w = 0.28 + rnd() * 0.14, d = 0.24 + rnd() * 0.1, h = 0.16 + rnd() * 0.08, two = rnd() < 0.25;
  const H = two ? h * 1.8 : h;
  f.part('box', 0, H / 2, 0, w, H, d, WALLS[Math.floor(rnd() * WALLS.length)]);
  f.part('slab', 0, H + 0.012, 0, w + 0.02, 0.024, d + 0.02, 0xc9c2b4);
  f.part('slab', -w * 0.25, h * 0.36, d / 2 + 0.002, 0.055, h * 0.72, 0.008, rnd() < 0.5 ? 0x55504a : 0x3f6f8a);
  f.part('slab', w * 0.18, h * 0.55, d / 2 + 0.002, 0.07, 0.05, 0.008, 0x7fa9bd);
  if (two) for (const px of [-0.22, 0.18]) f.part('slab', w * px, h * 1.45, d / 2 + 0.002, 0.07, 0.05, 0.008, 0x7fa9bd);
  if (rnd() < 0.75) f.part('cyl', w * 0.25, H + 0.05, -d * 0.2, 0.07, 0.07, 0.07, rnd() < 0.5 ? 0x3b82b8 : 0xf3f3ef);
  if (rnd() < 0.3) f.part('slab', w / 2 + 0.03, H * 0.5, 0, 0.05, 0.012, d * 0.7, 0xb8b1a3, 0, 0, 0.7);
}
// a traditional-style homestead (illustrative only): a stone-lined pit with a low roof, and a raised open platform beside it
export function oldHouse(kit, x, y, z, rot, rnd) {
  kit.ao(x, y, z, 0.38);
  const f = kit.frame(x, y, z, rot);
  for (let k = 0; k < 14; k++) {
    const a = (k / 14) * Math.PI * 2;
    f.part('stone', Math.cos(a) * 0.26, 0.02, Math.sin(a) * 0.2, 0.08, 0.06, 0.07, rnd() < 0.5 ? 0xaaa398 : 0x9c958b, rnd() * 6);
  }
  f.part('gable', 0, 0.07, 0, 0.42, 0.13, 0.32, 0x6f5a40);
  for (const [px, pz] of [[0.36, -0.08], [0.56, -0.08], [0.36, 0.1], [0.56, 0.1]]) f.part('cyl', px, 0.08, pz, 0.02, 0.16, 0.02, 0x5c4632);
  f.part('slab', 0.46, 0.16, 0.01, 0.26, 0.02, 0.24, 0x9a7a52);
  f.part('gable', 0.46, 0.27, 0.01, 0.3, 0.1, 0.28, 0xa48a5a);
}
// a terraced taro field: flooded beds with clumps of broad leaves
export function taroField(kit, shape, x, z, rot, rnd) {
  const f = kit.frame(x, 0, z, rot);
  for (let r = 0; r < 3; r++)
    for (let c = 0; c < 2; c++) {
      const [px, pz] = f.at((c - 0.5) * 0.36, (r - 1) * 0.28);
      const y = shape.height(px, pz) + 0.015;
      kit.part('slab', px, y, pz, 0.32, 0.03, 0.24, 0x6f8f86, rot);
      kit.part('slab', px, y + 0.018, pz, 0.28, 0.006, 0.2, 0x7fb0a6, rot);
      for (let k = 0; k < 6; k++) kit.part('cone', px + (rnd() - 0.5) * 0.24, y + 0.045, pz + (rnd() - 0.5) * 0.17, 0.05, 0.04, 0.05, rnd() < 0.5 ? 0x5f9a46 : 0x78ad55, rnd() * 6, Math.PI);
    }
}
// a rack of split fish drying on a line
export function fishRack(kit, x, y, z, rot, rnd, fishKit = kit) {
  const f = kit.frame(x, y, z, rot), ff = fishKit.frame(x, y, z, rot);
  f.part('cyl', -0.18, 0.1, 0, 0.015, 0.2, 0.015, 0x5c4632);
  f.part('cyl', 0.18, 0.1, 0, 0.015, 0.2, 0.015, 0x5c4632);
  f.part('cyl', 0, 0.19, 0, 0.008, 0.38, 0.008, 0x8a7a62, 0, 0, Math.PI / 2);
  for (let k = 0; k < 7; k++) ff.part('slab', -0.15 + k * 0.05, 0.15, 0, 0.026, 0.07, 0.006, rnd() < 0.5 ? 0xb27a5c : 0x9a6a50);
}
// a harbour: a short breakwater of piled blocks running out to sea
export function breakwater(kit, shape, x, z, rot, len, rnd) {
  const f = kit.frame(x, 0, z, rot);
  for (let k = 0; k < len; k++) {
    const [px, pz] = f.at(0.1 * (k % 2) - 0.05, 0.1 + k * 0.13);
    kit.part('box', px, Math.max(-0.05, shape.height(px, pz)) + 0.07, pz, 0.16, 0.14, 0.14, 0xb4b0a8, rnd() * 0.6, rnd() * 0.2);
  }
}
export function lighthouse(kit, x, y, z) {
  kit.part('cyl', x, y + 0.25, z, 0.12, 0.5, 0.12, 0xf4f2ec);
  kit.part('cyl', x, y + 0.52, z, 0.15, 0.04, 0.15, 0x3b3a38);
  kit.part('cyl', x, y + 0.58, z, 0.09, 0.08, 0.09, 0xe9d38a);
  kit.part('cone', x, y + 0.66, z, 0.13, 0.08, 0.13, 0xb7372a);
}

// ---------- people ----------
// chibi figures: a big round head, a round body, short arms and legs, soft colours. Poses: stand, reach, sit, crouch, wave
const SKIN = [0xc08a64, 0xb07a56, 0xa86e4c], CLOTH = [0x6fa6c4, 0xf2e6cf, 0x8fbf6a, 0xe0957a, 0xb8a0d8, 0xf0c66a];
export function person(kit, x, y, z, rot, pose, rnd) {
  const f = kit.frame(x, y, z, rot), skin = SKIN[Math.floor(rnd() * SKIN.length)], cloth = CLOTH[Math.floor(rnd() * CLOTH.length)];
  const sit = pose === 'sit', crouch = pose === 'crouch';
  const hip = sit ? 0.02 : crouch ? 0.028 : 0.036;
  // legs
  if (sit) for (const s of [-1, 1]) f.part('cyl', s * 0.011, 0.016, 0.02, 0.016, 0.04, 0.016, 0x4a4f5a, 0, Math.PI / 2);
  else for (const s of [-1, 1]) f.part('cyl', s * 0.011, hip / 2, 0, 0.017, hip, 0.017, 0x4a4f5a);
  // round body, big head, hair, face
  f.part('ball', 0, hip + 0.026, 0, 0.05, 0.056, 0.04, cloth);
  const hy = hip + 0.075;
  f.part('ball', 0, hy, 0, 0.058, 0.054, 0.054, skin);
  f.part('ball', 0, hy + 0.012, -0.006, 0.062, 0.042, 0.058, 0x2a211c);
  for (const s of [-1, 1]) {
    f.part('ball', s * 0.011, hy - 0.002, 0.026, 0.008, 0.009, 0.006, 0x1a1614);
    f.part('ball', s * 0.018, hy - 0.011, 0.023, 0.009, 0.006, 0.004, 0xe8907a);
  }
  // arms
  const up = pose === 'reach' || pose === 'wave';
  f.part('cyl', -0.03, hip + (up ? 0.05 : 0.022), 0.004, 0.013, 0.034, 0.013, skin, 0, up ? 0 : -0.5, up ? -0.4 : -0.25);
  f.part('cyl', 0.03, hip + (pose === 'reach' ? 0.05 : 0.022), 0.004, 0.013, 0.034, 0.013, skin, 0, pose === 'reach' ? 0 : -0.5, pose === 'reach' ? 0.4 : 0.25);
}
// a chibi figure as a tree of slots (see createCrowd in kit.js): legs and arms hang from pivots so they can swing
export function chibi(crowd, { body = 0x8fbf6a, skin = 0xb07a56, pack = true } = {}) {
  const g = new THREE_Group();
  const legs = [-1, 1].map((s) => { const p = new THREE_Object3D(); p.position.set(s * 0.011, 0.036, 0); g.add(p); crowd.slot(p, 'cyl', 0x4a4f5a, [0, -0.018, 0], [0.017, 0.036, 0.017]); return p; });
  crowd.slot(g, 'sphere', body, [0, 0.062, 0], [0.05, 0.056, 0.04]);
  const head = new THREE_Object3D(); head.position.y = 0.111; g.add(head);
  crowd.slot(head, 'sphere', skin, [0, 0, 0], [0.058, 0.054, 0.054]);
  crowd.slot(head, 'cap', 0x2a211c, [0, 0.004, -0.004], [0.062, 0.058, 0.06], [-0.35, 0, 0]);
  for (const s of [-1, 1]) {
    crowd.slot(head, 'sphere', 0x1a1614, [s * 0.011, -0.002, 0.026], [0.008, 0.01, 0.006]);
    crowd.slot(head, 'sphere', 0xe8907a, [s * 0.018, -0.011, 0.023], [0.01, 0.006, 0.004]);
  }
  const arms = [-1, 1].map((s) => { const p = new THREE_Object3D(); p.position.set(s * 0.03, 0.082, 0.004); p.rotation.z = s * 0.25; g.add(p); crowd.slot(p, 'cyl', skin, [0, -0.017, 0], [0.013, 0.034, 0.013]); return p; });
  if (pack) crowd.slot(g, 'box', 0xd2a45c, [0, 0.066, -0.026], [0.036, 0.04, 0.018]);
  crowd.track(g);
  return { g, legs, arms, head };
}

// ---------- things that move: vehicles and goats ----------
const CAR_COLOURS = [0xe8826a, 0x7fb6d8, 0xf2d36a, 0xf3efe6, 0x9fd08a];
export function vehicle(crowd, kind, rnd) {
  const g = new THREE_Group(), col = CAR_COLOURS[Math.floor(rnd() * CAR_COLOURS.length)];
  const wheel = (x, z, r = 0.022) => crowd.slot(g, 'cyl', 0x2a2a2c, [x, r, z], [r * 2, 0.014, r * 2], [0, 0, Math.PI / 2]);
  if (kind === 'car') {
    crowd.slot(g, 'box', col, [0, 0.045, 0], [0.1, 0.045, 0.17]);
    crowd.slot(g, 'box', 0xdfeef4, [0, 0.085, -0.01], [0.088, 0.04, 0.09]);
    crowd.slot(g, 'box', col, [0, 0.108, -0.01], [0.092, 0.01, 0.094]);
    for (const [x, z] of [[-0.05, 0.055], [0.05, 0.055], [-0.05, -0.055], [0.05, -0.055]]) wheel(x, z);
  } else if (kind === 'truck') {
    crowd.slot(g, 'box', col, [0, 0.06, 0.07], [0.1, 0.07, 0.07]);
    crowd.slot(g, 'box', 0xdfeef4, [0, 0.08, 0.106], [0.09, 0.03, 0.01]);
    crowd.slot(g, 'box', 0x8a8f96, [0, 0.04, -0.035], [0.1, 0.03, 0.13]);
    for (let i = 0; i < 3; i++) crowd.slot(g, 'box', 0xc29a6a, [-0.025 + (i % 2) * 0.05, 0.07, -0.06 + i * 0.03], [0.035, 0.03, 0.035]);
    for (const [x, z] of [[-0.05, 0.07], [0.05, 0.07], [-0.05, -0.07], [0.05, -0.07]]) wheel(x, z);
  } else {
    // scooter with a rider
    crowd.slot(g, 'box', col, [0, 0.03, 0], [0.03, 0.02, 0.09]);
    crowd.slot(g, 'box', col, [0, 0.055, 0.04], [0.03, 0.06, 0.02]);
    wheel(0, 0.04, 0.016); wheel(0, -0.04, 0.016);
    crowd.slot(g, 'sphere', CLOTH[Math.floor(rnd() * CLOTH.length)], [0, 0.075, -0.01], [0.04, 0.045, 0.035]);
    crowd.slot(g, 'sphere', [0xe8826a, 0xf3efe6, 0x7fb6d8][Math.floor(rnd() * 3)], [0, 0.118, -0.006], [0.045, 0.045, 0.045]);
  }
  g.scale.setScalar(1.0);
  crowd.track(g);
  return g;
}
export function goat(crowd, rnd) {
  const coat = [0x3a3430, 0xe9e2d4, 0x7a5a40][Math.floor(rnd() * 3)];
  const g = new THREE_Group();
  crowd.slot(g, 'sphere', coat, [0, 0.05, 0], [0.05, 0.04, 0.075]);
  crowd.slot(g, 'sphere', coat, [0, 0.075, 0.045], [0.03, 0.032, 0.04]);
  for (const s of [-1, 1]) crowd.slot(g, 'cone', 0x9a8a70, [s * 0.008, 0.095, 0.04], [0.01, 0.025, 0.01], [-0.6, 0, 0]);
  const legs = [];
  for (const [x, z] of [[-0.015, 0.025], [0.015, 0.025], [-0.015, -0.025], [0.015, -0.025]]) {
    const p = new THREE_Object3D(); p.position.set(x, 0.035, z); g.add(p);
    crowd.slot(p, 'cyl', 0x2a2420, [0, -0.0175, 0], [0.01, 0.035, 0.01]);
    legs.push(p);
  }
  crowd.track(g);
  return { g, legs };
}

// ---------- the forest plot and the step scenes ----------
export function forestPlot(THREE, kit, plants, shape, spot, rnd) {
  const f = kit.frame(spot.x, 0, spot.z, spot.seaward);
  for (let i = 0; i < 40; i++) {
    const a = rnd() * Math.PI * 2, r = Math.sqrt(rnd()) * 1.2;
    const [x, z] = f.at(Math.cos(a) * r * 1.2, Math.sin(a) * r);
    plants.avaka(x, shape.height(x, z), z, 1.0 + rnd() * 0.45, rnd, rnd() < 0.18);
  }
  return { focus: new THREE.Vector3(spot.x, shape.height(spot.x, spot.z) + 0.25, spot.z) };
}
// each step gets a small scene at its own spot; returns where its pin goes
export function stepScene(THREE, kit, shape, id, x, z, rot, rnd, boatGeo, scene) {
  const y = shape.height(x, z), f = kit.frame(x, y, z, rot);
  const FIBRE = 0xece0b6, SHEATH = 0xd9cf9a, DARK = 0x5c4632;
  if (id === 's1') {
    // cut stumps and peeled sheaths on the ground
    for (let i = 0; i < 4; i++) f.part('cyl', -0.15 + i * 0.1, 0.02, (i % 2) * 0.08, 0.06, 0.04, 0.06, 0xb4a26c);
    for (let i = 0; i < 4; i++) f.part('slab', 0.05 + i * 0.03, 0.01, 0.2 + i * 0.02, 0.05, 0.008, 0.36, i % 2 ? SHEATH : 0x9fb26a, 0.3 + i * 0.1);
    f.part('slab', -0.25, 0.012, 0.22, 0.03, 0.006, 0.14, 0x8a8a8a, 0.8);
    { const [px, pz] = f.at(-0.1, 0.25); person(kit, px, y, pz, rot + 2.6, 'crouch', rnd); }
  } else if (id === 's2') {
    // a tree with a sheath hung over a low branch
    f.part('trunk', 0, 0.22, 0, 0.08, 0.44, 0.08, 0x6b5440);
    f.part('blob', 0, 0.55, 0, 0.42, 0.34, 0.42, 0x3f7a3c);
    f.part('cyl', 0.12, 0.3, 0, 0.022, 0.26, 0.022, 0x6b5440, 0, 0, Math.PI / 2.3);
    f.part('slab', 0.2, 0.2, 0, 0.035, 0.2, 0.012, SHEATH, 0, 0, 0.08);
    f.part('slab', 0.23, 0.19, 0.01, 0.035, 0.18, 0.012, 0xcfc48e, 0, 0, -0.06);
    { const [px, pz] = f.at(0.22, 0.12); person(kit, px, y, pz, rot + Math.PI, 'reach', rnd); }
  } else if (id === 's3') {
    // a low log bench with sheaths laid on it and strands pulled off
    f.part('box', 0, 0.06, 0, 0.5, 0.05, 0.12, 0x8a6a48);
    for (const px of [-0.2, 0.2]) f.part('cyl', px, 0.03, 0, 0.04, 0.06, 0.04, DARK);
    for (let i = 0; i < 3; i++) f.part('slab', -0.08 + i * 0.07, 0.09, 0, 0.05, 0.008, 0.11, SHEATH);
    for (let i = 0; i < 8; i++) f.part('slab', 0.12 + i * 0.012, 0.09, 0.02, 0.006, 0.006, 0.22, FIBRE, 0.2);
    { const [px, pz] = f.at(0, 0.14); person(kit, px, y, pz, rot + Math.PI, 'stand', rnd); }
  } else if (id === 's4') {
    // drying poles hung with pale fibre
    for (let r = 0; r < 2; r++) {
      const ox = r * 0.5 - 0.25;
      f.part('cyl', ox - 0.18, 0.17, 0, 0.022, 0.34, 0.022, DARK);
      f.part('cyl', ox + 0.18, 0.17, 0, 0.022, 0.34, 0.022, DARK);
      f.part('cyl', ox, 0.33, 0, 0.016, 0.42, 0.016, 0x8a6a48, 0, 0, Math.PI / 2);
      for (let k = 0; k < 6; k++) f.part('slab', ox - 0.15 + k * 0.06, 0.24, 0, 0.026, 0.17 + rnd() * 0.04, 0.012, FIBRE, 0, 0, (rnd() - 0.5) * 0.12);
    }
    { const [px, pz] = f.at(0.05, 0.1); person(kit, px, y, pz, rot + Math.PI, 'reach', rnd); }
  } else if (id === 's5') {
    // a mat with coils of twisted cord
    f.part('slab', 0, 0.008, 0, 0.36, 0.012, 0.26, 0xc7ad74);
    f.part('cyl', -0.06, 0.03, 0, 0.14, 0.035, 0.14, 0xd8c08a);
    f.part('cyl', -0.06, 0.05, 0, 0.09, 0.02, 0.09, 0xcfb47a);
    f.part('cyl', 0.1, 0.025, 0.05, 0.08, 0.03, 0.08, 0xe0cc98);
    for (let i = 0; i < 6; i++) f.part('slab', 0.12, 0.016, -0.08 + i * 0.008, 0.16, 0.004, 0.004, FIBRE, 0.1 * i);
    { const [px, pz] = f.at(-0.06, 0.12); person(kit, px, y + 0.012, pz, rot + Math.PI, 'sit', rnd); }
  } else if (id === 's6') {
    // a boat up on trestles, planks waiting to be fitted, and a small heap of floss
    for (const px of [-0.3, 0.3]) f.part('box', px, 0.06, 0, 0.06, 0.12, 0.34, 0x7a5a3c);
    boat(THREE, scene, boatGeo, x, y + 0.1, z, rot, 0.9);
    for (let i = 0; i < 3; i++) f.part('box', 0.1 + i * 0.03, 0.012 + i * 0.016, -0.42, 0.6, 0.014, 0.08, 0xc29a6a, 0.04 * i);
    f.part('blob', -0.42, 0.03, -0.32, 0.1, 0.05, 0.1, 0xe8e2cf);
    for (const [lx, lz, a] of [[0.15, 0.3, Math.PI], [-0.25, -0.28, 0]]) { const [px, pz] = f.at(lx, lz); person(kit, px, y, pz, rot + a, 'stand', rnd); }
  }
  return new THREE.Vector3(x, y + 0.2, z);
}

export { mulberry };

// ---------- village landmarks (v9) ----------
// a Tao homestead as the Bureau of Cultural Heritage record describes it (illustrative, not a measured drawing):
// the main house set into a pit dug 1–2 m into the slope, a workhouse, a raised platform, a forecourt of flat stones,
// a backrest stone, and fish racks; roofs now often dark (tar-sheeted or tarpaulin), once thatch
export function homestead(kit, shape, x, z, rot, rnd) {
  const y = shape.height(x, z), f = kit.frame(x, y, z, rot);
  kit.ao(x, y, z, 0.5);
  const STONE = () => (rnd() < 0.5 ? 0xa8a196 : 0x968f84);
  // pit wall of round stones (the main house sits below ground level)
  for (let k = 0; k < 18; k++) {
    const t = k / 18, side = Math.floor(t * 4), u = (t * 4) % 1;
    const [px, pz] = [[-0.22 + u * 0.44, -0.16], [0.22, -0.16 + u * 0.32], [0.22 - u * 0.44, 0.16], [-0.22, 0.16 - u * 0.32]][side];
    f.part('stone', px, 0.02, pz, 0.07, 0.05, 0.06, STONE(), rnd() * 6);
  }
  f.part('slab', 0, -0.005, 0, 0.42, 0.01, 0.3, 0x5d5348);           // pit floor
  f.part('box', 0, 0.035, -0.02, 0.36, 0.07, 0.22, 0x8a6a48);        // low walls showing above the pit
  f.part('gable', 0, 0.1, -0.02, 0.44, 0.09, 0.3, rnd() < 0.6 ? 0x3d3a38 : 0x8a7652); // roof: dark sheet or old thatch
  // forecourt of flat stones and a backrest stone
  for (let k = 0; k < 6; k++) f.part('slab', -0.18 + k * 0.07, 0.006, 0.26, 0.06, 0.012, 0.07, STONE());
  f.part('slab', 0.26, 0.06, 0.28, 0.05, 0.12, 0.02, 0x8f887d, 0, 0.1);
  // workhouse: a small raised house with a gable roof
  f.part('box', -0.36, 0.08, -0.05, 0.18, 0.12, 0.16, 0x9a7a52);
  f.part('gable', -0.36, 0.18, -0.05, 0.22, 0.08, 0.2, 0x4a4542);
  // raised open platform
  for (const [px, pz] of [[0.34, 0.0], [0.5, 0.0], [0.34, 0.16], [0.5, 0.16]]) f.part('cyl', px, 0.08, pz, 0.018, 0.16, 0.018, 0x5c4632);
  f.part('slab', 0.42, 0.16, 0.08, 0.22, 0.02, 0.22, 0x9a7a52);
  f.part('gable', 0.42, 0.25, 0.08, 0.26, 0.08, 0.26, 0x8a7652);
}

// Lanyu weather station, after the heritage record: a two-storey building whose wind tower is part of the office,
// thick walls, flat concrete roofs, a rainwater tank; on the hilltop in Hongtou village
export function weatherStation(kit, shape, x, z, rot) {
  const y = shape.height(x, z), f = kit.frame(x, y, z, rot);
  kit.ao(x, y, z, 0.45);
  f.part('box', 0, 0.1, 0, 0.36, 0.2, 0.22, 0xf1ede4);                 // office, two storeys
  f.part('slab', 0, 0.205, 0, 0.38, 0.015, 0.24, 0xc9c2b4);
  f.part('box', 0.12, 0.2, -0.02, 0.1, 0.4, 0.1, 0xf1ede4);            // wind tower
  f.part('slab', 0.12, 0.405, -0.02, 0.12, 0.012, 0.12, 0xc9c2b4);
  f.part('cyl', 0.12, 0.47, -0.02, 0.008, 0.12, 0.008, 0x6a6a6a);      // mast
  f.part('cyl', 0.12, 0.53, -0.02, 0.05, 0.006, 0.05, 0x6a6a6a, 0, Math.PI / 2);
  for (const [wx, wy] of [[-0.11, 0.06], [-0.03, 0.06], [-0.11, 0.15], [-0.03, 0.15]]) f.part('slab', wx, wy, 0.111, 0.05, 0.04, 0.006, 0x7fa9bd);
  f.part('slab', 0.02, 0.05, 0.111, 0.05, 0.1, 0.006, 0x5a5048);
  f.part('box', -0.06, 0.05, 0.2, 0.16, 0.06, 0.1, 0x9a948a);           // rainwater tank
  for (let k = 0; k < 2; k++) f.part('box', 0.25 + k * 0.1, 0.07, 0.17, 0.05, 0.05, 0.05, 0xf3f3ef); // instrument boxes
  for (let k = 0; k < 2; k++) f.part('cyl', 0.25 + k * 0.1, 0.03, 0.17, 0.006, 0.06, 0.006, 0x8a8a8a);
}

// Lanyu airport: the terminal building and a small parked plane (the runway is drawn as a ribbon)
export function airportTerminal(kit, shape, x, z, rot) {
  const y = shape.height(x, z), f = kit.frame(x, y, z, rot);
  kit.ao(x, y, z, 0.4);
  f.part('box', 0, 0.07, 0, 0.42, 0.14, 0.2, 0xeef0ec);
  f.part('slab', 0, 0.145, 0, 0.46, 0.015, 0.24, 0x7fa9bd);
  for (let k = 0; k < 4; k++) f.part('slab', -0.15 + k * 0.1, 0.07, 0.101, 0.06, 0.06, 0.006, 0x7fa9bd);
  f.part('box', 0.24, 0.14, -0.03, 0.07, 0.28, 0.07, 0xeef0ec);          // control tower
  f.part('box', 0.24, 0.3, -0.03, 0.1, 0.05, 0.1, 0x7fa9bd);
}
export function plane(kit, x, y, z, rot) {
  const f = kit.frame(x, y, z, rot);
  f.part('cyl', 0, 0.05, 0, 0.05, 0.36, 0.05, 0xf4f4f0, 0, Math.PI / 2);   // fuselage along z
  f.part('cone', 0, 0.05, 0.2, 0.05, 0.05, 0.05, 0xf4f4f0, 0, Math.PI / 2);
  f.part('slab', 0, 0.06, 0.02, 0.42, 0.008, 0.07, 0xe8826a);              // wings
  f.part('slab', 0, 0.09, -0.16, 0.012, 0.07, 0.05, 0xe8826a);             // tail fin
  f.part('slab', 0, 0.055, -0.16, 0.14, 0.006, 0.04, 0xe8826a);
  for (const s of [-1, 1]) f.part('cyl', s * 0.1, 0.06, 0.06, 0.02, 0.04, 0.02, 0x5a5a5a, 0, Math.PI / 2); // engines
  for (const [wx, wz] of [[-0.05, 0.02], [0.05, 0.02], [0, 0.15]]) f.part('cyl', wx, 0.01, wz, 0.02, 0.012, 0.02, 0x2a2a2c, 0, 0, Math.PI / 2);
}

// a low dry-stone wall between two points
export function stoneWall(kit, shape, x1, z1, x2, z2, rnd) {
  const L = Math.hypot(x2 - x1, z2 - z1), n = Math.max(2, Math.round(L / 0.08));
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x1 + (x2 - x1) * t, z = z1 + (z2 - z1) * t;
    kit.part('stone', x, shape.height(x, z) + 0.025, z, 0.08, 0.06, 0.07, rnd() < 0.5 ? 0xaaa398 : 0x9c958b, rnd() * 6);
  }
}

// ---------- extra detail at the three game places (v9) ----------
export function workshopYard(kit, shape, spot, rnd) {
  const f = kit.frame(spot.x, shape.height(spot.x, spot.z), spot.z, spot.seaward);
  // forecourt of flat stones in front of the shed
  for (let i = 0; i < 14; i++) f.part('slab', -0.45 + (i % 7) * 0.15, 0.006, 0.36 + Math.floor(i / 7) * 0.13, 0.12, 0.012, 0.1, rnd() < 0.5 ? 0xcfc7b6 : 0xbfb7a6, rnd() * 0.3);
  // firewood stack and a log bench
  for (let i = 0; i < 6; i++) f.part('cyl', 0.62 + (i % 3) * 0.035, 0.02 + Math.floor(i / 3) * 0.032, -0.25, 0.03, 0.22, 0.03, 0x8a6a48, 0, 0, Math.PI / 2);
  f.part('cyl', -0.62, 0.035, 0.18, 0.06, 0.34, 0.06, 0x9a7a52, Math.PI / 2, 0, Math.PI / 2);
  // a post with a coil of rope, and a few baskets
  f.part('cyl', 0.55, 0.1, 0.25, 0.02, 0.2, 0.02, 0x5c4632);
  f.part('cyl', 0.55, 0.14, 0.25, 0.06, 0.02, 0.06, 0xd8c08a);
  for (let i = 0; i < 3; i++) f.part('cyl', -0.3 + i * 0.07, 0.025, -0.38, 0.05, 0.05, 0.05, 0xc8a46a);
}
export function forestFence(kit, shape, spot, rnd) {
  // a light fence of posts and rails around the family plot, with a gap where the trail comes in
  const n = 26, rx = 1.55, rz = 1.3, cs = Math.cos(spot.seaward), sn = Math.sin(spot.seaward);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    if (Math.abs(Math.sin(a) - 1) < 0.05) continue;
    const lx = Math.cos(a) * rx, lz = Math.sin(a) * rz, x = spot.x + lx * cs + lz * sn, z = spot.z - lx * sn + lz * cs, y = shape.height(x, z);
    kit.part('cyl', x, y + 0.05, z, 0.016, 0.1, 0.016, 0x7a5c40);
    const a2 = ((i + 1) / n) * Math.PI * 2, lx2 = Math.cos(a2) * rx, lz2 = Math.sin(a2) * rz;
    const x2 = spot.x + lx2 * cs + lz2 * sn, z2 = spot.z - lx2 * sn + lz2 * cs, y2 = shape.height(x2, z2);
    const L = Math.hypot(x2 - x, z2 - z), mx = (x + x2) / 2, mz = (z + z2) / 2;
    kit.part('slab', mx, (y + y2) / 2 + 0.07, mz, 0.008, 0.008, L, 0x9a7a52, Math.atan2(x2 - x, z2 - z), Math.atan2(y - y2, L));
  }
  // a small sign at the gate
  const lx = 0, lz = rz + 0.12, x = spot.x + lx * cs + lz * sn, z = spot.z - lx * sn + lz * cs, y = shape.height(x, z);
  kit.part('cyl', x, y + 0.07, z, 0.014, 0.14, 0.014, 0x5c4632);
  kit.part('slab', x, y + 0.14, z, 0.12, 0.06, 0.01, 0xe9dcc0, spot.seaward);
}
export function shopFront(kit, shape, spot, rnd) {
  const f = kit.frame(spot.x, shape.height(spot.x, spot.z), spot.z, spot.seaward);
  f.part('box', -0.37, 0.07, 0.12, 0.08, 0.14, 0.06, 0x3a78c4);          // vending machine
  f.part('slab', -0.37, 0.09, 0.152, 0.06, 0.06, 0.004, 0xdfeef4);
  f.part('cyl', 0.0, 0.03, 0.42, 0.04, 0.3, 0.04, 0x9a7a52, Math.PI / 2, 0, Math.PI / 2); // bench
  for (let i = 0; i < 4; i++) f.part('slab', 0.45, 0.03, -0.1 + i * 0.06, 0.08, 0.05, 0.008, 0x8a8f96); // bike rack
  // a parked scooter
  f.part('box', 0.45, 0.03, 0.22, 0.03, 0.02, 0.09, 0xe8826a);
  f.part('box', 0.45, 0.055, 0.26, 0.03, 0.05, 0.02, 0xe8826a);
  for (const z of [0.18, 0.26]) f.part('cyl', 0.45, 0.016, z, 0.032, 0.012, 0.032, 0x2a2a2c, 0, 0, Math.PI / 2);
}
