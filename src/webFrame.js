// Site no navegador. No computador (tela larga) o app ganha menu lateral e coluna da direita
// (src/web/DeskShell.js); as telas do app ficam numa coluna central e calculam a largura por ela.
// No celular (navegador estreito) e no APK nada muda.
import { Platform, Dimensions } from 'react-native';

export const DESK_MIN = 1000; // a partir daqui: menu lateral
export const RAIL_MIN = 1320; // a partir daqui: também a coluna da direita
export const CONTENT_MAX = 760; // largura máxima das telas do app no computador

export const realWidth = () => (Platform.OS === 'web' && typeof window !== 'undefined' ? window.innerWidth : Dimensions.get('window').width);

if (Platform.OS === 'web') {
  const get = Dimensions.get.bind(Dimensions);
  Dimensions.get = (dim) => {
    const d = get(dim);
    return d && d.width > CONTENT_MAX ? { ...d, width: CONTENT_MAX } : d;
  };
  if (typeof document !== 'undefined') {
    const s = document.createElement('style');
    // Rola com a roda do mouse e arrastando, mas sem mostrar a barra de rolagem.
    s.textContent = 'html,body{background:#F1EBDD;} body{overscroll-behavior:none;} *{scrollbar-width:none;-ms-overflow-style:none;} *::-webkit-scrollbar{display:none;width:0;height:0;}';
    document.head.appendChild(s);
  }
}
