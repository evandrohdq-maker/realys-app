// Páginas dos usuários: uma conta verificada pode ter até 5 páginas (receitas, bairro, humor...).
// A página posta fotos e vídeos (com música), recebe e manda depoimentos, e o dono pode curtir e
// comentar "como página" ("Publicar como"). Página anônima nunca revela o dono para ninguém:
// nas respostas aparece só a página. O Realyz sabe quem é (owner_id) e só revela por ordem judicial.
import { fail, HttpError, newId, now } from './http.js';
import { tx } from './db.js';

// Mensalidade: a primeira página da conta é gratuita; da segunda em diante, R$ 14,90 por mês cada,
// do saldo Realyz (mesmo valor de src/taxas.js › paginaUsuario). Cobra na criação e a cada 30 dias.
export const PAGINA_CENTS = 1490;
const DIA = 86400000;
export const PAGINA_DIAS = 30;
const MSG_SEM_SALDO = 'A primeira página é gratuita. Da segunda em diante, cada página custa R$ 14,90 por mês, do seu saldo Realyz. Adicione saldo na carteira e tente de novo.';

export const MAX_PAGINAS = 5;

export function makePaginas(db) {
  const byId = (id) => (id ? db.prepare('SELECT * FROM paginas WHERE id = ? AND removed = 0').get(String(id)) : null);
  // Página do próprio usuário, para "Publicar como". Página de outra pessoa = recusado.
  const minha = (user, id) => {
    const pg = byId(id);
    if (!pg || pg.owner_id !== user.id) fail(403, 'Você só pode publicar como uma página sua.');
    return pg;
  };
  // "comoPagina" opcional no corpo do pedido: vazio = a própria pessoa.
  const como = (user, body) => (body && body.comoPagina ? minha(user, body.comoPagina) : null);
  const seguidores = (id) => db.prepare('SELECT COUNT(*) n FROM pagina_seguidores WHERE pagina_id = ?').get(id).n;
  const segue = (id, userId) => !!db.prepare('SELECT 1 FROM pagina_seguidores WHERE pagina_id = ? AND user_id = ?').get(id, userId);
  // Como a página aparece como autora (post, comentário, curtida, depoimento).
  const autor = (pg) => ({ id: pg.id, name: pg.name, username: pg.handle, photo: pg.photo || pg.cover || null, pagina: true });
  const view = (pg, viewer, { completa = false } = {}) => {
    const mine = !!viewer && pg.owner_id === viewer.id;
    let style = {};
    try {
      style = JSON.parse(pg.style || '{}');
    } catch (e) {}
    const dono = pg.anon ? null : db.prepare('SELECT id, name, username, photo FROM users WHERE id = ?').get(pg.owner_id);
    return {
      id: pg.id,
      name: pg.name,
      handle: pg.handle,
      about: pg.about,
      category: pg.category,
      cover: pg.cover,
      photo: pg.photo,
      style,
      anon: !!pg.anon,
      mine,
      // Assinada: mostra o dono verificado. Anônima: ninguém vê (nem o id).
      owner: dono ? { id: dono.id, name: dono.name, username: dono.username, photo: dono.photo } : null,
      seguidores: seguidores(pg.id),
      seguindo: viewer ? segue(pg.id, viewer.id) : false,
      // Só o dono vê a mensalidade da página.
      plano: mine ? (pg.paga ? { paga: true, valor: PAGINA_CENTS / 100, pagoAte: pg.pago_ate, status: pg.plano_status } : { paga: false }) : undefined,
      posts: completa ? undefined : db.prepare('SELECT COUNT(*) n FROM posts WHERE pagina_id = ? AND removed = 0').get(pg.id).n,
      createdAt: pg.created_at,
    };
  };
  // Páginas da pessoa (para o seletor "Publicar como").
  const daPessoa = (userId) => db.prepare('SELECT * FROM paginas WHERE owner_id = ? AND removed = 0 ORDER BY created_at').all(userId);
  return { byId, minha, como, seguidores, segue, autor, view, daPessoa };
}

