// Date+ (assinatura do Date) guardada no servidor. Antes ficava só no celular e a chamada de vídeo
// do Date era conferida só no app. Agora:
//   - GET  /date/assinatura           → minha assinatura (ou null)
//   - POST /date/assinatura {planId}  → assina com o saldo da carteira; se ainda tiver uma valendo,
//                                        os dias somam no fim dela
//   - POST /date/assinatura/cancelar  → desliga a renovação (o que já foi pago vale até o fim)
// A chamada de vídeo do Date (POST /video-calls com ctx 'date') confere aqui quem liga.
import { fail, newId, now, toReais } from '../http.js';
import { tx } from '../db.js';

// Mesmos planos do app (src/datePlans.js). Preço em centavos.
export const DATE_PLANS = {
  semanal: { title: 'Semanal', days: 7, price: 990 },
  mensal: { title: 'Mensal', days: 30, price: 1490 },
  semestral: { title: 'Semestral', days: 182, price: 5990 },
  anual: { title: 'Anual', days: 365, price: 8990 },
};
const DIA = 86400000;

export function dateSubOf(db, userId, at = now()) {
  const s = db.prepare('SELECT * FROM date_subs WHERE user_id = ?').get(userId);
  return s && s.until > at ? s : null;
}

export default function dateRoutes(r, { db, wallet }) {
  const view = (s) => (s ? { planId: s.plan_id, title: (DATE_PLANS[s.plan_id] || {}).title || s.plan_id, start: s.started_at, until: s.until, renew: !!s.renew } : null);

  r.get('/date/assinatura', ({ user }) => ({ sub: view(dateSubOf(db, user.id)) }));

  r.post('/date/assinatura', ({ user, body }) => {
    const p = DATE_PLANS[String(body.planId || '')];
    if (!p) fail(400, 'Plano não encontrado.');
    if (body.pay === 'pontos') fail(400, 'Na sua conta, o Date+ é pago com o saldo da carteira.', 'so_saldo');
    return tx(db, () => {
      const at = now();
      const cur = dateSubOf(db, user.id, at);
      const start = cur ? cur.until : at;
      const until = start + p.days * DIA;
      const ref = newId('ds');
      wallet.pay(user.id, p.price, 'Date', `Assinatura Date+ ${p.title}`, ref);
      wallet.move('realys', 'saldo', p.price, 'Date', `Assinatura Date+ ${p.title}`, ref);
      db.prepare(`INSERT INTO date_subs (user_id, plan_id, started_at, until, renew, updated_at) VALUES (?,?,?,?,1,?)
        ON CONFLICT(user_id) DO UPDATE SET plan_id = excluded.plan_id, until = excluded.until, renew = 1, updated_at = excluded.updated_at,
        started_at = CASE WHEN date_subs.until > excluded.updated_at THEN date_subs.started_at ELSE excluded.started_at END`).run(user.id, String(body.planId), start, until, at);
      db.prepare('INSERT INTO date_sub_log (id, user_id, plan_id, price, started_at, until, created_at) VALUES (?,?,?,?,?,?,?)').run(ref, user.id, String(body.planId), p.price, start, until, at);
      return { sub: view(dateSubOf(db, user.id, at)), paid: toReais(p.price) };
    });
  });

  r.post('/date/assinatura/cancelar', ({ user }) => {
    const s = dateSubOf(db, user.id);
    if (!s) fail(404, 'Você não tem assinatura do Date+ valendo.');
    db.prepare('UPDATE date_subs SET renew = 0, updated_at = ? WHERE user_id = ?').run(now(), user.id);
    return { sub: view(dateSubOf(db, user.id)) };
  });
}
