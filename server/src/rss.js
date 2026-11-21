// Leitor simples de RSS (sem biblioteca): pega título, link, data, resumo e imagem de cada <item>.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export const decode = (s) =>
  String(s || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)))
    .replace(/&(\w+);/g, (m, k) => (k in ENT ? ENT[k] : m));
export const stripHtml = (s) => decode(decode(s)).replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|tr|li|div)>/gi, '\n').replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim();
// Imagens que não são foto da notícia: logos, ícones .svg e pixels de contagem.
const BAD_IMG = /logo|\.svg(\?|$)|ebc\.png\?|pixel|tracking|1x1/i;
const tag = (x, t) => {
  const m = x.match(new RegExp(`<${t}(?:\\s[^>]*)?>([\\s\\S]*?)</${t}>`, 'i'));
  return m ? m[1] : '';
};
export function parseRss(xml) {
  const items = String(xml || '').match(/<item[\s>][\s\S]*?<\/item>/gi) || [];
  return items.map((x) => {
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
  }).filter((i) => i.title);
}
