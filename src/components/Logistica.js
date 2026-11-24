// Logística com contas reais:
//  - EntregasEntregador: ofertas de entrega perto (rota inteligente primeiro), aceitar, coletei,
//    entreguei (com o código do cliente) e fretes para quem tem van/caminhão (aceitar ou proposta).
//  - ChamarEntregador: botão no pedido da loja (moto ou carro), com o andamento e o código.
//  - CargasLoja: a empresa publica um frete (volumes grandes do Shop) e escolhe a proposta.
//  - EntregasCliente: o código de 4 números e o andamento da entrega de quem comprou.
//  - OfertasFornecedor: ofertas de fornecedores para a empresa, pedir, e publicar as próprias.
import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text, TextInput } from '../responsive';
import { useStore } from '../store';
import { colors, soft, brl } from '../theme';
import { api, connectEvents } from '../api';
import { conectado, carregarCarteira } from '../serverShop';
import { getDevicePoint } from '../geo';
import { aCada } from '../ritmo';

const n = (v) => String(v).replace('.', ',');
const VEIC = { moto: 'Moto', carro: 'Carro', van: 'Van', caminhao: 'Caminhão' };
const STATUS = { aberta: 'Procurando entregador', aceita: 'Entregador a caminho da coleta', coletada: 'Saiu para entrega', entregue: 'Entregue ✅', cancelada: 'Cancelada' };

// Recarrega quando chega aviso de entrega, carga ou fornecedor.
function useAoVivo(load, tipos) {
  useEffect(() => {
    load();
    const stop = connectEvents((e) => tipos.some((t) => e.type.startsWith(t)) && load());
    const t = aCada(load, 45000);
    return () => {
      stop();
      t.parar();
    };
  }, [load]);
}

const Chip = ({ on, label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[st.chip, on && st.chipOn]}>
    <Text numberOfLines={1} style={[st.chipTxt, on && { color: '#fff' }]}>{label}</Text>
  </TouchableOpacity>
);
const Btn = ({ title, onPress, light, small }) => (
  <TouchableOpacity onPress={onPress} style={[st.btn, light && st.btnLight, small && { paddingVertical: 7 }]}>
    <Text style={[st.btnTxt, light && { color: colors.primary }]}>{title}</Text>
  </TouchableOpacity>
);

