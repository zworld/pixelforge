/* 神雕侠侣 · 问情剑 — 极致拟人化高模骨骼角色引擎（15K 写实雕刻人形 + 官方女性/男性动作捕捉库 + 绝美自然面容/古风丝绸法线衣袍 + 真实手骨兵器/五轮/仙剑披帛） */
(function (G) {
  'use strict';
  const CH = (G.CH = G.CH || {});
  const Studio = G.Studio;
  const Assets = Studio && Studio.Assets3D;

  /** 构建精细武侠兵器模型（挂载至真实人体手骨） */
  function buildWeaponMesh(spec) {
    const g = new THREE.Group();
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.16 });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.88, roughness: 0.22, emissive: 0x92400e, emissiveIntensity: 0.25 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.72, roughness: 0.35 });

    if (spec === 'whisk') {
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.030, 0.52, 8), goldMat);
      handle.position.y = 0.24;
      g.add(handle);
      const whiskRoot = new THREE.Group();
      whiskRoot.position.y = 0.52;
      const strandMat = new THREE.MeshStandardMaterial({ color: 0xf5d0fe, emissive: 0xc026d3, emissiveIntensity: 0.55, roughness: 0.3 });
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        const r = i === 0 ? 0 : 0.052;
        const strand = new THREE.Mesh(new THREE.ConeGeometry(0.030, 0.65, 6), strandMat);
        strand.position.set(Math.cos(a) * r, 0.30, Math.sin(a) * r);
        strand.rotation.set(Math.sin(a) * 0.18, 0, -Math.cos(a) * 0.18);
        whiskRoot.add(strand);
      }
      g.add(whiskRoot);
      g.userData.whiskRoot = whiskRoot;
    } else if (spec === 'sawblade') {
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.24, 8), darkMat);
      const guard = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.018, 6, 12), goldMat);
      guard.position.y = 0.12;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.095, 0.96, 0.022), goldMat);
      blade.position.set(0.02, 0.62, 0);
      g.add(hilt, guard, blade);
      for (let i = 0; i < 6; i++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.08, 4), goldMat);
        tooth.position.set(-0.04, 0.26 + i * 0.12, 0);
        tooth.rotation.z = Math.PI * 0.55;
        g.add(tooth);
      }
    } else if (spec === 'greatsword') {
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.032, 0.34, 8), darkMat);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.06, 0.09), goldMat);
      guard.position.y = 0.18;
      const blade = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 1.36, 0.036),
        new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.88, roughness: 0.24, emissive: 0xd97706, emissiveIntensity: 0.35 })
      );
      blade.position.y = 0.86;
      const rune = new THREE.Mesh(new THREE.BoxGeometry(0.026, 1.05, 0.042), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
      rune.position.y = 0.84;
      g.add(hilt, guard, blade, rune);
    } else if (spec === 'halberd') {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.026, 1.48, 8), darkMat);
      pole.position.y = 0.55;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.54, 0.025), steelMat);
      head.position.set(0.04, 1.28, 0);
      const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.08, 8), goldMat);
      collar.position.y = 1.02;
      g.add(pole, head, collar);
    } else if (spec === 'chakram') {
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
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.022, 6, 16, Math.PI * 1.15), goldMat);
      bow.position.set(0, 0.15, 0.06);
      bow.rotation.z = -Math.PI * 0.57;
      g.add(bow);
    } else {
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.22, 8), darkMat);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.20, 0.036, 0.05), goldMat);
      guard.position.y = 0.11;
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.98, 0.016), steelMat);
      blade.position.y = 0.60;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.034, 0.16, 4), steelMat);
      tip.position.y = 1.16;
      tip.rotation.y = Math.PI * 0.25;
      tip.scale.set(1, 1, 0.35);
      g.add(hilt, guard, blade, tip);
    }
    return g;
  }

  /** 构建金轮法王背后五轮大转金环 */
  function buildFiveWheels() {
    const halo = new THREE.Group();
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, metalness: 0.92, roughness: 0.16, emissive: 0xd97706, emissiveIntensity: 0.55,
    });
    for (let k = 0; k < 5; k++) {
      const ang = (k / 5) * Math.PI * 2;
      const wg = new THREE.Group();
      wg.position.set(Math.cos(ang) * 0.78, Math.sin(ang) * 0.78, 0);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.042, 8, 18), wheelMat);
      const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.026, 0.02), wheelMat);
      const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.026, 0.44, 0.02), wheelMat);
      wg.add(ring, c1, c2);
      halo.add(wg);
    }
    return halo;
  }

  /** 构建古风轻纱柔边流光披帛丝带（挂载于背部脊骨，弧形垂落绝不生硬！） */
  function buildSilkRibbons(colorHex) {
    const grp = new THREE.Group();
    const ribTex = Assets && Assets.getSilkRibbonTexture ? Assets.getSilkRibbonTexture() : null;
    const mat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.35,
      alphaMap: ribTex,
      map: ribTex,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
      roughness: 0.28,
    });
    const list = [];
    for (const side of [-1, 1]) {
      const seg1 = new THREE.Group();
      seg1.position.set(side * 0.16, 0.08, -0.13);
      const m1 = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.56, 2, 6), mat);
      m1.position.y = -0.28;
      seg1.add(m1);
      const seg2 = new THREE.Group();
      seg2.position.y = -0.52;
      const m2 = new THREE.Mesh(new THREE.PlaneGeometry(0.10, 0.54, 2, 6), mat);
      m2.position.y = -0.27;
      seg2.add(m2);
      seg1.add(seg2);
      grp.add(seg1);
      list.push({ seg1, seg2, side });
    }
    return { grp, list };
  }

  /** 构建古风江湖武者 3D 护肩甲片与束腰佩带（让写实人类剪影一眼呈现纯正宋元武侠风韵！） */
  function buildWuxiaAccents(clothTop) {
    const isArmor = clothTop === 'mongol_armor' || clothTop === 'lama_robe';
    const trimCol = isArmor ? 0xd97706 : (clothTop === 'valley_lord' ? 0xfbbf24 : 0x94a3b8);
    const bodyCol = clothTop === 'mongol_armor' ? 0x3b2414
      : (clothTop === 'lama_robe' ? 0x8a1c14
      : (clothTop === 'valley_lord' ? 0x114c36
      : (clothTop === 'sword_hermit' ? 0x262d3a : 0x3b536b)));
    const clothMat = new THREE.MeshStandardMaterial({ color: bodyCol, roughness: 0.62, metalness: isArmor ? 0.45 : 0.12 });
    const trimMat = new THREE.MeshStandardMaterial({ color: trimCol, roughness: 0.28, metalness: 0.82 });

    // 背部/双肩护甲与云纹肩帔（挂载至 Spine2）
    const chestGrp = new THREE.Group();
    for (const side of [-1, 1]) {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.115, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.52), clothMat);
      pauldron.position.set(side * 0.21, 0.14, 0);
      pauldron.rotation.z = -side * 0.42;
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.015, 6, 14), trimMat);
      rim.rotation.x = Math.PI * 0.5;
      rim.position.set(side * 0.21, 0.13, 0);
      rim.rotation.y = -side * 0.42;
      chestGrp.add(pauldron, rim);
    }

    // 束腰革带与垂落古风玉佩/衣袂前摆（挂载至 Hips）
    const hipGrp = new THREE.Group();
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.185, 0.195, 0.10, 14), clothMat);
    belt.position.y = 0.04;
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.08, 0.045), trimMat);
    buckle.position.set(0, 0.04, 0.185);
    const frontTab = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.44, 0.03), clothMat);
    frontTab.position.set(0, -0.22, 0.165);
    frontTab.rotation.x = -0.06;
    const tabBorder = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.035, 0.035), trimMat);
    tabBorder.position.set(0, -0.43, 0.175);
    const backTab = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.48, 0.03), clothMat);
    backTab.position.set(0, -0.24, -0.165);
    backTab.rotation.x = 0.08;
    hipGrp.add(belt, buckle, frontTab, tabBorder, backTab);

    return { chestGrp, hipGrp };
  }

  /** 按江湖身份分配最贴切的 10K~16K 高模写实人类角色 + 专属自然面容与古风丝绸/战甲织物 */
  function resolveModelSpec(e, palette) {
    if (e.npcId === 'xiaolongnu') {
      return {
        model: 'assets/models/woman_dress_rpm.glb',
        gender: 'F',
        height: 1.72,
        faceVariant: 'xiaolongnu',
        hairHex: 0x16141a,
        clothTop: 'xln_dress',
        footwearHex: 0xe2e8f0,
        emissive: 0x38bdf8,
        emissiveInt: 0.08,
        ribbonColor: 0xe0f2fe,
        weaponR: 'sword',
      };
    }
    if (e.bossId === 'limochou') {
      return {
        model: 'assets/models/woman_dress_rpm.glb',
        gender: 'F',
        height: 1.84,
        faceVariant: 'limochou',
        hairHex: 0x120e16,
        clothTop: 'lmc_dress',
        footwearHex: 0x2a1026,
        emissive: 0x581c87,
        emissiveInt: 0.14,
        ribbonColor: 0xe879f9,
        weaponR: 'whisk',
      };
    }
    if (e.bossId === 'gongsun') {
      return {
        model: 'assets/models/noble_rpm.glb',
        gender: 'M',
        height: 1.94,
        hideHeadwear: true,
        hairHex: 0x1c1917,
        clothTop: 'valley_lord',
        bottomHex: 0x0f2920,
        footwearHex: 0x1c1917,
        emissive: 0x14532d,
        emissiveInt: 0.10,
        weaponR: 'sawblade',
        weaponL: 'sword',
      };
    }
    if (e.bossId === 'dugu') {
      return {
        model: 'assets/models/noble_rpm.glb',
        gender: 'M',
        height: 2.02,
        hideHeadwear: true,
        hairHex: 0x94a3b8,
        clothTop: 'sword_hermit',
        bottomHex: 0x1e2430,
        footwearHex: 0x1c1917,
        emissive: 0xd97706,
        emissiveInt: 0.16,
        ribbonColor: 0xfbbf24,
        weaponR: 'greatsword',
      };
    }
    if (e.bossId === 'jinlun') {
      return {
        model: 'assets/models/master_rpm.glb',
        gender: 'M',
        height: 2.08,
        hairHex: 0x1c1917,
        clothTop: 'lama_robe',
        bottomHex: 0x5c140e,
        footwearHex: 0x2b1810,
        emissive: 0x991b1b,
        emissiveInt: 0.14,
        ribbonColor: 0xfacc15,
        weaponR: 'chakram',
        weaponL: 'chakram',
        fiveWheels: true,
      };
    }
    // 普通江湖武者 / 全真道士 / 绝情谷弟子 / 蒙古精兵：写实蓄须男性高模 + 官方男性动捕库！
    const isMongol = palette && (palette.body === 0x7c2d12 || palette.body === 0x451a03 || e.kind === 'brute');
    return {
      model: e.kind === 'brute' ? 'assets/models/master_rpm.glb' : 'assets/models/warrior_rpm.glb',
      gender: 'M',
      height: e.kind === 'brute' ? 1.92 : 1.78,
      hairHex: 0x1a1514,
      clothTop: isMongol ? 'mongol_armor' : 'taoist_robe',
      bottomHex: isMongol ? 0x2c1d14 : 0x263547,
      footwearHex: 0x1c1917,
      emissive: 0x000000,
      emissiveInt: 0,
      weaponR: e.kind === 'brute' ? 'halberd' : (e.kind === 'archer' ? 'bow' : 'sword'),
    };
  }

  /**
   * 创建极致拟人化武侠高模骨骼角色（15K 写实雕刻人类 + 官方动捕 + 真实挂件兵器与战斗预警光环）
   */
  CH.createArticulatedCharacter = function (e, palette) {
    const spec = resolveModelSpec(e, palette);
    const root = new THREE.Group();
    const modelWrap = new THREE.Group();
    root.add(modelWrap);

    let ring = null, ringMat = null, perilBeacon = null, perilMat = null, staggerRing = null, hpBar = null, hpFill = null;
    if (!e.isNpc) {
      ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
      ring = new THREE.Mesh(new THREE.RingGeometry(e.radius * 0.85, e.radius * 1.18, 28), ringMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      root.add(ring);

      perilMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e, transparent: true, opacity: 0 });
      perilBeacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), perilMat);
      perilBeacon.position.y = (e.height || 2.0) + 0.55;
      root.add(perilBeacon);

      staggerRing = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.045, 8, 20), new THREE.MeshBasicMaterial({ color: 0xfde047 }));
      staggerRing.rotation.x = Math.PI / 2;
      staggerRing.position.y = (e.height || 2.0) + 0.28;
      staggerRing.visible = false;
      root.add(staggerRing);

      if (!e.isBoss) {
        hpBar = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.10), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
        hpBar.position.y = (e.height || 1.9) + 0.22;
        hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.90, 0.06), new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide }));
        hpFill.position.z = 0.01;
        hpBar.add(hpFill);
        root.add(hpBar);
      }
    }

    const ud = {
      spec,
      modelWrap,
      modelRoot: null,
      loaded: false,
      mixer: null,
      actions: {},
      activeName: null,
      bones: {},
      mats: [],
      ribbons: [],
      wheelHalo: null,
      weaponRMesh: null,
      ring, ringMat, perilBeacon, perilMat, staggerRing, hpBar, hpFill,
      walkPhase: (e.id || 1) * 1.7,
    };
    root.userData = ud;

    if (Assets) {
      Promise.all([
        Assets.loadGLTF(spec.model),
        Assets.loadRPMClips(spec.gender),
      ])
        .then(([gltf, clips]) => {
          const model = Assets.cloneSkinned(gltf);
          const mats = [];
          const cleanFace = spec.faceVariant ? Assets.getCleanFemaleFace(spec.faceVariant) : null;
          const clothTex = spec.clothTop ? Assets.makeClothTexture(spec.clothTop) : null;

          model.traverse((obj) => {
            if (!obj.isMesh) return;
            const on = (obj.name || '').toLowerCase();
            // 隐藏现代牛仔帽，还原纯正东方宗师形象！
            if (spec.hideHeadwear && on.includes('headwear')) {
              obj.visible = false;
              return;
            }
            if (!obj.material) return;
            const mList = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mList) {
              const mn = (m.name || '').toLowerCase();
              const isSkin = mn.includes('skin') || on.includes('wolf3d_head');
              const isEye = mn.includes('eye') || on.includes('eye');
              const isTeeth = mn.includes('teeth');
              const isHair = mn.includes('hair') || mn.includes('beard') || on.includes('hair') || on.includes('beard');
              const isTop = mn.includes('outfit_top') || on.includes('outfit_top');
              const isBottom = mn.includes('outfit_bottom') || on.includes('outfit_bottom');
              const isFoot = mn.includes('footwear') || on.includes('footwear');

              if (isSkin) {
                if (cleanFace) {
                  m.map = cleanFace;
                  m.needsUpdate = true;
                }
                m.roughness = 0.56;
                m.metalness = 0.02;
              } else if (isEye) {
                m.roughness = 0.14;
                m.metalness = 0.05;
              } else if (isHair && spec.hairHex != null) {
                m.color.setHex(spec.hairHex);
                m.roughness = 0.50;
              } else if (isTop && clothTex) {
                m.map = clothTex;
                m.color.setHex(0xffffff);
                m.roughness = 0.68;
                m.needsUpdate = true;
              } else if (isBottom && spec.bottomHex != null) {
                m.color.setHex(spec.bottomHex);
                m.roughness = 0.78;
              } else if (isFoot && spec.footwearHex != null) {
                m.color.setHex(spec.footwearHex);
                m.roughness = 0.70;
              } else if (!isTeeth && m.color && spec.clothTop === 'xln_dress' && on.includes('wolf3d_body')) {
                m.color.setHex(0xfff5f0);
                m.roughness = 0.56;
              }

              if (!isSkin && !isEye && !isTeeth && m.emissive && spec.emissive) {
                m.emissive.setHex(spec.emissive);
                m.emissiveIntensity = spec.emissiveInt || 0;
              }
              mats.push({
                mat: m,
                baseEmissive: (!isSkin && !isEye && !isTeeth) ? (spec.emissive || 0x000000) : 0x000000,
                baseInt: (!isSkin && !isEye && !isTeeth) ? (spec.emissiveInt || 0) : 0,
              });
            }
          });

          const mixer = new THREE.AnimationMixer(model);
          const actions = {};
          for (const [clipName, clip] of Object.entries(clips || {})) {
            actions[clipName] = mixer.clipAction(clip);
          }

          const initAct = actions.Idle || Object.values(actions)[0];
          if (initAct) {
            initAct.reset().play();
            mixer.update(0.01);
            ud.activeName = 'Idle';
          }

          // RPM 角色原生朝向 +Z，正好对齐神雕侠侣敌我面向玩家方向（rotY = 0）！
          const { holder } = Assets.normalizeRig(model, spec.height, 0);
          modelWrap.add(holder);

          const bones = {
            hips: Assets.findBone(model, 'Hips'),
            spine2: Assets.findBone(model, 'Spine2') || Assets.findBone(model, 'Spine1'),
            head: Assets.findBone(model, 'Head'),
            leftArm: Assets.findBone(model, 'LeftArm'),
            leftForeArm: Assets.findBone(model, 'LeftForeArm'),
            leftHand: Assets.findBone(model, 'LeftHand'),
            rightArm: Assets.findBone(model, 'RightArm'),
            rightForeArm: Assets.findBone(model, 'RightForeArm'),
            rightHand: Assets.findBone(model, 'RightHand'),
          };

          const getCompScale = (bone) => {
            if (!bone) return 1;
            const ws = new THREE.Vector3();
            bone.getWorldScale(ws);
            return ws.y > 0.0001 ? 1 / ws.y : 1;
          };

          // 挂接精细 3D 武侠兵器到手骨
          if (spec.weaponR && bones.rightHand) {
            const w = buildWeaponMesh(spec.weaponR);
            const sc = getCompScale(bones.rightHand);
            w.scale.setScalar(sc);
            w.position.set(0, 0.05 * sc, 0.02 * sc);
            w.rotation.set(Math.PI * 0.42, 0, 0);
            bones.rightHand.add(w);
            ud.weaponRMesh = w;
          }
          if (spec.weaponL && bones.leftHand) {
            const wl = buildWeaponMesh(spec.weaponL);
            const sc = getCompScale(bones.leftHand);
            wl.scale.setScalar(sc);
            wl.position.set(0, 0.05 * sc, 0.02 * sc);
            wl.rotation.set(Math.PI * 0.42, 0, 0);
            bones.leftHand.add(wl);
          }

          // 挂接古风飘逸丝绸披帛 / 金轮法王五轮大转 / 男性武者古风护肩与垂摆束腰
          if (spec.ribbonColor && bones.spine2) {
            const { grp, list } = buildSilkRibbons(spec.ribbonColor);
            const sc = getCompScale(bones.spine2);
            grp.scale.setScalar(sc);
            bones.spine2.add(grp);
            ud.ribbons = list;
          }
          if (spec.gender === 'M' && spec.clothTop) {
            const { chestGrp, hipGrp } = buildWuxiaAccents(spec.clothTop);
            if (bones.spine2) {
              const sc = getCompScale(bones.spine2);
              chestGrp.scale.setScalar(sc);
              bones.spine2.add(chestGrp);
            }
            if (bones.hips) {
              const sc = getCompScale(bones.hips);
              hipGrp.scale.setScalar(sc);
              bones.hips.add(hipGrp);
            }
          }
          if (e.npcId === 'xiaolongnu') {
            // 为小龙女增加清冷柔美月华补光，凸显古墓仙姿与精细面容
            const xlnLight = new THREE.PointLight(0xe0f2fe, 1.5, 6.5);
            xlnLight.position.set(0.35, 1.85, 1.35);
            root.add(xlnLight);
          }
          if (spec.fiveWheels && bones.spine2) {
            const halo = buildFiveWheels();
            const sc = getCompScale(bones.spine2);
            halo.scale.setScalar(sc);
            halo.position.set(0, 0.16 * sc, -0.34 * sc);
            bones.spine2.add(halo);
            ud.wheelHalo = halo;
          }

          ud.modelRoot = model;
          ud.mixer = mixer;
          ud.actions = actions;
          ud.bones = bones;
          ud.mats = mats;
          ud.loaded = true;
        })
        .catch((err) => console.warn('CondorHero GLB load error:', err));
    }

    return root;
  };

  function fadeAction(ud, name, timeScale = 1.0) {
    if (!ud.actions[name]) return;
    const next = ud.actions[name];
    next.setEffectiveTimeScale(timeScale);
    if (ud.activeName === name) return;
    const prev = ud.activeName ? ud.actions[ud.activeName] : null;
    next.reset().play();
    if (prev && prev !== next) next.crossFadeFrom(prev, 0.16, false);
    ud.activeName = name;
  }

  const _slashDir = new THREE.Vector3();

  /**
   * 实时驱动拟人化武侠高模动作（官方男女动捕 Idle/Walk/Run + 精准矢量蓄力举剑/凌厉劈斩/受击后仰/破防踉跄！）
   */
  CH.animateArticulatedCharacter = function (mesh, e, t, dt, cameraPos, lockTargetId) {
    const ud = mesh.userData;
    const spd = Math.hypot(e.vx || 0, e.vz || 0);
    ud.walkPhase += dt * (2.6 + spd * 2.1);

    if (ud.loaded) {
      if (ud.mixer && Object.keys(ud.actions).length > 0) {
        if (spd > 2.8 && ud.actions.Run) {
          fadeAction(ud, 'Run', 1.05);
        } else if (spd > 0.35 && ud.actions.Walk) {
          fadeAction(ud, 'Walk', 1.12);
        } else if (ud.actions.Idle) {
          fadeAction(ud, 'Idle', 1.0);
        }
        ud.mixer.update(dt);
      }

      const b = ud.bones;
      const mr = ud.modelRoot;
      let wrapY = e.isNpc ? (Math.sin(t * 2.1) * 0.04) : 0;
      let wrapPitch = 0;
      let wrapYaw = 0;

      if (e.staggerTimer > 0) {
        wrapPitch = 0.25 + Math.sin(t * 8) * 0.05;
        wrapYaw = Math.sin(t * 5) * 0.16;
      } else if (e.hitFlash > 0) {
        wrapPitch = -0.16;
      } else if (e.state === 'windup') {
        const prog = Math.max(0, Math.min(1, 1 - e.stateTimer / Math.max(0.05, e.windupMax)));
        wrapYaw = -0.52 * prog;
        wrapPitch = -0.08 * prog;
        // 蓄力高举兵器（精准矢量指向斜上方！）
        if (Assets && mr && b.rightArm) {
          _slashDir.set(-0.35, 0.82 * prog + 0.1, 0.45);
          Assets.aimBoneAlong(b.rightArm, _slashDir, mr);
          if (b.rightForeArm) b.rightForeArm.quaternion.identity();
        }
      } else if (e.swingVisual > 0) {
        const p = 1 - e.swingVisual / 0.34;
        const snap = Math.sin(Math.min(1, p * 1.4) * Math.PI * 0.5);
        wrapYaw = -0.45 + 1.25 * snap;
        wrapPitch = 0.14 * snap;
        // 凌厉劈斩挥向前下方！
        if (Assets && mr && b.rightArm) {
          _slashDir.set(-0.2 + snap * 0.7, 0.75 - snap * 1.15, 0.85);
          Assets.aimBoneAlong(b.rightArm, _slashDir, mr);
          if (b.rightForeArm) b.rightForeArm.quaternion.identity();
        }
      }

      const k = Math.min(1, dt * 14);
      ud.modelWrap.position.y += (wrapY - ud.modelWrap.position.y) * k;
      ud.modelWrap.rotation.x += (wrapPitch - ud.modelWrap.rotation.x) * k;
      ud.modelWrap.rotation.y += (wrapYaw - ud.modelWrap.rotation.y) * k;

      for (const r of ud.ribbons) {
        r.seg1.rotation.z = r.side * (0.10 + Math.sin(t * 2.6 + r.side) * 0.08);
        r.seg1.rotation.x = 0.22 + Math.cos(t * 3.1 + r.side) * 0.14;
        r.seg2.rotation.x = 0.20 + Math.sin(t * 4.2 + r.side * 2) * 0.18;
      }
      if (ud.weaponRMesh?.userData?.whiskRoot) {
        ud.weaponRMesh.userData.whiskRoot.rotation.x = Math.sin(t * 8) * 0.18 + (e.swingVisual > 0 ? 0.55 : 0);
      }
      if (ud.wheelHalo) {
        ud.wheelHalo.rotation.z += dt * (e.phase2 ? 6.2 : 3.0);
      }

      for (const item of ud.mats) {
        if (!item.mat.emissive) continue;
        if (e.hitFlash > 0) {
          item.mat.emissive.setHex(0xffe4e6);
          item.mat.emissiveIntensity = 0.65;
        } else {
          item.mat.emissive.setHex(item.baseEmissive);
          item.mat.emissiveIntensity = item.baseInt;
        }
      }
    }

    if (e.isNpc) return;

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
