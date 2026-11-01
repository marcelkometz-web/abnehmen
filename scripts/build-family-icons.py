"""Build first-party SVG app icons in the existing berry/rose-gold palette.
No network, fonts or AI generation. Raster exports are rendered from these SVGs.
"""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
DEFS = '''<defs>
<radialGradient id="berry" cx="42%" cy="30%" r="86%"><stop stop-color="#71143f"/><stop offset=".46" stop-color="#49072b"/><stop offset="1" stop-color="#210016"/></radialGradient>
<radialGradient id="shine" cx="10%" cy="5%" r="90%"><stop stop-color="#e19ab6" stop-opacity=".16"/><stop offset=".7" stop-color="#e19ab6" stop-opacity="0"/></radialGradient>
<linearGradient id="gold" gradientUnits="userSpaceOnUse" x1="120" y1="100" x2="400" y2="420"><stop stop-color="#fff3d9"/><stop offset=".24" stop-color="#ffd9bb"/><stop offset=".5" stop-color="#d88f78"/><stop offset=".72" stop-color="#ffe2c5"/><stop offset="1" stop-color="#bb6c64"/></linearGradient>
<linearGradient id="petal" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#fff2dc"/><stop offset=".42" stop-color="#f9c6aa"/><stop offset="1" stop-color="#c9776f"/></linearGradient>
<filter id="depth" x="-40%" y="-40%" width="180%" height="180%"><feDropShadow dx="0" dy="7" stdDeviation="7" flood-color="#16000c" flood-opacity=".65"/></filter>
</defs>'''
FLOWER='''<g transform="translate(382 170) scale(.72)" fill="url(#petal)" stroke="#ffe4cd" stroke-width="1.6"><path d="M0 0C-22-22-24-43 0-65C24-43 22-22 0 0Z"/><path d="M0 0C22-22 43-24 65 0C43 24 22 22 0 0Z"/><path d="M0 0C22 22 24 43 0 65C-24 43-22 22 0 0Z"/><path d="M0 0C-22 22-43 24-65 0C-43-24-22-22 0 0Z"/><circle r="8" fill="url(#gold)"/></g>'''
SPARK='''<path d="M390 82c2 28 6 32 30 34-24 2-28 6-30 34-2-28-6-32-30-34 24-2 28-6 30-34Z" fill="url(#gold)"/>'''
MOTIFS={
'garten':'''<path d="M255 385V228" fill="none" stroke="url(#gold)" stroke-width="17" stroke-linecap="round"/>
<path d="M250 284C169 288 139 238 149 177C218 171 266 206 250 284Z" fill="url(#gold)" stroke="#f9d6bc" stroke-width="3"/>
<path d="M262 244C252 179 288 132 349 132C360 189 333 238 262 244Z" fill="url(#petal)" stroke="#ffe4cd" stroke-width="3"/>
<path d="M176 208l70 69m23-43 55-72" fill="none" stroke="#8d4654" stroke-width="5" stroke-linecap="round" opacity=".5"/>
<path d="M188 385h134" fill="none" stroke="url(#gold)" stroke-width="12" stroke-linecap="round"/>''',
'rezepte':'''<ellipse cx="256" cy="271" rx="82" ry="102" fill="none" stroke="url(#gold)" stroke-width="14"/>
<ellipse cx="256" cy="271" rx="57" ry="76" fill="none" stroke="#f6ccb0" stroke-width="2.5" opacity=".75"/>
<path d="M132 166v65c0 20 9 31 24 31s24-11 24-31v-65m-24 0v216" fill="none" stroke="url(#gold)" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M365 257v125" fill="none" stroke="url(#gold)" stroke-width="14" stroke-linecap="round"/>
<ellipse cx="365" cy="210" rx="25" ry="48" fill="url(#gold)" stroke="#ffe0c3" stroke-width="2"/>''',
'zuhause':'''<path d="M133 252 256 147l123 105" fill="none" stroke="url(#gold)" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M159 248v123h194V248" fill="none" stroke="url(#gold)" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M255 334c-69-40-35-87 0-56 35-31 69 16 0 56Z" fill="url(#petal)" stroke="#ffe5ce" stroke-width="2"/>'''
}
for name,motif in MOTIFS.items():
 title={'garten':'Ramonas Garten','rezepte':'Rezepte','zuhause':'Unser Zuhause'}[name]
 svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512" role="img" aria-label="{title}">{DEFS}<rect width="512" height="512" fill="url(#berry)"/><rect width="512" height="512" fill="url(#shine)"/><rect x="28" y="28" width="456" height="456" rx="105" fill="none" stroke="#d99b91" stroke-opacity=".2" stroke-width="2"/><g filter="url(#depth)">{motif}{FLOWER if name!='garten' else FLOWER.replace('382 170','377 302').replace('scale(.72)','scale(.48)')}{SPARK}</g></svg>'''
 path=ROOT/('abnehmen/zuhause' if name=='zuhause' else name)/'icon.svg'
 path.write_text(svg+'\n')
 if name=='rezepte':(ROOT/'abnehmen/zuhause/assets/rezepte.svg').write_text(svg+'\n')
 print(path.relative_to(ROOT))
