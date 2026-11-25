// Pioneiros do Realyz (piloto em Passo Fundo): as primeiras empresas, prestadores, motoboys e
// motoristas. O site (realyz.com.br/pioneiro.html e /entregador.html) mostra as vagas que faltam
// por área e recebe o interesse; o administrador acompanha no app (Admin › Cadastros › Pioneiros)
// e marca quem fechou. Ao fechar, a pessoa ganha o número de pioneiro (nº 001, 002...).
//
// Empresas: Pacote Pioneiro (R$ 99 por mês ou R$ 990 no ano, preço congelado por 12 meses; só começa a
// pagar no lançamento). Motoboys e motoristas: Pioneiro Entregador, grátis.
import { createHash, randomBytes } from 'node:crypto';
import { fail, newId, now, str, oneOf, toReais } from '../http.js';
import { tx } from '../db.js';
import { makeMail } from '../mail.js';
import { montarAcordo, PRECO_MENSAL, DIAS_PARA_PAGAR, DIAS_ATE_SUSPENDER, COTA_MENSAL } from '../acordoPioneiro.js';

export const AREAS_PIONEIRO = [
  // Empresas e prestadores (100 vagas pagantes)
  { id: 'food', grupo: 'empresa', label: 'Restaurantes, lanchonetes, padarias e cafés', meta: 18 },
  { id: 'mercado', grupo: 'empresa', label: 'Mercados, açougues, hortifrúti e adegas', meta: 9 },
  { id: 'shop', grupo: 'empresa', label: 'Lojas: moda, eletrônicos, casa, pet e variados', meta: 15 },
  { id: 'servicos', grupo: 'empresa', label: 'Serviços: reparos, beleza, saúde, veículos e aulas', meta: 38 },
  { id: 'atacado', grupo: 'empresa', label: 'Atacado, fornecedores e distribuidores', meta: 6 },
  { id: 'negocios', grupo: 'empresa', label: 'Imobiliárias e revendas de veículos', meta: 5 },
  { id: 'eventos', grupo: 'empresa', label: 'Bares, casas noturnas, buffet e artistas', meta: 5 },
  { id: 'agro_turismo', grupo: 'empresa', label: 'Agro, hotéis e pousadas', meta: 4 },
  // Entregas e transporte (grátis): 50 vagas, total 150 pioneiros
  { id: 'motoboy', grupo: 'entregador', label: 'Motoboys', meta: 30 },
  { id: 'motorista', grupo: 'entregador', label: 'Motoristas', meta: 20 },
];
const AREA = Object.fromEntries(AREAS_PIONEIRO.map((a) => [a.id, a]));
const STATUS = ['novo', 'contato', 'fechado', 'desistiu'];
// Condição que a pessoa aceita no site (guardada com a data, para valer como termo aceito).
export const AVISO_PIONEIRO = 'O título de Pioneiro é apenas promocional. Não dá participação na empresa, nos lucros, na marca ou no aplicativo Realyz, nem qualquer direito além dos benefícios do pacote descritos nesta página.';
const soNumeros = (v) => String(v || '').replace(/\D/g, '');

