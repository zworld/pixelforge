// Game 2: Neon Survivor 3D 确定性引擎自动化验收
require('../../games/neon-survivor/engine.js');
const NS = globalThis.NS;

module.exports = function run(ok) {
  // 1) 360° 平滑走位 + 无敌冲刺
  {
    const s = NS.newState(42);
    for (let i = 0; i < 20; i++) NS.step(s, { ax: 1, ay: 0 });
    ok(s.px > 2.2 && Math.abs(s.pz) < 0.01, '[Neon Survivor] 360° 全向走位物理正常');

    const x0 = s.px;
    NS.step(s, { ax: 1, ay: 0, dash: true });
    for (let i = 0; i < 10; i++) NS.step(s, { ax: 1, ay: 0 });
    ok(s.px - x0 > 3.2 && s.dashCd > 0, '[Neon Survivor] 无敌冲刺爆发位移与冷却生效');
  }

  // 2) 自动瞄准射击 + 击杀掉落经验宝石 + 升级三选一
  {
    const s = NS.newState(99);
    s.enemies.push({ kind: 'swarmer', x: 3.6, z: 0, vx: 0, vz: 0, r: 0.55, hp: 15, maxHp: 15, speed: 0, hitFlash: 0, xp: 15, score: 20, dmg: 10 });
    let shot = false, killed = false, leveled = false;
    for (let i = 0; i < 160; i++) {
      NS.step(s, { ax: 0, ay: 0 });
      for (const ev of s.events) {
        if (ev.type === 'shoot') shot = true;
        if (ev.type === 'kill') killed = true;
        if (ev.type === 'levelup') leveled = true;
      }
      if (leveled) break;
    }
    ok(shot && killed, '[Neon Survivor] 自动瞄准发射等离子弹并击杀敌人');
    ok(leveled && Array.isArray(s.pendingChoices) && s.pendingChoices.length === 3, '[Neon Survivor] 经验磁吸拾取触发升级三选一卡片');
    const pickedId = s.pendingChoices ? s.pendingChoices[0].id : null;
    const applied = pickedId ? NS.applyUpgrade(s, pickedId) : false;
    ok(applied && s.pendingChoices === null && s.upgrades[pickedId] >= 1, `[Neon Survivor] 选择强化卡片 (${pickedId}) 生效并恢复战斗`);
  }

  // 3) EMP 脉冲冲击波清弹幕 + 重创击退敌人 + 连锁闪电
  {
    const s = NS.newState(77);
    s.upgrades.lightning = 2;
    s.enemies.push({ kind: 'charger', x: 3.5, z: 0, vx: 0, vz: 0, r: 0.72, hp: 40, maxHp: 40, speed: 0, hitFlash: 0, xp: 5, score: 40, dmg: 10 });
    s.eBullets.push({ x: 2.5, z: 0, vx: -1, vz: 0, life: 2, dmg: 10 });
    NS.step(s, { nova: true });
    ok(s.eBullets.length === 0 && s.kills >= 1 && s.novas.length === 1, '[Neon Survivor] EMP 脉冲清场弹幕并瞬间秒杀近身重装敌');
  }

  // 4) 100 敌人高压性能预算（60fps 预算 16.7ms）
  {
    const s = NS.newState(2026);
    s.upgrades.multishot = 3;
    s.upgrades.blades = 4;
    s.upgrades.lightning = 3;
    for (let i = 0; i < 100; i++) {
      const a = (i / 100) * Math.PI * 2;
      s.enemies.push({ kind: 'swarmer', x: Math.cos(a) * 14, z: Math.sin(a) * 14, vx: 0, vz: 0, r: 0.5, hp: 200, maxHp: 200, speed: 4, hitFlash: 0, xp: 1, score: 10, dmg: 0 });
    }
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < 600; i++) {
      if (s.pendingChoices) NS.applyUpgrade(s, s.pendingChoices[0].id);
      NS.step(s, { ax: Math.cos(i * 0.05), ay: Math.sin(i * 0.05) });
    }
    const perStep = Number(process.hrtime.bigint() - t0) / 1e6 / 600;
    ok(perStep < 1, `[Neon Survivor] 100 敌高压每帧物理耗时 ${(perStep * 1000).toFixed(1)}µs（预算 16.7ms）`);
  }
};
