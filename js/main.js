/* PixelForge — 应用主程序：3D 模式切换、游戏循环、分享与持久化 */
(function () {
  'use strict';
  const PF = window.PF;
  const T = PF.TILE;
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'pixelforge.level.v1';

  // ---- 8-bit 音效（WebAudio 合成，无素材） ----
  const Sound = {
    ctx: null,
    play(type) {
      try {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        const presets = {
          jump: [['square', 300, 600, 0.09, 0.06]],
          coin: [['square', 988, 988, 0.05, 0.05], ['square', 1319, 1319, 0.12, 0.05, 0.05]],
          stomp: [['triangle', 400, 120, 0.12, 0.12]],
          spring: [['sine', 200, 900, 0.18, 0.1]],
          break: [['sawtooth', 220, 60, 0.12, 0.06]],
          die: [['square', 500, 80, 0.45, 0.07]],
          win: [['square', 523, 523, 0.1, 0.05], ['square', 659, 659, 0.1, 0.05, 0.1], ['square', 784, 784, 0.1, 0.05, 0.2], ['square', 1047, 1047, 0.3, 0.05, 0.3]],
        };
        const now = this.ctx.currentTime;
        for (const [wave, f0, f1, dur, vol, delay = 0] of presets[type] || []) {
          const o = this.ctx.createOscillator(), g = this.ctx.createGain();
          o.type = wave;
          o.frequency.setValueAtTime(f0, now + delay);
          o.frequency.exponentialRampToValueAtTime(f1, now + delay + dur);
          g.gain.setValueAtTime(vol, now + delay);
          g.gain.exponentialRampToValueAtTime(0.0001, now + delay + dur);
          o.connect(g).connect(this.ctx.destination);
          o.start(now + delay); o.stop(now + delay + dur + 0.02);
        }
      } catch (e) { /* 无音频环境忽略 */ }
    },
  };

  const app = {
    level: null,
    mode: 'edit',
    cam: { tx: 10, ty: -7.5, dist: 24, yaw: -0.14, pitch: 0.14 },
    editCam: null,
    game: null,
    start: null,
    particles: [],
    keys: {},
    t: 0,
    deaths: 0,
    deadTimer: 0,
    shake: 0,
    lastInit: 0,

    init() {
      this.renderer = new PF.Renderer3D($('stage'));
      this.canvas = this.renderer.canvas;
      this.editor = new PF.Editor(this);
      this.editor.buildPalette($('palette'));
      this.editor.bind(this.canvas);
      this.loadInitial();
      this.renderer.setLevel(this.level);
      this.fitView();
      this.bindUI();
      this.updateStatus();
      window.addEventListener('resize', () => { this.renderer.resize(); });
      let last = performance.now(), acc = 0;
      const frame = (now) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        this.t += dt;
        if (this.mode === 'play') {
          acc += dt;
          while (acc >= PF.DT) { this.tick(); acc -= PF.DT; }
        } else acc = 0;
        this.updateParticles(dt);
        this.draw(dt);
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },

    markDirty() {
      if (this.renderer) this.renderer.dirty = true;
    },

    loadInitial() {
      const m = location.hash.match(/[#&]L=([\w-]+)/);
      if (m) {
        const lv = PF.decode(m[1]);
        if (lv) { this.level = lv; this.toast('已从分享链接载入关卡 🎉'); return; }
        this.toast('分享链接无效，已载入本地关卡');
      }
      const saved = localStorage.getItem(STORE_KEY);
      const lv = saved && PF.decode(saved);
      this.level = lv || PF.sampleLevel();
    },

    onLevelChanged(structural) {
      this.markDirty();
      clearTimeout(this._saveT);
      this._saveT = setTimeout(() => {
        try { localStorage.setItem(STORE_KEY, PF.encode(this.level)); } catch (e) { /* 存储满 */ }
      }, 250);
      if (structural) {
        this.renderer.setLevel(this.level);
        this.fitView();
      }
      this.updateStatus();
    },

    fitView() {
      const r = this.renderer;
      const L = this.level;
      const tanHalf = Math.tan((r.camera.fov * Math.PI) / 360);
      const aspect = Math.max(0.5, r.w / r.h);
      const distH = (L.h + 3.5) / (2 * tanHalf);
      const distW = Math.min(L.w + 2, 22) / (2 * tanHalf * aspect);
      this.cam.dist = Math.max(10, Math.min(80, Math.max(distH, distW)));
      this.cam.yaw = -0.14;
      this.cam.pitch = 0.14;
      this.cam.ty = -L.h / 2;
      const vis = r.visibleSize(this.cam);
      const p = PF.find(L, 'P');
      const px = p ? p.x : 2;
      this.cam.tx = Math.min(L.w / 2, Math.max(vis.w * 0.44, px + vis.w * 0.32));
      this.updateStatus();
    },

    // ---- 试玩 ----
    play(fromCursor) {
      const L = this.level;
      let start = null;
      if (fromCursor) {
        const h = this.editor.hover;
        if (!h || !PF.inBounds(L, h.x, h.y) || PF.isSolid(L.tiles[h.y * L.w + h.x])) {
          return this.toast('把鼠标移到关卡内的空位再按 Shift+P');
        }
        start = h;
      } else if (!PF.find(L, 'P')) {
        this.editor.setTool('P');
        return this.toast('先放一个起点（已切换到起点工具）');
      }
      if (!PF.find(L, 'G')) this.toast('提示：还没有终点，当前为自由试玩');
      this.editor.commit();
      this.start = start;
      this.editCam = { ...this.cam };
      this.mode = 'play';
      this.deaths = 0;
      $('editTools').classList.add('hidden');
      $('playTools').classList.remove('hidden');
      $('palette').classList.add('hidden');
      $('hud').classList.remove('hidden');
      document.body.classList.add('playing');
      this.renderer.resize();
      this.resetGame();
      this.canvas.focus();
      this.updateStatus();
    },
    resetGame() {
      const t0 = performance.now();
      this.game = PF.newState(this.level, this.start);
      this.lastInit = performance.now() - t0;
      this.deadTimer = 0;
      this.particles = [];
      this.markDirty();
      const tanHalf = Math.tan((this.renderer.camera.fov * Math.PI) / 360);
      this.cam.dist = Math.max(12, Math.min(36, Math.min(this.level.h + 2, 17) / (2 * tanHalf)));
      this.cam.yaw = -0.1;
      this.cam.pitch = 0.12;
      this.followCamera(true);
      this.updateHUD();
      this.updateStatus();
    },
    stop() {
      this.mode = 'edit';
      this.game = null;
      $('editTools').classList.remove('hidden');
      $('playTools').classList.add('hidden');
      $('palette').classList.remove('hidden');
      $('hud').classList.add('hidden');
      $('playTip').classList.add('hidden');
      $('winOverlay').classList.add('hidden');
      $('deadFlash').classList.add('hidden');
      document.body.classList.remove('playing');
      this.renderer.resize();
      if (this.editCam) this.cam = { ...this.editCam };
      this.particles = [];
      this.markDirty();
      this.updateStatus();
    },
    input() {
      const k = this.keys;
      return {
        left: k.ArrowLeft || k.KeyA,
        right: k.ArrowRight || k.KeyD,
        jump: k.Space || k.ArrowUp || k.KeyW || k.KeyZ || k.KeyK,
      };
    },
    tick() {
      const g = this.game;
      if (g.dead) {
        this.deadTimer += PF.DT;
        if (this.deadTimer > 0.8) { this.deaths++; this.resetGame(); }
        return;
      }
      if (g.won) return;
      PF.step(this.level, g, this.input());
      for (const ev of g.events) this.onEvent(ev);
      this.followCamera(false);
    },
    onEvent(ev) {
      Sound.play(ev.type);
      if (ev.type === 'coin' || ev.type === 'break') this.markDirty();
      const burst = (n, color, speed, life, grav = 300) => {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
          this.particles.push({
            x: ev.x,
            y: ev.y,
            z: (Math.random() - 0.5) * 0.4,
            vx: Math.cos(a) * v,
            vy: Math.sin(a) * v - speed * 0.3,
            vz: (Math.random() - 0.5) * 3.5,
            life,
            max: life,
            color: Array.isArray(color) ? color[i % color.length] : color,
            g: grav,
            s: 2,
          });
        }
      };
      if (ev.type === 'coin') burst(10, '#ffd23f', 95, 0.45, 0);
      else if (ev.type === 'stomp') { burst(12, '#9575cd', 120, 0.5); this.shake = 0.12; }
      else if (ev.type === 'break') { burst(16, '#c8642c', 160, 0.7, 700); this.shake = 0.1; }
      else if (ev.type === 'spring') burst(8, '#ff8a80', 60, 0.3, 0);
      else if (ev.type === 'jump') burst(5, '#e5e7eb', 40, 0.25, 0);
      else if (ev.type === 'die') { burst(28, '#2f80ed', 200, 0.8, 500); this.shake = 0.3; }
      else if (ev.type === 'win') burst(48, ['#22c55e', '#facc15', '#ef4444', '#3b82f6'], 220, 1.4, 200);
    },
    updateParticles(dt) {
      for (const p of this.particles) {
        p.life -= dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z = (p.z || 0) + (p.vz || 0) * dt;
      }
      this.particles = this.particles.filter((p) => p.life > 0);
      this.shake = Math.max(0, this.shake - dt);
    },
    followCamera(snap) {
      const g = this.game, r = this.renderer, cam = this.cam, L = this.level;
      const vis = r.visibleSize(cam);
      const px = (g.px + 6) / T;
      const py = -(g.py + 7) / T;
      let tx = px + g.facing * Math.min(2.5, vis.w * 0.08);
      let ty = py + vis.h * 0.05;
      const halfW = Math.min(L.w / 2, vis.w * 0.44);
      const halfH = Math.min(L.h / 2, vis.h * 0.44);
      tx = Math.max(halfW, Math.min(L.w - halfW, tx));
      ty = Math.max(-L.h + halfH, Math.min(-halfH, ty));
      if (snap) { cam.tx = tx; cam.ty = ty; return; }
      cam.tx += (tx - cam.tx) * 0.15;
      cam.ty += (ty - cam.ty) * 0.12;
    },

    updateHUD() {
      const g = this.game;
      if (!g || this.mode !== 'play') return;
      $('hudCoins').textContent = `金币 ${g.coins}/${g.totalCoins}`;
      $('hudTime').textContent = `时间 ${g.time.toFixed(1)}s`;
      $('hudDeaths').textContent = `死亡 ${this.deaths}`;
      $('playTip').classList.toggle('hidden', !(g.time < 2.5 && this.deaths === 0 && !g.won && !g.dead));
      $('winOverlay').classList.toggle('hidden', !g.won);
      if (g.won) {
        const stars = 1 + (g.coins >= g.totalCoins * 0.5 ? 1 : 0) + (this.deaths === 0 ? 1 : 0);
        $('winStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        $('winStats').textContent = `用时 ${g.time.toFixed(2)}s · 金币 ${g.coins}/${g.totalCoins} · 死亡 ${this.deaths} 次`;
      }
      const flash = $('deadFlash');
      flash.classList.toggle('hidden', !g.dead);
      if (g.dead) flash.style.opacity = String(Math.max(0, 1 - this.deadTimer / 0.8));
    },

    // ---- 绘制 ----
    draw() {
      const L = this.level;
      const cam = this.cam;
      const drawCam = this.shake > 0
        ? { ...cam, tx: cam.tx + (Math.random() - 0.5) * 0.35, ty: cam.ty + (Math.random() - 0.5) * 0.35 }
        : cam;
      if (this.mode === 'play') this.updateHUD();
      this.renderer.render({
        level: L,
        t: this.t,
        cam: drawCam,
        mode: this.mode,
        hover: this.editor.hover,
        tool: this.editor.tool,
        game: this.game,
        particles: this.particles,
        getTile: this.mode === 'edit'
          ? (x, y) => L.tiles[y * L.w + x]
          : (x, y) => PF.tileAt(L, this.game, x, y),
      });
    },

    // ---- UI ----
    toast(msg) {
      const el = $('toast');
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => el.classList.remove('show'), 2200);
    },
    updateStatus() {
      const L = this.level;
      if (!L) return;
      let s;
      if (this.mode === 'play') {
        const initMs = this.lastInit != null ? this.lastInit.toFixed(2) : '0.00';
        s = `3D 试玩中 · 初始化 ${initMs}ms · Esc 返回编辑 · R 重来`;
      } else {
        const tool = this.editor.tool === '.' ? '橡皮擦' : PF.TILES[this.editor.tool].name;
        const h = this.editor.hover;
        const pos = h && PF.inBounds(L, h.x, h.y) ? `(${h.x}, ${h.y})` : '—';
        const zoomPct = Math.round((24 / this.cam.dist) * 100);
        s = `工具：${tool} · 光标 ${pos} · 关卡 ${L.w}×${L.h} · 缩放 ${zoomPct}% · 3D 视角 · 已自动保存`;
      }
      $('status').textContent = s;
    },
    shareURL() {
      return location.href.split('#')[0] + '#L=' + PF.encode(this.level);
    },
    async copy(text) {
      try { await navigator.clipboard.writeText(text); return true; } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text; document.body.appendChild(ta); ta.select();
        const ok = document.execCommand('copy'); ta.remove(); return ok;
      }
    },
    bindUI() {
      $('btnPlay').onclick = () => this.play(false);
      $('btnStop').onclick = () => this.stop();
      $('btnRestart').onclick = () => { this.deaths = 0; this.resetGame(); };
      $('btnUndo').onclick = () => this.editor.undo();
      $('btnRedo').onclick = () => this.editor.redo();
      $('btnShare').onclick = async () => {
        const url = this.shareURL();
        history.replaceState(null, '', url);
        const ok = await this.copy(url);
        this.toast(ok ? `分享链接已复制（${url.length} 字符）` : '复制失败，请手动复制地址栏');
      };
      $('btnExport').onclick = () => {
        const data = JSON.stringify({ format: 'pixelforge', version: 1, w: this.level.w, h: this.level.h, code: PF.encode(this.level) }, null, 2);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        a.download = `pixelforge-level-${Date.now()}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 1000);
        this.toast('关卡已导出');
      };
      $('btnImport').onclick = () => $('fileInput').click();
      $('fileInput').onchange = async (e) => {
        const f = e.target.files[0];
        e.target.value = '';
        if (!f) return;
        const text = await f.text();
        let code = text.trim();
        try { code = JSON.parse(text).code || code; } catch (err) { /* 纯文本编码 */ }
        const m = code.match(/L=([\w-]+)/);
        const lv = PF.decode(m ? m[1] : code);
        if (!lv) return this.toast('无法识别的关卡文件');
        this.editor.replaceLevel(lv);
        this.toast('导入成功（可撤销）');
      };
      $('btnResize').onclick = () => {
        const { minW, maxW, minH, maxH } = PF.LIMITS;
        const v = prompt(`输入新尺寸 宽×高（宽 ${minW}-${maxW}，高 ${minH}-${maxH}），以左下角为锚点：`, `${this.level.w}x${this.level.h}`);
        if (!v) return;
        const m = v.match(/(\d+)\D+(\d+)/);
        const w = m && +m[1], h = m && +m[2];
        if (!m || w < minW || w > maxW || h < minH || h > maxH) return this.toast('尺寸不合法');
        this.editor.replaceLevel(PF.resize(this.level, w, h));
        this.toast(`尺寸已改为 ${w}×${h}（可撤销）`);
      };
      $('btnSample').onclick = () => { this.editor.replaceLevel(PF.sampleLevel()); this.toast('已载入示例关卡（可撤销）'); };
      $('btnClear').onclick = () => {
        const L = PF.createLevel(this.level.w, this.level.h);
        for (let x = 0; x < L.w; x++) { PF.set(L, x, L.h - 1, '#'); PF.set(L, x, L.h - 2, '#'); }
        PF.set(L, 2, L.h - 3, 'P');
        PF.set(L, L.w - 3, L.h - 3, 'G');
        this.editor.replaceLevel(L);
        this.toast('已清空（保留地面/起点/终点，可撤销）');
      };

      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        if (this.mode === 'play') {
          if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
          if (e.key === 'Escape') return this.stop();
          if (e.code === 'KeyR' || (e.key === 'Enter' && this.game.won)) { this.deaths = e.code === 'KeyR' && !this.game.won ? this.deaths : 0; this.resetGame(); return; }
          this.keys[e.code] = true;
          return;
        }
        if (e.code === 'KeyP' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); return this.play(e.shiftKey); }
        this.editor.keydown(e);
      });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; this.editor.keyup(e); });
      window.addEventListener('blur', () => { this.keys = {}; });
      window.addEventListener('hashchange', () => {
        const m = location.hash.match(/[#&]L=([\w-]+)/);
        const lv = m && PF.decode(m[1]);
        if (lv && PF.encode(lv) !== PF.encode(this.level)) { if (this.mode === 'play') this.stop(); this.editor.replaceLevel(lv); this.toast('已载入链接中的关卡'); }
      });
    },
  };

  window.app = app;
  app.init();
})();
