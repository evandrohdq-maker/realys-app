// Pix de verdade pela API Pix do banco (padrão do Banco Central). Configurado para o Santander:
//   - Depósito na carteira: o servidor cria uma cobrança Pix (QR Code / copia e cola) na conta Santander
//     do Realyz; quando o cliente paga, o saldo entra na carteira dele.
//   - O lucro do Realyz fica na conta Santander e é transferido para a conta Nubank (Pix normal, pelo app do banco).
//   - Saques dos usuários: o administrador paga pelo app do Santander (Painel › Saques), até a API de pagamentos ser contratada.
//
// Acesso: o Santander exige mTLS com o certificado A1 da empresa (o mesmo das notas fiscais) e
// client_id/client_secret do Portal Developers. Os endereços ficam no .env (PIX_BASE_URL, PIX_TOKEN_URL):
// confira os de produção no Portal Developers do Santander ao gerar as credenciais.
import { request as httpsRequest } from 'node:https';
import { readFileSync, existsSync } from 'node:fs';
import { randomBytes } from 'node:crypto';

export function makePix(cfg, { send } = {}) {
  const ready = !!(cfg.pixProvider && cfg.pixClientId && cfg.pixClientSecret && cfg.pixChave && cfg.pixBaseUrl);
  let tls = null;
  const certs = () => {
    if (tls) return tls;
    if (!cfg.pixCertPem || !cfg.pixKeyPem || !existsSync(cfg.pixCertPem) || !existsSync(cfg.pixKeyPem)) return null;
    tls = { cert: readFileSync(cfg.pixCertPem), key: readFileSync(cfg.pixKeyPem) };
    return tls;
  };

  // HTTPS com o certificado da empresa (mTLS). Em teste, "send" é trocado por um falso.
  const doSend =
    send ||
    ((method, url, headers, body) =>
      new Promise((resolve, reject) => {
        const u = new URL(url);
        const c = certs() || {};
        const req = httpsRequest(
          { method, hostname: u.hostname, port: u.port || 443, path: u.pathname + u.search, headers, cert: c.cert, key: c.key, timeout: 20000 },
          (res) => {
            let data = '';
            res.on('data', (d) => (data += d));
            res.on('end', () => {
              let json = null;
              try {
                json = data ? JSON.parse(data) : {};
              } catch (e) {
                json = { raw: data };
              }
              resolve({ status: res.statusCode, json });
            });
          }
        );
        req.on('timeout', () => req.destroy(new Error('O banco demorou para responder.')));
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
      }));

  let token = null;
  let tokenExp = 0;
  async function auth() {
    if (token && Date.now() < tokenExp - 60000) return token;
    const form = new URLSearchParams({ grant_type: 'client_credentials', client_id: cfg.pixClientId, client_secret: cfg.pixClientSecret }).toString();
    const basic = Buffer.from(`${cfg.pixClientId}:${cfg.pixClientSecret}`).toString('base64');
    const r = await doSend('POST', cfg.pixTokenUrl || `${cfg.pixBaseUrl}/oauth/token`, { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}`, 'Content-Length': Buffer.byteLength(form) }, form);
    if (r.status >= 300 || !r.json.access_token) throw new Error(`Banco recusou o acesso ao Pix (${r.status}).`);
    token = r.json.access_token;
    tokenExp = Date.now() + (Number(r.json.expires_in) || 300) * 1000;
    return token;
  }
  async function api(method, path, body) {
    const t = await auth();
    const payload = body ? JSON.stringify(body) : null;
    const r = await doSend(method, `${cfg.pixBaseUrl}${cfg.pixApiPath || ''}${path}`, { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json', ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}) }, payload);
    if (r.status >= 300) throw new Error((r.json && (r.json.detail || r.json.title || r.json.message)) || `Banco respondeu ${r.status}.`);
    return r.json;
  }

  // txid: 26 a 35 letras e números (regra do Banco Central).
  const novoTxid = () => ('RZ' + randomBytes(16).toString('hex')).slice(0, 32).toUpperCase();

  return {
    ready,
    // Cria a cobrança. Devolve { txid, copiaECola, expiraEm }.
    async cobrar(cents, descricao) {
      const txid = novoTxid();
      const exp = cfg.pixExpiraSeg || 3600;
      const c = await api('PUT', `/cob/${txid}`, {
        calendario: { expiracao: exp },
        valor: { original: (cents / 100).toFixed(2) },
        chave: cfg.pixChave,
        solicitacaoPagador: String(descricao || 'Depósito na carteira Realyz').slice(0, 140),
      });
      let copia = c.pixCopiaECola || c.brcode || c.qrcode;
      // Imagem do QR Code pronta (padrão da API Pix: GET /loc/{id}/qrcode), quando o banco oferece.
      let imagem = null;
      if (c.loc && c.loc.id) {
        const q = await api('GET', `/loc/${c.loc.id}/qrcode`).catch(() => null);
        if (q) {
          copia = copia || q.qrcode;
          imagem = q.imagemQrcode || null;
        }
      }
      if (!copia) throw new Error('O banco criou a cobrança, mas não devolveu o código Pix.');
      return { txid: c.txid || txid, copiaECola: copia, imagem, expiraEm: Date.now() + exp * 1000 };
    },
    // Consulta: 'pago' | 'aguardando' | 'expirado'
    async consultar(txid) {
      const c = await api('GET', `/cob/${txid}`);
      if (c.status === 'CONCLUIDA' || (Array.isArray(c.pix) && c.pix.length)) return { status: 'pago', valor: c.pix && c.pix[0] ? Math.round(Number(c.pix[0].valor) * 100) : null };
      if (String(c.status || '').startsWith('REMOVIDA')) return { status: 'expirado' };
      return { status: 'aguardando' };
    },
    pendencias() {
      const f = [];
      if (!cfg.pixClientId || !cfg.pixClientSecret) f.push('PIX_CLIENT_ID e PIX_CLIENT_SECRET (Portal Developers do Santander)');
      if (!cfg.pixChave) f.push('PIX_CHAVE (a chave Pix CNPJ da conta Santander)');
      if (!certs()) f.push('certificado A1 em PEM (FISCAL_CERT_PEM/FISCAL_KEY_PEM ou PIX_CERT_PEM/PIX_KEY_PEM)');
      return f;
    },
  };
}
