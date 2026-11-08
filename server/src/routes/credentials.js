// Carteira profissional (OAB, CRM, carteira funcional...). Conferências feitas aqui:
//  1. o nome da carteira bate com o nome da conta (CPF já verificado);
//  2. o rosto da foto da carteira bate com o rosto do cadastro biométrico (a foto é descartada);
//  3. médico: consulta automática no CFM, quando o webservice estiver contratado;
//  4. servidor público: código enviado ao e-mail institucional (.gov.br, .jus.br, .mp.br, .leg.br, .mil.br).
// A equipe do Realys aprova ou recusa no painel, vendo o resultado de cada conferência.
import { createHash, randomInt } from 'node:crypto';
import { fail, newId, now, str } from '../http.js';
import { makeMail } from '../mail.js';
import { makeCfm } from '../cfm.js';
import { makeConselhos } from '../conselhos.js';

export const PROFS = {
  advogado: { conselho: 'OAB' }, medico: { conselho: 'CRM' }, enfermeiro: { conselho: 'COREN' }, dentista: { conselho: 'CRO' },
  psicologo: { conselho: 'CRP' }, veterinario: { conselho: 'CRMV' }, engenheiro: { conselho: 'CREA' },
  policial: { gov: true }, guarda: { gov: true }, bombeiro: { gov: true }, socorrista: { gov: true }, defesacivil: { gov: true }, agentesaude: { gov: true },
};
export const isGovEmail = (e) => /^[^\s@]+@([a-z0-9-]+\.)+(gov|jus|mp|leg|mil|def)\.br$/i.test(String(e || '').trim());
const plain = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z ]/g, ' ').split(/\s+/).filter((w) => w.length > 2);
// Nome confere: primeiro e último nome iguais, e a maior parte dos outros também.
export function sameName(a, b) {
  const x = plain(a), y = plain(b);
  if (!x.length || !y.length) return false;
  if (x[0] !== y[0] || x[x.length - 1] !== y[y.length - 1]) return false;
  const hit = x.filter((w) => y.includes(w)).length;
  return hit / Math.max(x.length, y.length) >= 0.6;
}
const hashCode = (id, code) => createHash('sha256').update(`${id}:${code}`).digest('hex');
const view = (c) => ({
  id: c.id, prof: c.prof, numero: c.numero, uf: c.uf, orgao: c.orgao, gov: !!c.gov, discreto: !!c.discreto, status: c.status, recebeCasos: !!c.recebe_casos,
  nomeConfere: c.nome_confere == null ? null : !!c.nome_confere, rostoSemelhanca: c.rosto_semelhanca, conselho: c.conselho_status,
  emailInst: c.email_inst, emailOk: !!c.email_ok, motivo: c.motivo, createdAt: c.created_at,
});

