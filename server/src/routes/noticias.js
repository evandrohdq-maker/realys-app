// Notícias e alertas de verdade, de fontes públicas e gratuitas:
// - Agência Brasil (EBC): reprodução permitida com crédito da fonte.
// - INMET: avisos meteorológicos oficiais.
// O servidor busca os feeds (RSS), guarda 10 minutos e entrega em JSON para o app e o site
// (no site o navegador não consegue ler esses feeds direto, por causa do CORS).
import { parseRss } from '../rss.js';

export const FEEDS = {
  noticias: [{ url: 'https://agenciabrasil.ebc.com.br/feed/ultimasnoticias/feed.xml', source: 'Agência Brasil' }],
  alertas: [{ url: 'https://apiprevmet3.inmet.gov.br/avisos/rss', source: 'INMET' }],
};
const TTL = 10 * 60 * 1000;
const cache = {};

async function load(kind) {
  const c = cache[kind];
  if (c && Date.now() - c.at < TTL) return c.items;
  const out = [];
  for (const f of FEEDS[kind]) {
    try {
      const res = await fetch(f.url, { headers: { 'User-Agent': 'Realyz/1.0 (+https://realyz.com.br)' }, signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      out.push(...parseRss(await res.text()).map((i) => ({ ...i, source: f.source })));
    } catch (e) {}
  }
  if (out.length || !c) cache[kind] = { at: Date.now(), items: out };
  return cache[kind].items;
}

export default function noticiasRoutes(r) {
  r.get('/noticias', async () => ({ items: (await load('noticias')).slice(0, 60) }), { auth: false });
  r.get('/alertas', async () => ({ items: (await load('alertas')).slice(0, 40) }), { auth: false });
}
