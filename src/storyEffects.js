// Efeitos dos stories: ajustes de imagem para a foto ou o vídeo ficarem com mais qualidade
// (luz, contraste, cor), sem figurinhas nem máscaras. O efeito fica guardado no story e é
// aplicado na hora de mostrar, igual para quem publica e para quem assiste.
// Usa o "filter" do React Native (Android com a arquitetura nova).
export const STORY_EFFECTS = [
  { key: 'original', label: 'Original', icon: 'image-outline', filter: [] },
  { key: 'auto', label: 'Auto', icon: 'sparkles-outline', filter: [{ brightness: 1.05 }, { contrast: 1.1 }, { saturate: 1.12 }] },
  { key: 'hd', label: 'HD', icon: 'aperture-outline', filter: [{ contrast: 1.2 }, { saturate: 1.08 }, { brightness: 1.02 }] },
  { key: 'luz', label: 'Mais luz', icon: 'sunny-outline', filter: [{ brightness: 1.18 }, { contrast: 1.05 }] },
  { key: 'noite', label: 'Noite', icon: 'moon-outline', filter: [{ brightness: 1.3 }, { contrast: 1.15 }, { saturate: 0.95 }] },
  { key: 'vivo', label: 'Cores vivas', icon: 'color-palette-outline', filter: [{ saturate: 1.4 }, { contrast: 1.08 }] },
  { key: 'pele', label: 'Pele suave', icon: 'happy-outline', filter: [{ brightness: 1.06 }, { contrast: 0.94 }, { saturate: 1.05 }, { sepia: 0.06 }] },
  { key: 'quente', label: 'Quente', icon: 'flame-outline', filter: [{ sepia: 0.2 }, { saturate: 1.15 }, { contrast: 1.05 }] },
  { key: 'frio', label: 'Frio', icon: 'snow-outline', filter: [{ hueRotate: '-8deg' }, { saturate: 0.95 }, { contrast: 1.08 }] },
  { key: 'cinema', label: 'Cinema', icon: 'film-outline', filter: [{ contrast: 1.22 }, { saturate: 0.82 }, { brightness: 0.96 }] },
  { key: 'pb', label: 'P&B', icon: 'contrast-outline', filter: [{ grayscale: 1 }, { contrast: 1.18 }] },
];

const BY_KEY = Object.fromEntries(STORY_EFFECTS.map((e) => [e.key, e]));

// Estilo para pôr na foto ou no vídeo. Sem efeito, não muda nada.
export function effectStyle(key) {
  const e = BY_KEY[key];
  return e && e.filter.length ? { filter: e.filter } : null;
}

export const STORY_VIDEO_MAX_S = 30; // vídeo curto do story: até 30 segundos
