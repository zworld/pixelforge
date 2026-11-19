/* PixelForge — 3D 渲染器（Three.js）。世界单位：1 = 1 格；格子 (tx,ty) 占据 X∈[tx,tx+1]，Y∈[-(ty+1),-ty] */
(function (G) {
  'use strict';
  const PF = G.PF;
  const THREE = G.THREE;
  const T = PF.TILE;

  // ---------- 程序化像素纹理 ----------
  function makeTex(draw) {
    const c = document.createElement('canvas');
    c.width = c.height = 16;
    const x = c.getContext('2d');
    draw(x);
    const t = new THREE.CanvasTexture(c);
    t.magFilter = THREE.NearestFilter;
    t.minFilter = THREE.NearestFilter;
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }
  function speckle(x, base, dots, seed = 7) {
    x.fillStyle = base; x.fillRect(0, 0, 16, 16);
    for (const [c, n] of dots) {
      x.fillStyle = c;
      for (let i = 0; i < n; i++) {
        seed = (seed * 16807) % 2147483647; const a = seed % 16;
        seed = (seed * 16807) % 2147483647; const b = seed % 16;
        x.fillRect(a, b, 1 + (seed % 2), 1);
      }
    }
  }
  const TEX = {};
  function buildTextures() {
    TEX.dirt = makeTex((x) => speckle(x, '#8b5a2b', [['#6e4520', 16], ['#a0703c', 12]]));
    TEX.grassTop = makeTex((x) => speckle(x, '#4caf50', [['#7bd36b', 16], ['#3b8f40', 12]], 11));
    TEX.grassSide = makeTex((x) => {
      speckle(x, '#8b5a2b', [['#6e4520', 16], ['#a0703c', 12]]);
      x.fillStyle = '#4caf50'; x.fillRect(0, 0, 16, 4);
      x.fillStyle = '#4caf50'; [1, 4, 6, 9, 12, 14].forEach((i, k) => x.fillRect(i, 4, 1, 1 + (k % 3)));
      x.fillStyle = '#7bd36b'; x.fillRect(0, 0, 16, 1);
    });
    TEX.brick = makeTex((x) => {
      x.fillStyle = '#c8642c'; x.fillRect(0, 0, 16, 16);
      x.fillStyle = '#e8915a'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 8, 16, 1);
      x.fillStyle = '#7a3412';
      x.fillRect(0, 7, 16, 1); x.fillRect(0, 15, 16, 1);
      x.fillRect(7, 0, 1, 7); x.fillRect(3, 8, 1, 7); x.fillRect(11, 8, 1, 7);
    });
    TEX.wood = makeTex((x) => {
      x.fillStyle = '#c79257'; x.fillRect(0, 0, 16, 16);
      x.fillStyle = '#a8763f'; for (let i = 0; i < 16; i += 4) x.fillRect(0, i + 3, 16, 1);
      x.fillStyle = '#e6b67c'; x.fillRect(0, 0, 16, 1);
      x.fillStyle = '#7a5230'; x.fillRect(5, 0, 1, 16); x.fillRect(11, 0, 1, 16);
    });
  }

  const lambert = (opts) => new THREE.MeshLambertMaterial(opts);
  const std = (opts) => new THREE.MeshStandardMaterial(opts);

  // ---------- 角色模型 ----------
  function box(w, h, d, mat, x = 0, y = 0, z = 0) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  }
  const MAT = {};
  function buildMaterials() {
    MAT.grass = [lambert({ map: TEX.grassSide }), lambert({ map: TEX.grassSide }), lambert({ map: TEX.grassTop }), lambert({ map: TEX.dirt }), lambert({ map: TEX.grassSide }), lambert({ map: TEX.grassSide })];
    MAT.dirt = lambert({ map: TEX.dirt });
    MAT.brick = lambert({ map: TEX.brick });
    MAT.wood = lambert({ map: TEX.wood });
    MAT.spike = std({ color: '#d7dee8', metalness: 0.7, roughness: 0.3 });
    MAT.spikeBase = std({ color: '#5b6573', metalness: 0.5, roughness: 0.5 });
    MAT.coin = std({ color: '#ffcc33', metalness: 0.8, roughness: 0.25, emissive: '#6b4a00', emissiveIntensity: 0.35 });
    MAT.springBase = std({ color: '#4b5563', metalness: 0.6, roughness: 0.4 });
    MAT.springPad = std({ color: '#e53935', roughness: 0.5 });
    MAT.coil = std({ color: '#cbd5e1', metalness: 0.9, roughness: 0.2 });
    MAT.white = lambert({ color: '#ffffff' });
    MAT.black = lambert({ color: '#111111' });
    MAT.player = lambert({ color: '#2f80ed' });
    MAT.playerDark = lambert({ color: '#1f5fb8' });
    MAT.band = lambert({ color: '#ef4444' });
    MAT.enemy = lambert({ color: '#7e57c2' });
    MAT.enemyDark = lambert({ color: '#3b2470' });
    MAT.pole = std({ color: '#e5e7eb', metalness: 0.6, roughness: 0.3 });
    MAT.gold = std({ color: '#facc15', metalness: 0.8, roughness: 0.2 });
    MAT.flag = lambert({ color: '#22c55e', side: THREE.DoubleSide });
  }
  function playerModel(ghost) {
    const g = new THREE.Group();
    const body = new THREE.Group();
    body.add(box(0.75, 0.875, 0.62, MAT.player, 0, 0.4375, 0));
    body.add(box(0.77, 0.12, 0.64, MAT.band, 0, 0.66, 0));
    body.add(box(0.77, 0.16, 0.64, MAT.playerDark, 0, 0.08, 0));
    for (const ex of [-0.14, 0.14]) {
      body.add(box(0.13, 0.19, 0.02, MAT.white, ex, 0.48, 0.32));
      body.add(box(0.07, 0.12, 0.02, MAT.black, ex + 0.02, 0.46, 0.335));
    }
    g.add(body);
    g.userData.body = body;
    if (ghost) g.traverse((o) => { if (o.material) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.55; } });
    return g;
  }
  function enemyModel() {
    const g = new THREE.Group();
    g.add(box(0.8, 0.62, 0.7, MAT.enemy, 0, 0.44, 0));
    g.add(box(0.62, 0.08, 0.6, MAT.enemy, 0, 0.78, 0));
    const feet = [box(0.24, 0.14, 0.5, MAT.enemyDark, -0.22, 0.07, 0), box(0.24, 0.14, 0.5, MAT.enemyDark, 0.22, 0.07, 0)];
    feet.forEach((f) => g.add(f));
    for (const ex of [-0.17, 0.17]) {
      g.add(box(0.18, 0.18, 0.02, MAT.white, ex, 0.5, 0.36));
      g.add(box(0.08, 0.12, 0.02, MAT.black, ex - 0.03, 0.48, 0.375));
      g.add(box(0.2, 0.05, 0.02, MAT.enemyDark, ex, 0.63, 0.36));
    }
    g.userData.feet = feet;
    return g;
  }
  function goalModel() {
    const g = new THREE.Group();
    const base = box(0.5, 0.2, 0.5, MAT.springBase, 0.5, 0.1, 0);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 8), MAT.pole);
    pole.position.set(0.5, 1.5, 0); pole.castShadow = true;
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), MAT.gold);
    ball.position.set(0.5, 2.85, 0); ball.castShadow = true;
    const flagGeo = new THREE.PlaneGeometry(1, 0.6, 8, 1);
    flagGeo.translate(0.5, 0, 0);
    const flag = new THREE.Mesh(flagGeo, MAT.flag);
    flag.position.set(0.55, 2.45, 0); flag.castShadow = true;
    g.add(base, pole, ball, flag);
    g.userData.flag = flag;
    g.userData.flagBase = flagGeo.attributes.position.array.slice();
    return g;
  }

  // ---------- 实例化方块层 ----------
  const KINDS = ['grass', 'dirt', 'B', '-', 'spike', 'spikeBase', 'o', 'Sbase', 'Spad', 'coil'];
  function kindGeometry(k) {
    switch (k) {
      case '-': { const g = new THREE.BoxGeometry(1, 0.28, 1); g.translate(0, 0.36, 0); return g; }
      case 'spike': { const g = new THREE.ConeGeometry(0.2, 0.55, 8); g.translate(0, -0.5 + 0.12 + 0.275, 0); return g; }
      case 'spikeBase': { const g = new THREE.BoxGeometry(1, 0.12, 0.9); g.translate(0, -0.44, 0); return g; }
      case 'o': { const g = new THREE.CylinderGeometry(0.3, 0.3, 0.08, 20); g.rotateX(Math.PI / 2); return g; }
      case 'Sbase': { const g = new THREE.BoxGeometry(0.9, 0.18, 0.8); g.translate(0, -0.41, 0); return g; }
      case 'coil': { const g = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 10, 1, true); g.translate(0, -0.17, 0); return g; }
      case 'Spad': { const g = new THREE.BoxGeometry(0.9, 0.16, 0.8); g.translate(0, 0.04, 0); return g; }
      default: return new THREE.BoxGeometry(1, 1, 1);
    }
  }
  function kindMaterial(k) {
    return { grass: MAT.grass, dirt: MAT.dirt, B: MAT.brick, '-': MAT.wood, spike: MAT.spike, spikeBase: MAT.spikeBase, o: MAT.coin, Sbase: MAT.springBase, Spad: MAT.springPad, coil: MAT.coil }[k];
  }

  const TOOL_COLOR = { '#': '#4caf50', B: '#c8642c', '-': '#c79257', '^': '#d7dee8', o: '#ffcc33', S: '#e53935', E: '#7e57c2', P: '#2f80ed', G: '#22c55e', '.': '#ef4444' };

  class Renderer3D {
    constructor(container) {
      buildTextures();
      buildMaterials();
      this.container = container;
      this.gl = new THREE.WebGLRenderer({ antialias: true });
      this.gl.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
      this.gl.shadowMap.enabled = true;
      this.gl.shadowMap.type = THREE.PCFSoftShadowMap;
      this.gl.domElement.id = 'view';
      this.gl.domElement.tabIndex = 0;
      container.prepend(this.gl.domElement);
      this.canvas = this.gl.domElement;

      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color('#8fd8f7');
      this.scene.fog = new THREE.Fog('#bfeaff', 40, 140);
      this.camera = new THREE.PerspectiveCamera(42, 1, 0.1, 400);

      this.scene.add(new THREE.HemisphereLight('#e8f7ff', '#5f7d4a', 1.6));
      this.sun = new THREE.DirectionalLight('#fff4dd', 2.2);
      this.sun.castShadow = true;
      this.sun.shadow.mapSize.set(2048, 2048);
      const sc = this.sun.shadow.camera;
      sc.left = -34; sc.right = 34; sc.top = 24; sc.bottom = -24; sc.near = 1; sc.far = 90;
      this.sun.shadow.bias = -0.0005;
      this.scene.add(this.sun, this.sun.target);

      this.world = new THREE.Group();
      this.scene.add(this.world);
      this.meshes = {};
      this.instIndex = {}; // kind -> Map(tileIdx -> instanceId)

      this.decor = new THREE.Group();
      this.scene.add(this.decor);
      this.editorGroup = new THREE.Group();
      this.scene.add(this.editorGroup);

      this.goal = goalModel();
      this.world.add(this.goal);
      this.startGhost = playerModel(true);
      this.world.add(this.startGhost);
      this.editEnemies = [];
      this.enemyPool = [];

      this.player = playerModel(false);
      this.scene.add(this.player);

      // 悬停预览
      this.hoverMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.3, depthWrite: false });
      this.hoverBox = new THREE.Mesh(new THREE.BoxGeometry(1.02, 1.02, 1.02), this.hoverMat);
      this.hoverEdges = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1.04, 1.04, 1.04)), new THREE.LineBasicMaterial({ color: '#ffffff' }));
      this.hoverBox.add(this.hoverEdges);
      this.scene.add(this.hoverBox);

      // 粒子
      this.maxParticles = 600;
      this.particleMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.12, 0.12, 0.12), new THREE.MeshBasicMaterial(), this.maxParticles);
      this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      this.particleMesh.setColorAt(0, new THREE.Color());
      this.particleMesh.frustumCulled = false;
      this.scene.add(this.particleMesh);

      this.raycaster = new THREE.Raycaster();
      this.plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0); // 关卡中心平面 z=0
      this.dirty = true;
      this.lastMode = null;
      this._m = new THREE.Matrix4();
      this._q = new THREE.Quaternion();
      this._v = new THREE.Vector3();
      this._s = new THREE.Vector3(1, 1, 1);
      this._c = new THREE.Color();
      this.resize();
    }

    markDirty() {
      this.dirty = true;
    }

    resize() {
      const r = this.container.getBoundingClientRect();
      this.w = Math.max(1, r.width);
      this.h = Math.max(1, r.height);
      this.gl.setSize(this.w, this.h);
      this.camera.aspect = this.w / this.h;
      this.camera.updateProjectionMatrix();
    }

    // 关卡结构变化（尺寸）时：网格线、边框、背景装饰
    setLevel(level) {
      this.level = level;
      this.levelW = level.w;
      this.levelH = level.h;
      this.editorGroup.clear();
      const pts = [];
      const z = -0.5;
      for (let x = 0; x <= level.w; x++) pts.push(x, 0, z, x, -level.h, z);
      for (let y = 0; y <= level.h; y++) pts.push(0, -y, z, level.w, -y, z);
      const gg = new THREE.BufferGeometry();
      gg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      this.grid = new THREE.LineSegments(gg, new THREE.LineBasicMaterial({ color: '#1e3a5f', transparent: true, opacity: 0.18 }));
      this.editorGroup.add(this.grid);
      const back = new THREE.Mesh(new THREE.PlaneGeometry(level.w, level.h), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.12, depthWrite: false }));
      back.position.set(level.w / 2, -level.h / 2, -0.51);
      this.editorGroup.add(back);
      const frame = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.BoxGeometry(level.w, level.h, 1)),
        new THREE.LineBasicMaterial({ color: '#0b2545', transparent: true, opacity: 0.6 }));
      frame.position.set(level.w / 2, -level.h / 2, 0);
      this.editorGroup.add(frame);

      // 背景：远山、云、地底
      this.decor.clear();
      const hillMat = [lambert({ color: '#7cc497' }), lambert({ color: '#9fd8b4' })];
      let seed = 3;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let x = -30; x < level.w + 30; x += 6 + rnd() * 8) {
        const far = rnd() < 0.5 ? 1 : 0;
        const h = 6 + rnd() * 12;
        const m = new THREE.Mesh(new THREE.ConeGeometry(4 + rnd() * 6, h, 5 + ((rnd() * 3) | 0)), hillMat[far]);
        m.position.set(x, -level.h + h / 2 - 1, -18 - far * 20 - rnd() * 6);
        m.rotation.y = rnd() * Math.PI;
        this.decor.add(m);
      }
      const cloudMat = lambert({ color: '#ffffff', emissive: '#ffffff', emissiveIntensity: 0.4 });
      this.clouds = [];
      for (let x = -20; x < level.w + 40; x += 10 + rnd() * 14) {
        const c = new THREE.Group();
        const n = 2 + ((rnd() * 3) | 0);
        for (let i = 0; i < n; i++) c.add(new THREE.Mesh(new THREE.BoxGeometry(2 + rnd() * 3, 0.8 + rnd(), 1.5 + rnd() * 2), cloudMat).translateX(i * 1.6 - n * 0.8).translateY(rnd() * 0.6));
        c.position.set(x, 3 + rnd() * 6, -12 - rnd() * 25);
        c.userData.speed = 0.2 + rnd() * 0.4;
        this.decor.add(c);
        this.clouds.push(c);
      }
      const ground = new THREE.Mesh(new THREE.PlaneGeometry(level.w + 400, 200), lambert({ color: '#6aa86f' }));
      ground.rotation.x = -Math.PI / 2;
      ground.position.set(level.w / 2, -level.h - 2, -60);
      ground.receiveShadow = true;
      this.decor.add(ground);
      this.dirty = true;
    }

    ensureMesh(kind, n) {
      let m = this.meshes[kind];
      if (m && m.userData.cap >= n) return m;
      if (m) { this.world.remove(m); m.dispose(); }
      const cap = Math.max(16, 1 << Math.ceil(Math.log2(Math.max(1, n))));
      m = new THREE.InstancedMesh(kindGeometry(kind), kindMaterial(kind), cap);
      m.userData.cap = cap;
      m.castShadow = kind !== 'o';
      m.receiveShadow = true;
      m.frustumCulled = false;
      this.world.add(m);
      this.meshes[kind] = m;
      return m;
    }

    // 根据当前格子重建实例
    syncTiles(level, getTile, editor) {
      const lists = {};
      KINDS.forEach((k) => (lists[k] = []));
      const enemies = [];
      let start = null, goal = null;
      for (let ty = 0; ty < level.h; ty++) {
        for (let tx = 0; tx < level.w; tx++) {
          const ch = getTile(tx, ty);
          if (ch === '.') continue;
          const i = ty * level.w + tx;
          switch (ch) {
            case '#': {
              const above = ty > 0 ? getTile(tx, ty - 1) : '.';
              lists[above === '#' ? 'dirt' : 'grass'].push(i);
              break;
            }
            case 'B': lists.B.push(i); break;
            case '-': lists['-'].push(i); break;
            case '^': lists.spike.push(i); lists.spikeBase.push(i); break;
            case 'o': lists.o.push(i); break;
            case 'S': lists.Sbase.push(i); lists.Spad.push(i); lists.coil.push(i); break;
            case 'E': enemies.push(i); break;
            case 'P': start = i; break;
            case 'G': goal = i; break;
          }
        }
      }
      const m4 = this._m, q = this._q.identity(), v = this._v, s = this._s.set(1, 1, 1);
      for (const k of KINDS) {
        const list = lists[k];
        const perTile = k === 'spike' ? 4 : 1;
        const mesh = this.ensureMesh(k, list.length * perTile);
        const idx = new Map();
        let n = 0;
        for (const i of list) {
          const cx = (i % level.w) + 0.5, cy = -(((i / level.w) | 0) + 0.5);
          if (k === 'spike') {
            for (const [ox, oz] of [[-0.22, -0.2], [0.22, -0.2], [-0.22, 0.2], [0.22, 0.2]]) {
              v.set(cx + ox, cy, oz); m4.compose(v, q, s); mesh.setMatrixAt(n++, m4);
            }
          } else {
            idx.set(i, n);
            v.set(cx, cy, 0); m4.compose(v, q, s); mesh.setMatrixAt(n++, m4);
          }
        }
        mesh.count = n;
        mesh.instanceMatrix.needsUpdate = true;
        this.instIndex[k] = idx;
      }
      this.coinList = lists.o;
      const at = (i) => ({ x: i % level.w, y: (i / level.w) | 0 });
      this.goal.visible = goal !== null;
      if (goal !== null) { const p = at(goal); this.goal.position.set(p.x, -(p.y + 1), 0); }
      this.startGhost.visible = editor && start !== null;
      if (start !== null) { const p = at(start); this.startGhost.position.set(p.x + 0.5, -(p.y + 1), 0); this.startGhost.rotation.y = 0.45; }
      // 编辑模式下的敌人摆件
      while (this.editEnemies.length < enemies.length) { const e = enemyModel(); this.world.add(e); this.editEnemies.push(e); }
      this.editEnemies.forEach((e, k) => {
        e.visible = editor && k < enemies.length;
        if (e.visible) { const p = at(enemies[k]); e.position.set(p.x + 0.5, -(p.y + 1), 0); e.rotation.y = -0.3; }
      });
      this.dirty = false;
    }

    applyCamera(cam) {
      const cp = Math.cos(cam.pitch);
      this.camera.position.set(cam.tx + cam.dist * Math.sin(cam.yaw) * cp, cam.ty + cam.dist * Math.sin(cam.pitch), cam.dist * Math.cos(cam.yaw) * cp);
      this.camera.lookAt(cam.tx, cam.ty, 0);
      this.camera.updateMatrixWorld();
      this.sun.position.set(cam.tx + 12, cam.ty + 22, 18);
      this.sun.target.position.set(cam.tx, cam.ty, 0);
    }
    // 在目标距离处可见的世界尺寸
    visibleSize(cam) {
      const h = 2 * cam.dist * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2));
      return { w: h * this.camera.aspect, h };
    }
    pickPoint(clientX, clientY, cam) {
      const r = this.canvas.getBoundingClientRect();
      const ndc = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
      this.applyCamera(cam);
      this.raycaster.setFromCamera(ndc, this.camera);
      const p = new THREE.Vector3();
      return this.raycaster.ray.intersectPlane(this.plane, p) ? p : null;
    }
    pickTile(clientX, clientY, cam) {
      const p = this.pickPoint(clientX, clientY, cam);
      return p ? { x: Math.floor(p.x), y: Math.floor(-p.y) } : null;
    }

    render(st) {
      const { level, t, cam, mode } = st;
      const editor = mode === 'edit';
      if (this.level !== level || this.levelW !== level.w || this.levelH !== level.h) this.setLevel(level);
      if (this.dirty || this.lastMode !== mode) {
        this.lastMode = mode;
        this.syncTiles(level, st.getTile, editor);
      }
      this.applyCamera(cam);
      this.editorGroup.visible = editor;

      // 金币旋转
      const coin = this.meshes.o;
      if (coin && this.coinList) {
        const m4 = this._m, v = this._v, s = this._s.set(1, 1, 1);
        this.coinList.forEach((i, n) => {
          const tx = i % level.w, ty = (i / level.w) | 0;
          this._q.setFromAxisAngle(this._v.set(0, 1, 0), t * 2.5 + tx * 0.6);
          v.set(tx + 0.5, -(ty + 0.5) + Math.sin(t * 3 + tx) * 0.06, 0);
          m4.compose(v, this._q, s);
          coin.setMatrixAt(n, m4);
        });
        coin.instanceMatrix.needsUpdate = true;
        this._q.identity();
      }
      // 旗帜飘动
      const fa = this.goal.userData.flag.geometry.attributes.position;
      const base = this.goal.userData.flagBase;
      for (let k = 0; k < fa.count; k++) {
        const x = base[k * 3];
        fa.array[k * 3 + 2] = Math.sin(t * 5 - x * 4) * 0.12 * x;
      }
      fa.needsUpdate = true;
      for (const c of this.clouds || []) c.position.x += c.userData.speed * 0.016;

      // 悬停预览
      const hv = st.hover;
      this.hoverBox.visible = editor && !!hv && PF.inBounds(level, hv.x, hv.y);
      if (this.hoverBox.visible) {
        this.hoverBox.position.set(hv.x + 0.5, -(hv.y + 0.5), 0);
        const col = TOOL_COLOR[st.tool] || '#fff';
        this.hoverMat.color.set(col);
        this.hoverMat.opacity = 0.22 + 0.12 * Math.sin(t * 6);
        this.hoverEdges.material.color.set(st.tool === '.' ? '#ef4444' : '#ffffff');
      }

      // 玩家与敌人
      const g = st.game;
      this.player.visible = !editor && g && !g.dead;
      if (this.player.visible) {
        this.player.position.set((g.px + 6) / T, -(g.py + 14) / T, 0);
        const yaw = g.facing > 0 ? 0.55 : -0.55;
        this.player.rotation.y += (yaw - this.player.rotation.y) * 0.25;
        let sx = 1, sy = 1;
        if (!g.onGround) { if (g.vy < -120) { sx = 0.85; sy = 1.15; } else if (g.vy > 200) { sx = 0.92; sy = 1.08; } }
        else if (Math.abs(g.vx) > 20) { sy = 1 + Math.sin(t * 22) * 0.04; }
        this.player.userData.body.scale.set(sx, sy, sx);
      }
      const live = !editor && g ? g.enemies.filter((e) => e.alive) : [];
      while (this.enemyPool.length < live.length) { const e = enemyModel(); this.scene.add(e); this.enemyPool.push(e); }
      this.enemyPool.forEach((m, k) => {
        m.visible = k < live.length;
        if (!m.visible) return;
        const e = live[k];
        m.position.set((e.x + 7) / T, -(e.y + 14) / T, 0);
        m.rotation.y = e.vx > 0 ? 0.6 : -0.6;
        const f = m.userData.feet, w = Math.sin(t * 12) * 0.06;
        f[0].position.y = 0.07 + Math.max(0, w); f[1].position.y = 0.07 + Math.max(0, -w);
      });

      // 粒子（世界单位，引擎像素换算）
      const ps = st.particles || [];
      const pm = this.particleMesh;
      const n = Math.min(ps.length, this.maxParticles);
      for (let k = 0; k < n; k++) {
        const p = ps[k];
        const sc = Math.max(0.1, p.life / p.max);
        this._s.set(sc, sc, sc);
        this._v.set(p.x / T, -p.y / T, p.z || 0);
        this._q.setFromAxisAngle(this._v2 || (this._v2 = new THREE.Vector3(0.3, 1, 0.2).normalize()), p.life * 8);
        this._m.compose(this._v, this._q, this._s);
        pm.setMatrixAt(k, this._m);
        pm.setColorAt(k, this._c.set(p.color));
      }
      pm.count = n;
      pm.instanceMatrix.needsUpdate = true;
      if (pm.instanceColor) pm.instanceColor.needsUpdate = true;
      this._q.identity(); this._s.set(1, 1, 1);

      this.gl.render(this.scene, this.camera);
    }
  }

  PF.Renderer3D = Renderer3D;
})(window);
