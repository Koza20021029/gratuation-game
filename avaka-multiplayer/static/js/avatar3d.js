/* avatar3d.js — Avaka 3D Character (Three.js, fully offline) */
let avatarScene, avatarCamera, avatarRenderer, avatarAnimId, avatarGroup, avatarComposer, avatarParticles;
let isDragging = false, prevMouse = {x:0,y:0}, rotY = 0.3, rotX = -0.05;
let targetHeadRotY = 0, targetHeadRotX = 0;

// Advanced Idle Rig Node References
let idleRig = { torso: null, shoulders: [], armGroups: [], pecs: [], abs: [] };

// Arm poses: extra rotation of each shoulder (sx forward/back, sz sideways-up) and elbow (ex, ez).
// Index 0 is the arm at x < 0, index 1 the arm at x > 0; sideways angles are mirrored per side in animate().
const POSES = {
    stand: [{}, {}],
    wave:  [{}, { sz: 2.35, ez: 0.55, wave: 0.38 }],
    hips:  [{ sz: 0.62, ez: -1.55, sx: 0.12 }, { sz: 0.62, ez: -1.55, sx: 0.12 }],
    cross: [{ sx: -0.70, sz: 0.04, ez: -2.18 }, { sx: -0.86, sz: 0.04, ez: -2.18 }],
    fist:  [{}, { sz: 2.75, ez: 0.35, sx: -0.1 }]
};
let currentBodySwing = 0; // tracks body sway for head coupling


const avatarState = {
    skin:'#A0622A', hair:'short', hairColor:'#0d0d0d',
    eye:'#2a1a08', face:'round', expression:'smile', pose:'stand', accessory:'none', cloth:'loincloth'
};

const C = (hex) => new THREE.Color(hex);

function initAvatar3D() {
    const canvas = document.getElementById('avatar-canvas');
    if (!canvas) return;
    const W = canvas.offsetWidth || 320, H = canvas.offsetHeight || 420;
    canvas.width = W * window.devicePixelRatio;
    canvas.height = H * window.devicePixelRatio;

    avatarScene = new THREE.Scene();
    avatarScene.background = new THREE.Color('#060d1a');
    avatarScene.fog = new THREE.Fog('#060d1a', 12, 30);

    avatarCamera = new THREE.PerspectiveCamera(44, W/H, 0.1, 100);
    avatarCamera.position.set(0, 0.8, 6.2);
    avatarCamera.lookAt(0, 0.5, 0);

    avatarRenderer = new THREE.WebGLRenderer({canvas, antialias:true});
    avatarRenderer.setPixelRatio(window.devicePixelRatio);
    avatarRenderer.setSize(W, H);
    avatarRenderer.shadowMap.enabled = true;
    avatarRenderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Premium Cinematic Studio Lighting (100% offline cross-platform safe)
    avatarScene.add(new THREE.AmbientLight(0xffeedd, 0.55));
    
    // Main sunlight key
    const sun = new THREE.DirectionalLight(0xfff5e0, 1.15);
    sun.position.set(3, 6, 5); sun.castShadow = true;
    sun.shadow.mapSize.width = 1024; sun.shadow.mapSize.height = 1024;
    avatarScene.add(sun);
    
    // Cool shadow fill
    const fill = new THREE.DirectionalLight(0x8899cc, 0.45);
    fill.position.set(-4, 2, -3); avatarScene.add(fill);
    
    // Vivid blue rim light from the rear
    const rim = new THREE.PointLight(0x38bdf8, 0.7, 18);
    rim.position.set(0, 4, -4); avatarScene.add(rim);
    
    // Warm accent key for rich glowing skin tones
    const accent = new THREE.DirectionalLight(0xffaa66, 0.35);
    accent.position.set(-3, 3, 4); avatarScene.add(accent);

    // Ground
    const gnd = new THREE.Mesh(
        new THREE.CircleGeometry(3.5, 40),
        new THREE.MeshStandardMaterial({color:0x0a1520, roughness:0.9, metalness:0.1})
    );
    gnd.rotation.x = -Math.PI/2; 
    gnd.position.y = -1.98; // Positioned exactly beneath lowest foot boundary
    gnd.receiveShadow = true;
    avatarScene.add(gnd);

    avatarGroup = new THREE.Group();
    avatarScene.add(avatarGroup);
    buildCharacter();
    
    // 旗艦級後處理光效管線 (Post-Processing UnrealBloomPass)
    // 賦予純銀高光反射點、明亮邊緣極致迷人的大氣擴散輝光光暈
    try {
        if (THREE.EffectComposer && THREE.RenderPass && THREE.UnrealBloomPass) {
            avatarComposer = new THREE.EffectComposer(avatarRenderer);
            const renderPass = new THREE.RenderPass(avatarScene, avatarCamera);
            avatarComposer.addPass(renderPass);
            
            // UnrealBloomPass(解析度, 輝光強度, 擴散半徑, 觸發閾值)
            // 精心設定高閾值(0.65)，確保僅有受光強烈的金屬高光與明亮膚色邊緣產生光暈，避免全螢幕過曝
            const bloomPass = new THREE.UnrealBloomPass(new THREE.Vector2(W, H), 0.38, 0.85, 0.65);
            avatarComposer.addPass(bloomPass);
        }
    } catch(e) {
        console.warn("Bloom FX skipped:", e);
        avatarComposer = null;
    }

    setupControls(canvas);

    // Epic Ocean Particle Aura (Proposal 5)
    // 300 ocean-tone micro-glowing particles that spiral upward around the character
    avatarParticles = buildParticleAura();
    avatarScene.add(avatarParticles.points);

    animate();
}

function mat(color, rough=0.75, metal=0.0) {
    return new THREE.MeshStandardMaterial({
        color: C(color),
        roughness: rough,
        metalness: metal
    });
}

// ── Epic Ocean Particle Aura System ─────────────────────────────────────────
function buildParticleAura() {
    const COUNT = 300;
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    const meta = []; // per-particle lifecycle data

    // Ocean palette: deep navy, cyan, teal, ice-blue
    const palette = [
        new THREE.Color('#00d4ff'), // cyan
        new THREE.Color('#0ea5e9'), // sky-blue
        new THREE.Color('#06b6d4'), // teal
        new THREE.Color('#38bdf8'), // light sky
        new THREE.Color('#7dd3fc'), // ice blue
        new THREE.Color('#bae6fd'), // pale mist
    ];

    for (let i = 0; i < COUNT; i++) {
        const angle  = Math.random() * Math.PI * 2;
        const radius = 0.45 + Math.random() * 0.80; // ring around character
        const yStart = -2.0 + Math.random() * 4.2;  // full height span
        positions[i*3+0] = Math.cos(angle) * radius;
        positions[i*3+1] = yStart;
        positions[i*3+2] = Math.sin(angle) * radius;

        const col = palette[Math.floor(Math.random() * palette.length)];
        colors[i*3+0] = col.r;
        colors[i*3+1] = col.g;
        colors[i*3+2] = col.b;

        meta.push({
            angle,
            radius,
            y: yStart,
            speed:    0.004 + Math.random() * 0.010, // rise speed
            drift:    (Math.random() - 0.5) * 0.004, // angular drift
            lifespan: 0.3 + Math.random() * 0.7,     // 0-1 opacity phase position
            fadeDir:  Math.random() > 0.5 ? 1 : -1,  // fade in or out initially
        });
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size: 0.045,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
        depthWrite: false,
        blending: THREE.AdditiveBlending, // additive blend for glowing aura look
        sizeAttenuation: true,
    });

    const points = new THREE.Points(geo, mat);
    return { points, geo, meta, positions };
}

