// Tratamento de foto do Realyz (stories, mural, galeria, posts):
// - cortar e girar (expo-image-manipulator, no APK e no site);
// - pele suave de verdade: um filtro que alisa onde a cor é parecida (pele: espinhas, manchas,
//   poros) e não mexe onde há contorno (olhos, boca, cabelo, sobrancelha). Assim o rosto fica limpo
//   sem a cara de "borrado";
// - cor do efeito (brilho, contraste, saturação, sépia, P&B, tom) gravada na própria foto.
// No APK o trabalho pesado é feito pelo Skia (placa de vídeo do celular). No site, por um <canvas>.
// Se qualquer parte falhar, a foto segue como estava (nunca trava a publicação).
import { Platform } from 'react-native';
import { STORY_EFFECTS } from './storyEffects';

const WEB = Platform.OS === 'web';
const MAX_SIDE = 1600; // tamanho máximo da foto tratada (qualidade boa e rápida)

let IM = null;
try {
  IM = require('expo-image-manipulator');
} catch (e) {}
let SK = null;
if (!WEB) {
  try {
    SK = require('@shopify/react-native-skia');
    if (!SK || !SK.Skia) SK = null;
  } catch (e) {
    SK = null;
  }
}

const BY_KEY = Object.fromEntries(STORY_EFFECTS.map((e) => [e.key, e]));
export const effectOf = (key) => BY_KEY[key] || null;

// ───────── cortar / girar / reduzir ─────────
// ops: { rotate: 90, crop: { originX, originY, width, height }, maxSide }
export async function transformPhoto(uri, ops = {}) {
  if (!IM || !uri) return uri;
  const { rotate, crop, maxSide } = ops;
  try {
    if (IM.ImageManipulator && IM.ImageManipulator.manipulate) {
      const ctx = IM.ImageManipulator.manipulate(uri);
      if (rotate) ctx.rotate(rotate);
      if (crop) ctx.crop(crop);
      if (maxSide && ops.size) {
        const { w, h } = ops.size;
        if (Math.max(w, h) > maxSide) ctx.resize(w >= h ? { width: maxSide } : { height: maxSide });
      }
      const img = await ctx.renderAsync();
      const out = await img.saveAsync({ compress: 0.93, format: IM.SaveFormat.JPEG });
      return out.uri;
    }
    const actions = [];
    if (rotate) actions.push({ rotate });
    if (crop) actions.push({ crop });
    if (maxSide && ops.size && Math.max(ops.size.w, ops.size.h) > maxSide)
      actions.push({ resize: ops.size.w >= ops.size.h ? { width: maxSide } : { height: maxSide } });
    const out = await IM.manipulateAsync(uri, actions, { compress: 0.93, format: IM.SaveFormat.JPEG });
    return out.uri;
  } catch (e) {
    return uri;
  }
}

// ───────── matriz de cor (mesma conta dos filtros do navegador) ─────────
const ID = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]; // 3 linhas x (r, g, b, soma)
function mul(b, a) {
  // aplica "a" e depois "b"
  const o = [];
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) o[r * 4 + c] = b[r * 4] * a[c] + b[r * 4 + 1] * a[4 + c] + b[r * 4 + 2] * a[8 + c];
    o[r * 4 + 3] = b[r * 4] * a[3] + b[r * 4 + 1] * a[7] + b[r * 4 + 2] * a[11] + b[r * 4 + 3];
  }
  return o;
}
const m3 = (v, off = 0) => [v[0], v[1], v[2], off, v[3], v[4], v[5], off, v[6], v[7], v[8], off];
function stepMatrix(f) {
  const k = Object.keys(f)[0];
  const v = f[k];
  if (k === 'brightness') return m3([v, 0, 0, 0, v, 0, 0, 0, v]);
  if (k === 'contrast') return m3([v, 0, 0, 0, v, 0, 0, 0, v], (1 - v) / 2);
  if (k === 'saturate')
    return m3([0.213 + 0.787 * v, 0.715 - 0.715 * v, 0.072 - 0.072 * v, 0.213 - 0.213 * v, 0.715 + 0.285 * v, 0.072 - 0.072 * v, 0.213 - 0.213 * v, 0.715 - 0.715 * v, 0.072 + 0.928 * v]);
  if (k === 'sepia') {
    const a = 1 - Math.min(1, v);
    return m3([0.393 + 0.607 * a, 0.769 - 0.769 * a, 0.189 - 0.189 * a, 0.349 - 0.349 * a, 0.686 + 0.314 * a, 0.168 - 0.168 * a, 0.272 - 0.272 * a, 0.534 - 0.534 * a, 0.131 + 0.869 * a]);
  }
  if (k === 'grayscale') {
    const a = 1 - Math.min(1, v);
    return m3([0.2126 + 0.7874 * a, 0.7152 - 0.7152 * a, 0.0722 - 0.0722 * a, 0.2126 - 0.2126 * a, 0.7152 + 0.2848 * a, 0.0722 - 0.0722 * a, 0.2126 - 0.2126 * a, 0.7152 - 0.7152 * a, 0.0722 + 0.9278 * a]);
  }
  if (k === 'hueRotate') {
    const rad = (parseFloat(v) * Math.PI) / 180;
    const c = Math.cos(rad);
    const s = Math.sin(rad);
    return m3([
      0.213 + c * 0.787 - s * 0.213, 0.715 - c * 0.715 - s * 0.715, 0.072 - c * 0.072 + s * 0.928,
      0.213 - c * 0.213 + s * 0.143, 0.715 + c * 0.285 + s * 0.14, 0.072 - c * 0.072 - s * 0.283,
      0.213 - c * 0.213 - s * 0.787, 0.715 - c * 0.715 + s * 0.715, 0.072 + c * 0.928 + s * 0.072,
    ]);
  }
  return ID;
}
export function colorMatrix(effectKey) {
  const e = effectOf(effectKey);
  if (!e || !e.filter || !e.filter.length) return null;
  return e.filter.reduce((acc, f) => mul(stepMatrix(f), acc), ID);
}
// Formato 4x5 do Skia (a soma vai de 0 a 1).
const skiaMatrix = (m) => [m[0], m[1], m[2], 0, m[3], m[4], m[5], m[6], 0, m[7], m[8], m[9], m[10], 0, m[11], 0, 0, 0, 1, 0];
const cssFilter = (e) =>
  (e.filter || [])
    .map((f) => {
      const k = Object.keys(f)[0];
      const v = f[k];
      return k === 'hueRotate' ? `hue-rotate(${v})` : `${k}(${v})`;
    })
    .join(' ');

