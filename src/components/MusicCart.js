// Músicas no carrinho. O "+" do player só adiciona aqui; a compra é confirmada no carrinho.
// Antes de confirmar, o cliente pode ouvir cada música mais uma vez (uma só).
// Aparece na janela do carrinho (CartSheet) e na aba Carrinho de Pedidos.
import React from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text } from '../responsive';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../store';
import { colors, brl, soft } from '../theme';
import { trackById, startTrack, artistGets } from '../music';
import { stopRadio } from '../radio';
import { useRadioNow } from './RadioKit';
import { askPix } from './PixPay';

const NIGHT = '#0B1124';

export const musicCartCount = (state) => (state.musicCart || []).length;

export default function MusicCart({ onDone }) {
  const { state, dispatch } = useStore();
  const now = useRadioNow();
  const items = state.musicCart || [];
  if (!items.length) return null;
  const total = +items.reduce((n, x) => n + x.price, 0).toFixed(2);
  const playingId = now.radio && now.radio.track && now.status !== 'parado' ? now.radio.id : null;

  const listen = (x) => {
    if (playingId === x.id) return stopRadio();
    if (x.ouviu) return Alert.alert('Você já ouviu de novo', `No carrinho dá para ouvir "${x.title}" mais uma vez. Confirme a compra para ouvir quando quiser e baixar.`);
    const t = trackById(x.id);
    if (!t) return;
    dispatch({ type: 'MUSIC_CART_REPLAY', id: x.id });
    startTrack(t);
  };
  const finish = () => {
    dispatch({ type: 'CHECKOUT_MUSIC' });
    Alert.alert('Compra confirmada ✅', items.length === 1 ? `"${items[0].title}" agora é sua: dá para baixar e ouvir sem propaganda.` : 'As músicas agora são suas: dá para baixar e ouvir sem propaganda.');
    onDone && onDone();
  };
  const confirm = () => {
    const artists = [...new Set(items.map((x) => x.artist))].join(', ');
    Alert.alert(
      items.length === 1 ? `Comprar "${items[0].title}"?` : `Comprar ${items.length} músicas?`,
      `${brl(total)} do seu saldo. ${brl(items.reduce((n, x) => n + artistGets(x.price), 0))} vão direto para ${artists}.`,
      [
        { text: 'Agora não', style: 'cancel' },
        {
          text: 'Confirmar compra',
          onPress: () => {
            if (total > state.wallet) return askPix({ amount: total, available: state.wallet, label: items.length === 1 ? `Música · ${items[0].title}` : `${items.length} músicas`, onPaid: finish });
            finish();
          },
        },
      ]
    );
  };

  return (
    <View style={st.box}>
      <View style={st.head}>
        <Ionicons name="musical-notes" size={16} color={colors.primary} />
        <Text style={st.title}>Músicas</Text>
        <Text style={st.hint} numberOfLines={1}>ouça mais uma vez antes de comprar</Text>
      </View>
      {items.map((x) => {
        const on = playingId === x.id;
        return (
          <View key={x.id} style={st.line}>
            <TouchableOpacity
              onPress={() => listen(x)}
              style={[st.play, x.ouviu && !on && { opacity: 0.4 }]}
              accessibilityLabel={on ? `Parar ${x.title}` : x.ouviu ? `${x.title}: você já ouviu de novo` : `Ouvir ${x.title} mais uma vez`}
            >
              <Ionicons name={on ? 'pause' : 'play'} size={15} color={NIGHT} />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={st.name} numberOfLines={1}>{x.title}</Text>
              <Text style={st.sub} numberOfLines={1}>{x.artist} · {on ? 'tocando' : x.ouviu ? 'já ouviu de novo' : 'pode ouvir mais 1 vez'}</Text>
            </View>
            <Text style={st.price}>{brl(x.price)}</Text>
            <TouchableOpacity onPress={() => dispatch({ type: 'REMOVE_MUSIC_CART', id: x.id })} style={st.del} hitSlop={6} accessibilityLabel={`Tirar ${x.title} do carrinho`}>
              <Ionicons name="trash-outline" size={15} color={colors.danger} />
            </TouchableOpacity>
          </View>
        );
      })}
      <TouchableOpacity style={st.btn} onPress={confirm} accessibilityLabel={`Confirmar compra das músicas por ${brl(total)}`}>
        <Ionicons name="checkmark-circle-outline" size={17} color={NIGHT} />
        <Text numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75} style={st.btnText}>Confirmar compra · {brl(total)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const st = StyleSheet.create({
  box: { backgroundColor: '#FFFFFF', borderRadius: 16, padding: 12, marginTop: 8, marginBottom: 4, borderWidth: 1, borderColor: colors.border },
  head: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  title: { fontWeight: '800', color: colors.text, marginLeft: 6 },
  hint: { flex: 1, color: colors.muted, fontSize: 11.5, marginLeft: 8, textAlign: 'right' },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.border },
  play: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', ...soft },
  name: { fontWeight: '700', color: colors.text },
  sub: { color: colors.muted, fontSize: 12 },
  price: { color: colors.primary, fontWeight: '800', marginLeft: 8 },
  del: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center', marginLeft: 4 },
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.gold, borderRadius: 14, paddingVertical: 11, marginTop: 10 },
  btnText: { color: NIGHT, fontWeight: '800', marginLeft: 6, fontSize: 14.5 },
});