let headGroup = null;
let currentGroup = null;

function buildCharacter() {
    while (avatarGroup.children.length) avatarGroup.remove(avatarGroup.children[0]);
    headGroup = new THREE.Group();
    avatarGroup.add(headGroup);

    // Scale down head for realistic proportions (approx 1/7 heads tall instead of 1/3)
    headGroup.scale.set(0.72, 0.72, 0.72);
    // Offset head up so scaled neck aligns with torso top (y=1.6)
    headGroup.position.y = 1.6 - (1.59 * 0.72); 
    currentGroup = headGroup;

    const sk = avatarState.skin;
    const hc = avatarState.hairColor;
    const ec = avatarState.eye;
    const faceType = avatarState.face;

    // ── Face shape ──
    let fw = 0.52, fh = 0.58, fd = 0.50;
    if (faceType==='square') { fw=0.60; fh=0.54; fd=0.50; }
    if (faceType==='slim')   { fw=0.42; fh=0.66; fd=0.48; }

    // ── Head ──
    const headGeo = new THREE.SphereGeometry(0.5, 36, 28);
    headGeo.scale(fw/0.5, fh/0.5, fd/0.5);
    const head = add(headGeo, mat(sk, 0.7));
    head.position.set(0, 2.1, 0);

    // ── Ears (Clean soft integration) ──
    [-1,1].forEach(s => {
        const e = add(new THREE.SphereGeometry(0.09, 16, 12), mat(sk, 0.8));
        e.position.set(s*(fw+0.03), 2.06, -0.02); e.scale.set(0.5, 0.85, 0.35);
    });

    // Realistic Face Proportions
    const eyeY = 2.06, browY = 2.15, noseY = 1.94, mouthY = 1.84;

    // ── Eyes (Perfectly flush embedded/decal-like integration) ──
    [-0.17, 0.17].forEach(x => {
        // Sclera (White) - extremely flat along Z, flush with face surface
        const ew = add(new THREE.SphereGeometry(0.08, 16, 12), mat('#fafafa',0.2));
        ew.position.set(x, eyeY, fd - 0.002);
        ew.scale.set(1.1, 0.85, 0.05); // perfectly flat
        // Iris
        const iris = add(new THREE.SphereGeometry(0.048, 16, 12), mat(ec,0.4));
        iris.position.set(x, eyeY, fd);
        iris.scale.set(1.0, 1.0, 0.05);
        // Pupil
        const pu = add(new THREE.SphereGeometry(0.024, 12, 10), mat('#050505',0.3));
        pu.position.set(x, eyeY, fd + 0.002);
        pu.scale.set(1.0, 1.0, 0.05);
        // Subtle Highlight
        const hl = add(new THREE.SphereGeometry(0.008, 8, 8), mat('#ffffff',0.1));
        hl.position.set(x+0.012, eyeY+0.01, fd + 0.004);
        hl.scale.set(1.0, 1.0, 0.05);
    });

    // ── Expression (drives brow, eyelid, mouth and cheek shapes) ──
    const EXPRESSIONS = {
        smile:      { brow: [0.002, 0.024, 0.006],  lid: 0.066, mouth: [0.085, 0.024, -0.008], lipW: 1.45, cheek: 0.34 },
        calm:       { brow: [0.002, 0.010, 0.000],  lid: 0.070, mouth: [0.065, 0.004,  0.000], lipW: 1.20, cheek: 0.22 },
        determined: { brow: [-0.020, 0.006, 0.012], lid: 0.056, mouth: [0.060, -0.009, 0.003], lipW: 1.10, cheek: 0.14 }
    };
    const ex = EXPRESSIONS[avatarState.expression] || EXPRESSIONS.smile;

    // ── Eyebrows (curved, follow the hair colour) + upper eyelid line ──
    [-1, 1].forEach(s => {
        faceCurve([[s*0.105, browY + ex.brow[0]], [s*0.17, browY + ex.brow[1]], [s*0.24, browY + ex.brow[2]]],
                  0.009, fd + 0.003, mat(parseInt(hc.slice(1, 3), 16) > 150 ? '#8d8d8d' : hc, 0.9));
        faceCurve([[s*0.17 - 0.088, eyeY + 0.030], [s*0.17, eyeY + ex.lid], [s*0.17 + 0.088, eyeY + 0.030]],
                  0.006, fd + 0.005, mat('#1a0e04', 0.85));
    });

    // ── Nose (Soft continuous contour blending into face) ──
    // Single smooth tapered ellipsoid pushed deeper to avoid sharp floating seams
    const nose = add(new THREE.SphereGeometry(0.042, 16, 16), mat(sk,0.72));
    nose.position.set(0, noseY+0.02, fd+0.02); 
    nose.scale.set(0.8, 1.4, 0.6); // smooth, narrow, softly raised

    // ── Mouth (Soft flush embedded lips) ──
    // Upper lip flat soft shape
    const lipTop = add(new THREE.SphereGeometry(0.035, 16, 12), mat('#a86050',0.7));
    lipTop.position.set(0, mouthY+0.008, fd - 0.002);
    lipTop.scale.set(1.1, 0.35, 0.1); // extremely flat against skin
    // Lower lip
    const lipBot = add(new THREE.SphereGeometry(0.035, 16, 12), mat('#c07060',0.7));
    lipBot.position.set(0, mouthY-0.006, fd - 0.002); 
    lipBot.scale.set(ex.lipW, 0.45, 0.1);
    // Mouth line: its corners carry the expression
    faceCurve([[-ex.mouth[0], mouthY + ex.mouth[1]], [0, mouthY + ex.mouth[2]], [ex.mouth[0], mouthY + ex.mouth[1]]],
              0.006, fd + 0.003, mat('#5a2a20', 0.8));

    // ── Cheeks (soft blush lying on the head surface) ──
    [-1, 1].forEach(s => {
        const cx = s * fw * 0.52, cy = 1.955;
        const nx = cx / (fw*fw), ny = (cy - 2.1) / (fh*fh);
        const cz = fd * Math.sqrt(Math.max(0, 1 - (cx*cx)/(fw*fw) - ((cy-2.1)*(cy-2.1))/(fh*fh)));
        const n = new THREE.Vector3(nx, ny, cz / (fd*fd)).normalize();
        const blush = new THREE.MeshStandardMaterial({
            color: C(sk).lerp(C('#d9655a'), 0.55), roughness: 0.85,
            transparent: true, opacity: ex.cheek, depthWrite: false
        });
        const cheek = add(new THREE.SphereGeometry(0.075, 20, 14), blush);
        cheek.castShadow = false; cheek.receiveShadow = false;
        cheek.position.set(cx + n.x*0.002, cy + n.y*0.002, cz + n.z*0.002);
        cheek.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        cheek.scale.set(1.0, 0.72, 0.04);
    });

    // ── Hair ──
    const wearsHelmet = avatarState.cloth === 'ceremony' || avatarState.accessory === 'silver_helmet' || avatarState.accessory === 'rattan_helmet';
    if (!wearsHelmet) {
        buildHair(hc, fw, fh, fd);
    }

    // ── Neck ──
    const neck = add(new THREE.CylinderGeometry(0.12,0.15,0.26,18), mat(sk,0.7));
    neck.position.set(0, 1.72, 0);

    currentGroup = null; // Switch back to body

    // ── Body / Clothing ──
    buildBody(sk);

    // ── Accessory ──
    buildAccessory(fw, fh, fd);

    avatarGroup.position.y = -1.15;
}

