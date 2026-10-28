/* Side panel (cell panel + profile drawer), mini maps, modal. */
(function () {
  const P = window.P, h = P.h;
  const side = () => P.$('#side');

  /* ---------- mini map (static svg) ---------- */
  let tilesSvg = null, uid = 0;
  function tileMarkup() {
    if (tilesSvg) return tilesSvg; let s = '';
    for (let r = 0; r < 10; r++) for (let c = 0; c < 10; c++) {
      const g = P.cellRange(r, c), col = P.colorAt((g.econ[0] + g.econ[1]) / 2, (g.social[0] + g.social[1]) / 2, true);
      s += `<rect x="${c * 10 + .9}" y="${r * 10 + .9}" width="8.2" height="8.2" rx="2.2" fill="${P.rgb(col, .78)}"/>`;
    }
    return (tilesSvg = s);
  }
  /** items: [{fig,c}], opts: {focus: figId, cloud: bool, dots: bool} */
  P.miniMap = function (items, o) {
    o = o || {}; const id = 'mm' + (++uid); let defs = '', body = '';
    items.forEach((it, i) => {
      const c = it.c, cx = (c.x + 10) / 20 * 100, cy = (10 - c.y) / 20 * 100, col = P.colorAt(c.x, c.y, false), foc = o.focus === it.fig.id;
      if (o.cloud !== false && (foc || items.length <= 12)) {
        defs += `<radialGradient id="${id}g${i}"><stop offset="0" stop-color="${P.rgb(col, foc ? .75 : .5)}"/><stop offset="1" stop-color="${P.rgb(col, 0)}"/></radialGradient>`;
        body += `<ellipse cx="${cx}" cy="${cy}" rx="${Math.min(c.rx, 8) * 5}" ry="${Math.min(c.ry, 8) * 5}" fill="url(#${id}g${i})"/>`;
      }
    });
    items.forEach(it => {
      const c = it.c, cx = (c.x + 10) / 20 * 100, cy = (10 - c.y) / 20 * 100, foc = o.focus === it.fig.id, col = P.colorAt(c.x, c.y, false);
      const fill = it.fig.type === 'fictional' && it.fig.token ? it.fig.token.color : '#1B1F2B';
      body += `<circle cx="${cx}" cy="${cy}" r="${foc ? 5.2 : (items.length > 12 ? 1.9 : 3.2)}" fill="${fill}" stroke="${P.rgb(col)}" stroke-width="${foc ? 1.8 : 1.1}" ${c.conf === 'Low' ? 'stroke-dasharray="2 1.4"' : ''}/>`;
      if (foc || items.length <= 6) body += `<text x="${cx}" y="${cy + (foc ? 1.8 : 1.3)}" text-anchor="middle" font-size="${foc ? 5 : 3.6}" font-weight="600" fill="${P.inkOn(fill)}" font-family="Unbounded,Inter,sans-serif">${P.esc(P.initials(it.fig.name))}</text>`;
    });
    const svg = `<svg viewBox="0 0 100 100" class="mini" role="img" aria-label="${P.esc(o.label || 'Mini map')}"><defs>${defs}</defs>${tileMarkup()}<path d="M50 0V100M0 50H100" stroke="#fff" stroke-opacity=".5" stroke-width=".5"/>${body}</svg>`;
    const d = document.createElement('div'); d.className = 'mini-wrap'; d.innerHTML = svg; return d;
  };

  /* ---------- side panel shell ---------- */
  const S = P.side = { kind: null, state: 'half' };
  const mq = window.matchMedia('(min-width: 1000px)');
  function setSheet(state) { S.state = state; const el = side(); el.dataset.snap = state; el.style.removeProperty('--sheet-y'); }
  S.open = function (kind, title, body, o) {
    o = o || {}; const el = side(); const was = S.kind;
    S.kind = kind; S.onClose = o.onClose; S.opener = o.opener || document.activeElement;
    el.innerHTML = '';
    const handle = h('div.sp-handle', { 'aria-hidden': 'true' }, h('span'));
    const close = h('button.icon-btn.sp-close', { type: 'button', 'aria-label': 'Close panel', onclick: () => S.close(), html: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' });
    const head = h('div.sp-head', h('div.sp-title', title), close);
    const bodyEl = h('div.sp-body', body);
    el.append(h('div.sp-drag', handle, head), bodyEl);
    el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', typeof title === 'string' ? title : 'Details'); el.setAttribute('aria-hidden', 'false');
    el.classList.add('open'); document.body.classList.add('has-panel');
    if (!was) setSheet(o.snap || 'half'); else if (o.snap) setSheet(o.snap);
    bindDrag(el.querySelector('.sp-drag'));
    if (o.scrollTop !== false) bodyEl.scrollTop = 0;
    if (o.focus !== false) setTimeout(() => close.focus({ preventScroll: true }), 30);
    P.emit('panel', kind);
  };
  S.close = function (silent) {
    const el = side(); if (!S.kind) return; el.classList.remove('open'); el.setAttribute('aria-hidden', 'true'); document.body.classList.remove('has-panel');
    const k = S.kind, cb = S.onClose, op = S.opener; S.kind = null; S.onClose = null;
    if (!silent && cb) cb(k); if (op && op.focus && document.contains(op) && !silent) { try { op.focus({ preventScroll: true }); } catch (e) { } }
    P.emit('panel', null);
  };
  function bindDrag(dragEl) {
    let y0 = null, base = 0, vh = innerHeight;
    dragEl.addEventListener('pointerdown', e => { if (mq.matches || e.target.closest('button')) return; y0 = e.clientY; vh = innerHeight; base = S.state === 'half' ? vh * .46 : 0; dragEl.setPointerCapture(e.pointerId); side().classList.add('dragging'); });
    dragEl.addEventListener('pointermove', e => { if (y0 == null) return; const dy = P.clamp(base + e.clientY - y0, 0, vh); side().style.setProperty('--sheet-y', dy + 'px'); });
    const end = e => {
      if (y0 == null) return; const dy = base + e.clientY - y0; side().classList.remove('dragging'); y0 = null;
      if (dy > vh * .72) { S.close(); return; }
      setSheet(dy > vh * .23 ? 'half' : 'full');
    };
    dragEl.addEventListener('pointerup', end); dragEl.addEventListener('pointercancel', end);
    dragEl.addEventListener('click', e => { if (e.target.closest('.sp-handle') && !mq.matches) setSheet(S.state === 'half' ? 'full' : 'half'); });
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (!P.$('#modal').hidden) P.closeModal(); else if (S.kind) { S.close(); P.emit('escape'); } } });

  /* ---------- modal ---------- */
  P.openModal = function (title, node, o) {
    const m = P.$('#modal'); m._opener = document.activeElement; m.hidden = false; m.innerHTML = '';
    const close = h('button.icon-btn', { type: 'button', 'aria-label': 'Close', onclick: () => P.closeModal(), html: '<svg viewBox="0 0 24 24" width="22" height="22"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>' });
    m.append(h('div.modal-back', { onclick: () => P.closeModal() }), h('div.modal-card' + ((o && o.wide) ? '.wide' : ''), { role: 'dialog', 'aria-modal': 'true', 'aria-label': title }, h('div.modal-head', h('h2', title), close), h('div.modal-body', node)));
    document.body.classList.add('modal-open'); setTimeout(() => close.focus(), 20);
  };
  P.closeModal = function () { const m = P.$('#modal'); if (m.hidden) return; m.hidden = true; m.innerHTML = ''; document.body.classList.remove('modal-open'); if (m._opener && m._opener.focus) try { m._opener.focus(); } catch (e) { } };

  /* ---------- badges ---------- */
  P.typeBadge = t => h('span.badge.t-' + t, P.typeLabel(t));
  P.confLabel = function (c, fig) {
    const txt = c.status === 'estimate' ? 'Low · estimate' : c.status === 'unscored' ? 'Low · unscored' : c.conf;
    const tip = P.confTip(c) + (fig && fig.ai ? ' AI-scored with your own key; untested by default.' : '');
    return h('span.conf.c-' + c.conf.toLowerCase(), { tabindex: '0', 'data-tip': tip, 'aria-label': 'Confidence ' + txt + '. ' + tip }, h('i.cdot'), txt);
  };

  /* ---------- cell panel ---------- */
  P.openCell = function (r, c, ctx) {
    const cd = P.cells && P.cells.cells ? P.cells.cells[r * 10 + c] : null, reg = cd ? P.cells.regions[cd.region] : null;
    const items = ctx.items ? ctx.items() : [];
    const title = h('div', h('div.sp-kicker.mono', P.rangeText(r, c)), h('h2.sp-h', reg ? reg.name : 'This region'));
    const body = h('div.cellp');
    if (cd && cd.note) body.append(h('p.muted.note', cd.note));
    if (reg) {
      body.append(h('section', h('h3', 'What views sit here'), h('ul.views', reg.views.map(v => h('li', v)))));
      body.append(h('section', h('h3', 'Ideologies often placed nearby'), h('div.ideos', reg.ideologies.map(i => h('div.ideo', h('div.ideo-n', i.name), h('div.ideo-d', i.def), h('a.primer', { href: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(i.wiki.replace(/ /g, '_')), target: '_blank', rel: 'noopener' }, 'Primer ↗'))))));
      body.append(h('section', h('h3', 'Supporters say / Critics say'), h('div.sc', h('div.sc-col', h('div.sc-h', 'Supporters say'), h('p', reg.supporters.replace(/^Supporters say /, ''))), h('div.sc-col', h('div.sc-h', 'Critics say'), h('p', reg.critics.replace(/^Critics say /, ''))))));
    } else body.append(h('p.muted', 'Region text did not load.'));
    // figures
    const near = items.filter(i => Math.abs(P.cellOf(i.c.x, i.c.y).r - r) <= 1 && Math.abs(P.cellOf(i.c.x, i.c.y).c - c) <= 1);
    const figRow = (f, cc) => h('button.frow', { type: 'button', onclick: () => ctx.openFig(f.id) }, P.tokenEl(f, { size: 34, ring: P.rgb(P.colorAt(cc.x, cc.y, false)), dashed: cc.conf === 'Low' }), h('span.fr-n', f.name), h('span.mono.fr-c', P.coordText(cc.x, cc.y).replace('Econ ', 'E ').replace('Social ', 'S ')));
    body.append(h('section', h('h3', 'Figures on this board in or near this cell'), near.length ? h('div.frows', near.slice(0, 8).map(i => figRow(i.fig, i.c))) : h('p.muted', 'None yet. Place a name below and it will show up here if it lands nearby.')));
    const here = P.figs.map(f => ({ f, c: P.computeEra(f) })).filter(x => { const g = P.cellOf(x.c.x, x.c.y); return g.r === r && g.c === c; });
    const tr = new Set(P.trending || []); here.sort((a, b) => (tr.has(b.f.id) - tr.has(a.f.id)) || a.c.rx - b.c.rx);
    body.append(h('section', h('h3', 'Popular figures placed here'), here.length ? h('div.frows', here.slice(0, 6).map(x => h('div.frow-wrap', figRow(x.f, x.c), ctx.board && !ctx.board.items.some(i => i.id === x.f.id) ? h('button.mini-add', { type: 'button', 'aria-label': 'Add ' + x.f.name + ' to board', onclick: ev => { ev.stopPropagation(); ctx.add(x.f.id); P.openCell(r, c, ctx); } }, '+ Add') : null))) : h('p.muted', 'No cached figures sit in this exact tile. Try a neighboring one.')));
    // arrows
    const mv = (dr, dc) => { const nr = P.clamp(r + dr, 0, 9), nc = P.clamp(c + dc, 0, 9); if (nr === r && nc === c) return; ctx.map.selectCell(nr, nc, false); ctx.map.focusCell && 0; P.openCell(nr, nc, ctx); };
    const ab = (l, d, dr, dc, dis) => h('button.arrow', { type: 'button', 'aria-label': 'Move to the tile ' + d, disabled: dis, onclick: () => mv(dr, dc) }, l);
    body.append(h('div.arrows', { role: 'group', 'aria-label': 'Neighboring tiles' }, ab('↑', 'above (more authoritarian)', -1, 0, r === 0), h('div', ab('←', 'to the left (more economic left)', 0, -1, c === 0), ab('↓', 'below (more libertarian)', 1, 0, r === 9), ab('→', 'to the right (more economic right)', 0, 1, c === 9))));
    S.open('cell', title, body, { snap: 'half', focus: false, scrollTop: false, onClose: () => { ctx.map.clearCell(); } });
  };

  /* ---------- profile drawer ---------- */
  P.figureDetail = function (fig, eraIdx, opts) {
    opts = opts || {}; const c = P.computeEra(fig, eraIdx), era = fig.eras[eraIdx], disp = (P.disputes()[fig.id] || {});
    const wrap = h('div.prof');
    // portrait + credit
    const ring = P.rgb(P.colorAt(c.x, c.y, false));
    const tk = P.tokenEl(fig, { size: opts.page ? 120 : 92, ring, dashed: c.conf === 'Low' });
    let credit;
    if (fig.type === 'fictional') credit = h('div.credit', 'Designed token: initials, franchise colour and a role symbol. No official art. ', h('a', { href: '#/method' }, 'Why?'));
    else if (fig.photo) credit = h('div.credit', 'Photo: ', h('a', { href: fig.photo.page, target: '_blank', rel: 'noopener' }, fig.photo.artist), ' · ', fig.photo.licenseUrl ? h('a', { href: fig.photo.licenseUrl, target: '_blank', rel: 'noopener' }, fig.photo.license) : fig.photo.license, ' · Wikimedia Commons');
    else credit = h('div.credit', 'No free-licensed photo on file. Monogram token shown.');
    wrap.append(h('div.p-top', h('div.p-tk', tk), h('div.p-id', h('div.p-name', fig.name), h('div.p-badges', P.typeBadge(fig.type), fig.universe ? h('span.badge.uni', fig.universe) : null, fig.ai ? h('span.badge.ai', 'AI-scored · untested') : null, fig.origin === 'live' && !fig.ai ? h('span.badge.est', 'Live lookup') : null), h('div.p-line', fig.blurb || ''))));
    wrap.append(credit);
    if (fig.extract) wrap.append(h('p.muted.p-ext', fig.extract + ' ', fig.wikipedia ? h('a', { href: 'https://en.wikipedia.org/wiki/' + encodeURIComponent(fig.wikipedia.replace(/ /g, '_')), target: '_blank', rel: 'noopener' }, 'Wikipedia ↗') : null));
    // era
    if (fig.eras.length > 1) wrap.append(h('div.era-sel', h('span.era-l', 'Era'), h('div.seg', { role: 'group', 'aria-label': 'Era' }, fig.eras.map((e, i) => h('button', { type: 'button', 'aria-pressed': i === eraIdx, onclick: () => opts.onEra && opts.onEra(i) }, e.label)))));
    // coords + confidence
    const basisTxt = c.basis === 'interpretation' ? 'Interpretation from role and behavior' : c.basis === 'mostly-inferred' ? 'Mostly inferred from lore' : c.status === 'estimate' ? 'Estimate from public data' : c.status === 'unscored' ? 'Unscored: centred, widest cloud' : null;
    wrap.append(h('div.p-coords', h('div.mono.coord', P.coordText(c.x, c.y)), P.confLabel(c, fig), basisTxt ? h('span.badge.basis', basisTxt) : null));
    if (c.notes && c.notes.length) wrap.append(h('ul.notes', c.notes.map(n => h('li', n))));
    wrap.append(P.miniMap([{ fig, c }], { focus: fig.id, label: fig.name + ' on the map' }));
    // why here
    const why = h('section.why', h('h3', 'Why here'));
    if (c.status === 'estimate' || c.status === 'unscored') {
      why.append(h('p', c.status === 'unscored' ? 'There is no usable public ideology, party or alignment data for this entry, so it sits at the centre with the widest cloud. That is a placeholder, not a position.' : 'This is a LOW-confidence estimate built from public data on Wikidata, not from the 24 questions. Where the party or ideology data lines up, the token lands near it; the cloud is large because the data is thin.'));
      if (era.est && era.est.signals && era.est.signals.length) wrap.append(why, h('div.sigs', era.est.signals.map(s => h('div.sig', h('span.badge', s.kind === 'party' ? 'Party' : s.kind === 'ideology' ? 'Ideology' : 'Alignment'), h('span', s.label + ' → ' + (s.x != null ? 'econ ' + s.x : '') + (s.y != null ? ' · social ' + s.y : ''))))));
      else wrap.append(why);
    } else { why.append(h('p', whyText(fig, c, era))); wrap.append(why); }
    if (fig.src && typeof fig.src === 'string') wrap.append(h('p.muted.small', 'Lore source: ', fig.src));
    // answers
    if (era.est) {
      wrap.append(h('section', h('h3', 'The 24 answers'), h('p.muted', 'This figure was placed from public data rather than scored. To score it on all 24 questions with evidence, add your own key under Account → Deep research (optional).')));
    } else {
      const inferred = c.inf > 0;
      if (inferred) wrap.append(h('p.callout', h('b', 'Inferred from lore. '), `${c.inf} of ${c.nonInf + c.inf} answers are marked "Inferred": they come from this figure's role, faction and behavior rather than a direct statement. They count half when sizing the cloud.`));
      ['econ', 'social'].forEach(ax => {
        const sec = h('section.ans', h('h3', ax === 'econ' ? 'Economic' : 'Social'), h('div.ans-sub.muted', ax === 'econ' ? '-2 state-led · +2 market-led' : '-2 libertarian · +2 authoritarian'));
        P.Q[ax].forEach(q => sec.append(answerRow(fig, era, q, disp[q.id], opts)));
        wrap.append(sec);
      });
    }
    // changelog
    const log = [{ d: 'Seed', t: fig.origin === 'live' ? (fig.ai ? 'Scored with a user-supplied AI key (unverified, untested).' : 'Estimated live from Wikidata on this device.') : 'Placed from the seed cache that ships with the app. Prepared ahead of time with sources; not independently validated (see Method).' }];
    Object.entries(disp).forEach(([qid, d]) => log.push({ d: new Date(d.ts).toLocaleDateString(), t: `Dispute on ${qid.toUpperCase()}: proposed ${d.score == null ? 'unknown' : (d.score > 0 ? '+' : '') + d.score}. Under review (saved on this device only).` }));
    wrap.append(h('section', h('h3', 'Changelog'), h('ul.log', log.map(l => h('li', h('span.mono', l.d), ' ', l.t)))));
    return wrap;
  };
  function whyText(fig, c, era) {
    const rows = [];
    ['econ', 'social'].forEach(ax => P.Q[ax].forEach(q => { const a = era.answers[q.id]; if (a && a.s != null && a.s !== 0) rows.push({ q, a, ax }); }));
    const total = c.nE + c.nS, lore = fig.lore;
    if (lore) return lore;
    const strongest = ax => rows.filter(r => r.ax === ax).sort((a, b) => Math.abs(b.a.s) - Math.abs(a.a.s)).slice(0, 2).map(r => (r.a.s < 0 ? r.q.left : r.q.right).replace(/\.$/, '').toLowerCase());
    const e = strongest('econ'), s = strongest('social');
    const s1 = `Placed from ${total} of 24 answers (${P.coordText(c.x, c.y)}).` + (c.notes && c.notes.length ? ' ' + c.notes.join('; ') + '.' : '');
    const parts = []; if (e.length) parts.push('on economics: ' + e.join('; ')); if (s.length) parts.push('on social questions: ' + s.join('; '));
    return s1 + (parts.length ? ' Strongest signals ' + parts.join(' — ') + '.' : '');
  }
  function disForm(fig, q, opts) {
    const form = h('form.dis', { hidden: true, onsubmit: ev => {
      ev.preventDefault(); const fd = new FormData(ev.target), v = fd.get('score');
      P.addDispute(fig.id, q.id, { score: v === '' ? null : +v, url: fd.get('url'), note: fd.get('note') }); P.toast('Saved on this device as "Under review". Nothing was sent anywhere.'); opts.refresh && opts.refresh();
    } },
      h('label', 'New score', h('select', { name: 'score' }, h('option', { value: '' }, 'Unknown / no evidence'), [-2, -1, 0, 1, 2].map(v => h('option', { value: v }, (v > 0 ? '+' : '') + v)))),
      h('label', 'Source URL', h('input', { name: 'url', type: 'url', placeholder: 'https://', inputmode: 'url' })),
      h('label', 'Note', h('textarea', { name: 'note', rows: 2, placeholder: 'What should we look at?' })),
      h('div.dis-b', h('button.btn.primary', { type: 'submit' }, 'Submit for review'), h('button.btn', { type: 'button', onclick: () => form.hidden = true }, 'Cancel')));
    return form;
  }
  function answerRow(fig, era, q, disp, opts) {
    const a = era.answers[q.id] || { s: null }; const unk = a.s == null;
    const pct = unk ? 50 : (a.s + 2) / 4 * 100;
    const status = disp ? 'Under review' : unk ? 'Unknown' : a.updated ? 'Updated' : 'Scored';
    const form = disForm(fig, q, opts);
    const toggle = h('button.link.dis-open', { type: 'button', onclick: () => { form.hidden = !form.hidden; if (!form.hidden) form.querySelector('select').focus(); } }, 'Disagree?');
    const qEl = h('div.a-q', h('span.mono.a-id', q.id.toUpperCase()), ' ', q.text);
    if (unk && !disp) {
      return h('div.arow.is-unk.compact', qEl, h('div.a-meta', h('span.badge.st.s-unknown', 'Unknown'), h('span.muted.small', 'No stated views.'), toggle), form);
    }
    const lean = unk ? 'No stated views on this question.' : a.s === 0 ? 'Mixed or balanced.' : (a.s < 0 ? 'Leans: ' + q.left : 'Leans: ' + q.right);
    const bar = h('div.sbar' + (unk ? '.unk' : ''), { role: 'img', 'aria-label': unk ? 'Unknown' : 'Score ' + a.s + ' of -2 to +2' }, h('i.mid'), unk ? null : h('b.fill' + (a.s < 0 ? '.neg' : '.pos'), { style: { left: Math.min(50, pct) + '%', width: Math.abs(pct - 50) + '%' } }), unk ? null : h('span.mk', { style: { left: pct + '%' } }), disp && disp.score != null ? h('span.mk.ghost', { style: { left: (disp.score + 2) / 4 * 100 + '%' }, title: 'Proposed ' + disp.score }) : null);
    const meta = h('div.a-meta', h('span.badge.st.s-' + status.toLowerCase().replace(' ', '-'), status), a.inf ? h('span.badge.inf', { title: 'Inferred from lore, role or behavior rather than a direct statement' }, 'Inferred') : null, a.ai ? h('span.badge.ai', 'AI') : null,
      (a.src || []).slice(0, 3).map((u, i) => h('a.src', { href: u, target: '_blank', rel: 'noopener' }, 'Source ' + (i + 1) + ' ↗')), toggle);
    return h('div.arow' + (unk ? '.is-unk' : ''), qEl, h('div.a-bar', bar, h('span.mono.a-s', unk ? '—' : (a.s > 0 ? '+' : '') + a.s)), h('div.a-lean', lean), a.ev ? h('p.a-ev', a.ev) : null, meta, form);
  }

  P.openProfile = function (figId, ctx) {
    ctx = ctx || {}; const fig = P.getFig(figId); if (!fig) return;
    const render = () => {
      const cur = ctx.board && ctx.board.items.find(i => i.id === figId); const eraIdx = cur ? cur.era : (ctx.eraIdx != null ? ctx.eraIdx : fig.eras.length - 1);
      const body = P.figureDetail(fig, eraIdx, { refresh: render, onEra: i => { if (ctx.map && cur) ctx.map.setEra(figId, i); else ctx.eraIdx = i; render(); } });
      const onBoard = !!cur;
      const acts = h('div.p-actions',
        onBoard ? h('button.btn', { type: 'button', onclick: () => { ctx.remove ? ctx.remove(figId) : null; S.close(); } }, 'Remove from board') : (ctx.add ? h('button.btn.primary', { type: 'button', onclick: () => { ctx.add(figId); render(); } }, 'Add to board') : null),
        h('a.btn', { href: '#/figure/' + encodeURIComponent(figId) }, 'Open figure page'),
        h('button.btn', { type: 'button', onclick: () => P.shareFigure(fig, eraIdx) }, 'Share'));
      body.append(acts);
      S.open('profile', h('div', h('div.sp-kicker', 'Profile')), body, { snap: 'half', scrollTop: !S._same, focus: !S._same, onClose: () => { ctx.map && ctx.map.deselect(); } });
      S._same = true; setTimeout(() => { S._same = false; }, 50);
    };
    P.ensurePhoto(fig); const off = P.on('photo', id => { if (id === figId && S.kind === 'profile') { off(); render(); } });
    render();
  };
  P.shareFigure = async function (fig, eraIdx) {
    const url = location.href.split('#')[0] + '#/figure/' + encodeURIComponent(fig.id), c = P.computeEra(fig, eraIdx);
    const text = `${fig.name} on Polarity: ${P.coordText(c.x, c.y)} (${c.conf} confidence).`;
    if (navigator.share) { try { await navigator.share({ title: fig.name + ' on Polarity', text, url }); return; } catch (e) { if (e.name === 'AbortError') return; } }
    try { await navigator.clipboard.writeText(url); P.toast('Link copied.'); } catch (e) { prompt('Copy this link', url); }
  };
})();
