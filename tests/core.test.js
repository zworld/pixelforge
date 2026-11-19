// 共享内核自动化验收：编码路由兼容、命名空间存储隔离、通用求解器与输入配置
require('../core/codec.js');
require('../core/storage.js');
require('../core/solver.js');
require('../core/input.js');

const Studio = globalThis.Studio;

module.exports = function run(ok) {
  // 1) 多游戏 URL Hash 路由与历史 #L= 链接兼容
  const rLegacy = Studio.Codec.parseHash('#L=MTsxMTA7MTU7abc');
  ok(rLegacy.gameId === 'pixelforge' && rLegacy.payload === 'MTsxMTA7MTU7abc' && rLegacy.legacy === true,
    'Core Codec: 旧版 #L=... 链接自动路由至 pixelforge 保持 100% 兼容');

  const rNew = Studio.Codec.parseHash('#g=neon-survivor&d=XYZ123');
  ok(rNew.gameId === 'neon-survivor' && rNew.payload === 'XYZ123' && !rNew.legacy,
    'Core Codec: 新版 #g=<id>&d=<data> 多游戏深链解析准确');

  const rHub = Studio.Codec.parseHash('#hub');
  ok(rHub.gameId === null, 'Core Codec: #hub 与空 hash 路由回游戏大厅');

  const url = Studio.Codec.buildShareURL('https://zworld.github.io/pixelforge/#old', 'pixelforge', 'ABC');
  ok(url === 'https://zworld.github.io/pixelforge/#g=pixelforge&d=ABC',
    'Core Codec: buildShareURL 生成干净的多游戏分享链接');

  // 2) Storage 按游戏隔离
  const s1 = Studio.Storage.forGame('pixelforge');
  const s2 = Studio.Storage.forGame('neon-survivor');
  s1.set('best', '5.05');
  s2.set('best', '2400');
  ok(s1.get('best') === '5.05' && s2.get('best') === '2400',
    'Core Storage: 不同 gameId 持久化键值严格命名空间隔离');
  s1.setHubBadge('最快 5.05s');
  s2.setHubBadge('W5 · 2400分');
  ok(Studio.Storage.getHubBadge('pixelforge') === '最快 5.05s' && Studio.Storage.getHubBadge('neon-survivor') === 'W5 · 2400分',
    'Core Storage: 大厅战绩徽章按游戏独立读写');

  // 3) 通用束搜索求解器
  const solver = Studio.Solver.createBeamSolver({
    initialState: { x: 0 },
    cloneState: (s) => ({ x: s.x }),
    step: (s, a) => { s.x += a; },
    actions: [1, 2],
    isDead: () => false,
    isWon: (s) => s.x >= 10,
    score: (s) => s.x,
    hash: (s) => String(s.x),
    hold: 1,
    width: 10,
    maxDepth: 20,
  });
  const res = solver.solveSync();
  ok(res && res.state.x >= 10, 'Core Solver: 通用束搜索求解器工作正常');

  // 4) 输入 Profile 注册
  ok(Studio.InputProfiles.platformer && Studio.InputProfiles.survivor && Studio.InputProfiles['arcade-lr'],
    'Core Input: 多品类移动端触屏 Profile 已就绪');
};
