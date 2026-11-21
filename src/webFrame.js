// Site no computador: o Re@lys é um app de celular, então no navegador largo ele fica numa coluna
// central do tamanho de um celular (480 px), e as telas calculam a largura por essa coluna.
// No APK e no celular (navegador estreito) nada muda.
import { Platform, Dimensions } from 'react-native';

export const WEB_MAX = 480;

if (Platform.OS === 'web') {
  const get = Dimensions.get.bind(Dimensions);
  Dimensions.get = (dim) => {
    const d = get(dim);
    return d && d.width > WEB_MAX ? { ...d, width: WEB_MAX } : d;
  };
  if (typeof document !== 'undefined') {
    const s = document.createElement('style');
    s.textContent = 'html,body{background:#EFE8D8;} body{overscroll-behavior:none;}';
    document.head.appendChild(s);
  }
}
