// ONGs no Realyz: perfil próprio (com CNPJ conferido), doação direta dos clientes e UMA campanha
// gratuita por mês, bem exposta, explicando o problema, o objetivo, o motivo da arrecadação e para
// onde vai o dinheiro. Assim ninguém precisa "direcionar propaganda para ONG": o espaço é delas,
// e o feed não fica cheio de pedido de dinheiro (no máximo uma campanha por vez no feed).

export const CAMPANHAS_GRATIS_MES = 1;
export const DOACAO_TAXA_PCT = 0; // doação sem taxa do Realyz
export const VALORES_DOACAO = [10, 20, 50, 100];
export const CAUSAS = ['Animais', 'Fome e alimentação', 'Crianças e adolescentes', 'Idosos', 'Saúde', 'Educação', 'Moradia', 'Meio ambiente', 'Pessoas com deficiência', 'Emergências e enchentes'];

export const mesDe = (t = Date.now()) => new Date(t).toISOString().slice(0, 7);

// A campanha só vai ao ar com tudo explicado.
export function faltaNaCampanha(c) {
  const f = [];
  if (!c || String(c.titulo || '').trim().length < 6) f.push('Título da campanha');
  if (String((c && c.problema) || '').trim().length < 20) f.push('O problema (pelo menos uma frase)');
  if (String((c && c.objetivo) || '').trim().length < 20) f.push('O objetivo da arrecadação');
  if (!(Number(c && c.meta) >= 50)) f.push('A meta em reais (a partir de R$ 50)');
  if (!((c && c.destino) || []).filter((d) => String(d.item || '').trim() && Number(d.valor) > 0).length) f.push('Para onde vai o dinheiro (pelo menos um item com valor)');
  return f;
}

// Já usou a campanha grátis deste mês?
export const campanhasNoMes = (ong, mes = mesDe()) => (ong.campanhas || []).filter((c) => c.mes === mes).length;
export const podeNovaCampanha = (ong, mes = mesDe()) => campanhasNoMes(ong, mes) < CAMPANHAS_GRATIS_MES;
export const campanhaAtual = (ong, mes = mesDe()) => (ong.campanhas || []).find((c) => c.mes === mes) || null;

// Uma campanha por vez no feed, girando entre as ONGs com campanha no mês.
export function campanhaDoFeed(ongs, giro = 0) {
  const ativas = (ongs || []).map((o) => ({ ong: o, c: campanhaAtual(o) })).filter((x) => x.c && x.ong.verificada);
  return ativas.length ? ativas[giro % ativas.length] : null;
}

// Anúncio pago pedindo doação fora do perfil de ONG: não passa.
export const pedeDoacao = (txt) => {
  const t = ` ${String(txt || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ')} `;
  return /( doacao | doacoes | doe | doem | vaquinha | arrecadacao | ajude a ong | pix para a ong | pix pra ong )/.test(t);
};

export const pct = (a, b) => (b ? Math.min(100, Math.round((a / b) * 100)) : 0);

export function ongsDemo() {
  const mes = mesDe();
  return [
    {
      id: 'ong1', nome: 'Amigo Bicho Passo Fundo', logo: '🐾', causa: 'Animais', cidade: 'Passo Fundo - RS', cnpj: '12.345.678/0001-90', verificada: true,
      sobre: 'Resgatamos, tratamos e colocamos para adoção cães e gatos abandonados. Hoje cuidamos de 86 animais.',
      arrecadado: 1840, doadores: 63,
      contas: [{ mes: 'Outubro', entrou: 2310, saiu: 2295, onde: 'Ração (R$ 1.120), veterinário (R$ 860), vacinas e castração (R$ 315)' }],
      campanhas: [{ id: 'c1', mes, titulo: 'Castração de 30 cadelas resgatadas', problema: 'Cada cadela não castrada pode gerar até 20 filhotes por ano, que acabam nas ruas.', objetivo: 'Castrar 30 cadelas do abrigo até o fim do mês, com a clínica parceira.', meta: 3600, arrecadado: 1840, destino: [{ item: 'Cirurgias de castração (30 × R$ 100)', valor: 3000 }, { item: 'Medicação e pós-operatório', valor: 600 }] }],
    },
    {
      id: 'ong2', nome: 'Banco de Alimentos Solidário', logo: '🥫', causa: 'Fome e alimentação', cidade: 'Passo Fundo - RS', cnpj: '98.765.432/0001-10', verificada: true,
      sobre: 'Recolhemos alimentos de mercados e produtores e entregamos para 40 entidades e 320 famílias por mês.',
      arrecadado: 960, doadores: 41,
      contas: [{ mes: 'Outubro', entrou: 1500, saiu: 1480, onde: 'Combustível da coleta (R$ 620), cestas completas (R$ 860)' }],
      campanhas: [{ id: 'c2', mes, titulo: 'Cesta de Natal para 100 famílias', problema: 'Em dezembro as doações de mercados caem e muitas famílias ficam sem o básico.', objetivo: 'Montar e entregar 100 cestas completas até 20 de dezembro.', meta: 9000, arrecadado: 960, destino: [{ item: 'Cestas básicas (100 × R$ 85)', valor: 8500 }, { item: 'Frete das entregas', valor: 500 }] }],
    },
    {
      id: 'ong3', nome: 'Casa Lar Esperança', logo: '🏠', causa: 'Crianças e adolescentes', cidade: 'Passo Fundo - RS', cnpj: '11.222.333/0001-44', verificada: true,
      sobre: 'Acolhemos crianças afastadas da família por decisão judicial, com escola, reforço e atendimento psicológico.',
      arrecadado: 0, doadores: 0, contas: [], campanhas: [],
    },
  ];
}
