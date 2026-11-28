"""Fundos e molduras cibernéticas do vídeo do Realyz (horizontal 1920x1080 e vertical 1080x1920)."""
import random
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = '/home/claude/video/assets/'
GOLD = (242, 194, 48)
CYAN = (80, 200, 230)
BASE = (11, 10, 9)
MONO = '/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf'
INTER_B = '/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf'
INTER_M = '/usr/share/fonts/opentype/inter/InterDisplay-Medium.otf'


def font(path, size):
    try:
        return ImageFont.truetype(path, size)
    except OSError:
        return ImageFont.truetype(MONO, size)


def base(w, h, seed=1):
    rnd = random.Random(seed)
    img = Image.new('RGB', (w, h), BASE)
    # brilho dourado suave em cima à esquerda e ciano embaixo à direita
    glow = Image.new('RGB', (w, h), (0, 0, 0))
    g = ImageDraw.Draw(glow)
    g.ellipse((-w * 0.3, -h * 0.4, w * 0.6, h * 0.5), fill=(70, 52, 10))
    g.ellipse((w * 0.55, h * 0.6, w * 1.3, h * 1.4), fill=(8, 40, 52))
    glow = glow.filter(ImageFilter.GaussianBlur(min(w, h) * 0.18))
    img = Image.blend(img, glow, 0.55)
    ov = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    step = 60
    for x in range(0, w, step):
        d.line([(x, 0), (x, h)], fill=GOLD + (14,), width=1)
    for y in range(0, h, step):
        d.line([(0, y), (w, y)], fill=GOLD + (14,), width=1)
    # cruzinhos e pontos de luz na grade
    for _ in range(int(w * h / 26000)):
        x = rnd.randrange(0, w // step) * step
        y = rnd.randrange(0, h // step) * step
        c = GOLD if rnd.random() < 0.7 else CYAN
        a = rnd.randint(40, 120)
        d.line([(x - 5, y), (x + 5, y)], fill=c + (a,), width=1)
        d.line([(x, y - 5), (x, y + 5)], fill=c + (a,), width=1)
    img = Image.alpha_composite(img.convert('RGBA'), ov)
    return img


def brackets(d, x0, y0, x1, y1, L=46, c=GOLD, a=200, w=3):
    for (x, y, sx, sy) in [(x0, y0, 1, 1), (x1, y0, -1, 1), (x0, y1, 1, -1), (x1, y1, -1, -1)]:
        d.line([(x, y), (x + sx * L, y)], fill=c + (a,), width=w)
        d.line([(x, y), (x, y + sy * L)], fill=c + (a,), width=w)


def hud_labels(d, w, h, m=36):
    f = font(MONO, 18 if w > h else 22)
    d.text((m + 6, m - 2), 'REALYZ // SISTEMA ONLINE', font=f, fill=GOLD + (210,))
    t = 'PASSO FUNDO · RS'
    d.text((w - m - 6 - d.textlength(t, font=f), m - 2), t, font=f, fill=GOLD + (170,))
    t = 'PESSOAS REAIS. NEGÓCIOS REAIS.'
    d.text((m + 6, h - m - 22), t, font=f, fill=(230, 225, 210, 150))
    t = 'REALYZ.COM.BR'
    d.text((w - m - 6 - d.textlength(t, font=f), h - m - 22), t, font=f, fill=GOLD + (170,))


def glow_rect(img, box, c=GOLD, width=3, blur=18):
    w, h = img.size
    lay = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(lay).rectangle(box, outline=c + (255,), width=width + 6)
    lay = lay.filter(ImageFilter.GaussianBlur(blur))
    img = Image.alpha_composite(img, lay)
    ImageDraw.Draw(img).rectangle(box, outline=c + (235,), width=width)
    return img


# ── Horizontal: fundo para as cenas em pé (painel no meio, textos de painel dos lados) ──
def fundo_h_painel():
    w, h = 1920, 1080
    img = base(w, h, 3)
    px, py, pw, ph = 690, 60, 540, 960
    img = glow_rect(img, (px - 4, py - 4, px + pw + 3, py + ph + 3))
    d = ImageDraw.Draw(img)
    brackets(d, 24, 24, w - 25, h - 25)
    hud_labels(d, w, h)
    fm = font(MONO, 22)
    fb = font(INTER_B, 44)
    esq = [('IDENTIDADE', 'VERIFICADA'), ('PAGAMENTO', 'PROTEGIDO'), ('PERFIL FALSO', 'BLOQUEADO')]
    dirr = [('CIDADE', 'PASSO FUNDO'), ('CONEXÃO', 'TODO MUNDO'), ('STATUS', 'CHEGANDO')]
    for i, (k, v) in enumerate(esq):
        y = 300 + i * 170
        d.text((150, y), '> ' + k, font=fm, fill=CYAN + (200,))
        d.text((150, y + 34), v, font=fb, fill=(245, 240, 228, 235))
        d.rectangle((150, y + 100, 150 + 330, y + 104), fill=GOLD + (60,))
        d.rectangle((150, y + 100, 150 + 330 - i * 70, y + 104), fill=GOLD + (220,))
    for i, (k, v) in enumerate(dirr):
        y = 300 + i * 170
        tx = w - 150
        d.text((tx - d.textlength(k + ' <', font=fm), y), k + ' <', font=fm, fill=CYAN + (200,))
        d.text((tx - d.textlength(v, font=fb), y + 34), v, font=fb, fill=(245, 240, 228, 235))
        d.rectangle((tx - 330, y + 100, tx, y + 104), fill=GOLD + (60,))
        d.rectangle((tx - 330 + i * 60, y + 100, tx, y + 104), fill=GOLD + (220,))
    img.convert('RGB').save(OUT + 'fundo_h_painel.png')


# ── Vertical: fundo para as cenas deitadas (painel no meio, título grande em cima) ──
def fundo_v_painel():
    w, h = 1080, 1920
    img = base(w, h, 5)
    px, py, pw, ph = 20, 700, 1040, 585
    img = glow_rect(img, (px - 4, py - 4, px + pw + 3, py + ph + 3))
    d = ImageDraw.Draw(img)
    brackets(d, 24, 24, w - 25, h - 25, L=60)
    hud_labels(d, w, h)
    fm = font(MONO, 26)
    d.text((60, 470), '// REALYZ', font=fm, fill=CYAN + (220,))
    d.rectangle((60, 640, 360, 645), fill=GOLD + (230,))
    d.rectangle((360, 642, 1020, 643), fill=GOLD + (70,))
    # embaixo do painel: barrinhas de "dados" e a frase
    fb = font(INTER_B, 40)
    t = 'Pessoas reais.'
    d.text((60, 1390), t, font=fb, fill=(245, 240, 228, 240))
    d.text((60, 1440), 'Negócios reais.', font=fb, fill=GOLD + (255,))
    rnd = random.Random(9)
    for i in range(14):
        hh = rnd.randint(20, 110)
        x = 640 + i * 28
        d.rectangle((x, 1500 - hh, x + 16, 1500), fill=GOLD + (60 + i * 10,))
    d.text((640, 1515), 'SINAL DA CIDADE', font=font(MONO, 20), fill=CYAN + (180,))
    img.convert('RGB').save(OUT + 'fundo_v_painel.png')


# ── Moldura por cima das cenas em pé no celular (só cantos e etiquetas, transparente) ──
def moldura_v():
    w, h = 1080, 1920
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    brackets(d, 24, 24, w - 25, h - 25, L=60, a=220)
    f = font(MONO, 22)
    t = 'REALYZ.COM.BR'
    d.text((w - 42 - d.textlength(t, font=f), h - 58), t, font=f, fill=GOLD + (200,))
    img.save(OUT + 'moldura_v.png')


# ── Linhas de tela (scanlines) + cantos escuros, por cima de tudo ──
def scan(w, h, name):
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    for y in range(0, h, 4):
        d.line([(0, y), (w, y)], fill=(0, 0, 0, 34), width=1)
    vig = Image.new('L', (w, h), 0)
    ImageDraw.Draw(vig).ellipse((-w * 0.25, -h * 0.25, w * 1.25, h * 1.25), fill=255)
    vig = vig.filter(ImageFilter.GaussianBlur(min(w, h) * 0.12))
    dark = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    dark.putalpha(vig.point(lambda v: int((255 - v) * 0.55)))
    img = Image.alpha_composite(img, dark)
    img.save(OUT + name)


# ── Faixa de luz que varre a tela de cima para baixo ──
def varredura(w, name):
    h = 140
    img = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    px = img.load()
    for y in range(h):
        a = int(26 * (1 - abs(y - h * 0.75) / (h * 0.75))) if y < h * 0.75 else int(70 * (1 - (y - h * 0.75) / (h * 0.25)))
        a = max(0, a)
        for x in range(w):
            px[x, y] = (255, 214, 90, a)
    img.save(OUT + name)


# ── Selo Realyz para cobrir o nome antigo no centro da "cidade conectada" ──
def selo():
    s = 200
    img = Image.new('RGBA', (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    d.ellipse((6, 6, s - 6, s - 6), fill=(16, 15, 17, 255))
    d.ellipse((8, 8, s - 8, s - 8), outline=GOLD + (255,), width=5)
    f = font(INTER_B, 44)
    t1, t2 = 'Real', 'yz'
    tw = d.textlength(t1 + t2, font=f)
    x = (s - tw) / 2
    d.text((x, s / 2 - 28), t1, font=f, fill=(245, 242, 235, 255))
    d.text((x + d.textlength(t1, font=f), s / 2 - 28), t2, font=f, fill=GOLD + (255,))
    img.save(OUT + 'selo.png')


if __name__ == '__main__':
    import os
    os.makedirs(OUT, exist_ok=True)
    fundo_h_painel()
    fundo_v_painel()
    moldura_v()
    scan(1920, 1080, 'scan_h.png')
    scan(1080, 1920, 'scan_v.png')
    varredura(1920, 'varre_h.png')
    varredura(1080, 'varre_v.png')
    selo()
    print('ok')
