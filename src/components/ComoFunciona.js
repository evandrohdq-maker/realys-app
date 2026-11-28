// "Como funciona": informações úteis sobre o Shop, o Food, os Serviços e as Corridas.
// - ComoFuncionaCard: um cartão por assunto, que aparece no meio do feed da Community enquanto a pessoa rola.
// - ComoFuncionaAbas: os quatro assuntos em abas, dentro do "Conheça o Realyz".
// Valores conferidos com src/taxas.js, src/teleGratis.js e o Termo de Adesão (src/termoAdesao.js).
import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text } from '../responsive';
import { colors } from '../theme';
import { useStore } from '../store';
import { PRIMEIRA_TELE } from '../teleGratis';

const brl = (v) => 'R$ ' + Number(v).toFixed(2).replace('.', ',');

export const TOPICOS = [
  {
    id: 'shop',
    nome: 'Shop',
    icon: 'bag-handle-outline',
    titulo: 'Comprar sem medo de golpe',
    go: { tab: 'home', top: 'shop', seg: 'vitrine' },
    abrir: 'Abrir o Shop',
    voce: [
      ['shield-checkmark-outline', 'Pagamento protegido', 'O dinheiro fica com o Realyz e só vai para a loja quando você confirma que recebeu.'],
      ['pricetag-outline', `Taxa de proteção de ${brl(0.99)}`, 'Por pedido, sempre o mesmo valor, mostrada antes de você confirmar.'],
      ['ribbon-outline', 'Lojas verificadas', 'Quem mais vende e é bem avaliado aparece primeiro na busca.'],
      ['return-down-back-outline', 'Mudou de ideia?', 'Enquanto o pedido não entrou em preparo, dá para cancelar e pedir o estorno (as taxas não voltam).'],
    ],
    parceiro: ['Para quem vende', `${brl(49.9)} por mês, com o 1º mês grátis, e só começa depois do primeiro pedido aceito. 10% por venda, já com o pagamento online. Painel com estoque, caixa e clientes.`],
  },
  {
    id: 'food',
    nome: 'Food',
    icon: 'restaurant-outline',
    titulo: 'Comida do restaurante até a sua porta',
    go: { tab: 'food', cat: 'Todos', q: '' },
    abrir: 'Abrir o Food',
    voce: [
      ['map-outline', 'Acompanhe no mapa', 'Restaurante, motoboy e você ligados: dá para ver o pedido chegando.'],
      ['bicycle-outline', 'Primeira tele grátis', `No seu primeiro pedido de comida a partir de ${brl(PRIMEIRA_TELE.minimoPedido)}, presente do Realyz (enquanto durar a promoção do mês).`],
      ['qr-code-outline', 'Entrega confirmada', 'Na porta, o código de entrega confirma que o pedido chegou a você.'],
      ['time-outline', 'Atrasou?', 'Passou 30 min do prazo, você fala com o restaurante pelo chat. Passou 1 hora, pode pedir o dinheiro de volta.'],
    ],
    parceiro: ['Para restaurantes', 'Ligue a "Tele grátis" acima de um valor mínimo e ganhe o selo e destaque no Food. Pedidos, cardápio e motoboys num painel só.'],
  },
  {
    id: 'servicos',
    nome: 'Serviços',
    icon: 'construct-outline',
    titulo: 'O profissional certo, perto de você',
    go: { tab: 'servicos' },
    abrir: 'Ver profissionais',
    voce: [
      ['person-circle-outline', 'Profissionais verificados', 'Eletricista, encanador, mecânico, diarista e muito mais, todos com rosto e documento conferidos.'],
      ['mic-outline', 'Peça pela Lotus', 'Diga "Lotus, preciso de um eletricista" e ela mostra quem está perto, com preço e avaliação.'],
      ['cash-outline', 'Preço claro', 'O profissional mostra a taxa de visita; o valor do serviço é combinado com você no app.'],
      ['star-outline', 'Avaliação conta', 'Serviço concluído e bem avaliado leva o profissional ao topo da busca.'],
    ],
    parceiro: ['Para quem trabalha', 'Seja MEI e receba pedidos pelo celular, com agenda e rota até o cliente. O Realyz fica com 15% da taxa de visita; contato e pagamento sempre pelo app, para proteger os dois lados.'],
  },
  {
    id: 'corridas',
    nome: 'Corridas',
    icon: 'car-outline',
    titulo: 'Corridas e entregas com quem é de verdade',
    go: { tab: 'servicos' },
    abrir: 'Pedir uma corrida',
    voce: [
      ['finger-print-outline', 'Motorista verificado', 'Motoristas e motoboys confirmam o rosto com o documento antes de rodar.'],
      ['navigate-outline', 'GPS mostra tudo', 'Você vê o carro chegando, com o nome do motorista, o carro e o tempo de chegada.'],
      ['card-outline', 'Pague pelo app', 'Sem dinheiro na mão: o valor aparece antes e fica protegido pelo Realyz.'],
    ],
    parceiro: ['Para motoristas e motoboys', 'O Realyz fica com 18% da corrida. Entregas no mesmo caminho são encaixadas para você ganhar mais por viagem.'],
  },
];

