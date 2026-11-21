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
    s.textContent = 'html,body{background:#F1EBDD;} body{overscroll-behavior:none;} *{scrollbar-width:none;-ms-overflow-style:none;} *::-webkit-scrollbar{display:none;width:0;height:0;}' +
      // Sem o quadrado preto do navegador em volta do que foi clicado. Quem navega pelo teclado (Tab)
      // vê um contorno dourado suave.
      ' body:not(.rz-kb) *{outline:none !important;} body.rz-kb *:focus{outline:2px solid rgba(226,182,73,.8) !important;outline-offset:2px;border-radius:12px;}';
    document.head.appendChild(s);
    window.addEventListener('keydown', (e) => e.key === 'Tab' && document.body.classList.add('rz-kb'));
    window.addEventListener('mousedown', () => document.body.classList.remove('rz-kb'));
  }
}
