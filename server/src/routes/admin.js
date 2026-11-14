// Acesso do administrador: visão geral do sistema, contas, depósitos, saques e denúncias.
import { fail, now, toReais } from '../http.js';
import { tx } from '../db.js';

export default function adminRoutes(r, { db, wallet, hub, publicUser }) {
  const A = { auth: 'admin' };
  const count = (sql, ...a) => db.prepare(sql).get(...a).n;

  r.get('/admin/stats', () => {
    const day = now() - 86400000;
    const realys = wallet.get('realys');
    return {
      users: count(`SELECT COUNT(*) AS n FROM users WHERE kind = 'pessoa'`),
      companies: count('SELECT COUNT(*) AS n FROM companies'),
      providers: count('SELECT COUNT(*) AS n FROM providers'),
      providersOnline: count('SELECT COUNT(*) AS n FROM providers WHERE available = 1 AND updated_at > ?', now() - 900000),
      products: count('SELECT COUNT(*) AS n FROM products WHERE active = 1'),
      orders24h: count('SELECT COUNT(*) AS n FROM orders WHERE created_at > ?', day),
      sales24h: toReais(db.prepare(`SELECT COALESCE(SUM(total), 0) AS n FROM orders WHERE created_at > ? AND status != 'Cancelado'`).get(day).n),
      livesNow: count(`SELECT COUNT(*) AS n FROM lives WHERE status = 'ao_vivo'`),
      posts24h: count('SELECT COUNT(*) AS n FROM posts WHERE created_at > ?', day),
      openReports: count(`SELECT COUNT(*) AS n FROM reports WHERE status = 'aberta'`),
      pendingDeposits: count(`SELECT COUNT(*) AS n FROM deposits WHERE status = 'pendente'`),
      pendingWithdrawals: count(`SELECT COUNT(*) AS n FROM withdrawals WHERE status = 'pendente'`),
      revenue: toReais(realys.balance), // taxas que ficaram para o Re@lys
      moneyInPlatform: toReais(db.prepare(`SELECT COALESCE(SUM(balance + gift_credits + live_credits), 0) AS n FROM wallets WHERE user_id != 'realys'`).get().n),
      online: hub.clients.size,
    };
  }, A);

  r.get('/admin/users', ({ query }) => {
    const q = `%${query.q || ''}%`;
    return db.prepare(`SELECT * FROM users WHERE kind != 'sistema' AND (name LIKE ? OR username LIKE ? OR email LIKE ?) ORDER BY created_at DESC LIMIT 100`).all(q, q, q)
      .map((u) => ({ ...publicUser(u, { self: true }), wallet: (({ balance, gift_credits, live_credits }) => ({ balance: toReais(balance), giftCredits: toReais(gift_credits), liveCredits: toReais(live_credits) }))(wallet.get(u.id)) }));
  }, A);

  // Bloquear / desbloquear conta (perfil falso, golpe, fake news comprovada).
  r.post('/admin/users/:id/:action', ({ params, user }) => {
    const status = { bloquear: 'bloqueado', desbloquear: 'ativo' }[params.action];
    if (!status) fail(404, 'Endereço não encontrado.');
    if (params.id === user.id) fail(400, 'Você não pode bloquear a si mesmo.');
    const r2 = db.prepare(`UPDATE users SET status = ? WHERE id = ? AND kind != 'sistema'`).run(status, params.id);
    if (!r2.changes) fail(404, 'Conta não encontrada.');
    if (status === 'bloqueado') db.prepare('UPDATE sessions SET revoked = 1 WHERE user_id = ?').run(params.id);
    return { status };
  }, A);

  // Depósitos pendentes (quando TEST_DEPOSITS=false): confirmar depois de ver o Pix no banco.
  r.get('/admin/deposits', ({ query }) =>
    db.prepare('SELECT d.*, u.name FROM deposits d JOIN users u ON u.id = d.user_id WHERE d.status = ? ORDER BY d.created_at DESC LIMIT 100').all(query.status || 'pendente').map((d) => ({ ...d, amount: toReais(d.amount) })), A);
  r.post('/admin/deposits/:id/:action', ({ params }) => {
    const status = { confirmar: 'confirmado', recusar: 'recusado' }[params.action];
    if (!status) fail(404, 'Endereço não encontrado.');
    const d = db.prepare(`SELECT * FROM deposits WHERE id = ? AND status = 'pendente'`).get(params.id);
    if (!d) fail(404, 'Depósito pendente não encontrado.');
    tx(db, () => {
      db.prepare('UPDATE deposits SET status = ?, decided_at = ? WHERE id = ?').run(status, now(), d.id);
      if (status === 'confirmado') wallet.move(d.user_id, 'saldo', d.amount, 'Depósito', `Depósito por ${d.method}`, d.id);
    });
    hub.send(d.user_id, 'deposit', { id: d.id, status, amount: toReais(d.amount) });
    return { status };
  }, A);

  // Saques: marcar como pago (depois de fazer o Pix) ou recusar (devolve o dinheiro).
  r.get('/admin/withdrawals', ({ query }) =>
    db.prepare('SELECT w.*, u.name FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE w.status = ? ORDER BY w.created_at DESC LIMIT 100').all(query.status || 'pendente').map((w) => ({ ...w, amount: toReais(w.amount) })), A);
  r.post('/admin/withdrawals/:id/:action', ({ params }) => {
    const status = { pagar: 'pago', recusar: 'recusado' }[params.action];
    if (!status) fail(404, 'Endereço não encontrado.');
    const w = db.prepare(`SELECT * FROM withdrawals WHERE id = ? AND status = 'pendente'`).get(params.id);
    if (!w) fail(404, 'Saque pendente não encontrado.');
    tx(db, () => {
      db.prepare('UPDATE withdrawals SET status = ?, decided_at = ? WHERE id = ?').run(status, now(), w.id);
      if (status === 'recusado') wallet.move(w.user_id, 'saldo', w.amount, 'Saque', 'Saque recusado: valor devolvido', w.id);
    });
    hub.send(w.user_id, 'withdrawal', { id: w.id, status, amount: toReais(w.amount) });
    return { status };
  }, A);

  // Denúncias: procedente marca o post como informação falsa (some do feed e do conhecimento da Lotus).
  r.get('/admin/reports', ({ query }) => db.prepare('SELECT r.*, u.name AS from_name FROM reports r JOIN users u ON u.id = r.from_id WHERE r.status = ? ORDER BY r.created_at DESC LIMIT 100').all(query.status || 'aberta'), A);
  r.post('/admin/reports/:id/:decision', ({ params }) => {
    const status = { procedente: 'procedente', improcedente: 'improcedente' }[params.decision];
    if (!status) fail(404, 'Endereço não encontrado.');
    const rep = db.prepare(`SELECT * FROM reports WHERE id = ? AND status = 'aberta'`).get(params.id);
    if (!rep) fail(404, 'Denúncia aberta não encontrada.');
    tx(db, () => {
      db.prepare('UPDATE reports SET status = ?, decided_at = ? WHERE id = ?').run(status, now(), rep.id);
      if (status === 'procedente' && rep.target_kind === 'post') db.prepare('UPDATE posts SET flagged = 1 WHERE id = ?').run(rep.target_id);
      if (status === 'procedente' && rep.target_kind === 'product') db.prepare('UPDATE products SET active = 0 WHERE id = ?').run(rep.target_id);
      if (status === 'procedente' && rep.target_kind === 'live') db.prepare(`UPDATE lives SET status = 'encerrada', ended_at = ? WHERE id = ?`).run(now(), rep.target_id);
    });
    return { status };
  }, A);
}
