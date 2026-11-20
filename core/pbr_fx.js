/* Studio Core — AAA 级 WebGL PBR 图形内核（Sobel 法线/粗糙度贴图生成、PMREM 环境反射 IBL、体积神光/动态水体 GLSL、HDR 泛光与电影调色后处理） */
(function (G) {
  'use strict';
  const Studio = (G.Studio = G.Studio || {});
  const PBR = (Studio.PBR = {});

  const canvasPool = new Map();

  /**
   * 3x3 Sobel 滤波：将灰度高度图转换为高精度切线空间法线贴图 Canvas
   */
  PBR.heightToNormalCanvas = function (heightCanvas, strength = 2.6) {
    const w = heightCanvas.width;
    const h = heightCanvas.height;
    const hCtx = heightCanvas.getContext('2d');
    const src = hCtx.getImageData(0, 0, w, h).data;

    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const oCtx = out.getContext('2d');
    const dstImg = oCtx.createImageData(w, h);
    const dst = dstImg.data;

    const sample = (x, y) => {
      const wx = (x + w) % w;
      const wy = (y + h) % h;
      return src[(wy * w + wx) * 4] / 255;
    };

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const tl = sample(x - 1, y - 1);
        const t = sample(x, y - 1);
        const tr = sample(x + 1, y - 1);
        const l = sample(x - 1, y);
        const r = sample(x + 1, y);
        const bl = sample(x - 1, y + 1);
        const b = sample(x, y + 1);
        const br = sample(x + 1, y + 1);

        const dX = (tr + 2 * r + br) - (tl + 2 * l + bl);
        const dY = (bl + 2 * b + br) - (tl + 2 * t + tr);
        let nx = -dX * strength;
        let ny = -dY * strength;
        let nz = 1.0;
        const invLen = 1 / Math.hypot(nx, ny, nz);
        nx *= invLen;
        ny *= invLen;
        nz *= invLen;

        const idx = (y * w + x) * 4;
        dst[idx] = Math.round((nx * 0.5 + 0.5) * 255);
        dst[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
        dst[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
        dst[idx + 3] = 255;
      }
    }
    oCtx.putImageData(dstImg, 0, 0);
    return out;
  };

  /**
   * 缓存生成一套完整 PBR 三贴图（Albedo + Normal + Roughness）
   * 每次返回独立 THREE.CanvasTexture 实例，确保 Studio.disposeObject 安全回收互不干扰
   */
  PBR.makePBRTextures = function (key, size, drawFn, opts = {}) {
    const THREE = G.THREE;
    let entry = canvasPool.get(key);
    if (!entry) {
      const albedoC = document.createElement('canvas');
      const heightC = document.createElement('canvas');
      const roughC = document.createElement('canvas');
      albedoC.width = heightC.width = roughC.width = size;
      albedoC.height = heightC.height = roughC.height = size;
      drawFn(
        albedoC.getContext('2d'),
        heightC.getContext('2d'),
        roughC.getContext('2d'),
        size
      );
      const normalC = PBR.heightToNormalCanvas(heightC, opts.normalStrength || 2.8);
      entry = { albedoC, normalC, roughC };
      canvasPool.set(key, entry);
    }

    const wrap = opts.repeat !== false ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping;
    const rx = opts.repeatX || 1;
    const ry = opts.repeatY || 1;

    const makeTex = (canvas, isSRGB) => {
      const t = new THREE.CanvasTexture(canvas);
      t.wrapS = t.wrapT = wrap;
      t.repeat.set(rx, ry);
      if (isSRGB) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 4;
      return t;
    };

    return {
      map: makeTex(entry.albedoC, true),
      normalMap: makeTex(entry.normalC, false),
      roughnessMap: makeTex(entry.roughC, false),
    };
  };

  /**
   * 程序化 PMREM HDR 风格环境光照贴图（赋予金属/黄金/枪械/湿石真实物理高光反射）
   */
  PBR.createEnvMap = function (gl, cfg = {}) {
    const THREE = G.THREE;
    const pmrem = new THREE.PMREMGenerator(gl);
    pmrem.compileEquirectangularShader();

    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(cfg.bg || 0x1b2b3a);

    // 柔和半球穹顶
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(24, 16, 12),
      new THREE.MeshBasicMaterial({ color: cfg.sky || 0x4b7494, side: THREE.BackSide })
    );
    envScene.add(dome);

    // 主阳光高光反射板
    const sunPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.MeshBasicMaterial({ color: cfg.sun || 0xfff5db, side: THREE.DoubleSide })
    );
    sunPanel.position.set(10, 14, -8);
    sunPanel.lookAt(0, 0, 0);
    envScene.add(sunPanel);

    // 暖色火把/地面反射面板（电影青橙对比核心！）
    const warmPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 8),
      new THREE.MeshBasicMaterial({ color: cfg.warm || 0xf59e0b, side: THREE.DoubleSide })
    );
    warmPanel.position.set(-12, 2, 10);
    warmPanel.lookAt(0, 0, 0);
    envScene.add(warmPanel);

    // 冷色轮廓光面板
    const coolPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 10),
      new THREE.MeshBasicMaterial({ color: cfg.cool || 0x38bdf8, side: THREE.DoubleSide })
    );
    coolPanel.position.set(0, 8, 14);
    coolPanel.lookAt(0, 0, 0);
    envScene.add(coolPanel);

    const envRT = pmrem.fromScene(envScene, 0.045);
    Studio.disposeObject(envScene);
    pmrem.dispose();
    return envRT;
  };

  /**
   * 柔边体积丁达尔神光柱 GLSL（按视角法线软边缘衰减 + 上下渐变，彻底消除硬几何切边！）
   */
  PBR.createGodRayMaterial = function (hexColor = 0xfef3c7, opacity = 0.22) {
    const THREE = G.THREE;
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      uniforms: {
        uColor: { value: new THREE.Color(hexColor) },
        uOpacity: { value: opacity },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
          vNormalV = normalize(normalMatrix * normal);
          vViewDir = normalize(-mvPos.xyz);
          gl_Position = projectionMatrix * mvPos;
        }
      `,
      fragmentShader: `
        uniform vec3 uColor;
        uniform float uOpacity;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vNormalV;
        varying vec3 vViewDir;
        void main() {
          float fres = pow(abs(dot(normalize(vNormalV), normalize(vViewDir))), 1.7);
          float vFade = smoothstep(0.0, 0.28, vUv.y) * smoothstep(1.0, 0.55, vUv.y);
          float streak = 0.78 + 0.22 * sin(vUv.x * 18.84 + uTime * 0.45);
          float a = fres * vFade * streak * uOpacity;
          gl_FragColor = vec4(uColor, a);
        }
      `,
    });
  };

  /**
   * 动态水波反光 + 焦散波纹 GLSL 水体材质（适用于维尔卡班巴古水池 / 失落山谷碧玉溪流）
   */
  PBR.createWaterMaterial = function (deepHex = 0x064e5f, shallowHex = 0x22d3ee) {
    const THREE = G.THREE;
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uDeep: { value: new THREE.Color(deepHex) },
        uShallow: { value: new THREE.Color(shallowHex) },
        uTime: { value: 0 },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 uDeep;
        uniform vec3 uShallow;
        uniform float uTime;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vec2 p = vWorldPos.xz * 0.42;
          float w1 = sin(p.x * 2.1 + uTime * 1.4) * cos(p.y * 1.8 - uTime * 1.1);
          float w2 = sin((p.x + p.y) * 3.3 - uTime * 1.9);
          float caustic = smoothstep(0.45, 0.95, (w1 + w2) * 0.5 + 0.5);
          float glint = pow(max(0.0, (w1 * 0.6 + w2 * 0.4)), 4.0);
          vec3 col = mix(uDeep, uShallow, 0.35 + caustic * 0.42) + vec3(0.85, 0.98, 1.0) * glint * 0.55;
          gl_FragColor = vec4(col, 0.90);
        }
      `,
    });
  };

  /**
   * 轻量高效 3A 电影后处理管线：
   * Pass 1: 离屏主场景渲染 -> rtMain
   * Pass 2: 半分辨率高光提取 + 水平泛光模糊 -> rtBloomA
   * Pass 3: 半分辨率垂直泛光模糊 -> rtBloomB
   * Pass 4: 合成屏幕输出（HDR Bloom 叠加 + 电影青橙调色 + 镜头暗角 + 求生本能褪色金光模式 + 肾上腺素子弹时间辉光）
   */
  class PostPipeline {
    constructor(gl) {
      const THREE = G.THREE;
      this.gl = gl;
      this.enabled = true;
      this.w = 1;
      this.h = 1;

      const rtOpts = {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
        depthBuffer: true,
      };
      this.rtMain = new THREE.WebGLRenderTarget(1, 1, rtOpts);
      this.rtBloomA = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: false });
      this.rtBloomB = new THREE.WebGLRenderTarget(1, 1, { ...rtOpts, depthBuffer: false });

      this.orthoCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.quadGeo = new THREE.PlaneGeometry(2, 2);

      // Pass 2: 亮部提取 + 水平 9-tap 柔化
      this.extractMat = new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: {
          tDiffuse: { value: null },
          uTexel: { value: new THREE.Vector2(1 / 640, 1 / 360) },
          uThreshold: { value: 0.66 },
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform vec2 uTexel;
          uniform float uThreshold;
          varying vec2 vUv;
          vec3 bright(vec2 uv) {
            vec3 c = texture2D(tDiffuse, uv).rgb;
            float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
            float k = smoothstep(uThreshold, uThreshold + 0.28, l);
            return c * k;
          }
          void main() {
            vec3 sum = bright(vUv) * 0.28;
            sum += (bright(vUv + vec2(uTexel.x * 1.5, 0.0)) + bright(vUv - vec2(uTexel.x * 1.5, 0.0))) * 0.22;
            sum += (bright(vUv + vec2(uTexel.x * 3.5, 0.0)) + bright(vUv - vec2(uTexel.x * 3.5, 0.0))) * 0.14;
            gl_FragColor = vec4(sum, 1.0);
          }
        `,
      });

      // Pass 3: 垂直 9-tap 柔化
      this.blurVMat = new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: {
          tDiffuse: { value: null },
          uTexel: { value: new THREE.Vector2(1 / 640, 1 / 360) },
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: `
          uniform sampler2D tDiffuse;
          uniform vec2 uTexel;
          varying vec2 vUv;
          void main() {
            vec3 sum = texture2D(tDiffuse, vUv).rgb * 0.28;
            sum += (texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y * 1.5)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y * 1.5)).rgb) * 0.22;
            sum += (texture2D(tDiffuse, vUv + vec2(0.0, uTexel.y * 3.5)).rgb + texture2D(tDiffuse, vUv - vec2(0.0, uTexel.y * 3.5)).rgb) * 0.14;
            gl_FragColor = vec4(sum, 1.0);
          }
        `,
      });

      // Pass 4: 最终电影合成（HDR Bloom + 微妙 S 曲线对比度 + 镜头暗角 + 求生本能/子弹时间滤镜）
      this.compMat = new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        uniforms: {
          tScene: { value: null },
          tBloom: { value: null },
          uBloomStrength: { value: 0.42 },
          uVignette: { value: 0.36 },
          uInstinct: { value: 0.0 },
          uAdrenaline: { value: 0.0 },
          uWarmth: { value: 0.06 },
        },
        vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
        fragmentShader: `
          uniform sampler2D tScene;
          uniform sampler2D tBloom;
          uniform float uBloomStrength;
          uniform float uVignette;
          uniform float uInstinct;
          uniform float uAdrenaline;
          uniform float uWarmth;
          varying vec2 vUv;
          void main() {
            vec3 col = texture2D(tScene, vUv).rgb;
            vec3 bloom = texture2D(tBloom, vUv).rgb;

            // 求生本能（现代古墓丽影标志性冷暗世界 + 黄金高亮物保留高饱和！）
            if (uInstinct > 0.01) {
              float gray = dot(col, vec3(0.299, 0.587, 0.114));
              float isGold = smoothstep(0.18, 0.45, (col.r + col.g * 0.8) - col.b * 1.65);
              vec3 coolMono = vec3(gray * 0.72, gray * 0.80, gray * 0.92);
              col = mix(col, mix(coolMono, col * 1.35 + vec3(0.16, 0.10, 0.0), isGold), uInstinct);
              bloom *= (1.0 + isGold * 1.35 * uInstinct);
            }

            // 叠加柔滑 HDR 泛光
            col += bloom * (uBloomStrength + uAdrenaline * 0.35);

            // 微妙电影级对比度与冷暖平衡（亮部微暖、暗部微青）
            float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
            col += mix(vec3(-0.012, 0.004, 0.022), vec3(uWarmth, uWarmth * 0.45, -uWarmth * 0.35), smoothstep(0.15, 0.85, lum));
            col = clamp(col * 1.04 - 0.015, 0.0, 1.0);

            // 肾上腺素子弹时间金晕
            if (uAdrenaline > 0.01) {
              col = mix(col, col * vec3(1.12, 1.04, 0.88), uAdrenaline * 0.65);
            }

            // 镜头自然光学暗角
            vec2 d = vUv - 0.5;
            float vig = 1.0 - dot(d, d) * (uVignette + uInstinct * 0.32 + uAdrenaline * 0.25);
            col *= clamp(vig, 0.35, 1.0);

            gl_FragColor = vec4(col, 1.0);
          }
        `,
      });

      this.fsScene = new THREE.Scene();
      this.fsMesh = new THREE.Mesh(this.quadGeo, this.extractMat);
      this.fsScene.add(this.fsMesh);
    }

    ensureSize(w, h) {
      const pr = Math.min(1.75, this.gl.getPixelRatio ? this.gl.getPixelRatio() : 1);
      const pw = Math.max(2, Math.floor(w * pr));
      const ph = Math.max(2, Math.floor(h * pr));
      if (this.w === pw && this.h === ph) return;
      this.w = pw;
      this.h = ph;
      this.rtMain.setSize(pw, ph);
      const bw = Math.max(2, Math.floor(pw * 0.45));
      const bh = Math.max(2, Math.floor(ph * 0.45));
      this.rtBloomA.setSize(bw, bh);
      this.rtBloomB.setSize(bw, bh);
      this.extractMat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
      this.blurVMat.uniforms.uTexel.value.set(1 / bw, 1 / bh);
    }

    render(scene, camera, w, h, opts = {}) {
      if (!this.enabled) {
        this.gl.setRenderTarget(null);
        this.gl.render(scene, camera);
        return;
      }
      this.ensureSize(w, h);

      // Pass 1: 渲染主 3D 场景到离屏缓冲区
      this.gl.setRenderTarget(this.rtMain);
      this.gl.clear();
      this.gl.render(scene, camera);

      // Pass 2: 亮部提取 + 水平泛光
      this.extractMat.uniforms.tDiffuse.value = this.rtMain.texture;
      this.extractMat.uniforms.uThreshold.value = opts.threshold != null ? opts.threshold : 0.64;
      this.fsMesh.material = this.extractMat;
      this.gl.setRenderTarget(this.rtBloomA);
      this.gl.render(this.fsScene, this.orthoCam);

      // Pass 3: 垂直泛光
      this.blurVMat.uniforms.tDiffuse.value = this.rtBloomA.texture;
      this.fsMesh.material = this.blurVMat;
      this.gl.setRenderTarget(this.rtBloomB);
      this.gl.render(this.fsScene, this.orthoCam);

      // Pass 4: 最终合成输出至屏幕
      this.compMat.uniforms.tScene.value = this.rtMain.texture;
      this.compMat.uniforms.tBloom.value = this.rtBloomB.texture;
      this.compMat.uniforms.uBloomStrength.value = opts.bloom != null ? opts.bloom : 0.44;
      this.compMat.uniforms.uVignette.value = opts.vignette != null ? opts.vignette : 0.42;
      this.compMat.uniforms.uInstinct.value = opts.instinct || 0;
      this.compMat.uniforms.uAdrenaline.value = opts.adrenaline || 0;
      this.compMat.uniforms.uWarmth.value = opts.warmth != null ? opts.warmth : 0.05;
      this.fsMesh.material = this.compMat;
      this.gl.setRenderTarget(null);
      this.gl.render(this.fsScene, this.orthoCam);
    }

    dispose() {
      this.rtMain.dispose();
      this.rtBloomA.dispose();
      this.rtBloomB.dispose();
      this.quadGeo.dispose();
      this.extractMat.dispose();
      this.blurVMat.dispose();
      this.compMat.dispose();
    }
  }

  PBR.PostPipeline = PostPipeline;
})(typeof window !== 'undefined' ? window : globalThis);
