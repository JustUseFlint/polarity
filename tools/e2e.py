"""Polarity end-to-end walk. Run: python3 -m http.server 8765 (in repo root), then python3 tools/e2e.py
Needs: pip install playwright && playwright install chromium. Real network is used for live lookups."""
import json, sys, time, os
from playwright.sync_api import sync_playwright, expect
BASE = os.environ.get('BASE', 'http://localhost:8765/index.html')
SHOTS = os.path.join(os.path.dirname(__file__), '..', 'shots'); os.makedirs(SHOTS, exist_ok=True)
errors, notes = [], []
def shot(pg, name, full=False):
    pg.wait_for_timeout(450); pg.screenshot(path=f'{SHOTS}/{name}.png', full_page=full); notes.append(name)
def overflow(pg, label):
    w = pg.evaluate("[document.documentElement.scrollWidth, innerWidth]")
    if w[0] > w[1] + 1: errors.append(f'H-SCROLL {label}: {w}')
def attach(pg, tag):
    pg.on('console', lambda m: errors.append(f'[{tag}] console.{m.type}: {m.text}') if m.type == 'error' else None)
    pg.on('pageerror', lambda e: errors.append(f'[{tag}] pageerror: {e}'))
def boot(pg, hash_='#/explore'):
    pg.goto(BASE + hash_); pg.wait_for_selector('html[data-ready="1"]', state='attached', timeout=20000); pg.wait_for_timeout(500)
def type_names(pg, text):
    ta = pg.locator('textarea.names'); ta.click(); ta.fill(text); ta.dispatch_event('input')
def wait_idle(pg, timeout=60000):
    pg.wait_for_function("() => { const b=document.querySelector('.place'); return b && !/Placing/.test(b.textContent) && !document.querySelector('.chip[data-st=researching]'); }", timeout=timeout)

