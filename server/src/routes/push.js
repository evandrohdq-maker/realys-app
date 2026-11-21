// Aparelhos que recebem notificação push.
//   GET  /push/chave       → chave pública do Web Push (o site precisa dela para assinar)
//   POST /push/registrar   { kind: 'fcm' | 'web', token }
//   POST /push/remover     { token }   (ao sair da conta)
//   POST /push/teste       manda uma notificação de teste para os aparelhos da pessoa
import { HttpError } from '../http.js';

export default function pushRoutes(r, { push }) {
  const need = () => {
    if (!push) throw new HttpError(503, 'Notificações desligadas neste servidor.');
    return push;
  };
  r.get('/push/chave', () => ({ web: need().vapidPublic, android: need().fcmLigado }), { auth: false });
  r.post('/push/registrar', ({ body, user }) => {
    let token = body.token;
    if (body.kind === 'web' && typeof token === 'object') token = JSON.stringify(token);
    try {
      if (!need().register(user.id, body.kind, token)) throw new Error();
    } catch (e) {
      if (e instanceof HttpError) throw e;
      throw new HttpError(400, 'Aparelho inválido para notificações.');
    }
    return { ok: true };
  });
  r.post('/push/remover', ({ body }) => {
    need().unregister(typeof body.token === 'object' ? JSON.stringify(body.token) : body.token);
    return { ok: true };
  });
  r.post('/push/teste', ({ user }) => ({ aparelhos: need().send(user.id, { title: 'Realyz', body: 'As notificações estão funcionando ✅', canal: 'geral', tag: 'teste' }) }));
}
