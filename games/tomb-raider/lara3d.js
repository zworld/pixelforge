/* 古墓丽影 · 秘鲁遗迹 — 拟人化高模骨骼角色（GLB 写实人体劳拉 + 动作捕捉待机/奔跑/双枪/攀爬/翻滚 + Khronos 写实动态雪狼 + 鳞甲法线霸王龙） */
(function (G) {
  'use strict';
  const TR = (G.TR = G.TR || {});
  const Studio = G.Studio;
  const PBR = Studio && Studio.PBR;
  const Assets = Studio && Studio.Assets3D;

  function enableShadows(root) {
    root.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
      }
    });
  }

  /** 构建精细金属 9mm 经典双枪（枪管沿局部 +Y 延伸，直接对齐 ReadyPlayerMe 手骨前指方向！） */
  function buildPistolMesh() {
    const g = new THREE.Group();
    const slideMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.16 });
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.72, metalness: 0.2 });
    // 握把沿局部 -Z（贴掌心），枪管沿局部 +Y（随手臂笔直向前指！）
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.055, 0.105), gripMat);
    grip.position.set(0, 0.03, -0.02);
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.036, 0.22, 0.048), slideMat);
    slide.position.set(0, 0.12, 0.035);
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, 0.24, 8), gripMat);
    barrel.position.set(0, 0.13, 0.038);
    const flash = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.11, 0),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.96 })
    );
    flash.scale.set(0.95, 2.4, 0.95);
    flash.position.set(0, 0.29, 0.038);
    flash.visible = false;
    g.add(slide, barrel, grip, flash);
    g.userData.flash = flash;
    return g;
  }

  /** 构建挂在真实人体 Spine2 背骨上的经典探险皮革背包 + 腰间攀岩斧 */
  function buildExplorerGear() {
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x462313, roughness: 0.55, metalness: 0.2 });
    const buckleMat = new THREE.MeshStandardMaterial({ color: 0xfbbf24, metalness: 0.90, roughness: 0.22 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0x9b7a4c, roughness: 0.85 });
    const steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, metalness: 0.92, roughness: 0.2 });

    const pack = new THREE.Group();
    const packBody = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.30, 0.125), leatherMat);
    const packFlap = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.10, 0.135), leatherMat);
    packFlap.position.y = 0.10;
    const packBuckle = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.048, 0.03), buckleMat);
    packBuckle.position.set(0, 0.045, -0.068);
    const ropeCoil = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 10), ropeMat);
    ropeCoil.rotation.z = Math.PI * 0.5;
    ropeCoil.position.set(0, -0.16, 0);
    // 挂在背包一侧的登山攀岩镐
    const axe = new THREE.Group();
    axe.position.set(0.15, -0.14, -0.02);
    axe.rotation.set(0.15, 0.2, -0.45);
    const axeHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.32, 8), new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.5 }));
    const axePick = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.018), steelMat);
    axePick.position.y = 0.14;
    axe.add(axeHandle, axePick);
    pack.add(packBody, packFlap, packBuckle, ropeCoil, axe);
    enableShadows(pack);
    return pack;
  }

  /**
   * 构建极致拟人化写实劳拉 (Lara Croft)：
   * 采用 16,467 面 ReadyPlayerMe 高模健美写实女性骨骼模型（独立写实眼球/自然裸妆面容/法线衣褶/栗色秀发），
   * 驱动官方女性动作捕捉动画库（F_Idle / F_Walk / F_Run / F_Fall），
   * 并在真实手骨与脊柱背骨上装配 9mm 双枪、皮革探险背包、登山攀岩斧与翡翠照明弹！
   */
  TR.createLaraRig = function () {
    const root = new THREE.Group();
    const rig = new THREE.Group();
    root.add(rig);

    const flareLight = new THREE.PointLight(0x4ade80, 0, 16);
    flareLight.position.set(0, 1.35, -0.45);
    const gunLight = new THREE.PointLight(0xfef08a, 0, 9.0);
    gunLight.position.set(0, 1.35, -0.68);
    // 电影级柔和主角轮廓补光（让劳拉在深邃古墓中也能清晰展现写实面容、发丝与装备金属细节！）
    const heroFillLight = new THREE.PointLight(0xfff1dc, 1.85, 8.5);
    heroFillLight.position.set(0.45, 2.05, -1.65);
    const heroBackRim = new THREE.PointLight(0xbae6fd, 0.95, 6.5);
    heroBackRim.position.set(-0.55, 1.85, 1.55);
    root.add(flareLight, gunLight, heroFillLight, heroBackRim);

    const placeholder = new THREE.Group();
    const phMat = new THREE.MeshStandardMaterial({ color: 0x139ea6, roughness: 0.6 });
    const phBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.18, 1.2, 6, 10), phMat);
    phBody.position.y = 0.85;
    placeholder.add(phBody);
    rig.add(placeholder);

    const stateData = {
      rig,
      placeholder,
      flareLight,
      gunLight,
      loaded: false,
      modelRoot: null,
      mixer: null,
      actions: {},
      activeActionName: null,
      bones: {},
      pistolL: null,
      pistolR: null,
      flareMesh: null,
      runPhase: 0,
    };
    root.userData = stateData;

    if (Assets) {
      Promise.all([
        Assets.loadGLTF('assets/models/lara_rpm.glb'),
        Assets.loadRPMClips('F'),
      ])
        .then(([gltf, clips]) => {
          const model = Assets.cloneSkinned(gltf);

          // 定制劳拉写实材质：自然无浓妆面容 + 栗棕发色 + 经典青灰探险背心（保留 100% 真实 3D 法线与粗糙度贴图！）
          const cleanFace = Assets.getCleanFemaleFace('lara');
          const laraOutfit = Assets.makeClothTexture('lara_top');
          model.traverse((obj) => {
            if (!obj.isMesh || !obj.material) return;
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
            for (const m of mats) {
              const mn = (m.name || '').toLowerCase();
              const on = (obj.name || '').toLowerCase();
              if (mn.includes('skin') || on.includes('wolf3d_head')) {
                m.map = cleanFace;
                m.roughness = 0.56;
                m.metalness = 0.02;
                m.needsUpdate = true;
              } else if (mn.includes('hair') || on.includes('hair')) {
                m.color.setHex(0x3b2214);
                m.roughness = 0.52;
              } else if (mn.includes('outfit_top') || on.includes('outfit_top')) {
                m.map = laraOutfit;
                m.color.setHex(0xffffff);
                m.roughness = 0.72;
                m.needsUpdate = true;
              } else if (mn.includes('outfit_bottom') || on.includes('outfit_bottom')) {
                // 经典古墓探险深橄榄棕工装长裤（保留 100% pants-adventure-01 真实褶皱与口袋 3D 法线！）
                m.color.setHex(0x4f4e3c);
                m.roughness = 0.80;
              } else if (mn.includes('footwear') || on.includes('footwear')) {
                m.color.setHex(0x3a281d);
                m.roughness = 0.70;
              } else if (mn.includes('body') || on.includes('wolf3d_body')) {
                // 健康自然的探险家肌肤质感
                m.roughness = 0.58;
              } else if (mn.includes('eye')) {
                m.roughness = 0.14;
                m.metalness = 0.05;
              }
            }
          });

          // 绑定 ReadyPlayerMe 官方女性动作捕捉库（Idle / Walk / Run / Fall）
          const mixer = new THREE.AnimationMixer(model);
          const actions = {};
          for (const [clipName, clip] of Object.entries(clips || {})) {
            actions[clipName] = mixer.clipAction(clip);
          }

          const initAct = actions.Idle || Object.values(actions)[0];
          if (initAct) {
            initAct.reset().play();
            mixer.update(0.01);
            stateData.activeActionName = 'Idle';
          }

          // 归一化至标准探险家身高 1.74m，并旋转 180° 面向游戏本地 -Z 前方（背对镜头望向遗迹！）
          const { holder } = Assets.normalizeRig(model, 1.74, Math.PI);
          rig.remove(placeholder);
          rig.add(holder);

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

          // 挂载 9mm 双枪至真实左右手骨（枪管沿局部 +Y 与前伸手臂完全同轴！）
          const pistolL = buildPistolMesh();
          const pistolR = buildPistolMesh();
          const flareMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(0.018, 0.018, 0.24, 8),
            new THREE.MeshBasicMaterial({ color: 0x4ade80 })
          );
          if (bones.leftHand) {
            const sc = getCompScale(bones.leftHand);
            pistolL.scale.setScalar(sc);
            pistolL.position.set(0, 0.04 * sc, 0.02 * sc);
            pistolL.visible = false;
            bones.leftHand.add(pistolL);

            flareMesh.scale.setScalar(sc);
            flareMesh.position.set(0, 0.09 * sc, 0.02 * sc);
            flareMesh.visible = false;
            bones.leftHand.add(flareMesh);
          }
          if (bones.rightHand) {
            const sc = getCompScale(bones.rightHand);
            pistolR.scale.setScalar(sc);
            pistolR.position.set(0, 0.04 * sc, 0.02 * sc);
            pistolR.visible = false;
            bones.rightHand.add(pistolR);
          }

          // 挂载探险皮革背包与攀岩斧到背部 Spine2（RPM 角色原生朝向 +Z，因此背侧是 -Z！）
          if (bones.spine2) {
            const sc = getCompScale(bones.spine2);
            const gear = buildExplorerGear();
            gear.scale.setScalar(sc);
            gear.position.set(0, 0.02 * sc, -0.155 * sc);
            bones.spine2.add(gear);
          }

          stateData.modelRoot = model;
          stateData.mixer = mixer;
          stateData.actions = actions;
          stateData.bones = bones;
          stateData.pistolL = pistolL;
          stateData.pistolR = pistolR;
          stateData.flareMesh = flareMesh;
          stateData.loaded = true;
        })
        .catch((err) => {
          console.warn('Lara GLB load fallback:', err);
        });
    }

    return root;
  };

  /** 平滑切播写实人体骨骼动作捕捉片段 */
  function playClip(ud, clipName, timeScale = 1.0) {
    if (!ud.actions || !ud.actions[clipName]) return;
    const next = ud.actions[clipName];
    next.setEffectiveTimeScale(timeScale);
    if (ud.activeActionName === clipName) return;
    const prev = ud.activeActionName ? ud.actions[ud.activeActionName] : null;
    next.reset().setEffectiveWeight(1).play();
    if (prev && prev !== next) {
      next.crossFadeFrom(prev, 0.16, false);
    }
    ud.activeActionName = clipName;
  }

  const _aimDirL = new THREE.Vector3();
  const _aimDirR = new THREE.Vector3();

  /** 驱动高模写实劳拉动作（官方动捕 Idle/Walk/Run/Fall + 精准矢量骨骼双枪瞄准/抓崖/推石/360° 体操空翻！） */
  TR.animateLara = function (mesh, s, t, dt) {
    const ud = mesh.userData;
    const spd = Math.hypot(s.vx, s.vz);
    ud.runPhase += dt * (2.5 + spd * 1.9);

    ud.gunLight.intensity = (s.muzzleL > 0 || s.muzzleR > 0) ? 7.5 : 0;
    const flareOn = s.flareTimer > 0;
    ud.flareLight.intensity = flareOn ? (3.4 + Math.sin(t * 22) * 0.45) : 0;

    if (!ud.loaded || !ud.mixer) return;

    // 1) 选择并平滑混合官方动作捕捉片段（修复使用 s.onGround，落地立即呈现自然写实待机/步行/奔跑！）
    if (s.action === 'jump' || s.action === 'fall' || (!s.onGround && s.action !== 'hang' && s.action !== 'climb')) {
      playClip(ud, ud.actions.Fall ? 'Fall' : 'Idle', 1.0);
    } else if (s.action === 'push') {
      playClip(ud, 'Walk', 0.85);
    } else if (spd > 4.2) {
      playClip(ud, 'Run', Math.max(0.95, Math.min(1.45, spd * 0.17)));
    } else if (spd > 0.55) {
      playClip(ud, 'Walk', Math.max(0.9, Math.min(1.5, spd * 0.35)));
    } else {
      playClip(ud, 'Idle', 1.0);
    }
    ud.mixer.update(dt);

    // 2) 全身运动姿态（360° 空翻转滚 / 推石前倾 / 攀爬前倾）
    let rigY = 0, rigPitch = 0, rigRoll = 0;
    if (s.action === 'roll') {
      const p = 1 - s.rollTimer / 0.36;
      rigY = Math.sin(p * Math.PI) * 0.62;
      if (s.rollKind === 'back') rigPitch = p * Math.PI * 2;
      else if (s.rollKind === 'left') rigRoll = p * Math.PI * 2;
      else if (s.rollKind === 'right') rigRoll = -p * Math.PI * 2;
      else rigPitch = -p * Math.PI * 2;
    } else if (s.action === 'push') {
      rigPitch = -0.24;
    } else if (s.action === 'climb') {
      rigPitch = -0.20;
    }

    const k = Math.min(1, dt * 16);
    ud.rig.position.y += (rigY - ud.rig.position.y) * k;
    ud.rig.rotation.x = s.action === 'roll' ? rigPitch : ud.rig.rotation.x + (rigPitch - ud.rig.rotation.x) * k;
    ud.rig.rotation.z = s.action === 'roll' ? rigRoll : ud.rig.rotation.z + (rigRoll - ud.rig.rotation.z) * k;

    // 3) 精准矢量解算双臂指向（RPM 原生模型前方为 +Z，因此双臂直指 +Z 即正对劳拉视野前方！）
    const gunsOut = s.weaponsDrawn && s.action !== 'hang' && s.action !== 'climb' && s.action !== 'push';
    if (ud.pistolL) {
      ud.pistolL.visible = gunsOut;
      ud.pistolL.userData.flash.visible = s.muzzleL > 0;
    }
    if (ud.pistolR) {
      ud.pistolR.visible = gunsOut;
      ud.pistolR.userData.flash.visible = s.muzzleR > 0;
    }
    if (ud.flareMesh) {
      ud.flareMesh.visible = flareOn && !gunsOut;
    }

    const { leftArm, rightArm, leftForeArm, rightForeArm } = ud.bones;
    const mr = ud.modelRoot;
    if (Assets && mr) {
      if (s.action === 'hang') {
        _aimDirL.set(0.08, 0.98, 0.16);
        _aimDirR.set(-0.08, 0.98, 0.16);
        Assets.aimBoneAlong(leftArm, _aimDirL, mr);
        Assets.aimBoneAlong(rightArm, _aimDirR, mr);
        if (leftForeArm) leftForeArm.quaternion.identity();
        if (rightForeArm) rightForeArm.quaternion.identity();
      } else if (s.action === 'push') {
        _aimDirL.set(0.06, 0.08, 0.99);
        _aimDirR.set(-0.06, 0.08, 0.99);
        Assets.aimBoneAlong(leftArm, _aimDirL, mr);
        Assets.aimBoneAlong(rightArm, _aimDirR, mr);
        if (leftForeArm) leftForeArm.quaternion.identity();
        if (rightForeArm) rightForeArm.quaternion.identity();
      } else if (gunsOut) {
        const recL = s.muzzleL > 0 ? 0.24 : 0.04;
        const recR = s.muzzleR > 0 ? 0.24 : 0.04;
        _aimDirL.set(-0.06, recL, 0.98);
        _aimDirR.set(0.06, recR, 0.98);
        Assets.aimBoneAlong(leftArm, _aimDirL, mr);
        Assets.aimBoneAlong(rightArm, _aimDirR, mr);
        if (leftForeArm) leftForeArm.quaternion.identity();
        if (rightForeArm) rightForeArm.quaternion.identity();
      } else if (flareOn) {
        _aimDirL.set(0.18, 0.32, 0.92);
        Assets.aimBoneAlong(leftArm, _aimDirL, mr);
        if (leftForeArm) leftForeArm.quaternion.identity();
      }
    }
  };

  /** 史前霸王龙 512px PBR 鳞片法线材质 */
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
      a.fillStyle = 'rgba(18, 28, 9, 0.52)';
      for (let x = 22; x < s; x += 48) {
        a.beginPath();
        a.ellipse(x, 120 + (x % 3) * 45, 14, 110, 0.22, 0, Math.PI * 2);
        a.fill();
      }
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
        }
      }
    }, { normalStrength: 3.0 });
    return { ...maps, roughness: 0.70, metalness: 0.08, normalScale: new THREE.Vector2(1.15, 1.15) };
  }

  function makeFurPBR(key, baseHex, darkHex) {
    if (!PBR) return { color: baseHex, roughness: 0.85 };
    const maps = PBR.makePBRTextures('fur_' + key, 256, (a, h, r, s) => {
      a.fillStyle = baseHex; a.fillRect(0, 0, s, s);
      h.fillStyle = '#707070'; h.fillRect(0, 0, s, s);
      r.fillStyle = '#d8d8d8'; r.fillRect(0, 0, s, s);
      for (let i = 0; i < 600; i++) {
        const x = (i * 53) % s, y = (i * 97) % s;
        a.strokeStyle = i % 3 === 0 ? darkHex : 'rgba(255,255,255,0.12)';
        a.lineWidth = 2;
        a.beginPath(); a.moveTo(x, y); a.lineTo(x + 2, y + 14); a.stroke();
        h.strokeStyle = i % 2 === 0 ? '#b4b4b4' : '#404040';
        h.beginPath(); h.moveTo(x, y); h.lineTo(x + 2, y + 14); h.stroke();
      }
    }, { normalStrength: 2.2 });
    return { ...maps, roughness: 0.88, metalness: 0.02, normalScale: new THREE.Vector2(0.85, 0.85) };
  }

  /** 构建掠食者：雪狼采用 Khronos 写实骨骼 Fox.glb（银灰雪狼涂装 + 原生奔跑动画），巨熊与霸王龙采用 3A 有机雕塑骨骼 */
  TR.createEnemyRig = function (e) {
    const root = new THREE.Group();

    // ---- 1) 秘鲁雪狼：加载官方 Khronos 高模写实骨骼 Fox.glb 并调色为银灰安第斯雪狼！ ----
    if (e.kind === 'wolf' && Assets) {
      const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.10), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
      hpBg.position.y = 1.38;
      const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.90, 0.06), new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide }));
      hpFill.position.z = 0.01;
      hpBg.add(hpFill);
      root.add(hpBg);

      const ud = { kind: 'wolf_glb', hpBg, hpFill, mixer: null, actions: {}, activeName: null, mats: [], loaded: false };
      root.userData = ud;

      Assets.loadGLTF('assets/models/Fox.glb')
        .then((gltf) => {
          const model = Assets.cloneSkinned(gltf);
          const mats = [];
          const wolfTex = Assets.makeWolfFurTexture ? Assets.makeWolfFurTexture() : null;
          model.traverse((obj) => {
            if (obj.isMesh && obj.material) {
              const m = obj.material;
              // 替换为安第斯银灰雪狼毛皮贴图，呈现冷峻高原野狼质感！
              if (wolfTex) {
                m.map = wolfTex;
                m.needsUpdate = true;
              }
              if (m.color) m.color.setHex(0xd8e2ec);
              m.roughness = 0.84;
              mats.push(m);
            }
          });
          const mixer = new THREE.AnimationMixer(model);
          const actions = {};
          for (const clip of (gltf.animations || [])) actions[clip.name] = mixer.clipAction(clip);
          const initAct = actions.Survey || Object.values(actions)[0];
          if (initAct) { initAct.play(); mixer.update(0.01); ud.activeName = initAct.getClip().name; }

          const { holder } = Assets.normalizeRig(model, 1.02, 0);
          root.add(holder);
          ud.mixer = mixer;
          ud.actions = actions;
          ud.mats = mats;
          ud.loaded = true;
        })
        .catch((err) => console.warn('Wolf GLB fallback:', err));

      return root;
    }

    // ---- 2) 史前霸王龙 Boss ----
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

      const bodyProfile = [
        new THREE.Vector2(0.05, -1.9), new THREE.Vector2(0.68, -1.55), new THREE.Vector2(1.06, -0.75),
        new THREE.Vector2(1.18, 0.2), new THREE.Vector2(0.98, 1.15), new THREE.Vector2(0.62, 1.72), new THREE.Vector2(0.05, 1.85),
      ];
      const torso = new THREE.Mesh(new THREE.LatheGeometry(bodyProfile, 18), skinMat);
      torso.rotation.x = Math.PI * 0.5;
      torso.scale.set(0.86, 1.0, 0.94);
      bodyPivot.add(torso);

      for (let i = 0; i < 8; i++) {
        const scute = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.34, 5), ridgeMat);
        scute.position.set(0, 0.96 - Math.abs(i - 3) * 0.06, 1.3 - i * 0.42);
        scute.rotation.x = -0.35;
        bodyPivot.add(scute);
      }

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
      const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.52, 1.35, 12), skinMat);
      snout.rotation.x = Math.PI * 0.5;
      snout.scale.set(0.88, 1.0, 0.78);
      snout.position.set(0, 0.16, 0.85);
      const palate = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.12, 1.15), mouthMat);
      palate.position.set(0, -0.08, 0.72);
      headPivot.add(cranium, snout, palate);

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

      for (const s of [-1, 1]) {
        const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.48, 5, 8), skinMat);
        arm.position.set(s * 0.72, -0.38, 1.22);
        arm.rotation.x = -0.85;
        bodyPivot.add(arm);
      }

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

    // ---- 3) 古殿巨熊 (bear) ----
    const sc = 1.48;
    const furMat = new THREE.MeshStandardMaterial(makeFurPBR('bear', '#5b3922', '#2d190c'));
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0x7c5334, roughness: 0.85 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });

    const body = new THREE.Group();
    body.scale.setScalar(sc);
    body.position.y = 0.64 * sc;
    root.add(body);

    const beastProfile = [
      new THREE.Vector2(0.04, -0.58), new THREE.Vector2(0.32, -0.40), new THREE.Vector2(0.36, 0.05),
      new THREE.Vector2(0.38, 0.35), new THREE.Vector2(0.24, 0.55), new THREE.Vector2(0.04, 0.62),
    ];
    const torso = new THREE.Mesh(new THREE.LatheGeometry(beastProfile, 14), furMat);
    torso.rotation.x = Math.PI * 0.5;
    body.add(torso);

    const ruff = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), bellyMat);
    ruff.position.set(0, 0.06, 0.38);
    ruff.scale.set(0.95, 1.05, 0.85);
    body.add(ruff);

    const head = new THREE.Group();
    head.position.set(0, 0.16, 0.56);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), furMat);
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.105, 0.24, 10), bellyMat);
    snout.rotation.x = Math.PI * 0.5;
    snout.position.set(0, -0.045, 0.20);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 }));
    nose.position.set(0, -0.02, 0.33);
    head.add(skull, snout, nose);

    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.068, 8, 8), furMat);
      ear.position.set(s * 0.12, 0.19, -0.02);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.030, 8, 8), eyeMat);
      eye.position.set(s * 0.088, 0.045, 0.155);
      head.add(ear, eye);
    }
    body.add(head);

    const tail = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.08, 5, 8), bellyMat);
    tail.position.set(0, 0.04, -0.66);
    body.add(tail);

    const legs = [];
    for (const [lx, lz, back] of [[-0.17, 0.34, false], [0.17, 0.34, false], [-0.17, -0.34, true], [0.17, -0.34, true]]) {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.06, lz);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.24, 5, 8), furMat);
      upper.position.set(0, -0.15, back ? -0.04 : 0.02);
      const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.068, 0.24, 5, 8), bellyMat);
      lower.position.set(0, -0.40, back ? -0.02 : 0.02);
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), furMat);
      paw.scale.set(1, 0.6, 1.35);
      paw.position.set(0, -0.54, 0.04);
      leg.add(upper, lower, paw);
      body.add(leg);
      legs.push(leg);
    }

    enableShadows(root);

    const hpBg = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.10), new THREE.MeshBasicMaterial({ color: 0x0f172a, side: THREE.DoubleSide }));
    hpBg.position.y = e.height + 0.38;
    const hpFill = new THREE.Mesh(new THREE.PlaneGeometry(0.90, 0.06), new THREE.MeshBasicMaterial({ color: 0xf43f5e, side: THREE.DoubleSide }));
    hpFill.position.z = 0.01;
    hpBg.add(hpFill);
    root.add(hpBg);

    root.userData = { kind: 'bear', body, head, tail, legs, mainMat: furMat, hpBg, hpFill, stride: 0 };
    return root;
  };

  /** 实时驱动 GLB 写实雪狼 / 雕塑巨熊 / 霸王龙 Boss 动画 */
  TR.animateEnemy = function (mesh, e, t, dt, cameraPos) {
    const ud = mesh.userData;
    const spd = Math.hypot(e.vx || 0, e.vz || 0);

    if (ud.kind === 'wolf_glb') {
      if (ud.loaded && ud.mixer) {
        const want = spd > 3.6 ? 'Run' : (spd > 0.4 ? 'Walk' : 'Survey');
        if (ud.actions[want] && ud.activeName !== want) {
          const prev = ud.activeName ? ud.actions[ud.activeName] : null;
          ud.actions[want].reset().play();
          if (prev) ud.actions[want].crossFadeFrom(prev, 0.18, false);
          ud.activeName = want;
        }
        ud.mixer.update(dt * (want === 'Run' ? 1.35 : 1.0));
        for (const m of ud.mats) {
          if (m.emissive) {
            m.emissive.setHex(e.hitFlash > 0 ? 0xfca5a5 : (e.state === 'windup' ? 0x991b1b : 0x000000));
            m.emissiveIntensity = e.hitFlash > 0 ? 0.45 : (e.state === 'windup' ? 0.35 : 0);
          }
        }
      }
      if (ud.hpBg && ud.hpFill && cameraPos) {
        ud.hpBg.lookAt(cameraPos);
        const r = Math.max(0.01, e.hp / e.maxHp);
        ud.hpFill.scale.x = r;
        ud.hpFill.position.x = -(1 - r) * 0.45;
      }
      return;
    }

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
    ud.body.rotation.x = e.state === 'windup' ? -0.55 : (e.state === 'lunge' ? 0.22 : 0);

    if (ud.hpBg && ud.hpFill && cameraPos) {
      ud.hpBg.lookAt(cameraPos);
      const r = Math.max(0.01, e.hp / e.maxHp);
      ud.hpFill.scale.x = r;
      ud.hpFill.position.x = -(1 - r) * 0.45;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
