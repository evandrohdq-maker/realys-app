// Lives: abrir, encerrar, listar por assunto e presentes ao vivo.
// O vídeo em si passa por um serviço de transmissão (ex.: LiveKit) ligado depois; aqui ficam
// as lives no ar, quem transmite e o dinheiro dos presentes.
import { fail, newId, now, str, int, toReais } from '../http.js';
import { tx } from '../db.js';

// Mesmos presentes do app (src/gifts.js), em centavos.
export const LIVE_GIFTS = { rosa: 100, coracao: 200, aplauso: 500, estrela: 1000, coroa: 5000, foguete: 10000, diamante: 30000, lotus: 50000 };
const CATS = ['gamers', 'artistas', 'cursos', 'faculdades', 'tecnologia', 'noticias', 'podcasts', 'compras', 'noite', 'comunidade'];
const HOSTS = ['usuario', 'empresa', 'artista', 'prestador', 'fornecedor'];

export default function livesRoutes(r, { db, wallet, hub }) {
  const view = (l) => ({ id: l.id, hostId: l.host_id, hostType: l.host_type, host: l.host_name, cat: l.cat, title: l.title, status: l.status, giftsTotal: toReais(l.gifts_total), startedAt: l.started_at, endedAt: l.ended_at, viewers: viewersOf(l.id) });
  const watching = new Map(); // liveId -> Map<userId, lastSeen>
  const viewersOf = (id) => {
    const m = watching.get(id);
    if (!m) return 0;
    const t = now();
    for (const [u, seen] of m) if (t - seen > 60000) m.delete(u);
    return m.size;
  };

  r.get('/lives', ({ query }) => {
    const rows = query.cat
      ? db.prepare(`SELECT * FROM lives WHERE status = 'ao_vivo' AND cat = ? ORDER BY started_at DESC`).all(query.cat)
      : db.prepare(`SELECT * FROM lives WHERE status = 'ao_vivo' ORDER BY started_at DESC`).all();
    return rows.map(view);
  }, { auth: false });

  r.post('/lives', ({ body, user }) => {
    const hostType = HOSTS.includes(body.hostType) ? body.hostType : 'usuario';
    const roles = JSON.parse(user.roles);
    if (hostType === 'empresa' && !roles.includes('empresa')) fail(403, 'Só contas de empresa transmitem como empresa.');
    if (hostType === 'prestador' && !roles.includes('prestador')) fail(403, 'Cadastre-se como prestador para transmitir como prestador.');
    const cat = CATS.includes(body.cat) ? body.cat : 'comunidade';
    // Uma live por vez: abrir outra encerra a anterior.
    db.prepare(`UPDATE lives SET status = 'encerrada', ended_at = ? WHERE host_id = ? AND status = 'ao_vivo'`).run(now(), user.id);
    const company = hostType === 'empresa' ? db.prepare('SELECT name FROM companies WHERE owner_id = ?').get(user.id) : null;
    const id = newId('lv');
    db.prepare('INSERT INTO lives (id, host_id, host_type, host_name, cat, title, status, started_at) VALUES (?,?,?,?,?,?,?,?)').run(
      id, user.id, hostType, company ? company.name : user.name, cat, str(body.title, 'o título', { max: 120 }), 'ao_vivo', now()
    );
    return view(db.prepare('SELECT * FROM lives WHERE id = ?').get(id));
  }, { status: 201 });

  r.get('/lives/:id', ({ params, user }) => {
    const l = db.prepare('SELECT * FROM lives WHERE id = ?').get(params.id);
    if (!l) fail(404, 'Live não encontrada.');
    // Quem abre a live conta como espectador (o app chama de novo a cada ~30 s enquanto assiste).
    if (l.status === 'ao_vivo' && user.id !== l.host_id) {
      if (!watching.has(l.id)) watching.set(l.id, new Map());
      watching.get(l.id).set(user.id, now());
    }
    return view(l);
  });

  r.post('/lives/:id/end', ({ params, user }) => {
    const l = db.prepare(`SELECT * FROM lives WHERE id = ? AND host_id = ?`).get(params.id, user.id);
    if (!l) fail(404, 'Live não encontrada.');
    db.prepare(`UPDATE lives SET status = 'encerrada', ended_at = ? WHERE id = ?`).run(now(), l.id);
    watching.delete(l.id);
    return view(db.prepare('SELECT * FROM lives WHERE id = ?').get(l.id));
  });

  // Presente na live: sai do saldo de quem assiste (valor + taxa) e vira crédito de live de quem transmite.
  r.post('/lives/:id/gifts', ({ params, body, user }) => {
    const l = db.prepare(`SELECT * FROM lives WHERE id = ?`).get(params.id);
    if (!l || l.status !== 'ao_vivo') fail(404, 'Essa live já terminou.');
    if (l.host_id === user.id) fail(400, 'Você não pode presentear a sua própria live.');
    const unit = LIVE_GIFTS[body.gift];
    if (!unit) fail(400, 'Presente inválido.');
    const qty = int(body.qty ?? 1, 'quantidade', { min: 1, max: 100 });
    const value = unit * qty;
    const fee = wallet.giftFee(value);
    const id = newId('lg');
    tx(db, () => {
      wallet.move(user.id, 'saldo', -(value + fee), 'Presentes', `Live de ${l.host_name}: ${body.gift}${qty > 1 ? ` x${qty}` : ''}`, id);
      wallet.move(l.host_id, 'live', value, 'Lives', `${user.name} enviou ${body.gift}${qty > 1 ? ` x${qty}` : ''} na live "${l.title}"`, id);
      wallet.move('realys', 'saldo', fee, 'Taxa de presente', `Taxa do presente de live ${id}`, id);
      db.prepare('INSERT INTO live_gifts (id, live_id, from_id, host_id, gift, qty, value, fee, created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(id, l.id, user.id, l.host_id, body.gift, qty, value, fee, now());
      db.prepare('UPDATE lives SET gifts_total = gifts_total + ? WHERE id = ?').run(value, l.id);
    });
    hub.send(l.host_id, 'live_gift', { liveId: l.id, from: user.name, gift: body.gift, qty, value: toReais(value) });
    return { id, value: toReais(value), fee: toReais(fee), total: toReais(value + fee), wallet: { balance: toReais(wallet.get(user.id).balance) } };
  }, { status: 201 });

  // Últimos presentes de uma live (para mostrar nos comentários).
  r.get('/lives/:id/gifts', ({ params }) =>
    db.prepare('SELECT g.gift, g.qty, g.value, g.created_at AS at, u.name AS "from" FROM live_gifts g JOIN users u ON u.id = g.from_id WHERE g.live_id = ? ORDER BY g.created_at DESC LIMIT 30').all(params.id).map((g) => ({ ...g, value: toReais(g.value) }))
  );
}
