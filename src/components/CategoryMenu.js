import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView, Pressable, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, ROLE_LABELS, soft } from '../theme';
import { serviceTypes } from '../data';
import { SHOP_SECTORS, SHOP_SECTOR_KEYS } from '../shopSectorsData';

// Ícones dos subgrupos de Eletrônicos, Vestuário e Utensílios domésticos no menu ⋮.
const GROUP_ION = {
  todos: 'grid-outline', celulares: 'phone-portrait-outline', informatica: 'laptop-outline', tvaudio: 'tv-outline', games: 'game-controller-outline', smarthome: 'bulb-outline', acessorios: 'watch-outline',
  feminino: 'woman-outline', masculino: 'man-outline', infantil: 'happy-outline', calcados: 'footsteps-outline', fitness: 'barbell-outline',
  cozinha: 'restaurant-outline', eletroportateis: 'flash-outline', mesa: 'wine-outline', cama: 'bed-outline', limpeza: 'sparkles-outline', organizacao: 'file-tray-stacked-outline',
  geladeiras: 'snow-outline', fogoes: 'flame-outline', lavadoras: 'water-outline', climatizacao: 'thermometer-outline', fornos: 'pizza-outline', lavaloucas: 'restaurant-outline', instalacao: 'construct-outline',
  presentes: 'gift-outline', papelaria: 'pencil-outline', pet: 'paw-outline', brinquedos: 'happy-outline', ferramentas: 'hammer-outline', festas: 'balloon-outline', esporte: 'football-outline', beleza: 'rose-outline',
  perfumes: 'flask-outline', maquiagem: 'color-palette-outline', cabelos: 'cut-outline', pele: 'water-outline', barbearia: 'cut-outline', unhas: 'hand-left-outline', farmacia: 'medkit-outline', suplementos: 'barbell-outline',
  academia: 'barbell-outline', bike: 'bicycle-outline', futebol: 'football-outline', quadra: 'tennisball-outline', camping: 'bonfire-outline', pesca: 'fish-outline', aquaticos: 'water-outline', radicais: 'speedometer-outline', lutas: 'hand-right-outline',
  passeio: 'cart-outline', enxoval: 'shirt-outline', higiene: 'sparkles-outline', alimentacao: 'nutrition-outline', seguranca: 'shield-checkmark-outline', brincar: 'happy-outline',
  caes: 'paw-outline', gatos: 'paw-outline', aves: 'leaf-outline', peixes: 'fish-outline', roedores: 'paw-outline', racao: 'nutrition-outline', higienepet: 'medkit-outline', acessoriospet: 'bed-outline',
  pecas: 'cog-outline', pneus: 'ellipse-outline', som: 'volume-high-outline', acessoriosauto: 'car-outline', moto: 'bicycle-outline', capacetes: 'shield-outline', oleos: 'water-outline',
  eletricas: 'flash-outline', manuais: 'hammer-outline', materiais: 'cube-outline', eletrica: 'bulb-outline', hidraulica: 'water-outline', pintura: 'brush-outline', jardim: 'leaf-outline',
  livros: 'book-outline', religiosos: 'book-outline', escolar: 'school-outline', arte: 'brush-outline', biblias: 'book-outline',
  bonecas: 'happy-outline', carrinhos: 'car-outline', educativos: 'extension-puzzle-outline', tabuleiro: 'dice-outline', pelucias: 'heart-outline', arlivre: 'sunny-outline', colecionaveis: 'star-outline',
  cordas: 'musical-notes-outline', teclas: 'musical-note-outline', percussao: 'musical-notes-outline', sopro: 'musical-note-outline', audio: 'mic-outline', acessoriosmus: 'options-outline',
  aneis: 'diamond-outline', colares: 'diamond-outline', brincos: 'sparkles-outline', pulseiras: 'link-outline', relogios: 'watch-outline', bijuterias: 'star-outline',
  sala: 'tv-outline', quarto: 'bed-outline', cozinhamov: 'cafe-outline', escritorio: 'desktop-outline', externa: 'leaf-outline', decoracao: 'color-palette-outline', iluminacao: 'bulb-outline', tapetes: 'grid-outline',
};
const sectorClass = (k) => {
  const s = SHOP_SECTORS[k];
  return {
    key: k,
    title: s.title,
    hint: s.hint,
    icon: s.ion,
    subs: [
      ...s.groups.filter((g) => g.key !== 'todos').map((g) => ({ label: g.label, hint: s.title, icon: GROUP_ION[g.key] || s.ion, go: { tab: k, group: g.key } })),
      { label: 'Ver tudo', hint: `Todo o setor de ${s.title.toLowerCase()}`, icon: 'grid-outline', go: { tab: k, group: 'todos' } },
    ],
  };
};

