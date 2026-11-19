/* Studio Core — 多游戏注册表、脚本按需懒加载、Arcade Hub 游戏大厅与生命周期调度器 */
(function (G) {
  'use strict';
  const Studio = (G.Studio = G.Studio || {});
  const $ = (id) => document.getElementById(id);

  const manifests = new Map();
  const factories = new Map();
  const loadedScripts = new Set();

  function loadScript(src) {
    if (loadedScripts.has(src)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = false;
      s.onload = () => { loadedScripts.add(src); resolve(); };
      s.onerror = () => reject(new Error(`加载脚本失败: ${src}`));
      document.body.appendChild(s);
    });
  }

  async function loadScripts(list) {
    for (const src of list || []) await loadScript(src);
  }

  const runtime = {
    activeId: null,
    activeManifest: null,
    activeGame: null,
    launching: false,
    _toastT: null,

    registerManifest(m) {
      manifests.set(m.id, m);
    },

    defineGame(id, factory) {
      factories.set(id, factory);
    },

    listManifests() {
      return [...manifests.values()];
    },

    getManifest(id) {
      return manifests.get(id) || null;
    },

    toast(msg, duration = 2500) {
      const el = $('toast');
      if (!el) return;
      el.textContent = msg;
      el.classList.add('show');
      clearTimeout(this._toastT);
      this._toastT = setTimeout(() => el.classList.remove('show'), duration);
    },

    setStatus(text) {
      const el = $('status');
      if (el) el.textContent = text || '';
    },

    setPlayingClass(isPlaying) {
      document.body.classList.toggle('playing', !!isPlaying);
    },

    async toggleFullscreenLandscape() {
      try {
        if (document.fullscreenElement || document.webkitFullscreenElement) {
          if (document.exitFullscreen) await document.exitFullscreen();
          else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
          try { screen.orientation?.unlock?.(); } catch (e) { /* ignore */ }
          return;
        }
        const root = document.documentElement;
        if (root.requestFullscreen) {
          await root.requestFullscreen();
          try { await screen.orientation?.lock?.('landscape'); } catch (e) { /* ignore */ }
          this.toast('⛶ 已进入全屏横屏模式');
        } else if (root.webkitRequestFullscreen) {
          root.webkitRequestFullscreen();
        } else {
          this.toast('请将手机横屏旋转，试玩态自动全屏铺满 📱');
        }
      } catch (e) {
        this.toast('请将手机横屏旋转，试玩态自动全屏铺满 📱');
      }
    },

    syncGlobalButtons() {
      const bgmOn = Studio.Audio.bgmOn;
      $('btnGlobalBgm').classList.toggle('active', bgmOn);
      const fs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      $('btnGlobalFs').classList.toggle('active', fs);
    },

    renderHub() {
      const grid = $('hubGrid');
      if (!grid) return;
      grid.innerHTML = '';
      const lastId = Studio.Storage.getLastGame();
      const list = this.listManifests();

      // 若有上次游玩记录，显示快捷继续按钮
      const lastM = lastId && manifests.get(lastId);
      const quickBar = $('hubQuickContinue');
      if (quickBar) {
        if (lastM) {
          quickBar.classList.remove('hidden');
          quickBar.innerHTML = `<span>上次游玩：<b>${lastM.icon} ${lastM.title}</b></span><button class="primary" id="btnHubResume">▶ 继续游玩</button>`;
          $('btnHubResume').onclick = () => this.launch(lastM.id);
        } else {
          quickBar.classList.add('hidden');
        }
      }

      for (const m of list) {
        const badge = Studio.Storage.getHubBadge(m.id);
        const card = document.createElement('article');
        card.className = 'hub-card';
        card.style.setProperty('--accent', m.accent || '#38bdf8');
        card.dataset.gameId = m.id;
        card.innerHTML = `
          <div class="hc-cover" style="background: ${m.coverBg || 'linear-gradient(135deg,#1e293b,#0f172a)'}">
            <div class="hc-icon">${m.icon}</div>
            <span class="hc-genre">${m.genre}</span>
            ${badge ? `<span class="hc-record">🏆 ${badge}</span>` : ''}
          </div>
          <div class="hc-body">
            <h3 class="hc-title">${m.title}</h3>
            <p class="hc-tagline">${m.tagline}</p>
            <div class="hc-tags">${(m.tags || []).map((t) => `<span>${t}</span>`).join('')}</div>
            <div class="hc-foot">
              <span class="hc-hint">${m.orientationHint || '桌面 + 手机横竖屏'}</span>
              <button class="primary hc-play" type="button">▶ 开始游戏</button>
            </div>
          </div>
        `;
        card.onclick = () => this.launch(m.id);
        grid.appendChild(card);
      }
    },

    unmountActive() {
      if (this.activeGame) {
        try { this.activeGame.unmount(); } catch (e) { console.error('unmount error:', e); }
      }
      this.activeGame = null;
      this.activeId = null;
      this.activeManifest = null;
      Studio.Audio.stopBgm();
      Studio.Input.setVisible(false);
      Studio.Input.setProfile('none');
      Studio.Input.onManualInput = null;
      Studio.Input.reset();
      document.body.classList.remove('playing', 'game-no-sidebar', 'game-no-status');
      $('gameTopbarSlot').innerHTML = '';
      $('gameSideSlot').innerHTML = '';
      $('gameHudSlot').innerHTML = '';
      $('gameOverlaySlot').innerHTML = '';
      $('gameFloatSlot').innerHTML = '';
      $('gameFloatSlot').classList.add('hidden');
      this.setStatus('');
    },

    showHub(updateHash = true) {
      this.unmountActive();
      $('appShell').classList.add('hidden');
      $('hubView').classList.remove('hidden');
      this.renderHub();
      if (updateHash && location.hash && location.hash !== '#hub') {
        history.replaceState(null, '', location.href.split('#')[0] + '#hub');
      }
    },

    async launch(gameId, payload = null, opts = {}) {
      const m = manifests.get(gameId);
      if (!m) {
        this.toast(`未找到游戏: ${gameId}`);
        return this.showHub(false);
      }
      if (this.launching) return;
      this.launching = true;
      try {
        this.unmountActive();
        $('hubView').classList.add('hidden');
        $('appShell').classList.remove('hidden');
        $('brandGameTitle').textContent = m.shortTitle || m.title;
        $('brandGameIcon').textContent = m.icon;

        document.body.classList.toggle('game-no-sidebar', !m.hasSidebar);
        document.body.classList.toggle('game-no-status', m.hideStatus === true);

        this.setStatus(`正在加载 ${m.title}...`);
        await loadScripts(m.scripts);

        const factory = factories.get(gameId);
        if (!factory) throw new Error(`游戏 ${gameId} 未调用 Studio.defineGame 注册入口`);

        Studio.Gfx3D.ensure($('stage'));
        Studio.Input.setProfile(m.touchProfile || 'none');
        Studio.Storage.setLastGame(gameId);

        const ctx = {
          id: gameId,
          manifest: m,
          stage: $('stage'),
          topbarSlot: $('gameTopbarSlot'),
          sideSlot: $('gameSideSlot'),
          hudSlot: $('gameHudSlot'),
          overlaySlot: $('gameOverlaySlot'),
          floatSlot: $('gameFloatSlot'),
          gfx: Studio.Gfx3D,
          input: Studio.Input,
          audio: Studio.Audio,
          storage: Studio.Storage.forGame(gameId),
          codec: Studio.Codec,
          solver: Studio.Solver,
          FixedLoop: Studio.FixedLoop,
          toast: (msg, ms) => this.toast(msg, ms),
          setStatus: (s) => this.setStatus(s),
          setPlaying: (v) => this.setPlayingClass(v),
          toggleFullscreen: () => this.toggleFullscreenLandscape(),
          syncGlobalButtons: () => this.syncGlobalButtons(),
          goHub: () => this.showHub(true),
          shareURL: (data) => Studio.Codec.buildShareURL(location.href, gameId, data),
        };

        const instance = factory(ctx);
        this.activeId = gameId;
        this.activeManifest = m;
        this.activeGame = instance;

        if (!opts.skipHashUpdate) {
          const targetHash = Studio.Codec.buildHash(gameId, payload);
          if (location.hash !== targetHash) {
            history.replaceState(null, '', location.href.split('#')[0] + targetHash);
          }
        }
        instance.mount(payload);
        this.syncGlobalButtons();
      } catch (err) {
        console.error(err);
        this.toast(`启动失败: ${err.message}`);
        this.showHub(false);
      } finally {
        this.launching = false;
      }
    },

    boot() {
      Studio.Input.initDOM({
        root: $('touchControls'),
        stick: $('touchStick'),
        knob: $('touchKnob'),
        btnA: $('btnTouchA'),
        btnB: $('btnTouchB'),
      });

      $('btnBackHub').onclick = () => this.showHub(true);
      $('btnGlobalFs').onclick = () => this.toggleFullscreenLandscape();
      $('btnGlobalBgm').onclick = () => {
        const playing = document.body.classList.contains('playing');
        const on = Studio.Audio.toggleBgm(playing);
        this.syncGlobalButtons();
        if (this.activeGame && this.activeGame.onBgmToggled) this.activeGame.onBgmToggled(on);
        this.toast(on ? '🎵 BGM 已开启' : '🔇 BGM 已静音');
      };

      const onResize = () => {
        Studio.Input.onResize();
        const sz = Studio.Gfx3D.resize();
        if (this.activeGame && this.activeGame.resize) this.activeGame.resize(sz.w, sz.h);
      };
      window.addEventListener('resize', onResize);
      window.addEventListener('orientationchange', () => setTimeout(onResize, 160));
      if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
      document.addEventListener('fullscreenchange', () => {
        this.syncGlobalButtons();
        setTimeout(onResize, 80);
      });

      window.addEventListener('hashchange', () => {
        const parsed = Studio.Codec.parseHash(location.hash);
        if (!parsed.gameId) {
          if (this.activeId) this.showHub(false);
          return;
        }
        if (parsed.gameId === this.activeId && this.activeGame && this.activeGame.onHashPayload) {
          if (parsed.payload) this.activeGame.onHashPayload(parsed.payload);
        } else {
          this.launch(parsed.gameId, parsed.payload, { skipHashUpdate: true });
        }
      });

      // 启动路由：带分享参数（含旧版 #L=）直接进入对应游戏，否则进入游戏大厅
      const initRoute = Studio.Codec.parseHash(location.hash);
      if (initRoute.gameId && manifests.has(initRoute.gameId)) {
        this.launch(initRoute.gameId, initRoute.payload, { skipHashUpdate: true });
      } else {
        this.showHub(false);
      }
    },
  };

  Object.assign(Studio, runtime);
})(typeof window !== 'undefined' ? window : globalThis);
