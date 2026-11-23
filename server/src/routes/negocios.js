// Negócios (imóveis, veículos e máquinas) no servidor. Mesmas regras do app (src/negocios.js e src/taxas.js):
// - Quem procura nunca paga. "Tenho interesse" manda o pedido para o anunciante.
// - O anunciante libera a conversa: de graça se o plano mensal dele cobre o setor; senão paga por conversa
//   (imóvel R$ 9,90; veículo/máquina R$ 4,90), do saldo da carteira.
// - Se o interessado não responder em 48 horas depois de liberada, o valor volta para o anunciante.
// - Plano mensal (Imobiliária R$ 99 até 10 anúncios, Imobiliária Plus até 40, Revenda até 40): o servidor
//   cobra todo mês da carteira; sem saldo, o plano fica atrasado e as conversas voltam a ser pagas.
import { fail, newId, now, str } from '../http.js';
import { tx } from '../db.js';
import { moderateText } from '../moderacaoTexto.js';

const DIA = 86400000;
export const NEG_REEMBOLSO_HORAS = 48;
const KINDS = ['imovel-venda', 'imovel-aluguel', 'veiculo-venda', 'veiculo-aluguel', 'maquina-venda', 'maquina-aluguel'];
export const NEG_PLANOS = {
  imob10: { nome: 'Imobiliária', cents: 9900, limite: 10, setores: ['imoveis'] },
  imob40: { nome: 'Imobiliária Plus', cents: 19900, limite: 40, setores: ['imoveis'] },
  revenda: { nome: 'Revenda', cents: 9900, limite: 40, setores: ['veiculos', 'maquinas'] },
};
const setorDoTipo = (kind) => (/^imovel/.test(kind) ? 'imoveis' : /^maquina/.test(kind) ? 'maquinas' : 'veiculos');
const precoContato = (kind) => (setorDoTipo(kind) === 'imoveis' ? 990 : 490);

export function makeNegocios({ db, wallet, hub }) {
  const plano = (userId) => {
    let p = db.prepare('SELECT * FROM neg_planos WHERE user_id = ?').get(userId);
    // Vencido: cobra o mês (um de cada vez); sem saldo, fica atrasado.
    let guarda = 0;
    while (p && p.paid_until <= now() && guarda++ < 12) {
      const pl = NEG_PLANOS[p.plan_id];
      try {
        tx(db, () => {
          const ref = newId('np');
          wallet.pay(userId, pl.cents, 'Anúncios', `Plano ${pl.nome} (mensal)`, ref);
          wallet.move('realys', 'saldo', pl.cents, 'Anúncios', `Plano ${pl.nome}`, ref);
          db.prepare(`UPDATE neg_planos SET paid_until = paid_until + ?, status = 'ok', updated_at = ? WHERE user_id = ?`).run(30 * DIA, now(), userId);
        });
      } catch (e) {
        db.prepare(`UPDATE neg_planos SET status = 'atrasado', updated_at = ? WHERE user_id = ?`).run(now(), userId);
        break;
      }
      p = db.prepare('SELECT * FROM neg_planos WHERE user_id = ?').get(userId);
    }
    return p && p.status === 'ok' ? p : p ? { ...p, atrasado: true } : null;
  };
  const cobre = (p, kind) => !!p && !p.atrasado && NEG_PLANOS[p.plan_id] && NEG_PLANOS[p.plan_id].setores.includes(setorDoTipo(kind));

  // 48 horas sem resposta do interessado depois de liberada: devolve o valor ao anunciante.
  function reembolsos() {
    const limite = now() - NEG_REEMBOLSO_HORAS * 3600000;
    const rows = db.prepare(`SELECT l.*, a.owner_id, a.title FROM neg_leads l JOIN neg_ads a ON a.id = l.ad_id WHERE l.status = 'liberado' AND l.paid > 0 AND l.refunded = 0 AND l.unlocked_at <= ? LIMIT 200`).all(limite);
    let n = 0;
    for (const l of rows) {
      const respondeu = db.prepare('SELECT 1 FROM messages WHERE from_id = ? AND to_id = ? AND created_at >= ? LIMIT 1').get(l.user_id, l.owner_id, l.unlocked_at);
      if (respondeu) {
        db.prepare('UPDATE neg_leads SET refunded = -1 WHERE id = ?').run(l.id); // respondeu: não tem devolução
        continue;
      }
      tx(db, () => {
        wallet.move('realys', 'saldo', -l.paid, 'Anúncios', `Devolução: interessado não respondeu (${l.title})`, l.id);
        wallet.move(l.owner_id, 'saldo', l.paid, 'Anúncios', `Devolução: interessado não respondeu em 48 h (${l.title})`, l.id);
        db.prepare('UPDATE neg_leads SET refunded = 1 WHERE id = ?').run(l.id);
      });
      hub.send(l.owner_id, 'neg-devolucao', { id: l.id, valor: l.paid / 100, title: l.title });
      n++;
    }
    return n;
  }
  return { plano, cobre, reembolsos };
}

