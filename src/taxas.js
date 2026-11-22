// Tabela única das taxas do Realyz, com a referência do mercado usada para definir cada uma.
// Regra: ficar perto do mercado para ter margem, mas sempre abaixo, para usar isso na divulgação.
// Pesquisa de novembro de 2026 (fontes em PENDENCIAS.md). Ao mudar uma taxa aqui, mude também o
// Termo de Adesão (src/termoAdesao.js, item 16) e suba a versão do termo.

export const TAXAS = {
  protecao: { valor: 0.99, unidade: 'R$ por pedido', quemPaga: 'cliente', mercado: 'iFood: R$ 0,99 de dia e até R$ 1,99 à noite', argumento: 'R$ 0,99 a qualquer hora, sem taxa noturna' },
  food: { pct: 10, quemPaga: 'restaurante', mercado: 'iFood Básico: 12% + 3,2% de pagamento online + R$ 110 de mensalidade', argumento: '10% com pagamento incluído, e o plano só começa depois do primeiro pedido' },
  shop: { pct: 10, quemPaga: 'loja', mercado: 'Mercado Livre Clássico: 10% a 14% + custo fixo; Shopee: até 20% + R$ 4 por item', argumento: '10% sem taxa fixa por item' },
  // Rota inteligente: a entrega extra que o Realyz encaixa no mesmo caminho de outra (src/rotaInteligente.js).
  rotaInteligente: { pct: 25, quemPaga: 'motoboy (só na entrega extra)', mercado: 'iFood e Rappi agrupam pedidos sem dizer quanto o entregador ganha a mais', argumento: 'o motoboy vê antes quanto roda a menos e quanto recebe, e só aceita se quiser' },
  corrida: { pct: 18, quemPaga: 'motorista e motoboy', mercado: 'Uber: 20% a 35%; 99: 20% a 30%', argumento: 'o motorista fica com 82% da corrida' },
  visita: { pct: 15, quemPaga: 'prestador', mercado: 'GetNinjas cobra pacotes de moedas por contato, mesmo sem fechar o serviço', argumento: 'só paga quando a visita acontece, e o valor do serviço é todo seu' },
  ingresso: { pct: 8, minimo: 1.99, quemPaga: 'produtor (pode repassar ao comprador)', mercado: 'Sympla: 10%, mínimo de R$ 2,50', argumento: '8%, mínimo de R$ 1,99' },
  presente: { pct: 10, quemPaga: 'descontado do presente', mercado: 'Pix entre pessoas é grátis, mas não tem garantia nem pontos', argumento: '10% com pontos de volta' },
  live: { criador: 70, criadorAntecipado: 63, quemPaga: 'descontado no saque', mercado: 'TikTok: o criador fica com cerca de 50%', argumento: 'o criador fica com 70% do que os fãs enviam' },
  // Plano da loja: só começa quando a loja aceita o primeiro pedido; primeiro mês grátis; anual por 75% do valor de 12 meses.
  planoEmpresa: { valor: 49.9, anualPct: 75, gratisDias: 30, unidade: 'R$ por mês (ou anual por 75% do valor), só depois do primeiro pedido aceito, com o primeiro mês grátis', mercado: 'iFood: R$ 110 a R$ 150 por mês acima de R$ 1.800', argumento: 'R$ 49,90, primeiro mês grátis, e só começa quando a loja aceita o primeiro pedido' },
  // Negócios (imóveis, veículos e máquinas): o cliente nunca paga; o anunciante paga plano mensal
  // (imobiliária, revenda) ou só quando libera a conversa com um interessado (proprietário, particular).
  anuncioImobiliaria: { valor: 149, valor40: 349, unidade: 'R$ por mês até 10 anúncios (R$ 349 até 40), com as conversas liberadas', quemPaga: 'imobiliária', mercado: 'ZAP Imóveis: 10 anúncios a partir de R$ 499,90 por mês', argumento: 'R$ 149 por mês até 10 anúncios, com as conversas liberadas' },
  contatoImovel: { valor: 9.9, unidade: 'R$ por conversa liberada', quemPaga: 'proprietário do imóvel', mercado: 'ZAP Imóveis: plano de proprietário a partir de R$ 77,39 por mês, com ou sem interessado', argumento: 'anunciar é grátis; R$ 9,90 só quando aparece um interessado verificado' },
  anuncioRevenda: { valor: 99, unidade: 'R$ por mês, com as conversas liberadas', quemPaga: 'revenda de veículos ou máquinas', mercado: 'OLX: planos profissionais sem preço publicado; Viva Real para imobiliárias: R$ 400 a R$ 1.000 por mês', argumento: 'R$ 99 por mês com as conversas liberadas' },
  contatoVeiculo: { valor: 4.9, unidade: 'R$ por conversa liberada', quemPaga: 'particular (veículo ou máquina)', mercado: 'Webmotors: anúncio a partir de R$ 9,90, pago antes de aparecer interessado', argumento: 'anunciar é grátis; R$ 4,90 só quando aparece um interessado verificado' },
  // Espaços de publicidade (preços por pacote em src/rewards.js › POINT_SHOP).
  publicidade: { valor: 14.9, unidade: 'R$ por dia para aparecer em primeiro nas buscas (story R$ 9,90; banner da vitrine R$ 39,90)', quemPaga: 'anunciante', mercado: 'iFood Anúncios: orçamento mínimo de R$ 25 por dia, cobrado por clique', argumento: 'R$ 14,90 por dia, preço fechado, sem leilão e sem surpresa' },
  // Músicas (Stream › Músicas): o artista vende a faixa e o Realyz fica com uma parte. Ouvir é grátis, com propaganda.
  // Base de mercado (nov/2026): Bandcamp fica com 15% da venda digital, mais 4 a 7% de taxa de pagamento;
  // lojas de app como a iTunes ficam com cerca de 30% e vendem a faixa por R$ 1,90 a R$ 2,90.
  // Realyz: R$ 0,99 fixo por download, somado ao que o artista quer receber (o artista recebe 100% do valor dele).
  // Sugestão: artista R$ 0,90 + R$ 0,99 = R$ 1,89 para o cliente, um pouco abaixo da iTunes (R$ 1,90).
  musicaVenda: { valor: 0.99, artistaSugerido: 0.9, artistaMinimo: 0.5, unidade: 'R$ por download, somado ao valor do artista', quemPaga: 'cliente (somado ao preço da música)', mercado: 'Bandcamp: 15% mais taxa de pagamento; lojas de app: cerca de 30%; faixa a R$ 1,90 a R$ 2,90', argumento: 'o artista recebe 100% do valor dele; o Realyz cobra só R$ 0,99 por download, e a faixa sai a partir de R$ 1,49' },
  // Base de mercado (Spotify Brasil, nov/2026): Individual R$ 23,90, Universitário R$ 12,90, Duo R$ 31,90,
  // Família R$ 40,90, com 3 meses grátis para quem nunca assinou. Realyz: mesmo valor do Spotify (decisão de nov/2026), com margem
  // para pagar os artistas pelas reproduções, o ECAD e os impostos. Inclui ouvir offline.
  musicaPremium: { valor: 23.9, gratisMeses: 3, planos: { individual: 23.9, universitario: 12.9, duo: 31.9, familia: 40.9 }, unidade: 'R$ por mês, sem propaganda e com músicas offline (3 primeiros meses grátis)', quemPaga: 'ouvinte', mercado: 'Spotify Premium: R$ 23,90 por mês (Universitário R$ 12,90, Duo R$ 31,90, Família R$ 40,90)', argumento: 'preço dos grandes apps de música, com 3 meses grátis, offline incluído e a compra da música direto do artista' },
  // Páginas de usuário (estilo blog): mensalidade por página (src/userPages.js › PAGE_PRICE).
  paginaUsuario: { valor: 14.9, unidade: 'R$ por mês por página, da segunda em diante (a primeira é gratuita)', quemPaga: 'usuário dono da página', mercado: 'construtores de site e blog cobram mensalidade por site, sem público incluído', argumento: 'R$ 14,90 por mês com página personalizável e o público verificado do Realyz' },
  // Contratação de artistas (src/artistShows.js): o artista paga 10% do cachê, só quando o show acontece.
  // Deslocamento vai inteiro para o artista; quem contrata não paga taxa.
  show: { pct: 10, quemPaga: 'artista (descontado do cachê)', mercado: 'agências e escritórios de artistas ficam com 15% a 30% do cachê; sites de contratação cobram mensalidade do artista', argumento: '10% do cachê só quando o show acontece, sem mensalidade, e o pagamento fica garantido antes do show' },
  destaquePrestador: { valor: 49.9, unidade: 'R$ por mês', mercado: 'GetNinjas: pacotes a partir de R$ 149', argumento: 'destaque o mês inteiro por R$ 49,90' },
};

