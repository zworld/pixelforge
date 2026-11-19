/* Studio Core — 跨游戏共享程序化 WebAudio 音效引擎 + 动态 BGM 音序器（零外部音频素材） */
(function (G) {
  'use strict';
  const Studio = (G.Studio = G.Studio || {});

  const PENTATONIC = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  const midiFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  // 内置 5 套风格化 BGM（各游戏可通过 registerTrack 扩展新曲目）
  const BGM_TRACKS = {
    meadow: {
      bpm: 132, wave: 'triangle', bassWave: 'sine',
      lead: [72, 0, 76, 79, 84, 0, 79, 76, 74, 0, 77, 81, 79, 0, 76, 0,
             72, 0, 76, 79, 88, 0, 84, 79, 81, 79, 76, 74, 72, 0, 0, 0],
      bass: [48, 0, 55, 0, 48, 0, 55, 0, 50, 0, 55, 0, 55, 0, 43, 0,
             48, 0, 55, 0, 52, 0, 55, 0, 53, 0, 55, 0, 48, 0, 43, 0],
    },
    cyber: {
      bpm: 142, wave: 'sawtooth', bassWave: 'square',
      lead: [69, 72, 76, 81, 79, 76, 72, 76, 65, 69, 72, 77, 76, 72, 69, 72,
             67, 71, 74, 79, 76, 74, 71, 67, 64, 68, 71, 76, 79, 76, 71, 68],
      bass: [45, 45, 57, 45, 45, 45, 57, 45, 41, 41, 53, 41, 41, 41, 53, 41,
             43, 43, 55, 43, 43, 43, 55, 43, 40, 40, 52, 40, 40, 40, 52, 40],
    },
    frost: {
      bpm: 112, wave: 'sine', bassWave: 'triangle',
      lead: [76, 0, 79, 0, 83, 0, 86, 0, 83, 0, 79, 0, 78, 0, 74, 0,
             76, 0, 81, 0, 84, 0, 88, 0, 86, 0, 83, 0, 79, 0, 0, 0],
      bass: [52, 0, 0, 59, 52, 0, 0, 59, 50, 0, 0, 57, 50, 0, 0, 57,
             48, 0, 0, 55, 48, 0, 0, 55, 47, 0, 0, 54, 52, 0, 0, 0],
    },
    volcano: {
      bpm: 148, wave: 'square', bassWave: 'sawtooth',
      lead: [64, 0, 67, 64, 70, 0, 69, 67, 64, 0, 67, 71, 70, 69, 67, 0,
             64, 64, 76, 0, 75, 0, 74, 71, 70, 67, 64, 62, 64, 0, 0, 0],
      bass: [40, 40, 0, 40, 46, 0, 45, 43, 40, 40, 0, 40, 43, 45, 46, 0,
             40, 40, 0, 40, 47, 0, 46, 43, 45, 43, 40, 38, 40, 0, 38, 0],
    },
    synthwave: {
      bpm: 136, wave: 'sawtooth', bassWave: 'sawtooth',
      lead: [69, 0, 76, 79, 81, 0, 79, 76, 72, 0, 76, 79, 76, 0, 74, 72,
             65, 0, 72, 76, 77, 0, 76, 72, 67, 71, 74, 79, 76, 0, 74, 0],
      bass: [45, 45, 45, 57, 45, 45, 57, 45, 48, 48, 48, 60, 48, 48, 55, 48,
             41, 41, 41, 53, 41, 41, 53, 41, 43, 43, 43, 55, 43, 43, 55, 43],
    },
    // 国风五声调式（羽调式 A-C-D-E-G）：古筝/洞箫意境
    wuxia_calm: {
      bpm: 96, wave: 'triangle', bassWave: 'sine',
      lead: [69, 0, 72, 74, 76, 0, 79, 76, 74, 0, 72, 69, 67, 0, 69, 0,
             76, 0, 79, 81, 79, 0, 76, 74, 72, 74, 76, 72, 69, 0, 0, 0],
      bass: [45, 0, 0, 52, 45, 0, 0, 52, 43, 0, 0, 50, 45, 0, 43, 0,
             48, 0, 0, 55, 43, 0, 0, 50, 45, 0, 52, 0, 45, 0, 0, 0],
    },
    // 襄阳决战 / Boss 战鼓五声疾奏
    wuxia_boss: {
      bpm: 146, wave: 'sawtooth', bassWave: 'triangle',
      lead: [69, 69, 76, 74, 72, 0, 74, 76, 79, 0, 76, 74, 72, 69, 67, 0,
             69, 72, 74, 76, 81, 0, 79, 76, 74, 76, 74, 72, 69, 0, 67, 0],
      bass: [45, 45, 0, 45, 52, 0, 50, 48, 43, 43, 0, 43, 45, 0, 43, 45,
             45, 45, 0, 48, 50, 0, 48, 45, 43, 43, 45, 48, 45, 0, 43, 0],
    },
  };

  class AudioEngine {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.noiseBuf = null;
      this.sfxOn = true;
      this.bgmOn = true;
      this.bgmPlaying = false;
      this.bgmTheme = 'meadow';
      this.bgmStep = 0;
      this.bgmTimer = null;
      this.unlocked = false;
    }

    registerTrack(id, track) {
      BGM_TRACKS[id] = track;
    }

    bindAutoUnlock() {
      if (this.unlocked || typeof window === 'undefined') return;
      const unlock = () => {
        this.unlocked = true;
        this.ensure();
        window.removeEventListener('pointerdown', unlock);
        window.removeEventListener('touchstart', unlock);
        window.removeEventListener('keydown', unlock);
      };
      window.addEventListener('pointerdown', unlock, { passive: true });
      window.addEventListener('touchstart', unlock, { passive: true });
      window.addEventListener('keydown', unlock, { passive: true });
    }

    ensure() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
        return this.ctx;
      }
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return null;
      this.ctx = new AC();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -16;
      comp.ratio.value = 6;
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(comp).connect(this.ctx.destination);

      const len = Math.floor(this.ctx.sampleRate * 0.5);
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      return this.ctx;
    }

    tone(wave, f0, f1, dur, vol, delay = 0, filterHz = 0) {
      const ctx = this.ensure();
      if (!ctx) return;
      const now = ctx.currentTime + delay;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = wave;
      o.frequency.setValueAtTime(Math.max(20, f0), now);
      if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), now + dur);
      g.gain.setValueAtTime(Math.max(0.0001, vol), now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      if (filterHz > 0) {
        const flt = ctx.createBiquadFilter();
        flt.type = 'lowpass';
        flt.frequency.setValueAtTime(filterHz, now);
        o.connect(flt).connect(g).connect(this.master);
      } else {
        o.connect(g).connect(this.master);
      }
      o.start(now);
      o.stop(now + dur + 0.02);
    }

    noise(dur, vol, freq0, freq1, q = 1.2, delay = 0) {
      const ctx = this.ensure();
      if (!ctx || !this.noiseBuf) return;
      const now = ctx.currentTime + delay;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const flt = ctx.createBiquadFilter();
      flt.type = 'bandpass';
      flt.Q.value = q;
      flt.frequency.setValueAtTime(freq0, now);
      flt.frequency.exponentialRampToValueAtTime(Math.max(40, freq1), now + dur);
      const g = ctx.createGain();
      g.gain.setValueAtTime(vol, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
      src.connect(flt).connect(g).connect(this.master);
      src.start(now);
      src.stop(now + dur + 0.02);
    }

    play(type, ev = {}) {
      if (!this.sfxOn) return;
      try {
        switch (type) {
          // ---- 平台跳跃类音效 ----
          case 'jump':
            this.tone('square', 280, 580, 0.09, 0.07, 0, 2600);
            this.tone('triangle', 220, 440, 0.07, 0.06);
            break;
          case 'walljump':
            this.tone('triangle', 320, 680, 0.08, 0.09);
            this.noise(0.05, 0.07, 1400, 500, 1.5);
            break;
          case 'dash':
            this.noise(0.14, 0.16, 1300, 240, 0.9);
            this.tone('sawtooth', 190, 58, 0.13, 0.12, 0, 800);
            break;
          case 'wavedash':
            this.noise(0.12, 0.14, 1600, 420, 1.1);
            this.tone('triangle', 340, 880, 0.14, 0.11);
            this.tone('square', 520, 1040, 0.12, 0.06, 0.03, 2400);
            break;
          case 'coin':
          case 'xp': {
            const idx = Math.min(PENTATONIC.length - 1, Math.max(0, (ev.streak || 1) - 1));
            const base = midiFreq((type === 'xp' ? 79 : 76) + PENTATONIC[idx] * 0.5);
            this.tone(type === 'xp' ? 'sine' : 'square', base, base, 0.05, type === 'xp' ? 0.045 : 0.055, 0, 3200);
            this.tone('triangle', base * 1.5, base * 1.5, 0.11, 0.065, 0.04);
            break;
          }
          case 'stomp': {
            const pitch = 1 + Math.min(5, (ev.combo || 1) - 1) * 0.16;
            this.tone('triangle', 360 * pitch, 110, 0.11, 0.14);
            this.tone('square', 440 * pitch, 660 * pitch, 0.09, 0.06, 0.03, 2200);
            break;
          }
          case 'crystal':
            this.tone('sine', 1046, 1046, 0.09, 0.09, 0);
            this.tone('sine', 1318, 1318, 0.10, 0.09, 0.04);
            this.tone('triangle', 1568, 2093, 0.16, 0.10, 0.08);
            break;
          case 'switch':
            if (ev.on) {
              this.tone('square', 523, 784, 0.08, 0.08, 0, 2400);
              this.tone('triangle', 784, 1046, 0.11, 0.09, 0.04);
            } else {
              this.tone('square', 659, 440, 0.08, 0.08, 0, 2400);
              this.tone('triangle', 440, 330, 0.11, 0.09, 0.04);
            }
            break;
          case 'crumbleStart':
            this.noise(0.08, 0.06, 480, 220, 2.0);
            break;
          case 'crumbleBreak':
            this.noise(0.16, 0.12, 600, 140, 1.0);
            this.tone('sawtooth', 140, 55, 0.14, 0.08, 0, 600);
            break;
          case 'checkpoint':
            this.tone('triangle', 523, 523, 0.09, 0.10, 0);
            this.tone('triangle', 659, 659, 0.09, 0.10, 0.07);
            this.tone('triangle', 1046, 1046, 0.24, 0.11, 0.14);
            break;
          case 'spring':
            this.tone('sine', 190, 920, 0.20, 0.12);
            this.tone('triangle', 320, 1200, 0.14, 0.06, 0.03);
            break;
          case 'break':
            this.noise(0.13, 0.14, 900, 180, 1.0);
            this.tone('sawtooth', 240, 60, 0.12, 0.09, 0, 1200);
            break;
          // ---- 射击 / 肉鸽生存类音效 ----
          case 'shoot':
            this.tone('triangle', 680, 220, 0.055, 0.045, 0, 2600);
            break;
          case 'hit':
            this.tone('square', 220, 110, 0.04, 0.04, 0, 1400);
            break;
          case 'kill':
            this.noise(0.09, 0.08, 800, 160, 1.0);
            this.tone('triangle', 300, 90, 0.09, 0.08);
            break;
          case 'lightning':
            this.noise(0.11, 0.11, 2400, 900, 1.8);
            this.tone('sawtooth', 1200, 420, 0.09, 0.06, 0, 2800);
            break;
          case 'shockwave':
            this.noise(0.26, 0.18, 950, 110, 0.7);
            this.tone('sawtooth', 260, 42, 0.28, 0.14, 0, 700);
            this.tone('sine', 420, 90, 0.24, 0.12);
            break;
          case 'hurt':
            this.noise(0.14, 0.14, 600, 160, 0.9);
            this.tone('sawtooth', 190, 65, 0.16, 0.11, 0, 900);
            break;
          case 'levelup':
            [523, 659, 784, 1047].forEach((f, i) => {
              this.tone('triangle', f, f * 1.02, 0.14, 0.095, i * 0.065);
            });
            break;
          case 'boss':
            this.tone('sawtooth', 110, 75, 0.35, 0.12, 0, 650);
            this.tone('sawtooth', 105, 68, 0.35, 0.12, 0.22, 650);
            break;
          // ---- 武侠第一人称剑术 / 弹反 / 绝学音效 ----
          case 'sword_swing': {
            const heavy = !!ev.heavy;
            this.noise(heavy ? 0.17 : 0.10, heavy ? 0.15 : 0.10, heavy ? 700 : 1600, heavy ? 140 : 420, 1.1);
            this.tone('triangle', heavy ? 170 : 340, heavy ? 70 : 140, heavy ? 0.15 : 0.08, heavy ? 0.11 : 0.06);
            break;
          }
          case 'sword_hit': {
            const heavy = !!ev.heavy || !!ev.crit;
            this.noise(0.09, heavy ? 0.16 : 0.11, 1400, 320, 1.0);
            this.tone('sawtooth', heavy ? 280 : 380, heavy ? 85 : 130, 0.10, heavy ? 0.12 : 0.08, 0, 1500);
            if (ev.crit) this.tone('triangle', 880, 1320, 0.12, 0.09, 0.02);
            break;
          }
          case 'parry':
            // 只狼 / 燕云式清脆金属高共振弹反音（多泛音叠加）
            this.tone('triangle', 1560, 1480, 0.24, 0.14);
            this.tone('sine', 2380, 2240, 0.28, 0.11, 0.005);
            this.tone('square', 3120, 2950, 0.14, 0.045, 0, 4200);
            this.noise(0.08, 0.13, 3400, 1400, 2.2);
            break;
          case 'guard':
            this.tone('triangle', 420, 260, 0.12, 0.11);
            this.tone('square', 780, 520, 0.09, 0.05, 0, 1800);
            this.noise(0.07, 0.09, 1200, 400, 1.4);
            break;
          case 'stagger':
            // 破防震鸣：深沉金钟 + 碎裂高音
            this.tone('sawtooth', 165, 82, 0.34, 0.14, 0, 900);
            this.tone('triangle', 1175, 1760, 0.26, 0.10, 0.02);
            this.noise(0.16, 0.12, 1800, 420, 1.0);
            break;
          case 'peril':
            // 「危」字红光预警锐鸣
            this.tone('sawtooth', 880, 620, 0.16, 0.10, 0, 2400);
            this.tone('sine', 1320, 990, 0.18, 0.08, 0.04);
            break;
          case 'chi_wave':
            // 玉女剑气 / 玄铁剑罡：五声滑音 + 劲风爆发
            [587, 784, 988, 1175].forEach((f, i) => this.tone('triangle', f, f * 1.04, 0.16, 0.07, i * 0.028));
            this.noise(0.24, 0.15, 1100, 220, 0.8);
            this.tone('sawtooth', 210, 65, 0.24, 0.12, 0, 850);
            break;
          case 'palm_ult':
            // 黯然销魂掌：苍茫低鸣 + 惊雷掌印震爆
            this.noise(0.38, 0.20, 850, 90, 0.65);
            this.tone('sawtooth', 150, 38, 0.42, 0.16, 0, 680);
            [440, 523, 659, 880].forEach((f, i) => this.tone('triangle', f, f * 0.96, 0.32, 0.08, i * 0.04));
            break;
          case 'die':
            this.noise(0.22, 0.14, 700, 120, 0.8);
            this.tone('sawtooth', 420, 70, 0.36, 0.10, 0, 1100);
            this.tone('square', 220, 55, 0.32, 0.06, 0.06, 800);
            break;
          case 'win':
            [523, 659, 784, 1047, 1319].forEach((f, i) => {
              this.tone('triangle', f, f, i === 4 ? 0.42 : 0.11, 0.10, i * 0.085);
              this.tone('square', f * 0.5, f * 0.5, i === 4 ? 0.38 : 0.09, 0.035, i * 0.085, 1800);
            });
            break;
        }
      } catch (e) { /* 无音频环境忽略 */ }
    }

    startBgm(theme) {
      this.bgmTheme = BGM_TRACKS[theme] ? theme : 'meadow';
      if (!this.bgmOn) return;
      this.stopBgm();
      this.bgmPlaying = true;
      this.bgmStep = 0;
      const track = BGM_TRACKS[this.bgmTheme];
      const stepMs = (60000 / track.bpm) / 2;
      const tick = () => {
        if (!this.bgmPlaying || !this.bgmOn) return;
        const tr = BGM_TRACKS[this.bgmTheme] || BGM_TRACKS.meadow;
        const n = this.bgmStep % tr.lead.length;
        const lead = tr.lead[n];
        const bass = tr.bass[n];
        const dur = (stepMs / 1000) * 0.85;
        if (this.ctx && this.ctx.state === 'running') {
          if (lead > 0) this.tone(tr.wave, midiFreq(lead), midiFreq(lead), dur, 0.028, 0, 1400);
          if (bass > 0) this.tone(tr.bassWave, midiFreq(bass), midiFreq(bass), dur * 0.9, 0.026, 0, 620);
        }
        this.bgmStep++;
      };
      this.ensure();
      this.bgmTimer = setInterval(tick, stepMs);
    }

    stopBgm() {
      this.bgmPlaying = false;
      if (this.bgmTimer) { clearInterval(this.bgmTimer); this.bgmTimer = null; }
    }

    toggleBgm(activePlay, theme) {
      this.bgmOn = !this.bgmOn;
      if (!this.bgmOn) this.stopBgm();
      else if (activePlay) this.startBgm(theme || this.bgmTheme);
      return this.bgmOn;
    }
  }

  Studio.Audio = new AudioEngine();
  if (typeof window !== 'undefined') Studio.Audio.bindAutoUnlock();
})(typeof window !== 'undefined' ? window : globalThis);