def mobile_flow(p):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=3, has_touch=True, is_mobile=True, accept_downloads=True)
    pg = ctx.new_page(); attach(pg, 'm393'); boot(pg)
    shot(pg, '01-mobile-explore-empty'); overflow(pg, 'explore-empty')
    # type with chips (cached + live names)
    type_names(pg, 'Abraham Lincoln, Winston Churchill, Bernie Sanders, Darth Vader, Taylor Swift, Mario')
    pg.locator('.inp').scroll_into_view_if_needed(); shot(pg, '02-mobile-chips')
    pg.locator('button.place').tap()
    pg.wait_for_timeout(1200); shot(pg, '03-mobile-placing')
    try: wait_idle(pg)
    except Exception as e: errors.append('place timeout ' + str(e)[:100])
    pg.wait_for_timeout(500)
    status = pg.locator('.istatus').inner_text(); notes.append('STATUS: ' + status)
    chips = pg.evaluate("[...document.querySelectorAll('.chip')].map(c=>c.dataset.st+':'+c.querySelector('.cn').textContent)"); notes.append('CHIPS left: ' + str(chips))
    if pg.locator('.chip[data-st=choice]').count():
        pg.locator('.chip[data-st=choice]').first.scroll_into_view_if_needed(); shot(pg, '04-mobile-disambiguation')
        pg.locator('.chip[data-st=choice] .choice').first.tap(); wait_idle(pg); pg.wait_for_timeout(900)
    pg.locator('.mapx').scroll_into_view_if_needed(); pg.evaluate("window.scrollTo(0, document.querySelector('.hero').offsetTop)")
    shot(pg, '05-mobile-map-placed'); overflow(pg, 'explore-placed')
    n = pg.evaluate("document.querySelectorAll('.tkw:not(.hid):not(.ghost)').length"); notes.append(f'visible tokens {n}')
    # token -> profile
    pg.evaluate("document.querySelector('.tkw[data-id=winston-churchill]').click()")
    pg.wait_for_timeout(700); shot(pg, '06-mobile-profile-half')
    pg.evaluate("document.querySelector('#side').dataset.snap='full'"); pg.wait_for_timeout(500); shot(pg, '07-mobile-profile-full')
    pg.evaluate("document.querySelector('.sp-body').scrollTo(0, 900)"); shot(pg, '08-mobile-profile-answers')
    # dispute
    pg.locator('.dis-open').first.scroll_into_view_if_needed(); pg.locator('.dis-open').first.tap(); pg.wait_for_timeout(200)
    pg.locator('.dis select').first.select_option('-1'); pg.locator('.dis input[type=url]').first.fill('https://example.org/source'); pg.locator('.dis textarea').first.fill('Check the 1945 budget.')
    shot(pg, '09-mobile-dispute-form')
    pg.locator('.dis button[type=submit]').first.tap(); pg.wait_for_timeout(400)
    if not pg.locator('.badge.s-under-review').count(): errors.append('dispute: no Under review badge')
    pg.evaluate("document.querySelector('.sp-close').click()"); pg.wait_for_timeout(500)
    # cell click
    pg.evaluate("window.scrollTo(0, document.querySelector('.hero').offsetTop)")
    pg.locator('.tile[data-r="3"][data-c="2"]').tap(); pg.wait_for_timeout(700); shot(pg, '10-mobile-cell-panel')
    pg.evaluate("document.querySelector('#side').dataset.snap='full'"); pg.wait_for_timeout(450); pg.evaluate("document.querySelector('.sp-body').scrollTo(0, 500)"); shot(pg, '11-mobile-cell-panel-scrolled')
    pg.locator('.arrow:has-text("→")').tap(); pg.wait_for_timeout(400)
    t = pg.locator('.sp-kicker').inner_text(); notes.append('after arrow: ' + t)
    pg.evaluate("document.querySelector('.sp-close').click()"); pg.wait_for_timeout(400)
    # era switch
    two = pg.evaluate("P.figs.filter(f=>f.eras.length>1).slice(0,3).map(f=>f.name)"); notes.append('two-era figs: ' + str(two))
    type_names(pg, two[0]); pg.locator('button.place').tap(); wait_idle(pg); pg.wait_for_timeout(800)
    fid = pg.evaluate("P.figs.filter(f=>f.eras.length>1)[0].id")
    pg.evaluate(f"document.querySelector('.tkw[data-id=\"{fid}\"]').click()"); pg.wait_for_timeout(600)
    segs = pg.locator('.sp-body .seg button'); notes.append('era segs in profile: ' + str(segs.count()))
    segs.first.tap(); pg.wait_for_timeout(900); shot(pg, '12-mobile-era-switch')
    notes.append('era bar visible: ' + str(pg.locator('.era-bar').is_visible()))
    pg.evaluate("document.querySelector('.sp-close').click()"); pg.wait_for_timeout(300)
    pg.evaluate("window.scrollTo(0, document.querySelector('.hero').offsetTop)")
    # controls
    pg.locator('.mb[aria-label="Zoom in"]').tap(); pg.locator('.mb[aria-label="Zoom in"]').tap(); pg.wait_for_timeout(500); shot(pg, '13-mobile-zoomed')
    pg.locator('.mb[aria-label="Reset view"]').tap()
    pg.locator('.mb-txt').tap(); pg.wait_for_timeout(300); shot(pg, '14-mobile-table-view'); pg.locator('.mb-txt').tap()
    # save + share
    pg.locator('button:has-text("Save")').first.tap(); pg.wait_for_timeout(300)
    pg.locator('.boardbar button:has-text("Share")').tap(); pg.wait_for_selector('.exp-cv', timeout=20000); pg.wait_for_timeout(600); shot(pg, '15-mobile-share-modal')
    with pg.expect_download() as d: pg.locator('button:has-text("Download PNG")').tap()
    d.value.save_as(f'{SHOTS}/export-square.png'); notes.append('export-square.png saved')
    pg.locator('.exp-tabs button:has-text("Vertical")').tap(); pg.wait_for_timeout(1500)
    with pg.expect_download() as d: pg.locator('button:has-text("Download PNG")').tap()
    d.value.save_as(f'{SHOTS}/export-vertical.png')
    pg.locator('.exp-tabs button:has-text("Wide")').tap(); pg.wait_for_timeout(1500)
    with pg.expect_download() as d: pg.locator('button:has-text("Download PNG")').tap()
    d.value.save_as(f'{SHOTS}/export-wide.png')
    link = pg.locator('.linkf input').input_value(); notes.append('share link len ' + str(len(link)))
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    # open the share link in a fresh page
    pg2 = ctx.new_page(); attach(pg2, 'share'); pg2.goto(link); pg2.wait_for_selector('html[data-ready="1"]', state='attached'); pg2.wait_for_timeout(1200)
    shot(pg2, '16-mobile-shared-board'); notes.append('shared board tokens: ' + str(pg2.evaluate("document.querySelectorAll('.tkw:not(.hid):not(.ghost)').length"))); overflow(pg2, 'shared board'); pg2.close()
    # pages
    for name, h_ in [('17-mobile-method', '#/method'), ('18-mobile-pricing', '#/pricing'), ('19-mobile-classroom', '#/class'), ('20-mobile-account', '#/account'), ('21-mobile-figure', '#/figure/winston-churchill'), ('22-mobile-board', '#/b/' + pg.evaluate("P.boardsSeed.find(b=>!b.collection).id"))]:
        pg.evaluate(f"location.hash='{h_}'"); pg.wait_for_timeout(1200); shot(pg, name); overflow(pg, name)
    ctx.close(); b.close()

