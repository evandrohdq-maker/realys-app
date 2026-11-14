# 4 conceitos novos do logo do Re@lys. Uso: python3 concepts.py pasta_saida
import base64, os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
G = dict(ring=300, spiral=True, stem=False, fillet=70, blend=-0.10, spiralGap=0.16, spiralDir=-1, stemX=412, top=345, bowlW=88, bowlR=92,
         legFrom=0, legAngle=0.30, legLen=380, base=640, cut=0, gap=[0.22, 0.40], spark=[770, 205, 40])
K = {'1_digital': dict(G, kind='digital', width=88), '2_scan_facial': dict(G, kind='scan', width=46),
     '3_traco_de_luz': dict(G, kind='mono', width=22), '4_vidro_dourado': dict(G, kind='vidro', width=74)}
out = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(); pg.goto('file://' + os.path.join(HERE, 'arroba2.html'))
    for n, o in K.items():
        d = pg.evaluate('o=>concept(o)', o).split(',')[1]
        open(os.path.join(out, n + '.png'), 'wb').write(base64.b64decode(d)); print(n)
    b.close()
