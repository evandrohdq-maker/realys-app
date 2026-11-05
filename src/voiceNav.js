// Navegação por voz da Lotus: "me leva pro Agro", "abre o Food", "volta pros Stories", "voltar".
// Em vez de só mostrar resultados, a Lotus fecha a caixa e abre a página pedida.
// Sem dependências do React Native, para poder ser testado no computador.
import { norm, soundKey } from './wakeMatch';

// Cada destino: nome falado pela Lotus, para onde vai (go) e jeitos de falar.
// O reconhecimento de voz escreve nomes em inglês de vários jeitos ("Stories" vira
// "histories", "estórias", "istóris"...), por isso as listas são generosas.
const T = (label, go, words) => ({ label, go, words });

export const NAV_TARGETS = [
  // Barra de baixo (Usuário)
  T('Início', { tab: 'home', top: 'shop' }, ['inicio', 'home', 'pagina inicial', 'tela inicial', 'comeco', 'principal']),
  T('Shop', { tab: 'home', top: 'shop' }, ['shop', 'shopping', 'xop', 'chop', 'shope', 'shopi']),
  T('Stories', { tab: 'stories' }, ['stories', 'storys', 'story', 'storis', 'stori', 'historias', 'historia', 'histories', 'history', 'historys', 'estorias', 'estoria', 'estoris', 'istoris', 'istori', 'storie', 'stores', 'status']),
  T('Date', { tab: 'encontros' }, ['date', 'deite', 'deit', 'deiti', 'deyt', 'dates', 'encontros', 'encontro', 'namoro', 'namorar', 'match', 'relacionamentos', 'relacionamento', 'paquera']),
  T('Food', { tab: 'food', cat: 'Todos', q: '' }, ['food', 'fud', 'fudi', 'fude', 'fuud', 'foods', 'comida', 'comidas', 'restaurante', 'restaurantes', 'alimentacao', 'delivery']),
  T('Serviços', { tab: 'servicos' }, ['servicos', 'servico', 'prestadores', 'prestador de servico', 'prestadores de servico']),
  T('Pedidos', { tab: 'pedidos' }, ['pedidos', 'pedido', 'meus pedidos', 'minhas compras', 'compras', 'entregas']),
  T('Perfil', { tab: 'perfil' }, ['perfil', 'meu perfil', 'minha conta', 'conta', 'configuracoes', 'ajustes']),
  T('Carteira', { tab: 'perfil', wallet: true }, ['carteira', 'minha carteira', 'carteira digital', 'extrato']),

  // Abas do topo do Início
  T('Eventos', { tab: 'home', top: 'eventos' }, ['eventos', 'evento', 'festas', 'baladas', 'balada']),
  T('Promoções', { tab: 'home', top: 'promo' }, ['promocoes', 'promocao', 'ofertas', 'oferta']),
  T('Anúncios', { tab: 'home', top: 'anuncios' }, ['anuncios', 'anuncio', 'classificados']),
  T('Lives', { tab: 'home', top: 'lives' }, ['lives', 'live', 'laive', 'laives', 'ao vivo', 'transmissoes']),
  T('Hotéis', { tab: 'home', top: 'anuncios', kind: 'hotel' }, ['hoteis', 'hotel', 'pousadas', 'pousada', 'hotelaria', 'hospedagem']),
  T('Imóveis à venda', { tab: 'home', top: 'anuncios', kind: 'imovel-venda' }, ['imoveis', 'imovel', 'imobiliaria', 'imoveis a venda']),
  T('Imóveis para alugar', { tab: 'home', top: 'anuncios', kind: 'imovel-aluguel' }, ['aluguel de imoveis', 'imoveis para alugar', 'locacao de imoveis']),
  T('Aluguel de carros', { tab: 'home', top: 'anuncios', kind: 'carro-aluguel' }, ['aluguel de carros', 'aluguel de carro', 'locadora']),
  T('Aluguel de máquinas', { tab: 'home', top: 'anuncios', kind: 'maquina-aluguel' }, ['aluguel de maquinas', 'aluguel de maquina', 'locacao de maquinas']),
  T('Cursos', { tab: 'home', top: 'anuncios', kind: 'curso' }, ['cursos', 'curso', 'cursos online', 'faculdade', 'faculdades', 'faculdade online']),

  // Comunidade (dentro dos Stories)
  T('Comunidade', { tab: 'stories', seg: 'posts' }, ['comunidade', 'posts', 'postagens', 'feed', 'depoimentos']),
  T('Mensagens', { tab: 'stories', seg: 'msgs' }, ['mensagens', 'mensagem', 'conversas', 'chat', 'bate papo', 'inbox', 'direct']),
  T('Contatos', { tab: 'stories', seg: 'contatos' }, ['contatos', 'contato', 'amigos', 'meus amigos']),

  // Menu ⋮
  T('Agro', { tab: 'agro' }, ['agro', 'agronomia', 'agronegocio', 'agricultura', 'agropecuaria', 'campo']),
  T('Grãos', { tab: 'agro', chain: 'graos' }, ['graos', 'soja', 'milho']),
  T('Café', { tab: 'agro', chain: 'cafe' }, ['cafe', 'cafes', 'cafeicultura']),
  T('Pecuária', { tab: 'agro', chain: 'pecuaria' }, ['pecuaria', 'gado']),
  T('Hortifrúti', { tab: 'agro', chain: 'horti' }, ['hortifruti', 'horti fruti', 'horta']),
  T('Leite', { tab: 'agro', chain: 'leite' }, ['leite', 'laticinios']),
  T('Máquinas agrícolas', { tab: 'agro', seg: 'maquinas' }, ['maquinas agricolas', 'tratores', 'trator']),
  T('Sementes e insumos', { tab: 'agro', seg: 'insumos' }, ['sementes', 'insumos', 'adubo']),
  T('Tecnologia', { tab: 'tecnologia' }, ['tecnologia', 'tech', 'tec', 'tecnologias']),
  T('Inteligência artificial', { tab: 'tecnologia', seg: 'ia' }, ['inteligencia artificial', 'ia']),
  T('Robótica', { tab: 'tecnologia', seg: 'robotica' }, ['robotica', 'robos', 'robo']),
  T('Transporte público', { tab: 'transporte' }, ['transporte', 'transporte publico', 'onibus', 'metro', 'transportes']),
  T('Socorro e saúde', { tab: 'socorro' }, ['socorro e saude', 'saude', 'sos', 'emergencias', 'pagina de socorro']),
  T('Hospitais', { tab: 'socorro', seg: 'hospitais' }, ['hospitais', 'hospital', 'upa', 'pronto socorro']),
  T('Especialistas médicos', { tab: 'socorro', seg: 'especialistas' }, ['medicos', 'medico', 'especialistas', 'especialistas medicos', 'consultas']),
  T('Artistas', { tab: 'artistas', art: 'todos' }, ['artistas', 'artista', 'arte']),
  T('Músicas', { tab: 'artistas', art: 'musica' }, ['musicas', 'musica', 'mp3']),
  T('Empregos', { tab: 'vagas', area: 'todas', seg: 'vagas' }, ['empregos', 'emprego', 'vagas', 'vaga', 'vagas de emprego', 'trabalho']),
  T('Todas as lojas', { tab: 'loja', cat: 'Todos', q: '' }, ['loja', 'lojas', 'todas as lojas']),
  T('Mercado', { tab: 'loja', cat: 'Mercado', q: '' }, ['mercado', 'supermercado']),
  T('Bares', { tab: 'food', cat: 'Bares', q: '' }, ['bares', 'bar', 'happy hour', 'barzinho']),
  T('Pizzarias', { tab: 'food', cat: 'Alimentação', q: 'pizza' }, ['pizzaria', 'pizzarias', 'pizza', 'pizzas']),
  T('Hambúrguer', { tab: 'food', cat: 'Alimentação', q: 'burguer' }, ['hamburguer', 'hamburgueria', 'lanches', 'lanche']),
  T('Comida japonesa', { tab: 'food', cat: 'Alimentação', q: 'sushi' }, ['japonesa', 'comida japonesa', 'sushi']),
  T('Doces e cafés', { tab: 'food', cat: 'Doces e cafés', q: '' }, ['doces', 'docerias', 'cafeterias', 'sobremesas']),

  // Setores do Shop e subgrupos
  T('Eletrônicos', { tab: 'eletronicos', group: 'todos' }, ['eletronicos', 'eletronico']),
  T('Celulares', { tab: 'eletronicos', group: 'celulares' }, ['celulares', 'celular', 'smartphones']),
  T('Informática', { tab: 'eletronicos', group: 'informatica' }, ['informatica', 'notebooks', 'computadores']),
  T('Games', { tab: 'eletronicos', group: 'games' }, ['games', 'jogos', 'videogames', 'videogame']),
  T('TV e áudio', { tab: 'eletronicos', group: 'tvaudio' }, ['televisoes', 'tv e audio', 'tvs']),
  T('Vestuário', { tab: 'vestuario', group: 'todos' }, ['vestuario', 'roupas', 'roupa', 'moda']),
  T('Moda feminina', { tab: 'vestuario', group: 'feminino' }, ['feminino', 'moda feminina', 'roupas femininas']),
  T('Moda masculina', { tab: 'vestuario', group: 'masculino' }, ['masculino', 'moda masculina', 'roupas masculinas']),
  T('Moda infantil', { tab: 'vestuario', group: 'infantil' }, ['infantil', 'moda infantil', 'roupas infantis']),
  T('Calçados', { tab: 'vestuario', group: 'calcados' }, ['calcados', 'sapatos', 'tenis']),
  T('Utensílios domésticos', { tab: 'casa', group: 'todos' }, ['utensilios', 'utensilios domesticos', 'utilidades domesticas']),
  T('Eletrodomésticos', { tab: 'eletrodomesticos', group: 'todos' }, ['eletrodomesticos', 'eletrodomestico']),
  T('Geladeiras', { tab: 'eletrodomesticos', group: 'geladeiras' }, ['geladeiras', 'geladeira']),
  T('Móveis e decoração', { tab: 'moveis', group: 'todos' }, ['moveis', 'movel', 'moveis e decoracao', 'decoracao']),
  T('Vários', { tab: 'varios', group: 'todos' }, ['varios', 'diversos', 'outros']),
  T('Pet', { tab: 'varios', group: 'pet' }, ['pet', 'pet shop', 'petshop']),
  T('Brinquedos', { tab: 'varios', group: 'brinquedos' }, ['brinquedos', 'brinquedo']),
  T('Presentes', { tab: 'varios', group: 'presentes' }, ['presentes', 'presente']),

  // Área empresarial (CNPJ)
  T('Painel da empresa', { tab: 'painel' }, ['painel', 'dashboard', 'painel da empresa']),
  T('Estoque', { tab: 'estoque' }, ['estoque', 'meu estoque']),
  T('Caixa', { tab: 'caixa' }, ['caixa', 'fluxo de caixa', 'financeiro']),
  T('Negócios', { tab: 'negocios' }, ['negocios', 'negociacoes', 'b2b']),
  T('RH', { tab: 'rh' }, ['rh', 'recursos humanos', 'agaga', 'erre aga']),
  T('Página da empresa', { tab: 'pagina' }, ['pagina da empresa', 'pagina da minha empresa']),
  // Prestador, fornecedor e administrador
  T('Trabalhar', { tab: 'prestar' }, ['trabalhar', 'ficar disponivel', 'corridas']),
  T('Propostas', { tab: 'propostas' }, ['propostas', 'proposta']),
  T('Sistema', { tab: 'sistema' }, ['sistema', 'mapa do sistema']),
  T('Moderação', { tab: 'moderacao' }, ['moderacao', 'denuncias']),
  T('Cadastros', { tab: 'cadastros' }, ['cadastros', 'aprovacoes']),
];

