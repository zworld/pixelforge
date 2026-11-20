# 🎮 PixelForge Studio · 3D 多游戏工坊

一个 **零构建、离线可用、桌面 + 手机竖屏/横屏掌机全适配** 的多游戏 3D Web 平台。共享统一 Three.js 3D 内核、程序化 WebAudio 合成器、确定性物理循环与多 Profile 移动端触屏手柄，可直接托管于 GitHub Pages。

🌐 **线上体验**：https://zworld.github.io/pixelforge/

---

## 内置游戏矩阵

| 游戏 | 品类 | 核心亮点 | 触屏 Profile |
|---|---|---|---|
| **⛏️ PixelForge · 3D 关卡工坊** | 2.5D 平台跳跃 + UGC | *Celeste* 级八向冲刺/蹬墙跳/顶角修正 · 17 种机关 · 4 大 3D 主题 · 浏览器内 AI 一键验关与观战演示 · 金色幽灵竞速 · URL 一键分享 | `platformer`（8向摇杆 + 跳/冲） |
| **⚡ Neon Survivor 3D · 霓虹生存者** | 3D 肉鸽割草 / 弹幕 | 俯视角 3D 赛博竞技场 · `InstancedMesh` 百怪 60fps · 自动瞄准 + 无敌冲刺 + EMP 脉冲清场 · 7 系肉鸽升级三选一与 Boss 弹幕战 | `survivor`（360°摇杆 + 冲/脉冲） |
| **🦅 神雕侠侣 · 问情剑** | 第一人称 3D 武侠动作 | 扮演杨过亲历古墓/绝情谷/独孤剑冢/襄阳四回原著剧情 · 断臂前后右手君子剑切左手玄铁重剑 · 只狼式弹反破防/反制暗器 · 黯然销魂掌与金轮法王五轮决战 | 定制 4 键武侠触屏（左摇杆 + 滑屏转视角 + 剑/弹/轻功/绝学） |
| **🏛️ 古墓丽影 · 秘鲁遗迹** | 第三人称 3D 动作冒险 | 1:1 致敬秘鲁洞窟/维尔卡班巴/失落山谷三部曲 · 18 关节长麻花辫劳拉 · 抓崖平移攀爬/推石压板/拉杆/滚石逃生/地刺毒箭 · 双枪后空翻大战史前霸王龙 · 求生本能与绿色照明弹 | 定制探险触屏（左摇杆 + 滑屏转镜头 + 双枪/跳爬/翻滚/交互/急救） |

---

## 多游戏平台架构

```text
index.html               统一入口：Arcade Hub 游戏大厅 + 运行壳层 + 共享虚拟手柄
style.css                大厅卡片、掌机横竖屏自适应与安全区样式
vendor/three.min.js      本地共享 Three.js r159 UMD（支持离线直接打开）
core/                    跨游戏共享内核（零业务耦合）
  ├── studio.js          注册表、Hash 路由（#g=<id>&d=...，兼容旧 #L=...）、脚本按需懒加载与生命周期管理
  ├── gfx3d.js           全局唯一 WebGLRenderer、ACES 色调映射、渐变天空穹顶、安全 GPU 回收
  ├── input.js           键盘 + Gamepad + 声明式多 Profile 移动端多点触控手柄
  ├── audio.js           程序化 WebAudio SFX + 多主题 BGM 音序器 + iOS 首次触摸自动解锁
  ├── loop.js            1/60s 确定性固定步长主循环 + Hitstop 微顿帧
  ├── codec.js           RLE + base64url 压缩与多游戏短链路由
  ├── storage.js         按 gameId 命名空间隔离的存档、最快纪录与大厅战绩徽章
  └── solver.js          通用确定性束搜索求解框架（Node 同步 + 浏览器异步）
games/
  ├── registry.js        游戏清单配置（新增游戏在此注册即可上线大厅）
  ├── pixelforge/        游戏 1：3D 平台跳跃与关卡编辑器
  ├── neon-survivor/     游戏 2：3D 霓虹肉鸽生存竞技场
  └── condor-hero/       游戏 3：神雕侠侣 · 问情剑（第一人称 3D 武侠动作 RPG）
scripts/new-game.js      新游戏脚手架（一键生成目录、引擎、入口与单测模板）
tests/verify.js          统一自动化验收入口（自动遍历 core + 全部 games/* 测试）
```

---

## 快速新增一款游戏

```bash
# 1. 一键生成新游戏骨架与测试模板
node scripts/new-game.js cube-quest "Cube Quest 3D"

# 2. 在 games/registry.js 中追加游戏清单，即可在首页大厅按需懒加载运行

# 3. 运行全平台 48+ 项自动化验收
node tests/verify.js
```
