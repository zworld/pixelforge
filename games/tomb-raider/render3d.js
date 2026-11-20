/* 古墓丽影 · 秘鲁遗迹 — 3A 电影级 3D 渲染器（512px PBR 法线/粗糙度石材 + 真实比例砖缝 + PMREM IBL 反射 + 2048px 跟随软阴影 + 4 路动态火把光 + GLSL 体积神光/动态水体/瀑布 + HDR 泛光后处理） */
(function (G) {
  'use strict';
  const Studio = G.Studio;
  const TR = (G.TR = G.TR || {});
  const PBR = Studio.PBR;

  const ENV_CFG = {
    caves: {
      skyTop: '#081320',
      skyMid: '#183047',
      skyBot: '#4d738a',
      fog: 0x162636,
      fogDensity: 0.0145,
      hemiSky: 0x8cc3de,
      hemiGround: 0x3b2a1e,
      sunColor: 0xffe0b2,
      sunPos: [16, 30, 12],
      shaftColor: 0xbbeeff,
      env: { bg: 0x162636, sky: 0x3f6a87, sun: 0xffebd2, warm: 0xff8c2b, cool: 0x5bc0eb },
      bloom: 0.48,
      warmth: 0.04,
    },
    vilcabamba: {
      skyTop: '#121028',
      skyMid: '#31234a',
      skyBot: '#8b5c54',
      fog: 0x221c34,
      fogDensity: 0.013,
      hemiSky: 0xd8bfa8,
      hemiGround: 0x281e18,
      sunColor: 0xffc891,
      sunPos: [-18, 28, 10],
      shaftColor: 0xfde68a,
      env: { bg: 0x221c34, sky: 0x5c426e, sun: 0xffd7a8, warm: 0xf59e0b, cool: 0x22d3ee },
      bloom: 0.50,
      warmth: 0.06,
    },
    valley: {
      skyTop: '#125a92',
      skyMid: '#48a4c9',
      skyBot: '#d4f2cc',
      fog: 0x5ea8b4,
      fogDensity: 0.0075,
      hemiSky: 0xe0f8ff,
      hemiGround: 0x344e1c,
      sunColor: 0xfff5d4,
      sunPos: [24, 36, -8],
      shaftColor: 0xfef6c8,
      env: { bg: 0x48a4c9, sky: 0x8ad6eb, sun: 0xfff8dc, warm: 0xfbbf24, cool: 0x38bdf8 },
      bloom: 0.42,
      warmth: 0.07,
    },
  };

  /** 手绘高层次天穹（远景安第斯雪峰/雨林山脊 + 云层 + 辉光太阳） */
  function makeSkyTex(cfg, isValley) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, cfg.skyTop);
    g.addColorStop(0.50, cfg.skyMid);
    g.addColorStop(0.82, cfg.skyBot);
    g.addColorStop(1, isValley ? '#20422b' : '#121822');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);

    // 太阳 / 天光晕
    const sx = 512, sy = isValley ? 156 : 138;
    const rg = ctx.createRadialGradient(sx, sy, 14, sx, sy, 155);
    rg.addColorStop(0, '#ffffff');
    rg.addColorStop(0.24, isValley ? '#fef3c7' : '#e0f2fe');
    rg.addColorStop(0.55, isValley ? 'rgba(254, 240, 138, 0.32)' : 'rgba(186, 230, 253, 0.22)');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(sx, sy, 155, 0, Math.PI * 2);
    ctx.fill();

    // 柔和羽化云雾带（使用径向透明渐变，彻底杜绝生硬椭圆云块！）
    for (let i = 0; i < 14; i++) {
      const cx = (i * 84 + 30) % 1024;
      const cy = 175 + Math.sin(i * 1.3) * 42;
      const rx = 120 + (i % 3) * 42;
      const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx);
      cg.addColorStop(0, isValley ? 'rgba(255, 252, 240, 0.24)' : 'rgba(148, 178, 210, 0.08)');
      cg.addColorStop(0.55, isValley ? 'rgba(255, 250, 235, 0.09)' : 'rgba(120, 150, 185, 0.03)');
      cg.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.22);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 两层景深安第斯山脊
    const drawRidge = (baseY, a1, a2, f1, f2, col) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.moveTo(0, 512);
      for (let x = 0; x <= 1024; x += 10) {
        const y = baseY - Math.abs(Math.sin(x * f1)) * a1 - Math.cos(x * f2) * a2;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(1024, 512);
      ctx.closePath();
      ctx.fill();
    };
    drawRidge(335, 86, 26, 0.008, 0.024, isValley ? 'rgba(29, 78, 66, 0.62)' : 'rgba(18, 28, 42, 0.58)');
    drawRidge(390, 58, 18, 0.013, 0.036, isValley ? 'rgba(18, 52, 34, 0.78)' : 'rgba(10, 15, 22, 0.78)');

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * 实拍照片级 CC0 PBR 材质库（Poly Haven 激光扫描 Diffuse + NormalGL + Roughness）
   */
  function createStoneMaterial(style, repeatX = 1, repeatY = 1) {
    const Assets = Studio.Assets3D;
    const mapSpec = {
      stone:       { tex: 'large_sandstone_blocks', color: 0xddd0bc, rough: 0.88, metal: 0.06, norm: 1.45 },
      rock:        { tex: 'cliff_side',             color: 0xcbc2b6, rough: 0.92, metal: 0.04, norm: 1.60 },
      carved:      { tex: 'mossy_sandstone',        color: 0xe6d4b5, rough: 0.80, metal: 0.12, norm: 1.50 },
      marble:      { tex: 'seaworn_stone_tiles',    color: 0xebe2d5, rough: 0.68, metal: 0.12, norm: 1.30 },
      gold_trim:   { tex: 'large_sandstone_blocks', color: 0xe0b252, rough: 0.42, metal: 0.46, norm: 1.35 },
      grass_stone: { tex: 'aerial_grass_rock',      color: 0xd0e6be, rough: 0.88, metal: 0.04, norm: 1.35 },
      crumble:     { tex: 'mossy_sandstone',        color: 0xd49c5e, rough: 0.86, metal: 0.06, norm: 1.65 },
    };
    const sp = mapSpec[style] || mapSpec.stone;
    if (Assets) {
      return Assets.createPhotoPBRMaterial(sp.tex, {
        color: sp.color,
        roughness: sp.rough,
        metalness: sp.metal,
        normalScale: sp.norm,
        repeatX,
        repeatY,
      });
    }
    return new THREE.MeshStandardMaterial({ color: sp.color, roughness: sp.rough, metalness: sp.metal });
  }

  /** 动态水流瀑布泡沫纹理 */
  function makeWaterfallTex() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 256, 0);
    g.addColorStop(0, 'rgba(14, 165, 233, 0.35)');
    g.addColorStop(0.25, 'rgba(56, 189, 248, 0.85)');
    g.addColorStop(0.5, 'rgba(224, 242, 254, 0.95)');
    g.addColorStop(0.75, 'rgba(56, 189, 248, 0.85)');
    g.addColorStop(1, 'rgba(14, 165, 233, 0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 512);
    for (let i = 0; i < 90; i++) {
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.65)' : 'rgba(186,230,253,0.45)';
      ctx.fillRect((i * 37) % 240, (i * 71) % 512, 4 + (i % 4) * 3, 36 + (i % 5) * 18);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 精细多叶冠史前热带棕榈树（带树皮弯干 + 双层弯曲大羽叶 + 阴影投射） */
  function createPalmTree() {
    const g = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c4028, roughness: 0.9 });
    const leafDark = new THREE.MeshStandardMaterial({ color: 0x1e6b24, roughness: 0.62, side: THREE.DoubleSide });
    const leafLight = new THREE.MeshStandardMaterial({ color: 0x2e8b32, roughness: 0.58, side: THREE.DoubleSide });

    let prevY = 0;
    let prevX = 0;
    for (let s = 0; s < 5; s++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.24 - s * 0.028, 0.27 - s * 0.028, 1.25, 8), trunkMat);
      seg.position.set(prevX, prevY + 0.6, 0);
      seg.rotation.z = -0.04 * s;
      seg.castShadow = true;
      g.add(seg);
      prevY += 1.18;
      prevX += 0.07 * s;
    }

    const crown = new THREE.Group();
    crown.position.set(prevX, prevY, 0);
    for (let layer = 0; layer < 2; layer++) {
      const n = layer === 0 ? 7 : 5;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + layer * 0.45;
        const frondPivot = new THREE.Group();
        frondPivot.rotation.y = a;
        const frond = new THREE.Mesh(new THREE.ConeGeometry(0.58, 3.2 - layer * 0.5, 5), layer === 0 ? leafDark : leafLight);
        frond.scale.set(1.0, 1.0, 0.14);
        frond.position.set(0, 0.25 + layer * 0.35, 1.45 - layer * 0.2);
        frond.rotation.x = Math.PI * (0.58 - layer * 0.16);
        frond.castShadow = true;
        frondPivot.add(frond);
        crown.add(frondPivot);
      }
    }
    g.add(crown);
    return g;
  }

  class TombRaiderRenderer {
    constructor(gfx) {
      this.gfx = gfx;
      this.gl = gfx.gl;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 260);
      this.scene.add(this.camera);

      this.worldGroup = new THREE.Group();
      this.scene.add(this.worldGroup);

      this.dynamicGroup = new THREE.Group();
      this.scene.add(this.dynamicGroup);

      this.fxGroup = new THREE.Group();
      this.scene.add(this.fxGroup);

      this.laraMesh = TR.createLaraRig();
      this.scene.add(this.laraMesh);

      // 3A 电影后处理管线（HDR Bloom + 暗角 + 求生本能褪色金光 + 子弹时间辉光）
      this.post = PBR ? new PBR.PostPipeline(this.gl) : null;
      this.envRT = null;
      this.sunLight = null;
      this.sunOffset = new THREE.Vector3(16, 30, 12);
      this.torchLights = [];
      this.torchCoords = [];
      this.godRayMats = [];
      this.waterMats = [];
      this.dustPts = null;
      this.mistPuffs = [];
      this.banners = [];

      this.levelId = null;
      this.blockMeshes = new Map();
      this.pushMeshes = new Map();
      this.plateMeshes = new Map();
      this.leverMeshes = new Map();
      this.gateMeshes = new Map();
      this.spikeMeshes = new Map();
      this.boulderMeshes = new Map();
      this.pickupMeshes = new Map();
      this.enemyMeshes = new Map();
      this.dartMeshes = [];
      this.tracerMeshes = [];
      this.torchFlames = [];
      this.instinctMats = [];
      this.waterfallTex = null;
      this.goalMesh = null;
      this.sparks = [];

      this.camPos = new THREE.Vector3(0, 3.2, 10);
      this.camLook = new THREE.Vector3(0, 1.4, 0);
      this.fovCurrent = 62;
      this.instinctBlend = 0;
      this.adrenBlend = 0;
      this.introSweep = 1.6;
      this.shakeMag = 0;
      this.t = 0;
      this.aaaQuality = true;

      this.sparkGeo = new THREE.OctahedronGeometry(0.075, 0);
    }

    setQuality(isAAA) {
      this.aaaQuality = !!isAAA;
      if (this.post) this.post.enabled = this.aaaQuality;
      if (this.sunLight) this.sunLight.castShadow = this.aaaQuality;
    }

    ensureLevel(s) {
      if (this.levelId !== s.level.id) {
        this.buildLevel(s);
      }
    }

    buildLevel(s) {
      this.levelId = s.level.id;
      Studio.disposeObject(this.worldGroup);
      Studio.disposeObject(this.dynamicGroup);
      this.worldGroup.clear();
      this.dynamicGroup.clear();
      if (this.envRT) { this.envRT.dispose(); this.envRT = null; }

      this.blockMeshes.clear();
      this.pushMeshes.clear();
      this.plateMeshes.clear();
      this.leverMeshes.clear();
      this.gateMeshes.clear();
      this.spikeMeshes.clear();
      this.boulderMeshes.clear();
      this.pickupMeshes.clear();
      this.enemyMeshes.clear();
      this.torchFlames = [];
      this.torchLights = [];
      this.torchCoords = s.level.torches || [];
      this.instinctMats = [];
      this.godRayMats = [];
      this.waterMats = [];
      this.mistPuffs = [];
      this.banners = [];
      this.waterfallTex = null;
      this.dustPts = null;
      this.introSweep = 1.5;

      const theme = s.level.theme || 'caves';
      const cfg = ENV_CFG[theme] || ENV_CFG.caves;
      this.themeCfg = cfg;
      this.scene.fog = new THREE.FogExp2(cfg.fog, cfg.fogDensity);
      this.scene.background = new THREE.Color(cfg.fog);

      // 1) PMREM HDR 风格环境反射 IBL（赋予金属/湿石/双枪真实高光反射！）
      if (PBR) {
        this.envRT = PBR.createEnvMap(this.gl, cfg.env);
        this.scene.environment = this.envRT.texture;
      }

      // 2) 手绘安第斯山水天穹
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(165, 32, 18),
        new THREE.MeshBasicMaterial({ map: makeSkyTex(cfg, theme === 'valley'), side: THREE.BackSide, fog: false })
      );
      this.worldGroup.add(sky);

      // 3) 2048×2048 实时跟随软阴影主太阳光 + 柔和冷暖补光 + 4 路动态火把点光源池！
      this.worldGroup.add(new THREE.HemisphereLight(cfg.hemiSky, cfg.hemiGround, 1.55));

      const sun = new THREE.DirectionalLight(cfg.sunColor, 1.95);
      this.sunOffset.set(...cfg.sunPos);
      sun.position.copy(this.sunOffset);
      sun.castShadow = this.aaaQuality;
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.near = 2;
      sun.shadow.camera.far = 95;
      sun.shadow.camera.left = -28;
      sun.shadow.camera.right = 28;
      sun.shadow.camera.top = 28;
      sun.shadow.camera.bottom = -28;
      sun.shadow.bias = -0.0005;
      sun.shadow.normalBias = 0.04;
      this.worldGroup.add(sun);
      this.worldGroup.add(sun.target);
      this.sunLight = sun;

      const rimFill = new THREE.DirectionalLight(cfg.env.cool, 0.55);
      rimFill.position.set(-16, 14, 18);
      this.worldGroup.add(rimFill);

      // 4 路实时摇曳暖橙火把光源（每帧自动分配给离劳拉最近的 4 支火把，性能 60fps 且青橙对比惊艳！）
      for (let i = 0; i < 4; i++) {
        const pl = new THREE.PointLight(0xff8e36, 0, 15, 1.5);
        this.worldGroup.add(pl);
        this.torchLights.push(pl);
      }

      // 4) 主关卡平台与石墙（按物理尺寸精确重复 UV，杜绝拉伸大马赛克！）
      const ledgeTrimMat = new THREE.MeshStandardMaterial({
        color: 0xf1e2c8, emissive: 0xd97706, emissiveIntensity: 0.16, roughness: 0.45, metalness: 0.15,
      });
      this.instinctMats.push({ mat: ledgeTrimMat, baseColor: 0xd97706, baseInt: 0.16 });

      for (const b of s.blocks) {
        const rx = Math.max(1, Math.round(Math.max(b.w, b.d) / 4.2));
        const ry = Math.max(1, Math.round(Math.max(b.h, Math.min(b.w, b.d)) / 3.8));
        const mat = createStoneMaterial(b.crumble ? 'crumble' : (b.style || 'stone'), rx, ry);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
        mesh.position.set(b.x, b.y + b.h * 0.5, b.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.worldGroup.add(mesh);

        // 建筑挑檐石冠（让冰冷方块瞬间化作真实印加神庙建筑！）
        if (b.h >= 3.8 && b.style === 'carved') {
          const cap = new THREE.Mesh(
            new THREE.BoxGeometry(b.w + 0.34, 0.28, b.d + 0.34),
            createStoneMaterial('gold_trim', Math.max(1, Math.round(b.w / 3)), 1)
          );
          cap.position.y = b.h * 0.5 + 0.08;
          cap.castShadow = true;
          cap.receiveShadow = true;
          mesh.add(cap);
        }

        // 可攀爬石台经典白金抓缘标线
        if (b.climbable) {
          const trim = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.08, 0.13, b.d + 0.08), ledgeTrimMat);
          trim.position.y = b.h * 0.5 - 0.03;
          mesh.add(trim);
        }
        this.blockMeshes.set(b.id, { mesh, baseX: b.x, baseY: b.y + b.h * 0.5, baseZ: b.z });
      }

      // 5) 宏伟包围式 3A 遗迹外景装饰（彻底消除悬空塑料板感！）
      this.buildEnvironmentalDressing(s, theme, cfg);

      // 6) 可推印加太阳石块（带凸雕手槽与金边）
      for (const pb of s.pushBlocks) {
        const mat = createStoneMaterial('gold_trim', 1, 1);
        mat.emissive.setHex(0x78350f);
        mat.emissiveIntensity = 0.20;
        this.instinctMats.push({ mat, baseColor: 0x78350f, baseInt: 0.20 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(pb.size, pb.size, pb.size), mat);
        mesh.position.set(pb.x, pb.y + pb.size * 0.5, pb.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.dynamicGroup.add(mesh);
        this.pushMeshes.set(pb.id, mesh);
      }

      // 7) 太阳压力压板
      for (const pl of s.plates) {
        const mat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b, emissive: 0xb45309, emissiveIntensity: 0.42, metalness: 0.72, roughness: 0.26,
        });
        this.instinctMats.push({ mat, baseColor: 0xb45309, baseInt: 0.42 });
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(pl.radius, pl.radius * 1.08, 0.14, 24), mat);
        mesh.position.set(pl.x, pl.y + 0.07, pl.z);
        mesh.receiveShadow = true;
        this.dynamicGroup.add(mesh);
        this.plateMeshes.set(pl.id, { mesh, mat });
      }

      // 8) 石壁拉杆机关
      for (const lv of s.levers) {
        const grp = new THREE.Group();
        grp.position.set(lv.x, lv.y + 1.15, lv.z);
        grp.rotation.y = lv.facing || 0;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.68, 0.14), new THREE.MeshStandardMaterial({ color: 0x5c2d0c, metalness: 0.75, roughness: 0.35 }));
        const armPivot = new THREE.Group();
        const leverMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xb45309, emissiveIntensity: 0.42, metalness: 0.88, roughness: 0.2 });
        this.instinctMats.push({ mat: leverMat, baseColor: 0xb45309, baseInt: 0.42 });
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.036, 0.66, 8), leverMat);
        rod.position.set(0, 0.26, 0.22);
        rod.rotation.x = 0.55;
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), leverMat);
        knob.position.set(0, 0.53, 0.42);
        armPivot.add(rod, knob);
        grp.add(plate, armPivot);
        this.dynamicGroup.add(grp);
        this.leverMeshes.set(lv.id, { grp, armPivot });
      }

      // 9) 古代升降巨石门
      for (const g of s.gates) {
        const mat = createStoneMaterial('gold_trim', 2, 2);
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(g.w, g.h, g.d), mat);
        mesh.position.set(g.x, g.y + g.h * 0.5, g.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.dynamicGroup.add(mesh);
        this.gateMeshes.set(g.id, mesh);
      }

      // 10) 金属锋利地刺陷阱
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, metalness: 0.92, roughness: 0.18 });
      for (const sk of s.spikes) {
        const grp = new THREE.Group();
        grp.position.set(sk.x, sk.y, sk.z);
        const bed = new THREE.Mesh(new THREE.BoxGeometry(sk.w, 0.09, sk.d), new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.82 }));
        bed.position.y = 0.045;
        bed.receiveShadow = true;
        grp.add(bed);
        const blades = new THREE.Group();
        for (let ix = -2; ix <= 2; ix++) {
          for (let iz = -1; iz <= 1; iz++) {
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.88, 6), spikeMat);
            cone.position.set(ix * (sk.w * 0.2), 0.44, iz * (sk.d * 0.3));
            cone.castShadow = true;
            blades.add(cone);
          }
        }
        grp.add(blades);
        this.dynamicGroup.add(grp);
        this.spikeMeshes.set(sk.id, blades);
      }

      // 11) 凹凸岩面经典滚石
      for (const b of s.boulders) {
        const mesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(b.radius, 3),
          createStoneMaterial('rock', 2, 2)
        );
        mesh.position.set(b.x, b.y, b.z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.dynamicGroup.add(mesh);
        this.boulderMeshes.set(b.id, mesh);
      }

      // 12) 黄金圣物 / 古代齿轮 / 红十字急救包（带泛光金属高光！）
      for (const pk of s.pickups) {
        const grp = new THREE.Group();
        grp.position.set(pk.x, pk.y + 0.68, pk.z);
        if (pk.kind === 'artifact') {
          const mat = new THREE.MeshStandardMaterial({ color: 0xfde047, metalness: 0.95, roughness: 0.12, emissive: 0xd97706, emissiveIntensity: 0.65 });
          this.instinctMats.push({ mat, baseColor: 0xd97706, baseInt: 0.65 });
          const cup = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mat);
          const halo = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.036, 8, 22), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
          grp.add(cup, halo);
        } else if (pk.kind === 'cog') {
          const mat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.92, roughness: 0.16, emissive: 0xb45309, emissiveIntensity: 0.55 });
          this.instinctMats.push({ mat, baseColor: 0xb45309, baseInt: 0.55 });
          const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.09, 8, 18), mat);
          for (let i = 0; i < 6; i++) {
            const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.88, 0.10), mat);
            tooth.rotation.z = (i / 6) * Math.PI;
            grp.add(tooth);
          }
          grp.add(wheel);
        } else {
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.36), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.32, metalness: 0.1 }));
          const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.38), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
          const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.38), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
          box.castShadow = true;
          grp.add(box, cross1, cross2);
        }
        this.dynamicGroup.add(grp);
        this.pickupMeshes.set(pk.id, grp);
      }

      // 13) 旋转泛光亚特兰蒂斯神骸 (Scion)
      const goal = s.level.goal;
      if (goal) {
        const gGrp = new THREE.Group();
        gGrp.position.set(goal.x, goal.y + 1.5, goal.z);
        const scionMat = new THREE.MeshStandardMaterial({
          color: 0xfef08a, metalness: 0.95, roughness: 0.10, emissive: 0xf59e0b, emissiveIntensity: 0.9,
        });
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), scionMat);
        const outer = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.085, 10, 32), scionMat);
        const inner = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.055, 8, 24), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        inner.rotation.x = Math.PI * 0.5;
        gGrp.add(core, outer, inner);
        this.dynamicGroup.add(gGrp);
        this.goalMesh = gGrp;
      }

      // 14) 柔边 GLSL 体积丁达尔神光柱 + 240 粒光束浮尘粒子！
      for (const sz of [1, -16, -34, -52]) {
        const rayMat = PBR ? PBR.createGodRayMaterial(cfg.shaftColor, theme === 'valley' ? 0.16 : 0.22) : new THREE.MeshBasicMaterial({ color: cfg.shaftColor, transparent: true, opacity: 0.08 });
        this.godRayMats.push(rayMat);
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 4.2, 22, 16, 1, true), rayMat);
        shaft.position.set(sz % 32 === 0 ? -2.2 : 2.2, 10.5, sz);
        shaft.rotation.z = -0.22;
        shaft.rotation.x = 0.08;
        this.worldGroup.add(shaft);
      }

      // 空间浮尘 / 洞穴火星
      const dCount = 240;
      const dPos = new Float32Array(dCount * 3);
      for (let i = 0; i < dCount; i++) {
        dPos[i * 3] = (Math.random() - 0.5) * 30;
        dPos[i * 3 + 1] = 0.5 + Math.random() * 11;
        dPos[i * 3 + 2] = 10 - Math.random() * 72;
      }
      const dGeo = new THREE.BufferGeometry();
      dGeo.setAttribute('position', new THREE.BufferAttribute(dPos, 3));
      const dotTex = Studio.Assets3D && Studio.Assets3D.getSoftGlowDotTexture ? Studio.Assets3D.getSoftGlowDotTexture() : null;
      this.dustPts = new THREE.Points(
        dGeo,
        new THREE.PointsMaterial({
          color: theme === 'valley' ? 0xfef9c3 : 0xfdba74,
          map: dotTex,
          size: 0.22,
          transparent: true,
          opacity: 0.78,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      this.worldGroup.add(this.dustPts);

      // 15) 锻铁壁挂火把 + 柔和体积感羽化真火精灵（告别低模橙色圆锥，配合 Bloom 泛出暖焰光晕！）
      const sconceMat = new THREE.MeshStandardMaterial({ color: 0x3b1f0d, metalness: 0.78, roughness: 0.35 });
      const fireTex = Studio.Assets3D && Studio.Assets3D.getFireSpriteTexture ? Studio.Assets3D.getFireSpriteTexture() : null;
      for (let i = 0; i < this.torchCoords.length; i++) {
        const [tx, ty, tz] = this.torchCoords[i];
        const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.08, 0.62, 10), sconceMat);
        holder.position.set(tx, ty, tz);
        const rimBowl = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.035, 6, 12), sconceMat);
        rimBowl.rotation.x = Math.PI * 0.5;
        rimBowl.position.set(tx, ty + 0.31, tz);
        if (fireTex) {
          const outerMat = new THREE.SpriteMaterial({
            map: fireTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.94,
          });
          const outerFlame = new THREE.Sprite(outerMat);
          outerFlame.position.set(tx, ty + 0.68, tz);
          outerFlame.scale.set(0.95, 1.38, 1);
          const innerMat = new THREE.SpriteMaterial({
            map: fireTex, color: 0xfffbeb, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.85,
          });
          const innerFlame = new THREE.Sprite(innerMat);
          innerFlame.position.set(tx, ty + 0.56, tz);
          innerFlame.scale.set(0.55, 0.82, 1);
          this.worldGroup.add(holder, rimBowl, outerFlame, innerFlame);
          this.torchFlames.push({ outer: outerFlame, inner: innerFlame, phase: i * 1.37, isSprite: true });
        } else {
          const outerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.64, 7), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
          outerFlame.position.set(tx, ty + 0.48, tz);
          const innerFlame = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 6), new THREE.MeshBasicMaterial({ color: 0xfef9c3 }));
          innerFlame.position.set(tx, ty + 0.42, tz);
          this.worldGroup.add(holder, rimBowl, outerFlame, innerFlame);
          this.torchFlames.push({ outer: outerFlame, inner: innerFlame, phase: i * 1.37 });
        }
      }

      // 初始俯冲电影开场机位
      this.camPos.set(s.px + 2.8, s.py + 5.8, s.pz + 9.2);
      this.camLook.set(s.px, s.py + 1.5, s.pz - 5.0);
    }

    /** 构建三大关卡专属 3A 建筑外景与 InstancedMesh 自然植被/崖壁 */
    buildEnvironmentalDressing(s, theme) {
      const rockMat = createStoneMaterial('rock', 3, 3);
      const carvedMat = createStoneMaterial('carved', 2, 2);

      if (theme === 'caves') {
        // 秘鲁洞窟：头顶石拱肋梁 + 洞顶钟乳石 + 两侧峭壁包络（真实洞穴纵深感！）
        for (const az of [4, -4, -18, -28, -38, -50]) {
          const arch = new THREE.Mesh(new THREE.TorusGeometry(9.2, 0.95, 8, 20, Math.PI), rockMat);
          arch.position.set(0, 5.2, az);
          arch.castShadow = true;
          this.worldGroup.add(arch);
        }
        for (let i = 0; i < 24; i++) {
          const stal = new THREE.Mesh(new THREE.ConeGeometry(0.35 + (i % 3) * 0.18, 1.8 + (i % 4) * 0.6, 6), rockMat);
          stal.rotation.x = Math.PI;
          stal.position.set((i % 2 ? 1 : -1) * (5.2 + (i % 4) * 1.1), 10.5 + (i % 3), 5 - i * 2.5);
          this.worldGroup.add(stal);
        }
        // 断崖底深渊暗水反光
        const chasmMat = PBR ? PBR.createWaterMaterial(0x072636, 0x0e5c75) : new THREE.MeshStandardMaterial({ color: 0x0e475c });
        this.waterMats.push(chasmMat);
        const chasmWater = new THREE.Mesh(new THREE.PlaneGeometry(36, 22), chasmMat);
        chasmWater.rotation.x = -Math.PI * 0.5;
        chasmWater.position.set(0, -5.8, -11.5);
        this.worldGroup.add(chasmWater);
      } else if (theme === 'vilcabamba') {
        // 维尔卡班巴古城：GLSL 动态反光碧玉水池 + 远景印加阶梯金字塔 + 猎猎红幡 + 廊柱！
        const waterMat = PBR ? PBR.createWaterMaterial(0x064e5f, 0x22d3ee) : new THREE.MeshStandardMaterial({ color: 0x0e7490 });
        this.waterMats.push(waterMat);
        const water = new THREE.Mesh(new THREE.PlaneGeometry(78, 105), waterMat);
        water.rotation.x = -Math.PI * 0.5;
        water.position.set(0, -1.55, -28);
        this.worldGroup.add(water);

        // 远景阶梯印加金字塔剪影
        for (const [px, pz, sc] of [[-26, -34, 1.2], [27, -26, 1.0], [0, -78, 1.55]]) {
          const pyr = new THREE.Group();
          pyr.position.set(px, -1.6, pz);
          for (let tier = 0; tier < 4; tier++) {
            const w = (16 - tier * 3.2) * sc;
            const step = new THREE.Mesh(new THREE.BoxGeometry(w, 2.8 * sc, w), carvedMat);
            step.position.y = tier * 2.7 * sc + 1.4 * sc;
            pyr.add(step);
          }
          this.worldGroup.add(pyr);
        }

        // 广场两侧神庙廊柱与飘扬猩红古幡
        const bannerMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, emissive: 0x450a0a, emissiveIntensity: 0.25, roughness: 0.7, side: THREE.DoubleSide });
        for (const [cx, cz] of [[-8.2, 4], [8.2, 4], [-8.2, -30], [8.2, -30], [-8.2, -46], [8.2, -46]]) {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.52, 0.62, 7.2, 10), carvedMat);
          col.position.set(cx, 3.6, cz);
          col.castShadow = true;
          this.worldGroup.add(col);
          const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 3.4), bannerMat);
          flag.position.set(cx + (cx < 0 ? 0.65 : -0.65), 4.6, cz);
          this.worldGroup.add(flag);
          this.banners.push({ mesh: flag, phase: cx + cz });
        }
      } else if (theme === 'valley') {
        // 失落山谷：环绕峡谷巍峨岩崖 + 180 株 InstancedMesh 史前热带蕨类/青草 + 12 棵弯曲棕榈树 + 双层动态 3D 大瀑布与水雾！
        const cliffMat = createStoneMaterial('rock', 4, 4);
        const cliffSpecs = [
          [-18, -8, 9, 19, 16], [-19, -24, 10, 23, 18], [-18, -42, 9, 20, 18],
          [18, -8, 9, 18, 16], [19, -24, 10, 22, 18], [18, -42, 9, 21, 18],
          [0, -68, 36, 26, 12], [-14, 11, 16, 14, 8], [14, 11, 16, 14, 8],
        ];
        for (const [cx, cz, cw, ch, cd] of cliffSpecs) {
          const cliff = new THREE.Mesh(new THREE.BoxGeometry(cw, ch, cd), cliffMat);
          cliff.position.set(cx, ch * 0.5 - 2.0, cz);
          cliff.rotation.y = ((cx * 13 + cz) % 7) * 0.025;
          cliff.receiveShadow = true;
          this.worldGroup.add(cliff);
        }

        // 双层飞流直下 3D 瀑布 + 碧玉河水 GLSL + 翻涌水雾团
        this.waterfallTex = makeWaterfallTex();
        const wfMain = new THREE.Mesh(
          new THREE.PlaneGeometry(7.8, 20.0),
          new THREE.MeshBasicMaterial({ map: this.waterfallTex, transparent: true, opacity: 0.90, side: THREE.DoubleSide })
        );
        wfMain.position.set(13.8, 9.0, -33.5);
        wfMain.rotation.y = -Math.PI * 0.5;
        this.worldGroup.add(wfMain);

        const riverMat = PBR ? PBR.createWaterMaterial(0x0369a1, 0x38bdf8) : new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
        this.waterMats.push(riverMat);
        const river = new THREE.Mesh(new THREE.PlaneGeometry(9.5, 42), riverMat);
        river.rotation.x = -Math.PI * 0.5;
        river.position.set(10.2, 0.04, -24);
        this.worldGroup.add(river);

        const mistMat = new THREE.MeshBasicMaterial({ color: 0xe0f2fe, transparent: true, opacity: 0.42 });
        for (let i = 0; i < 10; i++) {
          const puff = new THREE.Mesh(new THREE.SphereGeometry(1.2 + (i % 3) * 0.45, 8, 6), mistMat);
          puff.position.set(12.2 + Math.sin(i) * 1.4, 0.7 + (i % 3) * 0.5, -30 - i * 0.7);
          this.worldGroup.add(puff);
          this.mistPuffs.push({ mesh: puff, baseY: puff.position.y, phase: i * 0.9 });
        }

        // 12 棵史前弯曲棕榈树
        const palms = [
          [-12.6, -4], [12.6, -5], [-13.0, -14], [12.8, -15],
          [-12.8, -26], [12.6, -24], [-12.6, -38], [12.6, -44],
          [-8.5, -45], [8.5, -45], [-7.5, -6], [7.5, -6],
        ];
        for (const [px, pz] of palms) {
          const palm = createPalmTree();
          palm.position.set(px, 0, pz);
          palm.rotation.y = px * 0.7 + pz;
          palm.scale.setScalar(0.92 + Math.abs((px + pz) % 3) * 0.14);
          this.worldGroup.add(palm);
        }

        // 多羽叶丛林蕨类（手绘透明羽状叶面纹理 + 交叉星形花丛，彻底告别小圆锥，且自动避开河道！）
        const fernC = document.createElement('canvas');
        fernC.width = 128; fernC.height = 128;
        const fCtx = fernC.getContext('2d');
        for (let b = 0; b < 7; b++) {
          const ang = -0.95 + (b / 6) * 1.9;
          fCtx.save();
          fCtx.translate(64, 122);
          fCtx.rotate(ang);
          const fg = fCtx.createLinearGradient(0, 0, 0, -108);
          fg.addColorStop(0, '#14532d');
          fg.addColorStop(0.6, '#228b22');
          fg.addColorStop(1, '#84cc16');
          fCtx.fillStyle = fg;
          fCtx.beginPath();
          fCtx.moveTo(0, 0);
          fCtx.quadraticCurveTo(-15, -54, 0, -106);
          fCtx.quadraticCurveTo(15, -54, 0, 0);
          fCtx.fill();
          fCtx.restore();
        }
        const fernTex = new THREE.CanvasTexture(fernC);
        fernTex.colorSpace = THREE.SRGBColorSpace;
        const fernMat = new THREE.MeshStandardMaterial({
          map: fernTex, alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.72,
        });
        const planeGeo = new THREE.PlaneGeometry(1.45, 1.05);
        const fernSpots = [];
        for (let i = 0; i < 120; i++) {
          const fx = -12.6 + ((i * 53) % 175) * 0.1; // x ∈ [-12.6, +4.9]，精准避开右侧碧玉河道！
          const fz = -2.5 - ((i * 83) % 430) * 0.1;
          if (Math.abs(fx) < 2.2 && Math.abs(fz + 25.5) < 3.0) continue; // 避开中央高台
          fernSpots.push([fx, fz, 0.72 + (i % 4) * 0.22, (i * 1.37) % 6.28]);
        }
        const ferns = new THREE.InstancedMesh(planeGeo, fernMat, fernSpots.length * 2);
        const dummy = new THREE.Object3D();
        let idx = 0;
        for (const [fx, fz, sc, rot] of fernSpots) {
          for (let cross = 0; cross < 2; cross++) {
            dummy.position.set(fx, 0.48 * sc, fz);
            dummy.rotation.set(0, rot + cross * (Math.PI * 0.5), 0);
            dummy.scale.set(sc, sc, sc);
            dummy.updateMatrix();
            ferns.setMatrixAt(idx++, dummy.matrix);
          }
        }
        this.worldGroup.add(ferns);
      }

      // 异步点缀 Poly Haven 实拍摄影测量轻量 3D 苔藓巨石 & 热带植物模型（3.3K~6.2K 面零卡顿丝滑 60FPS！）
      const Assets = Studio.Assets3D;
      const lvlSnap = this.levelId;
      if (Assets) {
        Assets.loadGLTF('assets/props/moon_rock_02/moon_rock_02.gltf')
          .then((gltf) => {
            if (this.levelId !== lvlSnap) return;
            const spots = theme === 'valley'
              ? [[-11.8, -8, 2.0], [9.5, -10, 1.8], [-9.2, -31, 2.2], [8.8, -42, 2.0]]
              : (theme === 'caves'
                ? [[-6.1, 6.2, 1.4], [5.8, 5.5, 1.6], [-6.8, -19.5, 1.7], [6.6, -27.5, 1.5]]
                : [[-7.6, 5.2, 1.5], [7.8, 4.8, 1.4], [-7.5, -29.5, 1.6], [7.5, -29.5, 1.6]]);
            const rockTint = theme === 'valley' ? 0x7c8c72 : (theme === 'caves' ? 0x9c8e78 : 0x8f887c);
            for (const [bx, bz, h] of spots) {
              const clone = Assets.cloneProp(gltf, { castShadow: false, tint: rockTint });
              const { holder } = Assets.normalizeRig(clone, h, bx + bz);
              holder.position.set(bx, 0, bz);
              this.worldGroup.add(holder);
            }
          })
          .catch(() => {});

        if (theme === 'valley') {
          Assets.loadGLTF('assets/props/shrub_sorrel_01/shrub_sorrel_01.gltf')
            .then((gltf) => {
              if (this.levelId !== lvlSnap) return;
              const shrubs = [
                [-6.8, -7.5, 1.2], [5.2, -8.5, 1.1], [-8.4, -14.5, 1.35],
                [4.6, -22.5, 1.25], [-7.6, -28.0, 1.3], [4.2, -37.5, 1.25],
              ];
              for (const [px, pz, h] of shrubs) {
                const clone = Assets.cloneProp(gltf, { castShadow: false });
                const { holder } = Assets.normalizeRig(clone, h, px * 1.7 + pz);
                holder.position.set(px, 0, pz);
                this.worldGroup.add(holder);
              }
            })
            .catch(() => {});

          Assets.loadGLTF('assets/props/fern_02/fern_02.gltf')
            .then((gltf) => {
              if (this.levelId !== lvlSnap) return;
              const ferns = [
                [-4.2, -21.5, 1.05], [-3.8, -36.5, 1.1], [-9.4, -44.0, 1.25], [3.6, -12.0, 1.0],
              ];
              for (const [px, pz, h] of ferns) {
                const clone = Assets.cloneProp(gltf, { castShadow: false });
                const { holder } = Assets.normalizeRig(clone, h, px * 2.1 - pz);
                holder.position.set(px, 0, pz);
                this.worldGroup.add(holder);
              }
            })
            .catch(() => {});
        }
      }
    }

    spawnSparks(x, y, z, color, count = 12, speed = 7) {
      const mat = new THREE.MeshBasicMaterial({ color });
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(this.sparkGeo, mat);
        m.position.set(x, y, z);
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.35 + Math.random() * 0.8);
        this.fxGroup.add(m);
        this.sparks.push({
          mesh: m,
          vx: Math.cos(a) * v,
          vy: 1.5 + Math.random() * 3.8,
          vz: Math.sin(a) * v,
          life: 0.25 + Math.random() * 0.2,
          maxLife: 0.42,
          shared: i > 0,
        });
      }
    }

    addShake(mag) {
      this.shakeMag = Math.max(this.shakeMag, mag);
    }

    render(s, dt = 1 / 60) {
      this.t += dt;
      this.ensureLevel(s);

      const w = this.gfx.w || 960;
      const h = this.gfx.h || 540;
      if (Math.abs(this.camera.aspect - w / h) > 0.001) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
      }

      // 1) 更新劳拉 3D 位置与 18 关节骨骼
      this.laraMesh.position.set(s.px, s.py, s.pz);
      this.laraMesh.rotation.y = s.facingYaw;
      TR.animateLara(this.laraMesh, s, this.t, dt);

      // 2) 实时阴影太阳跟随劳拉（阴影始终保持 2048px 最高清晰度！）
      if (this.sunLight) {
        const snapX = Math.round(s.px * 0.5) * 2;
        const snapZ = Math.round(s.pz * 0.5) * 2;
        this.sunLight.target.position.set(snapX, 0, snapZ);
        this.sunLight.position.set(snapX + this.sunOffset.x, this.sunOffset.y, snapZ + this.sunOffset.z);
        this.sunLight.target.updateMatrixWorld();
      }

      // 3) 4 路动态火把真实光源池自动绑定离劳拉最近的 4 支火把！
      if (this.torchLights.length && this.torchCoords.length) {
        const ranked = this.torchCoords
          .map((c, idx) => ({ c, idx, d2: (c[0] - s.px) ** 2 + (c[2] - s.pz) ** 2 }))
          .sort((a, b) => a.d2 - b.d2);
        for (let i = 0; i < this.torchLights.length; i++) {
          const pl = this.torchLights[i];
          const item = ranked[i];
          if (item && item.d2 < 360) {
            pl.position.set(item.c[0], item.c[1] + 0.55, item.c[2]);
            pl.intensity = 2.6 + Math.sin(this.t * 14 + item.idx * 2.1) * 0.45 + Math.cos(this.t * 23 + item.idx) * 0.25;
          } else {
            pl.intensity = 0;
          }
        }
      }

      // 4) 电影级动态第三人称越肩镜头（开场滑轨 + 瞄准越肩拉近 + 冲刺/子弹时间 FOV 动态！）
      if (this.introSweep > 0 && Math.hypot(s.vx, s.vz) < 0.3) {
        this.introSweep = Math.max(0, this.introSweep - dt);
      } else {
        this.introSweep = 0;
      }

      const aimPull = s.aiming ? 1 : 0;
      const dist = (aimPull ? 4.1 : 5.35) + this.introSweep * 1.4;
      const shoulderX = aimPull ? 0.68 : 0.44;
      const horiz = Math.cos(s.camPitch) * dist;
      const fwdX = -Math.sin(s.camYaw);
      const fwdZ = -Math.cos(s.camYaw);
      const rightX = Math.cos(s.camYaw);
      const rightZ = -Math.sin(s.camYaw);

      const desiredPos = new THREE.Vector3(
        s.px - fwdX * horiz + rightX * shoulderX,
        Math.max(s.py + 0.85, s.py + (aimPull ? 1.72 : 1.98) - Math.sin(s.camPitch) * dist + this.introSweep * 1.1),
        s.pz - fwdZ * horiz + rightZ * shoulderX
      );
      const desiredLook = new THREE.Vector3(
        s.px + fwdX * (aimPull ? 4.8 : 2.5) + rightX * (aimPull ? 0.38 : 0.22),
        s.py + (aimPull ? 1.46 : 1.50),
        s.pz + fwdZ * (aimPull ? 4.8 : 2.5) + rightZ * (aimPull ? 0.38 : 0.22)
      );

      const lerpK = Math.min(1, dt * (aimPull ? 14 : 9.5));
      this.camPos.lerp(desiredPos, lerpK);
      this.camLook.lerp(desiredLook, lerpK);

      const targetFov = s.adrenalineTimer > 0 ? 55 : (aimPull ? 56 : (s.action === 'roll' ? 67 : 62));
      if (Math.abs(this.fovCurrent - targetFov) > 0.05) {
        this.fovCurrent += (targetFov - this.fovCurrent) * Math.min(1, dt * 10);
        this.camera.fov = this.fovCurrent;
        this.camera.updateProjectionMatrix();
      }

      this.shakeMag = Math.max(0, this.shakeMag - dt * 1.9);
      const sx = (Math.random() - 0.5) * this.shakeMag * 0.25;
      const sy = (Math.random() - 0.5) * this.shakeMag * 0.22;
      this.camera.position.set(this.camPos.x + sx, this.camPos.y + sy, this.camPos.z);
      this.camera.lookAt(this.camLook);

      // 5) 求生本能平滑过渡 + 肾上腺素金光过渡
      this.instinctBlend += ((s.instinctOn ? 1 : 0) - this.instinctBlend) * Math.min(1, dt * 7);
      this.adrenBlend += ((s.adrenalineTimer > 0 ? 1 : 0) - this.adrenBlend) * Math.min(1, dt * 9);

      const pulse = 0.78 + Math.sin(this.t * 6.5) * 0.28;
      for (const item of this.instinctMats) {
        if (s.instinctOn) {
          item.mat.emissive.setHex(0xfacc15);
          item.mat.emissiveIntensity = pulse;
        } else {
          item.mat.emissive.setHex(item.baseColor);
          item.mat.emissiveIntensity = item.baseInt;
        }
      }

      // 6) GLSL 着色器时间驱动（神光柱、动态水体、瀑布水雾、飘扬古幡、浮尘）
      for (const gm of this.godRayMats) if (gm.uniforms) gm.uniforms.uTime.value = this.t;
      for (const wm of this.waterMats) if (wm.uniforms) wm.uniforms.uTime.value = this.t;
      if (this.waterfallTex) this.waterfallTex.offset.y = (this.t * 2.0) % 1;
      for (const mp of this.mistPuffs) {
        mp.mesh.position.y = mp.baseY + Math.sin(this.t * 2.4 + mp.phase) * 0.45;
        mp.mesh.scale.setScalar(0.9 + Math.cos(this.t * 1.9 + mp.phase) * 0.22);
      }
      for (const b of this.banners) b.mesh.rotation.y = Math.sin(this.t * 3.1 + b.phase) * 0.22;
      if (this.dustPts) this.dustPts.position.y = Math.sin(this.t * 0.6) * 0.35;

      // 7) 同步关卡动态机关、敌人、弹道与火花
      for (const b of s.blocks) {
        if (!b.crumble) continue;
        const bm = this.blockMeshes.get(b.id);
        if (!bm) continue;
        bm.mesh.visible = b.crumbleState !== 'fallen';
        if (b.crumbleState === 'shaking') {
          bm.mesh.position.set(bm.baseX + (Math.random() - 0.5) * 0.12, bm.baseY - 0.04, bm.baseZ + (Math.random() - 0.5) * 0.12);
        } else {
          bm.mesh.position.set(bm.baseX, bm.baseY, bm.baseZ);
        }
      }
      for (const pb of s.pushBlocks) {
        const m = this.pushMeshes.get(pb.id);
        if (m) m.position.set(pb.x, pb.y + pb.size * 0.5, pb.z);
      }
      for (const pl of s.plates) {
        const pm = this.plateMeshes.get(pl.id);
        if (pm) {
          pm.mesh.position.y = pl.y + (pl.active ? 0.02 : 0.07);
          if (pl.active) { pm.mat.emissive.setHex(0x22c55e); pm.mat.emissiveIntensity = 0.8; }
        }
      }
      for (const lv of s.levers) {
        const lm = this.leverMeshes.get(lv.id);
        if (lm) lm.armPivot.rotation.x = lv.anim * 1.45;
      }
      for (const g of s.gates) {
        const gm = this.gateMeshes.get(g.id);
        if (gm) gm.position.y = g.y + g.h * 0.5 + g.openProgress * g.h;
      }
      for (const sk of s.spikes) {
        const sm = this.spikeMeshes.get(sk.id);
        if (sm) sm.position.y = -0.84 + sk.extended * 0.84;
      }
      for (const bd of s.boulders) {
        const bm = this.boulderMeshes.get(bd.id);
        if (bm) { bm.position.set(bd.x, bd.y, bd.z); bm.rotation.x = bd.rotX; }
      }
      for (const pk of s.pickups) {
        const pm = this.pickupMeshes.get(pk.id);
        if (!pm) continue;
        pm.visible = !pk.collected;
        if (!pk.collected) {
          pm.rotation.y = this.t * 2.1;
          pm.position.y = pk.y + 0.68 + Math.sin(this.t * 3.2 + pk.x) * 0.14;
        }
      }
      if (this.goalMesh) {
        this.goalMesh.rotation.y = this.t * 1.5;
        this.goalMesh.position.y = s.level.goal.y + 1.5 + Math.sin(this.t * 2.6) * 0.18;
      }
      for (const f of this.torchFlames) {
        const sy = 0.88 + Math.sin(this.t * 14 + f.phase) * 0.22;
        if (f.isSprite) {
          const sx = 0.94 + Math.cos(this.t * 11 + f.phase) * 0.10;
          f.outer.scale.set(0.95 * sx, 1.38 * sy, 1);
          f.inner.scale.set(0.55 * sx, 0.82 * sy, 1);
        } else {
          f.outer.scale.set(1, sy, 1);
          f.inner.scale.set(1, sy * 0.95, 1);
        }
      }

      const aliveIds = new Set();
      for (const e of s.enemies) {
        if (e.hp <= 0) continue;
        aliveIds.add(e.id);
        let em = this.enemyMeshes.get(e.id);
        if (!em) {
          em = TR.createEnemyRig(e);
          this.dynamicGroup.add(em);
          this.enemyMeshes.set(e.id, em);
        }
        em.position.set(e.x, e.y, e.z);
        em.rotation.y = e.yaw;
        TR.animateEnemy(em, e, this.t, dt * (s.adrenalineTimer > 0 ? 0.35 : 1), this.camera.position);
      }
      for (const [id, em] of this.enemyMeshes.entries()) {
        if (!aliveIds.has(id)) {
          this.dynamicGroup.remove(em);
          Studio.disposeObject(em);
          this.enemyMeshes.delete(id);
        }
      }

      while (this.dartMeshes.length < s.dartProjectiles.length) {
        const dm = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.65, 5), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
        dm.rotation.z = Math.PI * 0.5;
        this.fxGroup.add(dm);
        this.dartMeshes.push(dm);
      }
      for (let i = 0; i < this.dartMeshes.length; i++) {
        const dm = this.dartMeshes[i];
        const dp = s.dartProjectiles[i];
        dm.visible = !!dp;
        if (dp) { dm.position.set(dp.x, dp.y, dp.z); dm.rotation.y = Math.atan2(dp.vx, dp.vz); }
      }

      while (this.tracerMeshes.length < s.tracers.length) {
        const tm = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.055, 1), new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.92 }));
        this.fxGroup.add(tm);
        this.tracerMeshes.push(tm);
      }
      for (let i = 0; i < this.tracerMeshes.length; i++) {
        const tm = this.tracerMeshes[i];
        const tr = s.tracers[i];
        tm.visible = !!tr;
        if (tr) {
          const dx = tr.x1 - tr.x0, dy = tr.y1 - tr.y0, dz = tr.z1 - tr.z0;
          const len = Math.max(0.2, Math.hypot(dx, dy, dz));
          tm.position.set((tr.x0 + tr.x1) * 0.5, (tr.y0 + tr.y1) * 0.5, (tr.z0 + tr.z1) * 0.5);
          tm.scale.set(tr.heavy ? 2.4 : 1.1, tr.heavy ? 2.4 : 1.1, len);
          tm.lookAt(tr.x1, tr.y1, tr.z1);
          tm.material.color.setHex(tr.heavy ? 0xf97316 : 0xfef08a);
          tm.material.opacity = tr.life / tr.maxLife;
        }
      }

      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const sp = this.sparks[i];
        sp.life -= dt;
        if (sp.life <= 0) {
          this.fxGroup.remove(sp.mesh);
          if (!sp.shared) sp.mesh.material.dispose();
          this.sparks.splice(i, 1);
          continue;
        }
        sp.vy -= 14 * dt;
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y = Math.max(0.05, sp.mesh.position.y + sp.vy * dt);
        sp.mesh.position.z += sp.vz * dt;
        sp.mesh.scale.setScalar(Math.max(0.1, sp.life / sp.maxLife));
      }

      // 8) 3A 电影后处理输出（HDR Bloom + 调色 + 暗角 + 求生本能褪色金光 + 子弹时间辉光！）
      if (this.post && this.aaaQuality) {
        const cfg = this.themeCfg || ENV_CFG.caves;
        this.post.render(this.scene, this.camera, w, h, {
          bloom: cfg.bloom,
          warmth: cfg.warmth,
          vignette: 0.40,
          instinct: this.instinctBlend,
          adrenaline: this.adrenBlend,
        });
      } else {
        this.gl.setRenderTarget(null);
        this.gl.render(this.scene, this.camera);
      }
    }

    dispose() {
      if (this.post) { this.post.dispose(); this.post = null; }
      if (this.envRT) { this.envRT.dispose(); this.envRT = null; }
      this.scene.environment = null;
      Studio.disposeObject(this.scene);
      this.sparkGeo.dispose();
      this.blockMeshes.clear();
      this.pushMeshes.clear();
      this.plateMeshes.clear();
      this.leverMeshes.clear();
      this.gateMeshes.clear();
      this.spikeMeshes.clear();
      this.boulderMeshes.clear();
      this.pickupMeshes.clear();
      this.enemyMeshes.clear();
      this.dartMeshes = [];
      this.tracerMeshes = [];
      this.sparks = [];
    }
  }

  TR.Renderer3D = TombRaiderRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
