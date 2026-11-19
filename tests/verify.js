// PixelForge Studio 多游戏平台统一验收入口：node tests/verify.js
// 自动运行 core 内核单测 + tests/games/*.test.js 全部游戏回归验收
const fs = require('fs');
const path = require('path');

let total = 0;
let failed = 0;
const ok = (cond, msg) => {
  total++;
  console.log(`${cond ? '✅' : '❌'} ${msg}`);
  if (!cond) failed++;
};

console.log('=== 1. Studio Core 共享内核验收 ===');
require('./core.test.js')(ok);

const gamesTestDir = path.join(__dirname, 'games');
const testFiles = fs.readdirSync(gamesTestDir).filter((f) => f.endsWith('.test.js')).sort();
for (const file of testFiles) {
  console.log(`\n=== 2. 游戏模块验收: ${file} ===`);
  require(path.join(gamesTestDir, file))(ok);
}

console.log(failed ? `\n❌ ${failed}/${total} 项失败` : `\n🎉 全部 ${total} 项跨游戏平台验收通过！`);
process.exit(failed ? 1 : 0);