function add(geo, material) {
    const m = new THREE.Mesh(geo, material);
    m.castShadow = true; m.receiveShadow = true;
    if (currentGroup) currentGroup.add(m);
    else avatarGroup.add(m);
    return m;
}

// Thin flattened tube through 2D face points (x, y), lying on the face plane at depth z
function faceCurve(points, radius, z, material) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], 0)));
    const m = add(new THREE.TubeGeometry(curve, 20, radius, 8, false), material);
    m.position.z = z;
    m.scale.z = 0.4;
    m.castShadow = false;
    return m;
}

// Rattan wrapped in coils: a tiny striped texture repeated along tubes and hoops
function rattanMat(color, coils) {
    const c = document.createElement('canvas');
    c.width = 32; c.height = 4;
    const g = c.getContext('2d');
    g.fillStyle = color; g.fillRect(0, 0, 32, 4);
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.fillRect(0, 0, 6, 4);
    g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(15, 0, 6, 4);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.set(coils, 1);
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.82, metalness: 0.03 });
}

// Round tube through 3D points
function tube(points, radius, material, segments) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(p[0], p[1], p[2])));
    return add(new THREE.TubeGeometry(curve, segments || 20, radius, 8, false), material);
}

// Horizontal hoop around the torso. `arc` is its length; `centre` the direction of its middle
// (Math.PI * 1.5 = the back, so a long arc leaves its gap at the front).
function hoop(y, radius, thick, arc, centre, material, zScale) {
    const h = add(new THREE.TorusGeometry(radius, thick, 10, 40, arc), material);
    h.position.set(0, y, 0);
    h.rotation.x = Math.PI / 2;
    h.rotation.z = centre - arc / 2;
    h.scale.set(1.0, 1.0, zScale || 0.59);
    return h;
}

function lighten(hex, amt) {
    return '#' + hex.replace('#','').match(/.{2}/g)
        .map(v=>Math.min(255,parseInt(v,16)+amt).toString(16).padStart(2,'0')).join('');
}

function darken(hex) {
    return '#' + hex.replace('#','').match(/.{2}/g)
        .map(v=>Math.max(0,parseInt(v,16)-30).toString(16).padStart(2,'0')).join('');
}

function buildHair(hc, fw, fh, fd) {
    if (avatarState.hair === 'bald') return;
    const hmat = mat(hc, 0.72);
    const strandMat = mat(lighten(hc, 26), 0.6);
    const hzScale = fd / 0.5;

    // Point on (and normal of) the head ellipsoid, pushed out by `lift`
    const onHead = (phi, el, lift) => {
        const d = new THREE.Vector3(Math.sin(phi) * Math.cos(el), Math.sin(el), Math.cos(phi) * Math.cos(el));
        const k = 1 + lift;
        const p = new THREE.Vector3(fw * k * d.x, 2.1 + fh * k * d.y, fd * k * d.z);
        const n = new THREE.Vector3(d.x / fw, d.y / fh, d.z / fd).normalize();
        return { p, n };
    };

    // Crown: sits high so the forehead shows; the hairline is drawn by the tufts below
    const cap = add(new THREE.SphereGeometry(0.515, 36, 20, 0, Math.PI*2, 0, Math.PI*0.34), hmat);
    cap.position.set(0, 2.1, -0.01);
    cap.scale.set(fw/0.5+0.03, fh/0.5+0.03, hzScale+0.03);

    // Back and sides of the scalp
    const backFill = add(new THREE.SphereGeometry(0.51, 32, 20), hmat);
    backFill.position.set(0, 2.09, -0.19);
    backFill.scale.set(fw/0.5+0.07, fh/0.5+0.05, hzScale-0.06);

    // Hairline: overlapping tufts from temple to temple, slightly uneven so it does not read as a helmet
    const TUFTS = 15;
    for (let i = 0; i < TUFTS; i++) {
        const u = i / (TUFTS - 1) * 2 - 1;                 // -1 (one temple) .. 1 (the other)
        const phi = u * 1.55;
        const el = 0.62 - 0.30 * u * u + ((i % 2) ? 0.03 : -0.02);
        const { p, n } = onHead(phi, el, 0.035);
        const tuft = add(new THREE.SphereGeometry(0.105, 14, 10), hmat);
        tuft.position.copy(p);
        tuft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), n);
        tuft.scale.set(1.0, 1.15 + 0.25 * u * u, 0.30);
    }

    // Strands: fine lighter lines combed from the crown toward the hairline
    const STRANDS = 13;
    for (let i = 0; i < STRANDS; i++) {
        const u = i / (STRANDS - 1) * 2 - 1;
        const phi = u * 1.7 + 0.06;
        const pts = [1.30, 1.05, 0.82, 0.60 - 0.32 * u * u].map((el, k) => {
            const q = onHead(phi * (0.55 + 0.15 * k), el, 0.075).p;
            return [q.x, q.y, q.z];
        });
        const s = tube(pts, 0.0065, strandMat, 14);
        s.castShadow = false;
    }

    // Sideburns in front of the ears
    [-1,1].forEach(s => {
        const side = add(new THREE.SphereGeometry(0.07, 16, 10), hmat);
        side.position.set(s*(fw+0.005), 2.10, 0.06);
        side.scale.set(0.28, 1.5, 0.75);
        side.rotation.z = s * 0.08;
    });

    if (avatarState.hair === 'long') {
        // Back mass falling to the shoulder blades, tapered at the tips
        const back = add(new THREE.SphereGeometry(0.5, 28, 20), hmat);
        back.position.set(0, 1.62, -fd*0.62);
        back.scale.set((fw+0.06)/0.5, 1.38, 0.30);
        // Two locks resting in front of the shoulders
        [-1,1].forEach(s => {
            tube([[s*(fw+0.03), 2.02, -0.02], [s*(fw+0.06), 1.78, 0.06], [s*(fw+0.02), 1.58, 0.15], [s*(fw-0.02), 1.42, 0.19]], 0.042, hmat, 18);
        });
        // Strand lines down the back
        for (let i = -3; i <= 3; i++) {
            const s = tube([[i*0.085, 2.05, -fd*0.92], [i*0.095, 1.60, -fd*0.92-0.02], [i*0.08, 1.12, -fd*0.80]], 0.006, strandMat, 12);
            s.castShadow = false;
        }
    }

    if (avatarState.hair === 'bun') {
        // Hair pulled up into a knot on the crown
        const gather = add(new THREE.CylinderGeometry(0.09, 0.15, 0.22, 24), hmat);
        gather.position.set(0, 2.66, -0.06);
        const tie = add(new THREE.TorusGeometry(0.095, 0.02, 12, 28), mat('#2a1d14', 0.9));
        tie.position.set(0, 2.74, -0.06); tie.rotation.x = Math.PI/2;
        const bunCore = add(new THREE.SphereGeometry(0.16, 24, 20), hmat);
        bunCore.position.set(0, 2.86, -0.06);
        bunCore.scale.set(1.05, 0.85, 1.05);
        // Spiral strands around the knot
        for (let k = 0; k < 3; k++) {
            const ring = add(new THREE.TorusGeometry(0.115 - k*0.03, 0.007, 8, 28), strandMat);
            ring.position.set(0, 2.86 + k*0.045, -0.06);
            ring.rotation.x = Math.PI/2 + 0.12; ring.rotation.z = k * 0.9;
            ring.scale.set(1.05, 1.05, 1);
        }
    }
}

