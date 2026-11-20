/* 跑跑卡丁车 · 巅峰漂移 — 1:1 原汁原味确定性竞速 & 道具赛物理引擎（支持漂移集气/撞墙断气/小喷/双喷/连喷/最佳化/尾流/超级起步/8大经典道具/8人同场AI） */
(function (G) {
  'use strict';
  const KR = (G.KR = G.KR || {});

  const SPEED_KMH_SCALE = 4.45; // 54 m/s ≈ 240 km/h，大喷 74 m/s ≈ 329 km/h

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : (v > hi ? hi : v);
  }

  /** 道具赛按当前名次加权抽取经典道具（第 1 名偏防御，后排偏追击逆转，还原跑跑平衡机制） */
  function rollItemForRank(rank, rng) {
    const r = rng();
    if (rank === 1) {
      if (r < 0.34) return 'shield';
      if (r < 0.64) return 'banana';
      if (r < 0.84) return 'waterbomb';
      return 'nitro';
    }
    if (rank <= 3) {
      if (r < 0.22) return 'missile';
      if (r < 0.44) return 'waterfly';
      if (r < 0.60) return 'shield';
      if (r < 0.74) return 'waterbomb';
      if (r < 0.86) return 'banana';
      return 'nitro';
    }
    if (rank <= 6) {
      if (r < 0.22) return 'nitro';
      if (r < 0.42) return 'missile';
      if (r < 0.58) return 'waterfly';
      if (r < 0.72) return 'magnet';
      if (r < 0.86) return 'devil';
      return 'ufo';
    }
    // 7-8 名逆转池
    if (r < 0.30) return 'nitro';
    if (r < 0.55) return 'magnet';
    if (r < 0.75) return 'ufo';
    if (r < 0.90) return 'devil';
    return 'missile';
  }

  /** 创建单个车手完整物理状态 */
  function createRacer(opts) {
    const kart = KR.getKart(opts.kartId);
    const driver = KR.getDriver(opts.driverId);
    return {
      id: opts.id,
      name: opts.name,
      isPlayer: !!opts.isPlayer,
      kartId: kart.id,
      driverId: driver.id,
      kart,
      driver,
      skill: opts.skill || 1.0,
      aiLane: opts.aiLane || 0,
      aiItemCd: 1.5 + (opts.id % 4) * 0.7,

      // 空间运动
      x: opts.x,
      y: opts.y,
      z: opts.z,
      vy: 0,
      onGround: true,
      yaw: opts.yaw,
      speed: 0,
      steerVisual: 0,

      // 赛道进度与圈数
      trackIdx: opts.trackIdx,
      s: opts.s,
      prevS: opts.s,
      lat: opts.lat,
      lap: 1,
      totalProgress: opts.s - opts.trackTotalLen, // 发车在终点线后，跨线后从第 1 圈 0m 开始计！
      crossedStart: false,
      rank: opts.id + 1,
      finished: false,
      finishTime: 0,
      lapStartTime: 0,
      bestLapTime: Infinity,

      // 跑跑卡丁车核心漂移/集气/喷火状态机
      drifting: false,
      driftDir: 0,           // -1 左漂，+1 右漂
      driftAngle: 0,         // 车身侧滑角（视觉与集气核心）
      driftDuration: 0,
      driftPendingCharge: 0, // 本次漂移未落袋气量（撞墙清零！）
      driftCancelled: false,
      counterSteered: false,
      nitroGauge: 0,         // 0..100 集气槽
      slots: [],             // 经典 2 格 N2O / 道具槽位！
      rouletteTimer: 0,
      rouletteIcon: null,

      // 各类加速状态计时器
      miniBoostWindow: 0,    // 漂移结束后的小喷触发窗口
      miniBoostHoldGrace: 0, // 自动衔接小喷短暂延迟（松再按零延迟！）
      miniBoostTimer: 0,
      miniBoostPower: 1.0,
      nitroTimer: 0,
      startBoostTimer: 0,
      padBoostTimer: 0,
      draftTimer: 0,
      draftBoostTimer: 0,
      magnetTimer: 0,
      magnetTargetId: -1,
      lastBoostTime: 99,
      comboCount: 0,
      prevThrottle: false,
      prevSteerSign: 0,

      // 道具受击与防御状态
      shieldTimer: 0,
      bubbleTimer: 0,        // 水苍蝇 / 水炸弹困住水泡时间
      bubbleBreakProgress: 0,
      spinTimer: 0,          // 导弹 / 香蕉皮旋转失控时间
      devilTimer: 0,         // 大魔王左右反转时间
      ufoTimer: 0,           // 飞碟头顶减速时间
      lockedByMissile: false,

      // 统计指标
      maxSpeedKmh: 0,
      driftCount: 0,
      boostCount: 0,
      itemsUsed: 0,
      hitsLanded: 0,
      wallHitCd: 0,
    };
  }

  /**
   * 初始化完整一场 8 人跑跑卡丁车比赛状态
   */
  KR.createRaceState = function (opts = {}) {
    const trackDef = typeof opts.trackIndex === 'number'
      ? (KR.TRACK_DEFS[opts.trackIndex] || KR.TRACK_DEFS[0])
      : (KR.TRACK_DEFS.find((t) => t.id === opts.trackId) || KR.TRACK_DEFS[0]);
    const track = KR.buildTrackData(trackDef);
    const mode = opts.mode === 'item' ? 'item' : 'speed';
    const playerKartId = opts.kartId || 'saber';
    const playerDriverId = opts.driverId || 'dao';

    // 确定性伪随机（用于单元测试可复现 + 实战丰富道具）
    let seed = opts.seed || 20261120;
    const rng = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const racers = [];
    // 玩家默认排在第 4 顺位（经典跑跑视野：前方有车可追尾流/射导弹，后方也有车压迫！）
    const playerGridSlot = opts.playerGridSlot != null ? opts.playerGridSlot : 3;
    let aiIdx = 0;

    for (let grid = 0; grid < 8; grid++) {
      const isPlayer = grid === playerGridSlot;
      const row = Math.floor(grid / 2);
      const col = grid % 2;
      const backDist = 6.5 + row * 5.2 + col * 1.4;
      const startS = (track.totalLen - backDist) % track.totalLen;
      const sp = KR.sampleTrackAtS(track, startS);
      const lat = col === 0 ? -3.0 : 3.0;
      const aiMeta = isPlayer ? null : KR.AI_ROSTER[aiIdx++];

      racers.push(createRacer({
        id: grid,
        name: isPlayer ? (KR.getDriver(playerDriverId).name + ' (你)') : aiMeta.name,
        isPlayer,
        kartId: isPlayer ? playerKartId : aiMeta.kartId,
        driverId: isPlayer ? playerDriverId : aiMeta.driverId,
        skill: isPlayer ? 1.0 : aiMeta.skill,
        aiLane: ((grid % 5) - 2) * 1.65,
        x: sp.x + sp.rx * lat,
        y: sp.y,
        z: sp.z + sp.rz * lat,
        yaw: sp.yaw,
        trackIdx: sp.idx,
        s: startS,
        lat,
        trackTotalLen: track.totalLen,
      }));
    }

    return {
      track,
      mode, // 'speed' | 'item'
      phase: 'countdown', // 'countdown' | 'racing' | 'finished'
      countdown: opts.skipCountdown ? 0 : 3.2,
      lastBeepSec: 4,
      startBoostPressedEarly: false,
      startBoostConsumed: false,
      raceTime: 0,
      finishCountdown: -1, // 第一名冲线后开启经典 10 秒倒计时！
      racers,
      player: racers[playerGridSlot],
      projectiles: [],     // 飞行中的导弹 / 水苍蝇 / 水炸弹
      hazards: [],         // 赛道上的香蕉皮与水炸弹水幕波
      events: [],          // 本帧视觉/音效事件流
      nextEntityId: 1,
      rng,
      speedKmhScale: SPEED_KMH_SCALE,
    };
  };

  function emit(state, type, data = {}) {
    state.events.push({ type, ...data });
  }

  /** 计算赛车表显时速 (km/h) */
  KR.getSpeedKmh = function (racer) {
    return Math.max(0, Math.round(racer.speed * SPEED_KMH_SCALE));
  };

  /** 将赛车复位至赛道中心线前方（处理卡墙或按复位键） */
  KR.resetRacerToTrack = function (state, r) {
    const sp = KR.sampleTrackAtS(state.track, r.s);
    r.x = sp.x;
    r.y = sp.y + 0.35;
    r.z = sp.z;
    r.vy = 0;
    r.onGround = true;
    r.yaw = sp.yaw;
    r.lat = 0;
    r.speed = Math.min(r.speed, 14);
    r.drifting = false;
    r.driftAngle = 0;
    r.driftPendingCharge = 0;
    r.spinTimer = 0;
    r.bubbleTimer = 0;
    if (r.isPlayer) emit(state, 'callout', { text: '🔄 赛道复位', color: '#38bdf8' });
  };

  /** 触发道具/氮气槽位 0 */
  KR.useSlotItem = function (state, r) {
    if (!r.slots.length || r.bubbleTimer > 0 || r.spinTimer > 0) return false;
    const itemId = r.slots.shift();
    r.itemsUsed++;

    if (itemId === 'nitro') {
      r.nitroTimer = 3.1;
      r.speed = Math.max(r.speed, r.kart.baseSpeed + r.kart.nitroBonus * 0.72);
      r.boostCount++;
      emit(state, 'nitro', { racerId: r.id, isPlayer: r.isPlayer });
      if (r.isPlayer) emit(state, 'callout', { text: '🔥 N2O 氮气狂飙！', color: '#38bdf8' });
      return true;
    }

    if (itemId === 'shield') {
      r.shieldTimer = 3.4;
      emit(state, 'shield', { racerId: r.id, isPlayer: r.isPlayer });
      if (r.isPlayer) emit(state, 'callout', { text: '🛡️ 天使护盾开启！', color: '#fbbf24' });
      return true;
    }

    if (itemId === 'banana') {
      const bx = r.x - Math.sin(r.yaw) * 2.6;
      const bz = r.z - Math.cos(r.yaw) * 2.6;
      state.hazards.push({
        id: state.nextEntityId++,
        kind: 'banana',
        ownerId: r.id,
        x: bx,
        y: r.y + 0.12,
        z: bz,
        radius: 1.55,
        life: 30,
      });
      emit(state, 'drop_banana', { racerId: r.id, isPlayer: r.isPlayer });
      if (r.isPlayer) emit(state, 'callout', { text: '🍌 放置香蕉皮！', color: '#facc15' });
      return true;
    }

    if (itemId === 'devil') {
      let count = 0;
      for (const other of state.racers) {
        if (other.id === r.id || other.finished) continue;
        if (other.totalProgress > r.totalProgress) {
          if (other.shieldTimer > 0) {
            other.shieldTimer = 0;
            emit(state, 'shield_block', { racerId: other.id, isPlayer: other.isPlayer });
          } else {
            other.devilTimer = 3.5;
            count++;
          }
        }
      }
      emit(state, 'devil', { racerId: r.id, isPlayer: r.isPlayer, count });
      if (r.isPlayer) emit(state, 'callout', { text: '😈 释放大魔王（对手方向反转）！', color: '#c084fc' });
      return true;
    }

    if (itemId === 'ufo') {
      // 锁定当前排名第一且非自己的车手
      const leader = state.racers
        .filter((o) => o.id !== r.id && !o.finished)
        .sort((a, b) => a.rank - b.rank)[0];
      if (leader) {
        if (leader.shieldTimer > 0) {
          leader.shieldTimer = 0;
          emit(state, 'shield_block', { racerId: leader.id, isPlayer: leader.isPlayer });
        } else {
          leader.ufoTimer = 4.2;
          r.hitsLanded++;
        }
      }
      emit(state, 'ufo', { racerId: r.id, targetId: leader ? leader.id : -1, isPlayer: r.isPlayer });
      if (r.isPlayer) emit(state, 'callout', { text: '🛸 召唤飞碟干扰第一名！', color: '#4ade80' });
      return true;
    }

    if (itemId === 'magnet') {
      const target = findRivalAhead(state, r, 110);
      r.magnetTimer = 2.6;
      r.magnetTargetId = target ? target.id : -1;
      r.boostCount++;
      emit(state, 'magnet', { racerId: r.id, targetId: r.magnetTargetId, isPlayer: r.isPlayer });
      if (r.isPlayer) emit(state, 'callout', { text: '🧲 超级磁铁极速牵引！', color: '#f472b6' });
      return true;
    }

    if (itemId === 'missile' || itemId === 'waterfly') {
      const target = itemId === 'waterfly'
        ? state.racers.find((o) => !o.finished && o.rank === r.rank - 1) || findRivalAhead(state, r, 140)
        : findRivalAhead(state, r, 130);
      state.projectiles.push({
        id: state.nextEntityId++,
        kind: itemId,
        ownerId: r.id,
        targetId: target ? target.id : -1,
        x: r.x + Math.sin(r.yaw) * 2.2,
        y: r.y + 1.15,
        z: r.z + Math.cos(r.yaw) * 2.2,
        yaw: r.yaw,
        s: (r.s + 2.5) % state.track.totalLen,
        lat: r.lat,
        speed: itemId === 'missile' ? 96 : 84,
        life: 5.5,
      });
      emit(state, 'fire_proj', { kind: itemId, racerId: r.id, targetId: target ? target.id : -1, isPlayer: r.isPlayer });
      if (r.isPlayer) {
        emit(state, 'callout', {
          text: itemId === 'missile' ? '🚀 追踪导弹发射！' : '💧 水苍蝇出击！',
          color: itemId === 'missile' ? '#fb923c' : '#38bdf8',
        });
      }
      return true;
    }

    if (itemId === 'waterbomb') {
      // 抛物线投掷到赛道前方 36m 处炸开巨型水泡幕！
      const targetS = (r.s + 36) % state.track.totalLen;
      const dst = KR.sampleTrackAtS(state.track, targetS);
      state.projectiles.push({
        id: state.nextEntityId++,
        kind: 'waterbomb',
        ownerId: r.id,
        targetId: -1,
        x: r.x,
        y: r.y + 1.4,
        z: r.z,
        startX: r.x, startY: r.y + 1.4, startZ: r.z,
        dstX: dst.x, dstY: dst.y + 0.5, dstZ: dst.z,
        t: 0,
        dur: 0.72,
        life: 1.0,
      });
      emit(state, 'fire_proj', { kind: 'waterbomb', racerId: r.id, isPlayer: r.isPlayer });
      if (r.isPlayer) emit(state, 'callout', { text: '💣 水炸弹高空抛投！', color: '#38bdf8' });
      return true;
    }

    return false;
  };

  function findRivalAhead(state, r, maxDist) {
    let best = null;
    let bestDelta = Infinity;
    for (const o of state.racers) {
      if (o.id === r.id || o.finished) continue;
      const delta = o.totalProgress - r.totalProgress;
      if (delta > 2 && delta < maxDist && delta < bestDelta) {
        bestDelta = delta;
        best = o;
      }
    }
    return best;
  }

  /** 应用道具命中效果（自动校验天使护盾格挡！） */
  function applyHit(state, victim, attackerId, kind) {
    if (victim.finished) return;
    if (victim.shieldTimer > 0) {
      victim.shieldTimer = 0;
      emit(state, 'shield_block', { racerId: victim.id, isPlayer: victim.isPlayer, kind });
      if (victim.isPlayer) emit(state, 'callout', { text: '🛡️ 天使护盾完美抵挡！', color: '#fbbf24' });
      return;
    }
    const attacker = state.racers.find((x) => x.id === attackerId);
    if (attacker) attacker.hitsLanded++;

    if (kind === 'missile' || kind === 'banana') {
      victim.spinTimer = kind === 'missile' ? 1.35 : 1.05;
      victim.vy = kind === 'missile' ? 9.5 : 3.2;
      victim.onGround = false;
      victim.speed *= 0.32;
      victim.drifting = false;
      victim.driftPendingCharge = 0;
      emit(state, 'hit', { kind, racerId: victim.id, isPlayer: victim.isPlayer, x: victim.x, y: victim.y, z: victim.z });
      if (victim.isPlayer) {
        emit(state, 'callout', { text: kind === 'missile' ? '💥 遭到导弹轰飞！' : '🍌 踩到香蕉皮打滑！', color: '#f43f5e' });
      }
    } else if (kind === 'waterfly' || kind === 'waterbomb') {
      victim.bubbleTimer = 2.4;
      victim.bubbleBreakProgress = 0;
      victim.speed *= 0.15;
      victim.drifting = false;
      victim.driftPendingCharge = 0;
      emit(state, 'bubble_trap', { kind, racerId: victim.id, isPlayer: victim.isPlayer, x: victim.x, y: victim.y, z: victim.z });
      if (victim.isPlayer) {
        emit(state, 'callout', { text: '💧 被水泡困住！快连按 A / D 挣脱！', color: '#38bdf8' });
      }
    }
  }

  /** 智能 AI 车手决策（带真实弯道预判漂移、小喷、氮气释放、躲避香蕉与道具施放） */
  function computeAIInput(state, r, dt) {
    const track = state.track;
    const lookAhead = 15 + clamp(r.speed * 0.28, 4, 20);
    const farLook = 32;
    const nearSp = KR.sampleTrackAtS(track, r.s + lookAhead);
    const farSp = KR.sampleTrackAtS(track, r.s + farLook);

    // 道具赛中尝试瞄准前方道具箱，竞速赛走最佳内弯切线！
    let targetLat = r.aiLane;
    if (Math.abs(farSp.curvature) > 0.012) {
      targetLat = -Math.sign(farSp.curvature) * (nearSp.w * 0.28);
    } else if (state.mode === 'item' && r.slots.length < 2) {
      // 微调横向去吃最近的道具箱
      for (const box of track.itemBoxes) {
        if (box.respawn > 0) continue;
        const ds = (box.s - r.s + track.totalLen) % track.totalLen;
        if (ds > 4 && ds < 28) {
          targetLat = box.lat;
          break;
        }
      }
    }

    const tx = nearSp.x + nearSp.rx * clamp(targetLat, -nearSp.w * 0.38, nearSp.w * 0.38);
    const tz = nearSp.z + nearSp.rz * clamp(targetLat, -nearSp.w * 0.38, nearSp.w * 0.38);
    const desiredYaw = Math.atan2(tx - r.x, tz - r.z);
    const yawErr = wrapAngle(desiredYaw - r.yaw);

    // 记住：yaw 增加向左，减少向右，所以 steer = -clamp(yawErr)
    const steer = clamp(-yawErr * 2.1, -1, 1);
    const needDrift = Math.abs(farSp.curvature) > 0.0135 && r.speed > 34 && Math.abs(yawErr) > 0.16;

    // 合理橡皮筋难度平衡（防止 AI 拉开太远或永远落后一圈，保持 8 人激烈缠斗！）
    const diffToPlayer = r.totalProgress - state.player.totalProgress;
    let throttle = 1;
    if (diffToPlayer > 75) throttle = 0.86;
    else if (diffToPlayer < -90) throttle = 1.06; // 轻度追赶

    // AI 使用 N2O 或道具
    r.aiItemCd = Math.max(0, r.aiItemCd - dt);
    let useItem = false;
    if (r.slots.length > 0 && r.aiItemCd <= 0 && r.nitroTimer <= 0) {
      const slot0 = r.slots[0];
      if (slot0 === 'nitro') {
        if (Math.abs(farSp.curvature) < 0.011) {
          useItem = true;
          r.aiItemCd = 2.6;
        }
      } else if (slot0 === 'shield') {
        if (r.lockedByMissile || r.rank <= 2) {
          useItem = true;
          r.aiItemCd = 2.2;
        }
      } else {
        useItem = true;
        r.aiItemCd = 2.8 + (r.id % 3) * 0.6;
      }
    }

    // AI 被水泡困住也会左右摇摆加速脱困
    const steerTap = r.bubbleTimer > 0 && Math.sin(state.raceTime * 16 + r.id) > 0.7;

    return {
      throttle,
      brake: false,
      steer,
      drift: needDrift,
      useItem,
      swapItem: false,
      reset: false,
      steerTap,
    };
  }

  /** 单辆卡丁车物理步进（核心手感与跑跑机制全在此处！） */
  function stepRacer(state, r, inp, dt) {
    const track = state.track;
    const kart = r.kart;

    // 递减各类状态计时器
    r.miniBoostWindow = Math.max(0, r.miniBoostWindow - dt);
    r.miniBoostTimer = Math.max(0, r.miniBoostTimer - dt);
    r.nitroTimer = Math.max(0, r.nitroTimer - dt);
    r.startBoostTimer = Math.max(0, r.startBoostTimer - dt);
    r.padBoostTimer = Math.max(0, r.padBoostTimer - dt);
    r.draftBoostTimer = Math.max(0, r.draftBoostTimer - dt);
    r.magnetTimer = Math.max(0, r.magnetTimer - dt);
    r.shieldTimer = Math.max(0, r.shieldTimer - dt);
    r.devilTimer = Math.max(0, r.devilTimer - dt);
    r.ufoTimer = Math.max(0, r.ufoTimer - dt);
    r.wallHitCd = Math.max(0, r.wallHitCd - dt);
    r.lastBoostTime += dt;

    // 道具槽轮盘滚动完成
    if (r.rouletteTimer > 0) {
      r.rouletteTimer -= dt;
      if (r.rouletteTimer <= 0 && r.slots.length < 2) {
        const picked = rollItemForRank(r.rank, state.rng);
        r.slots.push(picked);
        r.rouletteIcon = null;
        if (r.isPlayer) emit(state, 'item_got', { itemId: picked });
      }
    }

    // 交换 2 格道具顺序
    if (inp.swapItem && r.slots.length === 2) {
      const tmp = r.slots[0];
      r.slots[0] = r.slots[1];
      r.slots[1] = tmp;
    }

    // 主动赛道复位
    if (inp.reset && r.isPlayer && state.phase === 'racing') {
      KR.resetRacerToTrack(state, r);
      return;
    }

    // 道具 / N2O 触发
    if (inp.useItem && state.phase === 'racing') {
      KR.useSlotItem(state, r);
    }

    // 大魔王：反转左右方向！
    let rawSteer = clamp(inp.steer || 0, -1, 1);
    const steerSign = rawSteer > 0.25 ? 1 : (rawSteer < -0.25 ? -1 : 0);
    const freshSteerFlip = steerSign !== 0 && steerSign !== r.prevSteerSign;
    r.prevSteerSign = steerSign;
    if (r.devilTimer > 0) rawSteer = -rawSteer;

    // 水泡困住状态（浮空停滞 + 疯狂左右摇摆快速破泡！）
    if (r.bubbleTimer > 0) {
      r.bubbleTimer -= dt;
      if (freshSteerFlip || inp.steerTap) {
        r.bubbleTimer = Math.max(0, r.bubbleTimer - 0.28);
        r.bubbleBreakProgress = Math.min(1, r.bubbleBreakProgress + 0.22);
      }
      r.speed = Math.max(0, r.speed - 28 * dt);
      const proj = KR.projectToTrack(track, r.x, r.z, r.trackIdx);
      r.y = proj.y + 1.85 + Math.sin(state.raceTime * 6 + r.id) * 0.22;
      if (r.bubbleTimer <= 0) {
        r.y = proj.y;
        r.onGround = true;
        emit(state, 'bubble_pop', { racerId: r.id, isPlayer: r.isPlayer });
        if (r.isPlayer) emit(state, 'callout', { text: '💦 水泡破开！', color: '#7dd3fc' });
      }
      return;
    }

    // 导弹/香蕉皮旋转失控状态
    if (r.spinTimer > 0) {
      r.spinTimer = Math.max(0, r.spinTimer - dt);
      r.speed = Math.max(0, r.speed - 22 * dt);
      r.x += Math.sin(r.yaw) * r.speed * dt;
      r.z += Math.cos(r.yaw) * r.speed * dt;
      const proj = KR.projectToTrack(track, r.x, r.z, r.trackIdx);
      r.vy -= 26 * dt;
      r.y += r.vy * dt;
      if (r.y <= proj.y) {
        r.y = proj.y;
        r.vy = 0;
        r.onGround = true;
      }
      return;
    }

    // 计算当前路面摩擦属性（冰面飘移更滑更长！）
    const currSample = track.samples[r.trackIdx] || track.samples[0];
    const isIce = currSample.surface === 'ice';
    const isDirt = currSample.surface === 'dirt';

    // ---- 1) 跑跑卡丁车核心 Shift 漂移状态机 ----
    const throttleOn = (inp.throttle || 0) > 0.1;
    const freshThrottleTap = throttleOn && !r.prevThrottle;
    r.prevThrottle = throttleOn;

    const wantDrift = !!inp.drift && r.onGround && r.speed > 17;
    if (wantDrift && !r.drifting && Math.abs(rawSteer) > 0.16) {
      r.drifting = true;
      r.driftDir = Math.sign(rawSteer); // -1 左漂，+1 右漂
      r.driftDuration = 0;
      r.driftPendingCharge = 0;
      r.driftCancelled = false;
      r.counterSteered = false;
    } else if (r.drifting && (!wantDrift || r.speed < 13)) {
      // 结束漂移 -> 结算集气 + 开启小喷触发窗口！
      const dur = r.driftDuration;
      const banked = r.driftCancelled ? 0 : r.driftPendingCharge;
      const isOptimal = !r.driftCancelled && dur >= 0.34 && dur <= 1.35 && r.counterSteered;
      r.drifting = false;
      r.driftPendingCharge = 0;

      if (dur >= 0.24 && !r.driftCancelled) {
        r.driftCount++;
        const finalCharge = banked * (isOptimal ? 1.18 : 1.0);
        if (state.mode === 'speed') {
          r.nitroGauge += finalCharge;
          while (r.nitroGauge >= 100) {
            r.nitroGauge -= 100;
            if (r.slots.length < 2) {
              r.slots.push('nitro');
              emit(state, 'nitro_ready', { racerId: r.id, isPlayer: r.isPlayer });
              if (r.isPlayer) emit(state, 'callout', { text: '🔥 集气满格！按 Space 喷氮气！', color: '#f97316' });
            } else {
              r.nitroGauge = 99.9;
              break;
            }
          }
        }
        r.miniBoostWindow = 0.56;
        r.miniBoostHoldGrace = 0.11;
        if (isOptimal && r.isPlayer) {
          emit(state, 'callout', { text: '✨ 最佳化漂移 (+18% 集气)', color: '#fde047' });
        }
      }
      r.driftDir = 0;
    }

    // 漂移期间转向、拉车头与实时集气
    if (r.drifting) {
      r.driftDuration += dt;
      // 判断是否在反打方向拉车头（Counter-steer）
      if (Math.sign(rawSteer) === -r.driftDir && Math.abs(rawSteer) > 0.2) {
        r.counterSteered = true;
      }
      const sameDirPush = rawSteer * r.driftDir; // +1 深切弯心，0 顺滑横漂，-1 反向精准「拉车头」回正！
      const turnRate = kart.driftTurn * (0.58 + sameDirPush * 0.96) * (isIce ? 0.90 : 1.0);
      r.yaw = wrapAngle(r.yaw - r.driftDir * turnRate * dt);

      const targetSlip = -r.driftDir * clamp(0.42 + sameDirPush * 0.24, 0.16, 0.66);
      r.driftAngle += (targetSlip - r.driftAngle) * Math.min(1, dt * (isIce ? 5.5 : 8.5));

      // 实时累计未落袋气量（速度越快、漂移角越锐利、集气越迅猛！）
      if (!r.driftCancelled && state.mode === 'speed') {
        const speedRatio = clamp(r.speed / kart.baseSpeed, 0.4, 1.45);
        const angleFactor = 0.65 + Math.abs(r.driftAngle) * 1.45;
        r.driftPendingCharge += 44.0 * kart.chargeRate * speedRatio * angleFactor * dt;
      }
    } else {
      // 非漂移平跑转向（响应灵敏，低速转向柔顺不打转）
      const speedFactor = clamp(r.speed / 16, 0.25, 1.0);
      const turnRate = kart.steerRate * (isIce ? 0.84 : 1.0) * speedFactor;
      r.yaw = wrapAngle(r.yaw - rawSteer * turnRate * dt);
      r.driftAngle += (0 - r.driftAngle) * Math.min(1, dt * 11);
    }

    r.steerVisual += (rawSteer - r.steerVisual) * Math.min(1, dt * 14);

    // ---- 2) 小喷 / 双喷 / 连喷 触发判定 ----
    if (r.miniBoostWindow > 0 && !r.drifting) {
      r.miniBoostHoldGrace = Math.max(0, r.miniBoostHoldGrace - dt);
      // 经典松 W 再点 W 零延迟爆发（并享 1.12x 手动双喷加成）；持续按住 W 也可在短暂衔接后顺滑触发小喷！
      const triggerManual = freshThrottleTap;
      const triggerAuto = throttleOn && r.miniBoostHoldGrace <= 0;
      if (triggerManual || triggerAuto) {
        r.miniBoostWindow = 0;
        const isChain = r.lastBoostTime < 2.0;
        r.comboCount = isChain ? Math.min(9, r.comboCount + 1) : 1;
        r.lastBoostTime = 0;
        r.miniBoostTimer = isChain ? 0.80 : 0.66;
        r.miniBoostPower = (isChain ? 1.25 : 1.18) * (triggerManual ? 1.05 : 1.0);
        r.boostCount++;
        if (isChain && state.mode === 'speed') {
          r.nitroGauge = Math.min(99.5, r.nitroGauge + 8);
        }
        emit(state, 'mini_boost', { racerId: r.id, combo: r.comboCount, isPlayer: r.isPlayer });
        if (r.isPlayer) {
          const label = r.comboCount >= 3
            ? `⚡ ${r.comboCount} 连喷爆发！`
            : (r.comboCount === 2 ? '🔥🔥 双喷爆发！' : '🔥 漂移小喷！');
          emit(state, 'callout', { text: label, color: r.comboCount >= 2 ? '#fb923c' : '#38bdf8' });
        }
      }
    }

    // ---- 3) 尾流加速 (Slipstream Drafting) 检测 ----
    let inDraft = false;
    if (r.speed > 32 && !r.drifting) {
      for (const o of state.racers) {
        if (o.id === r.id || o.finished) continue;
        const ds = o.totalProgress - r.totalProgress;
        if (ds > 3.5 && ds < 17.5 && Math.abs(o.lat - r.lat) < 2.3) {
          inDraft = true;
          break;
        }
      }
    }
    if (inDraft) {
      r.draftTimer += dt;
      if (r.draftTimer >= 0.85 && r.draftBoostTimer <= 0) {
        r.draftBoostTimer = 1.4;
        if (r.isPlayer) emit(state, 'callout', { text: '💨 尾流加速！', color: '#7dd3fc' });
      }
    } else {
      r.draftTimer = Math.max(0, r.draftTimer - dt * 1.5);
    }

    // ---- 4) 目标极速与纵向加速度积分 ----
    let targetMax = kart.baseSpeed * (r.isPlayer ? 1.0 : r.skill);
    if (isDirt) targetMax *= 0.965;
    if (r.drifting) targetMax *= (r.counterSteered ? 0.94 : 0.90);
    if (r.nitroTimer > 0) targetMax += kart.nitroBonus;
    if (r.miniBoostTimer > 0) targetMax = Math.max(targetMax, kart.baseSpeed * r.miniBoostPower + (r.nitroTimer > 0 ? kart.nitroBonus * 0.45 : 0));
    if (r.startBoostTimer > 0) targetMax += 14.5;
    if (r.padBoostTimer > 0) targetMax += 17.0;
    if (r.draftBoostTimer > 0) targetMax += 7.5;
    if (r.magnetTimer > 0) targetMax += 18.0;
    if (r.ufoTimer > 0) targetMax *= 0.58;

    const boosting = r.nitroTimer > 0 || r.miniBoostTimer > 0 || r.startBoostTimer > 0 || r.padBoostTimer > 0 || r.magnetTimer > 0;
    const effAccel = kart.accel * (boosting ? 1.75 : 1.0) * (r.isPlayer ? 1.0 : r.skill);

    if (inp.throttle > 0.05) {
      if (r.speed < targetMax) {
        r.speed = Math.min(targetMax, r.speed + effAccel * inp.throttle * dt);
      } else {
        // 超过当前极速（例如大喷刚结束）平顺滑行衰减
        r.speed = Math.max(targetMax, r.speed - 18.5 * dt);
      }
    } else if (inp.brake) {
      r.speed = Math.max(-14, r.speed - 48 * dt);
    } else {
      r.speed = r.speed > 0 ? Math.max(0, r.speed - 16 * dt) : Math.min(0, r.speed + 24 * dt);
    }

    // 超级磁铁横向牵引微调
    if (r.magnetTimer > 0 && r.magnetTargetId >= 0) {
      const tgt = state.racers.find((x) => x.id === r.magnetTargetId);
      if (tgt && tgt.totalProgress > r.totalProgress) {
        const pullYaw = Math.atan2(tgt.x - r.x, tgt.z - r.z);
        r.yaw = wrapAngle(r.yaw + wrapAngle(pullYaw - r.yaw) * Math.min(1, dt * 3.5));
      }
    }

    // 位置积分
    r.x += Math.sin(r.yaw) * r.speed * dt;
    r.z += Math.cos(r.yaw) * r.speed * dt;

    // ---- 5) 赛道样条投影、护栏碰撞（含撞墙断气！）、坡度与跳跃重力 ----
    const proj = KR.projectToTrack(track, r.x, r.z, r.trackIdx);
    const halfW = proj.sample.w * 0.5 - 1.05;

    if (Math.abs(proj.lat) > halfW) {
      const side = Math.sign(proj.lat);
      const clampedLat = side * halfW;
      r.x = proj.sample.x + proj.sample.rx * clampedLat;
      r.z = proj.sample.z + proj.sample.rz * clampedLat;
      r.lat = clampedLat;
      // 将车头轻柔弹回赛道切线方向，避免死死卡在墙里
      r.yaw = wrapAngle(r.yaw + wrapAngle(proj.sample.yaw - r.yaw) * 0.35);
      r.speed *= 0.84;

      // 跑跑标志性规则：漂移撞墙断气！
      if (r.drifting && !r.driftCancelled && r.driftPendingCharge > 4) {
        r.driftCancelled = true;
        r.driftPendingCharge = 0;
        if (r.isPlayer && r.wallHitCd <= 0) {
          emit(state, 'wall_cancel', { racerId: r.id });
          emit(state, 'callout', { text: '💥 撞墙断气！', color: '#f87171' });
        }
      }
      if (r.wallHitCd <= 0) {
        r.wallHitCd = 0.35;
        emit(state, 'wall_bump', { racerId: r.id, isPlayer: r.isPlayer, x: r.x, y: r.y, z: r.z });
      }
    } else {
      r.lat = proj.lat;
    }

    // 垂直重力与飞跃跳台落差
    if (!r.onGround) {
      r.vy -= 26.5 * dt;
      r.y += r.vy * dt;
      if (r.y <= proj.y) {
        r.y = proj.y;
        r.vy = 0;
        r.onGround = true;
      }
    } else {
      r.y = proj.y;
    }

    // ---- 6) 检测赛道加速带、飞跃跳台与道具箱 ----
    for (const pad of track.boostPads) {
      const ds = Math.abs(proj.s - pad.s);
      if (ds < 4.5 && Math.abs(r.lat) < pad.width * 0.65 && r.padBoostTimer < 0.9) {
        r.padBoostTimer = 1.25;
        r.speed = Math.max(r.speed, kart.baseSpeed + 14);
        r.boostCount++;
        emit(state, 'pad_boost', { racerId: r.id, isPlayer: r.isPlayer });
        if (r.isPlayer) emit(state, 'callout', { text: '⚡ 加速带推进！', color: '#22d3ee' });
      }
    }

    for (const ramp of track.ramps) {
      const ds = Math.abs(proj.s - ramp.s);
      if (ds < 4.2 && r.onGround && r.speed > 26) {
        r.vy = 9.2 + clamp((r.speed - 35) * 0.14, 0, 4.5);
        r.onGround = false;
        r.padBoostTimer = Math.max(r.padBoostTimer, 0.75);
        emit(state, 'ramp_jump', { racerId: r.id, isPlayer: r.isPlayer });
      }
    }

    if (state.mode === 'item') {
      for (const box of track.itemBoxes) {
        if (box.respawn > 0) continue;
        const dx = r.x - box.x;
        const dz = r.z - box.z;
        if (dx * dx + dz * dz < 4.6) {
          box.respawn = 4.5;
          emit(state, 'box_pickup', { boxId: box.id, racerId: r.id, isPlayer: r.isPlayer, x: box.x, y: box.y, z: box.z });
          if (r.slots.length < 2 && r.rouletteTimer <= 0) {
            r.rouletteTimer = 0.45;
          }
        }
      }
    }

    // ---- 7) 精准跨圈判定（防倒车刷圈） ----
    const prevS = r.s;
    const newS = proj.s;
    r.trackIdx = proj.idx;
    r.prevS = prevS;
    r.s = newS;

    // 跨越 0m 起终点线（从后 20% 跨到前 20%）
    if (prevS > track.totalLen * 0.78 && newS < track.totalLen * 0.22) {
      if (!r.crossedStart) {
        r.crossedStart = true;
        r.lapStartTime = state.raceTime;
      } else {
        const lapTime = state.raceTime - r.lapStartTime;
        if (lapTime > 4 && lapTime < r.bestLapTime) r.bestLapTime = lapTime;
        r.lapStartTime = state.raceTime;
        r.lap++;
        if (r.lap > track.laps && !r.finished) {
          r.finished = true;
          r.finishTime = state.raceTime;
          emit(state, 'racer_finish', { racerId: r.id, isPlayer: r.isPlayer, rank: r.rank, time: r.finishTime });
          if (state.finishCountdown < 0) {
            state.finishCountdown = 10.0; // 第一名冲线，经典 10 秒倒计时！
          }
        } else if (r.isPlayer) {
          const isFinal = r.lap === track.laps;
          emit(state, 'lap', { lap: r.lap, total: track.laps, isFinal });
          emit(state, 'callout', { text: isFinal ? '🏁 FINAL LAP · 最后一圈！' : `🚩 第 ${r.lap}/${track.laps} 圈`, color: '#fde047' });
        }
      }
    } else if (prevS < track.totalLen * 0.22 && newS > track.totalLen * 0.78) {
      // 倒车退回线后
      if (r.crossedStart && r.lap > 1) r.lap--;
      else r.crossedStart = false;
    }

    r.totalProgress = r.crossedStart
      ? (r.lap - 1) * track.totalLen + newS
      : newS - track.totalLen;

    const kmh = KR.getSpeedKmh(r);
    if (kmh > r.maxSpeedKmh) r.maxSpeedKmh = kmh;
  }

  /** 更新道具飞行弹体与赛道香蕉皮/水幕陷阱 */
  function stepProjectilesAndHazards(state, dt) {
    const track = state.track;
    for (const r of state.racers) r.lockedByMissile = false;

    for (let i = state.projectiles.length - 1; i >= 0; i--) {
      const p = state.projectiles[i];
      p.life -= dt;
      if (p.life <= 0) {
        state.projectiles.splice(i, 1);
        continue;
      }

      if (p.kind === 'waterbomb') {
        p.t += dt;
        const u = clamp(p.t / p.dur, 0, 1);
        p.x = p.startX + (p.dstX - p.startX) * u;
        p.z = p.startZ + (p.dstZ - p.startZ) * u;
        p.y = p.startY + (p.dstY - p.startY) * u + Math.sin(u * Math.PI) * 7.5;
        if (u >= 1) {
          // 落地引爆 8m 巨型水炸弹！
          state.hazards.push({
            id: state.nextEntityId++,
            kind: 'water_dome',
            ownerId: p.ownerId,
            x: p.dstX,
            y: p.dstY,
            z: p.dstZ,
            radius: 7.8,
            life: 0.75,
          });
          emit(state, 'waterbomb_explode', { x: p.dstX, y: p.dstY, z: p.dstZ });
          for (const r of state.racers) {
            if (r.finished) continue;
            const d = Math.hypot(r.x - p.dstX, r.z - p.dstZ);
            if (d < 7.8) applyHit(state, r, p.ownerId, 'waterbomb');
          }
          state.projectiles.splice(i, 1);
        }
        continue;
      }

      // 追踪导弹 / 水苍蝇：沿目标与赛道高速追踪
      const target = p.targetId >= 0 ? state.racers.find((x) => x.id === p.targetId && !x.finished) : null;
      if (target) {
        target.lockedByMissile = true;
        const dx = target.x - p.x;
        const dy = (target.y + 0.9) - p.y;
        const dz = target.z - p.z;
        const dist = Math.hypot(dx, dy, dz) || 1;
        if (dist < 2.4) {
          applyHit(state, target, p.ownerId, p.kind);
          state.projectiles.splice(i, 1);
          continue;
        }
        const step = Math.min(dist, p.speed * dt);
        p.x += (dx / dist) * step;
        p.y += (dy / dist) * step;
        p.z += (dz / dist) * step;
        p.yaw = Math.atan2(dx, dz);
      } else {
        p.s = (p.s + p.speed * dt) % track.totalLen;
        const sp = KR.sampleTrackAtS(track, p.s);
        p.x = sp.x + sp.rx * p.lat;
        p.y = sp.y + 1.1;
        p.z = sp.z + sp.rz * p.lat;
        p.yaw = sp.yaw;
      }
    }

    // 赛道香蕉皮 & 水幕
    for (let i = state.hazards.length - 1; i >= 0; i--) {
      const h = state.hazards[i];
      h.life -= dt;
      if (h.life <= 0) {
        state.hazards.splice(i, 1);
        continue;
      }
      if (h.kind === 'banana') {
        for (const r of state.racers) {
          if (r.finished || (r.id === h.ownerId && h.life > 29.2)) continue;
          const d = Math.hypot(r.x - h.x, r.z - h.z);
          if (d < h.radius) {
            applyHit(state, r, h.ownerId, 'banana');
            state.hazards.splice(i, 1);
            break;
          }
        }
      }
    }
  }

  /** 赛车之间轻微弹性物理挤压（防止重叠穿模，保留卡丁车对抗手感！） */
  function resolveKartCollisions(state) {
    const racers = state.racers;
    const minDist = 2.05;
    for (let i = 0; i < racers.length; i++) {
      const a = racers[i];
      if (a.bubbleTimer > 0) continue;
      for (let j = i + 1; j < racers.length; j++) {
        const b = racers[j];
        if (b.bubbleTimer > 0) continue;
        const dx = b.x - a.x;
        const dz = b.z - a.z;
        const d2 = dx * dx + dz * dz;
        if (d2 > 0.0001 && d2 < minDist * minDist) {
          const d = Math.sqrt(d2);
          const nx = dx / d;
          const nz = dz / d;
          const push = (minDist - d) * 0.5;
          a.x -= nx * push;
          a.z -= nz * push;
          b.x += nx * push;
          b.z += nz * push;
        }
      }
    }
  }

  /** 按总进度 & 冲线时间刷新 1~8 名实时排名 */
  function updateStandings(state) {
    const sorted = state.racers.slice().sort((a, b) => {
      if (a.finished && b.finished) return a.finishTime - b.finishTime;
      if (a.finished) return -1;
      if (b.finished) return 1;
      return b.totalProgress - a.totalProgress;
    });
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].rank = i + 1;
    }
    state.standings = sorted;
  }

  /**
   * 固定步长推进整场跑跑卡丁车比赛（60Hz，支持 Node 纯逻辑无头运行！）
   */
  KR.stepRace = function (state, playerInput, dt = 1 / 60) {
    state.events.length = 0;
    const inp = playerInput || { throttle: 0, brake: false, steer: 0, drift: false, useItem: false, swapItem: false, reset: false };

    // 道具箱重生计时
    for (const box of state.track.itemBoxes) {
      if (box.respawn > 0) box.respawn = Math.max(0, box.respawn - dt);
    }

    // ---- 1) 经典 3 - 2 - 1 - GO! 发车倒计时 + 超级起步判定 ----
    if (state.phase === 'countdown') {
      const prev = state.countdown;
      state.countdown = Math.max(0, state.countdown - dt);
      const sec = Math.ceil(state.countdown);
      if (sec < state.lastBeepSec && sec >= 1 && sec <= 3) {
        state.lastBeepSec = sec;
        emit(state, 'countdown_beep', { num: sec });
      }
      // 玩家如果在最后 0.25s 内按下油门，或刚 GO! 时按下，触发超级起步！
      if (inp.throttle > 0.2 && state.countdown > 0.28) {
        state.startBoostPressedEarly = true;
      }
      if (inp.throttle <= 0.1) {
        state.startBoostPressedEarly = false;
      }
      if (state.countdown <= 0.26 && inp.throttle > 0.2 && !state.startBoostPressedEarly && !state.startBoostConsumed) {
        state.player.startBoostTimer = 1.25;
        state.startBoostConsumed = true;
      }
      if (state.countdown <= 0 && prev >= 0) {
        state.phase = 'racing';
        emit(state, 'countdown_go', {});
        if (state.player.startBoostTimer > 0) {
          state.player.speed = 32;
          state.player.boostCount++;
          emit(state, 'start_boost', { racerId: state.player.id });
          emit(state, 'callout', { text: '🚀 完美超级起步！', color: '#fde047' });
        }
      }
      updateStandings(state);
      return state;
    }

    if (state.phase === 'finished') {
      // 赛后让车辆平顺滑行巡航
      for (const r of state.racers) {
        const ai = computeAIInput(state, r, dt);
        ai.throttle = 0.55;
        ai.useItem = false;
        stepRacer(state, r, ai, dt);
      }
      return state;
    }

    // ---- 2) 正式比赛推进 ----
    state.raceTime += dt;

    // 刚发车 0.30s 内精准点油门依然允许触发超级起步！
    if (state.raceTime <= 0.30 && !state.startBoostConsumed && !state.startBoostPressedEarly && inp.throttle > 0.2) {
      state.startBoostConsumed = true;
      state.player.startBoostTimer = 1.25;
      state.player.speed = Math.max(state.player.speed, 30);
      state.player.boostCount++;
      emit(state, 'start_boost', { racerId: state.player.id });
      emit(state, 'callout', { text: '🚀 完美超级起步！', color: '#fde047' });
    }

    for (const r of state.racers) {
      const rInp = r.isPlayer && !r.finished ? inp : computeAIInput(state, r, dt);
      stepRacer(state, r, rInp, dt);
    }

    resolveKartCollisions(state);
    stepProjectilesAndHazards(state, dt);
    updateStandings(state);

    // 经典 10 秒冲线倒计时 / 玩家完赛结算
    if (state.finishCountdown >= 0) {
      state.finishCountdown -= dt;
    }
    if (state.player.finished || (state.finishCountdown >= -99 && state.finishCountdown <= 0 && state.racers.some((r) => r.finished))) {
      state.phase = 'finished';
      // 补齐未冲线车手的估算成绩
      for (const r of state.racers) {
        if (!r.finished) {
          const remain = Math.max(1, state.track.laps * state.track.totalLen - r.totalProgress);
          r.finishTime = state.raceTime + remain / Math.max(25, r.kart.baseSpeed * 0.8);
        }
      }
      updateStandings(state);
      const pRank = state.player.rank;
      const grade = pRank === 1 ? 'S' : (pRank <= 2 ? 'A' : (pRank <= 4 ? 'B' : 'C'));
      const coins = Math.max(120, (9 - pRank) * 140 + state.player.driftCount * 15 + state.player.boostCount * 20);
      state.result = {
        rank: pRank,
        grade,
        time: state.player.finished ? state.player.finishTime : state.raceTime,
        bestLap: isFinite(state.player.bestLapTime) ? state.player.bestLapTime : state.raceTime / state.track.laps,
        maxSpeedKmh: state.player.maxSpeedKmh,
        driftCount: state.player.driftCount,
        boostCount: state.player.boostCount,
        coins,
      };
      emit(state, 'race_over', state.result);
    }

    return state;
  };
})(typeof window !== 'undefined' ? window : globalThis);
