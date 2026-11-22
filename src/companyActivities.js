// Atividades de empresa pelo CNAE (Classificação Nacional de Atividades Econômicas, IBGE).
// A empresa DIGITA o que faz (ou o número do CNAE do cartão CNPJ) e escolhe entre até 4 opções.
// A atividade escolhida monta o formulário da empresa: área (Onde atua), segmentos, papel na cadeia
// e se é do ramo de alimentação. Assim uma loja de eletrônicos nunca vê pergunta de cardápio.
// Códigos no nível de CLASSE do CNAE (4 dígitos + dígito verificador); indústria e agro, no nível de
// DIVISÃO (2 dígitos), porque têm muitas classes. Confira o seu no cartão CNPJ.
export const cnaeTexto = (c) => (c.length <= 2 ? `CNAE divisão ${c}` : `CNAE ${c}`);
//
// [cnae, nome, área (SECTORS de companyBusiness), segmento, papéis, palavras]
const A = [
  // Alimentação
  ['5611-2', 'Restaurante, lanchonete ou bar', 'alimentacao', 'Restaurante', ['varejista'], 'restaurante lanchonete bar boteco pizzaria hamburgueria comida delivery marmita'],
  ['5612-1', 'Food truck e comida de rua', 'alimentacao', 'Food truck', ['varejista'], 'food truck ambulante comida de rua'],
  ['5620-1', 'Buffet e fornecimento de refeições', 'alimentacao', 'Eventos e buffet', ['varejista', 'prestadora'], 'buffet bufe marmitas refeicoes catering coffee break'],
  ['1091-1', 'Padaria e confeitaria (fabricação)', 'alimentacao', 'Padaria', ['fabricante', 'varejista'], 'padaria confeitaria bolos doces paes'],
  ['4721-1', 'Padaria, laticínios e doces (comércio)', 'alimentacao', 'Doceria', ['varejista'], 'padaria laticinios doceria doces'],
  ['4722-9', 'Açougue e peixaria', 'mercado', 'Açougue', ['varejista'], 'acougue carnes peixaria peixe'],
  ['4723-7', 'Bebidas e adega', 'mercado', 'Bebidas e adega', ['varejista'], 'bebidas adega distribuidora de bebidas cerveja vinho'],
  ['4724-5', 'Hortifrúti', 'mercado', 'Hortifrúti', ['varejista'], 'hortifruti frutas verduras legumes sacolao'],
  ['4711-3', 'Supermercado', 'mercado', 'Supermercado', ['varejista'], 'supermercado hipermercado'],
  ['4712-1', 'Mercado de bairro e mercearia', 'mercado', 'Mercado de bairro', ['varejista'], 'mercado mercadinho mercearia minimercado conveniencia emporio'],
  ['10', 'Indústria de alimentos e bebidas', 'industria', 'Alimentos e bebidas', ['fabricante', 'fornecedor'], 'industria de alimentos fabrica de alimentos bebidas laticinio frigorifico'],
  // Moda
  ['4781-4', 'Loja de roupas e acessórios', 'moda', 'Feminino', ['varejista'], 'roupas moda vestuario boutique acessorios'],
  ['4782-2', 'Loja de calçados', 'moda', 'Calçados', ['varejista'], 'calcados sapatos tenis sapataria'],
  ['4783-1', 'Joalheria e relojoaria', 'moda', 'Joias e bijuterias', ['varejista'], 'joias joalheria relogios bijuterias'],
  ['4774-1', 'Ótica', 'moda', 'Ótica', ['varejista'], 'otica oculos lentes'],
  ['1412-6', 'Confecção de roupas', 'industria', 'Têxtil e confecção', ['fabricante', 'fornecedor'], 'confeccao fabrica de roupas costura'],
  // Eletrônicos e tecnologia
  ['4752-1', 'Loja de celulares e telefonia', 'tecnologia', 'Celulares', ['varejista'], 'celulares celular telefonia smartphone acessorios para celular'],
  ['4751-2', 'Loja de informática', 'tecnologia', 'Informática', ['varejista'], 'informatica computadores notebooks pecas de computador'],
  ['4753-9', 'Eletrodomésticos e eletrônicos', 'varejo', 'Eletrônicos', ['varejista'], 'eletronicos eletrodomesticos tv som audio video'],
  ['9511-8', 'Assistência técnica de computadores', 'tecnologia', 'Assistência técnica', ['prestadora'], 'assistencia tecnica conserto de computador notebook'],
  ['9512-6', 'Assistência técnica de celulares', 'tecnologia', 'Assistência técnica', ['prestadora'], 'conserto de celular assistencia de celular'],
  ['6201-5', 'Desenvolvimento de software e apps', 'tecnologia', 'Software e apps', ['prestadora'], 'software aplicativos apps sistemas programacao desenvolvimento inteligencia artificial'],
  ['6190-6', 'Provedor de internet', 'tecnologia', 'Provedor de internet', ['prestadora'], 'provedor internet fibra telecom'],
  ['26', 'Fabricação de eletrônicos', 'industria', 'Eletrônicos', ['fabricante', 'fornecedor'], 'fabrica de eletronicos industria eletronica'],
  // Varejo em geral
  ['4772-5', 'Cosméticos e perfumaria', 'varejo', 'Cosméticos e perfumaria', ['varejista'], 'cosmeticos perfumaria maquiagem perfumes'],
  ['4771-7', 'Farmácia e drogaria', 'saude', 'Farmácia', ['varejista'], 'farmacia drogaria remedios'],
  ['4744-0', 'Material de construção', 'casa', 'Material de construção', ['varejista'], 'material de construcao ferragens tintas madeireira'],
  ['4754-7', 'Loja de móveis e colchões', 'casa', 'Móveis', ['varejista'], 'moveis colchoes decoracao'],
  ['4761-0', 'Papelaria e livraria', 'varejo', 'Papelaria e livraria', ['varejista'], 'papelaria livraria livros material escolar'],
  ['4763-6', 'Esporte, brinquedos e lazer', 'varejo', 'Esporte e lazer', ['varejista'], 'artigos esportivos brinquedos bicicletas camping'],
  ['4789-0', 'Pet shop e outros produtos', 'pet', 'Pet shop', ['varejista'], 'pet shop racao animais'],
  ['4789-0', 'Loja de presentes e variedades', 'varejo', 'Presentes', ['varejista'], 'presentes variedades bazar artesanato'],
  // Automotivo
  ['4511-1', 'Concessionária e venda de veículos', 'automotivo', 'Concessionária', ['varejista'], 'concessionaria revenda de carros veiculos seminovos'],
  ['4520-0', 'Oficina mecânica', 'automotivo', 'Oficina mecânica', ['prestadora'], 'oficina mecanica funilaria lava rapido manutencao de veiculos'],
  ['4530-7', 'Autopeças', 'automotivo', 'Autopeças', ['varejista'], 'autopecas pecas de carro pneus'],
  // Saúde, beleza e bem-estar
  ['8630-5', 'Clínica médica ou odontológica', 'saude', 'Clínica', ['prestadora'], 'clinica consultorio odontologia dentista medico'],
  ['9602-5', 'Salão de beleza e barbearia', 'saude', 'Salão e barbearia', ['prestadora'], 'salao de beleza barbearia cabeleireiro manicure estetica'],
  ['9313-1', 'Academia', 'saude', 'Academia', ['prestadora'], 'academia musculacao crossfit pilates'],
  // Serviços
  ['6920-6', 'Contabilidade', 'servicos', 'Contabilidade', ['prestadora'], 'contabilidade escritorio contabil contador'],
  ['6911-7', 'Escritório de advocacia', 'servicos', 'Advocacia', ['prestadora'], 'advocacia escritorio de advocacia advogados'],
  ['7311-4', 'Agência de publicidade e marketing', 'servicos', 'Marketing e publicidade', ['prestadora'], 'agencia publicidade marketing digital social media'],
  ['8121-4', 'Limpeza e conservação', 'servicos', 'Limpeza', ['prestadora'], 'limpeza conservacao faxina terceirizada'],
  ['7420-0', 'Fotografia e filmagem', 'servicos', 'Fotografia', ['prestadora'], 'fotografia estudio fotografico filmagem'],
  ['1813-0', 'Gráfica', 'servicos', 'Gráfica', ['prestadora', 'fabricante'], 'grafica impressao banners cartoes'],
  // Construção e imobiliário
  ['4120-4', 'Construtora', 'imobiliario', 'Construtora', ['prestadora'], 'construtora construcao obras edificios'],
  ['6821-8', 'Imobiliária', 'imobiliario', 'Imobiliária: venda', ['prestadora'], 'imobiliaria corretora de imoveis venda locacao aluguel'],
  // Transporte
  ['4930-2', 'Transportadora e fretes', 'transporte', 'Transportadora', ['prestadora'], 'transportadora frete cargas mudancas logistica'],
  ['7711-0', 'Locadora de veículos', 'transporte', 'Locadora de veículos', ['prestadora'], 'locadora aluguel de carros'],
  // Turismo, eventos e educação
  ['5510-8', 'Hotel e pousada', 'turismo', 'Hotel', ['prestadora'], 'hotel pousada hostel hospedagem'],
  ['7911-2', 'Agência de viagens', 'turismo', 'Agência de viagens', ['prestadora'], 'agencia de viagens turismo pacotes'],
  ['8230-0', 'Organização de eventos', 'eventos', 'Produtora de eventos', ['prestadora'], 'eventos produtora festas casamentos formaturas'],
  ['8599-6', 'Cursos livres e profissionalizantes', 'educacao', 'Cursos livres', ['prestadora'], 'cursos treinamentos curso profissionalizante'],
  ['8593-7', 'Escola de idiomas', 'educacao', 'Idiomas', ['prestadora'], 'escola de idiomas ingles espanhol'],
  ['8513-9', 'Escola', 'educacao', 'Escola', ['prestadora'], 'escola colegio ensino fundamental'],
  // Agro
  ['01', 'Agricultura e pecuária', 'agro', 'Grãos', ['fabricante', 'fornecedor'], 'agricultura lavoura graos soja milho pecuaria gado fazenda'],
  ['4683-4', 'Insumos agrícolas (comércio)', 'agro', 'Insumos', ['fornecedor', 'distribuidor'], 'insumos agricolas defensivos fertilizantes sementes agropecuaria'],
  // Institucional
  ['9491-0', 'Igreja e organização religiosa', 'institucional', 'Igreja e instituição religiosa', ['institucional'], 'igreja templo organizacao religiosa'],
  ['9430-8', 'ONG e projeto social', 'institucional', 'ONG e projeto social', ['institucional'], 'ong projeto social associacao beneficente'],
];

