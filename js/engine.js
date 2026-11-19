/* PixelForge — 确定性物理引擎（Celeste + Mario Maker 级手感，纯逻辑无 DOM，可在 Node 与浏览器运行） */
(function (G) {
  'use strict';
  const PF = G.PF;
  const T = PF.TILE;
  const DT = 1 / 60;

  // 单位：像素、秒
  const PHYS = {
    gravity: 1500,
    apexGravityScale: 0.58, // 跳跃顶点滞空减重
    apexThreshold: 42,
    maxFall: 520,
    run: 145,
    maxSpeed: 280,          // 允许冲刺/超级跳超越常规跑速并平滑衰减
    accelGround: 1550,
    accelAir: 980,
    iceAccelScale: 0.34,    // 冰面起步加速倍率
    iceFrictionScale: 0.09, // 冰面超低摩擦滑行倍率
    turnBoost: 1.65,
    frictionGround: 1850,
    frictionAir: 300,
    jump: 430,              // 长按最高约 3.7 格
    minJump: 170,           // 松开跳跃键截断速度
    coyote: 0.1,            // 土狼时间
    buffer: 0.12,           // 跳跃缓冲
    wallSlide: 75,          // 蹬墙慢滑速度
    wallJumpX: 180,
    wallJumpY: 420,
    wallCoyote: 0.09,
    wallLock: 0.11,
    cornerPx: 5,            // 顶角自动平滑修正像素
    dashSpeed: 340,         // 八向空中冲刺速度
    dashTime: 0.14,         // 冲刺持续时间
    dashCooldown: 0.16,
    dashEndKeep: 0.62,      // 冲刺结束保留动量比例
    wavedashVx: 245,        // 冲刺跳（Wavedash）水平爆发速度
    spring: 640,
    stomp: 335,
    enemySpeed: 42,
    platformSpeed: 44,
    crystalRespawn: 2.5,
    crumbleShake: 0.45,
    crumbleRespawn: 2.8,
    pw: 12,
    ph: 14,
  };

  function isSolid(ch, switchOn = true) {
    return ch === '#' || ch === 'B' || ch === 'I' || ch === 'T' || ch === 'K' ||
      (ch === 'R' && switchOn) || (ch === 'U' && !switchOn);
  }

  const overlap = (ax, ay, aw, ah, bx, by, bw, bh) =>
    ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

  function newState(level, start, opts = {}) {
    const p = start || opts.checkpoint || PF.find(level, 'P') || { x: 1, y: level.h - 3 };
    const s = {
      px: p.x * T + (T - PHYS.pw) / 2,
      py: p.y * T + (T - PHYS.ph),
      vx: 0, vy: 0,
      onGround: false, onIce: false,
      coyote: 0, buffer: 0,
      jumpPrev: false, canCut: false, facing: 1,
      // 冲刺系统
      dashes: 1, dashMax: 1, dashTimer: 0, dashCooldown: 0,
      dashDirX: 0, dashDirY: 0, dashPrev: false,
      // 蹬墙系统
      wallDir: 0, wallCoyote: 0, wallCoyoteDir: 0, wallLock: 0,
      // 平台下落
      dropTimer: 0,
      // 红蓝开关
      switchOn: true, switchCooldown: 0,
      // 存档与连击
      checkpoint: opts.checkpoint ? { x: opts.checkpoint.x, y: opts.checkpoint.y } : null,
      combo: 0, coinStreak: 0, coinStreakTimer: 0,
      dead: false, won: false,
      time: 0, coins: 0, totalCoins: 0,
      mods: {}, enemies: [], crystals: [], crumbles: [], crumbleMap: null, platforms: [], events: [],
    };
    for (let i = 0; i < level.tiles.length; i++) {
      const ch = level.tiles[i];
      if (ch === 'o') {
        s.totalCoins++;
      } else if (ch === 'E') {
        const x = i % level.w, y = (i / level.w) | 0;
        s.enemies.push({ x: x * T + 1, y: y * T + 2, w: 14, h: 14, vx: -PHYS.enemySpeed, vy: 0, onGround: false, alive: true });
      } else if (ch === 'C') {
        const x = i % level.w, y = (i / level.w) | 0;
        s.crystals.push({ i, x: x * T, y: y * T, tx: x, ty: y, timer: 0 });
      } else if (ch === 'K') {
        const x = i % level.w, y = (i / level.w) | 0;
        if (!s.crumbleMap) s.crumbleMap = {};
        const idx = s.crumbles.length;
        s.crumbles.push({ i, tx: x, ty: y, state: 0, timer: 0 }); // 0=solid, 1=shaking, 2=gone
        s.crumbleMap[i] = idx;
      } else if (ch === 'M') {
        const x = i % level.w, y = (i / level.w) | 0;
        s.platforms.push({
          i, x: x * T, y: y * T + 2, w: T * 2, h: 6,
          vx: PHYS.platformSpeed, dx: 0,
          minX: Math.max(0, (x - 3) * T),
          maxX: Math.min(level.w * T, (x + 5) * T),
        });
      }
    }
    return s;
  }

  function cloneState(s) {
    const c = Object.assign({}, s);
    c.mods = Object.assign({}, s.mods);
    c.enemies = s.enemies.length ? s.enemies.map((e) => Object.assign({}, e)) : [];
    c.crystals = s.crystals.length ? s.crystals.map((cr) => Object.assign({}, cr)) : [];
    c.crumbles = s.crumbles.length ? s.crumbles.map((kb) => Object.assign({}, kb)) : [];
    c.crumbleMap = s.crumbleMap; // 只读索引映射，无需深拷贝
    c.platforms = s.platforms.length ? s.platforms.map((pl) => Object.assign({}, pl)) : [];
    c.checkpoint = s.checkpoint ? { x: s.checkpoint.x, y: s.checkpoint.y } : null;
    c.events = [];
    return c;
  }

  function tileAt(level, s, tx, ty) {
    if (tx < 0 || tx >= level.w) return '#'; // 左右边界是墙
    if (ty < 0 || ty >= level.h) return '.';
    const i = ty * level.w + tx;
    const m = s.mods[i];
    const ch = m !== undefined ? m : level.tiles[i];
    if (ch === 'K' && s.crumbleMap) {
      const kb = s.crumbles[s.crumbleMap[i]];
      if (kb && kb.state === 2) return '.';
    }
    return (ch === 'E' || ch === 'P' || ch === 'M') ? '.' : ch;
  }

  function die(s) {
    if (!s.dead && !s.won) {
      s.dead = true;
      s.dashTimer = 0;
      s.events.push({ type: 'die', x: s.px + PHYS.pw / 2, y: s.py + PHYS.ph / 2 });
    }
  }

  function triggerSwitch(s, tx, ty) {
    if (s.switchCooldown > 0) return;
    s.switchOn = !s.switchOn;
    s.switchCooldown = 0.22;
    s.events.push({ type: 'switch', on: s.switchOn, x: tx * T + T / 2, y: ty * T + T / 2 });
  }

  function triggerCrumble(s, tx, ty, level) {
    if (!s.crumbleMap) return;
    const idx = s.crumbleMap[ty * level.w + tx];
    if (idx === undefined) return;
    const kb = s.crumbles[idx];
    if (kb && kb.state === 0) {
      kb.state = 1;
      kb.timer = PHYS.crumbleShake;
      s.events.push({ type: 'crumbleStart', x: tx * T + T / 2, y: ty * T + T / 2 });
    }
  }

  function breakBrick(level, s, tx, ty) {
    s.mods[ty * level.w + tx] = '.';
    s.events.push({ type: 'break', x: tx * T + T / 2, y: ty * T + T / 2 });
  }

  function overlapsSolid(level, s, px, py) {
    const l = Math.floor(px / T), r = Math.floor((px + PHYS.pw - 0.001) / T);
    const t = Math.floor(py / T), b = Math.floor((py + PHYS.ph - 0.001) / T);
    for (let ty = t; ty <= b; ty++) {
      for (let tx = l; tx <= r; tx++) {
        if (isSolid(tileAt(level, s, tx, ty), s.switchOn)) return true;
      }
    }
    return false;
  }

  function moveX(level, s, dxOverride) {
    const dx = dxOverride !== undefined ? dxOverride : s.vx * DT;
    if (dx === 0) return;
    s.px += dx;
    const top = Math.floor(s.py / T);
    const bot = Math.floor((s.py + PHYS.ph - 0.001) / T);
    const dashing = s.dashTimer > 0;
    if (dx > 0) {
      const tx = Math.floor((s.px + PHYS.pw - 0.001) / T);
      for (let ty = top; ty <= bot; ty++) {
        const ch = tileAt(level, s, tx, ty);
        if (isSolid(ch, s.switchOn)) {
          if (dashing && ch === 'B') { breakBrick(level, s, tx, ty); continue; }
          if (dashing && ch === 'T') triggerSwitch(s, tx, ty);
          s.px = tx * T - PHYS.pw;
          if (dxOverride === undefined) s.vx = 0;
          break;
        }
      }
    } else if (dx < 0) {
      const tx = Math.floor(s.px / T);
      for (let ty = top; ty <= bot; ty++) {
        const ch = tileAt(level, s, tx, ty);
        if (isSolid(ch, s.switchOn)) {
          if (dashing && ch === 'B') { breakBrick(level, s, tx, ty); continue; }
          if (dashing && ch === 'T') triggerSwitch(s, tx, ty);
          s.px = (tx + 1) * T;
          if (dxOverride === undefined) s.vx = 0;
          break;
        }
      }
    }
  }

  function moveY(level, s) {
    const prevBottom = s.py + PHYS.ph;
    s.py += s.vy * DT;
    s.onGround = false;
    s.onIce = false;
    const l = Math.floor(s.px / T);
    const r = Math.floor((s.px + PHYS.pw - 0.001) / T);
    if (s.vy >= 0) {
      const bottom = s.py + PHYS.ph;
      const ty0 = Math.floor((prevBottom - 0.001) / T);
      const ty1 = Math.floor((bottom - 0.001) / T);
      let landTop = null;
      let springTop = null;
      let landedIce = false;
      let crumbleHits = null;

      for (let ty = ty0; ty <= ty1; ty++) {
        for (let tx = l; tx <= r; tx++) {
          const ch = tileAt(level, s, tx, ty);
          const top = ty * T;
          const solidHit = isSolid(ch, s.switchOn) && prevBottom <= top + 0.5;
          const oneWayHit = ch === '-' && s.dropTimer <= 0 && prevBottom <= top + 0.5;
          if ((solidHit || oneWayHit) && bottom >= top) {
            if (landTop === null || top < landTop) landTop = top;
            if (ch === 'I') landedIce = true;
            if (ch === 'K') (crumbleHits = crumbleHits || []).push([tx, ty]);
          } else if (ch === 'S') {
            const st = top + 8;
            if (prevBottom <= st + 0.5 && bottom >= st) springTop = st;
          }
        }
        if (landTop !== null || springTop !== null) break;
      }

      // 移动平台落地检测
      if (s.dropTimer <= 0 && s.platforms.length) {
        for (const pl of s.platforms) {
          if (s.px + PHYS.pw > pl.x && s.px < pl.x + pl.w && prevBottom <= pl.y + 1.5 && bottom >= pl.y) {
            if (landTop === null || pl.y < landTop) { landTop = pl.y; landedIce = false; }
          }
        }
      }

      if (landTop !== null) {
        s.py = landTop - PHYS.ph;
        s.vy = 0;
        s.onGround = true;
        s.onIce = landedIce;
        s.combo = 0;
        if (s.dashTimer <= 0) s.dashes = s.dashMax;
        if (crumbleHits) for (const [cx, cy] of crumbleHits) triggerCrumble(s, cx, cy, level);
        return;
      }
      if (springTop !== null) {
        s.py = springTop - PHYS.ph;
        s.vy = -PHYS.spring;
        s.canCut = false;
        s.dashTimer = 0;
        s.dashes = s.dashMax; // 弹簧重置空中冲刺
        s.events.push({ type: 'spring', x: s.px + PHYS.pw / 2, y: springTop });
        return;
      }
    } else if (s.vy < 0) {
      const ty = Math.floor(s.py / T);
      const hitTiles = [];
      for (let tx = l; tx <= r; tx++) {
        const ch = tileAt(level, s, tx, ty);
        if (isSolid(ch, s.switchOn)) hitTiles.push({ tx, ch });
      }
      if (hitTiles.length) {
        // Celeste 级顶角自动平滑修正（Corner Correction）
        if (hitTiles.length === 1 && l !== r) {
          const only = hitTiles[0];
          const maxNudge = (only.ch === 'B' || only.ch === 'T') ? 2.5 : PHYS.cornerPx;
          if (only.tx === l) {
            const needed = (l + 1) * T - s.px;
            if (needed > 0 && needed <= maxNudge && !overlapsSolid(level, s, (l + 1) * T, s.py)) {
              s.px = (l + 1) * T;
              return;
            }
          } else if (only.tx === r) {
            const needed = (s.px + PHYS.pw) - r * T;
            if (needed > 0 && needed <= maxNudge && !overlapsSolid(level, s, r * T - PHYS.pw, s.py)) {
              s.px = r * T - PHYS.pw;
              return;
            }
          }
        }
        for (const ht of hitTiles) {
          if (ht.ch === 'B') breakBrick(level, s, ht.tx, ty);
          else if (ht.ch === 'T') triggerSwitch(s, ht.tx, ty);
        }
        s.py = (ty + 1) * T;
        s.vy = 0;
        s.canCut = false;
      }
    }
  }

  function detectWall(level, s) {
    if (s.onGround) return 0;
    const top = Math.floor((s.py + 2) / T);
    const bot = Math.floor((s.py + PHYS.ph - 2) / T);
    const rx = Math.floor((s.px + PHYS.pw + 1) / T);
    for (let ty = top; ty <= bot; ty++) {
      if (isSolid(tileAt(level, s, rx, ty), s.switchOn)) return 1;
    }
    const lx = Math.floor((s.px - 1) / T);
    for (let ty = top; ty <= bot; ty++) {
      if (isSolid(tileAt(level, s, lx, ty), s.switchOn)) return -1;
    }
    return 0;
  }

  function updateWorldGizmos(level, s) {
    if (s.switchCooldown > 0) s.switchCooldown = Math.max(0, s.switchCooldown - DT);
    if (s.coinStreakTimer > 0) {
      s.coinStreakTimer -= DT;
      if (s.coinStreakTimer <= 0) s.coinStreak = 0;
    }
    // 充能水晶重生计时
    for (const cr of s.crystals) {
      if (cr.timer > 0) cr.timer = Math.max(0, cr.timer - DT);
    }
    // 碎裂浮板状态机
    for (const kb of s.crumbles) {
      if (kb.state === 1) {
        kb.timer -= DT;
        if (kb.timer <= 0) {
          kb.state = 2;
          kb.timer = PHYS.crumbleRespawn;
          s.events.push({ type: 'crumbleBreak', x: kb.tx * T + T / 2, y: kb.ty * T + T / 2 });
        }
      } else if (kb.state === 2) {
        kb.timer -= DT;
        if (kb.timer <= 0) {
          // 避免正好在玩家身体里重生卡死
          if (!overlap(s.px, s.py, PHYS.pw, PHYS.ph, kb.tx * T, kb.ty * T, T, T)) {
            kb.state = 0;
            s.events.push({ type: 'crumbleReform', x: kb.tx * T + T / 2, y: kb.ty * T + T / 2 });
          }
        }
      }
    }
    // 移动平台更新与承载玩家
    for (const pl of s.platforms) {
      const prevX = pl.x;
      let nx = pl.x + pl.vx * DT;
      const frontX = pl.vx > 0 ? nx + pl.w : nx;
      const ftx = Math.floor(frontX / T);
      const fty = Math.floor((pl.y + pl.h / 2) / T);
      if (nx < pl.minX || nx + pl.w > pl.maxX || isSolid(tileAt(level, s, ftx, fty), s.switchOn)) {
        pl.vx = -pl.vx;
        nx = Math.max(pl.minX, Math.min(pl.maxX - pl.w, pl.x + pl.vx * DT));
      }
      pl.x = nx;
      pl.dx = pl.x - prevX;
      // 玩家正站在该平台上时同步携带
      if (s.onGround && Math.abs((s.py + PHYS.ph) - pl.y) <= 1.5 &&
          s.px + PHYS.pw > prevX && s.px < prevX + pl.w) {
        moveX(level, s, pl.dx);
      }
    }
  }

  function updateEnemy(level, s, e) {
    e.vy = Math.min(e.vy + PHYS.gravity * DT, PHYS.maxFall);
    const nx = e.x + e.vx * DT;
    const front = e.vx > 0 ? nx + e.w - 0.001 : nx;
    const tx = Math.floor(front / T);
    const ty = Math.floor((e.y + e.h - 1) / T);
    const ahead = tileAt(level, s, tx, ty);
    const below = tileAt(level, s, tx, ty + 1);
    const wall = isSolid(ahead, s.switchOn) || ahead === '^' || ahead === 'S';
    const ledge = e.onGround && !(isSolid(below, s.switchOn) || below === '-');
    if (wall || ledge) e.vx = -e.vx;
    else e.x = nx;

    const prevBottom = e.y + e.h;
    e.y += e.vy * DT;
    e.onGround = false;
    const bottom = e.y + e.h;
    const by = Math.floor((bottom - 0.001) / T);
    const l = Math.floor(e.x / T);
    const r = Math.floor((e.x + e.w - 0.001) / T);
    for (let x = l; x <= r; x++) {
      const ch = tileAt(level, s, x, by);
      if ((isSolid(ch, s.switchOn) || ch === '-') && prevBottom <= by * T + 0.5) {
        e.y = by * T - e.h; e.vy = 0; e.onGround = true; break;
      }
    }
    if (e.y > level.h * T + 40) e.alive = false;
  }

  // 推进一帧（固定 1/60 秒）。input: {left, right, up, down, jump, dash}
  function step(level, s, input) {
    s.events.length = 0;
    if (s.dead || s.won) return s;
    s.time += DT;

    updateWorldGizmos(level, s);

    const jump = !!input.jump;
    const pressed = jump && !s.jumpPrev;
    s.jumpPrev = jump;

    const dashIn = !!input.dash;
    const dashPressed = dashIn && !s.dashPrev;
    s.dashPrev = dashIn;

    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const vdir = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (dir && s.wallLock <= 0) s.facing = dir;

    if (s.dashCooldown > 0) s.dashCooldown = Math.max(0, s.dashCooldown - DT);
    if (s.wallLock > 0) s.wallLock = Math.max(0, s.wallLock - DT);
    if (s.dropTimer > 0) s.dropTimer = Math.max(0, s.dropTimer - DT);

    // 触发八向冲刺
    if (dashPressed && s.dashes > 0 && s.dashCooldown <= 0) {
      let dx = dir, dy = vdir;
      if (dx === 0 && dy === 0) dx = s.facing || 1;
      const len = Math.hypot(dx, dy) || 1;
      s.dashDirX = dx / len;
      s.dashDirY = dy / len;
      s.vx = s.dashDirX * PHYS.dashSpeed;
      s.vy = s.dashDirY * PHYS.dashSpeed;
      s.dashes--;
      s.dashTimer = PHYS.dashTime;
      s.dashCooldown = PHYS.dashCooldown;
      s.canCut = false;
      s.wallDir = 0;
      s.events.push({ type: 'dash', x: s.px + PHYS.pw / 2, y: s.py + PHYS.ph / 2, dx: s.dashDirX, dy: s.dashDirY });
    }

    // 单向平台下落（↓ + 跳）
    if (pressed && input.down && s.onGround) {
      const belowY = Math.floor((s.py + PHYS.ph + 1) / T);
      const lx = Math.floor(s.px / T), rx = Math.floor((s.px + PHYS.pw - 0.001) / T);
      let onlyOneWay = true, hasOneWay = false;
      for (let tx = lx; tx <= rx; tx++) {
        const ch = tileAt(level, s, tx, belowY);
        if (isSolid(ch, s.switchOn)) onlyOneWay = false;
        if (ch === '-') hasOneWay = true;
      }
      if (onlyOneWay && hasOneWay) {
        s.dropTimer = 0.14;
        s.py += 2;
        s.onGround = false;
        s.coyote = 0;
      }
    }

    // 跳跃缓冲与土狼时间
    s.coyote = s.onGround ? PHYS.coyote : s.coyote - DT;
    s.buffer = pressed && s.dropTimer <= 0 ? PHYS.buffer : s.buffer - DT;

    // 冲刺中
    if (s.dashTimer > 0) {
      // Celeste Wavedash / Hyperdash：地面冲刺中起跳 → 超远爆发跳！
      if (s.buffer > 0 && s.coyote > 0 && s.dashDirY >= 0) {
        const refund = s.dashTimer < PHYS.dashTime * 0.68;
        s.dashTimer = 0;
        s.buffer = 0; s.coyote = 0; s.onGround = false; s.canCut = true;
        s.vx = (s.dashDirX !== 0 ? Math.sign(s.dashDirX) : s.facing) * PHYS.wavedashVx;
        s.vy = -PHYS.jump * 0.96;
        if (refund) s.dashes = s.dashMax;
        s.events.push({ type: 'wavedash', x: s.px + PHYS.pw / 2, y: s.py + PHYS.ph });
      } else {
        s.dashTimer -= DT;
        s.vx = s.dashDirX * PHYS.dashSpeed;
        s.vy = s.dashDirY * PHYS.dashSpeed;
        if (s.dashTimer <= 0) {
          s.vx *= PHYS.dashEndKeep;
          if (s.vy < 0) s.vy *= 0.52;
        }
      }
    }

    // 常规水平与重力（非冲刺状态）
    if (s.dashTimer <= 0) {
      const iceA = s.onGround && s.onIce ? PHYS.iceAccelScale : 1;
      const iceF = s.onGround && s.onIce ? PHYS.iceFrictionScale : 1;
      if (dir && s.wallLock <= 0) {
        let a = (s.onGround ? PHYS.accelGround * iceA : PHYS.accelAir);
        if (s.vx !== 0 && Math.sign(s.vx) !== dir) a *= PHYS.turnBoost;
        const target = dir * PHYS.run;
        // 若当前速度因 Wavedash/冲刺超过常规跑速，顺向时不强行减速，平滑保持动量
        if (Math.sign(s.vx) === dir && Math.abs(s.vx) > PHYS.run) {
          const drag = (s.onGround ? 380 * iceF : 120) * DT;
          s.vx = Math.abs(s.vx) - drag < PHYS.run ? target : s.vx - dir * drag;
        } else {
          const nextVx = s.vx + dir * a * DT;
          s.vx = dir > 0 ? Math.min(target, nextVx) : Math.max(target, nextVx);
        }
      } else if (s.wallLock <= 0) {
        const f = (s.onGround ? PHYS.frictionGround * iceF : PHYS.frictionAir) * DT;
        s.vx = Math.abs(s.vx) <= f ? 0 : s.vx - Math.sign(s.vx) * f;
      }

      // 贴墙检测与墙上土狼时间
      const touchWall = detectWall(level, s);
      if (touchWall !== 0) {
        s.wallCoyote = PHYS.wallCoyote;
        s.wallCoyoteDir = touchWall;
      } else if (s.wallCoyote > 0) {
        s.wallCoyote -= DT;
      }
      const sliding = touchWall !== 0 && !s.onGround && s.vy > 0 && dir === touchWall;
      s.wallDir = sliding ? touchWall : 0;

      // 普通起跳 / 土狼起跳
      if (s.buffer > 0 && s.coyote > 0) {
        s.vy = -PHYS.jump;
        s.buffer = 0; s.coyote = 0; s.onGround = false; s.canCut = true;
        s.events.push({ type: 'jump', x: s.px + PHYS.pw / 2, y: s.py + PHYS.ph });
      } else if (s.buffer > 0 && s.wallCoyote > 0 && !s.onGround) {
        // 蹬墙跳（Wall Jump）
        const wd = s.wallCoyoteDir;
        s.vx = -wd * PHYS.wallJumpX;
        s.vy = -PHYS.wallJumpY;
        s.facing = -wd;
        s.wallLock = PHYS.wallLock;
        s.wallCoyote = 0;
        s.buffer = 0;
        s.canCut = true;
        s.events.push({ type: 'walljump', x: wd > 0 ? s.px + PHYS.pw : s.px, y: s.py + PHYS.ph / 2, dir: -wd });
      }

      if (s.canCut && !jump && s.vy < -PHYS.minJump) { s.vy = -PHYS.minJump; s.canCut = false; }
      if (s.vy >= 0) s.canCut = false;

      // 重力 + 跳跃顶点滞空减重 + 贴墙慢滑限速
      const gScale = (!s.onGround && jump && Math.abs(s.vy) < PHYS.apexThreshold) ? PHYS.apexGravityScale : 1;
      const maxF = s.wallDir !== 0 ? PHYS.wallSlide : PHYS.maxFall;
      s.vy = Math.min(s.vy + PHYS.gravity * gScale * DT, maxF);
    }

    moveX(level, s);
    moveY(level, s);

    if (s.py > level.h * T + 40) { die(s); return s; }

    // 充能水晶交互
    for (const cr of s.crystals) {
      if (cr.timer <= 0 && overlap(s.px, s.py, PHYS.pw, PHYS.ph, cr.x + 2, cr.y + 2, 12, 12)) {
        if (s.dashes < s.dashMax || s.dashTimer > 0) {
          s.dashes = s.dashMax;
          cr.timer = PHYS.crystalRespawn;
          s.events.push({ type: 'crystal', x: cr.x + 8, y: cr.y + 8 });
        }
      }
    }

    // 与格子交互（尖刺、金币、存档旗、终点）
    const l = Math.floor(s.px / T), r = Math.floor((s.px + PHYS.pw - 0.001) / T);
    const t = Math.floor((s.py - T) / T), b = Math.floor((s.py + PHYS.ph - 0.001) / T);
    for (let ty = t; ty <= b; ty++) {
      for (let tx = l; tx <= r; tx++) {
        const ch = tileAt(level, s, tx, ty);
        const x = tx * T, y = ty * T;
        if (ch === '^' && overlap(s.px, s.py, PHYS.pw, PHYS.ph, x + 2, y + 9, 12, 7)) die(s);
        else if (ch === 'o' && overlap(s.px, s.py, PHYS.pw, PHYS.ph, x + 3, y + 3, 10, 10)) {
          s.mods[ty * level.w + tx] = '.';
          s.coins++;
          s.coinStreak = Math.min(12, s.coinStreak + 1);
          s.coinStreakTimer = 0.85;
          s.events.push({ type: 'coin', x: x + 8, y: y + 8, streak: s.coinStreak });
        } else if (ch === 'F' && overlap(s.px, s.py, PHYS.pw, PHYS.ph, x + 2, y - 8, 12, 24)) {
          if (!s.checkpoint || s.checkpoint.x !== tx || s.checkpoint.y !== ty) {
            s.checkpoint = { x: tx, y: ty };
            s.events.push({ type: 'checkpoint', x: x + 8, y: y + 4 });
          }
        } else if (ch === 'G' && overlap(s.px, s.py, PHYS.pw, PHYS.ph, x + 3, y - 24, 10, 40)) {
          if (!s.dead) { s.won = true; s.events.push({ type: 'win', x: x + 8, y: y }); }
        }
      }
    }

    // 敌人更新与交互
    for (const e of s.enemies) {
      if (!e.alive) continue;
      updateEnemy(level, s, e);
      if (!e.alive || s.dead) continue;
      if (overlap(s.px, s.py, PHYS.pw, PHYS.ph, e.x + 1, e.y + 2, e.w - 2, e.h - 2)) {
        const stomping = (s.vy > 0 && s.py + PHYS.ph - e.y < 10) || (s.dashTimer > 0 && s.dashDirY >= 0);
        if (stomping) {
          e.alive = false;
          s.combo++;
          s.dashTimer = 0;
          s.dashes = s.dashMax; // 踩怪重置空中冲刺
          s.vy = jump ? -PHYS.jump : -PHYS.stomp;
          s.canCut = jump;
          s.events.push({ type: 'stomp', x: e.x + e.w / 2, y: e.y + e.h / 2, combo: s.combo });
        } else die(s);
      }
    }
    return s;
  }

  // ---------- 束搜索自动通关机器人（支持跳跃、蹬墙跳、八向冲刺、开关机关；Node/浏览器通用） ----------
  const BOT_ACTIONS = [
    { right: 1 },
    { right: 1, jump: 1 },
    { left: 1 },
    { left: 1, jump: 1 },
    { jump: 1 },
    { right: 1, dash: 1 },
    { right: 1, up: 1, dash: 1 },
    { up: 1, dash: 1 },
    {},
  ];

  function createSolver(level, opts = {}) {
    const goal = PF.find(level, 'G');
    const width = opts.width || 280;
    const hold = opts.hold || 5;
    const maxDepth = opts.maxDepth || 650;
    const useDash = opts.useDash !== false;
    const actions = useDash ? BOT_ACTIONS : BOT_ACTIONS.slice(0, 5).concat([{}]);
    const gx = goal ? goal.x * T : level.w * T;
    const gy = goal ? goal.y * T : 0;

    let beam = [{ s: newState(level), parent: null, a: -1 }];
    let depth = 0;
    let explored = 0;
    let done = !goal;
    let result = null;

    function scoreState(s) {
      const dist = Math.hypot(gx - s.px, (gy - s.py) * 0.45);
      return -dist + s.px * 0.65 - s.time * 1.8 + (s.switchOn ? 0 : 18) + (s.checkpoint ? 24 : 0);
    }

    function stepDepth() {
      if (done) return true;
      if (depth >= maxDepth || !beam.length) { done = true; return true; }
      depth++;
      const next = [];
      const seen = new Set();
      for (const node of beam) {
        for (let ai = 0; ai < actions.length; ai++) {
          const s = cloneState(node.s);
          for (let k = 0; k < hold && !s.dead && !s.won; k++) step(level, s, actions[ai]);
          explored++;
          if (s.dead) continue;
          const child = { s, parent: node, a: ai };
          if (s.won) {
            const path = [];
            for (let n = child; n.parent; n = n.parent) path.push(actions[n.a]);
            path.reverse();
            result = { path, hold, explored, time: s.time, coins: s.coins, totalCoins: s.totalCoins };
            done = true;
            return true;
          }
          const key = `${Math.round(s.px / 5)},${Math.round(s.py / 5)},${Math.round(s.vy / 90)},${s.onGround | 0},${s.dashes},${s.switchOn | 0},${s.enemies.filter((e) => e.alive).length}`;
          if (seen.has(key)) continue;
          seen.add(key);
          child.score = scoreState(s);
          next.push(child);
        }
      }
      if (!next.length) { done = true; return true; }
      next.sort((a, b) => b.score - a.score);
      beam = next.slice(0, width);
      return false;
    }

    return {
      stepBatch(budgetMs = 12) {
        const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
        while (!done) {
          stepDepth();
          const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
          if (now - t0 >= budgetMs) break;
        }
        return { done, depth, maxDepth, explored, result };
      },
      solveSync() {
        while (!done) stepDepth();
        return result;
      },
    };
  }

  function solveLevel(level, opts = {}) {
    return createSolver(level, opts).solveSync();
  }

  Object.assign(PF, {
    PHYS, DT, isSolid, newState, cloneState, step, tileAt,
    createSolver, solveLevel,
  });
})(typeof window !== 'undefined' ? window : globalThis);
