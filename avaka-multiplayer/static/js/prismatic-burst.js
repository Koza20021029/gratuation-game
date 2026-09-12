// prismatic-burst.js — WebGL Prismatic Burst Shader Effect

const hexToRgb01 = hex => {
  let h = hex.trim();
  if (h.startsWith('#')) h = h.slice(1);
  if (h.length === 3) {
    const r = h[0], g = h[1], b = h[2];
    h = r + r + g + g + b + b;
  }
  const intVal = parseInt(h, 16);
  if (isNaN(intVal) || (h.length !== 6 && h.length !== 8)) return [1, 1, 1];
  const r = ((intVal >> 16) & 255) / 255;
  const g = ((intVal >> 8) & 255) / 255;
  const b = (intVal & 255) / 255;
  return [r, g, b];
};

const toPxVal = v => {
  if (v == null) return 0;
  if (typeof v === 'number') return v;
  const s = String(v).trim();
  const num = parseFloat(s.replace('px', ''));
  return isNaN(num) ? 0 : num;
};

const vertexShaderSource = `#version 300 es
in vec2 position;
in vec2 uv;
out vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = vec4(position, 0.0, 1.0);
}
`;

const fragmentShaderSource = `#version 300 es
precision highp float;
precision highp int;

out vec4 fragColor;

uniform vec2  uResolution;
uniform float uTime;

uniform float uIntensity;
uniform float uSpeed;
uniform int   uAnimType;
uniform vec2  uMouse;
uniform int   uColorCount;
uniform float uDistort;
uniform vec2  uOffset;
uniform sampler2D uGradient;
uniform float uNoiseAmount;
uniform int   uRayCount;

float hash21(vec2 p){
    p = floor(p);
    float f = 52.9829189 * fract(dot(p, vec2(0.065, 0.005)));
    return fract(f);
}

mat2 rot30(){ return mat2(0.8, -0.5, 0.5, 0.8); }

float layeredNoise(vec2 fragPx){
    vec2 p = mod(fragPx + vec2(uTime * 30.0, -uTime * 21.0), 1024.0);
    vec2 q = rot30() * p;
    float n = 0.0;
    n += 0.40 * hash21(q);
    n += 0.25 * hash21(q * 2.0 + vec2(17.0));
    n += 0.20 * hash21(q * 4.0 + vec2(47.0));
    n += 0.10 * hash21(q * 8.0 + vec2(113.0));
    n += 0.05 * hash21(q * 16.0 + vec2(191.0));
    return n;
}

vec3 rayDir(vec2 frag, vec2 res, vec2 offset, float dist){
    float focal = res.y * max(dist, 1e-3);
    return normalize(vec3(2.0 * (frag - offset) - res, focal));
}

float edgeFade(vec2 frag, vec2 res, vec2 offset){
    vec2 toC = frag - 0.5 * res - offset;
    float r = length(toC) / (0.5 * min(res.x, res.y));
    float x = clamp(r, 0.0, 1.0);
    float q = x * x * x * (x * (x * 6.0 - 15.0) + 10.0);
    float s = q * 0.5;
    s = pow(s, 1.5);
    float tail = 1.0 - pow(1.0 - s, 2.0);
    s = mix(s, tail, 0.2);
    float dn = (layeredNoise(frag * 0.15) - 0.5) * 0.0015 * s;
    return clamp(s + dn, 0.0, 1.0);
}

mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1.0,0.0,0.0, 0.0,c,-s, 0.0,s,c); }
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c,0.0,s, 0.0,1.0,0.0, -s,0.0,c); }
mat3 rotZ(float a){ float c = cos(a), s = sin(a); return mat3(c,-s,0.0, s,c,0.0, 0.0,0.0,1.0); }

vec3 sampleGradient(float t){
    t = clamp(t, 0.0, 1.0);
    return texture(uGradient, vec2(t, 0.5)).rgb;
}

vec2 rot2(vec2 v, float a){
    float s = sin(a), c = cos(a);
    return mat2(c, -s, s, c) * v;
}

float bendAngle(vec3 q, float t){
    float a = 0.8 * sin(q.x * 0.55 + t * 0.6)
            + 0.7 * sin(q.y * 0.50 - t * 0.5)
            + 0.6 * sin(q.z * 0.60 + t * 0.7);
    return a;
}

void main(){
    vec2 frag = gl_FragCoord.xy;
    float t = uTime * uSpeed;
    float jitterAmp = 0.1 * clamp(uNoiseAmount, 0.0, 1.0);
    vec3 dir = rayDir(frag, uResolution, uOffset, 1.0);
    float marchT = 0.0;
    vec3 col = vec3(0.0);
    float n = layeredNoise(frag);
    vec4 c = cos(t * 0.2 + vec4(0.0, 33.0, 11.0, 0.0));
    mat2 M2 = mat2(c.x, c.y, c.z, c.w);
    float amp = clamp(uDistort, 0.0, 50.0) * 0.15;

    mat3 rot3dMat = mat3(1.0);
    if(uAnimType == 1){
      vec3 ang = vec3(t * 0.31, t * 0.21, t * 0.17);
      rot3dMat = rotZ(ang.z) * rotY(ang.y) * rotX(ang.x);
    }
    mat3 hoverMat = mat3(1.0);
    if(uAnimType == 2){
      vec2 m = uMouse * 2.0 - 1.0;
      vec3 ang = vec3(m.y * 0.6, m.x * 0.6, 0.0);
      hoverMat = rotY(ang.y) * rotX(ang.x);
    }

    for (int i = 0; i < 44; ++i) {
        vec3 P = marchT * dir;
        P.z -= 2.0;
        float rad = length(P);
        vec3 Pl = P * (10.0 / max(rad, 1e-6));

        if(uAnimType == 0){
            Pl.xz *= M2;
        } else if(uAnimType == 1){
            Pl = rot3dMat * Pl;
        } else {
            Pl = hoverMat * Pl;
        }

        float stepLen = min(rad - 0.3, n * jitterAmp) + 0.1;

        float grow = smoothstep(0.35, 3.0, marchT);
        float a1 = amp * grow * bendAngle(Pl * 0.6, t);
        float a2 = 0.5 * amp * grow * bendAngle(Pl.zyx * 0.5 + vec3(3.1), t * 0.9);
        vec3 Pb = Pl;
        Pb.xz = rot2(Pb.xz, a1);
        Pb.xy = rot2(Pb.xy, a2);

        float rayPattern = smoothstep(
            0.1, 0.55,
            sin(Pb.x + cos(Pb.y) * cos(Pb.z)) *
            sin(Pb.z + sin(Pb.y) * cos(Pb.x + t))
        );

        if (uRayCount > 0) {
            float ang = atan(Pb.y, Pb.x);
            float comb = 0.5 + 0.5 * cos(float(uRayCount) * ang);
            comb = pow(comb, 1.5);
            rayPattern *= smoothstep(0.05, 0.85, comb);
        }

        vec3 spectralDefault = vec3(1.0) + vec3(
            cos(marchT * 3.0 + 0.0),
            cos(marchT * 3.0 + 1.0),
            cos(marchT * 3.0 + 2.0)
        );

        float saw = fract(marchT * 0.25);
        float tRay = saw * saw * (3.0 - 2.0 * saw);
        vec3 userGradient = 2.0 * sampleGradient(tRay);
        vec3 spectral = (uColorCount > 0) ? userGradient : spectralDefault;
        vec3 base = (0.05 / (0.4 + stepLen))
                  * smoothstep(5.0, 0.0, rad)
                  * spectral;

        col += base * rayPattern;
        marchT += stepLen;
    }

    col *= edgeFade(frag, uResolution, uOffset);
    col *= uIntensity;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}`;

