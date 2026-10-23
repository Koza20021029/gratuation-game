// Building blocks. Every small part is recorded first, then each shape is drawn as one InstancedMesh,
// so a few thousand posts, roofs and leaves cost a handful of draw calls.
import { RoundedBoxGeometry } from 'three/addons/RoundedBoxGeometry.js';

function gableGeometry(THREE) {
  // triangular prism: base 1 wide at y = -0.5, ridge at y = 0.5, 1 deep along z
  const s = new THREE.Shape([new THREE.Vector2(-0.5, -0.5), new THREE.Vector2(0.5, -0.5), new THREE.Vector2(0, 0.5)]);
  return new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }).translate(0, 0, -0.5);
}
function blobGeometry(THREE, detail) {
  // a lumpy canopy: icosahedron with a fixed vertex jitter so it is the same on every load
  const g = new THREE.IcosahedronGeometry(0.5, detail), p = g.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = Math.sin(v.x * 17.3 + v.y * 41.9 + v.z * 29.1) * 9871.3;
    v.multiplyScalar(1 + ((n - Math.floor(n)) - 0.5) * 0.22);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

// a soft light edge on surfaces turned away from the camera, so shapes stay readable against each other
export function addRim(material, strength = 0.16) {
  const prev = material.onBeforeCompile;
  material.onBeforeCompile = (sh, r) => {
    if (prev) prev(sh, r);
    sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
      `outgoingLight += vec3(1.0, 0.96, 0.88) * pow(1.0 - clamp(abs(dot(normal, normalize(vViewPosition))), 0.0, 1.0), 3.0) * ${strength.toFixed(3)};
      #include <opaque_fragment>`);
  };
  return material;
}

export function createKit(THREE, { lite = false } = {}) {
  const shapes = {
    box: new RoundedBoxGeometry(1, 1, 1, 2, 0.06),
    slab: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10),
    trunk: new THREE.CylinderGeometry(0.34, 0.5, 1, 7),
    cone: new THREE.ConeGeometry(0.5, 1, 8),
    gable: gableGeometry(THREE),
    blob: blobGeometry(THREE, lite ? 0 : 1), // phones get 20-face canopies instead of 80
    stone: new THREE.DodecahedronGeometry(0.5, 0),
    ball: new THREE.SphereGeometry(0.5, 10, 8),
  };
  const lists = new Map(), aoList = [];
  const tmp = new THREE.Object3D();
  // a soft dark patch on the ground under trees and houses: cheap stand-in for ambient occlusion
  const ao = (x, y, z, r) => aoList.push([x, y, z, r]);
  function part(shape, x, y, z, sx, sy, sz, color, ry = 0, rx = 0, rz = 0) {
    if (!lists.has(shape)) lists.set(shape, []);
    tmp.position.set(x, y, z);
    tmp.rotation.set(rx, ry, rz, 'YXZ');
    tmp.scale.set(sx, sy, sz);
    tmp.updateMatrix();
    lists.get(shape).push({ m: tmp.matrix.clone(), c: new THREE.Color(color) });
  }
  // place parts in a local frame (origin ox, oz, turned by rot) so a whole building can face the sea
  function frame(ox, oy, oz, rot) {
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const at = (x, z) => [ox + x * cs + z * sn, oz - x * sn + z * cs];
    return {
      part(shape, x, y, z, sx, sy, sz, color, ry = 0, rx = 0, rz = 0) {
        const [wx, wz] = at(x, z);
        part(shape, wx, oy + y, wz, sx, sy, sz, color, rot + ry, rx, rz);
      },
      at,
    };
  }
  function build(scene, material) {
    const meshes = [];
    for (const [shape, items] of lists) {
      const mesh = new THREE.InstancedMesh(shapes[shape], material, items.length);
      items.forEach((it, i) => { mesh.setMatrixAt(i, it.m); mesh.setColorAt(i, it.c); });
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      meshes.push(mesh);
    }
    if (aoList.length) {
      const c = document.createElement('canvas'); c.width = c.height = 64;
      const g = c.getContext('2d'), grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
      grad.addColorStop(0, 'rgba(0,0,0,1)'); grad.addColorStop(0.55, 'rgba(0,0,0,0.5)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
      const tex = new THREE.CanvasTexture(c);
      const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x3a3020, transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), mat, aoList.length);
      aoList.forEach(([x, y, z, r], i) => { tmp.position.set(x, y + 0.006, z); tmp.rotation.set(0, 0, 0); tmp.scale.set(r * 2, 1, r * 2); tmp.updateMatrix(); m.setMatrixAt(i, tmp.matrix); });
      m.renderOrder = 2;
      scene.add(m);
      meshes.push(m);
    }
    return meshes;
  }
  return { part, frame, build, shapes, ao };
}

// Moving things (people, vehicles, goats, boats at sea) are built as ordinary Object3D trees so they can be animated,
// but nothing in those trees is drawn. Each visible piece is a "slot" that copies its world matrix, once a frame,
// into one InstancedMesh per shape. That keeps every moving figure on the island to a handful of draw calls.
export function createCrowd(THREE, { lite = false } = {}) {
  const geos = {
    box: new THREE.BoxGeometry(1, 1, 1),
    cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, lite ? 6 : 8),
    sphere: new THREE.SphereGeometry(0.5, lite ? 10 : 14, lite ? 8 : 10),
    cap: new THREE.SphereGeometry(0.5, lite ? 10 : 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.62),
    cone: new THREE.ConeGeometry(0.5, 1, 6),
    torus: new THREE.TorusGeometry(0.5, 0.16, 6, 14),
    ring: new THREE.TorusGeometry(0.5, 0.08, 5, 14),
  };
  const slots = new Map(), roots = [];
  const tmpC = new THREE.Color();
  function slot(parent, type, color, [x = 0, y = 0, z = 0] = [], [sx = 1, sy = 1, sz = 1] = [], [rx = 0, ry = 0, rz = 0] = []) {
    const o = new THREE.Object3D();
    o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, ry, rz);
    o.userData.color = color;
    parent.add(o);
    if (!slots.has(type)) slots.set(type, []);
    slots.get(type).push(o);
    return o;
  }
  const meshes = [];
  const hidden = new THREE.Matrix4().makeScale(0, 0, 0);
  function build(scene, material) {
    for (const [type, list] of slots) {
      const m = new THREE.InstancedMesh(geos[type], material, list.length);
      m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      list.forEach((o, i) => m.setColorAt(i, tmpC.set(o.userData.color)));
      m.castShadow = true;
      m.receiveShadow = false;
      m.frustumCulled = false; // instances move all over the island
      m.userData.list = list;
      scene.add(m);
      meshes.push(m);
    }
    sync();
    return meshes;
  }
  // a slot's colour can change later (e.g. a figure's clothes)
  function recolor(o, color) {
    o.userData.color = color;
    for (const m of meshes) { const i = m.userData.list.indexOf(o); if (i >= 0) { m.setColorAt(i, tmpC.set(color)); m.instanceColor.needsUpdate = true; } }
  }
  function track(root) { roots.push(root); return root; }
  function visibleUp(o) { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; }
  function sync() {
    for (const r of roots) r.updateMatrixWorld(true);
    for (const m of meshes) {
      const list = m.userData.list;
      for (let i = 0; i < list.length; i++) m.setMatrixAt(i, visibleUp(list[i]) ? list[i].matrixWorld : hidden);
      m.instanceMatrix.needsUpdate = true;
    }
  }
  return { slot, build, sync, track, recolor, meshes };
}
