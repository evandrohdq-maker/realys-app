// Monta o servidor: banco, rotas, autenticação, WebSocket.
import credentialRoutes from './routes/credentials.js';
import segurancaRoutes from './routes/seguranca.js';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { openDb } from './db.js';
import { Router, HttpError, readBody, sendJson, corsHeaders } from './http.js';
import { verifyToken, hashPassword } from './auth.js';
import { makeWallet } from './wallet.js';
import { Hub } from './ws.js';
import { newId, now } from './http.js';
import authRoutes from './routes/auth.js';
import walletRoutes from './routes/wallet.js';
import commerceRoutes from './routes/commerce.js';
import socialRoutes from './routes/social.js';
import servicesRoutes from './routes/services.js';
import livesRoutes from './routes/lives.js';
import mediaRoutes from './routes/media.js';
import adminRoutes from './routes/admin.js';
import biometriaRoutes from './routes/biometria.js';
import videoRoutes from './routes/video.js';
import { makeCipher, parseKeys } from './crypto.js';
import { makeMatcher } from './biometria/matcher.js';
import { makeBiometria } from './biometria/service.js';
import { makeMaintenance } from './maintenance.js';

// Dados públicos de uma pessoa (nunca devolve hash de senha nem documento completo).
export function publicUser(u, { self = false } = {}) {
  if (!u) return null;
  const out = {
    id: u.id,
    kind: u.kind,
    name: u.name,
    username: u.username,
    roles: JSON.parse(u.roles),
    socialClass: u.social_class,
    about: u.about,
    photo: u.photo,
    privacy: u.privacy,
  };
  if (self) Object.assign(out, { email: u.email, phone: u.phone, doc: u.doc, status: u.status, createdAt: u.created_at });
  return out;
}

export function createApp(cfg) {
  const db = openDb(cfg.dbFile || join(cfg.dataDir, 'realys.db'));
  const wallet = makeWallet(db, cfg);
  const hub = new Hub();
  const router = new Router();

  const userById = (id) => db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  const authUser = (token) => {
    const p = verifyToken(token, cfg.jwtSecret);
    if (!p) return null;
    const u = userById(p.sub);
    return u && u.status === 'ativo' ? u : null;
  };

  const cipher = makeCipher(parseKeys(cfg.biometricKeys));
  const matcher = cfg.matcher || makeMatcher(cfg);
  const biometria = makeBiometria({ db, cfg, matcher, cipher });
  const deps = { db, cfg, wallet, hub, userById, publicUser, cipher, matcher, biometria };
  // Tentativas de login por IP (proteção contra quem tenta adivinhar senha).
  const attempts = new Map();
  deps.limitLogin = (key) => {
    const t = now();
    const a = (attempts.get(key) || []).filter((x) => t - x < 15 * 60 * 1000);
    if (a.length >= 10) throw new HttpError(429, 'Muitas tentativas. Espere 15 minutos e tente de novo.');
    a.push(t);
    attempts.set(key, a);
  };
  deps.clearLogin = (key) => attempts.delete(key);
  [authRoutes, walletRoutes, commerceRoutes, socialRoutes, servicesRoutes, livesRoutes, mediaRoutes, adminRoutes, biometriaRoutes, videoRoutes, credentialRoutes, segurancaRoutes].forEach((r) => r(router, deps));
  router.get('/health', () => ({ ok: true, name: 'Realys', time: now() }), { auth: false });

  // Administrador inicial (ADMIN_PASSWORD no .env).
  if (cfg.adminPassword && !db.prepare('SELECT 1 FROM users WHERE username = ?').get(cfg.adminUsername)) {
    const id = newId('u');
    db.prepare(`INSERT INTO users (id, kind, name, username, pass_hash, roles, created_at) VALUES (?, 'pessoa', 'Administrador', ?, ?, '["admin"]', ?)`).run(
      id, cfg.adminUsername, hashPassword(cfg.adminPassword), now()
    );
    wallet.ensure(id);
  }


  const maintenance = makeMaintenance({ db, cfg, cipher, biometria, matcher });
  router.get('/admin/manutencao', () => maintenance.history(), { auth: 'admin' });
  router.post('/admin/manutencao/:job', ({ params }) => maintenance.run(params.job), { auth: 'admin' });

  const server = createServer(async (req, res) => {
    const cors = cfg.corsOrigin;
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, corsHeaders(cors));
        return res.end();
      }
      const url = new URL(req.url, 'http://x');
      const found = router.match(req.method, url.pathname);
      if (!found) throw new HttpError(404, 'Endereço não encontrado.');
      if (found.notAllowed) throw new HttpError(405, 'Método não permitido.');
      const { route, params } = found;
      const ctx = { req, res, params, query: Object.fromEntries(url.searchParams), ip: req.headers['x-forwarded-for']?.split(',')[0].trim() || req.socket.remoteAddress };

      if (route.opts.auth !== false) {
        const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
        ctx.user = authUser(token);
        if (!ctx.user) throw new HttpError(401, 'Sessão expirada. Entre de novo.', 'sem_sessao');
        ctx.roles = JSON.parse(ctx.user.roles);
        if (route.opts.auth === 'admin' && !ctx.roles.includes('admin')) throw new HttpError(403, 'Só o administrador pode fazer isso.');
      }
      if (route.opts.raw) ctx.raw = await readBody(req, cfg.maxUploadMb * 1024 * 1024);
      else if (req.method !== 'GET' && req.method !== 'DELETE') {
        const buf = await readBody(req, 1024 * 1024);
        try {
          ctx.body = buf.length ? JSON.parse(buf.toString()) : {};
        } catch (e) {
          throw new HttpError(400, 'Dados em formato inválido.');
        }
      } else ctx.body = {};

      const out = await route.handler(ctx);
      if (res.headersSent) return; // a rota já respondeu sozinha (ex.: arquivo de mídia)
      sendJson(res, route.opts.status || 200, out === undefined ? { ok: true } : out, cors);
    } catch (e) {
      if (res.headersSent) return res.end();
      if (e instanceof HttpError) return sendJson(res, e.status, { error: e.message, code: e.code }, cors);
      if (/UNIQUE constraint failed/.test(e.message)) return sendJson(res, 409, { error: 'Esse registro já existe.' }, cors);
      console.error(new Date().toISOString(), req.method, req.url, e);
      sendJson(res, 500, { error: 'Erro no servidor. Tente de novo em instantes.' }, cors);
    }
  });

  hub.attach(server, (token) => {
    const u = authUser(token);
    return u ? u.id : null;
  });

  const close = () =>
    new Promise((resolve) => {
      hub.closeAll();
      server.close(() => {
        db.close();
        resolve();
      });
      server.closeAllConnections?.();
    });

  return { server, db, hub, wallet, close, maintenance, biometria };
}
