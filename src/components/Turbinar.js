// Turbinar (impulsionar) um Reel, story ou post: aparece para mais gente, para ganhar seguidores ou
// cliques no produto. Mesma base do Instagram/Facebook: R$ 12 a cada 1.000 visualizações ou cerca de
// R$ 0,60 por clique, mínimo R$ 5 por dia. Paga com o saldo da carteira; só é cobrado o que foi
// entregue e o resto volta. Precisa da biometria (é pagamento).
import React, { useEffect, useState } from 'react';
import { View, Modal, Pressable, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { api } from '../api';
import { colors, brl } from '../theme';
import { carregarCarteira } from '../serverShop';

const PADRAO = { cpm: 12, cpc: 0.6, minDia: 5, pacotes: [5, 20, 50], dias: [1, 3, 7] };
const OBJ = [
  ['seguidores', 'Ganhar seguidores', 'people-outline', 'Mostra para quem ainda não te segue'],
  ['cliques', 'Cliques no produto', 'pricetag-outline', 'Leva a pessoa até o produto marcado'],
];
const STATUS = { ativo: 'No ar', fim: 'Terminado', parado: 'Parado' };

function Chip({ on, label, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ paddingVertical: 8, paddingHorizontal: 14, borderRadius: 18, marginRight: 8, marginTop: 6, backgroundColor: on ? colors.primary : colors.card, borderWidth: 1, borderColor: on ? colors.primary : colors.border }}>
      <Text style={{ color: on ? colors.onPrimary : colors.text, fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function TurbinarSheet({ visible, onClose, alvo, alvoTipo = 'reel', titulo, temProduto }) {
  const { state, dispatch } = useStore();
  const [v, setV] = useState(PADRAO);
  const [objetivo, setObjetivo] = useState('seguidores');
  const [porDia, setPorDia] = useState(5);
  const [dias, setDias] = useState(3);
  const [meus, setMeus] = useState([]);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setObjetivo(temProduto ? 'cliques' : 'seguidores');
    api('GET', '/turbinar/valores').then((x) => x && setV({ ...PADRAO, ...x })).catch(() => {});
    api('GET', '/turbinar').then((l) => setMeus(Array.isArray(l) ? l : [])).catch(() => setMeus([]));
  }, [visible]);

  const total = porDia * dias;
  const views = Math.floor((total / v.cpm) * 1000);
  const est = objetivo === 'cliques' ? `cerca de ${Math.floor(total / v.cpc)} cliques no produto` : `cerca de ${views.toLocaleString('pt-BR')} visualizações (em média ${Math.floor(views * 0.005)} a ${Math.floor(views * 0.02)} seguidores novos)`;
  const desteAlvo = meus.find((b) => b.alvo === String(alvo) && b.status === 'ativo');

  const pagar = async () => {
    if (state.user && state.user.verified === false) {
      onClose && onClose();
      return dispatch({ type: 'BIO_GATE' }); // turbinar é pagamento: precisa da biometria
    }
    setEnviando(true);
    try {
      await api('POST', '/turbinar', { alvo: String(alvo), alvoTipo, objetivo, porDia, dias });
      carregarCarteira(dispatch).catch(() => {});
      Alert.alert('Turbinado 🚀', `Seu ${alvoTipo === 'reel' ? 'Reel' : alvoTipo} vai aparecer para mais gente por ${dias} dia${dias > 1 ? 's' : ''}. Só é cobrado o que for entregue; o que sobrar volta para a carteira.`);
      onClose && onClose();
    } catch (e) {
      if (e.code === 'biometria' || /biometria/i.test(e.message || '')) { onClose && onClose(); return dispatch({ type: 'BIO_GATE' }); }
      Alert.alert('Não foi possível turbinar', e.message || 'Tente de novo.');
    } finally {
      setEnviando(false);
    }
  };
  const parar = async (b) => {
    try {
      const r = await api('POST', `/turbinar/${b.id}/parar`);
      setMeus((l) => l.map((x) => (x.id === b.id ? r : x)));
      carregarCarteira(dispatch).catch(() => {});
      Alert.alert('Turbinar parado', `Voltaram ${brl(r.devolvido)} para a sua carteira.`);
    } catch (e) {
      Alert.alert('Não foi possível parar', e.message);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }} onPress={onClose}>
        <Pressable onPress={() => {}} style={{ backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, maxHeight: '88%' }}>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 28 }}>
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 18 }}>🚀 Turbinar {titulo ? `“${titulo}”` : ''}</Text>
            <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>R$ {String(v.cpm).replace('.', ',')} a cada 1.000 visualizações · mínimo {brl(v.minDia)} por dia</Text>

            {desteAlvo ? (
              <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 12, marginTop: 12, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>Já está turbinado</Text>
                <Text style={{ color: colors.muted, fontSize: 12, marginTop: 2 }}>{desteAlvo.views} visualizações · {desteAlvo.cliques} cliques · {desteAlvo.seguidores} seguidores · usado {brl(desteAlvo.gasto)} de {brl(desteAlvo.total)}</Text>
                <TouchableOpacity onPress={() => parar(desteAlvo)} style={{ marginTop: 8 }}><Text style={{ color: colors.danger, fontWeight: '700' }}>Parar e devolver o que sobrou</Text></TouchableOpacity>
              </View>
            ) : (
              <>
                <Text style={{ color: colors.text, fontWeight: '700', marginTop: 14 }}>Objetivo</Text>
                {OBJ.filter(([k]) => k !== 'cliques' || temProduto).map(([k, t, icon, sub]) => (
                  <TouchableOpacity key={k} onPress={() => setObjetivo(k)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 14, marginTop: 6, backgroundColor: colors.card, borderWidth: 1.5, borderColor: objetivo === k ? colors.primary : colors.border }}>
                    <Ionicons name={icon} size={20} color={colors.primary} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ color: colors.text, fontWeight: '700' }}>{t}</Text>
                      <Text style={{ color: colors.muted, fontSize: 12 }}>{sub}</Text>
                    </View>
                    {objetivo === k ? <Ionicons name="checkmark-circle" size={20} color={colors.primary} /> : null}
                  </TouchableOpacity>
                ))}
                {!temProduto ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6 }}>Para turbinar cliques, marque um produto no Reel.</Text> : null}

                <Text style={{ color: colors.text, fontWeight: '700', marginTop: 14 }}>Quanto por dia</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {(v.pacotes || PADRAO.pacotes).map((p) => <Chip key={p} on={porDia === p} label={brl(p)} onPress={() => setPorDia(p)} />)}
                </View>
                <Text style={{ color: colors.text, fontWeight: '700', marginTop: 14 }}>Por quantos dias</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                  {(v.dias || PADRAO.dias).map((d) => <Chip key={d} on={dias === d} label={`${d} dia${d > 1 ? 's' : ''}`} onPress={() => setDias(d)} />)}
                </View>

                <View style={{ backgroundColor: colors.primaryLight, borderRadius: 14, padding: 12, marginTop: 14 }}>
                  <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }}>Total: {brl(total)}</Text>
                  <Text style={{ color: colors.text, fontSize: 12, marginTop: 2 }}>Estimativa: {est}.</Text>
                  <Text style={{ color: colors.muted, fontSize: 11, marginTop: 4 }}>Sai do saldo da carteira. Só é cobrado o que for entregue; o que sobrar volta. Pode parar quando quiser.</Text>
                </View>
                <TouchableOpacity disabled={enviando} onPress={pagar} style={{ backgroundColor: colors.accent, borderRadius: 16, paddingVertical: 14, alignItems: 'center', marginTop: 14 }}>
                  {enviando ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Turbinar por {brl(total)}</Text>}
                </TouchableOpacity>
                {state.user && state.user.verified === false ? <Text style={{ color: colors.muted, fontSize: 11, marginTop: 6, textAlign: 'center' }}>Turbinar é pagamento: pede a biometria antes.</Text> : null}
              </>
            )}

            {meus.filter((b) => b.alvo !== String(alvo)).length ? (
              <>
                <Text style={{ color: colors.text, fontWeight: '700', marginTop: 18 }}>Seus turbinados</Text>
                {meus.filter((b) => b.alvo !== String(alvo)).slice(0, 8).map((b) => (
                  <View key={b.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.border }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }}>{b.alvoTipo === 'reel' ? 'Reel' : b.alvoTipo} · {STATUS[b.status] || b.status}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }}>{b.views} visualizações · {b.cliques} cliques · {b.seguidores} seguidores · usado {brl(b.gasto)} de {brl(b.total)}</Text>
                  </View>
                ))}
              </>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
