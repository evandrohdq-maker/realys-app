// Lê o app.json e acrescenta o número da versão gerado pelo GitHub.
// Cada APK novo recebe um versionCode maior, para o Android aceitar instalar por cima.
module.exports = ({ config }) => {
  const build = Number(process.env.BUILD_NUMBER || 0);
  return {
    ...config,
    android: {
      ...config.android,
      versionCode: build ? 10 + build : config.android.versionCode,
      // Notificações push no Android: arquivo do Firebase (o GitHub cria a partir do segredo
      // GOOGLE_SERVICES_JSON). Sem ele o APK funciona igual, só sem push.
      ...(require('fs').existsSync(__dirname + '/google-services.json') ? { googleServicesFile: './google-services.json' } : {}),
    },
    // Site do Re@lys (mesmo app, no navegador). WEB_BASE = pasta onde o site fica publicado.
    web: { ...(config.web || {}), bundler: 'metro', output: 'single', name: 'Re@lys', shortName: 'Re@lys', themeColor: '#B07A0C', backgroundColor: '#FBF8F1', favicon: './assets/icon.png' },
    experiments: { ...(config.experiments || {}), baseUrl: process.env.WEB_BASE || '' },
  };
};
