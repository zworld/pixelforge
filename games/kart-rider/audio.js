/* 跑跑卡丁车 · 巅峰漂移 — 程序化 WebAudio 引擎音效（动态引擎转速声/漂移轮胎啸叫/小喷大喷/3-2-1-GO/道具与冲线欢呼 + 繁荣山丘欢快主题 BGM） */
(function (G) {
  'use strict';
  const KR = (G.KR = G.KR || {});
  const Studio = G.Studio;

  // 注册 2 首跑跑卡丁车专属欢快动感 BGM 至共享 AudioEngine
  if (Studio && Studio.audio && Studio.audio.registerTrack) {
    Studio.audio.registerTrack('kart_boomhill', {
      bpm: 138,
      wave: 'square',
      bassWave: 'triangle',
      // 明快昂扬的大调繁荣山丘竞速旋律！
      lead: [
        72, 76, 79, 84, 0, 81, 79, 76, 74, 77, 81, 79, 0, 76, 74, 0,
        72, 76, 79, 84, 88, 0, 86, 84, 81, 83, 84, 0, 79, 0, 72, 0,
      ],
      bass: [
        48, 0, 55, 48, 53, 0, 55, 53, 50, 0, 55, 50, 55, 0, 43, 47,
        48, 0, 55, 48, 52, 0, 55, 52, 53, 0, 55, 43, 48, 0, 48, 0,
      ],
    });
    Studio.audio.registerTrack('kart_cyber', {
      bpm: 148,
      wave: 'sawtooth',
      bassWave: 'square',
      lead: [
        69, 72, 76, 81, 0, 79, 76, 72, 74, 77, 81, 86, 0, 84, 81, 79,
        76, 79, 83, 88, 0, 86, 83, 79, 81, 79, 76, 74, 76, 0, 69, 0,
      ],
      bass: [
        45, 45, 57, 45, 45, 45, 57, 45, 50, 50, 62, 50, 50, 50, 62, 50,
        52, 52, 64, 52, 52, 52, 64, 52, 45, 45, 57, 43, 45, 0, 45, 0,
      ],
    });
  }

  class KartAudio {
    constructor(studioAudio) {
      this.audio = studioAudio;
      this.engOsc = null;
      this.engGain = null;
      this.engFilter = null;
      this.screechSrc = null;
      this.screechGain = null;
      this.screechFilter = null;
      this.running = false;
    }

    ensureEngineNodes() {
      if (this.running || !this.audio || !this.audio.sfxOn) return;
      const ac = this.audio.ctx;
      if (!ac || ac.state !== 'running') return;
      try {
        // 引擎连续低沉锯齿音 + 动态低通滤波
        const osc = ac.createOscillator();
        const flt = ac.createBiquadFilter();
        const gain = ac.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = 68;
        flt.type = 'lowpass';
        flt.frequency.value = 260;
        gain.gain.value = 0.001;
        osc.connect(flt);
        flt.connect(gain);
        gain.connect(this.audio.master || ac.destination);
        osc.start();
        this.engOsc = osc;
        this.engFilter = flt;
        this.engGain = gain;

        // 漂移轮胎啸叫（白噪声经带通滤波）
        const bufLen = ac.sampleRate * 1.5;
        const nBuf = ac.createBuffer(1, bufLen, ac.sampleRate);
        const ch = nBuf.getChannelData(0);
        for (let i = 0; i < bufLen; i++) ch[i] = Math.random() * 2 - 1;
        const nSrc = ac.createBufferSource();
        nSrc.buffer = nBuf;
        nSrc.loop = true;
        const nFlt = ac.createBiquadFilter();
        nFlt.type = 'bandpass';
        nFlt.frequency.value = 1450;
        nFlt.Q.value = 4.2;
        const nGain = ac.createGain();
        nGain.gain.value = 0.0001;
        nSrc.connect(nFlt);
        nFlt.connect(nGain);
        nGain.connect(this.audio.master || ac.destination);
        nSrc.start();
        this.screechSrc = nSrc;
        this.screechFilter = nFlt;
        this.screechGain = nGain;
        this.running = true;
      } catch {}
    }

    /** 每帧根据车速、氮气与漂移角平滑调制引擎轰鸣与轮胎摩擦声 */
    updateContinuous(player, phase) {
      if (!this.audio || !this.audio.sfxOn) {
        this.stopEngine();
        return;
      }
      this.ensureEngineNodes();
      if (!this.running || !this.audio.ctx) return;
      const now = this.audio.ctx.currentTime;
      const speedNorm = Math.min(1.5, Math.max(0, player.speed / 55));
      const isNitro = player.nitroTimer > 0 || player.startBoostTimer > 0 || player.padBoostTimer > 0;
      const isMini = player.miniBoostTimer > 0;

      const targetFreq = 62 + speedNorm * 118 + (isNitro ? 55 : (isMini ? 24 : 0));
      const targetCut = 240 + speedNorm * 580 + (isNitro ? 420 : 0);
      const targetVol = phase === 'finished' ? 0.025 : (0.035 + speedNorm * 0.045 + (isNitro ? 0.025 : 0));

      this.engOsc.frequency.setTargetAtTime(targetFreq, now, 0.05);
      this.engFilter.frequency.setTargetAtTime(targetCut, now, 0.06);
      this.engGain.gain.setTargetAtTime(targetVol, now, 0.06);

      // 漂移轮胎啸叫
      const screech = (player.drifting && player.onGround && player.speed > 18) ? Math.min(0.08, 0.03 + Math.abs(player.driftAngle) * 0.08) : 0.0001;
      this.screechFilter.frequency.setTargetAtTime(1250 + Math.abs(player.driftAngle) * 650, now, 0.05);
      this.screechGain.gain.setTargetAtTime(screech, now, 0.04);
    }

    playTone(freq, freqEnd, dur, type = 'triangle', vol = 0.16, delay = 0) {
      if (!this.audio || !this.audio.sfxOn) return;
      const ac = this.audio.ensure ? this.audio.ensure() : this.audio.ctx;
      if (!ac || ac.state !== 'running') return;
      try {
        const t0 = ac.currentTime + delay;
        const osc = ac.createOscillator();
        const g = ac.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, t0);
        if (freqEnd && freqEnd !== freq) {
          osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
        }
        g.gain.setValueAtTime(0.001, t0);
        g.gain.linearRampToValueAtTime(vol, t0 + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
        osc.connect(g);
        g.connect(this.audio.master || ac.destination);
        osc.start(t0);
        osc.stop(t0 + dur + 0.02);
      } catch {}
    }

    /** 处理本帧物理引擎发出的所有音效事件 */
    handleEvents(events) {
      for (const ev of events) {
        if (ev.type === 'countdown_beep') {
          this.playTone(440, 440, 0.16, 'square', 0.14);
        } else if (ev.type === 'countdown_go') {
          this.playTone(880, 1175, 0.36, 'square', 0.18);
        } else if (ev.type === 'start_boost' || ev.type === 'nitro') {
          if (ev.isPlayer || ev.type === 'start_boost') {
            this.playTone(220, 740, 0.38, 'sawtooth', 0.18);
            this.playTone(440, 1120, 0.28, 'triangle', 0.14, 0.06);
          }
        } else if (ev.type === 'mini_boost' && ev.isPlayer) {
          const base = ev.combo >= 2 ? 420 : 320;
          this.playTone(base, base * 2.1, 0.22, 'sawtooth', 0.15);
        } else if (ev.type === 'pad_boost' && ev.isPlayer) {
          this.playTone(520, 1280, 0.26, 'triangle', 0.16);
        } else if (ev.type === 'nitro_ready' && ev.isPlayer) {
          this.playTone(660, 660, 0.10, 'triangle', 0.15, 0);
          this.playTone(880, 1046, 0.18, 'triangle', 0.16, 0.08);
        } else if (ev.type === 'wall_cancel' || (ev.type === 'wall_bump' && ev.isPlayer)) {
          this.playTone(130, 55, 0.16, 'sawtooth', 0.16);
        } else if (ev.type === 'box_pickup' && ev.isPlayer) {
          this.playTone(587, 880, 0.10, 'sine', 0.14, 0);
          this.playTone(784, 1175, 0.12, 'sine', 0.14, 0.07);
        } else if (ev.type === 'item_got') {
          this.playTone(1046, 1318, 0.16, 'triangle', 0.16);
        } else if (ev.type === 'fire_proj' && ev.isPlayer) {
          this.playTone(720, 260, 0.22, 'sawtooth', 0.14);
        } else if (ev.type === 'hit' && ev.isPlayer) {
          this.playTone(180, 48, 0.35, 'sawtooth', 0.22);
        } else if (ev.type === 'bubble_trap' && ev.isPlayer) {
          this.playTone(320, 620, 0.28, 'sine', 0.18);
        } else if (ev.type === 'bubble_pop' && ev.isPlayer) {
          this.playTone(680, 1480, 0.14, 'sine', 0.16);
        } else if ((ev.type === 'shield' || ev.type === 'shield_block') && ev.isPlayer) {
          this.playTone(660, 1320, 0.22, 'triangle', 0.16);
        } else if (ev.type === 'lap') {
          const notes = ev.isFinal ? [523, 659, 784, 1046] : [523, 659, 784];
          notes.forEach((n, idx) => this.playTone(n, n, 0.14, 'square', 0.14, idx * 0.09));
        } else if (ev.type === 'race_over') {
          const fanfare = ev.rank <= 3 ? [523, 659, 784, 1046, 1318] : [392, 349, 330, 294];
          fanfare.forEach((n, idx) => this.playTone(n, n, 0.18, 'triangle', 0.16, idx * 0.11));
        }
      }
    }

    stopEngine() {
      if (!this.running) return;
      try { this.engOsc.stop(); } catch {}
      try { this.screechSrc.stop(); } catch {}
      try { this.engOsc.disconnect(); this.engFilter.disconnect(); this.engGain.disconnect(); } catch {}
      try { this.screechSrc.disconnect(); this.screechFilter.disconnect(); this.screechGain.disconnect(); } catch {}
      this.engOsc = this.engFilter = this.engGain = null;
      this.screechSrc = this.screechFilter = this.screechGain = null;
      this.running = false;
    }
  }

  KR.KartAudio = KartAudio;
})(typeof window !== 'undefined' ? window : globalThis);
