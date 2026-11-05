// Liga o servidor do Realys:  npm start
import { loadConfig } from './config.js';
import { createApp } from './app.js';

const cfg = loadConfig();
const app = createApp(cfg);
app.server.listen(cfg.port, cfg.host, () => {
  console.log(`Realys no ar em http://${cfg.host}:${cfg.port}  (dados em ${cfg.dataDir})`);
  if (cfg.testDeposits) console.log('Fase de testes: depósitos entram na hora, sem Pix de verdade (TEST_DEPOSITS=true).');
});

const stop = async () => {
  console.log('Desligando o Realys...');
  await app.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
