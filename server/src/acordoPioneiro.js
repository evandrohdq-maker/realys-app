// Acordo de Pioneiro (piloto em Passo Fundo): o texto que a empresa, o prestador ou o entregador
// assina no cadastro, com o rosto. É montado aqui, no servidor, com os dados da pessoa e da área, e a
// impressão digital (hash) do texto fica guardada com a assinatura. Mudou o texto? Muda a versão.
//
// Texto a ser revisado por advogado antes do lançamento oficial.
import { createHash } from 'node:crypto';

export const ACORDO_VERSAO = '2026-11-pioneiro-v1';
export const PRECO_MENSAL = 99.9;
export const PRECO_ANUAL = 999;
export const VALOR_AVULSO = 348.3; // o mesmo pacote comprado separado, pela tabela do Realyz
export const DIAS_PARA_PAGAR = 5; // a fatura vence 5 dias depois do fim do mês usado
export const DIAS_ATE_SUSPENDER = 10; // atraso que suspende os benefícios
export const DIAS_INATIVO_ENTREGADOR = 60; // entregador sem entregas por esse tempo perde os benefícios

// Cota de anúncios de cada mês (não acumula para o mês seguinte).
export const COTA_MENSAL = { buscaDias: 10, stories: 4, bannerDias: 2, turbinarReais: 30 };

const brl = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');
const n3 = (n) => (n ? String(n).padStart(3, '0') : '___');
const cnpjFmt = (d) => (/^\d{14}$/.test(d || '') ? `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}` : d || 'não informado');

const AVISO = 'O título de Pioneiro é apenas promocional. Não dá participação na empresa, nos lucros, na marca ou no aplicativo Realyz, nem qualquer direito além dos benefícios descritos neste acordo.';

function clausulasEmpresa(p, area) {
  const negocios = p.area === 'negocios';
  return [
    ['1. Objeto', `Este acordo registra a entrada de ${p.nome} (CNPJ ${cnpjFmt(p.cnpj)}) como Pioneiro do Realyz em Passo Fundo (RS), na área "${area.label}", que tem no máximo ${area.meta} vagas, e o Pacote Pioneiro que a empresa recebe.`],
    ['2. O que o Pacote Pioneiro inclui, todo mês', [
      `Plano ${negocios ? 'de anúncios da sua área (imobiliária ou revenda), com as conversas com interessados liberadas' : 'da loja ou do prestador (vitrine, pedidos, atendimento e página)'}.`,
      `${COTA_MENSAL.buscaDias} dias em primeiro lugar nas buscas da sua área, revezando com os outros pioneiros da mesma área.`,
      `${COTA_MENSAL.stories} stories patrocinados.`,
      `${COTA_MENSAL.bannerDias} dias de banner na vitrine do Shop ou do Food.`,
      `Reels sem limite e ${brl(COTA_MENSAL.turbinarReais)} por mês para turbinar os seus Reels (cerca de 2.500 visualizações, pela tabela do Turbinar).`,
      'Comissão de 8% sobre as vendas de produtos feitas pelo Realyz, no lugar dos 10% da tabela.',
      'Uma segunda página sem custo.',
      'Selo "Pioneiro nº ' + n3(p.numero) + '" no perfil e o nome da empresa na campanha de lançamento.',
      `A cota de cada mês vale só naquele mês e não se acumula. Comprado separado, o mesmo pacote custaria ${brl(VALOR_AVULSO)} por mês pela tabela do Realyz.`,
    ]],
    ['3. Preço', `O Pacote Pioneiro custa ${brl(PRECO_MENSAL)} por mês, ou ${brl(PRECO_ANUAL)} no plano anual, e esse preço fica congelado por 12 meses a partir do lançamento, enquanto o acordo estiver ativo.`],
    ['4. Quando começa e como se paga', `Nada é cobrado antes do lançamento do Realyz ao público em Passo Fundo. A partir do lançamento, a empresa usa o 1º mês e a fatura daquele mês sai no último dia dele, com vencimento em ${DIAS_PARA_PAGAR} dias, por Pix ou pelo saldo da carteira Realyz. Os meses seguintes funcionam do mesmo jeito.`],
    ['5. Compromissos do Realyz', [
      'Só cobrar a partir do lançamento.',
      'Entregar todo mês a cota de anúncios do item 2.',
      'Manter o preço congelado pelo prazo do item 3.',
      `Não aceitar mais pioneiros na área "${area.label}" do que as ${area.meta} vagas.`,
      `Se o lançamento não acontecer em até 6 meses da assinatura, este acordo se encerra sem nenhum custo para a empresa.`,
    ]],
    ['6. Compromissos da empresa', [
      'Pagar a fatura do 1º mês depois do lançamento.',
      'Manter a vitrine (fotos, preços, horários e informações) verdadeira e atualizada.',
      'Atender os pedidos e os clientes que chegarem pelo Realyz.',
      'Seguir o Termo de Adesão do Realyz (realyz.com.br/termos.html).',
    ]],
    ['7. Atraso', `Com ${DIAS_ATE_SUSPENDER} dias de atraso, os benefícios do pacote ficam suspensos até o pagamento, como num plano de internet, e voltam assim que a fatura é paga. Fatura não paga é uma dívida da empresa e pode ser cobrada, inclusive com registro em cadastros de proteção ao crédito ou protesto, sempre depois de aviso prévio.`],
    ['8. Saída', 'Depois de pagar o 1º mês, a empresa pode encerrar o pacote quando quiser, pelo próprio app, sem nenhum valor a mais. O encerramento vale no fim do mês já pago. Quem sai perde o preço de pioneiro e o selo; se voltar, entra pelo preço normal.'],
    ['9. Título de Pioneiro', AVISO],
    ['10. Dados pessoais', 'Os dados da empresa e do titular são tratados conforme a Política de Privacidade do Realyz (realyz.com.br/privacidade.html) e a Lei Geral de Proteção de Dados.'],
    ['11. Assinatura e foro', 'Este acordo é assinado eletronicamente pelo titular da empresa, com a confirmação do rosto no Realyz, que registra a data, a hora, o aparelho e o código do documento (Lei 14.063/2020). Fica eleito o foro de Passo Fundo (RS).'],
  ];
}

