/* Game 3: 神雕侠侣 · 问情剑 — 第一人称 3D 武侠动作 RPG（接入 Studio 多游戏契约） */
(function () {
  'use strict';
  const Studio = window.Studio;
  const CH = window.CH;

  Studio.defineGame('condor-hero', (ctx) => {
    const $ = (id) => document.getElementById(id);

    const game = {
      state: null,
      renderer: null,
      loop: null,
      chapterIdx: 0,
      progress: { cleared: {}, bestScore: 0 },
      // 剧情状态
      storyQueue: [],
      storyOnDone: null,
      storyActive: false,
      bossBannerTimer: 0,
      bannerTimer: 0,
      hurtFlashTimer: 0,
      parryScreenTimer: 0,
      // 键盘与指针输入缓冲
      keys: Object.create(null),
      pending: {
        yawDelta: 0,
        pitchDelta: 0,
        attack: false,
        guardPressed: false,
        guardHeld: false,
        dodge: false,
        skill: false,
        lock: false,
      },
      pointerLocked: false,
      touchEnabled: false,
      // 触屏摇杆与拖拽视角状态
      stickPid: null,
      stickOrigin: { x: 0, y: 0 },
      stickVec: { x: 0, y: 0 },
      lookPid: null,
      lookLast: { x: 0, y: 0 },
      mouseDragging: false,
      mouseLast: { x: 0, y: 0 },
      _listeners: [],

      on(target, type, fn, opts) {
        target.addEventListener(type, fn, opts);
        this._listeners.push([target, type, fn, opts]);
      },

      mountDOM() {
        const optsHtml = CH.CHAPTERS.map((c) => `<option value="${c.index}">${c.num} · ${c.shortTitle}</option>`).join('');
        ctx.topbarSlot.innerHTML = `
          <div class="group">
            <select id="chChapterSel" title="切换剧情章节">${optsHtml}</select>
            <button id="chBtnLock" class="toggle" title="锁定/解锁当前敌人 (F)">🎯 锁敌</button>
            <button id="chBtnRestart" class="primary" title="重新开始本回 (R)">↻ 重打本回</button>
            <button id="chBtnTouch" class="toggle" title="开关触屏武侠键位">🎮 触屏键</button>
          </div>
        `;

        ctx.hudSlot.innerHTML = `
          <div id="chHud" class="ch-hud">
            <div class="ch-top-left">
              <div class="ch-chapter-tag" id="chChapterTag">第一回 · 终南古墓</div>
              <div class="ch-sub-pills">
                <span class="hud-pill" id="chWavePill">⚔️ 第 1/3 阵</span>
                <span class="hud-pill gold" id="chParryPill">✨ 弹反 0</span>
                <span class="hud-pill mono" id="chScorePill">★ 0</span>
              </div>
            </div>

            <div class="ch-boss-bar hidden" id="chBossBar">
              <div class="ch-boss-name" id="chBossName">赤练仙子 · 李莫愁</div>
              <div class="ch-boss-hp-track"><div class="ch-boss-hp-fill" id="chBossHpFill"></div></div>
              <div class="ch-boss-posture-track"><div class="ch-boss-posture-fill" id="chBossPostureFill"></div></div>
            </div>

            <div class="ch-center-reticle" id="chReticle">
              <div class="ch-peril-kanji hidden" id="chPerilKanji">危</div>
              <div class="ch-reticle-ring" id="chReticleRing"></div>
              <div class="ch-reticle-dot"></div>
              <div class="ch-threat-arc hidden" id="chThreatArc"></div>
              <div class="ch-callout hidden" id="chCallout">完美弹反！</div>
            </div>

            <div class="ch-bottom-left">
              <div class="ch-weapon-badges">
                <span class="ch-weapon-pill" id="chWeaponBadge">🗡️ 右手 · 君子剑</span>
                <span class="ch-skill-pill" id="chSkillBadge">✨ E · 玉女素心剑气</span>
              </div>
              <div class="ch-bars">
                <div class="ch-bar hp"><div class="ch-bar-fill" id="chHpFill"></div><span id="chHpText">气血 120/120</span></div>
                <div class="ch-bar chi"><div class="ch-bar-fill" id="chChiFill"></div><span id="chChiText">内力 45/100</span></div>
                <div class="ch-bar posture"><div class="ch-bar-fill" id="chPostureFill"></div><span id="chPostureText">架势稳定</span></div>
              </div>
            </div>
          </div>
        `;

        ctx.floatSlot.innerHTML = `
          <button id="chFloatLock" class="toggle" title="锁定敌人">🎯</button>
          <button id="chFloatRestart" title="重打本回">↻</button>
          <button id="chFloatFs" title="全屏/横屏">⛶</button>
          <button id="chFloatBgm" class="toggle active" title="音乐开关">🎵</button>
          <button id="chFloatHub" class="primary" title="返回大厅">🏠 大厅</button>
        `;
        ctx.floatSlot.classList.remove('hidden');

        ctx.overlaySlot.innerHTML = `
          <div id="chTip" class="ch-tip"></div>
          <div id="chBossQuote" class="ch-boss-quote hidden"></div>
          <div id="chHurtFlash" class="ns-hurt-flash hidden"></div>
          <div id="chParryFlash" class="ch-parry-flash hidden"></div>

          <div id="chStoryModal" class="ch-story-modal hidden">
            <div class="ch-story-card">
              <div class="ch-story-head">
                <span class="ch-story-avatar" id="chStoryAvatar">🤍</span>
                <div>
                  <div class="ch-story-speaker" id="chStorySpeaker">小龙女</div>
                  <div class="ch-story-loc" id="chStoryLoc">终南山 · 活死人墓</div>
                </div>
              </div>
              <div class="ch-story-text" id="chStoryText"></div>
              <div class="ch-story-actions">
                <button id="chStorySkip">跳过</button>
                <button id="chStoryNext" class="primary">继续 (Space) ▶</button>
              </div>
            </div>
          </div>

          <div id="chWinModal" class="ns-modal hidden">
            <div class="win-card ch-win-card">
              <div class="win-badge" id="chWinRank">S</div>
              <div class="win-title" id="chWinTitle">剑破强敌 · 本回通关</div>
              <div class="win-stats" id="chWinStats"></div>
              <div class="ch-win-epilogue" id="chWinEpilogue"></div>
              <div class="win-actions">
                <button id="chBtnNextChapter" class="primary">▶ 下一回</button>
                <button id="chBtnWinReplay">↻ 再战本回</button>
                <button id="chBtnWinHub">🏠 返回大厅</button>
              </div>
            </div>
          </div>

          <div id="chDeadModal" class="ns-modal hidden">
            <div class="win-card">
              <div class="win-badge" style="background:linear-gradient(135deg,#ef4444,#7f1d1d)">败</div>
              <div class="win-title" style="color:#fb7185">内力耗尽 · 重伤退却</div>
              <div class="win-stats" id="chDeadStats">再接再厉，善用精准弹反破防与轻功闪避！</div>
              <div class="win-actions">
                <button id="chBtnDeadReplay" class="primary">↻ 重整旗鼓 (R)</button>
                <button id="chBtnDeadHub">🏠 返回大厅</button>
              </div>
            </div>
          </div>

          <div id="chTouchControls" class="ch-touch hidden">
            <div id="chStick" class="ch-stick">
              <div id="chStickKnob" class="ch-stick-knob"></div>
            </div>
            <div class="ch-touch-right">
              <button class="ch-tbtn lock" id="chTouchLock">🎯 锁敌</button>
              <button class="ch-tbtn skill" id="chTouchSkill">✨ 绝学</button>
              <button class="ch-tbtn dodge" id="chTouchDodge">💨 轻功</button>
              <button class="ch-tbtn parry" id="chTouchParry">🛡️ 弹反</button>
              <button class="ch-tbtn atk" id="chTouchAtk">⚔️ 出剑</button>
            </div>
          </div>
        `;
      },

      syncButtons() {
        const locked = !!(this.state && this.state.lockTargetId);
        if ($('chBtnLock')) $('chBtnLock').classList.toggle('active', locked);
        if ($('chFloatLock')) $('chFloatLock').classList.toggle('active', locked);
        if ($('chTouchLock')) $('chTouchLock').classList.toggle('active', locked);
        if ($('chBtnTouch')) $('chBtnTouch').classList.toggle('active', this.touchEnabled);
        if ($('chFloatBgm')) $('chFloatBgm').classList.toggle('active', ctx.audio.bgmOn);
        if ($('chTouchControls')) $('chTouchControls').classList.toggle('hidden', !this.touchEnabled);
        if ($('chChapterSel')) $('chChapterSel').value = String(this.chapterIdx);

        const tip = $('chTip');
        if (tip) {
          tip.innerHTML = this.touchEnabled
            ? '左摇杆走位 · 滑屏转视角 · <b>⚔️ 出剑</b> · <b>🛡️ 弹反</b>红光「危」 · <b>💨 轻功</b>躲金光 · <b>✨ 绝学</b>'
            : (this.pointerLocked
              ? '已锁定鼠标视角 (ESC 释放) · <b>WASD</b> 走位 · <b>左键/J</b> 出剑 · <b>右键/K</b> 弹反格挡 · <b>Shift/Space</b> 轻功 · <b>E</b> 绝学 · <b>F</b> 锁敌'
              : '点击画面锁定视角（或拖拽旋转）· <b>WASD</b> 走位 · <b>左键/J</b> 出剑 · <b>右键/K</b> 弹反 · <b>Shift/Space</b> 轻功 · <b>E</b> 绝学 · <b>F</b> 锁敌');
        }
      },

      showCallout(text, cls = '') {
        const el = $('chCallout');
        if (!el) return;
        el.textContent = text;
        el.className = 'ch-callout ' + cls;
        this.bannerTimer = 1.05;
      },

      startStory(lines, location, onDone) {
        this.storyQueue = (lines || []).slice();
        this.storyOnDone = onDone || null;
        this.storyActive = this.storyQueue.length > 0;
        if (!this.storyActive) {
          if (this.storyOnDone) this.storyOnDone();
          return;
        }
        if (document.pointerLockElement) {
          try { document.exitPointerLock(); } catch (e) { /* ignore */ }
        }
        $('chStoryLoc').textContent = location || '';
        $('chStoryModal').classList.remove('hidden');
        this.renderStoryStep();
      },

      renderStoryStep() {
        const cur = this.storyQueue[0];
        if (!cur) {
          this.finishStory();
          return;
        }
        $('chStoryAvatar').textContent = cur.icon || '🗡️';
        $('chStorySpeaker').textContent = cur.speaker || '';
        $('chStoryText').textContent = cur.text || '';
        $('chStoryNext').textContent = this.storyQueue.length > 1 ? '继续 (Space) ▶' : '拔剑迎敌 (Space) ⚔️';
      },

      advanceStory() {
        if (!this.storyActive) return;
        this.storyQueue.shift();
        if (this.storyQueue.length === 0) this.finishStory();
        else this.renderStoryStep();
      },

      finishStory() {
        this.storyActive = false;
        this.storyQueue = [];
        $('chStoryModal').classList.add('hidden');
        const cb = this.storyOnDone;
        this.storyOnDone = null;
        if (cb) cb();
      },

      startChapter(idx, showIntro = true) {
        this.chapterIdx = Math.max(0, Math.min(CH.CHAPTERS.length - 1, idx | 0));
        this.state = CH.newState(this.chapterIdx, (Date.now() & 0xffffff) || 2026);
        this.bossBannerTimer = 0;
        this.bannerTimer = 0;
        this.hurtFlashTimer = 0;
        this.parryScreenTimer = 0;
        $('chWinModal').classList.add('hidden');
        $('chDeadModal').classList.add('hidden');
        $('chBossQuote').classList.add('hidden');
        $('chHurtFlash').classList.add('hidden');
        $('chParryFlash').classList.add('hidden');

        // 切章时清理旧敌人与飞行物网格
        if (this.renderer) {
          for (const [, m] of this.renderer.enemyMeshes.entries()) {
            this.renderer.enemyGroup.remove(m);
            Studio.disposeObject(m);
          }
          this.renderer.enemyMeshes.clear();
          for (const [, m] of this.renderer.projMeshes.entries()) {
            this.renderer.projGroup.remove(m);
            Studio.disposeObject(m);
          }
          this.renderer.projMeshes.clear();
          this.renderer.ensureScene(this.state);
        }

        ctx.audio.startBgm(this.state.chapter.bgm || 'wuxia_calm');
        this.syncButtons();
        this.updateHUD();
        ctx.setStatus(`${this.state.chapter.num} · ${this.state.chapter.title} | ${this.state.weapon.desc}`);

        if (showIntro) {
          this.startStory(this.state.chapter.intro, this.state.chapter.location);
        }
      },

      onEvent(ev) {
        ctx.audio.play(ev.type, ev);
        switch (ev.type) {
          case 'sword_swing':
            this.renderer?.pulseFov(ev.heavy ? 2.5 : 1.2);
            break;
          case 'sword_hit':
            this.renderer?.spawnSparks(ev.x, 1.35, ev.z, ev.crit ? 0xfde047 : 0x7dd3fc, ev.crit ? 20 : 10, ev.crit ? 9.5 : 6.5);
            this.renderer?.addShake(ev.crit ? 0.30 : (ev.heavy ? 0.16 : 0.08));
            if (ev.crit) {
              this.loop.freeze(0.065);
              this.showCallout('💥 破防处决！', 'crit');
              ctx.input.haptic(26);
            } else {
              this.loop.freeze(ev.heavy ? 0.032 : 0.018);
              ctx.input.haptic(8);
            }
            break;
          case 'parry':
            this.renderer?.spawnSparks(ev.x, 1.45, ev.z, 0xfef08a, 24, 10.5);
            this.renderer?.pulseFov(-3.5);
            this.renderer?.addShake(0.26);
            this.loop.freeze(0.06);
            this.parryScreenTimer = 0.24;
            $('chParryFlash').classList.remove('hidden');
            this.showCallout(ev.projectile ? '⚡ 弹反暗器！' : (ev.peril ? '⚡ 化危弹反！' : '⚡ 完美弹反！'), 'parry');
            ctx.input.haptic(22);
            break;
          case 'guard':
            this.renderer?.spawnSparks(this.state.px, 1.4, this.state.pz, 0xcbd5e1, 8, 5);
            this.renderer?.addShake(0.10);
            if (ev.broken) this.showCallout('⚠️ 架势被破！', 'hurt');
            break;
          case 'stagger':
            this.renderer?.spawnSparks(ev.x, 1.7, ev.z, 0xfacc15, 22, 8.5);
            this.showCallout('🌟 敌方破防 · 快出剑处决！', 'crit');
            ctx.input.haptic(20);
            break;
          case 'peril':
            this.showCallout(ev.kind === 'unblock' ? '⚠️ 金光破防 · 轻功闪避！' : '⚠️ 危 · 精准弹反或闪避！', 'peril');
            break;
          case 'dash':
            this.renderer?.pulseFov(5.2);
            ctx.input.haptic(10);
            break;
          case 'dodge_perfect':
            this.renderer?.pulseFov(6.0);
            this.showCallout('💨 轻功化险 · 内力+14', 'parry');
            break;
          case 'chi_wave':
            this.renderer?.pulseFov(4.0);
            this.renderer?.addShake(0.18);
            this.showCallout(`✨ ${this.state.skill.name}！`, 'parry');
            ctx.input.haptic(18);
            break;
          case 'palm_ult':
            this.renderer?.spawnSparks(ev.x, 1.2, ev.z, 0xfbbf24, 38, 13.5);
            this.renderer?.pulseFov(7.5);
            this.renderer?.addShake(0.45);
            this.loop.freeze(0.075);
            this.showCallout('🔥 黯然销魂掌 · 唯别而已！', 'crit');
            ctx.input.haptic(34);
            break;
          case 'hurt':
            this.renderer?.addShake(0.32);
            this.hurtFlashTimer = 0.28;
            $('chHurtFlash').classList.remove('hidden');
            ctx.input.haptic(24);
            break;
          case 'kill':
            this.renderer?.spawnSparks(ev.x, 1.3, ev.z, ev.isBoss ? 0xfacc15 : 0xfb7185, ev.isBoss ? 44 : 18, ev.isBoss ? 12 : 8);
            if (ev.isBoss) this.loop.freeze(0.09);
            break;
          case 'boss_enter': {
            ctx.audio.startBgm(this.state.chapter.bossBgm || 'wuxia_boss');
            const q = this.state.chapter.bossQuote;
            if (q) {
              const el = $('chBossQuote');
              el.innerHTML = `<span class="ch-bq-speaker">${q.icon} ${q.speaker}：</span>${q.text}`;
              el.classList.remove('hidden');
              this.bossBannerTimer = 4.2;
            }
            // 自动锁定 Boss，方便第一视角瞬间聚焦强敌
            if (this.state.bossId) {
              this.state.lockTargetId = this.state.bossId;
              this.syncButtons();
            }
            break;
          }
          case 'boss_phase2':
            this.renderer?.addShake(0.38);
            this.showCallout(`🔥 ${ev.name} · 十层龙象般若功！`, 'peril');
            break;
          case 'chapter_win':
            this.onChapterWin();
            break;
          case 'die':
            this.onDie();
            break;
        }
      },

      saveProgress() {
        ctx.storage.set('progress', this.progress);
        const clearedCount = Object.keys(this.progress.cleared || {}).length;
        const title = clearedCount >= 4 ? '神雕大侠 · 全通关' : `已通关 ${clearedCount}/4 回`;
        ctx.storage.setHubBadge(`${title} · ★${this.progress.bestScore}`);
      },

      onChapterWin() {
        if (document.pointerLockElement) {
          try { document.exitPointerLock(); } catch (e) { /* ignore */ }
        }
        const s = this.state;
        const ch = s.chapter;
        const prevRank = this.progress.cleared[ch.id];
        const order = { S: 4, A: 3, B: 2, C: 1 };
        if (!prevRank || (order[s.rank] || 0) > (order[prevRank] || 0)) {
          this.progress.cleared[ch.id] = s.rank;
        }
        if (s.score > (this.progress.bestScore || 0)) this.progress.bestScore = s.score;
        this.saveProgress();

        $('chWinRank').textContent = s.rank;
        $('chWinTitle').textContent = `${ch.num} · ${ch.shortTitle} 通关！`;
        $('chWinStats').textContent = `评分 ${s.rank} · 弹反 ${s.parries} 次 · 处决 ${s.crits} 次 · 用时 ${Math.round(s.time)}s · 积分 ${s.score}`;
        const epi = (ch.epilogue || []).map((l) => `「${l.speaker}」${l.text}`).join(' ');
        $('chWinEpilogue').textContent = epi;
        const hasNext = this.chapterIdx < CH.CHAPTERS.length - 1;
        $('chBtnNextChapter').classList.toggle('hidden', !hasNext);
        if (hasNext) {
          const nextCh = CH.CHAPTERS[this.chapterIdx + 1];
          $('chBtnNextChapter').textContent = `▶ ${nextCh.num} · ${nextCh.shortTitle}`;
        }
        $('chWinModal').classList.remove('hidden');
      },

      onDie() {
        if (document.pointerLockElement) {
          try { document.exitPointerLock(); } catch (e) { /* ignore */ }
        }
        const s = this.state;
        $('chDeadStats').textContent = `${s.chapter.num} · 弹反 ${s.parries} 次 · 击破 ${s.kills} 敌 · 积分 ${s.score}`;
        $('chDeadModal').classList.remove('hidden');
      },

      updateHUD() {
        const s = this.state;
        if (!s) return;

        $('chChapterTag').textContent = `${s.chapter.num} · ${s.chapter.title}`;
        $('chWavePill').textContent = s.phase === 'boss' ? '🔥 首领决战' : `⚔️ 第 ${s.wave}/${s.totalWaves} 阵`;
        $('chParryPill').textContent = `✨ 弹反 ${s.parries}`;
        $('chScorePill').textContent = `★ ${s.score}`;

        const handLabel = s.hand === 'left' ? '独臂左手' : '右手';
        $('chWeaponBadge').textContent = `${s.hand === 'left' ? '⚔️' : '🗡️'} ${handLabel} · ${s.weapon.name}`;
        const skillReady = s.chi >= s.skill.cost && s.skillCd <= 0;
        const skEl = $('chSkillBadge');
        skEl.textContent = `✨ E · ${s.skill.name}`;
        skEl.classList.toggle('ready', skillReady);
        if ($('chTouchSkill')) $('chTouchSkill').classList.toggle('ready', skillReady);

        // 玩家三槽
        $('chHpFill').style.width = `${Math.max(0, Math.min(100, (s.hp / s.maxHp) * 100))}%`;
        $('chHpText').textContent = `气血 ${Math.ceil(s.hp)}/${s.maxHp}`;
        $('chChiFill').style.width = `${Math.max(0, Math.min(100, (s.chi / s.maxChi) * 100))}%`;
        $('chChiText').textContent = `内力 ${Math.floor(s.chi)}/${s.maxChi}`;
        $('chPostureFill').style.width = `${Math.max(0, Math.min(100, (s.posture / s.maxPosture) * 100))}%`;
        $('chPostureText').textContent = s.postureBreakTimer > 0 ? '⚠️ 架势失衡' : (s.guardHeld ? '🛡️ 格挡中' : '架势稳定');

        // Boss 血条 + 架势条
        const boss = s.enemies.find((e) => e.isBoss);
        const bossBar = $('chBossBar');
        if (boss) {
          bossBar.classList.remove('hidden');
          $('chBossName').textContent = boss.staggerTimer > 0
            ? `${boss.name} · 🌟 破防可处决！`
            : (boss.phase2 ? `${boss.name} · 🔥 十层龙象` : boss.name);
          $('chBossHpFill').style.width = `${Math.max(0, (boss.hp / boss.maxHp) * 100)}%`;
          $('chBossPostureFill').style.width = `${Math.max(0, (boss.posture / boss.maxPosture) * 100)}%`;
        } else {
          bossBar.classList.add('hidden');
        }

        // 准星状态 + 红光「危」/ 金光「破」预警 + 方向威胁弧
        const ring = $('chReticleRing');
        ring.classList.toggle('locked', !!s.lockTargetId);
        ring.classList.toggle('parry', s.parryTimer > 0 || s.parryFlash > 0);

        const perilEl = $('chPerilKanji');
        const threatArc = $('chThreatArc');
        let topThreat = null;
        for (const t of s.threats) {
          if (!topThreat || (t.kind !== 'normal' && topThreat.kind === 'normal') || t.progress > topThreat.progress) {
            topThreat = t;
          }
        }
        if (topThreat) {
          threatArc.classList.remove('hidden');
          const deg = (topThreat.relAngle * 180) / Math.PI;
          threatArc.style.transform = `translate(-50%, -50%) rotate(${deg.toFixed(1)}deg)`;
          threatArc.dataset.kind = topThreat.kind;
          if (topThreat.kind === 'peril' || topThreat.kind === 'unblock') {
            perilEl.classList.remove('hidden');
            perilEl.textContent = topThreat.kind === 'unblock' ? '破' : '危';
            perilEl.dataset.kind = topThreat.kind;
          } else {
            perilEl.classList.add('hidden');
          }
        } else {
          threatArc.classList.add('hidden');
          perilEl.classList.add('hidden');
        }
      },

      sampleInput() {
        const k = this.keys;
        let moveX = (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0) + this.stickVec.x;
        let moveY = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0) - this.stickVec.y;
        const len = Math.hypot(moveX, moveY);
        if (len > 1) { moveX /= len; moveY /= len; }

        // 键盘备用左右转向（无鼠标/触屏也能丝滑转头）
        let yawDelta = this.pending.yawDelta;
        if (k.ArrowLeft || k.KeyQ) yawDelta += 2.35 * CH.DT;
        if (k.ArrowRight) yawDelta -= 2.35 * CH.DT;

        const out = {
          moveX,
          moveY,
          yawDelta,
          pitchDelta: this.pending.pitchDelta,
          attackPressed: this.pending.attack,
          guardPressed: this.pending.guardPressed,
          guardHeld: this.pending.guardHeld || !!k.KeyK,
          dodgePressed: this.pending.dodge,
          skillPressed: this.pending.skill,
          lockPressed: this.pending.lock,
        };
        this.pending.yawDelta = 0;
        this.pending.pitchDelta = 0;
        this.pending.attack = false;
        this.pending.guardPressed = false;
        this.pending.dodge = false;
        this.pending.skill = false;
        this.pending.lock = false;
        return out;
      },

      bindEvents() {
        const canvas = ctx.gfx.canvas;

        // 顶部与弹窗按钮
        this.on($('chChapterSel'), 'change', (e) => {
          this.startChapter(parseInt(e.target.value, 10) || 0, true);
          e.target.blur();
        });
        const toggleLock = () => { this.pending.lock = true; };
        this.on($('chBtnLock'), 'click', toggleLock);
        this.on($('chFloatLock'), 'click', toggleLock);
        this.on($('chBtnRestart'), 'click', () => this.startChapter(this.chapterIdx, false));
        this.on($('chFloatRestart'), 'click', () => this.startChapter(this.chapterIdx, false));
        this.on($('chBtnTouch'), 'click', () => {
          this.touchEnabled = !this.touchEnabled;
          this.syncButtons();
        });
        this.on($('chFloatFs'), 'click', () => ctx.toggleFullscreen());
        this.on($('chFloatBgm'), 'click', () => {
          ctx.audio.toggleBgm();
          ctx.syncGlobalButtons();
          this.syncButtons();
        });
        this.on($('chFloatHub'), 'click', () => ctx.goHub());

        this.on($('chStoryNext'), 'click', () => this.advanceStory());
        this.on($('chStorySkip'), 'click', () => this.finishStory());
        this.on($('chBtnNextChapter'), 'click', () => this.startChapter(this.chapterIdx + 1, true));
        this.on($('chBtnWinReplay'), 'click', () => this.startChapter(this.chapterIdx, false));
        this.on($('chBtnWinHub'), 'click', () => ctx.goHub());
        this.on($('chBtnDeadReplay'), 'click', () => this.startChapter(this.chapterIdx, false));
        this.on($('chBtnDeadHub'), 'click', () => ctx.goHub());

        // 键盘控制
        this.on(window, 'keydown', (e) => {
          if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) return;
          ctx.audio.ensure();
          this.keys[e.code] = true;

          if (this.storyActive) {
            if (e.code === 'Space' || e.code === 'Enter') {
              e.preventDefault();
              this.advanceStory();
            } else if (e.code === 'Escape') {
              this.finishStory();
            }
            return;
          }

          if (e.code === 'Space' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
            e.preventDefault();
            if (!e.repeat) this.pending.dodge = true;
          } else if (e.code === 'KeyJ') {
            if (!e.repeat) this.pending.attack = true;
          } else if (e.code === 'KeyK') {
            if (!e.repeat) this.pending.guardPressed = true;
          } else if (e.code === 'KeyE') {
            if (!e.repeat) this.pending.skill = true;
          } else if (e.code === 'KeyF' || e.code === 'Tab') {
            e.preventDefault();
            if (!e.repeat) this.pending.lock = true;
          } else if (e.code === 'KeyR') {
            if (!e.repeat) this.startChapter(this.chapterIdx, false);
          }
        });

        this.on(window, 'keyup', (e) => {
          this.keys[e.code] = false;
        });

        // 桌面 Pointer Lock + 鼠标点击/拖拽双模式
        this.on(document, 'pointerlockchange', () => {
          this.pointerLocked = document.pointerLockElement === canvas;
          this.syncButtons();
        });

        this.on(canvas, 'contextmenu', (e) => e.preventDefault());

        this.on(canvas, 'mousedown', (e) => {
          if (this.storyActive || this.state?.dead || this.state?.chapterWon) return;
          ctx.audio.ensure();
          if (e.button === 0) {
            this.pending.attack = true;
            if (document.hasFocus() && !this.pointerLocked && !this.touchEnabled && canvas.requestPointerLock) {
              try {
                const res = canvas.requestPointerLock();
                if (res && typeof res.catch === 'function') res.catch(() => {});
              } catch (err) { /* ignore */ }
            }
            this.mouseDragging = true;
            this.mouseLast.x = e.clientX;
            this.mouseLast.y = e.clientY;
          } else if (e.button === 2) {
            this.pending.guardPressed = true;
            this.pending.guardHeld = true;
          }
        });

        this.on(window, 'mouseup', (e) => {
          if (e.button === 0) this.mouseDragging = false;
          if (e.button === 2) this.pending.guardHeld = false;
        });

        this.on(window, 'mousemove', (e) => {
          if (this.storyActive) return;
          if (this.pointerLocked) {
            this.pending.yawDelta -= (e.movementX || 0) * 0.0028;
            this.pending.pitchDelta -= (e.movementY || 0) * 0.0022;
          } else if (this.mouseDragging) {
            const dx = e.clientX - this.mouseLast.x;
            const dy = e.clientY - this.mouseLast.y;
            this.mouseLast.x = e.clientX;
            this.mouseLast.y = e.clientY;
            this.pending.yawDelta -= dx * 0.0045;
            this.pending.pitchDelta -= dy * 0.0032;
          }
        });

        // 移动端画布触屏滑屏转视角
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
            this.pending.yawDelta -= dx * 0.0052;
            this.pending.pitchDelta -= dy * 0.0036;
          } else if (e.pointerId === this.stickPid) {
            const dx = e.clientX - this.stickOrigin.x;
            const dy = e.clientY - this.stickOrigin.y;
            const maxR = 40;
            const d = Math.hypot(dx, dy) || 1;
            const cl = Math.min(maxR, d);
            const nx = (dx / d) * (cl / maxR);
            const ny = (dy / d) * (cl / maxR);
            this.stickVec.x = nx;
            this.stickVec.y = ny;
            const knob = $('chStickKnob');
            if (knob) knob.style.transform = `translate(${(nx * maxR).toFixed(1)}px, ${(ny * maxR).toFixed(1)}px)`;
          }
        });
        const endPtr = (e) => {
          if (e.pointerId === this.lookPid) this.lookPid = null;
          if (e.pointerId === this.stickPid) {
            this.stickPid = null;
            this.stickVec.x = 0;
            this.stickVec.y = 0;
            const knob = $('chStickKnob');
            if (knob) knob.style.transform = 'translate(0px, 0px)';
          }
        };
        this.on(window, 'pointerup', endPtr);
        this.on(window, 'pointercancel', endPtr);

        // 左下摇杆
        const stick = $('chStick');
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

        // 右下四键武侠动作盘
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

        bindBtn('chTouchAtk', () => { this.pending.attack = true; });
        bindBtn('chTouchParry',
          () => { this.pending.guardPressed = true; this.pending.guardHeld = true; },
          () => { this.pending.guardHeld = false; }
        );
        bindBtn('chTouchDodge', () => { this.pending.dodge = true; });
        bindBtn('chTouchSkill', () => { this.pending.skill = true; });
        bindBtn('chTouchLock', () => { this.pending.lock = true; });
      },

      mount() {
        this.progress = ctx.storage.get('progress', { cleared: {}, bestScore: 0 });
        this.touchEnabled = window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 860 || window.innerHeight <= 540;
        this.mountDOM();
        ctx.gfx.ensure(ctx.stage);
        this.renderer = new CH.Renderer3D(ctx.gfx);
        ctx.setPlaying(true);
        ctx.input.setVisible(false);

        this.bindEvents();
        this.on(window, 'resize', () => ctx.gfx.resize());
        this.startChapter(0, true);

        let hudTick = 0;
        this.loop = new ctx.FixedLoop({
          dt: CH.DT,
          onTick: () => {
            if (!this.state) return;
            if (this.bannerTimer > 0) {
              this.bannerTimer -= CH.DT;
              if (this.bannerTimer <= 0 && $('chCallout')) $('chCallout').classList.add('hidden');
            }
            if (this.bossBannerTimer > 0) {
              this.bossBannerTimer -= CH.DT;
              if (this.bossBannerTimer <= 0 && $('chBossQuote')) $('chBossQuote').classList.add('hidden');
            }
            if (this.hurtFlashTimer > 0) {
              this.hurtFlashTimer -= CH.DT;
              if (this.hurtFlashTimer <= 0 && $('chHurtFlash')) $('chHurtFlash').classList.add('hidden');
            }
            if (this.parryScreenTimer > 0) {
              this.parryScreenTimer -= CH.DT;
              if (this.parryScreenTimer <= 0 && $('chParryFlash')) $('chParryFlash').classList.add('hidden');
            }

            if (this.storyActive || this.state.dead || this.state.chapterWon) return;

            const prevLock = this.state.lockTargetId;
            const inp = this.sampleInput();
            CH.step(this.state, inp);
            for (const ev of this.state.events) this.onEvent(ev);
            if (this.state.lockTargetId !== prevLock) this.syncButtons();
          },
          onFrame: (frameDt) => {
            if (!this.state || !this.renderer) return;
            this.renderer.render(this.state, Math.min(0.05, frameDt || CH.DT));
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
        if (document.pointerLockElement) {
          try { document.exitPointerLock(); } catch (e) { /* ignore */ }
        }
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
