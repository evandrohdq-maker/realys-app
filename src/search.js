// Busca geral do Realys: procura em TODO o conteúdo do app (anúncios, hotéis, imóveis,
// eventos, cursos, lojas, produtos, promoções, prestadores, lives, pessoas e posts).
// Usada pelo assistente de voz quando o pedido não é um comando específico.
// Na versão real isso vira uma busca no servidor, com os cadastros reais.
import { listings, LISTING_KINDS, promos, lives, communityPosts, events, EVENT_GROUPS } from './homeData';
import { serviceTypes, isFoodStore } from './data';
import { foodPromos, barSpots } from './foodData';
import { members } from './people';
import { signatureOf } from './userPages';
import { socialLabel, socialSearchText } from './socialClasses';
import { allJobs } from './store';
import { sectorItems } from './techAgroData';
import { SHOP_SECTORS, shopSectorItems } from './shopSectorsData';
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

// Palavras que não ajudam a achar nada ("Lotus, tem algum hotel perto de mim?").
const STOP = new Set(
  (
    'realys reales rayles realis lotus lotos preciso precisando quero queria gostaria tem tenho algum alguma alguns algumas ' +
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
// Palavras de cada assunto de live, para a busca achar "live de games", "podcast", "jornal ao vivo".
const LIVE_WORDS = {
  gamers: 'gamer gamers game games jogo jogos gameplay campeonato torneio',
  artistas: 'artista artistas show musica cantor banda',
  cursos: 'curso cursos aula aulas oficina treino',
  faculdades: 'faculdade faculdades universidade aula aberta',
  tecnologia: 'tecnologia tech ia inteligencia artificial computador pc',
  noticias: 'noticia noticias noticiario noticiarios jornal boletim',
  podcasts: 'podcast podcasts papo entrevista',
  compras: 'compras venda ao vivo atacado',
  noite: 'festa balada noite',
  comunidade: 'comunidade bate papo',
};

function buildIndex(state) {
  const items = [];
  const add = (it, ...texts) => items.push({ ...it, hay: words(texts.join(' ')).map(stem), titleHay: words(it.title).map(stem) });

  listings.forEach((l) =>
    add(
      { id: 'l-' + l.id, section: kindLabel(l.kind), icon: '📣', title: l.title, subtitle: `${l.who} · ${l.place}`, price: l.price, where: short(l.place), km: l.km, photo: l.photo, sponsored: l.sponsored, go: { tab: 'home', top: 'anuncios', kind: l.kind } },
      // Hotéis não levam o nome do setor ("Hotéis e pousadas"), para "pousada" achar só as pousadas.
      l.title, l.detail, l.place, l.who, l.kind === 'hotel' ? 'hospedagem diaria' : kindLabel(l.kind), 'anuncio'
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
      { id: 's-' + s.id, section: isFoodStore(s) ? 'Food' : 'Loja', icon: s.logo, title: s.name, subtitle: `${s.category} · ${s.city} · ★ ${s.rating}`, where: short(s.city), photo: s.cover, sponsored: s.sponsored, go: { tab: isFoodStore(s) ? 'food' : 'loja', cat: isFoodStore(s) ? s.category : 'Todos', q: s.name }, companyId: s.id },
      s.name, s.category, s.city, isFoodStore(s) ? 'food comida restaurante bar' : 'loja', s.shipsBrazil ? 'envia para todo o brasil entrega' : ''
    )
  );

  // Páginas de usuários (assinadas ou anônimas) e os posts publicados nelas.
  (state.userPages || []).forEach((pg) => {
    add(
      { id: 'pg-' + pg.id, section: 'Página', icon: '📄', title: pg.name, subtitle: signatureOf(pg), photo: pg.cover, pageId: pg.id, go: { tab: 'paginas', pageId: pg.id } },
      pg.name, pg.about, pg.category, 'pagina paginas comunidade'
    );
    (pg.posts || []).filter((p) => !p.flagged).forEach((p) =>
      add({ id: 'pgp-' + pg.id + p.id, section: 'Post de página', icon: '📝', title: p.text.slice(0, 60), subtitle: pg.name, photo: p.photo, pageId: pg.id }, p.text, pg.name, 'post pagina')
    );
  });

  // Food: promoções de restaurantes e bares/happy hour.
  foodPromos.forEach((fp) => {
    const st = (state.stores || []).find((s) => s.id === fp.storeId) || {};
    add(
      { id: 'fp-' + fp.id, section: 'Food · Promoção', icon: st.logo || '🍽️', title: fp.title, subtitle: `${st.name || ''} · ${fp.when}`, price: fp.price, where: st.name, photo: fp.photo, sponsored: fp.sponsored, go: { tab: 'food', cat: 'Todos', q: '', seg: 'promo' } },
      fp.title, st.name, 'food comida restaurante promocao oferta desconto', fp.deal
    );
  });
  barSpots.forEach((b) =>
    add(
      { id: 'bar-' + b.id, section: 'Food · Bares', icon: '🍻', title: b.name, subtitle: `${b.vibe} · ${b.when}`, photo: b.photo, sponsored: b.sponsored, go: { tab: 'food', cat: 'Bares', q: '' } },
      b.name, b.vibe, b.music, 'bar bares happy hour chope drinks food'
    )
  );

  (state.products || []).forEach((p) => {
    const store = (state.stores || []).find((s) => s.id === p.storeId) || {};
    const promo = promos.find((x) => x.productId === p.id);
    add(
      { id: 'p-' + p.id, section: promo ? `Promoção -${promo.off}%` : 'Produto', icon: p.emoji, title: p.name, subtitle: store.name || '', where: store.name, priceValue: p.price, // leva até a loja já mostrando o próprio produto (filtrado pelo nome)
        go: isFoodStore(store) ? { tab: 'food', cat: 'Todos', q: p.name } : { tab: 'loja', cat: 'Todos', q: p.name } },
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
      { id: 'v-' + p.id, section: t.label || 'Serviço', icon: t.icon || '🧑', title: p.name, subtitle: `${p.functions.slice(0, 2).join(', ')} · ${p.distanceKm.toFixed(1).replace('.', ',')} km`, priceValue: p.price, priceUnit: p.priceUnit, where: `a ${p.distanceKm.toFixed(1).replace('.', ',')} km`, photo: p.photo, providerId: p.id, go: { tab: 'servicos', service: p.service } },
      p.name, t.label, t.group, p.functions.join(' '), (t.words || []).join(' '), 'servico prestador'
    );
  });

  lives.forEach((l) =>
    add(
      { id: 'lv-' + l.id, section: 'Live', icon: '🔴', title: l.title, subtitle: `${l.host} · ${l.viewers} assistindo`, where: `live de ${l.host}`, photo: l.photo, sponsored: l.sponsored, go: { tab: 'home', top: 'lives', live: l.cat || 'todas' } },
      l.title, l.host, l.tag, 'live ao vivo', l.aula ? 'aula' : '', LIVE_WORDS[l.cat] || ''
    )
  );

  members.forEach((m) =>
    add(
      { id: 'u-' + m.id, section: 'Pessoa', icon: '👤', title: m.name, subtitle: [`@${m.handle}`, socialLabel(m.social), m.city].filter(Boolean).join(' · '), where: short(m.city), photo: m.photo, profileId: m.id },
      m.name, m.handle, m.city, m.bio, 'pessoa perfil', socialSearchText(m.social)
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
      { km: h.distanceKm, id: 'h-' + h.id, section: 'Hospital', icon: '🏥', title: h.name, subtitle: `${h.type} · ${h.network} · ${h.distanceKm.toFixed(1).replace('.', ',')} km`, where: `a ${h.distanceKm.toFixed(1).replace('.', ',')} km`, photo: h.photo, go: { tab: 'socorro', seg: 'hospitais' } },
      h.name, h.type, h.network, 'hospital pronto socorro saude'
    )
  );
  specialists.forEach((d) =>
    add(
      { km: d.distanceKm, id: 'd-' + d.id, section: d.specialty, icon: '🩺', title: d.name, subtitle: `${d.specialty} · ${d.reg}`, priceValue: d.price, priceUnit: 'consulta', where: `a ${d.distanceKm.toFixed(1).replace('.', ',')} km`, photo: d.photo, go: { tab: 'socorro', seg: 'especialistas', specialty: d.specialty } },
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
      { id: 'ta-' + it.id, section: it.agrotech ? 'Agro é tech' : it.sector === 'tech' ? 'Tecnologia' : 'Agro', icon: it.icon, title: it.title, subtitle: it.who, price: it.price == null ? 'sob orçamento' : it.price === 0 ? 'grátis' : undefined, priceValue: it.price ? it.price : undefined, priceUnit: it.unit, where: it.who, photo: it.photo, sponsored: it.sponsored, go: it.go || { tab: it.sector === 'tech' ? 'tecnologia' : 'agro', seg: it.seg, item: it.id } },
      it.title, it.who, it.detail, it.sector === 'tech' ? 'tecnologia' : 'agro agricola agronegocio', it.agrotech ? 'agro tecnologia agrotech' : '', (it.chains || []).map((c) => ({ graos: 'grao graos soja milho', cafe: 'cafe', pecuaria: 'pecuaria gado boi rebanho', horti: 'hortifruti horta hortalica', leite: 'leite' }[c])).join(' '), it.seg === 'cursos' ? 'curso aula evento' : it.seg === 'robotica' ? 'robotica robo' : it.seg === 'maquinas' ? 'maquina aluguel' : ''
    )
  );

  // Eletrônicos, Vestuário e Utensílios domésticos (com os subgrupos de cada um).
  shopSectorItems.forEach((it) => {
    const sec = SHOP_SECTORS[it.sector];
    const groups = (it.groups || []).map((g) => (sec.groups.find((x) => x.key === g) || {}).label).join(' ');
    add(
      { id: 'ss-' + it.id, section: sec.title, icon: it.icon, title: it.title, subtitle: it.who, price: it.price == null ? 'sob orçamento' : undefined, priceValue: it.price ? it.price : undefined, priceUnit: it.unit, where: it.who, photo: it.photo, sponsored: it.sponsored, go: it.go || { tab: it.sector, group: (it.groups || [])[0] || 'todos', item: it.id } },
      it.title, it.who, it.detail, sec.title, groups, { eletronicos: 'eletronico eletronicos aparelho', vestuario: 'roupa roupas moda vestuario', casa: 'casa utensilio utensilios domestico lar', eletrodomesticos: 'eletrodomestico eletrodomesticos linha branca', moveis: 'movel moveis decoracao decorar moveis planejados', varios: 'varios diversos outros presente presentes pet papelaria brinquedo brinquedos ferramenta ferramentas festa' }[it.sector], it.launch ? 'lancamento novidade' : ''
    );
  });

  communityPosts.forEach((c) =>
    add(
      { id: 'c-' + c.id, section: 'Comunidade', icon: '💬', title: c.author, subtitle: c.text, go: { tab: 'stories', seg: 'posts' } },
      c.author, c.text, 'comunidade post'
    )
  );

  return items;
}

// Assuntos do Realys. Quando o pedido fala de um assunto ("preciso de um hotel"), a busca fica
// SÓ dentro dele: as outras palavras ("em Santos", "com piscina", "barato") filtram e ordenam,
// mas nunca puxam coisas de fora (clínica, caixa de som, móveis...).
// A ordem importa: o primeiro assunto que bater ganha.
export const CATEGORIES = [
  {
    key: 'hotel', label: 'hotéis e pousadas', one: 'hotel',
    // Palavras que só dizem o assunto. "pousada", "hostel" e "chalé" continuam filtrando.
    core: /^(hote(l|is)|hospeda\w*|resorts?|motel|moteis|dormir|pernoit\w*|diarias?|quarto)$/,
    re: /\b(hote(l|is)|pousadas?|hospeda\w*|hostels?|resorts?|motel|moteis|dormir|pernoit\w*|diarias?|chales?|onde ficar|lugar para ficar|quarto (para|pra) (hoje|essa|esta|uma|o|a|dormir))\b/,
    test: (it) => it.go && it.go.kind === 'hotel',
  },
  {
    key: 'imovel-aluguel', label: 'imóveis para alugar', one: 'imóvel para alugar',
    core: /^(alug\w*|aluguel|locacao|imove(l|is)|imovel)$/,
    re: /\b(alug\w* (um |uma |o |a )?(apartamento|ape|apto|casa|kitnet|imove\w*|sala|galpao|quarto)|(apartamento|casa|kitnet|imove\w*|sala) (para|pra) alugar|locacao de imove\w*|aluguel de (casa|apartamento|imove\w*))\b/,
    test: (it) => it.go && it.go.kind === 'imovel-aluguel',
  },
  {
    key: 'imovel-venda', label: 'imóveis à venda', one: 'imóvel à venda',
    core: /^(compr\w*|venda|imove(l|is)|imovel|imobiliaria)$/,
    re: /\b(compr\w* (um |uma |o |a )?(apartamento|ape|apto|casa|imove\w*|terreno)|(imove\w*|casas?|apartamentos?|terrenos?) a venda|imove\w*|imobiliaria)\b/,
    test: (it) => it.go && it.go.kind === 'imovel-venda',
  },
  {
    key: 'carro-aluguel', label: 'carros para alugar', one: 'carro para alugar',
    core: /^(alug\w*|aluguel|locadoras?|carros?|veiculos?)$/,
    re: /\b(alug\w* (um |uma )?(carro|van|veiculo|suv)|aluguel de (carros?|vans?|veiculos?)|locadoras?)\b/,
    test: (it) => it.go && it.go.kind === 'carro-aluguel',
  },
  {
    key: 'maquina-aluguel', label: 'máquinas para alugar', one: 'máquina para alugar',
    core: /^(alug\w*|aluguel|maquinas?|equipamentos?)$/,
    re: /\b(alug\w* (uma |um )?(maquinas?|retroescavadeira|betoneira|andaimes?|equipamentos?|gerador)|aluguel de (maquinas?|equipamentos?))\b/,
    test: (it) => it.go && it.go.kind === 'maquina-aluguel',
  },
  {
    key: 'curso', label: 'cursos e faculdades', one: 'curso',
    re: /\b(cursos?|faculdades?|graduacao|pos graduacao|ead|mba|aulas? online)\b/,
    test: (it) => it.go && it.go.kind === 'curso',
  },
  {
    key: 'saude', label: 'hospitais e médicos', one: 'atendimento de saúde',
    // "cardiologista", "dentista", "UPA" filtram; "médico" e "consulta" só dizem o assunto.
    core: /^(medic[oa]s?|consultas?|doutor\w*|especialistas?|atendimento|saude)$/,
    re: /\b(hospita(l|is)|upa|pronto socorro|clinicas?|medic[oa]s?|especialistas?|consultas?|pediatra|cardiologista|dermatologista|ginecologista|ortopedista|psicolog\w*|psiquiatra|oftalmologista|dentista|doutor\w*|ambulancias?|exames?)\b/,
    test: (it) => ['Hospital', 'Socorro', 'Emergência'].includes(it.section) || String(it.id).startsWith('d-'),
  },
  {
    key: 'transporte', label: 'linhas e viagens', one: 'linha ou viagem',
    re: /\b(onibus|metro|passage(m|ns)|rodoviaria|trem|linha de onibus|viagem de onibus)\b/,
    test: (it) => /^(tl|tr)-/.test(String(it.id)),
  },
  {
    key: 'vaga', label: 'vagas de emprego', one: 'vaga',
    re: /\b(vagas?|empregos?|curriculo|contratando|trabalho de carteira)\b/,
    test: (it) => String(it.id).startsWith('j-'),
  },
  {
    key: 'artista', label: 'artistas e músicas', one: 'artista',
    re: /\b(artistas?|musicas?|mp3|clipes?|bandas?|cantor\w*|obras? de arte|pinturas?)\b/,
    test: (it) => /^(a|am)-/.test(String(it.id)),
  },
  {
    key: 'live', label: 'lives', one: 'live',
    re: /\b(lives?|laives?|transmiss\w*)\b/,
    test: (it) => String(it.id).startsWith('lv-'),
  },
];

export function categoryOf(text) {
  const t = norm(text);
  return CATEGORIES.find((c) => c.re.test(t)) || null;
}

// Palavras que só dizem "quero isso" e não servem de filtro dentro do assunto.
const SOFT = new Set(
  ('reservar reserva reservo urgente urgencia hoje amanha noite noitinha semana fim final disponivel disponiveis ' +
    'barato barata baratos baratas bom boa bons boas melhor melhores perto proximo proxima proximos proximas aqui regiao ' +
    'posso pode consigo preciso precisava gostaria um uma alguma algum quarto ficar dormir lugar estou to tô viagem viajando').split(' ')
);
const NEAR = /\b(perto|proxim\w*|aqui|regiao|redondeza\w*|mais perto)\b/;
const CHEAP = /\b(barat\w*|economic\w*|em conta|mais em conta|menor preco)\b/;
const priceNum = (it) => {
  if (it.priceValue != null) return it.priceValue;
  const m = String(it.price || '').replace(/\./g, '').match(/(\d+)(,\d+)?/);
  return m ? Number(m[1]) : 1e9;
};

// Devolve { results, tokens, label, category?, missing? }.
// Com assunto: só itens do assunto, filtrados pelas outras palavras.
// Sem assunto: ganha quem bate com mais palavras; patrocinados primeiro no empate.
// O reconhecimento de voz às vezes escreve errado as palavras-chave ("otel", "rotel", "hotéu",
// "pousda", "ospital"). Antes de buscar, troca pela palavra do Realys mais parecida.
const KEYWORDS = ['hotel', 'hoteis', 'pousada', 'hostel', 'hospedagem', 'hospital', 'clinica', 'medico', 'dentista', 'pediatra', 'curso', 'faculdade', 'onibus', 'metro', 'passagem', 'apartamento', 'kitnet', 'imovel', 'aluguel', 'pizza', 'pizzaria', 'hamburguer', 'sushi', 'festa', 'balada', 'show', 'trator', 'eletricista', 'encanador', 'mecanico', 'diarista', 'emprego', 'vaga', 'artista', 'musica'];
function editDistance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
let VOCAB = null; // todas as palavras que existem no conteúdo do app
export function fixHeard(text, state) {
  if (!VOCAB) VOCAB = new Set(buildIndex(state).flatMap((it) => it.hay).concat(Object.keys(SYN)));
  return String(text)
    .split(/(\s+)/)
    .map((w) => {
      const n = norm(w).replace(/[^a-z]/g, '');
      if (n.length < 4 || STOP.has(n) || VOCAB.has(stem(n)) || VOCAB.has(n)) return w;
      let best = null;
      for (const k of KEYWORDS) {
        const dist = editDistance(n, k);
        if (dist <= (k.length <= 5 ? 1 : 2) && (!best || dist < best.dist)) best = { k, dist };
      }
      return best ? best.k : w;
    })
    .join('');
}

export function searchAll(state, rawText, max = 8) {
  const text = fixHeard(rawText, state);
  const tokens = queryTokens(text);
  // Para falar de volta com acento ("hotéis", não "hoteis").
  const label = String(text).split(/[^\p{L}\p{N}]+/u).filter((w) => w && tokens.includes(norm(w))).join(' ').toLowerCase();
  const t = norm(text);
  const category = categoryOf(text);
  if (category) {
    const pool = buildIndex(state).filter(category.test);
    // Palavras que sobram depois do assunto: "Santos", "piscina", "pet"...
    const core = category.core || category.re;
    const extra = tokens.filter((w) => !SOFT.has(w) && !core.test(w) && !core.test(stem(w)));
    const extraLabel = String(text).split(/[^\p{L}\p{N}]+/u).filter((w) => w && extra.includes(norm(w))).join(' ');
    // Sinônimos que caem de volta no próprio assunto não filtram ("pousada" → "hotel" acharia todos).
    const vs = extra.map((w) => variants(w).filter((v) => !core.test(v)));
    let scored = pool.map((it) => ({ it, score: vs.filter((v) => tokenHits(v, it.hay)).length }));
    const best = scored.reduce((m, x) => Math.max(m, x.score), 0);
    const missing = extra.length && best === 0 ? extraLabel : null;
    if (best > 0) scored = scored.filter((x) => x.score === best);
    const near = NEAR.test(t);
    const cheap = CHEAP.test(t);
    scored.sort(
      (a, b) =>
        (cheap ? priceNum(a.it) - priceNum(b.it) : 0) ||
        (near ? (a.it.km == null ? 1e9 : a.it.km) - (b.it.km == null ? 1e9 : b.it.km) : 0) ||
        // Sem pedido de lugar: primeiro o que fica na sua cidade (até 50 km), depois o resto.
        ((a.it.km != null && a.it.km > 50) ? 1 : 0) - ((b.it.km != null && b.it.km > 50) ? 1 : 0) ||
        (b.it.sponsored ? 1 : 0) - (a.it.sponsored ? 1 : 0) ||
        (a.it.km == null ? 1e9 : a.it.km) - (b.it.km == null ? 1e9 : b.it.km)
    );
    return { results: scored.slice(0, max).map((x) => x.it), tokens, label, category, missing, extra: best > 0 ? extraLabel : '', near, cheap };
  }
  if (!tokens.length) return { results: [], tokens, label };
  // Sem assunto fechado: a palavra de assunto ("trator", "pizza") vale mais que as outras ("usado"),
  // e bater a própria palavra vale mais que bater só um sinônimo. Assim não vem máquina de lavar
  // num pedido de trator.
  const isTopic = (w) => !!(SYN[stem(w)] || SYN[w] || CONTENT_WORDS.test(w));
  const vs = tokens.map((w) => ({ own: [stem(w)], syn: variants(w), topic: isTopic(w) }));
  const scored = buildIndex(state)
    .map((it) => ({
      it,
      score: vs.reduce((s, v) => s + (tokenHits(v.own, it.hay) ? (v.topic ? 100 : 10) : tokenHits(v.syn, it.hay) ? (v.topic ? 30 : 3) : 0), 0),
      inTitle: vs.filter((v) => tokenHits(v.syn, it.titleHay)).length,
    }))
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

const kmSpeak = (km) => (km < 1 ? `${Math.round((km * 1000) / 50) * 50} metros` : `${km.toFixed(km < 10 ? 1 : 0).replace('.', ',')} km`);

// Resposta falada da busca geral. Com assunto (meta.category), fala só do assunto.
export function contentReply(results, what, meta = {}) {
  const priceOf = (r) => r.price || (r.priceValue != null ? `R$ ${r.priceValue.toFixed(2).replace('.', ',')}${r.priceUnit ? ' por ' + r.priceUnit : ''}` : '');
  const line = (r) => {
    const p = priceOf(r);
    const near = r.where && /^a \d/.test(r.where); // "a 0,7 km"
    const where = r.where ? (near ? `, ${r.where}` : `, em ${r.where}`) : '';
    const dist = !near && r.km != null && r.km < 50 ? `, a ${kmSpeak(r.km)}` : '';
    return `${r.title}${where}${dist}${p ? ', ' + p.replace('/diária', ' a diária') : ''}`;
  };
  const c = meta.category;
  if (c) {
    if (!results.length) return `Ainda não tem ${c.label} cadastrados no Realys. Assim que alguém anunciar, eu te aviso.`;
    const top = results.slice(0, 3).map(line);
    const n = results.length;
    const head = meta.missing
      ? `Não encontrei ${c.one} com "${meta.missing}", mas tem ${n} ${c.label} no Realys. `
      : `Encontrei ${n} ${n > 1 ? c.label : c.one}${meta.extra ? `${/ para /.test(c.one) || n > 1 ? ' com' : ' para'} "${meta.extra}"` : ''}${meta.cheap ? ', do mais barato para o mais caro' : meta.near ? ', do mais perto para o mais longe' : ''}. `;
    return head + `${top.join('; ')}.` + (n > 3 ? ` E mais ${n - 3} na lista.` : '') + ' Toque em um para ver e reservar.';
  }
  if (!results.length) return `Não encontrei nada sobre "${what}" no Realys. Tente outra palavra.`;
  const top = results.slice(0, 3).map(line);
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
export const CONTENT_WORDS = /\b(hote(l|is)|pousadas?|hospedage(m|ns)|aluga(r|mos)?|aluguel|locacao|imove(l|is)|apartamentos?|ape|kitnet|casas? (a|para) venda|ingressos?|balada|casa noturna|shows?|cursos?|faculdades?|lives?|promocao|promocoes|ofertas?|lojas?|produtos?|hospita(l|is)|upa|samu|ambulancias?|medic(o|a|os|as)|especialistas?|consultas?|pediatra|cardiologista|dentista|onibus|metro|passage(m|ns)|rodoviaria|artistas?|clipes?|vagas?|empregos?|lancamentos?|novidades?|tecnologia|robotica|robos?|inteligencia artificial|agro|agronegocio|sementes?|adubos?|trator(es)?|colheitadeiras?|fazendas?|gado|pecuaria|leilao|leiloes|bezerros?|ordenhadeiras?|hortifruti|estufas?|eletronicos?|smart ?tv|televis(ao|oes)|videogames?|consoles?|roupas?|vestuario|vestidos?|camisas?|camisetas?|calcados?|tenis|sapatos?|bolsas?|utensilios?|panelas?|air ?fryer|liquidificador|toalhas?|jogo de cama|edredom|eletrodomesticos?|geladeiras?|freezer|fogo(es|ao)|cooktop|lavadoras?|maquina de lavar|lava e seca|lava-loucas|lava loucas|ar-condicionado|ar condicionado|climatizador|ventilador|micro-ondas|microondas|forno|moveis|movel|decoracao|sofas?|guarda-roupas?|guarda roupas?|camas?|colchao|mesa de jantar|cadeiras?|estante|rack|quadros?|luminarias?|lustres?|tapetes?|cortinas?|planejad[ao]s?|presentes?|papelaria|brinquedos?|ferramentas?|pet ?shop|racao|bares?|happy hour|chope|sushi|temaki|pizzas?|hamburguer(es)?|lanches?|docerias?|cafeterias?)\b/;
