// Conhecimento da Lotus: ela se abastece sozinha com o que empresas e clientes PUBLICAM no Realys
// (produtos e preços, lançamentos, promoções, serviços dos prestadores, anúncios, vagas,
// depoimentos expostos e posts públicos) e faz análises de preço e de mercado.
//
// Para que serve:
//   1. Responder perguntas de clientes ("quanto custa um eletricista?", "onde o café está mais barato?",
//      "R$ 30 no café está caro?", "o que falam da Pizzaria da Praça?").
//   2. Montar o levantamento de mercado do administrador (sempre em números agregados).
//
// O conhecimento é refeito a cada publicação: produto novo, preço alterado, depoimento aprovado,
// post na Comunidade… a Lotus já sabe na mesma hora, sem servidor.
//
// Regras (ver KNOWLEDGE_RULES): nada de dado privado, nada de uso próprio.
import { products as baseProducts, serviceTypes, isFoodStore } from '../data';
import { listings, LISTING_KINDS, promos, events, EVENT_GROUPS, communityPosts as baseCommunityPosts } from '../homeData';
import { foodPromos } from '../foodData';
import { sectorItems } from '../techAgroData';
import { SHOP_SECTORS, shopSectorItems } from '../shopSectorsData';
import { specialists, transitLines, trips } from '../extraData';
import { allJobs } from '../store';
import { stem } from '../search';
import { businessOf, ratingOf } from '../companyBusiness';
import { members } from '../people';
import { checkText, matchFalse, ASK_TRUTH } from './factCheck';

// O que a Lotus pode e não pode fazer com o que aprende. Aparece para o administrador.
export const KNOWLEDGE_RULES = [
  { icon: 'close-circle-outline', title: 'Nunca aprende com informação falsa', text: 'Todo post e depoimento passa pela IA verificadora. O que for classificado como fake news sai da plataforma e do conhecimento dela, e fica só marcado como informação falsa, para ela avisar quem perguntar.' },
  { icon: 'eye-outline', title: 'Aprende só com o que é público', text: 'Produtos e preços publicados, lançamentos, promoções, serviços dos prestadores, anúncios, vagas, depoimentos expostos e posts públicos.' },
  { icon: 'lock-closed-outline', title: 'Nunca lê dados privados', text: 'Custo dos produtos, estoque interno, caixa, carteira, mensagens, Date e pedidos de outras pessoas ficam fora do conhecimento dela.' },
  { icon: 'chatbubbles-outline', title: 'Usa só para responder clientes', text: 'O conhecimento serve para responder o que o cliente perguntou e para o levantamento do administrador, sempre em números agregados.' },
  { icon: 'hand-left-outline', title: 'Nunca para uso próprio', text: 'A Lotus não compra, não vende, não negocia, não anuncia e não age sozinha. Chamar um prestador ou comprar só acontece com a confirmação da pessoa.' },
  { icon: 'scale-outline', title: 'Imparcial', text: 'Patrocínio não muda as análises: preço médio, faixa de preço e "mais em conta" contam todas as ofertas do mesmo jeito.' },
  { icon: 'shield-outline', title: 'Não repassa segredo de ninguém', text: 'Uma empresa só fica sabendo o que as outras já publicaram para todo mundo.' },
];

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
const words = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
// Palavras que querem dizer a mesma coisa nas perguntas e nos anúncios.
const SAME = { alugar: 'aluguel', aluga: 'aluguel', locacao: 'aluguel', locar: 'aluguel', celular: 'smartphone', telefone: 'smartphone', ape: 'apartamento', diaria: 'diaria', hospedagem: 'hotel', pousada: 'pousada' };
const stems = (s) => words(s).map(stem).map((w) => SAME[w] || w);