export default function pioneirosRoutes(r, { db, cfg, limitLogin, wallet, biometria, hub }) {
  // Tabela: server/src/db.js (migração dos pioneiros).
  const contar = () => {
    const linhas = db.prepare("SELECT area, status, COUNT(*) AS n FROM pioneiros WHERE status <> 'desistiu' GROUP BY area, status").all();
    return AREAS_PIONEIRO.map((a) => {
      const fechados = linhas.filter((l) => l.area === a.id && l.status === 'fechado').reduce((s, l) => s + l.n, 0);
      const interessados = linhas.filter((l) => l.area === a.id).reduce((s, l) => s + l.n, 0);
      return { ...a, fechados, interessados, restantes: Math.max(0, a.meta - fechados) };
    });
  };

  // Site: vagas que faltam em cada área (sem nomes de ninguém).
  r.get('/pioneiros/vagas', () => {
    const areas = contar().map(({ id, grupo, label, meta, fechados, restantes }) => ({ id, grupo, label, meta, fechados, restantes }));
    const tot = (g) => areas.filter((a) => a.grupo === g).reduce((s, a) => ({ meta: s.meta + a.meta, fechados: s.fechados + a.fechados }), { meta: 0, fechados: 0 });
    return { areas, empresas: tot('empresa'), entregadores: tot('entregador'), aviso: AVISO_PIONEIRO };
  }, { auth: false });

  // Site: "quero ser pioneiro". Sem login (a pessoa ainda nem tem conta). O mesmo CNPJ de novo
  // atualiza os dados em vez de duplicar.
  r.post('/pioneiros/interesse', ({ body, req }) => {
    const b = body || {};
    const ip = String((req && (req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress))) || '').split(',')[0].trim();
    if (limitLogin) limitLogin('pioneiro:' + ip);
    if (b.aceite !== true) fail(400, 'Para continuar, marque que leu e concorda com as condições.');
    const area = oneOf(b.area, 'a área', AREAS_PIONEIRO.map((a) => a.id));
    const entregador = AREA[area].grupo === 'entregador';
    const nome = str(b.nome, entregador ? 'o seu nome' : 'o nome da empresa', { min: 2, max: 120 });
    const responsavel = entregador ? nome : str(b.responsavel, 'o nome do responsável', { min: 2, max: 120 });
    const cnpj = soNumeros(b.cnpj);
    if (cnpj && cnpj.length !== 14) fail(400, 'O CNPJ tem 14 números. Confira e tente de novo.');
    if (!entregador && !cnpj) fail(400, 'Informe o CNPJ da empresa.');
    const whatsapp = soNumeros(b.whatsapp);
    if (whatsapp.length < 10 || whatsapp.length > 13) fail(400, 'Informe o WhatsApp com DDD.');
    const email = String(b.email || '').trim().slice(0, 160);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Confira o e-mail.');
    const vendedor = String(b.vendedor || '').trim().slice(0, 60) || null;
    const obs = String(b.obs || '').trim().slice(0, 500) || null;
    const t = now();
    const ja = cnpj ? db.prepare('SELECT id FROM pioneiros WHERE cnpj = ?').get(cnpj) : db.prepare('SELECT id FROM pioneiros WHERE whatsapp = ? AND area = ?').get(whatsapp, area);
    if (ja) {
      db.prepare('UPDATE pioneiros SET area = ?, nome = ?, responsavel = ?, whatsapp = ?, email = ?, vendedor = COALESCE(?, vendedor), obs = COALESCE(?, obs), aceite_em = ?, aceite_texto = ?, updated_at = ? WHERE id = ?').run(area, nome, responsavel, whatsapp, email || null, vendedor, obs, t, AVISO_PIONEIRO, t, ja.id);
      return { ok: true, id: ja.id, atualizado: true };
    }
    const id = newId('fd');
    db.prepare('INSERT INTO pioneiros (id, area, nome, responsavel, cnpj, whatsapp, email, vendedor, obs, status, aceite_em, aceite_texto, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(id, area, nome, responsavel, cnpj || null, whatsapp, email || null, vendedor, obs, 'novo', t, AVISO_PIONEIRO, t, t);
    return { ok: true, id };
  }, { auth: false, status: 201 });

  // Administrador: todos os interessados, por área, e o resumo das vagas.
  r.get('/admin/pioneiros', () => ({
    lancamento: lancamento(),
    areas: contar(),
    lista: db.prepare('SELECT * FROM pioneiros ORDER BY CASE status WHEN \'novo\' THEN 0 WHEN \'contato\' THEN 1 WHEN \'fechado\' THEN 2 ELSE 3 END, created_at DESC').all()
      .map((f) => ({ id: f.id, area: f.area, nome: f.nome, responsavel: f.responsavel, cnpj: f.cnpj, whatsapp: f.whatsapp, email: f.email, vendedor: f.vendedor, obs: f.obs, status: f.status, numero: f.numero, conta: f.user_id ? (db.prepare('SELECT username FROM users WHERE id = ?').get(f.user_id) || {}).username || null : null, acordoEm: f.acordo_em || null, acordoCodigo: f.acordo_codigo || null, faturasAbertas: db.prepare("SELECT COUNT(*) AS n FROM pioneiro_faturas WHERE pioneiro_id = ? AND status = 'aberta'").get(f.id).n, criadoEm: f.created_at })),
  }), { auth: 'admin' });

  // Administrador: liga o pioneiro à conta dele no app (pelo *usuário). Vazio desliga.
  r.post('/admin/pioneiros/:id/conta', ({ params, body }) => {
    const f = db.prepare('SELECT id FROM pioneiros WHERE id = ?').get(params.id);
    if (!f) fail(404, 'Interessado não encontrado.');
    const u = String((body || {}).usuario || '').trim().replace(/^[*@]/, '').toLowerCase();
    if (!u) {
      db.prepare('UPDATE pioneiros SET user_id = NULL, updated_at = ? WHERE id = ?').run(now(), f.id);
      return { ok: true, conta: null };
    }
    const conta = db.prepare('SELECT id, username, name FROM users WHERE lower(username) = ?').get(u);
    if (!conta) fail(404, `Não achei a conta *${u}. Confira o usuário.`);
    const outro = db.prepare('SELECT id FROM pioneiros WHERE user_id = ? AND id <> ?').get(conta.id, f.id);
    if (outro) fail(409, 'Essa conta já está ligada a outro pioneiro.');
    db.prepare('UPDATE pioneiros SET user_id = ?, updated_at = ? WHERE id = ?').run(conta.id, now(), f.id);
    return { ok: true, conta: { usuario: conta.username, nome: conta.name } };
  }, { auth: 'admin' });

  // Administrador: data do lançamento (a partir dela começam os meses e as faturas). Vazio = ainda não lançou.
  r.post('/admin/pioneiros/lancamento', ({ body }) => {
    const v = String((body || {}).data || '').trim();
    if (!v) {
      db.prepare("DELETE FROM parametros WHERE chave = 'pioneiros_lancamento'").run();
      return { lancamento: null };
    }
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/) || v.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (!m) fail(400, 'Data do lançamento inválida. Use dia/mês/ano.');
    const [y, mo, d] = m[1].length === 4 ? [m[1], m[2], m[3]] : [m[3], m[2], m[1]];
    const t = Date.UTC(Number(y), Number(mo) - 1, Number(d), 3); // meia-noite em Brasília
    db.prepare("INSERT INTO parametros (chave, valor, updated_at) VALUES ('pioneiros_lancamento', ?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at").run(String(t), now());
    return { lancamento: t };
  }, { auth: 'admin' });

  // Administrador: muda a etapa. Fechou: ganha o próximo número de pioneiro (e não perde mais).
  r.post('/admin/pioneiros/:id', ({ params, body }) => {
    const f = db.prepare('SELECT * FROM pioneiros WHERE id = ?').get(params.id);
    if (!f) fail(404, 'Interessado não encontrado.');
    const status = oneOf((body || {}).status, 'a etapa', STATUS);
    if (status === 'fechado' && f.status !== 'fechado') {
      const a = contar().find((x) => x.id === f.area);
      if (a && a.restantes <= 0) fail(409, `As ${a.meta} vagas de "${a.label}" já fecharam.`);
    }
    let numero = f.numero;
    if (status === 'fechado' && !numero) numero = (db.prepare('SELECT MAX(numero) AS n FROM pioneiros').get().n || 0) + 1;
    db.prepare('UPDATE pioneiros SET status = ?, numero = ?, updated_at = ? WHERE id = ?').run(status, numero, now(), f.id);
    return { ok: true, status, numero };
  }, { auth: 'admin' });

  // ══ Acordo de Pioneiro no cadastro, link do titular e faturas ══
  const DIA = 86400000;
  const MES = 30 * DIA;
  const SITE = (cfg && cfg.siteUrl) || 'https://realyz.com.br';
  const mailer = (cfg && cfg.mail) || makeMail(cfg || {});
  const sha = (x) => createHash('sha256').update(String(x)).digest('hex');
  const lancamento = () => {
    const row = db.prepare("SELECT valor FROM parametros WHERE chave = 'pioneiros_lancamento'").get();
    return row ? Number(row.valor) || null : null;
  };
  const cnpjDe = (u) => {
    if (/^\d{14}$/.test(u.doc || '')) return u.doc;
    const t = db.prepare("SELECT cnpj FROM perfis_trabalho WHERE owner_id = ? ORDER BY created_at LIMIT 1").get(u.id);
    return t ? soNumeros(t.cnpj) : null;
  };
  // O pioneiro desta conta: já ligado, ou pelo CNPJ, ou pelo WhatsApp do pedido de vaga (aí liga sozinho).
  function doUsuario(u) {
    let p = db.prepare('SELECT * FROM pioneiros WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(u.id);
    if (p) return p;
    const cnpj = cnpjDe(u);
    if (cnpj) p = db.prepare('SELECT * FROM pioneiros WHERE cnpj = ? AND user_id IS NULL').get(cnpj);
    const fone = soNumeros(u.phone).slice(-11);
    if (!p && fone.length >= 10) p = db.prepare("SELECT * FROM pioneiros WHERE user_id IS NULL AND cnpj IS NULL AND substr(whatsapp, -11) = ? AND status <> 'desistiu'").get(fone);
    if (!p) return null;
    db.prepare('UPDATE pioneiros SET user_id = ?, updated_at = ? WHERE id = ?').run(u.id, now(), p.id);
    return { ...p, user_id: u.id };
  }
  // Faturas: depois do lançamento, uma por mês usado (sai no fim do mês, vence 5 dias depois).
  function gerarFaturas(p) {
    const L = lancamento();
    if (!L || !p.acordo_em || AREA[p.area].grupo !== 'empresa' || p.status !== 'fechado') return;
    const t = now();
    for (let mes = 1; L + mes * MES <= t; mes++) {
      const inicio = L + (mes - 1) * MES;
      if (p.encerrado_em && inicio >= p.encerrado_em) break;
      db.prepare('INSERT OR IGNORE INTO pioneiro_faturas (id, pioneiro_id, user_id, mes, inicio, fim, valor, vence_em, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)')
        .run(newId('pf'), p.id, p.user_id, mes, inicio, L + mes * MES, Math.round(PRECO_MENSAL * 100), L + mes * MES + DIAS_PARA_PAGAR * DIA, 'aberta', t);
    }
  }
  const faturaView = (f) => ({ id: f.id, mes: f.mes, inicio: f.inicio, fim: f.fim, valor: toReais(f.valor), venceEm: f.vence_em, status: f.status, pagaEm: f.paga_em, atrasada: f.status === 'aberta' && f.vence_em < now() });
  function situacao(p) {
    const area = AREA[p.area];
    gerarFaturas(p);
    const faturas = db.prepare('SELECT * FROM pioneiro_faturas WHERE pioneiro_id = ? ORDER BY mes').all(p.id).map(faturaView);
    const suspenso = faturas.some((f) => f.status === 'aberta' && f.venceEm + DIAS_ATE_SUSPENDER * DIA < now());
    const encerrado = !!(p.encerrado_em && p.encerrado_em <= now());
    return {
      pioneiro: { id: p.id, area: p.area, areaNome: area.label, grupo: area.grupo, nome: p.nome, cnpj: p.cnpj, numero: p.numero, status: p.status },
      acordo: montarAcordo(p, area),
      assinado: p.acordo_em ? { em: p.acordo_em, metodo: p.acordo_metodo, codigo: p.acordo_codigo, hash: p.acordo_hash, verificar: p.acordo_codigo ? `${SITE.replace('realyz.com.br', 'api.realyz.com.br')}/v/${p.acordo_codigo}` : null } : null,
      lancamento: lancamento(),
      faturas,
      suspenso,
      encerrado,
      beneficiosAtivos: !!p.acordo_em && p.status === 'fechado' && !suspenso && !encerrado,
      cota: area.grupo === 'empresa' ? COTA_MENSAL : null,
    };
  }
  const souEu = (user) => {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    if (!u) fail(404, 'Conta não encontrada.');
    return u;
  };

  // Cadastro pelo link do vendedor: a conta recém-criada entra como pioneira na área escolhida.
  r.post('/pioneiros/entrar', ({ body, user }) => {
    const u = souEu(user);
    const b = body || {};
    const ja = doUsuario(u);
    if (ja) return situacao(ja);
    const area = oneOf(b.area, 'a área', AREAS_PIONEIRO.map((a) => a.id));
    const a = contar().find((x) => x.id === area);
    if (a.restantes <= 0) fail(409, `As ${a.meta} vagas de "${a.label}" já foram preenchidas.`, 'vagas');
    const cnpj = cnpjDe(u);
    if (AREA[area].grupo === 'empresa' && !cnpj) fail(400, 'Para ser pioneiro nessa área, a conta precisa ser de empresa (CNPJ). MEI também vale.', 'sem_cnpj');
    const titularWhats = soNumeros(b.titularWhatsapp) || null;
    const t = now();
    const id = newId('fd');
    db.prepare('INSERT INTO pioneiros (id, area, nome, responsavel, cnpj, whatsapp, email, vendedor, status, user_id, titular_whatsapp, aceite_em, aceite_texto, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)')
      .run(id, area, u.name, u.titular_nome || u.name, AREA[area].grupo === 'empresa' ? cnpj : null, titularWhats || soNumeros(u.phone) || '', u.email || null, String(b.vendedor || '').trim().slice(0, 60) || null, 'contato', u.id, titularWhats, t, AVISO_PIONEIRO, t, t);
    return situacao(db.prepare('SELECT * FROM pioneiros WHERE id = ?').get(id));
  }, { status: 201 });

  // O pioneiro desta conta (acordo, assinatura, faturas). Sem vaga de pioneiro: { pioneiro: null }.
  r.get('/pioneiros/meu', ({ user }) => {
    const p = doUsuario(souEu(user));
    return p ? situacao(p) : { pioneiro: null };
  });

  // Assinar o acordo com o rosto. Rosto já aprovado: confere de novo agora (verificação "contrato").
  // Rosto acabou de ser enviado (em análise): a assinatura fica registrada com o envio do cadastro.
  r.post('/pioneiros/meu/assinar', ({ body, user }) => {
    const u = souEu(user);
    const p = doUsuario(u);
    if (!p) fail(404, 'Esta conta não tem vaga de pioneiro.');
    if (p.acordo_em) return situacao(p);
    const bio = biometria ? biometria.status(u.id).status : 'aprovado';
    let metodo;
    if (bio === 'aprovado') {
      biometria && biometria.consume(u.id, 'contrato', p.id);
      metodo = 'rosto_conferido';
    } else if (bio === 'em_analise') metodo = 'rosto_enviado';
    else fail(403, 'Confirme o seu rosto antes de assinar o acordo.', 'biometria');
    const area = AREA[p.area];
    if (area.grupo === 'empresa' && !p.cnpj) fail(400, 'O acordo precisa do CNPJ da empresa.', 'sem_cnpj');
    const aparelho = String((body && body.aparelho) || '').slice(0, 120) || null;
    tx(db, () => {
      let numero = p.numero;
      if (!numero) {
        const a = contar().find((x) => x.id === p.area);
        if (p.status !== 'fechado' && a.restantes <= 0) fail(409, `As ${a.meta} vagas de "${a.label}" já foram preenchidas.`, 'vagas');
        numero = (db.prepare('SELECT MAX(numero) AS n FROM pioneiros').get().n || 0) + 1;
      }
      const acordo = montarAcordo({ ...p, numero }, area);
      let codigo;
      do codigo = randomBytes(6).toString('base64url').replace(/[-_]/g, 'x').slice(0, 8).toUpperCase();
      while (db.prepare('SELECT 1 FROM documentos WHERE codigo = ?').get(codigo));
      const t = now();
      db.prepare('INSERT INTO documentos (codigo, owner_id, hash, tipo, titulo, partes, coacao, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
        codigo, u.id, acordo.hash, 'contrato', `${acordo.titulo} nº ${String(numero).padStart(3, '0')}`.slice(0, 120),
        JSON.stringify([{ papel: 'Realyz', nome: 'Realyz', assinadoEm: t, metodo: 'plataforma' }, { papel: area.grupo === 'empresa' ? 'Empresa' : 'Pioneiro', nome: p.nome, assinadoEm: t, metodo }]), 0, t, t);
      db.prepare("UPDATE pioneiros SET status = 'fechado', numero = ?, acordo_versao = ?, acordo_hash = ?, acordo_em = ?, acordo_metodo = ?, acordo_aparelho = ?, acordo_codigo = ?, updated_at = ? WHERE id = ?")
        .run(numero, acordo.versao, acordo.hash, t, metodo, aparelho, codigo, t, p.id);
    });
    if (hub) hub.send(u.id, 'pioneiro', { assinado: true });
    return situacao(db.prepare('SELECT * FROM pioneiros WHERE id = ?').get(p.id));
  });

  // Link para o titular (dono do CNPJ) fazer a biometria e assinar de outro celular, a distância.
  // Vale 24 horas e um uso só. Vai pelo WhatsApp (link pronto) e, se tiver e-mail, por e-mail.
  r.post('/pioneiros/meu/link-titular', async ({ body, user }) => {
    const u = souEu(user);
    const p = doUsuario(u);
    if (!p) fail(404, 'Esta conta não tem vaga de pioneiro.');
    if (p.acordo_em) fail(409, 'O acordo já foi assinado.');
    const b = body || {};
    const whats = soNumeros(b.whatsapp || p.titular_whatsapp);
    const email = String(b.email || '').trim().slice(0, 160);
    const token = randomBytes(24).toString('base64url');
    const t = now();
    db.prepare('UPDATE links_titular SET expira_em = ? WHERE user_id = ? AND usado_em IS NULL AND expira_em > ?').run(t, u.id, t); // o link anterior para de valer
    db.prepare('INSERT INTO links_titular (id, token_hash, user_id, criado_por, para, expira_em, created_at) VALUES (?,?,?,?,?,?,?)').run(newId('lt'), sha(token), u.id, u.id, whats || email || null, t + DIA, t);
    if (whats) db.prepare('UPDATE pioneiros SET titular_whatsapp = ? WHERE id = ?').run(whats, p.id);
    const url = `${SITE}/?titular=${token}`;
    const msg = `Olá! Para confirmar a vaga de Pioneiro Realyz de ${p.nome}, faça a biometria e assine o acordo por este link (vale 24 horas): ${url}`;
    if (email && mailer && mailer.ready) await mailer.send({ to: email, subject: 'Realyz: confirme sua vaga de Pioneiro', text: msg }).catch(() => {});
    const destino = whats ? (whats.length <= 11 ? '55' + whats : whats) : '';
    return { url, expiraEm: t + DIA, whatsappUrl: `https://wa.me/${destino}?text=${encodeURIComponent(msg)}`, emailEnviado: !!(email && mailer && mailer.ready) };
  });

  // Pagar a fatura pelo saldo da carteira (o Pix entra como depósito na carteira e já paga).
  r.post('/pioneiros/faturas/:id/pagar', ({ params, user }) => {
    const f = db.prepare("SELECT * FROM pioneiro_faturas WHERE id = ? AND user_id = ?").get(params.id, user.id);
    if (!f) fail(404, 'Fatura não encontrada.');
    if (f.status !== 'aberta') fail(409, 'Esta fatura já está paga.');
    const w = wallet.get(user.id);
    if ((w.balance || 0) < f.valor) fail(402, `Saldo insuficiente. Faltam ${toReais(f.valor - (w.balance || 0)).toFixed(2).replace('.', ',')} reais: deposite por Pix e pague de novo.`, 'saldo_insuficiente');
    tx(db, () => {
      wallet.move(user.id, 'saldo', -f.valor, 'Pioneiro', `Pacote Pioneiro · mês ${f.mes}`, f.id);
      wallet.move('realys', 'saldo', f.valor, 'Pioneiro', `Pacote Pioneiro · mês ${f.mes}`, f.id);
      db.prepare("UPDATE pioneiro_faturas SET status = 'paga', paga_em = ? WHERE id = ?").run(now(), f.id);
    });
    const p = db.prepare('SELECT * FROM pioneiros WHERE id = ?').get(f.pioneiro_id);
    return situacao(p);
  });

  // Sair: antes do lançamento, sai na hora sem custo; depois, só com o 1º mês pago, e vale no fim do
  // último mês pago. Perde o preço de pioneiro e o selo.
  r.post('/pioneiros/meu/encerrar', ({ user }) => {
    const p = doUsuario(souEu(user));
    if (!p) fail(404, 'Esta conta não tem vaga de pioneiro.');
    const t = now();
    if (!lancamento()) {
      db.prepare("UPDATE pioneiros SET status = 'desistiu', encerrado_em = ?, updated_at = ? WHERE id = ?").run(t, t, p.id);
      return situacao(db.prepare('SELECT * FROM pioneiros WHERE id = ?').get(p.id));
    }
    gerarFaturas(p);
    const pagas = db.prepare("SELECT * FROM pioneiro_faturas WHERE pioneiro_id = ? AND status = 'paga' ORDER BY mes DESC").all(p.id);
    if (AREA[p.area].grupo === 'empresa' && !pagas.some((f) => f.mes === 1)) fail(409, 'Para encerrar, pague antes a fatura do 1º mês.', 'primeiro_mes');
    const fim = pagas.length ? pagas[0].fim : t;
    db.prepare('UPDATE pioneiros SET encerrado_em = ?, updated_at = ? WHERE id = ?').run(Math.max(fim, t), t, p.id);
    return situacao(db.prepare('SELECT * FROM pioneiros WHERE id = ?').get(p.id));
  });


}
