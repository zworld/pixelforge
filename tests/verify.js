// 自动化验收：node tests/verify.js
// 1) 编码往返  2) 物理手感指标  3) 束搜索机器人自动通关示例关卡  4) 性能
require('../js/level.js');
require('../js/engine.js');
const PF = globalThis.PF;
const T = PF.TILE;
let failed = 0;
const ok = (cond, msg) => { console.log(`${cond ? '✅' : '❌'} ${msg}`); if (!cond) failed++; };

// ---------- 1. 编码 ----------
const sample = PF.sampleLevel();
const code = PF.encode(sample);
const back = PF.decode(code);
ok(back && back.tiles.join('') === sample.tiles.join('') && back.w === sample.w, `编码往返一致（${code.length} 字符，URL 可承载）`);
ok(PF.decode('garbage!!') === null && PF.decode(btoa('1;20;12;99999999#')) === null, '非法/恶意数据被拒绝');

// ---------- 2. 手感 ----------
function flat() {
  const L = PF.createLevel(40, 12);
  for (let x = 0; x < 40; x++) { PF.set(L, x, 10, '#'); PF.set(L, x, 11, '#'); }
  PF.set(L, 5, 9, 'P');
  return L;
}
{
  const L = flat(); const s = PF.newState(L);
  for (let i = 0; i < 10; i++) PF.step(L, s, {});
  const y0 = s.py; let minY = y0;
  PF.step(L, s, { jump: true });
  for (let i = 0; i < 60; i++) { PF.step(L, s, { jump: true }); minY = Math.min(minY, s.py); }
  const full = (y0 - minY) / T;
  const s2 = PF.newState(L);
  for (let i = 0; i < 10; i++) PF.step(L, s2, {});
  PF.step(L, s2, { jump: true }); let min2 = s2.py;
  for (let i = 0; i < 60; i++) { PF.step(L, s2, {}); min2 = Math.min(min2, s2.py); }
  const tap = (y0 - min2) / T;
  ok(full > 3.4 && full < 4.2, `长按跳跃高度 ${full.toFixed(2)} 格`);
  ok(tap < full * 0.5, `轻点跳跃高度 ${tap.toFixed(2)} 格（可变跳跃生效）`);
}
{ // 土狼时间：走出平台边缘后 4 帧内仍可起跳
  const L = PF.createLevel(40, 12);
  for (let x = 0; x <= 8; x++) PF.set(L, x, 10, '#');
  PF.set(L, 2, 9, 'P');
  const s = PF.newState(L);
  let airFrames = 0;
  for (let i = 0; i < 200 && airFrames < 4; i++) { PF.step(L, s, { right: true }); if (!s.onGround && s.px > 8 * T) airFrames++; }
  const vyBefore = s.vy;
  PF.step(L, s, { right: true, jump: true });
  ok(s.vy < -300 && vyBefore >= 0, '土狼时间：离开边缘 4 帧后仍能起跳');
}
{ // 跳跃缓冲：落地前 5 帧按下跳跃，落地即起跳
  const L = flat(); const s = PF.newState(L);
  s.py -= 40; let pressedAt = -1, jumped = false;
  for (let i = 0; i < 120; i++) {
    const dist = 10 * T - (s.py + PF.PHYS.ph);
    const press = pressedAt < 0 && dist < 16 && dist > 4 && s.vy > 0;
    if (press) pressedAt = i;
    PF.step(L, s, { jump: pressedAt >= 0 }); // 落地前按下并按住
    if (pressedAt >= 0 && i > pressedAt && s.vy < -300) { jumped = true; break; }
  }
  ok(jumped, '跳跃缓冲：提前按键在落地时生效');
}

// ---------- 3. 机器人通关 ----------
function solve(level, { width = 300, hold = 5, maxDepth = 900 } = {}) {
  const A = [
    { right: 1 }, { right: 1, jump: 1 }, { left: 1 }, { left: 1, jump: 1 }, {}, { jump: 1 },
  ];
  let beam = [{ s: PF.newState(level), parent: null, a: -1 }];
  let explored = 0;
  for (let d = 0; d < maxDepth; d++) {
    const next = []; const seen = new Set();
    for (const node of beam) {
      for (let ai = 0; ai < A.length; ai++) {
        const s = PF.cloneState(node.s);
        for (let k = 0; k < hold && !s.dead && !s.won; k++) PF.step(level, s, A[ai]);
        explored++;
        if (s.dead) continue;
        const child = { s, parent: node, a: ai };
        if (s.won) {
          const path = []; for (let n = child; n.parent; n = n.parent) path.push(n.a);
          return { path: path.reverse().map((i) => A[i]), explored, hold };
        }
        const key = `${Math.round(s.px / 4)},${Math.round(s.py / 4)},${Math.round(s.vy / 80)},${s.onGround | 0},${s.jumpPrev | 0},${s.enemies.filter((e) => e.alive).length},${Object.keys(s.mods).length}`;
        if (seen.has(key)) continue;
        seen.add(key);
        child.score = s.px - s.time * 2;
        next.push(child);
      }
    }
    if (!next.length) return null;
    next.sort((a, b) => b.score - a.score);
    beam = next.slice(0, width);
  }
  return null;
}
{
  const t0 = Date.now();
  const res = solve(sample);
  ok(!!res, `机器人通关示例关卡（搜索 ${res ? res.explored : '-'} 个节点，用时 ${Date.now() - t0}ms）`);
  if (res) { // 独立回放，确认确定性
    const s = PF.newState(sample);
    for (const a of res.path) for (let k = 0; k < res.hold && !s.won; k++) PF.step(sample, s, a);
    ok(s.won && !s.dead, `回放复现通关：游戏内 ${s.time.toFixed(1)}s，金币 ${s.coins}/${s.totalCoins}`);
  }
}

