/* 古墓丽影 · 秘鲁遗迹 — 3A 级有机雕塑骨骼建模（Lathe/Capsule 曲面劳拉 + 攀岩斧/背带背包/四节甩辫 + 鳞片法线霸王龙/雪狼/巨熊） */
(function (G) {
  'use strict';
  const TR = (G.TR = G.TR || {});
  const PBR = G.Studio && G.Studio.PBR;

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

  function enableShadows(root) {
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }

  /** 512×512 电影感劳拉面部手绘贴图（立体光影肤质、弯眉、多层虹膜高光、自然唇彩） */
  function makeLaraFaceTex() {
    return makeCanvasTex('lara_face_512', () => {
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 512;
      const ctx = c.getContext('2d');

      const hair = '#3e1f11';
      ctx.fillStyle = hair;
      ctx.fillRect(0, 0, 512, 512);

      // 健康阳光肌底 + 柔和面部明暗过渡
      const g = ctx.createRadialGradient(256, 252, 22, 256, 268, 114);
      g.addColorStop(0, '#fae0c8');
      g.addColorStop(0.68, '#e3b28e');
      g.addColorStop(1, '#b57e5e');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(256, 272, 88, 124, 0, 0, Math.PI * 2);
      ctx.fill();

      // 颊侧自然微红与阴影立体感
      for (const cx of [214, 298]) {
        const bg = ctx.createRadialGradient(cx, 304, 4, cx, 304, 24);
        bg.addColorStop(0, 'rgba(220, 112, 108, 0.25)');
        bg.addColorStop(1, 'rgba(220, 112, 108, 0)');
        ctx.fillStyle = bg;
        ctx.beginPath();
        ctx.arc(cx, 304, 24, 0, Math.PI * 2);
        ctx.fill();
      }

      // 分层刘海发际线（高额留白，完整展露眉眼）
      ctx.fillStyle = hair;
      ctx.beginPath();
      ctx.moveTo(148, 96);
      ctx.lineTo(364, 96);
      ctx.lineTo(364, 174);
      ctx.quadraticCurveTo(312, 140, 264, 168);
      ctx.quadraticCurveTo(256, 152, 248, 168);
      ctx.quadraticCurveTo(200, 140, 148, 174);
      ctx.closePath();
      ctx.fill();

      // 细腻眉弓与英气挑眉
      ctx.strokeStyle = '#33170b';
      ctx.lineWidth = 5.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(206, 236);
      ctx.quadraticCurveTo(226, 222, 246, 232);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(306, 236);
      ctx.quadraticCurveTo(286, 222, 266, 232);
      ctx.stroke();

      // 精细琥珀棕眼眸（眼眶微影 + 眼白 + 双层虹膜 + 瞳孔 + 双星高光 + 睫毛线）
      for (const s of [-1, 1]) {
        const ex = 256 + s * 29;
        const ey = 264;
        ctx.fillStyle = 'rgba(130, 82, 58, 0.24)';
        ctx.beginPath();
        ctx.ellipse(ex, ey - 3, 18, 12, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fffaf6';
        ctx.beginPath();
        ctx.ellipse(ex, ey, 15.2, 10.2, s * 0.05, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#5c2d14';
        ctx.beginPath();
        ctx.arc(ex, ey, 8.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#8b4e27';
        ctx.beginPath();
        ctx.arc(ex, ey + 1, 6.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0d0d10';
        ctx.beginPath();
        ctx.arc(ex, ey, 4.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + 3.2, ey - 3.0, 3.0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex - 2.6, ey + 2.6, 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#1c1410';
        ctx.lineWidth = 4.4;
        ctx.beginPath();
        ctx.moveTo(ex - s * 15.8, ey + 0.5);
        ctx.quadraticCurveTo(ex, ey - 13.4, ex + s * 16.8, ey - 3.6);
        ctx.stroke();
      }

      // 鼻梁高光与鼻翼微影
      ctx.strokeStyle = 'rgba(128, 80, 56, 0.36)';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(256, 270);
      ctx.lineTo(253, 298);
      ctx.lineTo(262, 300);
      ctx.stroke();

      // 立体自然玫瑰唇色
      ctx.fillStyle = '#c45b61';
      ctx.beginPath();
      ctx.moveTo(238, 328);
      ctx.quadraticCurveTo(256, 318, 274, 328);
      ctx.quadraticCurveTo(256, 343, 238, 328);
      ctx.fill();
      ctx.fillStyle = 'rgba(255, 220, 220, 0.32)';
      ctx.beginPath();
      ctx.ellipse(256, 332, 8, 2.5, 0, 0, Math.PI * 2);
      ctx.fill();
      return c;
    });
  }

  /** 劳拉青绿罗纹针织战术背心 PBR 材质组（Albedo + Normal + Roughness） */
  function makeTealFabricPBR() {
    if (!PBR) return { color: 0x139ea6, roughness: 0.62 };
    const maps = PBR.makePBRTextures('lara_teal_pbr', 256, (a, h, r, s) => {
      a.fillStyle = '#13969e';
      a.fillRect(0, 0, s, s);
      h.fillStyle = '#808080';
      h.fillRect(0, 0, s, s);
      r.fillStyle = '#b8b8b8';
      r.fillRect(0, 0, s, s);
      for (let x = 0; x < s; x += 6) {
        a.fillStyle = x % 12 === 0 ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)';
        a.fillRect(x, 0, 3, s);
        h.fillStyle = x % 12 === 0 ? '#a8a8a8' : '#585858';
        h.fillRect(x, 0, 3, s);
      }
      // 针脚接缝与磨损污渍层次（《暗影/崛起》探险质感）
      a.fillStyle = 'rgba(84, 62, 42, 0.14)';
      for (let i = 0; i < 24; i++) {
        a.beginPath();
        a.arc((i * 47) % s, s - 28 + (i % 5) * 6, 12 + (i % 4) * 5, 0, Math.PI * 2);
        a.fill();
      }
    }, { normalStrength: 1.6 });
    return { ...maps, roughness: 0.78, metalness: 0.04, normalScale: new THREE.Vector2(0.55, 0.55) };
  }

  /** 史前霸王龙鳞片虎纹 PBR 材质组（带凹凸法线鳞甲与皮肤粗糙度变化！） */
  function makeDinoPBR() {
    if (!PBR) return { color: 0x456224, roughness: 0.62 };
    const maps = PBR.makePBRTextures('trex_scales_pbr', 512, (a, h, r, s) => {
      const g = a.createLinearGradient(0, 0, 0, s);
      g.addColorStop(0, '#2c4212');
      g.addColorStop(0.5, '#466122');
      g.addColorStop(1, '#9d824b');
      a.fillStyle = g;
      a.fillRect(0, 0, s, s);

      h.fillStyle = '#606060';
      h.fillRect(0, 0, s, s);
      r.fillStyle = '#a8a8a8';
      r.fillRect(0, 0, s, s);

      // 深色史前虎斑纹
      a.fillStyle = 'rgba(18, 28, 9, 0.52)';
      for (let x = 22; x < s; x += 48) {
        a.beginPath();
        a.ellipse(x, 120 + (x % 3) * 45, 14, 110, 0.22, 0, Math.PI * 2);
        a.fill();
      }
      // 密布立体爬行动物鳞片高度场与光泽变化
      for (let y = 0; y < s; y += 16) {
        const off = ((y / 16) % 2) * 8;
        for (let x = 0; x < s; x += 16) {
          h.fillStyle = '#d4d4d4';
          h.beginPath();
          h.arc(x + off, y, 6.2, 0, Math.PI * 2);
          h.fill();
          a.strokeStyle = 'rgba(10, 16, 6, 0.22)';
          a.lineWidth = 1.2;
          a.beginPath();
          a.arc(x + off, y, 6.5, 0, Math.PI * 2);
          a.stroke();
          r.fillStyle = (x + y) % 32 === 0 ? '#787878' : '#b8b8b8';
          r.fillRect(x + off - 4, y - 4, 8, 8);
        }
      }
    }, { normalStrength: 3.0 });
    return { ...maps, roughness: 0.72, metalness: 0.08, normalScale: new THREE.Vector2(1.1, 1.1) };
  }

  /** 野兽毛皮质感 PBR 贴图（雪狼 / 巨熊） */
  function makeFurPBR(key, baseHex, darkHex) {
    if (!PBR) return { color: baseHex, roughness: 0.85 };
    const maps = PBR.makePBRTextures('fur_' + key, 256, (a, h, r, s) => {
      a.fillStyle = baseHex;
      a.fillRect(0, 0, s, s);
      h.fillStyle = '#707070';
      h.fillRect(0, 0, s, s);
      r.fillStyle = '#d8d8d8';
      r.fillRect(0, 0, s, s);
      for (let i = 0; i < 600; i++) {
        const x = (i * 53) % s;
        const y = (i * 97) % s;
        a.strokeStyle = i % 3 === 0 ? darkHex : 'rgba(255,255,255,0.12)';
        a.lineWidth = 2;
        a.beginPath();
        a.moveTo(x, y);
        a.lineTo(x + 2, y + 14);
        a.stroke();
        h.strokeStyle = i % 2 === 0 ? '#b4b4b4' : '#404040';
        h.beginPath();
        h.moveTo(x, y);
        h.lineTo(x + 2, y + 14);
        h.stroke();
      }
    }, { normalStrength: 2.2 });
    return { ...maps, roughness: 0.88, metalness: 0.02, normalScale: new THREE.Vector2(0.85, 0.85) };
  }

  /** 构建精细金属 9mm 经典双枪 */
  function buildPistolMesh() {
    const g = new THREE.Group();
    const slideMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.16 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.72, metalness: 0.2 });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.048, 0.22), slideMat);
    slide.position.set(0, 0.04, -0.08);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.24, 8), gripMat);
    barrel.rotation.x = Math.PI * 0.5;
    barrel.position.set(0, 0.042, -0.09);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.11, 0.052), gripMat);
    grip.position.set(0, -0.02, 0);
    grip.rotation.x = 0.24;
    const flash = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.11, 0),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.96 })
    );
    flash.scale.set(0.95, 0.95, 2.4);
    flash.position.set(0, 0.045, -0.25);
    flash.visible = false;
    g.add(slide, barrel, grip, flash);
    g.userData.flash = flash;
    return g;
  }

  /**
   * 3A 级有机雕塑 18 关节劳拉·克劳馥 (Lara Croft) 模型
   * 结合经典双枪/青绿背心/甩动长辫 + 现代重启版攀岩斧/皮革背带细节！
   */
  TR.createLaraRig = function () {
    const root = new THREE.Group();

    const tealMat = new THREE.MeshStandardMaterial(makeTealFabricPBR());
    const shortsMat = new THREE.MeshStandardMaterial({ color: 0x9b7a4c, roughness: 0.78, metalness: 0.04 });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x462313, roughness: 0.52, metalness: 0.22 });
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.90, roughness: 0.22 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.92, roughness: 0.20 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xebb994, roughness: 0.50, metalness: 0.02 });
    const faceMat = new THREE.MeshStandardMaterial({ map: makeLaraFaceTex(), roughness: 0.48, metalness: 0.02 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x3e1f11, roughness: 0.72, metalness: 0.08 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x361d10, roughness: 0.68, metalness: 0.12 });
    const sockMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.85 });
    const gloveMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.65, metalness: 0.12 });

    const rig = new THREE.Group();
    root.add(rig);

    // ---- 1. 有机雕塑骨盆、卡其短裤、武装腰带、攀岩斧与双腿枪套 ----
    const pelvis = new THREE.Group();
    pelvis.position.y = 0.88;
    rig.add(pelvis);

    const hipProfile = [
      new THREE.Vector2(0.145, -0.12),
      new THREE.Vector2(0.168, -0.02),
      new THREE.Vector2(0.155, 0.08),
      new THREE.Vector2(0.132, 0.13),
    ];
    const hips = new THREE.Mesh(new THREE.LatheGeometry(hipProfile, 16), shortsMat);
    hips.scale.set(1.12, 1, 0.82);
    pelvis.add(hips);

    // 武装皮带 + 铜扣 + 腰包 + 现代劳拉标志性腰间攀岩斧 (Climbing Axe)！
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.148, 0.156, 0.062, 16), leatherMat);
    belt.position.y = 0.11;
    belt.scale.set(1.12, 1, 0.84);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.078, 0.066, 0.032), buckleMat);
    buckle.position.set(0, 0.11, -0.138);
    pelvis.add(belt, buckle);

    for (const s of [-1, 1]) {
      const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.085, 0.052), leatherMat);
      pouch.position.set(s * 0.15, 0.09, -0.05);
      pelvis.add(pouch);
    }

    // 攀岩斧挂于右侧后腰
    const axeGrp = new THREE.Group();
    axeGrp.position.set(0.14, 0.06, 0.11);
    axeGrp.rotation.set(0.2, 0.3, -0.45);
    const axeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.34, 8), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 }));
    const axePick = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.032, 0.018), steelMat);
    axePick.position.y = 0.15;
    axeGrp.add(axeHandle, axePick);
    pelvis.add(axeGrp);

    // 无缝 CapsuleGeometry 双腿 + 大腿枪套 + 登山靴
    const holsteredGuns = [];
    const makeLeg = (side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.112, -0.05, 0);

      const shortLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.084, 0.076, 0.16, 12), shortsMat);
      shortLeg.position.y = -0.06;
      hip.add(shortLeg);

      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.064, 0.25, 6, 12), skinMat);
      thigh.position.y = -0.24;
      hip.add(thigh);

      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.068, 0.012, 6, 14), leatherMat);
      strap.rotation.x = Math.PI * 0.5;
      strap.position.y = -0.22;
      const holster = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.155, 0.078), leatherMat);
      holster.position.set(side * 0.074, -0.23, 0);
      const holsteredPistol = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.092, 0.056), steelMat);
      holsteredPistol.position.set(side * 0.080, -0.15, 0.01);
      hip.add(strap, holster, holsteredPistol);
      holsteredGuns.push(holsteredPistol);

      const knee = new THREE.Group();
      knee.position.y = -0.41;
      const calf = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.20, 6, 12), skinMat);
      calf.position.y = -0.13;
      const sock = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.049, 0.072, 12), sockMat);
      sock.position.y = -0.24;
      const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.056, 0.16, 12), bootMat);
      boot.position.y = -0.34;
      const foot = new THREE.Mesh(new THREE.CapsuleGeometry(0.044, 0.12, 5, 10), bootMat);
      foot.rotation.x = Math.PI * 0.5;
      foot.position.set(0, -0.395, -0.045);
      knee.add(calf, sock, boot, foot);
      hip.add(knee);
      return { hip, knee };
    };

    const legL = makeLeg(-1);
    const legR = makeLeg(1);
    pelvis.add(legL.hip, legR.hip);

    // ---- 2. LatheGeometry 有机运动躯干 + 经典双肩背带小皮背包 ----
    const torso = new THREE.Group();
    torso.position.y = 0.12;
    pelvis.add(torso);

    const torsoProfile = [
      new THREE.Vector2(0.132, 0.0),
      new THREE.Vector2(0.124, 0.12),
      new THREE.Vector2(0.152, 0.25),
      new THREE.Vector2(0.184, 0.37),
      new THREE.Vector2(0.172, 0.45),
      new THREE.Vector2(0.085, 0.49),
    ];
    const upperBody = new THREE.Mesh(new THREE.LatheGeometry(torsoProfile, 18), tealMat);
    upperBody.scale.set(1.12, 1, 0.80);
    torso.add(upperBody);

    const collarbone = new THREE.Mesh(new THREE.SphereGeometry(0.185, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.46), skinMat);
    collarbone.position.y = 0.44;
    collarbone.scale.set(1.16, 0.42, 0.74);
    torso.add(collarbone);

    // 双肩真皮背包带（绕过肩部，细节拉满！）
    for (const s of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.TorusGeometry(0.115, 0.015, 6, 14), leatherMat);
      strap.position.set(s * 0.115, 0.36, 0.04);
      strap.rotation.y = Math.PI * 0.5;
      strap.scale.set(1.1, 1.35, 1);
      torso.add(strap);
    }

    // 精致探险皮背包（含黄铜搭扣与底部绳卷）
    const pack = new THREE.Group();
    pack.position.set(0, 0.31, 0.185);
    const packBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.29, 0.125), leatherMat);
    const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.10, 0.135), leatherMat);
    packFlap.position.y = 0.10;
    const packBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.048, 0.03), buckleMat);
    packBuckle.position.set(0, 0.045, 0.068);
    const ropeCoil = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 10), shortsMat);
    ropeCoil.rotation.z = Math.PI * 0.5;
    ropeCoil.position.set(0, -0.16, 0);
    pack.add(packBody, packFlap, packBuckle, ropeCoil);
    torso.add(pack);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.058, 0.11, 12), skinMat);
    neck.position.y = 0.52;
    torso.add(neck);

    // ---- 3. 头部 + 立体垂鬓 + 4 节珠链感物理甩动长麻花辫！ ----
    const headPivot = new THREE.Group();
    headPivot.position.y = 0.58;
    torso.add(headPivot);

    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.155, 22, 18), faceMat);
    headMesh.scale.set(0.92, 1.07, 0.96);
    headMesh.position.y = 0.13;
    headMesh.rotation.y = Math.PI * 0.5;
    headPivot.add(headMesh);

    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.164, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMat);
    hairCap.position.set(0, 0.16, 0.022);
    hairCap.rotation.x = 0.58;
    headPivot.add(hairCap);

    // 两侧轻盈修饰脸颊的微卷发丝
    for (const s of [-1, 1]) {
      const lock = new THREE.Mesh(new THREE.CapsuleGeometry(0.018, 0.13, 5, 8), hairMat);
      lock.position.set(s * 0.135, 0.08, -0.035);
      lock.rotation.z = s * 0.12;
      headPivot.add(lock);
    }

    // 4 节雕塑麻花辫（物理级联甩动！）
    const makeBraidNode = (r, len) => {
      const g = new THREE.Group();
      const seg = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 5, 10), hairMat);
      seg.position.y = -(len * 0.5 + r * 0.5);
      g.add(seg);
      return g;
    };
    const braid1 = makeBraidNode(0.038, 0.14);
    braid1.position.set(0, 0.13, 0.155);
    const braid2 = makeBraidNode(0.032, 0.14);
    braid2.position.y = -0.17;
    const braid3 = makeBraidNode(0.025, 0.14);
    braid3.position.y = -0.16;
    const hairTie = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.008, 6, 12), new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.4 }));
    hairTie.rotation.x = Math.PI * 0.5;
    hairTie.position.y = -0.02;
    const braidTip = new THREE.Mesh(new THREE.ConeGeometry(0.024, 0.14, 8), hairMat);
    braidTip.rotation.x = Math.PI;
    braidTip.position.y = -0.17;
    braid3.add(hairTie, braidTip);
    braid2.add(braid3);
    braid1.add(braid2);
    headPivot.add(braid1);

    // ---- 4. 无缝 CapsuleGeometry 双节臂 + 露指手套 + 经典双枪 + 翡翠照明弹 ----
    const makeArm = (side) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.215, 0.43, 0);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.20, 6, 10), skinMat);
      upper.position.y = -0.13;
      shoulder.add(upper);

      const elbow = new THREE.Group();
      elbow.position.y = -0.255;
      const fore = new THREE.Mesh(new THREE.CapsuleGeometry(0.034, 0.19, 6, 10), skinMat);
      fore.position.y = -0.125;
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), gloveMat);
      hand.position.y = -0.255;
      const pistol = buildPistolMesh();
      pistol.position.set(0, -0.265, -0.03);
      pistol.rotation.x = -Math.PI * 0.48;
      pistol.visible = false;
      elbow.add(fore, hand, pistol);
      shoulder.add(elbow);
      torso.add(shoulder);
      return { shoulder, elbow, pistol };
    };

    const armL = makeArm(-1);
    const armR = makeArm(1);

    const flareMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.018, 0.018, 0.22, 8),
      new THREE.MeshBasicMaterial({ color: 0x4ade80 })
    );
    flareMesh.position.set(0, -0.265, -0.06);
    flareMesh.visible = false;
    armL.elbow.add(flareMesh);

    const flareLight = new THREE.PointLight(0x4ade80, 0, 16);
    flareLight.position.set(0, 1.35, -0.4);
    root.add(flareLight);

    const gunLight = new THREE.PointLight(0xfef08a, 0, 8.5);
    gunLight.position.set(0, 1.35, -0.65);
    root.add(gunLight);

    enableShadows(rig);

    root.userData = {
      rig, pelvis, torso, headPivot,
      braid1, braid2, braid3,
      armL, armR, legL, legR,
      holsteredGuns, flareMesh, flareLight, gunLight,
      runPhase: 0,
    };
    return root;
  };

  /** 实时驱动劳拉 18 关节全身动作 */
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
      pelvisY = 0.82;
      const shim = Math.sin(t * 10) * (Math.abs(s.vx) + Math.abs(s.vz) > 0.05 ? 0.18 : 0.03);
      lShX = 2.95 + shim; rShX = 2.95 - shim;
      lShZ = -0.22; rShZ = 0.22;
      lElX = 0.18; rElX = 0.18;
      lLegX = 0.22; rLegX = 0.12;
      lKnee = -0.45; rKnee = -0.35;
    } else if (s.action === 'climb') {
      pelvisY = 0.88;
      torsoPitch = -0.42;
      lShX = 1.4; rShX = 1.4; lElX = 0.8; rElX = 0.8;
      lLegX = 0.85; rLegX = -0.2; lKnee = -1.1; rKnee = -0.4;
    } else if (s.action === 'roll') {
      const p = 1 - s.rollTimer / 0.36;
      rigY = Math.sin(p * Math.PI) * 0.65;
      if (s.rollKind === 'back') rigPitch = p * Math.PI * 2;
      else if (s.rollKind === 'left') rigRoll = p * Math.PI * 2;
      else if (s.rollKind === 'right') rigRoll = -p * Math.PI * 2;
      else rigPitch = -p * Math.PI * 2;
      lLegX = 0.65; rLegX = 0.65; lKnee = -1.2; rKnee = -1.2;
      lShX = 1.1; rShX = 1.1;
    } else if (s.action === 'push') {
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
      torsoPitch = -0.16;
      lLegX = 0.62; rLegX = -0.48;
      lKnee = -0.78; rKnee = -0.45;
      lShX = 1.05; rShX = 0.85; lShZ = -0.35; rShZ = 0.35;
    } else if (moveBlend > 0.08) {
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
      pelvisY = 0.88 + Math.sin(t * 2.4) * 0.015;
      lShX = 0.05; rShX = 0.05;
      lElX = 0.22; rElX = 0.22;
    }

    const gunsOut = s.weaponsDrawn && s.action !== 'hang' && s.action !== 'climb' && s.action !== 'push';
    if (gunsOut) {
      const recoilL = s.muzzleL > 0 ? 0.26 : 0;
      const recoilR = s.muzzleR > 0 ? 0.26 : 0;
      lShX = 1.52 + recoilL; rShX = 1.52 + recoilR;
      lShZ = -0.07; rShZ = 0.07;
      lElX = 0.08; rElX = 0.08;
    }

    ud.armL.pistol.visible = gunsOut;
    ud.armR.pistol.visible = gunsOut;
    ud.armL.pistol.userData.flash.visible = s.muzzleL > 0;
    ud.armR.pistol.userData.flash.visible = s.muzzleR > 0;
    for (const hg of ud.holsteredGuns) hg.visible = !gunsOut;

    ud.gunLight.intensity = (s.muzzleL > 0 || s.muzzleR > 0) ? 7.0 : 0;
    const flareOn = s.flareTimer > 0;
    ud.flareMesh.visible = flareOn && !gunsOut;
    ud.flareLight.intensity = flareOn ? (3.2 + Math.sin(t * 22) * 0.45) : 0;

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

    const whip = 0.22 + moveBlend * 0.62 + (s.action === 'jump' ? 0.48 : 0);
    ud.braid1.rotation.x = whip + Math.sin(rp) * 0.14;
    ud.braid1.rotation.z = Math.cos(rp * 0.5) * 0.24 * (0.3 + moveBlend);
    ud.braid2.rotation.x = 0.16 + Math.sin(rp - 0.8) * 0.24;
    ud.braid2.rotation.z = Math.cos(rp * 0.5 - 0.8) * 0.30 * (0.3 + moveBlend);
    ud.braid3.rotation.x = 0.18 + Math.sin(rp - 1.5) * 0.34;
  };

  /**
   * 3A 级有机雕塑掠食者与霸王龙 Boss（彻底告别方块恐龙与圆柱狼！）
   */
  TR.createEnemyRig = function (e) {
    const root = new THREE.Group();

    if (e.kind === 'trex') {
      const skinMat = new THREE.MeshStandardMaterial(makeDinoPBR());
      const bellyMat = new THREE.MeshStandardMaterial({ color: 0xa8925d, roughness: 0.78 });
      const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x243012, roughness: 0.7 });
      const mouthMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.45 });
      const toothMat = new THREE.MeshStandardMaterial({ color: 0xfefce8, roughness: 0.22, metalness: 0.1 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });

      const bodyPivot = new THREE.Group();
      bodyPivot.position.y = 2.45;
      root.add(bodyPivot);

      // LatheGeometry 流线肌肉躯干（宽厚胸廓 -> 强健臀胯）
      const bodyProfile = [
        new THREE.Vector2(0.05, -1.9),
        new THREE.Vector2(0.68, -1.55),
        new THREE.Vector2(1.06, -0.75),
        new THREE.Vector2(1.18, 0.2),
        new THREE.Vector2(0.98, 1.15),
        new THREE.Vector2(0.62, 1.72),
        new THREE.Vector2(0.05, 1.85),
      ];
      const torso = new THREE.Mesh(new THREE.LatheGeometry(bodyProfile, 18), skinMat);
      torso.rotation.x = Math.PI * 0.5;
      torso.scale.set(0.86, 1.0, 0.94);
      bodyPivot.add(torso);

      // 背脊骨板
      for (let i = 0; i < 8; i++) {
        const scute = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 5), ridgeMat);
        scute.position.set(0, 0.96 - Math.abs(i - 3) * 0.06, 1.3 - i * 0.42);
        scute.rotation.x = -0.35;
        bodyPivot.add(scute);
      }

      // 强健弯曲巨颈 + 有机雕塑霸王龙巨颅（圆颅 + 狰狞眉脊 + 收窄吻部 + 16 枚尖锐白獠牙！）
      const neckPivot = new THREE.Group();
      neckPivot.position.set(0, 0.42, 1.55);
      const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.54, 0.95, 8, 14), skinMat);
      neck.rotation.x = 0.65;
      neck.position.set(0, 0.42, 0.38);
      neckPivot.add(neck);

      const headPivot = new THREE.Group();
      headPivot.position.set(0, 1.02, 0.86);

      const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.62, 16, 12), skinMat);
      cranium.scale.set(0.82, 0.88, 1.05);
      cranium.position.set(0, 0.22, 0.08);
      headPivot.add(cranium);

      // 流线收窄上吻部（非硬方块！）
      const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 1.35, 12), skinMat);
      snout.rotation.x = Math.PI * 0.5;
      snout.scale.set(0.88, 1.0, 0.78);
      snout.position.set(0, 0.16, 0.85);
      headPivot.add(snout);

      // 口腔上腭红肉
      const palate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 1.15), mouthMat);
      palate.position.set(0, -0.08, 0.72);
      headPivot.add(palate);

      // 狰狞角状眉脊 + 琥珀爬行动物竖瞳眼 + 两排弯钩獠牙
      for (const s of [-1, 1]) {
        const brow = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 4, 8), ridgeMat);
        brow.position.set(s * 0.40, 0.48, 0.25);
        brow.rotation.set(0.25, s * 0.2, s * -0.25);
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), eyeMat);
        eye.position.set(s * 0.44, 0.32, 0.28);
        const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.16, 0.04), new THREE.MeshBasicMaterial({ color: 0x09090b }));
        pupil.position.set(s * 0.53, 0.32, 0.31);
        headPivot.add(brow, eye, pupil);

        for (let k = 0; k < 5; k++) {
          const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.22 - k * 0.015, 6), toothMat);
          tooth.rotation.x = Math.PI + 0.12;
          tooth.position.set(s * (0.31 - k * 0.03), -0.18, 0.38 + k * 0.24);
          headPivot.add(tooth);
        }
      }

      // 可张合下颌 + 下排獠牙
      const jawPivot = new THREE.Group();
      jawPivot.position.set(0, -0.06, 0.06);
      const lowerJaw = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.42, 1.32, 10), bellyMat);
      lowerJaw.rotation.x = Math.PI * 0.5;
      lowerJaw.scale.set(0.86, 1, 0.55);
      lowerJaw.position.set(0, -0.10, 0.72);
      const tongue = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.55, 5, 8), mouthMat);
      tongue.rotation.x = Math.PI * 0.5;
      tongue.position.set(0, -0.02, 0.65);
      jawPivot.add(lowerJaw, tongue);
      for (const s of [-1, 1]) {
        for (let k = 0; k < 4; k++) {
          const lt = new THREE.Mesh(new THREE.ConeGeometry(0.038, 0.16, 5), toothMat);
          lt.position.set(s * (0.24 - k * 0.025), 0.05, 0.42 + k * 0.23);
          jawPivot.add(lt);
        }
      }
      headPivot.add(jawPivot);
      neckPivot.add(headPivot);
      bodyPivot.add(neckPivot);

      // 经典短小双趾前臂
      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.48, 5, 8), skinMat);
        arm.position.set(s * 0.72, -0.38, 1.22);
        arm.rotation.x = -0.85;
        bodyPivot.add(arm);
      }

      // 3 段强健收尖平衡巨尾
      const tail1 = new THREE.Group();
      tail1.position.set(0, 0.12, -1.65);
      const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.66, 2.0, 12), skinMat);
      t1.rotation.x = Math.PI * 0.5;
      t1.position.z = -0.95;
      tail1.add(t1);
      const tail2 = new THREE.Group();
      tail2.position.z = -1.92;
      const t2 = new THREE.Mesh(new THREE.ConeGeometry(0.36, 2.4, 10), skinMat);
      t2.rotation.x = -Math.PI * 0.5;
      t2.position.z = -1.18;
      tail2.add(t2);
      tail1.add(tail2);
      bodyPivot.add(tail1);

      // 双足强健肌肉后腿 + 三趾巨爪
      const makeDinoLeg = (side) => {
        const hip = new THREE.Group();
        hip.position.set(side * 0.88, 2.25, -0.1);
        const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.82, 8, 12), skinMat);
        thigh.position.set(0, -0.55, 0.12);
        thigh.rotation.x = -0.22;
        const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.85, 6, 10), skinMat);
        shin.position.set(0, -1.52, -0.15);
        shin.rotation.x = 0.25;
        const foot = new THREE.Group();
        foot.position.set(0, -2.14, 0.08);
        for (const tOff of [-0.22, 0, 0.22]) {
          const toe = new THREE.Mesh(new THREE.CapsuleGeometry(0.10, 0.45, 4, 8), skinMat);
          toe.rotation.x = Math.PI * 0.5;
          toe.position.set(tOff, 0, 0.24);
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.22, 5), ridgeMat);
          claw.rotation.x = Math.PI * 0.58;
          claw.position.set(tOff, -0.02, 0.54);
          foot.add(toe, claw);
        }
        hip.add(thigh, shin, foot);
        root.add(hip);
        return hip;
      };
      const legL = makeDinoLeg(-1);
      const legR = makeDinoLeg(1);

      enableShadows(root);
      root.userData = { kind: 'trex', bodyPivot, neckPivot, jawPivot, tail1, tail2, legL, legR, mainMat: skinMat, stride: 0 };
      return root;
    }

    // ---- 3A 有机雕塑雪狼 (wolf) 与古殿巨熊 (bear) ----
    const isBear = e.kind === 'bear';
    const sc = isBear ? 1.48 : 1.04;
    const furMat = new THREE.MeshStandardMaterial(
      isBear ? makeFurPBR('bear', '#5b3922', '#2d190c') : makeFurPBR('wolf', '#7c8b9c', '#334155')
    );
    const bellyMat = new THREE.MeshStandardMaterial({ color: isBear ? 0x7c5334 : 0xd8e1ea, roughness: 0.85 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: isBear ? 0xf97316 : 0xfde047 });

    const body = new THREE.Group();
    body.scale.setScalar(sc);
    body.position.y = 0.64 * sc;
    root.add(body);

    // LatheGeometry 流线兽躯（宽阔胸肌 + 收束腰腹！）
    const beastProfile = isBear
      ? [new THREE.Vector2(0.04, -0.58), new THREE.Vector2(0.32, -0.40), new THREE.Vector2(0.36, 0.05), new THREE.Vector2(0.38, 0.35), new THREE.Vector2(0.24, 0.55), new THREE.Vector2(0.04, 0.62)]
      : [new THREE.Vector2(0.04, -0.56), new THREE.Vector2(0.21, -0.38), new THREE.Vector2(0.18, -0.05), new THREE.Vector2(0.26, 0.28), new THREE.Vector2(0.22, 0.48), new THREE.Vector2(0.04, 0.56)];
    const torso = new THREE.Mesh(new THREE.LatheGeometry(beastProfile, 14), furMat);
    torso.rotation.x = Math.PI * 0.5;
    body.add(torso);

    // 颈部蓬松鬃毛围领
    const ruff = new THREE.Mesh(new THREE.SphereGeometry(isBear ? 0.32 : 0.24, 12, 10), bellyMat);
    ruff.position.set(0, 0.06, 0.38);
    ruff.scale.set(0.95, 1.05, 0.85);
    body.add(ruff);

    const head = new THREE.Group();
    head.position.set(0, 0.16, 0.56);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), furMat);
    skull.scale.set(0.92, 0.90, 1.05);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.058, 0.105, 0.26, 10), bellyMat);
    snout.rotation.x = Math.PI * 0.5;
    snout.position.set(0, -0.045, 0.20);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 }));
    nose.position.set(0, -0.02, 0.33);
    head.add(skull, snout, nose);

    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(isBear ? new THREE.SphereGeometry(0.068, 8, 8) : new THREE.ConeGeometry(0.052, 0.16, 6), furMat);
      ear.position.set(s * 0.12, 0.19, -0.02);
      ear.rotation.z = -s * 0.18;
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.030, 8, 8), eyeMat);
      eye.position.set(s * 0.088, 0.045, 0.155);
      head.add(ear, eye);
    }
    body.add(head);

    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(isBear ? 0.06 : 0.055, isBear ? 0.08 : 0.42, 5, 8), bellyMat);
    tail.position.set(0, 0.04, -0.66);
    tail.rotation.x = Math.PI * 0.62;
    body.add(tail);

    const legs = [];
    for (const [lx, lz, back] of [[-0.17, 0.34, false], [0.17, 0.34, false], [-0.17, -0.34, true], [0.17, -0.34, true]]) {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.06, lz);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(isBear ? 0.085 : 0.062, 0.24, 5, 8), furMat);
      upper.position.set(0, -0.15, back ? -0.04 : 0.02);
      upper.rotation.x = back ? 0.28 : -0.08;
      const lower = new THREE.Mesh(new THREE.CapsuleGeometry(isBear ? 0.068 : 0.044, 0.24, 5, 8), bellyMat);
      lower.position.set(0, -0.40, back ? -0.02 : 0.02);
      lower.rotation.x = back ? -0.22 : 0.06;
      const paw = new THREE.Mesh(new THREE.SphereGeometry(isBear ? 0.075 : 0.052, 8, 6), furMat);
      paw.scale.set(1, 0.6, 1.35);
      paw.position.set(0, -0.54, 0.04);
      leg.add(upper, lower, paw);
      body.add(leg);
      legs.push(leg);
    }

    enableShadows(root);

    // 小怪头顶迷你血条（不投射阴影）
    const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.10), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
    hpBg.position.y = e.height + 0.38;
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
    ud.mainMat.emissiveIntensity = e.hitFlash > 0 ? 0.35 : (e.state === 'windup' ? 0.30 : 0);

    if (ud.kind === 'trex') {
      const moveB = Math.min(1, spd / 4.0);
      ud.legL.rotation.x = Math.sin(ud.stride) * 0.56 * moveB;
      ud.legR.rotation.x = -Math.sin(ud.stride) * 0.56 * moveB;
      ud.bodyPivot.position.y = 2.45 + Math.abs(Math.sin(ud.stride)) * 0.26 * moveB + Math.sin(t * 2.2) * 0.04;
      ud.bodyPivot.rotation.x = e.state === 'windup' ? -0.26 : (e.state === 'lunge' ? 0.26 : 0.06);
      ud.jawPivot.rotation.x = (e.state === 'windup' || e.state === 'lunge') ? 0.65 : (0.10 + Math.sin(t * 3.5) * 0.07);
      ud.tail1.rotation.y = Math.sin(t * 3.2) * 0.30;
      ud.tail2.rotation.y = Math.sin(t * 3.2 - 0.8) * 0.42;
      return;
    }

    const moveB = Math.min(1, spd / 3.5);
    ud.legs[0].rotation.x = Math.sin(ud.stride) * 0.68 * moveB;
    ud.legs[1].rotation.x = -Math.sin(ud.stride) * 0.68 * moveB;
    ud.legs[2].rotation.x = -Math.sin(ud.stride) * 0.68 * moveB;
    ud.legs[3].rotation.x = Math.sin(ud.stride) * 0.68 * moveB;
    ud.body.rotation.x = e.state === 'windup' ? (ud.kind === 'bear' ? -0.55 : -0.32) : (e.state === 'lunge' ? 0.22 : 0);
    ud.tail.rotation.y = Math.sin(t * 7) * 0.28;

    if (ud.hpBg && ud.hpFill && cameraPos) {
      ud.hpBg.lookAt(cameraPos);
      const r = Math.max(0.01, e.hp / e.maxHp);
      ud.hpFill.scale.x = r;
      ud.hpFill.position.x = -(1 - r) * 0.45;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
