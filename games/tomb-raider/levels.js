/* 古墓丽影 · 秘鲁遗迹 — 三大经典原著关卡数据（秘鲁洞窟 / 维尔卡班巴古城 / 失落山谷霸王龙，纯数据双端共用） */
(function (G) {
  'use strict';
  const TR = (G.TR = G.TR || {});

  TR.LEVELS = [
    // =========================================================================
    // 第一关：秘鲁洞窟 (Peru: Mountain Caves)
    // 核心玩法：攀爬抓崖 / 悬崖平移 / 推石块压板解谜 / 地刺与毒箭陷阱 / 雪狼双枪战
    // =========================================================================
    {
      index: 0,
      id: 'caves',
      num: '第一关',
      title: '秘鲁洞窟 · 失落入口',
      shortTitle: '秘鲁洞窟',
      subtitle: 'Peru — Mountain Caves',
      theme: 'caves',
      bgm: 'tomb_explore',
      bossBgm: 'tomb_trex',
      spawn: { x: 0, y: 0.05, z: 5.0, yaw: 0 },
      fallY: -6.5,
      objectiveText: '穿越洞窟陷阱，将印加石块推上太阳压板开启圣殿石门',
      introQuote: '「秘鲁安第斯山脉深处，封存千年的印加洞窟正等待揭开秘密。劳拉，检查双枪与装备，准备出发。」',
      // 实心平台与立体建筑（x,z 为水平中心，y 为底面高度，顶面 = y + h）
      blocks: [
        // 起始大厅
        { x: 0, y: -1.5, z: 1.5, w: 14, h: 1.5, d: 15, style: 'stone' },
        // 左侧高台（抓崖攀爬教学 + 隐藏圣物 #1）
        { x: -5.4, y: 0, z: 0.5, w: 3.2, h: 2.35, d: 4.8, style: 'carved', climbable: true },
        // 洞窟两侧岩壁柱
        { x: -7.5, y: 0, z: 1.5, w: 1.4, h: 7.5, d: 15, style: 'rock' },
        { x: 7.5, y: 0, z: 1.5, w: 1.4, h: 7.5, d: 15, style: 'rock' },
        // 断崖中央跳台（前后间隙各 3.1m，助跑跳或抓崖皆可稳过）
        { x: 0, y: -1.5, z: -11.5, w: 4.8, h: 1.5, d: 4.2, style: 'carved', climbable: true },
        // 右侧悬崖抓崖平移台（体验经典悬崖横移 Shimmy + 急救包）
        { x: 5.5, y: 1.2, z: -11.5, w: 2.2, h: 1.1, d: 7.5, style: 'carved', climbable: true },
        // 陷阱长廊与大殿主地板（z = -16.5 .. -45）
        { x: 0, y: -1.5, z: -30.5, w: 16, h: 1.5, d: 28, style: 'stone' },
        // 陷阱长廊左右石墙
        { x: -8.5, y: 0, z: -30.5, w: 1.4, h: 7.5, d: 28, style: 'rock' },
        { x: 8.5, y: 0, z: -30.5, w: 1.4, h: 7.5, d: 28, style: 'rock' },
        // 大殿右侧可攀爬露台（拉动石壁拉杆开启藏宝室）
        { x: 6.0, y: 0, z: -34.5, w: 3.4, h: 2.3, d: 5.4, style: 'carved', climbable: true },
        // 大殿左侧隐藏宝库隔断（石墙围出密室入口）
        { x: -6.4, y: 0, z: -36.0, w: 3.0, h: 4.2, d: 1.0, style: 'carved' },
        { x: -6.4, y: 0, z: -41.5, w: 3.0, h: 4.2, d: 1.0, style: 'carved' },
        // 大殿门框左右石柱
        { x: -5.4, y: 0, z: -44.2, w: 5.2, h: 6.5, d: 1.6, style: 'carved' },
        { x: 5.4, y: 0, z: -44.2, w: 5.2, h: 6.5, d: 1.6, style: 'carved' },
        // 门后圣坛通往维尔卡班巴
        { x: 0, y: -1.5, z: -50.5, w: 12, h: 1.5, d: 12, style: 'marble' },
        { x: 0, y: 0, z: -55.2, w: 6.0, h: 0.45, d: 3.2, style: 'gold_trim' },
      ],
      // 可推动印加石块
      pushBlocks: [
        { id: 'pb1', x: -3.4, y: 0, z: -34.0, size: 1.55 },
      ],
      // 地面太阳压板（推石块压住即开启 gate_main）
      plates: [
        { id: 'plate_sun', x: 0, y: 0, z: -38.5, radius: 1.35, targetGate: 'gate_main' },
      ],
      // 石壁拉杆机关（拉动开启隐藏藏宝室）
      levers: [
        { id: 'lever_secret', x: 7.4, y: 2.3, z: -34.5, facing: -Math.PI * 0.5, targetGate: 'gate_secret', label: '拉动壁墙拉杆' },
      ],
      // 古代石门
      gates: [
        { id: 'gate_main', x: 0, y: 0, z: -44.2, w: 5.6, h: 4.8, d: 0.9, required: ['plate_sun'], label: '圣殿巨门' },
        { id: 'gate_secret', x: -4.9, y: 0, z: -38.8, w: 0.7, h: 3.8, d: 4.4, required: ['lever_secret'], label: '密室暗门' },
      ],
      // 定时伸缩地刺陷阱
      spikes: [
        { id: 'sp1', x: 0, y: 0, z: -21.2, w: 5.2, d: 2.4, period: 2.6, phase: 0 },
      ],
      // 石壁毒箭发射机关
      darts: [
        { id: 'dt1', x: 7.5, y: 1.1, z: -25.0, dx: -1, dz: 0, interval: 1.9, speed: 12.5, range: 15 },
      ],
      boulders: [],
      checkpoints: [
        { id: 'cp1', x: 0, y: 0, z: -17.5 },
        { id: 'cp2', x: 0, y: 0, z: -46.5 },
      ],
      pickups: [
        { id: 'art1', kind: 'artifact', name: '黄金圣杯', x: -5.4, y: 2.35, z: 0.5 },
        { id: 'med1', kind: 'medipack', name: '大型急救包', x: 5.5, y: 2.3, z: -11.5 },
        { id: 'art2', kind: 'artifact', name: '翡翠神像', x: 6.0, y: 2.3, z: -32.8 },
        { id: 'art3', kind: 'artifact', name: '太阳金面具', x: -6.8, y: 0, z: -38.8 },
        { id: 'med2', kind: 'medipack', name: '急救包', x: -6.2, y: 0, z: -37.6 },
      ],
      enemies: [
        { id: 'w1', kind: 'wolf', name: '秘鲁雪狼', x: -2.4, y: 0, z: -29.5, hp: 55, speed: 5.2, dmg: 14 },
        { id: 'w2', kind: 'wolf', name: '秘鲁雪狼', x: 2.8, y: 0, z: -31.5, hp: 55, speed: 5.4, dmg: 14 },
        { id: 'w3', kind: 'wolf', name: '守墓苍狼', x: 0, y: 0, z: -49.5, hp: 65, speed: 5.6, dmg: 16 },
      ],
      torches: [
        [-6.6, 2.8, 3], [6.6, 2.8, 3], [-6.6, 2.8, -4], [6.6, 2.8, -4],
        [-7.5, 2.8, -20], [7.5, 2.8, -20], [-7.5, 2.8, -32], [7.5, 2.8, -32],
        [-3.4, 3.2, -43.2], [3.4, 3.2, -43.2], [-4.5, 2.8, -53], [4.5, 2.8, -53],
      ],
      goal: { x: 0, y: 0.45, z: -55.2, radius: 1.8, kind: 'door', name: '前往维尔卡班巴古城' },
    },

    // =========================================================================
    // 第二关：维尔卡班巴古城 (City of Vilcabamba)
    // 核心玩法：经典巨石滚落逃生 / 碎裂石桥 / 日月双壁拉杆立体攀爬 / 洞穴巨熊
    // =========================================================================
    {
      index: 1,
      id: 'vilcabamba',
      num: '第二关',
      title: '维尔卡班巴 · 机关圣殿',
      shortTitle: '维尔卡班巴',
      subtitle: 'Peru — City of Vilcabamba',
      theme: 'vilcabamba',
      bgm: 'tomb_explore',
      bossBgm: 'tomb_trex',
      spawn: { x: 0, y: 0.05, z: 5.5, yaw: 0 },
      fallY: -6.5,
      objectiveText: '躲避滚石机关，攀爬日月高台拉动双拉杆打开古城内殿',
      introQuote: '「维尔卡班巴沉没的圣殿就在眼前。小心头顶的滚石陷阱，同时拉动太阳与月亮双机关才能开启失落山谷的通道。」',
      blocks: [
        // 入口水池广场
        { x: 0, y: -1.5, z: 0.5, w: 18, h: 1.5, d: 15, style: 'marble' },
        // 广场左侧高台（隐藏圣物 #1）
        { x: -7.2, y: 0, z: -2.0, w: 3.0, h: 2.3, d: 4.5, style: 'carved', climbable: true },
        // 滚石走廊地板（z = -7 .. -28）
        { x: 0, y: -1.5, z: -17.5, w: 6.0, h: 1.5, d: 21, style: 'stone' },
        // 滚石走廊左右闪避安全凹槽！
        { x: -4.5, y: -1.5, z: -17.5, w: 3.2, h: 1.5, d: 4.0, style: 'gold_trim' },
        { x: 4.5, y: -1.5, z: -21.5, w: 3.2, h: 1.5, d: 4.0, style: 'gold_trim' },
        // 走廊石壁（凹槽处留空供劳拉侧闪翻滚！）
        { x: -3.7, y: 0, z: -11.0, w: 1.4, h: 5.5, d: 8.6, style: 'carved' },
        { x: -3.7, y: 0, z: -24.0, w: 1.4, h: 5.5, d: 8.6, style: 'carved' },
        { x: 3.7, y: 0, z: -13.0, w: 1.4, h: 5.5, d: 12.6, style: 'carved' },
        { x: 3.7, y: 0, z: -26.0, w: 1.4, h: 5.5, d: 4.6, style: 'carved' },
        // 日月双机关立体大厅（z = -28 .. -48）
        { x: 0, y: -1.5, z: -38.0, w: 18, h: 1.5, d: 20, style: 'marble' },
        // 左侧立体攀爬路线：一段石墩 -> 碎裂石桥 -> 太阳高台
        { x: -6.6, y: 0, z: -32.2, w: 3.0, h: 2.1, d: 3.0, style: 'carved', climbable: true },
        { x: -6.6, y: 2.4, z: -36.4, w: 2.6, h: 0.45, d: 3.2, style: 'crumble', crumble: true },
        { x: -6.6, y: 0, z: -41.5, w: 3.6, h: 3.3, d: 5.0, style: 'carved', climbable: true },
        // 右侧立体攀爬路线：一段石墩 -> 碎裂石桥 -> 月亮高台
        { x: 6.6, y: 0, z: -32.2, w: 3.0, h: 2.1, d: 3.0, style: 'carved', climbable: true },
        { x: 6.6, y: 2.4, z: -36.4, w: 2.6, h: 0.45, d: 3.2, style: 'crumble', crumble: true },
        { x: 6.6, y: 0, z: -41.5, w: 3.6, h: 3.3, d: 5.0, style: 'carved', climbable: true },
        // 大厅石门两侧门框
        { x: -5.8, y: 0, z: -48.0, w: 6.4, h: 6.5, d: 1.6, style: 'carved' },
        { x: 5.8, y: 0, z: -48.0, w: 6.4, h: 6.5, d: 1.6, style: 'carved' },
        // 门后圣地
        { x: 0, y: -1.5, z: -54.0, w: 14, h: 1.5, d: 12, style: 'marble' },
        { x: 4.6, y: 0, z: -53.5, w: 2.8, h: 2.2, d: 2.8, style: 'carved', climbable: true },
        { x: 0, y: 0, z: -58.2, w: 6.2, h: 0.45, d: 3.2, style: 'gold_trim' },
      ],
      pushBlocks: [],
      plates: [],
      levers: [
        { id: 'lever_sun', x: -8.1, y: 3.3, z: -41.5, facing: Math.PI * 0.5, targetGate: 'gate_temple', label: '拉动太阳拉杆' },
        { id: 'lever_moon', x: 8.1, y: 3.3, z: -41.5, facing: -Math.PI * 0.5, targetGate: 'gate_temple', label: '拉动月亮拉杆' },
      ],
      gates: [
        { id: 'gate_temple', x: 0, y: 0, z: -48.0, w: 5.4, h: 4.8, d: 0.9, required: ['lever_sun', 'lever_moon'], label: '日月圣殿大门' },
      ],
      spikes: [
        { id: 'vsp1', x: 0, y: 0, z: -36.5, w: 5.0, d: 2.4, period: 2.4, phase: 0.5 },
      ],
      darts: [
        { id: 'vdt1', x: -8.6, y: 1.1, z: -44.2, dx: 1, dz: 0, interval: 2.1, speed: 13.0, range: 17 },
      ],
      // 经典滚石陷阱（步入 z < -18.5 触发，劳拉须闪入左右凹槽！）
      boulders: [
        { id: 'b1', x: 0, y: 1.35, z: -27.2, vx: 0, vz: 10.6, radius: 1.35, triggerZ: -18.2, endZ: -6.5 },
      ],
      checkpoints: [
        { id: 'vcp1', x: 0, y: 0, z: -8.5 },
        { id: 'vcp2', x: 0, y: 0, z: -29.5 },
      ],
      pickups: [
        { id: 'vart1', kind: 'artifact', name: '印加金冠', x: -7.2, y: 2.3, z: -2.0 },
        { id: 'vmed1', kind: 'medipack', name: '急救包', x: -4.5, y: 0, z: -17.5 },
        { id: 'vart2', kind: 'artifact', name: '银月权杖', x: -6.6, y: 3.3, z: -43.0 },
        { id: 'vmed2', kind: 'medipack', name: '大型急救包', x: 6.6, y: 3.3, z: -43.0 },
        { id: 'vart3', kind: 'artifact', name: '黄金美洲豹', x: 4.6, y: 2.2, z: -53.5 },
      ],
      enemies: [
        { id: 'vb1', kind: 'bear', name: '古殿巨熊', x: 2.2, y: 0, z: -3.2, hp: 120, speed: 4.1, dmg: 22 },
        { id: 'vw1', kind: 'wolf', name: '暗影洞狼', x: -2.6, y: 0, z: -39.5, hp: 62, speed: 5.5, dmg: 15 },
        { id: 'vw2', kind: 'wolf', name: '暗影洞狼', x: 2.6, y: 0, z: -42.5, hp: 62, speed: 5.5, dmg: 15 },
      ],
      torches: [
        [-6, 3, 4], [6, 3, 4], [-2.8, 3, -12], [2.8, 3, -12],
        [-2.8, 3, -24], [2.8, 3, -24], [-8, 5, -41.5], [8, 5, -41.5],
        [-3.5, 3.2, -47.0], [3.5, 3.2, -47.0], [-4.5, 3, -57], [4.5, 3, -57],
      ],
      goal: { x: 0, y: 0.45, z: -58.2, radius: 1.8, kind: 'door', name: '踏入失落山谷' },
    },

    // =========================================================================
    // 第三关：失落山谷与司祭神骸 (The Lost Valley — Iconic T-Rex & Scion!)
    // 核心玩法：阳光史前峡谷瀑布 / 收集 3 枚古代齿轮 / 霸王龙史诗 Boss 战 / 夺取司祭神骸
    // =========================================================================
    {
      index: 2,
      id: 'lost_valley',
      num: '第三关',
      title: '失落山谷 · 霸王龙与神骸',
      shortTitle: '失落山谷',
      subtitle: 'Peru — The Lost Valley & Scion',
      theme: 'valley',
      bgm: 'tomb_explore',
      bossBgm: 'tomb_trex',
      spawn: { x: 0, y: 0.05, z: 7.0, yaw: 0 },
      fallY: -6.5,
      objectiveText: '收集 3 枚古代齿轮并击败史前霸王龙，开启司祭圣坛夺取亚特兰蒂斯神骸！',
      introQuote: '「穿过山洞竟是一片阳光倾泻的史前失落山谷！远处的瀑布齿轮与地面剧烈震动……小心，这里沉睡着远古掠食者！」',
      blocks: [
        // 洞口观景平台
        { x: 0, y: -1.5, z: 4.5, w: 10, h: 1.5, d: 8, style: 'stone' },
        // 失落山谷宽阔峡谷主地面（z = 0.5 .. -48, w = 28）
        { x: 0, y: -1.5, z: -24.0, w: 28, h: 1.5, d: 49, style: 'grass_stone' },
        // 峡谷掩体古石柱（躲避霸王龙冲锋与攀爬！）
        { x: -4.8, y: 0, z: -15.5, w: 2.0, h: 4.5, d: 2.0, style: 'carved' },
        { x: 4.8, y: 0, z: -15.5, w: 2.0, h: 4.5, d: 2.0, style: 'carved' },
        { x: -5.2, y: 0, z: -33.5, w: 2.0, h: 4.8, d: 2.0, style: 'carved' },
        { x: 5.2, y: 0, z: -33.5, w: 2.0, h: 4.8, d: 2.0, style: 'carved' },
        // 左侧岩崖遗迹攀爬台（齿轮 #1 + 圣物 #1）
        { x: -11.2, y: 0, z: -13.0, w: 3.4, h: 1.7, d: 3.4, style: 'carved', climbable: true },
        { x: -11.2, y: 0, z: -18.5, w: 4.2, h: 2.8, d: 6.0, style: 'carved', climbable: true },
        // 中央断桥高台（由左侧岩崖跳碎裂桥到达 -> 齿轮 #2！）
        { x: -5.8, y: 2.5, z: -24.5, w: 3.0, h: 0.45, d: 3.0, style: 'crumble', crumble: true },
        { x: 0, y: 0, z: -25.5, w: 4.4, h: 2.7, d: 4.4, style: 'carved', climbable: true },
        // 右侧瀑布机关祭坛高台（齿轮 #3 + 瀑布后隐藏圣物 #2）
        { x: 11.2, y: 0, z: -29.0, w: 3.4, h: 1.7, d: 3.4, style: 'carved', climbable: true },
        { x: 11.2, y: 0, z: -35.0, w: 4.4, h: 2.8, d: 6.8, style: 'carved', climbable: true },
        // 司祭神殿大门门框（z = -48.5）
        { x: -8.5, y: 0, z: -48.5, w: 11.0, h: 7.2, d: 1.8, style: 'carved' },
        { x: 8.5, y: 0, z: -48.5, w: 11.0, h: 7.2, d: 1.8, style: 'carved' },
        // 司祭圣坛内殿（亚特兰蒂斯神骸 Scion！）
        { x: 0, y: -1.5, z: -55.5, w: 16, h: 1.5, d: 14, style: 'marble' },
        { x: 0, y: 0, z: -57.5, w: 5.4, h: 0.75, d: 5.4, style: 'gold_trim' },
        { x: -5.6, y: 0, z: -55.0, w: 2.6, h: 2.1, d: 2.6, style: 'carved', climbable: true },
      ],
      pushBlocks: [],
      plates: [],
      levers: [],
      gates: [
        { id: 'gate_scion', x: 0, y: 0, z: -48.5, w: 6.2, h: 5.6, d: 1.0, requireCogs: 3, requireBoss: true, label: '亚特兰蒂斯司祭圣门' },
      ],
      spikes: [
        { id: 'lsp1', x: 0, y: 0, z: -41.5, w: 5.4, d: 2.4, period: 2.5, phase: 0 },
      ],
      darts: [],
      boulders: [],
      checkpoints: [
        { id: 'lcp1', x: 0, y: 0, z: -3.5 },
        { id: 'lcp2', x: 0, y: 0, z: -49.8 },
      ],
      pickups: [
        { id: 'cog1', kind: 'cog', name: '古代齿轮 #1', x: -11.2, y: 2.8, z: -18.5 },
        { id: 'cog2', kind: 'cog', name: '古代齿轮 #2', x: 0, y: 2.7, z: -25.5 },
        { id: 'cog3', kind: 'cog', name: '古代齿轮 #3', x: 11.2, y: 2.8, z: -35.0 },
        { id: 'lart1', kind: 'artifact', name: '恐龙翡翠印', x: -11.2, y: 2.8, z: -20.6 },
        { id: 'lart2', kind: 'artifact', name: '瀑布金圣杯', x: 11.2, y: 2.8, z: -37.5 },
        { id: 'lart3', kind: 'artifact', name: '司祭权杖', x: -5.6, y: 2.1, z: -55.0 },
        { id: 'lmed1', kind: 'medipack', name: '大型急救包', x: -6.8, y: 0, z: -10.0 },
        { id: 'lmed2', kind: 'medipack', name: '大型急救包', x: 7.4, y: 0, z: -22.5 },
      ],
      enemies: [
        { id: 'lw1', kind: 'wolf', name: '迅猛洞狼', x: -5.5, y: 0, z: -12.0, hp: 60, speed: 5.6, dmg: 14 },
        { id: 'trex', kind: 'trex', isBoss: true, name: '史前霸王龙 · T-Rex', x: 0, y: 0, z: -34.0, hp: 420, speed: 5.6, dmg: 28 },
      ],
      torches: [
        [-4.2, 3.0, 2.0], [4.2, 3.0, 2.0], [-3.8, 3.4, -47.5], [3.8, 3.4, -47.5],
        [-4.6, 2.8, -56.5], [4.6, 2.8, -56.5],
      ],
      hasWaterfall: true,
      goal: { x: 0, y: 0.75, z: -57.5, radius: 2.0, kind: 'scion', name: '亚特兰蒂斯神骸 (Scion)' },
    },
  ];
})(typeof window !== 'undefined' ? window : globalThis);
