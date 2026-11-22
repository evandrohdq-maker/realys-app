// Linha de comando: cria uma conta de teste no banco do servidor.
// Uso (pelo script deploy/conta-teste.sh, que pergunta tudo):
//   printf '%s' "$SENHA" | node src/criarContaTeste.js "Nome" usuario
import { loadConfig } from './config.js';
import { openDb } from './db.js';
import { join } from 'node:path';
import { criarContaTeste, listarContasTeste } from './contasTeste.js';

const [name, username] = process.argv.slice(2);
let password = '';
for await (const chunk of process.stdin) password += chunk;
password = password.replace(/\r?\n$/, '');

const cfg = loadConfig();
const db = openDb(cfg.dbFile || join(cfg.dataDir, 'realys.db'));
try {
  const c = criarContaTeste(db, { name, username, password });
  console.log(`✅ Conta de teste criada: ${c.name} (*${c.username})`);
  console.log(`Contas de teste ativas: ${listarContasTeste(db).filter((x) => x.status === 'ativo').map((x) => '*' + x.username).join(', ')}`);
} catch (e) {
  console.error(`❌ ${e.message}`);
  process.exitCode = 1;
} finally {
  db.close();
}
