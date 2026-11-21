// Atendente IA: a ficha da empresa (o que a IA sabe), as conversas que ela está atendendo,
// assumir/devolver a conversa e a sugestão de resposta para quem fecha a venda.
import { fail, now, str } from '../http.js';

export default function iaRoutes(r, { db, ia, atendente, userById, publicUser }) {
  const podeVender = (user) => user.kind === 'empresa' || !!db.prepare('SELECT 1 FROM providers WHERE user_id = ?').get(user.id);
  const fichaView = (f) => ({
    ligado: !!(f && f.ligado), horario: (f && f.horario) || '', entrega: (f && f.entrega) || '', pagamento: (f && f.pagamento) || '',
    politicas: (f && f.politicas) || '', sobre: (f && f.sobre) || '', tom: (f && f.tom) || '', faq: (f && f.faq) || [], iaNegocia: !!(f && f.ia_negocia),
    modelo: ia.ready ? 'modelo aberto no servidor' : 'IA leve (ficha e catálogo)',
  });

  r.get('/ia/ficha', ({ user }) => fichaView(atendente.ficha(user.id)));

  r.put('/ia/ficha', ({ user, body }) => {
    if (!podeVender(user)) fail(403, 'O atendente IA é para empresas e prestadores.');
    const faq = (Array.isArray(body.faq) ? body.faq : [])
      .map((x) => ({ q: String((x && x.q) || '').trim().slice(0, 200), a: String((x && x.a) || '').trim().slice(0, 600) }))
      .filter((x) => x.q && x.a)
      .slice(0, 30);
    const v = (k, max) => str(body[k], k, { optional: true, max }) || '';
    db.prepare(
      `INSERT INTO ia_fichas (owner_id, ligado, horario, entrega, pagamento, politicas, sobre, tom, faq, ia_negocia, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)
       ON CONFLICT(owner_id) DO UPDATE SET ligado = excluded.ligado, horario = excluded.horario, entrega = excluded.entrega, pagamento = excluded.pagamento,
       politicas = excluded.politicas, sobre = excluded.sobre, tom = excluded.tom, faq = excluded.faq, ia_negocia = excluded.ia_negocia, updated_at = excluded.updated_at`
    ).run(user.id, body.ligado ? 1 : 0, v('horario', 200), v('entrega', 400), v('pagamento', 300), v('politicas', 600), v('sobre', 600), v('tom', 120), JSON.stringify(faq), body.iaNegocia ? 1 : 0, now());
    return fichaView(atendente.ficha(user.id));
  });

  // Testar: a empresa manda uma pergunta e vê como a IA responderia (não envia para ninguém).
  r.post('/ia/testar', async ({ user, body }) => {
    const f = atendente.ficha(user.id) || { faq: [] };
    const { empresa, produtos } = atendente.catalogo(user.id);
    const texto = str(body.texto, 'a pergunta', { max: 500 });
    const r2 = await ia.responder({ texto, ficha: f, produtos, empresa, historico: [{ role: 'user', content: texto }], primeira: true });
    return { resposta: r2.texto, fonte: r2.fonte };
  });

  // Conversas atendidas pela IA (e as que foram passadas para a equipe).
  r.get('/ia/conversas', ({ user }) =>
    db.prepare('SELECT * FROM ia_conversas WHERE owner_id = ? ORDER BY updated_at DESC LIMIT 100').all(user.id).map((c) => ({
      cliente: publicUser(userById(c.client_id)), estado: c.estado, etapa: c.etapa, motivo: c.motivo, resumo: c.resumo, iaMsgs: c.ia_msgs, at: c.updated_at,
    }))
  );

  const muda = (user, clientId, estado) => {
    atendente.conversa(user.id, clientId);
    db.prepare('UPDATE ia_conversas SET estado = ?, motivo = ?, updated_at = ? WHERE owner_id = ? AND client_id = ?').run(estado, estado === 'humano' ? 'A equipe assumiu a conversa.' : null, now(), user.id, clientId);
    return { ok: true, estado };
  };
  r.post('/ia/conversas/:clientId/assumir', ({ user, params }) => muda(user, String(params.clientId), 'humano'));
  r.post('/ia/conversas/:clientId/devolver', ({ user, params }) => muda(user, String(params.clientId), 'ia'));

  // Copiloto do closer: sugere a próxima mensagem (a pessoa revisa e envia).
  r.post('/ia/sugestao', async ({ user, body }) => {
    const clientId = String(body.clientId || '');
    if (!userById(clientId)) fail(404, 'Cliente não encontrado.');
    const f = atendente.ficha(user.id) || { faq: [] };
    const { empresa, produtos } = atendente.catalogo(user.id);
    const c = db.prepare('SELECT resumo FROM ia_conversas WHERE owner_id = ? AND client_id = ?').get(user.id, clientId);
    const texto = await ia.sugerir({ ficha: f, produtos, empresa, historico: atendente.historico(user.id, clientId), resumo: c && c.resumo });
    return { sugestao: texto };
  });
}
