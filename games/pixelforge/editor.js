/* PixelForge — 3D 关卡编辑器（支持桌面键鼠 + 移动端多点触控双指缩放/平移/防误触撤销、画笔/矩形框选/抓手模式） */
(function (G) {
  'use strict';
  const PF = G.PF;

  const CATS = [
    { id: 'terrain', label: '地形方块' },
    { id: 'gizmo',   label: '高级机关' },
    { id: 'entity',  label: '实体与工具' },
  ];

  class Editor {
    constructor(app) {
      this.app = app;
      this.tool = '#';
      this.paintMode = 'brush'; // 'brush' | 'rect' | 'hand'
      this.undoStack = [];
      this.redoStack = [];
      this.stroke = null; // Map idx -> [before, after]
      this.last = null;
      this.rectDrag = null; // { x0, y0, x1, y1, ch }
      this.hover = null;
      this.pan = null;
      this.pinch = null;
      this.pinchCooldown = false;
      this.pointers = new Map(); // pointerId -> { x, y }
      this.space = false;
    }

    get level() { return this.app.level; }

    buildPalette(el) {
      el.innerHTML = '';
      this.buttons = {};
      const entries = [
        ...Object.entries(PF.TILES).map(([ch, d]) => ({ ch, ...d })),
        { ch: '.', name: '橡皮擦', key: '0', cat: 'entity', desc: '右键也可擦除' },
      ];

      for (const cat of CATS) {
        const title = document.createElement('div');
        title.className = 'pal-cat';
        title.textContent = cat.label;
        el.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'pal-grid';
        for (const it of entries.filter((x) => x.cat === cat.id)) {
          const b = document.createElement('button');
          b.className = 'tool';
          b.title = `${it.name}${it.key ? `（${it.key}）` : ''} — ${it.desc}`;
          b.appendChild(PF.tileIcon(it.ch, 32));
          const n = document.createElement('span'); n.textContent = it.name; b.appendChild(n);
          if (it.key) {
            const k = document.createElement('kbd'); k.textContent = it.key; b.appendChild(k);
          }
          b.onclick = () => {
            this.setTool(it.ch);
            if (this.paintMode === 'hand') this.setPaintMode('brush');
          };
          grid.appendChild(b);
          this.buttons[it.ch] = b;
        }
        el.appendChild(grid);
      }

      const help = document.createElement('div');
      help.className = 'help';
      help.innerHTML =
        `<b>左键</b> 绘制 · <b>右键</b> 擦除<br>` +
        `<b>B</b> 画笔/框选 · <b>H</b> 抓手平移<br>` +
        `<b>空格/中键</b> 平移 · <b>Q/E</b> 转视角<br>` +
        `<b>滚轮</b> 缩放 · <b>F</b> 适配 · <b>Alt</b> 吸取<br>` +
        `<b>P</b> 试玩 · <b>Shift+P</b> 光标试玩`;
      el.appendChild(help);
      this.setTool(this.tool);
    }

    setTool(ch) {
      this.tool = ch;
      for (const [k, b] of Object.entries(this.buttons || {})) b.classList.toggle('active', k === ch);
      this.app.updateStatus();
    }

    setPaintMode(mode) {
      this.paintMode = (mode === 'rect' || mode === 'hand') ? mode : 'brush';
      this.rectDrag = null;
      if (this.app.canvas) this.app.canvas.style.cursor = this.paintMode === 'hand' ? 'grab' : '';
      this.app.syncToolButtons();
      this.app.updateStatus();
    }

    screenToTile(e) {
      return this.app.renderer.pickTile(e.clientX, e.clientY, this.app.cam) || { x: -1, y: -1 };
    }

    // ---- 修改与历史 ----
    setTile(x, y, ch) {
      const L = this.level;
      if (!PF.inBounds(L, x, y)) return;
      const i = y * L.w + x;
      const before = L.tiles[i];
      if (before === ch) return;
      if (ch !== '.' && PF.TILES[ch].unique) {
        for (let j = 0; j < L.tiles.length; j++) if (L.tiles[j] === ch && j !== i) this.record(j, ch, '.');
      }
      this.record(i, before, ch);
    }
    record(i, before, after) {
      this.level.tiles[i] = after;
      this.app.markDirty();
      if (!this.stroke) this.stroke = new Map();
      const prev = this.stroke.get(i);
      this.stroke.set(i, [prev ? prev[0] : before, after]);
    }
    // 移动端双指手势触发时，静默回滚刚落下的误触单指笔迹
    cancelStroke() {
      if (!this.stroke) return;
      for (const [i, [before]] of this.stroke) this.level.tiles[i] = before;
      this.stroke = null;
      this.last = null;
      this.rectDrag = null;
      this.app.markDirty();
    }
    commit() {
      if (this.stroke && [...this.stroke.values()].some(([a, b]) => a !== b)) {
        this.undoStack.push({ type: 'tiles', changes: this.stroke });
        if (this.undoStack.length > 300) this.undoStack.shift();
        this.redoStack = [];
        this.app.onLevelChanged();
      }
      this.stroke = null;
    }
    replaceLevel(next) {
      this.commit();
      this.undoStack.push({ type: 'level', before: PF.cloneLevel(this.level), after: PF.cloneLevel(next) });
      this.redoStack = [];
      this.app.level = next;
      this.app.onLevelChanged(true);
    }
    apply(entry, dir) {
      if (entry.type === 'level') {
        this.app.level = PF.cloneLevel(dir < 0 ? entry.before : entry.after);
        this.app.onLevelChanged(true);
        return;
      }
      for (const [i, [b, a]] of entry.changes) this.level.tiles[i] = dir < 0 ? b : a;
      this.app.markDirty();
      this.app.onLevelChanged();
    }
    undo() {
      this.commit();
      const e = this.undoStack.pop();
      if (!e) return this.app.toast('没有可撤销的操作');
      this.apply(e, -1);
      this.redoStack.push(e);
    }
    redo() {
      const e = this.redoStack.pop();
      if (!e) return this.app.toast('没有可重做的操作');
      this.apply(e, 1);
      this.undoStack.push(e);
    }

    paintLine(a, b, ch) {
      let x0 = a.x, y0 = a.y;
      const dx = Math.abs(b.x - x0), dy = -Math.abs(b.y - y0);
      const sx = x0 < b.x ? 1 : -1, sy = y0 < b.y ? 1 : -1;
      let err = dx + dy;
      for (;;) {
        this.setTile(x0, y0, ch);
        if (x0 === b.x && y0 === b.y) break;
        const e2 = 2 * err;
        if (e2 >= dy) { err += dy; x0 += sx; }
        if (e2 <= dx) { err += dx; y0 += sy; }
      }
    }

    paintRect(x0, y0, x1, y1, ch) {
      const minX = Math.max(0, Math.min(x0, x1));
      const maxX = Math.min(this.level.w - 1, Math.max(x0, x1));
      const minY = Math.max(0, Math.min(y0, y1));
      const maxY = Math.min(this.level.h - 1, Math.max(y0, y1));
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) this.setTile(x, y, ch);
      }
      this.commit();
    }

    startPinch() {
      const pts = [...this.pointers.values()];
      if (pts.length < 2) return;
      this.cancelStroke();
      this.pan = null;
      this.hover = null;
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const dist = Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y);
      const cam0 = { ...this.app.cam };
      this.pinch = {
        cam: cam0,
        dist0: Math.max(12, dist),
        worldMid: this.app.renderer.pickPoint(mid.x, mid.y, cam0),
      };
      this.pinchCooldown = true;
    }

    updatePinch() {
      if (!this.pinch) return;
      const pts = [...this.pointers.values()];
      if (pts.length < 2) return;
      const mid = { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
      const dist = Math.max(12, Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y));
      const cam = this.app.cam;
      cam.dist = Math.min(90, Math.max(6, this.pinch.cam.dist * (this.pinch.dist0 / dist)));
      if (this.pinch.worldMid) {
        // 先还原目标再对齐，保持双指中心点精准锁死在世界坐标上
        cam.tx = this.pinch.cam.tx;
        cam.ty = this.pinch.cam.ty;
        const after = this.app.renderer.pickPoint(mid.x, mid.y, cam);
        if (after) {
          cam.tx += this.pinch.worldMid.x - after.x;
          cam.ty += this.pinch.worldMid.y - after.y;
        }
      }
      this.app.updateStatus();
    }

    // ---- 输入 ----
    bind(canvas) {
      this.unbind();
      this._canvas = canvas;
      this._listeners = [];
      const on = (type, fn, opts) => {
        canvas.addEventListener(type, fn, opts);
        this._listeners.push([type, fn, opts]);
      };

      on('contextmenu', (e) => e.preventDefault());
      on('pointerdown', (e) => {
        if (this.app.mode !== 'edit') return;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });

        // 双指进入缩放 + 平移手势（自动撤销刚落下的单指误触）
        if (this.pointers.size >= 2) {
          this.startPinch();
          return;
        }
        if (this.pinchCooldown) return;

        if (e.button === 1 || this.space || (this.paintMode === 'hand' && e.button !== 2)) {
          const startCam = { ...this.app.cam };
          this.pan = {
            orbit: e.shiftKey,
            sx: e.clientX,
            sy: e.clientY,
            cam: startCam,
            p0: this.app.renderer.pickPoint(e.clientX, e.clientY, startCam),
          };
          canvas.style.cursor = 'grabbing';
          return;
        }
        const t = this.screenToTile(e);
        if (e.altKey) {
          const ch = PF.get(this.level, t.x, t.y);
          if (ch) { this.setTool(ch); this.app.toast(`吸取：${ch === '.' ? '橡皮擦' : PF.TILES[ch].name}`); }
          return;
        }
        const ch = e.button === 2 ? '.' : this.tool;
        this.paintCh = ch;
        const isUnique = ch !== '.' && PF.TILES[ch].unique;
        if (this.paintMode === 'rect' && !isUnique) {
          this.rectDrag = { x0: t.x, y0: t.y, x1: t.x, y1: t.y, ch };
          return;
        }
        this.last = t;
        this.setTile(t.x, t.y, ch);
      });

      on('pointermove', (e) => {
        if (this.app.mode !== 'edit') return;
        if (this.pointers.has(e.pointerId)) {
          this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        }
        if (this.pinch && this.pointers.size >= 2) {
          this.updatePinch();
          return;
        }
        if (this.pinchCooldown) return;
        if (this.pan) {
          const cam = this.app.cam;
          const sc = this.pan.cam;
          if (this.pan.orbit) {
            cam.yaw = Math.max(-0.75, Math.min(0.75, sc.yaw - (e.clientX - this.pan.sx) * 0.005));
            cam.pitch = Math.max(-0.45, Math.min(0.75, sc.pitch + (e.clientY - this.pan.sy) * 0.005));
          } else {
            const p1 = this.app.renderer.pickPoint(e.clientX, e.clientY, sc);
            if (this.pan.p0 && p1) {
              cam.tx = sc.tx - (p1.x - this.pan.p0.x);
              cam.ty = sc.ty - (p1.y - this.pan.p0.y);
            }
          }
          this.app.updateStatus();
          return;
        }
        const t = this.screenToTile(e);
        if (e.pointerType !== 'touch' || this.last || this.rectDrag) this.hover = t;
        this.app.updateStatus();
        if (this.rectDrag) {
          this.rectDrag.x1 = t.x;
          this.rectDrag.y1 = t.y;
          return;
        }
        if (this.last && (t.x !== this.last.x || t.y !== this.last.y)) {
          if (this.paintCh !== '.' && PF.TILES[this.paintCh].unique) this.setTile(t.x, t.y, this.paintCh);
          else this.paintLine(this.last, t, this.paintCh);
          this.last = t;
        }
      });

      const end = (e) => {
        if (e && e.pointerId !== undefined) this.pointers.delete(e.pointerId);
        if (this.pinch && this.pointers.size < 2) this.pinch = null;
        if (this.pointers.size === 0) this.pinchCooldown = false;
        if (this.pan) {
          this.pan = null;
          canvas.style.cursor = (this.space || this.paintMode === 'hand') ? 'grab' : '';
        }
        if (this.rectDrag) {
          const r = this.rectDrag;
          this.rectDrag = null;
          this.paintRect(r.x0, r.y0, r.x1, r.y1, r.ch);
        }
        if (this.last) { this.last = null; this.commit(); }
        if (e && e.pointerType === 'touch') this.hover = null;
      };
      on('pointerup', end);
      on('pointercancel', end);
      on('pointerleave', () => { this.hover = null; this.app.updateStatus(); });

      on('wheel', (e) => {
        e.preventDefault();
        if (this.app.mode !== 'edit') return;
        const r = this.app.renderer;
        const cam = this.app.cam;
        const panMode = !e.ctrlKey && (e.shiftKey || Math.abs(e.deltaX) > 0.5);
        if (!panMode) {
          const before = r.pickPoint(e.clientX, e.clientY, cam);
          const f = Math.exp(e.deltaY * (e.ctrlKey ? 0.01 : 0.0015));
          cam.dist = Math.min(90, Math.max(6, cam.dist * f));
          const after = r.pickPoint(e.clientX, e.clientY, cam);
          if (before && after) {
            cam.tx += before.x - after.x;
            cam.ty += before.y - after.y;
          }
        } else {
          const vis = r.visibleSize(cam);
          const dx = e.shiftKey ? (e.deltaY || e.deltaX) : e.deltaX;
          const dy = e.shiftKey ? 0 : e.deltaY;
          cam.tx += (dx / r.w) * vis.w;
          cam.ty -= (dy / r.h) * vis.h;
        }
        this.app.updateStatus();
      }, { passive: false });
    }

    unbind() {
      if (this._canvas && this._listeners) {
        for (const [type, fn, opts] of this._listeners) this._canvas.removeEventListener(type, fn, opts);
        this._canvas.style.cursor = '';
      }
      this._listeners = null;
      this._canvas = null;
      this.pointers.clear();
      this.pinch = null;
      this.pan = null;
      this.last = null;
      this.rectDrag = null;
    }

    keydown(e) {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? this.redo() : this.undo(); return true; }
      if (mod && e.key.toLowerCase() === 'y') { e.preventDefault(); this.redo(); return true; }
      if (mod) return false;
      if (e.code === 'Space') { e.preventDefault(); this.space = true; this.app.canvas.style.cursor = 'grab'; return true; }
      if (e.key === '0') { this.setTool('.'); return true; }
      for (const [ch, d] of Object.entries(PF.TILES)) if (d.key && d.key === e.key) { this.setTool(ch); return true; }
      const k = e.key.toLowerCase();
      if (k === 'b') { this.setPaintMode(this.paintMode === 'brush' ? 'rect' : 'brush'); this.app.toast(this.paintMode === 'rect' ? '切换为矩形框选填充' : '切换为自由画笔'); return true; }
      if (k === 'h') { this.setPaintMode(this.paintMode === 'hand' ? 'brush' : 'hand'); this.app.toast(this.paintMode === 'hand' ? '切换为抓手平移模式' : '切换为自由画笔'); return true; }
      if (k === 'f') { this.app.fitView(); return true; }
      if (k === 'q') { this.app.cam.yaw = Math.max(-0.75, this.app.cam.yaw - 0.12); this.app.updateStatus(); return true; }
      if (k === 'e') { this.app.cam.yaw = Math.min(0.75, this.app.cam.yaw + 0.12); this.app.updateStatus(); return true; }
      const step = Math.max(1.5, this.app.cam.dist * 0.1);
      const arrows = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] };
      if (arrows[e.key]) {
        e.preventDefault();
        this.app.cam.tx += arrows[e.key][0];
        this.app.cam.ty += arrows[e.key][1];
        this.app.updateStatus();
        return true;
      }
      return false;
    }
    keyup(e) {
      if (e.code === 'Space') { this.space = false; this.app.canvas.style.cursor = this.paintMode === 'hand' ? 'grab' : ''; }
    }
  }

  PF.Editor = Editor;
})(window);
