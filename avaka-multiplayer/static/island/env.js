// Sky, sun, sea, clouds, mist and rain. Decorative only: the twelve looks below are a visual mood for each
// month of the game, not weather records. setMonth() eases everything toward a month's look.
import { mulberry } from './world.js';   // no version here: the import map in index.html adds it

// per month: sky top, horizon, sun colour and strength, sky light strength, fog near/far, shallow/deep sea,
// mist on the mountains (0–1), rain (0–1), cloud tint, how high the sun stands
// Most months are softened toward the page's cream paper (see setMonth). Four are left bold, so a year on the
// island has moments to remember: 2 the mountains shut in mist, 3 dusk with torches out at sea (the night
// calendar on this page has torch fishing begin in month 2), 5 the plum rains, 10 a low amber sun and long shadows.
// bold: 0 soft … 1 as written here. amb: the colour of the light from the sky. dusk: 0–1, stars and torches.
const LOOKS = {
  1: { top: 0x8db7d4, hor: 0xe3e8e4, sun: 0xfff2e0, sunI: 2.4, hemi: 1.1, fog: [60, 240], shallow: 0x5cc0c2, deep: 0x2b759c, mist: 0.15, rain: 0, cloud: 0xffffff, sunY: 0.5 },
  2: { top: 0x8e9ca6, hor: 0xcfd5d4, sun: 0xe8ecf0, sunI: 1.25, hemi: 1.0, fog: [22, 120], shallow: 0x6aa7a8, deep: 0x335f78, mist: 1.0, rain: 0.1, cloud: 0xd6dadb, sunY: 0.45, bold: 0.8, amb: 0xe6ecee },
  3: { top: 0x2f4478, hor: 0xf2a877, sun: 0xffa868, sunI: 1.8, hemi: 0.95, fog: [70, 260], shallow: 0x58a4ae, deep: 0x346a98, mist: 0.1, rain: 0, cloud: 0xe9a58c, sunY: 0.14, bold: 1, amb: 0x93a6dc, dusk: 1 },
  4: { top: 0x72b2e2, hor: 0xeff0e6, sun: 0xfff0d6, sunI: 2.8, hemi: 1.15, fog: [70, 260], shallow: 0x58c8c6, deep: 0x2a7ca6, mist: 0.08, rain: 0, cloud: 0xffffff, sunY: 0.68 },
  5: { top: 0x6c7a82, hor: 0xb3bcba, sun: 0xdfe6e6, sunI: 0.85, hemi: 0.85, fog: [22, 115], shallow: 0x5f9896, deep: 0x30586a, mist: 0.6, rain: 1, cloud: 0xaab2b4, sunY: 0.6, bold: 0.85, amb: 0xdfe7ea },
  6: { top: 0x6fb2e6, hor: 0xf1f0e6, sun: 0xfff4dc, sunI: 3.0, hemi: 1.2, fog: [80, 280], shallow: 0x52cac8, deep: 0x2580ac, mist: 0.05, rain: 0, cloud: 0xffffff, sunY: 0.75 },
  7: { top: 0x68acdf, hor: 0xf3efe2, sun: 0xfff2d4, sunI: 3.0, hemi: 1.2, fog: [80, 280], shallow: 0x50c8c6, deep: 0x2480ae, mist: 0.05, rain: 0, cloud: 0xffffff, sunY: 0.78 },
  8: { top: 0x7eb4d8, hor: 0xf3e6cf, sun: 0xffe2b8, sunI: 2.7, hemi: 1.1, fog: [70, 260], shallow: 0x58c2c0, deep: 0x2a789e, mist: 0.08, rain: 0, cloud: 0xfff8ee, sunY: 0.66 },
  9: { top: 0x86b2d2, hor: 0xf0e2cc, sun: 0xffdcb0, sunI: 2.5, hemi: 1.05, fog: [65, 250], shallow: 0x5cbcbc, deep: 0x2c7298, mist: 0.12, rain: 0, cloud: 0xfff4e6, sunY: 0.58 },
  10: { top: 0x55668c, hor: 0xdcb596, sun: 0xffb074, sunI: 2.2, hemi: 0.82, fog: [45, 190], shallow: 0x5a98a0, deep: 0x2b5274, mist: 0.3, rain: 0, cloud: 0xe2c2ae, sunY: 0.2, bold: 0.85, amb: 0xd9cfd6 },
  11: { top: 0x7fa6c8, hor: 0xeedac4, sun: 0xffd2a0, sunI: 2.2, hemi: 1.0, fog: [60, 240], shallow: 0x5cb6b8, deep: 0x2c6e92, mist: 0.2, rain: 0, cloud: 0xfff0e2, sunY: 0.44 },
  12: { top: 0x8aa9c4, hor: 0xf1d9bd, sun: 0xffcf9c, sunI: 2.0, hemi: 1.0, fog: [60, 240], shallow: 0x5cb2b6, deep: 0x2c6a8e, mist: 0.18, rain: 0, cloud: 0xfff0e0, sunY: 0.4 },
};

