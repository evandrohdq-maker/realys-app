// Contas de teste: o administrador cria contas sem CPF para testar o app antes do lançamento
// (perfil, amizade, stories, depoimentos, conversas). Ficam marcadas como "Teste" (users.teste = 1),
// não compram nada (as compras seguem a trava normal) e podem ser desativadas a qualquer hora.
// Criar pelo servidor:  bash /opt/realys/server/deploy/conta-teste.sh
import { newId, now, fail } from './http.js';
import { hashPassword, cleanUsername, usernameProblem, passwordProblem } from './auth.js';
import { TERMO_ADESAO_VERSAO } from './termos.js';
import { tx } from './db.js';

// tipo: 'pessoa' (padrão) · 'prestador' (já com perfil de trabalho e cadastro de serviço) · 'empresa'
// (conta de empresa com a página da loja). Sem CNPJ de verdade: o número fica "teste-...".
export function criarContaTeste(db, { name, username, password, tipo = 'pessoa' }) {
  if (!['pessoa', 'prestador', 'empresa'].includes(tipo)) fail(400, 'Tipo de conta de teste inválido.');
  const nome = String(name || '').trim().slice(0, 80);
  if (nome.length < 2) fail(400, 'Escreva o nome da conta de teste.');
  const user = cleanUsername(username);
  const up = usernameProblem(user);
  if (up) fail(400, up);
  const pp = passwordProblem(password);
  if (pp) fail(400, pp);
  if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(user)) fail(409, 'Esse usuário já está em uso. Escolha outro.');
  const id = newId('u');
  tx(db, () => {
    const kind = tipo === 'empresa' ? 'empresa' : 'pessoa';
    const roles = tipo === 'empresa' ? ['empresa', 'fornecedor', 'usuario'] : tipo === 'prestador' ? ['usuario', 'prestador'] : ['usuario'];
    db.prepare(
      `INSERT INTO users (id, kind, name, username, pass_hash, roles, about, maior_idade, teste, termos_versao, termos_aceite_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Conta de teste do Realyz', 1, 1, ?, ?, ?)`
    ).run(id, kind, nome, user, hashPassword(password), JSON.stringify(roles), TERMO_ADESAO_VERSAO, now(), now());
    db.prepare('INSERT OR IGNORE INTO wallets (user_id) VALUES (?)').run(id);
    const cnpjTeste = `teste-${id}`.slice(0, 40);
    if (tipo === 'empresa') {
      db.prepare('INSERT INTO companies (id, owner_id, name, cnpj, segment, about, created_at) VALUES (?,?,?,?,?,?,?)').run(newId('c'), id, nome, cnpjTeste, 'Teste', 'Empresa de teste do Realyz', now());
    }
    if (tipo === 'prestador') {
      db.prepare("INSERT INTO perfis_trabalho (id, owner_id, tipo, cnpj, nome, status, created_at) VALUES (?, ?, 'prestador', ?, ?, 'ativo', ?)").run(newId('pt'), id, cnpjTeste, nome, now());
      db.prepare('INSERT INTO providers (user_id, service, functions, price, price_unit, visit_fee, updated_at) VALUES (?,?,?,?,?,?,?)').run(id, 'marceneiro', JSON.stringify(['Móveis planejados', 'Móveis sob medida']), 0, 'projeto', 6000, now());
    }
  });
  return { id, name: nome, username: user, teste: true, tipo };
}

export const listarContasTeste = (db) =>
  db
    .prepare("SELECT id, name, username, status, kind, roles, created_at AS createdAt FROM users WHERE teste = 1 AND status = 'ativo' ORDER BY created_at DESC")
    .all()
    .map((u) => ({ id: u.id, name: u.name, username: u.username, status: u.status, createdAt: u.createdAt, tipo: u.kind === 'empresa' ? 'empresa' : JSON.parse(u.roles).includes('prestador') ? 'prestador' : 'pessoa' }));

// Desativa (não apaga, para não quebrar conversas e posts ligados a ela) e libera o *usuário.
export function desativarContaTeste(db, id) {
  const u = db.prepare('SELECT * FROM users WHERE id = ? AND teste = 1').get(String(id || ''));
  if (!u) fail(404, 'Conta de teste não encontrada.');
  db.prepare(`UPDATE users SET status = 'bloqueado', bloqueio_motivo = 'Conta de teste desativada', username = ? WHERE id = ?`).run(`teste_off_${u.id}`.slice(0, 40), u.id);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
  return { id: u.id, desativada: true };
}

export default function contasTesteRoutes(r, { db }) {
  const A = { auth: 'admin' };
  r.post('/admin/contas-teste', ({ body }) => criarContaTeste(db, body), { ...A, status: 201 });
  r.get('/admin/contas-teste', () => listarContasTeste(db), A);
  r.delete('/admin/contas-teste/:id', ({ params }) => desativarContaTeste(db, params.id), A);
}
