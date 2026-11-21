// Notícias e Alertas do portal Realyz.
//
// Regras contra fake news:
// - Notícia só de canal verificado (CNPJ de veículo de imprensa + biometria do responsável) ou de
//   órgão oficial. Toda notícia passa pela IA verificadora; se for falsa, é derrubada e marcada.
// - ALERTA de catástrofe só vem de fonte oficial (Defesa Civil, INMET, Cemaden, prefeitura).
//   Ninguém da comunidade publica alerta: o usuário pode mandar um RELATO (ex.: rua alagada), que
//   passa pela moderação e aparece marcado como "relato de moradores", nunca como alerta oficial.
// Notícias e alertas agora são de verdade: src/liveNews.js preenche NEWS (Agência Brasil) e ALERTS
// (INMET). As listas começam vazias e são trocadas no lugar quando os dados chegam.


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

// Alertas oficiais.
// active: true só quando a fonte oficial está ativa. zone (lat, lon, raio em km) diz a área do alerta:
// a faixa do topo só aparece se o GPS do celular estiver dentro dessa área.
export const ALERTS = []; // preenchida por src/liveNews.js (avisos do INMET)

// Notícias (só de canais verificados).
export const NEWS = []; // preenchida por src/liveNews.js (Agência Brasil)

// Relatos de moradores já aprovados pela moderação (não são alertas oficiais).
export const REPORTS = []; // relatos aprovados pela moderação chegam pelo servidor

// Avisos de transporte ligados às notícias e alertas: voos, estradas e transporte público.
// Na versão real vêm dos aeroportos, companhias aéreas, concessionárias e operadoras pelo servidor.
// risk: chance de atraso ou problema (alta, media, baixa). link: para onde o botão leva no app.
export const TRANSPORT_ALERTS = []; // avisos de voos e estradas: entram quando houver fonte oficial ligada
export const RISK = {
  alta: { label: 'Chance alta', color: '#B42318' },
  media: { label: 'Chance média', color: '#D9480F' },
  baixa: { label: 'Chance baixa', color: '#B7791F' },
};

export const alertOf = (id) => ALERTS.find((a) => a.id === id);
