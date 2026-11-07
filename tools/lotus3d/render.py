# Renderiza os quadros de jobs.json (gerado por gen.py) e salva em assets/lotus como webp.
# Uso: python3 gen.py && python3 render.py
import base64, io, json, os
from PIL import Image
from playwright.sync_api import sync_playwright
from vivid import vivid_gold, clear_stamens, clear_disk, halo, rays
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'assets', 'lotus')
jobs = json.load(open(os.path.join(HERE, 'jobs.json')))
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'])
    pg = b.new_page(); pg.goto('file://' + os.path.join(HERE, 'lotus.html'))
    for j in jobs:
        im = Image.open(io.BytesIO(base64.b64decode(pg.evaluate('o=>render(o)', j['o']).split(',')[1]))).convert('RGBA')
        name = os.path.basename(j['f']).replace('.png', '.webp')
        # recorte quadrado fixo e centrado: a flor fica sempre no meio
        im = im.crop((64, 64, 960, 960)).resize((300, 300), Image.LANCZOS)
        # dourado do miolo mais vivo (flor padrão e botão flutuante)
        if name.startswith(('padrao_', 'fab_')):
            im = clear_stamens(vivid_gold(im), bars=name.startswith('fab_'))
        # sem o círculo dourado no meio da flor padrão: no lugar dele o app desenha ondas sonoras
        if name.startswith('padrao_'):
            im = clear_disk(im)
        im.save(os.path.join(OUT, name), 'WEBP', quality=78, method=6)
        print(name)
    b.close()
halo(os.path.join(OUT, 'light_halo.webp')); rays(os.path.join(OUT, 'light_rays.webp'))

# Reescreve src/components/lotus/frames.js com os quadros gerados.
names = sorted(os.path.basename(j['f']).replace('.png', '.webp') for j in jobs)
js = ['// Quadros da flor de lótus 3D (gerados por tools/lotus3d/render.py). Não editar à mão.', 'const F = {']
for m in ['padrao', 'agro', 'sos', 'shop']:
    js.append(f'  {m}: {{')
    for k in ['bloom', 'idle']:
        js.append(f'    {k}: [')
        js += [f"      require('../../../assets/lotus/{n}')," for n in names if n.startswith(f'{m}_{k}_')]
        js.append('    ],')
    js.append('  },')
js += ['};', 'export default F;', "export const FAB = [require('../../../assets/lotus/fab_0.webp'), require('../../../assets/lotus/fab_1.webp')];",
       "export const LIGHT = { halo: require('../../../assets/lotus/light_halo.webp'), rays: require('../../../assets/lotus/light_rays.webp') };", '']
open(os.path.join(HERE, '..', '..', 'src', 'components', 'lotus', 'frames.js'), 'w').write('\n'.join(js))
