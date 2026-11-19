// Stream › Músicas: galeria dos artistas (ouvir grátis com propaganda), comprar para baixar,
// playlists do ouvinte, plano Premium sem propaganda (3 meses grátis) e a área do artista.
// Toca pelo mesmo player das rádios: a barrinha continua em qualquer tela e na notificação do celular.
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Modal, ScrollView } from 'react-native';
import { Text, TextInput } from '../../../responsive';
import { Ionicons } from '@expo/vector-icons';
import { colors, soft, brl } from '../../../theme';
import { useStore } from '../../../store';
import { stopRadio, checkUrl } from '../../../radio';
import { useRadioNow } from '../../../components/RadioKit';
import { moderateText } from '../../../moderation';
import { isVerified } from '../../../components/BioGate';
import { Photo } from '../../../components/ui';
import {
  useMusic, allTracks, trackById, publishTrack, removeTrack, registerSale, createPlaylist, removePlaylist, togglePlaylistTrack,
  subscribePlan, cancelPlan, planInfo, playTrack, startTrack, setAdHook, setOwnedTracks, openArtist, artistGets, MUSIC_FEE_PCT, MUSIC_PLAN_PRICE, MUSIC_PLAN_FREE_MONTHS, MUSIC_GENRES, ADS_EVERY,
} from '../../../music';

