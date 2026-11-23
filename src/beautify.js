// Pele suave de verdade na foto (efeitos "Retrato", "Pele suave", "Dourado" e "Rosé").
// No site (computador e navegador do celular): desenha a foto num <canvas>, mistura uma cópia
// desfocada por cima (alisa espinhas, manchas e poros) e devolve o contraste com uma camada de luz
// suave, para o rosto não ficar "borrado". O resultado vira a própria foto publicada.
// No APK a foto segue com o ajuste de cor do efeito (o alisamento lá precisa de um componente gráfico
// novo no app; ver PENDENCIAS.md).
import { Platform } from 'react-native';
import { smoothOf } from './storyEffects';

export async function beautify(uri, effect) {
  const amount = smoothOf(effect);
  if (!amount || Platform.OS !== 'web' || typeof document === 'undefined' || !uri) return uri;
  try {
    const img = await new Promise((ok, fail) => {
      const i = new window.Image();
      i.crossOrigin = 'anonymous';
      i.onload = () => ok(i);
      i.onerror = fail;
      i.src = uri;
    });
    const escala = Math.min(1, 1600 / Math.max(img.width, img.height));
    const w = Math.round(img.width * escala);
    const h = Math.round(img.height * escala);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d');
    if (!ctx || !('filter' in ctx)) return uri;
    ctx.drawImage(img, 0, 0, w, h);
    // Cópia desfocada por cima: o raio acompanha o tamanho da foto.
    const raio = Math.max(2, Math.round(Math.min(w, h) / 180));
    ctx.globalAlpha = 0.28 + amount * 0.3;
    ctx.filter = `blur(${raio}px)`;
    ctx.drawImage(img, 0, 0, w, h);
    // Devolve o contorno (olhos, boca, cabelo) com uma camada de luz suave da foto original.
    ctx.filter = 'none';
    ctx.globalAlpha = 0.22;
    ctx.globalCompositeOperation = 'soft-light';
    ctx.drawImage(img, 0, 0, w, h);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    const blob = await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.92));
    return blob ? URL.createObjectURL(blob) : uri;
  } catch (e) {
    return uri;
  }
}
