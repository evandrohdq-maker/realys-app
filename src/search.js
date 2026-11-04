// Busca geral do Realys: procura em TODO o conteúdo do app (anúncios, hotéis, imóveis,
// eventos, cursos, lojas, produtos, promoções, prestadores, lives, pessoas e posts).
// Usada pelo assistente de voz quando o pedido não é um comando específico.
// Na versão real isso vira uma busca no servidor, com os cadastros reais.
import { listings, LISTING_KINDS, promos, lives, communityPosts, events, EVENT_GROUPS } from './homeData';
import { serviceTypes } from './data';
import { members } from './people';
import { allJobs } from './store';
import { sectorItems } from './techAgroData';
import { emergencyNumbers, hospitals, specialists, responders, transitLines, trips, transitCompanies, artists, artMedia } from './extraData';

const norm = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

// Plural → singular simples (hotéis → hotel, pousadas → pousada, lojões → lojão).
export function stem(w) {
  if (w.length <= 3) return w;
  if (w.endsWith('oes') || w.endsWith('aes')) return w.slice(0, -3) + 'ao';
  if (w.endsWith('eis')) return w.slice(0, -3) + 'el';
  if (w.endsWith('ais')) return w.slice(0, -3) + 'al';
  if (w.endsWith('ois')) return w.slice(0, -3) + 'ol';
  if (w.endsWith('ns')) return w.slice(0, -2) + 'm';
  if (w.endsWith('res') || w.endsWith('zes') || w.endsWith('ses')) return w.slice(0, -2);
  if (w.endsWith('s')) return w.slice(0, -1);
  return w;
}

const words = (s) => norm(s).split(/[^a-z0-9]+/).filter(Boolean);

// Palavras que não ajudam a achar nada ("Realys, tem algum hotel perto de mim?").
const STOP = new Set(
  (
    'realys reales rayles realis preciso precisando quero queria gostaria tem tenho algum alguma alguns algumas ' +
    'perto proximo proxima mim me meu minha um uma uns umas o a os as de do da dos das no na nos nas em para pra pro ' +
    'com sem por e ou que eu voce vc ver veja mostra mostre mostrar procura procuro procurar pesquisa pesquisar ' +
    'busca buscar busco encontrar encontra acha achar ache qual quais onde como tipo algo coisa favor hoje agora aqui ' +
    'ai la isso esse essa este esta bom boa bons boas melhor melhores barato barata existe ha sobre lista quanto custa ' +
    'oi ola ok sim nao favor obrigado'
  ).split(' ')
);

