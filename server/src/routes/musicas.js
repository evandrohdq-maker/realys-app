// Músicas de verdade: o artista publica a faixa com o valor que quer receber; o cliente compra pelo
// app e paga esse valor + R$ 0,99 fixos do Realyz por download. O artista recebe 100% do valor dele.
// Ouvir na Galeria é livre (com propaganda no app); o download fica do cliente para sempre.
import { exigirParceiroDeTeste } from '../teste.js';
import { fail, newId, now, str, money, toReais } from '../http.js';
import { tx } from '../db.js';

export default function musicasRoutes(r, { db, cfg, wallet, hub, fiscal }) {
  const FEE = () => Math.round((cfg.musicFee ?? 0.99) * 100);
  const view = (t) => ({
    id: t.id, artistId: t.artist_id, artist: t.artist_name, title: t.title, genre: t.genre, url: t.url, cover: t.cover,
    artistValue: toReais(t.price), price: toReais(t.price + FEE()), plays: t.plays, sales: t.sales, createdAt: t.created_at,
  });
  const SQL = 'SELECT t.*, u.name AS artist_name FROM tracks t JOIN users u ON u.id = t.artist_id';

  r.post('/tracks', ({ user, body }) => {
    const url = str(body.url, 'o áudio', { max: 400 });
    if (!/^(\/media\/|https:\/\/)/.test(url)) fail(400, 'O áudio precisa ser um arquivo enviado pelo app ou um link https.');
    const id = newId('mu');
    db.prepare('INSERT INTO tracks (id, artist_id, title, genre, price, url, cover, plays, sales, active, created_at) VALUES (?,?,?,?,?,?,?,0,0,1,?)').run(
      id, user.id, str(body.title, 'o nome da música', { min: 1, max: 90 }), str(body.genre, 'o gênero', { optional: true, max: 30 }) || 'Outros',
      money(body.artistValue ?? body.price, 'valor da música', { min: cfg.musicArtistMin ?? 0.5, max: 500 }), url, str(body.cover, 'a capa', { optional: true, max: 400 }) || null, now()
    );
    return view(db.prepare(`${SQL} WHERE t.id = ?`).get(id));
  }, { status: 201 });

  r.get('/tracks', ({ query }) => {
    const g = query.genre ? String(query.genre) : null;
    return db.prepare(`${SQL} WHERE t.active = 1 ${g ? 'AND t.genre = ?' : ''} ORDER BY t.created_at DESC LIMIT 200`).all(...(g ? [g] : [])).map(view);
  }, { auth: false });

  r.delete('/tracks/:id', ({ user, params }) => {
    const t = db.prepare('SELECT * FROM tracks WHERE id = ? AND artist_id = ?').get(params.id, user.id);
    if (!t) fail(404, 'Música não encontrada entre as suas.');
    db.prepare('UPDATE tracks SET active = 0 WHERE id = ?').run(t.id); // quem comprou continua com ela
    return { ok: true };
  });

  r.post('/tracks/:id/play', ({ params }) => {
    db.prepare('UPDATE tracks SET plays = plays + 1 WHERE id = ? AND active = 1').run(params.id);
    return { ok: true };
  }, { auth: false });

  // Comprar (o carrinho de músicas). Nada é comprado com um clique só: o app manda só o que o cliente confirmou.
  r.post('/tracks/comprar', ({ user, body }) => {
    const ids = [...new Set((Array.isArray(body.ids) ? body.ids : []).map(String))].slice(0, 50);
    if (!ids.length) fail(400, 'Nenhuma música no carrinho.');
    return tx(db, () => {
      const out = [];
      let total = 0;
      for (const id of ids) {
        const t = db.prepare(`${SQL} WHERE t.id = ?`).get(id);
        if (!t || !t.active) fail(404, 'Uma das músicas não está mais à venda.');
        if (t.artist_id === user.id) fail(400, 'Você não precisa comprar a sua própria música.');
        exigirParceiroDeTeste(db, t.artist_id);
        if (db.prepare('SELECT 1 FROM track_sales WHERE track_id = ? AND buyer_id = ?').get(id, user.id)) continue; // já é sua
        const fee = FEE();
        const ref = newId('ms');
        wallet.pay(user.id, t.price + fee, 'Músicas', `${t.title} · ${t.artist_name}`, ref);
        wallet.move(t.artist_id, 'saldo', t.price, 'Músicas', `Venda de "${t.title}" para ${user.name}`, ref);
        wallet.move('realys', 'saldo', fee, 'Taxa de música', `Download de "${t.title}"`, ref);
        fiscal.registrar({ origem: 'taxa_musica', ref, tomadorId: user.id, valorCents: fee });
        db.prepare('INSERT INTO track_sales (id, track_id, buyer_id, price, fee, created_at) VALUES (?,?,?,?,?,?)').run(ref, id, user.id, t.price, fee, now());
        db.prepare('UPDATE tracks SET sales = sales + 1 WHERE id = ?').run(id);
        hub.send(t.artist_id, 'music_sale', { title: t.title, buyer: user.name, value: toReais(t.price) });
        total += t.price + fee;
        out.push(id);
      }
      return { bought: out, total: toReais(total), wallet: { balance: toReais(wallet.get(user.id).balance), giftCredits: toReais(wallet.get(user.id).gift_credits) } };
    });
  });

  r.get('/tracks/minhas', ({ user }) => db.prepare('SELECT track_id FROM track_sales WHERE buyer_id = ?').all(user.id).map((x) => x.track_id));

  // Área do artista: minhas músicas e o que já vendi.
  r.get('/tracks/artista', ({ user }) => {
    const tracks = db.prepare(`${SQL} WHERE t.artist_id = ? ORDER BY t.created_at DESC`).all(user.id).map(view);
    const s = db.prepare('SELECT COUNT(*) AS n, COALESCE(SUM(s.price),0) AS v FROM track_sales s JOIN tracks t ON t.id = s.track_id WHERE t.artist_id = ?').get(user.id);
    return { tracks, sales: s.n, earned: toReais(s.v) };
  });
}
