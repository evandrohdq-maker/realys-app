// Dados de demonstração: transporte público, socorro e saúde, artistas e páginas das empresas.
// Tudo fictício, exceto os números oficiais de emergência do Brasil.
const photo = (seed, w = 600, h = 400) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

// ───────────────────────── Transporte público ─────────────────────────
// Onde o GPS do celular coloca o cliente na demonstração.
export const MY_SPOT = 'Av. Paulista, 1500 · Bela Vista, São Paulo - SP';

export const TRANSIT_SCOPES = [
  { key: 'municipal', label: 'Na cidade', icon: 'bus-outline', hint: 'Ônibus e metrô municipais' },
  { key: 'intermunicipal', label: 'Entre cidades', icon: 'git-compare-outline', hint: 'Linhas intermunicipais' },
  { key: 'interestadual', label: 'Entre estados', icon: 'map-outline', hint: 'Viagens interestaduais' },
];

// Empresas de transporte cadastradas no Realys (com CNPJ e frota com GPS).
export const transitCompanies = [
  { id: 't1', name: 'SPTrans Urbano (demo)', scope: 'municipal', logo: '🚌', rating: 4.3 },
  { id: 't2', name: 'Metrô Linha Verde (demo)', scope: 'municipal', logo: '🚇', rating: 4.6 },
  { id: 't3', name: 'Viação Estrela do Vale', scope: 'intermunicipal', logo: '🚍', rating: 4.5 },
  { id: 't4', name: 'Expresso Real Brasil', scope: 'interestadual', logo: '🚌', rating: 4.7 },
  { id: 't5', name: 'Rota Sul Turismo', scope: 'interestadual', logo: '🚍', rating: 4.4 },
];

// Pontos perto do cliente, com os ônibus que estão chegando (posição vinda do GPS de cada ônibus).
export const busStops = [
  {
    id: 'bs1',
    name: 'Ponto Paulista / Consolação',
    distanceM: 120,
    arrivals: [
      { lineId: 'L875', min: 3, bus: '8000-10', crowd: 'Pouco cheio' },
      { lineId: 'L702', min: 7, bus: '7012-44', crowd: 'Cheio' },
      { lineId: 'L875', min: 18, bus: '8000-22', crowd: 'Vazio' },
    ],
  },
  {
    id: 'bs2',
    name: 'Ponto Paulista / Brigadeiro',
    distanceM: 380,
    arrivals: [
      { lineId: 'L669', min: 5, bus: '6690-03', crowd: 'Pouco cheio' },
      { lineId: 'L702', min: 12, bus: '7012-51', crowd: 'Vazio' },
    ],
  },
  {
    id: 'bs3',
    name: 'Estação Consolação (metrô)',
    distanceM: 450,
    arrivals: [{ lineId: 'M2', min: 2, bus: 'Trem 14', crowd: 'Cheio' }],
  },
];

export const transitLines = [
  { id: 'L875', code: '875A-10', name: 'Perdizes ⇄ Aeroporto', companyId: 't1', fare: 5.0, stops: ['Perdizes', 'Paulista', 'Ibirapuera', 'Moema', 'Aeroporto'], accessible: true, ac: true },
  { id: 'L702', code: '702U-10', name: 'Butantã ⇄ Belém', companyId: 't1', fare: 5.0, stops: ['Butantã', 'Pinheiros', 'Paulista', 'Sé', 'Belém'], accessible: true, ac: false },
  { id: 'L669', code: '669A-10', name: 'Terminal Princesa Isabel ⇄ Santo Amaro', companyId: 't1', fare: 5.0, stops: ['Princesa Isabel', 'Paulista', 'Vila Mariana', 'Santo Amaro'], accessible: false, ac: true },
  { id: 'M2', code: 'Linha 2', name: 'Vila Madalena ⇄ Vila Prudente', companyId: 't2', fare: 5.2, stops: ['Vila Madalena', 'Consolação', 'Paraíso', 'Ana Rosa', 'Vila Prudente'], accessible: true, ac: true },
];

