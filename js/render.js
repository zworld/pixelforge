/* PixelForge — Canvas 渲染（程序化像素画，零素材） */
(function (G) {
  'use strict';
  const PF = G.PF;
  const T = PF.TILE;

  const hash = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0);

  // 在世界坐标 (px,py) 绘制一个格子。nb(dx,dy) 返回邻居字符
  function drawTile(ctx, ch, px, py, t, nb, tx) {
    const R = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(px + x, py + y, w, h); };
    switch (ch) {
      case '#': {
        const h = hash(px, py);
        R(0, 0, 16, 16, '#8b5a2b');
        R(h % 12 + 1, (h >> 4) % 10 + 5, 2, 2, '#6e4520');
        R((h >> 8) % 12 + 2, (h >> 12) % 8 + 4, 3, 2, '#9c6a38');
        if (nb(0, -1) !== '#') {
          R(0, 0, 16, 5, '#4caf50');
          R(0, 5, 16, 1, '#2e7d32');
          R(h % 13, 0, 2, 2, '#7bd36b');
          R((h >> 6) % 13, 1, 3, 1, '#7bd36b');
        }
        if (nb(-1, 0) !== '#') R(0, 0, 1, 16, 'rgba(0,0,0,.18)');
        if (nb(1, 0) !== '#') R(15, 0, 1, 16, 'rgba(0,0,0,.18)');
        break;
      }
      case 'B':
        R(0, 0, 16, 16, '#c8642c');
        R(0, 0, 16, 1, '#e8915a');
        R(0, 7, 16, 1, '#7a3412'); R(0, 15, 16, 1, '#7a3412');
        R(7, 0, 1, 7, '#7a3412'); R(3, 8, 1, 7, '#7a3412'); R(11, 8, 1, 7, '#7a3412');
        break;
      case '-':
        R(0, 0, 16, 5, '#c79257');
        R(0, 0, 16, 1, '#e6b67c');
        R(0, 4, 16, 1, '#7a5230');
        R(3, 5, 2, 3, '#7a5230'); R(11, 5, 2, 3, '#7a5230');
        break;
      case '^':
        R(0, 14, 16, 2, '#6b7280');
        for (let i = 0; i < 2; i++) {
          const ox = px + i * 8;
          ctx.fillStyle = '#dfe6ee';
          ctx.beginPath(); ctx.moveTo(ox, py + 14); ctx.lineTo(ox + 4, py + 6); ctx.lineTo(ox + 8, py + 14); ctx.fill();
          ctx.fillStyle = '#9aa5b1';
          ctx.beginPath(); ctx.moveTo(ox + 4, py + 6); ctx.lineTo(ox + 8, py + 14); ctx.lineTo(ox + 4, py + 14); ctx.fill();
        }
        break;
      case 'o': {
        const ph = t * 3 + (tx || 0) * 0.7;
        const bob = Math.sin(ph * 1.3) * 1.5;
        const sx = Math.max(0.15, Math.abs(Math.cos(ph)));
        ctx.fillStyle = '#c98b00';
        ctx.beginPath(); ctx.ellipse(px + 8, py + 8 + bob, 5 * sx + 0.6, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#ffd23f';
        ctx.beginPath(); ctx.ellipse(px + 8, py + 8 + bob, 4 * sx, 5, 0, 0, Math.PI * 2); ctx.fill();
        if (sx > 0.5) R(7, 5 + bob, 1, 4, '#fff6c2');
        break;
      }
      case 'S':
        R(1, 13, 14, 3, '#4b5563');
        ctx.strokeStyle = '#cbd5e1'; ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(px + 4, py + 13);
        for (let i = 0; i < 4; i++) ctx.lineTo(px + (i % 2 ? 4 : 12), py + 12 - i);
        ctx.stroke();
        R(1, 8, 14, 3, '#e53935'); R(1, 8, 14, 1, '#ff8a80');
        break;
      case 'E':
        drawEnemy(ctx, px + 1, py + 2, t, -1);
        break;
      case 'P':
        ctx.globalAlpha = 0.85;
        drawPlayer(ctx, { px: px + 2, py: py + 2, facing: 1, vy: 0, onGround: true });
        ctx.globalAlpha = 1;
        R(0, 15, 16, 1, '#2f80ed');
        break;
      case 'G': {
        R(5, 13, 6, 3, '#6b7280');
        R(7, -24, 2, 37, '#e5e7eb');
        R(6, -26, 4, 3, '#facc15');
        const w = Math.sin(t * 5) * 1.5;
        ctx.fillStyle = '#22c55e';
        ctx.beginPath(); ctx.moveTo(px + 9, py - 22); ctx.lineTo(px + 20 + w, py - 17); ctx.lineTo(px + 9, py - 12); ctx.fill();
        break;
      }
    }
  }

  function drawEnemy(ctx, x, y, t, facing, squash) {
    const R = (a, b, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, w, h); };
    if (squash) { R(0, 10, 14, 4, '#5b3fa0'); return; }
    const f = Math.floor(t * 6) % 2;
    R(1, 2, 12, 10, '#7e57c2');
    R(2, 1, 10, 1, '#7e57c2');
    R(1, 2, 12, 2, '#9575cd');
    R(f ? 1 : 2, 12, 4, 2, '#3b2470'); R(f ? 9 : 8, 12, 4, 2, '#3b2470');
    const ex = facing > 0 ? 1 : -1;
    R(3 + ex, 5, 3, 3, '#fff'); R(8 + ex, 5, 3, 3, '#fff');
    R(4 + ex + (ex > 0 ? 1 : 0), 6, 1, 2, '#111'); R(9 + ex + (ex > 0 ? 1 : 0), 6, 1, 2, '#111');
    R(3, 4, 3, 1, '#3b2470'); R(8, 4, 3, 1, '#3b2470');
  }

  function drawPlayer(ctx, s) {
    let w = 12, h = 14;
    if (!s.onGround) { if (s.vy < -120) { w = 10; h = 16; } else if (s.vy > 200) { w = 11; h = 15; } }
    const x = s.px + (12 - w) / 2, y = s.py + (14 - h);
    const R = (a, b, ww, hh, c) => { ctx.fillStyle = c; ctx.fillRect(x + a, y + b, ww, hh); };
    R(0, 0, w, h, '#2f80ed');
    R(0, 0, w, 2, '#5aa2ff');
    R(0, h - 3, w, 3, '#1f5fb8');
    R(0, 2, w, 2, '#ef4444'); // 头带
    const ex = s.facing > 0 ? w - 6 : 1;
    R(ex, 5, 2, 3, '#fff'); R(ex + 3, 5, 2, 3, '#fff');
    R(ex + (s.facing > 0 ? 1 : 0), 6, 1, 2, '#111'); R(ex + 3 + (s.facing > 0 ? 1 : 0), 6, 1, 2, '#111');
  }

  class Renderer {
    constructor(canvas) {
      this.c = canvas;
      this.ctx = canvas.getContext('2d');
      this.resize();
    }
    resize() {
      const r = this.c.parentElement.getBoundingClientRect();
      this.dpr = window.devicePixelRatio || 1;
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      this.c.width = Math.round(this.w * this.dpr);
      this.c.height = Math.round(this.h * this.dpr);
      this.c.style.width = this.w + 'px';
      this.c.style.height = this.h + 'px';
    }
    screen() { this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0); }
    world(cam) {
      const z = cam.zoom * this.dpr;
      this.ctx.setTransform(z, 0, 0, z, Math.round(-cam.x * z), Math.round(-cam.y * z));
    }
    background(cam, t) {
      const ctx = this.ctx;
      this.screen();
      ctx.imageSmoothingEnabled = false;
      const g = ctx.createLinearGradient(0, 0, 0, this.h);
      g.addColorStop(0, '#5ec8f2'); g.addColorStop(1, '#c9f0ff');
      ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);
      // 视差云与山
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < 8; i++) {
        const span = this.w + 240;
        const x = (((i * 260 - cam.x * cam.zoom * 0.15 + t * 6) % span) + span) % span - 120;
        const y = 30 + ((i * 53) % 90);
        ctx.fillRect(x, y, 70, 14); ctx.fillRect(x + 14, y - 10, 40, 12);
      }
      const hill = (factor, color, base, amp, freq) => {
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.moveTo(0, this.h);
        for (let x = 0; x <= this.w; x += 8) {
          const wx = x + cam.x * cam.zoom * factor;
          ctx.lineTo(x, this.h - base - Math.sin(wx * freq) * amp - Math.sin(wx * freq * 2.3) * amp * 0.4);
        }
        ctx.lineTo(this.w, this.h); ctx.fill();
      };
      hill(0.2, '#9fd8b4', this.h * 0.32, 26, 0.006);
      hill(0.4, '#7cc497', this.h * 0.2, 18, 0.01);
    }
    // getTile(tx,ty) 返回当前格子字符（包含运行时修改）
    level(level, cam, t, getTile, opts = {}) {
      const ctx = this.ctx;
      this.world(cam);
      const x0 = Math.max(0, Math.floor(cam.x / T) - 1);
      const y0 = Math.max(0, Math.floor(cam.y / T) - 1);
      const x1 = Math.min(level.w - 1, Math.ceil((cam.x + this.w / cam.zoom) / T) + 1);
      const y1 = Math.min(level.h - 1, Math.ceil((cam.y + this.h / cam.zoom) / T) + 2);
      if (opts.editor) {
        ctx.fillStyle = 'rgba(255,255,255,.12)';
        ctx.fillRect(0, 0, level.w * T, level.h * T);
      }
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          const ch = getTile(tx, ty);
          if (ch === '.' || (!opts.editor && (ch === 'E' || ch === 'P'))) continue;
          drawTile(ctx, ch, tx * T, ty * T, t, (dx, dy) => {
            const nx = tx + dx, ny = ty + dy;
            if (nx < 0 || nx >= level.w) return '#';
            if (ny < 0 || ny >= level.h) return ny < 0 ? '.' : '#';
            return getTile(nx, ny);
          }, tx);
        }
      }
      if (opts.editor) {
        if (cam.zoom >= 1.5) {
          ctx.fillStyle = 'rgba(0,40,80,.10)';
          const lw = 1 / cam.zoom;
          for (let x = x0; x <= x1 + 1; x++) ctx.fillRect(x * T, y0 * T, lw, (y1 - y0 + 1) * T);
          for (let y = y0; y <= y1 + 1; y++) ctx.fillRect(x0 * T, y * T, (x1 - x0 + 1) * T, lw);
        }
        ctx.strokeStyle = 'rgba(0,30,60,.55)';
        ctx.lineWidth = 2 / cam.zoom;
        ctx.strokeRect(0, 0, level.w * T, level.h * T);
      }
    }
  }

  // 调色板图标
  function tileIcon(ch, size = 32) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    if (ch === 'G') ctx.scale(size / 46, size / 46);
    else ctx.scale(size / 16, size / 16);
    if (ch === '.') {
      ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(3, 3); ctx.lineTo(13, 13); ctx.moveTo(13, 3); ctx.lineTo(3, 13); ctx.stroke();
    } else if (ch === 'G') {
      drawTile(ctx, ch, 10, 28, 0, () => '.', 0);
    } else {
      drawTile(ctx, ch, 0, 0, 0, () => '.', 0);
    }
    return c;
  }

  Object.assign(PF, { Renderer, drawTile, drawEnemy, drawPlayer, tileIcon });
})(window);
