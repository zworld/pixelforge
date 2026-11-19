/* PixelForge — 应用主程序：3D 编排、移动端多点触控手柄、微顿帧/残影 Juice、幽灵竞速、异步 AI 验关与主题持久化 */
(function () {
  'use strict';
  const PF = window.PF;
  const T = PF.TILE;
  const $ = (id) => document.getElementById(id);
  const STORE_KEY = 'pixelforge.level.v2';
  const PB_KEY = 'pixelforge.pbs.v1';

  const detectTouchDevice = () =>
    (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    navigator.maxTouchPoints > 0 ||
    window.innerWidth <= 860;

  const app = {
    level: null,
    mode: 'edit',
    cam: { tx: 10, ty: -7.5, dist: 24, yaw: -0.14, pitch: 0.14 },
    editCam: null,
    game: null,
    start: null,
    activeCheckpoint: null,
    particles: [],
    afterimages: [],
    keys: {},
    touchInput: { left: false, right: false, up: false, down: false, jump: false, dash: false },
    touchEnabled: detectTouchDevice(),
    touchManual: false,
    t: 0,
    deaths: 0,
    deadTimer: 0,
    hitstop: 0,
    shake: 0,
    lastInit: 0,
    frameCount: 0,
    switchFlashTimer: 0,
    // 轨迹与幽灵竞速
    showTrail: true,
    playTrail: null,
    runRecording: [],
    ghostCache: {},
    activeGhost: null,
    pbStore: {},
    lastWinRecord: null,
    // AI 验关与演示
    aiTask: null,
    aiSolution: null,
    aiPlayback: null,

    init() {
      this.loadPBs();
      this.renderer = new PF.Renderer3D($('stage'));
      this.canvas = this.renderer.canvas;
      this.editor = new PF.Editor(this);
      this.editor.buildPalette($('palette'));
      this.editor.bind(this.canvas);
      this.loadInitial();
      this.renderer.setLevel(this.level);
      this.syncThemeUI();
      this.syncToolButtons();
      this.fitView();
      this.bindUI();
      this.bindTouchControls();
      this.updateStatus();

      const onResize = () => {
        this.renderer.resize();
        if (!this.touchManual) {
          this.touchEnabled = detectTouchDevice();
          this.syncToolButtons();
        }
        if (this.mode === 'play' && this.game) this.applyPlayCameraDist();
        this.updateStatus();
      };
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', () => setTimeout(onResize, 120));

      // iOS / 移动端首次触摸解锁 WebAudio 上下文
      const unlockAudio = () => {
        PF.Audio.ensure();
        window.removeEventListener('pointerdown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('pointerdown', unlockAudio, { passive: true });
      window.addEventListener('touchstart', unlockAudio, { passive: true });

      let last = performance.now(), acc = 0;
      const frame = (now) => {
        const dt = Math.min(0.1, (now - last) / 1000);
        last = now;
        this.t += dt;
        if (this.mode === 'play') {
          if (this.hitstop > 0) {
            this.hitstop = Math.max(0, this.hitstop - dt);
          } else {
            acc += dt;
            while (acc >= PF.DT) {
              this.tick();
              acc -= PF.DT;
              if (this.hitstop > 0) { acc = 0; break; }
            }
          }
        } else {
          acc = 0;
        }
        this.updateEffects(dt);
        this.draw();
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    },

    haptic(ms) {
      if (this.touchEnabled && navigator.vibrate) {
        try { navigator.vibrate(ms); } catch (e) { /* ignore */ }
      }
    },

    markDirty() {
      if (this.renderer) this.renderer.dirty = true;
    },

    loadPBs() {
      try {
        const raw = localStorage.getItem(PB_KEY);
        if (raw) this.pbStore = JSON.parse(raw) || {};
      } catch (e) { this.pbStore = {}; }
    },
    savePBs() {
      try { localStorage.setItem(PB_KEY, JSON.stringify(this.pbStore)); } catch (e) { /* ignore */ }
    },

    loadInitial() {
      const m = location.hash.match(/[#&]L=([\w-]+)/);
      if (m) {
        const lv = PF.decode(m[1]);
        if (lv) {
          this.level = lv;
          this.toast(this.touchEnabled ? '已载入分享关卡！点「▶ 试玩」立即开玩 🎉' : '已从分享链接载入 3D 关卡 🎉');
          return;
        }
        this.toast('分享链接无效，已载入本地关卡');
      }
      const saved = localStorage.getItem(STORE_KEY) || localStorage.getItem('pixelforge.level.v1');
      const lv = saved && PF.decode(saved);
      this.level = lv || PF.sampleLevel();
    },

    syncThemeUI() {
      const th = this.level.theme || 'meadow';
      $('selTheme').value = th;
    },

    syncToolButtons() {
      $('btnBrush').classList.toggle('active', this.editor.paintMode === 'brush');
      $('btnRect').classList.toggle('active', this.editor.paintMode === 'rect');
      $('btnHand').classList.toggle('active', this.editor.paintMode === 'hand');
      $('btnTrail').classList.toggle('active', this.showTrail);
      $('btnBgm').classList.toggle('active', PF.Audio.bgmOn);
      $('btnTouchToggle').classList.toggle('active', this.touchEnabled);
      this.syncTouchVisibility();
    },

    syncTouchVisibility() {
      const show = this.mode === 'play' && this.touchEnabled && !this.aiPlayback;
      $('touchControls').classList.toggle('hidden', !show);
      $('playTip').innerHTML = this.touchEnabled
        ? '左摇杆移动/瞄准 · <b>⬆ 跳跃</b>（贴墙可蹬墙跳）· <b>⚡ 冲刺</b>（可破砖/撞开关）'
        : '←→/AD 移动 · 空格/↑ 跳跃（贴墙可蹬墙跳） · <b>Shift/X/J</b> 八向冲刺（可破砖/撞开关）';
    },

    resetTouchInput() {
      const ti = this.touchInput;
      ti.left = ti.right = ti.up = ti.down = ti.jump = ti.dash = false;
      const knob = $('touchKnob');
      if (knob) knob.style.transform = 'translate(-50%, -50%)';
      $('btnTouchJump').classList.remove('pressed');
      $('btnTouchDash').classList.remove('pressed');
    },

    invalidateAI() {
      if (this.aiTask) { this.aiTask.cancelled = true; this.aiTask = null; }
      this.aiSolution = null;
      $('btnAiCheck').textContent = '🤖 AI 验关';
      $('btnAiWatch').classList.add('hidden');
    },

    onLevelChanged(structural) {
      this.markDirty();
      this.invalidateAI();
      this.syncThemeUI();
      clearTimeout(this._saveT);
      this._saveT = setTimeout(() => {
        try { localStorage.setItem(STORE_KEY, PF.encode(this.level)); } catch (e) { /* 存储满 */ }
      }, 250);
      if (structural) {
        this.playTrail = null;
        this.renderer.setLevel(this.level);
        this.fitView();
      }
      this.updateStatus();
    },

    fitView() {
      const r = this.renderer;
      const L = this.level;
      const tanHalf = Math.tan((r.camera.fov * Math.PI) / 360);
      const aspect = Math.max(0.45, r.w / r.h);
      const distH = (L.h + 3.5) / (2 * tanHalf);
      // 竖屏手机避免拉得太远导致方块过小：横向至少展示 14 格、桌面展示 22 格
      const minCols = aspect < 0.85 ? Math.min(L.w + 1, 14.5) : Math.min(L.w + 2, 22);
      const distW = minCols / (2 * tanHalf * aspect);
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

    applyPlayCameraDist() {
      const r = this.renderer;
      const tanHalf = Math.tan((r.camera.fov * Math.PI) / 360);
      const aspect = Math.max(0.45, r.w / r.h);
      const distH = Math.min(this.level.h + 2, 17) / (2 * tanHalf);
      // 手机竖屏保证水平至少可见 14 格，提前看清前方尖刺与深渊
      const distW = aspect < 0.85 ? 14.5 / (2 * tanHalf * aspect) : 0;
      this.cam.dist = Math.max(12, Math.min(42, Math.max(distH, distW)));
    },

    // ---- 试玩 & AI 演示 ----
    play(fromCursor, aiDemo = null) {
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
      this.activeCheckpoint = null;
      this.aiPlayback = aiDemo ? { path: aiDemo.path, hold: aiDemo.hold, stepIdx: 0, frameInHold: 0 } : null;
      this.editCam = { ...this.cam };
      this.mode = 'play';
      this.deaths = 0;
      this.currentLevelCode = PF.encode(L);
      this.activeGhost = (!fromCursor && !aiDemo) ? (this.ghostCache[this.currentLevelCode] || null) : null;
      this.resetTouchInput();

      $('editTools').classList.add('hidden');
      $('playTools').classList.remove('hidden');
      $('palette').classList.add('hidden');
      $('hud').classList.remove('hidden');
      $('playModeBadge').classList.toggle('hidden', !aiDemo);
      document.body.classList.add('playing');
      this.syncTouchVisibility();
      this.renderer.resize();
      this.resetGame(true);
      this.canvas.focus();
      PF.Audio.startBgm(L.theme || 'meadow');
      this.updateStatus();
    },

    resetGame(fullReset = false) {
      if (fullReset) this.activeCheckpoint = null;
      const t0 = performance.now();
      this.game = PF.newState(this.level, this.start, { checkpoint: this.activeCheckpoint });
      this.lastInit = performance.now() - t0;
      this.deadTimer = 0;
      this.hitstop = 0;
      this.frameCount = 0;
      this.particles = [];
      this.afterimages = [];
      this.runRecording = [];
      this.lastWinRecord = null;
      if (!this.aiPlayback) this.playTrail = { points: [], diedAt: null };
      if (this.aiPlayback) { this.aiPlayback.stepIdx = 0; this.aiPlayback.frameInHold = 0; }
      this.markDirty();
      this.applyPlayCameraDist();
      this.cam.yaw = -0.10;
      this.cam.pitch = 0.12;
      this.followCamera(true);
      this.updateHUD();
      this.updateStatus();
    },

    stop() {
      this.mode = 'edit';
      this.game = null;
      this.aiPlayback = null;
      this.activeCheckpoint = null;
      this.resetTouchInput();
      PF.Audio.stopBgm();
      $('editTools').classList.remove('hidden');
      $('playTools').classList.add('hidden');
      $('palette').classList.remove('hidden');
      $('hud').classList.add('hidden');
      $('playTip').classList.add('hidden');
      $('winOverlay').classList.add('hidden');
      $('deadFlash').classList.add('hidden');
      $('switchFlash').classList.add('hidden');
      $('playModeBadge').classList.add('hidden');
      $('touchControls').classList.add('hidden');
      document.body.classList.remove('playing');
      this.renderer.resize();
      if (this.editCam) this.cam = { ...this.editCam };
      this.particles = [];
      this.afterimages = [];
      this.markDirty();
      this.updateStatus();
    },

    input() {
      if (this.aiPlayback) {
        const ai = this.aiPlayback;
        const a = ai.path[ai.stepIdx] || {};
        ai.frameInHold++;
        if (ai.frameInHold >= ai.hold) { ai.frameInHold = 0; ai.stepIdx++; }
        return a;
      }
      const k = this.keys;
      const ti = this.touchInput;
      const inp = {
        left: !!(k.ArrowLeft || k.KeyA || ti.left),
        right: !!(k.ArrowRight || k.KeyD || ti.right),
        up: !!(k.ArrowUp || k.KeyW || ti.up),
        down: !!(k.ArrowDown || k.KeyS || ti.down),
        jump: !!(k.Space || k.ArrowUp || k.KeyW || k.KeyZ || k.KeyK || ti.jump),
        dash: !!(k.ShiftLeft || k.ShiftRight || k.KeyX || k.KeyJ || k.KeyL || ti.dash),
      };
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = pads && pads[0];
      if (pad) {
        if (pad.axes[0] < -0.35 || pad.buttons[14]?.pressed) inp.left = true;
        if (pad.axes[0] > 0.35 || pad.buttons[15]?.pressed) inp.right = true;
        if (pad.axes[1] < -0.35 || pad.buttons[12]?.pressed) inp.up = true;
        if (pad.axes[1] > 0.35 || pad.buttons[13]?.pressed) inp.down = true;
        if (pad.buttons[0]?.pressed || pad.buttons[1]?.pressed) inp.jump = true;
        if (pad.buttons[2]?.pressed || pad.buttons[5]?.pressed || pad.buttons[7]?.pressed) inp.dash = true;
      }
      return inp;
    },

    tick() {
      const g = this.game;
      if (g.dead) {
        this.deadTimer += PF.DT;
        if (this.deadTimer > 0.65) { this.deaths++; this.resetGame(false); }
        return;
      }
      if (g.won) return;

      this.frameCount++;
      PF.step(this.level, g, this.input());
      for (const ev of g.events) this.onEvent(ev);

      if (g.dashTimer > 0 && this.frameCount % 2 === 0) {
        this.afterimages.unshift({
          x: (g.px + 6) / T,
          y: -(g.py + 14) / T,
          facing: g.facing,
          life: 0.24, max: 0.24, color: '#38bdf8',
        });
        if (this.afterimages.length > 9) this.afterimages.pop();
      }
      if (g.wallDir !== 0 && this.frameCount % 5 === 0) {
        this.particles.push({
          x: g.wallDir > 0 ? g.px + 12 : g.px,
          y: g.py + 8, z: 0,
          vx: -g.wallDir * (12 + Math.random() * 18),
          vy: -10 - Math.random() * 15,
          vz: (Math.random() - 0.5) * 1.5,
          life: 0.28, max: 0.28, color: '#e2e8f0', g: 90, s: 2,
        });
      }

      if (!this.aiPlayback) {
        if (this.frameCount % 3 === 0 && this.playTrail) {
          this.playTrail.points.push({ x: (g.px + 6) / T, y: -(g.py + 7) / T });
          if (this.playTrail.points.length > 800) this.playTrail.points.shift();
        }
        if (!this.start && this.runRecording.length < 7200) {
          this.runRecording.push([g.px, g.py, g.facing]);
        }
      }

      this.followCamera(false);
    },

    onEvent(ev) {
      PF.Audio.play(ev.type, ev);
      if (ev.type === 'coin' || ev.type === 'break' || ev.type === 'switch') this.markDirty();

      const burst = (n, color, speed, life, grav = 300) => {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2, v = speed * (0.4 + Math.random() * 0.6);
          this.particles.push({
            x: ev.x, y: ev.y, z: (Math.random() - 0.5) * 0.45,
            vx: Math.cos(a) * v, vy: Math.sin(a) * v - speed * 0.3, vz: (Math.random() - 0.5) * 3.8,
            life, max: life,
            color: Array.isArray(color) ? color[i % color.length] : color,
            g: grav, s: 2,
          });
        }
      };

      switch (ev.type) {
        case 'jump':
          burst(5, '#e5e7eb', 42, 0.26, 0);
          break;
        case 'walljump':
          burst(9, '#bae6fd', 85, 0.32, 120);
          this.haptic(8);
          break;
        case 'dash':
          burst(16, ['#38bdf8', '#e0f2fe', '#7dd3fc'], 140, 0.36, 0);
          this.hitstop = Math.max(this.hitstop, 0.032);
          this.shake = Math.max(this.shake, 0.14);
          this.haptic(12);
          break;
        case 'wavedash':
          burst(22, ['#38bdf8', '#facc15', '#ffffff'], 175, 0.44, 60);
          this.hitstop = Math.max(this.hitstop, 0.04);
          this.shake = Math.max(this.shake, 0.18);
          this.haptic(16);
          break;
        case 'coin':
          burst(10, ['#fde047', '#ffffff'], 100, 0.42, 0);
          break;
        case 'crystal':
          burst(18, ['#34d399', '#6ee7b7', '#ffffff'], 135, 0.48, 0);
          this.hitstop = Math.max(this.hitstop, 0.042);
          this.shake = Math.max(this.shake, 0.12);
          this.haptic(10);
          break;
        case 'switch':
          burst(20, ev.on ? ['#ef4444', '#fca5a5'] : ['#3b82f6', '#93c5fd'], 160, 0.5, 80);
          this.hitstop = Math.max(this.hitstop, 0.036);
          this.shake = Math.max(this.shake, 0.15);
          this.switchFlashTimer = 0.18;
          this.haptic(12);
          $('switchFlash').style.background = ev.on ? 'rgba(239, 68, 68, 0.16)' : 'rgba(59, 130, 246, 0.18)';
          $('switchFlash').classList.remove('hidden');
          break;
        case 'crumbleBreak':
          burst(14, ['#9ca3af', '#64748b'], 120, 0.55, 600);
          break;
        case 'checkpoint':
          this.activeCheckpoint = { x: this.game.checkpoint.x, y: this.game.checkpoint.y };
          burst(26, ['#38bdf8', '#fde047', '#ffffff'], 165, 0.72, 120);
          this.haptic(14);
          this.toast('🚩 存档点已激活！');
          break;
        case 'stomp':
          burst(14, ['#a78bfa', '#ffffff'], 135, 0.48, 220);
          this.hitstop = Math.max(this.hitstop, 0.045);
          this.shake = Math.max(this.shake, 0.14);
          this.haptic(12);
          break;
        case 'break':
          burst(18, ['#c8642c', '#e8915a', '#7a3412'], 175, 0.68, 700);
          this.hitstop = Math.max(this.hitstop, 0.042);
          this.shake = Math.max(this.shake, 0.13);
          this.haptic(10);
          break;
        case 'spring':
          burst(10, ['#ff8a80', '#fde047'], 80, 0.34, 0);
          this.haptic(10);
          break;
        case 'die':
          burst(32, ['#2f80ed', '#38bdf8', '#ffffff'], 220, 0.78, 500);
          this.hitstop = Math.max(this.hitstop, 0.068);
          this.shake = Math.max(this.shake, 0.32);
          this.haptic(26);
          if (this.playTrail) this.playTrail.diedAt = { x: ev.x / T, y: -ev.y / T };
          break;
        case 'win':
          burst(60, ['#22c55e', '#facc15', '#38bdf8', '#f472b6'], 240, 1.5, 200);
          this.haptic(20);
          this.handleWin();
          break;
      }
    },

    handleWin() {
      const g = this.game;
      if (this.aiPlayback || this.start || this.activeCheckpoint) {
        this.lastWinRecord = this.aiPlayback ? '🤖 AI 演示通关完成！' : null;
        return;
      }
      const code = this.currentLevelCode;
      const prev = this.pbStore[code];
      const isNew = prev == null || g.time < prev;
      if (isNew) {
        this.pbStore[code] = g.time;
        this.savePBs();
        this.ghostCache[code] = { time: g.time, frames: this.runRecording.slice() };
        this.lastWinRecord = prev == null
          ? `🏆 首次通关纪录 ${g.time.toFixed(2)}s！下次重玩自动开启金色幽灵竞速`
          : `🏆 刷新纪录 ${g.time.toFixed(2)}s（提升 ${(prev - g.time).toFixed(2)}s）！`;
      } else {
        this.lastWinRecord = `最快纪录 ${prev.toFixed(2)}s（本次 +${(g.time - prev).toFixed(2)}s）`;
      }
    },

    updateEffects(dt) {
      for (const p of this.particles) {
        p.life -= dt;
        p.vy += p.g * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.z = (p.z || 0) + (p.vz || 0) * dt;
      }
      this.particles = this.particles.filter((p) => p.life > 0);
      for (const a of this.afterimages) a.life -= dt;
      this.afterimages = this.afterimages.filter((a) => a.life > 0);
      this.shake = Math.max(0, this.shake - dt);
      if (this.switchFlashTimer > 0) {
        this.switchFlashTimer = Math.max(0, this.switchFlashTimer - dt);
        $('switchFlash').style.opacity = String(this.switchFlashTimer / 0.18);
        if (this.switchFlashTimer <= 0) $('switchFlash').classList.add('hidden');
      }
    },

    followCamera(snap) {
      const g = this.game, r = this.renderer, cam = this.cam, L = this.level;
      const vis = r.visibleSize(cam);
      const px = (g.px + 6) / T;
      const py = -(g.py + 7) / T;
      let tx = px + g.facing * Math.min(2.6, vis.w * 0.085);
      // 手机端触屏手柄位于底部，画面焦点略微下偏使主角居于中上部视野更开阔
      const yBias = this.touchEnabled ? -vis.h * 0.04 : vis.h * 0.05;
      let ty = py + yBias;
      const halfW = Math.min(L.w / 2, vis.w * 0.44);
      const halfH = Math.min(L.h / 2, vis.h * 0.44);
      tx = Math.max(halfW, Math.min(L.w - halfW, tx));
      ty = Math.max(-L.h + halfH, Math.min(-halfH, ty));
      if (snap) { cam.tx = tx; cam.ty = ty; return; }
      cam.tx += (tx - cam.tx) * 0.16;
      cam.ty += (ty - cam.ty) * 0.12;
    },

    updateHUD() {
      const g = this.game;
      if (!g || this.mode !== 'play') return;
      $('hudCoins').textContent = `🪙 ${g.coins}/${g.totalCoins}`;
      $('hudTime').textContent = `⏱ ${g.time.toFixed(2)}s`;
      $('hudDeaths').textContent = `💀 ${this.deaths}`;

      const dashEl = $('hudDash');
      const dashReady = g.dashes > 0 || g.dashTimer > 0;
      if (g.dashTimer > 0) {
        dashEl.textContent = '⚡ 冲刺中!';
        dashEl.className = 'hud-pill dash-ready';
      } else if (g.dashes > 0) {
        dashEl.textContent = '⚡ 冲刺就绪';
        dashEl.className = 'hud-pill dash-ready';
      } else {
        dashEl.textContent = '⚡ 充能中';
        dashEl.className = 'hud-pill dash-spent';
      }
      $('btnTouchDash').classList.toggle('spent', !dashReady);

      const hasSwitch = this.level.tiles.includes('T') || this.level.tiles.includes('R') || this.level.tiles.includes('U');
      const swEl = $('hudSwitch');
      swEl.classList.toggle('hidden', !hasSwitch);
      if (hasSwitch) {
        swEl.textContent = g.switchOn ? '🔴 ON' : '🔵 OFF';
        swEl.className = `hud-pill ${g.switchOn ? 'switch-on' : 'switch-off'}`;
      }

      const pb = this.pbStore[this.currentLevelCode];
      const pbEl = $('hudPb');
      pbEl.classList.toggle('hidden', pb == null);
      if (pb != null) pbEl.textContent = `🏆 最快 ${pb.toFixed(2)}s`;

      $('playTip').classList.toggle('hidden', !(!this.aiPlayback && g.time < 3.5 && this.deaths === 0 && !g.won && !g.dead));
      $('winOverlay').classList.toggle('hidden', !g.won);
      if (g.won) {
        const coinRate = g.totalCoins > 0 ? g.coins / g.totalCoins : 1;
        const stars = 1 + (coinRate >= 0.5 ? 1 : 0) + (this.deaths === 0 ? 1 : 0);
        const rank = (this.deaths === 0 && coinRate >= 0.75) ? 'S' : (this.deaths === 0 ? 'A' : (stars >= 2 ? 'B' : 'C'));
        $('winRank').textContent = rank;
        $('winStars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        $('winStats').textContent = `用时 ${g.time.toFixed(2)}s · 金币 ${g.coins}/${g.totalCoins} · 死亡 ${this.deaths} 次`;
        const recEl = $('winRecord');
        recEl.classList.toggle('hidden', !this.lastWinRecord);
        if (this.lastWinRecord) recEl.textContent = this.lastWinRecord;
      }
      const flash = $('deadFlash');
      flash.classList.toggle('hidden', !g.dead);
      if (g.dead) flash.style.opacity = String(Math.max(0, 1 - this.deadTimer / 0.65));
    },

    // ---- 移动端多点触控虚拟手柄 ----
    bindTouchControls() {
      const stick = $('touchStick');
      const knob = $('touchKnob');
      const btnJump = $('btnTouchJump');
      const btnDash = $('btnTouchDash');
      let stickPid = null;

      const updateStick = (clientX, clientY) => {
        const rect = stick.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxR = rect.width * 0.34;
        const dx = clientX - cx;
        const dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        const clamped = Math.min(dist, maxR);
        const angle = Math.atan2(dy, dx);
        const kx = dist > 0 ? Math.cos(angle) * clamped : 0;
        const ky = dist > 0 ? Math.sin(angle) * clamped : 0;
        knob.style.transform = `translate(calc(-50% + ${kx.toFixed(1)}px), calc(-50% + ${ky.toFixed(1)}px))`;

        const nx = dx / maxR;
        const ny = dy / maxR;
        const dead = 0.24;
        this.touchInput.left = nx < -dead;
        this.touchInput.right = nx > dead;
        this.touchInput.up = ny < -0.45;
        this.touchInput.down = ny > 0.45;
      };

      const releaseStick = () => {
        stickPid = null;
        this.touchInput.left = this.touchInput.right = this.touchInput.up = this.touchInput.down = false;
        knob.style.transform = 'translate(-50%, -50%)';
      };

      const takeoverAi = () => {
        if (this.aiPlayback) {
          this.aiPlayback = null;
          $('playModeBadge').classList.add('hidden');
          this.syncTouchVisibility();
          this.toast('已切换为手动接管！');
        }
      };

      stick.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        takeoverAi();
        stickPid = e.pointerId;
        try { stick.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        updateStick(e.clientX, e.clientY);
      });
      stick.addEventListener('pointermove', (e) => {
        if (e.pointerId !== stickPid) return;
        e.preventDefault();
        updateStick(e.clientX, e.clientY);
      });
      const endStick = (e) => { if (stickPid !== null && (e.pointerId === stickPid || e.type === 'lostpointercapture')) releaseStick(); };
      stick.addEventListener('pointerup', endStick);
      stick.addEventListener('pointercancel', endStick);
      stick.addEventListener('lostpointercapture', endStick);
      window.addEventListener('pointerup', endStick);

      const bindActionBtn = (el, key) => {
        const pids = new Set();
        el.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          takeoverAi();
          pids.add(e.pointerId);
          try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          this.touchInput[key] = true;
          el.classList.add('pressed');
        });
        const release = (e) => {
          if (e.type === 'lostpointercapture') pids.clear();
          else pids.delete(e.pointerId);
          if (pids.size === 0) {
            this.touchInput[key] = false;
            el.classList.remove('pressed');
          }
        };
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('lostpointercapture', release);
      };
      bindActionBtn(btnJump, 'jump');
      bindActionBtn(btnDash, 'dash');
    },

    // ---- 异步浏览器内 AI 验关 ----
    startAiCheck() {
      if (this.aiTask) {
        this.aiTask.cancelled = true;
        this.aiTask = null;
        $('btnAiCheck').textContent = '🤖 AI 验关';
        return this.toast('已取消 AI 验关');
      }
      if (!PF.find(this.level, 'P') || !PF.find(this.level, 'G')) {
        return this.toast('请先放置起点和终点再进行 AI 验关');
      }
      const code = PF.encode(this.level);
      const solver = PF.createSolver(this.level, { width: 300, hold: 5, maxDepth: 650 });
      const task = { cancelled: false, code, solver };
      this.aiTask = task;
      $('btnAiWatch').classList.add('hidden');
      $('btnAiCheck').textContent = '⏳ AI 寻路中...';

      const pump = () => {
        if (task.cancelled) return;
        const st = solver.stepBatch(12);
        if (!st.done) {
          $('btnAiCheck').textContent = `⏳ 验关中 ${(st.explored / 1000).toFixed(0)}k`;
          requestAnimationFrame(pump);
          return;
        }
        this.aiTask = null;
        if (st.result) {
          this.aiSolution = { code, result: st.result };
          $('btnAiCheck').textContent = `✅ 已验关 (${st.result.time.toFixed(1)}s)`;
          $('btnAiWatch').classList.remove('hidden');
          this.toast(`🤖 AI 验证可通关！用时 ${st.result.time.toFixed(2)}s，可点击“AI 演示”观战`);
        } else {
          $('btnAiCheck').textContent = '⚠️ 未找到路线';
          this.toast('AI 未在预算内找到通关路径，请检查跳距或机关设置');
        }
      };
      requestAnimationFrame(pump);
    },

    // ---- 渲染 ----
    draw() {
      const L = this.level;
      const cam = this.cam;
      const drawCam = this.shake > 0
        ? { ...cam, tx: cam.tx + (Math.random() - 0.5) * 0.35, ty: cam.ty + (Math.random() - 0.5) * 0.35 }
        : cam;
      if (this.mode === 'play') this.updateHUD();

      let ghostPos = null;
      if (this.mode === 'play' && this.activeGhost && this.activeGhost.frames.length) {
        const fi = Math.min(this.activeGhost.frames.length - 1, this.frameCount);
        const f = this.activeGhost.frames[fi];
        if (f) ghostPos = { px: f[0], py: f[1], facing: f[2] };
      }

      this.renderer.render({
        level: L,
        t: this.t,
        cam: drawCam,
        mode: this.mode,
        hover: this.editor.hover,
        hoverRect: this.editor.rectDrag,
        tool: this.editor.tool,
        game: this.game,
        particles: this.particles,
        afterimages: this.afterimages,
        trail: this.playTrail,
        showTrail: this.showTrail,
        ghostPos,
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
      this._toastT = setTimeout(() => el.classList.remove('show'), 2500);
    },
    updateStatus() {
      const L = this.level;
      if (!L) return;
      const th = PF.THEMES[L.theme || 'meadow'] || PF.THEMES.meadow;
      let s;
      if (this.mode === 'play') {
        const initMs = this.lastInit != null ? this.lastInit.toFixed(2) : '0.00';
        const modeTag = this.aiPlayback ? 'AI 演示中' : '3D 试玩中';
        s = `${modeTag} · 主题：${th.icon} ${th.name} · 初始化 ${initMs}ms · Shift/X 冲刺 · 贴墙可蹬墙跳 · Esc 返回编辑`;
      } else {
        const tool = this.editor.tool === '.' ? '橡皮擦' : PF.TILES[this.editor.tool].name;
        const pMode = this.editor.paintMode === 'rect' ? '矩形框选' : (this.editor.paintMode === 'hand' ? '抓手平移' : '自由画笔');
        const h = this.editor.hover;
        const pos = h && PF.inBounds(L, h.x, h.y) ? `(${h.x}, ${h.y})` : '—';
        const zoomPct = Math.round((24 / this.cam.dist) * 100);
        if (window.innerWidth <= 500) {
          s = `${pMode} · ${tool} · ${th.icon} · ${L.w}×${L.h} · ${zoomPct}% · 双指缩放`;
        } else {
          const hint = window.innerWidth <= 860 ? '双指缩放平移' : `光标 ${pos}`;
          s = `${pMode} · ${tool} · ${hint} · ${L.w}×${L.h} · ${th.icon}${th.name} · ${zoomPct}% · 已自动保存`;
        }
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
      $('btnRestart').onclick = () => { this.deaths = 0; this.resetGame(true); };
      $('btnWinReplay').onclick = () => { this.deaths = 0; this.resetGame(true); };
      $('btnWinEdit').onclick = () => this.stop();
      $('btnBrush').onclick = () => this.editor.setPaintMode('brush');
      $('btnRect').onclick = () => this.editor.setPaintMode('rect');
      $('btnHand').onclick = () => this.editor.setPaintMode(this.editor.paintMode === 'hand' ? 'brush' : 'hand');
      $('btnUndo').onclick = () => this.editor.undo();
      $('btnRedo').onclick = () => this.editor.redo();
      $('btnAiCheck').onclick = () => this.startAiCheck();
      $('btnAiWatch').onclick = () => {
        if (this.aiSolution) this.play(false, this.aiSolution.result);
      };
      $('btnTrail').onclick = () => {
        this.showTrail = !this.showTrail;
        this.syncToolButtons();
        this.toast(this.showTrail ? '已开启试玩轨迹辅助线' : '已隐藏试玩轨迹');
      };
      $('btnTouchToggle').onclick = () => {
        this.touchManual = true;
        this.touchEnabled = !this.touchEnabled;
        this.resetTouchInput();
        this.syncToolButtons();
        this.toast(this.touchEnabled ? '🎮 虚拟触屏手柄已开启' : '🎮 虚拟触屏手柄已隐藏');
      };
      $('btnBgm').onclick = () => {
        const on = PF.Audio.toggleBgm(this.mode === 'play', this.level.theme || 'meadow');
        this.syncToolButtons();
        this.toast(on ? '🎵 主题 BGM 已开启' : '🔇 主题 BGM 已静音');
      };

      $('selTheme').onchange = (e) => {
        const next = PF.cloneLevel(this.level);
        next.theme = e.target.value;
        this.editor.replaceLevel(next);
        const th = PF.THEMES[next.theme];
        this.toast(`已切换至 ${th.icon} ${th.name} 主题`);
      };
      $('selPreset').onchange = (e) => {
        const id = e.target.value;
        e.target.value = '';
        if (!id) return;
        const p = PF.PRESETS.find((x) => x.id === id);
        if (!p) return;
        this.editor.replaceLevel(p.build());
        this.toast(`已载入精品关卡：${p.name}（可撤销）`);
      };

      $('btnShare').onclick = async () => {
        const url = this.shareURL();
        history.replaceState(null, '', url);
        const ok = await this.copy(url);
        if (ok) return this.toast(`分享链接已复制（${url.length} 字符）`);
        if (navigator.share) {
          try { await navigator.share({ title: 'PixelForge 3D 关卡', url }); return; } catch (e) { /* cancel */ }
        }
        this.toast('复制失败，请手动复制地址栏');
      };
      $('btnExport').onclick = () => {
        const data = JSON.stringify({ format: 'pixelforge', version: 2, theme: this.level.theme || 'meadow', w: this.level.w, h: this.level.h, code: PF.encode(this.level) }, null, 2);
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
        a.download = `pixelforge-${this.level.theme || 'level'}-${Date.now()}.json`;
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
      $('btnClear').onclick = () => {
        const L = PF.createLevel(this.level.w, this.level.h, this.level.theme || 'meadow');
        for (let x = 0; x < L.w; x++) { PF.set(L, x, L.h - 1, '#'); PF.set(L, x, L.h - 2, '#'); }
        PF.set(L, 2, L.h - 3, 'P');
        PF.set(L, L.w - 3, L.h - 3, 'G');
        this.editor.replaceLevel(L);
        this.toast('已清空（保留地面/起点/终点，可撤销）');
      };

      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        if (this.mode === 'play') {
          if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
          if (e.key === 'Escape') return this.stop();
          if (e.code === 'KeyR' || (e.key === 'Enter' && this.game.won)) {
            this.deaths = 0;
            this.resetGame(true);
            return;
          }
          if (this.aiPlayback && ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
            this.aiPlayback = null;
            $('playModeBadge').classList.add('hidden');
            this.syncTouchVisibility();
            this.toast('已切换为手动接管！');
          }
          this.keys[e.code] = true;
          return;
        }
        if (e.code === 'KeyP' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); return this.play(e.shiftKey); }
        this.editor.keydown(e);
      });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; this.editor.keyup(e); });
      window.addEventListener('blur', () => { this.keys = {}; this.resetTouchInput(); });
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