function buildBody(sk) {
    const cloth = avatarState.cloth;
    const stripeW = '#e8e4d8';
    const stripeD = '#2d4a6e';
    const skinMat = mat(sk, 0.7);

    // Reset idle rig refs on each rebuild
    idleRig = { torso: null, shoulders: [], armGroups: [], pecs: [], abs: [] };
    currentBodySwing = 0;

    const torsoSkinMat = (cloth === 'vest_dark') ? mat(stripeW, 0.82) : skinMat;

    // Torso (Elliptical Cylinder for organic shape)
    const torso = add(new THREE.CylinderGeometry(0.40, 0.38, 0.90, 32), torsoSkinMat);
    torso.position.set(0, 1.18, 0);
    torso.scale.set(1.0, 1.0, 0.55);
    idleRig.torso = torso;

    // Premium Sculpted Muscular overlay seamlessly integrated with delicate decal-depth relief
    // Strictly visible only when bare-chested (wearing traditional loincloth)
    if (cloth === 'loincloth' || cloth === 'ceremony') {
        // Pectorals (Chest muscles - spaced cleanly apart to form a natural central sternum groove without overlapping seams)
        [-0.155, 0.155].forEach(x => {
            const pec = add(new THREE.SphereGeometry(0.13, 24, 16), skinMat);
            pec.position.set(x, 1.43, 0.218);
            pec.scale.set(1.1, 0.7, 0.025);
            pec.castShadow = false; pec.receiveShadow = false;
            idleRig.pecs.push(pec);
        });

        // Abdominals (Continuous soft core definition)
        const absY = [1.24, 1.13, 1.02];
        absY.forEach(y => {
            [-0.058, 0.058].forEach(x => {
                const ab = add(new THREE.SphereGeometry(0.065, 16, 12), skinMat);
                ab.position.set(x, y, 0.219);
                ab.scale.set(1.3, 0.88, 0.025);
                ab.rotation.z = x > 0 ? 0.03 : -0.03;
                ab.castShadow = false; ab.receiveShadow = false;
                idleRig.abs.push(ab);
            });
        });
    }

    // Striped vest
    // Ceremonial dress: a short sleeveless vest in fine blue-grey and white stripes, open at the front
    if (cloth === 'ceremony') {
        const gap = Math.PI * 0.105;                      // half-width of the front opening
        const bands = 19, top = 1.585, bandH = 0.0255;
        for (let i = 0; i < bands; i++) {
            const col = i % 2 === 0 ? '#5f7896' : '#e9e6da';
            const band = add(new THREE.CylinderGeometry(0.413, 0.413, bandH + 0.002, 40, 1, true, gap, Math.PI * 2 - gap * 2),
                new THREE.MeshStandardMaterial({ color: C(col), roughness: 0.85, side: THREE.DoubleSide }));
            band.position.set(0, top - bandH * (i + 0.5), 0);
            band.scale.set(1.0, 1.0, 0.57);
        }
        const hemY = top - bandH * bands;
        // Edges of the opening and the hem
        [-1, 1].forEach(s => {
            const ex = Math.sin(gap) * 0.413 * s, ez = Math.cos(gap) * 0.413 * 0.57;
            tube([[ex, top, ez], [ex, (top + hemY) / 2, ez + 0.004], [ex, hemY, ez]], 0.011, mat('#3f5673', 0.85), 8);
        });
        hoop(hemY, 0.414, 0.010, Math.PI * 2 - gap * 2, Math.PI * 1.5, mat('#3f5673', 0.85), 0.57);
        // Vest over the shoulders
        [-1, 1].forEach(s => {
            const strap = add(new THREE.SphereGeometry(0.135, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mat('#5f7896', 0.85));
            strap.position.set(s * 0.40, 1.55, 0);
            strap.scale.set(1.0, 0.75, 1.05);
        });
    }

    if (cloth === 'vest_dark') {
        const stripes = [1.50, 1.38, 1.26, 1.14, 1.02, 0.90, 0.78];
        stripes.forEach((y, i) => {
            const col = i % 2 === 0 ? stripeD : stripeW;
            const s = add(new THREE.CylinderGeometry(0.405, 0.405, 0.10, 32), mat(col, 0.83));
            s.position.set(0, y, 0);
            s.scale.set(1.0, 1.0, 0.55);
        });
        // Fine weave lines where the stripes meet, and a hem at top and bottom
        [1.44, 1.32, 1.20, 1.08, 0.96, 0.84].forEach(y => {
            const seam = add(new THREE.CylinderGeometry(0.407, 0.407, 0.008, 32), mat('#1c2f47', 0.9));
            seam.position.set(0, y, 0);
            seam.scale.set(1.0, 1.0, 0.55);
        });
        [1.553, 0.727].forEach(y => {
            const hem = add(new THREE.CylinderGeometry(0.409, 0.409, 0.014, 32), mat(stripeD, 0.88));
            hem.position.set(0, y, 0);
            hem.scale.set(1.0, 1.0, 0.55);
        });
        // Vest edge trim
        [-0.15, 0.15].forEach(x => {
            const trim = add(new THREE.CylinderGeometry(0.015, 0.015, 0.90, 8), mat(stripeD, 0.85));
            trim.position.set(x, 1.18, 0.22);
        });
    }

    // Shoulders (decorative sphere, still visible)
    [-1,1].forEach(s => {
        const shldr = add(new THREE.SphereGeometry(0.12, 16, 12), skinMat);
        shldr.position.set(s*0.42, 1.55, 0);
        idleRig.shoulders.push(shldr);
    });

    // ARM HIERARCHY: shoulder-root Group -> upperArm -> elbowGroup -> forearm+bracelet+hand
    // Rotation at armGroup level cascades naturally to every child, zero gaps possible
    [-1,1].forEach((s, idx) => {
        // Shoulder-root Group anchored at shoulder-ball centre
        const armGroup = new THREE.Group();
        armGroup.position.set(s * 0.42, 1.55, 0);
        avatarGroup.add(armGroup);
        const armRef = { group: armGroup, side: s, elbow: null };
        idleRig.armGroups.push(armRef);

        // Upper arm: positioned relative to shoulder centre (offset downward by half-length)
        const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.65, 24), skinMat);
        upperArm.position.set(s * 0.04, -0.325, 0);
        upperArm.castShadow = true; upperArm.receiveShadow = true;
        armGroup.add(upperArm);

        // Elbow Group anchored at the bottom end of upper arm
        const elbowGroup = new THREE.Group();
        elbowGroup.position.set(s * 0.04, -0.65, 0);
        armGroup.add(elbowGroup);

        // Elbow ball
        const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), skinMat);
        elbow.castShadow = true; elbow.receiveShadow = true;
        elbowGroup.add(elbow);

        // Forearm: hangs from elbow, slight natural outward angle stored via elbowGroup.rotation.z
        elbowGroup.rotation.z = s * 0.08; // natural resting carry angle
        armRef.elbow = elbowGroup;
        const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.065, 0.52, 24), skinMat);
        forearm.position.set(0, -0.26, 0);
        forearm.castShadow = true; forearm.receiveShadow = true;
        elbowGroup.add(forearm);

        // Silver bracelet at wrist (end of forearm)
        const bracelet = new THREE.Mesh(new THREE.TorusGeometry(0.072, 0.015, 12, 24), mat('#c8ccd0', 0.15, 0.9));
        bracelet.position.set(0, -0.52, 0);
        bracelet.rotation.x = Math.PI / 2;
        bracelet.castShadow = true;
        elbowGroup.add(bracelet);

        // Hand flush against wrist
        const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), skinMat);
        hand.position.set(0, -0.62, 0);
        hand.scale.set(1, 1.2, 0.6);
        hand.castShadow = true;
        elbowGroup.add(hand);
    });

    // ── Hips (Natural skin tone pelvic base for high-cut athletic legs) ──
    const hips = add(new THREE.CylinderGeometry(0.38, 0.36, 0.26, 32), skinMat);
    hips.position.set(0, 0.60, 0);
    hips.scale.set(1.0, 1.0, 0.55);

    // ── Authentic Tao Loincloth System (達悟族傳統丁字褲 Bah) ──
    const loincMat   = mat('#fcfcf8', 0.82); // Pure white woven cotton fabric
    const loinStripe = mat('#1e3050', 0.88); // Traditional dark indigo/navy woven stripe

    // 1. Snug-fitting Wrapped Cloth Waistband (貼合腰部的環狀布條)
    // Sits flush against waist surface (r=0.38) without sticking out or floating
    const waistBandBase = add(new THREE.CylinderGeometry(0.384, 0.376, 0.11, 32), loincMat);
    waistBandBase.position.set(0, 0.675, 0);
    waistBandBase.scale.set(1.0, 1.0, 0.55);

    // Central navy woven stripe integrated flatly on the waistband
    const waistBandStripe = add(new THREE.CylinderGeometry(0.386, 0.378, 0.045, 32), loinStripe);
    waistBandStripe.position.set(0, 0.675, 0);
    waistBandStripe.scale.set(1.0, 1.0, 0.55);

    // Cloth edges of the waistband
    [0.728, 0.622].forEach(y => {
        const edge = add(new THREE.CylinderGeometry(0.387, 0.379, 0.008, 32), mat('#d6d1c2', 0.9));
        edge.position.set(0, y, 0);
        edge.scale.set(1.0, 1.0, 0.55);
    });

    // Waistband side ties/knots (腰帶側邊結繩帶)
    [-0.37, 0.37].forEach(x => {
        const knot = add(new THREE.SphereGeometry(0.024, 12, 12), loincMat);
        knot.position.set(x, 0.675, 0);
        const knotTail = add(new THREE.CylinderGeometry(0.010, 0.007, 0.11, 8), loincMat);
        knotTail.position.set(x * 1.01, 0.62, 0.02);
        knotTail.rotation.z = x > 0 ? -0.2 : 0.2;
    });

    // 2. Flush V-Shaped Front Pouch & Crotch Coverage (平貼前襠 V 形護包與跨下包覆)
    // Extends seamlessly from waistband (y=0.68) down over crotch
    const pouchGeo = new THREE.CylinderGeometry(0.386, 0.14, 0.32, 24, 1, false, -Math.PI * 0.35, Math.PI * 0.70);
    const pouch = add(pouchGeo, loincMat);
    pouch.position.set(0, 0.53, 0);
    pouch.scale.set(1.0, 1.0, 0.55);

    // Crotch Underneath Bridge (跨下下方極密包覆帶)
    const crotchBridge = add(new THREE.CylinderGeometry(0.125, 0.125, 0.38, 16), loincMat);
    crotchBridge.position.set(0, 0.45, 0);
    crotchBridge.rotation.x = Math.PI / 2;
    crotchBridge.scale.set(0.92, 1.0, 0.65);

    // 3. Front Apron Flap (前檔布/前垂布 - 直接緊貼並相連於腰帶布條，無縫懸垂)
    const frontApronWidths = [0.24, 0.22, 0.20, 0.18, 0.16, 0.14, 0.12, 0.10];
    frontApronWidths.forEach((w, i) => {
        const isStripe = (i === 1 || i === 3);
        const m = isStripe ? loinStripe : loincMat;
        // Starts at yPos = 0.635 to touch waistband ring (y=0.675) with zero gap
        const yPos = 0.635 - i * 0.050;
        const apronSeg = add(new THREE.BoxGeometry(w, 0.051, 0.022), m);
        apronSeg.position.set(0, yPos, 0.208 - i * 0.002);
    });

    // Apron hem line
    const apronHem = add(new THREE.BoxGeometry(0.10, 0.010, 0.023), loinStripe);
    apronHem.position.set(0, 0.635 - 7 * 0.050 - 0.021, 0.208 - 7 * 0.002);

    // 4. Back Strap & Flap (後包覆帶與後垂布)
    const backStrap = add(new THREE.CylinderGeometry(0.10, 0.09, 0.30, 16, 1, false, Math.PI * 0.6, Math.PI * 0.8), loincMat);
    backStrap.position.set(0, 0.52, -0.05);
    backStrap.scale.set(1.0, 1.0, 0.80);

    const backTail = add(new THREE.BoxGeometry(0.12, 0.28, 0.020), loincMat);
    backTail.position.set(0, 0.48, -0.20);

    // Legs
    [-1,1].forEach(s => {
        const thigh = add(new THREE.CylinderGeometry(0.125, 0.10, 0.70, 24), skinMat);
        thigh.position.set(s*0.18, 0.22, 0);
        
        // Knee
        const knee = add(new THREE.SphereGeometry(0.10, 16, 12), skinMat);
        knee.position.set(s*0.18, -0.12, 0);

        const calf = add(new THREE.CylinderGeometry(0.095, 0.075, 0.65, 24), skinMat);
        calf.position.set(s*0.18, -0.42, 0);
        
        // Ankle silver ring
        const anklet = add(new THREE.TorusGeometry(0.082, 0.014, 12, 24), mat('#c8ccd0', 0.15, 0.9));
        anklet.position.set(s*0.18, -0.70, 0); anklet.rotation.x = Math.PI/2;
        
        // Bare foot (organic oval shape)
        const foot = add(new THREE.SphereGeometry(0.08, 24, 16), skinMat);
        foot.position.set(s*0.18, -0.77, 0.06);
        foot.scale.set(1, 0.6, 1.6);
    });
}