// Classes do menu de três pontinhos (⋮). Cada uma abre uma sub-aba com os tipos.
// "go" diz para qual aba o app vai e com qual filtro.
export const CATEGORIES = [
  {
    key: 'restaurantes',
    title: 'Restaurantes',
    hint: 'Delivery, mesa e retirada',
    icon: 'restaurant-outline',
    subs: [
      { label: 'Pizzaria', hint: 'Forno e delivery', icon: 'pizza-outline', go: { tab: 'food', cat: 'Alimentação', q: 'pizza' } },
      { label: 'Hambúrguer', hint: 'Lanches e combos', icon: 'fast-food-outline', go: { tab: 'food', cat: 'Alimentação', q: 'burguer' } },
      { label: 'Japonesa', hint: 'Sushi, temaki e rodízio', icon: 'fish-outline', go: { tab: 'food', cat: 'Alimentação', q: 'sushi' } },
      { label: 'Brasileira', hint: 'Em breve', icon: 'flame-outline', soon: true, go: { tab: 'food', cat: 'Alimentação', q: '' } },
      { label: 'Bares e happy hour', hint: 'Chope, petiscos e música ao vivo', icon: 'beer-outline', go: { tab: 'food', cat: 'Bares', q: '' } },
      { label: 'Doces e cafés', hint: 'Cafeterias e docerias', icon: 'cafe-outline', go: { tab: 'food', cat: 'Doces e cafés', q: '' } },
      { label: 'Ver todos', hint: 'Abrir o Food', icon: 'grid-outline', go: { tab: 'food', cat: 'Todos', q: '' } },
    ],
  },
  {
    key: 'servicos',
    title: 'Prestação de serviços',
    hint: 'Profissionais perto de você e hotelaria',
    icon: 'construct-outline',
    subs: [
      ...serviceTypes.map((s) => ({ label: s.label, hint: s.group, icon: s.ion, go: { tab: 'servicos', service: s.key } })),
      // Hotelaria agora faz parte da prestação de serviços.
      { label: 'Hotéis', hint: 'Hotelaria · reserve a diária', icon: 'bed-outline', go: { tab: 'home', top: 'anuncios', kind: 'hotel' } },
      { label: 'Pousadas', hint: 'Hotelaria · praia, serra e campo', icon: 'leaf-outline', go: { tab: 'home', top: 'anuncios', kind: 'hotel' } },
    ],
  },
  {
    key: 'tecnologia',
    title: 'Tecnologia',
    hint: 'IA, robótica, apps e cursos',
    icon: 'hardware-chip-outline',
    subs: [
      { label: 'Inteligência artificial', hint: 'IA para empresas e para o campo', icon: 'sparkles-outline', go: { tab: 'tecnologia', seg: 'ia' } },
      { label: 'Robótica', hint: 'Kits, indústria e robôs agrícolas', icon: 'hardware-chip-outline', go: { tab: 'tecnologia', seg: 'robotica' } },
      { label: 'Apps e sistemas', hint: 'Gestão, apps e sites', icon: 'phone-portrait-outline', go: { tab: 'tecnologia', seg: 'apps' } },
      { label: 'Cursos e eventos', hint: 'IA, Arduino e hackathons', icon: 'school-outline', go: { tab: 'tecnologia', seg: 'cursos' } },
      { label: 'Desenvolvedores', hint: 'Contrate quem cria o seu app', icon: 'code-slash-outline', go: { tab: 'servicos', service: 'dev' } },
      { label: 'Agro é tech', hint: 'Tecnologia para o campo', icon: 'leaf-outline', go: { tab: 'tecnologia', seg: 'agrotech' } },
    ],
  },
  {
    key: 'agro',
    title: 'Agro',
    hint: 'Insumos, máquinas, agrônomos e produtores',
    icon: 'leaf-outline',
    subs: [
      { label: 'Grãos', hint: 'Soja, milho, trigo e silos', icon: 'nutrition-outline', go: { tab: 'agro', chain: 'graos' } },
      { label: 'Café', hint: 'Mudas, colheita e café especial', icon: 'cafe-outline', go: { tab: 'agro', chain: 'cafe' } },
      { label: 'Pecuária', hint: 'Gado, ração, leilão e veterinário', icon: 'paw-outline', go: { tab: 'agro', chain: 'pecuaria' } },
      { label: 'Hortifrúti', hint: 'Estufas, mudas e venda direta', icon: 'leaf-outline', go: { tab: 'agro', chain: 'horti' } },
      { label: 'Leite', hint: 'Ordenha, resfriador e coleta', icon: 'water-outline', go: { tab: 'agro', chain: 'leite' } },
      { label: 'Sementes e insumos', hint: 'Sementes, mudas e adubo', icon: 'flower-outline', go: { tab: 'agro', seg: 'insumos' } },
      { label: 'Máquinas', hint: 'Venda e aluguel de tratores', icon: 'construct-outline', go: { tab: 'agro', seg: 'maquinas' } },
      { label: 'Agrônomos', hint: 'Visita técnica perto de você', icon: 'person-outline', go: { tab: 'servicos', service: 'agronomo' } },
      { label: 'Veterinário rural', hint: 'Visita na fazenda', icon: 'medkit-outline', go: { tab: 'servicos', service: 'veterinario' } },
      { label: 'Drone agrícola', hint: 'Pulverização por hectare', icon: 'airplane-outline', go: { tab: 'servicos', service: 'droneagro' } },
      { label: 'Direto do produtor', hint: 'Café, hortifrúti e laticínios', icon: 'basket-outline', go: { tab: 'agro', seg: 'producao' } },
      { label: 'Agro é tech', hint: 'Drones, sensores e IA', icon: 'hardware-chip-outline', go: { tab: 'agro', seg: 'agrotech' } },
    ],
  },
  // Setores do Shop com subgrupos, como o Agro.
  ...SHOP_SECTOR_KEYS.map(sectorClass),
  {
    key: 'socorro',
    title: 'Socorro e saúde',
    hint: 'SOS, hospitais, médicos e ambulâncias',
    icon: 'medkit-outline',
    subs: [
      { label: 'Emergência SOS', hint: 'SAMU 192, Bombeiros 193, Polícia 190', icon: 'alert-circle-outline', go: { tab: 'socorro', seg: 'emergencia' } },
      { label: 'Hospitais próximos', hint: 'Pronto-socorro, UPA e clínicas', icon: 'business-outline', go: { tab: 'socorro', seg: 'hospitais' } },
      { label: 'Especialistas médicos', hint: 'Consulta e teleconsulta', icon: 'medkit-outline', go: { tab: 'socorro', seg: 'especialistas' } },
      { label: 'Ambulâncias e socorristas', hint: 'Particulares com GPS', icon: 'pulse-outline', go: { tab: 'socorro', seg: 'socorristas' } },
    ],
  },
  {
    key: 'transporte',
    title: 'Transporte público',
    hint: 'Ônibus e metrô com GPS, entre cidades e estados',
    icon: 'bus-outline',
    subs: [
      { label: 'Na cidade', hint: 'Ônibus e metrô municipais', icon: 'bus-outline', go: { tab: 'transporte', scope: 'municipal' } },
      { label: 'Entre cidades', hint: 'Linhas intermunicipais', icon: 'git-compare-outline', go: { tab: 'transporte', scope: 'intermunicipal' } },
      { label: 'Entre estados', hint: 'Viagens interestaduais', icon: 'map-outline', go: { tab: 'transporte', scope: 'interestadual' } },
    ],
  },
  {
    key: 'lojas',
    title: 'Lojas',
    hint: 'Físicas e com envio para todo o Brasil',
    icon: 'bag-handle-outline',
    subs: [
      { label: 'Mercado', hint: 'No Food: compras do dia', icon: 'cart-outline', go: { tab: 'food', cat: 'Mercado', q: '', seg: 'mercado' } },
      { label: 'Vestuário', hint: 'Roupas, calçados e acessórios', icon: 'shirt-outline', go: { tab: 'vestuario', group: 'todos' } },
      { label: 'Eletrônicos', hint: 'Celulares, TV, games e informática', icon: 'phone-portrait-outline', go: { tab: 'eletronicos', group: 'todos' } },
      { label: 'Utensílios domésticos', hint: 'Cozinha, cama e banho, limpeza', icon: 'home-outline', go: { tab: 'casa', group: 'todos' } },
      { label: 'Eletrodomésticos', hint: 'Geladeira, fogão, lavadora, ar', icon: 'snow-outline', go: { tab: 'eletrodomesticos', group: 'todos' } },
      { label: 'Móveis e decoração', hint: 'Sala, quarto, escritório, decoração', icon: 'bed-outline', go: { tab: 'moveis', group: 'todos' } },
      { label: 'Vários', hint: 'Presentes, pet, papelaria, brinquedos…', icon: 'apps-outline', go: { tab: 'varios', group: 'todos' } },
      { label: 'Promoções', hint: 'Ofertas relâmpago, cupons e combos', icon: 'pricetags-outline', go: { tab: 'home', seg: 'promo' } },
      { label: 'Ver todas', hint: 'Todas as lojas', icon: 'storefront-outline', go: { tab: 'loja', cat: 'Todos', q: '' } },
    ],
  },
  {
    key: 'imoveis',
    title: 'Imóveis',
    hint: 'Venda e locação',
    icon: 'business-outline',
    subs: [
      { label: 'Comprar', hint: 'Imóveis à venda', icon: 'home-outline', go: { tab: 'home', top: 'anuncios', kind: 'imovel-venda' } },
      { label: 'Alugar', hint: 'Imóveis para locação', icon: 'key-outline', go: { tab: 'home', top: 'anuncios', kind: 'imovel-aluguel' } },
    ],
  },
  {
    key: 'locacao',
    title: 'Aluguel de veículos e máquinas',
    hint: 'Carros, vans, máquinas e equipamentos',
    icon: 'car-sport-outline',
    subs: [
      { label: 'Carros e vans', hint: 'Por dia ou por semana', icon: 'car-sport-outline', go: { tab: 'home', top: 'anuncios', kind: 'carro-aluguel' } },
      { label: 'Máquinas e equipamentos', hint: 'Obra, terraplanagem, andaimes', icon: 'construct-outline', go: { tab: 'home', top: 'anuncios', kind: 'maquina-aluguel' } },
    ],
  },
  {
    key: 'eventos',
    title: 'Festas, eventos e noite',
    hint: 'Casas noturnas, shows, salões e serviços',
    icon: 'musical-notes-outline',
    subs: [
      { label: 'Festas promocionais', hint: 'Descontos, listas VIP e 2 por 1', icon: 'flame-outline', go: { tab: 'home', top: 'eventos', group: 'festa-promo' } },
      { label: 'Promoções da noite', hint: 'Happy hour, rodízios e combos', icon: 'megaphone-outline', go: { tab: 'home', top: 'eventos', group: 'promo-anuncio' } },
      { label: 'Casas noturnas e shows', hint: 'Ingressos', icon: 'sparkles-outline', go: { tab: 'home', top: 'eventos', group: 'shows' } },
      { label: 'Salões e espaços', hint: 'Reserve a data', icon: 'home-outline', go: { tab: 'home', top: 'eventos', group: 'espacos' } },
      { label: 'DJ e som', hint: 'Para a sua festa', icon: 'musical-notes-outline', go: { tab: 'servicos', service: 'dj' } },
      { label: 'Fotógrafo', hint: 'Fotos e filmagem', icon: 'camera-outline', go: { tab: 'servicos', service: 'fotografo' } },
      { label: 'Buffet e garçom', hint: 'Comida e bebida', icon: 'wine-outline', go: { tab: 'servicos', service: 'buffet' } },
      { label: 'Decoração', hint: 'Balões e mesa temática', icon: 'balloon-outline', go: { tab: 'servicos', service: 'decoracao' } },
      { label: 'Lives da noite', hint: 'Ao vivo das casas', icon: 'radio-outline', go: { tab: 'home', top: 'lives', live: 'noite' } },
    ],
  },
  {
    key: 'artistas',
    title: 'Artistas',
    hint: 'Músicas em MP3, vídeos e obras',
    icon: 'musical-notes-outline',
    subs: [
      { label: 'Músicas', hint: 'Ouça e baixe em MP3', icon: 'musical-note-outline', go: { tab: 'artistas', art: 'musica' } },
      { label: 'Vídeos', hint: 'Clipes e apresentações', icon: 'videocam-outline', go: { tab: 'artistas', art: 'video' } },
      { label: 'Obras e exposições', hint: 'Pinturas e artes à venda', icon: 'color-palette-outline', go: { tab: 'artistas', art: 'obra' } },
      { label: 'Todos os artistas', hint: 'Páginas dos artistas', icon: 'people-outline', go: { tab: 'artistas', art: 'todos' } },
      { label: 'Publicar meu trabalho', hint: 'Área empresarial › Página', icon: 'cloud-upload-outline', go: { tab: 'pagina' } },
    ],
  },
  {
    key: 'aulas',
    title: 'Aulas e cursos',
    hint: 'Professores, cursos e faculdades online',
    icon: 'school-outline',
    subs: [
      { label: 'Professor particular', hint: 'Online ou presencial', icon: 'school-outline', go: { tab: 'servicos', service: 'professor' } },
      { label: 'Personal trainer', hint: 'Treino em casa ou no parque', icon: 'barbell-outline', go: { tab: 'servicos', service: 'personal' } },
      { label: 'Cursos online', hint: 'Com certificado', icon: 'laptop-outline', go: { tab: 'home', top: 'anuncios', kind: 'curso' } },
      { label: 'Faculdades online', hint: 'Graduação e pós EAD', icon: 'library-outline', go: { tab: 'home', top: 'anuncios', kind: 'curso' } },
      { label: 'Aulas ao vivo', hint: 'Nas lives', icon: 'radio-outline', go: { tab: 'home', top: 'lives', live: 'aulas' } },
    ],
  },
  {
    key: 'empregos',
    title: 'Empregos e vagas',
    hint: 'Vagas de empresas verificadas perto de você',
    icon: 'briefcase-outline',
    subs: [
      { label: 'Vagas perto de mim', hint: 'Todas as áreas', icon: 'location-outline', go: { tab: 'vagas', area: 'todas', seg: 'vagas' } },
      { label: 'Comércio', hint: 'Lojas e mercados', icon: 'storefront-outline', go: { tab: 'vagas', area: 'Comércio', seg: 'vagas' } },
      { label: 'Alimentação', hint: 'Restaurantes e lanchonetes', icon: 'restaurant-outline', go: { tab: 'vagas', area: 'Alimentação', seg: 'vagas' } },
      { label: 'Serviços e logística', hint: 'Entregas, motoristas e mais', icon: 'cube-outline', go: { tab: 'vagas', area: 'Logística', seg: 'vagas' } },
      { label: 'Minhas candidaturas', hint: 'Acompanhe as vagas que você se candidatou', icon: 'document-text-outline', go: { tab: 'vagas', seg: 'minhas' } },
      { label: 'Anunciar vaga (RH)', hint: 'Área empresarial › RH', icon: 'megaphone-outline', go: { tab: 'rh' } },
    ],
  },
  {
    key: 'desapego',
    title: 'Desapego',
    hint: 'Usados entre pessoas verificadas, com a Garantia Re@lys',
    icon: 'pricetags-outline',
    subs: [
      { label: 'Ver desapegos', hint: 'Perto de você', icon: 'search-outline', go: { tab: 'desapego' } },
      { label: 'Anunciar um desapego', hint: 'Venda o que você não usa mais', icon: 'pricetag-outline', go: { tab: 'desapego' } },
    ],
  },
  {
    key: 'social',
    title: 'Comunidade e lives',
    hint: 'Posts, mensagens, vídeo e lives',
    icon: 'people-outline',
    subs: [
      { label: 'Community', hint: 'Posts de pessoas reais', icon: 'chatbox-ellipses-outline', go: { tab: 'stories', seg: 'posts' } },
      { label: 'Páginas', hint: 'Páginas de usuários, assinadas ou anônimas', icon: 'albums-outline', go: { tab: 'paginas' } },
      { label: 'Minhas páginas', hint: 'Crie e publique na sua página', icon: 'add-circle-outline', go: { tab: 'paginas', seg: 'minhas' } },
      { label: 'Mensagens', hint: 'Conversas e chamadas de vídeo', icon: 'mail-outline', go: { tab: 'stories', seg: 'msgs' } },
      { label: 'Contatos', hint: 'Sua lista de contatos', icon: 'person-add-outline', go: { tab: 'stories', seg: 'contatos' } },
      { label: 'Lives', hint: 'Assista ou abra a sua', icon: 'radio-outline', go: { tab: 'home', top: 'lives' } },
      { label: 'Stories', hint: 'Stories e a comunidade de quem está no Re@lys', icon: 'people-circle-outline', go: { tab: 'stories' } },
      { label: 'Date', hint: 'Relacionamentos com quem passa perto', icon: 'heart-outline', go: { tab: 'encontros' } },
    ],
  },
  {
    key: 'empresa',
    title: 'Área empresarial',
    hint: 'Para CNPJ: estoque, caixa e negócios',
    icon: 'stats-chart-outline',
    subs: [
      { label: 'Painel', hint: 'Vendas e alertas', icon: 'speedometer-outline', go: { tab: 'painel' } },
      { label: 'Estoque', hint: 'Produtos e entradas', icon: 'file-tray-stacked-outline', go: { tab: 'estoque' } },
      { label: 'Fluxo de caixa', hint: 'Entradas e saídas', icon: 'wallet-outline', go: { tab: 'caixa' } },
      { label: 'Negociações', hint: 'Descontos entre empresas', icon: 'swap-horizontal-outline', go: { tab: 'negocios' } },
      { label: 'RH e vagas', hint: 'Anunciar vagas e ver candidatos', icon: 'people-outline', go: { tab: 'rh' } },
      { label: 'Página da empresa', hint: 'Perfil público, músicas e vídeos', icon: 'albums-outline', go: { tab: 'pagina' } },
    ],
  },
];

