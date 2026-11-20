/* Game 4: 古墓丽影 · 秘鲁遗迹 — 第三人称 3D 动作冒险游戏入口（接入 Studio 多游戏契约） */
(function () {
  'use strict';
  const Studio = window.Studio;
  const TR = window.TR;

  Studio.defineGame('tomb-raider', (ctx) => {
    const $ = (id) => document.getElementById(id);

    const game = {
      state: null,
      renderer: null,
      loop: null,
      levelIdx: 0,
      progress: { cleared: {}, totalSecrets: 0, bestScore: 0 },
      keys: Object.create(null),
      pending: {
        yawDelta: 0,
        pitchDelta: 0,
        jump: false,
        dodge: false,
        fireHeld: false,
        heavy: false,
        interactPressed: false,
        interactHeld: false,
        heal: false,
        flare: false,
        instinct: false,
      },
      bannerTimer: 0,
      introTimer: 0,
      hurtFlashTimer: 0,
      touchEnabled: false,
      stickPid: null,
      stickOrigin: { x: 0, y: 0 },
      stickVec: { x: 0, y: 0 },
      lookPid: null,
      lookLast: { x: 0, y: 0 },
      rmbDragging: false,
      rmbMoved: 0,
      mouseLast: { x: 0, y: 0 },
      _listeners: [],

      on(target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        this._listeners.push([target, type, fn, opts]);
      },

      mountDOM() {
        const opts = TR.LEVELS.map((l) => `<option value="${l.index}">${l.num} · ${l.shortTitle}</option>`).join('');
        ctx.topbarSlot.innerHTML = `
          <div class="group">
            <select id="trLevelSel" title="选择秘鲁探险章节">${opts}</select>
            <button id="trBtnInstinct" class="toggle" title="求生本能：金色高亮机关与秘密 (Q)">👁️ 求生本能</button>
            <button id="trBtnFlare" class="toggle" title="点燃绿色照明弹 (V)">🟢 照明弹</button>
            <button id="trBtnQuality" class="toggle active" title="切换 3A 极致光影泛光 / 流畅模式">✨ 3A光影</button>
            <button id="trBtnRestart" class="primary" title="重开本关 (R)">↻ 重开</button>
            <button id="trBtnTouch" class="toggle" title="开关移动端探险手柄">🎮 触屏键</button>
          </div>
        `;

        ctx.hudSlot.innerHTML = `
          <div id="trHud" class="tr-hud">
            <div class="tr-top-left">
              <div class="tr-title-tag" id="trLevelTag">第一关 · 秘鲁洞窟 · 失落入口</div>
              <div class="tr-obj-line" id="trObjLine">穿越洞窟陷阱，推石块上太阳压板开启石门</div>
              <div class="tr-pills">
                <span class="hud-pill gold" id="trSecretsPill">🏺 圣物 0/3</span>
                <span class="hud-pill hidden" id="trCogsPill">⚙️ 齿轮 0/3</span>
                <span class="hud-pill" id="trMedPill">🏥 急救包 1 (H)</span>
                <span class="hud-pill mono" id="trScorePill">★ 0</span>
              </div>
            </div>

            <div class="ch-boss-bar hidden" id="trBossBar">
              <div class="ch-boss-name" id="trBossName">🦖 史前霸王龙 · T-Rex</div>
              <div class="ch-boss-hp-track"><div class="ch-boss-hp-fill" id="trBossHpFill"></div></div>
            </div>

            <div class="tr-callout hidden" id="trCallout">🏺 发现古墓秘密！</div>
            <div class="tr-aim-reticle hidden" id="trAimReticle"><span></span></div>
            <div class="tr-prompt hidden" id="trPrompt">[E] 拉动太阳拉杆</div>

            <div class="tr-bottom-left">
              <div class="tr-gear-pills">
                <span class="ch-weapon-pill" id="trWeaponPill">🔫 经典双枪 (左键/J)</span>
                <span class="ch-skill-pill ready" id="trHeavyPill">💥 麦格农爆发 (K)</span>
              </div>
              <div class="ch-bar hp"><div class="ch-bar-fill" id="trHpFill"></div><span id="trHpText">劳拉生命 100/100</span></div>
            </div>
          </div>
        `;

        ctx.floatSlot.innerHTML = `
          <button id="trFloatInstinct" class="toggle" title="求生本能">👁️</button>
          <button id="trFloatFlare" class="toggle" title="绿色照明弹">🟢</button>
          <button id="trFloatRestart" title="重开本关">↻</button>
          <button id="trFloatFs" title="全屏横屏">⛶</button>
          <button id="trFloatBgm" class="toggle active" title="音乐开关">🎵</button>
          <button id="trFloatHub" class="primary" title="返回大厅">🏠 大厅</button>
        `;
        ctx.floatSlot.classList.remove('hidden');

        ctx.overlaySlot.innerHTML = `
          <div id="trTip" class="ch-tip"></div>
          <div id="trIntroBanner" class="tr-intro-banner hidden"></div>
          <div id="trHurtFlash" class="ns-hurt-flash hidden"></div>
          <div id="trInstinctTint" class="tr-instinct-tint hidden"></div>

          <div id="trWinModal" class="ns-modal hidden">
            <div class="win-card ch-win-card">
              <div class="win-badge" id="trWinRank">S</div>
              <div class="win-title" id="trWinTitle">古墓通关！</div>
              <div class="win-stats" id="trWinStats"></div>
              <div class="win-actions">
                <button id="trBtnNextLevel" class="primary">▶ 下一关</button>
                <button id="trBtnWinReplay">↻ 重玩本关</button>
                <button id="trBtnWinHub">🏠 返回大厅</button>
              </div>
            </div>
          </div>

          <div id="trTouchControls" class="ch-touch hidden">
            <div id="trStick" class="ch-stick">
              <div id="trStickKnob" class="ch-stick-knob"></div>
            </div>
            <div class="ch-touch-right tr-touch-right">
              <button class="ch-tbtn lock" id="trTouchHeal">🏥 急救</button>
              <button class="ch-tbtn skill" id="trTouchInteract">✋ 交互</button>
              <button class="ch-tbtn dodge" id="trTouchRoll">🤸 翻滚</button>
              <button class="ch-tbtn parry" id="trTouchJump">⬆️ 跳/爬</button>
              <button class="ch-tbtn atk" id="trTouchFire">🔫 双枪</button>
            </div>
          </div>
        `;
      },

      syncButtons() {
        const inst = !!(this.state && this.state.instinctOn);
        const flare = !!(this.state && this.state.flareTimer > 0);
        if ($('trBtnInstinct')) $('trBtnInstinct').classList.toggle('active', inst);
        if ($('trFloatInstinct')) $('trFloatInstinct').classList.toggle('active', inst);
        if ($('trBtnFlare')) $('trBtnFlare').classList.toggle('active', flare);
        if ($('trFloatFlare')) $('trFloatFlare').classList.toggle('active', flare);
        if ($('trInstinctTint')) $('trInstinctTint').classList.toggle('hidden', !inst);
        if ($('trBtnTouch')) $('trBtnTouch').classList.toggle('active', this.touchEnabled);
        if ($('trBtnQuality') && this.renderer) {
          $('trBtnQuality').classList.toggle('active', this.renderer.aaaQuality);
          $('trBtnQuality').textContent = this.renderer.aaaQuality ? '✨ 3A光影' : '⚡ 流畅画质';
        }
        if ($('trTouchControls')) $('trTouchControls').classList.toggle('hidden', !this.touchEnabled);
        if ($('trFloatBgm')) $('trFloatBgm').classList.toggle('active', ctx.audio.bgmOn);
        if ($('trLevelSel')) $('trLevelSel').value = String(this.levelIdx);

        const tip = $('trTip');
        if (tip) {
          tip.innerHTML = this.touchEnabled
            ? '左摇杆走位 · 滑屏转镜头 · <b>⬆️ 跳/抓崖翻上</b> · <b>🔫 双枪</b> · <b>🤸 翻滚</b> · <b>✋ 推石/拉杆</b>'
            : '<b>WASD</b> 移动 · <b>右键拖拽/←→</b> 转镜头 · <b>空格</b> 跳/抓崖攀爬 · <b>Shift</b> 空翻转滚 · <b>左键/J</b> 双枪 · <b>K</b> 麦格农 · <b>E</b> 推石/拉杆 · <b>Q</b> 求生本能 · <b>V</b> 照明弹 · <b>H</b> 急救';
        }
      },

      showCallout(text, cls = '') {
        const el = $('trCallout');
        if (!el) return;
        el.textContent = text;
        el.className = 'tr-callout ' + cls;
        this.bannerTimer = 2.4;
      },

      startLevel(idx) {
        this.levelIdx = Math.max(0, Math.min(TR.LEVELS.length - 1, idx | 0));
        this.state = TR.newState(this.levelIdx);
        this.bannerTimer = 0;
        this.hurtFlashTimer = 0;
        $('trWinModal').classList.add('hidden');
        $('trHurtFlash').classList.add('hidden');

        if (this.renderer) this.renderer.ensureLevel(this.state);
        ctx.audio.startBgm(this.state.level.bgm || 'tomb_explore');
        this.syncButtons();
        this.updateHUD();

        const intro = $('trIntroBanner');
        if (intro) {
          intro.innerHTML = `<b>${this.state.level.num} · ${this.state.level.title}</b><br>${this.state.level.introQuote}`;
          intro.classList.remove('hidden');
          this.introTimer = 5.0;
        }
        ctx.setStatus(`${this.state.level.num} · ${this.state.level.title} | ${this.state.level.objectiveText}`);
      },

      onEvent(ev) {
        ctx.audio.play(ev.type, ev);
        switch (ev.type) {
          case 'hit':
            this.renderer?.spawnSparks(ev.x, ev.y, ev.z, ev.crit ? 0xfacc15 : (ev.heavy ? 0xf97316 : 0xfef08a), ev.crit ? 26 : (ev.heavy ? 18 : 8), ev.crit ? 11 : (ev.heavy ? 9 : 6));
            if (ev.heavy || ev.crit) this.renderer?.addShake(ev.crit ? 0.28 : 0.22);
            break;
          case 'adrenaline_dodge':
            this.renderer?.spawnSparks(ev.x, ev.y, ev.z, 0xfde047, 22, 8);
            this.renderer?.addShake(0.24);
            this.showCallout('⚡ 肾上腺素闪避 · 子弹时间 2.4× 暴击！', 'gold');
            ctx.audio.play('parry', ev);
            ctx.input.haptic(24);
            break;
          case 'land_dust':
            this.renderer?.spawnSparks(ev.x, ev.y, ev.z, 0xc2b29b, 6, 3.2);
            break;
          case 'kill':
            this.renderer?.spawnSparks(ev.x, ev.y, ev.z, ev.isBoss ? 0xfacc15 : 0xfb7185, ev.isBoss ? 48 : 20, ev.isBoss ? 12 : 7);
            if (ev.isBoss) {
              this.renderer?.addShake(0.45);
              this.showCallout(`🦖 史前霸王龙倒下！司祭圣门条件达成！`, 'gold');
              ctx.audio.startBgm('tomb_explore');
            }
            break;
          case 'secret_chime':
            this.renderer?.spawnSparks(ev.x, ev.y, ev.z, 0xfacc15, 28, 9);
            this.showCallout(`🏺 发现古墓秘密：${ev.name} (${ev.count}/${ev.total})`, 'gold');
            ctx.input.haptic(22);
            break;
          case 'crystal':
            this.renderer?.spawnSparks(ev.x, ev.y, ev.z, 0xfbbf24, 24, 8);
            this.showCallout(`⚙️ 拾取 ${ev.name} (${ev.count}/${ev.total})`, 'gold');
            ctx.input.haptic(18);
            break;
          case 'medipack':
            this.showCallout(ev.name ? `🏥 获得 ${ev.name}（按 H 治疗）` : '🏥 使用急救包，生命恢复！', 'heal');
            break;
          case 'flare':
            this.showCallout('🟢 绿色化学照明弹已点燃！', 'heal');
            this.syncButtons();
            break;
          case 'checkpoint':
            this.showCallout('🚩 已抵达古墓存档点', '');
            break;
          case 'lever_pull':
            this.renderer?.addShake(0.14);
            this.showCallout('⚙️ 古代机关已触发！', 'gold');
            ctx.input.haptic(16);
            break;
          case 'gate_open':
            this.renderer?.addShake(0.36);
            this.showCallout(`🚪 ${ev.label} 轰然开启！`, 'gold');
            ctx.input.haptic(26);
            break;
          case 'boulder_rumble':
            this.renderer?.addShake(0.55);
            this.showCallout('🪨 警告！巨石滚落！快闪入两侧安全凹槽！', 'danger');
            ctx.audio.startBgm('tomb_trex');
            ctx.input.haptic(32);
            break;
          case 'trex_roar':
            this.renderer?.addShake(0.50);
            if (ev.name) {
              this.showCallout('🦖 史前霸王龙苏醒！边翻滚边双枪射击！', 'danger');
              ctx.audio.startBgm('tomb_trex');
            }
            ctx.input.haptic(30);
            break;
          case 'hurt':
            this.renderer?.addShake(0.28);
            this.hurtFlashTimer = 0.25;
            $('trHurtFlash').classList.remove('hidden');
            ctx.input.haptic(22);
            break;
          case 'die':
            this.renderer?.addShake(0.35);
            this.showCallout('💀 重伤倒下 · 已在最近存档点复活', 'danger');
            break;
          case 'win':
            this.onWin();
            break;
        }
      },

      saveProgress() {
        ctx.storage.set('progress', this.progress);
        const cnt = Object.keys(this.progress.cleared || {}).length;
        const label = cnt >= TR.LEVELS.length ? '秘鲁全通关 · 探险家' : `已通关 ${cnt}/${TR.LEVELS.length} 关`;
        ctx.storage.setHubBadge(`${label} · 🏺${this.progress.totalSecrets || 0}`);
      },

      onWin() {
        const s = this.state;
        const lvl = s.level;
        const order = { S: 4, A: 3, B: 2, C: 1 };
        const prev = this.progress.cleared[lvl.id];
        if (!prev || (order[s.rank] || 0) > (order[prev] || 0)) {
          this.progress.cleared[lvl.id] = s.rank;
        }
        this.progress.totalSecrets = Math.max(this.progress.totalSecrets || 0, s.artifacts);
        if (s.score > (this.progress.bestScore || 0)) this.progress.bestScore = s.score;
        this.saveProgress();

        $('trWinRank').textContent = s.rank;
        $('trWinTitle').textContent = lvl.id === 'lost_valley' ? '🏆 夺得亚特兰蒂斯神骸！' : `${lvl.num} · ${lvl.shortTitle} 通关！`;
        $('trWinStats').textContent = `评分 ${s.rank} · 发现圣物 ${s.artifacts}/${s.totalArtifacts} · 击退野兽 ${s.kills} · 用时 ${Math.round(s.time)}s · 积分 ${s.score}`;
        const hasNext = this.levelIdx < TR.LEVELS.length - 1;
        $('trBtnNextLevel').classList.toggle('hidden', !hasNext);
        if (hasNext) {
          const nxt = TR.LEVELS[this.levelIdx + 1];
          $('trBtnNextLevel').textContent = `▶ ${nxt.num} · ${nxt.shortTitle}`;
        }
        $('trWinModal').classList.remove('hidden');
      },

      updateHUD() {
        const s = this.state;
        if (!s) return;

        $('trLevelTag').textContent = `${s.level.num} · ${s.level.title}`;
        $('trObjLine').textContent = s.level.objectiveText;
        $('trSecretsPill').textContent = `🏺 圣物 ${s.artifacts}/${s.totalArtifacts}`;
        const cogsEl = $('trCogsPill');
        if (s.totalCogs > 0) {
          cogsEl.classList.remove('hidden');
          cogsEl.textContent = `⚙️ 齿轮 ${s.cogs}/${s.totalCogs}`;
        } else {
          cogsEl.classList.add('hidden');
        }
        $('trMedPill').textContent = `🏥 急救包 ${s.medipacks} (H)`;
        $('trScorePill').textContent = `★ ${s.score}`;

        $('trHpFill').style.width = `${Math.max(0, (s.hp / s.maxHp) * 100)}%`;
        $('trHpText').textContent = `劳拉生命 ${Math.ceil(s.hp)}/${s.maxHp}`;

        const heavyEl = $('trHeavyPill');
        heavyEl.classList.toggle('ready', s.heavyCd <= 0);
        heavyEl.textContent = s.heavyCd <= 0 ? '💥 麦格农爆发就绪 (K)' : `💥 装填中 ${s.heavyCd.toFixed(1)}s`;

        const boss = s.enemies.find((e) => e.isBoss && e.hp > 0 && e.awoken);
        const bossBar = $('trBossBar');
        if (boss) {
          bossBar.classList.remove('hidden');
          $('trBossName').textContent = `🦖 ${boss.name}`;
          $('trBossHpFill').style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
        } else {
          bossBar.classList.add('hidden');
        }

        const pr = $('trPrompt');
        if (s.prompt) {
          pr.textContent = s.prompt;
          pr.classList.remove('hidden');
        } else {
          pr.classList.add('hidden');
        }

        const ret = $('trAimReticle');
        if (ret) {
          ret.classList.toggle('hidden', !s.aiming && s.adrenalineTimer <= 0);
          ret.classList.toggle('adren', s.adrenalineTimer > 0);
        }
      },

      sampleInput() {
        const k = this.keys;
        let moveX = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0) + this.stickVec.x;
        let moveY = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - this.stickVec.y;
        const len = Math.hypot(moveX, moveY);
        if (len > 1) { moveX /= len; moveY /= len; }

        let yawDelta = this.pending.yawDelta;
        if (k.ArrowLeft) yawDelta += 2.2 * TR.DT;
        if (k.ArrowRight) yawDelta -= 2.2 * TR.DT;

        const out = {
          moveX,
          moveY,
          yawDelta,
          pitchDelta: this.pending.pitchDelta,
          jumpPressed: this.pending.jump,
          dodgePressed: this.pending.dodge,
          fireHeld: this.pending.fireHeld || !!k.KeyJ,
          heavyPressed: this.pending.heavy,
          interactPressed: this.pending.interactPressed,
          interactHeld: this.pending.interactHeld || !!k.KeyE,
          healPressed: this.pending.heal,
          flarePressed: this.pending.flare,
          instinctPressed: this.pending.instinct,
        };
        this.pending.yawDelta = 0;
        this.pending.pitchDelta = 0;
        this.pending.jump = false;
        this.pending.dodge = false;
        this.pending.heavy = false;
        this.pending.interactPressed = false;
        this.pending.heal = false;
        this.pending.flare = false;
        this.pending.instinct = false;
        return out;
      },

      bindEvents() {
        const canvas = ctx.gfx.canvas;

        this.on($('trLevelSel'), 'change', (e) => {
          this.startLevel(parseInt(e.target.value, 10) || 0);
          e.target.blur();
        });
        const toggleInst = () => { this.pending.instinct = true; };
        const trigFlare = () => { this.pending.flare = true; };
        this.on($('trBtnInstinct'), 'click', toggleInst);
        this.on($('trFloatInstinct'), 'click', toggleInst);
        this.on($('trBtnFlare'), 'click', trigFlare);
        this.on($('trFloatFlare'), 'click', trigFlare);
        this.on($('trBtnQuality'), 'click', () => {
          if (!this.renderer) return;
          this.renderer.setQuality(!this.renderer.aaaQuality);
          this.syncButtons();
          ctx.toast(this.renderer.aaaQuality ? '✨ 已开启 3A 极致 PBR 光影 + 软阴影 + HDR 泛光' : '⚡ 已切换至高性能流畅模式');
        });
        this.on($('trBtnRestart'), 'click', () => this.startLevel(this.levelIdx));
        this.on($('trFloatRestart'), 'click', () => this.startLevel(this.levelIdx));
        this.on($('trBtnTouch'), 'click', () => {
          this.touchEnabled = !this.touchEnabled;
          this.syncButtons();
        });
        this.on($('trFloatFs'), 'click', () => ctx.toggleFullscreen());
        this.on($('trFloatBgm'), 'click', () => {
          ctx.audio.toggleBgm();
          ctx.syncGlobalButtons();
          this.syncButtons();
        });
        this.on($('trFloatHub'), 'click', () => ctx.goHub());
        this.on($('trBtnNextLevel'), 'click', () => this.startLevel(this.levelIdx + 1));
        this.on($('trBtnWinReplay'), 'click', () => this.startLevel(this.levelIdx));
        this.on($('trBtnWinHub'), 'click', () => ctx.goHub());

        this.on(window, 'keydown', (e) => {
          if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
          ctx.audio.ensure();
          this.keys[e.code] = true;
          if (e.code === 'Space') { e.preventDefault(); if (!e.repeat) this.pending.jump = true; }
          else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') { if (!e.repeat) this.pending.dodge = true; }
          else if (e.code === 'KeyK') { if (!e.repeat) this.pending.heavy = true; }
          else if (e.code === 'KeyE') { if (!e.repeat) this.pending.interactPressed = true; }
          else if (e.code === 'KeyH') { if (!e.repeat) this.pending.heal = true; }
          else if (e.code === 'KeyV') { if (!e.repeat) this.pending.flare = true; }
          else if (e.code === 'KeyQ') { if (!e.repeat) this.pending.instinct = true; }
          else if (e.code === 'KeyR') { if (!e.repeat) this.startLevel(this.levelIdx); }
        });
        this.on(window, 'keyup', (e) => { this.keys[e.code] = false; });

        // 鼠标操控：左键连射双枪，右键拖拽旋转镜头（短点右键触发麦格农爆发），零指针锁定冲突！
        this.on(canvas, 'contextmenu', (e) => e.preventDefault());
        this.on(canvas, 'mousedown', (e) => {
          ctx.audio.ensure();
          if (e.button === 0) {
            this.pending.fireHeld = true;
          } else if (e.button === 2) {
            this.rmbDragging = true;
            this.rmbMoved = 0;
            this.mouseLast.x = e.clientX;
            this.mouseLast.y = e.clientY;
          }
        });
        this.on(window, 'mousemove', (e) => {
          if (this.rmbDragging) {
            const dx = e.clientX - this.mouseLast.x;
            const dy = e.clientY - this.mouseLast.y;
            this.mouseLast.x = e.clientX;
            this.mouseLast.y = e.clientY;
            this.rmbMoved += Math.hypot(dx, dy);
            this.pending.yawDelta -= dx * 0.0055;
            this.pending.pitchDelta -= dy * 0.0038;
          }
        });
        this.on(window, 'mouseup', (e) => {
          if (e.button === 0) this.pending.fireHeld = false;
          if (e.button === 2) {
            if (this.rmbDragging && this.rmbMoved < 8) this.pending.heavy = true;
            this.rmbDragging = false;
          }
        });

        // 移动端滑屏转镜头 + 左摇杆 + 右侧探险按键
        this.on(canvas, 'pointerdown', (e) => {
          if (e.pointerType !== 'touch') return;
          ctx.audio.ensure();
          if (this.lookPid === null) {
            this.lookPid = e.pointerId;
            this.lookLast.x = e.clientX;
            this.lookLast.y = e.clientY;
          }
        });
        this.on(window, 'pointermove', (e) => {
          if (e.pointerId === this.lookPid) {
            const dx = e.clientX - this.lookLast.x;
            const dy = e.clientY - this.lookLast.y;
            this.lookLast.x = e.clientX;
            this.lookLast.y = e.clientY;
            this.pending.yawDelta -= dx * 0.0058;
            this.pending.pitchDelta -= dy * 0.0038;
          } else if (e.pointerId === this.stickPid) {
            const dx = e.clientX - this.stickOrigin.x;
            const dy = e.clientY - this.stickOrigin.y;
            const maxR = 40;
            const d = Math.hypot(dx, dy) || 1;
            const cl = Math.min(maxR, d);
            this.stickVec.x = (dx / d) * (cl / maxR);
            this.stickVec.y = (dy / d) * (cl / maxR);
            const knob = $('trStickKnob');
            if (knob) knob.style.transform = `translate(${(this.stickVec.x * maxR).toFixed(1)}px, ${(this.stickVec.y * maxR).toFixed(1)}px)`;
          }
        });
        const endPtr = (e) => {
          if (e.pointerId === this.lookPid) this.lookPid = null;
          if (e.pointerId === this.stickPid) {
            this.stickPid = null;
            this.stickVec.x = 0;
            this.stickVec.y = 0;
            const knob = $('trStickKnob');
            if (knob) knob.style.transform = 'translate(0px, 0px)';
          }
        };
        this.on(window, 'pointerup', endPtr);
        this.on(window, 'pointercancel', endPtr);

        const stick = $('trStick');
        this.on(stick, 'pointerdown', (e) => {
          e.preventDefault();
          e.stopPropagation();
          ctx.audio.ensure();
          const rect = stick.getBoundingClientRect();
          this.stickPid = e.pointerId;
          this.stickOrigin.x = rect.left + rect.width * 0.5;
          this.stickOrigin.y = rect.top + rect.height * 0.5;
          try { stick.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        });

        const bindBtn = (id, onDown, onUp) => {
          const el = $(id);
          if (!el) return;
          this.on(el, 'pointerdown', (e) => {
            e.preventDefault();
            e.stopPropagation();
            ctx.audio.ensure();
            el.classList.add('pressed');
            onDown();
          });
          const up = () => {
            el.classList.remove('pressed');
            if (onUp) onUp();
          };
          this.on(el, 'pointerup', up);
          this.on(el, 'pointercancel', up);
          this.on(el, 'pointerleave', up);
        };

        bindBtn('trTouchFire', () => { this.pending.fireHeld = true; }, () => { this.pending.fireHeld = false; });
        bindBtn('trTouchJump', () => { this.pending.jump = true; });
        bindBtn('trTouchRoll', () => { this.pending.dodge = true; });
        bindBtn('trTouchInteract', () => { this.pending.interactPressed = true; this.pending.interactHeld = true; }, () => { this.pending.interactHeld = false; });
        bindBtn('trTouchHeal', () => { this.pending.heal = true; });
      },

      mount() {
        this.progress = ctx.storage.get('progress', { cleared: {}, totalSecrets: 0, bestScore: 0 });
        this.touchEnabled = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 860 || window.innerHeight <= 540;
        this.mountDOM();
        ctx.gfx.ensure(ctx.stage);
        this.renderer = new TR.Renderer3D(ctx.gfx);
        ctx.setPlaying(true);
        ctx.input.setVisible(false);

        this.bindEvents();
        this.on(window, 'resize', () => ctx.gfx.resize());
        this.startLevel(0);

        let hudTick = 0;
        this.loop = new ctx.FixedLoop({
          dt: TR.DT,
          onTick: () => {
            if (!this.state) return;
            if (this.bannerTimer > 0) {
              this.bannerTimer -= TR.DT;
              if (this.bannerTimer <= 0 && $('trCallout')) $('trCallout').classList.add('hidden');
            }
            if (this.introTimer > 0) {
              this.introTimer -= TR.DT;
              if (this.introTimer <= 0 && $('trIntroBanner')) $('trIntroBanner').classList.add('hidden');
            }
            if (this.hurtFlashTimer > 0) {
              this.hurtFlashTimer -= TR.DT;
              if (this.hurtFlashTimer <= 0 && $('trHurtFlash')) $('trHurtFlash').classList.add('hidden');
            }

            if (this.state.levelWon) return;
            const prevInst = this.state.instinctOn;
            const prevFlare = this.state.flareTimer > 0;
            TR.step(this.state, this.sampleInput());
            for (const ev of this.state.events) this.onEvent(ev);
            if (this.state.instinctOn !== prevInst || (this.state.flareTimer > 0) !== prevFlare) {
              this.syncButtons();
            }
          },
          onFrame: (frameDt) => {
            if (!this.state || !this.renderer) return;
            this.renderer.render(this.state, Math.min(0.05, frameDt || TR.DT));
            if (++hudTick >= 3) {
              hudTick = 0;
              this.updateHUD();
            }
          },
        });
        this.loop.start();
      },

      unmount() {
        if (this.loop) { this.loop.stop(); this.loop = null; }
        for (const [target, type, fn, opts] of this._listeners) {
          target.removeEventListener(type, fn, opts);
        }
        this._listeners = [];
        if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
        ctx.audio.stopBgm();
        ctx.setPlaying(false);
        ctx.floatSlot.classList.add('hidden');
        ctx.topbarSlot.innerHTML = '';
        ctx.hudSlot.innerHTML = '';
        ctx.overlaySlot.innerHTML = '';
        ctx.floatSlot.innerHTML = '';
      },
    };

    return game;
  });
})();
