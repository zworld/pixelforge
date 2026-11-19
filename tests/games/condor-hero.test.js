// Game 3: 神雕侠侣 · 问情剑 第一人称武侠战斗引擎自动化验收
require('../../games/condor-hero/story.js');
require('../../games/condor-hero/engine.js');
const CH = globalThis.CH;

module.exports = function run(ok) {
  // 1) 原著四回设定与杨过断臂前后左右手武器切换
  {
    const c1 = CH.newState(0, 101);
    const c2 = CH.newState(1, 102);
    const c3 = CH.newState(2, 103);
    const c4 = CH.newState(3, 104);
    ok(CH.CHAPTERS.length === 4, '[神雕侠侣] 包含原著四回完整主线剧情（古墓/绝情谷/剑冢/襄阳）');
    ok(c1.hand === 'right' && c1.weapon.id === 'gentle' && c2.hand === 'right', '[神雕侠侣] 1-2 回杨过右手持君子剑');
    ok(c3.hand === 'left' && c3.weapon.id === 'heavy' && c4.hand === 'left' && c4.skill.id === 'palm_ult', '[神雕侠侣] 3-4 回断臂杨过切换左手玄铁重剑与黯然销魂掌');
  }

  // 2) 第一人称移动、视角旋转与三连剑斩命中
  {
    const s = CH.newState(0, 202);
    const z0 = s.pz;
    for (let i = 0; i < 15; i++) CH.step(s, { moveY: 1 });
    ok(s.pz < z0 - 1.0, '[神雕侠侣] 第一人称前移沿着视线 -Z 方向推进');

    // 将单个敌人置于正前方近身距离测试三连斩
    s.enemies = [s.enemies[0]];
    const e = s.enemies[0];
    e.x = s.px;
    e.z = s.pz - 2.2;
    e.hp = 200;
    e.state = 'recover';
    e.stateTimer = 5;
    const hp0 = e.hp;
    let hits = 0;
    for (let i = 0; i < 70; i++) {
      const atk = i === 0 || i === 24 || i === 48;
      CH.step(s, { attackPressed: atk });
      for (const ev of s.events) if (ev.type === 'sword_hit') hits++;
    }
    ok(hits >= 2 && e.hp < hp0 && s.comboStep >= 2, `[神雕侠侣] 第一人称近战连斩命中生效（命中 ${hits} 次，扣血 ${hp0 - e.hp}）`);
  }

  // 3) 只狼式精准弹反红光「危」招式 -> 架势破防 -> 暴击处决
  {
    const s = CH.newState(0, 303);
    s.enemies = [s.enemies[0]];
    const e = s.enemies[0];
    e.x = s.px;
    e.z = s.pz - 1.8;
    e.hp = 180;
    e.posture = e.maxPosture - 20;
    e.state = 'windup';
    e.attackKind = 'peril';
    e.attackIsRanged = false;
    e.windupMax = 0.5;
    e.stateTimer = CH.DT * 2;

    let parried = false;
    let staggered = false;
    const hpBefore = s.hp;
    CH.step(s, { guardPressed: true, guardHeld: true });
    for (let i = 0; i < 4; i++) {
      CH.step(s, { guardHeld: true });
      for (const ev of s.events) {
        if (ev.type === 'parry') parried = true;
        if (ev.type === 'stagger') staggered = true;
      }
    }
    ok(parried && staggered && s.hp === hpBefore, '[神雕侠侣] 红光「危」精准弹反免伤并直接打空敌方架势破防');

    // 对破防敌人出剑触发高伤处决
    let critHit = false;
    for (let i = 0; i < 15; i++) {
      CH.step(s, { attackPressed: i === 0 });
      for (const ev of s.events) if (ev.type === 'sword_hit' && ev.crit) critHit = true;
    }
    ok(critHit && s.crits >= 1, '[神雕侠侣] 对破防硬直敌人出剑触发 2.35x 暴击处决');
  }

  // 4) 金光不可格挡招式：轻功无敌帧闪避成功 vs 站立格挡受伤
  {
    const s = CH.newState(1, 404);
    s.enemies = [s.enemies[0]];
    const e = s.enemies[0];
    e.x = s.px;
    e.z = s.pz - 1.7;
    e.state = 'windup';
    e.attackKind = 'unblock';
    e.attackIsRanged = false;
    e.stateTimer = CH.DT * 2;
    let dodged = false;
    const hp0 = s.hp;
    CH.step(s, { dodgePressed: true, moveX: 1 });
    for (let i = 0; i < 4; i++) {
      CH.step(s, {});
      for (const ev of s.events) if (ev.type === 'dodge_perfect') dodged = true;
    }
    ok(dodged && s.hp === hp0 && s.perfectDodges >= 1, '[神雕侠侣] 轻功无敌帧可完美闪避金光不可格挡招式');
  }

  // 5) 弹反反弹敌方暗器/金轮
  {
    const s = CH.newState(3, 505);
    s.projectiles.push({
      id: 999,
      fromPlayer: false,
      shooterId: s.enemies[0].id,
      kind: 'wheel',
      x: s.px,
      y: 1.35,
      z: s.pz - 1.5,
      vx: 0,
      vz: 14,
      damage: 20,
      postureDmg: 20,
      radius: 0.6,
      life: 2.0,
    });
    CH.step(s, { guardPressed: true, guardHeld: true });
    const deflected = s.projectiles.find((p) => p.id === 999);
    ok(deflected && deflected.fromPlayer === true && s.parries >= 1, '[神雕侠侣] 精准弹反可将金轮/银针暗器反向弹射给敌人');
  }

  // 6) 襄阳决战：黯然销魂掌清场暗器 + Boss 击杀通关评级
  {
    const s = CH.newState(3, 606);
    s.chi = 100;
    s.enemies = [s.enemies[0]];
    s.enemies[0].x = s.px;
    s.enemies[0].z = s.pz - 4.5;
    s.enemies[0].hp = 80;
    s.projectiles.push({ id: 888, fromPlayer: false, kind: 'wheel', x: s.px + 2, y: 1.3, z: s.pz - 3, vx: 0, vz: 5, damage: 18, radius: 0.5, life: 2 });
    let palmFired = false;
    CH.step(s, { skillPressed: true });
    for (const ev of s.events) if (ev.type === 'palm_ult') palmFired = true;
    ok(palmFired && s.projectiles.length === 0 && s.palmAnimTimer > 0.4, '[神雕侠侣] 第四回《黯然销魂掌》震碎全场暗器并触发左手掌法特写');

    // 进入并击败最终 Boss 金轮法王，验证章节通关结算
    s.wave = s.chapter.waves.length;
    s.enemies = [];
    CH.step(s, {}); // 自动触发 Boss 登场
    const boss = s.enemies.find((e) => e.isBoss);
    ok(boss && boss.bossId === 'jinlun' && s.phase === 'boss', '[神雕侠侣] 波次清空后自动触发最终 Boss 金轮法王登场');
    if (boss) {
      boss.x = s.px;
      boss.z = s.pz - 2.0;
      boss.hp = 10;
      for (let i = 0; i < 15; i++) CH.step(s, { attackPressed: i === 0 });
      ok(s.chapterWon === true && ['S', 'A', 'B', 'C'].includes(s.rank), `[神雕侠侣] 击败金轮法王触发通关结算（评分 ${s.rank}）`);
    }
  }

  // 7) 60fps 性能预算检验
  {
    const s = CH.newState(3, 707);
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < 600; i++) {
      CH.step(s, { moveX: Math.sin(i * 0.05), moveY: Math.cos(i * 0.05), yawDelta: 0.01 });
    }
    const perStep = Number(process.hrtime.bigint() - t0) / 1e6 / 600;
    ok(perStep < 1, `[神雕侠侣] 战斗引擎每帧耗时 ${(perStep * 1000).toFixed(1)}µs（预算 16.7ms）`);
  }
};
