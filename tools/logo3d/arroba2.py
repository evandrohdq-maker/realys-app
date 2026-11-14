# Logo futurista do Re@lys (R dentro do @, preto com bordas douradas e estrela).
# Uso: python3 arroba2.py pasta_saida   |   python3 arroba2.py icons NOME
import base64, os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
BASE = dict(style='3d', face='black', ring=330, gap=[0.22, 0.40], cut=0.10, stemX=405, top=330, base=700, bowlW=95, bowlR=100,
            legFrom=70, legAngle=0.30, legLen=420, width=66, depth=20, cap='butt', join='miter', nodes=True, grid=True, spark=[790, 205, 52])
OPTS = {
  'F1_com_haste': dict(BASE, stem=True),
  'F2_sem_haste': dict(BASE, stem=False, nodes=True),
  'F3_neon': dict(BASE, stem=True, style='neon', width=46),
  'G1_estrela_na_haste': dict(BASE, stem=False, nodes=False, spark=None, stemStar=dict(x=405, y=515, rx=58, ry=205)),
  'G2_estrela_na_haste_e_topo': dict(BASE, stem=False, nodes=False, stemStar=dict(x=405, y=515, rx=58, ry=205)),
  'H_fundo_dourado': dict(BASE, stem=False, nodes=False, goldBg=True, depth=16, stemStar=dict(x=405, y=567, rx=50, ry=265)),
  'J_suave': dict(BASE, stem=False, nodes=False, goldBg=True, grid=False, cut=0, cap='round', join='round', halo=True,
                  width=62, depth=12, gap=[0.24, 0.40], spark=[770, 230, 44], stemStar=dict(x=405, y=567, rx=62, ry=266, matchStrokes=True)),
  'K_dentro': dict(BASE, stem=False, nodes=False, goldBg=True, grid=False, cut=0, cap='round', join='round', halo=True,
                  width=58, depth=12, ring=345, gap=[0.0, 0.0001], legLen=250, spark=[790, 215, 44], stemStar=dict(x=405, y=560, rx=58, ry=232, matchStrokes=True)),
  'L_espiral': dict(BASE, stem=False, nodes=False, goldBg=True, grid=False, cut=0, cap='round', join='round', halo=True, spiral=True,
                  fillet=70, blend=-0.10, spiralGap=0.16, spiralDir=-1, width=58, depth=12, ring=340, spark=[790, 215, 44],
                  stemStar=dict(x=405, y=560, rx=58, ry=232, matchStrokes=True)),
  'M_futurista': dict(BASE, stem=False, nodes=False, goldBg=True, grid=False, cut=0, cap='round', join='round', halo=True, spiral=True,
                  hud=True, sweep=True, legFrom=8, fillet=70, blend=-0.10, spiralGap=0.16, spiralDir=-1, width=56, depth=12, ring=300,
                  stemX=412, top=345, bowlW=88, bowlR=92, legLen=380, spark=[770, 205, 40],
                  stemStar=dict(x=412, y=545, rx=54, ry=218, matchStrokes=True)),
  'N_futurista_sem_esquerda': dict(BASE, stem=False, nodes=False, goldBg=True, grid=False, cut=0, cap='round', join='round', halo=True, spiral=True,
                  hud=True, sweep=True, legFrom=0, fillet=70, blend=-0.10, spiralGap=0.16, spiralDir=-1, width=56, depth=12, ring=300,
                  stemX=412, top=345, bowlW=88, bowlR=92, legLen=380, spark=[770, 205, 40]),
  'O_globo': dict(BASE, stem=False, nodes=False, goldBg=True, grid=False, cut=0, cap='round', join='round', halo=True, spiral=True,
                  globe=True, sweep=True, legFrom=0, fillet=70, blend=-0.10, spiralGap=0.16, spiralDir=-1, width=56, depth=12, ring=280,
                  stemX=418, top=360, bowlW=84, bowlR=86, legLen=360, spark=[800, 175, 40]),
  'P_universo': dict(BASE, stem=False, nodes=False, goldBg=False, space=True, grid=False, cut=0, cap='round', join='round', halo=False, spiral=True,
                  globe=True, sweep=True, legFrom=0, fillet=70, blend=-0.10, spiralGap=0.16, spiralDir=-1, width=56, depth=12, ring=280,
                  stemX=418, top=360, bowlW=84, bowlR=86, legLen=360, spark=[800, 175, 40]),
  'I_haste_no_anel': dict(BASE, stem=True, stemToRing=True, nodes=False, goldBg=True, depth=16),
  'G3_estrela_no_pe': dict(BASE, stem=False, nodes=False, spark=None, stemStar=dict(x=405, y=640, rx=70, ry=110)),
}
out = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(); pg.goto('file://' + os.path.join(HERE, 'arroba2.html'))
    if out == 'icons':
        o = OPTS[sys.argv[2]]; A = os.path.join(HERE, '..', '..', 'assets')
        for name, extra in [('icon', {}), ('logo-header', {}), ('adaptive-icon', dict(noBg=True, grid=False, scale=0.7, spark=None))]:
            d = pg.evaluate('o=>render(o)', {**o, **extra}).split(',')[1]
            open(os.path.join(A, name + '.png'), 'wb').write(base64.b64decode(d)); print(name)
        d = pg.evaluate("o=>{bg(o); return c.toDataURL('image/png')}", dict(grid=True, goldBg=o.get('goldBg', False))).split(',')[1]
        open(os.path.join(A, 'adaptive-icon-bg.png'), 'wb').write(base64.b64decode(d)); print('adaptive-icon-bg')
    else:
        for name, o in OPTS.items():
            d = pg.evaluate('o=>render(o)', o).split(',')[1]
            open(os.path.join(out, name + '.png'), 'wb').write(base64.b64decode(d)); print(name)
    b.close()
