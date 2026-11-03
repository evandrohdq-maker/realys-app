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
  };
};
