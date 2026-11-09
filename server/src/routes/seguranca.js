// Central de segurança do Realys: tudo que hoje fica só no celular passa a chegar aqui, em tempo real.
//   - chave do motorista ("Lotus" + frase secreta), resposta de segurança (coação), Lotus Denúncia
//     ("estou em perigo" e denúncias) e Lotus Emergência;
//   - a central (administradores) recebe na hora pelo WebSocket, marca "atendido" ou "chamada falsa";
//   - chamada falsa = conta bloqueada, sessões encerradas e saldo retido;
//   - Polícia Inteligente: servidor público aprovado liga o plantão ("estou na ativa", com GPS) e o
//     mais próximo da vítima é avisado com a localização e o protocolo;
//   - casos para profissionais: só com carteira aprovada e "receber casos" ligado, sem o nome de quem pediu.
import { fail, newId, now } from '../http.js';
import { tx } from '../db.js';

const KINDS = ['chave', 'coacao', 'perigo', 'denuncia', 'emergencia'];
const URGENTE = ['chave', 'coacao', 'perigo', 'emergencia'];
// Quem recebe cada tipo de pedido no plantão (profissão da carteira aprovada).
const QUEM = {
  chave: ['policial', 'guarda'],
  coacao: ['policial', 'guarda'],
  perigo: ['policial', 'guarda'],
  emergencia: ['socorrista', 'bombeiro', 'medico', 'enfermeiro', 'defesacivil', 'agentesaude'],
  denuncia: ['policial', 'guarda', 'advogado', 'psicologo'],
};
const PLANTAO_VALE_MS = 30 * 60 * 1000; // posição do plantão vale 30 min sem atualizar
const protocolo = () => 'RLY-' + Date.now().toString(36).toUpperCase().slice(-6);
const num = (v) => (Number.isFinite(Number(v)) ? Number(v) : null);

