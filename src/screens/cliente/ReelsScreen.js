// Reels (abre arrastando a página inicial para a direita ou pela Lotus): todos os Reels do
// Realyz num lugar só, estilo Instagram. Os Reels publicados pelo usuário aparecem primeiro. "Para você" mistura lojas e comida; "Shop" e "Food" filtram.
import StoryFrame from '../../components/StoryFrame';
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ReelComposer } from '../StoriesScreen';
import { members } from '../../people';
import { Photo } from '../../components/ui';
import { Text } from '../../responsive';
import { ReelsFeed } from '../../components/Reels';
import { SHOP_CLIPS, FOOD_CLIPS, MERCADO_CLIPS, SERVICE_CLIPS, NEGOCIO_CLIPS, COMMUNITY_CLIPS } from '../../adsData';
import { useStore } from '../../store';
import { useServerReels, publicarReel } from '../../serverReels';

const TABS = [
  { key: 'todos', label: 'Para você' },
  { key: 'shop', label: 'Shop' },
  { key: 'food', label: 'Food' },
  { key: 'servicos', label: 'Serviços' },
  { key: 'negocios', label: 'Negócios' },
];

// Intercala as listas (1 de cada), para o "Para você" não ficar só de um tipo.
function mix(...lists) {
  const out = [];
  const max = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) lists.forEach((l) => l[i] && out.push(l[i]));
  return out;
}

// Em cima (como no Instagram): + para publicar, Reels | Amigos e o filtro (Shop, Food, Serviços, Negócios).
export default function ReelsScreen() {
  const [tab, setTab] = useState('todos');
  const [amigos, setAmigos] = useState(false);
  const [filtro, setFiltro] = useState(false);
  const [postando, setPostando] = useState(false);
  const insets = useSafeAreaInsets();
  const shop = useMemo(() => SHOP_CLIPS.map((c) => ({ ...c, kind: 'shop' })), []);
  const food = useMemo(() => [...FOOD_CLIPS, ...MERCADO_CLIPS].map((c) => ({ ...c, kind: 'food' })), []);
  const { state, dispatch } = useStore();
  const mine = state.myReels || [];
  // Reels do servidor (empresas e pessoas de verdade) entram na frente dos de exemplo.
  const srv = useServerReels(null).filter((r) => !mine.some((m) => m.serverId === r.serverId));
  const de = (...k) => srv.filter((r) => k.includes(r.area));
  // Amigos: Reels de quem é seu amigo (e os seus).
  const ehAmigo = (r) => r.userId && (state.friends || {})[r.userId] === 'amigo';
  const deAmigos = [...mine, ...srv.filter(ehAmigo), ...COMMUNITY_CLIPS.filter(ehAmigo)];
  const rostos = members.filter((m) => (state.friends || {})[m.id] === 'amigo').slice(0, 3);
  const reels = amigos ? deAmigos : tab === 'shop' ? [...de('shop'), ...shop] : tab === 'food' ? [...de('food', 'mercado'), ...food] : tab === 'servicos' ? [...de('servicos'), ...SERVICE_CLIPS] : tab === 'negocios' ? [...de('negocios'), ...NEGOCIO_CLIPS] : [...mine, ...srv, ...mix(shop, COMMUNITY_CLIPS, food, SERVICE_CLIPS, NEGOCIO_CLIPS)];
  return (
    // No computador, os Reels ficam numa moldura em pé (9:16) no meio da coluna.
    <StoryFrame>
    <View style={{ flex: 1, backgroundColor: '#000' }}>
      {/* key: trocar o filtro recomeça do primeiro Reel */}
      <ReelsFeed key={(amigos ? 'amigos' : tab) + (tab === 'todos' ? mine.length : '')} reels={reels} />
      <View style={[styles.topo, { top: insets.top + 6 }]} pointerEvents="box-none">
        <TouchableOpacity onPress={() => setPostando(true)} style={styles.mais} accessibilityLabel="Publicar um Reel">
          <Ionicons name="add" size={30} color="#fff" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setAmigos(false)} accessibilityLabel="Reels">
            <Text style={[styles.aba, !amigos && styles.abaOn]}>{tab === 'todos' ? 'Reels' : (TABS.find((t) => t.key === tab) || {}).label}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setAmigos(true)} style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 18 }} accessibilityLabel="Reels dos amigos">
            <Text style={[styles.aba, amigos && styles.abaOn]}>Amigos</Text>
            {rostos.map((m, i) => (
              <Photo key={m.id} uri={m.photo} style={[styles.rosto, { marginLeft: i ? -8 : 6 }]} fallback="🙂" />
            ))}
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={() => setFiltro(true)} style={styles.mais} accessibilityLabel="Filtrar Reels">
          <Ionicons name="options-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {amigos && !deAmigos.length ? (
        <View style={styles.vazio} pointerEvents="none">
          <Text style={{ color: '#fff', textAlign: 'center' }}>Os Reels dos seus amigos aparecem aqui.</Text>
        </View>
      ) : null}
      <Modal visible={filtro} transparent animationType="fade" onRequestClose={() => setFiltro(false)}>
        <TouchableOpacity style={styles.filtroFundo} activeOpacity={1} onPress={() => setFiltro(false)}>
          <View style={styles.filtroBox}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.key} onPress={() => (setTab(t.key), setAmigos(false), setFiltro(false))} style={styles.filtroItem} accessibilityLabel={t.label}>
                <Text style={[styles.filtroText, tab === t.key && { color: '#F5C331', fontWeight: '800' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
      <ReelComposer
        visible={postando}
        onClose={() => setPostando(false)}
        escolherArea={(state.user && (state.user.roles || []).includes('empresa')) || false}
        onPublish={(reel, destaque, area) => {
          setPostando(false);
          const user = (state.user && state.user.name) || 'Você';
          dispatch({ type: 'PUBLISH_REEL', reel: { ...reel, user } });
          publicarReel(reel, area).then((r) => r && r.serverId && dispatch({ type: 'REEL_SYNC', id: reel.id, reel: { ...r, user } })).catch((e) => Alert.alert('Reel', `Ficou só neste celular: ${e.message}`));
        }}
      />
    </View>
    </StoryFrame>
  );
}

const styles = StyleSheet.create({
  topo: { position: 'absolute', left: 8, right: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  mais: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  aba: { color: 'rgba(255,255,255,0.65)', fontWeight: '800', fontSize: 20, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  abaOn: { color: '#fff' },
  rosto: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: '#000' },
  vazio: { position: 'absolute', top: '45%', left: 30, right: 30 },
  filtroFundo: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
  filtroBox: { backgroundColor: '#14120E', borderRadius: 16, paddingVertical: 8, width: 220, borderWidth: 1, borderColor: '#F5C331' },
  filtroItem: { paddingVertical: 12, paddingHorizontal: 18 },
  filtroText: { color: '#fff', fontSize: 16 },
  top: { position: 'absolute', top: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center' },
  tab: { paddingHorizontal: 8, alignItems: 'center' },
  tabText: { color: 'rgba(255,255,255,0.7)', fontWeight: '700', fontSize: 13.5, textShadowColor: 'rgba(0,0,0,0.4)', textShadowRadius: 4 },
  tabOn: { color: '#fff', fontWeight: '800' },
  dot: { width: 18, height: 2, borderRadius: 1, backgroundColor: '#fff', marginTop: 4 },
});
