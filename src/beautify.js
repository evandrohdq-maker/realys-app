// Pele suave de verdade na foto do story (efeitos com "smooth": Retrato, Pele suave, Glow, Estúdio,
// Dourado, Rosé, Pôr do sol). Agora no APK e no site: alisa espinhas, manchas e poros e mantém
// olhos, boca e cabelo nítidos (src/photoFx.js). A cor do efeito NÃO é gravada aqui: no story
// ela é aplicada na hora de mostrar.
import { smoothOf } from './storyEffects';
import { processPhoto } from './photoFx';

export async function beautify(uri, effect) {
  if (!uri || !smoothOf(effect)) return uri;
  return processPhoto(uri, { effect, colors: false });
}
