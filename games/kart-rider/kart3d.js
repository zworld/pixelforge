/* 跑跑卡丁车 · 巅峰漂移 — 高精雕塑 3D 传奇赛车（尖锋PRO/棉花糖SR/爆烈Z7/游侠X）+ 生动拟人繁荣山丘车手 + 全套道具/氮气喷焰特效 */
(function (G) {
  'use strict';
  const KR = (G.KR = G.KR || {});
  const Studio = G.Studio;

  const faceTexCache = new Map();
  const decalTexCache = new Map();

  /** 绘制生动可爱的繁荣山丘车手表情脸谱（高光灵动大眼、立体腮红、微笑表情） */
  function makeDriverFaceTex(driver) {
    if (faceTexCache.has(driver.id)) return faceTexCache.get(driver.id);
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    const colHex = '#' + driver.skin.toString(16).padStart(6, '0');
    ctx.fillStyle = colHex;
    ctx.fillRect(0, 0, 256, 256);

    // 柔和面部阴影立体感
    const grad = ctx.createRadialGradient(128, 120, 20, 128, 128, 128);
    grad.addColorStop(0, 'rgba(255,255,255,0.16)');
    grad.addColorStop(1, 'rgba(180,100,70,0.18)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    // 可爱腮红
    ctx.fillStyle = 'rgba(244, 114, 182, 0.34)';
    ctx.beginPath(); ctx.ellipse(82, 152, 18, 10, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(174, 152, 18, 10, 0, 0, Math.PI * 2); ctx.fill();

    // 灵动大眼（双层瞳孔 + 璀璨高光点）
    for (const ex of [96, 160]) {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.ellipse(ex, 126, 15, 19, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.beginPath(); ctx.ellipse(ex, 128, 10.5, 14, 0, 0, Math.PI * 2); ctx.fill();
      // 虹膜亮斑
      ctx.fillStyle = driver.id === 'dizni' ? '#ec4899' : '#38bdf8';
      ctx.beginPath(); ctx.arc(ex, 134, 5.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(ex - 4, 121, 4.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(ex + 4, 133, 2.0, 0, Math.PI * 2); ctx.fill();
      // 睫毛/眉弓
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 4.5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(ex, 116, 16, Math.PI * 1.15, Math.PI * 1.85);
      ctx.stroke();
    }

    // 自信阳光微笑
    ctx.strokeStyle = '#9a3412';
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(128, 156, 14, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    faceTexCache.set(driver.id, tex);
    return tex;
  }

  /** 生成精致赛车涂装拉花贴图（碳纤维暗纹 + 竞速双色条纹 + 传奇编号！） */
  function makeChassisDecalTex(kart, num) {
    const key = kart.id + '_' + num;
    if (decalTexCache.has(key)) return decalTexCache.get(key);
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');

    const pHex = '#' + kart.primary.toString(16).padStart(6, '0');
    const sHex = '#' + kart.secondary.toString(16).padStart(6, '0');
    const aHex = '#' + kart.accent.toString(16).padStart(6, '0');

    ctx.fillStyle = pHex;
    ctx.fillRect(0, 0, 512, 512);

    // 细腻金属拉丝与光泽渐变
    const g = ctx.createLinearGradient(0, 0, 512, 512);
    g.addColorStop(0, 'rgba(255,255,255,0.16)');
    g.addColorStop(0.5, 'rgba(0,0,0,0.04)');
    g.addColorStop(1, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 512);

    // 居中双道竞速条纹
    ctx.fillStyle = sHex;
    ctx.fillRect(216, 0, 32, 512);
    ctx.fillRect(264, 0, 32, 512);

    // 侧翼锐利闪电装饰带
    ctx.fillStyle = aHex;
    ctx.fillRect(202, 0, 8, 512);
    ctx.fillRect(302, 0, 8, 512);
    ctx.beginPath();
    ctx.moveTo(0, 310); ctx.lineTo(180, 220); ctx.lineTo(180, 260); ctx.lineTo(0, 360); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(512, 310); ctx.lineTo(332, 220); ctx.lineTo(332, 260); ctx.lineTo(512, 360); ctx.fill();

    // 车头圆形赛号标牌
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(256, 140, 44, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(num), 256, 144);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    decalTexCache.set(key, tex);
    return tex;
  }

  /** 构建高精铝合金轮毂 + 宽胎竞速轮胎 */
  function buildWheel(radius, width, accentHex) {
    const g = new THREE.Group();
    const tireMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.78, metalness: 0.08 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.88, roughness: 0.22 });
    const hubMat = new THREE.MeshStandardMaterial({ color: accentHex, metalness: 0.75, roughness: 0.25, emissive: accentHex, emissiveIntensity: 0.25 });

    const tire = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, width, 18), tireMat);
    tire.rotation.z = Math.PI * 0.5;
    tire.castShadow = true;
    g.add(tire);

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, width + 0.02, 14), rimMat);
    rim.rotation.z = Math.PI * 0.5;
    g.add(rim);

    // 五辐竞速轮毂花纹（旋转时极其明显！）
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(width + 0.035, radius * 0.96, 0.055), hubMat);
      spoke.rotation.x = a;
      g.add(spoke);
    }

    const cap = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.24, radius * 0.24, width + 0.05, 10), hubMat);
    cap.rotation.z = Math.PI * 0.5;
    g.add(cap);
    return g;
  }

  /** 构建高精拟人 Q 版繁荣山丘车手（带灵动表情脸、头盔/鸭舌帽/护目镜、双臂紧握方向盘、过弯自动歪头倾身！） */
  function buildDriverMesh(driver) {
    const root = new THREE.Group();
    const suitMat = new THREE.MeshStandardMaterial({ color: driver.suit, roughness: 0.45, metalness: 0.14 });
    const trimMat = new THREE.MeshStandardMaterial({ color: driver.trim, roughness: 0.35, metalness: 0.25 });
    const helmetMat = new THREE.MeshStandardMaterial({ color: driver.helmet, roughness: 0.18, metalness: 0.38 });
    const skinMat = new THREE.MeshStandardMaterial({ color: driver.skin, roughness: 0.55 });
    const faceMat = new THREE.MeshStandardMaterial({ map: makeDriverFaceTex(driver), roughness: 0.48 });

    // 赛车服躯干
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.27, 0.48, 12), suitMat);
    torso.position.y = 0.24;
    torso.castShadow = true;
    root.add(torso);

    // 胸前竞速拉链条纹与护肩
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.44, 0.48), trimMat);
    stripe.position.y = 0.24;
    root.add(stripe);

    // 双臂前伸握方向盘
    const armL = new THREE.Group();
    armL.position.set(0.25, 0.38, 0.04);
    const armLMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.06, 0.42, 8), suitMat);
    armLMesh.rotation.x = Math.PI * 0.44;
    armLMesh.position.set(-0.04, -0.02, 0.20);
    const gloveL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), trimMat);
    gloveL.position.set(-0.07, -0.04, 0.39);
    armL.add(armLMesh, gloveL);

    const armR = new THREE.Group();
    armR.position.set(-0.25, 0.38, 0.04);
    const armRMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.06, 0.42, 8), suitMat);
    armRMesh.rotation.x = Math.PI * 0.44;
    armRMesh.position.set(0.04, -0.02, 0.20);
    const gloveR = new THREE.Mesh(new THREE.SphereGeometry(0.075, 10, 8), trimMat);
    gloveR.position.set(0.07, -0.04, 0.39);
    armR.add(armRMesh, gloveR);
    root.add(armL, armR);

    // 头部枢纽（漂移与转弯时生动歪头望向弯心！）
    const headPivot = new THREE.Group();
    headPivot.position.set(0, 0.52, 0.02);

    // 圆润 Q 版写实比例大头（面部贴图朝 +Z 前方）
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.31, 20, 16), faceMat);
    head.rotation.y = -Math.PI * 0.5; // 将球面 UV 中心正对 +Z！
    head.position.y = 0.26;
    head.castShadow = true;
    headPivot.add(head);

    // 小耳朵
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), skinMat);
      ear.position.set(side * 0.30, 0.24, -0.02);
      headPivot.add(ear);
    }

    // 经典头盔 / 赛帽 / 护目镜造型（高额头佩戴，完整露出车手灵动大眼与眉眼！）
    const helmetShell = new THREE.Mesh(
      new THREE.SphereGeometry(0.335, 22, 16, 0, Math.PI * 2, 0, Math.PI * 0.46),
      helmetMat
    );
    helmetShell.position.y = 0.31;
    helmetShell.rotation.x = -0.32;
    helmetShell.castShadow = true;
    headPivot.add(helmetShell);

    // 头盔顶部标志性竞速中脊条纹
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.10, 0.055, 0.44), trimMat);
    crest.position.set(0, 0.62, -0.06);
    headPivot.add(crest);

    if (driver.style === 'cap') {
      // 皮蛋风：微翘帅气鸭舌帽檐 + 经典圆形徽章（绝不遮挡灵动大眼！）
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.04, 16, 1, false, -Math.PI * 0.42, Math.PI * 0.84), helmetMat);
      brim.position.set(0, 0.44, 0.24);
      brim.rotation.x = -0.16;
      const badge = new THREE.Mesh(new THREE.CircleGeometry(0.065, 14), trimMat);
      badge.position.set(0, 0.51, 0.305);
      badge.rotation.x = -0.22;
      headPivot.add(brim, badge);
    } else if (driver.style === 'visor' || driver.style === 'goggles') {
      // 黑妞/葱头风：抬起式额前赛用护目风镜
      const visorMat = new THREE.MeshStandardMaterial({
        color: driver.style === 'goggles' ? 0xfbbf24 : 0x38bdf8,
        metalness: 0.85, roughness: 0.12, transparent: true, opacity: 0.85,
      });
      const goggles = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.12, 0.14), visorMat);
      goggles.position.set(0, 0.49, 0.25);
      goggles.rotation.x = -0.22;
      headPivot.add(goggles);
    } else {
      // 宝宝风：俏皮双耳装饰球
      for (const side of [-1, 1]) {
        const pod = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 10), trimMat);
        pod.position.set(side * 0.28, 0.50, -0.04);
        headPivot.add(pod);
      }
    }

    // 飘逸领巾（高速行驶随风摆动！）
    const scarfMat = new THREE.MeshStandardMaterial({ color: driver.helmet, roughness: 0.5, side: THREE.DoubleSide });
    const scarf = new THREE.Mesh(new THREE.PlaneGeometry(0.16, 0.42), scarfMat);
    scarf.position.set(0, 0.46, -0.26);
    scarf.rotation.x = 0.65;
    root.add(scarf);

    root.add(headPivot);
    root.userData = { headPivot, armL, armR, scarf };
    return root;
  }

  /**
   * 构建完整 3D 高精卡丁车 + 车手 + 双/三排气管氮气真火 + 全套道具状态特效挂件！
   * 车头统一朝向本地 +Z，与 engine.js `sin(yaw), cos(yaw)` 严格对齐！
   */
  KR.createKartMesh = function (racer) {
    const kart = racer.kart;
    const root = new THREE.Group();
    const bodyTilt = new THREE.Group(); // 漂移侧倾 / 加速抬头 / 受击旋转容器
    root.add(bodyTilt);

    const decalTex = makeChassisDecalTex(kart, racer.id + 1);
    const primaryMat = new THREE.MeshStandardMaterial({
      map: decalTex, color: 0xffffff, metalness: 0.48, roughness: 0.22,
    });
    const secMat = new THREE.MeshStandardMaterial({ color: kart.secondary, metalness: 0.42, roughness: 0.26 });
    const accentMat = new THREE.MeshStandardMaterial({
      color: kart.accent, metalness: 0.68, roughness: 0.20, emissive: kart.accent, emissiveIntensity: 0.22,
    });
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x18181b, metalness: 0.35, roughness: 0.55 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.14 });
    const headlightMat = new THREE.MeshBasicMaterial({ color: 0xfef9c3 });
    const taillightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });

    // 1) 碳纤维底盘底座
    const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.18, 2.38), carbonMat);
    chassis.position.set(0, 0.28, 0);
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    bodyTilt.add(chassis);

    // 2) 四大传奇车型差异化空气动力学雕塑车壳！
    if (kart.chassisStyle === 'saber') {
      // 尖锋 PRO：锐利刀锋前鼻 + 切面侧箱 + 高翘尾翼
      const nose = new THREE.Mesh(new THREE.ConeGeometry(0.56, 1.38, 4), primaryMat);
      nose.rotation.set(Math.PI * 0.5, Math.PI * 0.25, 0);
      nose.scale.set(1.25, 1.0, 0.52);
      nose.position.set(0, 0.46, 0.72);
      nose.castShadow = true;
      bodyTilt.add(nose);
    } else if (kart.chassisStyle === 'cotton') {
      // 棉花糖 SR：标志性圆润流线水滴车头
      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.66, 18, 12), primaryMat);
      nose.scale.set(1.06, 0.52, 1.55);
      nose.position.set(0, 0.45, 0.46);
      nose.castShadow = true;
      bodyTilt.add(nose);
    } else if (kart.chassisStyle === 'burst') {
      // 爆烈 Z7：肌肉双进气口霸气车头
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.42, 1.24), primaryMat);
      hood.position.set(0, 0.48, 0.52);
      hood.rotation.x = 0.12;
      hood.castShadow = true;
      bodyTilt.add(hood);
      for (const sx of [-0.30, 0.30]) {
        const intake = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.20, 0.58), secMat);
        intake.position.set(sx, 0.68, 0.42);
        bodyTilt.add(intake);
      }
    } else {
      // 游侠 X：极速黑晶低趴超跑鼻锥 + 霓虹灯条
      const nose = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.30, 1.42), primaryMat);
      nose.position.set(0, 0.42, 0.56);
      nose.rotation.x = 0.14;
      nose.castShadow = true;
      const neonStrip = new THREE.Mesh(new THREE.BoxGeometry(1.16, 0.06, 1.44), new THREE.MeshBasicMaterial({ color: kart.accent }));
      neonStrip.position.set(0, 0.36, 0.56);
      bodyTilt.add(nose, neonStrip);
    }

    // 侧翼进气导流箱 + 车身中后段座舱围板
    for (const side of [-1, 1]) {
      const pod = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 1.38), primaryMat);
      pod.position.set(side * 0.64, 0.44, -0.05);
      pod.castShadow = true;
      const trim = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.12, 1.24), accentMat);
      trim.position.set(side * 0.83, 0.46, -0.05);
      bodyTilt.add(pod, trim);
    }

    // 空气动力学前扰流铲 + 后置引擎舱 + 悬浮定风尾翼！
    const frontWing = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.08, 0.34), secMat);
    frontWing.position.set(0, 0.24, 1.26);
    const rearDeck = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.46, 0.78), primaryMat);
    rearDeck.position.set(0, 0.54, -0.78);
    rearDeck.castShadow = true;
    const spoilerBlade = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.08, 0.34), secMat);
    spoilerBlade.position.set(0, 1.06, -1.04);
    spoilerBlade.rotation.x = 0.18;
    spoilerBlade.castShadow = true;
    for (const sx of [-0.52, 0.52]) {
      const strut = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.44, 0.24), carbonMat);
      strut.position.set(sx, 0.84, -1.02);
      const endPlate = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.24, 0.42), accentMat);
      endPlate.position.set(sx * 1.48, 1.06, -1.04);
      bodyTilt.add(strut, endPlate);
    }
    bodyTilt.add(frontWing, rearDeck, spoilerBlade);

    // 发光车头灯 & 尾灯
    for (const sx of [-0.42, 0.42]) {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.11, 0.08), headlightMat);
      hl.position.set(sx, 0.46, 1.18);
      const tl = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10, 0.08), taillightMat);
      tl.position.set(sx, 0.58, -1.19);
      bodyTilt.add(hl, tl);
    }

    // 座舱方向盘 + 流线半透明挡风玻璃（增强跑跑经典座舱精致感！）
    const wheelPivot = new THREE.Group();
    wheelPivot.position.set(0, 0.76, 0.34);
    wheelPivot.rotation.x = -0.45;
    const stRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.028, 8, 16), carbonMat);
    const stBar = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.03), accentMat);
    wheelPivot.add(stRing, stBar);
    const windshield = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.50, 0.34, 14, 1, true, -Math.PI * 0.38, Math.PI * 0.76),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.10, transparent: true, opacity: 0.62, side: THREE.DoubleSide })
    );
    windshield.position.set(0, 0.78, 0.30);
    windshield.rotation.x = -0.42;
    bodyTilt.add(wheelPivot, windshield);

    // 3) 4 只独立旋转车轮（前轮带转向关节，后轮更宽展现竞速力量感！）
    const frontPivots = [];
    const spinWheels = [];
    const wheelCoords = [
      { x: -0.82, y: 0.30, z: 0.86, r: 0.30, w: 0.28, front: true },
      { x:  0.82, y: 0.30, z: 0.86, r: 0.30, w: 0.28, front: true },
      { x: -0.88, y: 0.35, z: -0.78, r: 0.35, w: 0.36, front: false },
      { x:  0.88, y: 0.35, z: -0.78, r: 0.35, w: 0.36, front: false },
    ];
    for (const wc of wheelCoords) {
      const wMesh = buildWheel(wc.r, wc.w, kart.accent);
      if (wc.front) {
        const pivot = new THREE.Group();
        pivot.position.set(wc.x, wc.y, wc.z);
        pivot.add(wMesh);
        root.add(pivot);
        frontPivots.push(pivot);
      } else {
        wMesh.position.set(wc.x, wc.y, wc.z);
        root.add(wMesh);
      }
      spinWheels.push({ mesh: wMesh, r: wc.r });
    }

    // 4) 经典双/三镀铬排气管 + 实时动态 N2O 氮气喷焰系统！
    const pipeOffsets = kart.pipes === 3 ? [-0.36, 0, 0.36] : [-0.30, 0.30];
    const flames = [];
    const fireTex = Studio && Studio.Assets3D && Studio.Assets3D.getFireSpriteTexture ? Studio.Assets3D.getFireSpriteTexture() : null;
    for (const px of pipeOffsets) {
      const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.42, 12), chromeMat);
      pipe.rotation.x = Math.PI * 0.5;
      pipe.position.set(px, 0.44, -1.24);
      bodyTilt.add(pipe);

      // 喷射火焰锥体 + 羽化辉光精灵（双层蓝/金氮气火舌！）
      const fGrp = new THREE.Group();
      fGrp.position.set(px, 0.44, -1.46);
      const outerCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.16, 1.35, 10),
        new THREE.MeshBasicMaterial({ color: kart.flameColor, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      outerCone.rotation.x = -Math.PI * 0.5;
      outerCone.position.z = -0.65;
      const innerCone = new THREE.Mesh(
        new THREE.ConeGeometry(0.085, 0.88, 8),
        new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      innerCone.rotation.x = -Math.PI * 0.5;
      innerCone.position.z = -0.44;
      fGrp.add(outerCone, innerCone);
      if (fireTex) {
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({
          map: fireTex, color: kart.flameColor, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.8,
        }));
        sp.scale.set(0.75, 0.75, 1);
        sp.position.z = -0.35;
        fGrp.add(sp);
      }
      fGrp.visible = false;
      bodyTilt.add(fGrp);
      flames.push({ grp: fGrp, outerMat: outerCone.material });
    }

    // 5) 车手落座驾驶舱
    const driverMesh = buildDriverMesh(racer.driver);
    driverMesh.position.set(0, 0.40, -0.10);
    bodyTilt.add(driverMesh);

    // 6) 全套经典道具状态 3D 可视挂件（天使护盾穹顶 / 蓝晶水泡 / 大魔王紫环 / 头顶外星飞碟光柱 / 导弹锁定红框）
    const shieldDome = new THREE.Mesh(
      new THREE.SphereGeometry(1.78, 22, 16),
      new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.28, wireframe: false, side: THREE.DoubleSide, depthWrite: false })
    );
    shieldDome.position.y = 0.92;
    const shieldRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.65, 0.06, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.85 })
    );
    shieldRing.rotation.x = Math.PI * 0.5;
    shieldDome.add(shieldRing);
    shieldDome.visible = false;
    root.add(shieldDome);

    const waterBubble = new THREE.Mesh(
      new THREE.SphereGeometry(1.88, 24, 18),
      new THREE.MeshStandardMaterial({
        color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.45,
        roughness: 0.08, metalness: 0.15, transparent: true, opacity: 0.46, depthWrite: false,
      })
    );
    waterBubble.position.y = 0.92;
    waterBubble.visible = false;
    root.add(waterBubble);

    const devilHalo = new THREE.Group();
    devilHalo.position.y = 2.05;
    const dRing = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 8, 18), new THREE.MeshBasicMaterial({ color: 0xa855f7 }));
    dRing.rotation.x = Math.PI * 0.5;
    for (const sx of [-0.26, 0.26]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.34, 8), new THREE.MeshBasicMaterial({ color: 0xc026d3 }));
      horn.position.set(sx, 0.18, 0);
      horn.rotation.z = -sx * 1.1;
      devilHalo.add(horn);
    }
    devilHalo.add(dRing);
    devilHalo.visible = false;
    root.add(devilHalo);

    const ufoGrp = new THREE.Group();
    ufoGrp.position.y = 3.2;
    const saucer = new THREE.Mesh(
      new THREE.CylinderGeometry(0.45, 0.95, 0.28, 16),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.85, roughness: 0.2 })
    );
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.46, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5), new THREE.MeshBasicMaterial({ color: 0x4ade80 }));
    dome.position.y = 0.12;
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(1.35, 2.75, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0x4ade80, transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false })
    );
    beam.position.y = -1.42;
    ufoGrp.add(saucer, dome, beam);
    ufoGrp.visible = false;
    root.add(ufoGrp);

    // 车顶名牌（非玩家显示对手名称，增强 8 人同场竞技代入感！）
    let nameSprite = null;
    if (!racer.isPlayer) {
      const nc = document.createElement('canvas');
      nc.width = 256;
      nc.height = 64;
      const nctx = nc.getContext('2d');
      nctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      nctx.beginPath();
      nctx.roundRect(24, 10, 208, 44, 16);
      nctx.fill();
      nctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      nctx.lineWidth = 2;
      nctx.stroke();
      nctx.fillStyle = '#f8fafc';
      nctx.font = 'bold 26px sans-serif';
      nctx.textAlign = 'center';
      nctx.textBaseline = 'middle';
      nctx.fillText(racer.name, 128, 33);
      const nTex = new THREE.CanvasTexture(nc);
      nTex.colorSpace = THREE.SRGBColorSpace;
      nameSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: nTex, transparent: true, depthTest: true, depthWrite: false }));
      nameSprite.scale.set(1.85, 0.46, 1);
      nameSprite.position.y = 2.08;
      root.add(nameSprite);
    }

    // 氮气喷射动态车尾光（仅玩家与冲刺时照亮路面！）
    let boostLight = null;
    if (racer.isPlayer) {
      boostLight = new THREE.PointLight(kart.flameColor, 0, 12);
      boostLight.position.set(0, 0.65, -2.0);
      bodyTilt.add(boostLight);
    }

    root.userData = {
      bodyTilt,
      frontPivots,
      spinWheels,
      wheelPivot,
      driverMesh,
      flames,
      shieldDome,
      waterBubble,
      devilHalo,
      ufoGrp,
      nameSprite,
      boostLight,
      flameColor: kart.flameColor,
    };
    return root;
  };

  /** 实时更新 3D 卡丁车姿态、车轮转动/转向、车手倾身歪头、喷火与道具特效 */
  KR.updateKartMesh = function (mesh, r, t, dt) {
    const ud = mesh.userData;
    mesh.position.set(r.x, r.y, r.z);

    // 车体视觉朝向 = 行驶航向 + 漂移侧滑角 + 被导弹/香蕉击中的 360° 陀螺旋转！
    const spinExtra = r.spinTimer > 0 ? r.spinTimer * Math.PI * 5.5 : 0;
    mesh.rotation.y = r.yaw + r.driftAngle + spinExtra;

    // 车体物理动感：漂移侧倾 Roll + 氮气抬头 Pitch + 引擎高频微震
    const isNitro = r.nitroTimer > 0 || r.startBoostTimer > 0 || r.padBoostTimer > 0 || r.magnetTimer > 0;
    const isMini = r.miniBoostTimer > 0;
    const targetRoll = r.drifting ? r.driftDir * 0.14 : r.steerVisual * 0.055;
    const targetPitch = isNitro ? -0.065 : (isMini ? -0.038 : 0);
    ud.bodyTilt.rotation.z += (targetRoll - ud.bodyTilt.rotation.z) * Math.min(1, dt * 12);
    ud.bodyTilt.rotation.x += (targetPitch - ud.bodyTilt.rotation.x) * Math.min(1, dt * 10);
    ud.bodyTilt.position.y = r.onGround ? Math.sin(t * 36 + r.id) * 0.008 * Math.min(1, r.speed / 25) : 0;

    // 前轮转向与四轮滚动
    const wheelSteer = -r.steerVisual * 0.44 + (r.drifting ? -r.driftAngle * 0.35 : 0);
    for (const fp of ud.frontPivots) fp.rotation.y = wheelSteer;
    for (const sw of ud.spinWheels) sw.mesh.rotation.x += (r.speed / sw.r) * dt;
    ud.wheelPivot.rotation.z = -r.steerVisual * 0.85;

    // 车手生动肢体动作：转弯歪头看弯心、氮气加速俯身、被水泡困住晃动、冲线高举欢呼！
    const du = ud.driverMesh.userData;
    du.headPivot.rotation.y = -r.steerVisual * 0.42 - r.driftAngle * 0.45;
    du.headPivot.rotation.z = r.drifting ? r.driftDir * 0.18 : r.steerVisual * 0.08;
    ud.driverMesh.rotation.x = isNitro ? 0.22 : (r.finished ? -0.10 : 0.04);
    du.scarf.rotation.x = 0.6 + Math.min(0.85, r.speed * 0.015) + Math.sin(t * 22 + r.id) * 0.14;
    if (r.finished) {
      du.armL.rotation.x = -1.6 + Math.sin(t * 10) * 0.25;
      du.armR.rotation.x = -1.6 - Math.sin(t * 10) * 0.25;
    } else {
      du.armL.rotation.x = 0;
      du.armR.rotation.x = 0;
    }

    // 氮气 / 小喷双色喷焰可视化
    const showFlame = isNitro || isMini || r.draftBoostTimer > 0;
    const fLen = isNitro ? (1.45 + Math.sin(t * 48) * 0.25) : (isMini ? (0.95 + Math.sin(t * 42) * 0.18) : 0.65);
    const fCol = isNitro ? ud.flameColor : (isMini ? 0x60a5fa : 0xbae6fd);
    for (const f of ud.flames) {
      f.grp.visible = showFlame;
      if (showFlame) {
        f.grp.scale.set(isNitro ? 1.2 : 0.85, isNitro ? 1.2 : 0.85, fLen);
        f.outerMat.color.setHex(fCol);
      }
    }
    if (ud.boostLight) {
      ud.boostLight.intensity = isNitro ? 4.8 : (isMini ? 2.4 : 0);
      ud.boostLight.color.setHex(fCol);
    }

    // 道具状态挂件动态
    ud.shieldDome.visible = r.shieldTimer > 0;
    if (ud.shieldDome.visible) {
      ud.shieldDome.rotation.y += dt * 3.2;
      const pulse = 0.96 + Math.sin(t * 12) * 0.05;
      ud.shieldDome.scale.setScalar(pulse);
    }

    ud.waterBubble.visible = r.bubbleTimer > 0;
    if (ud.waterBubble.visible) {
      const wob = 1 + Math.sin(t * 18) * 0.06;
      ud.waterBubble.scale.set(wob, 2 - wob, wob);
    }

    ud.devilHalo.visible = r.devilTimer > 0;
    if (ud.devilHalo.visible) ud.devilHalo.rotation.y += dt * 5.0;

    ud.ufoGrp.visible = r.ufoTimer > 0;
    if (ud.ufoGrp.visible) {
      ud.ufoGrp.rotation.y += dt * 3.8;
      ud.ufoGrp.position.y = 3.1 + Math.sin(t * 6) * 0.22;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