// Cobrança das páginas pagas (2ª em diante): na criação, a cada vencimento e ao pagar um atraso.
export function makeCobrancaPaginas(db, wallet) {
  const cobrarUmMes = (pg, rotulo) => {
    const ref = newId('pp');
    try {
      wallet.pay(pg.owner_id, PAGINA_CENTS, 'Página', `${rotulo} da página ${pg.name}`, ref);
    } catch (e) {
      if (e instanceof HttpError && e.code === 'saldo_insuficiente') throw new HttpError(402, MSG_SEM_SALDO, 'saldo_insuficiente');
      throw e;
    }
    wallet.move('realys', 'saldo', PAGINA_CENTS, 'Página', `Mensalidade · página ${pg.name}`, ref);
  };
  // Página nova: a primeira da conta é grátis; as outras pagam o 1º mês na hora (tudo ou nada).
  const criar = (ownerId, inserir) =>
    tx(db, () => {
      const jaTem = db.prepare('SELECT COUNT(*) n FROM paginas WHERE owner_id = ? AND removed = 0').get(ownerId).n;
      const paga = jaTem >= 1;
      const id = inserir(paga ? { paga: 1, pago_ate: now() + PAGINA_DIAS * DIA } : { paga: 0, pago_ate: null });
      if (paga) cobrarUmMes(db.prepare('SELECT * FROM paginas WHERE id = ?').get(id), 'Mensalidade');
      return id;
    });
  // Venceu: cobra os meses atrasados, um de cada vez. Sem saldo: fica "atrasado" (não posta até pagar).
  const cobrarSeVenceu = (pg) => {
    let p = pg;
    let guarda = 0;
    while (p && p.paga && !p.removed && p.pago_ate <= now() && guarda++ < 12) {
      try {
        tx(db, () => {
          cobrarUmMes(p, 'Mensalidade');
          db.prepare(`UPDATE paginas SET pago_ate = pago_ate + ?, plano_status = 'ok' WHERE id = ?`).run(PAGINA_DIAS * DIA, p.id);
        });
      } catch (e) {
        db.prepare(`UPDATE paginas SET plano_status = 'atrasado' WHERE id = ?`).run(p.id);
        break;
      }
      p = db.prepare('SELECT * FROM paginas WHERE id = ?').get(p.id);
    }
    return db.prepare('SELECT * FROM paginas WHERE id = ?').get(pg.id);
  };
  // Postar exige a mensalidade em dia.
  const exigirEmDia = (pg) => {
    const p = cobrarSeVenceu(pg);
    if (p.paga && p.plano_status === 'atrasado') {
      throw new HttpError(402, `A mensalidade da página ${p.name} (R$ 14,90) venceu e não havia saldo. Adicione saldo e toque em "Pagar mensalidade" na página.`, 'pagina_atrasada');
    }
    return p;
  };
  // Apagou a página gratuita: a página paga mais antiga vira a gratuita (a conta sempre tem 1 grátis).
  const promoverGratis = (ownerId) => {
    const gratis = db.prepare('SELECT 1 FROM paginas WHERE owner_id = ? AND removed = 0 AND paga = 0').get(ownerId);
    if (gratis) return;
    const prox = db.prepare('SELECT id FROM paginas WHERE owner_id = ? AND removed = 0 AND paga = 1 ORDER BY created_at LIMIT 1').get(ownerId);
    if (prox) db.prepare(`UPDATE paginas SET paga = 0, pago_ate = NULL, plano_status = 'ok' WHERE id = ?`).run(prox.id);
  };
  // Varredura (a cada minuto, junto com os lembretes): cobra as páginas vencidas.
  const varrer = () => {
    for (const pg of db.prepare('SELECT * FROM paginas WHERE removed = 0 AND paga = 1 AND pago_ate <= ? AND plano_status = ? LIMIT 200').all(now(), 'ok')) cobrarSeVenceu(pg);
  };
  return { criar, cobrarSeVenceu, exigirEmDia, promoverGratis, varrer };
}
