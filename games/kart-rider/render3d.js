/* 跑跑卡丁车 · 巅峰漂移 — 3A 绚丽 3D 赛道渲染引擎（连续倾斜路面/红白路肩/护栏弯道箭头/红绿灯龙门/主题地标/漂移胎痕烟尘火花/动态追尾镜头） */
(function (G) {
  'use strict';
  const KR = (G.KR = G.KR || {});
  const Studio = G.Studio;

  const THEME_CFGS = {
    boomhill: {
      skyTop: '#0284c7', skyMid: '#38bdf8', skyBot: '#e0f2fe',
      groundCol: '#4d9a3e', groundDark: '#367c2b',
      fog: 0xbae6fd, fogDensity: 0.0014,
      hemiSky: 0xe0f2fe, hemiGround: 0x3f6212,
      sunColor: 0xfffbeb, sunInt: 1.85,
      roadCol: '#374151', kerbA: '#ef4444', kerbB: '#ffffff', lineCol: '#fde047',
      railCol: 0xf8fafc, railAccent: 0xef4444,
      env: { bg: 0x38bdf8, sky: 0xbae6fd, sun: 0xfffbeb, warm: 0xfde047, cool: 0x0ea5e9 },
    },
    forest: {
      skyTop: '#0f766e', skyMid: '#5eead4', skyBot: '#ecfdf5',
      groundCol: '#2e6b34', groundDark: '#1d4d24',
      fog: 0xbfe8d8, fogDensity: 0.0018,
      hemiSky: 0xd1fae5, hemiGround: 0x1e3a20,
      sunColor: 0xfef3c7, sunInt: 1.75,
      roadCol: '#334155', kerbA: '#f59e0b', kerbB: '#ffffff', lineCol: '#f8fafc',
      railCol: 0x92400e, railAccent: 0xfbbf24,
      env: { bg: 0x115e59, sky: 0x99f6e4, sun: 0xfef3c7, warm: 0xf59e0b, cool: 0x34d399 },
    },
    desert: {
      skyTop: '#1d4ed8', skyMid: '#60a5fa', skyBot: '#fde68a',
      groundCol: '#d9a452', groundDark: '#b88235',
      fog: 0xfde68a, fogDensity: 0.0015,
      hemiSky: 0xfef3c7, hemiGround: 0x92400e,
      sunColor: 0xfff7ed, sunInt: 1.95,
      roadCol: '#6b5344', kerbA: '#ea580c', kerbB: '#fef3c7', lineCol: '#fde047',
      railCol: 0xd97706, railAccent: 0xfef08a,
      env: { bg: 0xd97706, sky: 0xfde68a, sun: 0xfff7ed, warm: 0xf97316, cool: 0x60a5fa },
    },
    glacier: {
      skyTop: '#0b1026', skyMid: '#1e1b4b', skyBot: '#312e81',
      groundCol: '#94a3b8', groundDark: '#64748b',
      fog: 0x1e1b4b, fogDensity: 0.0017,
      hemiSky: 0xbae6fd, hemiGround: 0x312e81,
      sunColor: 0xe0f2fe, sunInt: 1.65,
      roadCol: '#1e293b', kerbA: '#22d3ee', kerbB: '#e879f9', lineCol: '#38bdf8',
      railCol: 0x0ea5e9, railAccent: 0xe879f9,
      env: { bg: 0x1e1b4b, sky: 0x38bdf8, sun: 0xe0f2fe, warm: 0xe879f9, cool: 0x22d3ee },
    },
  };

  /** 生成明亮通透的跑跑卡丁车风天穹（柔边晴空云 / 极光星空） */
  function makeSkyTex(cfg, theme) {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 512;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 512);
    g.addColorStop(0, cfg.skyTop);
    g.addColorStop(0.46, cfg.skyMid);
    g.addColorStop(0.78, cfg.skyBot);
    g.addColorStop(1, cfg.groundDark);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 1024, 512);

    if (theme === 'glacier') {
      // 极光霓虹彩带 + 璀璨星点
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      for (let i = 0; i < 140; i++) {
        ctx.beginPath();
        ctx.arc((i * 131) % 1024, (i * 47) % 240, (i % 3 === 0) ? 1.8 : 1.1, 0, Math.PI * 2);
        ctx.fill();
      }
      for (let i = 0; i < 6; i++) {
        const ax = i * 190 + 60;
        const ag = ctx.createRadialGradient(ax, 150, 10, ax, 150, 170);
        ag.addColorStop(0, i % 2 === 0 ? 'rgba(34, 211, 238, 0.34)' : 'rgba(232, 121, 249, 0.28)');
        ag.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = ag;
        ctx.fillRect(0, 0, 1024, 320);
      }
    } else {
      // 太阳辉光 + 蓬松柔边晴空云朵
      const sg = ctx.createRadialGradient(512, 130, 14, 512, 130, 160);
      sg.addColorStop(0, '#ffffff');
      sg.addColorStop(0.3, 'rgba(255,250,220,0.65)');
      sg.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, 1024, 340);

      for (let i = 0; i < 16; i++) {
        const cx = (i * 76 + 24) % 1024;
        const cy = 148 + Math.sin(i * 1.9) * 38;
        const rx = 95 + (i % 3) * 32;
        const cg = ctx.createRadialGradient(cx, cy, 4, cx, cy, rx);
        cg.addColorStop(0, 'rgba(255,255,255,0.52)');
        cg.addColorStop(0.55, 'rgba(255,255,255,0.18)');
        cg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(1, 0.32);
        ctx.fillStyle = cg;
        ctx.beginPath(); ctx.arc(0, 0, rx, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 生成高精赛道沥青/红白路肩/中心标线纹理 */
  function makeRoadTexture(cfg, theme) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');

    ctx.fillStyle = cfg.roadCol;
    ctx.fillRect(0, 0, 512, 512);

    // 真实沥青细颗粒质感 + 轮胎磨耗印
    for (let i = 0; i < 4200; i++) {
      const x = (i * 67) % 512;
      const y = (i * 113) % 512;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(255,255,255,0.055)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.fillStyle = 'rgba(0,0,0,0.10)';
    ctx.fillRect(110, 0, 72, 512);
    ctx.fillRect(330, 0, 72, 512);

    if (theme === 'glacier') {
      // 冰面赛道蓝晶反光纹理
      const ig = ctx.createLinearGradient(0, 0, 512, 0);
      ig.addColorStop(0, 'rgba(34,211,238,0.22)');
      ig.addColorStop(0.5, 'rgba(186,230,253,0.10)');
      ig.addColorStop(1, 'rgba(232,121,249,0.22)');
      ctx.fillStyle = ig;
      ctx.fillRect(42, 0, 428, 512);
    }

    // 跑跑卡丁车标志性双侧红白/蓝粉路肩 (Kerbs)
    const stripeH = 64;
    for (let y = 0; y < 512; y += stripeH) {
      ctx.fillStyle = ((y / stripeH) % 2 === 0) ? cfg.kerbA : cfg.kerbB;
      ctx.fillRect(0, y, 42, stripeH);
      ctx.fillRect(470, y, 42, stripeH);
    }
    // 路肩内侧白色边界实线
    ctx.fillStyle = 'rgba(255,255,255,0.88)';
    ctx.fillRect(44, 0, 8, 512);
    ctx.fillRect(460, 0, 8, 512);

    // 居中虚线竞速引导线
    ctx.fillStyle = cfg.lineCol;
    for (let y = 24; y < 512; y += 128) {
      ctx.fillRect(250, y, 12, 64);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = 8;
    return tex;
  }

  /** 生成发光流动加速带箭头贴图 */
  function makeBoostPadTex() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 512);
    for (let y = 0; y < 512; y += 128) {
      const grad = ctx.createLinearGradient(0, y, 0, y + 128);
      grad.addColorStop(0, '#fde047');
      grad.addColorStop(0.5, '#22d3ee');
      grad.addColorStop(1, '#3b82f6');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(24, y + 112);
      ctx.lineTo(128, y + 18);
      ctx.lineTo(232, y + 112);
      ctx.lineTo(192, y + 112);
      ctx.lineTo(128, y + 54);
      ctx.lineTo(64, y + 112);
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }

  /** 生成彩色跑跑道具箱「?」贴图 */
  function makeItemBoxTex() {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, '#ec4899');
    g.addColorStop(0.35, '#8b5cf6');
    g.addColorStop(0.7, '#06b6d4');
    g.addColorStop(1, '#facc15');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 16;
    ctx.strokeRect(10, 10, 236, 236);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 165px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('?', 128, 138);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 生成黑白格子终点线与龙门横幅贴图 */
  function makeCheckerTex(withLogo = false) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext('2d');
    const sz = 32;
    for (let y = 0; y < 128; y += sz) {
      for (let x = 0; x < 512; x += sz) {
        ctx.fillStyle = ((x / sz + y / sz) % 2 === 0) ? '#ffffff' : '#0f172a';
        ctx.fillRect(x, y, sz, sz);
      }
    }
    if (withLogo) {
      ctx.fillStyle = 'rgba(14, 165, 233, 0.92)';
      ctx.fillRect(96, 20, 320, 88);
      ctx.strokeStyle = '#fde047';
      ctx.lineWidth = 6;
      ctx.strokeRect(96, 20, 320, 88);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 42px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('跑跑卡丁车', 256, 66);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 生成醒目荧光黄弯道箭头指示牌贴图 */
  function makeChevronTex(isRight) {
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 256, 128);
    ctx.strokeStyle = '#facc15';
    ctx.lineWidth = 8;
    ctx.strokeRect(6, 6, 244, 116);
    ctx.fillStyle = '#facc15';
    for (let i = 0; i < 3; i++) {
      const cx = 56 + i * 72;
      ctx.beginPath();
      if (isRight) {
        ctx.moveTo(cx - 20, 26); ctx.lineTo(cx + 18, 64); ctx.lineTo(cx - 20, 102);
        ctx.lineTo(cx - 4, 102); ctx.lineTo(cx + 32, 64); ctx.lineTo(cx - 4, 26);
      } else {
        ctx.moveTo(cx + 20, 26); ctx.lineTo(cx - 18, 64); ctx.lineTo(cx + 20, 102);
        ctx.lineTo(cx + 4, 102); ctx.lineTo(cx - 32, 64); ctx.lineTo(cx + 4, 26);
      }
      ctx.closePath();
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /**
   * 挤压生成连续闭合 3D 赛道带（顶面沥青 + 双侧厚实混凝土路基裙边，杜绝悬浮薄片！）
   */
  function buildTrackRibbonMesh(track, roadMat, sideMat) {
    const s = track.samples;
    const n = track.segCount;
    const topPos = [];
    const topUv = [];
    const topIdx = [];
    const sidePos = [];
    const sideIdx = [];

    for (let i = 0; i <= n; i++) {
      const p = s[i % n];
      const hw = p.w * 0.5;
      const bankY = Math.sin(p.bank) * hw * 0.25;
      const lx = p.x - p.rx * hw, ly = p.y - bankY, lz = p.z - p.rz * hw;
      const rx = p.x + p.rx * hw, ry = p.y + bankY, rz = p.z + p.rz * hw;
      topPos.push(lx, ly, lz, rx, ry, rz);
      const v = (i * track.stepLen) / 14;
      topUv.push(0, v, 1, v);

      // 左右两侧路基厚度（向下延伸 1.6m）
      sidePos.push(lx, ly, lz, lx, ly - 1.6, lz, rx, ry, rz, rx, ry - 1.6, rz);
    }

    for (let i = 0; i < n; i++) {
      const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
      // 右手坐标系向上 (+Y) 法线绕序：a(左后) -> b(右后) -> c(左前)，确保顶面沥青与红白路肩完全朝上可见！
      topIdx.push(a, b, c, b, d, c);

      const sa = i * 4, sb = (i + 1) * 4;
      // 左侧裙边
      sideIdx.push(sa, sa + 1, sb, sb, sa + 1, sb + 1);
      // 右侧裙边
      sideIdx.push(sa + 2, sb + 2, sa + 3, sb + 2, sb + 3, sa + 3);
    }

    const topGeo = new THREE.BufferGeometry();
    topGeo.setAttribute('position', new THREE.Float32BufferAttribute(topPos, 3));
    topGeo.setAttribute('uv', new THREE.Float32BufferAttribute(topUv, 2));
    topGeo.setIndex(topIdx);
    topGeo.computeVertexNormals();
    const topMesh = new THREE.Mesh(topGeo, roadMat);
    topMesh.receiveShadow = true;

    const sideGeo = new THREE.BufferGeometry();
    sideGeo.setAttribute('position', new THREE.Float32BufferAttribute(sidePos, 3));
    sideGeo.setIndex(sideIdx);
    sideGeo.computeVertexNormals();
    const sideMesh = new THREE.Mesh(sideGeo, sideMat);

    const grp = new THREE.Group();
    grp.add(topMesh, sideMesh);
    return grp;
  }

  /** 构建连续两侧安全护栏（InstancedMesh 零卡顿渲染！） */
  function buildGuardrails(track, cfg) {
    const grp = new THREE.Group();
    const s = track.samples;
    const n = track.segCount;
    const railMatA = new THREE.MeshStandardMaterial({ color: cfg.railCol, roughness: 0.4, metalness: 0.35 });
    const railMatB = new THREE.MeshStandardMaterial({ color: cfg.railAccent, roughness: 0.35, metalness: 0.25 });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.65 });

    const segGeo = new THREE.BoxGeometry(0.24, 0.52, track.stepLen * 1.05);
    const postGeo = new THREE.BoxGeometry(0.22, 0.95, 0.22);
    const countA = Math.ceil(n);
    const instA = new THREE.InstancedMesh(segGeo, railMatA, countA);
    const instB = new THREE.InstancedMesh(segGeo, railMatB, countA);
    const posts = new THREE.InstancedMesh(postGeo, postMat, Math.ceil(n / 2) * 2);

    const dummy = new THREE.Object3D();
    let ia = 0, ib = 0, ip = 0;

    for (let i = 0; i < n; i++) {
      const p = s[i];
      const hw = p.w * 0.5 + 0.28;
      const bankY = Math.sin(p.bank) * hw * 0.25;
      for (const side of [-1, 1]) {
        dummy.position.set(p.x + p.rx * hw * side, p.y + bankY * side + 0.62, p.z + p.rz * hw * side);
        dummy.rotation.set(0, p.yaw, 0);
        dummy.updateMatrix();
        if ((i % 2 === 0) === (side > 0)) {
          if (ia < countA) instA.setMatrixAt(ia++, dummy.matrix);
        } else {
          if (ib < countA) instB.setMatrixAt(ib++, dummy.matrix);
        }
        if (i % 2 === 0 && ip < posts.count) {
          dummy.position.y -= 0.16;
          dummy.updateMatrix();
          posts.setMatrixAt(ip++, dummy.matrix);
        }
      }
    }
    instA.count = ia; instB.count = ib; posts.count = ip;
    instA.instanceMatrix.needsUpdate = true;
    instB.instanceMatrix.needsUpdate = true;
    posts.instanceMatrix.needsUpdate = true;
    grp.add(instA, instB, posts);

    // 高架桥桥墩支撑（y > 1.8m 的路段自动生成桥墩，真实立体！）
    const pierMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.78 });
    for (let i = 0; i < n; i += 10) {
      const p = s[i];
      if (p.y > 1.8) {
        const h = p.y + 4;
        const pier = new THREE.Mesh(new THREE.BoxGeometry(p.w * 0.52, h, 2.2), pierMat);
        pier.position.set(p.x, p.y - h * 0.5 - 1.2, p.z);
        pier.rotation.y = p.yaw;
        grp.add(pier);
      }
    }

    // 急弯外侧自动立起发光弯道箭头警示牌（跑跑卡丁车辨识度第一的赛道引导！）
    const texL = makeChevronTex(false);
    const texR = makeChevronTex(true);
    const matL = new THREE.MeshBasicMaterial({ map: texL, side: THREE.DoubleSide });
    const matR = new THREE.MeshBasicMaterial({ map: texR, side: THREE.DoubleSide });
    for (let i = 0; i < n; i += 6) {
      const p = s[i];
      if (Math.abs(p.curvature) > 0.0135) {
        const isRightTurn = p.curvature < 0; // curvature < 0 表示 yaw 减小即右转 -> 牌子立在左外侧 (-1)
        const outSide = isRightTurn ? -1 : 1;
        const hw = p.w * 0.5 + 1.25;
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.0), isRightTurn ? matR : matL);
        sign.position.set(p.x + p.rx * hw * outSide, p.y + 2.1, p.z + p.rz * hw * outSide);
        sign.rotation.y = p.yaw + Math.PI;
        grp.add(sign);
      }
    }

    return grp;
  }

  /** 生成精细欧式繁荣山丘木梁小屋墙面贴图（温润米黄灰泥 + 深棕木梁 + 彩窗 + 拱形木门，杜绝惨白过曝方块！） */
  function makeCottageWallTex() {
    const c = document.createElement('canvas');
    c.width = 256; c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#d6c8ad';
    ctx.fillRect(0, 0, 256, 256);
    // 底部石砖基座
    ctx.fillStyle = '#78716c';
    ctx.fillRect(0, 204, 256, 52);
    // 深褐木梁框架
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(0, 0, 256, 14);
    ctx.fillRect(0, 108, 256, 12);
    ctx.fillRect(0, 196, 256, 12);
    ctx.fillRect(0, 0, 14, 256);
    ctx.fillRect(242, 0, 14, 256);
    ctx.fillRect(122, 0, 12, 200);
    // 两扇暖光格窗
    for (const wx of [34, 154]) {
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(wx, 34, 64, 56);
      ctx.strokeStyle = '#5c3a21';
      ctx.lineWidth = 6;
      ctx.strokeRect(wx, 34, 64, 56);
      ctx.beginPath(); ctx.moveTo(wx + 32, 34); ctx.lineTo(wx + 32, 90); ctx.moveTo(wx, 62); ctx.lineTo(wx + 64, 62); ctx.stroke();
    }
    // 拱形红棕木门
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(96, 142, 64, 114);
    ctx.strokeStyle = '#451a03';
    ctx.lineWidth = 5;
    ctx.strokeRect(96, 142, 64, 114);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 构建经典赛道周围主题 3D 地标景观（实拍 PBR 地景 + 繁荣山丘欧式木梁小屋/旋转风车/悬索大桥/看台 + 森林/沙漠/冰峰霓虹） */
  function buildThemeScenery(track, cfg) {
    const grp = new THREE.Group();
    const theme = track.theme;
    const s = track.samples;
    const n = track.segCount;

    // 实拍照片级 Poly Haven PBR 广阔地景底盘（彻底替代塑料纯色平面！）
    const groundMat = Studio.Assets3D
      ? Studio.Assets3D.createPhotoPBRMaterial(
          theme === 'desert' ? 'large_sandstone_blocks' : (theme === 'glacier' ? 'seaworn_stone_tiles' : 'aerial_grass_rock'),
          {
            color: theme === 'boomhill' ? 0x6ba854 : (theme === 'forest' ? 0x4b7d42 : (theme === 'desert' ? 0xd8a85e : 0x8ea8c2)),
            repeatX: 38, repeatY: 38, roughness: theme === 'glacier' ? 0.45 : 0.92, normalScale: 1.15,
          }
        )
      : new THREE.MeshStandardMaterial({ color: cfg.groundCol, roughness: 0.92, metalness: 0.02 });
    const ground = new THREE.Mesh(new THREE.CircleGeometry(620, 48), groundMat);
    ground.rotation.x = -Math.PI * 0.5;
    ground.position.set(120, -1.8, -20);
    ground.receiveShadow = true;
    grp.add(ground);

    // 远景群山环绕天际线（赋予赛道真实立体纵深感！）
    const mtnCol = theme === 'desert' ? 0xb47b3a : (theme === 'glacier' ? 0xcbd5e1 : (theme === 'forest' ? 0x1e4d2b : 0x3b7a4a));
    const mtnMat = new THREE.MeshStandardMaterial({ color: mtnCol, roughness: 0.90 });
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(54 + (k % 3) * 18, 56 + (k % 4) * 18, 7), mtnMat);
      peak.position.set(120 + Math.cos(a) * 320, 22, -20 + Math.sin(a) * 320);
      grp.add(peak);
    }

    // 赛道起终点两侧欢呼观众看台 + 彩旗（营造锦标赛发车氛围！）
    const sp0 = KR.sampleTrackAtS(track, 0);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.72 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: theme === 'glacier' ? 0x0ea5e9 : 0xdc2626, roughness: 0.45 });
    for (const side of [-1, 1]) {
      const stGrp = new THREE.Group();
      const hw = sp0.w * 0.5 + 7.2;
      stGrp.position.set(sp0.x + sp0.rx * hw * side, sp0.y - 0.5, sp0.z + sp0.rz * hw * side);
      stGrp.rotation.y = sp0.yaw + (side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
      for (let tier = 0; tier < 3; tier++) {
        const step = new THREE.Mesh(new THREE.BoxGeometry(22, 1.4, 2.4), standMat);
        step.position.set(0, 0.7 + tier * 1.35, -tier * 2.1);
        stGrp.add(step);
      }
      const canopy = new THREE.Mesh(new THREE.BoxGeometry(23, 0.35, 7.6), canopyMat);
      canopy.position.set(0, 7.4, -2.0);
      canopy.rotation.x = 0.14;
      stGrp.add(canopy);
      grp.add(stGrp);
    }

    // 工具函数：判断某世界点是否远离赛道，避免地标穿入路面
    const isFarFromTrack = (x, z, minDist) => {
      const minD2 = minDist * minDist;
      for (let i = 0; i < n; i += 4) {
        const dx = x - s[i].x, dz = z - s[i].z;
        if (dx * dx + dz * dz < minD2) return false;
      }
      return true;
    };

    const windmills = [];

    if (theme === 'boomhill') {
      // 繁荣山丘经典欧式木梁小屋 + 旋转风车 + 双子红色悬索大桥塔架 + 层次圆冠大树！
      const roofCols = [0xc2410c, 0x1d4ed8, 0xb45309, 0x0f766e];
      const wallMat = new THREE.MeshStandardMaterial({ map: makeCottageWallTex(), roughness: 0.78 });
      const towerWallMat = new THREE.MeshStandardMaterial({ color: 0xd8cdb8, roughness: 0.80 });

      // 沿悬索桥段架起标志性红色双子大桥塔架与斜拉钢索！
      for (let i = 0; i < n; i += 16) {
        const p = s[i];
        if (p.surface === 'bridge') {
          const towerMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, metalness: 0.48, roughness: 0.34 });
          const hw = p.w * 0.5 + 1.2;
          for (const side of [-1, 1]) {
            const col = new THREE.Mesh(new THREE.BoxGeometry(1.4, 24, 1.4), towerMat);
            col.position.set(p.x + p.rx * hw * side, p.y + 10, p.z + p.rz * hw * side);
            grp.add(col);
          }
          const beam = new THREE.Mesh(new THREE.BoxGeometry(p.w + 3.6, 1.4, 1.2), towerMat);
          beam.position.set(p.x, p.y + 20.5, p.z);
          beam.rotation.y = p.yaw;
          grp.add(beam);
        }
      }

      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b3a1a, roughness: 0.88 });
      const leafA = new THREE.MeshStandardMaterial({ color: 0x2d8a3e, roughness: 0.78 });
      const leafB = new THREE.MeshStandardMaterial({ color: 0x45a84f, roughness: 0.75 });
      for (let i = 0; i < n; i += 12) {
        const p = s[i];
        for (const side of [-1, 1]) {
          const dist = p.w * 0.5 + 15 + (i % 3) * 6;
          const ox = p.x + p.rx * dist * side;
          const oz = p.z + p.rz * dist * side;
          if (!isFarFromTrack(ox, oz, p.w * 0.5 + 10)) continue;

          if ((i + (side > 0 ? 1 : 0)) % 3 === 0) {
            const hGrp = new THREE.Group();
            hGrp.position.set(ox, -1.8, oz);
            hGrp.rotation.y = p.yaw + (side > 0 ? -Math.PI * 0.5 : Math.PI * 0.5);
            const bw = 7.4 + (i % 3) * 1.8, bh = 5.6 + (i % 2) * 2.0, bd = 6.6;
            const body = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), wallMat);
            body.position.y = bh * 0.5;
            const roof = new THREE.Mesh(
              new THREE.ConeGeometry(bw * 0.78, 4.0, 4),
              new THREE.MeshStandardMaterial({ color: roofCols[i % roofCols.length], roughness: 0.65 })
            );
            roof.position.y = bh + 1.9;
            roof.rotation.y = Math.PI * 0.25;
            const chimney = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.4, 1.1), new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.85 }));
            chimney.position.set(bw * 0.22, bh + 2.2, 0.5);
            hGrp.add(body, roof, chimney);
            grp.add(hGrp);
          } else if (i % 24 === 0) {
            const wm = new THREE.Group();
            wm.position.set(ox, -1.8, oz);
            wm.rotation.y = p.yaw;
            const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 3.0, 14, 12), towerWallMat);
            tower.position.y = 7;
            const cap = new THREE.Mesh(new THREE.ConeGeometry(2.1, 3.0, 12), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.6 }));
            cap.position.y = 15.4;
            const hub = new THREE.Group();
            hub.position.set(0, 12.2, 2.0);
            const bladeMat = new THREE.MeshStandardMaterial({ color: 0xd9c298, roughness: 0.65 });
            for (let b = 0; b < 4; b++) {
              const bl = new THREE.Mesh(new THREE.BoxGeometry(1.0, 7.6, 0.16), bladeMat);
              bl.rotation.z = (b * Math.PI) / 2;
              hub.add(bl);
            }
            wm.add(tower, cap, hub);
            grp.add(wm);
            windmills.push(hub);
          } else {
            // 多层层次感自然大树
            const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.68, 4.4, 8), trunkMat);
            tr.position.set(ox, 0.4, oz);
            const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.6, 1), leafA);
            c1.position.set(ox, 3.8, oz);
            const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(2.0, 1), leafB);
            c2.position.set(ox + 1.2, 5.2, oz - 0.8);
            const c3 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), leafA);
            c3.position.set(ox - 1.1, 4.9, oz + 0.9);
            grp.add(tr, c1, c2, c3);
          }
        }
      }
    } else if (theme === 'forest') {
      // 森林发夹：成片翠绿苍松、木质桥梁与实拍苔藓岩山！
      const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5c3416, roughness: 0.88 });
      const pineDark = new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.78 });
      const pineLight = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.75 });
      for (let i = 0; i < n; i += 6) {
        const p = s[i];
        for (const side of [-1, 1]) {
          const dist = p.w * 0.5 + 8 + ((i * 7) % 14);
          const ox = p.x + p.rx * dist * side;
          const oz = p.z + p.rz * dist * side;
          if (!isFarFromTrack(ox, oz, p.w * 0.5 + 6)) continue;
          const tree = new THREE.Group();
          tree.position.set(ox, -1.8, oz);
          const sc = 0.85 + (i % 4) * 0.22;
          tree.scale.setScalar(sc);
          const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.68, 4.8, 7), trunkMat);
          tr.position.y = 2.4;
          const c1 = new THREE.Mesh(new THREE.ConeGeometry(3.2, 6.2, 7), pineDark);
          c1.position.y = 6.2;
          const c2 = new THREE.Mesh(new THREE.ConeGeometry(2.3, 5.2, 7), pineLight);
          c2.position.y = 9.5;
          tree.add(tr, c1, c2);
          grp.add(tree);
        }
      }
      // 远处青翠山峰环抱
      const mtnMat = new THREE.MeshStandardMaterial({ color: 0x1e4d2b, roughness: 0.92 });
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2;
        const peak = new THREE.Mesh(new THREE.ConeGeometry(46 + (k % 3) * 14, 65 + (k % 4) * 18, 7), mtnMat);
        peak.position.set(120 + Math.cos(a) * 260, 26, -20 + Math.sin(a) * 260);
        grp.add(peak);
      }
    } else if (theme === 'desert') {
      // 沙漠金字塔工地：三座宏伟黄金金字塔 + 埃及方尖碑 + 绿洲椰子树！
      const pyrMat = Studio.Assets3D
        ? Studio.Assets3D.createPhotoPBRMaterial('large_sandstone_blocks', { color: 0xe6be78, repeatX: 6, repeatY: 6, roughness: 0.85 })
        : new THREE.MeshStandardMaterial({ color: 0xd9a452, roughness: 0.85 });
      for (const [px, pz, sz, h] of [[110, -255, 58, 72], [290, -140, 44, 54], [-95, 45, 50, 62]]) {
        const pyr = new THREE.Mesh(new THREE.ConeGeometry(sz, h, 4), pyrMat);
        pyr.position.set(px, h * 0.5 - 2, pz);
        pyr.rotation.y = Math.PI * 0.25;
        grp.add(pyr);
      }
      const palmTrunkMat = new THREE.MeshStandardMaterial({ color: 0x7c4a1d, roughness: 0.88 });
      const palmLeafMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.65, side: THREE.DoubleSide });
      const obeliskMat = new THREE.MeshStandardMaterial({ color: 0xc29248, roughness: 0.72 });
      for (let i = 0; i < n; i += 14) {
        const p = s[i];
        const side = i % 28 === 0 ? 1 : -1;
        const dist = p.w * 0.5 + 11;
        const ox = p.x + p.rx * dist * side;
        const oz = p.z + p.rz * dist * side;
        if (!isFarFromTrack(ox, oz, p.w * 0.5 + 8)) continue;
        if (i % 28 === 0) {
          const ob = new THREE.Mesh(new THREE.CylinderGeometry(0.65, 1.5, 14, 4), obeliskMat);
          ob.position.set(ox, 5.2, oz);
          const tip = new THREE.Mesh(new THREE.ConeGeometry(0.7, 2.2, 4), new THREE.MeshStandardMaterial({ color: 0xfacc15, metalness: 0.8, roughness: 0.2 }));
          tip.position.set(ox, 13.2, oz);
          grp.add(ob, tip);
        } else {
          const palm = new THREE.Group();
          palm.position.set(ox, -1.8, oz);
          const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.60, 9.0, 8), palmTrunkMat);
          tr.position.y = 4.5;
          tr.rotation.z = 0.08 * side;
          palm.add(tr);
          const crown = new THREE.Group();
          crown.position.set(-0.35 * side, 8.9, 0);
          for (let f = 0; f < 7; f++) {
            const pivot = new THREE.Group();
            pivot.rotation.y = (f / 7) * Math.PI * 2;
            const lf = new THREE.Mesh(new THREE.ConeGeometry(0.72, 4.4, 4), palmLeafMat);
            lf.scale.set(1.0, 1.0, 0.16);
            lf.rotation.x = Math.PI * 0.62;
            lf.position.set(0, -0.35, 2.05);
            pivot.add(lf);
            crown.add(pivot);
          }
          palm.add(crown);
          grp.add(palm);
        }
      }
    } else if (theme === 'glacier') {
      // 冰峰霓虹赛道：发光青紫太空拱门 + 巍峨雪峰！
      const snowMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.55, metalness: 0.12 });
      const neonCyan = new THREE.MeshBasicMaterial({ color: 0x22d3ee });
      const neonMag = new THREE.MeshBasicMaterial({ color: 0xe879f9 });
      for (let i = 0; i < n; i += 18) {
        const p = s[i];
        const arch = new THREE.Mesh(
          new THREE.TorusGeometry(p.w * 0.5 + 1.8, 0.42, 10, 24, Math.PI),
          i % 36 === 0 ? neonCyan : neonMag
        );
        arch.position.set(p.x, p.y, p.z);
        arch.rotation.y = p.yaw;
        grp.add(arch);
      }
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        const peak = new THREE.Mesh(new THREE.ConeGeometry(42 + (k % 3) * 16, 78 + (k % 4) * 22, 6), snowMat);
        peak.position.set(120 + Math.cos(a) * 255, 32, -20 + Math.sin(a) * 255);
        grp.add(peak);
      }
    }

    return { grp, windmills };
  }

  /** 主 3D 渲染器类 */
  class KartRenderer {
    constructor(gfx) {
      this.gfx = gfx;
      this.gl = gfx.gl;
      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(64, (gfx.w || 960) / (gfx.h || 540), 0.25, 900);

      this.worldGroup = new THREE.Group();
      this.dynamicGroup = new THREE.Group();
      this.fxGroup = new THREE.Group();
      this.scene.add(this.worldGroup, this.dynamicGroup, this.fxGroup);

      this.post = Studio.PBR ? new Studio.PBR.PostPipeline(this.gl) : null;
      this.aaaQuality = true;
      this.envRT = null;

      this.trackId = null;
      this.kartMeshes = new Map();
      this.boxMeshes = new Map();
      this.projMeshes = new Map();
      this.hazardMeshes = new Map();
      this.trafficBulbs = [];
      this.boostPadTex = null;
      this.windmills = [];
      this.sunLight = null;

      // 漂移烟尘/火花粒子池与沥青胎痕池
      this.particles = [];
      this.skids = [];
      this.skidIdx = 0;
      this.skidGeo = new THREE.PlaneGeometry(0.32, 1.15);
      this.skidMat = new THREE.MeshBasicMaterial({ color: 0x09090b, transparent: true, opacity: 0.42, depthWrite: false });
      this.sparkGeo = new THREE.OctahedronGeometry(0.11, 0);

      this.camPos = new THREE.Vector3(0, 4, 14);
      this.camLook = new THREE.Vector3(0, 1.2, -10);
      this.fovCurrent = 64;
      this.shakeMag = 0;
      this.t = 0;
    }

    setQuality(isAAA) {
      this.aaaQuality = !!isAAA;
      if (this.post) this.post.enabled = this.aaaQuality;
      if (this.sunLight) this.sunLight.castShadow = this.aaaQuality;
    }

    addShake(mag) {
      this.shakeMag = Math.max(this.shakeMag, mag);
    }

    buildTrack(state) {
      this.trackId = state.track.id;
      Studio.disposeObject(this.worldGroup);
      Studio.disposeObject(this.dynamicGroup);
      Studio.disposeObject(this.fxGroup);
      this.worldGroup.clear();
      this.dynamicGroup.clear();
      this.fxGroup.clear();
      if (this.envRT) { this.envRT.dispose(); this.envRT = null; }

      this.kartMeshes.clear();
      this.boxMeshes.clear();
      this.projMeshes.clear();
      this.hazardMeshes.clear();
      this.trafficBulbs = [];
      this.particles = [];
      this.skids = [];
      this.skidIdx = 0;

      const track = state.track;
      const cfg = THEME_CFGS[track.theme] || THEME_CFGS.boomhill;
      this.scene.fog = new THREE.FogExp2(cfg.fog, cfg.fogDensity);
      this.scene.background = new THREE.Color(cfg.fog);

      // 1) PMREM 环境高光反射（让赛车金属漆面闪烁真实光泽！）
      if (Studio.PBR) {
        this.envRT = Studio.PBR.createEnvMap(this.gl, cfg.env);
        this.scene.environment = this.envRT.texture;
      }

      // 2) 天穹
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(540, 32, 18),
        new THREE.MeshBasicMaterial({ map: makeSkyTex(cfg, track.theme), side: THREE.BackSide, fog: false })
      );
      sky.position.set(120, 0, -20);
      this.worldGroup.add(sky);

      // 3) 明亮通透三点光照（杜绝白色过曝泛光）+ 实时跟随太阳软阴影
      this.worldGroup.add(new THREE.HemisphereLight(cfg.hemiSky, cfg.hemiGround, 1.05));
      const sun = new THREE.DirectionalLight(cfg.sunColor, cfg.sunInt * 0.78);
      sun.position.set(45, 70, 35);
      sun.castShadow = this.aaaQuality;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 10;
      sun.shadow.camera.far = 170;
      sun.shadow.camera.left = -46;
      sun.shadow.camera.right = 46;
      sun.shadow.camera.top = 46;
      sun.shadow.camera.bottom = -46;
      sun.shadow.bias = -0.0005;
      this.worldGroup.add(sun, sun.target);
      this.sunLight = sun;

      // 4) 挤压 3D 连续赛道带 + 双侧护栏 + 桥墩 + 弯道指示箭头
      const roadTex = makeRoadTexture(cfg, track.theme);
      const roadMat = new THREE.MeshStandardMaterial({
        map: roadTex,
        roughness: track.theme === 'glacier' ? 0.28 : 0.76,
        metalness: track.theme === 'glacier' ? 0.25 : 0.08,
      });
      const sideMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85 });
      this.worldGroup.add(buildTrackRibbonMesh(track, roadMat, sideMat));
      this.worldGroup.add(buildGuardrails(track, cfg));

      // 5) 经典起终点格子线 + 红绿灯龙门架！
      const sp0 = KR.sampleTrackAtS(track, 0);
      const startGrp = new THREE.Group();
      startGrp.position.set(sp0.x, sp0.y, sp0.z);
      startGrp.rotation.y = sp0.yaw;

      const checkerLine = new THREE.Mesh(
        new THREE.PlaneGeometry(sp0.w - 1.2, 3.6),
        new THREE.MeshBasicMaterial({ map: makeCheckerTex(false), polygonOffset: true, polygonOffsetFactor: -2 })
      );
      checkerLine.rotation.x = -Math.PI * 0.5;
      checkerLine.position.y = 0.05;
      startGrp.add(checkerLine);

      const pillarMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, metalness: 0.55, roughness: 0.3 });
      const hw = sp0.w * 0.5 + 0.8;
      for (const side of [-1, 1]) {
        const pil = new THREE.Mesh(new THREE.BoxGeometry(1.1, 8.8, 1.1), pillarMat);
        pil.position.set(side * hw, 4.4, 0);
        startGrp.add(pil);
      }
      const header = new THREE.Mesh(
        new THREE.BoxGeometry(sp0.w + 2.8, 2.2, 0.8),
        new THREE.MeshBasicMaterial({ map: makeCheckerTex(true) })
      );
      header.position.set(0, 8.2, 0);
      startGrp.add(header);

      // 4 颗 3D 起跑倒计时红绿灯 + 专业黑色灯箱背板
      const lightBox = new THREE.Mesh(new THREE.BoxGeometry(7.2, 1.35, 0.55), new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4, metalness: 0.6 }));
      lightBox.position.set(0, 6.55, -0.18);
      startGrp.add(lightBox);
      for (let b = 0; b < 4; b++) {
        const bulbMat = new THREE.MeshBasicMaterial({ color: 0x334155 });
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.40, 12, 10), bulbMat);
        bulb.position.set(-2.4 + b * 1.6, 6.55, -0.46);
        startGrp.add(bulb);
        this.trafficBulbs.push(bulbMat);
      }
      this.worldGroup.add(startGrp);

      // 6) 流动发光赛道加速带
      this.boostPadTex = makeBoostPadTex();
      const padMat = new THREE.MeshBasicMaterial({ map: this.boostPadTex, polygonOffset: true, polygonOffsetFactor: -3 });
      for (const pad of track.boostPads) {
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(pad.width, pad.length), padMat);
        mesh.position.set(pad.x, pad.y + 0.06, pad.z);
        mesh.rotation.order = 'YXZ';
        mesh.rotation.y = pad.yaw;
        mesh.rotation.x = -Math.PI * 0.5;
        this.worldGroup.add(mesh);
      }

      // 7) 飞跃跳台坡道
      const rampMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xd97706, emissiveIntensity: 0.35, roughness: 0.4 });
      for (const ramp of track.ramps) {
        const rm = new THREE.Mesh(new THREE.BoxGeometry(ramp.width, 0.55, ramp.length), rampMat);
        rm.position.set(ramp.x, ramp.y + 0.42, ramp.z);
        rm.rotation.order = 'YXZ';
        rm.rotation.y = ramp.yaw;
        rm.rotation.x = -0.14;
        this.worldGroup.add(rm);
      }

      // 8) 旋转七彩道具箱（道具赛可见）
      const boxTex = makeItemBoxTex();
      const boxGeo = new THREE.BoxGeometry(1.45, 1.45, 1.45);
      const boxMat = new THREE.MeshStandardMaterial({
        map: boxTex, emissive: 0x6366f1, emissiveIntensity: 0.35,
        roughness: 0.18, metalness: 0.25, transparent: true, opacity: 0.90,
      });
      for (const box of track.itemBoxes) {
        const bm = new THREE.Mesh(boxGeo, boxMat);
        bm.position.set(box.x, box.y, box.z);
        bm.visible = state.mode === 'item';
        this.dynamicGroup.add(bm);
        this.boxMeshes.set(box.id, bm);
      }

      // 9) 主题 3D 景观与地标
      const scen = buildThemeScenery(track, cfg);
      this.worldGroup.add(scen.grp);
      this.windmills = scen.windmills;

      // 10) 预创建 8 位车手的 3D 卡丁车
      for (const r of state.racers) {
        const km = KR.createKartMesh(r);
        this.dynamicGroup.add(km);
        this.kartMeshes.set(r.id, km);
      }

      // 11) 预分配 90 片沥青漂移胎痕复用池
      for (let i = 0; i < 90; i++) {
        const sm = new THREE.Mesh(this.skidGeo, this.skidMat);
        sm.visible = false;
        this.fxGroup.add(sm);
        this.skids.push(sm);
      }

      // 初始化镜头在玩家后上方
      const p = state.player;
      this.camPos.set(p.x - Math.sin(p.yaw) * 8, p.y + 3.8, p.z - Math.cos(p.yaw) * 8);
      this.camLook.set(p.x + Math.sin(p.yaw) * 10, p.y + 1.2, p.z + Math.cos(p.yaw) * 10);
    }

    /** 释放漂移胎烟与摩擦火花粒子 */
    spawnDriftFX(r) {
      const cos = Math.cos(r.yaw + r.driftAngle);
      const sin = Math.sin(r.yaw + r.driftAngle);
      const isSpark = r.driftDuration > 0.35;
      const col = isSpark ? (r.counterSteered ? 0x38bdf8 : 0xfbbf24) : 0xe2e8f0;

      for (const side of [-0.82, 0.82]) {
        const wx = r.x + cos * side - sin * 0.85;
        const wz = r.z - sin * side - cos * 0.85;

        // 地面黑色轮胎漂移印迹
        if (this.skids.length) {
          const sk = this.skids[this.skidIdx++ % this.skids.length];
          sk.visible = true;
          sk.position.set(wx, r.y + 0.045, wz);
          sk.rotation.order = 'YXZ';
          sk.rotation.y = r.yaw;
          sk.rotation.x = -Math.PI * 0.5;
        }

        // 漂移火花/青烟粒子（控制总数 <= 120 保障极速 60FPS）
        if (this.particles.length < 120) {
          const m = new THREE.Mesh(this.sparkGeo, new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.88 }));
          m.position.set(wx, r.y + 0.18, wz);
          m.scale.setScalar(isSpark ? 1.0 : 1.7);
          this.fxGroup.add(m);
          this.particles.push({
            mesh: m,
            vx: -sin * 4 + (Math.random() - 0.5) * 3.5,
            vy: 1.4 + Math.random() * 2.2,
            vz: -cos * 4 + (Math.random() - 0.5) * 3.5,
            life: isSpark ? 0.24 : 0.36,
            maxLife: isSpark ? 0.24 : 0.36,
          });
        }
      }
    }

    render(state, dt = 1 / 60) {
      this.t += dt;
      if (this.trackId !== state.track.id || this.kartMeshes.size !== state.racers.length) {
        this.buildTrack(state);
      }

      const w = this.gfx.w || 960;
      const h = this.gfx.h || 540;
      if (Math.abs(this.camera.aspect - w / h) > 0.001) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
      }

      // 1) 更新龙门架 3-2-1-GO! 实时红绿灯
      if (this.trafficBulbs.length === 4) {
        if (state.phase === 'countdown') {
          const lit = state.countdown > 2.2 ? 1 : (state.countdown > 1.2 ? 2 : 3);
          for (let i = 0; i < 4; i++) {
            this.trafficBulbs[i].color.setHex(i < lit ? 0xef4444 : 0x334155);
          }
        } else {
          for (let i = 0; i < 4; i++) this.trafficBulbs[i].color.setHex(0x22c55e);
        }
      }

      // 2) 流动加速带与旋转风车
      if (this.boostPadTex) this.boostPadTex.offset.y -= dt * 2.6;
      for (const hub of this.windmills) hub.rotation.z += dt * 1.1;

      // 3) 道具箱旋转悬浮与重生显隐
      for (const box of state.track.itemBoxes) {
        const bm = this.boxMeshes.get(box.id);
        if (!bm) continue;
        bm.visible = state.mode === 'item' && box.respawn <= 0;
        if (bm.visible) {
          bm.rotation.y = this.t * 2.2 + box.id;
          bm.rotation.x = Math.sin(this.t * 2.6 + box.id) * 0.28;
          bm.position.y = box.y + Math.sin(this.t * 3.4 + box.id) * 0.22;
        }
      }

      // 4) 更新全部 8 辆卡丁车模型 + 自动近距/背后隐藏对手名牌（绝不遮挡相机视野！）+ 漂移胎痕烟尘火花
      for (const r of state.racers) {
        const km = this.kartMeshes.get(r.id);
        if (km) {
          KR.updateKartMesh(km, r, this.t, dt);
          if (km.userData.nameSprite) {
            const dCam = Math.hypot(r.x - this.camPos.x, r.z - this.camPos.z);
            km.userData.nameSprite.visible = dCam > 8.5 && dCam < 72;
          }
        }
        if (r.drifting && r.onGround && r.speed > 18 && Math.random() < (r.isPlayer ? 0.85 : 0.35)) {
          this.spawnDriftFX(r);
        }
      }

      // 5) 更新道具弹体（追踪导弹 / 水苍蝇 / 抛物水炸弹）
      const activeProj = new Set();
      for (const p of state.projectiles) {
        activeProj.add(p.id);
        let pm = this.projMeshes.get(p.id);
        if (!pm) {
          if (p.kind === 'missile') {
            pm = new THREE.Group();
            const body = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 1.35, 10), new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6, roughness: 0.25 }));
            body.rotation.x = Math.PI * 0.5;
            const nose = new THREE.Mesh(new THREE.ConeGeometry(0.20, 0.42, 10), new THREE.MeshBasicMaterial({ color: 0xfef08a }));
            nose.rotation.x = Math.PI * 0.5;
            nose.position.z = 0.85;
            pm.add(body, nose);
          } else {
            pm = new THREE.Mesh(
              new THREE.SphereGeometry(p.kind === 'waterbomb' ? 0.72 : 0.46, 14, 12),
              new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.7, roughness: 0.15, transparent: true, opacity: 0.88 })
            );
          }
          this.dynamicGroup.add(pm);
          this.projMeshes.set(p.id, pm);
        }
        pm.position.set(p.x, p.y, p.z);
        if (p.yaw != null) pm.rotation.y = p.yaw;
      }
      for (const [id, pm] of this.projMeshes) {
        if (!activeProj.has(id)) {
          this.dynamicGroup.remove(pm);
          Studio.disposeObject(pm);
          this.projMeshes.delete(id);
        }
      }

      // 6) 更新赛道香蕉皮 & 水炸弹水幕波
      const activeHaz = new Set();
      for (const h of state.hazards) {
        activeHaz.add(h.id);
        let hm = this.hazardMeshes.get(h.id);
        if (!hm) {
          if (h.kind === 'banana') {
            hm = new THREE.Mesh(
              new THREE.ConeGeometry(0.55, 0.75, 6),
              new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.25, roughness: 0.4 })
            );
          } else {
            hm = new THREE.Mesh(
              new THREE.SphereGeometry(h.radius, 20, 14),
              new THREE.MeshBasicMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.35, depthWrite: false })
            );
          }
          this.dynamicGroup.add(hm);
          this.hazardMeshes.set(h.id, hm);
        }
        hm.position.set(h.x, h.y + (h.kind === 'banana' ? 0.32 : 0), h.z);
        if (h.kind === 'banana') hm.rotation.y += dt * 1.8;
        else hm.material.opacity = Math.max(0, h.life * 0.5);
      }
      for (const [id, hm] of this.hazardMeshes) {
        if (!activeHaz.has(id)) {
          this.dynamicGroup.remove(hm);
          Studio.disposeObject(hm);
          this.hazardMeshes.delete(id);
        }
      }

      // 7) 更新漂移烟尘/火花粒子
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const pt = this.particles[i];
        pt.life -= dt;
        if (pt.life <= 0) {
          this.fxGroup.remove(pt.mesh);
          pt.mesh.material.dispose();
          this.particles.splice(i, 1);
          continue;
        }
        pt.mesh.position.x += pt.vx * dt;
        pt.mesh.position.y += pt.vy * dt;
        pt.mesh.position.z += pt.vz * dt;
        pt.mesh.material.opacity = (pt.life / pt.maxLife) * 0.85;
      }

      // 8) 太阳软阴影跟随玩家卡丁车
      const p = state.player;
      if (this.sunLight) {
        this.sunLight.target.position.set(p.x, p.y, p.z);
        this.sunLight.position.set(p.x + 38, p.y + 62, p.z + 28);
        this.sunLight.target.updateMatrixWorld();
      }

      // 9) 经典跑跑卡丁车电影级追尾镜头（漂移轻微外摆展示横移姿态 + 氮气拉宽 FOV 极速拉扯感！）
      const isNitro = p.nitroTimer > 0 || p.startBoostTimer > 0 || p.padBoostTimer > 0 || p.magnetTimer > 0;
      const isMini = p.miniBoostTimer > 0;
      const targetFov = isNitro ? 79 : (isMini ? 72 : 64);
      this.fovCurrent += (targetFov - this.fovCurrent) * Math.min(1, dt * 7);
      if (Math.abs(this.camera.fov - this.fovCurrent) > 0.05) {
        this.camera.fov = this.fovCurrent;
        this.camera.updateProjectionMatrix();
      }

      const camYaw = p.yaw + p.driftAngle * 0.25;
      const backDist = isNitro ? 7.6 : 6.7;
      const camH = isNitro ? 2.75 : 2.95;
      const desiredCamX = p.x - Math.sin(camYaw) * backDist;
      const desiredCamY = p.y + camH;
      const desiredCamZ = p.z - Math.cos(camYaw) * backDist;

      const lerpK = Math.min(1, dt * 10);
      this.camPos.x += (desiredCamX - this.camPos.x) * lerpK;
      this.camPos.y += (desiredCamY - this.camPos.y) * lerpK;
      this.camPos.z += (desiredCamZ - this.camPos.z) * lerpK;

      const lookX = p.x + Math.sin(camYaw) * 11;
      const lookY = p.y + 1.15;
      const lookZ = p.z + Math.cos(camYaw) * 11;
      this.camLook.x += (lookX - this.camLook.x) * Math.min(1, dt * 14);
      this.camLook.y += (lookY - this.camLook.y) * Math.min(1, dt * 14);
      this.camLook.z += (lookZ - this.camLook.z) * Math.min(1, dt * 14);

      this.shakeMag = Math.max(0, this.shakeMag - dt * 1.4);
      const sx = this.shakeMag > 0 ? (Math.random() - 0.5) * this.shakeMag : 0;
      const sy = this.shakeMag > 0 ? (Math.random() - 0.5) * this.shakeMag : 0;
      this.camera.position.set(this.camPos.x + sx, this.camPos.y + sy, this.camPos.z);
      this.camera.lookAt(this.camLook);

      // 10) 渲染（精细克制 HDR 泛光，保留清晰阳光质感与氮气辉光！）
      if (this.post && this.post.enabled) {
        this.post.render(this.scene, this.camera, w, h, {
          bloomStrength: isNitro ? 0.36 : 0.14,
          vignette: isNitro ? 0.28 : 0.14,
          desaturate: 0,
        });
      } else {
        this.gl.render(this.scene, this.camera);
      }
    }

    dispose() {
      Studio.disposeObject(this.worldGroup);
      Studio.disposeObject(this.dynamicGroup);
      Studio.disposeObject(this.fxGroup);
      if (this.envRT) { this.envRT.dispose(); this.envRT = null; }
      if (this.post) { this.post.dispose(); this.post = null; }
      this.skidGeo.dispose();
      this.skidMat.dispose();
      this.sparkGeo.dispose();
    }
  }

  KR.KartRenderer = KartRenderer;
})(typeof window !== 'undefined' ? window : globalThis);
