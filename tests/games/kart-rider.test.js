// 跑跑卡丁车 · 巅峰漂移 — 1:1 核心物理、漂移集气、撞墙断气、双喷、8大道具与AI全量自动化验收
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadKR() {
  const ctx = { window: {}, globalThis: {}, console, Math, Date };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  const root = path.resolve(__dirname, '../..');
  for (const rel of ['games/kart-rider/tracks.js', 'games/kart-rider/engine.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, rel), 'utf8'), ctx, { filename: rel });
  }
  return ctx.KR;
}

module.exports = function (ok) {
  const KR = loadKR();
  const dt = 1 / 60;

  // 1) 四大赛道样条闭合与投影精度
  ok(KR.TRACK_DEFS.length === 4, '[跑跑卡丁车] 包含四大经典赛道（城镇高速/森林发夹/沙漠金字塔/冰峰霓虹）');
  ok(KR.KARTS.length === 4 && KR.DRIVERS.length === 4, '[跑跑卡丁车] 包含 4 大传奇赛车与 4 位经典车手');

  let allTracksValid = true;
  for (const def of KR.TRACK_DEFS) {
    const tr = KR.buildTrackData(def);
    const p0 = KR.sampleTrackAtS(tr, 0);
    const pEnd = KR.sampleTrackAtS(tr, tr.totalLen - 0.01);
    const seamDist = Math.hypot(pEnd.x - p0.x, pEnd.y - p0.y, pEnd.z - p0.z);
    const proj = KR.projectToTrack(tr, p0.x + p0.rx * 3.0, p0.z + p0.rz * 3.0, 0);
    if (tr.totalLen < 500 || seamDist > 0.5 || Math.abs(proj.lat - 3.0) > 0.35 || tr.itemBoxes.length < 12) {
      allTracksValid = false;
    }
  }
  ok(allTracksValid, '[跑跑卡丁车] 4 条闭合 3D 样条赛道零裂缝衔接且 O(1) 横向投影误差 < 0.35m');

  // 2) 3-2-1-GO! 与 超级起步判定
  const sStart = KR.createRaceState({ trackIndex: 0, mode: 'speed', kartId: 'burst', driverId: 'dao' });
  ok(sStart.racers.length === 8 && sStart.phase === 'countdown', '[跑跑卡丁车] 8 人发车格与 3-2-1-GO 倒计时就绪');
  for (let i = 0; i < 185; i++) KR.stepRace(sStart, { throttle: 0, steer: 0 }, dt); // 走到倒计时最后 ~0.12s
  for (let i = 0; i < 15; i++) KR.stepRace(sStart, { throttle: 1, steer: 0 }, dt);  // 精准在 GO! 瞬间踩油门
  ok(sStart.phase === 'racing' && sStart.player.startBoostTimer > 0.8, '[跑跑卡丁车] 绿灯瞬间踩油门触发「超级起步」爆发加速');

  // 3) Shift 漂移集气 + 最佳化反打拉车头 + 小喷 + 双喷 + 集满 N2O 大喷！
  const sDrift = KR.createRaceState({ trackIndex: 0, mode: 'speed', kartId: 'cotton', skipCountdown: true });
  KR.stepRace(sDrift, { throttle: 1 }, dt); // 进入 racing
  // 先在城镇高速大直道居左提速至高速（留足右侧宽阔路面做连续漂移！）
  const p0Dr = KR.sampleTrackAtS(sDrift.track, 10);
  sDrift.player.x = p0Dr.x - p0Dr.rx * 4.5;
  sDrift.player.z = p0Dr.z - p0Dr.rz * 4.5;
  sDrift.player.yaw = p0Dr.yaw;
  sDrift.player.speed = 50;
  sDrift.player.s = 10;
  const speedBeforeDrift = sDrift.player.speed;
  // 第 1 次 Shift 向右短漂（0.25s）+ 反向拉车头回正（最佳化漂移！）
  for (let i = 0; i < 15; i++) KR.stepRace(sDrift, { throttle: 1, steer: 1, drift: true }, dt);
  const midDriftAngle = Math.abs(sDrift.player.driftAngle);
  const midPending = sDrift.player.driftPendingCharge;
  for (let i = 0; i < 16; i++) KR.stepRace(sDrift, { throttle: 1, steer: -1, drift: true }, dt);
  // 松漂 + 松油门 1 帧再点油门触发手动小喷！
  KR.stepRace(sDrift, { throttle: 0, steer: 0, drift: false }, dt);
  KR.stepRace(sDrift, { throttle: 1, steer: 0, drift: false }, dt);
  const gotMini1 = sDrift.player.miniBoostTimer > 0.4 && sDrift.player.comboCount === 1;
  const banked1 = sDrift.player.nitroGauge;
  ok(speedBeforeDrift > 40 && midDriftAngle > 0.25 && midPending > 10, '[跑跑卡丁车] Shift 漂移产生真实侧滑角并实时积累未落袋 N2O 气量');
  ok(gotMini1 && banked1 > 18, `[跑跑卡丁车] 松漂轻点油门触发「小喷」并落袋集气 (${Math.round(banked1)}%)`);

  // 第 2 次立刻反方向向左衔接漂移 + 拉车头（典型 S 弯双喷！）
  for (let i = 0; i < 16; i++) KR.stepRace(sDrift, { throttle: 1, steer: -1, drift: true }, dt);
  for (let i = 0; i < 16; i++) KR.stepRace(sDrift, { throttle: 1, steer: 1, drift: true }, dt);
  KR.stepRace(sDrift, { throttle: 0, steer: 0, drift: false }, dt);
  KR.stepRace(sDrift, { throttle: 1, steer: 0, drift: false }, dt);
  ok(sDrift.player.comboCount >= 2, `[跑跑卡丁车] 连续漂移衔接成功触发「双喷 / 连喷」(combo=${sDrift.player.comboCount})`);

  // 再补一次顺畅向右飘移 + 拉车头攒满 100% 气量封装 N2O 氮气瓶，并引爆大喷突破 295 km/h！
  for (let i = 0; i < 16; i++) KR.stepRace(sDrift, { throttle: 1, steer: 1, drift: true }, dt);
  for (let i = 0; i < 14; i++) KR.stepRace(sDrift, { throttle: 1, steer: -1, drift: true }, dt);
  KR.stepRace(sDrift, { throttle: 1, steer: 0, drift: false }, dt);
  ok(sDrift.player.slots.includes('nitro'), '[跑跑卡丁车] 集气满 100% 自动封装 N2O 氮气瓶入左上 2 格槽位');
  // 回到起终点大直道中心引爆 N2O 大喷检验纯直道氮气极速！
  const spN = KR.sampleTrackAtS(sDrift.track, 5);
  sDrift.player.x = spN.x; sDrift.player.z = spN.z; sDrift.player.yaw = spN.yaw; sDrift.player.s = 5;
  KR.stepRace(sDrift, { throttle: 1, useItem: true }, dt);
  for (let i = 0; i < 25; i++) KR.stepRace(sDrift, { throttle: 1 }, dt);
  const nitroKmh = KR.getSpeedKmh(sDrift.player);
  ok(sDrift.player.nitroTimer > 2.0 && nitroKmh >= 295, `[跑跑卡丁车] 引爆 N2O 氮气大喷突破极速 (${nitroKmh} km/h)`);

  // 4) 撞墙断气验证
  const sWall = KR.createRaceState({ trackIndex: 0, mode: 'speed', skipCountdown: true });
  KR.stepRace(sWall, { throttle: 1 }, dt);
  for (let i = 0; i < 60; i++) KR.stepRace(sWall, { throttle: 1 }, dt);
  sWall.player.drifting = true;
  sWall.player.driftDir = 1;
  sWall.player.driftPendingCharge = 45;
  // 强制将玩家贴到右侧护栏外侧触发碰撞
  const spW = KR.sampleTrackAtS(sWall.track, sWall.player.s);
  sWall.player.x = spW.x + spW.rx * (spW.w * 0.5 + 1.5);
  sWall.player.z = spW.z + spW.rz * (spW.w * 0.5 + 1.5);
  KR.stepRace(sWall, { throttle: 1, steer: 1, drift: true }, dt);
  ok(sWall.player.driftCancelled && sWall.player.driftPendingCharge === 0, '[跑跑卡丁车] 漂移刮擦护栏精准触发「撞墙断气」（清零未落袋气量）');

  // 5) 尾流加速 (Slipstream Drafting)
  const sDraft = KR.createRaceState({ trackIndex: 0, mode: 'speed', skipCountdown: true });
  KR.stepRace(sDraft, { throttle: 1 }, dt);
  const pD = sDraft.player;
  const rivalD = sDraft.racers.find((r) => !r.isPlayer);
  pD.speed = 46;
  rivalD.speed = 46;
  for (let i = 0; i < 60; i++) {
    // 保持对手刚好在玩家正前方 10m 同车道
    const fwdSp = KR.sampleTrackAtS(sDraft.track, pD.s + 10);
    rivalD.x = fwdSp.x + fwdSp.rx * pD.lat;
    rivalD.z = fwdSp.z + fwdSp.rz * pD.lat;
    rivalD.lat = pD.lat;
    rivalD.totalProgress = pD.totalProgress + 10;
    KR.stepRace(sDraft, { throttle: 1 }, dt);
  }
  ok(pD.draftBoostTimer > 0, '[跑跑卡丁车] 紧跟前车触发「尾流加速」');

  // 6) 道具赛全 8 大经典道具实战闭环
  const sItem = KR.createRaceState({ trackIndex: 0, mode: 'item', skipCountdown: true });
  KR.stepRace(sItem, { throttle: 1 }, dt);
  const me = sItem.player;
  const foe = sItem.racers.find((r) => !r.isPlayer && r.rank < me.rank) || sItem.racers[0];

  // 6a. 道具箱拾取与 2 格槽位轮盘
  const box = sItem.track.itemBoxes[0];
  me.x = box.x; me.z = box.z;
  KR.stepRace(sItem, { throttle: 1 }, dt);
  for (let i = 0; i < 32; i++) KR.stepRace(sItem, { throttle: 1 }, dt);
  ok(box.respawn > 0 && me.slots.length === 1, '[跑跑卡丁车 · 道具赛] 撞击七彩道具箱进入重生并抽取道具入槽');

  // 6b. 追踪导弹锁定命中 + 天使护盾完美格挡
  me.slots = ['missile'];
  foe.totalProgress = me.totalProgress + 20;
  const foeSp = KR.sampleTrackAtS(sItem.track, me.s + 20);
  foe.x = foeSp.x; foe.z = foeSp.z; foe.y = foeSp.y;
  foe.shieldTimer = 0;
  KR.useSlotItem(sItem, me);
  for (let i = 0; i < 35; i++) KR.stepRace(sItem, { throttle: 1 }, dt);
  ok(foe.spinTimer > 0, '[跑跑卡丁车 · 道具赛] 追踪导弹自动锁定命中前方对手并令其旋转升空');

  // 天使护盾抵挡导弹
  foe.spinTimer = 0;
  foe.shieldTimer = 3.0;
  me.slots = ['missile'];
  KR.useSlotItem(sItem, me);
  for (let i = 0; i < 35; i++) KR.stepRace(sItem, { throttle: 1 }, dt);
  ok(foe.spinTimer === 0 && foe.shieldTimer === 0, '[跑跑卡丁车 · 道具赛] 天使护盾成功格挡导弹并免除打滑失控');

  // 6c. 水苍蝇困入水泡 + 连按 A/D 加速破泡！
  foe.shieldTimer = 0;
  foe.rank = me.rank - 1;
  me.slots = ['waterfly'];
  KR.useSlotItem(sItem, me);
  for (let i = 0; i < 40; i++) KR.stepRace(sItem, { throttle: 1 }, dt);
  const trappedInBubble = foe.bubbleTimer > 0.5;
  // 测试玩家被水泡困住时快速连按左右加速挣脱
  me.bubbleTimer = 2.0;
  KR.stepRace(sItem, { steer: -1, steerTap: true }, dt);
  KR.stepRace(sItem, { steer: 1, steerTap: true }, dt);
  ok(trappedInBubble && me.bubbleTimer < 1.5, '[跑跑卡丁车 · 道具赛] 水苍蝇困入浮空水泡且连按 A/D 显著缩短挣脱时间');
  me.bubbleTimer = 0;

  // 6d. 大魔王（反转方向）+ 飞碟（减速第1名）+ 香蕉皮 + 超级磁铁
  foe.totalProgress = me.totalProgress + 15;
  foe.rank = 1;
  me.slots = ['devil', 'ufo'];
  KR.useSlotItem(sItem, me);
  const devilWorked = foe.devilTimer > 2.5;
  KR.useSlotItem(sItem, me);
  const ufoWorked = foe.ufoTimer > 3.0;
  me.slots = ['magnet', 'banana'];
  KR.useSlotItem(sItem, me);
  const magnetWorked = me.magnetTimer > 2.0;
  KR.useSlotItem(sItem, me);
  const bananaDropped = sItem.hazards.some((h) => h.kind === 'banana');
  ok(devilWorked && ufoWorked && magnetWorked && bananaDropped, '[跑跑卡丁车 · 道具赛] 大魔王/飞碟/超级磁铁/香蕉皮全部道具生效');

  // 7) 8 人完整自动跑完 2 圈触发冲线结算 + 60Hz 性能压测
  const sPerf = KR.createRaceState({ trackIndex: 0, mode: 'speed', kartId: 'ranger', skipCountdown: true });
  KR.stepRace(sPerf, { throttle: 1 }, dt);
  // 模拟玩家由自动导航跑完整场，验证圈数、10秒冲线倒计时与结算等级
  const t0 = performance.now();
  let steps = 0;
  while (sPerf.phase !== 'finished' && steps < 3800) {
    // 简易自动寻路驾驶玩家跑完 2 圈
    const p = sPerf.player;
    const look = KR.sampleTrackAtS(sPerf.track, p.s + 18);
    const des = Math.atan2(look.x - p.x, look.z - p.z);
    let err = des - p.yaw;
    while (err > Math.PI) err -= Math.PI * 2;
    while (err < -Math.PI) err += Math.PI * 2;
    KR.stepRace(sPerf, {
      throttle: 1,
      steer: Math.max(-1, Math.min(1, -err * 2.2)),
      drift: Math.abs(look.curvature) > 0.015 && p.speed > 38,
      useItem: p.slots.length > 0 && Math.abs(look.curvature) < 0.01,
    }, dt);
    steps++;
  }
  const elapsedMs = performance.now() - t0;
  const perFrameUs = (elapsedMs / Math.max(1, steps)) * 1000;
  ok(sPerf.phase === 'finished' && sPerf.result && sPerf.result.grade, `[跑跑卡丁车] 8 人完成 2 圈冲线结算（名次 #${sPerf.result?.rank}，评级 ${sPerf.result?.grade}，用时 ${sPerf.result?.time.toFixed(2)}s）`);
  ok(perFrameUs < 1000, `[跑跑卡丁车] 8 辆卡丁车 + 样条投影每帧耗时 ${perFrameUs.toFixed(1)}µs（预算 16.7ms）`);
};
