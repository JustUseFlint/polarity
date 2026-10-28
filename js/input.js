/* Name input: live chips, statuses, placement pipeline, quota counter, example chips. */
(function () {
  const P = window.P, h = P.h;
  const STATUS = { typing: 'Typing', new: 'New', cached: 'Cached', researching: 'Researching', choice: 'Needs choice', placed: 'Placed', declined: 'Declined', nomatch: 'No match found' };
  const ringSvg = p => `<svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true"><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-opacity=".25" stroke-width="3"/><circle class="rp" cx="10" cy="10" r="8" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-dasharray="${(50.3 * P.clamp(p, 0.08, 1)).toFixed(1)} 60" transform="rotate(-90 10 10)"/></svg>`;

  P.createInput = function (root, ctx) {
    const I = { chips: [], running: false };
    const ta = h('textarea.names', { rows: 2, placeholder: 'Type names: Abraham Lincoln, Ada Lovelace, Darth Vader…', 'aria-label': 'Names to place, separated by commas or new lines', enterkeyhint: 'done', autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false' });
    const chipsBox = h('div.chips', { 'aria-live': 'off' });
    const sum = h('div.chip-sum', { hidden: true });
    const count = h('div.quota');
    const placeBtn = h('button.btn.place', { type: 'button' }, 'Place');
    const status = h('div.istatus', { role: 'status', 'aria-live': 'polite' });
    const progress = h('div.bprog', { hidden: true }, h('i'));
    const exWrap = h('div.examples', { 'aria-label': 'Try an example' });
    const box = h('div.inp-box', ta, sum, chipsBox, progress, h('div.inp-row', count, placeBtn));
    const wrap = h('div.inp', h('label.inp-l', { for: 'names' }, 'Add names'), box, status, exWrap, h('p.inp-hint', 'Separate names with commas or new lines. Cmd/Ctrl + Enter places. Cached figures are free; only newly researched names use the daily limit.'));
    ta.id = 'names'; root.append(wrap); I.el = wrap; I.ta = ta;

    /* ---- parsing ---- */
    const split = txt => {
      const parts = txt.split(/[,;\n]+/); const endsOpen = !/[,;\n]\s*$/.test(txt) && txt.trim() !== '';
      return parts.map((p, i) => ({ raw: p.trim().replace(/\s+/g, ' '), last: i === parts.length - 1 && endsOpen })).filter(x => x.raw);
    };
    function parse() {
      const segs = split(ta.value), old = new Map(I.chips.map(c => [c.key, c])), out = [], seen = new Set();
      segs.forEach(sg => {
        const key = P.norm(sg.raw); if (!key || seen.has(key)) return; seen.add(key);
        let c = old.get(key);
        if (!c) c = { key, raw: sg.raw, status: 'new' };
        c.raw = sg.raw;
        if (!['researching', 'choice', 'placed', 'declined', 'nomatch'].includes(c.status)) {
          const lk = P.resolveLocal(sg.raw);
          if (sg.last && document.activeElement === ta) c.status = 'typing';
          else if (lk.kind === 'hit') { c.status = 'cached'; c.type = lk.fig.type; c.figId = lk.fig.id; }
          else { c.status = 'new'; c.type = null; c.figId = null; }
        }
        out.push(c);
      });
      I.chips = out; render();
    }
    I.parse = parse;

    /* ---- render ---- */
    function chipEl(c) {
      const el = h('div.chip', { dataset: { st: c.status, key: c.key } },
        h('div.cm', h('span.cn', c.raw),
          c.type ? h('span.cb.t-' + c.type, P.typeLabel(c.type)) : null,
          h('span.cs', c.status === 'researching' ? h('span.ring', { html: ringSvg(c.progress || .1) }) : null, ' ' + (c.status === 'placed' && c.already ? 'On board' : STATUS[c.status]), c.stepLabel && c.status === 'researching' ? h('span.step', ' · ' + c.stepLabel) : null),
          h('button.cx', { type: 'button', 'aria-label': 'Remove ' + c.raw, onclick: () => remove(c.key) }, '×')));
      if (c.reason) el.append(h('div.cr', c.reason));
      if (c.status === 'choice' && c.choices) el.append(h('div.choices', { role: 'group', 'aria-label': 'Which ' + c.raw + '?' }, c.choices.map(ch => h('button.choice', { type: 'button', onclick: () => pick(c, ch) }, h('span.ch-n', ch.label), h('span.ch-d', ch.desc || '')))));
      el.classList.toggle('wide', c.status === 'choice' || !!c.reason);
      return el;
    }
    function render() {
      const n = I.chips.length, many = n > 12;
      const counts = {}; I.chips.forEach(c => counts[c.status] = (counts[c.status] || 0) + 1);
      sum.hidden = !many;
      if (many) {
        const parts = Object.entries(counts).map(([k, v]) => `${v} ${STATUS[k].toLowerCase()}`);
        sum.replaceChildren(h('strong', n + ' names'), h('span.muted', ' · ' + parts.join(' · ')), h('button.link', { type: 'button', onclick: () => { I.expanded = !I.expanded; render(); }, 'aria-expanded': !!I.expanded }, I.expanded ? 'Hide list' : 'Show list'));
      }
      const attention = I.chips.filter(c => ['choice', 'declined', 'nomatch', 'researching'].includes(c.status));
      const list = many ? (I.expanded ? I.chips : attention.slice(0, 12)) : I.chips;
      chipsBox.classList.toggle('scroll', many && I.expanded);
      chipsBox.replaceChildren(...list.slice(0, 300).map(chipEl));
      if (many && I.expanded && list.length > 300) chipsBox.append(h('div.muted', `…and ${list.length - 300} more`));
      const placeable = I.chips.some(c => ['new', 'cached', 'typing'].includes(c.status));
      placeBtn.disabled = I.running || !placeable;
      placeBtn.textContent = I.running ? 'Placing…' : many ? `Place all (${I.chips.filter(c => ['new', 'cached', 'typing'].includes(c.status)).length})` : 'Place';
      const left = P.quotaLeft();
      count.innerHTML = `<b class="mono">${left} of ${P.FREE_LIMIT}</b> free new placements left today`;
      count.title = 'Counts only newly researched names. Cached figures are free. Resets daily. This is a UI limit stored on your device; Pro is a plan concept, there is no paywall.';
    }
    function remove(key) {
      const re = new RegExp('(^|[,;\\n])\\s*' + '[^,;\\n]*' + '\\s*', 'g'); // fallback not used
      const segs = ta.value.split(/([,;\n]+)/); let out = [];
      for (let i = 0; i < segs.length; i += 2) { if (P.norm(segs[i]) !== key) out.push(segs[i].trim()); }
      ta.value = out.filter(Boolean).join(', '); I.chips = I.chips.filter(c => c.key !== key); parse();
    }

    /* ---- placement ---- */
    const board = () => ctx.getBoard();
    function rectFor(c) { const e = chipsBox.querySelector(`[data-key="${CSS.escape(c.key)}"]`) || ta; return e.getBoundingClientRect(); }
    async function putOnBoard(c, fig, o) {
      o = o || {}; const b = board(); const had = b.items.some(i => i.id === fig.id);
      c.figId = fig.id; c.type = fig.type; c.status = 'placed'; c.already = had; c.reason = c.reason && o.warn ? c.reason : (o.warn || null);
      if (!had) {
        P.addToBoard(b, fig.id, null); I.addedIds.push(fig.id);
        const m = ctx.map && ctx.map();
        if (m && o.animate) await m.addAnimated(fig.id, rectFor(c));
      }
    }
    async function pick(c, ch) {
      c.status = 'researching'; c.progress = .2; c.choices = null; c.reason = null; render();
      I.running = true; I.addedIds = [];
      try {
        if (ch.local) { await putOnBoard(c, P.getFig(ch.local), { animate: true }); }
        else {
          if (P.quotaLeft() <= 0) { c.status = 'declined'; c.reason = 'Daily free limit reached.'; }
          else await finishLive(c, await P.lookup.resolve(ch.qid, c.raw, prog(c)), true);
        }
      } finally { I.running = false; }
      ctx.onChange && ctx.onChange(I.addedIds); settle();
    }
    const prog = c => (p, l) => { c.progress = p; c.stepLabel = l; const el = chipsBox.querySelector(`[data-key="${CSS.escape(c.key)}"] .ring`); if (el) el.innerHTML = ringSvg(p); const st = chipsBox.querySelector(`[data-key="${CSS.escape(c.key)}"] .step`); if (st) st.textContent = ' · ' + l; };
    async function finishLive(c, res, animate) {
      if (res.kind === 'placed') {
        if (!res.cached) { P.addLive(res.fig); P.quotaBump(); }
        await putOnBoard(c, res.fig, { animate, warn: res.warn });
      } else if (res.kind === 'choice') { c.status = 'choice'; c.choices = res.choices.map(x => ({ qid: x.qid, label: x.label, desc: x.desc })); }
      else if (res.kind === 'declined') { c.status = 'declined'; c.reason = res.reason; }
      else if (res.kind === 'nomatch') { c.status = 'nomatch'; c.reason = res.reason; }
      else { c.status = 'declined'; c.reason = res.reason; c.offline = true; }
    }
    async function processOne(c, animate) {
      c.reason = null; c.progress = .08; c.stepLabel = '';
      const lk = P.resolveLocal(c.raw);
      if (lk.kind === 'hit') { await putOnBoard(c, lk.fig, { animate }); return; }
      if (lk.kind === 'multi') { c.status = 'choice'; c.choices = lk.cands.map(f => ({ local: f.id, label: f.name, desc: [f.universe, f.blurb].filter(Boolean).join(' · ').slice(0, 90) })); return; }
      if (P.quotaLeft() - I.inflight <= 0) { c.status = 'declined'; c.reason = 'Daily free limit reached (10 new placements). Cached figures are always free. The limit is a UI concept stored on this device.'; return; }
      c.status = 'researching'; render(); I.inflight++;
      try { await finishLive(c, await P.lookup.research(c.raw, prog(c)), animate); } finally { I.inflight--; }
    }
    I.place = async function () {
      if (I.running) return; parse();
      const todo = I.chips.filter(c => ['new', 'cached', 'typing'].includes(c.status)); if (!todo.length) return;
      I.running = true; I.addedIds = []; I.inflight = 0; status.textContent = ''; render();
      const batch = todo.length > 8; progress.hidden = !batch; let done = 0;
      const bump = () => { done++; progress.firstChild.style.width = (done / todo.length * 100) + '%'; placeBtn.textContent = `Placing ${done}/${todo.length}`; const m = ctx.map && ctx.map(); if (batch && done % 12 === 0) { m && m.refresh(); ctx.onChange && ctx.onChange(I.addedIds, true); } };
      // local hits first (instant), then live lookups with small concurrency
      const locals = [], lives = [];
      todo.forEach(c => (P.resolveLocal(c.raw).kind === 'none' ? lives : locals).push(c));
      let k = 0;
      for (const c of locals) { await processOne(c, !batch && k++ < 6); if (!batch && c.status === 'placed') await P.sleep(P.reduced() ? 0 : 120); bump(); render(); }
      const queue = lives.slice(); const workers = Array.from({ length: Math.min(3, queue.length) }, async () => { while (queue.length) { const c = queue.shift(); await processOne(c, true); bump(); render(); } });
      await Promise.all(workers);
      I.running = false; progress.hidden = true; progress.firstChild.style.width = '0';
      ctx.onChange && ctx.onChange(I.addedIds); settle();
    };
    function settle() {
      // rewrite textarea: drop placed names, keep the rest
      const keep = I.chips.filter(c => c.status !== 'placed' || false);
      const placed = I.chips.filter(c => c.status === 'placed' && !c.already), already = I.chips.filter(c => c.already);
      const choice = I.chips.filter(c => c.status === 'choice'), bad = I.chips.filter(c => ['declined', 'nomatch'].includes(c.status));
      const bits = [];
      if (placed.length) bits.push(`Placed ${placed.length} ${placed.length === 1 ? 'figure' : 'figures'}.`);
      if (already.length) bits.push(`${already.length} already on the board.`);
      if (choice.length) bits.push(`${choice.length} ${choice.length === 1 ? 'needs' : 'need'} a closer look: pick the match you mean.`);
      if (bad.length) bits.push(`${bad.length} couldn't be placed: ${bad[0].reason || bad[0].raw}`);
      status.textContent = bits.join(' ') || '';
      ta.value = keep.map(c => c.raw).join(', '); autosize();
      I.chips = keep; render();
      if (!keep.length) { ta.value = ''; }
    }
    I.setNames = (names) => { ta.value = names.join(', '); I.chips = []; autosize(); parse(); };

    /* ---- examples ---- */
    function buildExamples() {
      exWrap.replaceChildren(h('span.ex-l', 'Try:'));
      const seeds = P.boardsSeed.filter(b => !b.id.startsWith('lol-') && !b.collection).slice(0, 5);
      const lol = P.boardsSeed.find(b => b.id.startsWith('lol-'));
      const defs = seeds.concat(lol ? [lol] : []);
      defs.forEach(b => exWrap.append(h('button.exchip', { type: 'button', onclick: () => { I.setNames(b.ids.slice(0, 8).map(id => P.getFig(id).name)); ta.focus({ preventScroll: true }); } }, b.title)));
    }
    buildExamples();

    ta.addEventListener('input', () => { autosize(); parse(); });
    ta.addEventListener('blur', () => parse());
    ta.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); I.place(); } });
    root.addEventListener('mousedown', e => { if (e.target.closest('button')) e.preventDefault(); }); // keep focus in the box so a blur re-layout cannot swallow the tap
    placeBtn.addEventListener('click', () => I.place());
    function autosize() { ta.style.height = 'auto'; ta.style.height = Math.min(ta.scrollHeight + 2, I.chips.length > 12 ? 104 : 220) + 'px'; }
    P.on('quota', render); render();
    return I;
  };
})();