// Viagens entre cidades e entre estados.
export const trips = [
  { id: 'tr1', scope: 'intermunicipal', companyId: 't3', from: 'São Paulo - SP', to: 'Campinas - SP', depart: '07:30', arrive: '09:00', price: 42.9, seatsLeft: 18, kind: 'Executivo' },
  { id: 'tr2', scope: 'intermunicipal', companyId: 't3', from: 'São Paulo - SP', to: 'Santos - SP', depart: '08:15', arrive: '09:45', price: 38.5, seatsLeft: 9, kind: 'Convencional' },
  { id: 'tr3', scope: 'intermunicipal', companyId: 't3', from: 'São Paulo - SP', to: 'Sorocaba - SP', depart: '10:00', arrive: '11:40', price: 36.0, seatsLeft: 22, kind: 'Convencional' },
  { id: 'tr4', scope: 'interestadual', companyId: 't4', from: 'São Paulo - SP', to: 'Rio de Janeiro - RJ', depart: '22:00', arrive: '05:30', price: 149.9, seatsLeft: 6, kind: 'Leito' },
  { id: 'tr5', scope: 'interestadual', companyId: 't4', from: 'São Paulo - SP', to: 'Belo Horizonte - MG', depart: '21:30', arrive: '06:00', price: 169.0, seatsLeft: 12, kind: 'Semileito' },
  { id: 'tr6', scope: 'interestadual', companyId: 't5', from: 'São Paulo - SP', to: 'Curitiba - PR', depart: '23:00', arrive: '05:40', price: 129.9, seatsLeft: 15, kind: 'Executivo' },
  { id: 'tr7', scope: 'interestadual', companyId: 't5', from: 'São Paulo - SP', to: 'Florianópolis - SC', depart: '20:00', arrive: '07:30', price: 219.0, seatsLeft: 4, kind: 'Leito' },
];

// ───────────────────────── Socorro e saúde ─────────────────────────
// Números oficiais de emergência no Brasil (ligação gratuita).
export const emergencyNumbers = [
  { key: 'samu', label: 'SAMU', number: '192', hint: 'Emergência médica e ambulância', icon: 'medkit', color: '#D9534F', words: ['samu', 'ambulancia', 'infarto', 'desmaio', 'emergencia medica'] },
  { key: 'bombeiros', label: 'Bombeiros', number: '193', hint: 'Incêndio, resgate e acidentes', icon: 'flame', color: '#E8711C', words: ['bombeiro', 'bombeiros', 'incendio', 'fogo', 'resgate'] },
  { key: 'policia', label: 'Polícia Militar', number: '190', hint: 'Crime, violência e perigo', icon: 'shield', color: '#2F74D0', words: ['policia', 'assalto', 'roubo'] },
  { key: 'prf', label: 'Polícia Rodoviária', number: '191', hint: 'Acidentes em rodovias federais', icon: 'car', color: '#1F2A44', words: ['rodovia', 'estrada', 'prf'] },
  { key: 'defesa', label: 'Defesa Civil', number: '199', hint: 'Enchente, deslizamento, desastres', icon: 'warning', color: '#C77D12', words: ['defesa civil', 'enchente', 'alagamento', 'deslizamento'] },
  { key: 'mulher', label: 'Central da Mulher', number: '180', hint: 'Atendimento à mulher', icon: 'female', color: '#7B6CF6', words: ['violencia contra mulher'] },
  { key: 'cvv', label: 'CVV', number: '188', hint: 'Apoio emocional, 24 horas', icon: 'heart', color: '#1E9E63', words: ['cvv', 'apoio emocional'] },
];

export const SOS_SEGMENTS = [
  { key: 'emergencia', label: 'Emergência', icon: 'alert-circle-outline' },
  { key: 'hospitais', label: 'Hospitais', icon: 'business-outline' },
  { key: 'especialistas', label: 'Especialistas', icon: 'medkit-outline' },
  { key: 'socorristas', label: 'Ambulâncias', icon: 'pulse-outline' },
];

