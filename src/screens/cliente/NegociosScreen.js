// Aba Negócios (barra de baixo, no lugar do Date): imóveis, veículos e máquinas.
// Comprar ou alugar, com anunciantes verificados. Usa os mesmos anúncios de src/homeData.js
// (os tipos de negócio); hotéis, festas e cursos continuam na página de Anúncios.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { colors, soft } from '../../theme';
import { Screen, Photo } from '../../components/ui';
import { SegTabs } from '../../components/AdKit';
import { listings, LISTING_KINDS, LISTING_CTA } from '../../homeData';
import { ChatModal, VideoCallModal } from './home/Social';

// Setores da aba e os tipos de anúncio de cada um ([tipo, nome curto]).
export const NEGOCIOS_GROUPS = [
  { key: 'imoveis', label: 'Imóveis', icon: 'home-outline', kinds: [['imovel-venda', 'Comprar'], ['imovel-aluguel', 'Alugar']] },
  { key: 'veiculos', label: 'Veículos', icon: 'car-sport-outline', kinds: [['veiculo-venda', 'Comprar'], ['carro-aluguel', 'Alugar']] },
  { key: 'maquinas', label: 'Máquinas', icon: 'construct-outline', kinds: [['maquina-aluguel', 'Alugar']] },
];
// Tipos de anúncio que pertencem à aba Negócios (o App usa para mandar os atalhos para cá).
export const NEGOCIOS_KINDS = NEGOCIOS_GROUPS.flatMap((g) => g.kinds.map((k) => k[0]));
const groupOfKind = (kind) => NEGOCIOS_GROUPS.find((g) => g.kinds.some((k) => k[0] === kind));
const kindLabel = (kind) => (LISTING_KINDS.find((k) => k.key === kind) || { label: '' }).label;