// Palavras que pedem para ir a algum lugar.
const VERBS = new Set([
  'abrir', 'abre', 'abra', 'abri', 'abrindo', 'ir', 'vai', 'va', 'vamos', 'vou', 'leva', 'leve', 'levar', 'levo', 'mostra', 'mostre', 'mostrar',
  'entra', 'entre', 'entrar', 'acessa', 'acesse', 'acessar', 'navega', 'navegue', 'navegar', 'ver', 've', 'exibe', 'exibir', 'abrir',
  'volta', 'voltar', 'volte', 'retorna', 'retornar', 'retorne', 'pagina', 'aba', 'tela', 'area', 'secao', 'passa', 'passar', 'troca', 'trocar', 'joga', 'bota', 'coloca',
]);
const BACK = new Set(['volta', 'voltar', 'volte', 'retorna', 'retornar', 'retorne', 'anterior', 'atras']);

// Palavras que não mudam o pedido ("me leva PRA página DO agro, POR FAVOR").
const FILLER = new Set([
  'a', 'o', 'as', 'os', 'de', 'do', 'da', 'dos', 'das', 'pra', 'pro', 'pras', 'pros', 'para', 'na', 'no', 'nas', 'nos', 'em', 'ao', 'aos', 'ate',
  'me', 'mim', 'eu', 'quero', 'queria', 'gostaria', 'poderia', 'pode', 'podia', 'por', 'favor', 'agora', 'ai', 'la', 'aqui', 'ali', 'ja', 'logo',
  'minha', 'meu', 'minhas', 'meus', 'uma', 'um', 'e', 'parte', 'app', 'aplicativo', 'realys', 'lotus', 'voce', 'consegue', 'com', 'so', 'rapido',
  'oi', 'ola', 'ei', 'por', 'gentileza', 'direto', 'diretamente', 'pagina', 'aba', 'tela', 'area', 'secao', 'menu', 'categoria', 'sessao', 'que', 'tem',
]);

