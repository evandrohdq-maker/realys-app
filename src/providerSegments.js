// Cadastro do prestador por segmento: cada segmento (classe do catálogo de profissões, em
// src/professionsData.js) mostra só o que é da profissão dele — as profissões do segmento, as
// formas de cobrança que fazem sentido, se tem taxa de visita, se pede veículo e os exemplos.
// Ex.: Artista não vê "por corrida", "por km" nem campo de veículo; motorista não vê "por show".
import { PROF_CLASSES } from './professionsData';
import { serviceTypes } from './data';

const BASE = { units: ['visita', 'hora', 'serviço', 'diária'], visit: true, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Tomadas, Chuveiro, Disjuntor)' };
export const SEG_CONFIG = {
  casa: BASE,
  construcao: { ...BASE, units: ['visita', 'diária', 'm²', 'serviço', 'hora'], ph: 'O que você faz (ex.: Reboco, Piso, Telhado)' },
  veiculos: { ...BASE, units: ['serviço', 'visita', 'hora'], ph: 'O que você faz (ex.: Revisão, Freio, Elétrica)' },
  transporte: { units: ['corrida', 'km', 'hora', 'diária'], visit: false, vehicle: true, price: 'Preço (R$)', ph: 'O que você faz (ex.: Corridas na cidade, Aeroporto, Entregas)' },
  saude: { units: ['consulta', 'sessão', 'hora'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'Sua especialidade (ex.: Ansiedade, Nutrição esportiva)' },
  beleza: { ...BASE, units: ['serviço', 'hora', 'visita'], ph: 'O que você faz (ex.: Corte, Unhas, Maquiagem)' },
  cuidados: { units: ['hora', 'diária', 'plantão'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Cuidador de idosos, Babá)' },
  pets: { units: ['serviço', 'passeio', 'diária', 'hora'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Banho, Adestramento, Passeio)' },
  eventos: { units: ['evento', 'hora', 'serviço', 'pessoa'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Casamentos, Aniversários, Formaturas)' },
  artistas: {
    units: ['show', 'hora', 'serviço', 'publicidade'], visit: false, vehicle: false, price: 'Cachê (R$)',
    ph: 'Seu estilo e o que você apresenta (ex.: Sertanejo, Acústico, Casamentos)',
    note: 'Artista cobra por show, por hora, por serviço (jingle, gravação, arte) ou por publicidade (divulgar uma marca nos seus reels e stories). Monte cachês, agenda e vitrine em Perfil › Shows e contratação.',
  },
  aulas: { units: ['aula', 'hora', 'mês'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você ensina (ex.: Matemática, Violão, Inglês)' },
  tecnologia: { units: ['hora', 'serviço', 'projeto', 'visita'], visit: true, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Formatação, Sites, Redes)' },
  criativos: { units: ['serviço', 'projeto', 'hora', 'publicidade'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Logo, Social media, Vídeos)' },
  juridico: { units: ['consulta', 'hora', 'serviço', 'mês'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'Sua área (ex.: Trabalhista, Imposto de renda)' },
  agro: { units: ['visita', 'hora', 'diária', 'hectare'], visit: true, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Pulverização, Análise de solo)' },
  moda: { units: ['peça', 'serviço', 'hora'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Ajustes, Roupas sob medida)' },
  turismo: { units: ['pessoa', 'passeio', 'diária'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você oferece (ex.: City tour, Trilhas)' },
  ambiente: { units: ['coleta', 'kg', 'serviço'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Coleta de recicláveis, Entulho)' },
  seguranca: { units: ['hora', 'plantão', 'diária', 'evento'], visit: false, vehicle: false, price: 'Preço (R$)', ph: 'O que você faz (ex.: Portaria, Eventos, Ronda)' },
};
export const segConfig = (key) => SEG_CONFIG[key] || BASE;

const typeByKey = Object.fromEntries(serviceTypes.map((t) => [t.key, t]));
// Segmentos na ordem do catálogo (Artistas logo no começo, para quem se apresenta achar fácil).
export const SEGMENTS = [...PROF_CLASSES]
  .sort((a, b) => (a.key === 'artistas' ? -1 : b.key === 'artistas' ? 1 : 0))
  .map((c) => ({ key: c.key, label: c.label === 'Artistas' ? 'Artista' : c.label, emoji: c.emoji, professions: c.subs.map(([k]) => typeByKey[k]).filter(Boolean) }));

// Segmento de uma profissão já cadastrada (DJ e banda contam como Artista).
export function segOfService(service) {
  const art = SEGMENTS.find((s) => s.key === 'artistas');
  if (art && art.professions.some((p) => p.key === service)) return 'artistas';
  const s = SEGMENTS.find((x) => x.professions.some((p) => p.key === service));
  return s ? s.key : 'casa';
}
