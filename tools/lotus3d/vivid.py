# Aviva o dourado do miolo da flor (padrão e botão flutuante): mais saturado, mais claro e com
# um brilho quente em volta. Também gera a luz branca que fica atrás da flor na caixa da Lotus.
# Uso: python3 vivid.py  (aplica nos quadros já gerados em assets/lotus; rode só uma vez por
# render, senão o dourado acumula)
# O render.py chama vivid_gold() sozinho em cada quadro novo.
import glob, os
import numpy as np
from PIL import Image, ImageFilter

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
        vivid_gold(Image.open(f)).save(f, 'WEBP', quality=82, method=6)
        print(os.path.basename(f))
    halo(os.path.join(OUT, 'light_halo.webp'))
    rays(os.path.join(OUT, 'light_rays.webp'))
    print('light_halo.webp light_rays.webp')
