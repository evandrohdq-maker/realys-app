# Gera os vídeos de demonstração dos Reels (assets/reels/*.mp4) e as capas (*.jpg).
# Uso: python3 tools/reels/render.py  (só os que faltam)  |  python3 tools/reels/render.py --all
import base64, os, subprocess, sys
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'assets', 'reels')
os.makedirs(OUT, exist_ok=True)
FPS, SECS = 24, 6

# id do clipe -> como o vídeo aparece (mesmos produtos de src/adsData.js)
REELS = {
    'clip-s1': dict(emoji='🎧', head='30 horas de bateria', price='R$ 149', c1='#5BB8E0', c2='#123A5C', cta='Compre no Re@lys'),
    'clip-s2': dict(emoji='👟', head='Conforto o dia todo', price='R$ 199', c1='#8C8CE8', c2='#25235E', cta='Compre no Re@lys'),
    'clip-s3': dict(emoji='🧥', head='3 jeitos de usar', price='R$ 189', c1='#6E9BFF', c2='#1B2E66', cta='Coleção verão'),
    'clip-s4': dict(emoji='🔌', head='50% em 20 minutos', price='R$ 79', c1='#9AA3AE', c2='#1E2329', cta='Compre no Re@lys'),
    'clip-f1': dict(emoji='🍕', head='Saindo do forno a lenha', price='R$ 54', c1='#FF8A5B', c2='#5C1A08', cta='Peça no Re@lys Food'),
    'clip-f2': dict(emoji='🍔', head='O X-Burguer mais suculento', price='R$ 34', c1='#FFB648', c2='#5A2A00', cta='Peça no Re@lys Food'),
    'clip-f3': dict(emoji='🍰', head='Montado na hora', price='R$ 16', c1='#F59AC4', c2='#5C1638', cta='Peça no Re@lys Food'),
    'clip-f4': dict(emoji='🍣', head='Combinado de 30 peças', price='R$ 79', c1='#FF7A7A', c2='#4D0F12', cta='Peça no Re@lys Food'),
    'clip-m1': dict(emoji='☕', head='Do grão à xícara', price='R$ 18', c1='#B98A63', c2='#3A2312', cta='No mercado do Re@lys'),
    'clip-m2': dict(emoji='🥛', head='Leite fresquinho chegou', price='R$ 5', c1='#8EC2EE', c2='#16385A', cta='No mercado do Re@lys'),
    # Serviços (prestadores de src/data.js)
    'clip-v1': dict(emoji='🚿', head='Chuveiro novo em 20 min', price='R$ 85/h', c1='#FFD166', c2='#5A3D00', cta='Chame no Re@lys'),
    'clip-v2': dict(emoji='🚗', head='Aeroporto sem estresse', price='R$ 12', c1='#7FB5FF', c2='#12305C', cta='Chame no Re@lys'),
    'clip-v3': dict(emoji='🛵', head='Entrega em minutos', price='R$ 7', c1='#7EE0A6', c2='#0F4A2B', cta='Chame no Re@lys'),
    'clip-v4': dict(emoji='🧹', head='Casa brilhando hoje', price='R$ 160', c1='#C9A6FF', c2='#35185E', cta='Chame no Re@lys'),
    # Negócios (anúncios de src/homeData.js)
    'clip-n1': dict(emoji='🏢', head='2 quartos com varanda', price='R$ 420 mil', c1='#F5C331', c2='#3D2C00', cta='Agende a visita'),
    'clip-n2': dict(emoji='🚙', head='Hatch 2021, único dono', price='R$ 62.900', c1='#9AD0F5', c2='#123A5C', cta='Veja no Re@lys'),
    'clip-n3': dict(emoji='🚜', head='Retro com operador', price='R$ 1.400/dia', c1='#FFB648', c2='#5A2A00', cta='Reserve no Re@lys'),
    'clip-n4': dict(emoji='🔑', head='Kitnet perto do metrô', price='R$ 1.650/mês', c1='#8EE3D0', c2='#0E4A40', cta='Agende a visita'),
}

with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width': 480, 'height': 854})
    pg.goto('file://' + os.path.join(HERE, 'reel.html'))
    pg.evaluate('ready()')
    for rid, o in REELS.items():
        mp4 = os.path.join(OUT, rid + '.mp4')
        # Já gerado: não refaz (use --all para refazer todos).
        if os.path.exists(mp4) and '--all' not in sys.argv:
            continue
        ff = subprocess.Popen(
            ['ffmpeg', '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-',
             '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-pix_fmt', 'yuv420p', '-profile:v', 'main',
             '-movflags', '+faststart', '-an', mp4],
            stdin=subprocess.PIPE)
        for i in range(FPS * SECS):
            jpg = base64.b64decode(pg.evaluate('([o,t])=>shot(o,t)', [o, i / FPS]).split(',')[1])
            ff.stdin.write(jpg)
            if i == FPS * 3:  # capa: o quadro dos 3 segundos
                open(os.path.join(OUT, rid + '.jpg'), 'wb').write(jpg)
        ff.stdin.close(); ff.wait()
        print(rid, os.path.getsize(mp4) // 1024, 'KB')
    b.close()
