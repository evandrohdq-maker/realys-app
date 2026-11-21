// Metro: no site (web), os módulos só do Android viram os substitutos de web-shims/.
// No APK nada muda.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const shim = (f) => path.resolve(__dirname, 'web-shims', f);
const WEB = {
  'react-native-webrtc': shim('empty.js'),
  '@react-native-ml-kit/face-detection': shim('empty.js'),
  'realys-updater': shim('empty.js'),
  'expo-intent-launcher': shim('intent-launcher.js'),
  'expo-local-authentication': shim('local-authentication.js'),
  'expo-screen-capture': shim('screen-capture.js'),
  'expo-secure-store': shim('secure-store.js'),
};
const original = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && WEB[moduleName]) return { type: 'sourceFile', filePath: WEB[moduleName] };
  return original ? original(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};
module.exports = config;
