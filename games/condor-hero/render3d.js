/* 神雕侠侣 · 问情剑 — 第一人称 3D 国风武侠渲染器（共享 Studio.Gfx3D 单上下文，支持完整 dispose） */
(function (G) {
  'use strict';
  const Studio = G.Studio;
  const CH = (G.CH = G.CH || {});

  const THEMES = {
    tomb: {
      skyTop: '#060c1f',
      skyMid: '#0f233c',
      skyBot: '#1d445c',
      fog: 0x0e2236,
      fogDensity: 0.020,
      ambient: 0x6ea8c9,
      hemiSky: 0x7dd3fc,
      hemiGround: 0x162231,
      sunColor: 0xbbe6ff,
      sunPos: [14, 24, -18],
      floorBase: '#182636',
      floorLine: '#38bdf8',
      accent: 0x38bdf8,
      particleColor: 0xfde68a,
      moonColor: '#e0f2fe',
    },
    valley: {
      skyTop: '#24091b',
      skyMid: '#6b1838',
      skyBot: '#d96b43',
      fog: 0x3a1326,
      fogDensity: 0.018,
      ambient: 0xf3a683,
      hemiSky: 0xfda4af,
      hemiGround: 0x2d101b,
      sunColor: 0xffb38a,
      sunPos: [-16, 18, -22],
      floorBase: '#2a1b24',
      floorLine: '#fb7185',
      accent: 0xfb7185,
      particleColor: 0xf43f5e,
      moonColor: '#fecdd3',
    },
    mound: {
      skyTop: '#090d16',
      skyMid: '#1e293b',
      skyBot: '#475569',
      fog: 0x192332,
      fogDensity: 0.022,
      ambient: 0x94a3b8,
      hemiSky: 0xcbd5e1,
      hemiGround: 0x1e293b,
      sunColor: 0xfde68a,
      sunPos: [10, 26, -15],
      floorBase: '#1f2630',
      floorLine: '#94a3b8',
      accent: 0xf59e0b,
      particleColor: 0xe2e8f0,
      moonColor: '#f8fafc',
    },
    xiangyang: {
      skyTop: '#160606',
      skyMid: '#4c1111',
      skyBot: '#b45309',
      fog: 0x2c0d0b,
      fogDensity: 0.017,
      ambient: 0xfbbf24,
      hemiSky: 0xf97316,
      hemiGround: 0x26100a,
      sunColor: 0xffd27d,
      sunPos: [18, 20, -24],
      floorBase: '#271c19',
      floorLine: '#f59e0b',
      accent: 0xfacc15,
      particleColor: 0xfb923c,
      moonColor: '#fde68a',
    },
  };

  function makeSkyTexture(cfg) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, cfg.skyTop);
    g.addColorStop(0.55, cfg.skyMid);
    g.addColorStop(1, cfg.skyBot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 256);

    // 国风水墨远山剪影
    ctx.fillStyle = 'rgba(6, 10, 20, 0.36)';
    ctx.beginPath();
    ctx.moveTo(0, 256);
    for (let x = 0; x <= 512; x += 16) {
      const h = 158 + Math.sin(x * 0.025) * 24 + Math.cos(x * 0.07) * 14;
      ctx.lineTo(x, h);
    }
    ctx.lineTo(512, 256);
    ctx.closePath();
    ctx.fill();

    // 明月 / 落日
    const gx = 256, gy = 90;
    const mg = ctx.createRadialGradient(gx, gy, 4, gx, gy, 54);
    mg.addColorStop(0, cfg.moonColor);
    mg.addColorStop(0.35, cfg.moonColor + '88');
    mg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = mg;
    ctx.beginPath();
    ctx.arc(gx, gy, 54, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function makeFloorTexture(cfg) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = cfg.floorBase;
    ctx.fillRect(0, 0, 512, 512);

    // 青石板径向阵纹
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 2;
    for (let r = 42; r <= 245; r += 40) {
      ctx.beginPath();
      ctx.arc(256, 256, r, 0, Math.PI * 2);
      ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(256 + Math.cos(a) * 42, 256 + Math.sin(a) * 42);
      ctx.lineTo(256 + Math.cos(a) * 250, 256 + Math.sin(a) * 250);
      ctx.stroke();
    }
    // 中央八卦意象双环
    ctx.strokeStyle = cfg.floorLine + '55';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(256, 256, 98, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(256, 256, 232, 0, Math.PI * 2);
    ctx.stroke();

    // 细微石材噪点
    for (let i = 0; i < 900; i++) {
      const x = (i * 73) % 512;
      const y = (i * 197) % 512;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(x, y, 4, 4);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  class CondorHeroRenderer {
    constructor(gfx) {
      this.gfx = gfx;
      this.gl = gfx.gl;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(68, 16 / 9, 0.08, 180);
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

      this.enemyMeshes = new Map();
      this.projMeshes = new Map();
      this.slashMeshes = [];
      this.sparkList = [];
      this.brazierFlames = [];
      this.condorWings = [];
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

      // 共享轻量几何体（避免频繁创建）
      this.sparkGeo = new THREE.OctahedronGeometry(0.08, 0);
      this.slashGeo = new THREE.RingGeometry(0.95, 1.85, 22, 1, -Math.PI * 0.42, Math.PI * 0.84);
      this.palmRingGeo = new THREE.RingGeometry(0.55, 1.15, 32);
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
      this.brazierFlames = [];
      this.condorWings = [];

      const cfg = THEMES[themeId] || THEMES.tomb;
      this.scene.fog = new THREE.FogExp2(cfg.fog, cfg.fogDensity);
      this.scene.background = new THREE.Color(cfg.fog);

      // 天穹球
      const skyTex = makeSkyTexture(cfg);
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(95, 28, 18),
        new THREE.MeshBasicMaterial({ map: skyTex, side: THREE.BackSide, fog: false })
      );
      this.envGroup.add(sky);

      // 光照（主光 + 半球环境光 + 逆光轮廓光，让国风人物与石柱立体感饱满）
      const hemi = new THREE.HemisphereLight(cfg.hemiSky, cfg.hemiGround, 1.38);
      this.envGroup.add(hemi);
      const dir = new THREE.DirectionalLight(cfg.sunColor, 1.55);
      dir.position.set(...cfg.sunPos);
      this.envGroup.add(dir);
      const rim = new THREE.DirectionalLight(cfg.accent, 0.72);
      rim.position.set(-cfg.sunPos[0], 12, 20);
      this.envGroup.add(rim);

      // 比武石台地面
      const floorTex = makeFloorTexture(cfg);
      const floor = new THREE.Mesh(
        new THREE.CylinderGeometry(radius + 0.6, radius + 1.4, 1.2, 40),
        new THREE.MeshStandardMaterial({ map: floorTex, roughness: 0.78, metalness: 0.14 })
      );
      floor.position.y = -0.6;
      this.envGroup.add(floor);

      // 场地外沿石栏与青铜火盆
      const pillarCount = 12;
      const pillarMat = new THREE.MeshStandardMaterial({
        color: themeId === 'valley' ? 0x7f1d1d : (themeId === 'xiangyang' ? 0x44403c : 0x334155),
        roughness: 0.72,
        metalness: 0.18,
      });
      const capMat = new THREE.MeshStandardMaterial({ color: cfg.accent, roughness: 0.35, metalness: 0.55, emissive: cfg.accent, emissiveIntensity: 0.22 });

      for (let i = 0; i < pillarCount; i++) {
        const a = (i / pillarCount) * Math.PI * 2;
        const px = Math.sin(a) * (radius + 0.15);
        const pz = -Math.cos(a) * (radius + 0.15);

        // 避开正北核心地标视野
        if (i === 0) continue;

        const pillarH = themeId === 'tomb' ? 6.2 : (themeId === 'valley' ? 4.8 : (themeId === 'xiangyang' ? 3.2 : 3.8));
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.48, pillarH, 8), pillarMat);
        pillar.position.set(px, pillarH * 0.5, pz);
        this.envGroup.add(pillar);

        if (i % 2 === 1) {
          // 隔柱立青铜火盆
          const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.32, 0.45, 8), new THREE.MeshStandardMaterial({ color: 0x451a03, metalness: 0.6, roughness: 0.4 }));
          bowl.position.set(px * 0.91, 1.15, pz * 0.91);
          this.envGroup.add(bowl);

          const flame = new THREE.Mesh(
            new THREE.ConeGeometry(0.32, 0.85, 6),
            new THREE.MeshBasicMaterial({ color: themeId === 'tomb' ? 0x7dd3fc : 0xfb923c })
          );
          flame.position.set(px * 0.91, 1.72, pz * 0.91);
          this.envGroup.add(flame);
          this.brazierFlames.push({ mesh: flame, phase: i * 1.1 });
        } else {
          const cap = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.25, 0.95), capMat);
          cap.position.set(px, pillarH + 0.12, pz);
          this.envGroup.add(cap);
        }
      }

      // ---- 四大原著章节标志性 3D 景观 ----
      if (themeId === 'tomb') {
        // 活死人墓：正北寒玉床与玄冰灵气
        const bed = new THREE.Mesh(
          new THREE.BoxGeometry(4.4, 0.9, 2.2),
          new THREE.MeshStandardMaterial({ color: 0xbae6fd, emissive: 0x0284c7, emissiveIntensity: 0.45, roughness: 0.18, metalness: 0.25 })
        );
        bed.position.set(0, 0.45, -(radius - 2.0));
        this.envGroup.add(bed);
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(4.5, 0.35, 8, 24, Math.PI),
          new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.8 })
        );
        arch.position.set(0, 0.1, -(radius + 0.4));
        this.envGroup.add(arch);
      } else if (themeId === 'valley') {
        // 绝情花谷：丹房亭檐与环绕红艳情花丛
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(5.6, 2.2, 6),
          new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.55 })
        );
        roof.position.set(0, 6.4, -(radius + 1.2));
        this.envGroup.add(roof);
        const flowerMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0x9f1239, emissiveIntensity: 0.35, roughness: 0.4 });
        const leafMat = new THREE.MeshStandardMaterial({ color: 0x14532d, roughness: 0.75 });
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2;
          const fx = Math.sin(a) * (radius - 0.55);
          const fz = -Math.cos(a) * (radius - 0.55);
          const bush = new THREE.Mesh(new THREE.DodecahedronGeometry(0.68, 0), leafMat);
          bush.position.set(fx, 0.42, fz);
          this.envGroup.add(bush);
          const bloom = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), flowerMat);
          bloom.position.set(fx, 0.98, fz);
          this.envGroup.add(bloom);
        }
      } else if (themeId === 'mound') {
        // 独孤剑冢：四座剑碑 + 崖巅巨型 3D 神雕！
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.92 });
        const cliff = new THREE.Mesh(new THREE.ConeGeometry(6.2, 7.5, 7), rockMat);
        cliff.position.set(0, 3.2, -(radius + 3.2));
        this.envGroup.add(cliff);

        // 剑冢四剑碑
        for (let i = -1.5; i <= 1.5; i += 1) {
          const slab = new THREE.Mesh(
            new THREE.BoxGeometry(0.75, 2.6 + Math.abs(i) * 0.3, 0.25),
            new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 })
          );
          slab.position.set(i * 3.1, 1.3, -(radius - 1.2));
          slab.rotation.y = -i * 0.22;
          this.envGroup.add(slab);
        }

        // 悬崖巨雕（神雕）：黑褐羽毛身躯、双展巨翼、尾羽、金钩喙、琥珀明眸
        const condor = new THREE.Group();
        condor.position.set(0, 6.8, -(radius + 2.2));
        const featherMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.65, metalness: 0.15, emissive: 0x1c1917, emissiveIntensity: 0.35 });
        const beakMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, roughness: 0.3, metalness: 0.5, emissive: 0x92400e, emissiveIntensity: 0.25 });
        const body = new THREE.Mesh(new THREE.SphereGeometry(1.35, 12, 10), featherMat);
        body.scale.set(0.85, 1.35, 0.95);
        condor.add(body);
        const crest = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.65, 6), featherMat);
        crest.position.set(0, 2.25, 0.2);
        crest.rotation.x = -0.3;
        condor.add(crest);
        const head = new THREE.Mesh(new THREE.SphereGeometry(0.68, 10, 8), featherMat);
        head.position.set(0, 1.65, 0.42);
        condor.add(head);
        const beak = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.72, 6), beakMat);
        beak.rotation.x = Math.PI * 0.62;
        beak.position.set(0, 1.52, 1.08);
        condor.add(beak);
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });
        const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), eyeMat);
        eyeL.position.set(-0.34, 1.78, 0.84);
        const eyeR = eyeL.clone();
        eyeR.position.x = 0.34;
        condor.add(eyeL, eyeR);

        for (const side of [-1, 1]) {
          const wingPivot = new THREE.Group();
          wingPivot.position.set(side * 0.9, 0.55, -0.1);
          const wing = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.22, 1.45), featherMat);
          wing.position.set(side * 1.65, 0.2, 0);
          wing.rotation.z = side * 0.24;
          wingPivot.add(wing);
          condor.add(wingPivot);
          this.condorWings.push({ pivot: wingPivot, side });
        }
        this.envGroup.add(condor);
      } else if (themeId === 'xiangyang') {
        // 襄阳城头：城垛女墙与猎猎战旗
        const wallMat = new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.88 });
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          const merlon = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 0.7), wallMat);
          merlon.position.set(Math.sin(a) * (radius + 0.6), 0.75, -Math.cos(a) * (radius + 0.6));
          merlon.rotation.y = -a;
          this.envGroup.add(merlon);
        }
        // 高大宋军战旗
        const bannerMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, emissive: 0x7f1d1d, emissiveIntensity: 0.3, side: THREE.DoubleSide });
        for (const sx of [-4.8, 4.8]) {
          const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 8.2, 6), wallMat);
          pole.position.set(sx, 4.1, -(radius + 0.2));
          this.envGroup.add(pole);
          const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3.0), bannerMat);
          flag.position.set(sx + (sx < 0 ? 0.8 : -0.8), 6.2, -(radius + 0.2));
          this.envGroup.add(flag);
        }
      }

      // 氛围浮尘/玉蜂/花瓣/火星粒子场
      const count = 130;
      const pos = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        pos[i * 3] = (Math.random() - 0.5) * radius * 2.1;
        pos[i * 3 + 1] = 0.4 + Math.random() * 8.5;
        pos[i * 3 + 2] = (Math.random() - 0.5) * radius * 2.1;
      }
      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.ambientPts = new THREE.Points(
        pGeo,
        new THREE.PointsMaterial({ color: cfg.particleColor, size: themeId === 'valley' ? 0.22 : 0.14, transparent: true, opacity: 0.75 })
      );
      this.envGroup.add(this.ambientPts);
    }

    /** 构建第一人称武器视图模型（1-2回：右手君子剑；3-4回：独臂左手玄铁重剑 + 黯然销魂左掌） */
    buildViewmodel(weaponId) {
      this.weaponId = weaponId;
      Studio.disposeObject(this.viewmodelRoot);
      this.viewmodelRoot.clear();

      const isHeavy = weaponId === 'heavy';
      this.hand = isHeavy ? 'left' : 'right';
      const side = isHeavy ? -1 : 1; // +1 右手, -1 左手

      this.weaponPivot = new THREE.Group();
      this.viewmodelRoot.add(this.weaponPivot);

      // 袖袍前臂（宋代江湖宽袖质感）
      const sleeveMat = new THREE.MeshStandardMaterial({
        color: isHeavy ? 0x1e293b : 0x1e3a5f,
        roughness: 0.72,
      });
      const cuffMat = new THREE.MeshStandardMaterial({
        color: isHeavy ? 0xd97706 : 0xe2e8f0,
        roughness: 0.45,
        metalness: 0.25,
      });
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.082, 0.42, 8), sleeveMat);
      arm.position.set(side * 0.08, -0.26, 0.22);
      arm.rotation.set(Math.PI * 0.36, 0, -side * 0.22);
      this.weaponPivot.add(arm);

      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.068, 0.06, 8), cuffMat);
      cuff.position.set(side * 0.03, -0.14, 0.06);
      cuff.rotation.copy(arm.rotation);
      this.weaponPivot.add(cuff);

      // 剑柄与护手
      const hiltMat = new THREE.MeshStandardMaterial({ color: isHeavy ? 0x451a03 : 0x1f2937, roughness: 0.82 });
      const guardMat = new THREE.MeshStandardMaterial({
        color: isHeavy ? 0x92400e : 0xfbbf24,
        metalness: 0.75,
        roughness: 0.28,
      });

      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, isHeavy ? 0.26 : 0.20, 8), hiltMat);
      hilt.position.set(0, -0.06, 0);
      this.weaponPivot.add(hilt);

      const guard = new THREE.Mesh(
        new THREE.BoxGeometry(isHeavy ? 0.24 : 0.17, 0.036, isHeavy ? 0.068 : 0.045),
        guardMat
      );
      guard.position.set(0, 0.055, 0);
      this.weaponPivot.add(guard);

      if (isHeavy) {
        // 玄铁重剑：宽厚无锋陨铁巨剑 + 剑脊暗金内力纹
        const bladeMat = new THREE.MeshStandardMaterial({
          color: 0x3b4252,
          metalness: 0.84,
          roughness: 0.30,
          emissive: 0x292524,
          emissiveIntensity: 0.40,
        });
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.86, 0.028), bladeMat);
        blade.position.set(0, 0.50, 0);
        this.weaponPivot.add(blade);

        const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.040, 0.062, 0.13, 4), bladeMat);
        tip.rotation.y = Math.PI * 0.25;
        tip.scale.set(1.4, 1, 0.35);
        tip.position.set(0, 0.99, 0);
        this.weaponPivot.add(tip);

        const rune = new THREE.Mesh(
          new THREE.BoxGeometry(0.018, 0.68, 0.032),
          new THREE.MeshBasicMaterial({ color: 0xf59e0b })
        );
        rune.position.set(0, 0.48, 0);
        this.weaponPivot.add(rune);
        this.bladeGlowMat = rune.material;
      } else {
        // 君子剑：修长青霜剑锋 + 玉质剑穗
        const bladeMat = new THREE.MeshStandardMaterial({
          color: 0xe2e8f0,
          metalness: 0.88,
          roughness: 0.18,
          emissive: 0x0ea5e9,
          emissiveIntensity: 0.22,
        });
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.88, 0.014), bladeMat);
        blade.position.set(0, 0.50, 0);
        this.weaponPivot.add(blade);

        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.16, 4), bladeMat);
        tip.rotation.y = Math.PI * 0.25;
        tip.scale.set(1.0, 1, 0.32);
        tip.position.set(0, 1.02, 0);
        this.weaponPivot.add(tip);

        const ridge = new THREE.Mesh(
          new THREE.BoxGeometry(0.012, 0.78, 0.018),
          new THREE.MeshBasicMaterial({ color: 0x7dd3fc })
        );
        ridge.position.set(0, 0.48, 0);
        this.weaponPivot.add(ridge);
        this.bladeGlowMat = ridge.material;

        // 飘逸剑穗
        const tassel = new THREE.Mesh(
          new THREE.ConeGeometry(0.022, 0.18, 6),
          new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.6 })
        );
        tassel.position.set(0, -0.22, 0);
        tassel.rotation.z = Math.PI;
        this.weaponPivot.add(tassel);
        this.tassel = tassel;
      }

      // 黯然销魂掌 · 雕塑感五指左掌 + 双重旋转水墨金芒内力环
      this.palmPivot = new THREE.Group();
      this.palmPivot.visible = false;
      const palmMat = new THREE.MeshStandardMaterial({
        color: 0xfde68a,
        emissive: 0xf59e0b,
        emissiveIntensity: 0.65,
        roughness: 0.28,
        transparent: true,
        opacity: 0.92,
      });
      const palmBase = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.058, 0.028, 12), palmMat);
      palmBase.rotation.x = Math.PI * 0.5;
      palmBase.scale.set(1.0, 1.0, 1.15);
      this.palmPivot.add(palmBase);
      // 四指 + 拇指
      const fingerSpecs = [
        [-0.048, 0.105, 0.095, 0.014, 0.14],
        [-0.016, 0.120, 0.112, 0.015, 0.04],
        [0.018, 0.116, 0.106, 0.014, -0.05],
        [0.048, 0.096, 0.084, 0.013, -0.16],
      ];
      for (const [fx, fy, fh, fr, rot] of fingerSpecs) {
        const f = new THREE.Mesh(new THREE.CylinderGeometry(fr * 0.72, fr, fh, 8), palmMat);
        f.position.set(fx, fy, 0);
        f.rotation.z = rot;
        this.palmPivot.add(f);
      }
      const thumb = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.082, 8), palmMat);
      thumb.position.set(0.078, 0.012, 0.005);
      thumb.rotation.z = -0.82;
      this.palmPivot.add(thumb);

      const auraOuter = new THREE.Mesh(
        new THREE.TorusGeometry(0.24, 0.014, 8, 28),
        new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.85 })
      );
      auraOuter.position.z = -0.04;
      this.palmPivot.add(auraOuter);
      const auraInner = new THREE.Mesh(
        new THREE.TorusGeometry(0.16, 0.010, 8, 24),
        new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.75 })
      );
      auraInner.position.z = -0.03;
      this.palmPivot.add(auraInner);
      this.palmAuraOuter = auraOuter;
      this.viewmodelRoot.add(this.palmPivot);

      // 弹反火花点光 + 第一人称剑锋高光补光（确保任意朝向剑刃金属质感饱满）
      this.parryLight = new THREE.PointLight(0xfef08a, 0, 5.5);
      this.parryLight.position.set(0, -0.05, -0.75);
      this.viewmodelRoot.add(this.parryLight);

      const vmFill = new THREE.PointLight(isHeavy ? 0xffedd5 : 0xe0f2fe, 0.85, 3.2);
      vmFill.position.set(side * 0.25, 0.22, -0.35);
      this.viewmodelRoot.add(vmFill);
    }

    createEnemyMesh(e, palette) {
      const root = new THREE.Group();
      const robeColor = e.isBoss ? palette.bossRobe : palette.robe;
      const trimColor = e.isBoss ? palette.bossTrim : palette.trim;
      const scale = e.isBoss ? 1.18 : (e.kind === 'brute' ? 1.12 : 0.98);

      const robeMat = new THREE.MeshStandardMaterial({ color: robeColor, roughness: 0.68, metalness: 0.12 });
      const trimMat = new THREE.MeshStandardMaterial({ color: trimColor, roughness: 0.4, metalness: 0.45, emissive: trimColor, emissiveIntensity: 0.16 });
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.65 });

      const body = new THREE.Group();
      body.scale.setScalar(scale);
      root.add(body);

      // 下摆长袍
      const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.48, 0.92, 10), robeMat);
      skirt.position.y = 0.46;
      body.add(skirt);

      // 上身武服与束腰
      const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.26, 0.66, 10), robeMat);
      torso.position.y = 1.20;
      body.add(torso);

      const sash = new THREE.Mesh(new THREE.CylinderGeometry(0.29, 0.29, 0.14, 10), trimMat);
      sash.position.y = 0.92;
      body.add(sash);

      // 肩甲 / 披肩
      const shoulders = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.18, 0.34), trimMat);
      shoulders.position.y = 1.48;
      body.add(shoulders);

      // 头部 + 斗笠/发冠/法帽
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skinMat);
      head.position.y = 1.72;
      body.add(head);

      const hatColor = e.bossId === 'jinlun' ? 0xf59e0b : (e.bossId === 'limochou' ? 0x3b0764 : 0x1e293b);
      const hat = new THREE.Mesh(
        e.kind === 'archer'
          ? new THREE.ConeGeometry(0.46, 0.24, 10)
          : new THREE.CylinderGeometry(0.14, 0.22, 0.22, 8),
        new THREE.MeshStandardMaterial({ color: hatColor, roughness: 0.5 })
      );
      hat.position.y = e.kind === 'archer' ? 1.92 : 1.94;
      body.add(hat);

      // 凌厉双目
      const eyeMat = new THREE.MeshBasicMaterial({ color: e.isBoss ? 0xfef08a : 0xfca5a5 });
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.038, 6, 6), eyeMat);
      eyeL.position.set(-0.08, 1.74, 0.19);
      const eyeR = eyeL.clone();
      eyeR.position.x = 0.08;
      body.add(eyeL, eyeR);

      // 右手持武（按 Boss 定制）
      const armPivot = new THREE.Group();
      armPivot.position.set(0.44, 1.42, 0.08);
      const weaponMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.8, roughness: 0.22 });

      if (e.bossId === 'limochou') {
        // 拂尘
        const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.72, 6), trimMat);
        stick.rotation.x = Math.PI * 0.45;
        stick.position.set(0, -0.05, 0.35);
        const whisk = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.65, 8), new THREE.MeshStandardMaterial({ color: 0xf5d0fe, emissive: 0xc026d3, emissiveIntensity: 0.4 }));
        whisk.rotation.x = Math.PI * 0.45;
        whisk.position.set(0, -0.08, 0.85);
        armPivot.add(stick, whisk);
      } else if (e.bossId === 'jinlun') {
        // 金轮法王：背后五轮大转金环！
        const wheelHalo = new THREE.Group();
        wheelHalo.position.set(0, 1.38, -0.32);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.88, roughness: 0.2, emissive: 0xb45309, emissiveIntensity: 0.38 });
        for (let k = 0; k < 5; k++) {
          const ang = (k / 5) * Math.PI * 2;
          const wMesh = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.055, 8, 16), wheelMat);
          wMesh.position.set(Math.cos(ang) * 0.85, Math.sin(ang) * 0.85, 0);
          wheelHalo.add(wMesh);
        }
        body.add(wheelHalo);
        root.userData.wheelHalo = wheelHalo;
      } else {
        // 剑 / 重刃
        const bladeLen = e.bossId === 'dugu' ? 1.45 : (e.kind === 'brute' ? 1.25 : 0.95);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.03, bladeLen), weaponMat);
        blade.position.set(0, -0.04, bladeLen * 0.55);
        armPivot.add(blade);
      }
      body.add(armPivot);

      // 地面脚下预警光环（白/红/金）
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.22, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(e.radius * 0.85, e.radius * 1.18, 24), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.05;
      root.add(ring);

      // 头顶攻击预警光晶 / 破防眩晕环
      const perilMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0 });
      const perilBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), perilMat);
      perilBeacon.position.y = e.height + 0.52;
      root.add(perilBeacon);

      const staggerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.45, 0.05, 6, 16),
        new THREE.MeshBasicMaterial({ color: 0xfde047 })
      );
      staggerRing.rotation.x = Math.PI / 2;
      staggerRing.position.y = e.height + 0.25;
      staggerRing.visible = false;
      root.add(staggerRing);

      // 头顶迷你血条（小兵用）
      let hpFill = null;
      if (!e.isBoss) {
        const barBg = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.10), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
        barBg.position.y = e.height + 0.16;
        hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.88, 0.06), new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide }));
        hpFill.position.set(0, 0, 0.01);
        barBg.add(hpFill);
        root.add(barBg);
        root.userData.hpBar = barBg;
        root.userData.hpFill = hpFill;
      }

      root.userData.body = body;
      root.userData.armPivot = armPivot;
      root.userData.robeMat = robeMat;
      root.userData.ringMat = ringMat;
      root.userData.ring = ring;
      root.userData.perilBeacon = perilBeacon;
      root.userData.perilMat = perilMat;
      root.userData.staggerRing = staggerRing;
      return root;
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
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.85,
          side: THREE.DoubleSide,
          depthWrite: false,
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
            mesh = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.09, 6, 16), mat);
            mesh.rotation.x = Math.PI / 2;
          } else if (p.kind === 'jade_wave' || p.kind === 'heavy_wave') {
            mesh = new THREE.Mesh(new THREE.RingGeometry(0.45, p.kind === 'heavy_wave' ? 1.35 : 0.92, 16, 1, -Math.PI * 0.45, Math.PI * 0.9), mat);
            mesh.rotation.x = Math.PI / 2;
          } else {
            mesh = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), mat);
            mesh.scale.set(0.6, 0.6, 2.2);
          }
          this.projGroup.add(mesh);
          this.projMeshes.set(p.id, mesh);
        }
        mesh.position.set(p.x, p.y || 1.35, p.z);
        if (p.kind === 'wheel') {
          mesh.rotation.z += 0.35;
        } else if (p.kind === 'jade_wave' || p.kind === 'heavy_wave') {
          mesh.rotation.z = -p.yaw;
        } else {
          mesh.rotation.y = Math.atan2(p.vx, p.vz);
        }
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

      // 弹簧阻尼视角惯性摆动（Dishonored / Ghostrunner 核心手感）
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

      // 基础待机姿态（右手君子剑 / 左手玄铁重剑，构图开阔不遮挡中心视野）
      let px = side * (isHeavy ? 0.46 : 0.36) + this.swayYaw * 0.45 + bobX;
      let py = (isHeavy ? -0.44 : -0.34) + this.swayPitch * 0.35 - bobY;
      let pz = isHeavy ? -0.74 : -0.60;
      let rx = isHeavy ? -0.34 : -0.24;
      let ry = side * (isHeavy ? 0.44 : 0.28);
      let rz = side * (isHeavy ? 0.32 : 0.18);

      // 格挡 / 弹反姿态：横剑挡于胸前
      if (state.parryTimer > 0 || state.guardHeld) {
        const parryKick = state.parryFlash > 0 ? Math.sin((state.parryFlash / 0.28) * Math.PI) * 0.16 : 0;
        px = side * 0.06;
        py = -0.18 + parryKick * 0.4;
        pz = -0.46 + parryKick;
        rx = -0.12 - parryKick * 1.5;
        ry = side * 0.72;
        rz = side * 1.24;
      }

      // 三段挥剑轨迹动画
      if (state.swingTimer > 0) {
        const p = 1 - state.swingTimer / Math.max(0.05, state.swingDur);
        const ease = p < 0.26 ? -(p / 0.26) * 0.35 : Math.sin(((p - 0.26) / 0.74) * Math.PI);
        const dir = state.comboStep === 2 ? -1 : 1;
        if (state.comboStep === 3) {
          // 第三式：力劈华山重斩
          px = side * 0.12 * (1 - p);
          py = -0.14 + Math.cos(p * Math.PI) * 0.32;
          pz = -0.58 - ease * 0.28;
          rx = -1.45 * ease - 0.2;
          ry = side * 0.25 * (1 - p);
          rz = side * 0.35 * (1 - p);
        } else {
          px = side * (0.34 - ease * 0.68 * dir);
          py = -0.26 + ease * 0.12;
          pz = -0.54 - ease * 0.26;
          rx = -0.42 - ease * 0.78;
          ry = side * (0.28 + ease * 1.35 * dir);
          rz = side * (0.20 + ease * 1.15 * dir);
        }
      }

      // 黯然销魂掌特写动画（收剑出左掌，居中偏左优雅推掌不挡准星）
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

      if (this.tassel) {
        this.tassel.rotation.x = Math.sin(this.t * 6) * 0.2 + moveSpd * 0.04;
      }
      if (this.parryLight) {
        this.parryLight.intensity = state.parryFlash > 0 ? (state.parryFlash / 0.28) * 6.5 : 0;
      }
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

      // 摄像机尺寸同步
      const w = this.gfx.w || 960;
      const h = this.gfx.h || 540;
      if (Math.abs(this.camera.aspect - w / h) > 0.001) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
      }

      // FOV 微动态反馈（丝滑无眩晕）
      this.fovTarget += (68 - this.fovTarget) * Math.min(1, dt * 7);
      if (Math.abs(this.fovCurrent - this.fovTarget) > 0.05) {
        this.fovCurrent += (this.fovTarget - this.fovCurrent) * Math.min(1, dt * 14);
        this.camera.fov = this.fovCurrent;
        this.camera.updateProjectionMatrix();
      }

      // 微震动（仅位移，不做旋转滚转以防晕 3D）
      this.shakeMag = Math.max(0, this.shakeMag - dt * 1.8);
      const sx = (Math.random() - 0.5) * this.shakeMag * 0.16;
      const sy = (Math.random() - 0.5) * this.shakeMag * 0.14;

      const moveSpd = Math.hypot(state.vx, state.vz);
      const camBob = Math.sin(this.bobPhase * 2) * Math.min(0.035, moveSpd * 0.004);
      this.camera.position.set(state.px + sx, CH.EYE_HEIGHT + state.py + camBob + sy, state.pz);
      this.camera.rotation.y = state.yaw;
      this.camera.rotation.x = state.pitch;
      this.camera.rotation.z = 0;

      // 更新第一人称武器视图模型
      this.updateViewmodel(state, dt);

      // 更新火盆火焰与神雕振翅
      for (const f of this.brazierFlames) {
        const s = 0.85 + Math.sin(this.t * 11 + f.phase) * 0.18;
        f.mesh.scale.set(1, s, 1);
      }
      for (const cw of this.condorWings) {
        cw.pivot.rotation.z = cw.side * (0.18 + Math.sin(this.t * 1.9) * 0.22);
      }
      if (this.ambientPts) {
        this.ambientPts.rotation.y += dt * 0.05;
      }

      // 同步敌人 3D 模型
      const aliveIds = new Set();
      for (const e of state.enemies) {
        aliveIds.add(e.id);
        let mesh = this.enemyMeshes.get(e.id);
        if (!mesh) {
          mesh = this.createEnemyMesh(e, state.chapter.enemyPalette);
          this.enemyGroup.add(mesh);
          this.enemyMeshes.set(e.id, mesh);
        }
        mesh.position.set(e.x, 0, e.z);
        mesh.rotation.y = e.yaw;

        const ud = mesh.userData;
        // 受击闪白
        ud.robeMat.emissive.setHex(e.hitFlash > 0 ? 0xffffff : 0x000000);
        ud.robeMat.emissiveIntensity = e.hitFlash > 0 ? 0.65 : 0;

        // 攻击起手与挥砍动画
        if (e.staggerTimer > 0) {
          ud.body.rotation.x = 0.28;
          ud.staggerRing.visible = true;
          ud.staggerRing.rotation.z += dt * 6;
          ud.perilMat.opacity = 0;
          ud.ringMat.color.setHex(0xfde047);
          ud.ringMat.opacity = 0.68;
        } else {
          ud.staggerRing.visible = false;
          ud.body.rotation.x = 0;
          if (e.state === 'windup') {
            const prog = 1 - e.stateTimer / Math.max(0.05, e.windupMax);
            ud.armPivot.rotation.x = -0.9 - prog * 0.7;
            const col = e.attackKind === 'unblock' ? 0xfacc15 : (e.attackKind === 'peril' ? 0xf43f5e : 0xe2e8f0);
            ud.ringMat.color.setHex(col);
            ud.ringMat.opacity = 0.45 + prog * 0.5;
            ud.perilMat.color.setHex(col);
            ud.perilMat.opacity = 0.55 + Math.sin(this.t * 24) * 0.35;
            ud.perilBeacon.scale.setScalar(0.8 + prog * 0.75);
            ud.perilBeacon.rotation.y += dt * 8;
          } else if (e.swingVisual > 0) {
            ud.armPivot.rotation.x = 1.1;
            ud.perilMat.opacity = 0;
            ud.ringMat.opacity = 0.25;
          } else {
            ud.armPivot.rotation.x = Math.sin(this.t * 4 + e.id) * 0.14;
            ud.perilMat.opacity = 0;
            ud.ringMat.color.setHex(state.lockTargetId === e.id ? 0x38bdf8 : 0xffffff);
            ud.ringMat.opacity = state.lockTargetId === e.id ? 0.65 : 0.18;
          }
        }

        // 金轮法王五轮旋转
        if (ud.wheelHalo) {
          ud.wheelHalo.rotation.z += dt * (e.phase2 ? 5.6 : 2.8);
        }
        // 小兵血条朝向摄像机
        if (ud.hpBar && ud.hpFill) {
          ud.hpBar.lookAt(this.camera.position);
          const ratio = Math.max(0.01, e.hp / e.maxHp);
          ud.hpFill.scale.x = ratio;
          ud.hpFill.position.x = -(1 - ratio) * 0.44;
        }
      }
      for (const [id, mesh] of this.enemyMeshes.entries()) {
        if (!aliveIds.has(id)) {
          this.enemyGroup.remove(mesh);
          Studio.disposeObject(mesh);
          this.enemyMeshes.delete(id);
        }
      }

      // 飞行物 & 剑光 & 火花
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

      this.gl.render(this.scene, this.camera);
    }

    dispose() {
      Studio.disposeObject(this.scene);
      this.sparkGeo.dispose();
      this.slashGeo.dispose();
      this.palmRingGeo.dispose();
      this.enemyMeshes.clear();
      this.projMeshes.clear();
      this.slashMeshes = [];
      this.sparkList = [];
    }
  }

  CH.Renderer3D = CondorHeroRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
