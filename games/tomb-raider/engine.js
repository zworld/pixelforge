/* 古墓丽影 · 秘鲁遗迹 — 纯逻辑 3D 动作冒险引擎（攀爬抓崖/平移/推石解谜/滚石地刺/双枪翻滚/霸王龙 Boss，零 DOM 可单测） */
(function (G) {
  'use strict';
  const TR = (G.TR = G.TR || {});

  TR.DT = 1 / 60;
  TR.PLAYER_R = 0.36;
  TR.PLAYER_H = 1.72;
  TR.GRAVITY = 23.0;
  TR.JUMP_VY = 9.4;

  function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
  }

  function wrapAngle(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }

  function lerpAngle(a, b, t) {
    return wrapAngle(a + wrapAngle(b - a) * clamp(t, 0, 1));
  }

  function getForward(yaw) {
    return { x: -Math.sin(yaw), z: -Math.cos(yaw) };
  }

  function getRight(yaw) {
    return { x: Math.cos(yaw), z: -Math.sin(yaw) };
  }

  function cloneLevel(idx) {
    const list = TR.LEVELS || [];
    const src = list[clamp(idx | 0, 0, Math.max(0, list.length - 1))];
    return JSON.parse(JSON.stringify(src));
  }

  TR.newState = function (levelIdx = 0) {
    const lvl = cloneLevel(levelIdx);
    const sp = lvl.spawn || { x: 0, y: 0.05, z: 0, yaw: 0 };

    const blocks = (lvl.blocks || []).map((b, i) => ({
      ...b,
      id: b.id || `blk_${i}`,
      crumbleState: 'solid', // solid | shaking | fallen
      crumbleTimer: 0,
    }));

    const pushBlocks = (lvl.pushBlocks || []).map((pb) => ({
      ...pb,
      vx: 0,
      vz: 0,
    }));

    const plates = (lvl.plates || []).map((pl) => ({
      ...pl,
      active: false,
    }));

    const levers = (lvl.levers || []).map((lv) => ({
      ...lv,
      pulled: false,
      anim: 0,
    }));

    const gates = (lvl.gates || []).map((gt) => ({
      ...gt,
      open: false,
      openProgress: 0,
    }));

    const spikes = (lvl.spikes || []).map((sk) => ({
      ...sk,
      extended: 0,
      active: false,
    }));

    const darts = (lvl.darts || []).map((dt) => ({
      ...dt,
      timer: dt.interval * 0.5,
    }));

    const boulders = (lvl.boulders || []).map((bd) => ({
      ...bd,
      startX: bd.x,
      startY: bd.y,
      startZ: bd.z,
      state: 'idle', // idle | rolling | stopped
      rotX: 0,
    }));

    const pickups = (lvl.pickups || []).map((pk) => ({
      ...pk,
      collected: false,
    }));

    const enemies = (lvl.enemies || []).map((e) => ({
      ...e,
      maxHp: e.hp,
      vx: 0,
      vz: 0,
      yaw: 0,
      state: 'patrol',   // patrol | chase | windup | lunge | recover | dead
      stateTimer: 0.5,
      windupMax: e.kind === 'trex' ? 0.72 : 0.45,
      attackCd: 0,
      hitFlash: 0,
      awoken: !e.isBoss,
      homeX: e.x,
      homeZ: e.z,
      radius: e.kind === 'trex' ? 1.55 : (e.kind === 'bear' ? 0.92 : 0.62),
      height: e.kind === 'trex' ? 4.4 : (e.kind === 'bear' ? 1.9 : 1.15),
    }));

    const checkpoints = (lvl.checkpoints || []).map((cp) => ({
      ...cp,
      reached: false,
    }));

    return {
      levelIdx: lvl.index,
      level: lvl,
      // 劳拉状态
      px: sp.x,
      py: sp.y,
      pz: sp.z,
      vx: 0,
      vy: 0,
      vz: 0,
      facingYaw: sp.yaw || 0,
      camYaw: sp.yaw || 0,
      camPitch: -0.22,
      onGround: true,
      coyoteTimer: 0,
      jumpBufTimer: 0,
      hp: 100,
      maxHp: 100,
      medipacks: 1,
      hurtInvuln: 0,
      // 动作状态机
      action: 'idle',     // idle | run | jump | hang | climb | roll | push | lever
      hang: null,         // { blockId, face, topY, minSpan, maxSpan, nx, nz }
      climbStart: null,
      climbEnd: null,
      climbTimer: 0,
      rollTimer: 0,
      rollCd: 0,
      rollKind: 'front',  // front | back | left | right
      rollDirX: 0,
      rollDirZ: -1,
      leverTimer: 0,
      pushingBlockId: null,
      // 双枪与装备
      weaponsDrawn: false,
      fireCd: 0,
      heavyCd: 0,
      gunHand: 1,         // 交替左右手开火
      muzzleL: 0,
      muzzleR: 0,
      lockTargetId: null,
      flareTimer: 0,
      instinctOn: false,
      // 关卡机关与实体
      blocks,
      pushBlocks,
      plates,
      levers,
      gates,
      spikes,
      darts,
      dartProjectiles: [],
      tracers: [],
      boulders,
      pickups,
      enemies,
      checkpoints,
      respawn: { x: sp.x, y: sp.y, z: sp.z, yaw: sp.yaw || 0 },
      // 进度与统计
      artifacts: 0,
      totalArtifacts: pickups.filter((p) => p.kind === 'artifact').length,
      cogs: 0,
      totalCogs: pickups.filter((p) => p.kind === 'cog').length,
      kills: 0,
      deaths: 0,
      time: 0,
      score: 0,
      levelWon: false,
      rank: 'A',
      prompt: '',         // 屏幕底部交互提示（如 "[E] 拉动太阳拉杆"）
      events: [],
    };
  };

  /** 收集当前全部有效实心 AABB 碰撞盒 */
  function collectSolids(s, skipPushBlockId = null) {
    const out = [];
    for (const b of s.blocks) {
      if (b.crumble && b.crumbleState === 'fallen') continue;
      out.push({
        id: b.id,
        minX: b.x - b.w * 0.5,
        maxX: b.x + b.w * 0.5,
        minY: b.y,
        maxY: b.y + b.h,
        minZ: b.z - b.d * 0.5,
        maxZ: b.z + b.d * 0.5,
        climbable: !!b.climbable || (b.h >= 1.2 && b.h <= 4.2 && b.style !== 'rock'),
        block: b,
      });
    }
    for (const g of s.gates) {
      if (g.openProgress >= 0.82) continue;
      const lift = g.openProgress * g.h;
      out.push({
        id: g.id,
        minX: g.x - g.w * 0.5,
        maxX: g.x + g.w * 0.5,
        minY: g.y + lift,
        maxY: g.y + g.h + lift,
        minZ: g.z - g.d * 0.5,
        maxZ: g.z + g.d * 0.5,
        climbable: false,
        gate: g,
      });
    }
    for (const pb of s.pushBlocks) {
      if (pb.id === skipPushBlockId) continue;
      const hs = pb.size * 0.5;
      out.push({
        id: pb.id,
        minX: pb.x - hs,
        maxX: pb.x + hs,
        minY: pb.y,
        maxY: pb.y + pb.size,
        minZ: pb.z - hs,
        maxZ: pb.z + hs,
        climbable: true,
        pushBlock: pb,
      });
    }
    return out;
  }

  /** 尝试为腾空中的劳拉检测并抓住附近可攀爬石台边缘（经典古墓丽影 Ledge Grab） */
  function tryLedgeGrab(s, solids) {
    if (s.onGround || s.vy > 3.6) return false;
    const handY = s.py + 1.88;
    const grabReach = TR.PLAYER_R + 0.42;

    let best = null;
    let bestScore = Infinity;

    for (const box of solids) {
      if (!box.climbable) continue;
      const topY = box.maxY;
      // 边缘顶面位于劳拉头顶/双手可及高度窗口内
      if (topY < s.py + 0.85 || topY > handY + 0.45) continue;

      // 检测 4 个立面哪一面正对劳拉
      const faces = [
        { face: '+z', nx: 0, nz: 1, dist: s.pz - box.maxZ, along: s.px, minS: box.minX + 0.32, maxS: box.maxX - 0.32, yaw: 0 },
        { face: '-z', nx: 0, nz: -1, dist: box.minZ - s.pz, along: s.px, minS: box.minX + 0.32, maxS: box.maxX - 0.32, yaw: Math.PI },
        { face: '+x', nx: 1, nz: 0, dist: s.px - box.maxX, along: s.pz, minS: box.minZ + 0.32, maxS: box.maxZ - 0.32, yaw: Math.PI * 0.5 },
        { face: '-x', nx: -1, nz: 0, dist: box.minX - s.px, along: s.pz, minS: box.minZ + 0.32, maxS: box.maxZ - 0.32, yaw: -Math.PI * 0.5 },
      ];
      for (const f of faces) {
        if (f.minS > f.maxS) continue;
        if (f.dist >= -0.22 && f.dist <= grabReach && f.along >= f.minS - 0.25 && f.along <= f.maxS + 0.25) {
          const sc = Math.abs(f.dist) + Math.abs(topY - handY);
          if (sc < bestScore) {
            bestScore = sc;
            best = {
              box,
              face: f.face,
              nx: f.nx,
              nz: f.nz,
              topY,
              minSpan: f.minS,
              maxSpan: f.maxS,
              yaw: f.yaw,
            };
          }
        }
      }
    }

    if (!best) return false;
    s.action = 'hang';
    s.vx = 0;
    s.vy = 0;
    s.vz = 0;
    s.onGround = false;
    s.py = best.topY - 1.66;
    if (best.face === '+z') {
      s.pz = best.box.maxZ + TR.PLAYER_R + 0.04;
      s.px = clamp(s.px, best.minSpan, best.maxSpan);
    } else if (best.face === '-z') {
      s.pz = best.box.minZ - TR.PLAYER_R - 0.04;
      s.px = clamp(s.px, best.minSpan, best.maxSpan);
    } else if (best.face === '+x') {
      s.px = best.box.maxX + TR.PLAYER_R + 0.04;
      s.pz = clamp(s.pz, best.minSpan, best.maxSpan);
    } else {
      s.px = best.box.minX - TR.PLAYER_R - 0.04;
      s.pz = clamp(s.pz, best.minSpan, best.maxSpan);
    }
    s.facingYaw = best.yaw;
    s.hang = best;
    s.weaponsDrawn = false;
    s.events.push({ type: 'ledge_grab', x: s.px, y: best.topY, z: s.pz });
    return true;
  }

  /** 解析玩家 3D AABB 移动与落脚点 */
  function moveAndCollidePlayer(s, dt, solids) {
    const r = TR.PLAYER_R;
    const h = TR.PLAYER_H;

    // 水平 X 轴
    s.px += s.vx * dt;
    for (const box of solids) {
      if (s.py + h <= box.minY + 0.02 || s.py >= box.maxY - 0.02) continue;
      if (s.pz + r <= box.minZ || s.pz - r >= box.maxZ) continue;
      if (s.px + r > box.minX && s.px - r < box.maxX) {
        // 允许丝滑跨台阶（<= 0.52m）
        if (s.onGround && box.maxY - s.py <= 0.52 && box.maxY > s.py) {
          s.py = box.maxY;
          continue;
        }
        if (s.vx > 0) s.px = box.minX - r;
        else if (s.vx < 0) s.px = box.maxX + r;
        else {
          const dl = Math.abs((s.px + r) - box.minX);
          const dr = Math.abs(box.maxX - (s.px - r));
          s.px = dl < dr ? box.minX - r : box.maxX + r;
        }
        s.vx = 0;
      }
    }

    // 水平 Z 轴
    s.pz += s.vz * dt;
    for (const box of solids) {
      if (s.py + h <= box.minY + 0.02 || s.py >= box.maxY - 0.02) continue;
      if (s.px + r <= box.minX || s.px - r >= box.maxX) continue;
      if (s.pz + r > box.minZ && s.pz - r < box.maxZ) {
        if (s.onGround && box.maxY - s.py <= 0.52 && box.maxY > s.py) {
          s.py = box.maxY;
          continue;
        }
        if (s.vz > 0) s.pz = box.minZ - r;
        else if (s.vz < 0) s.pz = box.maxZ + r;
        else {
          const dn = Math.abs((s.pz + r) - box.minZ);
          const df = Math.abs(box.maxZ - (s.pz - r));
          s.pz = dn < df ? box.minZ - r : box.maxZ + r;
        }
        s.vz = 0;
      }
    }

    // 垂直 Y 轴
    const prevY = s.py;
    s.vy -= TR.GRAVITY * dt;
    s.py += s.vy * dt;
    s.onGround = false;
    let stoodBlock = null;

    for (const box of solids) {
      if (s.px + r <= box.minX + 0.01 || s.px - r >= box.maxX - 0.01) continue;
      if (s.pz + r <= box.minZ + 0.01 || s.pz - r >= box.maxZ - 0.01) continue;
      if (s.vy <= 0 && prevY >= box.maxY - 0.16 && s.py <= box.maxY) {
        s.py = box.maxY;
        s.vy = 0;
        s.onGround = true;
        stoodBlock = box.block || null;
      } else if (s.vy > 0 && prevY + h <= box.minY + 0.15 && s.py + h >= box.minY) {
        s.py = box.minY - h;
        s.vy = 0;
      }
    }

    // 踩中碎裂石桥触发抖动崩塌倒计时
    if (stoodBlock && stoodBlock.crumble && stoodBlock.crumbleState === 'solid') {
      stoodBlock.crumbleState = 'shaking';
      stoodBlock.crumbleTimer = 0.78;
      s.events.push({ type: 'crumbleStart', x: stoodBlock.x, z: stoodBlock.z });
    }
  }

  /** 受伤与存档点重生（保留已开启石门与已收集圣物） */
  function damagePlayer(s, amount, cause = 'enemy') {
    if (s.levelWon || s.hurtInvuln > 0 || s.rollTimer > 0) return;
    s.hp = Math.max(0, s.hp - amount);
    s.hurtInvuln = 0.62;
    s.events.push({ type: 'hurt', damage: amount, cause, x: s.px, y: s.py + 1.0, z: s.pz });

    if (s.hp <= 0) {
      respawnAtCheckpoint(s, cause);
    }
  }

  function respawnAtCheckpoint(s, cause = 'fall') {
    s.deaths++;
    s.hp = s.maxHp;
    s.px = s.respawn.x;
    s.py = s.respawn.y + 0.1;
    s.pz = s.respawn.z;
    s.vx = 0;
    s.vy = 0;
    s.vz = 0;
    s.facingYaw = s.respawn.yaw || 0;
    s.action = 'idle';
    s.hang = null;
    s.rollTimer = 0;
    s.hurtInvuln = 1.2;
    // 若死于滚石，重置滚石让玩家重新挑战躲避！
    for (const b of s.boulders) {
      if (b.state !== 'stopped') {
        b.x = b.startX;
        b.y = b.startY;
        b.z = b.startZ;
        b.state = 'idle';
        b.rotX = 0;
      }
    }
    s.events.push({ type: 'die', cause, respawn: true, x: s.px, y: s.py, z: s.pz });
  }

  function findCombatTarget(s) {
    const fwd = getForward(s.camYaw);
    let best = null;
    let bestScore = Infinity;
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      const dx = e.x - s.px;
      const dz = e.z - s.pz;
      const d = Math.hypot(dx, dz);
      if (d > 24) continue;
      const dot = d > 0.01 ? (dx * fwd.x + dz * fwd.z) / d : 1;
      const sc = d - dot * 6.5 - (e.isBoss ? 3.5 : 0);
      if (sc < bestScore) {
        bestScore = sc;
        best = e;
      }
    }
    return best;
  }

  function shootWeapon(s, heavy) {
    const target = findCombatTarget(s);
    s.weaponsDrawn = true;
    s.lockTargetId = target ? target.id : null;
    const dmg = heavy ? 36 : 12;

    if (heavy) {
      s.heavyCd = 1.15;
      s.muzzleL = 0.14;
      s.muzzleR = 0.14;
      s.events.push({ type: 'magnum_shot', x: s.px, y: s.py + 1.35, z: s.pz });
    } else {
      s.fireCd = 0.14;
      s.gunHand = -s.gunHand;
      if (s.gunHand > 0) s.muzzleR = 0.09;
      else s.muzzleL = 0.09;
      s.events.push({ type: 'pistol_shot', x: s.px, y: s.py + 1.35, z: s.pz });
    }

    const fwd = getForward(s.facingYaw);
    let tx = s.px + fwd.x * 16;
    let ty = s.py + 1.35;
    let tz = s.pz + fwd.z * 16;

    if (target) {
      const dx = target.x - s.px;
      const dz = target.z - s.pz;
      s.facingYaw = Math.atan2(-dx, -dz);
      tx = target.x;
      ty = target.y + target.height * 0.58;
      tz = target.z;

      target.hp = Math.max(0, target.hp - dmg);
      target.hitFlash = 0.14;
      target.awoken = true;
      const d = Math.hypot(dx, dz) || 1;
      const kb = heavy ? (target.isBoss ? 2.2 : 6.2) : (target.isBoss ? 0.4 : 1.8);
      target.vx += (dx / d) * kb;
      target.vz += (dz / d) * kb;
      s.events.push({ type: 'hit', x: tx, y: ty, z: tz, heavy, boss: !!target.isBoss });

      if (target.hp <= 0) {
        target.state = 'dead';
        s.kills++;
        s.score += target.isBoss ? 1200 : (target.kind === 'bear' ? 350 : 180);
        if (s.lockTargetId === target.id) s.lockTargetId = null;
        s.events.push({ type: 'kill', x: target.x, y: target.y + 1.0, z: target.z, kind: target.kind, isBoss: !!target.isBoss, name: target.name });
      }
    }

    s.tracers.push({
      x0: s.px + (s.gunHand > 0 ? 0.24 : -0.24),
      y0: s.py + 1.32,
      z0: s.pz,
      x1: tx,
      y1: ty,
      z1: tz,
      heavy: !!heavy,
      life: heavy ? 0.14 : 0.08,
      maxLife: heavy ? 0.14 : 0.08,
    });
  }

  function updateGateLocks(s) {
    // 压板检测：检查是否有印加石块或劳拉压在太阳压板上
    for (const pl of s.plates) {
      let pressed = false;
      for (const pb of s.pushBlocks) {
        if (Math.hypot(pb.x - pl.x, pb.z - pl.z) <= pl.radius + pb.size * 0.35) {
          pressed = true;
          break;
        }
      }
      if (!pl.active && pressed) {
        pl.active = true;
        s.score += 250;
        s.events.push({ type: 'lever_pull', id: pl.id, x: pl.x, z: pl.z });
      } else if (pl.active && !pressed) {
        pl.active = false;
      }
    }

    const bossAlive = s.enemies.some((e) => e.isBoss && e.hp > 0);
    for (const g of s.gates) {
      if (g.open) continue;
      let ok = true;
      if (g.required && g.required.length > 0) {
        for (const reqId of g.required) {
          const lv = s.levers.find((l) => l.id === reqId);
          const pl = s.plates.find((p) => p.id === reqId);
          if (lv && !lv.pulled) ok = false;
          if (pl && !pl.active) ok = false;
        }
      }
      if (g.requireCogs && s.cogs < g.requireCogs) ok = false;
      if (g.requireBoss && bossAlive) ok = false;
      if (ok) {
        g.open = true;
        s.score += 400;
        s.events.push({ type: 'gate_open', id: g.id, label: g.label, x: g.x, y: g.y + 2, z: g.z });
      }
    }
  }

  function computeRank(s) {
    let pts = 0;
    if (s.artifacts >= s.totalArtifacts && s.totalArtifacts > 0) pts += 3;
    else if (s.artifacts >= 1) pts += 1;
    if (s.deaths === 0) pts += 3;
    else if (s.deaths <= 1) pts += 2;
    if (s.time <= 120) pts += 2;
    else if (s.time <= 200) pts += 1;
    if (pts >= 7) return 'S';
    if (pts >= 5) return 'A';
    if (pts >= 3) return 'B';
    return 'C';
  }

  /**
   * 推进一帧 (1/60s)
   * input: { moveX, moveY, yawDelta, pitchDelta, jumpPressed, dodgePressed, fireHeld, heavyPressed, interactPressed, interactHeld, healPressed, flarePressed, instinctPressed }
   */
  TR.step = function (s, input = {}) {
    s.events = [];
    if (s.levelWon) return s;

    const dt = TR.DT;
    s.time += dt;

    // 1) 相机轨道视角更新
    if (input.yawDelta) s.camYaw = wrapAngle(s.camYaw + input.yawDelta);
    if (input.pitchDelta) s.camPitch = clamp(s.camPitch + input.pitchDelta, -0.68, 0.25);

    // 2) 冷却与状态计时器
    s.hurtInvuln = Math.max(0, s.hurtInvuln - dt);
    s.fireCd = Math.max(0, s.fireCd - dt);
    s.heavyCd = Math.max(0, s.heavyCd - dt);
    s.muzzleL = Math.max(0, s.muzzleL - dt);
    s.muzzleR = Math.max(0, s.muzzleR - dt);
    s.rollCd = Math.max(0, s.rollCd - dt);
    s.rollTimer = Math.max(0, s.rollTimer - dt);
    s.leverTimer = Math.max(0, s.leverTimer - dt);
    s.flareTimer = Math.max(0, s.flareTimer - dt);
    s.coyoteTimer = s.onGround ? 0.14 : Math.max(0, s.coyoteTimer - dt);
    s.jumpBufTimer = input.jumpPressed ? 0.15 : Math.max(0, s.jumpBufTimer - dt);

    // 求生本能 (Q) / 绿色照明弹 (V) / 急救包 (H)
    if (input.instinctPressed) {
      s.instinctOn = !s.instinctOn;
    }
    if (input.flarePressed) {
      s.flareTimer = 28.0;
      s.events.push({ type: 'flare', x: s.px, y: s.py + 1.2, z: s.pz });
    }
    if (input.healPressed && s.medipacks > 0 && s.hp < s.maxHp) {
      s.medipacks--;
      s.hp = Math.min(s.maxHp, s.hp + 62);
      s.events.push({ type: 'medipack', x: s.px, y: s.py + 1.2, z: s.pz });
    }

    // 3) 更新碎裂桥与石门开启动画
    for (const b of s.blocks) {
      if (!b.crumble) continue;
      if (b.crumbleState === 'shaking') {
        b.crumbleTimer -= dt;
        if (b.crumbleTimer <= 0) {
          b.crumbleState = 'fallen';
          b.crumbleTimer = 3.6;
          s.events.push({ type: 'crumbleBreak', x: b.x, y: b.y, z: b.z });
        }
      } else if (b.crumbleState === 'fallen') {
        b.crumbleTimer -= dt;
        if (b.crumbleTimer <= 0) b.crumbleState = 'solid';
      }
    }
    for (const g of s.gates) {
      if (g.open && g.openProgress < 1) {
        g.openProgress = Math.min(1, g.openProgress + dt * 0.72);
      }
    }
    for (const lv of s.levers) {
      if (lv.pulled && lv.anim < 1) lv.anim = Math.min(1, lv.anim + dt * 2.8);
    }

    const solids = collectSolids(s);
    const mx = clamp(input.moveX || 0, -1, 1);
    const my = clamp(input.moveY || 0, -1, 1);
    const fwd = getForward(s.camYaw);
    const right = getRight(s.camYaw);
    let wishX = fwd.x * my + right.x * mx;
    let wishZ = fwd.z * my + right.z * mx;
    const wishLen = Math.hypot(wishX, wishZ);
    if (wishLen > 1e-4) {
      wishX /= Math.max(1, wishLen);
      wishZ /= Math.max(1, wishLen);
    }

    // 4) 劳拉核心动作状态机（攀爬翻越 -> 悬崖抓握平移 -> 翻滚 -> 常规跑跳推石）
    s.prompt = '';
    s.pushingBlockId = null;

    if (s.action === 'climb') {
      s.climbTimer -= dt;
      const p = 1 - Math.max(0, s.climbTimer) / 0.34;
      const e = p * p * (3 - 2 * p);
      s.px = s.climbStart.x + (s.climbEnd.x - s.climbStart.x) * e;
      s.py = s.climbStart.y + (s.climbEnd.y - s.climbStart.y) * Math.min(1, p * 1.25);
      s.pz = s.climbStart.z + (s.climbEnd.z - s.climbStart.z) * e;
      if (s.climbTimer <= 0) {
        s.px = s.climbEnd.x;
        s.py = s.climbEnd.y;
        s.pz = s.climbEnd.z;
        s.vy = 0;
        s.onGround = true;
        s.action = 'idle';
        s.hang = null;
      }
    } else if (s.action === 'hang' && s.hang) {
      const hg = s.hang;
      s.prompt = '[W / 空格] 翻身上台 · [A / D] 悬崖横移 · [Shift] 松手落下';
      // 悬崖横移（Shimmy）：按左右键沿平台边沿流畅挪动
      if (Math.abs(mx) > 0.15) {
        const shimmySpd = 2.6 * dt;
        const rightOfFaceX = -hg.nz;
        const rightOfFaceZ = hg.nx;
        // 将相机右向投影到悬崖切线方向
        const proj = (right.x * rightOfFaceX + right.z * rightOfFaceZ) * mx;
        if (hg.face === '+z' || hg.face === '-z') {
          s.px = clamp(s.px + Math.sign(proj || mx) * shimmySpd, hg.minSpan, hg.maxSpan);
        } else {
          s.pz = clamp(s.pz + Math.sign(proj || mx) * shimmySpd, hg.minSpan, hg.maxSpan);
        }
      }
      // 翻身上台（W 或 空格）
      if (input.jumpPressed || my > 0.45) {
        s.action = 'climb';
        s.climbTimer = 0.34;
        s.climbStart = { x: s.px, y: s.py, z: s.pz };
        s.climbEnd = {
          x: s.px - hg.nx * 0.72,
          y: hg.topY + 0.02,
          z: s.pz - hg.nz * 0.72,
        };
        s.events.push({ type: 'jump', climb: true });
      } else if (input.dodgePressed || my < -0.65) {
        s.action = 'jump';
        s.hang = null;
        s.px += hg.nx * 0.18;
        s.pz += hg.nz * 0.18;
        s.vy = -1.2;
      }
    } else {
      // 地面/空中常规状态
      // (A) 交互提示与机关操作（壁墙拉杆 + 推动石块）
      let nearLever = null;
      for (const lv of s.levers) {
        if (lv.pulled) continue;
        if (Math.hypot(s.px - lv.x, s.pz - lv.z) <= 2.1 && Math.abs(s.py - lv.y) <= 1.2) {
          nearLever = lv;
          break;
        }
      }
      let nearPush = null;
      if (!nearLever && s.onGround) {
        for (const pb of s.pushBlocks) {
          if (Math.hypot(s.px - pb.x, s.pz - pb.z) <= pb.size * 0.5 + 1.15 && Math.abs(s.py - pb.y) <= 0.6) {
            nearPush = pb;
            break;
          }
        }
      }

      if (nearLever) {
        s.prompt = `[E] ${nearLever.label}`;
        if (input.interactPressed) {
          nearLever.pulled = true;
          s.leverTimer = 0.50;
          s.action = 'lever';
          s.facingYaw = Math.atan2(-(nearLever.x - s.px), -(nearLever.z - s.pz));
          s.events.push({ type: 'lever_pull', id: nearLever.id, x: nearLever.x, y: nearLever.y + 1, z: nearLever.z });
        }
      } else if (nearPush) {
        s.prompt = '[按住 E + WASD] 推动印加石块至太阳压板';
        if (input.interactHeld && wishLen > 0.15) {
          // 将推力对齐到主轴或劳拉朝向，丝滑推移石块！
          const dx = nearPush.x - s.px;
          const dz = nearPush.z - s.pz;
          let pushX = 0, pushZ = 0;
          if (Math.abs(wishX) >= Math.abs(wishZ)) pushX = Math.sign(wishX);
          else pushZ = Math.sign(wishZ);
          // 只允许沿推近或拉动方向滑移
          const moveStep = 2.65 * dt;
          const nx = nearPush.x + pushX * moveStep;
          const nz = nearPush.z + pushZ * moveStep;
          const hs = nearPush.size * 0.5;
          const blockSolids = collectSolids(s, nearPush.id);
          let blocked = false;
          for (const box of blockSolids) {
            if (nearPush.y + nearPush.size <= box.minY + 0.05 || nearPush.y >= box.maxY - 0.05) continue;
            if (nx + hs > box.minX && nx - hs < box.maxX && nz + hs > box.minZ && nz - hs < box.maxZ) {
              blocked = true;
              break;
            }
          }
          if (!blocked) {
            nearPush.x = nx;
            nearPush.z = nz;
            s.px += pushX * moveStep;
            s.pz += pushZ * moveStep;
            s.pushingBlockId = nearPush.id;
            s.action = 'push';
            s.facingYaw = Math.atan2(-dx, -dz);
            if (Math.floor(s.time * 6) !== Math.floor((s.time - dt) * 6)) {
              s.events.push({ type: 'block_slide', x: nearPush.x, z: nearPush.z });
            }
          }
        }
      }

      // (B) 翻滚 / 后空翻 / 侧空翻闪避 (Shift)
      if (input.dodgePressed && s.rollCd <= 0 && s.onGround && !s.pushingBlockId) {
        s.rollTimer = 0.36;
        s.rollCd = 0.62;
        if (wishLen > 0.1) {
          s.rollDirX = wishX;
          s.rollDirZ = wishZ;
          if (my < -0.35) s.rollKind = 'back';
          else if (mx < -0.35) s.rollKind = 'left';
          else if (mx > 0.35) s.rollKind = 'right';
          else s.rollKind = 'front';
        } else {
          const lf = getForward(s.facingYaw);
          s.rollDirX = lf.x;
          s.rollDirZ = lf.z;
          s.rollKind = 'front';
        }
        s.events.push({ type: 'dash', rollKind: s.rollKind, x: s.px, z: s.pz });
      }

      // (C) 水平速度与跳跃
      if (s.pushingBlockId) {
        s.vx = 0;
        s.vz = 0;
      } else if (s.rollTimer > 0) {
        s.vx = s.rollDirX * 11.2;
        s.vz = s.rollDirZ * 11.2;
        s.action = 'roll';
      } else {
        const spd = s.weaponsDrawn ? 5.9 : 6.8;
        const accel = s.onGround ? 15 : 8;
        s.vx += (wishX * spd - s.vx) * Math.min(1, dt * accel);
        s.vz += (wishZ * spd - s.vz) * Math.min(1, dt * accel);
        if (wishLen > 0.12 && !input.fireHeld) {
          const targetYaw = Math.atan2(-wishX, -wishZ);
          s.facingYaw = lerpAngle(s.facingYaw, targetYaw, dt * 13);
        }
      }

      if (s.jumpBufTimer > 0 && s.coyoteTimer > 0 && !s.pushingBlockId) {
        s.vy = TR.JUMP_VY;
        s.onGround = false;
        s.coyoteTimer = 0;
        s.jumpBufTimer = 0;
        s.rollTimer = 0;
        s.events.push({ type: 'jump', x: s.px, y: s.py, z: s.pz });
      }

      // 执行 3D 物理碰撞移动
      if (!s.pushingBlockId) {
        moveAndCollidePlayer(s, dt, solids);
      }

      // 空中自动检测抓崖挂壁！
      if (!s.onGround && !s.pushingBlockId) {
        if (!tryLedgeGrab(s, solids)) {
          s.action = 'jump';
        }
      } else if (!s.pushingBlockId && s.rollTimer <= 0 && s.leverTimer <= 0) {
        s.action = Math.hypot(s.vx, s.vz) > 0.55 ? 'run' : 'idle';
      }

      // (D) 双枪自动锁敌连射 & 重型麦格农爆发
      if (input.heavyPressed && s.heavyCd <= 0 && s.action !== 'push') {
        shootWeapon(s, true);
      } else if (input.fireHeld && s.fireCd <= 0 && s.action !== 'push') {
        shootWeapon(s, false);
      } else if (!input.fireHeld && s.muzzleL <= 0 && s.muzzleR <= 0 && s.fireCd <= 0) {
        if (s.action === 'run' && !s.lockTargetId) s.weaponsDrawn = false;
      }
    }

    // 5) 坠崖检测 -> 存档点重生
    if (s.py < (s.level.fallY || -6.5)) {
      respawnAtCheckpoint(s, 'fall');
    }

    // 6) 存档点激活与道具/圣物/齿轮拾取
    for (const cp of s.checkpoints) {
      if (!cp.reached && Math.hypot(s.px - cp.x, s.pz - cp.z) <= 2.4 && Math.abs(s.py - cp.y) <= 1.5) {
        cp.reached = true;
        s.respawn = { x: cp.x, y: cp.y + 0.05, z: cp.z, yaw: 0 };
        s.events.push({ type: 'checkpoint', x: cp.x, y: cp.y + 1.0, z: cp.z });
      }
    }

    for (const pk of s.pickups) {
      if (pk.collected) continue;
      if (Math.hypot(s.px - pk.x, s.pz - pk.z) <= 1.45 && Math.abs(s.py - pk.y) <= 1.45) {
        pk.collected = true;
        if (pk.kind === 'artifact') {
          s.artifacts++;
          s.score += 500;
          s.events.push({ type: 'secret_chime', name: pk.name, count: s.artifacts, total: s.totalArtifacts, x: pk.x, y: pk.y + 0.8, z: pk.z });
        } else if (pk.kind === 'cog') {
          s.cogs++;
          s.score += 350;
          s.events.push({ type: 'crystal', kind: 'cog', name: pk.name, count: s.cogs, total: s.totalCogs, x: pk.x, y: pk.y + 0.8, z: pk.z });
        } else if (pk.kind === 'medipack') {
          s.medipacks++;
          s.score += 120;
          s.events.push({ type: 'medipack', name: pk.name, x: pk.x, y: pk.y + 0.8, z: pk.z });
        }
      }
    }

    // 7) 陷阱更新：地刺、毒箭、巨石滚落
    for (const sk of s.spikes) {
      const cyc = ((s.time + (sk.phase || 0)) % sk.period) / sk.period;
      if (cyc < 0.34) {
        sk.extended = Math.min(1, cyc / 0.08);
        sk.active = cyc >= 0.04;
      } else {
        sk.extended = Math.max(0, 1 - (cyc - 0.34) / 0.14);
        sk.active = false;
      }
      if (sk.active && Math.abs(s.px - sk.x) <= sk.w * 0.5 && Math.abs(s.pz - sk.z) <= sk.d * 0.5 && s.py <= sk.y + 0.85) {
        damagePlayer(s, 28, 'spikes');
      }
    }

    for (const dtTrap of s.darts) {
      dtTrap.timer -= dt;
      if (dtTrap.timer <= 0) {
        dtTrap.timer = dtTrap.interval;
        s.dartProjectiles.push({
          x: dtTrap.x,
          y: dtTrap.y,
          z: dtTrap.z,
          vx: dtTrap.dx * dtTrap.speed,
          vz: dtTrap.dz * dtTrap.speed,
          traveled: 0,
          range: dtTrap.range || 15,
        });
      }
    }
    for (let i = s.dartProjectiles.length - 1; i >= 0; i--) {
      const dp = s.dartProjectiles[i];
      const stepDist = Math.hypot(dp.vx * dt, dp.vz * dt);
      dp.x += dp.vx * dt;
      dp.z += dp.vz * dt;
      dp.traveled += stepDist;
      if (dp.traveled >= dp.range) {
        s.dartProjectiles.splice(i, 1);
        continue;
      }
      if (Math.hypot(dp.x - s.px, dp.z - s.pz) <= TR.PLAYER_R + 0.25 && dp.y >= s.py && dp.y <= s.py + TR.PLAYER_H) {
        damagePlayer(s, 16, 'dart');
        s.dartProjectiles.splice(i, 1);
      }
    }

    for (const b of s.boulders) {
      if (b.state === 'idle' && s.pz <= b.triggerZ) {
        b.state = 'rolling';
        s.events.push({ type: 'boulder_rumble', x: b.x, y: b.y, z: b.z });
      } else if (b.state === 'rolling') {
        b.x += b.vx * dt;
        b.z += b.vz * dt;
        b.rotX += (b.vz * dt) / b.radius;
        if (Math.hypot(s.px - b.x, s.pz - b.z) <= b.radius + TR.PLAYER_R - 0.1 && Math.abs(s.py - (b.y - b.radius)) < 1.6) {
          damagePlayer(s, 120, 'boulder');
        }
        if (b.z >= b.endZ) {
          b.state = 'stopped';
          s.events.push({ type: 'break', x: b.x, y: b.y, z: b.z });
        }
      }
    }

    // 8) 敌人 AI 更新（秘鲁雪狼 / 古殿巨熊 / 史前霸王龙 T-Rex Boss！）
    for (const e of s.enemies) {
      if (e.hp <= 0) continue;
      e.hitFlash = Math.max(0, e.hitFlash - dt);
      e.attackCd = Math.max(0, e.attackCd - dt);

      const dx = s.px - e.x;
      const dz = s.pz - e.z;
      const dist = Math.hypot(dx, dz) || 0.001;

      if (!e.awoken) {
        if (dist < 22 || s.pz < -11) {
          e.awoken = true;
          e.state = 'chase';
          if (e.isBoss) s.events.push({ type: 'trex_roar', name: e.name, x: e.x, y: e.y + 3, z: e.z });
        } else {
          continue;
        }
      }

      const aggroRange = e.isBoss ? 34 : 14;
      if (dist <= aggroRange) {
        const targetYaw = Math.atan2(dx, dz);
        e.yaw = lerpAngle(e.yaw, targetYaw, dt * (e.isBoss ? 5.5 : 9));

        if (e.state === 'windup') {
          e.stateTimer -= dt;
          if (e.stateTimer <= 0) {
            e.state = 'lunge';
            e.stateTimer = e.isBoss ? 0.45 : 0.28;
            const lSpd = e.isBoss ? 12.2 : 9.4;
            e.vx = (dx / dist) * lSpd;
            e.vz = (dz / dist) * lSpd;
            if (e.isBoss) s.events.push({ type: 'trex_roar', x: e.x, y: e.y + 3, z: e.z });
          }
        } else if (e.state === 'lunge') {
          e.stateTimer -= dt;
          if (dist <= e.radius + TR.PLAYER_R + 0.55 && Math.abs(s.py - e.y) <= (e.isBoss ? 2.4 : 1.2)) {
            damagePlayer(s, e.dmg, e.kind);
            e.state = 'recover';
            e.stateTimer = e.isBoss ? 1.15 : 0.85;
          } else if (e.stateTimer <= 0) {
            e.state = 'recover';
            e.stateTimer = e.isBoss ? 0.95 : 0.7;
          }
        } else if (e.state === 'recover') {
          e.stateTimer -= dt;
          e.vx *= Math.pow(0.08, dt);
          e.vz *= Math.pow(0.08, dt);
          if (e.stateTimer <= 0) e.state = 'chase';
        } else {
          // chase
          const strikeDist = e.isBoss ? 5.6 : 2.8;
          if (dist <= strikeDist && e.attackCd <= 0 && Math.abs(s.py - e.y) <= (e.isBoss ? 2.8 : 1.3)) {
            e.state = 'windup';
            e.stateTimer = e.windupMax;
            e.attackCd = e.isBoss ? 2.2 : 1.65;
            e.vx *= 0.2;
            e.vz *= 0.2;
          } else {
            e.vx += ((dx / dist) * e.speed - e.vx) * Math.min(1, dt * 6);
            e.vz += ((dz / dist) * e.speed - e.vz) * Math.min(1, dt * 6);
          }
        }
      } else {
        e.vx *= Math.pow(0.08, dt);
        e.vz *= Math.pow(0.08, dt);
      }

      // 敌人水平移动与简单石柱/墙体阻挡
      const nx = e.x + e.vx * dt;
      const nz = e.z + e.vz * dt;
      let blockedX = false, blockedZ = false;
      for (const box of solids) {
        if (box.maxY <= e.y + 0.25 || box.minY >= e.y + e.height) continue;
        if (nx + e.radius > box.minX && nx - e.radius < box.maxX && e.z + e.radius > box.minZ && e.z - e.radius < box.maxZ) blockedX = true;
        if (e.x + e.radius > box.minX && e.x - e.radius < box.maxX && nz + e.radius > box.minZ && nz - e.radius < box.maxZ) blockedZ = true;
      }
      if (!blockedX) e.x = nx;
      if (!blockedZ) e.z = nz;
      // 防止掉出主峡谷/房间范围
      if (e.isBoss) {
        e.x = clamp(e.x, -11.5, 11.5);
        e.z = clamp(e.z, -44.5, -6.0);
      }
    }

    // 9) 弹道曳光衰减
    for (let i = s.tracers.length - 1; i >= 0; i--) {
      s.tracers[i].life -= dt;
      if (s.tracers[i].life <= 0) s.tracers.splice(i, 1);
    }

    // 10) 压板/拉杆/齿轮/Boss 门锁判定
    updateGateLocks(s);

    // 11) 终点石门 / 亚特兰蒂斯神骸通关判定
    const goal = s.level.goal;
    if (goal && Math.hypot(s.px - goal.x, s.pz - goal.z) <= (goal.radius || 1.8) && Math.abs(s.py - goal.y) <= 1.8) {
      s.levelWon = true;
      s.rank = computeRank(s);
      s.score += 800 + Math.round(s.hp * 5);
      s.events.push({ type: 'win', levelIdx: s.levelIdx, rank: s.rank, score: s.score });
    }

    return s;
  };
})(typeof window !== 'undefined' ? window : globalThis);
