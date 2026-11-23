// Cadastro, entrada e sessão.
//
// Entrar: um campo só (usuário, CPF ou CNPJ) + senha. O tipo de acesso vem da conta, não de uma escolha.
// Na primeira vez entra com senha; o app guarda a sessão do aparelho no cofre do celular, protegida
// pela biometria. Nas próximas vezes a biometria libera a sessão e o app troca por um token novo.
import { podeComprar, prazoBioVencido } from '../bioGate.js';
import { randomInt } from 'node:crypto';
import { makeMail } from '../mail.js';
import { novoSegredo, confere, linkAuthenticator } from '../totp.js';
import { str, fail, newId, now } from '../http.js';
import { TERMO_ADESAO_VERSAO, TERMO_ADESAO, TERMO_EMPRESA } from '../termos.js';
import {
  hashPassword, checkPassword, signToken, newSessionToken, sha256, onlyDigits, validCpf, validCnpj,
  cleanUsername, usernameProblem, passwordProblem, validEmail,
} from '../auth.js';
import { tx } from '../db.js';

// Data de nascimento: aceita DD/MM/AAAA ou AAAA-MM-DD. Devolve AAAA-MM-DD ou null.
export function parseNascimento(v) {
  const t = String(v || '').trim();
  const m = t.match(/^(\d{2})\/(\d{2})\/(\d{4})$/) || t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [y, mo, d] = t.includes('/') ? [m[3], m[2], m[1]] : [m[1], m[2], m[3]];
  const date = new Date(`${y}-${mo}-${d}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== `${y}-${mo}-${d}`) return null;
  if (date.getTime() > Date.now()) return null;
  return `${y}-${mo}-${d}`;
}
// Idade em anos completos, na data de hoje.
export function idadeEm(iso, hoje = new Date()) {
  const [y, mo, d] = iso.split('-').map(Number);
  let idade = hoje.getUTCFullYear() - y;
  if (hoje.getUTCMonth() + 1 < mo || (hoje.getUTCMonth() + 1 === mo && hoje.getUTCDate() < d)) idade--;
  return idade;
}


export default function authRoutes(r, { db, cfg, wallet, publicUser, limitLogin, clearLogin, biometria, push, hub, cipher }) {
  // Segredo do Authenticator lacrado com a chave do servidor (sem chave, nos testes, fica como está).
  const lacrar = (seg) => (cipher && cipher.hasKey ? cipher.seal(Buffer.from(seg)) : 'plain:' + seg);
  const abrir = (x) => (!x ? null : x.startsWith('plain:') ? x.slice(6) : cipher.open(x).toString());
  const mailer = cfg.mail || makeMail(cfg);
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
    if (body.aceiteTermos !== TERMO_ADESAO_VERSAO) fail(400, 'Leia e aceite o termo de adesão para criar sua conta.', 'termos');
    const kind = body.kind === 'empresa' ? 'empresa' : 'pessoa';
    // Nascimento: pessoa física informa; o Realyz não aceita menor de 18 anos.
    const nascimento = parseNascimento(body.nascimento ?? body.birth);
    if (body.nascimento || body.birth) {
      if (!nascimento) fail(400, 'Data de nascimento inválida. Use dia/mês/ano.', 'nascimento');
      if (idadeEm(nascimento) < 18) fail(400, 'O Realyz não aceita cadastro de menores de 18 anos.', 'maioridade');
    }
    if (kind === 'pessoa' && !nascimento) fail(400, 'Informe sua data de nascimento (dia/mês/ano).', 'nascimento');
    const maiorDeIdade = nascimento && idadeEm(nascimento) >= 18 ? 1 : 0;
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
        `INSERT INTO users (id, kind, name, username, doc, email, phone, pass_hash, roles, social_class, about, nascimento, maior_idade, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
      ).run(id, kind, name, username, doc, email, onlyDigits(body.phone).slice(0, 13), hashPassword(body.password), JSON.stringify(roles), body.socialClass ? String(body.socialClass).slice(0, 40) : null, String(body.about || '').slice(0, 300), nascimento, maiorDeIdade, now());
      db.prepare('UPDATE users SET termos_versao = ?, termos_aceite_at = ? WHERE id = ?').run(TERMO_ADESAO_VERSAO, now(), id);
      wallet.ensure(id);
      if (kind === 'empresa') {
        db.prepare('INSERT INTO companies (id, owner_id, name, cnpj, segment, created_at) VALUES (?,?,?,?,?,?)').run(newId('e'), id, name, doc, String(body.segment || '').slice(0, 60), now());
      }
      return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    });
    db.prepare('UPDATE users SET prazo_bio = ? WHERE id = ?').run(now() + 7 * 86400000, user.id); // 7 dias sem biometria
    enviarCodigoEmail(user).catch(() => {}); // confirmação do e-mail (não trava o cadastro)
    return startSession(user, body.device);
  }, { auth: false, status: 201 });

  r.get('/termos/adesao', () => TERMO_ADESAO, { auth: false });
  r.get('/termos/empresa', () => TERMO_EMPRESA, { auth: false });

  // Termo mudou: quem já tem conta vê se precisa aceitar a nova versão e registra o aceite.
  r.get('/termos/adesao/meu', ({ user }) => {
    const u = db.prepare('SELECT termos_versao, termos_aceite_at FROM users WHERE id = ?').get(user.id) || {};
    return { versaoAtual: TERMO_ADESAO_VERSAO, versaoAceita: u.termos_versao || null, aceiteEm: u.termos_aceite_at || null, precisaAceitar: u.termos_versao !== TERMO_ADESAO_VERSAO };
  });
  r.post('/termos/adesao/aceite', ({ body, user }) => {
    if (body.versao !== TERMO_ADESAO_VERSAO) fail(400, 'Essa não é a versão atual do termo. Abra o termo de novo.', 'termos');
    const at = now();
    db.prepare('UPDATE users SET termos_versao = ?, termos_aceite_at = ? WHERE id = ?').run(TERMO_ADESAO_VERSAO, at, user.id);
    return { versaoAceita: TERMO_ADESAO_VERSAO, aceiteEm: at };
  });

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
    if (user.status !== 'ativo') fail(403, 'Esta conta está bloqueada. Fale com o suporte do Realyz.');
    // Aparelho novo, com biometria cadastrada: primeiro a conferência do rosto (sem refazer o cadastro).
    const deviceKey = String(body.deviceKey || '').slice(0, 80);
    if (biometria.hasBiometria(user.id)) {
      const conhecido = deviceKey && db.prepare('SELECT 1 FROM devices WHERE user_id = ? AND device_key = ?').get(user.id, deviceKey);
      if (!conhecido) {
        if (!biometria.consumeDeviceToken(user.id, deviceKey, body.aparelhoToken)) fail(403, 'Este aparelho é novo. Confirme seu rosto para entrar.', 'biometria_aparelho');
      }
      if (deviceKey) {
        if (conhecido) db.prepare('UPDATE devices SET last_seen_at = ? WHERE user_id = ? AND device_key = ?').run(now(), user.id, deviceKey);
        else db.prepare('INSERT INTO devices (id, user_id, device_key, name, created_at, last_seen_at) VALUES (?,?,?,?,?,?)').run(newId('dv'), user.id, deviceKey, String(body.device || '').slice(0, 80), now(), now());
      }
    }
    // Verificação em duas etapas ligada: além da senha (e do rosto em aparelho novo), o código do Authenticator.
    if (user.totp_on) {
      if (!body.codigo2fa) fail(401, 'Digite o código do Google Authenticator.', 'codigo_2fa');
      if (!confere(abrir(user.totp_segredo), body.codigo2fa)) fail(401, 'Código do Authenticator errado. Confira o horário do celular e tente de novo.', 'codigo_2fa');
    }
    clearLogin(key);
    return startSession(user, body.device);
  }, { auth: false });

  // Aparelho novo: o rosto é conferido contra o cadastro já feito (não refaz o cadastro).
  // Depois, o login recebe o código devolvido aqui (aparelhoToken) junto com usuário e senha.
  r.post('/auth/aparelho/verificar', ({ raw, query, ip }) => {
    const login = String(query.login || '').slice(0, 40);
    const key = `${ip}|rosto|${login.toLowerCase()}`;
    limitLogin(key);
    const d = onlyDigits(login);
    const u = /^[\d.\-\/\s]+$/.test(login) && (d.length === 11 || d.length === 14)
      ? db.prepare('SELECT * FROM users WHERE doc = ?').get(d)
      : db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername(login));
    const out = biometria.verifyDevice(login, raw, String(query.deviceKey || '').slice(0, 80), () => u);
    // Rosto conferido: libera de novo compras e serviços depois de uma troca de senha.
    if (u && out && out.aparelhoToken) db.prepare('UPDATE users SET rosto_pendente = 0 WHERE id = ?').run(u.id);
    clearLogin(key);
    return out;
  }, { auth: false, raw: true });

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

  // ── Verificação em duas etapas (Google Authenticator) ──
  // 1) /me/2fa/iniciar: cria um segredo novo e devolve o link otpauth:// (abre o Authenticator) e o código
  //    para digitar à mão. 2) /me/2fa/ativar: com o primeiro código certo, liga. 3) /me/2fa/desativar:
  //    pede um código atual. Obrigatório para administrador, recomendado para empresas, opcional para usuários.
  r.post('/me/2fa/iniciar', ({ user }) => {
    const seg = novoSegredo();
    db.prepare('UPDATE users SET totp_novo = ? WHERE id = ?').run(lacrar(seg), user.id);
    return { segredo: seg, link: linkAuthenticator(seg, user.username || user.name) };
  });
  r.post('/me/2fa/ativar', ({ body, user, ip }) => {
    limitLogin(`${ip}|2fa|${user.id}`);
    const u = db.prepare('SELECT totp_novo FROM users WHERE id = ?').get(user.id);
    const seg = abrir(u && u.totp_novo);
    if (!seg) fail(400, 'Comece de novo: toque em "Ativar" para gerar o código.');
    if (!confere(seg, body.codigo)) fail(400, 'Código errado. Digite os 6 números que aparecem agora no Authenticator.');
    db.prepare('UPDATE users SET totp_on = 1, totp_segredo = totp_novo, totp_novo = NULL WHERE id = ?').run(user.id);
    avisarDono(user, 'A verificação em duas etapas foi ligada na sua conta.');
    return { ok: true, duasEtapas: true };
  });
  r.post('/me/2fa/desativar', ({ body, user, ip, roles }) => {
    limitLogin(`${ip}|2fa|${user.id}`);
    if ((roles || []).includes('admin')) fail(400, 'Para o administrador, a verificação em duas etapas é obrigatória.');
    const u = db.prepare('SELECT totp_on, totp_segredo FROM users WHERE id = ?').get(user.id);
    if (!u.totp_on) return { ok: true, duasEtapas: false };
    if (!confere(abrir(u.totp_segredo), body.codigo)) fail(400, 'Código errado.');
    db.prepare('UPDATE users SET totp_on = 0, totp_segredo = NULL WHERE id = ?').run(user.id);
    avisarDono(user, 'A verificação em duas etapas foi desligada na sua conta.');
    return { ok: true, duasEtapas: false };
  });

  // ── Confirmar o e-mail ──
  // No cadastro vai um código de 6 números (vale 30 minutos). A pessoa confirma no app; enquanto não
  // confirma, um aviso discreto lembra. Errou o e-mail no cadastro? Pode corrigir e pedir outro código.
  async function enviarCodigoEmail(u) {
    if (!u || !u.email || u.email_ok) return false;
    const codigo = String(randomInt(0, 1000000)).padStart(6, '0');
    db.prepare('UPDATE users SET email_cod_hash = ?, email_cod_exp = ?, email_cod_tent = 0 WHERE id = ?').run(sha256(`email:${u.id}:${codigo}`), now() + 30 * 60000, u.id);
    await mailer.send({
      to: u.email,
      subject: `Realyz: confirme seu e-mail com o código ${codigo}`,
      text: `Olá, ${u.name}!\n\nSeu código para confirmar o e-mail no Realyz: ${codigo}\nEle vale 30 minutos.\n\nCom o e-mail confirmado, você consegue recuperar a conta se esquecer a senha.\nSe não foi você que criou esta conta, ignore este e-mail.`,
    });
    return true;
  }
  r.post('/me/email/enviar', async ({ body, user, ip }) => {
    limitLogin(`${ip}|email|${user.id}`);
    let u = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    const novo = String(body.email || '').trim().toLowerCase();
    if (novo && novo !== String(u.email || '').toLowerCase()) {
      // Cadastrar ou trocar o e-mail é coisa séria (é por ele que se recupera a conta): pede a senha e,
      // se já tinha e-mail e a conta tem biometria, o rosto também. O e-mail antigo e o celular são avisados.
      if (!body.senha || !checkPassword(String(body.senha), u.pass_hash)) fail(403, 'Digite sua senha para cadastrar ou trocar o e-mail.', 'senha_email');
      if (u.email && biometria.hasBiometria(u.id) && !biometria.consumeDeviceToken(u.id, String(body.deviceKey || '').slice(0, 80), body.aparelhoToken)) {
        fail(403, 'Confirme seu rosto para trocar o e-mail.', 'biometria_aparelho');
      }
      if (!validEmail(novo)) fail(400, 'E-mail inválido.');
      if (db.prepare('SELECT 1 FROM users WHERE lower(email) = ? AND id != ?').get(novo, u.id)) fail(409, 'Esse e-mail já está em outra conta.');
      const antigo = u.email;
      db.prepare('UPDATE users SET email = ?, email_ok = 0 WHERE id = ?').run(novo, u.id);
      u = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
      avisarDono(u, antigo ? 'O e-mail da sua conta foi trocado. Se não foi você, fale com o suporte do Realyz.' : 'Um e-mail foi cadastrado na sua conta.');
      if (antigo) {
        mailer
          .send({ to: antigo, subject: 'Realyz: o e-mail da sua conta foi trocado', text: `Olá, ${u.name}!\n\nO e-mail da sua conta no Realyz foi trocado para outro endereço.\nSe não foi você, fale com o suporte do Realyz o quanto antes.` })
          .catch(() => {});
      }
    }
    if (u.email_ok) return { ok: true, emailOk: true, email: u.email };
    if (!u.email) fail(400, 'Cadastre um e-mail primeiro.');
    try {
      await enviarCodigoEmail(u);
    } catch (e) {
      fail(503, 'Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos.');
    }
    return { ok: true, emailOk: false, email: u.email };
  });
  r.post('/me/email/confirmar', ({ body, user }) => {
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    if (u.email_ok) return { ok: true, emailOk: true };
    const codigo = String(body.codigo || '').replace(/\D/g, '');
    if (!u.email_cod_hash || !u.email_cod_exp || u.email_cod_exp < now()) fail(400, 'Código vencido. Peça um novo.');
    if (sha256(`email:${u.id}:${codigo}`) !== u.email_cod_hash) {
      const n = (u.email_cod_tent || 0) + 1;
      if (n >= 5) db.prepare('UPDATE users SET email_cod_hash = NULL, email_cod_exp = NULL, email_cod_tent = 0 WHERE id = ?').run(u.id);
      else db.prepare('UPDATE users SET email_cod_tent = ? WHERE id = ?').run(n, u.id);
      fail(400, n >= 5 ? 'Muitas tentativas. Peça um código novo.' : 'Código errado. Confira o e-mail.');
    }
    db.prepare('UPDATE users SET email_ok = 1, email_cod_hash = NULL, email_cod_exp = NULL, email_cod_tent = 0 WHERE id = ?').run(u.id);
    return { ok: true, emailOk: true };
  });

  // Aviso no celular do dono (notificação, mesmo com o app fechado): funciona mesmo se o e-mail foi invadido.
  function avisarDono(u, text) {
    try {
      if (hub) hub.send(u.id, 'seguranca', { text });
      if (push) push.aviso(u.id, 'seguranca', { text });
    } catch (e) {}
  }
  // Depois de trocar senha ou e-mail: todos os aparelhos saem e só este fica conhecido.
  function recomecarAparelhos(u, deviceKey, device) {
    db.prepare('UPDATE sessions SET revoked = 1 WHERE user_id = ?').run(u.id);
    db.prepare('DELETE FROM devices WHERE user_id = ?').run(u.id);
    if (deviceKey) db.prepare('INSERT INTO devices (id, user_id, device_key, name, created_at, last_seen_at) VALUES (?,?,?,?,?,?)').run(newId('dv'), u.id, String(deviceKey).slice(0, 80), String(device || '').slice(0, 80), now(), now());
  }

  // ── Esqueci a senha ──
  // 1) A pessoa digita usuário, CPF, CNPJ ou e-mail. Se a conta existir e tiver e-mail, vai um código
  //    de 6 números que vale 15 minutos. A resposta é sempre a mesma (não revela se a conta existe).
  // 2) Com o código certo, troca a senha e desconecta todos os aparelhos (quem estava usando a conta
  //    sem permissão perde o acesso). Cinco códigos errados cancelam e pedem um novo.
  const acharConta = (login) => {
    const t = String(login || '').trim();
    const d = onlyDigits(t);
    if (/^[\d.\-\/\s]+$/.test(t) && (d.length === 11 || d.length === 14)) return db.prepare('SELECT * FROM users WHERE doc = ?').get(d);
    if (t.includes('@') && validEmail(t)) return db.prepare('SELECT * FROM users WHERE lower(email) = lower(?)').get(t);
    return db.prepare('SELECT * FROM users WHERE username = ?').get(cleanUsername(t));
  };
  const mascarar = (e) => String(e).replace(/^(.)(.*)(.@.*)$/, (_, a, m, b) => a + '*'.repeat(Math.min(m.length, 6)) + b);
  r.post('/auth/esqueci', async ({ body, ip }) => {
    const login = str(body.login, 'usuário, CPF, CNPJ ou e-mail', { max: 80 });
    limitLogin(`${ip}|esqueci|${login.toLowerCase()}`);
    const u = acharConta(login);
    const resposta = { ok: true, mensagem: 'Se a conta existir e tiver e-mail cadastrado, enviamos um código de 6 números. Ele vale 15 minutos.' };
    if (!u || u.status !== 'ativo' || u.kind === 'sistema' || !u.email) return resposta;
    avisarDono(u, 'Pediram para trocar a senha da sua conta. Se não foi você, não passe o código para ninguém.');
    const codigo = String(randomInt(0, 1000000)).padStart(6, '0');
    db.prepare('UPDATE users SET reset_hash = ?, reset_exp = ?, reset_tentativas = 0 WHERE id = ?').run(sha256(`${u.id}:${codigo}`), now() + 15 * 60000, u.id);
    try {
      await mailer.send({
        to: u.email,
        subject: `Realyz: seu código para trocar a senha é ${codigo}`,
        text: `Olá, ${u.name}!\n\nSeu código para criar uma senha nova no Realyz: ${codigo}\nEle vale 15 minutos.\n\nSe não foi você que pediu, ignore este e-mail: sua senha continua a mesma.`,
      });
    } catch (e) {
      fail(503, 'Não conseguimos enviar o e-mail agora. Tente de novo em alguns minutos.');
    }
    return { ...resposta, para: mascarar(u.email) };
  }, { auth: false });

  r.post('/auth/esqueci/confirmar', ({ body, ip }) => {
    const login = str(body.login, 'usuário, CPF, CNPJ ou e-mail', { max: 80 });
    limitLogin(`${ip}|esqueci-ok|${login.toLowerCase()}`);
    const codigo = String(body.codigo || '').replace(/\D/g, '');
    const u = acharConta(login);
    const invalido = () => fail(400, 'Código inválido ou vencido. Peça um novo.');
    if (!u || !u.reset_hash || !u.reset_exp || u.reset_exp < now()) invalido();
    if (sha256(`${u.id}:${codigo}`) !== u.reset_hash) {
      const n = (u.reset_tentativas || 0) + 1;
      if (n >= 5) db.prepare('UPDATE users SET reset_hash = NULL, reset_exp = NULL, reset_tentativas = 0 WHERE id = ?').run(u.id);
      else db.prepare('UPDATE users SET reset_tentativas = ? WHERE id = ?').run(n, u.id);
      invalido();
    }
    const pp = passwordProblem(body.senha);
    if (pp) fail(400, pp);
    // Conta com biometria: o código do e-mail sozinho não basta. Confere o rosto com o cadastro
    // (quem invadir só o e-mail não consegue trocar a senha). O código continua valendo até o rosto.
    const deviceKey = String(body.deviceKey || '').slice(0, 80);
    if (biometria.hasBiometria(u.id) && !biometria.consumeDeviceToken(u.id, deviceKey, body.aparelhoToken)) {
      fail(403, 'Confirme seu rosto para trocar a senha.', 'biometria_aparelho');
    }
    db.prepare('UPDATE users SET pass_hash = ?, email_ok = 1, reset_hash = NULL, reset_exp = NULL, reset_tentativas = 0 WHERE id = ?').run(hashPassword(String(body.senha)), u.id);
    // Todos os aparelhos saem; só este (onde o rosto foi conferido) fica conhecido.
    recomecarAparelhos(u, biometria.hasBiometria(u.id) ? deviceKey : null, body.device);
    avisarDono(u, 'A senha da sua conta foi trocada. Se não foi você, fale com o suporte do Realyz.');
    return { ok: true, mensagem: 'Senha trocada. Entre com a senha nova.' };
  }, { auth: false });

  // ── Recuperar pelo rosto (perdeu o acesso ao e-mail) ──
  // Só para conta com biometria: o app confere o rosto (POST /auth/aparelho/verificar, que devolve o
  // aparelhoToken) e aqui a pessoa cadastra um e-mail novo e uma senha nova. O e-mail novo recebe o
  // código de confirmação; todos os outros aparelhos saem da conta.
  r.post('/auth/recuperar-rosto', ({ body, ip }) => {
    const login = str(body.login, 'usuário, CPF ou CNPJ', { max: 40 });
    limitLogin(`${ip}|recuperar-rosto|${login.toLowerCase()}`);
    const u = acharConta(login);
    if (!u || u.status !== 'ativo' || u.kind === 'sistema' || !biometria.hasBiometria(u.id)) fail(400, 'Recuperar pelo rosto só funciona em conta com biometria cadastrada. Use o código por e-mail ou fale com o suporte.');
    const deviceKey = String(body.deviceKey || '').slice(0, 80);
    if (!biometria.consumeDeviceToken(u.id, deviceKey, body.aparelhoToken)) fail(403, 'Confirme seu rosto para recuperar a conta.', 'biometria_aparelho');
    const email = String(body.email || '').trim().toLowerCase();
    if (!validEmail(email)) fail(400, 'E-mail inválido.');
    if (db.prepare('SELECT 1 FROM users WHERE lower(email) = ? AND id != ?').get(email, u.id)) fail(409, 'Esse e-mail já está em outra conta.');
    const pp = passwordProblem(body.senha);
    if (pp) fail(400, pp);
    db.prepare('UPDATE users SET email = ?, email_ok = 0, pass_hash = ?, reset_hash = NULL, reset_exp = NULL WHERE id = ?').run(email, hashPassword(String(body.senha)), u.id);
    recomecarAparelhos(u, deviceKey, body.device);
    avisarDono(u, 'Sua conta foi recuperada pelo rosto, com e-mail e senha novos.');
    const atual = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
    enviarCodigoEmail(atual).catch(() => {});
    return { ok: true, mensagem: 'Conta recuperada. Entre com a senha nova e confirme o e-mail novo com o código que enviamos.' };
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
  r.get('/me', ({ user, roles }) => ({
    user: publicUser(user, { self: true }),
    // Até quando a conta sem biometria pode navegar (o app avisa antes e trava depois).
    prazoBiometria: user.prazo_bio || null,
    prazoVencido: prazoBioVencido(db, cfg, user, roles),
    // Selo "Identidade verificada": só com a biometria aprovada (independe da regra de compras).
    verificado: !!db.prepare(`SELECT 1 FROM biometria WHERE user_id = ? AND status = 'aprovado'`).get(user.id),
    // O app usa isto para saber se a conta está completa ou no modo social (sem biometria).
    podeComprar: podeComprar(db, cfg, user, roles || []),
    exigeBiometria: !!cfg.exigirBiometria,
    // Conta de teste: compras liberadas com dinheiro fictício (o app tira o aviso de bloqueado).
    teste: !!user.teste,
    comprasLiberadas: !!cfg.comprasLiberadas || !!user.teste || (roles || []).includes('admin'),
    company: db.prepare('SELECT * FROM companies WHERE owner_id = ?').get(user.id) || null,
    provider: db.prepare('SELECT * FROM providers WHERE user_id = ?').get(user.id) || null,
  }));

  // Perfil completo da conta (o que a pessoa preencheu no app ou no site). O mais novo vale.
  r.get('/me/dados', ({ user }) => {
    const row = db.prepare('SELECT data, updated_at FROM user_dados WHERE user_id = ?').get(user.id);
    return row ? { data: JSON.parse(row.data), updatedAt: row.updated_at } : { data: null, updatedAt: 0 };
  });
  r.put('/me/dados', ({ body, user }) => {
    if (!body || typeof body.data !== 'object' || !body.data || Array.isArray(body.data)) fail(400, 'Dados do perfil inválidos.');
    const json = JSON.stringify(body.data);
    if (json.length > 900 * 1024) fail(413, 'Perfil grande demais para salvar.');
    const at = now();
    db.prepare('INSERT INTO user_dados (user_id, data, updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at').run(user.id, json, at);
    // Foto e "sobre" também vão para o perfil público (busca, amigos, conversas).
    const p = body.data.myProfile || {};
    const foto = typeof p.photo === 'string' ? p.photo.replace(/^https?:\/\/[^/]+(?=\/media\/)/, '') : null;
    const fields = {};
    if (foto && /^\/media\/[A-Za-z0-9_-]+(\.[A-Za-z0-9]{2,4})?$/.test(foto)) fields.photo = foto;
    if (typeof p.bio === 'string') fields.about = p.bio.trim().slice(0, 300);
    const keys = Object.keys(fields);
    if (keys.length) db.prepare(`UPDATE users SET ${keys.map((k) => `${k} = ?`).join(', ')} WHERE id = ?`).run(...keys.map((k) => fields[k]), user.id);
    return { updatedAt: at };
  });

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
