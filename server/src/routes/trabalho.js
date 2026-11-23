// Perfis de trabalho da conta (uma conta, vários perfis): a pessoa cria o perfil de prestador ou de
// artista informando o CNPJ (MEI vale). Sem ele, o perfil é só social (navegar, comprar, contratar).
//   GET    /me/trabalho          → [{ tipo, nome, cnpj, status }]
//   POST   /me/trabalho          → { tipo, cnpj, nome } cria ou atualiza o perfil desse tipo
//   DELETE /me/trabalho/:tipo    → encerra o perfil de trabalho (o social continua)
import { fail, str, newId, now } from '../http.js';
import { onlyDigits, validCnpj } from '../auth.js';
import { TIPOS_TRABALHO, consultarCnpj, conferirTitular } from '../trabalho.js';
import { podeComprar } from '../bioGate.js';

const TIPOS_PESSOA = ['prestador', 'artista', 'criador', 'professor', 'saude', 'imobiliaria', 'radio'];

export default function trabalhoRoutes(r, { db, cfg }) {
  const lista = (id) =>
    db.prepare('SELECT tipo, nome, cnpj, status, created_at AS createdAt FROM perfis_trabalho WHERE owner_id = ? ORDER BY created_at').all(id)
      .map((p) => ({ ...p, rotulo: TIPOS_TRABALHO[p.tipo] || p.tipo }));
  r.get('/me/trabalho', ({ user }) => lista(user.id));
  r.post('/me/trabalho', async ({ body, user, roles }) => {
    if (user.kind === 'empresa') fail(400, 'Esta conta já é de empresa (CNPJ).');
    const tipo = String(body.tipo || '');
    if (!TIPOS_PESSOA.includes(tipo)) fail(400, 'Escolha o tipo de trabalho.');
    const cnpj = onlyDigits(body.cnpj);
    if (!validCnpj(cnpj)) fail(400, 'CNPJ inválido. Confira os números.');
    // O CNPJ é de quem atua: não pode estar em outra conta.
    if (db.prepare('SELECT 1 FROM users WHERE doc = ? AND id != ?').get(cnpj, user.id) || db.prepare('SELECT 1 FROM perfis_trabalho WHERE cnpj = ? AND owner_id != ?').get(cnpj, user.id)) {
      fail(409, 'Esse CNPJ já está em outra conta do Realyz.');
    }
    // Atuar na plataforma exige a biometria aprovada (quem trabalha é gente de verdade).
    if (!podeComprar(db, cfg, user, roles)) fail(403, 'Faça a biometria antes de criar o perfil de trabalho.', 'biometria');
    const nome = str(body.nome, 'o nome do perfil de trabalho', { min: 2, max: 80 });
    // O CNPJ tem que ser desta pessoa (do CPF da conta). Consulta pública da Receita; se a consulta
    // estiver fora do ar, o perfil fica em análise até a equipe conferir.
    const dados = await consultarCnpj(cfg, cnpj);
    if (dados && dados.naoExiste) fail(400, 'Esse CNPJ não foi encontrado na Receita. Confira os números.');
    if (dados && dados.descricao_situacao_cadastral && !/ATIVA/i.test(dados.descricao_situacao_cadastral)) fail(400, `Esse CNPJ está ${String(dados.descricao_situacao_cadastral).toLowerCase()} na Receita.`);
    const conf = conferirTitular(dados, user.doc, user.name);
    if (conf === 'nao_confere') fail(400, 'Esse CNPJ não está no seu nome. Use um CNPJ (ou MEI) aberto com o seu CPF.', 'cnpj_outro_titular');
    const status = conf === 'confere' ? 'ativo' : 'em_analise';
    db.prepare(`INSERT INTO perfis_trabalho (id, owner_id, tipo, cnpj, nome, status, created_at) VALUES (?,?,?,?,?,?,?)
      ON CONFLICT(owner_id, tipo) DO UPDATE SET cnpj = excluded.cnpj, nome = excluded.nome, status = excluded.status`).run(newId('pt'), user.id, tipo, cnpj, nome, status, now());
    return lista(user.id);
  }, { status: 201 });
  // Empresa: o titular cria o perfil social dele (com o nome e o CPF do cadastro e a biometria dele).
  r.post('/me/perfil-social', ({ user, roles }) => {
    if (user.kind !== 'empresa') fail(400, 'Sua conta já é um perfil social.');
    if (!user.titular_cpf) fail(400, 'Informe o nome e o CPF do titular do CNPJ primeiro.', 'sem_titular');
    if (!podeComprar(db, cfg, user, roles)) fail(403, 'Faça a biometria do titular antes de criar o perfil social.', 'biometria');
    db.prepare('UPDATE users SET social_titular = 1 WHERE id = ?').run(user.id);
    return { ok: true, socialTitular: true };
  });
  r.delete('/me/trabalho/:tipo', ({ params, user }) => {
    db.prepare("UPDATE perfis_trabalho SET status = 'encerrado' WHERE owner_id = ? AND tipo = ?").run(user.id, params.tipo);
    if (params.tipo === 'prestador') db.prepare('UPDATE providers SET available = 0 WHERE user_id = ?').run(user.id);
    return lista(user.id);
  });
}

// Equipe: perfis de trabalho em análise (consulta da Receita fora do ar na hora do cadastro).
export function trabalhoAdminRoutes(r, { db }) {
  r.get('/admin/trabalho', ({ query }) =>
    db.prepare(`SELECT p.id, p.tipo, p.cnpj, p.nome, p.status, p.created_at AS createdAt, u.name AS dono, u.doc AS cpf FROM perfis_trabalho p JOIN users u ON u.id = p.owner_id WHERE p.status = ? ORDER BY p.created_at`).all(String(query.status || 'em_analise')),
  { auth: 'admin' });
  r.post('/admin/trabalho/:id/:acao', ({ params }) => {
    const st = params.acao === 'aprovar' ? 'ativo' : params.acao === 'recusar' ? 'recusado' : null;
    if (!st) fail(400, 'Ação inválida.');
    db.prepare('UPDATE perfis_trabalho SET status = ? WHERE id = ?').run(st, params.id);
    return { ok: true, status: st };
  }, { auth: 'admin' });
}