class PrismaticBurstShader {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl2');
    if (!this.gl) {
      console.error('WebGL2 is required for PrismaticBurst');
      return;
    }

    this.config = {
      intensity: 2,
      speed: 0.5,
      animationType: 'rotate3d',
      colors: [],
      distort: 0,
      paused: false,
      offset: { x: 0, y: 0 },
      hoverDampness: 0,
      rayCount: 0,
      mixBlendMode: 'normal',
      noiseAmount: 0.8,
      ...config
    };

    this.mouseTarget = [0.5, 0.5];
    this.mouseSmooth = [0.5, 0.5];
    this.accumTime = 0;
    this.lastTime = performance.now();
    this.animationId = null;

    this.initWebGL();
    this.setupEvents();
    this.updateGradientTexture();
    this.start();
  }

  initWebGL() {
    const gl = this.gl;

    const compileShader = (source, type) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const vert = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const frag = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

    this.program = gl.createProgram();
    gl.attachShader(this.program, vert);
    gl.attachShader(this.program, frag);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(this.program));
      return;
    }

    // Full screen triangle with positions & UVs in one buffer
    // Positions: [-1,-1], [3,-1], [-1,3]
    // UVs: [0,0], [2,0], [0,2]
    const vertices = new Float32Array([
      -1.0, -1.0,  0.0,  0.0,
       3.0, -1.0,  2.0,  0.0,
      -1.0,  3.0,  0.0,  2.0
    ]);

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.positionAttrib = gl.getAttribLocation(this.program, 'position');
    this.uvAttrib = gl.getAttribLocation(this.program, 'uv');

    // Gradient 1D/2D Texture
    this.gradientTex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.gradientTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));

    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Uniform locations
    this.uniforms = {
      uResolution: gl.getUniformLocation(this.program, 'uResolution'),
      uTime: gl.getUniformLocation(this.program, 'uTime'),
      uIntensity: gl.getUniformLocation(this.program, 'uIntensity'),
      uSpeed: gl.getUniformLocation(this.program, 'uSpeed'),
      uAnimType: gl.getUniformLocation(this.program, 'uAnimType'),
      uMouse: gl.getUniformLocation(this.program, 'uMouse'),
      uColorCount: gl.getUniformLocation(this.program, 'uColorCount'),
      uDistort: gl.getUniformLocation(this.program, 'uDistort'),
      uOffset: gl.getUniformLocation(this.program, 'uOffset'),
      uGradient: gl.getUniformLocation(this.program, 'uGradient'),
      uNoiseAmount: gl.getUniformLocation(this.program, 'uNoiseAmount'),
      uRayCount: gl.getUniformLocation(this.program, 'uRayCount')
    };
  }

  setupEvents() {
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
    this.resize();

    this.pointerHandler = e => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / Math.max(rect.width, 1);
      const y = (e.clientY - rect.top) / Math.max(rect.height, 1);
      this.mouseTarget = [Math.min(Math.max(x, 0), 1), Math.min(Math.max(y, 0), 1)];
    };
    window.addEventListener('pointermove', this.pointerHandler, { passive: true });
  }

  resize() {
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const wCSS = window.innerWidth;
    const hCSS = window.innerHeight;
    this.canvas.width = wCSS * dpr;
    this.canvas.height = hCSS * dpr;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  updateGradientTexture() {
    const gl = this.gl;
    const colors = this.config.colors;
    let count = 0;

    gl.bindTexture(gl.TEXTURE_2D, this.gradientTex);

    if (Array.isArray(colors) && colors.length > 0) {
      const capped = colors.slice(0, 64);
      count = capped.length;
      const data = new Uint8Array(count * 4);
      for (let i = 0; i < count; i++) {
        const [r, g, b] = hexToRgb01(capped[i]);
        data[i * 4 + 0] = Math.round(r * 255);
        data[i * 4 + 1] = Math.round(g * 255);
        data[i * 4 + 2] = Math.round(b * 255);
        data[i * 4 + 3] = 255;
      }
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, count, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    } else {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
    }
    this.colorCount = count;
  }

  updateConfig(newConfig = {}) {
    const originalColors = this.config.colors;
    this.config = { ...this.config, ...newConfig };
    
    // Update blend mode
    if (newConfig.mixBlendMode !== undefined) {
      this.canvas.style.mixBlendMode = this.config.mixBlendMode && this.config.mixBlendMode !== 'none' ? this.config.mixBlendMode : '';
    }

    // Refresh texture if colors changed
    if (newConfig.colors !== undefined && JSON.stringify(newConfig.colors) !== JSON.stringify(originalColors)) {
      this.updateGradientTexture();
    }
  }

  start() {
    const gl = this.gl;
    
    if (this.config.mixBlendMode && this.config.mixBlendMode !== 'none') {
      this.canvas.style.mixBlendMode = this.config.mixBlendMode;
    }

    const render = now => {
      this.animationId = requestAnimationFrame(render);

      const dt = Math.max(0, now - this.lastTime) * 0.001;
      this.lastTime = now;

      if (!this.config.paused) {
        this.accumTime += dt;
      }

      // Smooth mouse follow
      const tau = 0.02 + Math.max(0, Math.min(1, this.config.hoverDampness)) * 0.5;
      const alpha = 1 - Math.exp(-dt / tau);
      this.mouseSmooth[0] += (this.mouseTarget[0] - this.mouseSmooth[0]) * alpha;
      this.mouseSmooth[1] += (this.mouseTarget[1] - this.mouseSmooth[1]) * alpha;

      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.program);

      // Attribute buffers setup
      gl.enableVertexAttribArray(this.positionAttrib);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.vertexAttribPointer(this.positionAttrib, 2, gl.FLOAT, false, 16, 0);

      gl.enableVertexAttribArray(this.uvAttrib);
      gl.vertexAttribPointer(this.uvAttrib, 2, gl.FLOAT, false, 16, 8);

      // Active texture setup
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.gradientTex);
      gl.uniform1i(this.uniforms.uGradient, 0);

      // Uniform values binding
      gl.uniform2f(this.uniforms.uResolution, this.canvas.width, this.canvas.height);
      gl.uniform1f(this.uniforms.uTime, this.accumTime);
      gl.uniform1f(this.uniforms.uIntensity, this.config.intensity);
      gl.uniform1f(this.uniforms.uSpeed, this.config.speed);

      const animTypeMap = { rotate: 0, rotate3d: 1, hover: 2 };
      gl.uniform1i(this.uniforms.uAnimType, animTypeMap[this.config.animationType] ?? 1);
      gl.uniform2f(this.uniforms.uMouse, this.mouseSmooth[0], this.mouseSmooth[1]);
      gl.uniform1i(this.uniforms.uColorCount, this.colorCount);
      gl.uniform1f(this.uniforms.uDistort, this.config.distort);

      const ox = toPxVal(this.config.offset?.x);
      const oy = toPxVal(this.config.offset?.y);
      gl.uniform2f(this.uniforms.uOffset, ox, oy);
      gl.uniform1f(this.uniforms.uNoiseAmount, this.config.noiseAmount);
      gl.uniform1i(this.uniforms.uRayCount, Math.max(0, Math.floor(this.config.rayCount)));

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    this.animationId = requestAnimationFrame(render);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('pointermove', this.pointerHandler);

    try {
      const gl = this.gl;
      if (this.gradientTex) gl.deleteTexture(this.gradientTex);
      if (this.vertexBuffer) gl.deleteBuffer(this.vertexBuffer);
      if (this.program) gl.deleteProgram(this.program);
      
      const loseContext = gl.getExtension('WEBGL_lose_context');
      if (loseContext) {
        loseContext.loseContext();
      }
    } catch (e) {
      console.warn('PrismaticBurst cleanup error:', e);
    }
  }
}

// Expose globally
window.PrismaticBurstShader = PrismaticBurstShader;
