# Aviva o dourado do miolo da flor (padrão e botão flutuante): mais saturado, mais claro e com
# um brilho quente em volta. Também gera a luz branca que fica atrás da flor na caixa da Lotus.
# Uso: python3 vivid.py  (aplica nos quadros já gerados em assets/lotus; rode só uma vez por
# render, senão o dourado acumula)
# O render.py chama vivid_gold() sozinho em cada quadro novo.
import glob, os
import numpy as np
from PIL import Image, ImageFilter, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', '..', 'assets', 'lotus')


def vivid_gold(im):
    im = im.convert('RGBA')
    a = np.asarray(im).astype(np.float32) / 255
    rgb, al = a[..., :3], a[..., 3]
    hsv = np.asarray(im.convert('RGB').convert('HSV')).astype(np.float32) / 255
    h, s, v = hsv[..., 0] * 360, hsv[..., 1], hsv[..., 2]
    # máscara do dourado: matiz amarelo/laranja, com cor e luz suficientes
    m = np.clip((s - 0.25) / 0.2, 0, 1) * np.clip((v - 0.2) / 0.2, 0, 1) * (al > 0.5)
    m *= np.clip(1 - np.abs(h - 44) / 22, 0, 1) ** 0.5
    m = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.8))).astype(np.float32) / 255
    # dourado vivo: puxa para um ouro quente e luminoso, preservando o relevo (luz e sombra)
    gold = np.array([1.0, 0.74, 0.10])
    val = rgb.max(-1, keepdims=True)
    lit = np.clip(gold * np.clip(val * 1.22, 0, 1) ** 1.15 + 0.10 * np.clip(val - 0.85, 0, 1) / 0.15, 0, 1)
    out = rgb * (1 - m[..., None]) + lit * m[..., None]
    res = Image.fromarray((np.dstack([out, al]) * 255).astype(np.uint8), 'RGBA')
    # brilho quente em volta do miolo
    glow = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(im.width * 0.025))
    g = np.asarray(glow).astype(np.float32) / 255 * 0.4
    r = np.asarray(res).astype(np.float32) / 255
    r[..., :3] = r[..., :3] + (1 - r[..., :3]) * g[..., None] * np.array([1.0, 0.78, 0.25])
    return Image.fromarray((np.clip(r, 0, 1) * 255).astype(np.uint8), 'RGBA')


def clear_stamens(im, bars=False):
    """Tira os traços amarelos (estames) em volta do miolo: no lugar deles o app desenha ondas
    sonoras douradas que se mexem com a voz. bars=True desenha ondas paradas (botão flutuante)."""
    im = im.convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    W = im.width
    k = W / 300
    yy, xx = np.mgrid[0:im.height, 0:W]
    d = np.hypot(xx - W / 2, yy - im.height / 2)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (r - b > 20) & (r > 45) & (d > 21.5 * k) & (d < 47 * k)
    mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.GaussianBlur(0.8))
    mm = np.asarray(mi).astype(np.float32)[..., None] / 255
    a[..., :3] = a[..., :3] * (1 - mm) + np.array([10, 13, 24], np.float32) * mm
    out = Image.fromarray(a.astype(np.uint8), 'RGBA')
    if bars:
        dr = ImageDraw.Draw(out)
        n = 28
        for i in range(n):
            ang = i / n * 2 * np.pi
            ln = (6 + 9 * abs(np.sin(i * 1.7)) * abs(np.cos(i * 0.6))) * k
            r0 = 25 * k
            x0, y0 = W / 2 + np.cos(ang) * r0, W / 2 + np.sin(ang) * r0
            x1, y1 = W / 2 + np.cos(ang) * (r0 + ln), W / 2 + np.sin(ang) * (r0 + ln)
            dr.line([(x0, y0), (x1, y1)], fill=(255, 200, 40, 255), width=max(2, int(3 * k)))
    return out


def clear_disk(im):
    """Tira o círculo dourado do miolo: o centro fica escuro, liso, e o app desenha ali ondas
    sonoras douradas em círculo, que se mexem para dentro e para fora com a voz."""
    im = im.convert('RGBA')
    a = np.asarray(im).astype(np.float32)
    W = im.width
    k = W / 300
    yy, xx = np.mgrid[0:im.height, 0:W]
    d = np.hypot(xx - W / 2, yy - im.height / 2)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = (r - b > 35) & (g > 60) & (d < 30 * k)
    mi = Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7)).filter(ImageFilter.GaussianBlur(1.5 * k))
    mm = np.asarray(mi).astype(np.float32)[..., None] / 255
    dark = np.array([10, 13, 24], np.float32)
    a[..., :3] = a[..., :3] * (1 - mm) + dark * mm
    return Image.fromarray(np.clip(a, 0, 255).astype(np.uint8), 'RGBA')


def halo(path, size=600):
    # luz branca suave atrás da flor (um "sol" difuso)
    y, x = np.mgrid[0:size, 0:size] / (size - 1) * 2 - 1
    d = np.hypot(x, y)
    a = np.clip(np.exp(-(d / 0.42) ** 2) * 0.95 + np.exp(-(d / 0.75) ** 2) * 0.35, 0, 1) * np.clip((1 - d) / 0.15, 0, 1)
    img = np.dstack([np.ones_like(a), np.ones_like(a), np.ones_like(a), a])
    Image.fromarray((img * 255).astype(np.uint8), 'RGBA').save(path, 'WEBP', quality=85, method=6)


def rays(path, size=600, n=16):
    # raios de luz branca, finos e suaves, que giram devagar atrás da flor
    y, x = np.mgrid[0:size, 0:size] / (size - 1) * 2 - 1
    d, th = np.hypot(x, y), np.arctan2(y, x)
    beam = np.clip(np.cos(th * n), 0, 1) ** 6 * 0.8 + np.clip(np.cos(th * n / 2 + 0.7), 0, 1) ** 10 * 0.5
    fall = np.clip(d / 0.25, 0, 1) * np.clip((1 - d) / 0.55, 0, 1)
    a = np.clip(beam * fall, 0, 1) * 0.7
    img = np.dstack([np.ones_like(a), np.ones_like(a), np.ones_like(a), a])
    im = Image.fromarray((img * 255).astype(np.uint8), 'RGBA').filter(ImageFilter.GaussianBlur(2))
    im.save(path, 'WEBP', quality=85, method=6)


if __name__ == '__main__':
    for f in sorted(glob.glob(os.path.join(OUT, 'padrao_*.webp')) + glob.glob(os.path.join(OUT, 'fab_*.webp'))):
        im = vivid_gold(Image.open(f))
        im = clear_stamens(im, bars=os.path.basename(f).startswith('fab_'))
        im.save(f, 'WEBP', quality=82, method=6)
        print(os.path.basename(f))
    halo(os.path.join(OUT, 'light_halo.webp'))
    rays(os.path.join(OUT, 'light_rays.webp'))
    print('light_halo.webp light_rays.webp')
