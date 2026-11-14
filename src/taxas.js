// Tabela única das taxas do Re@lys, com a referência do mercado usada para definir cada uma.
// Regra: ficar perto do mercado para ter margem, mas sempre abaixo, para usar isso na divulgação.
// Pesquisa de novembro de 2026 (fontes em PENDENCIAS.md). Ao mudar uma taxa aqui, mude também o
// Termo de Adesão (src/termoAdesao.js, item 16) e suba a versão do termo.

export const TAXAS = {
  protecao: { valor: 0.99, unidade: 'R$ por pedido', quemPaga: 'cliente', mercado: 'iFood: R$ 0,99 de dia e até R$ 1,99 à noite', argumento: 'R$ 0,99 a qualquer hora, sem taxa noturna' },
  food: { pct: 11, quemPaga: 'restaurante', mercado: 'iFood Básico: 12% + 3,2% de pagamento online + R$ 110 de mensalidade', argumento: '11% com pagamento incluído e sem mensalidade obrigatória' },
  shop: { pct: 10, quemPaga: 'loja', mercado: 'Mercado Livre Clássico: 10% a 14% + custo fixo; Shopee: até 20% + R$ 4 por item', argumento: '10% sem taxa fixa por item' },
  corrida: { pct: 18, quemPaga: 'motorista e motoboy', mercado: 'Uber: 20% a 35%; 99: 20% a 30%', argumento: 'o motorista fica com 82% da corrida' },
  visita: { pct: 15, quemPaga: 'prestador', mercado: 'GetNinjas cobra pacotes de moedas por contato, mesmo sem fechar o serviço', argumento: 'só paga quando a visita acontece, e o valor do serviço é todo seu' },
  ingresso: { pct: 8, minimo: 1.99, quemPaga: 'produtor (pode repassar ao comprador)', mercado: 'Sympla: 10%, mínimo de R$ 2,50', argumento: '8%, mínimo de R$ 1,99' },
  presente: { pct: 10, quemPaga: 'descontado do presente', mercado: 'Pix entre pessoas é grátis, mas não tem garantia nem pontos', argumento: '10% com pontos de volta' },
  live: { criador: 70, criadorAntecipado: 63, quemPaga: 'descontado no saque', mercado: 'TikTok: o criador fica com cerca de 50%', argumento: 'o criador fica com 70% do que os fãs enviam' },
  planoEmpresa: { valor: 89, unidade: 'R$ por mês, só para quem vende mais de R$ 1.800 no mês', mercado: 'iFood: R$ 110 a R$ 150 por mês acima de R$ 1.800', argumento: 'R$ 89, e quem vende pouco não paga' },
  destaquePrestador: { valor: 49.9, unidade: 'R$ por mês', mercado: 'GetNinjas: pacotes a partir de R$ 149', argumento: 'destaque o mês inteiro por R$ 49,90' },
};

// Frase curta de cada taxa, para telas de "Por que o Re@lys é mais barato" e para a divulgação.
export const comparativo = () =>
  Object.entries(TAXAS).map(([chave, t]) => ({ chave, realys: t.argumento, mercado: t.mercado }));
