// Só no site: o mesmo react-native-web de sempre, com uma mudança no Modal.
// No computador (tela larga), toda janela e menu que abre (Modal) fica SÓ na área do meio: o menu da
// esquerda (e a coluna da direita) continuam à vista e funcionando, para voltar ao Shop, Food etc.
// Clicar no menu lateral fecha as janelas abertas (evento 'rz-desk-nav', disparado pelo DeskShell).
// No celular (navegador estreito) e no APK nada muda.
const React = require('react');
const RN = require('react-native-web');
let ReactDOM = null;
try {
  ReactDOM = require('react-dom');
} catch (e) {}

// Iguais a src/webFrame.js e src/web/DeskShell.js.
const DESK_MIN = 1000;
const RAIL_MIN = 1320;
const SIDE_W = 248;
const RAIL_W = 340;
const COLUMN = 760;
const wide = () => typeof window !== 'undefined' && window.innerWidth >= DESK_MIN;

function DeskModal(props) {
  const [w, setW] = React.useState(typeof window !== 'undefined' ? window.innerWidth : 0);
  const reqClose = React.useRef(props.onRequestClose);
  reqClose.current = props.onRequestClose;
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  // Voltar do celular no site (botão do Android/navegador): fecha a janela de cima primeiro.
  // App.js chama window.__rzModalBack() antes de voltar de aba.
  React.useEffect(() => {
    if (!props.visible || typeof window === 'undefined') return undefined;
    const entry = { close: () => reqClose.current && reqClose.current() };
    const list = (window.__rzModals = window.__rzModals || []);
    list.push(entry);
    window.__rzModalBack = () => {
      const l = window.__rzModals || [];
      const top = l[l.length - 1];
      if (!top) return false;
      top.close();
      return true;
    };
    return () => {
      const i = list.lastIndexOf(entry);
      if (i >= 0) list.splice(i, 1);
    };
  }, [props.visible]);
  // Navegou pelo menu lateral, ou apertou Esc: fecha esta janela.
  React.useEffect(() => {
    if (!props.visible || typeof window === 'undefined') return undefined;
    const nav = () => reqClose.current && reqClose.current();
    const key = (e) => e.key === 'Escape' && reqClose.current && reqClose.current();
    window.addEventListener('rz-desk-nav', nav);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('rz-desk-nav', nav);
      window.removeEventListener('keydown', key);
    };
  }, [props.visible]);

  if (!(w >= DESK_MIN) || !ReactDOM || typeof document === 'undefined') return React.createElement(RN.Modal, props);
  if (!props.visible) return null;
  const { children, transparent, deskFull } = props;
  // deskFull: o player em tela cheia (live, TV) ocupa a janela toda do navegador.
  const right = deskFull ? 0 : w >= RAIL_MIN ? RAIL_W : 0;
  const left = deskFull ? 0 : SIDE_W;
  const body = React.createElement(
    RN.View,
    { style: { position: 'fixed', top: 0, bottom: 0, left, right, zIndex: deskFull ? 1100 : 1000, alignItems: 'center', backgroundColor: transparent ? 'transparent' : 'rgba(241,235,221,0.85)' } },
    React.createElement(
      RN.View,
      { style: { flex: 1, width: '100%', maxWidth: deskFull ? undefined : COLUMN, overflow: 'hidden', ...(transparent ? null : { backgroundColor: '#FBF8F1', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#EFE6CC' }) } },
      children
    )
  );
  return ReactDOM.createPortal(body, document.body);
}

module.exports = { ...RN, Modal: DeskModal };
module.exports.DeskModal = DeskModal;
