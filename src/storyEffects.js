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
// Camadas (overlay) bem leves: camada forte deixava a foto leitosa, com cara de flash estourado.
// Na foto quem trabalha é o "filter" e a pele suave de verdade (APK e site: src/photoFx.js).
export const STORY_EFFECTS = [
  { key: 'original', label: 'Original', icon: 'image-outline', filter: [], overlay: null },
  { key: 'retrato', label: 'Retrato', icon: 'person-circle-outline', filter: [{ brightness: 1.03 }, { contrast: 0.95 }, { saturate: 1.06 }], overlay: 'rgba(255,214,200,0.06)', smooth: 0.55 },
  { key: 'pele', label: 'Pele suave', icon: 'happy-outline', filter: [{ brightness: 1.04 }, { contrast: 0.93 }, { saturate: 1.04 }], overlay: 'rgba(255,205,195,0.07)', smooth: 0.75 },
  // Filtros "de artista": pele limpa + luz bonita, para a foto ficar com cara de estúdio.
  { key: 'glow', label: 'Glow', icon: 'star-outline', filter: [{ brightness: 1.06 }, { contrast: 0.92 }, { saturate: 1.08 }], overlay: 'rgba(255,225,235,0.06)', smooth: 0.6 },
  { key: 'estudio', label: 'Estúdio', icon: 'bulb-outline', filter: [{ brightness: 1.05 }, { contrast: 1.06 }, { saturate: 1.03 }], overlay: 'rgba(255,255,255,0.05)', smooth: 0.5 },
  { key: 'editorial', label: 'Editorial', icon: 'newspaper-outline', filter: [{ sepia: 0.08 }, { contrast: 0.9 }, { saturate: 0.8 }, { brightness: 1.04 }], overlay: 'rgba(240,228,215,0.07)', smooth: 0.35 },
  { key: 'cyber', label: 'Cyber', icon: 'flash-outline', filter: [{ hueRotate: '-12deg' }, { saturate: 1.3 }, { contrast: 1.12 }], overlay: 'rgba(120,60,255,0.08)', smooth: 0.3 },
  { key: 'pordosol', label: 'Pôr do sol', icon: 'partly-sunny-outline', filter: [{ sepia: 0.22 }, { saturate: 1.28 }, { hueRotate: '-8deg' }, { brightness: 1.03 }], overlay: 'rgba(255,120,40,0.08)', smooth: 0.3 },
  { key: 'auto', label: 'Auto', icon: 'sparkles-outline', filter: [{ brightness: 1.03 }, { contrast: 1.08 }, { saturate: 1.1 }], overlay: 'rgba(255,236,200,0.05)' },
  { key: 'dourado', label: 'Dourado', icon: 'sunny-outline', filter: [{ sepia: 0.18 }, { saturate: 1.2 }, { contrast: 1.04 }, { brightness: 1.02 }], overlay: 'rgba(255,180,60,0.08)', smooth: 0.3 },
  { key: 'rose', label: 'Rosé', icon: 'flower-outline', filter: [{ saturate: 1.08 }, { contrast: 0.97 }, { brightness: 1.03 }], overlay: 'rgba(255,120,160,0.07)', smooth: 0.4 },
  { key: 'vintage', label: 'Vintage', icon: 'camera-outline', filter: [{ sepia: 0.35 }, { contrast: 0.92 }, { saturate: 0.85 }, { brightness: 1.03 }], overlay: 'rgba(120,80,30,0.08)' },
  { key: 'dramatico', label: 'Dramático', icon: 'contrast-outline', filter: [{ contrast: 1.3 }, { saturate: 0.9 }, { brightness: 0.95 }], overlay: 'rgba(0,0,0,0.08)' },
  { key: 'hd', label: 'HD', icon: 'aperture-outline', filter: [{ contrast: 1.15 }, { saturate: 1.06 }], overlay: 'rgba(20,20,40,0.05)' },
  { key: 'noite', label: 'Noite', icon: 'moon-outline', filter: [{ brightness: 1.22 }, { contrast: 1.1 }, { saturate: 0.95 }], overlay: 'rgba(120,140,255,0.07)' },
  { key: 'vivo', label: 'Cores vivas', icon: 'color-palette-outline', filter: [{ saturate: 1.35 }, { contrast: 1.06 }], overlay: 'rgba(255,60,140,0.05)' },
  { key: 'frio', label: 'Frio', icon: 'snow-outline', filter: [{ hueRotate: '-8deg' }, { saturate: 0.95 }, { contrast: 1.06 }], overlay: 'rgba(0,140,255,0.08)' },
  { key: 'cinema', label: 'Cinema', icon: 'film-outline', filter: [{ contrast: 1.18 }, { saturate: 0.82 }, { brightness: 0.97 }], overlay: 'rgba(0,40,50,0.10)' },
  { key: 'pb', label: 'P&B', icon: 'contrast-outline', filter: [{ grayscale: 1 }, { contrast: 1.15 }], overlay: 'rgba(128,128,128,0.45)' },
];
// Efeitos antigos guardados em stories já publicados continuam aparecendo.
const ANTIGOS = { luz: 'auto', quente: 'dourado' };

const BY_KEY = Object.fromEntries(STORY_EFFECTS.map((e) => [e.key, e]));
Object.entries(ANTIGOS).forEach(([k, v]) => (BY_KEY[k] = BY_KEY[v]));
export const smoothOf = (key) => (BY_KEY[key] && BY_KEY[key].smooth) || 0;

// Estilo para pôr só numa FOTO (<Image>). Sem efeito, não muda nada.
// Nunca usar em <View> que tenha câmera ou vídeo dentro.
export function effectStyle(key) {
  const e = BY_KEY[key];
  return e && e.filter.length ? { filter: e.filter } : null;
}

// Cor da camada por cima. Na foto o "filter" já faz o efeito: a camada por cima deixava a foto
// lavada (cara de flash), então na foto não vai camada nenhuma.
export function effectOverlay(key, onImage = false) {
  const e = BY_KEY[key];
  if (!e || onImage) return null;
  return e.overlay;
}

export const STORY_VIDEO_MAX_S = 30; // vídeo curto do story: até 30 segundos
