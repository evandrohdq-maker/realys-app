// Mural do perfil: a "linha do tempo" do usuário, montada por ele mesmo.
// Juntos, num feed com rolagem própria (o mais novo em cima):
//  - depoimentos que ele aceitou (entram sozinhos);
//  - recados que ele escreve no próprio mural (com cor e tamanho);
//  - posts da Community que ele curtiu e fixou ("Fixar no mural");
//  - fotos da galeria dele.
// Montagem: tema de fundo futurista, fixar no topo, destaque (cartão grande), cor do recado e tirar.
// Feed leve: carrega aos poucos ao arrastar para baixo, solta da memória o que já passou
// e puxar para baixo no topo atualiza (traz o que é novo para cima).
import React, { useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Modal, ScrollView, RefreshControl, Alert } from 'react-native';
import { Text, TextInput } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store';
import { colors } from '../theme';
import { Photo, Empty } from './ui';
import ThemeArt, { FUTURE_THEMES, futureTheme } from './ThemeArt';
import { memberById } from '../people';
import { galleryOf } from '../testimonialsData';

const PAGE = 6; // cartões por vez: o resto chega ao arrastar
const NOTE_COLORS = ['#FFF3C4', '#DDF4FF', '#FFE1EC', '#E3FBE6', '#EDE4FF', '#FFFFFF'];
const first = (n) => String(n || '').split(' ')[0];

// Mural de exemplo dos outros membros (demonstração, até o servidor guardar o de cada um).
const SAMPLE_NOTES = [
  'Gratidão por mais um dia. Deus no comando! 🙏',
  'Semana de muito trabalho e conquistas. Bora!',
  'Quem aí vai no evento de sábado? 🎶',
  'Família é tudo. ❤️',
];
function sampleMural(ownerId) {
  const n = Number(String(ownerId).replace(/\D/g, '')) || 1;
  const g = galleryOf(ownerId).photos;
  return {
    theme: FUTURE_THEMES[n % FUTURE_THEMES.length].key,
    items: [
      { id: `${ownerId}-m1`, type: 'recado', text: SAMPLE_NOTES[n % SAMPLE_NOTES.length], color: NOTE_COLORS[n % NOTE_COLORS.length], at: Date.now() - 3600e3, time: 'há 1 h', pinned: true },
      { id: `${ownerId}-m2`, type: 'foto', uri: g[0] && g[0].uri, text: 'Momento bom', at: Date.now() - 86400e3, time: 'ontem', big: true },
      { id: `${ownerId}-m3`, type: 'recado', text: SAMPLE_NOTES[(n + 1) % SAMPLE_NOTES.length], color: NOTE_COLORS[(n + 2) % NOTE_COLORS.length], at: Date.now() - 3 * 86400e3, time: 'há 3 dias' },
    ],
  };
}

// Tudo o que aparece no mural, já na ordem: fixados primeiro, depois do mais novo para o mais velho.
export function useMuralItems(ownerId) {
  const { state } = useStore();
  const own = ownerId === 'me';
  const base = own ? state.mural || { theme: 'aurora', items: [] } : sampleMural(ownerId);
  const deps = state.testimonials
    .filter((t) => t.to === ownerId && t.status === 'aprovado')
    .map((t, i) => ({ id: 'dep-' + t.id, type: 'dep', dep: t, at: t.at || Date.now() - (i + 1) * 5 * 3600e3, time: t.time }));
  const items = [...base.items, ...deps].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || (b.at || 0) - (a.at || 0));
  return { theme: base.theme, items };
}

