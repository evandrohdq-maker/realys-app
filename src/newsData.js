// Notícias e Alertas do portal Realys.
//
// Regras contra fake news:
// - Notícia só de canal verificado (CNPJ de veículo de imprensa + biometria do responsável) ou de
//   órgão oficial. Toda notícia passa pela IA verificadora; se for falsa, é derrubada e marcada.
// - ALERTA de catástrofe só vem de fonte oficial (Defesa Civil, INMET, Cemaden, prefeitura).
//   Ninguém da comunidade publica alerta: o usuário pode mandar um RELATO (ex.: rua alagada), que
//   passa pela moderação e aparece marcado como "relato de moradores", nunca como alerta oficial.
// Tudo aqui é de demonstração. Na versão real, os alertas vêm dos sistemas oficiais pelo servidor.

const photo = (seed, w = 800, h = 460) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

export const NEWS_CATS = [
  { key: 'todas', label: 'Destaques', icon: 'flame-outline' },
  { key: 'alertas', label: 'Alertas', icon: 'warning-outline' },
  { key: 'transporte', label: 'Transporte', icon: 'airplane-outline' },
  { key: 'cidade', label: 'Sua cidade', icon: 'location-outline' },
  { key: 'brasil', label: 'Brasil', icon: 'flag-outline' },
  { key: 'mundo', label: 'Mundo', icon: 'globe-outline' },
  { key: 'economia', label: 'Economia', icon: 'trending-up-outline' },
  { key: 'agro', label: 'Agro', icon: 'leaf-outline' },
  { key: 'tecnologia', label: 'Tecnologia', icon: 'hardware-chip-outline' },
  { key: 'esportes', label: 'Esportes', icon: 'football-outline' },
  { key: 'saude', label: 'Saúde', icon: 'medkit-outline' },
  { key: 'clima', label: 'Clima', icon: 'rainy-outline' },
];

// Níveis de alerta (cores parecidas com as da Defesa Civil e do INMET).
export const ALERT_LEVELS = {
  extremo: { label: 'Alerta extremo', color: '#B42318', bg: '#FEE4E2', icon: 'alert-circle' },
  alto: { label: 'Alerta', color: '#D9480F', bg: '#FFF0E6', icon: 'warning' },
  atencao: { label: 'Atenção', color: '#B7791F', bg: '#FFF8E1', icon: 'information-circle' },
};

// Alertas oficiais perto do usuário (demonstração).
// active: true só quando a fonte oficial está ativa para a área do usuário. Só alertas ativos aparecem na faixa do topo.
export const ALERTS = [
  {
    id: 'al1', active: false, level: 'extremo', type: 'Chuva forte e risco de alagamento', icon: 'thunderstorm',
    area: 'Zona Sul de São Paulo · você está na área', source: 'Defesa Civil', until: 'até 23h de hoje',
    text: 'Chuva de 50 a 80 mm com rajadas de vento. Risco de alagamento em córregos e ruas baixas.',
    todo: ['Não atravesse ruas alagadas, nem de carro', 'Tire da tomada os aparelhos se a água entrar', 'Fique longe de árvores, postes e fios', 'Em área de risco, procure o abrigo indicado pela Defesa Civil'],
    phone: '199', phoneLabel: 'Defesa Civil',
  },
  {
    id: 'al2', level: 'alto', type: 'Risco de deslizamento', icon: 'trail-sign',
    area: 'Encostas da Serra do Mar · 38 km de você', source: 'Cemaden', until: 'próximas 48 h',
    text: 'Solo encharcado depois de 3 dias de chuva. Moradores de encosta devem ficar atentos a rachaduras e barulhos na terra.',
    todo: ['Observe rachaduras em paredes e no chão', 'Se ouvir estalos ou ver lama descendo, saia de casa', 'Tenha documentos e remédios numa mochila'],
    phone: '199', phoneLabel: 'Defesa Civil',
  },
  {
    id: 'al3', level: 'atencao', type: 'Onda de calor', icon: 'sunny',
    area: 'Interior de São Paulo', source: 'INMET', until: 'até sexta',
    text: 'Temperatura 5 °C acima da média por 3 dias seguidos.',
    todo: ['Beba água mesmo sem sede', 'Evite sol entre 10h e 16h', 'Cuide de idosos, crianças e animais'],
    phone: '192', phoneLabel: 'SAMU',
  },
];

