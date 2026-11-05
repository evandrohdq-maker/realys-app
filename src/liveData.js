// Lives do Realys por assunto e por quem transmite.
// Qualquer perfil abre live: usuário, empresa, artista, prestador de serviço e fornecedor.
// A live aparece na aba Lives (no assunto certo) e no perfil de quem está transmitindo,
// e tocar em quem transmite abre o perfil dele.

export const LIVE_CATS = [
  { key: 'gamers', label: 'Gamers', icon: 'game-controller-outline', title: 'Gamers ao vivo', hint: 'Partidas, campeonatos e gameplay' },
  { key: 'artistas', label: 'Artistas', icon: 'mic-outline', title: 'Artistas ao vivo', hint: 'Shows, ensaios e bate-papo com artistas' },
  { key: 'cursos', label: 'Cursos', icon: 'school-outline', title: 'Cursos e aulas ao vivo', hint: 'Aulas, oficinas e treinos' },
  { key: 'faculdades', label: 'Faculdades', icon: 'library-outline', title: 'Faculdades ao vivo', hint: 'Aulas abertas e eventos de faculdades' },
  { key: 'tecnologia', label: 'Tecnologia', icon: 'hardware-chip-outline', title: 'Tecnologia ao vivo', hint: 'IA, apps, montagem e novidades' },
  { key: 'noticias', label: 'Noticiários', icon: 'newspaper-outline', title: 'Noticiários ao vivo', hint: 'Só canais de notícia verificados' },
  { key: 'podcasts', label: 'Podcasts', icon: 'headset-outline', title: 'Podcasts ao vivo', hint: 'Conversas e entrevistas' },
  { key: 'compras', label: 'Compras ao vivo', icon: 'bag-handle-outline', title: 'Compras ao vivo', hint: 'Lojas, restaurantes e fornecedores mostrando produtos' },
  { key: 'noite', label: 'Noite e eventos', icon: 'musical-notes-outline', title: 'Noite e eventos', hint: 'Festas e baladas' },
  { key: 'comunidade', label: 'Comunidade', icon: 'people-outline', title: 'Comunidade ao vivo', hint: 'Bate-papo de quem está no Realys' },
];
export const catOf = (k) => LIVE_CATS.find((c) => c.key === k) || LIVE_CATS[LIVE_CATS.length - 1];

export const HOST_TYPES = {
  usuario: { label: 'Usuário', icon: 'person-outline', color: '#2F74D0' },
  empresa: { label: 'Empresa', icon: 'storefront-outline', color: '#A8790A' },
  artista: { label: 'Artista', icon: 'mic-outline', color: '#7B6CF6' },
  prestador: { label: 'Prestador', icon: 'construct-outline', color: '#1E9E63' },
  fornecedor: { label: 'Fornecedor', icon: 'cube-outline', color: '#C77D12' },
};

// Como quem abre a live pode aparecer, conforme os perfis da conta.
export function hostOptions(state) {
  const roles = (state.user && state.user.roles) || ['cliente'];
  const name = (state.user && state.user.name) || 'Você';
  const opts = [{ type: 'usuario', name, id: 'me' }];
  if (roles.includes('empresa')) {
    const s = (state.stores || []).find((x) => x.id === 'e1');
    opts.push({ type: 'empresa', name: s ? s.name : 'Minha empresa', id: 'e1' });
  }
  if (roles.includes('prestador')) opts.push({ type: 'prestador', name: (state.myProvider && state.myProvider.name) || name, id: 'me' });
  if (roles.includes('fornecedor')) opts.push({ type: 'fornecedor', name: 'Distribuidora Real Alimentos', id: 's1' });
  opts.push({ type: 'artista', name: `${name} (Estúdio)`, id: 'me' });
  return opts;
}

// Perfil padrão de quem transmite, pelo perfil que está em uso no app.
export function defaultHost(state) {
  const opts = hostOptions(state);
  const want = { empresa: 'empresa', prestador: 'prestador', fornecedor: 'fornecedor' }[state.activeRole];
  return opts.find((o) => o.type === want) || opts[0];
}

// Lives de quem tem este perfil (para o selo "Ao vivo agora" nos perfis).
export const livesOf = (list, hostType, hostId) => list.filter((l) => l.hostType === hostType && l.hostId === hostId);
