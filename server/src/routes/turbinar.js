// Turbinar (impulsionar) no Realyz: a pessoa paga para o Reel, story ou post dela aparecer para mais
// gente, para ganhar seguidores ou cliques no produto. Mesma base do Instagram/Facebook (Meta), um pouco
// mais barato para atrair os primeiros anunciantes:
//   - alcance: R$ 12 a cada 1.000 visualizações (no Meta, no Brasil, o CPM fica entre R$ 8 e R$ 50);
//   - cliques no produto: cerca de R$ 0,60 por clique (no Meta, de R$ 0,40 a R$ 6,00);
//   - mínimo de R$ 5 por dia; pacotes de R$ 5, R$ 20 e R$ 50 por dia, de 1 a 7 dias.
// O valor sai do saldo da carteira na hora. Só é cobrado o que foi entregue: o que sobrar no fim
// (ou se a pessoa parar antes) volta para a carteira. Precisa da biometria (é dinheiro).
// Os preços ficam na tabela parametros (chave 'turbinar') e o administrador ajusta em /admin/turbinar/valores.
import { fail, newId, now, str, toReais } from '../http.js';
import { tx } from '../db.js';

export const TURBINAR_PADRAO = { cpm: 1200, cpc: 60, minDia: 500, pacotes: [500, 2000, 5000], dias: [1, 3, 7], maxDias: 7 };
const OBJETIVOS = ['seguidores', 'cliques'];
const ALVOS = ['reel', 'story', 'post'];
const DIA = 86400000;

