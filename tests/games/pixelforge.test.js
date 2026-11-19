// Game 1: PixelForge 完整 30 项回归验收
require('../../games/pixelforge/level.js');
require('../../games/pixelforge/engine.js');
const PF = globalThis.PF;
const T = PF.TILE;

module.exports = function run(ok) {
  // 1. 编码与主题
  {
    const sample = PF.sampleLevel();
    const code1 = PF.encode(sample);
    const back1 = PF.decode(code1);
    ok(back1 && back1.tiles.join('') === sample.tiles.join('') && back1.theme === 'meadow', `[PixelForge] v1/默认主题编码往返一致（${code1.length} 字符）`);

    const cyber = PF.cyberLevel();
    const code2 = PF.encode(cyber);
    const back2 = PF.decode(code2);
    ok(back2 && back2.tiles.join('') === cyber.tiles.join('') && back2.theme === 'cyber', `[PixelForge] v2 多主题编码往返一致（${code2.length} 字符，theme=${back2 && back2.theme}）`);
    ok(PF.decode('garbage!!') === null && PF.decode(btoa('1;20;12;99999999#')) === null, '[PixelForge] 非法/恶意数据被拒绝');
  }

  // 2. 经典 + Celeste 级动作手感
  function flat(w = 40, h = 12) {
    const L = PF.createLevel(w, h);
    for (let x = 0; x < w; x++) { PF.set(L, x, h - 2, '#'); PF.set(L, x, h - 1, '#'); }
    PF.set(L, 5, h - 3, 'P');
    return L;
  }
  {
    const L = flat(); const s = PF.newState(L);
    for (let i = 0; i < 10; i++) PF.step(L, s, {});
    const y0 = s.py; let minY = y0;
    PF.step(L, s, { jump: true });
    for (let i = 0; i < 65; i++) { PF.step(L, s, { jump: true }); minY = Math.min(minY, s.py); }
    const full = (y0 - minY) / T;
    const s2 = PF.newState(L);
    for (let i = 0; i < 10; i++) PF.step(L, s2, {});
    PF.step(L, s2, { jump: true }); let min2 = s2.py;
    for (let i = 0; i < 60; i++) { PF.step(L, s2, {}); min2 = Math.min(min2, s2.py); }
    const tap = (y0 - min2) / T;
    ok(full > 3.4 && full < 4.2, `[PixelForge] 长按跳跃高度 ${full.toFixed(2)} 格（含顶点滞空减重）`);
    ok(tap < full * 0.5, `[PixelForge] 轻点跳跃高度 ${tap.toFixed(2)} 格（可变跳跃生效）`);
  }
  {
    const L = PF.createLevel(40, 12);
    for (let x = 0; x <= 8; x++) PF.set(L, x, 10, '#');
    PF.set(L, 2, 9, 'P');
    const s = PF.newState(L);
    let airFrames = 0;
    for (let i = 0; i < 200 && airFrames < 4; i++) { PF.step(L, s, { right: true }); if (!s.onGround && s.px > 8 * T) airFrames++; }
    const vyBefore = s.vy;
    PF.step(L, s, { right: true, jump: true });
    ok(s.vy < -300 && vyBefore >= 0, '[PixelForge] 土狼时间：离开边缘 4 帧后仍能起跳');
  }
  {
    const L = flat(); const s = PF.newState(L);
    s.py -= 40; let pressedAt = -1, jumped = false;
    for (let i = 0; i < 120; i++) {
      const dist = 10 * T - (s.py + PF.PHYS.ph);
      const press = pressedAt < 0 && dist < 16 && dist > 4 && s.vy > 0;
      if (press) pressedAt = i;
      PF.step(L, s, { jump: pressedAt >= 0 });
      if (pressedAt >= 0 && i > pressedAt && s.vy < -300) { jumped = true; break; }
    }
    ok(jumped, '[PixelForge] 跳跃缓冲：提前按键在落地时生效');
  }
  {
    const L = flat();
    PF.set(L, 8, 9, 'B');
    const s = PF.newState(L);
    for (let i = 0; i < 5; i++) PF.step(L, s, {});
    const x0 = s.px;
    let broke = false;
    for (let i = 0; i < 15; i++) {
      PF.step(L, s, { right: true, dash: i === 0 });
      if (s.events.some((e) => e.type === 'break')) broke = true;
    }
    ok(broke && s.px - x0 > 40, '[PixelForge] 八向空中冲刺爆发位移并直接撞碎砖块');
  }
  {
    const L = flat();
    PF.set(L, 5, 7, '#');
    const s = PF.newState(L);
    s.px = 5 * T + 13; s.py = 8 * T + 2; s.onGround = true;
    PF.step(L, s, { jump: true });
    for (let i = 0; i < 8; i++) PF.step(L, s, { jump: true });
    ok(s.py < 7 * T && s.px >= 6 * T, '[PixelForge] 顶角平滑修正：头蹭砖角 3px 自动滑出不卡头');
  }
  {
    const L = flat();
    for (let y = 3; y <= 9; y++) PF.set(L, 8, y, '#');
    const s = PF.newState(L);
    s.px = 8 * T - PF.PHYS.pw; s.py = 5 * T; s.vy = 100; s.onGround = false;
    PF.step(L, s, { right: true });
    const sliding = s.wallDir === 1 && s.vy <= PF.PHYS.wallSlide + 1;
    PF.step(L, s, { right: true, jump: true });
    ok(sliding && s.vx < -140 && s.vy < -350, '[PixelForge] 蹬墙滑行减速 + 蹬墙跳反向弹射生效');
  }
  {
    const L = flat();
    for (let x = 4; x <= 8; x++) PF.set(L, x, 7, '-');
    const s = PF.newState(L);
    s.px = 5 * T; s.py = 7 * T - PF.PHYS.ph; s.onGround = true;
    PF.step(L, s, { down: true, jump: true });
    for (let i = 0; i < 12; i++) PF.step(L, s, {});
    ok(s.py > 7 * T + 4, '[PixelForge] 单向平台支持按 ↓+跳 向下穿透');
  }

  // 3. 高级机关
  {
    const L = flat();
    PF.set(L, 5, 7, 'T'); PF.set(L, 7, 9, 'R'); PF.set(L, 9, 9, 'U');
    const s = PF.newState(L);
    ok(PF.isSolid('R', s.switchOn) && !PF.isSolid('U', s.switchOn), '[PixelForge] ON/OFF 初始态：红实心 / 蓝虚化');
    s.py = 8 * T + 2; s.onGround = true;
    PF.step(L, s, { jump: true });
    for (let i = 0; i < 6; i++) PF.step(L, s, { jump: true });
    ok(!s.switchOn && !PF.isSolid('R', s.switchOn) && PF.isSolid('U', s.switchOn), '[PixelForge] 顶撞 ON/OFF 开关后成功翻转');
  }
  {
    const L = flat();
    PF.set(L, 8, 6, 'C');
    const s = PF.newState(L);
    s.dashes = 0; s.px = 8 * T + 2; s.py = 6 * T + 1; s.vy = 0; s.onGround = false;
    PF.step(L, s, {});
    ok(s.dashes === 1 && s.crystals[0].timer > 2, '[PixelForge] 充能水晶碰触瞬间恢复空中冲刺并进入重生冷却');
  }
  {
    const L = PF.createLevel(30, 12);
    PF.set(L, 5, 8, 'K'); PF.set(L, 5, 7, 'P');
    const s = PF.newState(L);
    for (let i = 0; i < 40; i++) PF.step(L, s, {});
    const collapsed = s.crumbles[0].state === 2 && PF.tileAt(L, s, 5, 8) === '.';
    for (let i = 0; i < 190; i++) { s.py = 2 * T; s.vy = 0; PF.step(L, s, {}); }
    ok(collapsed && s.crumbles[0].state === 0, '[PixelForge] 碎裂浮板完整周期：抖动 → 崩塌 → 重生');
  }
  {
    const L = flat();
    for (let x = 5; x <= 20; x++) PF.set(L, x, 10, 'I');
    const sIce = PF.newState(L);
    for (let i = 0; i < 20; i++) PF.step(L, sIce, { right: true });
    const vStart = sIce.vx;
    for (let i = 0; i < 12; i++) PF.step(L, sIce, {});
    ok(vStart > 40 && sIce.vx > vStart * 0.4, '[PixelForge] 冰面低摩擦滑行惯性生效');
  }
  {
    const L = PF.createLevel(30, 12);
    PF.set(L, 8, 8, 'M'); PF.set(L, 12, 7, 'F'); PF.set(L, 8, 7, 'P');
    const s = PF.newState(L);
    s.px = 8 * T + 4; s.py = 8 * T + 2 - PF.PHYS.ph; s.onGround = true;
    const x0 = s.px;
    for (let i = 0; i < 30; i++) PF.step(L, s, {});
    ok(s.px - x0 > 15, '[PixelForge] 移动平台自动往返并同步承载玩家位移');
    s.px = 12 * T + 2; s.py = 7 * T;
    PF.step(L, s, {});
    ok(s.checkpoint && s.checkpoint.x === 12 && s.checkpoint.y === 7, '[PixelForge] 存档旗激活并记录重生点');
  }

  // 4. 4 大精品关卡 AI 自动通关与回放
  for (const p of PF.PRESETS) {
    const L = p.build();
    const t0 = Date.now();
    const res = PF.solveLevel(L, { width: 320, hold: 5, maxDepth: 650 });
    ok(!!res, `[PixelForge] AI 通关 [${p.name}]（${res ? res.explored : '-'} 节点，${Date.now() - t0}ms）`);
    if (res) {
      const s = PF.newState(L);
      for (const a of res.path) for (let k = 0; k < res.hold && !s.won; k++) PF.step(L, s, a);
      ok(s.won && !s.dead, `  ↳ 回放复现 [${p.name}]：用时 ${s.time.toFixed(2)}s，金币 ${s.coins}/${s.totalCoins}`);
    }
  }

  // 5. 性能与 3D 拾取/编辑器
  {
    const big = PF.createLevel(400, 60);
    for (let x = 0; x < 400; x++) PF.set(big, x, 58, '#');
    for (let i = 0; i < 200; i++) PF.set(big, 10 + i * 2, 57, 'E');
    PF.set(big, 2, 57, 'P');
    const t0 = process.hrtime.bigint();
    const s = PF.newState(big);
    const tInit = Number(process.hrtime.bigint() - t0) / 1e6;
    const t1 = process.hrtime.bigint();
    for (let i = 0; i < 6000; i++) PF.step(big, s, { right: i % 100 < 70, jump: i % 30 === 0 });
    const perStep = Number(process.hrtime.bigint() - t1) / 1e6 / 6000;
    ok(tInit < 50, `[PixelForge] 最大关卡（400×60）初始化 ${tInit.toFixed(2)}ms（< 50ms）`);
    ok(perStep < 1, `[PixelForge] 每帧物理耗时 ${(perStep * 1000).toFixed(1)}µs（200 敌人）`);
  }
  {
    globalThis.window = globalThis;
    globalThis.THREE = require('../../vendor/three.min.js');
    require('../../games/pixelforge/render3d.js');
    require('../../games/pixelforge/editor.js');
    const THREE = globalThis.THREE;

    const fakeRenderer = Object.create(PF.Renderer3D.prototype);
    fakeRenderer.w = 860; fakeRenderer.h = 855;
    fakeRenderer.camera = new THREE.PerspectiveCamera(42, fakeRenderer.w / fakeRenderer.h, 0.1, 450);
    fakeRenderer.skyDome = { position: new THREE.Vector3() };
    fakeRenderer.sun = { position: new THREE.Vector3(), target: { position: new THREE.Vector3() } };
    fakeRenderer.raycaster = new THREE.Raycaster();
    fakeRenderer.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
    fakeRenderer.canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 860, height: 855 }) };

    const cam = { tx: 12.5, ty: -7.5, dist: 24, yaw: -0.14, pitch: 0.14 };
    const centerPt = fakeRenderer.pickPoint(430, 427.5, cam);
    ok(centerPt && Math.hypot(centerPt.x - cam.tx, centerPt.y - cam.ty) < 1e-5, '[PixelForge] 3D 透视中心射线精确命中 (tx, ty, 0)');

    const before = fakeRenderer.pickPoint(260, 310, cam);
    cam.dist *= 0.75;
    const after = fakeRenderer.pickPoint(260, 310, cam);
    cam.tx += before.x - after.x; cam.ty += before.y - after.y;
    const check = fakeRenderer.pickPoint(260, 310, cam);
    ok(Math.hypot(check.x - before.x, check.y - before.y) < 1e-5, '[PixelForge] 3D 滚轮缩放围绕光标零漂移');

    const L = PF.createLevel(30, 15);
    PF.set(L, 2, 12, 'P');
    const ed = new PF.Editor({
      level: L, mode: 'edit', cam, renderer: fakeRenderer,
      markDirty() {}, onLevelChanged() {}, updateStatus() {}, syncToolButtons() {}, toast() {},
    });
    ed.paintRect(5, 6, 8, 7, 'I');
    ok(PF.get(L, 5, 6) === 'I' && PF.get(L, 8, 7) === 'I', '[PixelForge] 编辑器矩形框选填充生效');
    ed.undo();
    ok(PF.get(L, 5, 6) === '.' && PF.get(L, 8, 7) === '.', '[PixelForge] 矩形填充单次撤销还原');
    ed.setTile(10, 5, 'B');
    ed.cancelStroke();
    ok(PF.get(L, 10, 5) === '.', '[PixelForge] 移动端双指防误触 cancelStroke 回滚生效');
  }
};
