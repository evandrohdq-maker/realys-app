# Renderiza as opções do logo 3D (preto e dourado). Uso: python3 render.py [pasta_saida]
import base64, os, sys
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE
OPTS = {
  'opcao1_R_dourado': {'bg': 'plain', 'face': 'gold', 'sides': 'gold', 'depth': 34, 'size': 720, 'dx': -20, 'dy': -10, 'spark': [770, 250, 70]},
  'opcao2_anel_dourado': {'bg': 'ring', 'face': 'gold', 'sides': 'gold', 'depth': 26, 'size': 560, 'dx': -12, 'dy': -6, 'spark': [790, 230, 55]},
  'opcao3_R_preto_borda_dourada': {'bg': 'ring', 'face': 'black', 'sides': 'gold', 'depth': 26, 'size': 560, 'dx': -12, 'dy': -6, 'spark': [790, 230, 55]},
}
# Escolhido: opção 3. Gera também os arquivos do ícone do app (assets/).
O3 = OPTS['opcao3_R_preto_borda_dourada']
LOOP = {} if OUT == 'icons' else OPTS
ICON = {'icon': O3, 'adaptive-icon': dict(O3, fg=0.72, spark=None)}
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(); pg.goto('file://' + os.path.join(HERE, 'logo.html'))
    for name, o in LOOP.items():
        data = pg.evaluate('o=>render(o)', o).split(',')[1]
        open(os.path.join(OUT, name + '.png'), 'wb').write(base64.b64decode(data)); print(name)
    if OUT == 'icons':
        A = os.path.join(HERE, '..', '..', 'assets')
        for name, o in ICON.items():
            data = pg.evaluate('o=>render(o)', o).split(',')[1]
            open(os.path.join(A, name + '.png'), 'wb').write(base64.b64decode(data)); print(name)
        data = pg.evaluate("o=>{bg('plain'); return c.toDataURL('image/png')}", {}).split(',')[1]
        open(os.path.join(A, 'adaptive-icon-bg.png'), 'wb').write(base64.b64decode(data)); print('adaptive-icon-bg')
    b.close()
