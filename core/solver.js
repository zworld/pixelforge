/* Studio Core — 通用确定性束搜索求解器（供平台跳跃/解谜等任意游戏在 Node 与浏览器异步验关） */
(function (G) {
  'use strict';
  const Studio = (G.Studio = G.Studio || {});

  // cfg: { initialState, cloneState, step, actions, isDead, isWon, score, hash, width, hold, maxDepth, formatResult }
  function createBeamSolver(cfg) {
    const width = cfg.width || 280;
    const hold = cfg.hold || 5;
    const maxDepth = cfg.maxDepth || 650;
    const actions = cfg.actions || [{}];

    let beam = [{ s: cfg.initialState, parent: null, a: -1 }];
    let depth = 0;
    let explored = 0;
    let done = !!cfg.skip;
    let result = null;

    function stepDepth() {
      if (done) return true;
      if (depth >= maxDepth || !beam.length) { done = true; return true; }
      depth++;
      const next = [];
      const seen = new Set();
      for (const node of beam) {
        for (let ai = 0; ai < actions.length; ai++) {
          const s = cfg.cloneState(node.s);
          for (let k = 0; k < hold && !cfg.isDead(s) && !cfg.isWon(s); k++) {
            cfg.step(s, actions[ai]);
          }
          explored++;
          if (cfg.isDead(s)) continue;
          const child = { s, parent: node, a: ai };
          if (cfg.isWon(s)) {
            const path = [];
            for (let n = child; n.parent; n = n.parent) path.push(actions[n.a]);
            path.reverse();
            result = cfg.formatResult
              ? cfg.formatResult({ path, hold, explored, state: s })
              : { path, hold, explored, state: s };
            done = true;
            return true;
          }
          const key = cfg.hash(s);
          if (seen.has(key)) continue;
          seen.add(key);
          child.score = cfg.score(s);
          next.push(child);
        }
      }
      if (!next.length) { done = true; return true; }
      next.sort((a, b) => b.score - a.score);
      beam = next.slice(0, width);
      return false;
    }

    return {
      stepBatch(budgetMs = 12) {
        const t0 = typeof performance !== 'undefined' ? performance.now() : Date.now();
        while (!done) {
          stepDepth();
          const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
          if (now - t0 >= budgetMs) break;
        }
        return { done, depth, maxDepth, explored, result };
      },
      solveSync() {
        while (!done) stepDepth();
        return result;
      },
    };
  }

  Studio.Solver = { createBeamSolver };
})(typeof window !== 'undefined' ? window : globalThis);