// ---------- Entregador / transportadora ----------
export function EntregasEntregador() {
  const { state, dispatch } = useStore();
  const [ofertas, setOfertas] = useState(null);
  const [cargas, setCargas] = useState([]);
  const [minhas, setMinhas] = useState([]);
  const [codigo, setCodigo] = useState({});
  const on = conectado(state);
  const load = useCallback(() => {
    if (!on) return;
    api('GET', '/entregas/ofertas').then(setOfertas).catch(() => setOfertas([]));
    api('GET', '/cargas').then(setCargas).catch(() => setCargas([]));
    api('GET', '/entregas/minhas').then((r) => setMinhas(r.levando || [])).catch(() => {});
  }, [on]);
  useAoVivo(load, ['entrega', 'carga']);
  if (!on) return null;
  const falha = (e) => (e.code === 'verificacao_periodica' ? Alert.alert('Confirme seu rosto', 'Para pegar entregas, confirme seu rosto em "Disponível" (a cada 6 horas).') : Alert.alert('Entrega', e.message));
  const aceitar = (o) => api('POST', `/entregas/${o.id}/aceitar`).then(load).catch(falha);
  const coletei = (e) => api('POST', `/entregas/${e.id}/coletada`).then(load).catch(falha);
  const entreguei = (e) =>
    api('POST', `/entregas/${e.id}/entregue`, { codigo: codigo[e.id] || '' })
      .then((r) => (Alert.alert('Entrega concluída ✅', `${brl(r.recebeu)} já estão na sua carteira.`), carregarCarteira(dispatch).catch(() => {}), load()))
      .catch(falha);
  const proposta = (c, valor) =>
    api('POST', `/cargas/${c.id}/proposta`, valor ? { valor: Number(String(valor).replace(',', '.')) } : {})
      .then(() => (Alert.alert('Enviado', 'A empresa escolhe entre as propostas e você recebe o aviso.'), load()))
      .catch(falha);
  const ativas = minhas.filter((e) => e.status === 'aceita' || e.status === 'coletada');
  if (!(ofertas || []).length && !cargas.length && !ativas.length) {
    return ofertas == null ? null : <Text style={[st.muted, { marginBottom: 10 }]}>Sem entregas de lojas do Realyz perto agora. Fique disponível (ou programe seu horário) para receber os avisos.</Text>;
  }
  return (
    <View style={{ marginBottom: 12 }}>
      {ativas.length ? <Text style={st.sec}>Levando agora</Text> : null}
      {ativas.map((e) => (
        <View key={e.id} style={[st.card, { borderWidth: 1.5, borderColor: colors.success }]}>
          <Text style={st.title}>{e.loja}{e.rotaCom ? ' · rota inteligente' : ''}</Text>
          <Text style={st.muted}>📍 {e.coleta} → {e.destino}</Text>
          <Text style={[st.muted, { marginTop: 2 }]}>{STATUS[e.status]} · você recebe {brl(e.entregadorRecebe)}</Text>
          {e.status === 'aceita' ? (
            <Btn title="Coletei" onPress={() => coletei(e)} />
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <TextInput value={codigo[e.id] || ''} onChangeText={(v) => setCodigo((x) => ({ ...x, [e.id]: v.replace(/\D/g, '').slice(0, 4) }))} placeholder="Código do cliente" placeholderTextColor={colors.muted} keyboardType="number-pad" style={[st.input, { flex: 1, marginRight: 8, marginTop: 0 }]} />
              <Btn title="Entreguei" onPress={() => entreguei(e)} />
            </View>
          )}
        </View>
      ))}
      {(ofertas || []).length ? <Text style={st.sec}>Entregas perto de você</Text> : null}
      {(ofertas || []).map((o) => (
        <View key={o.id} style={[st.card, o.rota && { borderWidth: 1.5, borderColor: colors.primary }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[st.title, { flex: 1 }]}>{o.loja}</Text>
            {o.rota ? <Text style={st.badge}>🧭 mesmo caminho · −{n(o.rota.economiaKm)} km</Text> : null}
          </View>
          <Text style={st.muted}>📍 {o.coleta} → {o.destino}</Text>
          <Text style={st.muted}>{VEIC[o.veiculo]}{o.km ? ` · ${n(o.km)} km de entrega` : ''}{o.ateColetaKm != null ? ` · ${n(o.ateColetaKm)} km até a coleta` : ''}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
            <Text style={{ flex: 1, color: colors.primary, fontWeight: '800' }}>Você recebe {brl(o.entregadorRecebe)}{o.rota ? ` (taxa de rota ${o.rota.taxaPct}%)` : ''}</Text>
            <Btn small title={o.rota ? 'Pegar junto' : 'Aceitar'} onPress={() => aceitar(o)} />
          </View>
        </View>
      ))}
      {cargas.length ? <Text style={st.sec}>Fretes para o seu veículo</Text> : null}
      {cargas.map((c) => (
        <CargaOferta key={c.id} c={c} onAceitar={() => proposta(c)} onPropor={(v) => proposta(c, v)} />
      ))}
    </View>
  );
}

function CargaOferta({ c, onAceitar, onPropor }) {
  const [v, setV] = useState('');
  return (
    <View style={st.card}>
      <Text style={st.title}>{c.loja} · {VEIC[c.veiculo]}</Text>
      <Text style={st.muted}>📍 {c.coleta} → {c.destino}{c.km ? ` · ${n(c.km)} km` : ''}</Text>
      <Text style={{ color: colors.text, marginTop: 4 }}>{c.descricao}</Text>
      <Text style={{ color: colors.primary, fontWeight: '800', marginTop: 4 }}>A empresa paga {brl(c.valor)} (você recebe {brl(c.entregadorRecebe)})</Text>
      {c.minhaProposta ? (
        <Text style={[st.muted, { marginTop: 6 }]}>Sua proposta: {brl(c.minhaProposta.valor / 100)} · aguardando a empresa</Text>
      ) : (
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
          <Btn small title="Aceitar o valor" onPress={onAceitar} />
          <TextInput value={v} onChangeText={setV} placeholder="Ou proponha R$" placeholderTextColor={colors.muted} keyboardType="decimal-pad" style={[st.input, { flex: 1, marginHorizontal: 8, marginTop: 0 }]} />
          <Btn small light title="Propor" onPress={() => v && onPropor(v)} />
        </View>
      )}
    </View>
  );
}

// ---------- Loja: chamar entregador no pedido ----------
export function ChamarEntregador({ order }) {
  const [e, setE] = useState(undefined);
  const load = useCallback(() => {
    api('GET', '/entregas/minhas')
      .then((r) => setE((r.loja || []).find((x) => x.orderId === order.id && x.status !== 'cancelada') || null))
      .catch(() => setE(null));
  }, [order.id]);
  useEffect(load, [load]);
  if (e === undefined || ['Cancelado', 'Entregue'].includes(order.status) && !e) return null;
  const chamar = (veiculo) =>
    api('POST', `/entregas/pedido/${order.id}`, { veiculo })
      .then((x) => (setE(x), Alert.alert('Procurando entregador', `Avisamos os entregadores perto. A entrega custa ${brl(x.valor)} (fica retida até entregar). Código do cliente: ${x.codigo}.`)))
      .catch((err) => Alert.alert('Entregador', err.message));
  const cancelar = () => api('POST', `/entregas/${e.id}/cancelar`).then(load).catch((err) => Alert.alert('Entrega', err.message));
  if (!e) {
    return (
      <View style={{ flexDirection: 'row', marginTop: 6 }}>
        <Btn small title="🛵 Chamar motoboy" onPress={() => chamar('moto')} />
        <View style={{ width: 8 }} />
        <Btn small light title="🚗 Carro" onPress={() => chamar('carro')} />
      </View>
    );
  }
  return (
    <View style={{ marginTop: 6 }}>
      <Text style={{ color: colors.text, fontWeight: '700' }}>{STATUS[e.status]}{e.entregador ? ` · ${e.entregador}` : ''}</Text>
      <Text style={st.muted}>Entrega {brl(e.valor)} · código do cliente {e.codigo}</Text>
      {e.status === 'aberta' ? <TouchableOpacity onPress={cancelar}><Text style={{ color: colors.danger, fontWeight: '700', marginTop: 4 }}>Cancelar chamada</Text></TouchableOpacity> : null}
    </View>
  );
}

// ---------- Loja: fretes (cargas) ----------
export function CargasLoja() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [lista, setLista] = useState([]);
  const [form, setForm] = useState(null);
  const on = conectado(state) && (state.user.roles || []).includes('empresa');
  const load = useCallback(() => {
    if (on) api('GET', '/entregas/minhas').then((r) => setLista((r.loja || []).filter((x) => x.tipo === 'carga'))).catch(() => {});
  }, [on]);
  useAoVivo(load, ['carga']);
  if (!on) return null;
  const publicar = async () => {
    try {
      const pt = await getDevicePoint().catch(() => null);
      await api('POST', '/cargas', { ...form, valor: Number(String(form.valor).replace(',', '.')), ...(pt ? { coletaLat: pt.lat, coletaLng: pt.lon } : {}) });
      setForm(null);
      carregarCarteira(dispatch).catch(() => {});
      load();
    } catch (e) {
      Alert.alert('Frete', e.message);
    }
  };
  const escolher = (c, p) => api('POST', `/cargas/${c.id}/escolher`, { propostaId: p.id }).then(() => (carregarCarteira(dispatch).catch(() => {}), load())).catch((e) => Alert.alert('Frete', e.message));
  return (
    <View style={[st.card, { marginBottom: 12 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[st.title, { flex: 1 }]}>🚚 Fretes para transportadoras</Text>
        <TouchableOpacity onPress={() => setForm({ coleta: '', destino: '', descricao: '', valor: '', veiculo: 'van' })}><Text style={{ color: colors.primary, fontWeight: '800' }}>+ Publicar</Text></TouchableOpacity>
      </View>
      <Text style={st.muted}>Volumes grandes do Shop (móveis, eletrodomésticos, atacado): transportadoras perto aceitam ou mandam proposta.</Text>
      {lista.map((c) => (
        <View key={c.id} style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#EFE6CC', paddingTop: 8 }}>
          <Text style={{ color: colors.text, fontWeight: '700' }}>{c.descricao}</Text>
          <Text style={st.muted}>{c.coleta} → {c.destino} · {VEIC[c.veiculo]} · {brl(c.valor)} · {STATUS[c.status]}{c.entregador ? ` · ${c.entregador}` : ''}</Text>
          {c.status !== 'aberta' && c.status !== 'entregue' ? <Text style={st.muted}>Código para quem recebe: {c.codigo}</Text> : null}
          {c.status === 'aberta' && (c.propostas || []).length ? (
            (c.propostas || []).map((p) => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                <Text style={{ flex: 1, color: colors.text }}>{p.transportador}: {brl(p.valor)}{p.prazo ? ` · ${p.prazo}` : ''}</Text>
                <Chip on label="Escolher" onPress={() => escolher(c, p)} />
              </View>
            ))
          ) : c.status === 'aberta' ? <Text style={st.muted}>Aguardando propostas…</Text> : null}
        </View>
      ))}
      {form ? (
        <Modal visible animationType="slide" onRequestClose={() => setForm(null)}>
          <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
            <View style={st.head}>
              <TouchableOpacity onPress={() => setForm(null)} style={{ padding: 6 }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
              <Text style={[st.title, { flex: 1, marginLeft: 6 }]}>Publicar frete</Text>
              <TouchableOpacity onPress={publicar} style={st.save}><Text style={{ color: '#fff', fontWeight: '800' }}>Publicar</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              {[['coleta', 'Endereço de coleta'], ['destino', 'Destino (endereço ou cidade)'], ['descricao', 'O que vai: itens, peso, volumes'], ['valor', 'Quanto você paga pelo frete (R$)']].map(([k, ph]) => (
                <TextInput key={k} value={form[k]} onChangeText={(v) => setForm((x) => ({ ...x, [k]: v }))} placeholder={ph} placeholderTextColor={colors.muted} keyboardType={k === 'valor' ? 'decimal-pad' : undefined} multiline={k === 'descricao'} style={st.input} />
              ))}
              <Text style={st.sec}>Veículo</Text>
              <View style={st.wrap}>{['carro', 'van', 'caminhao'].map((v) => <Chip key={v} on={form.veiculo === v} label={VEIC[v]} onPress={() => setForm((x) => ({ ...x, veiculo: v }))} />)}</View>
              <Text style={[st.muted, { marginTop: 10 }]}>O valor fica retido no Realyz e só vai para a transportadora quando o destino confirmar com o código. Se escolher uma proposta diferente, a diferença é acertada na hora. Taxa do Realyz: 10% (paga pela transportadora).</Text>
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

// ---------- Cliente: código e andamento ----------
export function EntregasCliente() {
  const { state } = useStore();
  const [lista, setLista] = useState([]);
  const on = conectado(state);
  const load = useCallback(() => {
    if (on) api('GET', '/entregas/minhas').then((r) => setLista((r.recebendo || []).filter((e) => e.status !== 'entregue' || Date.now() - e.updatedAt < 3600000))).catch(() => {});
  }, [on]);
  useAoVivo(load, ['entrega', 'tracking']);
  if (!on || !lista.length) return null;
  return (
    <View style={{ marginBottom: 12 }}>
      {lista.map((e) => (
        <View key={e.id} style={[st.card, { borderWidth: 1.5, borderColor: colors.primary }]}>
          <Text style={st.title}>🛵 {e.loja} · {STATUS[e.status]}</Text>
          {e.entregador ? <Text style={st.muted}>Entregador: {e.entregador}</Text> : null}
          {e.status !== 'entregue' ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
              <Text style={{ color: colors.text, flex: 1 }}>Passe este código só quando receber:</Text>
              <Text style={{ fontSize: 26, fontWeight: '900', letterSpacing: 4, color: colors.primary }}>{e.codigo}</Text>
            </View>
          ) : null}
        </View>
      ))}
    </View>
  );
}

// ---------- Fornecedores ----------
const SEGS = [
  { key: 'alimentacao', label: 'Restaurantes, bares, padarias' },
  { key: 'mercado', label: 'Mercados e atacado' },
  { key: 'beleza', label: 'Salões e estética' },
  { key: 'todos', label: 'Todas as empresas' },
];
export function OfertasFornecedor() {
  const { state, dispatch } = useStore();
  const insets = useSafeAreaInsets();
  const [aba, setAba] = useState('ofertas');
  const [ofertas, setOfertas] = useState(null);
  const [minhas, setMinhas] = useState([]);
  const [pedidos, setPedidos] = useState([]);
  const [qtd, setQtd] = useState({});
  const [form, setForm] = useState(null);
  const on = conectado(state) && (state.user.roles || []).includes('empresa');
  const load = useCallback(() => {
    if (!on) return;
    api('GET', '/ofertas-fornecedor').then(setOfertas).catch(() => setOfertas([]));
    api('GET', '/ofertas-fornecedor/minhas').then(setMinhas).catch(() => {});
    api('GET', '/pedidos-fornecedor').then(setPedidos).catch(() => {});
  }, [on]);
  useAoVivo(load, ['oferta_fornecedor', 'pedido_fornecedor']);
  if (!on) return null;
  const pedir = (o) => {
    const q = Number(String(qtd[o.id] || o.minimo).replace(',', '.'));
    Alert.alert('Fazer pedido?', `${n(q)} ${o.unidade} de ${o.produto} por ${brl(o.preco * q)}. O valor fica retido e só vai para ${o.fornecedor} quando você confirmar que recebeu.`, [
      { text: 'Voltar', style: 'cancel' },
      { text: 'Pedir', onPress: () => api('POST', `/ofertas-fornecedor/${o.id}/pedir`, { qtd: q }).then(() => (carregarCarteira(dispatch).catch(() => {}), load(), setAba('pedidos'))).catch((e) => Alert.alert('Pedido', e.message)) },
    ]);
  };
  const acao = (p, a) => api('POST', `/pedidos-fornecedor/${p.id}/${a}`).then(() => (carregarCarteira(dispatch).catch(() => {}), load())).catch((e) => Alert.alert('Pedido', e.message));
  const publicar = () =>
    api('POST', '/ofertas-fornecedor', { ...form, preco: Number(String(form.preco).replace(',', '.')), minimo: Number(form.minimo) || 1, raioKm: Number(form.raioKm) || 30, validadeDias: Number(form.validadeDias) || 7 })
      .then((r) => (Alert.alert('Oferta publicada', r.avisadas ? `${r.avisadas} empresa(s) perto foram avisadas.` : 'As empresas do segmento veem na aba Ofertas.'), setForm(null), load()))
      .catch((e) => Alert.alert('Oferta', e.message));
  const STP = { novo: 'aguardando o fornecedor', confirmado: 'confirmado · a caminho', recusado: 'recusado (valor devolvido)', recebido: 'recebido ✅' };
  return (
    <View style={[st.card, { marginBottom: 12 }]}>
      <Text style={st.title}>🤝 Fornecedores</Text>
      <Text style={st.muted}>Ofertas de fornecedores para o seu tipo de negócio, perto. E, se você vende para empresas, publique as suas.</Text>
      <View style={st.wrap}>
        <Chip on={aba === 'ofertas'} label={`Ofertas para mim${ofertas && ofertas.length ? ` · ${ofertas.length}` : ''}`} onPress={() => setAba('ofertas')} />
        <Chip on={aba === 'pedidos'} label="Pedidos" onPress={() => setAba('pedidos')} />
        <Chip on={aba === 'minhas'} label="Vender para empresas" onPress={() => setAba('minhas')} />
      </View>
      {aba === 'ofertas' ? (
        <>
          {ofertas == null ? <ActivityIndicator color={colors.primary} /> : null}
          {ofertas && !ofertas.length ? <Text style={[st.muted, { marginTop: 8 }]}>Nenhuma oferta para o seu segmento agora.</Text> : null}
          {(ofertas || []).map((o) => (
            <View key={o.id} style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#EFE6CC', paddingTop: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '800' }}>{o.produto} · {brl(o.preco)}/{o.unidade}</Text>
              <Text style={st.muted}>{o.fornecedor}{o.distKm != null ? ` · ${n(o.distKm)} km` : ''} · mínimo {n(o.minimo)} {o.unidade} · {o.entrega === 'retirada' ? 'retirar no fornecedor' : 'o fornecedor entrega'}</Text>
              {o.descricao ? <Text style={{ color: colors.text, fontSize: 13 }}>{o.descricao}</Text> : null}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <TextInput value={qtd[o.id] != null ? qtd[o.id] : String(o.minimo)} onChangeText={(v) => setQtd((x) => ({ ...x, [o.id]: v }))} keyboardType="decimal-pad" style={[st.input, { width: 80, marginTop: 0, marginRight: 8 }]} />
                <Text style={[st.muted, { flex: 1 }]}>{o.unidade}</Text>
                <Btn small title="Pedir" onPress={() => pedir(o)} />
              </View>
            </View>
          ))}
        </>
      ) : null}
      {aba === 'pedidos' ? (
        <>
          {!pedidos.length ? <Text style={[st.muted, { marginTop: 8 }]}>Nenhum pedido ainda.</Text> : null}
          {pedidos.map((p) => (
            <View key={p.id} style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#EFE6CC', paddingTop: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{p.lado === 'comprei' ? 'Comprei' : 'Vendi'}: {n(p.qtd)} {p.unidade} de {p.produto} · {brl(p.total)}</Text>
              <Text style={st.muted}>{p.lado === 'comprei' ? 'De' : 'Para'} {p.outro} · {STP[p.status] || p.status}</Text>
              <View style={st.wrap}>
                {p.lado === 'vendi' && p.status === 'novo' ? (
                  <>
                    <Chip on label="Confirmar" onPress={() => acao(p, 'confirmar')} />
                    <Chip label="Recusar" onPress={() => acao(p, 'recusar')} />
                  </>
                ) : null}
                {p.lado === 'comprei' && p.status === 'confirmado' ? <Chip on label="Recebi" onPress={() => acao(p, 'recebi')} /> : null}
              </View>
            </View>
          ))}
        </>
      ) : null}
      {aba === 'minhas' ? (
        <>
          <Btn title="+ Publicar oferta" onPress={() => setForm({ produto: '', descricao: '', preco: '', unidade: 'kg', minimo: '1', segmentos: ['alimentacao'], raioKm: '30', entrega: 'fornecedor', validadeDias: '7' })} />
          {minhas.map((o) => (
            <View key={o.id} style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#EFE6CC', paddingTop: 8 }}>
              <Text style={{ color: colors.text, fontWeight: '700' }}>{o.produto} · {brl(o.preco)}/{o.unidade}{o.status !== 'ativa' ? ' · encerrada' : ''}</Text>
              <Text style={st.muted}>{(o.pedidos || []).length} pedido(s) · válida até {new Date(o.validade).toLocaleDateString('pt-BR')}</Text>
              {o.status === 'ativa' ? <TouchableOpacity onPress={() => api('POST', `/ofertas-fornecedor/${o.id}/encerrar`).then(load)}><Text style={{ color: colors.danger, fontWeight: '700', marginTop: 4 }}>Encerrar oferta</Text></TouchableOpacity> : null}
            </View>
          ))}
          <Text style={[st.muted, { marginTop: 10 }]}>O comprador paga pelo Realyz; o valor fica retido e vai para você quando ele confirma que recebeu. Taxa do Realyz: 5%.</Text>
        </>
      ) : null}
      {form ? (
        <Modal visible animationType="slide" onRequestClose={() => setForm(null)}>
          <View style={{ flex: 1, backgroundColor: colors.bg, paddingTop: insets.top }}>
            <View style={st.head}>
              <TouchableOpacity onPress={() => setForm(null)} style={{ padding: 6 }}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
              <Text style={[st.title, { flex: 1, marginLeft: 6 }]}>Oferta para empresas</Text>
              <TouchableOpacity onPress={publicar} style={st.save}><Text style={{ color: '#fff', fontWeight: '800' }}>Publicar</Text></TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
              {[['produto', 'Produto (ex.: Picanha resfriada)'], ['descricao', 'Detalhes (marca, validade, condições)'], ['preco', 'Preço (R$)'], ['unidade', 'Unidade (kg, caixa, fardo, un)'], ['minimo', 'Pedido mínimo'], ['raioKm', 'Atende até quantos km'], ['validadeDias', 'Oferta válida por quantos dias']].map(([k, ph]) => (
                <TextInput key={k} value={String(form[k])} onChangeText={(v) => setForm((x) => ({ ...x, [k]: v }))} placeholder={ph} placeholderTextColor={colors.muted} keyboardType={['preco', 'minimo', 'raioKm', 'validadeDias'].includes(k) ? 'decimal-pad' : undefined} style={st.input} />
              ))}
              <Text style={st.sec}>Para quem</Text>
              <View style={st.wrap}>{SEGS.map((s) => <Chip key={s.key} on={form.segmentos.includes(s.key)} label={s.label} onPress={() => setForm((x) => ({ ...x, segmentos: x.segmentos.includes(s.key) ? x.segmentos.filter((y) => y !== s.key) : [...x.segmentos, s.key] }))} />)}</View>
              <Text style={st.sec}>Entrega</Text>
              <View style={st.wrap}>{[['fornecedor', 'Eu entrego'], ['retirada', 'Retirar aqui'], ['central', 'Pela central de entregas']].map(([k, l]) => <Chip key={k} on={form.entrega === k} label={l} onPress={() => setForm((x) => ({ ...x, entrega: k }))} />)}</View>
            </ScrollView>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const st = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, ...soft },
  title: { color: colors.text, fontWeight: '800', fontSize: 15 },
  muted: { color: colors.muted, fontSize: 12.5 },
  sec: { color: colors.text, fontWeight: '800', fontSize: 14, marginTop: 6, marginBottom: 6 },
  badge: { color: colors.primary, fontWeight: '800', fontSize: 11.5 },
  btn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center', marginTop: 8 },
  btnLight: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.primary },
  btnTxt: { color: '#fff', fontWeight: '800' },
  input: { backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#EFE6CC', padding: 10, color: colors.text, marginTop: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  chip: { borderWidth: 1, borderColor: colors.primary, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6, marginRight: 6, marginTop: 6 },
  chipOn: { backgroundColor: colors.primary },
  chipTxt: { color: colors.text, fontSize: 12, fontWeight: '700' },
  head: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#EFE6CC' },
  save: { backgroundColor: colors.primary, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
});