export default function negociosRoutes(r, { db, wallet, hub, negocios }) {
  const fotos = (v) => (Array.isArray(v) ? v : []).map((u) => String(u || '')).map((u) => (u.match(/\/media\/[A-Za-z0-9._-]+$/) || [null])[0]).filter(Boolean).slice(0, 10);
  const adView = (a, user) => ({
    id: a.id, kind: a.kind, title: a.title, price: a.price_text, place: a.place || '', detail: a.detail || '', photos: JSON.parse(a.photos || '[]'),
    photo: JSON.parse(a.photos || '[]')[0] || null, who: a.owner_name, ownerId: a.owner_id, mine: !!user && a.owner_id === user.id, server: true, createdAt: a.created_at,
  });
  const SQL = 'SELECT a.*, u.name AS owner_name FROM neg_ads a JOIN users u ON u.id = a.owner_id';
  const adOf = (id) => {
    const a = db.prepare(`${SQL} WHERE a.id = ? AND a.status = 'ativo'`).get(String(id || ''));
    if (!a) fail(404, 'Anúncio não encontrado.');
    return a;
  };
  const planoView = (p) => (p ? { id: p.plan_id, nome: NEG_PLANOS[p.plan_id].nome, valor: NEG_PLANOS[p.plan_id].cents / 100, pagoAte: p.paid_until, atrasado: !!p.atrasado } : null);

  // Anúncios de todos (os patrocinados de exemplo continuam no app).
  r.get('/negocios/anuncios', ({ user, query }) => {
    const kinds = String(query.kinds || '').split(',').filter((k) => KINDS.includes(k));
    const rows = db.prepare(`${SQL} WHERE a.status = 'ativo' AND u.status = 'ativo' ${kinds.length ? `AND a.kind IN (${kinds.map(() => '?').join(',')})` : ''} ORDER BY a.created_at DESC LIMIT 200`).all(...kinds);
    return rows.map((a) => adView(a, user));
  });

  r.post('/negocios/anuncios', ({ user, body }) => {
    const kind = KINDS.includes(body.kind) ? body.kind : fail(400, 'Tipo de anúncio inválido.');
    const title = str(body.title, 'o título', { min: 5, max: 70 });
    const price = str(body.price, 'o preço', { min: 1, max: 30 });
    const place = str(body.place, 'a cidade', { optional: true, max: 40 }) || '';
    const detail = str(body.detail, 'os detalhes', { optional: true, max: 300 }) || '';
    const m = moderateText(`${title} ${place} ${detail}`, 'publico');
    if (!m.ok) fail(422, m.why, m.kind);
    const p = negocios.plano(user.id);
    if (cobreSetor(p, kind)) {
      const limite = NEG_PLANOS[p.plan_id].limite;
      const n = db.prepare(`SELECT COUNT(*) n FROM neg_ads WHERE owner_id = ? AND status = 'ativo'`).get(user.id).n;
      if (n >= limite) fail(409, `O plano ${NEG_PLANOS[p.plan_id].nome} vai até ${limite} anúncios.`, 'limite_plano');
    } else if (db.prepare(`SELECT COUNT(*) n FROM neg_ads WHERE owner_id = ? AND status = 'ativo'`).get(user.id).n >= 5) {
      fail(409, 'Sem plano, dá para ter até 5 anúncios no ar. Para mais, assine o plano mensal.', 'limite_sem_plano');
    }
    const id = newId('ng');
    const t = now();
    db.prepare('INSERT INTO neg_ads (id, owner_id, kind, title, price_text, place, detail, photos, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(id, user.id, kind, title, price, place, detail, JSON.stringify(fotos(body.photos)), 'ativo', t, t);
    return adView(adOf(id), user);
  });
  const cobreSetor = (p, kind) => negocios.cobre(p, kind);

  r.delete('/negocios/anuncios/:id', ({ params, user }) => {
    const a = adOf(params.id);
    if (a.owner_id !== user.id) fail(403, 'Só quem anunciou pode tirar o anúncio do ar.');
    db.prepare(`UPDATE neg_ads SET status = 'removido', updated_at = ? WHERE id = ?`).run(now(), a.id);
  });

  // "Tenho interesse": o cliente não paga nada; o pedido vai para o anunciante.
  r.post('/negocios/anuncios/:id/interesse', ({ params, user }) => {
    const a = adOf(params.id);
    if (a.owner_id === user.id) fail(400, 'Esse anúncio é seu.');
    const ja = db.prepare('SELECT * FROM neg_leads WHERE ad_id = ? AND user_id = ?').get(a.id, user.id);
    if (ja) return { status: ja.status };
    db.prepare('INSERT INTO neg_leads (id, ad_id, user_id, status, created_at) VALUES (?,?,?,?,?)').run(newId('nl'), a.id, user.id, 'aguardando', now());
    hub.send(a.owner_id, 'neg-interesse', { adId: a.id, title: a.title });
    return { status: 'aguardando' };
  });
  // Os meus pedidos de interesse (para o botão mostrar "aguardando" ou "abrir conversa").
  r.get('/negocios/interesses', ({ user }) =>
    db.prepare(`SELECT l.ad_id, l.status, a.owner_id, u.name AS owner_name FROM neg_leads l JOIN neg_ads a ON a.id = l.ad_id JOIN users u ON u.id = a.owner_id WHERE l.user_id = ?`).all(user.id)
      .map((x) => ({ adId: x.ad_id, status: x.status, ownerId: x.owner_id, owner: x.owner_name }))
  );

  // Meus anúncios com os interessados (o nome só aparece depois de liberar).
  r.get('/negocios/meus', ({ user }) => {
    const p = negocios.plano(user.id);
    const ads = db.prepare(`${SQL} WHERE a.owner_id = ? AND a.status = 'ativo' ORDER BY a.created_at DESC`).all(user.id).map((a) => {
      const leads = db.prepare('SELECT l.*, u.name FROM neg_leads l JOIN users u ON u.id = l.user_id WHERE l.ad_id = ? ORDER BY l.created_at DESC').all(a.id).map((l) => ({
        id: l.id, adId: a.id, userId: l.status === 'liberado' ? l.user_id : null, name: l.status === 'liberado' ? l.name : 'Interessado verificado', unlocked: l.status === 'liberado',
        paid: l.paid / 100, refunded: l.refunded === 1, at: l.created_at,
      }));
      return { ...adView(a, user), leads, custo: negocios.cobre(p, a.kind) ? 0 : precoContato(a.kind) / 100 };
    });
    return { ads, plano: planoView(p) };
  });

  // Liberar a conversa com um interessado.
  r.post('/negocios/leads/:id/liberar', ({ params, user }) => {
    const l = db.prepare('SELECT l.*, a.owner_id, a.kind, a.title FROM neg_leads l JOIN neg_ads a ON a.id = l.ad_id WHERE l.id = ?').get(String(params.id || ''));
    if (!l || l.owner_id !== user.id) fail(404, 'Interessado não encontrado.');
    if (l.status === 'liberado') return { ok: true, userId: l.user_id };
    const cost = negocios.cobre(negocios.plano(user.id), l.kind) ? 0 : precoContato(l.kind);
    tx(db, () => {
      if (cost) {
        wallet.pay(user.id, cost, 'Anúncios', `Conversa liberada (${l.title})`, l.id);
        wallet.move('realys', 'saldo', cost, 'Anúncios', `Conversa liberada (${l.title})`, l.id);
      }
      db.prepare(`UPDATE neg_leads SET status = 'liberado', paid = ?, unlocked_at = ? WHERE id = ?`).run(cost, now(), l.id);
    });
    hub.send(l.user_id, 'neg-liberado', { adId: l.ad_id, title: l.title, from: user.name });
    return { ok: true, userId: l.user_id, paid: cost / 100 };
  });

  // Plano mensal do anunciante (cobra o primeiro mês na hora; depois, todo mês).
  r.post('/negocios/plano', ({ user, body }) => {
    const pl = NEG_PLANOS[String(body.planId || '')];
    if (!pl) fail(400, 'Plano não encontrado.');
    const atual = negocios.plano(user.id);
    if (atual && !atual.atrasado && atual.plan_id === body.planId) return { plano: planoView(atual) };
    tx(db, () => {
      const ref = newId('np');
      wallet.pay(user.id, pl.cents, 'Anúncios', `Plano ${pl.nome} (mensal)`, ref);
      wallet.move('realys', 'saldo', pl.cents, 'Anúncios', `Plano ${pl.nome}`, ref);
      db.prepare(`INSERT INTO neg_planos (user_id, plan_id, paid_until, status, updated_at) VALUES (?,?,?, 'ok', ?)
        ON CONFLICT(user_id) DO UPDATE SET plan_id = excluded.plan_id, paid_until = excluded.paid_until, status = 'ok', updated_at = excluded.updated_at`).run(user.id, String(body.planId), now() + 30 * DIA, now());
    });
    return { plano: planoView(negocios.plano(user.id)) };
  });
  r.delete('/negocios/plano', ({ user }) => {
    db.prepare('DELETE FROM neg_planos WHERE user_id = ?').run(user.id);
  });
}