export const ATIVIDADES = A.map(([cnae, nome, area, segmento, papeis, palavras], i) => ({ id: `a${i}`, cnae, nome, area, segmento, papeis, palavras }));
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

// Até 4 atividades pelo que a empresa digitou (nome, palavra ou número do CNAE).
export function buscarAtividades(q, n = 4) {
  const t = norm(q);
  if (t.length < 2) return [];
  const num = t.replace(/\D/g, '');
  return ATIVIDADES.map((a) => {
    const nome = norm(a.nome);
    let s = 0;
    if (num.length >= 2 && a.cnae.replace(/\D/g, '').startsWith(num.slice(0, 4))) s = 90;
    else if (nome.startsWith(t)) s = 80;
    else if (nome.split(/[\s,()]+/).some((w) => w.startsWith(t))) s = 65;
    else if (a.palavras.split(' ').some((w) => w.startsWith(t))) s = 50;
    else if (a.palavras.includes(t)) s = 35;
    return [s, a];
  })
    .filter(([s]) => s)
    .sort((x, y) => y[0] - x[0])
    .slice(0, n)
    .map(([, a]) => a);
}
export const atividadePorId = (id) => ATIVIDADES.find((a) => a.id === id) || null;
// Do ramo de alimentação? (só essas veem cardápio, Food, tele grátis…)
export const ehAlimentacao = (a) => !!a && ['alimentacao', 'mercado'].includes(a.area);
