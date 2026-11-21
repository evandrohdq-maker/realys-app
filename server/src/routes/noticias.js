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
// Foto de verdade da matéria: o RSS da Agência Brasil quase sempre traz só a logo, então o servidor
// abre a página da notícia e pega a imagem de destaque (og:image). Guarda por link.
const fotos = new Map();
const BAD = /logo|\.svg(\?|$)|ebc\.png\?|pixel|tracking|1x1/i;
async function fotoDe(link) {
  if (!link || !/^https:\/\//.test(link)) return '';
  if (fotos.has(link)) return fotos.get(link);
  let url = '';
  try {
    const res = await fetch(link, { headers: { 'User-Agent': 'Realyz/1.0 (+https://realyz.com.br)' }, signal: AbortSignal.timeout(6000) });
    if (res.ok) {
      const html = (await res.text()).slice(0, 200000);
      const m = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
      if (m && !BAD.test(m[1])) url = m[1].replace(/&amp;/g, '&');
    }
  } catch (e) {}
  if (fotos.size > 500) fotos.clear();
  fotos.set(link, url);
  return url;
}

async function load(kind) {
  const c = cache[kind];
  if (c && Date.now() - c.at < TTL) return c.items;
  const out = [];
  for (const f of FEEDS[kind]) {
    try {
      const res = await fetch(f.url, { headers: { 'User-Agent': 'Realyz/1.0 (+https://realyz.com.br)' }, signal: AbortSignal.timeout(12000) });
      if (!res.ok) continue;
      const items = parseRss(await res.text()).slice(0, 40).map((i) => ({ ...i, source: f.source, photo: BAD.test(i.photo || '') ? '' : i.photo }));
      // Notícias sem foto: busca a foto de destaque na página da matéria (só para as notícias, não para os alertas).
      if (kind === 'noticias') await Promise.all(items.map(async (i) => { if (!i.photo) i.photo = await fotoDe(i.link); }));
      out.push(...items);
    } catch (e) {}
  }
  if (out.length || !c) cache[kind] = { at: Date.now(), items: out };
  return cache[kind].items;
}

export default function noticiasRoutes(r) {
  r.get('/noticias', async () => ({ items: (await load('noticias')).slice(0, 60) }), { auth: false });
  r.get('/alertas', async () => ({ items: (await load('alertas')).slice(0, 40) }), { auth: false });
}