const SEGS = [
  ['galeria', 'Galeria'],
  ['playlists', 'Playlists'],
  ['compradas', 'Compradas'],
  ['artista', 'Sou artista'],
];
const short = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1).replace('.0', '').replace('.', ',')} mil` : String(n));
const AD_SECS = 5;

export default function MusicTab() {
  const { state, dispatch } = useStore();
  const m = useMusic();
  const now = useRadioNow();
  const [seg, setSeg] = useState('galeria');
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState(null);
  const [ad, setAd] = useState(null); // faixa esperando a propaganda terminar
  const [left, setLeft] = useState(AD_SECS);
  const [pickFor, setPickFor] = useState(null); // faixa para escolher a playlist
  const [openPl, setOpenPl] = useState(null);
  const [newPl, setNewPl] = useState('');
  const [downloaded, setDownloaded] = useState({});
  const plan = planInfo();
  const bought = state.boughtMedia || {};
  const tracks = allTracks();
  const playingId = now.radio && now.status !== 'parado' ? now.radio.id : null;

  // Propaganda antes da música (só sem o plano): conta os segundos e toca.
  useEffect(() => {
    if (!ad) return;
    if (left <= 0) {
      const t = ad;
      setAd(null);
      start(t);
      return;
    }
    const id = setTimeout(() => setLeft((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [ad, left]);

  const start = startTrack;
  // Compradas tocam sem propaganda (também nas playlists do ouvinte).
  useEffect(() => { setOwnedTracks(bought); }, [bought]);
  // Com esta tela aberta, a propaganda aparece aqui (também quando a música troca sozinha).
  useEffect(() => {
    setAdHook((t) => {
      setLeft(AD_SECS);
      setAd(t);
    });
    return () => setAdHook(null);
  }, []);
  // list: a lista em que a música está (vira a fila: quando acaba, toca a próxima).
  const play = (t, list) => {
    if (playingId === t.id) return stopRadio();
    playTrack(t, list);
  };
  // Preço da música: só põe no carrinho (nada de compra num toque). A compra é confirmada no carrinho.
  const inCart = (t) => (state.musicCart || []).some((x) => x.id === t.id);
  const buy = (t) => {
    if (bought[t.id]) return;
    if (!isVerified(state)) return dispatch({ type: 'BIO_GATE' });
    if (inCart(t)) return dispatch({ type: 'OPEN_CART' });
    dispatch({ type: 'ADD_MUSIC_CART', track: { id: t.id, price: t.price, title: t.title, artist: t.artist } });
    Alert.alert('No carrinho 🛒', `"${t.title}" foi para o carrinho. Confirme a compra lá; antes dá para ouvir mais uma vez.`, [
      { text: 'Continuar ouvindo', style: 'cancel' },
      { text: 'Ver carrinho', onPress: () => dispatch({ type: 'OPEN_CART' }) },
    ]);
  };
  const download = (t) => {
    setDownloaded((d) => ({ ...d, [t.id]: true }));
    Alert.alert('Música baixada ✅', `"${t.title}" fica guardada no app para ouvir sem internet.`);
  };

  const Row = ({ t, extra, list }) => {
    const on = playingId === t.id;
    const own = !!bought[t.id] || t.mine;
    return (
      <View style={st.row}>
        <TouchableOpacity style={[st.cover, { overflow: 'hidden' }, on && { backgroundColor: colors.text }]} onPress={() => play(t, list)} accessibilityLabel={on ? `Parar ${t.title}` : `Ouvir ${t.title}`}>
          {/* Capa do CD/da música */}
          {t.cover ? <Photo uri={t.cover} style={StyleSheet.absoluteFill} fallback={t.emoji} /> : null}
          {on ? (
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center' }]}>
              <Ionicons name="pause" size={20} color="#fff" />
            </View>
          ) : t.cover ? null : (
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ fontSize: 22 }}>{t.emoji}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={{ flex: 1, marginLeft: 10 }} onPress={() => play(t, list)} activeOpacity={0.8}>
          <Text style={{ color: on ? colors.primary : colors.text, fontWeight: '800' }} numberOfLines={1}>{t.title}</Text>
          <Text style={{ color: colors.muted, fontSize: 12.5 }} numberOfLines={1}>
            {/* Tocar no nome do artista abre o perfil dele */}
            <Text onPress={() => openArtist(t.artist)} style={{ color: colors.primaryDark, fontWeight: '700' }}>{t.artist}</Text> · {t.genre}{t.plays ? ` · ${short(t.plays)} plays` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.iconBtn} onPress={() => setPickFor(t)} accessibilityLabel="Adicionar a uma playlist">
          <Ionicons name="add-circle-outline" size={22} color={colors.menu} />
        </TouchableOpacity>
        {extra ||
          (own ? (
            <TouchableOpacity style={[st.pill, downloaded[t.id] && { backgroundColor: colors.cardAlt, borderColor: colors.cardAlt }]} onPress={() => download(t)} accessibilityLabel={`Baixar ${t.title}`}>
              <Ionicons name={downloaded[t.id] ? 'checkmark' : 'download-outline'} size={14} color={colors.text} />
              <Text numberOfLines={1} style={st.pillText}>{downloaded[t.id] ? 'Baixada' : 'Baixar'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={st.pill} onPress={() => buy(t)} accessibilityLabel={inCart(t) ? `${t.title} está no carrinho. Abrir carrinho` : `Pôr ${t.title} no carrinho, ${brl(t.price)}`}>
              <Ionicons name={inCart(t) ? 'cart' : 'cart-outline'} size={13} color={colors.text} />
              <Text numberOfLines={1} style={st.pillText}>{inCart(t) ? 'No carrinho' : brl(t.price)}</Text>
            </TouchableOpacity>
          ))}
      </View>
    );
  };

  const term = q.trim().toLowerCase();
  const gallery = tracks.filter((t) => (!genre || t.genre === genre) && (!term || `${t.title} ${t.artist} ${t.genre}`.toLowerCase().includes(term)));
  const mineBought = tracks.filter((t) => bought[t.id]);
  const pl = openPl ? m.playlists.find((p) => p.id === openPl) : null;

  return (
    <View>
      {/* Plano: ouvir é grátis com propaganda; o Premium tira a propaganda (3 meses grátis). */}
      <View style={st.plan}>
        <Ionicons name={plan.on ? 'sparkles' : 'megaphone-outline'} size={18} color={colors.text} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13.5 }}>{plan.on ? 'Premium ativo: sem propaganda' : 'Ouvindo grátis, com propaganda'}</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>
            {plan.on
              ? plan.free
                ? `Grátis até ${new Date(plan.freeUntil).toLocaleDateString('pt-BR')}. Depois, ${brl(MUSIC_PLAN_PRICE)} por mês.`
                : `${brl(MUSIC_PLAN_PRICE)} por mês.`
              : `Uma propaganda a cada ${ADS_EVERY} músicas. Premium: ${MUSIC_PLAN_FREE_MONTHS} meses grátis, depois ${brl(MUSIC_PLAN_PRICE)} por mês.`}
          </Text>
        </View>
        <TouchableOpacity
          style={st.planBtn}
          onPress={() =>
            plan.on
              ? Alert.alert('Cancelar o Premium?', 'As propagandas voltam entre as músicas.', [{ text: 'Manter', style: 'cancel' }, { text: 'Cancelar plano', style: 'destructive', onPress: cancelPlan }])
              : Alert.alert('Premium sem propaganda', `Os ${MUSIC_PLAN_FREE_MONTHS} primeiros meses são gratuitos. Depois, ${brl(MUSIC_PLAN_PRICE)} por mês, e dá para cancelar quando quiser.`, [{ text: 'Agora não', style: 'cancel' }, { text: 'Começar grátis', onPress: subscribePlan }])
          }
          accessibilityLabel={plan.on ? 'Cancelar o plano Premium' : 'Assinar o Premium com 3 meses grátis'}
        >
          <Text numberOfLines={1} style={{ color: colors.text, fontWeight: '800', fontSize: 12 }}>{plan.on ? 'Cancelar' : '3 meses grátis'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', marginBottom: 10 }}>
        {SEGS.map(([k, label]) => (
          <TouchableOpacity key={k} style={[st.seg, seg === k && st.segOn]} onPress={() => { setSeg(k); setOpenPl(null); }} accessibilityLabel={label}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.segText, seg === k && { color: colors.text, fontWeight: '800' }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {seg === 'galeria' ? (
        <>
          <View style={st.search}>
            <Ionicons name="search-outline" size={17} color={colors.muted} />
            <TextInput value={q} onChangeText={setQ} placeholder="Buscar música, artista ou estilo" placeholderTextColor={colors.muted} style={st.searchInput} />
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
            {[null, ...MUSIC_GENRES].map((g) => (
              <TouchableOpacity key={g || 'todos'} style={[st.chip, genre === g && st.chipOn]} onPress={() => setGenre(g)}>
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.chipText, genre === g && { color: '#fff' }]}>{g || 'Tudo'}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {gallery.map((t) => <Row key={t.id} t={t} list={gallery} />)}
          {!gallery.length ? <Text style={st.empty}>Nenhuma música encontrada.</Text> : null}
          <Text style={st.note}>Ouvir é livre. Quando uma música acaba, a próxima da lista começa sozinha. Para baixar, compre direto do artista.</Text>
        </>
      ) : null}

      {seg === 'playlists' ? (
        pl ? (
          <>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }} onPress={() => setOpenPl(null)}>
              <Ionicons name="chevron-back" size={20} color={colors.text} />
              <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16, marginLeft: 4, flex: 1 }} numberOfLines={1}>{pl.name}</Text>
              <Text style={{ color: colors.muted, fontSize: 12 }}>{pl.tracks.length} músicas</Text>
            </TouchableOpacity>
            {pl.tracks.map(trackById).filter(Boolean).map((t) => (
              <Row key={t.id} t={t} list={pl.tracks.map(trackById).filter(Boolean)} extra={
                <TouchableOpacity style={st.iconBtn} onPress={() => togglePlaylistTrack(pl.id, t.id)} accessibilityLabel="Tirar da playlist">
                  <Ionicons name="remove-circle-outline" size={22} color={colors.muted} />
                </TouchableOpacity>
              } />
            ))}
            {!pl.tracks.length ? <Text style={st.empty}>Playlist vazia. Na Galeria, toque no + de uma música para colocar aqui.</Text> : null}
            <TouchableOpacity style={{ paddingVertical: 14, alignItems: 'center' }} onPress={() => Alert.alert('Apagar a playlist?', pl.name, [{ text: 'Voltar', style: 'cancel' }, { text: 'Apagar', style: 'destructive', onPress: () => { removePlaylist(pl.id); setOpenPl(null); } }])}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.muted, fontWeight: '700' }}>Apagar playlist</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              <TextInput value={newPl} onChangeText={setNewPl} placeholder="Nome da nova playlist" placeholderTextColor={colors.muted} maxLength={30} style={[st.field, { flex: 1, marginTop: 0 }]} />
              <TouchableOpacity style={st.create} onPress={() => { const n = newPl.trim(); if (!n) return; createPlaylist(n); setNewPl(''); }} accessibilityLabel="Criar playlist">
                <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '800' }}>Criar</Text>
              </TouchableOpacity>
            </View>
            {m.playlists.map((p) => (
              <TouchableOpacity key={p.id} style={st.row} onPress={() => setOpenPl(p.id)} accessibilityLabel={`Abrir a playlist ${p.name}`}>
                <View style={st.cover}><Ionicons name="musical-notes" size={20} color={colors.text} /></View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>{p.name}</Text>
                  <Text style={{ color: colors.muted, fontSize: 12.5 }}>{p.tracks.length} músicas</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </TouchableOpacity>
            ))}
            {!m.playlists.length ? <Text style={st.empty}>Monte a sua playlist: crie uma acima e vá colocando músicas pelo + da Galeria. Ela fica guardada.</Text> : null}
          </>
        )
      ) : null}

      {seg === 'compradas' ? (
        <>
          {mineBought.map((t) => <Row key={t.id} t={t} list={mineBought} />)}
          {!mineBought.length ? <Text style={st.empty}>Você ainda não comprou músicas. As compradas ficam aqui para baixar e ouvir sem propaganda.</Text> : null}
        </>
      ) : null}

      {seg === 'artista' ? <ArtistArea /> : null}

      {/* Escolher a playlist da música */}
      <Modal visible={!!pickFor} transparent animationType="slide" onRequestClose={() => setPickFor(null)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(20,18,14,0.4)' }} activeOpacity={1} onPress={() => setPickFor(null)} />
        <View style={st.sheet}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 16 }} numberOfLines={1}>Adicionar "{pickFor ? pickFor.title : ''}"</Text>
          {m.playlists.map((p) => {
            const inIt = pickFor && p.tracks.includes(pickFor.id);
            return (
              <TouchableOpacity key={p.id} style={st.sheetRow} onPress={() => togglePlaylistTrack(p.id, pickFor.id)}>
                <Ionicons name={inIt ? 'checkbox' : 'square-outline'} size={21} color={inIt ? colors.primary : colors.muted} />
                <Text style={{ color: colors.text, fontWeight: '700', marginLeft: 10, flex: 1 }} numberOfLines={1}>{p.name}</Text>
                <Text style={{ color: colors.muted, fontSize: 12 }}>{p.tracks.length}</Text>
              </TouchableOpacity>
            );
          })}
          <View style={{ flexDirection: 'row', marginTop: 12 }}>
            <TextInput value={newPl} onChangeText={setNewPl} placeholder="Nova playlist" placeholderTextColor={colors.muted} maxLength={30} style={[st.field, { flex: 1, marginTop: 0 }]} />
            <TouchableOpacity style={st.create} onPress={() => { const n = newPl.trim(); if (!n || !pickFor) return; const p = createPlaylist(n); togglePlaylistTrack(p.id, pickFor.id); setNewPl(''); }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '800' }}>Criar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Propaganda entre as músicas (só para quem ouve grátis) */}
      <Modal visible={!!ad} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: 'rgba(20,18,14,0.75)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: colors.card, borderRadius: 22, padding: 20, alignItems: 'center' }}>
            <Text style={{ color: colors.muted, fontWeight: '800', fontSize: 11, letterSpacing: 1 }}>PROPAGANDA</Text>
            <Ionicons name="megaphone" size={40} color={colors.primary} style={{ marginVertical: 10 }} />
            <Text style={{ color: colors.text, fontWeight: '800', fontSize: 17, textAlign: 'center' }}>Sua marca toca aqui</Text>
            <Text style={{ color: colors.muted, fontSize: 13, textAlign: 'center', marginTop: 4 }}>Anuncie entre as músicas do Re@lys e fale com quem está ouvindo agora.</Text>
            <Text style={{ color: colors.text, fontWeight: '800', marginTop: 14 }}>Sua música começa em {left} s</Text>
            <TouchableOpacity style={[st.planBtn, { marginTop: 12 }]} onPress={() => { subscribePlan(); setLeft(0); }}>
              <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: colors.text, fontWeight: '800', fontSize: 12.5 }}>Tirar as propagandas · {MUSIC_PLAN_FREE_MONTHS} meses grátis</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Área do artista: publicar música à venda e ver o que já vendeu.
function ArtistArea() {
  const { state } = useStore();
  const m = useMusic();
  const [f, setF] = useState({ title: '', genre: MUSIC_GENRES[0], price: '2,99', url: '' });
  const price = Number(String(f.price).replace(',', '.')) || 0;
  const publish = () => {
    if (!f.title.trim()) return Alert.alert('Falta o nome', 'Escreva o nome da música.');
    const mod = moderateText(f.title);
    if (mod && mod.ok === false) return Alert.alert('Nome não aceito', 'O nome da música não passou na moderação do Re@lys.');
    const bad = checkUrl(f.url);
    if (bad) return Alert.alert('Confira o endereço do áudio', bad);
    if (price < 0.99) return Alert.alert('Preço', 'O preço mínimo de uma música é R$ 0,99.');
    publishTrack({ title: f.title.trim(), artist: state.user.name, genre: f.genre, price, url: f.url });
    setF({ title: '', genre: f.genre, price: f.price, url: '' });
    Alert.alert('Música publicada ✅', `Ela já está na Galeria para todo mundo ouvir. A cada venda, você recebe ${brl(artistGets(price))}.`);
  };
  return (
    <View>
      <View style={st.plan}>
        <Ionicons name="cash-outline" size={18} color={colors.text} />
        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={{ color: colors.text, fontWeight: '800', fontSize: 13.5 }}>{m.sales} venda{m.sales === 1 ? '' : 's'} · {brl(m.earned)} para você</Text>
          <Text style={{ color: colors.muted, fontSize: 12 }}>Você fica com {100 - MUSIC_FEE_PCT}% de cada venda. O Re@lys fica com {MUSIC_FEE_PCT}%.</Text>
        </View>
      </View>
      <Text style={st.h}>Publicar música</Text>
      <TextInput value={f.title} onChangeText={(t) => setF({ ...f, title: t })} placeholder="Nome da música" placeholderTextColor={colors.muted} maxLength={50} style={st.field} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 8 }}>
        {MUSIC_GENRES.map((g) => (
          <TouchableOpacity key={g} style={[st.chip, f.genre === g && st.chipOn]} onPress={() => setF({ ...f, genre: g })}>
            <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={[st.chipText, f.genre === g && { color: '#fff' }]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <TextInput value={f.url} onChangeText={(t) => setF({ ...f, url: t })} placeholder="Endereço do áudio (link do MP3)" placeholderTextColor={colors.muted} autoCapitalize="none" keyboardType="url" style={[st.field, { marginTop: 0 }]} />
      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
        <Text style={{ color: colors.text, fontWeight: '700' }}>Preço R$</Text>
        <TextInput value={f.price} onChangeText={(t) => setF({ ...f, price: t })} keyboardType="decimal-pad" maxLength={6} style={[st.field, { width: 84, marginTop: 0, marginLeft: 8, textAlign: 'center' }]} />
        <Text style={{ color: colors.muted, fontSize: 12.5, marginLeft: 10, flex: 1 }}>Você recebe {brl(artistGets(price))} por venda.</Text>
      </View>
      <TouchableOpacity style={[st.create, { marginLeft: 0, marginTop: 12, minHeight: 46 }]} onPress={publish} accessibilityLabel="Publicar música">
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={{ color: '#fff', fontWeight: '800' }}>Publicar e pôr à venda</Text>
      </TouchableOpacity>
      <Text style={st.note}>A música entra na Galeria para ouvir com propaganda. O download só é liberado para quem comprar.</Text>

      {m.mine.length ? <Text style={st.h}>Minhas músicas</Text> : null}
      {m.mine.map((t) => (
        <View key={t.id} style={st.row}>
          <View style={st.cover}><Text style={{ fontSize: 22 }}>{t.emoji}</Text></View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={{ color: colors.text, fontWeight: '800' }} numberOfLines={1}>{t.title}</Text>
            <Text style={{ color: colors.muted, fontSize: 12.5 }} numberOfLines={1}>{t.genre} · {brl(t.price)}</Text>
          </View>
          <TouchableOpacity style={st.pill} onPress={() => registerSale(t.price)} accessibilityLabel="Simular uma venda desta música">
            <Text numberOfLines={1} style={st.pillText}>Simular venda</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.iconBtn} onPress={() => Alert.alert('Tirar a música?', t.title, [{ text: 'Voltar', style: 'cancel' }, { text: 'Tirar', style: 'destructive', onPress: () => removeTrack(t.id) }])} accessibilityLabel="Tirar a música">
            <Ionicons name="trash-outline" size={19} color={colors.muted} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
}

const st = StyleSheet.create({
  plan: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  planBtn: { minHeight: 32, paddingHorizontal: 12, borderRadius: 16, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  seg: { flex: 1, minHeight: 36, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingHorizontal: 2 },
  segOn: { borderBottomColor: colors.primary },
  segText: { color: colors.menu, fontWeight: '700', fontSize: 13 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 14, paddingHorizontal: 12, minHeight: 42, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, marginLeft: 8, color: colors.text, paddingVertical: 8 },
  chip: { paddingHorizontal: 13, minHeight: 32, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', marginRight: 6 },
  chipOn: { backgroundColor: colors.text, borderColor: colors.text },
  chipText: { color: colors.text, fontWeight: '700', fontSize: 12.5 },
  row: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.card, borderRadius: 16, padding: 10, marginBottom: 8, ...soft },
  cover: { width: 46, height: 46, borderRadius: 12, backgroundColor: colors.cardAlt, alignItems: 'center', justifyContent: 'center' },
  iconBtn: { width: 34, height: 40, alignItems: 'center', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', minHeight: 32, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: colors.borderStrong, backgroundColor: colors.card, marginLeft: 2 },
  pillText: { color: colors.text, fontWeight: '800', fontSize: 12.5, marginLeft: 2 },
  empty: { color: colors.muted, textAlign: 'center', paddingVertical: 24, paddingHorizontal: 12 },
  note: { color: colors.muted, fontSize: 12, textAlign: 'center', marginTop: 8, marginBottom: 10 },
  h: { color: colors.text, fontWeight: '800', fontSize: 15, marginTop: 10, marginBottom: 6 },
  field: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.borderStrong, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginTop: 8 },
  create: { minHeight: 44, paddingHorizontal: 16, borderRadius: 12, backgroundColor: colors.text, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  sheet: { backgroundColor: colors.card, borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 30 },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
