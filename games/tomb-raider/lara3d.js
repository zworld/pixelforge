/* 古墓丽影 · 秘鲁遗迹 — 18 关节经典劳拉建模（长麻花辫/双枪枪套/背包/照明弹/全套攀爬翻滚动作）与史前霸王龙/雪狼/巨熊骨骼 */
(function (G) {
  'use strict';
  const TR = (G.TR = G.TR || {});

  const canvasCache = new Map();
  function makeCanvasTex(key, drawFn) {
    let c = canvasCache.get(key);
    if (!c) {
      c = drawFn();
      canvasCache.set(key, c);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 经典劳拉面部手绘贴图（球面 UV 精准布局，英气弯眉与明澈琥珀棕瞳孔） */
  function makeLaraFaceTex() {
    return makeCanvasTex('lara_face', () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');

      const hair = '#4a2515';
      ctx.fillStyle = hair;
      ctx.fillRect(0, 0, 256, 256);

      // 健康小麦阳光肤色脸庞
      const g = ctx.createRadialGradient(128, 128, 10, 128, 134, 56);
      g.addColorStop(0, '#f8d5b8');
      g.addColorStop(0.76, '#e2b18d');
      g.addColorStop(1, '#b88362');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(128, 136, 44, 62, 0, 0, Math.PI * 2);
      ctx.fill();

      // 经典中分刘海发际线（高额不遮眉眼）
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.moveTo(74, 48);
      ctx.lineTo(182, 48);
      ctx.lineTo(182, 86);
      ctx.quadraticCurveTo(154, 72, 128, 84);
      ctx.quadraticCurveTo(102, 72, 74, 86);
      ctx.closePath();
      ctx.fill();

      // 英气挑眉
      ctx.strokeStyle = '#381a0e';
      ctx.lineWidth = 2.6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(104, 118);
      ctx.quadraticCurveTo(114, 112, 123, 117);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(152, 118);
      ctx.quadraticCurveTo(142, 112, 133, 117);
      ctx.stroke();

      // 明亮琥珀棕眼眸 + 高光
      for (const s of [-1, 1]) {
        const ex = 128 + s * 14.5;
        const ey = 132;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ex, ey, 7.5, 5.2, s * 0.04, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#6b3a1e';
        ctx.beginPath();
        ctx.arc(ex, ey, 4.4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#111827';
        ctx.beginPath();
        ctx.arc(ex, ey, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + 1.5, ey - 1.5, 1.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#1f1612';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(ex - s * 7.8, ey);
        ctx.quadraticCurveTo(ex, ey - 6.6, ex + s * 8.2, ey - 1.8);
        ctx.stroke();
      }

      // 鼻梁与自信唇色
      ctx.strokeStyle = 'rgba(130, 82, 56, 0.42)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(128, 136);
      ctx.lineTo(127, 149);
      ctx.lineTo(131, 150);
      ctx.stroke();

      ctx.fillStyle = '#c86066';
      ctx.beginPath();
      ctx.moveTo(119, 164);
      ctx.quadraticCurveTo(128, 159, 137, 164);
      ctx.quadraticCurveTo(128, 171, 119, 164);
      ctx.fill();
      return c;
    });
  }

  /** 霸王龙史前鳞片虎纹皮肤贴图 */
  function makeDinoSkinTex() {
    return makeCanvasTex('trex_skin', () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');
      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, '#365314');
      g.addColorStop(0.55, '#4d6b26');
      g.addColorStop(1, '#a1864d');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = 'rgba(20, 30, 10, 0.45)';
      for (let x = 14; x < 250; x += 28) {
        ctx.beginPath();
        ctx.ellipse(x, 60 + (x % 3) * 20, 8, 52, 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      return c;
    });
  }

  /** 构建经典 9mm 双枪模型 */
  function buildPistolMesh() {
    const g = new THREE.Group();
    const slideMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.88, roughness: 0.22 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.78 });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.052, 0.22), slideMat);
    slide.position.set(0, 0.04, -0.08);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.11, 0.052), gripMat);
    grip.position.set(0, -0.02, 0);
    grip.rotation.x = 0.22;
    const flash = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.095, 0),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.95 })
    );
    flash.scale.set(0.9, 0.9, 2.2);
    flash.position.set(0, 0.045, -0.24);
    flash.visible = false;
    g.add(slide, grip, flash);
    g.userData.flash = flash;
    return g;
  }

  /**
   * 构建 18 关节经典劳拉·克劳馥 (Lara Croft) 3D 骨骼模型（局部正面向 -Z）
   */
  TR.createLaraRig = function () {
    const root = new THREE.Group();

    const tealMat = new THREE.MeshStandardMaterial({ color: 0x139ea6, roughness: 0.56, metalness: 0.08 });
    const shortsMat = new THREE.MeshStandardMaterial({ color: 0x9c7c4e, roughness: 0.72 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x452212, roughness: 0.62, metalness: 0.18 });
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xf0c29e, roughness: 0.54 });
    const faceMat = new THREE.MeshStandardMaterial({ map: makeLaraFaceTex(), roughness: 0.52 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x4a2515, roughness: 0.74 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x3b2012, roughness: 0.75 });
    const sockMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.8 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x1e1b18, roughness: 0.7 });

    const rig = new THREE.Group();
    root.add(rig);

    // ---- 1. 骨盆、卡其探险短裤、武装腰带与双腿枪套 ----
    const pelvis = new THREE.Group();
    pelvis.position.y = 0.88;
    rig.add(pelvis);

    const hips = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.165, 0.24, 14), shortsMat);
    hips.scale.set(1.12, 1, 0.82);
    pelvis.add(hips);

    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.156, 0.156, 0.065, 14), leatherMat);
    belt.position.y = 0.11;
    belt.scale.set(1.12, 1, 0.84);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.068, 0.03), buckleMat);
    buckle.position.set(0, 0.11, -0.14);
    pelvis.add(belt, buckle);

    // 双腿 + 大腿枪套 + 登山靴
    const holsteredGuns = [];
    const makeLeg = (side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.115, -0.06, 0);

      const shortLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.082, 0.075, 0.17, 10), shortsMat);
      shortLeg.position.y = -0.07;
      hip.add(shortLeg);

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.058, 0.34, 10), skinMat);
      thigh.position.y = -0.26;
      hip.add(thigh);

      // 经典大腿皮革枪带与枪套！
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.070, 0.012, 6, 12), leatherMat);
      strap.rotation.x = Math.PI * 0.5;
      strap.position.y = -0.22;
      const holster = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.15, 0.075), leatherMat);
      holster.position.set(side * 0.075, -0.23, 0);
      const holsteredPistol = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.09, 0.055), new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.85 }));
      holsteredPistol.position.set(side * 0.08, -0.15, 0.01);
      hip.add(strap, holster, holsteredPistol);
      holsteredGuns.push(holsteredPistol);

      const knee = new THREE.Group();
      knee.position.y = -0.42;
      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.044, 0.24, 10), skinMat);
      calf.position.y = -0.11;
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.048, 0.07, 10), sockMat);
      sock.position.y = -0.24;
      const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.054, 0.16, 10), bootMat);
      boot.position.y = -0.34;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.075, 0.20), bootMat);
      foot.position.set(0, -0.39, -0.045);
      knee.add(calf, sock, boot, foot);
      hip.add(knee);
      return { hip, knee };
    };

    const legL = makeLeg(-1);
    const legR = makeLeg(1);
    pelvis.add(legL.hip, legR.hip);

    // ---- 2. 上身经典青绿背心 + 标志性棕色皮革探险背包 ----
    const torso = new THREE.Group();
    torso.position.y = 0.13;
    pelvis.add(torso);

    const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.145, 0.132, 0.20, 14), tealMat);
    waist.position.y = 0.10;
    waist.scale.set(1.1, 1, 0.78);
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.145, 0.30, 14), tealMat);
    chest.position.y = 0.33;
    chest.scale.set(1.12, 1, 0.80);
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), skinMat);
    shoulders.position.y = 0.45;
    shoulders.scale.set(1.18, 0.44, 0.76);
    torso.add(waist, chest, shoulders);

    // 劳拉经典小皮背包（背在 +Z 背面！）
    const pack = new THREE.Group();
    pack.position.set(0, 0.32, 0.19);
    const packBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.30, 0.12), leatherMat);
    const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.10, 0.13), leatherMat);
    packFlap.position.y = 0.10;
    const packBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.03), buckleMat);
    packBuckle.position.set(0, 0.05, 0.065);
    pack.add(packBody, packFlap, packBuckle);
    torso.add(pack);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.058, 0.10, 10), skinMat);
    neck.position.y = 0.52;
    torso.add(neck);

    // ---- 3. 头部 + 经典三段物理甩动长麻花辫！ ----
    const headPivot = new THREE.Group();
    headPivot.position.y = 0.58;
    torso.add(headPivot);

    // UV 正面原本在 +X，需要面向 -Z，旋转 +PI/2！(cos(PI/2)=0, -sin(PI/2)=-1 -> (1,0,0) -> (0,0,-1))
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.155, 18, 14), faceMat);
    headMesh.scale.set(0.92, 1.06, 0.96);
    headMesh.position.y = 0.13;
    headMesh.rotation.y = Math.PI * 0.5;
    headPivot.add(headMesh);

    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.163, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMat);
    hairCap.position.set(0, 0.16, 0.02);
    hairCap.rotation.x = 0.58; // 后倾覆盖后脑 (+Z)，绝不遮挡正面 (-Z) 眉眼！
    headPivot.add(hairCap);

    // 3 段铰接甩动长麻花辫（向后垂于 +Z 背包之上！）
    const braid1 = new THREE.Group();
    braid1.position.set(0, 0.12, 0.15);
    const bMesh1 = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.038, 0.22, 8), hairMat);
    bMesh1.position.y = -0.11;
    braid1.add(bMesh1);

    const braid2 = new THREE.Group();
    braid2.position.y = -0.21;
    const bMesh2 = new THREE.Mesh(new THREE.CylinderGeometry(0.036, 0.028, 0.22, 8), hairMat);
    bMesh2.position.y = -0.11;
    braid2.add(bMesh2);

    const braid3 = new THREE.Group();
    braid3.position.y = -0.21;
    const bMesh3 = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.18, 8), hairMat);
    bMesh3.position.y = -0.09;
    bMesh3.rotation.x = Math.PI;
    const hairTie = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.008, 6, 10), new THREE.MeshBasicMaterial({ color: 0xf43f5e }));
    hairTie.rotation.x = Math.PI * 0.5;
    braid3.add(bMesh3, hairTie);

    braid2.add(braid3);
    braid1.add(braid2);
    headPivot.add(braid1);

    // ---- 4. 双节可动臂 + 露指手套 + 经典双枪 + 绿色照明弹 ----
    const makeArm = (side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.22, 0.44, 0);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.040, 0.27, 10), skinMat);
      upper.position.y = -0.135;
      shoulder.add(upper);

      const elbow = new THREE.Group();
      elbow.position.y = -0.265;
      const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.039, 0.032, 0.25, 10), skinMat);
      fore.position.y = -0.125;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 8, 8), gloveMat);
      hand.position.y = -0.26;
      const pistol = buildPistolMesh();
      pistol.position.set(0, -0.27, -0.03);
      pistol.rotation.x = -Math.PI * 0.48;
      pistol.visible = false;
      elbow.add(fore, hand, pistol);
      shoulder.add(elbow);
      torso.add(shoulder);
      return { shoulder, elbow, pistol };
    };

    const armL = makeArm(-1);
    const armR = makeArm(1);

    // 绿色化学照明弹（挂于左手，点亮黑暗墓室！）
    const flareMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    flareMesh.position.set(0, -0.27, -0.06);
    flareMesh.visible = false;
    armL.elbow.add(flareMesh);

    const flareLight = new THREE.PointLight(0x4ade80, 0, 14);
    flareLight.position.set(0, 1.35, -0.4);
    root.add(flareLight);

    const gunLight = new THREE.PointLight(0xfef08a, 0, 7);
    gunLight.position.set(0, 1.35, -0.65);
    root.add(gunLight);

    root.userData = {
      rig, pelvis, torso, headPivot,
      braid1, braid2, braid3,
      armL, armR, legL, legR,
      holsteredGuns, flareMesh, flareLight, gunLight,
      runPhase: 0,
    };
    return root;
  };

  /** 实时驱动劳拉 18 关节全身动作：奔跑/跳跃/抓崖/横移/翻身上台/后空翻翻滚/推石/拉杆/双枪瞄准与麻花辫甩动 */
  TR.animateLara = function (mesh, s, t, dt) {
    const ud = mesh.userData;
    const spd = Math.hypot(s.vx, s.vz);
    ud.runPhase += dt * (2.5 + spd * 1.95);
    const rp = ud.runPhase;
    const moveBlend = Math.min(1, spd / 5.5);

    let rigPitch = 0, rigRoll = 0, rigY = 0;
    let pelvisY = 0.88;
    let torsoPitch = 0, torsoYaw = 0;
    let lLegX = 0, rLegX = 0, lKnee = 0.08, rKnee = 0.08;
    let lShX = 0.08, rShX = 0.08, lShZ = -0.14, rShZ = 0.14, lElX = 0.24, rElX = 0.24;

    if (s.action === 'hang') {
      // 悬崖双手抓缘悬吊姿态（经典 Tomb Raider Ledge Hang）
      pelvisY = 0.82;
      const shim = Math.sin(t * 10) * (Math.abs(s.vx) + Math.abs(s.vz) > 0.05 ? 0.18 : 0.03);
      lShX = 2.95 + shim; rShX = 2.95 - shim;
      lShZ = -0.22; rShZ = 0.22;
      lElX = 0.18; rElX = 0.18;
      lLegX = 0.22; rLegX = 0.12;
      lKnee = -0.45; rKnee = -0.35;
    } else if (s.action === 'climb') {
      // 翻身上台撑臂腾跃
      pelvisY = 0.88;
      torsoPitch = -0.42;
      lShX = 1.4; rShX = 1.4; lElX = 0.8; rElX = 0.8;
      lLegX = 0.85; rLegX = -0.2; lKnee = -1.1; rKnee = -0.4;
    } else if (s.action === 'roll') {
      // 经典 360° 体操翻滚 / 后空翻 / 侧空翻！
      const p = 1 - s.rollTimer / 0.36;
      rigY = Math.sin(p * Math.PI) * 0.65;
      if (s.rollKind === 'back') rigPitch = p * Math.PI * 2;
      else if (s.rollKind === 'left') rigRoll = p * Math.PI * 2;
      else if (s.rollKind === 'right') rigRoll = -p * Math.PI * 2;
      else rigPitch = -p * Math.PI * 2;
      lLegX = 0.65; rLegX = 0.65; lKnee = -1.2; rKnee = -1.2;
      lShX = 1.1; rShX = 1.1;
    } else if (s.action === 'push') {
      // 双手抵石前倾推印加石块！
      pelvisY = 0.78;
      torsoPitch = -0.46;
      lShX = 1.45; rShX = 1.45; lShZ = -0.1; rShZ = 0.1;
      lElX = 0.15; rElX = 0.15;
      lLegX = Math.sin(t * 7) * 0.45;
      rLegX = -Math.sin(t * 7) * 0.45;
      lKnee = -0.45; rKnee = -0.45;
    } else if (s.action === 'lever' || s.leverTimer > 0) {
      torsoPitch = -0.15;
      rShX = 2.2 - (1 - s.leverTimer / 0.5) * 1.6;
      rElX = 0.3;
    } else if (!s.onGround) {
      // 腾空跃姿（前腿微收、后腿舒展）
      torsoPitch = -0.16;
      lLegX = 0.62; rLegX = -0.48;
      lKnee = -0.78; rKnee = -0.45;
      lShX = 1.05; rShX = 0.85; lShZ = -0.35; rShZ = 0.35;
    } else if (moveBlend > 0.08) {
      // 矫健奔跑步态
      pelvisY = 0.86 + Math.abs(Math.sin(rp)) * 0.055 * moveBlend;
      torsoPitch = -0.14 * moveBlend;
      torsoYaw = Math.sin(rp) * 0.14 * moveBlend;
      lLegX = Math.sin(rp) * 0.78 * moveBlend;
      rLegX = -Math.sin(rp) * 0.78 * moveBlend;
      lKnee = -Math.max(0, -Math.cos(rp)) * 0.95 * moveBlend - 0.10;
      rKnee = -Math.max(0, Math.cos(rp)) * 0.95 * moveBlend - 0.10;
      lShX = -Math.sin(rp) * 0.68 * moveBlend;
      rShX = Math.sin(rp) * 0.68 * moveBlend;
      lElX = 0.55; rElX = 0.55;
    } else {
      // 待机呼吸
      pelvisY = 0.88 + Math.sin(t * 2.4) * 0.015;
      lShX = 0.05; rShX = 0.05;
      lElX = 0.22; rElX = 0.22;
    }

    // 拔出双枪瞄准射击覆盖双臂姿态（即使奔跑/空翻也能潇洒双枪齐射！）
    const gunsOut = s.weaponsDrawn && s.action !== 'hang' && s.action !== 'climb' && s.action !== 'push';
    if (gunsOut) {
      const recoilL = s.muzzleL > 0 ? 0.24 : 0;
      const recoilR = s.muzzleR > 0 ? 0.24 : 0;
      lShX = 1.52 + recoilL; rShX = 1.52 + recoilR;
      lShZ = -0.08; rShZ = 0.08;
      lElX = 0.08; rElX = 0.08;
    }

    // 显示/隐藏手中双枪与腿部枪套里的手枪
    ud.armL.pistol.visible = gunsOut;
    ud.armR.pistol.visible = gunsOut;
    ud.armL.pistol.userData.flash.visible = s.muzzleL > 0;
    ud.armR.pistol.userData.flash.visible = s.muzzleR > 0;
    for (const hg of ud.holsteredGuns) hg.visible = !gunsOut;

    ud.gunLight.intensity = (s.muzzleL > 0 || s.muzzleR > 0) ? 5.5 : 0;
    const flareOn = s.flareTimer > 0;
    ud.flareMesh.visible = flareOn && !gunsOut;
    ud.flareLight.intensity = flareOn ? (2.6 + Math.sin(t * 22) * 0.4) : 0;

    // 丝滑骨骼插值
    const k = Math.min(1, dt * 18);
    ud.rig.position.y += (rigY - ud.rig.position.y) * k;
    ud.rig.rotation.x = s.action === 'roll' ? rigPitch : ud.rig.rotation.x * (1 - k);
    ud.rig.rotation.z = s.action === 'roll' ? rigRoll : ud.rig.rotation.z * (1 - k);
    ud.pelvis.position.y += (pelvisY - ud.pelvis.position.y) * k;
    ud.torso.rotation.x += (torsoPitch - ud.torso.rotation.x) * k;
    ud.torso.rotation.y += (torsoYaw - ud.torso.rotation.y) * k;

    ud.legL.hip.rotation.x += (lLegX - ud.legL.hip.rotation.x) * k;
    ud.legR.hip.rotation.x += (rLegX - ud.legR.hip.rotation.x) * k;
    ud.legL.knee.rotation.x += (lKnee - ud.legL.knee.rotation.x) * k;
    ud.legR.knee.rotation.x += (rKnee - ud.legR.knee.rotation.x) * k;

    ud.armL.shoulder.rotation.x += (lShX - ud.armL.shoulder.rotation.x) * k;
    ud.armR.shoulder.rotation.x += (rShX - ud.armR.shoulder.rotation.x) * k;
    ud.armL.shoulder.rotation.z += (lShZ - ud.armL.shoulder.rotation.z) * k;
    ud.armR.shoulder.rotation.z += (rShZ - ud.armR.shoulder.rotation.z) * k;
    ud.armL.elbow.rotation.x += (lElX - ud.armL.elbow.rotation.x) * k;
    ud.armR.elbow.rotation.x += (rElX - ud.armR.elbow.rotation.x) * k;

    // 标志性三段长麻花辫动态甩动！
    const whip = 0.22 + moveBlend * 0.58 + (s.action === 'jump' ? 0.45 : 0);
    ud.braid1.rotation.x = whip + Math.sin(rp) * 0.14;
    ud.braid1.rotation.z = Math.cos(rp * 0.5) * 0.24 * (0.3 + moveBlend);
    ud.braid2.rotation.x = 0.16 + Math.sin(rp - 0.8) * 0.24;
    ud.braid2.rotation.z = Math.cos(rp * 0.5 - 0.8) * 0.30 * (0.3 + moveBlend);
    ud.braid3.rotation.x = 0.18 + Math.sin(rp - 1.5) * 0.32;
  };

  /** 构建雪狼 / 洞穴巨熊 / 史前霸王龙 Boss 3D 骨骼模型（正面向 +Z） */
  TR.createEnemyRig = function (e) {
    const root = new THREE.Group();

    if (e.kind === 'trex') {
      // ---- 史前霸王龙 T-Rex（4.5m 高，巨口咬合 + 粗壮双腿 + 3 段巨尾） ----
      const skinMat = new THREE.MeshStandardMaterial({ map: makeDinoSkinTex(), roughness: 0.62 });
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xb59b65, roughness: 0.72 });
      const toothMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.3 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

      const bodyPivot = new THREE.Group();
      bodyPivot.position.y = 2.35;
      root.add(bodyPivot);

      const torso = new THREE.Mesh(new THREE.SphereGeometry(1.15, 16, 12), skinMat);
      torso.scale.set(0.88, 0.96, 1.72);
      bodyPivot.add(torso);
      const belly = new THREE.Mesh(new THREE.SphereGeometry(0.95, 12, 10), bellyMat);
      belly.position.set(0, -0.32, 0.25);
      belly.scale.set(0.75, 0.65, 1.42);
      bodyPivot.add(belly);

      // 粗壮颈部与张合巨颅
      const neckPivot = new THREE.Group();
      neckPivot.position.set(0, 0.55, 1.55);
      const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.54, 0.72, 1.35, 12), skinMat);
      neck.rotation.x = 0.55;
      neck.position.set(0, 0.45, 0.38);
      neckPivot.add(neck);

      const headPivot = new THREE.Group();
      headPivot.position.set(0, 1.05, 0.85);
      const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.66, 1.65), skinMat);
      upperJaw.position.set(0, 0.25, 0.55);
      headPivot.add(upperJaw);

      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 8), eyeMat);
        eye.position.set(s * 0.45, 0.38, 0.28);
        headPivot.add(eye);
        for (let k = 0; k < 4; k++) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.20, 5), toothMat);
          tooth.rotation.x = Math.PI;
          tooth.position.set(s * 0.34, -0.10, 0.45 + k * 0.28);
          headPivot.add(tooth);
        }
      }

      const jawPivot = new THREE.Group();
      jawPivot.position.set(0, -0.06, 0.05);
      const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.30, 1.48), bellyMat);
      lowerJaw.position.set(0, -0.12, 0.52);
      jawPivot.add(lowerJaw);
      headPivot.add(jawPivot);
      neckPivot.add(headPivot);
      bodyPivot.add(neckPivot);

      // 经典短小霸王龙前爪
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.08, 0.65, 8), skinMat);
        arm.position.set(s * 0.76, -0.35, 1.25);
        arm.rotation.x = -0.9;
        bodyPivot.add(arm);
      }

      // 3 段巨型平衡长尾
      const tail1 = new THREE.Group();
      tail1.position.set(0, 0.15, -1.65);
      const t1 = new THREE.Mesh(new THREE.ConeGeometry(0.68, 2.2, 10), skinMat);
      t1.rotation.x = -Math.PI * 0.5;
      t1.position.z = -1.0;
      tail1.add(t1);
      const tail2 = new THREE.Group();
      tail2.position.z = -1.95;
      const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.42, 2.2, 10), skinMat);
      t2.rotation.x = -Math.PI * 0.5;
      t2.position.z = -1.0;
      tail2.add(t2);
      tail1.add(tail2);
      bodyPivot.add(tail1);

      // 强壮双足后腿
      const makeDinoLeg = (side) => {
        const hip = new THREE.Group();
        hip.position.set(side * 0.88, 2.15, -0.1);
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.34, 1.25, 10), skinMat);
        thigh.position.y = -0.58;
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.20, 1.15, 10), skinMat);
        shin.position.set(0, -1.55, -0.12);
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.22, 0.92), skinMat);
        foot.position.set(0, -2.06, 0.15);
        hip.add(thigh, shin, foot);
        root.add(hip);
        return hip;
      };
      const legL = makeDinoLeg(-1);
      const legR = makeDinoLeg(1);

      root.userData = { kind: 'trex', bodyPivot, neckPivot, jawPivot, tail1, tail2, legL, legR, mainMat: skinMat, stride: 0 };
      return root;
    }

    // ---- 四足掠食者：秘鲁雪狼 (wolf) / 古殿巨熊 (bear) ----
    const isBear = e.kind === 'bear';
    const sc = isBear ? 1.52 : 1.0;
    const furColor = isBear ? 0x5c3a21 : 0x94a3b8;
    const bellyColor = isBear ? 0x7c5334 : 0xe2e8f0;
    const furMat = new THREE.MeshStandardMaterial({ color: furColor, roughness: 0.78 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: bellyColor, roughness: 0.82 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: isBear ? 0xf97316 : 0xfef08a });

    const body = new THREE.Group();
    body.scale.setScalar(sc);
    body.position.y = 0.62 * sc;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.22, 0.96, 10), furMat);
    torso.rotation.x = Math.PI * 0.5;
    torso.scale.set(isBear ? 1.35 : 0.95, 1, 1.05);
    body.add(torso);

    const head = new THREE.Group();
    head.position.set(0, 0.16, 0.56);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.20, 12, 10), furMat);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.105, 0.24, 8), bellyMat);
    snout.rotation.x = Math.PI * 0.5;
    snout.position.set(0, -0.04, 0.19);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 6), new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35 }));
    nose.position.set(0, -0.02, 0.31);
    head.add(skull, snout, nose);
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(isBear ? new THREE.SphereGeometry(0.065, 6, 6) : new THREE.ConeGeometry(0.05, 0.14, 5), furMat);
      ear.position.set(s * 0.12, 0.19, 0.0);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 6, 6), eyeMat);
      eye.position.set(s * 0.085, 0.04, 0.16);
      head.add(ear, eye);
    }
    body.add(head);

    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.075, isBear ? 0.18 : 0.48, 6), bellyMat);
    tail.position.set(0, 0.06, -0.62);
    tail.rotation.x = -Math.PI * 0.35;
    body.add(tail);

    const legs = [];
    for (const [lx, lz] of [[-0.18, 0.34], [0.18, 0.34], [-0.18, -0.34], [0.18, -0.34]]) {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.08, lz);
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.052, 0.56, 8), furMat);
      limb.position.y = -0.28;
      leg.add(limb);
      body.add(leg);
      legs.push(leg);
    }

    // 小怪头顶迷你血条
    const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.10), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
    hpBg.position.y = e.height + 0.35;
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.90, 0.06), new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide }));
    hpFill.position.z = 0.01;
    hpBg.add(hpFill);
    root.add(hpBg);

    root.userData = { kind: e.kind, body, head, tail, legs, mainMat: furMat, hpBg, hpFill, stride: 0 };
    return root;
  };

  /** 实时驱动雪狼 / 巨熊 / 霸王龙动画 */
  TR.animateEnemy = function (mesh, e, t, dt, cameraPos) {
    const ud = mesh.userData;
    const spd = Math.hypot(e.vx || 0, e.vz || 0);
    ud.stride += dt * (2.5 + spd * 1.8);
    ud.mainMat.emissive.setHex(e.hitFlash > 0 ? 0xfca5a5 : (e.state === 'windup' ? 0x991b1b : 0x000000));
    ud.mainMat.emissiveIntensity = e.hitFlash > 0 ? 0.34 : (e.state === 'windup' ? 0.32 : 0);

    if (ud.kind === 'trex') {
      const moveB = Math.min(1, spd / 4.0);
      ud.legL.rotation.x = Math.sin(ud.stride) * 0.55 * moveB;
      ud.legR.rotation.x = -Math.sin(ud.stride) * 0.55 * moveB;
      ud.bodyPivot.position.y = 2.35 + Math.abs(Math.sin(ud.stride)) * 0.24 * moveB;
      ud.bodyPivot.rotation.x = e.state === 'windup' ? -0.28 : (e.state === 'lunge' ? 0.25 : 0.06);
      ud.jawPivot.rotation.x = (e.state === 'windup' || e.state === 'lunge') ? 0.68 : (0.12 + Math.sin(t * 3.5) * 0.08);
      ud.tail1.rotation.y = Math.sin(t * 3.2) * 0.32;
      ud.tail2.rotation.y = Math.sin(t * 3.2 - 0.8) * 0.42;
      return;
    }

    const moveB = Math.min(1, spd / 3.5);
    ud.legs[0].rotation.x = Math.sin(ud.stride) * 0.65 * moveB;
    ud.legs[1].rotation.x = -Math.sin(ud.stride) * 0.65 * moveB;
    ud.legs[2].rotation.x = -Math.sin(ud.stride) * 0.65 * moveB;
    ud.legs[3].rotation.x = Math.sin(ud.stride) * 0.65 * moveB;
    ud.body.rotation.x = e.state === 'windup' ? -0.35 : (e.state === 'lunge' ? 0.22 : 0);
    ud.tail.rotation.y = Math.sin(t * 7) * 0.25;

    if (ud.hpBg && ud.hpFill && cameraPos) {
      ud.hpBg.lookAt(cameraPos);
      const r = Math.max(0.01, e.hp / e.maxHp);
      ud.hpFill.scale.x = r;
      ud.hpFill.position.x = -(1 - r) * 0.45;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
