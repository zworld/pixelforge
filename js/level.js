/* PixelForge — 关卡数据模型、v2 编码（兼容 v1）、主题配置与 4 大精品示例关卡 */
(function (G) {
  'use strict';
  const PF = (G.PF = G.PF || {});

  const TILE = 16;

  // 4 大风格化 3D 主题
  const THEMES = {
    meadow: { id: 'meadow', name: '翠绿草原', icon: '🌿', desc: '阳光青峰与微风蒲公英' },
    cyber:  { id: 'cyber',  name: '霓虹赛博', icon: '🌃', desc: '午夜霓虹塔与红蓝脉冲' },
    frost:  { id: 'frost',  name: '冰霜雪山', icon: '❄️', desc: '极光雪松与冰晶滑道' },
    volcano:{ id: 'volcano',name: '熔岩地堡', icon: '🌋', desc: '暗黑玄武岩与炽热余烬' },
  };
  const THEME_IDS = Object.keys(THEMES);

  // 元素定义：单字符即紧凑存储格式（保留原 9 种字符完全向后兼容）
  const TILES = {
    '#': { name: '地面',     key: '1', cat: 'terrain', desc: '实心地形（随主题变换材质）' },
    'B': { name: '砖块',     key: '2', cat: 'terrain', desc: '可从下方顶碎或冲刺撞碎' },
    '-': { name: '单向平台', key: '3', cat: 'terrain', desc: '可向上穿透，按 ↓+跳 下落' },
    'I': { name: '冰块',     key: '',  cat: 'terrain', desc: '低摩擦滑行表面，保留高速惯性' },
    'K': { name: '碎裂板',   key: '',  cat: 'terrain', desc: '站立 0.45s 后崩塌，稍后自动重生' },
    'M': { name: '移动平台', key: '',  cat: 'terrain', desc: '水平往返机械悬浮平台' },

    '^': { name: '尖刺',     key: '4', cat: 'gizmo',   desc: '碰到即死' },
    'S': { name: '弹簧',     key: '6', cat: 'gizmo',   desc: '超高弹跳并重置空中冲刺' },
    'C': { name: '充能水晶', key: '',  cat: 'gizmo',   desc: '碰触立即恢复空中冲刺（2.5s 重生）' },
    'T': { name: '红蓝开关', key: '',  cat: 'gizmo',   desc: '顶撞或冲刺切换全局红/蓝方块虚实' },
    'R': { name: '红方块',   key: '',  cat: 'gizmo',   desc: '开关 ON 时实心，OFF 时虚化' },
    'U': { name: '蓝方块',   key: '',  cat: 'gizmo',   desc: '开关 OFF 时实心，ON 时虚化' },

    'o': { name: '金币',     key: '5', cat: 'entity',  desc: '收集（连吃音阶递增）' },
    'E': { name: '巡逻敌人', key: '7', cat: 'entity',  desc: '踩头消灭并重置冲刺，连踩升调' },
    'F': { name: '存档旗',   key: '',  cat: 'entity',  desc: '激活后死亡直接从此处零延迟复活' },
    'P': { name: '起点',     key: '8', cat: 'entity',  desc: '唯一出生点', unique: true },
    'G': { name: '终点',     key: '9', cat: 'entity',  desc: '唯一通关旗帜', unique: true },
  };
  const VALID = new Set(['.', ...Object.keys(TILES)]);
  const LIMITS = { minW: 20, maxW: 400, minH: 12, maxH: 60 };

  function createLevel(w, h, theme = 'meadow') {
    return { w, h, theme: THEMES[theme] ? theme : 'meadow', tiles: new Array(w * h).fill('.') };
  }
  function inBounds(level, x, y) {
    return x >= 0 && y >= 0 && x < level.w && y < level.h;
  }
  function get(level, x, y) {
    return inBounds(level, x, y) ? level.tiles[y * level.w + x] : null;
  }
  function set(level, x, y, ch) {
    if (inBounds(level, x, y)) level.tiles[y * level.w + x] = ch;
  }
  function find(level, ch) {
    const i = level.tiles.indexOf(ch);
    return i < 0 ? null : { x: i % level.w, y: (i / level.w) | 0 };
  }
  function cloneLevel(level) {
    return { w: level.w, h: level.h, theme: level.theme || 'meadow', tiles: level.tiles.slice() };
  }
  // 改尺寸：以左下角为锚点（地面通常在底部）
  function resize(level, w, h) {
    const out = createLevel(w, h, level.theme || 'meadow');
    const dy = h - level.h;
    for (let y = 0; y < level.h; y++) {
      for (let x = 0; x < level.w; x++) {
        set(out, x, y + dy, level.tiles[y * level.w + x]);
      }
    }
    return out;
  }

  // ---- 编码：RLE + base64url，v2 含主题且完全兼容 v1 ----
  function rle(str) {
    let out = '';
    let i = 0;
    while (i < str.length) {
      let j = i;
      while (j < str.length && str[j] === str[i]) j++;
      const n = j - i;
      out += n >= 3 ? n + str[i] : str[i].repeat(n);
      i = j;
    }
    return out;
  }
  function unrle(s, maxLen) {
    let out = '';
    let num = '';
    for (const c of s) {
      if (c >= '0' && c <= '9') {
        num += c;
        continue;
      }
      const n = num ? parseInt(num, 10) : 1;
      num = '';
      if (out.length + n > maxLen) throw new Error('数据过长');
      out += c.repeat(n);
    }
    return out;
  }
  function b64urlEncode(s) {
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64urlDecode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return atob(s);
  }
  function encode(level) {
    const theme = THEMES[level.theme] ? level.theme : 'meadow';
    if (theme === 'meadow') {
      return b64urlEncode(`1;${level.w};${level.h};${rle(level.tiles.join(''))}`);
    }
    return b64urlEncode(`2;${level.w};${level.h};${theme};${rle(level.tiles.join(''))}`);
  }
  function decode(code) {
    try {
      const raw = b64urlDecode(String(code).trim());
      const parts = raw.split(';');
      let w, h, theme = 'meadow', bodyRaw;
      if (parts.length === 4 && parts[0] === '1') {
        w = parseInt(parts[1], 10);
        h = parseInt(parts[2], 10);
        bodyRaw = parts[3];
      } else if (parts.length === 5 && parts[0] === '2') {
        w = parseInt(parts[1], 10);
        h = parseInt(parts[2], 10);
        theme = THEMES[parts[3]] ? parts[3] : 'meadow';
        bodyRaw = parts[4];
      } else {
        return null;
      }
      if (!(w >= LIMITS.minW && w <= LIMITS.maxW && h >= LIMITS.minH && h <= LIMITS.maxH)) return null;
      const body = unrle(bodyRaw, w * h);
      if (body.length !== w * h) return null;
      for (const c of body) if (!VALID.has(c)) return null;
      return { w, h, theme, tiles: body.split('') };
    } catch (e) {
      return null;
    }
  }

  // ---- 关卡构造辅助 ----
  function makeFill(L) {
    return (x0, y0, x1, y1, ch) => {
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(L, x, y, ch);
    };
  }

  // 关卡 1：翠绿启程（经典入门 + 碎裂板、弹簧、存档旗、砖块）
  function sampleLevel() {
    const W = 110, H = 15;
    const L = createLevel(W, H, 'meadow');
    const fill = makeFill(L);
    fill(0, 13, W - 1, 14, '#'); // 基础地面
    fill(13, 13, 15, 14, '.');   // 坑 1
    fill(61, 13, 64, 14, '.');   // 坑 2（带碎裂浮板）
    fill(91, 13, 94, 14, '.');   // 坑 3

    set(L, 2, 12, 'P');
    fill(5, 10, 8, 10, 'o');
    fill(18, 9, 22, 9, '-');
    fill(18, 8, 22, 8, 'o');
    fill(26, 12, 27, 12, '^');
    set(L, 32, 12, 'E');
    fill(37, 10, 38, 12, '#'); // 3 格高墙（可跳可蹬墙）
    set(L, 44, 12, 'S');       // 弹簧 → 高台奖励
    fill(46, 6, 52, 6, '#');
    fill(46, 5, 52, 5, 'o');
    set(L, 54, 12, 'F');       // 中段存档旗
    fill(56, 9, 59, 9, 'B');   // 可顶碎/冲刺破砖
    fill(56, 8, 59, 8, 'o');
    fill(62, 12, 63, 12, 'K'); // 坑 2 上方碎裂板
    set(L, 68, 12, 'E');
    set(L, 76, 12, 'E');
    fill(81, 12, 83, 12, '^');
    fill(80, 9, 84, 9, '-');
    for (let i = 0; i < 4; i++) fill(85 + i, 12 - i, 85 + i, 12, '#'); // 台阶
    fill(89, 9, 90, 12, '#');
    set(L, 92, 8, 'C');        // 坑 3 上方充能水晶（可选酷炫冲刺）
    fill(96, 10, 99, 10, 'o');
    set(L, 105, 12, 'G');
    return L;
  }

  // 关卡 2：红蓝律动（Cyber 主题，SMM2 风格 ON/OFF 开关 + 移动平台 + 冲刺破砖）
  function cyberLevel() {
    const W = 96, H = 16;
    const L = createLevel(W, H, 'cyber');
    const fill = makeFill(L);
    fill(0, 14, 18, 15, '#');
    set(L, 2, 13, 'P');
    fill(6, 11, 9, 11, 'o');

    // 第一段：红色实心桥（默认 ON）
    fill(19, 13, 25, 13, 'R');
    fill(20, 11, 24, 11, 'o');
    fill(26, 13, 34, 15, '#');

    // 触发 ON/OFF 开关 → 切为 OFF，开启蓝桥、消失红墙
    set(L, 30, 10, 'T');
    fill(33, 10, 33, 12, 'R'); // 红门：切 OFF 后打开！
    fill(36, 13, 41, 13, 'U'); // 蓝桥：切 OFF 后变实心！
    fill(37, 11, 40, 11, 'o');
    fill(42, 13, 50, 15, '#');
    set(L, 45, 12, 'F'); // 存档旗

    // 中段：移动平台 + 冲刺水晶越过深渊
    set(L, 54, 12, 'M');
    fill(53, 9, 57, 9, 'o');
    fill(60, 12, 65, 15, '#');
    set(L, 62, 11, 'E');

    // 后段：弹簧 + 蓝红交错跳 + 破砖冲线
    set(L, 64, 11, 'S');
    fill(67, 7, 73, 7, 'U'); // 仍为 OFF，蓝台实心
    fill(68, 6, 72, 6, 'o');
    fill(74, 10, 79, 10, 'K'); // 碎裂滑梯
    set(L, 81, 8, 'C'); // 充能水晶冲刺穿砖
    fill(84, 10, 95, 15, '#');
    fill(86, 7, 86, 9, 'B'); // 砖墙（可冲刺撞碎或跳越）
    fill(88, 8, 90, 8, 'o');
    set(L, 92, 9, 'G');
    return L;
  }

  // 关卡 3：蔚蓝之巅（Frost 主题，Celeste 风格蹬墙跳 + 冰面滑跳 + 水晶空中连冲）
  function frostLevel() {
    const W = 94, H = 18;
    const L = createLevel(W, H, 'frost');
    const fill = makeFill(L);
    fill(0, 15, 14, 17, '#');
    set(L, 2, 14, 'P');

    // 冰面起跑滑跳段
    fill(6, 15, 13, 15, 'I');
    fill(8, 13, 11, 13, 'o');
    fill(17, 14, 24, 17, '#');
    fill(18, 14, 23, 14, 'I');
    set(L, 21, 13, 'E');

    // 蔚蓝风蹬墙跳竖井（左右双墙）
    fill(25, 8, 26, 17, '#');   // 左壁
    fill(31, 6, 32, 14, '#');   // 右壁（上方开放通往高台）
    fill(27, 15, 34, 17, '#');  // 井底安全地面
    fill(28, 12, 29, 12, 'o');
    fill(28, 9, 29, 9, 'o');
    fill(33, 6, 40, 8, '#');    // 高台顶
    set(L, 36, 5, 'F');         // 高台存档旗

    // 高空水晶连冲飞跃（冰川大峡谷）
    fill(42, 7, 44, 7, 'K');    // 碎裂踏板
    set(L, 48, 6, 'C');         // 水晶 1
    fill(51, 8, 54, 8, '-');    // 中继单向平台
    fill(52, 7, 53, 7, 'o');
    set(L, 58, 7, 'C');         // 水晶 2
    fill(61, 10, 68, 17, '#');
    fill(62, 10, 67, 10, 'I');  // 冰面减速跑道
    set(L, 66, 9, 'S');         // 冰川大弹簧

    // 终段：浮空碎裂桥 + 冲线
    fill(70, 5, 74, 5, 'K');
    fill(71, 4, 73, 4, 'o');
    set(L, 78, 6, 'C');
    fill(81, 9, 93, 17, '#');
    fill(83, 9, 87, 9, 'I');
    fill(84, 7, 87, 7, 'o');
    set(L, 90, 8, 'G');
    return L;
  }

  // 关卡 4：熔岩试炼（Volcano 主题，全机关综合极限挑战）
  function volcanoLevel() {
    const W = 104, H = 16;
    const L = createLevel(W, H, 'volcano');
    const fill = makeFill(L);
    fill(0, 13, 11, 15, '#');
    set(L, 2, 12, 'P');
    fill(5, 11, 7, 11, 'o');

    // 碎裂踏板越过熔岩沟
    fill(14, 12, 16, 12, 'K');
    fill(19, 11, 21, 11, 'K');
    fill(24, 12, 32, 15, '#');
    fill(26, 11, 27, 11, '^');
    set(L, 30, 11, 'E');

    // 开关机关段
    set(L, 31, 8, 'T');
    fill(35, 11, 40, 11, 'U'); // 切 OFF 后通行
    fill(36, 9, 39, 9, 'o');
    fill(42, 11, 49, 15, '#');
    set(L, 45, 10, 'F');       // 存档旗

    // 移动平台 + 空中踩怪 + 充能水晶
    set(L, 53, 11, 'M');
    fill(59, 11, 66, 15, '#');
    set(L, 62, 10, 'E');
    set(L, 65, 10, 'S');       // 弹簧腾空
    fill(68, 6, 73, 6, 'B');   // 空中砖台
    fill(69, 5, 72, 5, 'o');
    set(L, 77, 6, 'C');        // 水晶飞跃
    fill(80, 9, 85, 9, 'K');   // 碎裂冲刺道
    set(L, 88, 8, 'C');        // 终极二连冲水晶
    fill(91, 11, 103, 15, '#');
    fill(93, 9, 96, 9, 'o');
    set(L, 100, 10, 'G');
    return L;
  }

  const PRESETS = [
    { id: 'meadow',  name: '1. 翠绿启程', theme: 'meadow',  desc: '经典跳跃与碎裂板入门', build: sampleLevel },
    { id: 'cyber',   name: '2. 红蓝律动', theme: 'cyber',   desc: 'ON/OFF 开关与移动平台', build: cyberLevel },
    { id: 'frost',   name: '3. 蔚蓝之巅', theme: 'frost',   desc: '蹬墙跳、冰面与水晶连冲', build: frostLevel },
    { id: 'volcano', name: '4. 熔岩试炼', theme: 'volcano', desc: '全机关综合极限挑战',   build: volcanoLevel },
  ];

  Object.assign(PF, {
    TILE, THEMES, THEME_IDS, TILES, VALID, LIMITS, PRESETS,
    createLevel, cloneLevel, inBounds, get, set, find, resize,
    encode, decode, sampleLevel, cyberLevel, frostLevel, volcanoLevel,
  });
})(typeof window !== 'undefined' ? window : globalThis);
