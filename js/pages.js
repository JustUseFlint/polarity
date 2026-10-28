/* Pages: Explore (workspace), Board, Figure, Method, Pricing, Classroom, Account. */
(function () {
  const P = window.P, h = P.h; P.pages = {};
  const view = () => P.$('#view');
  const BOARD_THEMES = [['default', 'Default'], ['light', 'Light'], ['neon', 'Neon'], ['paper', 'Paper']];
  const defaultC = f => P.computeEra(f);

  /* ---------- shared bits ---------- */
  function figCard(fig, onClick, extra) {
    const c = defaultC(fig);
    return h('button.fcard', { type: 'button', onclick: onClick, 'aria-label': `${fig.name}, ${P.coordText(c.x, c.y)}` }, P.tokenEl(fig, { size: 52, ring: P.rgb(P.colorAt(c.x, c.y, false)), dashed: c.conf === 'Low' }), h('div.fc-n', fig.name), h('div.fc-b', fig.blurb || P.typeLabel(fig.type)), h('div.fc-c.mono', P.coordText(c.x, c.y).replace('Econ ', 'E ').replace('Social ', 'S ')), extra || null);
  }
  function boardCard(b, o) {
    o = o || {}; const figs = b.ids.map(P.getFig).filter(Boolean), items = figs.map(f => ({ fig: f, c: defaultC(f) }));
    const mini = P.miniMap(items, { cloud: items.length <= 8, label: b.title + ' mini map' });
    return h('article.bcard', h('a.bc-map', { href: '#/b/' + encodeURIComponent(b.id), 'aria-label': 'Open board ' + b.title }, mini),
      h('div.bc-t', b.title), h('p.bc-d', b.desc || ''), h('div.bc-m.muted', figs.length + ' figures'),
      h('div.bc-a', h('a.btn.sm', { href: '#/b/' + encodeURIComponent(b.id) }, 'Open'), h('button.btn.sm', { type: 'button', onclick: () => { loadBoard(b.id); } }, 'Load into map')));
  }
  function loadBoard(id) {
    const b = P.findBoard(id); if (!b) return; Object.assign(P.board, { id: b.id && !b.seed && !String(b.id).startsWith('s~') ? b.id : null, title: b.title, theme: b.theme || 'default', items: b.items.map(i => ({ id: i.id, era: i.era })) });
    P.saveDraft(); P.toast('Loaded "' + b.title + '" into the map.'); if (location.hash.startsWith('#/explore')) P.route(); else location.hash = '#/explore';
  }
  P.loadBoard = loadBoard;
  const section = (title, sub, ...kids) => h('section.sec', h('div.sec-h', h('h2', title), sub ? h('p.muted', sub) : null), ...kids);
  const page = (cls, ...kids) => { const el = h('div.page.' + cls, ...kids); view().replaceChildren(el); return el; };

  /* ---------- Explore ---------- */
  P.pages.explore = function () {
    let map, inp;
    const board = P.board;
    const ghosts = (P.trending || []).map(P.getFig).filter(Boolean).slice(0, 5);
    const titleIn = h('input.btitle', { value: board.title, 'aria-label': 'Board title', maxlength: 60, enterkeyhint: 'done', oninput: e => { board.title = e.target.value; P.saveDraft(); } });
    const themeSel = h('select.sel', { 'aria-label': 'Map style', onchange: e => { board.theme = e.target.value; P.saveDraft(); map.setTheme(e.target.value); } }, BOARD_THEMES.map(([k, l]) => h('option', { value: k, selected: board.theme === k }, l + ' style')));
    const strip = h('div.strip', { hidden: true });
    const mapRoot = h('div.map-root');
    const inRoot = h('div.in-root');
    const lolCol = P.boardsSeed.filter(b => b.collection);
    const seeds = P.boardsSeed.filter(b => !b.collection);
    const ctxFor = () => ({
      map, board, items: () => P.boardFigs(board), openFig: id => openProfile(id),
      add: id => { if (P.addToBoard(board, id, null)) { map.refresh(); renderStrip(); } },
      remove: id => { P.removeFromBoard(board, id); map.refresh(); renderStrip(); }, eraIdx: null,
    });
    const openProfile = id => { map.selectFig(id); P.openProfile(id, ctxFor()); };
    function renderStrip() {
      const items = P.boardFigs(board); strip.hidden = !items.length;
      const head = h('div.strip-h', h('b', items.length + (items.length === 1 ? ' figure' : ' figures') + ' on this board'), items.length ? h('button.link', { type: 'button', onclick: clearBoard }, 'Clear board') : null);
      const cards = items.slice(0, 40).map(it => h('div.scard', h('button.sc-b', { type: 'button', onclick: () => openProfile(it.fig.id), 'aria-label': `${it.fig.name}, ${P.coordText(it.c.x, it.c.y)}, ${it.c.conf} confidence` }, P.tokenEl(it.fig, { size: 40, ring: P.rgb(P.colorAt(it.c.x, it.c.y, false)), dashed: it.c.conf === 'Low' }), h('span.sc-t', h('span.sc-n', it.fig.name), h('span.sc-c.mono', P.coordText(it.c.x, it.c.y).replace('Econ ', 'E ').replace('Social ', 'S ')), h('span.sc-conf.c-' + it.c.conf.toLowerCase(), h('i.cdot'), it.c.conf))), h('button.sc-x', { type: 'button', 'aria-label': 'Remove ' + it.fig.name, onclick: () => { P.removeFromBoard(board, it.fig.id); map.refresh(); renderStrip(); if (P.side.kind === 'profile') P.side.close(); } }, '×')));
      strip.replaceChildren(head, h('div.strip-r', cards, items.length > 40 ? h('div.scard.more', `+${items.length - 40} more. Use Table view for the full list.`) : null));
    }
    function clearBoard() { board.items = []; P.saveDraft(); P.side.close(); map.refresh(); renderStrip(); P.toast('Board cleared.'); }
    function save() {
      if (!board.items.length) { P.toast('Place a few names first.'); return; }
      const all = P.savedBoards(); if (!board.id) board.id = 'u' + Date.now().toString(36);
      const copy = JSON.parse(JSON.stringify({ id: board.id, title: board.title || 'Untitled board', theme: board.theme, items: board.items, savedAt: Date.now() }));
      const i = all.findIndex(b => b.id === board.id); if (i >= 0) all[i] = copy; else all.unshift(copy);
      P.saveBoards(all); P.saveDraft(); P.toast('Saved on this device. Find it under Account.');
    }

    const hero = h('header.hero', h('h1', 'Put anyone on the map.'), h('p.hero-s', 'See why.'));
    const bar = h('div.boardbar', titleIn, h('div.bb-a', h('button.btn.sm', { type: 'button', onclick: save }, 'Save'), h('button.btn.sm.primary-o', { type: 'button', onclick: () => { if (!board.items.length) return P.toast('Place a few names first.'); P.openShare(board); } }, 'Share')));
    const ws = h('div.workspace', bar, mapRoot, h('div.ws-meta', themeSel, h('button.info-btn', { type: 'button', onclick: () => P.openModal('About the tokens and the clouds', infoBody()) }, 'ⓘ How to read this map')), inRoot, strip);
    const trending = section('Trending now', 'Tap a card for the profile, then add it to your board.', h('div.hrow', (P.trending || []).map(P.getFig).filter(Boolean).slice(0, 14).map(f => figCard(f, () => P.openProfile(f.id, ctxFor())))));
    const boardsSec = section('Boards to try', 'Load one into the map, or open it on its own page.', h('div.bgrid', seeds.map(b => boardCard(b))));
    const lolSec = lolCol.length ? section('League of Legends by region', 'Every champion has a position inferred from lore, not a quote. Most clouds are wide on purpose.',
      h('div.lol-act', h('button.btn.primary', { type: 'button', onclick: async e => { const b = e.currentTarget; b.disabled = true; b.textContent = 'Placing…'; await P.sleep(30); P.lolIds.forEach(id => P.addToBoard(board, id, null)); board.title = 'All League of Legends champions'; P.saveDraft(); P.toast(`Placed ${P.lolIds.length} champions.`); P.route(); } }, `All champions (${P.lolIds.length})`), h('span.muted', 'Places the whole roster on the map in one tap.')),
      h('div.bgrid', lolCol.map(b => boardCard(b)))) : null;
    page('explore', hero, ws, trending, boardsSec, lolSec);

    map = P.createMap(mapRoot, { getItems: () => P.boardFigs(board), board, theme: board.theme, ghosts, interactive: true, onToken: id => openProfile(id), onCell: (r, c) => P.openCell(r, c, ctxFor()), onEra: () => { renderStrip(); if (P.side.kind === 'profile') { const fid = map.sel; if (fid) P.openProfile(fid, ctxFor()); } } });
    inp = P.createInput(inRoot, { getBoard: () => board, map: () => map, onChange: (ids, partial) => { renderStrip(); if (!partial) map.refresh(); } });
    renderStrip();
    const offP = P.on('panel', () => setTimeout(() => map && map.layout(), 340));
    P.explore = { map, inp, board };
    return () => { offP(); map.destroy && map.destroy(); P.explore = null; if (P.side.kind) P.side.close(true); };
  };
  function infoBody() {
    return h('div.info', h('p', h('b', 'Photos and tokens. '), 'Real people get a free-licensed photo from Wikimedia Commons when one exists, with credit. Fictional characters get a designed token: initials, a franchise colour and a role symbol. We do not use official character art or logos.'),
      h('p', h('b', 'The cloud. '), 'The soft glow around a token is how sure the placement is. Small and tight means many direct, sourced answers. Big and wide means thin or inferred evidence.'),
      h('p', h('b', 'Dashed ring. '), 'Low confidence, or an estimate from public data instead of the 24 questions.'),
      h('p', h('a', { href: '#/method', onclick: () => P.closeModal() }, 'Read the full method →')));
  }

  /* ---------- Board page ---------- */
  P.pages.board = function (id) {
    const b = P.findBoard(decodeURIComponent(id));
    if (!b) { page('narrow', h('h1', 'Board not found'), h('p.muted', 'That link did not resolve to a board on this device or in the seed set.'), h('a.btn.primary', { href: '#/explore' }, 'Back to the map')); return; }
    const mapRoot = h('div.map-root'); let map;
    const items = () => P.boardFigs(b);
    const ctx = () => ({ map, board: b, items, openFig: fid => { map.selectFig(fid); P.openProfile(fid, ctx()); }, add: null, remove: null });
    const grid = h('table.dt.flat', h('caption', 'Figures on this board'), h('thead', h('tr', ['Name', 'Type', 'Coordinates', 'Confidence'].map(x => h('th', { scope: 'col' }, x)))), h('tbody', items().map(it => h('tr', h('th', { scope: 'row' }, h('a', { href: '#/figure/' + encodeURIComponent(it.fig.id) }, it.fig.name)), h('td', P.typeLabel(it.fig.type)), h('td.mono', P.coordText(it.c.x, it.c.y)), h('td', it.c.conf)))));
    page('board', h('header.bhead', h('div.kick', 'Board'), h('h1', b.title), b.desc ? h('p.muted.lead', b.desc) : null, h('div.bb-a', h('button.btn.primary', { type: 'button', onclick: () => { Object.assign(P.board, { id: null, title: b.title, theme: b.theme || 'default', items: b.items.map(i => ({ id: i.id, era: i.era })) }); P.saveDraft(); location.hash = '#/explore'; } }, 'Open in map'), h('button.btn', { type: 'button', onclick: () => P.openShare(b) }, 'Share & export'))), mapRoot, section('Figures', null, h('div.tscroll', grid)));
    map = P.createMap(mapRoot, { getItems: items, board: b, theme: b.theme || 'default', empty: false, onToken: fid => { map.selectFig(fid); P.openProfile(fid, ctx()); }, onCell: (r, c) => P.openCell(r, c, ctx()), onEra: () => { } });
    const offP = P.on('panel', () => setTimeout(() => map && map.layout(), 340));
    return () => { offP(); map.destroy && map.destroy(); if (P.side.kind) P.side.close(true); };
  };

  /* ---------- Figure page ---------- */
  P.pages.figure = function (id) {
    const fig = P.getFig(decodeURIComponent(id));
    if (!fig) { page('narrow', h('h1', 'Figure not found'), h('p.muted', 'This figure is not in the cache on this device. Type the name on the map to research it.'), h('a.btn.primary', { href: '#/explore' }, 'Back to the map')); return; }
    let eraIdx = fig.eras.length - 1;
    const body = h('div.fig-body');
    const draw = () => {
      const c = P.computeEra(fig, eraIdx), det = P.figureDetail(fig, eraIdx, { page: true, refresh: draw, onEra: i => { eraIdx = i; draw(); } });
      const others = P.figs.filter(f => f.id !== fig.id).map(f => { const cc = defaultC(f); return { f, cc, d: Math.hypot(cc.x - c.x, cc.y - c.y) + (f.type === fig.type ? 0 : 1.2) }; }).sort((a, b) => a.d - b.d).slice(0, 6);
      body.replaceChildren(det, section('Often compared with', 'Closest placements on the map.', h('div.hrow', others.map(o => figCard(o.f, () => { location.hash = '#/figure/' + encodeURIComponent(o.f.id); })))),
        section('Place more figures', null, h('div.cta-row', h('button.btn.primary', { type: 'button', onclick: () => { P.addToBoard(P.board, fig.id, eraIdx); P.toast(fig.name + ' added to your board.'); location.hash = '#/explore'; } }, 'Add to my board'), h('a.btn', { href: '#/explore' }, 'Open the map'))));
    };
    page('figure', h('header.fhead', h('div.kick', 'Figure'), h('h1', `${fig.name} on the political map: positions and sources`)), body); draw();
    P.ensurePhoto(fig); const off = P.on('photo', i => { if (i === fig.id) draw(); });
    document.title = `${fig.name} on the political map · Polarity`;
    return () => { off(); };
  };

  /* ---------- Method ---------- */
  P.pages.method = function () {
    const qList = ax => h('ol.qlist', P.Q[ax].map(q => h('li', h('div.q-t', q.text), h('div.q-ends.muted', h('span', '−2 ', q.left), h('span', '+2 ', q.right)))));
    page('prose', h('header', h('div.kick', 'Method'), h('h1', 'How a placement works'), h('p.lead', 'A position is an evidence-weighted summary, not a verdict. Here is exactly what the map does, and what it cannot do.')),
      h('section', h('h2', 'The map'), h('p', 'Left to right is the economy: state-led on the left, market-led on the right. Bottom to top is social control: libertarian at the bottom, authoritarian at the top. Each of the 100 tiles covers a 2 × 2 block of the −10 to +10 scale. Tap any tile for the views, ideologies, and the best case each side makes for it, written to the same length and tone.')),
      h('section', h('h2', 'The 24 questions'), h('p', P.Q.method || 'Each figure is scored from −2 to +2 on twelve economic and twelve social questions. Unknown stays unknown; it is never guessed silently. A position is the average of answered scores, scaled to the ±10 map.'), h('details', h('summary', 'Economic questions (12)'), qList('econ')), h('details', h('summary', 'Social questions (12)'), qList('social'))),
      h('section', h('h2', 'Confidence and the cloud'), h('p', 'The cloud is the honest uncertainty. Its size comes from how many answers we have, with answers that are only inferred counting half, and from how much the answers disagree with each other.'),
        h('ul', h('li', h('b', 'High'), ': 14 or more direct (non-inferred) answers.'), h('li', h('b', 'Medium'), ': 7 to 13 direct answers.'), h('li', h('b', 'Low'), ': fewer than 7 direct answers. Still placed; the cloud is wide.'), h('li', h('b', 'No stated views on this axis'), ': if a figure has no answers on one axis, the token sits at 0 on that axis with a very wide cloud along it, and is marked Low.'))),
      h('section#inferred', h('h2', 'Inferred from lore'), h('p', 'Fictional characters do not state political views. Where an answer comes from their role, faction, and what they do in the story, it carries an "Inferred" badge and counts half toward the cloud. Most League of Legends champions are almost entirely inferred, so their clouds are large and their labels read Low. Read those placements as an interpretation, not a quote. A short lore note under "Why here" says what the reading is based on.')),
      h('section#tokens', h('h2', 'Photos and designed tokens'), h('p', 'Real people get a photo from Wikimedia Commons when a free-licensed one exists, credited with its author and license. Fictional and game characters get a designed token: their initials, a franchise colour, and a role symbol. We do not use official art, screenshots, or logos, because their licenses do not allow it. If you wanted actual character pictures, that is the one place this app deliberately says no.')),
      h('section', h('h2', 'Names we do not know yet'), h('p', 'This site has no server. A name is resolved in this order: (1) the seed cache that ships with the app, (2) a live lookup against Wikipedia, Wikidata and Commons from your browser, and (3) an optional AI scorer using your own API key (Account → Deep research; untested). A live lookup that only finds a party or ideology gives a labeled Low-confidence estimate, not a 24-question score. Private individuals and minors are declined. A name that cannot be resolved says "No match found".')),
      h('section', h('h2', 'Disagree?'), h('p', 'Every answer row has a "Disagree?" link. In this static build it saves your proposed score and source as "Under review" on your own device. Nothing is sent anywhere, and the seed positions do not change.')),
      h('section', h('h2', 'Limits'), h('ul', h('li', 'Seed placements were prepared ahead of time and ship with the app. They are estimates with sources, not a validated measurement or a peer-reviewed instrument.'), h('li', 'Two axes cannot hold everything. A position says where the evidence sits on these two questions of economy and social control, not whether anyone is right.'), h('li', 'We do not use judgment words like "extreme" or "dangerous". The map shows position and evidence only.'))));
  };

  /* ---------- Pricing ---------- */
  P.pages.pricing = function () {
    const plan = (name, price, lines, cta, hl) => h('article.plan' + (hl ? '.hl' : ''), h('h2', name), h('div.price', price), h('ul', lines.map(l => h('li', l))), cta);
    page('prose.wide', h('header', h('div.kick', 'Pricing'), h('h1', 'Free for everything you need'), h('p.lead', 'There are no payments in this build and nothing sits behind a paywall. The plans below describe where the limits would go.')),
      h('div.plans', plan('Free', '$0', ['10 new placements per day', 'Cached figures are always free', 'All 100 tiles and every profile', 'PNG export with a small watermark', 'Saved boards on this device'], h('a.btn.primary', { href: '#/explore' }, 'Open the map'), true),
        plan('Pro', 'Coming soon', ['More new placements per day', 'Watermark-free images', 'Video export of a board', 'Priority research queue'], h('button.btn', { disabled: true }, 'Not available yet')),
        plan('Classroom', 'Coming soon', ['Shared class boards', 'Discussion prompts per era', 'Printable handouts'], h('a.btn', { href: '#/class' }, 'See the classroom idea'))),
      h('p.muted.small', 'The daily limit is stored in your browser, so it resets at local midnight and can be cleared in Account. It is a product concept, not security.'));
  };

  /* ---------- Classroom ---------- */
  P.pages.class = function () {
    const lessons = [['history', 'Compare eras', 'Place figures from one period and ask what changed between the left and right of the map.', ['Who moved when the era switch was used?', 'What sources would change a position?']], ['econ', 'Argue the best case', 'Open a tile and read both supporters and critics. Have students restate each in their own words.', ['Which side is easier to state fairly?', 'What would you ask each side?']], ['fiction', 'Read a fictional character', 'Place a character and open "Why here". Inferred answers are marked so students can see what is interpretation.', ['What evidence would settle a disputed answer?', 'Why is the cloud so wide?']]];
    const seedFor = i => P.boardsSeed.filter(b => !b.collection)[i];
    page('prose.wide', h('header', h('div.kick', 'Classroom'), h('h1', 'A map for discussion, not for scoring people'), h('p.lead', 'Polarity works well as a conversation starter. No student accounts, no tracking: boards live on each device and can be shared by link.')),
      h('div.lessons', lessons.map((l, i) => h('article.lesson', h('h2', l[1]), h('p', l[2]), h('ul', l[3].map(q => h('li', q))), seedFor(i) ? h('button.btn', { type: 'button', onclick: () => loadBoard(seedFor(i).id) }, 'Load "' + seedFor(i).title + '"') : null))),
      h('div.cta-row', h('button.btn', { type: 'button', onclick: () => window.print() }, 'Print this page'), h('a.btn.primary', { href: '#/explore' }, 'Open the map')));
  };

  /* ---------- Account ---------- */
  P.pages.account = function () {
    const root = page('narrow.account'); const st = P.settings();
    function draw() {
      const boards = P.savedBoards(), ex = P.store.get('exports', []), live = Object.keys(P.live || {}).length;
      const aiForm = h('form.aiform', { onsubmit: e => { e.preventDefault(); const fd = new FormData(e.target); P.store.set('settings', Object.assign(P.settings(), { aiOn: fd.get('on') === 'on', endpoint: fd.get('endpoint').trim(), model: fd.get('model').trim(), key: fd.get('key').trim() })); P.toast('Saved on this device.'); } },
        h('label.check', h('input', { type: 'checkbox', name: 'on', checked: st.aiOn }), ' Use my own AI key for names the lookup cannot score'),
        h('label', 'Endpoint', h('input', { name: 'endpoint', value: st.endpoint, type: 'url', inputmode: 'url' })), h('label', 'Model', h('input', { name: 'model', value: st.model })), h('label', 'API key', h('input', { name: 'key', value: st.key, type: 'password', autocomplete: 'off', placeholder: 'sk-…' })),
        h('p.warn', 'Your key is stored in this browser\'s localStorage in plain text and is sent directly to the endpoint you enter. Anyone with access to this device or an extension that reads page data could see it. Use a key with a spending limit. This path is untested in this build.'), h('button.btn.primary', { type: 'submit' }, 'Save settings'));
      root.replaceChildren(h('header', h('div.kick', 'Account'), h('h1', 'Your device'), h('p.lead', 'Accounts are not enabled in this static build. Everything below is saved in this browser only.')),
        section('Saved boards', null, boards.length ? h('div.blist', boards.map(b => h('div.brow', h('div', h('div.b-t', b.title), h('div.muted.small', b.items.length + ' figures · saved ' + new Date(b.savedAt || Date.now()).toLocaleDateString())), h('div.b-a', h('button.btn.sm', { type: 'button', onclick: () => { loadBoard(b.id); } }, 'Open'), h('button.btn.sm', { type: 'button', onclick: () => { const n = prompt('Rename board', b.title); if (n) { b.title = n.slice(0, 60); P.saveBoards(boards); draw(); } } }, 'Rename'), h('button.btn.sm', { type: 'button', onclick: () => { P.saveBoards(boards.filter(x => x.id !== b.id)); draw(); } }, 'Delete'))))) : h('p.muted', 'No saved boards yet. Place a few names and tap Save.')),
        section('Export history', null, ex.length ? h('ul.log', ex.slice(0, 10).map(e => h('li', h('span.mono', new Date(e.ts).toLocaleString()), ` · ${e.title} · ${e.format} · ${e.n} figures`))) : h('p.muted', 'No exports yet.')),
        section('Today', null, h('p', `${P.quotaUsed()} of ${P.FREE_LIMIT} free new placements used. ${live} live-researched figures cached on this device.`)),
        section('Deep research (optional)', 'Score names with an AI model using your own key.', aiForm),
        section('Data', null, h('button.btn', { type: 'button', onclick: () => { if (confirm('Delete all Polarity data on this device (boards, live figures, settings, disputes)?')) { Object.keys(localStorage).filter(k => k.startsWith('polarity.')).forEach(k => localStorage.removeItem(k)); location.hash = '#/explore'; location.reload(); } } }, 'Reset all local data')));
    }
    draw();
  };
})();
