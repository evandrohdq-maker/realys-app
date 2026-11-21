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
    // Faixas que rolam para o lado (stories, Reels, produtos, menus): no computador, a roda do mouse
    // em cima delas anda para o lado (o mouse não consegue "arrastar" como o dedo).
    window.addEventListener(
      'wheel',
      (e) => {
        if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
        let el = e.target;
        while (el && el !== document.body) {
          const cs = el.nodeType === 1 ? window.getComputedStyle(el) : null;
          if (cs && /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2 && !/(auto|scroll)/.test(cs.overflowY)) {
            const before = el.scrollLeft;
            el.scrollLeft += e.deltaY;
            if (el.scrollLeft !== before) e.preventDefault();
            return;
          }
          el = el.parentNode;
        }
      },
      { passive: false },
    );

    // Arrastar com o mouse (segurar o botão e puxar para o lado), como o dedo no celular.
    // Se arrastou, o clique de soltar não conta (não abre o item sem querer).
    const hScroller = (el) => {
      while (el && el !== document.body) {
        const cs = el.nodeType === 1 ? window.getComputedStyle(el) : null;
        if (cs && /(auto|scroll)/.test(cs.overflowX) && el.scrollWidth > el.clientWidth + 2) return el;
        el = el.parentNode;
      }
      return null;
    };
    let drag = null;
    window.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
      const el = hScroller(e.target);
      if (el) drag = { el, x: e.clientX, left: el.scrollLeft, moved: false };
    });
    window.addEventListener('mousemove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) < 6) return;
      drag.moved = true;
      drag.el.scrollLeft = drag.left - dx;
      document.body.style.cursor = 'grabbing';
      document.body.style.userSelect = 'none';
    });
    window.addEventListener('mouseup', () => {
      if (!drag) return;
      const moved = drag.moved;
      drag = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      if (moved) {
        const stop = (ev) => {
          ev.stopPropagation();
          ev.preventDefault();
        };
        window.addEventListener('click', stop, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', stop, { capture: true }), 50);
      }
    });
  }
}
