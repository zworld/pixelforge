/* 神雕侠侣 · 问情剑 — 《仙剑奇侠传》风高精骨骼人物建模、国风面部/锦袍手绘纹理与灵动武学动作驱动器 */
(function (G) {
  'use strict';
  const CH = (G.CH = G.CH || {});

  const canvasCache = new Map();

  function getCachedTexture(key, builder) {
    let c = canvasCache.get(key);
    if (!c) {
      c = builder();
      canvasCache.set(key, c);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  /** 绘制国风仙剑感面部贴图（按球面 UV 精确比例布局：正脸占 u=0.38..0.62，两侧与后脑为墨发） */
  function makeFaceTexture(opts = {}) {
    const key = 'face2:' + JSON.stringify(opts);
    return getCachedTexture(key, () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');

      const hairCol = opts.hair || '#1c1917';
      const skin = opts.skin || '#fbe0c8';
      const shade = opts.shade || '#e5b898';

      // 先以发色铺底（后脑与两侧自然为秀发）
      ctx.fillStyle = hairCol;
      ctx.fillRect(0, 0, 256, 256);

      // 正面温润玉颜椭圆（覆盖球面正面 ±50°）
      const g = ctx.createRadialGradient(128, 126, 10, 128, 130, 56);
      g.addColorStop(0, skin);
      g.addColorStop(0.75, shade);
      g.addColorStop(1, '#c89678');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.ellipse(128, 134, 44, 62, 0, 0, Math.PI * 2);
      ctx.fill();

      // 优雅刘海与额际发丝（高额留白，完整露出眉眼与额间花钿！）
      ctx.fillStyle = hairCol;
      ctx.beginPath();
      ctx.moveTo(74, 48);
      ctx.lineTo(182, 48);
      ctx.lineTo(182, 86);
      ctx.quadraticCurveTo(158, 72, 144, 82);
      ctx.quadraticCurveTo(128, 68, 112, 82);
      ctx.quadraticCurveTo(98, 72, 74, 86);
      ctx.closePath();
      ctx.fill();

      // 仙剑腮红微晕
      if (opts.female) {
        for (const cx of [108, 148]) {
          const bg = ctx.createRadialGradient(cx, 152, 1, cx, 152, 11);
          bg.addColorStop(0, 'rgba(244, 114, 144, 0.42)');
          bg.addColorStop(1, 'rgba(244, 114, 144, 0)');
          ctx.fillStyle = bg;
          ctx.beginPath();
          ctx.arc(cx, 152, 11, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      // 眉形（柳叶眉 / 剑眉 / 怒眉）
      ctx.strokeStyle = opts.browColor || hairCol;
      ctx.lineWidth = opts.female ? 2.6 : 3.8;
      ctx.lineCap = 'round';
      const fierce = opts.fierce ? 5.0 : (opts.female ? -1.8 : 1.8);
      ctx.beginPath();
      ctx.moveTo(103, 118 - fierce * 0.3);
      ctx.quadraticCurveTo(114, 112 - fierce * 0.2, 123, 117 + fierce * 0.65);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(153, 118 - fierce * 0.3);
      ctx.quadraticCurveTo(142, 112 - fierce * 0.2, 133, 117 + fierce * 0.65);
      ctx.stroke();

      // 灵动仙剑大眼（清晰眼白、明澈虹膜、双星高光与纤长眼线）
      const irisColor = opts.iris || '#2a1a15';
      for (const side of [-1, 1]) {
        const ex = 128 + side * 14.5;
        const ey = 133;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ex, ey, 7.6, opts.female ? 5.8 : 4.8, side * (opts.fierce ? -0.15 : 0.06), 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = irisColor;
        ctx.beginPath();
        ctx.arc(ex - side * 0.3, ey, opts.female ? 4.7 : 4.1, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#09090b';
        ctx.beginPath();
        ctx.arc(ex - side * 0.3, ey, 2.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + 1.5, ey - 1.8, 1.65, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex - 1.4, ey + 1.5, 0.85, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#18181b';
        ctx.lineWidth = opts.female ? 2.4 : 2.0;
        ctx.beginPath();
        ctx.moveTo(ex - side * 8.0, ey + 0.2);
        ctx.quadraticCurveTo(ex, ey - 7.0, ex + side * 8.6, ey - (opts.female ? 2.4 : 0.6));
        ctx.stroke();
      }

      // 额间花钿/印记
      if (opts.foreheadMark) {
        ctx.fillStyle = opts.foreheadMark;
        ctx.beginPath();
        ctx.moveTo(128, 98);
        ctx.lineTo(132, 105);
        ctx.lineTo(128, 112);
        ctx.lineTo(124, 105);
        ctx.closePath();
        ctx.fill();
      }

      // 秀挺鼻梁
      ctx.strokeStyle = 'rgba(138, 86, 62, 0.44)';
      ctx.lineWidth = 1.7;
      ctx.beginPath();
      ctx.moveTo(128, 136);
      ctx.lineTo(127, 150);
      ctx.lineTo(131, 151);
      ctx.stroke();

      // 朱唇 / 侠客唇线
      ctx.fillStyle = opts.lipColor || (opts.female ? '#e11d48' : '#b86b5c');
      ctx.beginPath();
      ctx.moveTo(120, 164);
      ctx.quadraticCurveTo(128, opts.female ? 160 : 162, 136, 164);
      ctx.quadraticCurveTo(128, opts.female ? 171 : 168, 120, 164);
      ctx.fill();

      // 美髯胡须
      if (opts.beard) {
        ctx.fillStyle = opts.beardColor || hairCol;
        ctx.beginPath();
        ctx.moveTo(116, 158);
        ctx.quadraticCurveTo(128, 155, 140, 158);
        ctx.lineTo(142, 162);
        ctx.quadraticCurveTo(128, 159, 114, 162);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(120, 170);
        ctx.quadraticCurveTo(128, 185, 136, 170);
        ctx.lineTo(132, 198);
        ctx.quadraticCurveTo(128, 204, 124, 198);
        ctx.closePath();
        ctx.fill();
      }

      return c;
    });
  }

  /** 绘制汉服锦袍织锦贴图（交领右衽、云纹暗花、金玉滚边） */
  function makeRobeTexture(baseHex, trimHex, accentHex) {
    const key = `robe:${baseHex}:${trimHex}:${accentHex}`;
    return getCachedTexture(key, () => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 256;
      const ctx = c.getContext('2d');

      const g = ctx.createLinearGradient(0, 0, 0, 256);
      g.addColorStop(0, baseHex);
      g.addColorStop(1, '#1e293b');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, 256, 256);

      // 丝绸斜纹暗花 + 祥云暗纹
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 2;
      for (let y = 24; y < 240; y += 44) {
        for (let x = 20; x < 245; x += 52) {
          ctx.beginPath();
          ctx.arc(x, y, 11, Math.PI, Math.PI * 2);
          ctx.arc(x + 12, y - 3, 9, Math.PI * 1.1, Math.PI * 2.1);
          ctx.stroke();
        }
      }

      // 交领右衽滚边
      ctx.strokeStyle = trimHex;
      ctx.lineWidth = 10;
      ctx.beginPath();
      ctx.moveTo(78, 0);
      ctx.lineTo(150, 122);
      ctx.moveTo(178, 0);
      ctx.lineTo(128, 86);
      ctx.stroke();

      // 下摆织金卷草边
      ctx.fillStyle = trimHex;
      ctx.fillRect(0, 232, 256, 12);
      ctx.fillStyle = accentHex;
      ctx.fillRect(0, 224, 256, 5);

      return c;
    });
  }

  /** 构建精细武侠兵器模型 */
  function buildWeaponMesh(spec) {
    const g = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.88, roughness: 0.18 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.85, roughness: 0.25, emissive: 0x92400e, emissiveIntensity: 0.22 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.72, roughness: 0.35 });

    if (spec === 'whisk') {
      // 李莫愁 · 紫霄拂尘（玉柄 + 多束流动银紫尘丝）
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.032, 0.56, 8), goldMat);
      handle.position.y = 0.26;
      g.add(handle);
      const whiskRoot = new THREE.Group();
      whiskRoot.position.y = 0.56;
      const strandMat = new THREE.MeshStandardMaterial({ color: 0xf5d0fe, emissive: 0xc026d3, emissiveIntensity: 0.45, roughness: 0.35 });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const r = i === 0 ? 0 : 0.055;
        const strand = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.68, 6), strandMat);
        strand.position.set(Math.cos(a) * r, 0.32, Math.sin(a) * r);
        strand.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18);
        whiskRoot.add(strand);
      }
      g.add(whiskRoot);
      g.userData.whiskRoot = whiskRoot;
    } else if (spec === 'sawblade') {
      // 公孙止 · 黄金锯齿刀
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.24, 8), darkMat);
      const guard = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 12), goldMat);
      guard.position.y = 0.12;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.92, 0.022), goldMat);
      blade.position.set(0.02, 0.60, 0);
      blade.rotation.z = -0.08;
      g.add(hilt, guard, blade);
      for (let i = 0; i < 6; i++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), goldMat);
        tooth.position.set(-0.04, 0.26 + i * 0.12, 0);
        tooth.rotation.z = Math.PI * 0.55;
        g.add(tooth);
      }
    } else if (spec === 'greatsword') {
      // 独孤求败 · 剑意玄铁重剑
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.34, 8), darkMat);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.09), goldMat);
      guard.position.y = 0.18;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 1.32, 0.036),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.85, roughness: 0.26, emissive: 0xd97706, emissiveIntensity: 0.32 })
      );
      blade.position.y = 0.86;
      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.026, 1.05, 0.042), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
      rune.position.y = 0.84;
      g.add(hilt, guard, blade, rune);
    } else if (spec === 'halberd') {
      // 护法猛士 · 鎏金大刀/月牙戟
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 1.45, 8), darkMat);
      pole.position.y = 0.55;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.52, 0.025), steelMat);
      head.position.set(0.04, 1.28, 0);
      head.rotation.z = -0.14;
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), goldMat);
      collar.position.y = 1.02;
      g.add(pole, head, collar);
    } else if (spec === 'chakram') {
      // 金轮法王手持金轮
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.30, 0.048, 8, 20), goldMat);
      rim.position.y = 0.32;
      for (let i = 0; i < 4; i++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.032, 0.024), goldMat);
        spoke.position.y = 0.32;
        spoke.rotation.z = (i / 4) * Math.PI;
        g.add(spoke);
      }
      g.add(rim);
    } else if (spec === 'bow') {
      // 暗器刺客 · 雕花短弓 / 飞镖扇
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.022, 6, 16, Math.PI * 1.15), goldMat);
      bow.position.set(0, 0.15, 0.06);
      bow.rotation.z = -Math.PI * 0.57;
      g.add(bow);
    } else {
      // 精钢长剑（交错剑格 + 玉髓剑穗）
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.22, 8), darkMat);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.036, 0.05), goldMat);
      guard.position.y = 0.11;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.96, 0.016), steelMat);
      blade.position.y = 0.60;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.16, 4), steelMat);
      tip.position.y = 1.16;
      tip.rotation.y = Math.PI * 0.25;
      tip.scale.set(1, 1, 0.35);
      g.add(hilt, guard, blade, tip);
    }
    return g;
  }

  /** 按角色类型解析专属《仙剑》国风外观设定 */
  function resolveCharacterProfile(e, palette) {
    if (e.npcId === 'xiaolongnu') {
      return {
        robe: '#f8fafc', trim: '#bae6fd', accent: '#38bdf8', inner: '#e0f2fe',
        hair: '#0f172a', female: true, ribbonColor: '#e0f2fe', hasRibbons: true,
        hairStyle: 'maiden', weaponR: 'sword', weaponL: null, scale: 1.0,
        face: { skin: '#fff1e6', shade: '#f3d5c0', hair: '#0f172a', female: true, iris: '#1e293b', lipColor: '#f43f5e' },
      };
    }
    if (e.bossId === 'limochou') {
      return {
        robe: '#581c87', trim: '#e879f9', accent: '#f43f5e', inner: '#fae8ff',
        hair: '#09090b', female: true, ribbonColor: '#d946ef', hasRibbons: true,
        hairStyle: 'taoist', weaponR: 'whisk', weaponL: null, scale: 1.14,
        face: { skin: '#fce7dc', shade: '#e2baa8', hair: '#09090b', female: true, fierce: true, iris: '#581c87', lipColor: '#be123c', foreheadMark: '#e879f9' },
      };
    }
    if (e.bossId === 'gongsun') {
      return {
        robe: '#14532d', trim: '#fbbf24', accent: '#f43f5e', inner: '#991b1b',
        hair: '#1e293b', female: false, ribbonColor: '#f59e0b', hasRibbons: false,
        hairStyle: 'crown', weaponR: 'sawblade', weaponL: 'sword', scale: 1.18,
        face: { skin: '#f1c7a6', shade: '#d49d79', hair: '#1e293b', fierce: true, beard: true, iris: '#292524' },
      };
    }
    if (e.bossId === 'dugu') {
      return {
        robe: '#1e293b', trim: '#f59e0b', accent: '#fde047', inner: '#334155',
        hair: '#e2e8f0', female: false, ribbonColor: '#fbbf24', hasRibbons: true,
        hairStyle: 'wild', weaponR: 'greatsword', weaponL: null, scale: 1.24,
        face: { skin: '#e2e8f0', shade: '#94a3b8', hair: '#cbd5e1', fierce: true, beard: true, beardColor: '#e2e8f0', iris: '#f59e0b', foreheadMark: '#fbbf24' },
      };
    }
    if (e.bossId === 'jinlun') {
      return {
        robe: '#991b1b', trim: '#facc15', accent: '#f97316', inner: '#fbbf24',
        hair: '#292524', female: false, ribbonColor: '#facc15', hasRibbons: true,
        hairStyle: 'lama', weaponR: 'chakram', weaponL: 'chakram', scale: 1.28,
        hasFiveWheels: true,
        face: { skin: '#e5a97c', shade: '#bc7d52', hair: '#292524', fierce: true, iris: '#7c2d12', foreheadMark: '#facc15' },
      };
    }
    if (e.kind === 'archer') {
      return {
        robe: palette?.robe || '#1e3a5f', trim: palette?.trim || '#7dd3fc', accent: '#f43f5e', inner: '#cbd5e1',
        hair: '#18181b', female: false, hasRibbons: false,
        hairStyle: 'strawhat', weaponR: 'bow', weaponL: null, scale: 0.98,
        face: { skin: '#f1c7a6', shade: '#d49d79', hair: '#18181b', fierce: true },
      };
    }
    if (e.kind === 'brute') {
      return {
        robe: palette?.robe || '#451a03', trim: '#f59e0b', accent: '#ef4444', inner: '#1e293b',
        hair: '#18181b', female: false, hasRibbons: false,
        hairStyle: 'topknot', weaponR: 'halberd', weaponL: null, scale: 1.12,
        face: { skin: '#e6b28a', shade: '#c2855e', hair: '#18181b', fierce: true, beard: true },
      };
    }
    return {
      robe: palette?.robe || '#1e3a5f', trim: palette?.trim || '#7dd3fc', accent: '#fbbf24', inner: '#f1f5f9',
      hair: '#18181b', female: false, hasRibbons: false,
      hairStyle: 'topknot', weaponR: 'sword', weaponL: null, scale: 1.0,
      face: { skin: '#f4cba8', shade: '#d7a27e', hair: '#18181b', fierce: false },
    };
  }

  /**
   * 构建 16+ 关节可动《仙剑》国风 3D 人物
   */
  CH.createArticulatedCharacter = function (e, palette) {
    const prof = resolveCharacterProfile(e, palette);
    const root = new THREE.Group();

    const robeTex = makeRobeTexture(prof.robe, prof.trim, prof.accent);
    const faceTex = makeFaceTexture(prof.face);

    const robeMat = new THREE.MeshStandardMaterial({ map: robeTex, roughness: 0.56, metalness: 0.14 });
    const trimMat = new THREE.MeshStandardMaterial({ color: prof.trim, roughness: 0.36, metalness: 0.52, emissive: prof.trim, emissiveIntensity: 0.16 });
    const innerMat = new THREE.MeshStandardMaterial({ color: prof.inner, roughness: 0.62 });
    const skinMat = new THREE.MeshStandardMaterial({ color: prof.face.skin, roughness: 0.58 });
    const faceMat = new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.56 });
    const hairMat = new THREE.MeshStandardMaterial({ color: prof.hair, roughness: 0.78, metalness: 0.04 });
    const bootMat = new THREE.MeshStandardMaterial({ color: 0x1e1b24, roughness: 0.72 });

    // 主体骨架根节点（用于缩放、浮空、腾挪、受击倾仰）
    const rig = new THREE.Group();
    rig.scale.setScalar(prof.scale);
    root.add(rig);

    // ---- 1. 骨盆与双腿（马步 / 弓步 / 疾步动作基础） ----
    const pelvis = new THREE.Group();
    pelvis.position.y = 0.88;
    rig.add(pelvis);

    const makeLeg = (side) => {
      const hip = new THREE.Group();
      hip.position.set(side * 0.15, 0, 0);
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.078, 0.44, 10), innerMat);
      thigh.position.y = -0.22;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.y = -0.44;
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.056, 0.42, 10), bootMat);
      shin.position.y = -0.21;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.08, 0.22), bootMat);
      foot.position.set(0, -0.40, 0.05);
      knee.add(shin, foot);
      hip.add(knee);
      return { hip, knee };
    };
    const legL = makeLeg(-1);
    const legR = makeLeg(1);
    pelvis.add(legL.hip, legR.hip);

    // 4 片独立摆动的锦袍下摆（前摆、后摆、左右侧摆，移动/出招随风飘动！）
    const skirtPanels = [];
    const panelSpecs = [
      { x: 0, z: 0.15, ry: 0, w: 0.34, h: 0.74 },
      { x: 0, z: -0.15, ry: Math.PI, w: 0.38, h: 0.78 },
      { x: -0.19, z: 0, ry: -Math.PI * 0.5, w: 0.32, h: 0.74 },
      { x: 0.19, z: 0, ry: Math.PI * 0.5, w: 0.32, h: 0.74 },
    ];
    for (const ps of panelSpecs) {
      const pivot = new THREE.Group();
      pivot.position.set(ps.x, 0.04, ps.z);
      pivot.rotation.y = ps.ry;
      const panel = new THREE.Mesh(
        new THREE.BoxGeometry(ps.w, ps.h, 0.032),
        robeMat
      );
      panel.position.y = -ps.h * 0.5;
      pivot.add(panel);
      pelvis.add(pivot);
      skirtPanels.push(pivot);
    }

    // 锦缎腰带 + 垂挂玉佩
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.20, 0.22, 0.13, 12), trimMat);
    belt.position.y = 0.06;
    pelvis.add(belt);
    const jadePendant = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.055, 0),
      new THREE.MeshStandardMaterial({ color: 0x67e8f9, emissive: 0x0284c7, emissiveIntensity: 0.55, roughness: 0.2 })
    );
    jadePendant.position.set(0.14, -0.08, 0.19);
    pelvis.add(jadePendant);

    // ---- 2. 躯干（呼吸起伏 + 凌厉拧腰发力） ----
    const torso = new THREE.Group();
    torso.position.y = 0.10;
    pelvis.add(torso);

    const chestW = prof.female ? 0.21 : 0.26;
    const chest = new THREE.Mesh(new THREE.CylinderGeometry(chestW, 0.18, 0.54, 14), robeMat);
    chest.position.y = 0.27;
    chest.scale.set(1.12, 1, 0.76);
    torso.add(chest);

    // 贴合双肩的国风柔顺肩线 + 交领护颈（彻底告别生硬倒锥套圈！）
    const shoulderYoke = new THREE.Mesh(new THREE.SphereGeometry(chestW * 1.12, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.48), trimMat);
    shoulderYoke.position.y = 0.44;
    shoulderYoke.scale.set(1.24, 0.52, 0.86);
    torso.add(shoulderYoke);

    // 交领 V 字领口锦边
    for (const s of [-1, 1]) {
      const lapel = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.26, 0.025), trimMat);
      lapel.position.set(s * 0.065, 0.43, chestW * 0.72);
      lapel.rotation.z = s * 0.36;
      torso.add(lapel);
    }

    // 脖颈
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.075, 0.13, 10), skinMat);
    neck.position.y = 0.58;
    torso.add(neck);

    // ---- 3. 头部（仙剑绘面 + 立体发髻/飘逸长发/冠饰） ----
    const headPivot = new THREE.Group();
    headPivot.position.y = 0.65;
    torso.add(headPivot);

    // 鹅蛋脸头雕（UV 正面朝 +Z，完整展露眉眼唇色！）
    const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.185, 20, 16), faceMat);
    headMesh.scale.set(0.92, 1.08, 0.96);
    headMesh.position.y = 0.15;
    headMesh.rotation.y = -Math.PI * 0.5;
    headPivot.add(headMesh);

    // 后倾发顶轮廓（覆盖头顶与后脑，绝不遮挡正面眉眼！）
    const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.194, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.46), hairMat);
    hairCap.position.set(0, 0.18, -0.025);
    hairCap.rotation.x = -0.62;
    headPivot.add(hairCap);

    // 两侧轻盈垂鬓（贴耳垂落，衬托仙剑脸型）
    for (const s of [-1, 1]) {
      const lock = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.26, 8), hairMat);
      lock.position.set(s * 0.155, 0.06, 0.045);
      lock.rotation.z = s * 0.10;
      lock.rotation.x = Math.PI;
      headPivot.add(lock);
    }

    // 动态飘逸后发束（绑定到 hairPivot，随运动与风吹实时飘荡）
    const hairPivot = new THREE.Group();
    hairPivot.position.set(0, 0.12, -0.15);
    const hairTail = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.065, prof.female ? 0.68 : 0.44, 10),
      hairMat
    );
    hairTail.position.y = prof.female ? -0.34 : -0.22;
    hairTail.scale.set(1.15, 1, 0.45);
    hairPivot.add(hairTail);
    headPivot.add(hairPivot);

    // 专属发饰 / 冠帽
    if (prof.hairStyle === 'maiden') {
      // 小龙女玉簪与双垂发带
      const bun = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), hairMat);
      bun.position.set(0, 0.35, -0.04);
      const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.32, 6), trimMat);
      pin.rotation.z = Math.PI * 0.5;
      pin.position.set(0, 0.36, -0.04);
      headPivot.add(bun, pin);
    } else if (prof.hairStyle === 'taoist') {
      // 李莫愁紫金道冠
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.095, 0.16, 8), trimMat);
      crown.position.set(0, 0.37, -0.02);
      const lotus = new THREE.Mesh(new THREE.OctahedronGeometry(0.055, 0), new THREE.MeshBasicMaterial({ color: 0xf5d0fe }));
      lotus.position.set(0, 0.47, -0.02);
      headPivot.add(crown, lotus);
    } else if (prof.hairStyle === 'strawhat') {
      // 江湖侠客竹编斗笠
      const hat = new THREE.Mesh(
        new THREE.ConeGeometry(0.46, 0.19, 14),
        new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.78 })
      );
      hat.position.set(0, 0.34, 0);
      headPivot.add(hat);
    } else if (prof.hairStyle === 'lama') {
      // 金轮法王五瓣金法冠
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.13, 0.22, 8), trimMat);
      crown.position.set(0, 0.36, 0);
      headPivot.add(crown);
    } else {
      // 玉冠束发
      const bun = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.075, 0.13, 8), trimMat);
      bun.position.set(0, 0.36, -0.02);
      headPivot.add(bun);
    }

    // ---- 4. 双节可动臂 + 广袖 + 兵器 ----
    const makeArm = (side, weaponSpec) => {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * (chestW + 0.08), 0.46, 0);

      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.088, 0.34, 10), robeMat);
      upper.position.y = -0.17;
      shoulder.add(upper);

      const elbow = new THREE.Group();
      elbow.position.y = -0.33;

      // 仙剑宽大飘逸广袖
      const sleeve = new THREE.Mesh(new THREE.ConeGeometry(prof.female ? 0.145 : 0.12, 0.36, 10), robeMat);
      sleeve.position.set(0, -0.15, -0.02);
      sleeve.rotation.x = Math.PI;
      elbow.add(sleeve);

      const cuff = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.072, 0.06, 10), trimMat);
      cuff.position.y = -0.26;
      elbow.add(cuff);

      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.052, 8, 8), skinMat);
      hand.position.y = -0.32;
      elbow.add(hand);

      let weapon = null;
      if (weaponSpec) {
        weapon = buildWeaponMesh(weaponSpec);
        weapon.position.set(0, -0.34, 0.05);
        weapon.rotation.x = Math.PI * 0.45;
        elbow.add(weapon);
      }

      shoulder.add(elbow);
      torso.add(shoulder);
      return { shoulder, elbow, weapon };
    };

    const armL = makeArm(-1, prof.weaponL);
    const armR = makeArm(1, prof.weaponR);

    // ---- 5. 仙剑标志性飘逸披帛 / 丝带（多段弧形流光飘带，随风飞舞！） ----
    const ribbons = [];
    if (prof.hasRibbons) {
      const ribMat = new THREE.MeshStandardMaterial({
        color: prof.ribbonColor || prof.trim,
        emissive: prof.ribbonColor || prof.trim,
        emissiveIntensity: 0.32,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.86,
        roughness: 0.3,
      });
      for (const side of [-1, 1]) {
        const seg1 = new THREE.Group();
        seg1.position.set(side * 0.28, 0.48, -0.06);
        const m1 = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.58), ribMat);
        m1.position.y = -0.29;
        seg1.add(m1);

        const seg2 = new THREE.Group();
        seg2.position.y = -0.56;
        const m2 = new THREE.Mesh(new THREE.PlaneGeometry(0.095, 0.56), ribMat);
        m2.position.y = -0.28;
        seg2.add(m2);
        seg1.add(seg2);

        torso.add(seg1);
        ribbons.push({ seg1, seg2, side });
      }
    }

    // ---- 6. 金轮法王背后五轮大转金环（带法轮辐条与金色光芒） ----
    let wheelHalo = null;
    if (prof.hasFiveWheels) {
      wheelHalo = new THREE.Group();
      wheelHalo.position.set(0, 0.48, -0.34);
      const wheelMat = new THREE.MeshStandardMaterial({
        color: 0xfacc15, metalness: 0.88, roughness: 0.18, emissive: 0xd97706, emissiveIntensity: 0.45,
      });
      for (let k = 0; k < 5; k++) {
        const ang = (k / 5) * Math.PI * 2;
        const wGroup = new THREE.Group();
        wGroup.position.set(Math.cos(ang) * 0.82, Math.sin(ang) * 0.82, 0);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.042, 8, 18), wheelMat);
        const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.026, 0.02), wheelMat);
        const cross2 = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.44, 0.02), wheelMat);
        wGroup.add(ring, cross1, cross2);
        wheelHalo.add(wGroup);
      }
      torso.add(wheelHalo);
    }

    // ---- 7. 战斗脚下光环、预警光晶、破防金环与小兵血条 ----
    if (!e.isNpc) {
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
      const ring = new THREE.Mesh(new THREE.RingGeometry(e.radius * 0.85, e.radius * 1.18, 28), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      root.add(ring);

      const perilMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0 });
      const perilBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), perilMat);
      perilBeacon.position.y = e.height + 0.58;
      root.add(perilBeacon);

      const staggerRing = new THREE.Mesh(
        new THREE.TorusGeometry(0.46, 0.045, 8, 20),
        new THREE.MeshBasicMaterial({ color: 0xfde047 })
      );
      staggerRing.rotation.x = Math.PI / 2;
      staggerRing.position.y = e.height + 0.28;
      staggerRing.visible = false;
      root.add(staggerRing);

      if (!e.isBoss) {
        const barBg = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.10), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
        barBg.position.y = e.height + 0.20;
        const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.90, 0.06), new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide }));
        hpFill.position.set(0, 0, 0.01);
        barBg.add(hpFill);
        root.add(barBg);
        root.userData.hpBar = barBg;
        root.userData.hpFill = hpFill;
      }

      root.userData.ring = ring;
      root.userData.ringMat = ringMat;
      root.userData.perilBeacon = perilBeacon;
      root.userData.perilMat = perilMat;
      root.userData.staggerRing = staggerRing;
    }

    root.userData.rig = rig;
    root.userData.pelvis = pelvis;
    root.userData.torso = torso;
    root.userData.headPivot = headPivot;
    root.userData.hairPivot = hairPivot;
    root.userData.armL = armL;
    root.userData.armR = armR;
    root.userData.legL = legL;
    root.userData.legR = legR;
    root.userData.skirtPanels = skirtPanels;
    root.userData.ribbons = ribbons;
    root.userData.wheelHalo = wheelHalo;
    root.userData.robeMat = robeMat;
    root.userData.walkPhase = (e.id || 1) * 1.7;
    return root;
  };

  /**
   * 实时驱动人物全身 16+ 关节武学动作：步法、呼吸、蓄力拧腰、凌厉出招、受击硬直、破防踉跄、发丝与披帛飘舞
   */
  CH.animateArticulatedCharacter = function (mesh, e, t, dt, cameraPos, lockTargetId) {
    const ud = mesh.userData;
    const spd = Math.hypot(e.vx || 0, e.vz || 0);
    ud.walkPhase += dt * (2.6 + spd * 2.15);
    const wp = ud.walkPhase;
    const moveBlend = Math.min(1, spd / 3.4);

    // 1) 骨盆起伏 + 腿部步法（马步微蹲 / 疾步迈腿 / 弓步突刺）
    let pelvisY = 0.88 + Math.sin(t * 2.8 + (e.id || 0)) * 0.022;
    let pelvisPitch = 0;
    let torsoYaw = 0;
    let torsoPitch = 0;
    let rShX = -0.35, rShZ = -0.22, rElX = -0.55;
    let lShX = -0.25, lShZ = 0.28, lElX = -0.50;
    let legLX = Math.sin(wp) * 0.58 * moveBlend;
    let legRX = -Math.sin(wp) * 0.58 * moveBlend;
    let kneeL = Math.max(0, -Math.cos(wp)) * 0.62 * moveBlend + 0.14;
    let kneeR = Math.max(0, Math.cos(wp)) * 0.62 * moveBlend + 0.14;

    if (e.isNpc) {
      // 小龙女飘然凌波微步浮空与广袖轻扬
      pelvisY = 0.94 + Math.sin(t * 2.2) * 0.06;
      torsoYaw = Math.sin(t * 1.1) * 0.16;
      rShX = -0.42 + Math.sin(t * 1.8) * 0.12;
      rShZ = -0.35;
      lShX = -0.25 + Math.cos(t * 1.6) * 0.15;
      lShZ = 0.45;
      lElX = -0.75;
    } else if (e.staggerTimer > 0) {
      // 破防硬直：弯腰喘息、兵器下垂、头晕晃动
      pelvisY = 0.72;
      torsoPitch = 0.48 + Math.sin(t * 8) * 0.06;
      torsoYaw = Math.sin(t * 5) * 0.22;
      rShX = 0.35; rShZ = -0.32; rElX = -0.20;
      lShX = 0.28; lShZ = 0.38; lElX = -0.25;
      legLX = -0.28; legRX = 0.28; kneeL = 0.52; kneeR = 0.52;
    } else if (e.hitFlash > 0) {
      // 受击瞬间仰身硬直
      torsoPitch = -0.34;
      torsoYaw = -0.35;
      rShX = -0.75; rShZ = -0.55;
      lShX = -0.65; lShZ = 0.65;
    } else if (e.state === 'windup') {
      // 武学蓄力起手：深蹲蓄势、大幅拧腰、举兵过顶/侧蓄！
      const prog = Math.max(0, Math.min(1, 1 - e.stateTimer / Math.max(0.05, e.windupMax)));
      const ease = Math.sin(prog * Math.PI * 0.5);
      pelvisY = 0.80 - ease * 0.09;
      torsoYaw = -0.82 * ease;
      torsoPitch = -0.14 * ease;
      rShX = -2.15 * ease - 0.35;
      rShZ = -0.45 * ease - 0.18;
      rElX = -0.85 * ease;
      lShX = -0.65 * ease;
      lShZ = 0.58 * ease + 0.2;
      lElX = -0.85;
      legLX = -0.42 * ease; legRX = 0.44 * ease;
      kneeL = 0.46 * ease + 0.15; kneeR = 0.42 * ease + 0.15;
    } else if (e.swingVisual > 0) {
      // 凌厉挥砍收招：腰胯骤然前甩 + 弓步前冲 + 剑臂全展！
      const p = 1 - e.swingVisual / 0.34;
      const snap = Math.sin(Math.min(1, p * 1.4) * Math.PI * 0.5);
      pelvisY = 0.80;
      pelvisPitch = 0.18 * snap;
      torsoYaw = -0.75 + 1.85 * snap;
      torsoPitch = 0.26 * snap;
      rShX = -2.2 + 2.85 * snap;
      rShZ = -0.25 + 0.55 * snap;
      rElX = -0.15;
      lShX = 0.55 * snap;
      lShZ = 0.52;
      legLX = 0.52 * snap; legRX = -0.48 * snap;
      kneeL = 0.48; kneeR = 0.22;
    } else {
      // 战斗游走与马步迎敌起手架势
      pelvisY = 0.86 + Math.abs(Math.sin(wp)) * 0.04 * moveBlend;
      torsoYaw = Math.sin(t * 2.2 + (e.id || 0)) * 0.16 + Math.sin(wp) * 0.12 * moveBlend;
      torsoPitch = 0.08 + moveBlend * 0.10;
      rShX = -0.58 + Math.sin(t * 3.1 + (e.id || 0)) * 0.10 - Math.sin(wp) * 0.25 * moveBlend;
      rShZ = -0.26;
      rElX = -0.68;
      lShX = -0.42 + Math.cos(t * 2.8 + (e.id || 0)) * 0.12 + Math.sin(wp) * 0.30 * moveBlend;
      lShZ = 0.36;
      lElX = -0.82;
    }

    // 平滑插值骨骼姿态，消除僵硬跳帧
    const k = Math.min(1, dt * 15);
    ud.pelvis.position.y += (pelvisY - ud.pelvis.position.y) * k;
    ud.pelvis.rotation.x += (pelvisPitch - ud.pelvis.rotation.x) * k;
    ud.torso.rotation.y += (torsoYaw - ud.torso.rotation.y) * k;
    ud.torso.rotation.x += (torsoPitch - ud.torso.rotation.x) * k;

    ud.armR.shoulder.rotation.x += (rShX - ud.armR.shoulder.rotation.x) * k;
    ud.armR.shoulder.rotation.z += (rShZ - ud.armR.shoulder.rotation.z) * k;
    ud.armR.elbow.rotation.x += (rElX - ud.armR.elbow.rotation.x) * k;

    ud.armL.shoulder.rotation.x += (lShX - ud.armL.shoulder.rotation.x) * k;
    ud.armL.shoulder.rotation.z += (lShZ - ud.armL.shoulder.rotation.z) * k;
    ud.armL.elbow.rotation.x += (lElX - ud.armL.elbow.rotation.x) * k;

    ud.legL.hip.rotation.x += (legLX - ud.legL.hip.rotation.x) * k;
    ud.legR.hip.rotation.x += (legRX - ud.legR.hip.rotation.x) * k;
    ud.legL.knee.rotation.x += (kneeL - ud.legL.knee.rotation.x) * k;
    ud.legR.knee.rotation.x += (kneeR - ud.legR.knee.rotation.x) * k;

    // 头部始终注视杨过（抵消部分拧腰，眼神凌厉锁敌！）
    ud.headPivot.rotation.y += (-torsoYaw * 0.65 - ud.headPivot.rotation.y) * k;
    ud.headPivot.rotation.x += ((e.staggerTimer > 0 ? 0.32 : -torsoPitch * 0.45) - ud.headPivot.rotation.x) * k;

    // 长发、四片裙摆、仙剑披帛实时随风与步速飘动
    const wind = 0.18 + moveBlend * 0.42 + (e.swingVisual > 0 ? 0.45 : 0);
    ud.hairPivot.rotation.x = wind + Math.sin(t * 5.2 + (e.id || 0)) * 0.14;
    ud.hairPivot.rotation.z = Math.cos(t * 3.8 + (e.id || 0)) * 0.09 - torsoYaw * 0.25;

    for (let i = 0; i < ud.skirtPanels.length; i++) {
      const sp = ud.skirtPanels[i];
      sp.rotation.x = -0.10 - wind * 0.32 + Math.sin(wp + i * 1.5) * 0.14 * (0.35 + moveBlend);
    }
    for (const r of ud.ribbons) {
      r.seg1.rotation.z = r.side * (0.38 + Math.sin(t * 3.2 + r.side) * 0.22);
      r.seg1.rotation.x = wind * 0.95 + Math.cos(t * 3.6 + r.side) * 0.24;
      r.seg2.rotation.x = 0.28 + Math.sin(t * 5.4 + r.side * 2) * 0.34;
      r.seg2.rotation.z = r.side * Math.cos(t * 4.2) * 0.26;
    }

    // 拂尘尘丝动态甩动
    if (ud.armR.weapon?.userData?.whiskRoot) {
      ud.armR.weapon.userData.whiskRoot.rotation.x = Math.sin(t * 8) * 0.18 + (e.swingVisual > 0 ? 0.55 : 0);
    }
    // 金轮法王五轮大转
    if (ud.wheelHalo) {
      ud.wheelHalo.rotation.z += dt * (e.phase2 ? 6.2 : 3.0);
    }

    if (e.isNpc) return;

    // 战斗发光反馈：受击闪白、三色预警光晶与破防光环
    ud.robeMat.emissive.setHex(e.hitFlash > 0 ? 0xffe4e6 : 0x000000);
    ud.robeMat.emissiveIntensity = e.hitFlash > 0 ? 0.72 : 0;

    if (e.staggerTimer > 0) {
      ud.staggerRing.visible = true;
      ud.staggerRing.rotation.z += dt * 6;
      ud.perilMat.opacity = 0;
      ud.ringMat.color.setHex(0xfde047);
      ud.ringMat.opacity = 0.72;
    } else {
      ud.staggerRing.visible = false;
      if (e.state === 'windup') {
        const prog = 1 - e.stateTimer / Math.max(0.05, e.windupMax);
        const col = e.attackKind === 'unblock' ? 0xfacc15 : (e.attackKind === 'peril' ? 0xf43f5e : 0xe2e8f0);
        ud.ringMat.color.setHex(col);
        ud.ringMat.opacity = 0.45 + prog * 0.5;
        ud.perilMat.color.setHex(col);
        ud.perilMat.opacity = 0.6 + Math.sin(t * 24) * 0.35;
        ud.perilBeacon.scale.setScalar(0.8 + prog * 0.75);
        ud.perilBeacon.rotation.y += dt * 8;
      } else {
        ud.perilMat.opacity = 0;
        ud.ringMat.color.setHex(lockTargetId === e.id ? 0x38bdf8 : 0xffffff);
        ud.ringMat.opacity = lockTargetId === e.id ? 0.65 : 0.22;
      }
    }

    if (ud.hpBar && ud.hpFill && cameraPos) {
      ud.hpBar.lookAt(cameraPos);
      const ratio = Math.max(0.01, e.hp / e.maxHp);
      ud.hpFill.scale.x = ratio;
      ud.hpFill.position.x = -(1 - ratio) * 0.45;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