// Notícias (só de canais verificados).
export const NEWS = [
  { id: 'n1', cat: 'alertas', source: 'Defesa Civil', official: true, time: 'há 20 min', title: 'Defesa Civil abre 6 abrigos na Zona Sul por causa da chuva', summary: 'Escolas municipais recebem quem precisar sair de casa. Leve documentos e remédios.', photo: photo('realys-news-abrigo'), reads: 18200 },
  { id: 'n2', cat: 'clima', source: 'Canal Clima Agora', time: 'há 1 h', title: 'Frente fria chega no fim de semana e derruba a temperatura em 10 °C', summary: 'Depois da chuva forte, o frio deve durar até terça no Sul e no Sudeste.', photo: photo('realys-news-frio'), reads: 9400 },
  { id: 'n3', cat: 'cidade', source: 'Realys Notícias', time: 'há 2 h', title: 'Prefeitura libera faixa exclusiva de ônibus na Avenida Central', summary: 'A mudança vale a partir de segunda e promete reduzir o tempo de viagem em 15 minutos.', photo: photo('realys-news-onibus'), reads: 5100 },
  { id: 'n4', cat: 'economia', source: 'Realys Notícias', time: 'há 3 h', title: 'Pequenos negócios puxam a criação de empregos no mês', summary: 'Comércio e serviços lideram as contratações; MEIs crescem 8% no ano.', photo: photo('realys-news-emprego'), reads: 7300 },
  { id: 'n5', cat: 'agro', source: 'Canal Campo Hoje', time: 'há 3 h', title: 'Café sobe pela terceira semana com chuva irregular nas lavouras', summary: 'Produtores do Sul de Minas relatam atraso na florada.', photo: photo('realys-news-cafe'), reads: 4200 },
  { id: 'n6', cat: 'tecnologia', source: 'Tech Brasil', time: 'há 4 h', title: 'IA no celular: apps já funcionam sem internet para tarefas do dia a dia', summary: 'Modelos menores rodam direto no aparelho e protegem a privacidade.', photo: photo('realys-news-ia'), reads: 6100 },
  { id: 'n7', cat: 'brasil', source: 'Realys Notícias', time: 'há 5 h', title: 'Campanha nacional de vacinação começa na segunda em todo o país', summary: 'Postos abrem também no sábado. Leve documento com foto e cartão de vacina.', photo: photo('realys-news-vacina'), reads: 11800 },
  { id: 'n8', cat: 'saude', source: 'Realys Notícias', time: 'há 6 h', title: 'Calor e chuva aumentam casos de dengue: veja como se proteger', summary: 'Água parada em vasos e calhas é o principal criadouro do mosquito.', photo: photo('realys-news-dengue'), reads: 8800 },
  { id: 'n9', cat: 'esportes', source: 'Esporte Total', time: 'há 7 h', title: 'Copa da Várzea tem final marcada para domingo com transmissão no Realys', summary: 'Unidos e Vila Nova decidem o título às 10h.', photo: photo('realys-news-varzea'), reads: 3900 },
  { id: 'n10', cat: 'mundo', source: 'Agência Mundo', time: 'há 8 h', title: 'Países fecham acordo para reduzir o plástico nos oceanos', summary: 'Metas valem a partir de 2028 e incluem embalagens de comida.', photo: photo('realys-news-oceano'), reads: 4700 },
];

// Relatos de moradores já aprovados pela moderação (não são alertas oficiais).
export const REPORTS = [
  { id: 'rp1', who: 'Moradora verificada', area: 'Rua das Flores, Vila Mariana', text: 'Água na altura do joelho perto do córrego. Evitem passar de carro.', time: 'há 15 min', confirms: 23 },
  { id: 'rp2', who: 'Morador verificado', area: 'Av. Ibirapuera', text: 'Árvore caída bloqueando uma faixa no sentido centro.', time: 'há 32 min', confirms: 11 },
];

// Avisos de transporte ligados às notícias e alertas: voos, estradas e transporte público.
// Na versão real vêm dos aeroportos, companhias aéreas, concessionárias e operadoras pelo servidor.
// risk: chance de atraso ou problema (alta, media, baixa). link: para onde o botão leva no app.
export const TRANSPORT_ALERTS = [
  { id: 'tr1', kind: 'voo', icon: 'airplane', risk: 'alta', title: 'Voos em Congonhas podem atrasar hoje à noite', text: 'A chuva forte prevista para depois das 18h pode fechar a pista por alguns períodos. Confira o seu voo com a companhia antes de sair.', source: 'Aeroporto de Congonhas', related: 'al1', link: { tab: 'transporte' } },
  { id: 'tr2', kind: 'voo', icon: 'airplane', risk: 'media', title: 'Guarulhos: possíveis atrasos nas chegadas do Sul', text: 'Frente fria no Sul pode atrasar voos que chegam de Porto Alegre e Curitiba amanhã cedo.', source: 'Aeroporto de Guarulhos', link: { tab: 'transporte' } },
  { id: 'tr3', kind: 'estrada', icon: 'car', risk: 'alta', title: 'Rodovia dos Imigrantes com pista interditada na serra', text: 'Pista de descida fechada por risco de deslizamento. Use a Anchieta, com trânsito lento.', source: 'Concessionária da rodovia', related: 'al2', link: { tab: 'transporte' } },
  { id: 'tr4', kind: 'metro', icon: 'subway', risk: 'media', title: 'Metrô com velocidade reduzida na Linha 1', text: 'Por causa da chuva, os trens circulam mais devagar entre Paraíso e Jabaquara.', source: 'Operadora do metrô', related: 'al1', link: { tab: 'transporte' } },
  { id: 'tr5', kind: 'onibus', icon: 'bus', risk: 'baixa', title: '3 linhas de ônibus desviadas na Zona Sul', text: 'Desvio por alagamento na Av. dos Bandeirantes. O GPS mostra a rota nova em Transporte.', source: 'SPTrans', related: 'al1', link: { tab: 'transporte' } },
];
export const RISK = {
  alta: { label: 'Chance alta', color: '#B42318' },
  media: { label: 'Chance média', color: '#D9480F' },
  baixa: { label: 'Chance baixa', color: '#B7791F' },
};

export const alertOf = (id) => ALERTS.find((a) => a.id === id);
