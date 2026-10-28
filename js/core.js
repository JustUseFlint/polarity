/* Polarity core: helpers, storage, data loading, scoring, colour math, board model. No build step. */
(function () {
  'use strict';
  const P = window.P = {};
  P.version = '0.1.0';

  /* ---------- tiny helpers ---------- */
  P.$ = (s, r) => (r || document).querySelector(s);
  P.$$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  P.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  P.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  P.mean = a => a.length ? a.reduce((s, v) => s + v, 0) / a.length : 0;
  P.sd = a => { if (a.length < 2) return 0; const m = P.mean(a); return Math.sqrt(P.mean(a.map(v => (v - m) * (v - m)))); };
  P.norm = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/&/g, ' and ').replace(/['’`.]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  P.sleep = ms => new Promise(r => setTimeout(r, ms));
  P.reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  P.hash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
  P.fmt = n => (n >= 0 ? '+' : '-') + Math.abs(n).toFixed(1);
  P.coordText = (x, y) => `Econ ${P.fmt(x)} · Social ${P.fmt(y)}`;
  P.initials = name => {
    const w = String(name).replace(/\(.*?\)/g, '').split(/\s+/).filter(Boolean).filter(x => !/^(the|of|de|von|van|la|le|jr\.?|sr\.?|ii|iii|iv)$/i.test(x));
    if (!w.length) return String(name).slice(0, 2).toUpperCase();
    if (w.length === 1) return w[0].slice(0, 2).toUpperCase();
    return (w[0][0] + w[w.length - 1][0]).toUpperCase();
  };
  P.typeLabel = t => ({ politician: 'Politician', historical: 'Historical', public: 'Public figure', fictional: 'Fictional' }[t] || 'Public figure');
  P.today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  /** hyperscript: h('div.cls#id', {attrs}, ...children) */
  P.h = function (sel, attrs) {
    const m = /^([a-z0-9-]*)((?:[.#][\w-]+)*)$/i.exec(sel);
    const el = document.createElement(m[1] || 'div');
    (m[2].match(/[.#][\w-]+/g) || []).forEach(t => t[0] === '.' ? el.classList.add(t.slice(1)) : (el.id = t.slice(1)));
    let i = 1;
    if (attrs && typeof attrs === 'object' && !(attrs instanceof Node) && !Array.isArray(attrs)) {
      i = 2;
      for (const k in attrs) {
        const v = attrs[k];
        if (k.startsWith('aria-') && typeof v === 'boolean') { el.setAttribute(k, String(v)); continue; }
        if (v == null || v === false) continue;
        if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
        else if (k === 'class') el.className += ' ' + v;
        else if (k === 'html') el.innerHTML = v;
        else if (k === 'text') el.textContent = v;
        else if (k === 'style' && typeof v === 'object') { for (const sk in v) { if (sk.startsWith('--')) el.style.setProperty(sk, v[sk]); else el.style[sk] = v[sk]; } }
        else if (k === 'dataset') Object.assign(el.dataset, v);
        else if (v === true) el.setAttribute(k, '');
        else el.setAttribute(k, v);
      }
    }
    const add = c => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else el.append(c instanceof Node ? c : document.createTextNode(c)); };
    for (; i < arguments.length; i++) add(arguments[i]);
    return el;
  };

  /* ---------- storage ---------- */
  P.store = {
    get(k, d) { try { const v = localStorage.getItem('polarity.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('polarity.' + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
    del(k) { try { localStorage.removeItem('polarity.' + k); } catch (e) { } },
  };

  P.toast = (msg, ms) => {
    const t = P.$('#toast'); if (!t) return;
    t.textContent = msg; t.classList.add('show');
    clearTimeout(P._tt); P._tt = setTimeout(() => t.classList.remove('show'), ms || 3200);
  };

  /* ---------- colour ---------- */
  const CORNERS = { tl: [0xF2, 0x54, 0x5B], tr: [0x54, 0x65, 0xFF], bl: [0x2E, 0xC4, 0xB6], br: [0xF9, 0xA6, 0x20] };
  P.CORNERS = CORNERS;
  const CENTER = [0xE9, 0xEA, 0xF0];
  /** blend at econ x, social y (both -10..10). faded=true mixes toward the pale centre. */
  P.colorAt = function (x, y, faded) {
    const u = P.clamp((x + 10) / 20, 0, 1), v = P.clamp((10 - y) / 20, 0, 1);
    const c = [0, 1, 2].map(i => CORNERS.tl[i] * (1 - u) * (1 - v) + CORNERS.tr[i] * u * (1 - v) + CORNERS.bl[i] * (1 - u) * v + CORNERS.br[i] * u * v);
    if (!faded) return c;
    const d = Math.hypot(u - .5, v - .5);
    const f = Math.pow(P.clamp(1 - d / 0.5, 0, 1), 1.25) * 0.72;
    return c.map((k, i) => k * (1 - f) + CENTER[i] * f);
  };
  P.rgb = (c, a) => a == null ? `rgb(${c.map(Math.round).join(',')})` : `rgba(${c.map(Math.round).join(',')},${a})`;
  P.cellRange = (r, c) => ({ econ: [-10 + 2 * c, -8 + 2 * c], social: [8 - 2 * r, 10 - 2 * r] });
  P.cellOf = (x, y) => ({ r: P.clamp(Math.floor((10 - y) / 2), 0, 9), c: P.clamp(Math.floor((x + 10) / 2), 0, 9) });
  P.rangeText = (r, c) => {
    const g = P.cellRange(r, c), s = n => (n > 0 ? '+' : n < 0 ? '-' : '') + Math.abs(n);
    return `Econ ${s(g.econ[0])} to ${s(g.econ[1])} · Social ${s(g.social[0])} to ${s(g.social[1])}`;
  };

  /* ---------- scoring ---------- */
  P.Q = { econ: [], social: [], method: '' };
  P.qById = {};
  const normAns = a => {
    if (a == null) return { s: null };
    if (typeof a === 'number') return { s: P.clamp(Math.round(a), -2, 2) };
    const s = (a.s == null || isNaN(+a.s)) ? null : P.clamp(+a.s, -2, 2);
    return Object.assign({}, a, { s });
  };
  P.normFig = function (f, origin) {
    const fig = Object.assign({ aliases: [], type: 'public', blurb: '', universe: '', wikipedia: null, wikidata: null }, f);
    fig.origin = fig.origin || origin || 'seed';
    fig.type = ['politician', 'historical', 'public', 'fictional'].includes(fig.type) ? fig.type : 'public';
    fig.aliases = (fig.aliases || []).filter(Boolean);
    let eras = Array.isArray(f.eras) && f.eras.length ? f.eras : (f.answers ? [{ label: 'Current', answers: f.answers }] : [{ label: 'Current', answers: {} }]);
    fig.eras = eras.map((e, i) => {
      const o = Object.assign({}, e, { label: e.label || ('Era ' + (i + 1)) });
      if (!o.est) { const a = {}; for (const k in (e.answers || {})) a[k] = normAns(e.answers[k]); o.answers = a; }
      return o;
    });
    fig._c = [];
    return fig;
  };
  /** Compute placement for one era. Rules: always placed; position = mean of answered x5; confidence from non-inferred count. */
  P.computeEra = function (fig, i) {
    i = P.clamp(i == null ? fig.eras.length - 1 : i, 0, fig.eras.length - 1);
    if (!fig._c) fig._c = [];
    if (fig._c[i]) return fig._c[i];
    const era = fig.eras[i];
    let out;
    if (era.est) {
      out = { x: era.est.x, y: era.est.y, rx: era.est.rx || 3.4, ry: era.est.ry || 3.4, conf: 'Low', status: 'estimate', nE: 0, nS: 0, nonInf: 0, inf: 0, sd: 0, notes: era.est.notes || [], basis: 'estimate' };
      if (era.est.unscored) { out.status = 'unscored'; out.basis = 'unscored'; out.rx = out.ry = 7; }
      return (fig._c[i] = out);
    }
    const A = era.answers || {}, vals = { econ: [], social: [] }; let nonInf = 0, inf = 0;
    for (const ax of ['econ', 'social']) for (const q of P.Q[ax]) {
      const a = A[q.id]; if (a && a.s != null) { vals[ax].push(a.s); if (a.inf) inf++; else nonInf++; }
    }
    const nE = vals.econ.length, nS = vals.social.length, total = nE + nS;
    const x = nE ? P.mean(vals.econ) * 5 : 0, y = nS ? P.mean(vals.social) * 5 : 0;
    const sdv = []; if (nE > 1) sdv.push(P.sd(vals.econ)); if (nS > 1) sdv.push(P.sd(vals.social));
    const sd = sdv.length ? P.mean(sdv) : 0;
    const eff = nonInf + 0.5 * inf;                                  // inferred answers count half for the cloud
    let base = 0.9 + (24 - eff) / 24 * 3.7 + sd * 0.8;
    if (total === 0) base = 8;
    base = Math.min(base, 8);
    let rx = base, ry = base; const notes = [];
    if (nE === 0) { rx = 11; notes.push('Economic axis: no stated views on this axis'); }
    if (nS === 0) { ry = 11; notes.push('Social axis: no stated views on this axis'); }
    let conf = nonInf >= 14 ? 'High' : nonInf >= 7 ? 'Medium' : 'Low';
    if ((nE === 0 || nS === 0) && total > 0) conf = 'Low';
    if (fig.ai && conf === 'High') conf = 'Medium';
    const basis = total === 0 ? 'unscored' : (nonInf === 0 ? 'interpretation' : (inf / total > 0.5 ? 'mostly-inferred' : 'sourced'));
    out = { x: P.clamp(x, -10, 10), y: P.clamp(y, -10, 10), rx, ry, conf, status: total === 0 ? 'unscored' : 'placed', nE, nS, nonInf, inf, sd, notes, basis };
    return (fig._c[i] = out);
  };
  P.confTip = (c) => {
    if (c.status === 'estimate') return 'Estimated from public data (party/ideology). Not a full 24-question evidence score.';
    if (c.status === 'unscored') return 'No scored answers yet. Placed at the centre with the widest cloud; this is not a measured position.';
    if (c.basis === 'interpretation') return 'Interpretation from role and behavior. Every answer is inferred, so the cloud is wide.';
    return ({
      High: 'High: 14 or more of 24 answers are backed directly by sources. The cloud is tight.',
      Medium: 'Medium: 7 to 13 of 24 answers are backed directly by sources; the rest are inferred or unknown. The cloud is wider.',
      Low: 'Low: fewer than 7 answers are backed directly by sources. Inferred answers count half, so the cloud is wide.',
    })[c.conf];
  };

  /* ---------- data ---------- */
  P.figs = []; P.byId = new Map(); P.nameIdx = new Map(); P.boardsSeed = []; P.cells = null; P.live = {};
  async function getJSON(url) {
    try { const r = await fetch(url, { cache: 'no-cache' }); if (!r.ok) return null; return await r.json(); } catch (e) { return null; }
  }
  P.getJSON = getJSON;
  const asArray = d => Array.isArray(d) ? d : (d && Array.isArray(d.figures) ? d.figures : (d && Array.isArray(d.boards) ? d.boards : []));
  P.dataSource = {};
  P.indexFig = function (fig) {
    P.byId.set(fig.id, fig);
    const keys = new Set([P.norm(fig.name), ...fig.aliases.map(P.norm)].filter(Boolean));
    keys.forEach(k => { const a = P.nameIdx.get(k) || []; if (!a.includes(fig.id)) a.push(fig.id); P.nameIdx.set(k, a); });
  };
  P.loadData = async function () {
    const [q, f, lol, b, bl, al, cells, tr] = await Promise.all([
      getJSON('data/questions.json'), getJSON('data/figures.json'), getJSON('data/figures-lol.json'),
      getJSON('data/boards.json'), getJSON('data/boards-lol.json'), getJSON('data/aliases.json'), getJSON('data/cells.json'), getJSON('data/trending.json')]);
    P.trending = Array.isArray(tr) ? tr : [];
    let qs = q && q.econ && q.social ? q : null; P.dataSource.questions = qs ? 'data/questions.json' : 'data/dev-questions.json';
    if (!qs) qs = await getJSON('data/dev-questions.json');
    P.Q = { econ: qs.econ, social: qs.social, method: qs.method || '' };
    P.qById = {}; P.Q.econ.concat(P.Q.social).forEach(x => P.qById[x.id] = x);
    let figs = asArray(f); P.dataSource.figures = 'data/figures.json';
    if (!figs.length) { figs = asArray(await getJSON('data/dev-figures.json')); P.dataSource.figures = 'data/dev-figures.json (stand-in)'; }
    const lolFigs = asArray(lol); P.dataSource.lol = lolFigs.length ? 'data/figures-lol.json (' + lolFigs.length + ')' : 'absent';
    const seen = new Set();
    figs.concat(lolFigs).forEach(raw => { if (!raw || !raw.id || seen.has(raw.id)) return; seen.add(raw.id); const fig = P.normFig(raw, 'seed'); P.figs.push(fig); P.indexFig(fig); });
    // optional aliases file: {"alias":"figure-id"} or [{alias,id}]
    if (al) { const pairs = Array.isArray(al) ? al.map(x => [x.alias, x.id]) : Object.entries(al); pairs.forEach(([a, id]) => { const fig = P.byId.get(id); if (fig && a) { const k = P.norm(a), arr = P.nameIdx.get(k) || []; if (!arr.includes(id)) arr.push(id); P.nameIdx.set(k, arr); } }); }
    // boards
    let boards = asArray(b); if (!boards.length) boards = asArray(await getJSON('data/dev-boards.json'));
    boards = boards.concat(asArray(bl).map(x => Object.assign({ collection: 'League of Legends by region' }, x)));
    P.boardsSeed = boards.map(x => ({ id: x.id, title: x.title || x.id, desc: x.description || x.blurb || x.desc || '', theme: x.theme || 'default', collection: x.collection || null, ids: (x.figures || x.ids || x.figureIds || []).map(v => typeof v === 'string' ? v : v && v.id).filter(id => P.byId.has(id)), seed: true })).filter(x => x.ids.length);
    P.cells = cells;
    // live figures kept from earlier sessions
    const live = P.store.get('live', {});
    for (const id in live) { const fig = P.normFig(live[id], 'live'); P.live[id] = fig; P.indexFig(fig); }
    // collection helper: LoL
    P.lolIds = P.figs.filter(f => f.id.startsWith('lol-')).map(f => f.id);
    return true;
  };
  P.saveLive = () => { const o = {}; for (const id in P.live) { const f = Object.assign({}, P.live[id]); delete f._c; o[id] = f; } P.store.set('live', o); };
  P.addLive = fig => { P.live[fig.id] = fig; P.indexFig(fig); P.saveLive(); };
  P.getFig = id => P.byId.get(id) || null;
  P.eraOf = (id) => { const o = P.board.items.find(i => i.id === id); return o ? o.era : null; };

  /** resolve a typed name against seed cache + live cache. */
  P.resolveLocal = function (raw) {
    const k = P.norm(raw); if (!k) return { kind: 'none' };
    const ex = P.nameIdx.get(k);
    if (ex && ex.length === 1) return { kind: 'hit', fig: P.byId.get(ex[0]) };
    if (ex && ex.length > 1) return { kind: 'multi', cands: ex.map(id => P.byId.get(id)).slice(0, 8) };
    if (k.length >= 4) {
      const found = new Set();
      for (const [key, ids] of P.nameIdx) {
        if (key.startsWith(k + ' ') || key.endsWith(' ' + k) || (' ' + key + ' ').includes(' ' + k + ' ')) ids.forEach(id => found.add(id));
      }
      if (found.size === 1) return { kind: 'hit', fig: P.byId.get([...found][0]) };
      if (found.size > 1 && found.size <= 8) return { kind: 'multi', cands: [...found].map(id => P.byId.get(id)) };
    }
    return { kind: 'none' };
  };

  /* ---------- settings / quota ---------- */
  P.FREE_LIMIT = 10;
  P.settings = () => Object.assign({ aiOn: false, endpoint: 'https://api.openai.com/v1', model: 'gpt-4o-mini', key: '', mapTheme: 'default' }, P.store.get('settings', {}));
  P.quotaUsed = () => { const q = P.store.get('quota', {}); return q.day === P.today() ? q.used || 0 : 0; };
  P.quotaBump = () => { P.store.set('quota', { day: P.today(), used: P.quotaUsed() + 1 }); P.emit('quota'); };
  P.quotaLeft = () => Math.max(0, P.FREE_LIMIT - P.quotaUsed());

  /* ---------- tiny event bus ---------- */
  const L = {};
  P.on = (e, f) => { (L[e] = L[e] || []).push(f); return () => { L[e] = (L[e] || []).filter(x => x !== f); }; };
  P.emit = (e, d) => (L[e] || []).slice().forEach(f => { try { f(d); } catch (err) { console.error(err); } });

  /* ---------- board model ---------- */
  P.board = Object.assign({ id: null, title: 'Untitled board', theme: 'default', items: [] }, P.store.get('draft', {}));
  P.board.items = (P.board.items || []).filter(i => i && i.id);
  P.saveDraft = () => P.store.set('draft', P.board);
  P.addToBoard = (board, id, era) => {
    if (board.items.some(i => i.id === id)) return false;
    const f = P.getFig(id); if (!f) return false;
    board.items.push({ id, era: era == null ? f.eras.length - 1 : era });
    if (board === P.board) P.saveDraft();
    return true;
  };
  P.removeFromBoard = (board, id) => { board.items = board.items.filter(i => i.id !== id); if (board === P.board) P.saveDraft(); };
  P.boardFigs = board => board.items.map(i => ({ fig: P.getFig(i.id), era: i.era })).filter(x => x.fig).map(x => Object.assign(x, { c: P.computeEra(x.fig, x.era) }));
  P.savedBoards = () => P.store.get('boards', []);
  P.saveBoards = a => P.store.set('boards', a);

  /* share encoding: ids + title + theme; live figures carry their computed coordinates */
  const b64 = s => btoa(unescape(encodeURIComponent(s))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  const unb64 = s => decodeURIComponent(escape(atob(s.replace(/-/g, '+').replace(/_/g, '/'))));
  P.encodeBoard = board => {
    const payload = { t: board.title, th: board.theme, f: board.items.map(i => {
      const fig = P.getFig(i.id); if (!fig) return null;
      if (fig.origin === 'live') { const c = P.computeEra(fig, 0); return { id: fig.id, n: fig.name, ty: fig.type, q: fig.wikidata, x: +c.x.toFixed(2), y: +c.y.toFixed(2), b: fig.blurb, st: c.status === 'unscored' ? 1 : 0, ai: fig.ai ? 1 : 0 }; }
      return i.era !== fig.eras.length - 1 ? [fig.id, i.era] : fig.id;
    }).filter(Boolean) };
    return 's~' + b64(JSON.stringify(payload));
  };
  P.decodeBoard = code => {
    try {
      const p = JSON.parse(unb64(code.slice(2)));
      const items = [];
      (p.f || []).forEach(v => {
        if (typeof v === 'string') items.push({ id: v, era: null });
        else if (Array.isArray(v)) items.push({ id: v[0], era: v[1] });
        else if (v && v.id) {
          if (!P.byId.has(v.id)) {
            const fig = P.normFig({ id: v.id, name: v.n, type: v.ty, blurb: v.b || '', wikidata: v.q, ai: !!v.ai, eras: [{ label: 'Estimate', est: { x: v.x, y: v.y, rx: 3.4, ry: 3.4, unscored: !!v.st, notes: ['Shared link carries coordinates only; open the figure page to see the signals.'] } }] }, 'live');
            P.live[v.id] = fig; P.indexFig(fig);
          }
          items.push({ id: v.id, era: 0 });
        }
      });
      const board = { id: null, title: p.t || 'Shared board', theme: p.th || 'default', items: [] };
      items.forEach(i => { const f = P.getFig(i.id); if (f) board.items.push({ id: i.id, era: i.era == null ? f.eras.length - 1 : P.clamp(i.era, 0, f.eras.length - 1) }); });
      return board;
    } catch (e) { return null; }
  };
  P.boardLink = board => location.href.split('#')[0] + '#/b/' + P.encodeBoard(board);
  P.findBoard = id => {
    if (!id) return null;
    if (id.startsWith('s~')) return P.decodeBoard(id);
    const s = P.savedBoards().find(b => b.id === id); if (s) return JSON.parse(JSON.stringify(s));
    const sd = P.boardsSeed.find(b => b.id === id); if (sd) return { id: sd.id, title: sd.title, theme: sd.theme, desc: sd.desc, seed: true, items: sd.ids.map(i => ({ id: i, era: null })).map(i => ({ id: i.id, era: P.getFig(i.id).eras.length - 1 })) };
    return null;
  };

  /* ---------- disputes & log ---------- */
  P.disputes = () => P.store.get('disputes', {});
  P.addDispute = (figId, qid, d) => { const all = P.disputes(); (all[figId] = all[figId] || {})[qid] = Object.assign({ ts: Date.now() }, d); P.store.set('disputes', all); };
  P.logExport = e => { const l = P.store.get('exports', []); l.unshift(Object.assign({ ts: Date.now() }, e)); P.store.set('exports', l.slice(0, 50)); };
})();