def small_flow(p):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 360, 'height': 740}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); attach(pg, 'm360'); boot(pg)
    shot(pg, '30-small-explore'); overflow(pg, '360 explore')
    type_names(pg, 'Abraham Lincoln, Margaret Thatcher, Jinx, Jarvan, Ada Lovelace'); pg.locator('button.place').tap(); wait_idle(pg); pg.wait_for_timeout(1200)
    pg.evaluate("window.scrollTo(0, document.querySelector('.hero').offsetTop)"); shot(pg, '31-small-placed'); overflow(pg, '360 placed')
    notes.append('360 chips: ' + str(pg.evaluate("[...document.querySelectorAll('.chip')].map(c=>c.dataset.st+':'+c.querySelector('.cn').textContent)")))
    for name, h_ in [('32-small-method', '#/method'), ('33-small-pricing', '#/pricing'), ('34-small-account', '#/account'), ('35-small-figure-lol', '#/figure/lol-jinx')]:
        pg.evaluate(f"location.hash='{h_}'"); pg.wait_for_timeout(1000); shot(pg, name, full=(name.endswith('method'))); overflow(pg, name)
    ctx.close(); b.close()

def lol_flow(p):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); attach(pg, 'lol'); boot(pg)
    pg.locator('button:has-text("All champions")').scroll_into_view_if_needed(); shot(pg, '40-lol-collection')
    pg.locator('button:has-text("All champions")').tap(); pg.wait_for_timeout(2500)
    pg.evaluate("window.scrollTo(0, document.querySelector('.hero').offsetTop)")
    notes.append('LoL tokens/clusters: ' + str(pg.evaluate("[document.querySelectorAll('.tkw:not(.hid):not(.ghost)').length, document.querySelectorAll('.tkw.cl, .cluster').length]")))
    shot(pg, '41-lol-all-champions'); overflow(pg, 'lol all')
    for _ in range(3): pg.locator('.mb[aria-label="Zoom in"]').tap(); pg.wait_for_timeout(250)
    pg.wait_for_timeout(600); shot(pg, '42-lol-zoomed')
    notes.append('LoL zoomed tokens: ' + str(pg.evaluate("document.querySelectorAll('.tkw:not(.hid):not(.ghost)').length")))
    pg.locator('.mb[aria-label="Reset view"]').tap()
    pg.evaluate("document.querySelector('.tkw[data-id=lol-jinx]') && document.querySelector('.tkw[data-id=lol-jinx]').click()"); pg.wait_for_timeout(700)
    pg.evaluate("document.querySelector('#side') && (document.querySelector('#side').dataset.snap='full')"); pg.wait_for_timeout(500); shot(pg, '43-lol-profile')
    pg.evaluate("document.querySelector('.sp-body').scrollTo(0, 700)"); shot(pg, '44-lol-profile-answers')
    pg.evaluate("document.querySelector('.sp-close').click()")
    # 170-name paste
    pg.goto(BASE + '#/explore'); pg.wait_for_selector('html[data-ready="1"]', state='attached'); pg.evaluate("localStorage.clear()"); pg.reload(); pg.wait_for_selector('html[data-ready="1"]', state='attached'); pg.wait_for_timeout(600)
    names = pg.evaluate("P.figs.filter(f=>f.id.startsWith('lol-')).map(f=>f.name)")
    type_names(pg, '\n'.join(names + ['Qqzzxxv Notarealname']))
    pg.locator('.inp').scroll_into_view_if_needed(); pg.wait_for_timeout(500); shot(pg, '45-lol-paste-collapsed')
    notes.append('paste button: ' + pg.locator('button.place').inner_text())
    pg.locator('button.place').tap(); pg.wait_for_timeout(700); shot(pg, '46-lol-paste-progress')
    try: wait_idle(pg, 120000)
    except Exception as e: errors.append('batch timeout')
    pg.wait_for_timeout(800); notes.append('paste status: ' + pg.locator('.istatus').inner_text()); shot(pg, '47-lol-paste-done')
    ctx.close(); b.close()

