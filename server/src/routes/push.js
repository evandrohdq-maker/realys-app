// Código do aparelho para as notificações com o app fechado (src/push.js).
// O mesmo celular trocou de conta: o código passa para a conta nova.
import { fail, now, str, oneOf } from '../http.js';

export default function pushRoutes(r, { db, push }) {
  r.post('/push/token', ({ body, user }) => {
    const token = str(body.token, 'o código do aparelho', { min: 20, max: 4096 });
    const platform = oneOf(body.platform || 'android', 'a plataforma', ['android', 'ios', 'web']);
    db.prepare(
      'INSERT INTO push_tokens (token, user_id, platform, created_at, updated_at) VALUES (?,?,?,?,?) ON CONFLICT(token) DO UPDATE SET user_id = excluded.user_id, platform = excluded.platform, updated_at = excluded.updated_at'
    ).run(token, user.id, platform, now(), now());
    return { ok: true, ligado: push.ligado };
  }, { status: 201 });
  // Saiu da conta (DELETE não leva corpo neste servidor, por isso é POST).
  r.post('/push/token/sair', ({ body, user }) => {
    if (!body || !body.token) fail(400, 'Informe o código do aparelho.');
    db.prepare('DELETE FROM push_tokens WHERE token = ? AND user_id = ?').run(String(body.token), user.id);
    return { ok: true };
  });
}
