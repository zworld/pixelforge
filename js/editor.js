/* PixelForge — 3D 关卡编辑器（分组调色板、画笔/矩形框选填充、射线拾取、3D 镜头操控、完整撤销栈） */
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
      this.paintMode = 'brush'; // 'brush' | 'rect'
      this.undoStack = [];
      this.redoStack = [];
      this.stroke = null; // Map idx -> [before, after]
      this.last = null;
      this.rectDrag = null; // { x0, y0, x1, y1, ch }
      this.hover = null;
      this.pan = null;
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
          b.onclick = () => this.setTool(it.ch);
          grid.appendChild(b);
          this.buttons[it.ch] = b;
        }
        el.appendChild(grid);
      }

      const help = document.createElement('div');
      help.className = 'help';
      help.innerHTML =
        `<b>左键</b> 绘制 · <b>右键</b> 擦除<br>` +
        `<b>B</b> 画笔/矩形框选 · <b>Alt</b> 吸取<br>` +
        `<b>空格/中键</b> 平移 · <b>Q/E</b> 转视角<br>` +
        `<b>滚轮</b> 缩放 · <b>F</b> 适配视图<br>` +
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
      this.paintMode = mode === 'rect' ? 'rect' : 'brush';
      this.rectDrag = null;
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
      if (ch !== '.' && PF.TILES[ch].unique) { // 起点/终点唯一
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
    commit() {
      if (this.stroke && [...this.stroke.values()].some(([a, b]) => a !== b)) {
        this.undoStack.push({ type: 'tiles', changes: this.stroke });
        if (this.undoStack.length > 300) this.undoStack.shift();
        this.redoStack = [];
        this.app.onLevelChanged();
      }
      this.stroke = null;
    }
    // 整体替换（清空、改尺寸、导入、切预设、切主题）也可撤销
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

    paintLine(a, b, ch) { // Bresenham，避免快速拖动时断线
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
        for (let x = minX; x <= maxX; x++) {
          this.setTile(x, y, ch);
        }
      }
      this.commit();
    }

    // ---- 输入 ----
    bind(canvas) {
      canvas.addEventListener('contextmenu', (e) => e.preventDefault());
      canvas.addEventListener('pointerdown', (e) => {
        if (this.app.mode !== 'edit') return;
        canvas.setPointerCapture(e.pointerId);
        if (e.button === 1 || this.space) {
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
        if (e.altKey) { // 吸取
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
      canvas.addEventListener('pointermove', (e) => {
        if (this.app.mode !== 'edit') return;
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
        this.hover = t;
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
      const end = () => {
        if (this.pan) { this.pan = null; canvas.style.cursor = this.space ? 'grab' : ''; }
        if (this.rectDrag) {
          const r = this.rectDrag;
          this.rectDrag = null;
          this.paintRect(r.x0, r.y0, r.x1, r.y1, r.ch);
        }
        if (this.last) { this.last = null; this.commit(); }
      };
      canvas.addEventListener('pointerup', end);
      canvas.addEventListener('pointercancel', end);
      canvas.addEventListener('pointerleave', () => { this.hover = null; this.app.updateStatus(); });
      canvas.addEventListener('wheel', (e) => {
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
      if (e.code === 'Space') { this.space = false; this.app.canvas.style.cursor = ''; }
    }
  }

  PF.Editor = Editor;
})(window);