const words = (s) => norm(s).replace(/[^a-z0-9 ]+/g, ' ').split(' ').filter(Boolean);
const ALIASES = NAV_TARGETS.flatMap((t, i) => t.words.map((w) => ({ i, w: words(w) })));

// Procura o destino com o nome mais longo que aparece na frase.
function bestTarget(ws) {
  let best = null;
  for (const a of ALIASES) {
    const n = a.w.length;
    for (let s = 0; s + n <= ws.length; s++) {
      let ok = true;
      for (let k = 0; k < n && ok; k++) {
        const heard = ws[s + k];
        const want = a.w[k];
        // Palavras longas também contam pelo som ("istóris" ≈ "stories").
        ok = heard === want || (want.length >= 5 && heard.length >= 4 && soundKey(heard) === soundKey(want));
      }
      if (!ok) continue;
      const score = n * 100 + a.w.join(' ').length;
      if (!best || score > best.score) best = { score, i: a.i, start: s, n };
    }
  }
  return best;
}

// Devolve { target, go, label } para ir a uma página, { back: true } para voltar, ou null.
export function findNavigation(text) {
  const ws = words(text);
  if (!ws.length) return null;
  const hit = bestTarget(ws);
  const rest = hit ? ws.filter((_, k) => k < hit.start || k >= hit.start + hit.n) : ws;
  const hasVerb = rest.some((w) => VERBS.has(w)) || /\b(me leva|vai para|vai pra|ir para|ir pra)\b/.test(ws.join(' '));
  const leftover = rest.filter((w) => !VERBS.has(w) && !FILLER.has(w) && !BACK.has(w));

  if (hit) {
    // Só navega quando a frase é um pedido de ir ("abre o Food") ou só o nome ("Agro").
    // "Tem hotel em Campos do Jordão?" continua sendo uma busca.
    if ((hasVerb && leftover.length <= 1) || leftover.length === 0) {
      const t = NAV_TARGETS[hit.i];
      return { target: t, go: t.go, label: t.label };
    }
    return null;
  }
  // "Voltar", "volta", "tela anterior": volta para onde estava.
  if (rest.some((w) => BACK.has(w)) && leftover.length === 0) return { back: true };
  return null;
}

// O que a Lotus fala ao abrir.
export const navReply = (nav) => (nav.back ? 'Voltando.' : `Abrindo ${nav.label}.`);