export default function NegociosScreen({ explore }) {
  const { state, dispatch } = useStore();
  const [group, setGroup] = useState('imoveis');
  const [kind, setKind] = useState('todos'); // 'todos' ou um tipo do setor
  const [chatWith, setChatWith] = useState(null);
  const [videoWith, setVideoWith] = useState(null);

  // Veio do menu ⋮, da busca ou da Lotus (ex.: "imóveis para alugar").
  useEffect(() => {
    if (!explore || explore.tab !== 'negocios') return;
    const g = explore.kind ? groupOfKind(explore.kind) : NEGOCIOS_GROUPS.find((x) => x.key === explore.group);
    if (!g) return;
    setGroup(g.key);
    setKind(explore.kind && g.kinds.some((k) => k[0] === explore.kind) ? explore.kind : 'todos');
  }, [explore]);

  const g = NEGOCIOS_GROUPS.find((x) => x.key === group) || NEGOCIOS_GROUPS[0];
  const kinds = g.kinds.map((k) => k[0]);
  const list = listings
    .filter((l) => (kind === 'todos' ? kinds.includes(l.kind) : l.kind === kind))
    .sort((a, b) => (b.sponsored ? 1 : 0) - (a.sponsored ? 1 : 0));
  const cta = (l) => l.cta || LISTING_CTA[l.kind] || 'Reservar';

  // Conversa com o anunciante (fica em Comunidade › Mensagens).
  const convs = state.conversations;
  const setConvs = (fn) => dispatch({ type: 'UPDATE_CONVS', fn });
  const contact = (l) => {
    const c = { id: 'adv-' + l.who, name: l.who, status: 'anunciante verificado', photo: `https://picsum.photos/seed/${encodeURIComponent(l.who)}/200/200` };
    if (!convs.find((x) => x.contactId === c.id)) setConvs((cs) => [{ id: 'm' + Date.now(), contactId: c.id, unread: 0, messages: [], extra: c }, ...cs]);
    setChatWith(c);
  };
  const chatConv = chatWith ? convs.find((c) => c.contactId === chatWith.id) : null;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <Screen>
        <SegTabs
          items={NEGOCIOS_GROUPS}
          value={group}
          onChange={(k) => {
            setGroup(k);
            setKind('todos');
          }}
        />

        {/* Comprar ou alugar (só aparece quando o setor tem as duas opções) */}
        {g.kinds.length > 1 ? (
          <View style={st.pills}>
            {[['todos', 'Todos'], ...g.kinds].map(([k, label]) => {
              const on = k === kind;
              return (
                <TouchableOpacity key={k} style={[st.pill, on && st.pillOn]} onPress={() => setKind(k)} activeOpacity={0.85} accessibilityLabel={label}>
                  <Text style={[st.pillText, on && { color: colors.onPrimary }]}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ) : null}

        <TouchableOpacity
          style={st.announce}
          activeOpacity={0.85}
          onPress={() => Alert.alert('Anunciar no Re@lys', 'Imóveis, veículos e máquinas, para vender ou alugar. Pessoas verificadas por biometria veem o seu anúncio.')}
        >
          <Ionicons name="add-circle-outline" size={20} color={colors.primary} />
          <Text style={st.announceText}>Criar anúncio</Text>
        </TouchableOpacity>

        {list.map((l) => (
          <View key={l.id} style={st.ad}>
            <View>
              <Photo uri={l.photo} style={st.adPhoto} fallback={group === 'imoveis' ? '🏠' : group === 'veiculos' ? '🚗' : '🚜'} />
              <View style={st.adKind}>
                <Text style={st.adKindText}>{kindLabel(l.kind)}</Text>
              </View>
              {l.sponsored ? (
                <View style={st.adSponsored}>
                  <Text style={st.adSponsoredText}>PATROCINADO</Text>
                </View>
              ) : null}
            </View>
            <View style={{ padding: 12 }}>
              <Text style={st.adPrice}>{l.price}</Text>
              <Text style={st.adTitle}>{l.title}</Text>
              <Text style={st.adDetail}>{l.detail}</Text>
              <View style={st.line}>
                <Ionicons name="location-outline" size={13} color={colors.muted} />
                <Text style={st.adPlace}>{l.place}</Text>
              </View>
              <View style={st.line}>
                <Ionicons name="shield-checkmark" size={13} color={colors.primary} />
                <Text style={st.adWho}>{l.who}</Text>
              </View>
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <TouchableOpacity style={[st.adBtn, st.adBtnMain]} onPress={() => contact(l)}>
                  <Text style={st.adBtnMainText}>Tenho interesse</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[st.adBtn, { marginRight: 0 }]} onPress={() => Alert.alert(cta(l), `Pedido enviado para ${l.who}. A confirmação chega nas suas mensagens.`)}>
                  <Text style={st.adBtnText}>{cta(l)}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ))}
        {!list.length ? <Text style={st.empty}>Nenhum anúncio aqui ainda.</Text> : null}
      </Screen>

      <ChatModal
        contact={chatWith}
        visible={!!chatWith}
        messages={chatConv ? chatConv.messages : []}
        onClose={() => setChatWith(null)}
        onSend={(msg) => setConvs((cs) => cs.map((c) => (c.contactId === chatWith.id ? { ...c, messages: [...c.messages, msg] } : c)))}
        onVideo={() => setVideoWith(chatWith)}
      />
      <VideoCallModal contact={videoWith} visible={!!videoWith} onClose={() => setVideoWith(null)} />
    </View>
  );
}

const st = StyleSheet.create({
  pills: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 6 },
  pill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, marginRight: 8, marginBottom: 8 },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  announce: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', minHeight: 46, paddingHorizontal: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.primary, borderStyle: 'dashed', marginBottom: 14 },
  announceText: { color: colors.primary, fontWeight: '700', marginLeft: 8 },
  ad: { backgroundColor: colors.card, borderRadius: 20, overflow: 'hidden', marginBottom: 16, ...soft },
  adPhoto: { width: '100%', height: 170 },
  adKind: { position: 'absolute', left: 10, top: 10, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  adKindText: { color: colors.text, fontSize: 11, fontWeight: '700' },
  adSponsored: { position: 'absolute', right: 10, top: 10, backgroundColor: colors.sponsored, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  adSponsoredText: { color: colors.onPrimary, fontSize: 10, fontWeight: '700' },
  adPrice: { color: colors.accent, fontSize: 20, fontWeight: '800' },
  adTitle: { color: colors.text, fontWeight: '700', fontSize: 15, marginTop: 2 },
  adDetail: { color: colors.muted, fontSize: 12, marginTop: 2 },
  line: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  adPlace: { color: colors.muted, fontSize: 12, marginLeft: 5 },
  adWho: { color: colors.text, fontSize: 12, marginLeft: 5 },
  adBtn: { flex: 1, minHeight: 38, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 11, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  adBtnMain: { backgroundColor: colors.primary, borderColor: colors.primary },
  adBtnMainText: { color: colors.onPrimary, fontWeight: '700', textAlign: 'center' },
  adBtnText: { color: colors.text, fontWeight: '600', textAlign: 'center' },
  empty: { color: colors.muted, textAlign: 'center', marginVertical: 24 },
});
