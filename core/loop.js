/* Studio Core — 确定性 1/60s 固定步长主循环 + Hitstop 微顿帧控制器 */
(function (G) {
  'use strict';
  const Studio = (G.Studio = G.Studio || {});

  class FixedLoop {
    constructor({ dt = 1 / 60, onTick, onFrame }) {
      this.dt = dt;
      this.onTick = onTick;
      this.onFrame = onFrame;
      this.running = false;
      this.rafId = 0;
      this.lastTime = 0;
      this.acc = 0;
      this.hitstop = 0;
      this.elapsed = 0;
      this.paused = false;
    }

    freeze(sec) {
      this.hitstop = Math.max(this.hitstop, sec);
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastTime = performance.now();
      this.acc = 0;
      const step = (now) => {
        if (!this.running) return;
        const frameDt = Math.min(0.1, Math.max(0, (now - this.lastTime) / 1000));
        this.lastTime = now;
        this.elapsed += frameDt;
        if (!this.paused) {
          if (this.hitstop > 0) {
            this.hitstop = Math.max(0, this.hitstop - frameDt);
          } else if (this.onTick) {
            this.acc += frameDt;
            while (this.acc >= this.dt) {
              this.onTick(this.dt);
              this.acc -= this.dt;
              if (this.hitstop > 0) { this.acc = 0; break; }
            }
          }
        } else {
          this.acc = 0;
        }
        if (this.onFrame) this.onFrame(frameDt, this.elapsed);
        this.rafId = requestAnimationFrame(step);
      };
      this.rafId = requestAnimationFrame(step);
    }

    stop() {
      this.running = false;
      if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = 0; }
      this.acc = 0;
      this.hitstop = 0;
    }
  }

  Studio.FixedLoop = FixedLoop;
})(typeof window !== 'undefined' ? window : globalThis);
