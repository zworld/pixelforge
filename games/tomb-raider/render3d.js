/* 古墓丽影 · 秘鲁遗迹 — 3D 探险场景渲染器（印加雕石纹理、失落山谷动态瀑布、火把体积光、求生本能金光高亮、越肩第三人称镜头） */
(function (G) {
  'use strict';
  const Studio = G.Studio;
  const TR = (G.TR = G.TR || {});

  const ENV_CFG = {
    caves: {
      skyTop: '#0d1b2a',
      skyMid: '#243b55',
      skyBot: '#6b8fa3',
      fog: 0x1b2b3a,
      fogDensity: 0.014,
      hemiSky: 0x9ecae1,
      hemiGround: 0x3b2f24,
      sunColor: 0xffe6bd,
      sunPos: [14, 28, 8],
      shaftColor: 0xcceeff,
    },
    vilcabamba: {
      skyTop: '#171530',
      skyMid: '#3a2d54',
      skyBot: '#946b60',
      fog: 0x262136,
      fogDensity: 0.013,
      hemiSky: 0xd8c4b6,
      hemiGround: 0x2d241c,
      sunColor: 0xffcfa3,
      sunPos: [-16, 26, 6],
      shaftColor: 0xfde68a,
    },
    valley: {
      skyTop: '#1d6fa3',
      skyMid: '#58b4d1',
      skyBot: '#d9f2d0',
      fog: 0x5ea3b0,
      fogDensity: 0.0082,
      hemiSky: 0xdcf7ff,
      hemiGround: 0x365314,
      sunColor: 0xfff5d6,
      sunPos: [22, 34, -10],
      shaftColor: 0xfef3c7,
    },
  };

  function makeSkyTex(cfg, isValley) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, cfg.skyTop);
    g.addColorStop(0.52, cfg.skyMid);
    g.addColorStop(1, cfg.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);

    // 阳光或月晕
    const sx = 256, sy = isValley ? 86 : 74;
    const rg = ctx.createRadialGradient(sx, sy, 8, sx, sy, 78);
    rg.addColorStop(0, '#ffffff');
    rg.addColorStop(0.32, isValley ? '#fef08a' : '#dbeafe');
    rg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(sx, sy, 78, 0, Math.PI * 2);
    ctx.fill();

    // 远景安第斯山脊剪影
    ctx.fillStyle = isValley ? 'rgba(22, 64, 48, 0.55)' : 'rgba(12, 18, 28, 0.52)';
    ctx.beginPath();
    ctx.moveTo(0, 256);
    for (let x = 0; x <= 512; x += 12) {
      const h = 158 - Math.abs(Math.sin(x * 0.018)) * 42 - Math.cos(x * 0.05) * 14;
      ctx.lineTo(x, h);
    }
    ctx.lineTo(512, 256);
    ctx.closePath();
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 生成印加古石砌体 / 雕花浮雕 / 苔藓石地 / 碎裂石板纹理 */
  function makeStoneTexture(style) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');

    const palettes = {
      stone: ['#5c5346', '#4a4237', '#352f27', '#4d6b3c'],
      rock: ['#4a4642', '#3d3935', '#2a2724', '#3f5234'],
      carved: ['#7c684a', '#66543b', '#3f3222', '#d4a24c'],
      marble: ['#8c8374', '#756d60', '#4a453c', '#c8a96e'],
      gold_trim: ['#856838', '#6b5128', '#3d2d14', '#facc15'],
      grass_stone: ['#4c6b36', '#3d592b', '#2b3d1e', '#6f6552'],
      crumble: ['#9a7652', '#7a593b', '#2a1c12', '#f59e0b'],
    };
    const [base, mid, line, accent] = palettes[style] || palettes.stone;

    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 256, 256);

    // 交错古石砌块
    ctx.strokeStyle = line;
    ctx.lineWidth = 4;
    for (let row = 0; row < 4; row++) {
      const y = row * 64;
      const off = (row % 2) * 42;
      for (let col = -1; col < 4; col++) {
        const x = col * 84 + off;
        ctx.fillStyle = (row + col) % 2 === 0 ? base : mid;
        ctx.fillRect(x + 2, y + 2, 80, 60);
        ctx.strokeRect(x, y, 84, 64);
      }
    }

    // 印加几何浮雕或青苔裂纹
    if (style === 'carved' || style === 'gold_trim') {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      ctx.strokeRect(14, 14, 228, 228);
      for (let i = 36; i < 230; i += 46) {
        ctx.strokeRect(i, 22, 26, 20);
        ctx.strokeRect(i, 214, 26, 20);
      }
    } else if (style === 'crumble') {
      ctx.strokeStyle = '#1c120a';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(24, 12); ctx.lineTo(118, 96); ctx.lineTo(192, 72); ctx.lineTo(240, 210);
      ctx.moveTo(118, 96); ctx.lineTo(84, 232);
      ctx.stroke();
    } else {
      // 青苔与岁月风化斑点
      ctx.fillStyle = accent + '55';
      for (let i = 0; i < 45; i++) {
        ctx.beginPath();
        ctx.arc((i * 71) % 256, (i * 113) % 256, 6 + (i % 4) * 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 动态水流泡沫瀑布贴图 */
  function makeWaterfallTex() {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, '#0ea5e9');
    g.addColorStop(0.5, '#7dd3fc');
    g.addColorStop(1, '#0ea5e9');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 256);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 36; i++) {
      ctx.fillRect((i * 23) % 120, (i * 37) % 256, 4 + (i % 3) * 3, 28 + (i % 4) * 14);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 丛林棕榈树（失落山谷史前景观） */
  function createPalmTree() {
    const g = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4f35, roughness: 0.85 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x228b22, roughness: 0.65, side: THREE.DoubleSide });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.28, 5.2, 8), trunkMat);
    trunk.position.y = 2.6;
    trunk.rotation.z = 0.09;
    g.add(trunk);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.8, 4), leafMat);
      frond.scale.set(1, 1, 0.16);
      frond.position.set(Math.cos(a) * 1.15 + 0.2, 5.05, Math.sin(a) * 1.15);
      frond.rotation.set(Math.sin(a) * 1.1, -a, -Math.cos(a) * 1.1);
      g.add(frond);
    }
    return g;
  }

  class TombRaiderRenderer {
    constructor(gfx) {
      this.gfx = gfx;
      this.gl = gfx.gl;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(64, 16 / 9, 0.1, 240);
      this.scene.add(this.camera);

      this.worldGroup = new THREE.Group();
      this.scene.add(this.worldGroup);

      this.dynamicGroup = new THREE.Group();
      this.scene.add(this.dynamicGroup);

      this.fxGroup = new THREE.Group();
      this.scene.add(this.fxGroup);

      this.laraMesh = TR.createLaraRig();
      this.scene.add(this.laraMesh);

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
      this.shakeMag = 0;
      this.t = 0;

      this.sparkGeo = new THREE.OctahedronGeometry(0.075, 0);
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
      this.instinctMats = [];
      this.waterfallTex = null;

      const theme = s.level.theme || 'caves';
      const cfg = ENV_CFG[theme] || ENV_CFG.caves;
      this.scene.fog = new THREE.FogExp2(cfg.fog, cfg.fogDensity);
      this.scene.background = new THREE.Color(cfg.fog);

      // 天穹球
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(140, 28, 16),
        new THREE.MeshBasicMaterial({ map: makeSkyTex(cfg, theme === 'valley'), side: THREE.BackSide, fog: false })
      );
      this.worldGroup.add(sky);

      // 立体明亮探险光照
      this.worldGroup.add(new THREE.HemisphereLight(cfg.hemiSky, cfg.hemiGround, 1.45));
      const sun = new THREE.DirectionalLight(cfg.sunColor, 1.55);
      sun.position.set(...cfg.sunPos);
      this.worldGroup.add(sun);
      const fill = new THREE.DirectionalLight(0x93c5fd, 0.55);
      fill.position.set(-14, 16, 18);
      this.worldGroup.add(fill);

      // 共享材质表
      const matCache = {};
      const getMat = (style) => {
        if (!matCache[style]) {
          const tex = makeStoneTexture(style);
          matCache[style] = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.74, metalness: 0.12 });
        }
        return matCache[style];
      };

      // 1) 静态平台、岩壁、可攀爬高台与碎裂石桥
      const ledgeTrimMat = new THREE.MeshStandardMaterial({
        color: 0xe5d3b3, emissive: 0xd97706, emissiveIntensity: 0.14, roughness: 0.5,
      });
      this.instinctMats.push({ mat: ledgeTrimMat, baseColor: 0xd97706, baseInt: 0.14 });

      for (const b of s.blocks) {
        const mat = b.crumble ? getMat('crumble').clone() : getMat(b.style || 'stone');
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(b.w, b.h, b.d), mat);
        mesh.position.set(b.x, b.y + b.h * 0.5, b.z);
        this.worldGroup.add(mesh);

        // 为所有可攀爬边缘镶上经典古墓丽影白/金粉笔抓缘标线，一目了然！
        if (b.climbable) {
          const trim = new THREE.Mesh(new THREE.BoxGeometry(b.w + 0.06, 0.12, b.d + 0.06), ledgeTrimMat);
          trim.position.y = b.h * 0.5 - 0.04;
          mesh.add(trim);
        }
        this.blockMeshes.set(b.id, { mesh, baseX: b.x, baseY: b.y + b.h * 0.5, baseZ: b.z });
      }

      // 2) 可推动印加太阳石块
      for (const pb of s.pushBlocks) {
        const mat = new THREE.MeshStandardMaterial({
          map: makeStoneTexture('gold_trim'), roughness: 0.55, metalness: 0.25, emissive: 0x78350f, emissiveIntensity: 0.18,
        });
        this.instinctMats.push({ mat, baseColor: 0x78350f, baseInt: 0.18 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(pb.size, pb.size, pb.size), mat);
        mesh.position.set(pb.x, pb.y + pb.size * 0.5, pb.z);
        this.dynamicGroup.add(mesh);
        this.pushMeshes.set(pb.id, mesh);
      }

      // 3) 太阳压力压板
      for (const pl of s.plates) {
        const mat = new THREE.MeshStandardMaterial({
          color: 0xf59e0b, emissive: 0xb45309, emissiveIntensity: 0.35, metalness: 0.6, roughness: 0.35,
        });
        this.instinctMats.push({ mat, baseColor: 0xb45309, baseInt: 0.35 });
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(pl.radius, pl.radius * 1.06, 0.12, 20), mat);
        mesh.position.set(pl.x, pl.y + 0.06, pl.z);
        this.dynamicGroup.add(mesh);
        this.plateMeshes.set(pl.id, { mesh, mat });
      }

      // 4) 石壁拉杆机关
      for (const lv of s.levers) {
        const grp = new THREE.Group();
        grp.position.set(lv.x, lv.y + 1.15, lv.z);
        grp.rotation.y = lv.facing || 0;
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.65, 0.12), new THREE.MeshStandardMaterial({ color: 0x78350f, metalness: 0.65 }));
        const armPivot = new THREE.Group();
        const leverMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xb45309, emissiveIntensity: 0.35, metalness: 0.8 });
        this.instinctMats.push({ mat: leverMat, baseColor: 0xb45309, baseInt: 0.35 });
        const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.65, 8), leverMat);
        rod.position.set(0, 0.25, 0.22);
        rod.rotation.x = 0.55;
        const knob = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), leverMat);
        knob.position.set(0, 0.52, 0.42);
        armPivot.add(rod, knob);
        grp.add(plate, armPivot);
        this.dynamicGroup.add(grp);
        this.leverMeshes.set(lv.id, { grp, armPivot });
      }

      // 5) 古代厚重升降石门
      for (const g of s.gates) {
        const mat = new THREE.MeshStandardMaterial({ map: makeStoneTexture('gold_trim'), roughness: 0.6, metalness: 0.3 });
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(g.w, g.h, g.d), mat);
        mesh.position.set(g.x, g.y + g.h * 0.5, g.z);
        this.dynamicGroup.add(mesh);
        this.gateMeshes.set(g.id, mesh);
      }

      // 6) 伸缩地刺陷阱
      const spikeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.88, roughness: 0.22 });
      for (const sk of s.spikes) {
        const grp = new THREE.Group();
        grp.position.set(sk.x, sk.y, sk.z);
        const bed = new THREE.Mesh(new THREE.BoxGeometry(sk.w, 0.08, sk.d), new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.8 }));
        bed.position.y = 0.04;
        grp.add(bed);
        const blades = new THREE.Group();
        for (let ix = -2; ix <= 2; ix++) {
          for (let iz = -1; iz <= 1; iz++) {
            const cone = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.85, 6), spikeMat);
            cone.position.set(ix * (sk.w * 0.2), 0.42, iz * (sk.d * 0.3));
            blades.add(cone);
          }
        }
        grp.add(blades);
        this.dynamicGroup.add(grp);
        this.spikeMeshes.set(sk.id, blades);
      }

      // 7) 经典巨石滚落球体
      for (const b of s.boulders) {
        const mesh = new THREE.Mesh(
          new THREE.DodecahedronGeometry(b.radius, 2),
          new THREE.MeshStandardMaterial({ map: makeStoneTexture('rock'), roughness: 0.86 })
        );
        mesh.position.set(b.x, b.y, b.z);
        this.dynamicGroup.add(mesh);
        this.boulderMeshes.set(b.id, mesh);
      }

      // 8) 收集品：黄金圣物 (Secrets) / 古代齿轮 (Cogs) / 经典急救包 (Medipacks)
      for (const pk of s.pickups) {
        const grp = new THREE.Group();
        grp.position.set(pk.x, pk.y + 0.65, pk.z);
        if (pk.kind === 'artifact') {
          const mat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.9, roughness: 0.16, emissive: 0xd97706, emissiveIntensity: 0.45 });
          this.instinctMats.push({ mat, baseColor: 0xd97706, baseInt: 0.45 });
          const cup = new THREE.Mesh(new THREE.OctahedronGeometry(0.32, 0), mat);
          const ring = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.035, 8, 20), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
          grp.add(cup, ring);
        } else if (pk.kind === 'cog') {
          const mat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.2, emissive: 0xb45309, emissiveIntensity: 0.4 });
          this.instinctMats.push({ mat, baseColor: 0xb45309, baseInt: 0.4 });
          const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.09, 8, 16), mat);
          for (let i = 0; i < 6; i++) {
            const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.86, 0.10), mat);
            tooth.rotation.z = (i / 6) * Math.PI;
            grp.add(tooth);
          }
          grp.add(wheel);
        } else {
          // 经典白底红十字古墓急救包
          const box = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.32, 0.36), new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }));
          const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.38), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
          const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.24, 0.38), new THREE.MeshBasicMaterial({ color: 0xef4444 }));
          grp.add(box, cross1, cross2);
        }
        this.dynamicGroup.add(grp);
        this.pickupMeshes.set(pk.id, grp);
      }

      // 9) 终点目标（石门金光 / 旋转亚特兰蒂斯司祭神骸 Scion！）
      const goal = s.level.goal;
      if (goal) {
        const gGrp = new THREE.Group();
        gGrp.position.set(goal.x, goal.y + 1.45, goal.z);
        const scionMat = new THREE.MeshStandardMaterial({
          color: 0xfef08a, metalness: 0.92, roughness: 0.14, emissive: 0xf59e0b, emissiveIntensity: 0.65,
        });
        const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), scionMat);
        const outer = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.08, 10, 28), scionMat);
        const inner = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.05, 8, 22), new THREE.MeshBasicMaterial({ color: 0x38bdf8 }));
        inner.rotation.x = Math.PI * 0.5;
        gGrp.add(core, outer, inner);
        this.dynamicGroup.add(gGrp);
        this.goalMesh = gGrp;
      }

      // 10) 壁挂火把 + 体积阳光束 + 失落山谷动态大瀑布与史前棕榈树！
      const shaftMat = new THREE.MeshBasicMaterial({
        color: cfg.shaftColor, transparent: true, opacity: 0.09, side: THREE.DoubleSide, depthWrite: false,
      });
      for (const sz of [0, -18, -36, -52]) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 3.6, 20, 12, 1, true), shaftMat);
        shaft.position.set(sz % 36 === 0 ? -2 : 2, 10, sz);
        shaft.rotation.z = -0.2;
        this.worldGroup.add(shaft);
      }

      const sconceMat = new THREE.MeshStandardMaterial({ color: 0x451a03, metalness: 0.65 });
      for (let i = 0; i < (s.level.torches || []).length; i++) {
        const [tx, ty, tz] = s.level.torches[i];
        const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.09, 0.55, 8), sconceMat);
        holder.position.set(tx, ty, tz);
        const flame = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.52, 6), new THREE.MeshBasicMaterial({ color: 0xfb923c }));
        flame.position.set(tx, ty + 0.45, tz);
        this.worldGroup.add(holder, flame);
        this.torchFlames.push({ mesh: flame, phase: i * 1.3 });
      }

      if (s.level.hasWaterfall) {
        // 失落山谷标志性飞流直下 3D 大瀑布 + 碧玉河水 + 丛林棕榈树！
        this.waterfallTex = makeWaterfallTex();
        const wf = new THREE.Mesh(
          new THREE.PlaneGeometry(7.2, 18.0),
          new THREE.MeshBasicMaterial({ map: this.waterfallTex, transparent: true, opacity: 0.88, side: THREE.DoubleSide })
        );
        wf.position.set(14.4, 8.2, -33.5);
        wf.rotation.y = -Math.PI * 0.5;
        this.worldGroup.add(wf);

        const mistPool = new THREE.Mesh(
          new THREE.CircleGeometry(5.5, 24),
          new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.55 })
        );
        mistPool.rotation.x = -Math.PI * 0.5;
        mistPool.position.set(11.5, 0.05, -33.5);
        this.worldGroup.add(mistPool);

        for (const [px, pz] of [[-12.5, -5], [12.5, -6], [-13, -27], [13, -18], [-12.5, -42], [12.5, -44]]) {
          const palm = createPalmTree();
          palm.position.set(px, 0, pz);
          palm.rotation.y = px + pz;
          this.worldGroup.add(palm);
        }
      }

      if (theme === 'vilcabamba') {
        // 维尔卡班巴碧绿古水池反光底面
        const water = new THREE.Mesh(
          new THREE.PlaneGeometry(42, 76),
          new THREE.MeshStandardMaterial({ color: 0x0e7490, emissive: 0x083344, emissiveIntensity: 0.4, roughness: 0.15, metalness: 0.45 })
        );
        water.rotation.x = -Math.PI * 0.5;
        water.position.set(0, -1.65, -26);
        this.worldGroup.add(water);
      }

      // 同步初始镜头位置（柔和落在劳拉右后越肩视角）
      this.camPos.set(s.px + 0.4, s.py + 3.0, s.pz + 5.6);
      this.camLook.set(s.px, s.py + 1.45, s.pz - 2.0);
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

      // 1) 更新劳拉 3D 位置与 18 关节骨骼动画
      this.laraMesh.position.set(s.px, s.py, s.pz);
      this.laraMesh.rotation.y = s.facingYaw;
      TR.animateLara(this.laraMesh, s, this.t, dt);

      // 2) 第三人称越肩平滑追踪镜头
      const dist = 5.35;
      const horiz = Math.cos(s.camPitch) * dist;
      const fwdX = -Math.sin(s.camYaw);
      const fwdZ = -Math.cos(s.camYaw);
      const rightX = Math.cos(s.camYaw);
      const rightZ = -Math.sin(s.camYaw);

      const desiredPos = new THREE.Vector3(
        s.px - fwdX * horiz + rightX * 0.42,
        Math.max(s.py + 0.85, s.py + 1.95 - Math.sin(s.camPitch) * dist),
        s.pz - fwdZ * horiz + rightZ * 0.42
      );
      const desiredLook = new THREE.Vector3(
        s.px + fwdX * 2.2 + rightX * 0.22,
        s.py + 1.48,
        s.pz + fwdZ * 2.2 + rightZ * 0.22
      );

      const lerpK = Math.min(1, dt * 11);
      this.camPos.lerp(desiredPos, lerpK);
      this.camLook.lerp(desiredLook, lerpK);

      this.shakeMag = Math.max(0, this.shakeMag - dt * 1.9);
      const sx = (Math.random() - 0.5) * this.shakeMag * 0.25;
      const sy = (Math.random() - 0.5) * this.shakeMag * 0.22;
      this.camera.position.set(this.camPos.x + sx, this.camPos.y + sy, this.camPos.z);
      this.camera.lookAt(this.camLook);

      // 3) 求生本能 (Q) 高亮脉动
      const pulse = 0.68 + Math.sin(this.t * 6.5) * 0.28;
      for (const item of this.instinctMats) {
        if (s.instinctOn) {
          item.mat.emissive.setHex(0xfacc15);
          item.mat.emissiveIntensity = pulse;
        } else {
          item.mat.emissive.setHex(item.baseColor);
          item.mat.emissiveIntensity = item.baseInt;
        }
      }

      // 4) 动态更新碎裂桥、石块、压板、拉杆、石门、地刺、滚石、拾取物、瀑布、火把
      for (const b of s.blocks) {
        if (!b.crumble) continue;
        const bm = this.blockMeshes.get(b.id);
        if (!bm) continue;
        bm.mesh.visible = b.crumbleState !== 'fallen';
        if (b.crumbleState === 'shaking') {
          bm.mesh.position.set(
            bm.baseX + (Math.random() - 0.5) * 0.12,
            bm.baseY - 0.04,
            bm.baseZ + (Math.random() - 0.5) * 0.12
          );
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
          if (pl.active) { pm.mat.emissive.setHex(0x22c55e); pm.mat.emissiveIntensity = 0.7; }
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
        if (sm) sm.position.y = -0.82 + sk.extended * 0.82;
      }

      for (const bd of s.boulders) {
        const bm = this.boulderMeshes.get(bd.id);
        if (bm) {
          bm.position.set(bd.x, bd.y, bd.z);
          bm.rotation.x = bd.rotX;
        }
      }

      for (const pk of s.pickups) {
        const pm = this.pickupMeshes.get(pk.id);
        if (!pm) continue;
        pm.visible = !pk.collected;
        if (!pk.collected) {
          pm.rotation.y = this.t * 2.1;
          pm.position.y = pk.y + 0.65 + Math.sin(this.t * 3.2 + pk.x) * 0.14;
        }
      }

      if (this.goalMesh) {
        this.goalMesh.rotation.y = this.t * 1.4;
        this.goalMesh.position.y = s.level.goal.y + 1.45 + Math.sin(this.t * 2.6) * 0.18;
      }
      if (this.waterfallTex) {
        this.waterfallTex.offset.y = (this.t * 1.8) % 1;
      }
      for (const f of this.torchFlames) {
        f.mesh.scale.set(1, 0.85 + Math.sin(this.t * 13 + f.phase) * 0.22, 1);
      }

      // 5) 敌人（雪狼 / 巨熊 / 史前霸王龙 Boss）
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
        TR.animateEnemy(em, e, this.t, dt, this.camera.position);
      }
      for (const [id, em] of this.enemyMeshes.entries()) {
        if (!aliveIds.has(id)) {
          this.dynamicGroup.remove(em);
          Studio.disposeObject(em);
          this.enemyMeshes.delete(id);
        }
      }

      // 6) 毒箭与双枪曳光弹道
      while (this.dartMeshes.length < s.dartProjectiles.length) {
        const dm = new THREE.Mesh(
          new THREE.ConeGeometry(0.08, 0.65, 5),
          new THREE.MeshBasicMaterial({ color: 0x4ade80 })
        );
        dm.rotation.z = Math.PI * 0.5;
        this.fxGroup.add(dm);
        this.dartMeshes.push(dm);
      }
      for (let i = 0; i < this.dartMeshes.length; i++) {
        const dm = this.dartMeshes[i];
        const dp = s.dartProjectiles[i];
        dm.visible = !!dp;
        if (dp) {
          dm.position.set(dp.x, dp.y, dp.z);
          dm.rotation.y = Math.atan2(dp.vx, dp.vz);
        }
      }

      while (this.tracerMeshes.length < s.tracers.length) {
        const tm = new THREE.Mesh(
          new THREE.BoxGeometry(0.05, 0.05, 1),
          new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.9 })
        );
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
          tm.scale.set(tr.heavy ? 2.2 : 1.0, tr.heavy ? 2.2 : 1.0, len);
          tm.lookAt(tr.x1, tr.y1, tr.z1);
          tm.material.color.setHex(tr.heavy ? 0xf97316 : 0xfef08a);
          tm.material.opacity = tr.life / tr.maxLife;
        }
      }

      // 7) 打击与机关火花
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

      this.gl.render(this.scene, this.camera);
    }

    dispose() {
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
