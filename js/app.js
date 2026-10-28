/* Router, theme, menu, boot. */
(function () {
  const P = window.P, h = P.h; let cleanup = null, ready = false;
  const SUN = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><circle cx="12" cy="12" r="4.2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  const MOON = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M20 14.5A8 8 0 019.5 4a8 8 0 1010.5 10.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>';
  function setTheme(t, persist) {
    document.documentElement.dataset.theme = t; if (persist) P.store.set('theme', t);
    const b = P.$('#themeBtn'); b.innerHTML = t === 'dark' ? SUN : MOON; b.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    const m = document.querySelector('meta[name=theme-color]'); if (m) m.content = t === 'dark' ? '#0B0D12' : '#F7F7FA';
    P.emit('theme', t);
  }
  P.route = function () {
    if (!ready) return;
    const hash = location.hash.replace(/^#/, '') || '/'; const parts = hash.split('/').filter(Boolean); let name = parts[0] || 'explore', arg = parts.slice(1).join('/');
    if (name === 'b') name = 'board'; if (name === 'class') name = 'class';
    const fn = P.pages[name] || P.pages.explore; if (!P.pages[name]) name = 'explore';
    if (cleanup) { try { cleanup(); } catch (e) { console.error(e); } cleanup = null; }
    document.title = 'Polarity — Put anyone on the map. See why.';
    P.$('#nav').classList.remove('open'); P.$('#menuBtn').setAttribute('aria-expanded', 'false');
    P.$$('#nav a').forEach(a => { const on = a.dataset.nav === name; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    document.body.dataset.page = name;
    try { cleanup = fn(arg) || null; } catch (e) { console.error(e); P.$('#view').replaceChildren(h('div.page.narrow', h('h1', 'Something went wrong'), h('p.muted', 'The page failed to draw. Reloading usually fixes it.'))); }
    if (!P.__first) { P.__first = true; } else { window.scrollTo(0, 0); }
  };
  addEventListener('hashchange', () => P.route());
  async function boot() {
    const saved = P.store.get('theme', null);
    setTheme(saved || 'dark', false);
    P.$('#themeBtn').addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark', true));
    P.$('#menuBtn').addEventListener('click', () => { const n = P.$('#nav'), o = !n.classList.contains('open'); n.classList.toggle('open', o); P.$('#menuBtn').setAttribute('aria-expanded', o); });
    document.addEventListener('click', e => { if (!e.target.closest('#nav') && !e.target.closest('#menuBtn')) P.$('#nav').classList.remove('open'); });
    const view = P.$('#view'); view.innerHTML = '<div class="page narrow"><p class="muted">Loading the map…</p></div>';
    try { await P.loadData(); } catch (e) { console.error(e); view.innerHTML = '<div class="page narrow"><h1>Could not load data</h1><p class="muted">Open this site over http (python3 -m http.server), not file://.</p></div>'; return; }
    ready = true; if (!location.hash || location.hash === '#/') history.replaceState(null, '', '#/explore'); P.route();
    P.ready = true; document.documentElement.dataset.ready = '1';
  }
  boot();
})();
