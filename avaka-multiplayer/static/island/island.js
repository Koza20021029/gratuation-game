// Avaka island explorer: a standalone 3D page (not connected to any game room).
// Loads the content from island.json, builds the island, and keeps the list and the card in sync with the 3D view.
const $ = (s) => document.querySelector(s);
const params = new URLSearchParams(location.search);
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const store = {
  get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} },
};
let lang = (params.get('lang') || store.get('avaka_lang')) === 'en' ? 'en' : 'zh';
const t = (o) => (o ? (lang === 'en' ? o.en || o.zh : o.zh) || '' : '');
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

try {
  const V = '?v=20261023_60';
  const [THREE, { OrbitControls }, { CSS2DRenderer, CSS2DObject }, W, E, K, M, D] = await Promise.all([
    import('three'),
    import('three/addons/OrbitControls.js'),
    import('three/addons/CSS2DRenderer.js'),
    import('./world.js' + V),
    import('./env.js' + V),
    import('./kit.js' + V),
    import('./models.js' + V),
    fetch('/island/island.json' + V).then((r) => { if (!r.ok) throw new Error('island.json ' + r.status); return r.json(); }),
  ]);
  M.useThree(THREE);
  const sources = new Map(D.sources.map((s) => [s.id, s]));
  // every clickable thing on the island, keyed by id: places, steps, villages, sites
  const items = new Map();
  D.places.forEach((p) => items.set(p.id, { ...p, kind: 'place' }));
  D.steps.forEach((s) => items.set(s.id, { ...s, kind: 'step' }));
  D.villages.forEach((v) => items.set(v.id, { ...v, kind: 'village', name: { zh: `${v.zh} ${v.tao}`, en: `${v.tao} (${v.zh})` } }));
  D.sites.forEach((s) => items.set(s.id, { ...s, kind: 'site' }));

  const mobile = innerWidth <= 800 || /Mobi|Android/i.test(navigator.userAgent);
  const quality = ['low', 'medium', 'high'].includes(params.get('quality')) ? params.get('quality') : mobile ? 'medium' : 'high';

  // ---------- renderer, camera, controls ----------
  const stage = $('#stage');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 2 : quality === 'medium' ? 1.5 : 1));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.shadowMap.enabled = quality !== 'low';
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.domElement.tabIndex = 0;
  stage.appendChild(renderer.domElement);
  const labels = new CSS2DRenderer();
  labels.domElement.className = 'labels';
  stage.appendChild(labels.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 600);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = !reduced.matches;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minDistance = 2.2;
  controls.maxDistance = 130;
  controls.minPolarAngle = THREE.MathUtils.degToRad(14);
  controls.maxPolarAngle = THREE.MathUtils.degToRad(76);
  controls.rotateSpeed = 0.6;

  // ---------- where everything sits ----------
  const shape = W.createIslandShape();
  const rnd = W.mulberry(42);
  const spots = {};
  for (const p of D.places) spots[p.id] = shape.spotAt(p.anchor.lon, p.anchor.lat, p.anchor.shore);
  for (const s of D.sites) spots[s.id] = shape.spotAt(s.lon, s.lat, s.shore);
  for (const v of D.villages) spots[v.id] = shape.spotAt(v.lon, v.lat, 1.0);
  // step scenes sit around their place, in the place's own frame (local +z toward the sea)
  for (const s of D.steps) {
    const p = spots[s.place], k = s.place === 'forest' ? 1.7 : 1.5, cs = Math.cos(p.seaward), sn = Math.sin(p.seaward);
    const lx = s.offset[0] * k, lz = s.offset[1] * k;
    spots[s.id] = { x: p.x + lx * cs + lz * sn, z: p.z - lx * sn + lz * cs, seaward: p.seaward };
    // beach steps follow the curve of the shore, between the waterline and the road
    if (s.place === 'beach') {
      const q = spots[s.id];
      for (let i = 0; i < 30; i++) { const [nx, nz] = shape.inland(q.x, q.z), e = 0.3 - shape.polyDist(q.x, q.z); q.x += nx * e * 0.6; q.z += nz * e * 0.6; }
      const [nx, nz] = shape.inland(q.x, q.z);
      q.seaward = Math.atan2(-nx, -nz);
    }
  }
  shape.addPad(spots.beach.x, spots.beach.z, 1.9, 0.02);
  shape.addPad(spots.forest.x, spots.forest.z, 2.1);
  shape.addPad(spots.shop.x, spots.shop.z, 0.9);
  shape.addPad(spots['avaka-field'].x, spots['avaka-field'].z, 0.9);
  for (const v of D.villages) {
    // the village flat runs from the road up its lane, so it gets a second, inland pad
    const p = spots[v.id];
    shape.addPad(p.x, p.z, 1.4);
    shape.addPad(p.x - Math.sin(p.seaward) * 1.0, p.z - Math.cos(p.seaward) * 1.0, 1.0);
  }
  shape.addPad(spots.weather.x, spots.weather.z, 0.55);
  // Lanyu airport runway (ends from the OpenStreetMap aerodrome outline), flattened along its length
  const RUNWAY = [W.lonLatToXZ(121.5294, 22.0321), W.lonLatToXZ(121.5383, 22.0250)];
  for (let k = 0; k <= 6; k++) {
    const t = k / 6, x = RUNWAY[0][0] + (RUNWAY[1][0] - RUNWAY[0][0]) * t, z = RUNWAY[0][1] + (RUNWAY[1][1] - RUNWAY[0][1]) * t;
    shape.addPad(x, z, 0.55, 0.01);
  }
  const runwayDist = (x, z) => {
    const [[ax, az], [bx, bz]] = RUNWAY, dx = bx - ax, dz = bz - az;
    const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
    return Math.hypot(ax + dx * u - x, az + dz * u - z);
  };
  const ROAD_D = 0.72, onRoad = (x, z, m = 0.26) => Math.abs(shape.polyDist(x, z) - ROAD_D) < m; // keep things off the ring road
  // press the ground down a little under the roads, so the road surface never sinks into it
  shape.dips.push((x, z) => { const e = Math.abs(shape.polyDist(x, z) - ROAD_D); return e < 0.22 ? 0.03 * (1 - W.smooth(0.1, 0.22, e)) : 0; });
  const near = (x, z, r, except) => runwayDist(x, z) < 0.2 + r * 0.2 || Object.entries(spots).some(([k, s]) => k !== except && Math.hypot(x - s.x, z - s.z) < r);

  // ---------- ground, roads, sea and sky ----------
  const cross = [spots.imorod, W.lonLatToXZ(121.5565, 22.0305), W.lonLatToXZ(121.5589, 22.0349), W.lonLatToXZ(121.5625, 22.0372), spots.ivalino]
    .map((p) => (Array.isArray(p) ? p : [p.x, p.z]));
  shape.dips.push((x, z) => {
    let e = Infinity;
    for (let k = 0; k < cross.length - 1; k++) {
      const [ax, az] = cross[k], [bx, bz] = cross[k + 1], dx = bx - ax, dz = bz - az;
      const u = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      e = Math.min(e, Math.hypot(ax + dx * u - x, az + dz * u - z));
    }
    return e < 0.2 ? 0.03 * (1 - W.smooth(0.08, 0.2, e)) : 0;
  });
  const terrain = W.buildTerrain(THREE, shape, { seg: quality === 'high' ? 300 : quality === 'medium' ? 170 : 120 });
  scene.add(terrain);
  const roadMap = W.roadTexture(THREE);
  const ringRoad = W.buildRibbon(THREE, shape, shape.roadLoop(ROAD_D), { width: 0.22, samples: 2200, map: roadMap, lift: 0.018 });
  scene.add(ringRoad);
  // the cross-island road between 紅頭 and 野銀 (route simplified from OpenStreetMap)
  const crossRoad = W.buildRibbon(THREE, shape, cross, { width: 0.17, closed: false, samples: 420, map: roadMap, lift: 0.018 });
  scene.add(crossRoad);
  const shore = W.shoreTexture(THREE, shape);
  const env = E.createEnv(THREE, scene, { quality, shore, peaks: shape.peaks.map((p) => ({ x: p.x, z: p.z, y: shape.height(p.x, p.z) })) });

  // ---------- things on the island ----------
  const kit = K.createKit(THREE, { lite: quality !== 'high' });
  const fishKit = K.createKit(THREE); // split fish on the racks, shown only in the months fish are dried
  const plants = M.createLeaves(THREE, kit);
  const boatGeo = M.boatGeometry(THREE);
  const groundAt = (s) => shape.height(s.x, s.z);
  const focus = {};
  focus.beach = M.workshop(THREE, scene, kit, spots.beach, groundAt(spots.beach), rnd).focus;
  focus.forest = M.forestPlot(THREE, kit, plants, shape, spots.forest, rnd).focus;
  focus.shop = M.shop(THREE, scene, kit, spots.shop, groundAt(spots.shop)).focus;
  for (const s of D.steps) focus[s.id] = M.stepScene(THREE, kit, shape, s.id, spots[s.id].x, spots[s.id].z, spots[s.id].seaward, rnd, boatGeo, scene);
  // boats drawn up on the workshop beach
  {
    const b = spots.beach, cs = Math.cos(b.seaward), sn = Math.sin(b.seaward);
    for (const [lx, lz, len] of [[0.7, 0.9, 0.95], [1.2, 1.05, 0.75]]) {
      const x = b.x + lx * cs + lz * sn, z = b.z - lx * sn + lz * cs;
      M.boat(THREE, scene, boatGeo, x, shape.height(x, z) + 0.02, z, b.seaward + Math.PI / 2 + (rnd() - 0.5) * 0.3, len);
    }
  }
  // the Avaka plot at 東清
  {
    const s = spots['avaka-field'], f = kit.frame(s.x, 0, s.z, s.seaward);
    for (let i = 0; i < 9; i++) {
      const [x, z] = f.at((rnd() - 0.5) * 0.9, (rnd() - 0.5) * 0.7);
      plants.avaka(x, shape.height(x, z), z, 0.95 + rnd() * 0.4, rnd, rnd() < 0.3);
    }
    focus['avaka-field'] = new THREE.Vector3(s.x, shape.height(s.x, s.z) + 0.2, s.z);
  }
  // villages, arranged by hand rather than scattered: a concrete lane runs up from the ring road, houses stand in rows
  // facing it behind low stone walls, taro terraces sit uphill, fish racks line the beach, palms and people in between
  const laneMap = W.roadTexture(THREE, { kind: 'lane' });
  const HOMESTEADS = W.lonLatToXZ(121.56736, 22.03725); // 野銀 traditional houses, heritage-record coordinates
  for (const v of D.villages) {
    const s = spots[v.id], f = kit.frame(s.x, 0, s.z, s.seaward);
    focus[v.id] = new THREE.Vector3(s.x, shape.height(s.x, s.z) + 0.2, s.z);
    const ok = (x, z, m = 0.3) => shape.shore(x, z) > 0.45 && !onRoad(x, z, m) && runwayDist(x, z) > 0.3 && !near(x, z, 0.75, v.id)
      && Math.hypot(x - HOMESTEADS[0], z - HOMESTEADS[1]) > 0.75;
    const flat = (x, z, k = 0.08) => { const y = shape.height(x, z); return Math.abs(shape.height(x + 0.15, z) - y) + Math.abs(shape.height(x, z + 0.15) - y) < k; };
    // the lane
    const lane = [];
    for (let i = 0; i <= 8; i++) lane.push(f.at(0, 0.55 - i * 0.24));
    scene.add(W.buildRibbon(THREE, shape, lane, { width: 0.08, closed: false, samples: 60, map: laneMap, lift: 0.012 }));
    // two rows of houses on each side, facing the lane
    let n = 0;
    for (let row = 0; row < 5; row++)
      for (const side of [-1, 1])
        for (const ring of [0.3, 0.68]) {
          const [x, z] = f.at(side * ring + (rnd() - 0.5) * 0.04, 0.3 - row * 0.36 + (rnd() - 0.5) * 0.05);
          if (!ok(x, z, 0.32) || !flat(x, z)) continue;
          const y = shape.height(x, z), face = s.seaward + side * Math.PI / 2;
          M.house(kit, x, y, z, face + (rnd() - 0.5) * 0.08, rnd);
          if (ring < 0.5) { const [ax, az] = f.at(side * 0.15, 0.3 - row * 0.36 - 0.14), [bx, bz] = f.at(side * 0.15, 0.3 - row * 0.36 + 0.14); M.stoneWall(kit, shape, ax, az, bx, bz, rnd); }
          n++;
        }
    // 野銀: the traditional homesteads (Bureau of Cultural Heritage record), in rows up the slope beside the lane
    if (v.id === 'ivalino') {
      // centred on the coordinates in the heritage record (121.56736, 22.03725), in rows facing the sea
      const [hx, hz] = HOMESTEADS, hf = kit.frame(hx, 0, hz, s.seaward);
      for (let row = 0; row < 3; row++)
        for (let col = -1; col <= 1; col++) {
          const [x, z] = hf.at(col * 0.5 + (row % 2) * 0.2, -row * 0.45);
          if (shape.shore(x, z) > 0.5 && !onRoad(x, z, 0.35) && Math.hypot(x - spots.weather.x, z - spots.weather.z) > 0.6) M.homestead(kit, shape, x, z, s.seaward, rnd);
        }
    }
    // taro terraces uphill of the houses, only where the ground is gentle
    for (const side of [-1, 1]) for (const back of [1.75, 2.25]) {
      const [x, z] = f.at(side * 0.75, -back);
      if (ok(x, z) && flat(x, z, 0.22) && shape.shore(x, z) < 3.2) M.taroField(kit, shape, x, z, s.seaward, rnd);
    }
    // fish racks in a row along the beach
    for (let k = -1; k <= 1; k++) {
      const [x, z] = f.at(k * 0.5, 0.85);
      if (shape.shore(x, z) > 0.15 && !onRoad(x, z, 0.2) && runwayDist(x, z) > 0.3) M.fishRack(kit, x, shape.height(x, z), z, s.seaward, rnd, fishKit);
    }
    // a few people about the village
    for (let k = 0, placed = 0; k < 14 && placed < 4; k++) {
      const [x, z] = f.at((rnd() - 0.5) * 0.3, 0.3 - rnd() * 1.6);
      if (!ok(x, z, 0.2)) continue;
      M.person(kit, x, shape.height(x, z), z, rnd() * 6.28, rnd() < 0.2 ? 'sit' : 'stand', rnd);
      placed++;
    }
    for (let k = 0; k < 5; k++) {
      const [x, z] = f.at((rnd() - 0.5) * 2.6, 0.55 + rnd() * 0.3);
      if (shape.shore(x, z) > 0.25 && !onRoad(x, z) && runwayDist(x, z) > 0.3 && !near(x, z, 0.6, v.id)) plants.palm(x, shape.height(x, z), z, 1, rnd);
    }
  }
  // detail at the three game places, and a dirt trail from the beach workshop up to the forest plot
  M.workshopYard(kit, shape, spots.beach, rnd);
  M.forestFence(kit, shape, spots.forest, rnd);
  M.shopFront(kit, shape, spots.shop, rnd);
  {
    const a = spots.beach, b = spots.forest, pts = [];
    for (let i = 0; i <= 10; i++) {
      const t = i / 10, wob = Math.sin(t * Math.PI * 3) * 0.25 * Math.sin(t * Math.PI);
      const x = a.x + (b.x - a.x) * t + Math.cos(a.seaward) * wob, z = a.z + (b.z - a.z) * t - Math.sin(a.seaward) * wob;
      pts.push([x, z]);
    }
    scene.add(W.buildRibbon(THREE, shape, pts, { width: 0.07, closed: false, samples: 120, map: W.roadTexture(THREE, { kind: 'trail' }), lift: 0.01 }));
  }
  // landmarks with public records: the weather station on the hill at Hongtou, the airport by Iratay
  {
    const w = spots.weather;
    M.weatherStation(kit, shape, w.x, w.z, w.seaward);
    focus.weather = new THREE.Vector3(w.x, shape.height(w.x, w.z) + 0.25, w.z);
    const runway = W.buildRibbon(THREE, shape, RUNWAY, { width: 0.16, closed: false, samples: 80, map: W.roadTexture(THREE, { kind: 'runway' }), lift: 0.012, repeat: 0.4 });
    scene.add(runway);
    const a = spots.airport, [rx, rz] = [RUNWAY[1][0] - RUNWAY[0][0], RUNWAY[1][1] - RUNWAY[0][1]], heading = Math.atan2(rx, rz);
    M.airportTerminal(kit, shape, a.x, a.z, a.seaward);
    const px = a.x + Math.sin(a.seaward) * 0.3 + rx * 0.06, pz = a.z + Math.cos(a.seaward) * 0.3 + rz * 0.06;
    M.plane(kit, px, shape.height(px, pz) + 0.01, pz, heading + Math.PI);
    focus.airport = new THREE.Vector3(a.x, shape.height(a.x, a.z) + 0.2, a.z);
  }
  // harbours (positions from OpenStreetMap: 朗島 harbour, and the inlet at 椰油) and the lighthouse
  for (const [lo, la, len] of [[121.5305, 22.0793, 7], [121.5082, 22.0582, 9]]) {
    const s = shape.spotAt(lo, la, 0.05);
    M.breakwater(kit, shape, s.x, s.z, s.seaward, len, rnd);
  }
  {
    const s = shape.spotAt(121.5030, 22.0809, 1.3);
    M.lighthouse(kit, s.x, shape.height(s.x, s.z), s.z);
  }
  // forest, wild Avaka on lower slopes, tree ferns higher up, pandanus and rocks on the shore
  let trees = 0, wild = 0;
  const treeMax = quality === 'high' ? 2100 : quality === 'medium' ? 1000 : 550;
  for (let i = 0; i < 40000 && trees < treeMax; i++) {
    const x = -11 + rnd() * 22, z = -10 + rnd() * 20, d = shape.shore(x, z);
    if (d < 1.25 || near(x, z, 1.6)) continue;
    const y = shape.height(x, z), slope = Math.abs(shape.height(x + 0.1, z) - y) + Math.abs(shape.height(x, z + 0.1) - y);
    if (slope > 0.17) continue;
    if (shape.noise.noise(x * 0.24 + 40, z * 0.24) < -0.38) continue; // grassy clearings and ridges
    const r = rnd();
    if (d < 3.2 && wild < 70 && r < 0.05) { plants.avaka(x, y, z, 0.9 + rnd() * 0.4, rnd); wild++; continue; }
    if (r < 0.12 && y > 0.8) { plants.treeFern(x, y, z, 1.1 + rnd() * 0.4, rnd); continue; }
    if (r < 0.2) M.bigTree(kit, x, y, z, 1 + rnd() * 0.4, rnd);
    else M.tree(kit, x, y, z, 0.9 + rnd() * 0.6 + Math.min(0.6, y * 0.15), rnd);
    trees++;
  }
  for (let i = 0, n = 0; i < 9000 && n < (quality === 'low' ? 90 : 220); i++) {
    const x = -11 + rnd() * 22, z = -10 + rnd() * 20, d = shape.shore(x, z);
    if (d < 0.25 || d > 0.95 || onRoad(x, z) || near(x, z, 0.9)) continue;
    plants.pandanus(x, shape.height(x, z), z, 1 + rnd() * 0.4, rnd);
    n++;
  }
  for (let i = 0; i < 3000; i++) { // half as many shore rocks: they were drawing the eye
    const x = -11 + rnd() * 22, z = -10 + rnd() * 20, d = shape.shore(x, z);
    if (d < -0.35 || d > 0.2 || near(x, z, 0.7)) continue;
    M.rock(kit, x, Math.max(-0.05, shape.height(x, z)), z, 0.08 + rnd() * 0.14, rnd);
  }
  const solid = K.addRim(new THREE.MeshStandardMaterial({ roughness: 0.82, metalness: 0, flatShading: true }), 0.18);
  const kitMeshes = kit.build(scene, solid);
  const blockers = [terrain, ...kitMeshes.filter((m) => m.isInstancedMesh && !m.material.transparent && m.geometry !== kit.shapes.blob && m.geometry !== kit.shapes.trunk)];
  const fishMeshes = fishKit.build(scene, solid);
  // shell-lime burning in the month for it (night-calendar notes): small fires with rising smoke near two villages
  // everything that moves is drawn through one batch per shape (see createCrowd in kit.js)
  const crowd = K.createCrowd(THREE, { lite: quality !== 'high' });
  const limeFires = ['ivalino', 'iratay'].map((id) => {
    const v = spots[id], x = v.x + Math.sin(v.seaward) * 0.6 + 0.3, z = v.z + Math.cos(v.seaward) * 0.6, y = shape.height(x, z);
    const g = new THREE.Group();
    g.position.set(x, y, z);
    crowd.slot(g, 'cone', 0xffa040, [0, 0.04, 0], [0.1, 0.08, 0.1]);
    for (let k = 0; k < 7; k++) crowd.slot(g, 'sphere', 0x6d6862, [Math.cos(k) * 0.07, 0.015, Math.sin(k) * 0.07], [0.05, 0.04, 0.05]);
    const puffs = [];
    for (let k = 0; k < 8; k++) { const p = crowd.slot(g, 'sphere', 0xe9e6e0, [0, 0, 0], [0.12, 0.12, 0.12]); p.userData.ph = k / 8; puffs.push(p); }
    scene.add(crowd.track(g));
    return { g, puffs };
  });

  // ---------- traffic on the ring road, and goats ----------
  const traffic = [];
  {
    const kinds = quality === 'high' ? ['car', 'car', 'car', 'scooter', 'scooter', 'scooter', 'scooter', 'truck', 'truck'] : quality === 'medium' ? ['car', 'car', 'scooter', 'scooter', 'scooter', 'truck'] : ['car', 'scooter', 'truck'];
    kinds.forEach((kind, i) => {
      const g = M.vehicle(crowd, kind, rnd);
      scene.add(g);
      traffic.push({ g, u: i / kinds.length + rnd() * 0.05, dir: i % 2 ? 1 : -1, speed: (kind === 'scooter' ? 0.32 : kind === 'truck' ? 0.2 : 0.26) * (0.85 + rnd() * 0.3) });
    });
  }
  const goats = [];
  for (let i = 0, tries = 0; i < (quality === 'low' ? 4 : 9) && tries < 400; tries++) {
    const v = spots[D.villages[i % D.villages.length].id], a = rnd() * 6.28, r = 1.4 + rnd() * 1.4;
    const x = v.x + Math.cos(a) * r, z = v.z + Math.sin(a) * r;
    if (shape.shore(x, z) < 0.5 || onRoad(x, z, 0.2)) continue;
    const gt = M.goat(crowd, rnd);
    gt.g.position.set(x, shape.height(x, z), z);
    gt.g.scale.setScalar(1.0);
    scene.add(gt.g);
    goats.push({ ...gt, home: { x, z }, heading: rnd() * 6.28, pause: rnd() * 4 });
    i++;
  }
  function moveTraffic(dt, t) {
    const curve = ringRoad.userData.curve, L = curve.getLength();
    for (const c of traffic) {
      c.u = (c.u + (c.dir * c.speed * dt) / L + 1) % 1;
      const p = curve.getPointAt(c.u), tan = curve.getTangentAt(c.u);
      const side = c.dir > 0 ? 1 : -1, ox = -tan.z * 0.05 * side, oz = tan.x * 0.05 * side;
      const x = p.x + ox, z = p.z + oz;
      c.g.position.set(x, ringRoad.userData.roadY(c.u) + 0.004, z);
      c.g.rotation.y = Math.atan2(tan.x * c.dir, tan.z * c.dir);
    }
    for (const gt of goats) {
      if (gt.pause > 0) { gt.pause -= dt; gt.legs.forEach((l) => (l.rotation.x = 0)); continue; }
      gt.heading += (Math.random() - 0.5) * dt * 1.5;
      let x = gt.g.position.x + Math.sin(gt.heading) * dt * 0.08, z = gt.g.position.z + Math.cos(gt.heading) * dt * 0.08;
      if (Math.hypot(x - gt.home.x, z - gt.home.z) > 0.8 || shape.shore(x, z) < 0.45 || onRoad(x, z, 0.18)) { gt.heading += Math.PI * 0.8; continue; }
      gt.g.position.set(x, shape.height(x, z), z);
      gt.g.rotation.y = gt.heading;
      gt.legs.forEach((l, i) => (l.rotation.x = Math.sin(t * 10 + i * 1.6) * 0.5));
      if (Math.random() < dt * 0.15) gt.pause = 2 + Math.random() * 4;
    }
    for (const f of limeFires) if (f.g.visible) f.puffs.forEach((p) => {
      const k = (t * 0.25 + p.userData.ph) % 1;
      p.position.set(Math.sin(k * 6 + p.userData.ph * 9) * 0.05, 0.08 + k * 0.7, Math.cos(k * 5) * 0.04);
      p.scale.setScalar(0.12 * (0.6 + k * 2.2) * (1 - k * k)); // grow, then fade out by shrinking
    });
  }
  K.addRim(plants.build(scene, env.uniforms.uTime).material, 0.12);

  // boats out at sea, rowing slow loops off a few villages
  // how many are out depends on the month (more in the game's fishing months 3 and 4, few in the rain and the forbidden month)
  const fleet = ['iraraley', 'iranmeylek', 'imorod', 'yayo', 'iratay', 'ivalino', 'iraraley', 'yayo'].map((id, i) => {
    const s = spots[id], out = 2.4 + (i >= 6 ? 1.3 : 0), cx = s.x + Math.sin(s.seaward) * out, cz = s.z + Math.cos(s.seaward) * out;
    return { m: M.boat(THREE, scene, boatGeo, cx, -0.04, cz, 0, 0.7), cx, cz, r: 0.6 + (i % 4) * 0.14, ph: i * 1.7, sp: 0.05 + (i % 4) * 0.01 };
  });
  const BOATS_OUT = { 1: 3, 2: 1, 3: 8, 4: 8, 5: 1, 6: 4, 7: 4, 8: 4, 9: 3, 10: 2, 11: 3, 12: 3 };

  // ---------- the walking youth ----------
  // walks between the beach workshop and the step that the fastest schedule reaches this month, carrying that month's material
  const walker = (() => {
    const { g, legs, arms, head } = M.chibi(crowd, { body: 0x8fbf6a });
    const carry = new THREE.Group(); carry.position.set(0, 0.07, 0.035); g.add(carry);
    // every carried thing exists from the start; the month only decides which one is visible
    const holder = (fill) => { const h = new THREE.Group(); h.visible = false; carry.add(h); fill(h); return h; };
    const items = {
      sheath: holder((h) => crowd.slot(h, 'box', 0xb9c46a, [0, 0, 0], [0.025, 0.012, 0.16], [0.2, 0, 0])),
      strands: holder((h) => crowd.slot(h, 'box', 0xd9cf9a, [0, 0, 0], [0.03, 0.01, 0.13])),
      fibre: holder((h) => crowd.slot(h, 'box', 0xece0b6, [0, -0.03, 0], [0.024, 0.09, 0.012])),
      cord: holder((h) => crowd.slot(h, 'torus', 0xd8c08a, [0, 0, 0], [0.048, 0.048, 0.048])),
      rope: holder((h) => crowd.slot(h, 'torus', 0xc8a86a, [0, 0, 0], [0.06, 0.06, 0.06])),
    };
    g.scale.setScalar(1.2);
    scene.add(g);
    const tagEl = document.createElement('span');
    tagEl.className = 'pin k-walker';
    const tag = new CSS2DObject(tagEl);
    tag.position.set(0, 0.2, 0);
    g.add(tag);
    let path = null, len = 1, s = 0, dir = 1, wait = 0;
    function route(targetId) {
      const a = spots.beach, b = spots[targetId] || spots.beach;
      const pts = [];
      for (let i = 0; i <= 24; i++) {
        const t = i / 24, x = a.x + (b.x - a.x) * t, z = a.z + (b.z - a.z) * t;
        pts.push(new THREE.Vector3(x, shape.height(x, z) + 0.005, z));
      }
      path = new THREE.CatmullRomCurve3(pts);
      len = Math.max(0.01, path.getLength());
      s = 0; dir = 1; wait = 0.6;
    }
    function setMonth(m) {
      for (const [k, h] of Object.entries(items)) h.visible = k === m.walker.carry;
      route(m.walker.target);
      place(reduced.matches ? 1 : 0);
    }
    function place(u) {
      const p = path.getPointAt(u), q = path.getPointAt(Math.min(1, Math.max(0, u + dir * 0.01)));
      g.position.copy(p);
      if (q.distanceTo(p) > 1e-4) g.rotation.y = Math.atan2(q.x - p.x, q.z - p.z);
    }
    let nextBreak = 6;
    function update(dt, t) {
      if (!path) return;
      if (wait > 0) {
        // a little wave while resting at either end, and now and then on the way
        wait -= dt;
        legs.forEach((l) => (l.rotation.x = 0));
        arms[1].rotation.z = 2.4 + Math.sin(t * 10) * 0.35; arms[1].rotation.x = 0;
        arms[0].rotation.z = -0.25; arms[0].rotation.x = 0;
        head.rotation.z = Math.sin(t * 3) * 0.12;
        return;
      }
      s += dir * dt * 0.3;
      nextBreak -= dt;
      if (nextBreak < 0) { nextBreak = 7 + Math.random() * 6; wait = 1.2; }
      if (s >= len || s <= 0) { s = Math.min(len, Math.max(0, s)); dir *= -1; wait = 1.8; }
      place(s / len);
      const sw = Math.sin(t * 9);
      legs.forEach((l, i) => (l.rotation.x = (i ? -sw : sw) * 0.7));
      arms.forEach((a, i) => { a.rotation.x = (i ? sw : -sw) * 0.6; a.rotation.z = (i ? 1 : -1) * 0.25; });
      head.rotation.z = 0;
      g.position.y += Math.abs(sw) * 0.006;
    }
    return { setMonth, update, tagEl, g, tag };
  })();

  // ---------- people on the roads and in the villages: tap one to say hello ----------
  const GREETINGS = [
    { zh: '你好！', en: 'Hello!' },
    { zh: 'kagagan！（朋友）', en: 'kagagan! (friend)' }, // appendix 5: kagagan = friend (Wu 2012: 99)
    { zh: '要去灘頭嗎？', en: 'Off to the beach?' },
    { zh: '今天的海好平靜。', en: 'The sea is calm today.' },
    { zh: '山上的 Avaka 長得好嗎？', en: 'How is the Avaka up the hill?' },
    { zh: '一起去曬魚架那邊看看！', en: "Let's go see the drying racks!" },
  ];
  const peds = [], pedHits = [];
  {
    const curve = ringRoad.userData.curve;
    const add = (opts) => {
      const c = M.chibi(crowd, { pack: false, body: opts.body ?? [0x6fa6c4, 0xe0957a, 0xb8a0d8, 0xf0c66a, 0x8fbf6a][peds.length % 5], skin: [0xc08a64, 0xb07a56, 0xa86e4c][peds.length % 3] });
      c.g.scale.setScalar(opts.scale ?? 1.05);
      scene.add(c.g);
      const hit = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
      hit.position.y = 0.08; c.g.add(hit);
      const bubbleEl = document.createElement('span'); bubbleEl.className = 'bubble';
      const bubble = new CSS2DObject(bubbleEl); bubble.position.set(0, 0.24, 0); bubble.visible = false; c.g.add(bubble);
      const p = { ...c, ...opts, bubble, bubbleEl, act: 0, phase: Math.random() * 6 };
      hit.userData.ped = p;
      pedHits.push(hit);
      peds.push(p);
      return p;
    };
    // a basket carried on the head, a bicycle
    const basket = (p) => crowd.slot(p.g, 'cyl', 0xc8a46a, [0, 0.15, 0], [0.056, 0.022, 0.056]);
    const bike = (p) => {
      const g = new THREE.Group();
      for (const z of [-0.04, 0.04]) crowd.slot(g, 'ring', 0x2a2a2c, [0, 0.022, z], [0.044, 0.044, 0.044], [0, Math.PI / 2, 0]);
      crowd.slot(g, 'box', 0xe8826a, [0, 0.035, 0], [0.006, 0.006, 0.08]);
      p.g.children.forEach((o) => (o.position.y += 0.02));
      p.g.add(g); p.legs.forEach((l) => (l.visible = false));
    };
    const n = quality === 'high' ? 16 : quality === 'medium' ? 9 : 4;
    const roles = ['stroll', 'stroll', 'carry', 'bike', 'pair', 'village', 'village', 'chat', 'stroll', 'bike', 'carry', 'village', 'pair', 'chat', 'stroll', 'village'].slice(0, n);
    roles.forEach((role, i) => {
      if (role === 'stroll' || role === 'carry' || role === 'bike') {
        const p = add({ mode: 'road', u: (i * 0.137 + 0.05) % 1, dir: i % 2 ? 1 : -1, speed: role === 'bike' ? 0.2 : 0.07 });
        if (role === 'carry') basket(p);
        if (role === 'bike') bike(p);
      } else if (role === 'pair') {
        const u = (i * 0.211 + 0.3) % 1;
        add({ mode: 'road', u, dir: 1, speed: 0.06 });
        add({ mode: 'road', u: (u + 0.0012) % 1, dir: 1, speed: 0.06, scale: 0.75, lane: 0.04, body: 0xf0c66a }); // a child alongside
      } else if (role === 'village') {
        const v = spots[D.villages[i % D.villages.length].id], x = v.x + (Math.random() - 0.5) * 0.8, z = v.z + (Math.random() - 0.5) * 0.5;
        add({ mode: 'wander', home: { x, z }, x, z, heading: Math.random() * 6.28, wait: 0 });
      } else {
        // two people chatting by a village's fish racks
        const v = spots[D.villages[(i + 2) % D.villages.length].id], bx = v.x + Math.sin(v.seaward) * 0.55, bz = v.z + Math.cos(v.seaward) * 0.55;
        const a = add({ mode: 'stay', x: bx - 0.07, z: bz, face: Math.PI / 2 });
        const b = add({ mode: 'stay', x: bx + 0.07, z: bz, face: -Math.PI / 2 });
        a.friend = b; b.friend = a;
      }
    });
    const L = curve.getLength();
    for (const p of peds) {
      if (p.mode === 'stay' || p.mode === 'wander') { p.g.position.set(p.x, shape.height(p.x, p.z), p.z); p.g.rotation.y = p.face ?? p.heading; }
      p.L = L;
    }
  }
  function sayHello(p, dur = 3.6) {
    const g = GREETINGS[Math.floor(Math.random() * GREETINGS.length)];
    p.bubbleEl.textContent = t(g);
    p.bubble.visible = true;
    p.act = dur;
  }
  function movePeople(dt, now, animate) {
    const curve = ringRoad.userData.curve;
    for (const p of peds) {
      let walking = false;
      if (animate && p.act <= 0) {
        if (p.mode === 'road') {
          p.u = (p.u + (p.dir * p.speed * dt) / p.L + 1) % 1;
          const q = curve.getPointAt(p.u), tan = curve.getTangentAt(p.u), off = 0.15 + (p.lane || 0);
          // walk on the inland shoulder
          const x = q.x - tan.z * off * (p.side || 1), z = q.z + tan.x * off * (p.side || 1);
          p.g.position.set(x, Math.max(shape.height(x, z) + 0.01, ringRoad.userData.roadY(p.u) - 0.02), z);
          p.g.rotation.y = Math.atan2(tan.x * p.dir, tan.z * p.dir);
          walking = true;
        } else if (p.mode === 'wander') {
          if (p.wait > 0) p.wait -= dt;
          else {
            p.heading += (Math.random() - 0.5) * dt * 1.2;
            const x = p.g.position.x + Math.sin(p.heading) * dt * 0.06, z = p.g.position.z + Math.cos(p.heading) * dt * 0.06;
            if (Math.hypot(x - p.home.x, z - p.home.z) > 0.6 || onRoad(x, z, 0.12)) p.heading += Math.PI * 0.7;
            else { p.g.position.set(x, shape.height(x, z), z); p.g.rotation.y = p.heading; walking = true; }
            if (Math.random() < dt * 0.12) p.wait = 2 + Math.random() * 3;
          }
        } else if (p.mode === 'stay' && Math.random() < dt * 0.05 && !p.bubble.visible) {
          // chatting friends trade a line now and then (no hop, just the bubble)
          p.bubbleEl.textContent = t(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
          p.bubble.visible = true; p.talk = 2.5;
        }
      }
      const sw = Math.sin(now * 9 + p.phase);
      if (p.act > 0) {
        // the tap reaction: hop and wave
        p.act -= dt;
        const k = Math.max(0, p.act);
        p.g.position.y = shape.height(p.g.position.x, p.g.position.z) + (p.mode === 'road' ? 0.01 : 0) + Math.abs(Math.sin(k * 6)) * 0.04 * Math.min(1, k);
        p.arms[1].rotation.z = 2.4 + Math.sin(now * 12) * 0.35;
        p.legs.forEach((l) => (l.rotation.x = 0));
        if (p.act <= 0) p.bubble.visible = false;
      } else {
        if (p.talk > 0) { p.talk -= dt; if (p.talk <= 0) p.bubble.visible = false; }
        p.legs.forEach((l, i) => (l.rotation.x = walking ? (i ? -sw : sw) * 0.7 : 0));
        p.arms.forEach((a, i) => { a.rotation.x = walking ? (i ? sw : -sw) * 0.5 : 0; a.rotation.z = (i ? 1 : -1) * 0.25; });
        if (walking) p.g.position.y += Math.abs(sw) * 0.005;
      }
    }
  }

  // ---------- story props ----------
  // a sign on the southernmost shore, pointing out to sea toward the Batanes
  const signSpot = (() => {
    let s = shape.coast[0];
    for (const p of shape.coast) if (p[1] > s[1]) s = p; // +z is south
    const q = { x: s[0], z: s[1] };
    for (let i = 0; i < 30; i++) { const [nx, nz] = shape.inland(q.x, q.z), e = 0.4 - shape.polyDist(q.x, q.z); q.x += nx * e * 0.6; q.z += nz * e * 0.6; }
    const [nx, nz] = shape.inland(q.x, q.z);
    q.seaward = Math.atan2(-nx, -nz);
    return q;
  })();
  {
    const g = new THREE.Group();
    g.position.set(signSpot.x, shape.height(signSpot.x, signSpot.z), signSpot.z);
    g.rotation.y = signSpot.seaward;
    crowd.slot(g, 'box', 0x7a5a3a, [0, 0.16, 0], [0.03, 0.32, 0.03]);
    crowd.slot(g, 'box', 0xf3ead6, [0, 0.28, 0.06], [0.025, 0.07, 0.16]);
    crowd.slot(g, 'cone', 0xa8742f, [0, 0.28, 0.17], [0.11, 0.08, 0.11], [Math.PI / 2, 0, 0]);
    scene.add(crowd.track(g));
  }
  // the evening market at 椰油: in the village lane then, along both sides of the ring road now (Yang 2014)
  const market = (() => {
    const s = spots.yayo, f = kit.frame(s.x, 0, s.z, s.seaward);
    const roadZ = 1.0 - ROAD_D; // the village spot sits at shore 1.0, the road at ROAD_D
    const now = [[-0.55, roadZ + 0.17], [-0.2, roadZ + 0.17], [0.3, roadZ - 0.17], [0.65, roadZ - 0.17]].map(([x, z]) => f.at(x, z));
    const past = [[-0.13, -0.45], [0.13, -0.6], [-0.13, -0.8], [0.13, -0.95]].map(([x, z]) => f.at(x, z));
    const tops = [0xd8584a, 0x3f7a3a, 0x2f6f8f, 0xe0a33a];
    const stalls = tops.map((c) => {
      const g = new THREE.Group();
      crowd.slot(g, 'box', 0x9b7b55, [0, 0.06, 0], [0.15, 0.03, 0.09]);
      for (const sx of [-1, 1]) crowd.slot(g, 'box', 0x6b5238, [sx * 0.07, 0.08, -0.04], [0.012, 0.16, 0.012]);
      crowd.slot(g, 'box', c, [0, 0.165, 0], [0.18, 0.012, 0.12], [0.18, 0, 0]);
      const goods = new THREE.Group(); // processed flying fish on the table, only in the present
      for (let k = 0; k < 3; k++) crowd.slot(goods, 'box', 0xc9d2d6, [-0.045 + k * 0.045, 0.085, 0], [0.03, 0.015, 0.05]);
      g.add(goods);
      g.userData.goods = goods;
      g.scale.setScalar(0.8);
      scene.add(crowd.track(g));
      return g;
    });
    function set(era) {
      const pts = era === 'past' ? past : now;
      stalls.forEach((g, i) => {
        const [x, z] = pts[i];
        g.position.set(x, shape.height(x, z), z);
        g.rotation.y = s.seaward + (era === 'past' ? (i % 2 ? -1 : 1) * Math.PI / 2 : 0);
        g.userData.goods.visible = era !== 'past';
      });
    }
    const centre = (era) => { const pts = era === 'past' ? past : now, x = pts.reduce((a, p) => a + p[0], 0) / 4, z = pts.reduce((a, p) => a + p[1], 0) / 4; return new THREE.Vector3(x, shape.height(x, z) + 0.1, z); };
    return { set, centre, seaward: s.seaward };
  })();

  const crowdMat = K.addRim(new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0 }), 0.12);
  crowd.build(scene, crowdMat);
  M.buildBoats(THREE, scene, boatGeo);

  // ---------- months ----------
  const months = new Map(D.months.map((m) => [m.n, m]));
  let month = Math.min(12, Math.max(1, parseInt(params.get('month'), 10) || 1)), playing = null;
  function renderMonths() {
    $('#months').innerHTML = `<button type="button" id="play" class="play" aria-pressed="${!!playing}">${playing ? '❚❚' : '▶'}<span>${esc(t(playing ? D.ui.pause : D.ui.play))}</span></button>` +
      D.months.map((m) => `<button type="button" class="mo" data-n="${m.n}" aria-pressed="${m.n === month}" title="${esc(m.name)} ${esc(t(m.label))}">${m.n}</button>`).join('');
    $('#months').querySelectorAll('.mo').forEach((b) => (b.onclick = () => { stopPlay(); setMonth(+b.dataset.n); }));
    $('#play').onclick = () => (playing ? stopPlay() : startPlay());
    const m = months.get(month);
    $('#month-info').innerHTML = `<p class="mname"><b>${month}</b><span>${esc(t(D.ui.month))}</span><i lang="tao">${esc(m.name)}</i><em>${esc(t(m.label))}</em></p>
      <p class="mgame"><span>${esc(t(D.ui.thisMonth))}</span>${esc(t(m.game))}</p>
      <p class="mcal"><span>${esc(t(D.ui.calendarLine))}</span>${esc(t(m.calendar))}</p>
      <p class="mwalk">${esc(t(D.ui.walker))}：${esc(t(m.walker.note))}</p>
      <p class="mvar">${esc(t(D.ui.variants))}：${esc(m.variants)}・${esc(t(sources.get('nightcal').title))}</p>
      ${m.extra ? `<p class="mextra">${esc(t(m.extra))}</p>` : ''}`;
  }
  function setMonth(n, { instant = false } = {}) {
    month = n;
    const m = months.get(n);
    env.setMonth(n, instant || reduced.matches);
    fleet.forEach((b, i) => (b.m.visible = i < BOATS_OUT[n]));
    fishMeshes.forEach((fm) => (fm.visible = n >= 2 && n <= 8)); // fish dry from the fishing season until the ending rite in month 9
    limeFires.forEach((f) => (f.g.visible = n === 10));
    crowd.sync(); M.syncBoats();
    walker.setMonth(m);
    // places that are closed or cannot be finished this month get a small badge
    labelEls.forEach((el, id) => {
      el.querySelector('em.badge')?.remove();
      const c = m.closed?.[id];
      el.classList.toggle('shut', !!c);
      if (c) { const b = document.createElement('em'); b.className = 'badge'; b.textContent = t(c); el.appendChild(b); }
    });
    renderMonths();
    if (!instant) updateUrl();
    dirty = true;
  }
  function startPlay() {
    if (month === 12) setMonth(1);
    playing = setInterval(() => { if (month >= 12) stopPlay(); else setMonth(month + 1); }, 5200);
    renderMonths();
  }
  function stopPlay() { if (playing) clearInterval(playing); playing = null; renderMonths(); }
  function updateUrl() {
    const q = new URLSearchParams();
    if (selected) q.set('focus', selected);
    if (story >= 0) q.set('story', story + 1);
    if (eraOpen) q.set('view', 'era');
    if (era === 'past') q.set('era', 'past');
    if (month !== 1) q.set('month', month);
    if (lang === 'en') q.set('lang', 'en');
    const qs = q.toString();
    history.replaceState(null, '', qs ? `?${qs}` : location.pathname);
  }

  // ---------- labels and click targets ----------
  const pickables = [];
  const labelEls = new Map(), labelObjs = new Map();
  for (const [id, it] of items) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = `pin k-${it.kind}`;
    el.dataset.id = id;
    el.innerHTML = it.kind === 'village' ? '<span></span>' : `<i>${esc(it.number)}</i><span></span>`;
    el.addEventListener('click', (e) => { e.stopPropagation(); select(id); });
    const o = new CSS2DObject(el);
    const lift = { place: id === 'forest' ? 2.6 : 0.6, step: 0.35, village: 0.5, site: 1.1 }[it.kind];
    o.position.copy(focus[id]).add(new THREE.Vector3(0, lift, 0));
    o.userData = { id, kind: it.kind };
    scene.add(o);
    labelEls.set(id, el);
    labelObjs.set(id, o);
    const r = { place: id === 'forest' ? 1.4 : 1.0, step: 0.4, village: 1.0, site: 0.6 }[it.kind];
    const hit = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.copy(focus[id]);
    hit.userData = { id, kind: it.kind };
    scene.add(hit);
    pickables.push(hit);
  }
  const PRIORITY = { place: 4, village: 3, site: 2, step: 1, road: 0 };
  const roadTags = [];
  for (const [curve, t0, name] of [[ringRoad.userData.curve, 0.6, { zh: '環島公路', en: 'Round-island road' }], [crossRoad.userData.curve, 0.55, { zh: '橫貫公路', en: 'Cross-island road' }]]) {
    const p = curve.getPointAt(t0), el = document.createElement('span');
    el.className = 'pin k-road';
    const o = new CSS2DObject(el);
    o.position.set(p.x, shape.height(p.x, p.z) + 0.25, p.z);
    o.userData = { id: 'road-' + roadTags.length, kind: 'road' };
    scene.add(o);
    roadTags.push({ o, el, name });
  }

  // ---------- camera moves ----------
  let fly = null, dirty = true, selected = null;
  const center = new THREE.Vector3(0, 0.4, 0);
  function overview() {
    const aspect = stage.clientWidth / Math.max(1, stage.clientHeight);
    const dist = aspect < 0.6 ? 112 : aspect < 0.8 ? 80 : aspect < 1.25 ? 46 : 36;
    return { pos: center.clone().add(new THREE.Vector3(-0.3, 0.66, 0.69).normalize().multiplyScalar(dist)), target: center.clone() };
  }
  // each place gets its own camera: look from the sea side at about 38°, trying a fan of angles around that and
  // keeping the first one whose line of sight is not blocked by the ground or a building (cached per place)
  const viewCache = new Map(), sight = new THREE.Raycaster();
  function viewFor(id) {
    const it = items.get(id), target = focus[id].clone();
    let dist = { place: id === 'forest' ? 6.2 : 5.2, step: 3.2, village: 5.4, site: 4.4 }[it.kind];
    if (stage.clientWidth / stage.clientHeight < 0.8) dist *= 1.45;
    const key = id + ':' + dist.toFixed(2);
    if (!viewCache.has(key)) {
      // steps sit among tall plants, so they are seen from higher up
      const sea = spots[it.kind === 'step' ? it.place : id]?.seaward ?? 0, elev = it.kind === 'step' ? 1.0 : 0.66;
      let best = null, bestClear = -1;
      for (const turn of [0, 0.45, -0.45, 0.9, -0.9, 1.4, -1.4, 2.2, -2.2]) {
        const a = sea + turn, dir = new THREE.Vector3(Math.sin(a) * Math.cos(elev), Math.sin(elev), Math.cos(a) * Math.cos(elev));
        sight.set(target.clone().add(new THREE.Vector3(0, 0.08, 0)), dir);
        sight.far = dist;
        const hit = sight.intersectObjects(blockers, false)[0];
        const clear = hit ? hit.distance : dist;
        if (clear > bestClear) { bestClear = clear; best = dir; }
        if (!hit) break;
      }
      viewCache.set(key, best);
    }
    return { pos: target.clone().add(viewCache.get(key).clone().multiplyScalar(dist)), target };
  }
  function moveTo(v) {
    if (reduced.matches) {
      camera.position.copy(v.pos); controls.target.copy(v.target); controls.update(); dirty = true;
    } else fly = { t0: performance.now(), from: camera.position.clone(), to: v.pos, old: controls.target.clone(), target: v.target };
  }
  // keep the selected thing in the open part of the screen: shift right of a side card, or up above a bottom sheet
  const shift = new THREE.Vector2(), shiftGoal = new THREE.Vector2();
  function cardShift() {
    const card = $('#card');
    const wide = stage.clientWidth > 800;
    // with no card open, the list panel covers the left edge on wide screens, so nudge the island right
    if (card.hidden) return shiftGoal.set(wide ? -($('.side').offsetWidth + 16) / 2 : 0, 0);
    if (wide) return shiftGoal.set(Math.min(220, card.offsetWidth / 2) - ($('.side').offsetWidth + 16) / 4, 0);
    return shiftGoal.set(0, Math.min(stage.clientHeight * 0.3, card.offsetHeight / 2));
  }
  function applyShift() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (shift.lengthSq() < 0.25) camera.clearViewOffset();
    else camera.setViewOffset(w, h, shift.x, shift.y, w, h);
  }

  // ---------- list and card ----------
  function listButton(id) {
    const it = items.get(id);
    const num = it.kind === 'village' ? '' : `<i>${esc(it.number)}</i>`;
    const sub = it.kind === 'village' ? '' : `<span>${esc(t(it.short) || '')}</span>`;
    const label = it.kind === 'village' ? (lang === 'en' ? it.en : it.zh) : t(it.name);
    return `<li><button type="button" class="place ${it.kind}" data-id="${id}" aria-pressed="${selected === id}">${num}<b>${esc(label)}</b>${sub}</button></li>`;
  }
  function renderList() {
    $('#list').innerHTML = D.places.map((p) => listButton(p.id)).join('') + D.sites.map((s) => listButton(s.id)).join('');
    $('#vlist').innerHTML = D.villages.map((v) => listButton(v.id)).join('');
    document.querySelectorAll('.side .place').forEach((b) => (b.onclick = () => select(b.dataset.id)));
  }
  const srcList = (ids) => [...ids].filter((s) => sources.has(s)).map((s) => {
    const src = sources.get(s);
    return `<li>${esc(t(src.title))}${src.url ? ` <a href="${esc(src.url)}" target="_blank" rel="noopener">↗</a>` : ''}</li>`;
  }).join('');
  const chipRow = (chips) => (chips.length ? `<p class="chips">${chips.map((c) => `<span class="chip${c.tone ? ' ' + c.tone : ''}">${esc(c.text)}</span>`).join('')}</p>` : '');
  // each paragraph says where it comes from: field observation, oral account, literature or inference
  const evTags = (ev) => (ev || []).map((k) => `<span class="ev ev-${k}">${esc(t(D.ui.ev[k]))}</span>`).join('');
  const para = (p, cls = '') => `<p${cls ? ` class="${cls}"` : ''}>${evTags(p.ev)}${esc(t(p))}${p.ref ? ` <span class="ref">${esc(t(p.ref))}</span>` : ''}</p>`;
  // the first paragraph is the summary; anything after it folds into "more"
  const summaryMore = (paras) => paras.length <= 1 ? paras.map((p) => para(p, 'summary')).join('')
    : `${para(paras[0], 'summary')}<details class="more"><summary>${esc(t(D.ui.more))}</summary>${paras.slice(1).map((p) => para(p)).join('')}</details>`;
  function chipsFor(it) {
    const c = [];
    if (it.kind === 'village') {
      c.push({ text: t(D.ui.village) });
      const adm = it.facts[0] && t(it.facts[0]).replace(/^位於|。$/g, '').replace(/^Covers neighbourhoods /, '');
      if (adm) c.push({ text: adm, tone: 'soft' });
    } else if (it.kind === 'step') {
      c.push({ text: t(items.get(it.place).name) });
      if (it.photo) c.push({ text: t(D.ui.hasPhoto), tone: 'soft' });
      if (it.terms?.length) c.push({ text: `${t(D.ui.terms)} ${it.terms.length}`, tone: 'soft' });
    } else if (it.kind === 'place') {
      if (it.steps?.length) c.push({ text: `${t(D.ui.step)} ${it.steps.map((x) => items.get(x).number).join('')}` });
      for (const m of D.months) if (m.closed?.[it.id]) c.push({ text: `${m.n} ${t(D.ui.month)}・${t(m.closed[it.id])}`, tone: 'warn' });
    } else {
      if (it.id === 'weather') c.push({ text: t(D.ui.heritage) });
      if (it.id === 'airport' || it.id === 'avaka-field') c.push({ text: t(D.ui.landmark) });
      if (it.id === 'avaka-field') c.push({ text: t(D.ui.unconfirmed), tone: 'warn' });
    }
    return chipRow(c);
  }
  function renderCard(id) {
    const it = items.get(id), srcIds = new Set();
    let html = '';
    if (it.kind === 'village') {
      it.facts.forEach((f) => f.src.forEach((s) => srcIds.add(s)));
      srcIds.add('cip');
      html = `<p class="eyebrow">${esc(t(D.ui.village))}</p>
        <h2 id="card-title">${esc(it.zh)}</h2>
        <p class="tao-name"><span>${esc(t(D.ui.taoName))}</span><b lang="tao">${esc(it.tao)}</b></p>
        ${chipsFor(it)}
        ${summaryMore(it.facts.slice(1))}
        <p class="muted">${esc(t(D.ui.position).replace('{pt}', it.cipPoint))}</p>`;
    } else {
      (it.body || []).forEach((b) => b.src.forEach((s) => srcIds.add(s)));
      (it.terms || []).forEach((x) => srcIds.add(x.src));
      if (it.photo) srcIds.add(it.photo.src);
      const eyebrow = it.kind === 'step' ? `${esc(t(D.ui.step))} ${esc(it.number)}` : esc(it.number);
      const parent = it.kind === 'step' ? `<button type="button" class="crumb back" data-id="${it.place}">← ${esc(t(items.get(it.place).name))}</button>` : '';
      const photo = it.photo ? `<figure><img src="/island/photos/${esc(it.photo.file)}" alt="${esc(t(it.photo.caption))}" loading="lazy"><figcaption>${esc(t(it.photo.caption))}</figcaption></figure>` : '';
      const terms = it.terms?.length ? `<h3>${esc(t(D.ui.terms))}</h3><dl class="terms">${it.terms.map((x) => `<div><dt lang="tao">${esc(x.tao)}</dt><dd>${esc(lang === 'en' ? x.en : x.zh)}</dd></div>`).join('')}</dl>` : '';
      const steps = it.steps?.length ? `<h3>${esc(t(D.ui.steps))}</h3><ol class="steps">${it.steps.map((s) => `<li><button type="button" class="crumb" data-id="${s}"><i>${esc(items.get(s).number)}</i>${esc(t(items.get(s).name))}</button></li>`).join('')}</ol>` : '';
      html = `${parent}<p class="eyebrow">${eyebrow}</p>
        <h2 id="card-title">${esc(t(it.name))}</h2>
        ${chipsFor(it)}
        ${it.game ? `<p class="game"><b>${esc(t(D.ui.inGame))}</b>${esc(t(it.game))}</p>` : ''}
        ${photo}
        ${summaryMore(it.body || [])}
        ${steps}${terms}`;
    }
    $('#card-body').innerHTML = `${html}<details class="src"><summary>${esc(t(D.ui.sources))}</summary><ul>${srcList(srcIds)}</ul></details>`;
    $('#card-body').querySelectorAll('.crumb').forEach((b) => (b.onclick = () => select(b.dataset.id)));
  }
  function select(id, { silent } = {}) {
    if (!items.has(id)) return;
    leaveModes();
    selected = id;
    renderCard(id);
    $('#card').hidden = false;
    $('#card').scrollTop = 0;
    document.body.classList.add('has-card');
    cardShift();
    labelEls.forEach((el, k) => el.classList.toggle('on', k === id));
    renderList();
    moveTo(viewFor(id));
    if (!silent) updateUrl();
    hideHint();
  }
  function closeCard() {
    leaveModes();
    selected = null;
    $('#card').hidden = true;
    document.body.classList.remove('has-card');
    cardShift();
    labelEls.forEach((el) => el.classList.remove('on'));
    renderList();
    updateUrl();
  }
  // ---------- "Avaka's life": five stops along one thread, which thickens from fibre to rope as the story goes on ----------
  const ropeMap = (() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 16;
    const g = c.getContext('2d');
    g.fillStyle = '#c9a26a'; g.fillRect(0, 0, 64, 16);
    g.strokeStyle = '#8f6a3c'; g.lineWidth = 3;
    for (let x = -16; x < 80; x += 10) { g.beginPath(); g.moveTo(x, 16); g.lineTo(x + 16, 0); g.stroke(); }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  })();
  const signTop = new THREE.Vector3(signSpot.x, shape.height(signSpot.x, signSpot.z) + 0.4, signSpot.z);
  const lift = (v) => v.clone().add(new THREE.Vector3(0, 0.3, 0));
  // stop k (k >= 1) draws segment k-1; the first segment runs from the sign over the island to the forest, then the beach
  const legs = [[signTop, lift(focus.forest), lift(focus.beach)], [lift(focus.beach), lift(focus.iraraley)], [lift(focus.iraraley), lift(focus.shop)], [lift(focus.shop), lift(focus['avaka-field'])]];
  const thread = legs.map((way, k) => {
    const pts = [];
    for (let w = 0; w < way.length - 1; w++) {
      const a = way[w], b = way[w + 1], len = a.distanceTo(b), n = Math.max(14, Math.ceil(len * 7)), arc = Math.min(0.55, len * 0.06);
      for (let i = w ? 1 : 0; i <= n; i++) {
        const u = i / n, x = a.x + (b.x - a.x) * u, z = a.z + (b.z - a.z) * u;
        let g = 0;
        for (const [dx, dz] of [[0, 0], [0.18, 0], [-0.18, 0], [0, 0.18], [0, -0.18]]) g = Math.max(g, shape.height(x + dx, z + dz));
        pts.push(new THREE.Vector3(x, Math.max(g + 0.22, a.y + (b.y - a.y) * u) + Math.sin(Math.PI * u) * arc, z));
      }
    }
    for (let pass = 0; pass < 3; pass++) for (let i = 1; i < pts.length - 1; i++) pts[i].y = Math.max(pts[i].y, (pts[i - 1].y + pts[i].y + pts[i + 1].y) / 3);
    const curve = new THREE.CatmullRomCurve3(pts), segs = pts.length * 3, radial = 7;
    const geo = new THREE.TubeGeometry(curve, segs, 0.022 + k * 0.012, radial, false);
    const map = ropeMap.clone(); map.needsUpdate = true; map.repeat.set(curve.getLength() * 7, 1);
    const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map, roughness: 0.9, metalness: 0 }));
    mesh.castShadow = false;
    mesh.visible = false;
    mesh.userData = { total: geo.index.count, quad: radial * 6, shown: 0, goal: 0 };
    geo.setDrawRange(0, 0);
    scene.add(mesh);
    return mesh;
  });
  const tag = (text, pos, cls) => {
    const el = document.createElement('span');
    el.className = `pin ${cls}`;
    const o = new CSS2DObject(el);
    o.position.copy(pos);
    o.visible = false;
    scene.add(o);
    return { el, o, text };
  };
  const batanesTag = tag('batanes', signTop.clone().add(new THREE.Vector3(0, 0.25, 0)), 'k-story');
  const marketTag = tag('market', market.centre('now').add(new THREE.Vector3(0, 0.35, 0)), 'k-story');
  let story = -1, eraOpen = false;
  let era = params.get('era') === 'past' ? 'past' : 'now';
  function showThread(upTo, animate = true) {
    thread.forEach((m, k) => {
      const d = m.userData, on = k < upTo;
      d.goal = on ? d.total : 0;
      if (!animate || reduced.matches || !on) d.shown = d.goal;
      if (on) m.visible = true;
      m.geometry.setDrawRange(0, Math.floor(d.shown / d.quad) * d.quad);
      if (!on) m.visible = false;
    });
    dirty = true;
  }
  function stepThread(dt) {
    let moving = false;
    for (const m of thread) {
      const d = m.userData;
      if (d.shown === d.goal) continue;
      d.shown = Math.min(d.goal, d.shown + d.total * dt * 0.7);
      m.geometry.setDrawRange(0, Math.floor(d.shown / d.quad) * d.quad);
      moving = true;
    }
    return moving;
  }
  function look(target, sea, dist, elev = 0.7) {
    if (stage.clientWidth / stage.clientHeight < 0.8) dist *= 1.45;
    const dir = new THREE.Vector3(Math.sin(sea) * Math.cos(elev), Math.sin(elev), Math.cos(sea) * Math.cos(elev));
    return { pos: target.clone().add(dir.multiplyScalar(dist)), target };
  }
  function storyView(i) {
    const id = D.story[i].id;
    if (id === 'from') { // from the island side, looking out past the sign to the southern sea
      const out = new THREE.Vector3(Math.sin(signSpot.seaward), 0, Math.cos(signSpot.seaward));
      return look(signTop.clone().add(out.multiplyScalar(1.4)).setY(0.2), signSpot.seaward + Math.PI, 12, 1.05);
    }
    if (id === 'making') return look(focus.forest.clone().lerp(focus.beach, 0.5), spots.beach.seaward, 15, 0.85);
    if (id === 'ritual') return look(focus.iraraley.clone(), spots.iraraley.seaward, 9, 0.7);
    if (id === 'replaced') return look(focus.shop.clone(), spots.shop.seaward, 10, 0.75);
    return look(focus['avaka-field'].clone(), spots['avaka-field'].seaward, 12, 0.8);
  }
  const srcIdsOf = (paras) => new Set(paras.flatMap((p) => p.src || []));
  function eraTable() {
    const E = D.era;
    return `<div class="seg" role="group" aria-label="${esc(t(D.ui.era))}">${['past', 'now'].map((e) => `<button type="button" data-era="${e}" aria-pressed="${era === e}">${esc(t(e === 'past' ? D.ui.eraPast : D.ui.eraNow))}</button>`).join('')}</div>
      <table class="era-table"><thead><tr><th></th><th>${esc(t(D.ui.eraPast))}</th><th>${esc(t(D.ui.eraNow))}</th></tr></thead><tbody>
      ${E.items.map((r) => `<tr><th scope="row">${esc(t(r.what))}</th><td${era === 'past' ? ' class="on"' : ''}>${esc(t(r.past))}</td><td${era === 'now' ? ' class="on"' : ''}>${esc(t(r.now))}</td></tr>`).join('')}
      </tbody></table><p class="muted">${evTags(['lit'])}${esc(t(E.note))}</p>`;
  }
  function wireCard() {
    $('#card-body').querySelectorAll('.crumb').forEach((b) => (b.onclick = () => select(b.dataset.id)));
    $('#card-body').querySelectorAll('[data-stop]').forEach((b) => (b.onclick = () => openStory(+b.dataset.stop)));
    $('#card-body').querySelectorAll('[data-era]').forEach((b) => (b.onclick = () => setEra(b.dataset.era)));
    $('#card-body').querySelector('.end')?.addEventListener('click', () => { closeCard(); moveTo(overview()); });
    $('#card-body').querySelector('.open-era')?.addEventListener('click', () => openEra());
  }
  function renderStory(i) {
    const s = D.story[i], n = D.story.length, srcIds = srcIdsOf(s.paras);
    const rq = s.rq.length ? s.rq.map((k) => ({ text: `${t(D.ui.rq)}${lang === 'en' ? ' ' : ''}${t(D.ui.rqNames[k])}` })) : [{ text: t(D.ui.rqBg), tone: 'soft' }];
    const dots = D.story.map((x, k) => `<li><button type="button" data-stop="${k}" aria-current="${k === i ? 'step' : 'false'}" title="${esc(t(x.title))}"><span>${k + 1}</span></button></li>`).join('');
    const links = s.links.length ? `<h3>${esc(t(D.ui.goTo))}</h3><p class="links">${s.links.map((id) => `<button type="button" class="crumb" data-id="${id}">${esc(t(items.get(id).name))}</button>`).join('')}</p>` : '';
    const outputs = s.outputs ? `<h3>${esc(t(D.ui.elsewhere))}</h3><p class="links">${D.outputs.map((o) => `<a class="crumb" href="${esc(o.href)}">${esc(t(o.label))}</a>`).join('')}</p>` : '';
    if (s.era) { D.era.items.forEach((r) => r.src.forEach((x) => srcIds.add(x))); }
    $('#card-body').innerHTML = `<p class="eyebrow">${esc(t(D.ui.storyEyebrow))}　${i + 1} / ${n}</p>
      <ol class="story-dots">${dots}</ol>
      <h2 id="card-title">${esc(t(s.title))}</h2>
      ${chipRow(rq)}<p class="ref block">${esc(t(s.ref))}</p>
      ${s.paras.map((p) => para(p, 'story-p')).join('')}
      ${s.month && story === i && monthMoved ? `<p class="muted">${esc(t(D.ui.monthMoved))}</p>` : ''}
      ${s.era ? `<h3>${esc(t(D.era.title))}</h3>${eraTable()}` : ''}
      ${links}${outputs}
      <nav class="story-nav">${i > 0 ? `<button type="button" data-stop="${i - 1}">← ${esc(t(D.ui.prev))}</button>` : '<span></span>'}${i < n - 1 ? `<button type="button" class="next" data-stop="${i + 1}">${esc(t(D.ui.next))} →</button>` : `<button type="button" class="next end">${esc(t(D.ui.end))}</button>`}</nav>
      <details class="src"><summary>${esc(t(D.ui.sources))}</summary><ul>${srcList(srcIds)}</ul></details>`;
    wireCard();
  }
  let monthMoved = false;
  function openStory(i) {
    i = Math.max(0, Math.min(D.story.length - 1, i));
    if (bird) setBird(false);
    selected = null; eraOpen = false;
    labelEls.forEach((el) => el.classList.remove('on'));
    story = i;
    const s = D.story[i];
    monthMoved = false;
    if (s.month && (month < 2 || month > 8)) { stopPlay(); setMonth(s.month); monthMoved = true; }
    renderStory(i);
    $('#card').hidden = false;
    $('#card').scrollTop = 0;
    document.body.classList.add('has-card');
    $('#t-story').setAttribute('aria-pressed', 'true');
    cardShift();
    renderList();
    showThread(i);
    batanesTag.o.visible = s.id === 'from';
    marketTag.o.visible = !!s.era;
    moveTo(storyView(i));
    updateUrl();
    hideHint();
  }
  function renderEra() {
    const srcIds = new Set(D.era.items.flatMap((r) => r.src));
    $('#card-body').innerHTML = `<p class="eyebrow">${esc(t(D.ui.era))}</p>
      <h2 id="card-title">${esc(t(D.era.title))}</h2>
      <p class="summary">${esc(t(D.era.lead))}</p>
      ${eraTable()}
      <p class="links"><button type="button" class="crumb" data-stop="3">${esc(t(D.ui.story))}・${esc(t(D.story[3].title))}</button></p>
      <details class="src"><summary>${esc(t(D.ui.sources))}</summary><ul>${srcList(srcIds)}</ul></details>`;
    wireCard();
  }
  function openEra() {
    if (bird) setBird(false);
    leaveModes();
    selected = null; eraOpen = true;
    labelEls.forEach((el) => el.classList.remove('on'));
    renderEra();
    $('#card').hidden = false;
    $('#card').scrollTop = 0;
    document.body.classList.add('has-card');
    cardShift();
    renderList();
    marketTag.o.visible = true;
    moveTo(look(market.centre(era), market.seaward, 6.2, 0.62));
    updateUrl();
    hideHint();
  }
  function setEra(e) {
    era = e;
    market.set(era);
    crowd.sync();
    marketTag.o.position.copy(market.centre(era).add(new THREE.Vector3(0, 0.35, 0)));
    $('#t-era').setAttribute('aria-pressed', String(era === 'past'));
    $('#t-era span').textContent = t(era === 'past' ? D.ui.eraPast : D.ui.era);
    if (eraOpen) { renderEra(); moveTo(look(market.centre(era), market.seaward, 6.2, 0.62)); }
    else if (story >= 0) renderStory(story);
    updateUrl();
    dirty = true;
  }
  // leaving the story or the then/now card: fold the thread away and hide their tags
  function leaveModes() {
    if (story >= 0) showThread(0, false);
    story = -1; eraOpen = false;
    batanesTag.o.visible = marketTag.o.visible = false;
    $('#t-story').setAttribute('aria-pressed', 'false');
  }
  function applyLang() {
    document.documentElement.lang = lang === 'en' ? 'en' : 'zh-Hant';
    document.documentElement.dataset.lang = lang;
    document.title = `${t(D.meta.title)}｜Avaka`;
    $('#title').textContent = t(D.meta.title);
    $('#subtitle').textContent = t(D.meta.subtitle);
    $('#map-note').textContent = t(D.meta.mapNote);
    $('#ev-note').innerHTML = `${['obs', 'oral', 'lit', 'infer'].map((k) => evTags([k])).join('')}<span>${esc(t(D.ui.evLegend))}</span>`;
    $('#list-title').textContent = t(D.ui.places);
    $('#vlist-title').textContent = t(D.ui.villages);
    $('#home span').textContent = t(D.ui.overview);
    $('#back span').textContent = t(D.ui.back);
    $('#lang').textContent = lang === 'en' ? '中文' : 'EN';
    $('#t-names span').textContent = t(D.ui.names); $('#t-people span').textContent = t(D.ui.people); $('#t-bird span').textContent = t(D.ui.bird);
    $('#t-help').setAttribute('aria-label', t(D.ui.help));
    if (!$('#intro').hidden) showIntro(introStep);
    $('#card-close').setAttribute('aria-label', t(D.ui.close));
    $('#hint').textContent = t(D.ui.hint);
    renderer.domElement.setAttribute('aria-label', t(D.ui.canvas));
    labelEls.forEach((el, id) => {
      const it = items.get(id), span = el.querySelector('span');
      if (it.kind === 'village') span.innerHTML = lang === 'en' ? `${esc(it.tao)}<small>${esc(it.zh)}</small>` : `${esc(it.zh)}<small>${esc(it.tao)}</small>`;
      else span.textContent = t(it.name);
    });
    roadTags.forEach((r) => (r.el.textContent = t(r.name)));
    walker.tagEl.textContent = t(D.ui.walker);
    $('#month-note').textContent = t(D.ui.monthNote);
    renderMonths();
    labelEls.forEach((el, id) => { const c = months.get(month).closed?.[id], b = el.querySelector('em.badge'); if (b && c) b.textContent = t(c); });
    renderList();
    if (selected) renderCard(selected);
    else if (story >= 0) renderStory(story);
    else if (eraOpen) renderEra();
    $('#t-story span').textContent = t(D.ui.story);
    $('#t-era span').textContent = t(era === 'past' ? D.ui.eraPast : D.ui.era);
    batanesTag.el.textContent = t(D.ui.batanes);
    marketTag.el.textContent = t(D.ui.market);
  }
  function hideHint() { $('#hint').classList.add('gone'); }

  $('#home').onclick = () => { closeCard(); if (bird) setBird(false); moveTo(overview()); };
  // ---------- toolbar: names, people, top view ----------
  let bird = false;
  const setTog = (el, on) => el.setAttribute('aria-pressed', String(on));
  $('#t-names').onclick = (e) => { const on = e.currentTarget.getAttribute('aria-pressed') !== 'true'; setTog(e.currentTarget, on); labels.domElement.classList.toggle('off', !on); };
  $('#t-people').onclick = (e) => {
    const on = e.currentTarget.getAttribute('aria-pressed') !== 'true';
    setTog(e.currentTarget, on);
    [...peds, ...goats].forEach((o) => (o.g.visible = on));
    traffic.forEach((c) => (c.g.visible = on));
    crowd.sync(); dirty = true;
  };
  function setBird(on) {
    bird = on;
    setTog($('#t-bird'), on);
    controls.minPolarAngle = on ? 0.02 : THREE.MathUtils.degToRad(14);
    const tgt = selected ? focus[selected].clone() : center.clone();
    const d = selected ? 7 : stage.clientWidth / stage.clientHeight < 0.8 ? 70 : 34;
    moveTo(on ? { pos: tgt.clone().add(new THREE.Vector3(0.001, d, 0.01)), target: tgt } : selected ? viewFor(selected) : overview());
  }
  $('#t-bird').onclick = () => setBird(!bird);
  $('#t-story').onclick = () => (story >= 0 ? closeCard() : openStory(0));
  $('#t-era').onclick = () => { setEra(era === 'past' ? 'now' : 'past'); if (!eraOpen) openEra(); };
  // ---------- first-visit intro (remembered; ? replays it) ----------
  let introStep = 0;
  function showIntro(step = 0) {
    introStep = step;
    const s = D.ui.intro[step];
    $('#intro-count').textContent = `${step + 1} / ${D.ui.intro.length}`;
    $('#intro-title').textContent = t(s.title);
    $('#intro-body').textContent = t(s.body);
    $('#intro-next').textContent = t(step === D.ui.intro.length - 1 ? D.ui.introDone : D.ui.introNext);
    $('#intro-skip').textContent = t(D.ui.introSkip);
    $('#intro').hidden = false;
    $('#intro-next').focus();
  }
  function closeIntro() { $('#intro').hidden = true; store.set('avaka_island_intro', '1'); renderer.domElement.focus(); }
  $('#intro-next').onclick = () => (introStep >= D.ui.intro.length - 1 ? closeIntro() : showIntro(introStep + 1));
  $('#intro-skip').onclick = closeIntro;
  $('#t-help').onclick = () => showIntro(0);
  document.addEventListener('keydown', (e) => {
    if ($('#intro').hidden) return;
    if (e.key === 'Escape') closeIntro();
    if (e.key === 'Tab') { e.preventDefault(); (document.activeElement === $('#intro-next') ? $('#intro-skip') : $('#intro-next')).focus(); }
  });
  $('#lang').onclick = () => { lang = lang === 'en' ? 'zh' : 'en'; store.set('avaka_lang', lang); applyLang(); };
  $('#card-close').onclick = closeCard;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && selected) closeCard(); });

  // tap on the island: only a short press without dragging counts as a click
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  let down = null, touched = false;
  const toNdc = (e) => { const r = renderer.domElement.getBoundingClientRect(); ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); };
  const pick = () => {
    ray.setFromCamera(ndc, camera);
    const hits = ray.intersectObjects(pickables, false).filter((h) => labelObjs.get(h.object.userData.id).visible);
    hits.sort((a, b) => PRIORITY[b.object.userData.kind] - PRIORITY[a.object.userData.kind] || a.distance - b.distance);
    return hits[0];
  };
  renderer.domElement.addEventListener('pointerdown', (e) => { down = { x: e.clientX, y: e.clientY }; fly = null; touched = true; hideHint(); });
  renderer.domElement.addEventListener('pointerup', (e) => {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) return;
    toNdc(e);
    ray.setFromCamera(ndc, camera);
    const ph = ray.intersectObjects(pedHits, false)[0];
    if (ph) { sayHello(ph.object.userData.ped); dirty = true; return; }
    const hit = pick();
    if (hit) select(hit.object.userData.id);
  });
  if (matchMedia('(hover: hover)').matches)
    renderer.domElement.addEventListener('pointermove', (e) => {
      if (e.buttons) return;
      toNdc(e);
      ray.setFromCamera(ndc, camera);
      const ph = ray.intersectObjects(pedHits, false)[0];
      renderer.domElement.style.cursor = ph || pick() ? 'pointer' : '';
      renderer.domElement.title = ph ? t(D.ui.pedHint) : '';
    });
  renderer.domElement.addEventListener('keydown', (e) => {
    const k = { ArrowLeft: [0.12, 0], ArrowRight: [-0.12, 0], ArrowUp: [0, -0.08], ArrowDown: [0, 0.08] }[e.key];
    if (!k) return;
    e.preventDefault();
    const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    s.theta += k[0];
    s.phi = Math.min(controls.maxPolarAngle, Math.max(controls.minPolarAngle, s.phi + k[1]));
    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(s));
    controls.update();
  });
  controls.addEventListener('change', () => (dirty = true));

  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    labels.setSize(w, h);
    cardShift();
    applyShift();
    dirty = true;
  }
  new ResizeObserver(() => {
    resize();
    if (!touched && !selected && !fly) { const v = overview(); camera.position.copy(v.pos); controls.target.copy(v.target); controls.update(); }
  }).observe(stage);

  // which labels show: villages from afar, steps only up close, and nothing that overlaps a more important label
  function updateLabels() {
    const dist = camera.position.distanceTo(controls.target);
    const sel = selected && items.get(selected);
    const selPlace = sel && (sel.kind === 'step' ? sel.place : sel.id);
    for (const [id, o] of labelObjs) {
      const k = o.userData.kind;
      let vis = true;
      if (k === 'step') vis = dist < 15 || selPlace === items.get(id).place;
      if (k === 'village') vis = dist > 4.5 || selected === id;
      if (k === 'site') vis = dist < 60 || selected === id;
      o.visible = vis;
      labelEls.get(id).classList.remove('culled');
    }
    for (const r of roadTags) { r.o.visible = dist < 70; r.el.classList.remove('culled'); }
    walker.tag.visible = dist < 14;
    const shown = [...labelObjs.values(), ...roadTags.map((r) => r.o)].filter((o) => o.visible)
      .map((o) => ({ el: labelEls.get(o.userData.id) || o.element, p: PRIORITY[o.userData.kind] + (o.userData.id === 'beach' ? 0.5 : 0) + (o.userData.id === selected ? 10 : 0) }))
      .sort((a, b) => b.p - a.p);
    // a label that collides is first nudged below the one in its way; only if it still collides is it hidden
    const kept = [];
    const hits = (r, dy) => kept.find((q) => r.left < q.right + 4 && r.right > q.left - 4 && r.top + dy < q.bottom + 2 && r.bottom + dy > q.top - 2);
    for (const s of shown) {
      s.el.style.marginTop = '';
      const r = s.el.getBoundingClientRect();
      if (!r.width) continue;
      let dy = 0, q = hits(r, 0);
      if (q) { dy = q.bottom + 4 - r.top; if (dy > 70 || hits(r, dy)) { s.el.classList.add('culled'); continue; } s.el.style.marginTop = dy + 'px'; }
      kept.push({ left: r.left, right: r.right, top: r.top + dy, bottom: r.bottom + dy });
    }
  }

  // ---------- loop ----------
  const clock = new THREE.Clock();
  let time = 0, frameNo = 0;
  // frame-rate watch: if the page stays under 30 fps, step the quality down (sharpness, then shadows, then fewer movers)
  const perf = { fps: 0, frames: 0, since: performance.now(), slow: 0, level: 0 };
  function degrade() {
    perf.level++;
    if (perf.level === 1) renderer.setPixelRatio(Math.max(1, renderer.getPixelRatio() * 0.7));
    else if (perf.level === 2) { env.sun.castShadow = false; renderer.shadowMap.enabled = false; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); }
    else if (perf.level === 3) {
      [...peds.filter((_, i) => i % 2), ...traffic.filter((_, i) => i % 2).map((c) => ({ g: c.g })), ...goats.filter((_, i) => i % 2)].forEach((o) => (o.g.visible = false));
      crowd.sync();
    } else if (perf.level === 4) renderer.setPixelRatio(1);
    resize();
  }
  function watchFps(now) {
    perf.frames++;
    if (now - perf.since < 3000) return;
    perf.fps = Math.round((perf.frames * 1000) / (now - perf.since));
    perf.frames = 0; perf.since = now;
    if (document.hidden || reduced.matches) return;
    perf.slow = perf.fps < 30 ? perf.slow + 1 : 0;
    if (perf.slow >= 2 && perf.level < 4) { perf.slow = 0; degrade(); }
  }
  function frame() {
    requestAnimationFrame(frame);
    watchFps(performance.now());
    const dt = Math.min(0.05, clock.getDelta());
    if (fly) {
      const k = Math.min(1, (performance.now() - fly.t0) / 1100), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      camera.position.lerpVectors(fly.from, fly.to, e);
      controls.target.lerpVectors(fly.old, fly.target, e);
      if (k === 1) fly = null;
      dirty = true;
    }
    if (stepThread(dt)) dirty = true;
    if (shift.distanceTo(shiftGoal) > 0.5) {
      shift.lerp(shiftGoal, reduced.matches ? 1 : Math.min(1, dt * 7));
      applyShift();
      dirty = true;
    }
    if (reduced.matches && env.update(time, dt, false)) dirty = true;
    if (reduced.matches && peds.some((p) => p.act > 0)) { time += dt; movePeople(dt, time, false); crowd.sync(); dirty = true; }
    if (!reduced.matches && !document.hidden) {
      time += dt;
      env.uniforms.uTime.value = time;
      env.update(time, dt);
      walker.update(dt, time);
      moveTraffic(dt, time);
      movePeople(dt, time, true);
      crowd.sync(); M.syncBoats();
      for (const b of fleet) {
        const a = b.ph + time * b.sp;
        b.m.position.set(b.cx + Math.cos(a) * b.r, -0.035 + Math.sin(time * 1.3 + b.ph) * 0.01, b.cz + Math.sin(a) * b.r * 0.6);
        b.m.rotation.y = Math.atan2(-Math.sin(a), Math.cos(a) * 0.6) + Math.PI / 2;
      }
      dirty = true;
    }
    controls.update();
    if (dirty) {
      renderer.render(scene, camera);
      labels.render(scene, camera);
      if (frameNo++ % 6 === 0) updateLabels();
      dirty = false;
    }
  }

  setMonth(month, { instant: true });
  applyLang();
  resize();
  const start = overview();
  camera.position.copy(start.pos);
  controls.target.copy(start.target);
  controls.update();
  frame();
  $('#loading').hidden = true;
  document.body.classList.add('ready');
  market.set(era); crowd.sync();
  const f = params.get('focus'), st = parseInt(params.get('story'), 10);
  if (era === 'past') setEra('past');
  if (items.has(f)) select(f, { silent: true });
  else if (st >= 1 && st <= D.story.length) openStory(st - 1);
  else if (params.get('view') === 'era') openEra();
  else if (!store.get('avaka_island_intro')) showIntro(0);
  // debugging hook for screenshots and tests
  window.avakaIsland = { openStory, openEra, setEra, perf, degrade, select, setMonth, hello: (n = 6, dur = 3.6) => peds.slice(0, n).forEach((p) => sayHello(p, dur)), overview: () => moveTo(overview()), quality, stats: () => renderer.info.render, camera, leaves: plants.count() };
} catch (err) {
  console.error(err);
  const msg = lang === 'en' ? 'The island could not load. Please refresh the page.' : '島嶼載入失敗，請重新整理頁面。';
  $('#loading').innerHTML = `<p>${msg}</p><p class="err">${esc(err.message)}</p>`;
}
