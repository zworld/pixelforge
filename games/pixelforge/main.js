/* Game 1: PixelForge · 3D 关卡工坊 — 接入 Studio 多游戏契约 */
(function () {
  'use strict';
  const Studio = window.Studio;
  const PF = window.PF;
  const T = PF.TILE;

  const LEGACY_STORE_KEY = 'pixelforge.level.v2';
  const LEGACY_PB_KEY = 'pixelforge.pbs.v1';

  Studio.defineGame('pixelforge', (ctx) => {
    const $ = (id) => document.getElementById(id);

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
      t: 0,
      deaths: 0,
      deadTimer: 0,
      shake: 0,
      lastInit: 0,
      frameCount: 0,
      switchFlashTimer: 0,
      showTrail: true,
      playTrail: null,
      runRecording: [],
      ghostCache: {},
      activeGhost: null,
      pbStore: {},
      lastWinRecord: null,
      aiTask: null,
      aiSolution: null,
      aiPlayback: null,
      loop: null,
      _saveT: null,
      _keydownFn: null,
      _keyupFn: null,

      mountDOM() {
        ctx.topbarSlot.innerHTML = `
          <div class="group" id="pfEditTools">
            <button id="btnPlay" class="primary" title="试玩 (P)，Shift+P 从光标处试玩">▶ 试玩</button>
            <button id="btnBrush" class="toggle active" title="自由画笔 (B)">✏️ 画笔</button>
            <button id="btnRect" class="toggle" title="矩形框选填充 (B)">▭ 框选</button>
            <button id="btnHand" class="toggle" title="单指拖动平移画布 (H)，移动端也可双指平移缩放">✋ 平移</button>
            <button id="btnUndo" title="撤销 (⌘/Ctrl+Z)">↶ 撤销</button>
            <button id="btnRedo" title="重做 (⌘/Ctrl+Shift+Z)">↷ 重做</button>
            <span class="sep"></span>
            <select id="selTheme" title="切换 3D 场景主题与配乐">
              <option value="meadow">🌿 翠绿草原</option>
              <option value="cyber">🌃 霓虹赛博</option>
              <option value="frost">❄️ 冰霜雪山</option>
              <option value="volcano">🌋 熔岩地堡</option>
            </select>
            <select id="selPreset" title="载入精品演示关卡">
              <option value="">🗺 精品关卡...</option>
              <option value="meadow">1. 翠绿启程（入门）</option>
              <option value="cyber">2. 红蓝律动（开关）</option>
              <option value="frost">3. 蔚蓝之巅（蹬墙/水晶）</option>
              <option value="volcano">4. 熔岩试炼（综合）</option>
            </select>
            <span class="sep"></span>
            <button id="btnAiCheck" class="accent" title="调用内置束搜索 AI 检验当前关卡是否可通关并生成演示录像">🤖 AI 验关</button>
            <button id="btnAiWatch" class="accent hidden" title="在 3D 场景中观看 AI 自动通关演示">🎬 AI 演示</button>
            <button id="btnTrail" class="toggle active" title="在编辑视图中显示上次试玩轨迹">👣 轨迹</button>
            <span class="sep"></span>
            <button id="btnShare" title="复制分享链接（含主题与全部机关）">🔗 分享</button>
            <button id="btnExport" title="导出关卡文件">⬇ 导出</button>
            <button id="btnImport" title="导入关卡文件">⬆ 导入</button>
            <button id="btnResize" title="修改关卡尺寸">📐 尺寸</button>
            <button id="btnClear" class="danger" title="清空关卡">🗑 清空</button>
          </div>
          <div class="group hidden" id="pfPlayTools">
            <button id="btnStop" class="primary">■ 编辑</button>
            <button id="btnRestart">↻ 重来</button>
            <button id="btnTouchToggle" class="toggle" title="开关虚拟触屏手柄">🎮 触屏键</button>
            <span id="playModeBadge" class="badge hidden">🤖 AI 自动演示中</span>
          </div>
          <input type="file" id="pfFileInput" accept=".json,.txt" hidden />
        `;

        ctx.sideSlot.innerHTML = `<div id="palette"></div>`;

        ctx.hudSlot.innerHTML = `
          <div id="hud" class="hidden">
            <span class="hud-pill gold" id="hudCoins">🪙 0/0</span>
            <span class="hud-pill mono" id="hudTime">⏱ 00.00s</span>
            <span class="hud-pill" id="hudDeaths">💀 0</span>
            <span class="hud-pill dash-ready" id="hudDash">⚡ 冲刺就绪</span>
            <span class="hud-pill switch-on hidden" id="hudSwitch">🔴 ON</span>
            <span class="hud-pill pb hidden" id="hudPb">🏆 最快 --</span>
          </div>
        `;

        ctx.floatSlot.innerHTML = `
          <button id="btnFloatRestart" title="从头重来">↻</button>
          <button id="btnFloatFs" title="全屏/横屏">⛶</button>
          <button id="btnFloatBgm" class="toggle active" title="音乐开关">🎵</button>
          <button id="btnFloatStop" class="primary" title="返回编辑">■ 编辑</button>
        `;

        ctx.overlaySlot.innerHTML = `
          <div id="playTip" class="hidden"></div>
          <div id="winOverlay" class="hidden">
            <div class="win-card">
              <div class="win-badge" id="winRank">S</div>
              <div class="win-title">🏁 通关！</div>
              <div class="win-stars" id="winStars">⭐⭐⭐</div>
              <div class="win-stats" id="winStats">用时 0.00s · 金币 0/0 · 死亡 0 次</div>
              <div class="win-record hidden" id="winRecord">🏆 刷新最快纪录！</div>
              <div class="win-actions">
                <button id="btnWinReplay" class="primary">↻ 再战一次 (R)</button>
                <button id="btnWinEdit">✏️ 返回编辑 (Esc)</button>
              </div>
            </div>
          </div>
          <div id="deadFlash" class="hidden"></div>
          <div id="switchFlash" class="hidden"></div>
        `;
      },

      loadPBs() {
        const stored = ctx.storage.getJSON('pbs', null);
        if (stored) { this.pbStore = stored; return; }
        try {
          const legacy = ctx.storage.getRaw(LEGACY_PB_KEY);
          if (legacy) this.pbStore = JSON.parse(legacy) || {};
        } catch (e) { this.pbStore = {}; }
      },
      savePBs() {
        ctx.storage.setJSON('pbs', this.pbStore);
      },

      loadInitial(payload) {
        if (payload) {
          const lv = PF.decode(payload);
          if (lv) {
            this.level = lv;
            ctx.toast(ctx.input.touchEnabled ? '已载入分享关卡！点「▶ 试玩」立即开玩 🎉' : '已从分享链接载入 3D 关卡 🎉');
            return;
          }
          ctx.toast('分享链接无效，已载入本地关卡');
        }
        const saved = ctx.storage.get('level') || ctx.storage.getRaw(LEGACY_STORE_KEY) || ctx.storage.getRaw('pixelforge.level.v1');
        const lv = saved && PF.decode(saved);
        this.level = lv || PF.sampleLevel();
      },

      markDirty() {
        if (this.renderer) this.renderer.dirty = true;
      },
      toast(msg) { ctx.toast(msg); },

      syncThemeUI() {
        const sel = $('selTheme');
        if (sel) sel.value = this.level.theme || 'meadow';
      },

      syncToolButtons() {
        if (!$('btnBrush')) return;
        $('btnBrush').classList.toggle('active', this.editor.paintMode === 'brush');
        $('btnRect').classList.toggle('active', this.editor.paintMode === 'rect');
        $('btnHand').classList.toggle('active', this.editor.paintMode === 'hand');
        $('btnTrail').classList.toggle('active', this.showTrail);
        $('btnTouchToggle').classList.toggle('active', ctx.input.touchEnabled);
        $('btnFloatBgm').classList.toggle('active', ctx.audio.bgmOn);
        this.syncTouchVisibility();
      },

      syncTouchVisibility() {
        const show = this.mode === 'play' && !this.aiPlayback;
        ctx.input.setVisible(show);
        const tip = $('playTip');
        if (tip) {
          tip.innerHTML = ctx.input.touchEnabled
            ? '左摇杆移动/瞄准 · <b>⬆ 跳跃</b>（贴墙可蹬墙跳）· <b>⚡ 冲刺</b>（可破砖/撞开关）'
            : '←→/AD 移动 · 空格/↑ 跳跃（贴墙可蹬墙跳） · <b>Shift/X/J</b> 八向冲刺（可破砖/撞开关）';
        }
      },

      invalidateAI() {
        if (this.aiTask) { this.aiTask.cancelled = true; this.aiTask = null; }
        this.aiSolution = null;
        if ($('btnAiCheck')) $('btnAiCheck').textContent = '🤖 AI 验关';
        if ($('btnAiWatch')) $('btnAiWatch').classList.add('hidden');
      },

      onLevelChanged(structural) {
        this.markDirty();
        this.invalidateAI();
        this.syncThemeUI();
        clearTimeout(this._saveT);
        this._saveT = setTimeout(() => {
          const code = PF.encode(this.level);
          ctx.storage.set('level', code);
          ctx.storage.setRaw(LEGACY_STORE_KEY, code);
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
        const mobileLandscape = r.h <= 540 && aspect > 1.35;
        const targetH = mobileLandscape ? Math.min(this.level.h + 1.5, 13.2) : Math.min(this.level.h + 2, 17);
        const distH = targetH / (2 * tanHalf);
        const distW = aspect < 0.85 ? 14.5 / (2 * tanHalf * aspect) : 0;
        this.cam.dist = Math.max(12, Math.min(42, Math.max(distH, distW)));
      },

      play(fromCursor, aiDemo = null) {
        const L = this.level;
        let start = null;
        if (fromCursor) {
          const h = this.editor.hover;
          if (!h || !PF.inBounds(L, h.x, h.y) || PF.isSolid(L.tiles[h.y * L.w + h.x])) {
            return ctx.toast('把鼠标移到关卡内的空位再按 Shift+P');
          }
          start = h;
        } else if (!PF.find(L, 'P')) {
          this.editor.setTool('P');
          return ctx.toast('先放一个起点（已切换到起点工具）');
        }
        if (!PF.find(L, 'G')) ctx.toast('提示：还没有终点，当前为自由试玩');
        this.editor.commit();
        this.start = start;
        this.activeCheckpoint = null;
        this.aiPlayback = aiDemo ? { path: aiDemo.path, hold: aiDemo.hold, stepIdx: 0, frameInHold: 0 } : null;
        this.editCam = { ...this.cam };
        this.mode = 'play';
        this.deaths = 0;
        this.currentLevelCode = PF.encode(L);
        this.activeGhost = (!fromCursor && !aiDemo) ? (this.ghostCache[this.currentLevelCode] || null) : null;
        ctx.input.resetTouch();

        $('pfEditTools').classList.add('hidden');
        $('pfPlayTools').classList.remove('hidden');
        ctx.sideSlot.classList.add('hidden');
        $('hud').classList.remove('hidden');
        ctx.floatSlot.classList.remove('hidden');
        $('playModeBadge').classList.toggle('hidden', !aiDemo);
        ctx.setPlaying(true);
        this.syncTouchVisibility();
        this.renderer.resize();
        this.resetGame(true);
        this.canvas.focus();
        ctx.audio.startBgm(L.theme || 'meadow');
        this.updateStatus();
      },

      resetGame(fullReset = false) {
        if (fullReset) this.activeCheckpoint = null;
        const t0 = performance.now();
        this.game = PF.newState(this.level, this.start, { checkpoint: this.activeCheckpoint });
        this.lastInit = performance.now() - t0;
        this.deadTimer = 0;
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
        ctx.input.resetTouch();
        ctx.input.setVisible(false);
        ctx.audio.stopBgm();
        $('pfEditTools').classList.remove('hidden');
        $('pfPlayTools').classList.add('hidden');
        ctx.sideSlot.classList.remove('hidden');
        $('hud').classList.add('hidden');
        ctx.floatSlot.classList.add('hidden');
        $('playTip').classList.add('hidden');
        $('winOverlay').classList.add('hidden');
        $('deadFlash').classList.add('hidden');
        $('switchFlash').classList.add('hidden');
        $('playModeBadge').classList.add('hidden');
        ctx.setPlaying(false);
        this.renderer.resize();
        if (this.editCam) this.cam = { ...this.editCam };
        this.particles = [];
        this.afterimages = [];
        this.markDirty();
        this.updateStatus();
      },

      readInput() {
        if (this.aiPlayback) {
          const ai = this.aiPlayback;
          const a = ai.path[ai.stepIdx] || {};
          ai.frameInHold++;
          if (ai.frameInHold >= ai.hold) { ai.frameInHold = 0; ai.stepIdx++; }
          return a;
        }
        const p = ctx.input.poll();
        return { left: p.left, right: p.right, up: p.up, down: p.down, jump: p.jump, dash: p.dash };
      },

      tick() {
        if (this.mode !== 'play' || !this.game) return;
        const g = this.game;
        if (g.dead) {
          this.deadTimer += PF.DT;
          if (this.deadTimer > 0.65) { this.deaths++; this.resetGame(false); }
          return;
        }
        if (g.won) return;

        this.frameCount++;
        PF.step(this.level, g, this.readInput());
        for (const ev of g.events) this.onEvent(ev);

        if (g.dashTimer > 0 && this.frameCount % 2 === 0) {
          this.afterimages.unshift({
            x: (g.px + 6) / T, y: -(g.py + 14) / T, facing: g.facing,
            life: 0.24, max: 0.24, color: '#38bdf8',
          });
          if (this.afterimages.length > 9) this.afterimages.pop();
        }
        if (g.wallDir !== 0 && this.frameCount % 5 === 0) {
          this.particles.push({
            x: g.wallDir > 0 ? g.px + 12 : g.px, y: g.py + 8, z: 0,
            vx: -g.wallDir * (12 + Math.random() * 18), vy: -10 - Math.random() * 15, vz: (Math.random() - 0.5) * 1.5,
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
        ctx.audio.play(ev.type, ev);
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
          case 'jump': burst(5, '#e5e7eb', 42, 0.26, 0); break;
          case 'walljump': burst(9, '#bae6fd', 85, 0.32, 120); ctx.input.haptic(8); break;
          case 'dash':
            burst(16, ['#38bdf8', '#e0f2fe', '#7dd3fc'], 140, 0.36, 0);
            this.loop.freeze(0.032); this.shake = Math.max(this.shake, 0.14); ctx.input.haptic(12);
            break;
          case 'wavedash':
            burst(22, ['#38bdf8', '#facc15', '#ffffff'], 175, 0.44, 60);
            this.loop.freeze(0.04); this.shake = Math.max(this.shake, 0.18); ctx.input.haptic(16);
            break;
          case 'coin': burst(10, ['#fde047', '#ffffff'], 100, 0.42, 0); break;
          case 'crystal':
            burst(18, ['#34d399', '#6ee7b7', '#ffffff'], 135, 0.48, 0);
            this.loop.freeze(0.042); this.shake = Math.max(this.shake, 0.12); ctx.input.haptic(10);
            break;
          case 'switch':
            burst(20, ev.on ? ['#ef4444', '#fca5a5'] : ['#3b82f6', '#93c5fd'], 160, 0.5, 80);
            this.loop.freeze(0.036); this.shake = Math.max(this.shake, 0.15);
            this.switchFlashTimer = 0.18; ctx.input.haptic(12);
            $('switchFlash').style.background = ev.on ? 'rgba(239, 68, 68, 0.16)' : 'rgba(59, 130, 246, 0.18)';
            $('switchFlash').classList.remove('hidden');
            break;
          case 'crumbleBreak': burst(14, ['#9ca3af', '#64748b'], 120, 0.55, 600); break;
          case 'checkpoint':
            this.activeCheckpoint = { x: this.game.checkpoint.x, y: this.game.checkpoint.y };
            burst(26, ['#38bdf8', '#fde047', '#ffffff'], 165, 0.72, 120);
            ctx.input.haptic(14); ctx.toast('🚩 存档点已激活！');
            break;
          case 'stomp':
            burst(14, ['#a78bfa', '#ffffff'], 135, 0.48, 220);
            this.loop.freeze(0.045); this.shake = Math.max(this.shake, 0.14); ctx.input.haptic(12);
            break;
          case 'break':
            burst(18, ['#c8642c', '#e8915a', '#7a3412'], 175, 0.68, 700);
            this.loop.freeze(0.042); this.shake = Math.max(this.shake, 0.13); ctx.input.haptic(10);
            break;
          case 'spring': burst(10, ['#ff8a80', '#fde047'], 80, 0.34, 0); ctx.input.haptic(10); break;
          case 'die':
            burst(32, ['#2f80ed', '#38bdf8', '#ffffff'], 220, 0.78, 500);
            this.loop.freeze(0.068); this.shake = Math.max(this.shake, 0.32); ctx.input.haptic(26);
            if (this.playTrail) this.playTrail.diedAt = { x: ev.x / T, y: -ev.y / T };
            break;
          case 'win':
            burst(60, ['#22c55e', '#facc15', '#38bdf8', '#f472b6'], 240, 1.5, 200);
            ctx.input.haptic(20); this.handleWin();
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
          ctx.storage.setHubBadge(`最快通关 ${g.time.toFixed(2)}s`);
          this.lastWinRecord = prev == null
            ? `🏆 首次通关纪录 ${g.time.toFixed(2)}s！下次重玩自动开启金色幽灵竞速`
            : `🏆 刷新纪录 ${g.time.toFixed(2)}s（提升 ${(prev - g.time).toFixed(2)}s）！`;
        } else {
          this.lastWinRecord = `最快纪录 ${prev.toFixed(2)}s（本次 +${(g.time - prev).toFixed(2)}s）`;
        }
      },

      updateEffects(dt) {
        this.t += dt;
        for (const p of this.particles) {
          p.life -= dt; p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z = (p.z || 0) + (p.vz || 0) * dt;
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
        const px = (g.px + 6) / T, py = -(g.py + 7) / T;
        let tx = px + g.facing * Math.min(2.6, vis.w * 0.085);
        const isPortraitTouch = ctx.input.touchEnabled && r.w < r.h;
        let ty = py + (isPortraitTouch ? -vis.h * 0.04 : vis.h * 0.03);
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
        dashEl.textContent = g.dashTimer > 0 ? '⚡ 冲刺中!' : (g.dashes > 0 ? '⚡ 冲刺就绪' : '⚡ 充能中');
        dashEl.className = `hud-pill ${dashReady ? 'dash-ready' : 'dash-spent'}`;
        ctx.input.setButtonSpent('b', !dashReady);

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

      startAiCheck() {
        if (this.aiTask) {
          this.aiTask.cancelled = true; this.aiTask = null;
          $('btnAiCheck').textContent = '🤖 AI 验关';
          return ctx.toast('已取消 AI 验关');
        }
        if (!PF.find(this.level, 'P') || !PF.find(this.level, 'G')) {
          return ctx.toast('请先放置起点和终点再进行 AI 验关');
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
            ctx.toast(`🤖 AI 验证可通关！用时 ${st.result.time.toFixed(2)}s，可点击“AI 演示”观战`);
          } else {
            $('btnAiCheck').textContent = '⚠️ 未找到路线';
            ctx.toast('AI 未在预算内找到通关路径，请检查跳距或机关设置');
          }
        };
        requestAnimationFrame(pump);
      },

      draw() {
        const L = this.level;
        const cam = this.cam;
        const drawCam = this.shake > 0
          ? { ...cam, tx: cam.tx + (Math.random() - 0.5) * 0.35, ty: cam.ty + (Math.random() - 0.5) * 0.35 }
          : cam;
        if (this.mode === 'play') this.updateHUD();
        let ghostPos = null;
        if (this.mode === 'play' && this.activeGhost && this.activeGhost.frames.length) {
          const f = this.activeGhost.frames[Math.min(this.activeGhost.frames.length - 1, this.frameCount)];
          if (f) ghostPos = { px: f[0], py: f[1], facing: f[2] };
        }
        this.renderer.render({
          level: L, t: this.t, cam: drawCam, mode: this.mode,
          hover: this.editor.hover, hoverRect: this.editor.rectDrag, tool: this.editor.tool,
          game: this.game, particles: this.particles, afterimages: this.afterimages,
          trail: this.playTrail, showTrail: this.showTrail, ghostPos,
          getTile: this.mode === 'edit' ? (x, y) => L.tiles[y * L.w + x] : (x, y) => PF.tileAt(L, this.game, x, y),
        });
      },

      updateStatus() {
        const L = this.level;
        if (!L) return;
        const th = PF.THEMES[L.theme || 'meadow'] || PF.THEMES.meadow;
        let s;
        if (this.mode === 'play') {
          const initMs = this.lastInit != null ? this.lastInit.toFixed(2) : '0.00';
          const modeTag = this.aiPlayback ? 'AI 演示中' : '3D 试玩中';
          s = `${modeTag} · 主题：${th.icon} ${th.name} · 初始化 ${initMs}ms · Shift/X 冲刺 · Esc 返回编辑`;
        } else {
          const tool = this.editor.tool === '.' ? '橡皮擦' : PF.TILES[this.editor.tool].name;
          const pMode = this.editor.paintMode === 'rect' ? '矩形框选' : (this.editor.paintMode === 'hand' ? '抓手平移' : '自由画笔');
          const h = this.editor.hover;
          const pos = h && PF.inBounds(L, h.x, h.y) ? `(${h.x}, ${h.y})` : '—';
          const zoomPct = Math.round((24 / this.cam.dist) * 100);
          s = window.innerWidth <= 500
            ? `${pMode} · ${tool} · ${th.icon} · ${L.w}×${L.h} · ${zoomPct}% · 双指缩放`
            : `${pMode} · ${tool} · ${window.innerWidth <= 860 ? '双指缩放平移' : `光标 ${pos}`} · ${L.w}×${L.h} · ${th.icon}${th.name} · ${zoomPct}% · 已自动保存`;
        }
        ctx.setStatus(s);
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
        $('btnFloatStop').onclick = () => this.stop();
        $('btnFloatRestart').onclick = () => { this.deaths = 0; this.resetGame(true); };
        $('btnFloatFs').onclick = () => ctx.toggleFullscreen();
        $('btnFloatBgm').onclick = () => {
          const on = ctx.audio.toggleBgm(this.mode === 'play', this.level.theme || 'meadow');
          this.syncToolButtons();
          ctx.syncGlobalButtons();
          ctx.toast(on ? '🎵 主题 BGM 已开启' : '🔇 主题 BGM 已静音');
        };
        $('btnWinReplay').onclick = () => { this.deaths = 0; this.resetGame(true); };
        $('btnWinEdit').onclick = () => this.stop();
        $('btnBrush').onclick = () => this.editor.setPaintMode('brush');
        $('btnRect').onclick = () => this.editor.setPaintMode('rect');
        $('btnHand').onclick = () => this.editor.setPaintMode(this.editor.paintMode === 'hand' ? 'brush' : 'hand');
        $('btnUndo').onclick = () => this.editor.undo();
        $('btnRedo').onclick = () => this.editor.redo();
        $('btnAiCheck').onclick = () => this.startAiCheck();
        $('btnAiWatch').onclick = () => { if (this.aiSolution) this.play(false, this.aiSolution.result); };
        $('btnTrail').onclick = () => {
          this.showTrail = !this.showTrail;
          this.syncToolButtons();
          ctx.toast(this.showTrail ? '已开启试玩轨迹辅助线' : '已隐藏试玩轨迹');
        };
        $('btnTouchToggle').onclick = () => {
          const on = ctx.input.toggleTouch();
          this.syncToolButtons();
          ctx.toast(on ? '🎮 虚拟触屏手柄已开启' : '🎮 虚拟触屏手柄已隐藏');
        };
        $('selTheme').onchange = (e) => {
          const next = PF.cloneLevel(this.level);
          next.theme = e.target.value;
          this.editor.replaceLevel(next);
          const th = PF.THEMES[next.theme];
          ctx.toast(`已切换至 ${th.icon} ${th.name} 主题`);
        };
        $('selPreset').onchange = (e) => {
          const id = e.target.value;
          e.target.value = '';
          if (!id) return;
          const p = PF.PRESETS.find((x) => x.id === id);
          if (!p) return;
          this.editor.replaceLevel(p.build());
          ctx.toast(`已载入精品关卡：${p.name}（可撤销）`);
        };
        $('btnShare').onclick = async () => {
          const url = ctx.shareURL(PF.encode(this.level));
          history.replaceState(null, '', url);
          const ok = await this.copy(url);
          if (ok) return ctx.toast(`分享链接已复制（${url.length} 字符）`);
          if (navigator.share) {
            try { await navigator.share({ title: 'PixelForge 3D 关卡', url }); return; } catch (e) { /* cancel */ }
          }
          ctx.toast('复制失败，请手动复制地址栏');
        };
        $('btnExport').onclick = () => {
          const data = JSON.stringify({ format: 'pixelforge', version: 2, theme: this.level.theme || 'meadow', w: this.level.w, h: this.level.h, code: PF.encode(this.level) }, null, 2);
          const a = document.createElement('a');
          a.href = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
          a.download = `pixelforge-${this.level.theme || 'level'}-${Date.now()}.json`;
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 1000);
          ctx.toast('关卡已导出');
        };
        $('btnImport').onclick = () => $('pfFileInput').click();
        $('pfFileInput').onchange = async (e) => {
          const f = e.target.files[0];
          e.target.value = '';
          if (!f) return;
          const text = await f.text();
          let code = text.trim();
          try { code = JSON.parse(text).code || code; } catch (err) { /* ignore */ }
          const m = code.match(/(?:L|d)=([\w-]+)/);
          const lv = PF.decode(m ? m[1] : code);
          if (!lv) return ctx.toast('无法识别的关卡文件');
          this.editor.replaceLevel(lv);
          ctx.toast('导入成功（可撤销）');
        };
        $('btnResize').onclick = () => {
          const { minW, maxW, minH, maxH } = PF.LIMITS;
          const v = prompt(`输入新尺寸 宽×高（宽 ${minW}-${maxW}，高 ${minH}-${maxH}），以左下角为锚点：`, `${this.level.w}x${this.level.h}`);
          if (!v) return;
          const m = v.match(/(\d+)\D+(\d+)/);
          const w = m && +m[1], h = m && +m[2];
          if (!m || w < minW || w > maxW || h < minH || h > maxH) return ctx.toast('尺寸不合法');
          this.editor.replaceLevel(PF.resize(this.level, w, h));
          ctx.toast(`尺寸已改为 ${w}×${h}（可撤销）`);
        };
        $('btnClear').onclick = () => {
          const L = PF.createLevel(this.level.w, this.level.h, this.level.theme || 'meadow');
          for (let x = 0; x < L.w; x++) { PF.set(L, x, L.h - 1, '#'); PF.set(L, x, L.h - 2, '#'); }
          PF.set(L, 2, L.h - 3, 'P');
          PF.set(L, L.w - 3, L.h - 3, 'G');
          this.editor.replaceLevel(L);
          ctx.toast('已清空（保留地面/起点/终点，可撤销）');
        };

        ctx.input.onManualInput = () => {
          if (this.aiPlayback) {
            this.aiPlayback = null;
            $('playModeBadge').classList.add('hidden');
            this.syncTouchVisibility();
            ctx.toast('已切换为手动接管！');
          }
        };

        this._keydownFn = (e) => {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
          if (this.mode === 'play') {
            if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
            if (e.key === 'Escape') return this.stop();
            if (e.code === 'KeyR' || (e.key === 'Enter' && this.game && this.game.won)) {
              this.deaths = 0; this.resetGame(true); return;
            }
            if (this.aiPlayback && ['ArrowLeft', 'ArrowRight', 'KeyA', 'KeyD', 'Space', 'ShiftLeft', 'ShiftRight'].includes(e.code)) {
              ctx.input.onManualInput();
            }
            return;
          }
          if (e.code === 'KeyP' && !e.metaKey && !e.ctrlKey) { e.preventDefault(); return this.play(e.shiftKey); }
          this.editor.keydown(e);
        };
        this._keyupFn = (e) => { if (this.mode === 'edit') this.editor.keyup(e); };
        window.addEventListener('keydown', this._keydownFn);
        window.addEventListener('keyup', this._keyupFn);
      },
    };

    return {
      mount(payload) {
        app.mountDOM();
        app.loadPBs();
        app.renderer = new PF.Renderer3D(ctx.stage, ctx.gfx);
        app.canvas = app.renderer.canvas;
        app.editor = new PF.Editor(app);
        app.editor.buildPalette($('palette'));
        app.editor.bind(app.canvas);
        app.loadInitial(payload);
        app.renderer.setLevel(app.level);
        app.syncThemeUI();
        app.syncToolButtons();
        app.fitView();
        app.bindUI();
        app.updateStatus();

        app.loop = new ctx.FixedLoop({
          dt: PF.DT,
          onTick: () => app.tick(),
          onFrame: (dt) => { app.updateEffects(dt); app.draw(); },
        });
        app.loop.start();
        window.app = app;
      },
      unmount() {
        if (app.loop) app.loop.stop();
        clearTimeout(app._saveT);
        app.invalidateAI();
        if (app._keydownFn) window.removeEventListener('keydown', app._keydownFn);
        if (app._keyupFn) window.removeEventListener('keyup', app._keyupFn);
        if (app.editor) app.editor.unbind();
        if (app.renderer) app.renderer.dispose();
        ctx.sideSlot.classList.remove('hidden');
      },
      resize() {
        if (!app.renderer) return;
        app.renderer.resize();
        app.syncToolButtons();
        if (app.mode === 'play' && app.game) {
          app.applyPlayCameraDist();
          app.followCamera(true);
        } else if (app.level) {
          app.fitView();
        }
        app.updateStatus();
      },
      onBgmToggled() {
        app.syncToolButtons();
      },
      onHashPayload(payload) {
        const lv = payload && PF.decode(payload);
        if (lv && PF.encode(lv) !== PF.encode(app.level)) {
          if (app.mode === 'play') app.stop();
          app.editor.replaceLevel(lv);
          ctx.toast('已载入链接中的关卡');
        }
      },
    };
  });
})();