export default function turbinarRoutes(r, { db, wallet }) {
  const precos = () => {
    const row = db.prepare("SELECT valor, updated_at FROM parametros WHERE chave = 'turbinar'").get();
    return { ...TURBINAR_PADRAO, ...(row ? JSON.parse(row.valor) : {}), atualizadoEm: row ? row.updated_at : null };
  };
  const estimativa = (total, objetivo, p) => {
    const views = Math.floor((total / p.cpm) * 1000);
    return objetivo === 'cliques'
      ? { visualizacoes: views, cliques: Math.floor(total / p.cpc) }
      : { visualizacoes: views, seguidores: [Math.floor(views * 0.005), Math.floor(views * 0.02)] }; // faixa típica de 0,5% a 2%
  };
  const view = (b) => ({
    id: b.id, alvo: b.alvo, alvoTipo: b.alvo_tipo, objetivo: b.objetivo, porDia: toReais(b.por_dia), dias: b.dias, total: toReais(b.total),
    gasto: toReais(Math.ceil(b.gasto_mc / 1000)), devolvido: toReais(b.devolvido), views: b.views, cliques: b.cliques, seguidores: b.seguidores,
    status: b.status, criadoEm: b.created_at, terminaEm: b.ends_at,
  });
  // Fecha o que acabou o prazo ou o orçamento e devolve o que não foi usado.
  const fechar = (b, motivo) => {
    const gasto = Math.min(b.total, Math.ceil(b.gasto_mc / 1000));
    const volta = b.total - gasto;
    tx(db, () => {
      if (volta > 0) {
        wallet.move('realys', 'saldo', -volta, 'Turbinar', `Devolução do turbinar ${b.id}`, b.id);
        wallet.move(b.user_id, 'saldo', volta, 'Turbinar', 'Devolução do que não foi usado no turbinar', b.id);
      }
      db.prepare('UPDATE turbinar SET status = ?, devolvido = ? WHERE id = ?').run(motivo, volta, b.id);
    });
  };
  const fecharVencidos = () => {
    for (const b of db.prepare("SELECT * FROM turbinar WHERE status = 'ativo' AND (ends_at <= ? OR gasto_mc >= total * 1000)").all(now())) fechar(b, 'fim');
  };

  r.get('/turbinar/valores', () => {
    const p = precos();
    return { ...p, cpm: toReais(p.cpm), cpc: toReais(p.cpc), minDia: toReais(p.minDia), pacotes: p.pacotes.map(toReais) };
  }, { auth: false });

  r.post('/turbinar', ({ user, body }) => {
    const p = precos();
    const objetivo = OBJETIVOS.includes(body.objetivo) ? body.objetivo : fail(400, 'Escolha o objetivo: seguidores ou cliques.');
    const alvoTipo = ALVOS.includes(body.alvoTipo) ? body.alvoTipo : 'reel';
    const alvo = str(body.alvo, 'o conteúdo', { max: 120 });
    const porDia = Math.round(Number(body.porDia) * 100);
    const dias = Math.round(Number(body.dias));
    if (!Number.isFinite(porDia) || porDia < p.minDia) fail(400, `O mínimo é ${toReais(p.minDia).toFixed(2).replace('.', ',')} reais por dia.`);
    if (porDia > 100000) fail(400, 'O máximo é R$ 1.000 por dia.');
    if (!Number.isInteger(dias) || dias < 1 || dias > p.maxDias) fail(400, `Escolha de 1 a ${p.maxDias} dias.`);
    if (db.prepare("SELECT 1 FROM turbinar WHERE user_id = ? AND alvo = ? AND status = 'ativo'").get(user.id, alvo)) fail(409, 'Este conteúdo já está turbinado.');
    const total = porDia * dias;
    const id = newId('tb');
    const t = now();
    tx(db, () => {
      wallet.move(user.id, 'saldo', -total, 'Turbinar', `Turbinar ${alvoTipo} (${dias} dia${dias > 1 ? 's' : ''})`, id);
      wallet.move('realys', 'saldo', total, 'Turbinar', `Turbinar de ${user.name}`, id);
      db.prepare('INSERT INTO turbinar (id, user_id, alvo, alvo_tipo, objetivo, por_dia, dias, total, cpm, cpc, created_at, ends_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)')
        .run(id, user.id, alvo, alvoTipo, objetivo, porDia, dias, total, p.cpm, p.cpc, t, t + dias * DIA);
    });
    return { ...view(db.prepare('SELECT * FROM turbinar WHERE id = ?').get(id)), estimativa: estimativa(total, objetivo, p) };
  }, { status: 201 });

  // Os meus turbinados, com o resultado (visualizações, cliques, seguidores, quanto foi usado).
  r.get('/turbinar', ({ user }) => {
    fecharVencidos();
    return db.prepare('SELECT * FROM turbinar WHERE user_id = ? ORDER BY created_at DESC LIMIT 50').all(user.id).map(view);
  });

  r.post('/turbinar/:id/parar', ({ user, params }) => {
    const b = db.prepare("SELECT * FROM turbinar WHERE id = ? AND user_id = ?").get(params.id, user.id);
    if (!b) fail(404, 'Turbinar não encontrado.');
    if (b.status !== 'ativo') fail(409, 'Este turbinar já terminou.');
    fechar(b, 'parado');
    return view(db.prepare('SELECT * FROM turbinar WHERE id = ?').get(b.id));
  });

  // O que está turbinado agora (os feeds de Reels, Trends e Stories puxam para mostrar primeiro).
  r.get('/turbinados', ({ user, query }) => {
    fecharVencidos();
    const tipo = ALVOS.includes(query.tipo) ? query.tipo : 'reel';
    return db.prepare("SELECT t.id, t.alvo, t.alvo_tipo, t.objetivo, t.user_id, u.name FROM turbinar t JOIN users u ON u.id = t.user_id WHERE t.status = 'ativo' AND t.alvo_tipo = ? AND t.user_id != ? ORDER BY RANDOM() LIMIT 20")
      .all(tipo, user.id).map((x) => ({ id: x.id, alvo: x.alvo, alvoTipo: x.alvo_tipo, objetivo: x.objetivo, autor: { id: x.user_id, name: x.name } }));
  });

  // Alguém viu, clicou no produto ou passou a seguir por causa do turbinado. Conta uma vez por pessoa.
  // Alcance (seguidores) cobra por visualização; cliques cobra por clique.
  r.post('/turbinar/:id/evento', ({ user, params, body }) => {
    const tipo = ['view', 'clique', 'seguidor'].includes(body.tipo) ? body.tipo : fail(400, 'Evento inválido.');
    const b = db.prepare("SELECT * FROM turbinar WHERE id = ? AND status = 'ativo'").get(params.id);
    if (!b || b.user_id === user.id) return { ok: false };
    const novo = db.prepare('INSERT OR IGNORE INTO turbinar_eventos (boost_id, user_id, tipo, created_at) VALUES (?,?,?,?)').run(b.id, user.id, tipo, now()).changes;
    if (!novo) return { ok: true, repetido: true };
    const custo = tipo === 'view' && b.objetivo === 'seguidores' ? b.cpm : tipo === 'clique' && b.objetivo === 'cliques' ? b.cpc * 1000 : 0;
    const col = { view: 'views', clique: 'cliques', seguidor: 'seguidores' }[tipo];
    db.prepare(`UPDATE turbinar SET ${col} = ${col} + 1, gasto_mc = MIN(total * 1000, gasto_mc + ?) WHERE id = ?`).run(custo, b.id);
    const atual = db.prepare('SELECT * FROM turbinar WHERE id = ?').get(b.id);
    if (atual.gasto_mc >= atual.total * 1000) fechar(atual, 'fim');
    return { ok: true };
  });

  // Administrador ajusta os preços (por exemplo, se o mercado do Meta mudar muito).
  r.put('/admin/turbinar/valores', ({ body }) => {
    const atual = precos();
    const c = (v) => Math.round(Number(v) * 100);
    const novo = { cpm: atual.cpm, cpc: atual.cpc, minDia: atual.minDia, pacotes: atual.pacotes, dias: atual.dias, maxDias: atual.maxDias };
    if (body.cpm != null && c(body.cpm) > 0) novo.cpm = c(body.cpm);
    if (body.cpc != null && c(body.cpc) > 0) novo.cpc = c(body.cpc);
    if (body.minDia != null && c(body.minDia) > 0) novo.minDia = c(body.minDia);
    if (Array.isArray(body.pacotes) && body.pacotes.length) novo.pacotes = body.pacotes.map(c).filter((x) => x > 0).slice(0, 6);
    db.prepare("INSERT INTO parametros (chave, valor, updated_at) VALUES ('turbinar', ?, ?) ON CONFLICT(chave) DO UPDATE SET valor = excluded.valor, updated_at = excluded.updated_at").run(JSON.stringify(novo), now());
    return precos();
  }, { auth: 'admin' });
}