export function distKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export default function segurancaRoutes(r, { db, hub }) {
  const admins = () => db.prepare(`SELECT id FROM users WHERE roles LIKE '%"admin"%' AND status = 'ativo'`).all().map((u) => u.id);
  const toCentral = (type, data) => admins().forEach((id) => hub.send(id, type, data));
  // Para profissionais: nunca o nome de quem pediu; localização exata só em urgência.
  const caso = (a) => ({
    id: a.id, kind: a.kind, tipo: a.tipo, protocolo: a.protocolo, status: a.status, createdAt: a.created_at,
    texto: a.kind === 'denuncia' ? a.texto : null,
    local: URGENTE.includes(a.kind) ? { lat: a.lat, lon: a.lon, endereco: a.endereco } : { endereco: a.endereco ? a.endereco.split(' · ').slice(1).join(' · ') || null : a.onde || null },
  });
  const central = (a, u) => ({ ...caso(a), quem: a.anon ? null : u && u.name, userId: a.anon ? null : a.user_id, what: a.what, onde: a.onde, texto: a.texto, local: { lat: a.lat, lon: a.lon, endereco: a.endereco }, avisado: a.avisado_id });

  // Profissional de plantão mais perto (carteira aprovada, plantão ligado e posição recente).
  function maisPerto(a) {
    if (a.lat == null || a.lon == null) return null;
    const ok = QUEM[a.kind] || [];
    const t = now() - PLANTAO_VALE_MS;
    const list = db.prepare(`SELECT p.* FROM plantao p JOIN credenciais c ON c.id = p.credencial_id WHERE c.status = 'aprovado' AND p.updated_at > ? AND p.user_id != ?`).all(t, a.user_id || '').filter((p) => ok.includes(p.prof));
    let best = null;
    for (const p of list) {
      const d = distKm(a, p);
      if (!best || d < best.d) best = { ...p, d };
    }
    return best;
  }
  function avisar(a) {
    const p = maisPerto(a);
    if (!p) return null;
    db.prepare('UPDATE alertas SET avisado_id = ?, updated_at = ? WHERE id = ?').run(p.user_id, now(), a.id);
    hub.send(p.user_id, 'caso-urgente', { ...caso(a), distanciaKm: Math.round(p.d * 10) / 10, aviso: 'Você é o profissional de plantão mais perto.' });
    return p;
  }

  // Celular manda o alerta (a localização pode vir depois, em /alertas/:id/local).
  r.post('/alertas', ({ body, user }) => {
    const kind = String(body.kind || '');
    if (!KINDS.includes(kind)) fail(400, 'Tipo de alerta inválido.');
    const t = now();
    const a = {
      id: newId('al'), user_id: user.id, kind, tipo: String(body.tipo || '').slice(0, 80) || null, texto: String(body.texto || '').slice(0, 2000) || null,
      onde: String(body.onde || '').slice(0, 200) || null, anon: body.anon ? 1 : 0, what: String(body.what || '').slice(0, 200) || null,
      protocolo: String(body.protocolo || '').slice(0, 20) || protocolo(), lat: num(body.lat), lon: num(body.lon), endereco: String(body.endereco || '').slice(0, 200) || null,
      status: 'aberto', created_at: t, updated_at: t,
    };
    db.prepare(`INSERT INTO alertas (id, user_id, kind, tipo, texto, onde, anon, what, protocolo, lat, lon, endereco, status, created_at, updated_at) VALUES (@id,@user_id,@kind,@tipo,@texto,@onde,@anon,@what,@protocolo,@lat,@lon,@endereco,@status,@created_at,@updated_at)`).run(a);
    toCentral('alerta', central(a, user));
    const p = URGENTE.includes(a.kind) ? avisar(a) : null;
    return { id: a.id, protocolo: a.protocolo, profissionalAvisado: !!p };
  }, { status: 201 });

  r.post('/alertas/:id/local', ({ params, body, user }) => {
    const a = db.prepare('SELECT * FROM alertas WHERE id = ?').get(params.id);
    if (!a || a.user_id !== user.id) fail(404, 'Alerta não encontrado.');
    db.prepare('UPDATE alertas SET lat = COALESCE(?, lat), lon = COALESCE(?, lon), endereco = COALESCE(?, endereco), updated_at = ? WHERE id = ?').run(num(body.lat), num(body.lon), body.endereco ? String(body.endereco).slice(0, 200) : null, now(), a.id);
    const b = db.prepare('SELECT * FROM alertas WHERE id = ?').get(a.id);
    toCentral('alerta-local', central(b, user));
    if (URGENTE.includes(b.kind) && !b.avisado_id) avisar(b);
    return { ok: true };
  });

  // ---------- Central (administradores) ----------
  const A = { auth: 'admin' };
  r.get('/admin/alertas', ({ query }) => ({
    items: db.prepare(`SELECT a.*, u.name AS user_name FROM alertas a LEFT JOIN users u ON u.id = a.user_id WHERE (? = 'todos' OR a.status IN ('aberto','em_acompanhamento')) ORDER BY a.created_at DESC LIMIT 200`).all(query && query.todos ? 'todos' : 'abertos').map((a) => central(a, { name: a.user_name })),
  }), A);
  r.post('/admin/alertas/:id/:acao', ({ params, body }) => {
    const a = db.prepare('SELECT * FROM alertas WHERE id = ?').get(params.id);
    if (!a) fail(404, 'Alerta não encontrado.');
    if (params.acao === 'atendido') {
      db.prepare(`UPDATE alertas SET status = 'atendido', updated_at = ? WHERE id = ?`).run(now(), a.id);
      return { id: a.id, status: 'atendido' };
    }
    if (params.acao !== 'falso') fail(404, 'Ação inválida.');
    // Chamada falsa confirmada pela polícia/segurança: bloqueia a conta e retém o saldo.
    tx(db, () => {
      db.prepare(`UPDATE alertas SET status = 'falso', updated_at = ? WHERE id = ?`).run(now(), a.id);
      if (a.user_id) {
        db.prepare(`UPDATE users SET status = 'bloqueado', bloqueio_motivo = ?, saldo_retido = 1 WHERE id = ?`).run(String(body.motivo || 'Chamada de emergência falsa').slice(0, 200), a.user_id);
        db.prepare('UPDATE sessions SET revoked = 1 WHERE user_id = ?').run(a.user_id);
      }
    });
    if (a.user_id) hub.send(a.user_id, 'conta-bloqueada', { motivo: 'Chamada de emergência falsa', protocolo: a.protocolo });
    return { id: a.id, status: 'falso', contaBloqueada: !!a.user_id };
  }, A);

  // ---------- Plantão (Polícia Inteligente e socorristas) ----------
  const credAprovada = (userId) =>
    db.prepare(`SELECT * FROM credenciais WHERE user_id = ? AND status = 'aprovado' AND (gov = 1 OR prof IN ('medico','enfermeiro')) ORDER BY updated_at DESC`).get(userId);
  r.post('/plantao', ({ body, user }) => {
    const c = credAprovada(user.id);
    if (!c) fail(403, 'Plantão só para servidor público ou profissional de saúde com a carteira aprovada.');
    if (!body.on) {
      db.prepare('DELETE FROM plantao WHERE user_id = ?').run(user.id);
      return { on: false };
    }
    const lat = num(body.lat), lon = num(body.lon);
    if (lat == null || lon == null) fail(400, 'Ligue o GPS para entrar de plantão.');
    db.prepare('INSERT INTO plantao (user_id, credencial_id, prof, lat, lon, updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET credencial_id = excluded.credencial_id, prof = excluded.prof, lat = excluded.lat, lon = excluded.lon, updated_at = excluded.updated_at').run(user.id, c.id, c.prof, lat, lon, now());
    return { on: true, prof: c.prof, valeMin: PLANTAO_VALE_MS / 60000 };
  });

  // ---------- Casos para profissionais ----------
  r.get('/casos', ({ user }) => {
    const cs = db.prepare(`SELECT * FROM credenciais WHERE user_id = ? AND status = 'aprovado' AND recebe_casos = 1`).all(user.id);
    if (!cs.length) return { items: [] };
    const kinds = [...new Set(cs.flatMap((c) => Object.keys(QUEM).filter((k) => QUEM[k].includes(c.prof))))];
    if (!kinds.length) return { items: [] };
    const rows = db.prepare(`SELECT * FROM alertas WHERE status IN ('aberto','em_acompanhamento') AND kind IN (${kinds.map(() => '?').join(',')}) AND (user_id IS NULL OR user_id != ?) ORDER BY created_at DESC LIMIT 50`).all(...kinds, user.id);
    const mine = new Set(db.prepare('SELECT alerta_id FROM casos_acomp WHERE user_id = ?').all(user.id).map((x) => x.alerta_id));
    return { items: rows.map((a) => ({ ...caso(a), acompanhando: mine.has(a.id) })) };
  });
  r.post('/casos/:id/acompanhar', ({ params, user }) => {
    const a = db.prepare('SELECT * FROM alertas WHERE id = ?').get(params.id);
    if (!a) fail(404, 'Caso não encontrado.');
    const c = db.prepare(`SELECT * FROM credenciais WHERE user_id = ? AND status = 'aprovado' AND recebe_casos = 1`).all(user.id).find((x) => (QUEM[a.kind] || []).includes(x.prof));
    if (!c) fail(403, 'Esse caso não é da sua área, ou a sua carteira não está aprovada.');
    db.prepare('INSERT OR IGNORE INTO casos_acomp (alerta_id, user_id, credencial_id, created_at) VALUES (?,?,?,?)').run(a.id, user.id, c.id, now());
    db.prepare(`UPDATE alertas SET status = 'em_acompanhamento', updated_at = ? WHERE id = ? AND status = 'aberto'`).run(now(), a.id);
    // Na central aparece quem acompanha; com sigilo, só a profissão.
    toCentral('alerta-acompanhado', { id: a.id, por: c.discreto ? `${c.prof} verificado (sigilo)` : `${c.prof} ${user.name}` });
    return { ok: true };
  });
}
