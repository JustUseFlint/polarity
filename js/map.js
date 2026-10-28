/* The map: 10x10 glass tiles, four-corner blend, tokens + confidence clouds, fan-out, clustering, zoom/pan, table view. */
(function () {
  const P = window.P, h = P.h;
  const ICON = {
    plus: '<path d="M12 5v14M5 12h14" stroke-width="2.2" stroke-linecap="round" fill="none" stroke="currentColor"/>',
    minus: '<path d="M5 12h14" stroke-width="2.2" stroke-linecap="round" fill="none" stroke="currentColor"/>',
    reset: '<path d="M4 12a8 8 0 108-8H8m0 0l3-3M8 4l3 3" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" stroke="currentColor"/>',
    cloud: '<circle cx="12" cy="12" r="3" fill="currentColor"/><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="3 3"/>',
    label: '<rect x="3" y="8" width="18" height="8" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    table: '<path d="M4 6h16M4 12h16M4 18h16M9 4v16" stroke="currentColor" stroke-width="2" stroke-linecap="round" fill="none"/>',
  };
  const ico = k => `<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">${ICON[k]}</svg>`;
  const QNAMES = { tl: 'Authoritarian · Left', tr: 'Authoritarian · Right', bl: 'Libertarian · Left', br: 'Libertarian · Right' };

  P.createMap = function (root, opts) {
    opts = Object.assign({ getItems: () => [], interactive: true, ghosts: [], onToken() { }, onCell() { }, onEra() { }, empty: true, board: null }, opts);
    const M = { opts, root, z: 1, tx: 0, ty: 0, W: 0, clouds: true, labels: 'auto', sel: null, selCell: null, table: false, nodes: [], tokCache: new Map(), cloudCache: new Map(), clCache: new Map(), pending: new Set() };

    /* ---- DOM ---- */
    const tiles = h('div.tiles', { role: 'group', 'aria-label': 'Map tiles: 10 by 10 grid. Arrow keys move between tiles; Enter opens details.' });
    const tileEls = [];
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
      const g = P.cellRange(r, c), reg = P.cells && P.cells.cells ? (P.cells.regions[P.cells.cells[r * 10 + c].region] || {}).name : '';
      const col = P.colorAt((g.econ[0] + g.econ[1]) / 2, (g.social[0] + g.social[1]) / 2, true);
      const t = h('button.tile', { type: 'button', tabindex: r === 4 && c === 4 ? '0' : '-1', style: { '--c': col.map(Math.round).join(' ') }, dataset: { r, c }, 'aria-label': `${P.rangeText(r, c)}${reg ? ', ' + reg : ''}` }, h('i.cnt'));
      tileEls.push(t); tiles.append(t);
    }
    const cloudsL = h('div.clouds'), world = h('div.world', tiles, h('div.axis-h'), h('div.axis-v'), cloudsL);
    const corners = h('div.corners', ['tl', 'tr', 'bl', 'br'].map(k => h('span.q.' + k, QNAMES[k])));
    const leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); leaders.setAttribute('class', 'leaders');
    const toks = h('div.toks');
    const tip = h('div.hover-tip', { 'aria-hidden': 'true' });
    const empty = h('div.empty', h('div.empty-t', 'Put anyone on the map.'), h('div.empty-s', 'Type a name below. See why.'));
    const vp = h('div.vp', world, corners, leaders, toks, opts.empty ? empty : null, tip);
    const frame = h('div.frame', vp);
    const grid = h('div.mapx-grid', h('div.ax.ax-t', h('span', 'Authoritarian')), h('div.ax.ax-l', h('span', 'Economic Left')), frame, h('div.ax.ax-r', h('span', 'Economic Right')), h('div.ax.ax-b', h('span', 'Libertarian')));
    const bar = h('div.mapx-bar', { role: 'toolbar', 'aria-label': 'Map controls' });
    const eraBar = h('div.era-bar', { hidden: true });
    const tableWrap = h('div.table-wrap', { hidden: true });
    const el = h('div.mapx', grid, bar, eraBar, tableWrap);
    root.append(el); M.el = el;

    const btn = (key, label, fn, pressed) => { const b = h('button.mb', { type: 'button', 'aria-label': label, title: label, html: ico(key), onclick: fn }); if (pressed != null) b.setAttribute('aria-pressed', pressed); bar.append(b); return b; };
    btn('minus', 'Zoom out', () => M.zoomBy(1 / 1.5));
    btn('plus', 'Zoom in', () => M.zoomBy(1.5));
    btn('reset', 'Reset view', () => M.reset());
    const bC = btn('cloud', 'Toggle confidence clouds', () => { M.clouds = !M.clouds; bC.setAttribute('aria-pressed', M.clouds); el.classList.toggle('no-clouds', !M.clouds); }, true);
    const bL = btn('label', 'Toggle name labels', () => { M.labels = M.labels === 'auto' ? !M.autoOn : !M.labels; bL.setAttribute('aria-pressed', !!(M.labels === 'auto' ? M.autoOn : M.labels)); applyLabels(); }, false);
    const bT = h('button.mb.mb-txt', { type: 'button', 'aria-pressed': 'false', onclick: () => M.setTable(!M.table) }, h('span', { html: ico('table') }), h('span.mb-l', 'Table view')); bar.append(bT);
    el.classList.add('mtheme-' + (opts.theme || 'default'));

    function applyLabels() { const on = M.labels === 'auto' ? M.autoOn : M.labels; el.classList.toggle('labels-on', !!on); bL.setAttribute('aria-pressed', !!on); }
    M.setTheme = t => { el.className = el.className.replace(/mtheme-\w+/, 'mtheme-' + t); };

    /* ---- sizing and transforms ---- */
    const maxZ = () => (M.items && M.items.length > 60 ? 6 : 4);
    function clampPan() { const W = M.W; M.tx = P.clamp(M.tx, W - W * M.z, 0); M.ty = P.clamp(M.ty, W - W * M.z, 0); if (M.z === 1) { M.tx = 0; M.ty = 0; } }
    function applyTransform() { world.style.transform = `translate(${M.tx}px,${M.ty}px) scale(${M.z})`; vp.style.touchAction = M.z > 1 ? 'none' : 'pan-y'; el.classList.toggle('zoomed', M.z > 1.01); }
    M.zoomAt = function (f, cx, cy, instant) {
      const nz = P.clamp(M.z * f, 1, maxZ()); if (nz === M.z) return; const k = nz / M.z;
      M.tx = cx - (cx - M.tx) * k; M.ty = cy - (cy - M.ty) * k; M.z = nz; clampPan();
      el.classList.toggle('gesture', !!instant); applyTransform(); layout();
    };
    M.zoomBy = f => M.zoomAt(f, M.W / 2, M.W / 2);
    M.reset = () => { M.z = 1; M.tx = M.ty = 0; el.classList.remove('gesture'); applyTransform(); layout(); };
    M.zoomToPoint = function (sx, sy) { const f = Math.min(2.4, maxZ() / M.z); if (f <= 1.01) return; M.zoomAt(f, sx, sy); };

    /* ---- pointer: pan + pinch + drag guard ---- */
    const ptrs = new Map(); let start = null, dragging = false, pinch = null; M.moved = false;
    vp.addEventListener('pointerdown', e => {
      ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (ptrs.size === 1) { start = { x: e.clientX, y: e.clientY, tx: M.tx, ty: M.ty }; dragging = false; M.moved = false; }
      if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), z: M.z }; M.moved = true; }
    });
    vp.addEventListener('pointermove', e => {
      if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const r = vp.getBoundingClientRect();
      if (ptrs.size === 2 && pinch) {
        const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), nz = P.clamp(pinch.z * d / pinch.d, 1, maxZ());
        M.zoomAt(nz / M.z, (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top, true); M.moved = true; return;
      }
      if (ptrs.size === 1 && start && M.z > 1) {
        const dx = e.clientX - start.x, dy = e.clientY - start.y;
        if (!dragging && Math.hypot(dx, dy) > 6) { dragging = true; M.moved = true; try { vp.setPointerCapture(e.pointerId); } catch (_) { } el.classList.add('gesture'); }
        if (dragging) { M.tx = start.tx + dx; M.ty = start.ty + dy; clampPan(); applyTransform(); layout(); }
      } else if (ptrs.size === 1 && start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 8) M.moved = true;
    });
    const up = e => { ptrs.delete(e.pointerId); if (ptrs.size < 2) pinch = null; if (ptrs.size === 0) { start = null; dragging = false; el.classList.remove('gesture'); setTimeout(() => { M.moved = false; }, 0); } };
    vp.addEventListener('pointerup', up); vp.addEventListener('pointercancel', up);
    vp.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); const r = vp.getBoundingClientRect(); M.zoomAt(e.deltaY < 0 ? 1.15 : 1 / 1.15, e.clientX - r.left, e.clientY - r.top, true); }, { passive: false });
    vp.addEventListener('click', e => { if (M.moved && (e.target.closest('.tile') || e.target.closest('.tkw'))) { e.stopPropagation(); e.preventDefault(); } }, true);

    /* ---- tiles ---- */
    tiles.addEventListener('click', e => { const t = e.target.closest('.tile'); if (!t) return; M.selectCell(+t.dataset.r, +t.dataset.c, true); });
    tiles.addEventListener('keydown', e => {
      const t = e.target.closest('.tile'); if (!t) return; let r = +t.dataset.r, c = +t.dataset.c, d = null;
      if (e.key === 'ArrowLeft') d = [0, -1]; else if (e.key === 'ArrowRight') d = [0, 1]; else if (e.key === 'ArrowUp') d = [-1, 0]; else if (e.key === 'ArrowDown') d = [1, 0];
      if (!d) return; e.preventDefault(); r = P.clamp(r + d[0], 0, 9); c = P.clamp(c + d[1], 0, 9); M.focusCell(r, c);
      if (M.selCell) M.selectCell(r, c, true);
    });
    M.focusCell = (r, c) => { tileEls.forEach(t => t.tabIndex = -1); const t = tileEls[r * 10 + c]; t.tabIndex = 0; t.focus({ preventScroll: true }); };
    M.selectCell = function (r, c, emit) {
      M.selCell = { r, c }; tileEls.forEach((t, i) => t.classList.toggle('sel', i === r * 10 + c)); vp.classList.add('has-sel');
      tileEls.forEach(t => t.tabIndex = -1); tileEls[r * 10 + c].tabIndex = 0;
      if (emit !== false) opts.onCell(r, c);
    };
    M.clearCell = function () { M.selCell = null; tileEls.forEach(t => t.classList.remove('sel')); vp.classList.remove('has-sel'); };
    function showTip(t) {
      const r = +t.dataset.r, c = +t.dataset.c, vr = vp.getBoundingClientRect(), tr = t.getBoundingClientRect();
      tip.textContent = P.rangeText(r, c); tip.classList.add('on');
      const w = tip.offsetWidth; let x = tr.left - vr.left + tr.width / 2 - w / 2; x = P.clamp(x, 4, vr.width - w - 4);
      const above = tr.top - vr.top > 40; tip.style.transform = `translate(${x}px, ${above ? tr.top - vr.top - 34 : tr.bottom - vr.top + 6}px)`;
      vp.dataset.q = (r < 5 ? 't' : 'b') + (c < 5 ? 'l' : 'r');
    }
    tiles.addEventListener('pointerover', e => { if (e.pointerType === 'touch') return; const t = e.target.closest('.tile'); if (t) showTip(t); });
    tiles.addEventListener('focusin', e => { const t = e.target.closest('.tile'); if (t) showTip(t); });
    const hideTip = () => { tip.classList.remove('on'); delete vp.dataset.q; };
    vp.addEventListener('pointerleave', hideTip); tiles.addEventListener('focusout', hideTip);

    /* ---- tokens / clouds ---- */
    const world2 = c => ({ wx: (c.x + 10) / 20 * M.W, wy: (10 - c.y) / 20 * M.W });
    const tokSize = n => { const base = M.W < 460 ? 36 : 46; return n > 120 ? 20 : n > 60 ? 24 : n > 30 ? 30 : base; };
    function getTok(it, size) {
      const key = it.fig.id + (size < 28 ? ':t' : ':n') + (it.c.status !== 'placed' || it.c.conf === 'Low' ? 'd' : '');
      let w = M.tokCache.get(it.fig.id);
      if (w && w.key === key) return w.el;
      if (w) w.el.remove();
      const ring = P.rgb(P.colorAt(it.c.x, it.c.y, false));
      const dashed = it.c.status !== 'placed' || it.c.conf === 'Low';
      const tk = P.tokenEl(it.fig, { size, ring, dashed }); tk.style.removeProperty('--sz');
      const b = h('button.tkw', { type: 'button', dataset: { id: it.fig.id }, onclick: () => { if (M.moved) return; M.selectFig(it.fig.id); opts.onToken(it.fig.id); } }, tk, h('span.pill', it.fig.name));
      M.tokCache.set(it.fig.id, { key, el: b }); toks.append(b); return b;
    }
    function cloudFor(it) {
      let c = M.cloudCache.get(it.fig.id);
      if (!c) { c = h('div.cloud'); cloudsL.append(c); M.cloudCache.set(it.fig.id, c); }
      const { wx, wy } = world2(it.c), k = M.W / 20, CAP = 5.2, rx = Math.min(it.c.rx, it.c.rx > 9 || it.c.ry > 9 ? 7.5 : CAP) * k, ry = Math.min(it.c.ry, it.c.rx > 9 || it.c.ry > 9 ? 7.5 : CAP) * k, col = P.colorAt(it.c.x, it.c.y, false), ar = Math.max(rx, ry) / k, crowd = M.items.length > 100 ? .45 : M.items.length > 40 ? .7 : 1, fade = P.clamp(3.4 / ar, .4, 1) * crowd;
      c.style.cssText = `left:${wx - rx}px;top:${wy - ry}px;width:${rx * 2}px;height:${ry * 2}px;--cc:${col.map(Math.round).join(',')};--ca:${((it.c.conf === 'High' ? .5 : it.c.conf === 'Medium' ? .42 : .36) * fade).toFixed(3)}`;
      c.classList.toggle('arriving', M.pending.has(it.fig.id));
      return c;
    }
    function ghostEls() {
      toks.querySelectorAll('.ghost').forEach(g => g.remove());
      if (M.items.length || !opts.ghosts.length) return;
      opts.ghosts.forEach(f => {
        const c = P.computeEra(f); const { wx, wy } = world2(c);
        const tk = P.tokenEl(f, { size: tokSize(0), ring: P.rgb(P.colorAt(c.x, c.y, false)), faint: true }); tk.style.removeProperty('--sz');
        const g = h('div.tkw.ghost', { 'aria-hidden': 'true', style: { transform: `translate(${M.tx + M.z * wx}px,${M.ty + M.z * wy}px) translate(-50%,-50%)`, '--sz': tokSize(0) + 'px' } }, tk);
        toks.append(g);
      });
    }

    function layout(o) {
      o = o || {};
      M.W = vp.clientWidth; if (!M.W) return;
      const items = M.items = opts.getItems();
      const n = items.length, size = tokSize(n); M.size = size;
      el.style.setProperty('--sz', size + 'px'); el.style.setProperty('--tile-r', Math.max(5, M.W / 62) + 'px');
      M.autoOn = n > 0 && n <= 6; applyLabels();
      empty && (empty.hidden = n > 0);
      // drop elements for removed figures
      const ids = new Set(items.map(i => i.fig.id));
      for (const [id, w] of M.tokCache) if (!ids.has(id)) { w.el.remove(); M.tokCache.delete(id); }
      for (const [id, c] of M.cloudCache) if (!ids.has(id)) { c.remove(); M.cloudCache.delete(id); }
      // base nodes
      let nodes = items.map(it => {
        const { wx, wy } = world2(it.c); return { it, id: it.fig.id, tx: M.tx + M.z * wx, ty: M.ty + M.z * wy, r: size / 2, n: 1 };
      });
      nodes.forEach(nd => { nd.x = nd.tx; nd.y = nd.ty; });
      // clustering when crowded and zoomed out
      const cluster = n > 40 && M.z < maxZ() - 0.01;
      let cl = [];
      if (cluster) {
        const used = new Set(), thr = size * 1.05, singles = [];
        const vis = nodes.filter(nd => nd.tx > -size && nd.tx < M.W + size && nd.ty > -size && nd.ty < M.W + size);
        const off = nodes.filter(nd => !vis.includes(nd));
        vis.forEach((a, i) => {
          if (used.has(a.id)) return; const grp = [a]; used.add(a.id);
          vis.forEach(b => { if (!used.has(b.id) && Math.hypot(a.tx - b.tx, a.ty - b.ty) < thr) { grp.push(b); used.add(b.id); } });
          if (grp.length === 1) singles.push(a); else {
            const cx = P.mean(grp.map(g => g.tx)), cy = P.mean(grp.map(g => g.ty));
            cl.push({ cluster: true, members: grp, id: 'c:' + grp.map(g => g.id).sort().join(',').slice(0, 80) + grp.length, tx: cx, ty: cy, x: cx, y: cy, r: size * 0.62, n: grp.length });
          }
        });
        nodes = singles.concat(cl, off);
      }
      // fan-out spread
      const act = nodes.filter(nd => nd.tx > -size * 2 && nd.tx < M.W + size * 2 && nd.ty > -size * 2 && nd.ty < M.W + size * 2);
      act.forEach(nd => { if (!nd.cluster) { /* deterministic nudge so identical points separate */ } });
      for (let it2 = 0; it2 < 40; it2++) {
        let moved = false;
        for (let i = 0; i < act.length; i++) for (let j = i + 1; j < act.length; j++) {
          const a = act[i], b = act[j]; let dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy); const min = a.r + b.r + 3;
          if (d < min) {
            if (d < 0.01) { const ang = (P.hash(a.id + b.id) % 628) / 100; dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
            const push = (min - d) / 2 + 0.2; const ux = dx / d, uy = dy / d;
            a.x -= ux * push; a.y -= uy * push; b.x += ux * push; b.y += uy * push; moved = true;
          }
        }
        act.forEach(nd => { const mx = nd.x - nd.tx, my = nd.y - nd.ty, md = Math.hypot(mx, my), lim = size * 3.4; if (md > lim) { nd.x = nd.tx + mx / md * lim; nd.y = nd.ty + my / md * lim; } nd.x = P.clamp(nd.x, nd.r + 1, M.W - nd.r - 1); nd.y = P.clamp(nd.y, nd.r + 1, M.W - nd.r - 1); });
        if (!moved) break;
      }
      M.nodes = nodes;
      // render singles
      const shown = new Set(), clShown = new Set(); let lines = '';
      items.forEach(it => { const w = getTok(it, size); w.dataset.id = it.fig.id; cloudFor(it); });
      nodes.forEach(nd => {
        if (nd.cluster) {
          clShown.add(nd.id); let w = M.clCache.get(nd.id);
          if (!w) { w = h('button.tkw.cl', { type: 'button', 'aria-label': 'Cluster of figures. Zoom in to expand.', onclick: () => { if (M.moved) return; if (M.z >= maxZ() - 0.01) return; M.zoomToPoint(w._nx, w._ny); } }, h('span.cl-n')); toks.append(w); M.clCache.set(nd.id, w); }
          w._nx = nd.x; w._ny = nd.y; w.setAttribute('aria-label', `${nd.n} figures here. Tap to zoom in and expand.`);
          w.firstChild.textContent = nd.n; w.style.setProperty('--sz', (size * 1.2) + 'px'); w.style.transform = `translate(${nd.x}px,${nd.y}px) translate(-50%,-50%)`; w.classList.remove('hid');
          const cols = nd.members.slice(0, 3).map(m => P.rgb(P.colorAt(m.it.c.x, m.it.c.y, false))); w.style.setProperty('--rc', cols[0]);
          nd.members.forEach(m => { /* members hidden */ });
          return;
        }
        shown.add(nd.id);
        const w = M.tokCache.get(nd.id).el; w.classList.remove('hid');
        w.style.transform = `translate(${nd.x}px,${nd.y}px) translate(-50%,-50%)`; w.style.setProperty('--sz', size + 'px');
        w.classList.toggle('arriving', M.pending.has(nd.id));
        const it = nd.it; w.setAttribute('aria-label', `${it.fig.name}. ${P.coordText(it.c.x, it.c.y)}. Confidence ${it.c.conf}. ${P.typeLabel(it.fig.type)}. Press to open profile.`);
        w.classList.toggle('sel', M.sel === nd.id);
        const d = Math.hypot(nd.x - nd.tx, nd.y - nd.ty);
        if (d > size * 0.45) lines += `<line x1="${nd.tx.toFixed(1)}" y1="${nd.ty.toFixed(1)}" x2="${nd.x.toFixed(1)}" y2="${nd.y.toFixed(1)}"/><circle cx="${nd.tx.toFixed(1)}" cy="${nd.ty.toFixed(1)}" r="2.2"/>`;
        w.style.zIndex = M.sel === nd.id ? 50 : '';
      });
      nodes.forEach(nd => { if (nd.cluster) nd.members.forEach(m => { const w = M.tokCache.get(m.id); if (w) w.el.classList.add('hid'); }); });
      for (const [id, w] of M.tokCache) if (!shown.has(id) && !nodes.some(nd => nd.cluster && nd.members.some(m => m.id === id))) w.el.classList.add('hid');
      for (const [id, w] of M.clCache) if (!clShown.has(id)) { w.remove(); M.clCache.delete(id); }
      // declutter name pills: hide a pill if it would sit on another token or pill (selected/hovered/focused always show)
      { const boxes = [], singles = nodes.filter(nd => !nd.cluster), clu = nodes.filter(nd => nd.cluster);
        const order = singles.slice().sort((a, b) => (M.sel === b.id) - (M.sel === a.id));
        const hit = (a, b) => a.x0 < b.x1 && a.x1 > b.x0 && a.y0 < b.y1 && a.y1 > b.y0;
        const toks_ = singles.map(nd => ({ id: nd.id, x0: nd.x - size / 2, x1: nd.x + size / 2, y0: nd.y - size / 2, y1: nd.y + size / 2 })).concat(clu.map(nd => ({ id: nd.id, x0: nd.x - size * .6, x1: nd.x + size * .6, y0: nd.y - size * .6, y1: nd.y + size * .6 })));
        order.forEach(nd => {
          const w = M.tokCache.get(nd.id).el, pl = w.lastChild, bw = Math.min(180, nd.it.fig.name.length * 6.8 + 24);
          const b = { x0: nd.x - bw / 2, x1: nd.x + bw / 2, y0: nd.y + size / 2 + 4, y1: nd.y + size / 2 + 28 };
          const bad = toks_.some(t => t.id !== nd.id && hit(b, t)) || boxes.some(o => hit(b, o)) || b.x0 < 0 || b.x1 > M.W;
          pl.classList.toggle('nolbl', bad && M.sel !== nd.id); if (!bad) boxes.push(b);
        }); }
      leaders.innerHTML = lines + (M._trail || '');
      // tile counts
      const counts = new Array(100).fill(0);
      items.forEach(it => { const g = P.cellOf(it.c.x, it.c.y); counts[g.r * 10 + g.c]++; });
      tileEls.forEach((t, i) => { const b = t.firstChild; const v = counts[i]; if (b._v !== v) { b._v = v; b.textContent = v || ''; t.classList.toggle('has', v > 0); } });
      ghostEls();
      if (M.table) buildTable();
    }
    M.layout = layout;
    M.refresh = function () { layout(); updateEra(); };

    M.selectFig = function (id) { M.sel = id; toks.querySelectorAll('.tkw').forEach(w => w.classList.toggle('sel', w.dataset.id === id)); updateEra(); const w = M.tokCache.get(id); if (w) w.el.style.zIndex = 50; };
    M.deselect = () => { M.sel = null; toks.querySelectorAll('.tkw.sel').forEach(w => w.classList.remove('sel')); updateEra(); };

    /* ---- era switch ---- */
    function updateEra() {
      eraBar.innerHTML = '';
      const it = (M.items || []).find(i => i.fig.id === M.sel);
      if (!it || it.fig.eras.length < 2) { eraBar.hidden = true; return; }
      eraBar.hidden = false;
      eraBar.append(h('span.era-l', 'Era for ' + it.fig.name), h('div.seg', { role: 'group', 'aria-label': 'Era' }, it.fig.eras.map((e, i) => h('button', { type: 'button', 'aria-pressed': i === it.era, onclick: () => M.setEra(it.fig.id, i) }, e.label))));
    }
    M.setEra = function (id, idx) {
      const bi = opts.board && opts.board.items.find(i => i.id === id); const it = M.items.find(i => i.fig.id === id); if (!it || it.era === idx) return;
      const from = it.c, to = P.computeEra(it.fig, idx);
      if (bi) { bi.era = idx; if (opts.board === P.board) P.saveDraft(); }
      M.eraOverride = M.eraOverride || {}; // for boards without a persistent model
      const a = world2(from), b = world2(to);
      layout();
      if (!P.reduced()) {
        const x1 = M.tx + M.z * a.wx, y1 = M.ty + M.z * a.wy, x2 = M.tx + M.z * b.wx, y2 = M.ty + M.z * b.wy;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path'); path.setAttribute('class', 'trail'); path.setAttribute('d', `M${x1} ${y1} L${x2} ${y2}`);
        leaders.append(path); path.animate([{ strokeDashoffset: 40, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: .6 }, { opacity: 0 }], { duration: 1600, easing: 'ease-out' }).onfinish = () => path.remove();
      }
      opts.onEra(id, idx); updateEra();
    };

    /* ---- placement flight ---- */
    M.addAnimated = function (id, fromRect) {
      return new Promise(res => {
        const fig = P.getFig(id);
        if (P.reduced() || !fromRect) { layout(); return res(); }
        M.pending.add(id); layout();
        const nd = M.nodes.find(n => n.id === id || (n.cluster && n.members.some(m => m.id === id))); const vr = vp.getBoundingClientRect();
        if (!nd) { M.pending.delete(id); layout(); return res(); }
        const x0 = fromRect.left + fromRect.width / 2, y0 = fromRect.top + fromRect.height / 2, x1 = vr.left + nd.x, y1 = vr.top + nd.y;
        const cx = (x0 + x1) / 2, cy = Math.min(y0, y1) - Math.max(80, Math.abs(x1 - x0) * 0.25);
        const it = M.items.find(i => i.fig.id === id);
        const tk = P.tokenEl(fig, { size: M.size, ring: P.rgb(P.colorAt(it.c.x, it.c.y, false)), dashed: it.c.conf === 'Low' }); tk.style.setProperty('--sz', M.size + 'px');
        const fl = h('div.flyer', tk); document.body.append(fl);
        const arc = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); arc.setAttribute('class', 'arc-svg');
        const pth = document.createElementNS('http://www.w3.org/2000/svg', 'path'); pth.setAttribute('d', `M${x0} ${y0} Q${cx} ${cy} ${x1} ${y1}`); arc.append(pth); document.body.append(arc);
        const len = pth.getTotalLength(); pth.style.strokeDasharray = len;
        const dur = 850; pth.animate([{ strokeDashoffset: len, opacity: 1 }, { strokeDashoffset: 0, opacity: 1, offset: .75 }, { strokeDashoffset: 0, opacity: 0 }], { duration: dur + 350, easing: 'ease-in-out' }).onfinish = () => arc.remove();
        const kf = []; for (let i = 0; i <= 24; i++) { const t = i / 24, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t; kf.push({ transform: `translate(${a * x0 + b * cx + c * x1}px,${a * y0 + b * cy + c * y1}px) translate(-50%,-50%) scale(${.7 + .3 * Math.sin(Math.PI * t) + .1})`, offset: t }); }
        const an = fl.animate(kf, { duration: dur, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' });
        an.onfinish = () => { fl.remove(); M.pending.delete(id); const w = M.tokCache.get(id); if (w) { w.el.classList.remove('arriving'); w.el.classList.add('landed'); setTimeout(() => w.el.classList.remove('landed'), 700); } const c = M.cloudCache.get(id); if (c) { c.classList.remove('arriving'); c.classList.add('bloom'); setTimeout(() => c.classList.remove('bloom'), 1200); } res(); };
      });
    };

    /* ---- table view ---- */
    function buildTable() {
      tableWrap.innerHTML = '';
      const rows = (M.items || []).map(it => h('tr', h('th', { scope: 'row' }, h('button.link', { type: 'button', onclick: () => opts.onToken(it.fig.id) }, it.fig.name)), h('td', P.typeLabel(it.fig.type)), h('td.mono', P.coordText(it.c.x, it.c.y)), h('td', it.c.conf + (it.c.status === 'estimate' ? ' (estimate)' : ''))));
      tableWrap.append(h('table.dt', h('caption', 'Figures on this map: name, type, coordinates, confidence'), h('thead', h('tr', ['Name', 'Type', 'Coordinates', 'Confidence'].map(x => h('th', { scope: 'col' }, x)))), h('tbody', rows.length ? rows : h('tr', h('td', { colspan: 4 }, 'No figures yet. Type names below to place some.')))));
    }
    M.setTable = function (on) {
      M.table = on; bT.setAttribute('aria-pressed', on); bT.querySelector('.mb-l').textContent = on ? 'Map view' : 'Table view';
      grid.hidden = on; tableWrap.hidden = !on; if (on) buildTable(); else layout();
    };

    /* ---- lifecycle ---- */
    const ro = new ResizeObserver(() => { clampPan(); applyTransform(); layout(); }); ro.observe(vp);
    M.destroy = () => { ro.disconnect(); el.remove(); };
    applyTransform(); setTimeout(() => layout(), 0);
    return M;
  };
})();