export function MuralTab({ ownerId, ownerName, mine }) {
  const { state, dispatch } = useStore();
  const { theme, items } = useMuralItems(ownerId);
  const th = futureTheme(theme) || FUTURE_THEMES[1];
  const [shown, setShown] = useState(PAGE);
  const [refreshing, setRefreshing] = useState(false);
  const [writing, setWriting] = useState(false);
  const [picking, setPicking] = useState(null); // 'post' | 'foto' | 'tema'
  const [editing, setEditing] = useState(null); // cartão com o menu de montagem aberto
  const list = items.slice(0, shown);

  const refresh = () => {
    setRefreshing(true);
    setShown(PAGE); // volta ao topo com o que é mais novo
    setTimeout(() => setRefreshing(false), 500);
  };
  const add = (item) => dispatch({ type: 'MURAL_ADD', item: { id: 'm' + Date.now(), at: Date.now(), time: 'agora', ...item } });

  return (
    <View>
      {mine ? (
        <View style={st.tools}>
          {[
            ['create-outline', 'Recado', () => setWriting(true)],
            ['heart-outline', 'Post', () => setPicking('post')],
            ['image-outline', 'Foto', () => setPicking('foto')],
            ['color-palette-outline', 'Tema', () => setPicking('tema')],
          ].map(([icon, label, fn]) => (
            <TouchableOpacity key={label} style={st.tool} onPress={fn} activeOpacity={0.85} accessibilityLabel={`Mural: ${label}`}>
              <Ionicons name={icon} size={18} color={colors.primary} />
              <Text numberOfLines={1} style={st.toolTxt}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      {/* O muralzinho: fundo do tema e rolagem própria */}
      <View style={[st.wall, { backgroundColor: th.to }]}>
        <ThemeArt theme={th.key} />
        <FlatList
          data={list}
          keyExtractor={(it) => it.id}
          nestedScrollEnabled
          removeClippedSubviews
          initialNumToRender={PAGE}
          maxToRenderPerBatch={PAGE}
          windowSize={5}
          showsVerticalScrollIndicator
          contentContainerStyle={{ padding: 12, paddingBottom: 20 }}
          onEndReachedThreshold={0.4}
          onEndReached={() => shown < items.length && setShown((n) => n + PAGE)}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={th.accent} colors={[th.accent]} />}
          ListHeaderComponent={
            <Text style={[st.wallTitle, { color: th.text }]}>Mural de {mine ? 'você' : first(ownerName)}</Text>
          }
          ListEmptyComponent={
            <Text style={{ color: th.muted, textAlign: 'center', marginTop: 30, lineHeight: 19 }}>
              {mine ? 'Seu mural está vazio. Deixe um recado, fixe um post que você curtiu ou uma foto.' : 'Nada no mural ainda.'}
            </Text>
          }
          ListFooterComponent={shown < items.length ? <Text style={{ color: th.muted, textAlign: 'center', fontSize: 12 }}>Arraste para ver mais</Text> : null}
          renderItem={({ item }) => <MuralCard it={item} th={th} mine={mine} onEdit={() => setEditing(item)} />}
        />
      </View>

      {mine ? (
        <>
          <NoteComposer visible={writing} onClose={() => setWriting(false)} onSave={(text, color) => add({ type: 'recado', text, color })} />
          <Picker kind={picking} onClose={() => setPicking(null)} onPick={(item) => add(item)} current={theme} />
          <EditSheet it={editing} onClose={() => setEditing(null)} />
        </>
      ) : null}
    </View>
  );
}

// Mural na prévia do perfil (quem ainda não é amigo): os primeiros cartões do mural da pessoa,
// no tema dela, sem rolagem própria. Serve para quem está pensando em adicionar ver como ela é.
export function MuralPeek({ ownerId, ownerName, limit = 3, onMore }) {
  const { theme, items } = useMuralItems(ownerId);
  const th = futureTheme(theme) || FUTURE_THEMES[1];
  return (
    <View style={[st.peekWall, { backgroundColor: th.to }]}>
      <ThemeArt theme={th.key} />
      <View style={{ padding: 12 }}>
        <Text style={[st.wallTitle, { color: th.text }]}>Mural de {first(ownerName)}</Text>
        {items.length ? (
          items.slice(0, limit).map((it) => <MuralCard key={it.id} it={it} th={th} mine={false} />)
        ) : (
          <Text style={{ color: th.muted, textAlign: 'center', marginVertical: 14 }}>Nada no mural ainda.</Text>
        )}
        {onMore && items.length > limit ? (
          <TouchableOpacity onPress={onMore} activeOpacity={0.85} style={st.peekMore} accessibilityLabel={`Ver o mural inteiro de ${ownerName}`}>
            <Text numberOfLines={1} style={{ color: th.accent, fontWeight: '800' }}>Ver mural inteiro</Text>
            <Ionicons name="chevron-forward" size={15} color={th.accent} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

function MuralCard({ it, th, mine, onEdit }) {
  const { dispatch } = useStore();
  const canEdit = mine && it.type !== 'dep';
  const head = it.type === 'dep' ? 'Depoimento' : it.type === 'post' ? 'Post curtido' : it.type === 'foto' ? 'Foto' : 'Recado';
  const icon = it.type === 'dep' ? 'chatbox-ellipses' : it.type === 'post' ? 'heart' : it.type === 'foto' ? 'image' : 'create';
  const note = it.type === 'recado';
  const bg = note ? it.color || NOTE_COLORS[0] : th.card;
  const ink = note ? '#1B1B1F' : th.text;
  const sub = note ? '#5A5A62' : th.muted;
  const from = it.type === 'dep' ? memberById(it.dep.from) : null;
  return (
    <TouchableOpacity activeOpacity={0.9} onLongPress={canEdit ? onEdit : undefined} delayLongPress={350} style={[st.card, { backgroundColor: bg, borderColor: th.line }, it.big && st.cardBig]}>
      <View style={st.cardHead}>
        <Ionicons name={icon} size={13} color={note ? '#B8860B' : th.accent} />
        <Text style={[st.cardKind, { color: sub }]} numberOfLines={1}>
          {head}
          {it.pinned ? ' · fixado' : ''} · {it.time}
        </Text>
        {canEdit ? (
          <TouchableOpacity onPress={onEdit} hitSlop={8} style={{ padding: 2 }} accessibilityLabel="Montar este cartão">
            <Ionicons name="ellipsis-vertical" size={15} color={sub} />
          </TouchableOpacity>
        ) : null}
      </View>
      {it.type === 'dep' ? (
        <TouchableOpacity onPress={() => from && dispatch({ type: 'OPEN_PROFILE', id: from.id })} activeOpacity={0.8}>
          <Text style={[st.cardText, { color: ink, fontStyle: 'italic' }]}>“{it.dep.text}”</Text>
          <Text style={[st.by, { color: sub }]}>— {from ? from.name : 'Amigo'}</Text>
        </TouchableOpacity>
      ) : null}
      {it.type === 'post' ? (
        <>
          <Text style={[st.by, { color: sub, marginTop: 0 }]}>{it.author}</Text>
          <Text style={[st.cardText, { color: ink }]} numberOfLines={it.big ? 8 : 4}>{it.text}</Text>
          {it.image ? <Photo uri={it.image} style={[st.img, it.big && { height: 220 }]} /> : null}
        </>
      ) : null}
      {it.type === 'foto' ? (
        <>
          <Photo uri={it.uri} style={[st.img, { marginTop: 4 }, it.big && { height: 260 }]} />
          {it.text ? <Text style={[st.cardText, { color: ink }]}>{it.text}</Text> : null}
        </>
      ) : null}
      {note ? <Text style={[st.cardText, { color: ink }, it.big && { fontSize: 19, fontWeight: '700' }]}>{it.text}</Text> : null}
    </TouchableOpacity>
  );
}

function Sheet({ visible, onClose, title, children }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={st.shade} activeOpacity={1} onPress={onClose} />
      <View style={[st.sheet, { paddingBottom: 16 + insets.bottom }]}>
        <View style={st.sheetHead}>
          <Text style={st.sheetTitle}>{title}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={8} accessibilityLabel="Fechar">
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>
        {children}
      </View>
    </Modal>
  );
}

function NoteComposer({ visible, onClose, onSave }) {
  const [text, setText] = useState('');
  const [color, setColor] = useState(NOTE_COLORS[0]);
  const save = () => {
    const v = text.trim();
    if (!v) return;
    onSave(v, color);
    setText('');
    onClose();
  };
  return (
    <Sheet visible={visible} onClose={onClose} title="Recado no seu mural">
      <TextInput value={text} onChangeText={setText} placeholder="Escreva um recado, uma frase, um momento…" placeholderTextColor={colors.muted} multiline maxLength={280} style={[st.input, { backgroundColor: color }]} />
      <View style={{ flexDirection: 'row', marginTop: 10 }}>
        {NOTE_COLORS.map((c) => (
          <TouchableOpacity key={c} onPress={() => setColor(c)} style={[st.swatch, { backgroundColor: c }, color === c && st.swatchOn]} accessibilityLabel="Cor do recado" />
        ))}
      </View>
      <TouchableOpacity style={[st.btn, !text.trim() && { opacity: 0.5 }]} onPress={save} disabled={!text.trim()}>
        <Text style={st.btnTxt}>Pôr no mural</Text>
      </TouchableOpacity>
    </Sheet>
  );
}

function Picker({ kind, onClose, onPick, current }) {
  const { state, dispatch } = useStore();
  const posts = state.communityPosts || [];
  const photos = (state.myGallery && state.myGallery.photos) || [];
  const pick = (item) => {
    onPick(item);
    onClose();
  };
  return (
    <Sheet visible={!!kind} onClose={onClose} title={kind === 'post' ? 'Fixar um post que você curtiu' : kind === 'foto' ? 'Escolha uma foto da galeria' : 'Tema do mural'}>
      <ScrollView style={{ maxHeight: 420 }}>
        {kind === 'post'
          ? posts.length
            ? posts.map((p) => (
                <TouchableOpacity key={p.id} style={st.pickRow} onPress={() => pick({ type: 'post', postId: p.id, author: p.author, text: p.text, image: p.image })}>
                  {p.image ? <Photo uri={p.image} style={{ width: 52, height: 52, borderRadius: 10 }} /> : <Ionicons name="chatbubble-outline" size={22} color={colors.muted} />}
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={{ color: colors.text, fontWeight: '700' }} numberOfLines={1}>{p.author}</Text>
                    <Text style={{ color: colors.muted, fontSize: 12 }} numberOfLines={2}>{p.text}</Text>
                  </View>
                  <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
                </TouchableOpacity>
              ))
            : <Empty text="Nenhum post na Community ainda." />
          : null}
        {kind === 'foto' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {photos.length ? photos.map((f) => (
              <TouchableOpacity key={f.id} onPress={() => pick({ type: 'foto', uri: f.uri })} style={{ width: '32%', marginBottom: 8 }}>
                <Photo uri={f.uri} style={{ width: '100%', aspectRatio: 1, borderRadius: 10 }} />
              </TouchableOpacity>
            )) : <Empty text="Adicione fotos na sua galeria primeiro." />}
          </View>
        ) : null}
        {kind === 'tema' ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            {FUTURE_THEMES.map((t) => (
              <TouchableOpacity key={t.key} onPress={() => (dispatch({ type: 'MURAL_THEME', theme: t.key }), onClose())} style={[st.themeBox, { backgroundColor: t.to }, current === t.key && { borderColor: colors.gold }]} accessibilityLabel={`Tema ${t.label}`}>
                <ThemeArt theme={t.key} />
                <Text style={{ color: t.text, fontWeight: '800', fontSize: 12 }}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Sheet>
  );
}

// Montagem de um cartão: fixar no topo, destaque, cor (recados) e tirar do mural.
function EditSheet({ it, onClose }) {
  const { dispatch } = useStore();
  if (!it) return null;
  const up = (patch) => (dispatch({ type: 'MURAL_UPDATE', id: it.id, patch }), onClose());
  return (
    <Sheet visible onClose={onClose} title="Montar o mural">
      <TouchableOpacity style={st.opt} onPress={() => up({ pinned: !it.pinned })}>
        <Ionicons name="pin-outline" size={19} color={colors.primary} />
        <Text style={st.optTxt}>{it.pinned ? 'Desafixar do topo' : 'Fixar no topo'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={st.opt} onPress={() => up({ big: !it.big })}>
        <Ionicons name="resize-outline" size={19} color={colors.primary} />
        <Text style={st.optTxt}>{it.big ? 'Tamanho normal' : 'Destacar (cartão grande)'}</Text>
      </TouchableOpacity>
      {it.type === 'recado' ? (
        <View style={[st.opt, { borderBottomWidth: 0 }]}>
          {NOTE_COLORS.map((c) => (
            <TouchableOpacity key={c} onPress={() => up({ color: c })} style={[st.swatch, { backgroundColor: c }, it.color === c && st.swatchOn]} accessibilityLabel="Trocar a cor" />
          ))}
        </View>
      ) : null}
      <TouchableOpacity
        style={st.opt}
        onPress={() =>
          Alert.alert('Tirar do mural?', 'Sai só do seu mural; o post e a foto continuam onde estavam.', [
            { text: 'Manter', style: 'cancel' },
            { text: 'Tirar', style: 'destructive', onPress: () => (dispatch({ type: 'MURAL_REMOVE', id: it.id }), onClose()) },
          ])
        }
      >
        <Ionicons name="trash-outline" size={19} color={colors.danger} />
        <Text style={[st.optTxt, { color: colors.danger }]}>Tirar do mural</Text>
      </TouchableOpacity>
    </Sheet>
  );
}

const st = StyleSheet.create({
  tools: { flexDirection: 'row', marginBottom: 10 },
  tool: { flex: 1, alignItems: 'center', paddingVertical: 6 },
  toolTxt: { color: colors.text, fontSize: 12, fontWeight: '700', marginTop: 3 },
  wall: { height: 520, borderRadius: 20, overflow: 'hidden' },
  peekWall: { borderRadius: 18, overflow: 'hidden' },
  peekMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 6 },
  wallTitle: { fontWeight: '900', fontSize: 16, marginBottom: 10, letterSpacing: 0.3 },
  card: { borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1 },
  cardBig: { padding: 16 },
  cardHead: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  cardKind: { flex: 1, fontSize: 11, fontWeight: '700', marginLeft: 5 },
  cardText: { fontSize: 14.5, lineHeight: 20 },
  by: { fontSize: 12, fontWeight: '700', marginTop: 6 },
  img: { width: '100%', height: 160, borderRadius: 12, marginTop: 8 },
  shade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: { backgroundColor: colors.bg, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 16 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sheetTitle: { color: colors.text, fontWeight: '800', fontSize: 16, flex: 1 },
  input: { minHeight: 110, borderRadius: 14, padding: 12, color: '#1B1B1F', textAlignVertical: 'top', fontSize: 15 },
  swatch: { width: 30, height: 30, borderRadius: 15, marginRight: 10, borderWidth: 1, borderColor: 'rgba(0,0,0,0.12)' },
  swatchOn: { borderWidth: 3, borderColor: colors.gold },
  btn: { marginTop: 14, minHeight: 48, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { color: colors.onPrimary, fontWeight: '800' },
  pickRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  themeBox: { width: '48%', height: 70, borderRadius: 14, overflow: 'hidden', marginBottom: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  opt: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)' },
  optTxt: { color: colors.text, fontWeight: '700', marginLeft: 12, fontSize: 14.5 },
});
