// Lives: abrir, encerrar, listar por assunto e presentes ao vivo.
// O vídeo em si passa por um serviço de transmissão (ex.: LiveKit) ligado depois; aqui ficam
// as lives no ar, quem transmite e o dinheiro dos presentes.
import { temAlgum } from '../trabalho.js';
import { exigirParceiroDeTeste } from '../teste.js';
import { fail, newId, now, str, int, toReais } from '../http.js';
import { tx } from '../db.js';

// Mesmos presentes do app (src/gifts.js), em centavos.
export const LIVE_GIFTS = { rosa: 100, coracao: 200, aplauso: 500, estrela: 1000, coroa: 5000, foguete: 10000, diamante: 30000, lotus: 50000 };
// Mesmos segmentos do app (src/liveData.js): o "puxar para cima" vai para a próxima live do mesmo segmento.
const CATS = ['gamers', 'artistas', 'compras', 'esportes', 'saude', 'fe', 'cursos', 'faculdades', 'tecnologia', 'agro', 'negocios', 'culinaria', 'beleza', 'arte', 'humor', 'podcasts', 'noticias', 'noite', 'comunidade'];
// Pausa da tela (live de jogo): 'abrindo' = o streamer está saindo do Realyz e abrindo o jogo (a tela
// inicial do celular não aparece); 'seguranca' = senha, carteira, Pix etc. Fica na memória, como a plateia.
const PAUSE_MOTIVOS = ['abrindo', 'seguranca'];
const HOSTS = ['usuario', 'empresa', 'artista', 'prestador', 'fornecedor'];

