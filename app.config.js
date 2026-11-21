// Lê o app.json e acrescenta o número da versão gerado pelo GitHub.
// Cada APK novo recebe um versionCode maior, para o Android aceitar instalar por cima.
module.exports = ({ config }) => {
  const build = Number(process.env.BUILD_NUMBER || 0);
  return {
    ...config,
    android: {
      ...config.android,
      versionCode: build ? 10 + build : config.android.versionCode,
    },
    // Site do Re@lys (mesmo app, no navegador). WEB_BASE = pasta onde o site fica publicado.
    web: { ...(config.web || {}), bundler: 'metro', output: 'single', name: 'Re@lys', shortName: 'Re@lys', themeColor: '#B07A0C', backgroundColor: '#FBF8F1', favicon: './assets/icon.png' },
    experiments: { ...(config.experiments || {}), baseUrl: process.env.WEB_BASE || '' },
  };
};