export const hospitals = [
  { id: 'h1', name: 'Hospital Santa Luz (demo)', type: 'Pronto-socorro 24h', network: 'Particular e convênios', distanceKm: 0.9, waitMin: 25, phone: '(11) 0000-0001', open24: true, photo: photo('realys-hosp1') },
  { id: 'h2', name: 'UPA Bela Vista (demo)', type: 'UPA 24h', network: 'SUS', distanceKm: 1.6, waitMin: 50, phone: '(11) 0000-0002', open24: true, photo: photo('realys-upa') },
  { id: 'h3', name: 'Hospital Municipal Central (demo)', type: 'Hospital geral', network: 'SUS', distanceKm: 3.2, waitMin: 70, phone: '(11) 0000-0003', open24: true, photo: photo('realys-hosp2') },
  { id: 'h4', name: 'Hospital Infantil Sorriso (demo)', type: 'Pronto-socorro infantil', network: 'Particular e convênios', distanceKm: 4.1, waitMin: 30, phone: '(11) 0000-0004', open24: true, photo: photo('realys-hosp3') },
  { id: 'h5', name: 'Clínica Vida Mais (demo)', type: 'Clínica e exames', network: 'Particular', distanceKm: 2.4, waitMin: null, phone: '(11) 0000-0005', open24: false, photo: photo('realys-clinica') },
];

export const SPECIALTIES = ['Clínico geral', 'Pediatra', 'Cardiologista', 'Ortopedista', 'Ginecologista', 'Dermatologista', 'Neurologista', 'Psicólogo', 'Psiquiatra', 'Dentista'];

export const specialists = [
  { id: 'd1', name: 'Dra. Camila Reis', specialty: 'Clínico geral', reg: 'CRM-SP 000001', rating: 4.9, distanceKm: 1.1, price: 180, tele: true, home: true, next: 'hoje 15h', photo: photo('realys-dra1', 200, 200) },
  { id: 'd2', name: 'Dr. André Moura', specialty: 'Cardiologista', reg: 'CRM-SP 000002', rating: 4.8, distanceKm: 2.3, price: 320, tele: true, home: false, next: 'amanhã 9h', photo: photo('realys-dr2', 200, 200) },
  { id: 'd3', name: 'Dra. Beatriz Lopes', specialty: 'Pediatra', reg: 'CRM-SP 000003', rating: 5.0, distanceKm: 1.8, price: 250, tele: true, home: true, next: 'hoje 17h30', photo: photo('realys-dra3', 200, 200) },
  { id: 'd4', name: 'Dr. Felipe Santana', specialty: 'Ortopedista', reg: 'CRM-SP 000004', rating: 4.7, distanceKm: 3.5, price: 280, tele: false, home: false, next: 'quinta 10h', photo: photo('realys-dr4', 200, 200) },
  { id: 'd5', name: 'Dra. Luíza Prado', specialty: 'Ginecologista', reg: 'CRM-SP 000005', rating: 4.9, distanceKm: 2.0, price: 300, tele: true, home: false, next: 'amanhã 14h', photo: photo('realys-dra5', 200, 200) },
  { id: 'd6', name: 'Dr. Renato Vieira', specialty: 'Dermatologista', reg: 'CRM-SP 000006', rating: 4.6, distanceKm: 4.4, price: 260, tele: true, home: false, next: 'sexta 11h', photo: photo('realys-dr6', 200, 200) },
  { id: 'd7', name: 'Dr. Hugo Martins', specialty: 'Neurologista', reg: 'CRM-SP 000007', rating: 4.8, distanceKm: 5.1, price: 350, tele: true, home: false, next: 'segunda 8h', photo: photo('realys-dr7', 200, 200) },
  { id: 'd8', name: 'Marina Costa', specialty: 'Psicólogo', reg: 'CRP 06/000008', rating: 5.0, distanceKm: 1.4, price: 150, tele: true, home: false, next: 'hoje 19h', photo: photo('realys-psi8', 200, 200) },
  { id: 'd9', name: 'Dr. Otávio Lima', specialty: 'Psiquiatra', reg: 'CRM-SP 000009', rating: 4.7, distanceKm: 3.0, price: 380, tele: true, home: false, next: 'quarta 16h', photo: photo('realys-dr9', 200, 200) },
  { id: 'd10', name: 'Dra. Sofia Almeida', specialty: 'Dentista', reg: 'CRO-SP 000010', rating: 4.9, distanceKm: 0.7, price: 150, tele: false, home: false, next: 'hoje 16h · urgência', photo: photo('realys-den10', 200, 200) },
];

