// Notas fiscais e impostos: painel do administrador, notas do cliente, MEI e configuração fiscal das lojas.
import { fail, money, str, int, toCents } from '../http.js';
import { tx } from '../db.js';
import { competenciaDe, validarOrigem } from '../fiscal/index.js';
import { impostoDaNota, impostosPresumido, aliquotaSimples, situacaoMei, ANEXOS } from '../fiscal/impostos.js';

export default function fiscalRoutes(r, { db, fiscal }) {
  const A = { auth: 'admin' };
  const comp = (v) => {
    if (v === undefined || v === '') return competenciaDe();
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(v))) fail(400, 'Mês inválido. Use AAAA-MM.');
    return String(v);
  };

  // ----- Administrador -----
  r.get('/admin/fiscal/resumo', ({ query }) => fiscal.resumo(comp(query.mes)), A);
  r.get('/admin/fiscal/notas', ({ query }) => {
    const st = query.status ? String(query.status) : null;
    const rows = st
      ? db.prepare('SELECT * FROM fiscal_notas WHERE status = ? ORDER BY created_at DESC LIMIT 200').all(st)
      : db.prepare('SELECT * FROM fiscal_notas ORDER BY created_at DESC LIMIT 200').all();
    return rows.map((n) => ({ ...fiscal.notaView(n), emitente: n.emitente, tomadorId: n.tomador_id, numero: n.numero, serie: n.serie, impostoEstimado: n.imposto_estimado == null ? null : n.imposto_estimado / 100, aliquota: n.aliquota, tentativas: n.tentativas, erro: n.erro }));
  }, A);
  r.post('/admin/fiscal/processar', () => fiscal.processar(), A);
  // Depois de corrigir o dado (CPF do cliente, código do serviço...), manda a nota de novo.
  r.post('/admin/fiscal/notas/:id/reenviar', ({ params }) => {
    const n = db.prepare('SELECT * FROM fiscal_notas WHERE id = ?').get(params.id);
    if (!n) fail(404, 'Nota não encontrada.');
    if (n.status !== 'erro') fail(409, 'Só notas com erro podem ser reenviadas.');
    db.prepare("UPDATE fiscal_notas SET status = 'fila', tentativas = 0, erro = NULL, updated_at = ? WHERE id = ?").run(Date.now(), n.id);
    return { ok: true };
  }, A);
  // Receita recebida fora da carteira (ex.: plano pago por Pix direto ao Realys).
  r.post('/admin/fiscal/receitas', ({ body }) => {
    const origem = validarOrigem(body.origem);
    const valor = money(body.valor, 'o valor');
    const tomador = body.tomadorId ? db.prepare('SELECT id FROM users WHERE id = ?').get(String(body.tomadorId)) : null;
    if (body.tomadorId && !tomador) fail(404, 'Cliente não encontrado.');
    const id = tx(db, () => fiscal.registrar({ origem, ref: body.ref ? String(body.ref) : null, tomadorId: tomador?.id || null, valorCents: valor, descricao: body.descricao ? str(body.descricao, 'a descrição', { max: 300 }) : undefined }));
    return { id };
  }, A);

  // ----- Cliente: minhas notas fiscais -----
  r.get('/fiscal/notas', ({ user }) =>
    db.prepare("SELECT * FROM fiscal_notas WHERE tomador_id = ? AND status IN ('emitida','cancelada') ORDER BY created_at DESC LIMIT 100").all(user.id).map(fiscal.notaView));

  // ----- Prestador ou loja MEI: quanto já usou do teto do ano -----
  r.get('/fiscal/mei', ({ user }) => fiscal.meiDe(user.id));

  // ----- Calculadora de impostos (para lojas e prestadores planejarem preço e regime) -----
  r.get('/fiscal/calculadora', ({ query }) => {
    const receitaMes = toCents(query.receitaMes ?? 0);
    const rbt12 = query.rbt12 !== undefined ? toCents(query.rbt12) : receitaMes * 12;
    if (receitaMes < 0 || rbt12 < 0) fail(400, 'Valores inválidos.');
    const out = { receitaMes: receitaMes / 100, rbt12: rbt12 / 100, opcoes: [] };
    out.opcoes.push({ regime: 'MEI', ...situacaoMei(rbt12), dasMensal: 'valor fixo (INSS + ISS ou ICMS)' });
    for (const anexo of Object.keys(ANEXOS)) {
      const a = aliquotaSimples(rbt12, anexo);
      if (a.foraDoSimples) continue;
      out.opcoes.push({ regime: `Simples Nacional · Anexo ${anexo}`, aliquota: a.efetiva, impostoMes: Math.round(receitaMes * a.efetiva) / 10000 });
    }
    const p = impostosPresumido(receitaMes, { issPct: query.issPct ? Number(query.issPct) : 5 });
    out.opcoes.push({ regime: 'Lucro Presumido (serviços)', aliquota: p.efetiva, impostoMes: p.total / 100 });
    out.aviso = 'Estimativa pelas regras gerais da lei. O regime certo depende da atividade e da folha de pagamento: confirme com um contador.';
    return out;
  });

  // ----- Loja: configuração fiscal (emitir a NF-e de produto pelo Realys) -----
  const minhaLoja = (user) => {
    const c = db.prepare('SELECT * FROM companies WHERE owner_id = ?').get(user.id);
    if (!c) fail(403, 'Só contas de empresa (CNPJ) têm configuração fiscal.');
    return c;
  };
  const lojaView = (c) => {
    const f = db.prepare('SELECT * FROM fiscal_lojas WHERE company_id = ?').get(c.id) || { emite_pelo_realys: 0, crt: 1, uf: 'RS', ie: null };
    const semNcm = db.prepare("SELECT COUNT(*) AS c FROM products WHERE company_id = ? AND active = 1 AND (ncm IS NULL OR ncm = '')").get(c.id).c;
    return { emitePeloRealys: !!f.emite_pelo_realys, crt: f.crt, uf: f.uf, ie: f.ie, produtosSemNcm: semNcm };
  };
  r.get('/companies/me/fiscal', ({ user }) => lojaView(minhaLoja(user)));
  r.put('/companies/me/fiscal', ({ user, body }) => {
    const c = minhaLoja(user);
    const crt = int(body.crt ?? 1, 'o regime (CRT)', { min: 1, max: 3 });
    const uf = String(body.uf || 'RS').toUpperCase();
    if (!/^[A-Z]{2}$/.test(uf)) fail(400, 'UF inválida.');
    const liga = !!body.emitePeloRealys;
    if (liga) {
      const semNcm = db.prepare("SELECT COUNT(*) AS c FROM products WHERE company_id = ? AND active = 1 AND (ncm IS NULL OR ncm = '')").get(c.id).c;
      if (semNcm) fail(409, `Antes de ligar a nota pelo Realys, informe o NCM de ${semNcm} produto(s). O contador da loja sabe o código de cada um.`, 'sem_ncm');
    }
    db.prepare(`INSERT INTO fiscal_lojas (company_id, emite_pelo_realys, crt, uf, ie, updated_at) VALUES (?,?,?,?,?,?)
      ON CONFLICT(company_id) DO UPDATE SET emite_pelo_realys = excluded.emite_pelo_realys, crt = excluded.crt, uf = excluded.uf, ie = excluded.ie, updated_at = excluded.updated_at`)
      .run(c.id, liga ? 1 : 0, crt, uf, body.ie ? String(body.ie).replace(/\D/g, '').slice(0, 14) : null, Date.now());
    return lojaView(c);
  });
  // NCM (código fiscal do produto, 8 números), necessário para a NF-e.
  r.put('/products/:id/ncm', ({ user, params, body }) => {
    const c = minhaLoja(user);
    const ncm = String(body.ncm || '').replace(/\D/g, '');
    if (!/^\d{8}$/.test(ncm)) fail(400, 'O NCM tem 8 números.');
    const res = db.prepare('UPDATE products SET ncm = ? WHERE id = ? AND company_id = ?').run(ncm, params.id, c.id);
    if (!res.changes) fail(404, 'Produto não encontrado na sua loja.');
    return { ok: true, ncm };
  });

  // Imposto estimado de uma nota do Realys (para o painel e para conferência do contador).
  r.get('/admin/fiscal/simular', ({ query }) => {
    const v = toCents(query.valor ?? 1);
    return impostoDaNota(v, { regime: query.regime || 'simples', anexo: query.anexo || 'III', rbt12Cents: toCents(query.rbt12 ?? 0), issPct: query.issPct ? Number(query.issPct) : 5 });
  }, A);
}
