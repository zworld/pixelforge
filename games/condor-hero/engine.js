/* 神雕侠侣 · 问情剑 — 纯逻辑第一人称 3D 武侠战斗引擎（零 DOM，支持 Node 单元测试） */
(function (G) {
  'use strict';
  const CH = (G.CH = G.CH || {});

  CH.DT = 1 / 60;
  CH.EYE_HEIGHT = 1.68;

  function mulberry32(seed) {
    let a = (seed >>> 0) || 1;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function getForward(yaw) {
    return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  }

  function getRight(yaw) {
    return { x: Math.cos(yaw), z: -Math.sin(yaw) };
  }

  function getChapter(idx) {
    const list = CH.CHAPTERS || [];
    return list[clamp(idx | 0, 0, Math.max(0, list.length - 1))];
  }

  function spawnEnemy(s, spec, isBoss) {
    const base = CH.ENEMY_TYPES[spec.type];
    if (!base) return null;
    const ang = spec.angle || 0;
    const dist = spec.dist || 9.5;
    const maxR = s.arenaRadius - 1.4;
    const ex = clamp(Math.sin(ang) * dist, -maxR, maxR);
    const ez = clamp(-Math.cos(ang) * dist, -maxR, maxR);
    const e = {
      id: ++s._nextId,
      type: spec.type,
      kind: base.kind,
      bossId: base.bossId || null,
      name: spec.name || base.label,
      isBoss: !!isBoss || base.kind === 'boss',
      x: ex,
      z: ez,
      vx: 0,
      vz: 0,
      yaw: Math.atan2(s.px - ex, s.pz - ez),
      hp: base.hp,
      maxHp: base.hp,
      posture: 0,
      maxPosture: base.posture,
      speed: base.speed,
      range: base.range,
      damage: base.damage,
      windupBase: base.windup,
      attackCdBase: base.attackCd,
      radius: base.radius,
      height: base.height,
      score: base.score,
      ranged: !!base.ranged,
      rangedMinDist: base.rangedMinDist || 4.8,
      projSpeed: base.projSpeed || 14,
      projBurst: base.projBurst || 1,
      perilChance: base.perilChance || 0,
      unblockChance: base.unblockChance || 0,
      phase2Hp: base.phase2Hp || 0,
      phase2: false,
      state: 'idle',        // idle | windup | recover | stagger
      stateTimer: 0.45 + s._rand() * 0.55,
      windupMax: base.windup,
      attackKind: 'normal', // normal | peril | unblock
      attackIsRanged: false,
      staggerTimer: 0,
      hitFlash: 0,
      strafeDir: s._rand() < 0.5 ? -1 : 1,
      strafeTimer: 1.2 + s._rand() * 1.4,
      swingVisual: 0,
    };
    s.enemies.push(e);
    return e;
  }

  function spawnWave(s, waveIdx) {
    const ch = s.chapter;
    if (waveIdx < ch.waves.length) {
      s.wave = waveIdx + 1;
      s.phase = 'wave';
      for (const spec of ch.waves[waveIdx]) spawnEnemy(s, spec, false);
    } else if (!s.bossSpawned) {
      s.wave = ch.waves.length + 1;
      s.phase = 'boss';
      s.bossSpawned = true;
      const boss = spawnEnemy(s, ch.boss, true);
      s.bossId = boss ? boss.id : 0;
      s.events.push({ type: 'boss_enter', bossId: boss?.bossId, name: boss?.name, x: boss?.x || 0, z: boss?.z || -8 });
    }
  }

  CH.newState = function (chapterIdx = 0, seed = 2026) {
    const ch = getChapter(chapterIdx);
    const weapon = CH.WEAPONS[ch.weapon];
    const skill = CH.SKILLS[ch.skill];
    const s = {
      seed,
      _rand: mulberry32(seed),
      _nextId: 0,
      chapterIdx: ch.index,
      chapter: ch,
      weapon,
      skill,
      hand: weapon.hand,
      arenaRadius: ch.arenaRadius || 15.5,
      // 玩家状态
      px: 0,
      py: 0,
      pz: 6.2,
      vx: 0,
      vy: 0,
      vz: 0,
      yaw: 0,           // 0 朝向 -Z
      pitch: -0.02,
      hp: 120,
      maxHp: 120,
      chi: 45,          // 初始自带一定内力，玩家可快速体验剑气/掌法
      maxChi: 100,
      posture: 0,
      maxPosture: 100,
      postureBreakTimer: 0,
      // 战斗动作状态
      swingTimer: 0,
      swingDur: weapon.swingDur,
      swingHitDone: false,
      attackCd: 0,
      comboStep: 0,
      comboResetTimer: 0,
      guardHeld: false,
      parryTimer: 0,
      parryCd: 0,
      parryFlash: 0,
      dodgeTimer: 0,
      dodgeCd: 0,
      dodgeDirX: 0,
      dodgeDirZ: -1,
      skillCd: 0,
      palmAnimTimer: 0,
      hurtInvuln: 0,
      // 目标锁定
      lockTargetId: 0,
      // 实体与波次
      wave: 0,
      totalWaves: ch.waves.length + 1,
      phase: 'wave',    // wave | boss | won | dead
      bossSpawned: false,
      bossId: 0,
      enemies: [],
      projectiles: [],
      slashes: [],      // 供渲染器展示 3D 刀光/掌浪
      threats: [],      // 屏幕方向危警提示
      // 统计与结算
      time: 0,
      score: 0,
      kills: 0,
      parries: 0,
      perfectDodges: 0,
      crits: 0,
      hitsTaken: 0,
      comboCount: 0,
      maxCombo: 0,
      dead: false,
      chapterWon: false,
      rank: 'A',
      events: [],
    };
    spawnWave(s, 0);
    return s;
  };

  function computeRank(s) {
    let pts = 0;
    if (s.hp >= s.maxHp * 0.72) pts += 3;
    else if (s.hp >= s.maxHp * 0.42) pts += 2;
    else pts += 1;
    if (s.parries >= 4) pts += 3;
    else if (s.parries >= 2) pts += 2;
    else if (s.parries >= 1) pts += 1;
    if (s.hitsTaken <= 2) pts += 2;
    else if (s.hitsTaken <= 5) pts += 1;
    if (s.time <= 95) pts += 1;
    if (pts >= 7) return 'S';
    if (pts >= 5) return 'A';
    if (pts >= 3) return 'B';
    return 'C';
  }

  function findBestLockTarget(s) {
    const fwd = getForward(s.yaw);
    let best = null;
    let bestScore = Infinity;
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - s.px;
      const dz = e.z - s.pz;
      const d = Math.hypot(dx, dz) || 0.001;
      const dot = (dx * fwd.x + dz * fwd.z) / d;
      const sc = d - dot * 6 - (e.isBoss ? 2.5 : 0);
      if (sc < bestScore) {
        bestScore = sc;
        best = e;
      }
    }
    return best;
  }

  function applyDamageToEnemy(s, e, dmg, postureDmg, opts = {}) {
    if (!e || e.hp <= 0) return;
    let finalDmg = dmg;
    let isCrit = !!opts.crit;
    if (e.staggerTimer > 0 && !opts.noFinisher) {
      finalDmg = Math.round(dmg * 2.35);
      isCrit = true;
      e.staggerTimer = 0;
      e.posture = 0;
      e.state = 'recover';
      e.stateTimer = 0.65;
      s.crits++;
      s.chi = clamp(s.chi + 18, 0, s.maxChi);
      s.hp = clamp(s.hp + 10, 0, s.maxHp);
    }

    e.hp = Math.max(0, e.hp - finalDmg);
    e.hitFlash = 0.16;
    s.comboCount++;
    if (s.comboCount > s.maxCombo) s.maxCombo = s.comboCount;

    if (!opts.noChi) {
      s.chi = clamp(s.chi + (s.weapon.id === 'heavy' ? 11 : 8), 0, s.maxChi);
    }

    // 轻微击退
    const dx = e.x - s.px;
    const dz = e.z - s.pz;
    const d = Math.hypot(dx, dz) || 1;
    const kb = opts.knockback != null ? opts.knockback : (e.isBoss ? 2.4 : 4.6);
    e.vx += (dx / d) * kb;
    e.vz += (dz / d) * kb;

    // 累加架势槽 -> 破防硬直
    if (e.hp > 0 && e.staggerTimer <= 0 && postureDmg > 0) {
      e.posture = Math.min(e.maxPosture, e.posture + postureDmg);
      if (e.posture >= e.maxPosture) {
        e.staggerTimer = e.isBoss ? 2.6 : 2.9;
        e.state = 'stagger';
        e.stateTimer = e.staggerTimer;
        e.attackKind = 'normal';
        s.events.push({ type: 'stagger', id: e.id, x: e.x, z: e.z, isBoss: e.isBoss });
      }
    }

    // 金轮法王二阶段
    if (e.hp > 0 && e.isBoss && e.phase2Hp && !e.phase2 && e.hp <= e.maxHp * e.phase2Hp) {
      e.phase2 = true;
      e.attackCdBase *= 0.80;
      e.windupBase *= 0.90;
      s.events.push({ type: 'boss_phase2', id: e.id, bossId: e.bossId, name: e.name, x: e.x, z: e.z });
    }

    s.events.push({
      type: 'sword_hit',
      id: e.id,
      x: e.x,
      z: e.z,
      damage: finalDmg,
      crit: isCrit,
      heavy: s.weapon.id === 'heavy',
    });

    if (e.hp <= 0) {
      s.kills++;
      s.score += e.score + s.comboCount * 15;
      s.chi = clamp(s.chi + 16, 0, s.maxChi);
      s.hp = clamp(s.hp + (e.isBoss ? 30 : 8), 0, s.maxHp);
      if (s.lockTargetId === e.id) s.lockTargetId = 0;
      s.events.push({ type: 'kill', id: e.id, x: e.x, z: e.z, isBoss: e.isBoss, name: e.name });
    }
  }

  function resolvePlayerHit(s, attacker, dmg, attackKind) {
    if (s.dead || s.chapterWon) return 'ignored';

    // 轻功无敌帧闪避
    if (s.dodgeTimer > 0) {
      s.perfectDodges++;
      s.chi = clamp(s.chi + 14, 0, s.maxChi);
      s.score += 65;
      s.events.push({ type: 'dodge_perfect', x: s.px, z: s.pz });
      return 'dodged';
    }

    // 精准弹反：白光 & 红光「危」皆可弹反！金光不可格挡/弹反
    if (s.parryTimer > 0 && attackKind !== 'unblock') {
      s.parries++;
      s.parryFlash = 0.28;
      s.comboCount++;
      if (s.comboCount > s.maxCombo) s.maxCombo = s.comboCount;
      s.chi = clamp(s.chi + 24, 0, s.maxChi);
      s.posture = Math.max(0, s.posture - 18);
      s.score += attackKind === 'peril' ? 180 : 110;
      s.events.push({
        type: 'parry',
        x: attacker ? attacker.x : s.px,
        z: attacker ? attacker.z : s.pz,
        peril: attackKind === 'peril',
      });
      if (attacker && attacker.hp > 0) {
        const pDmg = attackKind === 'peril' ? 62 : 42;
        attacker.posture = Math.min(attacker.maxPosture, attacker.posture + pDmg);
        attacker.state = 'recover';
        attacker.stateTimer = 0.85;
        attacker.attackKind = 'normal';
        const dx = attacker.x - s.px;
        const dz = attacker.z - s.pz;
        const d = Math.hypot(dx, dz) || 1;
        attacker.vx += (dx / d) * 6.5;
        attacker.vz += (dz / d) * 6.5;
        if (attacker.posture >= attacker.maxPosture) {
          attacker.staggerTimer = attacker.isBoss ? 2.7 : 3.0;
          attacker.state = 'stagger';
          attacker.stateTimer = attacker.staggerTimer;
          s.events.push({ type: 'stagger', id: attacker.id, x: attacker.x, z: attacker.z, isBoss: attacker.isBoss });
        }
      }
      return 'parried';
    }

    // 持续格挡：仅可格挡普通白光招式
    if (s.guardHeld && s.postureBreakTimer <= 0 && attackKind === 'normal') {
      s.posture = Math.min(s.maxPosture, s.posture + 20);
      s.chi = clamp(s.chi + 6, 0, s.maxChi);
      if (s.posture >= s.maxPosture) {
        s.postureBreakTimer = 0.55;
        s.posture = s.maxPosture * 0.55;
      }
      s.events.push({ type: 'guard', x: s.px, z: s.pz, broken: s.postureBreakTimer > 0 });
      return 'guarded';
    }

    // 命中扣血
    if (s.hurtInvuln > 0) return 'invuln';
    s.hp = Math.max(0, s.hp - dmg);
    s.hitsTaken++;
    s.comboCount = 0;
    s.hurtInvuln = 0.36;
    if (attacker) {
      const dx = s.px - attacker.x;
      const dz = s.pz - attacker.z;
      const d = Math.hypot(dx, dz) || 1;
      s.vx += (dx / d) * 5.2;
      s.vz += (dz / d) * 5.2;
    }
    s.events.push({ type: 'hurt', damage: dmg, kind: attackKind, x: s.px, z: s.pz });

    if (s.hp <= 0) {
      s.dead = true;
      s.phase = 'dead';
      s.events.push({ type: 'die', x: s.px, z: s.pz });
    }
    return 'hit';
  }

  function performMeleeHit(s) {
    const w = s.weapon;
    const fwd = getForward(s.yaw);
    const mult = s.comboStep === 3 ? w.heavyBonus : (s.comboStep === 2 ? 1.12 : 1.0);
    const dmg = Math.round(w.damage * mult);
    const pDmg = Math.round(w.postureDmg * mult);

    let hitCount = 0;
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - s.px;
      const dz = e.z - s.pz;
      const d = Math.hypot(dx, dz);
      if (d > w.range + e.radius) continue;
      const dot = d > 0.01 ? (dx * fwd.x + dz * fwd.z) / d : 1;
      if (dot >= w.arcCos || d < 1.85) {
        applyDamageToEnemy(s, e, dmg, pDmg, { knockback: s.comboStep === 3 ? 6.5 : 3.8 });
        hitCount++;
      }
    }

    // 近战也可斩碎近距离飞镖/银针
    for (let i = s.projectiles.length - 1; i >= 0; i--) {
      const p = s.projectiles[i];
      if (p.fromPlayer) continue;
      const d = Math.hypot(p.x - s.px, p.z - s.pz);
      if (d <= w.range) {
        s.projectiles.splice(i, 1);
        s.chi = clamp(s.chi + 8, 0, s.maxChi);
      }
    }
    return hitCount;
  }

  function triggerSkill(s) {
    const sk = s.skill;
    if (s.chi < sk.cost || s.skillCd > 0) return false;
    s.chi -= sk.cost;
    s.skillCd = sk.cooldown;
    const fwd = getForward(s.yaw);
    const right = getRight(s.yaw);

    if (sk.id === 'palm_ult') {
      // 黯然销魂掌 · 唯别而已：左手前推，水墨金芒震退强敌并震碎全场暗器
      s.palmAnimTimer = 0.58;
      s.hurtInvuln = Math.max(s.hurtInvuln, 0.32);
      s.slashes.push({ kind: 'palm', x: s.px, z: s.pz, yaw: s.yaw, life: 0.65, maxLife: 0.65, radius: sk.radius });
      for (let i = s.projectiles.length - 1; i >= 0; i--) {
        if (!s.projectiles[i].fromPlayer) s.projectiles.splice(i, 1);
      }
      for (const e of s.enemies) {
        if (e.hp <= 0) continue;
        const dx = e.x - s.px;
        const dz = e.z - s.pz;
        const d = Math.hypot(dx, dz);
        const dot = d > 0.01 ? (dx * fwd.x + dz * fwd.z) / d : 1;
        if (d <= sk.radius || (d <= 13.0 && dot >= 0.45)) {
          applyDamageToEnemy(s, e, sk.damage, sk.postureDmg, { knockback: 11.5, noChi: true });
        }
      }
      s.events.push({ type: 'palm_ult', x: s.px, z: s.pz, yaw: s.yaw });
      return true;
    }

    // 剑气类绝学（玉女素心剑气 / 玄铁剑罡）
    const count = sk.count || 1;
    s.swingTimer = s.weapon.swingDur;
    s.swingDur = s.weapon.swingDur;
    s.swingHitDone = true;
    s.slashes.push({ kind: sk.id, x: s.px, z: s.pz, yaw: s.yaw, life: 0.34, maxLife: 0.34, radius: 3.2 });
    for (let i = 0; i < count; i++) {
      const spread = count === 2 ? (i === 0 ? -0.09 : 0.09) : 0;
      const ay = s.yaw + spread;
      const fx = -Math.sin(ay);
      const fz = -Math.cos(ay);
      const offset = count === 2 ? (i === 0 ? -0.35 : 0.35) : 0;
      s.projectiles.push({
        id: ++s._nextId,
        fromPlayer: true,
        kind: sk.id,
        x: s.px + fx * 1.1 + right.x * offset,
        y: 1.32,
        z: s.pz + fz * 1.1 + right.z * offset,
        vx: fx * sk.speed,
        vz: fz * sk.speed,
        yaw: ay,
        damage: sk.damage,
        postureDmg: sk.postureDmg,
        radius: sk.width ? sk.width * 0.65 : 0.9,
        life: 1.4,
        pierce: true,
        hitIds: [],
        color: sk.color,
      });
    }
    s.events.push({ type: 'chi_wave', skill: sk.id, x: s.px, z: s.pz, yaw: s.yaw });
    return true;
  }

  /**
   * 推进一帧 (1/60s)
   * input: { moveX, moveY, yawDelta, pitchDelta, attackPressed, guardHeld, guardPressed, dodgePressed, skillPressed, lockPressed }
   */
  CH.step = function (s, input = {}) {
    s.events = [];
    if (s.dead || s.chapterWon) return s;

    const dt = CH.DT;
    s.time += dt;

    // 1) 视角控制（鼠标 Pointer Lock / 触屏拖拽 / 键盘旋转 + 锁定辅助）
    if (input.yawDelta) s.yaw = wrapAngle(s.yaw + input.yawDelta);
    if (input.pitchDelta) s.pitch = clamp(s.pitch + input.pitchDelta, -0.58, 0.52);

    if (input.lockPressed) {
      if (s.lockTargetId) {
        s.lockTargetId = 0;
      } else {
        const t = findBestLockTarget(s);
        if (t) s.lockTargetId = t.id;
      }
    }

    let lockedEnemy = null;
    if (s.lockTargetId) {
      lockedEnemy = s.enemies.find((e) => e.id === s.lockTargetId && e.hp > 0) || null;
      if (!lockedEnemy) s.lockTargetId = 0;
      else {
        const dx = lockedEnemy.x - s.px;
        const dz = lockedEnemy.z - s.pz;
        const desiredYaw = Math.atan2(-dx, -dz);
        const diff = wrapAngle(desiredYaw - s.yaw);
        s.yaw = wrapAngle(s.yaw + diff * Math.min(1, dt * 11));
        s.pitch += (-0.04 - s.pitch) * Math.min(1, dt * 6);
      }
    }

    // 2) 冷却与状态衰减
    s.attackCd = Math.max(0, s.attackCd - dt);
    s.swingTimer = Math.max(0, s.swingTimer - dt);
    s.comboResetTimer = Math.max(0, s.comboResetTimer - dt);
    if (s.comboResetTimer <= 0) s.comboStep = 0;
    s.parryTimer = Math.max(0, s.parryTimer - dt);
    s.parryCd = Math.max(0, s.parryCd - dt);
    s.parryFlash = Math.max(0, s.parryFlash - dt);
    s.dodgeTimer = Math.max(0, s.dodgeTimer - dt);
    s.dodgeCd = Math.max(0, s.dodgeCd - dt);
    s.skillCd = Math.max(0, s.skillCd - dt);
    s.palmAnimTimer = Math.max(0, s.palmAnimTimer - dt);
    s.hurtInvuln = Math.max(0, s.hurtInvuln - dt);
    s.postureBreakTimer = Math.max(0, s.postureBreakTimer - dt);

    // 内力与架势自然恢复
    s.chi = clamp(s.chi + dt * 3.8, 0, s.maxChi);
    if (!input.guardHeld && s.posture > 0) {
      s.posture = Math.max(0, s.posture - dt * 15);
    }
    s.guardHeld = !!input.guardHeld && s.swingTimer <= 0 && s.dodgeTimer <= 0 && s.postureBreakTimer <= 0;

    // 3) 玩家输入动作
    if (input.guardPressed && s.parryCd <= 0 && s.postureBreakTimer <= 0 && s.dodgeTimer <= 0) {
      s.parryTimer = 0.26;
      s.parryCd = 0.34;
      s.swingTimer = 0;
    }

    const fwd = getForward(s.yaw);
    const right = getRight(s.yaw);
    const mx = clamp(input.moveX || 0, -1, 1);
    const my = clamp(input.moveY || 0, -1, 1);
    let wishX = fwd.x * my + right.x * mx;
    let wishZ = fwd.z * my + right.z * mx;
    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 1e-4) {
      wishX /= Math.max(1, wishLen);
      wishZ /= Math.max(1, wishLen);
    }

    // 轻功闪避
    if (input.dodgePressed && s.dodgeCd <= 0 && s.postureBreakTimer <= 0) {
      s.dodgeTimer = 0.28;
      s.dodgeCd = 0.72;
      s.swingTimer = 0;
      if (wishLen > 0.1) {
        s.dodgeDirX = wishX;
        s.dodgeDirZ = wishZ;
      } else {
        // 原地按下轻功时向后腾挪拉身位
        s.dodgeDirX = -fwd.x;
        s.dodgeDirZ = -fwd.z;
      }
      s.vy = 3.4;
      s.events.push({ type: 'dash', x: s.px, z: s.pz });
    }

    // 绝学释放
    if (input.skillPressed && s.postureBreakTimer <= 0 && s.dodgeTimer <= 0) {
      triggerSkill(s);
    }

    // 剑术三连斩
    if (input.attackPressed && s.attackCd <= 0 && s.postureBreakTimer <= 0 && s.dodgeTimer <= 0) {
      const w = s.weapon;
      s.comboStep = (s.comboStep % 3) + 1;
      s.comboResetTimer = 1.15;
      s.swingDur = s.comboStep === 3 ? w.swingDur * 1.18 : w.swingDur;
      s.swingTimer = s.swingDur;
      s.swingHitDone = false;
      s.attackCd = s.comboStep === 3 ? w.cooldown * 1.18 : w.cooldown;

      // 近战微辅助吸附朝向
      if (!s.lockTargetId) {
        let near = null;
        let bestD = w.range + 1.5;
        for (const e of s.enemies) {
          if (e.hp <= 0) continue;
          const dx = e.x - s.px;
          const dz = e.z - s.pz;
          const d = Math.hypot(dx, dz);
          if (d < bestD && d > 0.1) {
            const dot = (dx * fwd.x + dz * fwd.z) / d;
            if (dot > 0.55) { bestD = d; near = e; }
          }
        }
        if (near) {
          const desired = Math.atan2(-(near.x - s.px), -(near.z - s.pz));
          s.yaw = wrapAngle(s.yaw + wrapAngle(desired - s.yaw) * 0.45);
        }
      }

      const lf = getForward(s.yaw);
      s.vx += lf.x * w.lunge;
      s.vz += lf.z * w.lunge;
      s.slashes.push({
        kind: w.id,
        step: s.comboStep,
        hand: s.hand,
        x: s.px,
        z: s.pz,
        yaw: s.yaw,
        life: 0.22,
        maxLife: 0.22,
        radius: w.range * 0.72,
      });
      s.events.push({ type: 'sword_swing', heavy: w.id === 'heavy', step: s.comboStep });
    }

    // 出剑命中判定帧
    if (s.swingTimer > 0 && !s.swingHitDone && s.swingTimer <= s.swingDur - s.weapon.hitTime) {
      s.swingHitDone = true;
      performMeleeHit(s);
    }

    // 4) 玩家移动与轻功垂直抛物线
    const moveSpeed = s.guardHeld ? 3.5 : (s.swingTimer > 0 ? 4.4 : 7.4);
    if (s.dodgeTimer > 0) {
      s.vx = s.dodgeDirX * 15.8;
      s.vz = s.dodgeDirZ * 15.8;
    } else {
      const targetVx = wishX * moveSpeed;
      const targetVz = wishZ * moveSpeed;
      const accel = Math.min(1, dt * 13);
      s.vx += (targetVx - s.vx) * accel;
      s.vz += (targetVz - s.vz) * accel;
    }

    s.px += s.vx * dt;
    s.pz += s.vz * dt;
    if (s.py > 0 || s.vy > 0) {
      s.vy -= 14.5 * dt;
      s.py += s.vy * dt;
      if (s.py <= 0) { s.py = 0; s.vy = 0; }
    }

    // 圆形比武场边界
    const pDist = Math.hypot(s.px, s.pz);
    const maxPlayerR = s.arenaRadius - 0.85;
    if (pDist > maxPlayerR) {
      s.px = (s.px / pDist) * maxPlayerR;
      s.pz = (s.pz / pDist) * maxPlayerR;
    }

    // 5) 敌人 AI 更新与危警列表
    s.threats = [];
    const curFwd = getForward(s.yaw);
    const curRight = getRight(s.yaw);

    for (let i = 0; i < s.enemies.length; i++) {
      const e = s.enemies[i];
      if (e.hp <= 0) continue;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.swingVisual = Math.max(0, e.swingVisual - dt);

      const dx = s.px - e.x;
      const dz = s.pz - e.z;
      const dist = Math.hypot(dx, dz) || 0.001;
      const dirX = dx / dist;
      const dirZ = dz / dist;
      e.yaw = Math.atan2(dx, dz);

      if (e.staggerTimer > 0) {
        e.staggerTimer = Math.max(0, e.staggerTimer - dt);
        if (e.staggerTimer <= 0) {
          e.posture = 0;
          e.state = 'idle';
          e.stateTimer = 0.55;
        }
      } else if (e.state === 'windup') {
        e.stateTimer -= dt;
        const progress = clamp(1 - e.stateTimer / Math.max(0.05, e.windupMax), 0, 1);
        // 计算相对视角方向供 HUD 危警弧展示
        const toEx = e.x - s.px;
        const toEz = e.z - s.pz;
        const fwdDot = (toEx * curFwd.x + toEz * curFwd.z) / dist;
        const rightDot = (toEx * curRight.x + toEz * curRight.z) / dist;
        s.threats.push({
          id: e.id,
          relAngle: Math.atan2(rightDot, fwdDot),
          kind: e.attackKind,
          progress,
          isRanged: e.attackIsRanged,
        });

        if (e.stateTimer <= 0) {
          e.swingVisual = 0.34;
          if (e.attackIsRanged) {
            // 发射暗器 / 飞轮 / 剑气
            const burst = e.projBurst || 1;
            for (let b = 0; b < burst; b++) {
              const spread = burst === 1 ? 0 : (b - (burst - 1) / 2) * 0.16;
              const baseAng = Math.atan2(dx, dz) + spread;
              const pxv = Math.sin(baseAng) * e.projSpeed;
              const pzv = Math.cos(baseAng) * e.projSpeed;
              s.projectiles.push({
                id: ++s._nextId,
                fromPlayer: false,
                shooterId: e.id,
                kind: e.bossId === 'jinlun' ? 'wheel' : (e.bossId === 'limochou' ? 'needle' : 'dart'),
                x: e.x + Math.sin(baseAng) * 0.9,
                y: 1.38,
                z: e.z + Math.cos(baseAng) * 0.9,
                vx: pxv,
                vz: pzv,
                yaw: baseAng,
                damage: e.damage,
                postureDmg: 22,
                radius: e.bossId === 'jinlun' ? 0.65 : 0.42,
                life: 2.8,
                color: e.bossId === 'jinlun' ? '#facc15' : (e.bossId === 'limochou' ? '#e879f9' : '#fb7185'),
              });
            }
          } else {
            // 近战突刺 / 重击（金轮法王二阶段金光招式带大范围龙象震天波）
            const strikeRange = e.attackKind === 'unblock' && e.phase2 ? e.range + 2.6 : e.range + 1.15;
            e.vx += dirX * 5.2;
            e.vz += dirZ * 5.2;
            if (dist <= strikeRange) {
              resolvePlayerHit(s, e, e.attackKind === 'peril' ? Math.round(e.damage * 1.25) : e.damage, e.attackKind);
            }
          }
          e.state = 'recover';
          e.stateTimer = e.attackCdBase * (0.85 + s._rand() * 0.35);
          e.attackKind = 'normal';
        }
      } else if (e.state === 'recover') {
        e.stateTimer -= dt;
        // 缓步绕圈走位
        e.strafeTimer -= dt;
        if (e.strafeTimer <= 0) {
          e.strafeDir = -e.strafeDir;
          e.strafeTimer = 1.1 + s._rand() * 1.3;
        }
        const prefDist = e.ranged && !e.isBoss ? 8.2 : (e.range + 1.2);
        const radial = dist < prefDist - 0.8 ? -0.55 : (dist > prefDist + 1.5 ? 0.85 : 0);
        const tx = (dirX * radial - dirZ * e.strafeDir * 0.55) * e.speed * 0.65;
        const tz = (dirZ * radial + dirX * e.strafeDir * 0.55) * e.speed * 0.65;
        e.vx += (tx - e.vx) * Math.min(1, dt * 7);
        e.vz += (tz - e.vz) * Math.min(1, dt * 7);
        if (e.stateTimer <= 0) e.state = 'idle';
      } else {
        // idle / 追击并寻机起手
        e.stateTimer -= dt;
        const canRanged = e.ranged && dist >= e.rangedMinDist && dist <= 13.8;
        const canMelee = !e.ranged ? dist <= e.range : (e.isBoss && dist <= e.range);

        if (e.stateTimer <= 0 && (canMelee || canRanged)) {
          e.state = 'windup';
          e.attackIsRanged = canRanged && !canMelee;
          const roll = s._rand();
          if (e.attackIsRanged) {
            e.attackKind = 'normal';
            e.windupMax = e.windupBase;
          } else if (roll < e.unblockChance) {
            e.attackKind = 'unblock';
            e.windupMax = e.windupBase * 1.25;
            s.events.push({ type: 'peril', kind: 'unblock', id: e.id, x: e.x, z: e.z });
          } else if (roll < e.unblockChance + e.perilChance) {
            e.attackKind = 'peril';
            e.windupMax = e.windupBase * 1.12;
            s.events.push({ type: 'peril', kind: 'peril', id: e.id, x: e.x, z: e.z });
          } else {
            e.attackKind = 'normal';
            e.windupMax = e.windupBase;
          }
          e.stateTimer = e.windupMax;
        } else {
          // 靠近玩家或保持远程距离
          const ideal = e.ranged && !e.isBoss ? 8.6 : (e.range * 0.85);
          const approach = dist > ideal ? 1 : (dist < ideal - 1.5 ? -0.4 : 0);
          const tx = (dirX * approach - dirZ * e.strafeDir * 0.35) * e.speed;
          const tz = (dirZ * approach + dirX * e.strafeDir * 0.35) * e.speed;
          e.vx += (tx - e.vx) * Math.min(1, dt * 8);
          e.vz += (tz - e.vz) * Math.min(1, dt * 8);
        }
      }

      // 敌人之间分离推力，防止叠成一个点
      for (let j = 0; j < s.enemies.length; j++) {
        if (i === j) continue;
        const o = s.enemies[j];
        if (o.hp <= 0) continue;
        const sdx = e.x - o.x;
        const sdz = e.z - o.z;
        const sd = Math.hypot(sdx, sdz);
        const minD = e.radius + o.radius + 0.5;
        if (sd > 0.001 && sd < minD) {
          const push = (minD - sd) * 5.0 * dt;
          e.vx += (sdx / sd) * push;
          e.vz += (sdz / sd) * push;
        }
      }

      // 物理阻尼与边界限制
      e.vx *= Math.pow(0.08, dt);
      e.vz *= Math.pow(0.08, dt);
      e.x += e.vx * dt;
      e.z += e.vz * dt;
      // 防止敌我重合穿透摄像机
      const pdx = e.x - s.px;
      const pdz = e.z - s.pz;
      const pd = Math.hypot(pdx, pdz);
      const minPD = e.radius + 0.72;
      if (pd > 0.001 && pd < minPD) {
        e.x = s.px + (pdx / pd) * minPD;
        e.z = s.pz + (pdz / pd) * minPD;
      }
      const ed = Math.hypot(e.x, e.z);
      const maxER = s.arenaRadius - 0.9;
      if (ed > maxER) {
        e.x = (e.x / ed) * maxER;
        e.z = (e.z / ed) * maxER;
      }
    }

    // 清理已死亡敌人
    s.enemies = s.enemies.filter((e) => e.hp > 0);

    // 6) 飞行物（暗器、银针、金轮、玩家剑气）
    for (let i = s.projectiles.length - 1; i >= 0; i--) {
      const p = s.projectiles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.z += p.vz * dt;
      if (p.life <= 0 || Math.hypot(p.x, p.z) > s.arenaRadius + 4) {
        s.projectiles.splice(i, 1);
        continue;
      }

      if (p.fromPlayer) {
        let remove = false;
        for (const e of s.enemies) {
          if (e.hp <= 0 || (p.hitIds && p.hitIds.includes(e.id))) continue;
          const d = Math.hypot(e.x - p.x, e.z - p.z);
          if (d <= e.radius + p.radius) {
            applyDamageToEnemy(s, e, p.damage, p.postureDmg, { knockback: 5.0, noChi: true });
            if (p.pierce) {
              p.hitIds = p.hitIds || [];
              p.hitIds.push(e.id);
            } else {
              remove = true;
              break;
            }
          }
        }
        if (remove) s.projectiles.splice(i, 1);
      } else {
        const d = Math.hypot(s.px - p.x, s.pz - p.z);
        // 精准弹反反弹暗器/飞轮！
        if (s.parryTimer > 0 && d <= 2.8) {
          p.fromPlayer = true;
          p.damage = Math.round(p.damage * 1.9);
          p.postureDmg = 45;
          p.life = 1.6;
          p.color = '#7dd3fc';
          const shooter = s.enemies.find((e) => e.id === p.shooterId && e.hp > 0);
          if (shooter) {
            const rdx = shooter.x - p.x;
            const rdz = shooter.z - p.z;
            const rd = Math.hypot(rdx, rdz) || 1;
            const spd = Math.hypot(p.vx, p.vz) * 1.45;
            p.vx = (rdx / rd) * spd;
            p.vz = (rdz / rd) * spd;
          } else {
            p.vx = -p.vx * 1.45;
            p.vz = -p.vz * 1.45;
          }
          s.parries++;
          s.parryFlash = 0.25;
          s.chi = clamp(s.chi + 20, 0, s.maxChi);
          s.score += 130;
          s.events.push({ type: 'parry', x: p.x, z: p.z, projectile: true });
          continue;
        }
        if (d <= p.radius + 0.65) {
          const res = resolvePlayerHit(s, null, p.damage, 'normal');
          if (res !== 'dodged') s.projectiles.splice(i, 1);
        }
      }
    }

    // 7) 剑光残影衰减
    for (let i = s.slashes.length - 1; i >= 0; i--) {
      s.slashes[i].life -= dt;
      if (s.slashes[i].life <= 0) s.slashes.splice(i, 1);
    }

    // 8) 波次推进与章节通关判定
    if (!s.dead && s.enemies.length === 0) {
      if (s.phase === 'boss') {
        s.chapterWon = true;
        s.phase = 'won';
        s.rank = computeRank(s);
        s.score += 500 + Math.round(s.hp * 4);
        s.events.push({ type: 'chapter_win', chapterIdx: s.chapterIdx, rank: s.rank, score: s.score });
      } else {
        spawnWave(s, s.wave);
      }
    }

    return s;
  };
})(typeof window !== 'undefined' ? window : globalThis);