// Sinônimos: o que a pessoa fala → palavras que aparecem no conteúdo.
const SYN = {
  hotel: ['hotel', 'pousada', 'hospedagem'],
  pousada: ['pousada', 'hotel', 'hospedagem'],
  hospedagem: ['hotel', 'pousada', 'diaria'],
  hostel: ['hotel', 'pousada'],
  resort: ['hotel', 'pousada'],
  dormir: ['hotel', 'pousada'],
  aluguel: ['aluguel', 'alugar', 'locacao', 'locadora'],
  alugar: ['aluguel', 'alugar', 'locacao', 'locadora'],
  locacao: ['aluguel', 'alugar', 'locadora'],
  apartamento: ['apartamento', 'kitnet', 'imovel'],
  ape: ['apartamento', 'kitnet'],
  apto: ['apartamento', 'kitnet'],
  imovel: ['imovel', 'apartamento', 'casa', 'sala', 'kitnet', 'galpao'],
  balada: ['noturna', 'balada', 'club', 'evento'],
  festa: ['festa', 'evento', 'salao'],
  show: ['show', 'evento', 'noturna'],
  ingresso: ['ingresso', 'evento'],
  curso: ['curso', 'faculdade', 'pos'],
  faculdade: ['faculdade', 'graduacao', 'ead'],
  aula: ['aula', 'curso', 'professor'],
  hamburguer: ['burguer', 'hamburguer'],
  lanche: ['burguer', 'lanche'],
  comida: ['alimentacao', 'pizza', 'burguer'],
  fome: ['alimentacao', 'pizza', 'burguer'],
  restaurante: ['alimentacao', 'pizzaria', 'burguer'],
  roupa: ['roupa', 'moda', 'camiseta'],
  celular: ['eletronico', 'carregador', 'fone'],
  oferta: ['promocao', 'oferta', 'desconto'],
  promocao: ['promocao', 'oferta', 'desconto'],
  desconto: ['promocao', 'desconto'],
  hospital: ['hospital', 'upa', 'pronto', 'clinica'],
  upa: ['upa', 'hospital', 'pronto'],
  ambulancia: ['ambulancia', 'samu', 'remocao', 'uti'],
  socorro: ['socorro', 'samu', 'emergencia', 'ambulancia'],
  emergencia: ['emergencia', 'samu', 'socorro', 'bombeiros'],
  medico: ['medico', 'especialista', 'clinico', 'consulta'],
  doutor: ['medico', 'especialista', 'consulta'],
  consulta: ['consulta', 'especialista', 'medico'],
  onibus: ['onibus', 'linha', 'transporte', 'viagem'],
  metro: ['metro', 'linha', 'transporte'],
  passagem: ['passagem', 'viagem', 'onibus'],
  rodoviaria: ['viagem', 'passagem', 'onibus'],
  musica: ['musica', 'faixa', 'mp3', 'artista'],
  cantor: ['artista', 'musica'],
  banda: ['artista', 'banda', 'musica'],
  clipe: ['video', 'clipe'],
  quadro: ['obra', 'pintura'],
  pintura: ['obra', 'pintura', 'aquarela'],
  vaga: ['vaga', 'emprego'],
  emprego: ['emprego'],
  trabalhar: ['emprego'],
  lancamento: ['lancamento', 'novidade', 'novo'],
  ia: ['ia', 'inteligencia', 'artificial', 'robo'],
  inteligencia: ['ia', 'inteligencia'],
  robo: ['robo', 'robotica', 'robotico'],
  robotica: ['robotica', 'robo', 'arduino'],
  app: ['app', 'aplicativo', 'sistema'],
  aplicativo: ['app', 'aplicativo', 'sistema'],
  tecnologia: ['tecnologia', 'ia', 'robotica', 'app'],
  agro: ['agro', 'agricola', 'lavoura', 'fazenda', 'safra'],
  agricultura: ['agro', 'agricola', 'lavoura', 'plantio'],
  fazenda: ['fazenda', 'agro', 'lavoura'],
  lavoura: ['lavoura', 'agro', 'safra'],
  semente: ['semente', 'muda'],
  adubo: ['adubo', 'fertilizante'],
  trator: ['trator', 'colheitadeira', 'maquina'],
  drone: ['drone', 'pulverizacao'],
  praga: ['praga', 'lavoura', 'agronomo'],
  agronomo: ['agronomo', 'agricola'],
  gado: ['gado', 'boi', 'bezerro', 'rebanho', 'pecuaria', 'nelore'],
  boi: ['boi', 'gado', 'rebanho'],
  vaca: ['gado', 'leite', 'ordenha', 'rebanho'],
  pecuaria: ['pecuaria', 'gado', 'rebanho'],
  leilao: ['leilao', 'lote'],
  leite: ['leite', 'ordenha', 'laticinio'],
  cafe: ['cafe'],
  soja: ['soja', 'grao'],
  milho: ['milho', 'grao'],
  grao: ['grao', 'soja', 'milho', 'silo'],
  horta: ['horta', 'hortalica', 'hortifruti', 'estufa'],
  hortifruti: ['hortifruti', 'hortalica', 'horta'],
  novidade: ['lancamento', 'novidade', 'novo'],
};

const variants = (tok) => {
  const s = stem(tok);
  return [...new Set([s, ...(SYN[s] || []), ...(SYN[tok] || [])].map(stem))];
};

const queryTokens = (text) => words(text).filter((w) => !STOP.has(w) && w.length >= 2);

// Uma palavra da busca bate com o texto se for igual ou o começo de uma palavra (pizza → pizzaria).
function tokenHits(variantsList, hayStems) {
  return variantsList.some((v) => hayStems.some((h) => h === v || (v.length >= 4 && h.startsWith(v))));
}

const short = (s) => String(s || '').split(',')[0].split(' - ')[0];

const kindLabel = (k) => (LISTING_KINDS.find((x) => x.key === k) || {}).label || '';

