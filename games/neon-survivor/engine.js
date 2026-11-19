/* Game 2: Neon Survivor 3D — 纯确定性肉鸽生存核心引擎（零 DOM，支持 Node 自动化验收） */
(function (G) {
  'use strict';
  const NS = (G.NS = G.NS || {});

  const DT = 1 / 60;
  const ARENA = 26; // 竞技场半宽：X, Z ∈ [-26, 26]

  const UPGRADES = [
    { id: 'multishot', icon: '🔫', name: '脉冲散射', desc: '并发弹道 +1，射速 +12%', max: 5 },
    { id: 'blades',    icon: '🌀', name: '轨道光刃', desc: '新增 1 把环绕切割等离子刃', max: 5 },
    { id: 'lightning', icon: '⚡', name: '连锁闪电', desc: '自动释放连锁雷击（弹跳 +2 目标）', max: 5 },
    { id: 'damage',    icon: '🔥', name: '暴击超载', desc: '全部伤害 +32%，暴击率 +14%', max: 6 },
    { id: 'haste',     icon: '💨', name: '闪避引擎', desc: '移速 +12%，冲刺/脉冲冷却 -20%', max: 4 },
    { id: 'magnet',    icon: '🧲', name: '超导磁铁', desc: '经验吸附范围 +45%，脉冲范围 +20%', max: 4 },
    { id: 'heal',      icon: '❤️', name: '纳米修复', desc: '最大生命 +25，立即回复 50% 生命', max: 99 },
  ];

  function makeRng(seed = 1337) {
    let s = seed >>> 0 || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }

  function newState(seed = 1337) {
    return {
      rngSeed: seed,
      rng: makeRng(seed),
      time: 0,
      wave: 1,
      score: 0,
      kills: 0,
      dead: false,
      // 主角状态
      px: 0, pz: 0,
      vx: 0, vz: 0,
      facingX: 1, facingZ: 0,
      hp: 100, maxHp: 100,
      invuln: 0,
      // 技能状态
      dashTimer: 0, dashCd: 0, dashDx: 1, dashDz: 0, dashPrev: false,
      novaCd: 0, novaPrev: false,
      fireCd: 0,
      lightningCd: 1.5,
      bladeAngle: 0,
      // 成长与肉鸽升级
      level: 1, xp: 0, xpNext: 12,
      xpStreak: 0, xpStreakTimer: 0,
      upgrades: { multishot: 0, blades: 1, lightning: 0, damage: 0, haste: 0, magnet: 0, heal: 0 },
      pendingChoices: null, // 升级三选一卡片
      // 刷怪与 Boss
      spawnCd: 0.4,
      nextBossTime: 35,
      // 实体集合
      enemies: [],
      bullets: [],
      eBullets: [],
      gems: [],
      bolts: [], // 闪电可视化线段 { x1, z1, x2, z2, life }
      novas: [], // 脉冲波环 { x, z, r, maxR, life }
      events: [],
    };
  }

  function heroStats(s) {
    const u = s.upgrades;
    const hasteMult = Math.pow(0.82, u.haste);
    return {
      speed: 8.6 * (1 + u.haste * 0.12 + u.magnet * 0.04),
      shots: 1 + u.multishot,
      fireRate: 0.30 * Math.pow(0.89, u.multishot),
      dmgMult: 1 + u.damage * 0.32,
      critChance: 0.10 + u.damage * 0.14,
      blades: u.blades,
      bladeRadius: 2.55 + Math.min(1.0, u.blades * 0.12),
      lightningTargets: u.lightning > 0 ? 1 + u.lightning * 2 : 0,
      dashCdMax: Math.max(0.55, 1.55 * hasteMult),
      novaCdMax: Math.max(2.6, 6.2 * hasteMult),
      novaRadius: 7.5 * (1 + u.magnet * 0.2),
      magnetRadius: 4.8 * (1 + u.magnet * 0.45),
    };
  }

  function rollChoices(s) {
    const pool = UPGRADES.filter((u) => (s.upgrades[u.id] || 0) < u.max);
    const out = [];
    const copy = pool.slice();
    while (out.length < 3 && copy.length) {
      const idx = Math.floor(s.rng() * copy.length);
      out.push(copy.splice(idx, 1)[0]);
    }
    return out;
  }

  function applyUpgrade(s, upgradeId) {
    if (!s.pendingChoices) return false;
    const valid = s.pendingChoices.find((c) => c.id === upgradeId);
    if (!valid) return false;
    s.upgrades[upgradeId] = (s.upgrades[upgradeId] || 0) + 1;
    if (upgradeId === 'heal') {
      s.maxHp += 25;
      s.hp = Math.min(s.maxHp, s.hp + Math.round(s.maxHp * 0.5));
    }
    s.pendingChoices = null;
    s.invuln = Math.max(s.invuln, 0.45);
    return true;
  }

  function spawnEnemy(s, kind) {
    const ang = s.rng() * Math.PI * 2;
    const dist = 19 + s.rng() * 6;
    const x = Math.max(-ARENA + 1, Math.min(ARENA - 1, s.px + Math.cos(ang) * dist));
    const z = Math.max(-ARENA + 1, Math.min(ARENA - 1, s.pz + Math.sin(ang) * dist));
    const scale = 1 + (s.wave - 1) * 0.22;
    if (kind === 'boss') {
      s.enemies.push({
        kind: 'boss', x, z, vx: 0, vz: 0, r: 1.55,
        hp: Math.round(280 * scale), maxHp: Math.round(280 * scale),
        speed: 3.1 + Math.min(1.5, s.wave * 0.12),
        shootCd: 1.4, hitFlash: 0, xp: 24, score: 500, dmg: 22,
      });
      s.events.push({ type: 'boss', x, z });
      return;
    }
    if (kind === 'charger') {
      s.enemies.push({
        kind: 'charger', x, z, vx: 0, vz: 0, r: 0.72,
        hp: Math.round(52 * scale), maxHp: Math.round(52 * scale),
        speed: 4.5 + Math.min(2.2, s.wave * 0.18),
        hitFlash: 0, xp: 5, score: 45, dmg: 16,
      });
    } else if (kind === 'shooter') {
      s.enemies.push({
        kind: 'shooter', x, z, vx: 0, vz: 0, r: 0.62,
        hp: Math.round(30 * scale), maxHp: Math.round(30 * scale),
        speed: 3.2 + Math.min(1.5, s.wave * 0.12),
        shootCd: 1.6 + s.rng() * 1.2, hitFlash: 0, xp: 4, score: 35, dmg: 12,
      });
    } else {
      s.enemies.push({
        kind: 'swarmer', x, z, vx: 0, vz: 0, r: 0.52,
        hp: Math.round(20 * scale), maxHp: Math.round(20 * scale),
        speed: 4.9 + Math.min(2.6, s.wave * 0.22),
        hitFlash: 0, xp: 2, score: 15, dmg: 10,
      });
    }
  }

  function damageEnemy(s, e, rawDmg, kx = 0, kz = 0) {
    const st = heroStats(s);
    const crit = s.rng() < st.critChance;
    const dmg = Math.round(rawDmg * st.dmgMult * (crit ? 1.85 : 1));
    e.hp -= dmg;
    e.hitFlash = 0.12;
    const kScale = e.kind === 'boss' ? 0.15 : 1;
    e.vx += kx * kScale;
    e.vz += kz * kScale;
    if (e.hp <= 0) {
      s.kills++;
      s.score += e.score;
      const dropCount = e.kind === 'boss' ? 8 : (e.kind === 'charger' ? 2 : 1);
      for (let i = 0; i < dropCount; i++) {
        const a = s.rng() * Math.PI * 2;
        const d = dropCount > 1 ? 0.8 + s.rng() * 1.4 : 0;
        s.gems.push({
          x: e.x + Math.cos(a) * d,
          z: e.z + Math.sin(a) * d,
          val: Math.max(1, Math.round(e.xp / dropCount)),
          big: e.kind === 'boss' || e.kind === 'charger',
        });
      }
      s.events.push({ type: 'kill', kind: e.kind, x: e.x, z: e.z, crit });
    } else {
      s.events.push({ type: 'hit', x: e.x, z: e.z, crit });
    }
  }

  function hurtHero(s, dmg) {
    if (s.invuln > 0 || s.dashTimer > 0 || s.dead) return;
    s.hp = Math.max(0, s.hp - dmg);
    s.invuln = 0.65;
    s.events.push({ type: 'hurt', x: s.px, z: s.pz, dmg });
    if (s.hp <= 0) {
      s.dead = true;
      s.events.push({ type: 'die', x: s.px, z: s.pz });
    }
  }

  // input: { ax, ay, a (dash), b (nova) }
  function step(s, input) {
    s.events.length = 0;
    if (s.dead || s.pendingChoices) return s;

    const st = heroStats(s);
    s.time += DT;
    s.wave = 1 + Math.floor(s.time / 18);

    if (s.invuln > 0) s.invuln = Math.max(0, s.invuln - DT);
    if (s.dashCd > 0) s.dashCd = Math.max(0, s.dashCd - DT);
    if (s.novaCd > 0) s.novaCd = Math.max(0, s.novaCd - DT);
    if (s.xpStreakTimer > 0) {
      s.xpStreakTimer -= DT;
      if (s.xpStreakTimer <= 0) s.xpStreak = 0;
    }

    // 输入向量
    let ix = input.ax || 0;
    let iz = input.ay || 0;
    const ilen = Math.hypot(ix, iz);
    if (ilen > 1) { ix /= ilen; iz /= ilen; }
    if (ilen > 0.12) { s.facingX = ix / Math.max(0.001, ilen); s.facingZ = iz / Math.max(0.001, ilen); }

    const dashIn = !!(input.a || input.dash);
    const dashPressed = dashIn && !s.dashPrev;
    s.dashPrev = dashIn;

    const novaIn = !!(input.b || input.nova);
    const novaPressed = novaIn && !s.novaPrev;
    s.novaPrev = novaIn;

    // 无敌闪避冲刺
    if (dashPressed && s.dashCd <= 0 && s.dashTimer <= 0) {
      s.dashTimer = 0.16;
      s.dashCd = st.dashCdMax;
      s.dashDx = ilen > 0.12 ? ix / ilen : s.facingX;
      s.dashDz = ilen > 0.12 ? iz / ilen : s.facingZ;
      s.events.push({ type: 'dash', x: s.px, z: s.pz });
    }

    // EMP 脉冲冲击波
    if (novaPressed && s.novaCd <= 0) {
      s.novaCd = st.novaCdMax;
      s.novas.push({ x: s.px, z: s.pz, r: 0.6, maxR: st.novaRadius, life: 0.36, max: 0.36 });
      // 清除范围内敌方弹幕并击退重创敌人
      s.eBullets = s.eBullets.filter((b) => Math.hypot(b.x - s.px, b.z - s.pz) > st.novaRadius);
      for (const e of s.enemies) {
        const dx = e.x - s.px, dz = e.z - s.pz;
        const d = Math.hypot(dx, dz);
        if (d <= st.novaRadius + e.r) {
          const nx = d > 0.01 ? dx / d : 1, nz = d > 0.01 ? dz / d : 0;
          damageEnemy(s, e, 48, nx * 16, nz * 16);
        }
      }
      s.events.push({ type: 'shockwave', x: s.px, z: s.pz, r: st.novaRadius });
    }

    // 主角位移
    if (s.dashTimer > 0) {
      s.dashTimer = Math.max(0, s.dashTimer - DT);
      s.vx = s.dashDx * 25;
      s.vz = s.dashDz * 25;
    } else {
      const tx = ix * st.speed, tz = iz * st.speed;
      s.vx += (tx - s.vx) * 0.28;
      s.vz += (tz - s.vz) * 0.28;
    }
    s.px = Math.max(-ARENA + 0.6, Math.min(ARENA - 0.6, s.px + s.vx * DT));
    s.pz = Math.max(-ARENA + 0.6, Math.min(ARENA - 0.6, s.pz + s.vz * DT));

    // 自动瞄准主武器发射
    s.fireCd -= DT;
    if (s.fireCd <= 0 && s.enemies.length > 0) {
      let nearest = null, minD = 22;
      for (const e of s.enemies) {
        if (e.hp <= 0) continue;
        const d = Math.hypot(e.x - s.px, e.z - s.pz);
        if (d < minD) { minD = d; nearest = e; }
      }
      if (nearest) {
        s.fireCd = st.fireRate;
        const baseAng = Math.atan2(nearest.z - s.pz, nearest.x - s.px);
        const count = st.shots;
        const spread = Math.min(0.16, 0.5 / Math.max(1, count));
        for (let i = 0; i < count; i++) {
          const ang = baseAng + (i - (count - 1) / 2) * spread;
          s.bullets.push({
            x: s.px + Math.cos(ang) * 0.7,
            z: s.pz + Math.sin(ang) * 0.7,
            vx: Math.cos(ang) * 24,
            vz: Math.sin(ang) * 24,
            life: 1.05,
            dmg: 18,
          });
        }
        s.events.push({ type: 'shoot', x: s.px, z: s.pz });
      }
    }

    // 轨道光刃旋转与切割
    s.bladeAngle += DT * (3.6 + st.blades * 0.28);
    if (st.blades > 0 && s.enemies.length > 0) {
      for (let b = 0; b < st.blades; b++) {
        const ang = s.bladeAngle + (b * Math.PI * 2) / st.blades;
        const bx = s.px + Math.cos(ang) * st.bladeRadius;
        const bz = s.pz + Math.sin(ang) * st.bladeRadius;
        for (const e of s.enemies) {
          if (e.hp <= 0 || (e.bladeCd && e.bladeCd > 0)) continue;
          const d = Math.hypot(e.x - bx, e.z - bz);
          if (d < e.r + 0.55) {
            e.bladeCd = 0.28;
            const nx = (e.x - s.px) / Math.max(0.1, Math.hypot(e.x - s.px, e.z - s.pz));
            const nz = (e.z - s.pz) / Math.max(0.1, Math.hypot(e.x - s.px, e.z - s.pz));
            damageEnemy(s, e, 24, nx * 8, nz * 8);
          }
        }
      }
    }

    // 连锁闪电自动释放
    if (st.lightningTargets > 0) {
      s.lightningCd -= DT;
      if (s.lightningCd <= 0 && s.enemies.length > 0) {
        s.lightningCd = Math.max(0.8, 1.85 - s.upgrades.lightning * 0.16);
        const hitSet = new Set();
        let curX = s.px, curZ = s.pz;
        let struck = 0;
        for (let k = 0; k < st.lightningTargets; k++) {
          let best = null, bestD = 12;
          for (const e of s.enemies) {
            if (e.hp <= 0 || hitSet.has(e)) continue;
            const d = Math.hypot(e.x - curX, e.z - curZ);
            if (d < bestD) { bestD = d; best = e; }
          }
          if (!best) break;
          hitSet.add(best);
          s.bolts.push({ x1: curX, z1: curZ, x2: best.x, z2: best.z, life: 0.18 });
          damageEnemy(s, best, 32, 0, 0);
          curX = best.x; curZ = best.z;
          struck++;
        }
        if (struck > 0) s.events.push({ type: 'lightning', x: s.px, z: s.pz });
      }
    }

    // 更新玩家弹幕
    for (const b of s.bullets) {
      b.x += b.vx * DT;
      b.z += b.vz * DT;
      b.life -= DT;
      if (Math.abs(b.x) > ARENA || Math.abs(b.z) > ARENA) { b.life = 0; continue; }
      for (const e of s.enemies) {
        if (e.hp <= 0) continue;
        if (Math.hypot(e.x - b.x, e.z - b.z) < e.r + 0.35) {
          damageEnemy(s, e, b.dmg, b.vx * 0.18, b.vz * 0.18);
          b.life = 0;
          break;
        }
      }
    }
    s.bullets = s.bullets.filter((b) => b.life > 0);

    // 更新敌方弹幕
    for (const eb of s.eBullets) {
      eb.x += eb.vx * DT;
      eb.z += eb.vz * DT;
      eb.life -= DT;
      if (Math.abs(eb.x) > ARENA || Math.abs(eb.z) > ARENA) { eb.life = 0; continue; }
      if (Math.hypot(eb.x - s.px, eb.z - s.pz) < 0.72) {
        hurtHero(s, eb.dmg);
        eb.life = 0;
      }
    }
    s.eBullets = s.eBullets.filter((b) => b.life > 0);

    // 刷怪波次节奏
    s.spawnCd -= DT;
    if (s.spawnCd <= 0 && s.enemies.length < 95) {
      const interval = Math.max(0.24, 1.05 - s.wave * 0.09);
      s.spawnCd = interval;
      const batch = 1 + Math.min(3, Math.floor(s.wave / 2));
      for (let i = 0; i < batch; i++) {
        const r = s.rng();
        const kind = (s.wave >= 2 && r < 0.22) ? 'charger' : ((s.wave >= 2 && r < 0.42) ? 'shooter' : 'swarmer');
        spawnEnemy(s, kind);
      }
    }
    if (s.time >= s.nextBossTime) {
      s.nextBossTime += 38;
      spawnEnemy(s, 'boss');
    }

    // 更新敌人 AI 与分离推力
    for (let i = 0; i < s.enemies.length; i++) {
      const e = s.enemies[i];
      if (e.hp <= 0) continue;
      if (e.hitFlash > 0) e.hitFlash = Math.max(0, e.hitFlash - DT);
      if (e.bladeCd > 0) e.bladeCd = Math.max(0, e.bladeCd - DT);
      const dx = s.px - e.x, dz = s.pz - e.z;
      const dist = Math.max(0.01, Math.hypot(dx, dz));
      const nx = dx / dist, nz = dz / dist;

      let targetSpeed = e.speed;
      if (e.kind === 'shooter' && dist < 8.5) targetSpeed = -e.speed * 0.4;
      e.vx += (nx * targetSpeed - e.vx) * 0.14;
      e.vz += (nz * targetSpeed - e.vz) * 0.14;

      // 敌方远程射击 / Boss 螺旋弹幕
      if (e.kind === 'shooter' || e.kind === 'boss') {
        e.shootCd -= DT;
        if (e.shootCd <= 0) {
          if (e.kind === 'boss') {
            e.shootCd = 1.65;
            const nShots = 10;
            const rot = s.time * 1.4;
            for (let k = 0; k < nShots; k++) {
              const a = rot + (k * Math.PI * 2) / nShots;
              s.eBullets.push({ x: e.x, z: e.z, vx: Math.cos(a) * 9.5, vz: Math.sin(a) * 9.5, life: 3.2, dmg: 14 });
            }
          } else {
            e.shootCd = 2.4;
            s.eBullets.push({ x: e.x, z: e.z, vx: nx * 10.5, vz: nz * 10.5, life: 2.6, dmg: 11 });
          }
        }
      }

      e.x = Math.max(-ARENA + e.r, Math.min(ARENA - e.r, e.x + e.vx * DT));
      e.z = Math.max(-ARENA + e.r, Math.min(ARENA - e.r, e.z + e.vz * DT));

      if (dist < e.r + 0.56) hurtHero(s, e.dmg);
    }
    s.enemies = s.enemies.filter((e) => e.hp > 0);

    // 经验宝石磁吸与升级
    for (let i = s.gems.length - 1; i >= 0; i--) {
      const gm = s.gems[i];
      const dx = s.px - gm.x, dz = s.pz - gm.z;
      const dist = Math.hypot(dx, dz);
      if (dist < st.magnetRadius) {
        const pull = 16 + (1 - dist / st.magnetRadius) * 18;
        gm.x += (dx / Math.max(0.05, dist)) * pull * DT;
        gm.z += (dz / Math.max(0.05, dist)) * pull * DT;
      }
      if (dist < 0.9) {
        s.xp += gm.val;
        s.score += gm.val * 5;
        s.xpStreak = Math.min(10, s.xpStreak + 1);
        s.xpStreakTimer = 0.7;
        s.events.push({ type: 'xp', x: gm.x, z: gm.z, streak: s.xpStreak });
        s.gems.splice(i, 1);
        if (s.xp >= s.xpNext && !s.pendingChoices) {
          s.xp -= s.xpNext;
          s.level++;
          s.xpNext = Math.round(12 + s.level * 9 + s.level * s.level * 1.4);
          s.pendingChoices = rollChoices(s);
          s.events.push({ type: 'levelup', x: s.px, z: s.pz, level: s.level });
        }
      }
    }

    // 闪电与冲击波生命周期
    for (const b of s.bolts) b.life -= DT;
    s.bolts = s.bolts.filter((b) => b.life > 0);
    for (const nv of s.novas) {
      nv.life -= DT;
      const p = 1 - Math.max(0, nv.life / nv.max);
      nv.r = 0.6 + (nv.maxR - 0.6) * (1 - Math.pow(1 - p, 2.5));
    }
    s.novas = s.novas.filter((nv) => nv.life > 0);

    return s;
  }

  Object.assign(NS, { DT, ARENA, UPGRADES, newState, heroStats, applyUpgrade, step });
})(typeof window !== 'undefined' ? window : globalThis);