const ROLE_ICON = { cliente: 'person-outline', empresa: 'storefront-outline', prestador: 'construct-outline', fornecedor: 'cube-outline', admin: 'shield-checkmark-outline' };

// Cor de cada classe no menu (o ícone ganha um fundo da mesma cor, bem clarinho).
const TINT = {
  servicos: '#A8790A',
  restaurantes: '#E4572E',
  lojas: '#6C5CE7',
  transporte: '#2F74D0',
  socorro: '#D9534F',
  tecnologia: '#0E8BC9',
  agro: '#1E9E63',
  empresa: '#1F2A44',
  empregos: '#7B6CF6',
  eventos: '#D9468F',
  social: '#2F74D0',
  artistas: '#C77D0A',
  aulas: '#0D9488',
  imoveis: '#7A5806',
  locacao: '#55607A',
};
const tintOf = (key) => TINT[key] || '#6C5CE7';

// Seções do menu: cada classe aparece uma vez. O que não estiver aqui cai em "Mais".
const SECTIONS = [
  { title: 'Dia a dia', keys: ['servicos', 'restaurantes', 'lojas', 'transporte', 'socorro'] },
  { title: 'Compras por setor', keys: SHOP_SECTOR_KEYS },
  { title: 'Trabalho e negócios', keys: ['empregos', 'tecnologia', 'agro', 'empresa'] },
  { title: 'Lazer e comunidade', keys: ['eventos', 'social', 'artistas', 'aulas'] },
  { title: 'Anúncios', keys: ['imoveis', 'locacao'] },
];
const sectionsWithRest = () => {
  const used = new Set(SECTIONS.flatMap((s) => s.keys));
  const rest = CATEGORIES.filter((c) => !used.has(c.key)).map((c) => c.key);
  return rest.length ? [...SECTIONS, { title: 'Mais', keys: rest }] : SECTIONS;
};

