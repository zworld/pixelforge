/* 游戏注册清单（大厅卡片元信息 + 懒加载脚本路径；新增游戏只需追加一项即可） */
(function (G) {
  'use strict';
  const Studio = G.Studio;

  Studio.registerManifest({
    id: 'pixelforge',
    title: 'PixelForge · 3D 关卡工坊',
    shortTitle: 'PixelForge',
    genre: '2.5D 平台跳跃 / UGC',
    tagline: 'Celeste 级八向冲刺与蹬墙跳 · 17 种组合机关 · 4 主题 3D 美术 · 内置 AI 一键验关与金色幽灵竞速。',
    icon: '⛏️',
    accent: '#38bdf8',
    coverBg: 'linear-gradient(135deg, #0ea5e9 0%, #1e3a8a 55%, #0f172a 100%)',
    tags: ['3D 关卡编辑器', 'AI 验关演示', 'URL 分享', '4 大主题'],
    orientationHint: '桌面 + 手机竖屏/横屏掌机',
    touchProfile: 'platformer',
    hasSidebar: true,
    scripts: [
      'games/pixelforge/level.js',
      'games/pixelforge/engine.js',
      'games/pixelforge/icons.js',
      'games/pixelforge/render3d.js',
      'games/pixelforge/editor.js',
      'games/pixelforge/main.js',
    ],
  });

  Studio.registerManifest({
    id: 'neon-survivor',
    title: 'Neon Survivor 3D · 霓虹生存者',
    shortTitle: 'Neon Survivor',
    genre: '3D 肉鸽割草 / 弹幕',
    tagline: '俯视角 3D 霓虹竞技场 · 同屏百怪割草 · 自动瞄准 + 无敌冲刺 + EMP 清场 · 7 系肉鸽升级构筑与 Boss 战。',
    icon: '⚡',
    accent: '#f472b6',
    coverBg: 'linear-gradient(135deg, #c026d3 0%, #3b0764 55%, #09051f 100%)',
    tags: ['Instanced 3D 百怪', '肉鸽三选一', 'Boss 弹幕', 'Synthwave BGM'],
    orientationHint: '推荐手机横屏 / 桌面 WASD',
    touchProfile: 'survivor',
    hasSidebar: false,
    scripts: [
      'games/neon-survivor/engine.js',
      'games/neon-survivor/render3d.js',
      'games/neon-survivor/main.js',
    ],
  });

  Studio.registerManifest({
    id: 'condor-hero',
    title: '神雕侠侣 · 问情剑',
    shortTitle: '神雕侠侣',
    genre: '第一人称 3D 武侠动作',
    tagline: '扮演杨过亲历古墓、绝情谷、独孤剑冢至襄阳决战 · 断臂前后右手君子剑切换左手玄铁重剑 · 只狼式弹反破防与黯然销魂掌。',
    icon: '🦅',
    accent: '#f59e0b',
    coverBg: 'linear-gradient(135deg, #b45309 0%, #3b0764 48%, #0c192c 100%)',
    tags: ['第一人称 3D', '弹反破防', '四回原著剧情', '玄铁重剑/黯然掌'],
    orientationHint: '桌面 FPS / 手机横屏双摇杆',
    touchProfile: 'none',
    hasSidebar: false,
    scripts: [
      'games/condor-hero/story.js',
      'games/condor-hero/engine.js',
      'games/condor-hero/character3d.js',
      'games/condor-hero/render3d.js',
      'games/condor-hero/main.js',
    ],
  });
})(typeof window !== 'undefined' ? window : globalThis);