// Quanto alisa: "smooth" do efeito (0 a 1) vira força da mistura e quanto de diferença de cor
// ainda conta como pele.
const smoothParams = (amount) => ({ mix: Math.min(0.92, 0.45 + amount * 0.55), range: 70 - amount * 40, passes: amount >= 0.6 ? 2 : 1 });

// ───────── APK: Skia ─────────
const SKSL = `
uniform shader image;
uniform float stepPx;
uniform float amount;
uniform float range;
half4 main(float2 xy) {
  half4 c = image.eval(xy);
  float3 c0 = float3(c.rgb);
  float3 sum = float3(0.0);
  float wsum = 0.0;
  for (int i = -3; i <= 3; i++) {
    for (int j = -3; j <= 3; j++) {
      float2 o = float2(float(i), float(j)) * stepPx;
      float3 s = float3(image.eval(xy + o).rgb);
      float3 d = s - c0;
      float w = exp(-dot(d, d) * range - float(i * i + j * j) / 9.0);
      sum += s * w;
      wsum += w;
    }
  }
  float3 sm = sum / wsum;
  return half4(half3(mix(c0, sm, amount)), c.a);
}`;
let skEffect;
const skRuntime = () => {
  if (skEffect === undefined) {
    try {
      skEffect = SK.Skia.RuntimeEffect.Make(SKSL) || null;
    } catch (e) {
      skEffect = null;
    }
  }
  return skEffect;
};

async function skiaProcess(uri, { smooth, matrix }) {
  const { Skia, TileMode, FilterMode, MipmapMode, ImageFormat } = SK;
  const data = await Skia.Data.fromURI(uri);
  let img = Skia.Image.MakeImageFromEncoded(data);
  if (!img) return uri;
  const w = img.width();
  const h = img.height();
  const surface = (Skia.Surface.MakeOffscreen && Skia.Surface.MakeOffscreen(w, h)) || Skia.Surface.Make(w, h);
  if (!surface) return uri;
  const canvas = surface.getCanvas();
  const rect = Skia.XYWHRect(0, 0, w, h);
  const cf = matrix ? Skia.ColorFilter.MakeMatrix(skiaMatrix(matrix)) : null;
  const rt = smooth ? skRuntime() : null;
  if (rt) {
    const p = smoothParams(smooth);
    const stepPx = Math.max(1, Math.max(w, h) / 760);
    for (let k = 0; k < p.passes; k++) {
      const shader = img.makeShaderOptions(TileMode.Clamp, TileMode.Clamp, FilterMode.Linear, MipmapMode.None);
      const fx = rt.makeShaderWithChildren([stepPx * (k ? 0.6 : 1), p.mix, p.range], [shader]);
      const paint = Skia.Paint();
      paint.setShader(fx);
      if (cf && k === p.passes - 1) paint.setColorFilter(cf);
      canvas.drawRect(rect, paint);
      surface.flush();
      img = surface.makeImageSnapshot();
    }
  } else if (cf) {
    const paint = Skia.Paint();
    paint.setColorFilter(cf);
    canvas.drawImage(img, 0, 0, paint);
    surface.flush();
    img = surface.makeImageSnapshot();
  } else return uri;
  if (img.makeNonTextureImage) img = img.makeNonTextureImage();
  const bytes = img.encodeToBytes(ImageFormat.JPEG, 92);
  if (!bytes || !bytes.length) return uri;
  const { File, Paths } = require('expo-file-system');
  const f = new File(Paths.cache, `realyz_fx_${Date.now()}.jpg`);
  try {
    f.create();
  } catch (e) {}
  f.write(bytes);
  return f.uri;
}