// "R$ 1.400/dia" -> { price: 1400, unit: 'dia' } · "R$ 49,90" -> 49.9 · "Grátis" -> 0
export function parsePrice(v) {
  if (typeof v === 'number') return { price: v };
  const s = String(v || '');
  if (/gr[aá]tis/i.test(s)) return { price: 0 };
  const m = s.match(/(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?/);
  if (!m) return { price: null };
  const price = Number(m[1].replace(/\./g, '') + (m[2] ? '.' + m[2] : ''));
  const u = s.match(/\/\s*([a-zà-ú]+)/i);
  return { price, unit: u ? u[1] : undefined };
}

// Monta um "fato" só com campos públicos. Nada de custo, estoque, caixa ou dado pessoal.
function fact(f) {
  return {
    id: f.id,
    kind: f.kind, // Produto, Serviço, Anúncio, Vaga…
    sector: f.sector, // Mercado, Eletrônicos, Eletricista…
    title: f.title,
    seller: f.seller || '',
    price: f.price,
    unit: f.unit || '',
    promo: f.promo || null,
    launch: !!f.launch,
    icon: f.icon || '🏷️',
    go: f.go,
    companyId: f.companyId,
    t: stems(f.title),
    s: stems(f.sector),
    w: stems(f.seller),
  };
}

const unitOf = (u) => String(u || '').replace(/^por\s+/i, '').trim();

// Tudo o que a Lotus sabe neste momento.
function build(state) {
  const facts = [];
  const add = (f) => {
    if (f.price == null || isNaN(f.price)) return;
    facts.push(fact(f));
  };
  const stores = state.stores || [];

  (state.products || []).forEach((p) => {
    const st = stores.find((s) => s.id === p.storeId) || {};
    const promo = promos.find((x) => x.productId === p.id);
    add({
      id: 'p-' + p.id, kind: 'Produto', sector: st.category || 'Loja', title: p.name, seller: st.name, price: p.price, unit: 'unidade', icon: p.emoji,
      promo: promo ? `-${promo.off}%` : null, launch: !!p.launch, companyId: st.id,
      go: isFoodStore(st) ? { tab: 'food', cat: st.category, q: p.name } : { tab: 'loja', cat: 'Todos', q: p.name },
    });
  });
  shopSectorItems.forEach((it) =>
    add({ id: 'ss-' + it.id, kind: 'Produto', sector: SHOP_SECTORS[it.sector].title, title: it.title, seller: it.who, price: it.price, unit: it.unit, icon: it.icon, launch: it.launch, go: it.go || { tab: it.sector, group: (it.groups || [])[0] || 'todos' } }),
  );
  sectorItems.forEach((it) =>
    add({ id: 'ta-' + it.id, kind: it.sector === 'tech' ? 'Tecnologia' : 'Agro', sector: it.sector === 'tech' ? 'Tecnologia' : 'Agro', title: it.title, seller: it.who, price: it.price, unit: it.unit, icon: it.icon, go: it.go || { tab: it.sector === 'tech' ? 'tecnologia' : 'agro', seg: it.seg } }),
  );
  foodPromos.forEach((fp) => {
    const st = stores.find((s) => s.id === fp.storeId) || {};
    add({ id: 'fp-' + fp.id, kind: 'Promoção', sector: 'Food', title: fp.title, seller: st.name, price: parsePrice(fp.price).price, unit: 'pedido', promo: fp.deal, icon: st.logo, companyId: st.id, go: { tab: 'food', cat: st.category || 'Todos', q: '' } });
  });
  listings.forEach((l) => {
    const pp = parsePrice(l.price);
    const label = (LISTING_KINDS.find((k) => k.key === l.kind) || {}).label || 'Anúncio';
    add({ id: 'l-' + l.id, kind: 'Anúncio', sector: label, title: l.title, seller: l.who, price: pp.price, unit: pp.unit || (/venda/.test(l.kind) ? 'venda' : ''), icon: '📣', go: { tab: 'home', top: 'anuncios', kind: l.kind } });
  });
  events.forEach((e) => {
    const g = (EVENT_GROUPS.find((x) => x.key === e.group) || {}).label || 'Eventos';
    add({ id: 'e-' + e.id, kind: 'Evento', sector: g, title: e.title, seller: e.who, price: parsePrice(e.price).price, unit: 'ingresso', promo: e.deal, icon: '🎉', go: { tab: 'home', top: 'eventos', group: e.group } });
  });
  (state.providers || []).forEach((p) => {
    const t = serviceTypes.find((x) => x.key === p.service) || {};
    add({ id: 'v-' + p.id, kind: 'Serviço', sector: t.label || 'Serviço', title: `${t.label || 'Serviço'} · ${p.name}`, seller: p.name, price: p.price, unit: unitOf(p.priceUnit), icon: t.icon || '🧑', go: { tab: 'servicos', service: p.service } });
  });
  specialists.forEach((d) =>
    add({ id: 'd-' + d.id, kind: 'Saúde', sector: d.specialty, title: `${d.specialty} · ${d.name}`, seller: d.name, price: d.price, unit: 'consulta', icon: '🩺', go: { tab: 'socorro', seg: 'especialistas', specialty: d.specialty } }),
  );
  allJobs(state).forEach((j) =>
    add({ id: 'j-' + j.id, kind: 'Vaga', sector: j.area || 'Empregos', title: j.title, seller: j.company, price: j.salary, unit: unitOf(j.salaryUnit) || 'mês', icon: '💼', go: { tab: 'vagas', job: j.id } }),
  );
  transitLines.forEach((l) => add({ id: 'tl-' + l.id, kind: 'Transporte', sector: 'Ônibus e metrô', title: `${l.code} ${l.name}`, seller: '', price: l.fare, unit: 'passagem', icon: '🚌', go: { tab: 'transporte', scope: 'municipal' } }));
  trips.forEach((t) => add({ id: 'tr-' + t.id, kind: 'Transporte', sector: 'Viagens de ônibus', title: `Ônibus ${t.from.split(' - ')[0]} para ${t.to.split(' - ')[0]}`, seller: '', price: t.price, unit: 'passagem', icon: '🚍', go: { tab: 'transporte', scope: t.scope } }));

  // O que os clientes dizem: depoimentos expostos nas páginas das empresas e posts públicos.
  const opinions = stores.map((s) => {
    // Depoimento com cara de notícia falsa ou golpe não entra no conhecimento.
    const reviews = businessOf(state, s.id).reviews.filter((r) => r.shown && checkText(r.text).verdict === 'ok');
    return { companyId: s.id, name: s.name, logo: s.logo, category: s.category, rating: ratingOf(reviews), count: reviews.length, reviews };
  });
  // Posts em verificação (suspeitos) ficam de fora até a moderação decidir; fake news nem chega aqui.
  const posts = (state.communityPosts || baseCommunityPosts).filter((c) => !c.flagged && checkText(c.text).verdict === 'ok').map((c) => c.text);
  const falseInfo = state.falseKnowledge || [];

  return { facts, opinions, posts, falseInfo, builtAt: Date.now() };
}

// Refaz só quando algo publicado mudou (é o "autoabastecer": nova publicação = novo conhecimento).
let cache = null;
export function knowledgeOf(state) {
  const keys = [state.products, state.stores, state.providers, state.myJobs, state.jobs, state.myBusiness, state.companyReviews, state.communityPosts, state.falseKnowledge];
  if (cache && cache.keys.length === keys.length && cache.keys.every((k, i) => k === keys[i])) return cache.kb;
  cache = { keys, kb: build(state) };
  return cache.kb;
}

// ---------------------------------------------------------------------------
// Análises

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

// Preço médio, faixa e o mais em conta. Só compara ofertas da mesma unidade (hora com hora, dia com dia).
export function priceStats(list) {
  const paid = list.filter((f) => f.price > 0);
  if (!paid.length) return null;
  const units = {};
  paid.forEach((f) => (units[f.unit] = (units[f.unit] || 0) + 1));
  const unit = Object.keys(units).sort((a, b) => units[b] - units[a])[0];
  const same = paid.filter((f) => f.unit === unit).sort((a, b) => a.price - b.price);
  const prices = same.map((f) => f.price);
  const avg = prices.reduce((s, x) => s + x, 0) / prices.length;
  return {
    n: same.length,
    unit,
    min: prices[0],
    max: prices[prices.length - 1],
    avg,
    median: median(prices),
    cheapest: same[0],
    priciest: same[same.length - 1],
    spreadPct: prices[0] ? Math.round(((prices[prices.length - 1] - prices[0]) / prices[0]) * 100) : 0,
    list: same,
  };
}

// Palavra principal do nome ("Café Torrado 500g" -> "cafe") para comparar o mesmo produto entre lojas.
const LEAD_SKIP = new Set(['kit', 'combo', 'pacote', 'jogo', 'conjunto', 'curso', 'servico']);
const leadOf = (f) => f.t.find((w) => w.length >= 3 && !/^\d/.test(w) && !LEAD_SKIP.has(w)) || f.t[0];

// Levantamento de mercado para o administrador.
export function marketReport(state) {
  const kb = knowledgeOf(state);
  const bySector = {};
  kb.facts.forEach((f) => (bySector[f.sector] = bySector[f.sector] || []).push(f));
  const sectors = Object.entries(bySector)
    .map(([sector, list]) => ({ sector, kind: list[0].kind, stats: priceStats(list), count: list.length }))
    .filter((x) => x.stats)
    .sort((a, b) => b.count - a.count);

  // Mesmo produto em lojas diferentes: onde a diferença de preço é maior.
  const byLead = {};
  kb.facts.filter((f) => f.kind === 'Produto').forEach((f) => (byLead[leadOf(f)] = byLead[leadOf(f)] || []).push(f));
  const spreads = Object.entries(byLead)
    .map(([lead, list]) => ({ lead, label: list[0].title.split(' ')[0], stats: priceStats(list), sellers: new Set(list.map((f) => f.seller)).size }))
    .filter((x) => x.stats && x.stats.n >= 2 && x.stats.spreadPct > 0)
    .sort((a, b) => b.stats.spreadPct - a.stats.spreadPct)
    .slice(0, 6);

  const services = sectors.filter((x) => x.kind === 'Serviço' || x.kind === 'Saúde');
  const promoFacts = kb.facts.filter((f) => f.promo);
  const launches = kb.facts.filter((f) => f.launch);
  const reputation = kb.opinions.filter((o) => o.rating).sort((a, b) => b.rating - a.rating || b.count - a.count);

  // O que os clientes mais comentam (posts públicos e depoimentos expostos).
  const STOP = new Set('a o e de da do das dos em no na nos nas um uma que pra para por com sem se ja mais muito foi tem ate realys demais meu minha seu sua ele ela isso esse essa pelo pela ao aos as os eu voce alguem bem tudo todo toda nao sim mas como so vez ainda aqui hoje dia ontem agora quem qual sao era sou ser esta estao ta vai vou'.split(' '));
  const freq = {};
  [...kb.posts, ...kb.opinions.flatMap((o) => o.reviews.map((r) => r.text))].forEach((t) =>
    words(t)
      .filter((w) => w.length >= 4 && !STOP.has(w) && !/^\d/.test(w))
      .forEach((w) => (freq[w] = (freq[w] || 0) + 1)),
  );
  const talk = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // O que entrou depois que o app abriu: é o que ela acabou de aprender.
  const baseIds = new Set(baseProducts.map((p) => p.id));
  const learned = [
    ...(state.products || []).filter((p) => !baseIds.has(p.id)).map((p) => ({ id: 'p' + p.id, icon: p.emoji || '🆕', text: `Produto novo: ${p.name}`, sub: (state.stores.find((s) => s.id === p.storeId) || {}).name })),
    ...Object.entries(state.companyReviews || {}).flatMap(([cid, list]) => list.map((r) => ({ id: 'r' + r.id, icon: '⭐', text: `Depoimento novo (${r.stars} estrelas)`, sub: (state.stores.find((s) => s.id === cid) || {}).name }))),
    ...((state.myBusiness && state.myBusiness.newAds) || []).map((ad) => ({ id: 'a' + ad.id, icon: '🎬', text: `Propaganda nova: ${ad.title}`, sub: 'sua empresa' })),
    ...((state.communityPosts || []).filter((c) => !baseCommunityPosts.some((b) => b.id === c.id)).map((c) => ({ id: 'c' + c.id, icon: '💬', text: 'Post novo na Comunidade', sub: c.author }))),
  ];

  const discarded = {
    count: kb.falseInfo.length,
    flagged: (state.communityPosts || []).filter((c) => c.flagged).length,
    list: kb.falseInfo.slice(0, 8),
  };
  const companies = new Set(kb.facts.map((f) => f.seller).filter(Boolean)).size;
  return {
    totals: { facts: kb.facts.length, companies, reviews: kb.opinions.reduce((s, o) => s + o.count, 0), posts: kb.posts.length },
    builtAt: kb.builtAt,
    sectors,
    spreads,
    services,
    promos: { count: promoFacts.length },
    launches: launches.length,
    reputation,
    talk,
    learned,
    discarded,
  };
}

// ---------------------------------------------------------------------------
// Respostas para os clientes

export const PRICE_Q = /\b(quanto (custa|custam|ta|esta|e|sai|saem|cobra\w*|fica|ficam)|preco\w*|valor(es)?|media|mais barat\w*|mais car\w*|em conta|ta caro|esta caro|e caro|ta barato|esta barato|vale a pena|compar\w*|pesquisa de preco|faixa de preco|custa)\b/;
export const OPINION_Q = /\b(o que (falam|acham|dizem|estao falando|o pessoal (fala|acha))|opiniao|opinioes|avaliac\w*|depoimento\w*|reputacao|e confiavel|e bo[am]|sao bo[ans]|nota d[aeo]s?|recomenda\w*)\b/;

const ASK_STOP = new Set(
  'quanto custa custam ta esta e sai saem cobra cobram fica ficam preco precos valor valores media mais barato barata baratos baratas caro cara caros caras em conta vale pena comparar compara pesquisa de da do das dos um uma uns umas o a os as no na nos nas pra para por com que qual quais onde tem ter me eu meu minha lotus realys hoje agora aqui perto reais real r faixa voce sabe dizer fala falar ai la isso esse essa em media custando cobrando'
    .split(' ')
    .map(stem),
);

// Valor que o cliente citou: "achei por 30 reais", "R$ 25,90".
function valueOf(text) {
  const m = norm(text).match(/(?:r\$\s*)?(\d+(?:[.,]\d{1,2})?)\s*(reais|real|conto|pila)?/);
  if (!m || (!m[2] && !/r\$/.test(norm(text)) && !/\bpor\s+\d/.test(norm(text)))) return null;
  return Number(m[1].replace(',', '.'));
}

const fmt = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.');
const per = (unit) => (unit && !['unidade', 'venda'].includes(unit) ? ` por ${unit}` : '');

function toResult(f) {
  return { id: 'k-' + f.id, section: `${f.kind} · ${f.sector}`, icon: f.icon, title: f.title, subtitle: f.seller, priceValue: f.price, priceUnit: f.unit && f.unit !== 'unidade' ? f.unit : '', go: f.go };
}

// Acha as ofertas do assunto perguntado. O nome vale mais que o setor, e o setor mais que quem vende.
// "café" fica com "Café Torrado" e "Café Especial", não com "Máquina de café".
function factsFor(kb, query) {
  const q = stems(query).filter((w) => w.length >= 3 && !ASK_STOP.has(w) && !/^\d/.test(w));
  if (!q.length) return { q, list: [] };
  let best = 0;
  const scored = kb.facts.map((f) => {
    const sc = q.reduce((n, w) => n + (f.t.includes(w) ? 2 : f.s.includes(w) ? 1.5 : f.w.includes(w) ? 0.5 : 0), 0);
    if (sc > best) best = sc;
    return [f, sc];
  });
  if (best < 1.5) return { q, list: [] };
  let list = scored.filter(([, sc]) => sc === best).map(([f]) => f);
  const lead = list.filter((f) => q.includes(leadOf(f)));
  if (lead.length) list = lead;
  return { q, list };
}

// "Quanto custa um eletricista?", "onde o café está mais barato?", "R$ 30 no café está caro?"
export function priceAnswer(state, text) {
  const t = norm(text);
  if (!PRICE_Q.test(t)) return null;
  const kb = knowledgeOf(state);
  const { q, list } = factsFor(kb, text);
  if (!list.length) return null;
  const st = priceStats(list);
  if (!st) return null;
  // Assunto da resposta: a palavra da pergunta que achou as ofertas ("eletricista", "café", "hotel").
  const f0 = list[0];
  const raw = String(text).split(/[^A-Za-zÀ-ú0-9]+/).filter(Boolean);
  const inTitle = raw.find((w) => {
    const k = SAME[stem(norm(w))] || stem(norm(w));
    return q.includes(k) && f0.t.includes(k);
  });
  const topic = inTitle ? inTitle.toLowerCase() : f0.sector.toLowerCase();
  const by = (f) => (f.seller && !f.title.includes(f.seller) ? `, de ${f.seller}` : '');
  const wantsPricey = /\bmais car/.test(t);
  const pick = wantsPricey ? st.priciest : st.cheapest;
  let reply;
  if (st.n === 1) {
    reply = `Pelo que foi publicado no Realys, encontrei uma oferta de ${topic}: ${pick.title}${by(pick)}, por ${fmt(pick.price)}${per(st.unit)}.`;
  } else {
    reply =
      `Pelo que foi publicado no Realys, ${topic} sai em média ${fmt(st.avg)}${per(st.unit)}, de ${fmt(st.min)} a ${fmt(st.max)}, em ${st.n} ofertas. ` +
      `${wantsPricey ? 'A mais cara' : 'A mais em conta'} é ${pick.title}${by(pick)}, por ${fmt(pick.price)}.`;
  }
  const v = valueOf(text);
  if (v && st.n > 1) {
    const diff = Math.round(((v - st.avg) / st.avg) * 100);
    reply += diff > 5 ? ` ${fmt(v)} está ${diff}% acima da média.` : diff < -5 ? ` ${fmt(v)} está ${-diff}% abaixo da média, um bom preço.` : ` ${fmt(v)} está dentro da média.`;
  }
  const results = (wantsPricey ? [...st.list].reverse() : st.list).slice(0, 6).map(toResult);
  return { reply, results, knowledge: true };
}

// "O que falam da Pizzaria da Praça?", "o Mercadinho é bom?"
export function opinionAnswer(state, text) {
  const t = norm(text);
  if (!OPINION_Q.test(t)) return null;
  const kb = knowledgeOf(state);
  const ws = stems(text).filter((w) => w.length >= 3 && !ASK_STOP.has(w));
  let best = null;
  kb.opinions.forEach((o) => {
    const name = stems(o.name).filter((w) => w.length >= 3);
    const hit = name.filter((w) => ws.includes(w)).length;
    if (hit && (!best || hit > best.hit)) best = { o, hit };
  });
  if (!best) return null;
  const o = best.o;
  if (!o.count) return { reply: `${o.name} ainda não tem depoimentos expostos de quem comprou.`, knowledge: true, open: null };
  const top = [...o.reviews].sort((a, b) => b.stars - a.stars)[0];
  const who = (members.find((m) => m.id === top.who) || {}).name || 'um cliente';
  const quote = top.text.split(/[.!?]/)[0].trim();
  const low = o.reviews.filter((r) => r.stars <= 3).length;
  const reply =
    `${o.name} tem nota ${String(o.rating).replace('.', ',')} em ${o.count} ${o.count === 1 ? 'depoimento' : 'depoimentos'} de quem comprou pelo Realys. ` +
    `${who.split(' ')[0]} contou: "${quote}".` +
    (low ? ` ${low === 1 ? 'Um cliente deu' : `${low} clientes deram`} nota mais baixa, então vale ler os depoimentos.` : '');
  return {
    reply,
    knowledge: true,
    results: [{ id: 'k-op-' + o.companyId, section: 'Página da empresa', icon: o.logo, title: o.name, subtitle: `★ ${String(o.rating).replace('.', ',')} · ${o.count} depoimentos`, companyId: o.companyId }],
  };
}

// "É verdade que a gasolina vai a R$ 15 amanhã?": confere nas informações marcadas como falsas.
export function truthAnswer(state, text) {
  const kb = knowledgeOf(state);
  const t = norm(text);
  const f = matchFalse(kb.falseInfo, text);
  if (f)
    return {
      knowledge: true,
      falseInfo: true,
      reply: `Não é verdade. "${f.claim}" foi verificado pela IA do Realys como informação falsa e retirado da plataforma${f.reason ? ` (${f.reason})` : ''}. Desconfie de mensagens assim e não repasse.`,
    };
  if (!ASK_TRUTH.test(t)) return null;
  const c = checkText(text);
  if (c.verdict !== 'ok')
    return {
      knowledge: true,
      falseInfo: true,
      reply: `Isso tem cara de informação falsa: ${c.reasons.join(', ')}. Não encontrei nada no Realys que confirme. Confira em fontes oficiais antes de acreditar ou repassar.`,
    };
  return null;
}

export function knowledgeAnswer(state, text) {
  try {
    return truthAnswer(state, text) || opinionAnswer(state, text) || priceAnswer(state, text);
  } catch (e) {
    return null;
  }
}