// Monta o índice de tudo que existe no app.
function buildIndex(state) {
  const items = [];
  const add = (it, ...texts) => items.push({ ...it, hay: words(texts.join(' ')).map(stem), titleHay: words(it.title).map(stem) });

  listings.forEach((l) =>
    add(
      { id: 'l-' + l.id, section: kindLabel(l.kind), icon: '📣', title: l.title, subtitle: `${l.who} · ${l.place}`, price: l.price, where: short(l.place), photo: l.photo, sponsored: l.sponsored, go: { tab: 'home', top: 'anuncios', kind: l.kind } },
      l.title, l.detail, l.place, l.who, kindLabel(l.kind), 'anuncio', l.kind === 'hotel' ? 'hotel pousada hospedagem diaria' : ''
    )
  );

  events.forEach((e) => {
    const g = (EVENT_GROUPS.find((x) => x.key === e.group) || {}).label || 'Eventos';
    add(
      { id: 'e-' + e.id, section: g, icon: '🎉', title: e.title, subtitle: `${e.who} · ${e.when}`, price: e.price, where: short(e.place), photo: e.photo, sponsored: e.sponsored, go: { tab: 'home', top: 'eventos', group: e.group } },
      e.title, e.detail, e.place, e.who, g, 'evento festa', e.deal ? 'promocao oferta desconto' : ''
    );
  });

  (state.stores || []).forEach((s) =>
    add(
      { id: 's-' + s.id, section: 'Loja', icon: s.logo, title: s.name, subtitle: `${s.category} · ${s.city} · ★ ${s.rating}`, where: short(s.city), photo: s.cover, sponsored: s.sponsored, go: { tab: 'loja', cat: 'Todos', q: s.name }, companyId: s.id },
      s.name, s.category, s.city, 'loja', s.shipsBrazil ? 'envia para todo o brasil entrega' : ''
    )
  );

  (state.products || []).forEach((p) => {
    const store = (state.stores || []).find((s) => s.id === p.storeId) || {};
    const promo = promos.find((x) => x.productId === p.id);
    add(
      { id: 'p-' + p.id, section: promo ? `Promoção -${promo.off}%` : 'Produto', icon: p.emoji, title: p.name, subtitle: store.name || '', where: store.name, priceValue: p.price, go: promo ? { tab: 'home', top: 'promo' } : { tab: 'loja', cat: 'Todos', q: p.name } },
      p.name, store.name, store.category, 'produto', promo ? 'promocao oferta desconto' : '', p.launch ? 'lancamento novidade novo' : ''
    );
  });

  // Empregos: vagas de empresas verificadas.
  allJobs(state).forEach((j) =>
    add(
      { id: 'j-' + j.id, section: 'Vaga de emprego', icon: '💼', title: j.title, subtitle: `${j.company} · ${j.type}`, priceValue: j.salary, priceUnit: j.salaryUnit ? j.salaryUnit.replace('por ', '') : 'mês', where: j.company, sponsored: j.sponsored, go: { tab: 'vagas', job: j.id } },
      j.title, j.company, j.area, j.type, j.city, 'vaga emprego trabalho'
    )
  );

  (state.providers || []).forEach((p) => {
    const t = serviceTypes.find((x) => x.key === p.service) || {};
    add(
      { id: 'v-' + p.id, section: t.label || 'Serviço', icon: t.icon || '🧑', title: p.name, subtitle: `${p.functions.slice(0, 2).join(', ')} · ${p.distanceKm.toFixed(1).replace('.', ',')} km`, priceValue: p.price, priceUnit: p.priceUnit, where: `a ${p.distanceKm.toFixed(1).replace('.', ',')} km`, photo: p.photo, go: { tab: 'servicos', service: p.service } },
      p.name, t.label, t.group, p.functions.join(' '), (t.words || []).join(' '), 'servico prestador'
    );
  });

  lives.forEach((l) =>
    add(
      { id: 'lv-' + l.id, section: 'Live', icon: '🔴', title: l.title, subtitle: `${l.host} · ${l.viewers} assistindo`, where: `live de ${l.host}`, photo: l.photo, sponsored: l.sponsored, go: { tab: 'home', top: 'lives', live: l.aula ? 'aulas' : 'todas' } },
      l.title, l.host, l.tag, 'live ao vivo', l.aula ? 'aula' : ''
    )
  );

  members.forEach((m) =>
    add(
      { id: 'u-' + m.id, section: 'Pessoa', icon: '👤', title: m.name, subtitle: `@${m.handle} · ${m.city}`, where: short(m.city), photo: m.photo, profileId: m.id },
      m.name, m.handle, m.city, m.bio, 'pessoa perfil'
    )
  );

  // Socorro e saúde.
  emergencyNumbers.forEach((e) =>
    add(
      { id: 'em-' + e.key, section: 'Emergência', icon: '🚨', title: `${e.label} · ${e.number}`, subtitle: e.hint, where: `ligue ${e.number}`, go: { tab: 'socorro', seg: 'emergencia' } },
      e.label, e.hint, e.words.join(' '), 'emergencia socorro sos ligar'
    )
  );
  hospitals.forEach((h) =>
    add(
      { id: 'h-' + h.id, section: 'Hospital', icon: '🏥', title: h.name, subtitle: `${h.type} · ${h.network} · ${h.distanceKm.toFixed(1).replace('.', ',')} km`, where: `a ${h.distanceKm.toFixed(1).replace('.', ',')} km`, photo: h.photo, go: { tab: 'socorro', seg: 'hospitais' } },
      h.name, h.type, h.network, 'hospital pronto socorro saude'
    )
  );
  specialists.forEach((d) =>
    add(
      { id: 'd-' + d.id, section: d.specialty, icon: '🩺', title: d.name, subtitle: `${d.specialty} · ${d.reg}`, priceValue: d.price, priceUnit: 'consulta', where: `a ${d.distanceKm.toFixed(1).replace('.', ',')} km`, photo: d.photo, go: { tab: 'socorro', seg: 'especialistas', specialty: d.specialty } },
      d.name, d.specialty, 'medico especialista consulta saude', d.tele ? 'teleconsulta' : ''
    )
  );
  responders.forEach((r) =>
    add(
      { id: 'r-' + r.id, section: 'Socorro', icon: '🚑', title: r.name, subtitle: `${r.kind} · ${r.price}`, where: `chega em ${r.etaMin} minutos`, go: { tab: 'socorro', seg: 'socorristas' } },
      r.name, r.kind, 'socorro emergencia'
    )
  );

  // Transporte público.
  transitLines.forEach((l) =>
    add(
      { id: 'tl-' + l.id, section: 'Transporte público', icon: '🚌', title: `${l.code} · ${l.name}`, subtitle: (transitCompanies.find((c) => c.id === l.companyId) || {}).name, priceValue: l.fare, priceUnit: 'passagem', where: 'passa perto de você', go: { tab: 'transporte', scope: 'municipal' } },
      l.code, l.name, l.stops.join(' '), 'onibus metro linha transporte publico'
    )
  );
  trips.forEach((t) =>
    add(
      { id: 'tr-' + t.id, section: t.scope === 'interestadual' ? 'Viagem interestadual' : 'Viagem intermunicipal', icon: '🚍', title: `${t.from.split(' - ')[0]} → ${t.to.split(' - ')[0]} · ${t.depart}`, subtitle: `${(transitCompanies.find((c) => c.id === t.companyId) || {}).name} · ${t.kind}`, priceValue: t.price, priceUnit: 'passagem', where: `saída ${t.depart}`, go: { tab: 'transporte', scope: t.scope } },
      t.to, t.from, t.kind, 'onibus viagem passagem rodoviaria transporte'
    )
  );

  // Artistas e suas músicas, vídeos e obras.
  artists.forEach((a) =>
    add(
      { id: 'a-' + a.id, section: 'Artista', icon: a.logo, title: a.name, subtitle: `${a.genre} · ${a.city}`, where: short(a.city), photo: a.cover, companyId: a.id },
      a.name, a.genre, a.city, a.bio, 'artista musica'
    )
  );
  artMedia.forEach((m) => {
    const a = artists.find((x) => x.id === m.ownerId) || {};
    add(
      { id: 'am-' + m.id, section: m.kind === 'musica' ? 'Música' : m.kind === 'video' ? 'Vídeo' : 'Obra', icon: m.kind === 'musica' ? '🎵' : m.kind === 'video' ? '🎬' : '🖼️', title: m.title, subtitle: a.name, where: a.name, photo: m.cover, companyId: a.id },
      m.title, a.name, a.genre, m.kind === 'musica' ? 'musica faixa mp3' : m.kind === 'video' ? 'video clipe' : 'obra pintura arte'
    );
  });

  // Tecnologia e Agro (os itens "agro é tech" respondem pelas duas palavras).
  sectorItems.forEach((it) =>
    add(
      { id: 'ta-' + it.id, section: it.agrotech ? 'Agro é tech' : it.sector === 'tech' ? 'Tecnologia' : 'Agro', icon: it.icon, title: it.title, subtitle: it.who, price: it.price == null ? 'sob orçamento' : it.price === 0 ? 'grátis' : undefined, priceValue: it.price ? it.price : undefined, priceUnit: it.unit, where: it.who, photo: it.photo, sponsored: it.sponsored, go: it.go || { tab: it.sector === 'tech' ? 'tecnologia' : 'agro', seg: it.seg } },
      it.title, it.who, it.detail, it.sector === 'tech' ? 'tecnologia' : 'agro agricola agronegocio', it.agrotech ? 'agro tecnologia agrotech' : '', (it.chains || []).map((c) => ({ graos: 'grao graos soja milho', cafe: 'cafe', pecuaria: 'pecuaria gado boi rebanho', horti: 'hortifruti horta hortalica', leite: 'leite' }[c])).join(' '), it.seg === 'cursos' ? 'curso aula evento' : it.seg === 'robotica' ? 'robotica robo' : it.seg === 'maquinas' ? 'maquina aluguel' : ''
    )
  );

  communityPosts.forEach((c) =>
    add(
      { id: 'c-' + c.id, section: 'Comunidade', icon: '💬', title: c.author, subtitle: c.text, go: { tab: 'home', top: 'comunidade', seg: 'posts' } },
      c.author, c.text, 'comunidade post'
    )
  );

  return items;
}

