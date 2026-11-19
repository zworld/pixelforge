/* Studio Core — 按 gameId 命名空间隔离的持久化存储（存档、PB 纪录、大厅统计） */
(function (G) {
  'use strict';
  const Studio = (G.Studio = G.Studio || {});

  const META_KEY = 'pfstudio.meta.v1';

  function createMemoryFallback() {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => map.set(k, String(v)),
      removeItem: (k) => map.delete(k),
    };
  }

  function getBackend() {
    try {
      if (typeof localStorage !== 'undefined') return localStorage;
    } catch (e) { /* ignore */ }
    if (!Studio._memStore) Studio._memStore = createMemoryFallback();
    return Studio._memStore;
  }

  function readMeta() {
    try {
      const raw = getBackend().getItem(META_KEY);
      return raw ? JSON.parse(raw) : { lastGame: null, badges: {} };
    } catch (e) {
      return { lastGame: null, badges: {} };
    }
  }

  function writeMeta(meta) {
    try { getBackend().setItem(META_KEY, JSON.stringify(meta)); } catch (e) { /* ignore */ }
  }

  function createGameStorage(gameId) {
    const prefix = `pfstudio.g.${gameId}.`;
    return {
      get(key, fallback = null) {
        try {
          const v = getBackend().getItem(prefix + key);
          return v !== null ? v : fallback;
        } catch (e) { return fallback; }
      },
      set(key, val) {
        try { getBackend().setItem(prefix + key, String(val)); return true; } catch (e) { return false; }
      },
      getJSON(key, fallback = null) {
        const raw = this.get(key, null);
        if (raw === null) return fallback;
        try { return JSON.parse(raw); } catch (e) { return fallback; }
      },
      setJSON(key, obj) {
        try { return this.set(key, JSON.stringify(obj)); } catch (e) { return false; }
      },
      getRaw(fullKey) {
        try { return getBackend().getItem(fullKey); } catch (e) { return null; }
      },
      setRaw(fullKey, val) {
        try { getBackend().setItem(fullKey, String(val)); return true; } catch (e) { return false; }
      },
      // 更新显示在游戏大厅卡片上的亮点战绩标签（如 "最快 5.05s" / "最高波次 W8"）
      setHubBadge(text) {
        const meta = readMeta();
        meta.badges = meta.badges || {};
        meta.badges[gameId] = text;
        writeMeta(meta);
      },
      getHubBadge() {
        const meta = readMeta();
        return (meta.badges && meta.badges[gameId]) || null;
      },
    };
  }

  Studio.Storage = {
    forGame: createGameStorage,
    getLastGame() { return readMeta().lastGame || null; },
    setLastGame(id) {
      const meta = readMeta();
      meta.lastGame = id;
      writeMeta(meta);
    },
    getHubBadge(id) {
      const meta = readMeta();
      return (meta.badges && meta.badges[id]) || null;
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