export default function livesRoutes(r, { db, cfg, wallet, hub, fiscal, gravador }) {
  const paused = new Map(); // liveId -> motivo
  const view = (l) => ({ paused: paused.get(l.id) || null, id: l.id, hostId: l.host_id, hostType: l.host_type, host: l.host_name, cat: l.cat, title: l.title, source: l.source || 'camera', status: l.status, giftsTotal: toReais(l.gifts_total), startedAt: l.started_at, endedAt: l.ended_at, viewers: viewersOf(l.id) });
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
    // Fonte do vídeo: câmera ou tela do celular (jogos).
    const source = body.source === 'tela' ? 'tela' : 'camera';
    db.prepare('INSERT INTO lives (id, host_id, host_type, host_name, cat, title, source, status, started_at) VALUES (?,?,?,?,?,?,?,?,?)').run(
      id, user.id, hostType, company ? company.name : user.name, cat, str(body.title, 'o título', { max: 120 }), source, 'ao_vivo', now()
    );
    const live = view(db.prepare('SELECT * FROM lives WHERE id = ?').get(id));
    // Avisa na hora quem favoritou este streamer e ligou o sininho.
    for (const f of db.prepare('SELECT user_id FROM streamer_favs WHERE host_id = ? AND notify = 1 AND user_id != ?').all(user.id, user.id)) hub.send(f.user_id, 'live-favorito', live);
    return live;
  }, { status: 201 });

  // ---------- Streamers favoritos ----------
  // Favoritar (coração) e receber aviso (sininho) são separados: notify diz se quer o aviso.
  const hostOf = (id) => {
    const h = db.prepare(`SELECT id FROM users WHERE id = ? AND kind != 'sistema'`).get(String(id || '').slice(0, 64));
    if (!h) fail(404, 'Streamer não encontrado.');
    return h.id;
  };
  r.put('/streamers/:id/favorito', ({ params, body, user }) => {
    const hostId = hostOf(params.id);
    if (hostId === user.id) fail(400, 'Você não pode favoritar você mesmo.');
    const notify = body && body.notify ? 1 : 0;
    db.prepare('INSERT INTO streamer_favs (user_id, host_id, notify, created_at) VALUES (?,?,?,?) ON CONFLICT(user_id, host_id) DO UPDATE SET notify = excluded.notify').run(user.id, hostId, notify, now());
    return { hostId, favorito: true, notify: !!notify };
  });
  r.delete('/streamers/:id/favorito', ({ params, user }) => {
    db.prepare('DELETE FROM streamer_favs WHERE user_id = ? AND host_id = ?').run(user.id, String(params.id || '').slice(0, 64));
    return { hostId: params.id, favorito: false, notify: false };
  });
  // Meus streamers favoritos, com quem está ao vivo agora.
  r.get('/streamers/favoritos', ({ user }) =>
    db.prepare(`SELECT f.host_id, f.notify, u.name, (SELECT id FROM lives l WHERE l.host_id = f.host_id AND l.status = 'ao_vivo' LIMIT 1) AS live_id FROM streamer_favs f JOIN users u ON u.id = f.host_id WHERE f.user_id = ? ORDER BY f.created_at DESC`)
      .all(user.id)
      .map((f) => ({ hostId: f.host_id, name: f.name, notify: !!f.notify, liveId: f.live_id || null })));
  // Para o streamer: quantas pessoas favoritaram e quantas recebem o aviso.
  r.get('/streamers/me/fas', ({ user }) => {
    const c = db.prepare('SELECT COUNT(*) AS total, COALESCE(SUM(notify), 0) AS avisos FROM streamer_favs WHERE host_id = ?').get(user.id);
    return { favoritaram: c.total, recebemAviso: c.avisos };
  });

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
    // Estava gravando para cortes: fecha a gravação (vai para o editor de vídeo).
    if (gravador) gravador.parar(l.id);
    watching.delete(l.id);
    paused.delete(l.id);
    return view(db.prepare('SELECT * FROM lives WHERE id = ?').get(l.id));
  });

  // Quem transmite a tela avisa a pausa (abrindo o jogo / segurança) e quem está assistindo recebe na hora.
  r.post('/lives/:id/pause', ({ params, body, user }) => {
    const l = db.prepare(`SELECT * FROM lives WHERE id = ? AND host_id = ? AND status = 'ao_vivo'`).get(params.id, user.id);
    if (!l) fail(404, 'Live não encontrada.');
    const motivo = body.paused ? (PAUSE_MOTIVOS.includes(body.motivo) ? body.motivo : 'seguranca') : null;
    if (motivo) paused.set(l.id, motivo);
    else paused.delete(l.id);
    viewersOf(l.id);
    for (const u of (watching.get(l.id) || new Map()).keys()) hub.send(u, 'live-pausa', { liveId: l.id, paused: motivo });
    return view(l);
  });

  // Presente na live: sai do saldo de quem assiste (valor + taxa) e vira crédito de live de quem transmite.
  r.post('/lives/:id/gifts', ({ params, body, user }) => {
    const l = db.prepare(`SELECT * FROM lives WHERE id = ?`).get(params.id);
    if (!l || l.status !== 'ao_vivo') fail(404, 'Essa live já terminou.');
    if (l.host_id === user.id) fail(400, 'Você não pode presentear a sua própria live.');
    exigirParceiroDeTeste(db, l.host_id);
    // Live é livre para todos; receber presente (dinheiro) é trabalho: só criador de conteúdo ou artista
    // com o perfil de trabalho com CNPJ.
    const host = db.prepare('SELECT * FROM users WHERE id = ?').get(l.host_id);
    if (!temAlgum(db, host, ['criador', 'artista'], JSON.parse((host && host.roles) || '[]'), cfg)) {
      fail(403, 'Esta pessoa ainda não recebe presentes: para receber, ela precisa do perfil de trabalho de criador de conteúdo com CNPJ.', 'host_sem_cnpj');
    }
    const unit = LIVE_GIFTS[body.gift];
    if (!unit) fail(400, 'Presente inválido.');
    const qty = int(body.qty ?? 1, 'quantidade', { min: 1, max: 100 });
    const value = unit * qty;
    const fee = wallet.giftFee(value);
    const id = newId('lg');
    tx(db, () => {
      // Igual ao app: quem envia paga só o valor; os 10% do Realyz saem do presente.
      wallet.move(user.id, 'saldo', -value, 'Presentes', `Live de ${l.host_name}: ${body.gift}${qty > 1 ? ` x${qty}` : ''}`, id);
      wallet.move(l.host_id, 'live', value - fee, 'Lives', `${user.name} enviou ${body.gift}${qty > 1 ? ` x${qty}` : ''} na live "${l.title}"`, id);
      if (fee) wallet.move('realys', 'saldo', fee, 'Taxa de presente', `Taxa do presente de live ${id}`, id);
      if (fee) fiscal.registrar({ origem: 'taxa_live', ref: id, tomadorId: user.id, valorCents: fee });
      db.prepare('INSERT INTO live_gifts (id, live_id, from_id, host_id, gift, qty, value, fee, created_at) VALUES (?,?,?,?,?,?,?,?,?)').run(id, l.id, user.id, l.host_id, body.gift, qty, value, fee, now());
      db.prepare('UPDATE lives SET gifts_total = gifts_total + ? WHERE id = ?').run(value, l.id);
    });
    hub.send(l.host_id, 'live_gift', { liveId: l.id, from: user.name, gift: body.gift, qty, value: toReais(value) });
    return { id, value: toReais(value), fee: toReais(fee), total: toReais(value), net: toReais(value - fee), wallet: { balance: toReais(wallet.get(user.id).balance) } };
  }, { status: 201 });

  // Últimos presentes de uma live (para mostrar nos comentários).
  r.get('/lives/:id/gifts', ({ params }) =>
    db.prepare('SELECT g.gift, g.qty, g.value, g.created_at AS at, u.name AS "from" FROM live_gifts g JOIN users u ON u.id = g.from_id WHERE g.live_id = ? ORDER BY g.created_at DESC LIMIT 30').all(params.id).map((g) => ({ ...g, value: toReais(g.value) }))
  );
}