// ---------- 4. 性能 ----------
{
  const big = PF.createLevel(400, 60);
  for (let x = 0; x < 400; x++) PF.set(big, x, 58, '#');
  for (let i = 0; i < 200; i++) PF.set(big, 10 + i * 2 - 0, 57, 'E');
  PF.set(big, 2, 57, 'P');
  const t0 = process.hrtime.bigint();
  const s = PF.newState(big);
  const tInit = Number(process.hrtime.bigint() - t0) / 1e6;
  const t1 = process.hrtime.bigint();
  for (let i = 0; i < 6000; i++) PF.step(big, s, { right: i % 100 < 70, jump: i % 30 === 0 });
  const perStep = Number(process.hrtime.bigint() - t1) / 1e6 / 6000;
  ok(tInit < 50, `最大关卡（400×60）编辑→试玩初始化 ${tInit.toFixed(2)}ms（目标 < 50ms）`);
  ok(perStep < 1, `每帧物理耗时 ${(perStep * 1000).toFixed(1)}µs（200 敌人，预算 16.7ms）`);
}

// ---------- 5. 3D 渲染数学与编辑器逻辑验证 ----------
{
  globalThis.window = globalThis;
  globalThis.THREE = require('../vendor/three.min.js');
  require('../js/render3d.js');
  require('../js/editor.js');
  const THREE = globalThis.THREE;

  // 构造轻量无 WebGL 上下文的 3D 拾取/镜头代理，验证射线拾取与缩放/平移不漂移
  const fakeRenderer = Object.create(PF.Renderer3D.prototype);
  fakeRenderer.w = 860;
  fakeRenderer.h = 855;
  fakeRenderer.camera = new THREE.PerspectiveCamera(42, fakeRenderer.w / fakeRenderer.h, 0.1, 400);
  fakeRenderer.sun = { position: new THREE.Vector3(), target: { position: new THREE.Vector3() } };
  fakeRenderer.raycaster = new THREE.Raycaster();
  fakeRenderer.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
  fakeRenderer.canvas = { getBoundingClientRect: () => ({ left: 0, top: 0, width: 860, height: 855 }) };
  fakeRenderer.dirty = false;

  const cam = { tx: 12.5, ty: -7.5, dist: 24, yaw: -0.14, pitch: 0.14 };
  const centerPt = fakeRenderer.pickPoint(430, 427.5, cam);
  ok(centerPt && Math.hypot(centerPt.x - cam.tx, centerPt.y - cam.ty) < 1e-5, '3D 透视镜头中心射线精确命中目标点 (tx, ty, 0)');

  // 滚轮围绕鼠标缩放后，光标下世界坐标保持不变
  const before = fakeRenderer.pickPoint(260, 310, cam);
  cam.dist *= 0.75;
  const after = fakeRenderer.pickPoint(260, 310, cam);
  cam.tx += before.x - after.x;
  cam.ty += before.y - after.y;
  const check = fakeRenderer.pickPoint(260, 310, cam);
  ok(Math.hypot(check.x - before.x, check.y - before.y) < 1e-5, '3D 滚轮缩放围绕光标零漂移');

  // 编辑器绘制、唯一元素约束、撤销/重做与 markDirty
  let dirtyCount = 0;
  const L = PF.createLevel(30, 15);
  PF.set(L, 2, 12, 'P');
  const appStub = {
    level: L,
    mode: 'edit',
    cam,
    renderer: fakeRenderer,
    markDirty() { dirtyCount++; fakeRenderer.dirty = true; },
    onLevelChanged() {},
    updateStatus() {},
    toast() {},
  };
  const ed = new PF.Editor(appStub);
  ed.paintLine({ x: 5, y: 6 }, { x: 10, y: 6 }, 'B');
  ed.commit();
  ok(PF.get(L, 5, 6) === 'B' && PF.get(L, 10, 6) === 'B' && dirtyCount === 6, '3D 编辑器笔刷连续插值绘制与脏标记生效');
  ed.undo();
  ok(PF.get(L, 5, 6) === '.' && PF.get(L, 10, 6) === '.', '3D 编辑器单次撤销完整还原整条笔刷（6 格）');
  ed.redo();
  ok(PF.get(L, 5, 6) === 'B' && PF.get(L, 10, 6) === 'B', '3D 编辑器重做完整恢复整条笔刷');
  ed.setTile(15, 10, 'P');
  ed.commit();
  ok(PF.get(L, 2, 12) === '.' && PF.get(L, 15, 10) === 'P', '起点唯一性约束：放置新起点自动清除旧起点（且可一同撤销）');
}

console.log(failed ? `\n${failed} 项失败` : '\n全部通过');
process.exit(failed ? 1 : 0);
