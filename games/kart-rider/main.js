/* Game 5: 跑跑卡丁车 · 巅峰漂移 — 1:1 全方面复刻（竞速赛/道具赛双模式、4大经典赛道、4大传奇赛车、8人同场竞技、实景小地图与经典仪表盘） */
(function () {
  'use strict';
  const Studio = window.Studio;
  const KR = window.KR;

  function fmtTime(sec) {
    if (!isFinite(sec) || sec < 0) return '00:00.00';
    const mins = Math.floor(sec / 60);
    const rem = sec - mins * 60;
    const s = Math.floor(rem);
    const cs = Math.floor((rem - s) * 100);
    return `${String(mins).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
  }

  function rankOrdinal(n) {
    if (n === 1) return '1st';
    if (n === 2) return '2nd';
    if (n === 3) return '3rd';
    return `${n}th`;
  }

  Studio.defineGame('kart-rider', (ctx) => {
    const $ = (id) => document.getElementById(id);

    const game = {
      state: null,
      renderer: null,
      kAudio: null,
      loop: null,
      trackIdx: 0,
      mode: 'speed',       // 'speed' | 'item'
      kartId: 'saber',
      driverId: 'dao',
      progress: { bestTimes: {}, wins: 0, coins: 0 },
      keys: Object.create(null),
      pending: { useItem: false, swapItem: false, reset: false, steerTap: false },
      touch: { left: false, right: false, drift: false, boost: false },
      touchEnabled: false,
      calloutTimer: 0,
      finishShown: false,
      minimapCtx: null,
      _listeners: [],

      on(target, type, fn, opts) {
        if (!target) return;
        target.addEventListener(type, fn, opts);
        this._listeners.push([target, type, fn, opts]);
      },

      mountDOM() {
        const trackOpts = KR.TRACK_DEFS.map(
          (t) => `<option value="${t.index}">${'★'.repeat(t.difficulty)} ${t.shortTitle}</option>`
        ).join('');

        ctx.topbarSlot.innerHTML = `
          <div class="group">
            <select id="krTrackSel" title="选择经典赛道">${trackOpts}</select>
            <button id="krBtnMode" class="toggle active" title="切换 竞速赛 / 道具赛">🏎️ 竞速赛</button>
            <button id="krBtnGarage" title="打开车库更换传奇赛车与车手">🔧 车库</button>
            <button id="krBtnQuality" class="toggle active" title="切换 3A 泛光画质 / 流畅模式">✨ 3A光影</button>
            <button id="krBtnRestart" class="primary" title="重开本局 (R)">↻ 重开</button>
            <button id="krBtnTouch" class="toggle" title="开关移动端漂移手柄">🎮 触屏</button>
          </div>
        `;

        ctx.hudSlot.innerHTML = `
          <div id="krHud" class="kr-hud">
            <!-- 经典左上：2 格 N2O / 道具队列 + 赛道信息 -->
            <div class="kr-top-left">
              <div class="kr-slots">
                <div class="kr-slot primary" id="krSlot0">
                  <span class="kr-slot-ico" id="krSlot0Ico"></span>
                  <span class="kr-slot-key">SPACE</span>
                </div>
                <div class="kr-slot" id="krSlot1">
                  <span class="kr-slot-ico" id="krSlot1Ico"></span>
                  <span class="kr-slot-key">NEXT</span>
                </div>
              </div>
              <div class="kr-track-meta">
                <span class="kr-mode-badge" id="krModeBadge">竞速赛</span>
                <span class="kr-track-name" id="krTrackName">城镇高速公路</span>
                <span class="kr-kart-tag" id="krKartTag">尖锋 PRO · 皮蛋</span>
              </div>
            </div>

            <!-- 经典正中顶部：圈数 + 计时器 + 10秒冲线倒计时 -->
            <div class="kr-top-center">
              <div class="kr-lap-box">
                <span class="kr-lap-lbl">LAP</span>
                <b id="krLapVal">1 / 2</b>
              </div>
              <div class="kr-time-box">
                <span class="kr-lap-lbl">TIME</span>
                <b id="krTimeVal">00:00.00</b>
              </div>
              <div id="krFinishCd" class="kr-finish-cd hidden">⏱ 10</div>
            </div>

            <!-- 经典右上：硕大名次徽章 + 实时 8 车手小地图雷达 -->
            <div class="kr-top-right">
              <div class="kr-rank-card" id="krRankCard">
                <span class="kr-rank-num" id="krRankNum">4th</span>
                <span class="kr-rank-tot">/ 8</span>
              </div>
              <canvas id="krMinimap" class="kr-minimap" width="152" height="152"></canvas>
            </div>

            <!-- 居中：3-2-1-GO 起跑灯 + 技巧飘字 + 道具预警条 -->
            <div id="krCountdown" class="kr-countdown hidden">3</div>
            <div id="krCallout" class="kr-callout hidden">🔥 漂移小喷！</div>
            <div id="krWarnBanner" class="kr-warn-banner hidden">⚠️ 导弹锁定！快开启护盾！</div>

            <!-- 经典左下：段位漂移集气槽 (N2O Gauge) + 快捷键说明 -->
            <div class="kr-bottom-left" id="krGaugeBox">
              <div class="kr-gauge-hdr">
                <span>⚡ N2O 集气槽</span>
                <span id="krGaugePct">0%</span>
              </div>
              <div class="kr-gauge-track">
                <div class="kr-gauge-fill" id="krGaugeFill"></div>
                <div class="kr-gauge-pending" id="krGaugePending"></div>
              </div>
              <div class="kr-combo-tag" id="krComboTag">按住 Shift + A/D 漂移集气 · 松漂点 W 触发小喷/双喷</div>
            </div>

            <!-- 经典右下：圆盘模拟 + 数字时速表 (km/h) -->
            <div class="kr-speedo" id="krSpeedo">
              <svg viewBox="0 0 140 140" class="kr-speedo-svg">
                <circle cx="70" cy="70" r="56" class="kr-sp-bg" />
                <circle cx="70" cy="70" r="56" class="kr-sp-arc" id="krSpeedArc" stroke-dasharray="264 360" stroke-dashoffset="264" />
              </svg>
              <div class="kr-speedo-txt">
                <b id="krSpeedNum">0</b>
                <span>km/h</span>
              </div>
              <div class="kr-nitro-pill hidden" id="krNitroPill">N2O BOOST</div>
            </div>
          </div>
        `;

        ctx.floatSlot.innerHTML = `
          <button id="krFloatMode" title="切换竞速/道具模式">🏎️</button>
          <button id="krFloatGarage" title="车库换车">🔧</button>
          <button id="krFloatRestart" title="重开本局">↻</button>
          <button id="krFloatFs" title="全屏横屏">⛶</button>
          <button id="krFloatBgm" class="toggle active" title="音乐开关">🎵</button>
          <button id="krFloatHub" class="primary" title="返回大厅">🏠 大厅</button>
        `;
        ctx.floatSlot.classList.remove('hidden');

        ctx.overlaySlot.innerHTML = `
          <div id="krSpeedLines" class="kr-speed-lines hidden"></div>
          <div id="krTip" class="ch-tip"></div>

          <!-- 车库选车 / 选车手弹窗 -->
          <div id="krGarageModal" class="ns-modal hidden">
            <div class="kr-garage-card">
              <div class="kr-garage-hdr">
                <div>
                  <h2>🔧 繁荣山丘传奇车库</h2>
                  <p>挑选你的传奇卡丁车、车手与赛事模式，立即发车！</p>
                </div>
                <button id="krGarageClose" type="button">✕</button>
              </div>
              <div class="kr-garage-sec">
                <div class="kr-sec-title">1. 选择模式</div>
                <div class="kr-mode-picks" id="krModePicks">
                  <button type="button" class="kr-pick-btn active" data-mode="speed">🏎️ 个人竞速赛<span>Shift 漂移集气 · 小喷/双喷/N2O 大喷</span></button>
                  <button type="button" class="kr-pick-btn" data-mode="item">🎁 经典道具赛<span>8 大经典道具 · 导弹/水苍蝇/大魔王/飞碟/护盾</span></button>
                </div>
              </div>
              <div class="kr-garage-sec">
                <div class="kr-sec-title">2. 选择传奇赛车</div>
                <div class="kr-kart-grid" id="krKartGrid"></div>
              </div>
              <div class="kr-garage-sec">
                <div class="kr-sec-title">3. 选择车手</div>
                <div class="kr-driver-row" id="krDriverRow"></div>
              </div>
              <div class="kr-garage-foot">
                <button id="krGarageApply" class="primary" type="button">🏁 应用配置并立即发车</button>
              </div>
            </div>
          </div>

          <!-- 经典 8 人完赛领奖台结算弹窗 -->
          <div id="krFinishModal" class="ns-modal hidden">
            <div class="win-card kr-win-card">
              <div class="win-badge" id="krWinGrade">S</div>
              <div class="win-title" id="krWinTitle">🏆 恭喜夺冠！</div>
              <div class="kr-win-summary" id="krWinSummary"></div>
              <div class="kr-standings-table" id="krWinTable"></div>
              <div class="win-actions">
                <button id="krBtnNextTrack" class="primary">▶ 下一赛道</button>
                <button id="krBtnReplay">↻ 再来一局</button>
                <button id="krBtnOpenGarage">🔧 换车/换模式</button>
                <button id="krBtnBackHub">🏠 返回大厅</button>
              </div>
            </div>
          </div>

          <!-- 移动端跑跑手游布局触控手柄（左方向舵 + 自动油门 + 右漂移/大喷！） -->
          <div id="krTouchControls" class="kr-touch hidden">
            <div class="kr-touch-left">
              <button class="kr-tbtn dir" id="krTouchLeft" type="button">◀</button>
              <button class="kr-tbtn dir" id="krTouchRight" type="button">▶</button>
            </div>
            <div class="kr-touch-right">
              <button class="kr-tbtn reset" id="krTouchReset" type="button">🔄 复位</button>
              <button class="kr-tbtn drift" id="krTouchDrift" type="button">🛑 漂移</button>
              <button class="kr-tbtn boost" id="krTouchBoost" type="button">🔥 氮气</button>
            </div>
          </div>
        `;

        const mm = $('krMinimap');
        this.minimapCtx = mm ? mm.getContext('2d') : null;
        this.renderGarageUI();
      },

      renderGarageUI() {
        const kGrid = $('krKartGrid');
        if (kGrid) {
          kGrid.innerHTML = KR.KARTS.map((k) => {
            const pHex = '#' + k.primary.toString(16).padStart(6, '0');
            const sHex = '#' + k.secondary.toString(16).padStart(6, '0');
            const active = k.id === this.kartId ? 'active' : '';
            return `
              <button type="button" class="kr-kart-item ${active}" data-kart="${k.id}">
                <div class="kr-kart-swatch" style="background:linear-gradient(135deg,${pHex} 55%,${sHex} 100%)">${k.pipes === 3 ? '⚡⚡⚡' : '🏎️'}</div>
                <div class="kr-kart-info">
                  <b>${k.name} <small>${k.badge}</small></b>
                  <div class="kr-stat-bars">
                    <span>极速 <i style="width:${k.stats.speed}%"></i></span>
                    <span>加速 <i style="width:${k.stats.accel}%"></i></span>
                    <span>漂移 <i style="width:${k.stats.drift}%"></i></span>
                    <span>集气 <i style="width:${k.stats.charge}%"></i></span>
                  </div>
                </div>
              </button>
            `;
          }).join('');
        }
        const dRow = $('krDriverRow');
        if (dRow) {
          dRow.innerHTML = KR.DRIVERS.map((d) => {
            const hHex = '#' + d.helmet.toString(16).padStart(6, '0');
            const active = d.id === this.driverId ? 'active' : '';
            return `
              <button type="button" class="kr-driver-btn ${active}" data-driver="${d.id}">
                <span class="kr-drv-dot" style="background:${hHex}"></span>
                <b>${d.name}</b>
                <small>${d.title}</small>
              </button>
            `;
          }).join('');
        }
        document.querySelectorAll('#krModePicks .kr-pick-btn').forEach((b) => {
          b.classList.toggle('active', b.dataset.mode === this.mode);
        });
      },

      syncButtons() {
        const isSpeed = this.mode === 'speed';
        if ($('krBtnMode')) {
          $('krBtnMode').textContent = isSpeed ? '🏎️ 竞速赛' : '🎁 道具赛';
          $('krBtnMode').classList.toggle('active', isSpeed);
        }
        if ($('krFloatMode')) $('krFloatMode').textContent = isSpeed ? '🏎️' : '🎁';
        if ($('krTrackSel')) $('krTrackSel').value = String(this.trackIdx);
        if ($('krBtnTouch')) $('krBtnTouch').classList.toggle('active', this.touchEnabled);
        if ($('krTouchControls')) $('krTouchControls').classList.toggle('hidden', !this.touchEnabled);
        if ($('krTouchBoost')) $('krTouchBoost').textContent = isSpeed ? '🔥 氮气' : '🎁 道具';
        if ($('krFloatBgm')) $('krFloatBgm').classList.toggle('active', ctx.audio.bgmOn);
        if ($('krBtnQuality') && this.renderer) {
          $('krBtnQuality').classList.toggle('active', this.renderer.aaaQuality);
          $('krBtnQuality').textContent = this.renderer.aaaQuality ? '✨ 3A光影' : '⚡ 流畅画质';
        }
        if ($('krTip')) {
          $('krTip').innerHTML = this.touchEnabled
            ? '自动油门已开启 · <b>◀/▶</b> 转向 · <b>🛑 漂移</b> 切弯集气 · <b>🔥 氮气/道具</b> 爆发冲刺 · <b>🔄 复位</b>'
            : '<b>WASD / 方向键</b> 驾驶 · <b>Shift</b> 漂移集气（松漂轻点 <b>W/↑</b> 小喷/双喷）· <b>Space/Ctrl</b> 氮气/道具 · <b>Q</b> 道具换序 · <b>V</b> 复位 · <b>R</b> 重开';
        }
      },

      showCallout(text, color = '#fde047') {
        const el = $('krCallout');
        if (!el) return;
        el.textContent = text;
        el.style.borderColor = color;
        el.style.color = color;
        el.classList.remove('hidden');
        this.calloutTimer = 1.45;
      },

      startRace(trackIdx = this.trackIdx) {
        this.trackIdx = ((trackIdx % KR.TRACK_DEFS.length) + KR.TRACK_DEFS.length) % KR.TRACK_DEFS.length;
        this.finishShown = false;
        this.calloutTimer = 0;
        if ($('krFinishModal')) $('krFinishModal').classList.add('hidden');
        if ($('krGarageModal')) $('krGarageModal').classList.add('hidden');
        if ($('krCallout')) $('krCallout').classList.add('hidden');

        this.state = KR.createRaceState({
          trackIndex: this.trackIdx,
          mode: this.mode,
          kartId: this.kartId,
          driverId: this.driverId,
          seed: Date.now() & 0xffffff,
        });

        if (this.renderer) this.renderer.buildTrack(this.state);
        if (ctx.audio && ctx.audio.startBgm) {
          ctx.audio.startBgm(this.state.track.def.bgm || 'kart_boomhill');
        }

        const kart = KR.getKart(this.kartId);
        const drv = KR.getDriver(this.driverId);
        if ($('krModeBadge')) $('krModeBadge').textContent = this.mode === 'speed' ? '竞速赛' : '道具赛';
        if ($('krTrackName')) $('krTrackName').textContent = this.state.track.name;
        if ($('krKartTag')) $('krKartTag').textContent = `${kart.name} · ${drv.name}`;
        if ($('krGaugeBox')) $('krGaugeBox').style.opacity = this.mode === 'speed' ? '1' : '0.42';

        this.syncButtons();
        ctx.setStatus(`${this.state.track.name}（${this.mode === 'speed' ? '个人竞速' : '道具乱斗'}）| ${this.state.track.def.desc}`);
      },

      saveProgress(res) {
        const id = this.state.track.id;
        if (res.rank === 1) this.progress.wins = (this.progress.wins || 0) + 1;
        this.progress.coins = (this.progress.coins || 0) + (res.coins || 0);
        const prevBest = this.progress.bestTimes[id];
        if (!prevBest || res.time < prevBest) this.progress.bestTimes[id] = res.time;
        ctx.storage.set('progress', this.progress);
        ctx.storage.setHubBadge(`🏆 ${this.progress.wins} 冠 · 💰 ${this.progress.coins}`);
      },

      showFinishModal(res) {
        this.finishShown = true;
        this.saveProgress(res);
        const m = $('krFinishModal');
        if (!m) return;
        $('krWinGrade').textContent = res.grade;
        $('krWinTitle').textContent = res.rank === 1
          ? `🏆 冠军冲线 · ${this.state.track.name}`
          : `🏁 第 ${res.rank} 名完赛 · ${this.state.track.name}`;
        $('krWinSummary').innerHTML = `
          <span>⏱ 用时 <b>${fmtTime(res.time)}</b></span>
          <span>⚡ 极速 <b>${res.maxSpeedKmh} km/h</b></span>
          <span>💨 漂移 <b>${res.driftCount} 次</b></span>
          <span>🔥 喷射 <b>${res.boostCount} 次</b></span>
          <span>💰 金币 <b>+${res.coins}</b></span>
        `;
        const rows = (this.state.standings || []).map((r) => `
          <div class="kr-st-row ${r.isPlayer ? 'me' : ''}">
            <span class="st-rk">#${r.rank}</span>
            <span class="st-nm">${r.name}</span>
            <span class="st-kt">${r.kart.name}</span>
            <span class="st-tm">${fmtTime(r.finishTime)}</span>
          </div>
        `).join('');
        $('krWinTable').innerHTML = rows;
        m.classList.remove('hidden');
      },

      drawMinimap() {
        const c = this.minimapCtx;
        if (!c || !this.state) return;
        const W = 152, H = 152, pad = 16;
        c.clearRect(0, 0, W, H);

        const tr = this.state.track;
        const b = tr.bounds;
        const span = Math.max(1, Math.max(b.maxX - b.minX, b.maxZ - b.minZ));
        const sc = (W - pad * 2) / span;
        const ox = pad + ((W - pad * 2) - (b.maxX - b.minX) * sc) * 0.5;
        const oz = pad + ((H - pad * 2) - (b.maxZ - b.minZ) * sc) * 0.5;
        const tx = (x) => ox + (x - b.minX) * sc;
        const ty = (z) => oz + (z - b.minZ) * sc;

        // 赛道轮廓线
        c.strokeStyle = 'rgba(226, 232, 240, 0.82)';
        c.lineWidth = 6;
        c.lineJoin = 'round';
        c.beginPath();
        for (let i = 0; i < tr.segCount; i += 3) {
          const p = tr.samples[i];
          if (i === 0) c.moveTo(tx(p.x), ty(p.z));
          else c.lineTo(tx(p.x), ty(p.z));
        }
        c.closePath();
        c.stroke();

        // 起终点白黄点
        const p0 = tr.samples[0];
        c.fillStyle = '#fde047';
        c.beginPath(); c.arc(tx(p0.x), ty(p0.z), 4.2, 0, Math.PI * 2); c.fill();

        // 8 位车手实时雷达点
        for (const r of this.state.racers) {
          if (r.isPlayer) continue;
          c.fillStyle = '#' + r.driver.helmet.toString(16).padStart(6, '0');
          c.beginPath(); c.arc(tx(r.x), ty(r.z), 3.6, 0, Math.PI * 2); c.fill();
        }
        const me = this.state.player;
        c.fillStyle = '#ef4444';
        c.strokeStyle = '#ffffff';
        c.lineWidth = 2;
        c.beginPath(); c.arc(tx(me.x), ty(me.z), 5.5, 0, Math.PI * 2); c.fill(); c.stroke();
      },

      updateHUD(dt) {
        const s = this.state;
        const p = s.player;
        if (!s || !p) return;

        // 3-2-1-GO 起跑大字
        const cdEl = $('krCountdown');
        if (cdEl) {
          if (s.phase === 'countdown') {
            const n = Math.ceil(s.countdown);
            cdEl.textContent = n >= 1 ? String(n) : 'GO!';
            cdEl.style.color = n >= 1 ? '#facc15' : '#4ade80';
            cdEl.classList.remove('hidden');
          } else if (s.raceTime < 0.75) {
            cdEl.textContent = 'GO!';
            cdEl.style.color = '#4ade80';
            cdEl.classList.remove('hidden');
          } else {
            cdEl.classList.add('hidden');
          }
        }

        // 10 秒冲线倒计时
        const fcEl = $('krFinishCd');
        if (fcEl) {
          if (s.finishCountdown >= 0 && s.phase === 'racing') {
            fcEl.textContent = `⏱ ${Math.ceil(s.finishCountdown)}`;
            fcEl.classList.remove('hidden');
          } else {
            fcEl.classList.add('hidden');
          }
        }

        // 圈数、用时与名次
        if ($('krLapVal')) $('krLapVal').textContent = `${Math.min(p.lap, s.track.laps)} / ${s.track.laps}`;
        if ($('krTimeVal')) $('krTimeVal').textContent = fmtTime(s.raceTime);
        if ($('krRankNum')) {
          $('krRankNum').textContent = rankOrdinal(p.rank);
          const col = p.rank === 1 ? '#facc15' : (p.rank === 2 ? '#e2e8f0' : (p.rank === 3 ? '#fb923c' : '#38bdf8'));
          $('krRankNum').style.color = col;
        }

        // 2 格 N2O / 道具槽位
        const renderSlot = (idx) => {
          const box = $('krSlot' + idx);
          const ico = $('krSlot' + idx + 'Ico');
          if (!box || !ico) return;
          const itemId = p.slots[idx];
          if (itemId && KR.ITEMS[itemId]) {
            ico.textContent = KR.ITEMS[itemId].icon;
            box.style.borderColor = KR.ITEMS[itemId].color;
            box.classList.add('filled');
          } else if (idx === p.slots.length && p.rouletteTimer > 0) {
            const keys = Object.keys(KR.ITEMS);
            const spinItem = KR.ITEMS[keys[Math.floor(s.raceTime * 22) % keys.length]];
            ico.textContent = spinItem.icon;
            box.style.borderColor = '#e879f9';
            box.classList.add('filled');
          } else {
            ico.textContent = '';
            box.style.borderColor = 'rgba(255,255,255,0.22)';
            box.classList.remove('filled');
          }
        };
        renderSlot(0);
        renderSlot(1);

        // N2O 漂移集气槽（含已落袋气量 + 漂移中实时增长金色未落袋气量！）
        const banked = Math.min(100, p.nitroGauge);
        const pend = p.drifting && !p.driftCancelled ? Math.min(100 - banked, p.driftPendingCharge) : 0;
        if ($('krGaugeFill')) $('krGaugeFill').style.width = `${banked.toFixed(1)}%`;
        if ($('krGaugePending')) {
          $('krGaugePending').style.left = `${banked.toFixed(1)}%`;
          $('krGaugePending').style.width = `${pend.toFixed(1)}%`;
        }
        if ($('krGaugePct')) $('krGaugePct').textContent = `${Math.round(Math.min(100, banked + pend))}%`;

        // 圆形模拟 + 数字时速表
        const kmh = KR.getSpeedKmh(p);
        const isBoost = p.nitroTimer > 0 || p.startBoostTimer > 0 || p.padBoostTimer > 0 || p.magnetTimer > 0;
        if ($('krSpeedNum')) $('krSpeedNum').textContent = String(kmh);
        if ($('krSpeedArc')) {
          const ratio = Math.min(1, kmh / 335);
          $('krSpeedArc').setAttribute('stroke-dashoffset', String((264 * (1 - ratio)).toFixed(1)));
          $('krSpeedArc').style.stroke = isBoost ? '#38bdf8' : (kmh > 220 ? '#facc15' : '#f97316');
        }
        if ($('krNitroPill')) $('krNitroPill').classList.toggle('hidden', !isBoost);
        if ($('krSpeedLines')) $('krSpeedLines').classList.toggle('hidden', !isBoost);

        // 道具警报提示（导弹锁定 / 水泡挣扎 / 大魔王反转）
        const warn = $('krWarnBanner');
        if (warn) {
          if (p.bubbleTimer > 0) {
            warn.textContent = '💧 被水泡困住！疯狂交替按 A / D 加速挣脱！';
            warn.classList.remove('hidden');
          } else if (p.lockedByMissile) {
            warn.textContent = '🚨 警告：追踪导弹锁定！按 Space 开护盾！';
            warn.classList.remove('hidden');
          } else if (p.devilTimer > 0) {
            warn.textContent = '😈 中了大魔王诅咒！左右方向暂时反转！';
            warn.classList.remove('hidden');
          } else {
            warn.classList.add('hidden');
          }
        }

        // 飘字计时衰减
        if (this.calloutTimer > 0) {
          this.calloutTimer -= dt;
          if (this.calloutTimer <= 0 && $('krCallout')) $('krCallout').classList.add('hidden');
        }

        this.drawMinimap();
      },

      sampleInput() {
        const k = this.keys;
        let throttle = (k.KeyW || k.ArrowUp) ? 1 : 0;
        const brake = !!(k.KeyS || k.ArrowDown);
        // 触屏模式开启跑跑手游经典自动油门！
        if (this.touchEnabled && !brake) throttle = 1;

        let steer = 0;
        if (k.KeyA || k.ArrowLeft || this.touch.left) steer -= 1;
        if (k.KeyD || k.ArrowRight || this.touch.right) steer += 1;

        const drift = !!(k.ShiftLeft || k.ShiftRight || this.touch.drift);
        const useItem = this.pending.useItem;
        const swapItem = this.pending.swapItem;
        const reset = this.pending.reset;
        const steerTap = this.pending.steerTap;
        this.pending.useItem = this.pending.swapItem = this.pending.reset = this.pending.steerTap = false;

        return { throttle, brake, steer, drift, useItem, swapItem, reset, steerTap };
      },

      bindEvents() {
        this.on(window, 'keydown', (e) => {
          if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
          if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
          if (!this.keys[e.code]) {
            if (e.code === 'Space' || e.code === 'ControlLeft' || e.code === 'ControlRight' || e.code === 'KeyE' || e.code === 'KeyJ') {
              this.pending.useItem = true;
            }
            if (e.code === 'KeyQ' || e.code === 'KeyX') this.pending.swapItem = true;
            if (e.code === 'KeyV' || e.code === 'Backspace') this.pending.reset = true;
            if (e.code === 'KeyR') this.startRace(this.trackIdx);
            if (e.code === 'KeyA' || e.code === 'KeyD' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
              this.pending.steerTap = true;
            }
          }
          this.keys[e.code] = true;
        });
        this.on(window, 'keyup', (e) => { this.keys[e.code] = false; });
        this.on(window, 'blur', () => { this.keys = Object.create(null); });

        // 顶栏 & 浮窗控件
        this.on($('krTrackSel'), 'change', (e) => this.startRace(Number(e.target.value)));
        const toggleMode = () => {
          this.mode = this.mode === 'speed' ? 'item' : 'speed';
          this.renderGarageUI();
          this.startRace(this.trackIdx);
        };
        this.on($('krBtnMode'), 'click', toggleMode);
        this.on($('krFloatMode'), 'click', toggleMode);

        const openGarage = () => {
          this.renderGarageUI();
          if ($('krGarageModal')) $('krGarageModal').classList.remove('hidden');
        };
        this.on($('krBtnGarage'), 'click', openGarage);
        this.on($('krFloatGarage'), 'click', openGarage);
        this.on($('krBtnOpenGarage'), 'click', () => {
          if ($('krFinishModal')) $('krFinishModal').classList.add('hidden');
          openGarage();
        });
        this.on($('krGarageClose'), 'click', () => {
          if ($('krGarageModal')) $('krGarageModal').classList.add('hidden');
        });
        this.on($('krGarageApply'), 'click', () => this.startRace(this.trackIdx));

        // 车库选项委托点击
        this.on($('krGarageModal'), 'click', (e) => {
          const mb = e.target.closest('[data-mode]');
          if (mb) { this.mode = mb.dataset.mode; this.renderGarageUI(); return; }
          const kb = e.target.closest('[data-kart]');
          if (kb) { this.kartId = kb.dataset.kart; this.renderGarageUI(); return; }
          const db = e.target.closest('[data-driver]');
          if (db) { this.driverId = db.dataset.driver; this.renderGarageUI(); return; }
        });

        this.on($('krBtnQuality'), 'click', () => {
          if (!this.renderer) return;
          this.renderer.setQuality(!this.renderer.aaaQuality);
          this.syncButtons();
        });
        this.on($('krBtnRestart'), 'click', () => this.startRace(this.trackIdx));
        this.on($('krFloatRestart'), 'click', () => this.startRace(this.trackIdx));
        this.on($('krBtnReplay'), 'click', () => this.startRace(this.trackIdx));
        this.on($('krBtnNextTrack'), 'click', () => this.startRace(this.trackIdx + 1));
        this.on($('krBtnBackHub'), 'click', () => ctx.goHub());
        this.on($('krFloatHub'), 'click', () => ctx.goHub());
        this.on($('krFloatFs'), 'click', () => ctx.toggleFullscreen());
        this.on($('krFloatBgm'), 'click', () => { ctx.toggleBgm(); this.syncButtons(); });
        this.on($('krBtnTouch'), 'click', () => { this.touchEnabled = !this.touchEnabled; this.syncButtons(); });

        // 移动端触屏按键绑定
        const bindHold = (id, key, onDown) => {
          const el = $(id);
          if (!el) return;
          this.on(el, 'pointerdown', (e) => {
            e.preventDefault();
            if (key) this.touch[key] = true;
            el.classList.add('pressed');
            if (onDown) onDown();
          });
          const end = () => {
            if (key) this.touch[key] = false;
            el.classList.remove('pressed');
          };
          this.on(el, 'pointerup', end);
          this.on(el, 'pointercancel', end);
          this.on(el, 'pointerleave', end);
        };
        bindHold('krTouchLeft', 'left', () => { this.pending.steerTap = true; });
        bindHold('krTouchRight', 'right', () => { this.pending.steerTap = true; });
        bindHold('krTouchDrift', 'drift');
        bindHold('krTouchBoost', 'boost', () => { this.pending.useItem = true; });
        bindHold('krTouchReset', null, () => { this.pending.reset = true; });
      },

      mount() {
        this.progress = ctx.storage.get('progress', { bestTimes: {}, wins: 0, coins: 0 });
        this.touchEnabled = !!(ctx.input && ctx.input.touchEnabled);
        this.mountDOM();
        this.renderer = new KR.KartRenderer(ctx.gfx);
        this.kAudio = new KR.KartAudio(ctx.audio);
        this.bindEvents();
        this.startRace(0);

        this.loop = new Studio.FixedLoop({
          dt: 1 / 60,
          onTick: (dt) => {
            // 打开车库弹窗时暂停物理
            if ($('krGarageModal') && !$('krGarageModal').classList.contains('hidden')) return;
            const inp = this.sampleInput();
            KR.stepRace(this.state, inp, dt);
            // 处理引擎事件（飘字 + 相机震动 + 音效 + 完赛领奖台）
            if (this.state.events.length) {
              this.kAudio.handleEvents(this.state.events);
              for (const ev of this.state.events) {
                if (ev.type === 'callout') this.showCallout(ev.text, ev.color);
                if ((ev.type === 'nitro' || ev.type === 'start_boost') && ev.isPlayer !== false) this.renderer.addShake(0.24);
                if (ev.type === 'hit' && ev.isPlayer) this.renderer.addShake(0.55);
                if (ev.type === 'race_over' && !this.finishShown) this.showFinishModal(ev);
              }
            }
          },
          onFrame: (dt) => {
            this.renderer.render(this.state, dt);
            this.kAudio.updateContinuous(this.state.player, this.state.phase);
            this.updateHUD(dt);
          },
        });
        this.loop.start();
      },

      unmount() {
        if (this.loop) { this.loop.stop(); this.loop = null; }
        if (this.kAudio) { this.kAudio.stopEngine(); this.kAudio = null; }
        if (this.renderer) { this.renderer.dispose(); this.renderer = null; }
        for (const [t, type, fn, opts] of this._listeners) {
          t.removeEventListener(type, fn, opts);
        }
        this._listeners = [];
        this.keys = Object.create(null);
      },
    };

    return game;
  });
})();
