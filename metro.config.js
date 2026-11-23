// Metro: no site (web), os módulos só do Android viram os substitutos de web-shims/.
// No APK nada muda.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const shim = (f) => path.resolve(__dirname, 'web-shims', f);
const WEB = {
  'react-native-webrtc': shim('webrtc.js'), // WebRTC do navegador (câmera, lives, chamadas)
  '@react-native-ml-kit/face-detection': shim('empty.js'),
  'realys-updater': shim('empty.js'),
  '@shopify/react-native-skia': shim('empty.js'), // no site a pele suave é feita no <canvas> (src/photoFx.js)
  'expo-intent-launcher': shim('intent-launcher.js'),
  'expo-local-authentication': shim('local-authentication.js'),
  'expo-screen-capture': shim('screen-capture.js'),
  'expo-secure-store': shim('secure-store.js'),
  'expo-notifications': shim('notifications.js'), // avisos no site chegam pelo WebSocket
};
const original = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB[moduleName]) return { type: 'sourceFile', filePath: WEB[moduleName] };
  // Telas do app no site: o Modal fica numa coluna no meio no computador (web-shims/react-native.js).
  // O Expo troca 'react-native' por 'react-native-web' (e às vezes pelo caminho direto do Modal) antes
  // de chegar aqui, então os três nomes levam ao substituto. Só para o código do app (não para as
  // bibliotecas nem para o próprio substituto).
  const fromApp = !/node_modules|web-shims/.test(context.originModulePath || '');
  if (platform === 'web' && fromApp) {
    if (moduleName === 'react-native' || moduleName === 'react-native-web') return { type: 'sourceFile', filePath: shim('react-native.js') };
    if (/^react-native-web\/dist\/(cjs\/)?exports\/Modal(\/index(\.js)?)?$/.test(moduleName)) return { type: 'sourceFile', filePath: shim('modal.js') };
  }
  return original ? original(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
