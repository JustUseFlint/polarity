/* Share + image export (canvas): Square / Vertical / Wide, small watermark. Video is shown as Pro / coming soon. */
(function () {
  const P = window.P, h = P.h;
  const FORMATS = { square: { w: 1080, h: 1080, label: 'Square' }, vertical: { w: 1080, h: 1920, label: 'Vertical' }, wide: { w: 1920, h: 1080, label: 'Wide' } };
  const THEMES = {
    dark: { bg: '#0B0D12', panel: '#151821', text: '#F3F4F8', mist: '#9AA0B2', tile: .74, line: 'rgba(255,255,255,.5)', glow: '#8B7CFF' },
    light: { bg: '#F7F7FA', panel: '#FFFFFF', text: '#12141B', mist: '#5B6173', tile: .88, line: 'rgba(30,32,50,.55)', glow: '#6A5BE0' },
    neon: { bg: '#05060A', panel: '#0C0E16', text: '#F3F4F8', mist: '#9AA0B2', tile: .95, line: 'rgba(255,255,255,.9)', glow: '#9CFFF0' },
    paper: { bg: '#F1E9D8', panel: '#F8F2E4', text: '#2A2418', mist: '#6B5F47', tile: .6, line: 'rgba(60,45,20,.5)', glow: '#B08A3E' },
  };
  P.resolveTheme = function (bt) { if (bt === 'neon' || bt === 'paper' || bt === 'light') return bt; return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'; };
  const rr = (ctx, x, y, w, h2, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h2, r); ctx.arcTo(x + w, y + h2, x, y + h2, r); ctx.arcTo(x, y + h2, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };

  P.renderBoardCanvas = async function (board, fmtKey, themeKey) {
    const f = FORMATS[fmtKey], T = THEMES[P.resolveTheme(themeKey || board.theme)];
    const cv = document.createElement('canvas'); cv.width = f.w; cv.height = f.h; const ctx = cv.getContext('2d');
    try { await Promise.all([document.fonts.load('600 40px Unbounded'), document.fonts.load('500 24px "JetBrains Mono"'), document.fonts.load('500 24px Inter')]); } catch (e) { }
    ctx.fillStyle = T.bg; ctx.fillRect(0, 0, f.w, f.h);
    const items = P.boardFigs(board);
    // layout
    const pad = 56; let mx, my, ms;
    if (fmtKey === 'wide') { ms = f.h - 230; mx = pad + 40; my = 100; }
    else if (fmtKey === 'vertical') { ms = f.w - pad * 2 - 70; mx = pad + 35; my = 360; }
    else { ms = f.h - 360; mx = (f.w - ms) / 2; my = 200; }
    // title
    ctx.fillStyle = T.text; ctx.textBaseline = 'alphabetic'; ctx.textAlign = fmtKey === 'wide' ? 'left' : 'center';
    ctx.font = '600 ' + (fmtKey === 'vertical' ? 64 : 48) + 'px Unbounded, Inter, sans-serif';
    const title = board.title || 'Untitled board'; const colX = mx + ms + 90, tx = fmtKey === 'wide' ? colX : f.w / 2; let ty = fmtKey === 'vertical' ? 200 : fmtKey === 'wide' ? 150 : 96;
    ctx.fillText(title.length > (fmtKey === 'wide' ? 22 : 30) ? title.slice(0, fmtKey === 'wide' ? 21 : 29) + '…' : title, tx, ty);
    ctx.fillStyle = T.mist; ctx.font = '500 26px Inter, sans-serif';
    ctx.fillText(P.boardFigs(board).length + (P.boardFigs(board).length === 1 ? ' figure' : ' figures') + ' · see why at Polarity', tx, ty + 44);
    // map tiles
    const gap = ms * 0.0125, ts = (ms - gap * 9) / 10, r = ts * 0.22;
    ctx.save(); ctx.shadowColor = T.glow + '55'; ctx.shadowBlur = 50; ctx.fillStyle = 'rgba(0,0,0,0)'; rr(ctx, mx, my, ms, ms, r); ctx.fill(); ctx.restore();
    for (let rI = 0; rI < 10; rI++) for (let c = 0; c < 10; c++) {
      const g = P.cellRange(rI, c), col = P.colorAt((g.econ[0] + g.econ[1]) / 2, (g.social[0] + g.social[1]) / 2, true), x = mx + c * (ts + gap), y = my + rI * (ts + gap);
      ctx.fillStyle = P.rgb(col, T.tile); rr(ctx, x, y, ts, ts, r); ctx.fill();
      const gr = ctx.createLinearGradient(x, y, x + ts * .8, y + ts * .9); gr.addColorStop(0, 'rgba(255,255,255,.3)'); gr.addColorStop(.45, 'rgba(255,255,255,0)'); ctx.fillStyle = gr; rr(ctx, x, y, ts, ts, r); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 1.5; rr(ctx, x + .5, y + .5, ts - 1, ts - 1, r); ctx.stroke();
    }
    // axes
    ctx.save(); ctx.strokeStyle = T.line; ctx.shadowColor = T.glow; ctx.shadowBlur = 14; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(mx + ms / 2, my); ctx.lineTo(mx + ms / 2, my + ms); ctx.moveTo(mx, my + ms / 2); ctx.lineTo(mx + ms, my + ms / 2); ctx.stroke(); ctx.restore();
    // axis labels
    ctx.fillStyle = T.mist; ctx.font = '600 22px Inter, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('AUTHORITARIAN', mx + ms / 2, my - 16); ctx.fillText('LIBERTARIAN', mx + ms / 2, my + ms + 34);
    ctx.save(); ctx.translate(mx - 18, my + ms / 2); ctx.rotate(-Math.PI / 2); ctx.fillText('ECONOMIC LEFT', 0, 0); ctx.restore();
    ctx.save(); ctx.translate(mx + ms + 28, my + ms / 2); ctx.rotate(Math.PI / 2); ctx.fillText('ECONOMIC RIGHT', 0, 0); ctx.restore();
    // clouds
    const k = ms / 20, n = items.length;
    items.forEach(it => { const px = mx + (it.c.x + 10) * k, py = my + (10 - it.c.y) * k, rx = Math.min(it.c.rx, 5.5) * k, ry = Math.min(it.c.ry, 5.5) * k, col = P.colorAt(it.c.x, it.c.y, false);
      ctx.save(); ctx.translate(px, py); ctx.scale(1, ry / rx); const g = ctx.createRadialGradient(0, 0, 0, 0, 0, rx); g.addColorStop(0, P.rgb(col, n > 40 ? .22 : .5)); g.addColorStop(1, P.rgb(col, 0)); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, rx, 0, 7); ctx.fill(); ctx.restore(); });
    // tokens with fan-out
    const size = n > 120 ? 22 : n > 60 ? 30 : n > 30 ? 40 : 60, rad = size / 2;
    const nodes = items.map(it => ({ it, tx: mx + (it.c.x + 10) * k, ty: my + (10 - it.c.y) * k })); nodes.forEach(nd => { nd.x = nd.tx; nd.y = nd.ty; });
    for (let i2 = 0; i2 < 50; i2++) { let mv = false; for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) { const a = nodes[i], b = nodes[j]; let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); const min = size + 4; if (d < min) { if (d < .01) { const ang = (P.hash(a.it.fig.id + b.it.fig.id) % 628) / 100; dx = Math.cos(ang); dy = Math.sin(ang); d = 1; } const p = (min - d) / 2 + .2; a.x -= dx / d * p; a.y -= dy / d * p; b.x += dx / d * p; b.y += dy / d * p; mv = true; } } nodes.forEach(nd => { nd.x = P.clamp(nd.x, mx + rad, mx + ms - rad); nd.y = P.clamp(nd.y, my + rad, my + ms - rad); }); if (!mv) break; }
    ctx.strokeStyle = T.mist; ctx.lineWidth = 1.5;
    nodes.forEach(nd => { if (Math.hypot(nd.x - nd.tx, nd.y - nd.ty) > rad * .5) { ctx.beginPath(); ctx.moveTo(nd.tx, nd.ty); ctx.lineTo(nd.x, nd.y); ctx.stroke(); ctx.beginPath(); ctx.arc(nd.tx, nd.ty, 3, 0, 7); ctx.fillStyle = T.mist; ctx.fill(); } });
    const imgsP = await Promise.all(nodes.map(nd => nd.it.fig.photo && nd.it.fig.type !== 'fictional' ? P.loadImg(nd.it.fig.photo.thumb) : null));
    nodes.forEach((nd, i) => { const it = nd.it; P.drawToken(ctx, it.fig, nd.x, nd.y, rad, P.rgb(P.colorAt(it.c.x, it.c.y, false)), it.c.conf === 'Low', imgsP[i]); });
    if (n <= 14) {
      ctx.font = '600 ' + (n > 8 ? 20 : 24) + 'px Inter, sans-serif'; ctx.textAlign = 'center';
      nodes.forEach(nd => { const t = nd.it.fig.name, w = ctx.measureText(t).width + 22, y = nd.y + rad + 8; ctx.fillStyle = T.panel + 'EE'; rr(ctx, nd.x - w / 2, y, w, 34, 17); ctx.fill(); ctx.fillStyle = T.text; ctx.textBaseline = 'middle'; ctx.fillText(t, nd.x, y + 18); ctx.textBaseline = 'alphabetic'; });
    }
    // side list for wide
    if (fmtKey === 'wide') {
      let y = 290; const x = mx + ms + 90; ctx.textAlign = 'left'; ctx.fillStyle = T.mist; ctx.font = '600 22px Inter'; ctx.fillText('FIGURES', x, y - 20);
      items.slice(0, 9).forEach(it => { ctx.fillStyle = T.text; ctx.font = '600 28px Inter'; ctx.fillText(it.fig.name.slice(0, 26), x, y + 14); ctx.fillStyle = T.mist; ctx.font = '500 22px "JetBrains Mono", monospace'; ctx.fillText(P.coordText(it.c.x, it.c.y) + ' · ' + it.c.conf, x, y + 46); y += 76; });
      if (items.length > 9) { ctx.fillStyle = T.mist; ctx.font = '500 24px Inter'; ctx.fillText('+' + (items.length - 9) + ' more', x, y + 10); }
    }
    // watermark / logo
    const wmx = fmtKey === 'wide' ? colX : f.w / 2, wmy = f.h - 50;
    ctx.textAlign = fmtKey === 'wide' ? 'left' : 'center'; ctx.fillStyle = T.mist; ctx.font = '600 26px Unbounded, Inter, sans-serif';
    const lx = fmtKey === 'wide' ? wmx + 38 : wmx + 20; ctx.fillText('Polarity', lx - (fmtKey === 'wide' ? 0 : 0), wmy);
    const lw = ctx.measureText('Polarity').width, ox = fmtKey === 'wide' ? wmx : wmx - lw / 2 - 18;
    [[0, 0, '#F2545B'], [0, 1, '#2EC4B6'], [1, 1, '#F9A620']].forEach(([a, b, col]) => { ctx.fillStyle = col; rr(ctx, ox + a * 14, wmy - 26 + b * 14 + 0, 12, 12, 3); ctx.fill(); });
    ctx.fillStyle = '#5465FF'; rr(ctx, ox + 14, wmy - 31, 12, 12, 3); ctx.fill();
    ctx.fillStyle = T.mist; ctx.font = '500 20px Inter'; ctx.fillText('Put anyone on the map. See why.', fmtKey === 'wide' ? lx + lw + 20 : wmx, wmy + (fmtKey === 'wide' ? 0 : 34));
    return cv;
  };

  P.openShare = function (board, tab) {
    let fmt = tab || 'square'; const prev = h('div.exp-prev'); const tabs = h('div.seg.exp-tabs', { role: 'tablist' });
    const dl = h('button.btn.primary', { type: 'button' }, 'Download PNG');
    const link = P.boardLink(board);
    const body = h('div.exp', h('div.exp-note', 'Free exports carry a small Polarity watermark. Pro removes it (plan concept; no payments here).'), tabs, prev,
      h('div.exp-b', dl, h('button.btn', { type: 'button', onclick: async () => { if (navigator.share) { try { await navigator.share({ title: board.title, url: link }); return; } catch (e) { if (e.name === 'AbortError') return; } } try { await navigator.clipboard.writeText(link); P.toast('Board link copied.'); } catch (e) { prompt('Copy this link', link); } } }, 'Share link')),
      h('label.linkf', 'Board link (works on any device; it carries the figures and title)', h('input', { readonly: true, value: link, onfocus: e => e.target.select() })),
      h('p.muted.small', 'The preview image for links is not generated in this static build; share the PNG or the link.'));
    const draw = async () => {
      prev.replaceChildren(h('div.muted', 'Rendering…'));
      const cv = await P.renderBoardCanvas(board, fmt); cv.className = 'exp-cv'; cv.setAttribute('role', 'img'); cv.setAttribute('aria-label', 'Preview of the board image'); prev.replaceChildren(cv); dl.onclick = () => {
        cv.toBlob(b => { const a = h('a', { href: URL.createObjectURL(b), download: (board.title || 'polarity').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '-' + fmt + '.png' }); document.body.append(a); a.click(); a.remove(); P.logExport({ title: board.title, format: fmt, n: board.items.length }); P.toast('Image saved.'); }, 'image/png');
      };
    };
    const mkTabs = () => { tabs.replaceChildren(...Object.entries(FORMATS).map(([k, v]) => h('button', { type: 'button', role: 'tab', 'aria-selected': k === fmt, 'aria-pressed': k === fmt, onclick: () => { fmt = k; mkTabs(); draw(); } }, v.label)), h('button', { type: 'button', disabled: true, title: 'Video export is a Pro feature (coming soon)' }, 'Video · Pro soon')); };
    mkTabs(); P.openModal('Share & export', body, { wide: true }); draw();
  };
})();
