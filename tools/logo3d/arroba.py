# Opções do logo "R dentro do @". Uso: python3 arroba.py pasta_saida   |   python3 arroba.py icons OPCAO
import base64, os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = dict(ring=330, gap=[0.29, 0.47], bowl=dict(dx=-10, dy=-40, r=150, from_=1.0, to=2.62), leg=dict(angle=0.27, len=380), width=70, depth=22)
def opt(**k):
    o = {**BASE, **k}
    b = dict(o['bowl']); b['from'] = b.pop('from_'); o['bowl'] = b
    return o
OPTS = {
  'A_dourado': opt(face='gold', spark=[800, 200, 50]),
  'B_preto_borda_dourada': opt(face='black', width=80, spark=[800, 200, 50]),
  'C_dourado_fino': opt(face='gold', width=52, depth=16, ring=335, bowl=dict(dx=-10, dy=-40, r=152, from_=1.0, to=2.62), spark=[800, 200, 50]),
}
out = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(); pg.goto('file://' + os.path.join(HERE, 'arroba.html'))
    if out == 'icons':
        o = OPTS[sys.argv[2]]; A = os.path.join(HERE, '..', '..', 'assets')
        for name, extra in [('icon', {}), ('adaptive-icon', dict(noBg=True, scale=0.66, spark=None))]:
            d = pg.evaluate('o=>render(o)', {**o, **extra}).split(',')[1]
            open(os.path.join(A, name + '.png'), 'wb').write(base64.b64decode(d)); print(name)
    else:
        for name, o in OPTS.items():
            d = pg.evaluate('o=>render(o)', o).split(',')[1]
            open(os.path.join(out, name + '.png'), 'wb').write(base64.b64decode(d)); print(name)
    b.close()
