// Apaga TODAS as contas do servidor, menos: administrador, analista e contas de teste (e as contas do
// sistema). Também apaga tudo que é dessas contas em todas as tabelas (posts, pedidos, conversas,
// amizades, biometria, sessões, carteira...). Feito para recomeçar o piloto do zero.
// Rodar pelo deploy/limpar-contas.sh (ele faz o backup antes e pede confirmação).
import { DatabaseSync } from 'node:sqlite';
import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const arquivo = process.argv[2] || 'data/realys.db';
const executar = process.argv[3] === '--apagar';
const db = new DatabaseSync(arquivo);

const todos = db.prepare('SELECT id, name, username, kind, roles, teste FROM users').all();
const fica = (u) => {
  const roles = JSON.parse(u.roles || '[]');
  return u.kind === 'sistema' || u.teste || roles.includes('admin') || roles.includes('analista');
};
const ficam = todos.filter(fica);
const saem = todos.filter((u) => !fica(u));
console.log(`Ficam ${ficam.length}: ${ficam.map((u) => '*' + (u.username || u.name)).join(', ')}`);
console.log(`Saem ${saem.length}: ${saem.map((u) => '*' + (u.username || u.name)).join(', ') || '(nenhuma)'}`);
if (!executar || !saem.length) process.exit(0);

const ids = new Set(saem.map((u) => u.id));
const tabelas = db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'").all().map((t) => t.name);
// Arquivos de mídia dessas contas (fotos, vídeos, músicas) também saem do disco.
const midiaDir = join(arquivo, '..', 'media');
let midias = 0;
const temMedia = tabelas.includes('media') && db.prepare("SELECT 1 FROM pragma_table_info('media') WHERE name = 'owner_id'").get();
if (temMedia) {
  for (const m of db.prepare('SELECT id, owner_id FROM media').all()) {
    if (ids.has(m.owner_id)) {
      const f = join(midiaDir, m.id);
      if (existsSync(f)) rmSync(f, { force: true });
      midias++;
    }
  }
}
db.exec('PRAGMA foreign_keys = OFF');
db.exec('BEGIN');
let linhas = 0;
for (const t of tabelas) {
  if (t === 'users') continue;
  const cols = db.prepare(`SELECT name FROM pragma_table_info('${t}')`).all().map((c) => c.name).filter((c) => /(^|_)(user|owner|author|from|to|a|b|viewer|seller|buyer|provider|client|cliente|customer|sender|target|reporter|follower|followed|friend|member|host|creator|by|dono|autor|empresa|company_owner)_id$/.test(c) || c === 'user_id');
  for (const c of cols) {
    const del = db.prepare(`DELETE FROM "${t}" WHERE "${c}" = ?`);
    for (const id of ids) linhas += Number(del.run(id).changes || 0);
  }
}
const delU = db.prepare('DELETE FROM users WHERE id = ?');
for (const id of ids) delU.run(id);
db.exec('COMMIT');
db.exec('VACUUM');
console.log(`✅ ${saem.length} contas apagadas, ${linhas} registros ligados a elas e ${midias} arquivos de mídia.`);
