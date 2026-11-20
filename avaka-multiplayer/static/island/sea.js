// The sea around the island: the Kuroshio, flying fish, mahi-mahi, green turtles and the monsoon arrows.
// Everything here is illustrative. Which months each one shows up in, and every sentence about them, comes from
// island.json (sea, weather), where each line names its source. Creatures are small chibi shapes built in code,
// one instanced mesh per kind, so the whole sea adds only a handful of draw calls.

// join simple geometries into one, each part painted with its own vertex colour
function merge(THREE, parts) {
  const pos = [], nor = [], col = [];
  for (const [geo, color, m] of parts) {
    const g = (geo.index ? geo.toNonIndexed() : geo.clone()).applyMatrix4(m);
    g.computeVertexNormals();
    const c = new THREE.Color(color), p = g.attributes.position, n = g.attributes.normal;
    for (let i = 0; i < p.count; i++) {
      pos.push(p.getX(i), p.getY(i), p.getZ(i));
      nor.push(n.getX(i), n.getY(i), n.getZ(i));
      col.push(c.r, c.g, c.b);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}

export function createSea(THREE, scene, { shape, W, quality }) {
  const M4 = () => new THREE.Matrix4();
  const at = (x, y, z, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0) =>
    M4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const ball = new THREE.SphereGeometry(1, 10, 8), cone = new THREE.ConeGeometry(1, 1, 8);
  const small = new THREE.SphereGeometry(1, 6, 4);   // eyes and flippers: every creature instance carries every shape, so the tiny parts are kept plain
  const wing = (() => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, -0.5, 0, 1, 0.35, 0, 0.8, 0, 0, 0, 0.35, 0, 0.8, -0.5, 0, 1], 3)); return g; })();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, flatShading: true });
  const rnd = W.mulberry(77);
  const sea = { anchors: {}, seaward: {}, pickables: [] };
  const tmp = new THREE.Object3D(), hide = M4().makeScale(0, 0, 0);
  // a point out at sea off a lon/lat on the coast (negative distance = offshore)
  const off = (lon, lat, d) => shape.spotAt(lon, lat, d);

  // ---------- the Kuroshio: a wide band east of the island with streaks drifting north ----------
  const kuroMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { uTime: { value: 0 }, uOn: { value: 1 } }]),
    vertexShader: `#include <fog_pars_vertex>
      varying vec2 vUv;
      void main(){ vUv = uv; vec4 mvPosition = modelViewMatrix * vec4(position, 1.0); gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `#include <fog_pars_fragment>
      uniform float uTime, uOn; varying vec2 vUv;
      void main(){
        float across = vUv.x;
        float edge = smoothstep(0.0, 0.3, across) * smoothstep(1.0, 0.7, across) * smoothstep(0.0, 0.12, vUv.y) * smoothstep(1.0, 0.88, vUv.y);
        float lanes = across * 6.0, lane = floor(lanes);
        float h = fract(sin(lane * 12.9898 + 3.1) * 43758.5453);
        float f = fract(vUv.y * 14.0 - uTime * (0.10 + 0.06 * h) + h * 7.0);
        float streak = smoothstep(0.55, 0.94, f) * (1.0 - smoothstep(0.94, 1.0, f));   // bright head at the north end, tail behind it
        float thin = 1.0 - smoothstep(0.0, 0.16, abs(fract(lanes) - 0.5));
        float s = streak * thin;
        vec3 col = mix(vec3(0.10, 0.27, 0.44), vec3(0.95, 0.98, 0.99), s);
        gl_FragColor = vec4(col, edge * (0.26 + 0.6 * s) * uOn);
        #include <fog_fragment>
      }`,
  });
  const KX = 15, KW = 5.5, KL = 80;
  const kuro = new THREE.Mesh(new THREE.PlaneGeometry(KW, KL, 1, 1), kuroMat);
  kuro.rotation.x = -Math.PI / 2;            // plane +y becomes -z: uv.y = 1 is the north end, so streaks drift north
  kuro.position.set(KX, 0.03, 0);
  kuro.renderOrder = 3;
  kuro.userData = { id: 'kuroshio', kind: 'sea' };
  scene.add(kuro);
  sea.pickables.push(kuro);
  sea.anchors.kuroshio = new THREE.Vector3(KX - 1.5, 0.1, -4);
  sea.seaward.kuroshio = 0.75;
  sea.viewTarget = { kuroshio: new THREE.Vector3(8.5, 0.2, -1) };   // its camera frames the band and the island together   // seen from the south-east, so the island stays in the picture

  // all creatures and the wind arrows share ONE instanced mesh (one draw call): the geometry holds every shape,
  // each tagged with a part number, and each instance keeps only the part it is (the rest collapse to a point)
  const S = (k) => M4().makeScale(k, k, k);
  const tag = (geo, part) => { geo.setAttribute('part', new THREE.Float32BufferAttribute(new Array(geo.attributes.position.count).fill(part), 1)); return geo; };
  const FISH = 0, MAHI = 1, TURTLE = 2, ARROW = 3;

  // flying fish: blue back, pale belly, big pale wings
  const fishGeo = tag(merge(THREE, [
    [ball, 0x3f6a95, at(0, 0, 0, 0.17, 0.065, 0.065)],
    [ball, 0xdce9ef, at(0.02, -0.025, 0, 0.13, 0.03, 0.05)],
    [cone, 0x3f6a95, at(-0.2, 0, 0, 0.05, 0.1, 0.02, 0, 0, Math.PI / 2)],
    [wing, 0xa6d4e8, at(0.04, 0.03, 0.03, 0.22, 1, 0.22)],
    [wing, 0xa6d4e8, at(0.04, 0.03, -0.03, 0.22, 1, -0.22)],
    [small, 0x1b2a1f, at(0.13, 0.02, 0.04, 0.018, 0.018, 0.018)],
    [small, 0x1b2a1f, at(0.13, 0.02, -0.04, 0.018, 0.018, 0.018)],
  ].map(([g, c, m]) => [g, c, S(1.25).multiply(m)])), FISH);
  // mahi-mahi: blunt head, gold body, green back and fins
  const mahiGeo = tag(merge(THREE, [
    [ball, 0xd8b83a, at(0, 0, 0, 0.3, 0.11, 0.07)],
    [ball, 0x4f9a6a, at(0.03, 0.05, 0, 0.26, 0.06, 0.06)],
    [ball, 0xd8b83a, at(0.2, 0.03, 0, 0.1, 0.1, 0.07)],
    [cone, 0x2f7a68, at(0.02, 0.11, 0, 0.16, 0.08, 0.015, 0, 0, Math.PI)],
    [cone, 0x2f7a68, at(-0.33, 0, 0, 0.08, 0.16, 0.02, 0, 0, Math.PI / 2)],
    [small, 0x1b2a1f, at(0.26, 0.05, 0.05, 0.022, 0.022, 0.022)],
    [small, 0x1b2a1f, at(0.26, 0.05, -0.05, 0.022, 0.022, 0.022)],
  ].map(([g, c, m]) => [g, c, S(1.3).multiply(m)])), MAHI);
  // green turtle: domed shell, cream belly, four flippers
  const turtleGeo = tag(merge(THREE, [
    [ball, 0x5f7536, at(0, 0.03, 0, 0.2, 0.08, 0.16)],
    [ball, 0x8a9d4e, at(0, 0.075, 0, 0.12, 0.035, 0.095)],
    [ball, 0xe2d6a2, at(0, -0.005, 0, 0.18, 0.03, 0.14)],
    [ball, 0x93a85c, at(0.22, 0.04, 0, 0.065, 0.055, 0.055)],
    [small, 0x1b2a1f, at(0.26, 0.06, 0.035, 0.012, 0.012, 0.012)],
    [small, 0x1b2a1f, at(0.26, 0.06, -0.035, 0.012, 0.012, 0.012)],
    [small, 0x93a85c, at(0.09, 0.0, 0.17, 0.09, 0.015, 0.05, 0, -0.5, 0)],
    [small, 0x93a85c, at(0.09, 0.0, -0.17, 0.09, 0.015, 0.05, 0, 0.5, 0)],
    [small, 0x93a85c, at(-0.15, 0.0, 0.1, 0.05, 0.012, 0.03, 0, 0.4, 0)],
    [small, 0x93a85c, at(-0.15, 0.0, -0.1, 0.05, 0.012, 0.03, 0, -0.4, 0)],
  ].map(([g, c, m]) => [g, c, S(1.0).multiply(m)])), TURTLE);
  // monsoon chevron, lying flat on the sea and pointing downwind
  const chev = (() => { const s = new THREE.Shape(); s.moveTo(-0.5, 0.45); s.lineTo(0.15, 0); s.lineTo(-0.5, -0.45); s.lineTo(-0.25, 0); s.closePath(); return new THREE.ShapeGeometry(s); })();
  const arrowGeo = tag(merge(THREE, [[chev, 0xfbf8f0, at(0, 0, 0, 1, 1, 1, -Math.PI / 2, 0, 0)]]), ARROW);

  const schools = [
    off(121.5285, 22.0800, -2.6),   // off Iraraley, north
    off(121.5200, 22.0400, -2.4),   // off Yayo / Iratay, west
    off(121.5900, 22.0420, -2.6),   // off the east coast, toward the Kuroshio
  ];
  const perSchool = quality === 'high' ? 9 : quality === 'medium' ? 6 : 3;
  const fish = [];
  schools.forEach((c, k) => {
    for (let i = 0; i < perSchool; i++) {
      const a = rnd() * Math.PI * 2, r = rnd() * 1.3;
      fish.push({ x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r, head: -Math.PI / 2 + (rnd() - 0.5) * 0.9, ph: rnd(), per: 2.2 + rnd() * 1.4, len: 1.1 + rnd() * 0.6, sparse: i % 3 !== 0 });
    }
  });
  sea.anchors.flyingfish = new THREE.Vector3(schools[0].x + Math.sin(schools[0].seaward) * 1.6, 0.15, schools[0].z + Math.cos(schools[0].seaward) * 1.6);   // label a little further out than the school
  sea.seaward.flyingfish = schools[0].seaward ?? 0;
  // mahi-mahi chase a little behind (south of) two of the schools
  const mahi = [];
  for (const k of [0, 1]) for (let i = 0; i < (quality === 'low' ? 1 : 2); i++) {
    const c = schools[k];
    mahi.push({ x: c.x + (rnd() - 0.5) * 1.2, z: c.z + 1.4 + rnd() * 0.6, head: -Math.PI / 2 + (rnd() - 0.5) * 0.5, ph: rnd(), per: 3.4 + rnd() * 1.2, len: 1.8 });
  }
  const m1 = mahi[mahi.length - 1];   // label the pair off the west coast, so it does not sit on the flying-fish label
  sea.anchors.mahimahi = new THREE.Vector3(m1.x, 0.15, m1.z);
  sea.seaward.mahimahi = schools[1].seaward ?? 0;
  // green turtles around 八代灣 (OpenStreetMap point 121.5534, 22.0247)
  const bay = off(121.5534, 22.0247, -0.9), sand = off(121.5534, 22.0247, 0.12);
  const turtles = [
    { kind: 'swim', cx: bay.x, cz: bay.z, r: 0.8, ph: 0, sp: 0.12 },
    { kind: 'swim', cx: bay.x + 2.2, cz: bay.z + 0.6, r: 0.6, ph: 2.5, sp: -0.1, peakOnly: true },
    { kind: 'beach', x: sand.x, z: sand.z, fx: -Math.sin(sand.seaward ?? 0), fz: -Math.cos(sand.seaward ?? 0), peakOnly: true }, // faces inland, up the sand
  ];
  sea.anchors.turtle = new THREE.Vector3(bay.x + Math.sin(bay.seaward) * 1.4, 0.15, bay.z + Math.cos(bay.seaward) * 1.4);   // label out at sea, off the nesting beach
  sea.seaward.turtle = bay.seaward ?? 0;

  // one geometry with all four shapes, one instance per creature or arrow
  const all = new THREE.BufferGeometry();
  for (const name of ['position', 'normal', 'color', 'part']) {
    const arrs = [fishGeo, mahiGeo, turtleGeo, arrowGeo].map((g) => g.attributes[name].array);
    const out = new Float32Array(arrs.reduce((n, a) => n + a.length, 0));
    let o = 0; for (const a of arrs) { out.set(a, o); o += a.length; }
    all.setAttribute(name, new THREE.BufferAttribute(out, name === 'part' ? 1 : 3));
  }
  const F0 = 0, M0 = fish.length, T0 = M0 + mahi.length, A0 = T0 + turtles.length, COUNT = A0 + 3;
  const kinds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) kinds[i] = i < M0 ? FISH : i < T0 ? MAHI : i < A0 ? TURTLE : ARROW;
  all.setAttribute('aKind', new THREE.InstancedBufferAttribute(kinds, 1));
  mat.onBeforeCompile = (sh) => {
    sh.vertexShader = 'attribute float part;\nattribute float aKind;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n  if (abs(part - aKind) > 0.5) transformed = vec3(0.0);');
  };
  mat.customProgramCacheKey = () => 'avaka-sea-parts';
  const crowd = new THREE.InstancedMesh(all, mat, COUNT);
  crowd.frustumCulled = false;
  crowd.renderOrder = 4;
  for (let i = 0; i < COUNT; i++) crowd.setMatrixAt(i, hide);
  scene.add(crowd);
  const wind = { dx: 0, dz: 0, on: false };
  sea.windAnchor = new THREE.Vector3();

  // ---------- months ----------
  let month = 1, lite = false;
  const present = { kuroshio: () => !lite, flyingfish: () => month >= 2 && month <= 6, mahimahi: () => month >= 4 && month <= 6, turtle: () => true };
  sea.present = (id) => (present[id] ? present[id]() : false);
  const peak = () => month >= 6 && month <= 9;
  sea.setMonth = (n, w) => {
    month = n;
    kuro.visible = !lite;
    // which way the wind blows (toward): NE monsoon toward the south-west, SW monsoon toward the north-east (north is -z)
    const d = w === 'ne' ? [-1, 1] : w === 'sw' ? [1, -1] : null;
    wind.on = !!d && !lite;
    if (d) {
      wind.dx = d[0] / Math.SQRT2; wind.dz = d[1] / Math.SQRT2;
      sea.windAnchor.set(-wind.dx * 12.5, 0.3, -wind.dz * 12.5);
    }
    return d;
  };
  sea.lite = () => { lite = true; sea.setMonth(month); };

  const leap = (i, f, air, h, t) => {
    const u = (t / f.per + f.ph) % 1;
    if (u > air) return crowd.setMatrixAt(i, hide);          // under water between leaps
    const s = u / air, dx = Math.cos(f.head), dz = Math.sin(f.head);
    tmp.position.set(f.x + dx * (s - 0.5) * f.len, 0.02 + 4 * h * s * (1 - s), f.z + dz * (s - 0.5) * f.len);
    tmp.rotation.set(0, -f.head, Math.atan(4 * h * (1 - 2 * s) / f.len) * 0.85, 'YXZ');
    tmp.scale.setScalar(1);
    tmp.updateMatrix();
    crowd.setMatrixAt(i, tmp.matrix);
  };
  sea.update = (t) => {
    kuroMat.uniforms.uTime.value = t;
    const fishOn = sea.present('flyingfish'), mahiOn = sea.present('mahimahi');
    fish.forEach((f, i) => (fishOn && !(month === 2 && f.sparse) ? leap(F0 + i, f, 0.5, 0.32, t) : crowd.setMatrixAt(F0 + i, hide)));
    mahi.forEach((f, i) => (mahiOn ? leap(M0 + i, f, 0.4, 0.42, t) : crowd.setMatrixAt(M0 + i, hide)));
    turtles.forEach((tu, i) => {
      if (tu.peakOnly && !peak()) return crowd.setMatrixAt(T0 + i, hide);
      if (tu.kind === 'swim') {
        const a = tu.ph + t * tu.sp;
        const vx = -Math.sin(a) * tu.sp, vz = Math.cos(a) * 0.7 * tu.sp;   // heading = direction of travel
        tmp.position.set(tu.cx + Math.cos(a) * tu.r, Math.sin(t * 1.4 + tu.ph) * 0.012, tu.cz + Math.sin(a) * tu.r * 0.7);
        tmp.rotation.set(Math.sin(t * 2 + tu.ph) * 0.06, Math.atan2(-vz, vx), 0, 'YXZ');
      } else {
        const crawl = Math.sin(t * 0.25) * 0.06;
        tmp.position.set(tu.x + tu.fx * crawl, shape.height(tu.x, tu.z) + 0.03, tu.z + tu.fz * crawl);
        tmp.rotation.set(0, Math.atan2(-tu.fz, tu.fx), Math.sin(t * 3) * 0.04, 'YXZ');
      }
      tmp.scale.setScalar(1);
      tmp.updateMatrix();
      crowd.setMatrixAt(T0 + i, tmp.matrix);
    });
    for (let i = 0; i < 3; i++) {
      if (!wind.on) { crowd.setMatrixAt(A0 + i, hide); continue; }
      const u = (t * 0.12 + i / 3) % 1, side = (i - 1) * 2.6;
      tmp.position.set(-wind.dx * (14 - u * 5) + wind.dz * side, 0.12, -wind.dz * (14 - u * 5) - wind.dx * side);
      tmp.rotation.set(0, Math.atan2(-wind.dz, wind.dx), 0);
      tmp.scale.setScalar(1.9 * Math.sin(Math.PI * u) + 0.05);
      tmp.updateMatrix();
      crowd.setMatrixAt(A0 + i, tmp.matrix);
    }
    crowd.instanceMatrix.needsUpdate = true;
  };
  sea.meshes = [kuro, crowd];   // for tests
  return sea;
}