// Prestadores de emergência particulares, com GPS ligado.
export const responders = [
  { id: 'r1', name: 'Vida Rápida Ambulâncias (demo)', kind: 'Ambulância UTI móvel', distanceKm: 2.2, etaMin: 9, price: 'a partir de R$ 450', phone: '(11) 0000-0101', rating: 4.8, icon: 'pulse' },
  { id: 'r2', name: 'Remoções Bem-Estar (demo)', kind: 'Remoção simples (não urgente)', distanceKm: 3.6, etaMin: 15, price: 'a partir de R$ 220', phone: '(11) 0000-0102', rating: 4.6, icon: 'medical' },
  { id: 'r3', name: 'Enfermagem em Casa (demo)', kind: 'Enfermeiro e cuidador em domicílio', distanceKm: 1.5, etaMin: 25, price: 'R$ 90/hora', phone: '(11) 0000-0103', rating: 4.9, icon: 'person' },
  { id: 'r4', name: 'Socorro 24h Auto (demo)', kind: 'Guincho e socorro veicular', distanceKm: 4.8, etaMin: 20, price: 'a partir de R$ 180', phone: '(11) 0000-0104', rating: 4.6, icon: 'car' },
];

// ───────────────────────── Artistas ─────────────────────────
export const ART_KINDS = [
  { key: 'todos', label: 'Todos', icon: 'apps-outline' },
  { key: 'musica', label: 'Música', icon: 'musical-notes-outline' },
  { key: 'video', label: 'Vídeos', icon: 'videocam-outline' },
  { key: 'obra', label: 'Obras e exposições', icon: 'color-palette-outline' },
];

// Cada artista tem uma página própria (como as empresas).
export const artists = [
  { id: 'a1', name: 'Banda Louvor Vivo', genre: 'Gospel', city: 'São Paulo - SP', rating: 4.9, followers: 18400, verified: true, logo: '🎤', cover: photo('realys-art-louvor', 900, 400), bio: 'Louvor e adoração ao vivo. Agenda aberta para igrejas e eventos.' },
  { id: 'a2', name: 'Duda Viola', genre: 'Sertanejo', city: 'Goiânia - GO', rating: 4.8, followers: 9200, verified: true, logo: '🎸', cover: photo('realys-art-viola', 900, 400), bio: 'Voz e viola. Shows em bares, casamentos e rodeios.' },
  { id: 'a3', name: 'DJ Nexo', genre: 'Eletrônica', city: 'Curitiba - PR', rating: 4.7, followers: 6100, verified: false, logo: '🎧', cover: photo('realys-art-dj', 900, 400), bio: 'Sets autorais e remixes. Faixas novas toda sexta.' },
  { id: 'a4', name: 'Ateliê Clara Luz', genre: 'Artes plásticas', city: 'Ouro Preto - MG', rating: 5.0, followers: 3400, verified: true, logo: '🖼️', cover: photo('realys-art-atelie', 900, 400), bio: 'Pinturas a óleo e aquarelas. Obras à venda e exposição online.' },
];