function buildAccessory(fw, fh, fd) {
    // Ceremonial dress comes as a set: silver helmet and silver chest pieces
    const ceremony = avatarState.cloth === 'ceremony';
    const acc = ceremony ? 'silver_helmet' : avatarState.accessory;
    if (acc === 'none' && avatarState.cloth !== 'rattan_armor') return;

    if (acc === 'rattan_helmet') {
        currentGroup = headGroup; // Attach helmet to scaled head group so it sways naturally with head rotation
        
        const rattanDark    = rattanMat('#3a2c22', 46);       // Charcoal dark brown woven rattan, wrapped in coils
        const rattanSpar    = mat('#4a382a', 0.80, 0.04); // Thick main vertical rattan spar
        const bindCordMat   = mat('#181310', 0.95, 0.00); // Blackish brown binding cord
        const innerMat      = mat('#120E0C', 0.98, 0.00); // Dark interior lining cap

        // 1. Dark interior lining cap (完美包覆頭頂)
        const innerCap = add(new THREE.ConeGeometry(0.52, 0.75, 32, 1, true), innerMat);
        innerCap.position.set(0, 2.62, 0);

        // 2. Pointed Apex Peak Cap & Top Knob (博物館參考圖：尖頂編織頂紐)
        const apexPeak = add(new THREE.ConeGeometry(0.07, 0.14, 16), bindCordMat);
        apexPeak.position.set(0, 3.05, 0);

        // 3. Inner Horizontal Woven Rattan Coils (8層內部橫向省藤條圈，佩戴於頭頂，完整露出五官)
        const layers = [
            { y: 2.98, r: 0.10, t: 0.026 },
            { y: 2.90, r: 0.16, t: 0.028 },
            { y: 2.82, r: 0.22, t: 0.030 },
            { y: 2.73, r: 0.28, t: 0.032 },
            { y: 2.64, r: 0.34, t: 0.034 },
            { y: 2.54, r: 0.40, t: 0.036 },
            { y: 2.44, r: 0.45, t: 0.038 },
            { y: 2.34, r: 0.49, t: 0.040 },
            { y: 2.26, r: 0.52, t: 0.042 }  // Base rim sitting at upper forehead (above eyebrows)
        ];

        layers.forEach((l) => {
            const ring = add(new THREE.TorusGeometry(l.r, l.t, 12, 36), rattanDark);
            ring.position.set(0, l.y, 0);
            ring.rotation.x = Math.PI / 2;
            ring.scale.set(1.0, 1.0, 1.06); // Oval contour for realistic head shape
        });

        // 4. 8 Heavy Outer Vertical Rattan Spars (8 根外層粗省藤直脊骨條由頂峰向四周放射)
        const SPAR_COUNT = 8;
        for (let i = 0; i < SPAR_COUNT; i++) {
            const angle = (i / SPAR_COUNT) * Math.PI * 2;
            for (let j = 0; j < layers.length - 1; j++) {
                const l1 = layers[j], l2 = layers[j+1];
                const r1 = l1.r * 1.08;
                const r2 = l2.r * 1.08;
                const x1 = Math.cos(angle) * r1, z1 = Math.sin(angle) * r1 * 1.06, y1 = l1.y;
                const x2 = Math.cos(angle) * r2, z2 = Math.sin(angle) * r2 * 1.06, y2 = l2.y;

                const dx = x2 - x1, dy = y2 - y1, dz = z2 - z1;
                const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                
                const sparSeg = add(new THREE.CylinderGeometry(0.018, 0.022, dist, 8), rattanSpar);
                sparSeg.position.set((x1+x2)/2, (y1+y2)/2, (z1+z2)/2);
                
                const dir = new THREE.Vector3(dx, dy, dz).normalize();
                sparSeg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);

                const tieKnot = add(new THREE.SphereGeometry(0.014, 8, 8), bindCordMat);
                tieKnot.position.set(x1, y1, z1);
            }
        }

        // 5. Heavy Bottom Border Rim Band (底緣粗包邊編圈，剛好停在額頭上方)
        const bottomBorder = add(new THREE.TorusGeometry(0.535, 0.034, 12, 36), bindCordMat);
        bottomBorder.position.set(0, 2.24, 0);
        bottomBorder.rotation.x = Math.PI / 2;
        bottomBorder.scale.set(1.0, 1.0, 1.06);

        currentGroup = null; // Switch back to body
    }

    if (acc === 'rattan_armor' || avatarState.cloth === 'rattan_armor') {
        currentGroup = null; // Ensure attached to body/avatarGroup
        // Rattan armour after the museum pieces: wrapped rods fanning up to the shoulders, stacked hoops
        // round the waist and hem, dark hide showing between them, open at the front and tied with cord.
        const hide      = new THREE.MeshStandardMaterial({ color: C('#1b1613'), roughness: 0.92, side: THREE.DoubleSide });
        const rodMat    = rattanMat('#5a4130', 16);
        const hoopMat   = rattanMat('#4d382a', 70);
        const rowMat    = rattanMat('#6a4a34', 30);
        const cordMat   = mat('#6b5238', 0.9);
        const R = 0.445, ZS = 0.59;
        const GAP = Math.PI * 0.11;                                  // half-width of the front opening
        const ARC = Math.PI * 2 - GAP * 2, BACK = Math.PI * 1.5;
        const surfZ = (x, r) => (r || R) * ZS * Math.sqrt(Math.max(0.02, 1 - (x * x) / ((r || R) * (r || R))));

        // 1. Hide backing
        const shell = add(new THREE.CylinderGeometry(R, R - 0.02, 0.90, 40, 1, true, GAP, ARC), hide);
        shell.position.set(0, 1.17, 0);
        shell.scale.set(1.0, 1.0, ZS);

        // 2. Hem: five stacked hoops; one hoop across the hide; two at the waist where the rods start
        for (let i = 0; i < 5; i++) hoop(0.745 + i * 0.043, R + 0.012 - i * 0.001, 0.023, ARC, BACK, hoopMat, ZS);
        hoop(1.03, R + 0.016, 0.021, ARC, BACK, hoopMat, ZS);
        hoop(1.155, R + 0.014, 0.022, ARC, BACK, hoopMat, ZS);
        hoop(1.198, R + 0.014, 0.022, ARC, BACK, hoopMat, ZS);

        // 3. Front: six wrapped rods a side, fanning from the waist out to the shoulder
        [-1, 1].forEach(s => {
            for (let i = 0; i < 6; i++) {
                const x0 = s * (0.085 + i * 0.040), x1 = s * (0.105 + i * 0.058), x2 = s * (0.150 + i * 0.062);
                tube([[x0, 1.19, surfZ(x0) + 0.022],
                      [x1, 1.40, surfZ(x1) + 0.028],
                      [x2, 1.615 - i * 0.012, Math.max(0.03, surfZ(x2) + 0.012)]], 0.021, rodMat, 16);
            }
            // rolled edge of the opening
            const e0 = s * 0.150, e1 = s * 0.058;
            tube([[e0, 0.74, surfZ(e0) + 0.03], [s * 0.135, 1.00, surfZ(0.135) + 0.03], [e1, 1.20, surfZ(e1) + 0.03], [s * 0.095, 1.60, surfZ(0.095) + 0.02]], 0.019, hoopMat, 24);
            // over the shoulder to the back
            for (let k = 0; k < 3; k++) {
                const x = s * (0.24 + k * 0.058);
                tube([[x, 1.585, 0.115], [x + s * 0.01, 1.675, 0.0], [x, 1.60, -0.13]], 0.02, rodMat, 12);
            }
        });

        // 4. Back: horizontal rows across the upper back
        for (let i = 0; i < 10; i++) hoop(1.245 + i * 0.040, R + 0.012, 0.0195, Math.PI * 0.86, BACK, rowMat, ZS);

        // 5. Cord tying the opening, with its ends hanging
        tube([[-0.07, 1.20, surfZ(0.07) + 0.05], [0, 1.185, 0.315], [0.07, 1.20, surfZ(0.07) + 0.05]], 0.010, cordMat, 10);
        const knot = add(new THREE.SphereGeometry(0.026, 12, 10), cordMat);
        knot.position.set(0, 1.185, 0.318);
        [-1, 1].forEach(s => tube([[0, 1.18, 0.318], [s * 0.025, 1.08, 0.325], [s * 0.04, 0.96, 0.31]], 0.007, cordMat, 10));
    }

    if (acc==='silver_helmet') {
        currentGroup = headGroup; // Attach helmet to the scaled head group
        // 博物館級達悟族圓錐銀盔 (Authentic Tao Conical Silver Helmet)
        const silverMatPrimary   = mat('#e6ebf1', 0.34, 0.45); // Main bright polished silver
        const silverMatSecondary = mat('#c3cdd9', 0.40, 0.45); // Contrast silver ring for plate layers
        const eyeMat             = mat('#020617', 1.00, 0.00); // Dark interior & slit

        // Cone profile radii from apex (y=3.10) down to flared base rim (y=1.70)
        // Perfectly matches the conical ratio and silhouette of authentic historical Tao silver helmet
        const ringConfigs = [
            { y: 3.08, rTop: 0.04, rBot: 0.09, h: 0.10 }, // Apex top
            { y: 2.98, rTop: 0.09, rBot: 0.14, h: 0.10 },
            { y: 2.88, rTop: 0.14, rBot: 0.20, h: 0.10 },
            { y: 2.78, rTop: 0.20, rBot: 0.26, h: 0.10 },
            { y: 2.68, rTop: 0.26, rBot: 0.32, h: 0.10 },
            { y: 2.58, rTop: 0.32, rBot: 0.38, h: 0.10 },
            { y: 2.48, rTop: 0.38, rBot: 0.44, h: 0.10 },
            { y: 2.38, rTop: 0.44, rBot: 0.50, h: 0.10 },
            { y: 2.28, rTop: 0.50, rBot: 0.56, h: 0.10 }, // Above eye level
            { y: 2.18, rTop: 0.56, rBot: 0.61, h: 0.10 }, // Eye level
            { y: 2.08, rTop: 0.61, rBot: 0.66, h: 0.10 },
            { y: 1.98, rTop: 0.66, rBot: 0.70, h: 0.10 },
            { y: 1.88, rTop: 0.70, rBot: 0.74, h: 0.10 },
            { y: 1.78, rTop: 0.74, rBot: 0.78, h: 0.10 }, // Base flared rim near shoulders
        ];

        // 1. Apex top knob
        const topKnob = add(new THREE.ConeGeometry(0.05, 0.10, 16), silverMatPrimary);
        topKnob.position.set(0, 3.15, 0);

        // 2. Stacked conical silver rings with plate seam rims
        ringConfigs.forEach((cfg, idx) => {
            const m = (idx % 2 === 0) ? silverMatPrimary : silverMatSecondary;
            const ringGeo = new THREE.CylinderGeometry(cfg.rTop, cfg.rBot + 0.010, cfg.h, 36);
            const ring = add(ringGeo, m);
            ring.position.set(0, cfg.y, 0);

            // Ring seam lip
            const lipGeo = new THREE.TorusGeometry(cfg.rBot + 0.006, 0.007, 8, 36);
            const lip = add(lipGeo, silverMatPrimary);
            lip.position.set(0, cfg.y - cfg.h/2, 0);
            lip.rotation.x = Math.PI / 2;
        });

        // 3. Dark interior lining cap (密封底緣內襯)
        const innerCapGeo = new THREE.RingGeometry(0.48, 0.78, 36);
        const innerCap = add(innerCapGeo, eyeMat);
        innerCap.position.set(0, 1.73, 0);
        innerCap.rotation.x = Math.PI / 2;

        // 4. Two small eye openings
        [-0.085, 0.085].forEach(x => {
            const hole = add(new THREE.BoxGeometry(0.085, 0.05, 0.10), eyeMat);
            hole.position.set(x, 2.12, 0.585);
            const rim = add(new THREE.TorusGeometry(0.052, 0.006, 6, 4), silverMatPrimary);
            rim.position.set(x, 2.12, 0.632); rim.rotation.z = Math.PI / 4; rim.scale.set(1.15, 0.72, 1);
        });

        // 5. Finial on the apex
        tube([[0, 3.18, 0], [0.005, 3.30, 0], [0.03, 3.38, 0], [0.065, 3.40, 0]], 0.008, silverMatPrimary, 12);

        currentGroup = null; // Switch back to body
    }

    if (ceremony) {
        // Silver chest pieces on a cord: round plates hung in pairs down the chest
        const silver = mat('#e6ebf1', 0.34, 0.45);
        const cord   = mat('#3a2a1c', 0.9);
        [-1, 1].forEach(s => tube([[s * 0.13, 1.70, 0.07], [s * 0.115, 1.56, 0.215], [s * 0.05, 1.36, 0.262], [0, 1.24, 0.268]], 0.007, cord, 14));
        [[-0.062, 1.44], [0.062, 1.44], [-0.05, 1.335], [0.05, 1.335], [0, 1.235]].forEach(([x, y], i) => {
            const plate = add(new THREE.CylinderGeometry(i === 4 ? 0.058 : 0.047, i === 4 ? 0.058 : 0.047, 0.010, 24), silver);
            plate.position.set(x, y, 0.272);
            plate.rotation.x = Math.PI / 2;
            const boss = add(new THREE.SphereGeometry(0.014, 10, 8), silver);
            boss.position.set(x, y, 0.280);
        });
    }

    if (acc==='chest_ornament' && !ceremony) {
        // 半月形胸飾 + 公豬獠牙 + 貝珠項鏈
        const woodMat  = mat('#5C2E0A', 0.88);
        const boneMat  = mat('#ece8d0', 0.65);
        const ropeMat  = mat('#7a5520', 0.92);
        const shellMat = mat('#d4c8a0', 0.60, 0.05);
        const beadRed  = mat('#8B2020', 0.70); // dark red/maroon beads

        // Neck rope
        const cord = add(new THREE.TorusGeometry(0.20, 0.013, 8, 32), ropeMat);
        cord.position.set(0, 1.72, 0); cord.rotation.x = Math.PI/2;

        // Main semi-moon wooden arc
        const arcGeo = new THREE.TorusGeometry(0.25, 0.044, 12, 36, Math.PI);
        const arc = add(arcGeo, woodMat);
        arc.position.set(0, 1.50, 0.22); arc.rotation.z = Math.PI;

        // 5 hanging pendants
        for (let i=0; i<5; i++) {
            const t = i/4;
            const angle = Math.PI*0.08 + t*Math.PI*0.84;
            const ax = -Math.cos(angle)*0.25, ay = 1.50 - Math.sin(angle)*0.25;
            const strand = add(new THREE.CylinderGeometry(0.005,0.005,0.10,4), ropeMat);
            strand.position.set(ax, ay-0.06, 0.22);
            if (i===2) {
                // Boar tusk (centre, curved)
                const tusk = add(new THREE.CylinderGeometry(0.018,0.006,0.18,8), boneMat);
                tusk.position.set(ax, ay-0.20, 0.22); tusk.rotation.z = 0.22;
                const tc = add(new THREE.SphereGeometry(0.017,8,6), boneMat);
                tc.position.set(ax+0.04, ay-0.30, 0.22);
            } else {
                const shell = add(new THREE.SphereGeometry(0.030, 10, 8), shellMat);
                shell.position.set(ax, ay-0.17, 0.22); shell.scale.set(1,1.35,0.65);
            }
        }
        // Bead strand rows
        for (let row=0; row<3; row++) {
            const bm = row===0 ? beadRed : (row===1 ? shellMat : beadRed);
            for (let i=-4; i<=4; i++) {
                const bead = add(new THREE.SphereGeometry(0.014, 7, 5), bm);
                bead.position.set(i*0.045, 1.66-row*0.06, 0.21);
            }
        }
    }
}