// Atalhos de um toque, no topo do menu.
const SHORTCUTS = [
  { label: 'Serviços', icon: 'construct', tint: TINT.servicos, go: { tab: 'servicos' } },
  { label: 'Food', icon: 'restaurant', tint: TINT.restaurantes, go: { tab: 'food', cat: 'Todos', q: '' } },
  { label: 'Shop', icon: 'bag-handle', tint: TINT.lojas, go: { tab: 'loja', cat: 'Todos', q: '' } },
  { label: 'Vagas', icon: 'briefcase', tint: TINT.empregos, go: { tab: 'vagas', area: 'todas', seg: 'vagas' } },
  { label: 'Ônibus', icon: 'bus', tint: TINT.transporte, go: { tab: 'transporte', scope: 'municipal' } },
  { label: 'SOS', icon: 'alert-circle', tint: TINT.socorro, go: { tab: 'socorro', seg: 'emergencia' } },
];

const norm = (t) =>
  String(t || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

export default function CategoryMenu({ visible, onClose, onPick, roles = [], activeRole, onRole }) {
  const insets = useSafeAreaInsets();
  const [cat, setCat] = useState(null);
  const [q, setQ] = useState('');
  useEffect(() => {
    if (!visible) {
      setCat(null);
      setQ('');
    }
  }, [visible]);

  const byKey = useMemo(() => Object.fromEntries(CATEGORIES.map((c) => [c.key, c])), []);
  const sections = useMemo(sectionsWithRest, []);
  // Busca dentro do menu: procura em todas as opções de todas as classes.
  const results = useMemo(() => {
    const t = norm(q.trim());
    if (!t) return [];
    const seen = new Set();
    const out = [];
    CATEGORIES.forEach((c) => {
      const catHit = norm(c.title).includes(t);
      c.subs.forEach((s) => {
        if (!(catHit || norm(s.label).includes(t) || norm(s.hint).includes(t))) return;
        const k = c.key + s.label;
        if (seen.has(k)) return;
        seen.add(k);
        out.push({ ...s, catTitle: c.title, catKey: c.key });
      });
    });
    return out.slice(0, 40);
  }, [q]);

  const back = () => (cat ? setCat(null) : onClose());

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={back} statusBarTranslucent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.backdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={[styles.sheet, { paddingBottom: 12 + insets.bottom }]}>
          <View style={styles.grip} />
          {!cat ? (
            <>
              <View style={styles.head}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>Explorar Re@lys</Text>
                  <Text style={styles.hint}>Tudo do app em um lugar</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.iconBtn} accessibilityLabel="Fechar">
                  <Ionicons name="close" size={20} color={colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.search}>
                <Ionicons name="search" size={18} color={colors.muted} />
                <TextInput
                  value={q}
                  onChangeText={setQ}
                  placeholder="Buscar: eletricista, pizza, hotel, vaga…"
                  placeholderTextColor={colors.muted}
                  style={styles.searchInput}
                  returnKeyType="search"
                />
                {q ? (
                  <TouchableOpacity onPress={() => setQ('')} accessibilityLabel="Limpar busca">
                    <Ionicons name="close-circle" size={18} color={colors.muted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                {q.trim() ? (
                  <>
                    <Text style={styles.kicker}>{results.length ? `${results.length} RESULTADO(S)` : 'NADA ENCONTRADO'}</Text>
                    {results.map((s) => {
                      const tint = tintOf(s.catKey);
                      return (
                        <TouchableOpacity key={s.catKey + s.label} style={styles.result} onPress={() => onPick(s.go)} activeOpacity={0.8}>
                          <View style={[styles.resIcon, { backgroundColor: tint + '1A' }]}>
                            <Ionicons name={s.icon} size={19} color={tint} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.resTitle}>{s.label}</Text>
                            <Text style={styles.resHint} numberOfLines={1}>
                              {s.catTitle} · {s.hint}
                            </Text>
                          </View>
                          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
                        </TouchableOpacity>
                      );
                    })}
                  </>
                ) : (
                  <>
                    {roles.length > 1 ? (
                      <>
                        <Text style={styles.kicker}>ACESSAR COMO</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                          {roles.map((r) => {
                            const on = r === activeRole;
                            return (
                              <TouchableOpacity key={r} onPress={() => onRole && onRole(r)} style={[styles.role, on && styles.roleOn]} accessibilityLabel={`Usar como ${ROLE_LABELS[r]}`}>
                                <Ionicons name={ROLE_ICON[r] || 'person-outline'} size={15} color={on ? colors.onPrimary : colors.primary} />
                                <Text style={[styles.roleTxt, on && { color: colors.onPrimary }]}>{ROLE_LABELS[r]}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </>
                    ) : null}

                    <Text style={styles.kicker}>ATALHOS</Text>
                    <View style={styles.shortcuts}>
                      {SHORTCUTS.map((s) => (
                        <TouchableOpacity key={s.label} style={styles.shortcut} onPress={() => onPick(s.go)} accessibilityLabel={`Abrir ${s.label}`}>
                          <View style={[styles.shortIcon, { backgroundColor: s.tint }]}>
                            <Ionicons name={s.icon} size={22} color="#FFFFFF" />
                          </View>
                          <Text style={styles.shortLabel} numberOfLines={1}>
                            {s.label}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    {sections.map((sec) => (
                      <View key={sec.title} style={{ marginBottom: 6 }}>
                        <Text style={styles.kicker}>{sec.title.toUpperCase()}</Text>
                        <View style={styles.grid3}>
                          {sec.keys
                            .map((k) => byKey[k])
                            .filter(Boolean)
                            .map((c) => {
                              const tint = tintOf(c.key);
                              return (
                                <TouchableOpacity key={c.key} style={styles.catTile} onPress={() => setCat(c)} activeOpacity={0.8} accessibilityLabel={c.title}>
                                  <View style={[styles.catIcon, { backgroundColor: tint + '1A' }]}>
                                    <Ionicons name={c.icon} size={22} color={tint} />
                                  </View>
                                  <Text style={styles.catTitle} numberOfLines={2}>
                                    {c.title}
                                  </Text>
                                  <Text style={styles.catCount}>{c.subs.length} opções</Text>
                                </TouchableOpacity>
                              );
                            })}
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </ScrollView>
            </>
          ) : (
            <>
              <View style={[styles.catHead, { backgroundColor: tintOf(cat.key) + '14', borderColor: tintOf(cat.key) + '40' }]}>
                <TouchableOpacity onPress={() => setCat(null)} style={styles.iconBtnLight} accessibilityLabel="Voltar">
                  <Ionicons name="arrow-back" size={18} color={colors.text} />
                </TouchableOpacity>
                <View style={[styles.catHeadIcon, { backgroundColor: tintOf(cat.key) }]}>
                  <Ionicons name={cat.icon} size={22} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.subTitle}>{cat.title}</Text>
                  <Text style={styles.hint} numberOfLines={1}>
                    {cat.hint}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.iconBtnLight} accessibilityLabel="Fechar">
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
              </View>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.grid2}>
                {cat.subs.map((s) => {
                  const tint = tintOf(cat.key);
                  return (
                    <TouchableOpacity key={s.label} style={styles.tile} onPress={() => onPick(s.go)} activeOpacity={0.8}>
                      <View style={[styles.tileIcon, { backgroundColor: tint + '1A' }]}>
                        <Ionicons name={s.icon} size={19} color={tint} />
                      </View>
                      <Text style={styles.tileTitle} numberOfLines={2}>
                        {s.label}
                      </Text>
                      <Text style={[styles.tileHint, s.soon && { color: colors.accent }]} numberOfLines={2}>
                        {s.hint}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(16,22,40,0.45)' },
  sheet: {
    height: '88%',
    backgroundColor: colors.bg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 16,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: 'rgba(226,182,73,0.45)',
  },
  grip: { alignSelf: 'center', width: 44, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  title: { color: colors.text, fontSize: 22, fontWeight: '800' },
  hint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  iconBtnLight: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 15, marginLeft: 8, paddingVertical: 0 },
  kicker: { color: colors.muted, fontSize: 11, fontWeight: '700', letterSpacing: 1.4, marginBottom: 8 },
  role: { flexDirection: 'row', alignItems: 'center', height: 34, paddingHorizontal: 12, borderRadius: 17, borderWidth: 1, borderColor: 'rgba(168,121,10,0.45)', backgroundColor: 'rgba(168,121,10,0.08)', marginRight: 6 },
  roleOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  roleTxt: { color: colors.primary, fontWeight: '700', fontSize: 12, marginLeft: 5 },
  shortcuts: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 18 },
  shortcut: { alignItems: 'center', width: '16%' },
  shortIcon: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  shortLabel: { color: colors.text, fontSize: 11, fontWeight: '700', marginTop: 5 },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4, marginBottom: 8 },
  catTile: {
    width: '31.3%',
    marginHorizontal: '1%',
    minHeight: 112,
    padding: 10,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginBottom: 8,
    ...soft,
  },
  catIcon: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  catTitle: { color: colors.text, fontWeight: '700', fontSize: 12.5, marginTop: 8, lineHeight: 16 },
  catCount: { color: colors.muted, fontSize: 10.5, marginTop: 2 },
  result: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 16, backgroundColor: '#FFFFFF', marginBottom: 8, ...soft },
  resIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  resTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  resHint: { color: colors.muted, fontSize: 12, marginTop: 2 },
  catHead: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: 20, borderWidth: 1, marginBottom: 12 },
  catHeadIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  subTitle: { color: colors.text, fontWeight: '800', fontSize: 17 },
  grid2: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingBottom: 12 },
  tile: {
    width: '48.5%',
    minHeight: 108,
    padding: 12,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    marginBottom: 10,
    ...soft,
  },
  tileIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { color: colors.text, fontWeight: '700', fontSize: 13.5, marginTop: 8 },
  tileHint: { color: colors.muted, fontSize: 11, marginTop: 2, lineHeight: 15 },
});
