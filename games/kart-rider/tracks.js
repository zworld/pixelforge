/* 跑跑卡丁车 · 巅峰漂移 — 4 大经典赛道样条引擎 + 4 大传奇赛车 + 4 位经典车手 + 8 大道具定义 */
(function (G) {
  'use strict';
  const KR = (G.KR = G.KR || {});

  /** 4 大经典传奇赛车（1:1 致敬 尖锋 PRO / 棉花糖 SR / 爆烈 Z7 / 游侠 X） */
  KR.KARTS = [
    {
      id: 'saber',
      name: '尖锋 PRO',
      badge: '刀锋漂移',
      primary: 0xdc2626,
      secondary: 0xf8fafc,
      accent: 0xfacc15,
      flameColor: 0x38bdf8,
      chassisStyle: 'saber',
      pipes: 2,
      // 物理参数（米/秒基准，表显 km/h ≈ speed * 4.4）
      baseSpeed: 53.5,     // ~235 km/h
      accel: 34.5,
      steerRate: 2.25,
      driftGrip: 0.94,
      driftTurn: 1.52,
      chargeRate: 1.12,
      nitroBonus: 19.5,    // N2O 大喷增幅 (~320 km/h)
      stats: { speed: 94, accel: 91, drift: 97, charge: 93 },
    },
    {
      id: 'cotton',
      name: '棉花糖 SR',
      badge: '经典均衡',
      primary: 0xf8fafc,
      secondary: 0x0ea5e9,
      accent: 0x38bdf8,
      flameColor: 0x60a5fa,
      chassisStyle: 'cotton',
      pipes: 2,
      baseSpeed: 52.5,     // ~231 km/h
      accel: 35.8,
      steerRate: 2.35,
      driftGrip: 0.96,
      driftTurn: 1.48,
      chargeRate: 1.22,    // 棉花糖招牌快集气！
      nitroBonus: 19.2,
      stats: { speed: 91, accel: 94, drift: 95, charge: 99 },
    },
    {
      id: 'burst',
      name: '爆烈 Z7',
      badge: '狂暴爆发',
      primary: 0xf97316,
      secondary: 0x1e293b,
      accent: 0xfde047,
      flameColor: 0xfbbf24,
      chassisStyle: 'burst',
      pipes: 2,
      baseSpeed: 53.2,     // ~234 km/h
      accel: 38.5,         // 爆烈招牌超高起步与加速！
      steerRate: 2.20,
      driftGrip: 0.91,
      driftTurn: 1.54,
      chargeRate: 1.08,
      nitroBonus: 21.0,
      stats: { speed: 93, accel: 99, drift: 89, charge: 90 },
    },
    {
      id: 'ranger',
      name: '游侠 X',
      badge: '极限速度',
      primary: 0x0f172a,
      secondary: 0x06b6d4,
      accent: 0x22d3ee,
      flameColor: 0xa855f7,
      chassisStyle: 'ranger',
      pipes: 3,            // 三喷口等离子氮气！
      baseSpeed: 55.2,     // ~243 km/h
      accel: 36.2,
      steerRate: 2.30,
      driftGrip: 0.95,
      driftTurn: 1.50,
      chargeRate: 1.15,
      nitroBonus: 20.8,
      stats: { speed: 99, accel: 95, drift: 94, charge: 96 },
    },
  ];

  /** 4 位繁荣山丘经典风格车手 */
  KR.DRIVERS = [
    { id: 'dao',   name: '皮蛋', title: '繁荣山丘车神', suit: 0x2563eb, helmet: 0xef4444, trim: 0xf8fafc, skin: 0xffd5b8, style: 'cap' },
    { id: 'dizni', name: '黑妞', title: '樱风漂移手',   suit: 0xec4899, helmet: 0xf472b6, trim: 0xfef08a, skin: 0xffe0c8, style: 'visor' },
    { id: 'bazzi', name: '宝宝', title: '俏皮冲刺王',   suit: 0x0284c7, helmet: 0x38bdf8, trim: 0xffffff, skin: 0xffd9bd, style: 'round' },
    { id: 'marid', name: '葱头', title: '空气动力学专家', suit: 0x10b981, helmet: 0xf59e0b, trim: 0x1e293b, skin: 0xffd3b4, style: 'goggles' },
  ];

  /** 7 位经典 AI 车手阵容（凑满 8 人完整发车格！） */
  KR.AI_ROSTER = [
    { name: '黑妞', kartId: 'cotton', driverId: 'dizni', skill: 0.985 },
    { name: '宝宝', kartId: 'burst',  driverId: 'bazzi', skill: 0.962 },
    { name: '葱头', kartId: 'ranger', driverId: 'marid', skill: 0.945 },
    { name: '蓝蓝', kartId: 'cotton', driverId: 'dizni', skill: 0.922 },
    { name: '小乖', kartId: 'saber',  driverId: 'bazzi', skill: 0.905 },
    { name: '海盗船长', kartId: 'burst', driverId: 'dao', skill: 0.885 },
    { name: '雯雯', kartId: 'ranger', driverId: 'marid', skill: 0.865 },
  ];

  /** 8 大跑跑卡丁车原汁原味经典道具 */
  KR.ITEMS = {
    nitro:     { id: 'nitro',     name: '氮气 N2O', icon: '🔥', color: '#ef4444', desc: '喷射超强氮气加速！' },
    missile:   { id: 'missile',   name: '追踪导弹', icon: '🚀', color: '#f97316', desc: '锁定前方车手并将其炸飞！' },
    waterfly:  { id: 'waterfly',  name: '水苍蝇',   icon: '💧', color: '#38bdf8', desc: '追踪前一名车手并困入水泡！' },
    waterbomb: { id: 'waterbomb', name: '水炸弹',   icon: '💣', color: '#0284c7', desc: '抛投前方巨型水球困住范围车手！' },
    banana:    { id: 'banana',    name: '香蕉皮',   icon: '🍌', color: '#facc15', desc: '在车后丢下香蕉皮令追兵打滑！' },
    devil:     { id: 'devil',     name: '大魔王',   icon: '😈', color: '#a855f7', desc: '令前方所有对手左右方向反转！' },
    ufo:       { id: 'ufo',       name: '飞碟',     icon: '🛸', color: '#22c55e', desc: '召唤飞碟减速当前第一名！' },
    shield:    { id: 'shield',    name: '天使护盾', icon: '🛡️', color: '#fbbf24', desc: '金色护盾抵挡导弹、水泡与香蕉皮！' },
    magnet:    { id: 'magnet',    name: '超级磁铁', icon: '🧲', color: '#ec4899', desc: '吸附前方车手实现极限超车！' },
  };

  KR.getKart = (id) => KR.KARTS.find((k) => k.id === id) || KR.KARTS[0];
  KR.getDriver = (id) => KR.DRIVERS.find((d) => d.id === id) || KR.DRIVERS[0];

  /**
   * 4 大经典赛道控制点定义（闭合 3D Catmull-Rom 样条，坐标单位：米）
   * 每个控制点：[x, y, z, width(可选), bank(倾斜弧度, 可选), surface(可选: asphalt|bridge|dirt|ice)]
   */
  KR.TRACK_DEFS = [
    {
      id: 'boomhill_highway',
      index: 0,
      name: '城镇高速公路',
      shortTitle: '城镇高速',
      theme: 'boomhill',
      difficulty: 2,
      laps: 2,
      bgm: 'kart_boomhill',
      desc: '繁荣山丘最经典的宽阔高速赛道！双子悬索大桥、大半径连漂弯道与双加速直道，最适合磨练最佳化漂移与双喷！',
      defaultWidth: 18.0,
      boostFracs: [0.16, 0.44, 0.72, 0.90],
      itemFracs: [0.09, 0.28, 0.54, 0.78],
      rampFracs: [],
      points: [
        [0,    0.0,   0,   18.5,  0.00, 'asphalt'], // 起终点直道
        [0,    0.0, -75,   18.5,  0.00, 'asphalt'],
        [28,   2.5, -148,  18.0,  0.05, 'asphalt'], // 缓右弯上桥引道
        [105,  8.5, -185,  17.5,  0.02, 'bridge'],  // 繁荣山丘悬索大桥！
        [192,  8.5, -172,  17.5,  0.02, 'bridge'],
        [248,  3.5, -118,  18.0,  0.07, 'asphalt'], // 下桥高速大右弯
        [240,  0.0,  -30,  18.0,  0.06, 'asphalt'],
        [182,  0.0,   32,  17.5, -0.05, 'asphalt'], // 城镇广场 S 弯
        [135,  1.2,   98,  18.0,  0.06, 'asphalt'],
        [68,   0.5,  136,  18.5,  0.05, 'asphalt'], // 终盘大回旋弯
        [8,    0.0,   92,  18.5,  0.02, 'asphalt'],
      ],
    },
    {
      id: 'forest_hairpin',
      index: 1,
      name: '森林发夹',
      shortTitle: '森林发夹',
      theme: 'forest',
      difficulty: 3,
      laps: 2,
      bgm: 'kart_boomhill',
      desc: '经典三星进阶漂移圣地！穿越翠绿峡谷与木质悬桥，连续 3 座 180° 经典发夹弯让你尽情施展段位漂移与双喷连喷！',
      defaultWidth: 16.0,
      boostFracs: [0.13, 0.48, 0.85],
      itemFracs: [0.08, 0.30, 0.56, 0.78],
      rampFracs: [0.46],
      points: [
        [0,    0.0,   0,   16.5,  0.00, 'asphalt'],
        [0,    1.5, -72,   16.0,  0.00, 'asphalt'],
        [35,   4.5, -135,  15.5,  0.08, 'asphalt'], // 1 号上坡发夹弯！
        [108,  6.5, -135,  15.5,  0.08, 'asphalt'],
        [118,  5.0,  -68,  15.5, -0.08, 'asphalt'], // 2 号反方向发夹！
        [176,  3.5,  -45,  15.5, -0.06, 'bridge'],  // 森林峡谷木桥
        [222,  2.0,  -95,  15.5,  0.08, 'asphalt'], // 3 号远端大发夹！
        [248,  0.5,  -15,  16.0,  0.06, 'asphalt'],
        [192,  0.0,   68,  16.0,  0.07, 'asphalt'], // 下坡冲刺回弯
        [112,  0.0,  108,  16.5,  0.05, 'asphalt'],
        [32,   0.0,   88,  16.5,  0.03, 'asphalt'],
      ],
    },
    {
      id: 'desert_pyramid',
      index: 2,
      name: '沙漠金字塔工地',
      shortTitle: '沙漠金字塔',
      theme: 'desert',
      difficulty: 4,
      laps: 2,
      bgm: 'kart_cyber',
      desc: '烈日黄沙下的法老神殿与旋转工地！双飞跃跳台、90° 连续直角飘移与绿洲急弯，考验精准切弯与氮气衔接！',
      defaultWidth: 16.0,
      boostFracs: [0.15, 0.38, 0.68, 0.91],
      itemFracs: [0.09, 0.29, 0.53, 0.77],
      rampFracs: [0.22, 0.66],
      points: [
        [0,    0.0,   0,   16.5,  0.00, 'dirt'],
        [0,    0.0, -82,   16.0,  0.00, 'dirt'],
        [52,   3.5, -148,  15.8,  0.06, 'dirt'],    // 金字塔北侧加速跳台
        [145,  6.0, -152,  15.5,  0.07, 'asphalt'], // 90° 工地高架弯
        [196,  4.0,  -85,  15.5,  0.06, 'asphalt'],
        [142,  1.5,  -18,  15.5, -0.08, 'dirt'],    // 旋转工地 S 急弯
        [208,  1.0,   52,  15.8,  0.08, 'dirt'],
        [168,  0.0,  128,  16.0,  0.07, 'dirt'],    // 绿洲回旋大弯
        [82,   0.5,  132,  16.0,  0.04, 'dirt'],
        [18,   0.0,   84,  16.5,  0.02, 'dirt'],
      ],
    },
    {
      id: 'glacier_neon',
      index: 3,
      name: '冰峰霓虹赛道',
      shortTitle: '冰峰霓虹',
      theme: 'glacier',
      difficulty: 5,
      laps: 3,
      bgm: 'kart_cyber',
      desc: '五星大师终极试炼！极光雪山与发光霓虹天桥交汇，冰面超长飘移区配合多段连续加速带，冲破 320 km/h 极速！',
      defaultWidth: 15.6,
      boostFracs: [0.12, 0.34, 0.58, 0.80, 0.93],
      itemFracs: [0.07, 0.25, 0.46, 0.69, 0.86],
      rampFracs: [0.32, 0.78],
      points: [
        [0,    0.0,   0,   16.2,  0.00, 'asphalt'],
        [0,    2.0, -86,   15.8,  0.00, 'asphalt'],
        [45,   8.0, -162,  15.4,  0.09, 'bridge'],  // 霓虹发光高架桥！
        [135, 11.5, -188,  15.4,  0.07, 'bridge'],
        [222,  8.5, -142,  15.4,  0.09, 'ice'],     // 冰山大漂移弯！
        [242,  3.5,  -46,  15.4,  0.08, 'ice'],
        [172,  1.0,   12,  15.2, -0.09, 'ice'],     // 冰面反切发夹
        [218,  0.5,   94,  15.5,  0.09, 'asphalt'],
        [142,  2.5,  148,  15.6,  0.08, 'bridge'],  // 终盘霓虹弯道
        [52,   1.0,  125,  16.0,  0.05, 'asphalt'],
        [8,    0.0,   72,  16.2,  0.02, 'asphalt'],
      ],
    },
  ];

  /** Catmull-Rom 1D 插值（t ∈ [0, 1]） */
  function catmull(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
      (2 * p1) +
      (-p0 + p2) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
      (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
  }

  /**
   * 从赛道控制点生成高精度均匀弧长闭合赛道数据（零依赖 Three.js，Node 与浏览器 100% 共享！）
   */
  KR.buildTrackData = function (def) {
    const pts = def.points;
    const n = pts.length;
    const rawSamples = [];
    const subSteps = 32;

    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n];
      const p1 = pts[i];
      const p2 = pts[(i + 1) % n];
      const p3 = pts[(i + 2) % n];
      for (let j = 0; j < subSteps; j++) {
        const t = j / subSteps;
        const x = catmull(p0[0], p1[0], p2[0], p3[0], t);
        const y = catmull(p0[1], p1[1], p2[1], p3[1], t);
        const z = catmull(p0[2], p1[2], p2[2], p3[2], t);
        const w = catmull(p0[3] || def.defaultWidth, p1[3] || def.defaultWidth, p2[3] || def.defaultWidth, p3[3] || def.defaultWidth, t);
        const bank = catmull(p0[4] || 0, p1[4] || 0, p2[4] || 0, p3[4] || 0, t);
        const surface = t < 0.5 ? (p1[5] || 'asphalt') : (p2[5] || 'asphalt');
        rawSamples.push({ x, y, z, w, bank, surface });
      }
    }

    // 计算累计弧长并按均匀步长（约 2.6m 一段）重采样，确保物理投影与赛道贴图 UV 绝对均匀！
    const cumS = [0];
    let totalLen = 0;
    for (let i = 0; i < rawSamples.length; i++) {
      const a = rawSamples[i];
      const b = rawSamples[(i + 1) % rawSamples.length];
      totalLen += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      cumS.push(totalLen);
    }

    const segCount = Math.max(260, Math.round(totalLen / 2.6));
    const stepLen = totalLen / segCount;
    const samples = [];
    let rawIdx = 0;

    for (let k = 0; k < segCount; k++) {
      const targetS = k * stepLen;
      while (rawIdx < rawSamples.length - 1 && cumS[rawIdx + 1] < targetS) rawIdx++;
      const s0 = cumS[rawIdx];
      const s1 = cumS[rawIdx + 1];
      const f = s1 > s0 ? (targetS - s0) / (s1 - s0) : 0;
      const a = rawSamples[rawIdx];
      const b = rawSamples[(rawIdx + 1) % rawSamples.length];
      samples.push({
        idx: k,
        s: targetS,
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        z: a.z + (b.z - a.z) * f,
        w: a.w + (b.w - a.w) * f,
        bank: a.bank + (b.bank - a.bank) * f,
        surface: f < 0.5 ? a.surface : b.surface,
      });
    }

    // 计算每个节点的单位切线、水平右法线与曲率（用于 AI 过弯漂移预判与弯道箭头指示牌！）
    for (let i = 0; i < segCount; i++) {
      const prev = samples[(i - 1 + segCount) % segCount];
      const curr = samples[i];
      const next = samples[(i + 1) % segCount];
      const dx = next.x - prev.x;
      const dy = next.y - prev.y;
      const dz = next.z - prev.z;
      const len = Math.hypot(dx, dy, dz) || 1;
      curr.tx = dx / len;
      curr.ty = dy / len;
      curr.tz = dz / len;
      // 水平前进方向 (fx, fz) 及右向量 (rx, rz) = (-fz, fx)（Three.js Y 朝上，右手法则 forward × up）
      const hlen = Math.hypot(dx, dz) || 1;
      curr.fx = dx / hlen;
      curr.fz = dz / hlen;
      curr.rx = -curr.fz;
      curr.rz = curr.fx;
      curr.yaw = Math.atan2(curr.fx, curr.fz); // 与车头朝向 (+sin(yaw), +cos(yaw)) 一致！
    }

    for (let i = 0; i < segCount; i++) {
      const a = samples[(i - 2 + segCount) % segCount];
      const b = samples[(i + 2) % segCount];
      let dYaw = b.yaw - a.yaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      samples[i].curvature = dYaw / (4 * stepLen);
    }

    // 生成赛道加速带、飞跃跳台与排成一列的彩色道具箱位置
    const boostPads = (def.boostFracs || []).map((fr, idx) => {
      const sIdx = Math.floor(fr * segCount) % segCount;
      const p = samples[sIdx];
      return { id: idx, s: p.s, idx: sIdx, x: p.x, y: p.y, z: p.z, yaw: p.yaw, rx: p.rx, rz: p.rz, width: 4.8, length: 9.0 };
    });

    const ramps = (def.rampFracs || []).map((fr, idx) => {
      const sIdx = Math.floor(fr * segCount) % segCount;
      const p = samples[sIdx];
      return { id: idx, s: p.s, idx: sIdx, x: p.x, y: p.y, z: p.z, yaw: p.yaw, width: p.w * 0.65, length: 8.5 };
    });

    const itemBoxes = [];
    let boxId = 1;
    for (const fr of (def.itemFracs || [])) {
      const sIdx = Math.floor(fr * segCount) % segCount;
      const p = samples[sIdx];
      const count = 4;
      const span = p.w * 0.64;
      for (let k = 0; k < count; k++) {
        const lat = -span * 0.5 + (span * k) / (count - 1);
        itemBoxes.push({
          id: boxId++,
          s: p.s,
          idx: sIdx,
          lat,
          x: p.x + p.rx * lat,
          y: p.y + 1.15,
          z: p.z + p.rz * lat,
          respawn: 0,
        });
      }
    }

    // 预计算小地图归一化边界框
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const p of samples) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.z < minZ) minZ = p.z;
      if (p.z > maxZ) maxZ = p.z;
    }

    return {
      def,
      id: def.id,
      name: def.name,
      theme: def.theme,
      laps: def.laps,
      samples,
      segCount,
      stepLen,
      totalLen,
      boostPads,
      ramps,
      itemBoxes,
      bounds: { minX, maxX, minZ, maxZ },
    };
  };

  /** 按弧长 s 精确插值赛道中心点状态 */
  KR.sampleTrackAtS = function (track, s) {
    const L = track.totalLen;
    let wrapped = s % L;
    if (wrapped < 0) wrapped += L;
    const fIdx = wrapped / track.stepLen;
    const i0 = Math.floor(fIdx) % track.segCount;
    const i1 = (i0 + 1) % track.segCount;
    const t = fIdx - Math.floor(fIdx);
    const a = track.samples[i0];
    const b = track.samples[i1];
    let dYaw = b.yaw - a.yaw;
    while (dYaw > Math.PI) dYaw -= Math.PI * 2;
    while (dYaw < -Math.PI) dYaw += Math.PI * 2;
    return {
      idx: i0,
      s: wrapped,
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
      z: a.z + (b.z - a.z) * t,
      w: a.w + (b.w - a.w) * t,
      bank: a.bank + (b.bank - a.bank) * t,
      fx: a.fx + (b.fx - a.fx) * t,
      fz: a.fz + (b.fz - a.fz) * t,
      rx: a.rx + (b.rx - a.rx) * t,
      rz: a.rz + (b.rz - a.rz) * t,
      yaw: a.yaw + dYaw * t,
      curvature: a.curvature + (b.curvature - a.curvature) * t,
      surface: a.surface,
    };
  };

  /**
   * 高速 O(1) 局部窗口投影：将世界坐标 (x, z) 精准投影到赛道样条，返回最近节点、精确弧长 s、横向偏移 lat 与地面高度 y
   */
  KR.projectToTrack = function (track, x, z, hintIdx = -1) {
    const samples = track.samples;
    const n = track.segCount;
    let bestIdx = 0;
    let bestD2 = Infinity;

    if (hintIdx >= 0 && hintIdx < n) {
      const win = 16;
      for (let off = -win; off <= win; off++) {
        const i = (hintIdx + off + n) % n;
        const p = samples[i];
        const dx = x - p.x;
        const dz = z - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestIdx = i;
        }
      }
      // 若偏离过远则兜底全表扫描
      if (bestD2 > 900) hintIdx = -1;
    }

    if (hintIdx < 0) {
      for (let i = 0; i < n; i++) {
        const p = samples[i];
        const dx = x - p.x;
        const dz = z - p.z;
        const d2 = dx * dx + dz * dz;
        if (d2 < bestD2) {
          bestD2 = d2;
          bestIdx = i;
        }
      }
    }

    const p = samples[bestIdx];
    const dx = x - p.x;
    const dz = z - p.z;
    const along = dx * p.fx + dz * p.fz;
    const lat = dx * p.rx + dz * p.rz;
    let s = (p.s + along) % track.totalLen;
    if (s < 0) s += track.totalLen;

    const interp = KR.sampleTrackAtS(track, s);
    return {
      idx: bestIdx,
      s,
      lat,
      y: interp.y + Math.sin(interp.bank) * lat * 0.25,
      sample: interp,
    };
  };
})(typeof window !== 'undefined' ? window : globalThis);
