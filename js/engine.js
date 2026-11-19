/* PixelForge — 确定性物理引擎（纯逻辑，无 DOM，可在 Node 中运行） */
(function (G) {
  'use strict';
  const PF = G.PF;
  const T = PF.TILE;
  const DT = 1 / 60;

  // 单位：像素、秒
  const PHYS = {
    gravity: 1500,
    maxFall: 520,
    run: 140,
    accelGround: 1500,
    accelAir: 950,
    turnBoost: 1.6,
    frictionGround: 1800,
    frictionAir: 300,
    jump: 430, // 最高约 3.8 格
    minJump: 170, // 松开跳跃键时的截断速度
    coyote: 0.1, // 土狼时间
    buffer: 0.12, // 跳跃缓冲
    spring: 640,
    stomp: 330,
    enemySpeed: 40,
    pw: 12,
    ph: 14,
  };

  const isSolid = (ch) => ch === '#' || ch === 'B';
  const overlap = (ax, ay, aw, ah, bx, by, bw, bh) =>
    ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

  function newState(level, start) {
    const p = start || PF.find(level, 'P') || { x: 1, y: level.h - 3 };
    const s = {
      px: p.x * T + (T - PHYS.pw) / 2,
      py: p.y * T + (T - PHYS.ph),
      vx: 0, vy: 0,
      onGround: false, coyote: 0, buffer: 0,
      jumpPrev: false, canCut: false, facing: 1,
      dead: false, won: false,
      time: 0, coins: 0, totalCoins: 0,
      mods: {}, enemies: [], events: [],
    };
    for (let i = 0; i < level.tiles.length; i++) {
      const ch = level.tiles[i];
      if (ch === 'o') s.totalCoins++;
      else if (ch === 'E') {
        const x = i % level.w;
        const y = (i / level.w) | 0;
        s.enemies.push({ x: x * T + 1, y: y * T + 2, w: 14, h: 14, vx: -PHYS.enemySpeed, vy: 0, onGround: false, alive: true });
      }
    }
    return s;
  }

  function cloneState(s) {
    const c = Object.assign({}, s);
    c.mods = Object.assign({}, s.mods);
    c.enemies = s.enemies.map((e) => Object.assign({}, e));
    c.events = [];
    return c;
  }

  function tileAt(level, s, tx, ty) {
    if (tx < 0 || tx >= level.w) return '#'; // 左右边界是墙
    if (ty < 0 || ty >= level.h) return '.';
    const i = ty * level.w + tx;
    const m = s.mods[i];
    const ch = m !== undefined ? m : level.tiles[i];
    return ch === 'E' || ch === 'P' ? '.' : ch;
  }

  function die(s) {
    if (!s.dead && !s.won) {
      s.dead = true;
      s.events.push({ type: 'die', x: s.px + PHYS.pw / 2, y: s.py + PHYS.ph / 2 });
    }
  }

  function moveX(level, s) {
    s.px += s.vx * DT;
    const top = Math.floor(s.py / T);
    const bot = Math.floor((s.py + PHYS.ph - 0.001) / T);
    if (s.vx > 0) {
      const tx = Math.floor((s.px + PHYS.pw - 0.001) / T);
      for (let ty = top; ty <= bot; ty++) {
        if (isSolid(tileAt(level, s, tx, ty))) { s.px = tx * T - PHYS.pw; s.vx = 0; break; }
      }
    } else if (s.vx < 0) {
      const tx = Math.floor(s.px / T);
      for (let ty = top; ty <= bot; ty++) {
        if (isSolid(tileAt(level, s, tx, ty))) { s.px = (tx + 1) * T; s.vx = 0; break; }
      }
    }
  }

  function moveY(level, s, input) {
    const prevBottom = s.py + PHYS.ph;
    s.py += s.vy * DT;
    s.onGround = false;
    const l = Math.floor(s.px / T);
    const r = Math.floor((s.px + PHYS.pw - 0.001) / T);
    if (s.vy > 0) {
      const bottom = s.py + PHYS.ph;
      const ty0 = Math.floor((prevBottom - 0.001) / T);
      const ty1 = Math.floor((bottom - 0.001) / T);
      for (let ty = ty0; ty <= ty1; ty++) {
        let solidTop = null;
        let springTop = null;
        for (let tx = l; tx <= r; tx++) {
          const ch = tileAt(level, s, tx, ty);
          const top = ty * T;
          if ((isSolid(ch) && prevBottom <= top + 0.01) || (ch === '-' && prevBottom <= top + 0.01)) {
            if (bottom >= top) solidTop = top;
          } else if (ch === 'S') {
            const st = top + 8;
            if (prevBottom <= st + 0.01 && bottom >= st) springTop = st;
          }
        }
        if (solidTop !== null) {
          s.py = solidTop - PHYS.ph; s.vy = 0; s.onGround = true;
          return;
        }
        if (springTop !== null) {
          s.py = springTop - PHYS.ph;
          s.vy = -PHYS.spring;
          s.canCut = false;
          s.events.push({ type: 'spring', x: s.px + PHYS.pw / 2, y: springTop });
          return;
        }
      }
    } else if (s.vy < 0) {
      const ty = Math.floor(s.py / T);
      let hit = false;
      for (let tx = l; tx <= r; tx++) {
        const ch = tileAt(level, s, tx, ty);
        if (isSolid(ch)) {
          hit = true;
          if (ch === 'B') {
            s.mods[ty * level.w + tx] = '.';
            s.events.push({ type: 'break', x: tx * T + T / 2, y: ty * T + T / 2 });
          }
        }
      }
      if (hit) { s.py = (ty + 1) * T; s.vy = 0; s.canCut = false; }
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
    const wall = isSolid(ahead) || ahead === '^' || ahead === 'S';
    const ledge = e.onGround && !(isSolid(below) || below === '-');
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
      if ((isSolid(ch) || ch === '-') && prevBottom <= by * T + 0.01) {
        e.y = by * T - e.h; e.vy = 0; e.onGround = true; break;
      }
    }
    if (e.y > level.h * T + 40) e.alive = false;
  }

  // 推进一帧（固定 1/60 秒）。input: {left, right, jump}
  function step(level, s, input) {
    s.events.length = 0;
    if (s.dead || s.won) return s;
    s.time += DT;
    const jump = !!input.jump;
    const pressed = jump && !s.jumpPrev;
    s.jumpPrev = jump;

    // 水平
    const dir = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    if (dir) {
      let a = s.onGround ? PHYS.accelGround : PHYS.accelAir;
      if (s.vx !== 0 && Math.sign(s.vx) !== dir) a *= PHYS.turnBoost;
      s.vx = Math.max(-PHYS.run, Math.min(PHYS.run, s.vx + dir * a * DT));
      s.facing = dir;
    } else {
      const f = (s.onGround ? PHYS.frictionGround : PHYS.frictionAir) * DT;
      s.vx = Math.abs(s.vx) <= f ? 0 : s.vx - Math.sign(s.vx) * f;
    }

    // 跳跃：土狼时间 + 缓冲 + 可变高度
    s.coyote = s.onGround ? PHYS.coyote : s.coyote - DT;
    s.buffer = pressed ? PHYS.buffer : s.buffer - DT;
    if (s.buffer > 0 && s.coyote > 0) {
      s.vy = -PHYS.jump;
      s.buffer = 0; s.coyote = 0; s.onGround = false; s.canCut = true;
      s.events.push({ type: 'jump', x: s.px + PHYS.pw / 2, y: s.py + PHYS.ph });
    }
    if (s.canCut && !jump && s.vy < -PHYS.minJump) { s.vy = -PHYS.minJump; s.canCut = false; }
    if (s.vy >= 0) s.canCut = false;
    s.vy = Math.min(s.vy + PHYS.gravity * DT, PHYS.maxFall);

    moveX(level, s);
    moveY(level, s, input);

    if (s.py > level.h * T + 40) { die(s); return s; }

    // 与格子交互
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
          s.events.push({ type: 'coin', x: x + 8, y: y + 8 });
        } else if (ch === 'G' && overlap(s.px, s.py, PHYS.pw, PHYS.ph, x + 3, y - 24, 10, 40)) {
          if (!s.dead) { s.won = true; s.events.push({ type: 'win', x: x + 8, y: y }); }
        }
      }
    }

    // 敌人
    for (const e of s.enemies) {
      if (!e.alive) continue;
      updateEnemy(level, s, e);
      if (!e.alive || s.dead) continue;
      if (overlap(s.px, s.py, PHYS.pw, PHYS.ph, e.x + 1, e.y + 2, e.w - 2, e.h - 2)) {
        if (s.vy > 0 && s.py + PHYS.ph - e.y < 10) {
          e.alive = false;
          s.vy = jump ? -PHYS.jump : -PHYS.stomp;
          s.canCut = jump;
          s.events.push({ type: 'stomp', x: e.x + e.w / 2, y: e.y + e.h / 2 });
        } else die(s);
      }
    }
    return s;
  }

  Object.assign(PF, { PHYS, DT, newState, cloneState, step, tileAt, isSolid });
})(typeof window !== 'undefined' ? window : globalThis);
