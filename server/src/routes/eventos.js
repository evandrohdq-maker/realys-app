// Eventos e ingressos de verdade: a empresa (produtora, bar, casa noturna) publica o evento com o
// preço e a lotação; o cliente compra pelo app e recebe o código do ingresso (vira QR na portaria).
// Taxa do Realyz: 8% de cada ingresso, no mínimo R$ 1,99, paga pelo produtor (sai do valor dele).
import { fail, newId, now, str, money, int, toReais } from '../http.js';
import { tx } from '../db.js';

export default function eventosRoutes(r, { db, cfg, wallet, hub, fiscal }) {
  const companyOf = (userId) => db.prepare('SELECT * FROM companies WHERE owner_id = ?').get(userId);
  const view = (e) => ({
    id: e.id, companyId: e.company_id, company: e.company_name, title: e.title, detail: e.detail, when: e.when_text, startsAt: e.starts_at,
    place: e.place, city: e.city, price: toReais(e.price), capacity: e.capacity, sold: e.sold, left: Math.max(0, e.capacity - e.sold),
    cover: e.cover, status: e.status, createdAt: e.created_at,
  });
  const SQL = 'SELECT e.*, c.name AS company_name FROM events e JOIN companies c ON c.id = e.company_id';
  const fee = (cents) => Math.max(Math.round((cfg.ticketFeeMin || 1.99) * 100), Math.round((cents * (cfg.ticketFeePct ?? 8)) / 100));

  // Publicar evento (só contas de empresa).
  r.post('/events', ({ user, body }) => {
    const c = companyOf(user.id);
    if (!c) fail(403, 'Só contas de empresa publicam eventos.');
    const id = newId('ev');
    const startsAt = body.startsAt ? Number(body.startsAt) : null;
    db.prepare('INSERT INTO events (id, company_id, title, detail, when_text, starts_at, place, city, price, capacity, sold, cover, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,0,?,?,?)').run(
      id, c.id, str(body.title, 'o nome do evento', { min: 3, max: 90 }), str(body.detail, 'a descrição', { optional: true, max: 400 }) || '',
      str(body.when, 'o dia e a hora', { max: 60 }), startsAt && startsAt > 0 ? startsAt : null, str(body.place, 'o local', { max: 120 }),
      str(body.city, 'a cidade', { optional: true, max: 60 }) || '', money(body.price, 'preço do ingresso', { min: 0 }), int(body.capacity, 'lotação', { min: 1, max: 100000 }),
      str(body.cover, 'a foto', { optional: true, max: 300 }) || null, 'aberto', now()
    );
    return view(db.prepare(`${SQL} WHERE e.id = ?`).get(id));
  }, { status: 201 });

  r.get('/events', () => db.prepare(`${SQL} WHERE e.status = 'aberto' ORDER BY COALESCE(e.starts_at, e.created_at) LIMIT 100`).all().map(view), { auth: false });

  // Eventos da minha empresa, com as vendas.
  r.get('/events/mine', ({ user }) => {
    const c = companyOf(user.id);
    if (!c) return [];
    return db.prepare(`${SQL} WHERE e.company_id = ? ORDER BY e.created_at DESC`).all(c.id).map((e) => ({
      ...view(e),
      revenue: toReais(db.prepare('SELECT COALESCE(SUM(price - fee), 0) AS v FROM tickets WHERE event_id = ? AND status != ?').get(e.id, 'cancelado').v),
    }));
  });

  r.patch('/events/:id', ({ user, params, body }) => {
    const c = companyOf(user.id);
    const e = c && db.prepare('SELECT * FROM events WHERE id = ? AND company_id = ?').get(params.id, c.id);
    if (!e) fail(404, 'Evento não encontrado na sua empresa.');
    if (body.status && ['aberto', 'esgotado', 'encerrado'].includes(body.status)) db.prepare('UPDATE events SET status = ? WHERE id = ?').run(body.status, e.id);
    if (body.capacity !== undefined) db.prepare('UPDATE events SET capacity = ? WHERE id = ?').run(Math.max(e.sold, int(body.capacity, 'lotação', { min: 1, max: 100000 })), e.id);
    return view(db.prepare(`${SQL} WHERE e.id = ?`).get(e.id));
  });

  // Comprar ingressos. O valor sai do cliente (presentes primeiro); o produtor recebe o preço menos a taxa.
  r.post('/events/:id/tickets', ({ user, params, body }) => {
    const qty = int(body.qty ?? 1, 'quantidade', { min: 1, max: 10 });
    const out = tx(db, () => {
      const e = db.prepare(`${SQL} WHERE e.id = ?`).get(params.id);
      if (!e || e.status !== 'aberto') fail(404, 'Esse evento não está vendendo ingressos.');
      if (e.sold + qty > e.capacity) fail(409, e.capacity - e.sold > 0 ? `Restam só ${e.capacity - e.sold} ingressos.` : 'Ingressos esgotados.');
      const c = db.prepare('SELECT owner_id FROM companies WHERE id = ?').get(e.company_id);
      if (c.owner_id === user.id) fail(400, 'Você não pode comprar ingresso do seu próprio evento.');
      const total = e.price * qty;
      const id = newId('tk');
      const paid = total ? wallet.pay(user.id, total, 'Ingressos', `${qty}× ingresso: ${e.title}`, id) : { fromGift: 0, fromWallet: 0 };
      const codes = [];
      let feeSum = 0;
      for (let i = 0; i < qty; i++) {
        const f = e.price ? Math.min(e.price, fee(e.price)) : 0;
        feeSum += f;
        const code = 'RZ' + Math.random().toString(36).slice(2, 8).toUpperCase() + String(Date.now() % 1000).padStart(3, '0');
        db.prepare('INSERT INTO tickets (id, code, event_id, buyer_id, price, fee, status, created_at) VALUES (?,?,?,?,?,?,?,?)').run(newId('tq'), code, e.id, user.id, e.price, f, 'valido', now());
        codes.push(code);
      }
      if (total) {
        wallet.move(c.owner_id, 'saldo', total - feeSum, 'Ingressos', `${qty}× ingresso vendido: ${e.title}`, id);
        if (feeSum) {
          wallet.move('realys', 'saldo', feeSum, 'Comissão', `Taxa de ingressos (${e.title})`, id);
          fiscal.registrar({ origem: 'comissao_ingresso', ref: id, tomadorId: c.owner_id, valorCents: feeSum });
        }
      }
      db.prepare('UPDATE events SET sold = sold + ?, status = CASE WHEN sold + ? >= capacity THEN ? ELSE status END WHERE id = ?').run(qty, qty, 'esgotado', e.id);
      hub.send(c.owner_id, 'ticket', { eventId: e.id, title: e.title, qty, buyer: user.name });
      return { codes, total: toReais(total), fromGift: toReais(paid.fromGift), fromWallet: toReais(paid.fromWallet), event: view(db.prepare(`${SQL} WHERE e.id = ?`).get(e.id)) };
    });
    return out;
  }, { status: 201 });

  // Meus ingressos.
  r.get('/tickets', ({ user }) =>
    db.prepare(`SELECT t.code, t.price, t.status, t.created_at, t.used_at, e.id AS event_id, e.title, e.when_text, e.place, c.name AS company_name FROM tickets t JOIN events e ON e.id = t.event_id JOIN companies c ON c.id = e.company_id WHERE t.buyer_id = ? ORDER BY t.created_at DESC LIMIT 100`)
      .all(user.id)
      .map((t) => ({ code: t.code, eventId: t.event_id, title: t.title, when: t.when_text, place: t.place, company: t.company_name, price: toReais(t.price), status: t.status, at: t.created_at, usedAt: t.used_at }))
  );

  // Portaria: o produtor confere o código (lido do QR) e marca a entrada. Cada ingresso entra uma vez.
  r.post('/tickets/:code/entrada', ({ user, params }) => {
    const c = companyOf(user.id);
    const t = c && db.prepare('SELECT t.*, e.title, e.company_id, u.name AS buyer FROM tickets t JOIN events e ON e.id = t.event_id JOIN users u ON u.id = t.buyer_id WHERE t.code = ?').get(String(params.code).toUpperCase());
    if (!t || t.company_id !== c.id) fail(404, 'Ingresso não encontrado nos seus eventos.');
    if (t.status === 'usado') fail(409, `Esse ingresso já entrou (${new Date(t.used_at).toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo' })}).`);
    if (t.status !== 'valido') fail(409, 'Ingresso cancelado.');
    db.prepare("UPDATE tickets SET status = 'usado', used_at = ? WHERE id = ?").run(now(), t.id);
    hub.send(t.buyer_id, 'ticket_used', { code: t.code, title: t.title });
    return { ok: true, buyer: t.buyer, title: t.title };
  });
}
