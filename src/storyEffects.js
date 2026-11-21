// Efeitos dos stories: ajustes de imagem para a foto ou o vídeo ficarem com mais qualidade
// (luz, contraste, cor), sem figurinhas nem máscaras. O efeito fica guardado no story e é
// aplicado na hora de mostrar, igual para quem publica e para quem assiste.
//
// Cada efeito tem duas partes:
// - "overlay": uma camada de cor por cima. Funciona em qualquer Android, na câmera ao vivo,
//   no vídeo e na foto. É ela que garante que o efeito sempre aparece.
// - "filter": o ajuste fino (contraste, saturação, P&B). Só vai na FOTO. Na câmera ao vivo e
//   no vídeo o "filter" não funciona (a imagem é desenhada fora da tela do app) e ainda
//   causava tela preta e a tela cortada no meio, então lá não é usado.
export const STORY_EFFECTS = [
  { key: 'original', label: 'Original', icon: 'image-outline', filter: [], overlay: null },
  { key: 'auto', label: 'Auto', icon: 'sparkles-outline', filter: [{ brightness: 1.05 }, { contrast: 1.1 }, { saturate: 1.12 }], overlay: 'rgba(255,236,200,0.10)' },
  { key: 'hd', label: 'HD', icon: 'aperture-outline', filter: [{ contrast: 1.2 }, { saturate: 1.08 }, { brightness: 1.02 }], overlay: 'rgba(20,20,40,0.10)' },
  { key: 'luz', label: 'Mais luz', icon: 'sunny-outline', filter: [{ brightness: 1.18 }, { contrast: 1.05 }], overlay: 'rgba(255,255,255,0.20)' },
  { key: 'noite', label: 'Noite', icon: 'moon-outline', filter: [{ brightness: 1.3 }, { contrast: 1.15 }, { saturate: 0.95 }], overlay: 'rgba(120,140,255,0.16)' },
  { key: 'vivo', label: 'Cores vivas', icon: 'color-palette-outline', filter: [{ saturate: 1.4 }, { contrast: 1.08 }], overlay: 'rgba(255,60,140,0.10)' },
  { key: 'pele', label: 'Pele suave', icon: 'happy-outline', filter: [{ brightness: 1.06 }, { contrast: 0.94 }, { saturate: 1.05 }, { sepia: 0.06 }], overlay: 'rgba(255,200,190,0.16)' },
  { key: 'quente', label: 'Quente', icon: 'flame-outline', filter: [{ sepia: 0.2 }, { saturate: 1.15 }, { contrast: 1.05 }], overlay: 'rgba(255,140,0,0.18)' },
  { key: 'frio', label: 'Frio', icon: 'snow-outline', filter: [{ hueRotate: '-8deg' }, { saturate: 0.95 }, { contrast: 1.08 }], overlay: 'rgba(0,140,255,0.16)' },
  { key: 'cinema', label: 'Cinema', icon: 'film-outline', filter: [{ contrast: 1.22 }, { saturate: 0.82 }, { brightness: 0.96 }], overlay: 'rgba(0,40,50,0.22)' },
  { key: 'pb', label: 'P&B', icon: 'contrast-outline', filter: [{ grayscale: 1 }, { contrast: 1.18 }], overlay: 'rgba(128,128,128,0.45)', overlayOnImage: null },
];

const BY_KEY = Object.fromEntries(STORY_EFFECTS.map((e) => [e.key, e]));

// Estilo para pôr só numa FOTO (<Image>). Sem efeito, não muda nada.
// Nunca usar em <View> que tenha câmera ou vídeo dentro.
export function effectStyle(key) {
  const e = BY_KEY[key];
  return e && e.filter.length ? { filter: e.filter } : null;
}

// Cor da camada por cima. Na foto, onde o "filter" já faz o P&B, não precisa da camada cinza.
export function effectOverlay(key, onImage = false) {
  const e = BY_KEY[key];
  if (!e) return null;
  if (onImage && 'overlayOnImage' in e) return e.overlayOnImage;
  return e.overlay;
}

export const STORY_VIDEO_MAX_S = 30; // vídeo curto do story: até 30 segundos
