// Selo de Equipe: prestadores que trabalham juntos, cada um com o próprio MEI (ou CNPJ).
// O selo só mostra ao cliente que eles atuam em conjunto. Cada membro continua com o próprio perfil,
// a própria agenda e a própria carteira: o Re@lys paga cada um separado e nunca junta o dinheiro
// da equipe numa conta só (cada MEI emite a sua nota e respeita o próprio teto de faturamento).
// Quem lidera a equipe não é patrão dos outros: não há subordinação nem salário entre os membros.
import { providers } from './data';

export const TEAMS = [
  {
    id: 'eq-luzforca',
    name: 'Luz & Força',
    service: 'eletricista',
    city: 'Centro e zona sul (demo)',
    since: 'março de 2025',
    about: 'Cinco eletricistas que se ajudam nos serviços grandes e cobrem a agenda uns dos outros.',
    members: ['v4', 'v13', 'v62', 'v63', 'v64'],
  },
];

export const teamById = (id) => TEAMS.find((t) => t.id === id) || null;
export const teamOf = (p) => (p && p.teamId ? teamById(p.teamId) : null);
export const teamMembers = (team) => (team ? providers.filter((p) => team.members.includes(p.id)) : []);

// Regras mostradas ao entrar ou criar uma equipe (texto do termo do prestador).
export const TEAM_RULES = [
  'Cada membro tem o próprio MEI ou CNPJ e recebe na própria carteira.',
  'Cada um emite a própria nota fiscal e controla o próprio limite de faturamento.',
  'Ninguém da equipe é funcionário de outro membro: não há chefe, salário nem horário imposto.',
  'O selo pode ser retirado se a equipe funcionar, na prática, como uma empresa só com empregados.',
];