function Itens({ t, compacto }) {
  const lista = compacto ? t.voce.slice(0, 3) : t.voce;
  return (
    <>
      {lista.map(([icon, tit, x]) => (
        <View key={tit} style={st.item}>
          <View style={st.itemIcone}>
            <Ionicons name={icon} size={17} color={colors.gold} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={st.itemT}>{tit}</Text>
            <Text style={st.itemX}>{x}</Text>
          </View>
        </View>
      ))}
      <View style={st.parceiro}>
        <Text style={st.parceiroT}>{t.parceiro[0]}</Text>
        <Text style={st.parceiroX}>{t.parceiro[1]}</Text>
      </View>
    </>
  );
}

// Cartão do feed: um assunto por vez (o feed gira entre Shop, Food, Serviços e Corridas).
export function ComoFuncionaCard({ indice = 0 }) {
  const { dispatch } = useStore();
  const t = TOPICOS[((indice % TOPICOS.length) + TOPICOS.length) % TOPICOS.length];
  return (
    <View style={st.card}>
      <View style={st.topo}>
        <View style={st.selo}>
          <Ionicons name={t.icon} size={15} color={colors.dark} />
        </View>
        <Text style={st.kicker}>Como funciona · {t.nome}</Text>
      </View>
      <Text style={st.titulo}>{t.titulo}</Text>
      <Itens t={t} compacto />
      <TouchableOpacity style={st.botao} onPress={() => dispatch({ type: 'NAV_REQUEST', go: t.go })} accessibilityLabel={t.abrir}>
        <Text style={st.botaoT}>{t.abrir}</Text>
        <Ionicons name="arrow-forward" size={15} color={colors.dark} />
      </TouchableOpacity>
    </View>
  );
}

// Abas dentro do "Conheça o Realyz".
export function ComoFuncionaAbas() {
  const { dispatch } = useStore();
  const [aba, setAba] = useState(TOPICOS[0].id);
  const t = TOPICOS.find((x) => x.id === aba) || TOPICOS[0];
  return (
    <View>
      <View style={st.abas}>
        {TOPICOS.map((x) => {
          const on = x.id === aba;
          return (
            <TouchableOpacity key={x.id} onPress={() => setAba(x.id)} style={[st.aba, on && st.abaOn]} accessibilityRole="tab" accessibilityState={{ selected: on }} accessibilityLabel={`Como funciona: ${x.nome}`}>
              <Ionicons name={x.icon} size={15} color={on ? colors.gold : colors.muted} />
              <Text style={[st.abaT, on && { color: '#F5F0E4' }]}>{x.nome}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={[st.card, { marginTop: 8, marginBottom: 0 }]}>
        <Text style={st.titulo}>{t.titulo}</Text>
        <Itens t={t} />
        <TouchableOpacity style={st.botao} onPress={() => dispatch({ type: 'NAV_REQUEST', go: t.go })} accessibilityLabel={t.abrir}>
          <Text style={st.botaoT}>{t.abrir}</Text>
          <Ionicons name="arrow-forward" size={15} color={colors.dark} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: colors.dark, borderRadius: 20, padding: 16, marginVertical: 8, borderWidth: 1, borderColor: 'rgba(245,195,49,0.25)' },
  topo: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  selo: { width: 26, height: 26, borderRadius: 13, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  kicker: { color: colors.gold, fontWeight: '800', fontSize: 12, letterSpacing: 0.6, textTransform: 'uppercase' },
  titulo: { color: '#F5F0E4', fontWeight: '800', fontSize: 18, marginBottom: 6 },
  item: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  itemIcone: { width: 32, height: 32, borderRadius: 16, borderWidth: 1.2, borderColor: 'rgba(245,195,49,0.6)', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  itemT: { color: '#F5F0E4', fontWeight: '700', fontSize: 14 },
  itemX: { color: '#CFC7B6', fontSize: 13, lineHeight: 18, marginTop: 1 },
  parceiro: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  parceiroT: { color: colors.gold, fontWeight: '800', fontSize: 12.5 },
  parceiroX: { color: '#CFC7B6', fontSize: 12.5, lineHeight: 17, marginTop: 2 },
  botao: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: colors.gold, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, marginTop: 14 },
  botaoT: { color: colors.dark, fontWeight: '800', marginRight: 6, fontSize: 13.5 },
  abas: { flexDirection: 'row', backgroundColor: colors.cardAlt || '#F3EEE4', borderRadius: 14, padding: 3 },
  aba: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 7, borderRadius: 11 },
  abaOn: { backgroundColor: colors.dark },
  abaT: { color: colors.muted, fontWeight: '700', fontSize: 12, marginLeft: 4 },
});
