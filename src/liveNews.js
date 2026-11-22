// Notícias e alertas de verdade no app e no site (aba News).
// Fontes públicas e gratuitas:
// - Agência Brasil (EBC): reprodução permitida com crédito da fonte.
// - INMET: avisos meteorológicos oficiais.
// Primeiro tenta o servidor do Realyz (/noticias e /alertas, com cache). Se o servidor não
// responder, o app no celular lê os feeds direto. No site, só pelo servidor (o navegador bloqueia
// a leitura direta dos feeds).
// Os dados vão para as listas NEWS e ALERTS de src/newsData.js (trocadas no lugar).
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { API_URL } from './api';
import { NEWS, ALERTS } from './newsData';

const FEED_NEWS = 'https://agenciabrasil.ebc.com.br/feed/ultimasnoticias/feed.xml';
const FEED_ALERTS = 'https://apiprevmet3.inmet.gov.br/avisos/rss';
const REFRESH = 10 * 60 * 1000;
const HOME_STATE = 'Rio Grande do Sul'; // cidade-piloto: Passo Fundo (RS) aparece primeiro nos alertas

// ---------- leitor de RSS (igual ao do servidor, server/src/rss.js) ----------
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
const decode = (s) =>
  String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, k) => (k in ENT ? ENT[k] : m));