// Devolve { results, tokens }. Ganha quem bate com mais palavras; patrocinados primeiro no empate.
export function searchAll(state, text, max = 8) {
  const tokens = queryTokens(text);
  // Para falar de volta com acento ("hotéis", não "hoteis").
  const label = String(text).split(/[^\p{L}\p{N}]+/u).filter((w) => w && tokens.includes(norm(w))).join(' ').toLowerCase();
  if (!tokens.length) return { results: [], tokens, label };
  const vs = tokens.map(variants);
  const scored = buildIndex(state)
    .map((it) => ({ it, score: vs.filter((v) => tokenHits(v, it.hay)).length, inTitle: vs.filter((v) => tokenHits(v, it.titleHay)).length }))
    .filter((x) => x.score > 0);
  if (!scored.length) return { results: [], tokens, label };
  const best = Math.max(...scored.map((x) => x.score));
  const results = scored
    .filter((x) => x.score === best)
    .sort((a, b) => b.inTitle - a.inTitle || (b.it.sponsored ? 1 : 0) - (a.it.sponsored ? 1 : 0))
    .slice(0, max)
    .map((x) => x.it);
  return { results, tokens, label };
}

// Resposta falada da busca geral.
export function contentReply(results, what) {
  if (!results.length) return `Não encontrei nada sobre "${what}" no Realys. Tente outra palavra.`;
  const priceOf = (r) => r.price || (r.priceValue != null ? `R$ ${r.priceValue.toFixed(2).replace('.', ',')}${r.priceUnit ? ' por ' + r.priceUnit : ''}` : '');
  const top = results.slice(0, 3).map((r) => {
    const p = priceOf(r);
    const where = r.where ? `, ${r.where}` : '';
    return `${r.title}${where}${p ? ', ' + p : ''}`;
  });
  const n = results.length;
  return (
    `Encontrei ${n} ${n > 1 ? 'resultados' : 'resultado'} para "${what}". ` +
    `${top.join('; ')}.` +
    (n > 3 ? ` E mais ${n - 3} na lista.` : '') +
    ' Toque em um resultado para abrir.'
  );
}

// Palavras que indicam claramente busca de conteúdo, não de prestador
// (ex.: "alugar um carro" é anúncio, não corrida).
export const CONTENT_WORDS = /\b(hote(l|is)|pousadas?|hospedage(m|ns)|aluga(r|mos)?|aluguel|locacao|imove(l|is)|apartamentos?|ape|kitnet|casas? (a|para) venda|ingressos?|balada|casa noturna|shows?|cursos?|faculdades?|lives?|promocao|promocoes|ofertas?|lojas?|produtos?|hospita(l|is)|upa|samu|ambulancias?|medic(o|a|os|as)|especialistas?|consultas?|pediatra|cardiologista|dentista|onibus|metro|passage(m|ns)|rodoviaria|artistas?|clipes?|vagas?|empregos?|lancamentos?|novidades?|tecnologia|robotica|robos?|inteligencia artificial|agro|agronegocio|sementes?|adubos?|trator(es)?|colheitadeiras?|fazendas?|gado|pecuaria|leilao|leiloes|bezerros?|ordenhadeiras?|hortifruti|estufas?)\b/;
