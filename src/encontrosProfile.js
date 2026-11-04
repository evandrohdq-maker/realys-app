// Encontros: perfil de namoro detalhado e opcional, e o medidor de perfil completo.
// Quem preenche mais aparece primeiro no radar dos outros e recebe mais curtidas.

// Perfil de namoro detalhado (opcional). Cada campo é uma escolha única.
export const PROFILE_FIELDS = [
  { key: 'altura', label: 'Altura', icon: 'resize-outline', options: ['Até 1,60 m', '1,61 a 1,70 m', '1,71 a 1,80 m', '1,81 a 1,90 m', 'Acima de 1,90 m'] },
  { key: 'religiao', label: 'Religião', icon: 'book-outline', options: ['Evangélica', 'Católica', 'Espírita', 'Outra', 'Sem religião', 'Prefiro não dizer'] },
  { key: 'filhos', label: 'Filhos', icon: 'happy-outline', options: ['Tenho filhos', 'Não tenho', 'Quero ter', 'Não quero ter', 'Ainda não sei'] },
  { key: 'estudo', label: 'Escolaridade', icon: 'school-outline', options: ['Ensino médio', 'Técnico', 'Superior', 'Pós-graduação', 'Estudando'] },
  { key: 'bebida', label: 'Bebida', icon: 'wine-outline', options: ['Não bebo', 'Socialmente', 'Frequentemente'] },
  { key: 'cigarro', label: 'Cigarro', icon: 'flame-outline', options: ['Não fumo', 'Às vezes', 'Fumo'] },
  { key: 'exercicio', label: 'Atividade física', icon: 'barbell-outline', options: ['Todo dia', 'Algumas vezes por semana', 'De vez em quando', 'Nunca'] },
  { key: 'pets', label: 'Pets', icon: 'paw-outline', options: ['Tenho cachorro', 'Tenho gato', 'Tenho outros', 'Não tenho, mas gosto', 'Não curto pets'] },
  { key: 'signo', label: 'Signo', icon: 'moon-outline', options: ['Áries', 'Touro', 'Gêmeos', 'Câncer', 'Leão', 'Virgem', 'Libra', 'Escorpião', 'Sagitário', 'Capricórnio', 'Aquário', 'Peixes'] },
  { key: 'encontro', label: 'Primeiro encontro ideal', icon: 'cafe-outline', options: ['Café ou sorvete', 'Jantar', 'Parque ou trilha', 'Cinema ou show', 'Culto ou missa', 'Videochamada antes'] },
];

// Gostos: o cliente escolhe vários.
export const INTEREST_GROUPS = [
  { title: 'Música', items: ['🎶 Gospel', '🎸 Rock', '🤠 Sertanejo', '🥁 Samba e pagode', '🎧 Eletrônica', '🎤 MPB', '🎹 Pop'] },
  { title: 'Lazer', items: ['🎬 Cinema', '📺 Séries', '📚 Leitura', '🎮 Games', '✈️ Viagem', '🏖️ Praia', '⛰️ Trilha', '💃 Dança'] },
  { title: 'Comida', items: ['🍕 Pizza', '🍣 Japonesa', '🍖 Churrasco', '🥗 Saudável', '🍝 Cozinhar', '☕ Café', '🍰 Doces'] },
  { title: 'Estilo de vida', items: ['🙏 Fé', '🏋️ Academia', '🏃 Corrida', '🚲 Bike', '⚽ Futebol', '🐶 Pets', '💼 Empreender', '🎨 Arte'] },
];

// Quanto do perfil de namoro está preenchido (0 a 100).
export function profileScore(p) {
  if (!p) return 0;
  const parts = [
    !!(p.bio && p.bio.length >= 20),
    !!p.job,
    (p.interests || p.tags || []).length >= 3,
    ...PROFILE_FIELDS.map((f) => !!(p.details && p.details[f.key])),
  ];
  return Math.round((parts.filter(Boolean).length / parts.length) * 100);
}
