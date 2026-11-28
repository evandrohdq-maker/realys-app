# Como foi montado o vídeo de apresentação (tools/site/paginas/apresentacao*.mp4).
# Entradas: o vídeo curto antigo e a apresentação longa (com música); rodar assets.py e depois montar.py.
"""Monta o vídeo de apresentação do Realyz (horizontal e vertical) a partir dos dois vídeos."""
import subprocess, sys, os

V = '/home/claude/video/'
A = V + 'assets/'
L, S = V + 'in/longo.mp4', V + 'in/curto.mp4'
FB = '/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf'

# (fonte, início, fim, título no celular, extras)
CENAS = [
    ('S', 0.0, 9.4, None, {}),                       # Algo novo · Pessoas reais. Negócios reais.
    ('L', 6.0, 12.0, 'O PROBLEMA', {}),              # Comprar online virou um risco
    ('L', 17.0, 24.0, 'TUDO NUM APP SÓ', {}),        # Um único app para a cidade inteira (a batida entra aqui)
    ('L', 24.0, 33.0, 'SEGURANÇA', {}),
    ('L', 33.0, 42.0, 'CIDADE VERIFICADA', {'selo': True}),
    ('L', 42.0, 51.0, 'CORRIDAS', {}),
    ('L', 51.0, 60.0, 'FOOD', {}),
    ('L', 60.0, 68.6, 'SERVIÇOS', {}),
    ('S', 39.4, 44.8, None, {}),                     # Você sabe fazer. Alguém precisa.
    ('L', 90.0, 95.0, 'PAINEL DA LOJA', {}),
    ('L', 95.0, 103.0, 'TAXAS CLARAS', {}),
    ('S', 21.6, 26.4, None, {}),                     # O contato que antes ninguém tinha
    ('S', 26.8, 33.4, None, {}),                     # Ciclo de evolução
    ('S', 45.4, 56.6, None, {'segura': 1.6}),        # Pagamento protegido · Estamos chegando em Passo Fundo
]
GLITCH = "rgbashift=rh=-18:bh=18:rv=5:enable='lt(t,0.28)',eq=brightness=0.10:enable='lt(t,0.09)'"
ENC = ['-an', '-r', '30', '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '14', '-pix_fmt', 'yuv420p']


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(' '.join(cmd))
        print(r.stderr[-2000:])
        sys.exit(1)


def cena(i, c, modo):
    src, a, b, titulo, ex = c
    d = b - a
    out = f'{V}seg/{modo}_{i:02d}.mp4'
    hold = f",tpad=stop_mode=clone:stop_duration={ex['segura']}" if ex.get('segura') else ''
    base_in = ['-ss', str(a), '-t', str(d), '-i', L if src == 'L' else S]
    if src == 'L':
        # cobre o nome antigo no centro da "cidade conectada"
        selo = "[1:v]format=rgba[se];[l][se]overlay=860:540:enable='gte(t,1.0)'[l2];" if ex.get('selo') else ''
        lname = 'l2' if ex.get('selo') else 'l'
        if modo == 'h':
            fc = f"[0:v]fps=30,setsar=1[l];{selo}[{lname}]{GLITCH}{hold}[o]"
            ins = base_in + (['-i', A + 'selo.png'] if ex.get('selo') else [])
        else:
            t = titulo.replace(':', '\\:')
            sel_in = ['-i', A + 'selo.png'] if ex.get('selo') else []
            # entrada 0 = cena deitada, 1 = selo (opcional), última = fundo vertical
            bg_idx = 2 if ex.get('selo') else 1
            fc = (f"[0:v]fps=30,setsar=1[l];{selo}[{lname}]scale=1040:585[p];"
                  f"[{bg_idx}:v]fps=30,setsar=1[bg];[bg][p]overlay=20:700:shortest=1,"
                  f"drawtext=fontfile={FB}:text='{t}':fontsize=92:fontcolor=0xF5F0E4:x=60:y=520,"
                  f"{GLITCH}{hold}[o]")
            ins = base_in + sel_in + ['-loop', '1', '-t', str(d), '-i', A + 'fundo_v_painel.png']
    else:
        if modo == 'h':
            fc = (f"[1:v]fps=30,setsar=1[bg];[0:v]fps=30,scale=540:960,setsar=1[s];"
                  f"[bg][s]overlay=690:60:shortest=1,{GLITCH}{hold}[o]")
            ins = base_in + ['-loop', '1', '-t', str(d), '-i', A + 'fundo_h_painel.png']
        else:
            fc = (f"[0:v]fps=30,scale=1080:1920,setsar=1[s];[1:v]format=rgba[m];"
                  f"[s][m]overlay=0:0,{GLITCH}{hold}[o]")
            ins = base_in + ['-i', A + 'moldura_v.png']
    run(['ffmpeg', '-v', 'error', '-y'] + ins + ['-filter_complex', fc, '-map', '[o]'] + ENC + [out])
    return out


def final(modo):
    w, h = (1920, 1080) if modo == 'h' else (1080, 1920)
    # trechos já prontos são reaproveitados (apague a pasta seg/ para refazer)
    segs = [f'{V}seg/{modo}_{i:02d}.mp4' if os.path.exists(f'{V}seg/{modo}_{i:02d}.mp4') else cena(i, c, modo) for i, c in enumerate(CENAS)]
    lista = f'{V}seg/{modo}.txt'
    open(lista, 'w').write(''.join(f"file '{s}'\n" for s in segs))
    run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lista, '-c', 'copy', f'{V}seg/{modo}_full.mp4'])
    dur = sum(b - a for _, a, b, _, _ in CENAS) + 1.6
    # trilha: a parte suave na abertura e a batida entrando no "Um único app" (aos 15,4 s)
    inicio_musica = 28.0 - 15.4  # a batida entra no 3º trecho (9,4 + 6 = 15,4 s)
    scan, varre = A + f'scan_{modo}.png', A + f'varre_{modo}.png'
    fc = (f"[0:v][1:v]overlay=0:0[a];[a][2:v]overlay=0:'mod(t*{h/4.5:.0f},{h}+140)-140'[b];"
          f"[b]format=yuv420p[v];"
          f"[3:a]afade=t=in:d=1.5,afade=t=out:st={dur-2.2:.2f}:d=2.2[au]")
    out = f'{V}out/apresentacao{"-horizontal" if modo == "h" else ""}.mp4'
    run(['ffmpeg', '-v', 'error', '-y', '-i', f'{V}seg/{modo}_full.mp4', '-loop', '1', '-i', scan, '-loop', '1', '-i', varre,
         '-ss', str(inicio_musica), '-t', f'{dur:.2f}', '-i', L,
         '-filter_complex', fc, '-map', '[v]', '-map', '[au]', '-t', f'{dur:.2f}',
         '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24' if modo == 'h' else '25', '-profile:v', 'high',
         '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', out])
    print('pronto', out)


if __name__ == '__main__':
    os.makedirs(V + 'seg', exist_ok=True)
    os.makedirs(V + 'out', exist_ok=True)
    for m in sys.argv[1:] or ['h', 'v']:
        final(m)
