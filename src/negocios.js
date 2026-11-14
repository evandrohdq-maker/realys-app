// Como o Re@lys ganha na aba Negócios (imóveis, veículos e máquinas).
// O cliente nunca paga. Quem anuncia paga de um dos dois jeitos:
//  - plano mensal (imobiliária, revenda): conversas com interessados liberadas;
//  - por conversa (proprietário, particular): anunciar é grátis e só paga ao liberar a conversa
//    com um interessado verificado por biometria.
// Valores em src/taxas.js. Arquivo sem React Native, para poder ser testado no computador.
import { TAXAS } from './taxas';

export const NEG_PLANOS = [
  { id: 'imob10', nome: 'Imobiliária', detalhe: 'Até 10 anúncios de imóveis', valor: TAXAS.anuncioImobiliaria.valor, limite: 10, setores: ['imoveis'] },
  { id: 'imob40', nome: 'Imobiliária Plus', detalhe: 'Até 40 anúncios de imóveis', valor: TAXAS.anuncioImobiliaria.valor40, limite: 40, setores: ['imoveis'] },
  { id: 'revenda', nome: 'Revenda', detalhe: 'Veículos e máquinas, até 40 anúncios', valor: TAXAS.anuncioRevenda.valor, limite: 40, setores: ['veiculos', 'maquinas'] },
];
export const negPlano = (id) => NEG_PLANOS.find((p) => p.id === id) || null;

// Setor de um tipo de anúncio.
export const setorDoTipo = (kind) => (/^imovel/.test(kind) ? 'imoveis' : /^maquina/.test(kind) ? 'maquinas' : 'veiculos');
// Quanto custa liberar uma conversa (para quem não tem plano).
export const precoContato = (kind) => (setorDoTipo(kind) === 'imoveis' ? TAXAS.contatoImovel.valor : TAXAS.contatoVeiculo.valor);
// O plano contratado cobre este tipo de anúncio?
export const planoCobre = (planId, kind) => {
  const p = negPlano(planId);
  return !!p && p.setores.includes(setorDoTipo(kind));
};
// O que o anunciante paga para liberar a conversa com este interessado (0 = coberto pelo plano).
export const custoLiberar = (planId, kind) => (planoCobre(planId, kind) ? 0 : precoContato(kind));
// Se o interessado não responder nesse prazo, o valor do contato volta como crédito.
export const NEG_REEMBOLSO_HORAS = 48;
