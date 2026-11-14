// Tabela única das taxas do Re@lys, com a referência do mercado usada para definir cada uma.
// Regra: ficar perto do mercado para ter margem, mas sempre abaixo, para usar isso na divulgação.
// Pesquisa de novembro de 2026 (fontes em PENDENCIAS.md). Ao mudar uma taxa aqui, mude também o
// Termo de Adesão (src/termoAdesao.js, item 16) e suba a versão do termo.

export const TAXAS = {
  protecao: { valor: 0.99, unidade: 'R$ por pedido', quemPaga: 'cliente', mercado: 'iFood: R$ 0,99 de dia e até R$ 1,99 à noite', argumento: 'R$ 0,99 a qualquer hora, sem taxa noturna' },
  food: { pct: 10, quemPaga: 'restaurante', mercado: 'iFood Básico: 12% + 3,2% de pagamento online + R$ 110 de mensalidade', argumento: '10% com pagamento incluído, e o plano só começa depois do primeiro pedido' },
  shop: { pct: 10, quemPaga: 'loja', mercado: 'Mercado Livre Clássico: 10% a 14% + custo fixo; Shopee: até 20% + R$ 4 por item', argumento: '10% sem taxa fixa por item' },
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
  // Páginas de usuário (estilo blog): mensalidade por página (src/userPages.js › PAGE_PRICE).
  paginaUsuario: { valor: 14.9, unidade: 'R$ por mês por página', quemPaga: 'usuário dono da página', mercado: 'construtores de site e blog cobram mensalidade por site, sem público incluído', argumento: 'R$ 14,90 por mês com página personalizável e o público verificado do Re@lys' },
  destaquePrestador: { valor: 49.9, unidade: 'R$ por mês', mercado: 'GetNinjas: pacotes a partir de R$ 149', argumento: 'destaque o mês inteiro por R$ 49,90' },
};

// Frase curta de cada taxa, para telas de "Por que o Re@lys é mais barato" e para a divulgação.
export const comparativo = () =>
  Object.entries(TAXAS).map(([chave, t]) => ({ chave, realys: t.argumento, mercado: t.mercado }));
