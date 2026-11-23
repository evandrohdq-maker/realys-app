// Planos (Grátis, Realyz, Pro), painel de inteligência e a fila da Proteção Realyz no administrador.
import { fail, oneOf, toReais } from '../http.js';
import { tabelaPlanos, PLANOS } from '../planos.js';

export default function planosRoutes(r, { db, planos, inteligencia, userById, publicUser }) {
  const A = { auth: 'admin' };
  const vende = (user) => user.kind === 'empresa' || !!db.prepare('SELECT 1 FROM providers WHERE user_id = ?').get(user.id);
  const meuPlano = (user) => {
    const p = planos.atual(user.id);
    return { atual: { id: p.id, nome: p.nome, status: p.status, ate: p.ate, teste: p.teste, ciclo: p.ciclo || null, pedido: p.pedido }, uso: { respostas: planos.usadas(user.id), limite: p.respostas }, planos: tabelaPlanos() };
  };

  // Tabela pública (página de planos no app e no site, mesmo sem entrar).
  r.get('/planos', () => ({ planos: tabelaPlanos(), protecao: 'A Proteção Realyz contra golpe e fake news é grátis para todos.' }), { auth: false });
  r.get('/planos/meu', ({ user }) => meuPlano(user));
  r.post('/planos/pedir', ({ user, body }) => {
    if (!vende(user)) fail(403, 'Os planos são para empresas e prestadores.');
    const plano = oneOf(body.plano, 'o plano', ['realyz', 'pro']);
    const ciclo = oneOf(body.ciclo || 'mensal', 'o ciclo', ['mensal', 'anual']);
    planos.pedir(user.id, plano, ciclo);
    return { ...meuPlano(user), aviso: 'Pedido recebido. O pagamento abre assim que as compras do Realyz forem liberadas; até lá o que você já tem continua valendo.' };
  });
  r.post('/planos/cancelar', ({ user }) => {
    planos.cancelar(user.id);
    return meuPlano(user);
  });

  // Painel de inteligência (?dias=7|30|90, limitado pelo plano).
  r.get('/inteligencia/painel', ({ user, query }) => {
    if (!vende(user)) fail(403, 'O painel de inteligência é para empresas e prestadores.');
    return inteligencia.painel(user, query.dias);
  });

  // ── Administrador: pedidos de plano ──
  r.get('/admin/planos', () => planos.pedidos().map((p) => ({ userId: p.owner_id, nome: p.name, plano: PLANOS[p.plano].nome, planoId: p.plano, ciclo: p.ciclo, em: p.pedido_em })), A);
  r.post('/admin/planos/:userId', ({ params, body }) => {
    if (!userById(params.userId)) fail(404, 'Conta não encontrada.');
    const plano = oneOf(body.plano, 'o plano', ['gratis', 'realyz', 'pro']);
    if (plano === 'gratis') return planos.cancelar(params.userId);
    return planos.ativar(params.userId, plano, oneOf(body.ciclo || 'mensal', 'o ciclo', ['mensal', 'anual']));
  }, A);

  // ── Administrador: Proteção Realyz (alertas do robô + denúncias das pessoas) ──
  const alvo = (kind, id) => {
    if (kind === 'post') {
      const p = db.prepare('SELECT id, author_id, text, media, flagged, removed FROM posts WHERE id = ?').get(id);
      return p ? { texto: p.text, media: p.media, autor: publicUser(userById(p.author_id)), autorId: p.author_id, marcado: !!p.flagged } : null;
    }
    if (kind === 'product') {
      const p = db.prepare('SELECT p.name, p.price, p.active, c.name AS loja, c.owner_id FROM products p JOIN companies c ON c.id = p.company_id WHERE p.id = ?').get(id);
      return p ? { texto: `${p.name} · R$ ${toReais(p.price).toFixed(2).replace('.', ',')} · ${p.loja}`, autorId: p.owner_id, ativo: !!p.active } : null;
    }
    if (kind === 'user') {
      const u = userById(id);
      return u ? { texto: `${u.name} (*${u.username})`, autorId: u.id, status: u.status } : null;
    }
    if (kind === 'live') {
      const l = db.prepare('SELECT * FROM lives WHERE id = ?').get(id);
      return l ? { texto: l.title || 'Live', autorId: l.host_id } : null;
    }
    return null;
  };
  r.get('/admin/protecao', ({ query }) => {
    const status = query.status === 'resolvidas' ? "r.status != 'aberta'" : "r.status = 'aberta'";
    const tipo = ['golpe', 'fake'].includes(query.tipo) ? `AND r.tipo = '${query.tipo}'` : '';
    return db
      .prepare(`SELECT r.*, u.name AS from_name FROM reports r JOIN users u ON u.id = r.from_id WHERE ${status} ${tipo} ORDER BY r.pontos DESC, r.created_at DESC LIMIT 150`)
      .all()
      .map((x) => ({
        id: x.id, tipo: x.tipo || 'outro', origem: x.origem, pontos: x.pontos, motivo: x.reason, parecer: x.parecer, status: x.status, em: x.created_at,
        quem: x.origem === 'robo' ? 'Proteção Realyz' : x.from_name, alvoTipo: x.target_kind, alvoId: x.target_id,
        denuncias: db.prepare("SELECT COUNT(*) AS n FROM reports WHERE target_kind = ? AND target_id = ? AND origem = 'pessoa'").get(x.target_kind, x.target_id).n,
        alvo: alvo(x.target_kind, x.target_id),
      }));
  }, A);
  // procedente: marca como falso / tira do ar · improcedente: arquiva · bloquear: procedente + bloqueia a conta.
  r.post('/admin/protecao/:id/:decisao', ({ params }) => {
    const decisao = oneOf(params.decisao, 'a decisão', ['procedente', 'improcedente', 'bloquear']);
    const rep = db.prepare("SELECT * FROM reports WHERE id = ? AND status = 'aberta'").get(params.id);
    if (!rep) fail(404, 'Alerta aberto não encontrado.');
    const status = decisao === 'improcedente' ? 'improcedente' : 'procedente';
    const t = Date.now();
    // Todas as denúncias abertas do mesmo alvo saem juntas da fila.
    db.prepare("UPDATE reports SET status = ?, decided_at = ? WHERE target_kind = ? AND target_id = ? AND status = 'aberta'").run(status, t, rep.target_kind, rep.target_id);
    if (status === 'procedente') {
      if (rep.target_kind === 'post') db.prepare('UPDATE posts SET flagged = 1 WHERE id = ?').run(rep.target_id);
      if (rep.target_kind === 'product') db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(rep.target_id);
      if (rep.target_kind === 'live') db.prepare("UPDATE lives SET status = 'encerrada', ended_at = ? WHERE id = ?").run(t, rep.target_id);
    }
    if (decisao === 'bloquear') {
      const a = alvo(rep.target_kind, rep.target_id);
      const quem = a && a.autorId;
      if (quem && quem !== 'realys') {
        db.prepare("UPDATE users SET status = 'bloqueado' WHERE id = ? AND kind != 'sistema'").run(quem);
        db.prepare('UPDATE sessions SET revoked = 1 WHERE user_id = ?').run(quem);
      }
    }
    return { status, bloqueado: decisao === 'bloquear' };
  }, A);
}
