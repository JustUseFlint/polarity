"""Render the logo SVG to the PNG icons (needs playwright + chromium). Run: python3 tools/gen_icons.py"""
from playwright.sync_api import sync_playwright
import os
def svg(pad, bg, radius):
    return f'''<html><body style="margin:0"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="14"/></filter>
<radialGradient id="bgr" cx=".5" cy=".4" r=".8"><stop offset="0" stop-color="#1A1E2E"/><stop offset="1" stop-color="#0B0D12"/></radialGradient></defs>
<rect width="512" height="512" rx="{radius}" fill="url(#bgr)"/>
<g transform="translate({pad} {pad}) scale({(512-2*pad)/512})">
<rect x="86" y="96" width="156" height="156" rx="40" fill="#F2545B"/>
<rect x="86" y="270" width="156" height="156" rx="40" fill="#2EC4B6"/>
<rect x="260" y="270" width="156" height="156" rx="40" fill="#F9A620"/>
<rect x="260" y="66" width="156" height="156" rx="40" fill="#8B7CFF" filter="url(#g)" opacity=".9"/>
<rect x="260" y="66" width="156" height="156" rx="40" fill="#5465FF" stroke="#C9C2FF" stroke-width="5"/>
</g></svg></body></html>'''
os.makedirs('icons', exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(); pg = b.new_page(viewport={'width':512,'height':512})
    for name, pad, r, size in [('icon-512', 0, 112, 512), ('icon-maskable-512', 70, 0, 512), ('icon-192', 0, 42, 192), ('apple-touch-icon', 0, 0, 180)]:
        pg.set_viewport_size({'width':512,'height':512}); pg.set_content(svg(pad, '#0B0D12', r*512/512 if size==512 else 112))
        pg.screenshot(path=f'icons/{name}.png', omit_background=True, clip={'x':0,'y':0,'width':512,'height':512})
    b.close()
from PIL import Image
for n,s in [('icon-192',192),('apple-touch-icon',180)]:
    im=Image.open(f'icons/{n}.png').convert('RGBA').resize((s,s),Image.LANCZOS)
    if n=='apple-touch-icon':
        bg=Image.new('RGBA',im.size,(11,13,18,255)); bg.alpha_composite(im); im=bg
    im.save(f'icons/{n}.png')
