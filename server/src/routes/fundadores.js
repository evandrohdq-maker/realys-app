// Fundadores do Realyz (piloto em Passo Fundo): as primeiras empresas, prestadores, motoboys e
// motoristas. O site (realyz.com.br/fundador.html e /entregador.html) mostra as vagas que faltam
// por área e recebe o interesse; o administrador acompanha no app (Admin › Cadastros › Fundadores)
// e marca quem fechou. Ao fechar, a pessoa ganha o número de fundador (nº 001, 002...).
//
// Empresas: Pacote Fundador (R$ 99 por mês ou R$ 990 no ano, preço congelado por 12 meses; só começa a
// pagar no lançamento). Motoboys e motoristas: Fundador Entregador, grátis.
import { fail, newId, now, str, oneOf } from '../http.js';

export const AREAS_FUNDADOR = [
  // Empresas e prestadores (100 vagas pagantes)
  { id: 'food', grupo: 'empresa', label: 'Restaurantes, lanchonetes, padarias e cafés', meta: 18 },
  { id: 'mercado', grupo: 'empresa', label: 'Mercados, açougues, hortifrúti e adegas', meta: 9 },
  { id: 'shop', grupo: 'empresa', label: 'Lojas: moda, eletrônicos, casa, pet e variados', meta: 15 },
  { id: 'servicos', grupo: 'empresa', label: 'Serviços: reparos, beleza, saúde, veículos e aulas', meta: 38 },
  { id: 'atacado', grupo: 'empresa', label: 'Atacado, fornecedores e distribuidores', meta: 6 },
  { id: 'negocios', grupo: 'empresa', label: 'Imobiliárias e revendas de veículos', meta: 5 },
  { id: 'eventos', grupo: 'empresa', label: 'Bares, casas noturnas, buffet e artistas', meta: 5 },
  { id: 'agro_turismo', grupo: 'empresa', label: 'Agro, hotéis e pousadas', meta: 4 },
  // Entregas e transporte (grátis): 50 vagas, total 150 fundadores
  { id: 'motoboy', grupo: 'entregador', label: 'Motoboys', meta: 30 },
  { id: 'motorista', grupo: 'entregador', label: 'Motoristas', meta: 20 },
];
const AREA = Object.fromEntries(AREAS_FUNDADOR.map((a) => [a.id, a]));
const STATUS = ['novo', 'contato', 'fechado', 'desistiu'];
const soNumeros = (v) => String(v || '').replace(/\D/g, '');

export default function fundadoresRoutes(r, { db, limitLogin }) {
  // Tabela: server/src/db.js (migração dos fundadores).
  const contar = () => {
    const linhas = db.prepare("SELECT area, status, COUNT(*) AS n FROM fundadores WHERE status <> 'desistiu' GROUP BY area, status").all();
    return AREAS_FUNDADOR.map((a) => {
      const fechados = linhas.filter((l) => l.area === a.id && l.status === 'fechado').reduce((s, l) => s + l.n, 0);
      const interessados = linhas.filter((l) => l.area === a.id).reduce((s, l) => s + l.n, 0);
      return { ...a, fechados, interessados, restantes: Math.max(0, a.meta - fechados) };
    });
  };

  // Site: vagas que faltam em cada área (sem nomes de ninguém).
  r.get('/fundadores/vagas', () => {
    const areas = contar().map(({ id, grupo, label, meta, fechados, restantes }) => ({ id, grupo, label, meta, fechados, restantes }));
    const tot = (g) => areas.filter((a) => a.grupo === g).reduce((s, a) => ({ meta: s.meta + a.meta, fechados: s.fechados + a.fechados }), { meta: 0, fechados: 0 });
    return { areas, empresas: tot('empresa'), entregadores: tot('entregador') };
  }, { auth: false });

  // Site: "quero ser fundador". Sem login (a pessoa ainda nem tem conta). O mesmo CNPJ de novo
  // atualiza os dados em vez de duplicar.
  r.post('/fundadores/interesse', ({ body, req }) => {
    const b = body || {};
    const ip = String((req && (req.headers['x-forwarded-for'] || (req.socket && req.socket.remoteAddress))) || '').split(',')[0].trim();
    if (limitLogin) limitLogin('fundador:' + ip);
    const area = oneOf(b.area, 'a área', AREAS_FUNDADOR.map((a) => a.id));
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
    const ja = cnpj ? db.prepare('SELECT id FROM fundadores WHERE cnpj = ?').get(cnpj) : db.prepare('SELECT id FROM fundadores WHERE whatsapp = ? AND area = ?').get(whatsapp, area);
    if (ja) {
      db.prepare('UPDATE fundadores SET area = ?, nome = ?, responsavel = ?, whatsapp = ?, email = ?, vendedor = COALESCE(?, vendedor), obs = COALESCE(?, obs), updated_at = ? WHERE id = ?').run(area, nome, responsavel, whatsapp, email || null, vendedor, obs, t, ja.id);
      return { ok: true, id: ja.id, atualizado: true };
    }
    const id = newId('fd');
    db.prepare('INSERT INTO fundadores (id, area, nome, responsavel, cnpj, whatsapp, email, vendedor, obs, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(id, area, nome, responsavel, cnpj || null, whatsapp, email || null, vendedor, obs, 'novo', t, t);
    return { ok: true, id };
  }, { auth: false, status: 201 });

  // Administrador: todos os interessados, por área, e o resumo das vagas.
  r.get('/admin/fundadores', () => ({
    areas: contar(),
    lista: db.prepare('SELECT * FROM fundadores ORDER BY CASE status WHEN \'novo\' THEN 0 WHEN \'contato\' THEN 1 WHEN \'fechado\' THEN 2 ELSE 3 END, created_at DESC').all()
      .map((f) => ({ id: f.id, area: f.area, nome: f.nome, responsavel: f.responsavel, cnpj: f.cnpj, whatsapp: f.whatsapp, email: f.email, vendedor: f.vendedor, obs: f.obs, status: f.status, numero: f.numero, criadoEm: f.created_at })),
  }), { auth: 'admin' });

  // Administrador: muda a etapa. Fechou: ganha o próximo número de fundador (e não perde mais).
  r.post('/admin/fundadores/:id', ({ params, body }) => {
    const f = db.prepare('SELECT * FROM fundadores WHERE id = ?').get(params.id);
    if (!f) fail(404, 'Interessado não encontrado.');
    const status = oneOf((body || {}).status, 'a etapa', STATUS);
    if (status === 'fechado' && f.status !== 'fechado') {
      const a = contar().find((x) => x.id === f.area);
      if (a && a.restantes <= 0) fail(409, `As ${a.meta} vagas de "${a.label}" já fecharam.`);
    }
    let numero = f.numero;
    if (status === 'fechado' && !numero) numero = (db.prepare('SELECT MAX(numero) AS n FROM fundadores').get().n || 0) + 1;
    db.prepare('UPDATE fundadores SET status = ?, numero = ?, updated_at = ? WHERE id = ?').run(status, numero, now(), f.id);
    return { ok: true, status, numero };
  }, { auth: 'admin' });
}
