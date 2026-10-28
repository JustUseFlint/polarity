/* Figure tokens: Commons portrait, monogram ring, or designed token (initials + franchise colour + role symbol; never official art). */
(function () {
  const P = window.P;
  P.SYMBOLS = {
    crown: 'M3 18h18l1-10-5 4-5-7-5 7-5-4z',
    sword: 'M20 3v4L10 17l-3-3L17 4zM6 15l3 3-2.500 2.500-2-.5-.5-2z',
    star: 'M12 2l3 7 7 .6-5.300 4.700 1.700 7.200L12 17.600 5.600 21.500l1.700-7.200L2 9.600 9 9z',
    shield: 'M12 2l8 3v6c0 5-3.400 9-8 11-4.600-2-8-6-8-11V5z',
    skull: 'M12 2a8 8 0 00-8 8c0 3 1.500 5 3 6v4h3v-2h4v2h3v-4c1.500-1 3-3 3-6a8 8 0 00-8-8zM9 11a1.600 1.600 0 110 3.200A1.600 1.600 0 019 11zm6 0a1.600 1.600 0 110 3.200A1.600 1.600 0 0115 11z',
    rocket: 'M12 2c3 2 5 5.500 5 9.500L19 15v3l-3-1.500H8L5 18v-3l2-3.500C7 7.500 9 4 12 2zm0 7a2 2 0 100 4 2 2 0 000-4z',
    book: 'M4 4h7a2 2 0 012 2v14a2 2 0 00-2-2H4zM20 4h-7a2 2 0 00-2 2v14a2 2 0 012-2h7z',
    flask: 'M9 2h6v2h-1v5l5 9a2 2 0 01-1.800 3H6.800A2 2 0 015 18l5-9V4H9z',
    gear: 'M12 8a4 4 0 100 8 4 4 0 000-8zM10.500 2h3l.5 2.500 1.800.8 2.200-1.400 2.100 2.100-1.400 2.200.8 1.800 2.500.5v3l-2.500.5-.8 1.800 1.400 2.200-2.100 2.100-2.200-1.400-1.800.8-.5 2.500h-3l-.5-2.500-1.800-.8-2.200 1.400-2.100-2.100 1.400-2.200-.8-1.800L2 13.500v-3l2.500-.5.8-1.800L3.900 6 6 3.900l2.200 1.400 1.800-.8z',
    leaf: 'M20 4C10 4 4 9 4 15c0 2 1 4 2 5 1-5 5-8 9-9-4 2-6 5-7 9 7 0 12-5 12-16z',
    mask: 'M3 5c5 2 13 2 18 0v7c0 5-4 9-9 9s-9-4-9-9zM8 11a2 2 0 100 3 2 2 0 000-3zm8 0a2 2 0 100 3 2 2 0 000-3z',
    eye: 'M12 5C6 5 2 12 2 12s4 7 10 7 10-7 10-7-4-7-10-7zm0 3a4 4 0 110 8 4 4 0 010-8z',
    flame: 'M12 2c1 4 6 6 6 12a6 6 0 01-12 0c0-3 2-4 3-7 1 2 2 2 3 0 0-2-1-3 0-5z',
    bolt: 'M13 2L4 14h6l-1 8 9-12h-6z',
    wand: 'M4 20L16 8l1.500 1.500L5.500 21.500zM18 2l1 2.500 2.500 1-2.500 1L18 9l-1-2.500-2.500-1 2.500-1z',
    paw: 'M8 9a2 2.500 0 100-5 2 2.500 0 000 5zm8 0a2 2.500 0 100-5 2 2.500 0 000 5zM4.500 14a2 2.500 0 100-5 2 2.500 0 000 5zm15 0a2 2.500 0 100-5 2 2.500 0 000 5zM12 11c3 0 6 4 6 7 0 2-2 2.500-3 2-1-.5-2-.5-3-.5s-2 0-3 .5c-1 .5-3 0-3-2 0-3 3-7 6-7z',
    heart: 'M12 21s-8-5-8-11a4.500 4.500 0 018-2.500A4.500 4.500 0 0120 10c0 6-8 11-8 11z',
    moon: 'M20 14A8 8 0 019.500 4 8 8 0 1020 14z',
    sun: 'M12 7a5 5 0 100 10 5 5 0 000-10zM11 1h2v3h-2zM11 20h2v3h-2zM1 11h3v2H1zM20 11h3v2h-3z',
    diamond: 'M12 2l8 7-8 13L4 9z',
    anchor: 'M11 2h2v3.100a3 3 0 11-2 0zM11 8h2v10.900A7 7 0 0019 12h-2l3-4 3 4h-2a9 9 0 01-7 8.900zM11 8v10.900A9 9 0 014 12H2l3-4 3 4H6a7 7 0 005 6.900z',
  };
  P.SYMBOL_KEYS = Object.keys(P.SYMBOLS);
  P.symbolPath = key => P.SYMBOLS[key] || P.SYMBOLS[P.SYMBOL_KEYS[P.hash(String(key || 'x')) % P.SYMBOL_KEYS.length]];
  const lum = hex => { const m = /^#?([0-9a-f]{6})$/i.exec(hex || ''); if (!m) return 0.2; const n = parseInt(m[1], 16); const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(n >> 16) + .7152 * f((n >> 8) & 255) + .0722 * f(n & 255); };
  P.inkOn = hex => lum(hex) > 0.38 ? '#0B0D12' : '#FFFFFF';
  const shade = (hex, k) => { const n = parseInt((hex || '#555555').slice(1), 16); const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.max(0, Math.min(255, Math.round(v * k)))); return '#' + c.map(v => v.toString(16).padStart(2, '0')).join(''); };
  P.shade = shade;
  const svgSym = (key, color) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill-rule="evenodd" fill="${color}" d="${P.symbolPath(key)}"/></svg>`;
  P.symbolSvg = svgSym;

  /** returns the token DOM element. opts: size px, ring (css colour), dashed, faint */
  P.tokenEl = function (fig, opts) {
    opts = opts || {}; const size = opts.size || 40;
    const el = document.createElement('div');
    el.className = 'tk' + (opts.dashed ? ' dashed' : '') + (opts.faint ? ' faint' : '') + (size < 28 ? ' tiny' : '');
    el.style.setProperty('--sz', size + 'px');
    if (opts.ring) el.style.setProperty('--rc', opts.ring);
    const inner = document.createElement('div'); inner.className = 'tk-in'; el.append(inner);
    const mono = () => {
      inner.className = 'tk-in mono'; inner.innerHTML = '';
      inner.append(P.h('span.ini', P.initials(fig.name)));
    };
    if (fig.type === 'fictional') {
      const t = fig.token || { color: '#6B7280', symbol: 'star' };
      const ink = P.inkOn(t.color);
      inner.className = 'tk-in design';
      inner.style.background = `linear-gradient(145deg, ${shade(t.color, 1.15)}, ${shade(t.color, .72)})`;
      inner.style.color = ink;
      if (size < 28) inner.innerHTML = svgSym(t.symbol, ink);
      else { inner.append(P.h('span.ini', P.initials(fig.name))); inner.append(P.h('span.sym', { html: svgSym(t.symbol, ink), style: { background: shade(t.color, .6) } })); }
    } else if (fig.photo && fig.photo.thumb) {
      const img = new Image(); img.alt = ''; img.decoding = 'async'; img.loading = 'lazy'; img.src = fig.photo.thumb; img.referrerPolicy = 'no-referrer';
      img.onerror = mono; inner.className = 'tk-in photo'; inner.append(img);
    } else mono();
    return el;
  };

  /* canvas drawing for export */
  const imgs = new Map();
  P.loadImg = function (url) {
    if (imgs.has(url)) return imgs.get(url);
    const p = new Promise(res => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => res(i); i.onerror = () => res(null); i.src = url; });
    imgs.set(url, p); return p;
  };
  const symPaths = new Map();
  P.drawToken = function (ctx, fig, cx, cy, r, ring, dashed, photoImg) {
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.closePath();
    ctx.save(); ctx.clip();
    if (fig.type === 'fictional') {
      const t = fig.token || { color: '#6B7280', symbol: 'star' };
      const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r); g.addColorStop(0, shade(t.color, 1.15)); g.addColorStop(1, shade(t.color, .72));
      ctx.fillStyle = g; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      const ink = P.inkOn(t.color); ctx.fillStyle = ink; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      if (r >= 14) {
        ctx.font = `600 ${Math.round(r * 0.78)}px Unbounded, Inter, sans-serif`; ctx.fillText(P.initials(fig.name), cx, cy - r * 0.08);
        let path = symPaths.get(t.symbol); if (!path) { path = new Path2D(P.symbolPath(t.symbol)); symPaths.set(t.symbol, path); }
        ctx.save(); ctx.translate(cx + r * 0.2, cy + r * 0.28); const k = r * 0.5 / 24; ctx.scale(k, k); ctx.fillStyle = ink; ctx.globalAlpha = .9; ctx.fill(path, 'evenodd'); ctx.restore();
      } else {
        let path = symPaths.get(t.symbol); if (!path) { path = new Path2D(P.symbolPath(t.symbol)); symPaths.set(t.symbol, path); }
        ctx.save(); ctx.translate(cx - r * 0.6, cy - r * 0.6); const k = r * 1.2 / 24; ctx.scale(k, k); ctx.fill(path, 'evenodd'); ctx.restore();
      }
    } else if (photoImg) {
      const s = Math.min(photoImg.width, photoImg.height); ctx.drawImage(photoImg, (photoImg.width - s) / 2, 0, s, s, cx - r, cy - r, r * 2, r * 2);
    } else {
      ctx.fillStyle = '#1B1F2B'; ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
      ctx.fillStyle = '#F3F4F8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = `600 ${Math.round(r * 0.8)}px Unbounded, Inter, sans-serif`;
      if (r >= 12) ctx.fillText(P.initials(fig.name), cx, cy + 1);
    }
    ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.lineWidth = Math.max(2, r * 0.13); ctx.strokeStyle = ring; if (dashed) ctx.setLineDash([r * 0.38, r * 0.26]); ctx.stroke();
    ctx.restore();
  };
})();
