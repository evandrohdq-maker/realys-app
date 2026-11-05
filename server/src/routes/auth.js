// Cadastro, entrada e sessão.
//
// Entrar: um campo só (usuário, CPF ou CNPJ) + senha. O tipo de acesso vem da conta, não de uma escolha.
// Na primeira vez entra com senha; o app guarda a sessão do aparelho no cofre do celular, protegida
// pela biometria. Nas próximas vezes a biometria libera a sessão e o app troca por um token novo.
import { str, fail, newId, now } from '../http.js';
import {
  hashPassword, checkPassword, signToken, newSessionToken, sha256, onlyDigits, validCpf, validCnpj,
  cleanUsername, usernameProblem, passwordProblem, validEmail,
} from '../auth.js';
import { tx } from '../db.js';

export default function authRoutes(r, { db, cfg, wallet, publicUser, limitLogin, clearLogin }) {
  // Cria a sessão do aparelho e o token de acesso.
  const startSession = (user, device) => {
    const token = newSessionToken();
    const t = now();
    db.prepare('INSERT INTO sessions (id, user_id, token_hash, device, created_at, last_used_at, expires_at) VALUES (?,?,?,?,?,?,?)').run(
      newId('s'), user.id, sha256(token), String(device || 'celular').slice(0, 80), t, t, t + cfg.sessionDays * 86400000
    );
    return {
      user: publicUser(user, { self: true }),
      accessToken: signToken({ sub: user.id }, cfg.jwtSecret, cfg.accessTokenMinutes),
      sessionToken: token,
      expiresIn: cfg.accessTokenMinutes * 60,
    };
  };

  // Cadastro de usuário (CPF) ou empresa (CNPJ). Empresa já ganha a página da empresa.
  r.post('/auth/signup', ({ body }) => {
    const kind = body.kind === 'empresa' ? 'empresa' : 'pessoa';
    const name = str(body.name, kind === 'empresa' ? 'o nome da empresa' : 'seu nome', { min: 2, max: 80 });
    const doc = onlyDigits(body.doc);
    if (kind === 'empresa' ? !validCnpj(doc) : !validCpf(doc)) fail(400, kind === 'empresa' ? 'CNPJ inválido. Confira os números.' : 'CPF inválido. Confira os números.');
    const username = cleanUsername(body.username);
    const up = usernameProblem(username);
    if (up) fail(400, up);
    const email = String(body.email || '').trim().toLowerCase();
    if (!validEmail(email)) fail(400, 'E-mail inválido.');
    const pp = passwordProblem(body.password);
    if (pp) fail(400, pp);
    if (db.prepare('SELECT 1 FROM users WHERE doc = ?').get(doc)) fail(409, `Já existe uma conta com este ${kind === 'empresa' ? 'CNPJ' : 'CPF'}. Use "Entrar".`);
    if (db.prepare('SELECT 1 FROM users WHERE username = ?').get(username)) fail(409, 'Esse usuário já está em uso. Escolha outro.');
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) fail(409, 'Já existe uma conta com este e-mail.');

    const id = newId('u');
    const roles = kind === 'empresa' ? ['empresa', 'fornecedor', 'usuario'] : ['usuario'];
    const user = tx(db, () => {
      db.prepare(
        `INSERT INTO users (id, kind, name, username, doc, email, phone, pass_hash, roles, social_class, about, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(id, kind, name, username, doc, email, onlyDigits(body.phone).slice(0, 13), hashPassword(body.password), JSON.stringify(roles), body.socialClass ? String(body.socialClass).slice(0, 40) : null, String(body.about || '').slice(0, 300), now());
      wallet.ensure(id);
      if (kind === 'empresa') {
        db.prepare('INSERT INTO companies (id, owner_id, name, cnpj, segment, created_at) VALUES (?,?,?,?,?,?)').run(newId('e'), id, name, doc, String(body.segment || '').slice(0, 60), now());
      }
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    });
    return startSession(user, body.device);
  }, { auth: false, status: 201 });

  // Entrar com usuário, CPF ou CNPJ + senha.
  r.post('/auth/login', ({ body, ip }) => {
    const login = str(body.login, 'usuário, CPF ou CNPJ', { max: 40 });
    const key = `${ip}|${login.toLowerCase()}`;
    limitLogin(key);
    const d = onlyDigits(login);
    const numeric = /^[\d.\-\/\s]+$/.test(login);
    const user = numeric && (d.length === 11 || d.length === 14)
      ? db.prepare('SELECT * FROM users WHERE doc = ?').get(d)
      : db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername(login));
    if (!user || !checkPassword(String(body.password || ''), user.pass_hash)) fail(401, 'Usuário ou senha incorretos.');
    if (user.status !== 'ativo') fail(403, 'Esta conta está bloqueada. Fale com o suporte do Realys.');
    clearLogin(key);
    return startSession(user, body.device);
  }, { auth: false });

  // Troca a sessão do aparelho (liberada pela biometria) por um token de acesso novo.
  r.post('/auth/refresh', ({ body }) => {
    const s = db.prepare('SELECT * FROM sessions WHERE token_hash = ?').get(sha256(String(body.sessionToken || '')));
    if (!s || s.revoked || s.expires_at < now()) fail(401, 'Sessão expirada. Entre com usuário e senha.', 'sem_sessao');
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(s.user_id);
    if (!user || user.status !== 'ativo') fail(403, 'Esta conta está bloqueada.');
    // Cada uso renova a validade: quem usa o app não precisa entrar de novo.
    db.prepare('UPDATE sessions SET last_used_at = ?, expires_at = ? WHERE id = ?').run(now(), now() + cfg.sessionDays * 86400000, s.id);
    return { user: publicUser(user, { self: true }), accessToken: signToken({ sub: user.id }, cfg.jwtSecret, cfg.accessTokenMinutes), expiresIn: cfg.accessTokenMinutes * 60 };
  }, { auth: false });

  // Sair deste aparelho ("trocar usuário").
  r.post('/auth/logout', ({ body, user }) => {
    db.prepare('UPDATE sessions SET revoked = 1 WHERE token_hash = ? AND user_id = ?').run(sha256(String(body.sessionToken || '')), user.id);
  });

  // Aparelhos conectados e sair de todos.
  r.get('/auth/sessions', ({ user }) => db.prepare('SELECT id, device, created_at AS createdAt, last_used_at AS lastUsedAt FROM sessions WHERE user_id = ? AND revoked = 0 AND expires_at > ? ORDER BY last_used_at DESC').all(user.id, now()));
  r.post('/auth/logout-all', ({ user }) => {
    db.prepare('UPDATE sessions SET revoked = 1 WHERE user_id = ?').run(user.id);
  });

  r.post('/auth/password', ({ body, user }) => {
    if (!checkPassword(String(body.current || ''), user.pass_hash)) fail(401, 'Senha atual incorreta.');
    const pp = passwordProblem(body.password);
    if (pp) fail(400, pp);
    db.prepare('UPDATE users SET pass_hash = ? WHERE id = ?').run(hashPassword(body.password), user.id);
  });

  // Eu: dados da conta, carteira e empresa (se tiver).
  r.get('/me', ({ user }) => ({
    user: publicUser(user, { self: true }),
    company: db.prepare('SELECT * FROM companies WHERE owner_id = ?').get(user.id) || null,
    provider: db.prepare('SELECT * FROM providers WHERE user_id = ?').get(user.id) || null,
  }));

  r.patch('/me', ({ body, user }) => {
    const fields = {};
    if (body.name !== undefined) fields.name = str(body.name, 'o nome', { min: 2, max: 80 });
    if (body.about !== undefined) fields.about = str(body.about, 'a descrição', { optional: true, max: 300 });
    if (body.photo !== undefined) fields.photo = str(body.photo, 'a foto', { optional: true, max: 300 }) || null;
    if (body.socialClass !== undefined) fields.social_class = str(body.socialClass, 'a classe', { optional: true, max: 40 }) || null;
    if (body.privacy !== undefined) {
      if (!['todos', 'amigos', 'ninguem'].includes(body.privacy)) fail(400, 'Privacidade inválida.');
      fields.privacy = body.privacy;
    }
    if (body.phone !== undefined) fields.phone = onlyDigits(body.phone).slice(0, 13);
    const keys = Object.keys(fields);
    if (keys.length) db.prepare(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), user.id);
    return { user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(user.id), { self: true }) };
  });
}
