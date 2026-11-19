/* Game 2: Neon Survivor 3D — 3D 霓虹肉鸽生存游戏入口（接入 Studio 多游戏契约） */
(function () {
  'use strict';
  const Studio = window.Studio;
  const NS = window.NS;

  Studio.defineGame('neon-survivor', (ctx) => {
    const $ = (id) => document.getElementById(id);

    const game = {
      state: null,
      renderer: null,
      loop: null,
      t: 0,
      shake: 0,
      frameCount: 0,
      particles: [],
      afterimages: [],
      best: { score: 0, wave: 1, time: 0 },
      _keydownFn: null,
      _showingChoices: false,

      mountDOM() {
        ctx.topbarSlot.innerHTML = `
          <div class="group">
            <button id="nsBtnRestart" class="primary">↻ 重新开局 (R)</button>
            <button id="nsBtnTouch" class="toggle" title="开关虚拟触屏手柄">🎮 触屏键</button>
          </div>
        `;

        ctx.hudSlot.innerHTML = `
          <div id="nsHud" class="ns-hud">
            <div class="ns-bars">
              <div class="ns-bar-wrap hp"><div id="nsHpFill" class="ns-bar-fill"></div><span id="nsHpText">❤️ 100/100</span></div>
              <div class="ns-bar-wrap xp"><div id="nsXpFill" class="ns-bar-fill"></div><span id="nsXpText">LV 1</span></div>
            </div>
            <div class="ns-pills">
              <span class="hud-pill" id="nsWave">🌊 Wave 1</span>
              <span class="hud-pill mono" id="nsTime">⏱ 00:00</span>
              <span class="hud-pill gold" id="nsScore">★ 0</span>
              <span class="hud-pill" id="nsKills">💀 0</span>
              <span class="hud-pill dash-ready" id="nsDash">⚡ 冲刺就绪</span>
              <span class="hud-pill switch-off" id="nsNova">💥 脉冲就绪</span>
            </div>
          </div>
        `;

        ctx.floatSlot.innerHTML = `
          <button id="nsFloatRestart" title="重开">↻</button>
          <button id="nsFloatFs" title="全屏/横屏">⛶</button>
          <button id="nsFloatBgm" class="toggle active" title="音乐开关">🎵</button>
          <button id="nsFloatHub" class="primary" title="返回大厅">🏠 大厅</button>
        `;
        ctx.floatSlot.classList.remove('hidden');

        ctx.overlaySlot.innerHTML = `
          <div id="nsTip" class="ns-tip"></div>
          <div id="nsUpgradeModal" class="ns-modal hidden">
            <div class="ns-modal-card">
              <div class="ns-modal-title">⚡ 能量升级 · 选择 1 项强化</div>
              <div id="nsChoices" class="ns-choices"></div>
            </div>
          </div>
          <div id="nsOverModal" class="ns-modal hidden">
            <div class="win-card">
              <div class="win-badge" id="nsRank">A</div>
              <div class="win-title" style="color:#f43f5e">💥 防线失守</div>
              <div class="win-stats" id="nsOverStats">Wave 1 · 00:00 · 0 分</div>
              <div class="win-record hidden" id="nsOverRecord">🏆 刷新生存最高分！</div>
              <div class="win-actions">
                <button id="nsBtnOverReplay" class="primary">↻ 再战一局 (R)</button>
                <button id="nsBtnOverHub">🏠 返回大厅</button>
              </div>
            </div>
          </div>
          <div id="nsHurtFlash" class="ns-hurt-flash hidden"></div>
        `;
      },

      syncButtons() {
        if ($('nsBtnTouch')) $('nsBtnTouch').classList.toggle('active', ctx.input.touchEnabled);
        if ($('nsFloatBgm')) $('nsFloatBgm').classList.toggle('active', ctx.audio.bgmOn);
        const tip = $('nsTip');
        if (tip) {
          tip.innerHTML = ctx.input.touchEnabled
            ? '左摇杆全向走位（自动瞄准射击）· <b>⚡ 冲刺</b> 无敌闪避 · <b>💥 脉冲</b> 清场弹幕'
            : 'WASD / 方向键走位（自动瞄准射击）· <b>空格/Shift</b> 无敌冲刺 · <b>E/X/J</b> EMP 脉冲清场';
        }
      },

      restart() {
        this.state = NS.newState((Date.now() & 0xffffff) || 1337);
        this.particles = [];
        this.afterimages = [];
        this.shake = 0;
        this.frameCount = 0;
        this._showingChoices = false;
        $('nsUpgradeModal').classList.add('hidden');
        $('nsOverModal').classList.add('hidden');
        $('nsHurtFlash').classList.add('hidden');
        ctx.input.resetTouch();
        ctx.input.setVisible(true);
        ctx.audio.startBgm('synthwave');
        this.updateHUD();
      },

      burst(x, z, n, colors, speed = 7, life = 0.45) {
        for (let i = 0; i < n; i++) {
          const a = Math.random() * Math.PI * 2;
          const v = speed * (0.35 + Math.random() * 0.75);
          this.particles.push({
            x, y: 0.6 + Math.random() * 0.4, z,
            vx: Math.cos(a) * v, vy: 2.5 + Math.random() * 4.5, vz: Math.sin(a) * v,
            life, max: life,
            color: Array.isArray(colors) ? colors[i % colors.length] : colors,
          });
        }
      },

      onEvent(ev) {
        ctx.audio.play(ev.type, ev);
        switch (ev.type) {
          case 'dash':
            this.burst(ev.x, ev.z, 12, ['#38bdf8', '#e0f2fe'], 6, 0.32);
            this.shake = Math.max(this.shake, 0.1);
            ctx.input.haptic(10);
            break;
          case 'shockwave':
            this.burst(ev.x, ev.z, 28, ['#38bdf8', '#f472b6', '#ffffff'], 13, 0.55);
            this.loop.freeze(0.045);
            this.shake = Math.max(this.shake, 0.28);
            ctx.input.haptic(22);
            break;
          case 'hit':
            this.burst(ev.x, ev.z, 4, ev.crit ? ['#fde047', '#ffffff'] : '#67e8f9', 5, 0.22);
            break;
          case 'kill': {
            const boss = ev.kind === 'boss';
            this.burst(ev.x, ev.z, boss ? 46 : 10, boss ? ['#f472b6', '#facc15', '#38bdf8'] : ['#fb7185', '#f97316', '#fde047'], boss ? 14 : 7.5, boss ? 0.85 : 0.42);
            if (boss) {
              this.loop.freeze(0.075);
              this.shake = Math.max(this.shake, 0.4);
              ctx.toast('🏆 击败霓虹领主！+500 分');
              ctx.input.haptic(28);
            }
            break;
          }
          case 'lightning':
            this.shake = Math.max(this.shake, 0.08);
            break;
          case 'boss':
            ctx.toast('⚠️ 警告：霓虹领主 Boss 降临！');
            this.shake = Math.max(this.shake, 0.3);
            break;
          case 'hurt':
            this.burst(ev.x, ev.z, 14, ['#ef4444', '#fca5a5'], 8, 0.4);
            this.loop.freeze(0.04);
            this.shake = Math.max(this.shake, 0.25);
            ctx.input.haptic(20);
            $('nsHurtFlash').classList.remove('hidden');
            setTimeout(() => { if ($('nsHurtFlash')) $('nsHurtFlash').classList.add('hidden'); }, 150);
            break;
          case 'levelup':
            this.burst(ev.x, ev.z, 30, ['#34d399', '#fde047', '#38bdf8'], 10, 0.7);
            this.showUpgradeModal();
            break;
          case 'die':
            this.burst(ev.x, ev.z, 45, ['#38bdf8', '#f43f5e', '#ffffff'], 12, 0.9);
            this.loop.freeze(0.08);
            this.shake = Math.max(this.shake, 0.45);
            ctx.input.haptic(35);
            this.showGameOver();
            break;
        }
      },

      showUpgradeModal() {
        const choices = this.state.pendingChoices;
        if (!choices || !choices.length) return;
        this._showingChoices = true;
        ctx.input.setVisible(false);
        const box = $('nsChoices');
        box.innerHTML = '';
        choices.forEach((c, idx) => {
          const lv = (this.state.upgrades[c.id] || 0) + 1;
          const btn = document.createElement('button');
          btn.className = 'ns-choice-btn';
          btn.innerHTML = `
            <span class="nc-key">${idx + 1}</span>
            <div class="nc-icon">${c.icon}</div>
            <div class="nc-name">${c.name} <small>LV.${lv}</small></div>
            <div class="nc-desc">${c.desc}</div>
          `;
          btn.onclick = () => this.pickUpgrade(c.id);
          box.appendChild(btn);
        });
        $('nsUpgradeModal').classList.remove('hidden');
      },

      pickUpgrade(id) {
        if (!this.state || !this.state.pendingChoices) return;
        if (NS.applyUpgrade(this.state, id)) {
          this._showingChoices = false;
          $('nsUpgradeModal').classList.add('hidden');
          ctx.input.resetTouch();
          ctx.input.setVisible(true);
          ctx.audio.play('crystal');
          this.updateHUD();
        }
      },

      showGameOver() {
        const s = this.state;
        ctx.input.setVisible(false);
        const isRecord = s.score > (this.best.score || 0);
        if (isRecord) {
          this.best = { score: s.score, wave: s.wave, time: s.time };
          ctx.storage.setJSON('best', this.best);
          ctx.storage.setHubBadge(`W${s.wave} · ${s.score}分`);
        }
        const mm = String(Math.floor(s.time / 60)).padStart(2, '0');
        const ss = String(Math.floor(s.time % 60)).padStart(2, '0');
        const rank = s.score >= 2500 ? 'S' : (s.score >= 1200 ? 'A' : (s.score >= 500 ? 'B' : 'C'));
        $('nsRank').textContent = rank;
        $('nsOverStats').textContent = `Wave ${s.wave} · 生存 ${mm}:${ss} · 击杀 ${s.kills} · ${s.score} 分`;
        const recEl = $('nsOverRecord');
        recEl.classList.toggle('hidden', !isRecord);
        if (isRecord) recEl.textContent = `🏆 新纪录！已同步至游戏大厅战绩`;
        $('nsOverModal').classList.remove('hidden');
      },

      tick() {
        const s = this.state;
        if (!s || s.dead || s.pendingChoices) return;
        this.frameCount++;
        const raw = ctx.input.poll();
        const inp = {
          ax: raw.ax,
          ay: raw.ay,
          dash: !!(raw.a || ctx.input.keys.ShiftLeft || ctx.input.keys.ShiftRight),
          nova: !!(raw.b || ctx.input.keys.KeyE),
        };
        NS.step(s, inp);
        for (const ev of s.events) this.onEvent(ev);

        if (s.dashTimer > 0 && this.frameCount % 2 === 0) {
          this.afterimages.unshift({ x: s.px, z: s.pz, life: 0.22, max: 0.22 });
          if (this.afterimages.length > 8) this.afterimages.pop();
        }
      },

      updateEffects(dt) {
        this.t += dt;
        for (const p of this.particles) {
          p.life -= dt;
          p.vy -= 14 * dt;
          p.x += p.vx * dt;
          p.y = Math.max(0.1, p.y + p.vy * dt);
          p.z += p.vz * dt;
        }
        this.particles = this.particles.filter((p) => p.life > 0);
        for (const a of this.afterimages) a.life -= dt;
        this.afterimages = this.afterimages.filter((a) => a.life > 0);
        this.shake = Math.max(0, this.shake - dt);
      },

      updateHUD() {
        const s = this.state;
        if (!s) return;
        const hpPct = Math.max(0, Math.min(100, (s.hp / s.maxHp) * 100));
        $('nsHpFill').style.width = `${hpPct}%`;
        $('nsHpText').textContent = `❤️ ${Math.ceil(s.hp)}/${s.maxHp}`;
        const xpPct = Math.max(0, Math.min(100, (s.xp / s.xpNext) * 100));
        $('nsXpFill').style.width = `${xpPct}%`;
        $('nsXpText').textContent = `LV ${s.level}`;

        const mm = String(Math.floor(s.time / 60)).padStart(2, '0');
        const ss = String(Math.floor(s.time % 60)).padStart(2, '0');
        $('nsWave').textContent = `🌊 W${s.wave}`;
        $('nsTime').textContent = `⏱ ${mm}:${ss}`;
        $('nsScore').textContent = `★ ${s.score}`;
        $('nsKills').textContent = `💀 ${s.kills}`;

        const dashReady = s.dashCd <= 0;
        const novaReady = s.novaCd <= 0;
        $('nsDash').textContent = dashReady ? '⚡ 冲刺就绪' : `⚡ ${s.dashCd.toFixed(1)}s`;
        $('nsDash').className = `hud-pill ${dashReady ? 'dash-ready' : 'dash-spent'}`;
        $('nsNova').textContent = novaReady ? '💥 脉冲就绪' : `💥 ${s.novaCd.toFixed(1)}s`;
        $('nsNova').className = `hud-pill ${novaReady ? 'switch-off' : 'dash-spent'}`;

        ctx.input.setButtonSpent('a', !dashReady);
        ctx.input.setButtonSpent('b', !novaReady);
        $('nsTip').classList.toggle('hidden', !(s.time < 4.5 && !s.dead && !s.pendingChoices));
        ctx.setStatus(`Neon Survivor 3D · Wave ${s.wave} · LV ${s.level} · 最高分 ${Math.max(this.best.score || 0, s.score)} · 空格/Shift 冲刺 · E/X 脉冲清场`);
      },

      bindUI() {
        $('nsBtnRestart').onclick = () => this.restart();
        $('nsFloatRestart').onclick = () => this.restart();
        $('nsFloatFs').onclick = () => ctx.toggleFullscreen();
        $('nsFloatHub').onclick = () => ctx.goHub();
        $('nsBtnOverReplay').onclick = () => this.restart();
        $('nsBtnOverHub').onclick = () => ctx.goHub();
        $('nsFloatBgm').onclick = () => {
          const on = ctx.audio.toggleBgm(true, 'synthwave');
          this.syncButtons();
          ctx.syncGlobalButtons();
          ctx.toast(on ? '🎵 Synthwave BGM 已开启' : '🔇 BGM 已静音');
        };
        $('nsBtnTouch').onclick = () => {
          const on = ctx.input.toggleTouch();
          this.syncButtons();
          ctx.toast(on ? '🎮 虚拟触屏手柄已开启' : '🎮 虚拟触屏手柄已隐藏');
        };

        this._keydownFn = (e) => {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
          if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
          if (this._showingChoices && this.state && this.state.pendingChoices) {
            const idx = e.key === '1' ? 0 : (e.key === '2' ? 1 : (e.key === '3' ? 2 : -1));
            if (idx >= 0 && this.state.pendingChoices[idx]) {
              this.pickUpgrade(this.state.pendingChoices[idx].id);
            }
            return;
          }
          if (e.code === 'KeyR' || (e.key === 'Enter' && this.state && this.state.dead)) {
            this.restart();
          }
        };
        window.addEventListener('keydown', this._keydownFn);
      },
    };

    return {
      mount() {
        game.mountDOM();
        game.best = ctx.storage.getJSON('best', { score: 0, wave: 1, time: 0 });
        game.renderer = new NS.Renderer3D(ctx.stage, ctx.gfx);
        ctx.setPlaying(true);
        game.bindUI();
        game.syncButtons();
        game.restart();

        game.loop = new ctx.FixedLoop({
          dt: NS.DT,
          onTick: () => game.tick(),
          onFrame: (dt) => {
            game.updateEffects(dt);
            game.updateHUD();
            game.renderer.render(game.state, { t: game.t, shake: game.shake, particles: game.particles, afterimages: game.afterimages });
          },
        });
        game.loop.start();
      },
      unmount() {
        if (game.loop) game.loop.stop();
        if (game._keydownFn) window.removeEventListener('keydown', game._keydownFn);
        if (game.renderer) game.renderer.dispose();
      },
      resize() {
        if (game.renderer) game.renderer.resize();
        game.syncButtons();
      },
      onBgmToggled() {
        game.syncButtons();
      },
    };
  });
})();