function animate() {
    avatarAnimId = requestAnimationFrame(animate);
    if (!isDragging) rotY += 0.004;
    avatarGroup.rotation.y = rotY;
    avatarGroup.rotation.x = rotX;

    const t = Date.now() * 0.001;

    // Layer 1: Full-body breathing float (~0.5Hz natural rate)
    const breathBase = Math.sin(t * 0.5 * Math.PI) * 0.025;
    avatarGroup.position.y = breathBase - 1.15;

    // Layer 2: Chest expansion + pec/ab muscle swell
    const chestSwell = Math.sin(t * 0.5 * Math.PI) * 0.012;
    if (idleRig.torso) {
        idleRig.torso.scale.set(1.0 + chestSwell * 0.3, 1.0, 0.55 + chestSwell * 0.6);
    }
    idleRig.pecs.forEach(pec => {
        pec.scale.set(1.1 + chestSwell * 4, 0.7 + chestSwell * 2, 0.025 + chestSwell * 0.5);
    });
    idleRig.abs.forEach((ab, i) => {
        const phase = Math.sin(t * 0.5 * Math.PI - i * 0.15) * 0.006;
        ab.scale.set(1.3 + phase * 3, 0.88 + phase * 1.5, 0.025 + phase * 0.3);
    });

    // Layer 3: Bilateral pendulum arm swing via Group hierarchy
    // Only the shoulder-root group rotates; elbow/forearm/hand follow for free (no gaps!)
    const swingL = Math.sin(t * 0.65) * 0.055;
    const swingR = Math.sin(t * 0.65 + Math.PI) * 0.055;
    currentBodySwing = swingL - swingR; // net lateral sway signal for head coupling

    const pose = POSES[avatarState.pose] || POSES.stand;
    idleRig.armGroups.forEach(({ group, side, elbow }) => {
        const p = pose[side < 0 ? 0 : 1];
        const posed = p.sz || p.sx || p.ez || p.ex;
        const swing = (side < 0 ? swingL : swingR) * (posed ? 0.25 : 1);
        // Rotate whole arm group at shoulder pivot -- all children cascade automatically
        group.rotation.z = side * (0.11 + (p.sz || 0)) + swing * 0.85;
        group.rotation.x = p.sx || 0;
        // Shoulder height follows swing slightly
        group.position.y = 1.55 + swing * 0.025;
        if (elbow) {
            const wave = p.wave ? Math.sin(t * 5.5) * p.wave : 0;
            elbow.rotation.z = side * (0.08 + (p.ez || 0) + wave);
            elbow.rotation.x = p.ex || 0;
        }
    });

    // Layer 4: Head mouse look-at + body-coupled sway (Head-Body Coupling)
    // Head tracks cursor AND leans slightly in the direction the body sways
    if (headGroup) {
        headGroup.rotation.y += (targetHeadRotY - headGroup.rotation.y) * 0.08;
        headGroup.rotation.x += (targetHeadRotX - headGroup.rotation.x) * 0.08;
        // Body coupling: head tilts ~15% of body swing with gentle lag (0.04 lerp)
        headGroup.rotation.z += (currentBodySwing * 0.15 - headGroup.rotation.z) * 0.04;
    }

    // Layer 5: Epic Ocean Particle Aura - per-particle spiral rise + fade
    if (avatarParticles) {
        const { meta, positions, geo } = avatarParticles;
        for (let i = 0; i < meta.length; i++) {
            const p = meta[i];

            // Spiral upward
            p.y += p.speed;
            p.angle += p.drift;

            // Recycle when it floats too high
            if (p.y > 2.4) {
                p.y = -2.0 + Math.random() * 0.5;
                p.angle = Math.random() * Math.PI * 2;
                p.radius = 0.45 + Math.random() * 0.80;
            }

            // Gentle in-out shimmer via lifespan cycling
            p.lifespan += 0.008 * p.fadeDir;
            if (p.lifespan >= 1.0) { p.lifespan = 1.0; p.fadeDir = -1; }
            if (p.lifespan <= 0.0) { p.lifespan = 0.0; p.fadeDir =  1; }

            // Write back position
            positions[i*3+0] = Math.cos(p.angle) * p.radius;
            positions[i*3+1] = p.y;
            positions[i*3+2] = Math.sin(p.angle) * p.radius;
        }
        geo.attributes.position.needsUpdate = true;
        // Pulse overall opacity between 0.4 and 0.85 for dreamy shimmer
        avatarParticles.points.material.opacity = 0.4 + Math.sin(t * 1.2) * 0.22 + 0.22;
    }

    if (avatarComposer) {
        avatarComposer.render();
    } else {
        avatarRenderer.render(avatarScene, avatarCamera);
    }
}

