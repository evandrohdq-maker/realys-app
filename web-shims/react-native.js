// Só no site: o mesmo react-native-web de sempre, com uma mudança no Modal.
// No computador (tela larga), toda janela e menu que abre (Modal) fica numa coluna no meio da tela,
// do tamanho das telas do app, em vez de esticar na largura do monitor. No celular nada muda.
const React = require('react');
const RN = require('react-native-web');

const DESK_MIN = 1000; // igual a src/webFrame.js
const COLUMN = 760; // igual a CONTENT_MAX
const wide = () => typeof window !== 'undefined' && window.innerWidth >= DESK_MIN;

function DeskModal(props) {
  const [isWide, setWide] = React.useState(wide());
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const on = () => setWide(wide());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  if (!isWide) return React.createElement(RN.Modal, props);
  const { children, transparent, ...rest } = props;
  return React.createElement(
    RN.Modal,
    { ...rest, transparent: true },
    React.createElement(
      RN.View,
      { style: { flex: 1, alignItems: 'center', backgroundColor: transparent ? 'transparent' : 'rgba(241,235,221,0.78)' } },
      React.createElement(
        RN.View,
        { style: { flex: 1, width: '100%', maxWidth: COLUMN, overflow: 'hidden', ...(transparent ? null : { backgroundColor: '#FBF8F1', borderLeftWidth: 1, borderRightWidth: 1, borderColor: '#EFE6CC' }) } },
        children
      )
    )
  );
}

module.exports = { ...RN, Modal: DeskModal };
