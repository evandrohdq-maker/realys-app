// Roteador HTTP mínimo (sem dependências): rotas com parâmetros, JSON, erros e CORS.
import { randomBytes, createHash } from 'node:crypto';

export class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const fail = (status, message, code) => {
  throw new HttpError(status, message, code);
};

export const newId = (prefix) => `${prefix}_${randomBytes(9).toString('base64url')}`;
export const now = () => Date.now();

// Reais ⇄ centavos.
export const toCents = (reais) => Math.round(Number(reais) * 100);
export const toReais = (cents) => Math.round(cents) / 100;

export class Router {
  constructor() {
    this.routes = [];
  }
  add(method, path, handler, opts = {}) {
    const keys = [];
    const re = new RegExp('^' + path.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '/?$');
    this.routes.push({ method, path, re, keys, handler, opts });
    return this;
  }
  get(p, h, o) { return this.add('GET', p, h, o); }
  post(p, h, o) { return this.add('POST', p, h, o); }
  put(p, h, o) { return this.add('PUT', p, h, o); }
  patch(p, h, o) { return this.add('PATCH', p, h, o); }
  delete(p, h, o) { return this.add('DELETE', p, h, o); }
  match(method, path) {
    let pathFound = false;
    for (const r of this.routes) {
      const m = path.match(r.re);
      if (!m) continue;
      pathFound = true;
      if (r.method !== method) continue;
      const params = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      return { route: r, params };
    }
    return pathFound ? { notAllowed: true } : null;
  }
}

// Lê o corpo da requisição até `limit` bytes.
export function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) {
        reject(new HttpError(413, 'Arquivo ou mensagem grande demais.'));
        req.destroy();
        return;
      }
      chunks.push(c);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

// Leituras (GET) levam uma etiqueta (ETag) com a "impressão digital" da resposta. O app manda a
// etiqueta de volta na próxima vez; se nada mudou, responde só 304 (sem dados), e o celular usa o que
// já tem guardado. Menos internet para o cliente e menos tráfego para o servidor.
const nucleoEtag = (e) => String(e || '').replace(/^W\//, '').replace(/"/g, '').replace(/-(gzip|zstd|br)$/, '');
export function sendJson(res, status, data, cors) {
  const body = JSON.stringify(data);
  const req = res.req;
  const headers = { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(cors) };
  if (status === 200 && req && req.method === 'GET' && body.length > 200) {
    const etag = 'W/"' + createHash('sha1').update(body).digest('base64url').slice(0, 24) + '"';
    headers.ETag = etag;
    headers['Cache-Control'] = 'private, no-cache';
    const pediu = req.headers['if-none-match'];
    if (pediu && String(pediu).split(',').some((e) => nucleoEtag(e.trim()) === nucleoEtag(etag))) {
      res.writeHead(304, headers);
      return res.end();
    }
  }
  headers['Content-Length'] = Buffer.byteLength(body);
  res.writeHead(status, headers);
  res.end(body);
}

export const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, If-None-Match',
  'Access-Control-Expose-Headers': 'ETag',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  // Site no computador: o navegador guarda a permissão por 2 h (antes perguntava antes de cada pedido).
  'Access-Control-Max-Age': '7200',
});

// ── Validação simples dos dados recebidos ──
export const str = (v, name, { min = 1, max = 500, optional = false } = {}) => {
  if (v === undefined || v === null || v === '') {
    if (optional) return '';
    fail(400, `Informe ${name}.`);
  }
  const s = String(v).trim();
  if (s.length < min) fail(400, `${name[0].toUpperCase() + name.slice(1)} está curto demais.`);
  if (s.length > max) fail(400, `${name[0].toUpperCase() + name.slice(1)} pode ter no máximo ${max} caracteres.`);
  return s;
};
export const money = (v, name, { min = 0.01, max = 1e6 } = {}) => {
  const n = Number(v);
  if (!isFinite(n)) fail(400, `Valor inválido em ${name}.`);
  if (n < min) fail(400, `O valor mínimo de ${name} é R$ ${min.toFixed(2).replace('.', ',')}.`);
  if (n > max) fail(400, `O valor máximo de ${name} é R$ ${max.toFixed(2).replace('.', ',')}.`);
  return toCents(n);
};
export const int = (v, name, { min = 0, max = 1e9 } = {}) => {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) fail(400, `Número inválido em ${name}.`);
  return n;
};
export const oneOf = (v, name, list) => {
  if (!list.includes(v)) fail(400, `Opção inválida em ${name}.`);
  return v;
};
export const coord = (v, name) => {
  const n = Number(v);
  if (!isFinite(n) || Math.abs(n) > 180) fail(400, `Coordenada inválida em ${name}.`);
  return n;
};
