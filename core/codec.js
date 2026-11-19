/* Studio Core — 紧凑编码工具（RLE + base64url）与多游戏 URL Hash 路由（100% 兼容旧 #L= 链接） */
(function (G) {
  'use strict';
  const Studio = (G.Studio = G.Studio || {});

  function rle(str) {
    let out = '';
    let i = 0;
    while (i < str.length) {
      let j = i;
      while (j < str.length && str[j] === str[i]) j++;
      const n = j - i;
      out += n >= 3 ? n + str[i] : str[i].repeat(n);
      i = j;
    }
    return out;
  }

  function unrle(s, maxLen) {
    let out = '';
    let num = '';
    for (const c of s) {
      if (c >= '0' && c <= '9') {
        num += c;
        continue;
      }
      const n = num ? parseInt(num, 10) : 1;
      num = '';
      if (out.length + n > maxLen) throw new Error('数据过长');
      out += c.repeat(n);
    }
    return out;
  }

  function b64urlEncode(s) {
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function b64urlDecode(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return atob(s);
  }

  // 解析 URL Hash：
  // 1) 旧版分享链接: #L=<code...>  -> { gameId: 'pixelforge', payload: '<code...>', legacy: true }
  // 2) 新版多游戏链接: #g=<id>&d=<data> 或 #g=<id> -> { gameId: '<id>', payload: '<data>'|null }
  // 3) 空或 #hub -> { gameId: null, payload: null }
  function parseHash(hashStr) {
    const h = String(hashStr || '').replace(/^#/, '');
    if (!h || h === 'hub') return { gameId: null, payload: null, legacy: false };

    const gMatch = h.match(/(?:^|&)g=([\w-]+)/);
    const dMatch = h.match(/(?:^|&)d=([\w-]+)/);
    const lMatch = h.match(/(?:^|&)L=([\w-]+)/);

    if (gMatch) {
      return { gameId: gMatch[1], payload: (dMatch && dMatch[1]) || (lMatch && lMatch[1]) || null, legacy: false };
    }
    if (lMatch) {
      return { gameId: 'pixelforge', payload: lMatch[1], legacy: true };
    }
    return { gameId: null, payload: null, legacy: false };
  }

  function buildHash(gameId, payload) {
    if (!gameId) return '#hub';
    if (!payload) return `#g=${gameId}`;
    return `#g=${gameId}&d=${payload}`;
  }

  function buildShareURL(baseHref, gameId, payload) {
    const base = String(baseHref || '').split('#')[0];
    return base + buildHash(gameId, payload);
  }

  Studio.Codec = { rle, unrle, b64urlEncode, b64urlDecode, parseHash, buildHash, buildShareURL };
})(typeof window !== 'undefined' ? window : globalThis);
