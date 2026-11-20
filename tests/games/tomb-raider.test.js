// Game 4: 古墓丽影 · 秘鲁遗迹 3D 动作冒险引擎自动化验收
require('../../games/tomb-raider/levels.js');
require('../../games/tomb-raider/engine.js');
const TR = globalThis.TR;

module.exports = function run(ok) {
  // 1) 三大原著秘鲁关卡结构完整性校验
  {
    ok(TR.LEVELS.length === 3, '[古墓丽影] 包含秘鲁三大经典关卡（洞窟/维尔卡班巴/失落山谷）');
    const l1 = TR.newState(0);
    const l2 = TR.newState(1);
    const l3 = TR.newState(2);
    ok(l1.totalArtifacts === 3 && l2.totalArtifacts === 3 && l3.totalArtifacts === 3, '[古墓丽影] 每关均藏有 3 枚隐藏黄金圣物 (Secrets)');
    ok(l2.boulders.length === 1 && l3.totalCogs === 3 && l3.enemies.some((e) => e.kind === 'trex'), '[古墓丽影] 维尔卡班巴含滚石陷阱，失落山谷含 3 齿轮与史前霸王龙 Boss');
  }

  // 2) 经典抓崖悬吊 (Ledge Grab) -> 悬崖横移 (Shimmy) -> 翻身上台 (Climb)
  {
    const s = TR.newState(0);
    // 将劳拉置于第一关左侧高台边缘下方并起跳面向高台
    s.px = -3.45;
    s.py = 0.05;
    s.pz = 0.5;
    s.facingYaw = Math.PI * 0.5;
    s.camYaw = Math.PI * 0.5;
    let grabbed = false;
    for (let i = 0; i < 45; i++) {
      TR.step(s, { moveY: 1, jumpPressed: i === 0 });
      if (s.action === 'hang') { grabbed = true; break; }
    }
    ok(grabbed && s.action === 'hang', '[古墓丽影] 跳跃触及高台边沿自动触发经典双手抓崖悬吊 (Ledge Grab)');

    const zBefore = s.pz;
    for (let i = 0; i < 15; i++) TR.step(s, { moveX: 1 });
    ok(Math.abs(s.pz - zBefore) > 0.2, '[古墓丽影] 抓崖态支持左右悬崖横移 (Shimmy)');

    for (let i = 0; i < 30; i++) TR.step(s, { jumpPressed: i === 0 });
    ok(s.action !== 'hang' && s.py >= 2.25, `[古墓丽影] 按跳跃/前进键丝滑翻身上高台 (y=${s.py.toFixed(2)}m)`);
  }

  // 3) 推印加石块上太阳压板开启圣殿巨门 + 拉动壁墙拉杆开启密室
  {
    const s = TR.newState(0);
    const pb = s.pushBlocks[0];
    const plate = s.plates[0];
    // 将石块移到压板旁并由劳拉按住 E 推入压板中心
    pb.x = plate.x - 1.1;
    pb.z = plate.z;
    s.px = pb.x - 1.25;
    s.py = 0.05;
    s.pz = pb.z;
    let gateOpened = false;
    for (let i = 0; i < 40; i++) {
      TR.step(s, { moveX: 1, interactHeld: true });
      for (const ev of s.events) if (ev.type === 'gate_open' && ev.id === 'gate_main') gateOpened = true;
    }
    const mainGate = s.gates.find((g) => g.id === 'gate_main');
    ok(plate.active && mainGate.open && gateOpened, '[古墓丽影] 推印加石块压住太阳压板成功开启圣殿巨门');

    // 拉动右侧高台拉杆开启密室
    const lv = s.levers[0];
    s.px = lv.x - 0.8;
    s.py = lv.y;
    s.pz = lv.z;
    TR.step(s, { interactPressed: true });
    const secretGate = s.gates.find((g) => g.id === 'gate_secret');
    ok(lv.pulled && secretGate.open, '[古墓丽影] 拉动石壁拉杆机关开启密室暗门');
  }

  // 4) 维尔卡班巴经典滚石陷阱触发与侧闪安全凹槽生存
  {
    const s = TR.newState(1);
    s.px = 0; s.py = 0.05; s.pz = -18.5;
    TR.step(s, {});
    const b = s.boulders[0];
    ok(b.state === 'rolling', '[古墓丽影] 踏入斜坡触发经典巨石滚落陷阱');
    // 劳拉闪入左侧安全凹槽 (x = -4.5, z = -17.5)，巨石从旁呼啸而过毫发无伤！
    s.px = -4.5; s.pz = -17.5;
    const hp0 = s.hp;
    for (let i = 0; i < 140; i++) TR.step(s, {});
    ok(b.state === 'stopped' && s.hp === hp0 && s.deaths === 0, '[古墓丽影] 侧闪躲入安全凹槽成功逃过滚石碾压');
  }

  // 5) 双枪自动锁敌 + 麦格农爆发 + 急救包/照明弹/求生本能 + 失落山谷击败霸王龙夺取神骸
  {
    const s = TR.newState(2);
    // 测试求生本能、照明弹与急救包
    s.hp = 40;
    TR.step(s, { instinctPressed: true, flarePressed: true, healPressed: true });
    ok(s.instinctOn && s.flareTimer > 25 && s.hp === 100 && s.medipacks === 0, '[古墓丽影] 求生本能 (Q) / 绿色照明弹 (V) / 急救包 (H) 全部生效');

    // 拾取 3 枚古代齿轮 + 双枪/麦格农击败史前霸王龙 Boss
    for (const pk of s.pickups.filter((p) => p.kind === 'cog')) {
      s.px = pk.x; s.py = pk.y; s.pz = pk.z;
      TR.step(s, {});
    }
    ok(s.cogs === 3, '[古墓丽影] 失落山谷成功收集 3 枚古代齿轮');

    const trex = s.enemies.find((e) => e.kind === 'trex');
    s.px = trex.x; s.py = 0.05; s.pz = trex.z + 9.0;
    for (let i = 0; i < 280; i++) {
      TR.step(s, { fireHeld: true, heavyPressed: i % 75 === 0 });
      if (trex.hp <= 0) break;
    }
    const scionGate = s.gates.find((g) => g.id === 'gate_scion');
    ok(trex.hp <= 0 && scionGate.open, '[古墓丽影] 双枪+麦格农击败史前霸王龙且 3 齿轮集齐，司祭圣门轰然开启');

    // 触碰亚特兰蒂斯神骸通关
    s.px = s.level.goal.x; s.py = s.level.goal.y; s.pz = s.level.goal.z;
    TR.step(s, {});
    ok(s.levelWon && ['S', 'A', 'B', 'C'].includes(s.rank), `[古墓丽影] 夺取亚特兰蒂斯神骸触发通关结算（评分 ${s.rank}）`);
  }

  // 5b) 肾上腺素闪避（子弹时间）+ 2.4x 金色暴击校验
  {
    const s = TR.newState(2);
    const trex = s.enemies.find((e) => e.kind === 'trex');
    trex.awoken = true;
    trex.state = 'windup';
    trex.stateTimer = 0.4;
    s.px = trex.x;
    s.py = 0.05;
    s.pz = trex.z + 5.2;
    let adrenTriggered = false;
    TR.step(s, { dodgePressed: true, moveX: 1 });
    for (const ev of s.events) if (ev.type === 'adrenaline_dodge') adrenTriggered = true;
    ok(adrenTriggered && s.adrenalineTimer > 1.0, '[古墓丽影] 霸王龙蓄力瞬间翻滚触发肾上腺素子弹时间');

    const hpBefore = trex.hp;
    TR.step(s, { fireHeld: true });
    ok(hpBefore - trex.hp >= 25, `[古墓丽影] 子弹时间双枪触发 2.4× 金色暴击伤害（单发 ${hpBefore - trex.hp}）`);
  }

  // 6) 60fps 物理性能预算检验
  {
    const s = TR.newState(2);
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < 600; i++) {
      TR.step(s, { moveX: Math.sin(i * 0.04), moveY: Math.cos(i * 0.04), fireHeld: i % 5 === 0 });
    }
    const perStep = Number(process.hrtime.bigint() - t0) / 1e6 / 600;
    ok(perStep < 1, `[古墓丽影] 第三人称 3D 物理与机关引擎每帧耗时 ${(perStep * 1000).toFixed(1)}µs（预算 16.7ms）`);
  }
};
