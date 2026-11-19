/* Studio Core — 跨游戏统一输入引擎（键盘 + Gamepad + 声明式多 Profile 移动端多点触控手柄） */
(function (G) {
  'use strict';
  const Studio = (G.Studio = G.Studio || {});

  const PROFILES = {
    platformer: {
      stick: true,
      btnA: { icon: '⬆', label: '跳跃', cls: 'touch-jump' },
      btnB: { icon: '⚡', label: '冲刺', cls: 'touch-dash' },
    },
    survivor: {
      stick: true,
      btnA: { icon: '⚡', label: '冲刺', cls: 'touch-dash-main' },
      btnB: { icon: '💥', label: '脉冲', cls: 'touch-nova' },
    },
    'arcade-lr': {
      stick: true,
      btnA: { icon: '🔥', label: '氮气', cls: 'touch-dash-main' },
      btnB: { icon: '🛑', label: '漂移', cls: 'touch-nova' },
    },
    none: { stick: false, btnA: null, btnB: null },
  };

  const detectTouchDevice = () => {
    if (typeof window === 'undefined') return false;
    return (
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
      navigator.maxTouchPoints > 0 ||
      window.innerWidth <= 860 ||
      window.innerHeight <= 540
    );
  };

  class InputManager {
    constructor() {
      this.keys = {};
      this.touch = { ax: 0, ay: 0, left: false, right: false, up: false, down: false, a: false, b: false };
      this.touchEnabled = detectTouchDevice();
      this.touchManual = false;
      this.profile = 'none';
      this.visible = false;
      this.onManualInput = null;
      this._bound = false;
    }

    initDOM(els) {
      if (this._bound || typeof window === 'undefined') return;
      this._bound = true;
      this.els = els; // { root, stick, knob, btnA, btnB }

      window.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
        this.keys[e.code] = true;
      });
      window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
      window.addEventListener('blur', () => { this.reset(); });

      // 左手虚拟摇杆
      const { stick, knob, btnA, btnB } = els;
      let stickPid = null;

      const updateStick = (clientX, clientY) => {
        const rect = stick.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const maxR = Math.max(1, rect.width * 0.34);
        const dx = clientX - cx;
        const dy = clientY - cy;
        const dist = Math.hypot(dx, dy);
        const clamped = Math.min(dist, maxR);
        const angle = Math.atan2(dy, dx);
        const kx = dist > 0 ? Math.cos(angle) * clamped : 0;
        const ky = dist > 0 ? Math.sin(angle) * clamped : 0;
        knob.style.transform = `translate(calc(-50% + ${kx.toFixed(1)}px), calc(-50% + ${ky.toFixed(1)}px))`;

        const nx = Math.max(-1, Math.min(1, dx / maxR));
        const ny = Math.max(-1, Math.min(1, dy / maxR));
        const mag = Math.hypot(nx, ny);
        this.touch.ax = mag > 0.16 ? nx : 0;
        this.touch.ay = mag > 0.16 ? ny : 0;
        this.touch.left = nx < -0.24;
        this.touch.right = nx > 0.24;
        this.touch.up = ny < -0.42;
        this.touch.down = ny > 0.42;
      };

      const releaseStick = () => {
        stickPid = null;
        this.touch.ax = this.touch.ay = 0;
        this.touch.left = this.touch.right = this.touch.up = this.touch.down = false;
        knob.style.transform = 'translate(-50%, -50%)';
      };

      stick.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        if (this.onManualInput) this.onManualInput();
        stickPid = e.pointerId;
        try { stick.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        updateStick(e.clientX, e.clientY);
      });
      stick.addEventListener('pointermove', (e) => {
        if (e.pointerId !== stickPid) return;
        e.preventDefault();
        updateStick(e.clientX, e.clientY);
      });
      const endStick = (e) => {
        if (stickPid !== null && (e.pointerId === stickPid || e.type === 'lostpointercapture')) releaseStick();
      };
      stick.addEventListener('pointerup', endStick);
      stick.addEventListener('pointercancel', endStick);
      stick.addEventListener('lostpointercapture', endStick);
      window.addEventListener('pointerup', endStick);

      const bindBtn = (el, slot) => {
        const pids = new Set();
        el.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          if (this.onManualInput) this.onManualInput();
          pids.add(e.pointerId);
          try { el.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
          this.touch[slot] = true;
          el.classList.add('pressed');
        });
        const release = (e) => {
          if (e.type === 'lostpointercapture') pids.clear();
          else pids.delete(e.pointerId);
          if (pids.size === 0) {
            this.touch[slot] = false;
            el.classList.remove('pressed');
          }
        };
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
        el.addEventListener('lostpointercapture', release);
      };
      bindBtn(btnA, 'a');
      bindBtn(btnB, 'b');
    }

    setProfile(profileName) {
      this.profile = PROFILES[profileName] ? profileName : 'none';
      const cfg = PROFILES[this.profile];
      if (!this.els) return;
      const { stick, btnA, btnB } = this.els;
      stick.classList.toggle('hidden', !cfg.stick);
      const applyBtn = (el, def) => {
        el.classList.toggle('hidden', !def);
        if (!def) return;
        el.className = `touch-btn ${def.cls}`;
        el.querySelector('.tb-icon').textContent = def.icon;
        el.querySelector('.tb-label').textContent = def.label;
      };
      applyBtn(btnA, cfg.btnA);
      applyBtn(btnB, cfg.btnB);
      this.syncVisibility();
    }

    setVisible(show) {
      this.visible = !!show;
      this.syncVisibility();
    }

    syncVisibility() {
      if (!this.els) return;
      const show = this.visible && this.touchEnabled && this.profile !== 'none';
      this.els.root.classList.toggle('hidden', !show);
    }

    setButtonSpent(slot, spent) {
      if (!this.els) return;
      const el = slot === 'a' ? this.els.btnA : this.els.btnB;
      if (el) el.classList.toggle('spent', !!spent);
    }

    onResize() {
      if (!this.touchManual) {
        this.touchEnabled = detectTouchDevice();
        this.syncVisibility();
      }
    }

    toggleTouch() {
      this.touchManual = true;
      this.touchEnabled = !this.touchEnabled;
      this.resetTouch();
      this.syncVisibility();
      return this.touchEnabled;
    }

    haptic(ms) {
      if (this.touchEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
        try { navigator.vibrate(ms); } catch (e) { /* ignore */ }
      }
    }

    resetTouch() {
      this.touch = { ax: 0, ay: 0, left: false, right: false, up: false, down: false, a: false, b: false };
      if (this.els) {
        this.els.knob.style.transform = 'translate(-50%, -50%)';
        this.els.btnA.classList.remove('pressed');
        this.els.btnB.classList.remove('pressed');
      }
    }

    reset() {
      this.keys = {};
      this.resetTouch();
    }

    // 统一读取平台/动作输入（同时兼容模拟摇杆与离散按键 + Gamepad）
    poll() {
      const k = this.keys;
      const t = this.touch;
      let left = !!(k.ArrowLeft || k.KeyA || t.left);
      let right = !!(k.ArrowRight || k.KeyD || t.right);
      let up = !!(k.ArrowUp || k.KeyW || t.up);
      let down = !!(k.ArrowDown || k.KeyS || t.down);
      let a = !!(k.Space || k.KeyZ || k.KeyK || t.a);
      let b = !!(k.ShiftLeft || k.ShiftRight || k.KeyX || k.KeyJ || k.KeyL || t.b);

      // 模拟向量（供 360° 全向移动游戏使用）
      let ax = (right ? 1 : 0) - (left ? 1 : 0);
      let ay = (down ? 1 : 0) - (up ? 1 : 0);
      if (t.ax !== 0 || t.ay !== 0) { ax = t.ax; ay = t.ay; }

      const pads = (typeof navigator !== 'undefined' && navigator.getGamepads) ? navigator.getGamepads() : [];
      const pad = pads && pads[0];
      if (pad) {
        if (Math.abs(pad.axes[0]) > 0.25) ax = pad.axes[0];
        if (Math.abs(pad.axes[1]) > 0.25) ay = pad.axes[1];
        if (pad.axes[0] < -0.35 || pad.buttons[14]?.pressed) left = true;
        if (pad.axes[0] > 0.35 || pad.buttons[15]?.pressed) right = true;
        if (pad.axes[1] < -0.35 || pad.buttons[12]?.pressed) up = true;
        if (pad.axes[1] > 0.35 || pad.buttons[13]?.pressed) down = true;
        if (pad.buttons[0]?.pressed || pad.buttons[1]?.pressed) a = true;
        if (pad.buttons[2]?.pressed || pad.buttons[5]?.pressed || pad.buttons[7]?.pressed) b = true;
      }

      const len = Math.hypot(ax, ay);
      if (len > 1) { ax /= len; ay /= len; }

      return {
        ax, ay,
        left, right, up, down,
        a, b,
        // 语义别名（平台跳跃兼容）
        jump: !!(a || k.ArrowUp || k.KeyW),
        dash: b,
      };
    }
  }

  Studio.Input = new InputManager();
  Studio.InputProfiles = PROFILES;
})(typeof window !== 'undefined' ? window : globalThis);