def desktop_flow(p):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900})
    pg = ctx.new_page(); attach(pg, 'desk'); boot(pg)
    shot(pg, '50-desktop-empty'); overflow(pg, 'desk explore')
    type_names(pg, 'Abraham Lincoln, Winston Churchill, Bernie Sanders, Taylor Swift, Mario, Darth Vader, Margaret Thatcher, Jinx')
    pg.locator('button.place').click(); wait_idle(pg); pg.wait_for_timeout(1200)
    notes.append('desk chips: ' + str(pg.evaluate("[...document.querySelectorAll('.chip')].map(c=>c.dataset.st+':'+c.querySelector('.cn').textContent)")))
    pg.evaluate("window.scrollTo(0, document.querySelector('.hero').offsetTop)"); shot(pg, '51-desktop-placed')
    # keyboard: focus tile, arrow, enter
    pg.locator('.tile[data-r="4"][data-c="4"]').focus(); pg.keyboard.press('ArrowRight'); pg.keyboard.press('ArrowDown')
    f = pg.evaluate("[document.activeElement.dataset.r, document.activeElement.dataset.c]"); notes.append('kbd focus after Right,Down from (4,4): ' + str(f))
    pg.keyboard.press('Enter'); pg.wait_for_timeout(700)
    notes.append('kbd panel open: ' + str(pg.locator('#side').count() and pg.locator('#side .sp-kicker').inner_text()))
    shot(pg, '52-desktop-cell-panel'); overflow(pg, 'desk panel')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('.tkw[data-id=winston-churchill]').click()"); pg.wait_for_timeout(800); shot(pg, '53-desktop-profile'); overflow(pg, 'desk profile')
    pg.evaluate("document.querySelector('.sp-close').click()")
    pg.locator('.boardbar button:has-text("Share")').click(); pg.wait_for_selector('.exp-cv', timeout=20000); pg.wait_for_timeout(600); shot(pg, '54-desktop-share')
    pg.keyboard.press('Escape')
    for name, h_ in [('55-desktop-method', '#/method'), ('56-desktop-pricing', '#/pricing'), ('57-desktop-account', '#/account'), ('58-desktop-figure', '#/figure/winston-churchill')]:
        pg.evaluate(f"location.hash='{h_}'"); pg.wait_for_timeout(1000); shot(pg, name); overflow(pg, name)
    pg.goto(BASE + '#/explore'); pg.wait_for_timeout(1000)
    pg.locator('.mb-txt').click(); pg.wait_for_timeout(300); shot(pg, '59-desktop-table')
    # light theme
    pg.locator('[aria-label*="theme" i]').first.click(); pg.wait_for_timeout(500); shot(pg, '60-desktop-light')
    ctx.close(); b.close()

def choice_flow(p):
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 393, 'height': 852}, device_scale_factor=2, has_touch=True, is_mobile=True)
    pg = ctx.new_page(); attach(pg, 'choice'); boot(pg)
    type_names(pg, 'Jordan, Locke, Qqzzxxv'); pg.locator('button.place').tap(); wait_idle(pg); pg.wait_for_timeout(600)
    pg.locator('.inp').scroll_into_view_if_needed(); shot(pg, '04-mobile-disambiguation')
    notes.append('choice chips: ' + str(pg.evaluate("[...document.querySelectorAll('.chip')].map(c=>c.dataset.st+':'+c.querySelector('.cn').textContent)")))
    pg.locator('.chip[data-st=choice] .choice').first.tap(); wait_idle(pg); pg.wait_for_timeout(900)
    notes.append('after pick: ' + pg.locator('.istatus').inner_text()); shot(pg, '04b-mobile-after-pick')
    ctx.close(); b.close()

def report():
    print('\n'.join(notes)); print('ERRORS:', json.dumps(errors, indent=1))

if __name__ == '__main__':
    which = sys.argv[1:] or ['mobile']
    try:
        with sync_playwright() as p:
            for w in which: globals()[w + '_flow'](p)
    finally:
        report()