const stripHtml = (s) => decode(decode(s)).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|tr|li|div)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim();
// Imagens que não são foto da notícia: logos, ícones .svg e pixels de contagem.
const BAD_IMG = /logo|\.svg(\?|$)|ebc\.png\?|pixel|tracking|1x1/i;
const tag = (x, t) => {
  const m = x.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`, 'i'));
  return m ? m[1] : '';
};
function parseRss(xml) {
  const items = String(xml || '').match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return items
    .map((x) => {
      const rawDesc = tag(x, 'description') || tag(x, 'content:encoded');
      const html = decode(rawDesc);
      const img =
        (x.match(/<media:content[^>]*url="([^"]+)"/i) || [])[1] ||
        (x.match(/<enclosure[^>]*url="([^"]+)"[^>]*type="image/i) || [])[1] ||
        // Primeira foto de verdade do texto: pula a logo do site e o pixel de contagem (ex.: ebc.png?id=…).
      [...html.matchAll(/<img[^>]*src="([^"]+)"/gi)].map((m) => m[1]).find((u) => !BAD_IMG.test(u)) ||
        '';
      return {
        title: stripHtml(tag(x, 'title')),
        link: decode(tag(x, 'link')).trim() || decode(tag(x, 'guid')).trim(),
        date: decode(tag(x, 'pubDate')).trim(),
        text: stripHtml(rawDesc).slice(0, 1200),
        photo: decode(img),
      };
    })
    .filter((i) => i.title);
}

// ---------- ajudantes ----------
export function ago(date) {
  const t = Date.parse(date);
  if (!t) return '';
  const min = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? 'ontem' : `há ${d} dias`;
}

// Assunto pela seção do link da Agência Brasil (ex.: /economia/noticia/...) e por palavras do título.
const SECTION = { economia: 'economia', internacional: 'mundo', saude: 'saude', esportes: 'esportes', geral: 'brasil', politica: 'brasil', educacao: 'brasil', 'direitos-humanos': 'brasil', justica: 'brasil', 'meio-ambiente': 'clima' };
const WORDS = [
  ['agro', /agro|safra|soja|milho|café|pecuári|rural|colheita|agricult/i],
  ['tecnologia', /tecnolog|inteligência artificial|\bIA\b|internet|digital|ciência|satélite/i],
  ['clima', /chuva|temporal|frente fria|calor|clima|meteorolog|inmet|seca|enchente/i],
];
function catOf(link, title) {
  const sec = (String(link).match(/ebc\.com\.br\/([a-z-]+)\//) || [])[1];
  for (const [k, re] of WORDS) if (re.test(title)) return k;
  return SECTION[sec] || 'brasil';
}

function toNews(items) {
  return items.slice(0, 80).map((i, n) => {
    const text = i.text || '';
    return {
      id: 'ab-' + (i.link || i.title).replace(/[^a-z0-9]/gi, '').slice(-40) + n,
      cat: i.cat || catOf(i.link, i.title),
      source: i.source || 'Agência Brasil',
      official: !i.source || i.source === 'Agência Brasil',
      live: true,
      time: ago(i.date),
      date: i.date,
      title: i.title,
      summary: text.split('\n')[0].slice(0, 220),
      body: text,
      photo: i.photo && !BAD_IMG.test(i.photo) ? i.photo : null, // o servidor antigo ainda pode mandar a logo
      link: i.link,
    };
  });
}

// Aviso do INMET → alerta do app.
const pick = (txt, label) => {
  const m = txt.match(new RegExp(`${label}\\s*:?\\s*([^\\n]+)`, 'i'));
  return m ? m[1].trim() : '';
};
const fmtDate = (s) => {
  const m = String(s).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  return m ? `${m[3]}/${m[2]} ${m[4]}h${m[5]}` : s;
};
const ICON = [
  [/chuva|tempestade|temporal/i, 'thunderstorm'],
  [/vento|vendaval|ciclone/i, 'cloudy'],
  [/calor|baixa umidade|seca/i, 'sunny'],
  [/frio|geada|declínio de temperatura/i, 'snow'],
  [/granizo/i, 'rainy'],
];
function toAlerts(items) {
  return items
    .map((i, n) => {
      const txt = i.text || '';
      const sev = /grande perigo/i.test(i.title + txt) ? 'extremo' : /perigo potencial/i.test(i.title + txt) ? 'atencao' : 'alto';
      const type = (i.title.split(/\.\s*Severidade/i)[0] || i.title).replace(/^Aviso de\s*/i, '').trim();
      const area = pick(txt, 'Área') || pick(txt, 'Area');
      const ini = pick(txt, 'Início');
      const fim = pick(txt, 'Fim');
      const desc = pick(txt, 'Descrição') || txt.split('\n').find((l) => l.length > 40) || '';
      const todo = (pick(txt, 'Instruções') || '')
        .split(/\s*[.;]\s+/)
        .map((s) => s.trim())
        .filter((s) => s.length > 3)
        .slice(0, 5);
      return {
        id: 'inmet-' + n + '-' + type.replace(/\W/g, '').slice(0, 12),
        active: false, // a faixa do topo só usa alertas com área no mapa (zona); o INMET manda a área em texto
        live: true,
        level: sev,
        type: type || 'Aviso meteorológico',
        icon: (ICON.find(([re]) => re.test(type)) || [null, 'warning'])[1],
        area: area ? area.slice(0, 160) : 'Ver área no site do INMET',
        source: 'INMET',
        until: fim ? `até ${fmtDate(fim)}` : ini ? `a partir de ${fmtDate(ini)}` : '',
        text: desc.slice(0, 400),
        todo: todo.length ? todo : ['Acompanhe a Defesa Civil da sua cidade', 'Em emergência, ligue 199 (Defesa Civil) ou 193 (Bombeiros)'],
        phone: '199',
        phoneLabel: 'Defesa Civil',
        link: i.link,
      };
    })
    .sort((a, b) => (b.area.includes(HOME_STATE) ? 1 : 0) - (a.area.includes(HOME_STATE) ? 1 : 0) || 'extremo alto atencao'.indexOf(a.level) - 'extremo alto atencao'.indexOf(b.level))
    .slice(0, 12);
}

// ---------- busca ----------
async function getJson(path) {
  if (!API_URL) return null;
  const res = await fetch(API_URL + path, { headers: { Accept: 'application/json' } });
  if (!res.ok) return null;
  const d = await res.json();
  return d && Array.isArray(d.items) ? d.items : null;
}
async function getFeed(url, source) {
  if (Platform.OS === 'web') return null; // no navegador só pelo servidor
  const res = await fetch(url);
  if (!res.ok) return null;
  return parseRss(await res.text()).map((i) => ({ ...i, source }));
}
async function load(path, url, source) {
  try {
    const a = await getJson(path);
    if (a && a.length) return a;
  } catch (e) {}
  try {
    return (await getFeed(url, source)) || [];
  } catch (e) {
    return [];
  }
}

const subs = new Set();
let status = { loading: false, at: 0, ok: false };
const replace = (arr, items) => arr.splice(0, arr.length, ...items);

export async function refreshLiveNews(force) {
  if (status.loading || (!force && Date.now() - status.at < REFRESH)) return;
  status = { ...status, loading: true };
  subs.forEach((fn) => fn());
  const [n, a] = await Promise.all([load('/noticias', FEED_NEWS, 'Agência Brasil'), load('/alertas', FEED_ALERTS, 'INMET')]);
  if (n.length) replace(NEWS, toNews(n));
  if (a.length || status.ok) replace(ALERTS, toAlerts(a));
  status = { loading: false, at: Date.now(), ok: status.ok || n.length > 0 };
  subs.forEach((fn) => fn());
}

// Para as telas: atualiza ao abrir e a cada 10 minutos.
export function useLiveNews() {
  const [, tick] = useState(0);
  useEffect(() => {
    const fn = () => tick((x) => x + 1);
    subs.add(fn);
    refreshLiveNews();
    const t = setInterval(() => refreshLiveNews(), REFRESH);
    return () => (subs.delete(fn), clearInterval(t));
  }, []);
  return status;
}
