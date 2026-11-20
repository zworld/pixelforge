/* 神雕侠侣 · 问情剑 — 《仙剑奇侠传》国风 3D 渲染器（青绿山水天穹、汉白玉石台、花木宫灯、16 关节灵动人物与第一人称神兵） */
(function (G) {
  'use strict';
  const Studio = G.Studio;
  const CH = (G.CH = G.CH || {});

  const THEMES = {
    tomb: {
      // 终南古墓 · 仙剑青绿夜月玉雾
      skyTop: '#0b2240',
      skyMid: '#184e68',
      skyBot: '#57b8b8',
      mountainFar: '#123850',
      mountainNear: '#0d263b',
      cloudColor: 'rgba(186, 242, 245, 0.32)',
      fog: 0x1b475c,
      fogDensity: 0.011,
      hemiSky: 0xbaf2ff,
      hemiGround: 0x264156,
      sunColor: 0xe6f9ff,
      sunPos: [16, 26, -18],
      floorBase: '#30475c',
      floorTile: '#3b5870',
      floorLine: '#7dd3fc',
      accent: 0x67e8f9,
      lantern: 0xfde68a,
      particleColor: 0xfef08a,
      moonColor: '#f0fdff',
      shaftColor: 0x7dd3fc,
    },
    valley: {
      // 绝情花谷 · 仙剑桃红丹霞暮景
      skyTop: '#3b1548',
      skyMid: '#9d3666',
      skyBot: '#f8a57a',
      mountainFar: '#6d234d',
      mountainNear: '#471535',
      cloudColor: 'rgba(255, 208, 194, 0.36)',
      fog: 0x6e284b,
      fogDensity: 0.010,
      hemiSky: 0xffd1dc,
      hemiGround: 0x4b2434,
      sunColor: 0xffd6b3,
      sunPos: [-18, 22, -20],
      floorBase: '#4d3544',
      floorTile: '#5d4050',
      floorLine: '#fda4af',
      accent: 0xfb7185,
      lantern: 0xfdba74,
      particleColor: 0xff9eb5,
      moonColor: '#ffe4e6',
      shaftColor: 0xfda4af,
    },
    mound: {
      // 独孤剑冢 · 水墨云海苍松剑峰
      skyTop: '#162844',
      skyMid: '#375978',
      skyBot: '#b6d0e0',
      mountainFar: '#27425c',
      mountainNear: '#1a2c40',
      cloudColor: 'rgba(235, 245, 255, 0.42)',
      fog: 0x3b5870,
      fogDensity: 0.010,
      hemiSky: 0xe2f0ff,
      hemiGround: 0x334155,
      sunColor: 0xfff3d1,
      sunPos: [14, 28, -16],
      floorBase: '#3c4856',
      floorTile: '#4a5868',
      floorLine: '#e2e8f0',
      accent: 0xfbbf24,
      lantern: 0xfde68a,
      particleColor: 0xf8fafc,
      moonColor: '#fffbeb',
      shaftColor: 0xfef3c7,
    },
    xiangyang: {
      // 襄阳决战 · 残阳金霞烽火城头
      skyTop: '#2a0d1c',
      skyMid: '#8a2323',
      skyBot: '#f59e0b',
      mountainFar: '#59181c',
      mountainNear: '#3b1113',
      cloudColor: 'rgba(254, 215, 140, 0.34)',
      fog: 0x5c1f1a,
      fogDensity: 0.0095,
      hemiSky: 0xffcf87,
      hemiGround: 0x452218,
      sunColor: 0xffe4a3,
      sunPos: [20, 22, -22],
      floorBase: '#4c3a32',
      floorTile: '#5c463b',
      floorLine: '#fbbf24',
      accent: 0xfacc15,
      lantern: 0xfb923c,
      particleColor: 0xfdba74,
      moonColor: '#fef08a',
      shaftColor: 0xfbbf24,
    },
  };

  /** 手绘国风青绿/丹霞/水墨山水云海天穹（1024×512） */
  function makeSkyTexture(cfg) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext('2d');

    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, cfg.skyTop);
    g.addColorStop(0.45, cfg.skyMid);
    g.addColorStop(0.76, cfg.skyBot);
    g.addColorStop(1, cfg.mountainNear);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);

    // 璀璨星点（天顶微芒）
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    for (let i = 0; i < 90; i++) {
      const sx = (i * 137) % 1024;
      const sy = (i * 53) % 190;
      const sr = (i % 3 === 0) ? 1.8 : 1.0;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 仙剑明月 / 残阳辉光
    const gx = 512, gy = 164;
    const mg = ctx.createRadialGradient(gx, gy, 16, gx, gy, 130);
    mg.addColorStop(0, '#ffffff');
    mg.addColorStop(0.22, cfg.moonColor);
    mg.addColorStop(0.55, cfg.moonColor + '66');
    mg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(gx, gy, 130, 0, Math.PI * 2);
    ctx.fill();

    // 柔和羽化流云霞带（径向透明渐变，杜绝生硬椭圆色块）
    for (let i = 0; i < 14; i++) {
      const cx = (i * 88 + 20) % 1024;
      const cy = 210 + Math.sin(i * 1.4) * 44;
      const rx = 115 + (i % 3) * 38;
      const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx);
      cg.addColorStop(0, cfg.cloudColor);
      cg.addColorStop(0.55, cfg.cloudColor.replace(/0\.\d+/, '0.10'));
      cg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(1, 0.22);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // 远景水墨群峰（两层景深叠加）
    const drawMountainLayer = (baseY, amp1, amp2, freq1, freq2, color) => {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(0, 512);
      for (let x = 0; x <= 1024; x += 12) {
        const y = baseY - Math.abs(Math.sin(x * freq1)) * amp1 - Math.cos(x * freq2) * amp2;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(1024, 512);
      ctx.closePath();
      ctx.fill();
    };
    drawMountainLayer(340, 74, 24, 0.008, 0.022, cfg.mountainFar);
    // 山腰云雾轻笼
    const mistG = ctx.createLinearGradient(0, 290, 0, 380);
    mistG.addColorStop(0, 'rgba(255,255,255,0)');
    mistG.addColorStop(0.5, cfg.cloudColor);
    mistG.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = mistG;
    ctx.fillRect(0, 290, 1024, 90);
    drawMountainLayer(395, 58, 20, 0.011, 0.031, cfg.mountainNear);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 雕花汉白玉/青石莲花太极演武台地面（1024×1024） */
  function makeFloorTexture(cfg) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 1024;
    const ctx = c.getContext('2d');

    const bg = ctx.createRadialGradient(512, 512, 40, 512, 512, 512);
    bg.addColorStop(0, cfg.floorTile);
    bg.addColorStop(0.75, cfg.floorBase);
    bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 1024);

    // 细腻青石拼缝与径向石砖
    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = 2;
    for (let r = 80; r <= 490; r += 68) {
      ctx.beginPath();
      ctx.arc(512, 512, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(512 + Math.cos(a) * 80, 512 + Math.sin(a) * 80);
      ctx.lineTo(512 + Math.cos(a) * 498, 512 + Math.sin(a) * 498);
      ctx.stroke();
    }

    // 中央仙剑风格莲花瓣 + 太极流光青铜嵌纹
    ctx.strokeStyle = cfg.floorLine + '88';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(512, 512, 165, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(512, 512, 185, 0, Math.PI * 2);
    ctx.stroke();

    // 八瓣莲花雕纹
    ctx.strokeStyle = cfg.floorLine + '70';
    ctx.lineWidth = 4;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ctx.save();
      ctx.translate(512, 512);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -185);
      ctx.quadraticCurveTo(54, -240, 0, -295);
      ctx.quadraticCurveTo(-54, -240, 0, -185);
      ctx.stroke();
      ctx.restore();
    }

    // 外圈双轨金玉纹
    ctx.strokeStyle = cfg.floorLine + 'aa';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(512, 512, 466, 0, Math.PI * 2);
    ctx.stroke();

    // 柔化石材纹理颗粒
    for (let i = 0; i < 1600; i++) {
      const x = (i * 173) % 1024;
      const y = (i * 317) % 1024;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
      ctx.fillRect(x, y, 5, 5);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 第一人称神兵雕花剑身纹理（百炼花纹钢 + 剑脊古篆流光） */
  function makeBladeTexture(isHeavy) {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 512;
    const ctx = c.getContext('2d');

    const g = ctx.createLinearGradient(0, 0, 128, 0);
    if (isHeavy) {
      g.addColorStop(0, '#475569');
      g.addColorStop(0.25, '#272c36');
      g.addColorStop(0.5, '#1e242d');
      g.addColorStop(0.75, '#272c36');
      g.addColorStop(1, '#475569');
    } else {
      g.addColorStop(0, '#ffffff');
      g.addColorStop(0.2, '#cbd5e1');
      g.addColorStop(0.5, '#f8fafc');
      g.addColorStop(0.8, '#cbd5e1');
      g.addColorStop(1, '#ffffff');
    }
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 512);

    // 锻打水波纹
    ctx.strokeStyle = isHeavy ? 'rgba(251,191,36,0.16)' : 'rgba(56,189,248,0.22)';
    ctx.lineWidth = 2;
    for (let y = 16; y < 500; y += 22) {
      ctx.beginPath();
      ctx.moveTo(8, y);
      ctx.quadraticCurveTo(64, y + (y % 44 === 0 ? 12 : -12), 120, y);
      ctx.stroke();
    }

    // 剑脊铭文线
    ctx.fillStyle = isHeavy ? '#f59e0b' : '#38bdf8';
    ctx.fillRect(58, 36, 12, 430);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 搭建一株仙剑风国风花树/苍松（曲折树干 + 繁茂分层花叶冠） */
  function createTree(kind) {
    const g = new THREE.Group();
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3121, roughness: 0.88 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, 3.2, 8), trunkMat);
    trunk.position.y = 1.5;
    trunk.rotation.z = 0.08;
    g.add(trunk);

    const branch1 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 1.8, 6), trunkMat);
    branch1.position.set(0.55, 2.7, 0.2);
    branch1.rotation.z = -0.62;
    g.add(branch1);

    const branch2 = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.6, 6), trunkMat);
    branch2.position.set(-0.52, 2.5, -0.2);
    branch2.rotation.z = 0.58;
    g.add(branch2);

    const foliageColors = kind === 'blossom'
      ? [0xf43f5e, 0xfb7185, 0xfda4af, 0xffe4e6]
      : [0x14532d, 0x166534, 0x15803d, 0x22c55e];

    const puffs = [
      [0, 3.6, 0, 1.35],
      [1.05, 3.25, 0.35, 1.05],
      [-1.0, 3.1, -0.25, 0.98],
      [0.35, 3.9, -0.65, 0.92],
      [-0.45, 3.8, 0.6, 0.88],
    ];
    puffs.forEach(([x, y, z, r], idx) => {
      const col = foliageColors[idx % foliageColors.length];
      const mat = new THREE.MeshStandardMaterial({
        color: col,
        emissive: kind === 'blossom' ? 0x9f1239 : 0x052e16,
        emissiveIntensity: kind === 'blossom' ? 0.25 : 0.15,
        roughness: 0.65,
      });
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), mat);
      puff.scale.set(1.2, 0.72, 1.15);
      puff.position.set(x, y, z);
      g.add(puff);
    });
    return g;
  }

  /** 建造精雕多翼羽 3D 神雕（独孤剑冢崖巅振翅） */
  function createMajesticCondor() {
    const condor = new THREE.Group();
    const featherDark = new THREE.MeshStandardMaterial({ color: 0x3b3532, roughness: 0.58, metalness: 0.16, emissive: 0x1c1917, emissiveIntensity: 0.35 });
    const featherGold = new THREE.MeshStandardMaterial({ color: 0x78593c, roughness: 0.52, metalness: 0.22 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.26, metalness: 0.55, emissive: 0xb45309, emissiveIntensity: 0.3 });

    // 雄健胸腹与脖颈
    const torso = new THREE.Mesh(new THREE.SphereGeometry(1.25, 16, 12), featherDark);
    torso.scale.set(0.88, 1.35, 1.02);
    condor.add(torso);
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), featherGold);
    chest.position.set(0, 0.2, 0.42);
    chest.scale.set(0.85, 1.05, 0.72);
    condor.add(chest);

    const headPivot = new THREE.Group();
    headPivot.position.set(0, 1.62, 0.36);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), featherDark);
    headPivot.add(head);
    // 雕冠羽
    for (let i = 0; i < 3; i++) {
      const plume = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.58, 6), featherGold);
      plume.position.set((i - 1) * 0.14, 0.58, -0.18 - i * 0.04);
      plume.rotation.x = -0.45;
      headPivot.add(plume);
    }
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.76, 8), beakMat);
    beak.rotation.x = Math.PI * 0.62;
    beak.position.set(0, -0.05, 0.68);
    headPivot.add(beak);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), eyeMat);
      eye.position.set(s * 0.32, 0.14, 0.46);
      headPivot.add(eye);
    }
    condor.add(headPivot);

    // 尾羽扇
    for (let i = -2; i <= 2; i++) {
      const tail = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.55, 0.12), i % 2 === 0 ? featherDark : featherGold);
      tail.position.set(i * 0.26, -1.25, -0.78);
      tail.rotation.set(0.55, 0, i * 0.14);
      condor.add(tail);
    }

    // 双展多段飞羽巨翼（内外两段关节，振翅更自然生动！）
    const wings = [];
    for (const side of [-1, 1]) {
      const innerPivot = new THREE.Group();
      innerPivot.position.set(side * 0.85, 0.55, -0.1);
      const innerWing = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.26, 1.35), featherDark);
      innerWing.position.set(side * 1.15, 0.12, 0);
      innerPivot.add(innerWing);

      const outerPivot = new THREE.Group();
      outerPivot.position.set(side * 2.3, 0.16, 0);
      for (let f = 0; f < 5; f++) {
        const feather = new THREE.Mesh(new THREE.BoxGeometry(1.95 - f * 0.16, 0.12, 0.34), f % 2 === 0 ? featherDark : featherGold);
        feather.position.set(side * (0.95 - f * 0.08), 0, -0.45 + f * 0.24);
        feather.rotation.y = -side * (0.12 * f);
        outerPivot.add(feather);
      }
      innerPivot.add(outerPivot);
      condor.add(innerPivot);
      wings.push({ innerPivot, outerPivot, side });
    }
    return { group: condor, wings, headPivot };
  }

  class CondorHeroRenderer {
    constructor(gfx) {
      this.gfx = gfx;
      this.gl = gfx.gl;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.08, 220);
      this.camera.rotation.order = 'YXZ';
      this.scene.add(this.camera);

      this.envGroup = new THREE.Group();
      this.scene.add(this.envGroup);

      this.enemyGroup = new THREE.Group();
      this.scene.add(this.enemyGroup);

      this.projGroup = new THREE.Group();
      this.scene.add(this.projGroup);

      this.fxGroup = new THREE.Group();
      this.scene.add(this.fxGroup);

      this.viewmodelRoot = new THREE.Group();
      this.camera.add(this.viewmodelRoot);

      this.post = Studio.PBR ? new Studio.PBR.PostPipeline(this.gl) : null;
      this.envRT = null;
      this.godRayMats = [];

      this.enemyMeshes = new Map();
      this.projMeshes = new Map();
      this.slashMeshes = [];
      this.sparkList = [];
      this.lanterns = [];
      this.brazierFlames = [];
      this.banners = [];
      this.npcList = [];
      this.condorRig = null;
      this.ambientPts = null;

      this.themeId = null;
      this.weaponId = null;
      this.hand = 'right';
      this.swayYaw = 0;
      this.swayPitch = 0;
      this.lastYaw = 0;
      this.lastPitch = 0;
      this.bobPhase = 0;
      this.fovCurrent = 68;
      this.fovTarget = 68;
      this.shakeMag = 0;
      this.t = 0;

      this.sparkGeo = new THREE.OctahedronGeometry(0.08, 0);
      this.slashGeo = new THREE.RingGeometry(0.95, 1.92, 24, 1, -Math.PI * 0.44, Math.PI * 0.88);
      this.palmRingGeo = new THREE.RingGeometry(0.55, 1.22, 36);
    }

    ensureScene(state) {
      if (this.themeId !== state.chapter.theme) {
        this.buildEnvironment(state.chapter.theme, state.arenaRadius);
      }
      if (this.weaponId !== state.weapon.id) {
        this.buildViewmodel(state.weapon.id);
      }
    }

    buildEnvironment(themeId, radius) {
      this.themeId = themeId;
      Studio.disposeObject(this.envGroup);
      this.envGroup.clear();
      this.lanterns = [];
      this.brazierFlames = [];
      this.banners = [];
      this.npcList = [];
      this.condorRig = null;

      const cfg = THEMES[themeId] || THEMES.tomb;
      this.scene.fog = new THREE.FogExp2(cfg.fog, cfg.fogDensity);
      this.scene.background = new THREE.Color(cfg.fog);

      // 1. 仙剑手绘天穹
      const skyTex = makeSkyTexture(cfg);
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(120, 32, 20),
        new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
      );
      this.envGroup.add(sky);

      // 2. 通透明亮三点国风光照（高饱和玉色/霞光氛围，拒绝死黑）
      const hemi = new THREE.HemisphereLight(cfg.hemiSky, cfg.hemiGround, 1.65);
      this.envGroup.add(hemi);
      const dir = new THREE.DirectionalLight(cfg.sunColor, 1.75);
      dir.position.set(...cfg.sunPos);
      this.envGroup.add(dir);
      const rim = new THREE.DirectionalLight(cfg.accent, 0.95);
      rim.position.set(-cfg.sunPos[0], 14, 22);
      this.envGroup.add(rim);

      // 3. 实拍照片级 PBR 青石古台地面 + 悬浮发光八卦莲花阵纹！
      const floorMat = Studio.Assets3D
        ? Studio.Assets3D.createPhotoPBRMaterial(
            themeId === 'xiangyang' ? 'large_sandstone_blocks' : 'seaworn_stone_tiles',
            { color: themeId === 'valley' ? 0xcfb2bc : (themeId === 'xiangyang' ? 0xd2b59b : 0xb5c9d8), repeatX: 6, repeatY: 6, roughness: 0.72, normalScale: 1.35 }
          )
        : new THREE.MeshStandardMaterial({ map: makeFloorTexture(cfg), roughness: 0.64, metalness: 0.16 });
      const floor = new THREE.Mesh(
        new THREE.CylinderGeometry(radius + 0.8, radius + 1.8, 1.4, 48),
        floorMat
      );
      floor.position.y = -0.7;
      floor.receiveShadow = true;
      this.envGroup.add(floor);

      const sigilRing = new THREE.Mesh(
        new THREE.RingGeometry(4.2, 4.55, 48),
        new THREE.MeshBasicMaterial({ color: cfg.accent, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
      );
      sigilRing.rotation.x = -Math.PI / 2;
      sigilRing.position.y = 0.03;
      this.envGroup.add(sigilRing);

      // 汉白玉石栏与流光宫灯环绕
      const marbleMat = new THREE.MeshStandardMaterial({
        color: themeId === 'valley' ? 0xf5d0c5 : (themeId === 'xiangyang' ? 0x9c8b7e : 0xdbeafe),
        roughness: 0.55,
        metalness: 0.12,
      });
      const woodMat = new THREE.MeshStandardMaterial({
        color: themeId === 'valley' ? 0x991b1b : (themeId === 'xiangyang' ? 0x7c2d12 : 0x334155),
        roughness: 0.58,
      });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.72, roughness: 0.3, emissive: 0x92400e, emissiveIntensity: 0.25 });
      const lanternMat = new THREE.MeshBasicMaterial({ color: cfg.lantern });

      const count = 12;
      for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2;
        const px = Math.sin(a) * (radius + 0.35);
        const pz = -Math.cos(a) * (radius + 0.35);

        // 汉白玉望柱（正北留出主景通道）
        if (i !== 0) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 1.5, 8), marbleMat);
          post.position.set(px, 0.75, pz);
          const finial = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), goldMat);
          finial.position.set(px, 1.62, pz);
          this.envGroup.add(post, finial);

          // 隔柱设立雕花宫灯架 + 随风轻晃暖光灯笼
          if (i % 2 === 1) {
            const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.15, 4.6, 8), woodMat);
            pole.position.set(px * 1.03, 2.3, pz * 1.03);
            this.envGroup.add(pole);

            const arm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.12, 1.15), woodMat);
            arm.position.set(px * 0.99, 4.45, pz * 0.99);
            arm.rotation.y = -a;
            this.envGroup.add(arm);

            const lPivot = new THREE.Group();
            lPivot.position.set(px * 0.95, 4.4, pz * 0.95);
            const body = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), lanternMat);
            body.scale.set(0.85, 1.25, 0.85);
            body.position.y = -0.45;
            const capTop = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 0.10, 8), goldMat);
            capTop.position.y = -0.10;
            const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.38, 6), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
            tassel.position.y = -0.98;
            tassel.rotation.z = Math.PI;
            lPivot.add(body, capTop, tassel);
            this.envGroup.add(lPivot);
            this.lanterns.push({ pivot: lPivot, phase: i * 1.3 });
          }
        }
      }

      // 体积感柔边 GLSL 丁达尔神光柱 + PMREM IBL 环境金属反射！
      this.godRayMats = [];
      if (this.envRT) { this.envRT.dispose(); this.envRT = null; }
      if (Studio.PBR) {
        this.envRT = Studio.PBR.createEnvMap(this.gl, { bg: cfg.fog, sky: cfg.hemiSky, sun: cfg.sunColor, warm: cfg.lantern, cool: cfg.accent });
        this.scene.environment = this.envRT.texture;
      }
      const shaftMat = Studio.PBR
        ? Studio.PBR.createGodRayMaterial(cfg.shaftColor, 0.22)
        : new THREE.MeshBasicMaterial({ color: cfg.shaftColor, transparent: true, opacity: 0.085, side: THREE.DoubleSide, depthWrite: false });
      this.godRayMats.push(shaftMat);
      for (const sx of [-6, 0, 6]) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 3.4, 22, 16, 1, true), shaftMat);
        shaft.position.set(sx, 10, -radius * 0.45);
        shaft.rotation.z = -0.22;
        shaft.rotation.x = 0.14;
        this.envGroup.add(shaft);
      }

      // ---- 四大章节仙剑风地标景观 + 活灵活现的 NPC ----
      if (themeId === 'tomb') {
        // 活死人墓：实拍冰纹汉白玉月洞门 + 晶莹法线寒玉床 + 白衣小龙女！
        const jadeStoneMat = Studio.Assets3D
          ? Studio.Assets3D.createPhotoPBRMaterial('seaworn_stone_tiles', {
              color: 0xcbeeff, repeatX: 2, repeatY: 1, roughness: 0.24, metalness: 0.18,
              emissive: 0x0284c7, emissiveIntensity: 0.34, normalScale: 1.15,
            })
          : new THREE.MeshStandardMaterial({ color: 0xe0f2fe, emissive: 0x0ea5e9, emissiveIntensity: 0.45, roughness: 0.18, metalness: 0.22 });
        const archMat = Studio.Assets3D
          ? Studio.Assets3D.createPhotoPBRMaterial('large_sandstone_blocks', {
              color: 0xb8d4e8, repeatX: 4, repeatY: 1, roughness: 0.55, metalness: 0.10, normalScale: 1.3,
            })
          : marbleMat;

        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(4.8, 0.46, 12, 32, Math.PI),
          archMat
        );
        arch.position.set(0, 0.2, -(radius + 0.5));
        this.envGroup.add(arch);

        const bed = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.92, 2.3), jadeStoneMat);
        bed.position.set(0, 0.46, -(radius - 2.2));
        const bedRim = new THREE.Mesh(new THREE.BoxGeometry(4.82, 0.16, 2.52), archMat);
        bedRim.position.set(0, 0.08, -(radius - 2.2));
        this.envGroup.add(bed, bedRim);

        const frostHalo = new THREE.Mesh(
          new THREE.RingGeometry(2.5, 3.4, 32),
          new THREE.MeshBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.38, side: THREE.DoubleSide })
        );
        frostHalo.rotation.x = -Math.PI / 2;
        frostHalo.position.set(0, 0.06, -(radius - 2.2));
        this.envGroup.add(frostHalo);

        // 小龙女立于寒玉台侧，白衣飘飘、披帛飞舞，为杨过助阵！
        const xlnData = { npcId: 'xiaolongnu', isNpc: true, id: 9001, vx: 0, vz: 0 };
        const xlnMesh = CH.createArticulatedCharacter(xlnData);
        xlnMesh.position.set(-3.4, 0, -(radius - 2.4));
        xlnMesh.rotation.y = 0.35;
        this.envGroup.add(xlnMesh);
        this.npcList.push({ mesh: xlnMesh, data: xlnData });
      } else if (themeId === 'valley') {
        // 绝情花谷：双层飞檐朱红亭阁 + 八株盛开粉红情花古树！
        const pavilion = new THREE.Group();
        pavilion.position.set(0, 0, -(radius + 2.4));
        for (const [cx, cz] of [[-2.8, -2.0], [2.8, -2.0], [-2.8, 2.0], [2.8, 2.0]]) {
          const col = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 5.2, 10), woodMat);
          col.position.set(cx, 2.6, cz);
          pavilion.add(col);
        }
        const roof1 = new THREE.Mesh(new THREE.ConeGeometry(5.6, 2.0, 6), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.45 }));
        roof1.position.y = 6.0;
        const roof2 = new THREE.Mesh(new THREE.ConeGeometry(3.8, 1.8, 6), new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.45 }));
        roof2.position.y = 7.7;
        const spire = new THREE.Mesh(new THREE.OctahedronGeometry(0.45, 0), goldMat);
        spire.position.y = 8.9;
        pavilion.add(roof1, roof2, spire);
        this.envGroup.add(pavilion);

        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2 + 0.38;
          const tree = createTree('blossom');
          tree.position.set(Math.sin(a) * (radius + 2.6), 0, -Math.cos(a) * (radius + 2.6));
          tree.rotation.y = i * 1.2;
          tree.scale.setScalar(1.05 + (i % 3) * 0.16);
          this.envGroup.add(tree);
        }
      } else if (themeId === 'mound') {
        // 独孤剑冢：云海山巅 + 苍松 + 四剑碑（碑前插有 3D 古剑）+ 精雕振翅神雕！
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.86 });
        const cliff = new THREE.Mesh(new THREE.ConeGeometry(6.5, 7.6, 9), rockMat);
        cliff.position.set(0, 3.2, -(radius + 3.4));
        this.envGroup.add(cliff);

        // 缭绕云海云团
        const cloudMat = new THREE.MeshBasicMaterial({ color: 0xe2f0ff, transparent: true, opacity: 0.36 });
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const cl = new THREE.Mesh(new THREE.SphereGeometry(3.8 + (i % 3), 10, 8), cloudMat);
          cl.scale.set(1.6, 0.45, 1.3);
          cl.position.set(Math.sin(a) * (radius + 5.5), -1.8 + Math.sin(i) * 0.8, -Math.cos(a) * (radius + 5.5));
          this.envGroup.add(cl);
        }

        // 四座剑碑 + 插地古剑
        for (let idx = 0; idx < 4; idx++) {
          const i = idx - 1.5;
          const sx = i * 3.4;
          const sz = -(radius - 1.2);
          const slab = new THREE.Mesh(new THREE.BoxGeometry(0.82, 2.7 + Math.abs(i) * 0.35, 0.28), marbleMat);
          slab.position.set(sx, 1.35, sz);
          slab.rotation.y = -i * 0.2;
          this.envGroup.add(slab);

          const swBlade = new THREE.Mesh(new THREE.BoxGeometry(0.10, 1.45, 0.03), new THREE.MeshStandardMaterial({ color: idx === 2 ? 0x334155 : 0xe2e8f0, metalness: 0.85, roughness: 0.22 }));
          swBlade.position.set(sx, 0.85, sz + 0.55);
          swBlade.rotation.z = (idx % 2 ? 1 : -1) * 0.14;
          const swGuard = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.08), goldMat);
          swGuard.position.set(sx, 1.52, sz + 0.55);
          swGuard.rotation.z = swBlade.rotation.z;
          this.envGroup.add(swBlade, swGuard);
        }

        // 崖畔古松
        for (const sx of [-9.5, 9.5]) {
          const pine = createTree('pine');
          pine.position.set(sx, 0, -(radius + 1.5));
          pine.scale.setScalar(1.25);
          this.envGroup.add(pine);
        }

        // 精雕振翅神雕
        this.condorRig = createMajesticCondor();
        this.condorRig.group.position.set(0, 7.1, -(radius + 2.4));
        this.envGroup.add(this.condorRig.group);
      } else if (themeId === 'xiangyang') {
        // 襄阳城头：宋军城垛 + 双敌楼 + 飘扬战旗 + 青铜烽火盆 + 小龙女并肩观战！
        const wallMat = Studio.Assets3D
          ? Studio.Assets3D.createPhotoPBRMaterial('large_sandstone_blocks', { color: 0x8f7a6d, repeatX: 1, repeatY: 1, roughness: 0.85, normalScale: 1.4 })
          : new THREE.MeshStandardMaterial({ color: 0x6b5b52, roughness: 0.82 });
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.55, 0.72), wallMat);
          merlon.position.set(Math.sin(a) * (radius + 0.8), 0.78, -Math.cos(a) * (radius + 0.8));
          merlon.rotation.y = -a;
          this.envGroup.add(merlon);
        }

        const fireTex = Studio.Assets3D && Studio.Assets3D.getFireSpriteTexture ? Studio.Assets3D.getFireSpriteTexture() : null;
        const flagLabels = ['大宋', '襄阳'];
        for (let idx = 0; idx < 2; idx++) {
          const sx = idx === 0 ? -5.2 : 5.2;
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 8.6, 8), woodMat);
          pole.position.set(sx, 4.3, -(radius + 0.4));
          this.envGroup.add(pole);
          const bTex = Studio.Assets3D && Studio.Assets3D.makeBannerTexture
            ? Studio.Assets3D.makeBannerTexture(flagLabels[idx], '#991b1b', '#facc15')
            : null;
          const bannerMat = new THREE.MeshStandardMaterial({
            color: bTex ? 0xffffff : 0xdc2626,
            map: bTex || null,
            emissive: 0x7f1d1d,
            emissiveIntensity: 0.25,
            roughness: 0.65,
            side: THREE.DoubleSide,
          });
          const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.85, 3.2), bannerMat);
          flag.position.set(sx + (sx < 0 ? 0.92 : -0.92), 6.4, -(radius + 0.4));
          this.envGroup.add(flag);
          this.banners.push({ mesh: flag, phase: sx });

          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.45, 0.65, 12), goldMat);
          bowl.position.set(sx * 1.15, 0.95, -(radius - 1.5));
          const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.52, 0.72, 10), woodMat);
          stand.position.set(sx * 1.15, 0.36, -(radius - 1.5));
          if (fireTex) {
            const flame = new THREE.Sprite(new THREE.SpriteMaterial({
              map: fireTex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.95,
            }));
            flame.position.set(sx * 1.15, 2.05, -(radius - 1.5));
            flame.scale.set(1.9, 2.75, 1);
            this.envGroup.add(stand, bowl, flame);
            this.brazierFlames.push({ mesh: flame, phase: sx, isSprite: true });
          } else {
            const flame = new THREE.Mesh(new THREE.ConeGeometry(0.46, 1.35, 8), new THREE.MeshBasicMaterial({ color: 0xfb923c }));
            flame.position.set(sx * 1.15, 1.85, -(radius - 1.5));
            this.envGroup.add(stand, bowl, flame);
            this.brazierFlames.push({ mesh: flame, phase: sx });
          }
        }

        // 小龙女立于城头高台与杨过遥相呼应
        const xlnData = { npcId: 'xiaolongnu', isNpc: true, id: 9002, vx: 0, vz: 0 };
        const xlnMesh = CH.createArticulatedCharacter(xlnData);
        xlnMesh.position.set(3.8, 0, -(radius - 1.8));
        xlnMesh.rotation.y = -0.35;
        this.envGroup.add(xlnMesh);
        this.npcList.push({ mesh: xlnMesh, data: xlnData });
      }

      // 4. 氛围流萤/玉蜂/桃花瓣/火星微光粒子场
      const pCount = 150;
      const pos = new Float32Array(pCount * 3);
      for (let i = 0; i < pCount; i++) {
        pos[i * 3] = (Math.random() - 0.5) * radius * 2.2;
        pos[i * 3 + 1] = 0.5 + Math.random() * 9.5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * radius * 2.2;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const dotTex = Studio.Assets3D && Studio.Assets3D.getSoftGlowDotTexture ? Studio.Assets3D.getSoftGlowDotTexture() : null;
      this.ambientPts = new THREE.Points(
        pGeo,
        new THREE.PointsMaterial({
          color: cfg.particleColor,
          map: dotTex,
          size: themeId === 'valley' ? 0.34 : 0.26,
          transparent: true,
          opacity: 0.85,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        })
      );
      this.envGroup.add(this.ambientPts);
    }

    /** 第一人称《仙剑》级神兵视图模型（锦袍广袖 + 雕花剑格 + 纹理剑刃 + 飘逸剑穗 + 五指黯然左掌） */
    buildViewmodel(weaponId) {
      this.weaponId = weaponId;
      Studio.disposeObject(this.viewmodelRoot);
      this.viewmodelRoot.clear();

      const isHeavy = weaponId === 'heavy';
      this.hand = isHeavy ? 'left' : 'right';
      const side = isHeavy ? -1 : 1;

      this.weaponPivot = new THREE.Group();
      this.viewmodelRoot.add(this.weaponPivot);

      // 锦绣广袖前臂 + 握剑手掌
      const sleeveMat = new THREE.MeshStandardMaterial({ color: isHeavy ? 0x263142 : 0x1d4b6e, roughness: 0.55 });
      const cuffMat = new THREE.MeshStandardMaterial({ color: isHeavy ? 0xf59e0b : 0xbae6fd, metalness: 0.35, roughness: 0.35 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xf4cba8, roughness: 0.55 });

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.095, 0.44, 12), sleeveMat);
      arm.position.set(side * 0.08, -0.26, 0.22);
      arm.rotation.set(Math.PI * 0.36, 0, -side * 0.22);
      this.weaponPivot.add(arm);

      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.072, 0.065, 12), cuffMat);
      cuff.position.set(side * 0.03, -0.14, 0.06);
      cuff.rotation.copy(arm.rotation);
      this.weaponPivot.add(cuff);

      // 握柄手部立体建模
      const fist = new THREE.Mesh(new THREE.SphereGeometry(0.048, 10, 8), skinMat);
      fist.scale.set(1.05, 1.25, 0.92);
      fist.position.set(0, -0.04, 0.01);
      this.weaponPivot.add(fist);

      // 缠绳剑柄 + 雕花莲瓣护手
      const hiltMat = new THREE.MeshStandardMaterial({ color: isHeavy ? 0x451a03 : 0x1e293b, roughness: 0.72 });
      const guardMat = new THREE.MeshStandardMaterial({ color: isHeavy ? 0xd97706 : 0xfbbf24, metalness: 0.82, roughness: 0.22, emissive: 0x78350f, emissiveIntensity: 0.22 });

      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, isHeavy ? 0.26 : 0.20, 10), hiltMat);
      hilt.position.set(0, -0.06, 0);
      this.weaponPivot.add(hilt);

      const pommel = new THREE.Mesh(new THREE.OctahedronGeometry(0.032, 0), guardMat);
      pommel.position.set(0, isHeavy ? -0.20 : -0.17, 0);
      this.weaponPivot.add(pommel);

      const guardCenter = new THREE.Mesh(new THREE.OctahedronGeometry(isHeavy ? 0.055 : 0.042, 0), guardMat);
      guardCenter.position.set(0, 0.06, 0);
      const guardWings = new THREE.Mesh(new THREE.BoxGeometry(isHeavy ? 0.24 : 0.18, 0.034, isHeavy ? 0.065 : 0.044), guardMat);
      guardWings.position.set(0, 0.06, 0);
      this.weaponPivot.add(guardCenter, guardWings);

      const bladeTex = makeBladeTexture(isHeavy);
      if (isHeavy) {
        const bladeMat = new THREE.MeshStandardMaterial({
          map: bladeTex, metalness: 0.84, roughness: 0.26, emissive: 0x451a03, emissiveIntensity: 0.32,
        });
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.86, 0.028), bladeMat);
        blade.position.set(0, 0.50, 0);
        this.weaponPivot.add(blade);
        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.062, 0.13, 4), bladeMat);
        tip.rotation.y = Math.PI * 0.25;
        tip.scale.set(1.4, 1, 0.35);
        tip.position.set(0, 0.99, 0);
        this.weaponPivot.add(tip);
        const rune = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.68, 0.032), new THREE.MeshBasicMaterial({ color: 0xf59e0b }));
        rune.position.set(0, 0.48, 0);
        this.weaponPivot.add(rune);
        this.bladeGlowMat = rune.material;
      } else {
        const bladeMat = new THREE.MeshStandardMaterial({
          map: bladeTex, metalness: 0.90, roughness: 0.15, emissive: 0x0ea5e9, emissiveIntensity: 0.24,
        });
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.054, 0.88, 0.014), bladeMat);
        blade.position.set(0, 0.50, 0);
        this.weaponPivot.add(blade);
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.17, 4), bladeMat);
        tip.rotation.y = Math.PI * 0.25;
        tip.scale.set(1.0, 1, 0.32);
        tip.position.set(0, 1.02, 0);
        this.weaponPivot.add(tip);
        const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.78, 0.018), new THREE.MeshBasicMaterial({ color: 0x7dd3fc }));
        ridge.position.set(0, 0.48, 0);
        this.weaponPivot.add(ridge);
        this.bladeGlowMat = ridge.material;

        // 仙剑流光玉穗
        const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.20, 8), new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.35 }));
        tassel.position.set(0, -0.26, 0);
        tassel.rotation.z = Math.PI;
        this.weaponPivot.add(tassel);
        this.tassel = tassel;
      }

      // 黯然销魂掌 · 雕塑感五指左掌 + 双重旋转金芒太极环
      this.palmPivot = new THREE.Group();
      this.palmPivot.visible = false;
      const palmMat = new THREE.MeshStandardMaterial({
        color: 0xfde68a, emissive: 0xf59e0b, emissiveIntensity: 0.65, roughness: 0.28, transparent: true, opacity: 0.94,
      });
      const palmBase = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.028, 14), palmMat);
      palmBase.rotation.x = Math.PI * 0.5;
      palmBase.scale.set(1.0, 1.0, 1.15);
      this.palmPivot.add(palmBase);
      for (const [fx, fy, fh, fr, rot] of [
        [-0.048, 0.105, 0.095, 0.014, 0.14],
        [-0.016, 0.120, 0.112, 0.015, 0.04],
        [0.018, 0.116, 0.106, 0.014, -0.05],
        [0.048, 0.096, 0.084, 0.013, -0.16],
      ]) {
        const f = new THREE.Mesh(new THREE.CylinderGeometry(fr * 0.72, fr, fh, 8), palmMat);
        f.position.set(fx, fy, 0);
        f.rotation.z = rot;
        this.palmPivot.add(f);
      }
      const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.082, 8), palmMat);
      thumb.position.set(0.078, 0.012, 0.005);
      thumb.rotation.z = -0.82;
      this.palmPivot.add(thumb);

      const auraOuter = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.014, 8, 28), new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 }));
      auraOuter.position.z = -0.04;
      const auraInner = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.010, 8, 24), new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.78 }));
      auraInner.position.z = -0.03;
      this.palmPivot.add(auraOuter, auraInner);
      this.palmAuraOuter = auraOuter;
      this.viewmodelRoot.add(this.palmPivot);

      // 弹反火花点光 + 第一人称剑锋高光补光
      this.parryLight = new THREE.PointLight(0xfef08a, 0, 5.5);
      this.parryLight.position.set(0, -0.05, -0.75);
      const vmFill = new THREE.PointLight(isHeavy ? 0xffedd5 : 0xe0f2fe, 1.05, 3.6);
      vmFill.position.set(side * 0.25, 0.24, -0.35);
      this.viewmodelRoot.add(this.parryLight, vmFill);
    }

    spawnSparks(x, y, z, color, count = 14, speed = 7.5) {
      const mat = new THREE.MeshBasicMaterial({ color });
      for (let i = 0; i < count; i++) {
        const m = new THREE.Mesh(this.sparkGeo, mat);
        m.position.set(x, y, z);
        const a = Math.random() * Math.PI * 2;
        const v = speed * (0.4 + Math.random() * 0.8);
        this.fxGroup.add(m);
        this.sparkList.push({
          mesh: m,
          vx: Math.cos(a) * v,
          vy: 1.8 + Math.random() * 4.2,
          vz: Math.sin(a) * v,
          life: 0.28 + Math.random() * 0.22,
          maxLife: 0.45,
          sharedMat: i > 0,
        });
      }
    }

    pulseFov(delta) {
      this.fovTarget = Math.max(60, Math.min(82, 68 + delta));
    }

    addShake(mag) {
      this.shakeMag = Math.max(this.shakeMag, mag);
    }

    syncSlashes(state) {
      while (this.slashMeshes.length < state.slashes.length) {
        const mat = new THREE.MeshBasicMaterial({
          color: 0x7dd3fc, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false,
        });
        const m = new THREE.Mesh(this.slashGeo, mat);
        this.fxGroup.add(m);
        this.slashMeshes.push(m);
      }
      for (let i = 0; i < this.slashMeshes.length; i++) {
        const m = this.slashMeshes[i];
        const sl = state.slashes[i];
        if (!sl) { m.visible = false; continue; }
        m.visible = true;
        const p = 1 - sl.life / sl.maxLife;
        if (sl.kind === 'palm') {
          if (m.geometry !== this.palmRingGeo) m.geometry = this.palmRingGeo;
          m.material.color.setHex(0xfbbf24);
          m.material.opacity = (1 - p) * 0.85;
          m.position.set(sl.x, 0.25 + p * 0.8, sl.z);
          m.rotation.set(-Math.PI / 2, 0, p * 2.5);
          const sc = 0.8 + p * sl.radius;
          m.scale.set(sc, sc, 1);
        } else {
          if (m.geometry !== this.slashGeo) m.geometry = this.slashGeo;
          const isHeavy = sl.kind === 'heavy' || sl.kind === 'heavy_wave';
          m.material.color.setHex(isHeavy ? 0xf59e0b : 0x7dd3fc);
          m.material.opacity = (1 - p) * 0.82;
          const fx = -Math.sin(sl.yaw);
          const fz = -Math.cos(sl.yaw);
          m.position.set(sl.x + fx * 1.15, 1.38, sl.z + fz * 1.15);
          const tilt = sl.step === 1 ? 0.42 : (sl.step === 2 ? -0.42 : 1.15);
          const mirror = sl.hand === 'left' ? -1 : 1;
          m.rotation.set(Math.PI * 0.5 + tilt * mirror, sl.yaw, (p - 0.5) * 1.6 * mirror);
          const sc = (isHeavy ? 1.35 : 1.0) * (0.85 + p * 0.45);
          m.scale.set(sc, sc, 1);
        }
      }
    }

    syncProjectiles(state) {
      const alive = new Set();
      for (const p of state.projectiles) {
        alive.add(p.id);
        let mesh = this.projMeshes.get(p.id);
        if (!mesh) {
          const mat = new THREE.MeshBasicMaterial({ color: p.color || '#7dd3fc', side: THREE.DoubleSide });
          if (p.kind === 'wheel') {
            mesh = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.09, 8, 18), mat);
            mesh.rotation.x = Math.PI / 2;
          } else if (p.kind === 'jade_wave' || p.kind === 'heavy_wave') {
            mesh = new THREE.Mesh(new THREE.RingGeometry(0.45, p.kind === 'heavy_wave' ? 1.38 : 0.94, 18, 1, -Math.PI * 0.45, Math.PI * 0.9), mat);
            mesh.rotation.x = Math.PI / 2;
          } else {
            mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), mat);
            mesh.scale.set(0.6, 0.6, 2.2);
          }
          this.projGroup.add(mesh);
          this.projMeshes.set(p.id, mesh);
        }
        mesh.position.set(p.x, p.y || 1.35, p.z);
        if (p.kind === 'wheel') mesh.rotation.z += 0.38;
        else if (p.kind === 'jade_wave' || p.kind === 'heavy_wave') mesh.rotation.z = -p.yaw;
        else mesh.rotation.y = Math.atan2(p.vx, p.vz);
      }
      for (const [id, mesh] of this.projMeshes.entries()) {
        if (!alive.has(id)) {
          this.projGroup.remove(mesh);
          Studio.disposeObject(mesh);
          this.projMeshes.delete(id);
        }
      }
    }

    updateViewmodel(state, dt) {
      if (!this.weaponPivot) return;
      const isHeavy = this.weaponId === 'heavy';
      const side = isHeavy ? -1 : 1;

      let dYaw = state.yaw - this.lastYaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      const dPitch = state.pitch - this.lastPitch;
      this.lastYaw = state.yaw;
      this.lastPitch = state.pitch;

      this.swayYaw += (Math.max(-0.16, Math.min(0.16, -dYaw * 2.2)) - this.swayYaw) * Math.min(1, dt * 12);
      this.swayPitch += (Math.max(-0.12, Math.min(0.12, -dPitch * 1.8)) - this.swayPitch) * Math.min(1, dt * 12);

      const moveSpd = Math.hypot(state.vx, state.vz);
      this.bobPhase += dt * (2.2 + moveSpd * 1.25);
      const bobX = Math.cos(this.bobPhase) * (0.008 + moveSpd * 0.003);
      const bobY = Math.abs(Math.sin(this.bobPhase)) * (0.010 + moveSpd * 0.004);

      let px = side * (isHeavy ? 0.46 : 0.36) + this.swayYaw * 0.45 + bobX;
      let py = (isHeavy ? -0.44 : -0.34) + this.swayPitch * 0.35 - bobY;
      let pz = isHeavy ? -0.74 : -0.60;
      let rx = isHeavy ? -0.34 : -0.24;
      let ry = side * (isHeavy ? 0.44 : 0.28);
      let rz = side * (isHeavy ? 0.32 : 0.18);

      if (state.parryTimer > 0 || state.guardHeld) {
        const parryKick = state.parryFlash > 0 ? Math.sin((state.parryFlash / 0.28) * Math.PI) * 0.16 : 0;
        px = side * 0.06;
        py = -0.18 + parryKick * 0.4;
        pz = -0.46 + parryKick;
        rx = -0.12 - parryKick * 1.5;
        ry = side * 0.72;
        rz = side * 1.24;
      }

      if (state.swingTimer > 0) {
        const p = 1 - state.swingTimer / Math.max(0.05, state.swingDur);
        const ease = p < 0.26 ? -(p / 0.26) * 0.35 : Math.sin(((p - 0.26) / 0.74) * Math.PI);
        const dir = state.comboStep === 2 ? -1 : 1;
        if (state.comboStep === 3) {
          px = side * 0.12 * (1 - p);
          py = -0.14 + Math.cos(p * Math.PI) * 0.32;
          pz = -0.58 - ease * 0.28;
          rx = -1.45 * ease - 0.2;
          ry = side * 0.25 * (1 - p);
          rz = side * 0.35 * (1 - p);
        } else {
          px = side * (0.36 - ease * 0.68 * dir);
          py = -0.28 + ease * 0.12;
          pz = -0.56 - ease * 0.26;
          rx = -0.42 - ease * 0.78;
          ry = side * (0.28 + ease * 1.35 * dir);
          rz = side * (0.20 + ease * 1.15 * dir);
        }
      }

      if (state.palmAnimTimer > 0) {
        const p = 1 - state.palmAnimTimer / 0.58;
        const thrust = Math.sin(p * Math.PI);
        py -= 0.36 * thrust;
        this.palmPivot.visible = true;
        this.palmPivot.position.set(-0.22 + thrust * 0.10, -0.14 + thrust * 0.04, -0.52 - thrust * 0.36);
        this.palmPivot.rotation.set(0, 0.22 * (1 - thrust), 0.12 * (1 - thrust));
        this.palmPivot.scale.setScalar(0.85 + thrust * 0.32);
        if (this.palmAuraOuter) this.palmAuraOuter.rotation.z = this.t * 8;
      } else {
        this.palmPivot.visible = false;
      }

      this.weaponPivot.position.set(px, py, pz);
      this.weaponPivot.rotation.set(rx, ry, rz);

      if (this.tassel) this.tassel.rotation.x = Math.sin(this.t * 6) * 0.22 + moveSpd * 0.04;
      if (this.parryLight) this.parryLight.intensity = state.parryFlash > 0 ? (state.parryFlash / 0.28) * 6.5 : 0;
      if (this.bladeGlowMat) {
        const chiReady = state.chi >= state.skill.cost;
        this.bladeGlowMat.color.setHex(
          state.parryFlash > 0 ? 0xfef08a : (chiReady ? (isHeavy ? 0xfbbf24 : 0x7dd3fc) : 0x64748b)
        );
      }
    }

    render(state, dt = 1 / 60) {
      this.t += dt;
      this.ensureScene(state);

      const w = this.gfx.w || 960;
      const h = this.gfx.h || 540;
      if (Math.abs(this.camera.aspect - w / h) > 0.001) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
      }

      this.fovTarget += (68 - this.fovTarget) * Math.min(1, dt * 7);
      if (Math.abs(this.fovCurrent - this.fovTarget) > 0.05) {
        this.fovCurrent += (this.fovTarget - this.fovCurrent) * Math.min(1, dt * 14);
        this.camera.fov = this.fovCurrent;
        this.camera.updateProjectionMatrix();
      }

      this.shakeMag = Math.max(0, this.shakeMag - dt * 1.8);
      const sx = (Math.random() - 0.5) * this.shakeMag * 0.16;
      const sy = (Math.random() - 0.5) * this.shakeMag * 0.14;
      const moveSpd = Math.hypot(state.vx, state.vz);
      const camBob = Math.sin(this.bobPhase * 2) * Math.min(0.035, moveSpd * 0.004);
      this.camera.position.set(state.px + sx, CH.EYE_HEIGHT + state.py + camBob + sy, state.pz);
      this.camera.rotation.y = state.yaw;
      this.camera.rotation.x = state.pitch;
      this.camera.rotation.z = 0;

      this.updateViewmodel(state, dt);

      // 动态场景元素：宫灯摇曳、火盆焰动、战旗飘扬、神雕双段振翅、小龙女凌波呼吸
      for (const l of this.lanterns) {
        l.pivot.rotation.z = Math.sin(this.t * 1.8 + l.phase) * 0.09;
        l.pivot.rotation.x = Math.cos(this.t * 1.4 + l.phase) * 0.06;
      }
      for (const f of this.brazierFlames) {
        const sy = 0.88 + Math.sin(this.t * 12 + f.phase) * 0.20;
        if (f.isSprite) {
          const sx = 0.94 + Math.cos(this.t * 9 + f.phase) * 0.10;
          f.mesh.scale.set(1.9 * sx, 2.75 * sy, 1);
        } else {
          f.mesh.scale.set(1, sy, 1);
        }
      }
      for (const b of this.banners) {
        b.mesh.rotation.y = Math.sin(this.t * 3.4 + b.phase) * 0.24;
      }
      if (this.condorRig) {
        for (const wSeg of this.condorRig.wings) {
          const flap = Math.sin(this.t * 2.1);
          wSeg.innerPivot.rotation.z = wSeg.side * (0.16 + flap * 0.26);
          wSeg.outerPivot.rotation.z = wSeg.side * (0.12 + Math.sin(this.t * 2.1 - 0.5) * 0.34);
        }
        this.condorRig.headPivot.rotation.y = Math.sin(this.t * 0.9) * 0.28;
      }
      for (const npc of this.npcList) {
        CH.animateArticulatedCharacter(npc.mesh, npc.data, this.t, dt, this.camera.position, 0);
      }
      if (this.ambientPts) {
        this.ambientPts.rotation.y += dt * 0.06;
      }

      // 同步并驱动所有 16 关节灵动武林人物
      const aliveIds = new Set();
      for (const e of state.enemies) {
        aliveIds.add(e.id);
        let mesh = this.enemyMeshes.get(e.id);
        if (!mesh) {
          mesh = CH.createArticulatedCharacter(e, state.chapter.enemyPalette);
          this.enemyGroup.add(mesh);
          this.enemyMeshes.set(e.id, mesh);
        }
        mesh.position.set(e.x, 0, e.z);
        mesh.rotation.y = e.yaw;
        CH.animateArticulatedCharacter(mesh, e, this.t, dt, this.camera.position, state.lockTargetId);
      }
      for (const [id, mesh] of this.enemyMeshes.entries()) {
        if (!aliveIds.has(id)) {
          this.enemyGroup.remove(mesh);
          Studio.disposeObject(mesh);
          this.enemyMeshes.delete(id);
        }
      }

      this.syncProjectiles(state);
      this.syncSlashes(state);

      for (let i = this.sparkList.length - 1; i >= 0; i--) {
        const sp = this.sparkList[i];
        sp.life -= dt;
        if (sp.life <= 0) {
          this.fxGroup.remove(sp.mesh);
          if (!sp.sharedMat) sp.mesh.material.dispose();
          this.sparkList.splice(i, 1);
          continue;
        }
        sp.vy -= 14 * dt;
        sp.mesh.position.x += sp.vx * dt;
        sp.mesh.position.y = Math.max(0.05, sp.mesh.position.y + sp.vy * dt);
        sp.mesh.position.z += sp.vz * dt;
        sp.mesh.scale.setScalar(Math.max(0.1, sp.life / sp.maxLife));
      }

      for (const gm of this.godRayMats) if (gm.uniforms) gm.uniforms.uTime.value = this.t;

      if (this.post) {
        this.post.render(this.scene, this.camera, w, h, {
          bloom: 0.42,
          warmth: 0.05,
          vignette: 0.34,
          adrenaline: state.parryFlash > 0 ? 0.65 : 0,
        });
      } else {
        this.gl.render(this.scene, this.camera);
      }
    }

    dispose() {
      if (this.post) { this.post.dispose(); this.post = null; }
      if (this.envRT) { this.envRT.dispose(); this.envRT = null; }
      this.scene.environment = null;
      Studio.disposeObject(this.scene);
      this.sparkGeo.dispose();
      this.slashGeo.dispose();
      this.palmRingGeo.dispose();
      this.enemyMeshes.clear();
      this.projMeshes.clear();
      this.slashMeshes = [];
      this.sparkList = [];
      this.npcList = [];
    }
  }

  CH.Renderer3D = CondorHeroRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