function clausulasEntregador(p) {
  const moto = p.area === 'motoboy';
  return [
    ['1. Objeto', `Este termo registra a entrada de ${p.nome} como ${moto ? 'Motoboy' : 'Motorista'} Pioneiro do Realyz em Passo Fundo (RS) e os benefícios que recebe. Não há nenhum custo para participar.`],
    ['2. Benefícios', moto
      ? [
          'Prioridade nas indicações: entre os entregadores que estão perto e disponíveis, o pioneiro aparece primeiro.',
          'Tele-entrega no 1º mês (30 dias a partir da primeira entrega): o Realyz não fica com nenhuma parte da entrega; o valor é 100% seu.',
          'Do 2º ao 6º mês: o Realyz fica com 10% de cada entrega, no lugar dos 18% da tabela.',
          'Depois do 6º mês: 15%, enquanto você continuar pioneiro ativo.',
          'Plano zerado por 6 meses, com destaque e página incluídos, e impulso grátis no começo do dia.',
          `Selo "Pioneiro nº ${n3(p.numero)}" no perfil.`,
        ]
      : [
          'Prioridade nas indicações: entre os motoristas que estão perto e disponíveis, o pioneiro aparece primeiro.',
          'Nas corridas, o Realyz fica com 15% nos primeiros 6 meses a partir da primeira corrida, no lugar dos 18% da tabela.',
          'Plano zerado por 6 meses, com destaque e página incluídos.',
          `Selo "Pioneiro nº ${n3(p.numero)}" no perfil.`,
        ]],
    ['3. Liberdade total', 'Você é autônomo e trabalha quando quiser. Não há horário, quantidade mínima de entregas ou corridas, exclusividade, metas nem multa. Você aceita ou recusa cada chamado e pode usar outros aplicativos.'],
    ['4. Quando os benefícios acabam', `Se você ficar ${DIAS_INATIVO_ENTREGADOR} dias sem nenhuma ${moto ? 'entrega' : 'corrida'}, ou pedir para sair, os benefícios terminam e passa a valer a tabela normal. O selo de Pioneiro continua no seu perfil.`],
    ['5. Requisitos e segurança', 'Ter 18 anos ou mais, CNH válida da categoria do veículo e confirmar o rosto no Realyz, inclusive na conferência periódica a cada 6 horas enquanto estiver disponível, e seguir o Termo de Adesão (realyz.com.br/termos.html).'],
    ['6. Título de Pioneiro', AVISO],
    ['7. Dados pessoais', 'Seus dados são tratados conforme a Política de Privacidade do Realyz (realyz.com.br/privacidade.html) e a Lei Geral de Proteção de Dados.'],
    ['8. Assinatura', 'Este termo é assinado eletronicamente por você, com a confirmação do rosto no Realyz, que registra a data, a hora, o aparelho e o código do documento (Lei 14.063/2020).'],
  ];
}

// Monta o acordo de um pioneiro. area = { id, label, meta, grupo } (AREAS_PIONEIRO).
export function montarAcordo(p, area) {
  const entregador = area.grupo === 'entregador';
  const titulo = entregador ? 'Termo de Pioneiro Realyz · Motoboys e motoristas' : 'Acordo de Pioneiro Realyz';
  const clausulas = entregador ? clausulasEntregador(p) : clausulasEmpresa(p, area);
  const texto = [titulo, `Versão ${ACORDO_VERSAO}`, ...clausulas.map(([t, c]) => `${t}\n${Array.isArray(c) ? c.map((x) => '- ' + x).join('\n') : c}`)].join('\n\n');
  // A impressão digital vale para o texto com os dados da pessoa (sem o número, que sai só na assinatura).
  const hash = createHash('sha256').update(texto).digest('hex');
  return { versao: ACORDO_VERSAO, titulo, entregador, clausulas, texto, hash };
}
