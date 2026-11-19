/* Game 2: Neon Survivor 3D — Three.js 3D 霓虹竞技场渲染器（共享 Studio.Gfx3D 单一上下文，InstancedMesh 百怪 60fps） */
(function (G) {
  'use strict';
  const NS = G.NS;
  const THREE = G.THREE;
  const ARENA = NS.ARENA;

  class SurvivorRenderer3D {
    constructor(container, gfx) {
      this.container = container;
      this.gfx = gfx;
      this.gl = gfx.gl;
      this.canvas = gfx.canvas;
      this.gl.toneMappingExposure = 1.12;

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.Fog('#12092e', 34, 92);

      this.skyDome = G.Studio.createSkyDome(THREE);
      const su = this.skyDome.material.uniforms;
      su.uTop.value.set('#050317');
      su.uHorizon.value.set('#271052');
      su.uBottom.value.set('#0a223b');
      su.uSunColor.value.set('#f472b6');
      su.uSunDir.value.set(0.0, 0.25, -0.95).normalize();
      this.scene.add(this.skyDome);

      this.camera = new THREE.PerspectiveCamera(46, 1, 0.1, 350);
      this.camPos = new THREE.Vector3(0, 22, 16);
      this.camLook = new THREE.Vector3(0, 0, 0);

      // 赛博双色光影
      this.scene.add(new THREE.HemisphereLight('#67e8f9', '#3b0764', 1.35));
      const key = new THREE.DirectionalLight('#e0f2fe', 1.9);
      key.position.set(14, 28, 12);
      key.castShadow = true;
      key.shadow.mapSize.set(1024, 1024);
      const sc = key.shadow.camera;
      sc.left = -28; sc.right = 28; sc.top = 28; sc.bottom = -28;
      this.scene.add(key);

      this.heroLight = new THREE.PointLight('#38bdf8', 3.4, 14, 1.4);
      this.scene.add(this.heroLight);

      // 竞技场地面 + 霓虹网格 + 边界光墙 + 场外巨柱
      const floor = new THREE.Mesh(
        new THREE.PlaneGeometry(ARENA * 2 + 2, ARENA * 2 + 2),
        new THREE.MeshStandardMaterial({ color: '#0c1224', roughness: 0.45, metalness: 0.35 })
      );
      floor.rotation.x = -Math.PI / 2;
      floor.receiveShadow = true;
      this.scene.add(floor);

      const grid = new THREE.GridHelper(ARENA * 2, 26, '#22d3ee', '#3b1c6e');
      grid.position.y = 0.02;
      this.scene.add(grid);

      // 激光边界框
      const wallMat = new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.65 });
      const borderLen = ARENA * 2;
      [
        [0, 0.2, -ARENA, borderLen, 0.35, 0.16],
        [0, 0.2,  ARENA, borderLen, 0.35, 0.16],
        [-ARENA, 0.2, 0, 0.16, 0.35, borderLen],
        [ ARENA, 0.2, 0, 0.16, 0.35, borderLen],
      ].forEach(([x, y, z, w, h, d]) => {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
        m.position.set(x, y, z);
        this.scene.add(m);
      });

      // 场外霓虹高塔装饰
      const pillarMat = new THREE.MeshLambertMaterial({ color: '#17153b' });
      const stripCyan = new THREE.MeshBasicMaterial({ color: '#22d3ee' });
      const stripPink = new THREE.MeshBasicMaterial({ color: '#f472b6' });
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const dist = ARENA + 9 + (i % 3) * 4;
        const h = 8 + (i % 4) * 4.5;
        const px = Math.cos(a) * dist, pz = Math.sin(a) * dist;
        const p = new THREE.Mesh(new THREE.BoxGeometry(2.6, h, 2.6), pillarMat);
        p.position.set(px, h / 2 - 2, pz);
        this.scene.add(p);
        const cap = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.28, 2.75), i % 2 ? stripCyan : stripPink);
        cap.position.set(px, h - 2.3, pz);
        this.scene.add(cap);
      }

      // 主角 3D 霓虹机甲核心
      this.hero = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.62, 0),
        new THREE.MeshStandardMaterial({ color: '#38bdf8', emissive: '#0284c7', emissiveIntensity: 0.75, roughness: 0.2, metalness: 0.4 })
      );
      body.scale.set(0.95, 0.72, 1.3);
      body.position.y = 0.72;
      body.castShadow = true;
      const core = new THREE.Mesh(
        new THREE.BoxGeometry(0.45, 0.3, 0.9),
        new THREE.MeshBasicMaterial({ color: '#ffffff' })
      );
      core.position.set(0, 0.85, 0.15);
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.82, 0.055, 8, 24),
        new THREE.MeshBasicMaterial({ color: '#22d3ee', transparent: true, opacity: 0.7 })
      );
      ring.rotation.x = Math.PI / 2;
      ring.position.y = 0.16;
      this.hero.add(body, core, ring);
      this.heroRing = ring;
      this.scene.add(this.hero);

      // 冲刺残影池
      this.aiPool = [];
      const aiGeo = new THREE.OctahedronGeometry(0.58, 0);
      for (let i = 0; i < 8; i++) {
        const m = new THREE.Mesh(aiGeo, new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0, depthWrite: false }));
        m.visible = false;
        this.scene.add(m);
        this.aiPool.push(m);
      }

      // InstancedMesh 批量渲染池
      const makeInst = (geo, mat, max) => {
        const m = new THREE.InstancedMesh(geo, mat, max);
        m.frustumCulled = false;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.scene.add(m);
        return m;
      };
      this.swarmerMesh = makeInst(
        new THREE.OctahedronGeometry(0.55, 0),
        new THREE.MeshStandardMaterial({ color: '#f43f5e', emissive: '#be123c', emissiveIntensity: 0.6, roughness: 0.3 }),
        120
      );
      this.chargerMesh = makeInst(
        new THREE.BoxGeometry(1.2, 1.15, 1.2),
        new THREE.MeshStandardMaterial({ color: '#ef4444', emissive: '#991b1b', emissiveIntensity: 0.55, roughness: 0.35 }),
        60
      );
      this.shooterMesh = makeInst(
        new THREE.ConeGeometry(0.62, 1.25, 6),
        new THREE.MeshStandardMaterial({ color: '#f59e0b', emissive: '#b45309', emissiveIntensity: 0.65, roughness: 0.25 }),
        60
      );
      this.bossMesh = new THREE.Group();
      const bossCore = new THREE.Mesh(
        new THREE.OctahedronGeometry(1.55, 1),
        new THREE.MeshStandardMaterial({ color: '#c026d3', emissive: '#a21caf', emissiveIntensity: 0.85, roughness: 0.2, metalness: 0.45 })
      );
      const bossRing = new THREE.Mesh(new THREE.TorusGeometry(2.1, 0.12, 8, 28), new THREE.MeshBasicMaterial({ color: '#facc15' }));
      bossRing.rotation.x = Math.PI / 2;
      this.bossMesh.add(bossCore, bossRing);
      this.bossMesh.visible = false;
      this.scene.add(this.bossMesh);

      this.bulletMesh = makeInst(
        new THREE.SphereGeometry(0.24, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#67e8f9' }),
        180
      );
      this.eBulletMesh = makeInst(
        new THREE.SphereGeometry(0.28, 8, 6),
        new THREE.MeshBasicMaterial({ color: '#fb7185' }),
        180
      );
      this.xpMesh = makeInst(
        new THREE.OctahedronGeometry(0.28, 0),
        new THREE.MeshStandardMaterial({ color: '#34d399', emissive: '#10b981', emissiveIntensity: 0.85, roughness: 0.2 }),
        240
      );
      this.bladeMesh = makeInst(
        new THREE.BoxGeometry(0.22, 0.14, 1.15),
        new THREE.MeshBasicMaterial({ color: '#38bdf8' }),
        10
      );
      this.maxParticles = 500;
      this.particleMesh = makeInst(
        new THREE.BoxGeometry(0.2, 0.2, 0.2),
        new THREE.MeshBasicMaterial(),
        this.maxParticles
      );
      this.particleMesh.setColorAt(0, new THREE.Color('#ffffff'));

      // 脉冲波 3D 环池
      this.novaPool = [];
      for (let i = 0; i < 4; i++) {
        const m = new THREE.Mesh(
          new THREE.TorusGeometry(1, 0.08, 8, 40),
          new THREE.MeshBasicMaterial({ color: '#38bdf8', transparent: true, opacity: 0.85 })
        );
        m.rotation.x = Math.PI / 2;
        m.position.y = 0.25;
        m.visible = false;
        this.scene.add(m);
        this.novaPool.push(m);
      }

      // 连锁闪电线段
      this.boltGeo = new THREE.BufferGeometry();
      this.boltGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(200 * 3), 3));
      this.boltLine = new THREE.LineSegments(this.boltGeo, new THREE.LineBasicMaterial({ color: '#7dd3fc' }));
      this.boltLine.frustumCulled = false;
      this.scene.add(this.boltLine);

      this._m = new THREE.Matrix4();
      this._q = new THREE.Quaternion();
      this._v = new THREE.Vector3();
      this._s = new THREE.Vector3(1, 1, 1);
      this._up = new THREE.Vector3(0, 1, 0);
      this._c = new THREE.Color();
      this.resize();
    }

    resize() {
      const sz = this.gfx.resize();
      this.w = sz.w;
      this.h = sz.h;
      this.camera.aspect = this.w / this.h;
      this.camera.updateProjectionMatrix();
    }

    render(s, st) {
      const t = st.t;
      const shake = st.shake || 0;
      const aspect = Math.max(0.45, this.w / this.h);
      // 根据竖屏/横屏/桌面动态调整俯视镜头高度，确保手机竖屏也能看清四周敌人
      const camH = aspect < 0.85 ? 29 : (this.h <= 540 ? 19.5 : 23);
      const camZ = camH * 0.62;
      const sx = shake > 0 ? (Math.random() - 0.5) * 0.8 : 0;
      const sz = shake > 0 ? (Math.random() - 0.5) * 0.8 : 0;

      const tx = s.px * 0.88 + sx;
      const tz = s.pz * 0.88 + sz;
      this.camPos.x += (tx - this.camPos.x) * 0.14;
      this.camPos.y += (camH - this.camPos.y) * 0.14;
      this.camPos.z += (tz + camZ - this.camPos.z) * 0.14;
      this.camLook.x += (s.px * 0.88 - this.camLook.x) * 0.18;
      this.camLook.z += (s.pz * 0.88 - this.camLook.z) * 0.18;
      this.camera.position.copy(this.camPos);
      this.camera.lookAt(this.camLook.x, 0, this.camLook.z);
      this.skyDome.position.copy(this.camera.position);

      // 主角与动态光源
      this.hero.visible = !s.dead && !(s.invuln > 0 && Math.floor(t * 28) % 2 === 0);
      this.hero.position.set(s.px, 0, s.pz);
      this.hero.rotation.y = Math.atan2(s.facingX, s.facingZ);
      this.heroRing.scale.setScalar(1 + Math.sin(t * 8) * 0.08);
      this.heroLight.position.set(s.px, 2.2, s.pz);
      this.heroLight.intensity = s.dashTimer > 0 ? 5.5 : 3.2;

      // 冲刺残影
      const ais = st.afterimages || [];
      for (let i = 0; i < this.aiPool.length; i++) {
        const m = this.aiPool[i];
        if (i < ais.length) {
          const a = ais[i];
          m.visible = true;
          m.position.set(a.x, 0.72, a.z);
          m.material.opacity = Math.max(0, (a.life / a.max) * 0.5);
        } else m.visible = false;
      }

      const m4 = this._m, q = this._q, v = this._v, sc = this._s;

      // 敌人分类批量写入
      let nSw = 0, nCh = 0, nSh = 0;
      let activeBoss = null;
      for (const e of s.enemies) {
        const pulse = e.hitFlash > 0 ? 1.24 : 1;
        if (e.kind === 'boss') { activeBoss = e; continue; }
        if (e.kind === 'charger' && nCh < 60) {
          q.setFromAxisAngle(this._up, Math.atan2(s.px - e.x, s.pz - e.z));
          v.set(e.x, 0.58, e.z); sc.set(pulse, pulse, pulse);
          m4.compose(v, q, sc); this.chargerMesh.setMatrixAt(nCh++, m4);
        } else if (e.kind === 'shooter' && nSh < 60) {
          q.setFromAxisAngle(this._up, t * 3 + e.x);
          v.set(e.x, 0.72 + Math.sin(t * 5 + e.z) * 0.12, e.z); sc.set(pulse, pulse, pulse);
          m4.compose(v, q, sc); this.shooterMesh.setMatrixAt(nSh++, m4);
        } else if (nSw < 120) {
          q.setFromAxisAngle(this._up, t * 4.5 + e.x);
          v.set(e.x, 0.58 + Math.sin(t * 7 + e.z) * 0.08, e.z); sc.set(pulse, pulse, pulse);
          m4.compose(v, q, sc); this.swarmerMesh.setMatrixAt(nSw++, m4);
        }
      }
      this.swarmerMesh.count = nSw; this.swarmerMesh.instanceMatrix.needsUpdate = true;
      this.chargerMesh.count = nCh; this.chargerMesh.instanceMatrix.needsUpdate = true;
      this.shooterMesh.count = nSh; this.shooterMesh.instanceMatrix.needsUpdate = true;

      this.bossMesh.visible = !!activeBoss;
      if (activeBoss) {
        this.bossMesh.position.set(activeBoss.x, 1.45 + Math.sin(t * 3) * 0.18, activeBoss.z);
        this.bossMesh.rotation.y = t * 1.4;
        const bs = activeBoss.hitFlash > 0 ? 1.12 : 1;
        this.bossMesh.scale.set(bs, bs, bs);
      }

      // 玩家子弹 & 敌方弹幕
      const nb = Math.min(s.bullets.length, 180);
      for (let i = 0; i < nb; i++) {
        const b = s.bullets[i];
        v.set(b.x, 0.68, b.z); m4.compose(v, q.identity(), sc.set(1, 1, 1));
        this.bulletMesh.setMatrixAt(i, m4);
      }
      this.bulletMesh.count = nb; this.bulletMesh.instanceMatrix.needsUpdate = true;

      const neb = Math.min(s.eBullets.length, 180);
      for (let i = 0; i < neb; i++) {
        const b = s.eBullets[i];
        v.set(b.x, 0.68, b.z); m4.compose(v, q.identity(), sc.set(1, 1, 1));
        this.eBulletMesh.setMatrixAt(i, m4);
      }
      this.eBulletMesh.count = neb; this.eBulletMesh.instanceMatrix.needsUpdate = true;

      // 经验水晶
      const nx = Math.min(s.gems.length, 240);
      for (let i = 0; i < nx; i++) {
        const gm = s.gems[i];
        const sz = gm.big ? 1.45 : 1;
        q.setFromAxisAngle(this._up, t * 3.5 + i);
        v.set(gm.x, 0.42 + Math.sin(t * 4 + i) * 0.1, gm.z);
        m4.compose(v, q, sc.set(sz, sz * 1.3, sz));
        this.xpMesh.setMatrixAt(i, m4);
      }
      this.xpMesh.count = nx; this.xpMesh.instanceMatrix.needsUpdate = true;

      // 轨道光刃
      const hst = NS.heroStats(s);
      for (let i = 0; i < hst.blades; i++) {
        const ang = s.bladeAngle + (i * Math.PI * 2) / hst.blades;
        v.set(s.px + Math.cos(ang) * hst.bladeRadius, 0.72, s.pz + Math.sin(ang) * hst.bladeRadius);
        q.setFromAxisAngle(this._up, -ang);
        m4.compose(v, q, sc.set(1, 1, 1));
        this.bladeMesh.setMatrixAt(i, m4);
      }
      this.bladeMesh.count = hst.blades; this.bladeMesh.instanceMatrix.needsUpdate = true;

      // 脉冲波环
      for (let i = 0; i < this.novaPool.length; i++) {
        const m = this.novaPool[i];
        if (i < s.novas.length) {
          const nv = s.novas[i];
          m.visible = true;
          m.position.set(nv.x, 0.25, nv.z);
          m.scale.set(nv.r, nv.r, 1);
          m.material.opacity = Math.max(0, nv.life / nv.max);
        } else m.visible = false;
      }

      // 闪电链线段
      const posArr = this.boltGeo.attributes.position.array;
      let bi = 0;
      for (const b of s.bolts) {
        if (bi + 12 >= posArr.length) break;
        const mx = (b.x1 + b.x2) / 2 + (Math.random() - 0.5) * 0.9;
        const mz = (b.z1 + b.z2) / 2 + (Math.random() - 0.5) * 0.9;
        posArr[bi++] = b.x1; posArr[bi++] = 0.85; posArr[bi++] = b.z1;
        posArr[bi++] = mx;   posArr[bi++] = 1.1;  posArr[bi++] = mz;
        posArr[bi++] = mx;   posArr[bi++] = 1.1;  posArr[bi++] = mz;
        posArr[bi++] = b.x2; posArr[bi++] = 0.85; posArr[bi++] = b.z2;
      }
      this.boltGeo.setDrawRange(0, bi / 3);
      this.boltGeo.attributes.position.needsUpdate = true;

      // 3D 爆炸粒子
      const ps = st.particles || [];
      const np = Math.min(ps.length, this.maxParticles);
      for (let i = 0; i < np; i++) {
        const p = ps[i];
        const k = Math.max(0.1, p.life / p.max);
        v.set(p.x, p.y, p.z);
        q.setFromAxisAngle(this._up, p.life * 8);
        m4.compose(v, q, sc.set(k, k, k));
        this.particleMesh.setMatrixAt(i, m4);
        this.particleMesh.setColorAt(i, this._c.set(p.color));
      }
      this.particleMesh.count = np;
      this.particleMesh.instanceMatrix.needsUpdate = true;
      if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;

      this.gl.render(this.scene, this.camera);
    }

    dispose() {
      if (G.Studio && G.Studio.disposeObject) G.Studio.disposeObject(this.scene);
    }
  }

  NS.Renderer3D = SurvivorRenderer3D;
})(window);
