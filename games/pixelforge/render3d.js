/* PixelForge — 第一梯队 2.5D Three.js 渲染器（4 主题天空穹顶、程序化像素材质、动态光影、冲刺残影、全机关 3D 模型、幽灵竞速与轨迹回放） */
(function (G) {
  'use strict';
  const PF = G.PF;
  const THREE = G.THREE;
  const T = PF.TILE;

  // ---------- 4 大风格化主题配置 ----------
  const THEME_CFG = {
    meadow: {
      skyTop: '#2b86e8', skyHorizon: '#b9e8ff', skyBottom: '#dcfce7',
      sunColor: '#fff5c2', sunDir: [0.35, 0.55, -0.75],
      fog: '#bfe8ff', fogNear: 48, fogFar: 165,
      hemiSky: '#e8f7ff', hemiGround: '#5f7d4a', hemiInt: 1.55,
      sunLight: '#fff4dd', sunInt: 2.35,
      floorColor: '#6aa86f', hillColors: ['#69b584', '#8fd1a6'],
      ambientColor: '#fef08a', ambientMode: 'float',
      topColor: '#4caf50', topHi: '#7bd36b', topLo: '#388e3c',
      baseColor: '#8b5a2b', baseDark: '#6e4520', baseHi: '#a47340',
      gridColor: '#1e3a5f',
    },
    cyber: {
      skyTop: '#07041c', skyHorizon: '#2a1154', skyBottom: '#0a2942',
      sunColor: '#ff4ecd', sunDir: [-0.25, 0.35, -0.9],
      fog: '#1c0f3e', fogNear: 42, fogFar: 145,
      hemiSky: '#67e8f9', hemiGround: '#3b0764', hemiInt: 1.45,
      sunLight: '#e0f2fe', sunInt: 2.1,
      floorColor: '#0f172a', hillColors: ['#1e1b4b', '#311054'],
      ambientColor: '#38bdf8', ambientMode: 'rise',
      topColor: '#06b6d4', topHi: '#67e8f9', topLo: '#0e7490',
      baseColor: '#1e293b', baseDark: '#0f172a', baseHi: '#334155',
      gridColor: '#38bdf8',
    },
    frost: {
      skyTop: '#143263', skyHorizon: '#7cc4f5', skyBottom: '#e0f2fe',
      sunColor: '#e0f2fe', sunDir: [0.4, 0.5, -0.75],
      fog: '#b4dcf7', fogNear: 46, fogFar: 160,
      hemiSky: '#e0f2fe', hemiGround: '#64748b', hemiInt: 1.7,
      sunLight: '#f0f9ff', sunInt: 2.25,
      floorColor: '#cbd5e1', hillColors: ['#7ea8c9', '#a9cce3'],
      ambientColor: '#ffffff', ambientMode: 'snow',
      topColor: '#f1f5f9', topHi: '#ffffff', topLo: '#cbd5e1',
      baseColor: '#4b6884', baseDark: '#334c66', baseHi: '#6989a8',
      gridColor: '#1e3a8a',
    },
    volcano: {
      skyTop: '#1c050a', skyHorizon: '#6e1911', skyBottom: '#d9531e',
      sunColor: '#fb923c', sunDir: [0.25, 0.38, -0.88],
      fog: '#5c1812', fogNear: 40, fogFar: 140,
      hemiSky: '#fdba74', hemiGround: '#450a0a', hemiInt: 1.4,
      sunLight: '#ffedd5', sunInt: 2.4,
      floorColor: '#ea580c', hillColors: ['#2c181a', '#451d1e'],
      ambientColor: '#fb923c', ambientMode: 'rise',
      topColor: '#3f353b', topHi: '#f97316', topLo: '#261f24',
      baseColor: '#261f22', baseDark: '#171214', baseHi: '#3d3035',
      gridColor: '#fb923c',
    },
  };

  // ---------- 程序化像素纹理 ----------
  function makeTex(draw) {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const x = c.getContext('2d');
    draw(x);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function speckle(x, base, dots, seed = 7) {
    x.fillStyle = base; x.fillRect(0, 0, 16, 16);
    for (const [c, n] of dots) {
      x.fillStyle = c;
      for (let i = 0; i < n; i++) {
        seed = (seed * 16807) % 2147483647; const a = seed % 16;
        seed = (seed * 16807) % 2147483647; const b = seed % 16;
        x.fillRect(a, b, 1 + (seed % 2), 1);
      }
    }
  }

  function buildThemeTextures(cfg, themeId) {
    const dirt = makeTex((x) => {
      speckle(x, cfg.baseColor, [[cfg.baseDark, 18], [cfg.baseHi, 12]]);
      if (themeId === 'cyber') {
        x.fillStyle = 'rgba(56,189,248,0.28)';
        x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1);
        x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16);
      } else if (themeId === 'volcano') {
        x.fillStyle = 'rgba(249,115,22,0.45)';
        x.fillRect(3, 5, 4, 1); x.fillRect(7, 6, 3, 1); x.fillRect(10, 11, 3, 1);
      }
    });
    const top = makeTex((x) => {
      speckle(x, cfg.topColor, [[cfg.topHi, 16], [cfg.topLo, 12]], 11);
      if (themeId === 'cyber') {
        x.fillStyle = '#a5f3fc';
        x.fillRect(0, 0, 16, 1); x.fillRect(0, 15, 16, 1);
        x.fillRect(0, 0, 1, 16); x.fillRect(15, 0, 1, 16);
      }
    });
    const side = makeTex((x) => {
      speckle(x, cfg.baseColor, [[cfg.baseDark, 16], [cfg.baseHi, 12]]);
      x.fillStyle = cfg.topColor; x.fillRect(0, 0, 16, 4);
      x.fillStyle = cfg.topColor; [1, 4, 6, 9, 12, 14].forEach((i, k) => x.fillRect(i, 4, 1, 1 + (k % 3)));
      x.fillStyle = cfg.topHi; x.fillRect(0, 0, 16, 1);
      if (themeId === 'cyber') {
        x.fillStyle = '#22d3ee'; x.fillRect(0, 3, 16, 1);
      }
    });
    return { dirt, top, side };
  }

  const TEX = {};
  let sharedBuilt = false;
  const MAT = {};
  const lambert = (opts) => new THREE.MeshLambertMaterial(opts);
  const std = (opts) => new THREE.MeshStandardMaterial(opts);

  function buildSharedAssets() {
    if (sharedBuilt) return;
    sharedBuilt = true;
    TEX.brick = makeTex((x) => {
      x.fillStyle = '#c8642c'; x.fillRect(0, 0, 16, 16);
      x.fillStyle = '#e8915a'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 8, 16, 1);
      x.fillStyle = '#7a3412';
      x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1);
      x.fillRect(7, 0, 1, 7); x.fillRect(3, 8, 1, 7); x.fillRect(11, 8, 1, 7);
    });
    TEX.wood = makeTex((x) => {
      x.fillStyle = '#c79257'; x.fillRect(0, 0, 16, 16);
      x.fillStyle = '#a8763f'; for (let i = 0; i < 16; i += 4) x.fillRect(0, i + 3, 16, 1);
      x.fillStyle = '#e6b67c'; x.fillRect(0, 0, 16, 1);
      x.fillStyle = '#7a5230'; x.fillRect(5, 0, 1, 16); x.fillRect(11, 0, 1, 16);
    });
    TEX.ice = makeTex((x) => {
      x.fillStyle = '#7dd3fc'; x.fillRect(0, 0, 16, 16);
      x.fillStyle = '#e0f2fe'; x.fillRect(0, 0, 16, 2); x.fillRect(2, 3, 5, 2); x.fillRect(9, 8, 5, 2);
      x.fillStyle = '#38bdf8'; x.fillRect(0, 14, 16, 2); x.fillRect(14, 0, 2, 16);
      x.fillStyle = '#ffffff'; x.fillRect(3, 4, 2, 3); x.fillRect(10, 9, 2, 2);
    });
    TEX.crumble = makeTex((x) => {
      speckle(x, '#8c96a6', [['#64748b', 16], ['#cbd5e1', 10]], 19);
      x.fillStyle = '#1e293b';
      x.fillRect(5, 1, 1, 6); x.fillRect(6, 7, 3, 1); x.fillRect(9, 8, 1, 7);
      x.fillRect(11, 3, 1, 4); x.fillRect(2, 10, 4, 1);
      x.fillStyle = '#e2e8f0'; x.fillRect(0, 0, 16, 1);
    });
    TEX.redBlk = makeTex((x) => {
      x.fillStyle = '#ef4444'; x.fillRect(0, 0, 16, 16);
      x.fillStyle = '#fca5a5'; x.fillRect(0, 0, 16, 2); x.fillRect(0, 0, 2, 16);
      x.fillStyle = '#991b1b'; x.fillRect(0, 14, 16, 2); x.fillRect(14, 0, 2, 16);
      x.fillStyle = '#fee2e2'; x.fillRect(4, 4, 8, 2); x.fillRect(4, 4, 2, 8);
    });
    TEX.blueBlk = makeTex((x) => {
      x.fillStyle = '#3b82f6'; x.fillRect(0, 0, 16, 16);
      x.fillStyle = '#93c5fd'; x.fillRect(0, 0, 16, 2); x.fillRect(0, 0, 2, 16);
      x.fillStyle = '#1e3a8a'; x.fillRect(0, 14, 16, 2); x.fillRect(14, 0, 2, 16);
      x.fillStyle = '#dbeafe'; x.fillRect(4, 4, 8, 2); x.fillRect(4, 4, 2, 8);
    });

    MAT.brick = lambert({ map: TEX.brick });
    MAT.wood = lambert({ map: TEX.wood });
    MAT.ice = std({ map: TEX.ice, roughness: 0.14, metalness: 0.12, transparent: true, opacity: 0.88 });
    MAT.crumble = lambert({ map: TEX.crumble });
    MAT.redSolid = std({ map: TEX.redBlk, emissive: '#991b1b', emissiveIntensity: 0.35, roughness: 0.35 });
    MAT.blueSolid = std({ map: TEX.blueBlk, emissive: '#1e3a8a', emissiveIntensity: 0.35, roughness: 0.35 });
    MAT.redGhost = new THREE.MeshBasicMaterial({ color: '#ef4444', wireframe: true, transparent: true, opacity: 0.38 });
    MAT.blueGhost = new THREE.MeshBasicMaterial({ color: '#3b82f6', wireframe: true, transparent: true, opacity: 0.38 });
    MAT.switchOn = std({ color: '#ef4444', emissive: '#ef4444', emissiveIntensity: 0.75, roughness: 0.25 });
    MAT.switchOff = std({ color: '#3b82f6', emissive: '#3b82f6', emissiveIntensity: 0.75, roughness: 0.25 });
    MAT.switchFrame = std({ color: '#e2e8f0', metalness: 0.65, roughness: 0.3 });
    MAT.crystalReady = std({ color: '#10b981', emissive: '#34d399', emissiveIntensity: 0.7, metalness: 0.2, roughness: 0.12, transparent: true, opacity: 0.92 });
    MAT.crystalEmpty = new THREE.MeshBasicMaterial({ color: '#6ee7b7', wireframe: true, transparent: true, opacity: 0.28 });
    MAT.platBody = std({ color: '#38bdf8', metalness: 0.6, roughness: 0.25, emissive: '#0369a1', emissiveIntensity: 0.3 });
    MAT.platDeck = std({ color: '#0f172a', metalness: 0.5, roughness: 0.4 });
    MAT.thruster = new THREE.MeshBasicMaterial({ color: '#fb923c' });

    MAT.spike = std({ color: '#e2e8f0', metalness: 0.75, roughness: 0.25 });
    MAT.spikeBase = std({ color: '#475569', metalness: 0.55, roughness: 0.45 });
    MAT.coin = std({ color: '#ffcc33', metalness: 0.85, roughness: 0.2, emissive: '#8a5a00', emissiveIntensity: 0.4 });
    MAT.springBase = std({ color: '#4b5563', metalness: 0.6, roughness: 0.4 });
    MAT.springPad = std({ color: '#ef4444', emissive: '#7f1d1d', emissiveIntensity: 0.25, roughness: 0.45 });
    MAT.coil = std({ color: '#cbd5e1', metalness: 0.9, roughness: 0.2 });
    MAT.white = lambert({ color: '#ffffff' });
    MAT.black = lambert({ color: '#111111' });
    MAT.player = std({ color: '#2f80ed', roughness: 0.4, metalness: 0.1 });
    MAT.playerDark = std({ color: '#1d4ed8', roughness: 0.5 });
    MAT.bandReady = std({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.75, roughness: 0.25 });
    MAT.bandSpent = std({ color: '#94a3b8', emissive: '#334155', emissiveIntensity: 0.2, roughness: 0.6 });
    MAT.bandDash = std({ color: '#ffffff', emissive: '#e0f2fe', emissiveIntensity: 1.2, roughness: 0.1 });
    MAT.enemy = std({ color: '#8b5cf6', roughness: 0.45 });
    MAT.enemyDark = lambert({ color: '#3b2470' });
    MAT.pole = std({ color: '#e5e7eb', metalness: 0.65, roughness: 0.25 });
    MAT.gold = std({ color: '#facc15', metalness: 0.85, roughness: 0.2, emissive: '#854d0e', emissiveIntensity: 0.35 });
    MAT.flag = lambert({ color: '#22c55e', side: THREE.DoubleSide });
    MAT.cpIdle = std({ color: '#f59e0b', emissive: '#78350f', emissiveIntensity: 0.2, side: THREE.DoubleSide });
    MAT.cpActive = std({ color: '#38bdf8', emissive: '#0ea5e9', emissiveIntensity: 0.9, side: THREE.DoubleSide });
  }

  // ---------- 3D 模型构造 ----------
  function box(w, h, d, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  }

  function playerModel(mode) { // mode: 'hero' | 'ghost' | 'racer'
    const g = new THREE.Group();
    const body = new THREE.Group();
    const isRacer = mode === 'racer';
    const baseMat = isRacer
      ? new THREE.MeshBasicMaterial({ color: '#facc15', transparent: true, opacity: 0.45 })
      : MAT.player;
    const darkMat = isRacer ? baseMat : MAT.playerDark;
    const bandMat = isRacer ? baseMat : MAT.bandReady;

    body.add(box(0.75, 0.875, 0.62, baseMat, 0, 0.4375, 0));
    const band = box(0.79, 0.13, 0.66, bandMat, 0, 0.67, 0);
    body.add(band);
    body.add(box(0.77, 0.16, 0.64, darkMat, 0, 0.08, 0));
    if (!isRacer) {
      for (const ex of [-0.14, 0.14]) {
        body.add(box(0.13, 0.19, 0.02, MAT.white, ex, 0.48, 0.32));
        body.add(box(0.07, 0.12, 0.02, MAT.black, ex + 0.015, 0.46, 0.335));
      }
    }
    g.add(body);
    g.userData.body = body;
    g.userData.band = band;

    // Celeste 风格飘动围巾/发光发带拖尾（4 段体素）
    if (mode === 'hero') {
      const scarf = [];
      for (let i = 0; i < 4; i++) {
        const sz = 0.22 - i * 0.032;
        const seg = new THREE.Mesh(new THREE.BoxGeometry(sz, sz * 0.85, sz), MAT.bandReady);
        seg.castShadow = false;
        scarf.push(seg);
      }
      g.userData.scarf = scarf;
    }

    if (mode === 'ghost') {
      g.traverse((o) => {
        if (o.material) {
          o.material = o.material.clone();
          o.material.transparent = true;
          o.material.opacity = 0.55;
        }
      });
    }
    return g;
  }

  function enemyModel() {
    const g = new THREE.Group();
    g.add(box(0.8, 0.62, 0.7, MAT.enemy, 0, 0.44, 0));
    g.add(box(0.62, 0.08, 0.6, MAT.enemy, 0, 0.78, 0));
    const feet = [
      box(0.24, 0.14, 0.5, MAT.enemyDark, -0.22, 0.07, 0),
      box(0.24, 0.14, 0.5, MAT.enemyDark, 0.22, 0.07, 0),
    ];
    feet.forEach((f) => g.add(f));
    for (const ex of [-0.17, 0.17]) {
      g.add(box(0.18, 0.18, 0.02, MAT.white, ex, 0.5, 0.36));
      g.add(box(0.08, 0.12, 0.02, MAT.black, ex - 0.03, 0.48, 0.375));
      g.add(box(0.2, 0.05, 0.02, MAT.enemyDark, ex, 0.63, 0.36));
    }
    g.userData.feet = feet;
    return g;
  }

  function goalModel() {
    const g = new THREE.Group();
    const base = box(0.55, 0.2, 0.55, MAT.springBase, 0.5, 0.1, 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), MAT.pole);
    pole.position.set(0.5, 1.5, 0); pole.castShadow = true;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 8), MAT.gold);
    ball.position.set(0.5, 2.85, 0); ball.castShadow = true;
    const flagGeo = new THREE.PlaneGeometry(1.05, 0.62, 8, 1);
    flagGeo.translate(0.525, 0, 0);
    const flag = new THREE.Mesh(flagGeo, MAT.flag);
    flag.position.set(0.55, 2.45, 0); flag.castShadow = true;
    g.add(base, pole, ball, flag);
    g.userData.flag = flag;
    g.userData.flagBase = flagGeo.attributes.position.array.slice();
    return g;
  }

  function checkpointModel() {
    const g = new THREE.Group();
    g.add(box(0.46, 0.16, 0.46, MAT.springBase, 0.5, 0.08, 0));
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.45, 8), MAT.pole);
    pole.position.set(0.5, 0.85, 0); pole.castShadow = true;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), MAT.gold);
    gem.position.set(0.5, 1.65, 0);
    const flagGeo = new THREE.PlaneGeometry(0.68, 0.42, 4, 1);
    flagGeo.translate(0.34, 0, 0);
    const flag = new THREE.Mesh(flagGeo, MAT.cpIdle);
    flag.position.set(0.54, 1.32, 0);
    g.add(pole, gem, flag);
    g.userData.flag = flag;
    g.userData.gem = gem;
    return g;
  }

  function crystalModel() {
    const g = new THREE.Group();
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), MAT.crystalReady);
    core.scale.set(0.82, 1.18, 0.82);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.035, 8, 20), MAT.gold);
    g.add(core, ring);
    g.userData.core = core;
    g.userData.ring = ring;
    return g;
  }

  function switchModel() {
    const g = new THREE.Group();
    g.add(box(0.96, 0.96, 0.96, MAT.switchFrame, 0, 0, 0));
    const core = box(0.76, 0.76, 1.02, MAT.switchOn, 0, 0, 0);
    g.add(core);
    g.userData.core = core;
    return g;
  }

  function platformModel() {
    const g = new THREE.Group();
    const body = box(2, 0.28, 0.92, MAT.platBody, 1, -0.14, 0);
    const deck = box(1.86, 0.08, 0.82, MAT.platDeck, 1, 0.02, 0);
    const t1 = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.22, 6), MAT.thruster);
    t1.rotation.x = Math.PI; t1.position.set(0.38, -0.35, 0);
    const t2 = t1.clone(); t2.position.set(1.62, -0.35, 0);
    g.add(body, deck, t1, t2);
    g.userData.thrusters = [t1, t2];
    return g;
  }

  // ---------- 天空渐变穹顶 Shader ----------
  function createSkyDome() {
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

  // ---------- 静态实例化方块层 ----------
  const KINDS = ['grass', 'dirt', 'B', '-', 'I', 'R_solid', 'R_ghost', 'U_solid', 'U_ghost', 'spike', 'spikeBase', 'o', 'Sbase', 'Spad', 'coil'];
  function kindGeometry(k) {
    switch (k) {
      case '-': { const g = new THREE.BoxGeometry(1, 0.28, 1); g.translate(0, 0.36, 0); return g; }
      case 'spike': { const g = new THREE.ConeGeometry(0.2, 0.55, 8); g.translate(0, -0.5 + 0.12 + 0.275, 0); return g; }
      case 'spikeBase': { const g = new THREE.BoxGeometry(1, 0.12, 0.9); g.translate(0, -0.44, 0); return g; }
      case 'o': { const g = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20); g.rotateX(Math.PI / 2); return g; }
      case 'Sbase': { const g = new THREE.BoxGeometry(0.9, 0.18, 0.8); g.translate(0, -0.41, 0); return g; }
      case 'coil': { const g = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 10, 1, true); g.translate(0, -0.17, 0); return g; }
      case 'Spad': { const g = new THREE.BoxGeometry(0.9, 0.16, 0.8); g.translate(0, 0.04, 0); return g; }
      case 'R_ghost':
      case 'U_ghost':
        return new THREE.BoxGeometry(0.94, 0.94, 0.94);
      default: return new THREE.BoxGeometry(1, 1, 1);
    }
  }

  const TOOL_COLOR = {
    '#': '#4caf50', B: '#c8642c', '-': '#c79257', I: '#7dd3fc', K: '#9ca3af', M: '#38bdf8',
    '^': '#e2e8f0', o: '#ffcc33', S: '#ef4444', C: '#10b981', T: '#f43f5e',
    R: '#ef4444', U: '#3b82f6', E: '#8b5cf6', F: '#f59e0b', P: '#2f80ed', G: '#22c55e', '.': '#ef4444',
  };

  class Renderer3D {
    constructor(container, gfx) {
      buildSharedAssets();
      this.container = container;
      if (gfx && gfx.gl) {
        this.gl = gfx.gl;
        this.canvas = gfx.canvas;
      } else if (G.Studio && G.Studio.Gfx3D) {
        G.Studio.Gfx3D.ensure(container);
        this.gl = G.Studio.Gfx3D.gl;
        this.canvas = G.Studio.Gfx3D.canvas;
      } else {
        this.gl = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.gl.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        this.gl.shadowMap.enabled = true;
        this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
        this.gl.toneMapping = THREE.ACESFilmicToneMapping;
        this.gl.toneMappingExposure = 1.06;
        this.gl.domElement.id = 'view';
        this.gl.domElement.tabIndex = 0;
        container.prepend(this.gl.domElement);
        this.canvas = this.gl.domElement;
      }
      this.gl.toneMappingExposure = 1.06;

      this.scene = new THREE.Scene();
      this.skyDome = (G.Studio && G.Studio.createSkyDome) ? G.Studio.createSkyDome(THREE) : createSkyDome();
      this.scene.add(this.skyDome);
      this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 450);

      this.hemi = new THREE.HemisphereLight('#e8f7ff', '#5f7d4a', 1.55);
      this.scene.add(this.hemi);
      this.sun = new THREE.DirectionalLight('#fff4dd', 2.35);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const sc = this.sun.shadow.camera;
      sc.left = -34; sc.right = 34; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 95;
      this.sun.shadow.bias = -0.0005;
      this.scene.add(this.sun, this.sun.target);

      // 主角动态光源（随冲刺状态变色）
      this.heroLight = new THREE.PointLight('#38bdf8', 2.4, 9, 1.5);
      this.heroLight.visible = false;
      this.scene.add(this.heroLight);

      this.world = new THREE.Group();
      this.scene.add(this.world);
      this.meshes = {};
      this.themeMats = {};

      this.decor = new THREE.Group();
      this.scene.add(this.decor);
      this.editorGroup = new THREE.Group();
      this.scene.add(this.editorGroup);

      // 特殊 3D 实体池
      this.goal = goalModel();
      this.world.add(this.goal);
      this.startGhost = playerModel('ghost');
      this.world.add(this.startGhost);
      this.editEnemies = [];
      this.enemyPool = [];
      this.crystalPool = [];
      this.switchPool = [];
      this.checkpointPool = [];
      this.platformPool = [];
      this.crumbleMesh = null;

      // 主角 + 飘动围巾 + 金色竞速幽灵
      this.player = playerModel('hero');
      this.scene.add(this.player);
      this.scarfHistory = [];
      for (const seg of this.player.userData.scarf) {
        seg.visible = false;
        this.scene.add(seg);
      }
      this.ghostRacer = playerModel('racer');
      this.ghostRacer.visible = false;
      this.scene.add(this.ghostRacer);

      // 3D 冲刺残影池
      this.afterimagePool = [];
      const aiGeo = new THREE.BoxGeometry(0.75, 0.875, 0.62);
      for (let i = 0; i < 10; i++) {
        const m = new THREE.Mesh(aiGeo, new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0, depthWrite: false }));
        m.visible = false;
        this.scene.add(m);
        this.afterimagePool.push(m);
      }

      // 编辑器悬停预览 & 矩形框选预览
      this.hoverMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.28, depthWrite: false });
      this.hoverBox = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), this.hoverMat);
      this.hoverEdges = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04)),
        new THREE.LineBasicMaterial({ color: '#ffffff' })
      );
      this.hoverBox.add(this.hoverEdges);
      this.scene.add(this.hoverBox);

      // 编辑器上次试玩轨迹（SMM2 风格调优神器）
      this.trailGroup = new THREE.Group();
      this.scene.add(this.trailGroup);
      this.lastTrailRef = null;

      // 玩法爆发粒子池
      this.maxParticles = 600;
      this.particleMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.13, 0.13, 0.13), new THREE.MeshBasicMaterial(), this.maxParticles);
      this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.particleMesh.setColorAt(0, new THREE.Color());
      this.particleMesh.frustumCulled = false;
      this.scene.add(this.particleMesh);

      // 主题环境飘浮微粒（萤火虫/霓虹光尘/雪花/火山余烬）
      this.ambientCount = 120;
      this.ambientData = [];
      this.ambientMat = new THREE.MeshBasicMaterial({ color: '#fef08a', transparent: true, opacity: 0.7 });
      this.ambientMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.09, 0.09, 0.09), this.ambientMat, this.ambientCount);
      this.ambientMesh.frustumCulled = false;
      this.scene.add(this.ambientMesh);

      this.raycaster = new THREE.Raycaster();
      this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // 关卡中心平面 z=0
      this.dirty = true;
      this.lastMode = null;
      this.lastTheme = null;
      this.lastSwitchOn = true;
      this._m = new THREE.Matrix4();
      this._q = new THREE.Quaternion();
      this._v = new THREE.Vector3();
      this._v2 = new THREE.Vector3(0.3, 1, 0.2).normalize();
      this._s = new THREE.Vector3(1, 1, 1);
      this._c = new THREE.Color();
      this.resize();
    }

    markDirty() { this.dirty = true; }

    resize() {
      const r = this.container.getBoundingClientRect();
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      this.gl.setSize(this.w, this.h);
      this.camera.aspect = this.w / this.h;
      this.camera.updateProjectionMatrix();
    }

    applyTheme(themeId) {
      const tid = THEME_CFG[themeId] ? themeId : 'meadow';
      const cfg = THEME_CFG[tid];
      this.themeId = tid;
      this.themeCfg = cfg;
      this.lastTheme = tid;

      // 更新天空渐变穹顶与雾效、光源
      const u = this.skyDome.material.uniforms;
      u.uTop.value.set(cfg.skyTop);
      u.uHorizon.value.set(cfg.skyHorizon);
      u.uBottom.value.set(cfg.skyBottom);
      u.uSunColor.value.set(cfg.sunColor);
      u.uSunDir.value.set(cfg.sunDir[0], cfg.sunDir[1], cfg.sunDir[2]).normalize();
      this.scene.fog = new THREE.Fog(cfg.fog, cfg.fogNear, cfg.fogFar);

      this.hemi.color.set(cfg.hemiSky);
      this.hemi.groundColor.set(cfg.hemiGround);
      this.hemi.intensity = cfg.hemiInt;
      this.sun.color.set(cfg.sunLight);
      this.sun.intensity = cfg.sunInt;
      this.ambientMat.color.set(cfg.ambientColor);

      // 生成/缓存主题地形材质
      if (!this.themeMats[tid]) {
        const tex = buildThemeTextures(cfg, tid);
        const topMat = lambert({ map: tex.top });
        const sideMat = lambert({ map: tex.side });
        const dirtMat = lambert({ map: tex.dirt });
        this.themeMats[tid] = {
          grass: [sideMat, sideMat, topMat, dirtMat, sideMat, sideMat],
          dirt: dirtMat,
        };
      }
      if (this.meshes.grass) this.meshes.grass.material = this.themeMats[tid].grass;
      if (this.meshes.dirt) this.meshes.dirt.material = this.themeMats[tid].dirt;
    }

    kindMaterial(k) {
      const tm = this.themeMats[this.themeId || 'meadow'];
      switch (k) {
        case 'grass': return tm.grass;
        case 'dirt': return tm.dirt;
        case 'B': return MAT.brick;
        case '-': return MAT.wood;
        case 'I': return MAT.ice;
        case 'R_solid': return MAT.redSolid;
        case 'R_ghost': return MAT.redGhost;
        case 'U_solid': return MAT.blueSolid;
        case 'U_ghost': return MAT.blueGhost;
        case 'spike': return MAT.spike;
        case 'spikeBase': return MAT.spikeBase;
        case 'o': return MAT.coin;
        case 'Sbase': return MAT.springBase;
        case 'Spad': return MAT.springPad;
        case 'coil': return MAT.coil;
        default: return MAT.brick;
      }
    }

    // 关卡结构或主题变化时：重建网格、边界、远景生态与环境粒子
    setLevel(level) {
      this.level = level;
      this.levelW = level.w;
      this.levelH = level.h;
      const tid = level.theme || 'meadow';
      this.applyTheme(tid);
      const cfg = this.themeCfg;

      // 编辑器网格线 & 外框
      this.editorGroup.clear();
      const pts = [];
      const z = -0.5;
      for (let x = 0; x <= level.w; x++) pts.push(x, 0, z, x, -level.h, z);
      for (let y = 0; y <= level.h; y++) pts.push(0, -y, z, level.w, -y, z);
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      this.editorGroup.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: cfg.gridColor, transparent: true, opacity: 0.22 })));
      const back = new THREE.Mesh(new THREE.PlaneGeometry(level.w, level.h), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.08, depthWrite: false }));
      back.position.set(level.w / 2, -level.h / 2, -0.51);
      this.editorGroup.add(back);
      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(level.w, level.h, 1)),
        new THREE.LineBasicMaterial({ color: cfg.gridColor, transparent: true, opacity: 0.65 })
      );
      frame.position.set(level.w / 2, -level.h / 2, 0);
      this.editorGroup.add(frame);

      // 主题化远景装饰
      this.decor.clear();
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      this.clouds = [];

      if (tid === 'cyber') {
        // 赛博霓虹摩天楼剪影 + 霓虹灯带
        const bldgMat = [lambert({ color: '#17153b' }), lambert({ color: '#261447' })];
        const neonCyan = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
        const neonPink = new THREE.MeshBasicMaterial({ color: '#f472b6' });
        for (let x = -30; x < level.w + 35; x += 5 + rnd() * 5) {
          const far = rnd() < 0.5 ? 1 : 0;
          const bw = 2.6 + rnd() * 3.8, bh = 10 + rnd() * 22;
          const bz = -16 - far * 22 - rnd() * 8;
          const b = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bw), bldgMat[far]);
          b.position.set(x, -level.h + bh / 2 - 4, bz);
          this.decor.add(b);
          const strip = new THREE.Mesh(new THREE.BoxGeometry(bw + 0.08, 0.22, bw + 0.08), rnd() < 0.5 ? neonCyan : neonPink);
          strip.position.set(x, -level.h + bh - 4.4, bz);
          this.decor.add(strip);
        }
        const gridPlane = new THREE.GridHelper(level.w + 260, 80, '#22d3ee', '#6b21a8');
        gridPlane.position.set(level.w / 2, -level.h - 2.2, -45);
        this.decor.add(gridPlane);
      } else {
        // 山峰（草原/雪山/火山）
        const hillMat = [lambert({ color: cfg.hillColors[0] }), lambert({ color: cfg.hillColors[1] })];
        const snowCapMat = lambert({ color: '#f8fafc' });
        const lavaVeinMat = new THREE.MeshBasicMaterial({ color: '#f97316' });
        for (let x = -30; x < level.w + 35; x += 6 + rnd() * 8) {
          const far = rnd() < 0.5 ? 1 : 0;
          const r = 4.5 + rnd() * 6.5, h = 7 + rnd() * 14;
          const segs = 5 + ((rnd() * 3) | 0);
          const mz = -18 - far * 22 - rnd() * 6;
          const ry = rnd() * Math.PI;
          if (tid === 'frost') {
            // 下部山体圆台 + 上部雪顶圆锥无缝拼接，彻底避免 z-fighting
            const baseH = h * 0.64, capH = h * 0.36, midR = r * 0.36;
            const body = new THREE.Mesh(new THREE.CylinderGeometry(midR, r, baseH, segs), hillMat[far]);
            body.position.set(x, -level.h + baseH / 2 - 1.5, mz);
            body.rotation.y = ry;
            const cap = new THREE.Mesh(new THREE.ConeGeometry(midR, capH, segs), snowCapMat);
            cap.position.set(x, -level.h + baseH + capH / 2 - 1.5, mz);
            cap.rotation.y = ry;
            this.decor.add(body, cap);
          } else {
            const m = new THREE.Mesh(new THREE.ConeGeometry(r, h, segs), hillMat[far]);
            m.position.set(x, -level.h + h / 2 - 1.5, mz);
            m.rotation.y = ry;
            this.decor.add(m);
            if (tid === 'volcano' && rnd() < 0.45) {
              const glow = new THREE.Mesh(new THREE.SphereGeometry(0.9, 8, 6), lavaVeinMat);
              glow.position.set(x, -level.h + h - 1.8, mz);
              this.decor.add(glow);
            }
          }
        }
        // 云朵 / 火山烟云 / 极光带
        const cloudCol = tid === 'volcano' ? '#4b2a2a' : '#ffffff';
        const cloudMat = lambert({ color: cloudCol, emissive: cloudCol, emissiveIntensity: tid === 'volcano' ? 0.1 : 0.35 });
        for (let x = -20; x < level.w + 40; x += 10 + rnd() * 14) {
          const c = new THREE.Group();
          const n = 2 + ((rnd() * 3) | 0);
          for (let i = 0; i < n; i++) {
            c.add(new THREE.Mesh(new THREE.BoxGeometry(2 + rnd() * 3, 0.8 + rnd(), 1.5 + rnd() * 2), cloudMat).translateX(i * 1.6 - n * 0.8).translateY(rnd() * 0.6));
          }
          c.position.set(x, 3 + rnd() * 6, -12 - rnd() * 25);
          c.userData.speed = 0.2 + rnd() * 0.4;
          this.decor.add(c);
          this.clouds.push(c);
        }
        if (tid === 'frost') {
          // 柔和羽化极光幕（顶底渐隐至 0，彻底消除生硬矩形边）
          const aurMat = new THREE.ShaderMaterial({
            transparent: true, depthWrite: false, side: THREE.DoubleSide,
            uniforms: { uTime: { value: 0 } },
            vertexShader: `
              varying vec2 vUv;
              void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
            `,
            fragmentShader: `
              uniform float uTime;
              varying vec2 vUv;
              void main() {
                float wave = sin(vUv.x * 18.0 + uTime * 0.8) * 0.5 + 0.5;
                float wave2 = sin(vUv.x * 31.0 - uTime * 0.5) * 0.5 + 0.5;
                float vFade = smoothstep(0.0, 0.35, vUv.y) * smoothstep(1.0, 0.25, vUv.y);
                float hFade = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.88, vUv.x);
                vec3 col = mix(vec3(0.18, 0.88, 0.68), vec3(0.38, 0.65, 1.0), wave2);
                float alpha = vFade * hFade * (0.14 + 0.22 * wave * wave2);
                gl_FragColor = vec4(col, alpha);
              }
            `,
          });
          this.auroraMat = aurMat;
          const aur = new THREE.Mesh(new THREE.PlaneGeometry(level.w + 120, 14, 1, 1), aurMat);
          aur.position.set(level.w / 2, 11, -55);
          this.decor.add(aur);
        } else {
          this.auroraMat = null;
        }
      }

      // 远景地面 / 熔岩海
      const floorMat = tid === 'volcano'
        ? std({ color: '#ea580c', emissive: '#dc2626', emissiveIntensity: 0.75, roughness: 0.4 })
        : lambert({ color: cfg.floorColor });
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(level.w + 400, 220), floorMat);
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(level.w / 2, -level.h - 2.4, -60);
      ground.receiveShadow = true;
      this.decor.add(ground);

      // 初始化环境微粒位置
      this.ambientData = [];
      for (let i = 0; i < this.ambientCount; i++) {
        this.ambientData.push({
          x: -10 + rnd() * (level.w + 20),
          y: -level.h - 2 + rnd() * (level.h + 14),
          z: -10 + rnd() * 14,
          phase: rnd() * Math.PI * 2,
          speed: 0.4 + rnd() * 0.9,
        });
      }
      this.dirty = true;
    }

    ensureMesh(kind, n) {
      let m = this.meshes[kind];
      if (m && m.userData.cap >= n) {
        m.material = this.kindMaterial(kind);
        return m;
      }
      if (m) { this.world.remove(m); m.dispose(); }
      const cap = Math.max(16, 1 << Math.ceil(Math.log2(Math.max(1, n))));
      m = new THREE.InstancedMesh(kindGeometry(kind), this.kindMaterial(kind), cap);
      m.userData.cap = cap;
      m.castShadow = !kind.endsWith('_ghost') && kind !== 'o';
      m.receiveShadow = !kind.endsWith('_ghost');
      m.frustumCulled = false;
      this.world.add(m);
      this.meshes[kind] = m;
      return m;
    }

    ensureCrumbleMesh(n) {
      if (this.crumbleMesh && this.crumbleMesh.userData.cap >= n) return this.crumbleMesh;
      if (this.crumbleMesh) { this.world.remove(this.crumbleMesh); this.crumbleMesh.dispose(); }
      const cap = Math.max(16, 1 << Math.ceil(Math.log2(Math.max(1, n))));
      const m = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.85, 1), MAT.crumble, cap);
      m.userData.cap = cap;
      m.castShadow = true; m.receiveShadow = true; m.frustumCulled = false;
      this.world.add(m);
      this.crumbleMesh = m;
      return m;
    }

    // 重建静态方块池 + 机关实体列表
    syncTiles(level, getTile, editor, switchOn) {
      const lists = {};
      KINDS.forEach((k) => (lists[k] = []));
      const enemies = [], crystals = [], switches = [], checkpoints = [], platforms = [], crumbles = [];
      let start = null, goal = null;
      for (let ty = 0; ty < level.h; ty++) {
        for (let tx = 0; tx < level.w; tx++) {
          const ch = getTile(tx, ty);
          if (ch === '.') continue;
          const i = ty * level.w + tx;
          switch (ch) {
            case '#': {
              const above = ty > 0 ? getTile(tx, ty - 1) : '.';
              lists[above === '#' ? 'dirt' : 'grass'].push(i);
              break;
            }
            case 'B': lists.B.push(i); break;
            case '-': lists['-'].push(i); break;
            case 'I': lists.I.push(i); break;
            case 'K': crumbles.push(i); break;
            case 'R': lists[editor || switchOn ? 'R_solid' : 'R_ghost'].push(i); break;
            case 'U': lists[!editor && !switchOn ? 'U_solid' : 'U_ghost'].push(i); break;
            case '^': lists.spike.push(i); lists.spikeBase.push(i); break;
            case 'o': lists.o.push(i); break;
            case 'S': lists.Sbase.push(i); lists.Spad.push(i); lists.coil.push(i); break;
            case 'C': crystals.push(i); break;
            case 'T': switches.push(i); break;
            case 'F': checkpoints.push(i); break;
            case 'M': platforms.push(i); break;
            case 'E': enemies.push(i); break;
            case 'P': start = i; break;
            case 'G': goal = i; break;
          }
        }
      }
      // 编辑态蓝方块用半实心感显示，但在玩法说明上清晰区分红/蓝
      if (editor && lists.U_ghost.length) {
        lists.U_solid.push(...lists.U_ghost);
        lists.U_ghost.length = 0;
      }

      const m4 = this._m, q = this._q.identity(), v = this._v, s = this._s.set(1, 1, 1);
      for (const k of KINDS) {
        const list = lists[k];
        const perTile = k === 'spike' ? 4 : 1;
        const mesh = this.ensureMesh(k, list.length * perTile);
        let n = 0;
        for (const i of list) {
          const cx = (i % level.w) + 0.5, cy = -(((i / level.w) | 0) + 0.5);
          if (k === 'spike') {
            for (const [ox, oz] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) {
              v.set(cx + ox, cy, oz); m4.compose(v, q, s); mesh.setMatrixAt(n++, m4);
            }
          } else {
            v.set(cx, cy, 0); m4.compose(v, q, s); mesh.setMatrixAt(n++, m4);
          }
        }
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
      }
      this.coinList = lists.o;
      this.crumbleEditList = crumbles;
      this.crystalEditList = crystals;
      this.switchList = switches;
      this.checkpointList = checkpoints;
      this.platformEditList = platforms;

      const at = (i) => ({ x: i % level.w, y: (i / level.w) | 0 });
      this.goal.visible = goal !== null;
      if (goal !== null) { const p = at(goal); this.goal.position.set(p.x, -(p.y + 1), 0); }
      this.startGhost.visible = editor && start !== null;
      if (start !== null) { const p = at(start); this.startGhost.position.set(p.x + 0.5, -(p.y + 1), 0); this.startGhost.rotation.y = 0.45; }

      while (this.editEnemies.length < enemies.length) { const e = enemyModel(); this.world.add(e); this.editEnemies.push(e); }
      this.editEnemies.forEach((e, k) => {
        e.visible = editor && k < enemies.length;
        if (e.visible) { const p = at(enemies[k]); e.position.set(p.x + 0.5, -(p.y + 1), 0); e.rotation.y = -0.3; }
      });

      this.dirty = false;
    }

    syncPlaytestTrail(trail) {
      if (this.lastTrailRef === trail) return;
      this.lastTrailRef = trail;
      this.trailGroup.clear();
      if (!trail || trail.points.length < 2) return;
      const pts = [];
      for (const p of trail.points) pts.push(p.x, p.y, 0.58);
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.72 }));
      this.trailGroup.add(line);
      if (trail.diedAt) {
        const xGeo = new THREE.BufferGeometry();
        const { x, y } = trail.diedAt;
        const d = 0.35;
        xGeo.setAttribute('position', new THREE.Float32BufferAttribute([
          x - d, y - d, 0.62, x + d, y + d, 0.62,
          x - d, y + d, 0.62, x + d, y - d, 0.62,
        ], 3));
        this.trailGroup.add(new THREE.LineSegments(xGeo, new THREE.LineBasicMaterial({ color: '#ef4444' })));
      }
    }

    applyCamera(cam) {
      const cp = Math.cos(cam.pitch);
      this.camera.position.set(
        cam.tx + cam.dist * Math.sin(cam.yaw) * cp,
        cam.ty + cam.dist * Math.sin(cam.pitch),
        cam.dist * Math.cos(cam.yaw) * cp
      );
      this.camera.lookAt(cam.tx, cam.ty, 0);
      this.camera.updateMatrixWorld();
      this.skyDome.position.copy(this.camera.position);
      this.sun.position.set(cam.tx + 12, cam.ty + 22, 18);
      this.sun.target.position.set(cam.tx, cam.ty, 0);
    }

    visibleSize(cam) {
      const h = 2 * cam.dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      return { w: h * this.camera.aspect, h };
    }

    pickPoint(clientX, clientY, cam) {
      const r = this.canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      this.applyCamera(cam);
      this.raycaster.setFromCamera(ndc, this.camera);
      const p = new THREE.Vector3();
      return this.raycaster.ray.intersectPlane(this.plane, p) ? p : null;
    }

    pickTile(clientX, clientY, cam) {
      const p = this.pickPoint(clientX, clientY, cam);
      return p ? { x: Math.floor(p.x), y: Math.floor(-p.y) } : null;
    }

    render(st) {
      const { level, t, cam, mode } = st;
      const editor = mode === 'edit';
      const g = st.game;
      const switchOn = !editor && g ? g.switchOn : true;
      const theme = level.theme || 'meadow';

      if (this.level !== level || this.levelW !== level.w || this.levelH !== level.h || this.lastTheme !== theme) {
        this.setLevel(level);
      }
      if (this.dirty || this.lastMode !== mode || this.lastSwitchOn !== switchOn) {
        this.lastMode = mode;
        this.lastSwitchOn = switchOn;
        this.syncTiles(level, st.getTile, editor, switchOn);
      }
      this.applyCamera(cam);
      this.editorGroup.visible = editor;

      // 编辑器试玩残影轨迹
      this.syncPlaytestTrail(st.trail);
      this.trailGroup.visible = editor && !!st.showTrail;

      const m4 = this._m, v = this._v, s = this._s.set(1, 1, 1);

      // 金币旋转
      const coin = this.meshes.o;
      if (coin && this.coinList) {
        this.coinList.forEach((i, n) => {
          const tx = i % level.w, ty = (i / level.w) | 0;
          this._q.setFromAxisAngle(v.set(0, 1, 0), t * 2.8 + tx * 0.6);
          v.set(tx + 0.5, -(ty + 0.5) + Math.sin(t * 3.2 + tx) * 0.07, 0);
          m4.compose(v, this._q, s);
          coin.setMatrixAt(n, m4);
        });
        coin.instanceMatrix.needsUpdate = true;
        this._q.identity();
      }

      // 碎裂浮板动态抖动与崩塌缩放
      const crumbleSource = (!editor && g) ? g.crumbles : (this.crumbleEditList || []).map((i) => ({ tx: i % level.w, ty: (i / level.w) | 0, state: 0, timer: 0 }));
      const cm = this.ensureCrumbleMesh(crumbleSource.length);
      let cn = 0;
      for (const kb of crumbleSource) {
        if (kb.state === 2) continue;
        const jitterX = kb.state === 1 ? Math.sin(t * 58 + kb.tx) * 0.08 : 0;
        const jitterY = kb.state === 1 ? Math.cos(t * 64 + kb.ty) * 0.04 : 0;
        v.set(kb.tx + 0.5 + jitterX, -(kb.ty + 0.5) + 0.075 + jitterY, 0);
        m4.compose(v, this._q.identity(), s.set(1, 1, 1));
        cm.setMatrixAt(cn++, m4);
      }
      cm.count = cn;
      cm.instanceMatrix.needsUpdate = true;

      // 充能水晶（旋转八面体 + 冷却虚化）
      const cryList = (!editor && g) ? g.crystals : (this.crystalEditList || []).map((i) => ({ tx: i % level.w, ty: (i / level.w) | 0, timer: 0 }));
      while (this.crystalPool.length < cryList.length) { const c = crystalModel(); this.scene.add(c); this.crystalPool.push(c); }
      this.crystalPool.forEach((m, k) => {
        m.visible = k < cryList.length;
        if (!m.visible) return;
        const cr = cryList[k];
        const ready = cr.timer <= 0;
        m.position.set(cr.tx + 0.5, -(cr.ty + 0.5) + Math.sin(t * 3.5 + cr.tx) * 0.09, 0);
        m.userData.core.rotation.y = t * 2.2 + cr.tx;
        m.userData.core.material = ready ? MAT.crystalReady : MAT.crystalEmpty;
        m.userData.ring.visible = ready;
        m.userData.ring.rotation.x = t * 1.8;
        m.userData.ring.rotation.y = t * 1.2;
      });

      // ON/OFF 红蓝开关
      const swList = this.switchList || [];
      while (this.switchPool.length < swList.length) { const sw = switchModel(); this.scene.add(sw); this.switchPool.push(sw); }
      this.switchPool.forEach((m, k) => {
        m.visible = k < swList.length;
        if (!m.visible) return;
        const i = swList[k], tx = i % level.w, ty = (i / level.w) | 0;
        m.position.set(tx + 0.5, -(ty + 0.5), 0);
        m.userData.core.material = switchOn ? MAT.switchOn : MAT.switchOff;
        const pulse = 1 + Math.sin(t * 5) * 0.03;
        m.scale.set(pulse, pulse, pulse);
      });

      // 存档旗
      const cpList = this.checkpointList || [];
      while (this.checkpointPool.length < cpList.length) { const cp = checkpointModel(); this.scene.add(cp); this.checkpointPool.push(cp); }
      this.checkpointPool.forEach((m, k) => {
        m.visible = k < cpList.length;
        if (!m.visible) return;
        const i = cpList[k], tx = i % level.w, ty = (i / level.w) | 0;
        m.position.set(tx, -(ty + 1), 0);
        const active = !editor && g && g.checkpoint && g.checkpoint.x === tx && g.checkpoint.y === ty;
        m.userData.flag.material = active ? MAT.cpActive : MAT.cpIdle;
        m.userData.gem.rotation.y = t * (active ? 4.5 : 1.2);
      });

      // 移动平台
      const plList = (!editor && g) ? g.platforms : (this.platformEditList || []).map((i) => ({ x: (i % level.w) * T, y: ((i / level.w) | 0) * T + 2 }));
      while (this.platformPool.length < plList.length) { const pl = platformModel(); this.scene.add(pl); this.platformPool.push(pl); }
      this.platformPool.forEach((m, k) => {
        m.visible = k < plList.length;
        if (!m.visible) return;
        const pl = plList[k];
        m.position.set(pl.x / T, -pl.y / T, 0);
        const thScale = 0.8 + Math.sin(t * 28 + k) * 0.25;
        m.userData.thrusters[0].scale.y = thScale;
        m.userData.thrusters[1].scale.y = thScale;
      });

      // 终点旗帜飘动
      const fa = this.goal.userData.flag.geometry.attributes.position;
      const base = this.goal.userData.flagBase;
      for (let k = 0; k < fa.count; k++) {
        const x = base[k * 3];
        fa.array[k * 3 + 2] = Math.sin(t * 5.2 - x * 4) * 0.13 * x;
      }
      fa.needsUpdate = true;

      // 云朵漂移与极光波动
      if (this.auroraMat) this.auroraMat.uniforms.uTime.value = t;
      for (const c of this.clouds || []) {
        c.position.x += c.userData.speed * 0.014;
        if (c.position.x > level.w + 45) c.position.x = -25;
      }

      // 主题环境飘浮微粒
      const amMode = this.themeCfg ? this.themeCfg.ambientMode : 'float';
      for (let i = 0; i < this.ambientCount; i++) {
        const a = this.ambientData[i];
        if (!a) continue;
        if (amMode === 'snow') {
          a.y -= a.speed * 0.025;
          a.x += Math.sin(t * 1.4 + a.phase) * 0.015;
          if (a.y < -level.h - 2) a.y = 8;
        } else if (amMode === 'rise') {
          a.y += a.speed * 0.028;
          a.x += Math.sin(t * 2.2 + a.phase) * 0.018;
          if (a.y > 9) a.y = -level.h - 2;
        } else {
          a.x += Math.cos(t * 0.7 + a.phase) * 0.01;
          a.y += Math.sin(t * 1.1 + a.phase) * 0.008;
        }
        v.set(a.x, a.y, a.z);
        const sc = 0.7 + Math.sin(t * 3 + a.phase) * 0.35;
        m4.compose(v, this._q.identity(), s.set(sc, sc, sc));
        this.ambientMesh.setMatrixAt(i, m4);
      }
      this.ambientMesh.instanceMatrix.needsUpdate = true;

      // 悬停/矩形框选预览
      const hr = st.hoverRect;
      const hv = st.hover;
      if (editor && hr) {
        const x0 = Math.max(0, Math.min(hr.x0, hr.x1));
        const x1 = Math.min(level.w - 1, Math.max(hr.x0, hr.x1));
        const y0 = Math.max(0, Math.min(hr.y0, hr.y1));
        const y1 = Math.min(level.h - 1, Math.max(hr.y0, hr.y1));
        const rw = x1 - x0 + 1, rh = y1 - y0 + 1;
        this.hoverBox.visible = rw > 0 && rh > 0;
        this.hoverBox.position.set(x0 + rw / 2, -(y0 + rh / 2), 0);
        this.hoverBox.scale.set(rw, rh, 1);
        this.hoverMat.color.set(TOOL_COLOR[st.tool] || '#ffffff');
        this.hoverMat.opacity = 0.25 + 0.1 * Math.sin(t * 7);
        this.hoverEdges.material.color.set(st.tool === '.' ? '#ef4444' : '#38bdf8');
      } else if (editor && hv && PF.inBounds(level, hv.x, hv.y)) {
        this.hoverBox.visible = true;
        this.hoverBox.scale.set(1, 1, 1);
        this.hoverBox.position.set(hv.x + 0.5, -(hv.y + 0.5), 0);
        this.hoverMat.color.set(TOOL_COLOR[st.tool] || '#ffffff');
        this.hoverMat.opacity = 0.22 + 0.12 * Math.sin(t * 6);
        this.hoverEdges.material.color.set(st.tool === '.' ? '#ef4444' : '#ffffff');
      } else {
        this.hoverBox.visible = false;
      }

      // 主角 + 动态光源 + 飘动围巾拖尾
      const showHero = !editor && g && !g.dead;
      this.player.visible = showHero;
      this.heroLight.visible = showHero;
      const scarf = this.player.userData.scarf;
      if (showHero) {
        const px = (g.px + 6) / T;
        const py = -(g.py + 14) / T;
        this.player.position.set(px, py, 0);
        const yaw = g.facing > 0 ? 0.55 : -0.55;
        this.player.rotation.y += (yaw - this.player.rotation.y) * 0.28;

        // 冲刺状态配色反馈（青蓝=可冲刺，白光=冲刺中，灰蓝=冷却）
        const activeBandMat = g.dashTimer > 0 ? MAT.bandDash : (g.dashes > 0 ? MAT.bandReady : MAT.bandSpent);
        this.player.userData.band.material = activeBandMat;
        this.heroLight.position.set(px, py + 0.7, 1.4);
        this.heroLight.color.set(g.dashTimer > 0 ? '#e0f2fe' : (g.dashes > 0 ? '#38bdf8' : '#f59e0b'));
        this.heroLight.intensity = g.dashTimer > 0 ? 4.5 : (g.dashes > 0 ? 2.2 : 1.0);

        // 挤压拉伸动画（起跳拉伸、冲刺前倾、跑步弹性）
        let sx = 1, sy = 1, sz = 1;
        if (g.dashTimer > 0) { sx = 1.28; sy = 0.78; sz = 0.85; }
        else if (g.wallDir !== 0) { sx = 0.88; sy = 1.1; }
        else if (!g.onGround) {
          if (g.vy < -120) { sx = 0.84; sy = 1.18; }
          else if (g.vy > 200) { sx = 0.90; sy = 1.10; }
        } else if (Math.abs(g.vx) > 20) {
          sy = 1 + Math.sin(t * 24) * 0.05;
        }
        this.player.userData.body.scale.set(sx, sy, sz);

        // 更新 4 段飘动围巾拖尾
        const anchorX = px - g.facing * 0.34;
        const anchorY = py + 0.67;
        this.scarfHistory.unshift({ x: anchorX, y: anchorY });
        if (this.scarfHistory.length > 14) this.scarfHistory.pop();
        for (let i = 0; i < scarf.length; i++) {
          const seg = scarf[i];
          const hist = this.scarfHistory[Math.min(this.scarfHistory.length - 1, (i + 1) * 3)] || { x: anchorX, y: anchorY };
          seg.visible = true;
          seg.material = activeBandMat;
          seg.position.set(
            hist.x - g.facing * (i * 0.14),
            hist.y + Math.sin(t * 14 - i * 0.9) * 0.05 - i * 0.03,
            -0.12 - i * 0.03
          );
        }
      } else {
        this.scarfHistory.length = 0;
        for (const seg of scarf) seg.visible = false;
      }

      // 3D 冲刺残影
      const ais = st.afterimages || [];
      for (let i = 0; i < this.afterimagePool.length; i++) {
        const m = this.afterimagePool[i];
        if (!editor && i < ais.length) {
          const a = ais[i];
          m.visible = true;
          m.position.set(a.x, a.y + 0.4375, -0.05);
          m.rotation.y = a.facing > 0 ? 0.55 : -0.55;
          m.material.opacity = Math.max(0, (a.life / a.max) * 0.52);
          m.material.color.set(a.color || '#38bdf8');
        } else {
          m.visible = false;
        }
      }

      // 金色竞速幽灵
      const gr = st.ghostPos;
      this.ghostRacer.visible = !editor && !!gr;
      if (this.ghostRacer.visible) {
        this.ghostRacer.position.set((gr.px + 6) / T, -(gr.py + 14) / T, -0.18);
        this.ghostRacer.rotation.y = gr.facing > 0 ? 0.55 : -0.55;
      }

      // 动态巡逻敌人
      const live = !editor && g ? g.enemies.filter((e) => e.alive) : [];
      while (this.enemyPool.length < live.length) { const e = enemyModel(); this.scene.add(e); this.enemyPool.push(e); }
      this.enemyPool.forEach((m, k) => {
        m.visible = k < live.length;
        if (!m.visible) return;
        const e = live[k];
        m.position.set((e.x + 7) / T, -(e.y + 14) / T, 0);
        m.rotation.y = e.vx > 0 ? 0.6 : -0.6;
        const f = m.userData.feet, w = Math.sin(t * 12) * 0.06;
        f[0].position.y = 0.07 + Math.max(0, w); f[1].position.y = 0.07 + Math.max(0, -w);
      });

      // 爆发 3D 粒子
      const ps = st.particles || [];
      const pm = this.particleMesh;
      const n = Math.min(ps.length, this.maxParticles);
      for (let k = 0; k < n; k++) {
        const p = ps[k];
        const sc = Math.max(0.1, p.life / p.max);
        s.set(sc, sc, sc);
        v.set(p.x / T, -p.y / T, p.z || 0);
        this._q.setFromAxisAngle(this._v2, p.life * 9);
        m4.compose(v, this._q, s);
        pm.setMatrixAt(k, m4);
        pm.setColorAt(k, this._c.set(p.color));
      }
      pm.count = n;
      pm.instanceMatrix.needsUpdate = true;
      if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
      this._q.identity(); s.set(1, 1, 1);

      this.gl.render(this.scene, this.camera);
    }

    dispose() {
      if (G.Studio && G.Studio.disposeObject) G.Studio.disposeObject(this.scene);
      for (const k of Object.keys(this.themeMats)) {
        const tm = this.themeMats[k];
        if (tm && tm.dirt) tm.dirt.dispose();
        if (tm && Array.isArray(tm.grass)) tm.grass.forEach((m) => m && m.dispose());
      }
      this.themeMats = {};
      for (const k of Object.keys(TEX)) { if (TEX[k] && TEX[k].dispose) TEX[k].dispose(); delete TEX[k]; }
      for (const k of Object.keys(MAT)) { if (MAT[k] && MAT[k].dispose) MAT[k].dispose(); delete MAT[k]; }
      sharedBuilt = false;
    }
  }

  PF.Renderer3D = Renderer3D;
})(window);