// Faixas, vídeos e obras. Os arquivos ficam no servidor pago pelo artista.
export const artMedia = [
  { id: 'am1', ownerId: 'a1', kind: 'musica', title: 'Grande é o Senhor (ao vivo)', length: '4:32', plays: 52100, price: 0, cover: photo('realys-faixa1', 300, 300) },
  { id: 'am2', ownerId: 'a1', kind: 'musica', title: 'Luz do Amanhecer', length: '3:58', plays: 31800, price: 2.9, cover: photo('realys-faixa2', 300, 300) },
  { id: 'am3', ownerId: 'a1', kind: 'video', title: 'Clipe oficial · Luz do Amanhecer', length: '5:10', plays: 88000, price: 0, cover: photo('realys-clipe1', 600, 340) },
  { id: 'am4', ownerId: 'a2', kind: 'musica', title: 'Saudade de Goiás', length: '3:21', plays: 20400, price: 1.9, cover: photo('realys-faixa3', 300, 300) },
  { id: 'am5', ownerId: 'a2', kind: 'video', title: 'Ao vivo no Rodeio', length: '12:44', plays: 14300, price: 0, cover: photo('realys-clipe2', 600, 340) },
  { id: 'am6', ownerId: 'a3', kind: 'musica', title: 'Nexo Sunset Mix', length: '6:05', plays: 11900, price: 0, cover: photo('realys-faixa4', 300, 300) },
  { id: 'am7', ownerId: 'a3', kind: 'musica', title: 'Pulse (remix)', length: '4:11', plays: 8700, price: 2.5, cover: photo('realys-faixa5', 300, 300) },
  { id: 'am8', ownerId: 'a4', kind: 'obra', title: 'Igreja de São Francisco · óleo sobre tela', length: '80 × 60 cm', plays: 2400, price: 1800, cover: photo('realys-obra1', 500, 500) },
  { id: 'am9', ownerId: 'a4', kind: 'obra', title: 'Serra ao entardecer · aquarela', length: '40 × 30 cm', plays: 1900, price: 650, cover: photo('realys-obra2', 500, 500) },
  { id: 'am10', ownerId: 'a4', kind: 'video', title: 'Pintando ao vivo no ateliê', length: '18:20', plays: 5600, price: 0, cover: photo('realys-clipe3', 600, 340) },
];

// Quanto custa guardar o arquivo no servidor do Realys (o artista ou a empresa paga).
export const UPLOAD_PLANS = {
  musica: { label: 'Faixa MP3', fee: 2.9, limit: 'até 20 MB por faixa', icon: 'musical-note-outline', ext: '.mp3', sizeMb: [4, 12] },
  video: { label: 'Vídeo', fee: 9.9, limit: 'até 1 GB por vídeo', icon: 'videocam-outline', ext: '.mp4', sizeMb: [80, 600] },
  obra: { label: 'Foto de obra', fee: 0.9, limit: 'até 15 MB por imagem', icon: 'image-outline', ext: '.jpg', sizeMb: [2, 9] },
};
export const STORAGE_PLAN = { label: 'Plano Artista Pro', price: 39.9, detail: 'mensal · 50 GB e envios ilimitados' };

// Página pública das empresas: apresentação que todos os clientes veem.
export const companyPages = {
  e1: { bio: 'Mercado de bairro com preço justo e entrega rápida. Desde 2009 servindo a Vila Mariana.', hours: 'Seg a sáb, 7h às 21h', followers: 1240 },
  e2: { bio: 'Pizza em forno a lenha, massa de fermentação natural. Delivery em até 40 min.', hours: 'Todos os dias, 18h às 23h30', followers: 5320 },
  e3: { bio: 'Moda brasileira com tecido de qualidade. Enviamos para todo o Brasil.', hours: 'Loja online 24h', followers: 8710 },
  e4: { bio: 'Eletrônicos com nota fiscal e garantia. Assistência técnica própria.', hours: 'Seg a sex, 9h às 19h', followers: 3980 },
  e5: { bio: 'Hambúrguer artesanal, pão de fermentação natural e batata rústica.', hours: 'Ter a dom, 18h às 0h', followers: 2150 },
};
