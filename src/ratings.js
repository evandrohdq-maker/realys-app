// Avaliação depois da entrega ou do serviço concluído.
// Pedido (comida ou produtos): avalia a loja e, se teve entrega, o motoboy.
// Serviço (motorista, eletricista, diarista…): avalia o prestador.
// A nota entra na nota do prestador e o comentário vira depoimento verificado na página da loja.

export const RATE_TAGS = {
  loja: { good: ['Chegou rápido', 'Bem embalado', 'Igual ao anúncio', 'Bom preço', 'Bom atendimento'], bad: ['Atrasou', 'Veio errado', 'Faltou item', 'Embalagem ruim'] },
  food: { good: ['Comida gostosa', 'Chegou quentinha', 'Bem embalado', 'Porção caprichada', 'Bom preço'], bad: ['Chegou fria', 'Veio errado', 'Atrasou', 'Faltou item'] },
  motoboy: { good: ['Rápido', 'Educado', 'Cuidadoso com o pedido', 'Achou fácil o endereço'], bad: ['Atrasou', 'Mal-educado', 'Pedido danificado'] },
  motorista: { good: ['Dirigiu bem', 'Carro limpo', 'Pontual', 'Educado'], bad: ['Atrasou', 'Direção perigosa', 'Carro sujo', 'Mal-educado'] },
  prestador: { good: ['Pontual', 'Caprichoso', 'Preço justo', 'Educado', 'Deixou tudo limpo', 'Explicou tudo'], bad: ['Atrasou', 'Serviço malfeito', 'Cobrou diferente', 'Mal-educado'] },
};

export const STAR_LABEL = ['', 'Muito ruim', 'Ruim', 'Regular', 'Bom', 'Excelente'];

// Quem o cliente avalia num pedido entregue.
export function orderTargets(state, order) {
  const names = String(order.store || '').split(', ').filter(Boolean);
  const stores = names.map((n) => (state.stores || []).find((s) => s.name === n)).filter(Boolean);
  const targets = stores.map((s) => ({ key: 'loja-' + s.id, type: order.food ? 'food' : 'loja', id: s.id, name: s.name, logo: s.logo }));
  const courier = order.courierId && (state.providers || []).find((p) => p.id === order.courierId);
  if (courier) targets.push({ key: 'moto-' + courier.id, type: 'motoboy', id: courier.id, name: courier.name, photo: courier.photo });
  return targets;
}

// Quem o cliente avalia num serviço concluído.
export function callTargets(call) {
  const p = call.provider;
  const transport = call.serviceKey === 'motorista' || call.serviceKey === 'motoboy';
  return [{ key: 'prov-' + p.id, type: call.serviceKey === 'motorista' ? 'motorista' : transport ? 'motoboy' : 'prestador', id: p.id, name: p.name, photo: p.photo, label: call.serviceLabel }];
}
