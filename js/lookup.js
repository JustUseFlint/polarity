/* Live lookup (Wikidata / Wikipedia / Commons, all CORS-enabled) + optional user-supplied AI scoring. */
(function () {
  const P = window.P;
  const WD = 'https://www.wikidata.org/w/api.php';
  const WP = 'https://en.wikipedia.org/w/api.php';
  const COMMONS = 'https://commons.wikimedia.org/w/api.php';

  async function api(base, params, timeout) {
    const url = base + '?' + new URLSearchParams(Object.assign({ format: 'json', origin: '*' }, params));
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), timeout || 14000);
    try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    finally { clearTimeout(t); }
  }
  const claimIds = (ent, prop) => ((ent.claims || {})[prop] || []).map(c => c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value && c.mainsnak.datavalue.value.id).filter(Boolean);
  const claimTime = (ent, prop) => { const c = ((ent.claims || {})[prop] || [])[0]; const v = c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value; return v && v.time ? parseInt(v.time.slice(0, 5), 10) : null; };
  const claimStr = (ent, prop) => { const c = ((ent.claims || {})[prop] || [])[0]; const v = c && c.mainsnak && c.mainsnak.datavalue && c.mainsnak.datavalue.value; return typeof v === 'string' ? v : null; };
  const sitelinkCount = ent => Object.keys(ent.sitelinks || {}).filter(k => /wiki$/.test(k) && !/^(commons|species|meta|wikidata)/.test(k)).length;
  const BAD_DESC = /disambiguation|wikimedia (list|category|template)|list of|given name|family name|surname|male name|female name|\b(album|song|single|episode|country|city|town|village|municipality|province|county|river|island|mountain|species|genus|football club|sports team|musical group|rock band|film series|video game series|television series|television episode|company|business enterprise)\b/i;

  async function labelsFor(ids) {
    const out = {}; const u = [...new Set(ids)];
    for (let i = 0; i < u.length; i += 45) {
      const d = await api(WD, { action: 'wbgetentities', ids: u.slice(i, i + 45).join('|'), props: 'labels', languages: 'en' });
      for (const id in (d.entities || {})) out[id] = ((d.entities[id].labels || {}).en || {}).value || id;
    }
    return out;
  }

  /* ---- step 1+2: search + rank candidates ---- */
  async function findCandidates(name) {
    let ids = [];
    const s = await api(WD, { action: 'wbsearchentities', search: name, language: 'en', uselang: 'en', type: 'item', limit: 8 });
    ids = (s.search || []).map(x => x.id);
    if (!ids.length) {
      const o = await api(WP, { action: 'opensearch', search: name, limit: 5, namespace: 0 });
      const titles = (o[1] || []).slice(0, 5);
      if (titles.length) {
        const q = await api(WP, { action: 'query', prop: 'pageprops', ppprop: 'wikibase_item', titles: titles.join('|'), redirects: 1 });
        ids = Object.values((q.query && q.query.pages) || {}).map(p => p.pageprops && p.pageprops.wikibase_item).filter(Boolean);
      }
    }
    if (!ids.length) return [];
    const d = await api(WD, { action: 'wbgetentities', ids: ids.join('|'), props: 'labels|descriptions|aliases|sitelinks', languages: 'en' });
    const k = P.norm(name);
    const cands = ids.map(id => d.entities && d.entities[id]).filter(Boolean).map(e => {
      const label = (e.labels && e.labels.en && e.labels.en.value) || e.id, desc = (e.descriptions && e.descriptions.en && e.descriptions.en.value) || '';
      const al = ((e.aliases || {}).en || []).map(a => P.norm(a.value));
      return { qid: e.id, label, desc, sitelinks: sitelinkCount(e), exact: P.norm(label) === k || al.includes(k) };
    }).filter(c => c.desc && !BAD_DESC.test(c.desc) || (c.desc && /character|fictional/i.test(c.desc)));
    cands.sort((a, b) => (b.exact - a.exact) || (b.sitelinks - a.sitelinks));
    return cands;
  }

  /* ---- step 3: entity data -> figure ---- */
  async function stripHtml(h) { const d = document.createElement('div'); d.innerHTML = h || ''; return (d.textContent || '').replace(/\s+/g, ' ').trim(); }
  P.fetchPhoto = async function (file) {
    const d = await api(COMMONS, { action: 'query', prop: 'imageinfo', iiprop: 'url|extmetadata', iiurlwidth: 256, titles: 'File:' + file });
    const pg = Object.values((d.query && d.query.pages) || {})[0]; const ii = pg && pg.imageinfo && pg.imageinfo[0];
    if (!ii || !ii.thumburl) return null;
    const m = ii.extmetadata || {};
    return { thumb: ii.thumburl, page: ii.descriptionurl || ('https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file)),
      artist: await stripHtml((m.Artist || {}).value) || 'Unknown author', license: (m.LicenseShortName || {}).value || 'See file page', licenseUrl: (m.LicenseUrl || {}).value || '', file };
  };
  P.ensurePhoto = async function (fig) {
    if (fig.photo || fig.photoTried || !fig.wikidata || fig.type === 'fictional') return;
    fig.photoTried = true;
    try {
      const d = await api(WD, { action: 'wbgetentities', ids: fig.wikidata, props: 'claims' });
      const file = claimStr(d.entities[fig.wikidata], 'P18');
      if (file) { fig.photo = await P.fetchPhoto(file); if (fig.origin === 'live') P.saveLive(); P.emit('photo', fig.id); }
    } catch (e) { /* offline: monogram stays */ }
  };
  async function summarySentence(title) {
    try {
      const r = await fetch('https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent(title.replace(/ /g, '_')));
      if (!r.ok) return '';
      const j = await r.json(); const t = (j.extract || '').trim();
      const m = t.match(/^(.{40,}?[.!?])(\s|$)/); return (m ? m[1] : t).slice(0, 260);
    } catch (e) { return ''; }
  }
  const SYMBOLS_FOR = [[/king|queen|monarch|emperor|prince|princess|ruler/, 'crown'], [/wizard|mage|witch|sorcer/, 'wand'], [/knight|warrior|soldier|fighter|swordsman|samurai/, 'sword'], [/robot|android|cyborg|machine/, 'gear'], [/pirate|sailor/, 'anchor'], [/detective|spy/, 'eye'], [/scientist|doctor|inventor|engineer/, 'flask'], [/villain|antagonist|demon|monster/, 'skull'], [/hero|superhero/, 'shield'], [/astronaut|pilot/, 'rocket']];
  function hslHex(h, s, l) { s /= 100; l /= 100; const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l), f = n => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1)); return '#' + [f(0), f(8), f(4)].map(x => Math.round(x * 255).toString(16).padStart(2, '0')).join(''); }
  function tokenFor(label, universe, roles) {
    const h = P.hash(universe || label); const hue = h % 360;
    const color = hslHex(hue, 62, 52);
    let symbol = null; const r = (roles || []).join(' ').toLowerCase();
    for (const [re, s] of SYMBOLS_FOR) if (re.test(r)) { symbol = s; break; }
    if (!symbol) symbol = (P.SYMBOL_KEYS || ['star'])[P.hash(label) % (P.SYMBOL_KEYS || ['star']).length];
    return { color, symbol };
  }

  async function buildFigure(qid, hintName, progress) {
    progress(0.45, 'Reading Wikidata');
    const d = await api(WD, { action: 'wbgetentities', ids: qid, props: 'claims|labels|descriptions|sitelinks', languages: 'en' });
    const ent = d.entities && d.entities[qid]; if (!ent) throw new Error('Entity not found');
    const label = (ent.labels && ent.labels.en && ent.labels.en.value) || hintName, desc = (ent.descriptions && ent.descriptions.en && ent.descriptions.en.value) || '';
    const props = { inst: claimIds(ent, 'P31'), occ: claimIds(ent, 'P106'), party: claimIds(ent, 'P102'), ideo: claimIds(ent, 'P1142'), align: claimIds(ent, 'P1387'), univ: claimIds(ent, 'P1080').concat(claimIds(ent, 'P1441').slice(0, 1)), pos: claimIds(ent, 'P39') };
    const all = [].concat(...Object.values(props));
    progress(0.6, 'Reading labels');
    const L = await labelsFor(all);
    const lab = k => props[k].map(i => L[i]).filter(Boolean);
    const instL = lab('inst').join(' | ').toLowerCase();
    const fictional = /character|fictional|mascot|protagonist|villain|antagonist/.test(instL) || props.univ.length > 0 && !/human/.test(instL);
    const human = props.inst.includes('Q5') || /(^|\| )human($| \|)/.test(instL);
    const sl = sitelinkCount(ent);
    const nowYear = new Date().getFullYear();
    const birth = claimTime(ent, 'P569'), death = claimTime(ent, 'P570');
    if (!fictional && !human) return { kind: 'declined', reason: 'That match is a ' + (desc || 'thing') + ', not a person or a character. Polarity places public figures and fictional characters only.' };
    if (!fictional) {
      if (!death && birth && nowYear - birth < 18) return { kind: 'declined', reason: 'Minors are never placed. Public figures and fictional characters only.' };
      if (sl < 5) return { kind: 'declined', reason: 'Public figures and fictional characters only. This person does not have a substantial public record.' };
    }
    let type = 'fictional';
    if (!fictional) {
      const occ = lab('occ').join(' ').toLowerCase();
      if (death && death < 1980) type = 'historical';
      else if (props.party.length || props.pos.length || /politician|statesperson|president|prime minister|diplomat|monarch|senator|governor|mayor/.test(occ)) type = 'politician';
      else type = 'public';
    }
    progress(0.75, 'Looking for a free photo');
    let photo = null;
    if (!fictional) { try { const f = claimStr(ent, 'P18'); if (f) photo = await P.fetchPhoto(f); } catch (e) { } }
    const wikiTitle = ent.sitelinks && ent.sitelinks.enwiki ? ent.sitelinks.enwiki.title : null;
    progress(0.85, 'Estimating from public data');
    const sig = [].concat(P.matchSignals('ideology', lab('ideo')), P.matchSignals('party', lab('party')), P.matchSignals('align', lab('align')));
    const comb = P.combineSignals(sig);
    let est;
    if (!comb) est = { x: 0, y: 0, rx: 7, ry: 7, unscored: true, notes: ['No usable ideology, party or alignment data found on Wikidata. Centred with the widest cloud; this is not a measured position.'], signals: [] };
    else {
      const notes = ['Estimated from public data (party/ideology). Not a full 24-question evidence score.'];
      est = { x: comb.x == null ? 0 : comb.x, y: comb.y == null ? 0 : comb.y, rx: comb.x == null ? 11 : comb.rx, ry: comb.y == null ? 11 : comb.ry, notes, signals: sig.map(s => ({ kind: s.kind, label: s.label, name: s.name, x: s.x, y: s.y })) };
      if (comb.x == null) notes.push('Economic axis: no stated views on this axis'); if (comb.y == null) notes.push('Social axis: no stated views on this axis');
    }
    let blurb = desc ? desc.charAt(0).toUpperCase() + desc.slice(1) : '';
    const sent = wikiTitle ? await summarySentence(wikiTitle) : '';
    const universe = props.univ.map(i => L[i]).filter(Boolean)[0] || '';
    const fig = {
      id: 'live-' + qid, name: label, aliases: [hintName].filter(x => x && P.norm(x) !== P.norm(label)), type, blurb, extract: sent,
      wikipedia: wikiTitle, wikidata: qid, universe, photo, origin: 'live', estimateSignals: est.signals,
      eras: [{ label: 'Estimate', est }],
    };
    if (fictional) fig.token = tokenFor(label, universe, lab('occ').concat([desc]));
    progress(0.95, 'Done');
    return { kind: 'placed', fig };
  }

  P.lookup = {
    /** Full pipeline. Returns {kind: placed|choice|declined|nomatch|error} */
    async research(name, progress) {
      progress = progress || (() => { });
      try {
        progress(0.1, 'Searching Wikidata');
        const cands = await findCandidates(name);
        if (!cands.length) {
          const ai = await maybeAI(name, null, progress); if (ai) return ai;
          return { kind: 'nomatch', reason: 'No match found. Check the spelling, or try the full name.' };
        }
        progress(0.3, 'Ranking matches');
        const top = cands[0], second = cands[1];
        const clear = cands.length === 1 || (top.exact && (!second || top.sitelinks >= 2.5 * second.sitelinks));
        if (!clear) return { kind: 'choice', choices: cands.slice(0, 5).map(c => ({ qid: c.qid, label: c.label, desc: c.desc, sitelinks: c.sitelinks })) };
        return await P.lookup.resolve(top.qid, name, progress);
      } catch (e) {
        return { kind: 'error', reason: 'Could not reach Wikipedia/Wikidata (' + (e.name === 'AbortError' ? 'timed out' : e.message) + '). Check your connection and try again.' };
      }
    },
    async resolve(qid, name, progress) {
      progress = progress || (() => { });
      try {
        const known = P.byId.get('live-' + qid); if (known) return { kind: 'placed', fig: known, cached: true };
        const r = await buildFigure(qid, name, progress);
        if (r.kind === 'placed') { const ai = await maybeAI(name || r.fig.name, r.fig, progress); if (ai && ai.kind === 'placed') return ai; if (ai && ai.warn) r.warn = ai.warn; }
        return r;
      } catch (e) { return { kind: 'error', reason: 'Could not read that entry (' + e.message + ').' }; }
    },
  };

  /* ---- optional AI scoring (user's own key, OpenAI-compatible chat completions). UNTESTED without a key. ---- */
  async function maybeAI(name, fig, progress) {
    const st = P.settings(); if (!st.aiOn || !st.key) return null;
    progress(0.9, 'Deep research (AI)');
    try {
      const res = await P.aiScore(name, fig, st);
      if (res.declined) return fig ? { kind: 'placed', fig, warn: 'AI scorer declined: ' + res.declined } : { kind: 'declined', reason: res.declined };
      const base = fig || P.normFig({ id: 'ai-' + P.norm(name).replace(/ /g, '-'), name: res.name || name, type: res.type, blurb: res.identity || '', origin: 'live', eras: [{ label: 'x', answers: {} }] }, 'live');
      const era = { label: 'AI-scored (unverified)', answers: res.answers };
      const out = Object.assign({}, base, { ai: true, origin: 'live', eras: [era] });
      delete out._c;
      const nf = P.normFig(out, 'live'); nf.ai = true; nf.origin = 'live';
      if (!nf.blurb && res.identity) nf.blurb = res.identity;
      if (nf.type === 'fictional' && !nf.token) nf.token = tokenFor(nf.name, nf.universe || res.universe || '', []);
      P.byId.delete(base.id);
      return { kind: 'placed', fig: nf };
    } catch (e) {
      return fig ? { kind: 'placed', fig, warn: 'Deep research failed: ' + e.message + ' (a browser may block this call, or the key/endpoint is wrong). Showing the public-data estimate instead.' }
        : { kind: 'error', reason: 'Deep research failed: ' + e.message + ' (the endpoint may not allow browser requests).' };
    }
  }
  P.aiScore = async function (name, fig, st) {
    const qs = P.Q.econ.concat(P.Q.social).map(q => `${q.id} (${q.id[0] === 'e' ? 'economic: -2 = ' + q.left + '; +2 = ' + q.right : 'social: -2 = ' + q.left + '; +2 = ' + q.right}): ${q.text}`).join('\n');
    const sys = 'You are a careful research assistant for Polarity, a political-map app. Score ONE public figure or fictional character on the 24 questions below, each -2..+2 (integers) or null when there is no good evidence. Use the same rules for everyone regardless of party: votes and official actions first, then laws signed, platforms, direct quotes, then credible analysis; for fiction use canon actions and stated beliefs. Never guess private information. If the name is a private individual or a minor, return {"declined":"reason"}. Reply with STRICT JSON only: {"declined":null,"type":"politician|historical|public|fictional","name":"...","identity":"one line","universe":"for fiction","answers":{"e1":{"s":1,"ev":"evidence in your own words","src":["https://..."]},...,"s12":{"s":null}}}. Sources are suggestions and may be wrong; include only URLs you are confident exist.\n\nQuestions:\n' + qs;
    const ctx = fig ? `${fig.name} (${fig.blurb || fig.type}${fig.universe ? ', ' + fig.universe : ''})` : name;
    const url = st.endpoint.replace(/\/+$/, '') + '/chat/completions';
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 60000);
    let r;
    try {
      r = await fetch(url, { method: 'POST', signal: ctl.signal, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + st.key },
        body: JSON.stringify({ model: st.model, temperature: 0.2, response_format: { type: 'json_object' }, messages: [{ role: 'system', content: sys }, { role: 'user', content: 'Score: ' + ctx }] }) });
    } catch (e) { throw new Error(e.name === 'AbortError' ? 'timed out' : 'network/CORS error'); } finally { clearTimeout(t); }
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json(); let txt = ((j.choices || [])[0] || {}).message && j.choices[0].message.content || '';
    txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
    let o; try { o = JSON.parse(txt); } catch (e) { throw new Error('model did not return valid JSON'); }
    if (o.declined) return { declined: String(o.declined) };
    const answers = {};
    P.Q.econ.concat(P.Q.social).forEach(q => {
      const a = (o.answers || {})[q.id]; let s = a && a.s; s = (s == null || isNaN(+s)) ? null : P.clamp(Math.round(+s), -2, 2);
      answers[q.id] = { s, ev: s == null ? '' : String((a && a.ev) || '').slice(0, 300), src: (a && Array.isArray(a.src) ? a.src : []).filter(u => /^https?:\/\//.test(u)).slice(0, 3), ai: true };
    });
    if (!Object.values(answers).some(a => a.s != null)) throw new Error('model returned no scores');
    return { answers, type: o.type, name: o.name, identity: o.identity, universe: o.universe };
  };
})();