// ───────── site: canvas ─────────
function bilateralWeb(ctx, w, h, amount) {
  const p = smoothParams(amount);
  const src = ctx.getImageData(0, 0, w, h);
  let a = src.data;
  const R = 2;
  const step = Math.max(1, Math.round(Math.max(w, h) / 760));
  const rangeK = p.range / (255 * 255);
  const spatial = [];
  for (let i = -R; i <= R; i++) for (let j = -R; j <= R; j++) spatial.push([i * step, j * step, Math.exp(-(i * i + j * j) / 4)]);
  const lut = new Float32Array(3 * 256 * 256);
  for (let d = 0; d < lut.length; d++) lut[d] = Math.exp(-d * rangeK);
  for (let pass = 0; pass < p.passes; pass++) {
    const out = new Uint8ClampedArray(a.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const o = (y * w + x) * 4;
        const r0 = a[o], g0 = a[o + 1], b0 = a[o + 2];
        let sr = 0, sg = 0, sb = 0, ws = 0;
        for (let k = 0; k < spatial.length; k++) {
          const s = spatial[k];
          let yy = y + s[0];
          let xx = x + s[1];
          if (yy < 0) yy = 0; else if (yy >= h) yy = h - 1;
          if (xx < 0) xx = 0; else if (xx >= w) xx = w - 1;
          const q = (yy * w + xx) * 4;
          const dr = a[q] - r0, dg = a[q + 1] - g0, db = a[q + 2] - b0;
          const wt = s[2] * lut[dr * dr + dg * dg + db * db];
          sr += a[q] * wt; sg += a[q + 1] * wt; sb += a[q + 2] * wt; ws += wt;
        }
        out[o] = r0 + (sr / ws - r0) * p.mix;
        out[o + 1] = g0 + (sg / ws - g0) * p.mix;
        out[o + 2] = b0 + (sb / ws - b0) * p.mix;
        out[o + 3] = a[o + 3];
      }
    }
    a = out;
  }
  ctx.putImageData(new ImageData(a, w, h), 0, 0);
}

async function webProcess(uri, { smooth, effect, colors, maxSide }) {
  if (typeof document === 'undefined') return uri;
  const img = await new Promise((ok, fail) => {
    const i = new window.Image();
    i.crossOrigin = 'anonymous';
    i.onload = () => ok(i);
    i.onerror = fail;
    i.src = uri;
  });
  const escala = Math.min(1, (maxSide || MAX_SIDE) / Math.max(img.width, img.height));
  const w = Math.round(img.width * escala);
  const h = Math.round(img.height * escala);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d', { willReadFrequently: true });
  if (!ctx) return uri;
  const e = effectOf(effect);
  if (colors && e && e.filter && e.filter.length && 'filter' in ctx) ctx.filter = cssFilter(e);
  ctx.drawImage(img, 0, 0, w, h);
  ctx.filter = 'none';
  if (smooth) bilateralWeb(ctx, w, h, smooth);
  const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.92));
  return blob ? URL.createObjectURL(blob) : uri;
}

// Trata a foto com o efeito escolhido.
// colors: true grava também a cor do efeito (mural, galeria, posts). Nos stories fica false,
// porque lá a cor é aplicada na hora de mostrar (dá para trocar o efeito depois).
// maxSide: tamanho máximo (para a prévia rápida no editor, usar menor).
export async function processPhoto(uri, { effect = 'original', colors = true, maxSide = MAX_SIDE } = {}) {
  if (!uri) return uri;
  const e = effectOf(effect);
  const smooth = (e && e.smooth) || 0;
  const matrix = colors ? colorMatrix(effect) : null;
  if (!smooth && !matrix) return uri;
  try {
    if (WEB) return await webProcess(uri, { smooth, effect, colors, maxSide });
    if (!SK) return uri;
    let base = uri;
    if (IM) {
      const size = await sizeOf(uri);
      if (size && Math.max(size.w, size.h) > maxSide) base = await transformPhoto(uri, { maxSide, size });
    }
    return await skiaProcess(base, { smooth, matrix });
  } catch (err) {
    return uri;
  }
}

export function sizeOf(uri) {
  const { Image } = require('react-native');
  return new Promise((ok) => Image.getSize(uri, (w, h) => ok({ w, h }), () => ok(null)));
}

// Dá para alisar a pele neste aparelho? (o editor mostra "prévia da pele" só quando dá)
export const canSmooth = () => WEB || !!SK;
