// Configuração do Metro (o empacotador do app e do site).
// No site (web), as bibliotecas que só existem no Android são trocadas por versões vazias:
// o código do app já confere se elas existem e segue sem elas.
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const SO_ANDROID = {
  'react-native-webrtc': 'web/stubs/empty.js',
  '@react-native-ml-kit/face-detection': 'web/stubs/empty.js',
};

const base = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    const hit = Object.keys(SO_ANDROID).find((m) => moduleName === m || moduleName.startsWith(m + '/'));
    if (hit) return { type: 'sourceFile', filePath: path.resolve(__dirname, SO_ANDROID[hit]) };
  }
  return base ? base(context, moduleName, platform) : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
