/* Studio Core — 3A 写实拟人化 3D 资产引擎（ReadyPlayerMe 15K 高模骨骼人、官方动捕库、自然写实人脸/丝绸/战术织物贴图覆写、Poly Haven 实拍 PBR 与轻量摄影测量道具） */
(function (G) {
  'use strict';
  const Studio = (G.Studio = G.Studio || {});
  const Assets = (Studio.Assets3D = {});

  const gltfCache = new Map();
  const gltfPending = new Map();
  const texCache = new Map();
  const faceCache = new Map();
  const clothCache = new Map();
  const rpmClipCache = new Map();

  let gltfLoader = null;
  let texLoader = null;

  function ensureLoaders() {
    const THREE = G.THREE;
    if (!gltfLoader && THREE && THREE.GLTFLoader) gltfLoader = new THREE.GLTFLoader();
    if (!texLoader && THREE) texLoader = new THREE.TextureLoader();
  }

  /** 异步加载并缓存 GLB/GLTF 资产（多实例共享解析结果） */
  Assets.loadGLTF = function (url) {
    if (gltfCache.has(url)) return Promise.resolve(gltfCache.get(url));
    if (gltfPending.has(url)) return gltfPending.get(url);
    ensureLoaders();
    if (!gltfLoader) return Promise.reject(new Error('THREE.GLTFLoader 未加载'));

    const p = new Promise((resolve, reject) => {
      gltfLoader.load(
        url,
        (gltf) => {
          gltfCache.set(url, gltf);
          gltfPending.delete(url);
          resolve(gltf);
        },
        undefined,
        (err) => {
          gltfPending.delete(url);
          reject(err);
        }
      );
    });
    gltfPending.set(url, p);
    return p;
  };

  /** 安全克隆带 SkinnedMesh 蒙皮骨骼的角色模型（每个角色独立材质实例以便单独染色/受击闪光） */
  Assets.cloneSkinned = function (gltf) {
    const THREE = G.THREE;
    const cloned = THREE.SkeletonUtils ? THREE.SkeletonUtils.clone(gltf.scene) : gltf.scene.clone(true);
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = true;
        obj.receiveShadow = true;
        obj.frustumCulled = false;
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material = obj.material.map((m) => m.clone());
          else obj.material = obj.material.clone();
        }
      }
    });
    return cloned;
  };

  /** 轻量克隆静态摄影测量环境道具（共享几何体与贴图显存，大幅降低 Draw/Shadow 负担） */
  Assets.cloneProp = function (gltf, opts = {}) {
    const cloned = gltf.scene.clone(true);
    const cast = !!opts.castShadow;
    const tint = opts.tint != null ? new G.THREE.Color(opts.tint) : null;
    cloned.traverse((obj) => {
      if (obj.isMesh) {
        obj.castShadow = cast;
        obj.receiveShadow = true;
        if (tint && obj.material) {
          obj.material = obj.material.clone();
          if (obj.material.color) obj.material.color.multiply(tint);
        }
      }
    });
    return cloned;
  };

  /** 智能按骨骼后缀查找真实人体关节（兼容 Hips / mixamorig:Hips / RightHand 等命名） */
  Assets.findBone = function (root, shortName) {
    let found = null;
    const target = shortName.toLowerCase();
    root.traverse((obj) => {
      if (found || !obj.name) return;
      const n = obj.name.toLowerCase();
      if (n === target || n === 'mixamorig:' + target || n === 'mixamorig' + target || n.endsWith(':' + target) || n.endsWith('_' + target)) {
        found = obj;
      }
    });
    return found;
  };

  /**
   * 清洗动作捕捉动画轨：将根骨 Hips 水平 X/Z 位移归零（彻底消除原点偏移与漂移），保留自然垂直重心起伏与完整肢体动捕！
   */
  Assets.makeInPlaceClip = function (clip, opts = {}) {
    const cloned = clip.clone();
    const stripPrefix = !!opts.stripMixamoPrefix;
    for (const tr of cloned.tracks) {
      if (stripPrefix) tr.name = tr.name.replace(/^mixamorig:/, '');
      if (/hips\.position$/i.test(tr.name)) {
        const vals = tr.values;
        for (let i = 0; i < vals.length; i += 3) {
          vals[i] = 0;
          vals[i + 2] = 0;
        }
      }
    }
    return cloned;
  };

  /**
   * 预载 ReadyPlayerMe 官方动作捕捉动画库（女性 F: Idle/Walk/Run/Fall；男性 M: Idle/Walk/Run）
   */
  Assets.loadRPMClips = function (gender = 'F') {
    const key = gender === 'M' ? 'M' : 'F';
    if (rpmClipCache.has(key)) return rpmClipCache.get(key);
    const defs = key === 'F'
      ? {
          Idle: 'assets/anims/F_Idle.glb',
          Walk: 'assets/anims/F_Walk.glb',
          Run: 'assets/anims/F_Run.glb',
          Fall: 'assets/anims/F_Fall.glb',
        }
      : {
          Idle: 'assets/anims/M_Idle.glb',
          Walk: 'assets/anims/M_Walk.glb',
          Run: 'assets/anims/M_Run.glb',
        };
    const entries = Object.entries(defs);
    const p = Promise.all(
      entries.map(([name, url]) =>
        Assets.loadGLTF(url).then((gltf) => {
          const raw = gltf.animations && gltf.animations[0];
          return [name, raw ? Assets.makeInPlaceClip(raw) : null];
        })
      )
    ).then((pairs) => {
      const out = {};
      for (const [n, clip] of pairs) {
        if (clip) out[n] = clip;
      }
      return out;
    });
    rpmClipCache.set(key, p);
    return p;
  };

  /**
   * 精确解剖学单骨指向解算：将骨骼局部 +Y 轴直接对准模型空间的指定方向（用于双枪精准平举瞄准 / 抓崖悬吊 / 推石块）
   */
  const _tmpDir = new G.THREE.Vector3();
  const _tmpQuat = new G.THREE.Quaternion();
  const _tmpMat = new G.THREE.Matrix4();
  const _upY = new G.THREE.Vector3(0, 1, 0);

  Assets.aimBoneAlong = function (bone, dirInModel, modelRoot) {
    if (!bone || !bone.parent || !modelRoot) return;
    modelRoot.updateMatrixWorld(true);
    // 将模型空间方向变换到 bone.parent 的局部空间
    _tmpMat.copy(bone.parent.matrixWorld).invert().multiply(modelRoot.matrixWorld);
    _tmpDir.copy(dirInModel).transformDirection(_tmpMat).normalize();
    _tmpQuat.setFromUnitVectors(_upY, _tmpDir);
    bone.quaternion.copy(_tmpQuat);
  };

  /**
   * 自动缩放、水平居中并精准贴地（将模型归一化到目标身高，脚底严丝合缝对齐 y=0）
   */
  Assets.normalizeRig = function (model, targetHeight, rotY = 0) {
    const THREE = G.THREE;
    const holder = new THREE.Group();
    const inner = new THREE.Group();
    inner.add(model);
    inner.rotation.y = rotY;
    holder.add(inner);

    holder.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(inner);
    const size = new THREE.Vector3();
    box.getSize(size);

    const h = Math.max(0.01, size.y);
    const scale = targetHeight / h;
    inner.scale.setScalar(scale);
    holder.updateMatrixWorld(true);

    const box2 = new THREE.Box3().setFromObject(inner);
    const center2 = new THREE.Vector3();
    box2.getCenter(center2);
    inner.position.set(-center2.x, -box2.min.y, -center2.z);
    holder.updateMatrixWorld(true);
    return { holder, inner, scale };
  };

  /**
   * 生成零浓妆的自然写实女性人脸贴图（基于 Wolf3D_Head 真实人脸 UV，仅精修眉色、肤色质感与自然唇色）
   */
  Assets.getCleanFemaleFace = function (variant = 'lara') {
    if (faceCache.has(variant)) return faceCache.get(variant);
    const THREE = G.THREE;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#d6a488';
    ctx.fillRect(0, 0, 512, 512);

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false; // glTF UV 约定 flipY = false！
    tex.anisotropy = 8;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      ctx.drawImage(img, 0, 0, 512, 512);

      // 细微调整肤色气质
      if (variant === 'xiaolongnu') {
        // 小龙女：清冷白皙古墓仙姿
        ctx.fillStyle = 'rgba(255, 246, 242, 0.22)';
        ctx.fillRect(0, 0, 512, 512);
      } else if (variant === 'lara') {
        // 劳拉：健康阳光探险小麦光泽
        ctx.fillStyle = 'rgba(180, 122, 86, 0.08)';
        ctx.fillRect(0, 0, 512, 512);
      }

      // 将原图偏淡金色的眉毛精修为自然浓眉（精准对应 Wolf3D_Head UV 眉弓坐标！）
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const browColor = variant === 'lara' ? 'rgba(54, 31, 18, 0.88)' : (variant === 'limochou' ? 'rgba(24, 16, 26, 0.92)' : 'rgba(28, 22, 24, 0.85)');
      ctx.strokeStyle = browColor;
      ctx.lineWidth = variant === 'lara' ? 9.5 : 7.5;
      // 左眉 (UV 182..242, 134..152)
      ctx.beginPath();
      ctx.moveTo(182, 138);
      ctx.quadraticCurveTo(212, 132, 239, 150);
      ctx.stroke();
      // 右眉 (UV 272..330, 134..152)
      ctx.beginPath();
      ctx.moveTo(330, 138);
      ctx.quadraticCurveTo(300, 132, 273, 150);
      ctx.stroke();

      // 细微自然发丝眉羽纹理
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = variant === 'lara' ? 'rgba(38, 20, 10, 0.65)' : 'rgba(15, 12, 18, 0.6)';
      for (let i = 0; i < 10; i++) {
        const lx = 186 + i * 5.2;
        ctx.beginPath(); ctx.moveTo(lx, 137 + i * 1.1); ctx.lineTo(lx + 4, 143 + i * 1.1); ctx.stroke();
        const rx = 326 - i * 5.2;
        ctx.beginPath(); ctx.moveTo(rx, 137 + i * 1.1); ctx.lineTo(rx - 4, 143 + i * 1.1); ctx.stroke();
      }

      // 劳拉唇色改为自然健康裸粉棕；李莫愁加深冷艳绛紫红
      if (variant === 'lara') {
        ctx.fillStyle = 'rgba(168, 92, 78, 0.42)';
        ctx.beginPath(); ctx.ellipse(256, 244, 42, 12, 0, 0, Math.PI * 2); ctx.fill();
      } else if (variant === 'limochou') {
        ctx.fillStyle = 'rgba(128, 24, 64, 0.48)';
        ctx.beginPath(); ctx.ellipse(256, 244, 42, 12, 0, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      tex.needsUpdate = true;
    };
    img.src = 'assets/textures/chars/clean_female_face.jpg';

    faceCache.set(variant, tex);
    return tex;
  };

  /**
   * 生成高精织物/古风丝绸/战术服漫反射贴图（叠加在 GLB 原生 3D NormalMap + RoughnessMap 之上，保留全部真实衣褶立体感！）
   */
  Assets.makeClothTexture = function (style) {
    if (clothCache.has(style)) return clothCache.get(style);
    const THREE = G.THREE;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d');

    const presets = {
      lara_top:     { c1: '#1d6973', c2: '#134c54', accent: '#3d281c', belt: false, weave: 0.08 },
      xln_dress:    { c1: '#f4f8ff', c2: '#dce8f8', accent: '#94b8d8', belt: true, beltCol: '#cbd5e1', buckleCol: '#e2e8f0', weave: 0.04 },
      lmc_dress:    { c1: '#561b4f', c2: '#2d0c2c', accent: '#a855f7', belt: true, beltCol: '#1f1024', buckleCol: '#eab308', weave: 0.06 },
      taoist_robe:  { c1: '#c8d6e5', c2: '#6e849c', accent: '#1e3a5f', belt: false, pattern: 'brocade', weave: 0.06 },
      mongol_armor: { c1: '#4c3424', c2: '#261810', accent: '#d97706', belt: false, pattern: 'lamellar', weave: 0.10 },
      valley_lord:  { c1: '#145a40', c2: '#092e20', accent: '#eab308', belt: false, pattern: 'brocade', weave: 0.07 },
      lama_robe:    { c1: '#a62619', c2: '#5e110c', accent: '#f59e0b', belt: false, pattern: 'brocade', weave: 0.07 },
      sword_hermit: { c1: '#3b4252', c2: '#1e2430', accent: '#94a3b8', belt: false, pattern: 'brocade', weave: 0.08 },
    };
    const p = presets[style] || presets.taoist_robe;

    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, p.c1);
    grad.addColorStop(1, p.c2);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // 细腻经纬织纹与明暗面料层次
    for (let y = 0; y < 512; y += 3) {
      ctx.fillStyle = y % 6 === 0 ? `rgba(255,255,255,${p.weave * 0.7})` : `rgba(0,0,0,${p.weave})`;
      ctx.fillRect(0, y, 512, 1);
    }
    for (let x = 0; x < 512; x += 4) {
      ctx.fillStyle = x % 8 === 0 ? `rgba(255,255,255,${p.weave * 0.45})` : `rgba(0,0,0,${p.weave * 0.6})`;
      ctx.fillRect(x, 0, 1, 512);
    }

    // 古风暗纹锦缎 / 蒙古札甲鱼鳞甲片纹路
    if (p.pattern === 'brocade') {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1.6;
      for (let y = 24; y < 512; y += 48) {
        for (let x = 24; x < 512; x += 48) {
          ctx.beginPath();
          ctx.arc(x + ((y / 48) % 2) * 24, y, 16, 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      // 交领斜襟滚边装饰线
      ctx.strokeStyle = p.accent;
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(0, 80); ctx.lineTo(512, 420);
      ctx.stroke();
    } else if (p.pattern === 'lamellar') {
      // 札甲重叠青铜/熟铁甲片
      ctx.strokeStyle = 'rgba(217, 119, 6, 0.34)';
      ctx.lineWidth = 2;
      for (let y = 0; y < 512; y += 26) {
        const off = ((y / 26) % 2) * 18;
        for (let x = -18; x < 530; x += 36) {
          ctx.fillStyle = (x + y) % 72 === 0 ? 'rgba(255,220,160,0.08)' : 'rgba(0,0,0,0.14)';
          ctx.fillRect(x + off + 2, y + 2, 32, 22);
          ctx.strokeRect(x + off + 2, y + 2, 32, 22);
        }
      }
    }

    // 劳拉经典探索青灰战服接缝与肩带滚边
    if (style === 'lara_top') {
      ctx.strokeStyle = 'rgba(10, 36, 42, 0.32)';
      ctx.lineWidth = 2.5;
      for (let i = 0; i < 512; i += 32) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(512, i); ctx.stroke();
      }
      ctx.fillStyle = '#0f3940';
      ctx.fillRect(0, 0, 512, 18);
      ctx.fillRect(0, 490, 512, 22);
    }

    // 仅针对 woman_dress_rpm.glb 的腰带 UV 区域（y ≈ 222..288）绘制古风绣花束腰与玉/金扣
    if (p.belt) {
      ctx.fillStyle = p.beltCol;
      ctx.fillRect(0, 222, 512, 66);
      ctx.fillStyle = p.accent;
      ctx.fillRect(0, 220, 512, 6);
      ctx.fillRect(0, 284, 512, 6);
      ctx.strokeStyle = p.buckleCol;
      ctx.lineWidth = 2;
      for (let x = 16; x < 512; x += 32) {
        ctx.beginPath();
        ctx.arc(x, 255, 8, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.fillStyle = p.buckleCol;
      ctx.fillRect(438, 226, 56, 58);
      ctx.fillStyle = p.beltCol;
      ctx.fillRect(452, 238, 28, 34);
    }

    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.flipY = false;
    tex.anisotropy = 8;
    clothCache.set(style, tex);
    return tex;
  };

  /** 生成柔和体积感真火羽化贴图（彻底替代低模橙色圆锥火焰！） */
  let fireSpriteTex = null;
  Assets.getFireSpriteTexture = function () {
    if (fireSpriteTex) return fireSpriteTex;
    const THREE = G.THREE;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 192;
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, 128, 192);
    // 外层橘红热浪光晕
    const g1 = ctx.createRadialGradient(64, 122, 6, 64, 108, 62);
    g1.addColorStop(0, 'rgba(255, 252, 220, 1)');
    g1.addColorStop(0.28, 'rgba(255, 190, 55, 0.92)');
    g1.addColorStop(0.58, 'rgba(234, 88, 12, 0.52)');
    g1.addColorStop(0.85, 'rgba(185, 28, 28, 0.16)');
    g1.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = g1;
    ctx.fillRect(0, 0, 128, 192);
    // 上扬火舌核心
    const g2 = ctx.createRadialGradient(64, 96, 4, 64, 72, 44);
    g2.addColorStop(0, 'rgba(255, 255, 240, 0.95)');
    g2.addColorStop(0.42, 'rgba(251, 146, 60, 0.65)');
    g2.addColorStop(1, 'rgba(234, 88, 12, 0)');
    ctx.fillStyle = g2;
    ctx.beginPath();
    ctx.ellipse(64, 82, 28, 56, 0, 0, Math.PI * 2);
    ctx.fill();

    fireSpriteTex = new THREE.CanvasTexture(c);
    fireSpriteTex.colorSpace = THREE.SRGBColorSpace;
    return fireSpriteTex;
  };

  /** 生成柔和圆形光斑贴图（彻底把 PointsMaterial 的生硬方块粒子升级为电影级柔和流萤/火星散景光斑！） */
  let softDotTex = null;
  Assets.getSoftGlowDotTexture = function () {
    if (softDotTex) return softDotTex;
    const THREE = G.THREE;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 2, 32, 32, 30);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.75)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.18)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    softDotTex = new THREE.CanvasTexture(c);
    return softDotTex;
  };

  /** 生成羽化渐变丝绸披帛贴图（柔边轻纱，告别硬边白色矩形板！） */
  let silkRibbonTex = null;
  Assets.getSilkRibbonTexture = function () {
    if (silkRibbonTex) return silkRibbonTex;
    const THREE = G.THREE;
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.22, 'rgba(255,255,255,0.65)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.78, 'rgba(255,255,255,0.65)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 256);
    // 上下两端轻纱渐隐
    ctx.globalCompositeOperation = 'destination-in';
    const vg = ctx.createLinearGradient(0, 0, 0, 256);
    vg.addColorStop(0, 'rgba(255,255,255,0.15)');
    vg.addColorStop(0.18, 'rgba(255,255,255,1)');
    vg.addColorStop(0.75, 'rgba(255,255,255,0.8)');
    vg.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, 64, 256);
    silkRibbonTex = new THREE.CanvasTexture(c);
    return silkRibbonTex;
  };

  /** 生成安第斯银灰雪狼毛皮贴图（替代 Fox.glb 橘红毛皮，呈现凶猛冷灰雪狼质感！） */
  let wolfFurTex = null;
  Assets.makeWolfFurTexture = function () {
    if (wolfFurTex) return wolfFurTex;
    const THREE = G.THREE;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 256;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 256);
    g.addColorStop(0, '#475569');
    g.addColorStop(0.45, '#94a3b8');
    g.addColorStop(0.82, '#cbd5e1');
    g.addColorStop(1, '#e2e8f0');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 900; i++) {
      const x = (i * 47) % 256;
      const y = (i * 89) % 256;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(30, 41, 59, 0.45)' : 'rgba(248, 250, 252, 0.38)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + 2, y + 12);
      ctx.stroke();
    }
    wolfFurTex = new THREE.CanvasTexture(c);
    wolfFurTex.colorSpace = THREE.SRGBColorSpace;
    wolfFurTex.flipY = false;
    return wolfFurTex;
  };

  /** 生成大宋襄阳古风丝绸书法战旗贴图 */
  Assets.makeBannerTexture = function (charText = '宋', bgHex = '#991b1b', goldHex = '#facc15') {
    const key = 'banner_' + charText + bgHex;
    if (clothCache.has(key)) return clothCache.get(key);
    const THREE = G.THREE;
    const c = document.createElement('canvas');
    c.width = 256;
    c.height = 512;
    const ctx = c.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 256, 512);
    g.addColorStop(0, bgHex);
    g.addColorStop(1, '#450a0a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 512);
    // 丝绸折痕纹理
    for (let y = 0; y < 512; y += 6) {
      ctx.fillStyle = y % 12 === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.08)';
      ctx.fillRect(0, y, 256, 2);
    }
    // 金边云纹边框
    ctx.strokeStyle = goldHex;
    ctx.lineWidth = 8;
    ctx.strokeRect(14, 14, 228, 484);
    ctx.lineWidth = 2.5;
    ctx.strokeRect(26, 26, 204, 460);
    // 金色书法大字
    ctx.fillStyle = goldHex;
    ctx.font = 'bold 124px "Songti SC", "STSong", "KaiTi", serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (charText.length === 2) {
      ctx.fillText(charText[0], 128, 178);
      ctx.fillText(charText[1], 128, 342);
    } else {
      ctx.fillText(charText, 128, 256);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    clothCache.set(key, tex);
    return tex;
  };

  /**
   * 加载 Poly Haven 100% CC0 实拍照片级 PBR 三贴图材质（Diffuse + NormalGL + Roughness）
   */
  Assets.createPhotoPBRMaterial = function (name, opts = {}) {
    const THREE = G.THREE;
    ensureLoaders();
    const rx = opts.repeatX || 1;
    const ry = opts.repeatY || 1;

    const getTex = (suffix, isSRGB) => {
      const url = `assets/textures/pbr/${name}_${suffix}.jpg`;
      let baseTex = texCache.get(url);
      if (!baseTex && texLoader) {
        baseTex = texLoader.load(url);
        baseTex.wrapS = baseTex.wrapT = THREE.RepeatWrapping;
        if (isSRGB) baseTex.colorSpace = THREE.SRGBColorSpace;
        baseTex.anisotropy = 8;
        texCache.set(url, baseTex);
      }
      if (!baseTex) return null;
      const t = baseTex.clone();
      t.wrapS = t.wrapT = THREE.RepeatWrapping;
      t.repeat.set(rx, ry);
      if (isSRGB) t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
      return t;
    };

    const map = getTex('diff', true);
    const normalMap = getTex('nor', false);
    const roughnessMap = getTex('rough', false);

    return new THREE.MeshStandardMaterial({
      color: opts.color != null ? opts.color : 0xffffff,
      map,
      normalMap,
      roughnessMap,
      roughness: opts.roughness != null ? opts.roughness : 0.85,
      metalness: opts.metalness != null ? opts.metalness : 0.08,
      normalScale: new THREE.Vector2(opts.normalScale || 1.25, opts.normalScale || 1.25),
      emissive: opts.emissive != null ? opts.emissive : 0x000000,
      emissiveIntensity: opts.emissiveIntensity || 0,
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
