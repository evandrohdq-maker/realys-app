// Monta o servidor: banco, rotas, autenticação, WebSocket.
import credentialRoutes from './routes/credentials.js';
import segurancaRoutes from './routes/seguranca.js';
import documentosRoutes from './routes/documentos.js';
import fiscalRoutes from './routes/fiscal.js';
import conviteRoutes from './routes/convites.js';
import { makeFiscal } from './fiscal/index.js';
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
import profissoesRoutes from './routes/profissoes.js';
import turbinarRoutes from './routes/turbinar.js';
import servicesRoutes from './routes/services.js';
import eventosRoutes from './routes/eventos.js';
import musicasRoutes from './routes/musicas.js';
import livesRoutes from './routes/lives.js';
import mediaRoutes from './routes/media.js';
import adminRoutes from './routes/admin.js';
import { exigirBiometria, exigirPrazoBiometria } from './bioGate.js';
import { exigirComprasLiberadas, MSG_COMPRAS_BLOQUEADAS } from './comprasGate.js';
import { protegerDinheiroDeTeste, rodarComoTeste } from './teste.js';
import biometriaRoutes from './routes/biometria.js';
import videoRoutes from './routes/video.js';
import { makeCipher, parseKeys } from './crypto.js';
import { makeMatcher } from './biometria/matcher.js';
import { makeBiometria } from './biometria/service.js';
import { makeMaintenance } from './maintenance.js';
import { makeMeiValores } from './meiValores.js';
import { makePix } from './pagamentos/pix.js';
import { makeIA } from './ia/index.js';
import { makeAtendente } from './ia/atendente.js';
import iaRoutes from './routes/ia.js';
import planosRoutes from './routes/planos.js';
import { makePlanos } from './planos.js';
import { makeProtecao } from './protecao.js';
import { makeInteligencia } from './inteligencia.js';
import noticiasRoutes from './routes/noticias.js';
import showsRoutes from './routes/shows.js';
import empregosRoutes from './routes/empregos.js';
import logisticaRoutes from './routes/logistica.js';
import pushRoutes from './routes/push.js';
import baixarRoutes from './routes/baixar.js';
import trabalhoRoutes, { trabalhoAdminRoutes } from './routes/trabalho.js';
import contasTesteRoutes from './contasTeste.js';
import { makePush } from './push.js';

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
    teste: !!u.teste, // conta de teste (selo "Teste" no perfil)
  };
  if (self) Object.assign(out, { socialTitular: !!u.social_titular, email: u.email, emailOk: !!u.email_ok, duasEtapas: !!u.totp_on, titularNome: u.titular_nome || null, phone: u.phone, doc: u.doc, status: u.status, createdAt: u.created_at });
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
  const fiscal = makeFiscal({ db, cfg, hub, clients: cfg.fiscalClients || {} });
  // Pix de verdade dos depósitos (Santander). Sem credenciais no .env, fica desligado.
  const pix = cfg.pix || makePix(cfg);
  // Notificações com o app fechado (Firebase). Sem a chave no .env, ficam desligadas.
  const push = makePush({ db, cfg });
  hub.offline = push.aviso;
  // Contas de teste: dinheiro fictício nunca chega a conta real, ao caixa nem às notas (src/teste.js).
  protegerDinheiroDeTeste(db, wallet, fiscal);
  const deps = { db, cfg, wallet, hub, userById, publicUser, cipher, matcher, biometria, fiscal, pix, push };
  // IA do Realyz (atendente das empresas e copiloto de vendas).
  deps.ia = cfg.ia || makeIA(cfg);
  deps.planos = makePlanos(db);
  deps.protecao = makeProtecao(deps);
  deps.inteligencia = makeInteligencia(deps);
  deps.atendente = makeAtendente(deps);
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
  [authRoutes, walletRoutes, commerceRoutes, socialRoutes, servicesRoutes, livesRoutes, mediaRoutes, adminRoutes, biometriaRoutes, videoRoutes, credentialRoutes, segurancaRoutes, documentosRoutes, fiscalRoutes, conviteRoutes, eventosRoutes, musicasRoutes, iaRoutes, noticiasRoutes, showsRoutes, pushRoutes, empregosRoutes, logisticaRoutes, profissoesRoutes, turbinarRoutes, contasTesteRoutes, baixarRoutes, trabalhoRoutes, trabalhoAdminRoutes, planosRoutes].forEach((r) => r(router, deps));
  router.get('/health', () => ({ ok: true, name: 'Realyz', time: now() }), { auth: false });
  // O que está ligado agora (o app pergunta ao abrir e mostra o aviso de compras bloqueadas).
  router.get('/status', () => ({
    compras: cfg.comprasLiberadas ? 'liberadas' : 'bloqueadas',
    comprasAviso: cfg.comprasLiberadas ? null : MSG_COMPRAS_BLOQUEADAS,
    pix: pix && pix.ready ? 'pronto' : 'aguardando_conta',
  }), { auth: false });

  // Administrador inicial (ADMIN_PASSWORD no .env).
  if (cfg.adminPassword && !db.prepare('SELECT 1 FROM users WHERE username = ?').get(cfg.adminUsername)) {
    const id = newId('u');
    db.prepare(`INSERT INTO users (id, kind, name, username, pass_hash, roles, created_at) VALUES (?, 'pessoa', 'Administrador', ?, ?, '["admin"]', ?)`).run(
      id, cfg.adminUsername, hashPassword(cfg.adminPassword), now()
    );
    wallet.ensure(id);
  }
  // Analista inicial (ANALISTA_USERNAME e ANALISTA_PASSWORD no .env): vê o painel, não muda nada.
  if (cfg.analistaPassword && cfg.analistaUsername && !db.prepare('SELECT 1 FROM users WHERE username = ?').get(cfg.analistaUsername)) {
    const id = newId('u');
    db.prepare(`INSERT INTO users (id, kind, name, username, pass_hash, roles, created_at) VALUES (?, 'pessoa', 'Analista', ?, ?, '["analista"]', ?)`).run(
      id, cfg.analistaUsername, hashPassword(cfg.analistaPassword), now()
    );
  }


  const maintenance = makeMaintenance({ db, cfg, cipher, biometria, matcher });
  // Valores do MEI (DAS e limite) atualizados sozinhos pelo salário mínimo oficial do Banco Central.
  const meiValores = makeMeiValores({ db });
  router.get('/mei/valores', () => meiValores.valores(), { auth: false });
  router.post('/admin/mei/atualizar', () => meiValores.atualizar(), { auth: 'admin' });
  router.put('/admin/mei/valores', ({ body }) => {
    const ok = {};
    const num = (v) => Number(v);
    if (body.salarioMinimo != null && num(body.salarioMinimo) >= 1000) ok.salarioMinimo = num(body.salarioMinimo);
    for (const k of ['inssPct', 'inssPctCaminhoneiro', 'icms', 'iss', 'toleranciaPct']) if (body[k] != null && num(body[k]) >= 0) ok[k] = num(body[k]);
    if (Array.isArray(body.limites)) ok.limites = body.limites.filter((l) => l && num(l.desde) > 2000 && num(l.valor) > 0).map((l) => ({ desde: num(l.desde), valor: num(l.valor) }));
    return meiValores.gravar({ ...ok, fonte: 'ajuste do administrador' });
  }, { auth: 'admin' });
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
        // Analista: vê todo o painel do administrador (só leitura: GET), sem aprovar, bloquear ou mudar nada.
        const analistaLendo = ctx.roles.includes('analista') && req.method === 'GET';
        if (route.opts.auth === 'admin' && !ctx.roles.includes('admin') && !analistaLendo) throw new HttpError(403, 'Só o administrador pode fazer isso.');
        // Compra, contratação e carteira: só com a biometria aprovada (src/bioGate.js).
        exigirBiometria(db, cfg, route, req.method, ctx.user, ctx.roles);
        exigirPrazoBiometria(db, cfg, route, req.method, ctx.user, ctx.roles);
        // Administrador: painel só com a verificação em duas etapas ligada (Google Authenticator).
        if (cfg.admin2fa && ctx.user && ((ctx.roles || []).includes('admin') || (ctx.roles || []).includes('analista')) && !ctx.user.totp_on && /^\/admin/.test(route.path)) {
          throw new HttpError(403, 'Ative a verificação em duas etapas (Google Authenticator) no seu Perfil para usar o painel do administrador.', 'ativar_2fa');
        }
        // Compras temporariamente bloqueadas (src/comprasGate.js).
        exigirComprasLiberadas(cfg, route, req.method, ctx.roles, ctx.user);
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

      const out = await rodarComoTeste(ctx.user, () => route.handler(ctx));
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
      fiscal.stop();
      server.close(() => {
        db.close();
        resolve();
      });
      server.closeAllConnections?.();
    });

  // Confere os depósitos Pix abertos a cada minuto (além de quando o app pergunta).
  let pixTimer = null;
  const startPix = () => {
    if (pix.ready && !pixTimer) pixTimer = setInterval(() => pix.conferirDepositos && pix.conferirDepositos().catch(() => {}), 60000);
  };
  return { server, db, hub, wallet, close: async () => { if (pixTimer) clearInterval(pixTimer); meiValores.stop(); return close(); }, maintenance, meiValores, biometria, fiscal, pix, startPix };
}
