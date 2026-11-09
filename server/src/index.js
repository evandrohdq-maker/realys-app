// Liga o servidor do Realys:  npm start
import { loadConfig } from './config.js';
import { createApp } from './app.js';

const cfg = loadConfig();
const app = createApp(cfg);
app.server.listen(cfg.port, cfg.host, () => {
  console.log(`Realys no ar em http://${cfg.host}:${cfg.port}  (dados em ${cfg.dataDir})`);
  if (cfg.testDeposits) console.log('Fase de testes: depósitos entram na hora, sem Pix de verdade (TEST_DEPOSITS=true).');
  if (cfg.production && !cfg.biometricKeys) console.log('Aviso: BIOMETRIA_KEYS não configurada. Cadastros biométricos ficam parados até configurar.');
  if (cfg.production && !cfg.biometricServiceUrl) console.log('Aviso: BIOMETRIA_SERVICE_URL não configurada. Todo cadastro biométrico vai para revisão manual.');
  app.maintenance.start();
  app.fiscal.start();
  const falta = app.fiscal.pendenciasConfig();
  if (falta.length) console.log('Notas fiscais desligadas. Falta configurar: ' + falta.join('; '));
});

const stop = async () => {
  console.log('Desligando o Realys...');
  await app.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