export default function credentialRoutes(r, { db, cfg, userById, biometria }) {
  const mail = cfg.mail || makeMail(cfg);
  const cfm = cfg.cfm || makeCfm(cfg);
  const conselhos = cfg.conselhos || makeConselhos(cfg);
  const mine = (id, userId) => {
    const c = db.prepare('SELECT * FROM credenciais WHERE id = ?').get(id);
    if (!c || c.user_id !== userId) fail(404, 'Carteira não encontrada.');
    return c;
  };

  r.get('/credenciais', ({ user }) => ({ items: db.prepare('SELECT * FROM credenciais WHERE user_id = ? ORDER BY created_at DESC').all(user.id).map(view) }));

  r.post('/credenciais', async ({ body, user }) => {
    const prof = String(body.prof || '');
    const P = PROFS[prof];
    if (!P) fail(400, 'Profissão inválida.');
    const numero = str(body.numero, 'o número da carteira', { max: 30 });
    const uf = String(body.uf || '').toUpperCase().slice(0, 2);
    const orgao = String(body.orgao || '').slice(0, 80);
    const u = userById(user.id);
    const nomeCarteira = String(body.nomeCarteira || '').slice(0, 120);
    const t = now();
    const id = newId('cr');
    // 1. nome da carteira x nome da conta
    let nomeConfere = nomeCarteira ? (sameName(nomeCarteira, u.name) ? 1 : 0) : null;
    // 2. rosto da carteira x rosto do cadastro (a foto não é guardada)
    const buf = body.foto ? Buffer.from(String(body.foto), 'base64') : null;
    const face = buf ? await biometria.faceOfCard(user.id, buf) : { checked: false };
    // 3. médico: CFM
    // 3. Conselho: CFM (médico) ou consulta automática dos outros conselhos. Positivo ou negativo na hora.
    let conselho = P.gov ? 'orgao_publico' : 'manual';
    let info = null;
    let nomeConselho = null;
    if (prof === 'medico' && cfm.ready) {
      const c = await cfm.check({ crm: numero, uf });
      conselho = c.status;
      nomeConselho = c.nome || null;
      info = JSON.stringify({ nome: c.nome || null, especialidades: c.especialidades || null });
    } else if (!P.gov && P.conselho) {
      const c = await conselhos.check({ conselho: P.conselho, numero, uf });
      conselho = c.status;
      nomeConselho = c.nome || null;
      info = JSON.stringify({ nome: c.nome || null, situacao: c.situacao || null, motivo: c.motivo || null });
    }
    // O nome no conselho também tem que ser o nome da conta.
    if (nomeConselho && !sameName(nomeConselho, u.name)) conselho = 'nome_diferente';
    db.prepare(
      `INSERT INTO credenciais (id, user_id, prof, numero, uf, orgao, gov, discreto, nome_confere, rosto_semelhanca, conselho_status, conselho_info, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,'em_analise',?,?)`
    ).run(id, user.id, prof, numero, uf, orgao, P.gov || body.gov ? 1 : 0, body.discreto === false ? 0 : P.gov || body.discreto ? 1 : 0, nomeConfere, face.checked ? face.semelhanca : null, conselho, info, t, t);
    return view(db.prepare('SELECT * FROM credenciais WHERE id = ?').get(id));
  }, { status: 201 });

  // 4. E-mail institucional: manda um código de 6 números (vale 15 min, até 5 tentativas).
  r.post('/credenciais/:id/email', async ({ params, body, user }) => {
    const c = mine(params.id, user.id);
    const email = String(body.email || '').trim().toLowerCase();
    if (!isGovEmail(email)) fail(400, 'Use o seu e-mail institucional do órgão (terminado em .gov.br, .jus.br, .mp.br, .leg.br ou .mil.br).', 'email_inst');
    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    db.prepare('UPDATE credenciais SET email_inst = ?, email_hash = ?, email_exp = ?, email_tentativas = 0, email_ok = 0, updated_at = ? WHERE id = ?').run(email, hashCode(c.id, code), now() + 15 * 60000, now(), c.id);
    const r2 = await mail.send({ to: email, subject: 'Realys: código de confirmação', text: `Seu código para confirmar o e-mail institucional no Realys é ${code}. Ele vale por 15 minutos. Se não foi você, ignore este e-mail.` });
    // Fase de testes sem e-mail configurado: o código volta na resposta (nunca em produção).
    return { enviado: !!r2.sent, ...(!r2.sent && !cfg.production ? { codigoTeste: code } : {}) };
  });
  r.post('/credenciais/:id/email/confirmar', ({ params, body, user }) => {
    const c = mine(params.id, user.id);
    if (!c.email_hash || !c.email_exp || now() > c.email_exp) fail(400, 'O código venceu. Peça um novo.', 'codigo_vencido');
    if (c.email_tentativas >= 5) fail(429, 'Muitas tentativas. Peça um novo código.');
    if (hashCode(c.id, String(body.codigo || '').trim()) !== c.email_hash) {
      db.prepare('UPDATE credenciais SET email_tentativas = email_tentativas + 1 WHERE id = ?').run(c.id);
      fail(400, 'Código errado.', 'codigo_errado');
    }
    db.prepare('UPDATE credenciais SET email_ok = 1, email_hash = NULL, updated_at = ? WHERE id = ?').run(now(), c.id);
    return view(db.prepare('SELECT * FROM credenciais WHERE id = ?').get(c.id));
  });
  // Sigilo: a profissão não aparece no perfil público (servidor público começa com sigilo ligado).
  r.post('/credenciais/:id/sigilo', ({ params, body, user }) => {
    const c = mine(params.id, user.id);
    db.prepare('UPDATE credenciais SET discreto = ?, updated_at = ? WHERE id = ?').run(body.on ? 1 : 0, now(), c.id);
    return view(db.prepare('SELECT * FROM credenciais WHERE id = ?').get(c.id));
  });
  // Perfil público: só as profissões aprovadas e sem sigilo.
  r.get('/users/:id/credenciais', ({ params }) => ({
    items: db.prepare(`SELECT prof, uf FROM credenciais WHERE user_id = ? AND status = 'aprovado' AND discreto = 0`).all(params.id),
  }));
  r.post('/credenciais/:id/casos', ({ params, body, user }) => {
    const c = mine(params.id, user.id);
    if (c.status !== 'aprovado') fail(403, 'A carteira ainda não foi aprovada.');
    db.prepare('UPDATE credenciais SET recebe_casos = ?, updated_at = ? WHERE id = ?').run(body.on ? 1 : 0, now(), c.id);
    return view(db.prepare('SELECT * FROM credenciais WHERE id = ?').get(c.id));
  });

  // Painel do administrador.
  const A = { auth: 'admin' };
  r.get('/admin/credenciais', () => ({
    items: db.prepare(`SELECT c.*, u.name AS user_name FROM credenciais c JOIN users u ON u.id = c.user_id WHERE c.status = 'em_analise' ORDER BY c.created_at`).all().map((c) => ({ ...view(c), userName: c.user_name })),
  }), A);
  r.post('/admin/credenciais/:id/:acao', ({ params, body }) => {
    const st = { aprovar: 'aprovado', recusar: 'recusado' }[params.acao];
    if (!st) fail(404, 'Ação inválida.');
    const c = db.prepare('SELECT * FROM credenciais WHERE id = ?').get(params.id);
    if (!c) fail(404, 'Carteira não encontrada.');
    db.prepare('UPDATE credenciais SET status = ?, motivo = ?, recebe_casos = CASE WHEN ? = \'recusado\' THEN 0 ELSE recebe_casos END, updated_at = ? WHERE id = ?').run(st, String(body.motivo || '').slice(0, 200) || null, st, now(), c.id);
    return view(db.prepare('SELECT * FROM credenciais WHERE id = ?').get(c.id));
  }, A);
}