// O que o USUÁRIO vê: a referência do mercado sem nome de marca (só "apps de delivery", "média do mercado"...).
// Os nomes das empresas (campo `mercado` acima) ficam só para uso interno: painel do administrador e pesquisa.
// Motivo: propaganda comparativa com nome de concorrente exige dados sempre atualizados e comprováveis
// (CONAR e Código de Defesa do Consumidor); preço desatualizado com nome de marca pode dar problema.
export const MERCADO_PUBLICO = {
  protecao: 'apps de delivery cobram cerca de R$ 0,99 de dia e até R$ 1,99 à noite',
  food: 'apps de delivery cobram em média 12% + taxa de pagamento online + mensalidade',
  shop: 'marketplaces cobram de 10% a 20% + custo fixo por item',
  corrida: 'apps de corrida ficam com 20% a 35% da corrida',
  visita: 'sites de serviços cobram pacotes por contato, mesmo sem fechar o serviço',
  ingresso: 'sites de ingresso cobram em média 10%, com mínimo de R$ 2,50',
  presente: 'Pix entre pessoas é grátis, mas não tem garantia nem pontos',
  live: 'em outras plataformas o criador fica com cerca de 50%',
  planoEmpresa: 'apps de delivery cobram mensalidade de R$ 110 a R$ 150',
  anuncioImobiliaria: 'portais de imóveis cobram a partir de R$ 499,90 por mês por 10 anúncios',
  contatoImovel: 'portais de imóveis cobram plano mensal do proprietário, com ou sem interessado',
  anuncioRevenda: 'portais de anúncio cobram de R$ 400 a R$ 1.000 por mês das revendas',
  contatoVeiculo: 'portais de veículos cobram o anúncio antes de aparecer interessado',
  publicidade: 'anúncios em apps de delivery pedem orçamento mínimo de R$ 25 por dia',
  musicaVenda: 'lojas de música ficam com 15% a 30% da venda; faixa a R$ 1,90 a R$ 2,90',
  musicaPremium: 'os grandes apps de música cobram cerca de R$ 23,90 por mês',
  paginaUsuario: 'construtores de site e blog cobram mensalidade por site, sem público incluído',
  show: 'agências de artistas ficam com 15% a 30% do cachê',
  destaquePrestador: 'sites de serviços cobram pacotes a partir de R$ 149',
};
export const mercadoPublico = (chave) => MERCADO_PUBLICO[chave] || null;

// Frase curta de cada taxa, para telas de "Por que o Realyz é mais barato" e para a divulgação (sem marcas).
export const comparativo = () =>
  Object.entries(TAXAS).map(([chave, t]) => ({ chave, realys: t.argumento, mercado: MERCADO_PUBLICO[chave] || null }));
