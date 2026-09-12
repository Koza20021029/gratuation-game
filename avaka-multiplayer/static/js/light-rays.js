// light-rays.js — WebGL Light Ray Shader Effect

const DEFAULT_COLOR = '#ffffff';

const hexToRgb = hex => {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1], 16) / 255, parseInt(m[2], 16) / 255, parseInt(m[3], 16) / 255] : [1, 1, 1];
};

const getAnchorAndDir = (origin, w, h) => {
  const outside = 0.2;
  switch (origin) {
    case 'top-left':
      return { anchor: [0, -outside * h], dir: [0, 1] };
    case 'top-right':
      return { anchor: [w, -outside * h], dir: [0, 1] };
    case 'left':
      return { anchor: [-outside * w, 0.5 * h], dir: [1, 0] };
    case 'right':
      return { anchor: [(1 + outside) * w, 0.5 * h], dir: [-1, 0] };
    case 'bottom-left':
      return { anchor: [0, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-center':
      return { anchor: [0.5 * w, (1 + outside) * h], dir: [0, -1] };
    case 'bottom-right':
      return { anchor: [w, (1 + outside) * h], dir: [0, -1] };
    default: // "top-center"
      return { anchor: [0.5 * w, -outside * h], dir: [0, 1] };
  }
};

class LightRaysShader {
  constructor(canvas, config = {}) {
    this.canvas = canvas;
    this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!this.gl) {
      console.error('WebGL not supported');
      return;
    }

    this.config = {
      raysOrigin: 'top-center',
      raysColor: DEFAULT_COLOR,
      raysSpeed: 1.0,
      lightSpread: 1.0,
      rayLength: 2.0,
      pulsating: true, // Default to true for a nice breathing look
      fadeDistance: 1.0,
      saturation: 1.0,
      followMouse: true,
      mouseInfluence: 0.15,
      noiseAmount: 0.05,
      distortion: 0.08, // soft waves
      ...config
    };

    this.mouse = { x: 0.5, y: 0.5 };
    this.smoothMouse = { x: 0.5, y: 0.5 };
    this.animationId = null;

    this.initWebGL();
    this.setupEvents();
    this.start();
  }

  initWebGL() {
    const gl = this.gl;

    // Vertex Shader
    const vertSource = `
      attribute vec2 position;
      varying vec2 vUv;
      void main() {
        vUv = position * 0.5 + 0.5;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

    // Fragment Shader (identical to React OGL shader but standard WebGL syntax)
    const fragSource = `
      precision highp float;

      uniform float iTime;
      uniform vec2  iResolution;

      uniform vec2  rayPos;
      uniform vec2  rayDir;
      uniform vec3  raysColor;
      uniform float raysSpeed;
      uniform float lightSpread;
      uniform float rayLength;
      uniform float pulsating;
      uniform float fadeDistance;
      uniform float saturation;
      uniform vec2  mousePos;
      uniform float mouseInfluence;
      uniform float noiseAmount;
      uniform float distortion;

      varying vec2 vUv;

      float noise(vec2 st) {
        return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
      }

      float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord,
                        float seedA, float seedB, float speed) {
        vec2 sourceToCoord = coord - raySource;
        vec2 dirNorm = normalize(sourceToCoord);
        float cosAngle = dot(dirNorm, rayRefDirection);

        float distortedAngle = cosAngle + distortion * sin(iTime * 2.0 + length(sourceToCoord) * 0.01) * 0.2;
        
        float spreadFactor = pow(max(distortedAngle, 0.0), 1.0 / max(lightSpread, 0.001));

        float distance = length(sourceToCoord);
        float maxDistance = iResolution.x * rayLength;
        float lengthFalloff = clamp((maxDistance - distance) / maxDistance, 0.0, 1.0);
        
        float fadeFalloff = clamp((iResolution.x * fadeDistance - distance) / (iResolution.x * fadeDistance), 0.5, 1.0);
        float pulse = pulsating > 0.5 ? (0.8 + 0.2 * sin(iTime * speed * 3.0)) : 1.0;

        float baseStrength = clamp(
          (0.45 + 0.15 * sin(distortedAngle * seedA + iTime * speed)) +
          (0.3 + 0.2 * cos(-distortedAngle * seedB + iTime * speed)),
          0.0, 1.0
        );

        return baseStrength * lengthFalloff * fadeFalloff * spreadFactor * pulse;
      }

      void mainImage(out vec4 fragColor, in vec2 fragCoord) {
        vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
        
        vec2 finalRayDir = rayDir;
        if (mouseInfluence > 0.0) {
          vec2 mouseScreenPos = mousePos * iResolution.xy;
          vec2 mouseDirection = normalize(mouseScreenPos - rayPos);
          finalRayDir = normalize(mix(rayDir, mouseDirection, mouseInfluence));
        }

        vec4 rays1 = vec4(1.0) *
                     rayStrength(rayPos, finalRayDir, coord, 36.2214, 21.11349,
                                 1.5 * raysSpeed);
        vec4 rays2 = vec4(1.0) *
                     rayStrength(rayPos, finalRayDir, coord, 22.3991, 18.0234,
                                 1.1 * raysSpeed);

        fragColor = rays1 * 0.5 + rays2 * 0.4;

        if (noiseAmount > 0.0) {
          float n = noise(coord * 0.01 + iTime * 0.1);
          fragColor.rgb *= (1.0 - noiseAmount + noiseAmount * n);
        }

        float brightness = 1.0 - (coord.y / iResolution.y);
        fragColor.x *= 0.1 + brightness * 0.8;
        fragColor.y *= 0.3 + brightness * 0.6;
        fragColor.z *= 0.5 + brightness * 0.5;

        if (saturation != 1.0) {
          float gray = dot(fragColor.rgb, vec3(0.299, 0.587, 0.114));
          fragColor.rgb = mix(vec3(gray), fragColor.rgb, saturation);
        }

        fragColor.rgb *= raysColor;
      }

      void main() {
        vec4 color;
        mainImage(color, gl_FragCoord.xy);
        gl_FragColor = color;
      }
    `;

    // Compile Helper
    const compileShader = (source, type) => {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compilation error:', gl.getShaderInfoLog(shader));
        return null;
      }
      return shader;
    };

    const vertShader = compileShader(vertSource, gl.VERTEX_SHADER);
    const fragShader = compileShader(fragSource, gl.FRAGMENT_SHADER);

    // Create Program
    this.program = gl.createProgram();
    gl.attachShader(this.program, vertShader);
    gl.attachShader(this.program, fragShader);
    gl.linkProgram(this.program);

    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error('Program linking error:', gl.getProgramInfoLog(this.program));
      return;
    }

    // Full screen triangle positions (3 vertices cover whole clip space)
    const vertices = new Float32Array([
      -1.0, -1.0,
       3.0, -1.0,
      -1.0,  3.0
    ]);

    this.vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

    this.positionAttrib = gl.getAttribLocation(this.program, 'position');

    // Uniform Locations
    this.uniforms = {
      iTime: gl.getUniformLocation(this.program, 'iTime'),
      iResolution: gl.getUniformLocation(this.program, 'iResolution'),
      rayPos: gl.getUniformLocation(this.program, 'rayPos'),
      rayDir: gl.getUniformLocation(this.program, 'rayDir'),
      raysColor: gl.getUniformLocation(this.program, 'raysColor'),
      raysSpeed: gl.getUniformLocation(this.program, 'raysSpeed'),
      lightSpread: gl.getUniformLocation(this.program, 'lightSpread'),
      rayLength: gl.getUniformLocation(this.program, 'rayLength'),
      pulsating: gl.getUniformLocation(this.program, 'pulsating'),
      fadeDistance: gl.getUniformLocation(this.program, 'fadeDistance'),
      saturation: gl.getUniformLocation(this.program, 'saturation'),
      mousePos: gl.getUniformLocation(this.program, 'mousePos'),
      mouseInfluence: gl.getUniformLocation(this.program, 'mouseInfluence'),
      noiseAmount: gl.getUniformLocation(this.program, 'noiseAmount'),
      distortion: gl.getUniformLocation(this.program, 'distortion')
    };
  }

  setupEvents() {
    this.resizeHandler = () => this.resize();
    window.addEventListener('resize', this.resizeHandler);
    this.resize();

    this.mouseHandler = e => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - rect.left) / rect.width;
      this.mouse.y = (e.clientY - rect.top) / rect.height;
    };

    if (this.config.followMouse) {
      window.addEventListener('mousemove', this.mouseHandler);
    }
  }

  resize() {
    const gl = this.gl;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const wCSS = window.innerWidth;
    const hCSS = window.innerHeight;
    
    this.canvas.width = wCSS * dpr;
    this.canvas.height = hCSS * dpr;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  updateConfig(newConfig = {}) {
    this.config = { ...this.config, ...newConfig };
  }

  start() {
    const gl = this.gl;
    const render = t => {
      this.animationId = requestAnimationFrame(render);

      // Handle Damping on Mouse
      if (this.config.followMouse && this.config.mouseInfluence > 0.0) {
        const smoothing = 0.92;
        this.smoothMouse.x = this.smoothMouse.x * smoothing + this.mouse.x * (1 - smoothing);
        this.smoothMouse.y = this.smoothMouse.y * smoothing + this.mouse.y * (1 - smoothing);
      }

      gl.clear(gl.COLOR_BUFFER_BIT);

      gl.useProgram(this.program);

      // Position attribute
      gl.enableVertexAttribArray(this.positionAttrib);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer);
      gl.vertexAttribPointer(this.positionAttrib, 2, gl.FLOAT, false, 0, 0);

      // Uniforms updates
      gl.uniform1f(this.uniforms.iTime, t * 0.001);
      gl.uniform2f(this.uniforms.iResolution, this.canvas.width, this.canvas.height);

      const { anchor, dir } = getAnchorAndDir(this.config.raysOrigin, this.canvas.width, this.canvas.height);
      gl.uniform2f(this.uniforms.rayPos, anchor[0], anchor[1]);
      gl.uniform2f(this.uniforms.rayDir, dir[0], dir[1]);

      const rgb = hexToRgb(this.config.raysColor);
      gl.uniform3f(this.uniforms.raysColor, rgb[0], rgb[1], rgb[2]);
      gl.uniform1f(this.uniforms.raysSpeed, this.config.raysSpeed);
      gl.uniform1f(this.uniforms.lightSpread, this.config.lightSpread);
      gl.uniform1f(this.uniforms.rayLength, this.config.rayLength);
      gl.uniform1f(this.uniforms.pulsating, this.config.pulsating ? 1.0 : 0.0);
      gl.uniform1f(this.uniforms.fadeDistance, this.config.fadeDistance);
      gl.uniform1f(this.uniforms.saturation, this.config.saturation);
      gl.uniform2f(this.uniforms.mousePos, this.smoothMouse.x, this.smoothMouse.y);
      gl.uniform1f(this.uniforms.mouseInfluence, this.config.mouseInfluence);
      gl.uniform1f(this.uniforms.noiseAmount, this.config.noiseAmount);
      gl.uniform1f(this.uniforms.distortion, this.config.distortion);

      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    this.animationId = requestAnimationFrame(render);
  }

  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.resizeHandler);
    window.removeEventListener('mousemove', this.mouseHandler);

    const loseContext = this.gl.getExtension('WEBGL_lose_context');
    if (loseContext) {
      loseContext.loseContext();
    }
  }
}

// Global expose
window.LightRaysShader = LightRaysShader;