function setupControls(canvas) {
    canvas.addEventListener('mousedown', e=>{isDragging=true; prevMouse={x:e.clientX,y:e.clientY}; canvas.style.cursor='grabbing';});
    window.addEventListener('mouseup', ()=>{isDragging=false; canvas.style.cursor='grab';});
    window.addEventListener('mousemove', e=>{
        // 即時計算滑鼠游標相對於整個瀏覽器視窗中心的標準化坐標 (-1 ~ 1)
        const normX = (e.clientX / window.innerWidth) * 2 - 1;
        const normY = (e.clientY / window.innerHeight) * 2 - 1;
        // 映射至符合人體工學的頭部自然轉動極限角度
        targetHeadRotY = normX * 0.65;
        targetHeadRotX = normY * 0.35;

        if(!isDragging) return;
        rotY+=(e.clientX-prevMouse.x)*0.012; rotX+=(e.clientY-prevMouse.y)*0.008;
        rotX=Math.max(-0.6,Math.min(0.5,rotX)); prevMouse={x:e.clientX,y:e.clientY};
    });
    let lt=null;
    canvas.addEventListener('touchstart', e=>{isDragging=true; lt=e.touches[0];});
    canvas.addEventListener('touchend', ()=>{isDragging=false; lt=null;});
    canvas.addEventListener('touchmove', e=>{
        if(!lt) return;
        const t=e.touches[0];
        const normX = (t.clientX / window.innerWidth) * 2 - 1;
        const normY = (t.clientY / window.innerHeight) * 2 - 1;
        targetHeadRotY = normX * 0.65;
        targetHeadRotX = normY * 0.35;

        rotY+=(t.clientX-lt.clientX)*0.015; rotX+=(t.clientY-lt.clientY)*0.01;
        rotX=Math.max(-0.6,Math.min(0.5,rotX)); lt=t;
    });
    canvas.addEventListener('wheel', e=>{
        avatarCamera.position.z=Math.max(3,Math.min(8,avatarCamera.position.z+e.deltaY*0.01));
    });
}

function destroyAvatar3D() {
    if(avatarAnimId) cancelAnimationFrame(avatarAnimId);
    if(avatarRenderer) avatarRenderer.dispose();
    if(avatarParticles) { avatarParticles.geo.dispose(); avatarParticles.points.material.dispose(); }
    avatarScene=null; avatarCamera=null; avatarRenderer=null; avatarComposer=null; avatarParticles=null;
}

function updateAvatarPart(ctrl, val) {
    avatarState[ctrl]=val; buildCharacter();
}

function captureAvatarSnapshot() {
    if(!avatarRenderer) return null;
    if(avatarComposer) avatarComposer.render();
    else avatarRenderer.render(avatarScene, avatarCamera);
    return avatarRenderer.domElement.toDataURL('image/png');
}
