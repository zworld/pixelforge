/* Studio Core — 跨游戏共享 Three.js 3D 基础舞台（单 WebGL 上下文复用、ACES 色调、渐变天空穹顶、安全 GPU 回收） */
(function (G) {
  'use strict';
  const Studio = (G.Studio = G.Studio || {});

  function disposeObject(root) {
    if (!root) return;
    root.traverse((obj) => {
      if (obj.geometry && typeof obj.geometry.dispose === 'function') obj.geometry.dispose();
      if (obj.material) {
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const m of mats) {
          if (!m) continue;
          if (m.map && typeof m.map.dispose === 'function') m.map.dispose();
          if (typeof m.dispose === 'function') m.dispose();
        }
      }
    });
    if (typeof root.clear === 'function') root.clear();
  }

  function createSkyDome(THREE) {
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTop: { value: new THREE.Color('#2b86e8') },
        uHorizon: { value: new THREE.Color('#b9e8ff') },
        uBottom: { value: new THREE.Color('#dcfce7') },
        uSunColor: { value: new THREE.Color('#fff5c2') },
        uSunDir: { value: new THREE.Vector3(0.35, 0.55, -0.75).normalize() },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 uTop;
        uniform vec3 uHorizon;
        uniform vec3 uBottom;
        uniform vec3 uSunColor;
        uniform vec3 uSunDir;
        varying vec3 vDir;
        void main() {
          vec3 d = normalize(vDir);
          float h = d.y;
          vec3 col = h >= 0.0
            ? mix(uHorizon, uTop, smoothstep(0.0, 0.85, h))
            : mix(uHorizon, uBottom, smoothstep(0.0, 0.45, -h));
          float sunDot = max(dot(d, normalize(uSunDir)), 0.0);
          col += uSunColor * pow(sunDot, 22.0) * 0.42;
          col += uSunColor * smoothstep(0.994, 0.9985, sunDot) * 0.95;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    return new THREE.Mesh(new THREE.SphereGeometry(260, 24, 16), mat);
  }

  class Gfx3D {
    constructor() {
      this.gl = null;
      this.canvas = null;
      this.container = null;
      this.w = 1;
      this.h = 1;
    }

    ensure(container) {
      const THREE = G.THREE;
      if (!this.gl) {
        this.gl = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.gl.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        this.gl.shadowMap.enabled = true;
        this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
        this.gl.toneMapping = THREE.ACESFilmicToneMapping;
        this.gl.toneMappingExposure = 1.06;
        this.gl.domElement.id = 'view';
        this.gl.domElement.tabIndex = 0;
        this.canvas = this.gl.domElement;
      }
      if (container && this.canvas.parentElement !== container) {
        this.container = container;
        container.prepend(this.canvas);
      }
      this.resize();
      return this;
    }

    resize() {
      if (!this.gl || !this.container) return { w: this.w, h: this.h };
      const r = this.container.getBoundingClientRect();
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      this.gl.setSize(this.w, this.h);
      return { w: this.w, h: this.h };
    }

    clearScreen(hex = '#0b1120') {
      if (!this.gl) return;
      this.gl.setClearColor(hex, 1);
      this.gl.clear();
    }
  }

  Studio.Gfx3D = new Gfx3D();
  Studio.disposeObject = disposeObject;
  Studio.createSkyDome = createSkyDome;
})(typeof window !== 'undefined' ? window : globalThis);
