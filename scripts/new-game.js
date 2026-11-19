#!/usr/bin/env node
// 新游戏脚手架：node scripts/new-game.js <game-id> "游戏标题"
// 自动生成 games/<id>/{engine.js,render3d.js,main.js} 与 tests/games/<id>.test.js，并输出注册清单片段
const fs = require('fs');
const path = require('path');

const id = (process.argv[2] || '').trim().toLowerCase();
const title = (process.argv[3] || id).trim();

if (!id || !/^[a-z0-9-]+$/.test(id)) {
  console.error('用法: node scripts/new-game.js <game-id> "游戏名称"（id 仅支持小写字母/数字/连字符）');
  process.exit(1);
}

const root = path.resolve(__dirname, '..');
const gameDir = path.join(root, 'games', id);
const testPath = path.join(root, 'tests', 'games', `${id}.test.js`);
if (fs.existsSync(gameDir)) {
  console.error(`目录已存在: ${gameDir}`);
  process.exit(1);
}
fs.mkdirSync(gameDir, { recursive: true });
fs.mkdirSync(path.dirname(testPath), { recursive: true });

const ns = id.replace(/[^a-z0-9]/gi, '_').toUpperCase();

fs.writeFileSync(path.join(gameDir, 'engine.js'), `/* Game: ${title} — 纯逻辑确定性核心引擎（无 DOM，可在 Node 运行） */
(function (G) {
  'use strict';
  const ENG = (G.${ns} = G.${ns} || {});
  const DT = 1 / 60;

  function newState() {
    return { time: 0, x: 0, z: 0, score: 0, dead: false, events: [] };
  }
  function step(s, input) {
    s.events.length = 0;
    if (s.dead) return s;
    s.time += DT;
    s.x += (input.ax || 0) * 8 * DT;
    s.z += (input.ay || 0) * 8 * DT;
    return s;
  }

  Object.assign(ENG, { DT, newState, step });
})(typeof window !== 'undefined' ? window : globalThis);
`);

fs.writeFileSync(path.join(gameDir, 'main.js'), `/* Game: ${title} — 接入 Studio 多游戏契约 */
(function () {
  'use strict';
  const Studio = window.Studio;
  const ENG = window.${ns};

  Studio.defineGame('${id}', (ctx) => {
    let state = null, loop = null, scene = null, camera = null, hero = null;
    return {
      mount() {
        const THREE = window.THREE;
        state = ENG.newState();
        scene = new THREE.Scene();
        scene.add(Studio.createSkyDome(THREE));
        scene.add(new THREE.HemisphereLight('#ffffff', '#334155', 1.6));
        camera = new THREE.PerspectiveCamera(46, ctx.gfx.w / ctx.gfx.h, 0.1, 300);
        camera.position.set(0, 14, 14);
        camera.lookAt(0, 0, 0);
        hero = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: '#38bdf8' }));
        scene.add(hero);
        ctx.setPlaying(true);
        ctx.input.setVisible(true);
        ctx.setStatus('${title} 运行中');
        loop = new ctx.FixedLoop({
          dt: ENG.DT,
          onTick: () => ENG.step(state, ctx.input.poll()),
          onFrame: () => {
            hero.position.set(state.x, 0.5, state.z);
            ctx.gfx.gl.render(scene, camera);
          },
        });
        loop.start();
      },
      unmount() {
        if (loop) loop.stop();
        if (scene) Studio.disposeObject(scene);
      },
      resize(w, h) {
        if (camera) { camera.aspect = w / h; camera.updateProjectionMatrix(); }
      },
    };
  });
})();
`);

fs.writeFileSync(testPath, `// 自动化测试：${title}
require('../../games/${id}/engine.js');
const ENG = globalThis.${ns};

module.exports = function run(ok) {
  const s = ENG.newState();
  ENG.step(s, { ax: 1, ay: 0 });
  ok(s.x > 0 && s.time > 0, '[${title}] 确定性物理引擎基础步进正常');
};
`);

console.log(`✅ 已生成新游戏骨架:\n  - games/${id}/engine.js\n  - games/${id}/main.js\n  - tests/games/${id}.test.js\n\n请在 games/registry.js 中追加注册清单即可上线大厅！`);