export function createEnv(THREE, scene, { quality, shore, peaks = [] }) {
  const env = { uniforms: { uTime: { value: 0 } } };
  const C = (h) => new THREE.Color(h);
  // what is on screen now, and what it is easing toward
  const cur = { top: C(0x8db7d4), hor: C(0xe3e8e4), sun: C(0xfff2e0), sunI: 2.4, hemi: 1.1, near: 60, far: 240, shallow: C(0x5cc6c6), deep: C(0x2b7aa2), mist: 0.1, rain: 0, cloud: C(0xffffff), sunY: 0.6, amb: C(0xfdf7ea), dusk: 0 };
  let goal = null;

  // sky dome: horizon haze to clear blue, with a soft glow around the sun
  const sunDir = new THREE.Vector3(-0.55, 0.62, 0.56).normalize();
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTop: { value: cur.top }, uHorizon: { value: cur.hor }, uSun: { value: sunDir }, uSunCol: { value: cur.sun }, uDusk: { value: 0 } },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform vec3 uTop, uHorizon, uSun, uSunCol; uniform float uDusk; varying vec3 vDir;
      void main(){
        float h = clamp(vDir.y, 0.0, 1.0);
        vec3 col = mix(uHorizon, uTop, pow(smoothstep(0.0, 0.6, h), 0.8));
        float s = max(dot(vDir, uSun), 0.0);
        col += uSunCol * (pow(s, 24.0) * 0.35 + pow(s, 4.0) * 0.06);
        if (uDusk > 0.01) {   // the first stars, high in the sky
          vec2 g = vec2(atan(vDir.z, vDir.x) * 38.0, vDir.y * 60.0), c = floor(g);
          float r = fract(sin(dot(c, vec2(127.1, 311.7))) * 43758.5453);
          float star = step(0.955, r) * smoothstep(0.32, 0.0, length(fract(g) - 0.5));
          col += vec3(1.0, 0.96, 0.88) * star * uDusk * smoothstep(0.18, 0.6, h) * 0.8;
        }
        gl_FragColor = vec4(col, 1.0);
      }`,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(320, 32, 16), skyMat);
  sky.renderOrder = -10;
  scene.add(sky);
  scene.fog = new THREE.Fog(cur.hor.clone(), cur.near, cur.far);

  // light: open sky above, warm earth below, one sun that casts the shadows
  const hemi = new THREE.HemisphereLight(0xfdf7ea, 0xb8a37e, cur.hemi); // warm ground bounce lifts the shadows
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(cur.sun, cur.sunI);
  sun.castShadow = quality !== 'low';
  const sm = quality === 'high' ? 2048 : 1024;
  sun.shadow.mapSize.set(sm, sm);
  Object.assign(sun.shadow.camera, { left: -19, right: 19, top: 19, bottom: -19, near: 5, far: 110 });
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.03;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight(0xfff0dc, 0.45);
  fill.position.set(30, 20, -25);
  scene.add(fill);
  const placeSun = () => {
    sunDir.set(-0.55, cur.sunY, 0.56).normalize();
    sun.position.copy(sunDir).multiplyScalar(45);
  };
  placeSun();

  // the sea: see-through near the shore so the reef shows, with a foam line that breathes
  const seaMat = new THREE.ShaderMaterial({
    transparent: true, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      uTime: { value: 0 }, uShore: { value: null }, uBox: { value: new THREE.Vector4(shore.box.x, shore.box.z, shore.box.w, shore.box.d) },
      uShallow: { value: cur.shallow.clone() }, uDeep: { value: cur.deep.clone() }, uFar: { value: C(0x3d86a8) }, uRain: { value: 0 },
      uWind: { value: new THREE.Vector2(0, 0) }, uChop: { value: 0 },
      uSunDir: { value: sunDir }, uSunCol: { value: cur.sun }, uSkyHor: { value: cur.hor }, uSkyTop: { value: cur.top },
    }]),
    defines: quality === 'low' ? {} : { SHINE: 1 },   // the lowest setting keeps the plain sea
    vertexShader: `#include <fog_pars_vertex>
      varying vec3 vW;
      void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;
      #include <fog_vertex>
      }`,
    fragmentShader: `#include <fog_pars_fragment>
      uniform float uTime, uRain, uChop; uniform vec2 uWind; uniform sampler2D uShore; uniform vec4 uBox; uniform vec3 uShallow, uDeep, uFar; varying vec3 vW;
      uniform vec3 uSunDir, uSunCol, uSkyHor, uSkyTop;
      // slope of a few crossing swells (their heights are never drawn; only how they tilt the surface matters)
      vec2 swell(vec2 p, float t){
        vec2 g = vec2(0.0);
        g += 0.050 * vec2( 0.9,  0.4) * cos(p.x *  0.9 + p.y *  0.4 + t * 0.9);
        g += 0.045 * vec2(-0.5,  1.1) * cos(p.x * -0.5 + p.y *  1.1 + t * 0.7);
        g += 0.016 * vec2( 2.3, -1.7) * cos(p.x *  2.3 + p.y * -1.7 + t * 1.6);
        g += 0.010 * vec2(-3.1, -2.2) * cos(p.x * -3.1 + p.y * -2.2 + t * 2.1);
        return g;
      }
      void main(){
        vec2 uv = (vW.xz - uBox.xy) / uBox.zw;
        float inBox = step(0.0, uv.x) * step(uv.x, 1.0) * step(0.0, uv.y) * step(uv.y, 1.0);
        float d = mix(-4.0, texture2D(uShore, clamp(uv, 0.0, 1.0)).r * 8.0 - 4.0, inBox);   // distance to shore, negative at sea
        float off = smoothstep(-0.1, -3.5, d);
        vec3 col = mix(uShallow, uDeep, off);
        col = mix(col, uFar, smoothstep(30.0, 90.0, length(vW.xz)));
        float w1 = sin(vW.x * 0.45 + uTime * 0.5 + sin(vW.z * 0.3)) * sin(vW.z * 0.38 - uTime * 0.4);
        float w2 = sin((vW.x + vW.z * 0.7) * 1.6 + uTime * 0.9) * sin(vW.x * 1.1 - vW.z * 0.5 - uTime * 0.3);
        float aa = clamp(1.0 - fwidth(w2) * 2.5, 0.0, 1.0);
        col += w1 * 0.02 + smoothstep(0.95, 1.0, w2 * 0.5 + 0.5) * 0.06 * aa * (1.0 - uRain) * (1.0 - smoothstep(10.0, 40.0, length(vW.xz)));
        // monsoon whitecaps: a few more on the windward side of the island (the side the wind comes from)
        float r = length(vW.xz);
        float windward = smoothstep(0.15, 0.7, dot(vW.xz / max(r, 0.001), -uWind));
        float w3 = sin(dot(vW.xz, vec2(1.7, 1.1)) * 1.9 - uTime * 1.3) * sin(dot(vW.xz, vec2(-0.9, 1.6)) * 2.3 + uTime * 0.8);
        float patchy = sin(vW.x * 0.37 + uTime * 0.2 + sin(vW.z * 0.5) * 2.0) * sin(vW.z * 0.29 - uTime * 0.15 + sin(vW.x * 0.41) * 1.7) * 0.5 + 0.5;
        float caps = smoothstep(0.86, 0.98, w3) * smoothstep(0.45, 0.85, patchy) * clamp(1.0 - fwidth(w3) * 2.0, 0.0, 1.0);   // patchy, not a grid
        col = mix(col, vec3(0.97, 0.98, 0.95), caps * uChop * windward * smoothstep(6.0, 10.0, r) * (1.0 - smoothstep(26.0, 44.0, r)) * 0.85);
        #ifdef SHINE
        {
          vec3 V = normalize(cameraPosition - vW);
          float distV = length(cameraPosition - vW);
          vec2 sl = swell(vW.xz, uTime) * (1.0 - smoothstep(60.0, 160.0, distV));   // far water goes flat, so it does not shimmer
          vec3 N = normalize(vec3(-sl.x, 1.0, -sl.y));
          // the sea mirrors the sky more the flatter you look at it
          float fres = 0.02 + 0.98 * pow(1.0 - max(dot(N, V), 0.0), 5.0);
          vec3 R = reflect(-V, N);
          vec3 skyCol = mix(uSkyHor, uSkyTop, pow(smoothstep(0.0, 0.6, clamp(R.y, 0.0, 1.0)), 0.8));
          col = mix(col, skyCol, clamp(fres, 0.0, 1.0) * 0.75 * off);
          // the sun's path on the water, broken into sparks that come and go
          vec3 H = normalize(V + uSunDir);
          float path = pow(max(dot(N, H), 0.0), 90.0);
          vec2 cell = floor(vW.xz * 7.0);
          float tw = fract(sin(dot(cell, vec2(127.1, 311.7))) * 43758.5453 + uTime * 0.6);
          float fine = clamp(1.0 - fwidth(vW.x) * 7.0, 0.0, 1.0);          // cells smaller than a pixel become an even glow
          float spark = mix(0.5, 0.25 + 1.6 * smoothstep(0.8, 1.0, tw), fine);
          col += uSunCol * path * spark * 0.6 * (1.0 - uRain) * off;
          // light dancing on the bottom of the shallows
          float sh = smoothstep(-1.8, -0.25, d) * (1.0 - smoothstep(-0.25, -0.05, d));
          float ca = sin(vW.x * 6.1 + uTime * 1.2 + sin(vW.z * 4.3 + uTime * 0.7) * 1.4) * sin(vW.z * 5.7 - uTime * 1.0 + sin(vW.x * 3.9) * 1.3);
          col += smoothstep(0.55, 1.0, ca) * 0.09 * sh * (1.0 - uRain) * clamp(1.0 - fwidth(ca) * 2.0, 0.0, 1.0);
        }
        #endif
        float band = sin(d * 9.0 + uTime * 1.6) * 0.5 + 0.5;
        float foam = smoothstep(-0.45, -0.08, d) * (1.0 - smoothstep(-0.08, 0.05, d)) * (0.45 + 0.55 * band);
        foam += smoothstep(-0.1, -0.01, d) * 0.6;
        col = mix(col, vec3(0.97, 0.98, 0.95), clamp(foam, 0.0, 0.85));
        float alpha = mix(0.42, 1.0, smoothstep(-0.05, -2.6, d));
        alpha = max(alpha, clamp(foam, 0.0, 0.85));
        gl_FragColor = vec4(col, alpha);
        #include <fog_fragment>
      }`,
  });
  seaMat.uniforms.uShore.value = shore.tex;
  const sea = new THREE.Mesh(new THREE.CircleGeometry(300, 96), seaMat);
  sea.rotation.x = -Math.PI / 2;
  sea.renderOrder = 1;
  scene.add(sea);

  // slow cumulus clouds, low enough to throw moving shadows over the island
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true, emissive: 0xf4f2ea, emissiveIntensity: 0.35 });
  const cloudGeo = new THREE.IcosahedronGeometry(1, 1);
  const rnd = mulberry(23), clouds = new THREE.Group();
  for (let k = 0; k < 9; k++) {
    const g = new THREE.Group(), lobes = 3 + Math.floor(rnd() * 3);
    for (let i = 0; i < lobes; i++) {
      const m = new THREE.Mesh(cloudGeo, cloudMat), s = 0.6 + rnd() * 0.8;
      m.scale.set(s * 1.4, s * 0.8, s);
      m.position.set((i - lobes / 2) * 1.3 + rnd() * 0.5, rnd() * 0.5, (rnd() - 0.5) * 1.2);
      m.castShadow = quality === 'high';
      g.add(m);
    }
    const a = (k / 9) * Math.PI * 2 + rnd() * 0.5, r = 16 + rnd() * 30;
    g.position.set(Math.cos(a) * r, 15 + rnd() * 4, Math.sin(a) * r);
    g.userData = { a, r, speed: 0.006 + rnd() * 0.006 };
    clouds.add(g);
  }
  scene.add(clouds);

  // mist that settles on the mountains (thick in the closed month, thin otherwise)
  // soft round puffs drawn once on a canvas, used as camera-facing sprites
  const puff = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d'), grad = g.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(255,255,255,0.9)'); grad.addColorStop(0.45, 'rgba(255,255,255,0.45)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const mistMat = new THREE.SpriteMaterial({ map: puff, color: 0xf2f4f2, transparent: true, opacity: 0, depthWrite: false, fog: true });
  const mist = new THREE.Group();
  for (const p of peaks) {
    for (let i = 0; i < 9; i++) {
      const m = new THREE.Sprite(mistMat), sc = 2.4 + rnd() * 2.4;
      m.scale.set(sc * 1.6, sc * 0.7, 1);
      m.position.set(p.x + (rnd() - 0.5) * 3, p.y * (0.45 + rnd() * 0.5), p.z + (rnd() - 0.5) * 3);
      m.userData.ph = rnd() * 6;
      mist.add(m);
    }
  }
  mist.renderOrder = 2;
  scene.add(mist);

  // rain: short falling streaks in a column over the island
  const N = quality === 'high' ? 2600 : quality === 'medium' ? 1300 : 600;
  const rainPos = new Float32Array(N * 6), speed = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const x = (rnd() - 0.5) * 34, z = (rnd() - 0.5) * 30, y = rnd() * 16;
    rainPos.set([x, y, z, x + 0.03, y - 0.35, z + 0.02], i * 6);
    speed[i] = 9 + rnd() * 5;
  }
  const rainGeo = new THREE.BufferGeometry();
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rainMat = new THREE.LineBasicMaterial({ color: 0xdfe8ee, transparent: true, opacity: 0, depthWrite: false });
  const rain = new THREE.LineSegments(rainGeo, rainMat);
  rain.frustumCulled = false;
  scene.add(rain);

  // soft, high-key look: every month's colours are pulled toward the page's cream paper, the sun is gentler
  // and the sky light stronger (low contrast, soft shadows), and weather effects stay mild
  const PAPER = C(0xf6f1e4), soft = (hex, k) => C(hex).lerp(PAPER, k);
  env.setMonth = (n, instant = false) => {
    const L = LOOKS[n] || LOOKS[1], b = L.bold || 0, s = 1 - b;   // s: how much of the softening this month gets
    goal = { top: soft(L.top, 0.28 * s), hor: soft(L.hor, 0.35 * s), sun: soft(L.sun, 0.15 * s), sunI: L.sunI * (0.8 + 0.2 * b), hemi: L.hemi * (1.35 - 0.35 * b),
      near: L.fog[0] * (1.15 - 0.15 * b), far: L.fog[1], shallow: soft(L.shallow, 0.18 * s), deep: C(L.deep).lerp(C(0x86cbd6), 0.5 * s),
      mist: L.mist * (0.6 + 0.4 * b), rain: L.rain * (0.7 + 0.3 * b), cloud: soft(L.cloud, 0.1 * s), sunY: L.sunY, amb: C(L.amb || 0xfdf7ea), dusk: L.dusk || 0 };
    if (instant) step(1);
  };
  env.dusk = () => cur.dusk;
  function step(k) {
    if (!goal) return false;
    for (const key of ['top', 'hor', 'sun', 'shallow', 'deep', 'cloud', 'amb']) cur[key].lerp(goal[key], k);
    for (const key of ['sunI', 'hemi', 'near', 'far', 'mist', 'rain', 'sunY', 'dusk']) cur[key] += (goal[key] - cur[key]) * k;
    sun.color.copy(cur.sun); sun.intensity = cur.sunI; hemi.intensity = cur.hemi; hemi.color.copy(cur.amb);
    skyMat.uniforms.uDusk.value = cur.dusk;
    fill.intensity = 0.45 * (1 - 0.7 * cur.dusk);
    scene.fog.color.copy(cur.hor); scene.fog.near = cur.near; scene.fog.far = cur.far;
    seaMat.uniforms.uShallow.value.copy(cur.shallow); seaMat.uniforms.uDeep.value.copy(cur.deep);
    seaMat.uniforms.uFar.value.copy(cur.deep).lerp(cur.hor, 0.4); // open sea fades toward the paler horizon
    seaMat.uniforms.uRain.value = cur.rain;
    cloudMat.color.copy(cur.cloud); cloudMat.emissive.copy(cur.cloud).multiplyScalar(0.95);
    mistMat.opacity = Math.min(0.75, cur.mist * 0.7);
    mist.visible = cur.mist > 0.02;
    rainMat.opacity = cur.rain * 0.7;
    rain.visible = cur.rain > 0.02;
    placeSun();
    // the sea's copy of the sun and the sky (merged uniforms are copies, so they are refreshed here)
    const U = seaMat.uniforms;
    U.uSunDir.value.copy(sunDir); U.uSunCol.value.copy(cur.sun).multiplyScalar(Math.min(1.1, cur.sunI / 2.2));
    U.uSkyHor.value.copy(cur.hor); U.uSkyTop.value.copy(cur.top);
    const done = Math.abs(goal.sunI - cur.sunI) < 0.005 && Math.abs(goal.mist - cur.mist) < 0.003 && Math.abs(goal.rain - cur.rain) < 0.003 && Math.abs(goal.sunY - cur.sunY) < 0.003 && Math.abs(goal.dusk - cur.dusk) < 0.005;
    if (done) goal = null;
    return true;
  }

  // returns true while a month change is still easing in, so the page keeps drawing
  env.update = (t, dt = 0.016, animate = true) => {
    const easing = step(Math.min(1, dt * 1.8));
    stepWind(Math.min(1, dt * 1.2));
    if (!animate) return easing;
    seaMat.uniforms.uTime.value = t;
    for (const g of clouds.children) {
      const a = g.userData.a + t * g.userData.speed;
      g.position.x = Math.cos(a) * g.userData.r;
      g.position.z = Math.sin(a) * g.userData.r;
    }
    for (const m of mist.children) m.position.y += Math.sin(t * 0.3 + m.userData.ph) * 0.0008;
    if (rain.visible) {
      for (let i = 0; i < N; i++) {
        const o = i * 6, dy = speed[i] * dt;
        let y = rainPos[o + 1] - dy;
        if (y < 0) y += 16;
        rainPos[o + 1] = y; rainPos[o + 4] = y - 0.35;
      }
      rainGeo.attributes.position.needsUpdate = true;
    }
    return easing;
  };
  // the monsoon on the sea (illustrative): wind direction (toward) and how choppy the windward side is
  const windGoal = { x: 0, z: 0, chop: 0 };
  env.setWind = (x, z, chop, instant = false) => {
    Object.assign(windGoal, { x, z, chop });
    if (instant) { seaMat.uniforms.uWind.value.set(x, z); seaMat.uniforms.uChop.value = chop; }
  };
  const stepWind = (k) => {
    const w = seaMat.uniforms.uWind.value;
    w.x += (windGoal.x - w.x) * k; w.y += (windGoal.z - w.y) * k;
    seaMat.uniforms.uChop.value += (windGoal.chop - seaMat.uniforms.uChop.value) * k;
  };
  env.sun = sun;
  return env;
}
